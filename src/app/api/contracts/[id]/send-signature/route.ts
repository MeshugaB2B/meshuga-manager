// ============================================================
// /api/contracts/[id]/send-signature/route.ts
// ============================================================
// POST endpoint pour envoyer un contrat de travail pour signature
// électronique au salarié.
//
// Sprint Y1 — Phase C — Sprint C2A
//
// Body attendu :
//   {
//     recipientEmail: string,            // email destinataire (req)
//     includeWelcomePack: boolean,       // bundle dossier de bienvenue ? (req)
//     saveEmailToProfile: boolean,       // sauvegarder l'email sur hr_employees ?
//   }
//
// Workflow :
//   1. Vérifier que le contrat existe et n'est pas déjà signé
//   2. Vérifier la cohérence du flag includeWelcomePack
//      (si welcome_pack_signed=true → on force à false)
//   3. Générer un token unique (crypto)
//   4. Update hr_contracts (signature_token, signature_status='sent', etc.)
//   5. Sauvegarder l'email sur hr_employees si demandé
//   6. Envoyer l'email Brevo avec le lien /sign/[token]
//   7. Retourner { ok, token, signatureUrl }
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

  // === 6. Logique bundle : si welcome_pack_signed=true → on force à false (anti-resign) ===
  var finalIncludeWelcomePack = includeWelcomePack
  if (empStatus.welcome_pack_signed) {
    finalIncludeWelcomePack = false
  }

  // === 7. Générer un token sécurisé (32 chars hex) ===
  // UUID v4 standard, suffisant pour l'usage (2^122 entropie)
  var token = randomUUID().replace(/-/g, "")

  // === 8. UPDATE hr_contracts ===
  var updatePayload: any = {
    signature_token: token,
    signature_status: "sent",
    signature_sent_at: new Date().toISOString(),
    signature_channel: "email",
    signature_recipient_email: recipientEmail,
    signature_includes_welcome_pack: finalIncludeWelcomePack,
    // Reset des champs hérités d'un éventuel envoi précédent
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

  // === 9. Sauvegarder l'email sur hr_employees si demandé ===
  if (saveEmailToProfile && empStatus.email !== recipientEmail) {
    var ok = await updateEmployeeContactInfo({
      employeeId: employeeId,
      email: recipientEmail,
    })
    if (!ok) {
      console.warn("[send-signature/contract] Échec sauvegarde email sur profil — continue quand même")
    }
  }

  // === 10. Construire le contenu de l'email ===
  var civ = (empStatus.civilite || "").toLowerCase().trim()
  var isFemale = civ === "mme" || civ === "madame" || civ === "mlle" || civ === "mademoiselle"
  var docLabel = getContractTypeLabel(contract.type || "", contract.statut_cadre || "", isFemale)

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

  // === 11. Envoyer l'email via Brevo ===
  var sendResult = await sendBrevoEmail({
    to: [{ email: recipientEmail, name: empStatus.prenom + " " + empStatus.nom }],
    subject: emailContent.subject,
    htmlContent: emailContent.htmlContent,
    textContent: emailContent.textContent,
    replyTo: { email: "edward@meshuga.fr", name: "Edward Touret" },
    tags: ["signature-request", "contract"],
  })

  if (!sendResult.ok) {
    // L'update DB est déjà faite. On rollback ? Non, on log et on retourne erreur partielle.
    // Edward pourra renvoyer manuellement plus tard.
    console.error("[send-signature/contract] Brevo error:", sendResult.error)
    return NextResponse.json(
      {
        ok: false,
        error: "Email non envoyé : " + sendResult.error,
        token: token,
        signatureUrl: signatureUrl,
        partialSuccess: true, // la DB est à jour, juste l'email a échoué
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
