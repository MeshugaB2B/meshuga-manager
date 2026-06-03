// ============================================================
// src/app/dashboard/rh/hygieneGuideBuilder.tsx
// ============================================================
// Génère le HTML complet du "Guide des bonnes pratiques d'hygiène Meshuga"
// aux couleurs de la charte (rose/jaune/noir, néo-brutaliste), sur le modèle
// du dossier de bienvenue (welcomePackBuilder.tsx).
//
// Mise en page : FLUX CONTINU.
//   - Aucun saut de page forcé par chapitre (pas de break-before:page).
//   - break-after:avoid sur les en-têtes de chapitre (titre + numéro non orphelins).
//   - break-inside:avoid sur les cartes / encadrés / pictos / lignes de tableau.
//   - Les tableaux peuvent couler sur 2 pages (thead répété) : zéro trou inutile.
//
// @page nommées (Chrome page.pdf, preferCSSPageSize) :
//   cover     -> couverture pleine page rose, sans header ni paraphes
//   default   -> marges A4 + header + pied de page + paraphes @bottom-right
//   signature -> page de reconnaissance, sans paraphes
//
// Le bloc paraphes conserve la convention "E.T.   /   en attente" pour rester
// compatible avec fixParaphePlaceholder() (Étape B : signature électronique).
//
// SWC-safe : var partout, function(){}, pas de generics, pas de JSX.
//   -> chaînes JS en GUILLEMETS DOUBLES, attributs HTML/SVG en quotes SIMPLES.
// ============================================================

import { ALL_MESHUGA_FONTFACES } from "@/lib/fonts"
import { LOGO_YELLOW, STAMP_YELLOW } from "../logos"

export function buildHygieneGuide(emp, options) {
  var e = emp || {}
  var o = options || {}

  // ---------- helpers ----------
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  var todayFr = function () {
    var d = new Date()
    var months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear()
  }

  var getInitials = function (name) {
    var parts = String(name || "").trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ""
    var ini = ""
    for (var i = 0; i < parts.length; i++) {
      ini += parts[i].charAt(0).toUpperCase() + "."
    }
    return ini
  }

  var version = o.version || "v5"
  var dateStr = o.date || todayFr()

  var nomComplet = ((e.prenom || "") + " " + (e.nom || "")).trim()
  var civilite = (e.civilite || "").toString().trim()
  var nomLigne = nomComplet ? ((civilite ? civilite + " " : "") + (e.prenom || "") + " " + String(e.nom || "").toUpperCase()).trim() : "[Civilité Prénom NOM]"

  var employerInitials = "E.T."
  var employeeInitials = nomComplet ? getInitials(nomComplet) : ""
  var salForParaph = employeeInitials || "en attente"
  var paraphText = employerInitials + "   /   " + salForParaph

  // ---------- pictogrammes SVG (néo-brutalistes : trait 2.5px noir, aplats rose/jaune) ----------
  var pictoThermo = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<rect x='19' y='5' width='8' height='25' rx='4' fill='#fff' stroke='#191923' stroke-width='2.5'/>" +
      "<circle cx='23' cy='37' r='8' fill='#FF82D7' stroke='#191923' stroke-width='2.5'/>" +
      "<rect x='21.5' y='17' width='3' height='19' fill='#FF82D7'/>" +
      "<line x1='29' y1='11' x2='35' y2='11' stroke='#191923' stroke-width='2.5'/>" +
      "<line x1='29' y1='17' x2='35' y2='17' stroke='#191923' stroke-width='2.5'/>" +
      "<line x1='29' y1='23' x2='35' y2='23' stroke='#191923' stroke-width='2.5'/>" +
      "</svg>"
  }
  var pictoFroid = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<g stroke='#191923' stroke-width='2.5' stroke-linecap='round'>" +
      "<line x1='24' y1='6' x2='24' y2='42'/><line x1='8.4' y1='15' x2='39.6' y2='33'/><line x1='8.4' y1='33' x2='39.6' y2='15'/>" +
      "<g stroke='#FF82D7'><line x1='24' y1='12' x2='20' y2='16'/><line x1='24' y1='12' x2='28' y2='16'/>" +
      "<line x1='24' y1='36' x2='20' y2='32'/><line x1='24' y1='36' x2='28' y2='32'/></g>" +
      "</g></svg>"
  }
  var pictoChaud = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<path d='M24 5 C31 16 35 19 35 29 a11 11 0 0 1 -22 0 C13 21 17 17 24 5 Z' fill='#FFEB5A' stroke='#191923' stroke-width='2.5' stroke-linejoin='round'/>" +
      "<path d='M24 21 C27 25 28.5 27 28.5 31 a4.5 4.5 0 0 1 -9 0 C19.5 27 21 25 24 21 Z' fill='#FF82D7'/>" +
      "</svg>"
  }
  var pictoArrow = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<path d='M5 18 H29 V11 L43 24 L29 37 V30 H5 Z' fill='#FF82D7' stroke='#191923' stroke-width='2.5' stroke-linejoin='round'/>" +
      "</svg>"
  }
  var pictoAllerg = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<path d='M24 5 L45 41 H3 Z' fill='#FFEB5A' stroke='#191923' stroke-width='2.5' stroke-linejoin='round'/>" +
      "<rect x='22' y='17' width='4' height='13' rx='2' fill='#191923'/>" +
      "<circle cx='24' cy='35' r='2.6' fill='#191923'/>" +
      "</svg>"
  }
  var pictoSpray = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<rect x='13' y='18' width='16' height='25' rx='2' fill='#FF82D7' stroke='#191923' stroke-width='2.5'/>" +
      "<rect x='17' y='9' width='8' height='9' fill='#fff' stroke='#191923' stroke-width='2.5'/>" +
      "<path d='M25 11 H35 V15 H30' fill='none' stroke='#191923' stroke-width='2.5' stroke-linejoin='round'/>" +
      "<circle cx='39' cy='10' r='1.6' fill='#191923'/><circle cx='42' cy='14' r='1.6' fill='#191923'/><circle cx='38' cy='17' r='1.6' fill='#191923'/>" +
      "<rect x='17' y='25' width='8' height='6' fill='#fff' stroke='#191923' stroke-width='2'/>" +
      "</svg>"
  }
  var pictoBin = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<rect x='13' y='16' width='22' height='25' rx='2' fill='#FF82D7' stroke='#191923' stroke-width='2.5'/>" +
      "<rect x='10' y='11' width='28' height='5' fill='#FFEB5A' stroke='#191923' stroke-width='2.5'/>" +
      "<rect x='20' y='6' width='8' height='5' fill='#FFEB5A' stroke='#191923' stroke-width='2.5'/>" +
      "<g stroke='#191923' stroke-width='2.5' stroke-linecap='round'><line x1='19' y1='22' x2='19' y2='35'/><line x1='24' y1='22' x2='24' y2='35'/><line x1='29' y1='22' x2='29' y2='35'/></g>" +
      "</svg>"
  }
  var pictoMouse = function () {
    return "<svg viewBox='0 0 48 48' width='100%' height='100%' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<circle cx='24' cy='24' r='19' fill='#fff' stroke='#191923' stroke-width='2.5'/>" +
      "<ellipse cx='23' cy='27' rx='10' ry='6.5' fill='#FF82D7' stroke='#191923' stroke-width='2'/>" +
      "<circle cx='15' cy='21' r='3.6' fill='#FF82D7' stroke='#191923' stroke-width='2'/>" +
      "<path d='M33 29 q6 1 6 -6' fill='none' stroke='#191923' stroke-width='2'/>" +
      "<circle cx='13.5' cy='25' r='1.1' fill='#191923'/>" +
      "<line x1='11' y1='11' x2='37' y2='37' stroke='#191923' stroke-width='4'/>" +
      "</svg>"
  }
  var pictoHandSmall = function () {
    return "<svg viewBox='0 0 32 32' width='22' height='22' xmlns='http://www.w3.org/2000/svg' aria-hidden='true'>" +
      "<path d='M9 16 V9 a2 2 0 0 1 4 0 V14 M13 13 V7 a2 2 0 0 1 4 0 V14 M17 14 V8 a2 2 0 0 1 4 0 V15 M21 15 V11 a2 2 0 0 1 4 0 V20 a8 8 0 0 1 -16 0 V15 a2 2 0 0 1 4 0' fill='#FFEB5A' stroke='#191923' stroke-width='2' stroke-linejoin='round'/>" +
      "</svg>"
  }

  // chip d'en-tête de chapitre (picto encadré jaune)
  var chip = function (svg) {
    return "<div class='pchip'>" + svg + "</div>"
  }

  // en-tête de chapitre homogène : numéro + titre Yellowtail (+ picto optionnel)
  var chead = function (num, title, pictoSvg) {
    return "<div class='chead'>" +
      "<div class='chnum'>" + num + "</div>" +
      "<h2 class='yt'>" + title + "</h2>" +
      (pictoSvg ? chip(pictoSvg) : "") +
      "</div>"
  }

  var legal = function (refTxt, body) {
    return "<div class='legal-box'><span class='ref'>" + refTxt + "</span>" + body + "</div>"
  }

  // ---------- styles ----------
  var styles =
    ALL_MESHUGA_FONTFACES +
    ":root{--p:#FF82D7;--y:#FFEB5A;--ink:#191923}" +
    "@supports (color: color(display-p3 1 1 1)){:root{--p:color(display-p3 1 .515 .855);--y:color(display-p3 1 .925 .38)}}" +
    "*{box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}" +
    // --- @page ---
    "@page cover{size:A4;margin:0}" +
    "@page{size:A4;margin:16mm 14mm 20mm 14mm;" +
      "@bottom-left{content:'SAS AEGIA FOOD - Guide hygiene Meshuga';font-family:'BILD Condensed','Arial Narrow',sans-serif;font-size:8pt;color:#9a9a9a;letter-spacing:1px;text-transform:uppercase}" +
      "@bottom-center{content:'Page ' counter(page) ' / ' counter(pages);font-family:'Arial Narrow',sans-serif;font-size:8pt;color:#9a9a9a;letter-spacing:1px}" +
      "@bottom-right{content:\"" + paraphText + "\";font-family:'Yellowtail',cursive;font-size:13pt;color:#FF82D7}}" +
    "@page signature{size:A4;margin:16mm 14mm 18mm 14mm;" +
      "@bottom-left{content:'SAS AEGIA FOOD - Guide hygiene Meshuga';font-family:'BILD Condensed','Arial Narrow',sans-serif;font-size:8pt;color:#9a9a9a;letter-spacing:1px;text-transform:uppercase}" +
      "@bottom-center{content:'Page ' counter(page) ' / ' counter(pages);font-family:'Arial Narrow',sans-serif;font-size:8pt;color:#9a9a9a;letter-spacing:1px}" +
      "@bottom-right{content:none}}" +
    "html,body{background:#fff;margin:0;padding:0}" +
    "body{font-family:'Arial Narrow',Arial,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.5}" +
    // --- couverture ---
    ".cover{page:cover;width:210mm;height:297mm;background:var(--p);padding:22mm;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;page-break-after:always;break-after:page}" +
    ".cover .bg-circle{position:absolute;border-radius:50%;pointer-events:none}" +
    ".cover .logo{width:88mm;height:auto;display:block;position:relative;z-index:1}" +
    ".cover h1{font-family:'Yellowtail',cursive;color:#fff;font-weight:400;font-size:66pt;line-height:1.02;margin:0;position:relative;z-index:1}" +
    ".cover .sub{font-family:'BILD Condensed','Arial Narrow',sans-serif;color:#fff;text-transform:uppercase;letter-spacing:3px;font-size:13pt;margin-top:6mm;position:relative;z-index:1}" +
    ".cover .legalblock{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;color:#fff;font-size:10pt;line-height:1.6}" +
    ".cover .stamp{width:46mm;height:46mm;flex-shrink:0}" +
    // --- chapitres (flux continu) ---
    ".chapter{margin-top:8mm}" +
    ".chapter:first-of-type{margin-top:0}" +
    ".chead{display:flex;align-items:center;gap:4mm;margin-bottom:4mm;border-bottom:3px solid var(--p);padding-bottom:2.5mm;break-after:avoid;page-break-after:avoid}" +
    ".chnum{width:11mm;height:11mm;background:var(--p);color:#fff;border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);display:flex;align-items:center;justify-content:center;font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:900;font-size:17pt;flex-shrink:0}" +
    "h2.yt{font-family:'Yellowtail',cursive;color:var(--p);font-weight:400;font-size:29pt;line-height:1;margin:0}" +
    ".pchip{width:16mm;height:16mm;margin-left:auto;border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);background:var(--y);display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:2mm}" +
    "h3.bc{font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--p);font-size:12pt;margin:5mm 0 2mm;break-after:avoid;page-break-after:avoid}" +
    "p{margin:0 0 2.5mm}" +
    "strong{font-weight:700}" +
    "ul.tidy{list-style:none;padding:0;margin:2.5mm 0}" +
    "ul.tidy li{padding:2px 0 2px 18px;position:relative;break-inside:avoid}" +
    "ul.tidy li::before{content:'';position:absolute;left:0;top:7px;width:7px;height:7px;background:var(--p);border:1.5px solid var(--ink)}" +
    // --- cartes / encadrés ---
    ".card{border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);background:#fff;padding:4mm 5mm;margin:3mm 0;break-inside:avoid;page-break-inside:avoid}" +
    ".banner{border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);padding:3mm 5mm;margin:3mm 0;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.5px;font-size:11pt;break-inside:avoid}" +
    ".banner.p{background:var(--p);color:#fff}" +
    ".banner.y{background:var(--y);color:var(--ink)}" +
    ".legal-box{background:#FFFEF5;border-left:5px solid var(--p);padding:3mm 4mm;margin:2.5mm 0;break-inside:avoid;page-break-inside:avoid}" +
    ".legal-box .ref{display:block;font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:700;font-size:8.5pt;text-transform:uppercase;letter-spacing:1px;color:var(--p);margin-bottom:1.5mm}" +
    ".tip{background:#FFFDF0;border-left:5px solid var(--y);padding:3mm 4mm;margin:3mm 0;break-inside:avoid}" +
    // --- 6 étapes lavage des mains ---
    ".steps{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin:3mm 0}" +
    ".step{border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);background:#fff;padding:3mm;break-inside:avoid;display:flex;gap:2.5mm;align-items:flex-start}" +
    ".step .sn{width:7mm;height:7mm;flex-shrink:0;background:var(--p);color:#fff;border:1.5px solid var(--ink);display:flex;align-items:center;justify-content:center;font-family:'BILD Condensed','Arial Narrow',sans-serif;font-weight:900;font-size:11pt}" +
    ".step .stxt{font-size:9.5pt;line-height:1.35}" +
    // --- tableaux (coulent par lignes, header répété) ---
    "table{width:100%;border-collapse:collapse;margin:3mm 0;font-size:9.8pt;border:2px solid var(--ink)}" +
    "thead{display:table-header-group}" +
    "tr{break-inside:avoid;page-break-inside:avoid}" +
    "th{background:var(--p);color:#fff;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:.5px;font-size:9pt;text-align:left;padding:2.5mm 3mm;border:1px solid var(--ink)}" +
    "td{padding:2mm 3mm;border:1px solid var(--ink);vertical-align:top}" +
    "tbody tr:nth-child(even){background:#FFF6FC}" +
    "td .hl{font-weight:700;color:var(--ink);white-space:nowrap}" +
    // --- froid/chaud côte à côte ---
    ".fc{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:3mm 0}" +
    ".fc .cell{border:2px solid var(--ink);box-shadow:3px 3px 0 var(--ink);background:#fff;padding:3mm 4mm;display:flex;align-items:center;gap:3mm;break-inside:avoid}" +
    ".fc .cell .ic{width:14mm;height:14mm;flex-shrink:0}" +
    ".fc .cell .v{font-family:'BILD Condensed','Arial Narrow',sans-serif;font-size:16pt;font-weight:900;color:var(--p)}" +
    // --- page de reconnaissance ---
    ".reco{page:signature;page-break-before:always;break-before:page}" +
    ".sig{border:2px solid var(--p);background:#fff;break-inside:avoid;margin-top:4mm}" +
    ".sig .head{background:var(--p);color:#fff;padding:3mm 5mm;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:1.5px;font-weight:900;font-size:12pt;text-align:center}" +
    ".sig .id{background:var(--y);padding:3mm 5mm;border-bottom:2px solid var(--p);text-align:center;font-size:11pt}" +
    ".sig .body{padding:5mm}" +
    ".sig .lines{display:flex;justify-content:space-between;gap:8mm;margin-top:10mm}" +
    ".sig .sline{flex:1;border-top:2px solid var(--ink);padding-top:2mm;font-family:'BILD Condensed','Arial Narrow',sans-serif;text-transform:uppercase;letter-spacing:1px;font-size:9pt;color:var(--ink)}" +
    ".faitline{margin-top:8mm;font-size:10.5pt}" +
    // --- écran (aperçu hors PDF) ---
    "@media screen{body{background:#ededed}.cover{margin:0 auto;box-shadow:0 4px 22px rgba(0,0,0,.18)}.sheet{max-width:210mm;margin:6mm auto;background:#fff;padding:16mm 14mm;box-shadow:0 4px 22px rgba(0,0,0,.08)}}" +
    "@media print{.sheet{padding:0}}"

  // =====================================================================
  // COUVERTURE
  // =====================================================================
  var cover =
    "<div class='cover'>" +
      "<div class='bg-circle' style='width:180mm;height:180mm;background:#FFEB5A;opacity:.16;top:-60mm;right:-50mm'></div>" +
      "<div class='bg-circle' style='width:120mm;height:120mm;background:#FFEB5A;opacity:.10;bottom:-36mm;left:-34mm'></div>" +
      "<div style='position:relative;z-index:1'><img class='logo' src='" + LOGO_YELLOW + "' alt='Meshuga'/></div>" +
      "<div style='position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center;padding:8mm 0'>" +
        "<h1>Guide des bonnes<br/>pratiques d&#39;hygi&egrave;ne</h1>" +
        "<div class='sub'>Manuel du personnel &middot; Proc&eacute;dures, gestes &amp; r&eacute;flexes</div>" +
      "</div>" +
      "<div class='legalblock'>" +
        "<div>" +
          "<div style='font-weight:700;text-transform:uppercase;letter-spacing:1.5px;font-size:9.5pt;margin-bottom:2mm;opacity:.9'>&Eacute;dition " + esc(version) + " &middot; " + esc(dateStr) + "</div>" +
          "<div style='font-weight:700;font-size:11pt'>SAS AEGIA FOOD &mdash; Meshuga</div>" +
          "<div style='opacity:.92'>3 rue Vavin &mdash; 75006 Paris</div>" +
          "<div style='opacity:.92'>RCS Paris 904 639 531 &middot; TVA FR31904639531</div>" +
          "<div style='opacity:.92'>DDPP Paris n&deg; 2026-00039109 &middot; CCN IDCC 1501</div>" +
        "</div>" +
        "<img class='stamp' src='" + STAMP_YELLOW + "' alt='Meshuga'/>" +
      "</div>" +
    "</div>"

  // =====================================================================
  // CONTENU (flux continu)
  // =====================================================================

  // Ch.1 - Objet & formateur
  var c1 =
    "<section class='chapter'>" +
      chead("1", "Objet &amp; formation interne") +
      "<p>Ce manuel est le support de la <strong>formation / instruction interne &agrave; l&#39;hygi&egrave;ne</strong> au sens du R&egrave;glement (CE) n&deg;852/2004 (annexe II, chap. XII) et s&#39;int&egrave;gre au <strong>Plan de Ma&icirc;trise Sanitaire (PMS)</strong>.</p>" +
      "<div class='card'>" +
        "<h3 class='bc' style='margin-top:0'>Formateur r&eacute;f&eacute;rent</h3>" +
        "<p style='margin-bottom:0'><strong>Edward Touret</strong>, titulaire de la <strong>formation sp&eacute;cifique en hygi&egrave;ne alimentaire (14&nbsp;heures)</strong> dispens&eacute;e par l&#39;organisme <strong>CNFSE</strong>, suivie de <strong>d&eacute;cembre 2020 &agrave; janvier 2021</strong>. Cette qualification satisfait l&#39;obligation l&eacute;gale &laquo;&nbsp;au moins une personne form&eacute;e par &eacute;tablissement&nbsp;&raquo; (art. L.233-4 du Code rural) et fonde la comp&eacute;tence pour assurer la formation interne de l&#39;&eacute;quipe.</p>" +
      "</div>" +
      "<div class='banner p'>Art. 17 R&egrave;gl. 178/2002 &middot; la s&eacute;curit&eacute; des denr&eacute;es est la responsabilit&eacute; de l&#39;exploitant &mdash; et, au quotidien, de chacun d&#39;entre nous.</div>" +
    "</section>"

  // Ch.2 - Cadre réglementaire
  var c2 =
    "<section class='chapter'>" +
      chead("2", "Cadre r&eacute;glementaire") +
      legal("R&egrave;gl. (CE) 178/2002", "<p style='margin-bottom:0'>Responsabilit&eacute; de l&#39;exploitant (art.17), tra&ccedil;abilit&eacute; (art.18), retrait/rappel (art.19).</p>") +
      legal("R&egrave;gl. (CE) 852/2004 &middot; 853/2004", "<p style='margin-bottom:0'>HACCP (art.5) et formation (annexe II, chap. XII) ; denr&eacute;es d&#39;origine animale.</p>") +
      legal("R&egrave;gl. (CE) 2073/2005", "<p style='margin-bottom:0'>Crit&egrave;res microbiologiques applicables aux denr&eacute;es.</p>") +
      legal("R&egrave;gl. (UE) 1169/2011 &middot; 2021/382", "<p style='margin-bottom:0'>Information allerg&egrave;nes (annexe II) ; culture de s&eacute;curit&eacute; des aliments.</p>") +
      legal("Arr&ecirc;t&eacute;s 21/12/2009 &amp; 08/10/2013", "<p style='margin-bottom:0'>Temp&eacute;ratures (origine animale et hors origine animale), d&eacute;cong&eacute;lation, refroidissement, plats t&eacute;moins.</p>") +
      legal("D&eacute;cret 2011-731 + arr&ecirc;t&eacute; 12/02/2024 &middot; D&eacute;cret 2015-447", "<p style='margin-bottom:0'>Formation 14&nbsp;h (art. L.233-4 / D.233-12 Code rural) ; allerg&egrave;nes en restauration.</p>") +
      legal("Code de la sant&eacute; publique L.3113-1 / D.3113-7", "<p style='margin-bottom:0'>Toxi-infection alimentaire collective (TIAC) &mdash; &agrave; d&eacute;claration obligatoire.</p>") +
    "</section>"

  // Ch.3 - Hygiène du personnel (lavage des mains 6 étapes)
  var stepData = [
    "Mouiller les mains &agrave; l&#39;eau, appliquer le savon.",
    "Paume contre paume.",
    "Paume sur le dos de l&#39;autre main, doigts entrecrois&eacute;s (et inversement).",
    "Doigts entrelac&eacute;s, paume contre paume.",
    "Pouces, ongles et bouts des doigts.",
    "Rincer, s&eacute;cher &agrave; l&#39;essuie-main &agrave; usage unique, fermer le robinet avec."
  ]
  var stepsHtml = ""
  for (var s = 0; s < stepData.length; s++) {
    stepsHtml += "<div class='step'><div class='sn'>" + (s + 1) + "</div><div class='stxt'>" + stepData[s] + "</div></div>"
  }
  var c3 =
    "<section class='chapter'>" +
      chead("3", "Hygi&egrave;ne du personnel", pictoHandSmall()) +
      "<h3 class='bc'>Le lavage des mains &mdash; 6 &eacute;tapes (~30&nbsp;s)</h3>" +
      "<div class='steps'>" + stepsHtml + "</div>" +
      "<div class='tip'><strong>Quand&nbsp;?</strong> &Agrave; l&#39;arriv&eacute;e &middot; apr&egrave;s les toilettes &middot; apr&egrave;s s&#39;&ecirc;tre mouch&eacute;/touch&eacute; le visage ou les cheveux &middot; apr&egrave;s avoir touch&eacute; d&eacute;chets, cru, argent, t&eacute;l&eacute;phone, emballage/carton &middot; <strong>entre deux t&acirc;ches (cru&nbsp;&rarr;&nbsp;cuit)</strong> &middot; apr&egrave;s chaque pause.</div>" +
      "<h3 class='bc'>Tenue</h3>" +
      "<ul class='tidy'>" +
        "<li><strong>Casquette Meshuga obligatoire</strong> en zone de manipulation.</li>" +
        "<li>Tenue propre r&eacute;serv&eacute;e au service, tablier propre, chaussures ferm&eacute;es antid&eacute;rapantes.</li>" +
        "<li>Ongles courts, propres, sans vernis ni faux ongles.</li>" +
        "<li>Plaie&nbsp;: pansement <strong>bleu d&eacute;tectable</strong> + gant par-dessus.</li>" +
      "</ul>" +
      "<h3 class='bc'>Sant&eacute; &mdash; &eacute;viction</h3>" +
      "<p>En cas de gastro, diarrh&eacute;e, vomissements, fi&egrave;vre, infection cutan&eacute;e/ORL&nbsp;: <strong>pr&eacute;venir Edward avant la prise de poste</strong> et ne pas manipuler de denr&eacute;es tant que les sympt&ocirc;mes durent. <span style='color:#9a9a9a'>(852/2004, annexe II, chap. VIII)</span></p>" +
      "<h3 class='bc'>Interdits en zone de production</h3>" +
      "<p style='margin-bottom:0'>Manger &middot; fumer / vapoter &middot; m&acirc;cher (chewing-gum) &middot; cracher &middot; tousser/&eacute;ternuer au-dessus des denr&eacute;es &middot; t&eacute;l&eacute;phone en main (le ranger ; se laver les mains apr&egrave;s usage).</p>" +
    "</section>"

  // Ch.4 - Marche en avant
  var c4 =
    "<section class='chapter'>" +
      chead("4", "La marche en avant (27&nbsp;m&sup2;)", pictoArrow()) +
      "<p>Sur 27&nbsp;m&sup2;, on ne s&eacute;pare pas tout dans l&#39;<strong>espace</strong>&nbsp;: on s&eacute;pare dans le <strong>temps</strong>. R&egrave;gle d&#39;or&nbsp;: <strong>le propre ne croise jamais le sale, le cuit ne croise jamais le cru.</strong></p>" +
      "<div class='banner y'>R&eacute;ception &rarr; stockage &rarr; d&eacute;conditionnement/parage (sale) &rarr; pr&eacute;paration &rarr; cuisson &rarr; dressage/conditionnement (propre) &rarr; exp&eacute;dition</div>" +
      "<h3 class='bc'>En pratique, au quotidien</h3>" +
      "<ul class='tidy'>" +
        "<li><strong>S&eacute;quencer&nbsp;:</strong> regrouper les op&eacute;rations &laquo;&nbsp;sales&nbsp;&raquo; (d&eacute;ballage, parage, l&eacute;gumes terreux, cru), nettoyer-d&eacute;sinfecter le plan, se laver les mains, puis passer aux op&eacute;rations &laquo;&nbsp;propres&nbsp;&raquo;.</li>" +
        "<li><strong>D&eacute;dier le mat&eacute;riel&nbsp;:</strong> planches/couteaux diff&eacute;rents cru / pr&ecirc;t-&agrave;-consommer (ou code couleur) ; &agrave; d&eacute;faut, lavage-d&eacute;sinfection complet entre les deux.</li>" +
        "<li><strong>Stockage&nbsp;:</strong> le cru toujours <strong>en dessous</strong> du pr&ecirc;t-&agrave;-consommer.</li>" +
        "<li>D&eacute;chets &eacute;vacu&eacute;s au fur et &agrave; mesure ; un coup de propre entre deux phases.</li>" +
      "</ul>" +
      "<div class='banner p'>Le r&eacute;flexe Meshuga&nbsp;: une phase = un plan propre. Je nettoie, je me lave les mains, je passe &agrave; la suite.</div>" +
    "</section>"

  // Ch.5 - Réception
  var c5 =
    "<section class='chapter'>" +
      chead("5", "R&eacute;ception d&#39;une livraison", pictoThermo()) +
      "<p>&Agrave; chaque livraison (Norbert, Rouquette, Foodflow, Marina Sea Food, Monarque, Jacquier, Episaveurs&hellip;)&nbsp;:</p>" +
      "<ul class='tidy'>" +
        "<li><strong>Contr&ocirc;ler la temp&eacute;rature</strong> des produits froids/surgel&eacute;s (thermom&egrave;tre) &rarr; noter sur la feuille de r&eacute;ception.</li>" +
        "<li><strong>V&eacute;rifier les dates</strong> (DLC/DDM)&nbsp;: refuser une DLC trop courte pour l&#39;usage pr&eacute;vu.</li>" +
        "<li><strong>Inspecter les emballages</strong>&nbsp;: aucun perc&eacute;, gonfl&eacute;, d&eacute;congel&eacute;, souill&eacute;.</li>" +
        "<li>V&eacute;rifier la propret&eacute; du v&eacute;hicule et la conformit&eacute; au bon de livraison.</li>" +
        "<li><strong>Non-conformit&eacute;</strong> (T&deg; hors seuil, DLC courte, emballage ab&icirc;m&eacute;)&nbsp;: refuser le produit, le noter, pr&eacute;venir Edward.</li>" +
        "<li><strong>Ranger imm&eacute;diatement</strong>&nbsp;: surgel&eacute; &rarr; cong&eacute;lateur, frais &rarr; armoire positive.</li>" +
        "<li>Conserver bon de livraison + &eacute;tiquettes/lots (tra&ccedil;abilit&eacute;).</li>" +
      "</ul>" +
    "</section>"

  // Ch.6 - Températures
  var c6 =
    "<section class='chapter'>" +
      chead("6", "Temp&eacute;ratures l&eacute;gales", pictoFroid()) +
      "<p>R&eacute;f.&nbsp;: arr&ecirc;t&eacute; du 21 d&eacute;cembre 2009 + R&egrave;gl. (CE) 853/2004. Temp&eacute;rature <strong>maximale</strong> de la denr&eacute;e.</p>" +
      "<h3 class='bc'>Froid positif &mdash; origine animale</h3>" +
      "<table><thead><tr><th>Denr&eacute;e</th><th style='width:30mm'>T&deg; max</th></tr></thead><tbody>" +
        "<tr><td>Viandes hach&eacute;es</td><td><span class='hl'>+2&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>Abats</td><td><span class='hl'>+3&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>Pr&eacute;parations de viande</td><td><span class='hl'>+4&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>Viandes d&eacute;coup&eacute;es, volailles, lapin</td><td><span class='hl'>+4&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>Carcasses / pi&egrave;ces de gros</td><td><span class='hl'>+7&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>Poisson frais / d&eacute;congel&eacute;</td><td><span class='hl'>0 &agrave; +2&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>&OElig;ufs</td><td><span class='hl'>constante &gt; +5&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>Plats cuisin&eacute;s / denr&eacute;es tr&egrave;s p&eacute;rissables</td><td><span class='hl'>+4&nbsp;&deg;C</span></td></tr>" +
        "<tr><td>Denr&eacute;es p&eacute;rissables non pr&eacute;emball&eacute;es</td><td><span class='hl'>+8&nbsp;&deg;C</span></td></tr>" +
      "</tbody></table>" +
      "<p style='font-size:9.5pt;color:#6a6a6a'>Pr&eacute;emball&eacute;&nbsp;: la T&deg; du conditionneur sur l&#39;&eacute;tiquette prime (sans d&eacute;passer le 853/2004).</p>" +
      "<div class='fc'>" +
        "<div class='cell'><div class='ic'>" + pictoFroid() + "</div><div><div style='font-family:&quot;BILD Condensed&quot;,sans-serif;text-transform:uppercase;font-size:9pt;letter-spacing:.5px'>Froid n&eacute;gatif</div><div class='v'>&minus;18&nbsp;&deg;C</div><div style='font-size:9pt'>surgel&eacute;s, glaces &middot; autres congel&eacute;s &minus;12&nbsp;&deg;C</div></div></div>" +
        "<div class='cell'><div class='ic'>" + pictoChaud() + "</div><div><div style='font-family:&quot;BILD Condensed&quot;,sans-serif;text-transform:uppercase;font-size:9pt;letter-spacing:.5px'>Liaison chaude</div><div class='v'>&ge;&nbsp;+63&nbsp;&deg;C</div><div style='font-size:9pt'>maintien au chaud</div></div></div>" +
      "</div>" +
      "<h3 class='bc'>Proc&eacute;dures critiques</h3>" +
      "<ul class='tidy'>" +
        "<li><strong>Relev&eacute; matin + soir&nbsp;:</strong> lire le thermom&egrave;tre de chaque enceinte, noter sur la feuille d&#39;autocontr&ocirc;le, dater + initiales.</li>" +
        "<li><strong>Refroidissement rapide&nbsp;:</strong> de +63 &agrave; +10&nbsp;&deg;C en moins de 2&nbsp;h. Jamais de grand volume chaud directement en armoire positive.</li>" +
        "<li><strong>D&eacute;cong&eacute;lation&nbsp;:</strong> au r&eacute;frig&eacute;rateur (&le; +4&nbsp;&deg;C) uniquement, sur bac &agrave; &eacute;gouttoir, produit film&eacute;/dat&eacute;. Recong&eacute;lation interdite.</li>" +
      "</ul>" +
    "</section>"

  // Ch.7 - Stockage
  var c7 =
    "<section class='chapter'>" +
      chead("7", "Stockage") +
      "<ul class='tidy'>" +
        "<li><strong>FIFO / PEPS&nbsp;:</strong> les DLC les plus proches devant, on prend toujours par l&#39;avant.</li>" +
        "<li><strong>S&eacute;parer</strong> cru/cuit et par familles&nbsp;; cru en bas, pr&ecirc;t-&agrave;-consommer en haut.</li>" +
        "<li><strong>Filmer, dater, &eacute;tiqueter</strong> toute denr&eacute;e entam&eacute;e/pr&eacute;par&eacute;e&nbsp;: d&eacute;signation + date + DLC secondaire.</li>" +
        "<li>Produits d&#39;entretien rang&eacute;s &agrave; part, jamais au contact des denr&eacute;es.</li>" +
        "<li>Pas de carton en zone froide propre.</li>" +
      "</ul>" +
    "</section>"

  // Ch.8 - Produits maîtrisés
  var c8 =
    "<section class='chapter'>" +
      chead("8", "Pr&eacute;parations maison ma&icirc;tris&eacute;es") +
      "<div class='banner p'>Meshuga ma&icirc;trise ses mati&egrave;res sensibles par le choix de produits pasteuris&eacute;s et cuits &mdash; un point fort de s&eacute;curit&eacute; alimentaire.</div>" +
      "<ul class='tidy'>" +
        "<li><strong>Sauces maison</strong> (mayonnaises, Caesar, russe&hellip;)&nbsp;: <strong>jaune d&#39;&oelig;uf pasteuris&eacute;</strong>, pas d&#39;&oelig;uf coquille cru &mdash; risque <em>Salmonella</em> ma&icirc;tris&eacute; &agrave; la source. On applique malgr&eacute; tout&nbsp;: froid + &eacute;tiquetage + DLC secondaire courte.</li>" +
        "<li><strong>Machine &agrave; sundae</strong>&nbsp;: <strong>lait pasteuris&eacute;</strong>. La ma&icirc;trise repose sur l&#39;hygi&egrave;ne de la machine (voir protocole ch.10).</li>" +
        "<li><strong>Egg sandwich</strong>&nbsp;: <strong>&oelig;uf cuit</strong> (cuisson compl&egrave;te) &mdash; pas d&#39;&oelig;uf cru ni de coulant.</li>" +
      "</ul>" +
      "<div class='tip'><strong>R&egrave;gle g&eacute;n&eacute;rale maison&nbsp;:</strong> froid + &eacute;tiquetage + DLC secondaire + rotation FIFO sur toutes les pr&eacute;parations. Go&ucirc;ter avec une cuill&egrave;re &agrave; usage unique (jamais les doigts, jamais replonger).</div>" +
    "</section>"

  // Ch.9 - DLC recommandées
  var c9 =
    "<section class='chapter'>" +
      chead("9", "Dur&eacute;es de conservation (DLC)") +
      "<p>Valeurs usuelles recommand&eacute;es, comme point de d&eacute;part raisonnable. <strong>Toute DLC plus longue doit &ecirc;tre justifi&eacute;e par une validation microbiologique</strong> (test de vieillissement). En l&#39;absence d&#39;analyse, on reste sur ces dur&eacute;es courtes.</p>" +
      "<table><thead><tr><th>Pr&eacute;paration</th><th style='width:38mm'>Conservation</th><th style='width:34mm'>DLC recommand&eacute;e</th></tr></thead><tbody>" +
        "<tr><td>Mayonnaise, Mayo lobster <span style='color:#6a6a6a'>(jaune pasteuris&eacute;)</span></td><td>&le; +4&nbsp;&deg;C, ferm&eacute;</td><td><span class='hl'>J+3 (72&nbsp;h)</span></td></tr>" +
        "<tr><td>Sauce Caesar, sauce russe <span style='color:#6a6a6a'>(jaune pasteuris&eacute;)</span></td><td>&le; +4&nbsp;&deg;C</td><td><span class='hl'>J+3 (72&nbsp;h)</span></td></tr>" +
        "<tr><td>Coleslaw</td><td>&le; +4&nbsp;&deg;C</td><td><span class='hl'>J+2 &agrave; J+3</span></td></tr>" +
        "<tr><td>Pickles oignons / concombres <span style='color:#6a6a6a'>(milieu acide)</span></td><td>&le; +4&nbsp;&deg;C</td><td><span class='hl'>J+7</span></td></tr>" +
        "<tr><td>Frites blanchies / pr&ecirc;tes</td><td>&le; +4&nbsp;&deg;C</td><td><span class='hl'>J+1 &agrave; J+2</span></td></tr>" +
        "<tr><td>Garniture egg sandwich <span style='color:#6a6a6a'>(&oelig;uf cuit)</span></td><td>&le; +4&nbsp;&deg;C</td><td><span class='hl'>J+1</span></td></tr>" +
        "<tr><td>Mix machine &agrave; sundae <span style='color:#6a6a6a'>(lait pasteuris&eacute;)</span></td><td>dans la machine</td><td><span class='hl'>Quotidien</span></td></tr>" +
        "<tr><td>Produits du commerce entam&eacute;s</td><td>&le; +4&nbsp;&deg;C</td><td>Selon fabricant</td></tr>" +
      "</tbody></table>" +
      "<h3 class='bc'>La marche &agrave; suivre &mdash; la m&ecirc;me pour tout</h3>" +
      "<ul class='tidy'>" +
        "<li><strong>&Eacute;tiquette</strong> &agrave; chaque fabrication/ouverture&nbsp;: d&eacute;signation + date + DATE LIMITE.</li>" +
        "<li><strong>Conserver au froid</strong> (&le; +4&nbsp;&deg;C), contenant ferm&eacute;/film&eacute;.</li>" +
        "<li><strong>FIFO&nbsp;:</strong> on consomme d&#39;abord le plus ancien.</li>" +
        "<li><strong>&Agrave; la date limite ou au moindre doute &rarr; on jette.</strong> Jamais de prolongation &laquo;&nbsp;au nez&nbsp;&raquo;.</li>" +
        "<li>Jamais recongeler un produit d&eacute;congel&eacute; ; jamais remettre en froid un produit rest&eacute; trop longtemps &agrave; l&#39;air ambiant.</li>" +
      "</ul>" +
    "</section>"

  // Ch.10 - Allergènes
  var c10 =
    "<section class='chapter'>" +
      chead("10", "Allerg&egrave;nes", pictoAllerg()) +
      "<p>Les <strong>14 allerg&egrave;nes</strong> &agrave; d&eacute;claration (R&egrave;gl. UE 1169/2011, annexe II)&nbsp;:</p>" +
      "<div class='card' style='font-size:10pt'>gluten &middot; crustac&eacute;s &middot; &oelig;ufs &middot; poissons &middot; arachides &middot; soja &middot; lait &middot; fruits &agrave; coque &middot; c&eacute;leri &middot; moutarde &middot; s&eacute;same &middot; sulfites &middot; lupin &middot; mollusques</div>" +
      "<ul class='tidy'>" +
        "<li><strong>Information obligatoire</strong> du client, sur place <strong>et en ligne</strong> (Deliveroo / Uber Eats) &mdash; d&eacute;cret 2015-447.</li>" +
        "<li><strong>&Eacute;viter les contaminations crois&eacute;es&nbsp;:</strong> ustensile/plan propre pour un plat &laquo;&nbsp;sans&nbsp;&raquo;.</li>" +
        "<li>Se r&eacute;f&eacute;rer aux <strong>fiches</strong> pour r&eacute;pondre &mdash; jamais &laquo;&nbsp;je crois&nbsp;&raquo;.</li>" +
      "</ul>" +
    "</section>"

  // Ch.11 - Plan de nettoyage
  var c11 =
    "<section class='chapter'>" +
      chead("11", "Plan de nettoyage &amp; d&eacute;sinfection", pictoSpray()) +
      "<p><strong>Nettoyer</strong> = enlever les salissures &middot; <strong>D&eacute;sinfecter</strong> = d&eacute;truire les microbes. On respecte <strong>dose</strong> et <strong>temps de contact</strong>. On nettoie AVANT de d&eacute;sinfecter.</p>" +
      "<table><thead><tr><th>Usage</th><th>Type de produit</th><th style='width:42mm'>Normes</th></tr></thead><tbody>" +
        "<tr><td>Surfaces, plans, planches, machine sundae, armoires froides</td><td>D&eacute;tergent-d&eacute;sinfectant apte au <strong>contact alimentaire</strong></td><td><span class='hl'>EN 1276</span> + <span class='hl'>EN 13697</span></td></tr>" +
        "<tr><td>Vaisselle, ustensiles, contenants</td><td>Liquide lave-vaisselle <span style='color:#6a6a6a'>(Episaveurs)</span></td><td>Produit alimentaire</td></tr>" +
        "<tr><td>Hotte, friteuse, plaques</td><td>D&eacute;graissant cuisine (alcalin)</td><td>D&eacute;graissant alim.</td></tr>" +
        "<tr><td>Mains</td><td>Savon + gel/solution hydroalcoolique en compl&eacute;ment</td><td><span class='hl'>EN 1500</span></td></tr>" +
        "<tr><td>Sols</td><td>D&eacute;tergent sol</td><td>Pro</td></tr>" +
        "<tr><td>Sanitaires</td><td>D&eacute;sinfectant sanitaires</td><td>WC/sanitaires</td></tr>" +
      "</tbody></table>" +
      "<div class='tip'>Le gel hydroalcoolique <strong>ne remplace pas</strong> le lavage &agrave; l&#39;eau + savon. Consommables&nbsp;: gants nitrile <span style='color:#6a6a6a'>(Episaveurs)</span>, essuie-tout &agrave; usage unique <span style='color:#6a6a6a'>(Episaveurs/Foodflow)</span> &mdash; jamais de torchon r&eacute;utilis&eacute; pour les surfaces. Conserver fiches techniques + FDS. Consigner chaque op&eacute;ration sur la feuille de nettoyage du PMS.</div>" +
      "<h3 class='bc'>Protocole machine &agrave; sundae (quotidien)</h3>" +
      "<ul class='tidy'>" +
        "<li>Vidanger le mix (lait pasteuris&eacute;) en fin de service.</li>" +
        "<li>D&eacute;monter les pi&egrave;ces en contact (bec, joints, cuve selon notice).</li>" +
        "<li>Nettoyer puis d&eacute;sinfecter (contact alimentaire), respecter le temps de contact, rincer.</li>" +
        "<li>S&eacute;cher / remonter propre. Tracer. Suivre la notice du fabricant.</li>" +
      "</ul>" +
    "</section>"

  // Ch.12 - Fiches réflexe
  var c12 =
    "<section class='chapter'>" +
      chead("12", "Fiches r&eacute;flexe &mdash; que faire si&hellip;") +
      "<ul class='tidy'>" +
        "<li><strong>Panne / d&eacute;rive de froid&nbsp;:</strong> ne pas servir les produits sensibles, v&eacute;rifier depuis combien de temps, pr&eacute;venir Edward, transf&eacute;rer dans une enceinte conforme, noter. En cas de doute sur la dur&eacute;e &rarr; jeter.</li>" +
        "<li><strong>Produit douteux</strong> (odeur, aspect, texture, date d&eacute;pass&eacute;e)&nbsp;: on ne go&ucirc;te pas, on jette et on signale.</li>" +
        "<li><strong>Coupure/blessure&nbsp;:</strong> stopper, nettoyer, pansement bleu + gant, se laver les mains.</li>" +
        "<li><strong>Livraison non conforme&nbsp;:</strong> refuser le produit, noter, pr&eacute;venir Edward.</li>" +
        "<li><strong>Casse de verre / corps &eacute;tranger&nbsp;:</strong> &eacute;carter et jeter toutes les denr&eacute;es expos&eacute;es.</li>" +
        "<li><strong>Suspicion de TIAC</strong> (plusieurs clients malades)&nbsp;: pr&eacute;venir Edward imm&eacute;diatement, conserver les plats t&eacute;moins et produits suspects. D&eacute;claration obligatoire (L.3113-1 / D.3113-7 CSP).</li>" +
      "</ul>" +
    "</section>"

  // Ch.13 - Spécificités Meshuga
  var c13 =
    "<section class='chapter'>" +
      chead("13", "Sp&eacute;cificit&eacute;s Meshuga", pictoBin()) +
      "<ul class='tidy'>" +
        "<li><strong>Vente &agrave; distance</strong> (Deliveroo / Uber Eats + livraison)&nbsp;: maintenir les T&deg; jusqu&#39;&agrave; la remise au livreur (chaud &ge; +63&nbsp;&deg;C, froid &le; +4&nbsp;&deg;C) ; packaging propre et adapt&eacute; (DS Service, HPS), jamais r&eacute;utilis&eacute;/souill&eacute; ; allerg&egrave;nes accessibles en ligne.</li>" +
        "<li><strong>Salle</strong> (4 places)&nbsp;: propret&eacute; surfaces clients + sanitaires.</li>" +
        "<li><strong>D&eacute;chets / huiles&nbsp;:</strong> poubelles ferm&eacute;es vid&eacute;es r&eacute;guli&egrave;rement ; huiles usag&eacute;es &rarr; <strong>Quatra</strong> (jamais &agrave; l&#39;&eacute;vier), conserver les bons.</li>" +
        "<li><strong>Nuisibles&nbsp;:</strong> contrat <strong>La Science des Nuisibles</strong> ; signaler toute trace ; conserver les rapports. " + "<span style='display:inline-block;width:8mm;height:8mm;vertical-align:middle'>" + pictoMouse() + "</span></li>" +
      "</ul>" +
      "<div class='card'>" +
        "<h3 class='bc' style='margin-top:0'>Plat t&eacute;moin &mdash; B2B & &eacute;v&eacute;nements (Meshuga Events)</h3>" +
        "<p style='margin-bottom:0'>Pour toute prestation B2B/&eacute;v&eacute;nementielle&nbsp;: conserver un <strong>plat t&eacute;moin de chaque pr&eacute;paration servie</strong> &mdash; &eacute;chantillon repr&eacute;sentatif (~80&ndash;100&nbsp;g), film&eacute;, identifi&eacute; (intitul&eacute; + date), conserv&eacute; &agrave; <strong>0 / +3&nbsp;&deg;C pendant 5&nbsp;jours</strong> &agrave; la disposition exclusive des agents de contr&ocirc;le. <span style='color:#6a6a6a'>(Align&eacute; sur l&#39;arr&ecirc;t&eacute; du 21 d&eacute;cembre 2009.)</span></p>" +
      "</div>" +
    "</section>"

  // Ch.14 - Traçabilité & affichages
  var c14 =
    "<section class='chapter'>" +
      chead("14", "Tra&ccedil;abilit&eacute;, autocontr&ocirc;les &amp; affichages") +
      "<ul class='tidy'>" +
        "<li><strong>Tra&ccedil;abilit&eacute;</strong> (art.18 R&egrave;gl. 178/2002)&nbsp;: conserver bons de livraison, &eacute;tiquettes et n&deg; de lot (&laquo;&nbsp;un pas en amont&nbsp;&raquo;).</li>" +
        "<li><strong>Autocontr&ocirc;les&nbsp;:</strong> relev&eacute;s de temp&eacute;rature, &eacute;tiquetage, feuilles de nettoyage, bons huiles, rapports nuisibles &mdash; tout est consign&eacute; au PMS.</li>" +
        "<li><strong>Retrait/rappel</strong> (art.19)&nbsp;: produit dangereux retir&eacute;, Edward et autorit&eacute;s inform&eacute;s.</li>" +
      "</ul>" +
      "<div class='banner y'>Affichages obligatoires&nbsp;: allerg&egrave;nes (sur place + en ligne) &middot; origine des viandes &middot; interdiction de fumer/vapoter &middot; mention &laquo;&nbsp;Fait maison&nbsp;&raquo; si applicable.</div>" +
    "</section>"

  // Page de reconnaissance (base de l'attestation Étape B)
  var reco =
    "<section class='reco'>" +
      chead("15", "Engagement &amp; reconnaissance") +
      "<p>Je soussign&eacute;(e) <strong>" + esc(nomLigne) + "</strong>, salari&eacute;(e) de <strong>SAS AEGIA FOOD (Meshuga)</strong>, reconnais&nbsp;:</p>" +
      "<ul class='tidy'>" +
        "<li>avoir <strong>re&ccedil;u, lu et compris</strong> le pr&eacute;sent <em>Guide des bonnes pratiques d&#39;hygi&egrave;ne Meshuga</em> (version <strong>" + esc(version) + "</strong> du <strong>" + esc(dateStr) + "</strong>) ;</li>" +
        "<li>avoir b&eacute;n&eacute;fici&eacute; d&#39;une <strong>formation/sensibilisation interne &agrave; l&#39;hygi&egrave;ne alimentaire</strong> dispens&eacute;e par <strong>Edward Touret</strong>, formateur r&eacute;f&eacute;rent titulaire de la formation sp&eacute;cifique 14&nbsp;h (CNFSE, d&eacute;c. 2020 &ndash; janv. 2021), conform&eacute;ment au R&egrave;gl. (CE) 852/2004 (annexe II, chap. XII) ;</li>" +
        "<li>m&#39;<strong>engager &agrave; appliquer</strong> ces r&egrave;gles ;</li>" +
        "<li>avoir &eacute;t&eacute; inform&eacute;(e) que leur non-respect peut compromettre la s&eacute;curit&eacute; des consommateurs et constituer une faute.</li>" +
      "</ul>" +
      "<div class='sig'>" +
        "<div class='head'>Reconnaissance de formation hygi&egrave;ne</div>" +
        "<div class='id'>" + esc(nomLigne) + "</div>" +
        "<div class='body'>" +
          "<p class='faitline'>Fait &agrave; <strong>Paris</strong>, le <strong>" + esc(dateStr) + "</strong>.</p>" +
          "<div class='lines'>" +
            "<div class='sline'>Le salari&eacute; (lu et approuv&eacute;)</div>" +
            "<div class='sline'>Pour SAS AEGIA FOOD &mdash; Edward Touret</div>" +
          "</div>" +
        "</div>" +
      "</div>" +
      "<p style='font-size:9pt;color:#6a6a6a;margin-top:5mm'>Signature &eacute;lectronique du salari&eacute; (+ paraphe sur chaque page), horodatage et tra&ccedil;abilit&eacute; conserv&eacute;s (art. 1366-1367 C. civ. + eIDAS UE 910/2014). Document interne SAS AEGIA FOOD &mdash; conserv&eacute; au dossier RH et int&eacute;gr&eacute; au PMS.</p>" +
    "</section>"

  // =====================================================================
  // ASSEMBLAGE
  // =====================================================================
  var html =
    "<!DOCTYPE html>" +
    "<html lang='fr'>" +
    "<head>" +
      "<meta charset='utf-8'/>" +
      "<meta name='viewport' content='width=device-width, initial-scale=1.0, viewport-fit=cover'/>" +
      "<title>Guide d&#39;hygi&egrave;ne Meshuga" + (nomComplet ? " &mdash; " + esc(nomComplet) : "") + "</title>" +
      "<style>" + styles + "</style>" +
    "</head>" +
    "<body>" +
      cover +
      "<div class='sheet'>" +
        c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + c9 + c10 + c11 + c12 + c13 + c14 + reco +
      "</div>" +
    "</body>" +
    "</html>"

  return html
}
