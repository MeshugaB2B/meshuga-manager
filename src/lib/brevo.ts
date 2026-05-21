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
  email: "events@meshuga.fr",
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
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/></head>' +
    '<body style="margin:0;padding:0;background:#FFEB5A;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFEB5A;padding:24px 0">' +
    '<tr><td align="center">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)">' +

    // Header rose Meshuga
    '<tr><td style="background:#FF82D7;padding:32px 32px 28px 32px;text-align:center">' +
    '<div style="font-family:Georgia,serif;font-size:42px;line-height:1;color:#FFFFFF;font-style:italic">Meshuga</div>' +
    '<div style="margin-top:6px;font-size:11px;letter-spacing:2px;color:#FFFFFF;text-transform:uppercase;font-weight:700">Crazy Deli</div>' +
    '</td></tr>' +

    // Corps
    '<tr><td style="padding:32px 32px 16px 32px">' +
    '<h1 style="margin:0 0 16px 0;font-size:22px;color:#191923;font-weight:700;line-height:1.3">' + escHtml(greetingFull) + ',</h1>' +
    '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#191923">' +
    'Vous recevez ce message pour effectuer la signature électronique ' +
    (bundle ? 'de <strong>2 documents</strong> :' : 'du document suivant :') +
    '</p>' +
    docsList +

    '<p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#191923">' +
    'La signature se fait en quelques minutes depuis votre téléphone ou ordinateur. Aucune impression ni signature manuscrite n\'est nécessaire.' +
    '</p>' +

    // CTA bouton
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 24px 0"><tr><td align="center">' +
    '<a href="' + escAttr(params.signatureUrl) + '" style="display:inline-block;background:#FF82D7;color:#FFFFFF;text-decoration:none;padding:16px 32px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:0.5px">Signer mes documents →</a>' +
    '</td></tr></table>' +

    '<p style="margin:24px 0 8px 0;font-size:13px;line-height:1.5;color:#666">' +
    '<strong>Lien valable ' + expires + ' jours.</strong> Si le bouton ne fonctionne pas, copiez-collez cette adresse dans votre navigateur :' +
    '</p>' +
    '<p style="margin:0 0 16px 0;font-size:12px;line-height:1.4;color:#666;word-break:break-all">' +
    '<a href="' + escAttr(params.signatureUrl) + '" style="color:#FF82D7">' + escHtml(params.signatureUrl) + '</a>' +
    '</p>' +

    '<p style="margin:24px 0 0 0;font-size:15px;line-height:1.6;color:#191923">' +
    'Pour toute question, vous pouvez me contacter directement.' +
    '</p>' +
    '<p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;color:#191923">' +
    'Bien à vous,<br>' +
    '<strong>' + escHtml(senderName) + '</strong><br>' +
    '<span style="color:#666;font-size:13px">Président · SAS AEGIA FOOD</span>' +
    '</p>' +
    '</td></tr>' +

    // Footer
    '<tr><td style="padding:24px 32px;background:#FAFAFA;border-top:1px solid #EEEEEE;text-align:center">' +
    '<p style="margin:0;font-size:11px;line-height:1.5;color:#999">' +
    'Cet email vous a été envoyé par <strong>Meshuga Crazy Deli</strong>.<br>' +
    'Signature électronique conforme art. 1367 C. civ. + eIDAS UE 910/2014.<br>' +
    '3 rue Vavin, 75006 Paris · SIREN 904 639 531' +
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
    "Meshuga Crazy Deli · 3 rue Vavin, 75006 Paris\n" +
    "Signature électronique conforme art. 1367 C. civ. + eIDAS UE 910/2014."

  return { subject: subject, htmlContent: htmlContent, textContent: textContent }
}

// === Helpers HTML escape ===
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
