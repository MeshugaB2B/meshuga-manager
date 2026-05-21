// ============================================================
// /api/employer-signature/route.ts
// ============================================================
// Endpoint GET qui retourne la signature électronique pré-enregistrée
// d'Edward, pour usage côté client par les composants qui appellent
// buildContract() / buildAvenant().
//
// 🔒 Sécurité :
// - Utilise SUPABASE_SERVICE_ROLE_KEY côté serveur uniquement
// - La service_role ne sort JAMAIS au client
// - Ne retourne au client que les champs déjà publics
//   (le PNG signature apparaît dans tous les PDFs envoyés aux salariés/tiers)
//
// Sprint Y1 — Signature électronique custom
// ============================================================
//
// USAGE côté client :
//   var res = await fetch("/api/employer-signature")
//   var sig = res.ok ? await res.json() : null
//   // si sig.active === false ou sig === null → fallback "cachet"
//   var html = buildContract(contract, emp, vacs, logoUri, sig)
//
// ============================================================

import { NextResponse } from "next/server"
import { loadEmployerSignature } from "@/app/dashboard/rh/employerSignature"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    var sig = await loadEmployerSignature()
    
    // Mandat inactif ou absent → on retourne explicitement { active: false }
    // (200 OK plutôt que 404, le composant client peut décider du fallback)
    if (!sig) {
      return NextResponse.json(
        { active: false, error: "Aucun mandat permanent actif" },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      )
    }
    
    // Mandat actif : on retourne tous les champs nécessaires pour rendu PDF
    // Ces données sont déjà visibles dans tous les PDFs signés (pas de PII supplémentaire)
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
        headers: {
          // La signature change rarement (uniquement quand Edward révoque + réactive)
          // 5 min de cache navigateur pour réduire les fetchs répétés
          "Cache-Control": "private, max-age=300, must-revalidate",
        },
      }
    )
  } catch (err: any) {
    console.error("[/api/employer-signature] Error:", err.message)
    return NextResponse.json(
      { active: false, error: "Erreur serveur" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    )
  }
}
