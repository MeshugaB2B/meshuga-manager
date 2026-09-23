// ============================================================
// src/app/api/prospect-email/send/route.ts
// ============================================================
// Envoie un pitch prospect via Resend (même template que l'aperçu).
// Body : { to, cc?, subject, body, senderKey, pressKeys, showReferences,
//          showTv, prospectId?, prospectName? }
// From : "<Prénom> · Meshuga Events <events@meshuga.fr>"
// Reply-To : hello@meshuga.fr ; copie cachée hello@meshuga.fr (le mail envoyé
// et les réponses se retrouvent dans la même boîte)
// Si prospectId (CRM) : maj last_contacted_at (+ statut to_contact → contacted)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { buildProspectEmailHtml, buildProspectEmailText, getSender, isValidEmail, sanitizePressKeys, FROM_EMAIL, REPLY_TO_EMAIL } from '@/lib/prospectEmail'

export const runtime = 'nodejs'
export const maxDuration = 30

var FROM_ADDRESS = FROM_EMAIL
var BCC_ARCHIVE = REPLY_TO_EMAIL

function bad(msg: string, status?: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: status || 400 })
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) return bad('RESEND_API_KEY manquante', 500)

  var b: any
  try { b = await req.json() } catch (e) { return bad('JSON invalide') }

  var to = String((b && b.to) || '').trim().toLowerCase()
  var cc = String((b && b.cc) || '').trim().toLowerCase()
  var subject = String((b && b.subject) || '').trim()
  var bodyText = String((b && b.body) || '').trim()
  var senderKey = b && b.senderKey === 'emy' ? 'emy' : 'edward'
  var sender = getSender(senderKey)

  if (!isValidEmail(to)) return bad('Adresse destinataire invalide')
  if (cc && !isValidEmail(cc)) return bad('Adresse en copie invalide')
  if (!subject) return bad('Objet requis')
  if (bodyText.length < 20) return bad('Corps du mail trop court')

  var origin = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'https://dashboard.meshuga.fr'
  var opts = {
    baseUrl: origin,
    senderKey: senderKey,
    subject: subject,
    body: bodyText,
    pressKeys: sanitizePressKeys(b.pressKeys),
    showReferences: b.showReferences !== false,
    showTv: b.showTv !== false
  }

  var payload: any = {
    from: sender.firstName + ' · Meshuga Events <' + FROM_ADDRESS + '>',
    to: [to],
    subject: subject,
    html: buildProspectEmailHtml(opts),
    text: buildProspectEmailText(opts),
    reply_to: REPLY_TO_EMAIL
  }
  if (cc) payload.cc = [cc]
  if (to !== BCC_ARCHIVE && cc !== BCC_ARCHIVE) payload.bcc = [BCC_ARCHIVE]

  var resend = new Resend(process.env.RESEND_API_KEY)
  var sent: any
  try {
    sent = await resend.emails.send(payload)
  } catch (e: any) {
    return bad('Erreur Resend : ' + (e && e.message ? e.message : 'inconnue'), 500)
  }
  if (sent && sent.error) return bad('Resend a refusé : ' + (sent.error.message || JSON.stringify(sent.error)), 500)

  var sentAt = new Date().toISOString()
  var newStatus: any = null

  // Maj CRM (best effort — le mail est parti quoi qu'il arrive)
  var prospectId = b && b.prospectId ? String(b.prospectId) : ''
  var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (prospectId && SUPABASE_URL && SUPABASE_KEY) {
    try {
      var sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
      var cur = await sb.from('prospects').select('status').eq('id', prospectId).single()
      var patch: any = { last_contacted_at: sentAt, updated_at: sentAt }
      if (cur.data && (!cur.data.status || cur.data.status === 'to_contact')) {
        patch.status = 'contacted'
        newStatus = 'contacted'
      }
      await sb.from('prospects').update(patch).eq('id', prospectId)
    } catch (e) {
      console.error('[prospect-email] maj CRM échouée', e)
    }
  }

  return NextResponse.json({
    ok: true,
    emailId: sent && sent.data ? sent.data.id : null,
    sentAt: sentAt,
    newStatus: newStatus
  })
}
