import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { sendTwilioSms, normalizePhoneFR } from '@/lib/twilio'
import { sendBrevoEmail } from '@/lib/brevo'

export const runtime = 'nodejs'

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function bad(msg: string, code?: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: code || 400 })
}

function hashCode(code: string, token: string): string {
  return createHash('sha256').update(code + '|' + token).digest('hex')
}

function maskPhone(e164: string): string {
  // +33624677866 -> +33 6 ** ** ** 66
  if (!e164 || e164.length < 4) return 'votre mobile'
  var tail = e164.slice(-2)
  return e164.slice(0, 3) + ' ' + e164.charAt(3) + ' ** ** ** ' + tail
}

function maskEmail(email: string): string {
  // camille.roux@acme.fr -> c******x@acme.fr
  var at = email.indexOf('@')
  if (at < 1) return 'votre email'
  var local = email.slice(0, at)
  var domain = email.slice(at)
  if (local.length <= 2) return local.charAt(0) + '***' + domain
  return local.charAt(0) + '******' + local.charAt(local.length - 1) + domain
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

// HTML email du code OTP (dark-mode safe, sobre)
function buildOtpEmailHtml(code: string, numero: string): string {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">' +
    '</head><body style="margin:0;background:#FFFDF5;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<div style="max-width:480px;margin:0 auto;padding:24px">' +
    '<div style="background:#FF82D7;border:3px solid #191923;border-radius:14px 14px 0 0;padding:18px;text-align:center">' +
    '<div style="color:#FFFFFF;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase">Meshuga Events &middot; Paris</div></div>' +
    '<div style="background:#FFFFFF;border:3px solid #191923;border-top:none;border-radius:0 0 14px 14px;padding:22px;text-align:center">' +
    '<p style="font-size:15px;margin:0 0 14px">Voici votre code de signature pour le devis <strong>' + numero + '</strong> :</p>' +
    '<div style="font-size:34px;font-weight:900;letter-spacing:10px;background:#FFEB5A;border:2px solid #191923;border-radius:10px;padding:14px 0;margin:0 0 14px">' + code + '</div>' +
    '<p style="font-size:13px;color:#555;margin:0">Ce code est valable 10 minutes. Ne le partagez avec personne.</p>' +
    '</div>' +
    '<div style="text-align:center;font-size:11px;color:#999;padding:14px">SAS AEGIA FOOD (enseigne MESHUGA) &middot; 3 rue Vavin 75006 Paris</div>' +
    '</div></body></html>'
}

export async function POST(req: NextRequest, ctx: { params: { token: string } }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return bad('Configuration serveur manquante', 500)

  var token = ctx.params.token || ''
  if (!token) return bad('Lien invalide', 404)

  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return bad('Requête invalide')
  }

  var acceptedTerms = body.acceptedTerms === true
  var acceptedAccord = body.acceptedAccord === true
  var signerName = String(body.signerName || '').trim()
  var channel = String(body.channel || 'sms').trim().toLowerCase()
  if (channel !== 'email') channel = 'sms'

  if (!acceptedTerms || !acceptedAccord) return bad('Vous devez accepter les conditions.')
  if (signerName.length < 2) return bad('Merci d\u2019indiquer le nom du signataire.')

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  var res = await supabase
    .from('devis')
    .select('id, numero, signature_status')
    .eq('signature_token', token)
    .single()
  if (res.error || !res.data) return bad('Lien invalide', 404)
  var d = res.data as any
  if (d.signature_status === 'signed') return bad('Ce devis a déjà été signé.', 409)

  // Destinataire selon le canal
  var phone = ''
  var email = ''
  if (channel === 'sms') {
    phone = normalizePhoneFR(String(body.phone || '').trim())
    if (!phone) return bad('Numéro de mobile invalide. Indiquez un mobile français (ex : 06 12 34 56 78).')
  } else {
    email = String(body.email || '').trim().toLowerCase()
    if (!isValidEmail(email)) return bad('Adresse email invalide.')
  }

  // Code à 6 chiffres
  var code = String(Math.floor(100000 + Math.random() * 900000))
  var expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  var upd = await supabase
    .from('devis')
    .update({
      signature_otp_hash: hashCode(code, token),
      signature_otp_expires_at: expiresAt,
      signature_otp_phone: channel === 'sms' ? phone : null,
      signature_otp_email: channel === 'email' ? email : null,
      signature_otp_channel: channel,
      signature_otp_attempts: 0
    })
    .eq('id', d.id)
  if (upd.error) return bad('Impossible de préparer le code : ' + upd.error.message, 500)

  if (channel === 'sms') {
    var smsBody = 'Meshuga : votre code de signature pour le devis ' + (d.numero || '') + ' est ' + code + ' (valable 10 min). Ne le partagez pas.'
    var sent = await sendTwilioSms({ to: phone, body: smsBody })
    if (!sent.ok) return bad('Envoi du SMS impossible. Vérifiez votre numéro de mobile.', 502)
    return NextResponse.json({ ok: true, channel: 'sms', destMasked: maskPhone(phone), testMode: sent.testMode === true })
  }

  // Email via Brevo
  var emailRes = await sendBrevoEmail({
    to: [{ email: email, name: signerName }],
    sender: { email: 'hello@meshuga.fr', name: 'Meshuga Events' },
    subject: 'Votre code de signature \u2014 devis ' + (d.numero || ''),
    htmlContent: buildOtpEmailHtml(code, d.numero || ''),
    textContent: 'Votre code de signature pour le devis ' + (d.numero || '') + ' est ' + code + ' (valable 10 min). Ne le partagez pas.'
  })
  if (!emailRes || emailRes.ok !== true) return bad('Envoi de l\u2019email impossible. Vérifiez votre adresse.', 502)
  return NextResponse.json({ ok: true, channel: 'email', destMasked: maskEmail(email) })
}
