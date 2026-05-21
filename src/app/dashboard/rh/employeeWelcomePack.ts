// ============================================================
// employeeWelcomePack.ts
// ============================================================
// Helper serveur pour gérer le statut "dossier de bienvenue signé"
// des salariés (table hr_employees).
//
// Sprint Y1 — Phase C — Sprint C1
//
// USAGE (côté serveur uniquement, route API Node.js) :
//
//   import {
//     getEmployeeWelcomePackStatus,
//     markEmployeeWelcomePackSigned,
//     updateEmployeeContactInfo,
//   } from "@/app/dashboard/rh/employeeWelcomePack"
//
//   // Avant envoi pour signature : check le statut
//   var status = await getEmployeeWelcomePackStatus(employeeId)
//   if (!status.welcome_pack_signed) {
//     // → bundle contrat + dossier de bienvenue
//   }
//
//   // Après signature électronique réussie (route POST sign/[token]/submit) :
//   await markEmployeeWelcomePackSigned({
//     employeeId,
//     pdfPath: "hr-signatures/welcome-pack/[employeeId]-[token].pdf",
//     audit: { token, ip, ua, hash, ... },
//     viaContractId,  // ou viaAmendmentId, jamais les 2
//   })
//
// ⚠️ Toutes ces fonctions utilisent SUPABASE_SERVICE_ROLE_KEY.
//    NE PAS importer côté client (React component).
// ============================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// === Type exporté : statut welcome pack d'un salarié ===
export interface EmployeeWelcomePackStatus {
  employee_id: string
  prenom: string
  nom: string
  civilite: string | null
  email: string | null
  telephone: string | null
  welcome_pack_signed: boolean
  welcome_pack_signed_at: string | null
  welcome_pack_signed_pdf_path: string | null
  welcome_pack_via_contract_id: string | null
  welcome_pack_via_amendment_id: string | null
}

// === Helper interne : crée un client Supabase server-side ===
function getServerClient(): SupabaseClient | null {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) {
    console.error("[employeeWelcomePack] Missing Supabase env vars")
    return null
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ============================================================
// getEmployeeWelcomePackStatus
// ============================================================
// Retourne le statut welcome pack + infos de contact d'un salarié.
//
// Retourne null si :
//   - env vars Supabase manquent
//   - employé introuvable
//
// Utilisé par :
//   - SendSignatureModal (avant envoi : check si bundle nécessaire)
//   - /api/contracts/[id]/send-signature (idem côté serveur)
//   - /api/sign/[token] (page publique : check si afficher 1 ou 2 docs)
// ============================================================
export async function getEmployeeWelcomePackStatus(
  employeeId: string
): Promise<EmployeeWelcomePackStatus | null> {
  if (!employeeId) {
    console.error("[getEmployeeWelcomePackStatus] employeeId manquant")
    return null
  }
  var supabase = getServerClient()
  if (!supabase) return null

  try {
    var result = await supabase
      .from("hr_employees")
      .select(
        "id, prenom, nom, civilite, email, telephone, " +
        "welcome_pack_signed, welcome_pack_signed_at, welcome_pack_signed_pdf_path, " +
        "welcome_pack_via_contract_id, welcome_pack_via_amendment_id"
      )
      .eq("id", employeeId)
      .maybeSingle()

    if (result.error) {
      console.error(
        "[getEmployeeWelcomePackStatus] Supabase error:",
        result.error.message
      )
      return null
    }
    if (!result.data) {
      console.warn("[getEmployeeWelcomePackStatus] Employé introuvable:", employeeId)
      return null
    }

    var d: any = result.data
    return {
      employee_id: d.id,
      prenom: d.prenom || "",
      nom: d.nom || "",
      civilite: d.civilite || null,
      email: d.email || null,
      telephone: d.telephone || null,
      welcome_pack_signed: d.welcome_pack_signed === true,
      welcome_pack_signed_at: d.welcome_pack_signed_at || null,
      welcome_pack_signed_pdf_path: d.welcome_pack_signed_pdf_path || null,
      welcome_pack_via_contract_id: d.welcome_pack_via_contract_id || null,
      welcome_pack_via_amendment_id: d.welcome_pack_via_amendment_id || null,
    }
  } catch (err: any) {
    console.error("[getEmployeeWelcomePackStatus] Exception:", err && err.message)
    return null
  }
}

// ============================================================
// markEmployeeWelcomePackSigned
// ============================================================
// Marque le dossier de bienvenue comme signé pour un salarié.
//
// VERROU ABSOLU : si le salarié a déjà welcome_pack_signed=true,
// on REFUSE l'opération (return false). Le dossier de bienvenue
// est one-shot à vie.
//
// Doit être appelé en transaction avec l'update du contrat/avenant
// dans /api/sign/[token]/submit (atomicité de la signature).
// ============================================================
export async function markEmployeeWelcomePackSigned(params: {
  employeeId: string
  pdfPath: string
  audit: Record<string, any>
  viaContractId?: string | null
  viaAmendmentId?: string | null
}): Promise<boolean> {
  var employeeId = params.employeeId
  var pdfPath = params.pdfPath
  var audit = params.audit
  var viaContractId = params.viaContractId || null
  var viaAmendmentId = params.viaAmendmentId || null

  if (!employeeId || !pdfPath || !audit) {
    console.error("[markEmployeeWelcomePackSigned] Paramètres manquants")
    return false
  }
  if (!viaContractId && !viaAmendmentId) {
    console.error("[markEmployeeWelcomePackSigned] viaContractId ou viaAmendmentId requis")
    return false
  }
  if (viaContractId && viaAmendmentId) {
    console.error("[markEmployeeWelcomePackSigned] viaContractId XOR viaAmendmentId (pas les 2)")
    return false
  }

  var supabase = getServerClient()
  if (!supabase) return false

  try {
    // 1. Vérifier que le salarié n'a pas déjà un dossier signé (verrou)
    var checkResult = await supabase
      .from("hr_employees")
      .select("welcome_pack_signed")
      .eq("id", employeeId)
      .maybeSingle()

    if (checkResult.error) {
      console.error(
        "[markEmployeeWelcomePackSigned] Check error:",
        checkResult.error.message
      )
      return false
    }
    if (!checkResult.data) {
      console.error("[markEmployeeWelcomePackSigned] Employé introuvable:", employeeId)
      return false
    }
    if (checkResult.data.welcome_pack_signed === true) {
      console.warn(
        "[markEmployeeWelcomePackSigned] Dossier déjà signé pour:",
        employeeId,
        "— refus du re-signing"
      )
      return false
    }

    // 2. UPDATE atomique
    var updatePayload: any = {
      welcome_pack_signed: true,
      welcome_pack_signed_at: new Date().toISOString(),
      welcome_pack_signed_pdf_path: pdfPath,
      welcome_pack_signature_audit: audit,
      welcome_pack_via_contract_id: viaContractId,
      welcome_pack_via_amendment_id: viaAmendmentId,
    }

    var updateResult = await supabase
      .from("hr_employees")
      .update(updatePayload)
      .eq("id", employeeId)
      .eq("welcome_pack_signed", false) // double sécurité : optimistic locking

    if (updateResult.error) {
      console.error(
        "[markEmployeeWelcomePackSigned] Update error:",
        updateResult.error.message
      )
      return false
    }

    return true
  } catch (err: any) {
    console.error("[markEmployeeWelcomePackSigned] Exception:", err && err.message)
    return false
  }
}

// ============================================================
// updateEmployeeContactInfo
// ============================================================
// Met à jour l'email et/ou le téléphone d'un salarié.
//
// Utilisé par SendSignatureModal quand Edward saisit l'email
// d'un salarié qui n'en avait pas — pour le sauvegarder une
// fois pour toutes et ne plus avoir à le redemander.
// ============================================================
export async function updateEmployeeContactInfo(params: {
  employeeId: string
  email?: string | null
  telephone?: string | null
}): Promise<boolean> {
  var employeeId = params.employeeId
  if (!employeeId) {
    console.error("[updateEmployeeContactInfo] employeeId manquant")
    return false
  }

  var payload: any = {}
  if (typeof params.email === "string" && params.email.trim() !== "") {
    payload.email = params.email.trim().toLowerCase()
  }
  if (typeof params.telephone === "string" && params.telephone.trim() !== "") {
    payload.telephone = params.telephone.trim()
  }
  if (Object.keys(payload).length === 0) {
    console.warn("[updateEmployeeContactInfo] Rien à mettre à jour")
    return false
  }

  var supabase = getServerClient()
  if (!supabase) return false

  try {
    var result = await supabase
      .from("hr_employees")
      .update(payload)
      .eq("id", employeeId)

    if (result.error) {
      console.error(
        "[updateEmployeeContactInfo] Update error:",
        result.error.message
      )
      return false
    }
    return true
  } catch (err: any) {
    console.error("[updateEmployeeContactInfo] Exception:", err && err.message)
    return false
  }
}
