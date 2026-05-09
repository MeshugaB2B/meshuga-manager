// src/app/api/hr/personnel-register/route.ts
// Génère le registre du personnel au format HTML imprimable.
// Article L.1221-13 du Code du travail : tenue obligatoire d'un registre
// unique du personnel sur lequel sont inscrits, dans l'ordre des embauches,
// les nom et prénoms de tous les salariés.
//
// On utilise la vue hr_personnel_register déjà créée en migration v1.
// Charte graphique cohérente avec les autres documents Meshuga (HACCP, contrats) :
// Yellowtail pour titres, Arial Narrow pour corps, palette rose/jaune/noir.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export var runtime = 'nodejs'

// Libellés FR pour les motifs de sortie
var MOTIFS_LABELS: any = {
  demission: 'Démission',
  licenciement: 'Licenciement',
  rupture_conv: 'Rupture conventionnelle',
  fin_cdd: 'Fin de CDD',
  rupture_periode_essai: 'Rupture période d\'essai',
  abandon_poste: 'Abandon de poste',
  retraite: 'Départ retraite',
  deces: 'Décès',
  autre: 'Autre',
}

// Libellés FR pour les types de contrat
var TYPES_LABELS: any = {
  extra: 'CDD d\'usage',
  cdi_cuisinier: 'CDI Cuisinier',
  cdi_caissier: 'CDI Caissier',
  cdi_cadre: 'CDI Cadre',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    var d = new Date(iso + 'T00:00:00')
    var dd = String(d.getDate()).padStart(2, '0')
    var mm = String(d.getMonth() + 1).padStart(2, '0')
    var yyyy = d.getFullYear()
    return dd + '/' + mm + '/' + yyyy
  } catch (e) {
    return iso
  }
}

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildRegisterHtml(rows: any[]): string {
  var todayFr = fmtDate(new Date().toISOString().slice(0, 10))
  var nbActifs = rows.filter(function (r: any) { return r.statut_actuel === 'actif' }).length
  var nbAnciens = rows.filter(function (r: any) { return r.statut_actuel !== 'actif' }).length

  var rowsHtml = rows.map(function (r: any, idx: number) {
    var isParti = r.statut_actuel !== 'actif'
    var typeLib = r.contract_type ? (TYPES_LABELS[r.contract_type] || r.contract_type) : '—'
    var motifLib = r.motif_sortie ? (MOTIFS_LABELS[r.motif_sortie] || r.motif_sortie) : ''
    var classification = ''
    if (r.niveau_ccn || r.echelon_ccn) {
      classification = 'Niv. ' + (r.niveau_ccn || '?') + (r.echelon_ccn ? ' Éch. ' + r.echelon_ccn : '')
    }

    return `
      <tr class="${isParti ? 'parti' : 'actif'}">
        <td class="num">${r.ordre_embauche}</td>
        <td class="nom">
          <strong>${escapeHtml((r.nom || '').toUpperCase())}</strong> ${escapeHtml(r.prenom || '')}
          <div class="civ">${escapeHtml(r.civilite || '')}</div>
        </td>
        <td class="naissance">
          ${fmtDate(r.date_naissance)}
          ${r.lieu_naissance ? '<div class="lieu">' + escapeHtml(r.lieu_naissance) + '</div>' : ''}
        </td>
        <td class="nat">${escapeHtml(r.nationalite || '—')}</td>
        <td class="fonction">
          ${escapeHtml(r.fonction || '—')}
          ${classification ? '<div class="ccn">' + classification + '</div>' : ''}
        </td>
        <td class="type">${typeLib}</td>
        <td class="entree">${fmtDate(r.date_entree)}</td>
        <td class="sortie">
          ${r.date_sortie ? fmtDate(r.date_sortie) : '<span class="en-poste">En poste</span>'}
          ${motifLib ? '<div class="motif">' + escapeHtml(motifLib) + '</div>' : ''}
        </td>
      </tr>
    `
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Registre du personnel — Meshuga</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">
<style>
  /*
    CRITICAL : forcer le navigateur à imprimer les fonds de couleur.
    Sans ces directives, Chrome/Safari/Firefox enlèvent automatiquement
    les couleurs de fond pour économiser l'encre lors de l'impression.
    Les 3 propriétés ci-dessous couvrent tous les navigateurs modernes
    (standard W3C + préfixes vendeurs anciens encore actifs).
  */
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    -moz-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  @page { size: A4 landscape; margin: 12mm 10mm 12mm 10mm; }

  html, body {
    margin: 0; padding: 0;
    font-family: 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
    color: #191923;
    background: #FFFFFF;
    font-size: 10pt;
    line-height: 1.3;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body { padding: 0; }

  /* HEADER (s'imprime sur la 1ère page seulement) */
  .header {
    border-bottom: 3px solid #191923;
    padding-bottom: 8mm;
    margin-bottom: 6mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10mm;
  }
  .header-left { flex: 1; }
  .title-yellow {
    background: #FFEB5A;
    border: 2.5px solid #191923;
    box-shadow: 4px 4px 0 #191923;
    padding: 6mm 8mm;
    display: inline-block;
  }
  .title-yellow .yellowtail {
    font-family: 'Yellowtail', cursive;
    font-size: 32pt;
    color: #FF82D7;
    line-height: 1;
    -webkit-text-stroke: 0.5px #191923;
  }
  .title-yellow .sub {
    font-family: 'Arial Narrow', Arial, sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 11pt;
    letter-spacing: 1.5px;
    margin-top: 2mm;
  }
  .header-right {
    text-align: right;
    font-size: 9pt;
  }
  .header-right .label {
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 8pt;
    color: #FF82D7;
  }
  .header-right .value {
    font-weight: 700;
    margin-bottom: 2mm;
  }
  .legal-note {
    background: #FFF8E1;
    border-left: 3px solid #FF82D7;
    padding: 3mm 4mm;
    font-size: 8.5pt;
    line-height: 1.4;
    margin-bottom: 5mm;
  }
  .legal-note strong { font-weight: 900; }

  /* KPI bar */
  .kpis {
    display: flex;
    gap: 4mm;
    margin-bottom: 5mm;
  }
  .kpi {
    background: #FFFFFF;
    border: 2px solid #191923;
    box-shadow: 3px 3px 0 #191923;
    padding: 3mm 5mm;
    flex: 1;
  }
  .kpi-label {
    font-size: 8pt;
    text-transform: uppercase;
    font-weight: 900;
    letter-spacing: 1px;
    color: #FF82D7;
  }
  .kpi-value {
    font-family: 'Arial Narrow', Arial, sans-serif;
    font-weight: 900;
    font-size: 22pt;
    line-height: 1;
    margin-top: 1mm;
  }
  .kpi.actif { background: #FFEB5A; }
  .kpi.parti { background: #FAFAFA; }

  /* TABLE */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  thead th {
    background: #191923;
    color: #FFEB5A;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 8pt;
    padding: 3mm 2mm;
    text-align: left;
    border: 1px solid #191923;
  }
  tbody td {
    padding: 2.5mm 2mm;
    border: 1px solid #191923;
    vertical-align: top;
  }
  tbody tr.actif td {
    background: #FFFFFF;
  }
  tbody tr.parti td {
    background: #FAFAFA;
    color: #555555;
  }
  tbody tr:nth-child(even) td {
    background: #FFFEF5;
  }
  tbody tr.parti:nth-child(even) td {
    background: #F5F5F5;
  }
  td.num {
    text-align: center;
    font-weight: 900;
    background: #FF82D7 !important;
    color: #191923;
    width: 8mm;
    font-size: 11pt;
  }
  tbody tr.parti td.num {
    background: #BBBBBB !important;
    color: #FFFFFF;
  }
  td.nom strong { font-size: 10pt; font-weight: 900; }
  td .civ {
    font-size: 7.5pt;
    color: #777;
    margin-top: 0.5mm;
    font-style: italic;
  }
  td .lieu, td .ccn, td .motif {
    font-size: 7.5pt;
    color: #777;
    margin-top: 0.5mm;
  }
  td .en-poste {
    background: #FFEB5A;
    border: 1px solid #191923;
    padding: 0.5mm 2mm;
    font-weight: 900;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* FOOTER signature */
  .footer {
    margin-top: 10mm;
    padding-top: 5mm;
    border-top: 2px solid #191923;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    font-size: 8.5pt;
  }
  .footer-left { flex: 1; }
  .signature-box {
    width: 70mm;
    border: 2px solid #191923;
    box-shadow: 3px 3px 0 #191923;
    padding: 3mm;
    background: #FFFFFF;
  }
  .signature-box .sig-label {
    font-size: 7pt;
    text-transform: uppercase;
    font-weight: 900;
    letter-spacing: 1px;
    color: #FF82D7;
  }
  .signature-box .sig-name {
    font-weight: 900;
    margin-top: 1mm;
  }
  .signature-box .sig-zone {
    height: 18mm;
    margin-top: 2mm;
    border-top: 1px dashed #BBB;
  }

  /* PRINT - Forcer rendu fidèle des couleurs sur toutes les classes critiques */
  @media print {
    /* Re-force pour les éléments qui ont des fonds colorés spécifiques */
    body, .title-yellow, .legal-note, .kpi, .kpi.actif, .kpi.parti,
    thead th, tbody td, td.num, td .en-poste, .signature-box {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body { background: #FFFFFF !important; }
    .no-print { display: none !important; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    .header { page-break-after: avoid; }
    .footer { page-break-before: avoid; }
    /* Bannière de tip n'apparaît PAS à l'impression */
    .print-tip { display: none !important; }
  }
  @media screen {
    body { padding: 8mm; max-width: 297mm; margin: 0 auto; }
  }

  /* Bannière de conseil d'impression (visible à l'écran seulement) */
  .print-tip {
    background: #FFEB5A;
    border: 2.5px solid #191923;
    box-shadow: 4px 4px 0 #191923;
    padding: 4mm 6mm;
    margin-bottom: 6mm;
    font-size: 10pt;
    line-height: 1.4;
  }
  .print-tip strong { font-weight: 900; }
  .print-tip code {
    background: #FFFFFF;
    padding: 1px 6px;
    border: 1.5px solid #191923;
    border-radius: 3px;
    font-family: 'Arial Narrow', monospace;
    font-weight: 900;
  }
  .print-button {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #FF82D7;
    color: #191923;
    border: 2.5px solid #191923;
    box-shadow: 4px 4px 0 #191923;
    padding: 10px 20px;
    font-family: 'Arial Narrow', Arial, sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 11pt;
    cursor: pointer;
    z-index: 100;
  }
  .print-button:hover {
    background: #FFEB5A;
  }
</style>
</head>
<body>

<button class="no-print print-button" onclick="window.print()">↓ Imprimer / PDF</button>

<div class="print-tip no-print">
  <strong>💡 Pour imprimer en couleurs (charte Meshuga) :</strong>
  dans la fenêtre d'impression, déroule <strong>Plus de paramètres</strong> et coche
  <code>Graphismes d'arrière-plan</code> (Chrome / Edge) ou <code>Imprimer les arrière-plans</code> (Safari / Firefox).
  Sans cette option, ton navigateur enlève les fonds rose et jaune pour économiser l'encre.
</div>

<div class="header">
  <div class="header-left">
    <div class="title-yellow">
      <div class="yellowtail">Registre du personnel</div>
      <div class="sub">SAS Aegia Food — Meshuga Crazy Deli</div>
    </div>
  </div>
  <div class="header-right">
    <div class="label">Établissement</div>
    <div class="value">3 rue Vavin, 75006 Paris</div>
    <div class="label">SIRET</div>
    <div class="value">904 639 531 00014</div>
    <div class="label">CCN</div>
    <div class="value">Restauration Rapide<br/>IDCC 1501</div>
    <div class="label">Édité le</div>
    <div class="value">${todayFr}</div>
  </div>
</div>

<div class="legal-note">
  <strong>Article L.1221-13 du Code du travail.</strong> Tout employeur doit tenir un registre unique du personnel
  où sont inscrits, dans l'ordre des embauches, les noms et prénoms de tous les salariés. Les mentions
  obligatoires sont conservées pendant 5 ans à compter du départ du salarié (Art. R.1221-26).
</div>

<div class="kpis">
  <div class="kpi actif">
    <div class="kpi-label">En poste</div>
    <div class="kpi-value">${nbActifs}</div>
  </div>
  <div class="kpi parti">
    <div class="kpi-label">Anciens (5 ans)</div>
    <div class="kpi-value">${nbAnciens}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Total inscrits</div>
    <div class="kpi-value">${rows.length}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:8mm;">N°</th>
      <th style="width:42mm;">Nom &amp; prénom</th>
      <th style="width:32mm;">Date / lieu de naissance</th>
      <th style="width:25mm;">Nationalité</th>
      <th style="width:42mm;">Fonction / Classification</th>
      <th style="width:25mm;">Type contrat</th>
      <th style="width:22mm;">Date d'entrée</th>
      <th style="width:35mm;">Date de sortie / Motif</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:10mm;color:#999;">Aucun salarié enregistré.</td></tr>'}
  </tbody>
</table>

<div class="footer">
  <div class="footer-left">
    <div style="font-size:7.5pt;color:#777;">
      Document généré automatiquement par Meshuga B2B Manager · ${todayFr}<br/>
      Ce registre fait foi pour la déclaration L.1221-13 et tient lieu de récapitulatif consultable
      par l'inspection du travail.
    </div>
  </div>
  <div class="signature-box">
    <div class="sig-label">Cachet &amp; signature de l'employeur</div>
    <div class="sig-name">Edward Touret · Président SASU AEGIA FOOD</div>
    <div class="sig-zone"></div>
  </div>
</div>

</body>
</html>`
}

export async function GET(req: Request) {
  try {
    var admin = createAdminClient()
    var { data: rows, error } = await admin
      .from('hr_personnel_register')
      .select('*')
      .order('ordre_embauche', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    var html = buildRegisterHtml(rows || [])

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('GET /api/hr/personnel-register error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
