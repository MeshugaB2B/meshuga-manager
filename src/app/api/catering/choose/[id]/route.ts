import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildDevisChoiceHtml, buildDevisConfigHtml } from '@/lib/catering/cateringChoice'
import { buildOfferingMap, computeVariant } from '@/lib/catering/cateringCore'

export const runtime = 'nodejs'
export const maxDuration = 15

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function htmlResponse(html: string, status?: number) {
  return new NextResponse(html, {
    status: status || 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow'
    }
  })
}

function infoPage(title: string, msg: string, status: number) {
  var body = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + title + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">' +
    '<style>body{font-family:Arial,Helvetica,sans-serif;background:#FFEB5A;color:#191923;margin:0;padding:40px 20px;text-align:center}' +
    '.box{max-width:460px;margin:0 auto;background:#fff;border:2px solid #191923;border-radius:16px;box-shadow:5px 5px 0 #FF82D7;padding:30px}' +
    'h1{font-family:Yellowtail,cursive;font-size:34px;font-weight:400;margin:0 0 10px;color:#FF82D7}' +
    'p{font-size:15px;line-height:1.6;color:#191923}a{color:#FF82D7;font-weight:900}</style></head>' +
    '<body><div class="box"><h1>' + title + '</h1><p>' + msg + '</p>' +
    '<p style="margin-top:18px;font-size:13px;color:#777">Contactez-nous : <a href="mailto:events@meshuga.fr">events@meshuga.fr</a></p>' +
    '</div></body></html>'
  return htmlResponse(body, status)
}

// Met à l'échelle (continue, sans arrondi boîte) les lignes de minis d'une formule
// pour viser EXACTEMENT pax × perPers pièces. Utilisé seulement pour l'aperçu des
// cartes : prix proportionnel + minis/personne = la cible (ordre des prix préservé).
// L'arrondi en boîtes entières se fait côté configurateur.
function scaleLinesContinuous(lines: any[], map: any, pax: number, perPers: number) {
  var raw = (lines || []).map(function (l: any) {
    return { offering_id: String(l.offering_id), qty: Number(l.qty) || 0 }
  })
  var target = pax * perPers
  var cur = 0
  raw.forEach(function (l: any) {
    var o = map[l.offering_id]
    if (!o) return
    if (o.category === 'box_mini') cur += l.qty * (Number(o.size_pers) || 0)
    else if (o.category === 'live_mini') cur += l.qty
  })
  if (cur <= 0 || target <= 0) return raw
  var scale = target / cur
  return raw.map(function (l: any) {
    var o = map[l.offering_id]
    var isMini = o && (o.category === 'box_mini' || o.category === 'live_mini')
    return { offering_id: l.offering_id, qty: isMini ? l.qty * scale : l.qty }
  })
}

export async function GET(req: NextRequest, ctx: { params: { id: string } }) {
  var devisId = ctx.params.id || ''
  if (!devisId) return infoPage('Oups…', 'Identifiant du devis manquant.', 400)
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return infoPage('Oups…', 'Configuration serveur manquante.', 500)

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  var dRes = await supabase
    .from('devis')
    .select('id, numero, date_validite, client_nom, client_contact, event_format, nb_personnes, event_date, event_lieu, variants, livraison, livraison_offert, mise_en_place, mise_en_place_offert, signature_status, meal_mode')
    .eq('id', devisId)
    .single()
  if (dRes.error || !dRes.data) return infoPage('Oups…', 'Ce devis n\u2019existe pas ou a été supprimé.', 404)
  var d = dRes.data as any

  if (d.signature_status === 'signed') {
    return infoPage('Devis déjà signé', 'Ce devis a déjà été validé et signé. Aucune action supplémentaire n\u2019est nécessaire.', 200)
  }

  var variants = Array.isArray(d.variants) ? d.variants : []
  if (variants.length === 0) return infoPage('Oups…', 'Ce devis n\u2019a pas encore de formule disponible.', 409)

  // Catalogue actif
  var catRes = await supabase
    .from('catering_offerings')
    .select('id, category, subcategory, name, pv_ht, tva_pct, composition, tagline, size_pers, is_active')
    .eq('is_active', true)
  if (catRes.error) return infoPage('Oups…', 'Catalogue indisponible.', 500)
  var catalog = (catRes.data || []) as any[]
  var map = buildOfferingMap(catalog as any)

  var pax = Number(d.nb_personnes) || 0
  // Frais repris du devis. Côté client : aucune remise (prix catalogue).
  var frais = {
    livraison: Number(d.livraison) || 0,
    livraison_offert: d.livraison_offert === true,
    mise_en_place: Number(d.mise_en_place) || 0,
    mise_en_place_offert: d.mise_en_place_offert === true,
    remise_globale_pct: 0
  }

  var url = new URL(req.url)
  var formule = url.searchParams.get('formule')

  // Cible "pièces / personne" par défaut selon le mode (complément vs repas).
  var mealMode = d.meal_mode || 'complement'
  var perPersOptions = mealMode === 'repas' ? [5, 6, 7] : [2, 3, 4]
  var perPersDefault = mealMode === 'repas' ? 6 : 3

  // ===== Écran de configuration d'une formule =====
  if (formule) {
    var v: any = null
    for (var i = 0; i < variants.length; i++) {
      if (variants[i] && variants[i].key === formule) { v = variants[i]; break }
    }
    if (!v) return infoPage('Oups…', 'Cette formule est introuvable.', 404)

    var startLines = (v.lines || []).map(function (l: any) {
      return { offering_id: String(l.offering_id), qty: Number(l.qty) || 0 }
    })
    var catalogueItems = catalog.map(function (o: any) {
      return {
        id: o.id,
        category: o.category,
        subcategory: o.subcategory || null,
        name: o.name,
        pv_ht: Number(o.pv_ht) || 0,
        tva_pct: Number(o.tva_pct) || 0,
        composition: o.composition || null,
        tagline: o.tagline || null,
        size_pers: o.size_pers != null ? Number(o.size_pers) : null
      }
    })

    var configHtml = buildDevisConfigHtml({
      devisId: d.id,
      numero: d.numero || '',
      variantKey: v.key,
      variantLabel: v.label || v.key,
      client: { nom: d.client_nom || '', contact: d.client_contact || '' },
      event: { format: d.event_format, nbPersonnes: pax, date: d.event_date, lieu: d.event_lieu },
      startLines: startLines,
      catalogue: catalogueItems,
      perPersOptions: perPersOptions,
      perPersDefault: perPersDefault,
      frais: frais
    })
    return htmlResponse(configHtml)
  }

  // ===== Écran de choix des formules =====
  // Aperçu prévisualisé au défaut (scaling continu) : prix et minis/personne
  // réalistes et cohérents entre formules, plus de "10 / pers".
  var choiceVariants = variants.map(function (v2: any) {
    var scaled = scaleLinesContinuous(v2.lines || [], map, pax, perPersDefault)
    var totals = computeVariant({ key: v2.key, lines: scaled } as any, map, frais as any, pax)
    var seen: any = {}
    var items: any[] = []
    ;(v2.lines || []).forEach(function (l: any) {
      var off = map[l.offering_id]
      var nm = off ? off.name : l.offering_id
      if (!seen[nm]) { seen[nm] = 1; items.push({ name: nm, qty: 1 }) }
    })
    var minis = 0
    ;(totals.lines || []).forEach(function (lc: any) { minis += Number(lc.mini_pieces) || 0 })
    return {
      key: v2.key,
      label: v2.label || v2.key,
      description: v2.description || '',
      total_ttc: totals.total_ttc,
      per_personne_ttc: totals.per_pers_ttc,
      minis_per_pers: pax > 0 ? Math.round((minis / pax) * 10) / 10 : 0,
      items: items
    }
  })

  // Tri du moins cher au plus cher (recommandée mise en avant au milieu)
  choiceVariants.sort(function (a: any, b: any) { return a.total_ttc - b.total_ttc })

  // Formule recommandée : "signature" par défaut, sinon la formule médiane.
  var recoKey = ''
  for (var k = 0; k < variants.length; k++) {
    if (variants[k] && variants[k].key === 'signature') { recoKey = 'signature'; break }
  }
  if (!recoKey && choiceVariants.length > 0) {
    recoKey = choiceVariants[choiceVariants.length > 1 ? 1 : 0].key
  }

  var choiceHtml = buildDevisChoiceHtml({
    devisId: d.id,
    numero: d.numero || '',
    validite: d.date_validite || undefined,
    client: { nom: d.client_nom || '', contact: d.client_contact || '' },
    event: { format: d.event_format, nbPersonnes: pax, date: d.event_date, lieu: d.event_lieu },
    variants: choiceVariants,
    recommendedKey: recoKey
  })
  return htmlResponse(choiceHtml)
}
