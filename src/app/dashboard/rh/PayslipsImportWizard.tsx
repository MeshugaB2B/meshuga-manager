"use client"
// ============================================================
// FILE PATH dans le repo :
//   src/app/dashboard/rh/PayslipsImportWizard.tsx
// ============================================================
// Wizard d'import des bulletins de paie Silae (PDF groupé).
//   1. Dépôt du PDF          -> POST /api/hr/payslips/extract
//   2. Mapping matricules    -> rattachement aux fiches Meshuga (mémorisé)
//   3. Extraction (lots)     -> POST /api/hr/payslips/parse-batch (progression)
//   4. Récap à valider
//   5. Enregistrement (lots) -> POST /api/hr/payslips/commit (+ finalize)
// ============================================================

import { useState } from "react"

var PINK = "#FF82D7"
var YELLOW = "#FFEB5A"
var INK = "#191923"
var BATCH = 12

export default function PayslipsImportWizard(props) {
  var [step, setStep] = useState(1)
  var [busy, setBusy] = useState(false)
  var [error, setError] = useState("")
  var [fileName, setFileName] = useState("")
  var [pdfB64, setPdfB64] = useState("")
  var [data, setData] = useState(null)          // réponse extract
  var [mapping, setMapping] = useState({})       // matricule -> employee_id
  var [items, setItems] = useState([])           // bulletins parsés (avec fields)
  var [progress, setProgress] = useState({ done: 0, total: 0 })
  var [result, setResult] = useState(null)

  var fmt = function (n) { return (n === null || n === undefined) ? "—" : Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }

  var onFile = function (e) {
    setError("")
    var f = e.target.files && e.target.files[0]
    if (!f) return
    setFileName(f.name)
    var reader = new FileReader()
    reader.onload = function () {
      var s = String(reader.result || "")
      var b64 = s.indexOf("base64,") >= 0 ? s.split("base64,")[1] : s
      setPdfB64(b64)
    }
    reader.readAsDataURL(f)
  }

  var doExtract = async function () {
    if (!pdfB64) { setError("Choisis d&apos;abord un fichier PDF."); return }
    setBusy(true); setError("")
    try {
      var res = await fetch("/api/hr/payslips/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: pdfB64, filename: fileName }),
      })
      var d = await res.json()
      if (!res.ok || !d.ok) throw new Error(d.error || "Lecture du PDF impossible")
      setData(d)
      var initMap = {}
      for (var i = 0; i < d.employees.length; i++) {
        var emp = d.employees[i]
        if (emp.suggested_employee_id) initMap[emp.matricule] = emp.suggested_employee_id
      }
      setMapping(initMap)
      setStep(2)
    } catch (e) { setError(e.message || String(e)) }
    setBusy(false)
  }

  var setMap = function (mat, empId) {
    var m = Object.assign({}, mapping)
    if (empId) m[mat] = empId; else delete m[mat]
    setMapping(m)
  }

  var allMapped = function () {
    if (!data) return false
    for (var i = 0; i < data.employees.length; i++) {
      if (!mapping[data.employees[i].matricule]) return false
    }
    return true
  }

  var doParse = async function () {
    if (!data) return
    setBusy(true); setError(""); setStep(3)
    try {
      var pages = data.bulletinPages.slice()
      var total = pages.length
      setProgress({ done: 0, total: total })
      var collected = []
      for (var off = 0; off < pages.length; off += BATCH) {
        var chunk = pages.slice(off, off + BATCH)
        var indices = chunk.map(function (p) { return p.index })
        var res = await fetch("/api/hr/payslips/parse-batch", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importId: data.importId, indices: indices }),
        })
        var d = await res.json()
        if (!res.ok || !d.ok) throw new Error(d.error || "Extraction interrompue")
        for (var j = 0; j < d.items.length; j++) collected.push(d.items[j])
        setProgress({ done: Math.min(off + BATCH, total), total: total })
      }
      collected.sort(function (a, b) { return a.index - b.index })
      setItems(collected)
      setStep(4)
    } catch (e) { setError(e.message || String(e)); setStep(2) }
    setBusy(false)
  }

  var doCommit = async function () {
    if (!data) return
    setBusy(true); setError(""); setStep(5)
    try {
      // bulletins (avec fields) + annexes (sans fields)
      var commitItems = items.map(function (it) {
        return { index: it.index, matricule: it.matricule, periode_iso: it.periode_iso, periode_label: it.periode_label, doc_type: it.doc_type, fields: it.fields }
      })
      for (var a = 0; a < data.annexPages.length; a++) {
        var an = data.annexPages[a]
        commitItems.push({ index: an.index, matricule: an.matricule, periode_iso: an.periode_iso, periode_label: an.periode_label, doc_type: an.doc_type, fields: null })
      }
      // on ne garde que les items dont le matricule est mappé
      commitItems = commitItems.filter(function (it) { return mapping[it.matricule] })

      var total = commitItems.length
      setProgress({ done: 0, total: total })
      var agg = { inserted: 0, archived: 0, errors: [] }
      for (var off = 0; off < commitItems.length; off += BATCH) {
        var chunk = commitItems.slice(off, off + BATCH)
        var isLast = (off + BATCH) >= commitItems.length
        var res = await fetch("/api/hr/payslips/commit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importId: data.importId, mapping: mapping, items: chunk, saveMatricule: true, finalize: isLast, sourceFile: fileName }),
        })
        var d = await res.json()
        if (!res.ok || !d.ok) throw new Error(d.error || "Enregistrement interrompu")
        agg.inserted += d.inserted || 0
        agg.archived += d.archived || 0
        if (d.errors && d.errors.length) agg.errors = agg.errors.concat(d.errors)
        setProgress({ done: Math.min(off + BATCH, total), total: total })
      }
      setResult(agg)
      setStep(6)
    } catch (e) { setError(e.message || String(e)); setStep(4) }
    setBusy(false)
  }

  // ----- récap groupé par salarié -----
  var recapByEmp = function () {
    var by = {}
    for (var i = 0; i < items.length; i++) {
      var it = items[i]
      var k = it.matricule
      if (!by[k]) by[k] = { matricule: k, rows: [] }
      by[k].rows.push(it)
    }
    var out = []
    var keys = Object.keys(by)
    for (var j = 0; j < keys.length; j++) {
      var g = by[keys[j]]
      g.rows.sort(function (a, b) { return (a.periode_iso || "") < (b.periode_iso || "") ? -1 : 1 })
      var last = g.rows[g.rows.length - 1]
      var incomplete = g.rows.filter(function (r) { return !r.fields || r.fields.net_paye === null }).length
      out.push({ matricule: g.matricule, nb: g.rows.length, last: last, incomplete: incomplete })
    }
    out.sort(function (a, b) { return a.matricule < b.matricule ? -1 : 1 })
    return out
  }

  var empLabel = function (empId) {
    if (!data) return empId
    for (var i = 0; i < data.allEmployees.length; i++) if (data.allEmployees[i].id === empId) return data.allEmployees[i].label
    return empId
  }

  var updateField = function (pageIndex, fieldName, raw) {
    var v = (raw === "" || raw === null || raw === undefined) ? null : parseFloat(String(raw).replace(",", "."))
    if (v !== null && isNaN(v)) v = null
    var next = items.map(function (it) {
      if (it.index !== pageIndex) return it
      var nf = Object.assign({}, it.fields)
      nf[fieldName] = v
      return Object.assign({}, it, { fields: nf })
    })
    setItems(next)
  }
  var cellInput = { width: 72, padding: "4px 6px", border: "1.5px solid #CBD5E1", borderRadius: 5, fontSize: 12, textAlign: "right", fontFamily: "inherit" }

  // ============ RENDU ============
  var box = { background: "#FFFFFF", border: "3px solid " + INK, borderRadius: 14, boxShadow: "6px 6px 0 " + INK, padding: 22, maxWidth: 820, width: "100%" }
  var overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", zIndex: 1000, overflowY: "auto" }
  var btnP = { background: PINK, color: "#FFFFFF", border: "2px solid " + INK, borderRadius: 8, padding: "10px 18px", fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 " + INK }
  var btnG = { background: "#FFFFFF", color: INK, border: "2px solid " + INK, borderRadius: 8, padding: "10px 18px", fontWeight: 700, cursor: "pointer" }

  var header = (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color: INK }}>📄 Importer des bulletins</div>
      <button onClick={props.onClose} style={{ background: "transparent", border: "none", fontSize: 26, cursor: "pointer", color: INK, lineHeight: 1 }}>×</button>
    </div>
  )

  var pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div style={overlay} onClick={function (e) { if (e.target === e.currentTarget && !busy) props.onClose() }}>
      <div style={box}>
        {header}

        {error ? (
          <div style={{ background: "rgba(220,38,38,0.1)", borderLeft: "4px solid #DC2626", padding: "10px 12px", borderRadius: 4, fontSize: 13, marginBottom: 14, color: INK }}>⚠ {error}</div>
        ) : null}

        {step === 1 ? (
          <div>
            <p style={{ fontSize: 14, color: INK, lineHeight: 1.6 }}>
              Dépose le <strong>PDF groupé</strong> téléchargé depuis My Silae (tous les salariés / tous les mois). Je lis chaque page, je rattache au bon salarié et je prépare l&apos;extraction.
            </p>
            <div style={{ background: "rgba(255,235,90,0.25)", border: "2px dashed " + INK, borderRadius: 10, padding: 22, textAlign: "center", margin: "14px 0" }}>
              <input type="file" accept="application/pdf" onChange={onFile} />
              {fileName ? <div style={{ marginTop: 10, fontWeight: 700, fontSize: 13 }}>{fileName}</div> : null}
            </div>
            <div style={{ textAlign: "right" }}>
              <button onClick={doExtract} disabled={busy || !pdfB64} style={Object.assign({}, btnP, (busy || !pdfB64) ? { opacity: 0.5, cursor: "not-allowed" } : {})}>
                {busy ? "Lecture…" : "Lire le PDF →"}
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 && data ? (
          <div>
            <p style={{ fontSize: 14, color: INK, lineHeight: 1.5 }}>
              <strong>{data.employees.length} salariés</strong> détectés sur <strong>{data.totalPages} pages</strong>. Vérifie le rattachement (mémorisé pour les prochains imports).
            </p>
            <div style={{ maxHeight: 320, overflowY: "auto", margin: "12px 0" }}>
              {data.employees.map(function (emp) {
                return (
                  <div key={emp.matricule} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #EEE", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 800, fontSize: 13 }}>{emp.header_prenom} {emp.header_nom}</div>
                      <div style={{ fontSize: 11, color: "#666" }}>mat. {emp.matricule} &middot; {emp.nb_bulletins} bulletins{emp.nb_annexes ? " + " + emp.nb_annexes + " annexe(s)" : ""} {emp.already_mapped ? "· déjà lié" : ""}</div>
                    </div>
                    <span style={{ fontWeight: 900 }}>→</span>
                    <select value={mapping[emp.matricule] || ""} onChange={function (e) { setMap(emp.matricule, e.target.value) }}
                      style={{ flex: 1, minWidth: 200, padding: "8px 10px", border: "2px solid " + INK, borderRadius: 6, fontSize: 13 }}>
                      <option value="">— non rattaché (ignoré) —</option>
                      {data.allEmployees.map(function (a) { return <option key={a.id} value={a.id}>{a.label}</option> })}
                    </select>
                  </div>
                )
              })}
            </div>
            {!allMapped() ? <div style={{ fontSize: 12, color: "#B45309", marginBottom: 10 }}>⚠ Les salariés non rattachés seront ignorés à l&apos;import.</div> : null}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={function () { setStep(1) }} style={btnG}>← Retour</button>
              <button onClick={doParse} style={btnP}>Extraire les données →</button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Lecture des montants et congés…</div>
            <div style={{ background: "#EEE", borderRadius: 999, height: 18, overflow: "hidden", border: "2px solid " + INK }}>
              <div style={{ width: pct + "%", height: "100%", background: PINK, transition: "width .3s" }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>{progress.done} / {progress.total} bulletins</div>
          </div>
        ) : null}

        {step === 4 ? (
          <div>
            <p style={{ fontSize: 14, color: INK }}>Vérifie le récap, puis enregistre. Un PDF par bulletin sera archivé dans chaque fiche.</p>
            <div style={{ maxHeight: 340, overflowY: "auto", margin: "10px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: YELLOW, textAlign: "left" }}>
                    <th style={{ padding: 6 }}>Salarié</th><th style={{ padding: 6 }}>Bull.</th>
                    <th style={{ padding: 6 }}>Dernier</th><th style={{ padding: 6, textAlign: "right" }}>Brut</th>
                    <th style={{ padding: 6, textAlign: "right" }}>Net payé</th><th style={{ padding: 6, textAlign: "right" }}>CP N-1</th>
                    <th style={{ padding: 6, textAlign: "right" }}>CP N</th>
                  </tr>
                </thead>
                <tbody>
                  {recapByEmp().map(function (g) {
                    var f = g.last.fields || {}
                    return (
                      <tr key={g.matricule} style={{ borderBottom: "1px solid #EEE" }}>
                        <td style={{ padding: 6, fontWeight: 700 }}>{empLabel(mapping[g.matricule]) || g.matricule}{g.incomplete ? <span style={{ color: "#B45309", fontSize: 10 }}> ⚠{g.incomplete}</span> : null}</td>
                        <td style={{ padding: 6 }}>{g.nb}</td>
                        <td style={{ padding: 6 }}>{g.last.periode_label}</td>
                        <td style={{ padding: 6, textAlign: "right" }}>{fmt(f.brut)}</td>
                        <td style={{ padding: 6, textAlign: "right" }}>
                          <input value={f.net_paye === null || f.net_paye === undefined ? "" : f.net_paye} onChange={function (e) { updateField(g.last.index, "net_paye", e.target.value) }} style={cellInput} />
                        </td>
                        <td style={{ padding: 6, textAlign: "right" }}>
                          <input value={f.cp_n1_solde === null || f.cp_n1_solde === undefined ? "" : f.cp_n1_solde} onChange={function (e) { updateField(g.last.index, "cp_n1_solde", e.target.value) }} style={cellInput} />
                        </td>
                        <td style={{ padding: 6, textAlign: "right" }}>
                          <input value={f.cp_n_solde === null || f.cp_n_solde === undefined ? "" : f.cp_n_solde} onChange={function (e) { updateField(g.last.index, "cp_n_solde", e.target.value) }} style={cellInput} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 10 }}>Les colonnes <strong>Net payé</strong>, <strong>CP N-1</strong> et <strong>CP N</strong> sont modifiables : corrige ici les rares valeurs non lues (⚠) avant d&apos;enregistrer. Tu corriges le <strong>dernier mois</strong> (celui qui fixe le solde de congés).</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={function () { setStep(2) }} style={btnG}>← Mapping</button>
              <button onClick={doCommit} style={btnP}>✓ Enregistrer {items.length + (data ? data.annexPages.length : 0)} documents</button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div style={{ textAlign: "center", padding: "30px 10px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>Archivage et enregistrement…</div>
            <div style={{ background: "#EEE", borderRadius: 999, height: 18, overflow: "hidden", border: "2px solid " + INK }}>
              <div style={{ width: pct + "%", height: "100%", background: PINK, transition: "width .3s" }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>{progress.done} / {progress.total} documents</div>
          </div>
        ) : null}

        {step === 6 && result ? (
          <div style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontSize: 52 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: PINK, margin: "6px 0" }}>Import terminé</div>
            <p style={{ fontSize: 14 }}><strong>{result.inserted}</strong> bulletins enregistrés &middot; <strong>{result.archived}</strong> documents archivés.</p>
            {result.errors && result.errors.length ? (
              <div style={{ textAlign: "left", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 6, padding: 10, margin: "10px 0", fontSize: 11, maxHeight: 140, overflowY: "auto" }}>
                <strong>{result.errors.length} avertissement(s) :</strong>
                {result.errors.map(function (er, i) { return <div key={i}>&middot; {er}</div> })}
              </div>
            ) : null}
            <button onClick={function () { if (props.onDone) props.onDone(); props.onClose() }} style={btnP}>Fermer</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
