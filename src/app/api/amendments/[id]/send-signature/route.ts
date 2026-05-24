// ============================================================
// /api/amendments/[id]/send-signature/route.ts
// ============================================================
// POST endpoint pour envoyer un avenant pour signature
// électronique au salarié.
//
// v2 (24/05/2026) : envoi email + SMS en parallèle.
//   - Email envoyé via Brevo si l'email destinataire est fourni
//   - SMS envoyé via Twilio si le téléphone destinataire est fourni
//   - Au moins un des deux doit être fourni
//   - Téléphone sauvegardé sur le profil UNIQUEMENT si vide en DB
//
// Sprint Y1 — Phase C — Sprint C2A
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import {
  getEmployeeWelcomePackStatus,
  updateEmployeeContactInfo,
} from "@/app/dashboard/rh/employeeWelcomePack"
import { sendBrevoEmail, buildSignatureRequestEmail } from "@/lib/brevo"
import { sendTwilioSms, normalizePhoneFR, buildSignatureSmsBody } from "@/lib/twilio"

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
  var recipientPhone = (body && typeof body.recipientPhone === "string" ? body.recipientPhone : "").trim()
  var includeWelcomePack = body && body.includeWelcomePack === true
  var saveEmailToProfile = body && body.saveEmailToProfile === true

  // === Validation : au moins email OU téléphone ===
  var hasEmail = recipientEmail.length > 0
  var hasPhone = recipientPhone.length > 0

  if (!hasEmail && !hasPhone) {
    return NextResponse.json(
      { ok: false, error: "Email ou téléphone destinataire requis" },
      { status: 400 }
    )
  }

  if (hasEmail && !recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return NextResponse.json({ ok: false, error: "Email destinataire invalide" }, { status: 400 })
  }

  // Normaliser le téléphone (E.164 +33...)
  var normalizedPhone: string | null = null
  if (hasPhone) {
    normalizedPhone = normalizePhoneFR(recipientPhone)
    if (!normalizedPhone) {
      return NextResponse.json(
        { ok: false, error: "Téléphone destinataire invalide (format français attendu)" },
        { status: 400 }
      )
    }
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

  // === 5. Statut welcome_pack + infos contact actuelles ===
  var empStatus = await getEmployeeWelcomePackStatus(employeeId)
  if (!empStatus) {
    return NextResponse.json({ ok: false, error: "Statut salarié introuvable" }, { status: 404 })
  }

  // === 6. Logique bundle ===
  var finalIncludeWelcomePack = includeWelcomePack
  if (empStatus.welcome_pack_signed) {
    finalIncludeWelcomePack = false
  }

  // === 7. Token signature ===
  var token = randomUUID().replace(/-/g, "")

  // === 8. Détermine le channel pour la DB ===
  var signatureChannel = "email"
  if (hasEmail && hasPhone) signatureChannel = "email+sms"
  else if (hasPhone && !hasEmail) signatureChannel = "sms"

  // === 9. UPDATE hr_contract_amendments ===
  var updatePayload: any = {
    signature_token: token,
    signature_status: "sent",
    signature_sent_at: new Date().toISOString(),
    signature_channel: signatureChannel,
    signature_recipient_email: hasEmail ? recipientEmail : null,
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

  // === 10. Sauvegarder email (case à cocher) et téléphone (auto si vide) sur le profil ===
  var contactUpdate: any = {}
  if (hasEmail && saveEmailToProfile && empStatus.email !== recipientEmail) {
    contactUpdate.email = recipientEmail
  }
  // Téléphone : sauvegarder UNIQUEMENT si vide en DB (politique Edward)
  if (hasPhone && normalizedPhone && (!empStatus.telephone || empStatus.telephone.trim() === "")) {
    contactUpdate.telephone = normalizedPhone
  }
  if (contactUpdate.email || contactUpdate.telephone) {
    var ok = await updateEmployeeContactInfo({
      employeeId: employeeId,
      email: contactUpdate.email,
      telephone: contactUpdate.telephone,
    })
    if (!ok) {
      console.warn("[send-signature/amendment] Échec sauvegarde contact info sur profil")
    }
  }

  // === 11. Préparer URL signature ===
  var docLabel = getAmendmentTypeLabel(amendment.amendment_type || "")
  var siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meshuga-manager.vercel.app"
  var signatureUrl = siteUrl.replace(/\/+$/, "") + "/sign/" + token

  // === 12. Envoi parallèle email + SMS ===
  var emailPromise: Promise<any> = Promise.resolve(null)
  var smsPromise: Promise<any> = Promise.resolve(null)

  if (hasEmail) {
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
    emailPromise = sendBrevoEmail({
      to: [{ email: recipientEmail, name: empStatus.prenom + " " + empStatus.nom }],
      bcc: [{ email: "edward@meshuga.fr", name: "Edward Touret" }],
      subject: emailContent.subject,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
      replyTo: { email: "edward@meshuga.fr", name: "Edward Touret" },
      tags: ["signature-request", "amendment"],
    })
  }

  if (hasPhone && normalizedPhone) {
    var smsBody = buildSignatureSmsBody({
      prenom: empStatus.prenom || "",
      signatureUrl: signatureUrl,
    })
    smsPromise = sendTwilioSms({
      to: normalizedPhone,
      body: smsBody,
    })
  }

  var results = await Promise.allSettled([emailPromise, smsPromise])
  var emailResult: any = results[0].status === "fulfilled" ? results[0].value : { ok: false, error: "Exception" }
  var smsResult: any = results[1].status === "fulfilled" ? results[1].value : { ok: false, error: "Exception" }

  // === 13. Évaluation succès global ===
  // On considère que c'est OK si au moins UN des deux canaux a réussi
  // (ou si le canal demandé est null = pas demandé)
  var emailOk = !hasEmail || (emailResult && emailResult.ok)
  var smsOk = !hasPhone || (smsResult && smsResult.ok)
  var anyChannelSucceeded = (hasEmail && emailResult && emailResult.ok) ||
                            (hasPhone && smsResult && smsResult.ok)

  if (!anyChannelSucceeded) {
    var emailErr = emailResult ? emailResult.error : "non envoyé"
    var smsErr = smsResult ? smsResult.error : "non envoyé"
    console.error("[send-signature/amendment] Tous les canaux ont échoué:", emailErr, "|", smsErr)
    return NextResponse.json(
      {
        ok: false,
        error: "Aucun canal n'a abouti. Email: " + emailErr + " | SMS: " + smsErr,
        token: token,
        signatureUrl: signatureUrl,
        channels: {
          email: hasEmail ? { ok: false, error: emailErr } : null,
          sms: hasPhone ? { ok: false, error: smsErr } : null,
        },
      },
      { status: 500 }
    )
  }

  // === 14. Succès (au moins un canal a abouti) ===
  return NextResponse.json(
    {
      ok: true,
      token: token,
      signatureUrl: signatureUrl,
      includeWelcomePack: finalIncludeWelcomePack,
      channels: {
        email: hasEmail
          ? { ok: !!emailResult.ok, messageId: emailResult.messageId, error: emailResult.ok ? null : emailResult.error }
          : null,
        sms: hasPhone
          ? { ok: !!smsResult.ok, sid: smsResult.sid, error: smsResult.ok ? null : smsResult.error, testMode: smsResult.testMode }
          : null,
      },
      partialSuccess: !(emailOk && smsOk),
    },
    { status: 200 }
  )
}
