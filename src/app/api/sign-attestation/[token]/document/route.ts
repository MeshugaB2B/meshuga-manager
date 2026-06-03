// ============================================================
// FILE PATH dans le repo :
//   src/app/api/sign-attestation/[token]/document/route.ts
// ============================================================
// Sert le HTML du Guide d'hygiène personnalisé au nom du salarié, pour
// affichage dans l'iframe de la page de signature. Marque viewed_at.
// (Publique, validée par token — comme /api/sign/[token]/document.)
// ============================================================

import { createClient } from "@supabase/supabase-js"
import { buildHygieneGuide } from "@/app/dashboard/rh/hygieneGuideBuilder"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: Request, ctx: { params: { token: string } }) {
  var token = ctx.params.token
  if (!token || token.length < 16) {
    return new Response("Lien invalide", { status: 400 })
  }
  var sb = getServerClient()
  if (!sb) return new Response("Configuration manquante", { status: 500 })

  var attRes = await sb
    .from("hr_attestations")
    .select("id, employee_id, doc_version, signature_status, signature_viewed_at, signature_signed_at")
    .eq("signature_token", token)
    .single()
  if (attRes.error || !attRes.data) {
    return new Response("Document introuvable", { status: 404 })
  }
  var att: any = attRes.data

  var empRes = await sb
    .from("hr_employees")
    .select("civilite, prenom, nom, email")
    .eq("id", att.employee_id)
    .single()
  var emp: any = empRes.data || {}

  // Marque comme "vu" si pas encore vu et pas déjà signé
  if (!att.signature_viewed_at && att.signature_status !== "signed") {
    try {
      await sb
        .from("hr_attestations")
        .update({
          signature_viewed_at: new Date().toISOString(),
          signature_status: "viewed",
          status: "viewed",
        })
        .eq("id", att.id)
    } catch (e) {}
  }

  var html = buildHygieneGuide(
    { civilite: emp.civilite, prenom: emp.prenom, nom: emp.nom, email: emp.email },
    { version: att.doc_version || "v5" }
  )

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  })
}
