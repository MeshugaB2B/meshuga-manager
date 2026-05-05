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
  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [editing, setEditing] = useState(false)
  var [uploadingSignedFor, setUploadingSignedFor] = useState(null)
  var signedFileInputRef = useRef(null)

  // === Charge l'employé + ses contrats ===
  async function load() {
    setLoading(true)
    var resE = await supabase
      .from("hr_employees")
      .select("*")
      .eq("id", props.employeeId)
      .single()
    var resC = await supabase
      .from("hr_contracts")
      .select("*")
      .eq("employee_id", props.employeeId)
      .order("created_at", { ascending: false })
    setEmp(resE.data || null)
    setEmpOriginal(resE.data || null)
    setContracts(resC.data || [])
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

        {/* === HEADER === */}
        <div className="mh" style={{ position: "sticky", top: 0, zIndex: 10, background: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div className="mt" style={{ fontFamily: "Yellowtail, cursive", fontSize: 28, color: "#FF82D7", lineHeight: 1.1 }}>
              👤 {emp.prenom} {(emp.nom || "").toUpperCase()}
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
                // Trouver le 1er contrat en draft/finalized pour upload signé
                var target = contracts.filter(function (c) { return c.status !== "archived" })[0]
                if (target) triggerSignedUpload(target)
                else alert("Pas de contrat actif pour uploader le signé. Crée d'abord un contrat.")
              }}
            >📥 Uploader contrat signé</button>
          </div>
        </div>

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
    </div>
  )
}
