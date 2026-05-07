// src/app/dashboard/rh/RetroUploadWizard.tsx
// Wizard de digitalisation rétroactive de l'historique salariés.
// 5 steps : Employé → Cycle → Photos+OCR → Validation champs → Confirmation
// SWC-safe : var dans JSX, pas de generics, function() {}, pas de fragments.

"use client"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import PhotoUploader from "./PhotoUploader"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

// Charte
var PINK = "#FF82D7"
var YELLOW = "#FFEB5A"
var DARK = "#191923"

// Listes constantes
var CIVILITES = ["Madame", "Monsieur", "Mademoiselle"]
var CONTRACT_TYPES = [
  { value: "extra", label: "CDD d'usage / Extra" },
  { value: "cdi_cuisinier", label: "CDI Cuisinier" },
  { value: "cdi_caissier", label: "CDI Caissier / Vendeur" },
  { value: "cdi_cadre", label: "CDI Cadre" },
]
var STATUTS_CADRE = [
  { value: "non-cadre", label: "Non-cadre" },
  { value: "agent_maitrise", label: "Agent de maîtrise" },
  { value: "cadre", label: "Cadre" },
]
var MOTIFS_SORTIE = [
  { value: "demission", label: "Démission" },
  { value: "licenciement", label: "Licenciement" },
  { value: "rupture_conv", label: "Rupture conventionnelle" },
  { value: "fin_cdd", label: "Fin de CDD" },
  { value: "rupture_periode_essai", label: "Rupture période d'essai" },
  { value: "abandon_poste", label: "Abandon de poste" },
  { value: "retraite", label: "Départ retraite" },
  { value: "deces", label: "Décès" },
  { value: "autre", label: "Autre" },
]

function formatDateFr(iso: any) {
  if (!iso) return ""
  var s = String(iso).slice(0, 10)
  var parts = s.split("-")
  if (parts.length !== 3) return s
  return parts[2] + "/" + parts[1] + "/" + parts[0]
}

function emptyNewEmployee() {
  return {
    civilite: "Monsieur",
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
    telephone: "",
  }
}

function emptyExtractedFields() {
  return {
    type: "extra",
    type_brut: "",
    motif: "",
    date_debut: "",
    date_fin: "",
    date_embauche: "",
    fonction: "",
    classification: "",
    niveau_ccn: "",
    echelon_ccn: "",
    statut_cadre: "non-cadre",
    taux_horaire_brut: "",
    salaire_brut_mensuel: "",
    heures_hebdo: "",
    heures_mensuelles: "",
    periode_essai_mois: "",
    periode_essai_renouvelable: false,
    clause_mobilite: false,
    clause_mobilite_zone: "",
    ville_signature: "Paris",
    date_signature: "",
  }
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function RetroUploadWizard() {
  var [step, setStep] = useState(1)
  var [error, setError] = useState("")
  var [toast, setToast] = useState("")

  // Step 1 : employé
  var [employees, setEmployees] = useState([] as any[])
  var [selectedEmployee, setSelectedEmployee] = useState(null as any)
  var [employeeSearch, setEmployeeSearch] = useState("")
  var [creatingEmployee, setCreatingEmployee] = useState(false)
  var [newEmployee, setNewEmployee] = useState(emptyNewEmployee())
  var [savingEmployee, setSavingEmployee] = useState(false)

  // Step 2 : cycle
  var [cycles, setCycles] = useState([] as any[])
  var [selectedCycle, setSelectedCycle] = useState(null as any)
  var [creatingCycle, setCreatingCycle] = useState(false)
  var [newCycleDate, setNewCycleDate] = useState("")
  var [savingCycle, setSavingCycle] = useState(false)

  // Step 3 : photos + analyse
  var [docMode, setDocMode] = useState("contrat_signe") // 'contrat_signe' | 'avenant'
  var [supersedeContractId, setSupersedeContractId] = useState("")
  var [pages, setPages] = useState([] as any[])
  var [analyzing, setAnalyzing] = useState(false)
  var [analysisProgress, setAnalysisProgress] = useState("")
  var [pendingContractId, setPendingContractId] = useState("")
  var [pendingContractDocId, setPendingContractDocId] = useState("")

  // Step 4 : extraction + validation
  var [extraction, setExtraction] = useState(null as any) // raw IA result
  var [editedFields, setEditedFields] = useState(emptyExtractedFields())
  var [savingContract, setSavingContract] = useState(false)

  // Step 5 : confirmation + actions
  var [createdContract, setCreatedContract] = useState(null as any)

  // Mini-modal clôture cycle
  var [closingCycle, setClosingCycle] = useState(false)
  var [exitDate, setExitDate] = useState("")
  var [exitReason, setExitReason] = useState("demission")
  var [savingExit, setSavingExit] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(function () { setToast("") }, 3000)
  }

  // Charge les employés au montage
  useEffect(function () {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    var res = await supabase
      .from("hr_employees")
      .select("id, civilite, prenom, nom, date_naissance, date_sortie")
      .order("nom", { ascending: true })
    setEmployees(res.data || [])
  }

  async function loadCyclesForEmployee(employeeId: string) {
    try {
      var res = await fetch("/api/hr/cycles?employee_id=" + employeeId)
      var data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erreur chargement cycles")
        return []
      }
      return data.cycles || []
    } catch (e: any) {
      setError(e.message)
      return []
    }
  }

  // ============================================================
  // STEP 1 ACTIONS
  // ============================================================
  async function handleSelectEmployee(emp: any) {
    setError("")
    setSelectedEmployee(emp)
    var cyc = await loadCyclesForEmployee(emp.id)
    setCycles(cyc)
    // Si cycle ouvert existe, on le pré-sélectionne
    var openCycle = cyc.find(function (c: any) { return !c.date_sortie })
    if (openCycle) setSelectedCycle(openCycle)
    setStep(2)
  }

  async function handleCreateEmployee() {
    setError("")
    if (!newEmployee.prenom || !newEmployee.nom) {
      setError("Prénom et nom requis")
      return
    }
    setSavingEmployee(true)
    try {
      var res = await supabase
        .from("hr_employees")
        .insert(newEmployee)
        .select("*")
        .single()
      if (res.error) throw new Error(res.error.message)
      var created = res.data
      setEmployees([created].concat(employees))
      setSelectedEmployee(created)
      setCreatingEmployee(false)
      setNewEmployee(emptyNewEmployee())
      setCycles([])
      showToast("Salarié créé")
      setStep(2)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingEmployee(false)
    }
  }

  // ============================================================
  // STEP 2 ACTIONS
  // ============================================================
  async function handleCreateCycle() {
    setError("")
    if (!newCycleDate) {
      setError("Date d'entrée requise")
      return
    }
    if (!selectedEmployee) return
    setSavingCycle(true)
    try {
      var res = await fetch("/api/hr/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: selectedEmployee.id,
          date_entree: newCycleDate,
        }),
      })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur création cycle")
      var newCycle = Object.assign({}, data.cycle, { contracts: [] })
      setCycles([newCycle].concat(cycles))
      setSelectedCycle(newCycle)
      setCreatingCycle(false)
      setNewCycleDate("")
      showToast("Cycle créé")
      // Premier contrat → forcément contrat initial
      setDocMode("contrat_signe")
      setSupersedeContractId("")
      setStep(3)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingCycle(false)
    }
  }

  function handleSelectCycle(cycle: any) {
    setSelectedCycle(cycle)
    // Si cycle déjà a des contrats → mode avenant par défaut
    if (cycle.contracts && cycle.contracts.length > 0) {
      setDocMode("avenant")
      var current = cycle.contracts.find(function (c: any) { return c.is_current })
      if (current) setSupersedeContractId(current.id)
      else setSupersedeContractId(cycle.contracts[cycle.contracts.length - 1].id)
    } else {
      setDocMode("contrat_signe")
      setSupersedeContractId("")
    }
    setStep(3)
  }

  // ============================================================
  // STEP 3 ACTIONS — analyse IA
  // ============================================================
  async function handleAnalyze() {
    setError("")
    if (pages.length === 0) {
      setError("Ajoutez au moins une photo")
      return
    }
    if (!selectedCycle) return

    setAnalyzing(true)
    try {
      // a) Créer contrat draft minimal
      setAnalysisProgress("1/3 — Création du contrat (brouillon)...")
      var draftPayload: any = {
        cycle_id: selectedCycle.id,
        employee_id: selectedEmployee.id,
        status: "draft",
      }
      if (docMode === "avenant" && supersedeContractId) {
        draftPayload.supersedes_contract_id = supersedeContractId
      }
      var resCtr = await fetch("/api/hr/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload),
      })
      var dataCtr = await resCtr.json()
      if (!resCtr.ok) throw new Error(dataCtr.error || "Création contrat échouée")
      var contractId = dataCtr.contract.id
      setPendingContractId(contractId)

      // b) Upload pages
      setAnalysisProgress("2/3 — Upload des photos vers Storage...")
      var fd = new FormData()
      fd.append("contract_id", contractId)
      fd.append("doc_type", docMode)
      fd.append("assemble_pdf", "1")
      for (var i = 0; i < pages.length; i++) {
        fd.append("file_" + String(i).padStart(3, "0"), pages[i].file)
      }
      var resUp = await fetch("/api/hr/upload-pages", { method: "POST", body: fd })
      var dataUp = await resUp.json()
      if (!resUp.ok) throw new Error(dataUp.error || "Upload échoué")
      var docId = dataUp.document.id
      setPendingContractDocId(docId)

      // c) OCR Claude Vision
      setAnalysisProgress("3/3 — Analyse IA en cours (~10-30s)...")
      var resEx = await fetch("/api/hr/extract-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_doc_id: docId }),
      })
      var dataEx = await resEx.json()
      if (!resEx.ok) throw new Error(dataEx.error || "Extraction échouée")

      var ext = dataEx.extraction || {}
      setExtraction(ext)

      // Pré-remplir editedFields à partir de l'extraction
      var contractFields = ext.contract || {}
      var employeeFields = ext.employee || {}
      var ed = emptyExtractedFields()
      // mapper les champs contract
      Object.keys(ed).forEach(function (k) {
        if (contractFields[k] !== undefined && contractFields[k] !== null) {
          ed[k] = contractFields[k]
        }
      })
      // Si type non détecté, garder le mode courant comme valeur par défaut
      if (!ed.type) ed.type = "extra"
      if (!ed.statut_cadre) ed.statut_cadre = "non-cadre"
      // Si on est en avenant, on supersede une row existante avec date_debut = effective_to
      // donc date_debut doit être présente
      setEditedFields(ed)

      // Mettre à jour les infos employé si elles ont été extraites et que ce sont des nouveautés
      // (uniquement si l'employé existant n'avait pas l'info)
      if (selectedEmployee && employeeFields) {
        var empPatch: any = {}
        var fieldsToCopy = ["date_naissance", "lieu_naissance", "nationalite", "adresse", "code_postal", "ville", "num_secu"]
        fieldsToCopy.forEach(function (k) {
          if (!selectedEmployee[k] && employeeFields[k]) empPatch[k] = employeeFields[k]
        })
        if (Object.keys(empPatch).length > 0) {
          await supabase.from("hr_employees").update(empPatch).eq("id", selectedEmployee.id)
          setSelectedEmployee(Object.assign({}, selectedEmployee, empPatch))
        }
      }

      setStep(4)
      showToast("Analyse IA terminée — vérifiez les champs")
    } catch (e: any) {
      setError("Erreur analyse : " + e.message)
    } finally {
      setAnalyzing(false)
      setAnalysisProgress("")
    }
  }

  // Permet de skip l'IA (saisie 100% manuelle)
  function handleSkipAnalysis() {
    setExtraction(null)
    setEditedFields(emptyExtractedFields())
    setStep(4)
  }

  // ============================================================
  // STEP 4 ACTIONS — sauver le contrat
  // ============================================================
  function setField(key: string, value: any) {
    var copy = Object.assign({}, editedFields)
    copy[key] = value
    setEditedFields(copy)
  }

  async function handleSaveContract() {
    setError("")
    if (!editedFields.date_debut) {
      setError("Date de début requise")
      return
    }
    if (!editedFields.fonction) {
      setError("Fonction requise")
      return
    }

    setSavingContract(true)
    try {
      var payload: any = {}
      // copier les champs édités
      Object.keys(editedFields).forEach(function (k) {
        var v = editedFields[k]
        if (v === "" || v === null || v === undefined) return
        // Convertir les nombres
        if (k === "taux_horaire_brut" || k === "salaire_brut_mensuel" || k === "heures_hebdo" || k === "heures_mensuelles" || k === "periode_essai_mois") {
          var n = parseFloat(String(v).replace(",", "."))
          if (!isNaN(n)) payload[k] = n
          return
        }
        payload[k] = v
      })
      payload.status = "archived" // contrat rétroactif → directement archivé
      payload.contract_label = (docMode === "avenant" ? "Avenant — " : "Contrat — ") + (editedFields.fonction || "")

      // Si on a déjà un pendingContractId (cas IA), on PATCH
      // Sinon (cas skip IA), on crée un draft puis on PATCH
      var contractId = pendingContractId

      if (!contractId) {
        // Skip IA : créer le contrat from scratch
        var draftPayload: any = {
          cycle_id: selectedCycle.id,
          employee_id: selectedEmployee.id,
          status: "draft",
        }
        if (docMode === "avenant" && supersedeContractId) {
          draftPayload.supersedes_contract_id = supersedeContractId
        }
        var resCtr = await fetch("/api/hr/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftPayload),
        })
        var dataCtr = await resCtr.json()
        if (!resCtr.ok) throw new Error(dataCtr.error || "Création contrat échouée")
        contractId = dataCtr.contract.id
        setPendingContractId(contractId)
      }

      // PATCH du contrat avec tous les champs validés
      payload.contract_id = contractId
      var resPatch = await fetch("/api/hr/contracts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      var dataPatch = await resPatch.json()
      if (!resPatch.ok) throw new Error(dataPatch.error || "Sauvegarde échouée")

      // Marquer le doc OCR comme validé (si on en a un)
      if (pendingContractDocId) {
        await supabase
          .from("hr_contract_documents")
          .update({ validated_by_user: true })
          .eq("id", pendingContractDocId)
      }

      setCreatedContract(dataPatch.contract)
      // Recharger les cycles pour avoir le nouveau contrat
      var cyc = await loadCyclesForEmployee(selectedEmployee.id)
      setCycles(cyc)
      var refreshedCycle = cyc.find(function (c: any) { return c.id === selectedCycle.id })
      if (refreshedCycle) setSelectedCycle(refreshedCycle)
      setStep(5)
      showToast(docMode === "avenant" ? "Avenant enregistré" : "Contrat enregistré")
    } catch (e: any) {
      setError("Erreur sauvegarde : " + e.message)
    } finally {
      setSavingContract(false)
    }
  }

  // ============================================================
  // STEP 5 ACTIONS
  // ============================================================
  function handleAddAvenant() {
    // Reset des states de step 3/4 pour un nouvel upload
    setPages([])
    setExtraction(null)
    setEditedFields(emptyExtractedFields())
    setPendingContractId("")
    setPendingContractDocId("")
    setCreatedContract(null)
    setDocMode("avenant")
    // Le supersede pointe sur le contrat qu'on vient de créer
    if (createdContract) setSupersedeContractId(createdContract.id)
    setStep(3)
  }

  async function handleCloseCycle() {
    setError("")
    if (!exitDate) { setError("Date de sortie requise"); return }
    if (!selectedCycle) return

    setSavingExit(true)
    try {
      var res = await fetch("/api/hr/cycles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: selectedCycle.id,
          date_sortie: exitDate,
          motif_sortie: exitReason,
        }),
      })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur clôture cycle")

      // Mettre à jour aussi hr_employees.date_sortie / motif_sortie pour cohérence cache
      await supabase
        .from("hr_employees")
        .update({ date_sortie: exitDate, motif_sortie: exitReason })
        .eq("id", selectedEmployee.id)

      setClosingCycle(false)
      showToast("Cycle clôturé — salarié marqué comme parti")
      // Reset wizard pour un nouvel import
      handleStartOver()
    } catch (e: any) {
      setError("Erreur clôture : " + e.message)
    } finally {
      setSavingExit(false)
    }
  }

  function handleStartOver() {
    setStep(1)
    setSelectedEmployee(null)
    setEmployeeSearch("")
    setCreatingEmployee(false)
    setNewEmployee(emptyNewEmployee())
    setCycles([])
    setSelectedCycle(null)
    setCreatingCycle(false)
    setNewCycleDate("")
    setDocMode("contrat_signe")
    setSupersedeContractId("")
    setPages([])
    setExtraction(null)
    setEditedFields(emptyExtractedFields())
    setPendingContractId("")
    setPendingContractDocId("")
    setCreatedContract(null)
    setError("")
    loadEmployees()
  }

  // ============================================================
  // RENDER
  // ============================================================

  // Filtrer les employés selon la recherche
  var filteredEmployees = employees.filter(function (e: any) {
    if (!employeeSearch) return true
    var q = employeeSearch.toLowerCase()
    return (
      (e.nom || "").toLowerCase().indexOf(q) >= 0 ||
      (e.prenom || "").toLowerCase().indexOf(q) >= 0
    )
  })

  // Découper les cycles en ouverts / clôturés (utile pour Step 2)
  var openCycles = cycles.filter(function (c: any) { return !c.date_sortie })
  var closedCycles = cycles.filter(function (c: any) { return !!c.date_sortie })
  var hasOpenCycle = openCycles.length > 0

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: 16, fontFamily: "Arial Narrow, sans-serif", color: DARK }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Yellowtail, cursive", color: PINK, fontSize: 36, margin: "0 0 4px 0" }}>
          Import historique RH
        </h1>
        <div style={{ fontSize: 14, color: "#666" }}>
          Digitalisation rétroactive des contrats existants
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, fontSize: 12 }}>
        {[1, 2, 3, 4, 5].map(function (n: number) {
          var labels = ["Salarié", "Cycle", "Photos", "Validation", "OK"]
          var active = step === n
          var done = step > n
          return (
            <div
              key={n}
              style={{
                flex: 1,
                padding: "8px 4px",
                borderRadius: 8,
                background: active ? PINK : (done ? "#FFE0F2" : "#F0F0F0"),
                color: active ? "#fff" : (done ? PINK : "#999"),
                textAlign: "center",
                fontWeight: active ? "bold" : "normal",
              }}
            >
              {n}. {labels[n - 1]}
            </div>
          )
        })}
      </div>

      {/* Erreur */}
      {error ? (
        <div style={{
          padding: 12, marginBottom: 16, borderRadius: 8,
          background: "#FEE", border: "1px solid #FBB", color: "#900",
        }}>
          ⚠ {error}
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          padding: "12px 20px", borderRadius: 8,
          background: DARK, color: "#fff", fontSize: 14,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>
          {toast}
        </div>
      ) : null}

      {/* ============================================================
          STEP 1 : Sélection / création employé
          ============================================================ */}
      {step === 1 && !creatingEmployee ? (
        <div>
          <h2 style={{ fontFamily: "Yellowtail, cursive", color: DARK, fontSize: 24, marginBottom: 16 }}>
            Quel salarié ?
          </h2>
          <input
            type="text"
            value={employeeSearch}
            onChange={function (e: any) { setEmployeeSearch(e.target.value) }}
            placeholder="Rechercher par nom ou prénom..."
            style={{
              width: "100%", padding: 12, borderRadius: 8,
              border: "1px solid #ddd", fontSize: 14, marginBottom: 16,
              fontFamily: "Arial Narrow, sans-serif",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {filteredEmployees.length === 0 ? (
              <div style={{ padding: 16, textAlign: "center", color: "#888" }}>
                {employeeSearch ? "Aucun salarié trouvé." : "Aucun salarié pour l'instant."}
              </div>
            ) : null}
            {filteredEmployees.map(function (emp: any) {
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={function () { handleSelectEmployee(emp) }}
                  style={{
                    padding: 12, textAlign: "left", cursor: "pointer",
                    background: "#fff", border: "1px solid #eee", borderRadius: 8,
                    fontFamily: "Arial Narrow, sans-serif", fontSize: 14,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <span>
                    <strong>{(emp.civilite || "") + " " + (emp.prenom || "") + " " + (emp.nom || "")}</strong>
                    {emp.date_sortie ? <span style={{ color: "#888", marginLeft: 8 }}>(parti le {formatDateFr(emp.date_sortie)})</span> : null}
                  </span>
                  <span style={{ color: PINK }}>→</span>
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={function () { setCreatingEmployee(true) }}
            style={{
              width: "100%", padding: 14, borderRadius: 8,
              background: YELLOW, border: "none",
              fontFamily: "Arial Narrow, sans-serif", fontWeight: "bold", fontSize: 14,
              color: DARK, cursor: "pointer",
            }}
          >
            ＋ Créer un nouveau salarié
          </button>
        </div>
      ) : null}

      {step === 1 && creatingEmployee ? (
        <div>
          <h2 style={{ fontFamily: "Yellowtail, cursive", color: DARK, fontSize: 24, marginBottom: 16 }}>
            Nouveau salarié
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <SelectField label="Civilité" value={newEmployee.civilite}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { civilite: v })) }}
              options={CIVILITES.map(function (c: any) { return { value: c, label: c } })} />
            <TextField label="Nationalité" value={newEmployee.nationalite}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { nationalite: v })) }} />
            <TextField label="Prénom *" value={newEmployee.prenom}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { prenom: v })) }} />
            <TextField label="Nom *" value={newEmployee.nom}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { nom: v })) }} />
            <TextField type="date" label="Date de naissance" value={newEmployee.date_naissance}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { date_naissance: v })) }} />
            <TextField label="Lieu de naissance" value={newEmployee.lieu_naissance}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { lieu_naissance: v })) }} />
            <TextField label="Adresse" value={newEmployee.adresse} colSpan={2}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { adresse: v })) }} />
            <TextField label="Code postal" value={newEmployee.code_postal}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { code_postal: v })) }} />
            <TextField label="Ville" value={newEmployee.ville}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { ville: v })) }} />
            <TextField label="N° Sécurité sociale" value={newEmployee.num_secu}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { num_secu: v })) }} />
            <TextField label="Téléphone" value={newEmployee.telephone}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { telephone: v })) }} />
            <TextField label="Email" value={newEmployee.email} colSpan={2}
              onChange={function (v: any) { setNewEmployee(Object.assign({}, newEmployee, { email: v })) }} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={function () { setCreatingEmployee(false) }}
              style={btnSecondary}>Annuler</button>
            <button type="button" onClick={handleCreateEmployee} disabled={savingEmployee}
              style={Object.assign({}, btnPrimary, { opacity: savingEmployee ? 0.6 : 1 })}>
              {savingEmployee ? "Création..." : "Créer le salarié"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ============================================================
          STEP 2 : Sélection / création cycle
          ============================================================ */}
      {step === 2 && selectedEmployee ? (
          <div>
            <button type="button" onClick={function () { setStep(1); setSelectedEmployee(null); setCycles([]) }}
              style={btnBack}>← Changer de salarié</button>
            <h2 style={{ fontFamily: "Yellowtail, cursive", color: DARK, fontSize: 24, marginBottom: 4 }}>
              Cycle d'emploi de {selectedEmployee.prenom} {selectedEmployee.nom}
            </h2>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
              Un cycle = une période entrée → sortie. Si la personne a été ré-embauchée, elle a plusieurs cycles.
            </div>

            {/* Cycle en cours — gros call-to-action */}
            {hasOpenCycle ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: "bold", color: PINK, marginBottom: 8, letterSpacing: 1 }}>
                  CYCLE EN COURS — clique pour ajouter un contrat ou avenant
                </div>
                {openCycles.map(function (cy: any) {
                  var nbContracts = (cy.contracts || []).length
                  return (
                    <button
                      key={cy.id}
                      type="button"
                      onClick={function () { handleSelectCycle(cy) }}
                      style={{
                        width: "100%", padding: 16, textAlign: "left", cursor: "pointer",
                        background: "#FFF5FB", border: "2px solid " + PINK, borderRadius: 12,
                        fontSize: 14, marginBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: 16, color: DARK }}>
                            Depuis le {formatDateFr(cy.date_entree)} — en cours
                          </div>
                          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                            {nbContracts} contrat{nbContracts > 1 ? "s" : ""} enregistré{nbContracts > 1 ? "s" : ""}
                          </div>
                        </div>
                        <span style={{ color: PINK, fontSize: 24 }}>→</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {/* Cycles passés (s'il y en a) */}
            {closedCycles.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: "bold", color: "#888", marginBottom: 8, letterSpacing: 1 }}>
                  CYCLES PASSÉS
                </div>
                {closedCycles.map(function (cy: any) {
                  var nbContracts = (cy.contracts || []).length
                  return (
                    <button
                      key={cy.id}
                      type="button"
                      onClick={function () { handleSelectCycle(cy) }}
                      style={{
                        width: "100%", padding: 12, textAlign: "left", cursor: "pointer",
                        background: "#fff", border: "1px solid #eee", borderRadius: 8,
                        fontSize: 14, marginBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong>
                            {formatDateFr(cy.date_entree)} → {formatDateFr(cy.date_sortie)}
                          </strong>
                          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                            {nbContracts} contrat{nbContracts > 1 ? "s" : ""}
                            {cy.motif_sortie ? " • " + cy.motif_sortie : ""}
                          </div>
                        </div>
                        <span style={{ color: "#999" }}>→</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : null}

            {/* Aucun cycle du tout */}
            {cycles.length === 0 ? (
              <div style={{ padding: 16, background: "#FFF8E1", borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
                Aucun cycle d'emploi enregistré. Crée le premier ci-dessous.
              </div>
            ) : null}

            {/* Bouton créer cycle — UNIQUEMENT si pas de cycle ouvert */}
            {!hasOpenCycle && !creatingCycle ? (
              <button type="button" onClick={function () { setCreatingCycle(true) }}
                style={{
                  width: "100%", padding: 14, borderRadius: 8,
                  background: YELLOW, border: "none",
                  fontFamily: "Arial Narrow, sans-serif", fontWeight: "bold", fontSize: 14,
                  color: DARK, cursor: "pointer",
                }}>
                ＋ {cycles.length === 0 ? "Créer le premier cycle d'emploi" : "Nouveau cycle (ré-embauche)"}
              </button>
            ) : null}

            {!hasOpenCycle && creatingCycle ? (
              <div style={{ padding: 16, background: "#fff", border: "1px solid #eee", borderRadius: 8 }}>
                <TextField type="date" label="Date d'entrée *" value={newCycleDate} onChange={setNewCycleDate} />
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={function () { setCreatingCycle(false); setNewCycleDate("") }}
                    style={btnSecondary}>Annuler</button>
                  <button type="button" onClick={handleCreateCycle} disabled={savingCycle}
                    style={Object.assign({}, btnPrimary, { opacity: savingCycle ? 0.6 : 1 })}>
                    {savingCycle ? "Création..." : "Créer le cycle"}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Hint si cycle ouvert : pour ré-embauche, il faut clôturer */}
            {hasOpenCycle ? (
              <div style={{
                padding: 12, marginTop: 8, fontSize: 12, color: "#666",
                background: "#FAFAFA", borderRadius: 8, fontStyle: "italic",
              }}>
                💡 Pour enregistrer une <strong>ré-embauche</strong> de cette personne, il faut d'abord clôturer le cycle en cours
                (date de sortie + motif). Tu pourras le faire au step 5 après avoir enregistré son dernier contrat.
              </div>
            ) : null}
          </div>
      ) : null}

      {/* ============================================================
          STEP 3 : Type de doc + photos + analyse
          ============================================================ */}
      {step === 3 && selectedCycle ? (
        <div>
          <button type="button" onClick={function () { setStep(2) }} style={btnBack}>← Changer de cycle</button>
          <h2 style={{ fontFamily: "Yellowtail, cursive", color: DARK, fontSize: 24, marginBottom: 4 }}>
            Photos du document
          </h2>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
            Cycle du {formatDateFr(selectedCycle.date_entree)}
            {selectedCycle.contracts && selectedCycle.contracts.length > 0
              ? " • " + selectedCycle.contracts.length + " contrat(s) déjà enregistré(s)"
              : " • premier contrat de ce cycle"}
          </div>

          {/* Choix du type de doc */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button"
              onClick={function () { setDocMode("contrat_signe"); setSupersedeContractId("") }}
              disabled={selectedCycle.contracts && selectedCycle.contracts.length > 0 && docMode !== "contrat_signe"}
              style={tabBtn(docMode === "contrat_signe")}>
              Contrat initial
            </button>
            <button type="button"
              onClick={function () {
                setDocMode("avenant")
                if (selectedCycle.contracts && selectedCycle.contracts.length > 0) {
                  var current = selectedCycle.contracts.find(function (c: any) { return c.is_current })
                  if (current) setSupersedeContractId(current.id)
                }
              }}
              disabled={!selectedCycle.contracts || selectedCycle.contracts.length === 0}
              style={tabBtn(docMode === "avenant")}>
              Avenant
            </button>
          </div>

          {docMode === "avenant" && selectedCycle.contracts && selectedCycle.contracts.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Quel contrat est modifié par cet avenant ?</label>
              <select value={supersedeContractId}
                onChange={function (e: any) { setSupersedeContractId(e.target.value) }}
                style={inputStyle}>
                {selectedCycle.contracts.map(function (c: any) {
                  return (
                    <option key={c.id} value={c.id}>
                      {c.contract_label || (c.fonction || "Contrat")} — {formatDateFr(c.date_debut)}
                      {c.is_current ? " (actuel)" : ""}
                    </option>
                  )
                })}
              </select>
            </div>
          ) : null}

          {/* Uploader photos */}
          <PhotoUploader pages={pages} onChange={setPages} disabled={analyzing} />

          {/* Boutons analyse */}
          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button type="button"
              onClick={handleSkipAnalysis}
              disabled={analyzing}
              style={btnSecondary}>
              Saisir manuellement (sans IA)
            </button>
            <button type="button"
              onClick={handleAnalyze}
              disabled={analyzing || pages.length === 0}
              style={Object.assign({}, btnPrimary, { opacity: (analyzing || pages.length === 0) ? 0.5 : 1 })}>
              {analyzing ? "Analyse en cours..." : "🤖 Analyser via IA"}
            </button>
          </div>
          {analysisProgress ? (
            <div style={{ marginTop: 12, padding: 12, background: "#FFF8E1", borderRadius: 8, fontSize: 13 }}>
              ⏳ {analysisProgress}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ============================================================
          STEP 4 : Validation des champs extraits
          ============================================================ */}
      {step === 4 ? (
        <div>
          <button type="button" onClick={function () { setStep(3) }} style={btnBack}>← Retour photos</button>
          <h2 style={{ fontFamily: "Yellowtail, cursive", color: DARK, fontSize: 24, marginBottom: 4 }}>
            Vérifier les champs extraits
          </h2>
          {extraction && extraction.meta ? (
            <div style={{
              padding: 12, marginBottom: 16, borderRadius: 8,
              background: extraction.meta.confidence === "high" ? "#E8F5E9" : (extraction.meta.confidence === "low" ? "#FFEBEE" : "#FFF8E1"),
              fontSize: 13,
            }}>
              <strong>Confiance IA : {extraction.meta.confidence || "?"}</strong>
              {extraction.meta.notes ? <div style={{ marginTop: 4 }}>📝 {extraction.meta.notes}</div> : null}
              {extraction.meta.detected_avenant && docMode === "contrat_signe" ? (
                <div style={{ marginTop: 4, color: "#c92a2a" }}>
                  ⚠ L'IA pense que ce document est un AVENANT, pas un contrat initial. Reviens en arrière pour ajuster ?
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            <SelectField label="Type de contrat" value={editedFields.type}
              onChange={function (v: any) { setField("type", v) }}
              options={CONTRACT_TYPES} />
            <TextField label="Fonction *" value={editedFields.fonction}
              onChange={function (v: any) { setField("fonction", v) }} />
            <TextField type="date" label="Date début *" value={editedFields.date_debut}
              onChange={function (v: any) { setField("date_debut", v) }} />
            <TextField type="date" label="Date fin (si CDD)" value={editedFields.date_fin}
              onChange={function (v: any) { setField("date_fin", v) }} />
            <TextField type="date" label="Date d'embauche" value={editedFields.date_embauche}
              onChange={function (v: any) { setField("date_embauche", v) }} />
            <TextField label="Motif (CDD)" value={editedFields.motif}
              onChange={function (v: any) { setField("motif", v) }} />
            <TextField label="Niveau CCN" value={editedFields.niveau_ccn}
              onChange={function (v: any) { setField("niveau_ccn", v) }} />
            <TextField label="Échelon CCN" value={editedFields.echelon_ccn}
              onChange={function (v: any) { setField("echelon_ccn", v) }} />
            <TextField label="Classification (texte)" value={editedFields.classification} colSpan={2}
              onChange={function (v: any) { setField("classification", v) }} />
            <SelectField label="Statut" value={editedFields.statut_cadre}
              onChange={function (v: any) { setField("statut_cadre", v) }}
              options={STATUTS_CADRE} />
            <TextField label="Salaire brut mensuel (€)" value={editedFields.salaire_brut_mensuel}
              onChange={function (v: any) { setField("salaire_brut_mensuel", v) }} />
            <TextField label="Taux horaire brut (€)" value={editedFields.taux_horaire_brut}
              onChange={function (v: any) { setField("taux_horaire_brut", v) }} />
            <TextField label="Heures hebdo" value={editedFields.heures_hebdo}
              onChange={function (v: any) { setField("heures_hebdo", v) }} />
            <TextField label="Heures mensuelles" value={editedFields.heures_mensuelles}
              onChange={function (v: any) { setField("heures_mensuelles", v) }} />
            <TextField label="Période d'essai (mois)" value={editedFields.periode_essai_mois}
              onChange={function (v: any) { setField("periode_essai_mois", v) }} />
            <TextField type="date" label="Date de signature" value={editedFields.date_signature}
              onChange={function (v: any) { setField("date_signature", v) }} />
            <TextField label="Ville signature" value={editedFields.ville_signature}
              onChange={function (v: any) { setField("ville_signature", v) }} />
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" onClick={function () { setStep(3) }} style={btnSecondary}>
              Retour
            </button>
            <button type="button" onClick={handleSaveContract} disabled={savingContract}
              style={Object.assign({}, btnPrimary, { opacity: savingContract ? 0.6 : 1 })}>
              {savingContract ? "Sauvegarde..." : "💾 Enregistrer le " + (docMode === "avenant" ? "avenant" : "contrat")}
            </button>
          </div>
        </div>
      ) : null}

      {/* ============================================================
          STEP 5 : Confirmation + actions suivantes
          ============================================================ */}
      {step === 5 && createdContract ? (
        <div>
          <div style={{
            padding: 24, borderRadius: 12, background: "#E8F5E9",
            textAlign: "center", marginBottom: 24,
          }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h2 style={{ fontFamily: "Yellowtail, cursive", color: DARK, fontSize: 28, margin: "8px 0" }}>
              {docMode === "avenant" ? "Avenant" : "Contrat"} enregistré !
            </h2>
            <div style={{ fontSize: 14, color: "#555" }}>
              {selectedEmployee.prenom} {selectedEmployee.nom} • {createdContract.fonction || "Sans fonction"}
              {createdContract.date_debut ? " • depuis le " + formatDateFr(createdContract.date_debut) : ""}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button type="button" onClick={handleAddAvenant}
              style={Object.assign({}, btnPrimary, { background: PINK })}>
              ＋ Ajouter un avenant à ce contrat
            </button>
            {!closingCycle ? (
              <button type="button" onClick={function () {
                setClosingCycle(true)
                setExitDate("")
                setExitReason("demission")
              }} style={btnSecondary}>
                ⚐ Clôturer ce cycle (sortie du salarié)
              </button>
            ) : (
              <div style={{ padding: 16, background: "#fff", border: "1px solid #eee", borderRadius: 8 }}>
                <h3 style={{ fontFamily: "Yellowtail, cursive", color: DARK, fontSize: 20, margin: "0 0 12px 0" }}>
                  Clôture du cycle
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <TextField type="date" label="Date de sortie *" value={exitDate} onChange={setExitDate} />
                  <SelectField label="Motif de sortie" value={exitReason} onChange={setExitReason} options={MOTIFS_SORTIE} />
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button type="button" onClick={function () { setClosingCycle(false) }} style={btnSecondary}>
                    Annuler
                  </button>
                  <button type="button" onClick={handleCloseCycle} disabled={savingExit}
                    style={Object.assign({}, btnPrimary, { opacity: savingExit ? 0.6 : 1 })}>
                    {savingExit ? "Clôture..." : "Confirmer la clôture"}
                  </button>
                </div>
              </div>
            )}
            <button type="button" onClick={handleStartOver} style={btnSecondary}>
              📥 Importer un autre salarié / cycle
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ============================================================
// SOUS-COMPOSANTS DE FORMULAIRE (top-level pour SWC safety)
// ============================================================
var labelStyle: any = {
  display: "block",
  fontSize: 12,
  fontWeight: "bold",
  color: "#666",
  marginBottom: 4,
  fontFamily: "Arial Narrow, sans-serif",
}

var inputStyle: any = {
  width: "100%",
  padding: 10,
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 14,
  fontFamily: "Arial Narrow, sans-serif",
  boxSizing: "border-box",
}

var btnPrimary: any = {
  flex: 1,
  padding: "12px 16px",
  borderRadius: 8,
  background: "#191923",
  color: "#fff",
  border: "none",
  fontFamily: "Arial Narrow, sans-serif",
  fontWeight: "bold",
  fontSize: 14,
  cursor: "pointer",
}

var btnSecondary: any = {
  flex: 1,
  padding: "12px 16px",
  borderRadius: 8,
  background: "#fff",
  color: "#191923",
  border: "1px solid #ddd",
  fontFamily: "Arial Narrow, sans-serif",
  fontSize: 14,
  cursor: "pointer",
}

var btnBack: any = {
  background: "none",
  border: "none",
  color: "#FF82D7",
  cursor: "pointer",
  fontSize: 13,
  padding: "0 0 12px 0",
  fontFamily: "Arial Narrow, sans-serif",
}

function tabBtn(active: boolean): any {
  return {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid " + (active ? "#FF82D7" : "#ddd"),
    background: active ? "#FF82D7" : "#fff",
    color: active ? "#fff" : "#191923",
    fontFamily: "Arial Narrow, sans-serif",
    fontWeight: active ? "bold" : "normal",
    fontSize: 14,
    cursor: "pointer",
  }
}

function TextField(props: any) {
  var span = props.colSpan === 2 ? "1 / -1" : "auto"
  return (
    <div style={{ gridColumn: span }}>
      <label style={labelStyle}>{props.label}</label>
      <input
        type={props.type || "text"}
        value={props.value || ""}
        onChange={function (e: any) { props.onChange(e.target.value) }}
        style={inputStyle}
      />
    </div>
  )
}

function SelectField(props: any) {
  var span = props.colSpan === 2 ? "1 / -1" : "auto"
  return (
    <div style={{ gridColumn: span }}>
      <label style={labelStyle}>{props.label}</label>
      <select
        value={props.value || ""}
        onChange={function (e: any) { props.onChange(e.target.value) }}
        style={inputStyle}
      >
        {(props.options || []).map(function (opt: any) {
          return <option key={opt.value} value={opt.value}>{opt.label}</option>
        })}
      </select>
    </div>
  )
}
