// ============================================================
// src/lib/prospectEmailAI.ts
// ============================================================
// Cœur de la génération IA des messages de prospection.
// Utilisé par :
//  - /api/generate-email            (bouton « Email IA » + LinkedIn dans les fiches)
//  - /api/cron/prospect-followups   (relances automatiques)
//
// PLAYBOOKS SECTORIELS : chaque secteur a son angle (besoins prioritaires,
// formats à mettre en avant dans l'ordre, moments clés, preuve, CTA).
// Pour ajouter / ajuster un secteur : modifier SECTOR_PLAYBOOKS ci-dessous.
//
// LINKEDIN : generateLinkedinMessage() → invitation (≤ 300 car.),
// InMail (objet ≤ 200 car., corps court) ou message à une relation.
// ============================================================

import { OFFER_SUMMARY, PRESS_LINKS, REFERENCES, getSender, defaultPressKeys, sanitizePressKeys } from '@/lib/prospectEmail'

var MODEL = 'claude-sonnet-4-6'

// ------------------------------------------------------------
// Playbooks sectoriels
// match   : regex testée sur "category type nom notes" (minuscules)
// insight : la vérité du secteur sur laquelle s'ouvre le mail
// needs   : ce dont ils ont le plus besoin (à traiter en priorité)
// formats : les formats à présenter en puces, DANS CET ORDRE
// moments : moments concrets de leur calendrier à citer
// proof   : référence / preuve la plus parlante pour eux
// catering: angle du paragraphe "livraison / catering" (ou '' si hors sujet)
// cta     : proposition finale
// ------------------------------------------------------------
var SECTOR_PLAYBOOKS = [
  {
    key: 'evenementiel',
    label: 'Agence événementielle',
    match: /[ée]v[ée]nement|event|wedding|mariage|s[ée]minaire|incentive|r[ée]ceptif|dmc|traiteur/,
    insight: 'Sur un événement, la food fait partie de ce dont les invités se souviennent. L’agence joue sa crédibilité devant son client : elle cherche un prestataire qui fait l’effet « waouh » sans lui ajouter de logistique.',
    needs: [
      'Un concept food qui crée une animation et marque les invités (pas un buffet de plus)',
      'Zéro logistique pour l’agence : équipe, matériel, installation, service',
      'Adaptabilité au brief : lieu atypique, contrainte technique, branding client',
      'Fiabilité sur les volumes et le timing'
    ],
    formats: [
      'Live cooking : nos chefs préparent les sandwichs à la minute, devant les invités',
      'Stand ou barnum brandé : aux couleurs de Meshuga ou du client de l’agence',
      'Mini-boxes et formats cocktail : service fluide, debout, en grand volume',
      'Sur mesure : lieu atypique, contrainte technique, idée précise → on s’adapte'
    ],
    moments: 'soirées de lancement, cocktails, activations de marque, festivals, soirées clients',
    proof: 'Soirées de lancement de labels musicaux (food pour les artistes comme pour les équipes), mk2 Cinéma Paradiso au Louvre',
    catering: 'Tous les moments autour de l’événement : lunch boxes pour les équipes en montage, plateaux à partager pour les briefings et réunions clients, loges et backstage. Commandes adaptées aux effectifs, options végétariennes, livraison sur site à l’heure voulue.',
    cta: 'Faire livrer une box découverte à l’équipe — demander quel jour leur convient'
  },
  {
    key: 'production',
    label: 'Production / tournages',
    match: /tournage|production|prod\b|film|cin[ée]ma|clip|pub tv|audiovisuel|plateau|shooting|studio photo|r[ée]gie/,
    insight: 'Sur un tournage, une équipe bien nourrie est une équipe qui tient la journée. La régie a besoin de repas fiables, livrés à l’heure sur le plateau, qui changent du sempiternel catering de tournage.',
    needs: [
      'Ponctualité absolue et livraison directement sur le plateau / le décor',
      'Volumes variables d’un jour à l’autre, commande simple à ajuster',
      'Repas individuels, faciles à manger sur le pouce entre deux prises',
      'Options végétariennes et variété sur plusieurs jours de tournage'
    ],
    formats: [
      'Lunch boxes individuelles : sandwich grand format + side + boisson, prêtes à distribuer',
      'Plateaux de minis à partager : pour la régie, la loge ou les pauses',
      'Live cooking : pour une fin de tournage, une soirée d’équipe ou un wrap party',
      'Sur mesure : horaires décalés, lieu de tournage hors Paris intra-muros → on s’adapte'
    ],
    moments: 'déjeuners de plateau, pauses, loges comédiens, wrap parties, castings',
    proof: 'Tournages de films, mk2 Cinéma Paradiso au Louvre',
    catering: '',
    cta: 'Faire livrer une box découverte à la régie ou à la prod — demander quel jour leur convient'
  },
  {
    key: 'creatif',
    label: 'Agence créa / pub / médias',
    match: /agence|cr[ée]a|pub\b|publicit|communication|brand|design|digital|m[ée]dia|presse|magazine|radio|t[ée]l[ée]|podcast|influence|rp\b|relations presse|agence_pub|medias/,
    insight: 'Dans une agence ou un média, la food dit quelque chose de la culture maison : elle sert aussi à recevoir les clients, à faire venir la presse et à souder les équipes après une grosse charrette.',
    needs: [
      'Des formats qui ont du style et qui se photographient (image de marque)',
      'Recevoir clients et talents : pitchs, présentations, lancements',
      'Moments d’équipe : afterworks, charrettes, fin de campagne',
      'Possibilité de brander aux couleurs d’un client ou d’une campagne'
    ],
    formats: [
      'Plateaux de minis pour les réunions clients et pitchs : beau, généreux, facile',
      'Live cooking ou stand brandé : pour un lancement, une soirée presse, un afterwork',
      'Lunch boxes individuelles : pour les charrettes et les journées de shooting',
      'Sur mesure : aux couleurs d’une marque cliente ou d’une campagne'
    ],
    moments: 'pitchs, réunions clients, soirées de lancement, afterworks, shootings, fins de campagne',
    proof: 'Soirées de lancement de labels musicaux, soirées Fashion Week',
    catering: '',
    cta: 'Faire livrer une box découverte à l’équipe — demander quel jour leur convient'
  },
  {
    key: 'startup',
    label: 'Startup / tech / coworking',
    match: /startup|start-up|scale|tech|saas|logiciel|software|app\b|fintech|coworking|incubat|station f|french tech|cowork/,
    insight: 'Dans une startup ou un lieu tech, la food fait partie de l’expérience collaborateur : c’est ce qui remplit un all-hands, un onboarding ou un afterwork, et ce dont les nouveaux parlent.',
    needs: [
      'Commandes faciles et récurrentes, sans prise de tête pour l’office manager',
      'Des moments d’équipe qui renforcent la culture (all-hands, onboarding, afterworks)',
      'Volumes qui suivent la croissance, options végétariennes',
      'Budget maîtrisé et prévisible'
    ],
    formats: [
      'Plateaux de minis à partager : all-hands, onboardings, demo days, afterworks',
      'Lunch boxes individuelles : déjeuners d’équipe, offsites, journées de recrutement',
      'Live cooking : pour une soirée d’équipe, une levée de fonds à fêter, un event communauté',
      'Commandes récurrentes : un rendez-vous food régulier (le vendredi midi, par exemple)'
    ],
    moments: 'all-hands, onboardings, afterworks, demo days, meetups, recrutements, offsites',
    proof: 'From Future (événements privés sur mesure)',
    catering: '',
    cta: 'Faire livrer une box découverte pour le prochain afterwork ou all-hands — demander quel jour leur convient'
  },
  {
    key: 'corporate',
    label: 'Cabinet / conseil / banque / immobilier',
    match: /corporate|\brh\b|ressources humaines|avocat|cabinet|juridique|notaire|conseil|consulting|audit|expert[- ]comptable|banque|bank|finance|fonds|asset|private equity|assurance|immobil|immo\b|fonci[èe]re|family office/,
    insight: 'Dans un cabinet ou une institution financière, un déjeuner de travail réussi, c’est un repas qui arrive à l’heure, qui se mange proprement autour d’une table de réunion, et qui fait bonne impression devant un client.',
    needs: [
      'Fiabilité et ponctualité (réunions qui commencent à l’heure, closings)',
      'Présentation soignée qui valorise le cabinet devant ses clients',
      'Facile à manger en réunion, sans couverts ni miettes partout',
      'Commande et facturation simples (devis, facture propre), options végétariennes'
    ],
    formats: [
      'Plateaux de minis pour les réunions et déjeuners clients : élégants, à partager, sans couverts',
      'Lunch boxes individuelles : pour les journées de travail qui s’éternisent ou les closings',
      'Formules premium : lobster roll, saumon fumé, pastrami — de quoi recevoir',
      'Cocktails et soirées clients : mini-boxes ou live cooking pour un événement du cabinet'
    ],
    moments: 'réunions clients, déjeuners de travail, closings, séminaires d’associés, soirées clients, arrivées de collaborateurs',
    proof: 'Les Echos (parmi les meilleurs grilled cheese de Paris), mk2 Cinéma Paradiso au Louvre',
    catering: '',
    cta: 'Proposer une dégustation pour 2-3 personnes de l’équipe (assistantes, office) lors d’une prochaine réunion — demander quel jour leur convient'
  },
  {
    key: 'luxe',
    label: 'Luxe / mode / beauté',
    match: /luxe|luxury|mode|fashion|couture|maison de|joaill|horlog|parfum|beaut[ée]|cosm[ée]ti|showroom|retail premium/,
    insight: 'Dans le luxe et la mode, chaque détail d’un événement doit être à la hauteur de la maison, la food comprise : elle doit surprendre, rester élégante et se fondre dans l’univers de la marque.',
    needs: [
      'Une proposition qui a du caractère tout en restant élégante',
      'Personnalisation fine aux codes de la maison (branding, présentation)',
      'Discrétion et professionnalisme du service',
      'Formats cocktail adaptés aux showrooms, lancements, soirées presse'
    ],
    formats: [
      'Mini-boxes et formats cocktail : lobster roll, saumon fumé, pastrami en bouchées',
      'Live cooking : une animation qui crée la conversation, en showroom ou en soirée',
      'Stand sur mesure aux codes de la maison : présentation et branding personnalisés',
      'Plateaux pour les équipes : Fashion Week, shootings, journées de vente presse'
    ],
    moments: 'Fashion Week, lancements produit, soirées presse, showrooms, ventes privées, shootings',
    proof: 'Soirées Fashion Week, From Future (événements privés sur mesure)',
    catering: 'Pour les coulisses : lunch boxes et plateaux pour les équipes pendant la Fashion Week, les shootings ou les journées presse.',
    cta: 'Faire livrer une box découverte à l’équipe — demander quel jour leur convient'
  },
  {
    key: 'hotel',
    label: 'Hôtels / lieux',
    match: /h[ôo]tel|palace|resort|lieu [ée]v[ée]nementiel|rooftop|venue|salle de r[ée]ception|privatisation/,
    insight: 'Pour un hôtel ou un lieu, proposer à ses clients une offre food différente, sans alourdir sa propre cuisine, c’est un vrai plus commercial sur les séminaires et privatisations.',
    needs: [
      'Une offre complémentaire qui ne concurrence pas leur restauration mais l’enrichit',
      'Une animation forte à proposer à leurs clients séminaires et privatisations',
      'Autonomie complète du prestataire (matériel, équipe, installation)',
      'Image : une adresse reconnue (presse, TV)'
    ],
    formats: [
      'Live cooking : une animation à proposer à vos clients séminaires et privatisations',
      'Stand ou comptoir NY-style : pour un rooftop, une terrasse, une soirée thématique',
      'Mini-boxes et formats cocktail : en complément de votre offre, en grand volume',
      'Sur mesure : on s’intègre à votre lieu et à vos contraintes'
    ],
    moments: 'séminaires, privatisations, soirées thématiques, rooftops, événements clients',
    proof: 'mk2 Cinéma Paradiso au Louvre, From Future',
    catering: '',
    cta: 'Proposer un échange de 10 minutes et une dégustation pour l’équipe commerciale / events du lieu'
  },
  {
    key: 'medical',
    label: 'Médical / santé / labos',
    match: /m[ée]dical|m[ée]decin|clinique|h[ôo]pital|sant[ée]|labo|laboratoire|pharma|biotech|dentaire|cabinet m[ée]dical|infirmi/,
    insight: 'Dans la santé, les équipes enchaînent les horaires longs et décalés : un bon repas livré au bon moment, c’est un vrai geste de reconnaissance, et pour les labos un moyen de réussir un staff ou un congrès.',
    needs: [
      'Livraison fiable à heure précise (staffs, réunions, gardes)',
      'Repas individuels faciles à prendre entre deux urgences',
      'Options végétariennes et variété',
      'Pour les labos : formats pour staffs, formations et congrès'
    ],
    formats: [
      'Lunch boxes individuelles : pour les équipes et les réunions de service',
      'Plateaux de minis à partager : staffs, formations, réunions médicales',
      'Formats cocktail : congrès, soirées scientifiques, inaugurations',
      'Sur mesure : horaires décalés, livraison dans le service'
    ],
    moments: 'staffs, réunions de service, formations, congrès, pots de départ, remerciements aux équipes',
    proof: 'Télérama (street food de haut niveau près du Luxembourg)',
    catering: '',
    cta: 'Proposer une box découverte pour l’équipe — demander quel jour leur convient'
  },
  {
    key: 'ecole',
    label: 'Écoles / universités / BDE',
    match: /[ée]cole|universit|campus|business school|bde\b|bureau des [ée]l[èe]ves|[ée]tudiant|formation|lyc[ée]e|alumni/,
    insight: 'Pour une école, les temps forts (portes ouvertes, remises de diplômes, événements alumni) sont aussi des vitrines : la food y joue un rôle dans l’image laissée aux étudiants, aux familles et aux entreprises partenaires.',
    needs: [
      'Gros volumes à servir vite, souvent debout',
      'Budget maîtrisé par personne',
      'Une animation qui donne une image moderne de l’école',
      'Options végétariennes et variété'
    ],
    formats: [
      'Mini-boxes et formats cocktail : portes ouvertes, remises de diplômes, afterworks alumni',
      'Live cooking : une animation qui marque pour un gala ou un forum entreprises',
      'Plateaux et lunch boxes : jurys, séminaires, conseils, journées de recrutement',
      'Sur mesure : formats et budgets adaptés aux associations et BDE'
    ],
    moments: 'portes ouvertes, remises de diplômes, forums entreprises, galas, afterworks alumni, jurys',
    proof: 'Konbini et Le Bonbon (presse que lisent les étudiants)',
    catering: '',
    cta: 'Proposer une box découverte pour l’équipe événements / relations entreprises — demander quel jour leur convient'
  },
  {
    key: 'institution',
    label: 'Institutions / culture / associations',
    match: /institution|minist[èe]re|mairie|collectivit|ambassade|mus[ée]e|fondation|culture|th[ée][âa]tre|galerie|association|f[ée]d[ée]ration|syndicat|public/,
    insight: 'Pour une institution ou un lieu culturel, une réception réussie doit être conviviale, sans faute de service, et laisser une image moderne, tout en restant simple à commander côté administratif.',
    needs: [
      'Sérieux et fiabilité (protocole, horaires)',
      'Commande et facturation administrative simples (devis, facture en bonne et due forme)',
      'Formats cocktail pour vernissages, inaugurations, réceptions',
      'Une touche de modernité qui change du traiteur classique'
    ],
    formats: [
      'Mini-boxes et formats cocktail : vernissages, inaugurations, réceptions',
      'Live cooking : une animation conviviale pour une soirée ou un événement public',
      'Plateaux et lunch boxes : réunions, conseils, journées de travail',
      'Sur mesure : on s’adapte au lieu, au protocole et aux contraintes'
    ],
    moments: 'vernissages, inaugurations, réceptions, journées portes ouvertes, conseils et réunions',
    proof: 'mk2 Cinéma Paradiso au Louvre (festival en plein air dans la Cour Carrée)',
    catering: '',
    cta: 'Proposer une dégustation pour 2-3 personnes de l’équipe — demander quel jour leur convient'
  }
]

var DEFAULT_PLAYBOOK = {
  key: 'entreprise',
  label: 'Entreprise (générique)',
  match: /.^/,
  insight: 'Dans une entreprise, la food rythme la vie d’équipe : réunions, arrivées, célébrations. Un bon repas livré sans effort, c’est un moment qui rassemble.',
  needs: [
    'Commandes simples, livraison fiable à l’heure',
    'Des formats adaptés aux réunions comme aux moments festifs',
    'Options végétariennes et variété',
    'Budget clair'
  ],
  formats: [
    'Plateaux de minis à partager : réunions, pots, célébrations',
    'Lunch boxes individuelles : déjeuners d’équipe et journées de travail',
    'Live cooking ou stand : pour une soirée d’entreprise ou un événement client',
    'Sur mesure : on s’adapte à vos effectifs et à vos contraintes'
  ],
  moments: 'réunions, déjeuners d’équipe, pots, arrivées, séminaires, soirées d’entreprise',
  proof: 'mk2 Cinéma Paradiso au Louvre',
  catering: '',
  cta: 'Faire livrer une box découverte à l’équipe — demander quel jour leur convient'
}

// Détection du secteur : category/type d'abord (le plus fiable), puis nom + notes.
function resolvePlaybook(p: any) {
  var primary = String((p && (p.category || p.cat || p.type || p.sector)) || '').toLowerCase()
  var secondary = [p && p.name, p && p.notes, p && p.pitch].filter(Boolean).join(' ').toLowerCase()
  var i
  if (primary) {
    for (i = 0; i < SECTOR_PLAYBOOKS.length; i++) if (SECTOR_PLAYBOOKS[i].match.test(primary)) return SECTOR_PLAYBOOKS[i]
  }
  if (secondary) {
    for (i = 0; i < SECTOR_PLAYBOOKS.length; i++) if (SECTOR_PLAYBOOKS[i].match.test(secondary)) return SECTOR_PLAYBOOKS[i]
  }
  return DEFAULT_PLAYBOOK
}

// Exemple de référence validé par Edward (agence événementielle).
// Sert de modèle de TON et de STRUCTURE pour tous les secteurs.
var REFERENCE_EXAMPLE = [
  'Bonjour Lisa,',
  '',
  'Sur un événement, le food fait partie de ce dont les invités se souviennent. C’est là que nous intervenons.',
  '',
  'Meshuga, c’est le deli new-yorkais du 6e arrondissement, et nous nous déplaçons sur vos événements dans le format qui colle à votre brief :',
  '- **Live cooking** : nos chefs préparent les sandwichs à la minute, devant vos invités',
  '- **Stand ou barnum brandé** : aux couleurs de Meshuga ou de votre client',
  '- **Mini-boxes et formats cocktail** : pour un service fluide, debout, en grand volume',
  '- **Sur mesure** : un lieu atypique, une contrainte technique, une idée précise ? On s’adapte',
  '',
  'Nous gérons tout de A à Z (équipe, matériel, installation, service), sans logistique de votre côté. Nous avons notamment assuré le food de soirées de lancement de labels musicaux, pour les artistes comme pour les équipes.',
  '',
  'Nous livrons aussi en format catering, pour tous les moments autour de l’événement : lunch boxes individuelles pour vos équipes en montage ou en tournage, plateaux de sandwichs à partager pour vos briefings et réunions clients, loges et backstage. Les commandes s’adaptent à vos effectifs, des petites équipes aux grosses productions, avec des options végétariennes et une livraison directement sur site, à l’heure qui vous arrange.',
  '',
  'Vous trouverez notre plaquette en pièce jointe, avec nos formules et nos tarifs.',
  '',
  'Le plus simple reste de goûter : je peux vous faire livrer une box découverte pour l’équipe. Dites-moi quel jour vous conviendrait.'
].join('\n')

async function callClaude(system: string, prompt: string, maxTokens: number) {
  var body: any = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  }
  if (system) body.system = system
  var res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  })
  var data = await res.json()
  if (!res.ok) throw new Error((data && data.error && data.error.message) || 'Erreur Anthropic')
  var text = ''
  var blocks = (data && data.content) || []
  for (var i = 0; i < blocks.length; i++) if (blocks[i] && blocks[i].type === 'text') text += blocks[i].text
  return text
}

function buildSystem(senderKey: string, attachPlaquette: boolean) {
  var s = getSender(senderKey)
  var pressList = PRESS_LINKS.map(function (p) { return '- ' + p.key + ' : ' + p.name + ' (' + p.label + ')' }).join('\n')
  var refs = REFERENCES.map(function (r) { return '- ' + r.title + ' — ' + r.detail }).join('\n')
  return [
    'Tu écris des emails de prospection B2B pour Meshuga Events, au nom de ' + s.name + ' (' + s.role + ').',
    'Ton objectif n’est pas de décrire Meshuga : c’est de montrer au prospect qu’on a compris SON métier, ce dont il a le plus besoin, et de lui présenter UNIQUEMENT les formats qui y répondent, dans l’ordre de ce qui compte pour lui.',
    '',
    'CE QU’ON FAIT (catalogue complet — tu n’en prends que ce qui sert ce prospect) :',
    OFFER_SUMMARY,
    '',
    'RÉFÉRENCES PROS (affichées automatiquement sous ton texte dans un encart dédié) :',
    refs,
    '',
    'PRESSE : un encart vidéo « Très Très Bon / Paris Première » et 2-3 liens presse sont ajoutés automatiquement sous ton texte. Tu choisis les 2 articles les plus pertinents pour ce prospect parmi :',
    pressList,
    'Logique : lesechos/telerama → corporate, RH, cabinets, institutions, santé ; konbini/lebonbon → créatif, agences, startups, musique, écoles ; mode/luxe → lesechos + konbini.',
    '',
    'MÉTHODE (dans cet ordre, avant d’écrire) :',
    '1. Lis le PLAYBOOK SECTEUR fourni et les infos du prospect (taille, notes, rôle du contact).',
    '2. Identifie LE besoin n°1 de ce prospect précis (pas du secteur en général : si les notes ou la taille donnent un indice, il prime).',
    '3. Choisis l’accroche : une phrase d’insight sur leur métier, vraie et concrète, puis « C’est là que nous intervenons. » ou équivalent naturel. Jamais de question rhétorique, jamais de compliment creux sur leur entreprise.',
    '4. Sélectionne 3 à 4 formats parmi ceux du playbook, reformulés en « vous » pour LEUR contexte, du plus utile au moins utile.',
    '5. Une phrase de réassurance sur ce qui les inquiète le plus (logistique, ponctualité, présentation, volumes…) + UNE preuve (la référence la plus proche de leur univers).',
    '6. Un paragraphe « catering / livraison » UNIQUEMENT si le playbook en donne un angle ou si c’est leur besoin principal ; sinon tu le sautes.',
    '',
    'STRUCTURE ATTENDUE (calquée sur l’exemple de référence) :',
    '- Salutation',
    '- Accroche insight (1-2 phrases)',
    '- Présentation en une phrase : « Meshuga, c’est le deli new-yorkais du 6e arrondissement, et … » adaptée à ce qu’on fait POUR EUX, terminée par « : »',
    '- Liste à puces de 3-4 formats, chaque ligne au format : - **Nom du format** : bénéfice concret pour eux',
    '- Paragraphe réassurance + preuve',
    '- (Optionnel) Paragraphe catering / livraison',
    (attachPlaquette ? '- Phrase plaquette' : null),
    '- Proposition finale concrète (CTA du playbook) + question fermée simple (« Dites-moi quel jour vous conviendrait. »)',
    '',
    'EXEMPLE DE RÉFÉRENCE (agence événementielle) — c’est le niveau de ton, de précision et la structure à reproduire. Ne le recopie pas pour les autres secteurs : transpose la logique.',
    '---',
    REFERENCE_EXAMPLE,
    '---',
    '',
    'STYLE :',
    '- Français impeccable, vouvoiement, registre pro mais vivant — on est un deli new-yorkais, pas une banque. Phrases courtes.',
    '- Bannis : « je me permets », « n’hésitez pas », « solution sur mesure », « offre unique », « expérience inoubliable », « nous serions ravis », superlatifs gratuits.',
    '- Parle de LEURS moments (cités dans le playbook) plutôt que de nos produits en général.',
    '- Cite au plus UNE référence dans le texte, sans répéter tout l’encart.',
    '- Aucune URL dans le texte. Markdown : uniquement **gras** pour les noms de formats dans la liste, et des lignes commençant par « - » pour les puces.',
    '- NE SIGNE PAS et ne mets pas de formule de politesse finale type « Cordialement » : la signature est ajoutée automatiquement. Termine sur la question du CTA.',
    '- Salutation : « Bonjour <Prénom>, » si le prénom est connu, sinon « Bonjour, ».',
    (attachPlaquette
      ? '- Notre plaquette PDF (formules, créations, tarifs, conditions) est jointe : mentionne-la UNE fois, juste avant la proposition finale (« Vous trouverez notre plaquette en pièce jointe, avec nos formules et nos tarifs. »). Ne détaille pas les prix.'
      : '- Aucune pièce jointe : ne parle PAS de plaquette ni de pièce jointe. Ne cite pas de prix précis.'),
    '- N’invente aucun chiffre, prix, client, délai ou fait non fourni. La marque s’écrit « Meshuga » (jamais « Crazy Deli »).',
    '',
    'FORMAT DE SORTIE : UNIQUEMENT un objet JSON valide, sans texte autour ni balises de code :',
    '{"subject": "...", "body": "...", "pressKeys": ["clé1", "clé2"]}',
    'Dans "body", sépare les paragraphes par \\n\\n et les lignes de la liste à puces par \\n. Objet : court (< 60 caractères), concret, qui parle de leurs moments (ex. « Le food de vos prochains événements »), sans emoji ni majuscules criardes.'
  ].filter(function (l) { return l !== null }).join('\n')
}

function buildPlaybookBlock(pb: any) {
  var lines: string[] = []
  lines.push('PLAYBOOK SECTEUR : ' + pb.label)
  lines.push('- Insight métier : ' + pb.insight)
  lines.push('- Leurs besoins prioritaires (du plus au moins important) :')
  pb.needs.forEach(function (n: string, i: number) { lines.push('  ' + (i + 1) + '. ' + n) })
  lines.push('- Formats à mettre en avant (dans cet ordre, à reformuler pour eux) :')
  pb.formats.forEach(function (f: string) { lines.push('  • ' + f) })
  lines.push('- Leurs moments clés : ' + pb.moments)
  lines.push('- Preuve la plus parlante : ' + pb.proof)
  lines.push('- Angle catering / livraison : ' + (pb.catering || 'aucun paragraphe dédié (sauf si les notes du prospect le justifient)'))
  lines.push('- Proposition finale : ' + pb.cta)
  return lines.join('\n')
}

function buildPrompt(p: any, emailType: string, pb: any) {
  var first = String(p.contactFirstName || '').trim()
  var lines: string[] = []
  lines.push('PROSPECT')
  lines.push('- Entreprise : ' + (p.name || '?'))
  if (p.category || p.type) lines.push('- Secteur (CRM) : ' + (p.category || p.type))
  if (p.size || p.taille) lines.push('- Taille : ' + (p.size || p.taille))
  if (p.city || p.arrondissement || p.arr) lines.push('- Localisation : ' + [p.arrondissement || p.arr, p.city].filter(Boolean).join(' '))
  var role = String(p.contactRole || (p.contact_role && p.contact_role !== '—' ? p.contact_role : '') || '').trim()
  var fullName = [first, p.contactLastName].filter(Boolean).join(' ') || (p.contact_name && p.contact_name !== '—' ? String(p.contact_name) : '')
  if (fullName) lines.push('- Contact : ' + fullName + (role ? ' (' + role + ')' : ''))
  else if (role) lines.push('- Rôle du contact : ' + role)
  var notes = String(p.notes || p.pitch || '').trim()
  if (notes) lines.push('- Notes internes (contexte prioritaire, ne pas citer telles quelles) : ' + notes.slice(0, 800))
  lines.push('')
  lines.push(buildPlaybookBlock(pb))
  lines.push('')
  if (role) {
    lines.push('Adapte l’angle au rôle du contact : un office manager / assistant(e) veut de la simplicité et de la fiabilité ; un chef de projet / producteur veut de l’effet et zéro logistique ; un dirigeant / associé veut l’image et le résultat.')
    lines.push('')
  }
  var history = String(p.__history || '').trim()
  if (history) {
    lines.push('HISTORIQUE DES ÉCHANGES (ne répète pas les mêmes arguments ni la même accroche) :')
    lines.push(history.slice(0, 1500))
    lines.push('')
  }
  if (emailType === 'relance' && Number(p.__step) >= 2) {
    lines.push('TYPE : DERNIÈRE RELANCE (3e contact, toujours pas de réponse). 40-70 mots, PAS de liste à puces. Ton léger, une pointe d’humour deli new-yorkais possible, aucune culpabilisation. Propose une porte de sortie simple (« si ce n’est pas le bon moment, dites-le-moi et je ne vous embête plus ») ET la proposition du playbook une dernière fois. Si un autre interlocuteur serait plus pertinent, demande-le.')
  } else if (emailType === 'relance') {
    lines.push('TYPE : RELANCE (2e contact, pas de réponse au premier mail). Très court (60-90 mots), PAS de liste à puces. Chaleureux, jamais insistant. Un angle nouveau tiré du playbook (un de leurs moments clés à venir, ou un autre format), puis rappel de la proposition du playbook.')
  } else if (emailType === 'devis_relance') {
    lines.push('TYPE : SUIVI DE DEVIS (un devis leur a été envoyé). Très court (60-90 mots), PAS de liste à puces. Demande si tout est clair, propose d’ajuster (formats, volumes, options végétariennes) ou un appel de 5 min. Aucune pression.')
  } else {
    lines.push('TYPE : PREMIER CONTACT. 170-260 mots (liste comprise). Suis la STRUCTURE ATTENDUE et le PLAYBOOK SECTEUR.')
  }
  return lines.join('\n')
}

function parseJson(text: string): any {
  var clean = String(text || '').replace(/```json|```/g, '').trim()
  var a = clean.indexOf('{')
  var b = clean.lastIndexOf('}')
  if (a >= 0 && b > a) {
    try { return JSON.parse(clean.slice(a, b + 1)) } catch (e) { /* fallback */ }
  }
  // Fallback : "Objet : ..." puis corps
  var m = clean.match(/^\s*Objet\s*:\s*(.+)\n([\s\S]*)$/i)
  if (m) return { subject: m[1].trim(), body: m[2].trim() }
  return { subject: '', body: clean }
}

// Filet de sécurité : retire une éventuelle signature / formule finale ajoutée par le modèle.
function stripSignoff(body: string): string {
  var lines = body.split('\n')
  while (lines.length && /^\s*$/.test(lines[lines.length - 1])) lines.pop()
  var re = /^\s*(cordialement|bien cordialement|bien à vous|belle journée|à très vite|à bientôt|edward|emy|edward touret|emy soulabaille|l[’']équipe meshuga)[\s,.!]*$/i
  var guard = 0
  while (lines.length && re.test(lines[lines.length - 1]) && guard < 3) {
    lines.pop()
    while (lines.length && /^\s*$/.test(lines[lines.length - 1])) lines.pop()
    guard++
  }
  return lines.join('\n')
}


// ------------------------------------------------------------
// API publique — EMAIL
// ------------------------------------------------------------
export async function generateProspectEmail(opts: any) {
  var p = (opts && opts.prospect) || {}
  var emailType = String((opts && opts.emailType) || 'first')
  var senderKey = opts && opts.senderKey === 'emy' ? 'emy' : 'edward'
  var attachPlaquette = !(opts && opts.attachPlaquette === false)
  var pb = resolvePlaybook(p)
  var raw = await callClaude(buildSystem(senderKey, attachPlaquette), buildPrompt(p, emailType, pb), 1600)
  var out = parseJson(raw)
  var pressKeys = sanitizePressKeys(out.pressKeys)
  if (pressKeys.length === 0) pressKeys = defaultPressKeys(p.category || p.cat || p.type)
  var bodyText = stripSignoff(String(out.body || '').replace(/\\n/g, '\n').trim())
  return {
    subject: String(out.subject || 'Meshuga Events × ' + (p.name || 'vos équipes')).trim(),
    body: bodyText,
    pressKeys: pressKeys,
    sector: pb.key
  }
}

export function getPlaybookKey(p: any): string {
  return resolvePlaybook(p).key
}

// ------------------------------------------------------------
// API publique — LINKEDIN
// kind : 'linkedin_invite' | 'linkedin_inmail' | 'linkedin_message'
// ------------------------------------------------------------
export var LINKEDIN_LIMITS = { invite: 300, inmailSubject: 200, inmailBody: 1900, message: 1900 }

export async function generateLinkedinMessage(opts: any) {
  var p = (opts && opts.prospect) || {}
  var kind = String((opts && opts.kind) || 'linkedin_invite')
  var senderKey = opts && opts.senderKey === 'emy' ? 'emy' : 'edward'
  var s = getSender(senderKey)
  var pb = resolvePlaybook(p)
  var role = String(p.contactRole || (p.contact_role && p.contact_role !== '—' ? p.contact_role : '') || '').trim()
  var first = String(p.contactFirstName || '').trim() || String(p.contact_name && p.contact_name !== '—' ? p.contact_name : '').split(' ')[0]

  var system = [
    'Tu écris des messages LinkedIn de prospection pour Meshuga Events, au nom de ' + s.name + ' (' + s.role + '), à la première personne.',
    'Meshuga = deli new-yorkais du 6e (3 rue Vavin), traiteur et animations food pour les entreprises et les événements.',
    '',
    'CE QU’ON FAIT :',
    OFFER_SUMMARY,
    '',
    'RÈGLES LINKEDIN :',
    '- On écrit à une personne, pas à une entreprise : ton humain, direct, zéro jargon marketing, vouvoiement.',
    '- Aucune URL, aucun emoji, aucun markdown, aucune liste à puces.',
    '- Ne parle jamais de plaquette jointe (impossible sur LinkedIn) : propose de l’envoyer par mail.',
    '- Bannis : « je me permets », « n’hésitez pas », « solution sur mesure », « synergies », « je serais ravi(e) d’échanger ».',
    '- N’invente aucun fait, chiffre, client ou point commun avec la personne.',
    '- Ne signe pas avec une formule longue : au plus le prénom « ' + s.firstName + ' » à la fin pour InMail/message, rien pour une invitation.',
    '',
    'FORMAT DE SORTIE : UNIQUEMENT un objet JSON valide : {"subject": "...", "body": "..."} (subject vide pour une invitation ou un message).'
  ].join('\n')

  var lines: string[] = []
  lines.push('PROSPECT')
  lines.push('- Entreprise : ' + (p.name || '?'))
  if (first) lines.push('- Prénom : ' + first)
  if (role) lines.push('- Poste : ' + role)
  var notes = String(p.notes || p.pitch || '').trim()
  if (notes) lines.push('- Notes internes (ne pas citer) : ' + notes.slice(0, 600))
  lines.push('')
  lines.push('ANGLE SECTEUR (' + pb.label + ')')
  lines.push('- Insight : ' + pb.insight)
  lines.push('- Besoin n°1 : ' + pb.needs[0])
  lines.push('- Formats les plus utiles : ' + pb.formats.slice(0, 2).join(' / '))
  lines.push('- Moments clés : ' + pb.moments)
  lines.push('')
  if (kind === 'linkedin_invite') {
    lines.push('TYPE : NOTE D’INVITATION. MAXIMUM 280 caractères espaces compris (limite LinkedIn 300). « Bonjour ' + (first || '') + ', » puis 1 phrase sur leur univers, 1 phrase sur ce qu’on fait pour des équipes comme la leur, et une raison simple de se connecter. Pas de proposition commerciale lourde.')
  } else if (kind === 'linkedin_inmail') {
    lines.push('TYPE : INMAIL (personne non connectée). Objet ≤ 60 caractères, concret, qui parle de leurs moments (pas de « Proposition de partenariat »). Corps 450-700 caractères : salutation, insight métier, 2 formats en une phrase, une preuve (' + pb.proof + '), puis proposition : ' + pb.cta + ' — et propose d’envoyer la plaquette par mail. Termine par une question simple puis « ' + s.firstName + ' ».')
  } else {
    lines.push('TYPE : MESSAGE À UNE RELATION (la personne a accepté l’invitation). 300-500 caractères : remercie en une demi-phrase, insight, ce qu’on peut faire pour eux, proposition : ' + pb.cta + '. Question finale simple puis « ' + s.firstName + ' ».')
  }

  var raw = await callClaude(system, lines.join('\n'), 700)
  var out = parseJson(raw)
  var subject = String(out.subject || '').trim()
  var body = String(out.body || '').replace(/\\n/g, '\n').trim()
  if (kind === 'linkedin_invite') {
    subject = ''
    if (body.length > LINKEDIN_LIMITS.invite) body = body.slice(0, LINKEDIN_LIMITS.invite - 1).replace(/\s+\S*$/, '') + '…'
  }
  if (subject.length > LINKEDIN_LIMITS.inmailSubject) subject = subject.slice(0, LINKEDIN_LIMITS.inmailSubject)
  if (body.length > LINKEDIN_LIMITS.inmailBody) body = body.slice(0, LINKEDIN_LIMITS.inmailBody)
  return { subject: subject, body: body, sector: pb.key, kind: kind }
}
