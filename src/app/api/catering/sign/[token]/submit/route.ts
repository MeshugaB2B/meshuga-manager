import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function bad(msg: string, code?: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: code || 400 })
}

function clientIp(req: NextRequest): string {
  var fwd = req.headers.get('x-forwarded-for') || ''
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') || ''
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

  var signature = String(body.signature || '')
  var signerName = String(body.signerName || '').trim()
  var acceptedTerms = body.acceptedTerms === true
  var acceptedAccord = body.acceptedAccord === true
  var meta = body.meta && typeof body.meta === 'object' ? body.meta : {}

  if (!acceptedTerms || !acceptedAccord) return bad('Vous devez accepter les conditions pour signer.')
  if (signerName.length < 2) return bad('Merci d\u2019indiquer le nom du signataire.')
  if (signature.indexOf('data:image') !== 0 || signature.length < 200) return bad('Signature manquante.')

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Charger le devis par token
  var res = await supabase
    .from('devis')
    .select('id, numero, statut, config_data, signature_status, signed_at')
    .eq('signature_token', token)
    .single()
  if (res.error || !res.data) return bad('Lien invalide', 404)
  var d = res.data as any

  if (d.signature_status === 'signed') {
    return NextResponse.json({ ok: true, alreadySigned: true })
  }

  var signedAt = new Date().toISOString()
  var ip = clientIp(req)
  var ua = req.headers.get('user-agent') || ''

  // Hash d'intégrité eIDAS : config figée + identité + horodatage + signature
  var hashInput = JSON.stringify({
    devis_id: d.id,
    numero: d.numero,
    config: d.config_data || null,
    signer_name: signerName,
    signed_at: signedAt
  }) + '|' + signature
  var documentHash = createHash('sha256').update(hashInput).digest('hex')

  var audit = {
    method: 'signature_electronique_simple',
    signer_name: signerName,
    signed_at: signedAt,
    accepted_terms: acceptedTerms,
    accepted_accord: acceptedAccord,
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
    signature_image: signature,
    legal: 'Signature électronique horodatée — articles 1366 et 1367 du Code civil (eIDAS).'
  }

  var upd = await supabase
    .from('devis')
    .update({
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name: signerName,
      signature_audit_data: audit,
      statut: 'accepte'
    })
    .eq('id', d.id)
    .eq('signature_status', d.signature_status) // garde-fou anti double-signature concurrente

  if (upd.error) return bad('Enregistrement impossible : ' + upd.error.message, 500)

  // NB : génération du PDF signé + email d'acompte = étape suivante (Step 4).
  return NextResponse.json({ ok: true, documentHash: documentHash })
}
