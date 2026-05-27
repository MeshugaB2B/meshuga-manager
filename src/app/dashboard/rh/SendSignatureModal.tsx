"use client"
// ============================================================
// FILE PATH dans le repo :
//   src/app/dashboard/rh/SendSignatureModal.tsx
// ============================================================
// v2 (26/05/2026) — Sprint C3 fix auth :
//   Au moment de l'envoi, on lit l'email du user logué via Supabase JS
//   (localStorage) et on le passe dans body.preparedByEmail.
//   L'API back-end utilise ce champ pour décider entre branche A
//   (preparedByEmail = Emy → envoyer validation à Edward)
//   et branche B (preparedByEmail = Edward → envoyer directement au salarié).
// ============================================================

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

interface Employee {
  id: string
  prenom: string
  nom: string
  email?: string | null
  telephone?: string | null
  civilite?: string | null
  welcome_pack_signed?: boolean
}

interface Props {
  documentType: "contract" | "amendment"
  documentId: string
  documentLabel: string
  employee: Employee
  onClose: () => void
  onSent: (message: string) => void
}

// === Helper : récupère l'email du user logué via Supabase JS (localStorage) ===
async function getCurrentUserEmail(): Promise<string> {
  try {
    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    if (!url || !anon) return ""
    var supabase = createBrowserClient(url, anon)
    var r = await supabase.auth.getSession()
    var session = r.data && r.data.session ? r.data.session : null
    if (!session || !session.user) return ""
    var em = session.user.email || ""
    return em.toLowerCase()
  } catch (e) {
    return ""
  }
}

export default function SendSignatureModal(props: Props) {
  var alreadySignedWp = props.employee.welcome_pack_signed === true

  var [email, setEmail] = useState(props.employee.email || "")
  var [phone, setPhone] = useState(props.employee.telephone || "")
  var [saveEmail, setSaveEmail] = useState(true)
  var [includeWelcomePack, setIncludeWelcomePack] = useState(!alreadySignedWp)
  var [phase, setPhase] = useState("form")
  var [errorMsg, setErrorMsg] = useState("")
  var [resultData, setResultData] = useState(null)

  var greetingName = (props.employee.prenom || "") + " " + (props.employee.nom || "")
  var civ = (props.employee.civilite || "").toString().toLowerCase().trim()
  var isFemale = civ === "mme" || civ === "madame" || civ === "mlle" || civ === "mademoiselle"
  var cherFr = isFemale ? "Chère" : "Cher"

  var isValidEmail = function (e) {
    if (!e) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
  }

  var isValidPhoneFR = function (p) {
    if (!p) return false
    var cleaned = p.replace(/[\s\-\.\(\)]/g, "").trim()
    if (!cleaned) return false
    if (cleaned.match(/^\+33[1-9]\d{8}$/)) return true
    if (cleaned.match(/^\+330[1-9]\d{8}$/)) return true
    if (cleaned.match(/^0033[1-9]\d{8}$/)) return true
    if (cleaned.match(/^0[1-9]\d{8}$/)) return true
    if (cleaned.match(/^[1-9]\d{8}$/)) return true
    return false
  }

  var goToConfirm = function () {
    setErrorMsg("")
    var hasEmail = email && email.trim().length > 0
    var hasPhone = phone && phone.trim().length > 0
    if (!hasEmail && !hasPhone) {
      setErrorMsg("Email ou téléphone requis (au moins un des deux)")
      return
    }
    if (hasEmail && !isValidEmail(email)) {
      setErrorMsg("Email invalide")
      return
    }
    if (hasPhone && !isValidPhoneFR(phone)) {
      setErrorMsg("Téléphone invalide (format français attendu, ex : 06 12 34 56 78 ou +33 6 12 34 56 78)")
      return
    }
    setPhase("confirming")
  }

  var doSend = async function () {
    setPhase("sending")
    setErrorMsg("")
    try {
      var endpoint = props.documentType === "contract"
        ? ("/api/contracts/" + props.documentId + "/send-signature")
        : ("/api/amendments/" + props.documentId + "/send-signature")

      var hasEmail = email && email.trim().length > 0
      var hasPhone = phone && phone.trim().length > 0

      // Récupérer l'email du user logué (Supabase localStorage)
      var currentUserEmail = await getCurrentUserEmail()

      var res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: hasEmail ? email.trim().toLowerCase() : "",
          recipientPhone: hasPhone ? phone.trim() : "",
          includeWelcomePack: includeWelcomePack,
          saveEmailToProfile: saveEmail,
          preparedByEmail: currentUserEmail,
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

  var finishAndClose = function () {
    // Cas A : Emy a préparé, validation Edward attendue
    if (resultData && resultData["awaiting_employer_validation"]) {
      var msgA = "📨 Document préparé. Edward a reçu "
      var emA = resultData["email_to_employer_sent"]
      var smA = resultData["sms_to_employer_sent"]
      if (emA && smA) msgA += "un email et un SMS"
      else if (emA) msgA += "un email"
      else if (smA) msgA += "un SMS"
      else msgA += "rien (échec) — il peut valider via le dashboard"
      msgA += " pour valider l'envoi au salarié."
      props.onSent(msgA)
      return
    }
    // Cas B : envoi direct au salarié
    var hasEmail = email && email.trim().length > 0
    var hasPhone = phone && phone.trim().length > 0
    var channelText = ""
    if (hasEmail && hasPhone) channelText = " par email et SMS"
    else if (hasPhone) channelText = " par SMS"
    else channelText = " par email"
    var dest = ""
    if (hasEmail && hasPhone) dest = " à " + email + " et " + phone
    else if (hasPhone) dest = " au " + phone
    else dest = " à " + email
    props.onSent(
      "📧 " + props.documentLabel + " envoyé" + channelText + dest +
      (includeWelcomePack ? " (avec le Dossier de bienvenue)" : "")
    )
  }

  var disabled = phase === "sending"
  var awaitingValidation = resultData && resultData["awaiting_employer_validation"]

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
            <div style={{ padding: "10px 14px", background: "rgba(255,130,215,0.08)", borderLeft: "4px solid #FF82D7", borderRadius: 4, fontSize: 13, color: "#191923", marginBottom: 18, lineHeight: 1.5 }}>
              Renseigne <strong>au moins un canal</strong> (email ou téléphone). Si les deux sont remplis, l&apos;envoi se fera <strong>en parallèle</strong> sur email + SMS.
            </div>

            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#191923", marginBottom: 6 }}>
                Email du salarié
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

            {/* Téléphone */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#191923", marginBottom: 6 }}>
                Téléphone du salarié (pour SMS)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={function (e) { setPhone(e.target.value) }}
                placeholder="06 12 34 56 78 ou +33 6 12 34 56 78"
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
              {props.employee.telephone ? (
                <div style={{ fontSize: 11, color: "#666", marginTop: 4, fontStyle: "italic" }}>
                  ↳ Pré-rempli depuis le profil du salarié. Le SMS sera envoyé via Twilio (expéditeur : MESHUGA).
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "#666", marginTop: 4, fontStyle: "italic" }}>
                  Optionnel — si renseigné, un SMS sera envoyé en plus de l&apos;email. Sauvegarde auto sur le profil si vide.
                </div>
              )}
            </div>

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

            <div style={{ padding: "12px 14px", background: "rgba(255,235,90,0.25)", borderLeft: "4px solid #FFEB5A", borderRadius: 4, fontSize: 13, color: "#191923", margin: "16px 0 4px 0", lineHeight: 1.5 }}>
              <strong>📧 Email via Brevo</strong> depuis <strong>hello@meshuga.fr</strong> · <strong>📱 SMS via Twilio</strong> avec expéditeur <strong>MESHUGA</strong>. Le salarié recevra un lien sécurisé pour signer en ligne.
            </div>

            {errorMsg ? (
              <div style={{ padding: "12px 14px", background: "rgba(220,53,69,0.1)", borderLeft: "4px solid #DC3545", borderRadius: 4, fontSize: 13, color: "#191923", margin: "12px 0 0 0" }}>
                ⚠ {errorMsg}
              </div>
            ) : null}

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
              Tu es sur le point d&apos;envoyer une <strong>demande de signature réelle</strong>.
              Vérifie attentivement avant de confirmer.
            </p>

            <div style={{ background: "rgba(255,130,215,0.08)", borderLeft: "4px solid #FF82D7", padding: "14px 18px", borderRadius: 6, margin: "16px 0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: 14, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: "#666" }}>Destinataire :</div>
                <div><strong>{greetingName}</strong></div>

                {email && email.trim().length > 0 ? (
                  <>
                    <div style={{ fontWeight: 700, color: "#666" }}>📧 Email :</div>
                    <div><strong style={{ color: "#FF82D7" }}>{email}</strong></div>
                  </>
                ) : null}

                {phone && phone.trim().length > 0 ? (
                  <>
                    <div style={{ fontWeight: 700, color: "#666" }}>📱 SMS :</div>
                    <div><strong style={{ color: "#FF82D7" }}>{phone}</strong> <span style={{ fontSize: 11, color: "#999" }}>(via MESHUGA)</span></div>
                  </>
                ) : null}

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
                <div>
                  {email && email.trim().length > 0 ? <div>hello@meshuga.fr (Brevo)</div> : null}
                  {phone && phone.trim().length > 0 ? <div>MESHUGA (Twilio)</div> : null}
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, lineHeight: 1.5, color: "#666", margin: "12px 0 0 0", fontStyle: "italic" }}>
              {cherFr} {props.employee.prenom} recevra le lien de signature dans les prochaines secondes <em>après validation Edward si tu es Emy</em>.
            </p>

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
            <div style={{ textAlign: "center", fontSize: 56, lineHeight: 1, marginBottom: 16 }}>
              {awaitingValidation ? "📨" : "✅"}
            </div>
            <div style={{ textAlign: "center", fontSize: 22, fontWeight: 700, color: awaitingValidation ? "#FF82D7" : "#16A34A", marginBottom: 8 }}>
              {awaitingValidation ? "En attente validation Edward" : "Envoyé avec succès"}
            </div>
            <p style={{ textAlign: "center", fontSize: 14, color: "#666", margin: "0 0 20px 0" }}>
              {awaitingValidation
                ? "Edward a reçu une demande de validation. Une fois qu'il aura cliqué sur Approuver, le lien de signature partira automatiquement vers " + props.employee.prenom + "."
                : (props.employee.prenom + " va recevoir le lien de signature dans les prochaines secondes.")
              }
            </p>

            {/* CAS A : validation en attente (preview Edward) */}
            {awaitingValidation ? (
              <div style={{ background: "rgba(255,130,215,0.08)", borderLeft: "4px solid #FF82D7", padding: "14px 18px", borderRadius: 6, margin: "16px 0", fontSize: 13, lineHeight: 1.6 }}>
                <div>
                  <strong>{resultData["email_to_employer_sent"] ? "✓" : "✗"} Email à Edward</strong>
                </div>
                <div>
                  <strong>{resultData["sms_to_employer_sent"] ? "✓" : "✗"} SMS à Edward</strong>
                </div>
                {resultData["validation_url"] ? (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,130,215,0.2)" }}>
                    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>Lien validation Edward (debug) :</div>
                    <div style={{ fontSize: 11, color: "#FF82D7", wordBreak: "break-all", fontFamily: "monospace" }}>
                      {resultData["validation_url"]}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* CAS B : envoi direct au salarié */}
            {!awaitingValidation ? (
              <div style={{ background: "rgba(34,197,94,0.08)", borderLeft: "4px solid #16A34A", padding: "14px 18px", borderRadius: 6, margin: "16px 0", fontSize: 13, lineHeight: 1.6 }}>
                {resultData && resultData["channels"] && resultData["channels"].email ? (
                  <div style={{ marginBottom: resultData["channels"].sms ? 10 : 0, paddingBottom: resultData["channels"].sms ? 10 : 0, borderBottom: resultData["channels"].sms ? "1px solid rgba(34,197,94,0.2)" : "none" }}>
                    <div>
                      <strong>{resultData["channels"].email.ok ? "✓ Email envoyé" : "✗ Email échoué"}</strong> à <strong>{email}</strong>
                    </div>
                    {resultData["channels"].email.messageId ? (
                      <div style={{ marginTop: 2, fontSize: 11, color: "#666", wordBreak: "break-all" }}>
                        ID Brevo : {resultData["channels"].email.messageId}
                      </div>
                    ) : null}
                    {!resultData["channels"].email.ok && resultData["channels"].email.error ? (
                      <div style={{ marginTop: 2, fontSize: 11, color: "#DC3545" }}>
                        Erreur : {resultData["channels"].email.error}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {resultData && resultData["channels"] && resultData["channels"].sms ? (
                  <div>
                    <div>
                      <strong>{resultData["channels"].sms.ok ? "✓ SMS envoyé" : "✗ SMS échoué"}</strong> au <strong>{phone}</strong>
                      {resultData["channels"].sms.testMode ? <span style={{ fontSize: 11, color: "#F59E0B", marginLeft: 6 }}>(mode test)</span> : null}
                    </div>
                    {resultData["channels"].sms.sid ? (
                      <div style={{ marginTop: 2, fontSize: 11, color: "#666", wordBreak: "break-all" }}>
                        SID Twilio : {resultData["channels"].sms.sid}
                      </div>
                    ) : null}
                    {!resultData["channels"].sms.ok && resultData["channels"].sms.error ? (
                      <div style={{ marginTop: 2, fontSize: 11, color: "#DC3545" }}>
                        Erreur : {resultData["channels"].sms.error}
                      </div>
                    ) : null}
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
            ) : null}

            {resultData && resultData["partialSuccess"] ? (
              <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.1)", borderLeft: "4px solid #F59E0B", borderRadius: 4, fontSize: 12, color: "#191923", marginBottom: 16, lineHeight: 1.5 }}>
                ⚠ <strong>Envoi partiel</strong> — un des canaux a échoué mais l&apos;autre a abouti. Le salarié pourra accéder au lien malgré tout.
              </div>
            ) : null}

            {!awaitingValidation ? (
              <p style={{ fontSize: 13, color: "#666", margin: "16px 0 0 0", lineHeight: 1.5 }}>
                💡 Le statut <strong>« 📧 Envoyé »</strong> apparaîtra dans la liste des documents. Il passera à <strong>« 👁 Vu »</strong> dès que le salarié clique sur le lien, puis à <strong>« ✅ Signé »</strong> après signature.
              </p>
            ) : null}

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
