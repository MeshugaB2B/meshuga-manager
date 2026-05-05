"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { LOGO_PINK } from "./logos"
import RhWizard from "./rh/RhWizard"
import EmployeeDetail from "./rh/EmployeeDetail"
import { buildContract } from "./rh/contractBuilders"
import { getContractTypeMeta, CONTRACT_TYPES } from "./rh/rhConstants"

// ============================================================
// Meshuga RH — Onglet Ressources Humaines
// Tab unique : liste contrats + wizard (Extra + 3 CDI) + preview imprimable
// La logique des contrats (constantes, validators, builders, wizard) est dans /rh/
// SWC-safe : var dans JSX, pas de generics, function(){}, pas de optional chaining dans deps
// ============================================================

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

// === Logo Meshuga rose, importé depuis logos.ts ===
var LOGO_PINK_PLACEHOLDER = LOGO_PINK

var STATUS_LABELS = {
  draft: "Brouillon",
  finalized: "Finalisé",
  signed: "Signé ✓",
  archived: "Archivé"
}
var STATUS_COLORS = {
  draft: "#888",
  finalized: "#005FFF",
  signed: "#009D3A",
  archived: "#666"
}

// === Helpers basiques (pour le listing) ===
function fmtDate(d) {
  if (!d) return ""
  var dt = new Date(d)
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}
function fmtDateShort(d) {
  if (!d) return ""
  var dt = new Date(d)
  return dt.toLocaleDateString("fr-FR")
}
function fmtDur(mins) {
  if (!mins || mins <= 0) return "—"
  var h = Math.floor(mins / 60)
  var m = mins % 60
  return h + " h " + (m < 10 ? "0" : "") + m
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function RhTab() {
  var [contracts, setContracts] = useState([])
  var [employees, setEmployees] = useState([])
  var [docCounts, setDocCounts] = useState({}) // { employeeId: count }
  var [loading, setLoading] = useState(true)
  var [showWizard, setShowWizard] = useState(false)
  var [editingContract, setEditingContract] = useState(null)
  var [previewContract, setPreviewContract] = useState(null)
  var [viewingEmployee, setViewingEmployee] = useState(null)
  var [activeView, setActiveView] = useState("contracts") // "contracts" | "employees"
  var [filter, setFilter] = useState("all")
  var [typeFilter, setTypeFilter] = useState("all")
  var [toast, setToast] = useState("")

  function showToast(msg) {
    setToast(msg)
    setTimeout(function () { setToast("") }, 2500)
  }

  async function loadAll() {
    setLoading(true)
    var resC = await supabase
      .from("hr_contracts")
      .select("*, hr_employees(*), hr_contract_vacations(*)")
      .order("created_at", { ascending: false })
    var resE = await supabase
      .from("hr_employees")
      .select("*")
      .order("nom", { ascending: true })
    // Fetch doc counts for each employee
    var resDocs = await supabase
      .from("hr_employee_documents")
      .select("employee_id")
    var counts = {}
    if (resDocs.data) {
      resDocs.data.forEach(function (d) {
        counts[d.employee_id] = (counts[d.employee_id] || 0) + 1
      })
    }
    setDocCounts(counts)
    setContracts(resC.data || [])
    setEmployees(resE.data || [])
    setLoading(false)
  }

  useEffect(function () { loadAll() }, [])

  function startNew() {
    setEditingContract(null)
    setShowWizard(true)
  }

  function editDraft(c) {
    setEditingContract(c)
    setShowWizard(true)
  }

  async function deleteContract(c) {
    if (!confirm("Supprimer définitivement ce contrat ? Cette action est irréversible.")) return
    await supabase.from("hr_contracts").delete().eq("id", c.id)
    showToast("Contrat supprimé")
    loadAll()
  }

  async function uploadSigned(c, file) {
    if (!file) return
    var ext = file.name.split(".").pop()
    var path = "contracts/" + c.id + "/signed-" + Date.now() + "." + ext
    var up = await supabase.storage.from("signed-contracts").upload(path, file)
    if (up.error) {
      alert("Erreur upload : " + up.error.message)
      return
    }
    await supabase.from("hr_contracts").update({
      signed_pdf_url: path,
      status: "signed",
      signed_at: new Date().toISOString(),
      signed_uploaded_at: new Date().toISOString()
    }).eq("id", c.id)
    showToast("Contrat signé enregistré")
    loadAll()
  }

  async function viewSigned(c) {
    if (!c.signed_pdf_url) return
    var res = await supabase.storage.from("signed-contracts").createSignedUrl(c.signed_pdf_url, 3600)
    if (res.data && res.data.signedUrl) {
      window.open(res.data.signedUrl, "_blank")
    }
  }

  // ===== Filtrage =====
  var filtered = contracts
  if (filter !== "all") filtered = filtered.filter(function (c) { return c.status === filter })
  if (typeFilter !== "all") filtered = filtered.filter(function (c) { return (c.type || "extra") === typeFilter })

  // Compteur extras en cours
  var kpiActive = contracts.filter(function (c) {
    var t = c.type || "extra"
    return c.status !== "archived" && t === "extra" && c.date_fin && new Date(c.date_fin) >= new Date()
  }).length

  // Compteur CDI actifs
  var kpiCdi = contracts.filter(function (c) {
    var t = c.type || "extra"
    return c.status !== "archived" && t !== "extra"
  }).length

  // Sous-titre dynamique
  var subtitleParts = []
  if (kpiCdi > 0) subtitleParts.push(kpiCdi + " CDI")
  if (kpiActive > 0) subtitleParts.push(kpiActive + " extra" + (kpiActive > 1 ? "s" : "") + " en cours")
  var subtitle = subtitleParts.length ? subtitleParts.join(" · ") + " · " : ""

  return (
    <div>
      {/* === HEADER === */}
      <div className="ph">
        <div>
          <div className="pt">RESSOURCES HUMAINES</div>
          <div className="ps">{subtitle}CCN Restauration Rapide (IDCC 1501)</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-p" onClick={startNew}>+ Nouveau contrat</button>
        </div>
      </div>
      <div className="strip"></div>

      {/* === BARRE D'ONGLETS VUE === */}
      <div className="card" style={{ display: "flex", gap: 6, padding: 8 }}>
        <button
          onClick={function () { setActiveView("contracts") }}
          style={{
            flex: "1 1 0",
            padding: "10px 8px",
            background: activeView === "contracts" ? "#FFEB5A" : "#FFFFFF",
            color: "#191923",
            border: "2px solid #191923",
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: ".5px"
          }}
        >
          📄 Contrats ({contracts.length})
        </button>
        <button
          onClick={function () { setActiveView("employees") }}
          style={{
            flex: "1 1 0",
            padding: "10px 8px",
            background: activeView === "employees" ? "#FFEB5A" : "#FFFFFF",
            color: "#191923",
            border: "2px solid #191923",
            borderRadius: 4,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            textTransform: "uppercase",
            letterSpacing: ".5px"
          }}
        >
          👥 Salariés ({employees.length})
        </button>
      </div>

      {/* === FILTRES (vue Contrats uniquement) === */}
      {activeView === "contracts" && (
      <div className="card">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginRight: 6 }}>Type :</span>
          <span
            className={"tag " + (typeFilter === "all" ? "on" : "")}
            onClick={function () { setTypeFilter("all") }}
          >Tous</span>
          {CONTRACT_TYPES.map(function (t) {
            return (
              <span
                key={t.key}
                className={"tag " + (typeFilter === t.key ? "on" : "")}
                onClick={function () { setTypeFilter(t.key) }}
              >
                {t.icon} {t.label}
              </span>
            )
          })}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginRight: 6 }}>Statut :</span>
          {["all", "draft", "finalized", "signed", "archived"].map(function (s) {
            return (
              <span
                key={s}
                className={"tag " + (filter === s ? "on" : "")}
                onClick={function () { setFilter(s) }}
              >
                {s === "all" ? "Tous" : STATUS_LABELS[s]}
              </span>
            )
          })}
        </div>
      </div>
      )}

      {/* === VUE SALARIÉS === */}
      {activeView === "employees" && (
      <div className="card">
        <div className="ct">Salariés</div>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
        ) : employees.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", opacity: 0.5 }}>
            <div style={{ fontFamily: "Yellowtail, cursive", fontSize: 24, marginBottom: 4 }}>Aucun salarié</div>
            <div style={{ fontSize: 11 }}>Crée d'abord un contrat pour ajouter un salarié.</div>
          </div>
        ) : (
          <div>
            {employees.map(function (e) {
              var nbContracts = contracts.filter(function (c) { return c.employee_id === e.id }).length
              var nbDocs = docCounts[e.id] || 0
              return (
                <div
                  key={e.id}
                  className="row"
                  style={{
                    gridTemplateColumns: "auto 2fr 1fr 1fr 1fr",
                    gap: 10
                  }}
                >
                  <div
                    style={{ fontSize: 22, cursor: "pointer" }}
                    onClick={function () { setViewingEmployee({ employee: e, defaultTab: "infos" }) }}
                  >👤</div>
                  <div
                    style={{ cursor: "pointer" }}
                    onClick={function () { setViewingEmployee({ employee: e, defaultTab: "infos" }) }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 13 }}>
                      {e.prenom || "—"} {(e.nom || "").toUpperCase()}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>
                      {e.email || e.telephone || "—"}
                    </div>
                  </div>
                  <div
                    style={{ fontSize: 11, cursor: "pointer" }}
                    onClick={function () { setViewingEmployee({ employee: e, defaultTab: "contrats" }) }}
                    title="Voir les contrats"
                  >
                    <b>{nbContracts}</b> contrat{nbContracts > 1 ? "s" : ""}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      cursor: "pointer",
                      color: nbDocs > 0 ? "#FF82D7" : "#666",
                      fontWeight: nbDocs > 0 ? 900 : 400
                    }}
                    onClick={function () { setViewingEmployee({ employee: e, defaultTab: "documents" }) }}
                    title="Voir les documents en 1 clic"
                  >
                    📁 <b>{nbDocs}</b> doc{nbDocs > 1 ? "s" : ""}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button
                      className="btn btn-sm btn-y"
                      onClick={function () { setViewingEmployee({ employee: e, defaultTab: "infos" }) }}
                    >Voir →</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* === LISTE DES CONTRATS (vue Contrats uniquement) === */}
      {activeView === "contracts" && (
      <div className="card">
        <div className="ct">Contrats</div>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", opacity: 0.5 }}>
            <div style={{ fontFamily: "Yellowtail, cursive", fontSize: 24, marginBottom: 4 }}>Aucun contrat</div>
            <div style={{ fontSize: 11 }}>Clique sur "+ Nouveau contrat" pour démarrer.</div>
          </div>
        ) : (
          <div>
            {filtered.map(function (c) {
              var emp = c.hr_employees || {}
              var t = c.type || "extra"
              var meta = getContractTypeMeta(t)
              var totalMin = 0
              if (c.hr_contract_vacations) {
                c.hr_contract_vacations.forEach(function (v) { totalMin += (v.duree_minutes || 0) })
              }
              var isCdi = (t !== "extra")
              return (
                <div
                  key={c.id}
                  className="row"
                  style={{ gridTemplateColumns: "1.5fr 1fr 1fr 0.7fr 0.7fr 1.4fr", gap: 10 }}
                >
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>
                      {emp.prenom || "—"} {(emp.nom || "").toUpperCase()}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>
                      {c.fonction || "Fonction non définie"}
                    </div>
                  </div>
                  <div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: meta.color,
                      color: "#191923",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: ".5px"
                    }}>
                      {meta.icon} {meta.label.replace("CDI ", "")}
                    </span>
                  </div>
                  <div style={{ fontSize: 11 }}>
                    {isCdi ? (
                      <div>Embauche : {fmtDateShort(c.date_embauche || c.date_debut)}</div>
                    ) : (
                      <div>
                        <div>Du {fmtDateShort(c.date_debut)}</div>
                        <div>au {fmtDateShort(c.date_fin)}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900 }}>
                    {isCdi
                      ? (c.salaire_brut_mensuel ? c.salaire_brut_mensuel + " €/mois" : "—")
                      : fmtDur(totalMin)}
                  </div>
                  <div>
                    <span
                      className="badge"
                      style={{
                        background: STATUS_COLORS[c.status] || "#888",
                        color: "#FFFFFF",
                        borderColor: STATUS_COLORS[c.status] || "#888"
                      }}
                    >
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-sm"
                      onClick={function () { if (emp && emp.id) setViewingEmployee({ employee: emp, defaultTab: "infos" }) }}
                      title="Voir la fiche du salarié"
                    >👤 Salarié</button>
                    <button
                      className="btn btn-sm btn-y"
                      onClick={function () { setPreviewContract(c) }}
                    >Voir / Imprimer</button>
                    {c.status === "draft" && (
                      <button
                        className="btn btn-sm"
                        onClick={function () { editDraft(c) }}
                      >Éditer</button>
                    )}
                    {c.signed_pdf_url ? (
                      <button
                        className="btn btn-sm btn-g"
                        onClick={function () { viewSigned(c) }}
                      >Signé ↗</button>
                    ) : (
                      <UploadButton onFile={function (f) { uploadSigned(c, f) }} />
                    )}
                    <button
                      className="btn btn-sm btn-red"
                      onClick={function () { deleteContract(c) }}
                      title="Supprimer"
                    >×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      )}

      {/* === WIZARD === */}
      {showWizard && (
        <RhWizard
          existing={editingContract}
          employees={employees}
          onClose={function () { setShowWizard(false); setEditingContract(null) }}
          onSaved={function (msg) {
            setShowWizard(false)
            setEditingContract(null)
            showToast(msg || "Contrat enregistré")
            loadAll()
          }}
        />
      )}

      {/* === PREVIEW === */}
      {previewContract && (
        <ContractPreview
          contract={previewContract}
          onClose={function () { setPreviewContract(null) }}
        />
      )}

      {/* === EMPLOYEE DETAIL === */}
      {viewingEmployee && (
        <EmployeeDetail
          employee={viewingEmployee.employee}
          defaultTab={viewingEmployee.defaultTab || "infos"}
          onClose={function () { setViewingEmployee(null); loadAll() }}
          onSaved={function (msg) { showToast(msg); loadAll() }}
          onDeleted={function (msg) {
            setViewingEmployee(null)
            showToast(msg || "Salarié supprimé")
            loadAll()
          }}
          onContractClick={function (c) {
            setViewingEmployee(null)
            setPreviewContract(c)
          }}
        />
      )}

      {/* === TOAST === */}
      {toast && <div className="toast show">{toast}</div>}
    </div>
  )
}

// ============================================================
// UPLOAD BUTTON (input file caché)
// ============================================================
function UploadButton(props) {
  var ref = useRef(null)
  return (
    <span>
      <input
        ref={ref}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/heic"
        style={{ display: "none" }}
        onChange={function (e) {
          var f = e.target.files && e.target.files[0]
          if (f) props.onFile(f)
          if (ref.current) ref.current.value = ""
        }}
      />
      <button
        className="btn btn-sm btn-p"
        onClick={function () { if (ref.current) ref.current.click() }}
      >↑ Uploader signé</button>
    </span>
  )
}

// ============================================================
// CONTRACT PREVIEW (utilise buildContract du module rh)
// ============================================================
function ContractPreview(props) {
  var c = props.contract
  var emp = c.hr_employees || {}
  var vacs = (c.hr_contract_vacations || []).slice().sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0) })
  var iframeRef = useRef(null)

  useEffect(function () {
    if (!iframeRef.current) return
    var doc = iframeRef.current.contentDocument
    if (!doc) return
    var html = buildContract(c, emp, vacs, LOGO_PINK_PLACEHOLDER)
    doc.open()
    doc.write(html)
    doc.close()
  }, [])

  function printNow() {
    if (!iframeRef.current) return
    iframeRef.current.contentWindow.focus()
    iframeRef.current.contentWindow.print()
  }

  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl" style={{ maxWidth: 920, height: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="mt">Aperçu du contrat</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-y" onClick={printNow}>↓ Imprimer en PDF</button>
              <button className="btn" onClick={props.onClose}>Fermer</button>
            </div>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          style={{ flex: 1, width: "100%", border: "none", background: "#EDEDED" }}
          title="Contrat preview"
        />
      </div>
    </div>
  )
}
