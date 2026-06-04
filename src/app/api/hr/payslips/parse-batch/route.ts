// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/payslips/parse-batch/route.ts
// ============================================================
// Étape 2 du wizard : extrait montants + congés pour un LOT de pages.
// 100% déterministe (aucun appel externe) : montants depuis le texte "flux",
// congés depuis les lignes reconstruites par coordonnées (colonnes préservées).
// Instantané, gratuit, sans risque de timeout.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getDocumentProxy, extractText } from "unpdf"
import { parseHeader, extractFields, layoutLinesFromItems } from "@/lib/hr/payslip-parse"

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
    var fluxRes = await extractText(pdf, { mergePages: false })
    var flux: string[] = fluxRes.text || []

    var items: any[] = []
    for (var n = 0; n < indices.length; n++) {
      var idx = indices[n]
      if (idx === undefined || idx < 0 || idx >= flux.length) continue
      var fluxText = flux[idx]
      var h = parseHeader(fluxText)
      var layout: string[] = []
      try {
        var page = await pdf.getPage(idx + 1)
        var tc = await page.getTextContent()
        layout = layoutLinesFromItems(tc.items)
      } catch (e) { layout = [] }
      var fields = extractFields(fluxText, layout)
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

    items.sort(function (a, b) { return a.index - b.index })
    return NextResponse.json({ ok: true, items: items })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e && (e as any).message) || "Erreur serveur" }, { status: 500 })
  }
}
