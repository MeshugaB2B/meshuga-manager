"use client"
// ============================================================
// SignaturePageClient.tsx
// ============================================================
// Sprint C3 — Interface de signature électronique pour le salarié.
//
// 3 sections empilées en mobile :
//   1) Aperçu de l'avenant (iframe → /api/sign/[token]/document)
//   2) Aperçu du Dossier de bienvenue si inclus (iframe → /api/sign/[token]/welcomepack)
//   3) Zone de signature :
//      - Saisie nom + prénom au clavier
//      - Rendu en temps réel en Yellowtail rose (style stylo électronique)
//      - Cases à cocher "J'ai lu et j'approuve" pour chaque document
//      - Bouton "Signer" rose
//
// Conforme : pas d'auth nécessaire pour le salarié (accès par token URL).
// ============================================================

import { useState } from "react"
import { MESHUGA_LOGO_PINK_DATA_URI } from "@/lib/meshugaLogo"

interface Props {
  token: string
  prenom: string
  nom: string
  civilite: string | null
  documentTypeLabel: string
  includeWelcomePack: boolean
  sentAt: string | null
}

export default function SignaturePageClient(props: Props) {
  // Pré-remplir le champ signature avec le nom complet du salarié pour gagner du temps
  var defaultFullName = ((props.prenom || "") + " " + (props.nom || "")).trim()

  var [fullName, setFullName] = useState(defaultFullName)
  var [consentDocument, setConsentDocument] = useState(false)
  var [consentWelcomePack, setConsentWelcomePack] = useState(false)
  var [submitting, setSubmitting] = useState(false)
  var [errorMsg, setErrorMsg] = useState("")
  var [success, setSuccess] = useState(null)

  var civ = (props.civilite || "").toLowerCase().trim()
  var isFemale = civ === "mme" || civ === "madame"
  var cher = isFemale ? "Chère" : "Cher"

  // Validation pour activer le bouton
  var hasName = (fullName || "").trim().length >= 3
  var consentOk = consentDocument && (!props.includeWelcomePack || consentWelcomePack)
  var canSubmit = hasName && consentOk && !submitting

  // === Soumission ===
  var doSubmit = async function () {
    setSubmitting(true)
    setErrorMsg("")
    try {
      var res = await fetch("/api/sign/" + props.token + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          consentDocument: consentDocument,
          consentWelcomePack: consentWelcomePack,
        }),
      })
      var data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur lors de la signature")
      }
      setSuccess(data)
      // Scroll en haut pour voir le message de succès
      try { window.scrollTo({ top: 0, behavior: "smooth" }) } catch (e) {}
    } catch (e: any) {
      setErrorMsg(e.message || String(e))
      setSubmitting(false)
    }
  }

  // === ÉCRAN SUCCÈS ===
  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "40px 20px", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#FFFFFF", borderRadius: 12, padding: "32px 28px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", textAlign: "center" }}>
          <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 16 }}>✓</div>
          <div style={{ fontFamily: "Yellowtail, cursive", color: "#FF82D7", fontSize: 42, lineHeight: 1, marginBottom: 10 }}>
            Signature enregistrée
          </div>
          <p style={{ fontSize: 15, color: "#191923", lineHeight: 1.6, margin: "12px 0" }}>
            {cher} {props.prenom}, votre signature électronique a bien été enregistrée. Un email de confirmation vous est envoyé à l&apos;instant.
          </p>
          <div style={{ background: "#FAFAFA", borderLeft: "4px solid #16A34A", padding: "14px 18px", borderRadius: 6, margin: "20px 0", textAlign: "left", fontSize: 13, lineHeight: 1.6 }}>
            <div><strong>Document signé :</strong> {props.documentTypeLabel}</div>
            {props.includeWelcomePack && (
              <div><strong>+ Dossier de bienvenue Meshuga</strong> (21 pages)</div>
            )}
            <div><strong>Nom du signataire :</strong> {fullName.trim()}</div>
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #EEE", fontSize: 11, color: "#666" }}>
              <strong>Empreinte SHA-256 :</strong>
              <div style={{ fontFamily: "monospace", wordBreak: "break-all", marginTop: 2, fontSize: 10 }}>{success.hash}</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5, margin: "16px 0 0 0", fontStyle: "italic" }}>
            Signature électronique conforme aux articles 1366-1367 du Code civil et au Règlement européen eIDAS n° 910/2014.
          </p>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.5, margin: "16px 0 0 0" }}>
            Vous pouvez maintenant fermer cette page.
          </p>
        </div>
      </div>
    )
  }

  // === ÉCRAN PRINCIPAL ===
  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", padding: "20px 16px 40px 16px", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* === EN-TÊTE === */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "24px 24px 18px 24px", marginBottom: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontFamily: "Yellowtail, cursive", color: "#FF82D7", fontSize: 36, lineHeight: 1 }}>
            Signature électronique
          </div>
          <div style={{ height: 3, background: "#FFEB5A", margin: "12px 0 16px 0", borderRadius: 2 }} />
          <p style={{ fontSize: 15, color: "#191923", lineHeight: 1.6, margin: 0 }}>
            {cher} <strong>{props.prenom} {props.nom}</strong>,
          </p>
          <p style={{ fontSize: 14, color: "#191923", lineHeight: 1.6, margin: "10px 0 0 0" }}>
            Merci de bien vouloir prendre connaissance du document ci-dessous{props.includeWelcomePack ? " et du Dossier de bienvenue Meshuga" : ""}, puis de signer électroniquement en bas de page.
          </p>
        </div>

        {/* === SECTION 1 : APERÇU DE L'AVENANT === */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "18px 18px 8px 18px", marginBottom: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ background: "#FF82D7", color: "#FFFFFF", padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>1</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#191923" }}>{props.documentTypeLabel}</div>
          </div>
          <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px 0" }}>
            Veuillez prendre le temps de lire l&apos;intégralité du document. Vous pouvez faire défiler la fenêtre ci-dessous.
          </p>
          <div style={{ border: "1px solid #EEE", borderRadius: 6, overflow: "hidden", background: "#FFFFFF" }}>
            <iframe
              src={"/api/sign/" + props.token + "/document"}
              style={{ width: "100%", height: 600, border: 0, background: "#FFFFFF" }}
              title="Document à signer"
            />
          </div>
        </div>

        {/* === SECTION 2 : DOSSIER DE BIENVENUE (si inclus) === */}
        {props.includeWelcomePack && (
          <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "18px 18px 8px 18px", marginBottom: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ background: "#FF82D7", color: "#FFFFFF", padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>2</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#191923" }}>Dossier de bienvenue Meshuga (21 pages)</div>
            </div>
            <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px 0" }}>
              Règles internes, droits, devoirs, sécurité, hygiène, cadre légal, rémunération.
            </p>
            <div style={{ border: "1px solid #EEE", borderRadius: 6, overflow: "hidden", background: "#FFFFFF" }}>
              <iframe
                src={"/api/sign/" + props.token + "/welcomepack"}
                style={{ width: "100%", height: 600, border: 0, background: "#FFFFFF" }}
                title="Dossier de bienvenue Meshuga"
              />
            </div>
          </div>
        )}

        {/* === SECTION 3 : SIGNATURE === */}
        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 24, marginBottom: 18, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{ background: "#FF82D7", color: "#FFFFFF", padding: "3px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{props.includeWelcomePack ? 3 : 2}</span>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#191923" }}>Signature électronique</div>
          </div>

          {/* Saisie nom */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#191923", marginBottom: 6 }}>
              Confirmez vos nom et prénom complets *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={function (e) { setFullName(e.target.value) }}
              placeholder="Prénom NOM"
              autoComplete="name"
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "1.5px solid #DDD",
                borderRadius: 6,
                fontSize: 16,
                background: "#FFFFFF",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 11, color: "#666", marginTop: 4, fontStyle: "italic" }}>
              Votre signature électronique apparaîtra ci-dessous en temps réel.
            </div>
          </div>

          {/* Preview signature en Yellowtail rose */}
          <div style={{ background: "#FFFFFF", border: "2px dashed #FF82D7", borderRadius: 8, padding: "20px 16px", textAlign: "center", marginBottom: 18, minHeight: 80 }}>
            {hasName ? (
              <>
                <div style={{ fontFamily: "Yellowtail, cursive", color: "#FF82D7", fontSize: 44, lineHeight: 1.1, padding: "4px 0" }}>
                  {fullName.trim()}
                </div>
                <div style={{ fontSize: 10, color: "#666", marginTop: 6, fontStyle: "italic" }}>
                  ↑ Votre signature électronique
                </div>
              </>
            ) : (
              <div style={{ color: "#999", fontSize: 13, fontStyle: "italic", padding: "20px 0" }}>
                Saisissez vos nom et prénom ci-dessus pour voir votre signature
              </div>
            )}
          </div>

          {/* Cases à cocher consentement */}
          <div style={{ background: "#FAFAFA", borderRadius: 6, padding: "14px 16px", marginBottom: 18 }}>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 14, color: "#191923", lineHeight: 1.5 }}>
              <input
                type="checkbox"
                checked={consentDocument}
                onChange={function (e) { setConsentDocument(e.target.checked) }}
                style={{ marginTop: 3, accentColor: "#FF82D7", flexShrink: 0, width: 18, height: 18 }}
              />
              <span>
                <strong>J&apos;ai lu et j&apos;approuve</strong> l&apos;intégralité du document <strong>« {props.documentTypeLabel} »</strong>.
              </span>
            </label>

            {props.includeWelcomePack && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: 14, color: "#191923", lineHeight: 1.5, marginTop: 12, paddingTop: 12, borderTop: "1px solid #EEE" }}>
                <input
                  type="checkbox"
                  checked={consentWelcomePack}
                  onChange={function (e) { setConsentWelcomePack(e.target.checked) }}
                  style={{ marginTop: 3, accentColor: "#FF82D7", flexShrink: 0, width: 18, height: 18 }}
                />
                <span>
                  <strong>J&apos;ai lu et j&apos;approuve</strong> l&apos;intégralité du <strong>Dossier de bienvenue Meshuga</strong> (21 pages) : règles internes, congés payés, hygiène HACCP, vidéosurveillance, RGPD, charte numérique.
                </span>
              </label>
            )}
          </div>

          {/* Mention légale courte */}
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5, marginBottom: 16, padding: "10px 12px", background: "rgba(255,235,90,0.18)", borderRadius: 4 }}>
            En cliquant sur <strong>« Signer »</strong>, vous apposez votre signature électronique de manière conforme aux articles <strong>1366 et 1367 du Code civil</strong> et au <strong>Règlement européen eIDAS n° 910/2014</strong>. Votre adresse IP, votre navigateur et l&apos;horodatage seront enregistrés pour garantir l&apos;intégrité et la traçabilité de cette signature.
          </div>

          {/* Erreur */}
          {errorMsg && (
            <div style={{ padding: "12px 14px", background: "rgba(220,53,69,0.1)", borderLeft: "4px solid #DC3545", borderRadius: 4, fontSize: 13, color: "#191923", marginBottom: 16 }}>
              ⚠ {errorMsg}
            </div>
          )}

          {/* Bouton signer */}
          <button
            onClick={doSubmit}
            disabled={!canSubmit}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: canSubmit ? "#FF82D7" : "#CCC",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              letterSpacing: 0.3,
              boxShadow: canSubmit ? "0 4px 12px rgba(255,130,215,0.3)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {submitting ? "⏳ Enregistrement de la signature..." : "✓ Signer électroniquement"}
          </button>

          {!canSubmit && !submitting && (
            <div style={{ fontSize: 11, color: "#999", textAlign: "center", marginTop: 10, fontStyle: "italic" }}>
              {!hasName && "Saisissez d'abord vos nom et prénom. "}
              {hasName && !consentOk && "Cochez les cases de consentement pour activer le bouton."}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 11, color: "#999" }}>
          <img src={MESHUGA_LOGO_PINK_DATA_URI} alt="Meshuga" style={{ height: 22, width: "auto", display: "inline-block", marginBottom: 4 }} />
          <div>SAS AEGIA FOOD · 3 rue Vavin · 75006 Paris · SIREN 904 639 531</div>
        </div>
      </div>

      {/* Charger la police Yellowtail pour la preview signature */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" />
    </div>
  )
}
