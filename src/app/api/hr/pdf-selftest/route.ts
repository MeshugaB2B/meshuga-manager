// ============================================================
// FILE PATH dans le repo :
//   src/app/api/hr/pdf-selftest/route.ts
// ============================================================
// Route JETABLE de validation du moteur HTML -> PDF.
// Objectif : vérifier que puppeteer-core + @sparticuz/chromium lancent
// bien Chrome headless sur Vercel et produisent un PDF qui respecte le
// CSS @page (marges A4, paraphe en bas-droite, couleurs printBackground).
//
// Utilisation : ouvrir https://meshuga-manager.vercel.app/api/hr/pdf-selftest
//   - Si un PDF s'affiche/se télécharge -> le moteur fonctionne, on peut
//     brancher le figeage des signatures + le backfill.
//   - Si une page JSON {ok:false, error:"..."} s'affiche -> le message dit
//     précisément ce qui a échoué (launch, executablePath, mémoire...).
//
// À SUPPRIMER une fois le moteur validé.
// SWC-safe : var partout, function(){}.
// ============================================================

import { NextResponse } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"
export var maxDuration = 60

function buildTestHtml() {
  // HTML minimal avec un @page (marges + paraphe bas-droite) et un bloc
  // de couleur (test printBackground). Pas de polices custom ici : on
  // valide d'abord le moteur, les polices embarquées viennent à l'étape suivante.
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>'
    + '@page{size:A4;margin:2.2cm 1.4cm 2.5cm 1.4cm;'
    + '@top-center{content:"MESHUGA - SELF TEST PDF";font-size:9px;color:#666;letter-spacing:1px}'
    + '@bottom-center{content:"Page " counter(page) " / " counter(pages);font-size:8.5px;color:#999}'
    + '@bottom-right{content:"E.T.   /   D.R.A.";font-size:13px;color:#FF82D7}'
    + '}'
    + 'body{font-family:Arial,sans-serif;color:#191923;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + 'h1{color:#FF82D7}'
    + '.box{background:#FFEB5A;border:2px solid #191923;box-shadow:3px 3px 0 #191923;padding:16px;margin:16px 0}'
    + '.pink{background:#FF82D7;color:#fff;padding:10px;font-weight:900}'
    + '.pagebreak{page-break-before:always}'
    + '</style></head><body>'
    + '<h1>Self-test moteur PDF</h1>'
    + '<div class="box">Si tu vois : marges A4, le paraphe rose <b>E.T. / D.R.A.</b> en bas a droite, '
    + 'le numero de page en bas au centre, et ce bloc <b>jaune</b> avec une ombre dure + le bandeau rose ci-dessous '
    + '(printBackground OK), alors le moteur fonctionne parfaitement.</div>'
    + '<div class="pink">Bandeau rose — test des couleurs d arriere-plan.</div>'
    + '<div class="pagebreak"></div>'
    + '<h1>Page 2</h1>'
    + '<p>Cette seconde page valide la pagination et que le paraphe rose se repete bien en bas-droite de chaque page.</p>'
    + '</body></html>'
}

export async function GET() {
  var browser = null
  try {
    var executablePath = await chromium.executablePath()
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    })

    var page = await browser.newPage()
    await page.setContent(buildTestHtml(), { waitUntil: "networkidle0" })

    var pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    })

    await browser.close()
    browser = null

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="meshuga-selftest.pdf"',
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    try { if (browser) await browser.close() } catch (e2) {}
    var msg = (e && e.message) ? e.message : String(e)
    return NextResponse.json({
      ok: false,
      error: msg,
      hint: "Si 'Could not find Chromium' ou erreur executablePath -> probleme @sparticuz/chromium. "
        + "Si timeout -> augmenter maxDuration/memoire. Si 'libnss' / shared lib -> version chromium incompatible avec le runtime Node de Vercel.",
    }, { status: 500 })
  }
}
