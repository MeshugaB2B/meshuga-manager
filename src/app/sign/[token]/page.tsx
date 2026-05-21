// ============================================================
// /sign/[token]/page.tsx
// ============================================================
// Page publique de signature électronique pour les salariés.
//
// Sprint Y1 — Phase C — Sprint C2A (placeholder)
//
// ⚠️ ÉTAT ACTUEL : version minimaliste qui affiche juste un
// message d'accueil au salarié. La signature elle-même (preview
// PDF + cases à cocher + saisie nom + soumission) sera ajoutée
// en Sprint C3.
//
// Cette page existe pour :
//   1. Éviter le 404 quand le salarié clique le lien dans l'email
//   2. Marquer signature_viewed_at en DB (UX tracking)
//   3. Confirmer au salarié que la demande a bien été reçue
//
// Server Component → tout est fetché côté serveur, le token
// n'est jamais exposé au client.
// ============================================================

import { createClient } from "@supabase/supabase-js"
import { MESHUGA_LOGO_PINK_DATA_URI } from "@/lib/meshugaLogo"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// === Couleurs charte Meshuga ===
var ROSE = "#FF82D7"
var JAUNE = "#FFEB5A"
var NOIR = "#191923"

// === Helper Supabase server-side ===
function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// === Labels documents ===
function getContractTypeLabel(type: string, statutCadre: string, isFemale: boolean): string {
  var t = (type || "").toLowerCase()
  if (t === "extra") return "Contrat de travail (CDD d'usage)"
  if (t === "cdi_cadre") {
    return statutCadre === "cadre" ? "Contrat de travail CDI Cadre" : "Contrat de travail CDI Agent de maîtrise"
  }
  if (t === "cdi_cuisinier") return isFemale ? "Contrat de travail CDI Cuisinière" : "Contrat de travail CDI Cuisinier"
  if (t === "cdi_caissier") return isFemale ? "Contrat de travail CDI Caissière" : "Contrat de travail CDI Caissier"
  return "Contrat de travail"
}

function getAmendmentTypeLabel(typeAvenant: string): string {
  var t = (typeAvenant || "").toLowerCase()
  if (t === "regularisation_welcome_pack") return "Avenant de régularisation"
  if (t === "salaire") return "Avenant — modification de rémunération"
  if (t === "duree_travail") return "Avenant — modification de la durée du travail"
  if (t === "poste") return "Avenant — changement de poste"
  if (t === "lieu_travail") return "Avenant — changement de lieu de travail"
  if (t === "transformation_cdi") return "Avenant — transformation en CDI"
  return "Avenant au contrat de travail"
}

// === Types internes ===
interface SignaturePageData {
  found: boolean
  errorState?: "invalid" | "signed" | "expired" | "server-error"
  errorMessage?: string
  prenom?: string
  nom?: string
  civilite?: string | null
  documentTypeLabel?: string
  isAmendment?: boolean
  includeWelcomePack?: boolean
  sentAt?: string | null
}

// === Loader principal des données ===
async function loadSignaturePageData(token: string): Promise<SignaturePageData> {
  if (!token || token.length < 16) {
    return { found: false, errorState: "invalid", errorMessage: "Lien invalide" }
  }
  var supabase = getServerClient()
  if (!supabase) {
    return { found: false, errorState: "server-error", errorMessage: "Erreur de configuration serveur" }
  }

  // === 1. Tenter de matcher dans hr_contracts ===
  var resContract = await supabase
    .from("hr_contracts")
    .select(
      "id, employee_id, cycle_id, type, statut_cadre, signature_status, " +
      "signature_includes_welcome_pack, signature_sent_at, signature_viewed_at"
    )
    .eq("signature_token", token)
    .maybeSingle()

  if (resContract.data) {
    var c: any = resContract.data
    if (c.signature_status === "signed") {
      return { found: false, errorState: "signed", errorMessage: "Ce document a déjà été signé" }
    }
    if (c.signature_status === "expired") {
      return { found: false, errorState: "expired", errorMessage: "Ce lien a expiré" }
    }

    // Résoudre employee
    var empId: string | null = c.employee_id || null
    if (!empId && c.cycle_id) {
      var resCyc = await supabase
        .from("hr_employment_cycles")
        .select("employee_id")
        .eq("id", c.cycle_id)
        .maybeSingle()
      empId = (resCyc.data && resCyc.data.employee_id) || null
    }
    if (!empId) {
      return { found: false, errorState: "server-error", errorMessage: "Données incomplètes" }
    }

    var resEmp = await supabase
      .from("hr_employees")
      .select("prenom, nom, civilite")
      .eq("id", empId)
      .maybeSingle()
    if (!resEmp.data) {
      return { found: false, errorState: "server-error", errorMessage: "Salarié introuvable" }
    }

    // Marquer viewed_at si pas déjà fait (UX tracking)
    if (!c.signature_viewed_at) {
      await supabase
        .from("hr_contracts")
        .update({ signature_viewed_at: new Date().toISOString() })
        .eq("id", c.id)
    }

    var civ = (resEmp.data.civilite || "").toString().toLowerCase().trim()
    var isFemale = civ === "mme" || civ === "madame" || civ === "mlle" || civ === "mademoiselle"
    var docLabel = getContractTypeLabel(c.type || "", c.statut_cadre || "", isFemale)

    return {
      found: true,
      prenom: resEmp.data.prenom || "",
      nom: resEmp.data.nom || "",
      civilite: resEmp.data.civilite || null,
      documentTypeLabel: docLabel,
      isAmendment: false,
      includeWelcomePack: c.signature_includes_welcome_pack === true,
      sentAt: c.signature_sent_at || null,
    }
  }

  // === 2. Tenter de matcher dans hr_contract_amendments ===
  var resAmendment = await supabase
    .from("hr_contract_amendments")
    .select(
      "id, contract_id, type_avenant, signature_status, " +
      "signature_includes_welcome_pack, signature_sent_at, signature_viewed_at"
    )
    .eq("signature_token", token)
    .maybeSingle()

  if (resAmendment.data) {
    var a: any = resAmendment.data
    if (a.signature_status === "signed") {
      return { found: false, errorState: "signed", errorMessage: "Ce document a déjà été signé" }
    }
    if (a.signature_status === "expired") {
      return { found: false, errorState: "expired", errorMessage: "Ce lien a expiré" }
    }

    // Résoudre employee via contract parent
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
        .update({ signature_viewed_at: new Date().toISOString() })
        .eq("id", a.id)
    }

    var docLabelA = getAmendmentTypeLabel(a.type_avenant || "")

    return {
      found: true,
      prenom: resEmpA.data.prenom || "",
      nom: resEmpA.data.nom || "",
      civilite: resEmpA.data.civilite || null,
      documentTypeLabel: docLabelA,
      isAmendment: true,
      includeWelcomePack: a.signature_includes_welcome_pack === true,
      sentAt: a.signature_sent_at || null,
    }
  }

  // === 3. Token introuvable ===
  return { found: false, errorState: "invalid", errorMessage: "Lien invalide ou expiré" }
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default async function SignPage({ params }: { params: { token: string } }) {
  var data = await loadSignaturePageData(params.token)

  // === Cas erreur : lien invalide / signé / expiré / serveur ===
  if (!data.found) {
    var icon = "⚠️"
    var title = "Lien invalide"
    if (data.errorState === "signed") {
      icon = "✓"
      title = "Document déjà signé"
    } else if (data.errorState === "expired") {
      icon = "⏱"
      title = "Lien expiré"
    } else if (data.errorState === "server-error") {
      icon = "⚠️"
      title = "Erreur"
    }

    return (
      <div style={pageWrapStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: "center", marginBottom: 20, fontSize: 56, lineHeight: 1 }}>{icon}</div>
          <h1 style={h1Style}>{title}</h1>
          <p style={pStyle}>{data.errorMessage}</p>
          <p style={{ ...pStyle, marginTop: 16, fontSize: 14, color: "#666" }}>
            Si vous pensez qu'il s'agit d'une erreur, contactez-nous à <a href="mailto:hello@meshuga.fr" style={{ color: ROSE, fontWeight: 700 }}>hello@meshuga.fr</a>.
          </p>
        </div>
      </div>
    )
  }

  // === Cas succès : afficher la page d'accueil ===
  var civ = (data.civilite || "").toString().toLowerCase().trim()
  var isFemale = civ === "mme" || civ === "madame" || civ === "mlle" || civ === "mademoiselle"
  var greeting = (isFemale ? "Chère " : "Cher ") + (data.prenom || "")
  var soussigne = isFemale ? "soussignée" : "soussigné"

  return (
    <div style={pageWrapStyle}>
      <div style={cardStyle}>
        {/* Header BLANC avec logotype rose centré */}
        <div style={headerStyle}>
          <img
            src={MESHUGA_LOGO_PINK_DATA_URI}
            alt="Meshuga"
            style={{ display: "block", width: 200, maxWidth: "80%", height: "auto", margin: "0 auto" }}
          />
        </div>

        {/* Corps */}
        <div style={{ padding: "32px 24px" }}>
          <h1 style={h1Style}>{greeting},</h1>

          <p style={pStyle}>
            Votre demande de signature électronique a bien été reçue. Vous êtes invité{isFemale ? "e" : ""} à signer le{data.includeWelcomePack ? "s document" : ""}{data.includeWelcomePack ? "s" : " document"} suivant{data.includeWelcomePack ? "s" : ""} :
          </p>

          {/* Liste des documents */}
          <ul style={ulStyle}>
            <li style={liStyle}>
              <span style={{ color: ROSE, fontWeight: 700, fontSize: 18 }}>•</span>
              <span><strong>{data.documentTypeLabel}</strong></span>
            </li>
            {data.includeWelcomePack ? (
              <li style={liStyle}>
                <span style={{ color: ROSE, fontWeight: 700, fontSize: 18 }}>•</span>
                <span><strong>Dossier de bienvenue Meshuga</strong><br /><span style={{ fontSize: 13, color: "#666" }}>Règles d'hygiène, sécurité, RGPD, vidéosurveillance</span></span>
              </li>
            ) : null}
          </ul>

          {/* Encart info */}
          <div style={infoBoxStyle}>
            <div style={{ fontWeight: 700, color: NOIR, marginBottom: 8, fontSize: 15 }}>
              📅 Signature électronique en cours de finalisation
            </div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "#555" }}>
              La plateforme de signature en ligne sera disponible <strong>très prochainement</strong>.
              Vous recevrez un nouveau message dès que vous pourrez signer en ligne, en quelques clics depuis votre téléphone ou ordinateur.
            </p>
            <p style={{ margin: "12px 0 0 0", fontSize: 14, lineHeight: 1.5, color: "#555" }}>
              <strong>Ce lien restera valable.</strong> Vous pouvez le conserver et y revenir à tout moment.
            </p>
          </div>

          <p style={pStyle}>
            En attendant, si vous avez la moindre question, je reste à votre disposition.
          </p>

          <p style={{ ...pStyle, marginTop: 24 }}>
            Bien à vous,<br />
            <strong>Edward Touret</strong><br />
            <span style={{ color: "#666", fontSize: 13 }}>Président · SAS AEGIA FOOD</span>
          </p>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: "#999", textAlign: "center" }}>
            <strong>Meshuga</strong> · 3 rue Vavin, 75006 Paris · SIREN 904 639 531<br />
            Signature électronique conforme art. 1367 C. civ. + eIDAS UE 910/2014, art. 25
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STYLES INLINE (Server Component compatible)
// ============================================================
var pageWrapStyle: any = {
  minHeight: "100vh",
  background: JAUNE,
  padding: "24px 16px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  color: NOIR,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
}
var cardStyle: any = {
  width: "100%",
  maxWidth: 600,
  background: "#FFFFFF",
  borderRadius: 12,
  overflow: "hidden",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
}
var headerStyle: any = {
  background: "#FFFFFF",
  padding: "32px 24px 28px 24px",
  textAlign: "center",
  borderBottom: "1px solid #F5F5F5",
}
var h1Style: any = {
  margin: "0 0 16px 0",
  fontSize: 24,
  lineHeight: 1.3,
  color: NOIR,
  fontWeight: 700,
}
var pStyle: any = {
  margin: "0 0 16px 0",
  fontSize: 15,
  lineHeight: 1.6,
  color: NOIR,
}
var ulStyle: any = {
  listStyle: "none",
  padding: 0,
  margin: "16px 0 24px 0",
}
var liStyle: any = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  padding: "8px 0",
  fontSize: 15,
  lineHeight: 1.5,
  color: NOIR,
}
var infoBoxStyle: any = {
  background: "#FFFEF5",
  border: "1px solid " + JAUNE,
  borderRadius: 8,
  padding: "16px 18px",
  margin: "24px 0",
}
var footerStyle: any = {
  padding: "20px 24px",
  background: "#FAFAFA",
  borderTop: "1px solid #EEEEEE",
}
