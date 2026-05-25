// ============================================================
// src/app/api/signatures/view/[token]/route.ts
// ============================================================
// Endpoint de visualisation INLINE des documents signés.
//
// Pourquoi cette route existe :
//   1. Supabase Storage sert les fichiers HTML avec un mauvais
//      Content-Type, ce qui fait que le navigateur les télécharge
//      ou les affiche en texte brut (DOCTYPE visible).
//   2. Le HTML stocké contient des paraphes "E.T. / en attente"
//      au lieu de "E.T. / E.S." parce que injectEmployeeParaphes
//      cherche un <div class="paraph-footer"> qui n'existe pas
//      dans l'ancien builder (CSS Paged Media natif @bottom-right).
//      Cette route fait le remplacement A LA VOLEE.
//
// Token base64url décodé en JSON :
//   { k: "amendment" | "contract", i: <entityId>, d: "main" | "welcomepack" }
//
// Query params :
//   ?mode=print    -> pas de toolbar + autoprint au chargement
//                     (idéal pour bouton "Voir le dossier signé" en PDF direct)
//   ?mode=preview  -> (défaut) toolbar Meshuga + bouton "Télécharger en PDF"
//
// Logique de chemin :
//   - d = "main"         -> utilise entity.signed_pdf_path
//   - d = "welcomepack"  -> reconstruit depuis entity.signed_at + entity.id
//                          (le builder submit.ts upload toujours au pattern
//                          {folder}/{amendment.id}/{timestamp}_welcomepack.html)
// ============================================================

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"

// ============================================================
// === Helpers ================================================
// ============================================================

interface ViewTokenPayload {
  k: "amendment" | "contract"
  i: string
  d: "main" | "welcomepack"
}

function decodeToken(token: string): ViewTokenPayload | null {
  try {
    var json = Buffer.from(token, "base64url").toString("utf-8")
    var parsed: any = JSON.parse(json)
    if (!parsed || typeof parsed !== "object") return null
    if (parsed.k !== "amendment" && parsed.k !== "contract") return null
    if (!parsed.i || typeof parsed.i !== "string") return null
    if (parsed.d !== "main" && parsed.d !== "welcomepack") return null
    return { k: parsed.k, i: parsed.i, d: parsed.d }
  } catch (e) {
    return null
  }
}

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Reproduit getInitials() du contractBuilders côté serveur (no import client)
function getInitials(fullName: any): string {
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

function buildErrorPage(title: string, message: string): string {
  return ''
    + '<!DOCTYPE html><html lang="fr"><head>'
    + '<meta charset="utf-8"/>'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
    + '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">'
    + '<title>' + escapeHtml(title) + '</title>'
    + '<style>'
    +   'body{font-family:Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#FFEB5A;color:#191923;padding:20px;box-sizing:border-box}'
    +   '.box{background:#FFFFFF;padding:48px 40px;border-radius:14px;max-width:480px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.08)}'
    +   'h1{font-family:"Yellowtail",cursive;color:#FF82D7;font-size:46px;margin:0 0 6px 0;line-height:1}'
    +   '.sub{font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:18px}'
    +   'p{font-size:15px;line-height:1.55;color:#444;margin:0}'
    + '</style>'
    + '</head><body><div class="box">'
    + '<h1>' + escapeHtml(title) + '</h1>'
    + '<div class="sub">Meshuga · Document signé</div>'
    + '<p>' + escapeHtml(message) + '</p>'
    + '</div></body></html>'
}

function errorResponse(status: number, title: string, message: string): Response {
  return new Response(buildErrorPage(title, message), {
    status: status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    },
  })
}

// ============================================================
// === Patch des paraphes "en attente" dans le HTML stocké ====
// ============================================================
// Le HTML signé en prod contient encore "E.T.   /   en attente" car
// l'ancien builder utilise @page @bottom-right { content: "..." }
// et injectEmployeeParaphes() cherche un <div class="paraph-footer">
// qui n'existe pas dans ce format. On corrige ici à la volée.
//
// Pattern matché (avec espaces variables) :
//   content:"E.T.   /   en attente"
//   content:"E.T. / en attente"
//   content: "E.T.  /  en attente"
// ============================================================
function patchParaphes(html: string, employeeInitials: string): string {
  if (!employeeInitials || employeeInitials.length === 0) return html
  // Remplace toute occurrence de "/ en attente" (avec espaces variables) par "/ E.S."
  // Le séparateur "/" est conservé.
  var patched = html.replace(
    /\/\s+en\s+attente/gi,
    "/   " + employeeInitials
  )
  return patched
}

// ============================================================
// === Toolbar Meshuga (mode preview) =========================
// ============================================================
function injectToolbar(html: string, docKind: "main" | "welcomepack"): string {
  var label = docKind === "welcomepack" ? "Dossier de bienvenue signé" : "Document signé"

  var styleInject = '<style>'
    + '@import url("https://fonts.googleapis.com/css2?family=Yellowtail&display=swap");'
    + '@media screen { body { margin-top: 56px !important; } }'
    + '@media print { #__meshuga_viewer_toolbar { display: none !important; } body { margin-top: 0 !important; } }'
    + '#__meshuga_viewer_toolbar { position: fixed; top: 0; left: 0; right: 0; height: 56px; background: #FF82D7; color: #FFFFFF; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; z-index: 999999; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 2px 12px rgba(0,0,0,0.15); box-sizing: border-box; }'
    + '#__meshuga_viewer_toolbar .meshuga-brand-wrap { display: flex; align-items: center; gap: 10px; min-width: 0; }'
    + '#__meshuga_viewer_toolbar .meshuga-brand { font-family: "Yellowtail", cursive; font-size: 28px; line-height: 1; color: #FFFFFF; }'
    + '#__meshuga_viewer_toolbar .meshuga-sub { opacity: 0.92; font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
    + '#__meshuga_viewer_toolbar button { background: #FFFFFF; color: #FF82D7; border: none; padding: 9px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; font-family: Arial, Helvetica, sans-serif; transition: background 0.15s, color 0.15s; white-space: nowrap; }'
    + '#__meshuga_viewer_toolbar button:hover { background: #FFEB5A; color: #191923; }'
    + '@media screen and (max-width: 600px) { #__meshuga_viewer_toolbar { padding: 0 14px; } #__meshuga_viewer_toolbar .meshuga-sub { display: none; } #__meshuga_viewer_toolbar button { padding: 8px 14px; font-size: 12px; } }'
    + '</style>'

  var toolbarHtml = '<div id="__meshuga_viewer_toolbar">'
    + '<div class="meshuga-brand-wrap">'
    +   '<span class="meshuga-brand">Meshuga</span>'
    +   '<span class="meshuga-sub">— ' + escapeHtml(label) + '</span>'
    + '</div>'
    + '<button type="button" onclick="window.print()" aria-label="Telecharger en PDF">Telecharger en PDF</button>'
    + '</div>'

  var out = html

  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, styleInject + '</head>')
  } else {
    out = styleInject + out
  }

  if (/<body[^>]*>/i.test(out)) {
    out = out.replace(/<body([^>]*)>/i, '<body$1>' + toolbarHtml)
  } else {
    out = toolbarHtml + out
  }

  return out
}

// ============================================================
// === Mode print : autoprint silencieux ======================
// ============================================================
// Injecte un script qui attend le chargement complet (fonts incluses)
// puis déclenche window.print() automatiquement.
// Pas de toolbar visible : le HTML s'affiche brièvement puis le
// dialogue d'impression s'ouvre tout seul.
//
// Pourquoi le délai ? Les fonts Yellowtail viennent de Google Fonts
// (async). Sans attendre, le print peut capturer le texte avant que
// la font soit chargée -> rendu avec fallback Helvetica.
// ============================================================
function injectAutoprint(html: string): string {
  var styleInject = '<style>'
    + '@import url("https://fonts.googleapis.com/css2?family=Yellowtail&display=swap");'
    + '/* Cacher la toolbar HTML interne du builder qui dit "Imprimer en PDF" */'
    + '.toolbar { display: none !important; }'
    + '/* Le HTML signé peut contenir sa propre toolbar de print; on la cache */'
    + '@media print { .toolbar { display: none !important; } }'
    + '</style>'

  // Script autoprint :
  // 1. Attend que document.fonts soit ready (Yellowtail chargee)
  // 2. Attend 800ms supplementaires (rendering CSS Paged Media)
  // 3. window.print()
  // 4. Sur afterprint : tente window.close() (peut echouer si la fenetre
  //    n'a pas ete ouverte par script -> pas grave)
  var script = '<script>'
    + '(function(){'
    +   'function doPrint(){ try { window.print(); } catch(e) {} }'
    +   'function go(){ setTimeout(doPrint, 800); }'
    +   'if (document.fonts && document.fonts.ready && document.fonts.ready.then) {'
    +     'document.fonts.ready.then(go).catch(go);'
    +   '} else if (document.readyState === "complete") {'
    +     'go();'
    +   '} else {'
    +     'window.addEventListener("load", go);'
    +   '}'
    +   'window.addEventListener("afterprint", function(){ try { window.close(); } catch(e) {} });'
    + '})();'
    + '</script>'

  var out = html

  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, styleInject + '</head>')
  } else {
    out = styleInject + out
  }

  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, script + '</body>')
  } else {
    out = out + script
  }

  return out
}

// ============================================================
// === Resolution des initiales du salarie ====================
// ============================================================
// Cherche l'employee associe a l'entite (amendment ou contract)
// en passant par hr_contracts puis hr_employment_cycles si besoin.
// Retourne "" si introuvable (alors pas de patch des paraphes).
// ============================================================
async function resolveEmployeeInitials(sb: any, entity: any, entityKind: "amendment" | "contract"): Promise<string> {
  try {
    // Recupere le contract_id
    var contractId: string | null = null
    if (entityKind === "amendment") {
      contractId = entity.contract_id || null
    } else {
      contractId = entity.id || null
    }
    if (!contractId) return ""

    // Charge le contrat
    var resC = await sb.from("hr_contracts").select("employee_id, cycle_id").eq("id", contractId).maybeSingle()
    if (resC.error || !resC.data) return ""

    var employeeId: string | null = resC.data.employee_id || null

    // Fallback : via cycle (cas regularisation retroactive)
    if (!employeeId && resC.data.cycle_id) {
      var resCy = await sb.from("hr_employment_cycles").select("employee_id").eq("id", resC.data.cycle_id).maybeSingle()
      if (!resCy.error && resCy.data) {
        employeeId = resCy.data.employee_id || null
      }
    }
    if (!employeeId) return ""

    // Charge l'employee
    var resE = await sb.from("hr_employees").select("prenom, nom").eq("id", employeeId).maybeSingle()
    if (resE.error || !resE.data) return ""

    var fullName = ((resE.data.prenom || "") + " " + (resE.data.nom || "")).trim()
    return getInitials(fullName)
  } catch (e) {
    return ""
  }
}

// ============================================================
// === GET handler ============================================
// ============================================================
export async function GET(
  req: Request,
  ctx: { params: { token: string } }
) {
  var token = ctx.params.token
  if (!token || token.length < 4) {
    return errorResponse(400, "Lien invalide", "Le lien semble incomplet ou corrompu.")
  }

  // === 0. Lire le query param mode ===
  var mode = "preview"
  try {
    var url = new URL(req.url)
    var qMode = url.searchParams.get("mode")
    if (qMode === "print") mode = "print"
  } catch (e) {
    // ignore, on garde le defaut
  }

  // === 1. Decoder le token ===
  var payload = decodeToken(token)
  if (!payload) {
    return errorResponse(400, "Lien invalide", "Le lien n'est pas reconnu. Il a peut-etre ete tronque dans un email ou un SMS.")
  }

  // === 2. Charger l'entite depuis la DB ===
  var sb = createAdminClient()
  var table = payload.k === "amendment" ? "hr_contract_amendments" : "hr_contracts"

  var res = await sb.from(table).select("*").eq("id", payload.i).maybeSingle()
  if (res.error) {
    console.error("[signatures/view] DB read error (" + table + "):", res.error.message)
    return errorResponse(500, "Erreur serveur", "Impossible de charger le document. Veuillez reessayer dans quelques instants.")
  }
  if (!res.data) {
    return errorResponse(404, "Introuvable", "Ce document n'existe pas ou a ete supprime.")
  }

  var entity: any = res.data

  // === 3. Verifier que l'entite est signee ===
  var isSigned = entity.signature_status === "signed"
    || entity.signed_at
    || entity.signature_signed_at
  if (!isSigned) {
    return errorResponse(403, "Pas encore signe", "Ce document n'a pas encore ete signe. Le lien ne sera actif qu'apres la signature du salarie.")
  }

  // === 4. Determiner le chemin du fichier dans le bucket ===
  var filePath: string | null = null

  if (payload.d === "main") {
    filePath = entity.signed_pdf_path || null
    if (!filePath) {
      console.error("[signatures/view] signed_pdf_path manquant pour " + table + " id=" + payload.i)
      return errorResponse(404, "Fichier introuvable", "Le document signe n'a pas pu etre localise. Contactez Edward.")
    }
  } else {
    var includesWp = entity.signature_includes_welcome_pack === true
    if (!includesWp) {
      return errorResponse(404, "Pas de dossier", "Aucun dossier de bienvenue n'est associe a ce document.")
    }

    var signedAtIso = entity.signed_at || entity.signature_signed_at || null
    if (!signedAtIso) {
      return errorResponse(404, "Fichier introuvable", "Le dossier de bienvenue n'a pas pu etre localise.")
    }

    var timestamp = new Date(signedAtIso).toISOString().replace(/[:.]/g, "-")
    var folder = payload.k === "amendment" ? "amendments" : "contracts"
    filePath = folder + "/" + payload.i + "/" + timestamp + "_welcomepack.html"
  }

  // === 5. Telecharger le HTML depuis le bucket hr-signatures ===
  var dl = await sb.storage.from("hr-signatures").download(filePath)
  if (dl.error || !dl.data) {
    console.error("[signatures/view] Storage download error:", (dl.error && dl.error.message) || "no data", "path=" + filePath)
    return errorResponse(404, "Fichier introuvable", "Le document signe est inaccessible. Il a peut-etre ete deplace ou supprime.")
  }

  var rawHtml = ""
  try {
    rawHtml = await dl.data.text()
  } catch (e: any) {
    console.error("[signatures/view] Blob.text() error:", e && e.message)
    return errorResponse(500, "Erreur de lecture", "Le contenu du document est illisible.")
  }

  if (!rawHtml || rawHtml.length < 50) {
    return errorResponse(500, "Document vide", "Le document signe est vide ou corrompu. Contactez Edward.")
  }

  // === 6. Patcher les paraphes "en attente" -> initiales du salarie ===
  var employeeInitials = await resolveEmployeeInitials(sb, entity, payload.k)
  var patchedHtml = patchParaphes(rawHtml, employeeInitials)

  // === 7. Injecter selon le mode ===
  var finalHtml: string
  if (mode === "print") {
    finalHtml = injectAutoprint(patchedHtml)
  } else {
    finalHtml = injectToolbar(patchedHtml, payload.d)
  }

  return new Response(finalHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "no-referrer",
    },
  })
}
