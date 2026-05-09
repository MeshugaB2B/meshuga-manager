// src/app/api/hr/regularization-contract/route.ts
// Génère le contrat de régularisation CDI complet aligné sur la DA Meshuga
// (logo central rose, articles avec ligne rose, signatures avec sig-block).
// Utilise les builders partagés `buildSharedHeader/Css/Signatures/wrapHtml`
// depuis contractBuilders.tsx — même DA que le contrat extra et les CDI.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { renderClauses, ALL_CLAUSE_IDS } from '@/lib/hr/clauses-library'
import {
  buildSharedCss,
  buildSharedHeader,
  buildSharedSignatures,
  wrapHtml,
  esc,
} from '@/app/dashboard/rh/contractBuilders'

export var runtime = 'nodejs'

function fmtDateFr(iso: any): string {
  if (!iso) return '—'
  try {
    var s = String(iso).slice(0, 10)
    var p = s.split('-')
    if (p.length !== 3) return s
    return p[2] + '/' + p[1] + '/' + p[0]
  } catch (e) { return String(iso) }
}

function fmtCcyFr(n: any): string {
  if (n === null || n === undefined || n === '') return '—'
  var num = parseFloat(String(n).replace(',', '.'))
  if (isNaN(num)) return '—'
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function dateLongFr(iso: any): string {
  if (!iso) return '[date à compléter]'
  try {
    var d = new Date(String(iso).slice(0, 10))
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return String(iso) }
}

// Normalise une date en ISO yyyy-mm-dd. Corrige les inversions jour/mois.
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

// Construit le HTML complet du contrat de régularisation
function buildHtml(data: any): string {
  var emp = data.employee || {}
  var ctr = data.contract || {}
  var dateEmbaucheFr = dateLongFr(data.date_embauche)

  var civilite = emp.civilite || 'Madame'
  var isFemale = (civilite === 'Madame' || civilite === 'Mademoiselle')

  var fonction = ctr.fonction || '[fonction à compléter]'
  var statut = ctr.statut_cadre || 'non-cadre'
  var statutLabel = statut === 'cadre' ? 'cadre' : (statut === 'agent_maitrise' ? 'agent de maîtrise' : 'non-cadre')
  var niveauLabel = ctr.niveau_ccn && ctr.echelon_ccn
    ? ('Niveau ' + ctr.niveau_ccn + ' — Échelon ' + ctr.echelon_ccn)
    : (ctr.niveau_ccn ? ('Niveau ' + ctr.niveau_ccn) : '[niveau CCN à compléter]')

  var heuresHebdo = ctr.heures_hebdo ? parseFloat(ctr.heures_hebdo) : 35
  var heuresMensuelles = ctr.heures_mensuelles ? parseFloat(ctr.heures_mensuelles) : (heuresHebdo * 52 / 12)
  var salaireMensuel = fmtCcyFr(ctr.salaire_brut_mensuel)

  // Header partagé : logo central, place, titre cover, parties
  var header = buildSharedHeader({
    emp: emp,
    titreCover: 'CONTRAT DE RÉGULARISATION CDI',
    sousTitreCover: 'Formalisation d\'une relation de travail à durée indéterminée existante · Article L.1221-1 du Code du travail · CCN Restauration Rapide (IDCC 1501)',
    typeBandeau: 'CONTRAT DE RÉGULARISATION',
    logoUri: data.logoUri || null,
  })

  // Articles 1-7 : préambule de régularisation + parties (déjà via header) + clauses standard
  var body = ''
    // Article 1 — Objet du contrat (préambule de régularisation)
    + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet du présent contrat — Formalisation d\'une relation existante</span></div>'
    + '<div class="body">'
    + '<p>Les Parties signataires constatent qu\'<strong>une relation de travail à durée indéterminée existe entre elles depuis le ' + esc(dateEmbaucheFr) + '</strong>, sans avoir fait l\'objet jusqu\'à ce jour d\'une formalisation par écrit.</p>'
    + '<p>Le présent contrat a pour seul objet de <strong>formaliser par écrit cette relation préexistante</strong>, conformément à l\'article L.1221-1 du Code du travail. Il ne crée pas de nouvelle relation contractuelle.</p>'
    + '<p>L\'<strong>ancienneté de ' + (isFemale ? 'la Salariée' : 'du Salarié') + ' est expressément reconnue et conservée à compter du ' + esc(dateEmbaucheFr) + '</strong>, date d\'entrée effective dans l\'entreprise. L\'absence d\'écrit antérieur n\'a jamais remis en cause l\'existence ni la nature du contrat. La date d\'embauche figurant dans tous les actes ultérieurs (déclarations sociales, bulletins de paie, ancienneté, congés payés, calcul d\'indemnités) est et demeure le ' + esc(dateEmbaucheFr) + '.</p>'
    + '</div>'

    // Article 2 — Nature du contrat
    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Nature du contrat</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat est un <strong>contrat de travail à durée indéterminée à temps complet</strong>, formalisant la relation existant entre les Parties depuis le ' + esc(dateEmbaucheFr) + '.</p>'
    + '</div>'

    // Article 3 — Fonctions et qualification
    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Fonctions et qualification</span></div>'
    + '<div class="body">'
    + '<p>' + (isFemale ? 'La Salariée est employée' : 'Le Salarié est employé') + ' en qualité de <strong>' + esc(fonction) + '</strong>.</p>'
    + '<p>' + (isFemale ? 'Sa' : 'Sa') + ' classification au sein de la grille de la convention collective de la Restauration Rapide (IDCC 1501) est : <strong>' + esc(niveauLabel) + '</strong>, statut <strong>' + esc(statutLabel) + '</strong>.</p>'
    + (ctr.classification ? '<p>Libellé : ' + esc(ctr.classification) + '.</p>' : '')
    + '</div>'

    // Article 4 — Période d'essai (aucune)
    + '<div class="art"><span class="art-num">Article 4.</span><span class="art-title">Période d\'essai</span></div>'
    + '<div class="body">'
    + '<p>En raison du caractère régularisateur du présent contrat formalisant une relation préexistant depuis le ' + esc(dateEmbaucheFr) + ', <strong>aucune période d\'essai n\'est applicable</strong>. ' + (isFemale ? 'La Salariée est confirmée' : 'Le Salarié est confirmé') + ' dans ses fonctions au titre de l\'ancienneté déjà acquise.</p>'
    + '</div>'

    // Article 5 — Durée et horaires
    + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Durée et horaires de travail</span></div>'
    + '<div class="body">'
    + '<p>' + (isFemale ? 'La Salariée est employée' : 'Le Salarié est employé') + ' à temps complet selon une durée hebdomadaire de <strong>' + heuresHebdo + ' heures</strong>, soit <strong>' + heuresMensuelles.toFixed(2).replace('.', ',') + ' heures mensuelles</strong> conformément à la mensualisation prévue par la convention collective.</p>'
    + '<p>Les horaires sont organisés selon les besoins de l\'établissement, communiqués par voie d\'affichage du planning. Compte tenu de l\'activité de restauration, ' + (isFemale ? 'la Salariée' : 'le Salarié') + ' peut être ' + (isFemale ? 'amenée' : 'amené') + ' à travailler les soirs, week-ends et jours fériés, avec les majorations conventionnelles applicables.</p>'
    + '</div>'

    // Article 6 — Rémunération
    + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Rémunération</span></div>'
    + '<div class="body">'
    + '<p>En contrepartie de son travail, ' + (isFemale ? 'la Salariée perçoit' : 'le Salarié perçoit') + ' une rémunération mensuelle brute de <strong>' + salaireMensuel + ' € bruts</strong>, payée en fin de mois.</p>'
    + '<p>Cette rémunération inclut, le cas échéant, les majorations applicables aux heures supplémentaires structurelles ainsi que toute autre prime ou avantage prévu par la CCN IDCC 1501.</p>'
    + '</div>'

    // Article 7 — Congés payés
    + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Congés payés</span></div>'
    + '<div class="body">'
    + '<p>' + (isFemale ? 'La Salariée bénéficie' : 'Le Salarié bénéficie') + ' des congés payés dans les conditions prévues par les articles L.3141-3 et suivants du Code du travail, soit <strong>2,5 jours ouvrables par mois de travail effectif</strong>. Les droits acquis depuis l\'entrée dans l\'entreprise (' + esc(dateEmbaucheFr) + ') ' + (isFemale ? 'lui restent dus' : 'lui restent dus') + '.</p>'
    + '</div>'

  // Articles 8 à 15 : clauses modernes via la lib partagée (avec genderize)
  var clausesRendered = renderClauses(ALL_CLAUSE_IDS, 8, isFemale)
  body += clausesRendered.html
  var nextIdx = clausesRendered.nextIdx

  // Article 16 — CCN
  body += '<div class="art"><span class="art-num">Article ' + nextIdx + '.</span><span class="art-title">Convention collective applicable</span></div>'
       +  '<div class="body">'
       +  '<p>Pour tout ce qui n\'est pas prévu au présent contrat, les Parties se réfèrent aux dispositions de la <strong>Convention Collective Nationale de la Restauration Rapide (IDCC 1501)</strong> et au Code du travail.</p>'
       +  '</div>'

  // Article 17 — Dispositions finales
  body += '<div class="art"><span class="art-num">Article ' + (nextIdx + 1) + '.</span><span class="art-title">Dispositions finales</span></div>'
       +  '<div class="body">'
       +  '<p>Le présent contrat est établi en deux exemplaires originaux, dont un est remis à chaque Partie. Toute modification ultérieure devra faire l\'objet d\'un avenant écrit signé par les deux Parties.</p>'
       +  '<p>' + (isFemale ? 'La Salariée reconnaît' : 'Le Salarié reconnaît') + ' avoir reçu, lu et compris l\'ensemble des clauses du présent contrat, ainsi que les documents annexes mentionnés à l\'article ' + (ALL_CLAUSE_IDS.indexOf('documents_annexes') + 8) + '.</p>'
       +  '</div>'

  // Signatures (bloc partagé qui ferme </body></html>)
  var signatures = buildSharedSignatures(
    {
      date_signature: data.date_signature || new Date().toISOString().slice(0, 10),
      ville_signature: data.ville_signature || 'Paris',
    },
    emp,
    fonction
  )

  return wrapHtml({
    titre: 'Contrat de régularisation — ' + (emp.prenom || '') + ' ' + ((emp.nom || '').toUpperCase()),
    css: buildSharedCss(data.logoUri || null),
    body: header + body + signatures,
  })
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var employee_id = body.employee_id
    var contract_id = body.contract_id
    var shouldSave = !!body.save

    if (!employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    if (!body.date_embauche) return NextResponse.json({ error: 'date_embauche requise' }, { status: 400 })
    var dateEmbaucheClean = normalizeDateIso(body.date_embauche) || body.date_embauche

    var admin = createAdminClient()
    var { data: emp } = await admin
      .from('hr_employees')
      .select('*')
      .eq('id', employee_id)
      .single()
    if (!emp) return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })

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
      logoUri: null,  // peut être enrichi plus tard si on veut intégrer le logo
    })

    // Si save=true : sauvegarder dans Storage + créer row hr_contract_documents
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

        // Supprimer les précédents 'contrat_genere' du même contrat
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
            validated_by_user: false,
            uploaded_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (insertRes.error) {
          try { await admin.storage.from('hr-contract-docs').remove([storagePath]) } catch {}
          throw new Error('Insert document : ' + insertRes.error.message)
        }
        documentId = insertRes.data.id
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error('Erreur sauvegarde contrat de régularisation:', e)
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
