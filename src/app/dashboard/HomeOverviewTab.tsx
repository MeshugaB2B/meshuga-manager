'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LineChart, Line, ResponsiveContainer, ReferenceLine, YAxis } from 'recharts'
import ArticleDetailModal from './ArticleDetailModal'
import KpiHistoryModal from './KpiHistoryModal'

// =============================================================================
// HomeOverviewTab v3 — Homepage Edward (et Emy)
//
// Refonte design v3 :
//   - Palette KPI revue : zéro fond noir, fond rose minimisé (CA uniquement)
//     avec texte BLANC dessus, autres KPI en blanc / jaune avec accents
//   - Titre du bloc Z : "CA" (au lieu de "Chiffres de la veille")
//   - Couverts cliquables même si data = 0 (Edward verra le pb data source)
//   - Hausses de prix : sparkline recharts + moyenne ligne pointillée
//     DANS chaque carte (avant même de cliquer)
//   - 3 boutons par carte ouvrent l'ArticleDetailModal existant
//   - KpiHistoryModal = recharts BarChart avec axes propres et ReferenceLine
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

  var [zToday, setZToday] = useState(null)
  var [zPrev, setZPrev] = useState(null)
  var [priceVariations, setPriceVariations] = useState([])
  var [productHistories, setProductHistories] = useState({})   // {product_id: [{date, price}, ...]}
  var [recipeAlerts, setRecipeAlerts] = useState([])
  var [recipeStats, setRecipeStats] = useState({critique:0, alerte:0, surveillance:0})
  var [signaturesPending, setSignaturesPending] = useState([])
  var [devisActifs, setDevisActifs] = useState([])
  var [carouselIdx, setCarouselIdx] = useState(0)
  var [fcIdx, setFcIdx] = useState(0)
  var [isMobile, setIsMobile] = useState(false)
  var [loading, setLoading] = useState(true)

  var [openArticle, setOpenArticle] = useState(null)
  var [openKpiModal, setOpenKpiModal] = useState(null)

  useEffect(function() { loadAll() }, [])

  useEffect(function() {
    function check() { setIsMobile(window.innerWidth <= 768) }
    check()
    window.addEventListener('resize', check)
    return function() { window.removeEventListener('resize', check) }
  }, [])

  function loadAll() {
    setLoading(true)
    var c = sb()

    c.from('daily_z_reports')
      .select('z_date, ca_ttc, ca_ht, nb_tickets, nb_couverts, nb_articles, ticket_moyen, canaux, canaux_nb_tickets')
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
        filtered = filtered.slice(0, 10)
        setPriceVariations(filtered)

        // Fetch en batch des historiques de prix pour les produits visibles (sparkline)
        if (filtered.length > 0) {
          var ids = filtered.map(function(v) { return v.product_id })
          c.from('product_prices')
            .select('product_id, invoice_date, master_unit_price')
            .in('product_id', ids)
            .order('invoice_date', { ascending: true })
            .then(function(res2) {
              var byPid = {}
              ;(res2.data || []).forEach(function(p) {
                var pid = p.product_id
                if (!byPid[pid]) byPid[pid] = []
                byPid[pid].push({date: p.invoice_date, price: Number(p.master_unit_price)})
              })
              setProductHistories(byPid)
            })
        }
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
        setRecipeAlerts(mains.filter(function(r){ return Number(r.ecart_pct) > 3 }).slice(0, 10))
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
  var articlesEvol = (zToday && zPrev && Number(zPrev.nb_articles) > 0) ? ((Number(zToday.nb_articles) - Number(zPrev.nb_articles)) / Number(zPrev.nb_articles)) * 100 : null

  // Ratio articles/ticket (indicateur de cross-sell)
  var articlesParTicket = null
  if (zToday && Number(zToday.nb_tickets) > 0 && Number(zToday.nb_articles) > 0) {
    articlesParTicket = Number(zToday.nb_articles) / Number(zToday.nb_tickets)
  }

  // Tâches actives
  var tasksActives = (tasks || []).filter(function(t) { return t.status === 'in_progress' || t.status === 'todo' })
  var tasksUrgent = tasksActives.filter(function(t) {
    if (!t.deadline) return false
    var d = new Date(t.deadline)
    var diff = (d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 2 || t.priority === 'high'
  })

  // Food cost niveau
  var fcEmoji = '✅'
  var fcLabel = 'Food cost sous contrôle'
  var fcBg = '#E6F7E9'
  var fcAccent = '#009D3A'
  if (recipeStats.critique > 0) { fcEmoji = '🔥'; fcLabel = 'Food cost critique'; fcBg = '#FFE6E6'; fcAccent = '#CC0066' }
  else if (recipeStats.alerte > 0) { fcEmoji = '⚠️'; fcLabel = 'Food cost en alerte'; fcBg = '#FFF4D6'; fcAccent = '#B8920A' }
  else if (recipeStats.surveillance > 2) { fcEmoji = '⚠️'; fcLabel = 'Recettes à surveiller'; fcBg = '#FFF4D6'; fcAccent = '#B8920A' }
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

  // Carrousel food cost (desktop : pages de 2 ; mobile : scroll latéral colonnes de 2)
  var fcTotal = Math.ceil(recipeAlerts.length / 2)
  function fcPrev() { setFcIdx(function(i) { return i > 0 ? i - 1 : 0 }) }
  function fcNext() { setFcIdx(function(i) { return i < fcTotal - 1 ? i + 1 : fcTotal - 1 }) }
  var visibleFc = recipeAlerts.slice(fcIdx * 2, fcIdx * 2 + 2)
  // Découper recipeAlerts en colonnes de 2 (pour le scroll mobile)
  var fcColumns = []
  for (var fi = 0; fi < recipeAlerts.length; fi += 2) {
    fcColumns.push(recipeAlerts.slice(fi, fi + 2))
  }

  // Canaux
  var canalColor = function(k) {
    if (k === 'sur_place') return '#FF82D7'
    if (k === 'emporter') return '#FFEB5A'
    if (k === 'livraison') return '#005FFF'
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
  function openArt(variation) {
    setOpenArticle({
      productId: variation.product_id,
      productName: variation.product_name
    })
  }

  return (
    <div>
      {/* ====== EN-TÊTE ====== */}
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:42,lineHeight:1,color:'#FF82D7'}}>{isEmy ? 'Bonjour Emy' : 'Bonjour Edward'}</div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:14,opacity:0.5,marginTop:2,textTransform:'capitalize'}}>{todayDate}</div>
        </div>
        {isEmy && <button className="btn btn-p btn-sm" onClick={function(){ openModal('cr', {}) }}>+ Nouveau CR</button>}
      </div>

      {/* ====== BANDEAU ALERTES ====== */}
      {chips.length > 0 && (
        <div className="card" style={{borderColor:'#FF82D7',borderWidth:3}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
            <span style={{fontSize:18}}>🔔</span>
            <span style={{fontWeight:900,fontSize:13,textTransform:'uppercase',letterSpacing:0.5}}>Ce qui demande ton attention</span>
            <span style={{marginLeft:'auto',background:'#FF82D7',color:'#FFFFFF',padding:'3px 9px',borderRadius:12,fontWeight:900,fontSize:11,border:'1.5px solid #191923'}}>{chips.length}</span>
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
                  <span style={{opacity:0.7,fontSize:14}}>→</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== CA (ex Chiffres de la veille) ====== */}
      <div className="card">
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:30,color:'#FF82D7',lineHeight:1}}>CA</div>
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
              {/* CA TTC : ROSE + texte BLANC */}
              <KpiCard
                bg="#FF82D7" textColor="#FFFFFF" labelColor="#FFFFFF" labelOpacity={1}
                accentBar="#FFFFFF"
                label="CA TTC" value={FMT_EUR(zToday.ca_ttc)} evol={caEvol}
                icon="💰" onClick={function(){ openKpi('ca_ttc', 'CA TTC', 'eur', '#FF82D7') }}
              />
              {/* Articles vendus : JAUNE + texte NOIR (avec ratio art/tk en sous-info) */}
              <KpiCard
                bg="#FFEB5A" textColor="#191923" labelColor="#191923" labelOpacity={0.85}
                accentBar="#191923"
                label="Articles vendus" value={Number(zToday.nb_articles) > 0 ? FMT_INT(zToday.nb_articles) : '—'} evol={articlesEvol}
                subInfo={articlesParTicket !== null ? articlesParTicket.toFixed(2) + ' art/ticket' : null}
                icon="🥪" onClick={function(){ openKpi('nb_articles', 'Articles vendus', 'int', '#FFEB5A') }}
              />
              {/* Tickets : BLANC + accent rose */}
              <KpiCard
                bg="#FFFFFF" textColor="#191923" labelColor="#FF82D7" labelOpacity={1}
                accentBar="#FF82D7"
                label="Tickets" value={FMT_INT(zToday.nb_tickets)} evol={ticketsEvol}
                icon="🎫" onClick={function(){ openKpi('nb_tickets', 'Tickets', 'int', '#FF82D7') }}
              />
              {/* Panier moyen : BLANC + accent jaune épais */}
              <KpiCard
                bg="#FFFFFF" textColor="#191923" labelColor="#B8920A" labelOpacity={1}
                accentBar="#FFEB5A"
                label="Panier moyen" value={FMT_EUR_DEC(zToday.ticket_moyen)} evol={panierEvol}
                icon="🛒" onClick={function(){ openKpi('ticket_moyen', 'Panier moyen', 'eur', '#B8920A') }}
              />
            </div>
            <CanauxBar canaux={zToday.canaux || {}} canalColor={canalColor} canalLabel={canalLabel} />
          </div>
        )}
      </div>

      {/* ====== BANDEAU FOOD COST ====== */}
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
              {recipeStats.surveillance > 0 && <Pill bg="#FFFFFF" color="#191923">{recipeStats.surveillance} 👁</Pill>}
            </div>
          )}
        </div>
        {recipeAlerts.length > 0 && (
          <div style={{borderTop:'2px solid '+fcAccent,background:'#FFFFFF',padding:'12px 14px'}}>
            <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:6}}>
              <div style={{fontWeight:900,fontSize:11,textTransform:'uppercase',letterSpacing:0.5,opacity:0.6}}>
                Top {recipeAlerts.length} recettes en dérive
              </div>
              {/* Boutons carrousel : desktop uniquement */}
              {!isMobile && fcTotal > 1 && (
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button className="btn btn-sm" onClick={fcPrev} disabled={fcIdx === 0} style={{opacity:fcIdx===0?0.4:1,minWidth:32}}>◀</button>
                  <span style={{fontSize:11,fontWeight:900,opacity:0.6,padding:'0 6px'}}>{fcIdx + 1} / {fcTotal}</span>
                  <button className="btn btn-sm" onClick={fcNext} disabled={fcIdx === fcTotal - 1} style={{opacity:fcIdx===fcTotal-1?0.4:1,minWidth:32}}>▶</button>
                </div>
              )}
              {isMobile && fcColumns.length > 1 && (
                <div style={{fontSize:10,fontWeight:900,opacity:0.45,textTransform:'uppercase',letterSpacing:0.3}}>← Glisse →</div>
              )}
            </div>

            {/* DESKTOP : 2 cards visibles, pagination par boutons */}
            {!isMobile && (
              <div className="g2" style={{marginBottom:0}}>
                {visibleFc.map(function(r) { return <FcCard key={r.recipe_id} recipe={r} nav={nav} /> })}
              </div>
            )}

            {/* MOBILE : scroll latéral, colonnes de 2 cards empilées */}
            {isMobile && (
              <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:6,scrollSnapType:'x mandatory',WebkitOverflowScrolling:'touch'}}>
                {fcColumns.map(function(col, ci) {
                  return (
                    <div key={ci} style={{display:'flex',flexDirection:'column',gap:10,minWidth:'85%',scrollSnapAlign:'start',flexShrink:0}}>
                      {col.map(function(r) { return <FcCard key={r.recipe_id} recipe={r} nav={nav} /> })}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Dots desktop */}
            {!isMobile && fcTotal > 1 && (
              <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:12}}>
                {Array.from({length: fcTotal}).map(function(_, i) {
                  return (
                    <span key={i} onClick={function(){ setFcIdx(i) }} style={{width:i===fcIdx?20:10,height:8,borderRadius:4,background:i===fcIdx?fcAccent:'#EBEBEB',border:'2px solid #191923',cursor:'pointer',transition:'width .2s'}} />
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====== CARROUSEL HAUSSES DE PRIX (avec mini-graphs intégrés) ====== */}
      {priceVariations.length > 0 && (
        <div className="card">
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#FF82D7',lineHeight:1}}>Hausses de prix détectées</div>
              <div style={{fontSize:11,opacity:0.55,marginTop:3,fontWeight:700}}>{priceVariations.length} variation{priceVariations.length > 1 ? 's' : ''} récentes · ligne pointillée = prix moyen historique</div>
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
              return <PriceVariationCard key={v.product_id + '_' + v.invoice_date} variation={v} history={productHistories[v.product_id] || []} onOpen={openArt} />
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

      {/* ====== GRID TÂCHES + DEVIS ====== */}
      <div className="g2">
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
      <ArticleDetailModal
        isOpen={openArticle !== null}
        productId={openArticle ? openArticle.productId : undefined}
        productName={openArticle ? openArticle.productName : undefined}
        onClose={function(){ setOpenArticle(null) }}
      />
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
  var labelColor = props.labelColor || '#FF82D7'
  var labelOpacity = props.labelOpacity !== undefined ? props.labelOpacity : 1
  var accentBar = props.accentBar || '#FF82D7'
  var icon = props.icon || ''
  var subInfo = props.subInfo || null

  var evolStr = '—'
  var evolBg = 'transparent'
  var evolColor = '#888'
  var evolBorder = '#888'
  if (evol !== null && evol !== undefined && !isNaN(Number(evol))) {
    var n = Number(evol)
    evolStr = (n >= 0 ? '+' : '') + n.toFixed(1) + ' %'
    if (n > 0) { evolBg = '#009D3A'; evolColor = '#FFFFFF'; evolBorder = '#191923' }
    else if (n < 0) { evolBg = '#CC0066'; evolColor = '#FFFFFF'; evolBorder = '#191923' }
    else { evolBg = '#EBEBEB'; evolColor = '#191923'; evolBorder = '#191923' }
  }

  return (
    <div onClick={props.onClick} style={{background:bg,color:textColor,borderRadius:7,border:'2px solid #191923',padding:'14px 14px 12px 16px',position:'relative',boxShadow:'3px 3px 0 #191923',cursor:'pointer',transition:'transform .1s',overflow:'hidden'}}
      onMouseEnter={function(e){ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='5px 5px 0 #191923' }}
      onMouseLeave={function(e){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='3px 3px 0 #191923' }}>
      <span style={{position:'absolute',left:0,top:0,bottom:0,width:5,background:accentBar}} />
      <div style={{display:'flex',alignItems:'center',gap:6}}>
        {icon && <span style={{fontSize:16,lineHeight:1}}>{icon}</span>}
        <div style={{fontFamily:"'Yellowtail',cursive",fontSize:14,lineHeight:1,color:labelColor,opacity:labelOpacity}}>{label}</div>
      </div>
      <div style={{fontWeight:900,fontSize:26,marginTop:6,lineHeight:1,letterSpacing:-0.5}}>{value}</div>
      <div style={{marginTop:8,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
        <span style={{display:'inline-block',background:evolBg,color:evolColor,padding:'2px 8px',borderRadius:11,fontSize:10,fontWeight:900,border:'1.5px solid '+evolBorder}}>{evolStr} vs J-7</span>
        {subInfo && <span style={{fontSize:10,fontWeight:900,opacity:0.65,whiteSpace:'nowrap'}}>· {subInfo}</span>}
      </div>
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
          var textC = k === 'livraison' ? '#FFFFFF' : '#191923'
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

function FcCard(props) {
  var r = props.recipe
  var nav = props.nav
  var p = Number(r.ecart_pct)
  var color = p > 15 ? '#CC0066' : (p > 8 ? '#B8920A' : '#191923')
  var bg = p > 15 ? '#FFE6E6' : (p > 8 ? '#FFF4D6' : '#FAFAFA')
  var emoji = p > 15 ? '🔥' : (p > 8 ? '⚠️' : '👁')
  return (
    <div onClick={function(){ nav('recipes') }} style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:7,padding:'10px 12px',boxShadow:'3px 3px 0 #191923',cursor:'pointer',transition:'transform .1s',display:'flex',alignItems:'center',gap:10}}
      onMouseEnter={function(e){ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='5px 5px 0 #191923' }}
      onMouseLeave={function(e){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='3px 3px 0 #191923' }}>
      <span style={{fontSize:22,lineHeight:1,flexShrink:0}}>{emoji}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:900,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{r.recipe_name}</div>
        <div style={{fontSize:10,opacity:0.5,marginTop:1}}>FC {FMT_EUR_DEC(r.food_cost_actuel)} · moy. {FMT_EUR_DEC(r.food_cost_moyenne)}</div>
      </div>
      <div style={{textAlign:'right',whiteSpace:'nowrap',flexShrink:0}}>
        <div style={{background:bg,border:'2px solid '+color,color:color,padding:'2px 8px',borderRadius:11,fontWeight:900,fontSize:12}}>{FMT_PCT(p, true)}</div>
        <div style={{fontSize:9,opacity:0.5,marginTop:2}}>+{FMT_EUR_DEC(r.ecart_eur)}/port.</div>
      </div>
    </div>
  )
}

function PriceVariationCard(props) {
  var v = props.variation
  var history = props.history || []
  var onOpen = props.onOpen
  var pct = Number(v.variation_pct)
  var pctColor = pct >= 10 ? '#CC0066' : (pct >= 5 ? '#B8920A' : '#191923')
  var pctBg = pct >= 10 ? '#FFE6E6' : (pct >= 5 ? '#FFF4D6' : '#FAFAFA')

  // Computer la moyenne historique
  var avg = null
  if (history.length > 0) {
    var sum = 0; var n = 0
    history.forEach(function(h) { if (h.price > 0) { sum += h.price; n++ } })
    if (n > 0) avg = sum / n
  }

  // Data pour la sparkline
  var sparkData = history.map(function(h) { return {date: h.date, price: h.price} })

  return (
    <div style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:7,padding:'12px 14px',boxShadow:'3px 3px 0 #191923',display:'flex',flexDirection:'column',gap:10}}>
      <div>
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:8}}>
          <div style={{fontWeight:900,fontSize:14,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0,flex:1}}>{v.product_name}</div>
          <div style={{background:pctBg,border:'2px solid '+pctColor,color:pctColor,padding:'2px 8px',borderRadius:11,fontWeight:900,fontSize:12,whiteSpace:'nowrap'}}>↑ {(pct >= 0 ? '+' : '') + pct.toFixed(1)} %</div>
        </div>
        <div style={{fontSize:10,opacity:0.55,marginTop:2,fontWeight:700}}>📦 {v.supplier_name || '—'}</div>
      </div>

      {/* Mini-graph sparkline + moyenne */}
      {sparkData.length >= 2 && (
        <div style={{background:'#FAFAFA',border:'1.5px solid #191923',borderRadius:5,padding:'6px 8px 2px',position:'relative'}}>
          <div style={{position:'absolute',top:4,left:8,fontSize:8,fontWeight:900,textTransform:'uppercase',letterSpacing:0.3,opacity:0.5}}>Historique ({sparkData.length} pts)</div>
          <div style={{width:'100%',height:60,marginTop:8}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData} margin={{top: 2, right: 2, left: 2, bottom: 2}}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                {avg !== null && <ReferenceLine y={avg} stroke="#005FFF" strokeWidth={1.5} strokeDasharray="3 2" />}
                <Line type="monotone" dataKey="price" stroke="#191923" strokeWidth={2} dot={false} activeDot={{r: 3, fill: '#FF82D7', stroke: '#191923'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {avg !== null && (
            <div style={{position:'absolute',top:4,right:8,fontSize:8,fontWeight:900,color:'#005FFF',textTransform:'uppercase',letterSpacing:0.3}}>━━ Moy. {Number(avg).toFixed(2)} €</div>
          )}
        </div>
      )}

      <div style={{display:'flex',alignItems:'baseline',gap:8,padding:'6px 10px',background:'#FFEB5A',border:'2px solid #191923',borderRadius:5}}>
        <span style={{fontSize:10,opacity:0.5,textDecoration:'line-through'}}>{Number(v.previous_price).toFixed(2)} €</span>
        <span style={{fontSize:12,opacity:0.4}}>→</span>
        <span style={{fontSize:15,fontWeight:900,letterSpacing:-0.3}}>{Number(v.current_price).toFixed(2)} €</span>
      </div>

      <button className="btn btn-sm btn-p" onClick={function(){ onOpen(v) }} style={{justifyContent:'center'}}>📊 Voir l&apos;article complet →</button>
    </div>
  )
}

function TaskRow(props) {
  var t = props.task
  var openModal = props.openModal
  var prioColor = t.priority === 'high' ? '#CC0066' : (t.priority === 'medium' ? '#B8920A' : '#888')
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
      <span style={{fontSize:9,padding:'3px 8px',background:t.status==='in_progress'?'#FF82D7':'#FFFFFF',color:t.status==='in_progress'?'#FFFFFF':'#191923',border:'1.5px solid #191923',borderRadius:11,fontWeight:900,textTransform:'uppercase',letterSpacing:0.5,whiteSpace:'nowrap'}}>
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
