'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import ArticleDetailModal from './ArticleDetailModal'
import KpiHistoryModal from './KpiHistoryModal'

// =============================================================================
// HomeOverviewTab v2 — Homepage Edward (et Emy)
//
// Design : Meshuga néo-brutalist (rose/jaune/noir, borders 2-3px, box-shadows
// décalées, Yellowtail pour titres décoratifs, Arial Narrow 900 pour valeurs).
//
// Cliquabilité totale :
//   - Chaque KPI ouvre KpiHistoryModal (graph 30 jours)
//   - Chaque ligne hausse de prix ouvre ArticleDetailModal (3 onglets)
//   - Chaque ligne food cost en dérive ouvre la page recettes
//   - Chaque chip alerte ouvre la modale ou page concernée
//
// Branchements live :
//   - daily_z_reports                  : chiffres veille + J-7
//   - v_price_variations_clean         : hausses prix (anti-anomalies)
//   - v_recipe_real_food_cost          : recettes en dérive
//   - hr_contracts + hr_contract_amendments : signatures pending
//   - devis                            : devis B2B actifs
// =============================================================================

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

var FMT_EUR = function(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20ac'
}
var FMT_EUR_DEC = function(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'
}
var FMT_INT = function(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  return Math.round(Number(v)).toLocaleString('fr-FR')
}
var FMT_PCT = function(v, withSign) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  var n = Number(v)
  var sign = withSign && n > 0 ? '+' : ''
  return sign + n.toFixed(1) + ' %'
}
var DAYS_AGO = function(iso) {
  if (!iso) return null
  var d = new Date(iso)
  var now = new Date()
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export default function HomeOverviewTab(props) {
  var profile = props.profile
  var isEmy = props.isEmy
  var tasks = props.tasks || []
  var nav = props.nav || function(){}
  var toast = props.toast || function(){}
  var openModal = props.openModal || function(){}

  // Data
  var [zToday, setZToday] = useState(null)
  var [zPrev, setZPrev] = useState(null)
  var [priceVariations, setPriceVariations] = useState([])
  var [recipeAlerts, setRecipeAlerts] = useState([])
  var [recipeStats, setRecipeStats] = useState({critique:0, alerte:0, surveillance:0})
  var [signaturesPending, setSignaturesPending] = useState([])
  var [devisActifs, setDevisActifs] = useState([])
  var [carouselIdx, setCarouselIdx] = useState(0)
  var [loading, setLoading] = useState(true)

  // Modal state
  var [openArticle, setOpenArticle] = useState(null)        // {productId, productName, supplierName, initialTab}
  var [openKpiModal, setOpenKpiModal] = useState(null)      // {kpi, label, unit, accent}

  useEffect(function() { loadAll() }, [])

  function loadAll() {
    setLoading(true)
    var c = sb()

    c.from('daily_z_reports')
      .select('z_date, ca_ttc, ca_ht, nb_tickets, nb_couverts, ticket_moyen, canaux, canaux_nb_tickets')
      .order('z_date', { ascending: false })
      .limit(15)
      .then(function(res) {
        var rows = res.data || []
        if (rows.length > 0) {
          setZToday(rows[0])
          var d0 = new Date(rows[0].z_date)
          var target = new Date(d0.getTime() - 7 * 24 * 60 * 60 * 1000)
          var targetIso = target.toISOString().split('T')[0]
          var match = null
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].z_date === targetIso) { match = rows[i]; break }
          }
          if (!match && rows.length >= 7) match = rows[6]
          setZPrev(match)
        }
      })

    c.from('v_price_variations_clean')
      .select('product_id, product_name, supplier_name, current_price, previous_price, variation_pct, severity, invoice_date, previous_date')
      .gt('variation_pct', 0)
      .order('invoice_date', { ascending: false })
      .limit(30)
      .then(function(res) {
        var data = res.data || []
        var filtered = data.filter(function(r) {
          var pct = Number(r.variation_pct)
          if (pct < 2) return false
          var days = DAYS_AGO(r.invoice_date)
          if (days !== null && days > 45) return false
          return true
        })
        setPriceVariations(filtered.slice(0, 10))
      })

    c.from('v_recipe_real_food_cost')
      .select('recipe_id, recipe_name, categorie, food_cost_actuel, food_cost_moyenne, ecart_eur, ecart_pct, nb_ingredients, prix_vente_ttc')
      .gt('nb_ingredients', 0)
      .not('ecart_pct', 'is', null)
      .order('ecart_pct', { ascending: false })
      .then(function(res) {
        var data = res.data || []
        var prepCategories = ['sous_recette', 'sauce', 'accompagnement']
        var mains = data.filter(function(r) { return prepCategories.indexOf(r.categorie) === -1 })
        var s = {critique:0, alerte:0, surveillance:0}
        mains.forEach(function(r) {
          var p = Number(r.ecart_pct)
          if (p > 15) s.critique++
          else if (p > 8) s.alerte++
          else if (p > 3) s.surveillance++
        })
        setRecipeStats(s)
        setRecipeAlerts(mains.filter(function(r){ return Number(r.ecart_pct) > 3 }).slice(0, 5))
      })

    c.from('hr_contracts')
      .select('id, signature_status, signature_sent_at, signature_recipient_email, employee_id, hr_employees(prenom, nom)')
      .in('signature_status', ['sent', 'viewed'])
      .is('signature_signed_at', null)
      .order('signature_sent_at', { ascending: false })
      .limit(20)
      .then(function(res) {
        var contracts = (res.data || []).map(function(r) {
          var emp = r.hr_employees || {}
          var name = ((emp.prenom || '') + ' ' + (emp.nom || '')).trim() || (r.signature_recipient_email || 'Salarié')
          return {kind:'contract', id:r.id, employee_id:r.employee_id, employee_name:name, sent_at:r.signature_sent_at}
        })
        c.from('hr_contract_amendments')
          .select('id, signature_status, signature_sent_at, signature_recipient_email, contract_id, hr_contracts!inner(employee_id, hr_employees(prenom, nom))')
          .in('signature_status', ['sent', 'viewed'])
          .is('signature_signed_at', null)
          .order('signature_sent_at', { ascending: false })
          .limit(20)
          .then(function(r2) {
            var amendments = (r2.data || []).map(function(r) {
              var contract = r.hr_contracts || {}
              var emp = contract.hr_employees || {}
              var name = ((emp.prenom || '') + ' ' + (emp.nom || '')).trim() || (r.signature_recipient_email || 'Salarié')
              return {kind:'amendment', id:r.id, employee_id:contract.employee_id, employee_name:name, sent_at:r.signature_sent_at}
            })
            var all = contracts.concat(amendments).sort(function(a, b) {
              if (!a.sent_at) return 1
              if (!b.sent_at) return -1
              return a.sent_at < b.sent_at ? 1 : -1
            })
            setSignaturesPending(all)
          })
      })

    c.from('devis')
      .select('id, numero, statut, client_nom, total_ttc, event_date, date_validite, sent_at, parent_devis_id')
      .not('statut', 'in', '(gagne,perdu,annule,refuse)')
      .is('parent_devis_id', null)
      .order('updated_at', { ascending: false })
      .limit(10)
      .then(function(res) {
        setDevisActifs(res.data || [])
        setLoading(false)
      })
  }

  // Évolutions
  var caEvol = (zToday && zPrev && Number(zPrev.ca_ttc) > 0) ? ((Number(zToday.ca_ttc) - Number(zPrev.ca_ttc)) / Number(zPrev.ca_ttc)) * 100 : null
  var ticketsEvol = (zToday && zPrev && Number(zPrev.nb_tickets) > 0) ? ((Number(zToday.nb_tickets) - Number(zPrev.nb_tickets)) / Number(zPrev.nb_tickets)) * 100 : null
  var panierEvol = (zToday && zPrev && Number(zPrev.ticket_moyen) > 0) ? ((Number(zToday.ticket_moyen) - Number(zPrev.ticket_moyen)) / Number(zPrev.ticket_moyen)) * 100 : null
  var couvertsEvol = (zToday && zPrev && Number(zPrev.nb_couverts) > 0) ? ((Number(zToday.nb_couverts) - Number(zPrev.nb_couverts)) / Number(zPrev.nb_couverts)) * 100 : null

  // Tâches actives
  var tasksActives = (tasks || []).filter(function(t) { return t.status === 'in_progress' || t.status === 'todo' })
  var tasksUrgent = tasksActives.filter(function(t) {
    if (!t.deadline) return false
    var d = new Date(t.deadline)
    var diff = (d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 2 || t.priority === 'high'
  })

  // Food cost niveau
  var fcLevel = 'green'
  var fcEmoji = '✅'
  var fcLabel = 'Food cost sous contrôle'
  var fcBg = '#E6F7E9'
  var fcAccent = '#009D3A'
  if (recipeStats.critique > 0) { fcLevel = 'red'; fcEmoji = '🔥'; fcLabel = 'Food cost critique'; fcBg = '#FFE6E6'; fcAccent = '#CC0066' }
  else if (recipeStats.alerte > 0) { fcLevel = 'orange'; fcEmoji = '⚠️'; fcLabel = 'Food cost en alerte'; fcBg = '#FFF4D6'; fcAccent = '#B8920A' }
  else if (recipeStats.surveillance > 2) { fcLevel = 'orange'; fcEmoji = '⚠️'; fcLabel = 'Recettes à surveiller'; fcBg = '#FFF4D6'; fcAccent = '#B8920A' }
  var fcCount = recipeStats.critique + recipeStats.alerte + recipeStats.surveillance

  // Chips alertes
  var chips = []
  if (signaturesPending.length > 0) chips.push({id:'sig', level:'urgent', icon:'✍️', label: signaturesPending.length + ' signature' + (signaturesPending.length > 1 ? 's' : '') + ' en attente', action: function(){ nav('rh') }})
  if (recipeStats.critique > 0) chips.push({id:'fc', level:'urgent', icon:'🔥', label: recipeStats.critique + ' recette' + (recipeStats.critique > 1 ? 's' : '') + ' en dérive', action: function(){ nav('recipes') }})
  var devisToFollow = devisActifs.filter(function(d) { return d.statut === 'envoye' || d.statut === 'a_relancer' })
  if (devisToFollow.length > 0) chips.push({id:'devis', level:'warn', icon:'📋', label: devisToFollow.length + ' devis à relancer', action: function(){ nav('devis') }})
  var devisBrouillons = devisActifs.filter(function(d) { return d.statut === 'brouillon' })
  if (devisBrouillons.length > 0) chips.push({id:'brouillons', level:'info', icon:'📝', label: devisBrouillons.length + ' devis en brouillon', action: function(){ nav('devis') }})
  if (tasksUrgent.length > 0) chips.push({id:'tasks', level:'urgent', icon:'🚨', label: tasksUrgent.length + ' tâche' + (tasksUrgent.length > 1 ? 's' : '') + ' urgente' + (tasksUrgent.length > 1 ? 's' : ''), action: function(){ nav('tasks') }})

  // Carrousel
  var carouselTotal = Math.ceil(priceVariations.length / 2)
  function carouselPrev() { setCarouselIdx(function(i) { return i > 0 ? i - 1 : 0 }) }
  function carouselNext() { setCarouselIdx(function(i) { return i < carouselTotal - 1 ? i + 1 : carouselTotal - 1 }) }
  var visibleVariations = priceVariations.slice(carouselIdx * 2, carouselIdx * 2 + 2)

  // Canaux
  var canalColor = function(k) {
    if (k === 'sur_place') return '#FF82D7'
    if (k === 'emporter') return '#FFEB5A'
    if (k === 'livraison') return '#191923'
    return '#888'
  }
  var canalLabel = function(k) {
    if (k === 'sur_place') return 'Sur place'
    if (k === 'emporter') return 'À emporter'
    if (k === 'livraison') return 'Livraison'
    return k
  }

  var todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  var zDateLabel = zToday && zToday.z_date ? new Date(zToday.z_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'

  function openKpi(kpi, label, unit, accent) {
    setOpenKpiModal({kpi: kpi, label: label, unit: unit, accent: accent})
  }
  function openArt(variation, initialTab) {
    setOpenArticle({
      productId: variation.product_id,
      productName: variation.product_name,
      supplierName: variation.supplier_name,
      initialTab: initialTab
    })
  }

  return (
    <div>
      {/* ====== 1. EN-TÊTE ====== */}
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:42,lineHeight:1,color:'#FF82D7'}}>{isEmy ? 'Bonjour Emy' : 'Bonjour Edward'}</div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:14,opacity:0.5,marginTop:2,textTransform:'capitalize'}}>{todayDate}</div>
        </div>
        {isEmy && <button className="btn btn-p btn-sm" onClick={function(){ openModal('cr', {}) }}>+ Nouveau CR</button>}
      </div>

      {/* ====== 2. BANDEAU ALERTES ====== */}
      {chips.length > 0 && (
        <div className="card" style={{borderColor:'#FF82D7',borderWidth:3}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>🔔</span>
            <span style={{fontWeight:900,fontSize:13,textTransform:'uppercase',letterSpacing:0.5}}>Ce qui demande ton attention</span>
            <span style={{marginLeft:'auto',background:'#191923',color:'#FFEB5A',padding:'3px 9px',borderRadius:12,fontWeight:900,fontSize:11}}>{chips.length}</span>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
            {chips.map(function(ch) {
              var bg = ch.level === 'urgent' ? '#CC0066' : (ch.level === 'warn' ? '#FFEB5A' : '#FFFFFF')
              var col = ch.level === 'urgent' ? '#FFFFFF' : '#191923'
              return (
                <div key={ch.id} onClick={ch.action} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'8px 14px',background:bg,color:col,border:'2px solid #191923',borderRadius:22,fontWeight:900,fontSize:11,cursor:'pointer',boxShadow:'2px 2px 0 #191923',transition:'transform .1s',textTransform:'uppercase',letterSpacing:0.3}}
                  onMouseDown={function(e){ e.currentTarget.style.transform='translate(1px,1px)'; e.currentTarget.style.boxShadow='1px 1px 0 #191923' }}
                  onMouseUp={function(e){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='2px 2px 0 #191923' }}
                  onMouseLeave={function(e){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='2px 2px 0 #191923' }}>
                  <span style={{fontSize:14}}>{ch.icon}</span>
                  <span>{ch.label}</span>
                  <span style={{opacity:0.6,fontSize:14}}>→</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== 3. CHIFFRES DE LA VEILLE ====== */}
      <div className="card">
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'#FF82D7',lineHeight:1}}>Chiffres de la veille</div>
            <div style={{fontSize:11,opacity:0.55,marginTop:3,textTransform:'capitalize',fontWeight:700}}>{zDateLabel}</div>
          </div>
          <div style={{fontSize:10,opacity:0.5,fontWeight:900,textTransform:'uppercase',letterSpacing:0.5}}>↓ Clique sur un chiffre pour l&apos;historique</div>
        </div>

        {!zToday && (
          <div style={{padding:'18px',textAlign:'center',color:'#888',fontSize:12,background:'#FAFAFA',border:'1.5px dashed #CCC',borderRadius:6}}>
            {loading ? '⏳ Chargement...' : "Aucun Z de caisse importé pour la veille."}
          </div>
        )}

        {zToday && (
          <div>
            <div className="g4">
              <KpiCard
                bg="#FF82D7" textColor="#191923"
                label="CA TTC" value={FMT_EUR(zToday.ca_ttc)} evol={caEvol}
                icon="💰"
                onClick={function(){ openKpi('ca_ttc', 'CA TTC', 'eur', '#FF82D7') }}
              />
              <KpiCard
                bg="#FFEB5A" textColor="#191923"
                label="Couverts" value={Number(zToday.nb_couverts) > 0 ? FMT_INT(zToday.nb_couverts) : '—'} evol={couvertsEvol}
                icon="🍽️"
                onClick={function(){ openKpi('nb_couverts', 'Couverts', 'int', '#FFEB5A') }}
              />
              <KpiCard
                bg="#FFFFFF" textColor="#191923"
                label="Tickets" value={FMT_INT(zToday.nb_tickets)} evol={ticketsEvol}
                icon="🎫"
                onClick={function(){ openKpi('nb_tickets', 'Tickets', 'int', '#005FFF') }}
              />
              <KpiCard
                bg="#191923" textColor="#FFEB5A"
                label="Panier moyen" value={FMT_EUR_DEC(zToday.ticket_moyen)} evol={panierEvol}
                icon="🛒"
                onClick={function(){ openKpi('ticket_moyen', 'Panier moyen', 'eur', '#FFEB5A') }}
              />
            </div>
            <CanauxBar canaux={zToday.canaux || {}} canalColor={canalColor} canalLabel={canalLabel} />
          </div>
        )}
      </div>

      {/* ====== 4. BANDEAU FOOD COST DÉTAILLÉ ====== */}
      <div style={{background:fcBg,border:'3px solid '+fcAccent,borderRadius:8,marginBottom:12,boxShadow:'4px 4px 0 #191923',overflow:'hidden'}}>
        <div onClick={function(){ nav('recipes') }} style={{padding:'14px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
          <span style={{fontSize:36,lineHeight:1}}>{fcEmoji}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:16,textTransform:'uppercase',letterSpacing:0.5,color:fcAccent}}>{fcLabel}</div>
            <div style={{fontSize:12,opacity:0.75,marginTop:3,fontWeight:700}}>
              {fcCount > 0 ? (fcCount + ' produit' + (fcCount > 1 ? 's' : '') + ' en hausse · clique pour voir le détail') : 'Aucun écart significatif sur les recettes actives'}
            </div>
          </div>
          {fcCount > 0 && (
            <div style={{textAlign:'right',display:'flex',gap:6,alignItems:'center'}}>
              {recipeStats.critique > 0 && <Pill bg="#CC0066" color="#FFF">{recipeStats.critique} 🔥</Pill>}
              {recipeStats.alerte > 0 && <Pill bg="#B8920A" color="#FFF">{recipeStats.alerte} ⚠️</Pill>}
              {recipeStats.surveillance > 0 && <Pill bg="#191923" color="#FFEB5A">{recipeStats.surveillance} 👁</Pill>}
            </div>
          )}
        </div>
        {recipeAlerts.length > 0 && (
          <div style={{borderTop:'2px solid '+fcAccent,background:'#FFFFFF'}}>
            {recipeAlerts.map(function(r) {
              var p = Number(r.ecart_pct)
              var color = p > 15 ? '#CC0066' : (p > 8 ? '#B8920A' : '#191923')
              var emoji = p > 15 ? '🔥' : (p > 8 ? '⚠️' : '👁')
              return (
                <div key={r.recipe_id} onClick={function(){ nav('recipes') }} style={{display:'grid',gridTemplateColumns:'30px 1fr auto auto',gap:12,padding:'10px 18px',borderBottom:'1px solid #EBEBEB',cursor:'pointer',alignItems:'center',transition:'background .1s'}}
                  onMouseEnter={function(e){ e.currentTarget.style.background='#FFEB5A' }}
                  onMouseLeave={function(e){ e.currentTarget.style.background='transparent' }}>
                  <span style={{fontSize:18}}>{emoji}</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:900,fontSize:13}}>{r.recipe_name}</div>
                    <div style={{fontSize:10,opacity:0.5,marginTop:1}}>FC actuel {FMT_EUR_DEC(r.food_cost_actuel)} · moy. {FMT_EUR_DEC(r.food_cost_moyenne)}</div>
                  </div>
                  <div style={{textAlign:'right',whiteSpace:'nowrap'}}>
                    <div style={{fontWeight:900,fontSize:14,color:color}}>{FMT_PCT(p, true)}</div>
                    <div style={{fontSize:9,opacity:0.5}}>+{FMT_EUR_DEC(r.ecart_eur)} / portion</div>
                  </div>
                  <span style={{fontSize:14,opacity:0.4}}>→</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ====== 5. CARROUSEL HAUSSES DE PRIX ====== */}
      {priceVariations.length > 0 && (
        <div className="card">
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#FF82D7',lineHeight:1}}>Hausses de prix détectées</div>
              <div style={{fontSize:11,opacity:0.55,marginTop:3,fontWeight:700}}>{priceVariations.length} variation{priceVariations.length > 1 ? 's' : ''} récentes</div>
            </div>
            {carouselTotal > 1 && (
              <div style={{display:'flex',gap:6,alignItems:'center'}}>
                <button className="btn btn-sm" onClick={carouselPrev} disabled={carouselIdx === 0} style={{opacity:carouselIdx===0?0.4:1,minWidth:32}}>◀</button>
                <span style={{fontSize:11,fontWeight:900,opacity:0.6,padding:'0 6px'}}>{carouselIdx + 1} / {carouselTotal}</span>
                <button className="btn btn-sm" onClick={carouselNext} disabled={carouselIdx === carouselTotal - 1} style={{opacity:carouselIdx===carouselTotal-1?0.4:1,minWidth:32}}>▶</button>
              </div>
            )}
          </div>
          <div className="g2" style={{marginBottom:0}}>
            {visibleVariations.map(function(v) {
              return <PriceVariationCard key={v.product_id + '_' + v.invoice_date} variation={v} onOpen={openArt} />
            })}
          </div>
          {carouselTotal > 1 && (
            <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:14}}>
              {Array.from({length: carouselTotal}).map(function(_, i) {
                return (
                  <span key={i} onClick={function(){ setCarouselIdx(i) }} style={{width:i===carouselIdx?20:10,height:8,borderRadius:4,background:i===carouselIdx?'#FF82D7':'#FFFFFF',border:'2px solid #191923',cursor:'pointer',transition:'width .2s'}} />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ====== 6. GRID TÂCHES + DEVIS ====== */}
      <div className="g2">
        {/* Tâches */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:6}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,color:'#FF82D7',lineHeight:1}}>Tâches en cours</div>
            <button className="btn btn-p btn-sm" onClick={function(){
              var today = new Date().toISOString().split('T')[0]
              openModal('task', {assignee: isEmy ? 'emy' : 'edward', priority: 'medium', status: 'todo', checklist: [], files: [], deadline: today})
            }}>+ Tâche</button>
          </div>
          {tasksActives.length === 0 && (
            <div style={{padding:'18px',textAlign:'center',fontSize:12,opacity:0.5,background:'#FAFAFA',borderRadius:6,border:'1.5px dashed #CCC'}}>🎉 Rien en cours. Profite.</div>
          )}
          {tasksActives.slice(0, 6).map(function(t) {
            return <TaskRow key={t.id} task={t} openModal={openModal} />
          })}
          {tasksActives.length > 6 && (
            <div style={{marginTop:10,textAlign:'center'}}>
              <button className="btn btn-y btn-sm" onClick={function(){ nav('tasks') }}>Voir tout ({tasksActives.length}) →</button>
            </div>
          )}
        </div>

        {/* Devis B2B */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:6}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,color:'#FF82D7',lineHeight:1}}>Devis B2B en attente</div>
            <button className="btn btn-p btn-sm" onClick={function(){ nav('devis') }}>+ Devis</button>
          </div>
          {devisActifs.length === 0 && (
            <div style={{padding:'18px',textAlign:'center',fontSize:12,opacity:0.5,background:'#FAFAFA',borderRadius:6,border:'1.5px dashed #CCC'}}>Aucun devis actif.</div>
          )}
          {devisActifs.slice(0, 6).map(function(d) {
            return <DevisRow key={d.id} devis={d} nav={nav} />
          })}
          {devisActifs.length > 6 && (
            <div style={{marginTop:10,textAlign:'center'}}>
              <button className="btn btn-y btn-sm" onClick={function(){ nav('devis') }}>Voir tout ({devisActifs.length}) →</button>
            </div>
          )}
        </div>
      </div>

      {/* ====== MODALES ====== */}
      {openArticle && (
        <ArticleDetailModal
          productId={openArticle.productId}
          productName={openArticle.productName}
          supplierName={openArticle.supplierName}
          initialTab={openArticle.initialTab}
          onClose={function(){ setOpenArticle(null) }}
        />
      )}
      {openKpiModal && (
        <KpiHistoryModal
          kpi={openKpiModal.kpi}
          label={openKpiModal.label}
          unit={openKpiModal.unit}
          accentColor={openKpiModal.accent}
          onClose={function(){ setOpenKpiModal(null) }}
        />
      )}
    </div>
  )
}

// =============================================================================
// SOUS-COMPOSANTS (top-level — règle SWC)
// =============================================================================

function KpiCard(props) {
  var label = props.label
  var value = props.value
  var evol = props.evol
  var bg = props.bg || '#FFFFFF'
  var textColor = props.textColor || '#191923'
  var icon = props.icon || ''
  var evolStr = '—'
  var evolColor = '#888'
  var evolBg = 'transparent'
  if (evol !== null && evol !== undefined && !isNaN(Number(evol))) {
    var n = Number(evol)
    evolStr = (n >= 0 ? '+' : '') + n.toFixed(1) + ' %'
    if (n > 0) { evolColor = '#FFFFFF'; evolBg = '#009D3A' }
    else if (n < 0) { evolColor = '#FFFFFF'; evolBg = '#CC0066' }
    else { evolColor = '#191923'; evolBg = '#EBEBEB' }
  }
  return (
    <div onClick={props.onClick} style={{background:bg,color:textColor,borderRadius:7,border:'2px solid #191923',padding:'14px 12px 12px',position:'relative',boxShadow:'3px 3px 0 #191923',cursor:'pointer',transition:'transform .1s'}}
      onMouseEnter={function(e){ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='5px 5px 0 #191923' }}
      onMouseLeave={function(e){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='3px 3px 0 #191923' }}>
      <span style={{position:'absolute',right:10,top:8,fontSize:22,opacity:0.18}}>{icon}</span>
      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:14,lineHeight:1,opacity:textColor==='#FFEB5A'?0.85:0.7}}>{label}</div>
      <div style={{fontWeight:900,fontSize:26,marginTop:6,lineHeight:1,letterSpacing:-0.5}}>{value}</div>
      <div style={{marginTop:8,display:'inline-block',background:evolBg,color:evolColor,padding:'2px 8px',borderRadius:11,fontSize:10,fontWeight:900,border:'1.5px solid #191923'}}>{evolStr} vs J-7</div>
    </div>
  )
}

function CanauxBar(props) {
  var canaux = props.canaux || {}
  var canalColor = props.canalColor
  var canalLabel = props.canalLabel
  var keys = Object.keys(canaux)
  var total = 0
  keys.forEach(function(k) { total += Number(canaux[k]) || 0 })
  if (total === 0) return null

  return (
    <div style={{marginTop:16}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:6}}>
        <span style={{fontFamily:"'Yellowtail',cursive",fontSize:14,color:'#FF82D7'}}>Répartition par mode</span>
        <span style={{fontSize:10,opacity:0.5,fontWeight:900}}>Total {FMT_EUR_DEC(total)}</span>
      </div>
      <div style={{display:'flex',height:26,border:'2px solid #191923',borderRadius:5,overflow:'hidden',boxShadow:'2px 2px 0 #191923'}}>
        {keys.map(function(k) {
          var v = Number(canaux[k]) || 0
          var pct = total > 0 ? (v / total) * 100 : 0
          if (pct === 0) return null
          var col = canalColor(k)
          var textC = k === 'livraison' ? '#FFEB5A' : '#191923'
          return (
            <div key={k} style={{width:pct+'%',background:col,display:'flex',alignItems:'center',justifyContent:'center'}}>
              {pct >= 8 && <span style={{fontSize:10,fontWeight:900,color:textC,whiteSpace:'nowrap'}}>{pct.toFixed(0)}%</span>}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:14,marginTop:8}}>
        {keys.map(function(k) {
          var v = Number(canaux[k]) || 0
          if (v === 0) return null
          return (
            <div key={k} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
              <span style={{width:12,height:12,background:canalColor(k),border:'1.5px solid #191923',borderRadius:3,display:'inline-block'}} />
              <span style={{fontWeight:900,textTransform:'uppercase',fontSize:10,letterSpacing:0.3}}>{canalLabel(k)}</span>
              <span style={{opacity:0.6,fontWeight:700}}>{FMT_EUR_DEC(v)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Pill(props) {
  return (
    <span style={{display:'inline-flex',alignItems:'center',padding:'4px 10px',background:props.bg,color:props.color,border:'2px solid #191923',borderRadius:14,fontWeight:900,fontSize:11,whiteSpace:'nowrap',boxShadow:'1.5px 1.5px 0 #191923'}}>{props.children}</span>
  )
}

function PriceVariationCard(props) {
  var v = props.variation
  var onOpen = props.onOpen
  var pct = Number(v.variation_pct)
  var pctColor = pct >= 10 ? '#CC0066' : (pct >= 5 ? '#B8920A' : '#191923')
  var pctBg = pct >= 10 ? '#FFE6E6' : (pct >= 5 ? '#FFF4D6' : '#FAFAFA')
  return (
    <div style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:7,padding:'12px 14px',boxShadow:'3px 3px 0 #191923',display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:8}}>
          <div style={{fontWeight:900,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0,flex:1}}>{v.product_name}</div>
          <div style={{background:pctBg,border:'2px solid '+pctColor,color:pctColor,padding:'2px 8px',borderRadius:11,fontWeight:900,fontSize:12,whiteSpace:'nowrap'}}>↑ {(pct >= 0 ? '+' : '') + pct.toFixed(1)} %</div>
        </div>
        <div style={{fontSize:10,opacity:0.55,marginTop:2,fontWeight:700}}>📦 {v.supplier_name || '—'}</div>
      </div>
      <div style={{display:'flex',alignItems:'baseline',gap:8,padding:'6px 10px',background:'#FFEB5A',border:'2px solid #191923',borderRadius:5}}>
        <span style={{fontSize:10,opacity:0.5,textDecoration:'line-through'}}>{Number(v.previous_price).toFixed(2)} €</span>
        <span style={{fontSize:12,opacity:0.4}}>→</span>
        <span style={{fontSize:15,fontWeight:900,letterSpacing:-0.3}}>{Number(v.current_price).toFixed(2)} €</span>
      </div>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        <button className="btn btn-sm" onClick={function(){ onOpen(v, 'graph') }} style={{flex:1,minWidth:80,justifyContent:'center'}}>📊 Graph</button>
        <button className="btn btn-sm" onClick={function(){ onOpen(v, 'factures') }} style={{flex:1,minWidth:80,justifyContent:'center'}}>📄 Factures</button>
        <button className="btn btn-sm" onClick={function(){ onOpen(v, 'historique') }} style={{flex:1,minWidth:80,justifyContent:'center'}}>🕓 Historique</button>
      </div>
    </div>
  )
}

function TaskRow(props) {
  var t = props.task
  var openModal = props.openModal
  var prioColor = t.priority === 'high' ? '#CC0066' : (t.priority === 'medium' ? '#B8920A' : '#888')
  var prioBg = t.priority === 'high' ? '#FFE6E6' : (t.priority === 'medium' ? '#FFF4D6' : '#FAFAFA')
  var dl = t.deadline ? new Date(t.deadline) : null
  var days = dl ? Math.floor((dl.getTime() - new Date().getTime()) / (1000*60*60*24)) : null
  var dlLabel = '—'
  var dlColor = '#888'
  if (days !== null) {
    if (days < 0) { dlLabel = 'En retard (' + Math.abs(days) + 'j)'; dlColor = '#CC0066' }
    else if (days === 0) { dlLabel = "Aujourd'hui"; dlColor = '#CC0066' }
    else if (days === 1) { dlLabel = 'Demain'; dlColor = '#B8920A' }
    else if (days <= 3) { dlLabel = 'Dans ' + days + ' j'; dlColor = '#B8920A' }
    else dlLabel = 'Dans ' + days + ' j'
  }
  return (
    <div onClick={function(){ openModal('task', Object.assign({}, t)) }} style={{display:'grid',gridTemplateColumns:'5px 1fr auto',gap:10,padding:'9px 0 9px 4px',borderBottom:'1px solid #EBEBEB',cursor:'pointer',alignItems:'center',transition:'background .1s',borderRadius:4}}
      onMouseEnter={function(e){ e.currentTarget.style.background='rgba(255,235,90,.3)' }}
      onMouseLeave={function(e){ e.currentTarget.style.background='transparent' }}>
      <div style={{width:5,minHeight:36,background:prioColor,borderRadius:3}} />
      <div style={{minWidth:0,paddingLeft:6}}>
        <div style={{fontWeight:900,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
        <div style={{fontSize:10,marginTop:2,display:'flex',gap:8,alignItems:'center'}}>
          <span style={{color:dlColor,fontWeight:900,textTransform:'uppercase',letterSpacing:0.3}}>{dlLabel}</span>
          <span style={{opacity:0.4}}>·</span>
          <span style={{opacity:0.5,textTransform:'capitalize'}}>{t.assignee || '—'}</span>
        </div>
      </div>
      <span style={{fontSize:9,padding:'3px 8px',background:t.status==='in_progress'?'#FF82D7':'#FFFFFF',color:'#191923',border:'1.5px solid #191923',borderRadius:11,fontWeight:900,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>
        {t.status === 'in_progress' ? 'En cours' : 'À faire'}
      </span>
    </div>
  )
}

function DevisRow(props) {
  var d = props.devis
  var nav = props.nav
  var statutColor = '#888'
  var statutBg = '#FAFAFA'
  var statutLabel = d.statut || '—'
  if (d.statut === 'brouillon') { statutColor = '#191923'; statutBg = '#EBEBEB'; statutLabel = 'Brouillon' }
  else if (d.statut === 'envoye') { statutColor = '#FFFFFF'; statutBg = '#005FFF'; statutLabel = 'Envoyé' }
  else if (d.statut === 'a_relancer') { statutColor = '#FFFFFF'; statutBg = '#B8920A'; statutLabel = 'À relancer' }
  else if (d.statut === 'accepte') { statutColor = '#FFFFFF'; statutBg = '#009D3A'; statutLabel = 'Accepté' }
  var ev = d.event_date ? new Date(d.event_date).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}) : '—'
  var daysToEvent = d.event_date ? DAYS_AGO(d.event_date) : null
  var urgent = daysToEvent !== null && daysToEvent < 0 && daysToEvent > -14 && d.statut !== 'accepte'
  return (
    <div onClick={function(){ nav('devis') }} style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,padding:'9px 4px',borderBottom:'1px solid #EBEBEB',cursor:'pointer',alignItems:'center',transition:'background .1s',borderRadius:4}}
      onMouseEnter={function(e){ e.currentTarget.style.background='rgba(255,235,90,.3)' }}
      onMouseLeave={function(e){ e.currentTarget.style.background='transparent' }}>
      <div style={{minWidth:0}}>
        <div style={{fontWeight:900,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{urgent ? '🔥 ' : ''}{d.client_nom || 'Client inconnu'}</div>
        <div style={{fontSize:10,opacity:0.55,marginTop:2,fontWeight:700}}>{d.numero ? d.numero + ' · ' : ''}Event {ev}</div>
      </div>
      <div style={{textAlign:'right',whiteSpace:'nowrap'}}>
        <div style={{fontWeight:900,fontSize:13}}>{FMT_EUR_DEC(d.total_ttc)}</div>
        <span style={{display:'inline-block',marginTop:3,padding:'2px 8px',background:statutBg,color:statutColor,border:'1.5px solid #191923',borderRadius:10,fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:0.4}}>{statutLabel}</span>
      </div>
    </div>
  )
}
