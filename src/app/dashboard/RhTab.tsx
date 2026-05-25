"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { LOGO_PINK } from "./logos"
import RhWizard from "./rh/RhWizard"
import EmployeeDetail from "./rh/EmployeeDetail"
import SignaturesPendingWidget from "./rh/SignaturesPendingWidget"
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
  var [activeTab, setActiveTab] = useState("actifs")  // actifs | anciens | tous
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
    // Charger les cycles d'emploi pour pouvoir résoudre l'employee_id des contrats
    // créés via régularisation rétroactive (qui ont seulement cycle_id)
    var resCyc = await supabase
      .from("hr_employment_cycles")
      .select("id, employee_id")
    var resDocs = await supabase
      .from("hr_employee_documents")
      .select("employee_id")
    var resCDocs = await supabase
      .from("hr_contract_documents")
      .select("contract_id")

    // Construire mapping cycleId → employeeId
    var cycleToEmp = {}
    ;(resCyc.data || []).forEach(function (cyc) {
      cycleToEmp[cyc.id] = cyc.employee_id
    })

    // Enrichir chaque contrat avec _employee_id effectif (fusion des deux schémas)
    var contracts_ = (resC.data || []).map(function (c) {
      var effectiveEmpId = c.employee_id
        || (c.cycle_id ? cycleToEmp[c.cycle_id] : null)
        || null
      return Object.assign({}, c, { _employee_id: effectiveEmpId })
    })

    // Compteur docs perso par employé
    var counts = {}
    if (resDocs.data) {
      resDocs.data.forEach(function (d) {
        counts[d.employee_id] = (counts[d.employee_id] || 0) + 1
      })
    }
    // Compteur docs contractuels par employé (via contrat → _employee_id effectif)
    var contractIdToEmpId = {}
    contracts_.forEach(function (c) { contractIdToEmpId[c.id] = c._employee_id })
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
  // Utilise _employee_id pour gérer aussi les contrats rattachés via cycle_id
  function getMainContract(empId) {
    var empContracts = contracts.filter(function (c) { return c._employee_id === empId })
    if (empContracts.length === 0) return null
    var cdi = empContracts.filter(function (c) { return c.type !== "extra" })
    if (cdi.length > 0) return cdi[0]
    return empContracts[0]
  }

  // Filtrage par onglet (actifs / anciens / tous)
  var filtered = employees
  if (activeTab === "actifs") {
    filtered = employees.filter(function (e) { return !e.date_sortie })
  } else if (activeTab === "anciens") {
    filtered = employees.filter(function (e) { return !!e.date_sortie })
  }
  // Filtrage par recherche (s'applique après le filtre onglet)
  if (search.trim()) {
    var q = search.toLowerCase()
    filtered = filtered.filter(function (e) {
      var hay = ((e.prenom || "") + " " + (e.nom || "") + " " + (e.email || "") + " " + (e.telephone || "")).toLowerCase()
      return hay.indexOf(q) >= 0
    })
  }

  // Comptes par catégorie pour les badges des onglets
  var nbActifsList = employees.filter(function (e) { return !e.date_sortie }).length
  var nbAnciensList = employees.filter(function (e) { return !!e.date_sortie }).length

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
            className="btn"
            onClick={function () { window.open("/api/hr/personnel-register", "_blank") }}
            title="Imprimer le registre du personnel (Article L.1221-13)"
          >📄 Registre du personnel</button>
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

      {/* === 🔥 Widget signatures en attente (cron relances 24h) === */}
      <SignaturesPendingWidget />

      {/* === ONGLETS ACTIFS / ANCIENS / TOUS === */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0, borderBottom: "2.5px solid #191923", flexWrap: "wrap" }}>
        <button
          onClick={function () { setActiveTab("actifs") }}
          style={{
            background: activeTab === "actifs" ? "#FFEB5A" : "#FFFFFF",
            color: "#191923",
            border: "2.5px solid #191923",
            borderBottom: activeTab === "actifs" ? "2.5px solid #FFEB5A" : "2.5px solid #191923",
            marginBottom: "-2.5px",
            padding: "8px 18px",
            fontFamily: "'Arial Narrow', Arial, sans-serif",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontSize: 11,
            cursor: "pointer",
            boxShadow: activeTab === "actifs" ? "3px 3px 0 #191923" : "none",
            position: "relative",
            zIndex: activeTab === "actifs" ? 2 : 1,
          }}
        >👥 Actifs ({nbActifsList})</button>
        <button
          onClick={function () { setActiveTab("anciens") }}
          style={{
            background: activeTab === "anciens" ? "#FF82D7" : "#FFFFFF",
            color: "#191923",
            border: "2.5px solid #191923",
            borderBottom: activeTab === "anciens" ? "2.5px solid #FF82D7" : "2.5px solid #191923",
            marginBottom: "-2.5px",
            marginLeft: 6,
            padding: "8px 18px",
            fontFamily: "'Arial Narrow', Arial, sans-serif",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontSize: 11,
            cursor: "pointer",
            boxShadow: activeTab === "anciens" ? "3px 3px 0 #191923" : "none",
            position: "relative",
            zIndex: activeTab === "anciens" ? 2 : 1,
          }}
        >📤 Anciens ({nbAnciensList})</button>
        <button
          onClick={function () { setActiveTab("tous") }}
          style={{
            background: activeTab === "tous" ? "#191923" : "#FFFFFF",
            color: activeTab === "tous" ? "#FFEB5A" : "#191923",
            border: "2.5px solid #191923",
            borderBottom: activeTab === "tous" ? "2.5px solid #191923" : "2.5px solid #191923",
            marginBottom: "-2.5px",
            marginLeft: 6,
            padding: "8px 18px",
            fontFamily: "'Arial Narrow', Arial, sans-serif",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 1,
            fontSize: 11,
            cursor: "pointer",
            boxShadow: activeTab === "tous" ? "3px 3px 0 #191923" : "none",
            position: "relative",
            zIndex: activeTab === "tous" ? 2 : 1,
          }}
        >Tous ({employees.length})</button>
      </div>

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
              {search ? "Aucun salarié trouvé"
                : (activeTab === "actifs" ? "Aucun salarié en poste"
                : (activeTab === "anciens" ? "Aucun ancien salarié"
                : "Aucun salarié pour le moment"))}
            </div>
            <div style={{ fontSize: 12 }}>
              {search ? "Essaie un autre mot-clé."
                : (activeTab === "actifs" ? "Clique sur \"+ Nouvelle embauche\" pour ajouter."
                : (activeTab === "anciens" ? "Aucun salarié n'est marqué comme parti."
                : "Clique sur \"+ Nouvelle embauche\" pour commencer."))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(function (e) {
              var nbContracts = contracts.filter(function (c) { return c._employee_id === e.id }).length
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
                    border: e.needs_regularization ? "2.5px solid #FF82D7" : "2px solid #191923",
                    borderRadius: 8,
                    padding: 14,
                    cursor: "pointer",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 14,
                    alignItems: "center",
                    transition: "background 0.15s",
                    boxShadow: e.needs_regularization ? "3px 3px 0 #FF82D7" : "none",
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
                      {e.needs_regularization ? (
                        <span style={{
                          background: "#FF82D7",
                          color: "#191923",
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: ".5px",
                          border: "1.5px solid #191923",
                          boxShadow: "2px 2px 0 #191923",
                        }}>
                          ⚠ À RÉGULARISER
                        </span>
                      ) : null}
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
