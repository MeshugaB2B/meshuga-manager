// src/app/dashboard/rh/RegularizationWizard.tsx
// Modal pour régulariser un salarié dont on n'a aucun contrat formalisé.
// Workflow :
//   Phase 1 (drop) : Edward upload 1+ fiches de paie (idéalement la +
//     ancienne et la + récente)
//   Phase 2 (analyzing) : IA extrait identité + conditions contractuelles +
//     date d'embauche reconstituée
//   Phase 3 (review) : Edward voit/édite les infos consolidées
//   Phase 4 (preview) : génère le HTML du contrat de régularisation, ouvre
//     dans un nouvel onglet pour impression
//   Phase 5 (saved) : Edward fait signer, puis upload du contrat signé via
//     le wizard standard (qui désactivera auto le flag needs_regularization)
//
// SWC-safe : var, function, pas de generics, pas de fragments.

"use client"
import { useState, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import { compressFileList, totalSizeMb } from "@/lib/imageCompress"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

var MAX_FILE_MB = 20

function errMsg(e: any): string {
  if (!e) return "Erreur inconnue"
  if (typeof e === "string") return e
  if (e.message) return e.message
  if (e.error) return typeof e.error === "string" ? e.error : JSON.stringify(e.error)
  try { var s = JSON.stringify(e); if (s && s !== "{}") return s } catch (_) {}
  return "Erreur inconnue"
}

async function parseApiResponse(res: any): Promise<any> {
  var ct = (res.headers.get("content-type") || "").toLowerCase()
  var isHtml = ct.indexOf("text/html") === 0
  var isJson = ct.indexOf("application/json") === 0
  if (res.status === 413) return { ok: false, status: 413, errorText: "Documents trop volumineux (limite 4.5 MB Vercel)" }
  if (res.status === 504) return { ok: false, status: 504, errorText: "Timeout : réessaie ou réduis le nombre de pages." }
  if (isHtml && !res.ok) {
    var txt = ""
    try { txt = await res.text() } catch (_) {}
    var hint = ""
    if (txt.indexOf("FUNCTION_PAYLOAD_TOO_LARGE") >= 0) hint = " (documents trop volumineux)"
    else if (txt.indexOf("FUNCTION_INVOCATION_TIMEOUT") >= 0) hint = " (timeout — réessaie)"
    return { ok: false, status: res.status, errorText: "Erreur serveur " + res.status + hint }
  }
  if (isJson) {
    try {
      var data = await res.json()
      return { ok: res.ok, status: res.status, data: data, errorText: data?.error || null }
    } catch (e: any) {
      return { ok: false, status: res.status, errorText: "Réponse invalide du serveur" }
    }
  }
  try {
    var rawText = await res.text()
    try {
      var parsedData = JSON.parse(rawText)
      return { ok: res.ok, status: res.status, data: parsedData, errorText: parsedData?.error || null }
    } catch (_) {
      return { ok: res.ok, status: res.status, errorText: rawText.slice(0, 200) || "Réponse vide" }
    }
  } catch (e: any) {
    return { ok: false, status: res.status, errorText: errMsg(e) }
  }
}

function makeFileEntry(file: any) {
  var sizeMb = file.size / (1024 * 1024)
  var mime = (file.type || "").toLowerCase()
  var preview: any = null
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

function fmtFr(iso: string): string {
  if (!iso) return ""
  var p = iso.split("-")
  if (p.length !== 3) return iso
  return p[2] + "/" + p[1] + "/" + p[0]
}

// Normalise une date en ISO yyyy-mm-dd. Gère :
//  - "1952-05-19" déjà valide → garde
//  - "1952-19-05" inversé (mois > 12) → corrige en "1952-05-19"
//  - "19/05/1952" format FR → "1952-05-19"
//  - "2022-10-16" valide → garde
//  - vide / invalide → ""
function normalizeDateIso(v: any): string {
  if (!v) return ""
  var s = String(v).trim()
  if (!s) return ""

  // Format ISO yyyy-mm-dd ou yyyy-dd-mm
  var isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    var year = parseInt(isoMatch[1], 10)
    var p2 = parseInt(isoMatch[2], 10)
    var p3 = parseInt(isoMatch[3], 10)
    var month: number
    var day: number
    if (p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
      // yyyy-MM-dd valide
      month = p2; day = p3
    } else if (p2 > 12 && p2 <= 31 && p3 >= 1 && p3 <= 12) {
      // yyyy-dd-MM (inversé) → corrige
      month = p3; day = p2
    } else {
      return ""
    }
    return year + "-" + String(month).padStart(2, "0") + "-" + String(day).padStart(2, "0")
  }

  // Format FR dd/mm/yyyy ou dd-mm-yyyy ou dd.mm.yyyy
  var frMatch = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/)
  if (frMatch) {
    var d = parseInt(frMatch[1], 10)
    var m = parseInt(frMatch[2], 10)
    var y = parseInt(frMatch[3], 10)
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0")
    }
  }

  return ""
}

export default function RegularizationWizard(props: any) {
  // props : { employee, onClose, onSaved }
  var emp = props.employee
  var onClose = props.onClose || function () {}
  var onSaved = props.onSaved || function () {}

  // Si initialMode est passé en prop ("contrat" ou "fiches"), on skip la
  // phase "choose" et on démarre directement à la phase "drop" dans le mode
  // demandé. Utilisé depuis EmployeeDetail pour le bouton "📄 Contrat originel".
  var initialModeProp = (props.initialMode === "contrat" || props.initialMode === "fiches")
    ? props.initialMode : ""
  var initialPhase = initialModeProp ? "drop" : "choose"

  var [phase, setPhase] = useState(initialPhase)  // choose | drop | analyzing | review | done
  var [mode, setMode] = useState(initialModeProp)  // "" | "fiches" | "contrat"
  var [contractSaved, setContractSaved] = useState(false)
  var [error, setError] = useState("")
  var [progress, setProgress] = useState("")
  var [saving, setSaving] = useState(false)

  // Upload
  var [files, setFiles] = useState([] as any[])
  var [dragOver, setDragOver] = useState(false)
  var fileInputRef = useRef<any>(null)

  // Résultats consolidés (modifiables par Edward)
  var [dateEmbauche, setDateEmbauche] = useState("")
  var [employeeFields, setEmployeeFields] = useState({
    civilite: emp.civilite || "Monsieur",
    prenom: emp.prenom || "",
    nom: emp.nom || "",
    date_naissance: emp.date_naissance || "",
    lieu_naissance: emp.lieu_naissance || "",
    nationalite: emp.nationalite || "française",
    adresse: emp.adresse || "",
    code_postal: emp.code_postal || "",
    ville: emp.ville || "",
    num_secu: emp.num_secu || "",
  } as any)
  var [contractFields, setContractFields] = useState({
    type: "cdi_cuisinier",
    fonction: "",
    statut_cadre: "non-cadre",
    niveau_ccn: "",
    echelon_ccn: "",
    coefficient_ccn: "",
    classification: "",
    salaire_brut_mensuel: "",
    heures_mensuelles: 151.67,
    heures_hebdo: 35,
  } as any)
  var [aiNotes, setAiNotes] = useState([] as string[])
  var [dateExtractedExplicitly, setDateExtractedExplicitly] = useState(false)

  // Déduire le type de contrat (cdi_cuisinier | cdi_caissier | cdi_cadre)
  // depuis la fonction et le statut cadre du salarié.
  function deduceContractType(fonction: any, statutCadre: any): string {
    if (statutCadre === "cadre") return "cdi_cadre"
    var f = String(fonction || "").toLowerCase()
    // Cuisine et préparation
    if (f.indexOf("cuisin") >= 0 || f.indexOf("commis") >= 0
        || f.indexOf("prépara") >= 0 || f.indexOf("prepara") >= 0
        || f.indexOf("plonge") >= 0 || f.indexOf("aide de cuisine") >= 0) {
      return "cdi_cuisinier"
    }
    // Vente, caisse, salle
    if (f.indexOf("caiss") >= 0 || f.indexOf("vend") >= 0
        || f.indexOf("serveur") >= 0 || f.indexOf("serveuse") >= 0
        || f.indexOf("barista") >= 0 || f.indexOf("salle") >= 0
        || f.indexOf("comptoir") >= 0) {
      return "cdi_caissier"
    }
    // Encadrement (mais sans cadre stricto sensu = agent_maitrise)
    if (f.indexOf("manager") >= 0 || f.indexOf("responsable") >= 0
        || f.indexOf("chef") >= 0 || f.indexOf("directeur") >= 0) {
      return statutCadre === "agent_maitrise" ? "cdi_caissier" : "cdi_cadre"
    }
    // Fallback : cuisinier (le plus courant chez Meshuga)
    return "cdi_cuisinier"
  }

  function handleCloseRequest() {
    if (saving) return
    if (files.length > 0 || dateEmbauche || phase !== "drop") {
      if (!window.confirm("Fermer sans enregistrer ?")) return
    }
    onClose()
  }

  function addFiles(fileList: any) {
    var newFiles = []
    var rejected = []
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i]
      if (!f) continue
      var mime = (f.type || "").toLowerCase()
      var isImage = mime.indexOf("image/") === 0
      var isPdf = mime === "application/pdf"
      if (!isImage && !isPdf) { rejected.push(f.name + " (ni image ni PDF)"); continue }
      var sizeMb = f.size / (1024 * 1024)
      if (sizeMb > MAX_FILE_MB) { rejected.push(f.name + " (trop lourd)"); continue }
      newFiles.push(makeFileEntry(f))
    }
    if (rejected.length > 0) window.alert("Fichiers ignorés :\n" + rejected.join("\n"))
    setFiles(files.concat(newFiles).slice(0, 20))
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

  function removeFile(idx: number) {
    var f = files[idx]
    if (f && f.preview) { try { URL.revokeObjectURL(f.preview) } catch (e) {} }
    var copy = files.slice()
    copy.splice(idx, 1)
    setFiles(copy)
  }

  // ========================================================================
  // ANALYSE — extract-payslips
  // ========================================================================
  async function handleAnalyze() {
    setError("")
    if (files.length === 0) {
      setError(mode === "contrat" ? "Drop le contrat originel" : "Drop au moins une fiche de paie")
      return
    }
    setPhase("analyzing")
    try {
      setProgress("Optimisation des images...")
      var rawFiles = files.map(function (f: any) { return f.file })
      var compressedFiles = await compressFileList(rawFiles, function (cur: number, total: number, level: string) {
        var levelLabel = level === "L1" ? "" : (level === "L2" ? " (qualité réduite)" : " (qualité minimale)")
        setProgress("Optimisation" + levelLabel + " (" + (cur + 1) + "/" + total + ")...")
      })
      var sizeMb = totalSizeMb(compressedFiles)
      setProgress("Analyse IA — peut prendre 30s à 2min...")

      var consolidated: any
      var notes: string[] = []

      if (mode === "contrat") {
        // ====== Mode contrat originel : appel /api/hr/extract-contract-direct ======
        // Cette route accepte FormData (multipart) — différente de /extract-contract
        // qui attend { contract_doc_id } JSON.
        var fd = new FormData()
        fd.append("employee_id", emp.id)
        for (var i = 0; i < compressedFiles.length; i++) {
          fd.append("file_" + String(i + 1).padStart(3, "0"), compressedFiles[i])
        }
        var res = await fetch("/api/hr/extract-contract-direct", { method: "POST", body: fd })
        var p = await parseApiResponse(res)
        if (!p.ok) throw new Error(p.errorText)
        var data = p.data
        // extract-contract-direct renvoie { extraction, storage_path, mime_type, file_size, ... }
        var extraction = data.extraction || {}
        // Normaliser au format attendu (consolidated.employee, consolidated.contract, etc.)
        consolidated = {
          date_embauche: extraction.contract?.date_debut || extraction.contract?.date_embauche || null,
          date_embauche_extracted_explicitly: !!(extraction.contract?.date_debut || extraction.contract?.date_embauche),
          employee: extraction.employee || {},
          contract: extraction.contract || {},
          notes: ["Contrat originel analysé"],
        }
        notes = ["Contrat originel analysé"]
        // Mémoriser le storage path du contrat originel pour pouvoir le rattacher après
        ;(window as any).__regul_originalContractPath = data.storage_path
        ;(window as any).__regul_originalContractMime = data.mime_type
        ;(window as any).__regul_originalContractSize = data.file_size
      } else {
        // ====== Mode fiches de paie : appel /api/hr/extract-payslips ======
        var fd2 = new FormData()
        fd2.append("employee_id", emp.id)
        for (var j = 0; j < compressedFiles.length; j++) {
          fd2.append("file_" + String(j).padStart(3, "0"), compressedFiles[j])
        }
        var res2 = await fetch("/api/hr/extract-payslips", { method: "POST", body: fd2 })
        var p2 = await parseApiResponse(res2)
        if (!p2.ok) throw new Error(p2.errorText)
        consolidated = p2.data.consolidated
        notes = consolidated.notes || []
      }

      // Pré-remplir — TOUTES les dates passent par normalizeDateIso
      if (consolidated.date_embauche) {
        var normalizedEmbauche = normalizeDateIso(consolidated.date_embauche)
        setDateEmbauche(normalizedEmbauche || consolidated.date_embauche)
      }
      setDateExtractedExplicitly(!!consolidated.date_embauche_extracted_explicitly)
      var newEmpFields: any = Object.assign({}, employeeFields)
      var keys = ["civilite", "prenom", "nom", "date_naissance", "lieu_naissance",
        "nationalite", "adresse", "code_postal", "ville", "num_secu"]
      keys.forEach(function (k: any) {
        var v = consolidated.employee?.[k]
        if (v && !newEmpFields[k]) {
          if (k === "date_naissance") {
            var normalized = normalizeDateIso(v)
            if (normalized) newEmpFields[k] = normalized
          } else {
            newEmpFields[k] = v
          }
        }
      })
      setEmployeeFields(newEmpFields)

      var newContractFields: any = Object.assign({}, contractFields)
      var ckeys = ["fonction", "statut_cadre", "niveau_ccn", "echelon_ccn", "coefficient_ccn",
        "classification", "salaire_brut_mensuel", "heures_mensuelles", "heures_hebdo"]
      ckeys.forEach(function (k: any) {
        var v = consolidated.contract?.[k]
        if (v !== null && v !== undefined && v !== "") newContractFields[k] = v
      })
      // Déduire le type si pas déjà fourni par extract-contract
      if (consolidated.contract?.type) {
        newContractFields.type = consolidated.contract.type
      } else {
        newContractFields.type = deduceContractType(newContractFields.fonction, newContractFields.statut_cadre)
      }
      setContractFields(newContractFields)
      setAiNotes(notes)

      setPhase("review")
    } catch (e: any) {
      setError("Analyse : " + errMsg(e))
      setPhase("drop")
    } finally {
      setProgress("")
    }
  }

  // ========================================================================
  // GÉNÉRATION du contrat de régularisation (HTML imprimable)
  // ========================================================================
  async function handleGenerateContract() {
    setError("")
    if (!dateEmbauche) { setError("Date d'embauche obligatoire"); return }
    if (!employeeFields.prenom || !employeeFields.nom) { setError("Prénom et nom obligatoires"); return }
    if (!contractFields.fonction) { setError("Fonction obligatoire"); return }
    if (!contractFields.salaire_brut_mensuel) { setError("Salaire brut obligatoire"); return }

    setSaving(true)
    try {
      // Normaliser TOUTES les dates avant l'envoi (sécurité finale)
      var dateEmbaucheClean = normalizeDateIso(dateEmbauche)
      if (!dateEmbaucheClean) {
        throw new Error("Date d'embauche invalide : " + dateEmbauche + " — corrige-la dans le formulaire (format yyyy-mm-dd)")
      }

      // 1) Mettre à jour la fiche employé en base avec les infos validées
      var updateEmp: any = {}
      Object.keys(employeeFields).forEach(function (k: any) {
        if (employeeFields[k]) {
          if (k === "date_naissance") {
            var normalized = normalizeDateIso(employeeFields[k])
            if (normalized) updateEmp[k] = normalized
          } else {
            updateEmp[k] = employeeFields[k]
          }
        }
      })
      var resUpd = await supabase.from("hr_employees").update(updateEmp).eq("id", emp.id).select("*").single()
      if (resUpd.error) throw new Error("MAJ employé : " + resUpd.error.message)

      // 2) Mettre à jour la date_entree du cycle ouvert
      var openCycleId = null
      var resCyc = await fetch("/api/hr/cycles?employee_id=" + emp.id)
      var pCyc = await parseApiResponse(resCyc)
      if (pCyc.ok) {
        var openCycle = (pCyc.data.cycles || []).find(function (c: any) { return !c.date_sortie })
        if (openCycle) {
          openCycleId = openCycle.id
          await supabase.from("hr_employment_cycles").update({ date_entree: dateEmbaucheClean }).eq("id", openCycle.id)
        }
      }

      // 2bis) Mettre à jour le contrat existant avec le bon type + infos extraites.
      var savedContractId: any = null
      if (openCycleId) {
        var resContracts = await supabase
          .from("hr_contracts")
          .select("*")
          .eq("cycle_id", openCycleId)
          .order("created_at", { ascending: false })
        var existingContracts = (resContracts.data || [])
        var ctrToUpdate: any = existingContracts.find(function (c: any) { return c.is_current })
          || existingContracts[0]
        var labelPrefix = mode === "contrat"
          ? "Contrat originel + avenant — "
          : "Contrat de régularisation — "
        if (ctrToUpdate) {
          var ctrUpdate: any = {
            type: contractFields.type || "cdi_cuisinier",
            fonction: contractFields.fonction,
            statut_cadre: contractFields.statut_cadre,
            niveau_ccn: contractFields.niveau_ccn || null,
            echelon_ccn: contractFields.echelon_ccn || null,
            coefficient_ccn: contractFields.coefficient_ccn || null,
            classification: contractFields.classification || null,
            heures_hebdo: parseFloat(String(contractFields.heures_hebdo || 35)),
            heures_mensuelles: parseFloat(String(contractFields.heures_mensuelles || 151.67)),
            date_debut: dateEmbaucheClean,
            status: "archived",
            is_current: true,
            contract_label: labelPrefix + (contractFields.fonction || "CDI"),
          }
          var sb = parseFloat(String(contractFields.salaire_brut_mensuel || "").replace(",", "."))
          if (!isNaN(sb)) ctrUpdate.salaire_brut_mensuel = sb
          await supabase.from("hr_contracts").update(ctrUpdate).eq("id", ctrToUpdate.id)
          savedContractId = ctrToUpdate.id
        } else {
          // Pas de contrat → en créer un nouveau attaché au cycle
          var insertCtr: any = {
            cycle_id: openCycleId,
            type: contractFields.type || "cdi_cuisinier",
            fonction: contractFields.fonction,
            statut_cadre: contractFields.statut_cadre,
            niveau_ccn: contractFields.niveau_ccn || null,
            echelon_ccn: contractFields.echelon_ccn || null,
            classification: contractFields.classification || null,
            heures_hebdo: parseFloat(String(contractFields.heures_hebdo || 35)),
            heures_mensuelles: parseFloat(String(contractFields.heures_mensuelles || 151.67)),
            date_debut: dateEmbaucheClean,
            status: "archived",
            is_current: true,
            contract_label: labelPrefix + (contractFields.fonction || "CDI"),
          }
          var sb2 = parseFloat(String(contractFields.salaire_brut_mensuel || "").replace(",", "."))
          if (!isNaN(sb2)) insertCtr.salaire_brut_mensuel = sb2
          var resInsCtr = await supabase.from("hr_contracts").insert(insertCtr).select("id").single()
          if (resInsCtr.error) throw new Error("Création contrat : " + resInsCtr.error.message)
          savedContractId = resInsCtr.data.id
        }
      }

      // 3) MODE CONTRAT : rattacher le PDF originel au contrat comme contrat_signe
      if (mode === "contrat" && savedContractId) {
        var origPath = (window as any).__regul_originalContractPath
        var origMime = (window as any).__regul_originalContractMime || "application/pdf"
        var origSize = (window as any).__regul_originalContractSize || 0
        if (origPath) {
          var fullName = (employeeFields.prenom || "") + " " + ((employeeFields.nom || "").toUpperCase())
          // Insérer un row contrat_signe attaché au contrat (validated_by_user=true
          // pour que le trigger SQL désactive le flag automatiquement)
          var resInsDoc = await supabase
            .from("hr_contract_documents")
            .insert({
              contract_id: savedContractId,
              doc_type: "contrat_signe",
              file_path: origPath,
              mime_type: origMime,
              size_bytes: origSize,
              label: "Contrat originel — " + fullName.trim(),
              validated_by_user: true,
              uploaded_at: new Date().toISOString(),
            })
            .select("id")
            .single()
          if (resInsDoc.error) {
            // Bloquant : on alerte Edward pour qu'il sache que le contrat originel
            // n'a pas été rattaché. Sinon il avancerait sans s'en apercevoir.
            throw new Error("Rattachement contrat originel impossible : " + resInsDoc.error.message)
          }
        }
      }

      // 4) Générer le HTML : avenant en mode "contrat", contrat de régul en mode "fiches"
      var employeePayload = Object.assign({}, employeeFields)
      if (employeePayload.date_naissance) {
        var dn = normalizeDateIso(employeePayload.date_naissance)
        employeePayload.date_naissance = dn || null
      }

      var resGen: Response
      var endpoint: string
      if (mode === "contrat") {
        // En mode contrat originel : générer un avenant qui ajoute les 8 clauses modernes
        endpoint = "/api/hr/update-amendment"
        var payloadAv: any = {
          employee_id: emp.id,
          contract_id: savedContractId,
          contract_label: "contrat de travail (" + (contractFields.fonction || "CDI") + ") du " + dateEmbaucheClean,
          clauses: [
            "confidentialite", "haccp", "tenue_hygiene", "rgpd",
            "mobilite", "deconnexion", "regimes_actualises", "documents_annexes",
          ],
          date_effet: new Date().toISOString().slice(0, 10),
          ville_signature: "Paris",
          date_signature: new Date().toISOString().slice(0, 10),
          save: true,  // sauvegarde l'avenant comme document attaché
        }
        resGen = await fetch(endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadAv),
        })
      } else {
        // Mode fiches de paie : contrat de régularisation complet
        endpoint = "/api/hr/regularization-contract"
        var payload: any = {
          employee_id: emp.id,
          date_embauche: dateEmbaucheClean,
          employee: employeePayload,
          contract: contractFields,
          save: true,
        }
        if (savedContractId) payload.contract_id = savedContractId
        resGen = await fetch(endpoint, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }

      if (!resGen.ok) {
        var pGen = await parseApiResponse(resGen)
        throw new Error("Génération document : " + (pGen.errorText || "erreur"))
      }

      var wasSaved = resGen.headers.get("X-Saved") === "true"

      var html = await resGen.text()
      var newWin = window.open("", "_blank")
      if (newWin) {
        newWin.document.open()
        newWin.document.write(html)
        newWin.document.close()
      } else {
        var blob = new Blob([html], { type: "text/html" })
        var url = URL.createObjectURL(blob)
        window.open(url, "_blank")
      }

      setContractSaved(wasSaved)
      setPhase("done")
    } catch (e: any) {
      setError(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  // ========================================================================
  // RENDER
  // ========================================================================
  return (
    <div className="overlay" onClick={function (e: any) { if (e.target === e.currentTarget) handleCloseRequest() }}>
      <div className="modal modal-xl">
        {/* HEADER */}
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mt">{initialModeProp === "contrat" ? "📄 Contrat originel + avenant" : "📝 Régulariser le contrat"}</div>
            <button className="btn btn-sm" onClick={handleCloseRequest} style={{ background: "#FFFFFF" }}>×</button>
          </div>
          <div className="yt" style={{ fontSize: 14, marginTop: 4, color: "#191923" }}>
            {emp.prenom} {(emp.nom || "").toUpperCase()}
          </div>
        </div>

        {/* BODY */}
        <div className="mb">
          {error ? (
            <div className="card-p" style={{ marginBottom: 12, padding: 10, fontSize: 12, fontWeight: 900 }}>
              ⚠ {error}
            </div>
          ) : null}

          {/* PHASE CHOOSE — choix du mode */}
          {phase === "choose" ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14 }}>
                <div className="yt" style={{ fontSize: 18, marginBottom: 4 }}>Comment veux-tu régulariser ce salarié ?</div>
                <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                  Deux situations possibles. Choisis celle qui correspond à ce que tu as sous la main.
                </div>
              </div>

              <div
                onClick={function () { setMode("contrat"); setPhase("drop") }}
                style={{
                  background: "#FFFFFF",
                  border: "2.5px solid #FF82D7",
                  boxShadow: "4px 4px 0 #FF82D7",
                  padding: 16,
                  marginBottom: 14,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={function (ev: any) { ev.currentTarget.style.background = "#FFF5FB" }}
                onMouseLeave={function (ev: any) { ev.currentTarget.style.background = "#FFFFFF" }}
              >
                <div className="yt" style={{ fontSize: 22, color: "#FF82D7", lineHeight: 1, marginBottom: 6 }}>
                  📄 J'ai retrouvé le contrat originel
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Tu as récupéré le contrat de travail signé d'origine (PDF ou photo). L'IA va lire toutes les
                  infos (fonction, salaire, date d'embauche, classification…), <strong>sauvegarder le contrat originel</strong>
                  dans la fiche, puis <strong>générer un avenant</strong> qui ajoute les 8 clauses modernes (HACCP, RGPD, etc.).
                  <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7, fontStyle: "italic" }}>
                    Recommandé : continuité juridique préservée, plus simple à signer (1 page).
                  </div>
                </div>
              </div>

              <div
                onClick={function () { setMode("fiches"); setPhase("drop") }}
                style={{
                  background: "#FFFFFF",
                  border: "2px solid #191923",
                  boxShadow: "3px 3px 0 #191923",
                  padding: 16,
                  marginBottom: 6,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={function (ev: any) { ev.currentTarget.style.background = "#FFFEF5" }}
                onMouseLeave={function (ev: any) { ev.currentTarget.style.background = "#FFFFFF" }}
              >
                <div className="yt" style={{ fontSize: 22, color: "#191923", lineHeight: 1, marginBottom: 6 }}>
                  💰 Je n'ai pas le contrat originel
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Tu as seulement les <strong>fiches de paie</strong> du salarié. L'IA va lire la plus ancienne et la plus
                  récente pour reconstituer la date d'embauche et les conditions, puis générer un
                  <strong> contrat de régularisation CDI complet</strong> qui formalise la relation existante.
                  <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7, fontStyle: "italic" }}>
                    À utiliser quand le contrat originel a été perdu ou n'a jamais été formalisé.
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* PHASE DROP */}
          {phase === "drop" ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14 }}>
                {mode === "contrat" ? (
                  <div>
                    <div className="yt" style={{ fontSize: 18, marginBottom: 4 }}>Contrat originel à analyser</div>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                      Drop <strong>le contrat originel</strong> du salarié (toutes les pages, dans l'ordre).
                      L'IA va extraire toutes les conditions contractuelles.
                      <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
                        PDF multi-pages OU plusieurs photos (1 photo = 1 page). Inclus la page des signatures pour confirmer.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="yt" style={{ fontSize: 18, marginBottom: 4 }}>Fiches de paie disponibles</div>
                    <div style={{ fontSize: 11, lineHeight: 1.5 }}>
                      Drop <strong>1 ou plusieurs fiches de paie</strong> du salarié. Idéalement :
                      <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                        <li>La <strong>plus ancienne</strong> disponible (pour récupérer la date d'embauche)</li>
                        <li>La <strong>plus récente</strong> (pour le salaire et les conditions actuelles)</li>
                      </ul>
                      <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>
                        1 fichier = 1 fiche de paie (PDF mono ou photo). Plusieurs fiches améliorent la fiabilité.
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
                <div style={{ fontSize: 30, marginBottom: 4 }}>📋💰</div>
                <div className="yt" style={{ fontSize: 16, marginBottom: 4 }}>
                  {files.length === 0 ? "Drop tes fiches de paie" : "Ajouter d'autres fiches"}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  PDF ou JPEG/PNG/HEIC/WEBP — max {MAX_FILE_MB} MB par fichier
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

              {files.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  {files.map(function (f: any, idx: number) {
                    return (
                      <div key={f.id} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: 6,
                        background: "#FFFFFF", border: "1.5px solid #191923", borderRadius: 5,
                        marginBottom: 5,
                      }}>
                        <div style={{
                          width: 24, height: 24, background: "#FF82D7", color: "#191923",
                          borderRadius: 3, fontSize: 11, fontWeight: 900,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "1.5px solid #191923",
                        }}>{idx + 1}</div>
                        <div style={{
                          width: 36, height: 36, background: "#EBEBEB", borderRadius: 4,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          overflow: "hidden", flexShrink: 0,
                        }}>
                          {f.preview
                            ? <img src={f.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ fontSize: 16 }}>{f.isPdf ? "📄" : "🖼️"}</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 11 }}>
                          <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {f.file.name || "doc-" + (idx + 1)}
                          </div>
                          <div style={{ opacity: 0.6, fontSize: 9 }}>{f.sizeMb.toFixed(1)} MB</div>
                        </div>
                        <button className="btn btn-sm btn-red" onClick={function () { removeFile(idx) }}>×</button>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* PHASE ANALYZING */}
          {phase === "analyzing" ? (
            <div style={{ padding: 30, textAlign: "center" }}>
              <div className="yt" style={{ fontSize: 28, color: "#FF82D7", marginBottom: 8 }}>
                🤖 Analyse en cours
              </div>
              <div style={{ fontSize: 12, marginBottom: 14 }}>{progress}</div>
              <div className="prog-wrap"><div className="prog-fill" style={{ width: "70%" }}></div></div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 10 }}>
                Claude lit chaque fiche de paie pour reconstituer les conditions contractuelles
                et trouver la date d'embauche.
              </div>
            </div>
          ) : null}

          {/* PHASE REVIEW */}
          {phase === "review" ? (
            <div>
              {/* Banner notes IA */}
              <div className="card-y" style={{ marginBottom: 14 }}>
                <div className="yt" style={{ fontSize: 16, marginBottom: 4 }}>📝 Récap IA</div>
                {aiNotes.map(function (n: string, i: number) {
                  return <div key={i} style={{ fontSize: 11, marginBottom: 2 }}>• {n}</div>
                })}
              </div>

              {/* Date d'embauche — important */}
              <div className={dateExtractedExplicitly ? "card-y" : "card-p"} style={{ marginBottom: 14, padding: 10 }}>
                <div className="ct" style={{ marginBottom: 4 }}>
                  📅 Date d'embauche reconstituée {dateExtractedExplicitly ? "✓" : "⚠"}
                </div>
                <div style={{ fontSize: 11, marginBottom: 8 }}>
                  {dateExtractedExplicitly
                    ? "Trouvée explicitement sur les fiches (champ \"Date d'entrée\" ou \"Ancienneté depuis\")."
                    : "⚠ Pas trouvée explicitement. Estimée depuis le 1er du mois de la fiche la plus ancienne. Vérifie / corrige."}
                </div>
                <input
                  className="inp"
                  type="date"
                  value={dateEmbauche}
                  onChange={function (e: any) { setDateEmbauche(e.target.value) }}
                  style={{ maxWidth: 240 }}
                />
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                  Pour vérifier : récupère la DPAE sur Net-Entreprises (déclaration préalable à l'embauche).
                </div>
              </div>

              {/* Identité salarié */}
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ct">Identité du salarié</div>
                <div className="fg2">
                  <SelectField label="Civilité" value={employeeFields.civilite}
                    options={[{value:"Madame",label:"Madame"},{value:"Monsieur",label:"Monsieur"},{value:"Mademoiselle",label:"Mademoiselle"}]}
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
                </div>
              </div>

              {/* Conditions contractuelles */}
              <div className="card">
                <div className="ct">Conditions contractuelles (depuis la fiche la plus récente)</div>
                <div className="fg2">
                  <SelectField label="Type de contrat *" value={contractFields.type}
                    options={[
                      {value:"cdi_cuisinier",label:"CDI Cuisinier"},
                      {value:"cdi_caissier",label:"CDI Caissier / Vendeur"},
                      {value:"cdi_cadre",label:"CDI Cadre"},
                    ]}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { type: v })) }} />
                  <TextField label="Fonction *" value={contractFields.fonction}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { fonction: v })) }} />
                  <SelectField label="Statut" value={contractFields.statut_cadre}
                    options={[{value:"non-cadre",label:"Non-cadre"},{value:"agent_maitrise",label:"Agent de maîtrise"},{value:"cadre",label:"Cadre"}]}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { statut_cadre: v })) }} />
                  <TextField label="Salaire brut mensuel (€) *" value={contractFields.salaire_brut_mensuel}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { salaire_brut_mensuel: v })) }} />
                  <TextField label="Heures hebdo" value={contractFields.heures_hebdo}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { heures_hebdo: v })) }} />
                  <TextField label="Heures mensuelles" value={contractFields.heures_mensuelles}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { heures_mensuelles: v })) }} />
                  <TextField label="Niveau CCN" value={contractFields.niveau_ccn}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { niveau_ccn: v })) }} />
                  <TextField label="Échelon CCN" value={contractFields.echelon_ccn}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { echelon_ccn: v })) }} />
                  <TextField label="Coefficient CCN" value={contractFields.coefficient_ccn}
                    onChange={function (v: any) { setContractFields(Object.assign({}, contractFields, { coefficient_ccn: v })) }} />
                </div>
              </div>
            </div>
          ) : null}

          {/* PHASE DONE */}
          {phase === "done" ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14, textAlign: "center", padding: 22 }}>
                <div style={{ fontSize: 38 }}>✅</div>
                <div className="yt" style={{ fontSize: 26, marginTop: 4 }}>
                  {mode === "contrat" ? "Avenant généré !" : "Contrat généré !"}
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  {mode === "contrat"
                    ? "Le contrat originel est sauvegardé dans la fiche, et l'avenant s'est ouvert dans un nouvel onglet."
                    : "Le contrat de régularisation s'est ouvert dans un nouvel onglet."}
                </div>
              </div>

              {mode === "contrat" ? (
                <div className="card-p" style={{ padding: 12, marginBottom: 14, fontSize: 12 }}>
                  <strong>📎 Contrat originel sauvegardé</strong>
                  <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                    Le PDF originel est désormais visible dans la fiche du salarié comme
                    <strong> "Contrat signé"</strong>, et l'avenant comme
                    <strong> "Contrat généré (à signer)"</strong>. Le bandeau "À RÉGULARISER" a été désactivé
                    car le contrat originel est validé.
                  </div>
                </div>
              ) : (contractSaved ? (
                <div className="card-p" style={{ padding: 12, marginBottom: 14, fontSize: 12 }}>
                  <strong>📎 Sauvegardé dans la fiche salarié</strong>
                  <div style={{ marginTop: 4, lineHeight: 1.5 }}>
                    Le contrat est aussi disponible dans la fiche du salarié, section "Documents",
                    avec le badge <strong>"Contrat généré (à signer)"</strong>. Tu pourras le
                    re-télécharger ou re-imprimer à tout moment depuis là-bas.
                  </div>
                </div>
              ) : (
                <div className="card" style={{ padding: 12, marginBottom: 14, fontSize: 12, background: "#FFF8E1", borderColor: "#191923" }}>
                  ⚠ Le contrat n'a pas pu être sauvegardé automatiquement dans la fiche.
                  Pense à enregistrer le PDF localement avant de fermer le nouvel onglet.
                </div>
              ))}

              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ct">📋 Étapes suivantes</div>
                {mode === "contrat" ? (
                  <ol style={{ paddingLeft: 18, fontSize: 11, lineHeight: 1.7 }}>
                    <li><strong>Imprime l'avenant</strong> en 2 exemplaires (bouton "↓ Imprimer / PDF" dans le nouvel onglet)</li>
                    <li><strong>Fais signer</strong> le salarié — mention manuscrite "Lu et approuvé, bon pour accord"</li>
                    <li>Signe ton exemplaire</li>
                    <li>Reviens dans la fiche → bouton <strong>"📥 Uploader contrat signé"</strong> pour stocker l'avenant signé</li>
                    <li>Le contrat originel est <strong>déjà</strong> dans la fiche, le bandeau de régularisation a disparu 🎉</li>
                  </ol>
                ) : (
                  <ol style={{ paddingLeft: 18, fontSize: 11, lineHeight: 1.7 }}>
                    <li><strong>Imprime</strong> le contrat en 2 exemplaires (bouton "↓ Imprimer / PDF" dans le nouvel onglet)</li>
                    <li>Ou enregistre-le en PDF (Imprimer → "Enregistrer au format PDF")</li>
                    <li><strong>Fais signer</strong> le salarié — mention manuscrite "Lu et approuvé, bon pour accord"</li>
                    <li>Signe ton exemplaire</li>
                    <li>Reviens dans la fiche du salarié et clique <strong>"📥 Uploader contrat signé"</strong></li>
                    <li>L'app désactivera automatiquement le bandeau "À RÉGULARISER" 🎉</li>
                  </ol>
                )}
              </div>
              <div className="card-p" style={{ padding: 10, fontSize: 11 }}>
                <strong>💡 À faire en parallèle :</strong> récupérer la DPAE du salarié sur
                <a href="https://www.net-entreprises.fr" target="_blank" rel="noreferrer"> Net-Entreprises.fr </a>
                pour confirmer la vraie date d'embauche déclarée à l'URSSAF.
              </div>
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="mf">
          {phase === "choose" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={handleCloseRequest}>Annuler</button>
            </div>
          ) : null}
          {phase === "drop" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {initialModeProp ? (
                <button className="btn" onClick={handleCloseRequest}>Annuler</button>
              ) : (
                <button className="btn" onClick={function () { setPhase("choose"); setFiles([]) }}>← Retour</button>
              )}
              <button className="btn btn-p" onClick={handleAnalyze} disabled={files.length === 0}>
                {mode === "contrat" ? "🤖 Analyser le contrat" : "🤖 Analyser les fiches"}
              </button>
            </div>
          ) : null}
          {phase === "review" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={function () { setPhase("drop") }}>← Retour</button>
              <button className="btn btn-p" onClick={handleGenerateContract} disabled={saving}>
                {saving
                  ? "Génération..."
                  : (mode === "contrat" ? "📋 Générer l'avenant" : "📝 Générer le contrat")}
              </button>
            </div>
          ) : null}
          {phase === "done" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn btn-y" onClick={function () {
                onSaved(mode === "contrat"
                  ? "Avenant généré — fais signer puis upload via 'Uploader contrat signé'"
                  : "Contrat de régularisation généré — fais signer puis upload")
                onClose()
              }}>Terminer</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// Sous-composants top-level (SWC)
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
