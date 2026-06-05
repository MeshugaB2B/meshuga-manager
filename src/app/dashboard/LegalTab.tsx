"use client"
import { useState, useEffect } from "react"
import { createClient } from "@supabase/supabase-js"
import { LOGO_PINK } from "./logos"

// ============================================================
// Meshuga Légal — Onglet centre de gestion documentaire
// SWC-safe : var dans JSX, pas de generics, function(){}, pas de optional chaining dans deps
// ============================================================

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
)

// === Types d'archives ===
var ARCHIVE_TYPES = [
  {
    id: "temperatures",
    label: "Relevés Températures",
    icon: "🌡️",
    color: "#FF82D7",
    freq: "Hebdomadaire",
    cadence: 10,
    description: "Fiches F1 hebdomadaires de relevé des températures (frigos positifs, saladettes, frigo boissons, congélation)",
    bucket_folder: "temperatures"
  },
  {
    id: "hygiene_nettoyage",
    label: "Relevé Hygiène / Nettoyage",
    icon: "🧼",
    color: "#FFEB5A",
    freq: "Hebdomadaire",
    cadence: 10,
    description: "Fiches F6 audit hygiène hebdomadaire et fiches d'enregistrement nettoyage et désinfection",
    bucket_folder: "hygiene"
  },
  {
    id: "nuisibles",
    label: "Suivi Nuisibles",
    icon: "🐀",
    color: "#191923",
    freq: "Passage bimestriel",
    cadence: 70,
    description: "Bons d'intervention La Science des Nuisibles + relevés des pièges (fiche F7)",
    bucket_folder: "nuisibles"
  },
  {
    id: "huiles_usagees",
    label: "Huiles usagées (Quatra)",
    icon: "🛢️",
    color: "#FF82D7",
    freq: "À chaque collecte",
    cadence: 120,
    description: "Bordereaux de collecte des huiles alimentaires usagées (Quatra) — preuve de filière de valorisation, obligatoire",
    bucket_folder: "huiles"
  }
]

// === Documents de référence pré-saisis (les 8 PDF générés) ===
var REFERENCE_DOCUMENTS = [
  {
    category: "legal_social",
    label: "Légal & Social",
    items: [
      {key: "classeur_conformite", name: "Classeur Conformité Réglementaire", description: "Sommaire + 16 affichages obligatoires + DUERP intégré (33 pages)"},
      {key: "affichages_placard", name: "Affichages Placard Personnel", description: "Pack condensé 8 affiches A à H pour le placard du personnel"},
      {key: "registre_personnel", name: "Registre du Personnel", description: "Article L.1221-13 du Code du travail · Tenu à jour en permanence"},
      {key: "registre_securite", name: "Registre de Sécurité ERP", description: "Article R.123-51 CCH · Vérifications Q18, extincteurs, désenfumage"}
    ]
  },
  {
    category: "hygiene_securite",
    label: "Hygiène & Sécurité",
    items: [
      {key: "pms", name: "PMS · Plan de Maîtrise Sanitaire", description: "Document complet 41 pages · BPH + HACCP + 6 fiches plats + traçabilité + 7 fiches d'enregistrement"},
      {key: "affiches_pms_cuisine", name: "Affiches PMS Cuisine", description: "8 affiches A4 plastifiées + Dossier de bienvenue 4 pages (12 pages au total)"},
      {key: "affiche_tabac", name: "Affiche Sans tabac · Sans vapotage", description: "Articles L.3512-8 et L.3513-6 · À afficher en zone client"},
      {key: "affiche_allergenes", name: "Affiche Allergènes", description: "Règlement INCO 1169/2011 · 14 allergènes à déclaration obligatoire"}
    ]
  },
  {
    category: "contrats_attestations",
    label: "Contrats & Attestations",
    items: [
      {key: "attestation_haccp", name: "Attestation formation HACCP", description: "Hygiène alimentaire · au moins une personne formée dans l'établissement (Edward Touret · CNFSE)"},
      {key: "declaration_ddpp", name: "Déclaration d'activité DDPP", description: "Déclaration manipulation de denrées (CERFA 13984) · récépissé DDPP de Paris"},
      {key: "attestation_assurance", name: "Attestation Assurance RC Pro / Multirisque", description: "Responsabilité civile professionnelle + multirisque local · attestation en cours de validité"},
      {key: "contrat_nuisibles", name: "Contrat dératisation / désinsectisation", description: "Contrat de prestation La Science des Nuisibles · plan de lutte"},
      {key: "certif_degraissage", name: "Certificat dégraissage hotte / VMC", description: "Sécurité incendie ERP · dégraissage des conduits d'extraction (annuel)"},
      {key: "controle_elec_gaz", name: "Vérification électrique / gaz", description: "Rapport de vérification périodique des installations (registre de sécurité ERP)"}
    ]
  }
]

function fmtDate(d) {
  if (!d) return ""
  var date = new Date(d)
  return date.toLocaleDateString("fr-FR", {day: "2-digit", month: "2-digit", year: "numeric"})
}

function fmtSize(bytes) {
  if (!bytes) return ""
  if (bytes < 1024) return bytes + " o"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko"
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo"
}

function fmtPeriod(start, end) {
  if (start === end) return fmtDate(start)
  return fmtDate(start) + " → " + fmtDate(end)
}

// Compute default week period (lundi → dimanche de la semaine en cours ou précédente)
function getDefaultWeekPeriod() {
  var today = new Date()
  var dayOfWeek = today.getDay() // 0 = dimanche, 1 = lundi...
  var daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  var monday = new Date(today)
  monday.setDate(today.getDate() - daysFromMonday)
  var sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10)
  }
}

// Nb de jours écoulés depuis une date ISO
function daysSince(iso) {
  if (!iso) return null
  var d = new Date(iso)
  var now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / 86400000)
}

// Statut de conformité d'un type d'archive à partir du résumé (count + dernière période)
function computeFreshness(summary, typeId, cadenceDays) {
  var row = summary.filter(function(s) { return s.archive_type === typeId })[0]
  if (!row || !row.n) {
    return {code: "missing", label: "Aucun relevé", color: "#C8166A", days: null, lastEnd: null, n: 0}
  }
  var days = daysSince(row.last_end)
  if (days <= cadenceDays) return {code: "ok", label: "À jour", color: "#00A352", days: days, lastEnd: row.last_end, n: row.n}
  if (days <= cadenceDays * 2) return {code: "late", label: "En retard", color: "#E8A100", days: days, lastEnd: row.last_end, n: row.n}
  return {code: "crit", label: "Très en retard", color: "#C8166A", days: days, lastEnd: row.last_end, n: row.n}
}

// ============================================================
// Composant principal
// ============================================================

export default function LegalTab() {
  var [activeSection, setActiveSection] = useState("conformite")
  var [archives, setArchives] = useState([])
  var [loadingArchives, setLoadingArchives] = useState(false)
  var [legalDocs, setLegalDocs] = useState([])
  var [loadingDocs, setLoadingDocs] = useState(false)
  var [summary, setSummary] = useState([])
  var [toast, setToast] = useState("")

  // Filtre archives
  var [filterType, setFilterType] = useState("all")
  var [searchPeriod, setSearchPeriod] = useState({start: "", end: ""})

  // Upload modal
  var [uploadOpen, setUploadOpen] = useState(false)
  var [uploadType, setUploadType] = useState("temperatures")
  var defaultPeriod = getDefaultWeekPeriod()
  var [uploadPeriodStart, setUploadPeriodStart] = useState(defaultPeriod.start)
  var [uploadPeriodEnd, setUploadPeriodEnd] = useState(defaultPeriod.end)
  var [uploadFile, setUploadFile] = useState(null)
  var [uploadNotes, setUploadNotes] = useState("")
  var [uploading, setUploading] = useState(false)

  // ====== Charger archives ======
  async function loadArchives() {
    setLoadingArchives(true)
    try {
      var query = supabase.from("legal_archives").select("*").order("period_start", {ascending: false}).limit(200)
      if (filterType !== "all") query = query.eq("archive_type", filterType)
      if (searchPeriod.start) query = query.gte("period_start", searchPeriod.start)
      if (searchPeriod.end) query = query.lte("period_end", searchPeriod.end)
      var res = await query
      setArchives(res.data || [])
    } catch (e) {
      console.error(e)
    }
    setLoadingArchives(false)
  }

  // ====== Charger documents de référence ======
  async function loadLegalDocs() {
    setLoadingDocs(true)
    try {
      var res = await supabase.from("legal_documents").select("*").order("display_order", {ascending: true})
      setLegalDocs(res.data || [])
    } catch (e) {
      console.error(e)
    }
    setLoadingDocs(false)
  }

  // ====== Résumé conformité (toutes archives, non filtré) ======
  async function loadSummary() {
    try {
      var res = await supabase.from("legal_archives").select("archive_type, period_end")
      var rows = res.data || []
      var map = {}
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        if (!map[r.archive_type]) map[r.archive_type] = {archive_type: r.archive_type, n: 0, last_end: null}
        map[r.archive_type].n += 1
        if (!map[r.archive_type].last_end || r.period_end > map[r.archive_type].last_end) {
          map[r.archive_type].last_end = r.period_end
        }
      }
      setSummary(Object.keys(map).map(function(k) { return map[k] }))
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(function() {
    loadArchives()
    loadLegalDocs()
    loadSummary()
  }, [])

  useEffect(function() {
    loadArchives()
  }, [filterType, searchPeriod.start, searchPeriod.end])

  // ====== Upload archive ======
  async function handleUpload() {
    if (!uploadFile) {
      setToast("Aucun fichier sélectionné")
      setTimeout(function() { setToast("") }, 3000)
      return
    }
    if (!uploadPeriodStart || !uploadPeriodEnd) {
      setToast("Date de début et date de fin obligatoires")
      setTimeout(function() { setToast("") }, 3000)
      return
    }
    if (uploadPeriodEnd < uploadPeriodStart) {
      setToast("Date de fin doit être après la date de début")
      setTimeout(function() { setToast("") }, 3000)
      return
    }
    setUploading(true)
    try {
      var typeConfig = ARCHIVE_TYPES.filter(function(t) { return t.id === uploadType })[0]
      var folder = typeConfig ? typeConfig.bucket_folder : "autres"
      var ext = uploadFile.name.split(".").pop().toLowerCase()
      var safeStart = uploadPeriodStart.replace(/-/g, "")
      var safeEnd = uploadPeriodEnd.replace(/-/g, "")
      var path = folder + "/" + safeStart + "_" + safeEnd + "_" + Date.now() + "." + ext

      var up = await supabase.storage.from("legal-archives").upload(path, uploadFile)
      if (up.error) throw up.error

      var ins = await supabase.from("legal_archives").insert([{
        archive_type: uploadType,
        period_start: uploadPeriodStart,
        period_end: uploadPeriodEnd,
        file_path: path,
        file_name: uploadFile.name,
        mime_type: uploadFile.type,
        size_bytes: uploadFile.size,
        notes: uploadNotes || null
      }])
      if (ins.error) throw ins.error

      setToast("✓ Archive enregistrée")
      setTimeout(function() { setToast("") }, 3000)

      // Reset form
      setUploadFile(null)
      setUploadNotes("")
      var newDefault = getDefaultWeekPeriod()
      setUploadPeriodStart(newDefault.start)
      setUploadPeriodEnd(newDefault.end)
      setUploadOpen(false)
      loadArchives()
      loadSummary()
    } catch (e) {
      console.error(e)
      setToast("Erreur : " + (e.message || "upload échoué"))
      setTimeout(function() { setToast("") }, 4000)
    }
    setUploading(false)
  }

  // ====== Télécharger une archive ======
  async function downloadArchive(a) {
    try {
      var res = await supabase.storage.from("legal-archives").createSignedUrl(a.file_path, 3600)
      if (res.error) throw res.error
      window.open(res.data.signedUrl, "_blank")
    } catch (e) {
      console.error(e)
      setToast("Erreur téléchargement")
      setTimeout(function() { setToast("") }, 3000)
    }
  }

  // ====== Supprimer une archive ======
  async function deleteArchive(a) {
    if (!confirm("Supprimer définitivement cette archive ? (" + fmtPeriod(a.period_start, a.period_end) + ")")) return
    try {
      await supabase.storage.from("legal-archives").remove([a.file_path])
      await supabase.from("legal_archives").delete().eq("id", a.id)
      setToast("✓ Archive supprimée")
      setTimeout(function() { setToast("") }, 2500)
      loadArchives()
      loadSummary()
    } catch (e) {
      console.error(e)
    }
  }

  // ====== Upload document de référence ======
  async function handleUploadReference(category, item, file) {
    if (!file) return
    setLoadingDocs(true)
    try {
      var ext = file.name.split(".").pop().toLowerCase()
      var path = category + "/" + item.key + "_" + Date.now() + "." + ext

      var up = await supabase.storage.from("legal-documents").upload(path, file)
      if (up.error) throw up.error

      // Vérifier si un doc existe déjà pour ce key
      var existing = legalDocs.filter(function(d) { return d.notes === "ref:" + item.key })[0]
      if (existing) {
        await supabase.storage.from("legal-documents").remove([existing.file_path])
        await supabase.from("legal_documents").update({
          file_path: path,
          edited_at: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString()
        }).eq("id", existing.id)
      } else {
        await supabase.from("legal_documents").insert([{
          category: category,
          name: item.name,
          description: item.description,
          file_path: path,
          edited_at: new Date().toISOString().slice(0, 10),
          notes: "ref:" + item.key
        }])
      }

      setToast("✓ Document mis à jour : " + item.name)
      setTimeout(function() { setToast("") }, 3000)
      loadLegalDocs()
    } catch (e) {
      console.error(e)
      setToast("Erreur upload")
      setTimeout(function() { setToast("") }, 3000)
    }
    setLoadingDocs(false)
  }

  async function downloadReference(doc) {
    try {
      var res = await supabase.storage.from("legal-documents").createSignedUrl(doc.file_path, 3600)
      if (res.error) throw res.error
      window.open(res.data.signedUrl, "_blank")
    } catch (e) {
      console.error(e)
    }
  }

  var getReferenceDocBy = function(key) {
    return legalDocs.filter(function(d) { return d.notes === "ref:" + key })[0]
  }

  // ====== Stats conformité (calculées au rendu) ======
  var refTotalCount = 0
  var refLoadedCount = 0
  for (var ci = 0; ci < REFERENCE_DOCUMENTS.length; ci++) {
    var catItems = REFERENCE_DOCUMENTS[ci].items
    for (var ii = 0; ii < catItems.length; ii++) {
      refTotalCount += 1
      var rdoc = getReferenceDocBy(catItems[ii].key)
      if (rdoc && rdoc.file_path) refLoadedCount += 1
    }
  }
  var fresh = ARCHIVE_TYPES.map(function(t) { return {t: t, f: computeFreshness(summary, t.id, t.cadence)} })
  var nFreshOk = fresh.filter(function(x) { return x.f.code === "ok" }).length
  var nFreshAlert = fresh.filter(function(x) { return x.f.code !== "ok" }).length

  var openUploadFor = function(typeId) {
    setUploadType(typeId)
    var nd = getDefaultWeekPeriod()
    setUploadPeriodStart(nd.start)
    setUploadPeriodEnd(nd.end)
    setUploadFile(null)
    setUploadNotes("")
    setUploadOpen(true)
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mc">
      <div className="ph">
        <div>
          <div className="pt">⚖️ Centre Légal &amp; Conformité</div>
          <div className="ps">Documents de référence · Archives périodiques · Conformité réglementaire</div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:24,right:24,background:"#191923",color:"#FFEB5A",padding:"12px 18px",borderRadius:8,fontWeight:900,fontSize:13,zIndex:9999,boxShadow:"3px 3px 0 #FF82D7"}}>
          {toast}
        </div>
      )}

      {/* Tabs internes */}
      <div style={{display:"flex",gap:6,marginBottom:18,borderBottom:"3px solid #191923",paddingBottom:0}}>
        {[
          {id:"conformite",label:"✅ Conformité",color:"#FF82D7"},
          {id:"references",label:"📚 Documents de référence",color:"#FF82D7"},
          {id:"archives",label:"📁 Archives périodiques",color:"#FFEB5A"}
        ].map(function(s) {
          var active = activeSection === s.id
          return (
            <div key={s.id} onClick={function() { setActiveSection(s.id) }}
              style={{
                padding:"10px 18px",
                cursor:"pointer",
                fontWeight:900,
                fontSize:12,
                textTransform:"uppercase",
                letterSpacing:1,
                background:active?s.color:"#FFFFFF",
                color:active?"#191923":"#666",
                border:"3px solid #191923",
                borderBottom:active?"3px solid "+s.color:"3px solid #191923",
                borderRadius:"6px 6px 0 0",
                marginBottom:-3
              }}>
              {s.label}
            </div>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/* SECTION 0 : CONFORMITÉ (vue d'ensemble)                       */}
      {/* ============================================================ */}
      {activeSection === "conformite" && (
        <div>
          {/* Bandeau synthèse */}
          <div style={{background:"#FF82D7",border:"3px solid #191923",boxShadow:"4px 4px 0 #191923",padding:"16px 18px",marginBottom:18}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:26,color:"#FFFFFF",lineHeight:1}}>État de conformité</div>
            <div style={{fontSize:12,color:"#FFFFFF",marginTop:6,fontWeight:700,lineHeight:1.5}}>
              {refLoadedCount}/{refTotalCount} documents de référence chargés · {nFreshOk} relevé{nFreshOk > 1 ? "s" : ""} à jour · {nFreshAlert} à surveiller
            </div>
          </div>

          {/* Cartes statut par type de relevé */}
          <div style={{fontWeight:900,fontSize:13,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #FF82D7"}}>
            Relevés périodiques
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:10,marginBottom:24}}>
            {fresh.map(function(x) {
              var t = x.t
              var f = x.f
              return (
                <div key={t.id} style={{
                  background:"#FFFFFF",
                  border:"2px solid #191923",
                  borderLeft:"6px solid "+f.color,
                  padding:"12px 14px",
                  boxShadow:"2px 2px 0 #191923",
                  display:"flex",
                  flexDirection:"column",
                  gap:8
                }}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <div style={{fontSize:24,lineHeight:1}}>{t.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:900,fontSize:12,textTransform:"uppercase",letterSpacing:.5,color:"#191923",lineHeight:1.2}}>{t.label}</div>
                      <div style={{fontSize:10,color:"#888",marginTop:2}}>{t.freq}</div>
                    </div>
                    <span style={{background:f.color,color:"#FFFFFF",fontWeight:900,fontSize:9,textTransform:"uppercase",letterSpacing:.5,padding:"3px 7px",whiteSpace:"nowrap"}}>{f.label}</span>
                  </div>
                  <div style={{fontSize:10,color:"#666",lineHeight:1.4,minHeight:28}}>
                    {f.n > 0
                      ? "Dernier relevé : " + fmtDate(f.lastEnd) + " · il y a " + f.days + " j · " + f.n + " archive" + (f.n > 1 ? "s" : "")
                      : "Aucune fiche archivée dans le système."}
                  </div>
                  <button className="btn btn-p btn-sm" style={{width:"100%",fontSize:11,justifyContent:"center"}}
                    onClick={function() { openUploadFor(t.id) }}>
                    📤 Archiver une fiche
                  </button>
                </div>
              )
            })}
          </div>

          {/* Documents de référence — résumé */}
          <div style={{fontWeight:900,fontSize:13,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #FF82D7"}}>
            Documents de référence
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:10,marginBottom:24}}>
            {REFERENCE_DOCUMENTS.map(function(cat) {
              var total = cat.items.length
              var loaded = cat.items.filter(function(it) { var d = getReferenceDocBy(it.key); return d && d.file_path }).length
              var complete = loaded === total
              return (
                <div key={cat.category} style={{
                  background:"#FFFFFF",
                  border:"2px solid #191923",
                  borderLeft:"6px solid "+(complete ? "#00A352" : "#E8A100"),
                  padding:"12px 14px",
                  boxShadow:"2px 2px 0 #191923"
                }}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                    <div style={{fontWeight:900,fontSize:12,textTransform:"uppercase",letterSpacing:.5,color:"#191923"}}>{cat.label}</div>
                    <span style={{background:complete ? "#00A352" : "#E8A100",color:"#FFFFFF",fontWeight:900,fontSize:10,padding:"3px 8px",whiteSpace:"nowrap"}}>{loaded}/{total}</span>
                  </div>
                  <div style={{fontSize:10,color:"#666",marginTop:6,lineHeight:1.4}}>
                    {complete ? "Tous les documents sont chargés." : (total - loaded) + " document" + ((total - loaded) > 1 ? "s" : "") + " à charger."}
                  </div>
                  <button className="btn btn-sm" style={{marginTop:8,fontSize:10}} onClick={function() { setActiveSection("references") }}>
                    Ouvrir →
                  </button>
                </div>
              )
            })}
          </div>

          {/* Rappel légal */}
          <div style={{background:"#FFFEF2",border:"2px solid #191923",borderLeft:"6px solid #FFEB5A",padding:"12px 16px",boxShadow:"2px 2px 0 #191923",fontSize:11,color:"#444",lineHeight:1.6}}>
            <strong>Rappel conservation :</strong> fiches d&apos;enregistrement (températures, hygiène, nuisibles) à conserver <strong>6 mois minimum</strong> (règlement CE 178/2002). DUERP, registre du personnel et registre de sécurité ERP tenus à jour en permanence. Le statut ci-dessus est calculé à partir des fiches réellement archivées dans l&apos;outil.
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 1 : DOCUMENTS DE RÉFÉRENCE                            */}
      {/* ============================================================ */}
      {activeSection === "references" && (
        <div>
          <div style={{background:"#FFFFFF",border:"2px solid #191923",borderLeft:"6px solid #FF82D7",padding:"12px 16px",marginBottom:18,boxShadow:"2px 2px 0 #191923"}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:"#191923",lineHeight:1}}>Documents de référence</div>
            <div style={{fontSize:11,color:"#666",marginTop:4}}>
              Charge ici les documents officiels Meshuga (Classeur Conformité, PMS, Affiches, Registres) ainsi que tes contrats et attestations. Ces documents sont à conserver et tenir à jour. Tu peux les remplacer à chaque nouvelle version (ex: PMS révisé annuellement).
            </div>
          </div>

          {REFERENCE_DOCUMENTS.map(function(cat) {
            return (
              <div key={cat.category} style={{marginBottom:24}}>
                <div style={{fontWeight:900,fontSize:13,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:8,paddingBottom:4,borderBottom:"2px solid #FF82D7"}}>
                  {cat.label}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:10}}>
                  {cat.items.map(function(item) {
                    var doc = getReferenceDocBy(item.key)
                    var hasFile = doc && doc.file_path
                    return (
                      <div key={item.key} style={{
                        background:hasFile?"#FFFFFF":"#FAFAFA",
                        border:"2px solid #191923",
                        borderLeft:hasFile?"6px solid #00C853":"6px solid #CCC",
                        padding:"12px 14px",
                        boxShadow:"2px 2px 0 #191923"
                      }}>
                        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
                          <div style={{fontWeight:900,fontSize:13,color:"#191923",lineHeight:1.3}}>{item.name}</div>
                          {hasFile && <span style={{fontSize:9,fontWeight:900,color:"#00C853",textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>✓ Chargé</span>}
                          {!hasFile && <span style={{fontSize:9,fontWeight:900,color:"#999",textTransform:"uppercase",letterSpacing:1,whiteSpace:"nowrap"}}>Non chargé</span>}
                        </div>
                        <div style={{fontSize:10,color:"#666",lineHeight:1.4,marginBottom:10,minHeight:32}}>
                          {item.description}
                        </div>
                        {hasFile && (
                          <div style={{fontSize:10,color:"#888",marginBottom:8}}>
                            Dernière édition : {fmtDate(doc.edited_at)}
                          </div>
                        )}
                        <div style={{display:"flex",gap:6}}>
                          {hasFile && (
                            <button className="btn btn-sm" onClick={function() { downloadReference(doc) }} style={{flex:1,fontSize:10}}>
                              ⬇ Télécharger
                            </button>
                          )}
                          <label className="btn btn-p btn-sm" style={{flex:1,fontSize:10,cursor:"pointer",textAlign:"center"}}>
                            {hasFile ? "↻ Remplacer" : "📤 Charger"}
                            <input
                              type="file"
                              accept=".pdf,image/*"
                              style={{display:"none"}}
                              onChange={function(e) {
                                if (e.target.files && e.target.files[0]) {
                                  handleUploadReference(cat.category, item, e.target.files[0])
                                  e.target.value = ""
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 2 : ARCHIVES PÉRIODIQUES                              */}
      {/* ============================================================ */}
      {activeSection === "archives" && (
        <div>
          <div style={{background:"#FFFFFF",border:"2px solid #191923",borderLeft:"6px solid #FFEB5A",padding:"12px 16px",marginBottom:18,boxShadow:"2px 2px 0 #191923"}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:"#191923",lineHeight:1}}>Archives périodiques</div>
            <div style={{fontSize:11,color:"#666",marginTop:4}}>
              Archive chaque semaine les fiches d'enregistrement remplies (relevés température F1, audit hygiène F6, suivi nuisibles F7). Conservation légale : <strong>6 mois minimum</strong> (règlement 178/2002).
            </div>
          </div>

          {/* Boutons upload par type */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:10,marginBottom:18}}>
            {ARCHIVE_TYPES.map(function(t) {
              var count = archives.filter(function(a) { return a.archive_type === t.id }).length
              return (
                <div key={t.id} style={{
                  background:"#FFFFFF",
                  border:"2px solid #191923",
                  borderTop:"6px solid "+t.color,
                  padding:"12px 14px",
                  boxShadow:"2px 2px 0 #191923",
                  display:"flex",
                  flexDirection:"column",
                  gap:8
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:24}}>{t.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:900,fontSize:12,textTransform:"uppercase",letterSpacing:.5,color:"#191923",lineHeight:1.2}}>{t.label}</div>
                      <div style={{fontSize:10,color:"#666",marginTop:2}}>{count} archive{count > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <button className="btn btn-p btn-sm" style={{width:"100%",fontSize:11,justifyContent:"center"}}
                    onClick={function() {
                      setUploadType(t.id)
                      var newDefault = getDefaultWeekPeriod()
                      setUploadPeriodStart(newDefault.start)
                      setUploadPeriodEnd(newDefault.end)
                      setUploadFile(null)
                      setUploadNotes("")
                      setUploadOpen(true)
                    }}>
                    📤 Archiver une fiche
                  </button>
                </div>
              )
            })}
          </div>

          {/* Filtres */}
          <div style={{background:"#FFFFFF",border:"2px solid #191923",padding:"10px 14px",marginBottom:14,boxShadow:"2px 2px 0 #191923",display:"flex",flexWrap:"wrap",gap:10,alignItems:"center"}}>
            <div style={{fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"#191923"}}>Filtres :</div>

            <select value={filterType} onChange={function(e) { setFilterType(e.target.value) }}
              style={{padding:"5px 8px",border:"2px solid #191923",fontWeight:700,fontSize:11}}>
              <option value="all">Tous types</option>
              {ARCHIVE_TYPES.map(function(t) { return <option key={t.id} value={t.id}>{t.icon} {t.label}</option> })}
            </select>

            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:11,fontWeight:700}}>Du</span>
              <input type="date" value={searchPeriod.start} onChange={function(e) { setSearchPeriod({start: e.target.value, end: searchPeriod.end}) }}
                style={{padding:"5px 8px",border:"2px solid #191923",fontWeight:700,fontSize:11}} />
              <span style={{fontSize:11,fontWeight:700}}>au</span>
              <input type="date" value={searchPeriod.end} onChange={function(e) { setSearchPeriod({start: searchPeriod.start, end: e.target.value}) }}
                style={{padding:"5px 8px",border:"2px solid #191923",fontWeight:700,fontSize:11}} />
              {(searchPeriod.start || searchPeriod.end) && (
                <button className="btn btn-sm" onClick={function() { setSearchPeriod({start:"",end:""}) }} style={{fontSize:10}}>
                  ✕ Reset
                </button>
              )}
            </div>

            <div style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:"#666"}}>
              {archives.length} archive{archives.length > 1 ? "s" : ""}
            </div>
          </div>

          {/* Liste archives */}
          {loadingArchives && <div style={{textAlign:"center",padding:30,color:"#666"}}>Chargement...</div>}

          {!loadingArchives && archives.length === 0 && (
            <div style={{background:"#FAFAFA",border:"2px dashed #CCC",padding:30,textAlign:"center",color:"#999",fontSize:13}}>
              Aucune archive enregistrée. Utilise les boutons ci-dessus pour archiver tes premières fiches.
            </div>
          )}

          {!loadingArchives && archives.length > 0 && (
            <div style={{background:"#FFFFFF",border:"2px solid #191923",boxShadow:"2px 2px 0 #191923"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#FFEB5A",borderBottom:"3px solid #191923"}}>
                    <th style={{padding:"8px 10px",textAlign:"left",fontWeight:900,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Type</th>
                    <th style={{padding:"8px 10px",textAlign:"left",fontWeight:900,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Période</th>
                    <th style={{padding:"8px 10px",textAlign:"left",fontWeight:900,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Fichier</th>
                    <th style={{padding:"8px 10px",textAlign:"left",fontWeight:900,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Notes</th>
                    <th style={{padding:"8px 10px",textAlign:"right",fontWeight:900,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Archivé le</th>
                    <th style={{padding:"8px 10px",textAlign:"center",fontWeight:900,fontSize:10,textTransform:"uppercase",letterSpacing:1}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archives.map(function(a) {
                    var typeConfig = ARCHIVE_TYPES.filter(function(t) { return t.id === a.archive_type })[0]
                    return (
                      <tr key={a.id} style={{borderBottom:"1px solid #EEE"}}>
                        <td style={{padding:"8px 10px"}}>
                          <span style={{display:"inline-block",padding:"3px 8px",background:typeConfig?typeConfig.color:"#CCC",color:typeConfig && typeConfig.id==="nuisibles"?"#FFEB5A":"#191923",fontWeight:900,fontSize:10,textTransform:"uppercase",letterSpacing:.5}}>
                            {typeConfig ? typeConfig.icon + " " + typeConfig.label : a.archive_type}
                          </span>
                        </td>
                        <td style={{padding:"8px 10px",fontWeight:700}}>{fmtPeriod(a.period_start, a.period_end)}</td>
                        <td style={{padding:"8px 10px",fontSize:11,color:"#666",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.file_name}>
                          📎 {a.file_name}
                          {a.size_bytes && <span style={{color:"#999",marginLeft:6}}>({fmtSize(a.size_bytes)})</span>}
                        </td>
                        <td style={{padding:"8px 10px",fontSize:11,color:"#666",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={a.notes}>
                          {a.notes || "—"}
                        </td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontSize:10,color:"#999"}}>{fmtDate(a.uploaded_at)}</td>
                        <td style={{padding:"8px 10px",textAlign:"center",whiteSpace:"nowrap"}}>
                          <button className="btn btn-sm" onClick={function() { downloadArchive(a) }} style={{fontSize:10,marginRight:4}}>⬇</button>
                          <button className="btn btn-sm" onClick={function() { deleteArchive(a) }} style={{fontSize:10,background:"#FFE0E0",color:"#C8166A"}}>🗑</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL UPLOAD ARCHIVE                                          */}
      {/* ============================================================ */}
      {uploadOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={function(e) { if (e.target === e.currentTarget) setUploadOpen(false) }}>
          <div style={{background:"#FFFFFF",border:"3px solid #191923",boxShadow:"5px 5px 0 #FF82D7",width:"100%",maxWidth:560,padding:0,maxHeight:"90vh",overflowY:"auto"}}>
            {/* Header */}
            <div style={{background:"#FFEB5A",padding:"14px 18px",borderBottom:"3px solid #191923",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:"#191923",lineHeight:1}}>Archiver une fiche</div>
                <div style={{fontSize:11,fontWeight:700,color:"#191923",marginTop:2,textTransform:"uppercase",letterSpacing:1}}>
                  {(function() {
                    var t = ARCHIVE_TYPES.filter(function(x) { return x.id === uploadType })[0]
                    return t ? t.label : ""
                  })()}
                </div>
              </div>
              <button onClick={function() { setUploadOpen(false) }} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",fontWeight:900}}>✕</button>
            </div>

            {/* Body */}
            <div style={{padding:18}}>
              {/* Type */}
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:4}}>Type d'archive</label>
                <select value={uploadType} onChange={function(e) { setUploadType(e.target.value) }}
                  style={{width:"100%",padding:"8px 10px",border:"2px solid #191923",fontWeight:700,fontSize:13}}>
                  {ARCHIVE_TYPES.map(function(t) { return <option key={t.id} value={t.id}>{t.icon} {t.label}</option> })}
                </select>
              </div>

              {/* Période */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={{display:"block",fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:4}}>Période · début *</label>
                  <input type="date" value={uploadPeriodStart} onChange={function(e) { setUploadPeriodStart(e.target.value) }}
                    style={{width:"100%",padding:"8px 10px",border:"2px solid #191923",fontWeight:700,fontSize:13}} required />
                </div>
                <div>
                  <label style={{display:"block",fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:4}}>Période · fin *</label>
                  <input type="date" value={uploadPeriodEnd} onChange={function(e) { setUploadPeriodEnd(e.target.value) }}
                    style={{width:"100%",padding:"8px 10px",border:"2px solid #191923",fontWeight:700,fontSize:13}} required />
                </div>
              </div>

              <div style={{background:"#FFFEF2",border:"1px dashed #999",padding:"6px 10px",fontSize:10,color:"#666",marginBottom:14,lineHeight:1.4}}>
                💡 Pré-rempli avec la semaine en cours (lundi → dimanche). Modifie librement la période. Tu peux archiver une journée seule (mêmes dates) ou un mois entier.
              </div>

              {/* Fichier */}
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:4}}>Fichier (PDF ou photo) *</label>
                <input type="file" accept=".pdf,image/*"
                  onChange={function(e) { setUploadFile(e.target.files && e.target.files[0] ? e.target.files[0] : null) }}
                  style={{width:"100%",padding:"6px",border:"2px solid #191923",fontSize:12,background:"#FFFFFF"}} />
                {uploadFile && (
                  <div style={{fontSize:11,color:"#666",marginTop:4}}>
                    📎 {uploadFile.name} ({fmtSize(uploadFile.size)})
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{marginBottom:18}}>
                <label style={{display:"block",fontWeight:900,fontSize:11,textTransform:"uppercase",letterSpacing:1,color:"#FF82D7",marginBottom:4}}>Notes (optionnel)</label>
                <textarea value={uploadNotes} onChange={function(e) { setUploadNotes(e.target.value) }}
                  rows={2}
                  placeholder="Ex: Anomalie T° frigo positif jeudi · réparation lundi"
                  style={{width:"100%",padding:"8px 10px",border:"2px solid #191923",fontSize:12,fontFamily:"inherit",resize:"vertical"}} />
              </div>

              {/* Actions */}
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button className="btn btn-sm" onClick={function() { setUploadOpen(false) }} disabled={uploading}>
                  Annuler
                </button>
                <button className="btn btn-p btn-sm" onClick={handleUpload} disabled={uploading || !uploadFile || !uploadPeriodStart || !uploadPeriodEnd}
                  style={{minWidth:130,fontSize:12}}>
                  {uploading ? "⏳ Upload..." : "📤 Archiver"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
