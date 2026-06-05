'use client'
import { useState, useEffect } from 'react'

// =============================================================================
// ReportingTab — Bilan hebdo auto Meshuga (refonte de l'ancien CR manuel)
//
// Affiche le bilan calculé côté serveur (/api/weekly-report) : CA caisse réel,
// comparaison S-1, tickets, panier, CA par jour, répartition par canal,
// anomalies, synthèse IA + 3 priorités. Navigation semaine par semaine.
// Bouton "Envoyer maintenant" → POST (email Edward+Emy + SMS Edward).
//
// Charte : rose #FF82D7 / jaune #FFEB5A / noir #191923 (texte+bordures).
// Neo-brutalist (classes .card, .ph, .pt, .ps, .ct, .btn). SWC Next 14.2.
// =============================================================================

var NOIR = '#191923'
var ROSE = '#FF82D7'
var JAUNE = '#FFEB5A'

function pad2(n) { return n < 10 ? '0' + n : '' + n }
function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) }
function mondayOf(d) {
  var x = new Date(d.getTime())
  var wd = x.getDay()
  var diff = (wd === 0 ? -6 : 1 - wd)
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}
function lastCompletedMonday() {
  var now = new Date()
  var tm = mondayOf(now)
  tm.setDate(tm.getDate() - 7)
  return ymd(tm)
}
function eur(n) {
  var v = Math.round((Number(n) || 0))
  return v.toLocaleString('fr-FR') + ' €'
}
function eur2(n) {
  var v = Math.round((Number(n) || 0) * 100) / 100
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
function pctTxt(n) {
  if (n == null) return ''
  var v = Math.round((Number(n) || 0) * 10) / 10
  return (v > 0 ? '+' : '') + v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'
}
var CH_LABELS = { emporter: 'À emporter', livraison: 'Livraison', sur_place: 'Sur place', deliveroo: 'Deliveroo', uber_eats: 'Uber Eats' }

export default function ReportingTab(ctx) {
  var toast = ctx.toast || function () {}

  var [monday, setMonday] = useState(lastCompletedMonday())
  var [data, setData] = useState(null)
  var [loading, setLoading] = useState(true)
  var [err, setErr] = useState('')
  var [sending, setSending] = useState(false)

  var load = function (mon) {
    setLoading(true)
    setErr('')
    fetch('/api/weekly-report?week=' + mon)
      .then(function (r) { return r.json() })
      .then(function (j) {
        if (j && j.ok) { setData(j) } else { setErr((j && j.error) || 'Erreur de chargement'); setData(null) }
        setLoading(false)
      })
      .catch(function (e) { setErr(String(e)); setLoading(false) })
  }

  useEffect(function () { load(monday) }, [monday])

  var shiftWeek = function (deltaWeeks) {
    var d = new Date(monday + 'T00:00:00')
    d.setDate(d.getDate() + deltaWeeks * 7)
    setMonday(ymd(d))
  }
  var isCurrentMax = monday >= lastCompletedMonday()

  var sendNow = function () {
    if (sending) return
    setSending(true)
    fetch('/api/weekly-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: monday, send: true })
    })
      .then(function (r) { return r.json() })
      .then(function (j) {
        setSending(false)
        if (j && j.ok) {
          var bits = []
          if (j.emailSent) bits.push('email ✓')
          if (j.smsSent) bits.push('SMS ✓')
          if (j.note) { toast(j.note) }
          else if (bits.length) { toast('Bilan envoyé : ' + bits.join(' · ')) }
          else { toast('Traité, mais rien envoyé (voir config)') }
          if (j.errors && j.errors.length) { console.warn('weekly-report errors', j.errors) }
        } else {
          toast('Échec : ' + ((j && j.error) || 'inconnu'))
        }
      })
      .catch(function (e) { setSending(false); toast('Échec envoi : ' + String(e)) })
  }

  var m = data ? data.metrics : null
  var synth = data ? data.synthesis : null

  // pré-calculs d'affichage
  var maxDayCa = 0
  if (m && m.byDay) { m.byDay.forEach(function (d) { if (d.ca > maxDayCa) maxDayCa = d.ca }) }
  var chEntries = []
  if (m && m.channels) {
    chEntries = Object.keys(m.channels).map(function (k) { return { k: k, v: m.channels[k] } })
      .filter(function (e) { return e.v > 0 }).sort(function (a, b) { return b.v - a.v })
  }

  return (
    <div>
      <div className="ph">
        <div>
          <div className="pt">Bilan hebdo</div>
          <div className="ps">Généré automatiquement &middot; CA, tendances & synthèse IA</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-sm" onClick={function () { shiftWeek(-1) }}>◀</button>
          <button className="btn btn-sm" onClick={function () { if (!isCurrentMax) shiftWeek(1) }} style={{ opacity: isCurrentMax ? 0.4 : 1 }}>▶</button>
          <button className="btn btn-y btn-sm" onClick={function () { load(monday) }}>↻ Rafraîchir</button>
          <button className="btn btn-sm" style={{ background: ROSE, color: '#fff', opacity: sending ? 0.6 : 1 }} onClick={sendNow} disabled={sending}>{sending ? '⏳ Envoi…' : '📤 Envoyer (email + SMS)'}</button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 900, color: NOIR }}>Calcul du bilan en cours…</div>
        </div>
      ) : err ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, borderColor: ROSE }}>
          <div style={{ fontWeight: 900, color: NOIR, marginBottom: 6 }}>Impossible de charger le bilan</div>
          <div style={{ fontSize: 12, color: '#777' }}>{err}</div>
          <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={function () { load(monday) }}>Réessayer</button>
        </div>
      ) : !m || !m.hasData ? (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🗓️</div>
          <div style={{ fontWeight: 900, color: NOIR }}>{m ? m.weekLabel : ''}</div>
          <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Aucune donnée de caisse sur cette semaine.</div>
        </div>
      ) : (
        <div>
          {/* Bandeau CA */}
          <div className="card-p" style={{ textAlign: 'center', boxShadow: '4px 4px 0 ' + NOIR }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: NOIR, marginBottom: 2 }}>{m.weekLabel}</div>
            <div className="kv" style={{ fontSize: 40, color: NOIR }}>{eur(m.ca.ttc)}</div>
            <div style={{ fontSize: 11, color: NOIR, opacity: 0.7, margin: '2px 0 8px' }}>CA TTC encaissé</div>
            {m.ca.deltaPct != null ? (
              <span style={{ display: 'inline-block', fontSize: 13, fontWeight: 900, padding: '2px 12px', border: '2px solid ' + NOIR, borderRadius: 20, background: m.ca.deltaPct >= 0 ? JAUNE : '#fff', color: NOIR }}>{pctTxt(m.ca.deltaPct)} vs S-1</span>
            ) : null}
          </div>

          {/* KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, margin: '12px 0' }}>
            <div className="card" style={{ textAlign: 'center', marginBottom: 0 }}>
              <div className="kv" style={{ fontSize: 24 }}>{m.tickets.total}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#777', letterSpacing: 0.5 }}>Tickets{m.tickets.deltaPct != null ? ' (' + pctTxt(m.tickets.deltaPct) + ')' : ''}</div>
            </div>
            <div className="card" style={{ textAlign: 'center', marginBottom: 0 }}>
              <div className="kv" style={{ fontSize: 24 }}>{eur2(m.ticketMoyen)}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#777', letterSpacing: 0.5 }}>Panier moyen</div>
            </div>
            <div className="card" style={{ textAlign: 'center', marginBottom: 0 }}>
              <div className="kv" style={{ fontSize: 24 }}>{m.daysWithZ}/7</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#777', letterSpacing: 0.5 }}>Jours encaissés</div>
            </div>
          </div>

          {/* Synthèse IA */}
          {synth ? (
            <div className="card-y" style={{ boxShadow: '3px 3px 0 ' + NOIR }}>
              <div className="ct" style={{ marginBottom: 6 }}>🧠 Analyse de la semaine</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, color: NOIR }}>{synth.analyse}</div>
            </div>
          ) : null}

          {/* CA par jour */}
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="ct" style={{ marginBottom: 8 }}>CA par jour</div>
            {m.byDay.map(function (d) {
              var w = maxDayCa > 0 ? Math.round((d.ca / maxDayCa) * 100) : 0
              var isBest = m.bestDay && d.date === m.bestDay.date
              return (
                <div key={d.date} style={{ marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, color: NOIR }}>{d.jour}{d.anomaly ? ' ⚠️' : ''}{isBest ? ' 🏆' : ''}</span>
                    <span style={{ color: '#555' }}>{eur(d.ca)} &middot; {d.tickets} tk</span>
                  </div>
                  <div style={{ height: 12, background: '#EBEBEB', border: '1.5px solid ' + NOIR, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: w + '%', background: isBest ? JAUNE : ROSE }}></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Canaux */}
          <div className="card" style={{ marginBottom: 10 }}>
            <div className="ct" style={{ marginBottom: 8 }}>Répartition par canal</div>
            {chEntries.length === 0 ? <div style={{ fontSize: 12, color: '#777' }}>Aucune donnée.</div> : chEntries.map(function (e) {
              var p = m.ca.ttc > 0 ? Math.round((e.v / m.ca.ttc) * 100) : 0
              return (
                <div key={e.k} style={{ marginBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, color: NOIR }}>{CH_LABELS[e.k] || e.k}</span>
                    <span style={{ color: '#555' }}>{eur(e.v)} &middot; {p}%</span>
                  </div>
                  <div style={{ height: 10, background: '#EBEBEB', border: '1.5px solid ' + NOIR, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: p + '%', background: ROSE }}></div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Anomalies */}
          {m.anomalies && m.anomalies.length ? (
            <div className="card" style={{ marginBottom: 10, borderLeft: '6px solid ' + ROSE }}>
              <div style={{ fontWeight: 900, fontSize: 13, color: NOIR, marginBottom: 4 }}>⚠️ Anomalies Z ({m.anomalies.length})</div>
              <div style={{ fontSize: 12, color: '#555' }}>{m.anomalies.map(function (a) { return a.jour }).join(', ')}</div>
            </div>
          ) : null}

          {/* Priorités */}
          {synth && synth.priorites && synth.priorites.length ? (
            <div className="card" style={{ marginBottom: 10 }}>
              <div className="ct" style={{ marginBottom: 6 }}>🎯 Priorités semaine prochaine</div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {synth.priorites.map(function (p, i) {
                  return <li key={i} style={{ fontSize: 13, color: NOIR, marginBottom: 5, lineHeight: 1.5 }}>{p}</li>
                })}
              </ol>
            </div>
          ) : null}

          {/* Activité commerciale (honnête) */}
          <div style={{ fontSize: 12, color: '#777', borderTop: '1.5px solid #EBEBEB', paddingTop: 10 }}>
            Activité B2B : {m.commercial.devisCreated} devis créé{m.commercial.devisCreated > 1 ? 's' : ''} &middot; {m.commercial.rdvPlanned} RDV planifié{m.commercial.rdvPlanned > 1 ? 's' : ''} cette semaine
          </div>
        </div>
      )}
    </div>
  )
}
