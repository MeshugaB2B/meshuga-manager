// src/app/api/hr/update-amendment/route.ts
// Génère un avenant de mise à jour pour aligner un contrat existant sur les
// dernières normes (clauses modernes : HACCP, RGPD, droit déconnexion, etc.)
// Utilise la lib partagée src/lib/hr/clauses-library.ts.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { renderClauses, getCatalog } from '@/lib/hr/clauses-library'

export var runtime = 'nodejs'

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fmtDateFr(iso: any): string {
  if (!iso) return '—'
  try {
    var s = String(iso).slice(0, 10)
    var p = s.split('-')
    if (p.length !== 3) return s
    return p[2] + '/' + p[1] + '/' + p[0]
  } catch (e) { return String(iso) }
}

function buildHtml(data: any): string {
  var emp = data.employee || {}
  var ctr = data.contract || {}
  var clauseIds: string[] = data.clauses || []
  var dateEffet = fmtDateFr(data.date_effet || new Date().toISOString().slice(0, 10))
  var villeSig = data.ville_signature || 'Paris'
  var dateSig = fmtDateFr(data.date_signature || new Date().toISOString().slice(0, 10))
  var fullName = (emp.civilite || '') + ' ' + (emp.prenom || '') + ' ' + ((emp.nom || '').toUpperCase())
  var fullAddress = (emp.adresse ? emp.adresse + ', ' : '') + (emp.code_postal || '') + ' ' + (emp.ville || '')
  var contratLabel = data.contract_label || 'contrat de travail'
  var contratDate = ctr.date_debut ? fmtDateFr(ctr.date_debut) : (ctr.created_at ? fmtDateFr(ctr.created_at) : '—')

  // Génération des clauses via la lib partagée (numérotées à partir de 1)
  var rendered = renderClauses(clauseIds, 1)
  var clausesHtml = rendered.html
  var nextIdx = rendered.nextIdx

  if (!clausesHtml) {
    clausesHtml = '<p style="font-style:italic;color:#777;">Aucune clause sélectionnée.</p>'
    nextIdx = 1
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Avenant — ${escapeHtml(fullName)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">
<style>
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    -moz-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  @page { size: A4 portrait; margin: 18mm 16mm 18mm 16mm; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif;
    color: #191923;
    background: #FFFFFF;
    font-size: 11pt;
    line-height: 1.5;
  }
  @media screen { body { padding: 12mm; max-width: 210mm; margin: 0 auto; } }

  .header {
    border-bottom: 3px solid #191923;
    padding-bottom: 6mm;
    margin-bottom: 8mm;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8mm;
  }
  .title-yellow {
    background: #FFEB5A;
    border: 2.5px solid #191923;
    box-shadow: 4px 4px 0 #191923;
    padding: 5mm 7mm;
    flex: 1;
  }
  .title-yellow .yellowtail { font-family: 'Yellowtail', cursive; font-size: 28pt; color: #FF82D7; line-height: 1; }
  .title-yellow .sub { font-weight: 900; text-transform: uppercase; font-size: 10pt; letter-spacing: 1.5px; margin-top: 2mm; }
  .header-right { text-align: right; font-size: 8.5pt; }
  .header-right .label { font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #FF82D7; }

  .preamble {
    background: #FFF8E1;
    border: 2.5px solid #FF82D7;
    box-shadow: 4px 4px 0 #FF82D7;
    padding: 5mm 6mm;
    margin-bottom: 8mm;
    font-size: 10pt;
    line-height: 1.5;
  }
  .preamble .yt { font-family: 'Yellowtail', cursive; font-size: 16pt; color: #FF82D7; line-height: 1; margin-bottom: 3mm; }

  h2 {
    font-family: 'Arial Narrow', Arial, sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 11pt;
    color: #191923;
    background: #FFEB5A;
    padding: 2mm 4mm;
    margin: 6mm 0 3mm 0;
    border: 1.5px solid #191923;
    border-left: 5px solid #FF82D7;
    page-break-after: avoid;
  }

  p { margin: 2mm 0; }
  ul { margin: 2mm 0; padding-left: 6mm; }
  ul li { margin: 1mm 0; }

  .parties { display: flex; gap: 6mm; margin: 4mm 0 8mm; }
  .partie {
    flex: 1;
    background: #FFFFFF;
    border: 2px solid #191923;
    box-shadow: 3px 3px 0 #191923;
    padding: 4mm;
    font-size: 10pt;
  }
  .partie .ptitre {
    background: #FF82D7;
    color: #191923;
    font-weight: 900;
    text-transform: uppercase;
    font-size: 9pt;
    letter-spacing: 1px;
    padding: 1.5mm 3mm;
    margin: -4mm -4mm 3mm -4mm;
    border-bottom: 2px solid #191923;
  }

  .signatures { display: flex; gap: 8mm; margin-top: 12mm; page-break-inside: avoid; }
  .sig-box {
    flex: 1;
    border: 2px solid #191923;
    box-shadow: 3px 3px 0 #191923;
    padding: 4mm;
    background: #FFFFFF;
  }
  .sig-box .sig-label { font-size: 8pt; text-transform: uppercase; font-weight: 900; letter-spacing: 1px; color: #FF82D7; }
  .sig-box .sig-name { font-weight: 900; margin-top: 1mm; font-size: 10pt; }
  .sig-box .sig-zone { height: 28mm; margin-top: 3mm; border-top: 1px dashed #BBB; }
  .sig-mention { font-size: 8.5pt; color: #555; margin-top: 2mm; font-style: italic; }
  .small { font-size: 8.5pt; color: #555; }

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
  .print-button:hover { background: #FFEB5A; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>

<button class="no-print print-button" onclick="window.print()">↓ Imprimer / PDF</button>

<div class="header">
  <div class="title-yellow">
    <div class="yellowtail">Avenant au contrat</div>
    <div class="sub">Mise à jour des clauses contractuelles</div>
  </div>
  <div class="header-right">
    <div class="label">Établissement</div>
    <div>SAS Aegia Food</div>
    <div>Meshuga Crazy Deli</div>
    <div>3 rue Vavin, 75006 Paris</div>
    <div class="label" style="margin-top:2mm;">SIRET</div>
    <div>904 639 531 00014</div>
    <div class="label" style="margin-top:2mm;">CCN</div>
    <div>Restauration Rapide<br/>IDCC 1501</div>
  </div>
</div>

<div class="preamble">
  <div class="yt">Préambule</div>
  <p>
    Le présent avenant a pour objet de <strong>compléter et mettre à jour</strong> les clauses
    du ${escapeHtml(contratLabel)} conclu entre les parties (date d'effet : <strong>${contratDate}</strong>),
    afin de l'aligner sur les obligations légales et conventionnelles en vigueur ainsi que sur les
    procédures internes actuelles de l'établissement.
  </p>
  <p>
    Les clauses du contrat initial non expressément modifiées par le présent avenant <strong>restent
    pleinement applicables</strong>. L'<strong>ancienneté du salarié et l'ensemble de ses droits
    acquis</strong> (notamment les congés payés et la prime d'ancienneté le cas échéant) sont
    intégralement conservés.
  </p>
  <p>
    Le présent avenant prend effet le <strong>${dateEffet}</strong>.
  </p>
</div>

<h2>Article préliminaire — Parties</h2>

<div class="parties">
  <div class="partie">
    <div class="ptitre">L'Employeur</div>
    <strong>SASU AEGIA FOOD</strong><br/>
    Représentée par M. Edward TOURET, Président<br/>
    Siège social : 3 rue Vavin, 75006 Paris<br/>
    SIRET : 904 639 531 00014<br/>
    CCN : Restauration Rapide (IDCC 1501)
  </div>
  <div class="partie">
    <div class="ptitre">Le Salarié</div>
    <strong>${escapeHtml(fullName)}</strong><br/>
    ${emp.date_naissance ? 'Né(e) le ' + fmtDateFr(emp.date_naissance) + (emp.lieu_naissance ? ' à ' + escapeHtml(emp.lieu_naissance) : '') + '<br/>' : ''}
    ${fullAddress.trim() ? 'Demeurant : ' + escapeHtml(fullAddress.trim()) + '<br/>' : ''}
    ${emp.num_secu ? 'N° de Sécurité sociale : ' + escapeHtml(emp.num_secu) + '<br/>' : ''}
    Employé(e) en qualité de ${escapeHtml(ctr.fonction || '—')}
  </div>
</div>

${clausesHtml}

<h2>Article ${nextIdx} — Dispositions finales</h2>
<p>
  Le présent avenant fait partie intégrante du contrat de travail conclu entre les parties.
  Les autres clauses du contrat initial demeurent inchangées et continuent de produire tous leurs effets.
</p>
<p>
  Le présent avenant est établi en deux exemplaires originaux, dont un est remis à chaque partie.
</p>

<div class="signatures">
  <div class="sig-box">
    <div class="sig-label">L'Employeur</div>
    <div class="sig-name">M. Edward TOURET</div>
    <div class="small">Président SASU AEGIA FOOD</div>
    <div class="sig-zone"></div>
    <div class="sig-mention">Cachet de l'entreprise + signature</div>
  </div>
  <div class="sig-box">
    <div class="sig-label">Le Salarié</div>
    <div class="sig-name">${escapeHtml(fullName)}</div>
    <div class="sig-zone"></div>
    <div class="sig-mention">Précédé de la mention manuscrite « Lu et approuvé, bon pour accord »</div>
  </div>
</div>

<p style="margin-top: 8mm; text-align: center; font-size: 9pt; color: #555;">
  Fait à <strong>${escapeHtml(villeSig)}</strong>, le <strong>${dateSig}</strong>, en deux exemplaires originaux.
</p>

</body>
</html>`
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    if (!body.employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    if (!body.contract_id) return NextResponse.json({ error: 'contract_id requis' }, { status: 400 })

    var admin = createAdminClient()
    var resE = await admin.from('hr_employees').select('*').eq('id', body.employee_id).single()
    if (resE.error || !resE.data) {
      return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })
    }
    var resC = await admin.from('hr_contracts').select('*').eq('id', body.contract_id).single()
    if (resC.error || !resC.data) {
      return NextResponse.json({ error: 'contrat introuvable' }, { status: 404 })
    }

    var html = buildHtml({
      employee: resE.data,
      contract: resC.data,
      contract_label: body.contract_label,
      clauses: body.clauses || [],
      date_effet: body.date_effet,
      ville_signature: body.ville_signature,
      date_signature: body.date_signature,
    })

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/update-amendment error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ clauses: getCatalog() })
}
