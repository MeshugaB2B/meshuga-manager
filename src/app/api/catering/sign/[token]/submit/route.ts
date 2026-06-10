import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
var MAX_OTP_ATTEMPTS = 5

function bad(msg: string, code?: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: code || 400 })
}

function clientIp(req: NextRequest): string {
  var fwd = req.headers.get('x-forwarded-for') || ''
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || ''
}

function hashCode(code: string, token: string): string {
  return createHash('sha256').update(code + '|' + token).digest('hex')
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

  var signerName = String(body.signerName || '').trim()
  var signatureTyped = String(body.signatureTyped || body.signerName || '').trim()
  var otp = String(body.otp || '').replace(/[^0-9]/g, '')
  var acceptedTerms = body.acceptedTerms === true
  var acceptedAccord = body.acceptedAccord === true
  var meta = body.meta && typeof body.meta === 'object' ? body.meta : {}

  if (!acceptedTerms || !acceptedAccord) return bad('Vous devez accepter les conditions pour signer.')
  if (signerName.length < 2) return bad('Merci d\u2019indiquer le nom du signataire.')
  if (otp.length !== 6) return bad('Code à 6 chiffres requis.')

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  var res = await supabase
    .from('devis')
    .select('id, numero, statut, config_data, signature_status, signed_at, signature_otp_hash, signature_otp_expires_at, signature_otp_phone, signature_otp_attempts')
    .eq('signature_token', token)
    .single()
  if (res.error || !res.data) return bad('Lien invalide', 404)
  var d = res.data as any

  if (d.signature_status === 'signed') {
    return NextResponse.json({ ok: true, alreadySigned: true })
  }

  // --- Vérification du code OTP ---
  if (!d.signature_otp_hash || !d.signature_otp_expires_at) {
    return bad('Aucun code en attente. Demandez un nouveau code.')
  }
  if (new Date(d.signature_otp_expires_at).getTime() < Date.now()) {
    return bad('Code expiré. Demandez un nouveau code.')
  }
  if ((Number(d.signature_otp_attempts) || 0) >= MAX_OTP_ATTEMPTS) {
    return bad('Trop de tentatives. Demandez un nouveau code.')
  }
  if (hashCode(otp, token) !== d.signature_otp_hash) {
    await supabase
      .from('devis')
      .update({ signature_otp_attempts: (Number(d.signature_otp_attempts) || 0) + 1 })
      .eq('id', d.id)
    return bad('Code incorrect. Vérifiez le SMS reçu.')
  }

  // --- Code valide : on signe ---
  var signedAt = new Date().toISOString()
  var ip = clientIp(req)
  var ua = req.headers.get('user-agent') || ''
  var verifiedPhone = d.signature_otp_phone || ''

  var hashInput = JSON.stringify({
    devis_id: d.id,
    numero: d.numero,
    config: d.config_data || null,
    signer_name: signerName,
    signature_typed: signatureTyped,
    phone: verifiedPhone,
    signed_at: signedAt
  })
  var documentHash = createHash('sha256').update(hashInput).digest('hex')

  var audit = {
    method: 'signature_electronique_otp_sms',
    signer_name: signerName,
    signature_typed: signatureTyped,
    signed_at: signedAt,
    accepted_terms: acceptedTerms,
    accepted_accord: acceptedAccord,
    otp_verified: true,
    otp_channel: 'sms',
    verified_phone: verifiedPhone,
    ip: ip,
    user_agent: ua,
    client_meta: {
      ua: String(meta.ua || ''),
      tz: String(meta.tz || ''),
      screen: String(meta.screen || ''),
      lang: String(meta.lang || ''),
      client_time: String(meta.clientTime || '')
    },
    document_sha256: documentHash,
    legal: 'Signature électronique vérifiée par code SMS et horodatée — articles 1366 et 1367 du Code civil (eIDAS).'
  }

  var upd = await supabase
    .from('devis')
    .update({
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name: signerName,
      signer_phone: verifiedPhone,
      signature_audit_data: audit,
      statut: 'accepte',
      // on purge le code OTP après usage
      signature_otp_hash: null,
      signature_otp_expires_at: null,
      signature_otp_attempts: 0
    })
    .eq('id', d.id)
    .eq('signature_status', d.signature_status) // garde-fou anti double-signature concurrente
  if (upd.error) return bad('Enregistrement impossible : ' + upd.error.message, 500)

  // NB : génération du PDF signé + email d'acompte = étape suivante (Step 4).
  return NextResponse.json({ ok: true, documentHash: documentHash })
}
