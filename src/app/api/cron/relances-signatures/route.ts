// ============================================================
// /api/cron/relances-signatures/route.ts
// ============================================================
// Cron quotidien (Vercel Cron, 9h00 UTC = 11h Paris CEST / 10h CET)
// Relance email + SMS pour tous les avenants/contrats envoyés non signés
// depuis > 24h, tant que ce n'est pas signé.
//
// Protégé par CRON_SECRET (Vercel l'injecte automatiquement).
//
// Pour les envois ayant été faits en parallèle (email + SMS), on relance
// sur les mêmes canaux qu'à l'envoi initial (signature_channel).
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendBrevoEmail, buildRelanceEmail } from "@/lib/brevo"
import { sendTwilioSms, buildRelanceSmsBody } from "@/lib/twilio"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60 // secondes (Vercel Hobby = 10s max, Pro = 60s)

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
  return "Avenant au contrat de travail"
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

// === Helper : jours écoulés depuis sent_at ===
function daysSince(isoDate: string): number {
  var sent = new Date(isoDate).getTime()
  var now = Date.now()
  var diffMs = now - sent
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// === Helper : doit-on relancer aujourd'hui ? ===
// On relance si : envoyé il y a >= 1 jour ET (jamais relancé OU dernière relance >= 24h)
function shouldRelance(
  sentAt: string,
  lastRelanceAt: string | null,
  signedAt: string | null
): boolean {
  if (signedAt) return false
  if (daysSince(sentAt) < 1) return false
  if (!lastRelanceAt) return true
  // 24h depuis dernière relance
  var lastMs = new Date(lastRelanceAt).getTime()
  var diffHours = (Date.now() - lastMs) / (1000 * 60 * 60)
  return diffHours >= 23 // 23h pour tolérer un léger décalage de cron
}

// ============================================================
// GET handler (Vercel Cron utilise GET avec Authorization header)
// ============================================================
export async function GET(req: Request) {
  // === 1. Auth Vercel Cron ===
  var authHeader = req.headers.get("authorization") || ""
  var cronSecret = process.env.CRON_SECRET || ""
  if (cronSecret && authHeader !== "Bearer " + cronSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  var supabase = getServerClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Configuration serveur manquante" }, { status: 500 })
  }

  var siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://meshuga-manager.vercel.app"
  siteUrl = siteUrl.replace(/\/+$/, "")

  var startedAt = new Date().toISOString()
  var results = {
    started_at: startedAt,
    amendments_processed: 0,
    amendments_skipped: 0,
    contracts_processed: 0,
    contracts_skipped: 0,
    emails_sent: 0,
    emails_failed: 0,
    sms_sent: 0,
    sms_failed: 0,
    errors: [] as string[],
  }

  // ============================================================
  // 2. Traiter les avenants en attente
  // ============================================================
  var resAmendments = await supabase
    .from("hr_contract_amendments")
    .select(
      "id, contract_id, amendment_type, signature_status, signature_token, " +
      "signature_sent_at, signature_last_relance_at, signed_at, " +
      "signature_recipient_email, signature_recipient_phone, signature_channel, " +
      "signature_includes_welcome_pack, signature_relance_count, signature_relances_history"
    )
    .in("signature_status", ["sent", "viewed"])
    .is("signed_at", null)
    .not("signature_sent_at", "is", null)

  if (resAmendments.error) {
    results.errors.push("Avenants query error: " + resAmendments.error.message)
  } else {
    var amendments = resAmendments.data || []
    for (var i = 0; i < amendments.length; i++) {
      var a: any = amendments[i]
      if (!shouldRelance(a.signature_sent_at, a.signature_last_relance_at, a.signed_at)) {
        results.amendments_skipped++
        continue
      }

      // Résoudre employé via contract_id → employee_id (ou via cycle_id)
      var empRes = await resolveEmployee(supabase, a.contract_id)
      if (!empRes) {
        results.errors.push("Avenant " + a.id + " : salarié introuvable")
        results.amendments_skipped++
        continue
      }

      var docLabel = getAmendmentTypeLabel(a.amendment_type || "")
      var days = daysSince(a.signature_sent_at)
      var signatureUrl = siteUrl + "/sign/" + a.signature_token

      // Envoyer relances selon canal
      var relanceResult = await sendRelance({
        channel: a.signature_channel || "email",
        email: a.signature_recipient_email,
        phone: a.signature_recipient_phone,
        prenom: empRes.prenom,
        nom: empRes.nom,
        civilite: empRes.civilite,
        documentLabel: docLabel,
        signatureUrl: signatureUrl,
        includeWelcomePack: a.signature_includes_welcome_pack === true,
        days: days,
      })

      results.emails_sent += relanceResult.emailOk ? 1 : 0
      results.emails_failed += relanceResult.emailAttempted && !relanceResult.emailOk ? 1 : 0
      results.sms_sent += relanceResult.smsOk ? 1 : 0
      results.sms_failed += relanceResult.smsAttempted && !relanceResult.smsOk ? 1 : 0

      // Mettre à jour le compteur en DB
      var nowIso = new Date().toISOString()
      var historyEntry = {
        relance_at: nowIso,
        days_since_sent: days,
        relance_number: (a.signature_relance_count || 0) + 1,
        email_attempted: relanceResult.emailAttempted,
        email_ok: relanceResult.emailOk,
        email_error: relanceResult.emailError || null,
        sms_attempted: relanceResult.smsAttempted,
        sms_ok: relanceResult.smsOk,
        sms_error: relanceResult.smsError || null,
      }
      var existingHistory = Array.isArray(a.signature_relances_history) ? a.signature_relances_history : []
      existingHistory.push(historyEntry)

      await supabase
        .from("hr_contract_amendments")
        .update({
          signature_relance_count: (a.signature_relance_count || 0) + 1,
          signature_last_relance_at: nowIso,
          signature_relances_history: existingHistory,
        })
        .eq("id", a.id)

      results.amendments_processed++
    }
  }

  // ============================================================
  // 3. Traiter les contrats en attente (symétrique)
  // ============================================================
  var resContracts = await supabase
    .from("hr_contracts")
    .select(
      "id, employee_id, cycle_id, type, statut_cadre, signature_status, signature_token, " +
      "signature_sent_at, signature_last_relance_at, signature_signed_at, " +
      "signature_recipient_email, signature_recipient_phone, signature_channel, " +
      "signature_includes_welcome_pack, signature_relance_count, signature_relances_history"
    )
    .in("signature_status", ["sent", "viewed"])
    .is("signature_signed_at", null)
    .not("signature_sent_at", "is", null)

  if (resContracts.error) {
    results.errors.push("Contracts query error: " + resContracts.error.message)
  } else {
    var contracts = resContracts.data || []
    for (var j = 0; j < contracts.length; j++) {
      var c: any = contracts[j]
      if (!shouldRelance(c.signature_sent_at, c.signature_last_relance_at, c.signature_signed_at)) {
        results.contracts_skipped++
        continue
      }

      // Résoudre employé
      var empId: string | null = c.employee_id || null
      if (!empId && c.cycle_id) {
        var resCyc = await supabase
          .from("hr_employment_cycles")
          .select("employee_id")
          .eq("id", c.cycle_id)
          .maybeSingle()
        empId = (resCyc.data && resCyc.data.employee_id) || null
      }
      if (!empId) {
        results.errors.push("Contrat " + c.id + " : salarié introuvable")
        results.contracts_skipped++
        continue
      }

      var resEmp = await supabase
        .from("hr_employees")
        .select("prenom, nom, civilite")
        .eq("id", empId)
        .maybeSingle()
      if (!resEmp.data) {
        results.errors.push("Contrat " + c.id + " : profil salarié introuvable")
        results.contracts_skipped++
        continue
      }

      var civ = (resEmp.data.civilite || "").toLowerCase()
      var isFemale = civ === "mme" || civ === "madame"
      var docLabel = getContractTypeLabel(c.type || "", c.statut_cadre || "", isFemale)
      var days = daysSince(c.signature_sent_at)
      var signatureUrl = siteUrl + "/sign/" + c.signature_token

      var relanceResult = await sendRelance({
        channel: c.signature_channel || "email",
        email: c.signature_recipient_email,
        phone: c.signature_recipient_phone,
        prenom: resEmp.data.prenom || "",
        nom: resEmp.data.nom || "",
        civilite: resEmp.data.civilite || null,
        documentLabel: docLabel,
        signatureUrl: signatureUrl,
        includeWelcomePack: c.signature_includes_welcome_pack === true,
        days: days,
      })

      results.emails_sent += relanceResult.emailOk ? 1 : 0
      results.emails_failed += relanceResult.emailAttempted && !relanceResult.emailOk ? 1 : 0
      results.sms_sent += relanceResult.smsOk ? 1 : 0
      results.sms_failed += relanceResult.smsAttempted && !relanceResult.smsOk ? 1 : 0

      var nowIso = new Date().toISOString()
      var historyEntry = {
        relance_at: nowIso,
        days_since_sent: days,
        relance_number: (c.signature_relance_count || 0) + 1,
        email_attempted: relanceResult.emailAttempted,
        email_ok: relanceResult.emailOk,
        email_error: relanceResult.emailError || null,
        sms_attempted: relanceResult.smsAttempted,
        sms_ok: relanceResult.smsOk,
        sms_error: relanceResult.smsError || null,
      }
      var existingHistory = Array.isArray(c.signature_relances_history) ? c.signature_relances_history : []
      existingHistory.push(historyEntry)

      await supabase
        .from("hr_contracts")
        .update({
          signature_relance_count: (c.signature_relance_count || 0) + 1,
          signature_last_relance_at: nowIso,
          signature_relances_history: existingHistory,
        })
        .eq("id", c.id)

      results.contracts_processed++
    }
  }

  console.log("[cron/relances-signatures]", JSON.stringify(results))
  return NextResponse.json({ ok: true, results: results })
}

// ============================================================
// resolveEmployee — récupère prenom/nom/civilité depuis contract_id
// ============================================================
async function resolveEmployee(
  supabase: any,
  contractId: string | null
): Promise<{ prenom: string; nom: string; civilite: string | null } | null> {
  if (!contractId) return null
  var resC = await supabase
    .from("hr_contracts")
    .select("employee_id, cycle_id")
    .eq("id", contractId)
    .maybeSingle()
  if (!resC.data) return null

  var empId: string | null = resC.data.employee_id || null
  if (!empId && resC.data.cycle_id) {
    var resCyc = await supabase
      .from("hr_employment_cycles")
      .select("employee_id")
      .eq("id", resC.data.cycle_id)
      .maybeSingle()
    empId = (resCyc.data && resCyc.data.employee_id) || null
  }
  if (!empId) return null

  var resE = await supabase
    .from("hr_employees")
    .select("prenom, nom, civilite")
    .eq("id", empId)
    .maybeSingle()
  if (!resE.data) return null

  return {
    prenom: resE.data.prenom || "",
    nom: resE.data.nom || "",
    civilite: resE.data.civilite || null,
  }
}

// ============================================================
// sendRelance — envoie relance email + SMS selon channel
// ============================================================
async function sendRelance(params: {
  channel: string
  email: string | null
  phone: string | null
  prenom: string
  nom: string
  civilite: string | null
  documentLabel: string
  signatureUrl: string
  includeWelcomePack: boolean
  days: number
}): Promise<{
  emailAttempted: boolean
  emailOk: boolean
  emailError: string | null
  smsAttempted: boolean
  smsOk: boolean
  smsError: string | null
}> {
  var wantsEmail = params.channel.indexOf("email") !== -1 && !!params.email
  var wantsSms = params.channel.indexOf("sms") !== -1 && !!params.phone

  var emailPromise: Promise<any> = Promise.resolve(null)
  var smsPromise: Promise<any> = Promise.resolve(null)

  if (wantsEmail && params.email) {
    var emailContent = buildRelanceEmail({
      recipientFirstName: params.prenom,
      recipientLastName: params.nom,
      recipientCivilite: params.civilite,
      documentTypeLabel: params.documentLabel,
      signatureUrl: params.signatureUrl,
      includeWelcomePack: params.includeWelcomePack,
      daysSinceSent: params.days,
      senderName: "Edward Touret",
    })
    emailPromise = sendBrevoEmail({
      to: [{ email: params.email, name: params.prenom + " " + params.nom }],
      bcc: [{ email: "edward@meshuga.fr", name: "Edward Touret" }],
      subject: emailContent.subject,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
      replyTo: { email: "edward@meshuga.fr", name: "Edward Touret" },
      tags: ["signature-relance"],
    })
  }

  if (wantsSms && params.phone) {
    var smsBody = buildRelanceSmsBody({
      prenom: params.prenom,
      signatureUrl: params.signatureUrl,
      daysSinceSent: params.days,
    })
    smsPromise = sendTwilioSms({
      to: params.phone,
      body: smsBody,
    })
  }

  var results = await Promise.allSettled([emailPromise, smsPromise])
  var emailRes: any = results[0].status === "fulfilled" ? results[0].value : { ok: false, error: "Exception" }
  var smsRes: any = results[1].status === "fulfilled" ? results[1].value : { ok: false, error: "Exception" }

  return {
    emailAttempted: wantsEmail,
    emailOk: wantsEmail && emailRes && emailRes.ok,
    emailError: wantsEmail && emailRes && !emailRes.ok ? (emailRes.error || "Échec") : null,
    smsAttempted: wantsSms,
    smsOk: wantsSms && smsRes && smsRes.ok,
    smsError: wantsSms && smsRes && !smsRes.ok ? (smsRes.error || "Échec") : null,
  }
}
