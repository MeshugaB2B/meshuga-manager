'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RECIPES_DATA } from './data'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

export default function PriceAlertsWidget() {
  var [alerts, setAlerts] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function() { loadAlerts() }, [])

  function getRecipesForProduct(productName) {
    var found = []
    RECIPES_DATA.forEach(function(r) {
      if (!r.ingredients) return
      r.ingredients.forEach(function(ing) {
        var ingName = (ing.article || '').toLowerCase()
        var pName = productName.toLowerCase()
        if (ingName === pName || ingName.indexOf(pName) > -1 || pName.indexOf(ingName) > -1) {
          if (found.indexOf(r.name) === -1) found.push(r.name)
        }
      })
    })
    return found
  }

  function loadAlerts() {
    Promise.all([
      sb().from('products').select('id, name, unit, current_price, supplier_id, category').eq('category', 'ingredient'),
      sb().from('product_prices').select('product_id, price, invoice_date').order('invoice_date', {ascending: false}),
      sb().from('suppliers').select('id, name, archived')
    ]).then(function(results) {
      var products = results[0].data || []
      var prices = results[1].data || []
      var suppliers = results[2].data || []
      var activeSuppliers = suppliers.filter(function(s) { return !s.archived })
      var supMap = {}
      activeSuppliers.forEach(function(s) { supMap[s.id] = s.name })

      var changes = []
      products.forEach(function(p) {
        if (!supMap[p.supplier_id]) return
        var pp = prices.filter(function(pr) { return pr.product_id === p.id })
        if (pp.length < 2) return
        var latest = pp[0]
        var previous = pp[1]
        var changePct = previous.price > 0 ? ((latest.price - previous.price) / previous.price * 100) : 0
        if (Math.abs(changePct) < 0.5) return
        var recipes = getRecipesForProduct(p.name)
        changes.push({
          name: p.name,
          supplier: supMap[p.supplier_id],
          unit: p.unit,
          oldPrice: Number(previous.price),
          newPrice: Number(latest.price),
          changePct: changePct,
          lastDate: latest.invoice_date,
          prevDate: previous.invoice_date,
          recipes: recipes
        })
      })

      changes.sort(function(a, b) { return Math.abs(b.changePct) - Math.abs(a.changePct) })
      setAlerts(changes)
      setLoading(false)
    })
  }

  if (loading) return null
  if (alerts.length === 0) return (
    <div style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{fontFamily:'Yellowtail',fontSize:20,color:'#191923',marginBottom:4}}>📊 Évolution des prix</div>
      <div style={{fontSize:13,color:'#009D3A',fontWeight:700}}>Aucune variation détectée</div>
    </div>
  )

  var hausse = alerts.filter(function(a) { return a.changePct > 0 })
  var baisse = alerts.filter(function(a) { return a.changePct < 0 })

  return (
    <div style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{fontFamily:'Yellowtail',fontSize:20,color:'#191923'}}>📊 Évolution des prix</div>
        <div style={{fontSize:11,color:'#888'}}>{hausse.length} hausse{hausse.length > 1 ? 's' : ''} · {baisse.length} baisse{baisse.length > 1 ? 's' : ''}</div>
      </div>
      {hausse.length > 0 && (
        <div style={{marginBottom:8}}>
          {hausse.map(function(a, i) {
            var color = a.changePct > 15 ? '#CC0066' : a.changePct > 5 ? '#E67300' : '#B8920A'
            var bg = a.changePct > 15 ? '#FFE0E0' : a.changePct > 5 ? '#FFF0E0' : '#FFF9D0'
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'8px 10px',borderRadius:8,marginBottom:4,background:bg,border:'1px solid ' + color}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:900,fontSize:13,color:'#191923'}}>{a.name}</span>
                    <span style={{fontSize:10,color:'#888'}}>{a.supplier}</span>
                  </div>
                  {a.recipes.length > 0 && (
                    <div style={{marginTop:3}}>
                      {a.recipes.slice(0, 4).map(function(r) {
                        return <span key={r} style={{display:'inline-block',padding:'1px 6px',borderRadius:8,fontSize:8,fontWeight:900,margin:1,background:'#FFF',color:'#8A6D00',border:'1px solid #EED980',textTransform:'uppercase'}}>{r}</span>
                      })}
                      {a.recipes.length > 4 && <span style={{fontSize:9,color:'#888'}}>+{a.recipes.length - 4}</span>}
                    </div>
                  )}
                </div>
                <div style={{textAlign:'right',minWidth:100}}>
                  <div style={{fontSize:12,fontWeight:900,color:color}}>+{a.changePct.toFixed(1)}%</div>
                  <div style={{fontSize:10,color:'#888'}}>{a.oldPrice.toFixed(2)} → {a.newPrice.toFixed(2)} €/{a.unit}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {baisse.length > 0 && (
        <div>
          {baisse.map(function(a, i) {
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 10px',borderRadius:8,marginBottom:4,background:'#E8FFE8',border:'1px solid #009D3A'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontWeight:900,fontSize:13}}>{a.name}</span>
                  <span style={{fontSize:10,color:'#888'}}>{a.supplier}</span>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12,fontWeight:900,color:'#009D3A'}}>{a.changePct.toFixed(1)}%</div>
                  <div style={{fontSize:10,color:'#888'}}>{a.oldPrice.toFixed(2)} → {a.newPrice.toFixed(2)} €/{a.unit}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
