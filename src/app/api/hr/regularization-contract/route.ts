// src/app/api/hr/regularization-contract/route.ts
// Génère le HTML imprimable du contrat de régularisation (CDI formalisant
// une relation existante non écrite). Charte Meshuga respectée.
//
// POST { employee_id, date_embauche, fonction, salaire_brut_mensuel, ... }
// → renvoie HTML qui s'imprime/sauvegarde en PDF via window.print()

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export var runtime = 'nodejs'

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtDateFr(iso: any): string {
  if (!iso) return '—'
  try {
    var s = String(iso).slice(0, 10)
    var p = s.split('-')
    if (p.length !== 3) return s
    return p[2] + '/' + p[1] + '/' + p[0]
  } catch (e) {
    return String(iso)
  }
}

// Normalise une date en ISO yyyy-mm-dd. Corrige les inversions jour/mois
// faites par l'IA (ex: "1952-19-05" → "1952-05-19"). Fallback safe.
function normalizeDateIso(v: any): string | null {
  if (!v) return null
  var s = String(v).trim()
  if (!s) return null
  var isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    var year = parseInt(isoMatch[1], 10)
    var p2 = parseInt(isoMatch[2], 10)
    var p3 = parseInt(isoMatch[3], 10)
    var month: number, day: number
    if (p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) { month = p2; day = p3 }
    else if (p2 > 12 && p2 <= 31 && p3 >= 1 && p3 <= 12) { month = p3; day = p2 }
    else return null
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0')
  }
  return null
}

function fmtCcyFr(n: any): string {
  if (n === null || n === undefined || n === '') return '—'
  var num = parseFloat(String(n).replace(',', '.'))
  if (isNaN(num)) return '—'
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildHtml(data: any): string {
  var todayFr = fmtDateFr(new Date().toISOString().slice(0, 10))
  var emp = data.employee || {}
  var ctr = data.contract || {}
  var dateEmbaucheFr = fmtDateFr(data.date_embauche)
  var villeSig = data.ville_signature || 'Paris'
  var dateSig = fmtDateFr(data.date_signature || new Date().toISOString().slice(0, 10))
  var fullName = (emp.civilite || '') + ' ' + (emp.prenom || '') + ' ' + ((emp.nom || '').toUpperCase())
  var fullAddress = (emp.adresse ? emp.adresse + ', ' : '') + (emp.code_postal || '') + ' ' + (emp.ville || '')

  var heuresMensuelles = ctr.heures_mensuelles || 151.67
  var heuresHebdo = ctr.heures_hebdo || 35
  var salaireMensuel = fmtCcyFr(ctr.salaire_brut_mensuel)
  var statutLabel = ctr.statut_cadre === 'cadre' ? 'Cadre'
    : (ctr.statut_cadre === 'agent_maitrise' ? 'Agent de maîtrise' : 'Non-cadre')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Contrat de régularisation — ${escapeHtml(fullName)}</title>
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
  @media screen {
    body { padding: 12mm; max-width: 210mm; margin: 0 auto; }
  }

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
  .title-yellow .yellowtail {
    font-family: 'Yellowtail', cursive;
    font-size: 28pt;
    color: #FF82D7;
    line-height: 1;
  }
  .title-yellow .sub {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 10pt;
    letter-spacing: 1.5px;
    margin-top: 2mm;
  }
  .header-right {
    text-align: right;
    font-size: 8.5pt;
  }
  .header-right .label { font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #FF82D7; }

  /* ENCART RÉGULARISATION en haut — visible immédiatement */
  .reg-banner {
    background: #FFF8E1;
    border: 2.5px solid #FF82D7;
    box-shadow: 4px 4px 0 #FF82D7;
    padding: 5mm 6mm;
    margin-bottom: 8mm;
    font-size: 10pt;
    line-height: 1.5;
  }
  .reg-banner .reg-title {
    font-family: 'Yellowtail', cursive;
    font-size: 16pt;
    color: #FF82D7;
    line-height: 1;
    margin-bottom: 3mm;
  }
  .reg-banner strong { font-weight: 900; }

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
  }

  p { margin: 2mm 0; }

  .parties {
    display: flex;
    gap: 6mm;
    margin: 4mm 0 8mm;
  }
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

  table.conditions {
    width: 100%;
    border-collapse: collapse;
    margin: 3mm 0 5mm;
  }
  table.conditions th, table.conditions td {
    border: 1px solid #191923;
    padding: 2.5mm 3mm;
    font-size: 10pt;
    text-align: left;
    vertical-align: top;
  }
  table.conditions th {
    background: #191923;
    color: #FFEB5A;
    text-transform: uppercase;
    font-weight: 900;
    letter-spacing: 0.5px;
    font-size: 9pt;
    width: 38%;
  }
  table.conditions td {
    background: #FFFFFF;
  }

  .signatures {
    display: flex;
    gap: 8mm;
    margin-top: 12mm;
    page-break-inside: avoid;
  }
  .sig-box {
    flex: 1;
    border: 2px solid #191923;
    box-shadow: 3px 3px 0 #191923;
    padding: 4mm;
    background: #FFFFFF;
  }
  .sig-box .sig-label {
    font-size: 8pt;
    text-transform: uppercase;
    font-weight: 900;
    letter-spacing: 1px;
    color: #FF82D7;
  }
  .sig-box .sig-name { font-weight: 900; margin-top: 1mm; font-size: 10pt; }
  .sig-box .sig-zone {
    height: 28mm;
    margin-top: 3mm;
    border-top: 1px dashed #BBB;
  }
  .sig-mention {
    font-size: 8.5pt;
    color: #555;
    margin-top: 2mm;
    font-style: italic;
  }

  .small {
    font-size: 8.5pt;
    color: #555;
  }

  ul { margin: 2mm 0; padding-left: 6mm; }
  ul li { margin: 1mm 0; }

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
    <div class="yellowtail">Contrat de régularisation</div>
    <div class="sub">Contrat de travail à durée indéterminée — formalisation</div>
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

<div class="reg-banner">
  <div class="reg-title">📌 Objet du présent contrat</div>
  <p>
    Les parties signataires constatent qu'une <strong>relation de travail à durée indéterminée existe</strong>
    entre elles depuis le <strong>${dateEmbaucheFr}</strong>, sans avoir fait l'objet jusqu'à ce jour
    d'une formalisation par écrit. Le présent contrat a pour seul objet de <strong>formaliser par écrit</strong>
    cette relation préexistante, conformément à l'article L.1221-1 du Code du travail.
  </p>
  <p>
    L'<strong>ancienneté</strong> du salarié est expressément reconnue et conservée à compter du <strong>${dateEmbaucheFr}</strong>,
    date d'entrée effective dans l'entreprise. Le présent écrit ne crée pas de nouvelle relation contractuelle
    et ne saurait remettre en cause les droits acquis du salarié à cette date.
  </p>
</div>

<h2>Article 1 — Parties au contrat</h2>

<div class="parties">
  <div class="partie">
    <div class="ptitre">L'Employeur</div>
    <strong>SASU AEGIA FOOD</strong><br/>
    Représentée par M. Edward TOURET, en qualité de Président<br/>
    Siège social : 3 rue Vavin, 75006 Paris<br/>
    SIRET : 904 639 531 00014<br/>
    APE : 56.10C<br/>
    Convention collective applicable : Restauration Rapide (IDCC 1501)
  </div>
  <div class="partie">
    <div class="ptitre">Le Salarié</div>
    <strong>${escapeHtml(fullName)}</strong><br/>
    ${emp.date_naissance ? 'Né(e) le ' + fmtDateFr(emp.date_naissance) + (emp.lieu_naissance ? ' à ' + escapeHtml(emp.lieu_naissance) : '') + '<br/>' : ''}
    ${emp.nationalite ? 'Nationalité : ' + escapeHtml(emp.nationalite) + '<br/>' : ''}
    ${fullAddress.trim() ? 'Demeurant : ' + escapeHtml(fullAddress.trim()) + '<br/>' : ''}
    ${emp.num_secu ? 'N° de Sécurité sociale : ' + escapeHtml(emp.num_secu) : ''}
  </div>
</div>

<h2>Article 2 — Nature et date d'effet du contrat</h2>
<p>
  Le présent <strong>contrat à durée indéterminée à temps complet</strong> formalise par écrit
  la relation de travail à durée indéterminée existant entre les parties depuis le
  <strong>${dateEmbaucheFr}</strong>.
</p>
<p>
  Conformément à l'article L.1221-1 du Code du travail, l'absence d'écrit antérieur n'a jamais
  remis en cause l'existence ni la nature du contrat, le salarié étant lié à l'employeur par un
  CDI dès l'origine. La date d'embauche figurant dans tous les actes ultérieurs (déclarations sociales,
  bulletins de paie, ancienneté, congés payés, calcul d'indemnités…) est et demeure le
  <strong>${dateEmbaucheFr}</strong>.
</p>

<h2>Article 3 — Fonctions et qualification</h2>
<p>
  Le salarié est employé en qualité de <strong>${escapeHtml(ctr.fonction || 'Employé')}</strong>.
</p>
<p>
  Sa classification au sein de la grille de la convention collective de la Restauration Rapide
  (IDCC 1501) est la suivante :
</p>
<table class="conditions">
  <tr><th>Statut</th><td>${escapeHtml(statutLabel)}</td></tr>
  ${ctr.niveau_ccn ? '<tr><th>Niveau CCN</th><td>' + escapeHtml(ctr.niveau_ccn) + '</td></tr>' : ''}
  ${ctr.echelon_ccn ? '<tr><th>Échelon CCN</th><td>' + escapeHtml(ctr.echelon_ccn) + '</td></tr>' : ''}
  ${ctr.coefficient_ccn ? '<tr><th>Coefficient CCN</th><td>' + escapeHtml(ctr.coefficient_ccn) + '</td></tr>' : ''}
  ${ctr.classification ? '<tr><th>Classification (libellé)</th><td>' + escapeHtml(ctr.classification) + '</td></tr>' : ''}
</table>

<h2>Article 4 — Lieu de travail</h2>
<p>
  Le lieu de travail principal est l'établissement Meshuga Crazy Deli, situé au 3 rue Vavin, 75006 Paris.
  Le salarié pourra être amené à travailler ponctuellement sur d'autres lieux pour les besoins de l'activité
  (événements, prestations traiteur, livraisons), dans la limite de la zone Île-de-France.
</p>

<h2>Article 5 — Durée et horaires de travail</h2>
<p>
  Le salarié est employé à temps complet selon une durée hebdomadaire de
  <strong>${heuresHebdo} heures</strong>, soit <strong>${heuresMensuelles} heures mensuelles</strong>
  conformément à la mensualisation prévue par la convention collective.
</p>
<p>
  Les horaires sont organisés selon les besoins de l'établissement, communiqués au salarié par voie
  d'affichage du planning. Compte tenu de l'activité de restauration, le salarié peut être amené à
  travailler les soirs, week-ends et jours fériés, avec les majorations conventionnelles applicables.
</p>

<h2>Article 6 — Rémunération</h2>
<p>
  En contrepartie de son travail, le salarié perçoit une rémunération mensuelle brute de
  <strong>${salaireMensuel} € bruts</strong>, payée en fin de mois.
</p>
<p class="small">
  Cette rémunération inclut, le cas échéant, les majorations applicables aux heures supplémentaires
  structurelles ainsi qu'à toute autre prime ou avantage prévu par la convention collective IDCC 1501.
</p>

<h2>Article 7 — Période d'essai</h2>
<p>
  En raison du caractère régularisateur du présent contrat formalisant une relation préexistant
  depuis le ${dateEmbaucheFr}, <strong>aucune période d'essai n'est applicable</strong>. Le salarié
  est confirmé dans ses fonctions au titre de l'ancienneté déjà acquise.
</p>

<h2>Article 8 — Congés payés</h2>
<p>
  Le salarié bénéficie des congés payés dans les conditions prévues par les articles L.3141-3 et
  suivants du Code du travail, soit 2,5 jours ouvrables par mois de travail effectif. Les droits
  acquis depuis l'entrée du salarié dans l'entreprise (${dateEmbaucheFr}) lui restent dus.
</p>

<h2>Article 9 — Régimes obligatoires</h2>
<p>Le salarié bénéficie de :</p>
<ul>
  <li><strong>Couverture mutuelle santé</strong> via le contrat collectif de l'entreprise</li>
  <li><strong>Régime de prévoyance</strong> Gan Eurocourtage Vie (au titre de la CCN 1501)</li>
  <li><strong>Régime de retraite complémentaire</strong> KLESIA</li>
  <li><strong>Médecine du travail</strong> assurée par EFFICIENCE — 64 rue de Vaugirard, 75006 Paris</li>
</ul>

<h2>Article 10 — Convention collective et règlement</h2>
<p>
  Pour tout ce qui n'est pas prévu au présent contrat, les parties se réfèrent aux dispositions
  de la <strong>Convention Collective Nationale de la Restauration Rapide (IDCC 1501)</strong>
  et au Code du travail.
</p>

<h2>Article 11 — Confidentialité et loyauté</h2>
<p>
  Le salarié s'engage à respecter une obligation de loyauté envers l'employeur et à ne pas divulguer
  les informations confidentielles dont il aurait connaissance dans le cadre de ses fonctions
  (recettes, fournisseurs, clientèle, méthodes commerciales…).
</p>

<h2>Article 12 — Dispositions finales</h2>
<p>
  Le présent contrat est établi en deux exemplaires originaux, dont un est remis à chaque partie.
  Toute modification ultérieure devra faire l'objet d'un avenant écrit signé par les deux parties.
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
    var employee_id = body.employee_id

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    }
    if (!body.date_embauche) {
      return NextResponse.json({ error: 'date_embauche requise' }, { status: 400 })
    }
    // Sanitize la date d'embauche (corrige inversions jour/mois)
    var dateEmbaucheClean = normalizeDateIso(body.date_embauche) || body.date_embauche

    // Vérifier que l'employé existe (et récupérer ses infos s'il manque des champs)
    var admin = createAdminClient()
    var { data: emp } = await admin
      .from('hr_employees')
      .select('*')
      .eq('id', employee_id)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })
    }

    // Merge données employé : on prend les infos passées dans body.employee
    // (édition Edward) et on complète avec celles de la base
    var employeeMerged = Object.assign({}, emp, body.employee || {})
    // Sanitize date_naissance dans l'employé final (au cas où elle traîne cassée)
    if (employeeMerged.date_naissance) {
      var dnClean = normalizeDateIso(employeeMerged.date_naissance)
      employeeMerged.date_naissance = dnClean // null si pas normalisable
    }

    var html = buildHtml({
      date_embauche: dateEmbaucheClean,
      employee: employeeMerged,
      contract: body.contract || {},
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
    console.error('POST /api/hr/regularization-contract error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
