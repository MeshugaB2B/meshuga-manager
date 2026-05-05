// ============================================================
// EmployeeDetail.tsx
// ============================================================
// Modal "fiche salarié" qui affiche :
//   - Les informations personnelles (édition possible)
//   - Le composant DocumentsManager pour les docs persistants (CNI, Sécu, etc.)
//   - La liste des contrats du salarié
//
// Props:
//   - employee: l'objet hr_employees
//   - onClose: callback fermeture
//   - onContractClick?: callback (contract) => void  pour ouvrir un contrat
//   - onSaved?: callback après save infos perso
//
// SWC-safe : var dans JSX, pas de generics, function(){} partout
// ============================================================

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import DocumentsManager from "./DocumentsManager"
import {
  NATIONALITES,
  CONTRACT_TYPES,
  getContractTypeMeta,
  capitalize
} from "./rhConstants"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

export default function EmployeeDetail(props) {
  var initialEmp = props.employee
  var [emp, setEmp] = useState(initialEmp)
  var [contracts, setContracts] = useState([])
  var [loadingContracts, setLoadingContracts] = useState(true)
  var [saving, setSaving] = useState(false)
  var [editing, setEditing] = useState(false)
  var [tab, setTab] = useState(props.defaultTab || "infos") // "infos" | "documents" | "contrats"

  // === Charge les contrats du salarié ===
  async function loadContracts() {
    if (!emp || !emp.id) return
    setLoadingContracts(true)
    var res = await supabase
      .from("hr_contracts")
      .select("*")
      .eq("employee_id", emp.id)
      .order("created_at", { ascending: false })
    setContracts(res.data || [])
    setLoadingContracts(false)
  }

  useEffect(function () { loadContracts() }, [emp.id])

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
      if (props.onSaved) props.onSaved("Salarié mis à jour ✓")
    }
    setSaving(false)
  }

  // === Suppression du salarié (cascade : contrats + docs) ===
  async function deleteEmployee() {
    if (!confirm(
      "⚠️ SUPPRESSION IRRÉVERSIBLE\n\n" +
      "Tu vas supprimer " + emp.prenom + " " + (emp.nom || "").toUpperCase() + " et tout son contenu :\n" +
      "  • Sa fiche personnelle\n" +
      "  • Ses " + contracts.length + " contrat(s)\n" +
      "  • Toutes les vacations associées\n" +
      "  • Tous ses documents persistants (CNI, RIB, etc.)\n" +
      "  • Tous les documents de ses contrats (fiches de paie, etc.)\n\n" +
      "Cette action ne peut pas être annulée. Continuer ?"
    )) return

    setSaving(true)
    try {
      // 1. Récupérer tous les paths storage à supprimer
      var empDocs = await supabase.from("hr_employee_documents")
        .select("file_path").eq("employee_id", emp.id)
      var contractIds = contracts.map(function (c) { return c.id })
      var contDocs = { data: [] }
      if (contractIds.length > 0) {
        contDocs = await supabase.from("hr_contract_documents")
          .select("file_path").in("contract_id", contractIds)
      }

      // 2. Supprimer les fichiers storage (ignore erreurs)
      var empPaths = (empDocs.data || []).map(function (d) { return d.file_path })
      var contPaths = (contDocs.data || []).map(function (d) { return d.file_path })
      if (empPaths.length > 0) {
        await supabase.storage.from("hr-employee-docs").remove(empPaths)
      }
      if (contPaths.length > 0) {
        await supabase.storage.from("hr-contract-docs").remove(contPaths)
      }

      // 3. Supprimer le salarié (cascade FK supprime contrats, vacations, docs en DB)
      var del = await supabase.from("hr_employees").delete().eq("id", emp.id)
      if (del.error) throw del.error

      if (props.onDeleted) props.onDeleted(emp.prenom + " " + (emp.nom || "") + " supprimé(e)")
      props.onClose()
    } catch (err) {
      alert("Erreur suppression : " + (err.message || err))
      setSaving(false)
    }
  }

  // === Format date FR ===
  function fmtDate(d) {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("fr-FR")
  }

  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl" style={{ maxWidth: 800 }}>
        {/* HEADER */}
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mt">
              👤 {emp.prenom} {(emp.nom || "").toUpperCase()}
            </div>
            <button className="btn btn-sm" onClick={props.onClose} style={{ background: "#FFFFFF" }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
            {[
              { key: "infos", label: "📋 Informations" },
              { key: "documents", label: "📁 Documents" },
              { key: "contrats", label: "📄 Contrats (" + contracts.length + ")" }
            ].map(function (t) {
              return (
                <button
                  key={t.key}
                  onClick={function () { setTab(t.key) }}
                  style={{
                    flex: "1 1 0",
                    padding: "8px 4px",
                    background: tab === t.key ? "#FFEB5A" : "#FFFFFF",
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
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* BODY */}
        <div className="mb" style={{ maxHeight: "65vh", overflowY: "auto" }}>

          {/* === ONGLET INFOS === */}
          {tab === "infos" && (
            <div>
              {!editing ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                    <div><b>Civilité :</b> {emp.civilite || "—"}</div>
                    <div><b>Nationalité :</b> {emp.nationalite ? capitalize(emp.nationalite) : "—"}</div>
                    <div><b>Né(e) le :</b> {fmtDate(emp.date_naissance)}</div>
                    <div><b>Lieu de naissance :</b> {emp.lieu_naissance || "—"}</div>
                    <div style={{ gridColumn: "1 / span 2" }}>
                      <b>Adresse :</b> {emp.adresse || "—"}
                      {(emp.code_postal || emp.ville) && (<span> · {emp.code_postal || ""} {emp.ville || ""}</span>)}
                    </div>
                    <div><b>N° Sécu sociale :</b> {emp.num_secu || "—"}</div>
                    <div></div>
                    <div><b>Email :</b> {emp.email ? <a href={"mailto:" + emp.email} style={{ color: "#FF82D7" }}>{emp.email}</a> : "—"}</div>
                    <div><b>Téléphone :</b> {emp.telephone ? <a href={"tel:" + emp.telephone} style={{ color: "#FF82D7" }}>{emp.telephone}</a> : "—"}</div>
                  </div>
                  {emp.notes && (
                    <div style={{ marginTop: 16, padding: 10, background: "#FFF8E1", borderLeft: "3px solid #FF82D7", borderRadius: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 4 }}>📝 Notes :</div>
                      <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>{emp.notes}</div>
                    </div>
                  )}
                  <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      className="btn btn-sm btn-red"
                      onClick={deleteEmployee}
                      disabled={saving}
                      title="Supprimer définitivement ce salarié"
                    >🗑 Supprimer le salarié</button>
                    <button className="btn btn-p" onClick={function () { setEditing(true) }}>
                      ✏️ Modifier
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="fg2">
                    <div className="fg">
                      <label className="lbl">Civilité</label>
                      <select
                        className="inp"
                        value={emp.civilite || "Madame"}
                        onChange={function (e) { setEmp(Object.assign({}, emp, { civilite: e.target.value })) }}
                      >
                        <option value="Madame">Madame</option>
                        <option value="Monsieur">Monsieur</option>
                        <option value="Mademoiselle">Mademoiselle</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label className="lbl">Nationalité</label>
                      <input
                        className="inp" list="nat-list-detail"
                        value={emp.nationalite ? capitalize(emp.nationalite) : ""}
                        onChange={function (e) {
                          // On stocke en lowercase (cohérence avec la liste + le contrat),
                          // mais on affiche toujours capitalisé
                          setEmp(Object.assign({}, emp, { nationalite: (e.target.value || "").toLowerCase() }))
                        }}
                        placeholder="Tape les premières lettres..."
                      />
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
                    <label className="lbl">Notes internes (visibles ici uniquement)</label>
                    <textarea
                      className="inp"
                      rows={3}
                      value={emp.notes || ""}
                      onChange={function (e) { setEmp(Object.assign({}, emp, { notes: e.target.value })) }}
                      placeholder="Ex: Recommandé(e) par X. Disponible le week-end. Permis B."
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                    <button className="btn" onClick={function () { setEmp(initialEmp); setEditing(false) }} disabled={saving}>
                      Annuler
                    </button>
                    <button className="btn btn-p" onClick={saveInfos} disabled={saving}>
                      {saving ? "Sauvegarde..." : "💾 Enregistrer"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === ONGLET DOCUMENTS === */}
          {tab === "documents" && (
            <div>
              <div style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "10px 14px", marginBottom: 12, fontSize: 11.5, lineHeight: 1.5 }}>
                💡 Ces documents suivent le salarié(e) et sont disponibles pour tous ses contrats actuels et futurs.<br />
                <span style={{ fontSize: 10, opacity: 0.7 }}>Ex : pièce d'identité, carte sécu, RIB, diplômes...</span>
              </div>
              <DocumentsManager context="employee" parentId={emp.id} />
            </div>
          )}

          {/* === ONGLET CONTRATS === */}
          {tab === "contrats" && (
            <div>
              {loadingContracts ? (
                <div style={{ padding: 20, textAlign: "center", opacity: 0.5 }}>Chargement...</div>
              ) : contracts.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "#999", fontStyle: "italic" }}>
                  Aucun contrat pour ce salarié.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {contracts.map(function (c) {
                    var meta = getContractTypeMeta(c.type || "extra")
                    return (
                      <div
                        key={c.id}
                        onClick={function () { if (props.onContractClick) props.onContractClick(c) }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "auto 1fr auto auto",
                          gap: 10,
                          padding: 10,
                          background: "#FFFFFF",
                          border: "1px solid #DDD",
                          borderRadius: 6,
                          cursor: props.onContractClick ? "pointer" : "default",
                          alignItems: "center"
                        }}
                      >
                        <span style={{
                          background: meta.color,
                          color: "#191923",
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 900,
                          textTransform: "uppercase"
                        }}>
                          {meta.icon} {meta.label.replace("CDI ", "")}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.fonction || "—"}</div>
                          <div style={{ fontSize: 10, opacity: 0.6 }}>
                            {c.type === "extra"
                              ? ("Du " + fmtDate(c.date_debut) + " au " + fmtDate(c.date_fin))
                              : ("Embauche : " + fmtDate(c.date_embauche || c.date_debut))}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 900 }}>
                          {(c.type !== "extra" && c.salaire_brut_mensuel)
                            ? c.salaire_brut_mensuel + " €/mois"
                            : (c.taux_horaire_brut ? c.taux_horaire_brut + " €/h" : "—")}
                        </div>
                        <span className="badge" style={{ background: "#888", color: "#FFFFFF", borderColor: "#888" }}>
                          {c.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
