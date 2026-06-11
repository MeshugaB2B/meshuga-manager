// app/api/catering/send-devis/route.ts
// Phase 4V2 — Envoie un devis catering par email via Resend, archive le HTML dans Supabase Storage,
// met à jour le statut du devis en base.
//
// Body attendu (JSON) :
// {
//   devisId: string,
//   to: string,           // destinataire client
//   cc?: string,          // optionnel
//   bcc?: string,         // bcc archive (events@meshuga.fr par défaut)
//   subject: string,
//   message: string,      // corps du mail (texte simple, on le wrappe en HTML)
//   pdfHtml: string       // le HTML complet du devis (généré côté client par generateCateringPdfHtml)
// }
//
// Réponse :
// { ok: true, sentAt: ISO, pdfStoragePath: string, publicUrl: string }
// ou : { ok: false, error: string }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { LOGO_PINK } from '@/app/dashboard/logos'

export const runtime = 'nodejs'
export const maxDuration = 30

// --- ENV ---
var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
var RESEND_API_KEY = process.env.RESEND_API_KEY || ''
var EMAIL_FROM_DEFAULT = 'events@meshuga.fr'
var EMAIL_FROM_NAME = 'Meshuga Events'
var BCC_ARCHIVE_DEFAULT = 'events@meshuga.fr'
var BUCKET = 'catering-quotes-pdfs'

// --- Helpers ---

function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 })
}

function serverError(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 500 })
}

function sanitizeEmail(s: any): string {
  if (!s || typeof s !== 'string') return ''
  return s.trim().toLowerCase()
}

function isValidEmail(s: string): boolean {
  if (!s) return false
  // simple regex robust enough for our use
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

// Wrappe un message texte simple en HTML stylé Meshuga (pour le corps du mail uniquement)
// Met en forme intelligemment : titre "Récapitulatif :", lignes "•", montants en gras.
function buildEmailHtml(messageText: string, devisNumero: string, pdfPublicUrl: string, origin: string): string {
  // Étape 1 : escape HTML (sécurité)
  var safe = (messageText || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Étape 2 : formatage par ligne pour structure (récap, bullets, montants en gras)
  var lines = safe.split('\n')
  var rendered: string[] = []
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    var trimmed = line.trim()
    // Ligne titre récap
    if (/^Récapitulatif\s*:/i.test(trimmed)) {
      rendered.push('<div style="font-weight:900;color:#191923;margin-top:14px;margin-bottom:6px;font-size:14px">' + trimmed + '</div>')
      continue
    }
    // Ligne bullet "•" → liste stylée
    if (/^•\s/.test(trimmed)) {
      var bulletContent = trimmed.replace(/^•\s/, '')
      // Mise en gras des montants (€) et personnes
      bulletContent = bulletContent.replace(
        /(\d[\d\s]*[.,]?\d*\s*€[^\s,)]*(?:\s*\/\s*personne)?)/g,
        '<strong>$1</strong>'
      )
      // Met en gras "X personnes"
      bulletContent = bulletContent.replace(
        /(\d+\s*personnes?)/gi,
        '<strong>$1</strong>'
      )
      rendered.push('<div style="margin-left:6px;margin-bottom:4px;line-height:1.5;font-size:14px;color:#191923">▸ ' + bulletContent + '</div>')
      continue
    }
    // Ligne vide
    if (trimmed === '') {
      rendered.push('<div style="height:10px"></div>')
      continue
    }
    // Ligne normale
    rendered.push('<div style="margin-bottom:6px;line-height:1.6;font-size:14px;color:#191923">' + line + '</div>')
  }
  var bodyHtml = rendered.join('')

  var ogBase = (origin || '').replace(/\/$/, '')
  var ctaLabel = 'Je découvre mon devis'
  var ctaImg = ogBase + '/api/og/yellowtail?text=' + encodeURIComponent(ctaLabel) + '&size=32&color=FFFFFF'
  var heroImg = ogBase + '/api/og/yellowtail?text=' + encodeURIComponent('Votre devis est prêt !') + '&size=40&color=FF82D7'

  return (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<style>' +
    ':root{color-scheme:light only;supported-color-schemes:light only}' +
    '@media (max-width:620px){.cardw{width:100%!important}.px{padding-left:22px!important;padding-right:22px!important}}' +
    // Neutralise la réécriture des couleurs en mode sombre (Apple Mail / Outlook)
    '[data-ochsdarkmode] .cardw,[data-ochsdarkmode] .lightbg{background:#FFFFFF!important}' +
    '[data-ochsdarkmode] .rosebg{background:#FF82D7!important}' +
    '[data-ochsdarkmode] .yellowbg{background:#FFEB5A!important}' +
    '[data-ochsdarkmode] .pagebg{background:#FFFDF5!important}' +
    '[data-ochsdarkmode] .ink{color:#191923!important}' +
    '[data-ochsdarkmode] .white{color:#FFFFFF!important}' +
    '</style>' +
    '</head>' +
    '<body class="pagebg" bgcolor="#FFFDF5" style="margin:0;padding:0;background:#FFFDF5;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFDF5" class="pagebg" style="background:#FFFDF5"><tr><td align="center" style="padding:26px 12px">' +
      '<table role="presentation" class="cardw lightbg" width="600" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:600px;max-width:600px;background:#FFFFFF;border:3px solid #191923;border-radius:16px;box-shadow:7px 7px 0 #FF82D7">' +
        // Logo rose sur blanc (haut de carte)
        '<tr><td class="px lightbg" bgcolor="#FFFFFF" style="padding:30px 30px 4px;text-align:center;background:#FFFFFF;border-radius:13px 13px 0 0">' +
          '<img src="' + LOGO_PINK + '" alt="Meshuga" height="48" style="height:48px;width:auto;display:inline-block;max-width:70%" />' +
        '</td></tr>' +
        // Hero — image Yellowtail rose (toujours lisible, jamais réécrit)
        '<tr><td class="px lightbg" bgcolor="#FFFFFF" style="padding:14px 30px 2px;text-align:center;background:#FFFFFF">' +
          '<img src="' + heroImg + '" alt="Votre devis est prêt !" height="40" style="height:40px;width:auto;display:inline-block;border:0" />' +
          '<div class="ink" style="font-size:13px;color:#999;margin-top:8px;letter-spacing:.5px">Devis ' + devisNumero + ' 🎉</div>' +
        '</td></tr>' +
        // Corps du message
        '<tr><td class="px lightbg ink" bgcolor="#FFFFFF" style="padding:16px 36px 2px;background:#FFFFFF;color:#191923">' + bodyHtml + '</td></tr>' +
        // Bande des 3 étapes
        '<tr><td class="px lightbg" bgcolor="#FFFFFF" style="padding:14px 30px 2px;background:#FFFFFF">' +
          '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="yellowbg" bgcolor="#FFEB5A" style="background:#FFEB5A;border:2px solid #191923;border-radius:11px;box-shadow:3px 3px 0 #191923"><tr>' +
            '<td class="ink" style="padding:12px 6px;text-align:center;font-size:12px;font-weight:900;color:#191923">1<br>Choisissez</td>' +
            '<td class="ink" style="padding:12px 4px;text-align:center;color:#191923;font-weight:900">&rarr;</td>' +
            '<td class="ink" style="padding:12px 6px;text-align:center;font-size:12px;font-weight:900;color:#191923">2<br>Personnalisez</td>' +
            '<td class="ink" style="padding:12px 4px;text-align:center;color:#191923;font-weight:900">&rarr;</td>' +
            '<td class="ink" style="padding:12px 6px;text-align:center;font-size:12px;font-weight:900;color:#191923">3<br>Signez</td>' +
          '</tr></table>' +
        '</td></tr>' +
        // CTA Yellowtail blanc
        '<tr><td align="center" class="lightbg" bgcolor="#FFFFFF" style="padding:22px 30px 26px;background:#FFFFFF">' +
          '<a href="' + pdfPublicUrl + '" class="rosebg" bgcolor="#FF82D7" style="display:inline-block;background:#FF82D7;border:3px solid #191923;border-radius:13px;padding:13px 32px;text-decoration:none;box-shadow:5px 5px 0 #191923;color:#FFFFFF !important;font-weight:900;font-size:18px">' +
            '<img src="' + ctaImg + '" alt="' + ctaLabel + ' →" height="32" style="height:32px;width:auto;display:inline-block;border:0;vertical-align:middle" />' +
          '</a>' +
          '<div style="font-size:11px;color:#999;margin-top:13px">En quelques minutes, en ligne. Le détail est aussi joint à ce mail.</div>' +
        '</td></tr>' +
        // Footer
        '<tr><td class="pagebg" bgcolor="#FFFDF5" style="background:#FFFDF5;border-top:1px solid #EEE;border-radius:0 0 13px 13px;padding:18px 30px;text-align:center;font-size:11px;color:#888;line-height:1.7">' +
          'Une question ? Répondez simplement à ce mail, on revient vers vous.<br>' +
          '<strong style="color:#191923">SAS AEGIA FOOD</strong> (enseigne MESHUGA) &middot; 3 rue Vavin, 75006 Paris<br>' +
          '<a href="mailto:events@meshuga.fr" style="color:#FF82D7;text-decoration:none">events@meshuga.fr</a> &middot; meshuga.fr' +
        '</td></tr>' +
      '</table>' +
    '</td></tr></table>' +
    '</body></html>'
  )
}

// --- POST handler ---

export async function POST(req: NextRequest) {
  // 1. Validate ENV
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return serverError('Supabase ENV missing')
  }
  if (!RESEND_API_KEY) {
    return serverError('RESEND_API_KEY missing')
  }

  // 2. Parse body
  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return badRequest('Invalid JSON body')
  }

  var devisId = body && body.devisId ? String(body.devisId) : ''
  var to = sanitizeEmail(body && body.to)
  var cc = sanitizeEmail(body && body.cc)
  var bccUser = sanitizeEmail(body && body.bcc)
  var subject = body && body.subject ? String(body.subject).trim() : ''
  var message = body && body.message ? String(body.message) : ''
  var pdfHtml = body && body.pdfHtml ? String(body.pdfHtml) : ''

  if (!devisId) return badRequest('devisId required')
  if (!isValidEmail(to)) return badRequest('Valid `to` email required')
  if (cc && !isValidEmail(cc)) return badRequest('Invalid `cc` email')
  if (bccUser && !isValidEmail(bccUser)) return badRequest('Invalid `bcc` email')
  if (!subject) return badRequest('subject required')
  if (!pdfHtml || pdfHtml.length < 200) return badRequest('pdfHtml required')

  // BCC archive automatic
  var bccList: string[] = []
  if (bccUser) bccList.push(bccUser)
  if (BCC_ARCHIVE_DEFAULT && BCC_ARCHIVE_DEFAULT.toLowerCase() !== bccUser) {
    bccList.push(BCC_ARCHIVE_DEFAULT)
  }

  // 3. Init clients
  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  var resend = new Resend(RESEND_API_KEY)

  // 4. Charger le devis pour récupérer le numero (sécu : on ne fait pas confiance au front)
  var devisRes = await supabase
    .from('devis')
    .select('id, numero, sent_count')
    .eq('id', devisId)
    .single()

  if (devisRes.error || !devisRes.data) {
    return serverError('Devis not found')
  }
  var devisNumero = devisRes.data.numero || ('DEV-' + devisId.slice(0, 8))
  var prevSentCount = Number(devisRes.data.sent_count) || 0

  // 5. Archive HTML in Supabase Storage
  var year = new Date().getFullYear()
  var stamp = Date.now()
  var safeNumero = devisNumero.replace(/[^a-zA-Z0-9_-]/g, '_')
  var storagePath = year + '/' + safeNumero + '_' + stamp + '.html'

  var pdfBuffer = Buffer.from(pdfHtml, 'utf-8')
  var uploadRes = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'text/html',
      upsert: false
    })

  if (uploadRes.error) {
    return serverError('Storage upload failed: ' + uploadRes.error.message)
  }

  // 6. Generate signed URL valid 90 days (kept as fallback / archive reference)
  var SIGNED_URL_EXPIRY_SEC = 60 * 60 * 24 * 90 // 90 days
  var signedRes = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SEC)

  if (signedRes.error || !signedRes.data) {
    return serverError('Signed URL failed: ' + (signedRes.error ? signedRes.error.message : 'unknown'))
  }
  var supabaseSignedUrl = signedRes.data.signedUrl

  // Build the public-facing URL that opens the HTML inline in the browser
  // (we route through our own /api/catering/view-devis endpoint which forces Content-Disposition: inline)
  var origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    req.headers.get('origin') ||
    'https://meshuga-manager.vercel.app'
  var publicUrl = origin.replace(/\/$/, '') + '/api/catering/view-devis/' + devisId
  var chooseUrl = origin.replace(/\/$/, '') + '/api/catering/choose/' + devisId

  // 7. Build email body HTML
  var emailHtml = buildEmailHtml(message, devisNumero, chooseUrl, origin)

  // 8. Build PDF attachment (HTML for now, see comment in QuoteEditor)
  // Resend supports HTML attachments - mais pour mieux ouvrir, on attache aussi en HTML.
  // Le client peut sauvegarder en PDF via son navigateur. Phase 4V3 ajoutera Playwright pour vrai PDF.
  var pdfAttachment = {
    filename: 'devis_' + safeNumero + '.html',
    content: pdfBuffer
  }

  // 9. Send via Resend
  var fromHeader = EMAIL_FROM_NAME + ' <' + EMAIL_FROM_DEFAULT + '>'
  var sendPayload: any = {
    from: fromHeader,
    to: [to],
    subject: subject,
    html: emailHtml,
    attachments: [pdfAttachment],
    reply_to: EMAIL_FROM_DEFAULT
  }
  if (cc) sendPayload.cc = [cc]
  if (bccList.length > 0) sendPayload.bcc = bccList

  var sendRes: any
  try {
    sendRes = await resend.emails.send(sendPayload)
  } catch (e: any) {
    return serverError('Resend send error: ' + (e && e.message ? e.message : 'unknown'))
  }

  if (sendRes && sendRes.error) {
    return serverError(
      'Resend rejected: ' + (sendRes.error.message || JSON.stringify(sendRes.error))
    )
  }

  var emailId = sendRes && sendRes.data && sendRes.data.id ? sendRes.data.id : null

  // 10. Update devis row : sent_at, statut, pdf paths, email tracking
  var sentAtIso = new Date().toISOString()
  var newStatut = 'envoye' // si le devis était brouillon, il passe envoyé
  var updateRes = await supabase
    .from('devis')
    .update({
      sent_at: sentAtIso,
      statut: newStatut,
      pdf_storage_path: storagePath,
      pdf_url: publicUrl,
      pdf_signed_url: supabaseSignedUrl,
      email_to: to,
      email_cc: cc || null,
      email_bcc: bccList.join(', ') || null,
      email_subject: subject,
      email_message: message,
      sent_count: prevSentCount + 1
    })
    .eq('id', devisId)

  if (updateRes.error) {
    // L'email est déjà envoyé, on log mais on ne fail pas la requête
    console.error('Devis update failed after send:', updateRes.error)
  }

  return NextResponse.json({
    ok: true,
    sentAt: sentAtIso,
    emailId: emailId,
    pdfStoragePath: storagePath,
    publicUrl: publicUrl
  })
}
