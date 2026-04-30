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
  eventFormat: string
  nbPersonnes: number
  eventDate: string
  budgetCibleHTPerPers?: number
  contextNotes?: string
  configuration: string
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
    'Tu es un expert traiteur événementiel pour Meshuga (deli new-yorkais à Paris).',
    'Tu construis des devis B2B en piochant UNIQUEMENT dans le catalogue fourni.',
    '',
    'RÈGLES STRICTES :',
    '1. Utilise UNIQUEMENT les `id` du catalogue donné. Aucune invention.',
    '2. Quantités cohérentes avec le nombre de personnes :',
    '   - Cocktail dînatoire : 8-12 mini-pièces salées + 2-4 sucrées par personne',
    '   - Lunch : 1 sandwich complet ou 1 lunch box par personne + 1 dessert',
    '   - Petit-déjeuner : 1-2 viennoiseries + 1 boisson par personne',
    '   - Soirée : 6-10 mini-pièces salées + 2-3 sucrées par personne',
    '   - Buffet : 1 plat principal + accompagnements + dessert par personne',
    '3. Mix équilibré : varier viandes / poisson / végétarien quand possible.',
    '4. Si le client mentionne "vegan" / "végé" / "halal" / "casher" : adapte la sélection.',
    '5. Si "live cooking" demandé ou format adapté : inclure un live_forfait + des live_minis.',
    '',
    'BUDGET PAR OPTION :',
    '- Essentiel : ~70% du budget cible (sélection essentielle, sans superflu)',
    '- Signature : ~100% du budget cible (LE choix recommandé Meshuga)',
    '- Excellence : ~130% du budget cible (généreux, varié, premium)',
    '',
    'Si pas de budget cible donné : Signature ~25-30€ HT/personne par défaut.',
    '',
    'OUTPUT : JSON strict UNIQUEMENT, pas de texte avant/après. Schema :',
    '{',
    '  "options": [',
    '    {',
    '      "key": "essentiel" | "signature" | "excellence",',
    '      "description": "phrase courte décrivant le parti pris (max 80 chars)",',
    '      "items": [',
    '        { "offering_id": "id-du-catalogue", "qty": 50 }',
    '      ]',
    '    }',
    '  ]',
    '}',
    '',
    'Pas de calculs de prix dans ton output (le serveur s\'en charge à partir du catalogue).',
    'Les 3 options DOIVENT avoir des items différents (pas de copier-coller).'
  ].join('\n')
}

// Construit le user message avec brief + catalogue
function buildUserPrompt(brief: Brief, catalog: CatalogItem[]): string {
  var formatLabels: { [k: string]: string } = {
    cocktail: 'cocktail dînatoire',
    lunch: 'lunch',
    soiree: 'soirée',
    petit_dej: 'petit-déjeuner d\'entreprise',
    buffet: 'buffet',
    autre: 'événement'
  }
  var formatLabel = formatLabels[brief.eventFormat] || 'événement'
  var configLabel =
    brief.configuration === 'meshuga_seul'
      ? 'EXCLUSIVEMENT des items signature Meshuga (sandwiches, deli, sucrés)'
      : 'Meshuga en cocktail (mix sandwiches Meshuga + plateaux + autres)'

  var lines: string[] = []
  lines.push('BRIEF :')
  lines.push('- Format : ' + formatLabel)
  lines.push('- Nombre de personnes : ' + brief.nbPersonnes)
  lines.push('- Date : ' + brief.eventDate)
  lines.push('- Configuration : ' + configLabel)
  if (brief.budgetCibleHTPerPers && brief.budgetCibleHTPerPers > 0) {
    lines.push('- Budget cible (option Signature) : ' + brief.budgetCibleHTPerPers + ' € HT par personne')
  }
  if (brief.contextNotes && brief.contextNotes.trim()) {
    lines.push('- Contexte / notes : ' + brief.contextNotes.trim())
  }
  lines.push('')
  lines.push('CATALOGUE DISPONIBLE (' + catalog.length + ' items) :')
  lines.push('')
  // Catalogue groupé par catégorie pour lisibilité
  var byCategory: { [k: string]: CatalogItem[] } = {}
  catalog.forEach(function (item) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  })
  Object.keys(byCategory).forEach(function (cat) {
    lines.push('## ' + cat.toUpperCase())
    byCategory[cat].forEach(function (item) {
      var parts: string[] = []
      parts.push('  - id="' + item.id + '"')
      parts.push('"' + item.name + '"')
      if (item.composition) parts.push('(' + item.composition.slice(0, 80) + ')')
      parts.push(item.pv_ht + '€HT')
      if (item.size_pers) parts.push('size:' + item.size_pers + 'pers')
      if (item.is_hot) parts.push('🔥')
      lines.push(parts.join(' '))
    })
    lines.push('')
  })
  lines.push('GÉNÈRE 3 OPTIONS (Essentiel / Signature / Excellence) maintenant.')
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
    budgetCibleHTPerPers: body.budgetCibleHTPerPers ? Number(body.budgetCibleHTPerPers) : undefined,
    contextNotes: body.contextNotes ? String(body.contextNotes) : undefined,
    configuration: String(body.configuration || 'meshuga_cocktail')
  }
  if (!brief.eventFormat) return badRequest('eventFormat required')
  if (!brief.nbPersonnes || brief.nbPersonnes < 1) return badRequest('nbPersonnes required (>=1)')

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
