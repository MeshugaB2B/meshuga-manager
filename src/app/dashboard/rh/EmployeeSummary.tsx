"use client"
// ============================================================
// FILE PATH dans le repo :
//   src/app/dashboard/rh/EmployeeSummary.tsx
// ============================================================
// Bandeau « Synthèse RH » en haut de la fiche salarié : LE seul endroit
// des indicateurs clés, tous reliés aux données réelles.
//   - Solde Congés N (gros) + Congés N-1 (dernier bulletin, fait foi)
//   - Dernier net payé (+ mois)
//   - Guide d'hygiène (statut signé / à signer)
//   - Visite médicale (suivi)
// Lecture live : hr_payslips + hr_attestations (client browser anon).
// ============================================================

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

var PINK = "#FF82D7"
var YELLOW = "#FFEB5A"
var INK = "#191923"

export default function EmployeeSummary(props) {
  var [pay, setPay] = useState(null)
  var [hyg, setHyg] = useState(null)
  var [loading, setLoading] = useState(true)

  var load = async function () {
    setLoading(true)
    try {
      var p = await supabase
        .from("hr_payslips")
        .select("periode, periode_label, net_paye, cp_n1_solde, cp_n_solde")
        .eq("employee_id", props.employeeId)
        .order("periode", { ascending: false })
        .limit(1)
      setPay(p.data && p.data.length ? p.data[0] : null)
    } catch (e) { setPay(null) }
    try {
      var h = await supabase
        .from("hr_attestations")
        .select("signature_status, signature_signed_at")
        .eq("employee_id", props.employeeId)
        .eq("doc_type", "attestation_hygiene")
        .order("created_at", { ascending: false })
        .limit(1)
      setHyg(h.data && h.data.length ? h.data[0] : null)
    } catch (e) { setHyg(null) }
    setLoading(false)
  }
  useEffect(function () { load() }, [props.employeeId])

  var jours = function (n) { return (n === null || n === undefined) ? "—" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) }
  var euro = function (n) { return (n === null || n === undefined) ? "—" : Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" }

  var hygSigned = !!(hyg && (hyg.signature_signed_at || hyg.signature_status === "signed"))
  var hygLabel = hygSigned ? "✓ Signé" : (hyg ? "En cours" : "À envoyer")
  var hygColor = hygSigned ? "#16A34A" : (hyg ? "#B45309" : "#999")

  var tile = { flex: 1, minWidth: 132, border: "2px solid " + INK, borderRadius: 10, padding: "10px 12px", background: "#FFFFFF", boxShadow: "3px 3px 0 " + INK }
  var lbl = { fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.8, color: "#666" }
  var big = { fontSize: 24, fontWeight: 900, color: INK, lineHeight: 1.1, marginTop: 2 }

  return (
    <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
      <div className="ct">📊 Synthèse RH</div>
      {loading ? (
        <div style={{ fontSize: 11.5, color: "#999", padding: "6px 0" }}>Chargement…</div>
      ) : (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={Object.assign({}, tile, { background: "rgba(255,235,90,0.30)" })}>
              <div style={lbl}>Congés N (solde)</div>
              <div style={big}>{jours(pay ? pay.cp_n_solde : null)} <span style={{ fontSize: 11, fontWeight: 700 }}>j</span></div>
            </div>
            <div style={Object.assign({}, tile, { background: "rgba(255,130,215,0.14)" })}>
              <div style={lbl}>Congés N-1 (solde)</div>
              <div style={big}>{jours(pay ? pay.cp_n1_solde : null)} <span style={{ fontSize: 11, fontWeight: 700 }}>j</span></div>
            </div>
            <div style={tile}>
              <div style={lbl}>Dernier net payé</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: INK, lineHeight: 1.1, marginTop: 2 }}>{euro(pay ? pay.net_paye : null)}</div>
              <div style={{ fontSize: 9.5, color: "#666" }}>{pay ? pay.periode_label : "aucun bulletin"}</div>
            </div>
            <div style={tile}>
              <div style={lbl}>Guide d&apos;hygiène</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: hygColor, lineHeight: 1.2, marginTop: 4 }}>{hygLabel}</div>
            </div>
            <div style={tile}>
              <div style={lbl}>Visite médicale</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#B45309", lineHeight: 1.2, marginTop: 4 }}>À suivre</div>
              <div style={{ fontSize: 9.5, color: "#666" }}>EFFICIENCE</div>
            </div>
          </div>
          {pay ? (
            <div style={{ fontSize: 10, color: "#888", marginTop: 8, fontStyle: "italic" }}>
              Soldes de congés au {pay.periode_label} (le bulletin fait foi). Détail dans &laquo; Paie &amp; congés &raquo; ci-dessous.
            </div>
          ) : (
            <div style={{ fontSize: 10.5, color: "#888", marginTop: 8 }}>Aucun bulletin importé — les compteurs s&apos;activeront après import.</div>
          )}
        </div>
      )}
    </div>
  )
}
