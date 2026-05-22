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

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { buildAvenant } from "@/app/dashboard/rh/amendmentBuilder"
import { buildWelcomePack } from "@/app/dashboard/rh/welcomePackBuilder"
import { loadEmployerSignature } from "@/app/dashboard/rh/employerSignature"
import { markEmployeeWelcomePackSigned } from "@/app/dashboard/rh/employeeWelcomePack"
import { getInitials, buildParaphFooter } from "@/app/dashboard/rh/contractBuilders"
import { LOGO_PINK } from "@/app/dashboard/logos"
import { sendBrevoEmail } from "@/lib/brevo"
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

  // === Browser ===
  if (/Edg\/(\d+)/.test(ua)) {
    var edgM = ua.match(/Edg\/(\d+)/)
    browser = "Microsoft Edge" + (edgM ? " " + edgM[1] : "")
  }
  else if (/OPR\/(\d+)|Opera/.test(ua)) {
    var oprM = ua.match(/OPR\/(\d+)/)
    browser = "Opera" + (oprM ? " " + oprM[1] : "")
  }
  else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR/.test(ua)) {
    var chrM = ua.match(/Chrome\/(\d+)/)
    browser = "Google Chrome" + (chrM ? " " + chrM[1] : "")
  }
  else if (/Firefox\/(\d+)/.test(ua)) {
    var ffM = ua.match(/Firefox\/(\d+)/)
    browser = "Mozilla Firefox" + (ffM ? " " + ffM[1] : "")
  }
  else if (/Version\/(\d+).*Safari/.test(ua)) {
    var safM = ua.match(/Version\/(\d+)/)
    browser = "Safari" + (safM ? " " + safM[1] : "")
  }

  // === Device ===
  if (/iPhone|Android.*Mobile|Mobile.*Safari/.test(ua)) device = "Smartphone"
  else if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) device = "Tablette"
  else device = "Ordinateur"

  return { os: os, browser: browser, device: device }
}

// Geo-IP via ipapi.co (gratuit, sans clé, ~500 req/jour)
async function getIpGeo(ip: string): Promise<{ city: string; region: string; country: string; country_code: string } | null> {
  if (!ip || ip === "unknown" || ip === "127.0.0.1" || ip === "::1") return null
  // IPs privées : pas de geo
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|fc00:|fd00:)/.test(ip)) return null
  try {
    var ctrl = new AbortController()
    var to = setTimeout(function () { ctrl.abort() }, 3000)
    var res = await fetch("https://ipapi.co/" + encodeURIComponent(ip) + "/json/", { signal: ctrl.signal })
    clearTimeout(to)
    if (!res.ok) return null
    var data: any = await res.json()
    if (data.error) return null
    return {
      city: data.city || "",
      region: data.region || "",
      country: data.country_name || "",
      country_code: data.country || "",
    }
  } catch (e) {
    return null
  }
}

// ============================================================
// === Cartouche audit enrichi (HTML) =========================
// ============================================================
function buildAuditCartouche(opts: {
  signedFullName: string
  recipientEmail: string
  sentAt: Date | null
  viewedAt: Date | null
  signedAt: Date
  ip: string
  geo: { city: string; region: string; country: string; country_code: string } | null
  ua: { os: string; browser: string; device: string }
  userAgent: string
  hash: string
  consentText: string
  includeWelcomePack: boolean
  signatureId: string
}): string {
  var s = opts
  // Calculs durée
  var sentToSigned = s.sentAt ? (s.signedAt.getTime() - s.sentAt.getTime()) : -1
  var viewedToSigned = s.viewedAt ? (s.signedAt.getTime() - s.viewedAt.getTime()) : -1

  // Geo string
  var geoStr = "Non déterminée"
  if (s.geo) {
    var parts: string[] = []
    if (s.geo.city) parts.push(s.geo.city)
    if (s.geo.region && s.geo.region !== s.geo.city) parts.push(s.geo.region)
    if (s.geo.country) parts.push(s.geo.country)
    if (parts.length > 0) geoStr = parts.join(", ")
  }

  return ''
    + '<div class="audit-box">'
    +   '<div class="audit-box-title">Cartouche d\'audit de signature électronique</div>'
    +   '<h4>Identité du signataire</h4>'
    +   '<div class="audit-row"><span class="k">Nom du signataire :</span><span class="v">' + escHtml(s.signedFullName) + '</span></div>'
    +   '<div class="audit-row"><span class="k">Email du salarié :</span><span class="v">' + escHtml(s.recipientEmail || "—") + '</span></div>'
    +   '<div class="audit-row"><span class="k">Identifiant signature :</span><span class="v mono">' + escHtml(s.signatureId) + '</span></div>'

    +   '<h4>Chaîne de délivrance</h4>'
    + (s.sentAt
      ? '<div class="audit-row"><span class="k">Email envoyé le :</span><span class="v">' + escHtml(formatDateTimeFr(s.sentAt)) + ' (heure de Paris)</span></div>'
      : '<div class="audit-row"><span class="k">Email envoyé le :</span><span class="v">—</span></div>')
    + (s.viewedAt
      ? '<div class="audit-row"><span class="k">Document ouvert le :</span><span class="v">' + escHtml(formatDateTimeFr(s.viewedAt)) + ' (heure de Paris)</span></div>'
      : '<div class="audit-row"><span class="k">Document ouvert le :</span><span class="v">—</span></div>')
    +   '<div class="audit-row"><span class="k">Document signé le :</span><span class="v">' + escHtml(formatDateTimeFr(s.signedAt)) + ' (heure de Paris)</span></div>'
    + (sentToSigned > 0
      ? '<div class="audit-row"><span class="k">Délai envoi → signature :</span><span class="v">' + escHtml(formatDuration(sentToSigned)) + '</span></div>'
      : '')
    + (viewedToSigned > 0
      ? '<div class="audit-row"><span class="k">Temps de lecture :</span><span class="v">' + escHtml(formatDuration(viewedToSigned)) + '</span></div>'
      : '')

    +   '<h4>Traçabilité technique</h4>'
    +   '<div class="audit-row"><span class="k">Adresse IP :</span><span class="v mono">' + escHtml(s.ip) + '</span></div>'
    +   '<div class="audit-row"><span class="k">Localisation IP :</span><span class="v">' + escHtml(geoStr) + '</span></div>'
    +   '<div class="audit-row"><span class="k">Système :</span><span class="v">' + escHtml(s.ua.os) + '</span></div>'
    +   '<div class="audit-row"><span class="k">Navigateur :</span><span class="v">' + escHtml(s.ua.browser) + '</span></div>'
    +   '<div class="audit-row"><span class="k">Type d\'appareil :</span><span class="v">' + escHtml(s.ua.device) + '</span></div>'
    +   '<div class="audit-row"><span class="k">User-Agent complet :</span><span class="v mono">' + escHtml((s.userAgent || "").substring(0, 200)) + '</span></div>'

    +   '<h4>Intégrité du document</h4>'
    +   '<div class="audit-row"><span class="k">Empreinte SHA-256 :</span><span class="v mono">' + escHtml(s.hash) + '</span></div>'
    +   '<div class="audit-row"><span class="k">Documents signés :</span><span class="v">' + (s.includeWelcomePack ? "Avenant + Dossier de bienvenue Meshuga (13 pages)" : "Avenant uniquement") + '</span></div>'
    +   '<div class="audit-row"><span class="k">Consentement explicite :</span><span class="v">' + escHtml(s.consentText) + '</span></div>'

    +   '<div class="audit-legal">'
    +     'Signature électronique apposée conformément aux articles 1366 et 1367 du Code civil français et au Règlement (UE) n° 910/2014 (eIDAS). '
    +     'L\'écrit électronique a la même force probante que l\'écrit sur support papier (art. 1366 CC). '
    +     'Le procédé d\'identification utilisé — vérification de l\'email destinataire, capture de l\'adresse IP, de l\'horodatage et du User-Agent, calcul d\'empreinte SHA-256 du document — permet d\'authentifier le signataire et de garantir l\'intégrité du document (art. 1367 CC).'
    +   '</div>'
    + '</div>'
}

// ============================================================
// === Bloc signature visuel (Yellowtail rose) ================
// ============================================================
function buildSignatureBlock(signedFullName: string, signedAt: Date): string {
  return ''
    + '<div style="text-align:center; padding: 16px 0 6px 0;">'
    +   '<div style="font-family: Yellowtail, cursive; font-size: 42px; color: #FF82D7; line-height: 1; padding: 8px 0;">'
    +     escHtml(signedFullName)
    +   '</div>'
    +   '<div style="font-size: 9px; color: #555; font-style: italic; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; margin-top: 2px;">'
    +     'Signature électronique apposée le ' + escHtml(formatDateTimeFr(signedAt)) + ' (heure de Paris)'
    +   '</div>'
    + '</div>'
}

// ============================================================
// === Injection : signature + audit dans le HTML =============
// ============================================================
// Remplace la zone "Date : __ / __ / ____" par le bloc signature + cartouche audit.
// Si la zone n'est pas trouvée, ajoute avant </body>.
function injectSignatureAndAudit(originalHtml: string, signatureBlock: string, auditBox: string): string {
  var sigPlusAudit = signatureBlock + auditBox
  var dateLineRegex = /Date\s*:\s*_+\s*\/\s*_+\s*\/\s*_+/g
  if (dateLineRegex.test(originalHtml)) {
    return originalHtml.replace(dateLineRegex, sigPlusAudit)
  }
  return originalHtml.replace(/<\/body>/i, sigPlusAudit + "</body>")
}

// ============================================================
// === Injection : paraphes salarié ============================
// ============================================================
// Le builder a déjà inséré un bloc paraphFooter avec côté salarié vide
// (texte "paraphe" en italique gris). On le remplace par les vraies initiales.
function injectEmployeeParaphes(originalHtml: string, employerInitials: string, employeeInitials: string): string {
  var newFooter = buildParaphFooter(employerInitials, employeeInitials)
  // Remplacer le bloc <div class="paraph-footer">...</div> existant
  var paraphRegex = /<div class="paraph-footer">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/
  if (paraphRegex.test(originalHtml)) {
    return originalHtml.replace(paraphRegex, newFooter)
  }
  // Fallback : pas de bloc trouvé, on en ajoute un
  return originalHtml.replace(/<\/body>/i, newFooter + "</body>")
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

  // === 3. Charger l'avenant + contrat + salarié ===
  var sb = createAdminClient()
  var resAmendment = await sb
    .from("hr_contract_amendments")
    .select("*")
    .eq("signature_token", token)
    .maybeSingle()

  if (!resAmendment.data) {
    return NextResponse.json({ ok: false, error: "Token introuvable" }, { status: 404 })
  }
  var amendment: any = resAmendment.data
  if (amendment.signed_at || amendment.signature_status === "signed") {
    return NextResponse.json({ ok: false, error: "Ce document a déjà été signé" }, { status: 410 })
  }

  // Welcome pack inclus → consentement obligatoire
  var includeWp = amendment.signature_includes_welcome_pack === true
  if (includeWp && !consentWelcomePack) {
    return NextResponse.json({ ok: false, error: "Vous devez confirmer avoir lu et approuvé le Dossier de bienvenue" }, { status: 400 })
  }

  // Contrat parent
  var resContract = await sb.from("hr_contracts").select("*").eq("id", amendment.contract_id).maybeSingle()
  if (!resContract.data) {
    return NextResponse.json({ ok: false, error: "Contrat parent introuvable" }, { status: 404 })
  }
  var contract: any = resContract.data

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

  var avenantHtml = buildAvenant(amendment, contract, emp, vacs, LOGO_PINK, previousValues, employerSig)
  var welcomePackHtml = ""
  if (includeWp) {
    welcomePackHtml = buildWelcomePack(emp, contract, LOGO_PINK, employerSig)
  }

  // === 6. Calculer le hash SHA-256 du contenu original (intégrité) ===
  var originalContent = avenantHtml + "\n---SEPARATOR---\n" + welcomePackHtml
  var hash = createHash("sha256").update(originalContent, "utf8").digest("hex")

  // === 7. Données pour le cartouche audit + signature ID ===
  var signatureId = "MSH-" + signedAt.getFullYear() + "-" +
    String(amendment.amendment_number || 1).padStart(4, "0") + "-" +
    getInitials((emp.prenom || "") + " " + (emp.nom || ""))

  var consentText = includeWp
    ? "Lu et approuvé l'intégralité de l'avenant et du Dossier de bienvenue Meshuga (13 pages)"
    : "Lu et approuvé l'intégralité du document"

  var recipientEmail = amendment.signature_recipient_email || emp.email || ""

  var sentAtDate: Date | null = amendment.signature_sent_at ? new Date(amendment.signature_sent_at) : null
  var viewedAtDate: Date | null = amendment.signature_viewed_at ? new Date(amendment.signature_viewed_at) : null

  var signatureBlock = buildSignatureBlock(signedFullName, signedAt)
  var auditBox = buildAuditCartouche({
    signedFullName: signedFullName,
    recipientEmail: recipientEmail,
    sentAt: sentAtDate,
    viewedAt: viewedAtDate,
    signedAt: signedAt,
    ip: ip,
    geo: geo,
    ua: ua,
    userAgent: userAgent,
    hash: hash,
    consentText: consentText,
    includeWelcomePack: includeWp,
    signatureId: signatureId,
  })

  // === 8. Injecter signature + audit en dernière page + paraphes sur chaque page ===
  var employerInitials = (employerSig && employerSig.full_name) ? getInitials(employerSig.full_name) : "—"
  var employeeInitials = getInitials(signedFullName)

  var signedAvenantHtml = injectSignatureAndAudit(avenantHtml, signatureBlock, auditBox)
  signedAvenantHtml = injectEmployeeParaphes(signedAvenantHtml, employerInitials, employeeInitials)

  var signedWelcomePackHtml = ""
  if (includeWp) {
    signedWelcomePackHtml = injectSignatureAndAudit(welcomePackHtml, signatureBlock, auditBox)
    signedWelcomePackHtml = injectEmployeeParaphes(signedWelcomePackHtml, employerInitials, employeeInitials)
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
  var avenantPath = "amendments/" + amendment.id + "/" + timestamp + "_avenant.html"
  var wpPath = "amendments/" + amendment.id + "/" + timestamp + "_welcomepack.html"

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

  // === 11. UPDATE hr_contract_amendments ===
  var updateRes = await sb
    .from("hr_contract_amendments")
    .update({
      signed_at: signedAt.toISOString(),
      signature_signed_at: signedAt.toISOString(),
      signature_status: "signed",
      signature_audit_data: auditData,
      signature_pdf_hash: hash,
      signed_pdf_path: avenantPath,
      status: "signed",
    })
    .eq("id", amendment.id)

  if (updateRes.error) {
    console.error("[sign/submit] DB update error:", updateRes.error.message)
    return NextResponse.json({ ok: false, error: "Erreur lors de l'enregistrement de la signature" }, { status: 500 })
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

  // === 13. Email de confirmation ===
  if (recipientEmail) {
    var docLabel = "votre avenant au contrat de travail"
    if (amendment.amendment_type === "regularisation_welcome_pack") docLabel = "votre avenant de mise en conformité réglementaire"
    else if (amendment.amendment_type === "prolongation_duree") docLabel = "votre avenant de prolongation"
    else if (amendment.amendment_type === "augmentation_salaire") docLabel = "votre avenant de modification de rémunération"

    var civ = (emp.civilite || "").toLowerCase().trim()
    var isFemale = civ === "mme" || civ === "madame"
    var cher = isFemale ? "Chère" : "Cher"

    var subject = "✓ Signature confirmée — " + docLabel
    var bundleText = includeWp ? " ainsi que le Dossier de bienvenue Meshuga (13 pages)" : ""

    var htmlContent = ''
      + '<div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #191923;">'
      +   '<div style="font-family: Yellowtail, cursive; color: #FF82D7; font-size: 32px; line-height: 1;">Signature confirmée ✓</div>'
      +   '<div style="height: 3px; background: #FFEB5A; margin: 14px 0 22px 0;"></div>'
      +   '<p style="line-height: 1.6; font-size: 15px;">' + cher + ' ' + escHtml(emp.prenom || "") + ',</p>'
      +   '<p style="line-height: 1.6; font-size: 15px;">Nous accusons réception de votre signature électronique pour ' + docLabel + bundleText + '.</p>'
      +   '<div style="background: #FAFAFA; border-left: 4px solid #FF82D7; padding: 14px 18px; border-radius: 4px; margin: 18px 0; font-size: 13px; line-height: 1.6;">'
      +     '<div><strong>Identifiant signature :</strong> ' + escHtml(signatureId) + '</div>'
      +     '<div><strong>Nom du signataire :</strong> ' + escHtml(signedFullName) + '</div>'
      +     '<div><strong>Date et heure :</strong> ' + escHtml(formatDateTimeFr(signedAt)) + ' (heure de Paris)</div>'
      +     '<div><strong>Adresse IP :</strong> ' + escHtml(ip) + (geo && geo.country ? ' — ' + escHtml(geo.country) : '') + '</div>'
      +     '<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #EEE;"><strong>Empreinte SHA-256 :</strong></div>'
      +     '<div style="font-family: monospace; font-size: 10px; word-break: break-all;">' + escHtml(hash) + '</div>'
      +   '</div>'
      +   '<p style="line-height: 1.6; font-size: 14px;">Conformément aux articles 1366 et 1367 du Code civil et au Règlement européen eIDAS n° 910/2014, votre signature électronique a la même force probante qu\'une signature manuscrite. Le document signé est archivé de manière sécurisée et peut être produit en cas de litige.</p>'
      +   '<p style="line-height: 1.6; font-size: 14px;">Si vous souhaitez recevoir une copie du document signé, n\'hésitez pas à nous le demander en répondant à cet email.</p>'
      +   '<p style="line-height: 1.6; font-size: 14px; margin-top: 30px;">Toute l\'équipe Meshuga te remercie pour ta confiance.</p>'
      +   '<p style="line-height: 1.6; font-size: 14px;"><strong>Edward Touret</strong><br/>Président — SAS AEGIA, Présidente d\'AEGIA FOOD</p>'
      + '</div>'

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
