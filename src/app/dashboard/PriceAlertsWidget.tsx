'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RECIPES_DATA } from './data'
import ArticleDetailModal from './ArticleDetailModal'

// =============================================================================
// PriceAlertsWidget — Évolution des prix dernier achat vs avant-dernier
//
// LOGIQUE :
//   Pour chaque produit (catégorie ingredient), on prend les 2 derniers
//   product_prices triés par invoice_date DESC. On compare :
//     - latest.master_unit_price (le dernier achat)
//     - previous.master_unit_price (l'avant-dernier achat)
//   changePct = (latest - previous) / previous * 100
//
// FILTRES ANTI-ANOMALIES :
//   - On ignore les variations de plus de +500% ou moins de -90%
//     (= très probablement un bug pack/unité résiduel, pas une vraie variation)
//   - On ignore les variations < 1% (bruit)
//   - On ignore les produits avec moins de 2 achats historiques
//
// AFFICHAGE :
//   Hausses et baisses listées côte à côte (desktop) ou empilées (mobile)
//   Clic sur une ligne → ouvre le modal article avec graphique + facture
// =============================================================================

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

// Filtres de qualité : variations trop extrêmes = anomalie de données, pas vraie variation
var MAX_PCT_UP = 500     // au-delà = anomalie de pack/unité
var MIN_PCT_DOWN = -90   // en-dessous = anomalie de pack/unité
var MIN_PCT_NOISE = 1    // < 1% = bruit, on ignore

export default function PriceAlertsWidget() {
  var [alerts, setAlerts] = useState<any[]>([])
  var [loading, setLoading] = useState(true)
  var [modalProductId, setModalProductId] = useState<string | null>(null)

  useEffect(function() { loadAlerts() }, [])

  function getRecipesForProduct(productName: string) {
    var found: string[] = []
    RECIPES_DATA.forEach(function(r: any) {
      if (!r.ingredients) return
      r.ingredients.forEach(function(ing: any) {
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
      // ⚠️ master_unit_price (PAS price - ce champ n'existe pas)
      sb().from('product_prices')
        .select('product_id, master_unit_price, invoice_date, pack_label, invoice_filename')
        .order('invoice_date', { ascending: false }),
      sb().from('suppliers').select('id, name, archived')
    ]).then(function(results) {
      var products = results[0].data || []
      var prices = results[1].data || []
      var suppliers = results[2].data || []
      var activeSuppliers = suppliers.filter(function(s: any) { return !s.archived })
      var supMap: any = {}
      activeSuppliers.forEach(function(s: any) { supMap[s.id] = s.name })

      var changes: any[] = []
      products.forEach(function(p: any) {
        if (!supMap[p.supplier_id]) return

        // Tous les prix de ce produit, déjà triés DESC par date
        var pp = prices.filter(function(pr: any) { return pr.product_id === p.id && pr.master_unit_price > 0 })
        if (pp.length < 2) return

        // 2 derniers achats = dernier + avant-dernier
        var latest = pp[0]
        var previous = pp[1]

        var newPrice = Number(latest.master_unit_price)
        var oldPrice = Number(previous.master_unit_price)
        if (!oldPrice || oldPrice <= 0 || !newPrice || newPrice <= 0) return

        var changePct = ((newPrice - oldPrice) / oldPrice) * 100

        // FILTRES ANTI-ANOMALIES
        if (Math.abs(changePct) < MIN_PCT_NOISE) return  // bruit
        if (changePct > MAX_PCT_UP) return                // hausse impossible = bug
        if (changePct < MIN_PCT_DOWN) return              // baisse impossible = bug

        var recipes = getRecipesForProduct(p.name)
        changes.push({
          productId: p.id,
          name: p.name,
          supplier: supMap[p.supplier_id],
          unit: p.unit,
          oldPrice: oldPrice,
          newPrice: newPrice,
          changePct: changePct,
          lastDate: latest.invoice_date,
          prevDate: previous.invoice_date,
          packLabel: latest.pack_label,
          recipes: recipes
        })
      })

      // Tri : les variations les plus fortes d'abord
      changes.sort(function(a, b) { return Math.abs(b.changePct) - Math.abs(a.changePct) })

      setAlerts(changes)
      setLoading(false)
    })
  }

  if (loading) return null
  if (alerts.length === 0) return (
    <div style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{fontFamily:'Yellowtail',fontSize:20,color:'#191923',marginBottom:4}}>📊 Évolution des prix</div>
      <div style={{fontSize:13,color:'#009D3A',fontWeight:700}}>Aucune variation détectée depuis l'achat précédent</div>
    </div>
  )

  var hausses = alerts.filter(function(a) { return a.changePct > 0 })
  var baisses = alerts.filter(function(a) { return a.changePct < 0 })

  // Card commune utilisée par les 2 listes
  function renderAlertRow(a: any, i: number, type: 'hausse' | 'baisse') {
    var color, bg
    if (type === 'hausse') {
      color = a.changePct > 15 ? '#CC0066' : a.changePct > 5 ? '#E67300' : '#B8920A'
      bg = a.changePct > 15 ? '#FFE0E0' : a.changePct > 5 ? '#FFF0E0' : '#FFF9D0'
    } else {
      color = '#009D3A'
      bg = '#E8FFE8'
    }
    var sign = a.changePct > 0 ? '+' : ''
    return (
      <div
        key={i}
        onClick={function(){ setModalProductId(a.productId) }}
        onMouseDown={function(e: any){ e.currentTarget.style.transform = 'scale(0.98)' }}
        onMouseUp={function(e: any){ e.currentTarget.style.transform = '' }}
        onMouseLeave={function(e: any){ e.currentTarget.style.transform = '' }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '8px 10px',
          borderRadius: 8,
          marginBottom: 4,
          background: bg,
          border: '1px solid ' + color,
          cursor: 'pointer',
          transition: 'transform 0.1s'
        }}
      >
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap'}}>
            <span style={{fontWeight: 900, fontSize: 13, color: '#191923'}}>{a.name}</span>
            <span style={{fontSize: 10, color: '#888'}}>{a.supplier}</span>
          </div>
          {a.recipes.length > 0 && (
            <div style={{marginTop: 3}}>
              {a.recipes.slice(0, 4).map(function(r: string) {
                return <span key={r} style={{display: 'inline-block', padding: '1px 6px', borderRadius: 8, fontSize: 8, fontWeight: 900, margin: 1, background: '#FFF', color: '#8A6D00', border: '1px solid #EED980', textTransform: 'uppercase'}}>{r}</span>
              })}
              {a.recipes.length > 4 && <span style={{fontSize: 9, color: '#888'}}>+{a.recipes.length - 4}</span>}
            </div>
          )}
        </div>
        <div style={{textAlign: 'right', minWidth: 100, marginLeft: 8}}>
          <div style={{fontSize: 13, fontWeight: 900, color: color}}>
            {sign}{a.changePct.toFixed(1)}%
          </div>
          <div style={{fontSize: 10, color: '#666'}}>
            {a.oldPrice.toFixed(2)} → {a.newPrice.toFixed(2)} €/{a.unit}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{background: '#fff', border: '2px solid #191923', borderRadius: 12, padding: 16, marginBottom: 16}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
        <div style={{fontFamily: 'Yellowtail', fontSize: 22, color: '#191923'}}>📊 Évolution des prix</div>
        <div style={{fontSize: 11, color: '#888'}}>
          {hausses.length} hausse{hausses.length > 1 ? 's' : ''} · {baisses.length} baisse{baisses.length > 1 ? 's' : ''}
        </div>
      </div>
      <div style={{fontSize: 11, color: '#888', marginBottom: 12, fontStyle: 'italic'}}>
        Dernier achat vs achat précédent · Anomalies (&gt;500% / &lt;-90%) filtrées
      </div>

      {/* Layout 2 colonnes desktop, empilé mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12
      }}>
        {/* Colonne HAUSSES */}
        {hausses.length > 0 && (
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#CC0066',
              marginBottom: 6,
              letterSpacing: 0.5
            }}>
              ⚠️ Hausses ({hausses.length})
            </div>
            {hausses.map(function(a, i) { return renderAlertRow(a, i, 'hausse') })}
          </div>
        )}

        {/* Colonne BAISSES */}
        {baisses.length > 0 && (
          <div>
            <div style={{
              fontSize: 11,
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#009D3A',
              marginBottom: 6,
              letterSpacing: 0.5
            }}>
              💚 Baisses ({baisses.length})
            </div>
            {baisses.map(function(a, i) { return renderAlertRow(a, i, 'baisse') })}
          </div>
        )}
      </div>

      <ArticleDetailModal
        isOpen={!!modalProductId}
        onClose={function(){ setModalProductId(null) }}
        productId={modalProductId}
      />
    </div>
  )
}
