// ============================================================
// contractBuilders.tsx
// ============================================================
// Builders HTML pour les 4 types de contrats Meshuga :
//   - Extra (CDD d'usage)
//   - CDI Cuisinier(ère)
//   - CDI Caissier(ère) / Équipier(ère)
//   - CDI Responsable / Manager (template Emy, statut agent de maîtrise/cadre)
//
// Chaque builder retourne un HTML complet (cover + parties + articles + signatures).
// Le HTML inclut tout le CSS inline pour fonctionner dans une iframe ou être
// imprimé directement sans dépendance externe (sauf la font Yellowtail via CDN).
//
// Architecture :
//   buildSharedCss()         - CSS commun à tous les contrats
//   buildSharedHeader()      - bandeau + cover + parties (paramétré par titre)
//   buildSharedSignatures()  - bloc signatures (paramétré par labels)
//   build*Contract(c, emp)   - 4 builders spécialisés
//   buildContract(c, emp)    - dispatcher selon c.type
// ============================================================

import { MESHUGA_LEGAL, formatDateFr, formatEuros, numToFrenchWords } from "./rhConstants"

// === Helper : safe() — protège contre null/undefined ===
function safe(s) {
  if (s === null || s === undefined || s === "") return "—"
  return String(s)
}

// === Helper : escape HTML pour éviter injection ===
export function esc(s) {
  if (s === null || s === undefined) return ""
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// === Helper : genderize() — transforme les formules épicènes en forme genrée ===
// Exemple : "Le/la Salarié(e) est engagé(e)" → "La Salariée est engagée" (féminin)
//                                            → "Le Salarié est engagé" (masculin)
// Patterns ordonnés du plus long au plus court pour éviter les collisions
// (ex: "il/elle" est un sous-pattern de "Celui-ci/celle-ci")
function genderize(html, isFemale) {
  if (!html) return ""
  var rules = [
    // Articles + Salarié(e) — patterns longs en premier
    { from: /du\/de la Salarié\(e\)/g, to: isFemale ? "de la Salariée" : "du Salarié" },
    { from: /au\/à la Salarié\(e\)/g,  to: isFemale ? "à la Salariée"  : "au Salarié" },
    { from: /Le\/la Salarié\(e\)/g,    to: isFemale ? "La Salariée"    : "Le Salarié" },
    { from: /le\/la Salarié\(e\)/g,    to: isFemale ? "la Salariée"    : "le Salarié" },
    // Pronoms composés (avant les pronoms simples, sinon collision)
    { from: /Celui-ci\/celle-ci/g,     to: isFemale ? "Celle-ci"  : "Celui-ci" },
    { from: /celui-ci\/celle-ci/g,     to: isFemale ? "celle-ci"  : "celui-ci" },
    // Pronoms simples
    { from: /\bIl\/elle\b/g,           to: isFemale ? "Elle" : "Il" },
    { from: /\bil\/elle\b/g,           to: isFemale ? "elle" : "il" },
    // Participes passés et adjectifs en (e) — l'ordre n'a pas d'importance ici
    { from: /engagé\(e\)/g,            to: isFemale ? "engagée"   : "engagé" },
    { from: /classé\(e\)/g,            to: isFemale ? "classée"   : "classé" },
    { from: /amené\(e\)/g,             to: isFemale ? "amenée"    : "amené" },
    { from: /soumis\(e\)/g,            to: isFemale ? "soumise"   : "soumis" },
    { from: /informé\(e\)/g,           to: isFemale ? "informée"  : "informé" },
    { from: /affilié\(e\)/g,           to: isFemale ? "affiliée"  : "affilié" },
    { from: /dénommé\(e\)/g,           to: isFemale ? "dénommée"  : "dénommé" },
    { from: /habilité\(e\)/g,          to: isFemale ? "habilitée" : "habilité" },
    { from: /libre\(e\)/g,             to: "libre" }, // épicène mais au cas où
    // Pluriel (rare mais on couvre)
    { from: /salarié\(e\)s/g,          to: isFemale ? "salariées" : "salariés" }
  ]
  var out = html
  for (var i = 0; i < rules.length; i++) {
    out = out.replace(rules[i].from, rules[i].to)
  }
  return out
}

// ============================================================
// CSS partagé entre tous les contrats
// ============================================================
export function buildSharedCss(logoDataUri) {
  return ''
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;font-size:13px;line-height:1.55;background:#fff}'
    + '.yt{font-family:"Yellowtail",cursive;font-weight:400}'
    + '.page{max-width:21cm;margin:0 auto;padding:1.5cm}'
    + '.toolbar{position:sticky;top:0;z-index:50;background:#FF82D7;color:#FFFFFF;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #FFEB5A}'
    + '.toolbar h1{font-family:"Yellowtail",cursive;font-size:28px;color:#FFFFFF}'
    + '.btn{font-family:"Arial Narrow",sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;border:2px solid #191923;border-radius:4px;cursor:pointer;background:#fff;color:#191923}'
    + '.btn.primary{background:#FFEB5A;color:#191923;border-color:#191923}'
    + '.cover{text-align:center;padding:8px 0 24px}'
    + '.cover img{max-width:280px;width:80%;height:auto;display:block;margin:0 auto 6px}'
    + '.cover .place{font-size:11px;font-weight:700;letter-spacing:2.5px;margin-bottom:18px}'
    + '.cover h2{font-size:24px;font-weight:900;letter-spacing:1px;margin-bottom:4px}'
    + '.cover .subtitle{font-size:11px;color:#666;font-style:italic}'
    + '.cover .rule{height:3px;background:#FF82D7;margin:18px auto 0}'
    + '.parties h3{font-family:"Yellowtail",cursive;font-size:22px;font-weight:400;margin:14px 0 8px;color:#FF82D7}'
    + '.parties p{margin-bottom:8px;text-align:justify;font-size:12.5px}'
    + '.parties strong{font-weight:900}'
    + '.party-tag{display:block;text-align:right;font-style:italic;color:#666;font-size:11px;margin-top:2px}'
    + '.party-side{display:block;text-align:right;font-weight:900;font-size:11px;letter-spacing:1px;margin-top:2px;margin-bottom:14px}'
    + '.bold-center{text-align:center;font-weight:900;font-size:14px;letter-spacing:1px;margin:18px 0 24px}'
    + '.art{margin:22px 0 10px;padding-bottom:5px;border-bottom:1.5px solid #FF82D7;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;page-break-after:avoid}'
    + '.art-num{font-family:"Yellowtail",cursive;font-size:24px;color:#FF82D7;line-height:1}'
    + '.art-title{font-family:"Yellowtail",cursive;font-size:18px;color:#191923;line-height:1.1}'
    + '.body p{margin-bottom:9px;text-align:justify;font-size:12.5px;line-height:1.55}'
    + '.body strong{font-weight:900}'
    + '.body ul{list-style:none;margin:6px 0 12px 18px}'
    + '.body ul li{position:relative;padding-left:18px;margin-bottom:4px;text-align:justify;font-size:12.5px}'
    + '.body ul li::before{content:"—";position:absolute;left:0;color:#FF82D7;font-weight:700}'
    + '.sub-clause{margin-bottom:9px;text-align:justify;font-size:12.5px;line-height:1.55}'
    + '.clause-label{font-weight:900}'
    + '.cctv{margin:6px 0 12px 18px;font-size:12.5px}'
    + '.cctv li{position:relative;padding-left:18px;margin-bottom:4px;list-style:none}'
    + '.cctv li::before{content:"—";position:absolute;left:0;color:#FF82D7;font-weight:700}'
    + '.planning{width:100%;border-collapse:collapse;margin:14px 0;font-size:12.5px}'
    + '.planning th{background:#FF82D7;color:#fff;padding:8px;text-align:left;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:1px}'
    + '.planning th:nth-child(2),.planning th:nth-child(3),.planning th:nth-child(4){text-align:center}'
    + '.planning td{padding:8px;border-bottom:1px solid #EEE}'
    + '.planning tfoot td{background:#FFEB5A;font-weight:900;border-top:2px solid #FF82D7}'
    + '.note{background:#FFF8E1;border-left:3px solid #FF82D7;padding:8px 12px;margin:8px 0;font-size:11.5px;font-style:italic}'
    + '.note b{color:#C2185B;font-style:normal;font-weight:900}'
    + '.sig-section{margin-top:24px;padding-top:8px;break-inside:avoid;page-break-inside:avoid}'
    + '.sig-section h2{font-family:"Yellowtail",cursive;font-size:42px;color:#FF82D7;text-align:center;font-weight:400;line-height:1;margin-bottom:8px}'
    + '.sig-section .rule{height:2px;background:#FF82D7;margin:0 0 28px}'
    + '.fait-banner{background:#FFFFFF;border-top:2.5px solid #FF82D7;border-bottom:2.5px solid #FF82D7;padding:16px 18px;text-align:center;margin-bottom:24px;font-size:13.5px;color:#191923}'
    + '.fait-banner .small{display:block;font-size:11px;color:#666;font-style:italic;margin-top:6px}'
    + '.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}'
    + '.sig-block{display:grid;grid-template-rows:48px 96px minmax(160px,1fr) 40px;border:2px solid #FF82D7;background:#fff}'
    + '.sig-head{background:#FF82D7;color:#fff;padding:0 16px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1.5px}'
    + '.sig-id{background:#FFEB5A;padding:10px 16px;border-bottom:2px solid #FF82D7;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}'
    + '.sig-id .name{font-size:15px;font-weight:900;color:#191923;line-height:1.2;margin-bottom:4px}'
    + '.sig-id .role{font-size:11px;color:#666;font-style:italic;line-height:1.3}'
    + '.sig-space{padding:14px 16px;display:flex;flex-direction:column;font-size:11px;color:#666;font-style:italic;line-height:1.4}'
    + '.sig-foot{background:#FAFAFA;border-top:1px solid #DDD;padding:0 16px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;font-style:italic}'
    + '@media print{@page{size:A4;margin:2.2cm 1.4cm 1.6cm 1.4cm;@top-center{content:element(running-header)}}.toolbar{display:none}.page{padding:0;max-width:none}.art{break-inside:avoid;break-after:avoid}.sig-section{break-inside:avoid;page-break-inside:avoid}.sig-block{break-inside:avoid;page-break-inside:avoid}'
    + '.sig-head,.sig-id,.planning th,.planning tfoot td,.fait-banner,.art,.art-num,.running-header,.sig-section h2,.parties h3,.art-title{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
    + '.running-header{position:running(running-header);display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #FF82D7;padding-bottom:6px;font-family:Arial Narrow,sans-serif;font-size:9px;color:#666}'
    + '.running-header img{height:18px;width:auto}'
    + '.running-header .tag{font-style:italic;letter-spacing:1px;text-transform:uppercase}'
}

// ============================================================
// Header partagé (running-header + toolbar + cover + parties)
// ============================================================
// type: "extra" | "cdi"
// titreCover: "CONTRAT DE TRAVAIL D'EXTRA" | "CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE"
// sousTitreCover: ligne discrète sous le titre
// emp: l'employé(e) (objet hr_employees)
// genre: "M" ou "F" pour adapter "né"/"née", "Madame"/"Monsieur"
export function buildSharedHeader(opts) {
  var emp = opts.emp
  var titreCover = opts.titreCover
  var sousTitreCover = opts.sousTitreCover
  var typeBandeau = opts.typeBandeau // texte du bandeau d'en-tête
  var logoUri = opts.logoUri

  var civilite = (emp.civilite || "Madame")
  var feminin = (civilite === "Madame" || civilite === "Mademoiselle")
  var ne = feminin ? "née" : "né"

  var dateNaiss = emp.date_naissance
    ? new Date(emp.date_naissance).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "[date de naissance à compléter]"
  var lieuNaiss = emp.lieu_naissance || "[lieu de naissance à compléter]"
  var nationalite = emp.nationalite || "[nationalité à compléter]"

  // Construire l'adresse complète
  var adresseFull = [emp.adresse, emp.code_postal, emp.ville].filter(Boolean).join(" ")
  if (!adresseFull) adresseFull = "[adresse à compléter]"

  return ''
    + '<div class="running-header">'
    + (logoUri ? '<img src="' + logoUri + '" alt="Meshuga">' : '<span style="font-family:Yellowtail,cursive;font-size:18px;color:#FF82D7">meshuga</span>')
    + '<span class="tag">' + esc(typeBandeau) + ' · ' + esc((emp.prenom || "")) + ' ' + esc((emp.nom || "").toUpperCase()) + '</span></div>'
    + '<div class="toolbar"><h1>meshuga · ' + esc(titreCover.toLowerCase()) + '</h1>'
    + '<button class="btn primary" onclick="window.print()">Imprimer en PDF</button></div>'
    + '<div class="page">'
    + '<div class="cover">'
    + (logoUri ? '<img src="' + logoUri + '" alt="Meshuga">' : '<div style="font-family:Yellowtail,cursive;font-size:96px;color:#FF82D7;line-height:1">meshuga</div>')
    + '<div class="place">CRAZY DELI &nbsp;·&nbsp; 3 RUE VAVIN &nbsp;·&nbsp; PARIS 6<sup>e</sup></div>'
    + '<h2>' + esc(titreCover) + '</h2>'
    + '<div class="subtitle">' + esc(sousTitreCover) + '</div>'
    + '<div class="rule"></div>'
    + '</div>'
    + '<div class="parties"><h3>Entre les soussignés</h3>'
    + '<p><strong>La société ' + MESHUGA_LEGAL.aegia_food.nom + '</strong>, ' + MESHUGA_LEGAL.aegia_food.forme + ' au capital social de <strong>' + MESHUGA_LEGAL.aegia_food.capital + ' €</strong>, immatriculée au Registre du Commerce et des Sociétés de ' + MESHUGA_LEGAL.aegia_food.rcs + ', dont le siège social est situé <strong>' + MESHUGA_LEGAL.aegia_food.adresse + '</strong>, code APE ' + MESHUGA_LEGAL.aegia_food.ape + ', SIRET ' + MESHUGA_LEGAL.aegia_food.siret + ', N° TVA intracommunautaire ' + MESHUGA_LEGAL.aegia_food.tva + ', exploitant l\'enseigne <strong>' + MESHUGA_LEGAL.aegia_food.enseigne + '</strong>,</p>'
    + '<p>représentée par sa Présidente, la société <strong>' + MESHUGA_LEGAL.sas_aegia.nom + '</strong>, ' + MESHUGA_LEGAL.sas_aegia.forme + ' au capital de <strong>' + MESHUGA_LEGAL.sas_aegia.capital + ' €</strong>, immatriculée au RCS de ' + MESHUGA_LEGAL.sas_aegia.rcs + ', dont le siège social est situé <strong>' + MESHUGA_LEGAL.sas_aegia.adresse + '</strong>, SIRET ' + MESHUGA_LEGAL.sas_aegia.siret + ', elle-même représentée par son Président, <strong>Monsieur ' + MESHUGA_LEGAL.president + '</strong>, dûment habilité aux fins des présentes.</p>'
    + '<span class="party-tag">Ci-après dénommée « <b>l\'Employeur</b> » ou « <b>la Société</b> »</span>'
    + '<span class="party-side">D\'UNE PART</span>'
    + '<p class="bold-center" style="margin:8px 0 14px">ET</p>'
    + '<p><strong>' + esc(civilite) + ' ' + esc(emp.prenom || "") + ' ' + esc((emp.nom || "").toUpperCase()) + '</strong>, ' + ne + ' le <strong>' + esc(dateNaiss) + '</strong> à <strong>' + esc(lieuNaiss) + '</strong>, de nationalité <strong>' + esc(nationalite) + '</strong>, demeurant <strong>' + esc(adresseFull) + '</strong>'
    + (emp.num_secu ? ', numéro de sécurité sociale <strong>' + esc(emp.num_secu) + '</strong>' : '')
    + '.</p>'
    + '<span class="party-tag">Ci-après dénommé' + (feminin ? "e" : "") + ' « <b>' + (feminin ? "la Salariée" : "le Salarié") + '</b> »</span>'
    + '<span class="party-side">D\'AUTRE PART</span>'
    + '<p style="text-align:center;font-style:italic;color:#666;font-size:11px;margin:14px 0 6px">Ensemble dénommées « les Parties ».</p>'
    + '<p class="bold-center">IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :</p>'
    + '</div>'
}

// ============================================================
// Bloc signatures partagé
// ============================================================
export function buildSharedSignatures(c, emp, salarieRole) {
  var civilite = emp.civilite || "Madame"
  var feminin = (civilite === "Madame" || civilite === "Mademoiselle")
  var dateSig = c.date_signature
    ? new Date(c.date_signature).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "[date à compléter]"
  var ville = c.ville_signature || "Paris"

  return ''
    + '<section class="sig-section">'
    + '<h2 class="yt">Signatures</h2>'
    + '<div class="rule"></div>'
    + '<div class="fait-banner">Fait à <strong>' + esc(ville) + '</strong>, en deux exemplaires originaux dont un remis à chacune des Parties, le <strong>' + esc(dateSig) + '</strong>.<span class="small">Chaque page doit être paraphée par les deux Parties.</span></div>'
    + '<div class="sig-grid">'
    + '<div class="sig-block">'
    + '<div class="sig-head">Pour l\'Employeur</div>'
    + '<div class="sig-id"><div class="name">AEGIA FOOD</div><div class="role">SAS AEGIA, Présidente<br>représentée par Edward TOURET, Président</div></div>'
    + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé »</div>'
    + '<div class="sig-foot" style="display:flex;align-items:center;justify-content:center;gap:8px"><span style="font-family:Yellowtail,cursive;font-size:14px;color:#FF82D7">cachet</span><span style="opacity:.5">·</span><span style="font-style:italic">SAS AEGIA</span></div>'
    + '</div>'
    + '<div class="sig-block">'
    + '<div class="sig-head">' + (feminin ? "La Salariée" : "Le Salarié") + '</div>'
    + '<div class="sig-id"><div class="name">' + esc(emp.prenom || "") + ' ' + esc((emp.nom || "").toUpperCase()) + '</div><div class="role">' + esc(salarieRole || "&nbsp;") + '</div></div>'
    + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé »</div>'
    + '<div class="sig-foot">Date : __ / __ / ____</div>'
    + '</div>'
    + '</div></section>'
    + '</div></body></html>'
}

// ============================================================
// Wrapper HTML complet : <html><head>...</head><body>{header + corps + signatures}
// ============================================================
export function wrapHtml(opts) {
  var titre = opts.titre
  var css = opts.css
  var body = opts.body
  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(titre) + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">'
    + '<style>' + css + '</style></head><body>'
    + body
}

// ============================================================
// Renderer pour les blocs missions (jsonb structuré)
// ============================================================
function renderMissionsBlocks(blocks) {
  if (!blocks || !blocks.length) return ''
  var html = ''
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i]
    html += '<p style="margin-top:10px"><strong>' + esc(b.title) + '</strong></p>'
    html += '<ul>'
    for (var j = 0; j < (b.items || []).length; j++) {
      html += '<li>' + esc(b.items[j]) + ' ;</li>'
    }
    html += '</ul>'
  }
  return html
}

// ============================================================
// 1. BUILDER : Contrat d'EXTRA (CDD d'usage)
// ============================================================
export function buildExtraContract(c, emp, vacs, logoUri) {
  var safeVacs = vacs || []
  var totalMin = 0
  safeVacs.forEach(function (v) { totalMin += (v.duree_minutes || 0) })

  // Planning HTML
  var planningRows = safeVacs.map(function (v) {
    var dur = v.duree_minutes || 0
    var h = Math.floor(dur / 60), m = dur % 60
    var dt = new Date(v.date_vacation)
    var dateStr = dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    return '<tr><td>' + dateStr + '</td><td style="text-align:center">' + (v.heure_debut || "").slice(0, 5) + '</td><td style="text-align:center">' + (v.heure_fin || "").slice(0, 5) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + h + ' h ' + (m < 10 ? "0" : "") + m + '</td></tr>'
  }).join("")
  var totalH = Math.floor(totalMin / 60), totalM = totalMin % 60

  var dateDebut = c.date_debut ? new Date(c.date_debut).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—"
  var dateFin = c.date_fin ? new Date(c.date_fin).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "—"

  var header = buildSharedHeader({
    emp: emp,
    titreCover: "CONTRAT DE TRAVAIL D'EXTRA",
    sousTitreCover: "CDD d'usage · Article L.1242-2, 3° du Code du travail · CCN Restauration Rapide (IDCC 1501)",
    typeBandeau: "CONTRAT D'EXTRA",
    logoUri: logoUri
  })

  var body = ''
    + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Nature et motif du contrat</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat est conclu en application des articles <strong>L.1242-2, 3°</strong> et <strong>D.1242-1</strong> du Code du travail, qui visent expressément le secteur de l\'hôtellerie-restauration parmi ceux dans lesquels il est d\'usage constant de ne pas recourir au contrat à durée indéterminée en raison de la nature de l\'activité exercée et du caractère par nature temporaire de ces emplois.</p>'
    + '<p>Il s\'agit d\'un <strong>contrat à durée déterminée d\'usage (CDD d\'usage)</strong>.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Durée du contrat et planning des vacations</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat prend effet le <strong>' + dateDebut + '</strong> et expire de plein droit, sans formalité ni indemnité, le <strong>' + dateFin + '</strong>.</p>'
    + (planningRows ? ('<table class="planning"><thead><tr><th>Date</th><th>Début</th><th>Fin</th><th>Durée</th></tr></thead><tbody>' + planningRows + '</tbody><tfoot><tr><td colspan="3" style="text-align:right">Total :</td><td style="text-align:center">' + totalH + ' h ' + (totalM < 10 ? "0" : "") + totalM + '</td></tr></tfoot></table>') : '')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Période d\'essai</span></div>'
    + '<div class="body"><p>Compte tenu de la durée totale du contrat (inférieure à un mois) et conformément à l\'article L.1242-10 du Code du travail, les Parties conviennent expressément que <strong>le présent contrat n\'est soumis à aucune période d\'essai</strong>.</p></div>'

    + '<div class="art"><span class="art-num">Article 4.</span><span class="art-title">Fonctions et qualification</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) est engagé(e) en qualité de <strong>' + safe(c.fonction) + '</strong>, classé(e) <strong>' + safe(c.classification) + '</strong> selon la grille de classification de la Convention Collective Nationale de la Restauration Rapide (IDCC 1501).</p>'
    + '<p>À ce titre, il/elle assurera notamment :</p>'
    + '<ul><li>L\'accueil de la clientèle, la prise de commande et l\'encaissement le cas échéant ;</li>'
    + '<li>Le service en salle et/ou au comptoir ainsi que le débarrassage ;</li>'
    + '<li>La préparation, l\'assemblage et le service des produits proposés à la carte ;</li>'
    + '<li>La mise en place et la remise en état du poste de travail avant et après service ;</li>'
    + '<li>Toute tâche connexe relevant strictement de sa qualification, dans le respect des règles d\'hygiène (HACCP).</li></ul>'
    + '<p>Le/la Salarié(e) s\'engage à exécuter ses fonctions avec loyauté, diligence et professionnalisme, dans le respect des consignes données par sa hiérarchie et des standards de qualité de l\'enseigne MESHUGA.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Lieu de travail</span></div>'
    + '<div class="body"><p>Le/la Salarié(e) exercera ses fonctions dans les locaux de l\'établissement MESHUGA Crazy Deli situé au <strong>3 rue Vavin, 75006 Paris</strong>.</p>'
    + '<p>Cette mention ne constitue pas une clause de sédentarité. Le/la Salarié(e) pourra ponctuellement être amené(e) à se déplacer pour les besoins du service, dans la limite de la région Île-de-France et après son accord.</p></div>'

    + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Rémunération et avantages</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">6.1 — Taux horaire forfaitaire.</span> Le/la Salarié(e) percevra une rémunération brute horaire forfaitaire de <strong>' + safe(c.taux_horaire_brut) + ' €</strong> (<strong>' + safe(c.taux_horaire_lettres) + '</strong> euros).</p>'
    + '<p class="sub-clause"><span class="clause-label">6.2 — Travail du dimanche.</span> L\'établissement MESHUGA ouvre habituellement le dimanche. La CCN 1501 ne prévoit pas de majoration spécifique au titre du travail dominical.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.3 — Jours fériés.</span> Le travail effectué le 1<sup>er</sup> mai donnera lieu à une indemnité égale au montant du salaire (majoration de 100%).</p>'
    + '<p class="sub-clause"><span class="clause-label">6.4 — Indemnité compensatrice de congés payés.</span> Le/la Salarié(e) percevra à l\'issue du contrat une indemnité égale à 10% de la rémunération totale brute.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.5 — Indemnité de fin de contrat.</span> L\'indemnité de précarité n\'est pas due (CDD d\'usage, article L.1243-10, 1° du Code du travail).</p>'
    + '<p class="sub-clause"><span class="clause-label">6.6 — Avantage en nature « repas ».</span> Évalué et déclaré conformément à la valeur forfaitaire URSSAF (4,25 € en 2026).</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Visite d\'information et de prévention</span></div>'
    + '<div class="body"><p>Conformément à l\'article R.4624-10 du Code du travail, le/la Salarié(e) bénéficiera d\'une VIP réalisée par le service de prévention et de santé au travail (<strong>' + (c.service_sante_travail || MESHUGA_LEGAL.medecine_travail.nom) + '</strong>' + (c.service_sante_travail ? '' : ', ' + MESHUGA_LEGAL.medecine_travail.adresse) + ') dans un délai maximal de 3 mois.</p></div>'

    + '<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Convention collective et protection sociale</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">8.1 — CCN.</span> Les conditions de travail sont régies par la CCN de la Restauration Rapide (IDCC 1501).</p>'
    + '<p class="sub-clause"><span class="clause-label">8.2 — Caisse de retraite complémentaire.</span> L\'Employeur cotise auprès de <strong>' + MESHUGA_LEGAL.retraite.nom + '</strong>, ' + MESHUGA_LEGAL.retraite.adresse + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.3 — Prévoyance.</span> <strong>' + (c.prevoyance_organisme || MESHUGA_LEGAL.prevoyance.nom) + '</strong>' + (c.prevoyance_organisme ? (c.prevoyance_adresse ? ', ' + esc(c.prevoyance_adresse) : '') : ', ' + MESHUGA_LEGAL.prevoyance.adresse) + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.4 — Complémentaire santé.</span> <strong>' + MESHUGA_LEGAL.complementaire_sante.nom + '</strong>, ' + MESHUGA_LEGAL.complementaire_sante.adresse + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.5 — Déclarations sociales.</span> DPAE auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 9.</span><span class="art-title">Tenue de travail</span></div>'
    + '<div class="body"><p>Le/la Salarié(e) s\'engage à respecter les standards d\'apparence et d\'hygiène applicables au sein de l\'établissement MESHUGA Crazy Deli, conformément à la réglementation en vigueur (arrêté du 21/12/2009 et HACCP).</p></div>'

    + '<div class="art"><span class="art-num">Article 10.</span><span class="art-title">Confidentialité et loyauté</span></div>'
    + '<div class="body"><p>Le/la Salarié(e) s\'engage à observer la discrétion la plus stricte sur toutes les informations dont il/elle aura connaissance à l\'occasion de ses fonctions, en particulier celles relatives aux recettes, fournisseurs, prix de revient, procédés, données clients et données financières de la Société.</p></div>'

    + '<div class="art"><span class="art-num">Article 11.</span><span class="art-title">Vidéosurveillance et données personnelles</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">11.1 — Information vidéosurveillance.</span> Le/la Salarié(e) est expressément informé(e) que l\'établissement est placé sous vidéosurveillance :</p>'
    + '<ul class="cctv">'
    + '<li><strong>Finalités :</strong> sécurité des biens et des personnes, prévention des vols ;</li>'
    + '<li><strong>Base légale :</strong> intérêt légitime de l\'Employeur (art. 6.1.f RGPD) ;</li>'
    + '<li><strong>Zones couvertes :</strong> salle / caisse / réserve, à l\'exclusion des locaux de pause et des sanitaires ;</li>'
    + '<li><strong>Durée de conservation :</strong> 30 jours maximum ;</li>'
    + '<li><strong>Droits :</strong> accès, rectification, effacement, opposition (à exercer auprès de la direction) ;</li>'
    + '<li><strong>Réclamation :</strong> auprès de la CNIL — www.cnil.fr.</li>'
    + '</ul>'
    + '<p class="sub-clause"><span class="clause-label">11.2 — Données personnelles RH.</span> Conservées pendant la durée du contrat et 5 ans après sa cessation pour les besoins légaux et probatoires.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 12.</span><span class="art-title">Cumul d\'emplois</span></div>'
    + '<div class="body"><p>Le/la Salarié(e) déclare être libre de tout engagement vis-à-vis d\'un précédent employeur et n\'être soumis(e) à aucune clause de non-concurrence.</p>'
    + '<p>Si le/la Salarié(e) cumule plusieurs emplois, il/elle s\'engage à respecter les durées maximales du travail et à informer l\'Employeur de tout autre engagement.</p></div>'

    + '<div class="art"><span class="art-num">Article 13.</span><span class="art-title">Rupture anticipée</span></div>'
    + '<div class="body"><p>Conformément à l\'article L.1243-1 du Code du travail, le présent contrat ne pourra être rompu avant son terme qu\'en cas d\'accord entre les Parties, de faute grave, de force majeure, d\'inaptitude médicale, ou si le/la Salarié(e) justifie d\'une embauche en CDI.</p></div>'

    + '<div class="art"><span class="art-num">Article 14.</span><span class="art-title">Dispositions diverses</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">14.1 — Règlement intérieur.</span> Le/la Salarié(e) déclare avoir pris connaissance du règlement intérieur de l\'établissement (le cas échéant) et s\'engage à en respecter les dispositions.</p>'
    + '<p class="sub-clause"><span class="clause-label">14.2 — Changement de situation.</span> Le/la Salarié(e) s\'engage à informer la Société, dans les plus brefs délais, de tout changement affectant sa situation personnelle.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 15.</span><span class="art-title">Domicile et juridiction compétente</span></div>'
    + '<div class="body"><p>Pour l\'exécution des présentes, les Parties élisent domicile en leurs adresses respectives mentionnées en tête du contrat.</p>'
    + '<p>Tout litige relatif à l\'exécution du présent contrat relèvera de la compétence du Conseil de Prud\'hommes de Paris, sous réserve des règles d\'ordre public en matière de compétence territoriale.</p></div>'

  var signatures = buildSharedSignatures(c, emp, c.fonction || "")

  return wrapHtml({
    titre: "Contrat extra Meshuga — " + (emp.prenom || "") + " " + (emp.nom || ""),
    css: buildSharedCss(logoUri),
    body: header + body + signatures
  })
}

// ============================================================
// 2. BUILDER : CDI Responsable / Manager (template Emy, postes à responsabilités)
// ============================================================
export function buildCdiCadreContract(c, emp, logoUri) {
  // Données dérivées
  var dateEmbauche = c.date_embauche
    ? new Date(c.date_embauche).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "[date d'embauche à compléter]"

  var fonction = c.fonction || "[fonction à compléter]"
  var niveauKey = c.niveau_ccn && c.echelon_ccn ? c.niveau_ccn + "-" + c.echelon_ccn : ""
  var niveauLabel = niveauKey ? "Niveau " + c.niveau_ccn + " — Échelon " + c.echelon_ccn : "[niveau CCN à compléter]"
  var statut = c.statut_cadre || "non-cadre"
  var statutLabel = statut === "cadre" ? "cadre" : (statut === "agent_maitrise" ? "agent de maîtrise" : "non-cadre")

  var salaire = c.salaire_brut_mensuel ? parseFloat(c.salaire_brut_mensuel) : 0
  var salaireLettres = c.salaire_lettres || numToFrenchWords(salaire) || "[montant en lettres]"
  var heuresHebdo = c.heures_hebdo ? parseFloat(c.heures_hebdo) : 35
  var heuresMensuelles = c.heures_mensuelles ? parseFloat(c.heures_mensuelles) : (heuresHebdo * 52 / 12)
  var heuresSup = c.heures_sup_structurelles ? parseFloat(c.heures_sup_structurelles) : Math.max(0, heuresMensuelles - 151.67)

  // Calcul du taux horaire de base si pas fourni
  var tauxBase = (salaire > 0 && heuresMensuelles > 0)
    ? Math.round((salaire / (Math.min(heuresMensuelles, 151.67) + heuresSup * 1.25)) * 100) / 100
    : 0

  var pe = c.periode_essai_mois || 2
  var peRenouv = c.periode_essai_renouvelable !== false
  var peTotal = peRenouv ? pe * 2 : pe

  // Mobilité
  var mobZone = c.clause_mobilite_zone || "région Île-de-France"

  // Intéressement
  var intActive = !!c.interessement_active
  var intTaux = c.interessement_taux_pct ? parseFloat(c.interessement_taux_pct) : 10
  var intAssiette = c.interessement_assiette || "chiffre d'affaires HT B2B encaissé"
  var intPeriodicite = c.interessement_periodicite || "mensuelle ou trimestrielle, au choix de l'Employeur"

  // Missions (jsonb structuré)
  var missionsHtml = renderMissionsBlocks(c.missions_blocks)

  var header = buildSharedHeader({
    emp: emp,
    titreCover: "CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE",
    sousTitreCover: "CDI · Articles L.1221-1 et suivants du Code du travail · CCN Restauration Rapide (IDCC 1501)",
    typeBandeau: "CONTRAT CDI",
    logoUri: logoUri
  })

  var body = ''
    + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Engagement et nature du contrat</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) est engagé(e) par l\'Employeur dans le cadre d\'un <strong>contrat de travail à durée indéterminée (CDI)</strong> à temps plein, à compter du <strong>' + esc(dateEmbauche) + '</strong>, sous réserve des résultats de la visite d\'information et de prévention prévue à l\'article 12 du présent contrat.</p>'
    + '<p>Le présent engagement est subordonné à la déclaration préalable à l\'embauche (DPAE) effectuée auprès de l\'URSSAF d\'Île-de-France conformément à l\'article L.1221-10 du Code du travail.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Fonctions et qualification</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) est engagé(e) en qualité de <strong>' + esc(fonction) + '</strong>.</p>'
    + '<p>Il/elle est classé(e) selon la grille de classification de la Convention Collective Nationale de la Restauration Rapide (IDCC 1501) au <strong>' + esc(niveauLabel) + '</strong>, statut <strong>' + esc(statutLabel) + '</strong>.</p>'
    + '<p>Ce poste est exercé sous l\'autorité directe du dirigeant de la Société, dans le respect des orientations stratégiques définies par l\'Employeur.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Missions principales</span></div>'
    + '<div class="body">'
    + '<p>Les missions ci-dessous sont essentielles, substantielles et non limitatives. Elles pourront évoluer selon les besoins de l\'entreprise, sans constituer une modification du présent contrat.</p>'
    + (missionsHtml || '<p style="color:#999;font-style:italic">[Missions à compléter]</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 4.</span><span class="art-title">Période d\'essai</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat est assorti d\'une <strong>période d\'essai de ' + pe + ' (' + esc(numToFrenchWords(pe)) + ') mois</strong>, conformément aux dispositions de l\'article L.1221-19 du Code du travail et de la Convention Collective Nationale de la Restauration Rapide.</p>'
    + (peRenouv
        ? '<p>Cette période d\'essai pourra être <strong>renouvelée une fois pour une durée de ' + pe + ' (' + esc(numToFrenchWords(pe)) + ') mois supplémentaires</strong>, soit une durée maximale totale de ' + peTotal + ' (' + esc(numToFrenchWords(peTotal)) + ') mois, sous réserve d\'un accord écrit du/de la Salarié(e) intervenant avant le terme de la période d\'essai initiale.</p>'
        : '<p>Cette période d\'essai n\'est pas renouvelable.</p>')
    + '<p>Pendant la période d\'essai, le contrat peut être rompu librement par chacune des Parties, sans indemnité, sous réserve du respect du délai de prévenance prévu aux articles L.1221-25 et L.1221-26 du Code du travail.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Lieu de travail' + (c.clause_mobilite ? ' et clause de mobilité' : '') + '</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) exercera principalement ses fonctions au sein de l\'établissement <strong>MESHUGA Crazy Deli, 3 rue Vavin, 75006 Paris</strong>.</p>'
    + (c.clause_mobilite
        ? '<p>Compte tenu de la nature des fonctions exercées, le/la Salarié(e) pourra être amené(e) à exercer ses missions sur les lieux de prestations clients, chez des partenaires, sur des sites de production ponctuels ou sur tout autre lieu rendu nécessaire par l\'activité, dans la limite de la <strong>' + esc(mobZone) + '</strong>, sans que cela constitue une modification du présent contrat.</p><p>Tout déplacement professionnel hors de cette zone géographique fera l\'objet d\'un accord préalable entre les Parties.</p>'
        : '<p>Cette mention ne constitue pas une clause de sédentarité. Le/la Salarié(e) pourra ponctuellement être amené(e) à se déplacer pour les besoins du service, après son accord.</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Durée du travail et organisation</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">6.1 — Durée hebdomadaire.</span> Le/la Salarié(e) est soumis(e) à une durée du travail de <strong>' + heuresHebdo + ' heures hebdomadaires</strong>, correspondant à ' + heuresMensuelles.toFixed(2).replace(".",",") + ' heures mensuelles.</p>'
    + (heuresSup > 0
        ? '<p class="sub-clause"><span class="clause-label">6.2 — Heures supplémentaires structurelles.</span> Cette durée comprend la durée légale du travail (35 heures hebdomadaires, soit 151,67 heures mensuelles) et <strong>' + heuresSup.toFixed(2).replace(".",",") + ' heures supplémentaires structurelles mensuelles</strong>, majorées de 25 % conformément à l\'article L.3121-36 du Code du travail.</p>'
        : '')
    + '<p class="sub-clause"><span class="clause-label">6.' + (heuresSup > 0 ? '3' : '2') + ' — Variabilité des horaires.</span> Compte tenu de la nature des fonctions exercées, les horaires de travail peuvent varier selon les nécessités de l\'activité.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.' + (heuresSup > 0 ? '4' : '3') + ' — Heures supplémentaires complémentaires.</span> Toute heure de travail effectuée au-delà des ' + heuresHebdo + ' heures hebdomadaires devra faire l\'objet d\'une autorisation préalable et expresse de l\'Employeur. Ces heures donneront lieu à compensation ou rémunération conformément aux dispositions légales et conventionnelles applicables.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.' + (heuresSup > 0 ? '5' : '4') + ' — Repos.</span> Le/la Salarié(e) bénéficie d\'un repos quotidien minimum de 11 heures consécutives et d\'un repos hebdomadaire minimum de 35 heures consécutives, conformément aux articles L.3131-1 et L.3132-2 du Code du travail.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Rémunération fixe</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">7.1 — Salaire mensuel brut.</span> En contrepartie de l\'exécution de ses fonctions, le/la Salarié(e) percevra une rémunération brute mensuelle de <strong>' + formatEuros(salaire) + ' (' + esc(salaireLettres) + ' euros)</strong>, versée sur 12 mois, payable à terme échu au plus tard le 5 du mois suivant.'
    + (heuresSup > 0
        ? ' Cette rémunération se décompose en ' + (heuresMensuelles - heuresSup).toFixed(2).replace(".",",") + ' heures au taux horaire de base de ' + tauxBase.toFixed(2).replace(".",",") + ' € et ' + heuresSup.toFixed(2).replace(".",",") + ' heures supplémentaires structurelles majorées de 25 % conformément à l\'article L.3121-36 du Code du travail, l\'ensemble étant intégré au forfait mensuel ci-dessus.'
        : '')
    + '</p>'
    + '<p class="sub-clause"><span class="clause-label">7.2 — Avantage en nature « repas ».</span> Lorsque le/la Salarié(e) prend un repas sur le lieu de travail à l\'occasion de ses fonctions, cet avantage est évalué et déclaré conformément à la valeur forfaitaire URSSAF en vigueur (4,25 € par repas en 2026), et apparaîtra sur le bulletin de paie.</p>'
    + '<p class="sub-clause"><span class="clause-label">7.3 — Travail du dimanche et jours fériés.</span> L\'établissement MESHUGA ouvrant habituellement le dimanche, la Convention Collective Nationale de la Restauration Rapide (IDCC 1501) ne prévoit pas de majoration spécifique au titre du travail dominical pour les salariés de ces établissements. Conformément à l\'article L.3133-6 du Code du travail, le travail effectué le 1<sup>er</sup> mai donnera lieu, en plus du salaire correspondant, à une indemnité égale au montant du salaire (majoration de 100 %).</p>'
    + '</div>'

    + (intActive
        ? ('<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Intéressement variable</span></div>'
          + '<div class="body">'
          + '<p class="sub-clause"><span class="clause-label">8.1 — Principe.</span> En complément de la rémunération fixe prévue à l\'article 7, le/la Salarié(e) bénéficiera d\'un intéressement variable calculé sur ' + esc(intAssiette) + '.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.2 — Assiette de calcul.</span> L\'intéressement est égal à <strong>' + intTaux.toFixed(2).replace(".",",") + ' %</strong> de cette assiette, payable à la Société, répondant cumulativement aux conditions suivantes :</p>'
          + '<ul>'
          + '<li>Le client, la prestation ou le partenariat a été directement ou indirectement développé par le/la Salarié(e) ;</li>'
          + '<li>L\'opération a été préalablement validée par l\'Employeur ;</li>'
          + '<li>La facture correspondante a été <strong>intégralement encaissée</strong> par la Société (les avoirs, annulations, remboursements et impayés sont exclus) ;</li>'
          + '<li>La prestation a été réalisée conformément aux conditions convenues avec le client.</li>'
          + '</ul>'
          + '<p class="sub-clause"><span class="clause-label">8.3 — Modalités de versement.</span> L\'intéressement est calculé mensuellement sur la base des encaissements du mois écoulé. Il est versé selon une périodicité ' + esc(intPeriodicite) + ', au plus tard avec la paie du mois suivant la période de référence.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.4 — Cessation du contrat.</span> En cas de cessation du contrat de travail pour quelque cause que ce soit, l\'intéressement reste dû au/à la Salarié(e) pour les seules opérations dont la facture aura été <strong>intégralement encaissée à la date effective de fin de contrat</strong>. Aucun intéressement n\'est dû sur les devis non signés, les factures émises mais non encaissées, ou les contrats en cours d\'exécution à la date de rupture.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.5 — Nature juridique.</span> Cet intéressement constitue un complément de salaire variable. Il ne constitue pas un élément fixe ni acquis de la rémunération et son versement reste subordonné à la réunion effective des conditions énoncées au présent article. Il est soumis aux cotisations sociales et à l\'impôt sur le revenu dans les conditions légales.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.6 — Régularisation et impayés.</span> En cas d\'impayé, d\'avoir, d\'annulation ou de remboursement intervenant après le versement de l\'intéressement correspondant, l\'Employeur pourra procéder à la régularisation par déduction sur les versements ultérieurs ou, à défaut, par récupération directe.</p>'
          + '</div>')
        : '')

    // Articles suivants : si intéressement actif, on est à 9, sinon à 8
  var nextArt = intActive ? 9 : 8

  body += ''
    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Congés payés</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">9.1 — Acquisition.</span> Conformément à l\'article L.3141-3 du Code du travail, le/la Salarié(e) acquiert un droit à congés payés de <strong>2,5 jours ouvrables par mois de travail effectif</strong>, dans la limite de <strong>30 jours ouvrables (5 semaines)</strong> par période de référence. La période de référence pour l\'acquisition s\'étend du <strong>1er juin de l\'année N-1 au 31 mai de l\'année N</strong>.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.2 — Période de prise.</span> Conformément aux articles L.3141-13 et suivants du Code du travail, la période principale de prise des congés payés s\'étend du <strong>1er mai au 31 octobre</strong> de chaque année. Le/la Salarié(e) doit formuler ses demandes de congés <strong>au moins 2 mois avant</strong> la date de départ souhaitée, par écrit (email accepté), afin de permettre à l\'Employeur d\'organiser la continuité du service.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.3 — Planification annuelle.</span> L\'Employeur s\'engage à informer le/la Salarié(e), au plus tard le <strong>1er mars</strong> de chaque année, des dates de fermeture éventuelles de l\'établissement et à valider ou proposer un calendrier de congés au plus tard le <strong>30 avril</strong>. À défaut de demande de la part du/de la Salarié(e), l\'Employeur pourra fixer unilatéralement les dates dans le cadre de son pouvoir de direction.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.4 — Report exceptionnel.</span> À titre exceptionnel et après accord écrit préalable de l\'Employeur, le report d\'une partie des congés non pris au 31 octobre vers la période suivante peut être autorisé, dans la limite maximale de <strong>10 jours ouvrables</strong> et <strong>jusqu\'au 31 mars de l\'année suivante</strong> au plus tard.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.5 — Congés non pris.</span> Conformément à la jurisprudence constante de la Cour de cassation et à la directive européenne 2003/88/CE, les congés payés non pris au terme de la période de prise et n\'ayant pas fait l\'objet d\'un report autorisé au titre du 9.4 ci-dessus sont perdus, dès lors que l\'Employeur a effectivement mis le/la Salarié(e) en mesure de les prendre. Cette disposition ne s\'applique pas aux congés acquis pendant les périodes de suspension du contrat de travail (maladie, accident du travail, maternité, paternité), qui bénéficient d\'un report légal de <strong>15 mois</strong> conformément à la loi n° 2024-364 du 22 avril 2024.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.6 — Indemnité compensatrice.</span> En cas de rupture du contrat de travail, les congés payés acquis et non pris donneront lieu au versement d\'une indemnité compensatrice de congés payés, conformément à l\'article L.3141-28 du Code du travail.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Frais professionnels et déplacements</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">10.1 — Frais professionnels.</span> Les frais professionnels engagés par le/la Salarié(e) dans l\'intérêt exclusif de l\'entreprise (déplacements, repas d\'affaires, achats ponctuels validés…) seront pris en charge par l\'Employeur, sous réserve d\'un accord préalable et de la production des justificatifs originaux dans les 30 jours suivant la dépense.</p>'
    + '<p class="sub-clause"><span class="clause-label">10.2 — Frais de transport domicile-travail.</span> Conformément à l\'article L.3261-2 du Code du travail, l\'Employeur prend en charge <strong>50 % du coût des abonnements aux transports publics</strong> souscrits par le/la Salarié(e) pour ses déplacements entre son domicile et son lieu de travail habituel, sur présentation des justificatifs.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Absences et maladie</span></div>'
    + '<div class="body">'
    + '<p>Toute absence doit être signalée par tout moyen à l\'Employeur dans les meilleurs délais et au plus tard dans la matinée du premier jour d\'absence.</p>'
    + '<p>En cas de maladie ou d\'accident, le/la Salarié(e) devra transmettre les <strong>justificatifs médicaux dans un délai de 48 heures</strong>, conformément à l\'article R.321-2 du Code de la sécurité sociale.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Visite d\'information et de prévention</span></div>'
    + '<div class="body">'
    + '<p>Conformément à l\'article R.4624-10 du Code du travail, le/la Salarié(e) bénéficiera d\'une <strong>Visite d\'Information et de Prévention (VIP)</strong> réalisée par le service de prévention et de santé au travail dont relève l\'Employeur'
    + ' (<strong>' + (c.service_sante_travail || MESHUGA_LEGAL.medecine_travail.nom) + '</strong>, ' + (c.service_sante_travail ? '' : MESHUGA_LEGAL.medecine_travail.adresse + ' — Tél. ' + MESHUGA_LEGAL.medecine_travail.telephone) + ')'
    + ', dans un délai maximal de 3 mois à compter de la prise effective de poste.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Convention collective et protection sociale</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">13.1 — Convention collective applicable.</span> Les conditions de travail du/de la Salarié(e) sont régies par les dispositions de la <strong>Convention Collective Nationale de la Restauration Rapide (IDCC 1501)</strong>, ainsi que ses avenants, accords et annexes en vigueur. Un exemplaire de la convention est tenu à la disposition du/de la Salarié(e) auprès de la direction.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.2 — Caisse de retraite complémentaire.</span> L\'Employeur cotise auprès de <strong>' + MESHUGA_LEGAL.retraite.nom + '</strong>, ' + MESHUGA_LEGAL.retraite.adresse + ', au régime de retraite complémentaire des salariés ' + (statut === "cadre" ? "cadres" : "non-cadres") + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.3 — Prévoyance.</span> '
    + 'L\'Employeur a souscrit auprès de <strong>' + (c.prevoyance_organisme || MESHUGA_LEGAL.prevoyance.nom) + '</strong>'
    + (c.prevoyance_organisme ? (c.prevoyance_adresse ? ', ' + esc(c.prevoyance_adresse) : '') : ', ' + MESHUGA_LEGAL.prevoyance.adresse)
    + ', un contrat collectif obligatoire de prévoyance conformément aux dispositions conventionnelles applicables. Le/la Salarié(e) est affilié(e) d\'office à ce régime à compter de sa prise de poste.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.4 — Complémentaire santé.</span> '
    + 'L\'Employeur a également souscrit auprès de <strong>' + MESHUGA_LEGAL.complementaire_sante.nom + '</strong>, ' + MESHUGA_LEGAL.complementaire_sante.adresse + ', un contrat collectif obligatoire de complémentaire santé (« mutuelle ») conformément à l\'article L.911-7 du Code de la sécurité sociale. Le/la Salarié(e) est affilié(e) d\'office à ce régime à compter de sa prise de poste.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.5 — Déclarations sociales.</span> La Société établit la Déclaration Préalable à l\'Embauche (DPAE) auprès de l\'URSSAF d\'Île-de-France et transmet, via la Déclaration Sociale Nominative (DSN), l\'ensemble des informations sociales relatives au/à la Salarié(e). Celui-ci/celle-ci dispose, conformément au RGPD et à la loi « Informatique et libertés », d\'un droit d\'accès, de rectification, d\'effacement et de portabilité de ses données.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Confidentialité</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) s\'engage, tant pendant l\'exécution du présent contrat qu\'après sa cessation pour quelque cause que ce soit, à la <strong>plus stricte confidentialité</strong> concernant toute information dont il/elle aura connaissance dans le cadre ou à l\'occasion de ses fonctions, notamment :</p>'
    + '<ul>'
    + '<li>Les recettes, procédés de fabrication et savoir-faire de l\'enseigne MESHUGA ;</li>'
    + '<li>Les conditions commerciales avec les fournisseurs et prestataires ;</li>'
    + '<li>Les fichiers clients, prospects et leurs données ;</li>'
    + '<li>Les données financières, comptables et fiscales de la Société ;</li>'
    + '<li>La stratégie de développement, les projets en cours et études de marché ;</li>'
    + '<li>Les informations relatives aux équipes (rémunérations, situations personnelles).</li>'
    + '</ul>'
    + '<p>Cette obligation survivra à la cessation du contrat pour une durée de <strong>cinq (5) ans</strong> à compter de cette cessation. Toute violation caractérisée pourra engager la responsabilité du/de la Salarié(e) et donner lieu à réparation du préjudice subi par la Société.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Loyauté et exclusivité</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) s\'engage à exercer ses fonctions avec <strong>loyauté, diligence et professionnalisme</strong>, et à ne pas porter atteinte aux intérêts de l\'entreprise.</p>'
    + '<p>Il/elle déclare être libre de tout engagement vis-à-vis d\'un précédent employeur et n\'être soumis(e) à aucune clause de non-concurrence ou d\'exclusivité.</p>'
    + '<p>Pendant l\'exécution du présent contrat, le/la Salarié(e) s\'engage à ne pas exercer d\'activité concurrente directe ou indirecte de celle de l\'Employeur, ni à participer, sous quelque forme que ce soit, à une entreprise ayant une activité similaire ou concurrente, sauf autorisation préalable et écrite de l\'Employeur. Cette obligation cesse à la rupture du contrat, conformément au choix exprès des Parties de ne pas convenir d\'une clause de non-concurrence post-contractuelle.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Propriété intellectuelle</span></div>'
    + '<div class="body">'
    + '<p>Toute création, méthode, document, contenu, outil, base de données, fichier client, support commercial ou tout autre élément élaboré par le/la Salarié(e) dans le cadre ou à l\'occasion de ses fonctions est la <strong>propriété exclusive de l\'Employeur</strong>, conformément aux articles L.111-1 et L.113-9 du Code de la propriété intellectuelle.</p>'
    + '<p>Le/la Salarié(e) s\'engage à remettre à l\'Employeur, à première demande et au plus tard à la cessation du contrat, l\'intégralité des supports, fichiers et documents dont il/elle aurait la garde dans le cadre de ses fonctions.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Vidéosurveillance et données personnelles</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">17.1 — Vidéosurveillance.</span> Le/la Salarié(e) est expressément informé(e) que l\'établissement est placé sous vidéosurveillance, dont les caractéristiques sont les suivantes :</p>'
    + '<ul class="cctv">'
    + '<li><strong>Finalités :</strong> sécurité des biens et des personnes, prévention des vols ;</li>'
    + '<li><strong>Base légale :</strong> intérêt légitime de l\'Employeur (art. 6.1.f RGPD) ;</li>'
    + '<li><strong>Zones couvertes :</strong> salle / caisse / réserve, à l\'exclusion des locaux de pause et des sanitaires ;</li>'
    + '<li><strong>Durée de conservation :</strong> 30 jours maximum ;</li>'
    + '<li><strong>Droits :</strong> accès, rectification, effacement, opposition (à exercer auprès de la direction) ;</li>'
    + '<li><strong>Réclamation :</strong> auprès de la CNIL — www.cnil.fr.</li>'
    + '</ul>'
    + '<p class="sub-clause"><span class="clause-label">17.2 — Données personnelles RH.</span> Les données personnelles du/de la Salarié(e) sont traitées par la Société en sa qualité de responsable de traitement, conformément au RGPD et à la loi n° 78-17 du 6 janvier 1978 modifiée. Elles sont conservées pendant la durée du contrat et 5 ans après sa cessation pour les besoins légaux et probatoires.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Discipline et règlement intérieur</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) s\'engage à respecter les règles applicables au sein de l\'entreprise, notamment celles relatives à l\'hygiène (HACCP, arrêté du 21/12/2009), à la sécurité, et à la tenue professionnelle.</p>'
    + '<p>Tout manquement caractérisé pourra donner lieu à une sanction disciplinaire conforme aux dispositions des articles L.1331-1 et suivants du Code du travail et, le cas échéant, du règlement intérieur de l\'entreprise.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Rupture du contrat</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat pourra être rompu conformément aux dispositions légales et conventionnelles en vigueur (démission, licenciement, rupture conventionnelle, départ ou mise à la retraite).</p>'
    + '<p>En cas de rupture, les Parties devront respecter les <strong>préavis prévus par la Convention Collective Nationale de la Restauration Rapide (IDCC 1501)</strong>, sauf dispense expresse et écrite de l\'autre Partie ou cas de faute grave ou lourde.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Domicile et juridiction compétente</span></div>'
    + '<div class="body">'
    + '<p>Pour l\'exécution des présentes, les Parties élisent domicile en leurs adresses respectives mentionnées en tête du contrat.</p>'
    + '<p>Le présent contrat est soumis au droit français. Tout litige relatif à sa conclusion, son exécution ou sa rupture relèvera de la compétence exclusive du <strong>Conseil de Prud\'hommes de Paris</strong>, sous réserve des règles d\'ordre public en matière de compétence territoriale.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Dispositions finales</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat annule et remplace tout accord antérieur, écrit ou verbal, ayant pu intervenir entre les Parties relativement à l\'objet des présentes.</p>'
    + '<p>Si l\'une quelconque des stipulations venait à être déclarée nulle ou inapplicable, les autres stipulations conserveraient toute leur force et leur portée.</p>'
    + '<p>Toute modification du présent contrat ne pourra résulter que d\'un avenant écrit signé des deux Parties.</p>'
    + '</div>'

  var signatures = buildSharedSignatures(c, emp, fonction)

  return wrapHtml({
    titre: "Contrat CDI Meshuga — " + (emp.prenom || "") + " " + (emp.nom || ""),
    css: buildSharedCss(logoUri),
    body: header + body + signatures
  })
}

// ============================================================
// 3. BUILDER : CDI Cuisinier(ère) — version simplifiée 18 articles
// ============================================================
export function buildCdiCuisinierContract(c, emp, logoUri) {
  return buildCdiSimpleContract(c, emp, logoUri, "cuisinier")
}

// ============================================================
// 4. BUILDER : CDI Caissier(ère) — version simplifiée 18 articles
// ============================================================
export function buildCdiCaissierContract(c, emp, logoUri) {
  return buildCdiSimpleContract(c, emp, logoUri, "caissier")
}

// ============================================================
// Builder commun "CDI simple" (cuisinier, caissier) — sans intéressement, sans mobilité
// ============================================================
function buildCdiSimpleContract(c, emp, logoUri, profil) {
  var dateEmbauche = c.date_embauche
    ? new Date(c.date_embauche).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "[date d'embauche à compléter]"

  var fonctionDefault = profil === "cuisinier" ? "Cuisinier(ère)" : "Caissier(ère) / Équipier(ère)"
  var fonction = c.fonction || fonctionDefault
  var niveauKey = c.niveau_ccn && c.echelon_ccn ? c.niveau_ccn + "-" + c.echelon_ccn : ""
  var niveauLabel = niveauKey ? "Niveau " + c.niveau_ccn + " — Échelon " + c.echelon_ccn : "[niveau CCN à compléter]"

  var salaire = c.salaire_brut_mensuel ? parseFloat(c.salaire_brut_mensuel) : 0
  var salaireLettres = c.salaire_lettres || numToFrenchWords(salaire) || "[montant en lettres]"
  var heuresHebdo = c.heures_hebdo ? parseFloat(c.heures_hebdo) : 35
  var heuresMensuelles = c.heures_mensuelles ? parseFloat(c.heures_mensuelles) : (heuresHebdo * 52 / 12)
  var heuresSup = c.heures_sup_structurelles ? parseFloat(c.heures_sup_structurelles) : Math.max(0, heuresMensuelles - 151.67)

  var tauxBase = (salaire > 0 && heuresMensuelles > 0)
    ? Math.round((salaire / (Math.min(heuresMensuelles, 151.67) + heuresSup * 1.25)) * 100) / 100
    : 0

  var pe = c.periode_essai_mois || 2
  var peRenouv = c.periode_essai_renouvelable !== false
  var peTotal = peRenouv ? pe * 2 : pe

  var missionsHtml = renderMissionsBlocks(c.missions_blocks)

  var header = buildSharedHeader({
    emp: emp,
    titreCover: "CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE",
    sousTitreCover: "CDI · Articles L.1221-1 et suivants du Code du travail · CCN Restauration Rapide (IDCC 1501)",
    typeBandeau: "CONTRAT CDI",
    logoUri: logoUri
  })

  var body = ''
    + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Engagement et nature du contrat</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) est engagé(e) par l\'Employeur dans le cadre d\'un <strong>contrat de travail à durée indéterminée (CDI)</strong> à temps plein, à compter du <strong>' + esc(dateEmbauche) + '</strong>, sous réserve des résultats de la visite d\'information et de prévention.</p>'
    + '<p>Le présent engagement est subordonné à la déclaration préalable à l\'embauche (DPAE) effectuée auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Fonctions et qualification</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) est engagé(e) en qualité de <strong>' + esc(fonction) + '</strong>.</p>'
    + '<p>Il/elle est classé(e) selon la grille de classification de la Convention Collective Nationale de la Restauration Rapide (IDCC 1501) au <strong>' + esc(niveauLabel) + '</strong>, statut <strong>non-cadre</strong>.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Missions principales</span></div>'
    + '<div class="body">'
    + '<p>Les missions ci-dessous sont essentielles, substantielles et non limitatives. Elles pourront évoluer selon les besoins de l\'entreprise, sans constituer une modification du présent contrat.</p>'
    + (missionsHtml || '<p style="color:#999;font-style:italic">[Missions à compléter]</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 4.</span><span class="art-title">Période d\'essai</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat est assorti d\'une <strong>période d\'essai de ' + pe + ' (' + esc(numToFrenchWords(pe)) + ') mois</strong>, conformément aux dispositions de l\'article L.1221-19 du Code du travail et de la Convention Collective Nationale de la Restauration Rapide.</p>'
    + (peRenouv
        ? '<p>Cette période d\'essai pourra être <strong>renouvelée une fois pour une durée de ' + pe + ' mois supplémentaires</strong>, soit une durée maximale totale de ' + peTotal + ' mois, sous réserve d\'un accord écrit du/de la Salarié(e) intervenant avant le terme de la période d\'essai initiale.</p>'
        : '<p>Cette période d\'essai n\'est pas renouvelable.</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Lieu de travail</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) exercera ses fonctions au sein de l\'établissement <strong>MESHUGA Crazy Deli, 3 rue Vavin, 75006 Paris</strong>.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Durée du travail</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">6.1 — Durée hebdomadaire.</span> Le/la Salarié(e) est soumis(e) à une durée du travail de <strong>' + heuresHebdo + ' heures hebdomadaires</strong>, correspondant à ' + heuresMensuelles.toFixed(2).replace(".",",") + ' heures mensuelles.</p>'
    + (heuresSup > 0
        ? '<p class="sub-clause"><span class="clause-label">6.2 — Heures supplémentaires structurelles.</span> Cette durée comprend la durée légale du travail (35 heures hebdomadaires) et <strong>' + heuresSup.toFixed(2).replace(".",",") + ' heures supplémentaires structurelles mensuelles</strong>, majorées de 25 % conformément à l\'article L.3121-36 du Code du travail.</p>'
        : '')
    + '<p class="sub-clause"><span class="clause-label">6.' + (heuresSup > 0 ? '3' : '2') + ' — Variabilité.</span> Les horaires de travail peuvent varier selon les nécessités de l\'activité, et incluent du travail en soirée et le week-end.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.' + (heuresSup > 0 ? '4' : '3') + ' — Repos.</span> Repos quotidien minimum 11h consécutives, repos hebdomadaire minimum 35h consécutives.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Rémunération</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">7.1 — Salaire mensuel brut.</span> En contrepartie de l\'exécution de ses fonctions, le/la Salarié(e) percevra une rémunération brute mensuelle de <strong>' + formatEuros(salaire) + ' (' + esc(salaireLettres) + ' euros)</strong>, versée sur 12 mois, payable au plus tard le 5 du mois suivant.'
    + (heuresSup > 0
        ? ' Cette rémunération se décompose en ' + (heuresMensuelles - heuresSup).toFixed(2).replace(".",",") + ' heures au taux horaire de base de ' + tauxBase.toFixed(2).replace(".",",") + ' € et ' + heuresSup.toFixed(2).replace(".",",") + ' heures supplémentaires structurelles majorées de 25 %, l\'ensemble étant intégré au forfait mensuel ci-dessus.'
        : '')
    + '</p>'
    + '<p class="sub-clause"><span class="clause-label">7.2 — Avantage en nature « repas ».</span> Évalué et déclaré conformément à la valeur forfaitaire URSSAF (4,25 € par repas en 2026).</p>'
    + '<p class="sub-clause"><span class="clause-label">7.3 — Travail du dimanche et 1<sup>er</sup> mai.</span> L\'établissement ouvrant habituellement le dimanche, la CCN 1501 ne prévoit pas de majoration spécifique. Le 1<sup>er</sup> mai donne lieu à une indemnité égale au montant du salaire (majoration 100 %).</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Congés payés</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">8.1 — Acquisition.</span> Conformément à l\'article L.3141-3 du Code du travail, le/la Salarié(e) acquiert un droit à congés payés de <strong>2,5 jours ouvrables par mois de travail effectif</strong>, dans la limite de <strong>30 jours ouvrables (5 semaines)</strong> par période de référence. La période de référence pour l\'acquisition s\'étend du <strong>1er juin de l\'année N-1 au 31 mai de l\'année N</strong>.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.2 — Période de prise.</span> Conformément aux articles L.3141-13 et suivants du Code du travail, la période principale de prise des congés payés s\'étend du <strong>1er mai au 31 octobre</strong> de chaque année. Le/la Salarié(e) doit formuler ses demandes de congés <strong>au moins 2 mois avant</strong> la date de départ souhaitée, par écrit (email accepté), afin de permettre à l\'Employeur d\'organiser la continuité du service.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.3 — Planification annuelle.</span> L\'Employeur s\'engage à informer le/la Salarié(e), au plus tard le <strong>1er mars</strong> de chaque année, des dates de fermeture éventuelles de l\'établissement et à valider ou proposer un calendrier de congés au plus tard le <strong>30 avril</strong>. À défaut de demande de la part du/de la Salarié(e), l\'Employeur pourra fixer unilatéralement les dates dans le cadre de son pouvoir de direction.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.4 — Report exceptionnel.</span> À titre exceptionnel et après accord écrit préalable de l\'Employeur, le report d\'une partie des congés non pris au 31 octobre vers la période suivante peut être autorisé, dans la limite maximale de <strong>10 jours ouvrables</strong> et <strong>jusqu\'au 31 mars de l\'année suivante</strong> au plus tard.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.5 — Congés non pris.</span> Conformément à la jurisprudence constante de la Cour de cassation et à la directive européenne 2003/88/CE, les congés payés non pris au terme de la période de prise et n\'ayant pas fait l\'objet d\'un report autorisé au titre du 8.4 ci-dessus sont perdus, dès lors que l\'Employeur a effectivement mis le/la Salarié(e) en mesure de les prendre. Cette disposition ne s\'applique pas aux congés acquis pendant les périodes de suspension du contrat de travail (maladie, accident du travail, maternité, paternité), qui bénéficient d\'un report légal de <strong>15 mois</strong> conformément à la loi n° 2024-364 du 22 avril 2024.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.6 — Indemnité compensatrice.</span> En cas de rupture du contrat de travail, les congés payés acquis et non pris donneront lieu au versement d\'une indemnité compensatrice de congés payés, conformément à l\'article L.3141-28 du Code du travail.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 9.</span><span class="art-title">Frais de transport domicile-travail</span></div>'
    + '<div class="body">'
    + '<p>L\'Employeur prend en charge <strong>50 % du coût des abonnements aux transports publics</strong> souscrits par le/la Salarié(e), sur présentation des justificatifs (article L.3261-2 du Code du travail).</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 10.</span><span class="art-title">Absences et maladie</span></div>'
    + '<div class="body">'
    + '<p>Toute absence doit être signalée le matin du premier jour. Les justificatifs médicaux doivent être transmis dans un délai de 48 heures.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 11.</span><span class="art-title">Visite d\'information et de prévention</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) bénéficiera d\'une VIP réalisée par <strong>' + (c.service_sante_travail || MESHUGA_LEGAL.medecine_travail.nom) + '</strong>'
    + (c.service_sante_travail ? '' : ', ' + MESHUGA_LEGAL.medecine_travail.adresse)
    + ' dans un délai maximal de 3 mois (article R.4624-10 du Code du travail).</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 12.</span><span class="art-title">Convention collective et protection sociale</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">12.1 — CCN.</span> Les conditions de travail sont régies par la CCN Restauration Rapide (IDCC 1501).</p>'
    + '<p class="sub-clause"><span class="clause-label">12.2 — Retraite complémentaire.</span> ' + MESHUGA_LEGAL.retraite.nom + ', ' + MESHUGA_LEGAL.retraite.adresse + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">12.3 — Prévoyance.</span> <strong>' + (c.prevoyance_organisme || MESHUGA_LEGAL.prevoyance.nom) + '</strong>' + (c.prevoyance_organisme ? (c.prevoyance_adresse ? ', ' + esc(c.prevoyance_adresse) : '') : ', ' + MESHUGA_LEGAL.prevoyance.adresse) + '. Le/la Salarié(e) y est affilié(e) d\'office.</p>'
    + '<p class="sub-clause"><span class="clause-label">12.4 — Complémentaire santé.</span> <strong>' + MESHUGA_LEGAL.complementaire_sante.nom + '</strong>, ' + MESHUGA_LEGAL.complementaire_sante.adresse + '. Le/la Salarié(e) y est affilié(e) d\'office.</p>'
    + '<p class="sub-clause"><span class="clause-label">12.5 — Déclarations sociales.</span> DPAE et DSN auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 13.</span><span class="art-title">Tenue et hygiène (HACCP)</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) s\'engage à respecter les standards d\'hygiène et de présentation conformément à la réglementation en vigueur (arrêté du 21/12/2009 et HACCP). La tenue professionnelle est fournie par l\'Employeur.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 14.</span><span class="art-title">Confidentialité et loyauté</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) s\'engage à la plus stricte confidentialité concernant les recettes, fournisseurs, prix de revient, données clients et financières de la Société, pendant l\'exécution du contrat et pour une durée de <strong>3 (trois) ans</strong> après sa cessation.</p>'
    + '<p>Il/elle déclare n\'être soumis(e) à aucune clause de non-concurrence d\'un précédent employeur.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 15.</span><span class="art-title">Vidéosurveillance et données personnelles</span></div>'
    + '<div class="body">'
    + '<p>L\'établissement est placé sous vidéosurveillance pour la sécurité des biens et des personnes (intérêt légitime, art. 6.1.f RGPD). Conservation 30 jours maximum. Zones : salle / caisse / réserve, à l\'exclusion des locaux de pause et des sanitaires. Droits CNIL applicables.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 16.</span><span class="art-title">Discipline et règlement intérieur</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) s\'engage à respecter les règles applicables au sein de l\'entreprise (hygiène HACCP, sécurité, tenue). Tout manquement pourra donner lieu à une sanction disciplinaire conforme aux articles L.1331-1 et suivants du Code du travail.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 17.</span><span class="art-title">Rupture du contrat</span></div>'
    + '<div class="body">'
    + '<p>Rupture conformément aux dispositions légales et conventionnelles. Préavis selon la CCN 1501, sauf dispense expresse, faute grave ou lourde.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 18.</span><span class="art-title">Domicile et juridiction compétente</span></div>'
    + '<div class="body">'
    + '<p>Élection de domicile aux adresses respectives. Litige relevant du Conseil de Prud\'hommes de Paris.</p>'
    + '</div>'

  var signatures = buildSharedSignatures(c, emp, fonction)

  return wrapHtml({
    titre: "Contrat CDI Meshuga — " + (emp.prenom || "") + " " + (emp.nom || ""),
    css: buildSharedCss(logoUri),
    body: header + body + signatures
  })
}

// ============================================================
// DISPATCHER : retourne le bon builder selon c.type
// ============================================================
export function buildContract(c, emp, vacs, logoUri) {
  if (!c || !emp) return ''
  var t = c.type || "extra"
  // Détection du genre : féminin si civilité Madame/Mademoiselle
  var civ = (emp.civilite || "Madame")
  var isFemale = (civ === "Madame" || civ === "Mademoiselle")
  // Génération du HTML brut
  var html
  if (t === "cdi_cadre") html = buildCdiCadreContract(c, emp, logoUri)
  else if (t === "cdi_cuisinier") html = buildCdiCuisinierContract(c, emp, logoUri)
  else if (t === "cdi_caissier") html = buildCdiCaissierContract(c, emp, logoUri)
  else html = buildExtraContract(c, emp, vacs, logoUri)
  // Application de la transformation genrée
  return genderize(html, isFemale)
}
