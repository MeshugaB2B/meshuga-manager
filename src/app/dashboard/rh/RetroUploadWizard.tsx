// src/app/dashboard/rh/RetroUploadWizard.tsx
// Wizard de digitalisation rétroactive de l'historique salariés.
// Modal Meshuga avec DA respectée (classes d'Edward).
// Flow simplifié : drop docs → IA extrait tout (type doc, salarié, contrat) → tu valides → c'est créé.
// SWC-safe : var dans JSX, pas de generics, function() {}, pas de fragments.

"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { compressFileList, totalSizeMb } from "@/lib/imageCompress"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

// ============================================================
// CONSTANTES
// ============================================================
var MAX_FILE_MB = 20
var MAX_PAGES = 30
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
var DOC_TYPE_LABELS: any = {
  contrat_initial: "Contrat initial",
  avenant: "Avenant",
  fiche_paie: "Fiche de paie",
  solde_tout_compte: "Solde de tout compte",
  certificat_travail: "Certificat de travail",
  attestation_france_travail: "Attestation France Travail",
  lettre_demission: "Lettre de démission",
  lettre_licenciement: "Lettre de licenciement",
  rupture_conv: "Rupture conventionnelle",
  dossier_bienvenue: "Dossier de bienvenue",
  autre: "Autre document",
}

// ============================================================
// HELPERS
// ============================================================
function formatDateFr(iso: any) {
  if (!iso) return ""
  var s = String(iso).slice(0, 10)
  var parts = s.split("-")
  if (parts.length !== 3) return s
  return parts[2] + "/" + parts[1] + "/" + parts[0]
}

function emptyEmployee() {
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

function emptyContractFields() {
  return {
    type: "extra",
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
    ville_signature: "Paris",
    date_signature: "",
  }
}

function makeFileEntry(file: any) {
  var sizeMb = file.size / (1024 * 1024)
  var mime = (file.type || "").toLowerCase()
  var preview = null
  if (mime === "image/jpeg" || mime === "image/jpg" || mime === "image/png" || mime === "image/webp") {
    preview = URL.createObjectURL(file)
  }
  var isPdf = mime === "application/pdf"
  return {
    id: Math.random().toString(36).slice(2),
    file: file,
    preview: preview,
    sizeMb: sizeMb,
    mime: mime,
    isPdf: isPdf,
  }
}

// Mapping infos employé extraites → formulaire
function fillEmployeeFromExtraction(current: any, extracted: any) {
  if (!extracted) return current
  var copy = Object.assign({}, current)
  var keys = ["civilite", "prenom", "nom", "date_naissance", "lieu_naissance",
    "nationalite", "adresse", "code_postal", "ville", "num_secu", "email", "telephone"]
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i]
    if (extracted[k]) copy[k] = extracted[k]
  }
  return copy
}

// Mapping infos contrat extraites → formulaire
function fillContractFromExtraction(current: any, extracted: any) {
  if (!extracted) return current
  var copy = Object.assign({}, current)
  Object.keys(copy).forEach(function (k) {
    if (extracted[k] !== undefined && extracted[k] !== null && extracted[k] !== "") {
      copy[k] = extracted[k]
    }
  })
  if (!copy.type) copy.type = "extra"
  if (!copy.statut_cadre) copy.statut_cadre = "non-cadre"
  return copy
}

// ============================================================
// COMPOSANT PRINCIPAL — MODAL
// ============================================================
export default function RetroUploadWizard(props: any) {
  // props : { onClose: function, onSaved?: function }
  var onClose = props.onClose || function () {}
  var onSaved = props.onSaved || function () {}

  // ====== STATE GÉNÉRAL ======
  var [phase, setPhase] = useState("drop")  // drop | analyzing | review | saved | manual
  var [error, setError] = useState("")
  var [toast, setToast] = useState("")

  // ====== EMPLOYÉ EN COURS DE SESSION ======
  // Si null : on est sur le 1er doc, l'employé sera créé après extraction
  // Si objet : on a déjà créé/sélectionné un employé (docs suivants pour cette personne)
  var [activeEmployee, setActiveEmployee] = useState(null as any)
  var [activeCycle, setActiveCycle] = useState(null as any)
  var [activeLastContractId, setActiveLastContractId] = useState("")

  // ====== UPLOAD ======
  var [files, setFiles] = useState([] as any[])
  var fileInputRef = useRef<any>(null)
  var [dragOver, setDragOver] = useState(false)

  // ====== ANALYSE & RÉSULTAT ======
  var [analysisProgress, setAnalysisProgress] = useState("")
  var [extraction, setExtraction] = useState(null as any)
  var [pendingContractId, setPendingContractId] = useState("")
  var [pendingDocId, setPendingDocId] = useState("")
  var [docType, setDocType] = useState("contrat_initial")  // détecté ou choisi par Edward
  var [employeeFields, setEmployeeFields] = useState(emptyEmployee())
  var [contractFields, setContractFields] = useState(emptyContractFields())
  var [exitDate, setExitDate] = useState("")
  var [exitMotif, setExitMotif] = useState("")
  var [periodMonth, setPeriodMonth] = useState("")
  var [saving, setSaving] = useState(false)

  // ====== HISTORIQUE DOCS DE LA SESSION (pour récap fin) ======
  var [sessionDocs, setSessionDocs] = useState([] as any[])

  // ====== FERMETURE ======
  async function handleCloseRequest() {
    // Cas 1 : rien n'a été fait, on ferme direct
    if (sessionDocs.length === 0 && phase === "drop" && !activeEmployee) {
      onClose()
      return
    }
    // Cas 2 : il y a un draft pending non sauvegardé (en review ou analyzing)
    var hasPendingDraft = pendingContractId !== "" || pendingDocId !== ""
    var msg = hasPendingDraft && phase === "review"
      ? "Le document analysé n'a pas été enregistré. Si tu fermes maintenant, il sera supprimé. Continuer ?"
      : "Fermer le wizard ? Les documents enregistrés ne seront pas perdus."
    if (!window.confirm(msg)) return

    // Si en review : nettoyer le draft non validé pour ne pas laisser d'orphelin
    if (hasPendingDraft && phase === "review") {
      await cleanupPendingDraft()
      // Si l'employé est encore un stub (pas validé), le supprimer aussi
      if (activeEmployee && activeEmployee.prenom === "(à compléter)" && sessionDocs.length === 0) {
        try {
          if (activeCycle) await supabase.from("hr_employment_cycles").delete().eq("id", activeCycle.id)
          await supabase.from("hr_employees").delete().eq("id", activeEmployee.id)
        } catch (e) { /* non-fatal */ }
      }
    }
    onSaved()
    onClose()
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(function () { setToast("") }, 2800)
  }

  // ============================================================
  // UPLOAD HANDLERS
  // ============================================================
  function addFiles(fileList: any) {
    var newFiles = []
    var rejected = []
    var hasPdf = files.some(function (p: any) { return p.isPdf })
    var hasImage = files.some(function (p: any) { return !p.isPdf })

    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i]
      if (!f) continue
      var mime = (f.type || "").toLowerCase()
      var isImage = mime.indexOf("image/") === 0
      var isPdf = mime === "application/pdf"
      if (!isImage && !isPdf) { rejected.push(f.name + " (ni image ni PDF)"); continue }
      var sizeMb = f.size / (1024 * 1024)
      if (sizeMb > MAX_FILE_MB) { rejected.push(f.name + " (" + sizeMb.toFixed(1) + " MB)"); continue }
      if (isPdf) {
        if (hasPdf || newFiles.some(function (p: any) { return p.isPdf })) {
          rejected.push(f.name + " (un seul PDF par doc)"); continue
        }
        if (hasImage) { rejected.push(f.name + " (pas de mix PDF+photos)"); continue }
      } else {
        if (hasPdf || newFiles.some(function (p: any) { return p.isPdf })) {
          rejected.push(f.name + " (vide d'abord la liste)"); continue
        }
      }
      newFiles.push(makeFileEntry(f))
    }
    if (rejected.length > 0) window.alert("Fichiers ignorés :\n" + rejected.join("\n"))
    setFiles(files.concat(newFiles).slice(0, MAX_PAGES))
  }

  function handleInputChange(e: any) {
    var fl = e.target && e.target.files ? e.target.files : []
    if (fl.length > 0) addFiles(fl)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleDrop(e: any) {
    e.preventDefault(); e.stopPropagation()
    setDragOver(false)
    var dt = e.dataTransfer
    if (dt && dt.files && dt.files.length > 0) addFiles(dt.files)
  }

  function moveFile(idx: number, dir: number) {
    var ni = idx + dir
    if (ni < 0 || ni >= files.length) return
    var copy = files.slice()
    var tmp = copy[idx]; copy[idx] = copy[ni]; copy[ni] = tmp
    setFiles(copy)
  }

  function removeFile(idx: number) {
    var f = files[idx]
    if (f && f.preview) { try { URL.revokeObjectURL(f.preview) } catch (e) {} }
    var copy = files.slice()
    copy.splice(idx, 1)
    setFiles(copy)
  }

  function clearFiles() {
    files.forEach(function (f: any) { if (f.preview) { try { URL.revokeObjectURL(f.preview) } catch (e) {} } })
    setFiles([])
  }

  // ============================================================
  // CRÉATION EMPLOYÉ + CYCLE (à partir de l'extraction ou manuel)
  // ============================================================
  async function ensureEmployeeAndCycle(empData: any, dateEntreeIso: string) {
    // 1) Créer l'employé en base
    var insertEmp: any = {}
    var keys = ["civilite", "prenom", "nom", "date_naissance", "lieu_naissance",
      "nationalite", "adresse", "code_postal", "ville", "num_secu", "email", "telephone"]
    keys.forEach(function (k) { if (empData[k]) insertEmp[k] = empData[k] })

    var resE = await supabase.from("hr_employees").insert(insertEmp).select("*").single()
    if (resE.error) throw new Error("Création employé : " + resE.error.message)
    var newEmp = resE.data

    // 2) Créer le cycle
    var resC = await fetch("/api/hr/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employee_id: newEmp.id, date_entree: dateEntreeIso }),
    })
    var dataC = await resC.json()
    if (!resC.ok) throw new Error("Création cycle : " + (dataC.error || resC.statusText))
    var newCycle = dataC.cycle

    return { employee: newEmp, cycle: newCycle }
  }

  // ============================================================
  // CLEANUP — supprimer un draft orphelin (suite à retry / retour)
  // ============================================================
  async function cleanupPendingDraft() {
    if (!pendingDocId && !pendingContractId) return
    try {
      // 1) Supprimer le doc d'abord (Storage cleanup côté Supabase via cascade orphelins, sinon DB only)
      if (pendingDocId) {
        await supabase.from("hr_contract_documents").delete().eq("id", pendingDocId)
      }
      // 2) Supprimer le contrat draft seulement s'il est vraiment en draft (sécurité)
      if (pendingContractId) {
        await supabase.from("hr_contracts").delete().eq("id", pendingContractId).eq("status", "draft")
      }
    } catch (e) {
      // non-fatal — on continue
    }
    setPendingContractId("")
    setPendingDocId("")
  }

  // ============================================================
  // ANALYSE — flux complet upload + extract
  // ============================================================
  async function handleAnalyze() {
    setError("")
    if (files.length === 0) { setError("Ajoute au moins un document"); return }

    // Cleanup du draft précédent si existant (cas retry après retour)
    await cleanupPendingDraft()

    setPhase("analyzing")
    var contractIdLocal = ""

    try {
      // Étape A : si pas d'employé actif, on fait juste l'analyse SANS créer d'employé/cycle
      // L'employé sera créé après que Edward valide les champs extraits.
      if (!activeEmployee) {
        // Analyse pure (pas de contract row pour l'instant)
        // On a besoin d'un endpoint d'analyse standalone, mais on n'en a pas.
        // Solution : créer un contrat "draft" temporaire orphelin (sans cycle), uploader, analyser, puis nettoyer si Edward annule.
        // Plus propre : créer employé+cycle PROVISOIRES et nettoyer si annulation.
        // Pour aller vite : on appelle directement l'API d'extraction sur les fichiers en envoyant le buffer.
        // Mais notre API actuelle prend un contract_doc_id, donc il faut un contrat existant.
        // → On crée un cycle et un contrat "draft" attachés à un employé temporaire,
        //    et on les remplacera par les vrais à la sauvegarde.
        // Plus simple encore : créer un employé "stub" auto-intitulé "(à analyser)",
        //    on fera la mise à jour avec les vraies données après extraction.
        setAnalysisProgress("1/4 — Préparation...")
        var stubInsert: any = {
          civilite: "Monsieur",
          prenom: "(à compléter)",
          nom: "(à compléter)",
          nationalite: "française",
        }
        var resStub = await supabase.from("hr_employees").insert(stubInsert).select("*").single()
        if (resStub.error) throw new Error("Préparation : " + resStub.error.message)
        var stubEmp = resStub.data

        var todayIso = new Date().toISOString().slice(0, 10)
        var resStubCycle = await fetch("/api/hr/cycles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employee_id: stubEmp.id, date_entree: todayIso }),
        })
        var dataStubCycle = await resStubCycle.json()
        if (!resStubCycle.ok) throw new Error("Préparation cycle : " + (dataStubCycle.error || ""))

        setActiveEmployee(stubEmp)
        setActiveCycle(dataStubCycle.cycle)
        // continue ci-dessous avec activeEmployee + activeCycle
        var workingEmployee = stubEmp
        var workingCycle = dataStubCycle.cycle
      } else {
        var workingEmployee = activeEmployee
        var workingCycle = activeCycle
      }

      // Étape B : créer un contrat draft
      setAnalysisProgress("2/4 — Création contrat (brouillon)...")
      var draftBody: any = {
        cycle_id: workingCycle.id,
        employee_id: workingEmployee.id,
        status: "draft",
      }
      if (activeLastContractId) draftBody.supersedes_contract_id = activeLastContractId

      var resCtr = await fetch("/api/hr/contracts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftBody),
      })
      var dataCtr = await resCtr.json()
      if (!resCtr.ok) throw new Error("Contrat draft : " + (dataCtr.error || ""))
      contractIdLocal = dataCtr.contract.id
      setPendingContractId(contractIdLocal)

      // Étape C : compresser les images (multi-niveaux si nécessaire) puis upload
      setAnalysisProgress("3/4 — Optimisation des images...")
      var rawFiles = files.map(function (f: any) { return f.file })
      var compressedFiles = await compressFileList(rawFiles, function (cur: number, total: number, level: string) {
        var levelLabel = level === "L1" ? "" : (level === "L2" ? " (qualité réduite)" : " (qualité minimale)")
        setAnalysisProgress("3/4 — Optimisation" + levelLabel + " (" + (cur + 1) + "/" + total + ")...")
      })
      var sizeMb = totalSizeMb(compressedFiles)
      setAnalysisProgress("3/4 — Upload des documents (" + sizeMb.toFixed(1) + " MB)...")

      var fd = new FormData()
      fd.append("contract_id", contractIdLocal)
      fd.append("doc_type", "contrat_signe") // type provisoire — sera mis à jour après détection
      fd.append("assemble_pdf", "1")
      for (var i = 0; i < compressedFiles.length; i++) {
        fd.append("file_" + String(i).padStart(3, "0"), compressedFiles[i])
      }
      var resUp = await fetch("/api/hr/upload-pages", { method: "POST", body: fd })

      // Détection 413 (Vercel renvoie du HTML, pas du JSON)
      if (resUp.status === 413 || (!resUp.ok && resUp.headers.get("content-type")?.indexOf("text/html") === 0)) {
        throw new Error("Documents trop volumineux malgré la compression (" + sizeMb.toFixed(1) + " MB). Réduis le nombre de photos ou prends-les en plus basse résolution.")
      }
      var dataUp = await resUp.json()
      if (!resUp.ok) throw new Error("Upload : " + (dataUp.error || ""))
      var docId = dataUp.document.id
      setPendingDocId(docId)

      // Étape D : OCR
      setAnalysisProgress("4/4 — Analyse IA en cours (~10-30s)...")
      var resEx = await fetch("/api/hr/extract-contract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_doc_id: docId }),
      })
      var dataEx = await resEx.json()
      if (!resEx.ok) throw new Error("Analyse IA : " + (dataEx.error || ""))

      var ext = dataEx.extraction || {}
      setExtraction(ext)

      // Auto-fill des formulaires
      var detectedDocType = ext.doc_type || "contrat_initial"
      setDocType(detectedDocType)

      // Pré-remplir l'employé (uniquement si on est en stub ou si champs manquants)
      var newEmpFields = fillEmployeeFromExtraction(employeeFields, ext.employee)
      setEmployeeFields(newEmpFields)

      // Pré-remplir le contrat (si applicable)
      if (detectedDocType === "contrat_initial" || detectedDocType === "avenant") {
        var newContractFields = fillContractFromExtraction(emptyContractFields(), ext.contract)
        setContractFields(newContractFields)
      }

      // Pré-remplir exit_info / period_month si applicable
      if (ext.exit_info) {
        if (ext.exit_info.date_sortie) setExitDate(ext.exit_info.date_sortie)
        if (ext.exit_info.motif_sortie) setExitMotif(ext.exit_info.motif_sortie)
      }
      if (ext.period_month) setPeriodMonth(ext.period_month)

      setPhase("review")
    } catch (e: any) {
      setError(e.message || "Erreur analyse")
      setPhase("drop")
    } finally {
      setAnalysisProgress("")
    }
  }

  // ============================================================
  // SAUVEGARDE — finalise tout après que Edward a validé
  // ============================================================
  async function handleSave() {
    setError("")
    setSaving(true)

    try {
      // 1) Si on est en stub, on met à jour les vraies infos employé
      if (activeEmployee && (activeEmployee.prenom === "(à compléter)" || activeEmployee.nom === "(à compléter)")) {
        if (!employeeFields.prenom || !employeeFields.nom) {
          throw new Error("Prénom et nom du salarié obligatoires")
        }
        var updatePayload: any = {}
        Object.keys(employeeFields).forEach(function (k: any) {
          if (employeeFields[k]) updatePayload[k] = employeeFields[k]
        })
        var resUpd = await supabase.from("hr_employees").update(updatePayload).eq("id", activeEmployee.id).select("*").single()
        if (resUpd.error) throw new Error("MAJ employé : " + resUpd.error.message)
        setActiveEmployee(resUpd.data)
      } else if (activeEmployee) {
        // Compléter les champs manquants si l'IA a trouvé du nouveau
        var patch: any = {}
        Object.keys(employeeFields).forEach(function (k: any) {
          if (!activeEmployee[k] && employeeFields[k]) patch[k] = employeeFields[k]
        })
        if (Object.keys(patch).length > 0) {
          await supabase.from("hr_employees").update(patch).eq("id", activeEmployee.id)
          setActiveEmployee(Object.assign({}, activeEmployee, patch))
        }
      }

      // 2) Recaler la date_entree du cycle si on est en stub et c'est le 1er doc contractuel
      if (activeCycle && (docType === "contrat_initial") && contractFields.date_debut) {
        await supabase.from("hr_employment_cycles").update({ date_entree: contractFields.date_debut }).eq("id", activeCycle.id)
        var refreshedCycle = Object.assign({}, activeCycle, { date_entree: contractFields.date_debut })
        setActiveCycle(refreshedCycle)
      }

      // 3) Selon le type de doc, on finalise différemment
      if (docType === "contrat_initial" || docType === "avenant") {
        if (!contractFields.fonction) throw new Error("Fonction obligatoire")
        if (!contractFields.date_debut) throw new Error("Date de début obligatoire")

        // Builder le payload PATCH contrat
        var ctrPayload: any = { contract_id: pendingContractId }
        Object.keys(contractFields).forEach(function (k: any) {
          var v = contractFields[k]
          if (v === "" || v === null || v === undefined) return
          if (k === "taux_horaire_brut" || k === "salaire_brut_mensuel" || k === "heures_hebdo" || k === "heures_mensuelles" || k === "periode_essai_mois") {
            var n = parseFloat(String(v).replace(",", "."))
            if (!isNaN(n)) ctrPayload[k] = n
            return
          }
          ctrPayload[k] = v
        })
        ctrPayload.status = "archived"
        ctrPayload.contract_label = (docType === "avenant" ? "Avenant — " : "Contrat — ") + (contractFields.fonction || "")

        var resPatch = await fetch("/api/hr/contracts", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ctrPayload),
        })
        var dataPatch = await resPatch.json()
        if (!resPatch.ok) throw new Error("Sauvegarde contrat : " + (dataPatch.error || ""))

        // Marquer le doc OCR comme validé
        var newLabel = DOC_TYPE_LABELS[docType] || "Document"
        var dbDocType = docType === "contrat_initial" ? "contrat_signe" : "avenant"
        await supabase.from("hr_contract_documents").update({
          validated_by_user: true,
          doc_type: dbDocType,
          label: newLabel + " — " + (contractFields.fonction || ""),
        }).eq("id", pendingDocId)

        setActiveLastContractId(pendingContractId)
        setSessionDocs(sessionDocs.concat([{ doc_type: docType, label: newLabel + " — " + contractFields.fonction, contract_id: pendingContractId }]))
      } else {
        // Doc non-contractuel (fiche paie, solde, certificat, etc.)
        // On a déjà une row hr_contract_documents créée à l'upload. On met à jour son doc_type.
        var dbDocType2 = mapDocTypeToDb(docType)
        var label2 = DOC_TYPE_LABELS[docType] || "Document"
        var updates: any = {
          validated_by_user: true,
          doc_type: dbDocType2,
          label: label2,
        }
        if (periodMonth) updates.period_month = periodMonth

        await supabase.from("hr_contract_documents").update(updates).eq("id", pendingDocId)

        // Le contrat draft créé à l'upload n'est pas un vrai contrat — on le supprime
        // (sauf si c'est rattaché au last contract de la session — cas où Edward upload une fiche de paie après le contrat initial)
        if (activeLastContractId && pendingContractId !== activeLastContractId) {
          // Réattacher le doc au vrai dernier contrat de la session
          await supabase.from("hr_contract_documents").update({ contract_id: activeLastContractId }).eq("id", pendingDocId)
          // Supprimer le contrat draft orphelin
          await supabase.from("hr_contracts").delete().eq("id", pendingContractId)
        }
        // Sinon, on garde le contrat draft minimal (Edward devra ajouter un vrai contrat plus tard)

        // Si c'est un solde de tout compte / certificat / lettre démission/licenciement → proposer clôture cycle
        if ((docType === "solde_tout_compte" || docType === "certificat_travail" || docType === "lettre_demission" || docType === "lettre_licenciement" || docType === "rupture_conv") && exitDate) {
          await fetch("/api/hr/cycles", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cycle_id: activeCycle.id,
              date_sortie: exitDate,
              motif_sortie: exitMotif || "autre",
            }),
          })
          await supabase.from("hr_employees").update({
            date_sortie: exitDate,
            motif_sortie: exitMotif || "autre",
          }).eq("id", activeEmployee.id)
        }

        setSessionDocs(sessionDocs.concat([{ doc_type: docType, label: label2, doc_id: pendingDocId }]))
      }

      showToast("Document enregistré ✓")
      setPhase("saved")
    } catch (e: any) {
      setError(e.message || "Erreur sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  function mapDocTypeToDb(t: string): string {
    var map: any = {
      contrat_initial: "contrat_signe",
      avenant: "avenant",
      fiche_paie: "fiche_paie",
      solde_tout_compte: "solde_tout_compte",
      certificat_travail: "certificat_travail",
      attestation_france_travail: "attestation_france_travail",
      lettre_demission: "lettre_demission",
      lettre_licenciement: "lettre_licenciement",
      rupture_conv: "rupture_conv",
      dossier_bienvenue: "dossier_bienvenue",
      autre: "autre",
    }
    return map[t] || "autre"
  }

  // ============================================================
  // ÉTAPE SAVED — proposer un autre doc ou terminer
  // ============================================================
  function handleAddAnotherDoc() {
    clearFiles()
    setExtraction(null)
    setContractFields(emptyContractFields())
    setExitDate("")
    setExitMotif("")
    setPeriodMonth("")
    setPendingContractId("")
    setPendingDocId("")
    setError("")
    setPhase("drop")
  }

  function handleFinish() {
    onSaved()
    onClose()
  }

  // ============================================================
  // MODE MANUEL — créer juste l'employé sans aucun document
  // ============================================================
  async function handleCreateEmptyEmployee() {
    setError("")
    if (!employeeFields.prenom || !employeeFields.nom) {
      setError("Prénom et nom obligatoires")
      return
    }
    if (!contractFields.date_debut) {
      setError("Date d'entrée obligatoire (date d'embauche réelle)")
      return
    }
    setSaving(true)
    try {
      var insertEmp: any = {}
      Object.keys(employeeFields).forEach(function (k: any) { if (employeeFields[k]) insertEmp[k] = employeeFields[k] })
      var resE = await supabase.from("hr_employees").insert(insertEmp).select("*").single()
      if (resE.error) throw new Error(resE.error.message)
      var newEmp = resE.data

      var resC = await fetch("/api/hr/cycles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: newEmp.id,
          date_entree: contractFields.date_debut,
          notes: "Créé sans document (mise en conformité à faire — avenant rétroactif)",
        }),
      })
      var dataC = await resC.json()
      if (!resC.ok) throw new Error(dataC.error || "")

      setActiveEmployee(newEmp)
      setActiveCycle(dataC.cycle)
      setSessionDocs([{ doc_type: "manual_employee", label: "Fiche créée sans document" }])
      showToast("Salarié créé — pense à faire signer un avenant de mise en conformité")
      setPhase("saved")
    } catch (e: any) {
      setError("Création : " + e.message)
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // RENDER MODAL
  // ============================================================
  var employeeName = activeEmployee
    ? ((activeEmployee.prenom === "(à compléter)" ? employeeFields.prenom : activeEmployee.prenom) + " " +
       (activeEmployee.nom === "(à compléter)" ? employeeFields.nom : activeEmployee.nom)).trim()
    : ""

  return (
    <div className="overlay" onClick={function (e: any) { if (e.target === e.currentTarget) handleCloseRequest() }}>
      <div className="modal modal-xl">
        {/* HEADER */}
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mt">📥 Importer historique RH</div>
            <button className="btn btn-sm" onClick={handleCloseRequest} style={{ background: "#FFFFFF" }}>×</button>
          </div>
          {activeEmployee ? (
            <div className="yt" style={{ fontSize: 14, marginTop: 6, color: "#191923" }}>
              {employeeName ? "Salarié en cours : " + employeeName : ""}
              {sessionDocs.length > 0 ? " · " + sessionDocs.length + " doc" + (sessionDocs.length > 1 ? "s" : "") + " enregistré" + (sessionDocs.length > 1 ? "s" : "") : ""}
            </div>
          ) : null}
        </div>

        {/* BODY */}
        <div className="mb">
          {/* Erreur */}
          {error ? (
            <div className="card-p" style={{ marginBottom: 14, padding: 10, color: "#191923", fontWeight: 900, fontSize: 12 }}>
              ⚠ {error}
            </div>
          ) : null}

          {/* PHASE DROP — uploader documents */}
          {phase === "drop" ? (
            <div>
              {!activeEmployee ? (
                <div className="card-y" style={{ marginBottom: 14 }}>
                  <div className="yt" style={{ fontSize: 18, marginBottom: 4 }}>Premier document</div>
                  <div style={{ fontSize: 11 }}>
                    Drop n'importe quel document RH (contrat, avenant, fiche de paie, solde de tout compte…).
                    L'IA détecte le type, extrait les infos du salarié et crée tout en cascade.
                  </div>
                </div>
              ) : (
                <div className="card-y" style={{ marginBottom: 14 }}>
                  <div className="yt" style={{ fontSize: 18, marginBottom: 4 }}>Document suivant pour {employeeName}</div>
                  <div style={{ fontSize: 11 }}>
                    Avenant, fiche de paie, solde de tout compte… L'IA classe automatiquement.
                  </div>
                </div>
              )}

              {/* Zone drop */}
              <div
                onDrop={handleDrop}
                onDragOver={function (e: any) { e.preventDefault(); setDragOver(true) }}
                onDragLeave={function (e: any) { e.preventDefault(); setDragOver(false) }}
                onClick={function () { if (fileInputRef.current) fileInputRef.current.click() }}
                style={{
                  border: "2px dashed " + (dragOver ? "#FF82D7" : "#191923"),
                  borderRadius: 7,
                  padding: 22,
                  textAlign: "center",
                  cursor: "pointer",
                  background: dragOver ? "#FFF5FB" : "#FFFFFF",
                  boxShadow: "3px 3px 0 #191923",
                }}
              >
                <div style={{ fontSize: 30, marginBottom: 4 }}>📷📄</div>
                <div className="yt" style={{ fontSize: 16, marginBottom: 4 }}>
                  {files.length === 0 ? "Drop un PDF OU des photos" : "Ajouter d'autres pages"}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  JPEG / PNG / HEIC / WEBP — ou un PDF — max {MAX_FILE_MB} MB par fichier
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleInputChange}
                  style={{ display: "none" }}
                />
              </div>

              {/* Liste fichiers */}
              {files.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  {files.map(function (f: any, idx: number) {
                    return (
                      <div key={f.id} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: 6,
                        background: "#FFFFFF", border: "2px solid #191923", borderRadius: 5,
                        marginBottom: 5, boxShadow: "2px 2px 0 #191923",
                      }}>
                        <div style={{
                          width: 24, height: 24, background: "#FF82D7", color: "#191923",
                          borderRadius: 3, fontSize: 11, fontWeight: 900,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1.5px solid #191923",
                        }}>{idx + 1}</div>
                        <div style={{
                          width: 40, height: 40, background: "#EBEBEB", borderRadius: 4,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          overflow: "hidden", flexShrink: 0,
                        }}>
                          {f.preview
                            ? <img src={f.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ fontSize: 18 }}>{f.isPdf ? "📄" : "🖼️"}</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 11 }}>
                          <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {f.file.name || "doc-" + (idx + 1)}
                          </div>
                          <div style={{ opacity: 0.6, fontSize: 10 }}>{f.sizeMb.toFixed(1)} MB · {f.mime}</div>
                        </div>
                        <button className="btn btn-sm" onClick={function () { moveFile(idx, -1) }} disabled={idx === 0}>↑</button>
                        <button className="btn btn-sm" onClick={function () { moveFile(idx, 1) }} disabled={idx === files.length - 1}>↓</button>
                        <button className="btn btn-sm btn-red" onClick={function () { removeFile(idx) }}>×</button>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {/* Mode manuel — pour anciens salariés sans aucun document */}
              {!activeEmployee && files.length === 0 ? (
                <div style={{ marginTop: 18, padding: 12, background: "#FAFAFA", borderRadius: 7, border: "1.5px dashed #999" }}>
                  <div style={{ fontSize: 11, marginBottom: 6 }}>
                    Aucun document existant pour ce salarié (cas du salarié 2022 sans contrat) ?
                  </div>
                  <button className="btn btn-n" onClick={function () { setPhase("manual") }}>
                    Saisir manuellement (sans document)
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* PHASE ANALYZING — loading */}
          {phase === "analyzing" ? (
            <div style={{ padding: 30, textAlign: "center" }}>
              <div className="yt" style={{ fontSize: 28, color: "#FF82D7", marginBottom: 8 }}>
                🤖 Analyse en cours
              </div>
              <div style={{ fontSize: 12, marginBottom: 14 }}>{analysisProgress}</div>
              <div className="prog-wrap"><div className="prog-fill" style={{ width: "70%" }}></div></div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 10 }}>
                Claude lit le document. Ça peut prendre 10 à 30 secondes selon la taille.
              </div>
            </div>
          ) : null}

          {/* PHASE REVIEW — validation des champs extraits */}
          {phase === "review" && extraction ? (
            <div>
              {/* Bannière confiance IA */}
              <div className={
                extraction.meta && extraction.meta.confidence === "high" ? "card-y" :
                (extraction.meta && extraction.meta.confidence === "low" ? "card-p" : "card")
              } style={{ marginBottom: 14, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 2 }}>
                  Type détecté : {DOC_TYPE_LABELS[docType] || docType}
                  {extraction.meta ? " · Confiance IA : " + (extraction.meta.confidence || "?") : ""}
                </div>
                {extraction.meta && extraction.meta.notes
                  ? <div style={{ fontSize: 10 }}>📝 {extraction.meta.notes}</div>
                  : null}
              </div>

              {/* Choix du type de doc (override) */}
              <div className="fg">
                <label className="lbl">Type de document (corrige si besoin)</label>
                <select className="inp sel" value={docType} onChange={function (e: any) { setDocType(e.target.value) }}>
                  <option value="contrat_initial">Contrat initial</option>
                  <option value="avenant">Avenant</option>
                  <option value="fiche_paie">Fiche de paie</option>
                  <option value="solde_tout_compte">Solde de tout compte</option>
                  <option value="certificat_travail">Certificat de travail</option>
                  <option value="attestation_france_travail">Attestation France Travail</option>
                  <option value="lettre_demission">Lettre de démission</option>
                  <option value="lettre_licenciement">Lettre de licenciement</option>
                  <option value="rupture_conv">Rupture conventionnelle</option>
                  <option value="dossier_bienvenue">Dossier de bienvenue</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              {/* Section EMPLOYÉ — uniquement si pas encore d'employé confirmé */}
              {(activeEmployee && (activeEmployee.prenom === "(à compléter)" || !activeEmployee.prenom)) || !activeEmployee ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="ct">Identité du salarié</div>
                  <div className="fg2">
                    <SelectField label="Civilité" value={employeeFields.civilite} options={CIVILITES.map(function (c) { return { value: c, label: c } })}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { civilite: v })) }} />
                    <TextField label="Nationalité" value={employeeFields.nationalite}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { nationalite: v })) }} />
                    <TextField label="Prénom *" value={employeeFields.prenom}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { prenom: v })) }} />
                    <TextField label="Nom *" value={employeeFields.nom}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { nom: v })) }} />
                    <TextField type="date" label="Date de naissance" value={employeeFields.date_naissance}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { date_naissance: v })) }} />
                    <TextField label="Lieu de naissance" value={employeeFields.lieu_naissance}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { lieu_naissance: v })) }} />
                    <TextField label="N° Sécurité sociale" value={employeeFields.num_secu}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { num_secu: v })) }} />
                    <TextField label="Téléphone" value={employeeFields.telephone}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { telephone: v })) }} />
                  </div>
                  <div className="fg">
                    <TextField label="Adresse" value={employeeFields.adresse}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { adresse: v })) }} />
                  </div>
                  <div className="fg2">
                    <TextField label="Code postal" value={employeeFields.code_postal}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { code_postal: v })) }} />
                    <TextField label="Ville" value={employeeFields.ville}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { ville: v })) }} />
                    <TextField label="Email" value={employeeFields.email}
                      onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { email: v })) }} />
                  </div>
                </div>
              ) : null}

              {/* Section CONTRAT — uniquement si type = contrat_initial ou avenant */}
              {docType === "contrat_initial" || docType === "avenant" ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="ct">{docType === "avenant" ? "Avenant — termes contractuels" : "Contrat — termes"}</div>
                  <div className="fg2">
                    <SelectField label="Type" value={contractFields.type} options={CONTRACT_TYPES}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { type: v })) }} />
                    <TextField label="Fonction *" value={contractFields.fonction}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { fonction: v })) }} />
                    <TextField type="date" label="Date début *" value={contractFields.date_debut}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { date_debut: v })) }} />
                    <TextField type="date" label="Date fin (CDD)" value={contractFields.date_fin}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { date_fin: v })) }} />
                    <TextField label="Salaire brut mensuel (€)" value={contractFields.salaire_brut_mensuel}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { salaire_brut_mensuel: v })) }} />
                    <TextField label="Taux horaire brut (€)" value={contractFields.taux_horaire_brut}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { taux_horaire_brut: v })) }} />
                    <TextField label="Heures hebdo" value={contractFields.heures_hebdo}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { heures_hebdo: v })) }} />
                    <TextField label="Heures mensuelles" value={contractFields.heures_mensuelles}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { heures_mensuelles: v })) }} />
                    <TextField label="Niveau CCN" value={contractFields.niveau_ccn}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { niveau_ccn: v })) }} />
                    <TextField label="Échelon CCN" value={contractFields.echelon_ccn}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { echelon_ccn: v })) }} />
                    <SelectField label="Statut" value={contractFields.statut_cadre} options={STATUTS_CADRE}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { statut_cadre: v })) }} />
                    <TextField label="Période d'essai (mois)" value={contractFields.periode_essai_mois}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { periode_essai_mois: v })) }} />
                    <TextField type="date" label="Date de signature" value={contractFields.date_signature}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { date_signature: v })) }} />
                    <TextField label="Ville signature" value={contractFields.ville_signature}
                      onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { ville_signature: v })) }} />
                  </div>
                </div>
              ) : null}

              {/* Section FICHE PAIE — period_month */}
              {docType === "fiche_paie" ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="ct">Fiche de paie</div>
                  <div className="fg">
                    <TextField label="Mois (YYYY-MM)" value={periodMonth} onChange={setPeriodMonth} />
                  </div>
                </div>
              ) : null}

              {/* Section SORTIE — solde / certif / lettres */}
              {docType === "solde_tout_compte" || docType === "certificat_travail"
                || docType === "lettre_demission" || docType === "lettre_licenciement"
                || docType === "rupture_conv" ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="ct">Sortie du salarié</div>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 8 }}>
                    Ces infos clôtureront automatiquement le cycle d'emploi.
                  </div>
                  <div className="fg2">
                    <TextField type="date" label="Date de sortie" value={exitDate} onChange={setExitDate} />
                    <SelectField label="Motif" value={exitMotif || "demission"} options={MOTIFS_SORTIE}
                      onChange={setExitMotif} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* PHASE MANUAL — créer juste l'employé sans aucun doc */}
          {phase === "manual" ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14 }}>
                <div className="yt" style={{ fontSize: 16, marginBottom: 4 }}>Créer un salarié sans aucun document</div>
                <div style={{ fontSize: 11 }}>
                  Pour les vieux salariés dont tu n'as plus aucun papier. Ils existeront en base et tu pourras leur faire signer un avenant de mise en conformité plus tard.
                </div>
              </div>
              <div className="card">
                <div className="ct">Identité du salarié</div>
                <div className="fg2">
                  <SelectField label="Civilité" value={employeeFields.civilite} options={CIVILITES.map(function (c) { return { value: c, label: c } })}
                    onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { civilite: v })) }} />
                  <TextField label="Nationalité" value={employeeFields.nationalite}
                    onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { nationalite: v })) }} />
                  <TextField label="Prénom *" value={employeeFields.prenom}
                    onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { prenom: v })) }} />
                  <TextField label="Nom *" value={employeeFields.nom}
                    onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { nom: v })) }} />
                  <TextField type="date" label="Date de naissance" value={employeeFields.date_naissance}
                    onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { date_naissance: v })) }} />
                  <TextField label="N° Sécurité sociale" value={employeeFields.num_secu}
                    onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { num_secu: v })) }} />
                  <TextField type="date" label="Date d'embauche réelle *" value={contractFields.date_debut}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { date_debut: v })) }} />
                  <TextField label="Téléphone" value={employeeFields.telephone}
                    onChange={function (v: any) { setEmployeeFields(Object.assign({}, employeeFields, { telephone: v })) }} />
                </div>
              </div>
            </div>
          ) : null}

          {/* PHASE SAVED — boucle ou terminer */}
          {phase === "saved" ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14, textAlign: "center", padding: 22 }}>
                <div style={{ fontSize: 38 }}>✅</div>
                <div className="yt" style={{ fontSize: 26, marginTop: 4 }}>Enregistré !</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {employeeName} · {sessionDocs.length} doc{sessionDocs.length > 1 ? "s" : ""} dans cette session
                </div>
              </div>

              {sessionDocs.length > 0 ? (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="ct">Documents enregistrés</div>
                  {sessionDocs.map(function (d: any, i: number) {
                    return (
                      <div key={i} style={{ fontSize: 11, padding: "4px 0", borderBottom: i === sessionDocs.length - 1 ? "none" : "1px solid #EBEBEB" }}>
                        <span className="badge" style={{ marginRight: 6, background: "#FFEB5A" }}>
                          {DOC_TYPE_LABELS[d.doc_type] || d.doc_type}
                        </span>
                        {d.label}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="mf">
          {phase === "drop" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={handleCloseRequest}>Annuler</button>
              <button className="btn btn-p" onClick={handleAnalyze} disabled={files.length === 0}>
                🤖 Analyser via IA
              </button>
            </div>
          ) : null}
          {phase === "review" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={async function () {
                await cleanupPendingDraft()
                setExtraction(null)
                setPhase("drop")
              }}>← Retour</button>
              <button className="btn btn-p" onClick={handleSave} disabled={saving}>
                {saving ? "Sauvegarde..." : "💾 Enregistrer"}
              </button>
            </div>
          ) : null}
          {phase === "manual" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={function () { setPhase("drop") }}>← Retour</button>
              <button className="btn btn-p" onClick={handleCreateEmptyEmployee} disabled={saving}>
                {saving ? "Création..." : "Créer la fiche salarié"}
              </button>
            </div>
          ) : null}
          {phase === "saved" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
              <button className="btn" onClick={handleFinish}>Terminer</button>
              <button className="btn btn-y" onClick={handleAddAnotherDoc}>＋ Doc suivant pour {employeeName.split(" ")[0]}</button>
            </div>
          ) : null}
        </div>
      </div>

      {toast ? <div className="toast show">{toast}</div> : null}
    </div>
  )
}

// ============================================================
// SOUS-COMPOSANTS DE FORMULAIRE (top-level pour SWC safety)
// ============================================================
function TextField(props: any) {
  return (
    <div className="fg">
      <label className="lbl">{props.label}</label>
      <input
        className="inp"
        type={props.type || "text"}
        value={props.value || ""}
        onChange={function (e: any) { props.onChange(e.target.value) }}
      />
    </div>
  )
}

function SelectField(props: any) {
  return (
    <div className="fg">
      <label className="lbl">{props.label}</label>
      <select
        className="inp sel"
        value={props.value || ""}
        onChange={function (e: any) { props.onChange(e.target.value) }}
      >
        {(props.options || []).map(function (opt: any) {
          return <option key={opt.value} value={opt.value}>{opt.label}</option>
        })}
      </select>
    </div>
  )
}
