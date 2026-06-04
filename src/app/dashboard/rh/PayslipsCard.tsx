"use client"
// ============================================================
// FILE PATH dans le repo :
//   src/app/dashboard/rh/PayslipsCard.tsx
// ============================================================
// Carte « Paie & congés » dans la fiche salarié (EmployeeDetail).
//   - Encart Congés : solde CP N-1 + CP N issu du DERNIER bulletin (fait foi).
//   - Liste des bulletins par mois (net payé) avec accès au PDF archivé.
// Lecture live de hr_payslips (client browser anon).
// ============================================================

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

var PINK = "#FF82D7"
var INK = "#191923"

export default function PayslipsCard(props) {
  var [rows, setRows] = useState([])
  var [loading, setLoading] = useState(true)
  var [openYears, setOpenYears] = useState({})

  var euro = function (n) { return (n === null || n === undefined) ? "—" : Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €" }
  var jours = function (n) { return (n === null || n === undefined) ? "—" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) }

  var load = async function () {
    setLoading(true)
    try {
      var res = await supabase
        .from("hr_payslips")
        .select("id, periode, periode_label, brut, net_paye, cp_n1_solde, cp_n_solde, pdf_path")
        .eq("employee_id", props.employeeId)
        .order("periode", { ascending: false })
      var data = res.data || []
      setRows(data)
      if (data.length) {
        var y = String(data[0].periode || "").slice(0, 4)
        var o = {}; o[y] = true; setOpenYears(o)
      }
    } catch (e) { setRows([]) }
    setLoading(false)
  }
  useEffect(function () { load() }, [props.employeeId])

  var openPdf = function (id) { try { window.open("/api/hr/payslips/" + id + "/pdf", "_blank") } catch (e) {} }
  var toggleYear = function (y) { var o = Object.assign({}, openYears); o[y] = !o[y]; setOpenYears(o) }

  // groupement par année
  var byYear = function () {
    var g = {}
    for (var i = 0; i < rows.length; i++) {
      var y = String(rows[i].periode || "").slice(0, 4)
      if (!g[y]) g[y] = { year: y, rows: [], brut: 0, net: 0 }
      g[y].rows.push(rows[i])
      g[y].brut += Number(rows[i].brut || 0)
      g[y].net += Number(rows[i].net_paye || 0)
    }
    var out = Object.keys(g).map(function (k) { return g[k] })
    out.sort(function (a, b) { return a.year < b.year ? 1 : -1 })
    return out
  }

  var last = rows.length ? rows[0] : null

  return (
    <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
      <div className="ct">💶 Paie &amp; congés</div>

      {loading ? (
        <div style={{ fontSize: 11.5, color: "#999", padding: "8px 0" }}>Chargement…</div>
      ) : rows.length === 0 ? (
        <div style={{ background: "#FAFAFA", border: "1px dashed #BBB", borderRadius: 6, padding: 12, fontSize: 11.5, color: "#666" }}>
          Aucun bulletin importé pour ce salarié. Utilise <strong>Coffre documents → 📄 Importer des bulletins</strong>.
        </div>
      ) : (
        <div>
          {/* Encart congés (dernier bulletin) */}
          {last ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 150, background: "rgba(255,130,215,0.12)", border: "2px solid " + PINK, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", fontWeight: 700 }}>Congés N-1 (solde)</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: INK, lineHeight: 1.1 }}>{jours(last.cp_n1_solde)} <span style={{ fontSize: 12, fontWeight: 700 }}>j</span></div>
              </div>
              <div style={{ flex: 1, minWidth: 150, background: "rgba(255,235,90,0.25)", border: "2px solid " + INK, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", fontWeight: 700 }}>Congés N (solde)</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: INK, lineHeight: 1.1 }}>{jours(last.cp_n_solde)} <span style={{ fontSize: 12, fontWeight: 700 }}>j</span></div>
              </div>
              <div style={{ flex: 1, minWidth: 150, background: "#FFFFFF", border: "2px solid " + INK, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#666", fontWeight: 700 }}>Dernier net payé</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: INK, lineHeight: 1.1 }}>{euro(last.net_paye)}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{last.periode_label}</div>
              </div>
            </div>
          ) : null}
          <div style={{ fontSize: 10.5, color: "#888", marginBottom: 10, fontStyle: "italic" }}>
            Soldes de congés au {last ? last.periode_label : ""} (le bulletin fait foi). {rows.length} bulletins archivés.
          </div>

          {/* Liste par année */}
          {byYear().map(function (grp) {
            var open = !!openYears[grp.year]
            return (
              <div key={grp.year} style={{ marginBottom: 8, border: "1.5px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                <div onClick={function () { toggleYear(grp.year) }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#FAFAFA", cursor: "pointer" }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{open ? "▾" : "▸"} {grp.year} <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>· {grp.rows.length} bulletins</span></div>
                  <div style={{ fontSize: 11, color: "#666" }}>brut {euro(grp.brut)} · net {euro(grp.net)}</div>
                </div>
                {open ? (
                  <div>
                    {grp.rows.map(function (r) {
                      return (
                        <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderTop: "1px solid #F0F0F0", fontSize: 12.5 }}>
                          <div style={{ width: 110, fontWeight: 700 }}>{r.periode_label}</div>
                          <div style={{ flex: 1, color: "#444" }}>net <strong>{euro(r.net_paye)}</strong> · brut {euro(r.brut)}</div>
                          <div style={{ fontSize: 11, color: "#666" }}>CP {jours(r.cp_n1_solde)}/{jours(r.cp_n_solde)}</div>
                          {r.pdf_path ? (
                            <button onClick={function () { openPdf(r.id) }} className="btn btn-sm" style={{ padding: "3px 9px", fontSize: 11 }}>📄 PDF</button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
