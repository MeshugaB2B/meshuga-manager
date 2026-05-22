// ============================================================
// employerSignature.ts
// ============================================================
// Helper pour charger la signature électronique pré-enregistrée
// d'Edward (mandat permanent) depuis app_settings,
// et la rendre sous forme de bloc HTML pour insertion dans
// les PDFs de contrats / avenants.
//
// Sprint Y1 — Signature électronique custom
// ============================================================
//
// USAGE :
//   import { loadEmployerSignature, renderEmployerSignatureBlock } from "./employerSignature"
//
//   // Dans une API route serveur (Node.js runtime) :
//   var sig = await loadEmployerSignature()
//   var html = buildContract(contract, emp, vacs, logoUri, sig)
//
//   // Si pas de mandat actif → sig === null → fallback bloc "cachet" classique
//
// ⚠️ loadEmployerSignature ne doit être appelée QUE côté serveur
// (utilise SUPABASE_SERVICE_ROLE_KEY).
// renderEmployerSignatureBlock est universel (pas d'accès DB).
// ============================================================

import { createClient } from "@supabase/supabase-js"

// === Type exporté ===
export interface EmployerSignature {
  full_name: string
  png_base64: string
  svg: string
  active: boolean
  activated_at: string
  ip: string
  country: string
  consent_hash: string
  legal_text_version: string
  quality: string
  company_name: string
  company_siren: string
}

// === Loader serveur ===
// Retourne null si :
//   - les env vars Supabase manquent
//   - le mandat n'existe pas dans app_settings
//   - mandate_active !== true
//   - le PNG signature est absent
export async function loadEmployerSignature(): Promise<EmployerSignature | null> {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) {
    console.error("[loadEmployerSignature] Missing Supabase env vars")
    return null
  }
  try {
    var supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    var result = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "employer_signature")
      .maybeSingle()

    if (result.error) {
      console.error("[loadEmployerSignature] Supabase error:", result.error.message)
      return null
    }
    if (!result.data || !result.data.value) return null

    var v: any = result.data.value
    if (v.mandate_active !== true) return null
    if (!v.stylized_png) return null

    return {
      full_name: v.full_name || "",
      png_base64: v.stylized_png,
      svg: v.stylized_svg || "",
      active: true,
      activated_at: v.mandate_activated_at || "",
      ip: v.mandate_ip || "",
      country: v.mandate_country || "",
      consent_hash: v.consent_block_sha256 || "",
      legal_text_version: v.legal_text_version || "",
      quality: (v.signatory && v.signatory.quality) || "Président",
      company_name: (v.company && v.company.name) || "SAS AEGIA FOOD",
      company_siren: (v.company && v.company.siren) || "904 639 531",
    }
  } catch (err: any) {
    console.error("[loadEmployerSignature] Exception:", err.message)
    return null
  }
}

// === Helper : nettoie le prefixe data URI éventuel ===
function stripDataUri(s: string): string {
  if (!s) return ""
  return s.replace(/^data:image\/png;base64,/, "")
}

// === Helper : escape texte HTML ===
function esc(s: any): string {
  if (s === null || s === undefined) return ""
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// === Helper : format date FR courte (jj/mm/aaaa) ===
function fmtDate(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch (e) {
    return "—"
  }
}

// === Renderer du bloc signature employeur ===
// Sprint C3 v3 : bloc SYMÉTRIQUE avec le salarié — contient identité, signature
// Yellowtail rose, mention "Lu et approuvé", date, et cartouche audit compact intégré.
// Génère le contenu interne du <div class="sig-block"> (à partir de .sig-id).
//
// Si sig === null → renvoie le bloc fallback classique "cachet · SAS AEGIA"
// Si sig présente → renvoie le bloc complet avec données du mandat permanent
export function renderEmployerSignatureBlock(sig: EmployerSignature | null): string {
  // === Bloc .sig-id (identité juridique) — identique dans les deux cas ===
  var idBlock = ''
    + '<div class="sig-id">'
    + '<div class="name">AEGIA FOOD</div>'
    + '<div class="role">SAS AEGIA, Présidente<br>représentée par Edward TOURET, Président</div>'
    + '</div>'

  // === Fallback : pas de mandat actif ===
  if (!sig || !sig.active || !sig.png_base64) {
    return ''
      + idBlock
      + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé »</div>'
      + '<div class="sig-foot" style="display:flex;align-items:center;justify-content:center;gap:8px">'
      + '<span style="font-family:Yellowtail,cursive;font-size:14px;color:#FF82D7">cachet</span>'
      + '<span style="opacity:.5">·</span>'
      + '<span style="font-style:italic">SAS AEGIA</span>'
      + '</div>'
  }

  // === Bloc complet (mandat actif) ===
  var dActivated = fmtDate(sig.activated_at)
  var hashShort = sig.consent_hash ? sig.consent_hash.slice(0, 32) : "—"
  var mandateId = "MAND-MSH-" + (sig.activated_at ? sig.activated_at.slice(0, 10).replace(/-/g, "") : "PERM") + "-ET"

  // Zone signature + Lu et approuvé + date
  var signatureZone = ''
    + '<div style="text-align:center;padding:14px 12px 10px 12px;border-bottom:1px dotted #DDD;margin-bottom:8px">'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;color:#666;font-style:italic;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">Signature électronique apposée par mandat permanent</div>'
    + '<div style="font-family:Yellowtail,cursive;font-size:38px;color:#FF82D7;line-height:1;padding:6px 0">' + esc(sig.full_name) + '</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:10px;color:#191923;font-weight:700;margin-top:4px">« Lu et approuvé »</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:9px;color:#555;font-style:italic;margin-top:2px">Le ' + esc(dActivated) + ' — par mandat permanent</div>'
    + '</div>'

  // Cartouche audit compact (4 sections, 1 ligne chacune)
  var auditCompact = ''
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;line-height:1.55;color:#555;padding:0 14px 8px 14px">'
    + '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Identité du signataire</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:700">Nom :</strong> ' + esc(sig.full_name) + ' (' + esc(sig.quality) + ')</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:700">Identifiant :</strong> <span style="font-family:\'SF Mono\',Consolas,monospace;font-size:7px">' + esc(mandateId) + '</span></div>'
    + '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin:4px 0 3px 0;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Chaîne de délivrance</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:700">Mandat activé le :</strong> ' + esc(dActivated) + '</div>'
    + '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin:4px 0 3px 0;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Traçabilité technique</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:700">IP d\'activation :</strong> <span style="font-family:\'SF Mono\',Consolas,monospace;font-size:7px">' + esc(sig.ip) + '</span> (' + esc(sig.country) + ')</div>'
    + '<div style="font-weight:900;color:#FF82D7;font-size:7.5px;text-transform:uppercase;letter-spacing:0.6px;margin:4px 0 3px 0;padding-bottom:1px;border-bottom:0.5px solid #FFEB5A">Intégrité du mandat</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:700">Hash SHA-256 :</strong> <span style="font-family:\'SF Mono\',Consolas,monospace;font-size:7px;word-break:break-all">' + esc(hashShort) + '…</span></div>'
    + '<div style="margin-top:5px;padding-top:4px;border-top:1px dotted #DDD;font-size:7.5px;font-style:italic;color:#666">Force probante équivalente à signature manuscrite (art. 1366-1367 C. civ. + eIDAS UE 910/2014).</div>'
    + '</div>'

  var sigSpace = '<div class="sig-space" style="padding:0;display:block">' + signatureZone + auditCompact + '</div>'

  var sigFoot = ''
    + '<div class="sig-foot" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:9.5px">'
    + '<span style="font-weight:900">' + esc(sig.company_name) + '</span>'
    + '<span style="opacity:.5">·</span>'
    + '<span style="font-style:italic">' + esc(sig.full_name) + ', ' + esc(sig.quality) + '</span>'
    + '</div>'

  return idBlock + sigSpace + sigFoot
}

// === Renderer du bloc signature salarié (en attente de signature) ===
// Sprint C3 v3 : bloc SYMÉTRIQUE avec l'employeur. Le bloc contient un marker
// HTML unique <!--EMPLOYEE_SIGNATURE_PLACEHOLDER--> qui sera remplacé au moment
// de la signature par le route /api/sign/[token]/submit avec les vraies données.
export function renderEmployeeSignatureBlockEmpty(
  empPrenom: string,
  empNom: string,
  salarieRole: string,
  isFemale: boolean
): string {
  // Zone signature avec placeholder (sera remplacée au submit)
  var placeholderZone = ''
    + '<!--EMPLOYEE_SIGNATURE_PLACEHOLDER-->'
    + '<div style="text-align:center;padding:14px 12px 10px 12px;border-bottom:1px dotted #DDD;margin-bottom:8px;min-height:130px;display:flex;flex-direction:column;justify-content:center">'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;color:#666;font-style:italic;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px">Signature électronique du salarié</div>'
    + '<div style="font-family:Yellowtail,cursive;font-size:24px;color:#CCC;line-height:1;padding:6px 0;font-style:italic">en attente de signature</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:9px;color:#999;font-style:italic;margin-top:4px">Signature précédée de la mention « Lu et approuvé »</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:9px;color:#999;font-style:italic;margin-top:2px">Date : __ / __ / ____</div>'
    + '</div>'
    + '<div style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8.5px;color:#999;font-style:italic;padding:0 14px 8px 14px;text-align:center">Le cartouche d\'audit (identifiant, IP, horodatage, hash) apparaîtra ici après signature électronique du salarié.</div>'

  return ''
    + '<div class="sig-head">' + (isFemale ? "La Salariée" : "Le Salarié") + '</div>'
    + '<div class="sig-id">'
    + '<div class="name">' + esc(empPrenom || "") + ' ' + esc((empNom || "").toUpperCase()) + '</div>'
    + '<div class="role">' + esc(salarieRole || "&nbsp;") + '</div>'
    + '</div>'
    + '<div class="sig-space" style="padding:0;display:block">' + placeholderZone + '</div>'
    + '<div class="sig-foot" style="font-style:italic;color:#999">En attente de signature électronique</div>'
}
