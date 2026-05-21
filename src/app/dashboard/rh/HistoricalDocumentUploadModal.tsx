"use client"
// ============================================================
// HistoricalDocumentUploadModal.tsx
// ============================================================
// Modal pour importer un document RH historique (avenant, contrat
// originel, fiche paie, etc.) avec :
//   - upload multi-pages (chaque page = 1 photo)
//   - assemblage automatique en PDF
//   - OCR automatique via Claude Vision
//   - récupération auto de la date de signature + motif depuis l'OCR
//   - patch des champs document_date et document_description
//
// Sprint Y1 — Phase R — Sprint R2
//
// Workflow JS :
//   1. Edward sélectionne 1 à N photos (ou un PDF)
//   2. Clic "Uploader & analyser"
//   3. POST /api/hr/upload-pages avec doc_type='avenant' + toutes les photos
//        → upload + assemblage PDF + insertion hr_contract_documents
//   4. POST /api/hr/extract-contract avec le doc_id retourné
//        → OCR → ocr_extraction stocké
//   5. PATCH le doc avec document_date = ocr.contract.date_signature
//      et document_description = ocr.contract.motif
//   6. props.onSuccess() → refresh de la liste
//
// Charte Meshuga : Yellowtail titre + Arial Narrow body, jaune/rose,
// jamais de fond sombre pour texte.
// ============================================================

import { useState, useRef } from "react"

interface Props {
  contractId: string
  contractLabel: string  // ex: "CDI Cuisinier - Sivanathan Selvakumar"
  onClose: () => void
  onSuccess: (message: string) => void
}

// Types de documents historiques supportés
var DOC_TYPE_OPTIONS = [
  { value: "avenant", label: "📝 Avenant" },
  { value: "contrat_signe", label: "📜 Contrat signé (originel)" },
  { value: "fiche_paie", label: "💰 Fiche de paie" },
  { value: "solde_tout_compte", label: "📋 Solde de tout compte" },
  { value: "certificat_travail", label: "🏷 Certificat de travail" },
  { value: "attestation_france_travail", label: "🏢 Attestation France Travail" },
  { value: "lettre_demission", label: "✉️ Lettre de démission" },
  { value: "lettre_licenciement", label: "✉️ Lettre de licenciement" },
  { value: "rupture_conv", label: "🤝 Rupture conventionnelle" },
  { value: "dossier_bienvenue_signe", label: "📘 Dossier de bienvenue signé" },
  { value: "autre", label: "📎 Autre document" },
]

export default function HistoricalDocumentUploadModal(props: Props) {
  var [docType, setDocType] = useState("avenant")
  var [files, setFiles] = useState([])
  var [previews, setPreviews] = useState([])
  var [phase, setPhase] = useState("idle")  // idle | uploading | extracting | done | error
  var [progress, setProgress] = useState("")
  var [errorMsg, setErrorMsg] = useState("")
  var [extracted, setExtracted] = useState(null)
  var fileInputRef = useRef(null)

  // ====== Sélection des fichiers ======
  var onFilesSelected = function (e) {
    var fl = e.target.files
    if (!fl || fl.length === 0) return
    var arr = []
    var prevArr = []
    for (var i = 0; i < fl.length; i++) {
      var f = fl[i]
      arr.push(f)
      // Génère un preview si image
      if (f.type && f.type.indexOf("image/") === 0) {
        prevArr.push(URL.createObjectURL(f))
      } else {
        prevArr.push(null) // PDF ou autre
      }
    }
    setFiles(arr)
    setPreviews(prevArr)
    setPhase("idle")
    setErrorMsg("")
  }

  // ====== Réordonner les fichiers (drag-and-drop simplifié : monter/descendre) ======
  var moveFile = function (idx, direction) {
    var newIdx = idx + direction
    if (newIdx < 0 || newIdx >= files.length) return
    var newFiles = files.slice()
    var newPreviews = previews.slice()
    var tmpF = newFiles[idx]
    newFiles[idx] = newFiles[newIdx]
    newFiles[newIdx] = tmpF
    var tmpP = newPreviews[idx]
    newPreviews[idx] = newPreviews[newIdx]
    newPreviews[newIdx] = tmpP
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  var removeFile = function (idx) {
    var newFiles = files.slice()
    var newPreviews = previews.slice()
    newFiles.splice(idx, 1)
    newPreviews.splice(idx, 1)
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  // ====== Workflow principal : upload → OCR → patch ======
  var runWorkflow = async function () {
    if (files.length === 0) {
      setErrorMsg("Sélectionne au moins 1 photo ou PDF")
      return
    }
    setErrorMsg("")

    // === 1. Upload + assemblage PDF ===
    setPhase("uploading")
    setProgress("📤 Upload des " + files.length + " page(s)...")

    var formData = new FormData()
    formData.append("contract_id", props.contractId)
    formData.append("doc_type", docType)
    formData.append("assemble_pdf", "1")
    for (var i = 0; i < files.length; i++) {
      formData.append("file_" + i, files[i])
    }

    var docId = null
    try {
      var resUp = await fetch("/api/hr/upload-pages", {
        method: "POST",
        body: formData,
      })
      var dataUp = await resUp.json()
      if (!resUp.ok) {
        throw new Error(dataUp.error || "Erreur upload")
      }
      docId = dataUp.document && dataUp.document.id
      if (!docId) {
        throw new Error("Réponse upload invalide")
      }
    } catch (e) {
      setPhase("error")
      setErrorMsg("Échec upload : " + (e.message || e))
      return
    }

    // === 2. OCR Claude Vision ===
    setPhase("extracting")
    setProgress("🔍 Analyse du document par Claude Vision (peut prendre 30 sec à 2 min)...")

    var ocrData = null
    try {
      var resOcr = await fetch("/api/hr/extract-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_doc_id: docId }),
      })
      ocrData = await resOcr.json()
      if (!resOcr.ok) {
        throw new Error(ocrData.error || "Erreur OCR")
      }
    } catch (e) {
      // OCR a échoué mais le doc est upload — on continue sans bloquer
      setPhase("done")
      setProgress("")
      props.onSuccess(
        "Document uploadé ✓ — OCR a échoué (" + (e.message || e) + ") ; tu peux saisir les infos manuellement"
      )
      return
    }

    // === 3. PATCH document_date + description depuis OCR ===
    var extraction = ocrData.extraction || {}
    var signatureDate = null
    var description = null

    // Date : on prend date_signature en priorité, puis date_debut, puis date_embauche
    if (extraction.contract) {
      signatureDate = extraction.contract.date_signature 
        || extraction.contract.date_debut 
        || extraction.contract.date_embauche 
        || null
      // Description : motif d'avenant + type brut
      if (docType === "avenant") {
        description = extraction.contract.motif || extraction.contract.type_brut || null
      } else {
        description = extraction.contract.type_brut || extraction.contract.fonction || null
      }
    }
    // Pour fiche de paie : period_month
    if (docType === "fiche_paie" && extraction.period_month) {
      signatureDate = extraction.period_month + "-01"
    }
    // Pour solde / certificat / lettres : exit_info.date_sortie
    if (extraction.exit_info && extraction.exit_info.date_sortie) {
      if (!signatureDate) signatureDate = extraction.exit_info.date_sortie
      if (!description && extraction.exit_info.motif_sortie) description = extraction.exit_info.motif_sortie
    }

    setExtracted({
      signatureDate: signatureDate,
      description: description,
      confidence: extraction.meta ? extraction.meta.confidence : null,
      notes: extraction.meta ? extraction.meta.notes : null,
      docId: docId,
    })

    // PATCH si on a au moins une info à mettre
    if (signatureDate || description) {
      setProgress("💾 Sauvegarde des métadonnées extraites...")
      try {
        var resPatch = await fetch("/api/hr/update-document-meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc_id: docId,
            document_date: signatureDate,
            document_description: description,
          }),
        })
        if (!resPatch.ok) {
          // Pas bloquant
          console.warn("Patch métadonnées échec")
        }
      } catch (e) {
        console.warn("Patch métadonnées exception", e)
      }
    }

    setPhase("done")
    setProgress("")
    props.onSuccess(
      "Document importé & analysé ✓" +
      (signatureDate ? " — Date détectée : " + signatureDate : "") +
      (description ? " — Motif : " + description : "")
    )
  }

  // ====== UI ======
  var disabled = phase === "uploading" || phase === "extracting"

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={function () { if (!disabled) props.onClose() }}
    >
      <div
        onClick={function (e) { e.stopPropagation() }}
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          maxWidth: 720,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          fontFamily: "Arial Narrow, Arial, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #EEEEEE", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Yellowtail, cursive", color: "#FF82D7", fontSize: 28, lineHeight: 1 }}>
              Importer un document historique
            </div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              {props.contractLabel}
            </div>
          </div>
          {!disabled ? (
            <button
              onClick={props.onClose}
              style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#666" }}
              aria-label="Fermer"
            >×</button>
          ) : null}
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {phase === "done" ? (
            // === Écran de succès avec récap OCR ===
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#191923", marginBottom: 16 }}>
                ✅ Document importé avec succès
              </div>
              {extracted ? (
                <div style={{ background: "rgba(255,235,90,0.25)", borderLeft: "4px solid #FFEB5A", padding: "14px 18px", borderRadius: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#191923", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    🔍 Informations détectées par OCR
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                    {extracted.signatureDate ? (
                      <div><strong>Date détectée :</strong> {extracted.signatureDate}</div>
                    ) : null}
                    {extracted.description ? (
                      <div><strong>Description :</strong> {extracted.description}</div>
                    ) : null}
                    {extracted.confidence ? (
                      <div><strong>Confiance OCR :</strong> {extracted.confidence === "high" ? "Élevée ✓" : extracted.confidence === "medium" ? "Moyenne ⚠" : "Faible ⚠⚠"}</div>
                    ) : null}
                    {extracted.notes ? (
                      <div style={{ fontStyle: "italic", color: "#666", marginTop: 6 }}>{extracted.notes}</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
                <button
                  onClick={props.onClose}
                  style={{
                    background: "#FF82D7",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >Fermer</button>
              </div>
            </div>
          ) : (
            // === Écran principal ===
            <div>
              {/* Type de document */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#191923", marginBottom: 6 }}>
                  Type de document
                </label>
                <select
                  value={docType}
                  onChange={function (e) { setDocType(e.target.value) }}
                  disabled={disabled}
                  style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #DDD", borderRadius: 6, fontSize: 14, background: "#FFFFFF" }}
                >
                  {DOC_TYPE_OPTIONS.map(function (opt) {
                    return <option key={opt.value} value={opt.value}>{opt.label}</option>
                  })}
                </select>
              </div>

              {/* Bouton sélection fichiers */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#191923", marginBottom: 6 }}>
                  Pages du document {files.length > 0 ? "(" + files.length + " sélectionnée" + (files.length > 1 ? "s" : "") + ")" : ""}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={onFilesSelected}
                  disabled={disabled}
                  style={{ display: "none" }}
                />
                <button
                  onClick={function () { if (fileInputRef.current) fileInputRef.current.click() }}
                  disabled={disabled}
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    background: "rgba(255,235,90,0.4)",
                    border: "2px dashed #FFEB5A",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#191923",
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  📷 {files.length > 0 ? "Ajouter / remplacer des photos" : "Sélectionner les photos ou PDF (multiple)"}
                </button>
                <div style={{ fontSize: 11, color: "#666", marginTop: 6, fontStyle: "italic" }}>
                  Tu peux sélectionner plusieurs photos d&apos;un coup. L&apos;ordre = ordre des pages du document final.
                </div>
              </div>

              {/* Liste des fichiers avec réordonnancement */}
              {files.length > 0 ? (
                <div style={{ marginBottom: 16, border: "1px solid #EEEEEE", borderRadius: 6, padding: 8 }}>
                  {files.map(function (f, idx) {
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: 6, borderBottom: idx < files.length - 1 ? "1px solid #F5F5F5" : "none" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#FF82D7", minWidth: 28 }}>
                          Page {idx + 1}
                        </span>
                        {previews[idx] ? (
                          <img src={previews[idx]} alt={"Page " + (idx + 1)} style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }} />
                        ) : (
                          <span style={{ fontSize: 20 }}>📄</span>
                        )}
                        <span style={{ flex: 1, fontSize: 12, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </span>
                        <button
                          onClick={function () { moveFile(idx, -1) }}
                          disabled={disabled || idx === 0}
                          style={{ background: "none", border: "none", fontSize: 16, cursor: idx === 0 ? "default" : "pointer", opacity: idx === 0 ? 0.3 : 0.7 }}
                          title="Monter"
                        >↑</button>
                        <button
                          onClick={function () { moveFile(idx, 1) }}
                          disabled={disabled || idx === files.length - 1}
                          style={{ background: "none", border: "none", fontSize: 16, cursor: idx === files.length - 1 ? "default" : "pointer", opacity: idx === files.length - 1 ? 0.3 : 0.7 }}
                          title="Descendre"
                        >↓</button>
                        <button
                          onClick={function () { removeFile(idx) }}
                          disabled={disabled}
                          style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", color: "#C00" }}
                          title="Retirer"
                        >🗑</button>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {/* Statut workflow */}
              {progress ? (
                <div style={{ padding: "12px 14px", background: "rgba(255,130,215,0.1)", borderLeft: "4px solid #FF82D7", borderRadius: 4, fontSize: 13, color: "#191923", marginBottom: 16, lineHeight: 1.5 }}>
                  {progress}
                </div>
              ) : null}

              {/* Erreur */}
              {errorMsg ? (
                <div style={{ padding: "12px 14px", background: "rgba(220,53,69,0.1)", borderLeft: "4px solid #DC3545", borderRadius: 4, fontSize: 13, color: "#191923", marginBottom: 16 }}>
                  ⚠ {errorMsg}
                </div>
              ) : null}

              {/* Info OCR */}
              <div style={{ padding: "10px 14px", background: "#FAFAFA", border: "1px solid #EEEEEE", borderRadius: 4, fontSize: 12, color: "#666", marginBottom: 16, lineHeight: 1.5 }}>
                <strong style={{ color: "#191923" }}>🔍 Analyse automatique :</strong> après upload, Claude Vision extraira la date de signature, le motif (si avenant), et toute info utile du document. Tu pourras toujours corriger après.
              </div>

              {/* Footer boutons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14, borderTop: "1px solid #EEEEEE" }}>
                <button
                  onClick={props.onClose}
                  disabled={disabled}
                  style={{
                    background: "#FFFFFF",
                    color: "#191923",
                    border: "1.5px solid #DDD",
                    padding: "10px 20px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >Annuler</button>
                <button
                  onClick={runWorkflow}
                  disabled={disabled || files.length === 0}
                  style={{
                    background: disabled || files.length === 0 ? "#CCC" : "#FF82D7",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: disabled || files.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {phase === "uploading" ? "⏳ Upload..." : phase === "extracting" ? "🔍 Analyse..." : "📤 Uploader & analyser"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
