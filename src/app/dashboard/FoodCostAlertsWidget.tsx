'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

function fmtPrice(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—'
  var n = Number(v)
  // 2 décimales par défaut, 3 si prix entre 0.001 et 0.10, 4 si < 0.001
  if (Math.abs(n) >= 0.10) return n.toFixed(2)
  if (Math.abs(n) >= 0.001) return n.toFixed(3)
  return n.toFixed(4)
}

// =============================================================================
// FoodCostAlertsWidget v2 — "Suivi des prix d'achat"
// Source : vue v_price_variations (compare 2 derniers prix master_unit_price)
// PLUS de baseline Excel — uniquement données factures réelles
// =============================================================================

export default function FoodCostAlertsWidget() {
  var [changes, setChanges] = useState([])
  var [loading, setLoading] = useState(true)
  var [selectedItem, setSelectedItem] = useState(null)
  var [priceHistory, setPriceHistory] = useState([])

  useEffect(function() { loadChanges() }, [])

  function loadChanges() {
    // Charger directement depuis v_price_variations (compare 2 derniers prix par produit)
    Promise.all([
      sb().from('v_price_variations').select('*').not('variation_pct', 'is', null).order('variation_pct', {ascending: false}),
      sb().from('recipe_ingredients').select('article, recipe_id, product_id'),
      sb().from('recipes').select('id, name, food_cost_pct, prix_vente_ttc')
    ]).then(function(results) {
      var variations = results[0].data || []
      var ingredients = results[1].data || []
      var recipes = results[2].data || []
      
      var recipeMap = {}
      recipes.forEach(function(r){ recipeMap[r.id] = r })

      function getRecipesForProduct(productId, productName) {
        var found = []
        ingredients.forEach(function(ing) {
          if (ing.product_id === productId) {
            var r = recipeMap[ing.recipe_id]
            if (r && !found.find(function(f){return f.name === r.name})) {
              found.push({name: r.name, foodCostPct: r.food_cost_pct || 0, prixHT: r.prix_vente_ttc || 0})
            }
          }
        })
        return found
      }

      var allChanges = []
      var seen = {}
      variations.forEach(function(v) {
        // Garder 1 seule entrée par produit (la plus récente = la première vu l'ordre)
        if (seen[v.product_id]) return
        seen[v.product_id] = true
        // Filtrer les variations < 2%
        if (Math.abs(Number(v.variation_pct)) < 2) return
        allChanges.push({
          id: v.product_id,
          name: v.product_name,
          supplier: v.supplier_name || '—',
          unit: '',
          oldPrice: Number(v.previous_price),
          newPrice: Number(v.current_price),
          changePct: Number(v.variation_pct),
          lastDate: v.invoice_date,
          prevDate: v.previous_date,
          recipes: getRecipesForProduct(v.product_id, v.product_name)
        })
      })
      allChanges.sort(function(a, b) { return b.changePct - a.changePct })
      setChanges(allChanges)
      setLoading(false)
    }).catch(function(){ setLoading(false) })
  }

  function openDetail(item) {
    setSelectedItem(item)
    sb().from('product_prices').select('master_unit_price, invoice_date, pack_label')
      .eq('product_id', item.id).order('invoice_date', {ascending: true})
      .then(function(r) {
        var hist = (r.data || []).map(function(h){ return {price: h.master_unit_price, invoice_date: h.invoice_date, pack_label: h.pack_label} })
        setPriceHistory(hist)
      })
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
          body: item.supplier + ': ' + fmtPrice(item.oldPrice) + ' → ' + fmtPrice(item.newPrice) + ' € (+' + Math.abs(item.changePct).toFixed(0) + '%) — Tâche créée',
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
              <text x={p.x} y={p.y - 10} textAnchor="middle" style={{fontSize:9,fontWeight:900,fill:'#191923',fontFamily:'Arial Narrow'}}>{fmtPrice(p.price)}€</text>
              <text x={p.x} y={h - 4} textAnchor="middle" style={{fontSize:8,fill:'#888',fontFamily:'Arial Narrow'}}>{label}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  if (loading) return null
  if (changes.length === 0) {
    return (
      <div style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:16}}>
        <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923',marginBottom:4}}>📊 Suivi des prix d&apos;achat</div>
        <div style={{fontSize:11,color:'#888',marginBottom:8}}>Aucune variation significative détectée</div>
      </div>
    )
  }

  var hausse = changes.filter(function(c) { return c.changePct > 0 }).slice(0, 10)
  var baisse = changes.filter(function(c) { return c.changePct < 0 }).sort(function(a, b) { return a.changePct - b.changePct }).slice(0, 10)

  return (
    <div style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923',marginBottom:4}}>📊 Suivi des prix d&apos;achat</div>
      <div style={{fontSize:11,color:'#888',marginBottom:12}}>{hausse.length} hausse{hausse.length !== 1 ? 's' : ''} · {baisse.length} baisse{baisse.length !== 1 ? 's' : ''} · dernière analyse factures</div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <div style={{fontWeight:900,fontSize:12,color:'#CC0066',textTransform:'uppercase',marginBottom:6,letterSpacing:0.5}}>▲ Hausses</div>
          {hausse.map(function(c) {
            return (
              <div key={c.id} onClick={function(){openDetail(c)}} style={{border:'2px solid #FFC0D9',background:'#FFF0F5',borderRadius:8,padding:10,marginBottom:6,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                  <div style={{fontWeight:900,fontSize:13,color:'#191923'}}>{c.name}</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#CC0066'}}>+{c.changePct.toFixed(1)}%</div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#888',marginTop:2}}>
                  <div>{c.supplier}</div>
                  <div style={{fontFamily:'Arial Narrow,Arial,sans-serif'}}>{fmtPrice(c.oldPrice)} → {fmtPrice(c.newPrice)} €</div>
                </div>
                {c.recipes.length > 0 && (
                  <div style={{marginTop:4,display:'flex',flexWrap:'wrap',gap:3}}>
                    {c.recipes.slice(0,3).map(function(r,i) {
                      return (<span key={i} style={{fontSize:9,background:'#FFEB5A',padding:'1px 5px',borderRadius:8,color:'#191923',fontWeight:900}}>{r.name}</span>)
                    })}
                  </div>
                )}
              </div>
            )
          })}
          {hausse.length === 0 && <div style={{fontSize:11,color:'#888',padding:8,textAlign:'center'}}>Aucune hausse 🎉</div>}
        </div>

        <div>
          <div style={{fontWeight:900,fontSize:12,color:'#009D3A',textTransform:'uppercase',marginBottom:6,letterSpacing:0.5}}>▼ Baisses</div>
          {baisse.map(function(c) {
            return (
              <div key={c.id} onClick={function(){openDetail(c)}} style={{border:'2px solid #C0E5C0',background:'#F0FFF0',borderRadius:8,padding:10,marginBottom:6,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                  <div style={{fontWeight:900,fontSize:13,color:'#191923'}}>{c.name}</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#009D3A'}}>{c.changePct.toFixed(1)}%</div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#888',marginTop:2}}>
                  <div>{c.supplier}</div>
                  <div style={{fontFamily:'Arial Narrow,Arial,sans-serif'}}>{fmtPrice(c.oldPrice)} → {fmtPrice(c.newPrice)} €</div>
                </div>
                {c.recipes.length > 0 && (
                  <div style={{marginTop:4,display:'flex',flexWrap:'wrap',gap:3}}>
                    {c.recipes.slice(0,3).map(function(r,i) {
                      return (<span key={i} style={{fontSize:9,background:'#FFEB5A',padding:'1px 5px',borderRadius:8,color:'#191923',fontWeight:900}}>{r.name}</span>)
                    })}
                  </div>
                )}
              </div>
            )
          })}
          {baisse.length === 0 && <div style={{fontSize:11,color:'#888',padding:8,textAlign:'center'}}>Aucune baisse</div>}
        </div>
      </div>

      {selectedItem && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={function(){setSelectedItem(null)}}>
          <div style={{background:'#fff',borderRadius:14,maxWidth:600,width:'100%',padding:20,maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
              <div>
                <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923'}}>{selectedItem.name}</div>
                <div style={{fontSize:12,color:'#FF82D7',fontWeight:700}}>{selectedItem.supplier}</div>
              </div>
              <button type="button" onClick={function(){setSelectedItem(null)}} style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer',color:'#888'}}>✕</button>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <div style={{flex:1,background:'#F5F5F5',borderRadius:8,padding:12,textAlign:'center'}}>
                <div style={{fontSize:10,color:'#888'}}>Avant</div>
                <div style={{fontSize:20,fontWeight:900}}>{fmtPrice(selectedItem.oldPrice)} €</div>
              </div>
              <div style={{flex:1,background:selectedItem.changePct > 0 ? '#FFE0E0' : '#E8FFE8',borderRadius:8,padding:12,textAlign:'center'}}>
                <div style={{fontSize:10,color:'#888'}}>Actuel</div>
                <div style={{fontSize:20,fontWeight:900}}>{fmtPrice(selectedItem.newPrice)} €</div>
              </div>
              <div style={{flex:1,background:selectedItem.changePct > 0 ? '#CC0066' : '#009D3A',borderRadius:8,padding:12,textAlign:'center'}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.7)'}}>Variation</div>
                <div style={{fontSize:20,fontWeight:900,color:'#fff'}}>{selectedItem.changePct > 0 ? '+' : ''}{selectedItem.changePct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.7)'}}>{selectedItem.prevDate} → {selectedItem.lastDate}</div>
              </div>
            </div>

            {renderChart(priceHistory)}

            <div style={{fontSize:11,fontWeight:900,color:'#888',textTransform:'uppercase',marginTop:12,marginBottom:6,letterSpacing:0.5}}>Recettes impactées</div>
            {selectedItem.recipes.length > 0 ? selectedItem.recipes.map(function(r,i) {
              return (
                <div key={i} style={{padding:'6px 10px',background:'#FAFAFA',borderRadius:6,marginBottom:3,fontSize:11,display:'flex',justifyContent:'space-between'}}>
                  <span style={{fontWeight:700,color:'#191923'}}>{r.name}</span>
                  <span style={{color:'#888'}}>{r.foodCostPct ? r.foodCostPct + '% FC' : ''}</span>
                </div>
              )
            }) : <div style={{fontSize:11,color:'#888',padding:8,textAlign:'center'}}>Aucune recette utilise ce produit</div>}

            {selectedItem.changePct > 0 && (
              <button type="button" onClick={function(){createTask(selectedItem)}} style={{marginTop:16,width:'100%',padding:'10px 0',fontSize:13,fontWeight:900,borderRadius:20,border:'2px solid #CC0066',background:'#FFE0E0',color:'#CC0066',cursor:'pointer',textTransform:'uppercase',fontFamily:'Arial Narrow, Arial, sans-serif'}}>
                Créer tâche : renégocier
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
