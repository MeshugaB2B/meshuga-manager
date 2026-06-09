// app/api/catering/choose/[id]/route.ts
// Page publique client : sert soit le comparatif des formules, soit l'écran
// de configuration (?formule=KEY). Lecture devis + catalogue via service role.
//
// URLs :
//   /api/catering/choose/{id}                → comparatif des formules
//   /api/catering/choose/{id}?formule=KEY    → configuration de la formule KEY
//
// Le calcul des totaux affichés réutilise cateringCore (source de vérité).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildDevisChoiceHtml, buildDevisConfigHtml } from '@/lib/catering/cateringChoice'
import { buildOfferingMap, computeVariant, aiOptionToVariant } from '@/lib/catering/cateringCore'

export const runtime = 'nodejs'
export const maxDuration = 15

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

var DEFAULT_LABELS: { [k: string]: string } = {
  essentiel: 'Essentiel',
  signature: 'Signature',
  excellence: 'Excellence'
}

function htmlError(msg: string, status: number) {
  var body = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Devis introuvable</title>' +
    '<style>body{font-family:Arial,sans-serif;background:#FFEB5A;color:#191923;padding:40px;text-align:center}' +
    'h1{font-family:cursive;font-size:36px;margin-bottom:10px}' +
    '.box{max-width:480px;margin:0 auto;background:white;border:2px solid #191923;padding:30px;border-radius:8px;box-shadow:5px 5px 0 #FF82D7}' +
    'a{color:#FF82D7;font-weight:900}</style></head><body>' +
    '<div class="box"><h1>Oups…</h1><p>' + msg + '</p>' +
    '<p style="margin-top:20px;font-size:13px;color:#666">Contactez-nous : <a href="mailto:events@meshuga.fr">events@meshuga.fr</a></p>' +
    '</div></body></html>'
  return new NextResponse(body, { status: status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

function htmlPage(html: string) {
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

// Normalise la colonne variants en formules { key, label, description, lines }
function parseVariants(d: any): any[] {
  var vs = d.variants
  if (typeof vs === 'string') {
    try { vs = JSON.parse(vs) } catch (e) { vs = null }
  }
  var out: any[] = []
  if (Array.isArray(vs) && vs.length > 0) {
    vs.forEach(function (v: any) {
      var lines: any[]
      var key = v && v.key ? v.key : ''
      var label = v && v.label ? v.label : ''
      var description = v && v.description ? v.description : ''
      if (v && Array.isArray(v.lines)) {
        lines = v.lines
      } else {
        var conv = aiOptionToVariant(v)
        lines = conv.lines
        if (!key) key = conv.key
        if (!label) label = conv.label
        if (!description) description = conv.description
      }
      out.push({ key: key, label: label, description: description, lines: lines })
    })
    return out
  }
  var items = Array.isArray(d.items) ? d.items : []
  return [{ key: 'formule', label: 'Formule', description: '', lines: items }]
}

function variantLabel(v: any, i: number): string {
  if (v && v.label) return v.label
  if (v && v.key && DEFAULT_LABELS[v.key]) return DEFAULT_LABELS[v.key]
  return 'Formule ' + (i + 1)
}

// Lignes prêtes pour le calcul / la config (remises internes neutralisées : prix catalogue côté client)
function cleanLines(lines: any[]): { offering_id: string; qty: number; remise_pct: number }[] {
  return (lines || []).map(function (l: any) {
    return { offering_id: l.offering_id, qty: Number(l.qty) || 0, remise_pct: 0 }
  }).filter(function (l) { return l.offering_id && l.qty > 0 })
}

export async function GET(req: NextRequest, context: { params: { id: string } }) {
  var devisId = context && context.params && context.params.id ? context.params.id : ''
  if (!devisId) return htmlError('Identifiant du devis manquant.', 400)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return htmlError('Configuration serveur manquante.', 500)

  var formuleParam = req.nextUrl.searchParams.get('formule') || ''

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 1. Devis
  var devisRes = await supabase
    .from('devis')
    .select('id, numero, statut, client_nom, client_contact, client_email, event_date, event_lieu, nb_personnes, format, event_format, item_format, variants, items, livraison, livraison_offert, mise_en_place, mise_en_place_offert, date_validite')
    .eq('id', devisId)
    .single()

  if (devisRes.error || !devisRes.data) {
    return htmlError('Ce devis n\'existe pas ou a été supprimé.', 404)
  }
  var d = devisRes.data

  // 2. Catalogue actif
  var offRes = await supabase
    .from('catering_offerings')
    .select('id, category, subcategory, name, tagline, composition, pv_ht, tva_pct, size_pers')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  var offerings = offRes.data || []
  var map = buildOfferingMap(offerings as any)

  var frais = {
    livraison: Number(d.livraison) || 0,
    livraison_offert: !!d.livraison_offert,
    mise_en_place: Number(d.mise_en_place) || 0,
    mise_en_place_offert: !!d.mise_en_place_offert,
    remise_globale_pct: 0
  }
  var nbPers = Number(d.nb_personnes) || 1
  var format = d.event_format || d.format || 'autre'

  var variants = parseVariants(d)
  var recommendedKey = 'signature'
  var hasSignature = false
  variants.forEach(function (v) { if (v.key === 'signature') hasSignature = true })
  if (!hasSignature && variants.length > 0) recommendedKey = variants[0].key

  // ---- Cas configuration ----
  var goConfig = formuleParam || variants.length === 1
  if (goConfig) {
    var chosen: any = null
    var idx = 0
    if (formuleParam) {
      for (var i = 0; i < variants.length; i++) {
        if (variants[i].key === formuleParam) { chosen = variants[i]; idx = i; break }
      }
    }
    if (!chosen) { chosen = variants[0]; idx = 0 }
    if (!chosen) return htmlError('Formule introuvable.', 404)

    var startLines = cleanLines(chosen.lines).map(function (l) {
      return { offering_id: l.offering_id, qty: l.qty }
    })

    var catalogue = offerings.map(function (o: any) {
      return {
        id: o.id,
        category: o.category,
        subcategory: o.subcategory,
        name: o.name,
        pv_ht: Number(o.pv_ht) || 0,
        tva_pct: Number(o.tva_pct) || 10,
        composition: o.composition,
        tagline: o.tagline,
        size_pers: o.size_pers
      }
    })

    var configHtml = buildDevisConfigHtml({
      devisId: d.id,
      numero: d.numero || ('#' + d.id),
      variantKey: chosen.key || ('formule_' + (idx + 1)),
      variantLabel: variantLabel(chosen, idx),
      client: { nom: d.client_nom || '', contact: d.client_contact || '' },
      event: { format: format, nbPersonnes: nbPers, date: d.event_date || '', lieu: d.event_lieu || '' },
      startLines: startLines,
      catalogue: catalogue,
      frais: {
        livraison: frais.livraison,
        livraison_offert: frais.livraison_offert,
        mise_en_place: frais.mise_en_place,
        mise_en_place_offert: frais.mise_en_place_offert
      }
    })
    return htmlPage(configHtml)
  }

  // ---- Cas comparatif des formules ----
  var choiceVariants = variants.map(function (v, i) {
    var totals = computeVariant(
      { key: v.key, label: v.label, lines: cleanLines(v.lines) },
      map,
      frais,
      nbPers
    )
    var items = cleanLines(v.lines).map(function (l) {
      var o = map[l.offering_id]
      return { name: o ? o.name : l.offering_id, qty: l.qty }
    })
    return {
      key: v.key || ('formule_' + (i + 1)),
      label: variantLabel(v, i),
      description: v.description || '',
      total_ttc: totals.total_ttc,
      per_personne_ttc: totals.per_pers_ttc,
      items: items
    }
  })

  var choiceHtml = buildDevisChoiceHtml({
    devisId: d.id,
    numero: d.numero || ('#' + d.id),
    validite: d.date_validite || '',
    client: { nom: d.client_nom || '', contact: d.client_contact || '' },
    event: { format: format, nbPersonnes: nbPers, date: d.event_date || '', lieu: d.event_lieu || '' },
    variants: choiceVariants,
    recommendedKey: recommendedKey
  })
  return htmlPage(choiceHtml)
}
