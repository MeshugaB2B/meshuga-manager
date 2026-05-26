// ============================================================
// src/app/api/og/yellowtail/route.tsx
// ============================================================
// Endpoint Edge Runtime qui renvoie un PNG du texte demandé, rendu
// avec la font Yellowtail (Google Fonts, OFL).
//
// POURQUOI ?
//   Apple Mail, Gmail, Outlook et la plupart des clients email
//   bloquent les Google Fonts (via <link> ou @import) pour des
//   raisons de privacy/sécurité. Les emails de signature affichent
//   donc un fallback "cursive" dégueulasse au lieu de Yellowtail.
//
//   Solution : on génère un PNG côté serveur et on l'embarque comme
//   <img src=".../api/og/yellowtail?text=..."> dans les emails.
//   Les images sont toujours affichées correctement.
//
// USAGE depuis un email :
//   <img src="https://meshuga-manager.vercel.app/api/og/yellowtail
//             ?text=Signature%20reçue
//             &size=36
//             &color=FF82D7" />
//
// PARAMS :
//   ?text  (string)  : texte à rendre. URL-encoded. Default: "Meshuga".
//   ?size  (number)  : taille de la font en px. Default: 36.
//   ?color (string)  : couleur hex SANS #. Default: "FF82D7" (rose).
//   ?w     (number)  : largeur du canvas en px. Default: auto (basé sur text).
//   ?h     (number)  : hauteur du canvas en px. Default: size * 1.4.
//
// CACHE : 1 an (immutable) — les params définissent un PNG déterministe.
// ============================================================

import { ImageResponse } from "next/og"
import { YELLOWTAIL_TTF_B64 } from "@/lib/fonts/yellowtail-ttf"

export var runtime = "edge"

// Décode le base64 TTF UNE SEULE FOIS au boot du worker
var fontDataPromise: Promise<ArrayBuffer> | null = null
function getFontData(): Promise<ArrayBuffer> {
  if (fontDataPromise) return fontDataPromise
  fontDataPromise = (async function () {
    // Décodage base64 → Uint8Array compatible Edge Runtime (pas de Buffer)
    var binaryString = atob(YELLOWTAIL_TTF_B64)
    var len = binaryString.length
    var bytes = new Uint8Array(len)
    for (var i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i)
    return bytes.buffer as ArrayBuffer
  })()
  return fontDataPromise
}

// Estimation grossière de la largeur d'un texte Yellowtail à une taille donnée.
// Yellowtail est une font script italique avec ligatures, donc la mesure
// est approximative. Coefficient empirique ~0.55 par char à font-size 36px.
function estimateWidth(text: string, size: number): number {
  var coef = 0.58
  var minPad = 40
  return Math.ceil(text.length * size * coef) + minPad
}

export async function GET(request: Request): Promise<Response> {
  try {
    var url = new URL(request.url)

    var text = (url.searchParams.get("text") || "Meshuga").slice(0, 200)
    var sizeRaw = parseInt(url.searchParams.get("size") || "36", 10)
    var size = isNaN(sizeRaw) ? 36 : Math.max(12, Math.min(160, sizeRaw))

    var colorRaw = (url.searchParams.get("color") || "FF82D7").replace(/[^0-9a-fA-F]/g, "")
    var color = colorRaw.length === 6 || colorRaw.length === 3 ? "#" + colorRaw : "#FF82D7"

    var wParam = parseInt(url.searchParams.get("w") || "0", 10)
    var hParam = parseInt(url.searchParams.get("h") || "0", 10)

    var width = wParam > 0 ? Math.min(1200, wParam) : estimateWidth(text, size)
    var height = hParam > 0 ? Math.min(400, hParam) : Math.ceil(size * 1.5)

    var fontData = await getFontData()

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            fontFamily: "Yellowtail",
            color: color,
            fontSize: size,
            lineHeight: 1,
            padding: "8px 16px",
          }}
        >
          {text}
        </div>
      ),
      {
        width: width,
        height: height,
        fonts: [
          {
            name: "Yellowtail",
            data: fontData,
            style: "normal",
            weight: 400,
          },
        ],
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      }
    )
  } catch (err: any) {
    return new Response("Erreur génération image Yellowtail: " + (err && err.message ? err.message : "?"), {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }
}
