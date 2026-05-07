// ============================================================
// RhWizard.tsx
// ============================================================
// Wizard intelligent pour créer / éditer un contrat de travail Meshuga.
// Routage par type de contrat : Extra (CDD usage) ou CDI (3 templates).
//
// Étape 0 : Choix du type (uniquement nouveau contrat)
// Étape 1 : Salarié
// Étape 2 : Fonction & période d'essai (CDI) ou Mission (Extra)
// Étape 3 : Rémunération (CDI) ou Planning des vacations (Extra)
// Étape 4 : Missions / Clauses optionnelles (CDI uniquement) ou Récap (Extra)
// Étape 5 : Récap + Preview + Sauvegarde (CDI uniquement)
//
// Garde-fous légaux en temps réel :
//   - SMIC respecté (bloquant)
//   - Minimum CCN respecté (warning visible)
//   - Période d'essai max selon niveau (cap auto)
//   - Heures sup auto-calculées si > 35h
//   - Alerte cadre (~500€/mois charges patronales en plus)
// ============================================================

import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import {
  NATIONALITES,
  CCN_GRILLE,
  CCN_KEYS,
  SMIC_2026,
  CONTRACT_TYPES,
  getContractTypeMeta,
  numToFrenchWords,
  calcTauxHoraireBase,
  checkSmic,
  checkCcnMinimum,
  checkPeriodeEssai,
  periodeEssaiMax,
  formatEuros,
  formatDateFr,
  MISSIONS_CADRE_DEFAULT,
  MISSIONS_CUISINIER,
  MISSIONS_CAISSIER
} from "./rhConstants"
import { buildContract } from "./contractBuilders"
import DocumentsManager from "./DocumentsManager"

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ============================================================
// HELPERS
// ============================================================
function diffMin(a, b) {
  if (!a || !b) return 0
  var pa = a.split(":")
  var pb = b.split(":")
  if (pa.length < 2 || pb.length < 2) return 0
  var ma = (+pa[0]) * 60 + (+pa[1])
  var mb = (+pb[0]) * 60 + (+pb[1])
  if (mb < ma) mb += 24 * 60
  return mb - ma
}

// Empty employee state
function emptyEmp() {
  return {
    civilite: "Madame",
    prenom: "",
    nom: "",
    date_naissance: "",
    lieu_naissance: "",
    nationalite: "française",
    adresse: "",
    code_postal: "",
    ville: "",
    num_secu: "",
    email: "",
    telephone: "",
    // Bonne pratique RH (non obligatoire DPAE)
    marital_status: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
    // Formation HACCP (1 personne formée minimum par établissement — décret 24/06/2011)
    haccp_done: false,
    haccp_date: "",
    haccp_certificate_doc_id: null
  }
}

// Empty contract state (fields shared)
function emptyContract() {
  return {
    type: "",
    // Extra
    motif: "",
    date_debut: "",
    date_fin: "",
    classification: "",
    taux_horaire_brut: "17",
    taux_horaire_lettres: "dix-sept",
    // CDI
    date_embauche: "",
    fonction: "",
    niveau_ccn: "",
    echelon_ccn: "",
    statut_cadre: "non-cadre",
    salaire_brut_mensuel: "",
    salaire_lettres: "",
    heures_hebdo: "35",
    heures_mensuelles: "",
    heures_sup_structurelles: "",
    periode_essai_mois: "2",
    periode_essai_renouvelable: true,
    clause_mobilite: false,
    clause_mobilite_zone: "région Île-de-France",
    interessement_active: false,
    interessement_taux_pct: "10",
    interessement_assiette: "le chiffre d'affaires HT B2B encaissé",
    interessement_periodicite: "mensuelle ou trimestrielle, au choix de l'Employeur",
    missions_blocks: [],
    contract_label: "",
    // Communs — préremplis avec les organismes Meshuga (overridables au cas par cas)
    service_sante_travail: "EFFICIENCE — Centre Vaugirard, 64 rue de Vaugirard, 75006 Paris",
    prevoyance_organisme: "Gan Eurocourtage Vie",
    prevoyance_adresse: "8-10 rue d'Astorg, 75008 Paris",
    ville_signature: "Paris",
    date_signature: ""
  }
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function RhWizard(props) {
  var existing = props.existing
  var [step, setStep] = useState(existing ? 1 : 0)
  var [saving, setSaving] = useState(false)
  var [previewHtml, setPreviewHtml] = useState("")
  var [employees, setEmployees] = useState([])

  // ===== Salarié =====
  var [empMode, setEmpMode] = useState(existing && existing.employee_id ? "existing" : "new")
  var [selectedEmpId, setSelectedEmpId] = useState(existing ? existing.employee_id : "")
  var [emp, setEmp] = useState(emptyEmp())

  // ===== Contrat =====
  var [contract, setContract] = useState(emptyContract())

  // ===== Vacations (Extra uniquement) =====
  var [vacations, setVacations] = useState([])

  // ===== Charger les employés disponibles =====
  useEffect(function () {
    supabase.from("hr_employees").select("*").order("nom").then(function (r) {
      setEmployees(r.data || [])
    })
  }, [])

  // ===== Pré-remplir si édition d'un contrat existant =====
  useEffect(function () {
    if (!existing) return
    var c = emptyContract()
    for (var k in c) {
      if (existing[k] !== undefined && existing[k] !== null) c[k] = existing[k]
    }
    c.type = existing.type || "extra"
    // Convertir nombres en string pour les inputs
    if (existing.taux_horaire_brut !== null && existing.taux_horaire_brut !== undefined) {
      c.taux_horaire_brut = String(existing.taux_horaire_brut)
    }
    if (existing.salaire_brut_mensuel !== null && existing.salaire_brut_mensuel !== undefined) {
      c.salaire_brut_mensuel = String(existing.salaire_brut_mensuel)
    }
    if (existing.heures_hebdo !== null && existing.heures_hebdo !== undefined) {
      c.heures_hebdo = String(existing.heures_hebdo)
    }
    if (existing.periode_essai_mois !== null && existing.periode_essai_mois !== undefined) {
      c.periode_essai_mois = String(existing.periode_essai_mois)
    }
    if (existing.interessement_taux_pct !== null && existing.interessement_taux_pct !== undefined) {
      c.interessement_taux_pct = String(existing.interessement_taux_pct)
    }
    setContract(c)
    if (existing.hr_contract_vacations && existing.hr_contract_vacations.length) {
      setVacations(existing.hr_contract_vacations.map(function (v, i) {
        return {
          id: "v" + i,
          date_vacation: v.date_vacation || "",
          heure_debut: v.heure_debut || "",
          heure_fin: v.heure_fin || ""
        }
      }))
    }
  }, [])

  // ===== Charger les données du salarié sélectionné =====
  useEffect(function () {
    if (empMode !== "existing" || !selectedEmpId) return
    var found = null
    for (var i = 0; i < employees.length; i++) {
      if (employees[i].id === selectedEmpId) { found = employees[i]; break }
    }
    if (found) {
      var e = emptyEmp()
      for (var k in e) { if (found[k] !== undefined && found[k] !== null) e[k] = found[k] }
      setEmp(e)
    }
  }, [selectedEmpId, employees, empMode])

  // ===== Auto-update salaire en lettres + heures mensuelles =====
  useEffect(function () {
    if (contract.type === "extra") return
    var s = parseFloat(contract.salaire_brut_mensuel)
    var h = parseFloat(contract.heures_hebdo)
    if (isNaN(s) || isNaN(h)) return
    var hMens = h * 52 / 12
    var hSup = Math.max(0, hMens - 151.67)
    var newC = Object.assign({}, contract, {
      salaire_lettres: numToFrenchWords(s),
      heures_mensuelles: hMens.toFixed(2),
      heures_sup_structurelles: hSup.toFixed(2)
    })
    // Évite boucle infinie
    if (newC.salaire_lettres !== contract.salaire_lettres
      || newC.heures_mensuelles !== contract.heures_mensuelles
      || newC.heures_sup_structurelles !== contract.heures_sup_structurelles) {
      setContract(newC)
    }
  }, [contract.salaire_brut_mensuel, contract.heures_hebdo, contract.type])

  // ===== Auto-cap période d'essai selon niveau CCN =====
  useEffect(function () {
    if (contract.type === "extra") return
    var niveauKey = contract.niveau_ccn && contract.echelon_ccn ? contract.niveau_ccn + "-" + contract.echelon_ccn : ""
    if (!niveauKey) return
    var max = periodeEssaiMax(niveauKey)
    var pe = parseInt(contract.periode_essai_mois, 10)
    var updates = {}
    if (!isNaN(pe) && pe > max.initiale) {
      updates.periode_essai_mois = String(max.initiale)
    }
    if (CCN_GRILLE[niveauKey]) {
      var statutFromNiveau = CCN_GRILLE[niveauKey].statut
      if (statutFromNiveau !== contract.statut_cadre) {
        updates.statut_cadre = statutFromNiveau
      }
    }
    if (Object.keys(updates).length > 0) {
      setContract(Object.assign({}, contract, updates))
    }
  }, [contract.niveau_ccn, contract.echelon_ccn])

  // ===== Type → Auto-load missions par défaut =====
  useEffect(function () {
    if (!contract.type || contract.type === "extra") return
    if (contract.missions_blocks && contract.missions_blocks.length) return // déjà rempli
    var defaults = []
    if (contract.type === "cdi_cadre") defaults = MISSIONS_CADRE_DEFAULT
    else if (contract.type === "cdi_cuisinier") defaults = MISSIONS_CUISINIER
    else if (contract.type === "cdi_caissier") defaults = MISSIONS_CAISSIER
    if (defaults.length) {
      setContract(Object.assign({}, contract, { missions_blocks: JSON.parse(JSON.stringify(defaults)) }))
    }
  }, [contract.type])

  // ===== Vacations helpers =====
  function addVac() {
    setVacations(function (vs) { return vs.concat([{ id: "v" + Date.now(), date_vacation: "", heure_debut: "", heure_fin: "" }]) })
  }
  function delVac(id) {
    setVacations(function (vs) { return vs.filter(function (v) { return v.id !== id }) })
  }
  function updVac(id, field, value) {
    setVacations(function (vs) {
      return vs.map(function (v) {
        if (v.id !== id) return v
        var nv = {}; for (var k in v) nv[k] = v[k]
        nv[field] = value
        return nv
      })
    })
  }

  // ===== Missions blocks helpers =====
  function updateMissionItem(blockIdx, itemIdx, value) {
    var blocks = JSON.parse(JSON.stringify(contract.missions_blocks))
    blocks[blockIdx].items[itemIdx] = value
    setContract(Object.assign({}, contract, { missions_blocks: blocks }))
  }
  function addMissionItem(blockIdx) {
    var blocks = JSON.parse(JSON.stringify(contract.missions_blocks))
    blocks[blockIdx].items.push("")
    setContract(Object.assign({}, contract, { missions_blocks: blocks }))
  }
  function delMissionItem(blockIdx, itemIdx) {
    var blocks = JSON.parse(JSON.stringify(contract.missions_blocks))
    blocks[blockIdx].items.splice(itemIdx, 1)
    setContract(Object.assign({}, contract, { missions_blocks: blocks }))
  }
  function updateMissionTitle(blockIdx, value) {
    var blocks = JSON.parse(JSON.stringify(contract.missions_blocks))
    blocks[blockIdx].title = value
    setContract(Object.assign({}, contract, { missions_blocks: blocks }))
  }
  function addMissionBlock() {
    var blocks = JSON.parse(JSON.stringify(contract.missions_blocks))
    var letter = String.fromCharCode(65 + blocks.length) // A, B, C...
    blocks.push({ title: letter + ". Nouveau bloc", items: [""] })
    setContract(Object.assign({}, contract, { missions_blocks: blocks }))
  }
  function delMissionBlock(blockIdx) {
    if (!confirm("Supprimer ce bloc de missions ?")) return
    var blocks = JSON.parse(JSON.stringify(contract.missions_blocks))
    blocks.splice(blockIdx, 1)
    setContract(Object.assign({}, contract, { missions_blocks: blocks }))
  }

  // ===== Validations bloquantes =====
  var niveauKey = contract.niveau_ccn && contract.echelon_ccn ? contract.niveau_ccn + "-" + contract.echelon_ccn : ""
  var calc = (contract.type !== "extra")
    ? calcTauxHoraireBase(contract.salaire_brut_mensuel, contract.heures_hebdo)
    : null
  var smicCheck = (calc && calc.taux_base) ? checkSmic(calc.taux_base) : { ok: true }
  var ccnCheck = (calc && calc.taux_base && niveauKey) ? checkCcnMinimum(calc.taux_base, niveauKey) : { ok: true }
  var peCheck = (contract.type !== "extra")
    ? checkPeriodeEssai(contract.periode_essai_mois, contract.periode_essai_renouvelable, niveauKey)
    : { ok: true }

  // ===== Génération preview =====
  function generatePreview() {
    var html = buildContract(contract, emp, vacations, "")
    setPreviewHtml(html)
  }

  // ===== Sauvegarde =====
  async function saveDraft() {
    setSaving(true)
    try {
      var empId = selectedEmpId
      if (empMode === "new") {
        var insE = await supabase.from("hr_employees").insert([emp]).select().single()
        if (insE.error) throw insE.error
        empId = insE.data.id
      } else if (empMode === "existing" && existing && existing.employee_id) {
        await supabase.from("hr_employees").update(emp).eq("id", existing.employee_id)
      }

      // Construire l'objet à sauvegarder selon le type
      var contractData = {
        employee_id: empId,
        type: contract.type,
        contract_label: contract.contract_label || (getContractTypeMeta(contract.type).label + " · " + (emp.prenom || "") + " " + (emp.nom || "")),
        ville_signature: contract.ville_signature,
        date_signature: contract.date_signature || null,
        service_sante_travail: contract.service_sante_travail || null,
        prevoyance_organisme: contract.prevoyance_organisme || null,
        prevoyance_adresse: contract.prevoyance_adresse || null,
        status: "draft"
      }

      if (contract.type === "extra") {
        contractData.motif = contract.motif
        contractData.date_debut = contract.date_debut || null
        contractData.date_fin = contract.date_fin || null
        contractData.fonction = contract.fonction
        contractData.classification = contract.classification
        contractData.taux_horaire_brut = contract.taux_horaire_brut ? parseFloat(contract.taux_horaire_brut) : null
        contractData.taux_horaire_lettres = contract.taux_horaire_lettres
      } else {
        // CDI
        contractData.date_embauche = contract.date_embauche || null
        contractData.date_debut = contract.date_embauche || null // alias
        contractData.fonction = contract.fonction
        contractData.niveau_ccn = contract.niveau_ccn || null
        contractData.echelon_ccn = contract.echelon_ccn || null
        contractData.statut_cadre = contract.statut_cadre || "non-cadre"
        contractData.salaire_brut_mensuel = contract.salaire_brut_mensuel ? parseFloat(contract.salaire_brut_mensuel) : null
        contractData.salaire_lettres = contract.salaire_lettres
        contractData.heures_hebdo = contract.heures_hebdo ? parseFloat(contract.heures_hebdo) : null
        contractData.heures_mensuelles = contract.heures_mensuelles ? parseFloat(contract.heures_mensuelles) : null
        contractData.heures_sup_structurelles = contract.heures_sup_structurelles ? parseFloat(contract.heures_sup_structurelles) : null
        contractData.periode_essai_mois = contract.periode_essai_mois ? parseInt(contract.periode_essai_mois, 10) : null
        contractData.periode_essai_renouvelable = contract.periode_essai_renouvelable
        contractData.clause_mobilite = contract.clause_mobilite
        contractData.clause_mobilite_zone = contract.clause_mobilite_zone || null
        contractData.interessement_active = contract.interessement_active
        contractData.interessement_taux_pct = contract.interessement_taux_pct ? parseFloat(contract.interessement_taux_pct) : null
        contractData.interessement_assiette = contract.interessement_assiette || null
        contractData.interessement_periodicite = contract.interessement_periodicite || null
        contractData.missions_blocks = contract.missions_blocks || []
      }

      var contractId
      if (existing) {
        var upd = await supabase.from("hr_contracts").update(contractData).eq("id", existing.id).select().single()
        if (upd.error) throw upd.error
        contractId = existing.id
        await supabase.from("hr_contract_vacations").delete().eq("contract_id", contractId)
      } else {
        var ins = await supabase.from("hr_contracts").insert([contractData]).select().single()
        if (ins.error) throw ins.error
        contractId = ins.data.id
      }

      // Vacations (Extra uniquement)
      if (contract.type === "extra") {
        var vacRows = []
        vacations.forEach(function (v, i) {
          if (v.date_vacation && v.heure_debut && v.heure_fin) {
            vacRows.push({
              contract_id: contractId,
              date_vacation: v.date_vacation,
              heure_debut: v.heure_debut,
              heure_fin: v.heure_fin,
              ordre: i
            })
          }
        })
        if (vacRows.length) {
          await supabase.from("hr_contract_vacations").insert(vacRows)
        }
      }

      props.onSaved("Brouillon enregistré ✓")
    } catch (err) {
      alert("Erreur : " + (err.message || err))
      setSaving(false)
    }
  }

  // ===== Détermination du nombre d'étapes selon le type =====
  // Étapes (après ajout HACCP) :
  //   0: type | 1: Salarié | 2: HACCP | 3: Mission/Poste
  //   4: Planning/Salaire | 5: Récap-Extra ou Missions-CDI | 6: Récap-CDI
  var isExtra = (contract.type === "extra")
  var maxStep = isExtra ? 5 : 6

  // ===== RENDER =====
  return (
    <div className="overlay" onClick={function (e) { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="modal modal-xl">
        {/* HEADER */}
        <div className="mh">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="mt">
              {existing
                ? "Éditer le contrat"
                : (contract.type
                    ? "Nouveau " + getContractTypeMeta(contract.type).label.toLowerCase()
                    : "Nouvel embauche")}
            </div>
            <button className="btn btn-sm" onClick={props.onClose} style={{ background: "#FFFFFF" }}>×</button>
          </div>
          {/* Stepper - n'affiche que les étapes utiles */}
          {contract.type && (
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5].concat(isExtra ? [] : [6]).map(function (n) {
                return (
                  <button
                    key={n}
                    onClick={function () { setStep(n) }}
                    style={{
                      flex: "1 1 0",
                      padding: "8px 4px",
                      background: step === n ? "#FFEB5A" : "#FFFFFF",
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
                    {n}. {labelForStep(n, isExtra)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="mb" style={{ maxHeight: "65vh", overflowY: "auto" }}>

          {/* === ÉTAPE 0 : Choix du type === */}
          {step === 0 && (
            <Step0TypeChoice onChoose={function (typeKey) {
              setContract(Object.assign({}, contract, { type: typeKey }))
              setStep(1)
            }} />
          )}

          {/* === ÉTAPE 1 : Salarié === */}
          {step === 1 && contract.type && (
            <Step1Employee
              empMode={empMode} setEmpMode={setEmpMode}
              selectedEmpId={selectedEmpId} setSelectedEmpId={setSelectedEmpId}
              employees={employees}
              emp={emp} setEmp={setEmp}
            />
          )}

          {/* === ÉTAPE 2 : Formation HACCP (NOUVELLE) === */}
          {step === 2 && contract.type && (
            <Step2Haccp
              emp={emp} setEmp={setEmp}
              empMode={empMode}
              selectedEmpId={selectedEmpId}
            />
          )}

          {/* === ÉTAPE 3 : Mission (Extra) ou Poste (CDI) === */}
          {step === 3 && isExtra && (
            <Step2ExtraMission contract={contract} setContract={setContract} />
          )}
          {step === 3 && !isExtra && contract.type && (
            <Step2CdiPosition
              contract={contract} setContract={setContract}
              niveauKey={niveauKey} peCheck={peCheck}
            />
          )}

          {/* === ÉTAPE 4 : Planning (Extra) ou Rémunération (CDI) === */}
          {step === 4 && isExtra && (
            <Step3ExtraPlanning
              vacations={vacations} addVac={addVac} delVac={delVac} updVac={updVac}
            />
          )}
          {step === 4 && !isExtra && contract.type && (
            <Step3CdiSalary
              contract={contract} setContract={setContract}
              calc={calc} smicCheck={smicCheck} ccnCheck={ccnCheck} niveauKey={niveauKey}
            />
          )}

          {/* === ÉTAPE 5 : Récap (Extra) ou Missions (CDI) === */}
          {step === 5 && isExtra && (
            <Step4Recap
              contract={contract} setContract={setContract} emp={emp}
              previewHtml={previewHtml} generatePreview={generatePreview}
              existingContractId={existing ? existing.id : null}
            />
          )}
          {step === 5 && !isExtra && contract.type && (
            <Step4CdiMissions
              contract={contract} setContract={setContract}
              updateMissionItem={updateMissionItem}
              addMissionItem={addMissionItem}
              delMissionItem={delMissionItem}
              updateMissionTitle={updateMissionTitle}
              addMissionBlock={addMissionBlock}
              delMissionBlock={delMissionBlock}
            />
          )}

          {/* === ÉTAPE 6 : Récap CDI === */}
          {step === 6 && !isExtra && contract.type && (
            <Step4Recap
              contract={contract} setContract={setContract} emp={emp}
              previewHtml={previewHtml} generatePreview={generatePreview}
              existingContractId={existing ? existing.id : null}
            />
          )}
        </div>

        {/* FOOTER */}
        <div className="mf">
          {step > 1 && (
            <button className="btn" onClick={function () { setStep(step - 1) }}>← Précédent</button>
          )}
          {step >= 1 && step < maxStep && contract.type && (
            <button className="btn btn-p" onClick={function () { setStep(step + 1) }}>Suivant →</button>
          )}
          {step === maxStep && (
            <button className="btn btn-p" onClick={saveDraft} disabled={saving}>
              {saving ? "Enregistrement..." : "💾 Enregistrer le brouillon"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper : libellé court pour chaque étape selon type
function labelForStep(n, isExtra) {
  if (isExtra) {
    if (n === 1) return "Salarié"
    if (n === 2) return "HACCP"
    if (n === 3) return "Mission"
    if (n === 4) return "Planning"
    if (n === 5) return "Récap"
  } else {
    if (n === 1) return "Salarié"
    if (n === 2) return "HACCP"
    if (n === 3) return "Poste"
    if (n === 4) return "Salaire"
    if (n === 5) return "Missions"
    if (n === 6) return "Récap"
  }
  return ""
}

// ============================================================
// STEP 0 : Choix du type de contrat (cards visuelles)
// ============================================================
function Step0TypeChoice(props) {
  return (
    <div>
      <div className="ct">Quel type de contrat ?</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16, fontStyle: "italic" }}>
        Le type choisi détermine les étapes suivantes et les clauses appliquées automatiquement.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {CONTRACT_TYPES.map(function (t) {
          return (
            <button
              key={t.key}
              onClick={function () { props.onChoose(t.key) }}
              style={{
                background: t.color,
                color: "#191923",
                border: "2px solid #191923",
                borderRadius: 8,
                padding: "20px 16px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                minHeight: 110
              }}
            >
              <div style={{ fontSize: 32, lineHeight: 1 }}>{t.icon}</div>
              <div style={{ fontWeight: 900, fontSize: 14, textTransform: "uppercase", letterSpacing: ".5px" }}>
                {t.label}
              </div>
              <div style={{ fontSize: 11, fontStyle: "italic", opacity: 0.85 }}>{t.sublabel}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// STEP 1 : Salarié (commun aux 4 types)
// ============================================================
function Step1Employee(props) {
  var emp = props.emp
  var setEmp = props.setEmp
  return (
    <div>
      <div className="ct">Salarié(e)</div>

      {/* Mode : nouveau ou existant */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button
          className={"btn " + (props.empMode === "new" ? "btn-p" : "")}
          onClick={function () { props.setEmpMode("new"); props.setSelectedEmpId(""); props.setEmp(emptyEmp()) }}
        >+ Nouveau salarié</button>
        <button
          className={"btn " + (props.empMode === "existing" ? "btn-p" : "")}
          onClick={function () { props.setEmpMode("existing") }}
        >👥 Salarié existant</button>
      </div>

      {props.empMode === "existing" && (
        <div className="fg" style={{ marginBottom: 14 }}>
          <label className="lbl">Choisir un salarié</label>
          <select
            className="inp"
            value={props.selectedEmpId}
            onChange={function (e) { props.setSelectedEmpId(e.target.value) }}
          >
            <option value="">— Sélectionner —</option>
            {props.employees.map(function (e) {
              return <option key={e.id} value={e.id}>{e.prenom} {e.nom}{e.email ? " · " + e.email : ""}</option>
            })}
          </select>
        </div>
      )}

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Civilité</label>
          <select
            className="inp"
            value={emp.civilite}
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
            className="inp"
            list="nationalities-list"
            value={emp.nationalite}
            onChange={function (e) { setEmp(Object.assign({}, emp, { nationalite: e.target.value })) }}
            placeholder="Tape les premières lettres..."
            autoComplete="off"
          />
          <datalist id="nationalities-list">
            {NATIONALITES.map(function (n) { return <option key={n} value={n} /> })}
          </datalist>
        </div>
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Prénom</label>
          <input className="inp" value={emp.prenom}
            onChange={function (e) { setEmp(Object.assign({}, emp, { prenom: e.target.value })) }} />
        </div>
        <div className="fg">
          <label className="lbl">Nom</label>
          <input className="inp" value={emp.nom}
            onChange={function (e) { setEmp(Object.assign({}, emp, { nom: e.target.value })) }} />
        </div>
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Date de naissance</label>
          <input type="date" className="inp" value={emp.date_naissance}
            onChange={function (e) { setEmp(Object.assign({}, emp, { date_naissance: e.target.value })) }} />
        </div>
        <div className="fg">
          <label className="lbl">Lieu de naissance</label>
          <input className="inp" value={emp.lieu_naissance}
            onChange={function (e) { setEmp(Object.assign({}, emp, { lieu_naissance: e.target.value })) }} placeholder="Paris 16e" />
        </div>
      </div>

      <div className="fg">
        <label className="lbl">Adresse</label>
        <input className="inp" value={emp.adresse}
          onChange={function (e) { setEmp(Object.assign({}, emp, { adresse: e.target.value })) }} placeholder="46 rue de Moscou" />
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Code postal</label>
          <input className="inp" value={emp.code_postal}
            onChange={function (e) { setEmp(Object.assign({}, emp, { code_postal: e.target.value })) }} placeholder="75008" />
        </div>
        <div className="fg">
          <label className="lbl">Ville</label>
          <input className="inp" value={emp.ville}
            onChange={function (e) { setEmp(Object.assign({}, emp, { ville: e.target.value })) }} placeholder="Paris" />
        </div>
      </div>

      <div className="fg">
        <label className="lbl">N° de sécurité sociale</label>
        <input className="inp" value={emp.num_secu}
          onChange={function (e) { setEmp(Object.assign({}, emp, { num_secu: e.target.value })) }} placeholder="2 01 05 75 113 579 48" />
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Email</label>
          <input className="inp" value={emp.email}
            onChange={function (e) { setEmp(Object.assign({}, emp, { email: e.target.value })) }} />
        </div>
        <div className="fg">
          <label className="lbl">Téléphone</label>
          <input className="inp" value={emp.telephone}
            onChange={function (e) { setEmp(Object.assign({}, emp, { telephone: e.target.value })) }} />
        </div>
      </div>

      {/* === Situation familiale (optionnel — bonne pratique RH) === */}
      <div className="ct" style={{ marginTop: 16 }}>
        Situation familiale
        <span style={{ fontSize: 10, fontWeight: 400, fontStyle: "italic", opacity: 0.6, marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>
          non obligatoire DPAE — bonne pratique RH
        </span>
      </div>
      <div className="fg">
        <label className="lbl">Situation</label>
        <select
          className="inp"
          value={emp.marital_status || ""}
          onChange={function (e) { setEmp(Object.assign({}, emp, { marital_status: e.target.value })) }}
        >
          <option value="">— Non renseigné —</option>
          <option value="celibataire">Célibataire</option>
          <option value="marie">Marié(e)</option>
          <option value="pacs">Pacsé(e)</option>
          <option value="divorce">Divorcé(e)</option>
          <option value="veuf">Veuf(ve)</option>
        </select>
      </div>

      {/* === Personne à prévenir en cas d'urgence === */}
      <div className="ct" style={{ marginTop: 16 }}>
        Personne à prévenir en cas d'urgence
        <span style={{ fontSize: 10, fontWeight: 400, fontStyle: "italic", opacity: 0.6, marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>
          non obligatoire — fortement recommandé
        </span>
      </div>
      <div className="fg2">
        <div className="fg">
          <label className="lbl">Nom complet</label>
          <input className="inp" value={emp.emergency_contact_name || ""}
            onChange={function (e) { setEmp(Object.assign({}, emp, { emergency_contact_name: e.target.value })) }}
            placeholder="Ex: Jeanne DUPONT" />
        </div>
        <div className="fg">
          <label className="lbl">Lien de parenté</label>
          <input className="inp" value={emp.emergency_contact_relation || ""}
            onChange={function (e) { setEmp(Object.assign({}, emp, { emergency_contact_relation: e.target.value })) }}
            placeholder="Mère, Père, Conjoint, Ami(e)..." />
        </div>
      </div>
      <div className="fg">
        <label className="lbl">Téléphone</label>
        <input className="inp" value={emp.emergency_contact_phone || ""}
          onChange={function (e) { setEmp(Object.assign({}, emp, { emergency_contact_phone: e.target.value })) }}
          placeholder="06 XX XX XX XX" />
      </div>
    </div>
  )
}

// ============================================================
// STEP 2 (NOUVEAU) : Formation HACCP
// ============================================================
// Hygiène alimentaire — décret du 24 juin 2011 : au moins une personne
// formée HACCP par établissement de restauration commerciale.
// Le certificat (PDF/JPG) sera uploadé après création du salarié,
// depuis sa fiche personnelle dans la section Documents (catégorie HACCP).
// ============================================================
function Step2Haccp(props) {
  var emp = props.emp
  var setEmp = props.setEmp
  return (
    <div>
      <div className="ct">Formation HACCP</div>

      <div style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "10px 14px", marginBottom: 14, fontSize: 11.5, lineHeight: 1.5 }}>
        🥗 <b>Hygiène alimentaire</b> — Le décret du 24 juin 2011 impose qu'au moins une personne formée HACCP soit présente dans tout établissement de restauration commerciale.
        <br />
        <span style={{ fontSize: 10.5, opacity: 0.75, fontStyle: "italic" }}>
          Edward TOURET est formé (CNFSE — 14h, du 06/12/2020 au 09/01/2021). Tu peux indiquer ici si ce salarié est également formé.
        </span>
      </div>

      <div className="fg">
        <label className="lbl">Ce salarié a-t-il suivi une formation HACCP ?</label>
        <div style={{ display: "flex", gap: 18, marginTop: 4 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="haccp_done"
              checked={emp.haccp_done === true}
              onChange={function () { setEmp(Object.assign({}, emp, { haccp_done: true })) }}
            />
            <span>✓ Oui, formation suivie</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="haccp_done"
              checked={emp.haccp_done !== true}
              onChange={function () { setEmp(Object.assign({}, emp, { haccp_done: false, haccp_date: "" })) }}
            />
            <span>✗ Non / À planifier</span>
          </label>
        </div>
      </div>

      {emp.haccp_done === true ? (
        <div>
          <div className="fg" style={{ marginTop: 14 }}>
            <label className="lbl">Date de la formation</label>
            <input
              type="date"
              className="inp"
              value={emp.haccp_date || ""}
              onChange={function (e) { setEmp(Object.assign({}, emp, { haccp_date: e.target.value })) }}
            />
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
              Date de fin de stage indiquée sur le certificat.
            </div>
          </div>

          <div style={{ background: "#FAFAFA", border: "1px dashed #BBBBBB", borderRadius: 6, padding: 12, marginTop: 12, fontSize: 11.5, lineHeight: 1.55 }}>
            📎 <b>Certificat HACCP</b> — Le PDF du certificat se charge depuis la fiche personnelle du salarié,
            dans la section <i>Documents</i>, catégorie <b>HACCP</b>.
            {props.empMode === "new" ? (
              <span><br /><span style={{ color: "#C2185B", fontWeight: 700 }}>→ Enregistre d'abord ce brouillon, puis rouvre la fiche du salarié pour uploader le certificat.</span></span>
            ) : (
              <span><br />→ Tu peux l'uploader maintenant en fermant ce wizard, ou plus tard.</span>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: "#FFF8E1", borderLeft: "3px solid #FFEB5A", padding: "10px 14px", marginTop: 14, fontSize: 11.5, lineHeight: 1.55 }}>
          📅 <b>Formation à planifier</b> auprès de l'organisme <b>CNFSE</b> (Centre National de la Formation, de la Sécurité et de l'Emploi) ou équivalent agréé.
          <br />
          <span style={{ fontSize: 10.5, opacity: 0.75, fontStyle: "italic" }}>
            Une note sera ajoutée au dossier de bienvenue : « Formation HACCP à planifier auprès de CNFSE ».
          </span>
        </div>
      )}

      <div style={{ marginTop: 18, fontSize: 10.5, opacity: 0.6, fontStyle: "italic" }}>
        Source légale : <b>arrêté du 5 octobre 2011</b> relatif au cahier des charges de la formation spécifique en matière d'hygiène alimentaire (CCN 1501 — Restauration Rapide).
      </div>
    </div>
  )
}

// ============================================================
// STEP 2 (Extra) : Mission
// ============================================================
function Step2ExtraMission(props) {
  var contract = props.contract
  var setContract = props.setContract
  return (
    <div>
      <div className="ct">Mission</div>

      <div className="fg">
        <label className="lbl">Motif de recours au CDD d'usage</label>
        <textarea
          className="inp"
          value={contract.motif}
          onChange={function (e) { setContract(Object.assign({}, contract, { motif: e.target.value })) }}
          rows={2}
          placeholder="Ex: Remplacement temporaire pour pic d'activité catering."
        />
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Date de début</label>
          <input type="date" className="inp" value={contract.date_debut}
            onChange={function (e) { setContract(Object.assign({}, contract, { date_debut: e.target.value })) }} />
        </div>
        <div className="fg">
          <label className="lbl">Date de fin</label>
          <input type="date" className="inp" value={contract.date_fin}
            onChange={function (e) { setContract(Object.assign({}, contract, { date_fin: e.target.value })) }} />
        </div>
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Fonction</label>
          <input className="inp" value={contract.fonction}
            onChange={function (e) { setContract(Object.assign({}, contract, { fonction: e.target.value })) }} placeholder="Caissier(ère)" />
        </div>
        <div className="fg">
          <label className="lbl">Classification CCN</label>
          <input className="inp" value={contract.classification}
            onChange={function (e) { setContract(Object.assign({}, contract, { classification: e.target.value })) }} placeholder="Niveau I — Échelon 1" />
        </div>
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Taux horaire brut (€)</label>
          <input
            className="inp" type="number" step="0.01"
            value={contract.taux_horaire_brut}
            onChange={function (e) {
              var v = e.target.value
              setContract(Object.assign({}, contract, {
                taux_horaire_brut: v,
                taux_horaire_lettres: numToFrenchWords(v)
              }))
            }}
            placeholder="17.00"
          />
          {contract.taux_horaire_brut && parseFloat(contract.taux_horaire_brut) < SMIC_2026.horaire && (
            <div style={{ color: "#C2185B", fontSize: 11, marginTop: 4, fontWeight: 700 }}>
              ⚠️ Inférieur au SMIC 2026 ({SMIC_2026.horaire} €/h)
            </div>
          )}
        </div>
        <div className="fg">
          <label className="lbl">En lettres (auto)</label>
          <input
            className="inp"
            value={contract.taux_horaire_lettres}
            onChange={function (e) { setContract(Object.assign({}, contract, { taux_horaire_lettres: e.target.value })) }}
            style={{ background: "#FAFAFA", fontStyle: "italic", color: "#666" }}
          />
        </div>
      </div>

      <div className="ct" style={{ marginTop: 16 }}>Protection sociale</div>
      <div style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "10px 14px", marginBottom: 10, fontSize: 11.5, lineHeight: 1.6 }}>
        ✓ <b>Médecine du travail :</b> Efficience — Centre Vaugirard, 64 rue de Vaugirard, 75006 Paris<br />
        ✓ <b>Retraite complémentaire :</b> KLESIA AGIRC-ARRCO<br />
        ✓ <b>Prévoyance :</b> GAN EUROCOURTAGE VIE<br />
        ✓ <b>Complémentaire santé :</b> APRIL Santé<br />
        <span style={{ fontSize: 10, opacity: 0.7, fontStyle: "italic" }}>Ces 4 organismes sont automatiquement intégrés dans le contrat.</span>
      </div>
      <details style={{ marginBottom: 10, fontSize: 11 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, color: "#666" }}>Cas particulier : remplacer ces organismes pour ce contrat ?</summary>
        <div style={{ marginTop: 10, padding: 10, background: "#FAFAFA", borderRadius: 4 }}>
          <div className="fg">
            <label className="lbl">Service de santé au travail (override)</label>
            <input className="inp" value={contract.service_sante_travail}
              onChange={function (e) { setContract(Object.assign({}, contract, { service_sante_travail: e.target.value })) }} placeholder="Laisser vide = Efficience" />
          </div>
          <div className="fg2">
            <div className="fg">
              <label className="lbl">Organisme de prévoyance (override)</label>
              <input className="inp" value={contract.prevoyance_organisme}
                onChange={function (e) { setContract(Object.assign({}, contract, { prevoyance_organisme: e.target.value })) }} placeholder="Laisser vide = GAN" />
            </div>
            <div className="fg">
              <label className="lbl">Adresse prévoyance (override)</label>
              <input className="inp" value={contract.prevoyance_adresse}
                onChange={function (e) { setContract(Object.assign({}, contract, { prevoyance_adresse: e.target.value })) }} />
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

// ============================================================
// STEP 2 (CDI) : Poste & période d'essai
// ============================================================
function Step2CdiPosition(props) {
  var contract = props.contract
  var setContract = props.setContract
  var niveauKey = props.niveauKey
  var peCheck = props.peCheck
  var max = niveauKey ? periodeEssaiMax(niveauKey) : { initiale: 2, total: 4 }
  var statutFromCcn = niveauKey && CCN_GRILLE[niveauKey] ? CCN_GRILLE[niveauKey].statut : ""

  return (
    <div>
      <div className="ct">Poste et qualification</div>

      <div className="fg">
        <label className="lbl">Date d'embauche</label>
        <input type="date" className="inp" value={contract.date_embauche}
          onChange={function (e) { setContract(Object.assign({}, contract, { date_embauche: e.target.value })) }} />
      </div>

      <div className="fg">
        <label className="lbl">Fonction (intitulé du poste)</label>
        <input className="inp" value={contract.fonction}
          onChange={function (e) { setContract(Object.assign({}, contract, { fonction: e.target.value })) }}
          placeholder={contract.type === "cdi_cadre" ? "Responsable des Opérations et du Développement" : (contract.type === "cdi_cuisinier" ? "Cuisinier(ère)" : "Caissier(ère) / Équipier(ère)")} />
      </div>

      <div className="ct" style={{ marginTop: 14 }}>Classification CCN 1501</div>
      <div className="fg2">
        <div className="fg">
          <label className="lbl">Niveau</label>
          <select className="inp" value={contract.niveau_ccn}
            onChange={function (e) { setContract(Object.assign({}, contract, { niveau_ccn: e.target.value })) }}>
            <option value="">—</option>
            <option value="I">Niveau I (employé débutant)</option>
            <option value="II">Niveau II (employé qualifié)</option>
            <option value="III">Niveau III (employé hautement qualifié)</option>
            <option value="IV">Niveau IV (agent de maîtrise)</option>
            <option value="V">Niveau V (cadre)</option>
          </select>
        </div>
        <div className="fg">
          <label className="lbl">Échelon</label>
          <select className="inp" value={contract.echelon_ccn}
            onChange={function (e) { setContract(Object.assign({}, contract, { echelon_ccn: e.target.value })) }}>
            <option value="">—</option>
            <option value="A">A (débutant)</option>
            <option value="B">B (confirmé)</option>
            <option value="C">C (senior)</option>
            <option value="D">D (expert)</option>
          </select>
        </div>
      </div>

      {niveauKey && CCN_GRILLE[niveauKey] && (
        <div className="note" style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "8px 12px", margin: "8px 0", fontSize: 11.5 }}>
          📊 <b>{CCN_GRILLE[niveauKey].label}</b><br />
          Salaire minimum conventionnel : <b>{CCN_GRILLE[niveauKey].taux_horaire} €/h brut</b> (avenant 72 du 5 juin 2025)
        </div>
      )}

      <div className="fg">
        <label className="lbl">Statut</label>
        <select className="inp" value={contract.statut_cadre}
          onChange={function (e) { setContract(Object.assign({}, contract, { statut_cadre: e.target.value })) }}>
          <option value="non-cadre">Non-cadre</option>
          <option value="agent_maitrise">Agent de maîtrise (non-cadre)</option>
          <option value="cadre">Cadre</option>
        </select>
        {contract.statut_cadre === "cadre" && (
          <div style={{ color: "#C2185B", fontSize: 11, marginTop: 4, fontWeight: 700 }}>
            ⚠️ Statut cadre : ~500 €/mois de charges patronales supplémentaires (AGIRC-ARRCO cadre)
          </div>
        )}
        {statutFromCcn && statutFromCcn !== contract.statut_cadre && (
          <div style={{ color: "#999", fontSize: 11, marginTop: 4, fontStyle: "italic" }}>
            Le niveau {niveauKey} est habituellement <b>{statutFromCcn}</b>.
          </div>
        )}
      </div>

      <div className="ct" style={{ marginTop: 16 }}>Période d'essai</div>
      <div className="fg2">
        <div className="fg">
          <label className="lbl">Durée initiale (mois)</label>
          <input type="number" className="inp" value={contract.periode_essai_mois} min="0" max={max.initiale}
            onChange={function (e) { setContract(Object.assign({}, contract, { periode_essai_mois: e.target.value })) }} />
          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
            Plafond légal pour ce niveau : <b>{max.initiale} mois</b> (renouvelable, total max <b>{max.total} mois</b>)
          </div>
        </div>
        <div className="fg" style={{ display: "flex", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 22 }}>
            <input type="checkbox" checked={contract.periode_essai_renouvelable}
              onChange={function (e) { setContract(Object.assign({}, contract, { periode_essai_renouvelable: e.target.checked })) }} />
            <span>Renouvelable une fois</span>
          </label>
        </div>
      </div>
      {!peCheck.ok && (
        <div style={{ color: "#C2185B", fontSize: 11, marginTop: 4, fontWeight: 700 }}>
          ⚠️ {peCheck.message}
        </div>
      )}

      <div className="ct" style={{ marginTop: 16 }}>Lieu de travail</div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
        <input type="checkbox" checked={contract.clause_mobilite}
          onChange={function (e) { setContract(Object.assign({}, contract, { clause_mobilite: e.target.checked })) }} />
        <span>Ajouter une clause de mobilité</span>
      </label>
      {contract.clause_mobilite && (
        <div className="fg">
          <label className="lbl">Zone de mobilité</label>
          <input className="inp" value={contract.clause_mobilite_zone}
            onChange={function (e) { setContract(Object.assign({}, contract, { clause_mobilite_zone: e.target.value })) }} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// STEP 3 (Extra) : Planning des vacations
// ============================================================
function Step3ExtraPlanning(props) {
  var totalMin = 0
  props.vacations.forEach(function (v) { totalMin += diffMin(v.heure_debut, v.heure_fin) })
  var h = Math.floor(totalMin / 60), m = totalMin % 60

  return (
    <div>
      <div className="ct">Planning des vacations</div>
      {props.vacations.map(function (v) {
        return (
          <div key={v.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <input type="date" className="inp" value={v.date_vacation}
              onChange={function (e) { props.updVac(v.id, "date_vacation", e.target.value) }} />
            <input type="time" className="inp" value={v.heure_debut}
              onChange={function (e) { props.updVac(v.id, "heure_debut", e.target.value) }} />
            <input type="time" className="inp" value={v.heure_fin}
              onChange={function (e) { props.updVac(v.id, "heure_fin", e.target.value) }} />
            <button className="btn btn-sm" onClick={function () { props.delVac(v.id) }}>×</button>
          </div>
        )
      })}
      <button className="btn" onClick={props.addVac} style={{ marginTop: 8 }}>+ Ajouter une vacation</button>
      <div style={{ marginTop: 12, fontWeight: 900 }}>
        Total : {h} h {m < 10 ? "0" : ""}{m}
      </div>
    </div>
  )
}

// ============================================================
// STEP 3 (CDI) : Rémunération
// ============================================================
function Step3CdiSalary(props) {
  var contract = props.contract
  var setContract = props.setContract
  var calc = props.calc
  var smicCheck = props.smicCheck
  var ccnCheck = props.ccnCheck
  var niveauKey = props.niveauKey

  return (
    <div>
      <div className="ct">Rémunération</div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Salaire brut mensuel (€)</label>
          <input type="number" step="0.01" className="inp"
            value={contract.salaire_brut_mensuel}
            onChange={function (e) { setContract(Object.assign({}, contract, { salaire_brut_mensuel: e.target.value })) }}
            placeholder="3006.00" />
        </div>
        <div className="fg">
          <label className="lbl">En lettres (auto)</label>
          <input className="inp"
            value={contract.salaire_lettres}
            onChange={function (e) { setContract(Object.assign({}, contract, { salaire_lettres: e.target.value })) }}
            style={{ background: "#FAFAFA", fontStyle: "italic", color: "#666" }} />
        </div>
      </div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Heures hebdomadaires</label>
          <input type="number" step="0.5" className="inp" min="0" max="48"
            value={contract.heures_hebdo}
            onChange={function (e) { setContract(Object.assign({}, contract, { heures_hebdo: e.target.value })) }}
            placeholder="35" />
        </div>
        <div className="fg">
          <label className="lbl">Heures mensuelles (auto)</label>
          <input className="inp"
            value={contract.heures_mensuelles}
            readOnly
            style={{ background: "#FAFAFA", fontStyle: "italic", color: "#666" }} />
        </div>
      </div>

      {calc && calc.taux_base > 0 && (
        <div className="note" style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "8px 12px", margin: "8px 0", fontSize: 11.5 }}>
          <b>Décomposition automatique :</b><br />
          • Taux horaire de base : <b>{calc.taux_base.toFixed(2)} €/h</b><br />
          • {calc.heures_normales} h au taux normal<br />
          {calc.heures_sup > 0 && <span>• {calc.heures_sup} h supplémentaires majorées 25 %<br /></span>}
        </div>
      )}

      {!smicCheck.ok && (
        <div style={{ background: "#FFEBEE", border: "2px solid #C2185B", padding: "8px 12px", marginTop: 8, fontSize: 11.5, color: "#C2185B", fontWeight: 700 }}>
          🚫 {smicCheck.message}
        </div>
      )}
      {smicCheck.ok && !ccnCheck.ok && (
        <div style={{ background: "#FFF8E1", border: "2px solid #FFA000", padding: "8px 12px", marginTop: 8, fontSize: 11.5, color: "#E65100", fontWeight: 700 }}>
          ⚠️ {ccnCheck.message}
        </div>
      )}

      {/* Intéressement (uniquement Cadre) */}
      {contract.type === "cdi_cadre" && (
        <div style={{ marginTop: 18 }}>
          <div className="ct">Intéressement variable (optionnel)</div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
            <input type="checkbox" checked={contract.interessement_active}
              onChange={function (e) { setContract(Object.assign({}, contract, { interessement_active: e.target.checked })) }} />
            <span>Activer un intéressement variable</span>
          </label>

          {contract.interessement_active && (
            <div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Taux (%)</label>
                  <input type="number" step="0.01" className="inp"
                    value={contract.interessement_taux_pct}
                    onChange={function (e) { setContract(Object.assign({}, contract, { interessement_taux_pct: e.target.value })) }}
                    placeholder="10" />
                </div>
                <div className="fg">
                  <label className="lbl">Périodicité de versement</label>
                  <input className="inp"
                    value={contract.interessement_periodicite}
                    onChange={function (e) { setContract(Object.assign({}, contract, { interessement_periodicite: e.target.value })) }} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Assiette de calcul</label>
                <input className="inp"
                  value={contract.interessement_assiette}
                  onChange={function (e) { setContract(Object.assign({}, contract, { interessement_assiette: e.target.value })) }}
                  placeholder="le chiffre d'affaires HT B2B encaissé" />
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                  La phrase commencera par "calculé sur [votre texte]". Commencez par "le chiffre d'affaires", "les ventes", etc.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ct" style={{ marginTop: 18 }}>Protection sociale</div>
      <div style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "10px 14px", marginBottom: 10, fontSize: 11.5, lineHeight: 1.6 }}>
        ✓ <b>Médecine du travail :</b> Efficience — Centre Vaugirard, 64 rue de Vaugirard, 75006 Paris<br />
        ✓ <b>Retraite complémentaire :</b> KLESIA AGIRC-ARRCO<br />
        ✓ <b>Prévoyance :</b> GAN EUROCOURTAGE VIE<br />
        ✓ <b>Complémentaire santé :</b> APRIL Santé<br />
        <span style={{ fontSize: 10, opacity: 0.7, fontStyle: "italic" }}>Ces 4 organismes sont automatiquement intégrés dans le contrat.</span>
      </div>
      <details style={{ marginBottom: 10, fontSize: 11 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, color: "#666" }}>Cas particulier : remplacer ces organismes pour ce contrat ?</summary>
        <div style={{ marginTop: 10, padding: 10, background: "#FAFAFA", borderRadius: 4 }}>
          <div className="fg">
            <label className="lbl">Service de santé au travail (override)</label>
            <input className="inp" value={contract.service_sante_travail}
              onChange={function (e) { setContract(Object.assign({}, contract, { service_sante_travail: e.target.value })) }} placeholder="Laisser vide = Efficience" />
          </div>
          <div className="fg2">
            <div className="fg">
              <label className="lbl">Organisme de prévoyance (override)</label>
              <input className="inp" value={contract.prevoyance_organisme}
                onChange={function (e) { setContract(Object.assign({}, contract, { prevoyance_organisme: e.target.value })) }} placeholder="Laisser vide = GAN" />
            </div>
            <div className="fg">
              <label className="lbl">Adresse prévoyance (override)</label>
              <input className="inp" value={contract.prevoyance_adresse}
                onChange={function (e) { setContract(Object.assign({}, contract, { prevoyance_adresse: e.target.value })) }} />
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

// ============================================================
// STEP 4 (CDI) : Missions éditables
// ============================================================
function Step4CdiMissions(props) {
  var contract = props.contract
  var blocks = contract.missions_blocks || []
  return (
    <div>
      <div className="ct">Missions principales</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12, fontStyle: "italic" }}>
        Édite les blocs et leurs items. La mention "essentielles, substantielles et non limitatives" sera ajoutée automatiquement avant la liste.
      </div>

      {blocks.map(function (block, bIdx) {
        return (
          <div key={bIdx} style={{ border: "1px solid #DDD", borderRadius: 6, padding: 10, marginBottom: 10, background: "#FAFAFA" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                className="inp"
                value={block.title}
                onChange={function (e) { props.updateMissionTitle(bIdx, e.target.value) }}
                style={{ flex: 1, fontWeight: 900 }}
              />
              <button className="btn btn-sm" onClick={function () { props.delMissionBlock(bIdx) }} title="Supprimer ce bloc">×</button>
            </div>
            {block.items.map(function (item, iIdx) {
              return (
                <div key={iIdx} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <span style={{ color: "#FF82D7", fontWeight: 700, paddingTop: 8 }}>—</span>
                  <input
                    className="inp"
                    value={item}
                    onChange={function (e) { props.updateMissionItem(bIdx, iIdx, e.target.value) }}
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-sm" onClick={function () { props.delMissionItem(bIdx, iIdx) }} style={{ background: "#FFFFFF" }}>×</button>
                </div>
              )
            })}
            <button className="btn btn-sm" onClick={function () { props.addMissionItem(bIdx) }} style={{ marginTop: 6 }}>+ Item</button>
          </div>
        )
      })}

      <button className="btn" onClick={props.addMissionBlock} style={{ marginTop: 8 }}>+ Ajouter un bloc</button>
    </div>
  )
}

// ============================================================
// STEP 4/5 : Récap + preview + signature
// ============================================================
function Step4Recap(props) {
  var contract = props.contract
  var setContract = props.setContract

  return (
    <div>
      <div className="ct">Récapitulatif et signature</div>

      <div className="fg2">
        <div className="fg">
          <label className="lbl">Ville de signature</label>
          <input className="inp" value={contract.ville_signature}
            onChange={function (e) { setContract(Object.assign({}, contract, { ville_signature: e.target.value })) }} />
        </div>
        <div className="fg">
          <label className="lbl">Date de signature</label>
          <input type="date" className="inp" value={contract.date_signature}
            onChange={function (e) { setContract(Object.assign({}, contract, { date_signature: e.target.value })) }} />
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-p" onClick={props.generatePreview}>👁 Générer l'aperçu</button>
      </div>

      {props.previewHtml && (
        <iframe
          srcDoc={props.previewHtml}
          style={{ width: "100%", height: "600px", border: "2px solid #FF82D7", borderRadius: 6, marginTop: 16, background: "#fff" }}
        />
      )}

      {/* Documents liés au contrat (uniquement si déjà sauvé une fois) */}
      {props.existingContractId && (
        <div style={{ marginTop: 20, padding: 12, background: "#FAFAFA", borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontStyle: "italic", color: "#666", marginBottom: 10 }}>
            Documents liés à ce contrat (fiches de paie, attestations...) :
          </div>
          <DocumentsManager context="contract" parentId={props.existingContractId} />
        </div>
      )}

      <div className="note" style={{ background: "#FFF8E1", borderLeft: "3px solid #FF82D7", padding: "10px 14px", marginTop: 16, fontSize: 11.5, lineHeight: 1.5 }}>
        💾 Une fois enregistré comme brouillon, tu pourras revenir éditer ce contrat à tout moment depuis la liste.
        {!props.existingContractId && (
          <span><br />📁 Pour ajouter des documents (fiches de paie, etc.), enregistre d'abord le brouillon puis rouvre-le.</span>
        )}
      </div>
    </div>
  )
}
