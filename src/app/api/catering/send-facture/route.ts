// ============================================================
// src/app/api/catering/send-facture/route.ts
// ============================================================
// Envoie la FACTURE (à régler ou acquittée) d'un devis catering par email :
//   1. vérifie que le devis a bien un numéro de facture
//   2. rend le HTML de la facture (généré côté éditeur par buildFactureHtml) en VRAI PDF
//      via Chrome headless (@sparticuz/chromium) + polices Meshuga embarquées
//   3. archive le PDF dans Supabase Storage (bucket catering-quotes-pdfs, dossier factures/)
//   4. envoie le mail via Resend, PDF en pièce jointe, BCC archive events@meshuga.fr
//   5. trace l'envoi sur le devis (facture_sent_at, facture_email_to, facture_pdf_path)
//
// ⚠️ Route PDF Chrome headless : DOIT figurer dans next.config.js -> outputFileTracingIncludes.
//
// Body JSON : { devisId, to, cc?, subject, message, factureHtml }
// Réponse   : { ok: true, sentAt, pdfPath } | { ok: false, error }
// SWC-safe : var partout, function(){}.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { LOGO_PINK } from '@/app/dashboard/logos'
import { htmlToPdfBuffer, injectMeshugaFonts } from '@/lib/hr/pdf-render'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
var RESEND_API_KEY = process.env.RESEND_API_KEY || ''
var EMAIL_FROM = 'events@meshuga.fr'
var EMAIL_FROM_NAME = 'Meshuga Events'
var BCC_ARCHIVE = 'events@meshuga.fr'
var BUCKET = 'catering-quotes-pdfs'

function fail(msg: string, status: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: status })
}

function cleanEmail(s: any): string {
  if (!s || typeof s !== 'string') return ''
  return s.trim().toLowerCase()
}

function isEmail(s: string): boolean {
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildMailHtml(message: string, factureNumero: string, acquittee: boolean, origin: string): string {
  var body = escHtml(message).split('\n').map(function (l) {
    return l.trim() === ''
      ? '<div style="height:10px"></div>'
      : '<div style="margin-bottom:6px;line-height:1.6;font-size:14px;color:#191923">' + l + '</div>'
  }).join('')
  var base = (origin || '').replace(/\/$/, '')
  var heroText = acquittee ? 'Merci, c’est réglé !' : 'Votre facture'
  var heroImg = base + '/api/og/yellowtail?text=' + encodeURIComponent(heroText) + '&size=40&color=FF82D7'
  var badge = acquittee
    ? '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:6px auto 0"><tr><td bgcolor="#FF82D7" style="background:#FF82D7;border:2px solid #191923;border-radius:9px;padding:8px 18px;font-weight:900;font-size:13px;color:#191923;letter-spacing:1px;text-transform:uppercase">Facture acquittée · solde 0,00 €</td></tr></table>'
    : ''
  return (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head>' +
    '<body bgcolor="#FFFDF5" style="margin:0;padding:0;background:#FFFDF5;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFDF5"><tr><td align="center" style="padding:26px 12px">' +
      '<table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:600px;max-width:100%;background:#FFFFFF;border:3px solid #191923;border-radius:16px;box-shadow:7px 7px 0 #FF82D7">' +
        '<tr><td style="padding:30px 30px 4px;text-align:center"><img src="' + LOGO_PINK + '" alt="Meshuga" height="48" style="height:48px;width:auto;display:inline-block;max-width:70%" /></td></tr>' +
        '<tr><td style="padding:14px 30px 2px;text-align:center">' +
          '<img src="' + heroImg + '" alt="' + heroText + '" height="40" style="height:40px;width:auto;display:inline-block;border:0" />' +
          '<div style="font-size:13px;color:#999;margin-top:8px;letter-spacing:.5px">Facture ' + escHtml(factureNumero) + '</div>' +
          badge +
        '</td></tr>' +
        '<tr><td style="padding:18px 36px 10px;color:#191923">' + body + '</td></tr>' +
        '<tr><td style="padding:4px 36px 22px;font-size:12px;color:#888;text-align:center">📎 La facture est jointe à ce mail au format PDF.</td></tr>' +
        '<tr><td bgcolor="#FFFDF5" style="background:#FFFDF5;border-top:1px solid #EEE;border-radius:0 0 13px 13px;padding:18px 30px;text-align:center;font-size:11px;color:#888;line-height:1.7">' +
          'Une question ? Répondez simplement à ce mail.<br>' +
          '<strong style="color:#191923">SAS AEGIA FOOD</strong> (enseigne MESHUGA) &middot; 3 rue Vavin, 75006 Paris<br>' +
          '<a href="mailto:events@meshuga.fr" style="color:#FF82D7;text-decoration:none">events@meshuga.fr</a> &middot; meshuga.fr' +
        '</td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>'
  )
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return fail('Supabase ENV missing', 500)
  if (!RESEND_API_KEY) return fail('RESEND_API_KEY missing', 500)

  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return fail('Invalid JSON body', 400)
  }

  var devisId = body && body.devisId ? String(body.devisId) : ''
  var to = cleanEmail(body && body.to)
  var cc = cleanEmail(body && body.cc)
  var subject = body && body.subject ? String(body.subject).trim() : ''
  var message = body && body.message ? String(body.message) : ''
  var factureHtml = body && body.factureHtml ? String(body.factureHtml) : ''

  if (!devisId) return fail('devisId requis', 400)
  if (!isEmail(to)) return fail('Email destinataire invalide', 400)
  if (cc && !isEmail(cc)) return fail('Email CC invalide', 400)
  if (!subject) return fail('Sujet requis', 400)
  if (!factureHtml || factureHtml.length < 500) return fail('HTML de facture manquant', 400)

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  var dRes = await supabase
    .from('devis')
    .select('id, numero, facture_numero, solde_recu')
    .eq('id', devisId)
    .single()
  if (dRes.error || !dRes.data) return fail('Devis introuvable', 404)
  var factureNumero = dRes.data.facture_numero || ''
  if (!factureNumero) return fail('Aucune facture émise sur ce devis', 400)
  if (factureHtml.indexOf(factureNumero) === -1) return fail('Le HTML ne correspond pas à la facture ' + factureNumero, 400)
  var acquittee = !!dRes.data.solde_recu

  // 1. Rendu PDF
  var pdf: Buffer
  try {
    pdf = await htmlToPdfBuffer(injectMeshugaFonts(factureHtml))
  } catch (e: any) {
    return fail('Rendu PDF impossible : ' + (e && e.message ? e.message : 'erreur'), 500)
  }

  // 2. Archive Storage
  var safeNum = factureNumero.replace(/[^a-zA-Z0-9_-]/g, '_')
  var fileName = safeNum + (acquittee ? '_acquittee' : '') + '.pdf'
  var pdfPath = 'factures/' + new Date().getFullYear() + '/' + safeNum + (acquittee ? '_acquittee' : '') + '_' + Date.now() + '.pdf'
  var up = await supabase.storage.from(BUCKET).upload(pdfPath, pdf, { contentType: 'application/pdf', upsert: false })
  if (up.error) return fail('Archivage PDF impossible : ' + up.error.message, 500)

  // 3. Envoi
  var origin = process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'https://meshuga-manager.vercel.app'
  var payload: any = {
    from: EMAIL_FROM_NAME + ' <' + EMAIL_FROM + '>',
    to: [to],
    subject: subject,
    html: buildMailHtml(message, factureNumero, acquittee, origin),
    attachments: [{ filename: 'Meshuga_' + fileName, content: pdf }],
    reply_to: EMAIL_FROM,
    bcc: [BCC_ARCHIVE]
  }
  if (cc) payload.cc = [cc]

  var resend = new Resend(RESEND_API_KEY)
  var sent: any
  try {
    sent = await resend.emails.send(payload)
  } catch (e: any) {
    return fail('Envoi email impossible : ' + (e && e.message ? e.message : 'erreur'), 500)
  }
  if (sent && sent.error) return fail('Email refusé : ' + (sent.error.message || JSON.stringify(sent.error)), 500)

  // 4. Traçabilité
  var sentAt = new Date().toISOString()
  var upd = await supabase
    .from('devis')
    .update({ facture_sent_at: sentAt, facture_email_to: to, facture_pdf_path: pdfPath })
    .eq('id', devisId)
  if (upd.error) console.error('send-facture: update devis failed', upd.error)

  return NextResponse.json({ ok: true, sentAt: sentAt, pdfPath: pdfPath })
}
