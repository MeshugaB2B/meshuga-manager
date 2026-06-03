// src/app/api/sign/[token]/submit/route.ts
// ============================================================
// Sprint C3 v2 — Finalisation de la signature électronique enrichie
// ============================================================
// Valide le token, génère le HTML signé final avec :
//   - Signature complète Yellowtail rose en dernière page (bloc identité salarié)
//   - Paraphes en bas à droite de chaque page imprimée
//   - Cartouche d'audit enrichi (email, IP, geo, OS, browser, device,
//     horodatages envoi/ouverture/signature, hash SHA-256, durée)
//   - Référence légale eIDAS + Code civil
// Calcule hash SHA-256, upload Storage, UPDATE DB, marque welcome pack signé,
// envoie un mail de confirmation avec BCC Edward.
//
// Conforme : art. 1366-1367 Code civil + Règlement (UE) 910/2014 (eIDAS).
// ============================================================
// Mise à jour 25/05/2026 :
//   - Section 11bis : les liens "Voir le document signé" envoyés à Edward
//     (email + SMS) passent maintenant par /api/signatures/view/[token]
//     au lieu de Supabase signed URLs (qui télécharge en HTML brut).
//   - Section 13 : l'email de confirmation au salarié est wrappé dans un
//     document HTML complet avec import Google Fonts Yellowtail (rendu
//     correct dans Apple Mail).
// ============================================================

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildAvenant } from "@/app/dashboard/rh/amendmentBuilder"
import { buildWelcomePack } from "@/app/dashboard/rh/welcomePackBuilder"
import { loadEmployerSignature } from "@/app/dashboard/rh/employerSignature"
import { markEmployeeWelcomePackSigned } from "@/app/dashboard/rh/employeeWelcomePack"
import { getInitials, buildParaphFooter, buildContract } from "@/app/dashboard/rh/contractBuilders"
import { LOGO_PINK } from "@/app/dashboard/logos"
import { launchBrowser, renderPdf, injectMeshugaFonts } from "@/lib/hr/pdf-render"
import { sendBrevoEmail, buildEdwardSignatureNotifEmail } from "@/lib/brevo"
import { sendTwilioSms, buildEdwardSignatureNotifSms, normalizePhoneFR } from "@/lib/twilio"
import { createHash } from "crypto"

export var runtime = "nodejs"

// ============================================================
// === Helpers ================================================
// ============================================================

function getClientIp(req: Request): string {
  var fwd = req.headers.get("x-forwarded-for")
  if (fwd) {
    var first = fwd.split(",")[0].trim()
    if (first) return first
  }
  var real = req.headers.get("x-real-ip")
  if (real) return real
  return "unknown"
}

function escHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDateTimeFr(d: Date): string {
  var dd = String(d.getDate()).padStart(2, "0")
  var mm = String(d.getMonth() + 1).padStart(2, "0")
  var yyyy = d.getFullYear()
  var hh = String(d.getHours()).padStart(2, "0")
  var min = String(d.getMinutes()).padStart(2, "0")
  var ss = String(d.getSeconds()).padStart(2, "0")
  return dd + "/" + mm + "/" + yyyy + " à " + hh + ":" + min + ":" + ss
}

function formatDateFr(d: Date): string {
  var dd = String(d.getDate()).padStart(2, "0")
  var mm = String(d.getMonth() + 1).padStart(2, "0")
  var yyyy = d.getFullYear()
  return dd + "/" + mm + "/" + yyyy
}

// Formate une durée en français (ex: "10h 43min 12s", "2j 5h", "47s")
function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "—"
  var secs = Math.floor(ms / 1000)
  var days = Math.floor(secs / 86400)
  secs = secs % 86400
  var hours = Math.floor(secs / 3600)
  secs = secs % 3600
  var mins = Math.floor(secs / 60)
  secs = secs % 60
  if (days > 0) return days + "j " + hours + "h " + mins + "min"
  if (hours > 0) return hours + "h " + mins + "min " + secs + "s"
  if (mins > 0) return mins + "min " + secs + "s"
  return secs + "s"
}

// Parse User-Agent pour OS / Browser / Device
function parseUserAgent(ua: string): { os: string; browser: string; device: string } {
  var os = "Inconnu"
  var browser = "Inconnu"
  var device = "Ordinateur"

  if (!ua) return { os: os, browser: browser, device: device }

  // === OS ===
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11"
  else if (/Windows NT/.test(ua)) os = "Windows"
  else if (/iPhone OS|iOS/.test(ua)) {
    var iosM = ua.match(/OS (\d+[_\.]\d+)/)
    os = "iOS" + (iosM ? " " + iosM[1].replace("_", ".") : "")
  }
  else if (/iPad/.test(ua)) os = "iPadOS"
  else if (/Mac OS X (\d+[_\.]\d+)/.test(ua)) {
    var macM = ua.match(/Mac OS X (\d+[_\.]\d+)/)
    os = "macOS" + (macM ? " " + macM[1].replace("_", ".") : "")
  }
  else if (/Android (\d+)/.test(ua)) {
    var andM = ua.match(/Android (\d+)/)
    os = "Android" + (andM ? " " + andM[1] : "")
  }
  else if (/Linux/.test(ua)) os = "Linux"

  // === Browser (inclut variantes iOS : CriOS/FxiOS/EdgiOS + navigateurs in-app) ===
  var bm = null
  if (/CriOS\/(\d+)/.test(ua)) { bm = ua.match(/CriOS\/(\d+)/); browser = "Google Chrome (iOS)" + (bm ? " " + bm[1] : "") }
  else if (/FxiOS\/(\d+)/.test(ua)) { bm = ua.match(/FxiOS\/(\d+)/); browser = "Mozilla Firefox (iOS)" + (bm ? " " + bm[1] : "") }
  else if (/EdgiOS\/(\d+)/.test(ua)) { bm = ua.match(/EdgiOS\/(\d+)/); browser = "Microsoft Edge (iOS)" + (bm ? " " + bm[1] : "") }
  else if (/Edg\/(\d+)/.test(ua)) { bm = ua.match(/Edg\/(\d+)/); browser = "Microsoft Edge" + (bm ? " " + bm[1] : "") }
  else if (/OPR\/(\d+)|Opera/.test(ua)) { bm = ua.match(/OPR\/(\d+)/); browser = "Opera" + (bm ? " " + bm[1] : "") }
  else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR/.test(ua)) { bm = ua.match(/Chrome\/(\d+)/); browser = "Google Chrome" + (bm ? " " + bm[1] : "") }
  else if (/Firefox\/(\d+)/.test(ua)) { bm = ua.match(/Firefox\/(\d+)/); browser = "Mozilla Firefox" + (bm ? " " + bm[1] : "") }
  else if (/Version\/(\d+).*Safari/.test(ua)) { bm = ua.match(/Version\/(\d+)/); browser = "Safari" + (bm ? " " + bm[1] : "") }
  // Navigateurs in-app (lien ouvert depuis une app)
  else if (/FBAN|FBAV|FB_IAB/.test(ua)) browser = "Facebook (navigateur in-app)"
  else if (/Instagram/.test(ua)) browser = "Instagram (navigateur in-app)"
  else if (/Line\//.test(ua)) browser = "LINE (navigateur in-app)"
  else if (/WhatsApp/.test(ua)) browser = "WhatsApp (navigateur in-app)"
  else if (/GSA\//.test(ua)) browser = "Google App (navigateur in-app)"
  // Safari / WebView iOS sans jeton "Version/" (cas in-app fréquent)
  else if (/AppleWebKit/.test(ua) && /Mobile/.test(ua)) browser = "Safari / WebView (iOS)"
  else if (/AppleWebKit/.test(ua)) browser = "Navigateur WebKit"

  // === Device ===
  if (/iPhone|iPod|Android.*Mobile|Mobile.*Safari/.test(ua)) device = "Smartphone"
  else if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) device = "Tablette"
  else device = "Ordinateur"

  // Repli : ne jamais laisser "Inconnu" sans information probante -> extrait d'UA brut.
  if (browser === "Inconnu" && ua) browser = "Non identifié (" + ua.slice(0, 60) + ")"
  if (os === "Inconnu" && ua) os = "Non identifié"

  return { os: os, browser: browser, device: device }
}

// Geo-IP avec repli sur 2 fournisseurs gratuits sans clé (ipapi.co puis ipwho.is).
async function fetchJsonWithTimeout(url: string, ms: number): Promise<any> {
  var ctrl = new AbortController()
  var to = setTimeout(function () { ctrl.abort() }, ms)
  try {
    var res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(to)
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    clearTimeout(to)
    return null
  }
}

async function getIpGeo(ip: string): Promise<{ city: string; region: string; country: string; country_code: string } | null> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return null
  // IPs privées : pas de geo
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|fc00:|fd00:)/.test(ip)) return null

  // Fournisseur 1 : ipapi.co
  var d1 = await fetchJsonWithTimeout("https://ipapi.co/" + encodeURIComponent(ip) + "/json/", 3000)
  if (d1 && !d1.error && (d1.country_name || d1.country)) {
    return {
      city: d1.city || "",
      region: d1.region || "",
      country: d1.country_name || "",
      country_code: d1.country || "",
    }
  }

  // Fournisseur 2 (repli) : ipwho.is
  var d2 = await fetchJsonWithTimeout("https://ipwho.is/" + encodeURIComponent(ip), 3000)
  if (d2 && d2.success !== false && (d2.country || d2.country_code)) {
    return {
      city: d2.city || "",
      region: d2.region || "",
      country: d2.country || "",
      country_code: d2.country_code || "",
    }
  }

  return null
}

// ============================================================
// === Bloc signature salarié complet (Yellowtail + audit compact)
// ============================================================
// Génère le contenu qui remplacera <!--EMPLOYEE_SIGNATURE_PLACEHOLDER--> et tout
// le bloc placeholder qui le suit, jusqu'à la fin du sig-space.
function buildEmployeeSignedBlock(opts: {
  signedFullName: string
  signedAt: Date
  signatureId: string
  recipientEmail: string
  sentAt: Date | null
  viewedAt: Date | null
  ip: string
  geo: { city: string; region: string; country: string; country_code: string } | null
  ua: { os: string; browser: string; device: string }
  hash: string
  consentText: string
  includeWelcomePack: boolean
}): string {
  var s = opts
  // Geo string
  var geoStr = "Non déterminée"
  if (s.geo) {
    var parts: string[] = []
    if (s.geo.city) parts.push(s.geo.city)
    if (s.geo.country) parts.push(s.geo.country)
    if (parts.length > 0) geoStr = parts.join(", ")
  }
  // Calculs durées
  var sentToSigned = s.sentAt ? formatDuration(s.signedAt.getTime() - s.sentAt.getTime()) : null
  var hashShort = s.hash ? s.hash.slice(0, 32) : "—"

  // Zone signature (Yellowtail + Lu et approuvé + date)
  var signatureZone = ''
    + '<div style="text-align:center;padding:14px 12px 10px 12px;border-bottom:1px dotted #DDD;margin-bottom:8px">'
    +   '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;color:#666;font-style:italic;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">Signature électronique du salarié</div>'
    +   '<div style="font-family:Yellowtail,cursive;font-size:38px;color:#FF82D7;line-height:1;padding:6px 0">' + escHtml(s.signedFullName) + '</div>'
    +   '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:10px;color:#191923;font-weight:700;margin-top:4px">« Lu et approuvé »</div>'
    +   '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:9px;color:#555;font-style:italic;margin-top:2px">Le ' + escHtml(formatDateTimeFr(s.signedAt)) + ' (heure de Paris)</div>'
    + '</div>'

  // Cartouche audit compact (4 sections, format identique à l'employeur)
  var auditCompact = ''
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;line-height:1.55;color:#555;padding:0 14px 8px 14px">'
    +   '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Identité du signataire</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Nom :</strong> ' + escHtml(s.signedFullName) + '</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Email :</strong> ' + escHtml(s.recipientEmail || "—") + '</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Identifiant :</strong> <span style="font-family:\'SF Mono\',Consolas,monospace;font-size:7px">' + escHtml(s.signatureId) + '</span></div>'

    +   '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin:4px 0 3px 0;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Chaîne de délivrance</div>'
    + (s.sentAt ? '<div><strong style="color:#2c2c2c;font-weight:700">Envoyé le :</strong> ' + escHtml(formatDateTimeFr(s.sentAt)) + '</div>' : '')
    + (s.viewedAt ? '<div><strong style="color:#2c2c2c;font-weight:700">Ouvert le :</strong> ' + escHtml(formatDateTimeFr(s.viewedAt)) + '</div>' : '')
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Signé le :</strong> ' + escHtml(formatDateTimeFr(s.signedAt)) + '</div>'
    + (sentToSigned ? '<div><strong style="color:#2c2c2c;font-weight:700">Délai :</strong> ' + escHtml(sentToSigned) + '</div>' : '')

    +   '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin:4px 0 3px 0;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Traçabilité technique</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">IP :</strong> <span style="font-family:\'SF Mono\',Consolas,monospace;font-size:7px">' + escHtml(s.ip) + '</span> (' + escHtml(geoStr) + ')</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Système :</strong> ' + escHtml(s.ua.os) + ' · ' + escHtml(s.ua.browser) + '</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Appareil :</strong> ' + escHtml(s.ua.device) + '</div>'

    +   '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin:4px 0 3px 0;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Intégrité du document</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Hash SHA-256 :</strong> <span style="font-family:\'SF Mono\',Consolas,monospace;font-size:7px;word-break:break-all">' + escHtml(hashShort) + '…</span></div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Documents :</strong> ' + (s.includeWelcomePack ? 'Avenant + Dossier de bienvenue' : 'Avenant') + '</div>'
    +   '<div><strong style="color:#2c2c2c;font-weight:700">Consentement :</strong> ' + escHtml(s.consentText) + '</div>'

    +   '<div style="margin-top:5px;padding-top:4px;border-top:1px dotted #DDD;font-size:7.5px;font-style:italic;color:#666">Force probante équivalente à signature manuscrite (art. 1366-1367 C. civ. + eIDAS UE 910/2014).</div>'
    + '</div>'

  return signatureZone + auditCompact
}

// ============================================================
// === Injection signature salarié (remplace marker + placeholder)
// ============================================================
// Cible le marker <!--EMPLOYEE_SIGNATURE_PLACEHOLDER--> et tout le contenu
// placeholder qui le suit, jusqu'au sig-foot. Remplace aussi le sig-foot
// "En attente de signature" par "Signé électroniquement le ...".
function injectEmployeeSignature(
  originalHtml: string,
  signedBlockHtml: string,
  signedDateLabel: string
): string {
  var html = originalHtml

  // 1. Remplacer le marker + tout le contenu placeholder jusqu'à la fermeture du sig-space
  var markerRegex = /<!--EMPLOYEE_SIGNATURE_PLACEHOLDER-->[\s\S]*?(?=<\/div>\s*<div class="sig-foot")/
  if (markerRegex.test(html)) {
    html = html.replace(markerRegex, signedBlockHtml)
  }

  // 2. Remplacer le sig-foot "En attente de signature électronique" du bloc salarié
  html = html.replace(
    /<div class="sig-foot" style="font-style:italic;color:#999">En attente de signature électronique<\/div>/,
    '<div class="sig-foot" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:9.5px;font-weight:700;color:#16A34A">✓ Signé électroniquement le ' + escHtml(signedDateLabel) + '</div>'
  )

  return html
}

// ============================================================
// === Injection : paraphes salarié ============================
// ============================================================
// Le builder a déjà inséré un bloc paraphFooter avec côté salarié vide
// (texte "paraphe" en italique gris). On le remplace par les vraies initiales.
function injectEmployeeParaphes(originalHtml: string, employerInitials: string, employeeInitials: string): string {
  var newFooter = buildParaphFooter(employerInitials, employeeInitials)
  // Le builder génère MAINTENANT 2 blocs consécutifs : .paraph-footer (flottant) puis .paraph-footer-inline (inline visible écran)
  // On les remplace ENSEMBLE par les nouveaux 2 blocs avec les vraies initiales.
  // Regex 1 : essaie de matcher les 2 blocs consécutifs (nouveau format)
  var bothRegex = /<div class="paraph-footer">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div class="paraph-footer-inline">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/
  if (bothRegex.test(originalHtml)) {
    return originalHtml.replace(bothRegex, newFooter)
  }
  // Regex 2 fallback : matche juste le bloc flottant (ancien format si docs déjà uploadés)
  var paraphRegex = /<div class="paraph-footer">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/
  if (paraphRegex.test(originalHtml)) {
    return originalHtml.replace(paraphRegex, newFooter)
  }
  // Fallback ultime : pas de bloc trouvé, on en ajoute un
  return originalHtml.replace(/<\/body>/i, newFooter + "</body>")
}

// ============================================================
// === Construction des URLs de visualisation inline ===========
// ============================================================
// Encode { k, i, d } en base64url et préfixe avec l'URL de l'app
// → /api/signatures/view/[token] sert le HTML signé inline avec une
//   toolbar Meshuga (logo + bouton "Télécharger en PDF").
function buildSignedDocViewUrl(opts: {
  entityKind: "amendment" | "contract"
  entityId: string
  docKind: "main" | "welcomepack"
}): string {
  var appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://meshuga-manager.vercel.app"
  var payload = { k: opts.entityKind, i: opts.entityId, d: opts.docKind }
  var token = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url")
  return appUrl + "/api/signatures/view/" + token
}

// ============================================================
// === POST handler ============================================
// ============================================================
export async function POST(
  req: Request,
  ctx: { params: { token: string } }
) {
  var token = ctx.params.token
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, error: "Lien invalide" }, { status: 400 })
  }

  // === 1. Body ===
  var body: any
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Body JSON invalide" }, { status: 400 })
  }
  var signedFullName = typeof body.fullName === "string" ? body.fullName.trim() : ""
  var consentDocument = body.consentDocument === true
  var consentWelcomePack = body.consentWelcomePack === true

  if (!signedFullName || signedFullName.length < 3) {
    return NextResponse.json({ ok: false, error: "Veuillez saisir vos nom et prénom complets" }, { status: 400 })
  }
  if (!consentDocument) {
    return NextResponse.json({ ok: false, error: "Vous devez confirmer avoir lu et approuvé le document" }, { status: 400 })
  }

  // === 2. IP + User-Agent + parsing ===
  var ip = getClientIp(req)
  var userAgent = req.headers.get("user-agent") || "unknown"
  var ua = parseUserAgent(userAgent)
  var signedAt = new Date()

  // === 3. Charger l'avenant OU le contrat + salarié ===
  // Le token peut référencer soit un avenant (table hr_contract_amendments)
  // soit un contrat direct (table hr_contracts). On cherche dans l'ordre :
  // d'abord avenants (cas le plus fréquent), puis contrats si pas trouvé.
  var sb = createAdminClient()

  var entityKind: "amendment" | "contract" = "amendment"
  var amendment: any = null
  var contract: any = null

  var resAmendment = await sb
    .from("hr_contract_amendments")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle()

  if (resAmendment.data) {
    // === Cas 1 : c'est un avenant ===
    entityKind = "amendment"
    amendment = resAmendment.data
    if (amendment.signed_at || amendment.signature_status === "signed") {
      return NextResponse.json({ ok: false, error: "Ce document a déjà été signé" }, { status: 410 })
    }
  } else {
    // === Cas 2 : pas trouvé en avenants → chercher dans contrats ===
    var resContractDirect = await sb
      .from("hr_contracts")
      .select("*")
      .eq("signature_token", token)
      .maybeSingle()
    if (!resContractDirect.data) {
      return NextResponse.json({ ok: false, error: "Token introuvable" }, { status: 404 })
    }
    entityKind = "contract"
    contract = resContractDirect.data
    if (contract.signature_signed_at || contract.signature_status === "signed") {
      return NextResponse.json({ ok: false, error: "Ce document a déjà été signé" }, { status: 410 })
    }
    // Pour le code commun, on crée un objet "amendment" virtuel (façade)
    // qui expose les mêmes champs que le code attend, mappés depuis le contrat.
    amendment = {
      id: contract.id,
      contract_id: contract.id,
      amendment_number: contract.contract_number || 1,
      amendment_type: "contract_initial", // marker spécial
      signature_token: contract.signature_token,
      signature_status: contract.signature_status,
      signature_recipient_email: contract.signature_recipient_email,
      signature_recipient_phone: contract.signature_recipient_phone,
      signature_sent_at: contract.signature_sent_at,
      signature_viewed_at: contract.signature_viewed_at,
      signature_includes_welcome_pack: contract.signature_includes_welcome_pack,
      changes: null, // pas de changes pour un contrat initial
    }
  }

  // Welcome pack inclus → consentement obligatoire
  var includeWp = amendment.signature_includes_welcome_pack === true
  if (includeWp && !consentWelcomePack) {
    return NextResponse.json({ ok: false, error: "Vous devez confirmer avoir lu et approuvé le Dossier de bienvenue" }, { status: 400 })
  }

  // Contrat parent (déjà chargé si entityKind === "contract")
  if (entityKind === "amendment") {
    var resContract = await sb.from("hr_contracts").select("*").eq("id", amendment.contract_id).maybeSingle()
    if (!resContract.data) {
      return NextResponse.json({ ok: false, error: "Contrat parent introuvable" }, { status: 404 })
    }
    contract = resContract.data
  }

  // employee_id (cycle fallback)
  var empId = contract.employee_id
  if (!empId && contract.cycle_id) {
    var resCyc = await sb.from("hr_employment_cycles")
      .select("employee_id").eq("id", contract.cycle_id).maybeSingle()
    empId = (resCyc.data && resCyc.data.employee_id) || null
  }
  if (!empId) {
    return NextResponse.json({ ok: false, error: "Salarié introuvable" }, { status: 404 })
  }

  var resEmp = await sb.from("hr_employees").select("*").eq("id", empId).maybeSingle()
  if (!resEmp.data) {
    return NextResponse.json({ ok: false, error: "Salarié introuvable" }, { status: 404 })
  }
  var emp: any = resEmp.data

  // === 4. Geo-IP (best-effort, non bloquant) ===
  var geo = await getIpGeo(ip)

  // === 5. Reconstruire le HTML original (avenant + welcomepack si inclus) ===
  var employerSig = await loadEmployerSignature()

  var resVacs = await sb.from("hr_contract_vacations")
    .select("*").eq("contract_id", contract.id).order("ordre", { ascending: true })
  var vacs = resVacs.data || []

  var previousValues: any = {}
  if (amendment.changes && typeof amendment.changes === "object") {
    Object.keys(amendment.changes).forEach(function (f) {
      var ch = amendment.changes[f]
      if (ch && ch.before !== undefined) previousValues[f] = ch.before
    })
  }

  // 🔧 Fix paraphes (v14) : refléter en mémoire la signature salarié EN COURS avant
  // de générer le HTML. Les builders dérivent les initiales du paraphe de ces champs ;
  // or l'UPDATE DB (signature_signed_at) n'a lieu qu'APRÈS la génération. Sans cette
  // mutation, le HTML archivé fige "en attente". Idempotent : on ne réécrit pas une
  // valeur déjà posée (utile aussi pour le backfill, où les rows ont déjà ces champs).
  var signedIso = signedAt.toISOString()
  amendment.signature_signed_at = amendment.signature_signed_at || signedIso
  amendment.signed_at = amendment.signed_at || signedIso
  amendment.signature_status = "signed"
  contract.signature_signed_at = contract.signature_signed_at || signedIso
  contract.signed_at = contract.signed_at || signedIso

  // Génération HTML du document brut selon le type d'entité
  var avenantHtml = ""
  if (entityKind === "amendment") {
    avenantHtml = buildAvenant(amendment, contract, emp, vacs, LOGO_PINK, previousValues, employerSig)
  } else {
    // Contrat initial : buildContract ne prend pas employerSig en paramètre.
    // Il est injecté plus tard via injectEmployeeSignature / Paraphes.
    avenantHtml = buildContract(contract, emp, vacs, LOGO_PINK)
  }
  var welcomePackHtml = ""
  if (includeWp) {
    welcomePackHtml = buildWelcomePack(emp, contract, LOGO_PINK, employerSig)
  }

  // === 6. Calculer le hash SHA-256 du contenu original (intégrité) ===
  var originalContent = avenantHtml + "\n---SEPARATOR---\n" + welcomePackHtml
  var hash = createHash("sha256").update(originalContent, "utf8").digest("hex")

  // === 7. Données pour le cartouche audit + signature ID ===
  // Avenant : MSH-{year}-{amendment_number}-{initials}
  // Contrat initial : MSH-CDI-{year}-{contract_number}-{initials}
  var signaturePrefix = entityKind === "amendment" ? "MSH-" : "MSH-CDI-"
  var signatureNumber = entityKind === "amendment"
    ? (amendment.amendment_number || 1)
    : (contract.contract_number || 1)
  var signatureId = signaturePrefix + signedAt.getFullYear() + "-" +
    String(signatureNumber).padStart(4, "0") + "-" +
    getInitials((emp.prenom || "") + " " + (emp.nom || ""))

  var docNoun = entityKind === "amendment" ? "l'avenant" : "le contrat de travail"
  var consentText = includeWp
    ? "Lu et approuvé l'intégralité de " + docNoun + " et du Dossier de bienvenue Meshuga"
    : "Lu et approuvé l'intégralité du document"

  var recipientEmail = amendment.signature_recipient_email || emp.email || ""

  var sentAtDate: Date | null = amendment.signature_sent_at ? new Date(amendment.signature_sent_at) : null
  var viewedAtDate: Date | null = amendment.signature_viewed_at ? new Date(amendment.signature_viewed_at) : null

  // 🔥 Sprint C3 v3 : un seul bloc complet (signature + audit compact) qui remplacera
  // le placeholder côté salarié. Le bloc employeur (généré par renderEmployerSignatureBlock)
  // reste tel quel — il a déjà sa propre signature et son cartouche audit symétrique.
  var employeeSignedBlock = buildEmployeeSignedBlock({
    signedFullName: signedFullName,
    signedAt: signedAt,
    signatureId: signatureId,
    recipientEmail: recipientEmail,
    sentAt: sentAtDate,
    viewedAt: viewedAtDate,
    ip: ip,
    geo: geo,
    ua: ua,
    hash: hash,
    consentText: consentText,
    includeWelcomePack: includeWp,
  })
  var signedDateLabel = formatDateTimeFr(signedAt) + " (heure de Paris)"

  // === 8. Injecter signature salarié + paraphes sur chaque page ===
  var employerInitials = (employerSig && employerSig.full_name) ? getInitials(employerSig.full_name) : "—"
  var employeeInitials = getInitials(signedFullName)

  // 🔧 v14 : les paraphes sont désormais gravés dans le CSS @page @bottom-right par les
  // builders (avec les bonnes initiales grâce à la mutation in-memory ci-dessus). On ne
  // patche donc plus le HTML a posteriori : injectEmployeeParaphes est mort (shim => "").
  var signedAvenantHtml = injectEmployeeSignature(avenantHtml, employeeSignedBlock, signedDateLabel)

  var signedWelcomePackHtml = ""
  if (includeWp) {
    signedWelcomePackHtml = injectEmployeeSignature(welcomePackHtml, employeeSignedBlock, signedDateLabel)
  }

  // === 9. Audit JSON pour la DB ===
  var auditData: any = {
    signature_id: signatureId,
    signed_full_name: signedFullName,
    signed_at: signedAt.toISOString(),
    sent_at: sentAtDate ? sentAtDate.toISOString() : null,
    viewed_at: viewedAtDate ? viewedAtDate.toISOString() : null,
    recipient_email: recipientEmail,
    ip: ip,
    geo: geo,
    user_agent: userAgent,
    parsed_ua: ua,
    accept_language: req.headers.get("accept-language") || "",
    hash_sha256: hash,
    consent_document: true,
    consent_welcome_pack: consentWelcomePack === true,
    consent_text: consentText,
    include_welcome_pack: includeWp,
    employer_signature: employerSig ? {
      full_name: employerSig.full_name,
      activated_at: employerSig.activated_at,
      ip: employerSig.ip,
    } : null,
    legal_basis: "Articles 1366-1367 du Code civil, Règlement (UE) n° 910/2014 (eIDAS)",
  }

  // === 10. Upload Storage hr-signatures/ ===
  var timestamp = signedAt.toISOString().replace(/[:.]/g, "-")
  var storageFolder = entityKind === "amendment" ? "amendments" : "contracts"
  var docFileSuffix = entityKind === "amendment" ? "_avenant.html" : "_contrat.html"
  var avenantPath = storageFolder + "/" + amendment.id + "/" + timestamp + docFileSuffix
  var wpPath = storageFolder + "/" + amendment.id + "/" + timestamp + "_welcomepack.html"

  var uploadAv = await sb.storage.from("hr-signatures").upload(
    avenantPath,
    new Blob([signedAvenantHtml], { type: "text/html; charset=utf-8" }),
    { contentType: "text/html; charset=utf-8", upsert: false }
  )
  if (uploadAv.error) {
    console.error("[sign/submit] Upload avenant error:", uploadAv.error.message)
    return NextResponse.json({ ok: false, error: "Erreur d'archivage du document signé" }, { status: 500 })
  }

  var uploadedWpPath: string | null = null
  if (includeWp) {
    var uploadWp = await sb.storage.from("hr-signatures").upload(
      wpPath,
      new Blob([signedWelcomePackHtml], { type: "text/html; charset=utf-8" }),
      { contentType: "text/html; charset=utf-8", upsert: false }
    )
    if (uploadWp.error) {
      console.error("[sign/submit] Upload welcomepack error:", uploadWp.error.message)
    } else {
      uploadedWpPath = wpPath
    }
  }

  // === 11. UPDATE selon le type d'entité ===
  var targetTable = entityKind === "amendment" ? "hr_contract_amendments" : "hr_contracts"
  var updatePayload: any = {
    signed_at: signedAt.toISOString(),
    signature_signed_at: signedAt.toISOString(),
    signature_status: "signed",
    signature_audit_data: auditData,
    signature_pdf_hash: hash,
    signed_pdf_path: avenantPath,
    signed_uploaded_at: signedAt.toISOString(),
    status: "signed",
  }
  var updateRes = await sb
    .from(targetTable)
    .update(updatePayload)
    .eq("id", amendment.id)

  if (updateRes.error) {
    console.error("[sign/submit] DB update error (" + targetTable + "):", updateRes.error.message)
    return NextResponse.json({ ok: false, error: "Erreur lors de l'enregistrement de la signature" }, { status: 500 })
  }

// ============================================================
  // 11ter. Archivage dans hr_contract_documents pour fiche RH
  // ============================================================
  // Le HTML signe est deja dans hr-signatures (preuve juridique).
  // On le copie aussi dans hr-contract-docs + on insere une row dans
  // hr_contract_documents pour qu'il apparaisse sur la fiche du salarie
  // (onglet Documents qui lit hr_contract_documents + bucket hr-contract-docs).
  // Non bloquant : si l'archivage plante, la signature reste valide.
  // ============================================================
  try {
    var docTypeForArchive = entityKind === "amendment" ? "avenant" : "contrat_signe"
    var docLabelForArchive = entityKind === "amendment"
      ? "Avenant signe du " + signedAt.toLocaleDateString("fr-FR")
      : "Contrat signe du " + signedAt.toLocaleDateString("fr-FR")

    var archivePath = (entityKind === "amendment" ? "amendments/" : "contracts/") +
      contract.id + "/" + timestamp + (entityKind === "amendment" ? "_avenant_signe.html" : "_contrat_signe.html")
    var blobSize = new Blob([signedAvenantHtml]).size

    // === Rendu PDF figé (Chrome headless), non bloquant ===
    // On rend le document signé en PDF et on renseigne assembled_pdf_path sur la row
    // hr_contract_documents : la route d'affichage sert alors le PDF figé (PDF-first),
    // plus jamais de HTML "vivant". Si le rendu echoue, assembled_pdf_path reste null
    // (fallback HTML) et la signature n'est pas impactee.
    var avenantPdfPath = null
    var wpPdfPath = null
    var pdfBrowser = null
    try {
      pdfBrowser = await launchBrowser()
      // Avenant/contrat : le HTML signe a deja les bons paraphes (mutation in-memory
      // des timestamps signes en amont). On embarque les polices pour un rendu fidele.
      var avHtmlForPdf = injectMeshugaFonts(signedAvenantHtml)
      var avPdf = await renderPdf(pdfBrowser, avHtmlForPdf)
      var avPdfStoragePath = (entityKind === "amendment" ? "amendments/" : "contracts/") +
        contract.id + "/" + timestamp + (entityKind === "amendment" ? "_avenant_signe.pdf" : "_contrat_signe.pdf")
      var avUp = await sb.storage.from("hr-contract-docs").upload(
        avPdfStoragePath,
        avPdf,
        { contentType: "application/pdf", upsert: true }
      )
      if (!avUp.error) avenantPdfPath = avPdfStoragePath
      else console.error("[sign/submit] Upload PDF avenant:", avUp.error.message)

      // Dossier de bienvenue : polices deja embarquees, paraphes deja OK -> rendu tel quel.
      if (includeWp && signedWelcomePackHtml) {
        var wpPdf = await renderPdf(pdfBrowser, signedWelcomePackHtml)
        var wpPdfStoragePath = contract.id + "/dossier_bienvenue/" + timestamp + "_dossier_bienvenue_signe.pdf"
        var wpUp = await sb.storage.from("hr-contract-docs").upload(
          wpPdfStoragePath,
          wpPdf,
          { contentType: "application/pdf", upsert: true }
        )
        if (!wpUp.error) wpPdfPath = wpPdfStoragePath
        else console.error("[sign/submit] Upload PDF dossier bienvenue:", wpUp.error.message)
      }
    } catch (ePdf: any) {
      console.error("[sign/submit] Rendu PDF fige non bloquant:", (ePdf && ePdf.message) || ePdf)
    } finally {
      try { if (pdfBrowser) await pdfBrowser.close() } catch (e) {}
    }

    var copyRes = await sb.storage.from("hr-contract-docs").upload(
      archivePath,
      new Blob([signedAvenantHtml], { type: "text/html; charset=utf-8" }),
      { contentType: "text/html; charset=utf-8", upsert: false }
    )
    if (copyRes.error) {
      console.error("[sign/submit] Archive hr-contract-docs error:", copyRes.error.message)
    } else {
      var insArchive = await sb.from("hr_contract_documents").insert({
        contract_id: contract.id,
        doc_type: docTypeForArchive,
        label: docLabelForArchive,
        file_path: archivePath,
        mime_type: "text/html; charset=utf-8",
        size_bytes: blobSize,
        assembled_pdf_path: avenantPdfPath,
        document_date: signedAt.toISOString().substring(0, 10),
        validated_by_user: true,
      })
      if (insArchive.error) {
        console.error("[sign/submit] Insert hr_contract_documents error:", insArchive.error.message)
      }
    }

    if (includeWp && uploadedWpPath && signedWelcomePackHtml) {
      // Convention identique a l'upload manuel via "Uploader le signe" dans EmployeeDetail.tsx
      // -> bucket "hr-contract-docs" + table "hr_contract_documents" avec contract_id
      // -> apparait dans la fiche RH du salarie (bloc Dossier de bienvenue)
      var archiveWpPath = contract.id + "/dossier_bienvenue/" + timestamp + "_dossier_bienvenue_signe.html"
      var wpBlobSize = new Blob([signedWelcomePackHtml]).size
      var copyWpRes = await sb.storage.from("hr-contract-docs").upload(
        archiveWpPath,
        new Blob([signedWelcomePackHtml], { type: "text/html; charset=utf-8" }),
        { contentType: "text/html; charset=utf-8", upsert: false }
      )
      if (copyWpRes.error) {
        console.error("[sign/submit] Archive WP hr-contract-docs error:", copyWpRes.error.message)
      } else {
        var insWp = await sb.from("hr_contract_documents").insert({
          contract_id: contract.id,
          doc_type: "dossier_bienvenue_signe",
          label: "Dossier de bienvenue signe du " + signedAt.toLocaleDateString("fr-FR"),
          file_path: archiveWpPath,
          mime_type: "text/html; charset=utf-8",
          size_bytes: wpBlobSize,
          assembled_pdf_path: wpPdfPath,
          document_date: signedAt.toISOString().substring(0, 10),
          validated_by_user: true,
        })
        if (insWp.error) {
          console.error("[sign/submit] Insert hr_contract_documents error:", insWp.error.message)
        }
      }
    }
  } catch (eArch: any) {
    console.error("[sign/submit] Archivage RH non bloquant exception:", (eArch && eArch.message) || eArch)
  }

  // ============================================================
  // 11bis. Notification Edward (email + SMS) avec liens viewer
  // ============================================================
  // Construit des URLs vers /api/signatures/view/[token] qui sert le
  // HTML signé inline avec une toolbar Meshuga (logo + "Télécharger en PDF").
  // Le token base64url encode { k: entityKind, i: amendment.id, d: docKind }.
  //
  // Avantage vs les Supabase signed URLs précédentes :
  //   - Le navigateur affiche le document au lieu de le télécharger en HTML brut
  //   - Pas d'expiration de 7 jours côté Storage : le viewer reste accessible
  //     tant que le fichier existe dans le bucket
  //   - URLs courtes et stables (idéal pour SMS qui doit tenir en 1 segment)
  // ============================================================
  try {
    var signedPdfUrl = buildSignedDocViewUrl({
      entityKind: entityKind,
      entityId: amendment.id,
      docKind: "main",
    })

    var signedWpUrl: string | null = null
    if (includeWp && uploadedWpPath) {
      signedWpUrl = buildSignedDocViewUrl({
        entityKind: entityKind,
        entityId: amendment.id,
        docKind: "welcomepack",
      })
    }

    // Construit le libellé du document selon le type d'entité
    var notifDocLabel = "Document à signer"
    if (entityKind === "amendment") {
      notifDocLabel = "Avenant au contrat de travail"
      if (amendment.amendment_type === "regularisation_welcome_pack") notifDocLabel = "Avenant d'actualisation contractuelle"
      else if (amendment.amendment_type === "prolongation_duree") notifDocLabel = "Avenant de prolongation"
      else if (amendment.amendment_type === "augmentation_salaire") notifDocLabel = "Avenant de modification de rémunération"
      else if (amendment.amendment_type === "modification_horaires") notifDocLabel = "Avenant de modification des horaires"
      else if (amendment.amendment_type === "changement_poste") notifDocLabel = "Avenant de changement de poste"
    } else {
      // Contrat initial : utiliser contract.type + statut_cadre + genre
      var civNotif = (emp.civilite || "").toLowerCase().trim()
      var isFemaleNotif = civNotif === "mme" || civNotif === "madame"
      var ct = (contract.type || "").toLowerCase()
      if (ct === "extra") notifDocLabel = "Contrat de travail (CDD d'usage)"
      else if (ct === "cdi_cadre") {
        notifDocLabel = contract.statut_cadre === "cadre"
          ? "Contrat de travail CDI Cadre"
          : "Contrat de travail CDI Agent de maîtrise"
      }
      else if (ct === "cdi_cuisinier") {
        notifDocLabel = isFemaleNotif ? "Contrat de travail CDI Cuisinière" : "Contrat de travail CDI Cuisinier"
      }
      else if (ct === "cdi_caissier") {
        notifDocLabel = isFemaleNotif ? "Contrat de travail CDI Caissière" : "Contrat de travail CDI Caissier"
      }
      else notifDocLabel = "Contrat de travail"
    }

    var signerFullName = ((emp.prenom || "") + " " + (emp.nom || "")).trim() || signedFullName

    // Notification email à Edward
    var edwardEmail = process.env.EDWARD_NOTIFICATION_EMAIL || "edward@meshuga.fr"
    var notifContent = buildEdwardSignatureNotifEmail({
      signerFirstName: emp.prenom || "",
      signerLastName: emp.nom || "",
      documentTypeLabel: notifDocLabel,
      includeWelcomePack: includeWp,
      signedAt: signedAt.toISOString(),
      signedPdfUrl: signedPdfUrl,
      signedWelcomePackUrl: signedWpUrl,
      signatureId: signatureId,
      pdfHash: hash,
    })
    // Ne pas await pour ne pas bloquer la réponse au salarié
    sendBrevoEmail({
      to: [{ email: edwardEmail, name: "Edward Touret" }],
      subject: notifContent.subject,
      htmlContent: notifContent.htmlContent,
      textContent: notifContent.textContent,
      replyTo: { email: edwardEmail, name: "Edward Touret" },
      tags: ["signature-notif-edward"],
    }).catch(function (e: any) {
      console.error("[sign/submit] Notif Edward email error:", e.message || e)
    })

    // Notification SMS à Edward (si numéro configuré)
    var edwardPhoneRaw = process.env.EDWARD_NOTIFICATION_PHONE || ""
    var edwardPhone = edwardPhoneRaw ? normalizePhoneFR(edwardPhoneRaw) : null
    if (edwardPhone) {
      var smsBody = buildEdwardSignatureNotifSms({
        signerName: signerFullName,
        documentLabel: notifDocLabel,
        signedPdfUrl: signedPdfUrl,
      })
      // Ne pas await
      sendTwilioSms({ to: edwardPhone, body: smsBody }).catch(function (e: any) {
        console.error("[sign/submit] Notif Edward SMS error:", e.message || e)
      })
    }

    // Marquer notifié (non bloquant)
    sb.from(targetTable)
      .update({ edward_notified_at: new Date().toISOString() })
      .eq("id", amendment.id)
      .then(function () {})
      .catch(function () {})

  } catch (e: any) {
    // Notif non bloquante : on log mais on ne fail pas la signature
    console.error("[sign/submit] Notif Edward exception non bloquante:", e.message || e)
  }

  // === 12. Marquer le welcome pack signé sur le salarié (si inclus) ===
  if (includeWp && uploadedWpPath) {
    try {
      await markEmployeeWelcomePackSigned({
        employeeId: empId,
        pdfPath: uploadedWpPath,
        audit: auditData,
        viaAmendmentId: amendment.id,
      })
    } catch (e: any) {
      console.error("[sign/submit] markEmployeeWelcomePackSigned non bloquant:", e.message || e)
    }
  }

  // === 13. Email de confirmation au salarié ====================
  // Wrappé dans un doc HTML complet avec <head> + Google Fonts Yellowtail
  // pour que Apple Mail rende correctement la signature manuscrite stylée
  // en rose. Outlook ne supporte pas Google Fonts mais reçoit le fallback
  // "cursive" via la system font.
  if (recipientEmail) {
    var docLabel = "votre document"
    if (entityKind === "amendment") {
      docLabel = "votre avenant au contrat de travail"
      if (amendment.amendment_type === "regularisation_welcome_pack") docLabel = "votre avenant d'actualisation contractuelle"
      else if (amendment.amendment_type === "prolongation_duree") docLabel = "votre avenant de prolongation"
      else if (amendment.amendment_type === "augmentation_salaire") docLabel = "votre avenant de modification de rémunération"
    } else {
      // Contrat initial
      var civConfirm = (emp.civilite || "").toLowerCase().trim()
      var isFemaleConfirm = civConfirm === "mme" || civConfirm === "madame"
      var ctConfirm = (contract.type || "").toLowerCase()
      if (ctConfirm === "extra") docLabel = "votre contrat de travail (CDD d'usage)"
      else if (ctConfirm === "cdi_cadre") {
        docLabel = contract.statut_cadre === "cadre"
          ? "votre contrat de travail CDI Cadre"
          : "votre contrat de travail CDI Agent de maîtrise"
      }
      else if (ctConfirm === "cdi_cuisinier") {
        docLabel = isFemaleConfirm ? "votre contrat de travail CDI Cuisinière" : "votre contrat de travail CDI Cuisinier"
      }
      else if (ctConfirm === "cdi_caissier") {
        docLabel = isFemaleConfirm ? "votre contrat de travail CDI Caissière" : "votre contrat de travail CDI Caissier"
      }
      else docLabel = "votre contrat de travail"
    }

    var civ = (emp.civilite || "").toLowerCase().trim()
    var isFemale = civ === "mme" || civ === "madame"
    var cher = isFemale ? "Chère" : "Cher"

    var subject = "✓ Signature confirmée — " + docLabel
    var bundleText = includeWp ? " ainsi que le Dossier de bienvenue Meshuga" : ""

    var htmlContent = ''
      + '<!DOCTYPE html>'
      + '<html lang="fr">'
      + '<head>'
      +   '<meta charset="utf-8"/>'
      +   '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'
      +   '<meta name="x-apple-disable-message-reformatting"/>'
      +   '<meta name="color-scheme" content="light only"/>'
      +   '<meta name="supported-color-schemes" content="light only"/>'
      +   '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">'
      +   '<title>' + escHtml(subject) + '</title>'
      +   '<style>'
      +     ':root { color-scheme: light only; supported-color-schemes: light only }'
      +     'body, table, td, p, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100% }'
      +     'img { -ms-interpolation-mode:bicubic; border:0; outline:none; display:block }'
      +     'body { margin:0 !important; padding:0 !important; width:100% !important; background:#FFFFFF }'
      +   '</style>'
      + '</head>'
      + '<body style="margin:0;padding:0;background:#FFFFFF;font-family:Helvetica,Arial,sans-serif;color:#191923">'
      +   '<div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #191923;">'
      +     '<div style="font-family: Yellowtail, cursive; color: #FF82D7; font-size: 32px; line-height: 1;">Signature confirmée ✓</div>'
      +     '<div style="height: 3px; background: #FFEB5A; margin: 14px 0 22px 0;"></div>'
      +     '<p style="line-height: 1.6; font-size: 15px;">' + cher + ' ' + escHtml(emp.prenom || "") + ',</p>'
      +     '<p style="line-height: 1.6; font-size: 15px;">Nous accusons réception de votre signature électronique pour ' + docLabel + bundleText + '.</p>'
      +     '<div style="background: #FAFAFA; border-left: 4px solid #FF82D7; padding: 14px 18px; border-radius: 4px; margin: 18px 0; font-size: 13px; line-height: 1.6;">'
      +       '<div><strong>Identifiant signature :</strong> ' + escHtml(signatureId) + '</div>'
      +       '<div><strong>Nom du signataire :</strong> ' + escHtml(signedFullName) + '</div>'
      +       '<div><strong>Date et heure :</strong> ' + escHtml(formatDateTimeFr(signedAt)) + ' (heure de Paris)</div>'
      +       '<div><strong>Adresse IP :</strong> ' + escHtml(ip) + (geo && geo.country ? ' — ' + escHtml(geo.country) : '') + '</div>'
      +       '<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #EEE;"><strong>Empreinte SHA-256 :</strong></div>'
      +       '<div style="font-family: monospace; font-size: 10px; word-break: break-all;">' + escHtml(hash) + '</div>'
      +     '</div>'
      +     '<p style="line-height: 1.6; font-size: 14px;">Conformément aux articles 1366 et 1367 du Code civil et au Règlement européen eIDAS n° 910/2014, votre signature électronique a la même force probante qu\'une signature manuscrite. Le document signé est archivé de manière sécurisée et peut être produit en cas de litige.</p>'
      +     '<p style="line-height: 1.6; font-size: 14px;">Si vous souhaitez recevoir une copie du document signé, n\'hésitez pas à nous le demander en répondant à cet email.</p>'
      +     '<p style="line-height: 1.6; font-size: 14px; margin-top: 30px;">Toute l\'équipe Meshuga te remercie pour ta confiance.</p>'
      +     '<p style="line-height: 1.6; font-size: 14px;"><strong>Edward Touret</strong><br/>Président — SAS AEGIA, Présidente d\'AEGIA FOOD</p>'
      +   '</div>'
      + '</body></html>'

    var textContent = "Signature confirmée\n\n" + cher + " " + (emp.prenom || "") + ",\n\n" +
      "Nous accusons réception de votre signature électronique pour " + docLabel + bundleText + ".\n\n" +
      "Identifiant signature : " + signatureId + "\n" +
      "Nom du signataire : " + signedFullName + "\n" +
      "Date et heure : " + formatDateTimeFr(signedAt) + " (heure de Paris)\n" +
      "Adresse IP : " + ip + "\n" +
      "Empreinte SHA-256 : " + hash + "\n\n" +
      "Conformément aux art. 1366-1367 Code civil et au Règlement eIDAS n° 910/2014, " +
      "votre signature électronique a la même force probante qu'une signature manuscrite.\n\n" +
      "Edward Touret\nPrésident — SAS AEGIA"

    try {
      await sendBrevoEmail({
        to: [{ email: recipientEmail, name: (emp.prenom || "") + " " + (emp.nom || "") }],
        bcc: [{ email: "edward@meshuga.fr", name: "Edward Touret" }],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
        replyTo: { email: "edward@meshuga.fr", name: "Edward Touret" },
        tags: ["signature-confirmed", "amendment"],
      })
    } catch (e: any) {
      console.error("[sign/submit] Email confirmation non bloquant:", e.message || e)
    }
  }

  // === 14. Succès ===
  return NextResponse.json(
    {
      ok: true,
      signedAt: signedAt.toISOString(),
      hash: hash,
      signatureId: signatureId,
      includeWelcomePack: includeWp,
    },
    { status: 200 }
  )
}
