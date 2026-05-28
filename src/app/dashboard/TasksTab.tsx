'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// TasksTab — Tableau de bord des tâches Meshuga (refonte UX/UI)
//
// 2 vues commutables :
//   - Kanban : 3 colonnes À faire / En cours / Terminé, drag & drop HTML5 natif
//   - Liste  : groupée par échéance (En retard / Aujourd'hui / Semaine / Plus tard)
//
// Filtres : assigné (Tous/Edward/Emy) + priorité
// Stats cliquables en haut qui servent de filtres rapides
//
// Props : tasks, loadTasks, openModal, toast, isEmy
// =============================================================================

var ROSE = '#FF82D7'
var JAUNE = '#FFEB5A'
var NOIR = '#191923'
var BLEU = '#005FFF'
var VERT = '#009D3A'
var ROUGE = '#CC0066'
var OR = '#B8920A'

var PRIO = {
  high:   { label: 'Haute',   color: ROUGE, bg: '#FFE6F0' },
  medium: { label: 'Moyenne', color: BLEU,  bg: '#E6EFFF' },
  low:    { label: 'Basse',   color: VERT,  bg: '#E6F7E9' }
}
var STATUS_COLS = [
  { key: 'todo',        label: 'À faire',  icon: '📋' },
  { key: 'in_progress', label: 'En cours', icon: '🚀' },
  { key: 'done',        label: 'Terminé',  icon: '✅' }
]

function daysTo(deadline) {
  if (!deadline) return null
  var d = new Date(deadline)
  d.setHours(0,0,0,0)
  var now = new Date()
  now.setHours(0,0,0,0)
  return Math.round((d.getTime() - now.getTime()) / (1000*60*60*24))
}
function deadlineInfo(deadline, status) {
  var dd = daysTo(deadline)
  if (dd === null) return { label: 'Pas de date', color: '#888' }
  if (status === 'done') return { label: 'Terminé', color: VERT }
  if (dd < 0) return { label: 'En retard (' + Math.abs(dd) + 'j)', color: ROUGE }
  if (dd === 0) return { label: "Aujourd'hui", color: ROUGE }
  if (dd === 1) return { label: 'Demain', color: OR }
  if (dd <= 7) return { label: 'Dans ' + dd + ' j', color: OR }
  var d = new Date(deadline)
  return { label: d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}), color: '#666' }
}
function checklistProgress(checklist) {
  if (!checklist || !checklist.filter) return null
  var items = checklist.filter(function(c){ return c })
  if (items.length === 0) return null
  var done = items.filter(function(c){ return c.indexOf('✓ ') === 0 }).length
  return { done: done, total: items.length }
}

export default function TasksTab(props) {
  var tasks = props.tasks || []
  var loadTasks = props.loadTasks || function(){}
  var openModal = props.openModal || function(){}
  var toast = props.toast || function(){}
  var isEmy = !!props.isEmy

  var [view, setView] = useState('kanban')          // 'kanban' | 'list'
  var [filterAssignee, setFilterAssignee] = useState('all')
  var [filterPrio, setFilterPrio] = useState('all')
  var [quickFilter, setQuickFilter] = useState(null) // 'late' | 'today' | null
  var [dragId, setDragId] = useState(null)
  var [dragOverCol, setDragOverCol] = useState(null)

  // ---- Filtrage ----
  function passFilters(t) {
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false
    if (filterPrio !== 'all' && t.priority !== filterPrio) return false
    if (quickFilter === 'late') {
      var dd = daysTo(t.deadline)
      if (t.status === 'done' || dd === null || dd >= 0) return false
    }
    if (quickFilter === 'today') {
      if (t.status === 'done' || daysTo(t.deadline) !== 0) return false
    }
    return true
  }
  var filtered = tasks.filter(passFilters)

  // ---- Stats ----
  var actives = tasks.filter(function(t){ return t.status !== 'done' })
  var nbLate = tasks.filter(function(t){ var dd=daysTo(t.deadline); return t.status!=='done' && dd!==null && dd<0 }).length
  var nbToday = tasks.filter(function(t){ return t.status!=='done' && daysTo(t.deadline)===0 }).length
  var nbTodo = tasks.filter(function(t){ return t.status==='todo' }).length
  var nbProgress = tasks.filter(function(t){ return t.status==='in_progress' }).length
  var nbDoneWeek = tasks.filter(function(t){
    if (t.status !== 'done') return false
    if (!t.completed_at && !t.updated_at) return true
    var ref = t.completed_at || t.updated_at
    var dd = daysTo(ref)
    return dd === null || dd >= -7
  }).length

  // ---- Actions ----
  function setStatus(t, newStatus) {
    if (t.status === newStatus) return
    var patch = { status: newStatus }
    if (newStatus === 'done') patch.completed_at = new Date().toISOString()
    sb().from('tasks').update(patch).eq('id', t.id).then(function(){
      loadTasks()
      if (newStatus === 'done') toast('✅ Tâche terminée !')
    })
  }
  function delTask(t) {
    sb().from('tasks').delete().eq('id', t.id).then(function(){ loadTasks(); toast('Tâche supprimée') })
  }
  function toggleChecklistItem(t, ci, checked) {
    var item = t.checklist[ci]
    var nl = t.checklist.slice()
    nl[ci] = checked ? '✓ ' + item.replace('✓ ', '') : item.replace('✓ ', '')
    sb().from('tasks').update({ checklist: nl }).eq('id', t.id).then(function(){ loadTasks() })
  }

  // ---- Drag & drop (Kanban) ----
  function onDragStart(e, id) {
    setDragId(id)
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id) } catch(err){} }
  }
  function onDragOverCol(e, colKey) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== colKey) setDragOverCol(colKey)
  }
  function onDropCol(e, colKey) {
    e.preventDefault()
    var id = dragId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null)
    if (id) {
      var t = tasks.filter(function(x){ return x.id === id })[0]
      if (t && t.status !== colKey) setStatus(t, colKey)
    }
    setDragId(null)
    setDragOverCol(null)
  }
  function onDragEnd() { setDragId(null); setDragOverCol(null) }

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:38,lineHeight:1,color:ROSE}}>Tâches</div>
          <div style={{fontSize:11,opacity:0.55,marginTop:3,fontWeight:700}}>{actives.length} active{actives.length>1?'s':''} · {tasks.length} au total</div>
        </div>
        <button className="btn btn-p btn-sm" onClick={function(){
          var today = new Date().toISOString().split('T')[0]
          openModal('task', {assignee: isEmy?'emy':'edward', priority:'medium', status:'todo', checklist:[], files:[], deadline:today})
        }}>+ Nouvelle tâche</button>
      </div>

      {/* ===== STATS CLIQUABLES ===== */}
      <div style={{display:'flex',gap:8,marginBottom:14,overflowX:'auto',paddingBottom:4}}>
        <StatChip icon="🔥" label="En retard" value={nbLate} color={ROUGE} active={quickFilter==='late'} onClick={function(){ setQuickFilter(quickFilter==='late'?null:'late') }} />
        <StatChip icon="📅" label="Aujourd'hui" value={nbToday} color={OR} active={quickFilter==='today'} onClick={function(){ setQuickFilter(quickFilter==='today'?null:'today') }} />
        <StatChip icon="📋" label="À faire" value={nbTodo} color={BLEU} />
        <StatChip icon="🚀" label="En cours" value={nbProgress} color={ROSE} />
        <StatChip icon="✅" label="Faites (7j)" value={nbDoneWeek} color={VERT} />
      </div>

      {/* ===== BARRE DE CONTRÔLE ===== */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        {/* Toggle vue */}
        <div style={{display:'flex',gap:6}}>
          <ViewToggle active={view==='kanban'} onClick={function(){ setView('kanban') }} icon="▦">Kanban</ViewToggle>
          <ViewToggle active={view==='list'} onClick={function(){ setView('list') }} icon="☰">Liste</ViewToggle>
        </div>
        {/* Filtres */}
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <FilterPill active={filterAssignee==='all'} onClick={function(){ setFilterAssignee('all') }}>Tous</FilterPill>
          <FilterPill active={filterAssignee==='edward'} onClick={function(){ setFilterAssignee('edward') }}>Edward</FilterPill>
          <FilterPill active={filterAssignee==='emy'} onClick={function(){ setFilterAssignee('emy') }}>Emy</FilterPill>
          <span style={{width:1,background:'#DDD',margin:'0 2px'}} />
          <FilterPill active={filterPrio==='all'} onClick={function(){ setFilterPrio('all') }}>Toutes prio.</FilterPill>
          <FilterPill active={filterPrio==='high'} onClick={function(){ setFilterPrio('high') }} dot={ROUGE}>Haute</FilterPill>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="card" style={{textAlign:'center',padding:'30px 20px'}}>
          <div style={{fontSize:36,marginBottom:8}}>🎉</div>
          <div style={{fontWeight:900,fontSize:15}}>Aucune tâche {quickFilter||filterAssignee!=='all'||filterPrio!=='all'?'pour ce filtre':'en cours'}</div>
          <div style={{fontSize:12,opacity:0.5,marginTop:4}}>{quickFilter||filterAssignee!=='all'||filterPrio!=='all'?'Essaie de changer les filtres.':'Profites-en !'}</div>
        </div>
      )}

      {/* ===== VUE KANBAN ===== */}
      {view === 'kanban' && filtered.length > 0 && (
        <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:8,alignItems:'flex-start'}}>
          {STATUS_COLS.map(function(col){
            var colTasks = filtered.filter(function(t){ return t.status === col.key })
            var isOver = dragOverCol === col.key
            return (
              <div key={col.key}
                onDragOver={function(e){ onDragOverCol(e, col.key) }}
                onDrop={function(e){ onDropCol(e, col.key) }}
                onDragLeave={function(){ if(dragOverCol===col.key) setDragOverCol(null) }}
                style={{
                  flex:'1 1 0', minWidth:260, maxWidth:'100%',
                  background: isOver ? '#FFF7FC' : '#FAFAFA',
                  border:'2px solid '+(isOver?ROSE:NOIR), borderRadius:9,
                  padding:8, transition:'all .15s',
                  boxShadow: isOver ? '0 0 0 3px '+ROSE : 'none'
                }}>
                <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px 10px'}}>
                  <span style={{fontSize:16}}>{col.icon}</span>
                  <span style={{fontWeight:900,fontSize:13,textTransform:'uppercase',letterSpacing:0.5}}>{col.label}</span>
                  <span style={{marginLeft:'auto',background:NOIR,color:JAUNE,borderRadius:10,padding:'1px 8px',fontSize:11,fontWeight:900}}>{colTasks.length}</span>
                </div>
                {colTasks.length === 0 && (
                  <div style={{padding:'18px 8px',textAlign:'center',fontSize:11,opacity:0.4,fontWeight:700,border:'1.5px dashed #CCC',borderRadius:6}}>
                    {isOver ? '↓ Déposer ici' : 'Vide'}
                  </div>
                )}
                {colTasks.map(function(t){
                  return <TaskCard key={t.id} t={t} kanban
                    dragging={dragId===t.id}
                    onDragStart={function(e){ onDragStart(e, t.id) }}
                    onDragEnd={onDragEnd}
                    onEdit={function(){ openModal('task', Object.assign({}, t)) }}
                    onDelete={function(){ delTask(t) }}
                    onStatus={function(s){ setStatus(t, s) }}
                    onToggleCheck={function(ci, ck){ toggleChecklistItem(t, ci, ck) }}
                  />
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== VUE LISTE ===== */}
      {view === 'list' && filtered.length > 0 && (
        <div>
          {(function(){
            var groups = [
              { key:'late',  label:'🔥 En retard',     test:function(t){ var d=daysTo(t.deadline); return t.status!=='done' && d!==null && d<0 } },
              { key:'today', label:"📅 Aujourd'hui",    test:function(t){ return t.status!=='done' && daysTo(t.deadline)===0 } },
              { key:'week',  label:'🗓️ Cette semaine',  test:function(t){ var d=daysTo(t.deadline); return t.status!=='done' && d!==null && d>0 && d<=7 } },
              { key:'later', label:'📆 Plus tard',      test:function(t){ var d=daysTo(t.deadline); return t.status!=='done' && (d===null || d>7) } },
              { key:'done',  label:'✅ Terminées',       test:function(t){ return t.status==='done' } }
            ]
            return groups.map(function(g){
              var gt = filtered.filter(g.test)
              if (gt.length === 0) return null
              return (
                <div key={g.key} style={{marginBottom:16}}>
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,color:ROSE,marginBottom:8}}>{g.label} <span style={{fontSize:13,opacity:0.5}}>({gt.length})</span></div>
                  {gt.map(function(t){
                    return <TaskCard key={t.id} t={t}
                      onEdit={function(){ openModal('task', Object.assign({}, t)) }}
                      onDelete={function(){ delTask(t) }}
                      onStatus={function(s){ setStatus(t, s) }}
                      onToggleCheck={function(ci, ck){ toggleChecklistItem(t, ci, ck) }}
                    />
                  })}
                </div>
              )
            })
          })()}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function StatChip(props) {
  var active = props.active
  var clickable = !!props.onClick
  return (
    <div onClick={props.onClick} style={{
      flex:'1 1 0', minWidth:110,
      background: active ? props.color : '#FFFFFF',
      color: active ? '#FFFFFF' : NOIR,
      border:'2px solid '+NOIR, borderRadius:8, padding:'10px 12px',
      boxShadow: active ? '3px 3px 0 '+NOIR : '2px 2px 0 '+NOIR,
      cursor: clickable ? 'pointer' : 'default',
      transition:'all .12s', position:'relative'
    }}>
      <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
        <span style={{fontSize:14}}>{props.icon}</span>
        <span style={{fontSize:10,fontWeight:900,textTransform:'uppercase',letterSpacing:0.3,opacity:active?0.95:0.6}}>{props.label}</span>
      </div>
      <div style={{fontWeight:900,fontSize:22,lineHeight:1,color:active?'#FFFFFF':props.color}}>{props.value}</div>
    </div>
  )
}

function ViewToggle(props) {
  var active = props.active
  return (
    <div onClick={props.onClick} style={{
      display:'flex',alignItems:'center',gap:5,
      padding:'7px 14px', fontSize:12, fontWeight:900,
      borderRadius:7, border:'2px solid '+NOIR,
      background: active ? NOIR : '#FFFFFF',
      color: active ? JAUNE : NOIR,
      cursor:'pointer', boxShadow: active ? '2px 2px 0 '+ROSE : 'none',
      textTransform:'uppercase', letterSpacing:0.3, transition:'all .1s'
    }}>
      <span style={{fontSize:14}}>{props.icon}</span>{props.children}
    </div>
  )
}

function FilterPill(props) {
  var active = props.active
  return (
    <div onClick={props.onClick} style={{
      display:'flex',alignItems:'center',gap:5,
      padding:'5px 12px', fontSize:11, fontWeight:900,
      borderRadius:16, border:'2px solid '+NOIR,
      background: active ? ROSE : '#FFFFFF',
      color: active ? '#FFFFFF' : NOIR,
      cursor:'pointer', whiteSpace:'nowrap', transition:'all .1s'
    }}>
      {props.dot && <span style={{width:8,height:8,borderRadius:'50%',background:props.dot,display:'inline-block',border:'1px solid '+NOIR}} />}
      {props.children}
    </div>
  )
}

function TaskCard(props) {
  var t = props.t
  var kanban = props.kanban
  var prio = PRIO[t.priority] || PRIO.medium
  var dl = deadlineInfo(t.deadline, t.status)
  var prog = checklistProgress(t.checklist)
  var assigneeLabel = t.assignee === 'emy' ? 'Emy' : 'Edward'
  var assigneeColor = t.assignee === 'emy' ? ROSE : BLEU

  return (
    <div
      draggable={kanban ? 'true' : undefined}
      onDragStart={kanban ? props.onDragStart : undefined}
      onDragEnd={kanban ? props.onDragEnd : undefined}
      style={{
        background:'#FFFFFF', border:'2px solid '+NOIR, borderRadius:8,
        padding:0, marginBottom:8, overflow:'hidden',
        boxShadow:'2px 2px 0 '+NOIR,
        opacity: props.dragging ? 0.4 : 1,
        cursor: kanban ? 'grab' : 'default',
        transition:'opacity .1s'
      }}>
      <div style={{display:'flex',alignItems:'stretch'}}>
        {/* Barre priorité */}
        <div style={{width:6,background:prio.color,flexShrink:0}} />
        <div style={{padding:'10px 12px',flex:1,minWidth:0}}>
          {/* Ligne 1 : titre + actions */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
            <div style={{fontSize:13,fontWeight:900,lineHeight:1.25,flex:1,wordBreak:'break-word',textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?0.5:1}}>{t.title}</div>
            <div style={{display:'flex',gap:3,flexShrink:0}}>
              <button className="btn btn-sm" style={{padding:'3px 7px',fontSize:11,boxShadow:'1px 1px 0 '+NOIR}} onClick={props.onEdit} title="Modifier">✏️</button>
              <button className="btn btn-sm btn-red" style={{padding:'3px 7px',fontSize:11,boxShadow:'1px 1px 0 '+NOIR}} onClick={props.onDelete} title="Supprimer">✕</button>
            </div>
          </div>

          {/* Description courte */}
          {t.description && <div style={{fontSize:11,opacity:0.6,marginTop:4,lineHeight:1.3,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{t.description}</div>}

          {/* Ligne meta : priorité + assigné + deadline */}
          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:8,flexWrap:'wrap'}}>
            <span style={{background:prio.bg,color:prio.color,border:'1.5px solid '+prio.color,borderRadius:10,padding:'1px 7px',fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:0.3}}>{prio.label}</span>
            <span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:900}}>
              <span style={{width:14,height:14,borderRadius:'50%',background:assigneeColor,color:'#FFFFFF',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,border:'1px solid '+NOIR}}>{assigneeLabel.charAt(0)}</span>
              {assigneeLabel}
            </span>
            <span style={{marginLeft:'auto',fontSize:10,fontWeight:900,color:dl.color}}>{dl.label}</span>
          </div>

          {/* Barre de progression checklist */}
          {prog && (
            <div style={{marginTop:8}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:9,fontWeight:900,opacity:0.6,marginBottom:2}}>
                <span>Checklist</span><span>{prog.done}/{prog.total}</span>
              </div>
              <div style={{height:6,background:'#EBEBEB',borderRadius:3,border:'1px solid '+NOIR,overflow:'hidden'}}>
                <div style={{width:(prog.total>0?(prog.done/prog.total*100):0)+'%',height:'100%',background:prog.done===prog.total?VERT:ROSE,transition:'width .3s'}} />
              </div>
            </div>
          )}

          {/* Checklist détaillée (vue liste seulement, pour ne pas surcharger le kanban) */}
          {!kanban && t.checklist && t.checklist.filter(function(c){return c}).length > 0 && (
            <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid #EBEBEB'}}>
              {t.checklist.filter(function(c){return c}).map(function(item, ci){
                var checked = item.indexOf('✓ ') === 0
                return (
                  <div key={ci} style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                    <input type="checkbox" checked={checked} style={{width:14,height:14,cursor:'pointer',accentColor:ROSE}}
                      onChange={function(e){ props.onToggleCheck(ci, e.target.checked) }} />
                    <span style={{fontSize:11,textDecoration:checked?'line-through':'none',opacity:checked?0.4:1}}>{item.replace('✓ ','')}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Boutons de changement de statut */}
          <div style={{display:'flex',gap:4,marginTop:10}}>
            {t.status !== 'todo' && <button className="btn btn-sm" style={{flex:1,justifyContent:'center',fontSize:9,padding:'4px'}} onClick={function(){ props.onStatus('todo') }}>📋 À faire</button>}
            {t.status !== 'in_progress' && <button className="btn btn-sm btn-p" style={{flex:1,justifyContent:'center',fontSize:9,padding:'4px'}} onClick={function(){ props.onStatus('in_progress') }}>🚀 En cours</button>}
            {t.status !== 'done' && <button className="btn btn-sm btn-g" style={{flex:1,justifyContent:'center',fontSize:9,padding:'4px'}} onClick={function(){ props.onStatus('done') }}>✅ Fini</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
