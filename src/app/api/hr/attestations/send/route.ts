// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/attestations/send/route.ts
// ============================================================
// Envoi du Guide d'hygiène pour signature électronique à un salarié.
// Crée une ligne hr_attestations (token + statut "sent"), envoie le lien
// par email (Brevo) et, si numéro dispo, par SMS (Twilio).
// Réutilise exactement le même moteur que les avenants/contrats.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { sendBrevoEmail, buildSignatureRequestEmail } from "@/lib/brevo"
import { sendTwilioSms, normalizePhoneFR, buildSignatureSmsBody } from "@/lib/twilio"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

var DOC_LABEL = "Guide des bonnes pratiques d'hygiène"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function appUrl() {
  var u =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://meshuga-manager.vercel.app"
  return u.replace(/\/+$/, "")
}

export async function POST(req: Request) {
  try {
    var sb = getServerClient()
    if (!sb) {
      return NextResponse.json({ ok: false, error: "Configuration Supabase manquante" }, { status: 500 })
    }

    var body: any = await req.json().catch(function () { return {} })
    var employeeId = String(body.employeeId || "").trim()
    if (!employeeId) {
      return NextResponse.json({ ok: false, error: "employeeId manquant" }, { status: 400 })
    }
    var version = String(body.version || "v5").trim()
    var preparedBy = String(body.preparedByEmail || "").trim()

    var empRes = await sb
      .from("hr_employees")
      .select("id, civilite, prenom, nom, email, telephone")
      .eq("id", employeeId)
      .single()
    if (empRes.error || !empRes.data) {
      return NextResponse.json({ ok: false, error: "Salarié introuvable" }, { status: 404 })
    }
    var emp: any = empRes.data

    var recipientEmail = String(body.recipientEmail || emp.email || "").trim()
    if (!recipientEmail || !recipientEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json({ ok: false, error: "Email du salarié manquant ou invalide" }, { status: 400 })
    }
    var recipientPhoneRaw = String(body.recipientPhone || emp.telephone || "").trim()
    var recipientPhone = normalizePhoneFR(recipientPhoneRaw)

    var token = randomUUID().replace(/-/g, "")
    var nowIso = new Date().toISOString()

    var ins = await sb
      .from("hr_attestations")
      .insert({
        employee_id: employeeId,
        doc_type: "attestation_hygiene",
        doc_version: version,
        doc_label: DOC_LABEL,
        status: "sent",
        created_by: preparedBy || "edward@meshuga.fr",
        signature_token: token,
        signature_status: "sent",
        signature_sent_at: nowIso,
        signature_recipient_email: recipientEmail,
        signature_recipient_phone: recipientPhone || recipientPhoneRaw || null,
      })
      .select("id")
      .single()
    if (ins.error || !ins.data) {
      return NextResponse.json({ ok: false, error: "Création impossible : " + (ins.error ? ins.error.message : "inconnue") }, { status: 500 })
    }

    var signatureUrl = appUrl() + "/sign-attestation/" + token

    // === Email Brevo (même template que les avenants) ===
    var emailOk = false
    try {
      var emailContent = buildSignatureRequestEmail({
        recipientFirstName: emp.prenom || "",
        recipientLastName: emp.nom || "",
        recipientCivilite: emp.civilite || null,
        documentTypeLabel: DOC_LABEL,
        signatureUrl: signatureUrl,
        includeWelcomePack: false,
        senderName: "Edward Touret",
        expiresInDays: 30,
      })
      var emailRes = await sendBrevoEmail({
        to: [{ email: recipientEmail, name: ((emp.prenom || "") + " " + (emp.nom || "")).trim() }],
        bcc: [{ email: "edward@meshuga.fr", name: "Edward Touret" }],
        subject: emailContent.subject,
        htmlContent: emailContent.htmlContent,
        textContent: emailContent.textContent,
        replyTo: { email: "edward@meshuga.fr", name: "Edward Touret" },
        tags: ["signature-request", "attestation-hygiene"],
      })
      emailOk = !!(emailRes && emailRes.ok)
    } catch (eMail) {
      console.error("[attestations/send] email:", (eMail && (eMail as any).message) || eMail)
    }

    // === SMS optionnel (Twilio) ===
    var smsOk: boolean | null = null
    if (recipientPhone) {
      try {
        var smsBody = buildSignatureSmsBody({ prenom: emp.prenom || "", signatureUrl: signatureUrl })
        var smsRes = await sendTwilioSms({ to: recipientPhone, body: smsBody })
        smsOk = !!(smsRes && smsRes.ok)
      } catch (eSms) {
        console.error("[attestations/send] sms:", (eSms && (eSms as any).message) || eSms)
      }
    }

    return NextResponse.json({
      ok: true,
      attestationId: ins.data.id,
      signatureUrl: signatureUrl,
      email: emailOk,
      sms: smsOk,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e && (e as any).message) || "Erreur serveur" }, { status: 500 })
  }
}
