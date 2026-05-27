'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// =============================================================================
// KpiHistoryModal — Historique d'un KPI sur 30 jours
// Source : daily_z_reports
//
// Props :
//   kpi        : 'ca_ttc' | 'nb_tickets' | 'ticket_moyen' | 'nb_couverts' | 'ca_ht'
//   label      : 'CA TTC', 'Tickets', 'Panier moyen', etc.
//   unit       : 'eur' | 'int'
//   accentColor: couleur dominante de la courbe
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
  if (unit === 'eur') return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac'
  return Math.round(Number(v)).toLocaleString('fr-FR')
}
var FMT_DATE_SHORT = function(iso) {
  if (!iso) return '--'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
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
      .select('z_date, ca_ttc, ca_ht, nb_tickets, nb_couverts, ticket_moyen, canaux')
      .order('z_date', { ascending: false })
      .limit(30)
      .then(function(res) {
        var data = (res.data || []).slice().reverse() // chronological order
        setRows(data)
        setLoading(false)
      })
  }, [kpi])

  // Computations
  var vals = rows.map(function(r) { return Number(r[kpi]) || 0 })
  var min = vals.length > 0 ? Math.min.apply(null, vals.filter(function(v){return v>0})) || 0 : 0
  var max = vals.length > 0 ? Math.max.apply(null, vals) : 0
  var avg = vals.length > 0 ? (vals.reduce(function(a,b){return a+b},0) / vals.length) : 0
  var span = max - min || 1

  // SVG points
  var points = rows.map(function(r, idx) {
    var x = rows.length > 1 ? (idx / (rows.length - 1)) * 100 : 50
    var v = Number(r[kpi]) || 0
    var y = 100 - ((v - min) / span) * 100
    return {x: x, y: y, val: v, date: r.z_date}
  })

  // Comparisons
  var todayVal = rows.length > 0 ? Number(rows[rows.length-1][kpi]) || 0 : 0
  var weekAgoVal = rows.length >= 8 ? Number(rows[rows.length-8][kpi]) || 0 : 0
  var monthAgoVal = rows.length >= 30 ? Number(rows[0][kpi]) || 0 : (rows.length > 0 ? Number(rows[0][kpi]) || 0 : 0)

  var caJ7 = weekAgoVal > 0 ? ((todayVal - weekAgoVal) / weekAgoVal) * 100 : null
  var caJ30 = monthAgoVal > 0 && rows.length >= 30 ? ((todayVal - monthAgoVal) / monthAgoVal) * 100 : null

  // Bar chart bars
  var barCount = rows.length
  var barWidth = barCount > 0 ? (100 / barCount) - 0.5 : 1
  var avgY = avg > 0 ? (50 - ((avg - min) / span) * 50) : null

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={function(e) { e.stopPropagation() }}>
        <div className="mh" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <div>
            <div className="mt">{label} · Historique 30 jours</div>
            <div style={{fontSize:11,opacity:0.7,marginTop:2,fontWeight:700}}>{rows.length} Z de caisse</div>
          </div>
          <button className="btn btn-sm" onClick={onClose} style={{flexShrink:0}}>✕</button>
        </div>

        <div className="mb">
          {loading && (
            <div style={{padding:'30px',textAlign:'center',color:'#888',fontSize:12}}>Chargement...</div>
          )}

          {!loading && rows.length === 0 && (
            <div style={{padding:'20px',textAlign:'center',color:'#888'}}>Aucune donnée disponible.</div>
          )}

          {!loading && rows.length > 0 && (
            <div>
              {/* Stats */}
              <div className="g4" style={{marginBottom:14}}>
                <StatBox label="Auj." value={FMT(todayVal, unit)} accent={accent} />
                <StatBox label="vs J-7" value={caJ7 !== null ? ((caJ7 >= 0 ? '+' : '') + caJ7.toFixed(1) + ' %') : '—'} accent={caJ7 !== null && caJ7 < 0 ? '#CC0066' : '#009D3A'} />
                <StatBox label="Moyenne" value={FMT(avg, unit)} accent="#191923" />
                <StatBox label="Max période" value={FMT(max, unit)} accent="#B8920A" />
              </div>

              {/* SVG Bar chart */}
              <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:6,padding:'14px 18px 4px',boxShadow:'3px 3px 0 #191923',marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:8}}>
                  <span style={{fontFamily:"'Yellowtail',cursive",fontSize:14,color:'#FF82D7'}}>Évolution {label.toLowerCase()}</span>
                  <span style={{fontSize:10,opacity:0.6,fontWeight:900}}>Min {FMT(min, unit)} · Max {FMT(max, unit)}</span>
                </div>
                <svg viewBox="0 0 100 50" style={{width:'100%',height:200,overflow:'visible'}} preserveAspectRatio="none">
                  {/* Grid */}
                  <line x1="0" y1="0" x2="100" y2="0" stroke="#191923" strokeWidth="0.15" strokeDasharray="0.5,0.5" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="25" x2="100" y2="25" stroke="#191923" strokeWidth="0.15" strokeDasharray="0.5,0.5" vectorEffect="non-scaling-stroke" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#191923" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
                  {/* Average line */}
                  {avgY !== null && (
                    <line x1="0" y1={avgY} x2="100" y2={avgY} stroke="#005FFF" strokeWidth="0.4" strokeDasharray="1,1" vectorEffect="non-scaling-stroke" />
                  )}
                  {/* Bars */}
                  {points.map(function(p, idx) {
                    var barX = barCount > 1 ? (idx / barCount) * 100 + 0.5 : 0
                    var bw = barCount > 0 ? (100 / barCount) - 1 : 1
                    var barH = p.val > 0 ? ((p.val - min) / span) * 50 : 0
                    var fillColor = accent
                    // Highlight today and J-7
                    if (idx === points.length - 1) fillColor = '#191923'
                    else if (idx === points.length - 8) fillColor = '#005FFF'
                    return (
                      <rect key={idx} x={barX} y={50 - barH} width={bw > 0 ? bw : 1} height={barH > 0 ? barH : 0} fill={fillColor} vectorEffect="non-scaling-stroke">
                        <title>{FMT_DATE_SHORT(p.date) + ' (' + FMT_WEEKDAY(p.date) + ') : ' + FMT(p.val, unit)}</title>
                      </rect>
                    )
                  })}
                </svg>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:9,fontWeight:900,opacity:0.6}}>
                  <span>{points.length > 0 ? FMT_DATE_SHORT(points[0].date) : ''}</span>
                  <span style={{color:'#005FFF'}}>● J-7</span>
                  <span style={{color:'#191923'}}>● Veille</span>
                  <span>{points.length > 0 ? FMT_DATE_SHORT(points[points.length-1].date) : ''}</span>
                </div>
              </div>

              {/* Tableau détaillé */}
              <div style={{maxHeight:'30vh',overflowY:'auto',border:'2px solid #191923',borderRadius:6}}>
                <div style={{display:'grid',gridTemplateColumns:'50px 1fr 1fr 1fr',gap:8,padding:'8px 10px',background:'#FFEB5A',borderBottom:'2px solid #191923',fontWeight:900,fontSize:10,textTransform:'uppercase',letterSpacing:0.5,position:'sticky',top:0,zIndex:1}}>
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
                    <div key={r.z_date} style={{display:'grid',gridTemplateColumns:'50px 1fr 1fr 1fr',gap:8,padding:'7px 10px',borderBottom:'1px solid #EBEBEB',fontSize:11,alignItems:'center',background: idx === 0 ? 'rgba(255,130,215,0.08)' : 'transparent'}}>
                      <span style={{fontWeight:900,textTransform:'uppercase',fontSize:10,opacity:0.6}}>{FMT_WEEKDAY(r.z_date)}</span>
                      <span>{FMT_DATE_SHORT(r.z_date)}{idx === 0 ? ' · Auj.' : ''}</span>
                      <span style={{textAlign:'right',fontWeight:900}}>{FMT(v, unit)}</span>
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
      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:11,color:props.accent || '#FF82D7',lineHeight:1}}>{props.label}</div>
      <div style={{fontWeight:900,fontSize:15,marginTop:3,lineHeight:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{props.value}</div>
    </div>
  )
}
