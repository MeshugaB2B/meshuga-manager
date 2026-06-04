// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/payslips/commit/route.ts
// ============================================================
// Étape 3 du wizard : enregistre un LOT de bulletins validés.
// Pour chaque item : découpe la page du PDF source (pdf-lib), archive le
// PDF individuel dans hr-employee-docs, crée la ligne hr_employee_documents
// (visible dans le coffre du salarié) et, pour les BULLETIN, la ligne
// hr_payslips (montants + congés). Mémorise le matricule Silae sur la fiche.
// Sur finalize=true, supprime le PDF temporaire d'import.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { PDFDocument } from "pdf-lib"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

var EMP_BUCKET = "hr-employee-docs"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

var TYPE_META: any = {
  BULLETIN: { doc_type: "bulletin_paie", label: "Bulletin de paie", folder: "bulletins" },
  SOLDECPT: { doc_type: "solde_tout_compte", label: "Reçu pour solde de tout compte", folder: "documents" },
  CERTIFTRA: { doc_type: "certificat_travail", label: "Certificat de travail", folder: "documents" },
}

export async function POST(req: Request) {
  try {
    var sb = getServerClient()
    if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 500 })

    var body: any = await req.json().catch(function () { return {} })
    var importId = String(body.importId || "").replace(/[^a-f0-9]/gi, "")
    var mapping: any = body.mapping || {}
    var items: any[] = Array.isArray(body.items) ? body.items : []
    var saveMatricule = body.saveMatricule !== false
    var finalize = body.finalize === true
    var sourceFile = String(body.sourceFile || "")
    if (!importId) return NextResponse.json({ ok: false, error: "importId manquant" }, { status: 400 })

    var tmpPath = "_imports/" + importId + ".pdf"
    var srcDoc: any = null
    if (items.length) {
      var dl = await sb.storage.from(EMP_BUCKET).download(tmpPath)
      if (dl.error || !dl.data) return NextResponse.json({ ok: false, error: "Import introuvable (expiré ?)" }, { status: 404 })
      var ab = await dl.data.arrayBuffer()
      srcDoc = await PDFDocument.load(ab)
    }

    var inserted = 0
    var archived = 0
    var errors: string[] = []
    var matriculeToEmp: any = {}

    for (var i = 0; i < items.length; i++) {
      var it = items[i]
      try {
        var mat = String(it.matricule || "")
        var empId = mapping[mat] || null
        if (!empId) { errors.push("Matricule " + mat + " non rattaché"); continue }
        if (saveMatricule && mat) matriculeToEmp[mat] = empId

        var meta = TYPE_META[it.doc_type] || TYPE_META.BULLETIN
        // Découpe de la page
        var out = await PDFDocument.create()
        var copied = await out.copyPages(srcDoc, [it.index])
        out.addPage(copied[0])
        var bytes = await out.save()
        var pdfBuf = Buffer.from(bytes)

        var iso = it.periode_iso || "0000-00-00"
        var path = empId + "/" + meta.folder + "/" + iso + "_" + meta.doc_type + ".pdf"
        var up = await sb.storage.from(EMP_BUCKET).upload(path, pdfBuf, { contentType: "application/pdf", upsert: true })
        if (up.error) { errors.push((it.periode_label || iso) + " : upload " + up.error.message); continue }

        var docIns = await sb.from("hr_employee_documents").insert({
          employee_id: empId,
          doc_type: meta.doc_type,
          label: meta.label + " — " + (it.periode_label || iso),
          file_path: path,
          mime_type: "application/pdf",
          size_bytes: pdfBuf.length,
        }).select("id").single()
        var docId = docIns && docIns.data ? docIns.data.id : null
        archived++

        if (it.doc_type === "BULLETIN") {
          var f = it.fields || {}
          // idempotence : on retire un éventuel bulletin déjà enregistré pour ce matricule/mois
          await sb.from("hr_payslips").delete().eq("silae_matricule", mat).eq("periode", iso)
          var psIns = await sb.from("hr_payslips").insert({
            employee_id: empId,
            silae_matricule: mat,
            periode: iso,
            periode_label: it.periode_label || null,
            doc_type: "bulletin",
            brut: f.brut, net_imposable: f.net_imposable, net_paye: f.net_paye,
            cp_n1_acquis: f.cp_n1_acquis, cp_n1_pris: f.cp_n1_pris, cp_n1_solde: f.cp_n1_solde,
            cp_n_acquis: f.cp_n_acquis, cp_n_pris: f.cp_n_pris, cp_n_solde: f.cp_n_solde,
            emploi: f.emploi || null, statut: f.statut || null,
            pdf_path: path,
            employee_doc_id: docId,
            source_file: sourceFile || null,
            created_by: "edward@meshuga.fr",
          })
          if (psIns.error) errors.push((it.periode_label || iso) + " : " + psIns.error.message)
          else inserted++
        }
      } catch (eItem) {
        errors.push("Item " + (it.periode_label || it.index) + " : " + ((eItem && (eItem as any).message) || "erreur"))
      }
    }

    // Mémorisation du matricule Silae sur les fiches (mapping définitif)
    if (saveMatricule) {
      var mats = Object.keys(matriculeToEmp)
      for (var m = 0; m < mats.length; m++) {
        try {
          await sb.from("hr_employees").update({ silae_matricule: mats[m] }).eq("id", matriculeToEmp[mats[m]])
        } catch (eMat) { /* conflit unique éventuel : ignoré */ }
      }
    }

    if (finalize) {
      try { await sb.storage.from(EMP_BUCKET).remove([tmpPath]) } catch (e) {}
    }

    return NextResponse.json({ ok: true, inserted: inserted, archived: archived, errors: errors })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e && (e as any).message) || "Erreur serveur" }, { status: 500 })
  }
}
