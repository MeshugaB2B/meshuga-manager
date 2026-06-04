// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/payslips/parse-batch/route.ts
// ============================================================
// Étape 2 du wizard : extrait les montants + compteurs de congés pour un
// LOT de pages bulletins (appelée en boucle par le wizard, avec barre de
// progression). Relit le PDF temporaire, isole les pages demandées, et
// passe chacune à Claude Haiku.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { extractText, getDocumentProxy } from "unpdf"
import { parseHeader, extractFieldsWithClaude } from "@/lib/hr/payslip-parse"

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

export async function POST(req: Request) {
  try {
    var sb = getServerClient()
    if (!sb) return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 500 })

    var body: any = await req.json().catch(function () { return {} })
    var importId = String(body.importId || "").replace(/[^a-f0-9]/gi, "")
    var indices: number[] = Array.isArray(body.indices) ? body.indices : []
    if (!importId) return NextResponse.json({ ok: false, error: "importId manquant" }, { status: 400 })
    if (!indices.length) return NextResponse.json({ ok: true, items: [] })

    var tmpPath = "_imports/" + importId + ".pdf"
    var dl = await sb.storage.from(EMP_BUCKET).download(tmpPath)
    if (dl.error || !dl.data) return NextResponse.json({ ok: false, error: "Import introuvable (expiré ?)" }, { status: 404 })
    var ab = await dl.data.arrayBuffer()
    var buffer = Buffer.from(ab)

    var pdf = await getDocumentProxy(new Uint8Array(buffer))
    var res = await extractText(pdf, { mergePages: false })
    var pages: string[] = res.text || []

    // Extraction Claude en parallèle (concurrence limitée)
    var items: any[] = []
    var CONC = 5
    var queue = indices.slice()
    async function worker() {
      while (queue.length) {
        var idx = queue.shift()
        if (idx === undefined || idx < 0 || idx >= pages.length) continue
        var txt = pages[idx]
        var h = parseHeader(txt)
        var fields = { brut: null, net_imposable: null, net_paye: null, cp_n1_acquis: null, cp_n1_pris: null, cp_n1_solde: null, cp_n_acquis: null, cp_n_pris: null, cp_n_solde: null, emploi: null, statut: null }
        try { fields = await extractFieldsWithClaude(txt) } catch (e) { /* garde vide */ }
        items.push({
          index: idx,
          matricule: h ? h.matricule : null,
          periode_iso: h ? h.periode_iso : null,
          periode_label: h ? h.periode_label : null,
          periode_code: h ? h.periode_code : null,
          doc_type: h ? h.doc_type : null,
          fields: fields,
        })
      }
    }
    var workers = []
    for (var w = 0; w < CONC; w++) workers.push(worker())
    await Promise.all(workers)

    items.sort(function (a, b) { return a.index - b.index })
    return NextResponse.json({ ok: true, items: items })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e && (e as any).message) || "Erreur serveur" }, { status: 500 })
  }
}
