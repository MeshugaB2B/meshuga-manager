// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/attestations/[id]/pdf/route.ts
// ============================================================
// Sert le PDF signé d'une attestation (bucket privé hr-employee-docs) :
// génère une URL signée courte (5 min) et redirige dessus.
// Appelée par le bouton « Voir le PDF signé » de la fiche salarié.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  var id = ctx.params.id
  if (!id) return new Response("Identifiant manquant", { status: 400 })

  var sb = getServerClient()
  if (!sb) return new Response("Configuration manquante", { status: 500 })

  var res = await sb.from("hr_attestations").select("signed_pdf_path").eq("id", id).single()
  if (res.error || !res.data || !res.data.signed_pdf_path) {
    return new Response("PDF introuvable", { status: 404 })
  }

  var su = await sb.storage.from("hr-employee-docs").createSignedUrl(res.data.signed_pdf_path, 300)
  if (su.error || !su.data || !su.data.signedUrl) {
    return new Response("Erreur de génération du lien", { status: 500 })
  }

  return NextResponse.redirect(su.data.signedUrl)
}
