// ============================================================
// cateringFacture.ts — Générateur HTML d'une FACTURE Meshuga Events
// Emplacement cible : src/lib/catering/cateringFacture.ts
//
// Fichier TS PUR (aucun JSX). Réutilise le payload du devis (cateringPdf) pour
// la formule SIGNÉE par le client, et ajoute :
//   - numéro / date de facture, référence du devis, date de prestation
//   - adresse de facturation du client
//   - ventilation de la TVA par taux (10 % denrées / 20 % prestations)
//   - acompte versé, solde réglé, net à payer
//   - mention « ACQUITTÉE » + « Net à payer 0,00 € » quand le solde est encaissé
//
// Même numéro de facture pour la version « à régler » et la version « acquittée »
// (on ne renumérote jamais une facture déjà émise).
// ============================================================

import { fmtEur, round2, tvaToRatio, TVA_PRESTA_RATIO } from './cateringCore'
import type { LineComputed } from './cateringCore'
import type { DevisPdfPayload, DevisPdfAssets } from './cateringPdf'
import { MESHUGA_LOGO_PINK_DATA_URI } from '@/lib/meshugaLogo'

export interface FactureInfo {
  numero: string // ex : FAC-2026-003
  date?: string // ISO yyyy-mm-dd (date d'émission)
  devisNumero?: string // ex : DEV-2026-2902
  clientAdresse?: string
  acompteMontant?: number
  acompteDate?: string
  acompteMode?: string
  soldeRecu?: boolean
  soldeMontant?: number
  soldeDate?: string
  soldeMode?: string
}

export var PAIEMENT_MODES: { [k: string]: string } = {
  virement: 'virement bancaire',
  cb: 'carte bancaire',
  cheque: 'chèque',
  especes: 'espèces'
}

function esc(s: any): string {
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

function modeLabel(m?: string): string {
  if (!m) return ''
  return PAIEMENT_MODES[m] || m
}

// Ventilation TVA par taux : items (taux porté par la ligne, remise globale proratisée) + frais à 20 %.
function tvaBreakdown(p: DevisPdfPayload): { rate: number; base: number; tva: number }[] {
  var t = p.totals
  var scale = t.sous_total_items_ht > 0 ? t.items_net_ht / t.sous_total_items_ht : 1
  var byRate: { [k: string]: { rate: number; base: number; tva: number } } = {}
  p.lines.forEach(function (l: LineComputed) {
    var rate = Math.round(tvaToRatio(l.tva_pct) * 1000) / 10
    var k = String(rate)
    if (!byRate[k]) byRate[k] = { rate: rate, base: 0, tva: 0 }
    byRate[k].base += l.total_ligne_ht * scale
    byRate[k].tva += l.tva_ligne * scale
  })
  if (t.frais_ht > 0) {
    var rp = Math.round(TVA_PRESTA_RATIO * 1000) / 10
    var kp = String(rp)
    if (!byRate[kp]) byRate[kp] = { rate: rp, base: 0, tva: 0 }
    byRate[kp].base += t.frais_ht
    byRate[kp].tva += t.tva_frais
  }
  var out = Object.keys(byRate).map(function (k) {
    return { rate: byRate[k].rate, base: round2(byRate[k].base), tva: round2(byRate[k].tva) }
  })
  out.sort(function (a, b) { return a.rate - b.rate })
  return out
}

export function buildFactureHtml(p: DevisPdfPayload, f: FactureInfo, assets?: DevisPdfAssets): string {
  var a = assets || {}
  var map = p.offeringMap || {}
  var t = p.totals
  var ev = p.event
  var nbPers = Number(ev.nbPersonnes) || 0
  var logoSrc = a.logotypeUrl || MESHUGA_LOGO_PINK_DATA_URI

  var ttc = round2(t.total_ttc)
  var acompte = round2(Number(f.acompteMontant) || 0)
  var soldeRecu = !!f.soldeRecu
  var soldeMontant = soldeRecu ? round2(f.soldeMontant != null ? Number(f.soldeMontant) : ttc - acompte) : 0
  var reste = round2(Math.max(0, ttc - acompte - soldeMontant))
  if (soldeRecu) reste = 0

  // ---- Lignes ----
  var rows = ''
  p.lines.forEach(function (l: LineComputed) {
    var off: any = map[l.offering_id]
    var sub = off && off.composition ? off.composition : (off && off.tagline ? off.tagline : '')
    var rate = Math.round(tvaToRatio(l.tva_pct) * 1000) / 10
    rows +=
      '<tr>' +
        '<td><div class="nm">' + esc(l.name) + '</div>' +
          (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') +
          (l.remise_pct > 0 ? '<div class="sub pk">Remise -' + l.remise_pct + '%</div>' : '') +
        '</td>' +
        '<td class="c">' + l.qty + '</td>' +
        '<td class="r">' + fmtEur(l.unit_price_ht) + '</td>' +
        '<td class="c">' + String(rate).replace('.', ',') + ' %</td>' +
        '<td class="r b">' + fmtEur(l.total_ligne_ht) + '</td>' +
      '</tr>'
  })
  var fr = p.frais || {}
  var mep = Number(fr.mise_en_place) || 0
  if (mep > 0) {
    rows += fr.mise_en_place_offert
      ? '<tr><td><span class="st">Mise en place / installation</span> <span class="off">OFFERTE</span></td><td class="c">1</td><td class="r"><span class="st">' + fmtEur(mep) + '</span></td><td class="c">20 %</td><td class="r b off">0,00 €</td></tr>'
      : '<tr><td>Mise en place / installation</td><td class="c">1</td><td class="r">' + fmtEur(mep) + '</td><td class="c">20 %</td><td class="r b">' + fmtEur(mep) + '</td></tr>'
  }
  var liv = Number(fr.livraison) || 0
  if (liv > 0) {
    rows += fr.livraison_offert
      ? '<tr><td><span class="st">Frais de livraison</span> <span class="off">OFFERTS</span></td><td class="c">1</td><td class="r"><span class="st">' + fmtEur(liv) + '</span></td><td class="c">20 %</td><td class="r b off">0,00 €</td></tr>'
      : '<tr><td>Frais de livraison</td><td class="c">1</td><td class="r">' + fmtEur(liv) + '</td><td class="c">20 %</td><td class="r b">' + fmtEur(liv) + '</td></tr>'
  }
  if (t.remise_globale_montant > 0) {
    rows += '<tr class="pk"><td>Remise commerciale (' + t.remise_globale_pct + ' %)</td><td class="c">—</td><td class="r">—</td><td class="c">—</td><td class="r b">−' + fmtEur(t.remise_globale_montant) + '</td></tr>'
  }

  // ---- TVA par taux ----
  var tvaRows = ''
  tvaBreakdown(p).forEach(function (r) {
    tvaRows += '<tr><td>' + String(r.rate).replace('.', ',') + ' %</td><td class="r">' + fmtEur(r.base) + '</td><td class="r">' + fmtEur(r.tva) + '</td></tr>'
  })

  // ---- Règlements ----
  var payRows = ''
  if (acompte > 0) {
    payRows += '<div class="t-row"><span>Acompte versé' +
      (f.acompteDate ? ' le ' + frDate(f.acompteDate) : '') +
      (f.acompteMode ? ' (' + esc(modeLabel(f.acompteMode)) + ')' : '') +
      '</span><strong>−' + fmtEur(acompte) + '</strong></div>'
  }
  if (soldeRecu && soldeMontant > 0) {
    payRows += '<div class="t-row"><span>Solde réglé' +
      (f.soldeDate ? ' le ' + frDate(f.soldeDate) : '') +
      (f.soldeMode ? ' (' + esc(modeLabel(f.soldeMode)) + ')' : '') +
      '</span><strong>−' + fmtEur(soldeMontant) + '</strong></div>'
  }

  var netBlock = soldeRecu
    ? '<div class="t-final paid"><span class="lbl">Net à payer</span><span class="amt">0,00 €</span></div>'
    : '<div class="t-final"><span class="lbl">Reste à payer</span><span class="amt">' + fmtEur(reste) + '</span></div>'

  var stamp = soldeRecu
    ? '<div class="stamp"><div class="stamp-main">Acquittée</div><div class="stamp-sub">' +
        (f.soldeDate ? 'le ' + frDate(f.soldeDate) : '') + '</div></div>'
    : ''

  var condBlock = soldeRecu
    ? '<div class="cond"><div class="cond-title">Règlement</div>' +
        'Facture acquittée : la somme de ' + fmtEur(ttc) + ' TTC a été intégralement réglée' +
        (f.soldeDate ? ' au ' + frDate(f.soldeDate) : '') + '. Aucun montant restant dû.</div>'
    : '<div class="cond"><div class="cond-title">Conditions de règlement</div>' +
        'Solde exigible à réception, par virement sur le compte ci-dessous en rappelant le n° de facture. ' +
        'Pas d&#39;escompte pour paiement anticipé. En cas de retard : pénalités au taux BCE majoré de 10 points ' +
        'et indemnité forfaitaire de recouvrement de 40 € (art. L. 441-10 et D. 441-5 du Code de commerce).</div>'

  var ribBlock = soldeRecu ? '' :
    '<div class="rib"><div class="rib-title">Coordonnées bancaires</div><div class="rib-grid">' +
      '<div><label>Titulaire</label><span>SAS AEGIA FOOD</span></div>' +
      '<div><label>Banque</label><span>Banque Populaire</span></div>' +
      '<div><label>IBAN</label><span>FR76 1020 7000 8723 2175 3218 077</span></div>' +
      '<div><label>BIC</label><span>CCBPFRPPMTG</span></div>' +
    '</div></div>'

  var titleNum = esc(f.numero)
  var docTitle = (soldeRecu ? 'Facture acquittée ' : 'Facture ') + titleNum + ' — MESHUGA'

  return '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">' +
    '<title>' + docTitle + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">' +
    '<style>' + buildFactureCss() + '</style></head><body>' +
    '<div class="page">' +
      '<div class="header">' +
        '<div class="logo"><img src="' + logoSrc + '" alt="meshuga"/><div class="logo-sub">Events &middot; Paris</div></div>' +
        '<div class="doc-info">' +
          '<div class="doc-type">Facture</div>' +
          '<div class="doc-num">N&deg; ' + titleNum + '</div>' +
          (f.date ? '<div class="doc-num">&Eacute;mise le ' + frDate(f.date) + '</div>' : '') +
          (f.devisNumero ? '<div class="doc-num">R&eacute;f. devis ' + esc(f.devisNumero) + '</div>' : '') +
          (ev.date ? '<div class="doc-num">Prestation du ' + frDate(ev.date) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="parties">' +
        '<div class="party">' +
          '<div class="party-label">&Eacute;metteur</div>' +
          '<div class="party-name">SAS AEGIA FOOD</div>' +
          '<div class="pd">Enseigne : MESHUGA</div>' +
          '<div class="pd">3 rue Vavin, 75006 Paris</div>' +
          '<div class="pd">SAS au capital de 1 000 € &middot; RCS Paris 904 639 531</div>' +
          '<div class="pd">SIRET 904 639 531 00014 &middot; TVA FR31904639531</div>' +
          '<div class="pd">events@meshuga.fr</div>' +
        '</div>' +
        '<div class="party client">' +
          '<div class="party-label">Factur&eacute; &agrave;</div>' +
          '<div class="party-name">' + esc(p.client.nom) + '</div>' +
          (f.clientAdresse ? '<div class="pd">' + esc(f.clientAdresse) + '</div>' : '') +
          (p.client.contact ? '<div class="pd">&Agrave; l&#39;attention de ' + esc(p.client.contact) + '</div>' : '') +
          (p.client.email ? '<div class="pd">' + esc(p.client.email) + '</div>' : '') +
          '<div class="ev">' +
            (p.formuleLabel ? 'Formule <strong>' + esc(p.formuleLabel) + '</strong> &middot; ' : '') +
            nbPers + ' pers.' +
            (ev.lieu ? '<br>Lieu de prestation : ' + esc(ev.lieu) : '') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<table class="items"><thead><tr>' +
        '<th>D&eacute;signation</th><th class="c w8">Qt&eacute;</th><th class="r w15">PU HT</th><th class="c w8">TVA</th><th class="r w15">Total HT</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="grid">' +
        '<div>' +
          '<table class="tva"><thead><tr><th>Taux TVA</th><th class="r">Base HT</th><th class="r">Montant TVA</th></tr></thead><tbody>' + tvaRows + '</tbody></table>' +
          condBlock +
          stamp +
        '</div>' +
        '<div class="totals">' +
          '<div class="t-row"><span>Total HT</span><strong>' + fmtEur(t.total_ht) + '</strong></div>' +
          '<div class="t-row gray"><span>Total TVA</span><span>' + fmtEur(t.tva) + '</span></div>' +
          '<div class="t-row big"><span>Total TTC</span><strong>' + fmtEur(ttc) + '</strong></div>' +
          payRows +
          netBlock +
        '</div>' +
      '</div>' +
      ribBlock +
      '<div class="footer">' +
        '<img src="' + logoSrc + '" alt="meshuga" class="flogo"/>' +
        '<div class="legal">SAS AEGIA FOOD (enseigne MESHUGA) &middot; SAS au capital de 1 000 € &middot; RCS Paris 904 639 531 &middot; SIRET 904 639 531 00014 &middot; APE 56.10C &middot; TVA intracommunautaire FR31904639531 &middot; 3 rue Vavin 75006 Paris. TVA 10 % sur les denr&eacute;es alimentaires, 20 % sur les prestations de service (livraison, mise en place, animation).</div>' +
      '</div>' +
    '</div>' +
    '<div class="no-print">' +
      '<p>Pour enregistrer en PDF : <strong>Imprimer</strong> puis <strong>Enregistrer au format PDF</strong>. D&eacute;cochez <em>En-t&ecirc;tes et pieds de page</em>.</p>' +
      '<button onclick="window.print()">📄 Imprimer / Enregistrer PDF</button>' +
      '<button class="close-btn" onclick="window.close()">Fermer</button>' +
    '</div>' +
    '</body></html>'
}

function buildFactureCss(): string {
  return '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;font-size:11px;background:#FFFFFF}' +
    '@page{size:A4;margin:10mm 16mm 14mm 16mm}' +
    '@media print{html{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none !important}.page{padding:0;width:auto;min-height:auto}table.items tr,.grid,.rib,.footer,.parties{page-break-inside:avoid;break-inside:avoid}}' +
    '.page{width:210mm;min-height:297mm;padding:14mm 16mm 10mm;background:#FFFFFF;position:relative}' +
    '.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:11px;border-bottom:3px solid #FF82D7;margin-bottom:14px}' +
    '.logo img{height:42px;width:auto;display:block}' +
    '.logo-sub{font-size:8.5px;color:#FF82D7;letter-spacing:1.6px;text-transform:uppercase;font-weight:900;margin-top:4px}' +
    '.doc-info{text-align:right}' +
    '.doc-type{font-family:Yellowtail,cursive;font-size:42px;line-height:.95}' +
    '.doc-num{font-size:10px;color:#666;margin-top:3px;font-weight:700}' +
    '.stamp{display:inline-block;margin:16px 0 0 24px;transform:rotate(-8deg);border:4px solid #FF82D7;color:#FF82D7;border-radius:10px;padding:6px 18px;text-align:center;background:rgba(255,255,255,.85);z-index:2}' +
    '.stamp-main{font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:3px;line-height:1}' +
    '.stamp-sub{font-size:11px;font-weight:900;letter-spacing:1px;margin-top:3px}' +
    '.parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}' +
    '.party{background:#FAFAFA;border-radius:5px;padding:9px 12px;border-left:4px solid #FFEB5A}' +
    '.party.client{border-left-color:#FF82D7}' +
    '.party-label{font-family:Yellowtail,cursive;font-size:14px;color:#888;margin-bottom:4px;line-height:1}' +
    '.party-name{font-size:13px;font-weight:900;margin-bottom:3px}' +
    '.pd{font-size:9.5px;color:#555;line-height:1.5}' +
    '.ev{margin-top:6px;font-size:10px;line-height:1.5}' +
    'table.items{width:100%;border-collapse:collapse;margin-bottom:12px}' +
    'table.items th{padding:8px 10px;font-size:8.5px;text-transform:uppercase;letter-spacing:1.2px;font-weight:900;border-top:2px solid #191923;border-bottom:2px solid #191923;text-align:left}' +
    'table.items td{padding:7px 10px;border-bottom:1px solid #EBEBEB;font-size:10.5px;vertical-align:top}' +
    'table.items tbody tr:nth-child(even) td{background:#FAFAFA}' +
    '.w8{width:8%}.w15{width:15%}' +
    '.nm{font-weight:900;font-size:11px}' +
    '.sub{font-size:9px;color:#666;line-height:1.4;margin-top:2px}' +
    '.pk,.pk td{color:#FF82D7}' +
    '.c{text-align:center !important}.r{text-align:right !important}.b{font-weight:900}' +
    '.st{text-decoration:line-through;opacity:.5}.off{color:#009D3A;font-weight:900}' +
    '.grid{display:grid;grid-template-columns:1fr 300px;gap:16px;align-items:start;margin-bottom:12px}' +
    'table.tva{width:100%;border-collapse:collapse;margin-bottom:10px}' +
    'table.tva th{font-size:8px;text-transform:uppercase;letter-spacing:1px;font-weight:900;padding:5px 8px;border-bottom:1.5px solid #191923;text-align:left}' +
    'table.tva td{font-size:10px;padding:5px 8px;border-bottom:1px solid #EBEBEB}' +
    '.cond{background:#FAFAFA;border-left:4px solid #FF82D7;border-radius:0 4px 4px 0;padding:9px 12px;font-size:9.5px;color:#444;line-height:1.55}' +
    '.cond-title{font-family:Yellowtail,cursive;font-size:16px;color:#191923;margin-bottom:3px;line-height:1}' +
    '.t-row{display:flex;justify-content:space-between;gap:10px;padding:5px 4px;border-bottom:1px solid #EBEBEB;font-size:11px}' +
    '.t-row.gray{color:#888;font-size:10px}' +
    '.t-row.big{font-size:12.5px}' +
    '.t-row strong{font-weight:900;white-space:nowrap}' +
    '.t-final{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:#FFEB5A;border:2px solid #191923;border-radius:5px;margin-top:8px;box-shadow:3px 3px 0 #191923}' +
    '.t-final.paid{background:#FF82D7}' +
    '.t-final .lbl{font-family:Yellowtail,cursive;font-size:22px;line-height:1}' +
    '.t-final .amt{font-weight:900;font-size:16px}' +
    '.rib{border:1.5px solid #191923;border-radius:5px;padding:9px 14px;margin-bottom:10px}' +
    '.rib-title{font-family:Yellowtail,cursive;font-size:16px;color:#FF82D7;margin-bottom:6px;line-height:1}' +
    '.rib-grid{display:grid;grid-template-columns:1fr 1fr 2fr 1fr;gap:12px}' +
    '.rib-grid label{display:block;font-size:7px;text-transform:uppercase;letter-spacing:1px;color:#aaa;margin-bottom:3px;font-weight:900}' +
    '.rib-grid span{font-size:10.5px;font-weight:900;letter-spacing:1.2px}' +
    '.footer{border-top:1px solid #EBEBEB;margin-top:18px;padding-top:10px;display:flex;gap:14px;align-items:center}' +
    '.flogo{height:30px;width:auto}' +
    '.legal{font-size:7px;color:#777;line-height:1.7;text-align:justify}' +
    '.no-print{text-align:center;padding:24px 16px;border-top:2px dashed #FF82D7;margin-top:16px}' +
    '.no-print p{margin-bottom:14px;font-size:11px;color:#666;line-height:1.6}' +
    '.no-print button{padding:11px 28px;background:#FFEB5A;color:#191923;border:2px solid #191923;border-radius:5px;font-size:13px;font-weight:900;cursor:pointer;text-transform:uppercase;box-shadow:3px 3px 0 #191923;margin:0 4px}' +
    '.no-print button.close-btn{background:#FFFFFF}'
}
