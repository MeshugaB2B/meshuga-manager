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
// Génère le contenu interne du <div class="sig-block"> pour la partie
// "Pour l'Employeur" (donc à partir de .sig-id jusqu'à .sig-foot).
//
// Si sig === null → renvoie le bloc fallback classique "cachet · SAS AEGIA"
// Si sig présente → renvoie le bloc avec PNG signature + cartouche audit
//
// NB : la structure .sig-block est inchangée (rows 48px 96px minmax(160px,1fr) 40px)
//       donc la mise en page existante n'est pas cassée.
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

  // === Bloc audit (mandat actif) ===
  var dActivated = fmtDate(sig.activated_at)
  var hashShort = sig.consent_hash ? sig.consent_hash.slice(0, 16) : "—"

  var sigSpace = ''
    + '<div class="sig-space" style="padding:10px 14px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px">'
    + '<span style="font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8.5px;color:#2c2c2c;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;text-align:center;margin-bottom:2px">Signature électronique apposée par mandat permanent</span>'
    // 🔥 Signature Yellowtail rose centrée (rendu via Google Fonts chargée dans wrapHtml)
    + '<span style="font-family:Yellowtail,cursive;font-size:44px;color:#FF82D7;line-height:1.1;display:block;text-align:center;margin:4px 0 8px;letter-spacing:0.5px">' + esc(sig.full_name) + '</span>'
    // 🔥 Cartouche audit : Helvetica Neue, structure label/valeur, couleurs foncées, aligné à gauche
    + '<div style="align-self:stretch;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;font-size:8px;color:#555;line-height:1.7;text-align:left;margin-top:2px">'
    + '<div><strong style="color:#2c2c2c;font-weight:600">Mandat permanent :</strong> activé le ' + esc(dActivated) + '</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:600">IP :</strong> ' + esc(sig.ip) + ' (' + esc(sig.country) + ')</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:600">Hash SHA-256 :</strong> <span style="font-family:\'SF Mono\',\'Consolas\',\'Courier New\',monospace;font-size:7.5px;color:#555">' + esc(hashShort) + '…</span></div>'
    + '<div><strong style="color:#2c2c2c;font-weight:600">Référence légale :</strong> art. 1367 C. civ. + eIDAS UE 910/2014, art. 25</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:600">Force probante :</strong> équivalente à la signature manuscrite (art. 1366 C. civ.)</div>'
    + '<div><strong style="color:#2c2c2c;font-weight:600">Audit trail :</strong> horodaté et conservé</div>'
    + '</div>'
    + '</div>'

  var sigFoot = ''
    + '<div class="sig-foot" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:9.5px">'
    + '<span style="font-weight:900">' + esc(sig.company_name) + '</span>'
    + '<span style="opacity:.5">·</span>'
    + '<span style="font-style:italic">' + esc(sig.full_name) + ', ' + esc(sig.quality) + '</span>'
    + '</div>'

  return idBlock + sigSpace + sigFoot
}

// === Renderer du bloc signature salarié (en attente de signature) ===
// Bloc fallback inchangé : zone vide pour signature manuscrite
// Sera surchargé en Phase D quand le salarié signe via /sign/[token]
export function renderEmployeeSignatureBlockEmpty(
  empPrenom: string,
  empNom: string,
  salarieRole: string,
  isFemale: boolean
): string {
  return ''
    + '<div class="sig-head">' + (isFemale ? "La Salariée" : "Le Salarié") + '</div>'
    + '<div class="sig-id">'
    + '<div class="name">' + esc(empPrenom || "") + ' ' + esc((empNom || "").toUpperCase()) + '</div>'
    + '<div class="role">' + esc(salarieRole || "&nbsp;") + '</div>'
    + '</div>'
    + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé »</div>'
    + '<div class="sig-foot">Date : __ / __ / ____</div>'
}
