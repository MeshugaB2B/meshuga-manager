// ============================================================
// brevo.ts
// ============================================================
// Helper pour envoyer des emails transactionnels via l'API Brevo
// (anciennement Sendinblue).
//
// Doc API : https://developers.brevo.com/reference/sendtransacemail
//
// USAGE :
//   import { sendBrevoEmail } from "@/lib/brevo"
//
//   var result = await sendBrevoEmail({
//     to: [{ email: "salarie@example.com", name: "Jean Dupont" }],
//     subject: "Votre contrat à signer",
//     htmlContent: "<p>Bonjour Jean...</p>",
//   })
//
//   if (result.ok) {
//     console.log("Email envoyé, messageId:", result.messageId)
//   } else {
//     console.error("Erreur Brevo:", result.error)
//   }
//
// MODE TEST :
//   Si SIGNATURE_TEST_MODE=true dans les env vars, l'email N'EST PAS
//   envoyé mais juste loggé. Utile pour le dev local.
//
// ⚠️ NE PAS importer côté client (BREVO_API_KEY doit rester serveur).
// ============================================================

import { MESHUGA_LOGO_PINK_DATA_URI } from "./meshugaLogo"

// === Type des paramètres d'envoi ===
export interface BrevoSendParams {
  to: Array<{ email: string; name?: string }>
  subject: string
  htmlContent: string
  textContent?: string
  sender?: { email: string; name: string }
  replyTo?: { email: string; name?: string }
  cc?: Array<{ email: string; name?: string }>
  bcc?: Array<{ email: string; name?: string }>
  tags?: string[]
}

// === Type du résultat ===
export interface BrevoSendResult {
  ok: boolean
  messageId?: string
  error?: string
  testMode?: boolean
}

// === Sender par défaut (Meshuga) ===
var DEFAULT_SENDER = {
  email: "hello@meshuga.fr",
  name: "Meshuga RH",
}

// ============================================================
// sendBrevoEmail
// ============================================================
// Envoie un email transactionnel via l'API Brevo.
//
// Retourne { ok: true, messageId } en cas de succès.
// Retourne { ok: false, error: "..." } en cas d'échec.
//
// Si SIGNATURE_TEST_MODE=true, l'email n'est pas envoyé mais loggé.
// ============================================================
export async function sendBrevoEmail(
  params: BrevoSendParams
): Promise<BrevoSendResult> {
  // Validation minimale
  if (!params.to || params.to.length === 0) {
    return { ok: false, error: "Destinataire(s) manquant(s)" }
  }
  if (!params.subject || params.subject.trim() === "") {
    return { ok: false, error: "Sujet manquant" }
  }
  if (!params.htmlContent || params.htmlContent.trim() === "") {
    return { ok: false, error: "Contenu HTML manquant" }
  }
  // Vérification format email basique
  for (var i = 0; i < params.to.length; i++) {
    var emailStr = (params.to[i].email || "").trim()
    if (!emailStr.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return { ok: false, error: "Format email invalide: " + emailStr }
    }
  }

  // === Mode test : on ne fait pas le vrai envoi ===
  var testMode = process.env.SIGNATURE_TEST_MODE === "true"
  if (testMode) {
    console.log("[Brevo TEST MODE] Email NON envoyé:", {
      to: params.to,
      subject: params.subject,
      htmlPreview: params.htmlContent.slice(0, 200) + "...",
    })
    return {
      ok: true,
      messageId: "test-" + Date.now(),
      testMode: true,
    }
  }

  // === Mode prod : envoi réel via API Brevo ===
  var apiKey = process.env.BREVO_API_KEY || ""
  if (!apiKey) {
    console.error("[Brevo] BREVO_API_KEY manquante dans les env vars")
    return { ok: false, error: "Configuration Brevo manquante" }
  }

  // Construction du payload Brevo
  var payload: any = {
    sender: params.sender || DEFAULT_SENDER,
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
  }
  if (params.textContent) payload.textContent = params.textContent
  if (params.replyTo) payload.replyTo = params.replyTo
  if (params.cc && params.cc.length > 0) payload.cc = params.cc
  if (params.bcc && params.bcc.length > 0) payload.bcc = params.bcc
  if (params.tags && params.tags.length > 0) payload.tags = params.tags

  try {
    var response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    })

    var data: any = null
    try {
      data = await response.json()
    } catch (e) {
      data = null
    }

    if (!response.ok) {
      var errMsg = "Brevo " + response.status
      if (data && data.message) errMsg += " : " + data.message
      else if (data && data.code) errMsg += " (" + data.code + ")"
      console.error("[Brevo] API error:", errMsg, data)
      return { ok: false, error: errMsg }
    }

    var messageId = data && data.messageId ? String(data.messageId) : undefined
    return { ok: true, messageId: messageId }
  } catch (err: any) {
    console.error("[Brevo] Exception:", err && err.message)
    return { ok: false, error: "Erreur réseau Brevo" }
  }
}

// ============================================================
// buildSignatureRequestEmail
// ============================================================
// Construit le HTML d'un email de demande de signature électronique.
// Réutilisé par /api/contracts/[id]/send-signature et
// /api/amendments/[id]/send-signature.
//
// Le rendu est volontairement simple et inline (compatible Gmail,
// Outlook, etc.). Charte Meshuga : Yellowtail header, BILD body.
// ============================================================
export interface SignatureRequestEmailParams {
  recipientFirstName: string
  recipientLastName: string
  recipientCivilite?: string | null // "M.", "Mme", etc.
  documentTypeLabel: string // ex: "Contrat de travail CDI Cuisinier"
  signatureUrl: string // https://meshuga-manager.vercel.app/sign/[token]
  includeWelcomePack: boolean
  senderName?: string // par défaut "Edward Touret"
  expiresInDays?: number // par défaut 30
}

export function buildSignatureRequestEmail(
  params: SignatureRequestEmailParams
): { subject: string; htmlContent: string; textContent: string } {
  var prenom = (params.recipientFirstName || "").trim()
  var nom = (params.recipientLastName || "").trim().toUpperCase()
  var civ = (params.recipientCivilite || "").trim()
  var isFemale = civ.toLowerCase() === "mme" || civ.toLowerCase() === "madame"
  var greeting = isFemale ? "Chère " : "Cher "
  var greetingFull = greeting + prenom

  var senderName = params.senderName || "Edward Touret"
  var expires = params.expiresInDays || 30

  var docLabel = params.documentTypeLabel
  var bundle = params.includeWelcomePack
  var subject = bundle
    ? "Signature à effectuer : " + docLabel + " + Dossier de bienvenue"
    : "Signature à effectuer : " + docLabel

  var docsList = bundle
    ? '<ul style="margin: 8px 0 16px 20px; padding: 0; color: #191923; font-size: 15px; line-height: 1.6;">' +
      '<li>Votre <strong>' + escHtml(docLabel) + '</strong></li>' +
      '<li>Le <strong>Dossier de bienvenue Meshuga</strong> (règles d\'hygiène, sécurité, RGPD, vidéosurveillance)</li>' +
      '</ul>'
    : '<p style="margin: 8px 0 16px 0; color: #191923; font-size: 15px;">Votre <strong>' + escHtml(docLabel) + '</strong></p>'

  var htmlContent =
    '<!DOCTYPE html>' +
    '<html lang="fr" xmlns:o="urn:schemas-microsoft-com:office:office">' +
    '<head>' +
    '<meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>' +
    '<meta name="x-apple-disable-message-reformatting"/>' +
    '<meta http-equiv="X-UA-Compatible" content="IE=edge"/>' +
    // 🔒 Forcer light mode dans Apple Mail / Gmail / Outlook.com pour préserver les couleurs Meshuga
    '<meta name="color-scheme" content="light only"/>' +
    '<meta name="supported-color-schemes" content="light only"/>' +
    '<title>' + escHtml(subject) + '</title>' +
    // Reset email + media query mobile (Gmail mobile et Apple Mail supportent)
    '<style>' +
    '  :root { color-scheme: light only; supported-color-schemes: light only }' +
    '  body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100% }' +
    '  table { border-collapse:collapse !important }' +
    '  img { -ms-interpolation-mode:bicubic; border:0; outline:none; display:block }' +
    '  body { margin:0 !important; padding:0 !important; width:100% !important }' +
    // 🔒 Force le bouton CTA rose Meshuga (Apple Mail dark mode tend à le transformer en violet/magenta)
    '  .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '  .cta-btn-cell { background-color:#FF82D7 !important }' +
    '  @media (prefers-color-scheme: dark) {' +
    '    .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '    .cta-btn-cell { background-color:#FF82D7 !important }' +
    '  }' +
    // Outlook.com dark mode utilise l'attribut [data-ogsc] sur les éléments
    '  [data-ogsc] .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '  [data-ogsc] .cta-btn-cell { background-color:#FF82D7 !important }' +
    '  @media screen and (max-width: 600px) {' +
    '    .container { width:100% !important; max-width:100% !important }' +
    '    .px-32 { padding-left:20px !important; padding-right:20px !important }' +
    '    .py-32 { padding-top:24px !important; padding-bottom:24px !important }' +
    '    .h1 { font-size:16px !important }' +
    '    .body-text { font-size:15px !important }' +
    '    .cta-btn { padding:14px 24px !important; font-size:15px !important }' +
    '    .logo-img { width:180px !important; height:auto !important }' +
    '  }' +
    '</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:#FFEB5A;font-family:Arial,Helvetica,sans-serif;color:#191923">' +

    // Wrapper pleine largeur fond jaune
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FFEB5A">' +
    '<tr><td align="center" style="padding:24px 12px">' +

    // Card centrale : max-width 600px, width 100% pour le responsive
    '<table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden">' +

    // Header BLANC avec logotype rose centré (pas de "Crazy Deli")
    '<tr><td align="center" class="py-32" style="padding:36px 32px 28px 32px;background:#FFFFFF;border-bottom:1px solid #F5F5F5">' +
    '<img src="' + MESHUGA_LOGO_PINK_DATA_URI + '" width="200" height="54" alt="Meshuga" class="logo-img" style="display:block;width:200px;max-width:80%;height:auto;border:0;outline:none;margin:0 auto"/>' +
    '</td></tr>' +

    // Corps
    '<tr><td class="px-32 py-32" style="padding:28px 32px 16px 32px">' +
    '<h1 class="h1" style="margin:0 0 20px 0;font-size:17px;color:#191923;font-weight:400;line-height:1.5">' + escHtml(greetingFull) + ',</h1>' +
    '<p class="body-text" style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#191923">' +
    'Vous recevez ce message pour effectuer la signature électronique ' +
    (bundle ? 'de <strong>2 documents</strong> :' : 'du document suivant :') +
    '</p>' +
    docsList +

    '<p class="body-text" style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#191923">' +
    'La signature se fait en quelques minutes depuis votre téléphone ou ordinateur. Aucune impression ni signature manuscrite n\'est nécessaire.' +
    '</p>' +

    // CTA bouton (responsive) — wrappé dans table+td bgcolor pour résister au dark mode
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 24px 0"><tr><td align="center">' +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="#FF82D7" class="cta-btn-cell" style="background-color:#FF82D7;border-radius:8px"><tr><td bgcolor="#FF82D7" class="cta-btn-cell" align="center" style="background-color:#FF82D7;border-radius:8px;padding:0">' +
    '<a href="' + escAttr(params.signatureUrl) + '" class="cta-btn" style="display:inline-block;background-color:#FF82D7;color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif;mso-padding-alt:0"><span style="color:#FFFFFF;text-decoration:none">Signer mes documents &rarr;</span></a>' +
    '</td></tr></table>' +
    '</td></tr></table>' +

    '<p style="margin:24px 0 8px 0;font-size:13px;line-height:1.5;color:#666">' +
    '<strong>Lien valable ' + expires + ' jours.</strong> Si le bouton ne fonctionne pas, copiez-collez cette adresse dans votre navigateur :' +
    '</p>' +
    '<p style="margin:0 0 16px 0;font-size:12px;line-height:1.4;color:#666;word-break:break-all">' +
    '<a href="' + escAttr(params.signatureUrl) + '" style="color:#FF82D7">' + escHtml(params.signatureUrl) + '</a>' +
    '</p>' +

    '<p class="body-text" style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#191923">' +
    'Pour toute question, vous pouvez me contacter directement.' +
    '</p>' +
    '<p class="body-text" style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#191923">' +
    'Bien à vous,<br>' +
    '<strong>' + escHtml(senderName) + '</strong><br>' +
    '<span style="color:#666;font-size:13px">Président · SAS AEGIA FOOD</span>' +
    '</p>' +
    '</td></tr>' +

    // Footer (sans "Crazy Deli")
    '<tr><td class="px-32" style="padding:20px 32px;background:#FAFAFA;border-top:1px solid #EEEEEE;text-align:center">' +
    '<p style="margin:0;font-size:11px;line-height:1.5;color:#999">' +
    '<strong>Meshuga</strong> · 3 rue Vavin, 75006 Paris · SIREN 904 639 531<br>' +
    'Signature électronique conforme art. 1367 C. civ. + eIDAS UE 910/2014.' +
    '</p>' +
    '</td></tr>' +

    '</table>' +
    '</td></tr></table>' +
    '</body></html>'

  var textContent =
    greetingFull + ",\n\n" +
    "Vous recevez ce message pour effectuer la signature électronique " +
    (bundle ? "de 2 documents :\n" : "du document suivant :\n") +
    "- " + docLabel + "\n" +
    (bundle ? "- Dossier de bienvenue Meshuga\n" : "") +
    "\nSignez en ligne (lien valable " + expires + " jours) :\n" +
    params.signatureUrl + "\n\n" +
    "Pour toute question, vous pouvez me contacter directement.\n\n" +
    "Bien à vous,\n" +
    senderName + "\n" +
    "Président · SAS AEGIA FOOD\n\n" +
    "---\n" +
    "Meshuga · 3 rue Vavin, 75006 Paris\n" +
    "Signature électronique conforme art. 1367 C. civ. + eIDAS UE 910/2014."

  return { subject: subject, htmlContent: htmlContent, textContent: textContent }
}

// ============================================================
// buildRelanceEmail — Email de relance quotidienne (J+N)
// ============================================================
// Envoyé par le cron tant que le document n'est pas signé.
// Plus court que l'email initial, ton de relance courtois.
// ============================================================
export interface RelanceEmailParams {
  recipientFirstName: string
  recipientLastName: string
  recipientCivilite?: string | null
  documentTypeLabel: string
  signatureUrl: string
  includeWelcomePack: boolean
  daysSinceSent: number
  senderName?: string
}

export function buildRelanceEmail(
  params: RelanceEmailParams
): { subject: string; htmlContent: string; textContent: string } {
  var prenom = (params.recipientFirstName || "").trim()
  var nom = (params.recipientLastName || "").trim().toUpperCase()
  var civ = (params.recipientCivilite || "").trim()
  var isFemale = civ.toLowerCase() === "mme" || civ.toLowerCase() === "madame"
  var greeting = isFemale ? "Chère " : "Cher "
  var greetingFull = greeting + prenom

  var senderName = params.senderName || "Edward Touret"
  var bundle = params.includeWelcomePack
  var docLabel = params.documentTypeLabel
  var days = params.daysSinceSent

  var subject = "Rappel — Signature à effectuer : " + docLabel

  var htmlContent =
    '<!DOCTYPE html>' +
    '<html lang="fr">' +
    '<head>' +
    '<meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>' +
    '<meta name="color-scheme" content="light only"/>' +
    '<meta name="supported-color-schemes" content="light only"/>' +
    '<title>' + escHtml(subject) + '</title>' +
    '<style>' +
    '  :root { color-scheme: light only; supported-color-schemes: light only }' +
    '  body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100% }' +
    '  table { border-collapse:collapse !important }' +
    '  img { -ms-interpolation-mode:bicubic; border:0; outline:none; display:block }' +
    '  body { margin:0 !important; padding:0 !important; width:100% !important }' +
    '  .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '  .cta-btn-cell { background-color:#FF82D7 !important }' +
    '  @media (prefers-color-scheme: dark) {' +
    '    .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '    .cta-btn-cell { background-color:#FF82D7 !important }' +
    '  }' +
    '  [data-ogsc] .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '  [data-ogsc] .cta-btn-cell { background-color:#FF82D7 !important }' +
    '</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:#FFEB5A;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FFEB5A">' +
    '<tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden">' +

    // Header
    '<tr><td align="center" style="padding:32px 32px 20px 32px;background:#FFFFFF;border-bottom:1px solid #F5F5F5">' +
    '<img src="' + MESHUGA_LOGO_PINK_DATA_URI + '" width="180" height="48" alt="Meshuga" style="display:block;width:180px;max-width:80%;height:auto;border:0;outline:none;margin:0 auto"/>' +
    '</td></tr>' +

    // Corps
    '<tr><td style="padding:28px 32px 16px 32px">' +
    '<div style="font-family: Yellowtail, cursive; color: #FF82D7; font-size: 28px; line-height: 1; margin-bottom: 14px;">Petit rappel...</div>' +
    '<h1 style="margin:0 0 18px 0;font-size:17px;color:#191923;font-weight:400;line-height:1.5">' + escHtml(greetingFull) + ',</h1>' +
    '<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#191923">' +
    "Je n'ai pas encore reçu votre signature pour " +
    (bundle ? '<strong>2 documents</strong> qui vous attendent' : 'votre <strong>' + escHtml(docLabel) + '</strong>') +
    ' (envoyé il y a ' + (days <= 1 ? '1 jour' : (days + ' jours')) + ').' +
    '</p>' +

    (bundle
      ? '<ul style="margin: 8px 0 16px 20px; padding: 0; color: #191923; font-size: 14px; line-height: 1.6;">' +
        '<li><strong>' + escHtml(docLabel) + '</strong></li>' +
        '<li><strong>Dossier de bienvenue Meshuga</strong></li>' +
        '</ul>'
      : ''
    ) +

    '<p style="margin:14px 0 20px 0;font-size:15px;line-height:1.6;color:#191923">' +
    "La signature prend moins de 2 minutes depuis votre téléphone. " +
    "Sans cette signature, votre dossier RH reste incomplet." +
    '</p>' +

    // CTA bouton (résistant dark mode)
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 20px 0"><tr><td align="center">' +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="#FF82D7" class="cta-btn-cell" style="background-color:#FF82D7;border-radius:8px"><tr><td bgcolor="#FF82D7" class="cta-btn-cell" align="center" style="background-color:#FF82D7;border-radius:8px;padding:0">' +
    '<a href="' + escAttr(params.signatureUrl) + '" class="cta-btn" style="display:inline-block;background-color:#FF82D7;color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif"><span style="color:#FFFFFF;text-decoration:none">Signer maintenant &rarr;</span></a>' +
    '</td></tr></table>' +
    '</td></tr></table>' +

    '<p style="margin:20px 0 8px 0;font-size:12px;line-height:1.5;color:#666">' +
    "Si le bouton ne fonctionne pas, copiez-collez ce lien :" +
    '</p>' +
    '<p style="margin:0 0 16px 0;font-size:11px;line-height:1.4;color:#666;word-break:break-all">' +
    '<a href="' + escAttr(params.signatureUrl) + '" style="color:#FF82D7">' + escHtml(params.signatureUrl) + '</a>' +
    '</p>' +

    '<p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#191923">' +
    "Pour toute question, vous pouvez me contacter directement." +
    '</p>' +
    '<p style="margin:14px 0 0 0;font-size:14px;line-height:1.6;color:#191923">' +
    "Bien à vous,<br>" +
    '<strong>' + escHtml(senderName) + '</strong>' +
    '</p>' +
    '</td></tr>' +

    // Footer
    '<tr><td style="padding:20px 32px;background:#FAFAFA;border-top:1px solid #EEEEEE;text-align:center">' +
    '<p style="margin:0;font-size:11px;color:#999;line-height:1.5">' +
    '<strong>Meshuga</strong> · 3 rue Vavin, 75006 Paris · SIREN 904 639 531<br>' +
    'Signature électronique conforme art. 1367 C. civ. + eIDAS UE 910/2014.' +
    '</p>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>'

  var textContent =
    greetingFull + ",\n\n" +
    "Petit rappel : je n'ai pas encore reçu votre signature pour " +
    (bundle ? "2 documents " : "votre document ") +
    "(envoyé il y a " + days + " jour" + (days > 1 ? "s" : "") + ").\n\n" +
    "Signez en ligne :\n" + params.signatureUrl + "\n\n" +
    "Bien à vous,\n" + senderName

  return { subject: subject, htmlContent: htmlContent, textContent: textContent }
}

// ============================================================
// buildEdwardSignatureNotifEmail — Notification à Edward
// ============================================================
// Envoyé à Edward dès qu'un salarié a signé.
// Contient le lien direct vers le PDF signé en DB pour vérification.
// ============================================================
export interface EdwardSignatureNotifParams {
  signerFirstName: string
  signerLastName: string
  documentTypeLabel: string
  includeWelcomePack: boolean
  signedAt: string // ISO date
  signedPdfUrl: string // URL signée Supabase Storage du PDF avenant
  signedWelcomePackUrl?: string | null // URL signée du welcomepack si bundle
  signatureId: string
  pdfHash: string
}

export function buildEdwardSignatureNotifEmail(
  params: EdwardSignatureNotifParams
): { subject: string; htmlContent: string; textContent: string } {
  var fullName = ((params.signerFirstName || "") + " " + (params.signerLastName || "")).trim()
  var subject = "✓ " + fullName + " a signé — " + params.documentTypeLabel
  var bundle = params.includeWelcomePack && params.signedWelcomePackUrl

  // Format date FR
  var d = new Date(params.signedAt)
  var dateFr = d.toLocaleString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
  })

  var htmlContent =
    '<!DOCTYPE html>' +
    '<html lang="fr">' +
    '<head>' +
    '<meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>' +
    '<meta name="color-scheme" content="light only"/>' +
    '<meta name="supported-color-schemes" content="light only"/>' +
    '<title>' + escHtml(subject) + '</title>' +
    '<style>' +
    '  :root { color-scheme: light only }' +
    '  body, table, td, p, a { -webkit-text-size-adjust:100% }' +
    '  table { border-collapse:collapse !important }' +
    '  img { -ms-interpolation-mode:bicubic; border:0; outline:none; display:block }' +
    '  .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '  .cta-btn-cell { background-color:#FF82D7 !important }' +
    '  @media (prefers-color-scheme: dark) {' +
    '    .cta-btn { background-color:#FF82D7 !important; color:#FFFFFF !important }' +
    '    .cta-btn-cell { background-color:#FF82D7 !important }' +
    '  }' +
    '</style>' +
    '</head>' +
    '<body style="margin:0;padding:0;background:#FFEB5A;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FFEB5A">' +
    '<tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden">' +

    // Header avec coche verte
    '<tr><td align="center" style="padding:32px 32px 20px 32px;background:#FFFFFF">' +
    '<div style="font-size:48px;line-height:1;margin-bottom:8px">✓</div>' +
    '<div style="font-family: Yellowtail, cursive; color: #FF82D7; font-size: 36px; line-height: 1;">Signature reçue</div>' +
    '</td></tr>' +

    // Corps
    '<tr><td style="padding:8px 32px 16px 32px">' +
    '<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#191923">' +
    'Edward, <strong>' + escHtml(fullName) + '</strong> vient de signer ' +
    (bundle ? '<strong>2 documents</strong> :' : '<strong>' + escHtml(params.documentTypeLabel) + '</strong>.') +
    '</p>' +

    (bundle
      ? '<ul style="margin: 8px 0 16px 20px; padding: 0; color: #191923; font-size: 14px; line-height: 1.6;">' +
        '<li><strong>' + escHtml(params.documentTypeLabel) + '</strong></li>' +
        '<li><strong>Dossier de bienvenue Meshuga</strong></li>' +
        '</ul>'
      : ''
    ) +

    // Encart audit
    '<div style="background:#FAFAFA;border-left:4px solid #16A34A;padding:14px 18px;border-radius:4px;margin:18px 0;font-size:13px;line-height:1.6">' +
    '<div><strong>Signataire :</strong> ' + escHtml(fullName) + '</div>' +
    '<div><strong>Date :</strong> ' + escHtml(dateFr) + ' (heure de Paris)</div>' +
    '<div><strong>ID signature :</strong> ' + escHtml(params.signatureId) + '</div>' +
    '<div style="margin-top:6px;padding-top:6px;border-top:1px solid #EEE"><strong>Empreinte SHA-256 :</strong></div>' +
    '<div style="font-family:monospace;font-size:10px;word-break:break-all">' + escHtml(params.pdfHash) + '</div>' +
    '</div>' +

    // CTA voir le PDF signé
    '<p style="margin:20px 0 12px 0;font-size:14px;color:#191923">Cliquez pour voir le document signé :</p>' +

    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0"><tr><td align="center">' +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="#FF82D7" class="cta-btn-cell" style="background-color:#FF82D7;border-radius:8px"><tr><td bgcolor="#FF82D7" class="cta-btn-cell" align="center" style="background-color:#FF82D7;border-radius:8px;padding:0">' +
    '<a href="' + escAttr(params.signedPdfUrl) + '" class="cta-btn" style="display:inline-block;background-color:#FF82D7;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;font-family:Arial,Helvetica,sans-serif"><span style="color:#FFFFFF;text-decoration:none">Voir ' + escHtml(params.documentTypeLabel) + ' &rarr;</span></a>' +
    '</td></tr></table>' +
    '</td></tr></table>' +

    (bundle && params.signedWelcomePackUrl
      ? '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0"><tr><td align="center">' +
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="#FF82D7" class="cta-btn-cell" style="background-color:#FF82D7;border-radius:8px"><tr><td bgcolor="#FF82D7" class="cta-btn-cell" align="center" style="background-color:#FF82D7;border-radius:8px;padding:0">' +
        '<a href="' + escAttr(params.signedWelcomePackUrl) + '" class="cta-btn" style="display:inline-block;background-color:#FF82D7;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;font-family:Arial,Helvetica,sans-serif"><span style="color:#FFFFFF;text-decoration:none">Voir Dossier de bienvenue &rarr;</span></a>' +
        '</td></tr></table>' +
        '</td></tr></table>'
      : ''
    ) +

    '<p style="margin:18px 0 8px 0;font-size:12px;color:#666;line-height:1.5">' +
    'Liens valables 7 jours. Le document signé est aussi accessible en permanence depuis le dashboard Meshuga.' +
    '</p>' +

    '</td></tr>' +

    // Footer
    '<tr><td style="padding:20px 32px;background:#FAFAFA;border-top:1px solid #EEEEEE;text-align:center">' +
    '<p style="margin:0;font-size:11px;color:#999;line-height:1.5">' +
    '<strong>Meshuga RH</strong> · Notification automatique' +
    '</p>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>'

  var textContent =
    "Edward,\n\n" +
    fullName + " vient de signer " +
    (bundle ? "2 documents :\n" : params.documentTypeLabel + ".\n") +
    (bundle ? "- " + params.documentTypeLabel + "\n- Dossier de bienvenue Meshuga\n" : "") +
    "\nDate : " + dateFr + " (heure de Paris)\n" +
    "ID signature : " + params.signatureId + "\n\n" +
    "Voir le document signé :\n" + params.signedPdfUrl + "\n" +
    (bundle && params.signedWelcomePackUrl ? "Voir le dossier de bienvenue :\n" + params.signedWelcomePackUrl + "\n" : "") +
    "\nLiens valables 7 jours.\n\n" +
    "— Meshuga RH"

  return { subject: subject, htmlContent: htmlContent, textContent: textContent }
}
function escHtml(s: any): string {
  if (s === null || s === undefined) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function escAttr(s: any): string {
  if (s === null || s === undefined) return ""
  return String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}
