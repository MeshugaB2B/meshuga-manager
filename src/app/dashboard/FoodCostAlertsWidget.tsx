'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import ArticleDetailModal from './ArticleDetailModal'

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

      // ═══════════════════════════════════════════════════════
      // FILTRES ANTI-ABERRATION (règle d'or Edward)
      // - Variations > +500% = bug pack/unité (ex: carton OCR'd qty=1)
      // - Variations < -90% = bug pack/unité aussi
      // - Variations < 2% = bruit, ignorer
      // ═══════════════════════════════════════════════════════
      var MAX_PCT_UP = 500
      var MIN_PCT_DOWN = -90
      var MIN_PCT_NOISE = 2
      
      var allChanges = []
      var seen = {}
      variations.forEach(function(v) {
        // Garder 1 seule entrée par produit (la plus récente = la première vu l'ordre)
        if (seen[v.product_id]) return
        seen[v.product_id] = true
        var pct = Number(v.variation_pct)
        // Filtres anti-aberration
        if (pct > MAX_PCT_UP) return
        if (pct < MIN_PCT_DOWN) return
        if (Math.abs(pct) < MIN_PCT_NOISE) return
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

      <ArticleDetailModal
        isOpen={!!selectedItem}
        onClose={function(){ setSelectedItem(null); setPriceHistory([]) }}
        productId={selectedItem ? selectedItem.id : null}
      />
    </div>
  )
}
