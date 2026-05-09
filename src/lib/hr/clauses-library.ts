// src/lib/hr/clauses-library.ts
// Bibliothèque partagée des clauses contractuelles modernes Meshuga.
// HTML compatible avec le CSS partagé `buildSharedCss` (contractBuilders.tsx).

export type ClauseDef = {
  id: string
  title: string
  body: string
}

export var CLAUSES_LIBRARY: { [k: string]: ClauseDef } = {
  confidentialite: {
    id: 'confidentialite',
    title: 'Confidentialité — Recettes, fournisseurs, clientèle',
    body: ''
      + '<p>Le/la Salarié(e) s\'engage, tant pendant l\'exécution du présent contrat qu\'après sa cessation pour quelque cause que ce soit, à respecter une obligation stricte de confidentialité concernant :</p>'
      + '<ul>'
      + '<li>Les recettes, formulations, procédés de fabrication et tours de main propres à l\'établissement Meshuga Crazy Deli</li>'
      + '<li>L\'identité, les conditions et les tarifs négociés avec les fournisseurs (notamment Boucherie Norbert, Rouquette, Foodflow, Marina Sea Food, Monarque, Jacquier, Episaveurs, DS Service, HPS)</li>'
      + '<li>Le fichier de la clientèle B2B et les conditions commerciales appliquées (notamment grille catering : Petit-déjeuner, Business Lunch, Cocktail dînatoire, Soirée)</li>'
      + '<li>Les méthodes commerciales, supports marketing, données financières et stratégiques de l\'entreprise</li>'
      + '<li>Tout document interne identifié comme confidentiel ou dont le caractère confidentiel résulte de la nature des informations</li>'
      + '</ul>'
      + '<p>Cette obligation s\'étend à toute personne extérieure à l\'entreprise, y compris dans le cercle privé du/de la Salarié(e). Toute violation est susceptible d\'entraîner des sanctions disciplinaires pouvant aller jusqu\'au licenciement pour faute grave, sans préjudice des poursuites civiles ou pénales.</p>',
  },
  haccp: {
    id: 'haccp',
    title: 'Hygiène et sécurité alimentaire — HACCP',
    body: ''
      + '<p>Compte tenu de l\'activité de restauration de l\'établissement, le/la Salarié(e) s\'engage à respecter strictement le Plan de Maîtrise Sanitaire (PMS) et les protocoles HACCP en vigueur, conformément au règlement (CE) n° 852/2004 et à l\'arrêté du 21 décembre 2009.</p>'
      + '<p>À ce titre, il/elle s\'engage notamment à :</p>'
      + '<ul>'
      + '<li>Suivre l\'ensemble des formations à l\'hygiène alimentaire dispensées par l\'employeur, et à demander toute formation complémentaire nécessaire</li>'
      + '<li>Respecter les règles de la marche en avant, le respect de la chaîne du froid (températures de stockage, refroidissement rapide), et les durées limites de conservation (DLC, DLUO)</li>'
      + '<li>Effectuer et tracer les autocontrôles prévus par le PMS (relevés de températures, prélèvements, plats témoins)</li>'
      + '<li>Appliquer les protocoles de nettoyage et désinfection quotidiens, hebdomadaires et mensuels affichés dans l\'établissement</li>'
      + '<li>Signaler immédiatement à l\'employeur toute non-conformité, suspicion de TIAC, ou défaillance d\'équipement de stockage</li>'
      + '<li>Se soumettre aux contrôles internes et externes (DDPP, services vétérinaires, laboratoires d\'analyse)</li>'
      + '</ul>'
      + '<p>Le/la Salarié(e) reconnaît que tout manquement à ces obligations est susceptible de constituer une faute grave compte tenu des risques pour la santé publique.</p>',
  },
  tenue_hygiene: {
    id: 'tenue_hygiene',
    title: 'Tenue de travail et hygiène personnelle',
    body: ''
      + '<p>Le/la Salarié(e) est tenu(e) de porter durant l\'exécution de son travail la tenue professionnelle fournie par l\'employeur (veste, tablier, coiffe le cas échéant), maintenue propre et en bon état. Il/elle s\'engage à :</p>'
      + '<ul>'
      + '<li>Respecter une hygiène corporelle irréprochable (douche quotidienne, ongles courts et propres)</li>'
      + '<li>Retirer tous bijoux, montres et accessoires durant le service (à l\'exception, le cas échéant, d\'une alliance lisse)</li>'
      + '<li>S\'abstenir de porter parfums et eaux de Cologne aux odeurs marquées en zone de production</li>'
      + '<li>Couvrir intégralement les cheveux à l\'aide d\'une coiffe en zone de production</li>'
      + '<li>Signaler à l\'employeur toute plaie, infection ou maladie contagieuse incompatible avec la manipulation de denrées alimentaires</li>'
      + '</ul>'
      + '<p>Le/la Salarié(e) reconnaît avoir reçu un nombre suffisant de tenues professionnelles et s\'engage à les restituer en fin de contrat.</p>',
  },
  rgpd: {
    id: 'rgpd',
    title: 'Protection des données personnelles — RGPD',
    body: ''
      + '<p>Conformément au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés modifiée, le/la Salarié(e) est informé(e) que les données personnelles le/la concernant collectées dans le cadre de la relation de travail (état civil, coordonnées, n° de Sécurité sociale, RIB, données de paie, formations, évaluations, badges et plannings, vidéosurveillance le cas échéant) font l\'objet d\'un traitement par l\'employeur aux finalités suivantes :</p>'
      + '<ul>'
      + '<li>Gestion administrative du contrat de travail et obligations sociales déclaratives</li>'
      + '<li>Paie et déclarations fiscales/sociales (DSN, attestations)</li>'
      + '<li>Suivi du temps de travail et des congés</li>'
      + '<li>Sécurité des locaux et des personnes (vidéosurveillance le cas échéant, déclarée à la CNIL et signalée par affichage)</li>'
      + '</ul>'
      + '<p>Le responsable de traitement est SASU AEGIA FOOD, représentée par M. Edward TOURET. Les données sont conservées pendant la durée légalement prescrite (5 ans après le départ pour les éléments contractuels et de paie). Le/la Salarié(e) dispose d\'un droit d\'accès, de rectification, d\'effacement, de limitation et de portabilité, qu\'il/elle peut exercer en s\'adressant à edward@meshuga.fr. Il/elle peut également introduire une réclamation auprès de la CNIL.</p>'
      + '<p>De son côté, le/la Salarié(e) s\'engage à respecter la confidentialité des données personnelles dont il/elle aurait connaissance dans l\'exercice de ses fonctions (clients, collègues, fournisseurs).</p>',
  },
  mobilite: {
    id: 'mobilite',
    title: 'Mobilité géographique — Prestations événementielles',
    body: ''
      + '<p>Le lieu de travail principal du/de la Salarié(e) est l\'établissement Meshuga Crazy Deli, 3 rue Vavin, 75006 Paris. Le/la Salarié(e) pourra cependant être amené(e) à exécuter ses fonctions ponctuellement sur d\'autres lieux dans la zone Île-de-France, à l\'occasion de prestations événementielles (catering, réceptions, livraisons, salons, foires).</p>'
      + '<p>Ces déplacements ne constituent pas une modification du contrat de travail et ne nécessitent pas d\'avenant supplémentaire. L\'employeur prend en charge les frais de transport engagés sur sa demande, dans les conditions prévues par la convention collective et la politique interne de notes de frais.</p>',
  },
  deconnexion: {
    id: 'deconnexion',
    title: 'Droit à la déconnexion (L.2242-17)',
    body: ''
      + '<p>Conformément à l\'article L.2242-17 du Code du travail, le/la Salarié(e) bénéficie d\'un droit à la déconnexion en dehors de ses heures de travail. Il/elle n\'est pas tenu(e) de répondre aux courriels, messages, ou appels professionnels durant :</p>'
      + '<ul>'
      + '<li>Ses temps de repos quotidien et hebdomadaire (notamment les 11 heures de repos consécutif et les 35 heures de repos hebdomadaire)</li>'
      + '<li>Ses congés payés et arrêts de toute nature</li>'
      + '<li>Ses jours fériés chômés</li>'
      + '</ul>'
      + '<p>L\'employeur s\'engage à ne solliciter le/la Salarié(e) en dehors de ses horaires qu\'en cas d\'urgence avérée et à ne pas tirer de conséquences défavorables d\'une non-réponse en dehors du temps de travail.</p>',
  },
  regimes_actualises: {
    id: 'regimes_actualises',
    title: 'Régimes obligatoires actualisés',
    body: ''
      + '<p>Le/la Salarié(e) bénéficie, à la date du présent contrat, des régimes suivants :</p>'
      + '<ul>'
      + '<li><strong>Mutuelle santé collective</strong> obligatoire conformément à la CCN Restauration Rapide IDCC 1501</li>'
      + '<li><strong>Régime de prévoyance</strong> souscrit auprès de Gan Eurocourtage Vie</li>'
      + '<li><strong>Régime de retraite complémentaire</strong> KLESIA</li>'
      + '<li><strong>Service de santé au travail</strong> assuré par EFFICIENCE — 64 rue de Vaugirard, 75006 Paris</li>'
      + '</ul>'
      + '<p>Toute information complémentaire (notice d\'information, conditions de garanties, conditions de dispense d\'affiliation) est disponible auprès de l\'employeur. Le/la Salarié(e) reconnaît avoir été informé(e) de ces régimes et de la procédure pour exercer ses droits.</p>',
  },
  documents_annexes: {
    id: 'documents_annexes',
    title: 'Documents internes annexés au contrat',
    body: ''
      + '<p>Les documents internes ci-dessous, remis au/à la Salarié(e) lors de l\'entrée en vigueur du présent contrat, font partie intégrante du contrat de travail :</p>'
      + '<ul>'
      + '<li>Le dossier de bienvenue de l\'établissement Meshuga Crazy Deli</li>'
      + '<li>Le Plan de Maîtrise Sanitaire (PMS) et l\'annexe légale HACCP</li>'
      + '<li>Les protocoles de nettoyage quotidien, hebdomadaire et mensuel</li>'
      + '<li>La présente notice d\'information sur le traitement des données personnelles (RGPD)</li>'
      + '</ul>'
      + '<p>Le/la Salarié(e) reconnaît avoir reçu ces documents et s\'engage à en respecter les dispositions. Un récépissé spécifique est signé séparément attestant de cette remise.</p>',
  },
}

export var ALL_CLAUSE_IDS: string[] = [
  'confidentialite',
  'haccp',
  'tenue_hygiene',
  'rgpd',
  'mobilite',
  'deconnexion',
  'regimes_actualises',
  'documents_annexes',
]

// genderize : transforme "Le/la Salarié(e)" → "Le Salarié" ou "La Salariée".
// Aligné avec contractBuilders.tsx pour cohérence.
export function genderize(html: string, isFemale: boolean): string {
  if (!html) return ''
  var rules = [
    { from: /du\/de la Salarié\(e\)/g, to: isFemale ? 'de la Salariée' : 'du Salarié' },
    { from: /au\/à la Salarié\(e\)/g,  to: isFemale ? 'à la Salariée'  : 'au Salarié' },
    { from: /Le\/la Salarié\(e\)/g,    to: isFemale ? 'La Salariée'    : 'Le Salarié' },
    { from: /le\/la Salarié\(e\)/g,    to: isFemale ? 'la Salariée'    : 'le Salarié' },
    { from: /Celui-ci\/celle-ci/g,     to: isFemale ? 'Celle-ci'  : 'Celui-ci' },
    { from: /celui-ci\/celle-ci/g,     to: isFemale ? 'celle-ci'  : 'celui-ci' },
    { from: /\bIl\/elle\b/g,           to: isFemale ? 'Elle' : 'Il' },
    { from: /\bil\/elle\b/g,           to: isFemale ? 'elle' : 'il' },
    { from: /engagé\(e\)/g,            to: isFemale ? 'engagée'   : 'engagé' },
    { from: /classé\(e\)/g,            to: isFemale ? 'classée'   : 'classé' },
    { from: /amené\(e\)/g,             to: isFemale ? 'amenée'    : 'amené' },
    { from: /soumis\(e\)/g,            to: isFemale ? 'soumise'   : 'soumis' },
    { from: /informé\(e\)/g,           to: isFemale ? 'informée'  : 'informé' },
    { from: /affilié\(e\)/g,           to: isFemale ? 'affiliée'  : 'affilié' },
    { from: /dénommé\(e\)/g,           to: isFemale ? 'dénommée'  : 'dénommé' },
    { from: /habilité\(e\)/g,          to: isFemale ? 'habilitée' : 'habilité' },
    { from: /tenu\(e\)/g,              to: isFemale ? 'tenue'     : 'tenu' },
    { from: /salarié\(e\)s/g,          to: isFemale ? 'salariées' : 'salariés' },
  ]
  var out = html
  for (var i = 0; i < rules.length; i++) {
    out = out.replace(rules[i].from, rules[i].to)
  }
  return out
}

// Rend une liste de clauses au format CSS partagé :
// <div class="art"><span class="art-num">Article X.</span><span class="art-title">…</span></div>
// <div class="body">…</div>
// startIdx = numéro du 1er article (ex: 8 si articles 1-7 déjà utilisés ailleurs)
// isFemale = appliquer genderize automatiquement
export function renderClauses(
  clauseIds: string[],
  startIdx: number = 1,
  isFemale: boolean = false
): { html: string; nextIdx: number } {
  var html = ''
  var idx = startIdx
  for (var i = 0; i < clauseIds.length; i++) {
    var cid = clauseIds[i]
    var cl = CLAUSES_LIBRARY[cid]
    if (!cl) continue
    var bodyHtml = genderize(cl.body, isFemale)
    html += '<div class="art">'
         +  '<span class="art-num">Article ' + idx + '.</span>'
         +  '<span class="art-title">' + cl.title + '</span>'
         +  '</div>'
         +  '<div class="body">' + bodyHtml + '</div>'
    idx++
  }
  return { html: html, nextIdx: idx }
}

export function getCatalog(): Array<{ id: string; title: string }> {
  return ALL_CLAUSE_IDS.map(function (id) {
    return { id: id, title: CLAUSES_LIBRARY[id].title }
  })
}
