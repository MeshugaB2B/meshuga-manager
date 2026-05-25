// src/app/api/signatures/view/[token]/route.ts
// ============================================================
// Sprint C3 v3 — Visualisation inline des documents signés
// ============================================================
// Sert un document signé (avenant, contrat ou welcomepack) en mode
// inline pour qu'il s'affiche comme une vraie page web, avec une
// toolbar Meshuga par-dessus pour permettre l'impression en PDF.
//
// Pourquoi cette route ?
// Les signed URLs Supabase Storage servent les .html avec
//   Content-Disposition: attachment
// → le navigateur les télécharge ou les affiche en raw text.
// On remplace donc ces signed URLs (envoyées à Edward par email/SMS
// après chaque signature) par un lien vers cette route, qui :
//   - décode le token base64url { k, i, d }
//   - récupère signed_pdf_path en DB
//   - télécharge le HTML depuis le bucket hr-signatures
//   - le réémet avec Content-Type: text/html + Content-Disposition: inline
//   - injecte une toolbar rose Meshuga (Yellowtail + bouton "Télécharger en PDF")
//
// Token base64url payload :
//   { k: 'amendment' | 'contract', i: <entityId>, d: 'main' | 'welcomepack' }
//
// Pour 'welcomepack', le path est dérivé de signed_pdf_path :
//   amendments/<id>/<ts>_avenant.html       → ..._welcomepack.html
//   contracts/<id>/<ts>_contrat.html        → ..._welcomepack.html
// ============================================================

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"

// ============================================================
// === Helpers ================================================
// ============================================================

function escHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function decodeViewToken(token: string): { k: "amendment" | "contract"; i: string; d: "main" | "welcomepack" } | null {
  if (!token || typeof token !== "string" || token.length < 4) return null
  try {
    // base64url → base64 standard
    var b64 = token.replace(/-/g, "+").replace(/_/g, "/")
    // Padding
    while (b64.length % 4 !== 0) b64 += "="
    var json = Buffer.from(b64, "base64").toString("utf-8")
    var data: any = JSON.parse(json)
    if (!data) return null
    if (data.k !== "amendment" && data.k !== "contract") return null
    if (typeof data.i !== "string" || data.i.length < 8) return null
    if (data.d !== "main" && data.d !== "welcomepack") return null
    return { k: data.k, i: data.i, d: data.d }
  } catch (e) {
    return null
  }
}

function deriveWelcomePackPath(mainPath: string): string | null {
  if (!mainPath) return null
  if (/_avenant\.html$/.test(mainPath)) return mainPath.replace(/_avenant\.html$/, "_welcomepack.html")
  if (/_contrat\.html$/.test(mainPath)) return mainPath.replace(/_contrat\.html$/, "_welcomepack.html")
  return null
}

// Page d'erreur stylée Meshuga (au lieu d'un texte brut moche)
function errorPage(status: number, title: string, message: string): NextResponse {
  var html = ''
    + '<!DOCTYPE html><html lang="fr"><head>'
    + '<meta charset="utf-8"/>'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
    + '<title>' + escHtml(title) + ' — Meshuga</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet"/>'
    + '<style>'
    + '  html, body { margin:0; padding:0; height:100%; font-family:Helvetica,Arial,sans-serif; background:#FFEB5A; color:#191923 }'
    + '  .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px }'
    + '  .card { background:#FFFFFF; border-radius:12px; padding:36px 40px; max-width:480px; width:100%; text-align:center; box-shadow:0 4px 20px rgba(0,0,0,0.08) }'
    + '  .icon { font-size:48px; line-height:1; margin-bottom:8px }'
    + '  .title { font-family:Yellowtail,cursive; font-size:38px; color:#FF82D7; line-height:1; margin:0 0 14px 0 }'
    + '  .bar { width:60px; height:3px; background:#FFEB5A; margin:0 auto 18px auto }'
    + '  .msg { font-size:15px; line-height:1.6; color:#444; margin:0 0 24px 0 }'
    + '  .code { font-size:11px; color:#999; text-transform:uppercase; letter-spacing:1px }'
    + '</style>'
    + '</head><body>'
    + '<div class="wrap"><div class="card">'
    + '<div class="icon">⚠️</div>'
    + '<h1 class="title">' + escHtml(title) + '</h1>'
    + '<div class="bar"></div>'
    + '<p class="msg">' + escHtml(message) + '</p>'
    + '<div class="code">Erreur ' + status + '</div>'
    + '</div></div>'
    + '</body></html>'
  return new NextResponse(html, {
    status: status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}

// ============================================================
// === GET handler ============================================
// ============================================================
export async function GET(
  _req: Request,
  ctx: { params: { token: string } }
) {
  var token = ctx.params.token || ""
  var payload = decodeViewToken(token)
  if (!payload) {
    return errorPage(400, "Lien invalide", "Ce lien n'est pas valide ou a été altéré. Demande un nouveau lien depuis le dashboard Meshuga.")
  }

  var sb = createAdminClient()

  // === 1. Récupérer signed_pdf_path depuis la bonne table ===
  var targetTable = payload.k === "amendment" ? "hr_contract_amendments" : "hr_contracts"
  var resEntity = await sb
    .from(targetTable)
    .select("signed_pdf_path, signature_includes_welcome_pack, signature_status")
    .eq("id", payload.i)
    .maybeSingle()

  if (resEntity.error) {
    console.error("[signatures/view] DB error:", resEntity.error.message)
    return errorPage(500, "Erreur serveur", "Une erreur est survenue lors de la récupération du document.")
  }
  if (!resEntity.data) {
    return errorPage(404, "Document introuvable", "Le document demandé n'existe pas ou a été supprimé.")
  }
  if (!resEntity.data.signed_pdf_path) {
    return errorPage(404, "Document non signé", "Ce document n'a pas encore été signé. Le lien sera valide une fois la signature effectuée.")
  }

  // === 2. Calculer le path du fichier à servir ===
  var mainPath: string = resEntity.data.signed_pdf_path
  var filePath: string = mainPath
  var docTitle = payload.k === "amendment" ? "Avenant signé" : "Contrat signé"

  if (payload.d === "welcomepack") {
    var derived = deriveWelcomePackPath(mainPath)
    if (!derived) {
      return errorPage(404, "Dossier de bienvenue introuvable", "Le format de stockage de ce document ne permet pas de retrouver le dossier de bienvenue.")
    }
    filePath = derived
    docTitle = "Dossier de bienvenue signé"
  }

  // === 3. Télécharger le HTML depuis le bucket hr-signatures ===
  var resDownload = await sb.storage
    .from("hr-signatures")
    .download(filePath)

  if (resDownload.error || !resDownload.data) {
    var dlErrMsg = resDownload.error ? resDownload.error.message : "inconnue"
    console.error("[signatures/view] Download error:", dlErrMsg, "path=", filePath)
    return errorPage(404, "Fichier introuvable", "Le fichier signé est introuvable dans le coffre-fort. Contacte Edward si le problème persiste.")
  }

  var htmlBuffer = await resDownload.data.arrayBuffer()
  var htmlText = new TextDecoder("utf-8").decode(htmlBuffer)

  // === 4. Injecter la toolbar Meshuga au début du <body> ===
  // La toolbar est en position:fixed avec une réserve d'espace (spacer)
  // pour que le contenu original ne soit pas caché.
  var toolbarHtml = ''
    + '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet"/>'
    + '<div id="meshuga-view-toolbar" style="position:fixed;top:0;left:0;right:0;height:56px;background:#FF82D7;color:#FFFFFF;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-family:Helvetica,Arial,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,0.18);z-index:99999;box-sizing:border-box">'
    +   '<div style="display:flex;align-items:center;gap:12px;min-width:0">'
    +     '<div style="font-family:Yellowtail,cursive;font-size:26px;line-height:1;white-space:nowrap">Meshuga</div>'
    +     '<div style="width:1px;height:22px;background:rgba(255,255,255,0.4);flex-shrink:0"></div>'
    +     '<div style="font-size:13px;font-weight:700;letter-spacing:0.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(docTitle) + '</div>'
    +   '</div>'
    +   '<button type="button" onclick="window.print()" style="background:#FFEB5A;color:#191923;border:none;padding:10px 16px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;font-family:Helvetica,Arial,sans-serif;letter-spacing:0.3px;white-space:nowrap;flex-shrink:0">↓ Télécharger en PDF</button>'
    + '</div>'
    + '<style>'
    + '  @media print { #meshuga-view-toolbar, #meshuga-toolbar-spacer { display: none !important } }'
    + '  @media (max-width: 480px) {'
    + '    #meshuga-view-toolbar > div:first-child > div:nth-child(3) { display: none }'
    + '    #meshuga-view-toolbar button { padding: 9px 12px; font-size: 12px }'
    + '  }'
    + '</style>'
    + '<div id="meshuga-toolbar-spacer" style="height:56px"></div>'

  var wrapped = htmlText
  if (/<body[^>]*>/i.test(wrapped)) {
    wrapped = wrapped.replace(/(<body[^>]*>)/i, "$1" + toolbarHtml)
  } else {
    // Cas dégénéré : on préfixe quand même
    wrapped = toolbarHtml + wrapped
  }

  // === 5. Réémettre en inline ===
  return new NextResponse(wrapped, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      // Permettre window.print() et les iframes Yellowtail
      "Referrer-Policy": "no-referrer",
    },
  })
}
