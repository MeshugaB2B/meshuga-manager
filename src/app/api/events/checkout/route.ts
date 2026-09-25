// src/app/api/events/checkout/route.ts
// Meshuga Events — création d'une commande web + ouverture du paiement SumUp
//
// POST /api/events/checkout
// Body : { items:[{id,qty}], date:'YYYY-MM-DD', hour:'HH:MM',
//          client:{company,name,email,phone}, address:{street,cp,city}, notes }
// Réponse : { url } -> page de paiement SumUp
//
// Règle : TOUT est recalculé ici à partir de la base (prix, TVA, date, zone).
// On ne fait jamais confiance aux montants envoyés par le navigateur.

import { NextRequest, NextResponse } from 'next/server'
import { EVENTS_CONFIG, isDeliveryDateAllowed, isParisPostcode, htToTtc } from '@/lib/events/config'
import { getSupabaseAdmin, createHostedCheckout, getMerchantCode } from '@/lib/events/sumup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

// GET /api/events/checkout -> diagnostic : la clé SumUp est-elle valide ?
// Ne renvoie qu'un code marchand masqué, aucune donnée sensible.
export async function GET() {
  if (!process.env.SUMUP_API_KEY) {
    return NextResponse.json({ sumup: 'KO', raison: 'SUMUP_API_KEY absente sur Vercel' })
  }
  try {
    var code = await getMerchantCode()
    return NextResponse.json({ sumup: 'OK', marchand: code.slice(0, 2) + '***' + code.slice(-2) })
  } catch (e: any) {
    return NextResponse.json({ sumup: 'KO', raison: e && e.message ? e.message : 'erreur' })
  }
}

function bad(msg: string, status?: number) {
  return NextResponse.json({ error: msg }, { status: status || 400 })
}

function clean(v: any, max: number) {
  return String(v == null ? '' : v).trim().slice(0, max)
}

function generateNumero() {
  var year = new Date().getFullYear()
  var rand = Math.floor(1000 + Math.random() * 9000)
  return 'WEB-' + year + '-' + rand
}

export async function POST(req: NextRequest) {
  if (!process.env.SUMUP_API_KEY) return bad('Paiement indisponible (configuration)', 500)

  var body: any = null
  try { body = await req.json() } catch (e) { return bad('Requête invalide') }

  // ---- 1. Client & adresse
  var company = clean(body && body.client && body.client.company, 120)
  var name = clean(body && body.client && body.client.name, 120)
  var email = clean(body && body.client && body.client.email, 160).toLowerCase()
  var phone = clean(body && body.client && body.client.phone, 30)
  var street = clean(body && body.address && body.address.street, 200)
  var cp = clean(body && body.address && body.address.cp, 10)
  var city = clean(body && body.address && body.address.city, 80) || 'Paris'
  var notes = clean(body && body.notes, 1000)
  var date = clean(body && body.date, 10)
  var hour = clean(body && body.hour, 5)

  if (!name) return bad('Merci d\'indiquer votre nom.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('Adresse email invalide.')
  if (phone.replace(/\D/g, '').length < 9) return bad('Numéro de téléphone invalide.')
  if (!street) return bad('Merci d\'indiquer l\'adresse de livraison.')
  if (!isParisPostcode(cp)) {
    return bad('Nous livrons en ligne uniquement dans Paris intra-muros. Pour une autre adresse, appelez-nous au ' + EVENTS_CONFIG.phoneDisplay + '.')
  }
  if (!isDeliveryDateAllowed(date)) {
    return bad('Pour une livraison aussi proche, appelez-nous au ' + EVENTS_CONFIG.phoneDisplay + ' : on fait le maximum.')
  }
  if (!/^\d{2}:\d{2}$/.test(hour)) return bad('Merci de choisir une heure de livraison.')

  // ---- 2. Panier : prix relus en base
  var rawItems = Array.isArray(body && body.items) ? body.items : []
  var wanted: any = {}
  rawItems.forEach(function (it: any) {
    var id = clean(it && it.id, 60)
    var qty = parseInt(String(it && it.qty), 10)
    if (id && qty > 0) wanted[id] = Math.min((wanted[id] || 0) + qty, 20)
  })
  var ids = Object.keys(wanted)
  if (ids.length === 0) return bad('Votre panier est vide.')

  var supabase = getSupabaseAdmin()
  var off = await supabase
    .from('catering_offerings')
    .select('id, name, pv_ht, tva_pct, fc_ht, size_pers')
    .in('id', ids)
    .eq('category', EVENTS_CONFIG.onlineCategory)
    .eq('is_active', true)
  if (off.error) return bad('Catalogue indisponible', 500)
  if (!off.data || off.data.length !== ids.length) return bad('Un produit de votre panier n\'est plus disponible. Rechargez la page.')

  var lines: any[] = []
  var totalHt = 0
  var totalTva = 0
  var totalFc = 0
  var pieces = 0
  off.data.forEach(function (o: any) {
    var qty = wanted[o.id]
    var ht = Number(o.pv_ht || 0)
    var tva = Number(o.tva_pct || 10)
    lines.push({ id: o.id, name: o.name, qty: qty, priceHt: ht, tvaPct: tva })
    totalHt += ht * qty
    totalTva += ht * qty * tva / 100
    totalFc += Number(o.fc_ht || 0) * qty
    pieces += Number(o.size_pers || 0) * qty
  })

  var fee = EVENTS_CONFIG.deliveryFeeHt
  totalHt += fee
  totalTva += fee * EVENTS_CONFIG.deliveryTvaPct / 100
  totalHt = Math.round(totalHt * 100) / 100
  totalTva = Math.round(totalTva * 100) / 100
  var totalTtc = Math.round((totalHt + totalTva) * 100) / 100

  // ---- 3. Devis dans le dashboard (brouillon non payé tant que SumUp n'a pas confirmé)
  var numero = generateNumero()
  var adresse = street + ', ' + cp + ' ' + city
  var ins = await supabase
    .from('devis')
    .insert([{
      numero: numero,
      statut: 'brouillon',
      paiement_statut: 'non_paye',
      send_mode: 'web',
      client_nom: company || name,
      client_contact: name,
      client_email: email,
      client_phone: phone,
      client_adresse: adresse,
      event_date: date,
      event_hour: hour,
      event_lieu: adresse,
      nb_personnes: null,
      event_format: 'cocktail',
      format: 'cocktail',
      logistics_mode: 'livraison',
      item_format: 'box',
      items: lines.map(function (l) { return { qty: l.qty, remise_pct: 0, offering_id: l.id } }),
      livraison: fee,
      livraison_offert: false,
      total_ht: totalHt,
      tva: totalTva,
      total_ttc: totalTtc,
      total_fc_ht: Math.round(totalFc * 100) / 100,
      total_marge_ht: Math.round((totalHt - fee - totalFc) * 100) / 100,
      notes: notes,
      notes_internes: 'Commande en ligne events.meshuga.fr — ' + pieces + ' pièces — paiement SumUp en attente',
      config_data: { source: 'events.meshuga.fr', lines: lines },
    }])
    .select('id')
    .single()
  if (ins.error || !ins.data) {
    console.error('[events/checkout] insert devis', ins.error && ins.error.message)
    return bad('Impossible d\'enregistrer la commande. Appelez-nous au ' + EVENTS_CONFIG.phoneDisplay + '.', 500)
  }

  // ---- 4. Paiement SumUp
  var origin = req.headers.get('x-forwarded-host')
    ? 'https://' + req.headers.get('x-forwarded-host')
    : new URL(req.url).origin
  try {
    var co = await createHostedCheckout({
      amount: totalTtc,
      reference: numero,
      description: 'Meshuga Events ' + numero + ' — livraison ' + date,
      redirectUrl: origin + '/events/merci?ref=' + encodeURIComponent(numero),
      webhookUrl: origin + '/api/events/confirm',
    })
    await supabase
      .from('devis')
      .update({ config_data: { source: 'events.meshuga.fr', lines: lines, sumup_checkout_id: co.id } })
      .eq('id', ins.data.id)
    return NextResponse.json({ url: co.url, numero: numero })
  } catch (e: any) {
    console.error('[events/checkout] sumup', e && e.message)
    return bad('Le paiement n\'a pas pu démarrer. Réessayez ou appelez-nous au ' + EVENTS_CONFIG.phoneDisplay + '.', 502)
  }
}
