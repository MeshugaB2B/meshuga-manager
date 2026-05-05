// ============================================================
// DocumentsManager.tsx
// ============================================================
// Composant réutilisable pour gérer les documents d'un salarié OU d'un contrat.
//
// Props:
//   - context: "employee" | "contract"
//   - parentId: UUID du salarié ou du contrat
//   - onCountChange?: callback (count) => void  (optionnel, pour afficher un compteur ailleurs)
//
// Le composant s'auto-charge :
//   - Liste les docs existants depuis hr_employee_documents ou hr_contract_documents
//   - Permet d'uploader un nouveau doc avec choix du type + label + période (si fiche de paie)
//   - Génère un signed URL temporaire (1h) pour visualiser
//   - Supprime un doc (storage + DB en cascade)
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

  var [docs, setDocs] = useState([])
  var [loading, setLoading] = useState(true)
  var [showUpload, setShowUpload] = useState(false)
  var [uploading, setUploading] = useState(false)
  var [selectedType, setSelectedType] = useState(context === "employee" ? "cni" : "fiche_paie")
  var [customLabel, setCustomLabel] = useState("")
  var [periodMonth, setPeriodMonth] = useState("")
  var fileInputRef = useRef(null)

  // === Configuration selon contexte ===
  var TABLE = context === "employee" ? "hr_employee_documents" : "hr_contract_documents"
  var BUCKET = context === "employee" ? "hr-employee-docs" : "hr-contract-docs"
  var FK_FIELD = context === "employee" ? "employee_id" : "contract_id"
  var DOC_TYPES = context === "employee" ? EMPLOYEE_DOC_TYPES : CONTRACT_DOC_TYPES
  var getMeta = context === "employee" ? getEmployeeDocTypeMeta : getContractDocTypeMeta

  // === Charge la liste des documents ===
  async function loadDocs() {
    if (!parentId) {
      setDocs([])
      setLoading(false)
      return
    }
    setLoading(true)
    var query = supabase
      .from(TABLE)
      .select("*")
      .eq(FK_FIELD, parentId)
      .order("uploaded_at", { ascending: false })
    var res = await query
    var list = res.data || []
    setDocs(list)
    if (onCountChange) onCountChange(list.length)
    setLoading(false)
  }

  useEffect(function () { loadDocs() }, [parentId])

  // === Upload d'un fichier ===
  async function handleFileUpload(file) {
    if (!file) return
    if (!parentId) {
      alert("Le salarié/contrat doit être enregistré avant d'ajouter des documents.")
      return
    }
    setUploading(true)
    try {
      // Construit un chemin unique : {parentId}/{type}/{timestamp}-{filename}
      var ext = (file.name.split(".").pop() || "bin").toLowerCase()
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      var path = parentId + "/" + selectedType + "/" + Date.now() + "-" + safeName

      // Upload dans le bucket
      var up = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined
      })
      if (up.error) throw up.error

      // Insertion en DB
      var row = {
        doc_type: selectedType,
        label: customLabel || file.name,
        file_path: path,
        mime_type: file.type || null,
        size_bytes: file.size || null
      }
      row[FK_FIELD] = parentId

      // Si fiche de paie, ajouter la période
      if (context === "contract" && selectedType === "fiche_paie" && periodMonth) {
        row.period_month = periodMonth
      }

      var ins = await supabase.from(TABLE).insert([row]).select().single()
      if (ins.error) throw ins.error

      // Reset form
      setCustomLabel("")
      setPeriodMonth("")
      setShowUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ""

      // Reload
      loadDocs()
    } catch (err) {
      alert("Erreur upload : " + (err.message || err))
    }
    setUploading(false)
  }

  // === Visualiser un doc (génère un signed URL 1h) ===
  async function viewDoc(doc) {
    var res = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 3600)
    if (res.error) {
      alert("Erreur ouverture : " + res.error.message)
      return
    }
    if (res.data && res.data.signedUrl) {
      window.open(res.data.signedUrl, "_blank")
    }
  }

  // === Supprimer un doc (storage + DB) ===
  async function deleteDoc(doc) {
    if (!confirm("Supprimer définitivement ce document ?\n\n" + (doc.label || "Document"))) return
    try {
      // Supprime d'abord le fichier dans le bucket
      var rm = await supabase.storage.from(BUCKET).remove([doc.file_path])
      if (rm.error) {
        // On log mais on continue (le fichier peut déjà être absent)
        console.warn("Storage remove failed:", rm.error.message)
      }
      // Puis la ligne en DB
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

  // === Le selected type courant (pour savoir si needsPeriod) ===
  var selectedMeta = getMeta(selectedType)
  var needsPeriod = (context === "contract") && selectedMeta && selectedMeta.needsPeriod

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
            + Ajouter
          </button>
        )}
      </div>

      {/* Form d'ajout */}
      {showUpload && (
        <div style={{ background: "#FAFAFA", border: "2px solid #FF82D7", borderRadius: 6, padding: 12, marginBottom: 10 }}>
          <div className="fg2">
            <div className="fg">
              <label className="lbl">Type de document</label>
              <select
                className="inp"
                value={selectedType}
                onChange={function (e) { setSelectedType(e.target.value) }}
              >
                {DOC_TYPES.map(function (t) {
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
            var meta = getMeta(doc.doc_type)
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
                <div style={{ fontSize: 22 }}>{meta.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>
                    {doc.label || meta.label}
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.6 }}>
                    {meta.label}
                    {doc.period_month && (" · " + formatPeriodMonth(doc.period_month))}
                    {doc.size_bytes && (" · " + formatFileSize(doc.size_bytes))}
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
