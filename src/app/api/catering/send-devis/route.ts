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
function buildEmailHtml(messageText: string, devisNumero: string, pdfPublicUrl: string): string {
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

  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<style>' +
    'body{font-family:Arial,Helvetica,sans-serif;color:#191923;background:#FFFFFF;margin:0;padding:0}' +
    '.wrap{max-width:600px;margin:0 auto;padding:24px 20px}' +
    '.head{padding-bottom:8px;margin-bottom:20px;text-align:center}' +
    '.head img{height:54px;width:auto;display:inline-block;max-width:100%}' +
    '.cta{display:inline-block;background:#FF82D7;color:#FFEB5A !important;border:2px solid #191923;border-radius:5px;padding:12px 22px;font-weight:900;text-decoration:none !important;font-size:14px;box-shadow:3px 3px 0 #191923;margin:8px 0}' +
    '.cta span{color:#FFEB5A !important;text-decoration:none !important}' +
    '.foot{margin-top:30px;padding-top:14px;border-top:1px solid #EEE;font-size:11px;color:#777;line-height:1.6}' +
    '.foot a{color:#FF82D7}' +
    '</style></head><body>' +
    '<div class="wrap">' +
    '<div class="head"><img src="' + LOGO_PINK + '" alt="MESHUGA" /></div>' +
    '<div class="msg">' + bodyHtml + '</div>' +
    '<div style="text-align:center;margin:26px 0">' +
    '<a href="' + pdfPublicUrl + '" class="cta" style="color:#FFEB5A !important;text-decoration:none"><span style="color:#FFEB5A !important;text-decoration:none">📄 Voir le devis ' + devisNumero + '</span></a>' +
    '</div>' +
    '<div class="foot">' +
    'Le devis détaillé est joint à ce message et également accessible via le lien ci-dessus.<br>' +
    'Une question ? Répondez simplement à ce mail, nous reviendrons vers vous.<br><br>' +
    '<strong>SAS AEGIA FOOD (enseigne MESHUGA)</strong> — 3 rue Vavin, Paris 6e<br>' +
    'events@meshuga.fr · meshuga.fr' +
    '</div></div></body></html>'
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

  // 7. Build email body HTML
  var emailHtml = buildEmailHtml(message, devisNumero, publicUrl)

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
