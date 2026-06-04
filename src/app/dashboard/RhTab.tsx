"use client"
// ============================================================
// FILE PATH dans le repo :
//   src/app/dashboard/RhTab.tsx
// ============================================================
// v3 (29/05/2026) — REFONTE UX « RESSOURCES HUMAINES »
//   Direction : HUB centré ÉQUIPE + barre « À TRAITER » + sous-nav 5 sections.
//   - Header ROSE « Salut Edward » + bouton embauche
//   - Barre À TRAITER (jaune) : avenants à signer, brouillons, dossiers incomplets,
//     régularisations welcome pack — chips cliquables qui basculent de section.
//   - 4 KPIs + rond de progression « dossiers OK x/7 »
//   - Sous-nav en pills : Équipe / Contrats & avenants / Coffre docs / Conformité / Congés
//   - Cartes salariés : AVATAR COULEUR PAR POSTE (cuisine rouge, caisse bleu,
//     salle vert, commercial rose, direction noir) + point de statut en coin.
//   - Carte « Embaucher / extra » en pointillés.
//   ON NE JETTE RIEN : tout le moteur existant (RhWizard, EmployeeDetail, avenants,
//   welcome pack, signature, offboarding, retro-import, SignaturesPendingWidget,
//   ContractPreview, WelcomePackPreview) est conservé et rebranché à l'identique.
// SWC-safe : var partout, pas de generics, function(){}, pas d'optional chaining
//   en deps useEffect, sous-composants top-level, &apos; dans le texte JSX.
// ============================================================

import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { LOGO_PINK } from "./logos"
import RhWizard from "./rh/RhWizard"
import EmployeeDetail from "./rh/EmployeeDetail"
import SignaturesPendingWidget from "./rh/SignaturesPendingWidget"
import RetroUploadWizard from "./rh/RetroUploadWizard"
import PayslipsImportWizard from "./rh/PayslipsImportWizard"
import OffboardingWizard from "./rh/OffboardingWizard"
import { buildContract } from "./rh/contractBuilders"
import { buildWelcomePack } from "./rh/welcomePackBuilder"
import { getContractTypeMeta, MESHUGA_LEGAL } from "./rh/rhConstants"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

// ============================================================
// CODE COULEUR PAR POSTE
// Cuisine → rouge #CC0066 | Caisse/accueil → bleu #005FFF |
// Salle/équipier → vert #009D3A | Commercial B2B → rose #FF82D7 |
// Direction/admin → noir #191923 (initiale jaune)
// Résolution : fonction (prioritaire) puis type de contrat (fallback).
// ============================================================
function getPosteMeta(fonction, type) {
  var f = (fonction || "").toLowerCase()
  var t = (type || "").toLowerCase()

  // Direction / admin
  if (f.indexOf("directeur") >= 0 || f.indexOf("directrice") >= 0 || f.indexOf("direction") >= 0
      || f.indexOf("gérant") >= 0 || f.indexOf("gerant") >= 0 || f.indexOf("président") >= 0
      || f.indexOf("president") >= 0 || f.indexOf("administr") >= 0) {
    return { key: "direction", label: "Direction / admin", color: "#191923", textColor: "#FFEB5A" }
  }
  // Commercial B2B (inclut développement commercial / agent de maîtrise / cadre)
  if (f.indexOf("commercial") >= 0 || f.indexOf("b2b") >= 0 || f.indexOf("business") >= 0
      || f.indexOf("développement") >= 0 || f.indexOf("developpement") >= 0 || f.indexOf("vente") >= 0
      || t === "cdi_agent_maitrise" || t === "cdi_cadre") {
    return { key: "commercial", label: "Commercial B2B", color: "#FF82D7", textColor: "#191923" }
  }
  // Cuisine
  if (f.indexOf("cuisin") >= 0 || f.indexOf("chef") >= 0 || f.indexOf("plonge") >= 0
      || t === "cdi_cuisinier") {
    return { key: "cuisine", label: "Cuisine", color: "#CC0066", textColor: "#FFFFFF" }
  }
  // Caisse / accueil (la responsabilité caisse prime sur le service en salle)
  if (f.indexOf("caiss") >= 0 || f.indexOf("vendeu") >= 0 || f.indexOf("accueil") >= 0
      || f.indexOf("comptoir") >= 0 || t === "cdi_caissier") {
    return { key: "caisse", label: "Caisse / accueil", color: "#005FFF", textColor: "#FFFFFF" }
  }
  // Salle / équipier
  if (f.indexOf("serveu") >= 0 || f.indexOf("salle") >= 0 || f.indexOf("équipier") >= 0
      || f.indexOf("equipier") >= 0 || f.indexOf("runner") >= 0) {
    return { key: "salle", label: "Salle / équipier", color: "#009D3A", textColor: "#FFFFFF" }
  }
  // Fallback
  return { key: "autre", label: "Équipe", color: "#191923", textColor: "#FFEB5A" }
}

var POSTE_LEGEND = [
  { color: "#CC0066", label: "Cuisine" },
  { color: "#005FFF", label: "Caisse / accueil" },
  { color: "#009D3A", label: "Salle / équipier" },
  { color: "#FF82D7", label: "Commercial B2B" },
  { color: "#191923", label: "Direction" }
]

function getInitials(prenom, nom) {
  var p = (prenom || "").trim()
  var n = (nom || "").trim()
  var a = p ? p.charAt(0) : ""
  var b = n ? n.charAt(0) : ""
  var res = (a + b).toUpperCase()
  return res || "?"
}

// Critères de complétude « dossier » (on ignore volontairement les champs
// systématiquement vides à ce stade — HACCP / contact d'urgence — qui sont
// suivis à part dans CONFORMITÉ pour ne pas plomber artificiellement le score).
function dossierState(e) {
  var hasSecu = !!(e.num_secu && String(e.num_secu).trim())
  var hasAdresse = !!(e.adresse && String(e.adresse).trim())
  var hasNaissance = !!e.date_naissance
  var hasContact = !!((e.email && String(e.email).trim()) || (e.telephone && String(e.telephone).trim()))
  var hasWelcome = e.welcome_pack_signed === true
  var checks = [hasSecu, hasAdresse, hasNaissance, hasContact, hasWelcome]
  var done = 0
  var missing = []
  if (hasSecu) { done++ } else { missing.push("N° sécurité sociale") }
  if (hasAdresse) { done++ } else { missing.push("Adresse") }
  if (hasNaissance) { done++ } else { missing.push("Date de naissance") }
  if (hasContact) { done++ } else { missing.push("Email ou téléphone") }
  if (hasWelcome) { done++ } else { missing.push("Dossier de bienvenue signé") }
  return { done: done, total: checks.length, ok: done === checks.length, missing: missing }
}

// ============================================================
// COMPOSANTS PRÉSENTATIONNELS (top-level, SWC-safe)
// ============================================================
function PosteAvatar(props) {
  var meta = props.meta
  var size = props.size || 46
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: meta.color, color: meta.textColor,
        border: "2px solid #191923", boxShadow: "2px 2px 0 #191923",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 900, fontSize: Math.round(size * 0.36), letterSpacing: ".5px",
        fontFamily: "'Arial Narrow', Arial, sans-serif"
      }}>
        {props.initials || "?"}
      </div>
      {props.statusColor ? (
        <div title={props.statusLabel || ""} style={{
          position: "absolute", right: -2, bottom: -2, width: 14, height: 14,
          borderRadius: "50%", background: props.statusColor,
          border: "2px solid #FFFFFF", boxShadow: "0 0 0 1.5px #191923"
        }}></div>
      ) : null}
    </div>
  )
}

function ProgressRing(props) {
  var size = props.size || 78
  var stroke = 9
  var r = (size - stroke) / 2
  var circ = 2 * Math.PI * r
  var pct = props.total > 0 ? (props.done / props.total) : 0
  var dash = circ * pct
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={"0 0 " + size + " " + size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={stroke}></circle>
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={pct >= 1 ? "#009D3A" : "#191923"} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={dash + " " + circ}
          transform={"rotate(-90 " + (size / 2) + " " + (size / 2) + ")"}
        ></circle>
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", lineHeight: 1
      }}>
        <div style={{ fontWeight: 900, fontSize: 19 }}>
          {props.done}<span style={{ opacity: 0.4, fontSize: 12 }}>/{props.total}</span>
        </div>
      </div>
    </div>
  )
}

// Petite tuile KPI
function KpiTile(props) {
  return (
    <div className="kpi-mini" style={{ cursor: props.onClick ? "pointer" : "default" }} onClick={props.onClick}>
      <div style={{ fontWeight: 900, fontSize: 24, lineHeight: 1 }}>{props.value}</div>
      <div className="yt" style={{ fontSize: 13, color: "#FF82D7", marginTop: 2 }}>{props.label}</div>
    </div>
  )
}

// ============================================================
// COMPOSANT PRINCIPAL — HUB RH
// ============================================================
export default function RhTab() {
  var [employees, setEmployees] = useState([])
  var [contracts, setContracts] = useState([])
  var [amendments, setAmendments] = useState([])
  var [docCounts, setDocCounts] = useState({})
  var [contractDocCounts, setContractDocCounts] = useState({})
  var [loading, setLoading] = useState(true)
  var [section, setSection] = useState("equipe") // equipe | contrats | coffre | conformite | conges
  var [showWizard, setShowWizard] = useState(false)
  var [showRetroImport, setShowRetroImport] = useState(false)
  var [showPayslipsImport, setShowPayslipsImport] = useState(false)
  var [offboardingEmployee, setOffboardingEmployee] = useState(null)
  var [teamFilter, setTeamFilter] = useState("actifs") // actifs | anciens | tous
  var [editingContract, setEditingContract] = useState(null)
  var [wizardForEmployee, setWizardForEmployee] = useState(null)
  var [viewingEmployeeId, setViewingEmployeeId] = useState(null)
  var [previewContract, setPreviewContract] = useState(null)
  var [welcomePackEmpId, setWelcomePackEmpId] = useState(null)
  var [search, setSearch] = useState("")
  var [contractsTab, setContractsTab] = useState("a_signer") // a_signer | brouillon | signe | archive | tous
  var [contractsType, setContractsType] = useState("tous") // tous | contrats | avenants
  var [contractsSearch, setContractsSearch] = useState("")
  var [toast, setToast] = useState("")

  function showToast(msg) {
    setToast(msg)
    setTimeout(function () { setToast("") }, 2500)
  }

  async function loadAll() {
    setLoading(true)
    var resE = await supabase
      .from("hr_employees")
      .select("*")
      .order("nom", { ascending: true })
    var resC = await supabase
      .from("hr_contracts")
      .select("*, hr_contract_vacations(*)")
      .order("created_at", { ascending: false })
    var resCyc = await supabase
      .from("hr_employment_cycles")
      .select("id, employee_id")
    var resDocs = await supabase
      .from("hr_employee_documents")
      .select("employee_id")
    var resCDocs = await supabase
      .from("hr_contract_documents")
      .select("contract_id")
    var resAmd = await supabase
      .from("hr_contract_amendments")
      .select("id, contract_id, type, objet, status, signature_status, created_at, signature_date")
      .order("created_at", { ascending: false })

    var cycleToEmp = {}
    ;(resCyc.data || []).forEach(function (cyc) {
      cycleToEmp[cyc.id] = cyc.employee_id
    })

    var contracts_ = (resC.data || []).map(function (c) {
      var effectiveEmpId = c.employee_id
        || (c.cycle_id ? cycleToEmp[c.cycle_id] : null)
        || null
      return Object.assign({}, c, { _employee_id: effectiveEmpId })
    })

    var counts = {}
    if (resDocs.data) {
      resDocs.data.forEach(function (d) {
        counts[d.employee_id] = (counts[d.employee_id] || 0) + 1
      })
    }
    var contractIdToEmpId = {}
    contracts_.forEach(function (c) { contractIdToEmpId[c.id] = c._employee_id })
    var cCounts = {}
    if (resCDocs.data) {
      resCDocs.data.forEach(function (d) {
        var empId = contractIdToEmpId[d.contract_id]
        if (empId) cCounts[empId] = (cCounts[empId] || 0) + 1
      })
    }

    // Enrichir les avenants avec l'employee_id résolu via leur contrat
    var amendments_ = (resAmd.data || []).map(function (a) {
      return Object.assign({}, a, { _employee_id: contractIdToEmpId[a.contract_id] || null })
    })

    setEmployees(resE.data || [])
    setContracts(contracts_)
    setAmendments(amendments_)
    setDocCounts(counts)
    setContractDocCounts(cCounts)
    setLoading(false)
  }

  useEffect(function () { loadAll() }, [])

  // Listener pour le SignaturesPendingWidget (ouvre une fiche salarié)
  useEffect(function () {
    var handler = function (ev) {
      var empId = ev && ev.detail && ev.detail.employeeId
      if (empId) setViewingEmployeeId(empId)
    }
    window.addEventListener("meshuga:open-employee", handler)
    return function () { window.removeEventListener("meshuga:open-employee", handler) }
  }, [])

  // Contrat principal d'un employé (CDI le plus récent, sinon dernier extra)
  function getMainContract(empId) {
    var empContracts = contracts.filter(function (c) { return c._employee_id === empId })
    if (empContracts.length === 0) return null
    var cdi = empContracts.filter(function (c) { return c.type !== "extra" })
    if (cdi.length > 0) return cdi[0]
    return empContracts[0]
  }

  function posteForEmployee(empId) {
    var c = getMainContract(empId)
    if (!c) return getPosteMeta("", "")
    return getPosteMeta(c.fonction, c.type)
  }

  // Statut visuel (point en coin de l'avatar)
  function statusForEmployee(e) {
    if (e.date_sortie) return { color: "#9AA0A6", label: "Sorti" }
    if (e.needs_regularization || !dossierState(e).ok) return { color: "#FF6B2B", label: "Dossier incomplet" }
    return { color: "#009D3A", label: "Actif · dossier complet" }
  }

  // === Découpages ===
  var actifs = employees.filter(function (e) { return !e.date_sortie })
  var anciens = employees.filter(function (e) { return !!e.date_sortie })

  // Liste affichée dans la grille ÉQUIPE (filtre actifs/anciens/tous + recherche)
  var teamList = employees
  if (teamFilter === "actifs") teamList = actifs
  else if (teamFilter === "anciens") teamList = anciens
  if (search.trim()) {
    var q = search.toLowerCase()
    teamList = teamList.filter(function (e) {
      var hay = ((e.prenom || "") + " " + (e.nom || "") + " " + (e.email || "") + " " + (e.telephone || "")).toLowerCase()
      return hay.indexOf(q) >= 0
    })
  }

  // === KPIs ===
  var now = new Date()
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  var kpiEffectif = actifs.length
  var kpiExtrasMois = contracts.filter(function (c) {
    if (c.type !== "extra" || !c.date_debut) return false
    var d = new Date(c.date_debut)
    return d >= monthStart && d <= monthEnd
  }).length
  var kpiContrats = contracts.filter(function (c) {
    return c.is_current === true && c.type !== "extra"
  }).length
  var kpiConges = 0 // hr_leave_requests vide pour l'instant

  // Rond de progression : dossiers actifs complets / total actifs
  var dossiersOk = actifs.filter(function (e) { return dossierState(e).ok }).length

  // === À TRAITER ===
  var avenantsASigner = amendments.filter(function (a) {
    return a.status !== "signed" && (a.signature_status === "sent" || a.signature_status === "viewed")
  })
  var brouillons = amendments.filter(function (a) {
    return a.status === "draft" && (a.signature_status === "unsent" || !a.signature_status)
  })
  var welcomeARegul = actifs.filter(function (e) { return e.welcome_pack_signed !== true })
  var dossiersIncomplets = actifs.filter(function (e) { return !dossierState(e).ok })

  var aTraiter = []
  if (avenantsASigner.length > 0) {
    aTraiter.push({
      key: "avenants",
      icon: "✍️",
      text: avenantsASigner.length + " avenant" + (avenantsASigner.length > 1 ? "s" : "") + " en attente de signature",
      go: "contrats"
    })
  }
  if (brouillons.length > 0) {
    aTraiter.push({
      key: "brouillons",
      icon: "📝",
      text: brouillons.length + " brouillon" + (brouillons.length > 1 ? "s" : "") + " à finaliser",
      go: "contrats"
    })
  }
  if (welcomeARegul.length > 0) {
    aTraiter.push({
      key: "welcome",
      icon: "📋",
      text: welcomeARegul.length + " dossier" + (welcomeARegul.length > 1 ? "s" : "") + " de bienvenue à régulariser",
      go: "conformite"
    })
  }
  if (dossiersIncomplets.length > 0) {
    aTraiter.push({
      key: "dossiers",
      icon: "⚠️",
      text: dossiersIncomplets.length + " dossier" + (dossiersIncomplets.length > 1 ? "s" : "") + " incomplet" + (dossiersIncomplets.length > 1 ? "s" : ""),
      go: "conformite"
    })
  }

  // Badges sous-nav
  var badgeContrats = avenantsASigner.length + brouillons.length
  var badgeConformite = dossiersIncomplets.length + welcomeARegul.length

  // Pipeline contrats (lecture seule)

  // ============================================================
  // VUE PILOTAGE CONTRATS & AVENANTS — items unifiés + classification
  // ============================================================
  function empName(empId) {
    var e = employees.filter(function (x) { return x.id === empId })[0]
    if (!e) return "Salarié inconnu"
    return (e.prenom || "") + " " + (e.nom || "").toUpperCase()
  }
  function normStatus(status, sig) {
    var s = status || ""
    var g = sig || ""
    if (s === "archived") return "archive"
    if (s === "signed" || g === "signed") return "signe"
    if (g === "sent" || g === "viewed") return "a_signer"
    if (s === "finalized" || s === "draft" || g === "unsent" || !g) return "brouillon"
    return "brouillon"
  }
  var STATUS_META = {
    a_signer: { label: "À signer", color: "#FFEB5A", fg: "#191923", icon: "✍️" },
    brouillon: { label: "Brouillon", color: "#FFFFFF", fg: "#191923", icon: "📝" },
    signe: { label: "Signé", color: "#009D3A", fg: "#FFFFFF", icon: "✅" },
    archive: { label: "Archivé", color: "#EBEBEB", fg: "#666", icon: "🗄️" }
  }
  var AMD_TYPE_LABELS = {
    prolongation_duree: "Prolongation de durée",
    augmentation_salaire: "Modification de rémunération",
    modification_horaires: "Modification des horaires",
    changement_poste: "Changement de poste",
    regularisation_welcome_pack: "Actualisation contractuelle",
    autre: "Avenant"
  }

  var contractItems = []
  contracts.forEach(function (c) {
    var st = normStatus(c.status, c.signature_status)
    var meta = getContractTypeMeta(c.type || "extra")
    contractItems.push({
      kind: "contract",
      id: c.id,
      empId: c._employee_id,
      title: (meta ? meta.label : "Contrat"),
      sub: c.fonction || "",
      type: c.type,
      status: st,
      sig: c.signature_status || "unsent",
      isCurrent: c.is_current === true,
      ts: c.created_at || c.date_debut || null,
      dateLabel: c.date_debut ? new Date(c.date_debut).toLocaleDateString("fr-FR") : null,
      raw: c
    })
  })
  amendments.forEach(function (a) {
    var st = normStatus(a.status, a.signature_status)
    var label = AMD_TYPE_LABELS[a.amendment_type] || a.objet || "Avenant"
    contractItems.push({
      kind: "amendment",
      id: a.id,
      empId: a._employee_id,
      title: (a.amendment_number ? ("Avenant n°" + a.amendment_number) : "Avenant") + " — " + label,
      sub: a.objet || "",
      type: "avenant",
      status: st,
      sig: a.signature_status || "unsent",
      isCurrent: false,
      ts: a.created_at || a.signature_date || null,
      dateLabel: a.signature_date ? new Date(a.signature_date).toLocaleDateString("fr-FR") : (a.created_at ? new Date(a.created_at).toLocaleDateString("fr-FR") : null),
      raw: a
    })
  })

  var countByStatus = { a_signer: 0, brouillon: 0, signe: 0, archive: 0, tous: contractItems.length }
  contractItems.forEach(function (it) { countByStatus[it.status] = (countByStatus[it.status] || 0) + 1 })

  var contractItemsFiltered = contractItems.filter(function (it) {
    if (contractsTab !== "tous" && it.status !== contractsTab) return false
    if (contractsType === "contrats" && it.kind !== "contract") return false
    if (contractsType === "avenants" && it.kind !== "amendment") return false
    if (contractsSearch.trim()) {
      var q = contractsSearch.toLowerCase()
      var hay = (it.title + " " + it.sub + " " + empName(it.empId)).toLowerCase()
      if (hay.indexOf(q) < 0) return false
    }
    return true
  }).sort(function (a, b) {
    var ta = a.ts ? new Date(a.ts).getTime() : 0
    var tb = b.ts ? new Date(b.ts).getTime() : 0
    return tb - ta
  })

  var CONTRACT_TABS = [
    { key: "a_signer", label: "À signer" },
    { key: "brouillon", label: "Brouillons" },
    { key: "signe", label: "Signés" },
    { key: "archive", label: "Archivés" },
    { key: "tous", label: "Tous" }
  ]

  // Pills de navigation
  var NAV = [
    { key: "equipe", icon: "👥", label: "Équipe", badge: 0 },
    { key: "contrats", icon: "📄", label: "Contrats & avenants", badge: badgeContrats },
    { key: "coffre", icon: "🗄️", label: "Coffre docs", badge: 0 },
    { key: "conformite", icon: "✅", label: "Conformité", badge: badgeConformite },
    { key: "conges", icon: "🏖️", label: "Congés", badge: 0 }
  ]

  // ============================================================
  return (
    <div>
      {/* === HEADER ROSE === */}
      <div style={{
        background: "var(--p, #FF82D7)",
        border: "2.5px solid #191923",
        borderRadius: 10,
        boxShadow: "4px 4px 0 #191923",
        padding: "14px 18px",
        marginBottom: 14,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap"
      }}>
        <div>
          <div className="yt" style={{ fontSize: 32, color: "#191923", lineHeight: 1 }}>Salut Edward&nbsp;!</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#191923", opacity: 0.75, marginTop: 4 }}>
            {employees.length} salarié{employees.length > 1 ? "s" : ""} · {actifs.length} en poste · CCN Restauration Rapide (IDCC 1501)
          </div>
        </div>
        <button
          className="btn btn-n"
          style={{ fontSize: 12, padding: "10px 16px" }}
          onClick={function () {
            setEditingContract(null)
            setWizardForEmployee(null)
            setShowWizard(true)
          }}
        >+ Embaucher</button>
      </div>

      {/* === BARRE À TRAITER === */}
      <div className="card-y" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: aTraiter.length > 0 ? 10 : 0, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 900, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            🔔 À traiter
          </span>
          {aTraiter.length === 0 ? (
            <span style={{ fontWeight: 700, fontSize: 12, color: "#191923" }}>
              &mdash; tout est à jour&nbsp;🎉
            </span>
          ) : (
            <span style={{
              background: "#191923", color: "var(--y, #FFEB5A)", fontWeight: 900, fontSize: 11,
              padding: "2px 8px", borderRadius: 9, border: "1.5px solid #191923"
            }}>{aTraiter.length}</span>
          )}
        </div>
        {aTraiter.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {aTraiter.map(function (it) {
              return (
                <button
                  key={it.key}
                  onClick={function () { setSection(it.go) }}
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #191923",
                    borderRadius: 6,
                    boxShadow: "2px 2px 0 #191923",
                    padding: "8px 12px",
                    fontFamily: "'Arial Narrow', Arial, sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 7
                  }}
                >
                  <span style={{ fontSize: 15 }}>{it.icon}</span>
                  <span>{it.text}</span>
                  <span style={{ fontWeight: 900, color: "#FF82D7" }}>›</span>
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* === KPIs + ROND PROGRESSION === */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "stretch", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flex: 1, minWidth: 260, flexWrap: "wrap" }}>
          <KpiTile value={kpiEffectif} label="Effectif" onClick={function () { setSection("equipe"); setTeamFilter("actifs") }} />
          <KpiTile value={kpiExtrasMois} label="Extras ce mois" />
          <KpiTile value={kpiContrats} label="Contrats actifs" onClick={function () { setSection("contrats") }} />
          <KpiTile value={kpiConges} label="Congés à venir" onClick={function () { setSection("conges") }} />
        </div>
        <div className="card" style={{
          margin: 0, display: "flex", alignItems: "center", gap: 12, minWidth: 200, padding: 12
        }}>
          <ProgressRing done={dossiersOk} total={actifs.length} />
          <div>
            <div className="yt" style={{ fontSize: 17, color: "#FF82D7", lineHeight: 1 }}>Dossiers OK</div>
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3 }}>
              {dossiersOk} dossier{dossiersOk > 1 ? "s" : ""} complet{dossiersOk > 1 ? "s" : ""} sur {actifs.length} actif{actifs.length > 1 ? "s" : ""}
            </div>
            {dossiersIncomplets.length > 0 ? (
              <button
                className="btn btn-sm"
                style={{ marginTop: 7 }}
                onClick={function () { setSection("conformite") }}
              >Voir les manquants →</button>
            ) : null}
          </div>
        </div>
      </div>

      {/* === SOUS-NAV PILLS === */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {NAV.map(function (n) {
          var on = section === n.key
          return (
            <button
              key={n.key}
              className={"ann-tab" + (on ? " on" : "")}
              onClick={function () { setSection(n.key) }}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {n.badge > 0 ? (
                <span style={{
                  background: on ? "var(--y, #FFEB5A)" : "#191923",
                  color: on ? "#191923" : "var(--y, #FFEB5A)",
                  fontWeight: 900, fontSize: 10, padding: "1px 6px", borderRadius: 9,
                  border: "1.5px solid #191923"
                }}>{n.badge}</span>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/* SECTION : ÉQUIPE (hub)                                       */}
      {/* ============================================================ */}
      {section === "equipe" ? (
        <div>
          {/* Filtre actifs/anciens/tous + légende couleurs */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className={"tag" + (teamFilter === "actifs" ? " on" : "")} onClick={function () { setTeamFilter("actifs") }}>Actifs ({actifs.length})</button>
              <button className={"tag" + (teamFilter === "anciens" ? " on" : "")} onClick={function () { setTeamFilter("anciens") }}>Anciens ({anciens.length})</button>
              <button className={"tag" + (teamFilter === "tous" ? " on" : "")} onClick={function () { setTeamFilter("tous") }}>Tous ({employees.length})</button>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 10, fontWeight: 700, opacity: 0.7 }}>
              {POSTE_LEGEND.map(function (lg) {
                return (
                  <span key={lg.label} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 11, height: 11, borderRadius: "50%", background: lg.color, border: "1.5px solid #191923", display: "inline-block" }}></span>
                    {lg.label}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Recherche */}
          <div className="card" style={{ padding: 10 }}>
            <input
              className="inp"
              value={search}
              onChange={function (e) { setSearch(e.target.value) }}
              placeholder="🔍 Rechercher un salarié par nom, email, téléphone..."
              style={{ width: "100%", margin: 0 }}
            />
          </div>

          {/* Grille de cartes */}
          {loading ? (
            <div className="card" style={{ padding: 30, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {teamList.map(function (e) {
                var poste = posteForEmployee(e.id)
                var st = statusForEmployee(e)
                var mainC = getMainContract(e.id)
                var meta = mainC ? getContractTypeMeta(mainC.type || "extra") : null
                var nbContracts = contracts.filter(function (c) { return c._employee_id === e.id }).length
                var totalDocs = (docCounts[e.id] || 0) + (contractDocCounts[e.id] || 0)
                return (
                  <div
                    key={e.id}
                    className="card card-click"
                    style={{ margin: 0, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}
                    onClick={function () { setViewingEmployeeId(e.id) }}
                  >
                    <PosteAvatar
                      meta={poste}
                      initials={getInitials(e.prenom, e.nom)}
                      statusColor={st.color}
                      statusLabel={st.label}
                      size={48}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="yt" style={{ fontSize: 21, color: "#FF82D7", lineHeight: 1.05 }}>
                        {e.prenom || "—"} {(e.nom || "").toUpperCase()}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginTop: 2 }}>
                        {(mainC && mainC.fonction) ? mainC.fonction : poste.label}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                        {meta ? (
                          <span style={{
                            background: meta.color, color: "#191923", padding: "2px 7px", borderRadius: 4,
                            fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".5px",
                            border: "1.5px solid #191923"
                          }}>{meta.icon} {meta.label.replace("CDI ", "")}</span>
                        ) : null}
                        {e.needs_regularization ? (
                          <span style={{
                            background: "#FF82D7", color: "#191923", padding: "2px 7px", borderRadius: 4,
                            fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".5px",
                            border: "1.5px solid #191923"
                          }}>⚠ À régulariser</span>
                        ) : null}
                        {e.date_sortie ? (
                          <span style={{
                            background: "#191923", color: "var(--y, #FFEB5A)", padding: "2px 7px", borderRadius: 4,
                            fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".5px"
                          }}>Parti {new Date(e.date_sortie).toLocaleDateString("fr-FR")}</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 10, opacity: 0.55, display: "flex", gap: 10, flexWrap: "wrap", marginTop: 7 }}>
                        <span>📁 <b>{totalDocs}</b> doc{totalDocs > 1 ? "s" : ""}</span>
                        <span>📄 <b>{nbContracts}</b> contrat{nbContracts > 1 ? "s" : ""}</span>
                      </div>
                      {!e.date_sortie ? (
                        <div style={{ marginTop: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={function (ev) { ev.stopPropagation(); setOffboardingEmployee(e) }}
                            title="Marquer ce salarié comme parti"
                          >📤 Parti</button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {/* Carte Embaucher / extra (uniquement hors recherche, pour rester visible) */}
              {!search.trim() ? (
                <div
                  onClick={function () {
                    setEditingContract(null)
                    setWizardForEmployee(null)
                    setShowWizard(true)
                  }}
                  style={{
                    border: "2.5px dashed #191923",
                    borderRadius: 7,
                    background: "rgba(255,255,255,0.45)",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    cursor: "pointer",
                    minHeight: 120
                  }}
                >
                  <div style={{ fontSize: 30, lineHeight: 1 }}>＋</div>
                  <div className="yt" style={{ fontSize: 19, color: "#FF82D7", marginTop: 4 }}>Embaucher / extra</div>
                  <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>CDI, agent de maîtrise, cadre ou contrat d&apos;extra</div>
                </div>
              ) : null}

              {/* Vide */}
              {teamList.length === 0 ? (
                <div className="card" style={{ gridColumn: "1 / -1", padding: 36, textAlign: "center", opacity: 0.55, margin: 0 }}>
                  <div className="yt" style={{ fontSize: 26, color: "#FF82D7", marginBottom: 4 }}>
                    {search ? "Aucun salarié trouvé" : "Aucun salarié ici"}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {search ? "Essaie un autre mot-clé." : "Clique sur « Embaucher » pour commencer."}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* SECTION : CONTRATS & AVENANTS                                */}
      {/* ============================================================ */}
      {section === "contrats" ? (
        <div>
          <SignaturesPendingWidget />

          {/* En-tête + filtres type + recherche */}
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <div className="yt" style={{ fontSize: 21, color: "#FF82D7" }}>Contrats &amp; avenants</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button className={"tag" + (contractsType === "tous" ? " on" : "")} onClick={function () { setContractsType("tous") }}>Tout</button>
                <button className={"tag" + (contractsType === "contrats" ? " on" : "")} onClick={function () { setContractsType("contrats") }}>Contrats</button>
                <button className={"tag" + (contractsType === "avenants" ? " on" : "")} onClick={function () { setContractsType("avenants") }}>Avenants</button>
              </div>
            </div>

            {/* Onglets de statut avec compteurs */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {CONTRACT_TABS.map(function (t) {
                var on = contractsTab === t.key
                var n = countByStatus[t.key] || 0
                return (
                  <button
                    key={t.key}
                    className={"ann-tab" + (on ? " on" : "")}
                    onClick={function () { setContractsTab(t.key) }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <span>{t.label}</span>
                    <span style={{
                      background: on ? "var(--y, #FFEB5A)" : "#191923",
                      color: on ? "#191923" : "var(--y, #FFEB5A)",
                      fontWeight: 900, fontSize: 10, padding: "1px 6px", borderRadius: 9, border: "1.5px solid #191923"
                    }}>{n}</span>
                  </button>
                )
              })}
            </div>

            {/* Recherche */}
            <input
              className="inp"
              value={contractsSearch}
              onChange={function (e) { setContractsSearch(e.target.value) }}
              placeholder="🔍 Rechercher par salarié, fonction, type de document..."
              style={{ width: "100%", margin: 0 }}
            />
          </div>

          {/* Liste actionnable */}
          {loading ? (
            <div className="card" style={{ padding: 24, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
          ) : contractItemsFiltered.length === 0 ? (
            <div className="card" style={{ padding: 30, textAlign: "center", opacity: 0.6 }}>
              <div className="yt" style={{ fontSize: 22, color: "#FF82D7", marginBottom: 4 }}>Rien ici</div>
              <div style={{ fontSize: 12 }}>Aucun document ne correspond à ce filtre.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contractItemsFiltered.map(function (it) {
                var sm = STATUS_META[it.status] || STATUS_META.brouillon
                var poste = posteForEmployee(it.empId)
                var canRelance = it.status === "a_signer" || (it.status === "brouillon" && it.kind === "amendment")
                return (
                  <div
                    key={it.kind + "_" + it.id}
                    className="card-click"
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      border: it.status === "a_signer" ? "2px solid #FF82D7" : "2px solid #191923",
                      borderRadius: 8, background: "#FFFFFF",
                      boxShadow: it.status === "a_signer" ? "3px 3px 0 #FF82D7" : "3px 3px 0 #191923",
                      margin: 0
                    }}
                    onClick={function () { if (it.empId) setViewingEmployeeId(it.empId) }}
                  >
                    {/* Avatar couleur poste */}
                    <div style={{
                      width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                      background: poste.color, color: poste.textColor,
                      border: "2px solid #191923", boxShadow: "2px 2px 0 #191923",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: 15, fontFamily: "'Arial Narrow', Arial, sans-serif"
                    }}>{(function () {
                      var e = employees.filter(function (x) { return x.id === it.empId })[0]
                      return e ? getInitials(e.prenom, e.nom) : "?"
                    })()}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900, fontSize: 13 }}>{empName(it.empId)}</span>
                        {it.kind === "amendment" ? (
                          <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".5px", background: "#FFEB5A", color: "#191923", padding: "1px 6px", borderRadius: 3, border: "1.5px solid #191923" }}>Avenant</span>
                        ) : null}
                        {it.isCurrent ? (
                          <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".5px", background: "#FF82D7", color: "#191923", padding: "1px 6px", borderRadius: 3, border: "1.5px solid #191923" }}>● En cours</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                        {it.title}{it.sub && it.sub !== it.title ? (" · " + it.sub) : ""}
                      </div>
                      {it.dateLabel ? (
                        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>🗓 {it.dateLabel}</div>
                      ) : null}
                    </div>

                    {/* Badge statut */}
                    <span style={{
                      background: sm.color, color: sm.fg, border: "1.5px solid #191923",
                      borderRadius: 9, padding: "3px 9px", fontWeight: 900, fontSize: 10,
                      textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap"
                    }}>{sm.icon} {sm.label}</span>

                    {/* Action directe */}
                    {canRelance ? (
                      <button
                        className="btn btn-sm"
                        style={{ background: "#FF82D7", color: "#FFFFFF", border: "1.5px solid #FF82D7", fontWeight: 700, whiteSpace: "nowrap" }}
                        onClick={function (ev) { ev.stopPropagation(); if (it.empId) setViewingEmployeeId(it.empId) }}
                        title="Ouvrir la fiche pour gérer la signature"
                      >📧 Signature</button>
                    ) : (
                      <span style={{ fontWeight: 900, color: "#FF82D7" }}>›</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="card-p">
            <div style={{ fontWeight: 700, fontSize: 12 }}>
              💡 Clique sur une ligne pour ouvrir la fiche du salarié&nbsp;: création, édition, envoi en signature et suivi s&apos;y font.
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* SECTION : COFFRE DOCUMENTS                                   */}
      {/* ============================================================ */}
      {section === "coffre" ? (
        <div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <div className="yt" style={{ fontSize: 21, color: "#FF82D7" }}>Coffre documents</div>
              <button className="btn btn-y" onClick={function () { setShowRetroImport(true) }}>📥 Importer un historique</button>
              <button className="btn btn-y" onClick={function () { setShowPayslipsImport(true) }}>📄 Importer des bulletins</button>
            </div>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12 }}>
              Tous les documents RH par salarié (pièces, contrats signés, bulletins). Clique pour ouvrir et gérer.
            </div>
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {employees.map(function (e) {
                  var poste = posteForEmployee(e.id)
                  var nbPerso = docCounts[e.id] || 0
                  var nbContr = contractDocCounts[e.id] || 0
                  var total = nbPerso + nbContr
                  return (
                    <div
                      key={e.id}
                      onClick={function () { setViewingEmployeeId(e.id) }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
                        border: "2px solid #191923", borderRadius: 6, background: "#FFFFFF",
                        boxShadow: "2px 2px 0 #191923", cursor: "pointer"
                      }}
                    >
                      <PosteAvatar meta={poste} initials={getInitials(e.prenom, e.nom)} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{e.prenom} {(e.nom || "").toUpperCase()}</div>
                        <div style={{ fontSize: 10, opacity: 0.6 }}>{nbPerso} pièce{nbPerso > 1 ? "s" : ""} · {nbContr} doc{nbContr > 1 ? "s" : ""} contractuel{nbContr > 1 ? "s" : ""}</div>
                      </div>
                      <span style={{
                        background: total > 0 ? "var(--y, #FFEB5A)" : "#EBEBEB",
                        border: "1.5px solid #191923", borderRadius: 9, padding: "2px 9px",
                        fontWeight: 900, fontSize: 12
                      }}>📁 {total}</span>
                      <span style={{ fontWeight: 900, color: "#FF82D7" }}>›</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* SECTION : CONFORMITÉ                                         */}
      {/* ============================================================ */}
      {section === "conformite" ? (
        <div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div className="yt" style={{ fontSize: 21, color: "#FF82D7" }}>Registre &amp; obligations</div>
              <button
                className="btn"
                onClick={function () { window.open("/api/hr/personnel-register", "_blank") }}
                title="Imprimer le registre du personnel (Article L.1221-13)"
              >📄 Registre du personnel</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 12 }}>
              <div style={{ border: "2px solid #191923", borderRadius: 6, padding: 10, background: "#FFFFFF", boxShadow: "2px 2px 0 #191923" }}>
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 }}>Médecine du travail</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{MESHUGA_LEGAL.medecine_travail.nom}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{MESHUGA_LEGAL.medecine_travail.adresse}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{MESHUGA_LEGAL.medecine_travail.telephone}</div>
              </div>
              <div style={{ border: "2px solid #191923", borderRadius: 6, padding: 10, background: "#FFFFFF", boxShadow: "2px 2px 0 #191923" }}>
                <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 }}>Prévoyance · Retraite</div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{MESHUGA_LEGAL.prevoyance.nom}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{MESHUGA_LEGAL.retraite.nom}</div>
              </div>
            </div>
          </div>

          {/* Suivi des dossiers salariés actifs */}
          <div className="card">
            <div className="yt" style={{ fontSize: 19, color: "#FF82D7", marginBottom: 8 }}>Complétude des dossiers (actifs)</div>
            {loading ? (
              <div style={{ padding: 16, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actifs.map(function (e) {
                  var ds = dossierState(e)
                  var poste = posteForEmployee(e.id)
                  return (
                    <div
                      key={e.id}
                      onClick={function () { setViewingEmployeeId(e.id) }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "8px 10px",
                        border: ds.ok ? "2px solid #191923" : "2px solid #FF6B2B",
                        borderRadius: 6, background: "#FFFFFF",
                        boxShadow: ds.ok ? "2px 2px 0 #191923" : "2px 2px 0 #FF6B2B", cursor: "pointer"
                      }}
                    >
                      <PosteAvatar meta={poste} initials={getInitials(e.prenom, e.nom)} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{e.prenom} {(e.nom || "").toUpperCase()}</div>
                        <div style={{ fontSize: 10, opacity: 0.65 }}>
                          {ds.ok ? "Dossier complet" : ("Manque : " + ds.missing.join(", "))}
                        </div>
                      </div>
                      <span style={{
                        background: ds.ok ? "#009D3A" : "#FF6B2B", color: "#FFFFFF",
                        border: "1.5px solid #191923", borderRadius: 9, padding: "2px 9px",
                        fontWeight: 900, fontSize: 12
                      }}>{ds.done}/{ds.total}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 10 }}>
              Note&nbsp;: le contact d&apos;urgence n&apos;est pas encore renseigné pour l&apos;équipe et sera ajouté au suivi prochainement.
            </div>
          </div>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* SECTION : CONGÉS & ABSENCES                                  */}
      {/* ============================================================ */}
      {section === "conges" ? (
        <div className="card" style={{ padding: 36, textAlign: "center" }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🏖️</div>
          <div className="yt" style={{ fontSize: 26, color: "#FF82D7", marginTop: 6 }}>Congés &amp; absences</div>
          <div style={{ fontSize: 12, opacity: 0.65, marginTop: 6, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
            Aucune demande de congés ni arrêt en cours. Le suivi des soldes, des demandes et des arrêts maladie
            arrive dans la prochaine étape de la refonte (les arrêts existants restent gérés depuis la fiche salarié).
          </div>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* MODALES & WIZARDS (inchangés)                                */}
      {/* ============================================================ */}
      {showRetroImport && (
        <RetroUploadWizard
          onClose={function () { setShowRetroImport(false) }}
          onSaved={function () {
            setShowRetroImport(false)
            showToast("Historique importé")
            loadAll()
          }}
        />
      )}

      {showPayslipsImport && (
        <PayslipsImportWizard
          onClose={function () { setShowPayslipsImport(false) }}
          onDone={function () {
            showToast("Bulletins importés")
            loadAll()
          }}
        />
      )}

      {offboardingEmployee && (
        <OffboardingWizard
          employee={offboardingEmployee}
          onClose={function () { setOffboardingEmployee(null) }}
          onSaved={function (msg) {
            setOffboardingEmployee(null)
            showToast(msg || "Salarié marqué comme parti")
            loadAll()
          }}
        />
      )}

      {showWizard && (
        <RhWizard
          existing={editingContract}
          preselectedEmployeeId={wizardForEmployee}
          employees={employees}
          onClose={function () {
            setShowWizard(false)
            setEditingContract(null)
            setWizardForEmployee(null)
          }}
          onSaved={function (msg) {
            setShowWizard(false)
            setEditingContract(null)
            setWizardForEmployee(null)
            showToast(msg || "Contrat enregistré")
            loadAll()
          }}
        />
      )}

      {viewingEmployeeId && (
        <EmployeeDetail
          employeeId={viewingEmployeeId}
          onClose={function () { setViewingEmployeeId(null); loadAll() }}
          onSaved={function (msg) { showToast(msg); loadAll() }}
          onDeleted={function (msg) {
            setViewingEmployeeId(null)
            showToast(msg || "Salarié supprimé")
            loadAll()
          }}
          onContractPreview={function (c) { setPreviewContract(c) }}
          onContractEdit={function (c) {
            setEditingContract(c)
            setWizardForEmployee(c.employee_id)
            setShowWizard(true)
            setViewingEmployeeId(null)
          }}
          onNewContract={function (empId) {
            setEditingContract(null)
            setWizardForEmployee(empId)
            setShowWizard(true)
            setViewingEmployeeId(null)
          }}
          onWelcomePackPreview={function (empId) { setWelcomePackEmpId(empId) }}
        />
      )}

      {previewContract && (
        <ContractPreview
          contract={previewContract}
          onClose={function () { setPreviewContract(null) }}
        />
      )}

      {welcomePackEmpId && (
        <WelcomePackPreview
          employeeId={welcomePackEmpId}
          onClose={function () { setWelcomePackEmpId(null) }}
        />
      )}

      {toast ? <div className="toast show">{toast}</div> : null}
    </div>
  )
}

// ============================================================
// CONTRACT PREVIEW (modal aperçu PDF avec viewer PDF.js)
// ============================================================
// Logique :
//   1) On cherche d'abord un document archivé (contrat_signe ou avenant)
//      → on l'affiche avec PDF.js (canvas, multi-pages, mobile-friendly)
//   2) Sinon → fallback : on génère le HTML via buildContract dans une iframe
//
// Pourquoi PDF.js : iframe + PDF natif ne fonctionne pas sur Safari iOS
// (affiche seulement la 1ère page) et Chrome Android. PDF.js rend chaque page
// en canvas, marche partout, supporte zoom et toutes les pages.
// ============================================================

// Charge PDF.js depuis CDN une seule fois (cache global)
function loadPdfJs() {
  if (typeof window === "undefined") return Promise.resolve(null)
  var w = window
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib)
  if (w.__pdfJsLoading) return w.__pdfJsLoading
  w.__pdfJsLoading = new Promise(function (resolve, reject) {
    var script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    script.onload = function () {
      try {
        w.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
        resolve(w.pdfjsLib)
      } catch (e) { reject(e) }
    }
    script.onerror = function () { reject(new Error("Échec chargement PDF.js")) }
    document.head.appendChild(script)
  })
  return w.__pdfJsLoading
}

function ContractPreview(props) {
  var c = props.contract
  var [emp, setEmp] = useState(null)
  var [vacs, setVacs] = useState([])
  var [archivedUrl, setArchivedUrl] = useState("")
  var [archivedMime, setArchivedMime] = useState("")
  var [archivedDoc, setArchivedDoc] = useState(null)
  var [mode, setMode] = useState("loading") // loading | archived-pdf | archived-img | generated
  var [pdfStatus, setPdfStatus] = useState("idle") // idle | loading | rendered | error
  var [pdfError, setPdfError] = useState("")
  var [pdfPageCount, setPdfPageCount] = useState(0)
  var iframeRef = useRef(null)
  var pdfContainerRef = useRef(null)

  useEffect(function () {
    var run = async function () {
      // Résoudre l'employee_id : direct OU via cycle_id pour les contrats régularisés
      var empId = c.employee_id || c._employee_id
      if (!empId && c.cycle_id) {
        var resCyc = await supabase
          .from("hr_employment_cycles")
          .select("employee_id")
          .eq("id", c.cycle_id)
          .single()
        empId = resCyc.data && resCyc.data.employee_id
      }
      var resE = empId
        ? await supabase.from("hr_employees").select("*").eq("id", empId).single()
        : { data: {} }
      var resV = await supabase.from("hr_contract_vacations").select("*").eq("contract_id", c.id).order("ordre")
      setEmp(resE.data || {})
      setVacs(resV.data || [])

      var resDoc = await supabase
        .from("hr_contract_documents")
        .select("*")
        .eq("contract_id", c.id)
        .in("doc_type", ["contrat_signe", "avenant"])
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      var doc = resDoc.data
      if (doc && doc.file_path) {
        var path = doc.assembled_pdf_path || doc.file_path
        var resUrl = await supabase.storage
          .from("hr-contract-docs")
          .createSignedUrl(path, 3600)
        if (resUrl.data && resUrl.data.signedUrl) {
          var pathLow = path.toLowerCase()
          var isPdf = pathLow.endsWith(".pdf") || (doc.mime_type || "").indexOf("pdf") >= 0
          setArchivedUrl(resUrl.data.signedUrl)
          setArchivedMime(doc.mime_type || (isPdf ? "application/pdf" : "image/jpeg"))
          setArchivedDoc(doc)
          setMode(isPdf ? "archived-pdf" : "archived-img")
          return
        }
      }

      setMode("generated")
    }
    run()
  }, [])

  // Mode "generated" : injecter le HTML dans l'iframe
  useEffect(function () {
    if (mode !== "generated" || !iframeRef.current || !emp) return
    var doc = iframeRef.current.contentDocument
    if (!doc) return
    var html = buildContract(c, emp, vacs, LOGO_PINK)
    doc.open()
    doc.write(html)
    doc.close()
  }, [mode, emp])

  // Mode "archived-pdf" : charger PDF.js et rendre toutes les pages dans le container
  useEffect(function () {
    if (mode !== "archived-pdf" || !archivedUrl || !pdfContainerRef.current) return
    setPdfStatus("loading")
    setPdfError("")

    var cancelled = false
    var run = async function () {
      try {
        var pdfjsLib = await loadPdfJs()
        if (cancelled || !pdfjsLib) return

        var loadingTask = pdfjsLib.getDocument({ url: archivedUrl })
        var pdf = await loadingTask.promise
        if (cancelled) return

        var container = pdfContainerRef.current
        if (!container) return
        // Nettoyer (au cas où on rend une 2e fois)
        container.innerHTML = ""

        setPdfPageCount(pdf.numPages)

        // Calcul scale : on veut que la page tienne en largeur du container
        var containerWidth = container.clientWidth || 320
        // Sur mobile petit, on garde une marge interne
        var targetWidth = Math.max(280, containerWidth - 8)

        for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) return
          var page = await pdf.getPage(pageNum)
          var viewport1 = page.getViewport({ scale: 1 })
          var scale = targetWidth / viewport1.width
          // Sur mobile haute résolution, on peut multiplier par devicePixelRatio pour la netteté
          var dpr = (typeof window !== "undefined" && window.devicePixelRatio) ? Math.min(window.devicePixelRatio, 2) : 1
          var viewport = page.getViewport({ scale: scale * dpr })

          var canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          // Affichage en CSS à la taille logique (sans dpr)
          canvas.style.width = (targetWidth) + "px"
          canvas.style.height = ((targetWidth / viewport1.width) * viewport1.height) + "px"
          canvas.style.display = "block"
          canvas.style.margin = "0 auto 12px auto"
          canvas.style.border = "2px solid #191923"
          canvas.style.boxShadow = "3px 3px 0 #191923"
          canvas.style.background = "#FFFFFF"
          canvas.style.maxWidth = "100%"

          var ctx = canvas.getContext("2d")
          await page.render({ canvasContext: ctx, viewport: viewport }).promise
          if (cancelled) return

          // Numéro de page
          var pageLabel = document.createElement("div")
          pageLabel.style.cssText = "text-align:center;font-size:10px;color:#777;margin:-8px 0 12px;font-weight:900;text-transform:uppercase;letter-spacing:1px;"
          pageLabel.textContent = "Page " + pageNum + " / " + pdf.numPages

          container.appendChild(canvas)
          container.appendChild(pageLabel)
        }
        if (!cancelled) setPdfStatus("rendered")
      } catch (e) {
        if (!cancelled) {
          setPdfError(e?.message || "Erreur de rendu PDF")
          setPdfStatus("error")
        }
      }
    }
    run()
    return function () { cancelled = true }
  }, [mode, archivedUrl])

  function printNow() {
    if (mode === "archived-pdf" || mode === "archived-img") {
      if (archivedUrl) window.open(archivedUrl, "_blank")
      return
    }
    if (!iframeRef.current) return
    iframeRef.current.contentWindow.focus()
    iframeRef.current.contentWindow.print()
  }

  function downloadArchived() {
    if (archivedUrl) window.open(archivedUrl, "_blank")
  }

  var title = (mode === "archived-pdf" || mode === "archived-img")
    ? "📎 Document signé d'origine"
    : (mode === "generated" ? "Aperçu du contrat (généré)" : "Chargement…")

  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl" style={{ maxWidth: 920, height: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="mt">{title}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(mode === "archived-pdf" || mode === "archived-img") ? (
                <button className="btn btn-y" onClick={downloadArchived}>↗ Ouvrir / Télécharger</button>
              ) : null}
              {mode === "generated" ? (
                <button className="btn btn-y" onClick={printNow}>↓ Imprimer en PDF</button>
              ) : null}
              <button className="btn" onClick={props.onClose}>Fermer</button>
            </div>
          </div>
          {(mode === "archived-pdf" || mode === "archived-img") && archivedDoc ? (
            <div className="yt" style={{ fontSize: 12, marginTop: 4, color: "#191923" }}>
              Document archivé · uploadé le {new Date(archivedDoc.uploaded_at).toLocaleDateString("fr-FR")}
              {pdfPageCount > 0 ? " · " + pdfPageCount + " page" + (pdfPageCount > 1 ? "s" : "") : ""}
            </div>
          ) : null}
          {mode === "generated" ? (
            <div className="yt" style={{ fontSize: 12, marginTop: 4, color: "#191923" }}>
              Aucun document signé archivé · génération depuis les données saisies
            </div>
          ) : null}
        </div>

        {/* Zone d'affichage */}
        {mode === "loading" ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#EDEDED" }}>
            <div className="yt" style={{ fontSize: 22, color: "#FF82D7" }}>Chargement…</div>
          </div>
        ) : null}

        {/* PDF archivé via PDF.js (toutes les pages, mobile-friendly) */}
        {mode === "archived-pdf" ? (
          <div style={{ flex: 1, overflow: "auto", background: "#EDEDED", padding: 10 }}>
            {pdfStatus === "loading" ? (
              <div style={{ textAlign: "center", padding: 30, color: "#777" }}>
                <div className="yt" style={{ fontSize: 22, color: "#FF82D7" }}>Rendu du PDF…</div>
                <div style={{ fontSize: 11, marginTop: 6 }}>Chargement de PDF.js et des pages</div>
              </div>
            ) : null}
            {pdfStatus === "error" ? (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div className="card-p" style={{ padding: 12, fontSize: 12, marginBottom: 12 }}>
                  ⚠ Impossible de rendre le PDF dans la modal : {pdfError}
                </div>
                <button className="btn btn-y" onClick={downloadArchived}>↗ Ouvrir le PDF dans un nouvel onglet</button>
              </div>
            ) : null}
            <div ref={pdfContainerRef} style={{ width: "100%" }}></div>
          </div>
        ) : null}

        {/* Image archivée (cas non-PDF) */}
        {mode === "archived-img" ? (
          <div style={{ flex: 1, overflow: "auto", background: "#EDEDED", padding: 14, textAlign: "center" }}>
            <img
              src={archivedUrl}
              alt="Document archivé"
              style={{ maxWidth: "100%", height: "auto", boxShadow: "3px 3px 0 #191923", border: "2px solid #191923" }}
            />
          </div>
        ) : null}

        {/* HTML généré (template contrat) */}
        {mode === "generated" ? (
          <iframe
            ref={iframeRef}
            style={{ flex: 1, width: "100%", border: "none", background: "#EDEDED" }}
            title="Contrat preview"
          />
        ) : null}
      </div>
    </div>
  )
}

// ============================================================
// WELCOME PACK PREVIEW (modal aperçu Dossier de bienvenue)
// ============================================================
// Charge l'employé + son contrat le plus récent (non-archivé prioritaire)
// puis génère le HTML 4 pages via buildWelcomePack et l'injecte dans iframe.
// ============================================================
function WelcomePackPreview(props) {
  var [emp, setEmp] = useState(null)
  var [contract, setContract] = useState(null)
  var [loaded, setLoaded] = useState(false)
  // 🔥 Sprint Y1 : signature électronique pré-enregistrée d'Edward (mandat permanent)
  var [employerSig, setEmployerSig] = useState(null)
  var iframeRef = useRef(null)

  useEffect(function () {
    var run = async function () {
      var resE = await supabase.from("hr_employees").select("*").eq("id", props.employeeId).single()
      // 🔥 Edward 21/05 : Fix critique — récup contrats via employee_id ET cycle_id
      // (les contrats peuvent être liés via l'un ou l'autre selon l'historique de création).
      // Puis priorité absolue à is_current=true pour ne pas tomber sur un contrat obsolète.
      var resDirect = await supabase
        .from("hr_contracts")
        .select("*")
        .eq("employee_id", props.employeeId)
      // Trouver tous les cycle_id du salarié
      var resCycles = await supabase
        .from("hr_employment_cycles")
        .select("id")
        .eq("employee_id", props.employeeId)
      var cycleIds = (resCycles.data || []).map(function (cy) { return cy.id })
      var resViaCycle = { data: [] }
      if (cycleIds.length > 0) {
        resViaCycle = await supabase
          .from("hr_contracts")
          .select("*")
          .in("cycle_id", cycleIds)
      }
      // Fusionner + dédoublonner par id
      var allContracts = [].concat(resDirect.data || [], resViaCycle.data || [])
      var seen = {}
      var contractsArr = []
      for (var k = 0; k < allContracts.length; k++) {
        var cc = allContracts[k]
        if (cc && cc.id && !seen[cc.id]) {
          seen[cc.id] = true
          contractsArr.push(cc)
        }
      }
      // Priorité de sélection : is_current=true > status non-archived > plus récent
      contractsArr.sort(function (a, b) {
        if (a.is_current === true && b.is_current !== true) return -1
        if (a.is_current !== true && b.is_current === true) return 1
        var aArchived = a.status === "archived" ? 1 : 0
        var bArchived = b.status === "archived" ? 1 : 0
        if (aArchived !== bArchived) return aArchived - bArchived
        var ta = a.created_at ? new Date(a.created_at).getTime() : 0
        var tb = b.created_at ? new Date(b.created_at).getTime() : 0
        return tb - ta
      })
      var pick = contractsArr[0] || null
      setEmp(resE.data || {})
      setContract(pick)
      setLoaded(true)
    }
    run()
  }, [])

  // 🔥 Sprint Y1 : Charger la signature pré-enregistrée d'Edward (mandat permanent)
  useEffect(function () {
    fetch("/api/employer-signature")
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (sig) {
        if (sig && sig.active === true) {
          setEmployerSig(sig)
        } else {
          setEmployerSig(null)
        }
      })
      .catch(function () { setEmployerSig(null) })
  }, [])

  useEffect(function () {
    if (!loaded || !iframeRef.current) return
    var doc = iframeRef.current.contentDocument
    if (!doc) return
    // 🔥 Sprint Y1 : 4e paramètre employerSig (mandat permanent Edward)
    // Si null → bloc employeur vide comme avant
    // Si actif → date + Lu et approuvé + signature Yellowtail + cartouche audit
    var html = buildWelcomePack(emp || {}, contract || {}, LOGO_PINK, employerSig)
    doc.open()
    doc.write(html)
    doc.close()
  }, [loaded, employerSig])

  function printNow() {
    if (!iframeRef.current) return
    iframeRef.current.contentWindow.focus()
    iframeRef.current.contentWindow.print()
  }

  var titleName = emp ? ((emp.prenom || "") + " " + ((emp.nom || "").toUpperCase())).trim() : ""

  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl" style={{ maxWidth: 920, height: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="mh" style={{ position: "sticky", top: 0, zIndex: 10, background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="mt" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <span>Dossier de bienvenue{titleName ? " — " + titleName : ""}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-y" onClick={printNow}>↓ Imprimer en PDF</button>
              <button className="btn" onClick={props.onClose}>Fermer</button>
            </div>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          style={{ flex: 1, width: "100%", border: "none", background: "#EDEDED" }}
          title="Dossier de bienvenue preview"
        />
      </div>
    </div>
  )
}
