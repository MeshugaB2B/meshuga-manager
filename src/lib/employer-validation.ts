// =====================================================================
// FILE PATH: src/lib/employer-validation.ts
// SPRINT C3 — Vague 2 — Helper factorisé pour approve contract/amendment
//
// HYPOTHÈSES À VÉRIFIER :
//  - signatures helpers brevo/twilio (voir imports en haut)
//  - colonnes signature_* dans hr_contracts / hr_contract_amendments :
//      signature_status, signature_token, signature_sent_at,
//      signature_channel, signature_recipient_email,
//      signature_recipient_phone, signature_includes_welcome_pack
//  - getEmployeeWelcomePackStatus existe (commenté ici, non utilisé en V1
//    car le brief dit que c'est l'envoi salarié qui compte)
// =====================================================================

import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import {
  sendBrevoEmail,
  buildSignatureRequestEmail,
} from "@/lib/brevo"
import {
  sendTwilioSms,
  normalizePhoneFR,
  buildSignatureSmsBody,
} from "@/lib/twilio"

export type ApproveKind = "contract" | "amendment"

export interface ApproveInput {
  kind: ApproveKind
  id: string
  token: string
  approverEmail: string
}

export interface ApproveResult {
  ok: boolean
  error?: string
  signatureUrl?: string
  channels?: { email?: string; sms?: string }
  employee?: { prenom: string; nom: string }
}

export interface RejectInput {
  kind: ApproveKind
  id: string
  token: string
  reason?: string
}

export interface RejectResult {
  ok: boolean
  error?: string
  notifiedEmail?: string
}

function adminClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  return createClient(url, key)
}

function siteBase() {
  var s = process.env.NEXT_PUBLIC_SITE_URL || ""
  if (!s) s = "https://meshuga-manager.vercel.app"
  return s
}

// ---------- APPROVE ----------
export async function executeEmployerApprove(input: ApproveInput): Promise<ApproveResult> {
  var kind = input.kind
  var id = input.id
  var token = input.token
  var approverEmail = input.approverEmail

  var admin = adminClient()
  var table = kind === "contract" ? "hr_contracts" : "hr_contract_amendments"

  var fetchCols = [
    "id",
    "employee_id",
    "cycle_id",
    "prepared_by_email",
    "employer_validation_token",
    "employer_validation_token_expires_at",
    "employer_validated_at",
    "employer_pending_recipient_email",
    "employer_pending_recipient_phone",
    "employer_pending_include_welcome_pack",
    "employer_pending_save_email_to_profile",
  ].join(",")

  var row: any = await admin.from(table).select(fetchCols).eq("id", id).maybeSingle()
  if (row.error || !row.data) {
    return { ok: false, error: "not_found" }
  }
  var r = row.data

  if (r.employer_validated_at) {
    return { ok: false, error: "already_validated" }
  }
  if (!r.employer_validation_token || r.employer_validation_token !== token) {
    return { ok: false, error: "invalid_token" }
  }
  var now = new Date()
  var exp = r.employer_validation_token_expires_at
    ? new Date(r.employer_validation_token_expires_at)
    : null
  if (exp && exp.getTime() < now.getTime()) {
    return { ok: false, error: "expired" }
  }

  // Resolve employee
  var employeeId: string | null = r.employee_id
  if (!employeeId && r.cycle_id) {
    var cycle: any = await admin
      .from("hr_employee_cycles")
      .select("employee_id")
      .eq("id", r.cycle_id)
      .maybeSingle()
    if (cycle.data && cycle.data.employee_id) employeeId = cycle.data.employee_id
  }

  var empData: any = null
  if (employeeId) {
    var e: any = await admin
      .from("hr_employees")
      .select("id,prenom,nom,email,telephone")
      .eq("id", employeeId)
      .maybeSingle()
    if (e.data) empData = e.data
  }

  // Generate signature token
  var signatureToken = randomUUID().replace(/-/g, "")
  var signatureUrl = siteBase() + "/sign/" + signatureToken

  var recipientEmail: string | null =
    r.employer_pending_recipient_email || (empData && empData.email) || null
  var recipientPhoneRaw: string | null =
    r.employer_pending_recipient_phone || (empData && empData.telephone) || null
  var recipientPhone: string | null = recipientPhoneRaw ? normalizePhoneFR(recipientPhoneRaw) : null
  var includeWelcomePack = !!r.employer_pending_include_welcome_pack

  // Build signature_channel string
  var channelStr = ""
  if (recipientEmail && recipientPhone) channelStr = "email+sms"
  else if (recipientEmail) channelStr = "email"
  else if (recipientPhone) channelStr = "sms"

  var nowIso = new Date().toISOString()

  var updatePayload: any = {
    employer_validated_at: nowIso,
    employer_validated_by_email: approverEmail,
    employer_pending_recipient_email: null,
    employer_pending_recipient_phone: null,
    employer_pending_include_welcome_pack: null,
    employer_pending_save_email_to_profile: null,
    signature_status: "sent",
    signature_token: signatureToken,
    signature_sent_at: nowIso,
    signature_channel: channelStr,
    signature_recipient_email: recipientEmail,
    signature_recipient_phone: recipientPhone,
    signature_includes_welcome_pack: includeWelcomePack,
  }

  var up: any = await admin.from(table).update(updatePayload).eq("id", id)
  if (up.error) {
    return { ok: false, error: "db_update_failed: " + up.error.message }
  }

  // Save email to employee profile if requested
  if (r.employer_pending_save_email_to_profile && employeeId && recipientEmail) {
    await admin.from("hr_employees").update({ email: recipientEmail }).eq("id", employeeId)
  }

  // Send Brevo email to employee
  var channels: { email?: string; sms?: string } = {}
  var prenom = empData ? (empData.prenom || "") : ""
  var nom = empData ? (empData.nom || "") : ""

  if (recipientEmail) {
    try {
      var emailPayload: any = buildSignatureRequestEmail({
        prenom: prenom,
        nom: nom,
        signatureUrl: signatureUrl,
        kind: kind,
        includeWelcomePack: includeWelcomePack,
      })
      await sendBrevoEmail({
        to: [{ email: recipientEmail, name: (prenom + " " + nom).trim() }],
        sender: { name: "Edward Touret", email: "edward@meshuga.fr" },
        bcc: [{ email: "edward@meshuga.fr", name: "Edward Touret" }],
        subject: emailPayload.subject,
        htmlContent: emailPayload.html,
      })
      channels.email = recipientEmail
    } catch (err) {
      console.error("[employer-approve] Brevo email failed:", err)
    }
  }

  // Send Twilio SMS if phone
  if (recipientPhone) {
    try {
      var smsBody = buildSignatureSmsBody({ prenom: prenom, signatureUrl: signatureUrl })
      await sendTwilioSms({ to: recipientPhone, body: smsBody })
      channels.sms = recipientPhone
    } catch (err) {
      console.error("[employer-approve] Twilio SMS failed:", err)
    }
  }

  return {
    ok: true,
    signatureUrl: signatureUrl,
    channels: channels,
    employee: { prenom: prenom, nom: nom },
  }
}

// ---------- REJECT ----------
export async function executeEmployerReject(input: RejectInput): Promise<RejectResult> {
  var kind = input.kind
  var id = input.id
  var token = input.token
  var reason = input.reason || ""

  var admin = adminClient()
  var table = kind === "contract" ? "hr_contracts" : "hr_contract_amendments"

  var fetchCols = [
    "id",
    "prepared_by_email",
    "employer_validation_token",
    "employer_validation_token_expires_at",
    "employer_validated_at",
  ].join(",")

  var row: any = await admin.from(table).select(fetchCols).eq("id", id).maybeSingle()
  if (row.error || !row.data) {
    return { ok: false, error: "not_found" }
  }
  var r = row.data

  if (r.employer_validated_at) {
    return { ok: false, error: "already_validated" }
  }
  if (!r.employer_validation_token || r.employer_validation_token !== token) {
    return { ok: false, error: "invalid_token" }
  }

  // Reset pending fields + clear token
  var updatePayload: any = {
    employer_pending_recipient_email: null,
    employer_pending_recipient_phone: null,
    employer_pending_include_welcome_pack: null,
    employer_pending_save_email_to_profile: null,
    employer_validation_token: null,
    employer_validation_token_expires_at: null,
  }

  var up: any = await admin.from(table).update(updatePayload).eq("id", id)
  if (up.error) {
    return { ok: false, error: "db_update_failed: " + up.error.message }
  }

  // Notify Emy (or whoever prepared) via Brevo
  var notified = ""
  if (r.prepared_by_email) {
    try {
      var subject =
        "❌ Validation refusée : " + (kind === "contract" ? "contrat" : "avenant") + " à re-préparer"
      var reasonBlock = reason
        ? '<p style="margin-top:16px;padding:12px;background:#FFF3F3;border-left:3px solid #D33;"><strong>Raison&nbsp;:</strong> ' +
          escapeHtml(reason) +
          "</p>"
        : ""
      var html =
        '<div style="font-family:Arial,sans-serif;max-width:560px;color:#191923;">' +
        '<p>Bonjour,</p>' +
        '<p>Edward a <strong>refusé</strong> le ' +
        (kind === "contract" ? "contrat" : "avenant") +
        ' que tu as préparé. Il doit être ré-ouvert et re-préparé depuis le dashboard.</p>' +
        reasonBlock +
        '<p style="margin-top:20px;font-size:13px;color:#666;">— Meshuga Manager</p>' +
        '</div>'
      await sendBrevoEmail({
        to: [{ email: r.prepared_by_email, name: r.prepared_by_email }],
        sender: { name: "Meshuga Manager", email: "edward@meshuga.fr" },
        subject: subject,
        htmlContent: html,
      })
      notified = r.prepared_by_email
    } catch (err) {
      console.error("[employer-reject] Brevo notif failed:", err)
    }
  }

  return { ok: true, notifiedEmail: notified || undefined }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
