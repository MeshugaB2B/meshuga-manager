// ============================================================
// FILE PATH dans le repo :
//   src/app/api/sign-attestation/[token]/submit/route.ts
// ============================================================
// Reçoit la signature du salarié pour le Guide d'hygiène :
//   1) vérifie le token (non déjà signé)
//   2) hash SHA-256 du document source (intégrité)
//   3) rend le PDF figé (signature Yellowtail + cartouche eIDAS + paraphes)
//   4) archive le PDF dans le bucket hr-employee-docs + crée la row
//      hr_employee_documents (visible dans le coffre-fort docs du salarié)
//   5) met à jour hr_attestations (signed + audit) et notifie Edward
//      (email Brevo + SMS Twilio).
// Même moteur que /api/sign/[token]/submit, isolé pour ne pas risquer
// le flux contrats/avenants.
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID, createHash } from "crypto"
import { launchBrowser, renderPdf, injectMeshugaFonts } from "@/lib/hr/pdf-render"
import { buildHygieneGuide } from "@/app/dashboard/rh/hygieneGuideBuilder"
import { sendBrevoEmail, buildEdwardSignatureNotifEmail } from "@/lib/brevo"
import { sendTwilioSms, normalizePhoneFR, buildEdwardSignatureNotifSms } from "@/lib/twilio"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

var DOC_LABEL = "Guide des bonnes pratiques d'hygiène"
var EDWARD_EMAIL = "edward@meshuga.fr"
var EDWARD_PHONE_FALLBACK = "+33658585801"
var EMP_BUCKET = "hr-employee-docs"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function appUrl() {
  var u =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://meshuga-manager.vercel.app"
  return u.replace(/\/+$/, "")
}

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

function parseUserAgent(ua: string): { os: string; browser: string; device: string } {
  var os = "Inconnu"
  var browser = "Inconnu"
  var device = "Ordinateur"
  if (!ua) return { os: os, browser: browser, device: device }

  if (/Windows NT 10/.test(ua)) os = "Windows 10/11"
  else if (/Windows NT/.test(ua)) os = "Windows"
  else if (/iPhone OS|iOS/.test(ua)) {
    var iosM = ua.match(/OS (\d+[_.]\d+)/)
    os = "iOS" + (iosM ? " " + iosM[1].replace("_", ".") : "")
  } else if (/iPad/.test(ua)) os = "iPadOS"
  else if (/Mac OS X (\d+[_.]\d+)/.test(ua)) {
    var macM = ua.match(/Mac OS X (\d+[_.]\d+)/)
    os = "macOS" + (macM ? " " + macM[1].replace("_", ".") : "")
  } else if (/Android (\d+)/.test(ua)) {
    var andM = ua.match(/Android (\d+)/)
    os = "Android" + (andM ? " " + andM[1] : "")
  } else if (/Linux/.test(ua)) os = "Linux"

  var bm: any = null
  if (/CriOS\/(\d+)/.test(ua)) { bm = ua.match(/CriOS\/(\d+)/); browser = "Google Chrome (iOS)" + (bm ? " " + bm[1] : "") }
  else if (/FxiOS\/(\d+)/.test(ua)) { bm = ua.match(/FxiOS\/(\d+)/); browser = "Mozilla Firefox (iOS)" + (bm ? " " + bm[1] : "") }
  else if (/EdgiOS\/(\d+)/.test(ua)) { bm = ua.match(/EdgiOS\/(\d+)/); browser = "Microsoft Edge (iOS)" + (bm ? " " + bm[1] : "") }
  else if (/Edg\/(\d+)/.test(ua)) { bm = ua.match(/Edg\/(\d+)/); browser = "Microsoft Edge" + (bm ? " " + bm[1] : "") }
  else if (/OPR\/(\d+)|Opera/.test(ua)) { bm = ua.match(/OPR\/(\d+)/); browser = "Opera" + (bm ? " " + bm[1] : "") }
  else if (/Chrome\/(\d+)/.test(ua) && !/Edg|OPR/.test(ua)) { bm = ua.match(/Chrome\/(\d+)/); browser = "Google Chrome" + (bm ? " " + bm[1] : "") }
  else if (/Firefox\/(\d+)/.test(ua)) { bm = ua.match(/Firefox\/(\d+)/); browser = "Mozilla Firefox" + (bm ? " " + bm[1] : "") }
  else if (/Version\/(\d+).*Safari/.test(ua)) { bm = ua.match(/Version\/(\d+)/); browser = "Safari" + (bm ? " " + bm[1] : "") }
  else if (/FBAN|FBAV|FB_IAB/.test(ua)) browser = "Facebook (navigateur in-app)"
  else if (/Instagram/.test(ua)) browser = "Instagram (navigateur in-app)"
  else if (/WhatsApp/.test(ua)) browser = "WhatsApp (navigateur in-app)"
  else if (/AppleWebKit/.test(ua) && /Mobile/.test(ua)) browser = "Safari / WebView (iOS)"
  else if (/AppleWebKit/.test(ua)) browser = "Navigateur WebKit"

  if (/iPhone|iPod|Android.*Mobile|Mobile.*Safari/.test(ua)) device = "Smartphone"
  else if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) device = "Tablette"
  else device = "Ordinateur"

  if (browser === "Inconnu" && ua) browser = "Non identifié (" + ua.slice(0, 60) + ")"
  if (os === "Inconnu" && ua) os = "Non identifié"
  return { os: os, browser: browser, device: device }
}

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
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|fc00:|fd00:)/.test(ip)) return null
  var d1 = await fetchJsonWithTimeout("https://ipapi.co/" + encodeURIComponent(ip) + "/json/", 3000)
  if (d1 && !d1.error && (d1.country_name || d1.country)) {
    return { city: d1.city || "", region: d1.region || "", country: d1.country_name || "", country_code: d1.country || "" }
  }
  var d2 = await fetchJsonWithTimeout("https://ipwho.is/" + encodeURIComponent(ip), 3000)
  if (d2 && d2.success !== false && (d2.country || d2.country_code)) {
    return { city: d2.city || "", region: d2.region || "", country: d2.country || "", country_code: d2.country_code || "" }
  }
  return null
}

export async function POST(req: Request, ctx: { params: { token: string } }) {
  try {
    var token = ctx.params.token
    var sb = getServerClient()
    if (!sb || !token) {
      return NextResponse.json({ ok: false, error: "Configuration manquante" }, { status: 500 })
    }

    var body: any = await req.json().catch(function () { return {} })
    var fullName = String(body.fullName || "").trim()
    var consent = body.consentDocument === true
    if (fullName.length < 3) {
      return NextResponse.json({ ok: false, error: "Nom complet requis" }, { status: 400 })
    }
    if (!consent) {
      return NextResponse.json({ ok: false, error: "Consentement requis" }, { status: 400 })
    }

    var attRes = await sb.from("hr_attestations").select("*").eq("signature_token", token).single()
    if (attRes.error || !attRes.data) {
      return NextResponse.json({ ok: false, error: "Document introuvable" }, { status: 404 })
    }
    var att: any = attRes.data
    if (att.signature_status === "signed" || att.signature_signed_at) {
      return NextResponse.json({ ok: true, alreadySigned: true })
    }

    var empRes = await sb.from("hr_employees").select("id, civilite, prenom, nom, email").eq("id", att.employee_id).single()
    if (empRes.error || !empRes.data) {
      return NextResponse.json({ ok: false, error: "Salarié introuvable" }, { status: 404 })
    }
    var emp: any = empRes.data

    var signedAt = new Date()
    var signedIso = signedAt.toISOString()
    var signatureId = randomUUID()
    var ip = getClientIp(req)
    var uaRaw = req.headers.get("user-agent") || ""
    var ua = parseUserAgent(uaRaw)
    var geo = await getIpGeo(ip)

    var empForBuilder = { civilite: emp.civilite, prenom: emp.prenom, nom: emp.nom, email: emp.email }

    // 1) HTML source -> hash d'intégrité (SHA-256)
    var sourceHtml = buildHygieneGuide(empForBuilder, { version: att.doc_version || "v5" })
    var hash = createHash("sha256").update(sourceHtml, "utf8").digest("hex")

    // 2) HTML signé (signature électronique + cartouche eIDAS + paraphes) -> PDF figé
    var signedHtml = buildHygieneGuide(empForBuilder, {
      version: att.doc_version || "v5",
      signature: {
        fullName: fullName,
        signedAtIso: signedIso,
        signatureId: signatureId,
        recipientEmail: att.signature_recipient_email || emp.email || "",
        sentAtIso: att.signature_sent_at || null,
        viewedAtIso: att.signature_viewed_at || null,
        ip: ip,
        geo: geo,
        ua: ua,
        hash: hash,
        consentText: "Lu et approuvé — coché à la signature",
      },
    })

    var pdfBuffer: Buffer | null = null
    try {
      var browser = await launchBrowser()
      try {
        var htmlForPdf = injectMeshugaFonts(signedHtml)
        pdfBuffer = await renderPdf(browser, htmlForPdf)
      } finally {
        try { await browser.close() } catch (e) {}
      }
    } catch (ePdf) {
      console.error("[sign-attestation/submit] PDF:", (ePdf && (ePdf as any).message) || ePdf)
      return NextResponse.json({ ok: false, error: "Erreur de génération du PDF signé" }, { status: 500 })
    }
    if (!pdfBuffer) {
      return NextResponse.json({ ok: false, error: "PDF vide" }, { status: 500 })
    }

    // 3) Archivage PDF dans hr-employee-docs
    var ts = signedIso.replace(/[:.]/g, "-")
    var pdfPath = att.employee_id + "/attestations/" + ts + "_guide_hygiene_signe.pdf"
    var up = await sb.storage.from(EMP_BUCKET).upload(pdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true })
    if (up.error) {
      console.error("[sign-attestation/submit] upload:", up.error.message)
      return NextResponse.json({ ok: false, error: "Erreur d'archivage du PDF" }, { status: 500 })
    }

    // 4) Row dans hr_employee_documents (coffre-fort docs du salarié)
    var employeeDocId: string | null = null
    try {
      var docIns = await sb
        .from("hr_employee_documents")
        .insert({
          employee_id: att.employee_id,
          doc_type: "attestation_hygiene",
          label: DOC_LABEL + " — signé le " + signedAt.toLocaleDateString("fr-FR"),
          file_path: pdfPath,
          mime_type: "application/pdf",
          size_bytes: pdfBuffer.length,
        })
        .select("id")
        .single()
      if (docIns && docIns.data) employeeDocId = docIns.data.id
    } catch (eDoc) {
      console.error("[sign-attestation/submit] doc insert non bloquant:", (eDoc && (eDoc as any).message) || eDoc)
    }

    // 5) Mise à jour hr_attestations
    var auditData = {
      signature_id: signatureId,
      full_name: fullName,
      signed_at: signedIso,
      sent_at: att.signature_sent_at || null,
      viewed_at: att.signature_viewed_at || null,
      ip: ip,
      geo: geo,
      user_agent: uaRaw,
      os: ua.os,
      browser: ua.browser,
      device: ua.device,
      hash_sha256: hash,
      consent: true,
      consent_text: "Lu et approuvé — coché à la signature",
      doc_type: "attestation_hygiene",
      doc_version: att.doc_version || "v5",
    }
    var upd = await sb
      .from("hr_attestations")
      .update({
        status: "signed",
        signature_status: "signed",
        signature_signed_at: signedIso,
        signature_audit_data: auditData,
        signature_pdf_hash: hash,
        signed_pdf_path: pdfPath,
        signed_uploaded_at: signedIso,
        employee_doc_id: employeeDocId,
      })
      .eq("id", att.id)
    if (upd.error) {
      console.error("[sign-attestation/submit] update:", upd.error.message)
      return NextResponse.json({ ok: false, error: "Erreur d'enregistrement de la signature" }, { status: 500 })
    }

    // === Notification Edward (email + SMS) — non bloquant ===
    try {
      var signedUrl = ""
      var su = await sb.storage.from(EMP_BUCKET).createSignedUrl(pdfPath, 60 * 60 * 24 * 7)
      if (su && su.data && su.data.signedUrl) signedUrl = su.data.signedUrl

      var notif = buildEdwardSignatureNotifEmail({
        signerFirstName: emp.prenom || "",
        signerLastName: emp.nom || "",
        documentTypeLabel: DOC_LABEL,
        includeWelcomePack: false,
        signedAt: signedIso,
        signedPdfUrl: signedUrl,
        signatureId: signatureId,
        pdfHash: hash,
      })
      await sendBrevoEmail({
        to: [{ email: EDWARD_EMAIL, name: "Edward Touret" }],
        subject: notif.subject,
        htmlContent: notif.htmlContent,
        textContent: notif.textContent,
        tags: ["signature-notif", "attestation-hygiene"],
      })

      var edwardPhone = normalizePhoneFR(process.env.EDWARD_NOTIFICATION_PHONE || EDWARD_PHONE_FALLBACK)
      if (edwardPhone) {
        await sendTwilioSms({
          to: edwardPhone,
          body: buildEdwardSignatureNotifSms({
            signerName: ((emp.prenom || "") + " " + (emp.nom || "")).trim(),
            documentLabel: DOC_LABEL,
            signedPdfUrl: signedUrl || appUrl() + "/dashboard",
          }),
        })
      }
      await sb.from("hr_attestations").update({ edward_notified_at: new Date().toISOString() }).eq("id", att.id)
    } catch (eNotif) {
      console.error("[sign-attestation/submit] notif non bloquant:", (eNotif && (eNotif as any).message) || eNotif)
    }

    return NextResponse.json({ ok: true, signedAt: signedIso })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e && (e as any).message) || "Erreur serveur" }, { status: 500 })
  }
}
