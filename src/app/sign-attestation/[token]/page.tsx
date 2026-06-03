// ============================================================
// FILE PATH dans le repo :
//   src/app/sign-attestation/[token]/page.tsx
// ============================================================
// Page publique de signature électronique du Guide d'hygiène.
// Server Component : valide le token dans hr_attestations, récupère le
// salarié, marque viewed_at, puis délègue l'UI au composant client.
// Calqué sur src/app/sign/[token]/page.tsx (avenants/contrats).
// ============================================================

import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"
import SignAttestationClient from "./SignAttestationClient"
import { MESHUGA_LOGO_PINK_DATA_URI } from "@/lib/meshugaLogo"

export var runtime = "nodejs"
export var dynamic = "force-dynamic"

function getServerClient(): SupabaseClient | null {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error("[sign-attestation] Configuration Supabase manquante")
    return null
  }
  return createClient(url, key)
}

interface PageData {
  found: boolean
  errorState?: "invalid" | "signed" | "expired" | "server-error"
  errorMessage?: string
  prenom?: string
  nom?: string
  civilite?: string | null
  documentTypeLabel?: string
  sentAt?: string | null
}

async function loadData(token: string): Promise<PageData> {
  if (!token || token.length < 16) {
    return { found: false, errorState: "invalid", errorMessage: "Lien invalide" }
  }
  var supabase = getServerClient()
  if (!supabase) {
    return { found: false, errorState: "server-error", errorMessage: "Erreur de configuration serveur" }
  }

  var res = await supabase
    .from("hr_attestations")
    .select(
      "id, employee_id, doc_label, signature_status, signature_signed_at, signature_sent_at, signature_viewed_at"
    )
    .eq("signature_token", token)
    .maybeSingle()

  if (!res.data) {
    return { found: false, errorState: "invalid", errorMessage: "Lien invalide ou expiré" }
  }
  var a: any = res.data
  if (a.signature_signed_at || a.signature_status === "signed") {
    return { found: false, errorState: "signed", errorMessage: "Ce document a déjà été signé" }
  }
  if (a.signature_status === "expired") {
    return { found: false, errorState: "expired", errorMessage: "Ce lien a expiré" }
  }

  var resEmp = await supabase
    .from("hr_employees")
    .select("prenom, nom, civilite")
    .eq("id", a.employee_id || "")
    .maybeSingle()
  if (!resEmp.data) {
    return { found: false, errorState: "server-error", errorMessage: "Salarié introuvable" }
  }

  if (!a.signature_viewed_at) {
    await supabase
      .from("hr_attestations")
      .update({ signature_viewed_at: new Date().toISOString(), signature_status: "viewed", status: "viewed" })
      .eq("id", a.id)
  }

  return {
    found: true,
    prenom: resEmp.data.prenom || "",
    nom: resEmp.data.nom || "",
    civilite: resEmp.data.civilite || null,
    documentTypeLabel: a.doc_label || "Guide des bonnes pratiques d'hygiène",
    sentAt: a.signature_sent_at || null,
  }
}

export default async function SignAttestationPage({ params }: { params: { token: string } }) {
  var data = await loadData(params.token)

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
    <SignAttestationClient
      token={params.token}
      prenom={data.prenom || ""}
      nom={data.nom || ""}
      civilite={data.civilite || null}
      documentTypeLabel={data.documentTypeLabel || "Guide des bonnes pratiques d'hygiène"}
    />
  )
}
