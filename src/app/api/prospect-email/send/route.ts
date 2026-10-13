// ============================================================
// src/app/api/prospect-email/send/route.ts
// ============================================================
// Envoie un pitch prospect via Resend (même template que l'aperçu).
// Body : { recipients: [{ email, firstName?, lastName?, civility? }] (ou `to` legacy),
//          cc?, subject, body, senderKey, pressKeys, showReferences,
//          showTv, attachPlaquette, emailType?,
//          prospectKind? ('crm' | 'chasse'), prospectRef?, prospectId? (legacy = crm),
//          prospectName?, createdBy? }
// Multi-destinataires : 1 mail individuel par destinataire, salutation
// personnalisée. Le Cc n'est mis que sur le 1er envoi.
// From : "<Prénom> · Meshuga Events <events@meshuga.fr>" ; Reply-To + Bcc hello@
//
// CRM (si prospect identifié) : chaque mail est historisé dans
// prospect_outreach (avec l'id Resend → statut délivré / rejeté via webhook),
// la relance prévue est clôturée et la suivante est planifiée.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { isValidEmail, sanitizeRecipients } from '@/lib/prospectEmail'
import { getServiceClient, sendProspectEmails, recordContact } from '@/lib/prospectCrm'

export const runtime = 'nodejs'
export const maxDuration = 60

var MAX_RECIPIENTS = 40

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
  var emailType = ['first', 'relance', 'devis_relance'].indexOf(String(b && b.emailType)) >= 0 ? String(b.emailType) : 'first'

  if (!recipients.length) return bad('Aucun destinataire')
  if (recipients.length > MAX_RECIPIENTS) return bad('Trop de destinataires (max ' + MAX_RECIPIENTS + ')')
  for (var i = 0; i < recipients.length; i++) {
    if (!isValidEmail(recipients[i].email)) return bad('Adresse destinataire invalide : ' + recipients[i].email)
  }
  if (cc && !isValidEmail(cc)) return bad('Adresse en copie invalide')
  if (!subject) return bad('Objet requis')
  if (bodyText.length < 20) return bad('Corps du mail trop court')

  var origin = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'https://dashboard.meshuga.fr'
  var result = await sendProspectEmails({
    origin: origin, recipients: recipients, cc: cc, subject: subject, body: bodyText, senderKey: senderKey,
    pressKeys: b.pressKeys, showReferences: b.showReferences, showTv: b.showTv, attachPlaquette: b.attachPlaquette
  })
  var sentList = result.sent
  var failed = result.failed

  if (!sentList.length) {
    return bad('Aucun mail envoyé — ' + failed.map(function (f: any) { return f.email + ' : ' + f.error }).join(' | '), 500)
  }

  var sentAt = new Date().toISOString()
  var newStatus: any = null
  var next: any = null

  // Historique CRM (best effort — le mail est parti quoi qu'il arrive)
  var kind = b && b.prospectKind === 'chasse' ? 'chasse' : 'crm'
  var ref = String((b && (b.prospectRef || b.prospectId)) || '')
  var sb = getServiceClient()
  if (ref && sb) {
    try {
      var rec = await recordContact(sb, {
        kind: kind, ref: ref, name: String((b && b.prospectName) || ''), channel: 'email', emailType: emailType,
        senderKey: senderKey, sentMode: 'manual', createdBy: String((b && b.createdBy) || senderKey),
        items: sentList.map(function (s: any) {
          return { resendId: s.id, to: s.email, firstName: s.recipient.firstName, lastName: s.recipient.lastName, civility: s.recipient.civility, subject: s.subject, body: s.body }
        })
      })
      newStatus = rec.newStatus
      next = rec.next
      sentAt = rec.sentAt
    } catch (e) {
      console.error('[prospect-email] historique CRM échoué', e)
    }
  }

  return NextResponse.json({
    ok: true,
    emailId: sentList[0] ? sentList[0].id : null,
    sent: sentList.map(function (s: any) { return { email: s.email, id: s.id } }),
    failed: failed,
    sentAt: sentAt,
    newStatus: newStatus,
    nextFollowup: next
  })
}
