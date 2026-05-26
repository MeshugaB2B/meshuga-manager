// ============================================================
// DocumentsManager.tsx
// ============================================================
// Composant réutilisable pour gérer les documents d'un salarié OU d'un contrat.
//
// Props:
//   - context: "employee" | "contract"
//   - parentId: UUID du salarié ou du contrat
//   - onCountChange?: callback (count) => void
//   - mergeContractDocs?: bool — si true en mode employee, charge aussi les docs
//     de tous les contractIds passés en prop (vue salarié-centrée déroulée)
//   - contractIds?: array d'UUID — utilisé si mergeContractDocs=true
//
// Le composant s'auto-charge :
//   - Liste les docs existants
//   - Permet d'uploader un nouveau doc (avec choix contexte si merge)
//   - Génère un signed URL temporaire (1h) pour visualiser
//   - Supprime un doc (storage + DB)
//
// SWC-safe : var dans JSX, pas de generics, function(){} partout
// ============================================================

import { useState, useEffect, useRef } from "react"
import { createClient } from "@supabase/supabase-js"
import {
  EMPLOYEE_DOC_TYPES,
  CONTRACT_DOC_TYPES,
  getEmployeeDocTypeMeta,
  getContractDocTypeMeta,
  formatFileSize,
  formatPeriodMonth
} from "./rhConstants"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function DocumentsManager(props) {
  var context = props.context // "employee" | "contract"
  var parentId = props.parentId
  var onCountChange = props.onCountChange
  var mergeMode = !!(props.mergeContractDocs && context === "employee")
  var contractIds = props.contractIds || []

  var [docs, setDocs] = useState([])
  var [loading, setLoading] = useState(true)
  var [showUpload, setShowUpload] = useState(false)
  var [uploading, setUploading] = useState(false)
  // En mode merge, on doit savoir si l'utilisateur veut uploader un doc perso ou un doc contrat
  var [uploadCategory, setUploadCategory] = useState(mergeMode ? "employee" : context)
  var [selectedType, setSelectedType] = useState(
    mergeMode ? "cni" : (context === "employee" ? "cni" : "fiche_paie")
  )
  var [selectedContractId, setSelectedContractId] = useState(contractIds[0] || null)
  var [customLabel, setCustomLabel] = useState("")
  var [periodMonth, setPeriodMonth] = useState("")
  var fileInputRef = useRef(null)

  // === Helpers d'inspection des constantes par catégorie ===
  function getDocTypesFor(cat) {
    return cat === "employee" ? EMPLOYEE_DOC_TYPES : CONTRACT_DOC_TYPES
  }
  function getMetaFor(cat, key) {
    return cat === "employee" ? getEmployeeDocTypeMeta(key) : getContractDocTypeMeta(key)
  }
  function getBucketFor(cat) {
    return cat === "employee" ? "hr-employee-docs" : "hr-contract-docs"
  }
  function getTableFor(cat) {
    return cat === "employee" ? "hr_employee_documents" : "hr_contract_documents"
  }

  // === Charge la liste des documents ===
  async function loadDocs() {
    if (!parentId) {
      setDocs([])
      setLoading(false)
      return
    }
    setLoading(true)

    if (mergeMode) {
      // 1. Docs perso de l'employé
      var resE = await supabase
        .from("hr_employee_documents")
        .select("*")
        .eq("employee_id", parentId)
        .order("uploaded_at", { ascending: false })
      var empDocs = (resE.data || []).map(function (d) {
        return Object.assign({}, d, { _source: "employee" })
      })

      // 2. Docs des contrats si présents
      var contDocs = []
      if (contractIds.length > 0) {
        var resC = await supabase
          .from("hr_contract_documents")
          .select("*")
          .in("contract_id", contractIds)
          .order("uploaded_at", { ascending: false })
        contDocs = (resC.data || []).map(function (d) {
          return Object.assign({}, d, { _source: "contract" })
        })
      }

      // Fusion + tri par date desc
      var all = empDocs.concat(contDocs)
      all.sort(function (a, b) {
        return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
      })
      setDocs(all)
      if (onCountChange) onCountChange(all.length)
    } else {
      // Mode normal : 1 seule source
      var TABLE_ = context === "employee" ? "hr_employee_documents" : "hr_contract_documents"
      var FK_ = context === "employee" ? "employee_id" : "contract_id"
      var query = supabase
        .from(TABLE_)
        .select("*")
        .eq(FK_, parentId)
        .order("uploaded_at", { ascending: false })
      var res = await query
      var list = res.data || []
      setDocs(list)
      if (onCountChange) onCountChange(list.length)
    }
    setLoading(false)
  }

  useEffect(function () { loadDocs() }, [parentId, contractIds.length])

  // === Upload d'un fichier ===
  async function handleFileUpload(file) {
    if (!file) return
    if (!parentId) {
      alert("Le salarié doit être enregistré avant d'ajouter des documents.")
      return
    }
    // En mode merge avec catégorie contract, il faut un contrat sélectionné
    if (mergeMode && uploadCategory === "contract" && !selectedContractId) {
      alert("Sélectionne d'abord un contrat pour ce document.")
      return
    }

    setUploading(true)
    try {
      var cat = mergeMode ? uploadCategory : context
      var BUCKET = getBucketFor(cat)
      var TABLE = getTableFor(cat)
      var FK = cat === "employee" ? "employee_id" : "contract_id"
      var fkValue = cat === "employee" ? parentId : selectedContractId

      var ext = (file.name.split(".").pop() || "bin").toLowerCase()
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      var path = fkValue + "/" + selectedType + "/" + Date.now() + "-" + safeName

      var up = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined
      })
      if (up.error) throw up.error

      var row = {
        doc_type: selectedType,
        label: customLabel || file.name,
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size || null
      }
      row[FK] = fkValue
      // Période pour fiches de paie
      if (cat === "contract" && selectedType === "fiche_paie" && periodMonth) {
        row.period_month = periodMonth
      }

      var ins = await supabase.from(TABLE).insert([row]).select().single()
      if (ins.error) throw ins.error

      // Reset
      setCustomLabel("")
      setPeriodMonth("")
      setShowUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ""

      loadDocs()
    } catch (err) {
      alert("Erreur upload : " + (err.message || err))
    }
    setUploading(false)
  }

  // === Visualiser un doc ===
  // Si le parent passe une prop onOpenDoc (callback), on lui delegue l'ouverture
  // (ex : EmployeeDetail.tsx ouvre dans son modal PDF avec patch paraphes pour les HTML).
  // Sinon, fallback historique : signed URL Supabase dans un nouvel onglet.
  async function viewDoc(doc) {
    if (typeof props.onOpenDoc === "function") {
      // Le parent gere l'ouverture. On enrichit doc avec _source pour qu'il sache le bucket.
      var enriched = Object.assign({}, doc, { _source: doc._source || context })
      props.onOpenDoc(enriched)
      return
    }
    var cat = doc._source || context
    var BUCKET = getBucketFor(cat)
    var res = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600)
    if (res.error) {
      alert("Erreur ouverture : " + res.error.message)
      return
    }
    if (res.data && res.data.signedUrl) {
      window.open(res.data.signedUrl, "_blank")
    }
  }

  // === Supprimer un doc ===
  async function deleteDoc(doc) {
    if (!confirm("Supprimer définitivement ce document ?\n\n" + (doc.label || "Document"))) return
    try {
      var cat = doc._source || context
      var BUCKET = getBucketFor(cat)
      var TABLE = getTableFor(cat)
      var rm = await supabase.storage.from(BUCKET).remove([doc.file_path])
      if (rm.error) {
        console.warn("Storage remove failed:", rm.error.message)
      }
      var del = await supabase.from(TABLE).delete().eq("id", doc.id)
      if (del.error) throw del.error
      loadDocs()
    } catch (err) {
      alert("Erreur suppression : " + (err.message || err))
    }
  }

  // === Calcul du mois courant pour pré-remplir la période ===
  function currentMonth() {
    var d = new Date()
    var y = d.getFullYear()
    var m = (d.getMonth() + 1).toString()
    if (m.length < 2) m = "0" + m
    return y + "-" + m
  }

  // === Suggestion de placeholder selon le type ===
  function getPlaceholderForType(typeKey) {
    var hints = {
      cni: "Ex: CNI recto, CNI verso",
      passeport: "Ex: Passeport 2024-2034",
      titre_sejour: "Ex: Titre de séjour valable jusqu'à 2027",
      secu: "Ex: Attestation de droits à jour",
      mutuelle: "Ex: Carte mutuelle APRIL 2026",
      rib: "Ex: RIB Crédit Mutuel compte courant",
      diplome: "Ex: BTS Hôtellerie 2020",
      haccp: "Ex: Formation HACCP du 15 mars 2026",
      casier: "Ex: Casier vierge demandé en avril 2026",
      justif_domicile: "Ex: Facture EDF avril 2026",
      cv: "Ex: CV à jour avril 2026",
      lettre_motiv: "Ex: Lettre motivation poste serveur",
      permis: "Ex: Permis B obtenu en 2018",
      visite_medicale: "Ex: Aptitude au poste 12 mai 2026",
      attestation_emp: "Ex: Attestation Pizza Pino 2024",
      pole_emploi: "Ex: Inscription Pôle Emploi 01/2026",
      avis_imposition: "Ex: Avis d'imposition 2024",
      fiche_paie: "Ex: Fiche de paie",
      contrat_signe: "Ex: Contrat signé original",
      avenant: "Ex: Avenant changement horaires",
      lettre_demission: "Ex: Démission notifiée le...",
      lettre_licenciement: "Ex: Lettre licenciement faute grave",
      rupture_conv: "Ex: Convention de rupture",
      demande_conges: "Ex: Demande congés été 2026",
      arret_maladie: "Ex: Arrêt 3 jours grippe Dr. Martin",
      conge_maternite: "Ex: Congé maternité du... au...",
      avertissement: "Ex: Avertissement retards répétés",
      attestation_employeur: "Ex: Attestation Pôle Emploi",
      autre: "Décris brièvement le contenu du document"
    }
    return hints[typeKey] || hints.autre
  }

  // === Le selected type courant et meta ===
  var currentDocTypes = getDocTypesFor(mergeMode ? uploadCategory : context)
  var selectedMeta = getMetaFor(mergeMode ? uploadCategory : context, selectedType)
  var currentCat = mergeMode ? uploadCategory : context
  var needsPeriod = (currentCat === "contract") && selectedMeta && selectedMeta.needsPeriod

  // === Render ===
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="ct" style={{ margin: 0 }}>
          📁 Documents {docs.length > 0 ? "(" + docs.length + ")" : ""}
        </div>
        {!showUpload && (
          <button
            className="btn btn-sm btn-p"
            onClick={function () { setShowUpload(true) }}
            disabled={!parentId}
            title={parentId ? "" : "Enregistre d'abord la fiche pour pouvoir ajouter des documents"}
          >
            + Ajouter un document
          </button>
        )}
      </div>

      {/* Form d'ajout */}
      {showUpload && (
        <div style={{ background: "#FAFAFA", border: "2px solid #FF82D7", borderRadius: 6, padding: 12, marginBottom: 10 }}>
          {mergeMode && (
            <div className="fg">
              <label className="lbl">Catégorie de document</label>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={function () {
                    setUploadCategory("employee")
                    setSelectedType("cni")
                  }}
                  style={{
                    flex: "1 1 0",
                    padding: "8px 8px",
                    background: uploadCategory === "employee" ? "#FFEB5A" : "#FFFFFF",
                    color: "#191923",
                    border: "2px solid #191923",
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: ".5px"
                  }}
                >
                  👤 Doc personnel (CNI, RIB...)
                </button>
                <button
                  type="button"
                  onClick={function () {
                    setUploadCategory("contract")
                    setSelectedType("fiche_paie")
                  }}
                  disabled={contractIds.length === 0}
                  style={{
                    flex: "1 1 0",
                    padding: "8px 8px",
                    background: uploadCategory === "contract" ? "#FFEB5A" : "#FFFFFF",
                    color: contractIds.length === 0 ? "#999" : "#191923",
                    border: "2px solid " + (contractIds.length === 0 ? "#999" : "#191923"),
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 11,
                    cursor: contractIds.length === 0 ? "not-allowed" : "pointer",
                    textTransform: "uppercase",
                    letterSpacing: ".5px"
                  }}
                  title={contractIds.length === 0 ? "Crée d'abord un contrat" : ""}
                >
                  📄 Doc contractuel (fiche paie...)
                </button>
              </div>
            </div>
          )}

          {/* Sélecteur de contrat si on uploade un doc contractuel et qu'il y en a plusieurs */}
          {mergeMode && uploadCategory === "contract" && contractIds.length > 1 && (
            <div className="fg">
              <label className="lbl">Lié à quel contrat ?</label>
              <select
                className="inp"
                value={selectedContractId || ""}
                onChange={function (e) { setSelectedContractId(e.target.value) }}
              >
                {contractIds.map(function (cid, idx) {
                  return <option key={cid} value={cid}>Contrat #{idx + 1}</option>
                })}
              </select>
            </div>
          )}

          <div className="fg2">
            <div className="fg">
              <label className="lbl">Type de document</label>
              <select
                className="inp"
                value={selectedType}
                onChange={function (e) { setSelectedType(e.target.value) }}
              >
                {currentDocTypes.map(function (t) {
                  return <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                })}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Titre / description (recommandé)</label>
              <input
                className="inp"
                value={customLabel}
                onChange={function (e) { setCustomLabel(e.target.value) }}
                placeholder={getPlaceholderForType(selectedType)}
              />
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                Par exemple : "CNI recto", "RIB Crédit Mutuel", "Arrêt 3 jours grippe"...
              </div>
            </div>
          </div>

          {needsPeriod && (
            <div className="fg">
              <label className="lbl">Mois concerné</label>
              <input
                type="month"
                className="inp"
                value={periodMonth || currentMonth()}
                onChange={function (e) { setPeriodMonth(e.target.value) }}
                style={{ maxWidth: 200 }}
              />
            </div>
          )}

          <div className="fg">
            <label className="lbl">Fichier (PDF ou photo, max 10 MB)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp"
              className="inp"
              onChange={function (e) {
                var f = e.target.files && e.target.files[0]
                if (f) handleFileUpload(f)
              }}
              disabled={uploading}
            />
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-sm"
              onClick={function () {
                setShowUpload(false)
                setCustomLabel("")
                setPeriodMonth("")
              }}
              disabled={uploading}
            >
              Annuler
            </button>
            {uploading && (
              <span style={{ alignSelf: "center", fontSize: 11, fontStyle: "italic", color: "#666" }}>
                Upload en cours...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Liste des documents */}
      {loading ? (
        <div style={{ padding: 16, textAlign: "center", opacity: 0.5, fontSize: 11 }}>Chargement...</div>
      ) : docs.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", background: "#FAFAFA", borderRadius: 6, color: "#999", fontSize: 11, fontStyle: "italic" }}>
          Aucun document pour le moment.
          {!parentId && <div style={{ marginTop: 4, fontSize: 10 }}>Enregistre d'abord la fiche pour pouvoir ajouter des documents.</div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {docs.map(function (doc) {
            var docCat = doc._source || context
            var meta = getMetaFor(docCat, doc.doc_type)
            return (
              <div
                key={doc.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "#FFFFFF",
                  border: "1px solid #DDD",
                  borderRadius: 4
                }}
              >
                <div
                  style={{ fontSize: 22, cursor: "pointer" }}
                  onClick={function () { viewDoc(doc) }}
                  title="Cliquer pour ouvrir"
                >{meta.icon}</div>
                <div
                  style={{ cursor: "pointer" }}
                  onClick={function () { viewDoc(doc) }}
                  title="Cliquer pour ouvrir"
                >
                  <div style={{ fontWeight: 700, fontSize: 12 }}>
                    {doc.label || meta.label}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>
                    {meta.label}
                    {doc.period_month ? (" · " + formatPeriodMonth(doc.period_month)) : ""}
                    {doc.size_bytes ? (" · " + formatFileSize(doc.size_bytes)) : ""}
                    {" · " + new Date(doc.uploaded_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <button
                  className="btn btn-sm btn-y"
                  onClick={function () { viewDoc(doc) }}
                  title="Voir"
                >
                  👁
                </button>
                <button
                  className="btn btn-sm btn-red"
                  onClick={function () { deleteDoc(doc) }}
                  title="Supprimer"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
