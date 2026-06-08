'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// Suivi commercial — vue d'ensemble de l'activité B2B (Emy)
// Données réelles : devis (pipeline + CA), tâches, backlog prospection.
// SWC-safe : var dans JSX, pas de generics, function(){}, pas de fragments
// ============================================================

var supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

// Statuts de devis (ordre pipeline)
var DEVIS_STATUTS = [
  {id: 'brouillon', label: 'Brouillon', color: '#999999', group: 'draft'},
  {id: 'envoye', label: 'Envoyé', color: '#FF82D7', group: 'active'},
  {id: 'a_modifier', label: 'À modifier', color: '#E8A100', group: 'active'},
  {id: 'accepte', label: 'Accepté', color: '#00A352', group: 'won'},
  {id: 'facture', label: 'Facturé', color: '#009D3A', group: 'won'},
  {id: 'paye', label: 'Payé', color: '#0A7D2E', group: 'won'},
  {id: 'refuse', label: 'Refusé', color: '#C8166A', group: 'lost'}
]

function euro(n) {
  var v = parseFloat(n || 0)
  if (isNaN(v)) v = 0
  return v.toLocaleString('fr-FR', {minimumFractionDigits: 0, maximumFractionDigits: 0}) + ' €'
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit', year: '2-digit'})
}

function monthPrefix() {
  return new Date().toISOString().slice(0, 7)
}

function statutConf(id) {
  var c = DEVIS_STATUTS.filter(function(s) { return s.id === id })[0]
  return c || {id: id, label: id || '—', color: '#888', group: 'other'}
}

export default function JournalTab(props) {
  var activityLog = props.activityLog || []

  var [devis, setDevis] = useState([])
  var [tasks, setTasks] = useState([])
  var [backlog, setBacklog] = useState(0)
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    var run = async function() {
      setLoading(true)
      try {
        var d = await supabase.from('devis').select('id, statut, total_ttc, created_at, sent_at, signed_at, client_nom, numero').order('created_at', {ascending: false}).limit(300)
        setDevis(d.data || [])
      } catch (e) { console.error(e) }
      try {
        var t = await supabase.from('tasks').select('id, title, assignee, status, priority, deadline, created_at').order('deadline', {ascending: true}).limit(200)
        setTasks(t.data || [])
      } catch (e) { console.error(e) }
      try {
        var c = await supabase.from('chasse_prospects').select('id', {count: 'exact', head: true}).eq('status', 'to_contact')
        setBacklog(c.count || 0)
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    run()
  }, [])

  // ===== Derives devis =====
  var mp = monthPrefix()
  var devisMonth = devis.filter(function(x) { return (x.created_at || '').slice(0, 7) === mp }).length
  var wonDevis = devis.filter(function(x) { return statutConf(x.statut).group === 'won' })
  var activeDevis = devis.filter(function(x) { return statutConf(x.statut).group === 'active' })
  var caSigne = wonDevis.reduce(function(s, x) { return s + parseFloat(x.total_ttc || 0) }, 0)
  var caPipeline = activeDevis.reduce(function(s, x) { return s + parseFloat(x.total_ttc || 0) }, 0)

  // ===== Derives taches (Emy) =====
  var today = new Date().toISOString().slice(0, 10)
  var emyTasks = tasks.filter(function(t) { return (t.assignee || '').toLowerCase() === 'emy' })
  var emyTodo = emyTasks.filter(function(t) { return t.status !== 'done' })
  var emyLate = emyTodo.filter(function(t) { return t.deadline && t.deadline < today })

  // ===== Activite (leger) =====
  var emySessions = activityLog.filter(function(a) { return a.type === 'session_start' && (a.user_name || '').toLowerCase().indexOf('emy') > -1 })
  var emySessionsMonth = emySessions.filter(function(a) { return (a.created_at || '').slice(0, 7) === mp }).length
  var emyActions = activityLog.filter(function(a) {
    var isEmyUser = (a.user_name || '').toLowerCase().indexOf('emy') > -1
    var isAction = a.type !== 'session_start' && a.type !== 'session_end'
    return isEmyUser && isAction
  }).slice(0, 12)

  var kpi = function(value, label, color) {
    return (
      <div style={{background: '#FFFFFF', border: '2px solid #191923', boxShadow: '2px 2px 0 #191923', padding: '12px 14px', textAlign: 'center'}}>
        <div style={{fontSize: 26, fontWeight: 900, color: color || '#191923', lineHeight: 1.1}}>{value}</div>
        <div style={{fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: .5, marginTop: 4, fontWeight: 700}}>{label}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="ph">
        <div>
          <div className="pt">Suivi commercial 📊</div>
          <div className="ps">Devis &middot; CA &middot; Tâches &middot; Prospection</div>
        </div>
      </div>

      {loading && <div style={{textAlign: 'center', padding: 30, color: '#666'}}>Chargement…</div>}

      {!loading && (
        <div>
          {/* KPIs */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18}}>
            {kpi(devisMonth, 'Devis créés ce mois', '#FF82D7')}
            {kpi(wonDevis.length, 'Devis gagnés', '#00A352')}
            {kpi(euro(caSigne), 'CA signé', '#0A7D2E')}
            {kpi(euro(caPipeline), 'CA en pipeline', '#E8A100')}
            {kpi(emyTodo.length, 'Tâches Emy à faire', emyLate.length ? '#C8166A' : '#191923')}
          </div>

          {/* Pipeline devis */}
          <div style={{fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#FF82D7', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #FF82D7'}}>
            Pipeline devis
          </div>
          {devis.length === 0 && (
            <div style={{background: '#FAFAFA', border: '2px dashed #CCC', padding: 20, textAlign: 'center', color: '#999', fontSize: 13, marginBottom: 18}}>
              Aucun devis enregistré pour le moment. Les devis envoyés via le module Devis apparaîtront ici.
            </div>
          )}
          {devis.length > 0 && (
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 18}}>
              {DEVIS_STATUTS.map(function(s) {
                var rows = devis.filter(function(x) { return x.statut === s.id })
                var montant = rows.reduce(function(a, x) { return a + parseFloat(x.total_ttc || 0) }, 0)
                return (
                  <div key={s.id} style={{background: '#FFFFFF', border: '2px solid #191923', borderLeft: '6px solid ' + s.color, boxShadow: '2px 2px 0 #191923', padding: '10px 12px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5, color: '#191923'}}>{s.label}</span>
                      <span style={{background: s.color, color: '#FFFFFF', fontWeight: 900, fontSize: 11, padding: '2px 8px'}}>{rows.length}</span>
                    </div>
                    <div style={{fontSize: 13, fontWeight: 900, color: '#191923', marginTop: 6}}>{euro(montant)}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Taches Emy */}
          <div style={{fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#FF82D7', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #FF82D7'}}>
            Tâches d&apos;Emy {emyLate.length ? '· ' + emyLate.length + ' en retard' : ''}
          </div>
          {emyTodo.length === 0 && (
            <div style={{background: '#FAFAFA', border: '2px dashed #CCC', padding: 20, textAlign: 'center', color: '#999', fontSize: 13, marginBottom: 18}}>
              Aucune tâche en cours pour Emy.
            </div>
          )}
          {emyTodo.length > 0 && (
            <div style={{border: '2px solid #191923', boxShadow: '2px 2px 0 #191923', marginBottom: 18}}>
              {emyTodo.map(function(t, i) {
                var late = t.deadline && t.deadline < today
                return (
                  <div key={t.id || i} style={{display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: i < emyTodo.length - 1 ? '1px solid #EEE' : 'none', background: late ? '#FFF0F5' : (i % 2 === 0 ? '#FAFAFA' : '#FFFFFF')}}>
                    <span style={{fontSize: 16}}>{late ? '🔴' : '⬜'}</span>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontSize: 13, fontWeight: 700, color: '#191923', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{t.title}</div>
                      {t.deadline && <div style={{fontSize: 10, color: late ? '#C8166A' : '#888', fontWeight: late ? 900 : 400}}>{late ? 'En retard · ' : 'Échéance '}{fmtDate(t.deadline)}</div>}
                    </div>
                    {t.priority === 'high' && <span style={{fontSize: 9, fontWeight: 900, color: '#C8166A', background: '#FFE0E0', padding: '2px 6px', whiteSpace: 'nowrap'}}>PRIORITÉ</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Prospection */}
          <div style={{fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: '#FF82D7', marginBottom: 8, paddingBottom: 4, borderBottom: '2px solid #FF82D7'}}>
            Prospection
          </div>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12}}>
            {kpi(backlog, 'Prospects à contacter', '#FF82D7')}
            {kpi(emyActions.length, 'Actions loggées', '#191923')}
            {kpi(emySessionsMonth, 'Connexions Emy ce mois', '#191923')}
          </div>
          {emyActions.length > 0 && (
            <div style={{border: '2px solid #191923', boxShadow: '2px 2px 0 #191923', marginBottom: 12}}>
              {emyActions.map(function(a, i) {
                var time = a.created_at ? new Date(a.created_at).toLocaleString('fr-FR', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : ''
                return (
                  <div key={i} style={{display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: i < emyActions.length - 1 ? '1px solid #F0F0F0' : 'none', fontSize: 12}}>
                    <span style={{flex: 1, color: '#191923'}}>{a.prospect_name || a.description || a.type}</span>
                    <span style={{fontSize: 10, color: '#999'}}>{time}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{background: '#FFFEF2', border: '2px solid #191923', borderLeft: '6px solid #FFEB5A', padding: '12px 16px', boxShadow: '2px 2px 0 #191923', fontSize: 11, color: '#444', lineHeight: 1.6}}>
            <strong>À savoir :</strong> ce suivi s&apos;appuie sur les données réellement enregistrées (devis, tâches, connexions). Le détail de la prospection (qui a été contacté, relances effectuées) ne se remplira que lorsque la prospection sera réalisée <strong>dans l&apos;app</strong> — aujourd&apos;hui les {backlog} prospects restent &laquo; à contacter &raquo;. Pour un vrai suivi prospection, il faut connecter le flux prospection à la base (chantier CRM).
          </div>
        </div>
      )}
    </div>
  )
}
