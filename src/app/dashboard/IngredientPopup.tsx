'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

export default function IngredientPopup(props) {
  var ing = props.ing
  var onClose = props.onClose
  var [history, setHistory] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    if (!ing) return
    setLoading(true)
    sb().from('products').select('id, name, current_price, unit, supplier_id').then(function(pRes) {
      var all = pRes.data || []
      var iLow = (ing.article || '').toLowerCase()
      var match = all.find(function(p) {
        var pL = p.name.toLowerCase()
        return pL === iLow || pL.indexOf(iLow) > -1 || iLow.indexOf(pL) > -1
      })
      if (match) {
        sb().from('product_prices').select('price, invoice_date, invoice_filename').eq('product_id', match.id).order('invoice_date', {ascending: true}).then(function(ppRes) {
          setHistory(ppRes.data || [])
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })
  }, [ing])

  if (!ing) return null

  var lastPrice = history.length > 0 ? Number(history[history.length - 1].price) : null
  var refPrice = Number(ing.prix_achat) || 0
  var pct = refPrice > 0 && lastPrice ? ((lastPrice - refPrice) / refPrice * 100) : 0

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#fff',borderRadius:12,border:'2px solid #FF82D7',padding:20,maxWidth:480,width:'100%',maxHeight:'80vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923'}}>{ing.article}</div>
            <div style={{fontSize:12,color:'#FF82D7',fontWeight:700}}>{ing.fournisseur} · {ing.qte} {ing.unite} par recette</div>
          </div>
          <button onClick={onClose} style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>✕</button>
        </div>

        {loading ? (
          <div style={{padding:20,textAlign:'center',color:'#888'}}>Chargement...</div>
        ) : (
          <div>
            <div style={{display:'flex',gap:12,marginTop:16}}>
              <div style={{flex:1,background:'#FFF9D0',borderRadius:8,padding:12,textAlign:'center'}}>
                <div style={{fontSize:10,color:'#888'}}>Prix ref.</div>
                <div style={{fontSize:20,fontWeight:900}}>{refPrice.toFixed(2)} €</div>
                <div style={{fontSize:10,color:'#888'}}>/{ing.unite}</div>
              </div>
              {lastPrice !== null && (
                <div style={{flex:1,background:lastPrice > refPrice ? '#FFE0E0' : '#E8FFE8',borderRadius:8,padding:12,textAlign:'center'}}>
                  <div style={{fontSize:10,color:'#888'}}>Dernier facturé</div>
                  <div style={{fontSize:20,fontWeight:900}}>{lastPrice.toFixed(2)} €</div>
                  <div style={{fontSize:10,color:'#888'}}>/{ing.unite}</div>
                </div>
              )}
              {lastPrice !== null && (
                <div style={{flex:1,background:pct > 0 ? '#CC0066' : '#009D3A',borderRadius:8,padding:12,textAlign:'center'}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.7)'}}>Variation</div>
                  <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</div>
                </div>
              )}
            </div>

            <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:16,marginBottom:4}}>Évolution du prix</div>
            {history.length >= 2 ? (function() {
              var vals = history.map(function(h) { return Number(h.price) })
              var minV = Math.min.apply(null, vals) * 0.9
              var maxV = Math.max.apply(null, vals) * 1.1
              var range = maxV - minV || 1
              var w = 400
              var h = 160
              var pad = 40
              var chartW = w - pad * 2
              var chartH = h - pad * 2
              var points = history.map(function(p, i) {
                var x = pad + (i / (history.length - 1)) * chartW
                var y = pad + chartH - ((Number(p.price) - minV) / range) * chartH
                return {x: x, y: y, price: Number(p.price), date: p.invoice_date}
              })
              var polyStr = points.map(function(p) { return p.x + ',' + p.y }).join(' ')
              var areaStr = polyStr + ' ' + (pad + chartW) + ',' + (pad + chartH) + ' ' + pad + ',' + (pad + chartH)
              var first = vals[0]
              var last = vals[vals.length - 1]
              var trending = last > first ? '#CC0066' : '#009D3A'
              return (
                <svg viewBox={"0 0 " + w + " " + h} style={{width:'100%',height:'auto',marginTop:8}}>
                  <polygon points={areaStr} fill={trending} opacity="0.1" />
                  <polyline points={polyStr} fill="none" stroke={trending} strokeWidth="2.5" />
                  {points.map(function(p, i) {
                    var d = new Date(p.date)
                    var label = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'})
                    return (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#FFEB5A" stroke="#191923" strokeWidth="2" />
                        <text x={p.x} y={p.y - 10} textAnchor="middle" style={{fontSize:9,fontWeight:900,fill:'#191923',fontFamily:'Arial Narrow'}}>{p.price.toFixed(2)}</text>
                        <text x={p.x} y={h - 4} textAnchor="middle" style={{fontSize:8,fill:'#888',fontFamily:'Arial Narrow'}}>{label}</text>
                      </g>
                    )
                  })}
                </svg>
              )
            })() : <div style={{fontSize:12,color:'#888'}}>Pas encore d'historique — uploadez des factures</div>}

            <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:16,marginBottom:4}}>Historique factures</div>
            {history.length > 0 ? history.slice().reverse().map(function(ph, i) {
              var prev = i < history.length - 1 ? history[history.length - 2 - i] : null
              var diff = prev ? ((Number(ph.price) - Number(prev.price)) / Number(prev.price) * 100) : 0
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid #F5F5F5',alignItems:'center'}}>
                  <span style={{fontWeight:700,minWidth:80}}>{new Date(ph.invoice_date).toLocaleDateString('fr-FR')}</span>
                  <span style={{fontWeight:900}}>{Number(ph.price).toFixed(2)} €/{ing.unite}</span>
                  {prev ? <span style={{fontWeight:900,color:diff > 0 ? '#CC0066' : diff < 0 ? '#009D3A' : '#888'}}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</span> : <span style={{color:'#888'}}>—</span>}
                  {ph.invoice_filename && <span style={{fontSize:10,color:'#888'}}>{ph.invoice_filename}</span>}
                </div>
              )
            }) : <div style={{fontSize:12,color:'#888'}}>Aucune facture</div>}
          </div>
        )}
      </div>
    </div>
  )
}
