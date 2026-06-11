import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { sendBrevoEmail } from '@/lib/brevo'
import { sendTwilioSms, normalizePhoneFR } from '@/lib/twilio'
import {
  buildAcompteEmailHtml,
  buildAcompteEmailText,
  buildSignerNotifSms,
  buildSignerNotifEmailHtml
} from '@/lib/catering/cateringNotify'
import {
  buildOfferingMap,
  computeVariant,
  computeCoverage,
  aggregateMinis
} from '@/lib/catering/cateringCore'
import { buildDevisHtml } from '@/lib/catering/cateringPdf'
import { loadEmployerSignature } from '@/app/dashboard/rh/employerSignature'

export const runtime = 'nodejs'
export const maxDuration = 30

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
var MAX_OTP_ATTEMPTS = 5
var BUCKET = 'catering-quotes-pdfs'

var FMT_LABELS: { [k: string]: string } = {
  petit_dej: 'Petit-déjeuner',
  business_lunch: 'Business lunch',
  cocktail: 'Cocktail dînatoire',
  soiree: 'Soirée',
  autre: 'Prestation'
}

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

function frDateShort(d: any): string {
  if (!d) return ''
  try {
    var dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch (e) {
    return String(d)
  }
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

// Notifications post-signature : best-effort, chaque canal isolé.
// N'impacte JAMAIS le succès de la signature (déjà enregistrée en base).
async function notifyAfterSignature(req: NextRequest, d: any, signerName: string, verifiedPhone: string) {
  var totals = (d.config_data && d.config_data.totals) ? d.config_data.totals : {}
  var totalTTC = Number(totals.total_ttc) || Number(d.total_ttc) || 0
  var acompte = round2(totalTTC * 0.30)
  var solde = round2(totalTTC - acompte)

  var origin = (process.env.NEXT_PUBLIC_APP_URL || req.headers.get('origin') || 'https://meshuga-manager.vercel.app').replace(/\/+$/, '')
  var viewUrl = origin + '/api/catering/view-devis/' + d.id
  var eventDateLabel = frDateShort(d.event_date)
  var formatLabel = FMT_LABELS[d.event_format] || 'Prestation'

  // 1. Email d'acompte au client
  if (d.client_email) {
    try {
      var emailPayload = {
        clientNom: d.client_nom || '',
        numero: d.numero || '',
        totalTTC: totalTTC,
        acompte: acompte,
        solde: solde,
        eventDateLabel: eventDateLabel,
        eventLieu: d.event_lieu || '',
        formatLabel: formatLabel,
        viewUrl: viewUrl,
        origin: origin,
        iban: process.env.MESHUGA_IBAN || '',
        bic: process.env.MESHUGA_BIC || '',
        bankName: process.env.MESHUGA_BANK_NAME || ''
      }
      await sendBrevoEmail({
        to: [{ email: d.client_email, name: d.client_nom || '' }],
        subject: 'Votre devis ' + (d.numero || '') + ' est signé \u2014 modalités d\u2019acompte',
        htmlContent: buildAcompteEmailHtml(emailPayload),
        textContent: buildAcompteEmailText(emailPayload),
        sender: { email: 'hello@meshuga.fr', name: 'Meshuga Events' },
        replyTo: { email: 'events@meshuga.fr', name: 'Meshuga Events' }
      })
    } catch (e) {
      console.error('[devis-sign] email acompte client échoué:', e)
    }
  }

  // 2. Email de notification à Edward (+ Emy en copie)
  try {
    var edwardEmail = process.env.EDWARD_NOTIFICATION_EMAIL || 'edward@meshuga.fr'
    await sendBrevoEmail({
      to: [{ email: edwardEmail, name: 'Edward' }],
      cc: [{ email: 'emy@meshuga.fr', name: 'Emy' }],
      subject: '\u270D\uFE0F Devis ' + (d.numero || '') + ' signé par ' + signerName,
      htmlContent: buildSignerNotifEmailHtml({
        signerName: signerName,
        signerPhone: verifiedPhone,
        numero: d.numero || '',
        totalTTC: totalTTC,
        acompte: acompte,
        clientNom: d.client_nom || '',
        managerUrl: origin + '/dashboard'
      }),
      sender: { email: 'hello@meshuga.fr', name: 'Meshuga Events' }
    })
  } catch (e) {
    console.error('[devis-sign] email notif Edward échoué:', e)
  }

  // 3. SMS à Edward
  try {
    var edwardPhone = normalizePhoneFR(process.env.EDWARD_NOTIFICATION_PHONE || '')
    if (edwardPhone) {
      await sendTwilioSms({
        to: edwardPhone,
        body: buildSignerNotifSms({ signerName: signerName, numero: d.numero || '', totalTTC: totalTTC })
      })
    }
  } catch (e) {
    console.error('[devis-sign] SMS notif Edward échoué:', e)
  }
}

// Régénère le PDF du devis avec le bloc SIGNÉ (2 signatures + preuves) à partir du
// panier réellement signé (config_data), puis écrase l'archive (pdf_storage_path).
// 100 % best-effort : si quoi que ce soit échoue, la signature reste valide.
async function regenerateSignedPdf(
  supabase: any,
  d: any,
  audit: any,
  signedAt: string,
  signerName: string,
  verifiedPhone: string,
  ip: string,
  documentHash: string,
  channel: string,
  verifiedEmail: string
) {
  var cfg = d.config_data || {}
  var rawLines = Array.isArray(cfg.lines) ? cfg.lines : []
  if (rawLines.length === 0) {
    console.error('[devis-sign] regen PDF: config_data.lines vide, on garde l\'archive existante')
    return
  }

  // 1. Catalogue actif → map
  var catRes = await supabase
    .from('catering_offerings')
    .select('id, category, subcategory, name, composition, tagline, pv_ht, tva_pct, fc_ht, size_pers, is_active')
    .eq('is_active', true)
  if (catRes.error || !catRes.data) {
    console.error('[devis-sign] regen PDF: catalogue indisponible')
    return
  }
  var map = buildOfferingMap(catRes.data as any)

  // 2. Lignes validées (on ignore les inconnues/inactives)
  var variantLines: { offering_id: string; qty: number }[] = []
  for (var i = 0; i < rawLines.length; i++) {
    var oid = String(rawLines[i].offering_id || rawLines[i].id || '')
    var q = Number(rawLines[i].qty) || 0
    if (!oid || q <= 0 || !map[oid]) continue
    variantLines.push({ offering_id: oid, qty: q })
  }
  if (variantLines.length === 0) {
    console.error('[devis-sign] regen PDF: aucune ligne valide')
    return
  }

  // 3. Recalcul serveur (source de vérité, identique à configure)
  var pax = Number(cfg.pax) || Number(d.nb_personnes) || 1
  var frais = {
    livraison: Number(d.livraison) || 0,
    livraison_offert: d.livraison_offert === true,
    mise_en_place: Number(d.mise_en_place) || 0,
    mise_en_place_offert: d.mise_en_place_offert === true,
    remise_globale_pct: 0
  }
  var variant = { key: d.variant_chosen || cfg.variant_key || 'client', lines: variantLines }
  var totals = computeVariant(variant as any, map, frais as any, pax)
  var coverage = computeCoverage(totals.lines, pax, d.event_format || '', d.item_format || undefined)
  var minis = aggregateMinis(variantLines as any, map)
  var breakdown = (minis || []).map(function (m: any) {
    return { name: m.name, qty: m.count }
  })

  // 4. Signature employeur (mandat permanent) — peut être null
  var emp: any = null
  try {
    emp = await loadEmployerSignature()
  } catch (e) {
    emp = null
  }

  // 5. Construire le payload + bloc signature
  var clientMeta = (audit && audit.client_meta) || {}
  var payload: any = {
    numero: d.numero,
    client: {
      nom: d.client_nom || '',
      contact: d.client_contact || '',
      email: d.client_email || '',
      phone: d.client_phone || ''
    },
    event: {
      date: d.event_date || '',
      lieu: d.event_lieu || '',
      format: d.event_format || '',
      nbPersonnes: pax
    },
    lines: totals.lines,
    totals: totals,
    coverage: coverage,
    breakdown: breakdown,
    notes: d.notes || '',
    formuleLabel: d.variant_chosen || cfg.variant_key || '',
    offeringMap: map,
    frais: {
      livraison: Number(d.livraison) || 0,
      livraison_offert: d.livraison_offert === true,
      mise_en_place: Number(d.mise_en_place) || 0,
      mise_en_place_offert: d.mise_en_place_offert === true
    },
    signature: {
      client: {
        name: signerName,
        signed_at: signedAt,
        channel: channel,
        phone: channel === 'sms' ? verifiedPhone : '',
        email: channel === 'email' ? verifiedEmail : '',
        ip: ip,
        document_sha256: documentHash,
        tz: clientMeta.tz || 'Europe/Paris'
      },
      employer: emp
        ? {
            full_name: emp.full_name,
            quality: emp.quality,
            company_name: emp.company_name,
            svg: emp.svg,
            png: emp.png_base64,
            mandate_activated_at: emp.activated_at,
            consent_sha256: emp.consent_hash
          }
        : undefined
    }
  }

  var html = buildDevisHtml(payload)

  // 6. Archiver : nouveau fichier signé + bascule pdf_storage_path
  var year = new Date().getFullYear()
  var stamp = Date.now()
  var safeNumero = String(d.numero || ('DEV-' + d.id)).replace(/[^a-zA-Z0-9_-]/g, '_')
  var storagePath = year + '/' + safeNumero + '_signed_' + stamp + '.html'

  var up = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, Buffer.from(html, 'utf-8'), { contentType: 'text/html', upsert: true })
  if (up.error) {
    console.error('[devis-sign] regen PDF: upload échoué:', up.error.message)
    return
  }

  var upd = await supabase
    .from('devis')
    .update({ pdf_storage_path: storagePath })
    .eq('id', d.id)
  if (upd.error) {
    console.error('[devis-sign] regen PDF: maj pdf_storage_path échouée:', upd.error.message)
    return
  }
  console.error('[devis-sign] regen PDF: archive signée OK →', storagePath)
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
  var wantUpdateContactEmail = body.updateContactEmail === true

  if (!acceptedTerms || !acceptedAccord) return bad('Vous devez accepter les conditions pour signer.')
  if (signerName.length < 2) return bad('Merci d\u2019indiquer le nom du signataire.')
  if (otp.length !== 6) return bad('Code à 6 chiffres requis.')

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  var res = await supabase
    .from('devis')
    .select('id, numero, statut, config_data, total_ttc, client_email, client_nom, client_contact, client_phone, event_date, event_lieu, event_format, item_format, livraison, livraison_offert, mise_en_place, mise_en_place_offert, notes, variant_chosen, nb_personnes, pdf_storage_path, signature_status, signed_at, signature_otp_hash, signature_otp_expires_at, signature_otp_phone, signature_otp_email, signature_otp_channel, signature_otp_attempts, prospect_id')
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
    return bad('Code incorrect. Vérifiez le code reçu.')
  }

  // --- Code valide : on signe ---
  var signedAt = new Date().toISOString()
  var ip = clientIp(req)
  var ua = req.headers.get('user-agent') || ''
  var channel = String(d.signature_otp_channel || 'sms').toLowerCase()
  if (channel !== 'email') channel = 'sms'
  var verifiedPhone = d.signature_otp_phone || ''
  var verifiedEmail = d.signature_otp_email || ''
  // Destinataire vérifié (selon canal) — sert au hash + à l'affichage
  var verifiedDest = channel === 'email' ? verifiedEmail : verifiedPhone

  var hashInput = JSON.stringify({
    devis_id: d.id,
    numero: d.numero,
    config: d.config_data || null,
    signer_name: signerName,
    signature_typed: signatureTyped,
    channel: channel,
    dest: verifiedDest,
    signed_at: signedAt
  })
  var documentHash = createHash('sha256').update(hashInput).digest('hex')

  var channelLabelLegal = channel === 'email'
    ? 'Signature électronique vérifiée par code email et horodatée — articles 1366 et 1367 du Code civil (eIDAS).'
    : 'Signature électronique vérifiée par code SMS et horodatée — articles 1366 et 1367 du Code civil (eIDAS).'

  var audit = {
    method: channel === 'email' ? 'signature_electronique_otp_email' : 'signature_electronique_otp_sms',
    signer_name: signerName,
    signature_typed: signatureTyped,
    signed_at: signedAt,
    accepted_terms: acceptedTerms,
    accepted_accord: acceptedAccord,
    otp_verified: true,
    otp_channel: channel,
    verified_phone: channel === 'sms' ? verifiedPhone : '',
    verified_email: channel === 'email' ? verifiedEmail : '',
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
    legal: channelLabelLegal
  }

  var upd = await supabase
    .from('devis')
    .update({
      signature_status: 'signed',
      signed_at: signedAt,
      signer_name: signerName,
      signer_phone: channel === 'sms' ? verifiedPhone : null,
      signature_audit_data: audit,
      statut: 'accepte',
      signature_otp_hash: null,
      signature_otp_expires_at: null,
      signature_otp_attempts: 0
    })
    .eq('id', d.id)
    .eq('signature_status', d.signature_status)
  if (upd.error) return bad('Enregistrement impossible : ' + upd.error.message, 500)

  // Mise à jour optionnelle de l'email de la fiche contact (si le client l'a demandé) — best-effort
  if (channel === 'email' && wantUpdateContactEmail && verifiedEmail && d.prospect_id) {
    try {
      await supabase.from('prospects').update({ email: verifiedEmail }).eq('id', d.prospect_id)
    } catch (e) {
      console.error('[devis-sign] maj email contact échouée:', e)
    }
  }

  // Régénération du PDF signé (2 signatures + preuves) + ré-archivage — best-effort.
  // Doit tourner AVANT les notifications : l'email d'acompte renvoie vers l'archive.
  try {
    await regenerateSignedPdf(supabase, d, audit, signedAt, signerName, verifiedPhone, ip, documentHash, channel, verifiedEmail)
  } catch (e) {
    console.error('[devis-sign] régénération PDF signé échouée (signature conservée):', e)
  }

  // Notifications (email d'acompte client + alerte Edward) — best-effort
  try {
    await notifyAfterSignature(req, d, signerName, verifiedPhone)
  } catch (e) {
    console.error('[devis-sign] notifications post-signature échouées:', e)
  }

  return NextResponse.json({ ok: true, documentHash: documentHash })
}
