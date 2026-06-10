import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { sendTwilioSms, normalizePhoneFR } from '@/lib/twilio'

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
  var rawPhone = String(body.phone || '').trim()

  if (!acceptedTerms || !acceptedAccord) return bad('Vous devez accepter les conditions.')
  if (signerName.length < 2) return bad('Merci d\u2019indiquer le nom du signataire.')

  var phone = normalizePhoneFR(rawPhone)
  if (!phone) return bad('Numéro de mobile invalide. Indiquez un mobile français (ex : 06 12 34 56 78).')

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

  // Code à 6 chiffres
  var code = String(Math.floor(100000 + Math.random() * 900000))
  var expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  var upd = await supabase
    .from('devis')
    .update({
      signature_otp_hash: hashCode(code, token),
      signature_otp_expires_at: expiresAt,
      signature_otp_phone: phone,
      signature_otp_attempts: 0
    })
    .eq('id', d.id)
  if (upd.error) return bad('Impossible de préparer le code : ' + upd.error.message, 500)

  // Envoi SMS (Body sans accents, 1 segment GSM)
  var smsBody = 'Meshuga : votre code de signature pour le devis ' + (d.numero || '') + ' est ' + code + ' (valable 10 min). Ne le partagez pas.'
  var sent = await sendTwilioSms({ to: phone, body: smsBody })

  if (!sent.ok) {
    return bad('Envoi du SMS impossible. Vérifiez votre numéro de mobile.', 502)
  }

  return NextResponse.json({ ok: true, phoneMasked: maskPhone(phone), testMode: sent.testMode === true })
}
