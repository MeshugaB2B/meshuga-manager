'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

// =============================================================================
// KpiHistoryModal v2 — Historique 30 jours d'un KPI Z de caisse
// Source : daily_z_reports
// Graph : recharts BarChart + ReferenceLine pour la moyenne
//
// Props :
//   kpi        : 'ca_ttc' | 'nb_tickets' | 'ticket_moyen' | 'nb_couverts' | 'ca_ht'
//   label      : 'CA TTC' | 'Tickets' | 'Panier moyen' | ...
//   unit       : 'eur' | 'int'
//   accentColor: couleur dominante de la courbe (par défaut rose Meshuga)
//   onClose    : function
// =============================================================================

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

var FMT = function(v, unit) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  if (unit === 'eur') return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' \u20ac'
  return Math.round(Number(v)).toLocaleString('fr-FR')
}
var FMT_DEC = function(v, unit) {
  if (v === null || v === undefined || isNaN(Number(v))) return '--'
  if (unit === 'eur') return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'
  return Math.round(Number(v)).toLocaleString('fr-FR')
}
var FMT_DATE_SHORT = function(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
var FMT_DATE_LONG = function(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
}
var FMT_WEEKDAY = function(iso) {
  if (!iso) return ''
  var d = new Date(iso)
  var w = d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return w.charAt(0).toUpperCase() + w.slice(1)
}

export default function KpiHistoryModal(props) {
  var kpi = props.kpi || 'ca_ttc'
  var label = props.label || 'KPI'
  var unit = props.unit || 'eur'
  var accent = props.accentColor || '#FF82D7'
  var onClose = props.onClose || function(){}

  var [rows, setRows] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    sb().from('daily_z_reports')
      .select('z_date, ca_ttc, ca_ht, nb_tickets, nb_couverts, ticket_moyen')
      .order('z_date', { ascending: false })
      .limit(30)
      .then(function(res) {
        var data = (res.data || []).slice().reverse()
        setRows(data)
        setLoading(false)
      })
  }, [kpi])

  // Compute series for chart
  var vals = rows.map(function(r) { return Number(r[kpi]) || 0 })
  var validVals = vals.filter(function(v) { return v > 0 })
  var min = validVals.length > 0 ? Math.min.apply(null, validVals) : 0
  var max = vals.length > 0 ? Math.max.apply(null, vals) : 0
  var avg = validVals.length > 0 ? (validVals.reduce(function(a, b) { return a + b }, 0) / validVals.length) : 0

  // Data pour Recharts
  var chartData = rows.map(function(r, idx) {
    return {
      date: FMT_DATE_SHORT(r.z_date),
      dateFull: FMT_DATE_LONG(r.z_date),
      weekday: FMT_WEEKDAY(r.z_date),
      value: Number(r[kpi]) || 0,
      isToday: idx === rows.length - 1,
      isWeekAgo: idx === rows.length - 8
    }
  })

  // Comparisons
  var todayVal = rows.length > 0 ? Number(rows[rows.length-1][kpi]) || 0 : 0
  var weekAgoVal = rows.length >= 8 ? Number(rows[rows.length-8][kpi]) || 0 : 0
  var caJ7 = weekAgoVal > 0 ? ((todayVal - weekAgoVal) / weekAgoVal) * 100 : null
  var caVsAvg = avg > 0 ? ((todayVal - avg) / avg) * 100 : null

  // Titre dynamique selon le KPI
  var graphTitle = 'Évolution sur 30 jours'
  if (kpi === 'ca_ttc') graphTitle = 'Évolution du CA TTC'
  else if (kpi === 'nb_tickets') graphTitle = 'Évolution du nombre de tickets'
  else if (kpi === 'ticket_moyen') graphTitle = 'Évolution du panier moyen'
  else if (kpi === 'nb_couverts') graphTitle = 'Évolution du nombre de couverts'

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={function(e) { e.stopPropagation() }}>
        <div className="mh" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,background:'#FFFFFF'}}>
          <div>
            <div className="mt" style={{color:'#191923'}}>{label}</div>
            <div style={{fontSize:11,opacity:0.6,marginTop:2,fontWeight:700}}>{rows.length} Z de caisse</div>
          </div>
          <button className="btn btn-sm" onClick={onClose} style={{flexShrink:0}}>✕</button>
        </div>

        <div className="mb">
          {loading && (
            <div style={{padding:'30px',textAlign:'center',color:'#888',fontSize:12}}>⏳ Chargement...</div>
          )}

          {!loading && rows.length === 0 && (
            <div style={{padding:'20px',textAlign:'center',color:'#888'}}>Aucune donnée disponible.</div>
          )}

          {!loading && rows.length > 0 && (
            <div>
              {/* Stats */}
              <div className="g4" style={{marginBottom:14}}>
                <StatBox label="Auj." value={FMT_DEC(todayVal, unit)} accent={accent} />
                <StatBox label="vs J-7" value={caJ7 !== null ? ((caJ7 >= 0 ? '+' : '') + caJ7.toFixed(1) + ' %') : '—'} accent={caJ7 !== null && caJ7 < 0 ? '#CC0066' : '#009D3A'} />
                <StatBox label="Moyenne" value={FMT_DEC(avg, unit)} accent="#005FFF" />
                <StatBox label="vs Moy." value={caVsAvg !== null ? ((caVsAvg >= 0 ? '+' : '') + caVsAvg.toFixed(1) + ' %') : '—'} accent={caVsAvg !== null && caVsAvg < 0 ? '#CC0066' : '#009D3A'} />
              </div>

              {/* Graph en barres recharts */}
              <div style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:7,padding:'14px 14px 8px',boxShadow:'3px 3px 0 #191923',marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8,flexWrap:'wrap',gap:8}}>
                  <span style={{fontFamily:"'Yellowtail',cursive",fontSize:18,color:'#FF82D7'}}>{graphTitle}</span>
                  <span style={{fontSize:10,opacity:0.6,fontWeight:900}}>
                    <span style={{color:'#005FFF'}}>━━</span> Moyenne {FMT_DEC(avg, unit)}
                    <span style={{marginLeft:8}}>· Min {FMT(min, unit)}</span>
                    <span style={{marginLeft:6}}>· Max {FMT(max, unit)}</span>
                  </span>
                </div>
                <div style={{width:'100%',height:280}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{top: 10, right: 8, left: -10, bottom: 0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EBEBEB" vertical={false} />
                      <XAxis dataKey="date" tick={{fontSize: 10, fontWeight: 700}} interval="preserveStartEnd" stroke="#191923" />
                      <YAxis tick={{fontSize: 10}} stroke="#191923" tickFormatter={function(v){ return unit === 'eur' ? (Math.round(v) + '\u00a0€') : Math.round(v) }} />
                      <Tooltip
                        contentStyle={{background:'#191923',border:'2px solid #FFEB5A',borderRadius:6,boxShadow:'3px 3px 0 #FFEB5A',padding:'8px 12px'}}
                        labelStyle={{color:'#FFEB5A',fontWeight:900,fontSize:11,textTransform:'uppercase'}}
                        itemStyle={{color:'#FFFFFF',fontWeight:900,fontSize:13}}
                        formatter={function(value){ return [FMT_DEC(value, unit), label] }}
                        labelFormatter={function(label, payload){
                          if (payload && payload.length > 0 && payload[0].payload) {
                            return payload[0].payload.weekday + ' ' + label
                          }
                          return label
                        }}
                        cursor={{fill: 'rgba(255,235,90,0.25)'}}
                      />
                      {avg > 0 && <ReferenceLine y={avg} stroke="#005FFF" strokeWidth={2} strokeDasharray="5 3" />}
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {chartData.map(function(entry, idx) {
                          var color = accent
                          if (entry.isToday) color = '#191923'
                          else if (entry.isWeekAgo) color = '#005FFF'
                          return <Cell key={idx} fill={color} />
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:14,marginTop:4,fontSize:10,fontWeight:900,opacity:0.7,flexWrap:'wrap'}}>
                  <span><span style={{display:'inline-block',width:10,height:10,background:accent,marginRight:4,verticalAlign:'middle',borderRadius:2,border:'1px solid #191923'}}></span>Jour</span>
                  <span><span style={{display:'inline-block',width:10,height:10,background:'#005FFF',marginRight:4,verticalAlign:'middle',borderRadius:2,border:'1px solid #191923'}}></span>J-7</span>
                  <span><span style={{display:'inline-block',width:10,height:10,background:'#191923',marginRight:4,verticalAlign:'middle',borderRadius:2,border:'1px solid #FFEB5A'}}></span>Veille</span>
                </div>
              </div>

              {/* Tableau détaillé */}
              <div style={{maxHeight:'30vh',overflowY:'auto',border:'2px solid #191923',borderRadius:6}}>
                <div style={{display:'grid',gridTemplateColumns:'56px 1fr 1fr 1fr',gap:8,padding:'9px 12px',background:'#FFEB5A',borderBottom:'2px solid #191923',fontWeight:900,fontSize:10,textTransform:'uppercase',letterSpacing:0.5,position:'sticky',top:0,zIndex:1}}>
                  <span>Jour</span>
                  <span>Date</span>
                  <span style={{textAlign:'right'}}>Valeur</span>
                  <span style={{textAlign:'right'}}>vs Moy.</span>
                </div>
                {rows.slice().reverse().map(function(r, idx) {
                  var v = Number(r[kpi]) || 0
                  var deltaPct = avg > 0 ? ((v - avg) / avg) * 100 : 0
                  var deltaColor = deltaPct >= 0 ? '#009D3A' : '#CC0066'
                  return (
                    <div key={r.z_date} style={{display:'grid',gridTemplateColumns:'56px 1fr 1fr 1fr',gap:8,padding:'8px 12px',borderBottom:'1px solid #EBEBEB',fontSize:11,alignItems:'center',background: idx === 0 ? 'rgba(255,130,215,0.10)' : 'transparent'}}>
                      <span style={{fontWeight:900,textTransform:'uppercase',fontSize:10,opacity:0.6}}>{FMT_WEEKDAY(r.z_date)}</span>
                      <span>{FMT_DATE_SHORT(r.z_date)}{idx === 0 ? ' · Auj.' : ''}</span>
                      <span style={{textAlign:'right',fontWeight:900}}>{FMT_DEC(v, unit)}</span>
                      <span style={{textAlign:'right',fontWeight:900,color:deltaColor,fontSize:11}}>{(deltaPct >= 0 ? '+' : '') + deltaPct.toFixed(0) + ' %'}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox(props) {
  return (
    <div style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:6,padding:'8px 10px',boxShadow:'2px 2px 0 #191923',minWidth:0}}>
      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:13,color:props.accent || '#FF82D7',lineHeight:1}}>{props.label}</div>
      <div style={{fontWeight:900,fontSize:16,marginTop:3,lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{props.value}</div>
    </div>
  )
}
