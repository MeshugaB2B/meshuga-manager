'use client'
import { useState } from 'react'

// =============================================================================
// CrmTab — Cockpit commercial Meshuga (refonte UX/UI)
//
// Structure :
//   1. 3 PRIORITÉS DU JOUR  — ce qu'Emy doit traiter en priorité aujourd'hui
//   2. BARRE PERF EMY        — commission, objectif (jauge), CA pipeline
//   3. CONTRÔLES             — toggle Pipeline/Liste · recherche · filtres
//   4a. PIPELINE KANBAN      — colonnes par étape, drag & drop, valeur cumulée
//   4b. LISTE                — cartes riches avec actions
//   + Modal script d'appel IA
//
// Tout l'état et les actions viennent du parent via `ctx` (props groupées),
// pour préserver 100% de la logique métier existante (scoring, devis, notifs).
// =============================================================================

var ROSE = '#FF82D7'
var JAUNE = '#FFEB5A'
var NOIR = '#191923'
var BLEU = '#005FFF'
var VERT = '#009D3A'
var ROUGE = '#CC0066'
var OR = '#B8920A'
var ORANGE = '#FF6B2B'

var TEMP_COLORS = { chaud: ROUGE, tiede: ORANGE, froid: BLEU }
var TEMP_LABELS = { chaud: '🔥 Chaud', tiede: '🌤️ Tiède', froid: '❄️ Froid' }

var STATUS_COLS = [
  { id: 'to_contact', label: 'À contacter', color: '#7A7A85', icon: '📋' },
  { id: 'contacted',  label: 'Contacté',    color: BLEU,      icon: '📞' },
  { id: 'nego',       label: 'En négo',     color: ROSE,      icon: '🤝' },
  { id: 'won',        label: 'Gagné',       color: VERT,      icon: '🏆' },
  { id: 'lost',       label: 'Perdu',       color: ROUGE,     icon: '✗' }
]
var STATUS_LABELS = { to_contact:'À contacter', contacted:'Contacté', nego:'En négo', won:'🏆 Gagné', lost:'✗ Perdu' }
var STATUS_COLORS = { to_contact:'#7A7A85', contacted:BLEU, nego:ROSE, won:VERT, lost:ROUGE }

function todayStr() { return new Date().toISOString().split('T')[0] }
function isLate(p) { return p.nextDate && p.nextDate <= todayStr() && p.status !== 'won' && p.status !== 'lost' }
function daysSince(iso) {
  if (!iso) return null
  var d = new Date(iso); d.setHours(0,0,0,0)
  var now = new Date(); now.setHours(0,0,0,0)
  return Math.round((now.getTime() - d.getTime()) / (1000*60*60*24))
}

export default function CrmTab(ctx) {
  var prospects = ctx.prospects || []
  var setProspects = ctx.setProspects || function(){}
  var devisList = ctx.devisList || []
  var commissionObjectif = ctx.commissionObjectif || 0
  var setCommissionObjectif = ctx.setCommissionObjectif || function(){}
  var scoringLoading = ctx.scoringLoading
  var autoScore = ctx.autoScore || function(){}
  var openModal = ctx.openModal || function(){}
  var toast = ctx.toast || function(){}
  var nav = ctx.nav || function(){}
  var generateEmail = ctx.generateEmail || function(){}
  var generateScript = ctx.generateScript || function(){}
  var sendPushToAll = ctx.sendPushToAll || function(){}
  var scriptProspect = ctx.scriptProspect
  var setScriptProspect = ctx.setScriptProspect || function(){}
  var scriptContent = ctx.scriptContent
  var scriptLoading = ctx.scriptLoading
  var isEmy = !!ctx.isEmy

  var [view, setView] = useState('pipeline')   // 'pipeline' | 'list'
  var [search, setSearch] = useState('')
  var [tempFilter, setTempFilter] = useState('all')
  var [period, setPeriod] = useState('month')
  var [editObj, setEditObj] = useState(false)
  var [dragId, setDragId] = useState(null)
  var [dragOverCol, setDragOverCol] = useState(null)

  // ---- Commission ----
  var now = new Date()
  var mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  var yStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  var signedFilter = function(d) {
    var signed = d.statut === 'paye' || d.statut === 'facture' || d.statut === 'accepte'
    if (!signed) return false
    if (period === 'month') return d.created_at && d.created_at >= mStart
    if (period === 'year') return d.created_at && d.created_at >= yStart
    return true
  }
  var caSigned = devisList.filter(signedFilter).reduce(function(s,d){ return s + (parseFloat(d.total_ht)||0) }, 0)
  var commission = caSigned * 0.10
  var nbContrats = devisList.filter(signedFilter).length
  var pipeCA = devisList.filter(function(d){ return d.statut === 'envoye' }).reduce(function(s,d){ return s + (parseFloat(d.total_ht)||0) }, 0)
  var nbPipe = devisList.filter(function(d){ return d.statut === 'envoye' }).length
  var objectif = period === 'month' ? commissionObjectif : period === 'year' ? commissionObjectif * 12 : null
  var progress = objectif ? Math.min(100, Math.round(commission / objectif * 100)) : null
  var progressColor = progress === null ? JAUNE : progress >= 100 ? VERT : progress >= 50 ? OR : ROSE
  var periodLabel = period === 'month' ? 'Ce mois' : period === 'year' ? 'Cette année' : 'Total'

  // ---- 3 priorités du jour ----
  var priorities = []
  var actifs = prospects.filter(function(p){ return p.status !== 'won' && p.status !== 'lost' })
  // 1. Relances en retard (les plus anciennes d'abord)
  actifs.filter(isLate).sort(function(a,b){ return (a.nextDate||'') < (b.nextDate||'') ? -1 : 1 }).forEach(function(p){
    priorities.push({ p: p, reason: 'Relance en retard', detail: p.nextAction || 'À relancer', urgency: 3, icon: '🔴' })
  })
  // 2. En négo (chaud, à closer)
  actifs.filter(function(p){ return p.status === 'nego' }).forEach(function(p){
    if (!priorities.some(function(x){ return x.p.id === p.id })) priorities.push({ p: p, reason: 'En négo — à closer', detail: 'Envoie le devis vite', urgency: 2, icon: '🤝' })
  })
  // 3. Prospects chauds non traités
  actifs.filter(function(p){ return p.temperature === 'chaud' }).forEach(function(p){
    if (!priorities.some(function(x){ return x.p.id === p.id })) priorities.push({ p: p, reason: 'Prospect chaud', detail: 'À travailler en priorité', urgency: 2, icon: '🔥' })
  })
  // 4. À contacter (le potentiel qui dort)
  actifs.filter(function(p){ return p.status === 'to_contact' }).forEach(function(p){
    if (!priorities.some(function(x){ return x.p.id === p.id })) priorities.push({ p: p, reason: 'À contacter', detail: 'Premier contact à faire', urgency: 1, icon: '📋' })
  })
  priorities.sort(function(a,b){ return b.urgency - a.urgency })
  var top3 = priorities.slice(0, 3)

  // ---- Filtrage ----
  function matchFilters(p) {
    var s = search.toLowerCase()
    if (s && p.name.toLowerCase().indexOf(s) === -1 && (p.category||'').toLowerCase().indexOf(s) === -1) return false
    if (tempFilter !== 'all' && p.temperature !== tempFilter) return false
    return true
  }

  // ---- Actions ----
  function updateProspect(id, patch) {
    setProspects(function(prev){ return prev.map(function(x){ return x.id === id ? Object.assign({}, x, patch) : x }) })
  }
  function setStatus(p, st) {
    updateProspect(p.id, { status: st })
    if (st === 'won') { sendPushToAll('🏆 Prospect gagné !', p.name + ' est maintenant client !', 'all'); toast('🏆 Gagné !') }
    else toast('Statut mis à jour ✓')
  }
  function emailProspect(p, kind) {
    generateEmail(Object.assign({}, p, {cat:'crm', arrondissement:'', taille:p.size, pitch:p.notes||'', type:p.category}), kind)
  }

  // ---- Drag & drop pipeline ----
  function onDragStart(e, id) {
    setDragId(id)
    if (e.dataTransfer) { e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id) } catch(err){} }
  }
  function onDragOverCol(e, colId) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== colId) setDragOverCol(colId)
  }
  function onDropCol(e, colId) {
    e.preventDefault()
    var id = dragId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null)
    if (id) {
      var p = prospects.filter(function(x){ return x.id === id })[0]
      if (p && p.status !== colId) setStatus(p, colId)
    }
    setDragId(null); setDragOverCol(null)
  }
  function onDragEnd() { setDragId(null); setDragOverCol(null) }

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:38,lineHeight:1,color:ROSE}}>CRM Prospects</div>
          <div style={{fontSize:11,opacity:0.55,marginTop:3,fontWeight:700}}>{actifs.length} actif{actifs.length>1?'s':''} · {prospects.length} au total</div>
        </div>
        <button className="btn btn-p btn-sm" onClick={function(){ openModal('prospect', {status:'to_contact', temperature:'tiede', ca:0, files:[]}) }}>+ Nouveau prospect</button>
      </div>

      {/* ===== 3 PRIORITÉS DU JOUR ===== */}
      <div className="card" style={{borderColor:ROSE, borderWidth:3}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <span style={{fontSize:20}}>🎯</span>
          <span style={{fontWeight:900,fontSize:13,textTransform:'uppercase',letterSpacing:0.5}}>Tes 3 priorités du jour</span>
        </div>
        {top3.length === 0 && (
          <div style={{padding:'14px',textAlign:'center',fontSize:13,fontWeight:700,opacity:0.6}}>✅ Tout est à jour. Beau travail !</div>
        )}
        <div className="g3">
          {top3.map(function(item, i){
            var p = item.p
            return (
              <div key={p.id} style={{background:'#FFF7FC',border:'2px solid '+NOIR,borderRadius:8,padding:'12px',boxShadow:'2px 2px 0 '+NOIR,display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:16}}>{item.icon}</span>
                  <span style={{fontSize:10,fontWeight:900,textTransform:'uppercase',letterSpacing:0.3,color:item.urgency>=3?ROUGE:item.urgency>=2?OR:BLEU}}>{item.reason}</span>
                </div>
                <div>
                  <div style={{fontWeight:900,fontSize:14,cursor:'pointer'}} onClick={function(){ openModal('prospect', Object.assign({}, p)) }}>{p.name}</div>
                  <div style={{fontSize:11,opacity:0.6,marginTop:1}}>{p.category || '—'}</div>
                  <div style={{fontSize:11,fontWeight:700,marginTop:4,color:item.urgency>=3?ROUGE:'#555'}}>{item.detail}</div>
                </div>
                <div style={{display:'flex',gap:4,marginTop:'auto'}}>
                  <button className="btn btn-sm btn-p" style={{flex:1,justifyContent:'center',fontSize:9}} onClick={function(){ generateScript(p) }}>📞 Script</button>
                  <button className="btn btn-sm" style={{flex:1,justifyContent:'center',fontSize:9}} onClick={function(){ emailProspect(p, p.status==='to_contact'?'first':'relance') }}>✉️ Email</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== BARRE PERF EMY ===== */}
      <div className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10,marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:ROSE,lineHeight:1}}>💰 Commission Emy</div>
            <div style={{fontSize:10,opacity:0.6,marginTop:3,textTransform:'uppercase',letterSpacing:0.5,fontWeight:700}}>{periodLabel} · 10% du CA HT signé</div>
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {['month','year','all'].map(function(per){
              var active = period === per
              return <button key={per} onClick={function(){ setPeriod(per) }} style={{fontSize:10,fontWeight:900,padding:'4px 10px',borderRadius:14,border:'2px solid '+NOIR,background:active?ROSE:'#FFFFFF',color:active?'#FFFFFF':NOIR,cursor:'pointer',textTransform:'uppercase'}}>{per==='month'?'Mois':per==='year'?'Année':'Total'}</button>
            })}
          </div>
        </div>

        {/* Jauge objectif */}
        {objectif && (
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:0.5,opacity:0.6}}>Objectif {period==='month'?'mensuel':'annuel'} · {progress}%</span>
              {editObj ? (
                <span style={{display:'flex',gap:4,alignItems:'center'}}>
                  <input type="number" id="crm-obj-input" defaultValue={commissionObjectif} style={{width:70,fontSize:11,padding:'3px 6px',border:'2px solid '+NOIR,borderRadius:4}} />
                  <button className="btn btn-sm btn-p" style={{fontSize:9}} onClick={function(){
                    var el = document.getElementById('crm-obj-input')
                    var val = el ? parseInt(el.value) : commissionObjectif
                    if (val > 0) setCommissionObjectif(val)
                    setEditObj(false); toast('Objectif mis à jour !')
                  }}>OK</button>
                </span>
              ) : (
                <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){ setEditObj(true) }}>🎯 {commissionObjectif.toLocaleString('fr-FR')} €/mois</button>
              )}
            </div>
            <div style={{background:'#EBEBEB',borderRadius:20,height:12,overflow:'hidden',border:'2px solid '+NOIR}}>
              <div style={{width:progress+'%',background:progressColor,height:'100%',transition:'width .5s ease'}} />
            </div>
            {progress >= 100 && <div style={{fontSize:11,color:VERT,fontWeight:900,marginTop:5,textAlign:'center'}}>🏆 Objectif atteint ! Félicitations Emy !</div>}
            {progress >= 50 && progress < 100 && <div style={{fontSize:11,opacity:0.6,marginTop:5,textAlign:'center',fontWeight:700}}>Mi-chemin — encore {(objectif - commission).toLocaleString('fr-FR',{maximumFractionDigits:0})} € à aller !</div>}
          </div>
        )}

        <div className="g2" style={{marginBottom:0}}>
          <div style={{background:'#F8F9FF',border:'2px solid '+BLEU,borderRadius:7,padding:'12px 14px'}}>
            <div style={{fontSize:10,opacity:0.6,fontWeight:900,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>CA B2B signé</div>
            <div style={{fontWeight:900,fontSize:22}}>{caSigned.toLocaleString('fr-FR',{maximumFractionDigits:0})} <span style={{fontSize:11,opacity:0.5}}>€ HT</span></div>
            <div style={{fontSize:10,opacity:0.6,fontWeight:700,marginTop:2}}>{nbContrats} contrat{nbContrats>1?'s':''}</div>
          </div>
          <div style={{background:JAUNE,border:'2px solid '+NOIR,borderRadius:7,padding:'12px 14px'}}>
            <div style={{fontSize:10,opacity:0.7,fontWeight:900,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>🎉 Commission</div>
            <div style={{fontWeight:900,fontSize:22}}>{commission.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} <span style={{fontSize:11,opacity:0.5}}>€</span></div>
            <div style={{fontSize:10,opacity:0.7,fontWeight:700,marginTop:2}}>{progress !== null ? progress + "% de l'objectif" : 'Bravo Emy 🚀'}</div>
          </div>
        </div>

        {pipeCA > 0 && (
          <div style={{marginTop:10,padding:'10px 14px',background:'#EBF3FF',borderRadius:6,border:'2px solid '+BLEU,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:10,fontWeight:900,color:BLEU,textTransform:'uppercase',letterSpacing:0.5}}>🔄 Pipeline en attente</div>
              <div style={{fontSize:11,opacity:0.6,marginTop:2,fontWeight:700}}>{nbPipe} devis non signé{nbPipe>1?'s':''}</div>
            </div>
            <div style={{fontWeight:900,fontSize:20,color:BLEU}}>{pipeCA.toLocaleString('fr-FR',{maximumFractionDigits:0})} € <span style={{fontSize:10,opacity:0.5}}>HT</span></div>
          </div>
        )}

        <button className="btn btn-sm" style={{marginTop:12,width:'100%',justifyContent:'center',background:ROSE,color:'#FFFFFF',opacity:scoringLoading?0.5:1}} disabled={scoringLoading} onClick={autoScore}>
          {scoringLoading ? '⏳ Scoring en cours...' : '🎯 Recalculer le scoring IA'}
        </button>
      </div>

      {/* ===== CONTRÔLES ===== */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:6}}>
          <ViewToggle active={view==='pipeline'} onClick={function(){ setView('pipeline') }} icon="▦">Pipeline</ViewToggle>
          <ViewToggle active={view==='list'} onClick={function(){ setView('list') }} icon="☰">Liste</ViewToggle>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          <input className="inp" placeholder="🔍 Rechercher..." value={search} onChange={function(e){ setSearch(e.target.value) }} style={{width:160,fontSize:12,padding:'5px 10px'}} />
          <FilterPill active={tempFilter==='all'} onClick={function(){ setTempFilter('all') }}>Tous</FilterPill>
          <FilterPill active={tempFilter==='chaud'} onClick={function(){ setTempFilter('chaud') }} dot={ROUGE}>🔥</FilterPill>
          <FilterPill active={tempFilter==='tiede'} onClick={function(){ setTempFilter('tiede') }} dot={ORANGE}>🌤️</FilterPill>
          <FilterPill active={tempFilter==='froid'} onClick={function(){ setTempFilter('froid') }} dot={BLEU}>❄️</FilterPill>
        </div>
      </div>

      {/* ===== PIPELINE KANBAN ===== */}
      {view === 'pipeline' && (
        <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:10,alignItems:'flex-start'}}>
          {STATUS_COLS.map(function(col){
            var colP = prospects.filter(function(p){ return p.status === col.id && matchFilters(p) })
            var colValue = colP.reduce(function(s,p){ return s + (Number(p.ca)||Number(p.estimated_monthly_revenue)||0) }, 0)
            var isOver = dragOverCol === col.id
            return (
              <div key={col.id}
                onDragOver={function(e){ onDragOverCol(e, col.id) }}
                onDrop={function(e){ onDropCol(e, col.id) }}
                onDragLeave={function(){ if(dragOverCol===col.id) setDragOverCol(null) }}
                style={{flex:'1 1 0',minWidth:240,background:isOver?'#FFF7FC':'#FAFAFA',border:'2px solid '+(isOver?ROSE:NOIR),borderRadius:9,padding:8,transition:'all .15s',boxShadow:isOver?'0 0 0 3px '+ROSE:'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:6,padding:'4px 6px 10px',borderBottom:'2px solid '+col.color,marginBottom:8}}>
                  <span style={{fontSize:15}}>{col.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:900,fontSize:12,color:col.color,textTransform:'uppercase',letterSpacing:0.4}}>{col.label}</div>
                    {colValue > 0 && <div style={{fontSize:9,opacity:0.6,fontWeight:700}}>{colValue.toLocaleString('fr-FR')} €/mois pot.</div>}
                  </div>
                  <span style={{background:NOIR,color:JAUNE,borderRadius:10,padding:'1px 8px',fontSize:11,fontWeight:900}}>{colP.length}</span>
                </div>
                {colP.length === 0 && (
                  <div style={{padding:'16px 8px',textAlign:'center',fontSize:11,opacity:0.4,fontWeight:700,border:'1.5px dashed #CCC',borderRadius:6}}>{isOver?'↓ Déposer ici':'Vide'}</div>
                )}
                {colP.map(function(p){
                  return <ProspectCard key={p.id} p={p} kanban dragging={dragId===p.id}
                    onDragStart={function(e){ onDragStart(e, p.id) }}
                    onDragEnd={onDragEnd}
                    onOpen={function(){ openModal('prospect', Object.assign({}, p)) }}
                    onScript={function(){ generateScript(p) }}
                    onEmail={function(){ emailProspect(p, p.status==='to_contact'?'first':'relance') }}
                  />
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== LISTE ===== */}
      {view === 'list' && (
        <div>
          {prospects.filter(function(p){ return p.status!=='won' && p.status!=='lost' && matchFilters(p) }).map(function(p){
            return <ProspectCard key={p.id} p={p}
              onOpen={function(){ openModal('prospect', Object.assign({}, p)) }}
              onScript={function(){ generateScript(p) }}
              onEmail={function(){ emailProspect(p, p.status==='contacted'||p.status==='nego'?'relance':'first') }}
              onSetTemp={function(t){ updateProspect(p.id, {temperature:t}) }}
              onSetStatus={function(s){ setStatus(p, s) }}
              onDevis={function(){ nav('devis') }}
            />
          })}
          {/* Gagnés */}
          {prospects.filter(function(p){ return p.status==='won' }).length > 0 && (
            <div style={{marginTop:16}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,marginBottom:8,color:VERT}}>🏆 Clients gagnés ({prospects.filter(function(p){ return p.status==='won' }).length})</div>
              {prospects.filter(function(p){ return p.status==='won' }).map(function(p){
                return (
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',background:'#F0FFF4',border:'2px solid '+VERT,borderRadius:6,marginBottom:6}}>
                    <span style={{fontWeight:900,fontSize:13}}>{p.name}</span>
                    <span style={{fontSize:11,color:VERT,fontWeight:900}}>✅ Client</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== MODAL SCRIPT ===== */}
      {scriptProspect && (
        <div style={{position:'fixed',inset:0,background:'rgba(25,25,35,.6)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={function(){ setScriptProspect(null) }}>
          <div style={{background:'#FFFFFF',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:520,maxHeight:'80vh',overflowY:'auto',border:'3px solid '+NOIR}} onClick={function(e){ e.stopPropagation() }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div>
                <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:ROSE}}>📞 Script d&apos;appel</div>
                <div style={{fontSize:12,opacity:0.6,marginTop:2,fontWeight:700}}>{scriptProspect.name}</div>
              </div>
              <button style={{background:'#FFFFFF',border:'2px solid '+NOIR,borderRadius:'50%',width:32,height:32,cursor:'pointer',fontWeight:900}} onClick={function(){ setScriptProspect(null) }}>✕</button>
            </div>
            {scriptLoading && (
              <div style={{textAlign:'center',padding:40}}>
                <div style={{fontSize:32,marginBottom:8}}>🧠</div>
                <div style={{fontSize:13,opacity:0.6,fontWeight:700}}>L&apos;IA prépare ton script...</div>
              </div>
            )}
            {!scriptLoading && scriptContent && (
              <div>
                <div style={{background:'#FFFBEA',border:'2px solid '+JAUNE,borderRadius:10,padding:16,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap'}}>{scriptContent}</div>
                <div style={{display:'flex',gap:8,marginTop:12}}>
                  <button className="btn btn-y" style={{flex:1,justifyContent:'center',fontWeight:900}} onClick={function(){ navigator.clipboard.writeText(scriptContent).then(function(){ toast('Script copié ✓') }) }}>📋 Copier</button>
                  <button className="btn btn-sm btn-p" onClick={function(){ generateScript(scriptProspect) }}>🔄 Regénérer</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function ViewToggle(props) {
  var active = props.active
  return (
    <div onClick={props.onClick} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',fontSize:12,fontWeight:900,borderRadius:7,border:'2px solid '+NOIR,background:active?ROSE:'#FFFFFF',color:active?'#FFFFFF':NOIR,cursor:'pointer',boxShadow:active?'2px 2px 0 '+NOIR:'none',textTransform:'uppercase',letterSpacing:0.3,transition:'all .1s'}}>
      <span style={{fontSize:14}}>{props.icon}</span>{props.children}
    </div>
  )
}

function FilterPill(props) {
  var active = props.active
  return (
    <div onClick={props.onClick} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 11px',fontSize:11,fontWeight:900,borderRadius:16,border:'2px solid '+NOIR,background:active?ROSE:'#FFFFFF',color:active?'#FFFFFF':NOIR,cursor:'pointer',whiteSpace:'nowrap',transition:'all .1s'}}>
      {props.dot && <span style={{width:8,height:8,borderRadius:'50%',background:props.dot,display:'inline-block',border:'1px solid '+NOIR}} />}
      {props.children}
    </div>
  )
}

function ProspectCard(props) {
  var p = props.p
  var kanban = props.kanban
  var late = isLate(p)
  var tempColor = TEMP_COLORS[p.temperature] || '#CCC'
  var freshness = daysSince(p.last_contacted_at || p.updated_at)
  var potValue = Number(p.ca) || Number(p.estimated_monthly_revenue) || 0

  // ---- Carte KANBAN (compacte, draggable) ----
  if (kanban) {
    return (
      <div draggable="true" onDragStart={props.onDragStart} onDragEnd={props.onDragEnd}
        style={{background:'#FFFFFF',borderRadius:8,padding:10,border:'2px solid '+NOIR,borderLeft:'5px solid '+(late?ROUGE:tempColor),marginBottom:8,cursor:'grab',boxShadow:'2px 2px 0 '+NOIR,opacity:props.dragging?0.4:1,transition:'opacity .1s'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
          <div style={{fontWeight:900,fontSize:13,lineHeight:1.2,cursor:'pointer',flex:1,minWidth:0}} onClick={props.onOpen}>{p.name}</div>
          {p.score && <span style={{background:p.score>=8?VERT:p.score>=6?JAUNE:ROSE,color:p.score>=6&&p.score<8?NOIR:'#FFFFFF',borderRadius:10,padding:'1px 6px',fontSize:9,fontWeight:900,flexShrink:0}}>{p.score}</span>}
        </div>
        <div style={{fontSize:10,opacity:0.55,marginTop:2,fontWeight:600}}>{p.category || '—'}</div>
        {potValue > 0 && <div style={{fontSize:10,fontWeight:900,color:VERT,marginTop:4}}>{potValue.toLocaleString('fr-FR')} €/mois</div>}
        {late && <div style={{fontSize:9,color:ROUGE,fontWeight:900,marginTop:4}}>⚠️ Relance en retard</div>}
        {!late && p.nextDate && <div style={{fontSize:9,opacity:0.6,marginTop:4,fontWeight:700}}>📅 {p.nextDate}</div>}
        <div style={{display:'flex',gap:4,marginTop:8}}>
          <button className="btn btn-sm btn-p" style={{flex:1,justifyContent:'center',fontSize:9,padding:'3px'}} onClick={function(e){ e.stopPropagation(); props.onScript() }}>📞</button>
          <button className="btn btn-sm" style={{flex:1,justifyContent:'center',fontSize:9,padding:'3px'}} onClick={function(e){ e.stopPropagation(); props.onEmail() }}>✉️</button>
        </div>
      </div>
    )
  }

  // ---- Carte LISTE (riche) ----
  return (
    <div className="card" style={{marginBottom:8,borderLeft:'5px solid '+(late?ROUGE:tempColor)}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
            <span style={{fontWeight:900,fontSize:15,cursor:'pointer'}} onClick={props.onOpen}>{p.name}</span>
            {p.score && <span style={{background:p.score>=8?VERT:p.score>=6?JAUNE:ROSE,color:p.score>=6&&p.score<8?NOIR:'#FFFFFF',borderRadius:12,padding:'1px 8px',fontSize:10,fontWeight:900}} title={p.scoreReason||''}>{p.score}/10</span>}
            <span style={{fontSize:9,padding:'2px 8px',borderRadius:10,border:'2px solid '+(STATUS_COLORS[p.status]||'#888'),color:STATUS_COLORS[p.status]||'#888',fontWeight:900,textTransform:'uppercase'}}>{STATUS_LABELS[p.status]||p.status}</span>
            {p.temperature && <span style={{fontSize:11,fontWeight:900,color:tempColor}}>{TEMP_LABELS[p.temperature]||''}</span>}
          </div>
          <div style={{fontSize:12,opacity:0.7,fontWeight:600}}>{p.category||'—'}{p.email?' · '+p.email:''}</div>
          {potValue > 0 && <div style={{fontSize:11,fontWeight:900,color:VERT,marginTop:3}}>💶 {potValue.toLocaleString('fr-FR')} €/mois potentiel</div>}
          {freshness !== null && freshness > 14 && <div style={{fontSize:10,opacity:0.5,marginTop:2,fontWeight:700}}>🕐 Pas contacté depuis {freshness} j</div>}
        </div>
        <div style={{display:'flex',gap:4,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
          <button className="btn btn-sm" style={{fontSize:10}} onClick={props.onOpen}>✏️</button>
          <button className="btn btn-p btn-sm" style={{fontSize:10}} onClick={props.onEmail}>✉️</button>
          <button className="btn btn-sm" style={{fontSize:10,background:ROSE,color:'#FFFFFF'}} onClick={props.onScript}>📞</button>
        </div>
      </div>

      {/* Température */}
      <div style={{display:'flex',gap:4,marginBottom:8,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:10,fontWeight:900,opacity:0.5,marginRight:2}}>Température :</span>
        {['chaud','tiede','froid'].map(function(t){
          var on = p.temperature === t
          return <button key={t} onClick={function(){ props.onSetTemp(t) }} style={{fontSize:9,fontWeight:900,padding:'2px 9px',borderRadius:12,background:on?TEMP_COLORS[t]:'#FFFFFF',color:on?'#FFFFFF':NOIR,border:'2px solid '+TEMP_COLORS[t],cursor:'pointer'}}>{TEMP_LABELS[t]}</button>
        })}
      </div>

      {/* Statut */}
      <div style={{display:'flex',gap:4,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
        <span style={{fontSize:10,fontWeight:900,opacity:0.5,textTransform:'uppercase',marginRight:2}}>Statut :</span>
        {['to_contact','contacted','nego','won','lost'].map(function(st){
          var on = p.status === st
          return <button key={st} onClick={function(){ props.onSetStatus(st) }} style={{fontSize:9,fontWeight:on?900:600,padding:'2px 8px',borderRadius:10,background:on?STATUS_COLORS[st]:'#F5F5F5',color:on?'#FFFFFF':'#555',border:'1.5px solid '+(on?STATUS_COLORS[st]:'#DDD'),cursor:'pointer'}}>{STATUS_LABELS[st]}</button>
        })}
      </div>

      {/* Prochaine action */}
      {p.nextDate && <div style={{fontSize:12,fontWeight:late?900:600,marginBottom:6,color:late?ROUGE:'#555'}}>{late?'⚠️ RETARD — ':'📅 '}{p.nextAction||'À relancer'} — {p.nextDate}</div>}

      {/* Notes */}
      {p.notes && <div style={{fontSize:12,opacity:0.8,background:'#FAFAFA',border:'1px solid #EEE',borderRadius:5,padding:'6px 10px',marginBottom:8,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{p.notes}</div>}

      {/* Actions contextuelles */}
      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
        <button className="btn btn-y btn-sm" style={{fontSize:10}} onClick={props.onDevis}>📄 Créer devis</button>
        {p.status==='contacted' && <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={function(){ props.onSetStatus('nego') }}>✅ Intéressé → Négo</button>}
        {p.status==='nego' && <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={function(){ props.onSetStatus('won') }}>🏆 Gagné</button>}
        {(p.status==='contacted'||p.status==='nego') && <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){ props.onSetStatus('lost') }}>✗ Perdu</button>}
      </div>
    </div>
  )
}
