// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/document/[docId]/route.ts
// ============================================================
// Route de service des documents RH — logique « PDF-FIRST ».
//
// Objectif : quand on ouvre un document du dossier RH (contrat, avenant,
// dossier de bienvenue, solde de tout compte, etc.), on affiche TOUJOURS
// le document final tel qu'archivé — en priorité le PDF figé (avec paraphes
// et signatures), puis les pages scannées en mise en page document, et en
// tout dernier recours seulement le HTML brut (documents non encore convertis).
//
// Query params :
//   ?source=contract  -> table hr_contract_documents, bucket hr-contract-docs
//   ?source=employee  -> table hr_employee_documents, bucket hr-employee-docs
//   &dl=1             -> forcer le téléchargement plutôt que l'affichage inline
//
// Ordre de priorité de rendu :
//   1) assembled_pdf_path présent              -> redirect signed URL (PDF figé)
//   2) file_path + mime application/pdf        -> redirect signed URL (PDF)
//   3) pages[] (images) OU file_path image     -> page HTML A4 empilant les images
//   4) file_path + mime text/html              -> on sert le HTML stocké
//   5) file_path autre                         -> redirect signed URL (download)
//
// SWC-safe : var partout, pas de generics, function(){}.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"

var HR_BUCKET_CONTRACT = "hr-contract-docs"
var HR_BUCKET_EMPLOYEE = "hr-employee-docs"
var HR_BUCKET_SIGN = "hr-signatures"

// Teste si un objet existe dans un bucket (createSignedUrl court, jeté ensuite).
async function bucketHas(admin, bucket, path) {
  try {
    var r = await admin.storage.from(bucket).createSignedUrl(path, 60)
    return !!(r && !r.error && r.data && r.data.signedUrl)
  } catch (e) {
    return false
  }
}

// Résout le bucket réel d'un document : certains documents signés anciens ont été
// archivés dans hr-signatures alors que leur file_path est référencé tel quel dans
// hr_contract_documents. On retombe donc sur hr-signatures si l'objet n'est pas dans
// le bucket primaire. Retourne le 1er bucket candidat qui contient le path.
async function resolveBucket(admin, candidates, path) {
  if (!path) return candidates[0]
  var i = 0
  while (i < candidates.length) {
    var ok = await bucketHas(admin, candidates[i], path)
    if (ok) return candidates[i]
    i++
  }
  return candidates[0]
}

function getAdmin() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || ""
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

async function signedUrl(admin, bucket, path, ttl) {
  var res = await admin.storage.from(bucket).createSignedUrl(path, ttl || 3600)
  if (res.error || !res.data || !res.data.signedUrl) {
    throw new Error("Signed URL failed (" + path + "): " + (res.error ? res.error.message : "no url"))
  }
  return res.data.signedUrl
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function isImageMime(m) {
  var x = (m || "").toLowerCase()
  return x.indexOf("image/") === 0
}

// Construit une page HTML A4 qui empile des images (1 par page) — mise en
// page « document », imprimable proprement en PDF par le navigateur.
function buildImagePagesHtml(title, urls) {
  var imgs = urls.map(function (u) {
    return '<div class="page"><img src="' + esc(u) + '" alt=""></div>'
  }).join("\n")
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + esc(title) + '</title><style>'
    + '@page{size:A4;margin:0}'
    + 'html,body{margin:0;padding:0;background:#525659}'
    + '.page{width:210mm;min-height:297mm;margin:12px auto;background:#fff;'
    + 'box-shadow:0 2px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;overflow:hidden}'
    + '.page img{width:100%;height:auto;display:block}'
    + '@media print{body{background:#fff}.page{margin:0;box-shadow:none;page-break-after:always}}'
    + '</style></head><body>' + imgs + '</body></html>'
}

export async function GET(req, ctx) {
  var admin = getAdmin()

  var url = new URL(req.url)

  // Récupération robuste de l'id : params Next, sinon parsing du pathname.
  // (selon la version / le contexte, ctx.params peut ne pas être renseigné)
  var id = null
  if (ctx && ctx.params && ctx.params.id) {
    id = ctx.params.id
  }
  if (!id) {
    var parts = url.pathname.split("/").filter(function (s) { return s && s.length > 0 })
    var docIdx = parts.lastIndexOf("document")
    if (docIdx >= 0 && parts.length > docIdx + 1) {
      id = decodeURIComponent(parts[docIdx + 1])
    } else if (parts.length > 0) {
      id = decodeURIComponent(parts[parts.length - 1])
    }
  }
  if (id === "undefined" || id === "null" || id === "") id = null
  if (!id) {
    return NextResponse.json({ error: "id manquant" }, { status: 400 })
  }

  var source = url.searchParams.get("source") === "employee" ? "employee" : "contract"
  var forceDownload = url.searchParams.get("dl") === "1"

  var table = source === "employee" ? "hr_employee_documents" : "hr_contract_documents"
  var bucket = source === "employee" ? HR_BUCKET_EMPLOYEE : HR_BUCKET_CONTRACT

  var sel = await admin.from(table).select("*").eq("id", id).maybeSingle()
  if (sel.error || !sel.data) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
  }
  var doc = sel.data
  var label = doc.label || doc.doc_type || "Document"

  // Résolution du bucket réel (repli hr-signatures pour les anciens docs signés).
  var candidateBuckets = source === "employee"
    ? [HR_BUCKET_EMPLOYEE, HR_BUCKET_SIGN]
    : [HR_BUCKET_CONTRACT, HR_BUCKET_SIGN]
  var probePath = doc.assembled_pdf_path || doc.file_path || null
  bucket = await resolveBucket(admin, candidateBuckets, probePath)

  try {
    // 1) PDF assemblé figé (contrats/avenants signés, solde tout compte...)
    if (doc.assembled_pdf_path) {
      var u1 = await signedUrl(admin, bucket, doc.assembled_pdf_path, 3600)
      return NextResponse.redirect(u1)
    }

    // 2) file_path qui EST un PDF
    if (doc.file_path && (doc.mime_type || "").toLowerCase().indexOf("application/pdf") === 0) {
      var u2 = await signedUrl(admin, bucket, doc.file_path, 3600)
      return NextResponse.redirect(u2)
    }

    // 3) Pages images (scan multi-pages) OU file_path image -> page document A4
    var pageImageUrls = []
    if (doc.pages && Array.isArray(doc.pages) && doc.pages.length > 0) {
      var sorted = doc.pages.slice().sort(function (a, b) {
        return (a.page_number || 0) - (b.page_number || 0)
      })
      var i = 0
      while (i < sorted.length) {
        var pg = sorted[i]
        if (pg && pg.path && isImageMime(pg.mime_type)) {
          var pu = await signedUrl(admin, bucket, pg.path, 3600)
          pageImageUrls.push(pu)
        }
        i++
      }
    }
    if (pageImageUrls.length === 0 && doc.file_path && isImageMime(doc.mime_type)) {
      var su = await signedUrl(admin, bucket, doc.file_path, 3600)
      pageImageUrls.push(su)
    }
    if (pageImageUrls.length > 0) {
      var html3 = buildImagePagesHtml(label, pageImageUrls)
      return new NextResponse(html3, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      })
    }

    // 4) HTML stocké (documents pas encore convertis en PDF — backfill à venir)
    if (doc.file_path && (doc.mime_type || "").toLowerCase().indexOf("text/html") === 0) {
      var dl = await admin.storage.from(bucket).download(doc.file_path)
      if (!dl.error && dl.data) {
        var txt = await dl.data.text()
        return new NextResponse(txt, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" }
        })
      }
      // si le download échoue, on tente une redirection signée en dernier recours
      var u4 = await signedUrl(admin, bucket, doc.file_path, 3600)
      return NextResponse.redirect(u4)
    }

    // 5) Autre type de fichier -> redirection signée (téléchargement)
    if (doc.file_path) {
      var u5 = await signedUrl(admin, bucket, doc.file_path, 3600)
      if (forceDownload) {
        return NextResponse.redirect(u5)
      }
      return NextResponse.redirect(u5)
    }

    return NextResponse.json({ error: "Aucun fichier associé à ce document" }, { status: 404 })
  } catch (e) {
    var msg = e && e.message ? e.message : "Erreur de service du document"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
