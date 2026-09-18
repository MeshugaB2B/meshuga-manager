// ============================================================
// contractBuilders.tsx — v14 (23/05/2026)
// ============================================================
// 🆕 v14 — Paraphes via CSS @page natif (Chrome print) :
//   - Plus de Paged.js polyfill (Chrome NE supporte PAS position: running())
//   - Chrome SUPPORTE @page { @bottom-right { content: "texte" } }
//   - Texte des paraphes injecté directement dans le CSS
//   - Encadré arrondi rose + font Yellowtail rose
//   - @page signature → pas de paraphes (dernière page)
//   - @page cover → pas de header ni paraphes (welcomePack)
//   - VALIDÉ avec Chrome headless via puppeteer en local
// ============================================================

import { MESHUGA_LEGAL, formatDateFr, formatEuros, numToFrenchWords } from "./rhConstants"

function safe(s) {
  if (s === null || s === undefined || s === "") return "—"
  return String(s)
}

export function esc(s) {
  if (s === null || s === undefined) return ""
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// Escape pour valeur CSS content "..."
function escCss(s) {
  if (s === null || s === undefined) return ""
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

function genderize(html, isFemale) {
  if (!html) return ""
  var rules = [
    { from: /du\/de la Salarié\(e\)/g, to: isFemale ? "de la Salariée" : "du Salarié" },
    { from: /au\/à la Salarié\(e\)/g,  to: isFemale ? "à la Salariée"  : "au Salarié" },
    { from: /Le\/la Salarié\(e\)/g,    to: isFemale ? "La Salariée"    : "Le Salarié" },
    { from: /le\/la Salarié\(e\)/g,    to: isFemale ? "la Salariée"    : "le Salarié" },
    { from: /Celui-ci\/celle-ci/g,     to: isFemale ? "Celle-ci"  : "Celui-ci" },
    { from: /celui-ci\/celle-ci/g,     to: isFemale ? "celle-ci"  : "celui-ci" },
    { from: /\bIl\/elle\b/g,           to: isFemale ? "Elle" : "Il" },
    { from: /\bil\/elle\b/g,           to: isFemale ? "elle" : "il" },
    { from: /engagé\(e\)/g,            to: isFemale ? "engagée"   : "engagé" },
    { from: /classé\(e\)/g,            to: isFemale ? "classée"   : "classé" },
    { from: /amené\(e\)/g,             to: isFemale ? "amenée"    : "amené" },
    { from: /soumis\(e\)/g,            to: isFemale ? "soumise"   : "soumis" },
    { from: /informé\(e\)/g,           to: isFemale ? "informée"  : "informé" },
    { from: /présent\(e\)/g,           to: isFemale ? "présente"  : "présent" },
    { from: /convoqué\(e\)/g,          to: isFemale ? "convoquée" : "convoqué" },
    { from: /lié\(e\)/g,               to: isFemale ? "liée"      : "lié" },
    { from: /rémunéré\(e\)/g,          to: isFemale ? "rémunérée" : "rémunéré" },
    { from: /responsable de la déclaration/g, to: "responsable de la déclaration" },
    { from: /le\/la concernant/g,       to: isFemale ? "la concernant" : "le concernant" },
    { from: /demandeur\/demandeuse/g,   to: isFemale ? "demandeuse" : "demandeur" },
    { from: /affilié\(e\)/g,           to: isFemale ? "affiliée"  : "affilié" },
    { from: /dénommé\(e\)/g,           to: isFemale ? "dénommée"  : "dénommé" },
    { from: /habilité\(e\)/g,          to: isFemale ? "habilitée" : "habilité" },
    { from: /libre\(e\)/g,             to: "libre" },
    { from: /salarié\(e\)s/g,          to: isFemale ? "salariées" : "salariés" }
  ]
  var out = html
  for (var i = 0; i < rules.length; i++) {
    out = out.replace(rules[i].from, rules[i].to)
  }
  return out
}

export function getInitials(fullName) {
  if (!fullName) return ""
  var parts = String(fullName).trim().split(/\s+/)
  var out = ""
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i]
    if (p && p.length > 0) {
      out += p.charAt(0).toUpperCase() + "."
    }
  }
  return out
}

// Texte des paraphes pour le CSS content
// 🆕 v16 : juste les initiales, plus le mot "Paraphes" (clarification via page signature)
export function buildParaphText(employerInitials, salarieInitials) {
  var emp = employerInitials || "E.T."
  var sal = salarieInitials || "en attente"
  return emp + "   /   " + sal
}

function resolveSalarieInitials(c, emp) {
  if (!c) return null
  var signed = c.signature_signed_at || c.signed_at || null
  if (!signed) return null
  var full = (emp && (emp.prenom || '') ? emp.prenom + ' ' : '') + (emp && emp.nom ? emp.nom : '')
  return getInitials(full)
}

function buildHeaderTagText(emp, type) {
  var name = ((emp && emp.prenom) || "") + " " + (((emp && emp.nom) || "")).toUpperCase()
  return type + "  ·  " + name.trim()
}

// ============================================================
// CSS partagé — v14 : @page natif avec texte statique
// ============================================================
export function buildSharedCss(logoUri, paraphText, headerText) {
  var ptxt = escCss(paraphText || "E.T.   /   en attente")
  var htxt = escCss(headerText || "meshuga")

  return ''
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;font-size:13px;line-height:1.55;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '.yt{font-family:"Yellowtail",cursive;font-weight:400}'
    + '.page{max-width:21cm;margin:0 auto;padding:0}'
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
    + '.art{margin:22px 0 10px;padding-bottom:5px;border-bottom:1.5px solid #FF82D7;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;page-break-after:avoid;break-after:avoid}'
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
    + '.sig-block{display:grid;grid-template-rows:48px 96px minmax(160px,1fr) 40px;border:2px solid #FF82D7;background:#fff;break-inside:avoid;page-break-inside:avoid}'
    + '.sig-head{background:#FF82D7;color:#fff;padding:0 16px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1.5px}'
    + '.sig-id{background:#FFEB5A;padding:10px 16px;border-bottom:2px solid #FF82D7;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}'
    + '.sig-id .name{font-size:15px;font-weight:900;color:#191923;line-height:1.2;margin-bottom:4px}'
    + '.sig-id .role{font-size:11px;color:#666;font-style:italic;line-height:1.3}'
    + '.sig-space{padding:14px 16px;display:flex;flex-direction:column;font-size:11px;color:#666;font-style:italic;line-height:1.4}'
    + '.sig-foot{background:#FAFAFA;border-top:1px solid #DDD;padding:0 16px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;font-style:italic}'

    // === v14 PAGED MEDIA NATIF ===
    // @page default : header haut + paraphes bas-droite (encadré arrondi rose, Yellowtail rose)
    + '@page{'
    +   'size:A4;'
    +   'margin:2.2cm 1.4cm 2.5cm 1.4cm;'
    +   '@top-center{'
    +     'content:"' + htxt + '";'
    +     'font-family:"Arial Narrow",sans-serif;'
    +     'font-size:9px;'
    +     'color:#666;'
    +     'letter-spacing:1px;'
    +     'text-transform:uppercase;'
    +     'border-bottom:1.5px solid #FF82D7;'
    +     'padding-bottom:6px;'
    +     'width:100%;'
    +   '}'
    +   '@bottom-center{'
    +     'content:"Page " counter(page) " / " counter(pages);'
    +     'font-family:"Arial Narrow",sans-serif;'
    +     'font-size:8.5px;'
    +     'color:#999;'
    +     'letter-spacing:1px;'
    +     'text-transform:uppercase;'
    +   '}'
    +   '@bottom-right{'
    +     'content:"' + ptxt + '";'
    +     'font-family:"Yellowtail",cursive;'
    +     'font-size:13px;'
    +     'color:#FF82D7;'  // 🆕 v18.1 : rose Meshuga (visible si l'utilisateur coche "Graphiques d'arrière-plan" à l'impression)
    +   '}'
    + '}'
    // @page signature : header oui, paraphes NON
    + '@page signature{'
    +   'size:A4;'
    +   'margin:2.2cm 1.4cm 2cm 1.4cm;'
    +   '@top-center{'
    +     'content:"' + htxt + '";'
    +     'font-family:"Arial Narrow",sans-serif;'
    +     'font-size:9px;'
    +     'color:#666;'
    +     'letter-spacing:1px;'
    +     'text-transform:uppercase;'
    +     'border-bottom:1.5px solid #FF82D7;'
    +     'padding-bottom:6px;'
    +     'width:100%;'
    +   '}'
    +   '@bottom-right{content:none}'
    +   '@bottom-center{'
    +     'content:"Page " counter(page) " / " counter(pages);'
    +     'font-family:"Arial Narrow",sans-serif;'
    +     'font-size:8.5px;'
    +     'color:#999;'
    +     'letter-spacing:1px;'
    +     'text-transform:uppercase;'
    +   '}'
    + '}'
    + '@page cover{'
    +   'size:A4;'
    +   'margin:1.2cm 1.4cm 1.6cm 1.4cm;'
    +   '@top-center{content:none}'
    +   '@bottom-right{content:none}'
    + '}'
    + '.signature-page{page:signature;page-break-before:always;break-before:page}'
    + '.cover-page{page:cover;page-break-after:always;break-after:page}'

    + '@media print{'
    +   '.toolbar{display:none}'
    +   '.page{padding:0;max-width:none}'
    +   '.art{break-inside:avoid;break-after:avoid}'
    +   '.sig-section{break-inside:avoid;page-break-inside:avoid}'
    +   '.sig-block{break-inside:avoid;page-break-inside:avoid}'
    +   '.sig-head,.sig-id,.planning th,.planning tfoot td,.fait-banner,.art,.art-num,.sig-section h2,.parties h3,.art-title,.cover .rule,.sig-section .rule,.sig-block,.note{-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '}'
}

// === LEGACY SHIMS (compat amendmentBuilder + route.ts/submit) ===
// v14 met les paraphes en CSS, plus dans le DOM. Ces fonctions retournent "".
// TODO refactor : route.ts/submit doit régénérer le HTML complet via buildAvenant
// au moment de la signature salarié, au lieu de patcher le HTML existant.
export function buildParaphFooter(employerInitials, employeeInitials) {
  return ''
}
export function buildParaphRunner(opts) {
  return ''
}

// ============================================================
// Header partagé — cover + parties
// ============================================================
export function buildSharedHeader(opts) {
  var emp = opts.emp
  var titreCover = opts.titreCover
  var sousTitreCover = opts.sousTitreCover
  var logoUri = opts.logoUri

  var civilite = (emp.civilite || "Madame")
  var feminin = (civilite === "Madame" || civilite === "Mademoiselle")
  var ne = feminin ? "née" : "né"

  var dateNaiss = emp.date_naissance
    ? new Date(emp.date_naissance).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "[date de naissance à compléter]"
  var lieuNaiss = emp.lieu_naissance || "[lieu de naissance à compléter]"
  var nationalite = emp.nationalite || "[nationalité à compléter]"

  var adresseFull = [emp.adresse, emp.code_postal, emp.ville].filter(Boolean).join(" ")
  if (!adresseFull) adresseFull = "[adresse à compléter]"

  return ''
    + '<div class="toolbar"><h1>meshuga · ' + esc(titreCover.toLowerCase()) + '</h1>'
    + '<button class="btn primary" onclick="window.print()">Imprimer en PDF</button></div>'

    // 🆕 v16 : Page 1 : tout dans .page (PAS .cover-page) → paraphes apparaissent dès page 1.
    // La cover-page est réservée à la couverture ROSE du welcomePack uniquement.
    + '<div class="page">'
    + '<div class="cover">'
    + (logoUri ? '<img src="' + logoUri + '" alt="Meshuga">' : '<div style="font-family:Yellowtail,cursive;font-size:96px;color:#FF82D7;line-height:1">meshuga</div>')
    + '<div class="place">3 RUE VAVIN &nbsp;·&nbsp; PARIS 6<sup>e</sup></div>'
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
    // 🆕 v16 : PAS de fermeture ici — on continue sur la même .page (pas de saut de page forcé)
}

// ============================================================
// Bloc signatures — wrappé dans .signature-page pour @page signature
// ============================================================
// ============================================================
// Clause de mobilité — prestations événementielles B2B (Île-de-France)
// Rendue dans l'article "Lieu de travail" de chaque type de contrat.
// Acceptation expresse rappelée dans le bloc signatures (buildSharedSignatures).
// ============================================================
export function hasMobilite(c) {
  return c.clause_mobilite !== false && c.clause_mobilite !== null && c.clause_mobilite !== undefined ? !!c.clause_mobilite : false
}

export function buildMobiliteArticle(c, emp, artNum) {
  var civilite = emp.civilite || "Madame"
  var feminin = (civilite === "Madame" || civilite === "Mademoiselle")
  var zone = c.clause_mobilite_zone || "région Île-de-France (Paris et départements 77, 78, 91, 92, 93, 94, 95)"
  var titre = 'Lieu de travail' + (hasMobilite(c) ? ' et clause de mobilité' : '')
  var html = ''
    + '<div class="art"><span class="art-num">Article ' + artNum + '.</span><span class="art-title">' + titre + '</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">' + artNum + '.1 — Lieu de travail principal.</span> Le/la Salarié(e) exerce ses fonctions au sein de l\'établissement <strong>MESHUGA, 3 rue Vavin, 75006 Paris</strong>.</p>'
  if (hasMobilite(c)) {
    html += ''
      + '<p class="sub-clause"><span class="clause-label">' + artNum + '.2 — Clause de mobilité géographique.</span> Compte tenu de la nature de l\'activité de l\'entreprise, qui comprend une activité de traiteur et de prestations événementielles pour une clientèle professionnelle (petits-déjeuners, déjeuners d\'affaires, cocktails, soirées, salons et réceptions dites « B2B ») réalisées dans les locaux des clients ou sur les lieux qu\'ils désignent, le/la Salarié(e) accepte expressément d\'exécuter ses fonctions, à titre ponctuel ou récurrent, sur tout lieu de prestation situé dans la <strong>' + esc(zone) + '</strong>.</p>'
      + '<p class="sub-clause"><span class="clause-label">' + artNum + '.3 — Conditions de mise en œuvre.</span> Cette mobilité est mise en œuvre dans l\'intérêt de l\'entreprise et de bonne foi. Sauf urgence ou circonstance exceptionnelle, le/la Salarié(e) est informé(e) du lieu, de la date et des horaires de la prestation avec un délai de prévenance minimum de <strong>quarante-huit (48) heures</strong>, par tout moyen écrit (planning, messagerie professionnelle, SMS). Ces prestations s\'inscrivent dans la durée du travail contractuelle et sont rémunérées dans les conditions prévues au présent contrat ; les heures effectuées au-delà sont traitées conformément aux dispositions légales et conventionnelles applicables aux heures supplémentaires ou complémentaires.</p>'
      + '<p class="sub-clause"><span class="clause-label">' + artNum + '.4 — Temps et frais de déplacement.</span> Le temps de trajet entre l\'établissement (ou le domicile, si le/la Salarié(e) se rend directement sur site à la demande de l\'employeur) et le lieu de prestation qui excède le temps normal de trajet domicile–établissement fait l\'objet d\'une contrepartie conformément à l\'article L.3121-4 du Code du travail. Les frais de transport exposés à la demande de l\'employeur pour se rendre sur le lieu de prestation sont pris en charge ou remboursés sur justificatifs, selon la politique interne de notes de frais.</p>'
      + '<p class="sub-clause"><span class="clause-label">' + artNum + '.5 — Portée.</span> Les Parties conviennent que l\'exécution de prestations sur les lieux visés au présent article ne constitue pas une modification du contrat de travail mais un simple changement des conditions de travail, relevant du pouvoir de direction de l\'employeur, et ne nécessite donc pas la conclusion d\'un avenant. Tout refus injustifié du/de la Salarié(e) d\'exécuter une prestation dans les conditions ci-dessus pourra constituer un manquement à ses obligations contractuelles. La présente clause ne peut en aucun cas conduire à un changement du lieu de travail principal ni à une mobilité hors de la zone géographique définie sans accord écrit du/de la Salarié(e).</p>'
      + '<p class="sub-clause"><span class="clause-label">' + artNum + '.6 — Acceptation expresse.</span> Le/la Salarié(e) déclare avoir pris connaissance de la présente clause de mobilité, en comprendre la portée et l\'<strong>accepter expressément</strong>. Cette acceptation est matérialisée par la signature du présent contrat et par la mention spécifique figurant au bloc « Signatures ».</p>'
  }
  html += '</div>'
  return genderize(html, feminin)
}

// ============================================================
// Articles détaillés partagés (Extra + CDI non-cadre)
// Rédigés pour être lisibles par le/la salarié(e) : chaque article explique
// la règle, ce que ça change concrètement, et la référence légale.
// ============================================================
function isFem(emp) {
  var civ = (emp && emp.civilite) || "Madame"
  return civ === "Madame" || civ === "Mademoiselle"
}
function art(n, title, bodyHtml, emp) {
  return genderize(''
    + '<div class="art"><span class="art-num">Article ' + n + '.</span><span class="art-title">' + title + '</span></div>'
    + '<div class="body">' + bodyHtml + '</div>', isFem(emp))
}
function sc(num, label, text) {
  return '<p class="sub-clause"><span class="clause-label">' + num + ' — ' + label + '.</span> ' + text + '</p>'
}

export function buildArtDureeTravail(c, emp, n, heuresHebdo, heuresMensuelles, heuresSup) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Durée hebdomadaire', 'Le/la Salarié(e) est engagé(e) pour une durée de travail de <strong>' + heuresHebdo + ' heures par semaine</strong>, soit <strong>' + heuresMensuelles.toFixed(2).replace(".", ",") + ' heures par mois</strong> en moyenne (calcul légal : heures hebdomadaires × 52 semaines ÷ 12 mois). La durée légale du travail est de 35 heures par semaine (article L.3121-27 du Code du travail).')
  if (heuresSup > 0) {
    b += sc(n + '.' + (k++), 'Heures supplémentaires structurelles', 'La durée contractuelle inclut <strong>' + heuresSup.toFixed(2).replace(".", ",") + ' heures supplémentaires par mois</strong>, dites « structurelles » car elles sont prévues chaque mois dans le contrat. Elles sont rémunérées avec une majoration de <strong>25 %</strong> (de la 36<sup>e</sup> à la 43<sup>e</sup> heure hebdomadaire) et de <strong>50 %</strong> au-delà, conformément à l\'article L.3121-36 du Code du travail. Ces heures figurent sur une ligne distincte du bulletin de paie et bénéficient de la réduction de cotisations salariales et de l\'exonération d\'impôt sur le revenu prévues par la loi, dans les limites en vigueur.')
  }
  b += sc(n + '.' + (k++), 'Heures supplémentaires occasionnelles', 'Au-delà de la durée contractuelle, des heures supplémentaires ne peuvent être effectuées qu\'à la demande expresse ou avec l\'accord préalable de l\'Employeur. Elles sont alors rémunérées avec les majorations légales ci-dessus ou, sur accord des Parties, compensées par un repos équivalent majoré. Le contingent annuel d\'heures supplémentaires est celui fixé par la CCN 1501.')
  b += sc(n + '.' + (k++), 'Planning et horaires', 'Les horaires sont fixés par l\'Employeur en fonction des besoins de l\'activité (restaurant et prestations traiteur), <strong>du lundi au dimanche, en journée et en soirée</strong>. Le planning est communiqué au/à la Salarié(e) au moins <strong>7 jours à l\'avance</strong> par écrit (planning affiché ou messagerie professionnelle). En cas de nécessité (absence imprévue d\'un collègue, prestation ajoutée, affluence exceptionnelle), il peut être modifié avec un délai de prévenance réduit à <strong>3 jours</strong>, et plus court encore avec l\'accord du/de la Salarié(e). Le/la Salarié(e) s\'engage à consulter régulièrement son planning.')
  b += sc(n + '.' + (k++), 'Durées maximales', 'Sauf dérogation légale, la durée quotidienne de travail ne peut dépasser <strong>10 heures</strong> (12 heures en cas d\'activité accrue, dans les conditions de la CCN 1501), la durée hebdomadaire ne peut dépasser <strong>48 heures</strong> sur une semaine ni <strong>44 heures en moyenne</strong> sur 12 semaines consécutives (articles L.3121-18 à L.3121-22 du Code du travail).')
  b += sc(n + '.' + (k++), 'Pauses', 'Dès que le temps de travail quotidien atteint 6 heures, le/la Salarié(e) bénéficie d\'une pause d\'au moins <strong>20 minutes consécutives</strong> (article L.3121-16 du Code du travail). Les pauses ne sont pas du temps de travail effectif et ne sont pas rémunérées, sauf si le/la Salarié(e) reste à la disposition de l\'Employeur pendant celles-ci. Une pause repas est organisée sur chaque service ; elle est planifiée par le responsable présent en fonction de l\'activité.')
  b += sc(n + '.' + (k++), 'Repos', 'Le/la Salarié(e) bénéficie d\'un repos quotidien d\'au moins <strong>11 heures consécutives</strong> entre deux journées de travail et d\'un repos hebdomadaire d\'au moins <strong>35 heures consécutives</strong> (24 heures + 11 heures), comprenant en principe deux jours de repos par semaine, consécutifs ou non selon le planning (articles L.3131-1 et L.3132-2 du Code du travail ; CCN 1501). Le jour de repos hebdomadaire n\'est pas nécessairement le dimanche.')
  b += sc(n + '.' + (k++), 'Suivi du temps de travail', 'Le temps de travail est enregistré par le système de pointage ou le planning validé mis en place par l\'Employeur. Le/la Salarié(e) s\'engage à pointer à chaque début et fin de service ainsi qu\'à chaque pause, ou à signaler sans délai toute anomalie. Le récapitulatif des heures est remis mensuellement avec le bulletin de paie.')
  return art(n, 'Durée et organisation du travail', b, emp)
}

export function buildArtRemunerationCdi(c, emp, n, salaire, salaireLettres, heuresMensuelles, heuresSup, tauxBase) {
  var k = 1
  var tauxStr = c.taux_horaire_brut ? String(parseFloat(c.taux_horaire_brut).toFixed(2)).replace(".", ",") : (tauxBase ? tauxBase.toFixed(2).replace(".", ",") : "")
  var b = ''
  b += sc(n + '.' + (k++), 'Salaire mensuel brut', 'En contrepartie de son travail, le/la Salarié(e) perçoit un salaire mensuel brut de <strong>' + formatEuros(salaire) + '</strong> (' + esc(salaireLettres) + ' euros), versé sur <strong>12 mois</strong>.'
    + (tauxStr ? ' Ce montant correspond à un <strong>taux horaire brut de ' + tauxStr + ' €</strong>' + (c.taux_horaire_lettres ? ' (' + esc(c.taux_horaire_lettres) + ' euros)' : '') + ' pour les heures normales.' : ''))
  if (heuresSup > 0) {
    b += sc(n + '.' + (k++), 'Décomposition', 'Le salaire se décompose ainsi : <strong>' + (heuresMensuelles - heuresSup).toFixed(2).replace(".", ",") + ' heures</strong> au taux horaire de base de ' + (tauxStr || tauxBase.toFixed(2).replace(".", ",")) + ' € et <strong>' + heuresSup.toFixed(2).replace(".", ",") + ' heures supplémentaires structurelles</strong> majorées de 25 %. Cette décomposition apparaît sur chaque bulletin de paie.')
  }
  b += sc(n + '.' + (k++), 'Minimum garanti', 'Ce salaire est au moins égal au SMIC et au salaire minimum conventionnel de la CCN 1501 correspondant au niveau et à l\'échelon du/de la Salarié(e). Il est revalorisé automatiquement si l\'évolution du SMIC ou de la grille conventionnelle l\'exige, sans qu\'un avenant soit nécessaire.')
  b += sc(n + '.' + (k++), 'Paiement', 'Le salaire est payé <strong>mensuellement, par virement bancaire</strong>, à terme échu, au plus tard le <strong>5 du mois suivant</strong>. Le bulletin de paie est remis sous forme dématérialisée (coffre-fort numérique ou email sécurisé), sauf opposition écrite du/de la Salarié(e) qui souhaiterait un exemplaire papier (article L.3243-2 du Code du travail). Un acompte correspondant à la moitié de la rémunération mensuelle peut être demandé pour une quinzaine (article L.3242-1 du Code du travail).')
  b += sc(n + '.' + (k++), 'Repas', 'Le/la Salarié(e) présent(e) sur un service couvrant l\'heure du repas bénéficie d\'un repas pris sur place, fourni par l\'établissement. Cet avantage en nature est évalué et déclaré selon la valeur forfaitaire fixée par l\'URSSAF pour les hôtels, cafés et restaurants (<strong>4,25 € par repas en 2026</strong>) ; il apparaît sur le bulletin de paie et est soumis à cotisations.')
  b += sc(n + '.' + (k++), 'Dimanche et jours fériés', 'L\'établissement est habituellement ouvert le dimanche ; le travail dominical fait partie de l\'organisation normale et la CCN 1501 ne prévoit pas de majoration spécifique à ce titre. Les jours fériés travaillés sont rémunérés au tarif normal, à l\'exception du <strong>1<sup>er</sup> mai</strong> qui, s\'il est travaillé, est payé double (indemnité égale au salaire de la journée, article L.3133-6 du Code du travail). Les jours fériés chômés ne donnent lieu à aucune perte de salaire pour le/la Salarié(e) ayant au moins 3 mois d\'ancienneté.')
  b += sc(n + '.' + (k++), 'Pourboires', 'Les pourboires éventuellement laissés par la clientèle sont centralisés et répartis entre les membres de l\'équipe présents selon les règles internes de l\'établissement. Ils ne constituent pas un élément du salaire contractuel.')
  b += sc(n + '.' + (k++), 'Évolution', 'La rémunération pourra évoluer par avenant, notamment à l\'occasion de l\'entretien annuel, en fonction des compétences acquises, de l\'ancienneté et des résultats de l\'entreprise.')
  return art(n, 'Rémunération', b, emp)
}

export function buildArtRemunerationExtra(c, emp, n) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Taux horaire', 'Le/la Salarié(e) perçoit une rémunération brute de <strong>' + safe(c.taux_horaire_brut) + ' € par heure</strong> (' + safe(c.taux_horaire_lettres) + ' euros), pour chaque heure de travail effectif réalisée dans le cadre des vacations prévues à l\'article 2. Ce taux est au moins égal au SMIC et au minimum conventionnel de la CCN 1501 pour la classification retenue.')
  b += sc(n + '.' + (k++), 'Heures supplémentaires', 'Les heures effectuées au-delà de 35 heures sur une même semaine, à la demande de l\'Employeur, sont majorées de <strong>25 %</strong> de la 36<sup>e</sup> à la 43<sup>e</sup> heure et de <strong>50 %</strong> au-delà (article L.3121-36 du Code du travail).')
  b += sc(n + '.' + (k++), 'Dimanche et jours fériés', 'L\'établissement ouvre habituellement le dimanche ; la CCN 1501 ne prévoit pas de majoration pour le travail dominical. Le <strong>1<sup>er</sup> mai</strong> travaillé est payé double (article L.3133-6 du Code du travail).')
  b += sc(n + '.' + (k++), 'Indemnité compensatrice de congés payés', 'À la fin du contrat, le/la Salarié(e) perçoit une indemnité compensatrice de congés payés égale à <strong>10 % de la rémunération brute totale</strong> perçue pendant le contrat (article L.1242-16 du Code du travail).')
  b += sc(n + '.' + (k++), 'Indemnité de fin de contrat', 'S\'agissant d\'un CDD d\'usage, l\'indemnité de fin de contrat (dite « de précarité ») <strong>n\'est pas due</strong>, conformément à l\'article L.1243-10, 1° du Code du travail.')
  b += sc(n + '.' + (k++), 'Repas', 'Le/la Salarié(e) présent(e) sur un service couvrant l\'heure du repas bénéficie d\'un repas fourni par l\'établissement, évalué selon le forfait URSSAF hôtels-cafés-restaurants (<strong>4,25 € en 2026</strong>) et déclaré sur le bulletin de paie.')
  b += sc(n + '.' + (k++), 'Paiement', 'La rémunération est versée par virement bancaire à la fin du contrat ou, si le contrat couvre plusieurs mois, à la fin de chaque mois, au plus tard le 5 du mois suivant, avec remise du bulletin de paie sous forme dématérialisée.')
  return art(n, 'Rémunération et avantages', b, emp)
}

export function buildArtFraisTransport(emp, n) {
  var b = ''
  b += '<p>L\'Employeur prend en charge <strong>50 % du prix des abonnements</strong> de transports publics (Navigo mensuel ou annuel, abonnement vélo en libre-service) souscrits par le/la Salarié(e) pour ses trajets entre son domicile et le lieu de travail, conformément à l\'article L.3261-2 du Code du travail.</p>'
  b += '<p>Concrètement : le/la Salarié(e) remet chaque mois (ou une fois par an pour un abonnement annuel) son justificatif d\'abonnement à son nom ; le remboursement apparaît sur le bulletin de paie du mois suivant, exonéré de cotisations et d\'impôt dans les limites légales. Aucun remboursement n\'est dû pour les titres de transport à l\'unité ni pour les périodes d\'absence complète du mois.</p>'
  b += '<p>Les déplacements effectués à la demande de l\'Employeur pour des prestations extérieures (voir la clause de mobilité, article 5) sont remboursés séparément, sur justificatifs, comme frais professionnels.</p>'
  return art(n, 'Frais de transport domicile-travail', b, emp)
}

export function buildArtAbsences(emp, n, kind) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Prévenir', 'Toute absence, quelle qu\'en soit la cause, doit être signalée à l\'Employeur <strong>le plus tôt possible et au plus tard avant le début du service</strong> (appel téléphonique ou message au responsable, l\'email seul ne suffit pas en cas d\'urgence). Une absence non signalée et non justifiée constitue une faute.')
  b += sc(n + '.' + (k++), 'Justifier', 'En cas de maladie ou d\'accident, le/la Salarié(e) transmet à l\'Employeur le volet employeur de l\'arrêt de travail dans un délai de <strong>48 heures</strong> (article L.1226-1 du Code du travail) et adresse les volets 1 et 2 à sa caisse d\'assurance maladie dans le même délai (article R.321-2 du Code de la sécurité sociale). Tout prolongement d\'arrêt est signalé et justifié dans les mêmes conditions.')
  if (kind === "cdi") {
    b += sc(n + '.' + (k++), 'Indemnisation', 'Pendant un arrêt maladie, le/la Salarié(e) perçoit les indemnités journalières de la Sécurité sociale (après un délai de carence de 3 jours) et, à partir d\'<strong>un an d\'ancienneté</strong>, un complément de salaire versé par l\'Employeur dans les conditions de l\'article L.1226-1 du Code du travail et de la CCN 1501 (90 % du salaire brut pendant 30 jours puis 66,66 % pendant 30 jours, durées allongées avec l\'ancienneté ; délai de carence de 7 jours pour la maladie non professionnelle, aucun pour l\'accident du travail). Le régime de prévoyance (article ' + (n + 2) + ') prend le relais pour les arrêts longs.')
    b += sc(n + '.' + (k++), 'Accident du travail', 'Tout accident survenu pendant le travail ou sur le trajet doit être déclaré à l\'Employeur <strong>dans la journée</strong> ou au plus tard dans les 24 heures, même s\'il paraît bénin, afin que la déclaration à la CPAM soit faite dans les 48 heures (article L.441-2 du Code de la sécurité sociale).')
    b += sc(n + '.' + (k++), 'Contre-visite', 'L\'Employeur qui verse un complément de salaire peut faire procéder à une contre-visite médicale au domicile du/de la Salarié(e) pendant les heures de présence obligatoires (article L.1226-1 du Code du travail).')
    b += sc(n + '.' + (k++), 'Congés pour événements familiaux', 'Le/la Salarié(e) bénéficie, sur justificatif et sans perte de salaire, d\'autorisations d\'absence pour les événements suivants (article L.3142-4 du Code du travail, sauf dispositions conventionnelles plus favorables) : mariage ou PACS : <strong>4 jours</strong> ; mariage d\'un enfant : <strong>1 jour</strong> ; naissance ou adoption : <strong>3 jours</strong> ; décès du conjoint, partenaire de PACS ou concubin, d\'un parent, beau-parent, frère ou sœur : <strong>3 jours</strong> ; décès d\'un enfant : <strong>5 jours</strong> (12 jours si l\'enfant avait moins de 25 ans) ; annonce d\'un handicap, d\'une pathologie chronique ou d\'un cancer chez un enfant : <strong>2 jours</strong>. Ces jours se prennent au moment de l\'événement.')
    b += sc(n + '.' + (k++), 'Autres absences', 'Les absences pour convenance personnelle (rendez-vous, démarches) sont à poser en congés payés ou en repos, avec l\'accord préalable du responsable. Les rendez-vous médicaux obligatoires (médecine du travail, examens de grossesse) sont pris sur le temps de travail sans perte de salaire.')
  } else {
    b += sc(n + '.' + (k++), 'Conséquence sur les vacations', 'Une vacation non effectuée pour cause d\'absence justifiée n\'est pas rémunérée, sauf indemnisation par la Sécurité sociale. L\'Employeur pourra proposer, sans obligation, une vacation de remplacement.')
  }
  return art(n, 'Absences, maladie et accident', b, emp)
}

export function buildArtVip(c, emp, n) {
  var svc = c.service_sante_travail || MESHUGA_LEGAL.medecine_travail.nom
  var adr = c.service_sante_travail ? '' : ' — ' + MESHUGA_LEGAL.medecine_travail.adresse + (MESHUGA_LEGAL.medecine_travail.telephone ? ' — Tél. ' + MESHUGA_LEGAL.medecine_travail.telephone : '')
  var b = ''
  b += '<p>Le/la Salarié(e) bénéficie d\'une <strong>visite d\'information et de prévention (VIP)</strong> auprès du service de prévention et de santé au travail de l\'Employeur, <strong>' + esc(svc) + '</strong>' + adr + ', dans un délai maximal de <strong>3 mois</strong> à compter de la prise de poste (article R.4624-10 du Code du travail). Cette visite n\'est pas un examen d\'aptitude : elle permet d\'informer le/la Salarié(e) sur les risques de son poste et de vérifier que son état de santé est compatible avec celui-ci.</p>'
  b += '<p>Le/la Salarié(e) sera ensuite convoqué(e) périodiquement (tous les 5 ans au plus, ou selon une périodicité plus courte fixée par le médecin du travail) et systématiquement après un arrêt de travail de plus de 30 jours, un congé maternité, une maladie professionnelle ou un accident du travail ayant entraîné un arrêt (visite de reprise). Il/elle peut aussi demander à tout moment, de sa propre initiative, à rencontrer le médecin du travail ; cette démarche est confidentielle.</p>'
  b += '<p>Les convocations sont remises par l\'Employeur ; le temps passé en visite est du temps de travail rémunéré et les frais de transport sont pris en charge.</p>'
  return art(n, 'Visite d\'information et de prévention', b, emp)
}

export function buildArtProtectionSociale(c, emp, n, kind) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Convention collective', 'Le présent contrat est régi par la <strong>Convention Collective Nationale de la Restauration Rapide (IDCC 1501)</strong>, ses avenants et accords. Elle fixe notamment la grille des salaires minimaux, les durées de préavis, les congés spéciaux et les règles de classification. Un exemplaire à jour est tenu à la disposition du/de la Salarié(e) auprès de la direction et consultable gratuitement sur legifrance.gouv.fr. En cas de conflit entre le contrat et la convention, la disposition la plus favorable au/à la Salarié(e) s\'applique.')
  b += sc(n + '.' + (k++), 'Retraite complémentaire', 'L\'Employeur cotise pour le/la Salarié(e) au régime de retraite complémentaire AGIRC-ARRCO auprès de <strong>' + MESHUGA_LEGAL.retraite.nom + '</strong>, ' + MESHUGA_LEGAL.retraite.adresse + '. Les cotisations (part salariale et part patronale) figurent sur le bulletin de paie et alimentent les points de retraite du/de la Salarié(e), consultables sur son espace personnel info-retraite.fr.')
  b += sc(n + '.' + (k++), 'Prévoyance', 'Le/la Salarié(e) est affilié(e) d\'office au contrat collectif de prévoyance souscrit par l\'Employeur auprès de <strong>' + (c.prevoyance_organisme || MESHUGA_LEGAL.prevoyance.nom) + '</strong>' + (c.prevoyance_organisme ? (c.prevoyance_adresse ? ', ' + esc(c.prevoyance_adresse) : '') : ', ' + MESHUGA_LEGAL.prevoyance.adresse) + ', conformément à la CCN 1501. Ce contrat garantit un complément de revenu en cas d\'arrêt de travail de longue durée (incapacité), une rente en cas d\'invalidité et un capital versé aux proches en cas de décès. La notice d\'information détaillant les garanties est remise au/à la Salarié(e) avec le présent contrat.')
  b += sc(n + '.' + (k++), 'Complémentaire santé (mutuelle)', 'Le/la Salarié(e) est affilié(e) d\'office au contrat collectif obligatoire de complémentaire santé souscrit auprès de <strong>' + MESHUGA_LEGAL.complementaire_sante.nom + '</strong>, ' + MESHUGA_LEGAL.complementaire_sante.adresse + ' (article L.911-7 du Code de la sécurité sociale). La cotisation est prise en charge <strong>au moins à 50 % par l\'Employeur</strong>, le solde étant retenu sur le bulletin de paie. Le/la Salarié(e) peut demander une dispense d\'affiliation, par écrit et sur justificatif, dans les cas prévus par la loi : ' + (kind === "extra" ? 'CDD de moins de 3 mois, ' : '') + 'couverture obligatoire en tant qu\'ayant droit de la mutuelle de son conjoint, bénéfice de la Complémentaire santé solidaire, ou contrat individuel en cours jusqu\'à son échéance. En cas de départ de l\'entreprise avec droits au chômage, la mutuelle et la prévoyance sont maintenues gratuitement jusqu\'à 12 mois (portabilité, article L.911-8 du Code de la sécurité sociale).')
  b += sc(n + '.' + (k++), 'Déclarations sociales', 'L\'Employeur effectue la Déclaration Préalable à l\'Embauche (DPAE) auprès de l\'URSSAF d\'Île-de-France avant la prise de poste, puis transmet chaque mois la Déclaration Sociale Nominative (DSN). Le/la Salarié(e) peut vérifier ses droits sur mesdroitssociaux.gouv.fr. Il/elle dispose d\'un droit d\'accès, de rectification et d\'effacement sur ses données personnelles (voir article sur les données personnelles).')
  return art(n, 'Convention collective et protection sociale', b, emp)
}

export function buildArtTenueHaccp(emp, n) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Tenue professionnelle', 'L\'Employeur fournit gratuitement la tenue de travail (veste, tablier, coiffe ou casquette, et le cas échéant chaussures de sécurité antidérapantes). Le/la Salarié(e) la porte à chaque service, propre et en bon état, et la restitue à la fin du contrat. Son entretien est assuré selon les modalités indiquées par l\'Employeur ; lorsque l\'entretien est laissé à la charge du/de la Salarié(e), une indemnité ou une fourniture équivalente est prévue conformément à la jurisprudence.')
  b += sc(n + '.' + (k++), 'Hygiène personnelle', 'Conformément à l\'arrêté du 21 décembre 2009 et au règlement (CE) n° 852/2004, le/la Salarié(e) s\'engage à : se laver les mains à chaque prise de poste, après chaque pause, après passage aux sanitaires et entre deux manipulations à risque ; garder les ongles courts, propres et sans vernis ; retirer bijoux, montres et piercings visibles pendant le service (une alliance lisse est tolérée) ; attacher et couvrir intégralement les cheveux en zone de production ; ne pas porter de parfum marqué en cuisine ; signaler immédiatement toute plaie, infection cutanée, trouble digestif ou maladie contagieuse, qui peut entraîner un aménagement temporaire de poste.')
  b += sc(n + '.' + (k++), 'HACCP et sécurité alimentaire', 'Le/la Salarié(e) applique le Plan de Maîtrise Sanitaire (PMS) de l\'établissement : respect de la marche en avant, de la chaîne du froid et des températures de conservation, des DLC/DDM, étiquetage et datage des préparations, enregistrement des relevés de températures et des autocontrôles, protocoles de nettoyage et de désinfection affichés. Il/elle signale sans délai toute non-conformité (rupture de chaîne du froid, panne d\'équipement, suspicion d\'intoxication) et suit les formations à l\'hygiène organisées par l\'Employeur. Le respect de ces règles est une obligation essentielle du contrat compte tenu des risques pour la santé des clients.')
  b += sc(n + '.' + (k++), 'Sécurité', 'Le/la Salarié(e) respecte les consignes de sécurité (utilisation des équipements de protection, manipulation des couteaux et des machines, produits d\'entretien, gestes et postures), participe aux exercices et signale tout danger. Il/elle est informé(e) de l\'emplacement des extincteurs, de la trousse de secours et des issues de secours dès son arrivée.')
  return art(n, 'Tenue, hygiène et sécurité alimentaire (HACCP)', b, emp)
}

export function buildArtConfidentialite(emp, n, kind) {
  var duree = kind === "extra" ? "deux (2) ans" : "trois (3) ans"
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Informations protégées', 'Le/la Salarié(e) s\'engage à garder strictement confidentielles, pendant le contrat et pendant <strong>' + duree + '</strong> après sa fin, toutes les informations non publiques dont il/elle a connaissance dans le cadre de son travail, notamment : les <strong>recettes, fiches techniques, procédés et tours de main</strong> de MESHUGA ; l\'identité et les <strong>conditions négociées avec les fournisseurs</strong> ; les <strong>prix de revient, marges et données financières</strong> ; le <strong>fichier clients et prospects</strong>, les devis et conditions commerciales de l\'activité traiteur ; les projets de développement ; les informations personnelles concernant les collègues (salaires, situations privées).')
  b += sc(n + '.' + (k++), 'Ce que cela implique', 'Ne pas copier, photographier, transférer ou emporter de documents, fichiers ou fiches recettes ; ne pas publier sur les réseaux sociaux d\'informations sur les coulisses (recettes, fournisseurs, chiffres, clients, événements privés) sans autorisation ; ne pas en parler à des tiers, y compris des proches. Les documents et accès informatiques sont restitués et désactivés à la fin du contrat.')
  b += sc(n + '.' + (k++), 'Loyauté', 'Pendant l\'exécution du contrat, le/la Salarié(e) s\'abstient de tout acte de concurrence directe et de tout dénigrement de l\'Employeur, de ses produits ou de ses clients, en public comme sur les réseaux sociaux. Il/elle informe l\'Employeur de tout conflit d\'intérêts (activité, lien familial ou financier avec un fournisseur, un client ou un concurrent).')
  b += sc(n + '.' + (k++), 'Absence de clause de non-concurrence', 'Le présent contrat <strong>ne contient pas de clause de non-concurrence</strong> : après son départ, le/la Salarié(e) est libre de travailler pour tout autre employeur, y compris un restaurant ou un traiteur, sous réserve de l\'obligation de confidentialité ci-dessus. Le/la Salarié(e) déclare par ailleurs n\'être lié(e) par aucune clause de non-concurrence ou d\'exclusivité envers un précédent employeur qui ferait obstacle au présent contrat.')
  b += sc(n + '.' + (k++), 'Sanctions', 'Toute violation de ces obligations peut constituer une faute grave et engager la responsabilité civile, voire pénale, du/de la Salarié(e) (secret des affaires, articles L.151-1 et suivants du Code de commerce).')
  return art(n, 'Confidentialité et loyauté', b, emp)
}

export function buildArtVideo(emp, n) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Vidéosurveillance', 'Le/la Salarié(e) est informé(e) que l\'établissement est équipé d\'un système de vidéosurveillance. <strong>Finalités</strong> : sécurité des personnes et des biens, prévention des vols et des agressions, constitution de preuves en cas d\'incident. <strong>Base légale</strong> : intérêt légitime de l\'Employeur (article 6.1.f du RGPD). <strong>Zones filmées</strong> : salle, comptoir et caisse, réserve et zones de livraison, à l\'exclusion des locaux de pause, des vestiaires et des sanitaires. Les caméras ne filment pas en continu un poste de travail dans le but de surveiller l\'activité d\'un membre du personnel. <strong>Durée de conservation</strong> : 30 jours maximum, sauf extraction pour les besoins d\'une procédure. <strong>Accès aux images</strong> : direction uniquement, et forces de l\'ordre sur réquisition. Des panneaux d\'information sont affichés à l\'entrée.')
  b += sc(n + '.' + (k++), 'Données personnelles', 'Les données du/de la Salarié(e) (état civil, coordonnées, numéro de sécurité sociale, RIB, titre de séjour le cas échéant, données de paie, plannings, pointages, arrêts de travail, formations, évaluations) sont traitées par l\'Employeur pour la gestion du personnel, de la paie et des obligations légales. Elles sont hébergées sur des serveurs sécurisés dans l\'Union européenne, accessibles à la direction et au cabinet de paie, et transmises aux seuls organismes légalement destinataires (URSSAF, caisses de retraite, prévoyance, mutuelle, médecine du travail, administration fiscale). Elles sont conservées pendant la durée du contrat puis 5 ans après sa fin (délais de prescription), les bulletins de paie 50 ans.')
  b += sc(n + '.' + (k++), 'Droits', 'Le/la Salarié(e) dispose d\'un droit d\'accès, de rectification, d\'effacement, de limitation, de portabilité et d\'opposition sur ses données, ainsi que du droit de consulter les images de vidéosurveillance le/la concernant. Ces droits s\'exercent auprès de la direction (courrier ou email), qui répond dans un délai d\'un mois. En cas de désaccord, une réclamation peut être adressée à la CNIL (www.cnil.fr).')
  return art(n, 'Vidéosurveillance et données personnelles', b, emp)
}

export function buildArtDiscipline(emp, n) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Règles internes', 'Le/la Salarié(e) s\'engage à respecter les règles de fonctionnement de l\'établissement, portées à sa connaissance dans le <strong>Dossier de bienvenue Meshuga</strong> remis avec le présent contrat : ponctualité et présence aux services planifiés, tenue et hygiène, procédures de caisse et d\'encaissement, gestion des stocks et des invendus, usage du téléphone personnel limité aux pauses, interdiction de consommer de l\'alcool ou des stupéfiants pendant le service et d\'arriver sous leur emprise, interdiction de fumer ou de vapoter dans les locaux, respect des collègues et de la clientèle.')
  b += sc(n + '.' + (k++), 'Échelle des sanctions', 'En cas de manquement, l\'Employeur peut prononcer, en fonction de la gravité et selon les articles L.1331-1 et suivants du Code du travail : un <strong>avertissement</strong> ou un <strong>blâme</strong> écrit ; une <strong>mise à pied disciplinaire</strong> sans salaire, d\'une durée maximale de 3 jours ; une <strong>mutation ou rétrogradation</strong> avec l\'accord du/de la Salarié(e) ; un <strong>licenciement</strong> pour faute simple, grave ou lourde. Les amendes et sanctions pécuniaires sont interdites.')
  b += sc(n + '.' + (k++), 'Procédure et garanties', 'Aucune sanction autre qu\'un avertissement ne peut être prise sans que le/la Salarié(e) ait été convoqué(e) à un <strong>entretien préalable</strong>, au cours duquel il/elle peut se faire assister par une personne de son choix appartenant au personnel de l\'entreprise (ou, à défaut de représentants du personnel, par un conseiller extérieur figurant sur la liste préfectorale). La sanction est notifiée par écrit et motivée, au plus tôt 2 jours ouvrables et au plus tard un mois après l\'entretien. Aucun fait fautif ne peut être sanctionné plus de deux mois après que l\'Employeur en a eu connaissance.')
  b += sc(n + '.' + (k++), 'Harcèlement et discrimination', 'L\'Employeur s\'engage à prévenir tout harcèlement moral ou sexuel et toute discrimination (articles L.1152-1, L.1153-1 et L.1132-1 du Code du travail). Tout membre du personnel témoin ou victime peut alerter directement la direction, le médecin du travail ou l\'inspection du travail, sans risque de sanction.')
  return art(n, 'Discipline et règles internes', b, emp)
}

export function buildArtRuptureCdi(emp, n) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Principe', 'Le présent contrat, conclu pour une durée indéterminée, peut être rompu à l\'initiative de l\'une ou l\'autre des Parties dans les conditions prévues par le Code du travail et la CCN 1501, sous réserve du respect d\'un préavis, sauf pendant la période d\'essai, en cas de faute grave ou lourde, ou de dispense de préavis.')
  b += sc(n + '.' + (k++), 'Démission', 'Le/la Salarié(e) qui souhaite quitter l\'entreprise le notifie par écrit (lettre remise en main propre contre décharge, recommandé ou email confirmé) et effectue le préavis prévu par la CCN 1501 pour sa catégorie et son ancienneté (à titre indicatif : 15 jours durant les six premiers mois, puis 1 mois ; durées à vérifier dans la convention en vigueur à la date de la démission). L\'Employeur peut dispenser le/la Salarié(e) d\'effectuer tout ou partie du préavis.')
  b += sc(n + '.' + (k++), 'Licenciement', 'Tout licenciement doit reposer sur une cause réelle et sérieuse et respecter la procédure légale : convocation à un entretien préalable (au moins 5 jours ouvrables avant), entretien avec possibilité d\'assistance, puis notification écrite et motivée au plus tôt 2 jours ouvrables après l\'entretien. Le préavis est d\'au moins <strong>1 mois</strong> entre 6 mois et 2 ans d\'ancienneté et <strong>2 mois</strong> au-delà de 2 ans (article L.1234-1 du Code du travail), sauf durée conventionnelle plus favorable. À partir de 8 mois d\'ancienneté, une indemnité de licenciement est due, égale au minimum à 1/4 de mois de salaire par année d\'ancienneté jusqu\'à 10 ans puis 1/3 de mois au-delà (article R.1234-2 du Code du travail), sauf faute grave ou lourde.')
  b += sc(n + '.' + (k++), 'Rupture conventionnelle', 'Les Parties peuvent convenir d\'un commun accord de mettre fin au contrat par rupture conventionnelle (articles L.1237-11 et suivants du Code du travail), après un ou plusieurs entretiens, avec un délai de rétractation de 15 jours calendaires et homologation par l\'administration. L\'indemnité ne peut être inférieure à l\'indemnité légale de licenciement, et le/la Salarié(e) conserve ses droits à l\'assurance chômage.')
  b += sc(n + '.' + (k++), 'Pendant le préavis', 'Pendant le préavis, le/la Salarié(e) continue de travailler et d\'être rémunéré(e) normalement. En cas de licenciement, il/elle bénéficie des heures d\'absence pour recherche d\'emploi prévues par la CCN 1501, rémunérées.')
  b += sc(n + '.' + (k++), 'Documents de fin de contrat', 'À la fin du contrat, l\'Employeur remet au/à la Salarié(e) : le <strong>certificat de travail</strong>, l\'<strong>attestation destinée à France Travail</strong> (permettant l\'ouverture des droits au chômage), le <strong>reçu pour solde de tout compte</strong> détaillant les sommes versées (dernier salaire, indemnité compensatrice de congés payés, indemnités éventuelles), ainsi que la notice de portabilité de la mutuelle et de la prévoyance. Le reçu pour solde de tout compte peut être dénoncé par écrit dans les 6 mois.')
  b += sc(n + '.' + (k++), 'Restitution', 'Le/la Salarié(e) restitue à son départ les tenues, clés, badges, matériels et documents appartenant à l\'entreprise.')
  return art(n, 'Rupture du contrat', b, emp)
}

export function buildArtRuptureExtra(emp, n) {
  var b = ''
  b += '<p>Le présent contrat prend fin automatiquement à la date prévue à l\'article 2, sans formalité ni préavis. Avant ce terme, il ne peut être rompu que dans les cas limitativement prévus par l\'article L.1243-1 du Code du travail :</p>'
  b += '<ul>'
  b += '<li><strong>Accord écrit</strong> entre l\'Employeur et le/la Salarié(e) ;</li>'
  b += '<li><strong>Faute grave</strong> de l\'une ou l\'autre des Parties (par exemple : absence injustifiée à une vacation, vol, violence, manquement grave aux règles d\'hygiène) ;</li>'
  b += '<li><strong>Force majeure</strong> (événement imprévisible et irrésistible rendant impossible la poursuite du contrat) ;</li>'
  b += '<li><strong>Inaptitude</strong> constatée par le médecin du travail ;</li>'
  b += '<li>À l\'initiative du/de la Salarié(e) uniquement, s\'il/elle justifie d\'une <strong>embauche en CDI</strong> ailleurs, moyennant un préavis d\'un jour par semaine de contrat (dans la limite de deux semaines).</li>'
  b += '</ul>'
  b += '<p>Une rupture anticipée en dehors de ces cas ouvre droit à des dommages et intérêts pour la Partie qui la subit (articles L.1243-3 et L.1243-4 du Code du travail). À la fin du contrat, l\'Employeur remet le certificat de travail, l\'attestation France Travail et le reçu pour solde de tout compte, avec le paiement de l\'indemnité compensatrice de congés payés.</p>'
  return art(n, 'Fin du contrat et rupture anticipée', b, emp)
}

export function buildArtCumul(emp, n) {
  var b = ''
  b += '<p>Le/la Salarié(e) déclare être libre de tout engagement et n\'être lié(e) par aucune clause de non-concurrence ou d\'exclusivité envers un précédent ou un autre employeur.</p>'
  b += '<p>S\'il/elle occupe un ou plusieurs autres emplois, il/elle en informe l\'Employeur et s\'engage à ce que le cumul respecte les durées maximales de travail (10 heures par jour, 48 heures par semaine, tous employeurs confondus) et les repos obligatoires (articles L.8261-1 et L.8261-2 du Code du travail). Le/la Salarié(e) fournit sur demande une attestation de ses heures chez ses autres employeurs.</p>'
  b += '<p>Si le/la Salarié(e) est demandeur/demandeuse d\'emploi, il/elle est responsable de la déclaration de cette activité à France Travail.</p>'
  return art(n, 'Cumul d\'emplois', b, emp)
}

export function buildArtDiversesExtra(emp, n) {
  var k = 1
  var b = ''
  b += sc(n + '.' + (k++), 'Règles internes', 'Le/la Salarié(e) s\'engage à respecter les règles de fonctionnement de l\'établissement (ponctualité, tenue, hygiène HACCP, procédures de caisse, interdiction de fumer/vapoter dans les locaux et de consommer de l\'alcool ou des stupéfiants pendant le service, usage du téléphone personnel limité aux pauses). Tout manquement peut entraîner une sanction disciplinaire dans les conditions des articles L.1331-1 et suivants du Code du travail.')
  b += sc(n + '.' + (k++), 'Changement de situation', 'Le/la Salarié(e) informe l\'Employeur sans délai de tout changement d\'adresse, de coordonnées, de situation familiale, de coordonnées bancaires ou de titre de séjour.')
  b += sc(n + '.' + (k++), 'Renouvellement et succession de contrats', 'Le présent CDD d\'usage peut être suivi d\'autres contrats d\'extra pour de nouvelles vacations, sans délai de carence (article L.1244-4-1 du Code du travail). Chaque nouvelle vacation fait l\'objet d\'un nouveau contrat écrit. Le recours répété aux contrats d\'extra ne crée pas de droit à un CDI, mais l\'Employeur informe le/la Salarié(e) des postes en CDI qui se libèrent, à sa demande.')
  b += sc(n + '.' + (k++), 'Modification', 'Toute modification du présent contrat fera l\'objet d\'un avenant écrit signé des deux Parties.')
  return art(n, 'Dispositions diverses', b, emp)
}

export function buildArtJuridiction(emp, n) {
  var b = ''
  b += '<p>Pour l\'exécution du présent contrat, les Parties élisent domicile aux adresses indiquées en tête du contrat. Chaque Partie informe l\'autre de tout changement d\'adresse.</p>'
  b += '<p>Le présent contrat est soumis au droit français. En cas de difficulté, les Parties s\'efforcent d\'abord de trouver une solution amiable par le dialogue. À défaut, tout litige relatif à la conclusion, l\'exécution ou la rupture du contrat relève du <strong>Conseil de Prud\'hommes de Paris</strong>, juridiction du lieu de l\'établissement, sans préjudice du droit du/de la Salarié(e) de saisir celui de son domicile ou du lieu où le contrat a été conclu (article R.1412-1 du Code du travail). La saisine du Conseil de Prud\'hommes est gratuite et ne nécessite pas d\'avocat.</p>'
  b += '<p>Le présent contrat est établi en deux exemplaires originaux, dont un remis au/à la Salarié(e). Il annule et remplace tout accord antérieur ayant le même objet.</p>'
  return art(n, 'Domicile, droit applicable et juridiction compétente', b, emp)
}

export function buildSharedSignatures(c, emp, salarieRole) {
  var civilite = emp.civilite || "Madame"
  var feminin = (civilite === "Madame" || civilite === "Mademoiselle")
  var dateSig = c.date_signature
    ? new Date(c.date_signature).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "[date à compléter]"
  var ville = c.ville_signature || "Paris"

  return ''
    + '</div>' // ferme .page ouverte par buildSharedHeader
    + '<div class="signature-page">'
    + '<section class="sig-section">'
    + '<h2 class="yt">Signatures</h2>'
    + '<div class="rule"></div>'
    + '<div class="fait-banner">Fait à <strong>' + esc(ville) + '</strong>, en deux exemplaires originaux dont un remis à chacune des Parties, le <strong>' + esc(dateSig) + '</strong>.<span class="small">Le paraphe figurant en bas à droite de chaque page (en lettres Yellowtail rose) constitue le paraphe ' + (feminin ? 'de la Salariée' : 'du Salarié') + ', à l\'identique de la signature électronique apposée ci-dessous. Le premier paraphe correspond à l\'Employeur (E.T. — Edward TOURET).</span></div>'
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
    + (hasMobilite(c) ? '<div class="sig-mob" style="font-size:10.5px;line-height:1.45;border:1.5px solid #191923;border-left:5px solid #FF82D7;padding:6px 9px;margin:6px 0;background:#FFF7FC"><strong>Clause de mobilité (Île-de-France — prestations événementielles B2B) :</strong> ' + (feminin ? 'la Salariée' : 'le Salarié') + ' déclare l\'avoir lue et l\'<strong>accepter expressément</strong>. Mention manuscrite : « Lu et approuvé — clause de mobilité acceptée ».</div>' : '')
    + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé' + (hasMobilite(c) ? ' — clause de mobilité acceptée' : '') + ' »</div>'
    + '<div class="sig-foot">Date : __ / __ / ____</div>'
    + '</div>'
    + '</div></section>'
    + '</div>'   // ferme .signature-page
}

// ============================================================
// Wrapper HTML complet — v14 sans Paged.js
// ============================================================
export function wrapHtml(opts) {
  var titre = opts.titre
  var css = opts.css
  var body = opts.body
  var signatures = opts.signatures || ''

  var assembled = body + signatures

  return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(titre) + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">'
    + '<style>' + css + '</style></head><body>'
    + assembled
    + '</body></html>'
}

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
// 1. BUILDER : Contrat d'EXTRA
// ============================================================
export function buildExtraContract(c, emp, vacs, logoUri) {
  var safeVacs = vacs || []
  var totalMin = 0
  safeVacs.forEach(function (v) { totalMin += (v.duree_minutes || 0) })

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
    + '<p>Les vacations ci-dessous constituent le planning contractuel. Les horaires indiqués peuvent être ajustés de plus ou moins une heure selon le déroulement de la prestation ; toute heure effectuée au-delà est rémunérée. Le/la Salarié(e) pointe (ou fait valider par le responsable) ses heures de début et de fin réelles à chaque vacation.</p>'
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

    + buildMobiliteArticle(c, emp, 5)

    + buildArtRemunerationExtra(c, emp, 6)
    + buildArtAbsences(emp, 7, "extra")
    + buildArtVip(c, emp, 8)
    + buildArtProtectionSociale(c, emp, 9, "extra")
    + buildArtTenueHaccp(emp, 10)
    + buildArtConfidentialite(emp, 11, "extra")
    + buildArtVideo(emp, 12)
    + buildArtCumul(emp, 13)
    + buildArtRuptureExtra(emp, 14)
    + buildArtDiversesExtra(emp, 15)
    + buildArtJuridiction(emp, 16)

  var signatures = buildSharedSignatures(c, emp, c.fonction || "")
  var paraphText = buildParaphText("E.T.", resolveSalarieInitials(c, emp))
  var headerText = buildHeaderTagText(emp, "CONTRAT EXTRA")

  return wrapHtml({
    titre: "Contrat extra Meshuga — " + (emp.prenom || "") + " " + (emp.nom || ""),
    css: buildSharedCss(logoUri, paraphText, headerText),
    body: header + body + signatures
  })
}

// ============================================================
// 2. BUILDER : CDI Cadre / Manager
// ============================================================
export function buildCdiCadreContract(c, emp, logoUri) {
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

  var tauxBase = (salaire > 0 && heuresMensuelles > 0)
    ? Math.round((salaire / (Math.min(heuresMensuelles, 151.67) + heuresSup * 1.25)) * 100) / 100
    : 0

  var pe = c.periode_essai_mois || 2
  var peRenouv = c.periode_essai_renouvelable !== false
  var peTotal = peRenouv ? pe * 2 : pe

  var intActive = !!c.interessement_active
  var intTaux = c.interessement_taux_pct ? parseFloat(c.interessement_taux_pct) : 10
  var intAssiette = c.interessement_assiette || "chiffre d'affaires HT B2B encaissé"
  var intPeriodicite = c.interessement_periodicite || "mensuelle ou trimestrielle"

  var missionsHtml = renderMissionsBlocks(c.missions_blocks)

  var header = buildSharedHeader({
    emp: emp,
    titreCover: "CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE",
    sousTitreCover: "CDI · Articles L.1221-1 et suivants du Code du travail · CCN Restauration Rapide (IDCC 1501)",
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

    + buildMobiliteArticle(c, emp, 5)

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
    + '<p class="sub-clause"><span class="clause-label">7.1 — Salaire mensuel brut.</span> En contrepartie de l\'exécution de ses fonctions, le/la Salarié(e) percevra une rémunération brute mensuelle de <strong>' + formatEuros(salaire) + ' (' + esc(salaireLettres) + ' euros)</strong>, versée sur 12 mois, payable à terme échu au plus tard le 5 du mois suivant' + (c.taux_horaire_brut ? ', soit un taux horaire brut de <strong>' + String(parseFloat(c.taux_horaire_brut).toFixed(2)).replace('.', ',') + ' €</strong>' + (c.taux_horaire_lettres ? ' (' + esc(c.taux_horaire_lettres) + ' euros)' : '') + ' pour les heures normales, majoré de 25 % pour les heures supplémentaires structurelles' : '') + '.'
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
  var paraphText = buildParaphText("E.T.", resolveSalarieInitials(c, emp))
  var headerText = buildHeaderTagText(emp, "CONTRAT CDI")

  return wrapHtml({
    titre: "Contrat CDI Meshuga — " + (emp.prenom || "") + " " + (emp.nom || ""),
    css: buildSharedCss(logoUri, paraphText, headerText),
    body: header + body + signatures
  })
}

// ============================================================
// 3 & 4. BUILDERS : CDI Cuisinier / Caissier (via simple)
// ============================================================
export function buildCdiCuisinierContract(c, emp, logoUri) {
  return buildCdiSimpleContract(c, emp, logoUri, "cuisinier")
}
export function buildCdiCaissierContract(c, emp, logoUri) {
  return buildCdiSimpleContract(c, emp, logoUri, "caissier")
}

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
    logoUri: logoUri
  })

  var body = ''
    + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Engagement et nature du contrat</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) est engagé(e) par l\'Employeur dans le cadre d\'un <strong>contrat de travail à durée indéterminée (CDI)</strong> à temps plein, à compter du <strong>' + esc(dateEmbauche) + '</strong>, sous réserve des résultats de la visite d\'information et de prévention.</p>'
    + '<p>L\'ancienneté du/de la Salarié(e) est décomptée à partir de cette date. Le/la Salarié(e) déclare être libre de tout engagement et fournit à l\'Employeur, avant la prise de poste, les documents nécessaires à son embauche : pièce d\'identité, carte Vitale ou attestation de droits, RIB, justificatif de domicile et, le cas échéant, titre de séjour autorisant le travail en France.</p>'
    + '<p>Le présent engagement est subordonné à la déclaration préalable à l\'embauche (DPAE) effectuée auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Fonctions et qualification</span></div>'
    + '<div class="body">'
    + '<p>Le/la Salarié(e) est engagé(e) en qualité de <strong>' + esc(fonction) + '</strong>.</p>'
    + '<p>Il/elle est classé(e) selon la grille de classification de la Convention Collective Nationale de la Restauration Rapide (IDCC 1501) au <strong>' + esc(niveauLabel) + '</strong>, statut <strong>non-cadre</strong>. Cette classification détermine le salaire minimum conventionnel applicable, la durée de la période d\'essai et celle du préavis.</p>'
    + '<p>Le/la Salarié(e) exerce ses fonctions sous l\'autorité et selon les directives du Président de la Société ou de toute personne qu\'il désignera comme responsable de l\'établissement. Il/elle pourra être amené(e), à titre temporaire et dans le cadre de sa qualification, à occuper un autre poste de l\'établissement (polyvalence caisse / cuisine / préparation traiteur) pour les besoins du service, sans modification de sa rémunération.</p>'
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

    + buildMobiliteArticle(c, emp, 5)

    + buildArtDureeTravail(c, emp, 6, heuresHebdo, heuresMensuelles, heuresSup)
    + buildArtRemunerationCdi(c, emp, 7, salaire, salaireLettres, heuresMensuelles, heuresSup, tauxBase)
    + '<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Congés payés</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">8.1 — Acquisition.</span> Conformément à l\'article L.3141-3 du Code du travail, le/la Salarié(e) acquiert un droit à congés payés de <strong>2,5 jours ouvrables par mois de travail effectif</strong>, dans la limite de <strong>30 jours ouvrables (5 semaines)</strong> par période de référence. La période de référence pour l\'acquisition s\'étend du <strong>1er juin de l\'année N-1 au 31 mai de l\'année N</strong>.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.2 — Période de prise.</span> Conformément aux articles L.3141-13 et suivants du Code du travail, la période principale de prise des congés payés s\'étend du <strong>1er mai au 31 octobre</strong> de chaque année. Le/la Salarié(e) doit formuler ses demandes de congés <strong>au moins 2 mois avant</strong> la date de départ souhaitée, par écrit (email accepté), afin de permettre à l\'Employeur d\'organiser la continuité du service.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.3 — Planification annuelle.</span> L\'Employeur s\'engage à informer le/la Salarié(e), au plus tard le <strong>1er mars</strong> de chaque année, des dates de fermeture éventuelles de l\'établissement et à valider ou proposer un calendrier de congés au plus tard le <strong>30 avril</strong>. À défaut de demande de la part du/de la Salarié(e), l\'Employeur pourra fixer unilatéralement les dates dans le cadre de son pouvoir de direction.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.4 — Report exceptionnel.</span> À titre exceptionnel et après accord écrit préalable de l\'Employeur, le report d\'une partie des congés non pris au 31 octobre vers la période suivante peut être autorisé, dans la limite maximale de <strong>10 jours ouvrables</strong> et <strong>jusqu\'au 31 mars de l\'année suivante</strong> au plus tard.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.5 — Congés non pris.</span> Conformément à la jurisprudence constante de la Cour de cassation et à la directive européenne 2003/88/CE, les congés payés non pris au terme de la période de prise et n\'ayant pas fait l\'objet d\'un report autorisé au titre du 8.4 ci-dessus sont perdus, dès lors que l\'Employeur a effectivement mis le/la Salarié(e) en mesure de les prendre. Cette disposition ne s\'applique pas aux congés acquis pendant les périodes de suspension du contrat de travail (maladie, accident du travail, maternité, paternité), qui bénéficient d\'un report légal de <strong>15 mois</strong> conformément à la loi n° 2024-364 du 22 avril 2024.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.6 — Indemnité compensatrice.</span> En cas de rupture du contrat de travail, les congés payés acquis et non pris donneront lieu au versement d\'une indemnité compensatrice de congés payés, conformément à l\'article L.3141-28 du Code du travail.</p>'
    + '</div>'

    + buildArtFraisTransport(emp, 9)
    + buildArtAbsences(emp, 10, "cdi")
    + buildArtVip(c, emp, 11)
    + buildArtProtectionSociale(c, emp, 12, "cdi")
    + buildArtTenueHaccp(emp, 13)
    + buildArtConfidentialite(emp, 14, "cdi")
    + buildArtVideo(emp, 15)
    + buildArtDiscipline(emp, 16)
    + buildArtRuptureCdi(emp, 17)
    + buildArtJuridiction(emp, 18)

  var signatures = buildSharedSignatures(c, emp, fonction)
  var paraphText = buildParaphText("E.T.", resolveSalarieInitials(c, emp))
  var headerText = buildHeaderTagText(emp, "CONTRAT CDI")

  return wrapHtml({
    titre: "Contrat CDI Meshuga — " + (emp.prenom || "") + " " + (emp.nom || ""),
    css: buildSharedCss(logoUri, paraphText, headerText),
    body: header + body + signatures
  })
}

// ============================================================
// DISPATCHER
// ============================================================
export function buildContract(c, emp, vacs, logoUri) {
  if (!c || !emp) return ''
  var t = c.type || "extra"
  var civ = (emp.civilite || "Madame")
  var isFemale = (civ === "Madame" || civ === "Mademoiselle")
  var html
  if (t === "cdi_cadre") html = buildCdiCadreContract(c, emp, logoUri)
  else if (t === "cdi_cuisinier") html = buildCdiCuisinierContract(c, emp, logoUri)
  else if (t === "cdi_caissier") html = buildCdiCaissierContract(c, emp, logoUri)
  else html = buildExtraContract(c, emp, vacs, logoUri)
  return genderize(html, isFemale)
}
