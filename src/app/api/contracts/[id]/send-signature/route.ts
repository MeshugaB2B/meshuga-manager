// ============================================================
// /api/contracts/[id]/send-signature/route.ts
// ============================================================
// POST endpoint pour envoyer un contrat de travail pour signature
// électronique au salarié.
//
// v2 (24/05/2026) : envoi email + SMS en parallèle.
//   - Email envoyé via Brevo si l'email destinataire est fourni
//   - SMS envoyé via Twilio si le téléphone destinataire est fourni
//   - Au moins un des deux doit être fourni
//   - Téléphone sauvegardé sur le profil UNIQUEMENT si vide en DB
//
// Body attendu :
//   {
//     recipientEmail: string,             // optionnel si recipientPhone fourni
//     recipientPhone: string,             // optionnel si recipientEmail fourni
//     includeWelcomePack: boolean,        // bundle dossier de bienvenue ? (req)
//     saveEmailToProfile: boolean,        // sauvegarder l'email sur hr_employees ?
//   }
//
// Sécurité : route protégée par next-auth ou similaire (TODO middleware)
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

// === Helper : crée un client Supabase server-side ===
function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// === Helper : libellé du type de contrat ===
function getContractTypeLabel(type: string, statutCadre: string, isFemale: boolean): string {
  var t = (type || "").toLowerCase()
  if (t === "extra") return "Contrat de travail (CDD d'usage)"
  if (t === "cdi_cadre") {
    return statutCadre === "cadre"
      ? "Contrat de travail CDI Cadre"
      : "Contrat de travail CDI Agent de maîtrise"
  }
  if (t === "cdi_cuisinier") {
    return isFemale ? "Contrat de travail CDI Cuisinière" : "Contrat de travail CDI Cuisinier"
  }
  if (t === "cdi_caissier") {
    return isFemale ? "Contrat de travail CDI Caissière" : "Contrat de travail CDI Caissier"
  }
  return "Contrat de travail"
}

// ============================================================
// POST handler
// ============================================================
export async function POST(
  req: Request,
  ctx: { params: { id: string } }
) {
  var contractId = ctx.params.id
  if (!contractId) {
    return NextResponse.json({ ok: false, error: "ID contrat manquant" }, { status: 400 })
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

  // === 3. Récupérer le contrat ===
  var resContract = await supabase
    .from("hr_contracts")
    .select("id, employee_id, type, statut_cadre, signature_status, signature_token, cycle_id")
    .eq("id", contractId)
    .maybeSingle()

  if (resContract.error) {
    console.error("[send-signature/contract] DB error:", resContract.error.message)
    return NextResponse.json({ ok: false, error: "Erreur base de données" }, { status: 500 })
  }
  if (!resContract.data) {
    return NextResponse.json({ ok: false, error: "Contrat introuvable" }, { status: 404 })
  }

  var contract: any = resContract.data
  if (contract.signature_status === "signed") {
    return NextResponse.json({ ok: false, error: "Ce contrat est déjà signé" }, { status: 409 })
  }

  // === 4. Résoudre employee_id (direct OU via cycle_id) ===
  var employeeId: string | null = contract.employee_id || null
  if (!employeeId && contract.cycle_id) {
    var resCyc = await supabase
      .from("hr_employment_cycles")
      .select("employee_id")
      .eq("id", contract.cycle_id)
      .maybeSingle()
    employeeId = (resCyc.data && resCyc.data.employee_id) || null
  }
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "Salarié introuvable pour ce contrat" }, { status: 404 })
  }

  // === 5. Récupérer le statut welcome_pack du salarié ===
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

  // === 8. Channel pour la DB ===
  var signatureChannel = "email"
  if (hasEmail && hasPhone) signatureChannel = "email+sms"
  else if (hasPhone && !hasEmail) signatureChannel = "sms"

  // === 9. UPDATE hr_contracts ===
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
    .from("hr_contracts")
    .update(updatePayload)
    .eq("id", contractId)
  if (resUpdate.error) {
    console.error("[send-signature/contract] Update error:", resUpdate.error.message)
    return NextResponse.json({ ok: false, error: "Erreur mise à jour contrat" }, { status: 500 })
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
      console.warn("[send-signature/contract] Échec sauvegarde contact info sur profil")
    }
  }

  // === 11. Préparer URL signature + label doc ===
  var civ = (empStatus.civilite || "").toLowerCase().trim()
  var isFemale = civ === "mme" || civ === "madame" || civ === "mlle" || civ === "mademoiselle"
  var docLabel = getContractTypeLabel(contract.type || "", contract.statut_cadre || "", isFemale)

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
      tags: ["signature-request", "contract"],
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

  // === 13. Évaluation succès global (au moins un canal a abouti) ===
  var emailOk = !hasEmail || (emailResult && emailResult.ok)
  var smsOk = !hasPhone || (smsResult && smsResult.ok)
  var anyChannelSucceeded = (hasEmail && emailResult && emailResult.ok) ||
                            (hasPhone && smsResult && smsResult.ok)

  if (!anyChannelSucceeded) {
    var emailErr = emailResult ? emailResult.error : "non envoyé"
    var smsErr = smsResult ? smsResult.error : "non envoyé"
    console.error("[send-signature/contract] Tous les canaux ont échoué:", emailErr, "|", smsErr)
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
