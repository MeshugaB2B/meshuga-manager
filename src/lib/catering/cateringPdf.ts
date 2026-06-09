// ============================================================
// cateringPdf.ts — Générateur HTML d'un devis Meshuga Events (single-formule)
// Emplacement cible : src/lib/catering/cateringPdf.ts
//
// Fichier TS PUR (aucun JSX). Builder UNIQUE et canonique : remplace à terme
//   - generateCateringPdfHtml() (interne à QuoteEditor)
//   - le builder legacy de DashboardContent.tsx (celui qui contenait « Crazy Deli »
//     et une TVA 5,5 % erronée → supprimés de fait en passant par ce module).
//
// Sortie : document HTML A4 imprimable (window.print → PDF), charte Meshuga.
// Réutilisé par : éditeur (aperçu + envoi), page client (formule choisie), facture.
//
// La PAGE CLIENT comparative (3 formules côte à côte + « Je choisis ») est un
// builder séparé (incrément 4) ; ici on rend UNE formule.
// ============================================================

import { fmtEur } from './cateringCore'
import type { LineComputed, VariantTotals, Coverage, OfferingMap, CateringOffering } from './cateringCore'

export interface DevisPdfClient {
  nom: string
  contact?: string
  email?: string
  phone?: string
}

export interface DevisPdfEvent {
  date?: string // ISO yyyy-mm-dd
  lieu?: string
  format?: string // cocktail | business_lunch | soiree | petit_dej | autre
  nbPersonnes: number
}

export interface DevisPdfPayload {
  numero: string
  validite?: string // ISO yyyy-mm-dd
  client: DevisPdfClient
  event: DevisPdfEvent
  lines: LineComputed[]
  totals: VariantTotals
  coverage?: Coverage | null
  breakdown?: { name: string; qty: number }[] | null
  notes?: string
  formuleLabel?: string // ex : "Signature" (contexte multi-formules)
  offeringMap?: OfferingMap // pour composition / tagline / size_pers
  // Frais bruts + flags "offert" (pour afficher le montant barré "OFFERT")
  frais?: {
    livraison?: number
    livraison_offert?: boolean
    mise_en_place?: number
    mise_en_place_offert?: boolean
  }
}

export interface DevisPdfAssets {
  stampUrl?: string // tampon rond (header) — base64 fourni par l'appelant (logos.ts)
  logotypeUrl?: string // logotype (footer)
}

var EVENT_FORMAT_LABELS: { [k: string]: string } = {
  cocktail: 'Cocktail dînatoire',
  business_lunch: 'Déjeuner / Business lunch',
  lunch: 'Déjeuner / Lunch',
  soiree: 'Soirée',
  petit_dej: 'Petit-déjeuner',
  autre: 'Événement'
}

function escapeHtml(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function frDate(iso?: string): string {
  if (!iso) return ''
  var d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) {
    var d2 = new Date(iso)
    if (isNaN(d2.getTime())) return ''
    return d2.toLocaleDateString('fr-FR')
  }
  return d.toLocaleDateString('fr-FR')
}

export function buildDevisHtml(payload: DevisPdfPayload, assets?: DevisPdfAssets): string {
  var a = assets || {}
  var map = payload.offeringMap || {}
  var ev = payload.event
  var totals = payload.totals
  var todayStr = new Date().toLocaleDateString('fr-FR')
  var validiteStr = frDate(payload.validite)
  var eventDateStr = frDate(ev.date)
  var formatLbl = EVENT_FORMAT_LABELS[ev.format || 'autre'] || 'Événement'
  var nbPers = Number(ev.nbPersonnes) || 0

  // ---- Lignes items ----
  var itemRows = ''
  payload.lines.forEach(function (l: LineComputed) {
    var off: CateringOffering | undefined = map[l.offering_id]
    var composition = off && (off as any).composition ? (off as any).composition : ''
    var tagline = off && (off as any).tagline ? (off as any).tagline : ''
    var sizePers = off && off.size_pers ? off.size_pers : null

    var compDiv = composition
      ? '<div class="comp">' + escapeHtml(composition) + '</div>'
      : (tagline ? '<div class="tag">' + escapeHtml(tagline) + '</div>' : '')
    var sizeBadge = sizePers ? '<span class="size-badge">' + sizePers + ' pcs</span>' : ''
    var remiseBadge = l.remise_pct > 0 ? '<div class="rem-badge">Remise -' + l.remise_pct + '%</div>' : ''

    itemRows +=
      '<tr>' +
        '<td><div class="item-name">' + escapeHtml(l.name) + ' ' + sizeBadge + '</div>' +
          compDiv + remiseBadge +
        '</td>' +
        '<td class="c">' + l.qty + '</td>' +
        '<td class="r">' + fmtEur(l.unit_price_ht) + '</td>' +
        '<td class="r b">' + fmtEur(l.total_ligne_ht) + '</td>' +
      '</tr>'
  })

  // ---- Mise en place ----
  var fr = payload.frais || {}
  var mepRow = ''
  var mepBase = Number(fr.mise_en_place) || 0
  var mepOffert = !!fr.mise_en_place_offert
  if (mepBase > 0) {
    if (mepOffert) {
      mepRow = '<tr><td><span class="strike">Mise en place / installation</span> <span class="offert">OFFERTE</span></td>' +
        '<td class="c">1</td><td class="r"><span class="strike">' + fmtEur(mepBase) + '</span></td>' +
        '<td class="r"><span class="offert b">0,00 €</span></td></tr>'
    } else {
      mepRow = '<tr><td>Mise en place / installation</td><td class="c">1</td><td class="r">' + fmtEur(mepBase) +
        '</td><td class="r"><strong>' + fmtEur(mepBase) + '</strong></td></tr>'
    }
  }

  // ---- Livraison ----
  var livRow = ''
  var livBase = Number(fr.livraison) || 0
  var livOffert = !!fr.livraison_offert
  if (livBase > 0) {
    if (livOffert) {
      livRow = '<tr><td><span class="strike">Frais de livraison</span> <span class="offert">OFFERTS</span></td>' +
        '<td class="c">1</td><td class="r"><span class="strike">' + fmtEur(livBase) + '</span></td>' +
        '<td class="r"><span class="offert b">0,00 €</span></td></tr>'
    } else {
      livRow = '<tr><td>Frais de livraison</td><td class="c">1</td><td class="r">' + fmtEur(livBase) +
        '</td><td class="r"><strong>' + fmtEur(livBase) + '</strong></td></tr>'
    }
  }

  // ---- Remise globale ----
  var remRow = ''
  if (totals.remise_globale_montant > 0) {
    remRow = '<tr class="remise-row"><td>Remise commerciale (' + totals.remise_globale_pct + '%)</td>' +
      '<td class="c">—</td><td class="r">—</td>' +
      '<td class="r b">−' + fmtEur(totals.remise_globale_montant) + '</td></tr>'
  }

  // ---- Breakdown recettes (optionnel) ----
  var breakdownHtml = ''
  if (payload.breakdown && payload.breakdown.length > 0) {
    var rows = ''
    var totalPieces = 0
    payload.breakdown.forEach(function (s) {
      totalPieces += s.qty
      rows += '<div class="bd-row"><span class="bd-qty">' + s.qty + '</span><span class="bd-name">' + escapeHtml(s.name) + '</span></div>'
    })
    if (payload.breakdown.length % 2 === 1) rows += '<div class="bd-row bd-row-filler"></div>'
    breakdownHtml =
      '<div class="breakdown">' +
        '<div class="breakdown-title">Détail des recettes incluses</div>' +
        '<div class="breakdown-sub">' + totalPieces + ' pièces réparties dans les boxes ci-dessous</div>' +
        '<div class="breakdown-grid">' + rows + '</div>' +
      '</div>'
  }

  // ---- Bandeau couverture ----
  var coverageHtml = ''
  if (payload.coverage) {
    var cov = payload.coverage
    var covParts: string[] = []
    if (cov.nb_minis > 0) covParts.push('<strong>' + cov.nb_minis + '</strong> minis')
    if (cov.nb_lunch > 0) covParts.push('<strong>' + cov.nb_lunch + '</strong> lunch box')
    if (cov.nb_plateaux_parts > 0) covParts.push('<strong>' + cov.nb_plateaux_parts + '</strong> parts plateaux')
    var liveNames = liveForfaitNames(payload, map)
    if (liveNames) covParts.push(escapeHtml(liveNames))
    if (covParts.length > 0) {
      var perPersonNote = ''
      if (nbPers > 0 && totals.total_ttc > 0) {
        perPersonNote = '<br><span class="cov-pp">soit ' + fmtEur(totals.total_ttc / nbPers) + ' TTC / personne</span>'
      }
      coverageHtml =
        '<div class="cov">' + covParts.join(' &middot; ') +
        ' <span class="cov-pers">pour ' + nbPers + ' personnes</span>' +
        perPersonNote +
        '</div>'
    }
  }

  // ---- Notes ----
  var notesHtml = ''
  if (payload.notes && payload.notes.trim()) {
    notesHtml =
      '<div class="notes-block">' +
        '<div class="notes-title">Notes</div>' +
        '<div class="notes-content">' + escapeHtml(payload.notes).replace(/\n/g, '<br>') + '</div>' +
      '</div>'
  }

  // ---- Prix / personne ----
  var perPersonHtml = ''
  if (nbPers > 0 && totals.total_ttc > 0) {
    perPersonHtml = '<div class="per-person">soit ' + fmtEur(totals.total_ttc / nbPers) + ' TTC / personne</div>'
  }

  // ---- Logos ----
  var stampHtml = a.stampUrl
    ? '<img src="' + a.stampUrl + '" alt="meshuga"/>'
    : '<div class="logo-text-fb">meshuga</div>'
  var logotypeHtml = a.logotypeUrl
    ? '<img src="' + a.logotypeUrl + '" alt="meshuga" class="footer-logo-img"/>'
    : '<div class="logo-text-fb" style="font-size:28px">meshuga</div>'

  // ---- Label formule (contexte multi-formules) ----
  var formuleLine = payload.formuleLabel
    ? '<div class="doc-num">Formule ' + escapeHtml(payload.formuleLabel) + '</div>'
    : ''

  var css = buildCss()

  return '<!DOCTYPE html><html lang="fr"><head>' +
    '<meta charset="UTF-8">' +
    '<title>Devis ' + escapeHtml(payload.numero) + ' &mdash; MESHUGA</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">' +
    '<style>' + css + '</style>' +
    '</head><body>' +
    '<div class="page">' +
      '<div class="content">' +
        '<div class="header">' +
          '<div class="logo">' + stampHtml +
            '<div class="logo-tag">' +
              '<div class="logo-name">meshuga</div>' +
              '<div class="logo-sub-pink">Events &middot; Paris</div>' +
            '</div>' +
          '</div>' +
          '<div class="doc-info">' +
            '<div class="doc-type">Devis</div>' +
            '<div class="doc-num">N&deg; ' + escapeHtml(payload.numero) + '</div>' +
            formuleLine +
            '<div class="doc-num">&Eacute;mis le ' + todayStr + '</div>' +
            (validiteStr ? '<div class="doc-num">Valable jusqu&#39;au ' + validiteStr + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="parties">' +
          '<div class="party">' +
            '<div class="party-label">&Eacute;metteur</div>' +
            '<div class="party-name">SAS AEGIA FOOD</div>' +
            '<div class="party-detail">Enseigne : MESHUGA</div>' +
            '<div class="party-detail">3 rue Vavin, 75006 Paris</div>' +
            '<div class="party-detail">SIRET 904 639 531 00014</div>' +
            '<div class="party-detail">TVA FR31904639531</div>' +
            '<div class="party-detail">events@meshuga.fr</div>' +
          '</div>' +
          '<div class="party client">' +
            '<div class="party-label">Client</div>' +
            '<div class="party-name">' + escapeHtml(payload.client.nom) + '</div>' +
            (payload.client.contact ? '<div class="party-detail">' + escapeHtml(payload.client.contact) + '</div>' : '') +
            (payload.client.email ? '<div class="party-detail">' + escapeHtml(payload.client.email) + '</div>' : '') +
            (payload.client.phone ? '<div class="party-detail">' + escapeHtml(payload.client.phone) + '</div>' : '') +
            '<div class="event-detail">' +
              '<strong>' + formatLbl + '</strong> &middot; ' + nbPers + ' pers.' +
              (eventDateStr ? ' &middot; ' + eventDateStr : '') +
              (ev.lieu ? '<br>Lieu : ' + escapeHtml(ev.lieu) : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        coverageHtml +
        breakdownHtml +
        '<table class="items">' +
          '<thead><tr>' +
            '<th class="w-name">D&eacute;signation</th>' +
            '<th class="w-qty">Qt&eacute;</th>' +
            '<th class="w-pu">PU HT</th>' +
            '<th class="w-tot">Total HT</th>' +
          '</tr></thead>' +
          '<tbody>' + itemRows + mepRow + livRow + remRow + '</tbody>' +
        '</table>' +
        '<div class="tc-grid">' +
          '<div class="tc-cond">' +
            '<div class="cond-title">Conditions de r&egrave;glement</div>' +
            '<div class="cond">Acompte de 30 % &agrave; la commande. Solde imp&eacute;rativement <strong>72 h (3 jours ouvr&eacute;s) avant la prestation</strong>, &agrave; d&eacute;faut prestation non garantie et acompte conserv&eacute;. Devis valable 30 jours. Pour valider, retournez le devis sign&eacute; avec la mention "Bon pour accord" + virement de l&#39;acompte. Conditions d&eacute;taill&eacute;es : voir CGV en derni&egrave;re page.</div>' +
          '</div>' +
          '<div class="tc-totals">' +
            '<div class="t-row"><span>Total HT</span><strong>' + fmtEur(totals.total_ht) + '</strong></div>' +
            '<div class="t-row gray"><span>TVA (10 % food / 20 % prestations)</span><span>' + fmtEur(totals.tva) + '</span></div>' +
            '<div class="t-final"><span class="lbl">Total TTC</span><span class="amt">' + fmtEur(totals.total_ttc) + '</span></div>' +
            perPersonHtml +
          '</div>' +
        '</div>' +
        notesHtml +
        '<div class="rib">' +
          '<div class="rib-title">Coordonn&eacute;es bancaires</div>' +
          '<div class="rib-grid">' +
            '<div class="rib-item"><label>Titulaire</label><span>SAS AEGIA FOOD</span></div>' +
            '<div class="rib-item"><label>Banque</label><span>Banque Populaire</span></div>' +
            '<div class="rib-item"><label>IBAN</label><span>FR76 1020 7000 8723 2175 3218 077</span></div>' +
            '<div class="rib-item"><label>BIC</label><span>CCBPFRPPMTG</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="sig">' +
          '<div class="sig-title">Bon pour accord</div>' +
          '<div class="sig-legal">Le client reconna&icirc;t avoir pris connaissance des conditions de vente du pr&eacute;sent devis et des conditions g&eacute;n&eacute;rales de vente jointes en derni&egrave;re page, et accepte sans r&eacute;serve l&#39;ensemble des prestations, quantit&eacute;s et tarifs mentionn&eacute;s. La signature ci-dessous, accompagn&eacute;e de la mention manuscrite "Bon pour accord", vaut acceptation ferme et d&eacute;finitive de la commande et engage le signataire au r&egrave;glement de l&#39;acompte.</div>' +
          '<div class="sig-grid">' +
            '<div class="sig-field"><label>Date</label><div class="sig-line"></div></div>' +
            '<div class="sig-field"><label>Lieu</label><div class="sig-line"></div></div>' +
            '<div class="sig-field"><label>Nom &amp; qualit&eacute; du signataire</label><div class="sig-line"></div></div>' +
          '</div>' +
          '<div class="sig-box"><label>Signature et cachet (mention "Bon pour accord")</label></div>' +
        '</div>' +
        '<div class="cgv-pagebreak"></div>' +
        '<div class="cgv">' +
          '<div class="cgv-header">' +
            '<div class="cgv-title">Conditions G&eacute;n&eacute;rales de Vente</div>' +
            '<div class="cgv-sub">SAS AEGIA FOOD (enseigne MESHUGA) &middot; Applicables &agrave; toute commande de prestation traiteur &eacute;v&eacute;nementiel</div>' +
          '</div>' +
          '<div class="cgv-cols">' +
            '<div>' + buildCgvCol1() + '</div>' +
            '<div>' + buildCgvCol2() + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="footer">' +
        '<div class="footer-brand">' +
          logotypeHtml +
          '<div class="footer-meta">3 rue Vavin, Paris 6e &middot; events@meshuga.fr</div>' +
        '</div>' +
        '<div class="legal">SAS AEGIA FOOD (enseigne MESHUGA) &middot; SAS au capital de 1 000 &euro; &middot; RCS Paris 904 639 531 &middot; SIRET 904 639 531 00014 &middot; APE 56.10C &middot; TVA intracommunautaire FR31904639531 &middot; 3 rue Vavin 75006 Paris &middot; TVA &agrave; taux r&eacute;duit (10 %) sur les produits alimentaires et taux normal (20 %) sur les prestations de service. Tout commencement d&#39;ex&eacute;cution vaut acceptation du pr&eacute;sent devis.</div>' +
      '</div>' +
    '</div>' +
    '<div class="no-print">' +
      '<p>Pour enregistrer en PDF : cliquez sur <strong>Imprimer</strong> puis choisissez <strong>Enregistrer au format PDF</strong> comme imprimante.<br>Pensez &agrave; d&eacute;cocher <em>En-t&ecirc;tes et pieds de page</em> dans les options.</p>' +
      '<button onclick="window.print()">📄 Imprimer / Enregistrer PDF</button>' +
      '<button class="close-btn" onclick="window.close()">Fermer</button>' +
    '</div>' +
    '</body></html>'
}

// ---- Helpers ----
function liveForfaitNames(p: DevisPdfPayload, map: OfferingMap): string {
  var names: string[] = []
  ;(p.lines || []).forEach(function (l) {
    var off = map[l.offering_id]
    if (off && off.category === 'live_forfait') names.push(off.name)
  })
  return names.join(' + ')
}

function buildCss(): string {
  return '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;font-size:11px;background:#FFFFFF}' +
    '@page{size:A4;margin:10mm 16mm 18mm 16mm}' +
    '@media print{html{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact}.no-print{display:none !important}.page{padding:0;width:auto;min-height:auto;page-break-inside:auto;display:block}.content{flex:none;display:block}.party,.parties,.cov,.t-final,.tc-grid,.breakdown,.notes-block,.footer,.footer-brand,.sig,.rib{page-break-inside:avoid;break-inside:avoid}.cond-title,.rib-title,.notes-title,.breakdown-title,.sig-title{page-break-after:avoid;break-after:avoid}.rib-grid,.sig-grid,.sig-box{page-break-inside:avoid;break-inside:avoid}table.items tr{page-break-inside:avoid;break-inside:avoid}table.items thead{display:table-header-group}.footer{margin-top:18px;padding-top:12px}p,.legal{orphans:3;widows:3}}' +
    '.page{width:210mm;min-height:297mm;padding:14mm 16mm 0;display:flex;flex-direction:column;background:#FFFFFF}' +
    '.content{flex:1}' +
    '.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:11px;border-bottom:3px solid #FF82D7;margin-bottom:14px}' +
    '.logo{display:flex;align-items:center;gap:14px}' +
    '.logo img{height:75px;width:75px;display:block;image-rendering:-webkit-optimize-contrast;image-rendering:crisp-edges;image-rendering:high-quality;border-radius:50%}' +
    '.logo-tag{display:flex;flex-direction:column;justify-content:center}' +
    '.logo-name{font-family:Yellowtail,cursive;font-size:26px;color:#191923;line-height:1}' +
    '.logo-sub-pink{font-family:"Arial Narrow",Arial,sans-serif;font-size:8.5px;color:#FF82D7;letter-spacing:1.6px;text-transform:uppercase;font-weight:900;margin-top:3px}' +
    '.logo-text-fb{font-family:Yellowtail,cursive;font-size:36px;color:#191923;line-height:1}' +
    '.logo-sub{font-size:8.5px;color:#999;margin-top:4px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700}' +
    '.doc-info{text-align:right}' +
    '.doc-type{font-family:Yellowtail,cursive;font-size:42px;color:#191923;line-height:.95}' +
    '.doc-num{font-size:10px;color:#666;margin-top:3px;font-weight:700}' +
    '.parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:11px}' +
    '.party{background:#FAFAFA;border-radius:5px;padding:9px 12px;border-left:4px solid #FFEB5A}' +
    '.party.client{border-left-color:#FF82D7}' +
    '.party-label{font-family:Yellowtail,cursive;font-size:14px;color:#888;margin-bottom:4px;line-height:1}' +
    '.party-name{font-size:13px;font-weight:900;margin-bottom:3px}' +
    '.party-detail{font-size:9.5px;color:#555;margin-top:1px;line-height:1.5}' +
    '.event-detail{margin-top:6px;font-size:10px;color:#191923;line-height:1.5}' +
    '.cov{background:#FFEB5A;border:2px solid #191923;border-radius:5px;padding:7px 14px;margin-bottom:11px;font-size:11px;text-align:center;letter-spacing:.3px;box-shadow:2px 2px 0 #191923}' +
    '.cov strong{font-weight:900;font-size:12px}' +
    '.cov-pers{font-style:italic;color:#191923;opacity:.7;margin-left:4px}' +
    '.cov-pp{font-size:10px;font-weight:700;font-style:italic;color:#191923;opacity:.85;letter-spacing:.2px}' +
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
    '.c{text-align:center}.r{text-align:right}.b{font-weight:900}' +
    '.strike{text-decoration:line-through;opacity:.5}' +
    '.offert{color:#009D3A;font-weight:900}' +
    '.remise-row td{color:#FF82D7}' +
    '.breakdown{margin:0 0 11px;padding:9px 12px;background:#FFFAEC;border-radius:5px;border-left:4px solid #FFEB5A;page-break-inside:avoid;break-inside:avoid}' +
    '.breakdown-title{font-family:Yellowtail,cursive;font-size:16px;color:#191923;margin-bottom:6px;line-height:1}' +
    '.breakdown-sub{font-size:9px;color:#888;font-style:italic;margin-bottom:8px;letter-spacing:.2px}' +
    '.breakdown-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:#191923;border:1.5px solid #191923;border-radius:4px;overflow:hidden}' +
    '.bd-row{display:flex;align-items:center;padding:6px 12px;background:#FFFFFF;font-size:11px;gap:10px}' +
    '.bd-row-filler{background:#FFFFFF}' +
    '.bd-qty{font-weight:900;font-size:14px;color:#FF82D7;min-width:34px;text-align:right;font-family:"Arial Narrow",Arial,sans-serif;flex-shrink:0}' +
    '.bd-name{font-weight:900;color:#191923;letter-spacing:.3px;flex:1;text-transform:uppercase}' +
    '.tc-grid{display:grid;grid-template-columns:1fr 290px;gap:16px;align-items:start;margin-bottom:11px}' +
    '.tc-cond{background:#FAFAFA;border-left:4px solid #FF82D7;border-radius:0 4px 4px 0;padding:10px 13px}' +
    '.tc-cond .cond-title{font-family:Yellowtail,cursive;font-size:16px;color:#191923;margin-bottom:4px;line-height:1}' +
    '.tc-cond .cond{font-size:9.5px;color:#444;line-height:1.55}' +
    '.tc-totals{display:flex;flex-direction:column;justify-content:flex-start}' +
    '.t-row{display:flex;justify-content:space-between;padding:5px 4px;border-bottom:1px solid #EBEBEB;font-size:11.5px}' +
    '.t-row.gray{color:#888;font-size:10px}' +
    '.t-row strong{font-weight:900;font-size:12px}' +
    '.t-final{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#FFEB5A;border:2px solid #191923;border-radius:5px;margin-top:6px;box-shadow:3px 3px 0 #191923}' +
    '.t-final .lbl{font-family:Yellowtail,cursive;font-size:22px;color:#191923;line-height:1}' +
    '.t-final .amt{font-weight:900;font-size:16px;color:#191923}' +
    '.per-person{text-align:right;font-size:9.5px;color:#888;margin-top:4px;font-style:italic}' +
    '.notes-block{background:#FFF9E5;border-left:4px solid #FFEB5A;padding:9px 13px;margin-bottom:10px;border-radius:0 4px 4px 0}' +
    '.notes-title{font-family:Yellowtail,cursive;font-size:14px;color:#191923;margin-bottom:4px;line-height:1}' +
    '.notes-content{font-size:10px;line-height:1.55;color:#333}' +
    '.rib{border:1.5px solid #191923;border-radius:5px;padding:9px 14px;margin-bottom:10px;background:#FFFFFF}' +
    '.rib-title{font-family:Yellowtail,cursive;font-size:16px;color:#FF82D7;margin-bottom:6px;line-height:1}' +
    '.rib-grid{display:grid;grid-template-columns:1fr 1fr 2fr 1fr;gap:12px}' +
    '.rib-item label{display:block;font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:3px;font-weight:900}' +
    '.rib-item span{font-size:10.5px;font-weight:900;font-family:"Arial Narrow",Arial,sans-serif;color:#191923;letter-spacing:1.2px}' +
    '.sig{border:2px solid #191923;border-radius:5px;padding:9px 13px 11px;margin-bottom:10px;background:#FFFFFF;box-shadow:3px 3px 0 #FF82D7}' +
    '.sig-title{font-family:Yellowtail,cursive;font-size:18px;color:#191923;margin-bottom:4px;line-height:1}' +
    '.sig-legal{font-size:8px;color:#444;line-height:1.5;margin-bottom:8px;text-align:justify}' +
    '.sig-grid{display:grid;grid-template-columns:1fr 1fr 2fr;gap:12px;margin-bottom:9px}' +
    '.sig-field label{display:block;font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:5px;font-weight:900}' +
    '.sig-line{height:16px;border-bottom:1.2px solid #191923}' +
    '.sig-box{border:1.5px dashed #191923;border-radius:4px;height:90px;padding:5px 9px;position:relative}' +
    '.sig-box label{display:block;font-size:7.5px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:900}' +
    '.cgv-pagebreak{height:0}' +
    '.cgv{padding-top:28px}' +
    '.cgv-header{padding-bottom:11px;border-bottom:3px solid #FF82D7;margin-bottom:14px;page-break-inside:avoid;break-inside:avoid;page-break-after:avoid;break-after:avoid}' +
    '.cgv-title{font-family:Yellowtail,cursive;font-size:32px;color:#191923;line-height:1}' +
    '.cgv-sub{font-family:"Arial Narrow",Arial,sans-serif;font-size:9.5px;color:#777;letter-spacing:.4px;margin-top:4px}' +
    '.cgv-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}' +
    '.cgv-art{margin-bottom:9px;page-break-inside:avoid;break-inside:avoid}' +
    '.cgv-art h4{font-family:"Arial Narrow",Arial,sans-serif;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.6px;color:#FF82D7;margin-bottom:3px;line-height:1.2}' +
    '.cgv-art p{font-size:8.5px;color:#333;line-height:1.55;text-align:justify}' +
    '.footer{padding:10px 0 0;border-top:1px solid #EBEBEB;margin-top:auto}' +
    '.footer-brand{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:8px;padding-bottom:8px}' +
    '.footer-logo-img{height:34px;width:auto;display:block;image-rendering:high-quality}' +
    '.footer-meta{font-family:"Arial Narrow",Arial,sans-serif;font-size:11px;color:#191923;letter-spacing:.5px;font-weight:400;text-align:right}' +
    '.legal{font-size:7px;color:#777;line-height:1.7;text-align:justify}' +
    '.no-print{text-align:center;padding:24px 16px;background:#FFFFFF;border-top:2px dashed #FF82D7;margin-top:16px}' +
    '.no-print p{margin-bottom:14px;font-size:11px;color:#666;line-height:1.6}' +
    '.no-print button{padding:11px 28px;background:#FFEB5A;color:#191923;border:2px solid #191923;border-radius:5px;font-size:13px;font-weight:900;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;box-shadow:3px 3px 0 #191923;font-family:Arial,sans-serif;margin:0 4px}' +
    '.no-print button.close-btn{background:#FFFFFF}' +
    '.no-print button:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #191923}'
}

function buildCgvCol1(): string {
  return '<div class="cgv-art"><h4>1. Champ d&#39;application</h4><p>Les pr&eacute;sentes Conditions G&eacute;n&eacute;rales de Vente (ci-apr&egrave;s "CGV") r&eacute;gissent l&#39;ensemble des prestations de traiteur &eacute;v&eacute;nementiel B2B fournies par la soci&eacute;t&eacute; SAS AEGIA FOOD (ci-apr&egrave;s "AEGIA FOOD"), exer&ccedil;ant sous l&#39;enseigne MESHUGA, &agrave; ses clients professionnels. Toute commande emporte adh&eacute;sion sans r&eacute;serve aux pr&eacute;sentes CGV, qui pr&eacute;valent sur tout autre document du client.</p></div>' +
    '<div class="cgv-art"><h4>2. Devis et commande</h4><p>Tout devis est valable 30 jours &agrave; compter de sa date d&#39;&eacute;mission. La commande est ferme et d&eacute;finitive d&egrave;s r&eacute;ception du devis sign&eacute; portant la mention manuscrite "Bon pour accord", accompagn&eacute; du r&egrave;glement de l&#39;acompte. La signature peut &ecirc;tre olographe ou &eacute;lectronique conform&eacute;ment aux articles 1366 et 1367 du Code civil.</p></div>' +
    '<div class="cgv-art"><h4>3. Confirmation des effectifs</h4><p>Le nombre d&eacute;finitif de convives doit &ecirc;tre confirm&eacute; au plus tard 7 jours avant la date de l&#39;&eacute;v&eacute;nement. &Agrave; d&eacute;faut, le nombre figurant sur le devis est r&eacute;put&eacute; d&eacute;finitif. Toute majoration ult&eacute;rieure est sous r&eacute;serve de disponibilit&eacute; et entra&icirc;ne une facturation compl&eacute;mentaire au tarif unitaire indiqu&eacute;. Aucune minoration n&#39;est accept&eacute;e en de&ccedil;&agrave; de 7 jours.</p></div>' +
    '<div class="cgv-art"><h4>4. Prix et facturation</h4><p>Les prix sont indiqu&eacute;s en euros, hors taxes (HT) et toutes taxes comprises (TTC). La TVA applicable est de 10 % sur les denr&eacute;es alimentaires et 20 % sur les prestations de service (animation live, mise en place, livraison). Toute prestation suppl&eacute;mentaire non pr&eacute;vue au devis fait l&#39;objet d&#39;un avenant ou d&#39;une facture compl&eacute;mentaire.</p></div>' +
    '<div class="cgv-art"><h4>5. Modalit&eacute;s de paiement</h4><p>Un acompte de 30 % du montant TTC est exigible &agrave; la commande, par virement bancaire sur le compte ci-dessus. Le solde, soit 70 % du montant TTC, est d&ucirc; <strong>imp&eacute;rativement 72 heures (3 jours ouvr&eacute;s) avant la date de l&#39;&eacute;v&eacute;nement</strong>. &Agrave; d&eacute;faut de r&eacute;ception du solde dans ce d&eacute;lai, AEGIA FOOD se r&eacute;serve le droit d&#39;annuler unilat&eacute;ralement la prestation, sans qu&#39;aucune indemnit&eacute; ne soit due au client. Dans ce cas, l&#39;acompte est d&eacute;finitivement acquis &agrave; AEGIA FOOD &agrave; titre d&#39;indemnit&eacute; forfaitaire, sans pr&eacute;judice de la facturation des frais d&eacute;j&agrave; engag&eacute;s (mati&egrave;res premi&egrave;res, sous-traitance, locations, personnel mobilis&eacute;). Aucun escompte n&#39;est accord&eacute; pour paiement anticip&eacute;.</p></div>' +
    '<div class="cgv-art"><h4>6. Retard de paiement</h4><p>Pour toute facture &eacute;mise <em>apr&egrave;s</em> la prestation (avenant, prestation suppl&eacute;mentaire, dommages, indemnit&eacute;s), le paiement est exigible &agrave; r&eacute;ception. Conform&eacute;ment &agrave; l&#39;article L. 441-10 du Code de commerce, tout retard entra&icirc;ne de plein droit l&#39;application de p&eacute;nalit&eacute;s calcul&eacute;es au taux d&#39;int&eacute;r&ecirc;t appliqu&eacute; par la Banque centrale europ&eacute;enne &agrave; son op&eacute;ration de refinancement la plus r&eacute;cente, major&eacute; de 10 points de pourcentage, ainsi qu&#39;une indemnit&eacute; forfaitaire pour frais de recouvrement de 40 &euro; (article D. 441-5 du Code de commerce). Pour les paiements pr&eacute;-prestation (acompte et solde), les modalit&eacute;s de l&#39;article 5 s&#39;appliquent.</p></div>' +
    '<div class="cgv-art"><h4>7. Annulation par le client</h4><p>Toute annulation doit &ecirc;tre notifi&eacute;e par &eacute;crit (courriel ou courrier recommand&eacute;). Les conditions financi&egrave;res appliqu&eacute;es sont les suivantes : <strong>plus de 30 jours</strong> avant la prestation : acompte rembours&eacute;, hors frais d&eacute;j&agrave; engag&eacute;s ; <strong>entre 30 et 15 jours</strong> : 50 % du montant TTC d&ucirc; ; <strong>entre 14 et 8 jours</strong> : 75 % du montant TTC d&ucirc; ; <strong>7 jours ou moins (ou non-paiement du solde &agrave; J-3)</strong> : 100 % du montant TTC d&ucirc;.</p></div>'
}

function buildCgvCol2(): string {
  return '<div class="cgv-art"><h4>8. Hygi&egrave;ne, allerg&egrave;nes et r&eacute;gimes alimentaires</h4><p>AEGIA FOOD respecte la r&eacute;glementation HACCP et la d&eacute;claration des 14 allerg&egrave;nes majeurs (r&egrave;glement UE 1169/2011). Le client s&#39;engage &agrave; communiquer toute exigence di&eacute;t&eacute;tique, allergie ou intol&eacute;rance des convives au moins 7 jours avant l&#39;&eacute;v&eacute;nement. La responsabilit&eacute; d&#39;AEGIA FOOD ne saurait &ecirc;tre engag&eacute;e en cas de r&eacute;action cons&eacute;cutive &agrave; une information non communiqu&eacute;e ou erron&eacute;e.</p></div>' +
    '<div class="cgv-art"><h4>9. Prestation sur site et live cooking</h4><p>Pour les prestations avec animation sur site, le client met &agrave; disposition gratuitement : un acc&egrave;s direct au lieu (ascenseur de service le cas &eacute;ch&eacute;ant), un point d&#39;eau, l&#39;alimentation &eacute;lectrique requise et un espace de pr&eacute;paration suffisant. Tout retard imputable au client (acc&egrave;s, autorisations, mat&eacute;riel manquant) ne peut pr&eacute;tendre &agrave; minoration. Le client demeure responsable du mat&eacute;riel d&#39;AEGIA FOOD mis &agrave; disposition.</p></div>' +
    '<div class="cgv-art"><h4>10. Livraison</h4><p>La livraison est effectu&eacute;e &agrave; l&#39;adresse indiqu&eacute;e par le client, dans le cr&eacute;neau convenu. En cas d&#39;impossibilit&eacute; de livraison du fait du client (absence, acc&egrave;s impossible, adresse erron&eacute;e), les denr&eacute;es restent factur&eacute;es. Une nouvelle livraison est sous r&eacute;serve de disponibilit&eacute; et factur&eacute;e en suppl&eacute;ment.</p></div>' +
    '<div class="cgv-art"><h4>11. Cha&icirc;ne du froid et conservation</h4><p>Les denr&eacute;es livr&eacute;es doivent &ecirc;tre consomm&eacute;es dans les 4 heures suivant la livraison ou la fin de la prestation, &agrave; temp&eacute;rature ambiante n&#39;exc&eacute;dant pas 22&deg;C. Au-del&agrave;, ou en cas de rupture de la cha&icirc;ne du froid imputable au client, la responsabilit&eacute; d&#39;AEGIA FOOD ne peut &ecirc;tre engag&eacute;e.</p></div>' +
    '<div class="cgv-art"><h4>12. Force majeure</h4><p>Les obligations des parties sont suspendues en cas de force majeure au sens de l&#39;article 1218 du Code civil (intemp&eacute;ries exceptionnelles, gr&egrave;ve g&eacute;n&eacute;rale, pand&eacute;mie, mesure administrative). Les parties s&#39;efforceront de bonne foi de reporter l&#39;&eacute;v&eacute;nement. &Agrave; d&eacute;faut, l&#39;acompte est conserv&eacute; &agrave; titre de couverture des frais d&eacute;j&agrave; engag&eacute;s.</p></div>' +
    '<div class="cgv-art"><h4>13. Droit &agrave; l&#39;image</h4><p>AEGIA FOOD pourra r&eacute;aliser des photographies et vid&eacute;os de ses prestations &agrave; des fins de communication (site internet, r&eacute;seaux sociaux, supports commerciaux et &eacute;ditoriaux). En signant le pr&eacute;sent devis, le client accepte que ces images puissent &ecirc;tre captur&eacute;es lors de l&#39;&eacute;v&eacute;nement et exploit&eacute;es librement par AEGIA FOOD, sur tout support et pour toute dur&eacute;e. Aucun convive ne sera identifi&eacute; nominativement. Toute opposition particuli&egrave;re relative &agrave; un convive identifiable doit &ecirc;tre formul&eacute;e par &eacute;crit avant le d&eacute;but de la prestation.</p></div>' +
    '<div class="cgv-art"><h4>14. Donn&eacute;es personnelles</h4><p>Les donn&eacute;es collect&eacute;es sont trait&eacute;es conform&eacute;ment au RGPD et &agrave; la loi Informatique et Libert&eacute;s. Le client dispose d&#39;un droit d&#39;acc&egrave;s, de rectification, d&#39;effacement, de portabilit&eacute; et d&#39;opposition exer&ccedil;able par courriel &agrave; events@meshuga.fr.</p></div>' +
    '<div class="cgv-art"><h4>15. Litiges et droit applicable</h4><p>Les pr&eacute;sentes CGV sont soumises au droit fran&ccedil;ais. &Agrave; d&eacute;faut de r&egrave;glement amiable, tout litige sera de la comp&eacute;tence exclusive du Tribunal de commerce de Paris, m&ecirc;me en cas de pluralit&eacute; de d&eacute;fendeurs ou d&#39;appel en garantie.</p></div>'
}
