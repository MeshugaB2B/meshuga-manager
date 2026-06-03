// ============================================================
// src/app/api/hr/hygiene-guide/preview/route.ts
// ============================================================
// Prévisualisation PDF du Guide des bonnes pratiques d'hygiène Meshuga.
// GET -> rend le PDF inline (ouvre dans le navigateur).
//
// Query params :
//   ?version=v5     -> mention de version sur la couverture / la reconnaissance
//   ?download=1     -> force le téléchargement (Content-Disposition: attachment)
//
// ⚠️ Cette route rend du PDF via Chrome headless (@sparticuz/chromium) :
//    elle DOIT figurer dans next.config.js -> outputFileTracingIncludes,
//    sinon "input directory .../bin does not exist" sur Vercel.
//
// SWC-safe : var partout, function(){}.
// ============================================================

import { NextResponse } from "next/server"
import { buildHygieneGuide } from "@/app/dashboard/rh/hygieneGuideBuilder"
import { htmlToPdfBuffer } from "@/lib/hr/pdf-render"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req) {
  try {
    var url = new URL(req.url)
    var version = url.searchParams.get("version") || "v5"
    var download = url.searchParams.get("download") === "1"

    // Guide générique (pas de salarié) : la page de reconnaissance affiche
    // le placeholder "[Civilité Prénom NOM]". (Étape B : on passera l'employé.)
    var html = buildHygieneGuide(null, { version: version })
    var pdf = await htmlToPdfBuffer(html)

    var fileName = "guide-hygiene-meshuga-" + version + ".pdf"
    var disposition = (download ? "attachment" : "inline") + "; filename=\"" + fileName + "\""

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: String((e && (e as any).message) || e) },
      { status: 500 }
    )
  }
}
