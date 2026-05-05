// ============================================================
// rhConstants.ts
// ============================================================
// Constantes et fonctions utilitaires partagées par tout le module RH.
// Centralisé ici pour éviter la duplication entre wizard, builders, et tab.
//
// Sections :
//   1. MESHUGA_LEGAL   — données légales sociétés (figées)
//   2. NATIONALITES    — liste exhaustive (180+ pays)
//   3. SMIC & CCN      — barèmes 2026
//   4. CCN_GRILLE      — niveaux + échelons + minima
//   5. PERIODE_ESSAI   — table légale par statut
//   6. TEMPLATE_MISSIONS — missions par défaut pour chaque template CDI
//   7. AVANTAGES_NATURE — barèmes URSSAF
//   8. numToFrenchWords — conversion chiffres → lettres
//   9. validators      — garde-fous SMIC, CCN, période d'essai
// ============================================================

// === 1. MESHUGA_LEGAL — données légales (figées) ===
export var MESHUGA_LEGAL = {
  aegia_food: {
    nom: "AEGIA FOOD",
    forme: "Société par Actions Simplifiée",
    capital: "1 000",
    siren: "904 639 531",
    siret: "904 639 531 00014",
    rcs: "Paris 904 639 531",
    tva: "FR31 904 639 531",
    ape: "5610C",
    adresse: "3 rue Vavin, 75006 Paris",
    enseigne: "MESHUGA Crazy Deli"
  },
  sas_aegia: {
    nom: "SAS AEGIA",
    forme: "Société par Actions Simplifiée",
    capital: "1 000",
    siren: "889 354 965",
    siret: "889 354 965 00028",
    rcs: "Paris 889 354 965",
    tva: "FR76 889 354 965",
    adresse: "78 avenue des Champs-Élysées, Bureau 326, 75008 Paris"
  },
  president: "Edward TOURET",
  retraite: {
    nom: "KLESIA Retraite AGIRC-ARRCO",
    adresse: "4 rue Georges Picquart, 75017 Paris"
  },
  // Service de santé au travail (médecine du travail)
  medecine_travail: {
    nom: "Efficience — Centre Vaugirard",
    adresse: "64 rue de Vaugirard, 75006 Paris",
    telephone: "01 45 44 23 71"
  },
  // Organisme de complémentaire santé (mutuelle)
  complementaire_sante: {
    nom: "APRIL Santé",
    adresse: "12 rue Juliette Récamier, 69006 Lyon"
  },
  // Organisme de prévoyance
  prevoyance: {
    nom: "GAN EUROCOURTAGE VIE",
    adresse: "8-10 rue d'Astorg, 75008 Paris"
  }
}

// === 2. NATIONALITES — 180+ pays au féminin ===
export var NATIONALITES = [
  "afghane","albanaise","algérienne","allemande","américaine","andorrane","angolaise","antiguaise",
  "argentine","arménienne","australienne","autrichienne","azerbaïdjanaise","bahaméenne","bahreïnienne",
  "bangladaise","barbadienne","biélorusse","belge","bélizienne","béninoise","bhoutanaise","bolivienne",
  "bosnienne","botswanaise","brésilienne","britannique","brunéienne","bulgare","burkinabée","burundaise",
  "cambodgienne","camerounaise","canadienne","cap-verdienne","centrafricaine","chilienne","chinoise",
  "chypriote","colombienne","comorienne","congolaise","congolaise (RDC)","costaricienne","croate","cubaine",
  "danoise","djiboutienne","dominicaine","dominicaise","égyptienne","émirienne","équatorienne","érythréenne",
  "espagnole","estonienne","éthiopienne","fidjienne","finlandaise","française","gabonaise","gambienne",
  "géorgienne","ghanéenne","grecque","grenadienne","guatémaltèque","guinéenne","guinéenne-bissau",
  "guinéenne équatoriale","guyanienne","haïtienne","hondurienne","hongroise","indienne","indonésienne",
  "irakienne","iranienne","irlandaise","islandaise","israélienne","italienne","ivoirienne","jamaïcaine",
  "japonaise","jordanienne","kazakhe","kényane","kirghize","kiribatienne","kittitienne-et-névicienne",
  "koweïtienne","laotienne","lesothane","lettone","libanaise","libérienne","libyenne","liechtensteinoise",
  "lituanienne","luxembourgeoise","macédonienne","malaisienne","malawite","maldivienne","malgache",
  "malienne","maltaise","marocaine","marshallaise","mauricienne","mauritanienne","mexicaine",
  "micronésienne","moldave","monégasque","mongole","monténégrine","mozambicaine","namibienne","nauruane",
  "néerlandaise","néo-zélandaise","népalaise","nicaraguayenne","nigériane","nigérienne","norvégienne",
  "omanaise","ougandaise","ouzbèke","pakistanaise","palaosienne","palestinienne","panaméenne",
  "papouane-néo-guinéenne","paraguayenne","péruvienne","philippine","polonaise","portugaise","qatarienne",
  "roumaine","russe","rwandaise","saint-lucienne","saint-marinaise","saint-vincentaise","salomonaise",
  "salvadorienne","samoane","santoméenne","saoudienne","sénégalaise","serbe","seychelloise",
  "sierra-léonaise","singapourienne","slovaque","slovène","somalienne","soudanaise","sud-africaine",
  "sud-coréenne","sud-soudanaise","sri-lankaise","suédoise","suisse","surinamaise","syrienne",
  "tadjike","taïwanaise","tanzanienne","tchadienne","tchèque","thaïlandaise","timoraise","togolaise",
  "tonguienne","trinidadienne","tunisienne","turkmène","turque","tuvaluane","ukrainienne","uruguayenne",
  "vanuatuane","vaticane","vénézuélienne","vietnamienne","yéménite","zambienne","zimbabwéenne"
]

// === 3. SMIC 2026 ===
// Décret n° 2025-1228 du 17 décembre 2025 (JO du 18/12/2025)
export var SMIC_2026 = {
  horaire: 12.02,         // €/h brut
  mensuel_35h: 1823.03,   // €/mois pour 151,67h
  mensuel_39h: 2117.79,   // €/mois pour 169h (estimation avec majoration 25%)
  minimum_garanti: 4.25   // pour avantages en nature
}

// === 4. CCN 1501 — Grille des minima conventionnels ===
// Avenant n° 72 du 5 juin 2025, applicable depuis le 1er juin 2025.
// Source : Éditions Tissot / fiche-paie.net
// Niveaux I à IV : taux horaire brut. Niveau V : annuel brut.
export var CCN_GRILLE = {
  "I-A":   { taux_horaire: 12.02, label: "Niveau I — Échelon A (agent de restauration débutant)", statut: "non-cadre" },
  "I-B":   { taux_horaire: 12.10, label: "Niveau I — Échelon B (agent de restauration confirmé)", statut: "non-cadre" },
  "II-A":  { taux_horaire: 12.30, label: "Niveau II — Échelon A (employé qualifié)", statut: "non-cadre" },
  "II-B":  { taux_horaire: 12.55, label: "Niveau II — Échelon B (employé qualifié confirmé)", statut: "non-cadre" },
  "III-A": { taux_horaire: 12.82, label: "Niveau III — Échelon A (employé hautement qualifié)", statut: "non-cadre" },
  "III-B": { taux_horaire: 13.10, label: "Niveau III — Échelon B (employé hautement qualifié confirmé)", statut: "non-cadre" },
  "IV-A":  { taux_horaire: 15.01, label: "Niveau IV — Échelon A (agent de maîtrise)", statut: "non-cadre" },
  "IV-B":  { taux_horaire: 15.50, label: "Niveau IV — Échelon B (agent de maîtrise confirmé)", statut: "non-cadre" },
  "IV-C":  { taux_horaire: 16.00, label: "Niveau IV — Échelon C (agent de maîtrise senior)", statut: "non-cadre" },
  "V-A":   { taux_horaire: 17.00, label: "Niveau V — Échelon A (cadre)", statut: "cadre" },
  "V-B":   { taux_horaire: 18.50, label: "Niveau V — Échelon B (cadre confirmé)", statut: "cadre" }
}

// Liste des clés ordonnées (pour les selects)
export var CCN_KEYS = ["I-A","I-B","II-A","II-B","III-A","III-B","IV-A","IV-B","IV-C","V-A","V-B"]

// === 5. PERIODE_ESSAI — Durées légales maximales ===
// Source : article L.1221-19 du Code du travail + CCN 1501
// Format : { initiale_max_mois, total_avec_renouv_max_mois }
export var PERIODE_ESSAI_MAX = {
  "ouvrier_employe": { initiale: 2, total: 4 },     // Niveaux I-II-III
  "agent_maitrise":  { initiale: 3, total: 6 },     // Niveau IV (max légal, mais souvent 2+2 en pratique)
  "cadre":           { initiale: 4, total: 8 }      // Niveau V
}

// Helper : retourne le plafond légal selon le niveau CCN
export function periodeEssaiMax(niveauKey) {
  if (!niveauKey) return PERIODE_ESSAI_MAX.ouvrier_employe
  if (niveauKey.indexOf("V-") === 0) return PERIODE_ESSAI_MAX.cadre
  if (niveauKey.indexOf("IV-") === 0) return PERIODE_ESSAI_MAX.agent_maitrise
  return PERIODE_ESSAI_MAX.ouvrier_employe
}

// === 6. TEMPLATE_MISSIONS — Missions par défaut pour chaque type de CDI ===

export var MISSIONS_CUISINIER = [
  {
    title: "A. Préparation et production",
    items: [
      "Préparation, assemblage et cuisson des produits selon les fiches techniques",
      "Respect des standards de qualité et de présentation MESHUGA",
      "Mise en place et remise en état du poste de travail avant et après service",
      "Gestion des préparations à l'avance (mise en place du jour)"
    ]
  },
  {
    title: "B. Hygiène et sécurité alimentaire",
    items: [
      "Application stricte des normes HACCP (arrêté du 21/12/2009)",
      "Tenue à jour des relevés de température et fiches de traçabilité",
      "Nettoyage et désinfection des équipements et du plan de travail",
      "Rotation des stocks selon le principe FIFO (premier entré, premier sorti)"
    ]
  },
  {
    title: "C. Approvisionnement et stocks",
    items: [
      "Réception et contrôle des livraisons fournisseurs",
      "Rangement des marchandises selon les règles d'hygiène",
      "Signalement des ruptures et besoins de réapprovisionnement",
      "Participation à l'inventaire mensuel"
    ]
  },
  {
    title: "D. Polyvalence et travail d'équipe",
    items: [
      "Aide ponctuelle au service en salle ou à la caisse selon les besoins",
      "Coopération avec l'équipe pour fluidifier le service",
      "Formation des nouveaux arrivants sur les recettes et procédures",
      "Toute tâche connexe relevant strictement de sa qualification"
    ]
  }
]

export var MISSIONS_CAISSIER = [
  {
    title: "A. Accueil et service client",
    items: [
      "Accueil chaleureux et personnalisé de la clientèle",
      "Présentation de la carte, conseil et prise de commande",
      "Service en salle ou au comptoir selon l'organisation",
      "Garantie de la satisfaction client"
    ]
  },
  {
    title: "B. Encaissement et caisse",
    items: [
      "Encaissement des commandes (espèces, CB, titres-restaurant)",
      "Tenue de la caisse et contrôle des écarts en fin de service",
      "Application des promotions et codes en cours",
      "Édition et remise des reçus / factures simplifiées"
    ]
  },
  {
    title: "C. Préparation et assemblage",
    items: [
      "Assemblage des produits proposés à la carte (sandwiches, salades, boissons)",
      "Garnissage selon les fiches techniques MESHUGA",
      "Respect des standards de présentation et de qualité",
      "Préparation des commandes à emporter"
    ]
  },
  {
    title: "D. Tenue de l'établissement",
    items: [
      "Mise en place et remise en état du comptoir et de la salle",
      "Réapprovisionnement des présentoirs et vitrines",
      "Nettoyage régulier de l'espace client",
      "Application des règles d'hygiène (HACCP)"
    ]
  }
]

// Missions du template cadre (Emy par défaut, mais éditable)
export var MISSIONS_CADRE_DEFAULT = [
  {
    title: "A. Direction opérationnelle du restaurant",
    items: [
      "Supervision quotidienne de l'exploitation du restaurant",
      "Organisation du service, des flux et du fonctionnement général",
      "Garantie de la qualité globale de l'expérience client",
      "Anticipation et résolution des problématiques opérationnelles",
      "Mise en place et amélioration continue des process internes"
    ]
  },
  {
    title: "B. Image, expérience client et représentation de la marque",
    items: [
      "Garantie de la cohérence de l'image, de l'ADN et du positionnement de MESHUGA",
      "Supervision de l'accueil client, du ton, de la posture et du niveau d'exigence terrain",
      "Représentation de l'enseigne auprès des clients, partenaires et interlocuteurs externes",
      "Proposition d'axes d'amélioration du concept et de l'expérience globale"
    ]
  },
  {
    title: "C. Développement B2B et partenariats",
    items: [
      "Définition et mise en œuvre de la stratégie B2B (traiteur, entreprises, événements, collaborations)",
      "Prospection commerciale, négociation et closing",
      "Suivi et développement du chiffre d'affaires B2B",
      "Organisation et coordination opérationnelle des prestations B2B",
      "Suivi de la satisfaction client et de la rentabilité"
    ]
  },
  {
    title: "D. Achats et gestion fournisseurs",
    items: [
      "Gestion des achats (matières premières, consommables, prestataires)",
      "Relations fournisseurs et négociations",
      "Suivi des coûts, optimisation des marges et gestion des stocks",
      "Anticipation des besoins opérationnels"
    ]
  },
  {
    title: "E. Ressources humaines",
    items: [
      "Participation au recrutement et à l'intégration des équipes",
      "Organisation et suivi des plannings",
      "Management opérationnel terrain",
      "Contribution au maintien d'un climat social sain et exigeant",
      "Remontée des sujets RH au dirigeant"
    ]
  },
  {
    title: "F. Structuration, pilotage et reporting",
    items: [
      "Mise en place et suivi d'outils de pilotage et de reporting",
      "Suivi des indicateurs clés de performance (CA, coûts, rentabilité)",
      "Contribution aux décisions stratégiques de développement",
      "Rôle de relais opérationnel du dirigeant"
    ]
  }
]

// === 7. AVANTAGES_NATURE — Barèmes URSSAF 2026 ===
export var AVANTAGES_NATURE = {
  repas_forfait: 4.25  // €/repas (URSSAF 2026, identique au minimum garanti)
}

// === 8. numToFrenchWords — Conversion chiffres → lettres ===
// Gère jusqu'à 999 999. Règles françaises (vingts/cents pluriel, "et un", soixante-dix, quatre-vingts).
export function numToFrenchWords(num) {
  if (num === null || num === undefined || num === "") return ""
  var n = parseFloat(num)
  if (isNaN(n)) return ""
  var intPart = Math.floor(n)
  var cents = Math.round((n - intPart) * 100)
  var unites = ["zéro","un","deux","trois","quatre","cinq","six","sept","huit","neuf","dix","onze","douze","treize","quatorze","quinze","seize","dix-sept","dix-huit","dix-neuf"]
  var dizaines = ["","","vingt","trente","quarante","cinquante","soixante","soixante","quatre-vingt","quatre-vingt"]
  function below100(v) {
    if (v < 20) return unites[v]
    var d = Math.floor(v / 10)
    var u = v % 10
    if (d === 7 || d === 9) {
      var base = dizaines[d]
      var rest = (d === 7 ? 10 + u : 10 + u)
      return base + "-" + unites[rest]
    }
    if (u === 0) return dizaines[d] + (d === 8 ? "s" : "")
    if (u === 1 && d !== 8) return dizaines[d] + " et un"
    return dizaines[d] + "-" + unites[u]
  }
  function below1000(v) {
    if (v < 100) return below100(v)
    var c = Math.floor(v / 100)
    var rest = v % 100
    var prefix = c === 1 ? "cent" : unites[c] + " cent" + (rest === 0 ? "s" : "")
    if (rest === 0) return prefix
    return prefix + " " + below100(rest)
  }
  var result = ""
  if (intPart === 0) result = "zéro"
  else if (intPart < 1000) result = below1000(intPart)
  else if (intPart < 1000000) {
    var th = Math.floor(intPart / 1000)
    var rest = intPart % 1000
    var prefix = th === 1 ? "mille" : below1000(th) + " mille"
    result = rest === 0 ? prefix : prefix + " " + below1000(rest)
  } else {
    return String(num)
  }
  if (cents > 0) {
    result += " euros et " + below100(cents) + " centime" + (cents > 1 ? "s" : "")
  }
  return result
}

// === 9. Validators — Garde-fous contractuels ===

// Calcule le taux horaire de base à partir d'un salaire brut mensuel et d'heures hebdo,
// en intégrant les heures sup majorées 25% (au-delà de 35h légales).
// Renvoie { taux_base, heures_normales, heures_sup, total_check }
export function calcTauxHoraireBase(salaireBrutMensuel, heuresHebdo) {
  var s = parseFloat(salaireBrutMensuel)
  var h = parseFloat(heuresHebdo)
  if (isNaN(s) || isNaN(h) || s <= 0 || h <= 0) return null
  var heuresMensuelles = h * 52 / 12
  var heuresNormales = Math.min(heuresMensuelles, 151.67)
  var heuresSup = Math.max(0, heuresMensuelles - 151.67)
  // s = T * heuresNormales + T * heuresSup * 1.25
  // => T = s / (heuresNormales + heuresSup * 1.25)
  var T = s / (heuresNormales + heuresSup * 1.25)
  return {
    taux_base: Math.round(T * 100) / 100,
    heures_normales: Math.round(heuresNormales * 100) / 100,
    heures_sup: Math.round(heuresSup * 100) / 100,
    heures_mensuelles: Math.round(heuresMensuelles * 100) / 100
  }
}

// Vérifie qu'un salaire respecte le SMIC 2026
export function checkSmic(tauxHoraireBase) {
  var t = parseFloat(tauxHoraireBase)
  if (isNaN(t)) return { ok: false, message: "Taux horaire invalide" }
  if (t < SMIC_2026.horaire) {
    return { ok: false, message: "Taux horaire (" + t.toFixed(2) + " €) inférieur au SMIC 2026 (" + SMIC_2026.horaire + " €/h)" }
  }
  return { ok: true }
}

// Vérifie qu'un salaire respecte le minimum CCN du niveau choisi
export function checkCcnMinimum(tauxHoraireBase, niveauKey) {
  var t = parseFloat(tauxHoraireBase)
  if (isNaN(t) || !niveauKey || !CCN_GRILLE[niveauKey]) return { ok: true }
  var min = CCN_GRILLE[niveauKey].taux_horaire
  if (t < min) {
    return { ok: false, message: "Taux horaire (" + t.toFixed(2) + " €) inférieur au minimum CCN " + niveauKey + " (" + min + " €/h)" }
  }
  return { ok: true }
}

// Vérifie qu'une période d'essai respecte le plafond légal selon le niveau CCN
export function checkPeriodeEssai(moisInitiale, renouvelable, niveauKey) {
  var m = parseInt(moisInitiale, 10)
  var max = periodeEssaiMax(niveauKey)
  if (isNaN(m) || m < 0) return { ok: false, message: "Période d'essai invalide" }
  if (m > max.initiale) {
    return { ok: false, message: "Période d'essai initiale (" + m + " mois) supérieure au plafond légal (" + max.initiale + " mois pour ce niveau)" }
  }
  if (renouvelable && (m * 2) > max.total) {
    return { ok: false, message: "Période d'essai totale avec renouvellement (" + (m * 2) + " mois) supérieure au plafond légal (" + max.total + " mois)" }
  }
  return { ok: true }
}

// === 10. Helpers de formatage ===

export function formatEuros(num) {
  if (num === null || num === undefined || num === "") return "—"
  var n = parseFloat(num)
  if (isNaN(n)) return "—"
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
}

export function formatDateFr(dateStr) {
  if (!dateStr) return "—"
  try {
    var d = new Date(dateStr)
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  } catch (e) {
    return dateStr
  }
}

// === 11. Types de contrat — labels et métadonnées UI ===
export var CONTRACT_TYPES = [
  {
    key: "extra",
    label: "Contrat d'extra",
    sublabel: "CDD d'usage · ponctuel",
    icon: "⏱",
    color: "#FFEB5A"
  },
  {
    key: "cdi_cuisinier",
    label: "CDI Cuisinier(ère)",
    sublabel: "Niveau I à III · cuisine",
    icon: "👨‍🍳",
    color: "#FF82D7"
  },
  {
    key: "cdi_caissier",
    label: "CDI Caissier(ère) / Équipier(ère)",
    sublabel: "Niveau I à II · salle / caisse",
    icon: "🛎️",
    color: "#FF82D7"
  },
  {
    key: "cdi_cadre",
    label: "CDI Responsable / Manager",
    sublabel: "Niveau IV à V · postes à responsabilités",
    icon: "🎯",
    color: "#191923"
  }
]

export function getContractTypeMeta(typeKey) {
  for (var i = 0; i < CONTRACT_TYPES.length; i++) {
    if (CONTRACT_TYPES[i].key === typeKey) return CONTRACT_TYPES[i]
  }
  return CONTRACT_TYPES[0]
}

// ============================================================
// TYPES DE DOCUMENTS RH (employé + contrat)
// ============================================================
// Documents persistants liés au salarié (suivent la personne, pas le contrat)
export var EMPLOYEE_DOC_TYPES = [
  { key: "cni",            label: "Pièce d'identité (CNI)",         icon: "📇" },
  { key: "passeport",      label: "Passeport",                      icon: "📘" },
  { key: "titre_sejour",   label: "Titre de séjour / visa travail", icon: "🌍" },
  { key: "secu",           label: "Carte vitale / attestation Sécu",icon: "🏥" },
  { key: "mutuelle",       label: "Carte de mutuelle",              icon: "💊" },
  { key: "rib",            label: "RIB",                            icon: "🏦" },
  { key: "diplome",        label: "Diplôme / certification",        icon: "📜" },
  { key: "haccp",          label: "Formation HACCP / hygiène",      icon: "🍽️" },
  { key: "casier",         label: "Casier judiciaire (B3)",         icon: "⚖️" },
  { key: "justif_domicile",label: "Justificatif de domicile",       icon: "🏠" },
  { key: "cv",             label: "CV",                             icon: "📄" },
  { key: "lettre_motiv",   label: "Lettre de motivation",           icon: "✉️" },
  { key: "permis",         label: "Permis de conduire",             icon: "🚗" },
  { key: "visite_medicale",label: "Visite médicale d'aptitude",     icon: "👨‍⚕️" },
  { key: "attestation_emp",label: "Attestation employeur précédent",icon: "📑" },
  { key: "pole_emploi",    label: "Document Pôle Emploi",           icon: "💼" },
  { key: "avis_imposition",label: "Avis d'imposition",              icon: "📊" },
  { key: "autre",          label: "Autre document",                 icon: "📁" }
]

// Documents liés à un contrat (mensuels/ponctuels)
export var CONTRACT_DOC_TYPES = [
  { key: "fiche_paie",            label: "Fiche de paie",                icon: "💰", needsPeriod: true },
  { key: "contrat_signe",         label: "Contrat signé",                icon: "✍️", needsPeriod: false },
  { key: "avenant",               label: "Avenant au contrat",           icon: "📋", needsPeriod: false },
  { key: "lettre_demission",      label: "Lettre de démission",          icon: "🚪", needsPeriod: false },
  { key: "lettre_licenciement",   label: "Lettre de licenciement",       icon: "🚫", needsPeriod: false },
  { key: "rupture_conv",          label: "Rupture conventionnelle",      icon: "🤝", needsPeriod: false },
  { key: "demande_conges",        label: "Demande de congés",            icon: "🏖️", needsPeriod: false },
  { key: "arret_maladie",         label: "Arrêt maladie / de travail",   icon: "🤒", needsPeriod: false },
  { key: "conge_maternite",       label: "Congé maternité / paternité",  icon: "👶", needsPeriod: false },
  { key: "avertissement",         label: "Avertissement / sanction",     icon: "⚠️", needsPeriod: false },
  { key: "attestation_employeur", label: "Attestation employeur",        icon: "📊", needsPeriod: false },
  { key: "autre",                 label: "Autre document",               icon: "📁", needsPeriod: false }
]

export function getEmployeeDocTypeMeta(typeKey) {
  for (var i = 0; i < EMPLOYEE_DOC_TYPES.length; i++) {
    if (EMPLOYEE_DOC_TYPES[i].key === typeKey) return EMPLOYEE_DOC_TYPES[i]
  }
  return { key: "autre", label: "Document", icon: "📁" }
}

export function getContractDocTypeMeta(typeKey) {
  for (var i = 0; i < CONTRACT_DOC_TYPES.length; i++) {
    if (CONTRACT_DOC_TYPES[i].key === typeKey) return CONTRACT_DOC_TYPES[i]
  }
  return { key: "autre", label: "Document", icon: "📁", needsPeriod: false }
}

// Helper : capitaliser la première lettre d'une chaîne (utile pour nationalités)
export function capitalize(s) {
  if (!s) return ""
  var str = String(s)
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Helper : formater un poids de fichier en KB / MB lisibles
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "—"
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

// Helper : formater 'YYYY-MM' en 'avril 2026'
export function formatPeriodMonth(periodMonth) {
  if (!periodMonth) return ""
  var parts = periodMonth.split("-")
  if (parts.length !== 2) return periodMonth
  var year = parts[0]
  var monthIdx = parseInt(parts[1], 10) - 1
  var months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
  if (monthIdx < 0 || monthIdx > 11) return periodMonth
  return months[monthIdx] + " " + year
}
