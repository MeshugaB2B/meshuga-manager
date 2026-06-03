// ============================================================
// src/app/dashboard/rh/hygieneGuideBuilder.tsx  (V2)
// ============================================================
// Génère le HTML complet du "Guide des bonnes pratiques d'hygiène Meshuga".
//
// V2 — refonte design + contenu :
//   - Style "soft pop" Meshuga (coins arrondis, ombres douces, dégradés roses)
//     au lieu du néo-brutalisme dur. Beaucoup plus aéré.
//   - Logo HD blanc sur la couverture (URL absolue Vercel) — plus de stamp.
//   - Police de corps réellement condensée ('Arial Narrow' embarquée via arial-narrow.ts).
//   - Illustrations : lavage des mains en 6 étapes, schéma marche en avant,
//     machine à sundae, pictos colorés.
//   - Contenu enrichi (tenue, santé, interdits, réception, stockage,
//     allergènes + tableau, fiches réflexe, spécificités).
//   - Page de reconnaissance GENRÉE + pré-remplissable (Étape B).
//
// @page : cover (rose pleine page) / default (paraphes @bottom-right) /
//         signature (sans paraphes).
//   -> paraphes "E.T.   /   en attente" : compatible fixParaphePlaceholder().
//
// SWC-safe : var partout, function(){}, pas de generics, pas de JSX.
//   chaînes JS en GUILLEMETS DOUBLES, attributs HTML/SVG en quotes SIMPLES.
// ============================================================

import { ALL_MESHUGA_FONTFACES, ARIAL_NARROW_FONTFACE } from "@/lib/fonts"

export function buildHygieneGuide(emp, options) {
  var e = emp || {}
  var o = options || {}

  var LOGO_WHITE = "https://meshuga-manager.vercel.app/MESHUGA_Logotype_white.png"

  // ---------- helpers texte ----------
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }
  var todayFr = function () {
    var d = new Date()
    var m = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
    return d.getDate() + " " + m[d.getMonth()] + " " + d.getFullYear()
  }
  var getInitials = function (name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean)
    var ini = ""
    for (var i = 0; i < parts.length; i++) ini += parts[i].charAt(0).toUpperCase() + "."
    return ini
  }

  var version = o.version || "v5"
  var dateStr = o.date || todayFr()

  // genre : "F" / "M" (depuis emp.genre OU civilité). Sinon neutre.
  var civ = String(e.civilite || "").toLowerCase()
  var genre = String(e.genre || e.sexe || "").toUpperCase()
  if (!genre) {
    if (civ.indexOf("madame") === 0 || civ === "mme") genre = "F"
    else if (civ.indexOf("monsieur") === 0 || civ === "m." || civ === "mr") genre = "M"
  }
  var g = function (masc, fem, neutre) {
    if (genre === "F") return fem
    if (genre === "M") return masc
    return neutre == null ? masc + "(e)" : neutre
  }

  var nomComplet = ((e.prenom || "") + " " + (e.nom || "")).trim()
  var civiliteAff = e.civilite ? String(e.civilite).trim() : (genre === "F" ? "Madame" : (genre === "M" ? "Monsieur" : ""))
  var nomLigne = nomComplet
    ? ((civiliteAff ? civiliteAff + " " : "") + (e.prenom || "") + " " + String(e.nom || "").toUpperCase()).trim()
    : "[Civilité Prénom NOM]"

  var employeeInitials = nomComplet ? getInitials(nomComplet) : ""
  var paraphText = "E.T.   /   " + (employeeInitials || "en attente")

  // =====================================================================
  // PICTOS / ILLUSTRATIONS (style pop : aplats rose/jaune, contours souples)
  // =====================================================================
  var SVG = "xmlns='http://www.w3.org/2000/svg'"

  var icThermo =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#FFF7C2'/>" +
    "<rect x='27' y='12' width='10' height='28' rx='5' fill='#fff' stroke='#191923' stroke-width='2.4'/>" +
    "<circle cx='32' cy='46' r='9' fill='#FF82D7' stroke='#191923' stroke-width='2.4'/>" +
    "<rect x='29.6' y='26' width='4.8' height='22' rx='2.4' fill='#FF82D7'/>" +
    "<g stroke='#191923' stroke-width='2.2' stroke-linecap='round'><line x1='39' y1='18' x2='44' y2='18'/><line x1='39' y1='25' x2='44' y2='25'/><line x1='39' y1='32' x2='44' y2='32'/></g>" +
    "</svg>"
  var icSnow =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#E7F6FF'/>" +
    "<g stroke='#191923' stroke-width='2.6' stroke-linecap='round'><line x1='32' y1='12' x2='32' y2='52'/><line x1='14.7' y1='22' x2='49.3' y2='42'/><line x1='14.7' y1='42' x2='49.3' y2='22'/></g>" +
    "<g stroke='#FF82D7' stroke-width='2.6' stroke-linecap='round'><line x1='32' y1='17' x2='27' y2='22'/><line x1='32' y1='17' x2='37' y2='22'/><line x1='32' y1='47' x2='27' y2='42'/><line x1='32' y1='47' x2='37' y2='42'/></g>" +
    "</svg>"
  var icFlame =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#FFE3F5'/>" +
    "<path d='M32 12 C40 24 45 28 45 38 a13 13 0 0 1 -26 0 C19 30 24 25 32 12 Z' fill='#FFEB5A' stroke='#191923' stroke-width='2.4' stroke-linejoin='round'/>" +
    "<path d='M32 28 C36 33 37.5 35 37.5 39 a5.5 5.5 0 0 1 -11 0 C26.5 35 28 33 32 28 Z' fill='#FF82D7'/>" +
    "</svg>"
  var icArrow =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#FFF7C2'/>" +
    "<path d='M16 28 H36 V21 L50 32 L36 43 V36 H16 Z' fill='#FF82D7' stroke='#191923' stroke-width='2.4' stroke-linejoin='round'/>" +
    "</svg>"
  var icAllerg =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#FFE3F5'/>" +
    "<path d='M32 14 L52 48 H12 Z' fill='#FFEB5A' stroke='#191923' stroke-width='2.4' stroke-linejoin='round'/>" +
    "<rect x='29.6' y='26' width='4.8' height='13' rx='2.4' fill='#191923'/><circle cx='32' cy='44' r='2.8' fill='#191923'/>" +
    "</svg>"
  var icSpray =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#FFF7C2'/>" +
    "<rect x='24' y='28' width='16' height='22' rx='4' fill='#FF82D7' stroke='#191923' stroke-width='2.4'/>" +
    "<rect x='27' y='18' width='9' height='10' rx='2' fill='#fff' stroke='#191923' stroke-width='2.4'/>" +
    "<path d='M36 20 H45 V25 H40' fill='none' stroke='#191923' stroke-width='2.4' stroke-linejoin='round'/>" +
    "<g fill='#191923'><circle cx='48' cy='18' r='1.7'/><circle cx='51' cy='22' r='1.7'/><circle cx='47' cy='25' r='1.7'/></g>" +
    "</svg>"
  var icBin =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#E9FBF0'/>" +
    "<rect x='20' y='24' width='24' height='26' rx='4' fill='#FF82D7' stroke='#191923' stroke-width='2.4'/>" +
    "<rect x='16' y='18' width='32' height='6' rx='3' fill='#FFEB5A' stroke='#191923' stroke-width='2.4'/>" +
    "<rect x='27' y='13' width='10' height='5' rx='2' fill='#FFEB5A' stroke='#191923' stroke-width='2.4'/>" +
    "<g stroke='#191923' stroke-width='2.4' stroke-linecap='round'><line x1='27' y1='30' x2='27' y2='44'/><line x1='32' y1='30' x2='32' y2='44'/><line x1='37' y1='30' x2='37' y2='44'/></g>" +
    "</svg>"
  var icMouse =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#FFE3F5'/>" +
    "<ellipse cx='30' cy='36' rx='13' ry='8.5' fill='#fff' stroke='#191923' stroke-width='2.2'/>" +
    "<circle cx='20' cy='28' r='5' fill='#fff' stroke='#191923' stroke-width='2.2'/>" +
    "<path d='M43 38 q8 1 8 -8' fill='none' stroke='#191923' stroke-width='2.2'/>" +
    "<circle cx='18' cy='33' r='1.4' fill='#191923'/>" +
    "<line x1='14' y1='14' x2='50' y2='50' stroke='#FF3B7A' stroke-width='4.5' stroke-linecap='round'/>" +
    "</svg>"
  var icGloves =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#E7F6FF'/>" +
    "<path d='M24 50 V30 c0-2 0-3 1-4 l0-6 a2.4 2.4 0 0 1 4.8 0 v5 l1-7 a2.4 2.4 0 0 1 4.8 0 v8 l1-6 a2.4 2.4 0 0 1 4.8 0 v18 a8 8 0 0 1 -8 8 h-6 a3.4 3.4 0 0 1 -3.4-3.4 Z' fill='#FF82D7' stroke='#191923' stroke-width='2.2' stroke-linejoin='round'/>" +
    "</svg>"
  var icDoc =
    "<svg viewBox='0 0 64 64' width='100%' height='100%' " + SVG + ">" +
    "<circle cx='32' cy='32' r='30' fill='#FFF7C2'/>" +
    "<rect x='22' y='16' width='20' height='28' rx='3' fill='#fff' stroke='#191923' stroke-width='2.4'/>" +
    "<g stroke='#FF82D7' stroke-width='2.6' stroke-linecap='round'><line x1='26' y1='23' x2='38' y2='23'/><line x1='26' y1='29' x2='38' y2='29'/><line x1='26' y1='35' x2='34' y2='35'/></g>" +
    "<circle cx='40' cy='44' r='9' fill='#FFEB5A' stroke='#191923' stroke-width='2.2'/>" +
    "<path d='M36 44 l3 3 l5 -6' fill='none' stroke='#191923' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/>" +
    "</svg>"

  // --- gestes de lavage des mains (mains stylisées, 6 étapes) ---
  // Main "paume ouverte" en coords locales (centre ~ 12,22) : 4 doigts + paume + pouce.
  var HAND_INNER =
    "<rect x='6.5' y='4' width='3.6' height='19' rx='1.8'/>" +
    "<rect x='11.2' y='2' width='3.6' height='21' rx='1.8'/>" +
    "<rect x='15.9' y='2' width='3.6' height='21' rx='1.8'/>" +
    "<rect x='20.6' y='4.5' width='3.6' height='18.5' rx='1.8'/>" +
    "<path d='M4.5 20 h22 v9 a11 11 0 0 1 -11 11 a11 11 0 0 1 -11 -11 Z'/>" +
    "<rect x='-1.5' y='22' width='3.8' height='13' rx='1.9' transform='rotate(40 0.4 28.5)'/>"
  var hand = function (tf) {
    return "<g transform='" + tf + "' fill='#FFD9EC' stroke='#191923' stroke-width='2.2' stroke-linejoin='round' stroke-linecap='round'>" + HAND_INNER + "</g>"
  }
  var hwGlyph = function (n) {
    var s = "<svg viewBox='0 0 72 72' width='100%' height='100%' " + SVG + ">"
    // une main claire, identique partout (lisible), centrée
    s += hand("translate(18,11) scale(1.25)")
    var P = "fill='none' stroke='#D14F9E' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'"
    if (n === 1) {
      // savon qui mousse
      s += "<g fill='#fff' stroke='#FF82D7' stroke-width='1.8'><circle cx='17' cy='22' r='5.5'/><circle cx='12' cy='30' r='4'/><circle cx='20' cy='33' r='3.2'/></g>"
    } else if (n === 2) {
      // frottement paume contre paume : double flèche
      s += "<g " + P + "><path d='M24 50 h22'/><path d='M24 50 l5 -4 M24 50 l5 4'/><path d='M46 50 l-5 -4 M46 50 l-5 4'/></g>"
    } else if (n === 3) {
      // dos de la main : flèche qui balaie
      s += "<g " + P + "><path d='M22 38 q13 -9 26 0'/><path d='M48 38 l-1 -6 M48 38 l-6 0'/></g>"
    } else if (n === 4) {
      // entre les doigts : traits roses entre les doigts
      s += "<g stroke='#D14F9E' stroke-width='3' stroke-linecap='round'><line x1='31' y1='18' x2='31' y2='27'/><line x1='37.5' y1='16' x2='37.5' y2='27'/><line x1='44' y1='18' x2='44' y2='27'/></g>"
    } else if (n === 5) {
      // pouce mis en évidence
      s += "<circle cx='20' cy='47' r='8.5' " + P + "/>"
    } else {
      // ongles : petits arcs aux bouts des doigts
      s += "<g " + P + " stroke-width='2.4'><path d='M28 17 a3 3 0 0 1 6 0'/><path d='M35 15 a3 3 0 0 1 6 0'/><path d='M42 17 a3 3 0 0 1 6 0'/></g>"
    }
    s += "</svg>"
    return s
  }

  // illustration machine à sundae (machine + cup swirl)
  var illSundae =
    "<svg viewBox='0 0 240 120' width='100%' height='100%' " + SVG + " preserveAspectRatio='xMidYMid meet'>" +
    "<rect x='6' y='6' width='108' height='108' rx='14' fill='#fff' stroke='#191923' stroke-width='2.4'/>" +
    "<rect x='30' y='16' width='60' height='44' rx='8' fill='#FFF7C2' stroke='#191923' stroke-width='2.4'/>" +
    "<rect x='52' y='60' width='16' height='14' fill='#191923'/>" +
    "<path d='M60 74 c-10 0 -16 8 -16 18 h32 c0 -10 -6 -18 -16 -18 Z' fill='#FF82D7' stroke='#191923' stroke-width='2.4'/>" +
    "<g stroke='#FF82D7' stroke-width='3' stroke-linecap='round'><line x1='40' y1='30' x2='80' y2='30'/><line x1='40' y1='40' x2='80' y2='40'/></g>" +
    "<path d='M150 60 h44 l-7 50 a6 6 0 0 1 -6 5 h-18 a6 6 0 0 1 -6 -5 Z' fill='#FFF7C2' stroke='#191923' stroke-width='2.4'/>" +
    "<path d='M150 60 c2 -16 14 -18 22 -18 s20 2 22 18 Z' fill='#fff' stroke='#191923' stroke-width='2.4'/>" +
    "<path d='M158 56 c0 -10 8 -14 14 -14 s14 4 14 14' fill='none' stroke='#FF82D7' stroke-width='4' stroke-linecap='round'/>" +
    "<circle cx='172' cy='34' r='5' fill='#FF82D7' stroke='#191923' stroke-width='2'/>" +
    "</svg>"

  // --- schéma marche en avant (flux à flèches couleur) ---
  var maStep = function (label, sub, tone) {
    var bg = tone === "sale" ? "#FFE3F5" : (tone === "propre" ? "#FFF7C2" : "#F1F1F4")
    return "<div class='ma-step' style='background:" + bg + "'>" +
      "<div class='ma-lab'>" + label + "</div>" +
      (sub ? "<div class='ma-sub'>" + sub + "</div>" : "") +
      "</div>"
  }
  var maArrow =
    "<div class='ma-arrow'><svg viewBox='0 0 40 24' width='40' height='24' " + SVG + ">" +
    "<path d='M2 12 H26 V5 L38 12 L26 19 V12 Z' fill='#FF82D7' stroke='#191923' stroke-width='2' stroke-linejoin='round'/>" +
    "</svg></div>"
  var illMarche =
    "<div class='ma-flow'>" +
    maStep("1 · Réception", "contrôle T°, DLC", "neutre") + maArrow +
    maStep("2 · Stockage", "chambre froide", "neutre") + maArrow +
    maStep("3 · Déballage / parage", "zone &laquo; sale &raquo;", "sale") + maArrow +
    maStep("4 · Préparation", "découpe, montage", "sale") + maArrow +
    maStep("5 · Cuisson", "+63 °C mini", "propre") + maArrow +
    maStep("6 · Dressage / envoi", "zone &laquo; propre &raquo;", "propre") +
    "</div>"

  // ---------- briques de mise en page ----------
  var chip = function (svg) { return "<span class='chip'>" + svg + "</span>" }
  var chead = function (num, title, pictoSvg) {
    return "<div class='chead'>" +
      "<span class='chnum'>" + num + "</span>" +
      "<h2 class='yt'>" + title + "</h2>" +
      (pictoSvg ? chip(pictoSvg) : "") +
      "</div>"
  }
  var hero = function (text) {
    return "<div class='hero'><span class='hero-spark'>★</span><div>" + text + "</div></div>"
  }
  var note = function (text) {
    return "<div class='note'>" + text + "</div>"
  }
  var li = function (arr) {
    var out = "<ul class='tidy'>"
    for (var i = 0; i < arr.length; i++) out += "<li>" + arr[i] + "</li>"
    return out + "</ul>"
  }

  // =====================================================================
  // STYLES
  // =====================================================================
  var styles =
    ALL_MESHUGA_FONTFACES + ARIAL_NARROW_FONTFACE +
    ":root{--p:#FF82D7;--pd:#D14F9E;--ps:#FFE3F5;--y:#FFEB5A;--ys:#FFF7C2;--ink:#191923;--muted:#6B6B76}" +
    "@supports (color: color(display-p3 1 1 1)){:root{--p:color(display-p3 1 .515 .855);--y:color(display-p3 1 .925 .38)}}" +
    "*{box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}" +
    "@page cover{size:A4;margin:0}" +
    "@page{size:A4;margin:18mm 16mm 20mm 16mm;" +
      "@bottom-left{content:'Guide d’hygiène Meshuga';font-family:'Arial Narrow',sans-serif;font-size:8pt;color:#B9B9C2;letter-spacing:.5px}" +
      "@bottom-center{content:counter(page) ' / ' counter(pages);font-family:'Arial Narrow',sans-serif;font-size:8pt;color:#B9B9C2}" +
      "@bottom-right{content:\"" + paraphText + "\";font-family:'Yellowtail',cursive;font-size:13pt;color:#FF82D7}}" +
    "@page signature{size:A4;margin:18mm 16mm 18mm 16mm;" +
      "@bottom-left{content:'Guide d’hygiène Meshuga';font-family:'Arial Narrow',sans-serif;font-size:8pt;color:#B9B9C2;letter-spacing:.5px}" +
      "@bottom-center{content:counter(page) ' / ' counter(pages);font-family:'Arial Narrow',sans-serif;font-size:8pt;color:#B9B9C2}" +
      "@bottom-right{content:none}}" +
    "html,body{margin:0;padding:0;background:#fff}" +
    "body{font-family:'Arial Narrow',Arial,sans-serif;color:var(--ink);font-size:11pt;line-height:1.62}" +
    "p{margin:0 0 3mm;orphans:2;widows:2}" +
    "strong{font-weight:700}em{font-style:italic}" +
    ".cover{page:cover;width:210mm;height:297mm;background:#FF82D7;position:relative;overflow:hidden;page-break-after:always;break-after:page}" +
    ".cover .blob{position:absolute;border-radius:50%}" +
    ".cover .b1{width:200mm;height:200mm;background:#FF9FE0;opacity:.55;top:-70mm;right:-60mm}" +
    ".cover .b2{width:120mm;height:120mm;background:#FFB9E9;opacity:.4;bottom:-40mm;left:-40mm}" +
    ".cover .inner{position:absolute;inset:0;padding:24mm 22mm;display:flex;flex-direction:column;justify-content:space-between}" +
    ".cover .logo{width:96mm;height:auto;display:block}" +
    ".cover .title{font-family:'Yellowtail',cursive;color:#fff;font-weight:400;font-size:62pt;line-height:1.04;margin:0;text-shadow:0 3px 0 rgba(0,0,0,.06)}" +
    ".cover .kicker{display:inline-block;background:#fff;color:#D14F9E;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:2px;font-size:12pt;padding:3mm 6mm;border-radius:999px;margin-top:8mm}" +
    ".cover .legal{color:#fff;font-size:10.5pt;line-height:1.7}" +
    ".cover .legal .ed{font-family:'BILD Condensed','Arial Narrow',sans-serif;letter-spacing:1.5px;text-transform:uppercase;font-size:10pt;opacity:.95;margin-bottom:2mm}" +
    ".cover .legal b{font-size:12pt}" +
    ".wrap{padding-top:2mm}" +
    ".chapter{margin-top:15mm}.chapter:first-of-type{margin-top:2mm}" +
    ".copen{break-inside:avoid;page-break-inside:avoid}" +
    ".keep{break-inside:avoid;page-break-inside:avoid}" +
    ".chead{display:flex;align-items:center;gap:5mm;margin-bottom:5mm;break-after:avoid;page-break-after:avoid}" +
    ".chnum{width:13mm;height:13mm;border-radius:14px;background:linear-gradient(150deg,#FF82D7,#FF9FE0);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:900;font-size:18pt;flex-shrink:0;box-shadow:0 6px 14px rgba(255,130,215,.45)}" +
    "h2.yt{font-family:'Yellowtail',cursive;color:var(--p);font-weight:400;font-size:33pt;line-height:1;margin:0;flex:1}" +
    ".chip{width:18mm;height:18mm;border-radius:50%;overflow:hidden;flex-shrink:0;box-shadow:0 6px 16px rgba(25,25,35,.12)}" +
    ".chip svg{display:block}" +
    "h3.bc{font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:var(--p);font-size:13pt;margin:7mm 0 2.5mm;display:flex;align-items:center;gap:2.5mm;break-after:avoid;page-break-after:avoid}" +
    "h3.bc::before{content:'';width:4mm;height:4mm;border-radius:50%;background:var(--y);border:2px solid var(--p);flex-shrink:0}" +
    "ul.tidy{list-style:none;padding:0;margin:3mm 0}" +
    "ul.tidy li{position:relative;padding:1.6mm 0 1.6mm 8mm;break-inside:avoid}" +
    "ul.tidy li::before{content:'';position:absolute;left:1mm;top:3.4mm;width:3.6mm;height:3.6mm;border-radius:50%;background:var(--p)}" +
    ".card{background:#fff;border:1px solid #F2D8EC;border-radius:18px;box-shadow:0 8px 22px rgba(255,130,215,.12);padding:5mm 6mm;margin:4mm 0;break-inside:avoid}" +
    ".card.soft{background:linear-gradient(180deg,#FFFDFB,#FFF6FC)}" +
    ".hero{background:linear-gradient(135deg,#FF82D7,#FF6FC2);color:#fff;border-radius:20px;padding:5mm 7mm;margin:5mm 0;display:flex;gap:4mm;align-items:flex-start;box-shadow:0 12px 26px rgba(255,130,215,.35);break-inside:avoid;font-size:11.5pt;line-height:1.55}" +
    ".hero-spark{font-size:16pt;line-height:1.2;flex-shrink:0}" +
    ".hero b{font-weight:700}" +
    ".note{background:var(--ys);border-radius:16px;padding:4mm 5mm;margin:4mm 0;border:1px solid #F2E59A;break-inside:avoid}" +
    ".note b{color:var(--pd)}" +
    ".reg{display:grid;grid-template-columns:1fr;gap:3mm;margin:3mm 0}" +
    ".reg .row{display:flex;gap:4mm;align-items:flex-start;background:#fff;border:1px solid #F2D8EC;border-radius:14px;padding:3.5mm 4.5mm;break-inside:avoid}" +
    ".reg .tag{flex-shrink:0;background:var(--p);color:#fff;font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.5px;font-size:8.5pt;padding:1.5mm 3mm;border-radius:999px;white-space:nowrap;margin-top:.5mm}" +
    ".reg .row p{margin:0}" +
    ".tbl{border-radius:16px;overflow:hidden;border:1px solid #F2D8EC;margin:4mm 0;box-shadow:0 8px 20px rgba(255,130,215,.10)}" +
    "table{width:100%;border-collapse:collapse;font-size:10.5pt}" +
    "thead{display:table-header-group}tr{break-inside:avoid}" +
    "th{background:linear-gradient(135deg,#FF82D7,#FF9FE0);color:#fff;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.5px;font-size:9.5pt;text-align:left;padding:3mm 4mm}" +
    "td{padding:2.6mm 4mm;border-top:1px solid #F4E2EF;vertical-align:top}" +
    "tbody tr:nth-child(odd){background:#FFF9FD}" +
    ".val{font-weight:700;color:var(--pd);white-space:nowrap}" +
    ".fc{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:4mm 0}" +
    ".fc .cell{display:flex;gap:4mm;align-items:center;background:#fff;border:1px solid #F2D8EC;border-radius:16px;padding:4mm 5mm;box-shadow:0 8px 20px rgba(25,25,35,.06);break-inside:avoid}" +
    ".fc .ic{width:16mm;height:16mm;flex-shrink:0}" +
    ".fc .lab{font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.5px;font-size:9pt;color:var(--muted)}" +
    ".fc .big{font-family:'BILD Condensed','Arial Narrow',sans-serif;font-size:19pt;font-weight:900;color:var(--pd);line-height:1.1}" +
    ".fc .sub{font-size:9.5pt;color:var(--muted)}" +
    ".hw-hero{display:flex;align-items:center;gap:5mm;background:linear-gradient(135deg,#FFE3F5,#FFF7C2);border-radius:20px;padding:5mm 6mm;margin:4mm 0;break-inside:avoid}" +
    ".hw-hero .pill{background:#fff;color:var(--pd);border-radius:999px;padding:2mm 5mm;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:1px;font-size:11pt;font-weight:800;white-space:nowrap}" +
    ".hw-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:4mm 0;break-inside:avoid}" +
    ".hw-card{background:#fff;border:1px solid #F2D8EC;border-radius:16px;padding:4mm;text-align:center;box-shadow:0 6px 16px rgba(255,130,215,.12)}" +
    ".hw-disc{position:relative;width:30mm;height:30mm;margin:0 auto 2.5mm;border-radius:50%;background:radial-gradient(circle at 38% 32%,#FFF7C2,#FFE3F5)}" +
    ".hw-disc svg{position:absolute;inset:0}" +
    ".hw-num{position:absolute;top:-2mm;left:-2mm;width:8mm;height:8mm;border-radius:50%;background:var(--p);color:#fff;font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:900;font-size:11pt;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(255,130,215,.5)}" +
    ".hw-card .t{font-size:9.6pt;line-height:1.35}" +
    ".hw-card .dur{display:inline-block;margin-top:2mm;background:var(--ys);color:var(--pd);border-radius:999px;padding:.6mm 3mm;font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:800;letter-spacing:.5px;font-size:8.5pt}" +
    ".ma-flow{display:flex;flex-wrap:wrap;align-items:stretch;gap:2mm;margin:4mm 0;break-inside:avoid}" +
    ".ma-step{flex:1 1 28%;min-width:40mm;border-radius:14px;border:1px solid #EBD9E6;padding:3.5mm 4mm}" +
    ".ma-lab{font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.5px;font-size:9.5pt;color:var(--ink)}" +
    ".ma-sub{font-size:9pt;color:var(--muted);margin-top:.6mm}" +
    ".ma-arrow{display:flex;align-items:center;justify-content:center;flex:0 0 auto}" +
    ".rx{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:4mm 0}" +
    ".rx .it{background:#fff;border:1px solid #F2D8EC;border-left:5px solid var(--p);border-radius:14px;padding:4mm 5mm;break-inside:avoid;box-shadow:0 6px 16px rgba(255,130,215,.10)}" +
    ".rx .it .h{font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--p);font-size:10pt;margin-bottom:1.5mm;display:flex;align-items:center;gap:2mm}" +
    ".rx .it p{margin:0;font-size:10pt;line-height:1.45}" +
    ".rx .dot{width:7mm;height:7mm;flex-shrink:0}" +
    ".alg{display:grid;grid-template-columns:repeat(3,1fr);gap:1.8mm 3mm;margin:2.5mm 0}" +
    ".alg .a{display:flex;gap:2.5mm;align-items:center;background:#fff;border:1px solid #F2D8EC;border-radius:12px;padding:2mm 3mm;break-inside:avoid}" +
    ".alg .n{flex-shrink:0;width:6mm;height:6mm;border-radius:50%;background:var(--y);border:1.5px solid var(--p);color:var(--ink);font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:800;font-size:9pt;line-height:1;display:flex;align-items:center;justify-content:center;text-align:center}" +
    ".alg .a b{font-size:10pt}.alg .a span{display:block;font-size:8.8pt;color:var(--muted)}" +
    ".sundae{display:flex;gap:4mm;align-items:center;background:linear-gradient(180deg,#FFFDFB,#FFF6FC);border:1px solid #F2D8EC;border-radius:18px;padding:4mm;margin:3mm 0;break-inside:avoid}" +
    ".sundae .ill{width:40mm;flex-shrink:0}" +
    ".pbreak{page-break-before:always;break-before:page}" +
    ".reco{page:signature;page-break-before:always;break-before:page;break-inside:avoid;page-break-inside:avoid}" +
    ".sig{border-radius:20px;overflow:hidden;border:1px solid #F2D8EC;box-shadow:0 10px 26px rgba(255,130,215,.18);margin-top:5mm;break-inside:avoid}" +
    ".sig .head{background:linear-gradient(135deg,#FF82D7,#FF6FC2);color:#fff;padding:4mm 6mm;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:1.5px;font-weight:900;font-size:13pt;text-align:center}" +
    ".sig .id{background:var(--ys);padding:3.5mm 6mm;text-align:center;font-size:12pt}" +
    ".sig .body{padding:6mm;background:#fff}" +
    ".sig .lines{display:flex;gap:10mm;margin-top:14mm}" +
    ".sig .sline{flex:1;border-top:2px solid var(--ink);padding-top:2mm;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.6px;font-size:9pt;color:var(--muted)}" +
    ".faitline{margin-top:6mm;font-size:11pt}" +
    "@media screen{body{background:#ededed}.cover{margin:0 auto}.wrap{max-width:210mm;margin:6mm auto;background:#fff;padding:16mm 16mm;box-shadow:0 4px 22px rgba(0,0,0,.08)}}" +
    "@media print{.wrap{padding:0;max-width:none;margin:0}}"

  // =====================================================================
  // COUVERTURE
  // =====================================================================
  var cover =
    "<div class='cover'>" +
      "<div class='blob b1'></div><div class='blob b2'></div>" +
      "<div class='inner'>" +
        "<img class='logo' src='" + LOGO_WHITE + "' alt='Meshuga'/>" +
        "<div>" +
          "<div class='title'>Guide des<br/>bonnes pratiques<br/>d’hygiène</div>" +
          "<span class='kicker'>Manuel &amp; formation du personnel</span>" +
        "</div>" +
        "<div class='legal'>" +
          "<div class='ed'>Édition " + esc(version) + " · " + esc(dateStr) + "</div>" +
          "<b>SAS AEGIA FOOD — Meshuga</b><br/>" +
          "3 rue Vavin — 75006 Paris<br/>" +
          "RCS Paris 904 639 531 · TVA FR31904639531<br/>" +
          "DDPP Paris n° 2026-00039109 · CCN IDCC 1501" +
        "</div>" +
      "</div>" +
    "</div>"

  // =====================================================================
  // CHAPITRES
  // =====================================================================

  // 1 — Objet & formation
  var c1 =
    "<section class='chapter'>" +
      "<div class='copen'>" +
        chead("1", "Bienvenue &amp; objet du guide", icDoc) +
        "<p>Ce manuel rassemble les bonnes pratiques d’hygiène applicables chez Meshuga. Il s’adresse à toute personne qui manipule des denrées, dresse les commandes ou nettoie les espaces. Il vaut <strong>support de formation interne</strong> au sens du Règlement (CE) n°852/2004 (annexe II, chapitre XII) et s’intègre à notre <strong>Plan de Maîtrise Sanitaire (PMS)</strong>.</p>" +
      "</div>" +
      "<div class='card soft keep'>" +
        "<h3 class='bc' style='margin-top:0'>Ton formateur référent</h3>" +
        "<p style='margin-bottom:0'><strong>Edward Touret</strong> a suivi la <strong>formation spécifique en hygiène alimentaire de 14 heures</strong> (organisme <strong>CNFSE</strong>, décembre 2020 – janvier 2021). Cette qualification remplit l’obligation légale « au moins une personne formée par établissement » (art. L.233-4 du Code rural) et lui permet d’assurer ta formation interne : ce document <strong>complète les consignes orales et la démonstration pratique</strong> reçues directement sur place.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Comment utiliser ce guide</h3>" +
        li([
          "<strong>Lis-le en entier</strong> à ton arrivée, puis garde-le comme référence : en cas de doute sur une température, une durée ou un geste, la réponse est ici.",
          "<strong>Il complète la pratique :</strong> rien ne remplace la démonstration sur le terrain et les consignes orales d’Edward. Le guide fixe la règle, le poste t’apprend le geste.",
          "<strong>Il évolue :</strong> recettes, fournisseurs ou matériel peuvent changer. La version qui fait foi est toujours la dernière signée — on te préviendra des mises à jour.",
          "<strong>Une question, un doute ? On demande.</strong> En hygiène, mieux vaut une question de trop qu’un risque pris : on n’invente jamais une réponse."
        ]) +
      "</div>" +
      hero("La sécurité de ce que nous servons est l’affaire de tous. Un geste oublié peut rendre un client malade : c’est pour ça que ces règles existent — et qu’on les applique <b>à chaque service</b>.") +
    "</section>"

  // 2 — Cadre réglementaire (détaillé, en cartes)
  var c2 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("2", "Le cadre réglementaire") +
        "<p>Quelques textes structurent tout ce qui suit. Pas besoin de les connaître par cœur : voici, en clair, ce que chacun implique pour nous au quotidien.</p>" +
      "</div>" +
      "<div class='reg'>" +
        "<div class='row'><span class='tag'>CE 178/2002</span><p><strong>Le socle.</strong> L’exploitant est responsable de la sécurité des aliments (art.17). On garde la <strong>traçabilité</strong> (art.18) et on sait <strong>retirer/rappeler</strong> un produit dangereux (art.19).</p></div>" +
        "<div class='row'><span class='tag'>CE 852/2004</span><p><strong>L’hygiène, en pratique.</strong> Impose la méthode <strong>HACCP</strong> (analyser les dangers) et la <strong>formation du personnel</strong> à l’hygiène — c’est l’objet de ce guide.</p></div>" +
        "<div class='row'><span class='tag'>CE 853/2004</span><p><strong>Produits animaux.</strong> Règles spécifiques aux viandes, poissons, œufs, produits laitiers : c’est de là que viennent nos <strong>températures de conservation</strong>.</p></div>" +
        "<div class='row'><span class='tag'>CE 2073/2005</span><p><strong>Microbiologie.</strong> Fixe les critères (ex. <em>Salmonella</em>, <em>Listeria</em>) que nos denrées ne doivent pas dépasser — la logique derrière nos DLC courtes.</p></div>" +
        "<div class='row'><span class='tag'>UE 1169/2011</span><p><strong>Allergènes.</strong> Obligation d’informer le client sur les 14 allergènes (annexe II), sur place et en ligne.</p></div>" +
        "<div class='row'><span class='tag'>Arrêté 21/12/2009</span><p><strong>Températures &amp; plats témoins.</strong> Détaille les T° du froid/chaud, la décongélation, le refroidissement rapide et la conservation des plats témoins.</p></div>" +
        "<div class='row'><span class='tag'>CSP L.3113-1</span><p><strong>Alerte sanitaire.</strong> Une toxi-infection alimentaire collective (TIAC) est à <strong>déclaration obligatoire</strong> auprès des autorités.</p></div>" +
      "</div>" +
    "</section>"

  // 3 — Hygiène du personnel
  var hwSteps = [
    ["Mouille tes mains à l’eau chaude et applique le savon.", "5 s"],
    ["Frotte paume contre paume pour faire mousser.", "5 s"],
    ["Frotte le dos de chaque main, doigts écartés.", "5 s"],
    ["Entrelace les doigts, paume contre paume.", "5 s"],
    ["N’oublie pas les pouces et le tour des poignets.", "5 s"],
    ["Bouts des doigts &amp; ongles, puis rince et sèche à l’usage unique.", "+ rinçage"]
  ]
  var hwGrid = "<div class='hw-grid'>"
  for (var h = 0; h < hwSteps.length; h++) {
    hwGrid += "<div class='hw-card'><div class='hw-disc'><span class='hw-num'>" + (h + 1) + "</span>" + hwGlyph(h + 1) + "</div>" +
      "<div class='t'>" + hwSteps[h][0] + "</div><span class='dur'>" + hwSteps[h][1] + "</span></div>"
  }
  hwGrid += "</div>"

  var c3 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("3", "L’hygiène, ça commence par toi") +
        "<p>Nos mains et notre tenue sont au contact direct des aliments : c’est la première barrière contre les microbes. On y consacre le plus de soin.</p>" +
      "</div>" +

      "<h3 class='bc'>Le lavage des mains — 6 gestes, ~30 secondes</h3>" +
      "<div class='hw-hero keep'><div style='flex:1'><strong>Le bon réflexe, à fond.</strong> Un lavage efficace dure environ une demi-minute. On mouille, on savonne partout, on frotte, on rince, on sèche à l’essuie-tout jetable — et on ferme le robinet avec.</div><span class='pill'>≈ 30 s</span></div>" +
      hwGrid +
      note("<b>On se lave les mains :</b> en arrivant · après les toilettes · après s’être mouché, touché le visage ou les cheveux · après avoir touché déchets, carton, argent ou téléphone · <b>entre chaque tâche (cru → cuit)</b> · après chaque pause. Le gel hydroalcoolique <b>ne remplace pas</b> l’eau + savon : c’est un complément.") +

      "<h3 class='bc'>La tenue de travail</h3>" +
      "<div class='card keep'>" +
        li([
          "<strong>Casquette Meshuga obligatoire</strong> en zone de manipulation : elle retient les cheveux, première source de contamination. Cheveux longs attachés, barbe soignée.",
          "<strong>Tenue propre réservée au service</strong> : on n’arrive pas et on ne repart pas en tenue de travail. T-shirt propre changé dès qu’il est souillé.",
          "<strong>Chaussures fermées</strong>, antidérapantes, propres, réservées au poste.",
          "<strong>Mains &amp; ongles</strong> : ongles courts, propres, sans vernis ni faux ongles.",
          "<strong>Bijoux interdits</strong> aux mains et avant-bras (bagues, montre, bracelets) : ils retiennent les microbes et peuvent tomber dans un plat. Boucles d’oreilles discrètes tolérées.",
          "<strong>Gants à usage unique</strong> quand c’est utile (plaie protégée, manipulation de prêt-à-consommer) : ils ne dispensent jamais du lavage des mains et se changent souvent."
        ]) +
      "</div>" +

      "<h3 class='bc'>Santé &amp; éviction</h3>" +
      "<div class='card keep'>" +
        "<p>Un soignant malade contamine sans le vouloir. Si tu présentes <strong>diarrhée, vomissements, fièvre, angine, plaie infectée, infection de la peau, des yeux, du nez ou de la gorge</strong> : <strong>préviens Edward avant ta prise de poste</strong>. Tu ne manipules pas de denrées tant que les symptômes durent (Règl. 852/2004, annexe II, chap. VIII).</p>" +
        "<p style='margin-bottom:0'><strong>Coupure ou blessure aux mains :</strong> on nettoie, on protège avec un <strong>pansement bleu détectable</strong> (visible s’il tombe dans un plat) et on enfile un <strong>gant</strong> par-dessus. On signale toute plaie à Edward. <strong>Des pansements bleus détectables sont disponibles en libre-service dans le restaurant.</strong></p>" +
      "</div>" +

      "<h3 class='bc'>Interdit en zone de production… et pourquoi</h3>" +
      "<div class='card keep'>" +
        li([
          "<strong>Manger / mâcher (chewing-gum) :</strong> projections de salive et miettes sur les denrées.",
          "<strong>Fumer / vapoter :</strong> mains-bouche répétées, cendres, contamination directe — et c’est interdit par la loi.",
          "<strong>Tousser ou éternuer au-dessus des aliments :</strong> on se détourne, on se couvre, puis on se lave les mains.",
          "<strong>Cracher</strong> : évident, mais interdit partout dans l’espace de travail.",
          "<strong>Téléphone en main :</strong> c’est un nid à microbes. On le range ; si on doit l’utiliser, on se relave les mains juste après."
        ]) +
      "</div>" +
      note("Aucune de ces règles n’est là pour embêter : chacune empêche un microbe d’atteindre l’assiette du client. En cas de doute sur un geste, on se réfère à ce guide ou on demande à Edward.") +
      "<div class='card soft keep'>" +
        "<h3 class='bc' style='margin-top:0'>Visiteurs, livreurs &amp; intervenants</h3>" +
        li([
          "<strong>La zone de production reste réservée</strong> au personnel : livreurs, commerciaux et visiteurs n’y entrent pas. On réceptionne au comptoir ou à l’entrée.",
          "<strong>Toute personne autorisée à entrer</strong> en cuisine (technicien, agent de contrôle) respecte les mêmes règles — pas de bijoux, mains propres — et on l’accompagne.",
          "<strong>Animaux strictement interdits</strong> en zone alimentaire (seuls les chiens guides sont admis en salle, dans le respect de la réglementation)."
        ]) +
      "</div>" +
    "</section>"

  // 4 — Marche en avant
  var c4 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("4", "La marche en avant", icArrow) +
        "<p>Le principe : un produit avance toujours du « sale » vers le « propre », sans jamais revenir en arrière. Sur nos 27 m², on ne peut pas tout séparer dans l’<strong>espace</strong> — alors on sépare dans le <strong>temps</strong>.</p>" +
      "</div>" +
      illMarche +
      hero("La règle d’or : <b>le propre ne croise jamais le sale, le cuit ne croise jamais le cru.</b> Si les deux doivent passer au même endroit, on nettoie-désinfecte et on se lave les mains entre les deux.") +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>En pratique, chez nous</h3>" +
        li([
          "<strong>On séquence dans le temps :</strong> on regroupe les opérations « sales » (déballage, parage, légumes terreux, viande crue). On nettoie-désinfecte le plan, on se lave les mains, puis on passe aux opérations « propres » (dressage, prêt-à-consommer).",
          "<strong>On dédie le matériel :</strong> planches et couteaux différents pour le cru et le prêt-à-consommer (ou code couleur). À défaut, lavage-désinfection complet entre les deux usages.",
          "<strong>Au froid, le cru toujours EN DESSOUS</strong> du prêt-à-consommer : un jus de viande ne doit jamais goutter sur une salade.",
          "<strong>Les déchets s’évacuent au fur et à mesure</strong> : on ne laisse pas s’accumuler le « sale » sur le plan de travail.",
          "<strong>Un coup de propre entre deux phases :</strong> une phase = un plan propre."
        ]) +
      "</div>" +
    "</section>"

  // 5 — Réception
  var c5 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("5", "Réceptionner une livraison", icThermo) +
        "<p>La réception est un point de contrôle clé : un produit non conforme refusé ici, c’est un risque évité en cuisine. À chaque livraison (Norbert, Rouquette, Foodflow, Marina Sea Food, Monarque, Jacquier, Episaveurs…), on prend deux minutes pour vérifier.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Le contrôle, étape par étape</h3>" +
        li([
          "<strong>Mesurer la température</strong> des produits froids et surgelés avec le <strong>thermomètre infrarouge (pistolet laser)</strong> : on vise la surface du produit, sans contact, et on lit la T° instantanément. Pour les denrées emballées, on peut glisser une sonde entre deux paquets. On <strong>note la valeur</strong> sur la feuille de réception.",
          "<strong>Vérifier les dates</strong> (DLC / DDM) : on refuse une date trop courte pour l’usage prévu.",
          "<strong>Inspecter les emballages</strong> : aucun percé, gonflé, décongelé (givre/cristaux = rupture de chaîne du froid), ni souillé.",
          "<strong>Contrôler le véhicule et le bon de livraison</strong> : propreté, conformité de la commande, quantités.",
          "<strong>En cas de non-conformité</strong> (T° hors seuil, DLC courte, emballage abîmé) : on <strong>refuse le produit</strong>, on le note, et on prévient Edward.",
          "<strong>Ranger immédiatement</strong> : surgelé → congélateur, frais → armoire positive. On ne laisse rien attendre à température ambiante.",
          "<strong>Conserver bon de livraison, étiquettes et n° de lot</strong> pour la traçabilité."
        ]) +
      "</div>" +
      note("<b>Seuils utiles à la réception :</b> frais +4 °C max · viande hachée +2 °C max · poisson frais sur glace 0 à +2 °C · surgelé −18 °C. Au-delà, on appelle Edward avant d’accepter.") +
    "</section>"

  // 6 — Températures (titre + 1er tableau groupés)
  var c6 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("6", "Les températures", icSnow) +
        "<p>Référence : arrêté du 21 décembre 2009 + Règlement (CE) 853/2004. Il s’agit de la température <strong>maximale</strong> de la denrée.</p>" +
        "<div class='tbl'><table><thead><tr><th>Froid positif — origine animale</th><th style='width:34mm'>T° max</th></tr></thead><tbody>" +
          "<tr><td>Viandes hachées</td><td class='val'>+2 °C</td></tr>" +
          "<tr><td>Abats</td><td class='val'>+3 °C</td></tr>" +
          "<tr><td>Préparations de viande</td><td class='val'>+4 °C</td></tr>" +
          "<tr><td>Viandes découpées, volailles, lapin</td><td class='val'>+4 °C</td></tr>" +
          "<tr><td>Carcasses / pièces de gros</td><td class='val'>+7 °C</td></tr>" +
          "<tr><td>Poisson frais / décongelé (sous glace)</td><td class='val'>0 à +2 °C</td></tr>" +
          "<tr><td>Plats cuisinés / denrées très périssables</td><td class='val'>+4 °C max</td></tr>" +
          "<tr><td>Denrées périssables non préemballées</td><td class='val'>+8 °C max</td></tr>" +
        "</tbody></table></div>" +
      "</div>" +
      "<div class='fc'>" +
        "<div class='cell'><div class='ic'>" + icSnow + "</div><div><div class='lab'>Froid négatif</div><div class='big'>−18 °C</div><div class='sub'>surgelés &amp; glaces (autres congelés −12 °C)</div></div></div>" +
        "<div class='cell'><div class='ic'>" + icFlame + "</div><div><div class='lab'>Liaison chaude</div><div class='big'>+63 °C</div><div class='sub'>maintien au chaud, minimum</div></div></div>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Les 3 procédures critiques</h3>" +
        li([
          "<strong>Relevés matin + soir :</strong> on lit la T° de chaque enceinte (chambres froides, congélateur), on note sur la feuille d’autocontrôle, on date et on initie.",
          "<strong>Refroidissement rapide :</strong> de +63 à +10 °C en <strong>moins de 2 heures</strong>. Jamais un grand volume chaud directement en armoire positive (il réchaufferait tout le frigo).",
          "<strong>Décongélation :</strong> au réfrigérateur (+4 °C max) uniquement, sur bac à égouttoir, produit filmé et daté. <strong>Recongélation interdite.</strong>"
        ]) +
      "</div>" +
    "</section>"

  // 7 — Stockage
  var c7 =
    "<section class='chapter'>" +
      "<div class='copen'>" +
        chead("7", "Le stockage") +
        "<p>Bien ranger, c’est éviter les contaminations croisées et le gaspillage. Trois réflexes structurent tout : <strong>rotation, séparation, étiquetage</strong>.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>FIFO — premier entré, premier sorti</h3>" +
        "<p style='margin-bottom:0'>On place les DLC les plus proches <strong>devant</strong> et on prend toujours par l’avant. C’est ce qui évite de retrouver un produit périmé au fond du frigo.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Séparer pour ne pas contaminer</h3>" +
        li([
          "<strong>Cru en bas, prêt-à-consommer en haut</strong> : la gravité fait le reste, un jus ne contamine pas ce qui est dessous.",
          "Séparer par familles (viandes / poissons / légumes / produits laitiers).",
          "<strong>Produits d’entretien à part</strong>, jamais au contact ni au-dessus des denrées.",
          "Pas de carton de livraison en zone froide propre : il vient de l’extérieur et transporte poussières et microbes."
        ]) +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Filmer, dater, étiqueter</h3>" +
        "<p style='margin-bottom:0'>Toute denrée entamée ou préparée est <strong>filmée, datée et étiquetée</strong> : désignation + date de fabrication/ouverture + <strong>date limite secondaire</strong>. Un produit sans étiquette est un produit qu’on ne peut plus identifier : dans le doute, il part.</p>" +
      "</div>" +
    "</section>"

  // 8 — Préparations maison
  var c8 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("8", "Nos préparations maison") +
        "<p>Plusieurs recettes Meshuga utilisent des matières dites « sensibles » (œuf, lait). Bonne nouvelle : on les maîtrise <strong>à la source</strong>, par le choix d’<strong>ingrédients pasteurisés et de cuissons complètes</strong> — un vrai atout sécurité, qu’on complète toujours par le froid, l’étiquetage et une DLC courte.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        li([
          "<strong>Sauces maison</strong> (mayonnaises, Caesar, russe…) : faites au <strong>jaune d’œuf pasteurisé</strong>, jamais à l’œuf coquille cru — le risque <em>Salmonella</em> est maîtrisé dès l’ingrédient. On applique malgré tout froid + étiquetage + DLC courte.",
          "<strong>Machine à sundae</strong> : <strong>lait pasteurisé</strong>. Ici la maîtrise repose surtout sur l’hygiène irréprochable de la machine (voir chapitre Nettoyage).",
          "<strong>Egg sandwich</strong> : <strong>œuf cuit</strong> (cuisson complète), jamais d’œuf cru ni de jaune coulant."
        ]) +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Quand on fabrique, les bons gestes</h3>" +
        li([
          "<strong>On travaille vite et froid :</strong> une préparation sensible ne traîne pas à température ambiante. On sort les quantités utiles, le reste reste au froid.",
          "<strong>Refroidissement rapide :</strong> une préparation chaude destinée au froid passe de +63 °C à +10 °C en <strong>moins de deux heures</strong> avant d’être filmée et stockée.",
          "<strong>On ne prépare pas trop à l’avance :</strong> les quantités sont calées sur la rotation réelle, pour tenir la DLC courte sans gâcher.",
          "<strong>Matériel propre et dédié :</strong> planches, contenants et ustensiles sont nettoyés-désinfectés <strong>avant</strong> de commencer une préparation prête-à-consommer."
        ]) +
      "</div>" +
      note("<b>Règle générale maison :</b> froid (+4 °C max) + étiquetage + DLC secondaire + rotation FIFO sur toutes les préparations. On goûte avec une cuillère à usage unique — jamais les doigts, jamais en replongeant la même cuillère.") +
    "</section>"

  // 9 — DLC
  var c9 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("9", "Durées de conservation (DLC)") +
        "<p>Voici nos durées recommandées comme point de départ raisonnable. <strong>Toute durée plus longue doit être validée par une analyse microbiologique</strong> (test de vieillissement) : sans analyse, on reste sur ces valeurs courtes.</p>" +
      "</div>" +
      "<div class='tbl keep'><table><thead><tr><th>Préparation</th><th style='width:36mm'>Conservation</th><th style='width:30mm'>DLC reco.</th></tr></thead><tbody>" +
        "<tr><td>Mayonnaise, mayo lobster <span style='color:#6B6B76'>(jaune pasteurisé)</span></td><td>+4 °C max, fermé</td><td class='val'>J+3 (72 h)</td></tr>" +
        "<tr><td>Sauce Caesar, sauce russe</td><td>+4 °C max</td><td class='val'>J+3</td></tr>" +
        "<tr><td>Coleslaw</td><td>+4 °C max</td><td class='val'>J+2 à J+3</td></tr>" +
        "<tr><td>Pickles oignons / concombres <span style='color:#6B6B76'>(milieu acide)</span></td><td>+4 °C max</td><td class='val'>J+7</td></tr>" +
        "<tr><td>Frites blanchies / prêtes</td><td>+4 °C max</td><td class='val'>J+1 à J+2</td></tr>" +
        "<tr><td>Garniture egg sandwich <span style='color:#6B6B76'>(œuf cuit)</span></td><td>+4 °C max</td><td class='val'>J+1</td></tr>" +
        "<tr><td>Mix machine à sundae <span style='color:#6B6B76'>(lait pasteurisé)</span></td><td>dans la machine</td><td class='val'>Quotidien</td></tr>" +
        "<tr><td>Produits du commerce entamés</td><td>+4 °C max</td><td class='val'>Selon fabricant</td></tr>" +
      "</tbody></table></div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>La marche à suivre, identique pour tout</h3>" +
        li([
          "On <strong>étiquette</strong> à chaque fabrication/ouverture : désignation + date + DATE LIMITE.",
          "On conserve au froid (+4 °C max), contenant fermé.",
          "On respecte le <strong>FIFO</strong> : le plus ancien part en premier.",
          "<strong>À la date limite ou au moindre doute → on jette.</strong> Jamais de prolongation « au nez ».",
          "Jamais recongeler un produit décongelé, jamais remettre au froid un produit resté trop longtemps à l’air ambiant."
        ]) +
      "</div>" +
    "</section>"

  // 10 — Allergènes
  var alg = [
    ["Gluten", "blé, pain, panure, sauces liées"],
    ["Crustacés", "lobster roll, garnitures"],
    ["Œufs", "sauces, egg sandwich, panures"],
    ["Poissons", "produits Marina Sea Food"],
    ["Arachides", "sauces, toppings"],
    ["Soja", "sauces, huiles, panures"],
    ["Lait", "fromages, sauces, sundae"],
    ["Fruits à coque", "toppings, desserts"],
    ["Céleri", "bouillons, sauces"],
    ["Moutarde", "sauces, vinaigrettes"],
    ["Sésame", "pains, garnitures"],
    ["Sulfites", "condiments, boissons"],
    ["Lupin", "certaines farines"],
    ["Mollusques", "produits de la mer"]
  ]
  var algGrid = "<div class='alg'>"
  for (var a = 0; a < alg.length; a++) {
    algGrid += "<div class='a'><span class='n'>" + (a + 1) + "</span><div><b>" + alg[a][0] + "</b><span>" + alg[a][1] + "</span></div></div>"
  }
  algGrid += "</div>"
  var c10 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("10", "Les allergènes", icAllerg) +
        "<p>C’est un point <strong>vital</strong> : pour une personne allergique, une trace invisible peut déclencher une réaction grave, parfois mortelle. La loi (Règl. UE 1169/2011, annexe II) impose d’informer le client sur <strong>14 allergènes</strong>, sur place <strong>et en ligne</strong> (Deliveroo / Uber Eats).</p>" +
      "</div>" +
      "<h3 class='bc'>Les 14 allergènes à déclaration</h3>" +
      algGrid +
      "<div class='card keep' style='margin-top:6mm'>" +
        "<h3 class='bc' style='margin-top:0'>Nos réflexes Meshuga</h3>" +
        li([
          "<strong>On connaît la composition</strong> de chaque produit. Dans le doute, <strong>on ne devine jamais</strong> : on se réfère à la <strong>fiche allergènes</strong> (jamais « je crois ») ou on oriente le client vers une option sûre.",
          "<strong>Contamination croisée :</strong> pour un plat « sans », on utilise un ustensile et un plan <strong>propres et dédiés</strong>. Une trace suffit.",
          "<strong>Question d’un client allergique :</strong> on prend l’information au sérieux, on vérifie la fiche, on répond précisément.",
          "<strong>En ligne :</strong> les allergènes doivent rester accessibles et à jour sur les plateformes de livraison."
        ]) +
      "</div>" +
    "</section>"

  // 11 — Nettoyage & désinfection
  var c11 =
    "<section class='chapter pbreak'>" +
      "<div class='copen'>" +
        chead("11", "Nettoyage &amp; désinfection", icSpray) +
        "<p><strong>Nettoyer</strong> = enlever les salissures visibles. <strong>Désinfecter</strong> = détruire les microbes invisibles. On <strong>nettoie d’abord</strong>, on désinfecte ensuite, en respectant la <strong>dose</strong> et le <strong>temps de contact</strong>.</p>" +
      "</div>" +
      "<div class='tbl keep'><table><thead><tr><th>Usage</th><th>Type de produit</th><th style='width:34mm'>Normes</th></tr></thead><tbody>" +
        "<tr><td>Surfaces, plans, planches, machine sundae, armoires froides</td><td>Détergent-désinfectant apte au <strong>contact alimentaire</strong></td><td class='val'>EN 1276 · EN 13697</td></tr>" +
        "<tr><td>Vaisselle, ustensiles, contenants</td><td>Liquide lave-vaisselle pro</td><td>Alimentaire</td></tr>" +
        "<tr><td>Hotte, friteuse, plaques</td><td>Dégraissant cuisine (alcalin)</td><td>Dégraissant alim.</td></tr>" +
        "<tr><td>Mains</td><td>Savon + gel hydroalcoolique en complément</td><td class='val'>EN 1500</td></tr>" +
        "<tr><td>Sols</td><td>Détergent sol</td><td>Pro</td></tr>" +
        "<tr><td>Sanitaires</td><td>Désinfectant sanitaires</td><td>WC/sanitaires</td></tr>" +
      "</tbody></table></div>" +
      note("<b>Consommables :</b> gants nitrile, essuie-tout à usage unique (<b>jamais de torchon réutilisé</b>). On conserve les fiches techniques (FDS) et on consigne chaque opération sur la <b>feuille de nettoyage</b> du PMS.") +

      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Les 4 leviers d’un nettoyage efficace (T.A.C.T.)</h3>" +
        li([
          "<strong>Température :</strong> une eau tiède ou chaude dissout bien mieux les graisses qu’une eau froide.",
          "<strong>Action mécanique :</strong> on frotte — le produit seul ne décolle pas les salissures incrustées.",
          "<strong>Concentration :</strong> on respecte la <strong>dose</strong> de la fiche technique : trop peu n’agit pas, trop laisse des résidus.",
          "<strong>Temps de contact :</strong> on laisse au désinfectant le temps d’agir <strong>avant</strong> de rincer (durée indiquée sur le produit)."
        ]) +
      "</div>" +

      "<h3 class='bc'>Protocole machine à sundae — chaque jour</h3>" +
      "<div class='sundae keep'>" +
        "<div class='ill'>" + illSundae + "</div>" +
        "<div style='flex:1'>" +
          "<p style='margin-top:0'>Le lait pasteurisé est un milieu idéal pour les microbes : la machine se nettoie <strong>tous les jours</strong>.</p>" +
          li([
            "<strong>Vidanger</strong> le mix restant en fin de service.",
            "<strong>Démonter</strong> les pièces en contact (bec, joints, cuve) selon la notice.",
            "<strong>Nettoyer</strong> chaque pièce, puis <strong>désinfecter</strong> (produit contact alimentaire), respecter le <strong>temps de contact</strong>, puis rincer.",
            "<strong>Sécher</strong> et remonter propre. <strong>Tracer</strong> l’opération."
          ]) +
        "</div>" +
      "</div>" +
    "</section>"

  // 12 — Fiches réflexe
  var rx = function (dot, h, p) {
    return "<div class='it'><div class='h'><span class='dot'>" + dot + "</span>" + h + "</div><p>" + p + "</p></div>"
  }
  var c12 =
    "<section class='chapter'>" +
      "<div class='copen'>" +
        chead("12", "Fiches réflexe — que faire si…") +
        "<p>Les bons gestes quand quelque chose cloche. Dans le doute : on s’arrête, on sécurise, on prévient Edward.</p>" +
      "</div>" +
      "<div class='rx'>" +
        rx(icSnow, "Panne / dérive de froid", "On ne sert pas les produits sensibles, on vérifie depuis combien de temps, on transfère dans une enceinte conforme et on prévient Edward. Si la durée est incertaine → on jette.") +
        rx(icThermo, "Produit douteux", "Odeur, aspect, texture anormale ou date dépassée : on ne goûte pas, on jette et on signale.") +
        rx(icGloves, "Coupure / blessure", "On stoppe, on nettoie, pansement bleu détectable + gant, puis lavage des mains. On signale à Edward.") +
        rx(icArrow, "Livraison non conforme", "T° hors seuil, DLC trop courte, emballage abîmé : on refuse le produit, on note et on prévient Edward.") +
        rx(icAllerg, "Casse de verre / corps étranger", "On écarte et on jette toutes les denrées exposées, on nettoie soigneusement la zone.") +
        rx(icDoc, "Suspicion de TIAC", "Plusieurs clients malades : on prévient Edward immédiatement, on conserve les plats témoins et produits suspects. Déclaration obligatoire (CSP L.3113-1).") +
      "</div>" +
    "</section>"

  // 13 — Spécificités Meshuga
  var c13 =
    "<section class='chapter'>" +
      "<div class='copen'>" +
        chead("13", "Les spécificités Meshuga") +
        "<p>Notre activité a ses particularités : la livraison, la salle, les déchets, les nuisibles et l’événementiel. Voici comment on les gère.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Vente à distance — Deliveroo, Uber Eats &amp; livraison</h3>" +
        li([
          "On maintient les températures <strong>jusqu’à la remise au livreur</strong> : chaud à +63 °C minimum, froid à +4 °C maximum.",
          "<strong>Packaging propre et adapté</strong> (DS Service, HPS), jamais réutilisé ni souillé.",
          "Les <strong>allergènes</strong> doivent rester accessibles et à jour sur les plateformes."
        ]) +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Salle &amp; sanitaires</h3>" +
        "<p style='margin-bottom:0'>4 places assises : on entretient la propreté des surfaces clients et des sanitaires tout au long du service. Des sanitaires propres, c’est aussi l’image de la maison.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Déchets &amp; huiles usagées</h3>" +
        "<p style='margin-bottom:0'>Poubelles fermées, vidées régulièrement. Les <strong>huiles de friture usagées</strong> sont collectées par <strong>Quatra</strong> — jamais à l’évier — et on conserve les bons d’enlèvement.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        "<h3 class='bc' style='margin-top:0'>Lutte contre les nuisibles</h3>" +
        "<p style='margin-bottom:0'>Contrat avec <strong>La Science des Nuisibles</strong>. On signale immédiatement toute trace (déjections, traces de passage, sachet rongé) et on conserve les rapports de passage. Pas de denrée laissée à l’air libre la nuit.</p>" +
      "</div>" +
      "<div class='card soft keep'>" +
        "<h3 class='bc' style='margin-top:0'>Plat témoin — B2B &amp; événements (Meshuga Events)</h3>" +
        "<p style='margin-bottom:0'>Pour toute prestation B2B ou événementielle, on conserve un <strong>plat témoin de chaque préparation servie</strong> : un échantillon représentatif (~80–100 g), filmé, identifié (intitulé + date), conservé à <strong>0 / +3 °C pendant 5 jours</strong>, à la disposition exclusive des agents de contrôle (arrêté du 21 décembre 2009).</p>" +
      "</div>" +
    "</section>"

  // 14 — Traçabilité & affichages
  var c14 =
    "<section class='chapter'>" +
      "<div class='copen'>" +
        chead("14", "Traçabilité &amp; affichages") +
        "<p>Tracer, c’est pouvoir prouver et réagir vite en cas de problème.</p>" +
      "</div>" +
      "<div class='card keep'>" +
        li([
          "<strong>Traçabilité</strong> (art.18 Règl. 178/2002) : on conserve bons de livraison, étiquettes et n° de lot — on sait toujours « un pas en amont » d’où vient un produit.",
          "<strong>Autocontrôles :</strong> relevés de température, étiquetage, feuilles de nettoyage, bons huiles, rapports nuisibles — tout est consigné au PMS.",
          "<strong>Retrait / rappel</strong> (art.19) : un produit dangereux est retiré, Edward et les autorités sont informés."
        ]) +
      "</div>" +
      "<div class='card soft keep'>" +
        "<h3 class='bc' style='margin-top:0'>Notre Plan de Maîtrise Sanitaire (PMS)</h3>" +
        "<p>Le PMS rassemble nos documents d’hygiène au même endroit : il prouve, en cas de contrôle, que la maîtrise est réelle et quotidienne. On y consigne :</p>" +
        li([
          "<strong>Relevés de températures</strong> (armoires froides, réception) et actions correctives en cas d’écart.",
          "<strong>Bons de livraison, étiquettes et numéros de lot</strong>, conservés pour la traçabilité.",
          "<strong>Feuilles de nettoyage</strong>, bons d’enlèvement des huiles (Quatra) et rapports de l’entreprise de lutte contre les nuisibles.",
          "<strong>Plats témoins</strong> des prestations B2B, conservés 5 jours à 0 / +3 °C."
        ]) +
      "</div>" +
      note("<b>Affichages obligatoires :</b> information allergènes (sur place + en ligne) · origine des viandes · interdiction de fumer/vapoter · mention « Fait maison » lorsqu’elle s’applique.") +
    "</section>"

  // RECONNAISSANCE (genrée + pré-remplie)
  var lu = g("informé", "informée", "informé(e)")
  var soussigne = g("soussigné", "soussignée", "soussigné(e)")
  var salarieMot = g("salarié", "salariée", "salarié(e)")
  var reco =
    "<section class='reco'>" +
      "<div class='copen'>" +
        chead("15", "Engagement &amp; reconnaissance de formation") +
        "<p>Je " + soussigne + " <strong>" + esc(nomLigne) + "</strong>, " + salarieMot + " de <strong>SAS AEGIA FOOD (Meshuga)</strong>, reconnais&nbsp;:</p>" +
        li([
          "avoir <strong>reçu, lu et compris l’intégralité</strong> du présent <em>Guide des bonnes pratiques d’hygiène Meshuga</em> (version <strong>" + esc(version) + "</strong> du <strong>" + esc(dateStr) + "</strong>) ;",
          "que ce document <strong>constitue ma formation aux bonnes pratiques d’hygiène alimentaire</strong>, en complément des <strong>consignes orales et de la démonstration pratique</strong> qui m’ont été données sur place par <strong>Edward Touret</strong>, formateur référent (formation spécifique 14 h, CNFSE, déc. 2020 – janv. 2021), conformément au Règlement (CE) 852/2004 (annexe II, chap. XII) ;",
          "m’<strong>engager à appliquer ces règles</strong> à chaque service ;",
          "avoir été " + lu + " que leur non-respect peut compromettre la sécurité des consommateurs et constituer une faute."
        ]) +
      "</div>" +
      "<div class='sig'>" +
        "<div class='head'>Reconnaissance de formation hygiène</div>" +
        "<div class='id'>" + esc(nomLigne) + "</div>" +
        "<div class='body'>" +
          "<p class='faitline'>Fait à <strong>Paris</strong>, le <strong>" + esc(dateStr) + "</strong>.</p>" +
          "<div class='lines'>" +
            "<div class='sline'>" + g("Le salarié", "La salariée", "Le/la salarié(e)") + " (lu et approuvé)</div>" +
            "<div class='sline'>Pour SAS AEGIA FOOD — Edward Touret</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      "<p style='font-size:9.5pt;color:#6B6B76;margin-top:5mm'>Signature électronique " + g("du salarié", "de la salariée", "du/de la salarié(e)") + " (+ paraphe sur chaque page), horodatage et traçabilité conservés (art. 1366-1367 C. civ. + eIDAS UE 910/2014). Document interne SAS AEGIA FOOD — conservé au dossier RH et intégré au PMS.</p>" +
    "</section>"

  // =====================================================================
  // ASSEMBLAGE
  // =====================================================================
  var html =
    "<!DOCTYPE html><html lang='fr'><head><meta charset='utf-8'/>" +
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'/>" +
    "<title>Guide d’hygiène Meshuga" + (nomComplet ? " — " + esc(nomComplet) : "") + "</title>" +
    "<style>" + styles + "</style></head><body>" +
    cover +
    "<div class='wrap'>" + c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + c9 + c10 + c11 + c12 + c13 + c14 + reco + "</div>" +
    "</body></html>"

  return html
}
