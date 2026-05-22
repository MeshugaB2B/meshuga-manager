// src/app/api/sign/[token]/submit/route.ts
// ============================================================
// Sprint C3 — Finalisation de la signature électronique
// ============================================================
// Valide le token, génère le HTML signé final + cartouche audit, calcule
// le hash SHA-256, upload dans Storage hr-signatures/, UPDATE la DB,
// marque le dossier de bienvenue comme signé (si inclus), envoie un mail
// de confirmation au salarié + Edward en BCC.
//
// Conforme : art. 1366-1367 Code civil, Règlement eIDAS n° 910/2014.
// ============================================================

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildAvenant } from "@/app/dashboard/rh/amendmentBuilder"
import { buildWelcomePack } from "@/app/dashboard/rh/welcomePackBuilder"
import { loadEmployerSignature } from "@/app/dashboard/rh/employerSignature"
import { markEmployeeWelcomePackSigned } from "@/app/dashboard/rh/employeeWelcomePack"
import { LOGO_PINK } from "@/app/dashboard/logos"
import { sendBrevoEmail } from "@/lib/brevo"
import { createHash } from "crypto"

export var runtime = "nodejs"

// ============================================================
// Helpers
// ============================================================

function getClientIp(req: Request): string {
  var fwd = req.headers.get("x-forwarded-for")
  if (fwd) {
    var first = fwd.split(",")[0].trim()
    if (first) return first
  }
  var real = req.headers.get("x-real-ip")
  if (real) return real
  return "unknown"
}

function escHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDateFr(d: Date): string {
  var dd = String(d.getDate()).padStart(2, "0")
  var mm = String(d.getMonth() + 1).padStart(2, "0")
  var yyyy = d.getFullYear()
  var hh = String(d.getHours()).padStart(2, "0")
  var min = String(d.getMinutes()).padStart(2, "0")
  var ss = String(d.getSeconds()).padStart(2, "0")
  return dd + "/" + mm + "/" + yyyy + " à " + hh + ":" + min + ":" + ss + " (heure de Paris)"
}

// Injecte un bloc signature salarié Yellowtail rose + cartouche audit légal
// dans le HTML d'origine (à la place de la zone "Date : __/__/____" du bloc salarié).
function injectEmployeeSignature(
  originalHtml: string,
  signedFullName: string,
  signedAt: Date,
  ip: string,
  userAgent: string,
  hash: string,
  consentText: string
): string {
  // Bloc signature visuel : nom du salarié en Yellowtail rose
  var signatureSvg =
    '<div style="text-align:center; padding: 16px 0 6px 0;">' +
      '<div style="font-family: Yellowtail, cursive; font-size: 42px; color: #FF82D7; line-height: 1; padding: 8px 0;">' +
        escHtml(signedFullName) +
      "</div>" +
      '<div style="font-size: 9px; color: #555; font-style: italic; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; margin-top: 2px;">' +
        "Signature électronique apposée le " + escHtml(formatDateFr(signedAt)) +
      "</div>" +
    "</div>"

  // Cartouche audit légal sous le bloc signature (référence eIDAS + Code civil)
  var auditCartouche =
    '<div style="margin: 10px 0 0 0; padding: 8px 10px; background: #FAFAFA; border-left: 3px solid #FF82D7; border-radius: 3px; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; font-size: 7.5px; color: #555; line-height: 1.45; font-style: italic;">' +
      '<div style="margin-bottom: 3px;"><span style="color: #2c2c2c; font-weight: 700; font-style: normal;">Signé électroniquement par&nbsp;:</span> ' + escHtml(signedFullName) + "</div>" +
      '<div style="margin-bottom: 3px;"><span style="color: #2c2c2c; font-weight: 700; font-style: normal;">Date&nbsp;:</span> ' + escHtml(formatDateFr(signedAt)) + "</div>" +
      '<div style="margin-bottom: 3px;"><span style="color: #2c2c2c; font-weight: 700; font-style: normal;">Adresse IP&nbsp;:</span> ' + escHtml(ip) + "</div>" +
      '<div style="margin-bottom: 3px;"><span style="color: #2c2c2c; font-weight: 700; font-style: normal;">Navigateur&nbsp;:</span> ' +
        '<span style="font-family: \'SF Mono\', Consolas, monospace; font-size: 7px; font-style: normal;">' + escHtml((userAgent || "unknown").substring(0, 150)) + "</span>" +
      "</div>" +
      '<div style="margin-bottom: 3px;"><span style="color: #2c2c2c; font-weight: 700; font-style: normal;">Empreinte SHA-256&nbsp;:</span> ' +
        '<span style="font-family: \'SF Mono\', Consolas, monospace; font-size: 7px; font-style: normal; color: #555;">' + escHtml(hash) + "</span>" +
      "</div>" +
      '<div style="margin-bottom: 3px;"><span style="color: #2c2c2c; font-weight: 700; font-style: normal;">Mention de consentement&nbsp;:</span> ' + escHtml(consentText) + "</div>" +
      '<div style="margin-top: 4px; padding-top: 3px; border-top: 1px dotted #DDD; font-size: 7px;">' +
        "Signature électronique conforme aux articles 1366 et 1367 du Code civil et au Règlement (UE) n° 910/2014 (eIDAS). " +
        "L'écrit électronique a la même force probante que l'écrit sur support papier (art. 1366 CC). " +
        "Le procédé d'identification utilisé permet d'authentifier le signataire et de garantir l'intégrité du document (art. 1367 CC)." +
      "</div>" +
    "</div>"

  var signatureBlock = signatureSvg + auditCartouche

  // On remplace la zone "Date : __ / __ / ____" du bloc salarié par le bloc signature
  // Le pattern dans amendmentBuilder est : 'Date : __ / __ / ____'
  // Idem dans welcomePackBuilder. On utilise une regex tolérante.
  var dateLineRegex = /Date\s*:\s*_+\s*\/\s*_+\s*\/\s*_+/g
  var html = originalHtml
  if (dateLineRegex.test(html)) {
    html = html.replace(dateLineRegex, signatureBlock)
  } else {
    // Fallback : ajouter le bloc avant </body>
    html = html.replace(/<\/body>/i, signatureBlock + "</body>")
  }

  return html
}

// ============================================================
// POST handler
// ============================================================

export async function POST(
  req: Request,
  ctx: { params: { token: string } }
) {
  var token = ctx.params.token
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, error: "Lien invalide" }, { status: 400 })
  }

  // === 1. Body ===
  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Body JSON invalide" }, { status: 400 })
  }
  var signedFullName = typeof body.fullName === "string" ? body.fullName.trim() : ""
  var consentDocument = body.consentDocument === true
  var consentWelcomePack = body.consentWelcomePack === true

  if (!signedFullName || signedFullName.length < 3) {
    return NextResponse.json({ ok: false, error: "Veuillez saisir vos nom et prénom complets" }, { status: 400 })
  }
  if (!consentDocument) {
    return NextResponse.json({ ok: false, error: "Vous devez confirmer avoir lu et approuvé le document" }, { status: 400 })
  }

  // === 2. IP + User-Agent ===
  var ip = getClientIp(req)
  var userAgent = req.headers.get("user-agent") || "unknown"
  var acceptLanguage = req.headers.get("accept-language") || ""
  var signedAt = new Date()

  // === 3. Charger l'avenant + contrat + salarié ===
  var sb = createAdminClient()
  var resAmendment = await sb
    .from("hr_contract_amendments")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle()

  if (!resAmendment.data) {
    return NextResponse.json({ ok: false, error: "Token introuvable" }, { status: 404 })
  }
  var amendment: any = resAmendment.data
  if (amendment.signed_at || amendment.signature_status === "signed") {
    return NextResponse.json({ ok: false, error: "Ce document a déjà été signé" }, { status: 410 })
  }

  // Welcome pack inclus → consentement obligatoire
  var includeWp = amendment.signature_includes_welcome_pack === true
  if (includeWp && !consentWelcomePack) {
    return NextResponse.json({ ok: false, error: "Vous devez confirmer avoir lu et approuvé le Dossier de bienvenue" }, { status: 400 })
  }

  // Contrat parent
  var resContract = await sb.from("hr_contracts").select("*").eq("id", amendment.contract_id).maybeSingle()
  if (!resContract.data) {
    return NextResponse.json({ ok: false, error: "Contrat parent introuvable" }, { status: 404 })
  }
  var contract: any = resContract.data

  // employee_id (cycle fallback)
  var empId = contract.employee_id
  if (!empId && contract.cycle_id) {
    var resCyc = await sb.from("hr_employment_cycles")
      .select("employee_id").eq("id", contract.cycle_id).maybeSingle()
    empId = (resCyc.data && resCyc.data.employee_id) || null
  }
  if (!empId) {
    return NextResponse.json({ ok: false, error: "Salarié introuvable" }, { status: 404 })
  }

  var resEmp = await sb.from("hr_employees").select("*").eq("id", empId).maybeSingle()
  if (!resEmp.data) {
    return NextResponse.json({ ok: false, error: "Salarié introuvable" }, { status: 404 })
  }
  var emp: any = resEmp.data

  // === 4. Reconstruire le HTML original (avenant + welcomepack si inclus) ===
  var employerSig = await loadEmployerSignature()

  // Vacations
  var resVacs = await sb.from("hr_contract_vacations")
    .select("*").eq("contract_id", contract.id).order("ordre", { ascending: true })
  var vacs = resVacs.data || []

  // previousValues
  var previousValues: any = {}
  if (amendment.changes && typeof amendment.changes === "object") {
    Object.keys(amendment.changes).forEach(function (f) {
      var ch = amendment.changes[f]
      if (ch && ch.before !== undefined) previousValues[f] = ch.before
    })
  }

  var avenantHtml = buildAvenant(amendment, contract, emp, vacs, LOGO_PINK, previousValues, employerSig)

  var welcomePackHtml = ""
  if (includeWp) {
    welcomePackHtml = buildWelcomePack(emp, contract, LOGO_PINK, employerSig)
  }

  // === 5. Calculer le hash SHA-256 du contenu original (intégrité) ===
  var originalContent = avenantHtml + "\n---\n" + welcomePackHtml
  var hash = createHash("sha256").update(originalContent, "utf8").digest("hex")

  // === 6. Injecter le bloc signature salarié ===
  var consentText = includeWp
    ? "Lu et approuvé — j'ai pris connaissance de l'intégralité de l'avenant et du Dossier de bienvenue Meshuga (13 pages)."
    : "Lu et approuvé — j'ai pris connaissance de l'intégralité du document."

  var signedAvenantHtml = injectEmployeeSignature(
    avenantHtml, signedFullName, signedAt, ip, userAgent, hash, consentText
  )

  var signedWelcomePackHtml = ""
  if (includeWp) {
    signedWelcomePackHtml = injectEmployeeSignature(
      welcomePackHtml, signedFullName, signedAt, ip, userAgent, hash, consentText
    )
  }

  // === 7. Audit JSON ===
  var auditData: any = {
    signed_full_name: signedFullName,
    signed_at: signedAt.toISOString(),
    ip: ip,
    user_agent: userAgent,
    accept_language: acceptLanguage,
    hash_sha256: hash,
    consent_document: true,
    consent_welcome_pack: consentWelcomePack === true,
    consent_text: consentText,
    legal_basis: "Articles 1366-1367 du Code civil, Règlement (UE) n° 910/2014 (eIDAS)",
    employer_signature_at: employerSig ? employerSig.signed_at : null,
    employer_signature_ip: employerSig ? employerSig.ip : null,
  }

  // === 8. Upload Storage hr-signatures/ ===
  var timestamp = signedAt.toISOString().replace(/[:.]/g, "-")
  var avenantPath = "amendments/" + amendment.id + "/" + timestamp + "_avenant.html"
  var wpPath = "amendments/" + amendment.id + "/" + timestamp + "_welcomepack.html"

  var uploadAv = await sb.storage.from("hr-signatures").upload(
    avenantPath,
    new Blob([signedAvenantHtml], { type: "text/html; charset=utf-8" }),
    { contentType: "text/html; charset=utf-8", upsert: false }
  )
  if (uploadAv.error) {
    console.error("[sign/submit] Upload avenant error:", uploadAv.error.message)
    return NextResponse.json({ ok: false, error: "Erreur d'archivage du document signé" }, { status: 500 })
  }

  var uploadedWpPath: string | null = null
  if (includeWp) {
    var uploadWp = await sb.storage.from("hr-signatures").upload(
      wpPath,
      new Blob([signedWelcomePackHtml], { type: "text/html; charset=utf-8" }),
      { contentType: "text/html; charset=utf-8", upsert: false }
    )
    if (uploadWp.error) {
      console.error("[sign/submit] Upload welcomepack error:", uploadWp.error.message)
      // Non bloquant : on a déjà l'avenant signé.
    } else {
      uploadedWpPath = wpPath
    }
  }

  // === 9. UPDATE hr_contract_amendments ===
  var updateRes = await sb
    .from("hr_contract_amendments")
    .update({
      signed_at: signedAt.toISOString(),
      signature_signed_at: signedAt.toISOString(),
      signature_status: "signed",
      signature_audit_data: auditData,
      signature_pdf_hash: hash,
      signed_pdf_path: avenantPath,
      status: "signed",
    })
    .eq("id", amendment.id)

  if (updateRes.error) {
    console.error("[sign/submit] DB update error:", updateRes.error.message)
    return NextResponse.json({ ok: false, error: "Erreur lors de l'enregistrement de la signature" }, { status: 500 })
  }

  // === 10. Marquer le welcome pack signé sur le salarié (si inclus) ===
  if (includeWp && uploadedWpPath) {
    try {
      await markEmployeeWelcomePackSigned({
        employeeId: empId,
        pdfPath: uploadedWpPath,
        audit: auditData,
        viaAmendmentId: amendment.id,
      })
    } catch (e: any) {
      console.error("[sign/submit] markEmployeeWelcomePackSigned non bloquant:", e.message || e)
    }
  }

  // === 11. Email de confirmation ===
  var recipientEmail = amendment.signature_recipient_email || emp.email
  if (recipientEmail) {
    var docLabel = "votre avenant au contrat de travail"
    if (amendment.amendment_type === "regularisation_welcome_pack") {
      docLabel = "votre avenant de mise en conformité réglementaire"
    } else if (amendment.amendment_type === "prolongation_duree") {
      docLabel = "votre avenant de prolongation"
    } else if (amendment.amendment_type === "augmentation_salaire") {
      docLabel = "votre avenant de modification de rémunération"
    }

    var civ = (emp.civilite || "").toLowerCase().trim()
    var isFemale = civ === "mme" || civ === "madame"
    var cher = isFemale ? "Chère" : "Cher"

    var subject = "✓ Signature confirmée — " + docLabel
    var bundleText = includeWp ? " ainsi que le Dossier de bienvenue Meshuga (13 pages)" : ""

    var htmlContent =
      '<div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #191923;">' +
        '<div style="font-family: Yellowtail, cursive; color: #FF82D7; font-size: 32px; line-height: 1;">Signature confirmée ✓</div>' +
        '<div style="height: 3px; background: #FFEB5A; margin: 14px 0 22px 0;"></div>' +
        '<p style="line-height: 1.6; font-size: 15px;">' + cher + " " + escHtml(emp.prenom || "") + ",</p>" +
        '<p style="line-height: 1.6; font-size: 15px;">Nous accusons réception de votre signature électronique pour ' + docLabel + bundleText + ".</p>" +
        '<div style="background: #FAFAFA; border-left: 4px solid #FF82D7; padding: 14px 18px; border-radius: 4px; margin: 18px 0; font-size: 13px; line-height: 1.6;">' +
          '<div><strong>Nom du signataire :</strong> ' + escHtml(signedFullName) + "</div>" +
          '<div><strong>Date et heure :</strong> ' + escHtml(formatDateFr(signedAt)) + "</div>" +
          '<div><strong>Empreinte SHA-256 :</strong> <span style="font-family: monospace; font-size: 11px;">' + escHtml(hash.substring(0, 32)) + "…</span></div>" +
        "</div>" +
        '<p style="line-height: 1.6; font-size: 14px;">Conformément aux articles 1366 et 1367 du Code civil et au Règlement européen eIDAS n° 910/2014, votre signature électronique a la même force probante qu\'une signature manuscrite. Le document signé est archivé de manière sécurisée.</p>' +
        '<p style="line-height: 1.6; font-size: 14px;">Si vous souhaitez recevoir une copie du document signé, n\'hésitez pas à nous le demander en répondant à cet email.</p>' +
        '<p style="line-height: 1.6; font-size: 14px; margin-top: 30px;">Toute l\'équipe Meshuga te remercie pour ta confiance.</p>' +
        '<p style="line-height: 1.6; font-size: 14px;"><strong>Edward Touret</strong><br/>Président — SAS AEGIA, Présidente d\'AEGIA FOOD</p>' +
      "</div>"

    var textContent =
      "Signature confirmée\n\n" +
      cher + " " + (emp.prenom || "") + ",\n\n" +
      "Nous accusons réception de votre signature électronique pour " + docLabel + bundleText + ".\n\n" +
      "Nom du signataire : " + signedFullName + "\n" +
      "Date et heure : " + formatDateFr(signedAt) + "\n" +
      "Empreinte SHA-256 : " + hash + "\n\n" +
      "Conformément aux art. 1366-1367 Code civil et au Règlement eIDAS n° 910/2014, " +
      "votre signature électronique a la même force probante qu'une signature manuscrite.\n\n" +
      "Edward Touret\nPrésident — SAS AEGIA"

    try {
      await sendBrevoEmail({
        to: [{ email: recipientEmail, name: (emp.prenom || "") + " " + (emp.nom || "") }],
        bcc: [{ email: "edward@meshuga.fr", name: "Edward Touret" }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
        replyTo: { email: "edward@meshuga.fr", name: "Edward Touret" },
        tags: ["signature-confirmed", "amendment"],
      })
    } catch (e: any) {
      console.error("[sign/submit] Email confirmation non bloquant:", e.message || e)
    }
  }

  // === 12. Succès ===
  return NextResponse.json(
    {
      ok: true,
      signedAt: signedAt.toISOString(),
      hash: hash,
      includeWelcomePack: includeWp,
    },
    { status: 200 }
  )
}
