// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/countersign/route.ts
// ============================================================
// CONTRESEING EMPLOYEUR a posteriori des contrats initiaux signés pendant la
// régression v14 (bloc signature resté en mode papier : "cachet" côté employeur,
// zone manuscrite vide côté salarié).
//
// Le document signé d'origine (hr-signatures + hash) n'est JAMAIS modifié.
// On produit une NOUVELLE version, archivée à côté :
//   - bloc employeur  → signature E.T. (mandat permanent) + mention "contresigné le …"
//   - bloc salarié    → signature électronique reconstituée depuis signature_audit_data
//   - cartouche       → rappel du hash SHA-256 du document signé par le salarié
//
// Utilisation (clé obligatoire) :
//   ?key=…&date=2026-10-14                 → DRY-RUN : liste les contrats signés ce jour-là
//   ?key=…&contractId=<id>&run=1           → génère, archive et renvoie le PDF
//
// SWC-safe : var partout, function(){}.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import { loadEmployerSignature, renderEmployerSignatureBlock } from "@/app/dashboard/rh/employerSignature"
import { launchBrowser, renderPdf, injectMeshugaFonts, fixParaphePlaceholder } from "@/lib/hr/pdf-render"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"
export var maxDuration = 120

var KEY_SHA256 = "ef6208d5f1c5a7d02237d1b86421d10023728b11a4f7efd44e52fe843ae6ca9e"

function getAdmin() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(url, key, { auth: { persistSession: false } })
}

function esc(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function fmtParis(iso) {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(new Date(iso)).replace(" ", " à ")
  } catch (e) { return String(iso) }
}

function getInitials(fullName) {
  if (!fullName) return ""
  var parts = String(fullName).trim().split(/\s+/)
  var out = ""
  for (var i = 0; i < parts.length; i++) if (parts[i]) out += parts[i].charAt(0).toUpperCase() + "."
  return out
}

// Bornes UTC d'une journée calendaire à Paris (gère heure d'été / hiver)
function parisDayRange(dateStr) {
  var noonUtc = new Date(dateStr + "T12:00:00Z")
  var parisNoon = new Date(noonUtc.toLocaleString("en-US", { timeZone: "Europe/Paris" }))
  var offsetMs = parisNoon.getTime() - new Date(noonUtc.toLocaleString("en-US", { timeZone: "UTC" })).getTime()
  var start = new Date(new Date(dateStr + "T00:00:00Z").getTime() - offsetMs)
  var end = new Date(start.getTime() + 24 * 3600 * 1000)
  return { start: start.toISOString(), end: end.toISOString() }
}

function buildEmployeeBlockFromAudit(a, hash) {
  var ua = a.parsed_ua || {}
  var geo = a.geo || null
  var geoStr = geo ? [geo.city, geo.country].filter(Boolean).join(", ") : "Non déterminée"
  var lbl = 'style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin:4px 0 3px 0;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A"'
  var k = 'style="color:#2c2c2c;font-weight:700"'
  var mono = 'style="font-family:\'SF Mono\',Consolas,monospace;font-size:7px;word-break:break-all"'
  var hashShort = hash ? String(hash).slice(0, 32) + "…" : "—"
  return ''
    + '<div class="sig-space" style="padding:0;display:block">'
    + '<div style="text-align:center;padding:14px 12px 10px 12px;border-bottom:1px dotted #DDD;margin-bottom:8px">'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;color:#666;font-style:italic;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">Signature électronique du salarié</div>'
    + '<div style="font-family:Yellowtail,cursive;font-size:38px;color:#FF82D7;line-height:1;padding:6px 0">' + esc(a.signed_full_name) + '</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:10px;color:#191923;font-weight:700;margin-top:4px">« Lu et approuvé »</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:9px;color:#555;font-style:italic;margin-top:2px">Le ' + esc(fmtParis(a.signed_at)) + ' (heure de Paris)</div>'
    + '</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;line-height:1.55;color:#555;padding:0 14px 8px 14px">'
    + '<div ' + lbl + '>Identité du signataire</div>'
    + '<div><strong ' + k + '>Nom :</strong> ' + esc(a.signed_full_name) + '</div>'
    + '<div><strong ' + k + '>Email :</strong> ' + esc(a.recipient_email || "—") + '</div>'
    + '<div><strong ' + k + '>Identifiant :</strong> <span ' + mono + '>' + esc(a.signature_id || "—") + '</span></div>'
    + '<div ' + lbl + '>Chaîne de délivrance</div>'
    + (a.sent_at ? '<div><strong ' + k + '>Envoyé le :</strong> ' + esc(fmtParis(a.sent_at)) + '</div>' : '')
    + (a.viewed_at ? '<div><strong ' + k + '>Ouvert le :</strong> ' + esc(fmtParis(a.viewed_at)) + '</div>' : '')
    + '<div><strong ' + k + '>Signé le :</strong> ' + esc(fmtParis(a.signed_at)) + '</div>'
    + '<div ' + lbl + '>Traçabilité technique</div>'
    + '<div><strong ' + k + '>IP :</strong> <span ' + mono + '>' + esc(a.ip || "—") + '</span> (' + esc(geoStr) + ')</div>'
    + '<div><strong ' + k + '>Système :</strong> ' + esc(ua.os || "—") + ' · ' + esc(ua.browser || "—") + '</div>'
    + '<div ' + lbl + '>Intégrité du document</div>'
    + '<div><strong ' + k + '>Hash SHA-256 (document signé) :</strong> <span ' + mono + '>' + esc(hashShort) + '</span></div>'
    + '<div><strong ' + k + '>Consentement :</strong> ' + esc(a.consent_text || "Lu et approuvé l'intégralité du document") + '</div>'
    + '<div style="margin-top:5px;padding-top:4px;border-top:1px dotted #DDD;font-size:7.5px;font-style:italic;color:#666">Force probante équivalente à signature manuscrite (art. 1366-1367 C. civ. + eIDAS UE 910/2014).</div>'
    + '</div></div>'
    + '<div class="sig-foot" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:9.5px;font-weight:700;color:#16A34A">✓ Signé électroniquement le ' + esc(fmtParis(a.signed_at)) + '</div>'
}

export async function GET(req: Request) {
  var u = new URL(req.url)
  var key = u.searchParams.get("key") || ""
  if (createHash("sha256").update(key, "utf8").digest("hex") !== KEY_SHA256) {
    return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 })
  }
  var admin = getAdmin()
  var contractId = u.searchParams.get("contractId")
  var run = u.searchParams.get("run") === "1"

  // === DRY-RUN : liste des contrats signés un jour donné ===
  if (!contractId) {
    var date = u.searchParams.get("date") || ""
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ ok: false, error: "Paramètre date=AAAA-MM-JJ requis" }, { status: 400 })
    }
    var r = parisDayRange(date)
    var list = await admin.from("hr_contracts")
      .select("id, type, fonction, employee_id, signature_signed_at, signed_pdf_path, signature_status")
      .gte("signature_signed_at", r.start).lt("signature_signed_at", r.end)
      .order("signature_signed_at", { ascending: false })
    if (list.error) return NextResponse.json({ ok: false, error: list.error.message }, { status: 500 })
    var rows = list.data || []
    var out = []
    for (var i = 0; i < rows.length; i++) {
      var e = await admin.from("hr_employees").select("prenom, nom").eq("id", rows[i].employee_id).maybeSingle()
      out.push({
        id: rows[i].id, type: rows[i].type, fonction: rows[i].fonction,
        salarie: e.data ? (e.data.prenom + " " + e.data.nom) : null,
        signed_at: rows[i].signature_signed_at, signed_at_paris: fmtParis(rows[i].signature_signed_at),
        signed_pdf_path: rows[i].signed_pdf_path,
      })
    }
    return NextResponse.json({ ok: true, mode: "DRY-RUN", range: r, count: out.length, contracts: out })
  }

  // === Chargement du contrat signé ===
  var cRes = await admin.from("hr_contracts").select("*").eq("id", contractId).maybeSingle()
  if (cRes.error || !cRes.data) return NextResponse.json({ ok: false, error: "Contrat introuvable" }, { status: 404 })
  var c: any = cRes.data
  if (!c.signed_pdf_path || !c.signature_audit_data) {
    return NextResponse.json({ ok: false, error: "Contrat sans signature électronique archivée" }, { status: 409 })
  }
  var dl = await admin.storage.from("hr-signatures").download(c.signed_pdf_path)
  if (dl.error || !dl.data) return NextResponse.json({ ok: false, error: "HTML signé introuvable : " + (dl.error && dl.error.message) }, { status: 404 })
  var html = await dl.data.text()

  var sig = await loadEmployerSignature()
  if (!sig) return NextResponse.json({ ok: false, error: "Mandat de signature employeur inactif (Paramètres → Signature)" }, { status: 409 })

  var audit: any = c.signature_audit_data
  var hash = c.signature_pdf_hash || audit.hash_sha256 || ""
  var nowIso = new Date().toISOString()
  var report: any = { employer_block: false, employee_block: false }

  // 1. Bloc employeur "cachet" → signature E.T. + mention de contreseing
  var employerRe = /<div class="sig-head">Pour l'Employeur<\/div>[\s\S]*?SAS AEGIA<\/span><\/div>/
  if (employerRe.test(html)) {
    html = html.replace(employerRe, '<div class="sig-head">Pour l\'Employeur</div>'
      + renderEmployerSignatureBlock(sig)
      + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;color:#555;font-style:italic;text-align:center;padding:4px 10px 0">Contresigné électroniquement par l\'Employeur le ' + esc(fmtParis(nowIso)) + ' (heure de Paris), postérieurement à la signature du/de la Salarié(e).</div>')
    report.employer_block = true
  }

  // 2. Bloc salarié manuscrit vide → signature électronique (données d'audit)
  var employeeRe = /<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé[^<]*<\/div>\s*<div class="sig-foot">Date : __ \/ __ \/ ____<\/div>/
  if (employeeRe.test(html)) {
    html = html.replace(employeeRe, buildEmployeeBlockFromAudit(audit, hash))
    report.employee_block = true
  }

  if (!report.employer_block) {
    return NextResponse.json({ ok: false, error: "Bloc employeur 'cachet' introuvable (déjà contresigné ?)", report: report }, { status: 409 })
  }

  html = fixParaphePlaceholder(html, getInitials(audit.signed_full_name))
  if (!run) return new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } })

  // 3. Rendu PDF + archivage (nouvelle version, l'original reste intact)
  var browser = null
  var pdf = null
  try {
    browser = await launchBrowser()
    pdf = await renderPdf(browser, injectMeshugaFonts(html))
  } finally {
    try { if (browser) await browser.close() } catch (e) {}
  }
  var ts = nowIso.replace(/[:.]/g, "-")
  var base = "contracts/" + c.id + "/" + ts + "_contrat_signe_contresigne"
  await admin.storage.from("hr-contract-docs").upload(base + ".html", new Blob([html], { type: "text/html; charset=utf-8" }), { contentType: "text/html; charset=utf-8", upsert: true })
  var up = await admin.storage.from("hr-contract-docs").upload(base + ".pdf", pdf, { contentType: "application/pdf", upsert: true })
  var ins = await admin.from("hr_contract_documents").insert({
    contract_id: c.id,
    doc_type: "contrat_signe",
    label: "Contrat signé + contresigné employeur le " + new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
    file_path: base + ".html",
    mime_type: "text/html; charset=utf-8",
    size_bytes: new Blob([html]).size,
    assembled_pdf_path: up.error ? null : base + ".pdf",
    document_date: nowIso.substring(0, 10),
    validated_by_user: true,
  })

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=\"contrat_contresigne_" + c.id + ".pdf\"",
      "X-Countersign-Report": JSON.stringify({
        employer_block: report.employer_block, employee_block: report.employee_block,
        pdf_uploaded: !up.error, doc_inserted: !ins.error,
        error: (up.error && up.error.message) || (ins.error && ins.error.message) || null,
      }),
    },
  })
}
