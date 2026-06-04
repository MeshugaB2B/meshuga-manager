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
import AmendmentModal from "./AmendmentModal"
import HistoricalDocumentUploadModal from "./HistoricalDocumentUploadModal"
import SendSignatureModal from "./SendSignatureModal"
import AttestationsCard from "./AttestationsCard"
import PayslipsCard from "./PayslipsCard"
import EmployeeSummary from "./EmployeeSummary"
import {
  NATIONALITES,
  getContractTypeMeta,
  capitalize
} from "./rhConstants"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

// === Helper : initiales "P.N." à partir de prénom + nom (pour patcher les paraphes) ===
function getInitialsFromName(prenom: string, nom: string): string {
  var p = (prenom || "").trim().charAt(0).toUpperCase()
  var n = (nom || "").trim().charAt(0).toUpperCase()
  if (!p && !n) return "?.?."
  return (p || "?") + "." + (n || "?") + "."
}

// Initiales compactes "PN" pour l'avatar (sans points)
function avatarInitials(prenom, nom) {
  var p = (prenom || "").trim()
  var n = (nom || "").trim()
  var res = ((p ? p.charAt(0) : "") + (n ? n.charAt(0) : "")).toUpperCase()
  return res || "?"
}

// Code couleur par poste — aligné sur le hub RhTab
//   Cuisine #CC0066 | Caisse/accueil #005FFF | Salle/équipier #009D3A |
//   Commercial B2B #FF82D7 | Direction/admin #191923 (initiale jaune)
function getPosteMeta(fonction, type) {
  var f = (fonction || "").toLowerCase()
  var t = (type || "").toLowerCase()
  if (f.indexOf("directeur") >= 0 || f.indexOf("directrice") >= 0 || f.indexOf("direction") >= 0
      || f.indexOf("gérant") >= 0 || f.indexOf("gerant") >= 0 || f.indexOf("président") >= 0
      || f.indexOf("president") >= 0 || f.indexOf("administr") >= 0) {
    return { key: "direction", label: "Direction / admin", color: "#191923", textColor: "#FFEB5A" }
  }
  if (f.indexOf("commercial") >= 0 || f.indexOf("b2b") >= 0 || f.indexOf("business") >= 0
      || f.indexOf("développement") >= 0 || f.indexOf("developpement") >= 0 || f.indexOf("vente") >= 0
      || t === "cdi_agent_maitrise" || t === "cdi_cadre") {
    return { key: "commercial", label: "Commercial B2B", color: "#FF82D7", textColor: "#191923" }
  }
  if (f.indexOf("cuisin") >= 0 || f.indexOf("chef") >= 0 || f.indexOf("plonge") >= 0
      || t === "cdi_cuisinier") {
    return { key: "cuisine", label: "Cuisine", color: "#CC0066", textColor: "#FFFFFF" }
  }
  if (f.indexOf("caiss") >= 0 || f.indexOf("vendeu") >= 0 || f.indexOf("accueil") >= 0
      || f.indexOf("comptoir") >= 0 || t === "cdi_caissier") {
    return { key: "caisse", label: "Caisse / accueil", color: "#005FFF", textColor: "#FFFFFF" }
  }
  if (f.indexOf("serveu") >= 0 || f.indexOf("salle") >= 0 || f.indexOf("équipier") >= 0
      || f.indexOf("equipier") >= 0 || f.indexOf("runner") >= 0) {
    return { key: "salle", label: "Salle / équipier", color: "#009D3A", textColor: "#FFFFFF" }
  }
  return { key: "autre", label: "Équipe", color: "#191923", textColor: "#FFEB5A" }
}

// Masque une valeur sensible en conservant un soupçon de format
function maskSensitive(val) {
  var s = String(val || "")
  if (!s) return "—"
  return "•••• •••• " + s.replace(/\s+/g, "").slice(-2)
}

// Ancienneté à partir de la date d'embauche la plus ancienne des contrats
function computeAnciennete(contractsList) {
  var dates = (contractsList || [])
    .map(function (c) { return c.date_debut })
    .filter(function (d) { return !!d })
    .map(function (d) { return new Date(d).getTime() })
    .filter(function (t) { return !isNaN(t) })
  if (dates.length === 0) return { since: null, label: "—" }
  var first = new Date(Math.min.apply(null, dates))
  var now = new Date()
  var months = (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth())
  if (now.getDate() < first.getDate()) months -= 1
  if (months < 0) months = 0
  var y = Math.floor(months / 12)
  var m = months % 12
  var parts = []
  if (y > 0) parts.push(y + " an" + (y > 1 ? "s" : ""))
  if (m > 0) parts.push(m + " mois")
  if (parts.length === 0) parts.push("moins d'un mois")
  return { since: first, label: parts.join(" ") }
}

// === PdfPreviewModal : modal d'aperçu de document avec actions Fermer/Imprimer ===
// Affiche un iframe sur l'URL passée (HTML signé via /api/signatures/view OU PDF
// via signed URL Supabase). Le bouton "Imprimer" essaie d'abord d'utiliser
// le mode=print du viewer custom (qui auto-print et ferme l'onglet), sinon
// fallback sur iframe.contentWindow.print() (peut échouer cross-origin).
function PdfPreviewModal(props: any) {
  var iframeRef = useRef<HTMLIFrameElement>(null)

  if (!props.url) return null

  var handlePrint = function () {
    var url = String(props.url || "")
    if (url.indexOf("/api/signatures/view/") !== -1) {
      var sep = url.indexOf("?") !== -1 ? "&" : "?"
      window.open(url + sep + "mode=print", "_blank")
      return
    }
    try {
      var iframe = iframeRef.current
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
        return
      }
    } catch (e) {
      // ignored, fallback below
    }
    window.open(url, "_blank")
  }

  return (
    <div
      onClick={props.onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(25,25,35,0.78)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={function (e) { e.stopPropagation() }}
        style={{
          background: "#FFFFFF",
          borderRadius: 10,
          width: "min(100%, 1100px)",
          height: "min(100%, 92vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 12px 60px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            background: "#FF82D7",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid #191923",
          }}
        >
          <div style={{ color: "#FFFFFF", fontWeight: 900, fontSize: 15, letterSpacing: ".3px" }}>
            {props.title || "Document"}
          </div>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Fermer"
            style={{
              background: "#FFFFFF",
              color: "#191923",
              border: "2px solid #191923",
              borderRadius: 6,
              width: 32,
              height: 32,
              fontWeight: 900,
              fontSize: 16,
              cursor: "pointer",
              lineHeight: 1,
            }}
          >&times;</button>
        </div>

        <iframe
          ref={iframeRef}
          src={props.url}
          title={props.title || "Document"}
          style={{ flex: 1, width: "100%", border: 0, background: "#F5F5F5" }}
        />

        <div
          style={{
            background: "#FAFAFA",
            padding: "12px 20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid #EDEDED",
          }}
        >
          <button
            type="button"
            onClick={props.onClose}
            style={{
              background: "#FFFFFF",
              color: "#191923",
              border: "2px solid #191923",
              borderRadius: 6,
              padding: "8px 18px",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: 13,
            }}
          >Fermer</button>
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: "#FFEB5A",
              color: "#191923",
              border: "2px solid #191923",
              borderRadius: 6,
              padding: "8px 18px",
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 13,
            }}
          >🖨 Imprimer</button>
        </div>
      </div>
    </div>
  )
}

export default function EmployeeDetail(props) {
  var [emp, setEmp] = useState(null)
  // === Modal PDF preview (ouvre les docs signés dans un overlay) ===
  var [pdfModalUrl, setPdfModalUrl] = useState(null)
  var [pdfModalTitle, setPdfModalTitle] = useState("Document")
  var [empOriginal, setEmpOriginal] = useState(null)
  var [contracts, setContracts] = useState([])
  var [contractDocs, setContractDocs] = useState({})
  var [welcomePackDocs, setWelcomePackDocs] = useState([])
  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [editing, setEditing] = useState(false)
  var [uploadingSignedFor, setUploadingSignedFor] = useState(null)
  var [uploadingAvenantFor, setUploadingAvenantFor] = useState(null)
  var [uploadingWelcomePack, setUploadingWelcomePack] = useState(false)
  var [showOffboarding, setShowOffboarding] = useState(false)
  var [showRegularization, setShowRegularization] = useState(false)
  var [showOriginalContract, setShowOriginalContract] = useState(false)
  var [unmarkingExit, setUnmarkingExit] = useState(false)
  var [stoppages, setStoppages] = useState([])
  var [showStoppageWizard, setShowStoppageWizard] = useState(false)
  var [editingStoppage, setEditingStoppage] = useState(null)
  var [reEmploying, setReEmploying] = useState(false)
  var [generatingAmendmentFor, setGeneratingAmendmentFor] = useState(null)
  // 🔥 Modal pour avenant de MODIFICATION CONTRACTUELLE (différent du bouton "Régénérer avenant" qui gère les clauses RGPD/HACCP)
  var [amendmentModalFor, setAmendmentModalFor] = useState(null)
  // 🔥 Sprint R : modal d'import historique multi-pages + OCR auto
  var [histUploadFor, setHistUploadFor] = useState(null)
  // 🔥 Sprint C2B : modal d'envoi signature électronique
  // payload : { documentType: 'contract'|'amendment', documentId, documentLabel, amendmentData? }
  var [sendSignaturePayload, setSendSignaturePayload] = useState(null)
  var [contractAmendments, setContractAmendments] = useState([])
  var [revealSensitive, setRevealSensitive] = useState(false)
  var signedFileInputRef = useRef(null)
  var avenantSignedInputRef = useRef(null)
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

      // Charge tous les documents type contrat / avenant rattachés aux contrats
      // (contrat_signe = originel uploadé OU contrat signé regénéré
      //  contrat_genere = avenant brouillon non signé
      //  avenant = avenant signé uploadé)
      var resDocs = await supabase
        .from("hr_contract_documents")
        .select("*")
        .in("contract_id", contractIds)
        .in("doc_type", ["contrat_signe", "contrat_genere", "avenant"])
        .order("uploaded_at", { ascending: false })
      var docsByContract = {}
      var allDocs = resDocs.data || []
      for (var k = 0; k < allDocs.length; k++) {
        var doc = allDocs[k]
        if (!docsByContract[doc.contract_id]) docsByContract[doc.contract_id] = []
        docsByContract[doc.contract_id].push(doc)
      }
      setContractDocs(docsByContract)
      
      // 🔥 Charge l'historique des avenants (modifications contractuelles)
      try {
        var resAmends = await supabase
          .from("hr_contract_amendments")
          .select("*")
          .in("contract_id", contractIds)
          .order("amendment_number", { ascending: true })
        if (resAmends.data) setContractAmendments(resAmends.data)
      } catch (e) {
        // non-fatal
      }
    } else {
      setWelcomePackDocs([])
      setContractDocs({})
      setContractAmendments([])
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

  // === Ouvre un document dans le modal PDF via la route API serveur ===
  // La route /api/hr/document/{docId} utilise SUPABASE_SERVICE_ROLE_KEY pour
  // bypass les RLS, trouve le fichier dans le bon bucket (hr-contract-docs,
  // hr-signatures, ou hr-employee-docs), patche les paraphes pour les HTML
  // signés et renvoie le contenu avec le bon Content-Type. C'est beaucoup
  // plus simple et robuste que de tatonner côté client avec les buckets.
  function openContractDoc(doc: any) {
    if (!doc || !doc.id) {
      alert("Document introuvable")
      return
    }
    var docLabel = doc.label || doc.doc_type || "Document"
    var source = doc._source === "employee" ? "employee" : "contract"
    var url = "/api/hr/document/" + doc.id + "?source=" + source
    setPdfModalTitle(docLabel)
    setPdfModalUrl(url)
  }

  // === Génère un avenant pour un contrat (appelle l'API qui sauvegarde aussi en base) ===
  async function generateAmendment(c) {
    if (!c || !emp) return
    if (generatingAmendmentFor) return // déjà en cours
    setGeneratingAmendmentFor(c.id)
    try {
      var dateEmbauche = c.date_embauche || c.date_debut || ""
      var todayIso = new Date().toISOString().slice(0, 10)
      var res = await fetch("/api/hr/update-amendment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: emp.id,
          contract_id: c.id,
          contract_label: "contrat de travail (" + (c.fonction || "CDI") + ")"
            + (dateEmbauche ? (" du " + dateEmbauche) : ""),
          clauses: [
            "confidentialite", "haccp", "tenue_hygiene", "rgpd",
            "mobilite", "deconnexion", "regimes_actualises", "documents_annexes",
          ],
          date_effet: todayIso,
          ville_signature: "Paris",
          date_signature: todayIso,
          save: true,
        }),
      })
      if (!res.ok) {
        var errMsg = "Erreur HTTP " + res.status
        try {
          var errData = await res.json()
          if (errData && errData.error) errMsg = errData.error
        } catch (e) { /* pas de JSON, on garde errMsg */ }
        throw new Error(errMsg)
      }
      // L'API renvoie le HTML — on l'ouvre dans un nouvel onglet pour preview
      var html = await res.text()
      var saved = res.headers.get("X-Saved")
      var blob = new Blob([html], { type: "text/html;charset=utf-8" })
      var url = URL.createObjectURL(blob)
      window.open(url, "_blank")
      if (saved !== "true") {
        // Sauvegarde en base a échoué côté API mais HTML généré quand même
        alert("Avenant généré dans le navigateur, mais la sauvegarde en base a échoué. "
          + "Regarde la console serveur Vercel pour les détails.")
      } else {
        if (props.onSaved) props.onSaved("Avenant généré ✓")
      }
      setGeneratingAmendmentFor(null)
      load()
    } catch (err) {
      setGeneratingAmendmentFor(null)
      alert("Erreur génération avenant : " + (err.message || err))
    }
  }

  // === Construit l'URL du viewer inline pour un document signé ===
  // Encode { k, i, d } en base64url. Cohérent avec /api/signatures/view/[token].
  // opts.mode : "preview" (toolbar) | "print" (auto-déclenche window.print())
  function buildSignedDocViewUrl(opts: any) {
    var payload = { k: opts.entityKind, i: opts.entityId, d: opts.docKind }
    var json = JSON.stringify(payload)
    var b64 = ""
    try {
      // window.btoa: standard pour navigateur
      b64 = window.btoa(unescape(encodeURIComponent(json)))
    } catch (e) {
      b64 = ""
    }
    var token = b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
    var url = "/api/signatures/view/" + token
    if (opts.mode === "print") {
      url += "?mode=print"
    }
    return url
  }

  // 🔥 === Régénère le PDF d'un avenant de modification contractuelle (table hr_contract_amendments) ===
  async function regenerateAmendmentContractuelPdf(amendment: any) {
    // Si l'avenant est signé, on ouvre le viewer inline (avec la signature visible)
    // au lieu de regénérer un brouillon à blanc depuis le builder.
    if (amendment.signed_at || amendment.status === "signed" || amendment.signature_status === "signed") {
      // L'avenant est signé : on cherche le HTML archivé dans hr_contract_documents
      // (doc_type = "avenant") lié à ce contract_id, puis on l'ouvre via openContractDoc
      // (qui patche les paraphes + utilise un Blob URL).
      try {
        var resDocs = await supabase
          .from("hr_contract_documents")
          .select("id, doc_type, label, mime_type, file_path, uploaded_at")
          .eq("contract_id", amendment.contract_id)
          .eq("doc_type", "avenant")
          .order("uploaded_at", { ascending: false })
          .limit(1)
        if (resDocs.error) throw resDocs.error
        var docRow = (resDocs.data && resDocs.data[0]) || null
        if (docRow) {
          docRow._source = "contract"
          openContractDoc(docRow)
          return
        }
        // Fallback : viewer custom (peut afficher "Introuvable" si le HTML signé
        // n'est pas dans hr-signatures, mais on a tenté hr_contract_documents avant)
        var viewerUrl = buildSignedDocViewUrl({ entityKind: "amendment", entityId: amendment.id, docKind: "main" })
        setPdfModalTitle("Avenant signé")
        setPdfModalUrl(viewerUrl)
      } catch (e) {
        alert("Erreur ouverture avenant signé : " + ((e && e.message) || e))
      }
      return
    }
    try {
      var res = await fetch("/api/hr/contracts/" + amendment.contract_id + "/amendment?amendment_id=" + amendment.id, {
        method: "GET"
      })
      if (!res.ok) {
        var errMsg = "Erreur HTTP " + res.status
        try {
          var errData = await res.json()
          if (errData && errData.error) errMsg = errData.error
        } catch (e) {}
        throw new Error(errMsg)
      }
      var html = await res.text()
      // Ouvrir dans un nouvel onglet avec write() pour que les styles s'appliquent
      var win = window.open("", "_blank")
      if (win) {
        win.document.open()
        win.document.write(html)
        win.document.close()
        // Donner le focus et lancer l'impression après un court délai
        setTimeout(function() {
          try { win.focus(); win.print() } catch (e) {}
        }, 500)
      } else {
        alert("Le navigateur a bloqué l'ouverture du PDF. Autorise les pop-ups pour ce site.")
      }
    } catch (err: any) {
      alert("Erreur régénération PDF avenant : " + (err.message || err))
    }
  }

  // 🔥 === Supprime un avenant ET fait le rollback de la modification ===
  async function deleteAmendmentWithRollback(amendment: any) {
    var typeLabels: any = {
      prolongation_duree: "Prolongation de durée",
      augmentation_salaire: "Modification rémunération",
      modification_horaires: "Modification horaires",
      changement_poste: "Changement de poste",
      autre: "Autre modification"
    }
    var label = typeLabels[amendment.amendment_type] || "Avenant"
    
    var rollbackInfo = ""
    if (amendment.changes && typeof amendment.changes === 'object') {
      var fields = Object.keys(amendment.changes)
      if (fields.length > 0) {
        rollbackInfo = "\n\nLe rollback va remettre les anciennes valeurs :\n" + fields.map(function(k) {
          var ch = amendment.changes[k]
          return "  • " + k + " : " + (ch.after == null ? "—" : ch.after) + " → " + (ch.before == null ? "—" : ch.before)
        }).join("\n")
      }
    }
    
    var msg = "Supprimer l'avenant n°" + amendment.amendment_number + " (" + label + ") ?" + rollbackInfo
    if (amendment.amendment_type === "prolongation_duree") {
      msg += "\n\n⚠️ Les vacations supplémentaires ajoutées au-delà de l'ancienne date de fin seront aussi supprimées."
    }
    msg += "\n\nCette action est irréversible."
    
    if (!confirm(msg)) return
    
    try {
      var res = await fetch("/api/hr/contracts/" + amendment.contract_id + "/amendment?amendment_id=" + amendment.id, {
        method: "DELETE"
      })
      if (!res.ok) {
        var errMsg = "Erreur HTTP " + res.status
        try {
          var errData = await res.json()
          if (errData && errData.error) errMsg = errData.error
        } catch (e) {}
        throw new Error(errMsg)
      }
      var data = await res.json()
      var successMsg = "Avenant supprimé ✓"
      if (data.vacations_deleted && data.vacations_deleted > 0) {
        successMsg += " (et " + data.vacations_deleted + " vacation" + (data.vacations_deleted > 1 ? "s" : "") + " supprimée" + (data.vacations_deleted > 1 ? "s" : "") + ")"
      }
      if (props.onSaved) props.onSaved(successMsg)
      load()
    } catch (err: any) {
      alert("Erreur suppression avenant : " + (err.message || err))
    }
  }

  // === Upload de l'avenant SIGNÉ (différent du upload contrat signé) ===
  function triggerAvenantSignedUpload(c) {
    setUploadingAvenantFor(c)
    setTimeout(function () {
      if (avenantSignedInputRef.current) avenantSignedInputRef.current.click()
    }, 50)
  }

  async function handleAvenantSignedFile(file) {
    if (!file || !uploadingAvenantFor) return
    var c = uploadingAvenantFor
    try {
      var ext = (file.name.split(".").pop() || "pdf").toLowerCase()
      var path = c.id + "/avenant/" + Date.now() + "-avenant-signe." + ext
      var up = await supabase.storage.from("hr-contract-docs").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type || undefined
      })
      if (up.error) throw up.error
      var ins = await supabase.from("hr_contract_documents").insert([{
        contract_id: c.id,
        doc_type: "avenant",
        label: "Avenant signé",
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size || null,
        validated_by_user: true,
        uploaded_at: new Date().toISOString()
      }])
      if (ins.error) throw ins.error
      if (props.onSaved) props.onSaved("Avenant signé uploadé ✓")
      setUploadingAvenantFor(null)
      if (avenantSignedInputRef.current) avenantSignedInputRef.current.value = ""
      load()
    } catch (err) {
      alert("Erreur upload : " + (err.message || err))
      setUploadingAvenantFor(null)
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

  // === Synthèse poste / type / ancienneté pour l'en-tête ===
  var sortedForMain = contracts.slice().sort(function (a, b) {
    var aCdi = a.type !== "extra" ? 1 : 0
    var bCdi = b.type !== "extra" ? 1 : 0
    if (aCdi !== bCdi) return bCdi - aCdi
    var aCur = a.is_current === true ? 1 : 0
    var bCur = b.is_current === true ? 1 : 0
    if (aCur !== bCur) return bCur - aCur
    return (b.created_at || "").localeCompare(a.created_at || "")
  })
  var mainC = sortedForMain[0] || null
  var poste = getPosteMeta(mainC ? mainC.fonction : "", mainC ? mainC.type : "")
  var typeMeta = mainC ? getContractTypeMeta(mainC.type || "extra") : null
  var anciennete = computeAnciennete(contracts)

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

        {/* Hidden file input pour l'avenant signé */}
        <input
          ref={avenantSignedInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={function (e) {
            var f = e.target.files && e.target.files[0]
            if (f) handleAvenantSignedFile(f)
          }}
        />

        {/* === HEADER === */}
        <div className="mh" style={{ position: "sticky", top: 0, zIndex: 10, background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {/* Avatar couleur poste */}
              <div style={{
                width: 54, height: 54, borderRadius: "50%", flexShrink: 0,
                background: poste.color, color: poste.textColor,
                border: "2.5px solid #191923", boxShadow: "3px 3px 0 #191923",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 20, letterSpacing: ".5px",
                fontFamily: "'Arial Narrow', Arial, sans-serif"
              }}>{avatarInitials(emp.prenom, emp.nom)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="mt" style={{ fontFamily: "Yellowtail, cursive", fontSize: 28, color: "#FF82D7", lineHeight: 1.05 }}>
                  {emp.prenom} {(emp.nom || "").toUpperCase()}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                  <span style={{
                    background: poste.color, color: poste.textColor, fontSize: 9, fontWeight: 900,
                    textTransform: "uppercase", letterSpacing: ".5px", padding: "2px 8px",
                    borderRadius: 4, border: "1.5px solid #191923"
                  }}>{(mainC && mainC.fonction) ? mainC.fonction : poste.label}</span>
                  {typeMeta ? (
                    <span style={{
                      background: typeMeta.color, color: "#191923", fontSize: 9, fontWeight: 900,
                      textTransform: "uppercase", letterSpacing: ".5px", padding: "2px 8px",
                      borderRadius: 4, border: "1.5px solid #191923"
                    }}>{typeMeta.icon} {typeMeta.label.replace("CDI ", "")}</span>
                  ) : null}
                  {anciennete.since ? (
                    <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.65 }}>
                      🗓 {anciennete.label} d&apos;ancienneté
                    </span>
                  ) : null}
                  {emp.date_sortie ? (
                    <span style={{
                      background: "#191923", color: "#FFEB5A", fontFamily: "'Arial Narrow', Arial",
                      fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 4
                    }}>PARTI {fmtDate(emp.date_sortie)}</span>
                  ) : null}
                </div>
              </div>
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
              className="btn"
              onClick={requestLeave}
              disabled={!emp.email}
              title={emp.email ? "Envoyer la demande de planification des congés" : "Le salarié doit avoir une adresse email"}
            >📅 Demander les congés</button>
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

        {/* === BLOC SYNTHÈSE RH (indicateurs unifiés, reliés) === */}
        {emp ? <EmployeeSummary employeeId={emp.id} /> : null}

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
              {/* Coordonnées */}
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5, marginBottom: 6 }}>Coordonnées</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
                <div><b>Civilité :</b> {emp.civilite || "—"}</div>
                <div><b>Nationalité :</b> {emp.nationalite ? capitalize(emp.nationalite) : "—"}</div>
                <div><b>Né(e) le :</b> {fmtDate(emp.date_naissance)}</div>
                <div><b>Lieu de naissance :</b> {emp.lieu_naissance || "—"}</div>
                <div style={{ gridColumn: "1 / span 2" }}>
                  <b>Adresse :</b> {emp.adresse || "—"}
                  {(emp.code_postal || emp.ville) ? (<span> · {emp.code_postal || ""} {emp.ville || ""}</span>) : null}
                </div>
                <div>
                  <b>Email :</b> {emp.email
                    ? <a href={"mailto:" + emp.email} style={{ color: "#FF82D7" }}>{emp.email}</a>
                    : "—"}
                </div>
                <div>
                  <b>Téléphone :</b> {emp.telephone
                    ? (revealSensitive
                        ? <a href={"tel:" + emp.telephone} style={{ color: "#FF82D7" }}>{emp.telephone}</a>
                        : <span style={{ letterSpacing: 1 }}>{maskSensitive(emp.telephone)}</span>)
                    : "—"}
                </div>
              </div>

              {/* Administratif (sensible — masqué par défaut) */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 6px" }}>
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, opacity: 0.5 }}>Administratif</span>
                <button
                  className="btn btn-sm"
                  onClick={function () { setRevealSensitive(!revealSensitive) }}
                  title="Afficher / masquer les données sensibles"
                >{revealSensitive ? "🙈 Masquer" : "👁 Afficher"}</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 13 }}>
                <div>
                  <b>N° Sécu sociale :</b>{" "}
                  {emp.num_secu
                    ? (revealSensitive ? emp.num_secu : <span style={{ letterSpacing: 1 }}>{maskSensitive(emp.num_secu)}</span>)
                    : "—"}
                </div>
                <div></div>
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
          <div className="ct">📄 Parcours contractuel ({contracts.length})</div>
          {contracts.length === 0 ? (
            <div style={{ padding: 16, background: "#FAFAFA", borderRadius: 6, textAlign: "center", color: "#999", fontStyle: "italic", fontSize: 12 }}>
              Aucun contrat. Clique sur "+ Nouveau contrat" pour en créer un.
            </div>
          ) : (
            <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 14, marginTop: 6 }}>
              {contracts.slice().sort(function (a, b) {
                var aCur = a.is_current === true ? 1 : 0
                var bCur = b.is_current === true ? 1 : 0
                if (aCur !== bCur) return bCur - aCur
                var da = new Date(a.date_debut || a.date_embauche || a.created_at || 0).getTime()
                var db = new Date(b.date_debut || b.date_embauche || b.created_at || 0).getTime()
                return db - da
              }).map(function (c) {
                var meta = getContractTypeMeta(c.type || "extra")
                var sc = statusColors[c.status] || statusColors.draft
                var isCurrent = c.is_current === true
                var railColor = isCurrent ? "#FF82D7" : (c.status === "archived" ? "#BBBBBB" : "#191923")
                return (
                  <div key={c.id} style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                    {/* Rail de la frise */}
                    <div style={{ position: "relative", width: 18, flexShrink: 0 }}>
                      <div style={{ position: "absolute", left: 7, top: 6, bottom: -14, width: 3, background: "#EBEBEB" }}></div>
                      <div style={{ position: "absolute", left: 1, top: 6, width: 15, height: 15, borderRadius: "50%", background: railColor, border: "2.5px solid #191923", boxShadow: "1px 1px 0 #191923" }}></div>
                    </div>
                    {/* Encart contrat */}
                    <div style={{
                      flex: 1, minWidth: 0,
                      background: "#FFFFFF",
                      border: isCurrent ? "2.5px solid #FF82D7" : "2px solid #191923",
                      borderRadius: 8,
                      padding: 12,
                      boxShadow: isCurrent ? "3px 3px 0 #FF82D7" : "3px 3px 0 #191923"
                    }}>
                      {isCurrent ? (
                        <div style={{ display: "inline-block", background: "#FF82D7", color: "#191923", fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".5px", padding: "2px 8px", borderRadius: 4, border: "1.5px solid #191923", marginBottom: 8 }}>● Contrat en cours</div>
                      ) : null}
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

                    {/* === CHRONOLOGIE DU CONTRAT (dates de modification en clair) === */}
                    {(function () {
                      var docs = contractDocs[c.id] || []
                      var contratOriginel = docs.filter(function (d) { return d.doc_type === "contrat_signe" })[0]
                      var avenantBrouillonDoc = docs.filter(function (d) {
                        return d.doc_type === "contrat_genere" && (d.label || "").toLowerCase().indexOf("avenant") >= 0
                      })[0]
                      var signedAvenantDocs = docs.filter(function (d) { return d.doc_type === "avenant" }).sort(function (a, b) {
                        return new Date(b.document_date || b.uploaded_at).getTime() - new Date(a.document_date || a.uploaded_at).getTime()
                      })
                      var amds = (contractAmendments || []).filter(function (a) { return a.contract_id === c.id })
                      var draftAmendment = amds.filter(function (a) { return !a.signed_at && a.status !== "signed" })
                        .sort(function (a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() })[0]
                      var signedAmendments = amds.filter(function (a) { return a.signed_at || a.status === "signed" })
                      var isGenerating = generatingAmendmentFor === c.id

                      var typeLabels = {
                        prolongation_duree: { icon: "📅", label: "Prolongation de durée" },
                        augmentation_salaire: { icon: "💰", label: "Modification de la rémunération" },
                        modification_horaires: { icon: "🕐", label: "Modification des horaires" },
                        changement_poste: { icon: "👔", label: "Changement de poste" },
                        regularisation_welcome_pack: { icon: "⚖", label: "Actualisation contractuelle" },
                        autre: { icon: "📝", label: "Modification du contrat" }
                      }
                      var fmtChip = function (d) {
                        if (!d) return "—"
                        var dt = new Date(d)
                        if (isNaN(dt.getTime())) return "—"
                        return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                      }

                      // === Construction des événements datés ===
                      var events = []
                      // 1) Avenant en cours (brouillon / non signé)
                      if (draftAmendment || avenantBrouillonDoc) {
                        var dts = draftAmendment ? (draftAmendment.effective_date || draftAmendment.created_at) : (avenantBrouillonDoc ? avenantBrouillonDoc.uploaded_at : null)
                        var dlabel = draftAmendment ? ((typeLabels[draftAmendment.amendment_type] || typeLabels.autre).label) : "Avenant en cours"
                        events.push({ ts: dts, kind: "draft", amendment: draftAmendment || null, brouillonDoc: avenantBrouillonDoc || null, title: dlabel, num: draftAmendment ? draftAmendment.amendment_number : null })
                      }
                      // 2) Avenants signés (enregistrements structurés)
                      signedAmendments.forEach(function (a) {
                        events.push({ ts: a.signature_date || a.effective_date || a.created_at, kind: "signed", amendment: a, title: (typeLabels[a.amendment_type] || typeLabels.autre).label, num: a.amendment_number })
                      })
                      // 3) Avenants signés "scan" sans contrepartie structurée (anciens imports papier)
                      if (signedAmendments.length === 0) {
                        signedAvenantDocs.forEach(function (d) {
                          events.push({ ts: d.document_date || d.uploaded_at, kind: "scan", doc: d, title: "Avenant signé (document)" })
                        })
                      }
                      // 4) Contrat fondateur (le plus ancien)
                      events.push({ ts: (c.date_embauche || c.date_debut), kind: "contract", doc: contratOriginel || null, title: "Signature du contrat" })

                      // Tri antéchronologique (le plus récent en haut)
                      events.sort(function (a, b) {
                        var ta = a.ts ? new Date(a.ts).getTime() : 0
                        var tb = b.ts ? new Date(b.ts).getTime() : 0
                        return tb - ta
                      })

                      return (
                        <div style={{ background: "#FAFAFA", border: "1px solid #EBEBEB", borderRadius: 6, padding: 10, marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5, color: "#888" }}>🗓 Chronologie du contrat</div>
                            {(!draftAmendment && !avenantBrouillonDoc) ? (
                              <button className="btn btn-sm btn-y" disabled={isGenerating}
                                onClick={function () { generateAmendment(c) }}
                                title="Générer un avenant de mise à jour (clauses HACCP, RGPD, etc.)"
                              >{isGenerating ? "⏳..." : "📝 Générer un avenant"}</button>
                            ) : null}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {events.map(function (ev, idx) {
                              var isLast = idx === events.length - 1
                              var dotColor = ev.kind === "draft" ? "#FF82D7" : (ev.kind === "contract" ? "#191923" : "#16A34A")
                              // Statut signature de l'avenant en cours
                              var sigStatus = (ev.amendment && ev.amendment.signature_status) ? ev.amendment.signature_status : "unsent"
                              var canSend = !!(ev.amendment && !ev.amendment.signed_at && (sigStatus === "unsent" || sigStatus === "expired" || sigStatus === "declined"))
                              var amdDocLabel = ev.amendment ? ("Avenant n°" + ev.amendment.amendment_number + " — " + ev.title) : "Avenant"
                              var draftBadge = null
                              if (ev.kind === "draft") {
                                if (sigStatus === "sent") draftBadge = { bg: "#FFEB5A", color: "#191923", text: "📧 Envoyé" }
                                else if (sigStatus === "viewed") draftBadge = { bg: "#FFEB5A", color: "#191923", text: "👁 Vu" }
                                else draftBadge = { bg: "#FFF8E1", color: "#191923", text: "à signer" }
                              }
                              return (
                                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                  {/* Date en clair */}
                                  <div style={{ flexShrink: 0, width: 80, textAlign: "right", paddingTop: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: "#191923" }}>{fmtChip(ev.ts)}</div>
                                  </div>
                                  {/* Rail */}
                                  <div style={{ position: "relative", width: 14, flexShrink: 0, alignSelf: "stretch" }}>
                                    <div style={{ position: "absolute", left: 5, top: 4, bottom: 0, width: 2, background: isLast ? "transparent" : "#DDD" }}></div>
                                    <div style={{ position: "absolute", left: 0, top: 3, width: 12, height: 12, borderRadius: "50%", background: dotColor, border: "2px solid #191923" }}></div>
                                  </div>
                                  {/* Corps de l'événement */}
                                  <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 12 }}>
                                    {ev.kind === "draft" ? (
                                      <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                          <span style={{ fontSize: 12, fontWeight: 900, color: "#FF82D7" }}>
                                            📝 {ev.num ? ("Avenant n°" + ev.num + " — ") : "Avenant — "}{ev.title}
                                          </span>
                                          {draftBadge ? (
                                            <span style={{ fontSize: 10, fontWeight: 700, background: draftBadge.bg, color: draftBadge.color, padding: "2px 6px", borderRadius: 3 }}>{draftBadge.text}</span>
                                          ) : null}
                                        </div>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                                          {ev.brouillonDoc ? (
                                            <button className="btn btn-sm btn-y" onClick={function () { openContractDoc(ev.brouillonDoc) }}>📄 Ouvrir</button>
                                          ) : null}
                                          {canSend ? (
                                            <button className="btn btn-sm" style={{ background: "#FF82D7", color: "#FFFFFF", border: "1.5px solid #FF82D7", fontWeight: 700 }}
                                              onClick={function () { setSendSignaturePayload({ documentType: "amendment", documentId: ev.amendment.id, documentLabel: amdDocLabel }) }}
                                              title="Envoyer cet avenant au salarié pour signature électronique"
                                            >📧 Envoyer pour signature</button>
                                          ) : null}
                                          <button className="btn btn-sm" onClick={function () { triggerAvenantSignedUpload(c) }}
                                            title="Uploader le PDF/scan de l'avenant signé (signature papier)"
                                          >📥 Uploader signé</button>
                                          <button className="btn btn-sm" disabled={isGenerating}
                                            onClick={function () { if (confirm("Régénérer l'avenant ? La version brouillon actuelle sera remplacée.")) generateAmendment(c) }}
                                            title="Régénérer le brouillon (les avenants signés ne sont pas touchés)"
                                          >{isGenerating ? "⏳..." : "🔄 Régénérer"}</button>
                                          {(ev.amendment && !ev.amendment.signed_at) ? (
                                            <button className="btn btn-sm btn-red" onClick={function () { deleteAmendmentWithRollback(ev.amendment) }}
                                              title="Supprimer l'avenant et annuler la modification (rollback)"
                                            >🗑️</button>
                                          ) : null}
                                        </div>
                                      </div>
                                    ) : null}

                                    {ev.kind === "signed" ? (
                                      <div>
                                        <div style={{ fontSize: 12, fontWeight: 900, color: "#16A34A" }}>
                                          ✅ {ev.num ? ("Avenant n°" + ev.num + " — ") : ""}{ev.title}
                                        </div>
                                        {(ev.amendment && ev.amendment.motif) ? (
                                          <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{ev.amendment.motif}</div>
                                        ) : null}
                                        {(ev.amendment && ev.amendment.changes) ? (
                                          <div style={{ fontSize: 10, color: "#888", marginTop: 2, fontFamily: "monospace" }}>
                                            {Object.keys(ev.amendment.changes).map(function (k) {
                                              var ch = ev.amendment.changes[k]
                                              return k + " : " + (ch.before == null ? "—" : ch.before) + " → " + (ch.after == null ? "—" : ch.after)
                                            }).join(" · ")}
                                          </div>
                                        ) : null}
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                                          <button className="btn btn-sm btn-y" onClick={function () { regenerateAmendmentContractuelPdf(ev.amendment) }}
                                            title="Régénérer le PDF de l'avenant et l'ouvrir"
                                          >🖨️ PDF</button>
                                        </div>
                                      </div>
                                    ) : null}

                                    {ev.kind === "scan" ? (
                                      <div>
                                        <div style={{ fontSize: 12, fontWeight: 900, color: "#16A34A" }}>✅ {ev.title}</div>
                                        {ev.doc.document_description ? (
                                          <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>{ev.doc.document_description}</div>
                                        ) : null}
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                                          <button className="btn btn-sm btn-y" onClick={function () { openContractDoc(ev.doc) }}>📄 Ouvrir</button>
                                        </div>
                                      </div>
                                    ) : null}

                                    {ev.kind === "contract" ? (
                                      <div>
                                        <div style={{ fontSize: 12, fontWeight: 900, color: "#191923" }}>📜 {ev.title}</div>
                                        <div style={{ fontSize: 10, color: "#888", marginTop: 1 }}>
                                          {c.fonction ? c.fonction : ""}
                                          {(c.type !== "extra" && c.salaire_brut_mensuel) ? (" · " + c.salaire_brut_mensuel + " €/mois") : (c.taux_horaire_brut ? (" · " + c.taux_horaire_brut + " €/h") : "")}
                                        </div>
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                                          {ev.doc ? (
                                            <button className="btn btn-sm btn-y" onClick={function () { openContractDoc(ev.doc) }}>📄 Ouvrir l&apos;original</button>
                                          ) : (
                                            <button className="btn btn-sm btn-y" onClick={function () { if (props.onContractPreview) props.onContractPreview(c) }}>👁 Voir / Imprimer</button>
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    {/* === BOUTONS D'ACTION CONTEXTUELS === */}
                    {(function () {
                      var docs = contractDocs[c.id] || []
                      var hasContratSigne = docs.some(function (d) { return d.doc_type === "contrat_signe" })
                      return (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {/* Voir/Imprimer = regénère un PDF Meshuga, utile seulement si pas de contrat signé attaché */}
                          {!hasContratSigne ? (
                            <button
                              className="btn btn-sm btn-y"
                              onClick={function () { if (props.onContractPreview) props.onContractPreview(c) }}
                            >👁 Voir / Imprimer</button>
                          ) : null}
                          {c.status === "draft" || c.status === "finalized" ? (
                            <button
                              className="btn btn-sm"
                              onClick={function () { if (props.onContractEdit) props.onContractEdit(c) }}
                            >✏️ Éditer</button>
                          ) : null}
                          {!hasContratSigne ? (
                            <button
                              className="btn btn-sm"
                              onClick={function () { triggerSignedUpload(c) }}
                            >📥 Uploader contrat signé</button>
                          ) : null}
                          {/* 🔥 Bouton "Modifier le contrat" = avenant de MODIFICATION CONTRACTUELLE */}
                          {/* (Distinct de l'avenant de mise à jour des clauses RGPD/HACCP qui est dans la section suivante) */}
                          <button
                            className="btn btn-sm"
                            style={{ background: "#FFEB5A", border: "2px solid #191923", fontWeight: 900 }}
                            onClick={function () { setAmendmentModalFor(c) }}
                            title="Faire un avenant pour modifier le contrat (durée, salaire, horaires, fonction...)"
                          >🛠️ Modifier le contrat</button>
                          {/* 🔥 Sprint R : Bouton "Importer doc historique" — pour avenants/contrats déjà signés en papier */}
                          <button
                            className="btn btn-sm"
                            style={{ background: "rgba(255,130,215,0.2)", border: "1.5px solid #FF82D7", color: "#191923", fontWeight: 700 }}
                            onClick={function () { setHistUploadFor(c) }}
                            title="Importer un avenant ou autre document historique (photos multi-pages → PDF + OCR auto)"
                          >📥 Importer doc historique</button>
                          <button
                            className="btn btn-sm btn-red"
                            onClick={function () { deleteContract(c) }}
                            title="Supprimer ce contrat"
                          >×</button>
                        </div>
                      )
                    })()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>


        {/* === BLOC PAIE & CONGÉS (bulletins importés de Silae) === */}
        {emp ? <PayslipsCard employeeId={emp.id} /> : null}

        {/* === BLOC CONFORMITÉ === */}
        <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
          <div className="ct">✅ Conformité</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
            <div style={{ border: "2px solid #191923", borderRadius: 6, padding: 10, background: "#FFFFFF", boxShadow: "2px 2px 0 #191923" }}>
              <div style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1, opacity: 0.55 }}>Visite médicale</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>À suivre</div>
              <div style={{ fontSize: 10, opacity: 0.6 }}>EFFICIENCE — médecine du travail</div>
            </div>
          </div>
        </div>

        {/* === BLOC ATTESTATION HYGIÈNE (signature électronique du guide) === */}
        {emp ? <AttestationsCard employeeId={emp.id} /> : null}

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
        {/* Affiché uniquement tant qu'il n'est pas signé. Une fois signé, le dossier
            apparaît dans le bloc « Documents » en bas (catégorie dossier_bienvenue_signe). */}
        {welcomePackDocs.length === 0 ? (
          <div className="mb" style={{ borderBottom: "2px solid #EDEDED", paddingBottom: 16 }}>
            <div className="ct">📋 Dossier de bienvenue</div>
            <div style={{ background: "#FAFAFA", border: "1px dashed #BBBBBB", borderRadius: 6, padding: 12, marginBottom: 10, fontSize: 11.5, color: "#666" }}>
              ✗ Pas encore signé. Génère le dossier, fais-le signer, puis téléverse-le &mdash; il sera ensuite classé dans les Documents ci-dessous.
            </div>
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
        ) : null}

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
            onOpenDoc={openContractDoc}
          />
        </div>
      </div>

      {/* === MODAL PDF PREVIEW (ouvre les docs signés en overlay) === */}
      <PdfPreviewModal
        url={pdfModalUrl}
        title={pdfModalTitle}
        onClose={function () {
          // Si c'est un Blob URL (HTML patche), on le revoque pour libere la memoire
          if (pdfModalUrl && String(pdfModalUrl).indexOf("blob:") === 0) {
            try { URL.revokeObjectURL(pdfModalUrl) } catch (e) { /* ignore */ }
          }
          setPdfModalUrl(null)
        }}
      />

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

      {/* 🔥 === MODAL AVENANT (modification contractuelle) === */}
      {amendmentModalFor && emp ? (
        <AmendmentModal
          contract={amendmentModalFor}
          employee={emp}
          onClose={function () { setAmendmentModalFor(null) }}
          onSaved={function (msg) {
            setAmendmentModalFor(null)
            if (props.onSaved) props.onSaved(msg)
            load()
          }}
        />
      ) : null}

      {/* 🔥 Sprint R === MODAL IMPORT HISTORIQUE (multi-photos + OCR auto) === */}
      {histUploadFor && emp ? (
        <HistoricalDocumentUploadModal
          contractId={histUploadFor.id}
          contractLabel={
            (histUploadFor.fonction || "Contrat") + " — " +
            (emp.prenom || "") + " " + (emp.nom || "")
          }
          onClose={function () { setHistUploadFor(null) }}
          onSuccess={function (msg) {
            setHistUploadFor(null)
            if (props.onSaved) props.onSaved(msg)
            load()
          }}
        />
      ) : null}

      {/* 🔥 Sprint C2B === MODAL ENVOI POUR SIGNATURE ÉLECTRONIQUE === */}
      {sendSignaturePayload && emp ? (
        <SendSignatureModal
          documentType={sendSignaturePayload.documentType}
          documentId={sendSignaturePayload.documentId}
          documentLabel={sendSignaturePayload.documentLabel}
          employee={{
            id: emp.id,
            prenom: emp.prenom || "",
            nom: emp.nom || "",
            email: emp.email || null,
            telephone: emp.telephone || null,
            civilite: emp.civilite || null,
            welcome_pack_signed: emp.welcome_pack_signed === true,
          }}
          onClose={function () { setSendSignaturePayload(null) }}
          onSent={function (msg) {
            setSendSignaturePayload(null)
            if (props.onSaved) props.onSaved(msg)
            load()
          }}
        />
      ) : null}
    </div>
  )
}
