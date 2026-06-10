import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import {
  buildOfferingMap,
  computeVariant,
  computeCoverage
} from '@/lib/catering/cateringCore'

export const runtime = 'nodejs'

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function bad(msg: string, code?: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: code || 400 })
}

// Reçoit { devisId, variantKey, pax, lines:[{id,qty}] } depuis le configurateur client.
// Recalcule TOUT côté serveur à partir du catalogue (prix catalogue, aucune remise client),
// revérifie la couverture, fige la config retenue et crée le token de signature.
export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return bad('Configuration serveur manquante', 500)

  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return bad('Requête invalide')
  }

  var devisId = body.devisId
  var variantKey = String(body.variantKey || '')
  var pax = Number(body.pax) || 0
  var rawLines = Array.isArray(body.lines) ? body.lines : []

  if (!devisId) return bad('Devis introuvable', 404)
  if (pax < 1) return bad('Nombre de personnes invalide')
  if (rawLines.length === 0) return bad('Aucun article sélectionné')

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 1. Charger le devis
  var devisRes = await supabase
    .from('devis')
    .select('id, statut, event_format, item_format, livraison, livraison_offert, mise_en_place, mise_en_place_offert, signature_token, signature_status')
    .eq('id', devisId)
    .single()
  if (devisRes.error || !devisRes.data) return bad('Devis introuvable', 404)
  var devis = devisRes.data as any

  // Déjà signé → on bloque toute reconfiguration
  if (devis.signature_status === 'signed') {
    return bad('Ce devis a déjà été signé.', 409)
  }

  // 2. Charger le catalogue actif
  var catRes = await supabase
    .from('catering_offerings')
    .select('id, category, subcategory, name, composition, pv_ht, tva_pct, fc_ht, size_pers, is_active')
    .eq('is_active', true)
  if (catRes.error) return bad('Catalogue indisponible', 500)
  var catalog = (catRes.data || []) as any[]
  var map = buildOfferingMap(catalog as any)

  // 3. Nettoyer / valider les lignes (les articles inconnus ou inactifs sont ignorés)
  var variantLines: { offering_id: string; qty: number }[] = []
  for (var i = 0; i < rawLines.length; i++) {
    var id = String(rawLines[i].id || rawLines[i].offering_id || '')
    var qty = Number(rawLines[i].qty) || 0
    if (!id || qty <= 0) continue
    if (!map[id]) continue
    variantLines.push({ offering_id: id, qty: qty })
  }
  if (variantLines.length === 0) return bad('Aucun article valide')

  // 4. Frais : repris du devis. Le client ne peut PAS appliquer de remise → 0.
  var frais = {
    livraison: Number(devis.livraison) || 0,
    livraison_offert: devis.livraison_offert === true,
    mise_en_place: Number(devis.mise_en_place) || 0,
    mise_en_place_offert: devis.mise_en_place_offert === true,
    remise_globale_pct: 0
  }

  // 5. Recalcul serveur (source de vérité)
  var variant = { key: variantKey || 'client', lines: variantLines }
  var totals = computeVariant(variant as any, map, frais as any, pax)
  var coverage = computeCoverage(totals.lines, pax, devis.event_format || '', devis.item_format || undefined)

  // Nouveau modèle : le client choisit lui-même le nombre de pièces/personne via le
  // sélecteur du configurateur. On ne bloque donc plus sur une cible fixe — la couverture
  // reste calculée et stockée à titre informatif.

  // 6. Token : réutiliser si déjà présent (et non signé), sinon créer
  var token = devis.signature_token
  if (!token) token = randomBytes(24).toString('hex')

  var configData = {
    variant_key: variantKey,
    pax: pax,
    lines: variantLines,
    totals: {
      total_ht: totals.total_ht,
      tva: totals.tva,
      total_ttc: totals.total_ttc,
      per_pers_ttc: totals.per_pers_ttc
    },
    coverage: {
      current: coverage.current,
      recommended: coverage.recommended,
      covered: coverage.covered
    },
    configured_at: new Date().toISOString()
  }

  // 7. Persister la config retenue + totaux + token
  var upd = await supabase
    .from('devis')
    .update({
      config_data: configData,
      variant_chosen: variantKey,
      nb_personnes: pax,
      total_ht: totals.total_ht,
      tva: totals.tva,
      total_ttc: totals.total_ttc,
      total_marge_ht: totals.marge_ht,
      total_fc_ht: totals.fc_total,
      signature_token: token,
      signature_status: 'configured'
    })
    .eq('id', devisId)
  if (upd.error) return bad('Enregistrement impossible : ' + upd.error.message, 500)

  return NextResponse.json({ ok: true, signUrl: '/devis-sign/' + token })
}
