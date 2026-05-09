// src/app/dashboard/rh/WorkStoppageWizard.tsx
// Modal pour ajouter/éditer un arrêt de travail.
// Saisie manuelle OU upload du certificat médical (l'IA extrait dates + type + motif).
// SWC-safe.

"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

var MAX_FILE_MB = 20

var STOPPAGE_TYPES = [
  { value: "arret_maladie", label: "Arrêt maladie" },
  { value: "accident_travail", label: "Accident du travail" },
  { value: "accident_trajet", label: "Accident de trajet" },
  { value: "maladie_pro", label: "Maladie professionnelle" },
  { value: "conge_maternite", label: "Congé maternité" },
  { value: "conge_paternite", label: "Congé paternité" },
  { value: "conge_adoption", label: "Congé adoption" },
  { value: "conge_parental", label: "Congé parental" },
  { value: "autre", label: "Autre" },
]

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

export default function WorkStoppageWizard(props: any) {
  // props : { employee, existing?, onClose, onSaved }
  // existing = un objet hr_work_stoppages si on édite (sinon création)
  var emp = props.employee
  var existing = props.existing || null
  var onClose = props.onClose || function () {}
  var onSaved = props.onSaved || function () {}

  var [phase, setPhase] = useState("entry")  // entry | upload | analyzing | review
  var [error, setError] = useState("")
  var [saving, setSaving] = useState(false)

  // Fields
  var [stoppageType, setStoppageType] = useState(existing?.stoppage_type || "arret_maladie")
  var [dateDebut, setDateDebut] = useState(existing?.date_debut || "")
  var [dateFin, setDateFin] = useState(existing?.date_fin || "")
  var [motif, setMotif] = useState(existing?.motif || "")
  var [prescripteur, setPrescripteur] = useState(existing?.prescripteur || "")
  var [isProlongation, setIsProlongation] = useState(existing?.is_prolongation || false)
  var [notes, setNotes] = useState(existing?.notes || "")
  var [documentPath, setDocumentPath] = useState(existing?.document_path || "")
  var [documentPages, setDocumentPages] = useState(existing?.document_pages || null)
  var [ocrExtraction, setOcrExtraction] = useState(existing?.ocr_extraction || null)

  // Upload UI
  var [files, setFiles] = useState([] as any[])
  var [dragOver, setDragOver] = useState(false)
  var [analysisProgress, setAnalysisProgress] = useState("")
  var fileInputRef = useRef<any>(null)

  function handleCloseRequest() {
    if (saving) return
    if (phase !== "entry" || dateDebut || files.length > 0) {
      if (!window.confirm("Fermer sans enregistrer ? Les infos saisies seront perdues.")) return
    }
    onClose()
  }

  // ====== UPLOAD HANDLERS ======
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
      if (!isImage && !isPdf) { rejected.push(f.name); continue }
      var sizeMb = f.size / (1024 * 1024)
      if (sizeMb > MAX_FILE_MB) { rejected.push(f.name + " (trop lourd)"); continue }
      if (isPdf) {
        if (hasPdf || newFiles.some(function (p: any) { return p.isPdf })) { rejected.push(f.name); continue }
        if (hasImage) { rejected.push(f.name + " (mix interdit)"); continue }
      } else {
        if (hasPdf || newFiles.some(function (p: any) { return p.isPdf })) { rejected.push(f.name); continue }
      }
      newFiles.push(makeFileEntry(f))
    }
    if (rejected.length > 0) window.alert("Fichiers ignorés :\n" + rejected.join("\n"))
    setFiles(files.concat(newFiles).slice(0, 30))
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

  // ====== OCR ANALYSIS ======
  async function handleAnalyze() {
    setError("")
    if (files.length === 0) { setError("Ajoute le certificat médical"); return }
    setPhase("analyzing")
    setAnalysisProgress("Upload + analyse IA en cours (~10-30s)...")
    try {
      var fd = new FormData()
      fd.append("employee_id", emp.id)
      for (var i = 0; i < files.length; i++) {
        fd.append("file_" + String(i).padStart(3, "0"), files[i].file)
      }
      var res = await fetch("/api/hr/extract-stoppage", { method: "POST", body: fd })
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || "Extraction échouée")

      var ext = data.extraction || {}
      if (ext.stoppage_type) setStoppageType(ext.stoppage_type)
      if (ext.date_debut) setDateDebut(ext.date_debut)
      if (ext.date_fin) setDateFin(ext.date_fin)
      if (ext.motif) setMotif(ext.motif)
      if (ext.prescripteur) setPrescripteur(ext.prescripteur)
      if (ext.is_prolongation) setIsProlongation(true)
      setOcrExtraction(ext)
      setDocumentPath(data.document_path || "")
      setDocumentPages(data.document_pages || null)

      setPhase("review")
    } catch (e: any) {
      setError("Erreur analyse : " + e.message)
      setPhase("upload")
    } finally {
      setAnalysisProgress("")
    }
  }

  // ====== SAVE ======
  async function handleSave() {
    setError("")
    if (!dateDebut) { setError("Date de début obligatoire"); return }
    if (!stoppageType) { setError("Type d'arrêt obligatoire"); return }

    setSaving(true)
    try {
      var payload: any = {
        employee_id: emp.id,
        stoppage_type: stoppageType,
        date_debut: dateDebut,
        date_fin: dateFin || null,
        motif: motif || null,
        prescripteur: prescripteur || null,
        is_prolongation: isProlongation,
        notes: notes || null,
        document_path: documentPath || null,
        document_pages: documentPages,
        ocr_extraction: ocrExtraction,
        validated_by_user: true,
      }
      if (ocrExtraction) payload.extracted_at = new Date().toISOString()

      var res
      if (existing) {
        payload.id = existing.id
        res = await fetch("/api/hr/work-stoppages", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/hr/work-stoppages", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      var data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sauvegarde échouée")

      onSaved(existing ? "Arrêt modifié" : "Arrêt enregistré")
      onClose()
    } catch (e: any) {
      setError(e.message || "Erreur sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  // ====== RENDER ======
  return (
    <div className="overlay" onClick={function (e: any) { if (e.target === e.currentTarget) handleCloseRequest() }}>
      <div className="modal modal-lg">
        {/* HEADER */}
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mt">{existing ? "✏️ Modifier l'arrêt" : "🩹 Ajouter un arrêt de travail"}</div>
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

          {/* PHASE ENTRY — choix méthode */}
          {phase === "entry" && !existing ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14 }}>
                <div className="yt" style={{ fontSize: 18, marginBottom: 4 }}>Comment veux-tu saisir ?</div>
                <div style={{ fontSize: 11 }}>
                  Soit l'IA lit le certificat médical et pré-remplit, soit tu saisis tout à la main.
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="btn btn-p" onClick={function () { setPhase("upload") }} style={{ flex: 1, minWidth: 200 }}>
                  📷 Uploader le certificat<br />
                  <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 400 }}>L'IA extrait les dates + type</span>
                </button>
                <button className="btn btn-y" onClick={function () { setPhase("review") }} style={{ flex: 1, minWidth: 200 }}>
                  ✏️ Saisir manuellement<br />
                  <span style={{ fontSize: 9, opacity: 0.85, fontWeight: 400 }}>Sans document</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* PHASE UPLOAD — drop certificat */}
          {phase === "upload" ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14 }}>
                <div className="yt" style={{ fontSize: 18, marginBottom: 4 }}>Certificat médical</div>
                <div style={{ fontSize: 11 }}>
                  Drop le CERFA d'arrêt de travail (volet 3 employeur) ou un document de congé maternité/paternité.
                </div>
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
                <div style={{ fontSize: 30, marginBottom: 4 }}>📷📄</div>
                <div className="yt" style={{ fontSize: 16, marginBottom: 4 }}>
                  {files.length === 0 ? "Drop un PDF OU des photos" : "Ajouter d'autres pages"}
                </div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>
                  JPEG / PNG / HEIC / WEBP — ou un PDF — max {MAX_FILE_MB} MB
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
              <div style={{ fontSize: 12, marginBottom: 14 }}>{analysisProgress}</div>
              <div className="prog-wrap"><div className="prog-fill" style={{ width: "70%" }}></div></div>
            </div>
          ) : null}

          {/* PHASE REVIEW — formulaire d'édition */}
          {phase === "review" ? (
            <div>
              {ocrExtraction && ocrExtraction.meta ? (
                <div className={
                  ocrExtraction.meta.confidence === "high" ? "card-y" :
                  (ocrExtraction.meta.confidence === "low" ? "card-p" : "card")
                } style={{ marginBottom: 14, padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 900 }}>
                    Confiance IA : {ocrExtraction.meta.confidence}
                  </div>
                  {ocrExtraction.meta.notes ? (
                    <div style={{ fontSize: 10, marginTop: 2 }}>📝 {ocrExtraction.meta.notes}</div>
                  ) : null}
                </div>
              ) : null}

              <div className="card">
                <div className="ct">Type et dates</div>
                <div className="fg">
                  <label className="lbl">Type d'arrêt *</label>
                  <select className="inp sel" value={stoppageType} onChange={function (e: any) { setStoppageType(e.target.value) }}>
                    {STOPPAGE_TYPES.map(function (t: any) {
                      return <option key={t.value} value={t.value}>{t.label}</option>
                    })}
                  </select>
                </div>
                <div className="fg2">
                  <div className="fg">
                    <label className="lbl">Date de début *</label>
                    <input className="inp" type="date" value={dateDebut} onChange={function (e: any) { setDateDebut(e.target.value) }} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Date de fin (vide = en cours)</label>
                    <input className="inp" type="date" value={dateFin} onChange={function (e: any) { setDateFin(e.target.value) }} />
                  </div>
                </div>
                <div className="fg">
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
                    <input type="checkbox" checked={isProlongation} onChange={function (e: any) { setIsProlongation(e.target.checked) }} />
                    <span>Prolongation d'un arrêt précédent</span>
                  </label>
                </div>
              </div>

              <div className="card" style={{ marginTop: 14 }}>
                <div className="ct">Détails (optionnels)</div>
                <div className="fg">
                  <label className="lbl">Motif / Pathologie</label>
                  <input className="inp" type="text" value={motif} onChange={function (e: any) { setMotif(e.target.value) }} placeholder="Ex: Lombalgie, COVID, Grippe, Fracture..." />
                </div>
                <div className="fg">
                  <label className="lbl">Prescripteur (médecin / établissement)</label>
                  <input className="inp" type="text" value={prescripteur} onChange={function (e: any) { setPrescripteur(e.target.value) }} placeholder="Ex: Dr. Martin, Hôpital Cochin..." />
                </div>
                <div className="fg">
                  <label className="lbl">Notes internes</label>
                  <textarea className="inp" rows={2} value={notes} onChange={function (e: any) { setNotes(e.target.value) }} />
                </div>
              </div>

              {documentPath ? (
                <div className="card" style={{ marginTop: 14 }}>
                  <div className="ct">📎 Certificat médical</div>
                  <div style={{ fontSize: 11 }}>
                    Document archivé. {documentPages && documentPages.length > 0 ? documentPages.length + " page(s)" : "PDF complet"}.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="mf">
          {phase === "entry" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={handleCloseRequest}>Annuler</button>
            </div>
          ) : null}
          {phase === "upload" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={function () { setPhase("entry") }}>← Retour</button>
              <button className="btn btn-p" onClick={handleAnalyze} disabled={files.length === 0}>
                🤖 Analyser
              </button>
            </div>
          ) : null}
          {phase === "review" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {!existing ? (
                <button className="btn" onClick={function () { setPhase("entry") }}>← Retour</button>
              ) : null}
              <button className="btn btn-p" onClick={handleSave} disabled={saving}>
                {saving ? "Enregistrement..." : (existing ? "💾 Mettre à jour" : "💾 Enregistrer")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
