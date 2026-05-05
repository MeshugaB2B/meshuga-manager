"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { LOGO_PINK } from "./logos"

// ============================================================
// Meshuga RH — Onglet Ressources Humaines
// Tab unique : liste contrats + wizard nouvelle embauche + preview imprimable
// SWC-safe : var dans JSX, pas de generics, function(){}, pas de optional chaining dans deps
// ============================================================

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

// === Logo Meshuga rose, importé depuis logos.ts ===
var LOGO_PINK_PLACEHOLDER = LOGO_PINK
var STAMP_PINK_PATH = "/stamp-pink.png"  // si dispo dans /public, sinon utilise wordmark fallback

// === Données légales Meshuga (hardcodées car invariantes) ===
var MESHUGA_LEGAL = {
  // AEGIA FOOD — l'opérationnelle qui exploite Meshuga Crazy Deli
  aegia_food: {
    nom: "AEGIA FOOD",
    forme: "Société par Actions Simplifiée",
    capital: "1 000",
    siren: "904 639 531",
    siret: "904 639 531 00014",
    rcs: "Paris 904 639 531",
    tva: "FR31 904 639 531",
    ape: "5610C",
    adresse: "3 rue Vavin, 75006 Paris",
    enseigne: "MESHUGA Crazy Deli"
  },
  // SAS AEGIA — la holding, Présidente d'AEGIA FOOD
  sas_aegia: {
    nom: "SAS AEGIA",
    forme: "Société par Actions Simplifiée",
    capital: "1 000",
    siren: "889 354 965",
    siret: "889 354 965 00028",
    rcs: "Paris 889 354 965",
    tva: "FR76 889 354 965",
    adresse: "78 avenue des Champs-Élysées, Bureau 326, 75008 Paris"
  },
  // Représentant légal final
  president: "Edward TOURET",
  // Caisse de retraite (figée)
  retraite: {
    nom: "KLESIA Retraite AGIRC-ARRCO",
    adresse: "4 rue Georges Picquart, 75017 Paris"
  }
}

// === Constantes ===
var CIVILITES = ["Madame", "Monsieur", "Mademoiselle"]
var NATIONALITES = ["française", "belge", "suisse", "luxembourgeoise", "italienne", "espagnole", "portugaise", "allemande", "britannique", "américaine", "autre"]
var FONCTIONS = ["Caissier(ère)", "Cuisinier(ère)", "Commis de cuisine", "Serveur(se)", "Équipier(ère) polyvalent(e)", "Plongeur(se)"]
var CLASSIFICATIONS = [
  "Niveau I — Échelon 1 (employé(e) débutant(e))",
  "Niveau I — Échelon 2 (employé(e) qualifié(e))",
  "Niveau II — Échelon 1 (employé(e) confirmé(e))",
  "Niveau II — Échelon 2 (employé(e) hautement qualifié(e))"
]
var MOTIFS = [
  "surcroît temporaire d'activité lié à une forte affluence saisonnière",
  "surcroît temporaire d'activité lié à une opération promotionnelle ponctuelle",
  "surcroît temporaire d'activité lié à un événement ponctuel",
  "surcroît temporaire d'activité lié au remplacement d'un salarié temporairement absent"
]

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

// === Helpers ===
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
function diffMin(a, b) {
  if (!a || !b) return 0
  var pa = a.split(":")
  var pb = b.split(":")
  if (pa.length < 2 || pb.length < 2) return 0
  var ma = (+pa[0]) * 60 + (+pa[1])
  var mb = (+pb[0]) * 60 + (+pb[1])
  if (mb < ma) mb += 24 * 60
  return mb - ma
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function RhTab() {
  var [contracts, setContracts] = useState([])
  var [employees, setEmployees] = useState([])
  var [loading, setLoading] = useState(true)
  var [showWizard, setShowWizard] = useState(false)
  var [editingContract, setEditingContract] = useState(null)
  var [previewContract, setPreviewContract] = useState(null)
  var [filter, setFilter] = useState("all")
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
  if (filter !== "all") filtered = contracts.filter(function (c) { return c.status === filter })

  // Compteur extras en cours (utilisé dans le sous-titre)
  var kpiActive = contracts.filter(function (c) {
    return c.status !== "archived" && c.date_fin && new Date(c.date_fin) >= new Date()
  }).length

  return (
    <div>
      {/* === HEADER === */}
      <div className="ph">
        <div>
          <div className="pt">RESSOURCES HUMAINES</div>
          <div className="ps">{kpiActive > 0 ? kpiActive + " extra" + (kpiActive > 1 ? "s" : "") + " en cours · " : ""}CDD d'usage · CCN Restauration Rapide</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-p" onClick={startNew}>+ Nouvelle embauche extra</button>
        </div>
      </div>
      <div className="strip"></div>

      {/* === KPIs === */}
      <div className="g4">
        <div className="kc" style={{ background: "#FFEB5A" }}>
          <div className="kl">Extras en cours</div>
          <div className="kv">{kpiActive}</div>
          <div className="ki">⏱</div>
        </div>
        <div className="kc" style={{ background: "#FF82D7" }}>
          <div className="kl">Total contrats</div>
          <div className="kv">{kpiTotal}</div>
          <div className="ki">📋</div>
        </div>
        <div className="kc" style={{ background: "#FFFFFF" }}>
          <div className="kl">Contrats signés</div>
          <div className="kv">{kpiSigned}</div>
          <div className="ki">✓</div>
        </div>
        <div className="kc" style={{ background: "#FFFFFF" }}>
          <div className="kl">Total heures planifiées</div>
          <div className="kv" style={{ fontSize: 22 }}>{fmtDur(kpiHours)}</div>
          <div className="ki">⌛</div>
        </div>
      </div>

      {/* === FILTRES === */}
      <div className="card">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginRight: 6 }}>Filtrer :</span>
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

      {/* === LISTE === */}
      <div className="card">
        <div className="ct">Contrats</div>
        {loading ? (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", opacity: 0.5 }}>
            <div style={{ fontFamily: "Yellowtail, cursive", fontSize: 24, marginBottom: 4 }}>Aucun contrat</div>
            <div style={{ fontSize: 11 }}>Clique sur "+ Nouvelle embauche extra" pour démarrer.</div>
          </div>
        ) : (
          <div>
            {filtered.map(function (c) {
              var emp = c.hr_employees || {}
              var totalMin = 0
              if (c.hr_contract_vacations) {
                c.hr_contract_vacations.forEach(function (v) { totalMin += (v.duree_minutes || 0) })
              }
              return (
                <div
                  key={c.id}
                  className="row"
                  style={{ gridTemplateColumns: "1.5fr 1.2fr 0.8fr 0.7fr 1.4fr", gap: 10 }}
                >
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>
                      {emp.prenom || "—"} {(emp.nom || "").toUpperCase()}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>
                      {c.fonction || "Fonction non définie"}
                    </div>
                  </div>
                  <div style={{ fontSize: 11 }}>
                    <div>Du {fmtDateShort(c.date_debut)}</div>
                    <div>au {fmtDateShort(c.date_fin)}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900 }}>
                    {fmtDur(totalMin)}
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

      {/* === WIZARD === */}
      {showWizard && (
        <ContractWizard
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
// WIZARD — 4 étapes
// ============================================================
function ContractWizard(props) {
  var existing = props.existing
  var [step, setStep] = useState(1)
  var [saving, setSaving] = useState(false)

  // ===== State : salarié =====
  var [empMode, setEmpMode] = useState(existing && existing.employee_id ? "existing" : "new")
  var [selectedEmpId, setSelectedEmpId] = useState(existing ? existing.employee_id : "")
  var [emp, setEmp] = useState({
    civilite: "",
    prenom: "",
    nom: "",
    date_naissance: "",
    lieu_naissance: "",
    nationalite: "française",
    adresse: "",
    code_postal: "",
    ville: "",
    num_secu: "",
    email: "",
    telephone: ""
  })

  // ===== State : mission / contrat =====
  var [contract, setContract] = useState({
    motif: "",
    date_debut: "",
    date_fin: "",
    fonction: "",
    classification: "",
    taux_horaire_brut: "",
    taux_horaire_lettres: "",
    capital_aegia_food: "",
    capital_sas_aegia: "",
    rcs_sas_aegia: "",
    adresse_sas_aegia: "",
    service_sante_travail: "",
    prevoyance_organisme: "",
    prevoyance_adresse: "",
    ville_signature: "Paris",
    date_signature: ""
  })

  // ===== State : vacations =====
  var [vacations, setVacations] = useState([
    { id: "v1", date_vacation: "", heure_debut: "", heure_fin: "" },
    { id: "v2", date_vacation: "", heure_debut: "", heure_fin: "" },
    { id: "v3", date_vacation: "", heure_debut: "", heure_fin: "" }
  ])

  // ===== Hydratation depuis contrat existant =====
  useEffect(function () {
    if (!existing) return
    if (existing.hr_employees) {
      var e = existing.hr_employees
      setEmp({
        civilite: e.civilite || "",
        prenom: e.prenom || "",
        nom: e.nom || "",
        date_naissance: e.date_naissance || "",
        lieu_naissance: e.lieu_naissance || "",
        nationalite: e.nationalite || "française",
        adresse: e.adresse || "",
        code_postal: e.code_postal || "",
        ville: e.ville || "",
        num_secu: e.num_secu || "",
        email: e.email || "",
        telephone: e.telephone || ""
      })
      setSelectedEmpId(e.id)
      setEmpMode("existing")
    }
    setContract({
      motif: existing.motif || "",
      date_debut: existing.date_debut || "",
      date_fin: existing.date_fin || "",
      fonction: existing.fonction || "",
      classification: existing.classification || "",
      taux_horaire_brut: existing.taux_horaire_brut || "",
      taux_horaire_lettres: existing.taux_horaire_lettres || "",
      capital_aegia_food: existing.capital_aegia_food || "",
      capital_sas_aegia: existing.capital_sas_aegia || "",
      rcs_sas_aegia: existing.rcs_sas_aegia || "",
      adresse_sas_aegia: existing.adresse_sas_aegia || "",
      service_sante_travail: existing.service_sante_travail || "",
      prevoyance_organisme: existing.prevoyance_organisme || "",
      prevoyance_adresse: existing.prevoyance_adresse || "",
      ville_signature: existing.ville_signature || "Paris",
      date_signature: existing.date_signature || ""
    })
    if (existing.hr_contract_vacations && existing.hr_contract_vacations.length) {
      setVacations(existing.hr_contract_vacations.map(function (v, i) {
        return {
          id: "v" + i,
          date_vacation: v.date_vacation || "",
          heure_debut: v.heure_debut || "",
          heure_fin: v.heure_fin || ""
        }
      }))
    }
  }, [])

  // ===== Vacations helpers =====
  function addVac() {
    setVacations(function (vs) { return vs.concat([{ id: "v" + Date.now(), date_vacation: "", heure_debut: "", heure_fin: "" }]) })
  }
  function delVac(id) {
    setVacations(function (vs) { return vs.filter(function (v) { return v.id !== id }) })
  }
  function updVac(id, field, value) {
    setVacations(function (vs) {
      return vs.map(function (v) {
        if (v.id !== id) return v
        var nv = {}; for (var k in v) nv[k] = v[k]
        nv[field] = value
        return nv
      })
    })
  }
  var totalMin = 0
  vacations.forEach(function (v) { totalMin += diffMin(v.heure_debut, v.heure_fin) })

  // ===== Sauvegarde =====
  async function saveDraft() {
    setSaving(true)
    try {
      var empId = selectedEmpId
      // Créer ou mettre à jour le salarié
      if (empMode === "new") {
        var newEmp = await supabase.from("hr_employees").insert([emp]).select().single()
        if (newEmp.error) throw newEmp.error
        empId = newEmp.data.id
      } else if (empMode === "existing" && existing && existing.employee_id) {
        // Mettre à jour le salarié existant si modifié
        await supabase.from("hr_employees").update(emp).eq("id", existing.employee_id)
      }

      var contractData = {
        employee_id: empId,
        motif: contract.motif,
        date_debut: contract.date_debut || null,
        date_fin: contract.date_fin || null,
        fonction: contract.fonction,
        classification: contract.classification,
        taux_horaire_brut: contract.taux_horaire_brut ? parseFloat(contract.taux_horaire_brut) : null,
        taux_horaire_lettres: contract.taux_horaire_lettres,
        capital_aegia_food: contract.capital_aegia_food,
        capital_sas_aegia: contract.capital_sas_aegia,
        rcs_sas_aegia: contract.rcs_sas_aegia,
        adresse_sas_aegia: contract.adresse_sas_aegia,
        service_sante_travail: contract.service_sante_travail,
        prevoyance_organisme: contract.prevoyance_organisme,
        prevoyance_adresse: contract.prevoyance_adresse,
        ville_signature: contract.ville_signature,
        date_signature: contract.date_signature || null,
        status: "draft"
      }

      var contractId
      if (existing) {
        await supabase.from("hr_contracts").update(contractData).eq("id", existing.id)
        contractId = existing.id
        // Supprimer les anciennes vacations
        await supabase.from("hr_contract_vacations").delete().eq("contract_id", contractId)
      } else {
        var newC = await supabase.from("hr_contracts").insert([contractData]).select().single()
        if (newC.error) throw newC.error
        contractId = newC.data.id
      }

      // Insérer les vacations valides
      var vacRows = []
      vacations.forEach(function (v, i) {
        if (v.date_vacation && v.heure_debut && v.heure_fin) {
          vacRows.push({
            contract_id: contractId,
            date_vacation: v.date_vacation,
            heure_debut: v.heure_debut,
            heure_fin: v.heure_fin,
            ordre: i
          })
        }
      })
      if (vacRows.length) {
        await supabase.from("hr_contract_vacations").insert(vacRows)
      }

      props.onSaved("Brouillon enregistré ✓")
    } catch (err) {
      alert("Erreur : " + (err.message || err))
      setSaving(false)
    }
  }

  // ===== Style overlay =====
  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl">

        {/* HEADER */}
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mt">{existing ? "Éditer le contrat" : "Nouvelle embauche extra"}</div>
            <button
              className="btn btn-sm"
              onClick={props.onClose}
              style={{ background: "#FFFFFF" }}
            >×</button>
          </div>
          {/* Stepper */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[1, 2, 3, 4].map(function (n) {
              var labels = { 1: "Salarié·e", 2: "Mission", 3: "Planning", 4: "Récap" }
              return (
                <div
                  key={n}
                  onClick={function () { setStep(n) }}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    background: step === n ? "#191923" : "#FFFFFF",
                    color: step === n ? "#FFEB5A" : "#191923",
                    border: "2px solid #191923",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  {n}. {labels[n]}
                </div>
              )
            })}
          </div>
        </div>

        {/* BODY */}
        <div className="mb">
          {/* === ÉTAPE 1 : Salarié === */}
          {step === 1 && (
            <div>
              <div className="ct">Identité du salarié·e</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                <span
                  className={"tag " + (empMode === "new" ? "on" : "")}
                  onClick={function () { setEmpMode("new") }}
                >Nouveau salarié</span>
                <span
                  className={"tag " + (empMode === "existing" ? "on" : "")}
                  onClick={function () { setEmpMode("existing") }}
                >Salarié existant</span>
              </div>

              {empMode === "existing" && (
                <div className="fg">
                  <label className="lbl">Choisir un salarié déjà enregistré</label>
                  <select
                    className="inp"
                    value={selectedEmpId}
                    onChange={function (e) {
                      var id = e.target.value
                      setSelectedEmpId(id)
                      var found = props.employees.find(function (x) { return x.id === id })
                      if (found) setEmp({
                        civilite: found.civilite || "",
                        prenom: found.prenom || "",
                        nom: found.nom || "",
                        date_naissance: found.date_naissance || "",
                        lieu_naissance: found.lieu_naissance || "",
                        nationalite: found.nationalite || "française",
                        adresse: found.adresse || "",
                        code_postal: found.code_postal || "",
                        ville: found.ville || "",
                        num_secu: found.num_secu || "",
                        email: found.email || "",
                        telephone: found.telephone || ""
                      })
                    }}
                  >
                    <option value="">— Choisir —</option>
                    {props.employees.map(function (e) {
                      return <option key={e.id} value={e.id}>{e.prenom} {e.nom}</option>
                    })}
                  </select>
                </div>
              )}

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Civilité</label>
                  <select
                    className="inp"
                    value={emp.civilite}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { civilite: e.target.value })) }}
                  >
                    <option value="">—</option>
                    {CIVILITES.map(function (c) { return <option key={c} value={c}>{c}</option> })}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Nationalité</label>
                  <select
                    className="inp"
                    value={emp.nationalite}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { nationalite: e.target.value })) }}
                  >
                    {NATIONALITES.map(function (n) { return <option key={n} value={n}>{n}</option> })}
                  </select>
                </div>
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Prénom</label>
                  <input
                    className="inp"
                    value={emp.prenom}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { prenom: e.target.value })) }}
                    placeholder="Marie"
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Nom</label>
                  <input
                    className="inp"
                    value={emp.nom}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { nom: e.target.value })) }}
                    placeholder="DUPONT"
                  />
                </div>
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Date de naissance</label>
                  <input
                    className="inp"
                    type="date"
                    value={emp.date_naissance}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { date_naissance: e.target.value })) }}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Lieu de naissance</label>
                  <input
                    className="inp"
                    value={emp.lieu_naissance}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { lieu_naissance: e.target.value })) }}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="fg">
                <label className="lbl">Adresse complète (n°, rue)</label>
                <input
                  className="inp"
                  value={emp.adresse}
                  onChange={function (e) { setEmp(Object.assign({}, emp, { adresse: e.target.value })) }}
                  placeholder="12 rue de Rivoli"
                />
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Code postal</label>
                  <input
                    className="inp"
                    value={emp.code_postal}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { code_postal: e.target.value })) }}
                    placeholder="75001"
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Ville</label>
                  <input
                    className="inp"
                    value={emp.ville}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { ville: e.target.value })) }}
                    placeholder="Paris"
                  />
                </div>
              </div>

              <div className="fg">
                <label className="lbl">Numéro de sécurité sociale (15 chiffres)</label>
                <input
                  className="inp"
                  value={emp.num_secu}
                  onChange={function (e) { setEmp(Object.assign({}, emp, { num_secu: e.target.value })) }}
                  placeholder="2 07 03 92 002 081 84"
                />
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Email (optionnel)</label>
                  <input
                    className="inp"
                    type="email"
                    value={emp.email}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { email: e.target.value })) }}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Téléphone (optionnel)</label>
                  <input
                    className="inp"
                    value={emp.telephone}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { telephone: e.target.value })) }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* === ÉTAPE 2 : Mission === */}
          {step === 2 && (
            <div>
              <div className="ct">Mission & rémunération</div>

              <div className="fg">
                <label className="lbl">Motif du contrat (CDD d'usage)</label>
                <select
                  className="inp"
                  value={contract.motif}
                  onChange={function (e) { setContract(Object.assign({}, contract, { motif: e.target.value })) }}
                >
                  <option value="">— Choisir un motif —</option>
                  {MOTIFS.map(function (m) { return <option key={m} value={m}>{m}</option> })}
                </select>
                <textarea
                  className="inp"
                  style={{ marginTop: 6 }}
                  rows={2}
                  value={contract.motif}
                  onChange={function (e) { setContract(Object.assign({}, contract, { motif: e.target.value })) }}
                  placeholder="Tu peux aussi taper un motif personnalisé ici"
                />
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Date de début</label>
                  <input
                    className="inp"
                    type="date"
                    value={contract.date_debut}
                    onChange={function (e) { setContract(Object.assign({}, contract, { date_debut: e.target.value })) }}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Date de fin</label>
                  <input
                    className="inp"
                    type="date"
                    value={contract.date_fin}
                    onChange={function (e) { setContract(Object.assign({}, contract, { date_fin: e.target.value })) }}
                  />
                </div>
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Fonction</label>
                  <select
                    className="inp"
                    value={contract.fonction}
                    onChange={function (e) { setContract(Object.assign({}, contract, { fonction: e.target.value })) }}
                  >
                    <option value="">—</option>
                    {FONCTIONS.map(function (f) { return <option key={f} value={f}>{f}</option> })}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Classification CCN 1501</label>
                  <select
                    className="inp"
                    value={contract.classification}
                    onChange={function (e) { setContract(Object.assign({}, contract, { classification: e.target.value })) }}
                  >
                    <option value="">—</option>
                    {CLASSIFICATIONS.map(function (c) { return <option key={c} value={c}>{c}</option> })}
                  </select>
                </div>
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Taux horaire brut (€)</label>
                  <input
                    className="inp"
                    type="number"
                    step="0.01"
                    value={contract.taux_horaire_brut}
                    onChange={function (e) { setContract(Object.assign({}, contract, { taux_horaire_brut: e.target.value })) }}
                    placeholder="17.00"
                  />
                </div>
                <div className="fg">
                  <label className="lbl">En lettres</label>
                  <input
                    className="inp"
                    value={contract.taux_horaire_lettres}
                    onChange={function (e) { setContract(Object.assign({}, contract, { taux_horaire_lettres: e.target.value })) }}
                    placeholder="dix-sept"
                  />
                </div>
              </div>

              <div className="ct" style={{ marginTop: 16 }}>Mentions légales obligatoires</div>
              <div style={{fontSize:11,opacity:0.6,marginBottom:10,fontStyle:"italic",lineHeight:1.5}}>
                Les données AEGIA FOOD et SAS AEGIA sont enregistrées définitivement (capitaux, RCS, adresses, dirigeants). Saisis ici les 2 organismes de protection sociale obligatoires.
              </div>

              <div className="fg">
                <label className="lbl">Service de santé au travail</label>
                <input
                  className="inp"
                  value={contract.service_sante_travail}
                  onChange={function (e) { setContract(Object.assign({}, contract, { service_sante_travail: e.target.value })) }}
                  placeholder="ex. CMIE, 75 rue de Lourmel, 75015 Paris"
                />
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Organisme prévoyance</label>
                  <input
                    className="inp"
                    value={contract.prevoyance_organisme}
                    onChange={function (e) { setContract(Object.assign({}, contract, { prevoyance_organisme: e.target.value })) }}
                    placeholder="KLESIA Prévoyance"
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Adresse prévoyance</label>
                  <input
                    className="inp"
                    value={contract.prevoyance_adresse}
                    onChange={function (e) { setContract(Object.assign({}, contract, { prevoyance_adresse: e.target.value })) }}
                    placeholder="4 rue Georges Picquart, 75017 Paris"
                  />
                </div>
              </div>
            </div>
          )}

          {/* === ÉTAPE 3 : Planning === */}
          {step === 3 && (
            <div>
              <div className="ct">Planning des vacations</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
                Ajoute une ligne par jour de travail. La durée est calculée automatiquement.
                Les lignes incomplètes (dates ou horaires manquants) seront ignorées à la sauvegarde.
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 10 }}>
                <thead>
                  <tr>
                    <th style={{ background: "#FF82D7", color: "#FFFFFF", padding: 6, fontSize: 10, textAlign: "left", border: "2px solid #191923" }}>Date</th>
                    <th style={{ background: "#FF82D7", color: "#FFFFFF", padding: 6, fontSize: 10, textAlign: "center", border: "2px solid #191923" }}>Début</th>
                    <th style={{ background: "#FF82D7", color: "#FFFFFF", padding: 6, fontSize: 10, textAlign: "center", border: "2px solid #191923" }}>Fin</th>
                    <th style={{ background: "#FF82D7", color: "#FFFFFF", padding: 6, fontSize: 10, textAlign: "center", border: "2px solid #191923" }}>Durée</th>
                    <th style={{ background: "#FF82D7", color: "#FFFFFF", padding: 6, fontSize: 10, border: "2px solid #191923", width: 30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {vacations.map(function (v) {
                    var d = diffMin(v.heure_debut, v.heure_fin)
                    return (
                      <tr key={v.id}>
                        <td style={{ padding: 4, border: "2px solid #191923" }}>
                          <input
                            className="inp"
                            type="date"
                            value={v.date_vacation}
                            onChange={function (e) { updVac(v.id, "date_vacation", e.target.value) }}
                            style={{ boxShadow: "none", padding: 4 }}
                          />
                        </td>
                        <td style={{ padding: 4, border: "2px solid #191923" }}>
                          <input
                            className="inp"
                            type="time"
                            value={v.heure_debut}
                            onChange={function (e) { updVac(v.id, "heure_debut", e.target.value) }}
                            style={{ boxShadow: "none", padding: 4, textAlign: "center" }}
                          />
                        </td>
                        <td style={{ padding: 4, border: "2px solid #191923" }}>
                          <input
                            className="inp"
                            type="time"
                            value={v.heure_fin}
                            onChange={function (e) { updVac(v.id, "heure_fin", e.target.value) }}
                            style={{ boxShadow: "none", padding: 4, textAlign: "center" }}
                          />
                        </td>
                        <td style={{ padding: 4, border: "2px solid #191923", textAlign: "center", fontWeight: 900, fontSize: 12 }}>
                          {fmtDur(d)}
                        </td>
                        <td style={{ padding: 4, border: "2px solid #191923", textAlign: "center" }}>
                          <button
                            className="btn btn-sm btn-red"
                            onClick={function () { delVac(v.id) }}
                            style={{ padding: "2px 6px" }}
                          >×</button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr>
                    <td colSpan={3} style={{ padding: 8, background: "#FFEB5A", border: "2px solid #191923", fontWeight: 900, textTransform: "uppercase", fontSize: 11 }}>Total</td>
                    <td style={{ padding: 8, background: "#FFEB5A", border: "2px solid #191923", textAlign: "center", fontWeight: 900, fontSize: 13 }}>{fmtDur(totalMin)}</td>
                    <td style={{ background: "#FFEB5A", border: "2px solid #191923" }}></td>
                  </tr>
                </tbody>
              </table>

              <button className="btn btn-y" onClick={addVac}>+ Ajouter une vacation</button>

              <div className="fg2" style={{ marginTop: 16 }}>
                <div className="fg">
                  <label className="lbl">Ville de signature</label>
                  <input
                    className="inp"
                    value={contract.ville_signature}
                    onChange={function (e) { setContract(Object.assign({}, contract, { ville_signature: e.target.value })) }}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Date de signature</label>
                  <input
                    className="inp"
                    type="date"
                    value={contract.date_signature}
                    onChange={function (e) { setContract(Object.assign({}, contract, { date_signature: e.target.value })) }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* === ÉTAPE 4 : Récap === */}
          {step === 4 && (
            <div>
              <div className="ct">Récapitulatif</div>
              <div style={{ background: "#FFEB5A", padding: 12, borderRadius: 6, border: "2px solid #191923", marginBottom: 10 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>
                  {emp.civilite} {emp.prenom} {(emp.nom || "").toUpperCase()}
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {contract.fonction || "Fonction non définie"} · {contract.classification || "Classification non définie"}
                </div>
                <div style={{ fontSize: 11 }}>
                  Du {fmtDate(contract.date_debut)} au {fmtDate(contract.date_fin)}
                </div>
                <div style={{ fontSize: 11 }}>
                  {vacations.filter(function (v) { return v.date_vacation && v.heure_debut && v.heure_fin }).length} vacations · Total {fmtDur(totalMin)}
                </div>
                <div style={{ fontSize: 11 }}>
                  Taux horaire : {contract.taux_horaire_brut || "—"} € brut/h
                </div>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                <p>→ Clique <b>Sauvegarder le brouillon</b> pour enregistrer le contrat.</p>
                <p>→ Tu pourras ensuite <b>"Voir / Imprimer"</b> dans la liste pour générer le PDF brandé.</p>
                <p>→ Une fois signé physiquement, utilise <b>"Uploader signé"</b> pour archiver la copie.</p>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="mf">
          {step > 1 && (
            <button
              className="btn"
              onClick={function () { setStep(step - 1) }}
            >← Précédent</button>
          )}
          {step < 4 && (
            <button
              className="btn btn-p"
              onClick={function () { setStep(step + 1) }}
            >Suivant →</button>
          )}
          {step === 4 && (
            <button
              className="btn btn-g"
              onClick={saveDraft}
              disabled={saving}
            >{saving ? "Enregistrement…" : "Sauvegarder le brouillon ✓"}</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PREVIEW : iframe avec HTML brandé Meshuga, bouton imprimer
// ============================================================
function ContractPreview(props) {
  var c = props.contract
  var emp = c.hr_employees || {}
  var vacs = (c.hr_contract_vacations || []).slice().sort(function (a, b) { return (a.ordre || 0) - (b.ordre || 0) })
  var iframeRef = useRef(null)

  function buildHtml() {
    var totalMin = 0
    vacs.forEach(function (v) { totalMin += (v.duree_minutes || 0) })

    function safe(s) {
      if (s === null || s === undefined || s === "") return "—"
      return String(s)
    }

    var planningRows = vacs.map(function (v) {
      var dur = v.duree_minutes || 0
      var h = Math.floor(dur / 60), m = dur % 60
      var dt = new Date(v.date_vacation)
      var dateStr = dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      return '<tr><td>' + dateStr + '</td><td style="text-align:center">' + (v.heure_debut || "").slice(0, 5) + '</td><td style="text-align:center">' + (v.heure_fin || "").slice(0, 5) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + h + ' h ' + (m < 10 ? "0" : "") + m + '</td></tr>'
    }).join("")

    var totalH = Math.floor(totalMin / 60), totalM = totalMin % 60

    var html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Contrat extra Meshuga</title>'
      + '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">'
      + '<style>'
      + '*{box-sizing:border-box;margin:0;padding:0}'
      + 'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;font-size:13px;line-height:1.55;background:#fff}'
      + '.yt{font-family:"Yellowtail",cursive;font-weight:400}'
      + '.page{max-width:21cm;margin:0 auto;padding:1.5cm}'
      + '.toolbar{position:sticky;top:0;z-index:50;background:#191923;color:#FFEB5A;padding:14px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #FFEB5A}'
      + '.toolbar h1{font-family:"Yellowtail",cursive;font-size:28px;color:#FF82D7}'
      + '.btn{font-family:"Arial Narrow",sans-serif;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;padding:10px 16px;border:2px solid #191923;border-radius:4px;cursor:pointer;background:#fff;color:#191923}'
      + '.btn.primary{background:#FF82D7;color:#fff;border-color:#fff}'
      + '.cover{text-align:center;padding:8px 0 24px}'
      + '.cover img{max-width:280px;width:80%;height:auto;display:block;margin:0 auto 6px}'
      + '.cover .place{font-size:11px;font-weight:700;letter-spacing:2.5px;margin-bottom:18px}'
      + '.cover h2{font-size:24px;font-weight:900;letter-spacing:1px;margin-bottom:4px}'
      + '.cover .subtitle{font-size:11px;color:#666;font-style:italic}'
      + '.cover .rule{height:3px;background:#FF82D7;margin:18px auto 0}'
      + '.parties h3{font-family:"Yellowtail",cursive;font-size:22px;font-weight:400;margin:14px 0 8px;color:#C2185B}'
      + '.parties p{margin-bottom:8px;text-align:justify;font-size:12.5px}'
      + '.party-tag{display:block;text-align:right;font-style:italic;color:#666;font-size:11px;margin-top:2px}'
      + '.party-side{display:block;text-align:right;font-weight:900;font-size:11px;letter-spacing:1px;margin-top:2px;margin-bottom:14px}'
      + '.bold-center{text-align:center;font-weight:900;font-size:14px;letter-spacing:1px;margin:18px 0 24px}'
      + '.art{margin:22px 0 10px;padding-bottom:5px;border-bottom:1.5px solid #FF82D7;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;page-break-after:avoid}'
      + '.art-num{font-family:"Yellowtail",cursive;font-size:24px;color:#FF82D7;line-height:1}'
      + '.art-title{font-family:"Yellowtail",cursive;font-size:18px;color:#191923;line-height:1.1}'
      + '.body p{margin-bottom:9px;text-align:justify;font-size:12.5px;line-height:1.55}'
      + '.body ul{list-style:none;margin:6px 0 12px 18px}'
      + '.body ul li{position:relative;padding-left:18px;margin-bottom:4px;text-align:justify;font-size:12.5px}'
      + '.body ul li::before{content:"—";position:absolute;left:0;color:#FF82D7;font-weight:700}'
      + '.body strong{font-weight:900}'
      + '.sub-clause{margin-bottom:9px;text-align:justify;font-size:12.5px;line-height:1.55}'
      + '.clause-label{font-weight:900}'
      + '.cctv{margin:6px 0 12px 18px;font-size:12.5px}'
      + '.cctv li{position:relative;padding-left:18px;margin-bottom:4px;list-style:none}'
      + '.cctv li::before{content:"—";position:absolute;left:0;color:#FF82D7;font-weight:700}'
      + '.planning{width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:12px}'
      + '.planning th{background:#FF82D7;color:#fff;padding:8px 10px;font-weight:900;text-align:left;letter-spacing:.5px;text-transform:uppercase;font-size:11px}'
      + '.planning td{padding:6px 10px;border:1px solid #DDD;font-size:12px}'
      + '.planning tr:nth-child(even) td{background:#FAFAFA}'
      + '.planning tfoot td{background:#FFEB5A;font-weight:900;font-size:12.5px;padding:9px 10px;border:1px solid #191923}'
      + '.note{font-size:11px;color:#666;font-style:italic;margin:6px 0 14px}'
      + '.note b{color:#C2185B;font-style:normal;font-weight:900}'
      + '.sig-section{margin-top:32px;page-break-before:always;padding-top:8px}'
      + '.sig-section h2{font-family:"Yellowtail",cursive;font-size:42px;color:#FF82D7;text-align:center;font-weight:400;line-height:1;margin-bottom:8px}'
      + '.sig-section .rule{height:2px;background:#FF82D7;margin:0 0 28px}'
      + '.fait-banner{background:#FFF8E1;border-top:3px solid #FF82D7;border-bottom:3px solid #FF82D7;padding:18px;text-align:center;margin-bottom:32px;font-size:14px}'
      + '.fait-banner .small{display:block;font-size:11px;color:#666;font-style:italic;margin-top:6px}'
      + '.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}'
      + '.sig-block{display:grid;grid-template-rows:48px 96px minmax(160px,1fr) 40px;border:2px solid #FF82D7;background:#fff}'
      + '.sig-head{background:#FF82D7;color:#fff;padding:0 16px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1.5px}'
      + '.sig-id{background:#FFEB5A;padding:10px 16px;border-bottom:2px solid #FF82D7;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}'
      + '.sig-id .name{font-size:15px;font-weight:900;color:#191923;line-height:1.2;margin-bottom:4px}'
      + '.sig-id .role{font-size:11px;color:#666;font-style:italic;line-height:1.3}'
      + '.sig-space{padding:14px 16px;display:flex;flex-direction:column;font-size:11px;color:#666;font-style:italic}'
      + '.sig-foot{background:#FAFAFA;border-top:1px solid #DDD;padding:0 16px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;font-style:italic}'
      + '@media print{@page{size:A4;margin:2.2cm 1.4cm 1.6cm 1.4cm;@top-center{content:element(running-header)}}.toolbar{display:none}.page{padding:0;max-width:none}.art{break-inside:avoid;break-after:avoid}.sig-section{break-before:page}.sig-block{break-inside:avoid}'
      + '.sig-head,.sig-id,.planning th,.planning tfoot td,.fait-banner,.art,.art-num,.running-header{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
      + '.running-header{position:running(running-header);display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #FF82D7;padding-bottom:6px;font-family:Arial Narrow,sans-serif;font-size:9px;color:#666}'
      + '.running-header img{height:18px;width:auto}'
      + '.running-header .tag{font-style:italic;letter-spacing:1px;text-transform:uppercase}'
      + '</style></head><body>'
      + '<div class="running-header">'
      + (LOGO_PINK_PLACEHOLDER ? '<img src="' + LOGO_PINK_PLACEHOLDER + '" alt="Meshuga">' : '<span style="font-family:Yellowtail,cursive;font-size:18px;color:#FF82D7">meshuga</span>')
      + '<span class="tag">CONTRAT D\'EXTRA · ' + (emp.prenom || '') + ' ' + ((emp.nom || '').toUpperCase()) + '</span></div>'
      + '<div class="toolbar"><h1>meshuga · contrat d\'extra</h1>'
      + '<button class="btn primary" onclick="window.print()">Imprimer en PDF</button></div>'
      + '<div class="page">'
      + '<div class="cover">'
      + (LOGO_PINK_PLACEHOLDER ? '<img src="' + LOGO_PINK_PLACEHOLDER + '" alt="Meshuga">' : '<div style="font-family:Yellowtail,cursive;font-size:96px;color:#FF82D7;line-height:1">meshuga</div>')
      + '<div class="place">CRAZY DELI &nbsp;·&nbsp; 3 RUE VAVIN &nbsp;·&nbsp; PARIS 6<sup>e</sup></div>'
      + '<h2>CONTRAT DE TRAVAIL D\'EXTRA</h2>'
      + '<div class="subtitle">CDD d\'usage &nbsp;·&nbsp; Article L.1242-2, 3° du Code du travail &nbsp;·&nbsp; CCN Restauration Rapide (IDCC 1501)</div>'
      + '<div class="rule"></div></div>'
      // PARTIES
      + '<div class="parties"><h3>Entre les soussignés</h3>'
      + '<p><strong>La société ' + MESHUGA_LEGAL.aegia_food.nom + '</strong>, ' + MESHUGA_LEGAL.aegia_food.forme + ' au capital social de <strong>' + MESHUGA_LEGAL.aegia_food.capital + ' €</strong>, immatriculée au Registre du Commerce et des Sociétés de ' + MESHUGA_LEGAL.aegia_food.rcs + ', dont le siège social est situé <strong>' + MESHUGA_LEGAL.aegia_food.adresse + '</strong>, code APE ' + MESHUGA_LEGAL.aegia_food.ape + ', SIRET ' + MESHUGA_LEGAL.aegia_food.siret + ', N° TVA intracommunautaire ' + MESHUGA_LEGAL.aegia_food.tva + ', exploitant l\'enseigne <strong>' + MESHUGA_LEGAL.aegia_food.enseigne + '</strong>,</p>'
      + '<p>représentée par sa Présidente, la société <strong>' + MESHUGA_LEGAL.sas_aegia.nom + '</strong>, ' + MESHUGA_LEGAL.sas_aegia.forme + ' au capital de <strong>' + MESHUGA_LEGAL.sas_aegia.capital + ' €</strong>, immatriculée au RCS de ' + MESHUGA_LEGAL.sas_aegia.rcs + ', dont le siège social est situé <strong>' + MESHUGA_LEGAL.sas_aegia.adresse + '</strong>, SIRET ' + MESHUGA_LEGAL.sas_aegia.siret + ', elle-même représentée par son Président, <strong>Monsieur ' + MESHUGA_LEGAL.president + '</strong>, dûment habilité aux fins des présentes.</p>'
      + '<span class="party-tag">Ci-après dénommée « <b>l\'Employeur</b> » ou « <b>la Société</b> »</span>'
      + '<span class="party-side">D\'UNE PART</span>'
      + '<p class="bold-center" style="margin:8px 0 14px">ET</p>'
      + '<p><strong>' + safe(emp.civilite) + ' ' + safe(emp.prenom) + ' ' + (emp.nom || "").toUpperCase() + '</strong>, né(e) le <strong>' + (emp.date_naissance ? new Date(emp.date_naissance).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—") + '</strong> à <strong>' + safe(emp.lieu_naissance) + '</strong>, de nationalité <strong>' + safe(emp.nationalite) + '</strong>, demeurant <strong>' + safe(emp.adresse) + ', ' + safe(emp.code_postal) + ' ' + safe(emp.ville) + '</strong>, numéro de sécurité sociale : <strong>' + safe(emp.num_secu) + '</strong>.</p>'
      + '<span class="party-tag">Ci-après dénommé(e) « <b>le/la Salarié(e)</b> »</span>'
      + '<span class="party-side">D\'AUTRE PART</span>'
      + '<p style="text-align:center;font-style:italic;color:#666;font-size:11px;margin:14px 0 6px">Ensemble dénommées « les Parties ».</p>'
      + '<p class="bold-center">IL A ÉTÉ CONVENU ET ARRÊTÉ CE QUI SUIT :</p></div>'
      // ART 1
      + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Nature et motif du contrat</span></div>'
      + '<div class="body">'
      + '<p>Le présent contrat est conclu en application des articles <strong>L.1242-2, 3°</strong> et <strong>D.1242-1</strong> du Code du travail, qui visent expressément le secteur de l\'hôtellerie-restauration parmi ceux dans lesquels il est d\'usage constant de ne pas recourir au contrat à durée indéterminée en raison de la nature de l\'activité exercée et du caractère par nature temporaire de ces emplois.</p>'
      + '<p>Il s\'agit d\'un <strong>contrat à durée déterminée d\'usage (CDD d\'usage)</strong>, improprement dénommé « contrat d\'extra » dans le langage courant de la restauration. Il est conclu pour le temps strictement nécessaire à l\'exécution des vacations énumérées à l\'Article 2 ci-après, à l\'occasion d\'un : <strong>' + safe(c.motif) + '</strong>.</p>'
      + '<p>Conformément à l\'article L.1242-12 du Code du travail, le présent contrat est établi par écrit et comporte la définition précise de son motif. À défaut, il serait réputé conclu à durée indéterminée.</p>'
      + '</div>'
      // ART 2
      + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Durée du contrat et planning des vacations</span></div>'
      + '<div class="body">'
      + '<p>Le présent contrat prend effet le <strong>' + (c.date_debut ? new Date(c.date_debut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—") + '</strong> et expire de plein droit, sans formalité ni indemnité, le <strong>' + (c.date_fin ? new Date(c.date_fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—") + '</strong> au terme de la dernière vacation, soit à la fin de la mission confiée au/à la Salarié(e).</p>'
      + '<p>Les Parties conviennent expressément que chaque vacation constitue une mission distincte au sein du présent contrat-cadre. Le planning est arrêté comme suit :</p>'
      + '<table class="planning"><thead><tr><th>Date</th><th style="text-align:center">Début</th><th style="text-align:center">Fin</th><th style="text-align:center">Durée</th></tr></thead>'
      + '<tbody>' + (planningRows || '<tr><td colspan="4" style="text-align:center;font-style:italic;color:#999;padding:20px">Aucune vacation enregistrée</td></tr>') + '</tbody>'
      + '<tfoot><tr><td colspan="3" style="text-transform:uppercase;letter-spacing:1px">Total</td><td style="text-align:center">' + totalH + ' h ' + (totalM < 10 ? "0" : "") + totalM + '</td></tr></tfoot></table>'
      + '<p class="note"><b>Note :</b> La mention des plages horaires précises est <b>obligatoire</b> conformément à l\'article L.3123-6 du Code du travail dès lors que la durée de travail est inférieure à la durée légale (35 h/semaine).</p>'
      + '<p>Le présent contrat n\'est pas renouvelable par tacite reconduction.</p>'
      + '</div>'
      // ART 3
      + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Période d\'essai</span></div>'
      + '<div class="body"><p>Compte tenu de la durée totale du contrat (inférieure à un mois) et conformément à l\'article L.1242-10 du Code du travail, les Parties conviennent expressément que <strong>le présent contrat n\'est soumis à aucune période d\'essai</strong>.</p></div>'
      // ART 4
      + '<div class="art"><span class="art-num">Article 4.</span><span class="art-title">Fonctions et qualification</span></div>'
      + '<div class="body">'
      + '<p>Le/la Salarié(e) est engagé(e) en qualité de <strong>' + safe(c.fonction) + '</strong>, classé(e) <strong>' + safe(c.classification) + '</strong> selon la grille de classification de la Convention Collective Nationale de la Restauration Rapide (IDCC 1501).</p>'
      + '<p>À ce titre, il/elle assurera notamment :</p>'
      + '<ul><li>L\'accueil de la clientèle, la prise de commande et l\'encaissement le cas échéant ;</li>'
      + '<li>Le service en salle et/ou au comptoir ainsi que le débarrassage ;</li>'
      + '<li>La préparation, l\'assemblage et le service des produits proposés à la carte ;</li>'
      + '<li>La mise en place et la remise en état du poste de travail avant et après service ;</li>'
      + '<li>Toute tâche connexe relevant strictement de sa qualification, dans le respect des règles d\'hygiène (HACCP, arrêté du 21/12/2009).</li></ul>'
      + '<p>Le/la Salarié(e) s\'engage à exécuter ses fonctions avec loyauté, diligence et professionnalisme, dans le respect des consignes données par sa hiérarchie et des standards de qualité de l\'enseigne MESHUGA.</p>'
      + '</div>'
      // ART 5
      + '<div class="art"><span class="art-num">Article 5.</span><span class="art-title">Lieu de travail</span></div>'
      + '<div class="body"><p>Le/la Salarié(e) exercera ses fonctions dans les locaux de l\'établissement MESHUGA Crazy Deli situé au <strong>3 rue Vavin, 75006 Paris</strong>.</p>'
      + '<p>Cette mention ne constitue pas une clause de sédentarité. Le/la Salarié(e) pourra ponctuellement être amené(e) à se déplacer pour les besoins du service, dans la limite de la région Île-de-France et après son accord.</p></div>'
      // ART 6
      + '<div class="art"><span class="art-num">Article 6.</span><span class="art-title">Rémunération et avantages</span></div>'
      + '<div class="body">'
      + '<p class="sub-clause"><span class="clause-label">6.1 — Taux horaire forfaitaire.</span> En contrepartie de l\'exécution de ses fonctions, le/la Salarié(e) percevra une rémunération brute horaire <strong>forfaitaire</strong> de <strong>' + safe(c.taux_horaire_brut) + ' €</strong> (' + safe(c.taux_horaire_lettres) + ' euros), conformément aux dispositions légales et conventionnelles en vigueur, et au minimum supérieure au SMIC horaire et au minimum conventionnel du niveau/échelon applicable.</p>'
      + '<p class="sub-clause"><span class="clause-label">6.2 — Travail du dimanche.</span> Compte tenu de la nature de l\'activité de restauration, l\'établissement MESHUGA ouvre habituellement le dimanche. La CCN Restauration Rapide (IDCC 1501) <strong>ne prévoit pas de majoration spécifique au titre du travail dominical</strong> pour les salariés des établissements ouvrant habituellement le dimanche. En conséquence, les Parties conviennent expressément que <strong>le taux horaire forfaitaire prévu à l\'Article 6.1 inclut toute éventuelle contrepartie au titre du travail effectué le dimanche</strong>, sans majoration distincte.</p>'
      + '<p class="sub-clause"><span class="clause-label">6.3 — Jours fériés.</span> Conformément à l\'article <strong>L.3133-6</strong> du Code du travail, le travail effectué le <strong>1<sup>er</sup> mai</strong> donnera lieu, en plus du salaire correspondant, à une indemnité égale au montant du salaire (majoration de 100 %). Pour <strong>les autres jours fériés</strong>, la CCN Restauration Rapide n\'imposant pas de majoration spécifique, le taux horaire forfaitaire prévu à l\'Article 6.1 s\'applique sans majoration distincte.</p>'
      + '<p class="sub-clause"><span class="clause-label">6.4 — Indemnité compensatrice de congés payés.</span> Conformément à l\'article L.1242-16 du Code du travail, le/la Salarié(e) percevra à l\'issue du contrat une indemnité compensatrice de congés payés égale à <strong>10 % de la rémunération totale brute</strong> perçue pendant la durée du contrat.</p>'
      + '<p class="sub-clause"><span class="clause-label">6.5 — Indemnité de fin de contrat.</span> Le présent contrat étant un CDD d\'usage conclu en application de l\'article L.1242-2, 3° du Code du travail, et conformément à l\'article <strong>L.1243-10, 1°</strong> dudit Code, l\'indemnité de fin de contrat (dite « indemnité de précarité ») <strong>n\'est pas due</strong> au/à la Salarié(e) qui le reconnaît expressément.</p>'
      + '<p class="sub-clause"><span class="clause-label">6.6 — Avantage en nature « repas ».</span> Lorsque le/la Salarié(e) prend un repas sur le lieu de travail à l\'occasion de ses fonctions, cet avantage est évalué et déclaré conformément à la valeur forfaitaire URSSAF en vigueur (4,22 € par repas en 2025), et apparaîtra sur le bulletin de paie selon les modalités conventionnelles applicables.</p>'
      + '</div>'
      // ART 7
      + '<div class="art"><span class="art-num">Article 7.</span><span class="art-title">Visite d\'information et de prévention</span></div>'
      + '<div class="body"><p>Conformément à l\'article R.4624-10 du Code du travail, le/la Salarié(e) bénéficiera d\'une <strong>Visite d\'Information et de Prévention (VIP)</strong> réalisée par le service de prévention et de santé au travail dont relève l\'Employeur (' + safe(c.service_sante_travail) + '), dans un délai maximal de 3 mois à compter de la prise effective de poste.</p></div>'
      // ART 8
      + '<div class="art"><span class="art-num">Article 8.</span><span class="art-title">Convention collective et protection sociale</span></div>'
      + '<div class="body">'
      + '<p class="sub-clause"><span class="clause-label">8.1 — Convention collective applicable.</span> Les conditions de travail du/de la Salarié(e) sont régies par les dispositions de la <strong>Convention Collective Nationale de la Restauration Rapide (IDCC 1501)</strong>.</p>'
      + '<p class="sub-clause"><span class="clause-label">8.2 — Caisse de retraite complémentaire.</span> L\'Employeur cotise auprès de <strong>' + MESHUGA_LEGAL.retraite.nom + '</strong>, ' + MESHUGA_LEGAL.retraite.adresse + '.</p>'
      + '<p class="sub-clause"><span class="clause-label">8.3 — Organisme de prévoyance et complémentaire santé.</span> L\'Employeur a souscrit auprès de <strong>' + safe(c.prevoyance_organisme) + '</strong>, ' + safe(c.prevoyance_adresse) + ', un contrat collectif de prévoyance et de complémentaire santé conformément aux dispositions conventionnelles applicables.</p>'
      + '<p class="sub-clause"><span class="clause-label">8.4 — Déclarations sociales.</span> La Société établit la Déclaration Préalable à l\'Embauche (DPAE) auprès de l\'URSSAF d\'Île-de-France et transmet, via la Déclaration Sociale Nominative (DSN), l\'ensemble des informations sociales relatives au/à la Salarié(e).</p>'
      + '</div>'
      // ART 9
      + '<div class="art"><span class="art-num">Article 9.</span><span class="art-title">Tenue de travail et règles d\'hygiène</span></div>'
      + '<div class="body"><p>Le/la Salarié(e) s\'engage à respecter les standards d\'apparence et d\'hygiène applicables au sein de l\'établissement MESHUGA Crazy Deli, conformément à la réglementation en vigueur (arrêté du 21/12/2009 et HACCP).</p>'
      + '<p>L\'Employeur mettra à disposition la tenue professionnelle nécessaire que le/la Salarié(e) s\'engage à porter pendant ses heures de travail et à restituer au terme du contrat.</p></div>'
      // ART 10
      + '<div class="art"><span class="art-num">Article 10.</span><span class="art-title">Confidentialité et loyauté</span></div>'
      + '<div class="body"><p>Le/la Salarié(e) s\'engage à observer la discrétion la plus stricte sur toutes les informations dont il/elle aura connaissance à l\'occasion de ses fonctions, en particulier celles relatives aux recettes, fournisseurs, prix de revient, procédés, données clients et données financières de la Société.</p>'
      + '<p>Cette obligation de confidentialité demeurera en vigueur tant pendant l\'exécution du contrat qu\'après sa cessation, pour une durée de deux (2) ans.</p></div>'
      // ART 11
      + '<div class="art"><span class="art-num">Article 11.</span><span class="art-title">Vidéosurveillance et données personnelles</span></div>'
      + '<div class="body">'
      + '<p class="sub-clause"><span class="clause-label">11.1 — Information vidéosurveillance.</span> Le/la Salarié(e) est expressément informé(e) que l\'établissement est placé sous vidéosurveillance :</p>'
      + '<ul class="cctv">'
      + '<li><b>Finalités :</b> sécurité des biens et des personnes, prévention des vols.</li>'
      + '<li><b>Base légale :</b> intérêt légitime de l\'Employeur (art. 6.1.f RGPD).</li>'
      + '<li><b>Zones couvertes :</b> salle / caisse / réserve, à l\'exclusion de tout local de pause ou des sanitaires.</li>'
      + '<li><b>Durée de conservation :</b> 30 jours maximum.</li>'
      + '<li><b>Droits :</b> accès, rectification, effacement, opposition (à exercer auprès de la direction).</li>'
      + '<li><b>Réclamation :</b> auprès de la CNIL — www.cnil.fr.</li></ul>'
      + '<p class="sub-clause"><span class="clause-label">11.2 — Données personnelles RH.</span> Les données personnelles du/de la Salarié(e) sont traitées par la Société en sa qualité de responsable de traitement, conformément au RGPD. Elles sont conservées pendant la durée du contrat et 5 ans après sa cessation pour les besoins légaux et probatoires.</p>'
      + '</div>'
      // ART 12
      + '<div class="art"><span class="art-num">Article 12.</span><span class="art-title">Cumul d\'emplois et exclusivité</span></div>'
      + '<div class="body"><p>Le/la Salarié(e) déclare être libre de tout engagement vis-à-vis d\'un précédent employeur et n\'être soumis(e) à aucune clause de non-concurrence.</p>'
      + '<p>Si le/la Salarié(e) exerce une autre activité salariée parallèlement au présent contrat, il/elle s\'engage à en informer immédiatement l\'Employeur et à veiller au respect des durées maximales du travail (10 h/jour, 48 h/semaine, 44 h en moyenne sur 12 semaines consécutives).</p></div>'
      // ART 13
      + '<div class="art"><span class="art-num">Article 13.</span><span class="art-title">Rupture anticipée</span></div>'
      + '<div class="body"><p>Conformément à l\'article L.1243-1 du Code du travail, le présent contrat ne peut être rompu avant l\'échéance du terme qu\'en cas de :</p>'
      + '<ul><li>Accord des Parties constaté par écrit ;</li>'
      + '<li>Faute grave de l\'une des Parties ;</li>'
      + '<li>Force majeure ;</li>'
      + '<li>Inaptitude médicale constatée par le médecin du travail ;</li>'
      + '<li>Embauche par le/la Salarié(e) en contrat à durée indéterminée.</li></ul>'
      + '<p>Toute rupture en dehors de ces cas ouvre droit, au profit de la partie lésée, à des dommages et intérêts dans les conditions prévues par le Code du travail.</p></div>'
      // ART 14
      + '<div class="art"><span class="art-num">Article 14.</span><span class="art-title">Dispositions diverses</span></div>'
      + '<div class="body">'
      + '<p class="sub-clause"><span class="clause-label">14.1 — Règlement intérieur.</span> Le/la Salarié(e) déclare avoir pris connaissance du règlement intérieur de l\'établissement (le cas échéant) et s\'engage à en respecter les dispositions.</p>'
      + '<p class="sub-clause"><span class="clause-label">14.2 — Changement de situation.</span> Le/la Salarié(e) s\'engage à informer la Société, dans les plus brefs délais, de tout changement affectant sa situation personnelle.</p>'
      + '<p class="sub-clause"><span class="clause-label">14.3 — Avenants.</span> Toute modification du présent contrat ne pourra résulter que d\'un avenant écrit signé des deux Parties.</p>'
      + '<p class="sub-clause"><span class="clause-label">14.4 — Nullité partielle.</span> Si l\'une quelconque des stipulations venait à être déclarée nulle ou inapplicable, les autres stipulations conserveraient toute leur force et leur portée.</p>'
      + '</div>'
      // ART 15
      + '<div class="art"><span class="art-num">Article 15.</span><span class="art-title">Domicile et juridiction compétente</span></div>'
      + '<div class="body"><p>Pour l\'exécution des présentes, les Parties élisent domicile en leurs adresses respectives mentionnées en tête du contrat.</p>'
      + '<p>Le présent contrat est soumis au droit français. Tout litige relatif à sa conclusion, son exécution ou sa rupture relèvera de la compétence exclusive du Conseil de Prud\'hommes de Paris, sous réserve des règles d\'ordre public en matière de compétence territoriale.</p></div>'
      // SIGNATURES
      + '<section class="sig-section"><h2>Signatures</h2><div class="rule"></div>'
      + '<div class="fait-banner">Fait à <strong>' + safe(c.ville_signature) + '</strong>, en deux exemplaires originaux, le <strong>' + (c.date_signature ? new Date(c.date_signature).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—") + '</strong>.<span class="small">Chaque page doit être paraphée par les deux Parties.</span></div>'
      + '<div class="sig-grid">'
      + '<div class="sig-block">'
      + '<div class="sig-head">Pour l\'Employeur</div>'
      + '<div class="sig-id"><div class="name">AEGIA FOOD</div><div class="role">SAS AEGIA, Présidente<br>représentée par Edward TOURET, Président</div></div>'
      + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé »</div>'
      + '<div class="sig-foot" style="display:flex;align-items:center;justify-content:center;gap:8px">'
      + '<span style="font-family:Yellowtail,cursive;font-size:14px;color:#FF82D7">cachet</span>'
      + '<span style="opacity:.5">·</span>'
      + '<span style="font-style:italic">SAS AEGIA</span>'
      + '</div>'
      + '</div>'
      + '<div class="sig-block">'
      + '<div class="sig-head">Le/la Salarié(e)</div>'
      + '<div class="sig-id"><div class="name">' + safe(emp.prenom) + ' ' + (emp.nom || "").toUpperCase() + '</div><div class="role">&nbsp;</div></div>'
      + '<div class="sig-space">Signature précédée de la mention manuscrite « Lu et approuvé »</div>'
      + '<div class="sig-foot">Date : __ / __ / ____</div>'
      + '</div>'
      + '</div></section>'
      + '</div></body></html>'
    return html
  }

  useEffect(function () {
    if (!iframeRef.current) return
    var doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(buildHtml())
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
