"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { LOGO_PINK } from "./logos"
import RhWizard from "./rh/RhWizard"
import EmployeeDetail from "./rh/EmployeeDetail"
import RetroUploadWizard from "./rh/RetroUploadWizard"
import OffboardingWizard from "./rh/OffboardingWizard"
import { buildContract } from "./rh/contractBuilders"
import { buildWelcomePack } from "./rh/welcomePackBuilder"
import { getContractTypeMeta } from "./rh/rhConstants"

// ============================================================
// Meshuga RH — Vue salarié-centrée
// ============================================================
// Page principale : liste de salariés (pas de contrats à la racine)
// Clic sur un salarié → fiche complète déroulée
// SWC-safe : var dans JSX, pas de generics, function(){}, pas de optional chaining
// ============================================================

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function RhTab() {
  var [employees, setEmployees] = useState([])
  var [contracts, setContracts] = useState([])
  var [docCounts, setDocCounts] = useState({})           // { employeeId: nb_docs_perso }
  var [contractDocCounts, setContractDocCounts] = useState({}) // { employeeId: nb_docs_contrat }
  var [loading, setLoading] = useState(true)
  var [showWizard, setShowWizard] = useState(false)
  var [showRetroImport, setShowRetroImport] = useState(false)
  var [offboardingEmployee, setOffboardingEmployee] = useState(null)
  var [editingContract, setEditingContract] = useState(null)
  var [wizardForEmployee, setWizardForEmployee] = useState(null)
  var [viewingEmployeeId, setViewingEmployeeId] = useState(null)
  var [previewContract, setPreviewContract] = useState(null)
  var [welcomePackEmpId, setWelcomePackEmpId] = useState(null)
  var [search, setSearch] = useState("")
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
    var resDocs = await supabase
      .from("hr_employee_documents")
      .select("employee_id")
    var resCDocs = await supabase
      .from("hr_contract_documents")
      .select("contract_id")

    // Compteur docs perso par employé
    var counts = {}
    if (resDocs.data) {
      resDocs.data.forEach(function (d) {
        counts[d.employee_id] = (counts[d.employee_id] || 0) + 1
      })
    }
    // Compteur docs contractuels par employé (via contrat)
    var contracts_ = resC.data || []
    var contractIdToEmpId = {}
    contracts_.forEach(function (c) { contractIdToEmpId[c.id] = c.employee_id })
    var cCounts = {}
    if (resCDocs.data) {
      resCDocs.data.forEach(function (d) {
        var empId = contractIdToEmpId[d.contract_id]
        if (empId) cCounts[empId] = (cCounts[empId] || 0) + 1
      })
    }

    setEmployees(resE.data || [])
    setContracts(contracts_)
    setDocCounts(counts)
    setContractDocCounts(cCounts)
    setLoading(false)
  }

  useEffect(function () { loadAll() }, [])

  // Détermine le contrat principal d'un employé (CDI le plus récent, sinon dernier extra)
  function getMainContract(empId) {
    var empContracts = contracts.filter(function (c) { return c.employee_id === empId })
    if (empContracts.length === 0) return null
    var cdi = empContracts.filter(function (c) { return c.type !== "extra" })
    if (cdi.length > 0) return cdi[0]
    return empContracts[0]
  }

  // Filtrage par recherche
  var filtered = employees
  if (search.trim()) {
    var q = search.toLowerCase()
    filtered = employees.filter(function (e) {
      var hay = ((e.prenom || "") + " " + (e.nom || "") + " " + (e.email || "") + " " + (e.telephone || "")).toLowerCase()
      return hay.indexOf(q) >= 0
    })
  }

  // Stats header
  var nbCdi = contracts.filter(function (c) {
    return c.type !== "extra" && c.status !== "archived"
  }).length
  var nbExtras = contracts.filter(function (c) {
    return c.type === "extra" && c.date_fin && new Date(c.date_fin) >= new Date()
  }).length

  return (
    <div>
      {/* === HEADER === */}
      <div className="ph">
        <div>
          <div className="pt">RESSOURCES HUMAINES</div>
          <div className="ps">
            {employees.length} salarié{employees.length > 1 ? "s" : ""}
            {nbCdi > 0 ? (" · " + nbCdi + " CDI") : ""}
            {nbExtras > 0 ? (" · " + nbExtras + " extra" + (nbExtras > 1 ? "s" : "") + " en cours") : ""}
            {" · CCN Restauration Rapide (IDCC 1501)"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn btn-y"
            onClick={function () { setShowRetroImport(true) }}
            title="Digitaliser les anciens contrats par photos ou PDF"
          >📥 Importer historique</button>
          <button
            className="btn btn-p"
            onClick={function () {
              setEditingContract(null)
              setWizardForEmployee(null)
              setShowWizard(true)
            }}
          >+ Nouvelle embauche</button>
        </div>
      </div>
      <div className="strip"></div>

      {/* === RECHERCHE === */}
      <div className="card" style={{ padding: 10 }}>
        <input
          className="inp"
          value={search}
          onChange={function (e) { setSearch(e.target.value) }}
          placeholder="🔍 Rechercher un salarié par nom, email, téléphone..."
          style={{ width: "100%", margin: 0 }}
        />
      </div>

      {/* === LISTE DES SALARIÉS === */}
      <div className="card">
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", opacity: 0.5 }}>Chargement…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>
            <div style={{ fontFamily: "Yellowtail, cursive", fontSize: 28, marginBottom: 6, color: "#FF82D7" }}>
              {search ? "Aucun salarié trouvé" : "Aucun salarié pour le moment"}
            </div>
            <div style={{ fontSize: 12 }}>
              {search ? "Essaie un autre mot-clé." : "Clique sur \"+ Nouvelle embauche\" pour commencer."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(function (e) {
              var nbContracts = contracts.filter(function (c) { return c.employee_id === e.id }).length
              var nbDocs = docCounts[e.id] || 0
              var nbCDocs = contractDocCounts[e.id] || 0
              var totalDocs = nbDocs + nbCDocs
              var mainC = getMainContract(e.id)
              var meta = mainC ? getContractTypeMeta(mainC.type || "extra") : null

              return (
                <div
                  key={e.id}
                  onClick={function () { setViewingEmployeeId(e.id) }}
                  style={{
                    background: "#FFFFFF",
                    border: "2px solid #191923",
                    borderRadius: 8,
                    padding: 14,
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 14,
                    alignItems: "center",
                    transition: "background 0.15s"
                  }}
                  onMouseEnter={function (ev) { ev.currentTarget.style.background = "#FFF8E1" }}
                  onMouseLeave={function (ev) { ev.currentTarget.style.background = "#FFFFFF" }}
                >
                  {/* Avatar */}
                  <div style={{ fontSize: 38, lineHeight: 1 }}>👤</div>

                  {/* Infos */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                      <span style={{ fontFamily: "Yellowtail, cursive", fontSize: 22, color: "#FF82D7", lineHeight: 1 }}>
                        {e.prenom || "—"} {(e.nom || "").toUpperCase()}
                      </span>
                      {meta && (
                        <span style={{
                          background: meta.color,
                          color: "#191923",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: ".5px",
                          border: "1px solid #191923"
                        }}>
                          {meta.icon} {meta.label.replace("CDI ", "")}
                        </span>
                      )}
                      {e.date_sortie ? (
                        <span style={{
                          background: "#191923",
                          color: "#FFEB5A",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: ".5px",
                        }}>
                          PARTI {new Date(e.date_sortie).toLocaleDateString("fr-FR")}
                        </span>
                      ) : null}
                    </div>
                    {(mainC && (mainC.fonction || mainC.salaire_brut_mensuel || mainC.taux_horaire_brut)) ? (
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
                        {mainC.fonction ? mainC.fonction : ""}
                        {mainC.fonction && (mainC.salaire_brut_mensuel || mainC.taux_horaire_brut) ? " · " : ""}
                        {(mainC.type !== "extra" && mainC.salaire_brut_mensuel)
                          ? (mainC.salaire_brut_mensuel + " €/mois")
                          : (mainC.taux_horaire_brut ? (mainC.taux_horaire_brut + " €/h") : "")}
                      </div>
                    ) : null}
                    <div style={{ fontSize: 11, opacity: 0.6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>📁 <b>{totalDocs}</b> doc{totalDocs > 1 ? "s" : ""}</span>
                      <span>📄 <b>{nbContracts}</b> contrat{nbContracts > 1 ? "s" : ""}</span>
                      {e.email ? <span>📧 {e.email}</span> : null}
                      {e.telephone ? <span>📞 {e.telephone}</span> : null}
                    </div>
                  </div>

                  {/* Bouton */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    <button className="btn btn-y" style={{ pointerEvents: "none" }}>
                      Ouvrir →
                    </button>
                    {!e.date_sortie ? (
                      <button
                        className="btn btn-sm"
                        onClick={function (ev) {
                          ev.stopPropagation()
                          setOffboardingEmployee(e)
                        }}
                        title="Marquer ce salarié comme parti"
                      >📤 Parti</button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* === RETRO UPLOAD WIZARD (import historique) === */}
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

      {/* === OFFBOARDING WIZARD (marquer comme parti) === */}
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

      {/* === WIZARD === */}
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

      {/* === EMPLOYEE DETAIL (vue déroulée sans onglets) === */}
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

      {/* === PREVIEW CONTRAT === */}
      {previewContract && (
        <ContractPreview
          contract={previewContract}
          onClose={function () { setPreviewContract(null) }}
        />
      )}

      {/* === PREVIEW DOSSIER DE BIENVENUE === */}
      {welcomePackEmpId && (
        <WelcomePackPreview
          employeeId={welcomePackEmpId}
          onClose={function () { setWelcomePackEmpId(null) }}
        />
      )}

      {/* === TOAST === */}
      {toast ? <div className="toast show">{toast}</div> : null}
    </div>
  )
}

// ============================================================
// CONTRACT PREVIEW (modal aperçu PDF)
// ============================================================
// Logique :
//   1) On cherche d'abord un document archivé (contrat_signe ou avenant)
//      lié à ce contrat dans hr_contract_documents → on affiche le PDF/image
//      d'origine (preuve fidèle, immuable)
//   2) Sinon (cas contrat généré nativement dans l'app, pas encore signé)
//      → fallback : on génère le HTML via buildContract
// ============================================================
function ContractPreview(props) {
  var c = props.contract
  var [emp, setEmp] = useState(null)
  var [vacs, setVacs] = useState([])
  var [archivedUrl, setArchivedUrl] = useState("")
  var [archivedMime, setArchivedMime] = useState("")
  var [archivedDoc, setArchivedDoc] = useState(null)
  var [mode, setMode] = useState("loading") // loading | archived | generated
  var iframeRef = useRef(null)

  useEffect(function () {
    var run = async function () {
      // 1) Charger employé + vacations (toujours utile)
      var resE = await supabase.from("hr_employees").select("*").eq("id", c.employee_id).single()
      var resV = await supabase.from("hr_contract_vacations").select("*").eq("contract_id", c.id).order("ordre")
      setEmp(resE.data || {})
      setVacs(resV.data || [])

      // 2) Chercher un doc archivé (contrat_signe / avenant) pour ce contrat
      var resDoc = await supabase
        .from("hr_contract_documents")
        .select("*")
        .eq("contract_id", c.id)
        .in("doc_type", ["contrat_signe", "avenant"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      var doc = resDoc.data
      if (doc && doc.file_path) {
        // 3) Generer une signed URL pour l'afficher
        var path = doc.assembled_pdf_path || doc.file_path
        var resUrl = await supabase.storage
          .from("hr-contract-docs")
          .createSignedUrl(path, 3600)
        if (resUrl.data && resUrl.data.signedUrl) {
          setArchivedUrl(resUrl.data.signedUrl)
          setArchivedMime(doc.mime_type || (path.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"))
          setArchivedDoc(doc)
          setMode("archived")
          return
        }
      }

      // 4) Pas de doc archivé → fallback génération HTML
      setMode("generated")
    }
    run()
  }, [])

  // Génération HTML uniquement en mode "generated"
  useEffect(function () {
    if (mode !== "generated" || !iframeRef.current || !emp) return
    var doc = iframeRef.current.contentDocument
    if (!doc) return
    var html = buildContract(c, emp, vacs, LOGO_PINK)
    doc.open()
    doc.write(html)
    doc.close()
  }, [mode, emp])

  function printNow() {
    if (mode === "archived" && archivedUrl) {
      // Pour PDF archivé : ouvrir dans un nouvel onglet (l'utilisateur fait Cmd+P)
      window.open(archivedUrl, "_blank")
      return
    }
    if (!iframeRef.current) return
    iframeRef.current.contentWindow.focus()
    iframeRef.current.contentWindow.print()
  }

  function downloadArchived() {
    if (archivedUrl) window.open(archivedUrl, "_blank")
  }

  // Titre dynamique selon mode
  var title = mode === "archived"
    ? "📎 Document signé d'origine"
    : (mode === "generated" ? "Aperçu du contrat (généré)" : "Chargement…")

  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl" style={{ maxWidth: 920, height: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div className="mt">{title}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {mode === "archived" ? (
                <button className="btn btn-y" onClick={downloadArchived}>↗ Ouvrir / Télécharger</button>
              ) : null}
              {mode === "generated" ? (
                <button className="btn btn-y" onClick={printNow}>↓ Imprimer en PDF</button>
              ) : null}
              <button className="btn" onClick={props.onClose}>Fermer</button>
            </div>
          </div>
          {mode === "archived" && archivedDoc ? (
            <div className="yt" style={{ fontSize: 12, marginTop: 4, color: "#191923" }}>
              Document archivé · uploadé le {new Date(archivedDoc.created_at).toLocaleDateString("fr-FR")}
              {archivedDoc.assembled_pdf_path ? " · PDF assemblé depuis photos" : ""}
            </div>
          ) : null}
          {mode === "generated" ? (
            <div className="yt" style={{ fontSize: 12, marginTop: 4, color: "#191923" }}>
              Aucun document signé archivé · génération depuis les données saisies
            </div>
          ) : null}
        </div>

        {/* Zone d'affichage : différent selon mode */}
        {mode === "loading" ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#EDEDED" }}>
            <div className="yt" style={{ fontSize: 22, color: "#FF82D7" }}>Chargement…</div>
          </div>
        ) : null}

        {mode === "archived" && archivedMime === "application/pdf" ? (
          <iframe
            src={archivedUrl}
            style={{ flex: 1, width: "100%", border: "none", background: "#EDEDED" }}
            title="Document archivé"
          />
        ) : null}

        {mode === "archived" && archivedMime !== "application/pdf" ? (
          <div style={{ flex: 1, overflow: "auto", background: "#EDEDED", padding: 14, textAlign: "center" }}>
            <img src={archivedUrl} alt="Document archivé" style={{ maxWidth: "100%", height: "auto", boxShadow: "3px 3px 0 #191923", border: "2px solid #191923" }} />
          </div>
        ) : null}

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
  var iframeRef = useRef(null)

  useEffect(function () {
    var run = async function () {
      var resE = await supabase.from("hr_employees").select("*").eq("id", props.employeeId).single()
      var resC = await supabase
        .from("hr_contracts")
        .select("*")
        .eq("employee_id", props.employeeId)
        .order("created_at", { ascending: false })
      // Priorité : non-archivé le plus récent, sinon le tout dernier
      var contractsArr = resC.data || []
      var active = contractsArr.filter(function (c) { return c.status !== "archived" })
      var pick = active.length > 0 ? active[0] : (contractsArr[0] || null)
      setEmp(resE.data || {})
      setContract(pick)
      setLoaded(true)
    }
    run()
  }, [])

  useEffect(function () {
    if (!loaded || !iframeRef.current) return
    var doc = iframeRef.current.contentDocument
    if (!doc) return
    var html = buildWelcomePack(emp || {}, contract || {}, LOGO_PINK)
    doc.open()
    doc.write(html)
    doc.close()
  }, [loaded])

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
