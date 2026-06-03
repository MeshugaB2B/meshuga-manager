// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/backfill-pdf/route.ts
// ============================================================
// BACKFILL : convertit en PDF figé tous les documents signés encore stockés
// en HTML (avenants + dossiers de bienvenue), avec les paraphes corrects.
//
// Pour chaque doc (hr_contract_documents, mime text/html, sans assembled_pdf_path) :
//   1. résout le salarié -> initiales (E.T. / X.Y.)
//   2. télécharge le HTML signé (bucket hr-contract-docs, repli hr-signatures)
//   3. (avenants) remplace le paraphe "…/ en attente" par les vraies initiales
//      + embarque les polices Meshuga (rendu fidèle)
//   4. rend le HTML en PDF (Chrome headless)
//   5. upload le PDF dans hr-contract-docs -> renseigne assembled_pdf_path
//      => la route d'affichage sert alors le PDF figé (logique PDF-first).
//
// Le contenu signé n'est PAS reconstruit : on part du HTML signé existant, on
// corrige seulement le texte du paraphe. Le document reste fidèle à la signature.
//
// Utilisation (ouvrir dans le navigateur) :
//   .../api/hr/backfill-pdf                         -> DRY-RUN (liste, ne fait rien)
//   .../api/hr/backfill-pdf?docId=<id>&run=1        -> traite UN seul doc (test)
//   .../api/hr/backfill-pdf?run=1                   -> traite TOUT
//   .../api/hr/backfill-pdf?run=1&limit=5           -> traite par lot
//
// Idempotent : un doc qui a déjà assembled_pdf_path est ignoré (filtré en amont).
// SWC-safe : var partout, function(){}.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { launchBrowser, renderPdf, injectMeshugaFonts, fixParaphePlaceholder } from "@/lib/hr/pdf-render"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"
export var maxDuration = 300

var HR_BUCKET_CONTRACT = "hr-contract-docs"
var HR_BUCKET_SIGN = "hr-signatures"

function getAdmin() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

// Initiales identiques à contractBuilders.getInitials (réimplémenté pour éviter
// d'importer un gros module .tsx dans cette route serveur).
function getInitials(fullName) {
  if (!fullName) return ""
  var parts = String(fullName).trim().split(/\s+/)
  var out = ""
  var i = 0
  while (i < parts.length) {
    var p = parts[i]
    if (p && p.length > 0) out += p.charAt(0).toUpperCase() + "."
    i++
  }
  return out
}

async function resolveEmployee(admin, contractId) {
  if (!contractId) return null
  var cRes = await admin.from("hr_contracts").select("id, employee_id, cycle_id").eq("id", contractId).maybeSingle()
  if (cRes.error || !cRes.data) return null
  var empId = cRes.data.employee_id
  if (!empId && cRes.data.cycle_id) {
    var cyRes = await admin.from("hr_employment_cycles").select("employee_id").eq("id", cRes.data.cycle_id).maybeSingle()
    if (!cyRes.error && cyRes.data) empId = cyRes.data.employee_id
  }
  if (!empId) return null
  var eRes = await admin.from("hr_employees").select("prenom, nom").eq("id", empId).maybeSingle()
  if (eRes.error || !eRes.data) return null
  return eRes.data
}

async function downloadHtml(admin, candidates, path) {
  var i = 0
  while (i < candidates.length) {
    try {
      var dl = await admin.storage.from(candidates[i]).download(path)
      if (!dl.error && dl.data) {
        var txt = await dl.data.text()
        return { bucket: candidates[i], text: txt }
      }
    } catch (e) {}
    i++
  }
  return null
}

export async function GET(req) {
  var admin = getAdmin()
  var url = new URL(req.url)
  var run = url.searchParams.get("run") === "1"
  var onlyDoc = url.searchParams.get("docId") || null
  var limit = parseInt(url.searchParams.get("limit") || "100", 10)
  if (!(limit > 0)) limit = 100

  var q = admin.from("hr_contract_documents")
    .select("id, contract_id, doc_type, label, file_path, mime_type, assembled_pdf_path")
    .ilike("mime_type", "text/html%")
    .is("assembled_pdf_path", null)
  if (onlyDoc) q = q.eq("id", onlyDoc)
  var sel = await q
  if (sel.error) {
    return NextResponse.json({ ok: false, error: sel.error.message }, { status: 500 })
  }
  var docs = (sel.data || []).slice(0, limit)

  var report = []
  var okCount = 0
  var browser = null

  try {
    if (run && docs.length > 0) browser = await launchBrowser()

    var i = 0
    while (i < docs.length) {
      var d = docs[i]
      i++
      var item = {
        doc_id: d.id,
        doc_type: d.doc_type,
        label: d.label,
        file_path: d.file_path,
        initials: "",
        status: "",
        pdf_path: "",
      }

      try {
        var emp = await resolveEmployee(admin, d.contract_id)
        var initials = emp ? getInitials(((emp.prenom || "") + " " + (emp.nom || "")).trim()) : ""
        item.initials = initials

        if (!run) {
          item.status = "dry-run"
          report.push(item)
          continue
        }

        var dlres = await downloadHtml(admin, [HR_BUCKET_CONTRACT, HR_BUCKET_SIGN], d.file_path)
        if (!dlres) {
          item.status = "html introuvable dans les buckets"
          report.push(item)
          continue
        }
        var html = dlres.text

        // Dossier de bienvenue : polices déjà embarquées + paraphes déjà OK -> rendu tel quel.
        // Avenant/contrat : corriger le paraphe + embarquer les polices.
        if (d.doc_type !== "dossier_bienvenue_signe") {
          if (initials) html = fixParaphePlaceholder(html, initials)
          html = injectMeshugaFonts(html)
        }

        var pdf = await renderPdf(browser, html)

        var pdfPath = "pdf-backfill/" + d.id + ".pdf"
        var up = await admin.storage.from(HR_BUCKET_CONTRACT).upload(pdfPath, pdf, {
          contentType: "application/pdf",
          upsert: true,
        })
        if (up.error) {
          item.status = "upload échoué : " + up.error.message
          report.push(item)
          continue
        }

        var upd = await admin.from("hr_contract_documents").update({ assembled_pdf_path: pdfPath }).eq("id", d.id)
        if (upd.error) {
          item.status = "MAJ DB échouée : " + upd.error.message
          report.push(item)
          continue
        }

        item.pdf_path = pdfPath
        item.status = "ok"
        okCount++
      } catch (e) {
        item.status = "erreur : " + ((e && e.message) || String(e))
      }
      report.push(item)
    }
  } finally {
    try { if (browser) await browser.close() } catch (e) {}
  }

  return NextResponse.json({
    ok: true,
    mode: run ? "RUN" : "DRY-RUN",
    found: docs.length,
    converted: okCount,
    report: report,
  })
}
