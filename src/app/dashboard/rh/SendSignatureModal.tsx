"use client"
// ============================================================
// SendSignatureModal.tsx
// ============================================================
// Modal d'envoi d'un contrat ou avenant pour signature électronique.
//
// Sprint Y1 — Phase C — Sprint C2B
//
// Workflow :
//   1. Écran formulaire : email du salarié (pré-rempli) + case Welcome Pack
//      + case "Sauvegarder l'email sur le profil"
//   2. Écran confirmation : "Vous allez envoyer X à Y@Z.com — Confirmer ?"
//   3. Écran succès : "Envoyé ✓" avec lien copiable + bouton fermer
//
// Charte Meshuga : Yellowtail titre + Arial body, rose/jaune/noir
// Pas de fond foncé, signature électronique conforme eIDAS.
// ============================================================

import { useState } from "react"

interface Employee {
  id: string
  prenom: string
  nom: string
  email?: string | null
  civilite?: string | null
  welcome_pack_signed?: boolean
}

interface Props {
  documentType: "contract" | "amendment"
  documentId: string
  documentLabel: string  // ex: "Avenant Mise en conformité"
  employee: Employee
  onClose: () => void
  onSent: (message: string) => void
}

export default function SendSignatureModal(props: Props) {
  var alreadySignedWp = props.employee.welcome_pack_signed === true

  var [email, setEmail] = useState(props.employee.email || "")
  var [saveEmail, setSaveEmail] = useState(true)
  // Inclure le dossier de bienvenue par défaut SAUF s'il a déjà été signé
  var [includeWelcomePack, setIncludeWelcomePack] = useState(!alreadySignedWp)
  var [phase, setPhase] = useState("form")  // form | confirming | sending | done | error
  var [errorMsg, setErrorMsg] = useState("")
  var [resultData, setResultData] = useState(null)

  var greetingName = (props.employee.prenom || "") + " " + (props.employee.nom || "")
  var civ = (props.employee.civilite || "").toString().toLowerCase().trim()
  var isFemale = civ === "mme" || civ === "madame" || civ === "mlle" || civ === "mademoiselle"
  var cherFr = isFemale ? "Chère" : "Cher"

  // === Validation email basique ===
  var isValidEmail = function (e) {
    if (!e) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
  }

  // === Passage à l'écran de confirmation ===
  var goToConfirm = function () {
    setErrorMsg("")
    if (!isValidEmail(email)) {
      setErrorMsg("Email invalide")
      return
    }
    setPhase("confirming")
  }

  // === Envoi effectif ===
  var doSend = async function () {
    setPhase("sending")
    setErrorMsg("")
    try {
      var endpoint = props.documentType === "contract"
        ? ("/api/contracts/" + props.documentId + "/send-signature")
        : ("/api/amendments/" + props.documentId + "/send-signature")

      var res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: email.trim().toLowerCase(),
          includeWelcomePack: includeWelcomePack,
          saveEmailToProfile: saveEmail,
        }),
      })
      var data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur d'envoi")
      }
      setResultData(data)
      setPhase("done")
    } catch (e) {
      setErrorMsg(e.message || String(e))
      setPhase("error")
    }
  }

  // === Fermeture finale ===
  var finishAndClose = function () {
    props.onSent(
      "📧 " + props.documentLabel + " envoyé à " + email +
      (includeWelcomePack ? " (avec le Dossier de bienvenue)" : "")
    )
  }

  // === UI ===
  var disabled = phase === "sending"

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={function () { if (!disabled && phase !== "done") props.onClose() }}
    >
      <div
        onClick={function (e) { e.stopPropagation() }}
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          maxWidth: 560,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #EEEEEE", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Yellowtail, cursive", color: "#FF82D7", fontSize: 28, lineHeight: 1 }}>
              Envoyer pour signature
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {greetingName} — {props.documentLabel}
            </div>
          </div>
          {phase !== "done" && phase !== "sending" ? (
            <button
              onClick={props.onClose}
              style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" }}
              aria-label="Fermer"
            >×</button>
          ) : null}
        </div>

        {/* === ÉCRAN 1 : FORMULAIRE === */}
        {phase === "form" || phase === "error" ? (
          <div style={{ padding: 24 }}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#191923", marginBottom: 6 }}>
                Email du salarié *
              </label>
              <input
                type="email"
                value={email}
                onChange={function (e) { setEmail(e.target.value) }}
                placeholder="prenom.nom@example.com"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1.5px solid #DDD",
                  borderRadius: 6,
                  fontSize: 15,
                  background: "#FFFFFF",
                  fontFamily: "inherit",
                }}
              />
              {props.employee.email ? (
                <div style={{ fontSize: 11, color: "#666", marginTop: 4, fontStyle: "italic" }}>
                  ↳ Pré-rempli depuis le profil du salarié.
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#C2185B", marginTop: 4 }}>
                  ⚠ Aucun email enregistré sur le profil — saisis-le.
                </div>
              )}
            </div>

            {/* Sauvegarder email sur profil */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", cursor: "pointer", fontSize: 14, color: "#191923" }}>
              <input
                type="checkbox"
                checked={saveEmail}
                onChange={function (e) { setSaveEmail(e.target.checked) }}
                style={{ marginTop: 2, accentColor: "#FF82D7" }}
              />
              <span>
                <b>Sauvegarder cet email sur le profil du salarié</b>
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>
                  Évite de ressaisir l&apos;email pour les prochains envois.
                </span>
              </span>
            </label>

            <div style={{ height: 1, background: "#EEEEEE", margin: "12px 0" }} />

            {/* Inclure dossier de bienvenue */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", cursor: alreadySignedWp ? "default" : "pointer", fontSize: 14, color: "#191923", opacity: alreadySignedWp ? 0.6 : 1 }}>
              <input
                type="checkbox"
                checked={includeWelcomePack && !alreadySignedWp}
                disabled={alreadySignedWp}
                onChange={function (e) { setIncludeWelcomePack(e.target.checked) }}
                style={{ marginTop: 2, accentColor: "#FF82D7" }}
              />
              <span>
                <b>Inclure le Dossier de bienvenue Meshuga</b>
                <br />
                {alreadySignedWp ? (
                  <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 700 }}>
                    ✓ Déjà signé le {props.employee["welcome_pack_signed_at"] ? new Date(props.employee["welcome_pack_signed_at"]).toLocaleDateString("fr-FR") : "—"} — non inclus dans cet envoi.
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: "#666" }}>
                    Le salarié signera ce dossier (13 pages) en même temps que {props.documentType === "contract" ? "son contrat" : "l'avenant"}, en une seule fois.
                  </span>
                )}
              </span>
            </label>

            {/* Encart info */}
            <div style={{ padding: "12px 14px", background: "rgba(255,235,90,0.25)", borderLeft: "4px solid #FFEB5A", borderRadius: 4, fontSize: 13, color: "#191923", margin: "16px 0 4px 0", lineHeight: 1.5 }}>
              <strong>📧 Email envoyé via Brevo</strong> depuis <strong>hello@meshuga.fr</strong>. Le salarié recevra un lien sécurisé pour signer en ligne en quelques clics depuis son téléphone ou ordinateur.
            </div>

            {/* Erreur */}
            {errorMsg ? (
              <div style={{ padding: "12px 14px", background: "rgba(220,53,69,0.1)", borderLeft: "4px solid #DC3545", borderRadius: 4, fontSize: 13, color: "#191923", margin: "12px 0 0 0" }}>
                ⚠ {errorMsg}
              </div>
            ) : null}

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 18, marginTop: 18, borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={props.onClose}
                style={{
                  background: "#FFFFFF",
                  color: "#191923",
                  border: "1.5px solid #DDD",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >Annuler</button>
              <button
                onClick={goToConfirm}
                style={{
                  background: "#FF82D7",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >Continuer →</button>
            </div>
          </div>
        ) : null}

        {/* === ÉCRAN 2 : CONFIRMATION === */}
        {phase === "confirming" || phase === "sending" ? (
          <div style={{ padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#191923", marginBottom: 18 }}>
              ⚠ Confirmation avant envoi
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#191923", margin: "0 0 16px 0" }}>
              Tu es sur le point d&apos;envoyer un <strong>email réel de demande de signature</strong>.
              Vérifie attentivement avant de confirmer.
            </p>

            <div style={{ background: "rgba(255,130,215,0.08)", borderLeft: "4px solid #FF82D7", padding: "14px 18px", borderRadius: 6, margin: "16px 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: 14, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: "#666" }}>Destinataire :</div>
                <div><strong>{greetingName}</strong></div>

                <div style={{ fontWeight: 700, color: "#666" }}>Email :</div>
                <div><strong style={{ color: "#FF82D7" }}>{email}</strong></div>

                <div style={{ fontWeight: 700, color: "#666" }}>Document{includeWelcomePack ? "s" : ""} :</div>
                <div>
                  <div><strong>{props.documentLabel}</strong></div>
                  {includeWelcomePack && !alreadySignedWp ? (
                    <div style={{ marginTop: 4 }}>
                      <strong>+ Dossier de bienvenue Meshuga</strong> (13 pages)
                    </div>
                  ) : null}
                </div>

                <div style={{ fontWeight: 700, color: "#666" }}>Expéditeur :</div>
                <div>hello@meshuga.fr (Brevo)</div>
              </div>
            </div>

            <p style={{ fontSize: 13, lineHeight: 1.5, color: "#666", margin: "12px 0 0 0", fontStyle: "italic" }}>
              {cherFr} {props.employee.prenom} recevra immédiatement le mail avec un lien sécurisé pour signer en ligne.
            </p>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 18, marginTop: 18, borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={function () { setPhase("form") }}
                disabled={phase === "sending"}
                style={{
                  background: "#FFFFFF",
                  color: "#191923",
                  border: "1.5px solid #DDD",
                  padding: "10px 20px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: phase === "sending" ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >← Retour</button>
              <button
                onClick={doSend}
                disabled={phase === "sending"}
                style={{
                  background: phase === "sending" ? "#CCC" : "#16A34A",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: phase === "sending" ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {phase === "sending" ? "⏳ Envoi en cours..." : "✓ Confirmer et envoyer"}
              </button>
            </div>
          </div>
        ) : null}

        {/* === ÉCRAN 3 : SUCCÈS === */}
        {phase === "done" ? (
          <div style={{ padding: 24 }}>
            <div style={{ textAlign: "center", fontSize: 56, lineHeight: 1, marginBottom: 16 }}>📧</div>
            <div style={{ textAlign: "center", fontSize: 22, fontWeight: 700, color: "#16A34A", marginBottom: 8 }}>
              Email envoyé avec succès
            </div>
            <p style={{ textAlign: "center", fontSize: 14, color: "#666", margin: "0 0 20px 0" }}>
              {props.employee.prenom} va recevoir le lien de signature dans les prochaines secondes.
            </p>

            <div style={{ background: "rgba(34,197,94,0.08)", borderLeft: "4px solid #16A34A", padding: "14px 18px", borderRadius: 6, margin: "16px 0", fontSize: 13, lineHeight: 1.6 }}>
              <div><strong>Destinataire :</strong> {email}</div>
              {resultData && resultData["messageId"] ? (
                <div style={{ marginTop: 4, fontSize: 11, color: "#666", wordBreak: "break-all" }}>
                  ID Brevo : {resultData["messageId"]}
                </div>
              ) : null}
              {resultData && resultData["signatureUrl"] ? (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(34,197,94,0.2)" }}>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Lien de signature (à conserver pour relances) :</div>
                  <div style={{ fontSize: 11, color: "#FF82D7", wordBreak: "break-all", fontFamily: "monospace" }}>
                    {resultData["signatureUrl"]}
                  </div>
                </div>
              ) : null}
            </div>

            <p style={{ fontSize: 13, color: "#666", margin: "16px 0 0 0", lineHeight: 1.5 }}>
              💡 Le statut <strong>« 📧 Envoyé »</strong> apparaîtra dans la liste des documents. Il passera à <strong>« 👁 Vu »</strong> dès que le salarié clique sur le lien, puis à <strong>« ✅ Signé »</strong> après signature.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 18, marginTop: 18, borderTop: "1px solid #EEEEEE" }}>
              <button
                onClick={finishAndClose}
                style={{
                  background: "#FF82D7",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 24px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >Fermer</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
