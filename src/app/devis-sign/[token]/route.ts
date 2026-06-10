import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildDevisSignHtml, buildSignStateHtml } from '@/lib/catering/cateringSign'

export const runtime = 'nodejs'

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

var FORMAT_LABELS: { [k: string]: string } = {
  petit_dej: 'Petit-déjeuner',
  business_lunch: 'Business lunch',
  cocktail: 'Cocktail dînatoire',
  soiree: 'Soirée',
  autre: 'Prestation'
}

function htmlResponse(html: string, status?: number) {
  return new NextResponse(html, {
    status: status || 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  })
}

function frDate(d: any): string {
  if (!d) return ''
  try {
    var dt = new Date(d)
    if (isNaN(dt.getTime())) return String(d)
    return dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch (e) {
    return String(d)
  }
}

export async function GET(req: NextRequest, ctx: { params: { token: string } }) {
  var token = ctx.params.token || ''
  if (!token || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return htmlResponse(buildSignStateHtml('invalid'), 400)
  }

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  var res = await supabase
    .from('devis')
    .select('id, numero, statut, client_nom, client_phone, event_date, event_lieu, event_format, item_format, nb_personnes, config_data, variant_chosen, variants, signature_status, signed_at')
    .eq('signature_token', token)
    .single()

  if (res.error || !res.data) {
    return htmlResponse(buildSignStateHtml('invalid'), 404)
  }
  var d = res.data as any

  // Déjà signé
  if (d.signature_status === 'signed') {
    return htmlResponse(buildSignStateHtml('done', {
      numero: d.numero || '',
      signedAtLabel: d.signed_at ? frDate(d.signed_at) : ''
    }))
  }

  // Config retenue
  var cfg = d.config_data || {}
  var lines = Array.isArray(cfg.lines) ? cfg.lines : []
  if (lines.length === 0) {
    // Pas de configuration figée → lien non finalisé
    return htmlResponse(buildSignStateHtml('invalid'), 409)
  }

  // Noms des articles via le catalogue
  var nameMap: { [id: string]: string } = {}
  var ids = lines.map(function (l: any) { return String(l.offering_id || l.id || '') }).filter(function (x: string) { return !!x })
  if (ids.length > 0) {
    var catRes = await supabase.from('catering_offerings').select('id, name').in('id', ids)
    if (!catRes.error && catRes.data) {
      catRes.data.forEach(function (o: any) { nameMap[o.id] = o.name })
    }
  }

  var items = lines.map(function (l: any) {
    var id = String(l.offering_id || l.id || '')
    return { name: nameMap[id] || id, qty: Number(l.qty) || 0 }
  })

  // Label de formule
  var variantKey = cfg.variant_key || d.variant_chosen || ''
  var formuleLabel = variantKey ? (variantKey.charAt(0).toUpperCase() + variantKey.slice(1)) : 'Sur mesure'
  if (Array.isArray(d.variants)) {
    for (var i = 0; i < d.variants.length; i++) {
      if (d.variants[i] && d.variants[i].key === variantKey && d.variants[i].label) {
        formuleLabel = d.variants[i].label
        break
      }
    }
  }

  var totals = cfg.totals || {}
  var pax = Number(cfg.pax) || Number(d.nb_personnes) || 0

  var payload = {
    token: token,
    numero: d.numero || '',
    clientNom: d.client_nom || '',
    eventDateLabel: frDate(d.event_date),
    eventLieu: d.event_lieu || '',
    formatLabel: FORMAT_LABELS[d.event_format] || FORMAT_LABELS.autre,
    pax: pax,
    formuleLabel: formuleLabel,
    items: items,
    totalTTC: Number(totals.total_ttc) || 0,
    perPersTTC: Number(totals.per_pers_ttc) || 0,
    logoUrl: '/MESHUGA_Logotype_white.png',
    prefillPhone: d.client_phone || ''
  }

  // Marque comme "vu" (audit léger) sans écraser un état plus avancé
  if (d.signature_status === 'configured' || d.signature_status === 'sent') {
    await supabase.from('devis').update({ signature_status: 'viewed' }).eq('id', d.id)
  }

  return htmlResponse(buildDevisSignHtml(payload))
}
