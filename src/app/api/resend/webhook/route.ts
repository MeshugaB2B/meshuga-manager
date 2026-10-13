// ============================================================
// src/app/api/resend/webhook/route.ts
// ============================================================
// Webhook Resend → statut de chaque mail de prospection en temps réel
// (délivré, ouvert, cliqué, rejeté, spam).
//
// Config Resend (Dashboard → Webhooks → Add endpoint) :
//   URL    : https://<dashboard>/api/resend/webhook
//   Events : email.sent, email.delivered, email.delivery_delayed,
//            email.bounced, email.complained, email.opened, email.clicked, email.failed
//   Copier le « Signing secret » (whsec_…) dans Vercel : RESEND_WEBHOOK_SECRET
//
// Signature Svix : HMAC-SHA256( base64decode(secret sans whsec_),
//   svix-id + "." + svix-timestamp + "." + body brut ), comparée aux
//   entrées « v1,<base64> » de l'en-tête svix-signature. Tolérance 5 min.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getServiceClient, eventTypeToStatus, applyStatus, isProspectionFrom } from '@/lib/prospectCrm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function verify(secret: string, id: string, ts: string, sigHeader: string, body: string): boolean {
  if (!secret || !id || !ts || !sigHeader) return false
  var now = Math.floor(Date.now() / 1000)
  var t = parseInt(ts, 10)
  if (!t || Math.abs(now - t) > 300) return false
  var key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  var expected = crypto.createHmac('sha256', key).update(id + '.' + ts + '.' + body).digest('base64')
  var exp = Buffer.from(expected)
  var parts = sigHeader.split(' ')
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i]
    if (p.indexOf('v1,') !== 0) continue
    var got = Buffer.from(p.slice(3))
    if (got.length === exp.length && crypto.timingSafeEqual(got, exp)) return true
  }
  return false
}

export async function POST(req: NextRequest) {
  var secret = process.env.RESEND_WEBHOOK_SECRET || ''
  if (!secret) return NextResponse.json({ ok: false, error: 'RESEND_WEBHOOK_SECRET manquante' }, { status: 500 })

  var raw = await req.text()
  var ok = verify(secret, req.headers.get('svix-id') || '', req.headers.get('svix-timestamp') || '', req.headers.get('svix-signature') || '', raw)
  if (!ok) return NextResponse.json({ ok: false, error: 'Signature invalide' }, { status: 401 })

  var evt: any = {}
  try { evt = JSON.parse(raw) } catch (e) { return NextResponse.json({ ok: false, error: 'JSON invalide' }, { status: 400 }) }

  var status = eventTypeToStatus(evt.type)
  var data = evt.data || {}
  var emailId = data.email_id || data.id
  if (!status || !emailId) return NextResponse.json({ ok: true, ignored: true })

  var sb = getServiceClient()
  if (!sb) return NextResponse.json({ ok: false, error: 'Supabase non configuré' }, { status: 500 })

  // Mail hors prospection (devis, factures, RH…) : on ignore
  if (data.from && !isProspectionFrom(data.from)) return NextResponse.json({ ok: true, ignored: true })

  var r = await sb.from('prospect_outreach').select('*').eq('resend_id', emailId).maybeSingle()
  if (!r.data) {
    // L'historique est écrit juste après l'envoi : un événement très rapide peut
    // arriver avant. On patiente un peu, puis on demande à Resend de réessayer.
    await new Promise(function (ok) { setTimeout(ok, 2500) })
    r = await sb.from('prospect_outreach').select('*').eq('resend_id', emailId).maybeSingle()
  }
  if (!r.data) {
    var age = Date.now() - Date.parse(String(evt.created_at || ''))
    if (age >= 0 && age < 30 * 60 * 1000) return NextResponse.json({ ok: false, retry: true }, { status: 404 })
    return NextResponse.json({ ok: true, ignored: true })
  }

  var bounce = data.bounce || {}
  var detail = ''
  if (status === 'bounced') detail = [bounce.type, bounce.subType].filter(Boolean).join(' / ') + (bounce.message ? ' — ' + bounce.message : '')
  if (status === 'failed') detail = (data.failed && data.failed.reason) || data.reason || 'Échec d’envoi'
  if (status === 'complained') detail = 'Le destinataire a signalé le mail comme spam'

  await applyStatus(sb, r.data, status, {
    at: evt.created_at || new Date().toISOString(),
    detail: detail,
    bounceType: bounce.type || '',
    countEvent: true
  })
  return NextResponse.json({ ok: true })
}
