// ============================================================
// EmployeeDetail.tsx
// ============================================================
// Vue salarié-centrée déroulée (pas d'onglets internes)
// 4 sections les unes sous les autres :
//   1. Header avec actions principales
//   2. Bloc Infos personnelles (lecture/édition)
//   3. Bloc Contrats (cards avec actions)
//   4. Bloc Documents fusionnés (perso + contractuels à plat)
//
// Props attendues :
//   - employeeId: UUID du salarié à charger
//   - onClose: callback fermeture
//   - onSaved(msg): callback après save infos
//   - onDeleted(msg): callback après suppression
//   - onContractPreview(c): callback pour ouvrir l'aperçu d'un contrat
//   - onContractEdit(c): callback pour ouvrir le wizard en édition
//   - onNewContract(empId): callback pour créer un nouveau contrat
// ============================================================

import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import DocumentsManager from "./DocumentsManager"
import OffboardingWizard from "./OffboardingWizard"
import WorkStoppageWizard from "./WorkStoppageWizard"
import RegularizationWizard from "./RegularizationWizard"
import {
  NATIONALITES,
  getContractTypeMeta,
  capitalize
} from "./rhConstants"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function EmployeeDetail(props) {
  var [emp, setEmp] = useState(null)
  var [empOriginal, setEmpOriginal] = useState(null)
  var [contracts, setContracts] = useState([])
  var [welcomePackDocs, setWelcomePackDocs] = useState([])
  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [editing, setEditing] = useState(false)
  var [uploadingSignedFor, setUploadingSignedFor] = useState(null)
  var [uploadingWelcomePack, setUploadingWelcomePack] = useState(false)
  var [showOffboarding, setShowOffboarding] = useState(false)
  var [showRegularization, setShowRegularization] = useState(false)
  var [showOriginalContract, setShowOriginalContract] = useState(false)
  var [unmarkingExit, setUnmarkingExit] = useState(false)
  var [stoppages, setStoppages] = useState([])
  var [showStoppageWizard, setShowStoppageWizard] = useState(false)
  var [editingStoppage, setEditingStoppage] = useState(null)
  var [reEmploying, setReEmploying] = useState(false)
  var signedFileInputRef = useRef(null)
  var welcomePackFileInputRef = useRef(null)

  // === Charge l'employé + ses contrats ===
  async function load() {
    setLoading(true)
    var resE = await supabase
      .from("hr_employees")
      .select("*")
      .eq("id", props.employeeId)
      .single()

    // Charge les contrats par les deux chemins :
    //   1. employee_id direct (RhWizard, embauche standard)
    //   2. cycle_id (RegularizationWizard, régularisation rétroactive)
    // Les contrats régularisés sont rattachés à un cycle d'emploi,
    // pas directement au salarié — il faut donc passer par les cycles.
    var resCDirect = await supabase
      .from("hr_contracts")
      .select("*")
      .eq("employee_id", props.employeeId)
      .order("created_at", { ascending: false })

    var resCyc = await supabase
      .from("hr_employment_cycles")
      .select("id")
      .eq("employee_id", props.employeeId)

    var cycleIds = (resCyc.data || []).map(function (c) { return c.id })
    var resCByCycle = { data: [] }
    if (cycleIds.length > 0) {
      resCByCycle = await supabase
        .from("hr_contracts")
        .select("*")
        .in("cycle_id", cycleIds)
        .order("created_at", { ascending: false })
    }

    // Fusion + dédoublonnage par id
    var seen = {}
    var merged = []
    var allContracts = (resCDirect.data || []).concat(resCByCycle.data || [])
    for (var i = 0; i < allContracts.length; i++) {
      var c = allContracts[i]
      if (!seen[c.id]) {
        seen[c.id] = true
        merged.push(c)
      }
    }

    setEmp(resE.data || null)
    setEmpOriginal(resE.data || null)
    var contractsList = merged
    setContracts(contractsList)

    // Charge les dossiers de bienvenue signés (rattachés aux contrats du salarié)
    var contractIds = contractsList.map(function (c) { return c.id })
    if (contractIds.length > 0) {
      var resWP = await supabase
        .from("hr_contract_documents")
        .select("*")
        .in("contract_id", contractIds)
        .eq("doc_type", "dossier_bienvenue_signe")
        .order("uploaded_at", { ascending: false })
      setWelcomePackDocs(resWP.data || [])
    } else {
      setWelcomePackDocs([])
    }

    // Charge les arrêts de travail
    try {
      var resSt = await fetch("/api/hr/work-stoppages?employee_id=" + props.employeeId)
      var dataSt = await resSt.json()
      if (resSt.ok) setStoppages(dataSt.stoppages || [])
    } catch (e) {
      // non-fatal
    }

    setLoading(false)
  }

  useEffect(function () { load() }, [props.employeeId])

  function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("fr-FR")
  }

  // === Sauvegarde des infos perso ===
  async function saveInfos() {
    setSaving(true)
    var update = {
      civilite: emp.civilite,
      prenom: emp.prenom,
      nom: emp.nom,
      date_naissance: emp.date_naissance || null,
      lieu_naissance: emp.lieu_naissance || null,
      nationalite: emp.nationalite || null,
      adresse: emp.adresse || null,
      code_postal: emp.code_postal || null,
      ville: emp.ville || null,
      num_secu: emp.num_secu || null,
      email: emp.email || null,
      telephone: emp.telephone || null,
      notes: emp.notes || null
    }
    var res = await supabase.from("hr_employees").update(update).eq("id", emp.id)
    if (res.error) {
      alert("Erreur sauvegarde : " + res.error.message)
    } else {
      setEditing(false)
      setEmpOriginal(emp)
      if (props.onSaved) props.onSaved("Salarié mis à jour ✓")
    }
    setSaving(false)
  }

  // === Suppression du salarié (cascade DB) ===
  async function deleteEmployee() {
    if (!confirm(
      "⚠️ SUPPRESSION IRRÉVERSIBLE\n\n" +
      "Tu vas supprimer " + emp.prenom + " " + (emp.nom || "").toUpperCase() + " et tout son contenu :\n" +
      "  • Sa fiche personnelle\n" +
      "  • Ses " + contracts.length + " contrat(s)\n" +
      "  • Toutes les vacations associées\n" +
      "  • Tous ses documents persistants\n" +
      "  • Tous les documents de ses contrats\n\n" +
      "Cette action ne peut pas être annulée. Continuer ?"
    )) return

    setSaving(true)
    try {
      // 1. Récupérer paths storage
      var empDocs = await supabase.from("hr_employee_documents")
        .select("file_path").eq("employee_id", emp.id)
      var contractIds = contracts.map(function (c) { return c.id })
      var contDocs = { data: [] }
      if (contractIds.length > 0) {
        contDocs = await supabase.from("hr_contract_documents")
          .select("file_path").in("contract_id", contractIds)
      }
      // 2. Suppression storage (best effort)
      var empPaths = (empDocs.data || []).map(function (d) { return d.file_path })
      var contPaths = (contDocs.data || []).map(function (d) { return d.file_path })
      if (empPaths.length > 0) {
        await supabase.storage.from("hr-employee-docs").remove(empPaths)
      }
      if (contPaths.length > 0) {
        await supabase.storage.from("hr-contract-docs").remove(contPaths)
      }
      // 3. Supprimer le salarié (cascade FK)
      var del = await supabase.from("hr_employees").delete().eq("id", emp.id)
      if (del.error) throw del.error

      if (props.onDeleted) props.onDeleted(emp.prenom + " " + (emp.nom || "") + " supprimé(e)")
      props.onClose()
    } catch (err) {
      alert("Erreur suppression : " + (err.message || err))
      setSaving(false)
    }
  }

  // === Suppression d'un contrat (sans toucher au salarié) ===
  async function deleteContract(c) {
    if (!confirm("Supprimer ce contrat ?\n\n" + (c.fonction || c.type) + "\n\nLes documents liés à ce contrat (fiches de paie, etc.) seront aussi supprimés.")) return
    try {
      // Storage docs contrat
      var docs = await supabase.from("hr_contract_documents")
        .select("file_path").eq("contract_id", c.id)
      var paths = (docs.data || []).map(function (d) { return d.file_path })
      if (paths.length > 0) {
        await supabase.storage.from("hr-contract-docs").remove(paths)
      }
      var del = await supabase.from("hr_contracts").delete().eq("id", c.id)
      if (del.error) throw del.error
      if (props.onSaved) props.onSaved("Contrat supprimé")
      load()
    } catch (err) {
      alert("Erreur : " + (err.message || err))
    }
  }

  // === Upload contrat signé pour un contrat précis ===
  function triggerSignedUpload(c) {
    setUploadingSignedFor(c)
    setTimeout(function () {
      if (signedFileInputRef.current) signedFileInputRef.current.click()
    }, 50)
  }

  async function handleSignedFile(file) {
    if (!file || !uploadingSignedFor) return
    var c = uploadingSignedFor
    try {
      var ext = (file.name.split(".").pop() || "pdf").toLowerCase()
      var path = c.id + "/contrat_signe/" + Date.now() + "-signed." + ext
      var up = await supabase.storage.from("hr-contract-docs").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || undefined
      })
      if (up.error) throw up.error
      var ins = await supabase.from("hr_contract_documents").insert([{
        contract_id: c.id,
        doc_type: "contrat_signe",
        label: "Contrat signé",
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size || null
      }])
      if (ins.error) throw ins.error
      // Mettre le contrat en status "signed"
      await supabase.from("hr_contracts").update({ status: "signed" }).eq("id", c.id)
      if (props.onSaved) props.onSaved("Contrat signé uploadé ✓")
      setUploadingSignedFor(null)
      if (signedFileInputRef.current) signedFileInputRef.current.value = ""
      load()
    } catch (err) {
      alert("Erreur upload : " + (err.message || err))
      setUploadingSignedFor(null)
    }
  }

  // === Génération / aperçu du dossier de bienvenue ===
  function previewWelcomePack() {
    if (props.onWelcomePackPreview) props.onWelcomePackPreview(emp.id)
  }

  // === Trigger upload du dossier signé "Lu et approuvé" ===
  function triggerWelcomePackUpload() {
    var activeContract = contracts.filter(function (c) { return c.status !== "archived" })[0]
    if (!activeContract) {
      alert(
        "Pas de contrat actif pour rattacher le dossier signé.\n\n" +
        "Le dossier de bienvenue signé doit être rattaché à un contrat de travail. " +
        "Crée d'abord un contrat (ou réactive un contrat archivé) puis recommence."
      )
      return
    }
    setUploadingWelcomePack(true)
    setTimeout(function () {
      if (welcomePackFileInputRef.current) welcomePackFileInputRef.current.click()
    }, 50)
  }

  async function handleWelcomePackFile(file) {
    if (!file) { setUploadingWelcomePack(false); return }
    var activeContract = contracts.filter(function (c) { return c.status !== "archived" })[0]
    if (!activeContract) {
      alert("Pas de contrat actif. Annulé.")
      setUploadingWelcomePack(false)
      return
    }
    try {
      var ext = (file.name.split(".").pop() || "pdf").toLowerCase()
      var path = activeContract.id + "/dossier_bienvenue/" + Date.now() + "-signed." + ext
      var up = await supabase.storage.from("hr-contract-docs").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || undefined
      })
      if (up.error) throw up.error
      var ins = await supabase.from("hr_contract_documents").insert([{
        contract_id: activeContract.id,
        doc_type: "dossier_bienvenue_signe",
        label: "Dossier de bienvenue signé (Lu et approuvé)",
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size || null
      }])
      if (ins.error) throw ins.error
      if (props.onSaved) props.onSaved("Dossier de bienvenue signé uploadé ✓")
      setUploadingWelcomePack(false)
      if (welcomePackFileInputRef.current) welcomePackFileInputRef.current.value = ""
      load()
    } catch (err) {
      alert("Erreur upload : " + (err.message || err))
      setUploadingWelcomePack(false)
    }
  }

  // === Demander les congés (envoie un email automatique) ===
  async function requestLeave() {
    if (!emp.email) {
      alert("Ce salarié n'a pas d'adresse email enregistrée. Ajoute-la d'abord dans la fiche.")
      return
    }
    var customMessage = prompt(
      "Tu vas envoyer une demande de planification des congés à " + emp.prenom + " " + (emp.nom || "") + " (" + emp.email + ").\n\n" +
      "Optionnel — message personnel à ajouter (laisse vide pour le mail standard) :",
      ""
    )
    if (customMessage === null) return // user a cliqué Annuler

    var activeContract = contracts.filter(function (c) { return c.status !== "archived" })[0]

    setSaving(true)
    try {
      var res = await fetch("/api/leave-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: emp.id,
          contract_id: activeContract ? activeContract.id : null,
          message: customMessage || null
        })
      })
      var data = await res.json()
      if (!res.ok) {
        alert("Erreur envoi : " + (data.error || "inconnue"))
      } else {
        if (props.onSaved) props.onSaved("✉️ Demande envoyée à " + emp.email)
      }
    } catch (err) {
      alert("Erreur réseau : " + (err.message || err))
    }
    setSaving(false)
  }

  // === Annuler le départ : rouvre le cycle clôturé le plus récent ===
  async function handleUnmarkExit() {
    if (!emp.date_sortie) return
    if (!window.confirm("Annuler le départ de " + emp.prenom + " ? Le cycle d'emploi sera rouvert et les dates de sortie effacées.")) return
    setUnmarkingExit(true)
    try {
      // 1) Trouver le cycle le plus récent (le dernier clôturé)
      var resCyc = await fetch("/api/hr/cycles?employee_id=" + emp.id)
      var data = await resCyc.json()
      if (!resCyc.ok) throw new Error(data.error || "Chargement cycles")
      var cycles = data.cycles || []
      // Le plus récent par date_entree
      cycles.sort(function (a, b) {
        return (b.date_entree || "").localeCompare(a.date_entree || "")
      })
      var lastCycle = cycles[0]
      if (!lastCycle) throw new Error("Aucun cycle trouvé")
      if (!lastCycle.date_sortie) {
        // Déjà ouvert — juste effacer la date_sortie sur l'employé
        await supabase.from("hr_employees").update({ date_sortie: null, motif_sortie: null }).eq("id", emp.id)
      } else {
        // 2) Rouvrir le cycle (PATCH avec date_sortie null)
        var resPatch = await fetch("/api/hr/cycles", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cycle_id: lastCycle.id, date_sortie: null, motif_sortie: null }),
        })
        var dataPatch = await resPatch.json()
        if (!resPatch.ok) throw new Error(dataPatch.error || "Réouverture cycle")

        // 3) Remettre is_current=true sur le contrat le plus récent du cycle, et effacer son effective_to
        var contractsInCycle = (lastCycle.contracts || []).slice().sort(function (a: any, b: any) {
          return (b.date_debut || "").localeCompare(a.date_debut || "")
        })
        var lastContract = contractsInCycle[0]
        if (lastContract) {
          await supabase.from("hr_contracts").update({ effective_to: null, is_current: true }).eq("id", lastContract.id)
        }

        // 4) Effacer date_sortie sur hr_employees
        await supabase.from("hr_employees").update({ date_sortie: null, motif_sortie: null }).eq("id", emp.id)
      }
      if (props.onSaved) props.onSaved("Départ annulé — cycle rouvert")
      load()
    } catch (e: any) {
      alert("Erreur : " + e.message)
    } finally {
      setUnmarkingExit(false)
    }
  }

  // === Ré-embauche : créer un nouveau cycle pour un salarié déjà parti ===
  async function handleReHire() {
    if (!emp.date_sortie) return
    var today = new Date().toISOString().slice(0, 10)
    var dateStr = window.prompt(
      "Date de ré-embauche (format JJ/MM/AAAA ou AAAA-MM-JJ). Laisse vide pour aujourd'hui :",
      ""
    )
    if (dateStr === null) return // annulé
    var dateIso = today
    if (dateStr.trim()) {
      // Convertir DD/MM/YYYY → YYYY-MM-DD si nécessaire
      var s = dateStr.trim()
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        var parts = s.split("/")
        dateIso = parts[2] + "-" + parts[1] + "-" + parts[0]
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        dateIso = s
      } else {
        alert("Format de date invalide. Utilise JJ/MM/AAAA ou AAAA-MM-JJ.")
        return
      }
    }
    setReEmploying(true)
    try {
      // 1) Créer un nouveau cycle ouvert
      var resCyc = await fetch("/api/hr/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: emp.id,
          date_entree: dateIso,
          notes: "Ré-embauche le " + dateIso,
        }),
      })
      var dataCyc = await resCyc.json()
      if (!resCyc.ok) throw new Error(dataCyc.error || "Création nouveau cycle")

      // 2) Restaurer le statut actif sur hr_employees
      await supabase.from("hr_employees").update({
        date_sortie: null,
        motif_sortie: null,
      }).eq("id", emp.id)

      if (props.onSaved) props.onSaved("Nouveau cycle d'emploi créé — utilise '+ Nouveau contrat' pour ajouter son contrat")
      load()
    } catch (e: any) {
      alert("Erreur ré-embauche : " + e.message)
    } finally {
      setReEmploying(false)
    }
  }

  // === Helpers Arrêts de travail ===
  var stoppageTypeLabels = {
    arret_maladie: "Arrêt maladie",
    accident_travail: "Accident travail",
    accident_trajet: "Accident trajet",
    maladie_pro: "Maladie pro",
    conge_maternite: "Congé maternité",
    conge_paternite: "Congé paternité",
    conge_adoption: "Congé adoption",
    conge_parental: "Congé parental",
    autre: "Autre",
  }

  function stoppageTypeIcon(t) {
    if (t === "arret_maladie") return "🤒"
    if (t === "accident_travail" || t === "accident_trajet") return "🚑"
    if (t === "maladie_pro") return "⚕️"
    if (t === "conge_maternite" || t === "conge_paternite" || t === "conge_adoption") return "👶"
    if (t === "conge_parental") return "👨‍👩‍👧"
    return "📋"
  }

  function isStoppageOngoing(s) {
    if (!s.date_fin) return true
    var today = new Date().toISOString().slice(0, 10)
    return s.date_fin >= today
  }

  async function deleteStoppage(s) {
    if (!window.confirm("Supprimer cet arrêt ? Action irréversible.")) return
    try {
      var res = await fetch("/api/hr/work-stoppages?id=" + s.id, { method: "DELETE" })
      if (!res.ok) {
        var d = await res.json()
        throw new Error(d.error || "Erreur suppression")
      }
      if (props.onSaved) props.onSaved("Arrêt supprimé")
      load()
    } catch (e: any) {
      alert("Erreur : " + e.message)
    }
  }

  // === Render ===
  if (loading || !emp) {
    return (
      <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
        <div className="modal" style={{ padding: 30, textAlign: "center" }}>Chargement…</div>
      </div>
    )
  }

  var statusLabels = { draft: "Brouillon", finalized: "Finalisé", signed: "Signé", archived: "Archivé" }
  var statusColors = {
    draft: { bg: "#FFF8E1", color: "#191923" },
    finalized: { bg: "#FFEB5A", color: "#191923" },
    signed: { bg: "#FF82D7", color: "#FFFFFF" },
    archived: { bg: "#EDEDED", color: "#666" }
  }

  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl" style={{ maxWidth: 880, maxHeight: "92vh", overflowY: "auto" }}>
        {/* Hidden file input pour le contrat signé */}
        <input
          ref={signedFileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={function (e) {
            var f = e.target.files && e.target.files[0]
            if (f) handleSignedFile(f)
          }}
        />

        {/* Hidden file input pour le dossier de bienvenue signé */}
        <input
          ref={welcomePackFileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={function (e) {
            var f = e.target.files && e.target.files[0]
            if (f) handleWelcomePackFile(f)
          }}
        />

        {/* === HEADER === */}
        <div className="mh" style={{ position: "sticky", top: 0, zIndex: 10, background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div className="mt" style={{ fontFamily: "Yellowtail, cursive", fontSize: 28, color: "#FF82D7", lineHeight: 1.1 }}>
              👤 {emp.prenom} {(emp.nom || "").toUpperCase()}
              {emp.date_sortie ? (
                <span className="badge" style={{
                  marginLeft: 10, background: "#191923", color: "#FFEB5A", fontFamily: "'Arial Narrow', Arial",
                  fontSize: 10, padding: "3px 8px", verticalAlign: "middle",
                }}>
                  PARTI {fmtDate(emp.date_sortie)}
                </span>
              ) : null}
            </div>
            <button className="btn" onClick={props.onClose}>Fermer ×</button>
          </div>
          {/* Boutons d'action principaux */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            <button
              className="btn btn-p"
              onClick={function () { if (props.onNewContract) props.onNewContract(emp.id) }}
            >+ Nouveau contrat</button>
            <button
              className="btn btn-y"
              onClick={function () {
                var target = contracts.filter(function (c) { return c.status !== "archived" })[0]
                if (target) triggerSignedUpload(target)
                else alert("Pas de contrat actif pour uploader le signé. Crée d'abord un contrat.")
              }}
            >📥 Uploader contrat signé</button>
            <button
              className="btn"
              onClick={previewWelcomePack}
              title="Générer / voir le dossier de bienvenue (4 pages)"
            >📋 Dossier de bienvenue</button>
            <button
              className="btn"
              onClick={requestLeave}
              disabled={!emp.email}
              title={emp.email ? "Envoyer la demande de planification des congés" : "Le salarié doit avoir une adresse email"}
            >📅 Demander les congés</button>
            {!emp.date_sortie && !emp.needs_regularization ? (
              <button
                className="btn btn-p"
                onClick={function () { setShowOriginalContract(true) }}
                title="Uploader le contrat originel signé + générer automatiquement un avenant qui ajoute les clauses modernes"
              >📄 Contrat originel + avenant</button>
            ) : null}
            {!emp.date_sortie ? (
              <button
                className="btn"
                onClick={function () { setShowOffboarding(true) }}
                title="Marquer le salarié comme parti (date de sortie + motif)"
              >📤 Marquer comme parti</button>
            ) : (
              <span style={{ display: "contents" }}>
                <button
                  className="btn btn-y"
                  onClick={handleReHire}
                  disabled={reEmploying}
                  title="Créer un nouveau cycle d'emploi (la personne revient travailler)"
                >{reEmploying ? "..." : "🔁 Nouvelle embauche"}</button>
                <button
                  className="btn btn-red"
                  onClick={handleUnmarkExit}
                  disabled={unmarkingExit}
                  title="Annuler le départ (rouvre le cycle clôturé — utiliser uniquement si erreur)"
                >{unmarkingExit ? "..." : "↩ Annuler le départ"}</button>
              </span>
            )}
          </div>
        </div>

        {/* === BANDEAU RÉGULARISATION (si needs_regularization) === */}
        {emp.needs_regularization ? (
          <div
            style={{
              background: "#FF82D7",
              border: "2.5px solid #191923",
              boxShadow: "4px 4px 0 #191923",
              padding: 14,
              margin: "0 16px 16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontFamily: "Yellowtail, cursive", fontSize: 22, color: "#191923", lineHeight: 1, marginBottom: 4 }}>
                  À régulariser
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: "#191923" }}>
                  Ce salarié n'a <strong>aucun contrat formalisé</strong>. Click sur "📝 Régulariser" pour générer un contrat de régularisation à partir de ses fiches de paie.
                  L'IA reconstituera la date d'embauche et les conditions actuelles.
                </div>
              </div>
              <button
                className="btn"
                onClick={function () { setShowRegularization(true) }}
                style={{
                  background: "#FFEB5A",
                  color: "#191923",
                  border: "2.5px solid #191923",
                  boxShadow: "3px 3px 0 #191923",
                  fontWeight: 900,
                  fontSize: 13,
                  padding: "10px 16px",
                }}
              >📝 Régulariser</button>
            </div>
          </div>
        ) : null}

        {/* === BLOC INFOS PERSONNELLES === */}
        <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="ct" style={{ margin: 0 }}>📋 Informations personnelles</div>
            {!editing ? (
              <button className="btn btn-sm btn-p" onClick={function () { setEditing(true) }}>
                ✏️ Modifier
              </button>
            ) : null}
          </div>

          {!editing ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
                <div><b>Civilité :</b> {emp.civilite || "—"}</div>
                <div><b>Nationalité :</b> {emp.nationalite ? capitalize(emp.nationalite) : "—"}</div>
                <div><b>Né(e) le :</b> {fmtDate(emp.date_naissance)}</div>
                <div><b>Lieu de naissance :</b> {emp.lieu_naissance || "—"}</div>
                <div style={{ gridColumn: "1 / span 2" }}>
                  <b>Adresse :</b> {emp.adresse || "—"}
                  {(emp.code_postal || emp.ville) ? (<span> · {emp.code_postal || ""} {emp.ville || ""}</span>) : null}
                </div>
                <div><b>N° Sécu sociale :</b> {emp.num_secu || "—"}</div>
                <div></div>
                <div>
                  <b>Email :</b> {emp.email
                    ? <a href={"mailto:" + emp.email} style={{ color: "#FF82D7" }}>{emp.email}</a>
                    : "—"}
                </div>
                <div>
                  <b>Téléphone :</b> {emp.telephone
                    ? <a href={"tel:" + emp.telephone} style={{ color: "#FF82D7" }}>{emp.telephone}</a>
                    : "—"}
                </div>
              </div>
              {emp.notes ? (
                <div style={{ marginTop: 12, padding: 10, background: "#FFF8E1", borderLeft: "3px solid #FF82D7", borderRadius: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 4 }}>📝 Notes :</div>
                  <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{emp.notes}</div>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Civilité</label>
                  <select className="inp" value={emp.civilite || "Madame"}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { civilite: e.target.value })) }}>
                    <option value="Madame">Madame</option>
                    <option value="Monsieur">Monsieur</option>
                    <option value="Mademoiselle">Mademoiselle</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Nationalité</label>
                  <input className="inp" list="nat-list-detail"
                    value={emp.nationalite ? capitalize(emp.nationalite) : ""}
                    onChange={function (e) {
                      setEmp(Object.assign({}, emp, { nationalite: (e.target.value || "").toLowerCase() }))
                    }}
                    placeholder="Tape les premières lettres..." />
                  <datalist id="nat-list-detail">
                    {NATIONALITES.map(function (n) { return <option key={n} value={capitalize(n)} /> })}
                  </datalist>
                </div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Prénom</label>
                  <input className="inp" value={emp.prenom || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { prenom: e.target.value })) }} />
                </div>
                <div className="fg">
                  <label className="lbl">Nom</label>
                  <input className="inp" value={emp.nom || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { nom: e.target.value })) }} />
                </div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Date de naissance</label>
                  <input type="date" className="inp" value={emp.date_naissance || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { date_naissance: e.target.value })) }} />
                </div>
                <div className="fg">
                  <label className="lbl">Lieu de naissance</label>
                  <input className="inp" value={emp.lieu_naissance || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { lieu_naissance: e.target.value })) }} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Adresse</label>
                <input className="inp" value={emp.adresse || ""}
                  onChange={function (e) { setEmp(Object.assign({}, emp, { adresse: e.target.value })) }} />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Code postal</label>
                  <input className="inp" value={emp.code_postal || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { code_postal: e.target.value })) }} />
                </div>
                <div className="fg">
                  <label className="lbl">Ville</label>
                  <input className="inp" value={emp.ville || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { ville: e.target.value })) }} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">N° de sécurité sociale</label>
                <input className="inp" value={emp.num_secu || ""}
                  onChange={function (e) { setEmp(Object.assign({}, emp, { num_secu: e.target.value })) }} />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Email</label>
                  <input className="inp" value={emp.email || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { email: e.target.value })) }} />
                </div>
                <div className="fg">
                  <label className="lbl">Téléphone</label>
                  <input className="inp" value={emp.telephone || ""}
                    onChange={function (e) { setEmp(Object.assign({}, emp, { telephone: e.target.value })) }} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Notes internes</label>
                <textarea className="inp" rows={3}
                  value={emp.notes || ""}
                  onChange={function (e) { setEmp(Object.assign({}, emp, { notes: e.target.value })) }}
                  placeholder="Ex: Recommandé(e) par X. Disponible le week-end. Permis B." />
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" onClick={function () { setEmp(empOriginal); setEditing(false) }} disabled={saving}>
                  Annuler
                </button>
                <button className="btn btn-p" onClick={saveInfos} disabled={saving}>
                  {saving ? "Sauvegarde..." : "💾 Enregistrer"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* === BLOC CONTRATS === */}
        <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
          <div className="ct">📄 Contrats ({contracts.length})</div>
          {contracts.length === 0 ? (
            <div style={{ padding: 16, background: "#FAFAFA", borderRadius: 6, textAlign: "center", color: "#999", fontStyle: "italic", fontSize: 12 }}>
              Aucun contrat. Clique sur "+ Nouveau contrat" pour en créer un.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contracts.map(function (c) {
                var meta = getContractTypeMeta(c.type || "extra")
                var sc = statusColors[c.status] || statusColors.draft
                return (
                  <div key={c.id} style={{
                    background: "#FFFFFF",
                    border: "1px solid #DDD",
                    borderRadius: 6,
                    padding: 10
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                        <span style={{
                          background: sc.bg,
                          color: sc.color,
                          padding: "3px 6px",
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: ".5px"
                        }}>
                          {statusLabels[c.status] || c.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900 }}>
                        {(c.type !== "extra" && c.salaire_brut_mensuel)
                          ? c.salaire_brut_mensuel + " €/mois"
                          : (c.taux_horaire_brut ? c.taux_horaire_brut + " €/h" : "")}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{c.fonction || "—"}</div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 8 }}>
                      {c.type === "extra"
                        ? ("Du " + fmtDate(c.date_debut) + " au " + fmtDate(c.date_fin))
                        : ("Embauche : " + fmtDate(c.date_embauche || c.date_debut))}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button
                        className="btn btn-sm btn-y"
                        onClick={function () { if (props.onContractPreview) props.onContractPreview(c) }}
                      >👁 Voir / Imprimer</button>
                      {c.status === "draft" || c.status === "finalized" ? (
                        <button
                          className="btn btn-sm"
                          onClick={function () { if (props.onContractEdit) props.onContractEdit(c) }}
                        >✏️ Éditer</button>
                      ) : null}
                      <button
                        className="btn btn-sm"
                        onClick={function () { triggerSignedUpload(c) }}
                      >📥 Uploader signé</button>
                      <button
                        className="btn btn-sm btn-red"
                        onClick={function () { deleteContract(c) }}
                        title="Supprimer ce contrat"
                      >×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* === BLOC ARRÊTS DE TRAVAIL === */}
        <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div className="ct" style={{ marginBottom: 0 }}>🩹 Arrêts de travail ({stoppages.length})</div>
            <button
              className="btn btn-sm btn-p"
              onClick={function () {
                setEditingStoppage(null)
                setShowStoppageWizard(true)
              }}
            >+ Ajouter un arrêt</button>
          </div>
          {stoppages.length === 0 ? (
            <div style={{ fontSize: 11, opacity: 0.6, padding: "10px 0" }}>
              Aucun arrêt enregistré. Tu peux saisir manuellement ou uploader le certificat médical (l'IA extrait les dates).
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stoppages.map(function (s) {
                var ongoing = isStoppageOngoing(s)
                return (
                  <div key={s.id} style={{
                    padding: 10,
                    background: ongoing ? "#FFF8E1" : "#FFFFFF",
                    border: "2px solid " + (ongoing ? "#FFEB5A" : "#EDEDED"),
                    borderRadius: 6,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}>
                    <div style={{ fontSize: 22, lineHeight: 1 }}>{stoppageTypeIcon(s.stoppage_type)}</div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        <strong style={{ fontSize: 13 }}>{stoppageTypeLabels[s.stoppage_type] || s.stoppage_type}</strong>
                        {ongoing ? (
                          <span style={{
                            background: "#FFEB5A", color: "#191923",
                            padding: "2px 6px", borderRadius: 3, fontSize: 9, fontWeight: 900,
                            border: "1px solid #191923",
                          }}>EN COURS</span>
                        ) : null}
                        {s.is_prolongation ? (
                          <span style={{
                            background: "#FF82D7", color: "#191923",
                            padding: "2px 6px", borderRadius: 3, fontSize: 9, fontWeight: 900,
                            border: "1px solid #191923",
                          }}>PROLONGATION</span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 11, marginBottom: 2 }}>
                        Du <b>{fmtDate(s.date_debut)}</b>
                        {s.date_fin ? (
                          <span> au <b>{fmtDate(s.date_fin)}</b></span>
                        ) : (
                          <span> (en cours)</span>
                        )}
                      </div>
                      {s.motif ? <div style={{ fontSize: 11, opacity: 0.8 }}>{s.motif}</div> : null}
                      {s.prescripteur ? <div style={{ fontSize: 10, opacity: 0.6 }}>{s.prescripteur}</div> : null}
                      {s.document_path ? (
                        <div style={{ fontSize: 9, opacity: 0.5, marginTop: 2 }}>📎 Certificat médical archivé</div>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-sm"
                        onClick={function () {
                          setEditingStoppage(s)
                          setShowStoppageWizard(true)
                        }}
                      >✏️</button>
                      <button
                        className="btn btn-sm btn-red"
                        onClick={function () { deleteStoppage(s) }}
                      >🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* === BLOC DOSSIER DE BIENVENUE === */}
        <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
          <div className="ct">📋 Dossier de bienvenue</div>
          <div style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "10px 14px", marginBottom: 12, fontSize: 11, lineHeight: 1.5 }}>
            🥪 4 pages signables : couverture, fiche salarié pré-remplie, règles d'hygiène (L4122-1) et engagement de lecture (L1331-1) avec mention « Lu et approuvé ».
          </div>

          {welcomePackDocs.length > 0 ? (
            <div style={{ background: "#FFFFFF", border: "2px solid #FF82D7", borderRadius: 6, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ background: "#FF82D7", color: "#FFFFFF", padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".5px" }}>
                  ✓ Signé
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  Dossier signé téléversé le {fmtDate(welcomePackDocs[0].uploaded_at)}
                </span>
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                {welcomePackDocs.length} fichier{welcomePackDocs.length > 1 ? "s" : ""} archivé{welcomePackDocs.length > 1 ? "s" : ""} · catégorie « dossier_bienvenue_signe »
              </div>
            </div>
          ) : (
            <div style={{ background: "#FAFAFA", border: "1px dashed #BBBBBB", borderRadius: 6, padding: 12, marginBottom: 10, fontSize: 11.5, color: "#666" }}>
              ✗ Aucun dossier signé n'a encore été téléversé pour ce salarié.
            </div>
          )}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn btn-y btn-sm"
              onClick={previewWelcomePack}
            >👁 Générer / Voir le dossier</button>
            <button
              className="btn btn-sm"
              onClick={triggerWelcomePackUpload}
              disabled={uploadingWelcomePack}
              title="Uploader le PDF signé « Lu et approuvé »"
            >{uploadingWelcomePack ? "Upload..." : "📎 Uploader le signé"}</button>
          </div>
        </div>

        {/* === BLOC DOCUMENTS (perso + contractuels fusionnés) === */}
        <div className="mb">
          <div className="ct">📁 Documents</div>
          <div style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "8px 12px", marginBottom: 10, fontSize: 11, lineHeight: 1.4 }}>
            💡 Tous les documents du salarié : pièce d'identité, RIB, fiches de paie, attestations...
          </div>
          <DocumentsManager
            context="employee"
            parentId={emp.id}
            contractIds={contracts.map(function (c) { return c.id })}
            mergeContractDocs={true}
          />
        </div>

        {/* === ZONE DANGER === */}
        <div className="mb" style={{ borderTop: "2px solid #EDEDED", paddingTop: 16, marginTop: 8 }}>
          <button
            className="btn btn-red"
            onClick={deleteEmployee}
            disabled={saving}
            style={{ width: "100%" }}
          >🗑 Supprimer définitivement ce salarié</button>
        </div>
      </div>

      {/* === MODAL OFFBOARDING === */}
      {showOffboarding && emp ? (
        <OffboardingWizard
          employee={emp}
          onClose={function () { setShowOffboarding(false) }}
          onSaved={function (msg) {
            setShowOffboarding(false)
            if (props.onSaved) props.onSaved(msg || "Salarié marqué comme parti")
            load()
          }}
        />
      ) : null}

      {/* === MODAL RÉGULARISATION === */}
      {showRegularization && emp ? (
        <RegularizationWizard
          employee={emp}
          onClose={function () { setShowRegularization(false) }}
          onSaved={function (msg) {
            setShowRegularization(false)
            if (props.onSaved) props.onSaved(msg || "Régularisation lancée")
            load()
          }}
        />
      ) : null}

      {/* === MODAL CONTRAT ORIGINEL + AVENANT (mode contrat directement) === */}
      {showOriginalContract && emp ? (
        <RegularizationWizard
          employee={emp}
          initialMode="contrat"
          onClose={function () { setShowOriginalContract(false) }}
          onSaved={function (msg) {
            setShowOriginalContract(false)
            if (props.onSaved) props.onSaved(msg || "Contrat originel + avenant générés")
            load()
          }}
        />
      ) : null}

      {/* === MODAL STOPPAGE WIZARD === */}
      {showStoppageWizard && emp ? (
        <WorkStoppageWizard
          employee={emp}
          existing={editingStoppage}
          onClose={function () {
            setShowStoppageWizard(false)
            setEditingStoppage(null)
          }}
          onSaved={function (msg) {
            setShowStoppageWizard(false)
            setEditingStoppage(null)
            if (props.onSaved) props.onSaved(msg || "Arrêt enregistré")
            load()
          }}
        />
      ) : null}
    </div>
  )
}
