// FILE PATH dans le repo :
//   src/app/employer-validate/page.tsx

"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

var PINK = "#FF82D7"
var YELLOW = "#FFEB5A"
var BLACK = "#191923"
var FONT_BODY = "'Arial Narrow', Arial, sans-serif"

function YellowtailTitle(props: { text: string; size?: number; color?: string }) {
  var size = props.size || 48
  var color = props.color || BLACK
  var src =
    "/api/og/yellowtail?text=" +
    encodeURIComponent(props.text) +
    "&size=" + String(size) +
    "&color=" + encodeURIComponent(color)
  return <img src={src} alt={props.text} style={{ height: size + "px", display: "block" }} />
}

async function getAccessToken(): Promise<string | null> {
  try {
    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    if (!url || !anon) return null
    var supabase = createBrowserClient(url, anon)
    var r = await supabase.auth.getSession()
    var session = r.data && r.data.session ? r.data.session : null
    return session ? (session.access_token || null) : null
  } catch (e) {
    return null
  }
}

export default function EmployerValidatePage() {
  var [status, setStatus] = useState("loading")
  var [data, setData] = useState<any>(null)
  var [errMsg, setErrMsg] = useState("")
  var [submitting, setSubmitting] = useState(false)
  var [successPayload, setSuccessPayload] = useState<any>(null)
  var [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(function () {
    var params = new URLSearchParams(window.location.search)
    var type = params.get("type") || ""
    var id = params.get("id") || ""
    var token = params.get("token") || ""

    if (!type || !id || !token) {
      setErrMsg("Lien invalide : paramètres manquants.")
      setStatus("error")
      return
    }

    getAccessToken().then(function (jwt) {
      if (!jwt) {
        var next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = "/login?next=" + next
        return
      }
      setAccessToken(jwt)

      var qs =
        "?type=" + encodeURIComponent(type) +
        "&id=" + encodeURIComponent(id) +
        "&token=" + encodeURIComponent(token)

      fetch("/api/employer-validate/load" + qs, {
        headers: { Authorization: "Bearer " + jwt },
      })
        .then(function (r) {
          if (r.status === 403) {
            return r.json().then(function (j) {
              setErrMsg("Accès refusé : ce lien ne t&apos;est pas destiné. " + (j && j.debug && j.debug.seen_email ? "(Compte vu : " + j.debug.seen_email + ")" : ""))
              setStatus("error")
              return null
            })
          }
          return r.json()
        })
        .then(function (j) {
          if (!j) return
          if (!j.ok) {
            setErrMsg(j.error || "Erreur inconnue")
            setStatus("error")
            return
          }
          setData(j)
          setStatus(j.status)
        })
        .catch(function (e) {
          setErrMsg(String(e))
          setStatus("error")
        })
    })
  }, [])

  var handleApprove = function () {
    if (submitting || !data || !accessToken) return
    setSubmitting(true)
    var params = new URLSearchParams(window.location.search)
    var type = params.get("type") || ""
    var id = params.get("id") || ""
    var token = params.get("token") || ""
    var endpoint =
      "/api/" + (type === "contract" ? "contracts" : "amendments") + "/" + id + "/employer-approve"
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify({ token: token }),
    })
      .then(function (r) { return r.json() })
      .then(function (j) {
        if (j.ok) {
          setSuccessPayload(j)
          setStatus("success")
        } else {
          setErrMsg(j.error || "Erreur lors de la validation.")
          setStatus("error")
        }
      })
      .catch(function (e) {
        setErrMsg(String(e))
        setStatus("error")
      })
      .finally(function () {
        setSubmitting(false)
      })
  }

  var handleReject = function () {
    if (submitting || !data || !accessToken) return
    var ok = window.confirm(
      "Annuler cet envoi ? Emy sera notifiée et devra re-préparer le document."
    )
    if (!ok) return
    setSubmitting(true)
    var params = new URLSearchParams(window.location.search)
    var type = params.get("type") || ""
    var id = params.get("id") || ""
    var token = params.get("token") || ""
    var endpoint =
      "/api/" + (type === "contract" ? "contracts" : "amendments") + "/" + id + "/employer-reject"
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify({ token: token }),
    })
      .then(function (r) { return r.json() })
      .then(function (j) {
        if (j.ok) {
          setStatus("rejected")
        } else {
          setErrMsg(j.error || "Erreur lors de l&apos;annulation.")
          setStatus("error")
        }
      })
      .catch(function (e) {
        setErrMsg(String(e))
        setStatus("error")
      })
      .finally(function () {
        setSubmitting(false)
      })
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FAFAFA",
        fontFamily: FONT_BODY,
        color: BLACK,
        padding: "24px 16px",
      }}
    >
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div
          style={{
            background: PINK,
            padding: "16px 24px",
            borderRadius: "12px 12px 0 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <YellowtailTitle text="Meshuga" size={36} color="#FFFFFF" />
          <span
            style={{
              color: "#FFFFFF",
              fontSize: 13,
              letterSpacing: 1,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Validation employeur
          </span>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: "2px solid " + BLACK,
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
            padding: "32px 28px",
          }}
        >
          {status === "loading" && (
            <p style={{ textAlign: "center", padding: "48px 0", fontSize: 16 }}>
              Chargement&hellip;
            </p>
          )}

          {status === "error" && (
            <div>
              <YellowtailTitle text="Oups" size={42} color={BLACK} />
              <p style={{ marginTop: 16, fontSize: 16 }}>{errMsg}</p>
              <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>
                Demande à Emy de re-préparer le document si nécessaire.
              </p>
            </div>
          )}

          {status === "expired" && (
            <div>
              <YellowtailTitle text="Lien expiré" size={42} color={BLACK} />
              <p style={{ marginTop: 16, fontSize: 16 }}>
                Ce lien de validation a expiré. Demande à Emy de re-préparer le document depuis le
                dashboard.
              </p>
            </div>
          )}

          {status === "already_validated" && data && (
            <div>
              <YellowtailTitle text="Déjà validé" size={42} color={BLACK} />
              <p style={{ marginTop: 16, fontSize: 16 }}>
                Ce document a déjà été validé le{" "}
                <strong>{new Date(data.validated_at).toLocaleString("fr-FR")}</strong>
                {data.validated_by ? <> par <strong>{data.validated_by}</strong></> : null}.
              </p>
              <p style={{ marginTop: 8, fontSize: 14, color: "#666" }}>Aucune action requise.</p>
            </div>
          )}

          {status === "rejected" && (
            <div>
              <YellowtailTitle text="Annulé" size={42} color={BLACK} />
              <p style={{ marginTop: 16, fontSize: 16 }}>
                Envoi annulé. Emy a été notifiée et pourra re-préparer le document.
              </p>
            </div>
          )}

          {status === "success" && successPayload && (
            <div>
              <YellowtailTitle text="Envoyé !" size={48} color={BLACK} />
              <p style={{ marginTop: 16, fontSize: 17 }}>
                ✓ Document envoyé à{" "}
                <strong>
                  {successPayload.employee
                    ? successPayload.employee.prenom + " " + successPayload.employee.nom
                    : "le salarié"}
                </strong>
                .
              </p>
              {successPayload.channels && (
                <ul style={{ marginTop: 12, fontSize: 14, listStyle: "none", padding: 0 }}>
                  {successPayload.channels.email && (
                    <li>📧 Email envoyé à {successPayload.channels.email}</li>
                  )}
                  {successPayload.channels.sms && (
                    <li>📱 SMS envoyé au {successPayload.channels.sms}</li>
                  )}
                </ul>
              )}
              <p style={{ marginTop: 16, fontSize: 14, color: "#666" }}>
                Le contrat sera valide une fois que le salarié l&apos;aura signé. Tu recevras une
                notification.
              </p>
            </div>
          )}

          {status === "pending" && data && (
            <div>
              <YellowtailTitle text="À valider" size={48} color={BLACK} />
              <p style={{ marginTop: 12, fontSize: 15, color: "#444" }}>
                Préparé par <strong>{data.prepared.by_email}</strong> le{" "}
                <strong>{new Date(data.prepared.at).toLocaleString("fr-FR")}</strong>
              </p>

              <div
                style={{
                  background: YELLOW,
                  border: "2px solid " + BLACK,
                  borderRadius: 8,
                  padding: "16px 20px",
                  marginTop: 20,
                }}
              >
                <div style={{ fontSize: 15, lineHeight: 1.7 }}>
                  <div>
                    <strong>Document :</strong> {data.doc.label}
                  </div>
                  <div>
                    <strong>Salarié :</strong>{" "}
                    {data.employee ? (
                      data.employee.prenom + " " + data.employee.nom
                    ) : (
                      <em>non trouvé</em>
                    )}
                  </div>
                  <div>
                    <strong>Email destinataire :</strong>{" "}
                    {data.channels.email || <em>non défini</em>}
                  </div>
                  <div>
                    <strong>Téléphone (SMS) :</strong>{" "}
                    {data.channels.phone || <em>non défini</em>}
                  </div>
                  {data.channels.include_welcome_pack && (
                    <div style={{ marginTop: 6 }}>
                      <strong>📦 Welcome pack inclus</strong>
                    </div>
                  )}
                </div>
              </div>

              {data.preview_url && (
                <div
                  style={{
                    marginTop: 24,
                    border: "2px solid " + BLACK,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#F4F4F4",
                  }}
                >
                  <iframe
                    src={data.preview_url}
                    style={{ width: "100%", height: "70vh", border: "none", display: "block" }}
                    title="Aperçu du document"
                  />
                </div>
              )}

              <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  style={{
                    background: PINK,
                    color: "#FFFFFF",
                    border: "2px solid " + BLACK,
                    borderRadius: 8,
                    padding: "14px 28px",
                    fontFamily: FONT_BODY,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: submitting ? "wait" : "pointer",
                    opacity: submitting ? 0.6 : 1,
                    flex: "1 1 240px",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {submitting ? "Envoi en cours..." : "✓ Confirmer et envoyer au salarié"}
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  style={{
                    background: "#EEEEEE",
                    color: BLACK,
                    border: "2px solid " + BLACK,
                    borderRadius: 8,
                    padding: "14px 28px",
                    fontFamily: FONT_BODY,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: submitting ? "wait" : "pointer",
                    opacity: submitting ? 0.6 : 1,
                    flex: "0 1 160px",
                  }}
                >
                  ✗ Annuler
                </button>
              </div>

              <p style={{ marginTop: 16, fontSize: 12, color: "#777" }}>
                En confirmant, tu valides en tant que président de SAS AEGIA FOOD que ce document
                peut être adressé au salarié pour signature.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
