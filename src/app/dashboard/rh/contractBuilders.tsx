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
    +   '@bottom-right{'
    +     'content:"' + ptxt + '";'
    +     'font-family:"Yellowtail",cursive;'
    +     'font-size:13px;'
    +     'color:#FF82D7;'
    +     '-webkit-print-color-adjust:exact !important;'
    +     'print-color-adjust:exact !important;'
    +     'color-adjust:exact !important;'
    +     'text-shadow:0 0 0 #FF82D7;'  // 🆕 v17.2 : hack Chrome force impression couleur
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
    + '}'
    // @page cover : ni header ni paraphes
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
    + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé »</div>'
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
    + '<p>Le présent contrat est conclu en application des articles <strong>L.1242-2, 3°</strong> et <strong>D.1242-1</strong> du Code du travail.</p>'
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
    + '<p>Le/la Salarié(e) est engagé(e) en qualité de <strong>' + safe(c.fonction) + '</strong>, classé(e) <strong>' + safe(c.classification) + '</strong> selon la grille CCN Restauration Rapide (IDCC 1501).</p>'
    + '<p>À ce titre, il/elle assurera notamment :</p>'
    + '<ul><li>L\'accueil de la clientèle, la prise de commande et l\'encaissement le cas échéant ;</li>'
    + '<li>Le service en salle et/ou au comptoir ainsi que le débarrassage ;</li>'
    + '<li>La préparation, l\'assemblage et le service des produits proposés à la carte ;</li>'
    + '<li>La mise en place et la remise en état du poste de travail avant et après service ;</li>'
    + '<li>Toute tâche connexe relevant strictement de sa qualification, dans le respect des règles d\'hygiène (HACCP).</li></ul>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Lieu de travail</span></div>'
    + '<div class="body"><p>Établissement MESHUGA, <strong>3 rue Vavin, 75006 Paris</strong>.</p></div>'

    + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Rémunération et avantages</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">6.1 — Taux horaire.</span> <strong>' + safe(c.taux_horaire_brut) + ' €</strong> (<strong>' + safe(c.taux_horaire_lettres) + '</strong> euros).</p>'
    + '<p class="sub-clause"><span class="clause-label">6.2 — Dimanche.</span> La CCN 1501 ne prévoit pas de majoration spécifique.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.3 — Jours fériés.</span> 1<sup>er</sup> mai majoré 100%.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.4 — ICCP.</span> 10% de la rémunération brute.</p>'
    + '<p class="sub-clause"><span class="clause-label">6.5 — Précarité.</span> Non due (CDD d\'usage L.1243-10, 1°).</p>'
    + '<p class="sub-clause"><span class="clause-label">6.6 — Repas.</span> URSSAF 4,25 € en 2026.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Visite d\'information et de prévention</span></div>'
    + '<div class="body"><p>VIP réalisée par <strong>' + (c.service_sante_travail || MESHUGA_LEGAL.medecine_travail.nom) + '</strong>' + (c.service_sante_travail ? '' : ', ' + MESHUGA_LEGAL.medecine_travail.adresse) + ' dans un délai maximal de 3 mois.</p></div>'

    + '<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Convention collective et protection sociale</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">8.1 — CCN.</span> Restauration Rapide IDCC 1501.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.2 — Retraite.</span> <strong>' + MESHUGA_LEGAL.retraite.nom + '</strong>, ' + MESHUGA_LEGAL.retraite.adresse + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.3 — Prévoyance.</span> <strong>' + (c.prevoyance_organisme || MESHUGA_LEGAL.prevoyance.nom) + '</strong>' + (c.prevoyance_organisme ? (c.prevoyance_adresse ? ', ' + esc(c.prevoyance_adresse) : '') : ', ' + MESHUGA_LEGAL.prevoyance.adresse) + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.4 — Mutuelle.</span> <strong>' + MESHUGA_LEGAL.complementaire_sante.nom + '</strong>, ' + MESHUGA_LEGAL.complementaire_sante.adresse + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.5 — Déclarations.</span> DPAE auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 9.</span><span class="art-title">Tenue de travail</span></div>'
    + '<div class="body"><p>Conformément à la réglementation en vigueur (arrêté du 21/12/2009 et HACCP).</p></div>'

    + '<div class="art"><span class="art-num">Article 10.</span><span class="art-title">Confidentialité et loyauté</span></div>'
    + '<div class="body"><p>Stricte discrétion sur recettes, fournisseurs, prix de revient, données clients et financières.</p></div>'

    + '<div class="art"><span class="art-num">Article 11.</span><span class="art-title">Vidéosurveillance et données personnelles</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">11.1 — Vidéosurveillance.</span></p>'
    + '<ul class="cctv">'
    + '<li><strong>Finalités :</strong> sécurité des biens et personnes, prévention des vols ;</li>'
    + '<li><strong>Base légale :</strong> intérêt légitime (art. 6.1.f RGPD) ;</li>'
    + '<li><strong>Zones :</strong> salle / caisse / réserve, hors locaux de pause et sanitaires ;</li>'
    + '<li><strong>Conservation :</strong> 30 jours maximum ;</li>'
    + '<li><strong>Droits :</strong> accès, rectification, effacement, opposition ;</li>'
    + '<li><strong>Réclamation :</strong> CNIL — www.cnil.fr.</li>'
    + '</ul>'
    + '<p class="sub-clause"><span class="clause-label">11.2 — Données RH.</span> Conservées 5 ans après cessation.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 12.</span><span class="art-title">Cumul d\'emplois</span></div>'
    + '<div class="body"><p>Le/la Salarié(e) déclare être libre de tout engagement.</p></div>'

    + '<div class="art"><span class="art-num">Article 13.</span><span class="art-title">Rupture anticipée</span></div>'
    + '<div class="body"><p>Conformément à l\'article L.1243-1 du Code du travail.</p></div>'

    + '<div class="art"><span class="art-num">Article 14.</span><span class="art-title">Dispositions diverses</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">14.1 — Règlement intérieur.</span> Pris connaissance.</p>'
    + '<p class="sub-clause"><span class="clause-label">14.2 — Changement de situation.</span> À informer la Société.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 15.</span><span class="art-title">Domicile et juridiction compétente</span></div>'
    + '<div class="body"><p>Conseil de Prud\'hommes de Paris.</p></div>'

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

  var mobZone = c.clause_mobilite_zone || "région Île-de-France"

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
    + '<p>Le/la Salarié(e) est engagé(e) en <strong>CDI à temps plein</strong>, à compter du <strong>' + esc(dateEmbauche) + '</strong>.</p>'
    + '<p>Engagement subordonné à la DPAE auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Fonctions et qualification</span></div>'
    + '<div class="body">'
    + '<p><strong>' + esc(fonction) + '</strong>, classé(e) au <strong>' + esc(niveauLabel) + '</strong>, statut <strong>' + esc(statutLabel) + '</strong>.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Missions principales</span></div>'
    + '<div class="body">'
    + '<p>Missions essentielles, substantielles et non limitatives.</p>'
    + (missionsHtml || '<p style="color:#999;font-style:italic">[Missions à compléter]</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 4.</span><span class="art-title">Période d\'essai</span></div>'
    + '<div class="body">'
    + '<p><strong>' + pe + ' (' + esc(numToFrenchWords(pe)) + ') mois</strong>.</p>'
    + (peRenouv
        ? '<p>Renouvelable une fois pour ' + pe + ' mois (total max ' + peTotal + ' mois).</p>'
        : '<p>Non renouvelable.</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Lieu de travail' + (c.clause_mobilite ? ' et clause de mobilité' : '') + '</span></div>'
    + '<div class="body">'
    + '<p><strong>MESHUGA, 3 rue Vavin, 75006 Paris</strong>.</p>'
    + (c.clause_mobilite ? '<p>Mobilité dans la <strong>' + esc(mobZone) + '</strong>.</p>' : '')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Durée du travail et organisation</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">6.1 — Durée hebdomadaire.</span> <strong>' + heuresHebdo + ' heures/semaine</strong> (' + heuresMensuelles.toFixed(2).replace(".",",") + ' h mensuelles).</p>'
    + (heuresSup > 0
        ? '<p class="sub-clause"><span class="clause-label">6.2 — Heures sup structurelles.</span> <strong>' + heuresSup.toFixed(2).replace(".",",") + ' h/mois</strong> majorées 25%.</p>'
        : '')
    + '<p class="sub-clause"><span class="clause-label">6.' + (heuresSup > 0 ? '3' : '2') + ' — Repos.</span> 11h quotidien, 35h hebdomadaire.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Rémunération fixe</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">7.1 — Salaire mensuel brut.</span> <strong>' + formatEuros(salaire) + ' (' + esc(salaireLettres) + ' euros)</strong>, sur 12 mois.</p>'
    + '<p class="sub-clause"><span class="clause-label">7.2 — Repas.</span> URSSAF 4,25 €.</p>'
    + '<p class="sub-clause"><span class="clause-label">7.3 — Dimanche et 1<sup>er</sup> mai.</span> Pas de majoration dominicale. 1<sup>er</sup> mai majoré 100%.</p>'
    + '</div>'

    + (intActive
        ? ('<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Intéressement variable</span></div>'
          + '<div class="body">'
          + '<p class="sub-clause"><span class="clause-label">8.1 — Principe.</span> Calculé sur ' + esc(intAssiette) + '.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.2 — Taux.</span> <strong>' + intTaux.toFixed(2).replace(".",",") + ' %</strong>, conditions cumulatives :</p>'
          + '<ul>'
          + '<li>Développement direct/indirect par le/la Salarié(e) ;</li>'
          + '<li>Validation préalable de l\'Employeur ;</li>'
          + '<li><strong>Facture intégralement encaissée</strong> ;</li>'
          + '<li>Prestation réalisée conformément.</li>'
          + '</ul>'
          + '<p class="sub-clause"><span class="clause-label">8.3 — Versement.</span> Périodicité ' + esc(intPeriodicite) + '.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.4 — Cessation.</span> Dû uniquement sur factures encaissées à la date de rupture.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.5 — Nature.</span> Complément variable, soumis aux cotisations.</p>'
          + '<p class="sub-clause"><span class="clause-label">8.6 — Régularisation.</span> Déduction sur versements ultérieurs si impayé.</p>'
          + '</div>')
        : '')

  var nextArt = intActive ? 9 : 8

  body += ''
    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Congés payés</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">9.1 — Acquisition.</span> 2,5 jours ouvrables/mois, max 30 jours (5 semaines) par période de référence (1er juin N-1 au 31 mai N).</p>'
    + '<p class="sub-clause"><span class="clause-label">9.2 — Période de prise.</span> 1er mai au 31 octobre. Demandes 2 mois avant.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.3 — Planification.</span> Calendrier validé au 30 avril.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.4 — Report.</span> Max 10 jours, jusqu\'au 31 mars suivant.</p>'
    + '<p class="sub-clause"><span class="clause-label">9.5 — Congés non pris.</span> Perdus si non pris (sauf suspension contrat : report 15 mois, loi 2024-364).</p>'
    + '<p class="sub-clause"><span class="clause-label">9.6 — ICCP.</span> En cas de rupture, indemnité compensatrice (L.3141-28).</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Frais professionnels et déplacements</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">10.1 — Frais professionnels.</span> Sur justificatifs sous 30 jours.</p>'
    + '<p class="sub-clause"><span class="clause-label">10.2 — Transport domicile-travail.</span> <strong>50%</strong> des abonnements transports publics.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Absences et maladie</span></div>'
    + '<div class="body">'
    + '<p>Signalement au plus tard le matin du premier jour. Justificatifs médicaux sous 48h.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Visite d\'information et de prévention</span></div>'
    + '<div class="body">'
    + '<p>VIP par <strong>' + (c.service_sante_travail || MESHUGA_LEGAL.medecine_travail.nom) + '</strong>, ' + (c.service_sante_travail ? '' : MESHUGA_LEGAL.medecine_travail.adresse) + ' dans un délai max 3 mois.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Convention collective et protection sociale</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">13.1 — CCN.</span> Restauration Rapide IDCC 1501.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.2 — Retraite.</span> <strong>' + MESHUGA_LEGAL.retraite.nom + '</strong>, ' + MESHUGA_LEGAL.retraite.adresse + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.3 — Prévoyance.</span> <strong>' + (c.prevoyance_organisme || MESHUGA_LEGAL.prevoyance.nom) + '</strong>' + (c.prevoyance_organisme ? (c.prevoyance_adresse ? ', ' + esc(c.prevoyance_adresse) : '') : ', ' + MESHUGA_LEGAL.prevoyance.adresse) + '. Affiliation d\'office.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.4 — Mutuelle.</span> <strong>' + MESHUGA_LEGAL.complementaire_sante.nom + '</strong>, ' + MESHUGA_LEGAL.complementaire_sante.adresse + '. Affiliation d\'office.</p>'
    + '<p class="sub-clause"><span class="clause-label">13.5 — Déclarations.</span> DPAE + DSN auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Confidentialité</span></div>'
    + '<div class="body">'
    + '<p>Plus stricte confidentialité (5 ans après cessation) sur : recettes, fournisseurs, fichiers clients, données financières, stratégie, équipes.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Loyauté et exclusivité</span></div>'
    + '<div class="body">'
    + '<p>Loyauté pendant l\'exécution. Pas de non-concurrence post-contractuelle.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Propriété intellectuelle</span></div>'
    + '<div class="body">'
    + '<p>Toute création réalisée dans le cadre des fonctions est propriété exclusive de l\'Employeur (L.111-1 et L.113-9 CPI).</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Vidéosurveillance et données personnelles</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">17.1 — Vidéosurveillance.</span></p>'
    + '<ul class="cctv">'
    + '<li><strong>Finalités :</strong> sécurité, prévention vols ;</li>'
    + '<li><strong>Base légale :</strong> intérêt légitime (art. 6.1.f RGPD) ;</li>'
    + '<li><strong>Zones :</strong> salle / caisse / réserve ;</li>'
    + '<li><strong>Conservation :</strong> 30 jours ;</li>'
    + '<li><strong>Droits :</strong> accès, rectification, effacement, opposition ;</li>'
    + '<li><strong>Réclamation :</strong> CNIL — www.cnil.fr.</li>'
    + '</ul>'
    + '<p class="sub-clause"><span class="clause-label">17.2 — Données RH.</span> Conservées 5 ans après cessation.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Discipline et règlement intérieur</span></div>'
    + '<div class="body">'
    + '<p>Hygiène HACCP, sécurité, tenue professionnelle. Sanctions L.1331-1 et suivants.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Rupture du contrat</span></div>'
    + '<div class="body">'
    + '<p>Préavis selon CCN 1501.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Domicile et juridiction compétente</span></div>'
    + '<div class="body">'
    + '<p>Conseil de Prud\'hommes de Paris.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article ' + (nextArt++) + '.</span><span class="art-title">Dispositions finales</span></div>'
    + '<div class="body">'
    + '<p>Le présent contrat annule et remplace tout accord antérieur. Toute modification fera l\'objet d\'un avenant écrit.</p>'
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
    + '<p>Le/la Salarié(e) est engagé(e) en <strong>CDI à temps plein</strong>, à compter du <strong>' + esc(dateEmbauche) + '</strong>.</p>'
    + '<p>Subordonné à la DPAE auprès de l\'URSSAF d\'Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Fonctions et qualification</span></div>'
    + '<div class="body">'
    + '<p><strong>' + esc(fonction) + '</strong>, classé(e) au <strong>' + esc(niveauLabel) + '</strong>, statut <strong>non-cadre</strong>.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Missions principales</span></div>'
    + '<div class="body">'
    + (missionsHtml || '<p style="color:#999;font-style:italic">[Missions à compléter]</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 4.</span><span class="art-title">Période d\'essai</span></div>'
    + '<div class="body">'
    + '<p><strong>' + pe + ' (' + esc(numToFrenchWords(pe)) + ') mois</strong>.</p>'
    + (peRenouv ? '<p>Renouvelable une fois.</p>' : '<p>Non renouvelable.</p>')
    + '</div>'

    + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Lieu de travail</span></div>'
    + '<div class="body"><p><strong>MESHUGA, 3 rue Vavin, 75006 Paris</strong>.</p></div>'

    + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Durée du travail</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">6.1 — Durée hebdomadaire.</span> <strong>' + heuresHebdo + ' h/semaine</strong>.</p>'
    + (heuresSup > 0 ? '<p class="sub-clause"><span class="clause-label">6.2 — Heures sup.</span> <strong>' + heuresSup.toFixed(2).replace(".",",") + ' h/mois</strong> majorées 25%.</p>' : '')
    + '<p class="sub-clause"><span class="clause-label">6.' + (heuresSup > 0 ? '3' : '2') + ' — Repos.</span> 11h quotidien / 35h hebdo.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Rémunération</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">7.1 — Salaire mensuel brut.</span> <strong>' + formatEuros(salaire) + ' (' + esc(salaireLettres) + ' euros)</strong>, sur 12 mois.</p>'
    + '<p class="sub-clause"><span class="clause-label">7.2 — Repas.</span> URSSAF 4,25 €.</p>'
    + '<p class="sub-clause"><span class="clause-label">7.3 — Dimanche et 1<sup>er</sup> mai.</span> Pas de majoration dominicale. 1<sup>er</sup> mai 100%.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Congés payés</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">8.1 — Acquisition.</span> 2,5 jours/mois, max 30 jours.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.2 — Prise.</span> 1er mai au 31 octobre. Demandes 2 mois avant.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.3 — Planification.</span> Calendrier au 30 avril.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.4 — Report.</span> Max 10 jours, jusqu\'au 31 mars.</p>'
    + '<p class="sub-clause"><span class="clause-label">8.5 — Non pris.</span> Perdus (sauf suspension contrat : 15 mois).</p>'
    + '<p class="sub-clause"><span class="clause-label">8.6 — ICCP.</span> En cas de rupture.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 9.</span><span class="art-title">Frais de transport</span></div>'
    + '<div class="body"><p><strong>50%</strong> des abonnements transports publics.</p></div>'

    + '<div class="art"><span class="art-num">Article 10.</span><span class="art-title">Absences et maladie</span></div>'
    + '<div class="body"><p>Signalement le matin. Justificatifs sous 48h.</p></div>'

    + '<div class="art"><span class="art-num">Article 11.</span><span class="art-title">VIP</span></div>'
    + '<div class="body"><p><strong>' + (c.service_sante_travail || MESHUGA_LEGAL.medecine_travail.nom) + '</strong>' + (c.service_sante_travail ? '' : ', ' + MESHUGA_LEGAL.medecine_travail.adresse) + ' sous 3 mois.</p></div>'

    + '<div class="art"><span class="art-num">Article 12.</span><span class="art-title">CCN et protection sociale</span></div>'
    + '<div class="body">'
    + '<p class="sub-clause"><span class="clause-label">12.1 — CCN.</span> Restauration Rapide IDCC 1501.</p>'
    + '<p class="sub-clause"><span class="clause-label">12.2 — Retraite.</span> ' + MESHUGA_LEGAL.retraite.nom + '.</p>'
    + '<p class="sub-clause"><span class="clause-label">12.3 — Prévoyance.</span> <strong>' + (c.prevoyance_organisme || MESHUGA_LEGAL.prevoyance.nom) + '</strong>.</p>'
    + '<p class="sub-clause"><span class="clause-label">12.4 — Mutuelle.</span> <strong>' + MESHUGA_LEGAL.complementaire_sante.nom + '</strong>.</p>'
    + '<p class="sub-clause"><span class="clause-label">12.5 — DPAE/DSN.</span> URSSAF Île-de-France.</p>'
    + '</div>'

    + '<div class="art"><span class="art-num">Article 13.</span><span class="art-title">Tenue et HACCP</span></div>'
    + '<div class="body"><p>Arrêté du 21/12/2009 et HACCP. Tenue fournie par l\'Employeur.</p></div>'

    + '<div class="art"><span class="art-num">Article 14.</span><span class="art-title">Confidentialité et loyauté</span></div>'
    + '<div class="body"><p>Confidentialité 3 ans après cessation. Pas de non-concurrence d\'un précédent employeur.</p></div>'

    + '<div class="art"><span class="art-num">Article 15.</span><span class="art-title">Vidéosurveillance</span></div>'
    + '<div class="body"><p>Intérêt légitime (art. 6.1.f RGPD). Conservation 30 jours. Zones salle/caisse/réserve.</p></div>'

    + '<div class="art"><span class="art-num">Article 16.</span><span class="art-title">Discipline</span></div>'
    + '<div class="body"><p>Sanctions L.1331-1 et suivants.</p></div>'

    + '<div class="art"><span class="art-num">Article 17.</span><span class="art-title">Rupture du contrat</span></div>'
    + '<div class="body"><p>Préavis selon CCN 1501.</p></div>'

    + '<div class="art"><span class="art-num">Article 18.</span><span class="art-title">Domicile et juridiction</span></div>'
    + '<div class="body"><p>Conseil de Prud\'hommes de Paris.</p></div>'

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
