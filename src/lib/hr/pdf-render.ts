// ============================================================
// FILE PATH dans le repo :
//   src/lib/hr/pdf-render.ts
// ============================================================
// Rendu HTML -> PDF via puppeteer-core + @sparticuz/chromium (Chrome headless
// sur fonction Vercel Node). Chrome respecte le CSS @page (marges, paraphes
// @bottom-right, sauts de page) -> rendu fidèle au design Meshuga.
//
// Exports :
//   launchBrowser()                  -> instance Chrome (à réutiliser pour un lot)
//   renderPdf(browser, html)         -> Buffer PDF d'un HTML (réutilise le browser)
//   htmlToPdfBuffer(html)            -> Buffer PDF (lance + ferme un browser, one-shot)
//   injectMeshugaFonts(html)         -> embarque les @font-face base64 dans le <head>
//   fixParaphePlaceholder(html, ini) -> remplace "…/ en attente" par les vraies initiales
//
// SWC-safe : var partout, function(){}.
// ============================================================

import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"
import { ALL_MESHUGA_FONTFACES } from "@/lib/fonts"

export async function launchBrowser() {
  var executablePath = await chromium.executablePath()
  return await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath,
    headless: chromium.headless,
  })
}

export async function renderPdf(browser, html) {
  var page = await browser.newPage()
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 45000 })
    var pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    })
    return Buffer.from(pdf)
  } finally {
    try { await page.close() } catch (e) {}
  }
}

export async function htmlToPdfBuffer(html) {
  var browser = await launchBrowser()
  try {
    return await renderPdf(browser, html)
  } finally {
    try { await browser.close() } catch (e) {}
  }
}

// Embarque les polices Meshuga (Yellowtail, Arial Narrow, BILD...) en base64 dans
// le <head> pour un rendu PDF fidèle même sans polices système sur Vercel.
// (Le dossier de bienvenue les embarque déjà ; à utiliser pour avenants/contrats
//  dont le HTML ne charge que Yellowtail via lien Google Fonts.)
export function injectMeshugaFonts(html) {
  if (!html) return html
  var styleTag = "<style>" + ALL_MESHUGA_FONTFACES + "</style>"
  var lower = html.toLowerCase()
  var idx = lower.indexOf("<head>")
  if (idx !== -1) {
    return html.slice(0, idx + 6) + styleTag + html.slice(idx + 6)
  }
  var idx2 = lower.indexOf("<html")
  if (idx2 !== -1) {
    var close = html.indexOf(">", idx2)
    if (close !== -1) {
      return html.slice(0, close + 1) + "<head>" + styleTag + "</head>" + html.slice(close + 1)
    }
  }
  return styleTag + html
}

// Remplace UNIQUEMENT le côté salarié "en attente" dans le content CSS du paraphe
// (@bottom-right{content:"E.T.   /   en attente"}). Tolérant aux espaces. N'altère
// rien d'autre dans le document (ciblage strict via le content:"..." du paraphe).
export function fixParaphePlaceholder(html, salarieInitials) {
  if (!html || !salarieInitials) return html
  return html.replace(/(content\s*:\s*"[^"]*\/\s*)en attente(\s*")/g, "$1" + salarieInitials + "$2")
}
