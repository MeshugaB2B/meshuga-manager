'use client'

import { useState, useEffect, useMemo } from 'react'
import { LOGO_YELLOW } from '../logos'

// ============================================================
// QuoteEditor.tsx — Phase 3 du Dashboard B2B Catering Meshuga
// Éditeur de devis catering (single quote, pas multi-options).
// Architecture: src/app/dashboard/catering/QuoteEditor.tsx
// Lit catering_offerings depuis Supabase, sauvegarde dans devis.
// Marges/coeffs internes uniquement (Edward + Emy).
// Multi-options + PDF brandé = Phase 4.
// ============================================================

// ---------- LABELS / CONFIG (hors composant pour SWC) ----------

var STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  a_modifier: 'À modifier',
  facture: 'Facturé',
  paye: 'Soldé'
}

var CATEGORY_TABS = [
  { id: 'box_mini', label: 'Box minis', emoji: '📦' },
  { id: 'platter', label: 'Plateaux', emoji: '🍽️' },
  { id: 'lunch_box', label: 'Lunch box', emoji: '🍱' },
  { id: 'live_forfait', label: 'Live cooking', emoji: '🔥' },
  { id: 'live_mini', label: 'Live minis', emoji: '🥗' },
  { id: 'addon', label: 'Add-ons', emoji: '➕' }
]

var SUBCAT_LABELS = {
  // box_mini
  daily: 'Daily',
  classic: 'Classic',
  signature: 'Signature',
  premium_lobster: 'Premium Lobster',
  canapes_desserts: 'Canapés & desserts',
  // platter
  lobster: 'Lobster',
  // lunch_box
  standard: 'Standard',
  volume: 'Volume (30+)',
  // live_forfait
  animation: 'Forfaits animation',
  // live_mini
  premium: 'Premium',
  tarama: 'Tarama',
  verrine: 'Verrines',
  // addon
  beverage: 'Boissons',
  food: 'Food',
  live_extra: 'Heures sup live',
  lunch: 'Upgrades lunch'
}

var EVENT_FORMATS = [
  { id: 'cocktail', label: 'Cocktail dînatoire' },
  { id: 'lunch', label: 'Déjeuner / lunch' },
  { id: 'soiree', label: 'Soirée' },
  { id: 'autre', label: 'Autre' }
]

// ---------- HELPERS PURS ----------

var fmtEur = function(n) {
  var v = Number(n) || 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

var fmtEur0 = function(n) {
  var v = Number(n) || 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

var getLivePlancher = function(offering) {
  if (!offering) return 0
  var direct = Number(offering.cost_direct_ht)
  if (!direct || isNaN(direct)) return 0
  return direct * 1.2
}

var maxLiveRemise = function(offering) {
  if (!offering) return 0
  var pv = Number(offering.pv_ht) || 0
  var plancher = getLivePlancher(offering)
  if (pv <= 0 || plancher <= 0) return 0
  // remise max = (pv - plancher) / pv * 100, plafonnée à 100
  var max = ((pv - plancher) / pv) * 100
  if (max < 0) return 0
  if (max > 100) return 100
  return Math.floor(max)
}

// Parse une composition Meshuga style "10 Hot Dog · 10 THE MELT · 10 PBN"
// Retourne [{qty, name}] avec name normalisé (sans "mini", "canapés", "sandwich")
// Ignore les lignes sans quantité numérique au début (chips, coleslaw, etc.)
// Ignore aussi les compositions qui contiennent "au choix" (lunch box monoplat).
var parseComposition = function(comp, multiplier) {
  if (!comp) return []
  var lower = comp.toLowerCase()
  if (lower.indexOf('au choix') > -1) return []
  var mult = Number(multiplier) || 1
  // Séparateurs : middle dot · ou bullet •
  var parts = comp.split(/[·•]/)
  var out = []
  parts.forEach(function(rawPart) {
    var p = rawPart.trim()
    if (!p) return
    var m = p.match(/^(\d+)\s+(.+)$/)
    if (!m) return
    var n = parseInt(m[1], 10)
    var rawName = m[2].trim()
    // Filtre des "non-sandwichs" qu'on ignore dans le décompte
    var lowName = rawName.toLowerCase()
    if (
      lowName.indexOf('boisson') > -1 ||
      lowName.indexOf('chips') > -1 ||
      lowName.indexOf('coleslaw') > -1 ||
      lowName.indexOf('cookie') > -1 ||
      lowName.indexOf('frites') > -1
    ) return
    // Normalisation : supprime mini / canapé / canapés / sandwich + parenthèses
    var name = rawName
      .replace(/\(.*?\)/g, '')
      .replace(/\b(mini|minis|canap[ée]s?|sandwich|sandwiches)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!name) return
    // Homogénéisation finale : strip "THE " en début + uppercase
    // Ex: "THE LOBSTER" + "Lobster" => fusionnent en "LOBSTER"
    name = name.replace(/^the\s+/i, '').toUpperCase().trim()
    if (!name) return
    out.push({ qty: n * mult, name: name })
  })
  return out
}

// Echappement HTML pour insertion sûre dans le PDF
var escapeHtml = function(s) {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Format euros pour HTML (string)
var fmtEurStr = function(n) {
  var v = Number(n) || 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Génère le HTML complet du devis catering brandé Meshuga
// d = { numero, validite, clientNom, clientContact, clientEmail, clientPhone,
//       eventDate, eventLieu, nbPersonnes, eventFormat, lineDetails,
//       miseEnPlace, miseEnPlaceOffert, livraison, livraisonOffert,
//       remiseTotalPct, notes, totals, sandwichBreakdown, coverage }
var generateCateringPdfHtml = function(d, logoUrl) {
  var todayStr = new Date().toLocaleDateString('fr-FR')
  var validiteStr = ''
  if (d.validite) {
    var vd = new Date(d.validite + 'T12:00:00')
    if (!isNaN(vd.getTime())) validiteStr = vd.toLocaleDateString('fr-FR')
  }
  var eventDateStr = ''
  if (d.eventDate) {
    var ed = new Date(d.eventDate + 'T12:00:00')
    if (!isNaN(ed.getTime())) eventDateStr = ed.toLocaleDateString('fr-FR')
  }
  var formatLabels = {
    cocktail: 'Cocktail dînatoire',
    lunch: 'Déjeuner / Lunch',
    soiree: 'Soirée',
    autre: 'Événement'
  }
  var formatLbl = formatLabels[d.eventFormat] || 'Événement'

  // Items rows
  var itemRows = ''
  d.lineDetails.forEach(function(l) {
    var compDiv = l.offering.composition
      ? '<div class="comp">' + escapeHtml(l.offering.composition) + '</div>'
      : (l.offering.tagline ? '<div class="tag">' + escapeHtml(l.offering.tagline) + '</div>' : '')
    var sizeBadge = l.offering.size_pers
      ? '<span class="size-badge">' + l.offering.size_pers + ' pcs</span>'
      : ''
    var remiseBadge = l.remisePct > 0
      ? '<div class="rem-badge">Remise -' + l.remisePct + '%</div>'
      : ''
    itemRows +=
      '<tr>' +
        '<td><div class="item-name">' + escapeHtml(l.offering.name) + ' ' + sizeBadge + '</div>' +
          compDiv + remiseBadge +
        '</td>' +
        '<td class="c">' + l.qty + '</td>' +
        '<td class="r">' + fmtEurStr(l.pvHt) + '</td>' +
        '<td class="r b">' + fmtEurStr(l.totalLigneHT) + '</td>' +
      '</tr>'
  })

  // MEP row
  var mepRow = ''
  if (Number(d.miseEnPlace) > 0 || d.miseEnPlaceOffert) {
    var mepLbl = d.miseEnPlaceOffert
      ? '<span class="strike">Mise en place / installation</span> <span class="offert">OFFERTE</span>'
      : 'Mise en place / installation'
    var mepPu = d.miseEnPlaceOffert
      ? '<span class="strike">' + fmtEurStr(d.miseEnPlace) + '</span>'
      : fmtEurStr(d.miseEnPlace)
    var mepTot = d.miseEnPlaceOffert
      ? '<span class="offert b">0,00 €</span>'
      : '<strong>' + fmtEurStr(d.miseEnPlace) + '</strong>'
    mepRow = '<tr><td>' + mepLbl + '</td><td class="c">1</td><td class="r">' + mepPu + '</td><td class="r">' + mepTot + '</td></tr>'
  }

  // Livraison row
  var livRow = ''
  if (Number(d.livraison) > 0 || d.livraisonOffert) {
    var livLbl = d.livraisonOffert
      ? '<span class="strike">Frais de livraison</span> <span class="offert">OFFERTS</span>'
      : 'Frais de livraison'
    var livPu = d.livraisonOffert
      ? '<span class="strike">' + fmtEurStr(d.livraison) + '</span>'
      : fmtEurStr(d.livraison)
    var livTot = d.livraisonOffert
      ? '<span class="offert b">0,00 €</span>'
      : '<strong>' + fmtEurStr(d.livraison) + '</strong>'
    livRow = '<tr><td>' + livLbl + '</td><td class="c">1</td><td class="r">' + livPu + '</td><td class="r">' + livTot + '</td></tr>'
  }

  // Remise row
  var remRow = ''
  if (d.totals.remiseGlobale > 0) {
    remRow =
      '<tr class="remise-row"><td>Remise commerciale (' + d.remiseTotalPct + '%)</td>' +
      '<td class="c">—</td><td class="r">—</td>' +
      '<td class="r b">−' + fmtEurStr(d.totals.remiseGlobale) + '</td></tr>'
  }

  // Breakdown HTML
  var breakdownHtml = ''
  if (d.sandwichBreakdown && d.sandwichBreakdown.length > 0) {
    var pills = ''
    d.sandwichBreakdown.forEach(function(s) {
      pills += '<span class="bd-pill"><strong>' + s.qty + '</strong> ' + escapeHtml(s.name) + '</span>'
    })
    breakdownHtml =
      '<div class="breakdown">' +
        '<div class="breakdown-title">Récapitulatif par recette</div>' +
        '<div class="breakdown-list">' + pills + '</div>' +
      '</div>'
  }

  // Coverage strip
  var coverageHtml = ''
  if (d.coverage) {
    var covParts = []
    if (d.coverage.nbMinis > 0) covParts.push('<strong>' + d.coverage.nbMinis + '</strong> minis')
    if (d.coverage.nbLunch > 0) covParts.push('<strong>' + d.coverage.nbLunch + '</strong> lunch box')
    if (d.coverage.nbPlateauxParts > 0) covParts.push('<strong>' + d.coverage.nbPlateauxParts + '</strong> parts plateaux')
    if (d.coverage.nbLiveForfait > 0 && d.coverage.liveForfaitNames && d.coverage.liveForfaitNames.length > 0) {
      covParts.push(escapeHtml(d.coverage.liveForfaitNames.join(' + ')))
    }
    if (covParts.length > 0) {
      coverageHtml =
        '<div class="cov">' + covParts.join(' &middot; ') +
        ' <span class="cov-pers">pour ' + d.nbPersonnes + ' personnes</span></div>'
    }
  }

  // Notes
  var notesHtml = ''
  if (d.notes && d.notes.trim()) {
    notesHtml =
      '<div class="notes-block">' +
        '<div class="notes-title">Notes</div>' +
        '<div class="notes-content">' + escapeHtml(d.notes).replace(/\n/g, '<br>') + '</div>' +
      '</div>'
  }

  // Per-person price
  var perPersonHtml = ''
  if (d.nbPersonnes > 0 && d.totals.totalTTC > 0) {
    perPersonHtml = '<div class="per-person">soit ' + fmtEurStr(d.totals.totalTTC / d.nbPersonnes) + ' TTC / personne</div>'
  }

  // Logo HTML
  var logoHtml = logoUrl
    ? '<img src="' + logoUrl + '" alt="meshuga"/>'
    : '<div class="logo-text-fb">meshuga</div>'

  // CSS du PDF (une seule string concaténée)
  var css =
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;font-size:11px;background:#FFFFFF}' +
    '@page{size:A4;margin:0mm}' +
    '@media print{html{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}.no-print{display:none !important}.page{page-break-inside:avoid}}' +
    '.page{width:210mm;min-height:297mm;padding:14mm 16mm 0;display:flex;flex-direction:column;background:#FFFFFF}' +
    '.content{flex:1}' +
    '.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:4px solid #FF82D7;margin-bottom:18px}' +
    '.logo img{height:60px;width:auto;display:block}' +
    '.logo-text-fb{font-family:Yellowtail,cursive;font-size:36px;color:#191923;line-height:1}' +
    '.logo-sub{font-size:8.5px;color:#999;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}' +
    '.doc-info{text-align:right}' +
    '.doc-type{font-family:Yellowtail,cursive;font-size:42px;color:#191923;line-height:.95}' +
    '.doc-num{font-size:10px;color:#666;margin-top:3px;font-weight:700}' +
    '.parties{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}' +
    '.party{background:#FAFAFA;border-radius:5px;padding:10px 13px;border-left:4px solid #FFEB5A}' +
    '.party.client{border-left-color:#FF82D7}' +
    '.party-label{font-family:Yellowtail,cursive;font-size:14px;color:#888;margin-bottom:4px;line-height:1}' +
    '.party-name{font-size:13px;font-weight:900;margin-bottom:3px}' +
    '.party-detail{font-size:9.5px;color:#555;margin-top:1px;line-height:1.5}' +
    '.event-detail{margin-top:6px;font-size:10px;color:#191923;line-height:1.5}' +
    '.cov{background:#FFEB5A;border:2px solid #191923;border-radius:5px;padding:8px 14px;margin-bottom:14px;font-size:11px;text-align:center;letter-spacing:.3px;box-shadow:2px 2px 0 #191923}' +
    '.cov strong{font-weight:900;font-size:12px}' +
    '.cov-pers{font-style:italic;color:#191923;opacity:.7;margin-left:4px}' +
    'table.items{width:100%;border-collapse:collapse;margin-bottom:8px}' +
    'table.items thead th{padding:8px 10px;font-size:8.5px;text-transform:uppercase;letter-spacing:1.2px;font-weight:900;color:#191923;border-top:2px solid #191923;border-bottom:2px solid #191923;text-align:left;background:#FFFFFF}' +
    'table.items thead th.w-qty{text-align:center;width:9%}' +
    'table.items thead th.w-pu{text-align:right;width:18%}' +
    'table.items thead th.w-tot{text-align:right;width:20%}' +
    'table.items tbody td{padding:8px 10px;border-bottom:1px solid #EBEBEB;font-size:10.5px;vertical-align:top}' +
    'table.items tbody tr:nth-child(even) td{background:#FAFAFA}' +
    '.item-name{font-weight:900;font-size:11px;margin-bottom:3px;color:#191923}' +
    '.size-badge{display:inline-block;background:#FFEB5A;border:1px solid #191923;border-radius:9px;padding:0 6px;font-size:8px;font-weight:900;margin-left:4px;letter-spacing:.5px;vertical-align:middle}' +
    '.comp{font-size:9px;color:#555;line-height:1.4;margin-top:2px}' +
    '.tag{font-size:9px;color:#888;line-height:1.4;font-style:italic;margin-top:2px}' +
    '.rem-badge{display:inline-block;font-size:8.5px;color:#FF82D7;font-weight:900;margin-top:3px;background:#FFF1FA;border:1px solid #FF82D7;border-radius:3px;padding:1px 5px;letter-spacing:.3px}' +
    '.c{text-align:center}' +
    '.r{text-align:right}' +
    '.b{font-weight:900}' +
    '.strike{text-decoration:line-through;opacity:.5}' +
    '.offert{color:#009D3A;font-weight:900}' +
    '.remise-row td{color:#FF82D7}' +
    '.breakdown{margin:10px 0 14px;padding:10px 13px;background:#FFFAEC;border-radius:5px;border-left:4px solid #FFEB5A}' +
    '.breakdown-title{font-family:Yellowtail,cursive;font-size:15px;color:#191923;margin-bottom:7px;line-height:1}' +
    '.breakdown-list{display:flex;flex-wrap:wrap;gap:5px}' +
    '.bd-pill{display:inline-flex;align-items:center;background:#FFFFFF;border:1.5px solid #191923;border-radius:11px;padding:2px 9px;font-size:10px;font-weight:900;color:#191923;line-height:1.5}' +
    '.bd-pill strong{margin-right:5px;color:#FF82D7;font-size:11px}' +
    '.totals-wrap{display:flex;justify-content:flex-end;margin-bottom:14px}' +
    '.totals{width:300px}' +
    '.t-row{display:flex;justify-content:space-between;padding:6px 4px;border-bottom:1px solid #EBEBEB;font-size:11.5px}' +
    '.t-row.gray{color:#888;font-size:10px}' +
    '.t-row strong{font-weight:900;font-size:12px}' +
    '.t-final{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;background:#FFEB5A;border:2px solid #191923;border-radius:5px;margin-top:8px;box-shadow:3px 3px 0 #191923}' +
    '.t-final .lbl{font-family:Yellowtail,cursive;font-size:24px;color:#191923;line-height:1}' +
    '.t-final .amt{font-weight:900;font-size:17px;color:#191923}' +
    '.per-person{text-align:right;font-size:9.5px;color:#888;margin-top:5px;font-style:italic}' +
    '.notes-block{background:#FFF9E5;border-left:4px solid #FFEB5A;padding:10px 13px;margin-bottom:12px;border-radius:0 4px 4px 0}' +
    '.notes-title{font-family:Yellowtail,cursive;font-size:14px;color:#191923;margin-bottom:4px;line-height:1}' +
    '.notes-content{font-size:10px;line-height:1.6;color:#333}' +
    '.rib{border:1.5px solid #191923;border-radius:5px;padding:11px 14px;margin-bottom:12px;background:#FFFFFF}' +
    '.rib-title{font-family:Yellowtail,cursive;font-size:17px;color:#FF82D7;margin-bottom:8px;line-height:1}' +
    '.rib-grid{display:grid;grid-template-columns:1fr 1fr 2fr 1fr;gap:12px}' +
    '.rib-item label{display:block;font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:3px;font-weight:900}' +
    '.rib-item span{font-size:9.5px;font-weight:900;font-family:"Courier New",monospace;color:#191923;letter-spacing:.5px}' +
    '.cond-block{margin-bottom:14px}' +
    '.cond-title{font-family:Yellowtail,cursive;font-size:15px;color:#191923;margin-bottom:4px;line-height:1}' +
    '.cond{font-size:9.5px;color:#555;line-height:1.6}' +
    '.footer{padding:10px 0 8px;border-top:1px solid #EBEBEB;margin-top:auto}' +
    '.legal{font-size:7px;color:#aaa;line-height:1.7;margin-bottom:8px;text-align:justify}' +
    '.pink-bar{background:#FF82D7;padding:9px 14px;border-radius:4px;text-align:center;font-family:Yellowtail,cursive;font-size:18px;color:#191923;letter-spacing:.5px;border:1.5px solid #191923;line-height:1}' +
    '.no-print{text-align:center;padding:24px 16px;background:#FFFFFF;border-top:2px dashed #FF82D7;margin-top:16px}' +
    '.no-print p{margin-bottom:14px;font-size:11px;color:#666;line-height:1.6}' +
    '.no-print button{padding:11px 28px;background:#FFEB5A;color:#191923;border:2px solid #191923;border-radius:5px;font-size:13px;font-weight:900;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;box-shadow:3px 3px 0 #191923;font-family:Arial,sans-serif;margin:0 4px}' +
    '.no-print button.close-btn{background:#FFFFFF}' +
    '.no-print button:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #191923}'

  // FULL HTML
  return '<!DOCTYPE html><html lang="fr"><head>' +
    '<meta charset="UTF-8">' +
    '<title>Devis ' + escapeHtml(d.numero) + ' &mdash; Meshuga Catering</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">' +
    '<style>' + css + '</style>' +
    '</head><body>' +
    '<div class="page">' +
      '<div class="content">' +
        // HEADER
        '<div class="header">' +
          '<div class="logo">' + logoHtml +
            '<div class="logo-sub">Catering &middot; 3 rue Vavin 75006 Paris</div>' +
          '</div>' +
          '<div class="doc-info">' +
            '<div class="doc-type">Devis</div>' +
            '<div class="doc-num">N&deg; ' + escapeHtml(d.numero) + '</div>' +
            '<div class="doc-num">&Eacute;mis le ' + todayStr + '</div>' +
            (validiteStr ? '<div class="doc-num">Valable jusqu&#39;au ' + validiteStr + '</div>' : '') +
          '</div>' +
        '</div>' +
        // PARTIES
        '<div class="parties">' +
          '<div class="party">' +
            '<div class="party-label">&Eacute;metteur</div>' +
            '<div class="party-name">SAS AEGIA FOOD</div>' +
            '<div class="party-detail">Enseigne : Meshuga Crazy Deli</div>' +
            '<div class="party-detail">3 rue Vavin, 75006 Paris</div>' +
            '<div class="party-detail">SIRET 904 639 531 00014</div>' +
            '<div class="party-detail">TVA FR31904639531</div>' +
            '<div class="party-detail">hello@meshuga.fr</div>' +
          '</div>' +
          '<div class="party client">' +
            '<div class="party-label">Client</div>' +
            '<div class="party-name">' + escapeHtml(d.clientNom) + '</div>' +
            (d.clientContact ? '<div class="party-detail">' + escapeHtml(d.clientContact) + '</div>' : '') +
            (d.clientEmail ? '<div class="party-detail">' + escapeHtml(d.clientEmail) + '</div>' : '') +
            (d.clientPhone ? '<div class="party-detail">' + escapeHtml(d.clientPhone) + '</div>' : '') +
            '<div class="event-detail">' +
              '<strong>' + formatLbl + '</strong> &middot; ' + d.nbPersonnes + ' pers.' +
              (eventDateStr ? ' &middot; ' + eventDateStr : '') +
              (d.eventLieu ? '<br>Lieu : ' + escapeHtml(d.eventLieu) : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        // COVERAGE
        coverageHtml +
        // TABLE
        '<table class="items">' +
          '<thead><tr>' +
            '<th class="w-name">D&eacute;signation</th>' +
            '<th class="w-qty">Qt&eacute;</th>' +
            '<th class="w-pu">PU HT</th>' +
            '<th class="w-tot">Total HT</th>' +
          '</tr></thead>' +
          '<tbody>' + itemRows + mepRow + livRow + remRow + '</tbody>' +
        '</table>' +
        // BREAKDOWN
        breakdownHtml +
        // TOTALS
        '<div class="totals-wrap"><div class="totals">' +
          '<div class="t-row"><span>Total HT</span><strong>' + fmtEurStr(d.totals.totalHT) + '</strong></div>' +
          '<div class="t-row gray"><span>TVA (10 % food / 20 % prestations)</span><span>' + fmtEurStr(d.totals.tva) + '</span></div>' +
          '<div class="t-final"><span class="lbl">Total TTC</span><span class="amt">' + fmtEurStr(d.totals.totalTTC) + '</span></div>' +
          perPersonHtml +
        '</div></div>' +
        // NOTES
        notesHtml +
        // RIB
        '<div class="rib">' +
          '<div class="rib-title">Coordonn&eacute;es bancaires pour l&#39;acompte</div>' +
          '<div class="rib-grid">' +
            '<div class="rib-item"><label>Titulaire</label><span>SAS AEGIA FOOD</span></div>' +
            '<div class="rib-item"><label>Banque</label><span>Banque Populaire</span></div>' +
            '<div class="rib-item"><label>IBAN</label><span>FR76 1020 7000 8723 2175 3218 077</span></div>' +
            '<div class="rib-item"><label>BIC</label><span>CCBPFRPPMTG</span></div>' +
          '</div>' +
        '</div>' +
        // CONDITIONS
        '<div class="cond-block">' +
          '<div class="cond-title">Conditions de r&egrave;glement</div>' +
          '<div class="cond">Acompte de 30 % &agrave; la commande, solde 72 h avant l&#39;&eacute;v&eacute;nement. Devis valable 30 jours &agrave; compter de la date d&#39;&eacute;mission. Pour valider la commande, retournez ce devis sign&eacute; avec la mention "Bon pour accord" + virement de l&#39;acompte.</div>' +
        '</div>' +
      '</div>' +
      // FOOTER
      '<div class="footer">' +
        '<div class="legal">SAS AEGIA FOOD (enseigne Meshuga Crazy Deli) &middot; SAS au capital de 1 000 &euro; &middot; RCS Paris 904 639 531 &middot; SIRET 904 639 531 00014 &middot; APE 56.10C &middot; TVA intracommunautaire FR31904639531 &middot; 3 rue Vavin 75006 Paris &middot; TVA &agrave; taux r&eacute;duit (10 %) sur les produits alimentaires et taux normal (20 %) sur les prestations de service. Tout commencement d&#39;ex&eacute;cution vaut acceptation du pr&eacute;sent devis.</div>' +
        '<div class="pink-bar">meshuga &middot; catering &middot; 3 rue vavin, paris 6e &middot; hello@meshuga.fr</div>' +
      '</div>' +
    '</div>' +
    // PRINT BAR (n'apparaît pas à l'impression)
    '<div class="no-print">' +
      '<p>Pour enregistrer en PDF : cliquez sur <strong>Imprimer</strong> puis choisissez <strong>Enregistrer au format PDF</strong> comme imprimante.<br>Pensez &agrave; d&eacute;cocher <em>En-t&ecirc;tes et pieds de page</em> dans les options.</p>' +
      '<button onclick="window.print()">📄 Imprimer / Enregistrer PDF</button>' +
      '<button class="close-btn" onclick="window.close()">Fermer</button>' +
    '</div>' +
    '</body></html>'
}

// ---------- CSS (scope qe-) ----------

var QE_CSS =
  '.qe-root{display:flex;flex-direction:column;gap:12px}' +
  '.qe-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:12px 14px;box-shadow:3px 3px 0 #191923}' +
  '.qe-num{font-family:Yellowtail,cursive;font-size:22px;line-height:1;margin-bottom:2px}' +
  '.qe-num-sub{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;opacity:.5}' +
  '.qe-status-pill{display:inline-flex;align-items:center;padding:3px 9px;border-radius:11px;border:2px solid #191923;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;background:#FFEB5A;margin-top:4px}' +
  '.qe-actions{display:flex;gap:6px;flex-wrap:wrap}' +
  '.qe-error{background:#FF82D7;border:2px solid #191923;border-radius:7px;padding:10px 14px;font-size:12px;font-weight:900;box-shadow:3px 3px 0 #191923}' +
  '.qe-loading{padding:50px;text-align:center;font-family:Yellowtail,cursive;font-size:22px;opacity:.6}' +
  '.qe-grid{display:grid;grid-template-columns:1fr;gap:12px}' +
  '@media(min-width:1100px){.qe-grid{grid-template-columns:1fr 380px}}' +
  '.qe-col-left{display:flex;flex-direction:column;gap:12px;min-width:0}' +
  '.qe-col-right{display:flex;flex-direction:column;gap:12px;min-width:0}' +
  '@media(min-width:1100px){.qe-col-right{position:sticky;top:14px;align-self:start;max-height:calc(100vh - 30px);overflow-y:auto}}' +
  '.qe-card{background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:14px;box-shadow:3px 3px 0 #191923}' +
  '.qe-card-title{font-family:Yellowtail,cursive;font-size:18px;line-height:1;margin-bottom:10px}' +
  '.qe-fg{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}' +
  '.qe-fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
  '.qe-fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}' +
  '.qe-lbl{font-family:Yellowtail,cursive;font-size:13px;display:block;margin-bottom:3px;line-height:1}' +
  '.qe-inp{width:100%;padding:7px 10px;border-radius:4px;border:2px solid #191923;font-family:Arial Narrow,Arial,sans-serif;font-size:12px;background:#FFFFFF;color:#191923;outline:none;box-shadow:2px 2px 0 #191923}' +
  '.qe-inp:focus{box-shadow:2px 2px 0 #FF82D7}' +
  '.qe-textarea{min-height:60px;resize:vertical}' +
  '.qe-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}' +
  '.qe-tab{padding:7px 11px;border-radius:14px;border:2px solid #191923;background:#FFFFFF;font-family:Arial Narrow,Arial,sans-serif;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;color:#191923;white-space:nowrap;transition:transform .1s}' +
  '.qe-tab:active{transform:translate(1px,1px)}' +
  '.qe-tab.on{background:#FF82D7}' +
  '.qe-subgroup{margin-bottom:14px}' +
  '.qe-subgroup-title{font-family:Yellowtail,cursive;font-size:15px;margin-bottom:6px;opacity:.7}' +
  '.qe-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}' +
  '.qe-pick{background:#FFFFFF;border:2px solid #191923;border-radius:5px;padding:9px 10px;cursor:pointer;display:flex;flex-direction:column;gap:3px;transition:transform .1s}' +
  '.qe-pick:hover{background:#FFEB5A}' +
  '.qe-pick:active{transform:translate(1px,1px)}' +
  '.qe-pick-name{font-weight:900;font-size:12px;line-height:1.2;text-transform:uppercase;letter-spacing:-.2px}' +
  '.qe-pick-tag{font-size:10px;line-height:1.3;color:#191923;opacity:.6}' +
  '.qe-pick-comp{font-size:10px;line-height:1.4;color:#191923;background:#FFEB5A;border-radius:3px;padding:4px 6px;margin-top:4px;border:1.5px solid #191923;font-weight:700}' +
  '.qe-line-comp{font-size:10px;line-height:1.4;color:#191923;opacity:.65;margin-top:2px;font-style:italic}' +
  '.qe-pick-row{display:flex;justify-content:space-between;align-items:center;margin-top:3px;gap:6px}' +
  '.qe-pick-price{font-weight:900;font-size:13px}' +
  '.qe-pick-size{font-family:Yellowtail,cursive;font-size:12px;opacity:.6}' +
  '.qe-pick-flags{display:flex;gap:3px;flex-wrap:wrap;margin-top:3px}' +
  '.qe-flag{display:inline-block;padding:1px 5px;border-radius:3px;border:1.5px solid #191923;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;line-height:1.4}' +
  '.qe-flag-volume{background:#005FFF;color:#fff;border-color:#005FFF}' +
  '.qe-flag-exclu{background:#FF82D7}' +
  '.qe-flag-hot{background:#CC0066;color:#fff;border-color:#CC0066}' +
  '.qe-line{display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid #EBEBEB}' +
  '.qe-line:last-child{border-bottom:none}' +
  '@media(max-width:680px){.qe-line{grid-template-columns:1fr auto;row-gap:6px}}' +
  '.qe-line-name{font-weight:900;font-size:13px;line-height:1.2}' +
  '.qe-line-meta{font-size:11px;opacity:.6;margin-top:1px}' +
  '.qe-line-internes{font-size:10px;color:#005FFF;font-weight:700;margin-top:2px;font-family:Arial Narrow,Arial,sans-serif}' +
  '.qe-qty{display:flex;align-items:center;gap:4px}' +
  '.qe-qty-btn{width:26px;height:26px;border-radius:4px;border:2px solid #191923;background:#FFFFFF;font-weight:900;font-size:14px;cursor:pointer;box-shadow:1px 1px 0 #191923;display:flex;align-items:center;justify-content:center;line-height:1}' +
  '.qe-qty-btn:active{transform:translate(1px,1px);box-shadow:0 0 0 #191923}' +
  '.qe-qty-input{width:48px;text-align:center;border:2px solid #191923;border-radius:4px;padding:4px;font-weight:900;font-size:12px;font-family:Arial Narrow,Arial,sans-serif}' +
  '.qe-line-total{font-weight:900;font-size:14px;text-align:right;min-width:80px}' +
  '.qe-rm{background:transparent;border:1.5px solid #CC0066;color:#CC0066;border-radius:4px;width:24px;height:24px;cursor:pointer;font-weight:900;font-size:12px;line-height:1}' +
  '.qe-rm:hover{background:#CC0066;color:#fff}' +
  '.qe-live-row{margin-top:8px;padding:10px;background:#FFF8E7;border:1.5px dashed #FFEB5A;border-radius:5px}' +
  '.qe-live-row-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;color:#191923}' +
  '.qe-slider{width:100%;accent-color:#FF82D7}' +
  '.qe-slider-meta{display:flex;justify-content:space-between;font-size:10px;font-family:Arial Narrow,Arial,sans-serif;margin-top:2px;opacity:.6}' +
  '.qe-empty-lines{padding:24px 12px;text-align:center;font-family:Yellowtail,cursive;font-size:18px;opacity:.4}' +
  '.qe-recap-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #EBEBEB;font-size:12px}' +
  '.qe-recap-row.gray{color:#888;font-size:11px}' +
  '.qe-recap-row strong{font-weight:900}' +
  '.qe-recap-final{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;background:#FFEB5A;border:2px solid #191923;border-radius:5px;margin-top:8px;box-shadow:2px 2px 0 #191923}' +
  '.qe-recap-final-lbl{font-family:Yellowtail,cursive;font-size:20px;line-height:1}' +
  '.qe-recap-final-amt{font-weight:900;font-size:17px}' +
  '.qe-recap-internes{margin-top:10px;padding:10px 12px;background:#FFFFFF;color:#191923;border-radius:5px;border:2px solid #191923;border-left:6px solid #FF82D7;box-shadow:2px 2px 0 #191923}' +
  '.qe-recap-internes-title{font-family:Yellowtail,cursive;font-size:15px;color:#191923;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}' +
  '.qe-recap-internes-toggle{background:#FFFFFF;border:1.5px solid #191923;color:#191923;border-radius:3px;padding:1px 6px;font-size:9px;font-weight:900;cursor:pointer;text-transform:uppercase;letter-spacing:.3px}' +
  '.qe-recap-internes-row{display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#191923}' +
  '.qe-recap-internes-row strong{font-weight:900}' +
  '.qe-coeff-good{color:#009D3A}' +
  '.qe-coeff-warn{color:#CC6600}' +
  '.qe-coeff-bad{color:#CC0066}' +
  '.qe-checkbox-row{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900}' +
  '.qe-checkbox-row input{width:14px;height:14px;accent-color:#009D3A}' +
  '.qe-toggle-internes{position:absolute;top:14px;right:14px}' +
  '.qe-densite-suggest{font-size:10px;background:#005FFF;color:#fff;padding:3px 8px;border-radius:3px;font-weight:900;display:inline-block;margin-top:2px}' +
  '.qe-livraison-auto{font-size:10px;color:#009D3A;font-weight:900;margin-top:3px;font-style:italic}' +
  '.qe-cov{position:sticky;top:8px;z-index:10;background:#FFEB5A;color:#191923;border:2px solid #191923;border-radius:7px;padding:10px 14px;box-shadow:3px 3px 0 #FF82D7;margin-bottom:0}' +
  '.qe-cov-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;flex-wrap:wrap}' +
  '.qe-cov-title{font-family:Yellowtail,cursive;font-size:15px;color:#191923;line-height:1}' +
  '.qe-cov-status{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.4px;padding:3px 8px;border-radius:3px;display:inline-block;border:1.5px solid #191923;line-height:1.4;white-space:nowrap}' +
  '.qe-cov-status.ok{background:#7AFF82;color:#191923}' +
  '.qe-cov-status.warn{background:#FFFFFF;color:#191923}' +
  '.qe-cov-status.under{background:#FF82D7;color:#191923}' +
  '.qe-cov-status.over{background:#005FFF;color:#FFFFFF;border-color:#005FFF}' +
  '.qe-cov-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(95px,1fr));gap:6px}' +
  '.qe-cov-cell{background:#FFFFFF;border:1.5px solid #191923;border-radius:4px;padding:6px 8px;line-height:1}' +
  '.qe-cov-num{font-weight:900;font-size:18px;color:#191923;line-height:1}' +
  '.qe-cov-lbl{font-family:Yellowtail,cursive;font-size:12px;color:#191923;opacity:.7;margin-top:3px;line-height:1}' +
  '.qe-cov-sub{font-size:9px;color:#191923;opacity:.55;margin-top:2px;line-height:1.2;font-family:Arial Narrow,Arial,sans-serif}' +
  '.qe-cov-empty{font-size:11px;color:#191923;opacity:.6;font-style:italic;padding:4px 0}' +
  '.qe-cov-bd{margin-top:8px;padding-top:8px;border-top:1.5px dashed #191923}' +
  '.qe-cov-bd-title{font-family:Yellowtail,cursive;font-size:13px;color:#191923;margin-bottom:4px;line-height:1}' +
  '.qe-cov-bd-list{display:flex;flex-wrap:wrap;gap:5px}' +
  '.qe-cov-bd-pill{display:inline-flex;align-items:center;background:#FFFFFF;border:1.5px solid #191923;border-radius:11px;padding:2px 9px;font-size:11px;font-weight:900;color:#191923;line-height:1.5;letter-spacing:-.1px}' +
  '.qe-cov-bd-pill strong{margin-right:4px;color:#FF82D7;font-size:12px}'

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function QuoteEditor(props) {
  var supabase = props && props.supabase ? props.supabase : null
  var profile = props && props.profile ? props.profile : null
  var devisId = props && props.devisId ? props.devisId : null
  var prospects = props && props.prospects ? props.prospects : []
  var onClose = props && props.onClose ? props.onClose : function() {}
  var onSaved = props && props.onSaved ? props.onSaved : function() {}
  var toastFn = props && props.toast ? props.toast : function() {}

  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [error, setError] = useState('')
  var [offerings, setOfferings] = useState([])
  var [activeCategory, setActiveCategory] = useState('box_mini')
  var [showInternes, setShowInternes] = useState(true)

  var [numero, setNumero] = useState('')
  var [statut, setStatut] = useState('brouillon')
  var [validite, setValidite] = useState('')

  var [clientSelector, setClientSelector] = useState('')
  var [clientNom, setClientNom] = useState('')
  var [clientContact, setClientContact] = useState('')
  var [clientEmail, setClientEmail] = useState('')
  var [clientPhone, setClientPhone] = useState('')

  var [eventDate, setEventDate] = useState('')
  var [eventLieu, setEventLieu] = useState('')
  var [nbPersonnes, setNbPersonnes] = useState(50)
  var [eventFormat, setEventFormat] = useState('cocktail')

  var [lines, setLines] = useState([])

  var [livraison, setLivraison] = useState(30)
  var [livraisonOffert, setLivraisonOffert] = useState(false)
  var [miseEnPlace, setMiseEnPlace] = useState(0)
  var [miseEnPlaceOffert, setMiseEnPlaceOffert] = useState(false)
  var [remiseTotalPct, setRemiseTotalPct] = useState(0)

  var [notes, setNotes] = useState('')
  var [notesInternes, setNotesInternes] = useState('')

  // Charge offerings
  useEffect(function() {
    var run = async function() {
      if (!supabase) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        var res = await supabase
          .from('catering_offerings')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        if (res.error) {
          setError(res.error.message || 'Erreur de chargement des offres')
          setOfferings([])
        } else {
          setOfferings(res.data || [])
        }
      } catch (e) {
        setError(e && e.message ? e.message : 'Erreur de chargement')
      }
      setLoading(false)
    }
    run()
  }, [supabase])

  // Charge devis si édition, sinon initialise un nouveau
  useEffect(function() {
    if (!devisId) {
      var year = new Date().getFullYear()
      var stamp = String(Date.now()).slice(-4)
      setNumero('DEV-' + year + '-' + stamp)
      var v = new Date()
      v.setDate(v.getDate() + 30)
      setValidite(v.toISOString().split('T')[0])
      return
    }
    if (!supabase) return
    var run = async function() {
      try {
        var res = await supabase.from('devis').select('*').eq('id', devisId).single()
        if (res.data) {
          var d = res.data
          setNumero(d.numero || '')
          setStatut(d.statut || 'brouillon')
          setValidite(d.date_validite || '')
          setClientSelector(d.prospect_id ? String(d.prospect_id) : '')
          setClientNom(d.client_nom || '')
          setClientContact(d.client_contact || '')
          setClientEmail(d.client_email || '')
          setClientPhone(d.client_phone || '')
          setEventDate(d.event_date || '')
          setEventLieu(d.event_lieu || '')
          setNbPersonnes(d.nb_personnes || 50)
          setEventFormat(d.format || 'cocktail')
          setLines(Array.isArray(d.items) ? d.items : [])
          setLivraison(Number(d.livraison) || 30)
          setLivraisonOffert(!!d.livraison_offert)
          setMiseEnPlace(Number(d.mise_en_place) || 0)
          setMiseEnPlaceOffert(!!d.mise_en_place_offert)
          setRemiseTotalPct(Number(d.remise_total_pct) || 0)
          setNotes(d.notes || '')
          setNotesInternes(d.notes_internes || '')
        }
      } catch (e) {
        setError('Erreur de chargement du devis')
      }
    }
    run()
  }, [supabase, devisId])

  // Index offerings par id pour lookup rapide
  var offeringsById = useMemo(
    function() {
      var map = {}
      offerings.forEach(function(o) {
        map[o.id] = o
      })
      return map
    },
    [offerings]
  )

  // Lignes enrichies avec détails
  var lineDetails = useMemo(
    function() {
      var out = []
      lines.forEach(function(line) {
        var o = offeringsById[line.offering_id]
        if (!o) return
        var qty = Number(line.qty) || 0
        var remisePct = Number(line.remisePct) || 0
        var pvHt = Number(o.pv_ht) || 0
        var fcHt = Number(o.fc_ht) || 0
        var tvaPct = Number(o.tva_pct) || 10
        var brutHT = pvHt * qty
        var remiseMontant = brutHT * remisePct / 100
        var totalLigneHT = brutHT - remiseMontant
        var fcLigneHT = fcHt * qty
        var margeLigneHT = totalLigneHT - fcLigneHT
        var tvaLigneHT = totalLigneHT * tvaPct / 100
        var coeffLigne = fcLigneHT > 0 ? totalLigneHT / fcLigneHT : 0
        out.push({
          offering: o,
          qty: qty,
          remisePct: remisePct,
          pvHt: pvHt,
          fcHt: fcHt,
          tvaPct: tvaPct,
          totalLigneHT: totalLigneHT,
          fcLigneHT: fcLigneHT,
          margeLigneHT: margeLigneHT,
          tvaLigneHT: tvaLigneHT,
          coeffLigne: coeffLigne
        })
      })
      return out
    },
    [lines, offeringsById]
  )

  // Totaux globaux
  var totals = useMemo(
    function() {
      var sousTotalHT = 0
      var totalFcHT = 0
      var tvaItems = 0
      lineDetails.forEach(function(l) {
        sousTotalHT += l.totalLigneHT
        totalFcHT += l.fcLigneHT
        tvaItems += l.tvaLigneHT
      })
      var fraisHT = 0
      if (!miseEnPlaceOffert) fraisHT += Number(miseEnPlace) || 0
      if (!livraisonOffert) fraisHT += Number(livraison) || 0
      // Frais à 20% (prestation)
      var tvaFrais = fraisHT * 0.2
      var totalAvantRemise = sousTotalHT + fraisHT
      var remiseGlobale = (totalAvantRemise * (Number(remiseTotalPct) || 0)) / 100
      var totalHT = totalAvantRemise - remiseGlobale
      var tvaTotal = tvaItems + tvaFrais
      // TVA proportionnelle si remise globale
      if (totalAvantRemise > 0 && remiseGlobale > 0) {
        tvaTotal = tvaTotal * (totalHT / totalAvantRemise)
      }
      var totalTTC = totalHT + tvaTotal
      var totalMargeHT = totalHT - totalFcHT
      var coeffReel = totalFcHT > 0 ? totalHT / totalFcHT : 0
      return {
        sousTotalHT: sousTotalHT,
        fraisHT: fraisHT,
        remiseGlobale: remiseGlobale,
        totalHT: totalHT,
        tva: tvaTotal,
        totalTTC: totalTTC,
        totalFcHT: totalFcHT,
        totalMargeHT: totalMargeHT,
        coeffReel: coeffReel
      }
    },
    [lineDetails, livraison, livraisonOffert, miseEnPlace, miseEnPlaceOffert, remiseTotalPct]
  )

  // Auto-suggest livraison offerte si > 500 HT
  var livraisonAutoOfferte = totals.sousTotalHT > 500 && livraison > 0 && !livraisonOffert

  // Couverture pièces (compteurs minis / lunch / parts / forfaits)
  var coverage = useMemo(
    function() {
      var nbMinis = 0
      var nbLunch = 0
      var nbPlateauxParts = 0
      var nbLiveForfait = 0
      var nbAddons = 0
      var nbBoxes = 0
      var liveForfaitNames = []
      lineDetails.forEach(function(l) {
        var o = l.offering
        var qty = l.qty
        if (o.category === 'box_mini') {
          nbMinis += qty * (Number(o.size_pers) || 40)
          nbBoxes += qty
        } else if (o.category === 'live_mini') {
          nbMinis += qty
        } else if (o.category === 'lunch_box') {
          nbLunch += qty
        } else if (o.category === 'platter') {
          nbPlateauxParts += qty * (Number(o.size_pers) || 0)
        } else if (o.category === 'live_forfait') {
          nbLiveForfait += qty
          liveForfaitNames.push(qty + '× ' + o.name)
        } else if (o.category === 'addon') {
          nbAddons += qty
        }
      })
      var status = null
      var statusLabel = null
      var ratio = nbPersonnes > 0 ? nbMinis / nbPersonnes : 0
      if (eventFormat === 'cocktail' && nbPersonnes > 0 && nbMinis > 0) {
        if (ratio < 6) {
          status = 'under'
          statusLabel = '⚠ Sous-dimensionné · viser 6 à 8 minis/pers (manque ' + Math.ceil(6 * nbPersonnes - nbMinis) + ')'
        } else if (ratio <= 8) {
          status = 'ok'
          statusLabel = '✓ Couverture OK (' + ratio.toFixed(1) + ' minis/pers)'
        } else if (ratio <= 12) {
          status = 'warn'
          statusLabel = '↑ Confortable (' + ratio.toFixed(1) + ' minis/pers)'
        } else {
          status = 'over'
          statusLabel = '↑↑ Très généreux (' + ratio.toFixed(1) + ' minis/pers)'
        }
      } else if (eventFormat === 'lunch' && nbPersonnes > 0 && (nbLunch > 0 || nbMinis > 0 || nbPlateauxParts > 0)) {
        if (nbLunch > 0 && nbLunch < nbPersonnes) {
          status = 'under'
          statusLabel = '⚠ Manque ' + (nbPersonnes - nbLunch) + ' lunch box'
        } else if (nbLunch === nbPersonnes && nbLunch > 0) {
          status = 'ok'
          statusLabel = '✓ Couverture exacte'
        } else if (nbLunch > nbPersonnes) {
          status = 'over'
          statusLabel = '+' + (nbLunch - nbPersonnes) + ' lunch box en plus'
        }
      } else if (eventFormat === 'soiree' && nbPersonnes > 0 && nbMinis > 0) {
        if (ratio < 8) {
          status = 'under'
          statusLabel = '⚠ Sous-dimensionné · viser 8 à 12 minis/pers'
        } else if (ratio <= 12) {
          status = 'ok'
          statusLabel = '✓ Couverture OK (' + ratio.toFixed(1) + ' minis/pers)'
        } else {
          status = 'warn'
          statusLabel = '↑ Très généreux (' + ratio.toFixed(1) + ' minis/pers)'
        }
      }
      return {
        nbMinis: nbMinis,
        nbLunch: nbLunch,
        nbPlateauxParts: nbPlateauxParts,
        nbLiveForfait: nbLiveForfait,
        nbAddons: nbAddons,
        nbBoxes: nbBoxes,
        liveForfaitNames: liveForfaitNames,
        ratio: ratio,
        status: status,
        statusLabel: statusLabel
      }
    },
    [lineDetails, eventFormat, nbPersonnes]
  )

  var hasAnyItem = coverage.nbMinis > 0 || coverage.nbLunch > 0 || coverage.nbPlateauxParts > 0 || coverage.nbLiveForfait > 0 || coverage.nbAddons > 0

  // Décompte par recette : agrège la composition de chaque ligne
  // Ex: 2× HOUSTON ST + 1× THE FLATIRON => {Hot Dog:20, THE MELT:28, THE EGG:28, PBN:20, THE REUBEN:8, LOX:8, SPICY TUNA:8, Chicken Caesar:8}
  var sandwichBreakdown = useMemo(
    function() {
      var totals = {}
      lineDetails.forEach(function(l) {
        // Skip live_forfait : composition descriptive (cuisinier, ardoises, etc.) pas comptable
        if (l.offering.category === 'live_forfait') return
        // Skip addon : compositions soit vides soit non comptables
        if (l.offering.category === 'addon') return
        var parsed = parseComposition(l.offering.composition, l.qty)
        parsed.forEach(function(it) {
          if (!totals[it.name]) totals[it.name] = 0
          totals[it.name] += it.qty
        })
      })
      // Convertir en array trié par qty décroissante
      var arr = []
      Object.keys(totals).forEach(function(k) {
        arr.push({ name: k, qty: totals[k] })
      })
      arr.sort(function(a, b) {
        return b.qty - a.qty
      })
      return arr
    },
    [lineDetails]
  )

  // Densité suggérée
  var densiteSuggeree = useMemo(
    function() {
      if (eventFormat === 'cocktail') return Math.round(nbPersonnes * 6) + ' à ' + Math.round(nbPersonnes * 8) + ' minis'
      if (eventFormat === 'lunch') return nbPersonnes + ' lunch box'
      if (eventFormat === 'soiree') return Math.round(nbPersonnes * 8) + ' à ' + Math.round(nbPersonnes * 12) + ' minis'
      return ''
    },
    [eventFormat, nbPersonnes]
  )

  // Handlers
  var addItem = function(offeringId) {
    var idx = lines.findIndex(function(l) {
      return l.offering_id === offeringId
    })
    if (idx >= 0) {
      var newLines = lines.slice()
      newLines[idx] = Object.assign({}, newLines[idx], {
        qty: (Number(newLines[idx].qty) || 0) + 1
      })
      setLines(newLines)
    } else {
      setLines(lines.concat([{ offering_id: offeringId, qty: 1, remisePct: 0 }]))
    }
  }

  var removeItem = function(idx) {
    setLines(
      lines.filter(function(_, i) {
        return i !== idx
      })
    )
  }

  var updateQty = function(idx, newQty) {
    var q = Math.max(0, parseInt(newQty, 10) || 0)
    if (q === 0) {
      removeItem(idx)
      return
    }
    var newLines = lines.slice()
    newLines[idx] = Object.assign({}, newLines[idx], { qty: q })
    setLines(newLines)
  }

  var updateRemise = function(idx, pct) {
    var p = Math.max(0, Math.min(100, parseFloat(pct) || 0))
    var newLines = lines.slice()
    newLines[idx] = Object.assign({}, newLines[idx], { remisePct: p })
    setLines(newLines)
  }

  var pickProspect = function(pid) {
    setClientSelector(pid)
    if (!pid) return
    var p = prospects.find(function(x) {
      return String(x.id) === String(pid)
    })
    if (!p) return
    setClientNom(p.name || '')
    setClientEmail(p.email || '')
    setClientPhone(p.phone || '')
  }

  var handleSave = async function() {
    if (!clientNom.trim()) {
      toastFn('Nom du client requis')
      return
    }
    if (lineDetails.length === 0) {
      toastFn('Sélectionne au moins un item')
      return
    }
    if (!supabase) {
      toastFn('Connexion Supabase indisponible')
      return
    }
    setSaving(true)
    try {
      var responsableEmail = (profile && profile.email) || ''
      var responsablePrenom =
        profile && profile.email && profile.email.indexOf('emy') > -1 ? 'Emy' : 'Edward'

      var payload = {
        numero: numero,
        statut: statut,
        prospect_id: clientSelector ? String(clientSelector) : null,
        client_nom: clientNom,
        client_contact: clientContact || '',
        client_email: clientEmail || '',
        client_phone: clientPhone || '',
        event_date: eventDate || null,
        event_lieu: eventLieu || '',
        nb_personnes: nbPersonnes,
        format: eventFormat,
        items: lines,
        mise_en_place: miseEnPlace,
        mise_en_place_offert: miseEnPlaceOffert,
        livraison: livraison,
        livraison_offert: livraisonOffert,
        remise_total_pct: remiseTotalPct,
        remise_montant: totals.remiseGlobale,
        total_ht: totals.totalHT,
        tva: totals.tva,
        total_ttc: totals.totalTTC,
        total_marge_ht: totals.totalMargeHT,
        total_fc_ht: totals.totalFcHT,
        notes: notes,
        notes_internes: notesInternes,
        date_validite: validite || null,
        responsable_email: responsableEmail,
        responsable_prenom: responsablePrenom
      }

      var res
      if (devisId) {
        res = await supabase.from('devis').update(payload).eq('id', devisId).select().single()
      } else {
        res = await supabase.from('devis').insert(payload).select().single()
      }
      if (res.error) {
        toastFn('Erreur : ' + res.error.message)
        setSaving(false)
        return
      }
      toastFn('Devis sauvegardé ✓')
      onSaved(res.data)
    } catch (e) {
      toastFn('Erreur : ' + (e && e.message ? e.message : 'inconnue'))
    }
    setSaving(false)
  }

  // Génère et ouvre l'aperçu PDF dans une nouvelle fenêtre (impression > sauvegarde PDF)
  var handlePreviewPDF = function() {
    if (lineDetails.length === 0) {
      toastFn('Ajoute au moins un item pour générer le PDF')
      return
    }
    if (!clientNom.trim()) {
      toastFn('Nom du client requis pour le PDF')
      return
    }
    var html = generateCateringPdfHtml(
      {
        numero: numero,
        validite: validite,
        clientNom: clientNom,
        clientContact: clientContact,
        clientEmail: clientEmail,
        clientPhone: clientPhone,
        eventDate: eventDate,
        eventLieu: eventLieu,
        nbPersonnes: nbPersonnes,
        eventFormat: eventFormat,
        lineDetails: lineDetails,
        miseEnPlace: miseEnPlace,
        miseEnPlaceOffert: miseEnPlaceOffert,
        livraison: livraison,
        livraisonOffert: livraisonOffert,
        remiseTotalPct: remiseTotalPct,
        notes: notes,
        totals: totals,
        sandwichBreakdown: sandwichBreakdown,
        coverage: coverage
      },
      LOGO_YELLOW
    )
    var w = window.open('', '_blank')
    if (!w) {
      toastFn('Le navigateur a bloqué la fenêtre. Autorise les popups pour ce site.')
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
  }

  // Filtre offerings par catégorie active + grouping par subcategory
  var filteredOfferings = offerings.filter(function(o) {
    return o.category === activeCategory
  })
  var groupedOfferings = useMemo(
    function() {
      var groups = {}
      filteredOfferings.forEach(function(o) {
        var sub = o.subcategory || 'autre'
        if (!groups[sub]) groups[sub] = []
        groups[sub].push(o)
      })
      return groups
    },
    [filteredOfferings]
  )
  var subcatOrder = Object.keys(groupedOfferings)

  // Coeff color helper (sans JSX)
  var coeffClass = function(c) {
    if (c >= 4.2) return 'qe-coeff-good'
    if (c >= 3.5) return 'qe-coeff-warn'
    return 'qe-coeff-bad'
  }

  // Render loading
  if (loading) {
    return (
      <div className="qe-root">
        <style>{QE_CSS}</style>
        <div className="qe-loading">Chargement de l'éditeur…</div>
      </div>
    )
  }

  return (
    <div className="qe-root">
      <style>{QE_CSS}</style>

      {/* HEADER */}
      <div className="qe-header">
        <div>
          <div className="qe-num">{numero || 'Nouveau devis'}</div>
          <div className="qe-num-sub">{devisId ? 'Édition' : 'Création'}</div>
          <div>
            <span className="qe-status-pill">{STATUS_LABELS[statut] || statut}</span>
          </div>
        </div>
        <div className="qe-actions">
          <button className="btn" onClick={onClose}>← Retour</button>
          <button className="btn btn-y" onClick={handleSave} disabled={saving}>
            {saving ? '⏳ Enregistrement…' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>

      {error ? <div className="qe-error">⚠ {error}</div> : null}

      {/* COMPTEUR COUVERTURE — sticky en haut, toujours visible */}
      <div className="qe-cov">
        <div className="qe-cov-head">
          <div className="qe-cov-title">🍽 Couverture · {nbPersonnes} pers.</div>
          {coverage.statusLabel ? (
            <span className={'qe-cov-status ' + (coverage.status || 'warn')}>{coverage.statusLabel}</span>
          ) : null}
        </div>
        {!hasAnyItem ? (
          <div className="qe-cov-empty">
            Ajoute des items pour voir le décompte temps réel (minis, lunch box, plateaux…).
          </div>
        ) : (
          <div className="qe-cov-grid">
            {coverage.nbMinis > 0 ? (
              <div className="qe-cov-cell">
                <div className="qe-cov-num">{coverage.nbMinis}</div>
                <div className="qe-cov-lbl">Minis (pcs)</div>
                {coverage.nbBoxes > 0 ? (
                  <div className="qe-cov-sub">{coverage.nbBoxes} box · {coverage.ratio.toFixed(1)}/pers</div>
                ) : (
                  <div className="qe-cov-sub">{coverage.ratio.toFixed(1)} / pers</div>
                )}
              </div>
            ) : null}
            {coverage.nbLunch > 0 ? (
              <div className="qe-cov-cell">
                <div className="qe-cov-num">{coverage.nbLunch}</div>
                <div className="qe-cov-lbl">Lunch box</div>
                {nbPersonnes > 0 ? (
                  <div className="qe-cov-sub">{coverage.nbLunch}/{nbPersonnes} pers</div>
                ) : null}
              </div>
            ) : null}
            {coverage.nbPlateauxParts > 0 ? (
              <div className="qe-cov-cell">
                <div className="qe-cov-num">{coverage.nbPlateauxParts}</div>
                <div className="qe-cov-lbl">Parts plateaux</div>
                {nbPersonnes > 0 ? (
                  <div className="qe-cov-sub">{(coverage.nbPlateauxParts / nbPersonnes).toFixed(1)}/pers</div>
                ) : null}
              </div>
            ) : null}
            {coverage.nbLiveForfait > 0 ? (
              <div className="qe-cov-cell">
                <div className="qe-cov-num">{coverage.nbLiveForfait}</div>
                <div className="qe-cov-lbl">Live forfait</div>
                <div className="qe-cov-sub">{coverage.liveForfaitNames.join(', ')}</div>
              </div>
            ) : null}
            {coverage.nbAddons > 0 ? (
              <div className="qe-cov-cell">
                <div className="qe-cov-num">{coverage.nbAddons}</div>
                <div className="qe-cov-lbl">Add-ons</div>
              </div>
            ) : null}
          </div>
        )}
        {sandwichBreakdown.length > 0 ? (
          <div className="qe-cov-bd">
            <div className="qe-cov-bd-title">Détail par recette</div>
            <div className="qe-cov-bd-list">
              {sandwichBreakdown.map(function(s) {
                return (
                  <span key={s.name} className="qe-cov-bd-pill">
                    <strong>{s.qty}</strong> {s.name}
                  </span>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="qe-grid">
        {/* COL GAUCHE — édition */}
        <div className="qe-col-left">

          {/* CLIENT */}
          <div className="qe-card">
            <div className="qe-card-title">Client</div>
            <div className="qe-fg">
              <label className="qe-lbl">Prospect existant (optionnel)</label>
              <select
                className="qe-inp"
                value={clientSelector}
                onChange={function(e) {
                  pickProspect(e.target.value)
                }}
              >
                <option value="">— Nouveau client —</option>
                {prospects.map(function(p) {
                  return (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Entreprise / Client *</label>
              <input
                className="qe-inp"
                value={clientNom}
                onChange={function(e) {
                  setClientNom(e.target.value)
                }}
                placeholder="Nom du client"
              />
            </div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Contact (personne)</label>
                <input
                  className="qe-inp"
                  value={clientContact}
                  onChange={function(e) {
                    setClientContact(e.target.value)
                  }}
                  placeholder="Prénom Nom"
                />
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Email</label>
                <input
                  className="qe-inp"
                  value={clientEmail}
                  onChange={function(e) {
                    setClientEmail(e.target.value)
                  }}
                  placeholder="contact@..."
                />
              </div>
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Téléphone</label>
              <input
                className="qe-inp"
                value={clientPhone}
                onChange={function(e) {
                  setClientPhone(e.target.value)
                }}
                placeholder="06 ..."
              />
            </div>
          </div>

          {/* EVENT */}
          <div className="qe-card">
            <div className="qe-card-title">Événement</div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Date</label>
                <input
                  type="date"
                  className="qe-inp"
                  value={eventDate}
                  onChange={function(e) {
                    setEventDate(e.target.value)
                  }}
                />
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Lieu</label>
                <input
                  className="qe-inp"
                  value={eventLieu}
                  onChange={function(e) {
                    setEventLieu(e.target.value)
                  }}
                  placeholder="Adresse"
                />
              </div>
            </div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Nombre de personnes</label>
                <input
                  type="number"
                  className="qe-inp"
                  value={nbPersonnes}
                  min="1"
                  onChange={function(e) {
                    setNbPersonnes(parseInt(e.target.value, 10) || 1)
                  }}
                />
                {densiteSuggeree ? (
                  <span className="qe-densite-suggest">💡 Suggestion : {densiteSuggeree}</span>
                ) : null}
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Format</label>
                <select
                  className="qe-inp"
                  value={eventFormat}
                  onChange={function(e) {
                    setEventFormat(e.target.value)
                  }}
                >
                  {EVENT_FORMATS.map(function(f) {
                    return (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Validité du devis</label>
              <input
                type="date"
                className="qe-inp"
                value={validite}
                onChange={function(e) {
                  setValidite(e.target.value)
                }}
              />
            </div>
          </div>

          {/* SÉLECTION ITEMS */}
          <div className="qe-card">
            <div className="qe-card-title">Sélectionner des items</div>
            <div className="qe-tabs">
              {CATEGORY_TABS.map(function(t) {
                var count = offerings.filter(function(o) {
                  return o.category === t.id
                }).length
                return (
                  <button
                    key={t.id}
                    className={'qe-tab' + (activeCategory === t.id ? ' on' : '')}
                    onClick={function() {
                      setActiveCategory(t.id)
                    }}
                  >
                    {t.emoji} {t.label} ({count})
                  </button>
                )
              })}
            </div>

            {subcatOrder.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', opacity: 0.4, fontSize: 12 }}>
                Aucun item dans cette catégorie.
              </div>
            ) : null}

            {subcatOrder.map(function(sub) {
              var items = groupedOfferings[sub]
              return (
                <div key={sub} className="qe-subgroup">
                  <div className="qe-subgroup-title">{SUBCAT_LABELS[sub] || sub}</div>
                  <div className="qe-cards">
                    {items.map(function(o) {
                      var pv = Number(o.pv_ht) || 0
                      return (
                        <div
                          key={o.id}
                          className="qe-pick"
                          onClick={function() {
                            addItem(o.id)
                          }}
                        >
                          <div className="qe-pick-name">{o.name}</div>
                          {o.tagline ? <div className="qe-pick-tag">{o.tagline}</div> : null}
                          {o.composition ? <div className="qe-pick-comp">📋 {o.composition}</div> : null}
                          <div className="qe-pick-row">
                            <span className="qe-pick-price">{fmtEur0(pv)} HT</span>
                            <span className="qe-pick-size">
                              {o.size_pers ? o.size_pers + ' pers./pièces' : 'pièce'}
                            </span>
                          </div>
                          {o.flag_volume || o.flag_exclu || o.is_hot ? (
                            <div className="qe-pick-flags">
                              {o.flag_volume ? <span className="qe-flag qe-flag-volume">Volume</span> : null}
                              {o.flag_exclu ? <span className="qe-flag qe-flag-exclu">Exclu B2B</span> : null}
                              {o.is_hot ? <span className="qe-flag qe-flag-hot">Chaud</span> : null}
                            </div>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* ITEMS SÉLECTIONNÉS */}
          <div className="qe-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div className="qe-card-title" style={{ marginBottom: 0 }}>
                Items sélectionnés ({lineDetails.length})
              </div>
              <button
                className="qe-recap-internes-toggle"
                style={{ background: showInternes ? '#191923' : 'transparent', color: showInternes ? '#FFEB5A' : '#191923', borderColor: '#191923' }}
                onClick={function() {
                  setShowInternes(!showInternes)
                }}
              >
                {showInternes ? '👁 Internes ON' : '🔒 Internes OFF'}
              </button>
            </div>
            {lineDetails.length === 0 ? (
              <div className="qe-empty-lines">Aucun item — clique sur les cartes ci-dessus pour ajouter</div>
            ) : null}
            {lineDetails.map(function(l, idx) {
              var o = l.offering
              var isLive = o.category === 'live_forfait'
              var maxRem = isLive ? maxLiveRemise(o) : 0
              var plancher = isLive ? getLivePlancher(o) : 0
              var prixApresRemise = l.totalLigneHT
              return (
                <div key={idx}>
                  <div className="qe-line">
                    <div style={{ minWidth: 0 }}>
                      <div className="qe-line-name">{o.name}</div>
                      <div className="qe-line-meta">
                        {fmtEur(l.pvHt)} HT × {l.qty}
                        {o.size_pers ? ' · ' + o.size_pers + ' pers.' : ''}
                        {l.remisePct > 0 ? ' · -' + l.remisePct + '%' : ''}
                      </div>
                      {o.composition ? (
                        <div className="qe-line-comp">📋 {o.composition}</div>
                      ) : null}
                      {showInternes ? (
                        <div className="qe-line-internes">
                          FC : {fmtEur(l.fcLigneHT)} · Marge : {fmtEur(l.margeLigneHT)} · Coeff : {l.coeffLigne.toFixed(2)}
                        </div>
                      ) : null}
                    </div>
                    <div className="qe-qty">
                      <button
                        className="qe-qty-btn"
                        onClick={function() {
                          updateQty(idx, l.qty - 1)
                        }}
                      >
                        −
                      </button>
                      <input
                        className="qe-qty-input"
                        type="number"
                        min="0"
                        value={l.qty}
                        onChange={function(e) {
                          updateQty(idx, e.target.value)
                        }}
                      />
                      <button
                        className="qe-qty-btn"
                        onClick={function() {
                          updateQty(idx, l.qty + 1)
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div className="qe-line-total">{fmtEur(prixApresRemise)}</div>
                    <button
                      className="qe-rm"
                      onClick={function() {
                        removeItem(idx)
                      }}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                  {isLive && plancher > 0 ? (
                    <div className="qe-live-row">
                      <div className="qe-live-row-title">🔥 Remise live cooking (max {maxRem}%)</div>
                      <input
                        type="range"
                        className="qe-slider"
                        min="0"
                        max={maxRem}
                        step="1"
                        value={l.remisePct || 0}
                        onChange={function(e) {
                          updateRemise(idx, e.target.value)
                        }}
                      />
                      <div className="qe-slider-meta">
                        <span>0% — {fmtEur(l.pvHt)}</span>
                        <span style={{ fontWeight: 900, color: '#191923' }}>
                          {l.remisePct || 0}% appliqué
                        </span>
                        <span>{maxRem}% — plancher {fmtEur(plancher)}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* FRAIS & REMISES */}
          <div className="qe-card">
            <div className="qe-card-title">Frais & Remises</div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Livraison HT</label>
                <input
                  type="number"
                  className="qe-inp"
                  value={livraison}
                  min="0"
                  onChange={function(e) {
                    setLivraison(parseFloat(e.target.value) || 0)
                  }}
                  disabled={livraisonOffert}
                />
                <div className="qe-checkbox-row" style={{ marginTop: 6 }}>
                  <input
                    type="checkbox"
                    id="liv-offert"
                    checked={livraisonOffert}
                    onChange={function(e) {
                      setLivraisonOffert(e.target.checked)
                    }}
                  />
                  <label htmlFor="liv-offert">Offerte</label>
                </div>
                {livraisonAutoOfferte ? (
                  <div className="qe-livraison-auto">💡 Total &gt; 500 € HT — pense à offrir</div>
                ) : null}
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Mise en place HT</label>
                <input
                  type="number"
                  className="qe-inp"
                  value={miseEnPlace}
                  min="0"
                  onChange={function(e) {
                    setMiseEnPlace(parseFloat(e.target.value) || 0)
                  }}
                  disabled={miseEnPlaceOffert}
                />
                <div className="qe-checkbox-row" style={{ marginTop: 6 }}>
                  <input
                    type="checkbox"
                    id="mep-offert"
                    checked={miseEnPlaceOffert}
                    onChange={function(e) {
                      setMiseEnPlaceOffert(e.target.checked)
                    }}
                  />
                  <label htmlFor="mep-offert">Offerte</label>
                </div>
              </div>
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Remise globale sur le total (%)</label>
              <input
                type="number"
                className="qe-inp"
                value={remiseTotalPct}
                min="0"
                max="100"
                step="0.5"
                onChange={function(e) {
                  setRemiseTotalPct(parseFloat(e.target.value) || 0)
                }}
              />
            </div>
          </div>

          {/* NOTES */}
          <div className="qe-card">
            <div className="qe-card-title">Notes</div>
            <div className="qe-fg">
              <label className="qe-lbl">Notes client (visibles sur PDF)</label>
              <textarea
                className="qe-inp qe-textarea"
                value={notes}
                onChange={function(e) {
                  setNotes(e.target.value)
                }}
                placeholder="Conditions spéciales, remarques pour le client..."
              />
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Notes internes (Edward + Emy uniquement)</label>
              <textarea
                className="qe-inp qe-textarea"
                value={notesInternes}
                onChange={function(e) {
                  setNotesInternes(e.target.value)
                }}
                placeholder="Pense-bête, alertes, briefing équipe..."
                style={{ background: '#FFFDE7' }}
              />
            </div>
          </div>

        </div>

        {/* COL DROITE — récap sticky */}
        <div className="qe-col-right">
          <div className="qe-card">
            <div className="qe-card-title">Récapitulatif</div>

          {sandwichBreakdown.length > 0 ? (
            <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1.5px dashed #191923' }}>
              <div className="qe-cov-bd-title" style={{ marginBottom: 6 }}>Détail par recette</div>
              <div className="qe-cov-bd-list">
                {sandwichBreakdown.map(function(s) {
                  return (
                    <span key={s.name} className="qe-cov-bd-pill">
                      <strong>{s.qty}</strong> {s.name}
                    </span>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div className="qe-recap-row">
              <span>Sous-total items HT</span>
              <strong>{fmtEur(totals.sousTotalHT)}</strong>
            </div>
            <div className="qe-recap-row gray">
              <span>
                {miseEnPlaceOffert
                  ? '↪ Mise en place offerte'
                  : 'Mise en place HT'}
              </span>
              <span>{miseEnPlaceOffert ? fmtEur(0) : fmtEur(miseEnPlace)}</span>
            </div>
            <div className="qe-recap-row gray">
              <span>{livraisonOffert ? '↪ Livraison offerte' : 'Livraison HT'}</span>
              <span>{livraisonOffert ? fmtEur(0) : fmtEur(livraison)}</span>
            </div>
            {totals.remiseGlobale > 0 ? (
              <div className="qe-recap-row" style={{ color: '#CC0066' }}>
                <span>Remise globale ({remiseTotalPct}%)</span>
                <strong>−{fmtEur(totals.remiseGlobale)}</strong>
              </div>
            ) : null}
            <div className="qe-recap-row">
              <span>
                <strong>Total HT</strong>
              </span>
              <strong>{fmtEur(totals.totalHT)}</strong>
            </div>
            <div className="qe-recap-row gray">
              <span>TVA (10 % food / 20 % presta)</span>
              <span>{fmtEur(totals.tva)}</span>
            </div>

            <div className="qe-recap-final">
              <span className="qe-recap-final-lbl">Total TTC</span>
              <span className="qe-recap-final-amt">{fmtEur(totals.totalTTC)}</span>
            </div>
            <div style={{ fontSize: 10, opacity: 0.4, textAlign: 'right', marginTop: 3 }}>
              {nbPersonnes > 0
                ? 'soit ' + fmtEur(totals.totalTTC / nbPersonnes) + ' TTC / personne'
                : ''}
            </div>

            {showInternes ? (
              <div className="qe-recap-internes">
                <div className="qe-recap-internes-title">
                  <span>🔒 Internes</span>
                  <button
                    className="qe-recap-internes-toggle"
                    onClick={function() {
                      setShowInternes(false)
                    }}
                  >
                    Masquer
                  </button>
                </div>
                <div className="qe-recap-internes-row">
                  <span>Food cost HT</span>
                  <strong>{fmtEur(totals.totalFcHT)}</strong>
                </div>
                <div className="qe-recap-internes-row">
                  <span>Marge HT</span>
                  <strong>{fmtEur(totals.totalMargeHT)}</strong>
                </div>
                <div className="qe-recap-internes-row">
                  <span>Coeff réel</span>
                  <strong className={coeffClass(totals.coeffReel)}>
                    {totals.coeffReel.toFixed(2)}
                  </strong>
                </div>
                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6, lineHeight: 1.4 }}>
                  Cible : 4,2+ (vert), 3,5–4,2 (jaune), &lt; 3,5 (rose).
                </div>
              </div>
            ) : (
              <button
                className="btn btn-sm"
                style={{ width: '100%', marginTop: 10 }}
                onClick={function() {
                  setShowInternes(true)
                }}
              >
                🔒 Afficher les internes
              </button>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <button
                className="btn btn-y"
                style={{ flex: '1 1 100%', justifyContent: 'center' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '⏳ Enregistrement…' : '💾 Sauvegarder'}
              </button>
              <button
                className="btn btn-p"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handlePreviewPDF}
                disabled={lineDetails.length === 0 || !clientNom.trim()}
                title={lineDetails.length === 0 ? 'Ajoute des items' : (!clientNom.trim() ? 'Renseigne le nom du client' : 'Aperçu du PDF brandé')}
              >
                📄 Aperçu PDF
              </button>
              <button
                className="btn"
                onClick={onClose}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                ← Retour
              </button>
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 8, textAlign: 'center', lineHeight: 1.4 }}>
              Multi-options côte à côte en Phase 4 V2
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
