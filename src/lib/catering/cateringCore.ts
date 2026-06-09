// ============================================================
// cateringCore.ts — Moteur de calcul des devis Meshuga Events
// Emplacement cible : src/lib/catering/cateringCore.ts
//
// Fichier TS PUR (aucun JSX) : TypeScript normal autorisé.
// Source unique de vérité, réutilisée par :
//   - l'éditeur de devis (QuoteEditor)
//   - la page publique client (3 formules + "Je choisis")
//   - la facture (FAC-2026)
//
// Règles métier verrouillées :
//   - TVA denrées alimentaires : taux porté par chaque offering (catering_offerings.tva_pct,
//     stocké en ENTIER, ex 10) → toujours passer par tvaToRatio().
//   - TVA prestations (livraison, mise en place, live cooking facturé en presta) : 20 %.
//   - Remise par ligne (remise_pct) appliquée AVANT la remise globale.
//   - Remise globale appliquée uniquement sur les items (pas sur les frais).
//   - "Offrir la livraison / mise en place" → frais ramenés à 0.
//   - Marge interne calculée sur le NET items (après remises), food cost inchangé.
// ============================================================

// ---------- Constantes ----------

export var TVA_PRESTA_RATIO = 0.20 // livraison, mise en place, prestations live

// Catégories du catalogue (alignées sur catering_offerings.category)
export var CAT_BOX_MINI = 'box_mini'
export var CAT_PLATTER = 'platter'
export var CAT_LUNCH_BOX = 'lunch_box'
export var CAT_LIVE_FORFAIT = 'live_forfait'
export var CAT_LIVE_MINI = 'live_mini'
export var CAT_ADDON = 'addon'

// Objectif de couverture (pièces par personne) selon le type d'événement.
// 0 = pas de cible "minis" (ex business_lunch : on raisonne en lunch box).
export var COVERAGE_MINIS_TARGET: { [k: string]: number } = {
  cocktail: 3,
  soiree: 3.5,
  petit_dej: 2.5,
  business_lunch: 0,
  autre: 3
}

// ---------- Types ----------

export interface CateringOffering {
  id: string
  category: string
  subcategory?: string | null
  name: string
  pv_ht: number
  tva_pct: number
  fc_ht?: number | null
  size_pers?: number | null
  is_hot?: boolean | null
  flag_volume?: boolean | null
  flag_exclu?: boolean | null
}

export type OfferingMap = { [id: string]: CateringOffering }

// Ligne d'une formule telle que stockée (offering_id + qté + remise éventuelle).
// name / unit_price_ht / tva_pct sont un cache optionnel (ex : items générés par l'IA).
export interface VariantLine {
  offering_id: string
  qty: number
  remise_pct?: number
  name?: string
  unit_price_ht?: number
  tva_pct?: number
}

export interface Variant {
  key?: string
  label?: string
  description?: string
  lines: VariantLine[]
}

export interface Frais {
  livraison: number
  livraison_offert?: boolean
  mise_en_place?: number
  mise_en_place_offert?: boolean
  remise_globale_pct?: number
}

export interface LineComputed {
  offering_id: string
  name: string
  category: string
  qty: number
  unit_price_ht: number
  tva_pct: number
  remise_pct: number
  brut_ht: number
  remise_montant: number
  total_ligne_ht: number
  tva_ligne: number
  fc_unitaire: number
  fc_ligne: number
  marge_ligne: number
  is_mini: boolean
}

export interface VariantTotals {
  lines: LineComputed[]
  sous_total_items_ht: number
  remise_globale_pct: number
  remise_globale_montant: number
  items_net_ht: number
  livraison_eff: number
  mise_en_place_eff: number
  frais_ht: number
  tva_items: number
  tva_frais: number
  tva: number
  total_ht: number
  total_ttc: number
  per_pers_ht: number
  per_pers_ttc: number
  fc_total: number
  marge_ht: number
  coeff: number
}

export interface Coverage {
  nb_minis: number
  nb_lunch: number
  nb_plateaux_parts: number
  // Métrique principale affichée dans la jauge (dépend du type d'événement)
  kind: string // 'minis' | 'lunch' | 'standard'
  current: number
  recommended: number
  ratio: number
  target: number
  covered: boolean
  manque: number
  label: string
}

// ---------- Helpers numériques / format ----------

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

// TVA : la base stocke un entier (10, 20). Si on reçoit déjà un ratio (<= 1), on le garde.
export function tvaToRatio(pct: number): number {
  var p = Number(pct)
  if (!p || p <= 0) return 0
  return p > 1 ? p / 100 : p
}

export function fmtEur(n: number): string {
  var v = Number(n) || 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

export function fmtEur0(n: number): string {
  var v = Number(n) || 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

// Code couleur du coefficient (cible 4,2+ vert / 3,5–4,2 ambre / <3,5 rose)
export function coeffClass(coeff: number): string {
  var c = Number(coeff) || 0
  if (c >= 4.2) return 'good'
  if (c >= 3.5) return 'mid'
  return 'low'
}

export function coeffColor(coeff: number): string {
  var cl = coeffClass(coeff)
  if (cl === 'good') return '#1D9E75'
  if (cl === 'mid') return '#BA7517'
  return '#993556'
}

// ---------- Statuts : vocabulaire UNIQUE ----------
// Cycle de vie : brouillon → envoye → accepte → acompte → facture → solde (+ perdu)

export var DEVIS_STATUS_ORDER = ['brouillon', 'envoye', 'accepte', 'acompte', 'facture', 'solde', 'perdu']

export var DEVIS_STATUS_LABELS: { [k: string]: string } = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  acompte: 'Acompte reçu',
  facture: 'Facturé',
  solde: 'Soldé',
  perdu: 'Perdu'
}

export var DEVIS_STATUS_COLORS: { [k: string]: { bg: string; fg: string } } = {
  brouillon: { bg: '#EBEBEB', fg: '#191923' },
  envoye: { bg: '#FFEB5A', fg: '#191923' },
  accepte: { bg: '#FF82D7', fg: '#FFFFFF' },
  acompte: { bg: '#005FFF', fg: '#FFFFFF' },
  facture: { bg: '#009D3A', fg: '#FFFFFF' },
  solde: { bg: '#191923', fg: '#FFEB5A' },
  perdu: { bg: '#CC0066', fg: '#FFFFFF' }
}

// Ramène n'importe quel devis (legacy FR, anglais, ou dérivé des timestamps) vers le canon.
export function normalizeStatus(d: any): string {
  if (!d) return 'brouillon'

  // 1) Valeurs explicites (legacy + variantes historiques)
  var raw = (d.statut || d.status || '') + ''
  var map: { [k: string]: string } = {
    brouillon: 'brouillon',
    envoye: 'envoye',
    a_modifier: 'envoye',
    accepte: 'accepte',
    signe: 'accepte',
    acompte: 'acompte',
    facture: 'facture',
    solde: 'solde',
    paye: 'solde',
    acquitte: 'solde',
    refuse: 'perdu',
    perdu: 'perdu'
  }
  if (raw && map[raw]) {
    // On laisse les timestamps "promouvoir" un statut trop bas (ex : statut=accepte mais facturé)
    var explicit = map[raw]
    var derived = deriveStatusFromTimestamps(d)
    return higherStatus(explicit, derived)
  }

  // 2) Sinon, dérivé des timestamps / drapeaux
  return deriveStatusFromTimestamps(d)
}

function deriveStatusFromTimestamps(d: any): string {
  if (d.solde_recu || d.solde_date) return 'solde'
  if (d.facture_numero || d.facture_url || d.facture_date) return 'facture'
  if (d.acompte_recu || d.acompte_date) return 'acompte'
  if (d.signed_at || d.variant_chosen || d.option_chosen) return 'accepte'
  if (d.sent_at) return 'envoye'
  return 'brouillon'
}

function higherStatus(a: string, b: string): string {
  var ia = DEVIS_STATUS_ORDER.indexOf(a)
  var ib = DEVIS_STATUS_ORDER.indexOf(b)
  // 'perdu' n'est jamais "promu" par les timestamps
  if (a === 'perdu') return 'perdu'
  if (b === 'perdu') return a
  return ib > ia ? b : a
}

export function statusLabel(s: string): string {
  return DEVIS_STATUS_LABELS[s] || s
}

export function statusColor(s: string): { bg: string; fg: string } {
  return DEVIS_STATUS_COLORS[s] || DEVIS_STATUS_COLORS.brouillon
}

// ---------- Catalogue ----------

export function buildOfferingMap(offerings: CateringOffering[]): OfferingMap {
  var map: OfferingMap = {}
  ;(offerings || []).forEach(function (o) {
    if (o && o.id) map[o.id] = o
  })
  return map
}

export function isMiniCategory(category: string): boolean {
  return category === CAT_BOX_MINI || category === CAT_LIVE_MINI
}

// Convertit une option générée par l'IA (champ `items`) en Variant éditable (champ `lines`).
export function aiOptionToVariant(opt: any): Variant {
  var items = (opt && opt.items) || []
  var lines: VariantLine[] = items.map(function (it: any) {
    return {
      offering_id: it.offering_id,
      qty: Number(it.qty) || 0,
      remise_pct: 0,
      name: it.name,
      unit_price_ht: Number(it.unit_price_ht) || 0,
      tva_pct: Number(it.tva_pct) || 10
    }
  })
  return {
    key: (opt && opt.key) || '',
    label: (opt && opt.label) || '',
    description: (opt && opt.description) || '',
    lines: lines
  }
}

// ---------- Calcul d'une ligne ----------

export function computeLine(line: VariantLine, map: OfferingMap): LineComputed {
  var o = map[line.offering_id]
  var qty = Number(line.qty) || 0
  var remisePct = Number(line.remise_pct) || 0

  // On privilégie les données du catalogue (à jour) ; fallback sur le cache de la ligne.
  var unitHT = o ? Number(o.pv_ht) || 0 : Number(line.unit_price_ht) || 0
  var tvaPct = o ? Number(o.tva_pct) || 10 : Number(line.tva_pct) || 10
  var name = o ? o.name : line.name || line.offering_id
  var category = o ? o.category : CAT_ADDON
  var fcUnit = o && o.fc_ht != null ? Number(o.fc_ht) || 0 : 0

  var brutHT = unitHT * qty
  var remiseMontant = (brutHT * remisePct) / 100
  var totalLigneHT = brutHT - remiseMontant
  var tvaLigne = totalLigneHT * tvaToRatio(tvaPct)
  var fcLigne = fcUnit * qty

  return {
    offering_id: line.offering_id,
    name: name,
    category: category,
    qty: qty,
    unit_price_ht: round2(unitHT),
    tva_pct: tvaPct,
    remise_pct: remisePct,
    brut_ht: round2(brutHT),
    remise_montant: round2(remiseMontant),
    total_ligne_ht: round2(totalLigneHT),
    tva_ligne: round2(tvaLigne),
    fc_unitaire: round2(fcUnit),
    fc_ligne: round2(fcLigne),
    marge_ligne: round2(totalLigneHT - fcLigne),
    is_mini: isMiniCategory(category)
  }
}

// ---------- Calcul d'une formule complète ----------

export function computeVariant(
  variant: Variant,
  map: OfferingMap,
  frais: Frais,
  nbPersonnes: number
): VariantTotals {
  var lines: LineComputed[] = (variant.lines || []).map(function (l) {
    return computeLine(l, map)
  })

  var sousTotalItemsHT = 0
  var tvaItemsBrut = 0
  var fcTotal = 0
  lines.forEach(function (l) {
    sousTotalItemsHT += l.total_ligne_ht
    tvaItemsBrut += l.tva_ligne
    fcTotal += l.fc_ligne
  })

  var remiseGlobalePct = Number(frais.remise_globale_pct) || 0
  var remiseGlobaleMontant = (sousTotalItemsHT * remiseGlobalePct) / 100
  var itemsNetHT = sousTotalItemsHT - remiseGlobaleMontant
  var scale = sousTotalItemsHT > 0 ? itemsNetHT / sousTotalItemsHT : 1
  var tvaItems = tvaItemsBrut * scale

  var livraisonEff = frais.livraison_offert ? 0 : Number(frais.livraison) || 0
  var miseEnPlaceEff = frais.mise_en_place_offert ? 0 : Number(frais.mise_en_place) || 0
  var fraisHT = livraisonEff + miseEnPlaceEff
  var tvaFrais = fraisHT * TVA_PRESTA_RATIO

  var totalHT = itemsNetHT + fraisHT
  var tva = tvaItems + tvaFrais
  var totalTTC = totalHT + tva

  var nb = Number(nbPersonnes) || 0
  var fcReel = fcTotal // le coût ne baisse pas avec la remise
  var margeHT = itemsNetHT - fcReel
  var coeff = fcReel > 0 ? itemsNetHT / fcReel : 0

  return {
    lines: lines,
    sous_total_items_ht: round2(sousTotalItemsHT),
    remise_globale_pct: remiseGlobalePct,
    remise_globale_montant: round2(remiseGlobaleMontant),
    items_net_ht: round2(itemsNetHT),
    livraison_eff: round2(livraisonEff),
    mise_en_place_eff: round2(miseEnPlaceEff),
    frais_ht: round2(fraisHT),
    tva_items: round2(tvaItems),
    tva_frais: round2(tvaFrais),
    tva: round2(tva),
    total_ht: round2(totalHT),
    total_ttc: round2(totalTTC),
    per_pers_ht: nb > 0 ? round2(totalHT / nb) : 0,
    per_pers_ttc: nb > 0 ? round2(totalTTC / nb) : 0,
    fc_total: round2(fcReel),
    marge_ht: round2(margeHT),
    coeff: Math.round(coeff * 100) / 100
  }
}

// ---------- Couverture (quantité recommandée vs panier) ----------

export function coverageTargetMinis(eventFormat: string): number {
  var t = COVERAGE_MINIS_TARGET[eventFormat]
  return t == null ? COVERAGE_MINIS_TARGET.autre : t
}

export function computeCoverage(
  lines: LineComputed[],
  nbPersonnes: number,
  eventFormat: string,
  itemFormat?: string
): Coverage {
  var nbMinis = 0
  var nbLunch = 0
  var nbPlateauxParts = 0
  ;(lines || []).forEach(function (l) {
    if (l.is_mini) nbMinis += l.qty
    else if (l.category === CAT_LUNCH_BOX) nbLunch += l.qty
    else if (l.category === CAT_PLATTER) nbPlateauxParts += l.qty // parts approximatives
  })

  var nb = Number(nbPersonnes) || 0

  // Choix de la métrique principale selon l'événement
  var kind = 'minis'
  var current = nbMinis
  var target = coverageTargetMinis(eventFormat)

  if (eventFormat === 'business_lunch' || (eventFormat === 'petit_dej' && itemFormat === 'standard')) {
    kind = eventFormat === 'business_lunch' ? 'lunch' : 'standard'
    current = eventFormat === 'business_lunch' ? nbLunch : nbLunch // standard suivi via lunch_box
    target = 1
  }

  var recommended = Math.round(nb * target)
  var ratio = nb > 0 ? current / nb : 0
  var covered = current >= recommended
  var manque = covered ? 0 : recommended - current

  var unitLabel = kind === 'minis' ? 'minis' : kind === 'lunch' ? 'lunch box' : 'pièces'
  var label = covered
    ? 'Couvert · ' + ratio.toFixed(1).replace('.', ',') + ' ' + unitLabel + '/pers'
    : 'Il manque ' + manque + ' ' + unitLabel + ' · ' + ratio.toFixed(1).replace('.', ',') + '/pers'

  return {
    nb_minis: nbMinis,
    nb_lunch: nbLunch,
    nb_plateaux_parts: nbPlateauxParts,
    kind: kind,
    current: current,
    recommended: recommended,
    ratio: Math.round(ratio * 10) / 10,
    target: target,
    covered: covered,
    manque: manque,
    label: label
  }
}
