// ============================================================
// /api/amendments/[id]/send-signature/route.ts
// ============================================================
// POST endpoint pour envoyer un avenant pour signature
// électronique au salarié.
//
// Sprint Y1 — Phase C — Sprint C2A
//
// Symétrique de /api/contracts/[id]/send-signature mais sur la
// table hr_contract_amendments.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import {
  getEmployeeWelcomePackStatus,
  updateEmployeeContactInfo,
} from "@/app/dashboard/rh/employeeWelcomePack"
import { sendBrevoEmail, buildSignatureRequestEmail } from "@/lib/brevo"

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

// === Helper : libellé du type d'avenant ===
function getAmendmentTypeLabel(amendmentType: string): string {
  var t = (amendmentType || "").toLowerCase()
  if (t === "regularisation_welcome_pack") return "Avenant d'actualisation contractuelle"
  if (t === "augmentation_salaire") return "Avenant — Modification de la rémunération"
  if (t === "modification_horaires") return "Avenant — Modification des horaires"
  if (t === "changement_poste") return "Avenant — Changement de poste"
  if (t === "prolongation_duree") return "Avenant — Prolongation de la durée"
  if (t === "autre") return "Avenant au contrat de travail"
  return "Avenant au contrat de travail"
}

// ============================================================
// POST handler
// ============================================================
export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  var amendmentId = ctx.params.id
  if (!amendmentId) {
    return NextResponse.json({ ok: false, error: "ID avenant manquant" }, { status: 400 })
  }

  // === 1. Parse body ===
  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Body JSON invalide" }, { status: 400 })
  }

  var recipientEmail = (body && typeof body.recipientEmail === "string" ? body.recipientEmail : "").trim().toLowerCase()
  var includeWelcomePack = body && body.includeWelcomePack === true
  var saveEmailToProfile = body && body.saveEmailToProfile === true

  if (!recipientEmail || !recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return NextResponse.json({ ok: false, error: "Email destinataire invalide" }, { status: 400 })
  }

  // === 2. Init Supabase ===
  var supabase = getServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Configuration serveur manquante" }, { status: 500 })
  }

  // === 3. Récupérer l'avenant ===
  var resAmendment = await supabase
    .from("hr_contract_amendments")
    .select("id, contract_id, amendment_type, signature_status")
    .eq("id", amendmentId)
    .maybeSingle()

  if (resAmendment.error) {
    console.error("[send-signature/amendment] DB error:", resAmendment.error.message)
    return NextResponse.json({ ok: false, error: "Erreur base de données" }, { status: 500 })
  }
  if (!resAmendment.data) {
    return NextResponse.json({ ok: false, error: "Avenant introuvable" }, { status: 404 })
  }

  var amendment: any = resAmendment.data
  if (amendment.signature_status === "signed") {
    return NextResponse.json({ ok: false, error: "Cet avenant est déjà signé" }, { status: 409 })
  }

  // === 4. Résoudre employee_id via le contrat parent ===
  if (!amendment.contract_id) {
    return NextResponse.json({ ok: false, error: "Contrat parent introuvable" }, { status: 404 })
  }
  var resContract = await supabase
    .from("hr_contracts")
    .select("id, employee_id, cycle_id")
    .eq("id", amendment.contract_id)
    .maybeSingle()
  if (resContract.error || !resContract.data) {
    return NextResponse.json({ ok: false, error: "Contrat parent introuvable" }, { status: 404 })
  }

  var contractData: any = resContract.data
  var employeeId: string | null = contractData.employee_id || null
  if (!employeeId && contractData.cycle_id) {
    var resCyc = await supabase
      .from("hr_employment_cycles")
      .select("employee_id")
      .eq("id", contractData.cycle_id)
      .maybeSingle()
    employeeId = (resCyc.data && resCyc.data.employee_id) || null
  }
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "Salarié introuvable" }, { status: 404 })
  }

  // === 5. Statut welcome_pack ===
  var empStatus = await getEmployeeWelcomePackStatus(employeeId)
  if (!empStatus) {
    return NextResponse.json({ ok: false, error: "Statut salarié introuvable" }, { status: 404 })
  }

  // === 6. Logique bundle ===
  var finalIncludeWelcomePack = includeWelcomePack
  if (empStatus.welcome_pack_signed) {
    finalIncludeWelcomePack = false
  }

  // === 7. Token ===
  var token = randomUUID().replace(/-/g, "")

  // === 8. UPDATE hr_contract_amendments ===
  var updatePayload: any = {
    signature_token: token,
    signature_status: "sent",
    signature_sent_at: new Date().toISOString(),
    signature_channel: "email",
    signature_recipient_email: recipientEmail,
    signature_includes_welcome_pack: finalIncludeWelcomePack,
    signature_viewed_at: null,
    signature_signed_at: null,
    signature_audit_data: null,
    signature_pdf_hash: null,
  }
  var resUpdate = await supabase
    .from("hr_contract_amendments")
    .update(updatePayload)
    .eq("id", amendmentId)
  if (resUpdate.error) {
    console.error("[send-signature/amendment] Update error:", resUpdate.error.message)
    return NextResponse.json({ ok: false, error: "Erreur mise à jour avenant" }, { status: 500 })
  }

  // === 9. Sauvegarder l'email ===
  if (saveEmailToProfile && empStatus.email !== recipientEmail) {
    var ok = await updateEmployeeContactInfo({
      employeeId: employeeId,
      email: recipientEmail,
    })
    if (!ok) {
      console.warn("[send-signature/amendment] Échec sauvegarde email sur profil")
    }
  }

  // === 10. Email content ===
  var docLabel = getAmendmentTypeLabel(amendment.amendment_type || "")
  var siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meshuga-manager.vercel.app"
  var signatureUrl = siteUrl.replace(/\/+$/, "") + "/sign/" + token

  var emailContent = buildSignatureRequestEmail({
    recipientFirstName: empStatus.prenom,
    recipientLastName: empStatus.nom,
    recipientCivilite: empStatus.civilite,
    documentTypeLabel: docLabel,
    signatureUrl: signatureUrl,
    includeWelcomePack: finalIncludeWelcomePack,
    senderName: "Edward Touret",
    expiresInDays: 30,
  })

  // === 11. Envoyer ===
  var sendResult = await sendBrevoEmail({
    to: [{ email: recipientEmail, name: empStatus.prenom + " " + empStatus.nom }],
    bcc: [{ email: "edward@meshuga.fr", name: "Edward Touret" }],  // 🔥 Copie cachée pour vérification + archivage
    subject: emailContent.subject,
    htmlContent: emailContent.htmlContent,
    textContent: emailContent.textContent,
    replyTo: { email: "edward@meshuga.fr", name: "Edward Touret" },
    tags: ["signature-request", "amendment"],
  })

  if (!sendResult.ok) {
    console.error("[send-signature/amendment] Brevo error:", sendResult.error)
    return NextResponse.json(
      {
        ok: false,
        error: "Email non envoyé : " + sendResult.error,
        token: token,
        signatureUrl: signatureUrl,
        partialSuccess: true,
      },
      { status: 500 }
    )
  }

  // === 12. Succès ===
  return NextResponse.json(
    {
      ok: true,
      token: token,
      signatureUrl: signatureUrl,
      includeWelcomePack: finalIncludeWelcomePack,
      messageId: sendResult.messageId,
      testMode: sendResult.testMode === true,
    },
    { status: 200 }
  )
}
