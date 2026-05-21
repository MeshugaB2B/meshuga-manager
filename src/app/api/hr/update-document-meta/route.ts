// ============================================================
// /api/hr/update-document-meta/route.ts
// ============================================================
// Met à jour les métadonnées d'un hr_contract_documents :
//   - document_date     : date du document (signature, embauche, paie...)
//   - document_description : description courte (motif avenant, etc.)
//
// Utilisé par HistoricalDocumentUploadModal après l'OCR pour
// renseigner automatiquement les infos détectées.
//
// Sprint Y1 — Phase R — Sprint R3
//
// Body :
//   {
//     doc_id: string,
//     document_date?: string | null,      // ISO yyyy-mm-dd
//     document_description?: string | null,
//   }
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var docId = body && body.doc_id
    if (!docId || typeof docId !== "string") {
      return NextResponse.json({ ok: false, error: "doc_id requis" }, { status: 400 })
    }

    var payload: any = {}
    if (body.document_date !== undefined) {
      payload.document_date = body.document_date || null
    }
    if (body.document_description !== undefined) {
      // Tronquer à 500 chars pour éviter abus
      var desc = body.document_description
      if (typeof desc === "string" && desc.length > 500) {
        desc = desc.slice(0, 500)
      }
      payload.document_description = desc || null
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ ok: false, error: "Rien à mettre à jour" }, { status: 400 })
    }

    var supabase = getServerClient()
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Config serveur manquante" }, { status: 500 })
    }

    var res = await supabase
      .from("hr_contract_documents")
      .update(payload)
      .eq("id", docId)
      .select("id, document_date, document_description")
      .maybeSingle()

    if (res.error) {
      console.error("[update-document-meta] DB error:", res.error.message)
      return NextResponse.json({ ok: false, error: "Erreur base de données" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, document: res.data }, { status: 200 })
  } catch (err: any) {
    console.error("[update-document-meta] Exception:", err && err.message)
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 })
  }
}
