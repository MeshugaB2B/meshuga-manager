'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie, Legend
} from 'recharts'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// PilotageOverviewTab V3 — Analytics Meshuga (refonte mai 2026)
//
// Sources :
//   v_sales_daily_unified   : CA/tickets/panier/articles par jour
//                             (tickets détaillés <= 11/05 + Z reports >= 14/05)
//   v_sales_monthly_unified : agrégat mensuel unifié
//   v_sales_ytd_comparison  : comparatif année à date
//   v_sales_real_net        : CA net après commissions plateformes
//   v_sales_by_mode         : répartition sur place / emporter / livraison
//   v_sales_by_source       : Uber / Deliveroo / direct
//   v_sales_heatmap         : CA par jour-de-semaine x heure
//   v_sales_products_enriched : produits avec marge estimée
//
// Quotidien : alimenté auto par les Z de caisse.
// Mensuel   : complété au CSV Zelty détaillé.
// =============================================================================

var ROSE = '#FF82D7'
var JAUNE = '#FFEB5A'
var NOIR = '#191923'
var BLEU = '#005FFF'
var VERT = '#009D3A'
var ROUGE = '#CC0066'
var OR = '#B8920A'

var MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
var DOW_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function fmtEur(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20ac'
}
function fmtEurDec(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'
}
function fmtShort(v) {
  var n = Number(v) || 0
  if (n >= 1000000) return (n / 1000000).toFixed(2) + ' M\u20ac'
  if (n >= 1000) return (n / 1000).toFixed(1) + ' k\u20ac'
  return Math.round(n) + ' \u20ac'
}
function fmtInt(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  return Math.round(Number(v)).toLocaleString('fr-FR')
}
function deltaPct(cur, prev) {
  if (!prev || Number(prev) === 0) return null
  return ((Number(cur) - Number(prev)) / Number(prev)) * 100
}

export default function PilotageOverviewTab(props) {
  var toast = props.toast || function(){}

  var [loading, setLoading] = useState(true)
  var [daily, setDaily] = useState([])
  var [monthly, setMonthly] = useState([])
  var [ytd, setYtd] = useState([])
  var [net, setNet] = useState([])
  var [byMode, setByMode] = useState([])
  var [bySource, setBySource] = useState([])
  var [heatmap, setHeatmap] = useState([])
  var [products, setProducts] = useState([])
  var [isMobile, setIsMobile] = useState(false)

  var [dailyRange, setDailyRange] = useState(30)
  var [dailyMetric, setDailyMetric] = useState('ca_ttc')
  var [prodSort, setProdSort] = useState('marge')
  var [synthOpen, setSynthOpen] = useState(false)

  useEffect(function(){ loadData() }, [])
  useEffect(function() {
    function check() { setIsMobile(window.innerWidth <= 768) }
    check()
    window.addEventListener('resize', check)
    return function() { window.removeEventListener('resize', check) }
  }, [])

  function loadData() {
    setLoading(true)
    var c = sb()
    Promise.all([
      c.from('v_sales_daily_unified').select('*').order('date', { ascending: true }),
      c.from('v_sales_monthly_unified').select('*').order('year_month', { ascending: true }),
      c.from('v_sales_ytd_comparison').select('*').order('year', { ascending: false }),
      c.from('v_sales_real_net').select('*').order('year', { ascending: false }),
      c.from('v_sales_by_mode').select('*'),
      c.from('v_sales_by_source').select('*'),
      c.from('v_sales_heatmap').select('*'),
      c.from('sales_products_period').select('zelty_product_name, qte_total, ca_ttc, marge_brute, product_type')
    ]).then(function(r){
      setDaily(r[0].data || [])
      setMonthly(r[1].data || [])
      setYtd(r[2].data || [])
      setNet(r[3].data || [])
      setByMode(r[4].data || [])
      setBySource(r[5].data || [])
      setHeatmap(r[6].data || [])
      setProducts(r[7].data || [])
      setLoading(false)
    })
  }

  if (loading) {
    return <div style={{padding:40, textAlign:'center', color:'#888', fontSize:13, fontWeight:700}}>⏳ Chargement des analytics...</div>
  }

  var ytdCur = ytd.length > 0 ? ytd[0] : null
  var ytdPrev = ytd.length > 1 ? ytd[1] : null
  var caYtdDelta = ytdCur && ytdPrev ? deltaPct(ytdCur.ca_ttc_ytd, ytdPrev.ca_ttc_ytd) : null
  var tkYtdDelta = ytdCur && ytdPrev ? deltaPct(ytdCur.nb_tickets_ytd, ytdPrev.nb_tickets_ytd) : null
  var panierYtdDelta = ytdCur && ytdPrev ? deltaPct(ytdCur.panier_ytd, ytdPrev.panier_ytd) : null

  var netCur = net.length > 0 ? net[0] : null

  var dailyFiltered = dailyRange > 0 ? daily.slice(-dailyRange) : daily
  var dailyChartData = dailyFiltered.map(function(d) {
    var dt = new Date(d.date)
    return {
      date: dt.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'}),
      weekday: DOW_FR[dt.getDay()],
      value: Number(d[dailyMetric]) || 0,
      source: d.source
    }
  })
  var dailyVals = dailyChartData.map(function(d){ return d.value }).filter(function(v){ return v > 0 })
  var dailyAvg = dailyVals.length > 0 ? dailyVals.reduce(function(a,b){return a+b},0) / dailyVals.length : 0
  var metricMap = {
    ca_ttc: {label:'CA TTC', unit:'eur', color:ROSE},
    nb_tickets: {label:'Tickets', unit:'int', color:BLEU},
    panier_moyen: {label:'Panier moyen', unit:'eur', color:OR},
    nb_articles: {label:'Articles', unit:'int', color:VERT}
  }
  var dailyMetricConf = metricMap[dailyMetric]

  var monthlyByYear = {}
  monthly.forEach(function(m) {
    if (!monthlyByYear[m.year]) monthlyByYear[m.year] = {}
    monthlyByYear[m.year][m.month] = m
  })
  var years = Object.keys(monthlyByYear).map(Number).sort()
  var monthlyChartData = MONTHS_FR.map(function(mn, idx) {
    var row = { month: mn }
    years.forEach(function(y) {
      var mm = monthlyByYear[y] && monthlyByYear[y][idx + 1]
      row['y' + y] = mm ? Number(mm.ca_ttc) : null
    })
    return row
  })

  var curYear = ytdCur ? ytdCur.year : (years.length > 0 ? years[years.length - 1] : new Date().getFullYear())

  var modeAgg = {}
  byMode.filter(function(m){ return m.year === curYear }).forEach(function(m) {
    var k = m.mode || 'Autre'
    if (!modeAgg[k]) modeAgg[k] = 0
    modeAgg[k] += Number(m.ca_ttc) || 0
  })
  // Couleurs par mode — match insensible à la casse/accents (libellés FR ou clés techniques)
  var modeColor = function(label) {
    var s = (label || '').toLowerCase()
    if (s.indexOf('place') > -1) return ROSE
    if (s.indexOf('emporter') > -1 || s.indexOf('emport') > -1) return JAUNE
    if (s.indexOf('livraison') > -1 || s.indexOf('livr') > -1) return BLEU
    return '#888'
  }
  var modeData = Object.keys(modeAgg).map(function(k) {
    return { name: k, value: Math.round(modeAgg[k]), color: modeColor(k) }
  }).sort(function(a,b){ return b.value - a.value })

  var sourceAgg = {}
  bySource.filter(function(m){ return m.year === curYear }).forEach(function(m) {
    var s = m.source || 'Direct'
    if (!sourceAgg[s]) sourceAgg[s] = 0
    sourceAgg[s] += Number(m.ca_ttc) || 0
  })
  var sourcePalette = [NOIR, ROSE, JAUNE, BLEU, VERT, OR, ROUGE]
  var sourceData = Object.keys(sourceAgg).map(function(k, i) {
    return { name: k, value: Math.round(sourceAgg[k]), color: sourcePalette[i % sourcePalette.length] }
  }).sort(function(a,b){ return b.value - a.value })

  var heatGrid = {}
  var heatMax = 0
  heatmap.forEach(function(h) {
    var key = h.day_of_week + '_' + h.hour_of_day
    if (!heatGrid[key]) heatGrid[key] = 0
    heatGrid[key] += Number(h.ca_ttc) || 0
    if (heatGrid[key] > heatMax) heatMax = heatGrid[key]
  })
  var heatHours = []
  for (var hh = 9; hh <= 23; hh++) heatHours.push(hh)

  var prodAgg = {}
  products.forEach(function(p) {
    var name = p.zelty_product_name
    if (!name) return
    if (!prodAgg[name]) prodAgg[name] = { name: name, qte: 0, ca: 0, marge: 0 }
    prodAgg[name].qte += Number(p.qte_total) || 0
    prodAgg[name].ca += Number(p.ca_ttc) || 0
    prodAgg[name].marge += Number(p.marge_brute) || 0
  })
  var prodList = Object.keys(prodAgg).map(function(k){ return prodAgg[k] })
  var topByMarge = prodList.slice().sort(function(a,b){ return b.marge - a.marge }).slice(0, 10)
  var topByVolume = prodList.slice().sort(function(a,b){ return b.qte - a.qte }).slice(0, 10)
  var topProds = prodSort === 'marge' ? topByMarge : topByVolume

  var lastDataDate = daily.length > 0 ? new Date(daily[daily.length - 1].date).toLocaleDateString('fr-FR', {day:'2-digit', month:'long', year:'numeric'}) : '—'

  // ---- Synthèse automatique ----
  var synthLines = []
  // 1. Tendance CA YTD
  if (caYtdDelta !== null) {
    if (caYtdDelta >= 0) synthLines.push({icon:'📈', txt:'CA en hausse de ' + caYtdDelta.toFixed(1) + '% par rapport à l\'an dernier (année à date). Continue sur cette lancée.'})
    else synthLines.push({icon:'📉', txt:'CA en baisse de ' + Math.abs(caYtdDelta).toFixed(1) + '% vs l\'an dernier. À surveiller : regarde si c\'est lié à la météo, la concurrence ou les jours d\'ouverture.'})
  }
  // 2. Panier moyen
  if (panierYtdDelta !== null && Math.abs(panierYtdDelta) >= 2) {
    if (panierYtdDelta >= 0) synthLines.push({icon:'🛒', txt:'Panier moyen en progression (+' + panierYtdDelta.toFixed(1) + '%) : tes clients dépensent plus par commande.'})
    else synthLines.push({icon:'🛒', txt:'Panier moyen en recul (' + panierYtdDelta.toFixed(1) + '%) : pense à pousser les accompagnements / boissons / desserts en vente additionnelle.'})
  }
  // 3. Meilleur jour de semaine (via heatmap)
  var dowAgg = {}
  heatmap.forEach(function(h) {
    var d = h.day_of_week
    if (!dowAgg[d]) dowAgg[d] = 0
    dowAgg[d] += Number(h.ca_ttc) || 0
  })
  var bestDow = null; var bestDowVal = 0
  Object.keys(dowAgg).forEach(function(d) { if (dowAgg[d] > bestDowVal) { bestDowVal = dowAgg[d]; bestDow = d } })
  if (bestDow !== null) synthLines.push({icon:'📅', txt:'Ton meilleur jour est le ' + ({0:'dimanche',1:'lundi',2:'mardi',3:'mercredi',4:'jeudi',5:'vendredi',6:'samedi'}[bestDow]) + '. Assure-toi d\'avoir le staff et le stock en conséquence.'})
  // 4. Meilleure heure
  var hourAgg = {}
  heatmap.forEach(function(h) {
    var hr = h.hour_of_day
    if (!hourAgg[hr]) hourAgg[hr] = 0
    hourAgg[hr] += Number(h.ca_ttc) || 0
  })
  var bestHour = null; var bestHourVal = 0
  Object.keys(hourAgg).forEach(function(hr) { if (hourAgg[hr] > bestHourVal) { bestHourVal = hourAgg[hr]; bestHour = hr } })
  if (bestHour !== null) synthLines.push({icon:'⏰', txt:'Ton pic d\'activité est autour de ' + bestHour + 'h. Tout doit être prêt avant ce créneau.'})
  // 5. Mode dominant
  if (modeData.length > 0) {
    var totalMode = modeData.reduce(function(a,b){ return a + b.value }, 0)
    var dom = modeData[0]
    if (totalMode > 0) synthLines.push({icon:'🍽️', txt:'Ton canal n°1 est « ' + dom.name + ' » (' + Math.round(dom.value/totalMode*100) + '% du CA).'})
  }
  // 6. Top produit marge
  if (topByMarge.length > 0) {
    synthLines.push({icon:'🏆', txt:'Ton produit le plus rentable : ' + topByMarge[0].name.replace(/\?/g,'').trim() + '. Mets-le en avant.'})
  }

  return (
    <div>
      {/* HEADER */}
      <div className="ph">
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:38,lineHeight:1,color:ROSE}}>Analytics</div>
          <div style={{fontSize:11,opacity:0.55,marginTop:3,fontWeight:700}}>Vue stratégique · données jusqu&apos;au {lastDataDate}</div>
        </div>
      </div>

      {/* KPI YTD */}
      {ytdCur && (
        <div className="g4" style={{marginBottom:12}}>
          <KpiTile label="CA TTC (année à date)" value={fmtEur(ytdCur.ca_ttc_ytd)} delta={caYtdDelta} bg={ROSE} txt="#FFFFFF" />
          <KpiTile label="Tickets (YTD)" value={fmtInt(ytdCur.nb_tickets_ytd)} delta={tkYtdDelta} bg={JAUNE} txt={NOIR} />
          <KpiTile label="Panier moyen" value={fmtEurDec(ytdCur.panier_ytd)} delta={panierYtdDelta} bg="#FFFFFF" txt={NOIR} accent={ROSE} />
          <KpiTile label="Jours ouverts" value={fmtInt(ytdCur.jours_ouverts_ytd)} delta={null} bg="#FFFFFF" txt={NOIR} accent={OR} />
        </div>
      )}

      {/* CA NET RÉEL */}
      {netCur && (
        <div className="card" style={{background:'#F4FBF6', borderColor:VERT, borderWidth:2}}>
          <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            <span style={{fontSize:30}}>💸</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,color:VERT,lineHeight:1}}>CA net réel {curYear}</div>
              <div style={{fontSize:11,opacity:0.7,marginTop:3,fontWeight:700}}>Après déduction des commissions plateformes (~35% sur livraison)</div>
            </div>
            <div style={{display:'flex',gap:18,flexWrap:'wrap'}}>
              <MiniStat label="CA brut" value={fmtShort(netCur.ca_brut)} color={NOIR} />
              <MiniStat label="Dont livraison" value={fmtShort(netCur.ca_livraison_brut)} color={BLEU} />
              <MiniStat label="Commissions" value={'-' + fmtShort(netCur.commissions_estim)} color={ROUGE} />
              <MiniStat label="CA NET" value={fmtShort(netCur.ca_net_reel)} color={VERT} big />
            </div>
          </div>
        </div>
      )}

      {/* ÉVOLUTION QUOTIDIENNE */}
      <div className="card">
        <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:ROSE,lineHeight:1}}>Évolution quotidienne</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            <Toggle active={dailyRange===30} onClick={function(){ setDailyRange(30) }}>30 j</Toggle>
            <Toggle active={dailyRange===90} onClick={function(){ setDailyRange(90) }}>90 j</Toggle>
            <Toggle active={dailyRange===0} onClick={function(){ setDailyRange(0) }}>Tout</Toggle>
          </div>
        </div>
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          <Toggle active={dailyMetric==='ca_ttc'} onClick={function(){ setDailyMetric('ca_ttc') }} small>CA</Toggle>
          <Toggle active={dailyMetric==='nb_tickets'} onClick={function(){ setDailyMetric('nb_tickets') }} small>Tickets</Toggle>
          <Toggle active={dailyMetric==='panier_moyen'} onClick={function(){ setDailyMetric('panier_moyen') }} small>Panier</Toggle>
          <Toggle active={dailyMetric==='nb_articles'} onClick={function(){ setDailyMetric('nb_articles') }} small>Articles</Toggle>
        </div>
        <div style={{width:'100%',height:isMobile?200:280}}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyChartData} margin={{top:8,right:8,left:-12,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize:9,fontWeight:700}} interval="preserveStartEnd" stroke={NOIR} minTickGap={20} />
              <YAxis tick={{fontSize:9}} stroke={NOIR} tickFormatter={function(v){ return dailyMetricConf.unit==='eur' ? fmtShort(v) : Math.round(v) }} width={48} />
              <Tooltip
                contentStyle={{background:NOIR,border:'2px solid '+JAUNE,borderRadius:6,padding:'7px 11px'}}
                labelStyle={{color:JAUNE,fontWeight:900,fontSize:11}}
                itemStyle={{color:'#FFFFFF',fontWeight:900,fontSize:13}}
                formatter={function(v){ return [dailyMetricConf.unit==='eur'?fmtEurDec(v):fmtInt(v), dailyMetricConf.label] }}
                labelFormatter={function(l,p){ return (p && p[0] && p[0].payload ? p[0].payload.weekday+' ' : '') + l }}
                cursor={{fill:'rgba(255,235,90,0.2)'}}
              />
              {dailyAvg > 0 && <ReferenceLine y={dailyAvg} stroke={BLEU} strokeWidth={1.5} strokeDasharray="5 3" />}
              <Bar dataKey="value" radius={[3,3,0,0]} fill={dailyMetricConf.color}>
                {dailyChartData.map(function(e, i){
                  return <Cell key={i} fill={dailyMetricConf.color} fillOpacity={e.source === 'z' ? 1 : 0.55} />
                })}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:9,fontWeight:900,opacity:0.6,flexWrap:'wrap',gap:8}}>
          <span><span style={{display:'inline-block',width:10,height:8,background:dailyMetricConf.color,opacity:0.55,marginRight:3,verticalAlign:'middle',borderRadius:2}}></span>Détail Zelty</span>
          <span><span style={{display:'inline-block',width:10,height:8,background:dailyMetricConf.color,marginRight:3,verticalAlign:'middle',borderRadius:2}}></span>Z de caisse</span>
          <span><span style={{color:BLEU}}>┄</span> Moyenne {dailyMetricConf.unit==='eur'?fmtShort(dailyAvg):Math.round(dailyAvg)}</span>
        </div>
      </div>

      {/* CA MENSUEL PAR ANNÉE */}
      {years.length > 0 && (
        <div className="card">
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:ROSE,lineHeight:1,marginBottom:12}}>CA mensuel par année</div>
          <div style={{width:'100%',height:isMobile?220:300}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{top:8,right:8,left:-12,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" vertical={false} />
                <XAxis dataKey="month" tick={{fontSize:10,fontWeight:700}} stroke={NOIR} />
                <YAxis tick={{fontSize:9}} stroke={NOIR} tickFormatter={fmtShort} width={48} />
                <Tooltip
                  contentStyle={{background:NOIR,border:'2px solid '+JAUNE,borderRadius:6,padding:'7px 11px'}}
                  labelStyle={{color:JAUNE,fontWeight:900,fontSize:11}}
                  itemStyle={{fontWeight:900,fontSize:12}}
                  formatter={function(v, name){ return [fmtEur(v), String(name).replace('y','')] }}
                  cursor={{fill:'rgba(255,235,90,0.2)'}}
                />
                <Legend formatter={function(v){ return String(v).replace('y','') }} wrapperStyle={{fontSize:11,fontWeight:900}} />
                {years.map(function(y, i){
                  var palette = [JAUNE, BLEU, ROSE, VERT]
                  return <Bar key={y} dataKey={'y'+y} name={'y'+y} fill={palette[i % palette.length]} radius={[3,3,0,0]} stroke={NOIR} strokeWidth={1} />
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* RÉPARTITIONS */}
      <div className="g2">
        {modeData.length > 0 && (
          <div className="card">
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,color:ROSE,lineHeight:1,marginBottom:10}}>Par mode de vente</div>
            <DonutChart data={modeData} isMobile={isMobile} />
          </div>
        )}
        {sourceData.length > 0 && (
          <div className="card">
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,color:ROSE,lineHeight:1,marginBottom:10}}>Par canal / plateforme</div>
            <DonutChart data={sourceData} isMobile={isMobile} />
          </div>
        )}
      </div>

      {/* HEATMAP */}
      {heatmap.length > 0 && (
        <div className="card">
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:ROSE,lineHeight:1,marginBottom:4}}>Quand tu fais ton CA</div>
          <div style={{fontSize:11,opacity:0.55,marginBottom:12,fontWeight:700}}>Intensité du CA par jour et par heure (plus c&apos;est rose, plus tu vends)</div>
          <Heatmap grid={heatGrid} max={heatMax} hours={heatHours} />
        </div>
      )}

      {/* TOP PRODUITS */}
      {topProds.length > 0 && (
        <div className="card">
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:ROSE,lineHeight:1}}>Top produits</div>
            <div style={{display:'flex',gap:6}}>
              <Toggle active={prodSort==='marge'} onClick={function(){ setProdSort('marge') }} small>Par marge</Toggle>
              <Toggle active={prodSort==='volume'} onClick={function(){ setProdSort('volume') }} small>Par volume</Toggle>
            </div>
          </div>
          {topProds.map(function(p, i){
            var maxRef = prodSort === 'marge' ? (topProds[0].marge || 1) : (topProds[0].qte || 1)
            var val = prodSort === 'marge' ? p.marge : p.qte
            var pctBar = maxRef > 0 ? (val / maxRef) * 100 : 0
            return (
              <div key={p.name} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:3,gap:8}}>
                  <span style={{fontWeight:900,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',minWidth:0}}>
                    <span style={{display:'inline-block',width:20,opacity:0.4}}>{i+1}.</span>{p.name}
                  </span>
                  <span style={{whiteSpace:'nowrap',fontSize:12,fontWeight:900}}>
                    {prodSort==='marge' ? fmtEur(p.marge) : (fmtInt(p.qte) + ' u.')}
                    <span style={{fontSize:10,opacity:0.5,marginLeft:6,fontWeight:700}}>{prodSort==='marge' ? (fmtInt(p.qte)+' u.') : fmtEur(p.ca)}</span>
                  </span>
                </div>
                <div style={{height:10,background:'#EBEBEB',borderRadius:3,border:'1.5px solid '+NOIR,overflow:'hidden'}}>
                  <div style={{width:pctBar+'%',height:'100%',background: prodSort==='marge' ? VERT : ROSE}}></div>
                </div>
              </div>
            )
          })}
          <div style={{fontSize:10,opacity:0.5,marginTop:8,fontWeight:700,fontStyle:'italic'}}>
            Marge estimée = CA produit − food cost. Détail issu du dernier CSV Zelty mensuel.
          </div>
        </div>
      )}

      {/* ===== SYNTHÈSE / CONSEILS (dépliable) ===== */}
      {synthLines.length > 0 && (
        <div className="card" style={{background:NOIR, borderColor:JAUNE, padding:0, overflow:'hidden'}}>
          <div onClick={function(){ setSynthOpen(!synthOpen) }} style={{
            padding:'14px 18px', cursor:'pointer',
            display:'flex', alignItems:'center', gap:12
          }}>
            <span style={{fontSize:26}}>💡</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:JAUNE,lineHeight:1}}>Synthèse &amp; conseils</div>
              <div style={{fontSize:11,opacity:0.7,marginTop:3,fontWeight:700,color:'#FFFFFF'}}>
                {synthOpen ? 'Clique pour replier' : synthLines.length + ' insights basés sur tes données'}
              </div>
            </div>
            <span style={{fontSize:20,color:JAUNE,transition:'transform .2s',transform:synthOpen?'rotate(180deg)':'rotate(0deg)',display:'inline-block'}}>▾</span>
          </div>
          {synthOpen && (
            <div style={{padding:'4px 18px 18px', background:NOIR}}>
              {synthLines.map(function(line, i){
                return (
                  <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'9px 0',borderTop:'1px solid rgba(255,235,90,0.2)'}}>
                    <span style={{fontSize:18,flexShrink:0}}>{line.icon}</span>
                    <span style={{fontSize:13,lineHeight:1.45,color:'#FFFFFF',fontWeight:600}}>{line.txt}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// SOUS-COMPOSANTS
// =============================================================================

function KpiTile(props) {
  var bg = props.bg || '#FFFFFF'
  var txt = props.txt || NOIR
  var accent = props.accent
  var isPink = bg === ROSE
  var delta = props.delta
  var deltaStr = ''
  var deltaCol = txt
  if (delta !== null && delta !== undefined && !isNaN(Number(delta))) {
    var n = Number(delta)
    deltaStr = (n >= 0 ? '▲ +' : '▼ ') + n.toFixed(1) + '%'
    if (isPink) deltaCol = '#FFFFFF'
    else deltaCol = n >= 0 ? VERT : ROUGE
  }
  return (
    <div style={{background:bg,color:txt,border:'2px solid '+NOIR,borderRadius:7,padding:'12px 14px',boxShadow:'3px 3px 0 '+NOIR,position:'relative',overflow:'hidden'}}>
      {accent && <span style={{position:'absolute',left:0,top:0,bottom:0,width:5,background:accent}} />}
      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:13,lineHeight:1.1,color:isPink?'#FFFFFF':(accent||ROSE),opacity:isPink?0.95:1}}>{props.label}</div>
      <div style={{fontWeight:900,fontSize:24,marginTop:6,lineHeight:1,letterSpacing:-0.5}}>{props.value}</div>
      {deltaStr && <div style={{fontSize:11,fontWeight:900,marginTop:5,color:deltaCol}}>{deltaStr} vs N-1</div>}
    </div>
  )
}

function MiniStat(props) {
  return (
    <div style={{textAlign:'right'}}>
      <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:0.4,opacity:0.55}}>{props.label}</div>
      <div style={{fontWeight:900,fontSize:props.big?20:14,color:props.color,lineHeight:1.1,marginTop:2}}>{props.value}</div>
    </div>
  )
}

function Toggle(props) {
  var active = props.active
  return (
    <div onClick={props.onClick} style={{
      padding: props.small ? '4px 10px' : '5px 12px',
      fontSize: props.small ? 10 : 11, fontWeight:900,
      borderRadius:18, border:'2px solid '+NOIR,
      background: active ? ROSE : '#FFFFFF',
      color: active ? '#FFFFFF' : NOIR,
      cursor:'pointer', whiteSpace:'nowrap',
      boxShadow: active ? '2px 2px 0 '+NOIR : 'none',
      textTransform:'uppercase', letterSpacing:0.3, transition:'all .1s'
    }}>{props.children}</div>
  )
}

function DonutChart(props) {
  var data = props.data || []
  var total = data.reduce(function(a,b){ return a + b.value }, 0)
  return (
    <div>
      <div style={{width:'100%',height:props.isMobile?180:200}}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={props.isMobile?45:55} outerRadius={props.isMobile?70:85} paddingAngle={2} stroke={NOIR} strokeWidth={2}>
              {data.map(function(e, i){ return <Cell key={i} fill={e.color} /> })}
            </Pie>
            <Tooltip
              contentStyle={{background:NOIR,border:'2px solid '+JAUNE,borderRadius:6,padding:'6px 10px'}}
              itemStyle={{color:'#FFFFFF',fontWeight:900,fontSize:12}}
              formatter={function(v){ return [fmtEur(v) + ' (' + (total>0?Math.round(v/total*100):0) + '%)', ''] }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8,justifyContent:'center'}}>
        {data.map(function(e){
          return (
            <div key={e.name} style={{display:'flex',alignItems:'center',gap:4,fontSize:10}}>
              <span style={{width:10,height:10,background:e.color,border:'1.5px solid '+NOIR,borderRadius:2,display:'inline-block'}} />
              <span style={{fontWeight:900}}>{e.name}</span>
              <span style={{opacity:0.6}}>{total>0?Math.round(e.value/total*100):0}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Heatmap(props) {
  var grid = props.grid || {}
  var max = props.max || 1
  var hours = props.hours || []
  var dayOrder = [1, 2, 3, 4, 5, 6, 0]
  function cellColor(v) {
    if (!v || v === 0) return '#F7F7F7'
    var ratio = v / max
    if (ratio < 0.2) return '#FFF7D6'
    if (ratio < 0.4) return '#FFE9A8'
    if (ratio < 0.6) return '#FFD06B'
    if (ratio < 0.8) return '#FFA8D5'
    return ROSE
  }
  return (
    <div style={{overflowX:'auto'}}>
      <div style={{minWidth:520}}>
        <div style={{display:'grid',gridTemplateColumns:'40px repeat('+hours.length+', 1fr)',gap:2,marginBottom:2}}>
          <div></div>
          {hours.map(function(h){ return <div key={h} style={{fontSize:8,fontWeight:900,textAlign:'center',opacity:0.6}}>{h}h</div> })}
        </div>
        {dayOrder.map(function(dow){
          return (
            <div key={dow} style={{display:'grid',gridTemplateColumns:'40px repeat('+hours.length+', 1fr)',gap:2,marginBottom:2}}>
              <div style={{fontSize:9,fontWeight:900,display:'flex',alignItems:'center'}}>{DOW_FR[dow]}</div>
              {hours.map(function(h){
                var v = grid[dow + '_' + h] || 0
                return (
                  <div key={h} title={DOW_FR[dow]+' '+h+'h : '+fmtEur(v)} style={{
                    aspectRatio:'1', background:cellColor(v),
                    border:'1px solid '+(v>0?'rgba(25,25,35,0.15)':'#EEE'),
                    borderRadius:2, minHeight:18
                  }}></div>
                )
              })}
            </div>
          )
        })}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginTop:10,fontSize:9,fontWeight:900,opacity:0.7}}>
        <span>Moins</span>
        <span style={{width:14,height:14,background:'#FFF7D6',border:'1px solid #DDD',borderRadius:2}}></span>
        <span style={{width:14,height:14,background:'#FFD06B',border:'1px solid #DDD',borderRadius:2}}></span>
        <span style={{width:14,height:14,background:'#FFA8D5',border:'1px solid #DDD',borderRadius:2}}></span>
        <span style={{width:14,height:14,background:ROSE,border:'1px solid #DDD',borderRadius:2}}></span>
        <span>Plus</span>
      </div>
    </div>
  )
}
