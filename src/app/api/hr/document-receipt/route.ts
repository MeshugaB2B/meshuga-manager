// src/app/api/hr/document-receipt/route.ts
// Génère un récépissé de remise des documents internes, aligné sur la DA Meshuga
// (CSS partagé avec le contrat extra). Une page imprimable.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
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

var DOCUMENTS_LIBRARY: any = {
  dossier_bienvenue: {
    title: 'Dossier de bienvenue Meshuga',
    desc: 'Présentation de l\'établissement, organisation interne, règles de vie, contacts utiles.',
  },
  charte_haccp: {
    title: 'Plan de Maîtrise Sanitaire (PMS) et annexe légale HACCP',
    desc: 'Procédures de sécurité alimentaire conformes au règlement (CE) n° 852/2004 et à l\'arrêté du 21/12/2009.',
  },
  protocole_quotidien: {
    title: 'Protocole de nettoyage quotidien (matin / soir)',
    desc: 'Tâches de nettoyage et désinfection à effectuer chaque jour, avec traçabilité.',
  },
  protocole_hebdo: {
    title: 'Protocole de nettoyage hebdomadaire',
    desc: 'Nettoyage approfondi (vestiaire, toilettes personnel, équipements).',
  },
  protocole_mensuel: {
    title: 'Protocole de nettoyage mensuel',
    desc: 'Détartrage, dégraissage, dégivrage, vérifications des équipements.',
  },
  charte_rgpd: {
    title: 'Notice d\'information RGPD',
    desc: 'Information sur le traitement des données personnelles, droits du salarié.',
  },
  charte_informatique: {
    title: 'Charte informatique',
    desc: 'Règles d\'utilisation des outils numériques et messageries professionnelles.',
  },
  consignes_securite: {
    title: 'Consignes de sécurité incendie et premiers secours',
    desc: 'Plan d\'évacuation, extincteurs, trousse de secours, numéros d\'urgence.',
  },
}

function buildHtml(data: any): string {
  var emp = data.employee || {}
  var docIds: string[] = data.documents || []
  var dateRemise = dateLongFr(data.date_remise || new Date().toISOString().slice(0, 10))

  var civilite = emp.civilite || 'Madame'
  var isFemale = (civilite === 'Madame' || civilite === 'Mademoiselle')

  // Header partagé : logo + cover + parties
  var header = buildSharedHeader({
    emp: emp,
    titreCover: 'RÉCÉPISSÉ DE REMISE',
    sousTitreCover: 'Documents internes & procédures · Attestation de remise par l\'employeur',
    typeBandeau: 'RÉCÉPISSÉ DOCUMENTS',
    logoUri: data.logoUri || null,
  })

  // Liste des docs cochés (en utilisant la classe .body avec ul → tirets roses auto)
  var docsHtml = ''
  for (var i = 0; i < docIds.length; i++) {
    var did = docIds[i]
    var dl = DOCUMENTS_LIBRARY[did]
    if (!dl) continue
    docsHtml += '<li><strong>' + esc(dl.title) + '</strong><br><span style="font-size:11.5px;color:#666;font-style:italic">' + esc(dl.desc) + '</span></li>'
  }
  if (!docsHtml) {
    docsHtml = '<li style="font-style:italic;color:#999">[aucun document sélectionné]</li>'
  }

  var body = ''
    // Article 1 — Objet
    + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet du présent récépissé</span></div>'
    + '<div class="body">'
    + '<p>' + (isFemale ? 'La Salariée' : 'Le Salarié') + ' soussigné(e) <strong>reconnaît avoir reçu</strong> de l\'employeur, en main propre, les documents internes listés ci-après, le <strong>' + esc(dateRemise) + '</strong>, et atteste en avoir pris connaissance.</p>'
    + '</div>'

    // Article 2 — Liste des documents
    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Documents remis</span></div>'
    + '<div class="body">'
    + '<ul>' + docsHtml + '</ul>'
    + '</div>'

    // Article 3 — Engagement
    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Engagement ' + (isFemale ? 'de la Salariée' : 'du Salarié') + '</span></div>'
    + '<div class="body">'
    + '<p>' + (isFemale ? 'La Salariée s\'engage' : 'Le Salarié s\'engage') + ' expressément à :</p>'
    + '<ul>'
    + '<li><strong>Lire intégralement</strong> chacun des documents listés ci-dessus</li>'
    + '<li><strong>Respecter scrupuleusement</strong> les procédures, consignes et règles internes qu\'ils contiennent</li>'
    + '<li><strong>Solliciter</strong> l\'employeur ou son responsable hiérarchique pour toute question ou point nécessitant clarification</li>'
    + '<li><strong>Signaler</strong> sans délai toute non-conformité, défaillance ou difficulté d\'application qu\'il/elle constaterait</li>'
    + '</ul>'
    + '<p>' + (isFemale ? 'La Salariée est informée' : 'Le Salarié est informé') + ' que le non-respect de ces procédures, notamment celles relatives à la sécurité alimentaire (HACCP), peut entraîner des sanctions disciplinaires pouvant aller jusqu\'au licenciement, compte tenu des risques pour la santé publique et la réputation de l\'établissement.</p>'
    + '</div>'

  var signatures = buildSharedSignatures(
    {
      date_signature: data.date_signature || new Date().toISOString().slice(0, 10),
      ville_signature: data.ville_signature || 'Paris',
    },
    emp,
    'Récépissé documents'
  )

  return wrapHtml({
    titre: 'Récépissé documents — ' + (emp.prenom || '') + ' ' + ((emp.nom || '').toUpperCase()),
    css: buildSharedCss(data.logoUri || null),
    body: header + body + signatures,
  })
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    if (!body.employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })

    var admin = createAdminClient()
    var resE = await admin.from('hr_employees').select('*').eq('id', body.employee_id).single()
    if (resE.error || !resE.data) return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })

    var html = buildHtml({
      employee: resE.data,
      documents: body.documents || [],
      date_remise: body.date_remise,
      ville_signature: body.ville_signature,
      date_signature: body.date_signature,
      logoUri: null,
    })

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/document-receipt error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET() {
  var catalog = Object.keys(DOCUMENTS_LIBRARY).map(function (key) {
    var d = DOCUMENTS_LIBRARY[key]
    return { id: key, title: d.title, desc: d.desc }
  })
  return NextResponse.json({ documents: catalog })
}
