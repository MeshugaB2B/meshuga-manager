// ============================================================
// /api/employer-signature/route.ts
// ============================================================
// Endpoint GET côté serveur qui expose la signature électronique
// pré-enregistrée d'Edward (mandat permanent) aux composants
// côté client (RhWizard, RhTab, etc.).
//
// La signature ne peut pas être chargée directement côté client
// car elle nécessite SUPABASE_SERVICE_ROLE_KEY (table app_settings
// est RLS service_role only).
//
// Retourne :
//   { active: true, full_name, png_base64, svg, activated_at, ip,
//     country, consent_hash, legal_text_version, quality,
//     company_name, company_siren }     si mandat actif
//   { active: false, error: "..." }     sinon (status 200 quand même)
//
// Cache : private, max-age=300 (5 min) — la signature change rarement
// ============================================================

import { NextResponse } from "next/server"
import { loadEmployerSignature } from "@/app/dashboard/rh/employerSignature"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    var sig = await loadEmployerSignature()
    if (!sig) {
      return NextResponse.json(
        { active: false, error: "Aucun mandat permanent actif" },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      )
    }
    return NextResponse.json(
      {
        active: sig.active,
        full_name: sig.full_name,
        png_base64: sig.png_base64,
        svg: sig.svg,
        activated_at: sig.activated_at,
        ip: sig.ip,
        country: sig.country,
        consent_hash: sig.consent_hash,
        legal_text_version: sig.legal_text_version,
        quality: sig.quality,
        company_name: sig.company_name,
        company_siren: sig.company_siren,
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=300, must-revalidate" },
      }
    )
  } catch (err: any) {
    console.error("[/api/employer-signature] Error:", err && err.message)
    return NextResponse.json(
      { active: false, error: "Erreur serveur" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
