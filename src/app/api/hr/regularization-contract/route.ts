// src/app/api/hr/regularization-contract/route.ts
// Génère le HTML imprimable du contrat de régularisation (CDI formalisant
// une relation existante non écrite). Charte Meshuga respectée.
//
// Contient TOUTES les clauses modernes (HACCP, RGPD, droit déconnexion, etc.)
// pour que les salariés régularisés aient le même niveau de protection
// que ceux qui signent l'avenant de mise à jour.
//
// POST { employee_id, date_embauche, employee, contract, ville_signature }
// → renvoie HTML qui s'imprime/sauvegarde en PDF via window.print()

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { renderClauses, ALL_CLAUSE_IDS } from '@/lib/hr/clauses-library'

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

function fmtCcyFr(n: any): string {
  if (n === null || n === undefined || n === '') return '—'
  var num = parseFloat(String(n).replace(',', '.'))
  if (isNaN(num)) return '—'
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Normalise une date en ISO yyyy-mm-dd. Corrige les inversions jour/mois
// faites par l'IA (ex: "1952-19-05" → "1952-05-19").
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

function buildHtml(data: any): string {
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

  // Génération des clauses modernes (Articles 8 à 15)
  // Articles 1-7 : parties + nature + fonction + lieu + horaires + rémunération + PE + congés
  // Articles 16-17 : CCN + dispositions finales (calculées dynamiquement)
  var clausesRendered = renderClauses(ALL_CLAUSE_IDS, 8)
  var clausesHtml = clausesRendered.html
  var nextIdx = clausesRendered.nextIdx  // ex: 16

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
    page-break-after: avoid;
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
  Les modalités de mobilité dans le cadre de prestations événementielles sont précisées à l'article
  ${ALL_CLAUSE_IDS.indexOf('mobilite') + 8} ci-après.
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

<h2>Article 7 — Période d'essai et congés payés</h2>
<p>
  En raison du caractère régularisateur du présent contrat formalisant une relation préexistant
  depuis le ${dateEmbaucheFr}, <strong>aucune période d'essai n'est applicable</strong>. Le salarié
  est confirmé dans ses fonctions au titre de l'ancienneté déjà acquise.
</p>
<p>
  Le salarié bénéficie des congés payés dans les conditions prévues par les articles L.3141-3 et
  suivants du Code du travail, soit 2,5 jours ouvrables par mois de travail effectif. Les droits
  acquis depuis l'entrée du salarié dans l'entreprise (${dateEmbaucheFr}) lui restent dus.
</p>

${clausesHtml}

<h2>Article ${nextIdx} — Convention collective et règlement</h2>
<p>
  Pour tout ce qui n'est pas prévu au présent contrat, les parties se réfèrent aux dispositions
  de la <strong>Convention Collective Nationale de la Restauration Rapide (IDCC 1501)</strong>
  et au Code du travail.
</p>

<h2>Article ${nextIdx + 1} — Dispositions finales</h2>
<p>
  Le présent contrat est établi en deux exemplaires originaux, dont un est remis à chaque partie.
  Toute modification ultérieure devra faire l'objet d'un avenant écrit signé par les deux parties.
</p>
<p class="small">
  Le salarié reconnaît avoir reçu, lu et compris l'ensemble des clauses du présent contrat,
  ainsi que les documents annexes mentionnés à l'article ${ALL_CLAUSE_IDS.indexOf('documents_annexes') + 8}.
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
    var contract_id = body.contract_id  // optionnel : si fourni, on attache le doc à ce contrat
    var shouldSave = !!body.save  // optionnel : si true, sauvegarde dans Storage + crée row

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    }
    if (!body.date_embauche) {
      return NextResponse.json({ error: 'date_embauche requise' }, { status: 400 })
    }
    var dateEmbaucheClean = normalizeDateIso(body.date_embauche) || body.date_embauche

    var admin = createAdminClient()
    var { data: emp } = await admin
      .from('hr_employees')
      .select('*')
      .eq('id', employee_id)
      .single()

    if (!emp) {
      return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })
    }

    var employeeMerged = Object.assign({}, emp, body.employee || {})
    if (employeeMerged.date_naissance) {
      var dnClean = normalizeDateIso(employeeMerged.date_naissance)
      employeeMerged.date_naissance = dnClean
    }

    var html = buildHtml({
      date_embauche: dateEmbaucheClean,
      employee: employeeMerged,
      contract: body.contract || {},
      ville_signature: body.ville_signature,
      date_signature: body.date_signature,
    })

    // Si save=true : on sauvegarde le HTML dans Storage et on crée un row
    // hr_contract_documents avec doc_type='contrat_genere'. Comme ça le contrat
    // apparaît dans la fiche du salarié avec les actions (voir, télécharger,
    // remplacer par version signée).
    var documentId: string | null = null
    var storagePath: string | null = null

    if (shouldSave && contract_id) {
      try {
        var todayIso = new Date().toISOString().slice(0, 10)
        var stamp = Date.now()
        storagePath = `${employee_id}/${contract_id}/contrat_genere/${todayIso}_${stamp}.html`

        var htmlBuffer = Buffer.from(html, 'utf-8')
        var uploadRes = await admin.storage
          .from('hr-contract-docs')
          .upload(storagePath, htmlBuffer, {
            contentType: 'text/html; charset=utf-8',
            cacheControl: '0',
            upsert: false,
          })
        if (uploadRes.error) throw new Error('Upload Storage : ' + uploadRes.error.message)

        // Vérifier qu'un précédent doc 'contrat_genere' existe pour ce contrat,
        // si oui on le supprime (Edward a régénéré un nouveau brouillon)
        var prevDocs = await admin
          .from('hr_contract_documents')
          .select('id, file_path')
          .eq('contract_id', contract_id)
          .eq('doc_type', 'contrat_genere')
        if (prevDocs.data && prevDocs.data.length > 0) {
          for (var pd of prevDocs.data) {
            if (pd.file_path) {
              try { await admin.storage.from('hr-contract-docs').remove([pd.file_path]) } catch {}
            }
          }
          await admin.from('hr_contract_documents')
            .delete()
            .in('id', prevDocs.data.map(function (d: any) { return d.id }))
        }

        // Créer le nouveau row
        var fullName = (employeeMerged.prenom || '') + ' ' + ((employeeMerged.nom || '').toUpperCase())
        var insertRes = await admin
          .from('hr_contract_documents')
          .insert({
            contract_id: contract_id,
            doc_type: 'contrat_genere',
            file_path: storagePath,
            mime_type: 'text/html; charset=utf-8',
            file_size: htmlBuffer.length,
            label: 'Contrat de régularisation — ' + fullName.trim() + ' (à signer)',
            validated_by_user: false,  // brouillon, pas signé
            uploaded_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (insertRes.error) {
          // Rollback Storage si insert échoue
          try { await admin.storage.from('hr-contract-docs').remove([storagePath]) } catch {}
          throw new Error('Insert document : ' + insertRes.error.message)
        }
        documentId = insertRes.data.id
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error('Erreur sauvegarde contrat de régularisation:', e)
        // On ne bloque pas la génération : Edward a au moins le HTML dans le navigateur
        // mais on signale l'échec via un header pour que le client sache
      }
    }

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Document-Id': documentId || '',
        'X-Storage-Path': storagePath || '',
        'X-Saved': documentId ? 'true' : 'false',
      },
    })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/regularization-contract error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
