// app/api/catering/generate-options/route.ts
// Phase 4V3.1 — Génère 3 options de devis catering via Claude AI à partir d'un brief.
//
// Input (POST body) :
// {
//   eventFormat: 'cocktail'|'lunch'|'soiree'|'petit_dej'|'buffet'|'autre',
//   nbPersonnes: number,
//   eventDate: string (ISO),
//   budgetCibleHTPerPers?: number,    // optionnel : budget HT par personne
//   contextNotes?: string,             // optionnel : notes libres ("agence créa", "vegan welcome", etc.)
//   configuration: 'meshuga_seul'|'meshuga_cocktail'  // mix item
// }
//
// Output :
// {
//   ok: true,
//   options: [
//     { key: 'essentiel', label: 'Essentiel', items: [{offering_id, qty, ...}], totalHT, totalTTC, perPersonneTTC, ... },
//     { key: 'signature', label: 'Signature', ... },
//     { key: 'excellence', label: 'Excellence', ... }
//   ]
// }
// ou : { ok: false, error: string }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

// ENV
var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ''

// Modèle utilisé : Haiku 4.5 = rapide + pas cher pour génération JSON structurée
var CLAUDE_MODEL = 'claude-haiku-4-5-20251001'

// Helpers de réponse
function badRequest(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 400 })
}
function serverError(msg: string) {
  return NextResponse.json({ ok: false, error: msg }, { status: 500 })
}

// Format euros
function fmtEur(n: number): string {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Brief structuré pour Claude
interface Brief {
  eventFormat: string         // 'petit_dej' | 'business_lunch' | 'cocktail' | 'soiree'
  nbPersonnes: number
  eventDate: string
  eventLieu: string           // adresse de livraison ou réception
  logisticsMode: string       // 'livraison' | 'live_cooking'
  eventHour: string           // 'HH:MM' — heure de livraison ou de début de réception
  meshugaIsOnly: boolean      // si Cocktail/Soirée: true=seul, false=cocktail only avec autre traiteur
  budgetCibleHTPerPers?: number
  contextNotes?: string
}

// Item du catalogue passé à Claude (compact)
interface CatalogItem {
  id: string
  category: string
  subcategory: string | null
  name: string
  composition: string | null
  pv_ht: number
  tva_pct: number
  size_pers: number | null
  is_hot: boolean
}

// Item dans une option générée
interface GeneratedItem {
  offering_id: string
  name: string
  qty: number
  unit_price_ht: number
  tva_pct: number
  total_ht: number
  total_ttc: number
}

// Option complète générée
interface GeneratedOption {
  key: string
  label: string
  description: string
  items: GeneratedItem[]
  total_ht: number
  total_tva: number
  total_ttc: number
  per_personne_ht: number
  per_personne_ttc: number
  ai_generated: boolean
  ai_generated_at: string
}

// Construit le prompt système pour Claude
function buildSystemPrompt(): string {
  return [
    'Tu es l\'expert traiteur événementiel de Meshuga (deli new-yorkais à Paris, 3 rue Vavin 75006).',
    'Tu construis des devis B2B en piochant UNIQUEMENT dans le catalogue fourni.',
    '',
    '════════════════ RÈGLES STRICTES ════════════════',
    '',
    '1. UTILISATION DU CATALOGUE',
    '   Utilise UNIQUEMENT les `id` du catalogue donné. Aucune invention.',
    '   Si un item demandé n\'existe pas dans le catalogue, ignore-le.',
    '   IMPORTANT box_mini : "size:Npers" = N mini-pièces DÉJÀ contenues dans la box. `qty` = nombre de BOXES, PAS de pièces.',
    '   Pour viser X pièces/pers : pièces totales = X × nbPersonnes, puis qty ≈ pièces / size de la box. Ex : 200 pièces avec des box de 40 → ~5 boxes au total (réparties sur le mix).',
    '   Le serveur recalibre les quantités de minis pour atteindre la cible exacte : concentre-toi sur un bon MIX et de bonnes proportions, pas sur le compte précis.',
    '',
    '2. RÈGLES MÉTIER PAR TYPE DE PRESTATION',
    '',
    '   PETIT-DÉJEUNER',
    '   - Items autorisés : UNIQUEMENT sandwiches petit-déj catégorie box_mini sub="petitdej" : Egg, Lox, PBN, Lobster (et leurs variantes mini si format Mini).',
    '   - Pas de viennoiseries (on n\'en fait pas).',
    '   - Format STANDARD : 1 sandwich petit-déj complet par personne + 0,2 L de jus d\'orange par personne (vendu au litre, arrondi au 0,5L sup).',
    '   - Format MINI : 2-3 minis par personne (Essentiel=2/pers, Signature=2,5/pers, Excellence=3/pers) + 0,15-0,2 L jus orange/pers.',
    '   - Possibilité d\'ajouter "Orange pressée vendue au litre" si dispo dans catégorie addon.',
    '   - Logistique : LIVRAISON BOX OU LIVE COOKING. Si live cooking : un sandwich petit-déj est préparé en live + un live_forfait inclus.',
    '',
    '   BUSINESS LUNCH (toujours format STANDARD)',
    '   - Items autorisés : catégorie lunch_box (lunch boxes individuelles) + catégorie platter (plateaux à partager).',
    '   - Tu arbitres avec flexibilité selon le contexte client (ex: groupe formel = lunch box, ambiance détendue = mix plateaux+box, équipe créative = plateaux à partager).',
    '   - Quantité indicative : ~1 lunch box/pers OU 1 plateau pour 8-10 pers.',
    '   - Logistique : LIVRAISON BOX UNIQUEMENT (pas de live cooking).',
    '',
    '   COCKTAIL DÎNATOIRE (toujours format MINI)',
    '   - Items autorisés : catégorie box_mini (mini-pièces) + sucrés en box_mini sub="sucre".',
    '   - Si Meshuga = SEUL traiteur : 5-6 minis/pers (Essentiel=5, Signature=5, Excellence=6).',
    '   - Si Meshuga = COCKTAIL ONLY (mix avec autre traiteur) : 2-3 minis/pers (Essentiel=2, Signature=3, Excellence=3).',
    '   - Mix recommandé : ~70% salé, ~30% sucré.',
    '   - Logistique : LIVRAISON BOX OU LIVE COOKING.',
    '',
    '   SOIRÉE (toujours format MINI)',
    '   - Mêmes règles que Cocktail dînatoire.',
    '   - Si Meshuga seul : 5-6 minis/pers.',
    '   - Si cocktail only : 2-3 minis/pers.',
    '   - Logistique : LIVRAISON BOX OU LIVE COOKING.',
    '',
    '3. RÈGLES SELON LE MODE LOGISTIQUE',
    '',
    '   LIVRAISON BOX',
    '   - ÉVITER les sandwiches avec fromage fondu (Reuben, Pastrami chaud, etc.) → ils seront froids à la livraison, mauvais.',
    '   - Privilégier les sandwiches froids ou tièdes qui tiennent le transport.',
    '   - Pas de live items.',
    '',
    '   LIVE COOKING',
    '   - Inclure UN live_forfait approprié au nombre de personnes (le forfait inclut déjà la prestation 2h30 + setup 1h30).',
    '   - Pas besoin d\'ajouter manuellement des "live_minis" : ils sont inclus dans le forfait choisi.',
    '   - Compléter avec des items mini classiques de la catégorie box_mini si besoin.',
    '',
    '4. RÈGLES SUR LES 3 OPTIONS',
    '',
    '   ESSENTIEL (~70-80% du budget cible)',
    '   - Sélection essentielle, sans superflu.',
    '   - Quantités au minimum de la fourchette autorisée.',
    '   - Items à coût direct plus modéré.',
    '',
    '   SIGNATURE (~100% du budget cible) — RECOMMANDÉ',
    '   - LE choix Meshuga équilibré, le best of.',
    '   - Quantités médianes.',
    '   - Mix optimal entre signature items et items premium.',
    '',
    '   EXCELLENCE (~120-130% du budget cible)',
    '   - Généreux, varié, inclut les items premium (lobster, smoked salmon, etc. si dispo).',
    '   - Quantités au max de la fourchette.',
    '   - Plus de variété d\'items.',
    '',
    '   IMPORTANT : les 3 options doivent avoir des items DIFFÉRENTS (pas de copier-coller, juste varier les quantités).',
    '',
    '5. GESTION CONTEXTE NOTES',
    '   - Si "vegan" mentionné : éliminer viandes/poisson, privilégier items végétariens.',
    '   - Si "allergie X" : éliminer items avec X.',
    '   - Si "casher" / "halal" : adapter (privilégier poisson, éviter mélange viande/lait).',
    '',
    '6. BUDGET PAR DÉFAUT',
    '   Si pas de budget cible donné : Signature à 25-30€ HT/personne pour Cocktail/Soirée, 18-22€ pour Lunch, 12-15€ pour Petit-déj.',
    '',
    '════════════════ FORMAT OUTPUT ════════════════',
    '',
    'Réponds UNIQUEMENT avec ce JSON, sans texte avant/après :',
    '{',
    '  "options": [',
    '    {',
    '      "key": "essentiel" | "signature" | "excellence",',
    '      "description": "phrase courte décrivant le parti pris (max 80 chars)",',
    '      "items": [',
    '        { "offering_id": "id-exact-du-catalogue", "qty": 50 }',
    '      ]',
    '    }',
    '  ]',
    '}',
    '',
    'Pas de calculs de prix dans ton output (le serveur calcule les totaux à partir du catalogue).',
    'Génère TOUJOURS les 3 options dans cet ordre : essentiel → signature → excellence.',
    '',
    'IMPORTANT — quantité vs qualité :',
    '- La QUANTITÉ (pièces / personne) est normalisée automatiquement par le serveur, à l\'identique pour les 3 formules. Ce qui distingue les formules, c\'est la QUALITÉ / la gamme des box choisies, pas la quantité.',
    '- Pour chaque formule, propose 3 à 4 box DISTINCTES (catégorie box_mini), de la plus pertinente à la moins pertinente, cohérentes avec le niveau : Essentiel = classiques (daily / classic), Signature = classiques + pièces signature (LOX, tarama, reuben, flatiron), Excellence = premium (lobster : tribeca, oyster bay, plaza).',
    '- L\'ordre des box compte : le serveur garde les premières pour couvrir la cible. Mets les plus représentatives de la gamme en premier.',
    '- La description (max 80 chars) doit VENDRE la gamme (les produits phares), pas la quantité.'
  ].join('\n')
}

// Construit le user message avec brief + catalogue
function buildUserPrompt(brief: Brief, catalog: CatalogItem[]): string {
  var formatLabels: { [k: string]: string } = {
    petit_dej: 'PETIT-DÉJEUNER',
    business_lunch: 'BUSINESS LUNCH',
    cocktail: 'COCKTAIL DÎNATOIRE',
    soiree: 'SOIRÉE'
  }
  var formatLabel = formatLabels[brief.eventFormat] || brief.eventFormat

  var logisticsLabel =
    brief.logisticsMode === 'live_cooking'
      ? 'LIVE COOKING sur site (mise en place 1h30 avant + 2h30 prestation incluses)'
      : 'LIVRAISON BOX'

  var meshugaLabel =
    brief.meshugaIsOnly
      ? 'SEUL TRAITEUR (Meshuga couvre tous les besoins)'
      : 'COCKTAIL ONLY (Meshuga complète l\'offre d\'un autre traiteur principal — format mini imposé, 2-3 pièces/pers)'

  var lines: string[] = []
  lines.push('═════════ BRIEF DEVIS ═════════')
  lines.push('Type de prestation : ' + formatLabel)
  lines.push('Nombre de personnes : ' + brief.nbPersonnes)
  lines.push('Date événement : ' + brief.eventDate)
  if (brief.eventLieu) lines.push('Lieu : ' + brief.eventLieu)
  if (brief.eventHour) {
    var hourLabel = brief.logisticsMode === 'live_cooking'
      ? 'Heure de début de réception : ' + brief.eventHour
      : 'Heure de livraison : ' + brief.eventHour
    lines.push(hourLabel)
  }
  lines.push('Mode logistique : ' + logisticsLabel)
  if (brief.eventFormat === 'cocktail' || brief.eventFormat === 'soiree') {
    lines.push('Configuration Meshuga : ' + meshugaLabel)
  }
  if (brief.budgetCibleHTPerPers && brief.budgetCibleHTPerPers > 0) {
    lines.push('Budget cible (option Signature) : ' + brief.budgetCibleHTPerPers + ' € HT par personne')
  }
  if (brief.contextNotes && brief.contextNotes.trim()) {
    lines.push('Notes / contexte : ' + brief.contextNotes.trim())
  }
  lines.push('')
  lines.push('═════════ CATALOGUE DISPO (' + catalog.length + ' items) ═════════')
  lines.push('')
  // Catalogue groupé par catégorie + sous-catégorie pour lisibilité
  var byCat: { [k: string]: CatalogItem[] } = {}
  catalog.forEach(function (item) {
    var k = item.category + (item.subcategory ? ' / ' + item.subcategory : '')
    if (!byCat[k]) byCat[k] = []
    byCat[k].push(item)
  })
  Object.keys(byCat).sort().forEach(function (cat) {
    lines.push('## ' + cat.toUpperCase())
    byCat[cat].forEach(function (item) {
      var parts: string[] = []
      parts.push('  - id="' + item.id + '"')
      parts.push('"' + item.name + '"')
      if (item.composition) parts.push('(' + item.composition.slice(0, 80) + ')')
      parts.push(item.pv_ht + '€HT')
      if (item.size_pers) parts.push('size:' + item.size_pers + 'pers')
      if (item.is_hot) parts.push('🔥hot')
      lines.push(parts.join(' '))
    })
    lines.push('')
  })
  lines.push('═════════ TÂCHE ═════════')
  lines.push('Génère MAINTENANT les 3 options (Essentiel / Signature / Excellence) selon les règles métier.')
  lines.push('Réponds UNIQUEMENT avec le JSON demandé, rien d\'autre.')
  return lines.join('\n')
}

// Calcule les totaux d'une option à partir des items + catalogue
function computeTotals(
  rawItems: { offering_id: string; qty: number }[],
  catalogMap: { [id: string]: CatalogItem },
  nbPersonnes: number
): {
  items: GeneratedItem[]
  total_ht: number
  total_tva: number
  total_ttc: number
  per_personne_ht: number
  per_personne_ttc: number
} {
  var items: GeneratedItem[] = []
  var totalHT = 0
  var totalTVA = 0
  rawItems.forEach(function (raw) {
    var cat = catalogMap[raw.offering_id]
    if (!cat) return // skip items inconnus (l'IA aurait halluciné)
    var qty = Number(raw.qty) || 0
    if (qty <= 0) return
    var unitHT = Number(cat.pv_ht) || 0
    var tvaPct = Number(cat.tva_pct) || 10
    var lineHT = unitHT * qty
    var lineTVA = lineHT * (tvaPct / 100)
    var lineTTC = lineHT + lineTVA
    items.push({
      offering_id: raw.offering_id,
      name: cat.name,
      qty: qty,
      unit_price_ht: unitHT,
      tva_pct: tvaPct,
      total_ht: Math.round(lineHT * 100) / 100,
      total_ttc: Math.round(lineTTC * 100) / 100
    })
    totalHT += lineHT
    totalTVA += lineTVA
  })
  var totalTTC = totalHT + totalTVA
  var perPersHT = nbPersonnes > 0 ? totalHT / nbPersonnes : 0
  var perPersTTC = nbPersonnes > 0 ? totalTTC / nbPersonnes : 0
  return {
    items: items,
    total_ht: Math.round(totalHT * 100) / 100,
    total_tva: Math.round(totalTVA * 100) / 100,
    total_ttc: Math.round(totalTTC * 100) / 100,
    per_personne_ht: Math.round(perPersHT * 100) / 100,
    per_personne_ttc: Math.round(perPersTTC * 100) / 100
  }
}

// Cible de pièces de minis par personne (déterministe, fiabilise le dimensionnement IA).
// 0 = pas de recalage (formats non concernés).
function miniTargetPerPers(format: string, meshugaIsOnly: boolean): number {
  // Cible HOMOGÈNE entre les 3 formules : la qualité distingue les tiers, pas la quantité.
  if (format !== 'cocktail' && format !== 'soiree') return 0
  return meshugaIsOnly ? 6 : 3
}

// Recale les minis en BOÎTES ENTIÈRES pour couvrir pax × perPers pièces, arrondi au
// SUPÉRIEUR. On garde le minimum de box distinctes (variété) ; pour les gros événements
// on incrémente en round-robin. La sélection (qualité) vient de l'IA, la quantité est
// normalisée ici → formules homogènes en quantité.
function rescaleMiniItems(
  rawItems: { offering_id: string; qty: number }[],
  catalogMap: { [id: string]: CatalogItem },
  pax: number,
  perPers: number
): { offering_id: string; qty: number }[] {
  if (perPers <= 0 || pax <= 0) return rawItems
  var target = Math.round(pax * perPers)
  if (target <= 0) return rawItems

  var unitPieces = function (id: string): number {
    var c = catalogMap[id]
    if (!c) return 0
    if (c.category === 'box_mini') return Number(c.size_pers) || 0
    if (c.category === 'live_mini') return 1
    return 0
  }

  // Sépare minis (dédoublonnés, dans l'ordre proposé) et non-minis.
  var minis: { offering_id: string; qty: number }[] = []
  var others: { offering_id: string; qty: number }[] = []
  rawItems.forEach(function (r) {
    var c = catalogMap[r.offering_id]
    if (c && (c.category === 'box_mini' || c.category === 'live_mini')) {
      var exists = false
      for (var k = 0; k < minis.length; k++) {
        if (minis[k].offering_id === r.offering_id) { exists = true; break }
      }
      if (!exists && unitPieces(r.offering_id) > 0) minis.push({ offering_id: r.offering_id, qty: 1 })
    } else {
      others.push({ offering_id: r.offering_id, qty: Number(r.qty) || 0 })
    }
  })
  if (minis.length === 0) return rawItems

  // Phase A : minimum de box distinctes (1 chacune) pour couvrir la cible (arrondi au sup.).
  var kept: { offering_id: string; qty: number }[] = []
  var acc = 0
  for (var i = 0; i < minis.length && acc < target; i++) {
    kept.push({ offering_id: minis[i].offering_id, qty: 1 })
    acc += unitPieces(minis[i].offering_id)
  }
  if (kept.length === 0) {
    kept.push({ offering_id: minis[0].offering_id, qty: 1 })
    acc += unitPieces(minis[0].offering_id)
  }

  // Phase B : gros événements → on monte les quantités en round-robin jusqu'à couvrir.
  var idx = 0
  var guard = 0
  while (acc < target && guard < 2000) {
    var line = kept[idx % kept.length]
    line.qty += 1
    acc += unitPieces(line.offering_id)
    idx++
    guard++
  }

  return others.concat(kept)
}

export async function POST(req: NextRequest) {
  // 1. Validate ENV
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return serverError('Supabase ENV missing')
  if (!ANTHROPIC_API_KEY) return serverError('ANTHROPIC_API_KEY missing in Vercel env')

  // 2. Parse body
  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return badRequest('Invalid JSON body')
  }

  var brief: Brief = {
    eventFormat: String(body.eventFormat || ''),
    nbPersonnes: Number(body.nbPersonnes) || 0,
    eventDate: String(body.eventDate || ''),
    eventLieu: String(body.eventLieu || ''),
    logisticsMode: String(body.logisticsMode || 'livraison'),
    eventHour: String(body.eventHour || ''),
    meshugaIsOnly: body.meshugaIsOnly === true || body.meshugaIsOnly === 'true',
    budgetCibleHTPerPers: body.budgetCibleHTPerPers ? Number(body.budgetCibleHTPerPers) : undefined,
    contextNotes: body.contextNotes ? String(body.contextNotes) : undefined
  }
  var validFormats = ['petit_dej', 'business_lunch', 'cocktail', 'soiree']
  if (validFormats.indexOf(brief.eventFormat) === -1) {
    return badRequest('eventFormat invalid (must be petit_dej / business_lunch / cocktail / soiree)')
  }
  if (!brief.nbPersonnes || brief.nbPersonnes < 1) return badRequest('nbPersonnes required (>=1)')

  // Validation logistique : business_lunch n'autorise QUE livraison.
  // Petit-déj, cocktail, soirée : livraison ou live cooking au choix.
  if (brief.eventFormat === 'business_lunch' && brief.logisticsMode === 'live_cooking') {
    return badRequest('Live cooking non autorisé pour business_lunch (livraison uniquement)')
  }

  // 3. Charger le catalogue actif
  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  var catRes = await supabase
    .from('catering_offerings')
    .select('id, category, subcategory, name, composition, pv_ht, tva_pct, size_pers, is_hot')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true })

  if (catRes.error) return serverError('Catalog fetch failed: ' + catRes.error.message)
  var catalog = (catRes.data || []) as CatalogItem[]
  if (catalog.length === 0) return serverError('Catalog vide (0 offerings)')

  // Map pour lookup rapide
  var catalogMap: { [id: string]: CatalogItem } = {}
  catalog.forEach(function (item) {
    catalogMap[item.id] = item
  })

  // 4. Appel Claude
  var anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  var systemPrompt = buildSystemPrompt()
  var userPrompt = buildUserPrompt(brief, catalog)

  var aiResponse: any
  try {
    aiResponse = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  } catch (e: any) {
    return serverError('Claude API error: ' + (e && e.message ? e.message : 'unknown'))
  }

  // 5. Parse JSON renvoyé
  var rawText = ''
  if (aiResponse && aiResponse.content && aiResponse.content.length > 0) {
    aiResponse.content.forEach(function (block: any) {
      if (block.type === 'text') rawText += block.text
    })
  }
  if (!rawText) return serverError('Claude empty response')

  // Robustesse : si Claude entoure de ```json ... ```, on strip
  rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim()
  // Si du texte avant/après, on extrait l'objet JSON principal
  var firstBrace = rawText.indexOf('{')
  var lastBrace = rawText.lastIndexOf('}')
  if (firstBrace > 0 || lastBrace < rawText.length - 1) {
    if (firstBrace > -1 && lastBrace > firstBrace) {
      rawText = rawText.slice(firstBrace, lastBrace + 1)
    }
  }

  var parsed: any
  try {
    parsed = JSON.parse(rawText)
  } catch (e) {
    return serverError('Claude returned invalid JSON: ' + rawText.slice(0, 200))
  }

  if (!parsed.options || !Array.isArray(parsed.options) || parsed.options.length !== 3) {
    return serverError('Claude returned invalid structure (expected 3 options)')
  }

  // 6. Mapping label fixe + calcul totaux
  var KEY_TO_LABEL: { [k: string]: string } = {
    essentiel: 'Essentiel',
    signature: 'Signature',
    excellence: 'Excellence'
  }
  var nowIso = new Date().toISOString()
  var enriched: GeneratedOption[] = []
  for (var i = 0; i < parsed.options.length; i++) {
    var opt = parsed.options[i]
    var key = String(opt.key || '').toLowerCase()
    if (!KEY_TO_LABEL[key]) {
      // fallback : assigne par ordre
      var keys = ['essentiel', 'signature', 'excellence']
      key = keys[i] || 'option_' + i
    }
    var rawItems = Array.isArray(opt.items) ? opt.items : []
    var perPers = miniTargetPerPers(brief.eventFormat, brief.meshugaIsOnly)
    rawItems = rescaleMiniItems(rawItems, catalogMap, brief.nbPersonnes, perPers)
    var totals = computeTotals(rawItems, catalogMap, brief.nbPersonnes)
    enriched.push({
      key: key,
      label: KEY_TO_LABEL[key] || key,
      description: String(opt.description || '').slice(0, 200),
      items: totals.items,
      total_ht: totals.total_ht,
      total_tva: totals.total_tva,
      total_ttc: totals.total_ttc,
      per_personne_ht: totals.per_personne_ht,
      per_personne_ttc: totals.per_personne_ttc,
      ai_generated: true,
      ai_generated_at: nowIso
    })
  }

  // 7. Trie : essentiel < signature < excellence
  var ORDER: { [k: string]: number } = { essentiel: 0, signature: 1, excellence: 2 }
  enriched.sort(function (a, b) {
    return (ORDER[a.key] || 99) - (ORDER[b.key] || 99)
  })

  return NextResponse.json({
    ok: true,
    options: enriched,
    brief: brief,
    debug: {
      model: CLAUDE_MODEL,
      catalog_size: catalog.length,
      input_tokens: aiResponse.usage ? aiResponse.usage.input_tokens : null,
      output_tokens: aiResponse.usage ? aiResponse.usage.output_tokens : null
    }
  })
}
