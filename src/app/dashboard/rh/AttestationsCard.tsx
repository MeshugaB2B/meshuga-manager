"use client"
// ============================================================
// FILE PATH dans le repo :
//   src/app/dashboard/rh/AttestationsCard.tsx
// ============================================================
// Carte « Guide d'hygiène » dans la fiche salarié (EmployeeDetail).
//   - Statut : jamais envoyé / envoyé / vu / signé (+ date)
//   - Bouton « Envoyer pour signature » (POST /api/hr/attestations/send)
//   - Une fois signé : bouton « Voir le PDF signé »
// Lecture live de hr_attestations (client browser anon).
// ============================================================

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function AttestationsCard(props) {
  var [att, setAtt] = useState(null)
  var [loading, setLoading] = useState(true)
  var [sending, setSending] = useState(false)
  var [msg, setMsg] = useState("")
  var [err, setErr] = useState("")

  var fmtDate = function (iso) {
    if (!iso) return ""
    try {
      var d = new Date(iso)
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
    } catch (e) { return "" }
  }

  var load = async function () {
    setLoading(true)
    try {
      var res = await supabase
        .from("hr_attestations")
        .select("id, status, signature_status, signature_signed_at, signature_sent_at, signature_viewed_at, signature_recipient_email, signed_pdf_path")
        .eq("employee_id", props.employeeId)
        .eq("doc_type", "attestation_hygiene")
        .order("created_at", { ascending: false })
        .limit(1)
      if (res.data && res.data.length > 0) setAtt(res.data[0])
      else setAtt(null)
    } catch (e) {
      setAtt(null)
    }
    setLoading(false)
  }

  useEffect(function () { load() }, [props.employeeId])

  var doSend = async function () {
    setSending(true)
    setErr("")
    setMsg("")
    try {
      var res = await fetch("/api/hr/attestations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: props.employeeId, preparedByEmail: "edward@meshuga.fr" }),
      })
      var data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || "Échec de l'envoi")
      var canaux = []
      if (data.email) canaux.push("email")
      if (data.sms) canaux.push("SMS")
      setMsg(canaux.length ? "Guide envoyé par " + canaux.join(" + ") + " ✓" : "Lien de signature créé ✓")
      await load()
    } catch (e: any) {
      setErr(e.message || String(e))
    }
    setSending(false)
  }

  var openPdf = function () {
    if (att && att.id) {
      try { window.open("/api/hr/attestations/" + att.id + "/pdf", "_blank") } catch (e) {}
    }
  }

  var isSigned = !!(att && (att.signature_signed_at || att.signature_status === "signed"))
  var sigStatus = att ? (att.signature_status || "sent") : null

  var badge = null
  if (isSigned) badge = { bg: "#16A34A", color: "#FFFFFF", text: "✓ Signé" }
  else if (sigStatus === "viewed") badge = { bg: "#FFEB5A", color: "#191923", text: "👁 Vu" }
  else if (sigStatus === "sent") badge = { bg: "#FFEB5A", color: "#191923", text: "📧 Envoyé" }
  else if (att) badge = { bg: "#FFF8E1", color: "#191923", text: "à signer" }

  return (
    <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
      <div className="ct" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>🧼 Guide d&apos;hygiène</span>
        {badge ? (
          <span style={{ fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color, padding: "2px 8px", borderRadius: 3 }}>{badge.text}</span>
        ) : null}
      </div>

      {loading ? (
        <div style={{ fontSize: 11.5, color: "#999", padding: "8px 0" }}>Chargement…</div>
      ) : (
        <div>
          {isSigned ? (
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 6, padding: 12, marginBottom: 10, fontSize: 11.5, color: "#166534" }}>
              ✓ Reconnaissance de formation signée le <strong>{fmtDate(att.signature_signed_at)}</strong>. Le PDF est archivé dans les Documents ci-dessous.
            </div>
          ) : att ? (
            <div style={{ background: "#FFFDF0", border: "1px dashed #E6C84A", borderRadius: 6, padding: 12, marginBottom: 10, fontSize: 11.5, color: "#666" }}>
              {sigStatus === "viewed"
                ? "Le salarié a ouvert le guide mais n'a pas encore signé."
                : "Lien de signature envoyé"}
              {att.signature_recipient_email ? <span> &mdash; à <strong>{att.signature_recipient_email}</strong></span> : null}
              {att.signature_sent_at ? <span> le {fmtDate(att.signature_sent_at)}</span> : null}.
            </div>
          ) : (
            <div style={{ background: "#FAFAFA", border: "1px dashed #BBBBBB", borderRadius: 6, padding: 12, marginBottom: 10, fontSize: 11.5, color: "#666" }}>
              ✗ Pas encore envoyé. Envoie le guide pour que le salarié le lise et signe la reconnaissance de formation &mdash; le PDF signé sera classé dans les Documents ci-dessous.
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {isSigned ? (
              <button className="btn btn-y btn-sm" onClick={openPdf}>📄 Voir le PDF signé</button>
            ) : (
              <button className="btn btn-y btn-sm" onClick={doSend} disabled={sending}>
                {sending ? "Envoi…" : (att ? "🔄 Renvoyer le lien" : "📧 Envoyer le guide pour signature")}
              </button>
            )}
          </div>

          {msg ? <div style={{ marginTop: 8, fontSize: 11, color: "#166534", fontWeight: 700 }}>{msg}</div> : null}
          {err ? <div style={{ marginTop: 8, fontSize: 11, color: "#DC2626", fontWeight: 700 }}>⚠ {err}</div> : null}
        </div>
      )}
    </div>
  )
}
