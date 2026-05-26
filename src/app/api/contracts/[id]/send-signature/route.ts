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
// v3 (26/05/2026) — Sprint C3 : workflow validation employer
//   - Si l'utilisateur connecté n'est PAS edward@meshuga.fr (typiquement
//     emy@meshuga.fr), l'envoi au salarié N'EST PAS déclenché.
//   - À la place, on sauvegarde le payload en "pending" et on envoie
//     un email à Edward avec un lien de validation. Une fois validé,
//     l'envoi au salarié est déclenché par /api/amendments/[id]/employer-approve.
//
// Sprint Y1 — Phase C — Sprint C2A / C3
// ============================================================

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@supabase/supabase-js"
import { createServerClient } from "@supabase/ssr"
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

// === Client Supabase service role (bypasse RLS pour writes) ===
function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// === Lecture user connecté via cookies Supabase SSR ===
async function getCurrentUserEmail(): Promise<string | null> {
  try {
    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    if (!url || !anon) return null

    var cookieStore = cookies()
    var supa = createServerClient(url, anon, {
      cookies: {
        get: function (name: string) {
          var c = cookieStore.get(name)
          return c ? c.value : undefined
        },
        set: function () { /* no-op for API routes */ },
        remove: function () { /* no-op */ },
      },
    })
    var resUser = await supa.auth.getUser()
    if (resUser.error) return null
    var email = resUser.data && resUser.data.user ? resUser.data.user.email : null
    return email ? email.toLowerCase() : null
  } catch (e) {
    return null
  }
}

// === Display name à partir d'un email Meshuga ===
function displayNameFromEmail(email: string): string {
  var e = (email || "").toLowerCase().trim()
  if (e === "edward@meshuga.fr") return "Edward Touret"
  if (e === "emy@meshuga.fr") return "Emy Soulabaille"
  // Fallback : prend la partie locale, capitalize
  var local = e.split("@")[0] || e
  return local.charAt(0).toUpperCase() + local.slice(1)
}

// === Helper : libellé du type de contrat ===
function getContractTypeLabel(type: string, statutCadre: string, isFemale: boolean): string {
  var t = (type || "").toLowerCase()
  if (t === "extra") return "Contrat de travail (CDD d'usage)"
  if (t === "cdi_cadre") {
    return statutCadre === "cadre" ? "Contrat de travail CDI Cadre" : "Contrat de travail CDI Agent de maîtrise"
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

  // === 7. Détecter qui est en train d'envoyer ===
  var currentUserEmail = await getCurrentUserEmail()
  var isEmployerSigner = !currentUserEmail || currentUserEmail === EMPLOYER_EMAIL
  // Si pas d'user authentifié (dev local, scripts), on fallback "comme si Edward"
  // (backward compat). En prod le dashboard nécessite auth donc l'user sera là.

  // ============================================================
  // BRANCHE A : envoi préparé par un user AUTRE qu'Edward
  // → on n'envoie PAS au salarié, on demande validation à Edward
  // ============================================================
  if (!isEmployerSigner) {
    var validationToken = randomUUID().replace(/-/g, "")
    var nowIso = new Date().toISOString()
    var expiresIso = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()

    var pendingPayload: any = {
      prepared_by_email: currentUserEmail,
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
      .from("hr_contracts")
      .update(pendingPayload)
      .eq("id", contractId)

    if (resPending.error) {
      console.error("[send-signature/contract] Pending save error:", resPending.error.message)
      return NextResponse.json({ ok: false, error: "Erreur sauvegarde validation" }, { status: 500 })
    }

    // Construit URL de validation pour Edward
    var siteUrlA = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://meshuga-manager.vercel.app"
    var validationUrl = siteUrlA.replace(/\/+$/, "") +
      "/employer-validate?type=contract&id=" + contractId + "&token=" + validationToken

    // Envoie email à Edward
    var isFemaleA = (empStatus.civilite || "").toLowerCase() === "mme" || (empStatus.civilite || "").toLowerCase() === "madame"
    var docLabelA = getContractTypeLabel(contract.type || "", contract.statut_cadre || "", isFemaleA)
    var validationEmail = buildEmployerValidationEmail({
      preparedByEmail: currentUserEmail || "?",
      preparedByDisplayName: displayNameFromEmail(currentUserEmail || ""),
      recipientFirstName: empStatus.prenom,
      recipientLastName: empStatus.nom,
      recipientCivilite: empStatus.civilite,
      documentTypeLabel: docLabelA,
      documentKind: "contract",
      includeWelcomePack: finalIncludeWelcomePack,
      signatureRecipientEmail: hasEmail ? recipientEmail : null,
      signatureRecipientPhone: normalizedPhone || null,
      validationUrl: validationUrl,
    })

    var emailResultA = await sendBrevoEmail({
      to: [{ email: EMPLOYER_EMAIL, name: "Edward Touret" }],
      subject: validationEmail.subject,
      htmlContent: validationEmail.htmlContent,
      textContent: validationEmail.textContent,
      replyTo: { email: currentUserEmail || EMPLOYER_EMAIL, name: displayNameFromEmail(currentUserEmail || "") },
      tags: ["employer-validation", "contract"],
    })

    if (!emailResultA.ok) {
      console.error("[send-signature/contract] Validation email failed:", emailResultA.error)
      // On garde quand même la sauvegarde DB → Edward pourra valider via le dashboard
      return NextResponse.json(
        {
          ok: true,
          awaiting_employer_validation: true,
          email_to_employer_sent: false,
          email_error: emailResultA.error,
          validation_token: validationToken,
          message: "Préparation enregistrée. L'email à Edward n'a pas pu partir, mais il peut valider via le dashboard.",
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        awaiting_employer_validation: true,
        email_to_employer_sent: true,
        validation_token: validationToken,
        message: "Contrat préparé. Edward a reçu un email pour valider et déclencher l'envoi au salarié.",
      },
      { status: 200 }
    )
  }

  // ============================================================
  // BRANCHE B : envoi direct (user = Edward ou pas d'auth)
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
    // Si Edward valide directement, on marque aussi employer_validated_at
    employer_validated_at: new Date().toISOString(),
    employer_validated_by_email: EMPLOYER_EMAIL,
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

  // === 11. Préparer URL signature ===
  var isFemale = (empStatus.civilite || "").toLowerCase() === "mme" || (empStatus.civilite || "").toLowerCase() === "madame"
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
