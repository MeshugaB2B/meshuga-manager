// ============================================================
// src/app/api/prospect-email/send/route.ts
// ============================================================
// Envoie un pitch prospect via Resend (même template que l'aperçu).
// Body : { recipients: [{ email, firstName?, lastName?, civility? }] (ou `to` legacy),
//          cc?, subject, body, senderKey, pressKeys, showReferences,
//          showTv, attachPlaquette, prospectId?, prospectName? }
// Multi-destinataires : 1 mail individuel par destinataire, salutation
// personnalisée (prénom, sinon civilité + nom). Le Cc n'est mis que sur le
// 1er envoi (sinon il recevrait N fois le mail).
// From : "<Prénom> · Meshuga Events <events@meshuga.fr>"
// Reply-To : hello@meshuga.fr ; copie cachée hello@meshuga.fr (le mail envoyé
// et les réponses se retrouvent dans la même boîte)
// Si prospectId (CRM) : maj last_contacted_at (+ statut to_contact → contacted)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { buildProspectEmailHtml, buildProspectEmailText, getSender, isValidEmail, sanitizePressKeys, sanitizeRecipients, personalizeBody, personalizeText, FROM_EMAIL, REPLY_TO_EMAIL, PLAQUETTE } from '@/lib/prospectEmail'

export const runtime = 'nodejs'
export const maxDuration = 60

var FROM_ADDRESS = FROM_EMAIL
var BCC_ARCHIVE = REPLY_TO_EMAIL

var MAX_RECIPIENTS = 40

function sleep(ms: number) {
  return new Promise(function (resolve) { setTimeout(resolve, ms) })
}

function bad(msg: string, status?: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: status || 400 })
}

export async function POST(req: NextRequest) {
  if (!process.env.RESEND_API_KEY) return bad('RESEND_API_KEY manquante', 500)

  var b: any
  try { b = await req.json() } catch (e) { return bad('JSON invalide') }

  var recipients = sanitizeRecipients(b && b.recipients)
  if (!recipients.length && b && b.to) recipients = sanitizeRecipients([{ email: b.to }])
  var cc = String((b && b.cc) || '').trim().toLowerCase()
  var subject = String((b && b.subject) || '').trim()
  var bodyText = String((b && b.body) || '').trim()
  var senderKey = b && b.senderKey === 'emy' ? 'emy' : 'edward'
  var sender = getSender(senderKey)

  if (!recipients.length) return bad('Aucun destinataire')
  if (recipients.length > MAX_RECIPIENTS) return bad('Trop de destinataires (max ' + MAX_RECIPIENTS + ')')
  for (var i = 0; i < recipients.length; i++) {
    if (!isValidEmail(recipients[i].email)) return bad('Adresse destinataire invalide : ' + recipients[i].email)
  }
  if (cc && !isValidEmail(cc)) return bad('Adresse en copie invalide')
  if (!subject) return bad('Objet requis')
  if (bodyText.length < 20) return bad('Corps du mail trop court')

  var origin = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'https://dashboard.meshuga.fr'
  var common = {
    baseUrl: origin,
    senderKey: senderKey,
    pressKeys: sanitizePressKeys(b.pressKeys),
    showReferences: b.showReferences !== false,
    showTv: b.showTv !== false,
    attachPlaquette: b.attachPlaquette !== false
  }
  var fileBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://meshuga-manager.vercel.app').replace(/\/$/, '')

  var resend = new Resend(process.env.RESEND_API_KEY)
  var sentList: any[] = []
  var failed: any[] = []

  for (var k = 0; k < recipients.length; k++) {
    var r = recipients[k]
    var subj = personalizeText(subject, r).trim() || subject
    var opts = Object.assign({}, common, { subject: subj, body: personalizeBody(bodyText, r) })
    var payload: any = {
      from: sender.firstName + ' · Meshuga Events <' + FROM_ADDRESS + '>',
      to: [r.email],
      subject: subj,
      html: buildProspectEmailHtml(opts),
      text: buildProspectEmailText(opts),
      reply_to: REPLY_TO_EMAIL
    }
    var withCc = k === 0 && cc && cc !== r.email
    if (withCc) payload.cc = [cc]
    // Plaquette : Resend va chercher le PDF sur notre domaine (dossier /public)
    if (opts.attachPlaquette) {
      payload.attachments = [{ filename: PLAQUETTE.filename, path: fileBase + PLAQUETTE.path }]
    }
    if (r.email !== BCC_ARCHIVE && !(withCc && cc === BCC_ARCHIVE)) payload.bcc = [BCC_ARCHIVE]

    // Resend limite à ~2 req/s → petite pause entre deux envois
    if (k > 0) await sleep(600)
    try {
      var sent: any = await resend.emails.send(payload)
      if (sent && sent.error) {
        failed.push({ email: r.email, error: sent.error.message || JSON.stringify(sent.error) })
      } else {
        sentList.push({ email: r.email, id: sent && sent.data ? sent.data.id : null })
      }
    } catch (e: any) {
      failed.push({ email: r.email, error: e && e.message ? e.message : 'inconnue' })
    }
  }

  if (!sentList.length) {
    return bad('Aucun mail envoyé — ' + failed.map(function (f) { return f.email + ' : ' + f.error }).join(' | '), 500)
  }

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
    emailId: sentList[0] ? sentList[0].id : null,
    sent: sentList,
    failed: failed,
    sentAt: sentAt,
    newStatus: newStatus
  })
}
