// src/app/api/sign/[token]/welcomepack/route.ts
// ============================================================
// Sprint C3 — Dossier de bienvenue à signer (validé par token)
// ============================================================
// Renvoie le HTML du Dossier de bienvenue Meshuga (13 pages) associé au token.
// N'est appelé que si signature_includes_welcome_pack === true.
// ============================================================

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildWelcomePack } from "@/app/dashboard/rh/welcomePackBuilder"
import { loadEmployerSignature } from "@/app/dashboard/rh/employerSignature"
import { LOGO_PINK } from "@/app/dashboard/logos"

export var runtime = "nodejs"

export async function GET(
  req: Request,
  ctx: { params: { token: string } }
) {
  var token = ctx.params.token
  if (!token || token.length < 16) {
    return new NextResponse("Lien invalide", { status: 400 })
  }

  var sb = createAdminClient()

  // Chercher d'abord dans amendments
  var resAmendment = await sb
    .from("hr_contract_amendments")
    .select("id, contract_id, signature_status, signature_includes_welcome_pack, signed_at")
    .eq("signature_token", token)
    .maybeSingle()

  var contractId: string | null = null

  if (resAmendment.data) {
    if (resAmendment.data.signed_at || resAmendment.data.signature_status === "signed") {
      return new NextResponse("Signature déjà effectuée", { status: 410 })
    }
    if (resAmendment.data.signature_includes_welcome_pack !== true) {
      return new NextResponse("Dossier de bienvenue non inclus dans cet envoi", { status: 404 })
    }
    contractId = resAmendment.data.contract_id
  } else {
    // Pas d'amendment → essayer dans hr_contracts
    var resContract = await sb
      .from("hr_contracts")
      .select("id, signature_status, signature_includes_welcome_pack, signed_at")
      .eq("signature_token", token)
      .maybeSingle()
    if (!resContract.data) {
      return new NextResponse("Token introuvable", { status: 404 })
    }
    if (resContract.data.signed_at || resContract.data.signature_status === "signed") {
      return new NextResponse("Signature déjà effectuée", { status: 410 })
    }
    if (resContract.data.signature_includes_welcome_pack !== true) {
      return new NextResponse("Dossier de bienvenue non inclus", { status: 404 })
    }
    contractId = resContract.data.id
  }

  if (!contractId) {
    return new NextResponse("Contrat introuvable", { status: 404 })
  }

  // Charger contrat + salarié
  var resCtr = await sb.from("hr_contracts").select("*").eq("id", contractId).maybeSingle()
  if (!resCtr.data) {
    return new NextResponse("Contrat introuvable", { status: 404 })
  }
  var contract: any = resCtr.data

  var empId = contract.employee_id
  if (!empId && contract.cycle_id) {
    var resCyc = await sb
      .from("hr_employment_cycles")
      .select("employee_id")
      .eq("id", contract.cycle_id)
      .maybeSingle()
    empId = (resCyc.data && resCyc.data.employee_id) || null
  }
  if (!empId) {
    return new NextResponse("Salarié introuvable", { status: 404 })
  }

  var resEmp = await sb.from("hr_employees").select("*").eq("id", empId).maybeSingle()
  if (!resEmp.data) {
    return new NextResponse("Salarié introuvable", { status: 404 })
  }

  var employerSig = await loadEmployerSignature()
  var html = buildWelcomePack(resEmp.data, contract, LOGO_PINK, employerSig)

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
