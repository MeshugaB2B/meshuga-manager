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

export default function RegularizationWizard(props: any) {
  // props : { employee, onClose, onSaved }
  var emp = props.employee
  var onClose = props.onClose || function () {}
  var onSaved = props.onSaved || function () {}

  var [phase, setPhase] = useState("drop")  // drop | analyzing | review | done
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
    if (files.length === 0) { setError("Drop au moins une fiche de paie"); return }
    setPhase("analyzing")
    try {
      setProgress("Optimisation des images...")
      var rawFiles = files.map(function (f: any) { return f.file })
      var compressedFiles = await compressFileList(rawFiles, function (cur: number, total: number, level: string) {
        var levelLabel = level === "L1" ? "" : (level === "L2" ? " (qualité réduite)" : " (qualité minimale)")
        setProgress("Optimisation" + levelLabel + " (" + (cur + 1) + "/" + total + ")...")
      })
      var sizeMb = totalSizeMb(compressedFiles)
      setProgress("Analyse IA des fiches (" + sizeMb.toFixed(1) + " MB) — peut prendre 30s à 2min...")

      var fd = new FormData()
      fd.append("employee_id", emp.id)
      for (var i = 0; i < compressedFiles.length; i++) {
        fd.append("file_" + String(i).padStart(3, "0"), compressedFiles[i])
      }
      var res = await fetch("/api/hr/extract-payslips", { method: "POST", body: fd })
      var p = await parseApiResponse(res)
      if (!p.ok) throw new Error(p.errorText)
      var data = p.data
      var consolidated = data.consolidated

      // Pré-remplir
      if (consolidated.date_embauche) setDateEmbauche(consolidated.date_embauche)
      setDateExtractedExplicitly(!!consolidated.date_embauche_extracted_explicitly)
      var newEmpFields: any = Object.assign({}, employeeFields)
      var keys = ["civilite", "prenom", "nom", "date_naissance", "lieu_naissance",
        "nationalite", "adresse", "code_postal", "ville", "num_secu"]
      keys.forEach(function (k: any) {
        var v = consolidated.employee?.[k]
        if (v && !newEmpFields[k]) newEmpFields[k] = v
      })
      setEmployeeFields(newEmpFields)

      var newContractFields: any = Object.assign({}, contractFields)
      var ckeys = ["fonction", "statut_cadre", "niveau_ccn", "echelon_ccn", "coefficient_ccn",
        "classification", "salaire_brut_mensuel", "heures_mensuelles", "heures_hebdo"]
      ckeys.forEach(function (k: any) {
        var v = consolidated.contract?.[k]
        if (v !== null && v !== undefined && v !== "") newContractFields[k] = v
      })
      setContractFields(newContractFields)
      setAiNotes(consolidated.notes || [])

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
      // 1) Mettre à jour la fiche employé en base avec les infos validées
      var updateEmp: any = {}
      Object.keys(employeeFields).forEach(function (k: any) {
        if (employeeFields[k]) updateEmp[k] = employeeFields[k]
      })
      var resUpd = await supabase.from("hr_employees").update(updateEmp).eq("id", emp.id).select("*").single()
      if (resUpd.error) throw new Error("MAJ employé : " + resUpd.error.message)

      // 2) Mettre à jour la date_entree du cycle ouvert (la "vraie" date d'embauche)
      var resCyc = await fetch("/api/hr/cycles?employee_id=" + emp.id)
      var pCyc = await parseApiResponse(resCyc)
      if (pCyc.ok) {
        var openCycle = (pCyc.data.cycles || []).find(function (c: any) { return !c.date_sortie })
        if (openCycle) {
          await supabase.from("hr_employment_cycles").update({ date_entree: dateEmbauche }).eq("id", openCycle.id)
        }
      }

      // 3) Générer le HTML du contrat
      var payload = {
        employee_id: emp.id,
        date_embauche: dateEmbauche,
        employee: employeeFields,
        contract: contractFields,
      }
      var resGen = await fetch("/api/hr/regularization-contract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!resGen.ok) {
        var pGen = await parseApiResponse(resGen)
        throw new Error("Génération PDF : " + (pGen.errorText || "erreur"))
      }

      // 4) Ouvrir le HTML dans un nouvel onglet pour impression
      var html = await resGen.text()
      var newWin = window.open("", "_blank")
      if (newWin) {
        newWin.document.open()
        newWin.document.write(html)
        newWin.document.close()
      } else {
        // Si popup bloqué, fallback : Blob + URL
        var blob = new Blob([html], { type: "text/html" })
        var url = URL.createObjectURL(blob)
        window.open(url, "_blank")
      }

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
            <div className="mt">📝 Régulariser le contrat</div>
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

          {/* PHASE DROP */}
          {phase === "drop" ? (
            <div>
              <div className="card-y" style={{ marginBottom: 14 }}>
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
                <div className="yt" style={{ fontSize: 26, marginTop: 4 }}>Contrat généré !</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  Le contrat de régularisation s'est ouvert dans un nouvel onglet.
                </div>
              </div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="ct">📋 Étapes suivantes</div>
                <ol style={{ paddingLeft: 18, fontSize: 11, lineHeight: 1.7 }}>
                  <li><strong>Imprime</strong> le contrat en 2 exemplaires (bouton "↓ Imprimer / PDF" dans le nouvel onglet)</li>
                  <li>Ou enregistre-le en PDF (Imprimer → "Enregistrer au format PDF")</li>
                  <li><strong>Fais signer</strong> le salarié — fais-lui apposer la mention manuscrite "Lu et approuvé, bon pour accord"</li>
                  <li>Signe ton exemplaire</li>
                  <li>Reviens dans la fiche du salarié et clique <strong>"📥 Uploader contrat signé"</strong></li>
                  <li>L'app désactivera automatiquement le bandeau "À RÉGULARISER" 🎉</li>
                </ol>
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
          {phase === "drop" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={handleCloseRequest}>Annuler</button>
              <button className="btn btn-p" onClick={handleAnalyze} disabled={files.length === 0}>
                🤖 Analyser les fiches
              </button>
            </div>
          ) : null}
          {phase === "review" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn" onClick={function () { setPhase("drop") }}>← Retour</button>
              <button className="btn btn-p" onClick={handleGenerateContract} disabled={saving}>
                {saving ? "Génération..." : "📝 Générer le contrat"}
              </button>
            </div>
          ) : null}
          {phase === "done" ? (
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn btn-y" onClick={function () {
                onSaved("Contrat de régularisation généré — fais signer puis upload")
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
