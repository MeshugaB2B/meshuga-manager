// src/app/sign/[token]/page.tsx
// ============================================================
// Sprint C3 — Page publique de signature électronique
// ============================================================
// Server Component qui :
//   1) Valide le token (existe en DB + pas déjà signé)
//   2) Récupère les infos du salarié et du document à signer
//   3) Marque viewed_at si pas encore vu
//   4) Délègue l'UI au composant client SignaturePageClient
// ============================================================

import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import SignaturePageClient from "./SignaturePageClient"
import { MESHUGA_LOGO_PINK_DATA_URI } from "@/lib/meshugaLogo"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"

function getServerClient(): SupabaseClient | null {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[sign/[token]] Configuration Supabase manquante")
    return null
  }
  return createClient(url, key)
}

function getAmendmentTypeLabel(amendmentType: string): string {
  var t = (amendmentType || "").toLowerCase()
  if (t === "regularisation_welcome_pack") return "Avenant d'actualisation contractuelle"
  if (t === "augmentation_salaire") return "Avenant — Modification de la rémunération"
  if (t === "modification_horaires") return "Avenant — Modification des horaires"
  if (t === "changement_poste") return "Avenant — Changement de poste"
  if (t === "prolongation_duree") return "Avenant — Prolongation de la durée"
  return "Avenant au contrat de travail"
}

function getContractTypeLabel(type: string, statutCadre: string, isFemale: boolean): string {
  var t = (type || "").toLowerCase()
  if (t === "extra") return "Contrat de travail (CDD d'usage)"
  if (t === "cdi_cadre") {
    return statutCadre === "cadre"
      ? "Contrat de travail CDI Cadre"
      : "Contrat de travail CDI Agent de maîtrise"
  }
  if (t === "cdi_cuisinier") {
    return isFemale ? "Contrat de travail CDI Cuisinière" : "Contrat de travail CDI Cuisinier"
  }
  if (t === "cdi_caissier") {
    return isFemale ? "Contrat de travail CDI Caissière" : "Contrat de travail CDI Caissier"
  }
  return "Contrat de travail"
}

interface PageData {
  found: boolean
  errorState?: "invalid" | "signed" | "expired" | "server-error"
  errorMessage?: string
  prenom?: string
  nom?: string
  civilite?: string | null
  documentTypeLabel?: string
  includeWelcomePack?: boolean
  sentAt?: string | null
}

async function loadSignaturePageData(token: string): Promise<PageData> {
  if (!token || token.length < 16) {
    return { found: false, errorState: "invalid", errorMessage: "Lien invalide" }
  }
  var supabase = getServerClient()
  if (!supabase) {
    return { found: false, errorState: "server-error", errorMessage: "Erreur de configuration serveur" }
  }

  var resAmendment = await supabase
    .from("hr_contract_amendments")
    .select(
      "id, contract_id, amendment_type, signature_status, " +
      "signature_includes_welcome_pack, signature_sent_at, signature_viewed_at, signed_at"
    )
    .eq("signature_token", token)
    .maybeSingle()

  if (resAmendment.data) {
    var a: any = resAmendment.data
    if (a.signed_at || a.signature_status === "signed") {
      return { found: false, errorState: "signed", errorMessage: "Ce document a déjà été signé" }
    }
    if (a.signature_status === "expired") {
      return { found: false, errorState: "expired", errorMessage: "Ce lien a expiré" }
    }

    var resParent = await supabase
      .from("hr_contracts")
      .select("employee_id, cycle_id")
      .eq("id", a.contract_id || "")
      .maybeSingle()
    if (!resParent.data) {
      return { found: false, errorState: "server-error", errorMessage: "Contrat parent introuvable" }
    }

    var empIdA: string | null = resParent.data.employee_id || null
    if (!empIdA && resParent.data.cycle_id) {
      var resCycA = await supabase
        .from("hr_employment_cycles")
        .select("employee_id")
        .eq("id", resParent.data.cycle_id)
        .maybeSingle()
      empIdA = (resCycA.data && resCycA.data.employee_id) || null
    }
    if (!empIdA) {
      return { found: false, errorState: "server-error", errorMessage: "Données incomplètes" }
    }

    var resEmpA = await supabase
      .from("hr_employees")
      .select("prenom, nom, civilite")
      .eq("id", empIdA)
      .maybeSingle()
    if (!resEmpA.data) {
      return { found: false, errorState: "server-error", errorMessage: "Salarié introuvable" }
    }

    if (!a.signature_viewed_at) {
      await supabase
        .from("hr_contract_amendments")
        .update({ signature_viewed_at: new Date().toISOString(), signature_status: "viewed" })
        .eq("id", a.id)
    }

    return {
      found: true,
      prenom: resEmpA.data.prenom || "",
      nom: resEmpA.data.nom || "",
      civilite: resEmpA.data.civilite || null,
      documentTypeLabel: getAmendmentTypeLabel(a.amendment_type || ""),
      includeWelcomePack: a.signature_includes_welcome_pack === true,
      sentAt: a.signature_sent_at || null,
    }
  }

  // === Fallback : pas trouvé dans avenants → chercher dans hr_contracts ===
  var resContractDirect = await supabase
    .from("hr_contracts")
    .select(
      "id, employee_id, cycle_id, type, statut_cadre, signature_status, " +
      "signature_includes_welcome_pack, signature_sent_at, signature_viewed_at, signature_signed_at"
    )
    .eq("signature_token", token)
    .maybeSingle()

  if (resContractDirect.data) {
    var c: any = resContractDirect.data
    if (c.signature_signed_at || c.signature_status === "signed") {
      return { found: false, errorState: "signed", errorMessage: "Ce document a déjà été signé" }
    }
    if (c.signature_status === "expired") {
      return { found: false, errorState: "expired", errorMessage: "Ce lien a expiré" }
    }

    var empIdC: string | null = c.employee_id || null
    if (!empIdC && c.cycle_id) {
      var resCycC = await supabase
        .from("hr_employment_cycles")
        .select("employee_id")
        .eq("id", c.cycle_id)
        .maybeSingle()
      empIdC = (resCycC.data && resCycC.data.employee_id) || null
    }
    if (!empIdC) {
      return { found: false, errorState: "server-error", errorMessage: "Données incomplètes" }
    }

    var resEmpC = await supabase
      .from("hr_employees")
      .select("prenom, nom, civilite")
      .eq("id", empIdC)
      .maybeSingle()
    if (!resEmpC.data) {
      return { found: false, errorState: "server-error", errorMessage: "Salarié introuvable" }
    }

    var civC = (resEmpC.data.civilite || "").toLowerCase().trim()
    var isFemaleC = civC === "mme" || civC === "madame"

    if (!c.signature_viewed_at) {
      await supabase
        .from("hr_contracts")
        .update({ signature_viewed_at: new Date().toISOString(), signature_status: "viewed" })
        .eq("id", c.id)
    }

    return {
      found: true,
      prenom: resEmpC.data.prenom || "",
      nom: resEmpC.data.nom || "",
      civilite: resEmpC.data.civilite || null,
      documentTypeLabel: getContractTypeLabel(c.type || "", c.statut_cadre || "", isFemaleC),
      includeWelcomePack: c.signature_includes_welcome_pack === true,
      sentAt: c.signature_sent_at || null,
    }
  }

  return { found: false, errorState: "invalid", errorMessage: "Lien invalide ou expiré" }
}

export default async function SignPage({ params }: { params: { token: string } }) {
  var data = await loadSignaturePageData(params.token)

  if (!data.found) {
    var icon = "⚠️"
    var title = "Lien invalide"
    var subtitle = "Ce lien de signature n'est plus valide."
    if (data.errorState === "signed") {
      icon = "✓"
      title = "Document déjà signé"
      subtitle = "Ce document a déjà été signé avec succès. Aucune autre action n'est requise."
    } else if (data.errorState === "expired") {
      icon = "⏱"
      title = "Lien expiré"
      subtitle = "Ce lien de signature a expiré. Veuillez contacter Edward pour en recevoir un nouveau."
    } else if (data.errorState === "server-error") {
      icon = "⚠️"
      title = "Erreur"
      subtitle = data.errorMessage || "Une erreur est survenue. Veuillez réessayer plus tard."
    }

    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <div style={{ maxWidth: 480, width: "100%", background: "#FFFFFF", borderRadius: 12, padding: "32px 28px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}>{icon}</div>
          <div style={{ fontFamily: "Yellowtail, cursive", color: "#FF82D7", fontSize: 36, lineHeight: 1, marginBottom: 12 }}>
            {title}
          </div>
          <p style={{ fontSize: 15, color: "#191923", lineHeight: 1.6, margin: "12px 0" }}>
            {subtitle}
          </p>
          {data.errorState !== "signed" && (
            <p style={{ fontSize: 13, color: "#666", margin: "20px 0 0 0" }}>
              Pour toute question, contactez{" "}
              <a href="mailto:edward@meshuga.fr" style={{ color: "#FF82D7", fontWeight: 700 }}>edward@meshuga.fr</a>.
            </p>
          )}
          <div style={{ marginTop: 30, fontSize: 11, color: "#999" }}>
            <img src={MESHUGA_LOGO_PINK_DATA_URI} alt="Meshuga" style={{ height: 22, width: "auto", display: "inline-block", marginBottom: 4 }} />
            <div>SAS AEGIA FOOD &middot; 3 rue Vavin &middot; 75006 Paris</div>
          </div>
        </div>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" />
      </div>
    )
  }

  return (
    <SignaturePageClient
      token={params.token}
      prenom={data.prenom || ""}
      nom={data.nom || ""}
      civilite={data.civilite || null}
      documentTypeLabel={data.documentTypeLabel || "Document à signer"}
      includeWelcomePack={data.includeWelcomePack === true}
      sentAt={data.sentAt || null}
    />
  )
}
