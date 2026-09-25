// src/lib/events/sumup.ts
// Meshuga Events — appels à l'API SumUp (Hosted Checkout) + finalisation des commandes web.
// La clé est lue dans la variable d'environnement Vercel SUMUP_API_KEY (jamais dans le code).

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { EVENTS_CONFIG } from '@/lib/events/config'

var SUMUP_API = 'https://api.sumup.com'

export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { persistSession: false } }
  )
}

function sumupHeaders() {
  return {
    'Authorization': 'Bearer ' + (process.env.SUMUP_API_KEY || ''),
    'Content-Type': 'application/json',
  }
}

var cachedMerchantCode = ''

// Code marchand : variable SUMUP_MERCHANT_CODE si présente, sinon lu via /v0.1/me
export async function getMerchantCode() {
  if (process.env.SUMUP_MERCHANT_CODE) return process.env.SUMUP_MERCHANT_CODE
  if (cachedMerchantCode) return cachedMerchantCode
  var res = await fetch(SUMUP_API + '/v0.1/me', { headers: sumupHeaders(), cache: 'no-store' })
  if (!res.ok) throw new Error('SumUp /me ' + res.status)
  var me: any = await res.json()
  var code = me && me.merchant_profile && me.merchant_profile.merchant_code ? me.merchant_profile.merchant_code : ''
  if (!code) throw new Error('Code marchand SumUp introuvable')
  cachedMerchantCode = code
  return code
}

export async function createHostedCheckout(opts: {
  amount: number
  reference: string
  description: string
  redirectUrl: string
  webhookUrl: string
}) {
  var merchantCode = await getMerchantCode()
  var body = {
    amount: Math.round(opts.amount * 100) / 100,
    currency: 'EUR',
    checkout_reference: opts.reference,
    description: opts.description,
    merchant_code: merchantCode,
    redirect_url: opts.redirectUrl,
    return_url: opts.webhookUrl,
    hosted_checkout: { enabled: true },
  }
  var res = await fetch(SUMUP_API + '/v0.1/checkouts', {
    method: 'POST',
    headers: sumupHeaders(),
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  var data: any = await res.json().catch(function () { return {} })
  if (!res.ok || !data.hosted_checkout_url) {
    console.error('[sumup] create checkout', res.status, JSON.stringify(data))
    throw new Error('Création du paiement SumUp impossible')
  }
  return { id: data.id as string, url: data.hosted_checkout_url as string }
}

export async function getCheckoutStatus(checkoutId: string) {
  var res = await fetch(SUMUP_API + '/v0.1/checkouts/' + encodeURIComponent(checkoutId), {
    headers: sumupHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('SumUp checkout ' + res.status)
  var data: any = await res.json()
  return String(data.status || '').toUpperCase() // PENDING | PAID | FAILED | EXPIRED
}

function fmtEur(n: number) {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €'
}

function fmtDateFr(iso: string) {
  if (!iso) return ''
  var p = iso.split('-')
  return p[2] + '/' + p[1] + '/' + p[0]
}

// Vérifie le paiement d'une commande web et la passe en « payée » (idempotent).
// Appelée par la page de retour ET par le webhook SumUp : le premier des deux gagne.
export async function finalizeWebOrder(numero: string) {
  var supabase = getSupabaseAdmin()
  var q = await supabase.from('devis').select('*').eq('numero', numero).eq('send_mode', 'web').maybeSingle()
  if (q.error || !q.data) return { status: 'NOT_FOUND' }
  var d: any = q.data

  if (d.paiement_statut === 'paye') {
    return { status: 'PAID', devis: d }
  }

  var checkoutId = d.config_data && d.config_data.sumup_checkout_id ? d.config_data.sumup_checkout_id : ''
  if (!checkoutId) return { status: 'NOT_FOUND' }

  var status = await getCheckoutStatus(checkoutId)
  if (status !== 'PAID') return { status: status, devis: d }

  var today = new Date().toISOString().slice(0, 10)
  var upd = await supabase
    .from('devis')
    .update({
      statut: 'paye',
      paiement_statut: 'paye',
      solde_recu: true,
      solde_date: today,
      solde_montant: d.total_ttc,
      solde_mode: 'sumup_en_ligne',
      signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', d.id)
    .eq('paiement_statut', 'non_paye') // évite le double traitement page + webhook
    .select()

  var justPaid = !upd.error && upd.data && upd.data.length > 0
  if (justPaid) {
    await sendOrderEmails(d).catch(function (e) { console.error('[events] emails', e) })
  }
  return { status: 'PAID', devis: d }
}

async function sendOrderEmails(d: any) {
  var key = process.env.RESEND_API_KEY || ''
  if (!key) return
  var resend = new Resend(key)
  var lines = (d.config_data && d.config_data.lines ? d.config_data.lines : []).map(function (l: any) {
    return '<tr><td style="padding:6px 0">' + l.qty + ' × ' + l.name + '</td><td style="text-align:right">' + fmtEur(l.qty * l.priceHt) + ' HT</td></tr>'
  }).join('')

  var recap =
    '<table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' + lines +
    '<tr><td style="padding:6px 0">Livraison ' + EVENTS_CONFIG.deliveryZoneLabel + '</td><td style="text-align:right">' + fmtEur(Number(d.livraison || 0)) + ' HT</td></tr>' +
    '<tr><td style="padding-top:10px;font-weight:bold">Total payé</td><td style="padding-top:10px;text-align:right;font-weight:bold">' + fmtEur(Number(d.total_ttc || 0)) + ' TTC</td></tr>' +
    '</table>'

  var livraison = '<p style="font-family:Arial,sans-serif;font-size:14px">Livraison le <b>' + fmtDateFr(d.event_date) + '</b> à <b>' + (d.event_hour || '') + '</b><br>' + (d.client_adresse || '') + '</p>'

  var wrap = function (title: string, inner: string) {
    return '<div style="background:#FFEB5A;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fff;border:2px solid #191923;border-radius:8px;padding:24px;box-shadow:5px 5px 0 #FF82D7">' +
      '<h1 style="font-family:Georgia,serif;font-size:26px;margin:0 0 12px;color:#191923">' + title + '</h1>' + inner + '</div></div>'
  }

  // 1. Notification interne
  await resend.emails.send({
    from: 'Meshuga Events <' + EVENTS_CONFIG.email + '>',
    to: [EVENTS_CONFIG.email],
    subject: '🛒 Commande web payée ' + d.numero + ' — ' + (d.client_nom || d.client_contact) + ' — ' + fmtDateFr(d.event_date),
    html: wrap('Nouvelle commande payée',
      '<p style="font-family:Arial,sans-serif;font-size:14px"><b>' + d.numero + '</b><br>' +
      (d.client_nom || '') + ' — ' + (d.client_contact || '') + '<br>' + (d.client_email || '') + ' · ' + (d.client_phone || '') + '</p>' +
      livraison + recap + (d.notes ? '<p style="font-family:Arial,sans-serif;font-size:14px"><b>Note client :</b> ' + d.notes + '</p>' : '')),
  })

  // 2. Confirmation client
  if (d.client_email) {
    await resend.emails.send({
      from: 'Meshuga Events <' + EVENTS_CONFIG.email + '>',
      to: [d.client_email],
      reply_to: EVENTS_CONFIG.email,
      subject: 'Votre commande Meshuga ' + d.numero + ' est confirmée',
      html: wrap('Merci, c\'est dans la boîte !',
        '<p style="font-family:Arial,sans-serif;font-size:14px">Bonjour ' + (d.client_contact || '') + ',<br>votre paiement est bien reçu, on s\'occupe du reste.</p>' +
        livraison + recap +
        '<p style="font-family:Arial,sans-serif;font-size:13px;color:#555">Une question ? ' + EVENTS_CONFIG.phoneDisplay + ' · ' + EVENTS_CONFIG.email + '</p>'),
    })
  }
}
