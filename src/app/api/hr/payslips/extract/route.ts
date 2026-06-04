// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/payslips/extract/route.ts
// ============================================================
// Étape 1 du wizard d'import des bulletins Silae.
// Reçoit le PDF (base64), lit les en-têtes "##" de chaque page (rapide,
// sans Claude), dépose le PDF en zone temporaire (hr-employee-docs/_imports/),
// et renvoie : la liste des salariés détectés (matricule, nb bulletins) avec
// un mapping suggéré vers les fiches Meshuga, et la liste des pages bulletins.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { extractText, getDocumentProxy } from "unpdf"
import { parseHeader } from "@/lib/hr/payslip-parse"

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

function norm(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function POST(req: Request) {
  try {
    var sb = getServerClient()
    if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 500 })

    var body: any = await req.json().catch(function () { return {} })
    var pdfBase64 = String(body.pdfBase64 || "")
    var filename = String(body.filename || "bulletins.pdf")
    if (!pdfBase64) return NextResponse.json({ ok: false, error: "PDF manquant" }, { status: 400 })

    var clean = pdfBase64.indexOf("base64,") >= 0 ? pdfBase64.split("base64,")[1] : pdfBase64
    var buffer = Buffer.from(clean, "base64")

    // Lecture des en-têtes page par page
    var pdf = await getDocumentProxy(new Uint8Array(buffer))
    var res = await extractText(pdf, { mergePages: false })
    var pages: string[] = res.text || []

    var employees: any = {}        // matricule -> agrégat
    var bulletinPages: any[] = []
    var annexPages: any[] = []
    for (var i = 0; i < pages.length; i++) {
      var h = parseHeader(pages[i])
      if (!h) continue
      var e = employees[h.matricule]
      if (!e) {
        e = { matricule: h.matricule, header_nom: h.nom, header_prenom: h.prenom, nb_bulletins: 0, nb_annexes: 0, periodes: [] }
        employees[h.matricule] = e
      }
      if (h.doc_type === "BULLETIN") {
        e.nb_bulletins++
        if (e.periodes.indexOf(h.periode_code) < 0) e.periodes.push(h.periode_code)
        bulletinPages.push({ index: i, matricule: h.matricule, periode_code: h.periode_code, periode_iso: h.periode_iso, periode_label: h.periode_label, doc_type: h.doc_type })
      } else {
        e.nb_annexes++
        annexPages.push({ index: i, matricule: h.matricule, periode_code: h.periode_code, periode_iso: h.periode_iso, periode_label: h.periode_label, doc_type: h.doc_type })
      }
    }

    // Salariés Meshuga pour suggestions de mapping
    var empRes = await sb.from("hr_employees").select("id, prenom, nom, silae_matricule")
    var allEmp = empRes.data || []
    var allEmployees = allEmp.map(function (x: any) {
      return { id: x.id, label: ((x.prenom || "") + " " + (x.nom || "")).trim(), silae_matricule: x.silae_matricule || null }
    })

    var byMatricule: any = {}
    var byName: any = {}
    for (var k = 0; k < allEmp.length; k++) {
      var emp: any = allEmp[k]
      if (emp.silae_matricule) byMatricule[String(emp.silae_matricule)] = emp.id
      byName[norm((emp.prenom || "") + " " + (emp.nom || ""))] = emp.id
      byName[norm((emp.nom || "") + " " + (emp.prenom || ""))] = emp.id
    }

    var empList = Object.keys(employees).map(function (mat) {
      var e = employees[mat]
      var suggested: string | null = null
      var alreadyMapped = false
      if (byMatricule[mat]) { suggested = byMatricule[mat]; alreadyMapped = true }
      else {
        var key1 = norm(e.header_prenom + " " + e.header_nom)
        var key2 = norm(e.header_nom + " " + e.header_prenom)
        suggested = byName[key1] || byName[key2] || null
      }
      e.periodes.sort()
      return Object.assign({}, e, { suggested_employee_id: suggested, already_mapped: alreadyMapped })
    })
    empList.sort(function (a: any, b: any) { return a.matricule < b.matricule ? -1 : 1 })

    // Dépôt temporaire du PDF source
    var importId = randomUUID().replace(/-/g, "")
    var tmpPath = "_imports/" + importId + ".pdf"
    var up = await sb.storage.from(EMP_BUCKET).upload(tmpPath, buffer, { contentType: "application/pdf", upsert: true })
    if (up.error) return NextResponse.json({ ok: false, error: "Dépôt temporaire impossible : " + up.error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      importId: importId,
      filename: filename,
      totalPages: pages.length,
      employees: empList,
      bulletinPages: bulletinPages,
      annexPages: annexPages,
      allEmployees: allEmployees,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e && (e as any).message) || "Erreur serveur" }, { status: 500 })
  }
}
