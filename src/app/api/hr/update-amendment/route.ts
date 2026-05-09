// src/app/api/hr/update-amendment/route.ts
// Génère un avenant de mise à jour aligné sur la DA Meshuga existante
// (même CSS partagé que le contrat extra et les CDI).

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { renderClauses, getCatalog } from '@/lib/hr/clauses-library'
import {
  buildSharedCss,
  buildSharedHeader,
  buildSharedSignatures,
  wrapHtml,
  esc,
} from '@/app/dashboard/rh/contractBuilders'

export var runtime = 'nodejs'

function dateLongFr(iso: any): string {
  if (!iso) return '[date à compléter]'
  try {
    var d = new Date(String(iso).slice(0, 10))
    if (isNaN(d.getTime())) return String(iso)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return String(iso) }
}

function buildHtml(data: any): string {
  var emp = data.employee || {}
  var ctr = data.contract || {}
  var clauseIds: string[] = data.clauses || []

  var civilite = emp.civilite || 'Madame'
  var isFemale = (civilite === 'Madame' || civilite === 'Mademoiselle')

  var dateEffet = dateLongFr(data.date_effet || new Date().toISOString().slice(0, 10))
  var contratLabel = data.contract_label || 'contrat de travail'
  var contratDate = ctr.date_debut ? dateLongFr(ctr.date_debut) : (ctr.created_at ? dateLongFr(ctr.created_at) : '—')
  var fonction = ctr.fonction || '—'

  // Header partagé (logo + cover + parties)
  var header = buildSharedHeader({
    emp: emp,
    titreCover: 'AVENANT AU CONTRAT DE TRAVAIL',
    sousTitreCover: 'Mise à jour des clauses contractuelles · CCN Restauration Rapide (IDCC 1501)',
    typeBandeau: 'AVENANT',
    logoUri: data.logoUri || null,
  })

  // Article 1 : Préambule (objet de l'avenant)
  var body = ''
    + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet de l\'avenant</span></div>'
    + '<div class="body">'
    + '<p>Le présent avenant a pour objet de <strong>compléter et mettre à jour</strong> les clauses du ' + esc(contratLabel) + ' conclu entre les Parties (date d\'effet du contrat initial : <strong>' + esc(contratDate) + '</strong>), afin de l\'aligner sur les obligations légales et conventionnelles en vigueur ainsi que sur les procédures internes actuelles de l\'établissement.</p>'
    + '<p>' + (isFemale ? 'La Salariée' : 'Le Salarié') + ' est ' + (isFemale ? 'employée' : 'employé') + ' en qualité de <strong>' + esc(fonction) + '</strong>.</p>'
    + '<p>Les clauses du contrat initial non expressément modifiées par le présent avenant <strong>restent pleinement applicables</strong>. L\'<strong>ancienneté ' + (isFemale ? 'de la Salariée' : 'du Salarié') + ' et l\'ensemble de ses droits acquis</strong> (notamment les congés payés et la prime d\'ancienneté le cas échéant) sont intégralement conservés.</p>'
    + '<p>Le présent avenant prend effet le <strong>' + esc(dateEffet) + '</strong>.</p>'
    + '</div>'

  // Articles 2+ : clauses modernes via la lib (avec genderize)
  var rendered = renderClauses(clauseIds, 2, isFemale)
  body += rendered.html
  var nextIdx = rendered.nextIdx

  // Dernier article : dispositions finales
  body += '<div class="art"><span class="art-num">Article ' + nextIdx + '.</span><span class="art-title">Dispositions finales</span></div>'
       +  '<div class="body">'
       +  '<p>Le présent avenant fait partie intégrante du contrat de travail conclu entre les Parties. Les autres clauses du contrat initial demeurent inchangées et continuent de produire tous leurs effets.</p>'
       +  '<p>Le présent avenant est établi en deux exemplaires originaux, dont un est remis à chaque Partie.</p>'
       +  '</div>'

  var signatures = buildSharedSignatures(
    {
      date_signature: data.date_signature || new Date().toISOString().slice(0, 10),
      ville_signature: data.ville_signature || 'Paris',
    },
    emp,
    fonction
  )

  return wrapHtml({
    titre: 'Avenant — ' + (emp.prenom || '') + ' ' + ((emp.nom || '').toUpperCase()),
    css: buildSharedCss(data.logoUri || null),
    body: header + body + signatures,
  })
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    if (!body.employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    if (!body.contract_id) return NextResponse.json({ error: 'contract_id requis' }, { status: 400 })
    var shouldSave = !!body.save

    var admin = createAdminClient()
    var resE = await admin.from('hr_employees').select('*').eq('id', body.employee_id).single()
    if (resE.error || !resE.data) return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })
    var resC = await admin.from('hr_contracts').select('*').eq('id', body.contract_id).single()
    if (resC.error || !resC.data) return NextResponse.json({ error: 'contrat introuvable' }, { status: 404 })

    var html = buildHtml({
      employee: resE.data,
      contract: resC.data,
      contract_label: body.contract_label,
      clauses: body.clauses || [],
      date_effet: body.date_effet,
      ville_signature: body.ville_signature,
      date_signature: body.date_signature,
      logoUri: null,
    })

    // Si save=true : sauvegarder l'avenant dans Storage + créer row hr_contract_documents
    // avec doc_type='contrat_genere' (brouillon à signer). Quand Edward upload la
    // version signée, il créera un doc_type='avenant' avec validated_by_user=true.
    var documentId: string | null = null
    var storagePath: string | null = null

    if (shouldSave) {
      try {
        var todayIso = new Date().toISOString().slice(0, 10)
        var stamp = Date.now()
        storagePath = `${body.employee_id}/${body.contract_id}/avenant_genere/${todayIso}_${stamp}.html`

        var htmlBuffer = Buffer.from(html, 'utf-8')
        var uploadRes = await admin.storage
          .from('hr-contract-docs')
          .upload(storagePath, htmlBuffer, {
            contentType: 'text/html; charset=utf-8',
            cacheControl: '0',
            upsert: false,
          })
        if (uploadRes.error) throw new Error('Upload Storage : ' + uploadRes.error.message)

        // Supprimer les précédents avenants brouillon (contrat_genere avec un label avenant)
        // pour éviter doublons quand Edward régénère
        var prevDocs = await admin
          .from('hr_contract_documents')
          .select('id, file_path, label')
          .eq('contract_id', body.contract_id)
          .eq('doc_type', 'contrat_genere')
        if (prevDocs.data && prevDocs.data.length > 0) {
          // Filtrer ceux dont le label commence par "Avenant"
          var toDelete = prevDocs.data.filter(function (d: any) {
            return (d.label || '').toLowerCase().indexOf('avenant') >= 0
          })
          for (var pd of toDelete) {
            if (pd.file_path) {
              try { await admin.storage.from('hr-contract-docs').remove([pd.file_path]) } catch {}
            }
          }
          if (toDelete.length > 0) {
            await admin.from('hr_contract_documents')
              .delete()
              .in('id', toDelete.map(function (d: any) { return d.id }))
          }
        }

        var fullName = (resE.data.prenom || '') + ' ' + ((resE.data.nom || '').toUpperCase())
        var insertRes = await admin
          .from('hr_contract_documents')
          .insert({
            contract_id: body.contract_id,
            doc_type: 'contrat_genere',
            file_path: storagePath,
            mime_type: 'text/html; charset=utf-8',
            file_size: htmlBuffer.length,
            label: 'Avenant de mise à jour — ' + fullName.trim() + ' (à signer)',
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
        console.error('Erreur sauvegarde avenant:', e)
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
    console.error('POST /api/hr/update-amendment error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ clauses: getCatalog() })
}
