// src/app/api/sign/[token]/document/route.ts
// ============================================================
// Sprint C3 — Document à signer (publique, validée par token)
// ============================================================
// Renvoie le HTML de l'avenant (ou du contrat initial) associé au
// token de signature.
// Validation : le token doit exister en base et le document ne doit
// pas être signé.
//
// Sécurité : route publique côté Vercel (pas d'auth), mais validation
// token serveur avant tout.
// ============================================================

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildAvenant } from "@/app/dashboard/rh/amendmentBuilder"
import { buildContract } from "@/app/dashboard/rh/contractBuilders"
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

  // === 1) Chercher dans hr_contract_amendments ===
  var resAmendment = await sb
    .from("hr_contract_amendments")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle()

  if (resAmendment.data) {
    var amendment: any = resAmendment.data
    if (amendment.signature_status === "signed" || amendment.signed_at) {
      return new NextResponse("Avenant déjà signé", { status: 410 })
    }

    // Charger le contrat parent
    var resContract = await sb
      .from("hr_contracts")
      .select("*")
      .eq("id", amendment.contract_id)
      .maybeSingle()
    if (!resContract.data) {
      return new NextResponse("Contrat parent introuvable", { status: 404 })
    }
    var contract: any = resContract.data

    // Résoudre employee_id via cycle si manquant
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
    var emp: any = resEmp.data

    // Vacations (pour les avenants extra)
    var resVacs = await sb.from("hr_contract_vacations")
      .select("*")
      .eq("contract_id", contract.id)
      .order("ordre", { ascending: true })
    var vacs = resVacs.data || []

    // previousValues à partir de amendment.changes
    var previousValues: any = {}
    if (amendment.changes && typeof amendment.changes === "object") {
      Object.keys(amendment.changes).forEach(function (field) {
        var ch = amendment.changes[field]
        if (ch && ch.before !== undefined) previousValues[field] = ch.before
      })
    }

    // Signature employeur (mandat permanent)
    var employerSig = await loadEmployerSignature()

    var html = buildAvenant(amendment, contract, emp, vacs, LOGO_PINK, previousValues, employerSig)
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  // === 2) Fallback : pas trouvé dans avenants → chercher dans hr_contracts ===
  var resContractDirect = await sb
    .from("hr_contracts")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle()

  if (resContractDirect.data) {
    var contractDirect: any = resContractDirect.data
    if (contractDirect.signature_status === "signed" || contractDirect.signature_signed_at) {
      return new NextResponse("Contrat déjà signé", { status: 410 })
    }

    // Résoudre employee_id (via cycle_id si manquant)
    var empIdDirect = contractDirect.employee_id
    if (!empIdDirect && contractDirect.cycle_id) {
      var resCycDirect = await sb
        .from("hr_employment_cycles")
        .select("employee_id")
        .eq("id", contractDirect.cycle_id)
        .maybeSingle()
      empIdDirect = (resCycDirect.data && resCycDirect.data.employee_id) || null
    }
    if (!empIdDirect) {
      return new NextResponse("Salarié introuvable", { status: 404 })
    }

    var resEmpDirect = await sb.from("hr_employees").select("*").eq("id", empIdDirect).maybeSingle()
    if (!resEmpDirect.data) {
      return new NextResponse("Salarié introuvable", { status: 404 })
    }
    var empDirect: any = resEmpDirect.data

    // Vacations pour les contrats extras
    var resVacsDirect = await sb.from("hr_contract_vacations")
      .select("*")
      .eq("contract_id", contractDirect.id)
      .order("ordre", { ascending: true })
    var vacsDirect = resVacsDirect.data || []

    // Signature employeur (mandat permanent) → utilisée par buildContract via injection ultérieure
    // Note : buildContract n'accepte pas employerSig directement, on charge quand même
    // pour cohérence avec le flow signed (submit_route.ts)
    var _employerSigDirect = await loadEmployerSignature()
    void _employerSigDirect

    var htmlDirect = buildContract(contractDirect, empDirect, vacsDirect, LOGO_PINK)
    return new NextResponse(htmlDirect, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  return new NextResponse("Token introuvable", { status: 404 })
}
