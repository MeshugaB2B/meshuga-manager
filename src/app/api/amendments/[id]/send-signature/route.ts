// ============================================================
// FILE PATH dans le repo :
//   src/app/api/amendments/[id]/send-signature/route.ts
// ============================================================
// v4 (26/05/2026) — Sprint C3 fix auth :
//   Plus de getCurrentUserEmail (cookies SSR cassé car app localStorage).
//   À la place : le frontend envoie preparedByEmail dans le body.
//   Branche A (Emy prépare) : envoie à Edward email + SMS (EDWARD_NOTIFICATION_PHONE).
//   Branche B (Edward envoie directement) : envoie au salarié immédiatement.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import {
  getEmployeeWelcomePackStatus,
  updateEmployeeContactInfo,
} from "@/app/dashboard/rh/employeeWelcomePack"
import {
  sendBrevoEmail,
  buildSignatureRequestEmail,
  buildEmployerValidationEmail,
} from "@/lib/brevo"
import { sendTwilioSms, normalizePhoneFR, buildSignatureSmsBody } from "@/lib/twilio"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// === Compte employer signataire ===
var EMPLOYER_EMAIL = "edward@meshuga.fr"
var EMPLOYER_PHONE_FALLBACK = "+33658585801"

// === Client Supabase service role (bypasse RLS pour writes) ===
function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// === Display name à partir d'un email Meshuga ===
function displayNameFromEmail(email: string): string {
  var e = (email || "").toLowerCase().trim()
  if (e === "edward@meshuga.fr") return "Edward Touret"
  if (e === "emy@meshuga.fr") return "Emy Soulabaille"
  var local = e.split("@")[0] || e
  return local.charAt(0).toUpperCase() + local.slice(1)
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

// === Helper : SMS body pour Edward (validation employer) ===
function buildEmployerValidationSmsBody(prepBy: string, empName: string, docLabel: string, validationUrl: string): string {
  var who = displayNameFromEmail(prepBy)
  var docShort = docLabel.length > 30 ? docLabel.substring(0, 27) + "..." : docLabel
  return "Meshuga: " + who + " a prepare " + docShort + " pour " + empName + ". Valide ici: " + validationUrl
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
  var preparedByEmail = (body && typeof body.preparedByEmail === "string" ? body.preparedByEmail : "").trim().toLowerCase()

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

  // === 7. Détecter qui est en train d'envoyer (via param body, plus de cookies SSR) ===
  var isEmployerSigner = !preparedByEmail || preparedByEmail === EMPLOYER_EMAIL

  // ============================================================
  // BRANCHE A : envoi préparé par un user AUTRE qu'Edward
  // → on n'envoie PAS au salarié, on demande validation à Edward (email + SMS)
  // ============================================================
  if (!isEmployerSigner) {
    var validationToken = randomUUID().replace(/-/g, "")
    var nowIso = new Date().toISOString()
    var expiresIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

    var pendingPayload: any = {
      prepared_by_email: preparedByEmail,
      prepared_at: nowIso,
      employer_validation_token: validationToken,
      employer_validation_token_expires_at: expiresIso,
      employer_validated_at: null,
      employer_validated_by_email: null,
      employer_pending_recipient_email: hasEmail ? recipientEmail : null,
      employer_pending_recipient_phone: normalizedPhone || null,
      employer_pending_include_welcome_pack: finalIncludeWelcomePack,
      employer_pending_save_email_to_profile: saveEmailToProfile === true,
    }

    var resPending = await supabase
      .from("hr_contract_amendments")
      .update(pendingPayload)
      .eq("id", amendmentId)

    if (resPending.error) {
      console.error("[send-signature/amendment] Pending save error:", resPending.error.message)
      return NextResponse.json({ ok: false, error: "Erreur sauvegarde validation" }, { status: 500 })
    }

    // Construit URL de validation pour Edward
    var siteUrlA = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://meshuga-manager.vercel.app"
    var validationUrl = siteUrlA.replace(/\/+$/, "") +
      "/employer-validate?type=amendment&id=" + amendmentId + "&token=" + validationToken

    // Préparation contenus
    var docLabelA = getAmendmentTypeLabel(amendment.amendment_type || "")
    var empFullName = (empStatus.prenom || "") + " " + (empStatus.nom || "")

    // Email à Edward
    var validationEmail = buildEmployerValidationEmail({
      preparedByEmail: preparedByEmail,
      preparedByDisplayName: displayNameFromEmail(preparedByEmail),
      recipientFirstName: empStatus.prenom,
      recipientLastName: empStatus.nom,
      recipientCivilite: empStatus.civilite,
      documentTypeLabel: docLabelA,
      documentKind: "amendment",
      includeWelcomePack: finalIncludeWelcomePack,
      signatureRecipientEmail: hasEmail ? recipientEmail : null,
      signatureRecipientPhone: normalizedPhone || null,
      validationUrl: validationUrl,
    })

    var emailToEdwardPromise = sendBrevoEmail({
      to: [{ email: EMPLOYER_EMAIL, name: "Edward Touret" }],
      subject: validationEmail.subject,
      htmlContent: validationEmail.htmlContent,
      textContent: validationEmail.textContent,
      replyTo: { email: preparedByEmail, name: displayNameFromEmail(preparedByEmail) },
      tags: ["employer-validation", "amendment"],
    })

    // SMS à Edward (en parallèle)
    var edwardPhone = process.env.EDWARD_NOTIFICATION_PHONE || EMPLOYER_PHONE_FALLBACK
    var smsToEdwardBody = buildEmployerValidationSmsBody(
      preparedByEmail,
      empFullName.trim(),
      docLabelA,
      validationUrl
    )
    var smsToEdwardPromise = sendTwilioSms({
      to: edwardPhone,
      body: smsToEdwardBody,
    })

    var resultsToEdward = await Promise.allSettled([emailToEdwardPromise, smsToEdwardPromise])
    var emailToEdwardResult: any = resultsToEdward[0].status === "fulfilled" ? resultsToEdward[0].value : { ok: false, error: "Exception" }
    var smsToEdwardResult: any = resultsToEdward[1].status === "fulfilled" ? resultsToEdward[1].value : { ok: false, error: "Exception" }

    var emailOk = emailToEdwardResult && emailToEdwardResult.ok
    var smsOk = smsToEdwardResult && smsToEdwardResult.ok

    if (!emailOk && !smsOk) {
      console.error("[send-signature/amendment] Tous les canaux validation Edward échoués:",
        emailToEdwardResult ? emailToEdwardResult.error : "?",
        "|",
        smsToEdwardResult ? smsToEdwardResult.error : "?"
      )
      return NextResponse.json(
        {
          ok: true,
          awaiting_employer_validation: true,
          email_to_employer_sent: false,
          sms_to_employer_sent: false,
          email_error: emailToEdwardResult ? emailToEdwardResult.error : null,
          sms_error: smsToEdwardResult ? smsToEdwardResult.error : null,
          validation_token: validationToken,
          validation_url: validationUrl,
          message: "Préparation enregistrée. Email + SMS à Edward ont échoué, mais il peut valider via le dashboard ou le lien direct.",
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        awaiting_employer_validation: true,
        email_to_employer_sent: !!emailOk,
        sms_to_employer_sent: !!smsOk,
        validation_token: validationToken,
        validation_url: validationUrl,
        message: "Avenant préparé. Edward a reçu " + (emailOk && smsOk ? "un email et un SMS" : emailOk ? "un email" : "un SMS") + " pour valider et déclencher l'envoi au salarié.",
      },
      { status: 200 }
    )
  }

  // ============================================================
  // BRANCHE B : envoi direct (preparedByEmail = Edward ou vide)
  // → comportement historique : on envoie au salarié immédiatement
  // ============================================================

  // === 7b. Token signature salarié ===
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
    signature_recipient_phone: normalizedPhone || null,
    signature_includes_welcome_pack: finalIncludeWelcomePack,
    signature_viewed_at: null,
    signature_signed_at: null,
    signature_audit_data: null,
    signature_pdf_hash: null,
    employer_validated_at: new Date().toISOString(),
    employer_validated_by_email: EMPLOYER_EMAIL,
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

  // === 12. Envoi parallèle email + SMS au salarié ===
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

  var emailOkB = !hasEmail || (emailResult && emailResult.ok)
  var smsOkB = !hasPhone || (smsResult && smsResult.ok)
  var anyChannelSucceeded = (hasEmail && emailResult && emailResult.ok) ||
                            (hasPhone && smsResult && smsResult.ok)

  if (!anyChannelSucceeded) {
    var emailErr = emailResult ? emailResult.error : "non envoyé"
    var smsErr = smsResult ? smsResult.error : "non envoyé"
    console.error("[send-signature/amendment] Tous les canaux salarié ont échoué:", emailErr, "|", smsErr)
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
      partialSuccess: !(emailOkB && smsOkB),
    },
    { status: 200 }
  )
}
