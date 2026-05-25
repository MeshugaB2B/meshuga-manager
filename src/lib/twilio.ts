// ============================================================
// src/lib/twilio.ts
// ============================================================
// Helper Twilio standalone pour l'envoi de SMS.
//
// Volontairement écrit en fetch direct (pas le SDK npm @twilio/twilio)
// pour garder le bundle Vercel léger. Aucune dépendance supplémentaire.
//
// Variables d'environnement requises (à définir sur Vercel) :
//   - TWILIO_ACCOUNT_SID            (commence par AC...)
//   - TWILIO_AUTH_TOKEN             (32 caractères secrets)
//   - TWILIO_MESSAGING_SERVICE_SID  (commence par MG...)
//
// Utilisation :
//   import { sendTwilioSms, normalizePhoneFR } from "@/lib/twilio"
//   var phone = normalizePhoneFR(employee.telephone)
//   if (phone) {
//     var result = await sendTwilioSms({ to: phone, body: "Hello!" })
//   }
// ============================================================

export interface SendSmsParams {
  to: string         // doit être au format E.164 (ex: "+33624677866")
  body: string       // contenu du message (max ~1600 caractères, split auto en segments)
}

export interface SendSmsResult {
  ok: boolean
  sid?: string       // SID du message Twilio si succès (ex: "SM...")
  status?: string    // queued, sending, sent, delivered, failed, undelivered
  error?: string     // message d'erreur lisible si échec
  testMode?: boolean // true si on est en mode test (env vars manquantes)
}

// ============================================================
// normalizePhoneFR — Convertit un numéro FR en format E.164
// ============================================================
// Accepte tous les formats courants :
//   "+33 6 24 67 78 66"  →  "+33624677866"
//   "0613854067"         →  "+33613854067"
//   "06 64 75 91 31"     →  "+33664759131"
//   "0033612345678"      →  "+33612345678"
//   "612345678"          →  "+33612345678" (9 chiffres sans préfixe)
//
// Retourne null si le numéro est invalide ou n'est pas français.
// Pour les numéros internationaux non-FR, retourne null (à étendre si besoin).
//
export function normalizePhoneFR(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null
  // Nettoyer : enlever espaces, tirets, points, parenthèses
  var cleaned = input.replace(/[\s\-\.\(\)]/g, "").trim()
  if (!cleaned) return null

  // Cas 1 : déjà au format E.164 français (+33XXXXXXXXX, 12 chars)
  if (cleaned.match(/^\+33[1-9]\d{8}$/)) return cleaned

  // Cas 2 : +33 mais avec un 0 parasite après (+330612345678)
  if (cleaned.match(/^\+330[1-9]\d{8}$/)) return "+33" + cleaned.substring(4)

  // Cas 3 : préfixe 0033 (format international ancien)
  if (cleaned.match(/^0033[1-9]\d{8}$/)) return "+33" + cleaned.substring(4)

  // Cas 4 : format français standard 0XXXXXXXXX (10 chiffres)
  if (cleaned.match(/^0[1-9]\d{8}$/)) return "+33" + cleaned.substring(1)

  // Cas 5 : 9 chiffres sans préfixe (rare mais possible)
  if (cleaned.match(/^[1-9]\d{8}$/)) return "+33" + cleaned

  // Tout autre format = invalide (numéros étrangers, formats incorrects, etc.)
  return null
}

// ============================================================
// sendTwilioSms — Envoi d'un SMS via l'API REST Twilio
// ============================================================
// Utilise Basic Auth avec Account SID + Auth Token.
// Le sender est implicite : il vient du Messaging Service configuré
// (sender alphanumérique "MESHUGA" en FR).
//
export async function sendTwilioSms(params: SendSmsParams): Promise<SendSmsResult> {
  var accountSid = process.env.TWILIO_ACCOUNT_SID || ""
  var authToken = process.env.TWILIO_AUTH_TOKEN || ""
  var messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || ""

  // Mode test : si les variables d'env ne sont pas définies, on ne tente pas
  // d'envoyer et on retourne un succès simulé (utile en dev local).
  if (!accountSid || !authToken || !messagingServiceSid) {
    console.warn("[twilio] Variables d'env manquantes, mode test activé. SMS non envoyé.")
    return {
      ok: true,
      sid: "SM_TEST_MODE",
      status: "test",
      testMode: true,
    }
  }

  // Validation entrée
  if (!params.to || !params.to.match(/^\+\d{10,15}$/)) {
    return {
      ok: false,
      error: "Numéro destinataire invalide : " + params.to + " (attendu : format E.164 ex +33...)",
    }
  }
  if (!params.body || params.body.trim().length === 0) {
    return { ok: false, error: "Corps du message vide" }
  }

  // Construction de la requête API Twilio
  var url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json"
  var basicAuth = "Basic " + Buffer.from(accountSid + ":" + authToken).toString("base64")

  // Twilio attend du form-urlencoded, pas du JSON
  var formData = new URLSearchParams()
  formData.append("To", params.to)
  formData.append("MessagingServiceSid", messagingServiceSid)
  formData.append("Body", params.body)

  try {
    var res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": basicAuth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    })

    var data: any = await res.json()

    if (!res.ok) {
      // Twilio renvoie { code, message, more_info, status } en cas d'erreur
      var errMsg = (data && data.message) ? data.message : ("Erreur HTTP " + res.status)
      var errCode = (data && data.code) ? (" [code " + data.code + "]") : ""
      console.error("[twilio] Échec envoi SMS:", errMsg, errCode, "→", params.to)
      return { ok: false, error: errMsg + errCode }
    }

    return {
      ok: true,
      sid: data.sid,
      status: data.status,
    }
  } catch (e: any) {
    console.error("[twilio] Exception réseau:", e.message)
    return { ok: false, error: "Erreur réseau : " + (e.message || "inconnue") }
  }
}

// ============================================================
// buildSignatureSmsBody — Génère le corps du SMS d'invitation
// ============================================================
// Format demandé par Edward :
//   "Bonjour Emy, des documents légaux à signer ont été envoyés
//    par Meshuga. Clique sur le liens ci-dessous pour y accéder:
//    https://meshuga-manager.vercel.app/sign/abc123"
//
// Note : pas d'URL shortener (interdit en France par les opérateurs).
//
export function buildSignatureSmsBody(params: {
  prenom: string
  signatureUrl: string
}): string {
  var prenom = (params.prenom || "").trim()
  // Option C raccourcie : zero accent, ~155 caracteres avec URL = 1 segment GSM
  if (prenom) {
    return (
      "Bonjour " + prenom + ", Meshuga vous envoie un document a signer. " +
      "Lien : " + params.signatureUrl
    )
  }
  return (
    "Bonjour, Meshuga vous envoie un document a signer. " +
    "Lien : " + params.signatureUrl
  )
}

// ============================================================
// buildRelanceSmsBody — SMS de relance quotidienne (J+N)
// ============================================================
// Envoye par le cron quotidien tant que le document n'est pas signe.
// Ton plus pressant mais courtois.
// ~145 caracteres avec URL = 1 segment GSM. Zero accent.
//
export function buildRelanceSmsBody(params: {
  prenom: string
  signatureUrl: string
  daysSinceSent: number
}): string {
  var prenom = (params.prenom || "").trim()
  var greeting = prenom ? ("Bonjour " + prenom + ", ") : "Bonjour, "
  return (
    greeting +
    "rappel Meshuga : votre document n'est pas encore signe. " +
    "Lien : " + params.signatureUrl
  )
}

// ============================================================
// buildEdwardSignatureNotifSms — Notification a Edward (signataire)
// ============================================================
// Envoye a Edward des qu'un salarie a signe. Inclut le lien vers
// le PDF signe (URL signee Supabase valable plusieurs jours).
//
export function buildEdwardSignatureNotifSms(params: {
  signerName: string
  documentLabel: string
  signedPdfUrl: string
}): string {
  var name = (params.signerName || "Un salarie").trim()
  var label = (params.documentLabel || "document").trim()
  return (
    "Meshuga RH : " + name + " vient de signer " + label + ". " +
    "Document signe : " + params.signedPdfUrl
  )
}
