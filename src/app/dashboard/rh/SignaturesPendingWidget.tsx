"use client"
// ============================================================
// SignaturesPendingWidget.tsx
// ============================================================
// Widget dashboard RH : liste live des signatures en attente.
//
// Affiche :
//   - Tous les avenants/contrats avec status sent OU viewed (non signés)
//   - Nom du salarié, type de document, canal d'envoi
//   - Temps écoulé depuis l'envoi (X jours, Y heures)
//   - Statut : 📧 envoyé / 👁 vu / 🔁 relancé N fois
//   - Bouton "Renvoyer le lien" pour relancer manuellement
//
// Polling toutes les 60s pour refresh.
// ============================================================

import { useEffect, useState } from "react"

interface PendingItem {
  id: string
  kind: "amendment" | "contract"
  documentLabel: string
  prenom: string
  nom: string
  sentAt: string
  viewedAt: string | null
  channel: string
  email: string | null
  phone: string | null
  relanceCount: number
  lastRelanceAt: string | null
  daysSinceSent: number
  signatureToken: string
}

interface Props {
  refreshIntervalMs?: number // default 60000 (60s)
}

export default function SignaturesPendingWidget(props: Props) {
  var [items, setItems] = useState([] as PendingItem[])
  var [loading, setLoading] = useState(true)
  var [errorMsg, setErrorMsg] = useState("")
  var [lastRefresh, setLastRefresh] = useState(new Date().toISOString())

  var refreshInterval = props.refreshIntervalMs || 60000

  var loadData = async function () {
    try {
      var res = await fetch("/api/hr/signatures-pending", { cache: "no-store" })
      var data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Erreur de chargement")
      }
      setItems(data.items || [])
      setErrorMsg("")
      setLastRefresh(new Date().toISOString())
    } catch (e: any) {
      setErrorMsg(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(function () {
    loadData()
    var timer = setInterval(loadData, refreshInterval)
    return function () { clearInterval(timer) }
  }, [])

  var formatTimeAgo = function (iso: string): string {
    var sent = new Date(iso).getTime()
    var diffMs = Date.now() - sent
    var diffHours = diffMs / (1000 * 60 * 60)
    var diffDays = diffHours / 24
    if (diffHours < 1) return "il y a " + Math.floor(diffMs / (1000 * 60)) + " min"
    if (diffHours < 24) return "il y a " + Math.floor(diffHours) + "h"
    if (diffDays < 2) return "hier"
    return "il y a " + Math.floor(diffDays) + " jours"
  }

  var getStatusBadge = function (item: PendingItem) {
    if (item.viewedAt) {
      return (
        <span style={{ background: "rgba(255,235,90,0.4)", color: "#7A6500", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
          👁 VU · {formatTimeAgo(item.viewedAt)}
        </span>
      )
    }
    return (
      <span style={{ background: "rgba(255,130,215,0.15)", color: "#C2185B", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>
        📧 ENVOYÉ
      </span>
    )
  }

  var getChannelLabel = function (channel: string): string {
    if (channel === "email+sms") return "📧 Email + 📱 SMS"
    if (channel === "email") return "📧 Email"
    if (channel === "sms") return "📱 SMS"
    return channel
  }

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", margin: "16px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "Yellowtail, cursive", color: "#FF82D7", fontSize: 28, lineHeight: 1 }}>
            Signatures en attente
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            {items.length} document{items.length > 1 ? "s" : ""} en attente · refresh auto toutes les 60s
          </div>
        </div>
        <button
          onClick={loadData}
          style={{
            padding: "6px 14px", background: "#FFEB5A", color: "#191923", border: "none",
            borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", letterSpacing: 0.3,
          }}
        >
          ↻ Rafraîchir
        </button>
      </div>

      {/* Erreur */}
      {errorMsg ? (
        <div style={{ padding: "10px 14px", background: "rgba(220,53,69,0.08)", borderLeft: "4px solid #DC3545", borderRadius: 4, fontSize: 13, color: "#191923", marginBottom: 12 }}>
          ⚠ {errorMsg}
        </div>
      ) : null}

      {/* Loading */}
      {loading && items.length === 0 ? (
        <div style={{ padding: "20px 0", textAlign: "center", color: "#999", fontSize: 13, fontStyle: "italic" }}>
          Chargement...
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && items.length === 0 && !errorMsg ? (
        <div style={{ padding: "30px 20px", textAlign: "center", background: "rgba(34,197,94,0.06)", borderRadius: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
          <div style={{ fontSize: 14, color: "#16A34A", fontWeight: 700 }}>Tout est signé !</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Aucun document en attente de signature.</div>
        </div>
      ) : null}

      {/* Liste */}
      {items.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(function (item) {
            var fullName = (item.prenom + " " + item.nom).trim() || "Salarié inconnu"
            return (
              <div key={item.id} style={{ padding: "12px 14px", border: "1px solid #EEE", borderRadius: 8, background: "#FAFAFA" }}>
                {/* Ligne 1 : Nom + statut */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#191923" }}>
                    {fullName}
                  </div>
                  {getStatusBadge(item)}
                </div>

                {/* Ligne 2 : type document */}
                <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>
                  {item.documentLabel}
                </div>

                {/* Ligne 3 : meta */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 11, color: "#666", marginBottom: 8 }}>
                  <span>Envoyé {formatTimeAgo(item.sentAt)}</span>
                  <span>·</span>
                  <span>{getChannelLabel(item.channel)}</span>
                  {item.relanceCount > 0 ? (
                    <>
                      <span>·</span>
                      <span style={{ color: "#F59E0B", fontWeight: 700 }}>
                        🔁 {item.relanceCount} relance{item.relanceCount > 1 ? "s" : ""}
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Ligne 4 : email/tel et bouton lien */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "#888", fontFamily: "monospace" }}>
                    {item.email ? <div>{item.email}</div> : null}
                    {item.phone ? <div>{item.phone}</div> : null}
                  </div>
                  <a
                    href={"/sign/" + item.signatureToken}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 11, color: "#FF82D7", textDecoration: "none",
                      padding: "5px 10px", border: "1px solid #FF82D7", borderRadius: 4,
                      fontWeight: 700, letterSpacing: 0.2,
                    }}
                  >
                    Voir le lien ↗
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* Footer info */}
      {items.length > 0 ? (
        <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(255,235,90,0.18)", borderRadius: 6, fontSize: 11, color: "#666", lineHeight: 1.5 }}>
          💡 Une relance email + SMS est envoyée automatiquement chaque jour à 11h (heure de Paris) tant que le document n'est pas signé.
        </div>
      ) : null}
    </div>
  )
}
