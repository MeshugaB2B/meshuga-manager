'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RECIPES_DATA } from './data'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

export default function FoodCostAlertsWidget() {
  var [changes, setChanges] = useState([])
  var [loading, setLoading] = useState(true)
  var [selectedItem, setSelectedItem] = useState(null)
  var [priceHistory, setPriceHistory] = useState([])

  useEffect(function() { loadChanges() }, [])

  function getRecipesForProduct(productName) {
    var found = []
    RECIPES_DATA.forEach(function(r) {
      if (!r.ingredients) return
      r.ingredients.forEach(function(ing) {
        var ingName = (ing.article || '').toLowerCase()
        var pName = productName.toLowerCase()
        if (ingName === pName || ingName.indexOf(pName) > -1 || pName.indexOf(ingName) > -1) {
          if (!found.find(function(f) { return f.name === r.name })) {
            found.push({name: r.name, foodCostPct: r.foodCostPct || 0, prixHT: r.prixHT || 0})
          }
        }
      })
    })
    return found
  }

  function loadChanges() {
    Promise.all([
      sb().from('products').select('id, name, unit, current_price, supplier_id, category'),
      sb().from('product_prices').select('product_id, price, invoice_date').order('invoice_date', {ascending: false}),
      sb().from('suppliers').select('id, name, archived')
    ]).then(function(results) {
      var products = results[0].data || []
      var prices = results[1].data || []
      var suppliers = results[2].data || []
      var supMap = {}
      suppliers.filter(function(s) { return !s.archived }).forEach(function(s) { supMap[s.id] = s.name })

      var allChanges = []
      products.forEach(function(p) {
        if (!supMap[p.supplier_id]) return
        if (p.category !== 'ingredient') return
        var pp = prices.filter(function(pr) { return pr.product_id === p.id })
        if (pp.length < 2) return
        var latest = pp[0]
        var previous = pp[1]
        var changePct = previous.price > 0 ? ((latest.price - previous.price) / previous.price * 100) : 0
        if (Math.abs(changePct) < 0.5) return
        var recipes = getRecipesForProduct(p.name)
        allChanges.push({
          id: p.id, name: p.name, supplier: supMap[p.supplier_id], unit: p.unit,
          oldPrice: Number(previous.price), newPrice: Number(latest.price),
          changePct: changePct, lastDate: latest.invoice_date, prevDate: previous.invoice_date,
          recipes: recipes, allPrices: pp
        })
      })
      allChanges.sort(function(a, b) { return b.changePct - a.changePct })
      setChanges(allChanges)
      setLoading(false)
    })
  }

  function openDetail(item) {
    setSelectedItem(item)
    sb().from('product_prices').select('price, invoice_date')
      .eq('product_id', item.id).order('invoice_date', {ascending: true})
      .then(function(r) { setPriceHistory(r.data || []) })
  }

  function createTask(item) {
    var title = 'Renégocier ' + item.name + ' (+' + Math.abs(item.changePct).toFixed(0) + '%) — ' + item.supplier
    sb().from('tasks').insert({
      title: title, status: 'todo', priority: 'high',
      deadline: new Date().toISOString().split('T')[0]
    }).then(function() {
      fetch('https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title: '🔴 Hausse prix — ' + item.name,
          body: item.supplier + ': ' + item.oldPrice.toFixed(2) + ' → ' + item.newPrice.toFixed(2) + ' €/' + item.unit + ' (+' + Math.abs(item.changePct).toFixed(0) + '%) — Tâche créée',
          target: 'all'
        })
      }).catch(function(){})
      alert('Tâche créée + notification envoyée')
    })
  }

  function renderChart(history) {
    if (!history || history.length < 2) return null
    var vals = history.map(function(h) { return Number(h.price) })
    var minV = Math.min.apply(null, vals) * 0.9
    var maxV = Math.max.apply(null, vals) * 1.1
    var range = maxV - minV || 1
    var w = 400, h = 160, pad = 40
    var chartW = w - pad * 2, chartH = h - pad * 2
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
      <svg viewBox={"0 0 " + w + " " + h} style={{width:'100%',height:'auto',marginTop:12}}>
        <polygon points={areaStr} fill={trending} opacity="0.1" />
        <polyline points={polyStr} fill="none" stroke={trending} strokeWidth="2.5" />
        {points.map(function(p, i) {
          var d = new Date(p.date)
          var label = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'})
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="5" fill="#FFEB5A" stroke="#191923" strokeWidth="2" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" style={{fontSize:9,fontWeight:900,fill:'#191923',fontFamily:'Arial Narrow'}}>{p.price.toFixed(2)}€</text>
              <text x={p.x} y={h - 4} textAnchor="middle" style={{fontSize:8,fill:'#888',fontFamily:'Arial Narrow'}}>{label}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  if (loading) return null

  var hausse = changes.filter(function(c) { return c.changePct > 0 }).slice(0, 10)
  var baisse = changes.filter(function(c) { return c.changePct < 0 }).slice(0, 10)

  return (
    <div style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923',marginBottom:4}}>📊 Suivi des prix d'achat</div>
      <div style={{fontSize:11,color:'#888',marginBottom:12}}>{hausse.length} hausse{hausse.length !== 1 ? 's' : ''} · {baisse.length} baisse{baisse.length !== 1 ? 's' : ''} · dernière analyse factures</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <div style={{fontWeight:900,fontSize:12,color:'#CC0066',textTransform:'uppercase',marginBottom:6,letterSpacing:0.5}}>▲ Hausses</div>
          {hausse.length === 0 && <div style={{fontSize:12,color:'#888',padding:8}}>Aucune hausse détectée</div>}
          {hausse.map(function(h, i) {
            var bg = h.changePct > 15 ? '#FFE0E0' : h.changePct > 5 ? '#FFF0E0' : '#FFF9D0'
            var borderColor = h.changePct > 15 ? '#CC0066' : h.changePct > 5 ? '#E67300' : '#B8920A'
            return (
              <div key={i} onClick={function(){openDetail(h)}} style={{background:bg,border:'1px solid ' + borderColor,borderRadius:8,padding:'8px 10px',marginBottom:6,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:900,fontSize:13}}>{h.name}</div>
                    <div style={{fontSize:10,color:'#888'}}>{h.supplier}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:14,fontWeight:900,color:borderColor}}>+{h.changePct.toFixed(1)}%</div>
                    <div style={{fontSize:10,color:'#888'}}>{h.oldPrice.toFixed(2)} → {h.newPrice.toFixed(2)} €/{h.unit}</div>
                  </div>
                </div>
                {h.recipes.length > 0 && (
                  <div style={{marginTop:4}}>
                    {h.recipes.slice(0, 3).map(function(r) {
                      return <span key={r.name} style={{display:'inline-block',padding:'1px 6px',borderRadius:8,fontSize:8,fontWeight:900,margin:1,background:'#FFF',color:'#8A6D00',border:'1px solid #EED980',textTransform:'uppercase'}}>{r.name} ({r.foodCostPct}%)</span>
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <div style={{fontWeight:900,fontSize:12,color:'#009D3A',textTransform:'uppercase',marginBottom:6,letterSpacing:0.5}}>▼ Baisses</div>
          {baisse.length === 0 && <div style={{fontSize:12,color:'#888',padding:8}}>Aucune baisse détectée</div>}
          {baisse.map(function(b, i) {
            return (
              <div key={i} onClick={function(){openDetail(b)}} style={{background:'#E8FFE8',border:'1px solid #009D3A',borderRadius:8,padding:'8px 10px',marginBottom:6,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:900,fontSize:13}}>{b.name}</div>
                    <div style={{fontSize:10,color:'#888'}}>{b.supplier}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:14,fontWeight:900,color:'#009D3A'}}>{b.changePct.toFixed(1)}%</div>
                    <div style={{fontSize:10,color:'#888'}}>{b.oldPrice.toFixed(2)} → {b.newPrice.toFixed(2)} €/{b.unit}</div>
                  </div>
                </div>
                {b.recipes.length > 0 && (
                  <div style={{marginTop:4}}>
                    {b.recipes.slice(0, 3).map(function(r) {
                      return <span key={r.name} style={{display:'inline-block',padding:'1px 6px',borderRadius:8,fontSize:8,fontWeight:900,margin:1,background:'#FFF',color:'#009D3A',border:'1px solid #B0E0B0',textTransform:'uppercase'}}>{r.name} ({r.foodCostPct}%)</span>
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {selectedItem && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={function(){setSelectedItem(null)}}>
          <div style={{background:'#fff',borderRadius:12,border:'2px solid #FF82D7',padding:20,maxWidth:500,width:'100%',maxHeight:'80vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923'}}>{selectedItem.name}</div>
                <div style={{fontSize:12,color:'#FF82D7',fontWeight:700}}>{selectedItem.supplier}</div>
              </div>
              <button onClick={function(){setSelectedItem(null)}} style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>✕</button>
            </div>

            <div style={{display:'flex',gap:16,marginTop:16}}>
              <div style={{flex:1,background:'#FFF9D0',borderRadius:8,padding:12,textAlign:'center'}}>
                <div style={{fontSize:11,color:'#888'}}>Prix précédent</div>
                <div style={{fontSize:20,fontWeight:900}}>{selectedItem.oldPrice.toFixed(2)} €</div>
                <div style={{fontSize:10,color:'#888'}}>/{selectedItem.unit}</div>
              </div>
              <div style={{flex:1,background:selectedItem.changePct > 0 ? '#FFE0E0' : '#E8FFE8',borderRadius:8,padding:12,textAlign:'center'}}>
                <div style={{fontSize:11,color:'#888'}}>Prix actuel</div>
                <div style={{fontSize:20,fontWeight:900}}>{selectedItem.newPrice.toFixed(2)} €</div>
                <div style={{fontSize:10,color:'#888'}}>/{selectedItem.unit}</div>
              </div>
              <div style={{flex:1,background:selectedItem.changePct > 0 ? '#CC0066' : '#009D3A',borderRadius:8,padding:12,textAlign:'center'}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Variation</div>
                <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>{selectedItem.changePct > 0 ? '+' : ''}{selectedItem.changePct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.7)'}}>{selectedItem.prevDate} → {selectedItem.lastDate}</div>
              </div>
            </div>

            <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:16,marginBottom:4}}>Évolution du prix</div>
            {priceHistory.length >= 2 ? renderChart(priceHistory) : <div style={{fontSize:12,color:'#888'}}>Historique insuffisant</div>}

            <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:16,marginBottom:4}}>Recettes impactées</div>
            {selectedItem.recipes.length > 0 ? selectedItem.recipes.map(function(r) {
              return <div key={r.name} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #F0F0F0',fontSize:13}}>
                <span style={{fontWeight:900}}>{r.name}</span>
                <span style={{color:r.foodCostPct > 25 ? '#CC0066' : '#009D3A',fontWeight:900}}>FC: {r.foodCostPct}%</span>
              </div>
            }) : <div style={{fontSize:12,color:'#888'}}>Aucune recette liée</div>}

            {selectedItem.changePct > 0 && (
              <button onClick={function(){createTask(selectedItem)}} style={{marginTop:16,width:'100%',padding:'10px 0',fontSize:13,fontWeight:900,borderRadius:20,border:'2px solid #CC0066',background:'#FFE0E0',color:'#CC0066',cursor:'pointer',textTransform:'uppercase',fontFamily:'Arial Narrow, Arial, sans-serif'}}>
                📋 Créer tâche "Renégocier" + notification
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
