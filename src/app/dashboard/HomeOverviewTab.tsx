'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// =============================================================================
// HomeOverviewTab — Homepage Edward (et Emy) v1
//
// Branchée à de vraies données Supabase :
//   - Z de caisse veille + J-7  : daily_z_reports
//   - Hausses de prix           : v_price_variations_clean
//   - Food cost recettes        : v_recipe_real_food_cost (même source que FoodCostAlertWidget)
//   - Signatures RH en attente  : hr_contracts + hr_contract_amendments
//   - Devis B2B actifs          : devis
//   - Tâches                    : passées en props depuis le parent
//
// Spec UI v3 (maquette validée) :
//   1. Titre Yellowtail rose &quot;Bonjour Edward&quot; + date
//   2. Bandeau alertes (chips cliquables)
//   3. Chiffres de la veille (4 KPI + barre empilée canaux)
//   4. Bandeau food cost synthétique (vert/orange/rouge)
//   5. Carrousel hausses de prix
//   6. Grid 2 colonnes : Tâches + Devis B2B
// =============================================================================

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

var FMT_EUR = function(v) {
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

  var [zToday, setZToday] = useState(null)
  var [zPrev, setZPrev] = useState(null)
  var [priceVariations, setPriceVariations] = useState([])
  var [recipeStats, setRecipeStats] = useState({critique:0, alerte:0, surveillance:0, baisse:0, stable:0, topRecipe:null})
  var [signaturesPending, setSignaturesPending] = useState([])
  var [devisActifs, setDevisActifs] = useState([])
  var [carouselIdx, setCarouselIdx] = useState(0)
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    loadAll()
  }, [])

  function loadAll() {
    setLoading(true)
    var c = sb()

    // 1. Z de caisse veille + J-7
    c.from('daily_z_reports')
      .select('z_date, ca_ttc, ca_ht, nb_tickets, nb_couverts, ticket_moyen, canaux, canaux_nb_tickets')
      .order('z_date', { ascending: false })
      .limit(15)
      .then(function(res) {
        var rows = res.data || []
        if (rows.length > 0) {
          setZToday(rows[0])
          // chercher la ligne 7 jours avant
          var d0 = new Date(rows[0].z_date)
          var target = new Date(d0.getTime() - 7 * 24 * 60 * 60 * 1000)
          var targetIso = target.toISOString().split('T')[0]
          var match = null
          for (var i = 0; i < rows.length; i++) {
            if (rows[i].z_date === targetIso) { match = rows[i]; break }
          }
          // fallback : ligne ~7 jours
          if (!match && rows.length >= 7) match = rows[6]
          setZPrev(match)
        }
      })

    // 2. Hausses de prix (vue clean = anti-anomalies)
    c.from('v_price_variations_clean')
      .select('product_id, product_name, supplier_name, current_price, previous_price, variation_pct, severity, invoice_date, previous_date')
      .gt('variation_pct', 0)
      .order('invoice_date', { ascending: false })
      .limit(20)
      .then(function(res) {
        var data = res.data || []
        // Filtre : variations significatives (>= 2 %) ET récentes (<= 30 jours)
        var filtered = data.filter(function(r) {
          var pct = Number(r.variation_pct)
          if (pct < 2) return false
          var days = DAYS_AGO(r.invoice_date)
          if (days !== null && days > 30) return false
          return true
        })
        setPriceVariations(filtered.slice(0, 8))
      })

    // 3. Food cost recettes (même vue que FoodCostAlertWidget)
    c.from('v_recipe_real_food_cost')
      .select('recipe_id, recipe_name, categorie, food_cost_actuel, food_cost_moyenne, ecart_pct, nb_ingredients')
      .gt('nb_ingredients', 0)
      .not('ecart_pct', 'is', null)
      .order('ecart_pct', { ascending: false })
      .then(function(res) {
        var data = res.data || []
        var prepCategories = ['sous_recette', 'sauce', 'accompagnement']
        var mains = data.filter(function(r) { return prepCategories.indexOf(r.categorie) === -1 })
        var s = {critique:0, alerte:0, surveillance:0, baisse:0, stable:0, topRecipe:null}
        var top = null
        mains.forEach(function(r) {
          var p = Number(r.ecart_pct)
          if (p > 15) s.critique++
          else if (p > 8) s.alerte++
          else if (p > 3) s.surveillance++
          else if (p < -5) s.baisse++
          else s.stable++
          if (!top || Number(r.ecart_pct) > Number(top.ecart_pct)) top = r
        })
        s.topRecipe = top
        setRecipeStats(s)
      })

    // 4. Signatures pending (contrats + avenants)
    c.from('hr_contracts')
      .select('id, signature_status, signature_sent_at, signature_recipient_email, employee_id, hr_employees(prenom, nom)')
      .in('signature_status', ['sent', 'viewed'])
      .is('signature_signed_at', null)
      .order('signature_sent_at', { ascending: false })
      .limit(20)
      .then(function(res) {
        var contracts = (res.data || []).map(function(r) {
          var emp = r.hr_employees || {}
          var name = ((emp.prenom || '') + ' ' + (emp.nom || '')).trim() || (r.signature_recipient_email || 'Salarié inconnu')
          return {
            kind: 'contract',
            id: r.id,
            employee_id: r.employee_id,
            employee_name: name,
            sent_at: r.signature_sent_at,
            status: r.signature_status
          }
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
              var name = ((emp.prenom || '') + ' ' + (emp.nom || '')).trim() || (r.signature_recipient_email || 'Salarié inconnu')
              return {
                kind: 'amendment',
                id: r.id,
                employee_id: contract.employee_id,
                employee_name: name,
                sent_at: r.signature_sent_at,
                status: r.signature_status
              }
            })
            var all = contracts.concat(amendments).sort(function(a, b) {
              if (!a.sent_at) return 1
              if (!b.sent_at) return -1
              return a.sent_at < b.sent_at ? 1 : -1
            })
            setSignaturesPending(all)
          })
      })

    // 5. Devis actifs (statut = en attente d'action)
    c.from('devis')
      .select('id, numero, statut, client_nom, total_ttc, event_date, date_validite, sent_at, parent_devis_id, option_label')
      .not('statut', 'in', '(gagne,perdu,annule,refuse)')
      .is('parent_devis_id', null)
      .order('updated_at', { ascending: false })
      .limit(10)
      .then(function(res) {
        setDevisActifs(res.data || [])
        setLoading(false)
      })
  }

  // -------- Calculs dérivés (au render) --------

  var caEvol = null
  if (zToday && zPrev && Number(zPrev.ca_ttc) > 0) {
    caEvol = ((Number(zToday.ca_ttc) - Number(zPrev.ca_ttc)) / Number(zPrev.ca_ttc)) * 100
  }
  var ticketsEvol = null
  if (zToday && zPrev && Number(zPrev.nb_tickets) > 0) {
    ticketsEvol = ((Number(zToday.nb_tickets) - Number(zPrev.nb_tickets)) / Number(zPrev.nb_tickets)) * 100
  }
  var panierEvol = null
  if (zToday && zPrev && Number(zPrev.ticket_moyen) > 0) {
    panierEvol = ((Number(zToday.ticket_moyen) - Number(zPrev.ticket_moyen)) / Number(zPrev.ticket_moyen)) * 100
  }

  // Tâches actives
  var tasksActives = (tasks || []).filter(function(t) { return t.status === 'in_progress' || t.status === 'todo' })
  var tasksUrgent = tasksActives.filter(function(t) {
    if (!t.deadline) return false
    var d = new Date(t.deadline)
    var now = new Date()
    var diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 2 || t.priority === 'high'
  })

  // Food cost — niveau de gravité global
  var fcLevel = 'green'
  var fcEmoji = '✅'
  var fcLabel = 'Food cost sous contrôle'
  if (recipeStats.critique > 0) { fcLevel = 'red'; fcEmoji = '🔥'; fcLabel = 'Food cost critique — action immédiate' }
  else if (recipeStats.alerte > 0) { fcLevel = 'orange'; fcEmoji = '⚠️'; fcLabel = 'Food cost en alerte' }
  else if (recipeStats.surveillance > 2) { fcLevel = 'orange'; fcEmoji = '⚠️'; fcLabel = 'Plusieurs recettes à surveiller' }
  var fcCount = recipeStats.critique + recipeStats.alerte + recipeStats.surveillance
  var fcBg = fcLevel === 'red' ? '#FFE6E6' : (fcLevel === 'orange' ? '#FFF4D6' : '#E6F7E9')
  var fcBorder = fcLevel === 'red' ? '#CC0066' : (fcLevel === 'orange' ? '#B8920A' : '#009D3A')

  // Bandeau alertes — chips
  var chips = []
  if (signaturesPending.length > 0) {
    chips.push({
      id: 'sig',
      level: 'urgent',
      label: signaturesPending.length + ' signature' + (signaturesPending.length > 1 ? 's' : '') + ' en attente',
      action: function() { nav('rh') }
    })
  }
  if (recipeStats.critique > 0) {
    chips.push({
      id: 'fc',
      level: 'urgent',
      label: recipeStats.critique + ' recette' + (recipeStats.critique > 1 ? 's' : '') + ' en dérive critique',
      action: function() { nav('recipes') }
    })
  }
  var devisToFollow = devisActifs.filter(function(d) { return d.statut === 'envoye' || d.statut === 'a_relancer' })
  if (devisToFollow.length > 0) {
    chips.push({
      id: 'devis',
      level: 'warn',
      label: devisToFollow.length + ' devis à relancer',
      action: function() { nav('devis') }
    })
  }
  var devisBrouillons = devisActifs.filter(function(d) { return d.statut === 'brouillon' })
  if (devisBrouillons.length > 0) {
    chips.push({
      id: 'brouillons',
      level: 'info',
      label: devisBrouillons.length + ' devis en brouillon',
      action: function() { nav('devis') }
    })
  }
  if (tasksUrgent.length > 0) {
    chips.push({
      id: 'tasks',
      level: 'urgent',
      label: tasksUrgent.length + ' tâche' + (tasksUrgent.length > 1 ? 's' : '') + ' urgente' + (tasksUrgent.length > 1 ? 's' : ''),
      action: function() { nav('tasks') }
    })
  }

  // Carrousel hausses — pagination
  var carouselTotalDesktop = Math.ceil(priceVariations.length / 2)
  function carouselPrev() { setCarouselIdx(function(i) { return i > 0 ? i - 1 : 0 }) }
  function carouselNext() { setCarouselIdx(function(i) { return i < carouselTotalDesktop - 1 ? i + 1 : carouselTotalDesktop - 1 }) }
  var visibleVariations = priceVariations.slice(carouselIdx * 2, carouselIdx * 2 + 2)

  // Couleurs canaux
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

  // Date affichée
  var todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  var zDateLabel = zToday && zToday.z_date ? new Date(zToday.z_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'

  return (
    <div>
      {/* 1. EN-TÊTE */}
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:36,lineHeight:1.1,color:'#FF82D7'}}>{isEmy ? 'Bonjour Emy' : 'Bonjour Edward'}</div>
          <div className="ps">{todayDate}</div>
        </div>
        {isEmy && <button className="btn btn-p btn-sm" onClick={function(){ openModal('cr', {}) }}>+ Nouveau CR</button>}
      </div>

      {/* 2. BANDEAU ALERTES */}
      {chips.length > 0 && (
        <div style={{background:'#FFFFFF',border:'2px solid #FF82D7',borderRadius:8,padding:'12px 14px',marginBottom:12,boxShadow:'3px 3px 0 #191923'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            <span style={{fontSize:16}}>🔔</span>
            <span style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:0.5}}>Ce qui demande ton attention</span>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
            {chips.map(function(ch) {
              var bg = ch.level === 'urgent' ? '#CC0066' : (ch.level === 'warn' ? '#FFEB5A' : '#FFFFFF')
              var col = ch.level === 'urgent' ? '#FFFFFF' : '#191923'
              return (
                <div key={ch.id} onClick={ch.action} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'6px 10px',background:bg,color:col,border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:11,cursor:'pointer',boxShadow:'2px 2px 0 #191923'}}>
                  <span>{ch.label}</span>
                  <span style={{opacity:0.7}}>→</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 3. CHIFFRES DE LA VEILLE */}
      <div className="card">
        <div className="ct" style={{color:'#FF82D7',fontSize:20}}>Chiffres de la veille</div>
        <div style={{fontSize:11,opacity:0.5,marginTop:-6,marginBottom:10,textTransform:'capitalize'}}>{zDateLabel}</div>

        {!zToday && (
          <div style={{padding:'14px',textAlign:'center',color:'#888',fontSize:12}}>
            {loading ? 'Chargement...' : "Aucun Z de caisse disponible. Le dernier import n'a peut-être pas eu lieu."}
          </div>
        )}

        {zToday && (
          <div>
            <div className="g4">
              <KpiCard label="CA TTC" value={FMT_EUR(zToday.ca_ttc)} evol={caEvol} />
              <KpiCard label="Tickets" value={FMT_INT(zToday.nb_tickets)} evol={ticketsEvol} />
              <KpiCard label="Panier moyen" value={FMT_EUR(zToday.ticket_moyen)} evol={panierEvol} />
              <KpiCard label="CA HT" value={FMT_EUR(zToday.ca_ht)} evol={null} />
            </div>
            <CanauxBar canaux={zToday.canaux || {}} canalColor={canalColor} canalLabel={canalLabel} />
          </div>
        )}
      </div>

      {/* 4. BANDEAU FOOD COST */}
      <div onClick={function(){ nav('recipes') }} style={{background:fcBg,border:'2px solid '+fcBorder,borderLeft:'6px solid '+fcBorder,borderRadius:8,padding:'14px 16px',marginBottom:12,boxShadow:'3px 3px 0 #191923',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
          <span style={{fontSize:24}}>{fcEmoji}</span>
          <div style={{minWidth:0}}>
            <div style={{fontWeight:900,fontSize:14,textTransform:'uppercase',letterSpacing:0.5}}>{fcLabel}</div>
            <div style={{fontSize:12,opacity:0.7,marginTop:2}}>
              {fcCount > 0 ? (fcCount + ' produit' + (fcCount > 1 ? 's' : '') + ' en hausse cette semaine') : 'Aucun écart significatif détecté'}
              {recipeStats.topRecipe && fcCount > 0 ? ' · top : ' + recipeStats.topRecipe.recipe_name + ' ' + FMT_PCT(recipeStats.topRecipe.ecart_pct, true) : ''}
            </div>
          </div>
        </div>
        {fcCount > 0 && (
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:900,fontSize:22,color:fcBorder}}>{recipeStats.critique + ' / ' + recipeStats.alerte + ' / ' + recipeStats.surveillance}</div>
            <div style={{fontSize:9,opacity:0.6,textTransform:'uppercase',letterSpacing:0.5}}>Critique / Alerte / Surv.</div>
          </div>
        )}
      </div>

      {/* 5. CARROUSEL HAUSSES DE PRIX */}
      {priceVariations.length > 0 && (
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div>
              <div className="ct" style={{color:'#FF82D7',fontSize:18,margin:0}}>Hausses de prix détectées</div>
              <div style={{fontSize:11,opacity:0.5}}>{priceVariations.length} variation{priceVariations.length > 1 ? 's' : ''} depuis 30 jours</div>
            </div>
            {carouselTotalDesktop > 1 && (
              <div style={{display:'flex',gap:6}}>
                <button className="btn btn-sm" onClick={carouselPrev} disabled={carouselIdx === 0} style={{opacity:carouselIdx===0?0.4:1}}>◀</button>
                <button className="btn btn-sm" onClick={carouselNext} disabled={carouselIdx === carouselTotalDesktop - 1} style={{opacity:carouselIdx===carouselTotalDesktop-1?0.4:1}}>▶</button>
              </div>
            )}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))',gap:10}}>
            {visibleVariations.map(function(v) {
              var pct = Number(v.variation_pct)
              var pctColor = pct >= 10 ? '#CC0066' : (pct >= 5 ? '#B8920A' : '#191923')
              return (
                <div key={v.product_id + '_' + v.invoice_date} style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:6,padding:'10px 12px',boxShadow:'2px 2px 0 #191923'}}>
                  <div style={{fontWeight:900,fontSize:13,marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.product_name}</div>
                  <div style={{fontSize:10,opacity:0.5,marginBottom:8}}>{v.supplier_name || '—'}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:8}}>
                    <span style={{fontSize:11,opacity:0.6,textDecoration:'line-through'}}>{FMT_EUR(v.previous_price)}</span>
                    <span style={{fontSize:14,opacity:0.4}}>→</span>
                    <span style={{fontSize:15,fontWeight:900}}>{FMT_EUR(v.current_price)}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontWeight:900,fontSize:13,color:pctColor}}>↑ {FMT_PCT(pct, true)}</span>
                    <button className="btn btn-sm" onClick={function(){ nav('recipes') }}>Voir →</button>
                  </div>
                </div>
              )
            })}
          </div>
          {carouselTotalDesktop > 1 && (
            <div style={{display:'flex',justifyContent:'center',gap:5,marginTop:10}}>
              {Array.from({length: carouselTotalDesktop}).map(function(_, i) {
                return (
                  <span key={i} onClick={function(){ setCarouselIdx(i) }} style={{width:i===carouselIdx?16:8,height:8,borderRadius:4,background:i===carouselIdx?'#FF82D7':'#DDD',border:'1px solid #191923',cursor:'pointer',transition:'width .2s'}} />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. GRID — TÂCHES + DEVIS */}
      <div className="g2">
        {/* Colonne gauche : Tâches */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div className="ct" style={{color:'#FF82D7',fontSize:16,margin:0}}>Tâches en cours</div>
            <button className="btn btn-p btn-sm" onClick={function(){
              var today = new Date().toISOString().split('T')[0]
              openModal('task', {assignee: isEmy ? 'emy' : 'edward', priority: 'medium', status: 'todo', checklist: [], files: [], deadline: today})
            }}>+ Tâche</button>
          </div>
          {tasksActives.length === 0 && (
            <div style={{padding:'14px',textAlign:'center',color:'#888',fontSize:12}}>Rien en cours. Profite.</div>
          )}
          {tasksActives.slice(0, 6).map(function(t) {
            var prioColor = t.priority === 'high' ? '#CC0066' : (t.priority === 'medium' ? '#B8920A' : '#888')
            var dl = t.deadline ? new Date(t.deadline) : null
            var days = dl ? Math.floor((dl.getTime() - new Date().getTime()) / (1000*60*60*24)) : null
            var dlLabel = '—'
            if (days !== null) {
              if (days < 0) dlLabel = 'En retard (' + Math.abs(days) + 'j)'
              else if (days === 0) dlLabel = "Aujourd'hui"
              else if (days === 1) dlLabel = 'Demain'
              else dlLabel = 'Dans ' + days + ' j'
            }
            return (
              <div key={t.id} onClick={function(){ openModal('task', Object.assign({}, t)) }} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #EBEBEB',cursor:'pointer'}}>
                <div style={{width:3,height:24,background:prioColor,borderRadius:2,flexShrink:0}} />
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:900,fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                  <div style={{fontSize:10,opacity:0.5}}>{dlLabel} · {t.assignee || '—'}</div>
                </div>
                <span style={{fontSize:9,padding:'2px 6px',background:t.status==='in_progress'?'#FFEB5A':'#FFFFFF',border:'1.5px solid #191923',borderRadius:3,fontWeight:900,textTransform:'uppercase'}}>
                  {t.status === 'in_progress' ? 'En cours' : 'À faire'}
                </span>
              </div>
            )
          })}
          {tasksActives.length > 6 && (
            <div style={{marginTop:8,textAlign:'center'}}>
              <button className="btn btn-sm" onClick={function(){ nav('tasks') }}>Voir tout ({tasksActives.length}) →</button>
            </div>
          )}
        </div>

        {/* Colonne droite : Devis B2B */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <div className="ct" style={{color:'#FF82D7',fontSize:16,margin:0}}>Devis B2B en attente</div>
            <button className="btn btn-p btn-sm" onClick={function(){ nav('devis') }}>+ Devis</button>
          </div>
          {devisActifs.length === 0 && (
            <div style={{padding:'14px',textAlign:'center',color:'#888',fontSize:12}}>Aucun devis actif.</div>
          )}
          {devisActifs.slice(0, 6).map(function(d) {
            var statutColor = '#888'
            var statutLabel = d.statut || '—'
            if (d.statut === 'brouillon') { statutColor = '#888'; statutLabel = 'Brouillon' }
            else if (d.statut === 'envoye') { statutColor = '#005FFF'; statutLabel = 'Envoyé' }
            else if (d.statut === 'a_relancer') { statutColor = '#B8920A'; statutLabel = 'À relancer' }
            else if (d.statut === 'accepte') { statutColor = '#009D3A'; statutLabel = 'Accepté' }
            var ev = d.event_date ? new Date(d.event_date).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'}) : '—'
            return (
              <div key={d.id} onClick={function(){ nav('devis') }} style={{display:'flex',alignItems:'center',gap:8,padding:'7px 0',borderBottom:'1px solid #EBEBEB',cursor:'pointer'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:900,fontSize:12,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{d.client_nom || 'Client inconnu'}</div>
                  <div style={{fontSize:10,opacity:0.5}}>{d.numero ? d.numero + ' · ' : ''}Event {ev}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontWeight:900,fontSize:12}}>{FMT_EUR(d.total_ttc)}</div>
                  <div style={{fontSize:9,fontWeight:900,color:statutColor,textTransform:'uppercase'}}>{statutLabel}</div>
                </div>
              </div>
            )
          })}
          {devisActifs.length > 6 && (
            <div style={{marginTop:8,textAlign:'center'}}>
              <button className="btn btn-sm" onClick={function(){ nav('devis') }}>Voir tout ({devisActifs.length}) →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Sous-composants (déclarés au top level, jamais à l'intérieur du parent
// — règle SWC stricte)
// =============================================================================

function KpiCard(props) {
  var label = props.label
  var value = props.value
  var evol = props.evol
  var evolStr = '—'
  var evolColor = '#888'
  if (evol !== null && evol !== undefined && !isNaN(Number(evol))) {
    var n = Number(evol)
    evolStr = (n >= 0 ? '+' : '') + n.toFixed(1) + ' %'
    evolColor = n > 0 ? '#009D3A' : (n < 0 ? '#CC0066' : '#888')
  }
  return (
    <div className="kc" style={{background:'#FFFFFF'}}>
      <div className="kl" style={{color:'#FF82D7'}}>{label}</div>
      <div className="kv" style={{marginTop:4}}>{value}</div>
      <div style={{fontSize:11,fontWeight:900,marginTop:4,color:evolColor}}>{evolStr} vs J-7</div>
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
    <div style={{marginTop:12}}>
      <div style={{display:'flex',height:18,border:'2px solid #191923',borderRadius:4,overflow:'hidden',boxShadow:'2px 2px 0 #191923'}}>
        {keys.map(function(k) {
          var v = Number(canaux[k]) || 0
          var pct = total > 0 ? (v / total) * 100 : 0
          if (pct === 0) return null
          return (
            <div key={k} style={{width:pct+'%',background:canalColor(k),display:'flex',alignItems:'center',justifyContent:'center'}}>
              {pct >= 10 && (
                <span style={{fontSize:9,fontWeight:900,color:k==='livraison'?'#FFEB5A':'#191923',whiteSpace:'nowrap'}}>{pct.toFixed(0)}%</span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:6}}>
        {keys.map(function(k) {
          var v = Number(canaux[k]) || 0
          if (v === 0) return null
          return (
            <div key={k} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
              <span style={{width:10,height:10,background:canalColor(k),border:'1.5px solid #191923',borderRadius:2,display:'inline-block'}} />
              <span style={{fontWeight:900}}>{canalLabel(k)}</span>
              <span style={{opacity:0.6}}>{FMT_EUR(v)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
