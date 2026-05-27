"use client"
// ============================================================
// FILE PATH dans le repo :
//   src/app/dashboard/rh/SignaturesPendingWidget.tsx
// ============================================================
// v2 (27/05/2026) — Refonte UX :
//   - Replié par défaut : juste une bande compacte avec compteur
//   - Clic sur la bande → déplie/replie la liste
//   - Clic sur une carte salarié → ouvre sa fiche (via window.dispatchEvent)
//   - Refresh auto 60s + bouton ↻ conservés
//   - Statuts VU/Envoyé/Relance conservés
//   - Empty state caché par défaut (replié), pas de "Tout est signé !" qui occupe l'écran
// ============================================================

import { useEffect, useState } from "react"

interface PendingItem {
  id: string
  kind: "amendment" | "contract"
  documentLabel: string
  prenom: string
  nom: string
  employeeId: string | null
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
  refreshIntervalMs?: number
  defaultExpanded?: boolean
}

// Couleurs Meshuga
var PINK = "#FF82D7"
var YELLOW = "#FFEB5A"
var BLACK = "#191923"

export default function SignaturesPendingWidget(props: Props) {
  var [items, setItems] = useState([] as PendingItem[])
  var [loading, setLoading] = useState(true)
  var [errorMsg, setErrorMsg] = useState("")
  var [expanded, setExpanded] = useState(props.defaultExpanded === true)

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

  // Stats pour la bande compacte
  var nbTotal = items.length
  var nbVu = items.filter(function (it) { return !!it.viewedAt }).length
  var nbRelances = items.filter(function (it) { return it.relanceCount > 0 }).length
  var nbRetards = items.filter(function (it) { return it.daysSinceSent >= 2 }).length // >= 48h

  // Ouvre la fiche salarié dans RhTab via custom event
  // RhTab écoute "meshuga:open-employee" et appelle setViewingEmployeeId(empId)
  var openEmployee = function (empId: string | null) {
    if (!empId) return
    try {
      window.dispatchEvent(new CustomEvent("meshuga:open-employee", { detail: { employeeId: empId } }))
    } catch (e) { /* noop */ }
  }

  var getStatusBadge = function (item: PendingItem) {
    if (item.viewedAt) {
      return (
        <span style={{ background: "rgba(255,235,90,0.4)", color: "#7A6500", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
          👁 VU · {formatTimeAgo(item.viewedAt)}
        </span>
      )
    }
    return (
      <span style={{ background: "rgba(255,130,215,0.15)", color: "#C2185B", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
        📧 ENVOYÉ
      </span>
    )
  }

  var getChannelLabel = function (channel: string): string {
    if (channel === "email+sms") return "📧 + 📱"
    if (channel === "email") return "📧"
    if (channel === "sms") return "📱"
    return channel
  }

  // ============================================================
  // CAS 1 : rien en attente — on n'affiche RIEN du tout (pas même un encart vide)
  // ============================================================
  if (!loading && nbTotal === 0 && !errorMsg) {
    return null
  }

  // ============================================================
  // CAS 2 : erreur silencieuse en mode replié (n'occupe pas l'écran)
  // ============================================================
  if (!loading && nbTotal === 0 && errorMsg) {
    return (
      <div style={{
        margin: "12px 0",
        padding: "8px 14px",
        background: "rgba(220,53,69,0.06)",
        borderLeft: "3px solid #DC3545",
        borderRadius: 4,
        fontSize: 12,
        color: "#666",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}>
        <span>⚠ Signatures : {errorMsg}</span>
        <button
          onClick={loadData}
          style={{
            padding: "3px 10px", background: "transparent", color: "#DC3545", border: "1px solid #DC3545",
            borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >↻</button>
      </div>
    )
  }

  // ============================================================
  // CAS 3 : il y a des signatures en attente — bande compacte
  // ============================================================

  // Construit le résumé textuel en haut de la bande
  var summaryParts: string[] = []
  summaryParts.push(nbTotal + " en attente")
  if (nbVu > 0) summaryParts.push(nbVu + " vu" + (nbVu > 1 ? "s" : ""))
  if (nbRetards > 0) summaryParts.push("⏰ " + nbRetards + " > 48h")
  if (nbRelances > 0) summaryParts.push("🔁 " + nbRelances + " relancé" + (nbRelances > 1 ? "s" : ""))

  // Couleur d'accent : rouge-rose si retards, rose normal sinon
  var hasUrgent = nbRetards > 0
  var accentColor = hasUrgent ? "#DC3545" : PINK

  return (
    <div style={{ margin: "12px 0" }}>
      {/* ===== BANDE COMPACTE (toujours visible) ===== */}
      <button
        onClick={function () { setExpanded(!expanded) }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          background: "#FFFFFF",
          border: "1.5px solid " + (hasUrgent ? "#DC3545" : "#EEE"),
          borderLeft: "4px solid " + accentColor,
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          transition: "background 0.15s",
        }}
        onMouseEnter={function (ev: any) { ev.currentTarget.style.background = "#FAFAFA" }}
        onMouseLeave={function (ev: any) { ev.currentTarget.style.background = "#FFFFFF" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>📨</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: BLACK, lineHeight: 1.2 }}>
              Signatures en attente
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2, lineHeight: 1.3 }}>
              {summaryParts.join(" · ")}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span
            onClick={function (ev: any) { ev.stopPropagation(); loadData() }}
            title="Rafraîchir"
            style={{
              padding: "4px 8px",
              background: YELLOW,
              color: BLACK,
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 0.3,
              display: "inline-block",
            }}
          >↻</span>
          <span style={{ fontSize: 12, color: "#999", transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>
            ▼
          </span>
        </div>
      </button>

      {/* ===== LISTE DÉPLIÉE ===== */}
      {expanded ? (
        <div style={{
          marginTop: 8,
          padding: 12,
          background: "#FAFAFA",
          border: "1px solid #EEE",
          borderRadius: 8,
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map(function (item) {
              var fullName = (item.prenom + " " + item.nom).trim() || "Salarié inconnu"
              var canOpenEmployee = !!item.employeeId
              return (
                <div
                  key={item.id}
                  onClick={function () { openEmployee(item.employeeId) }}
                  style={{
                    padding: "10px 12px",
                    border: "1px solid #EEE",
                    borderRadius: 6,
                    background: "#FFFFFF",
                    cursor: canOpenEmployee ? "pointer" : "default",
                    transition: "background 0.15s, border-color 0.15s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                  onMouseEnter={function (ev: any) {
                    if (!canOpenEmployee) return
                    ev.currentTarget.style.background = "#FFF8FC"
                    ev.currentTarget.style.borderColor = PINK
                  }}
                  onMouseLeave={function (ev: any) {
                    ev.currentTarget.style.background = "#FFFFFF"
                    ev.currentTarget.style.borderColor = "#EEE"
                  }}
                  title={canOpenEmployee ? "Cliquer pour ouvrir la fiche salarié" : ""}
                >
                  {/* Bloc gauche : nom + doc + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: BLACK }}>
                        {fullName}
                      </span>
                      {getStatusBadge(item)}
                      {item.relanceCount > 0 ? (
                        <span style={{ background: "rgba(245,158,11,0.15)", color: "#B45309", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
                          🔁 {item.relanceCount}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", lineHeight: 1.4 }}>
                      <span>{item.documentLabel}</span>
                      <span style={{ color: "#CCC", margin: "0 6px" }}>·</span>
                      <span>envoyé {formatTimeAgo(item.sentAt)}</span>
                      <span style={{ color: "#CCC", margin: "0 6px" }}>·</span>
                      <span>{getChannelLabel(item.channel)}</span>
                    </div>
                  </div>

                  {/* Bloc droite : bouton lien (action secondaire) */}
                  <a
                    href={"/sign/" + item.signatureToken}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={function (ev: any) { ev.stopPropagation() }}
                    style={{
                      fontSize: 11,
                      color: PINK,
                      textDecoration: "none",
                      padding: "4px 10px",
                      border: "1px solid " + PINK,
                      borderRadius: 4,
                      fontWeight: 700,
                      letterSpacing: 0.2,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Voir le lien ↗
                  </a>
                </div>
              )
            })}
          </div>

          {/* Footer info compact */}
          <div style={{ marginTop: 10, fontSize: 10, color: "#999", textAlign: "center", lineHeight: 1.5 }}>
            💡 Relance auto chaque jour à 11h · clic sur une ligne = fiche salarié
          </div>
        </div>
      ) : null}
    </div>
  )
}
