// src/app/dashboard/rh/OffboardingWizard.tsx
// Modal pour marquer un salarié comme parti.
// 1) Date de sortie + motif obligatoires
// 2) Upload optionnel du solde de tout compte / certif / lettre démission
// 3) Clôture le cycle d'emploi en cours + met à jour hr_employees
// SWC-safe : var, pas de generics, function() {}, pas de fragments.

"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

var MAX_FILE_MB = 20

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

var DOC_TYPES_SORTIE = [
  { value: "solde_tout_compte", label: "Solde de tout compte" },
  { value: "recu_solde_tout_compte", label: "Reçu solde de tout compte (signé)" },
  { value: "certificat_travail", label: "Certificat de travail" },
  { value: "attestation_france_travail", label: "Attestation France Travail" },
  { value: "lettre_demission", label: "Lettre de démission" },
  { value: "lettre_licenciement", label: "Lettre de licenciement" },
  { value: "rupture_conv", label: "Convention rupture conventionnelle" },
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

export default function OffboardingWizard(props: any) {
  // props : { employee: {...}, onClose: function, onSaved: function }
  var emp = props.employee
  var onClose = props.onClose || function () {}
  var onSaved = props.onSaved || function () {}

  var [exitDate, setExitDate] = useState("")
  var [motif, setMotif] = useState("demission")
  var [docType, setDocType] = useState("solde_tout_compte")
  var [files, setFiles] = useState([] as any[])
  var [activeCycle, setActiveCycle] = useState(null as any)
  var [activeContractId, setActiveContractId] = useState("")
  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [error, setError] = useState("")
  var [dragOver, setDragOver] = useState(false)
  var fileInputRef = useRef<any>(null)

  // Charger le cycle ouvert + dernier contrat
  useEffect(function () {
    var run = async function () {
      try {
        var resCyc = await fetch("/api/hr/cycles?employee_id=" + emp.id)
        var data = await resCyc.json()
        if (!resCyc.ok) throw new Error(data.error || "Erreur chargement")

        var cycles = data.cycles || []
        var openCycle = cycles.find(function (c: any) { return !c.date_sortie })
        if (!openCycle) {
          setError("Aucun cycle d'emploi ouvert pour ce salarié. Il est peut-être déjà marqué comme parti.")
          setLoading(false)
          return
        }
        setActiveCycle(openCycle)

        // Trouver le contrat current dans ce cycle
        var current = (openCycle.contracts || []).find(function (c: any) { return c.is_current })
        if (current) setActiveContractId(current.id)
        else if ((openCycle.contracts || []).length > 0) {
          setActiveContractId(openCycle.contracts[openCycle.contracts.length - 1].id)
        }
        setLoading(false)
      } catch (e: any) {
        setError(e.message || "Erreur")
        setLoading(false)
      }
    }
    run()
  }, [])

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
      if (!isImage && !isPdf) { rejected.push(f.name + " (ni image ni PDF)"); continue }
      var sizeMb = f.size / (1024 * 1024)
      if (sizeMb > MAX_FILE_MB) { rejected.push(f.name + " (" + sizeMb.toFixed(1) + " MB)"); continue }
      if (isPdf) {
        if (hasPdf || newFiles.some(function (p: any) { return p.isPdf })) {
          rejected.push(f.name + " (un seul PDF)"); continue
        }
        if (hasImage) { rejected.push(f.name + " (pas de mix)"); continue }
      } else {
        if (hasPdf || newFiles.some(function (p: any) { return p.isPdf })) {
          rejected.push(f.name + " (vide la liste)"); continue
        }
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

  // ====== SAVE ======
  async function handleSave() {
    setError("")
    if (!exitDate) { setError("Date de sortie obligatoire"); return }
    if (!motif) { setError("Motif obligatoire"); return }
    if (!activeCycle) { setError("Cycle d'emploi introuvable"); return }

    setSaving(true)
    try {
      // 1) Si fichiers à uploader → upload + lien sur le contrat courant
      if (files.length > 0 && activeContractId) {
        var fd = new FormData()
        fd.append("contract_id", activeContractId)
        fd.append("doc_type", docType)
        fd.append("label", DOC_TYPES_SORTIE.find(function (d: any) { return d.value === docType })?.label || "Document de sortie")
        fd.append("assemble_pdf", "1")
        for (var i = 0; i < files.length; i++) {
          fd.append("file_" + String(i).padStart(3, "0"), files[i].file)
        }
        var resUp = await fetch("/api/hr/upload-pages", { method: "POST", body: fd })
        var dataUp = await resUp.json()
        if (!resUp.ok) throw new Error("Upload : " + (dataUp.error || ""))
        // Marquer validé direct
        if (dataUp.document && dataUp.document.id) {
          await supabase.from("hr_contract_documents").update({ validated_by_user: true }).eq("id", dataUp.document.id)
        }
      }

      // 2) Clôture du cycle (PATCH /api/hr/cycles met aussi effective_to du contrat courant)
      var resCyc = await fetch("/api/hr/cycles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: activeCycle.id,
          date_sortie: exitDate,
          motif_sortie: motif,
        }),
      })
      var dataCyc = await resCyc.json()
      if (!resCyc.ok) throw new Error("Clôture cycle : " + (dataCyc.error || ""))

      // 3) Mettre à jour hr_employees pour cohérence cache
      await supabase.from("hr_employees").update({
        date_sortie: exitDate,
        motif_sortie: motif,
      }).eq("id", emp.id)

      onSaved("Salarié marqué comme parti le " + formatFr(exitDate))
      onClose()
    } catch (e: any) {
      setError(e.message || "Erreur sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  function formatFr(iso: string): string {
    if (!iso) return ""
    var p = iso.split("-")
    if (p.length !== 3) return iso
    return p[2] + "/" + p[1] + "/" + p[0]
  }

  function handleCloseRequest() {
    if (saving) return
    if (files.length > 0 || exitDate) {
      if (!window.confirm("Fermer sans enregistrer ? Les infos saisies seront perdues.")) return
    }
    onClose()
  }

  // ====== RENDER ======
  return (
    <div className="overlay" onClick={function (e: any) { if (e.target === e.currentTarget) handleCloseRequest() }}>
      <div className="modal modal-lg">
        {/* HEADER */}
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mt">📤 Marquer comme parti</div>
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

          {loading ? (
            <div style={{ padding: 30, textAlign: "center" }}>
              <div className="yt" style={{ fontSize: 22, color: "#FF82D7" }}>Chargement…</div>
            </div>
          ) : null}

          {!loading && activeCycle ? (
            <div>
              {/* Bloc dates / motif */}
              <div className="card">
                <div className="ct">Sortie</div>
                <div className="fg2">
                  <div className="fg">
                    <label className="lbl">Date de sortie *</label>
                    <input className="inp" type="date" value={exitDate} onChange={function (e: any) { setExitDate(e.target.value) }} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Motif *</label>
                    <select className="inp sel" value={motif} onChange={function (e: any) { setMotif(e.target.value) }}>
                      {MOTIFS_SORTIE.map(function (m: any) {
                        return <option key={m.value} value={m.value}>{m.label}</option>
                      })}
                    </select>
                  </div>
                </div>
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                  Cycle ouvert depuis le {formatFr(activeCycle.date_entree)}.
                  La date de sortie clôturera ce cycle. Si le salarié revient un jour, tu pourras créer un nouveau cycle (ré-embauche).
                </div>
              </div>

              {/* Bloc upload optionnel */}
              <div className="card-y" style={{ marginTop: 14 }}>
                <div className="ct">Document de sortie (optionnel)</div>
                <div style={{ fontSize: 11, marginBottom: 10 }}>
                  Solde de tout compte, certificat de travail, lettre de démission, attestation France Travail… Tu peux les uploader maintenant ou les ajouter plus tard via l'import historique.
                </div>

                {files.length === 0 ? (
                  <div className="fg">
                    <label className="lbl">Type de document</label>
                    <select className="inp sel" value={docType} onChange={function (e: any) { setDocType(e.target.value) }}>
                      {DOC_TYPES_SORTIE.map(function (d: any) {
                        return <option key={d.value} value={d.value}>{d.label}</option>
                      })}
                    </select>
                  </div>
                ) : null}

                {/* Zone drop */}
                <div
                  onDrop={handleDrop}
                  onDragOver={function (e: any) { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={function (e: any) { e.preventDefault(); setDragOver(false) }}
                  onClick={function () { if (fileInputRef.current) fileInputRef.current.click() }}
                  style={{
                    border: "2px dashed " + (dragOver ? "#FF82D7" : "#191923"),
                    borderRadius: 7,
                    padding: 18,
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver ? "#FFF5FB" : "#FFFFFF",
                    boxShadow: "2px 2px 0 #191923",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>📷📄</div>
                  <div style={{ fontSize: 11, fontWeight: 900 }}>
                    {files.length === 0 ? "Drop un PDF OU des photos" : "Ajouter d'autres pages"}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>
                    JPEG/PNG/HEIC/WEBP ou PDF — max {MAX_FILE_MB} MB
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
                  <div style={{ marginTop: 10 }}>
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
            </div>
          ) : null}
        </div>

        {/* FOOTER */}
        <div className="mf">
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button className="btn" onClick={handleCloseRequest} disabled={saving}>Annuler</button>
            <button className="btn btn-p" onClick={handleSave} disabled={saving || loading || !!error || !exitDate}>
              {saving ? "Enregistrement..." : "📤 Marquer comme parti"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
