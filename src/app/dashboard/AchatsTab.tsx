'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

// =============================================================================
// AchatsTab — Catalogue dynamique multi-fournisseurs (héritier de SuppliersTab)
//
// Source de vérité : recipe_ingredients.product_id pour les liens product↔recette
// Ce composant ne fait QUE lecture/comparaison. Imports facture vivent dans
// FoodCostHistoryTab. Création/édition de products via le wizard d'import.
// =============================================================================
export default function AchatsTab(props) {
  var toast = props.toast || function(){}

  var [suppliers, setSuppliers] = useState([])
  var [products, setProducts] = useState([])
  var [articles, setArticles] = useState([])
  var [prices, setPrices] = useState([])
  var [recipes, setRecipes] = useState([])
  var [recipeIngs, setRecipeIngs] = useState([])
  var [catFilter, setCatFilter] = useState('all')
  var [selectedProduct, setSelectedProduct] = useState(null)
  var [loading, setLoading] = useState(true)
  var [searchQ, setSearchQ] = useState('')
  var [showOrphans, setShowOrphans] = useState(true)
  var [showCompare, setShowCompare] = useState(true)
  var [showFreeText, setShowFreeText] = useState(true)

  useEffect(function() { loadData() }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      sb().from('suppliers').select('*').order('name'),
      sb().from('products').select('*').order('name'),
      sb().from('articles').select('*').order('name'),
      sb().from('product_prices').select('*').order('invoice_date', {ascending: true}),
      sb().from('recipes').select('id,name,parent_slug,variant_key,variant_label,categorie,is_active').eq('is_active', true),
      sb().from('recipe_ingredients').select('id,recipe_id,article,fournisseur,unite,qte,prix_achat,product_id')
    ]).then(function(results) {
      if (results[0].data) setSuppliers(results[0].data)
      if (results[1].data) setProducts(results[1].data)
      if (results[2].data) setArticles(results[2].data)
      if (results[3].data) setPrices(results[3].data)
      if (results[4].data) setRecipes(results[4].data)
      if (results[5].data) setRecipeIngs(results[5].data)
      setLoading(false)
    })
  }

  // ---------------------------------------------------------------------------
  // Pour un product, lister les recettes qui l'utilisent (via recipe_ingredients.product_id)
  // ---------------------------------------------------------------------------
  function getRecipesForProduct(productId) {
    var found = []
    var seen = {}
    recipeIngs.forEach(function(ri){
      if (ri.product_id !== productId) return
      if (seen[ri.recipe_id]) return
      seen[ri.recipe_id] = 1
      var rec = recipes.filter(function(r){ return r.id === ri.recipe_id })[0]
      if (!rec) return
      found.push({
        id: rec.id,
        name: rec.variant_label ? rec.variant_label : rec.name,
        full_name: rec.name,
        qte: ri.qte,
        unite: ri.unite,
        prix_achat: ri.prix_achat
      })
    })
    return found
  }

  // ---------------------------------------------------------------------------
  // Graphe SVG d'évolution prix multi-fournisseurs (repris de SuppliersTab)
  // ---------------------------------------------------------------------------
  function renderPriceChart(productIds, allPrices, supplierMap) {
    var seriesMap = {}
    productIds.forEach(function(pid) {
      var pp = allPrices.filter(function(p) { return p.product_id === pid })
      if (pp.length > 0) seriesMap[pid] = pp
    })
    var allDates = []
    Object.values(seriesMap).forEach(function(pp) {
      pp.forEach(function(p) { if (allDates.indexOf(p.invoice_date) === -1) allDates.push(p.invoice_date) })
    })
    allDates.sort()
    if (allDates.length < 2) return null
    var allVals = []
    Object.values(seriesMap).forEach(function(pp) { pp.forEach(function(p) { allVals.push(Number(p.master_unit_price)) }) })
    var minV = Math.min.apply(null, allVals) * 0.92
    var maxV = Math.max.apply(null, allVals) * 1.08
    var range = maxV - minV || 1
    var w = 320, h = 150, pad = 35
    var chartW = w - pad * 2, chartH = h - pad * 2
    var colors = ['#FF82D7', '#FFEB5A', '#191923', '#009D3A', '#005FFF']
    var ci = 0
    var svgParts = []
    var legends = []
    Object.keys(seriesMap).forEach(function(pid) {
      var pp = seriesMap[pid]
      var color = colors[ci % colors.length]
      var supName = supplierMap[pid] || '?'
      legends.push({color: color, name: supName})
      var pts = pp.map(function(p) {
        var di = allDates.indexOf(p.invoice_date)
        var x = pad + (allDates.length > 1 ? (di / (allDates.length - 1)) * chartW : chartW / 2)
        var y = pad + chartH - ((Number(p.master_unit_price) - minV) / range) * chartH
        return {x: x, y: y, price: Number(p.master_unit_price)}
      })
      svgParts.push({points: pts, color: color})
      ci++
    })
    var dateLabels = allDates.map(function(d, i) {
      var x = pad + (allDates.length > 1 ? (i / (allDates.length - 1)) * chartW : chartW / 2)
      var dt = new Date(d)
      return {x: x, label: dt.toLocaleDateString('fr-FR', {month: 'short', year: '2-digit'})}
    })
    return (
      <div>
        <div style={{display:'flex',gap:12,marginBottom:8,flexWrap:'wrap'}}>
          {legends.map(function(l, i) {
            return <span key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
              <span style={{width:10,height:10,borderRadius:2,background:l.color,border:'1px solid #191923'}}></span>
              <span style={{fontWeight:700}}>{l.name}</span>
            </span>
          })}
        </div>
        <svg viewBox={"0 0 " + w + " " + h} style={{width:'100%',maxWidth:340,height:'auto'}}>
          {svgParts.map(function(s, si) {
            var polyStr = s.points.map(function(p) { return p.x + ',' + p.y }).join(' ')
            return <g key={si}>
              <polyline points={polyStr} fill="none" stroke={s.color} strokeWidth="2.5" />
              {s.points.map(function(p, pi) {
                return <g key={pi}>
                  <circle cx={p.x} cy={p.y} r="4" fill={s.color} stroke="#191923" strokeWidth="1.5" />
                  <text x={p.x} y={p.y - 8} textAnchor="middle" style={{fontSize:7,fontWeight:900,fill:'#191923',fontFamily:'Arial Narrow'}}>{p.price.toFixed(2)}</text>
                </g>
              })}
            </g>
          })}
          {dateLabels.map(function(d, i) {
            return <text key={i} x={d.x} y={h - 4} textAnchor="middle" style={{fontSize:7,fill:'#888',fontFamily:'Arial Narrow'}}>{d.label}</text>
          })}
        </svg>
      </div>
    )
  }

  function toggleActive(productId, articleId) {
    if (!articleId) return
    sb().from('products').update({is_active: false}).eq('article_id', articleId).then(function() {
      sb().from('products').update({is_active: true}).eq('id', productId).then(function() { loadData() })
    })
  }

  // ---------------------------------------------------------------------------
  // Données dérivées : filtres, comparateur, orphans, lignes texte libre
  // ---------------------------------------------------------------------------
  var activeSuppliers = suppliers.filter(function(s) { return !s.archived })
  var filteredSuppliers = catFilter === 'all' ? activeSuppliers : activeSuppliers.filter(function(s) { return s.category === catFilter })

  function productMatchesSearch(p) {
    if (!searchQ) return true
    var q = searchQ.toLowerCase()
    if (String(p.name || '').toLowerCase().indexOf(q) >= 0) return true
    var sup = suppliers.filter(function(s){ return s.id === p.supplier_id })[0]
    if (sup && sup.name.toLowerCase().indexOf(q) >= 0) return true
    return false
  }

  // Comparateur : articles qui ont 2+ products
  var comparisons = []
  articles.forEach(function(art) {
    var artProducts = products.filter(function(p) { return p.article_id === art.id })
    if (artProducts.length < 2) return
    var withSupplier = artProducts.map(function(p) {
      var sup = suppliers.filter(function(s) { return s.id === p.supplier_id })[0]
      return { name: p.name, price: Number(p.current_price), supplier: sup ? sup.name : '?', is_active: p.is_active, unit: p.unit, id: p.id }
    }).filter(function(x){ return x.price > 0 }).sort(function(a, b) { return a.price - b.price })
    if (withSupplier.length < 2) return
    var unitsSeen = {}
    withSupplier.forEach(function(x){ unitsSeen[x.unit] = 1 })
    var sameUnit = Object.keys(unitsSeen).length === 1
    var cheapest = withSupplier[0].price
    var mostExpensive = withSupplier[withSupplier.length - 1].price
    var savingPct = mostExpensive > 0 ? ((mostExpensive - cheapest) / mostExpensive * 100).toFixed(1) : 0
    comparisons.push({ article: art.name, unit: art.unit, products: withSupplier, saving: savingPct, sameUnit: sameUnit })
  })
  comparisons.sort(function(a, b) { return Number(b.saving) - Number(a.saving) })

  // Orphans
  var usedProductIds = {}
  recipeIngs.forEach(function(ri){ if (ri.product_id) usedProductIds[ri.product_id] = 1 })
  var orphanProducts = products.filter(function(p) {
    if (usedProductIds[p.id]) return false
    if (p.category === 'boisson' || p.category === 'drink') return false
    if (p.category === 'packaging') return false
    var sup = suppliers.filter(function(s) { return s.id === p.supplier_id })[0]
    if (sup && sup.archived) return false
    return true
  })

  // Lignes texte libre
  var freeTextLines = recipeIngs.filter(function(ri){ return !ri.product_id })
  var freeTextGrouped = {}
  freeTextLines.forEach(function(ri){
    var key = (ri.article || '').trim() + '::' + (ri.fournisseur || '') + '::' + (ri.unite || '')
    if (!freeTextGrouped[key]) {
      freeTextGrouped[key] = {
        article: ri.article,
        fournisseur: ri.fournisseur,
        unite: ri.unite,
        prix_avg: 0,
        nb_recettes: 0,
        prix_sum: 0
      }
    }
    freeTextGrouped[key].nb_recettes++
    freeTextGrouped[key].prix_sum += Number(ri.prix_achat || 0)
  })
  Object.keys(freeTextGrouped).forEach(function(k){
    var g = freeTextGrouped[k]
    g.prix_avg = g.prix_sum / (g.nb_recettes || 1)
  })
  var freeTextArr = Object.values(freeTextGrouped).sort(function(a,b){ return b.nb_recettes - a.nb_recettes || a.article.localeCompare(b.article) })

  if (loading) return <div style={{padding:40,textAlign:'center',opacity:0.5,fontFamily:'Yellowtail',fontSize:18}}>Chargement…</div>

  // =========================================================================
  // VUE DÉTAIL PRODUIT (drill-down avec graphe SVG)
  // =========================================================================
  if (selectedProduct) {
    var prod = selectedProduct
    var sup = suppliers.filter(function(s) { return s.id === prod.supplier_id })[0]
    var articleId = prod.article_id
    var siblingProducts = articleId ? products.filter(function(p) { return p.article_id === articleId }) : [prod]
    var prodRecipes = getRecipesForProduct(prod.id)
    var activeProduct = siblingProducts.filter(function(p) { return p.is_active })[0] || prod
    var supplierMapForChart = {}
    siblingProducts.forEach(function(sp) {
      var s = suppliers.filter(function(ss) { return ss.id === sp.supplier_id })[0]
      supplierMapForChart[sp.id] = s ? s.name : '?'
    })
    var allProductIds = siblingProducts.map(function(sp) { return sp.id })
    var allPricesForArticle = prices.filter(function(p) { return allProductIds.indexOf(p.product_id) >= 0 })

    return (
      <div>
        <div onClick={function(){setSelectedProduct(null)}} style={{cursor:'pointer',fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginBottom:12}}>← Retour</div>
        <div style={{background:'#fff',border:'2px solid #FF82D7',borderRadius:12,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontFamily:'Yellowtail',fontSize:24,color:'#191923'}}>{prod.name}</div>
              <div style={{fontSize:12,color:'#FF82D7',fontWeight:700,marginTop:2}}>{sup ? sup.name : ''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:28,fontWeight:900,color:'#191923'}}>{Number(activeProduct.current_price).toFixed(2)} €<span style={{fontSize:14,color:'#888',fontWeight:400}}>/{prod.unit}</span></div>
              {siblingProducts.length > 1 && <div style={{fontSize:11,color:'#FF82D7',fontWeight:700}}>prix actif</div>}
            </div>
          </div>

          {siblingProducts.length > 1 && <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Fournisseurs</div>}
          {siblingProducts.length > 1 && siblingProducts.map(function(sp) {
            var spSup = suppliers.filter(function(ss) { return ss.id === sp.supplier_id })[0]
            var diff = activeProduct.id !== sp.id && Number(activeProduct.current_price) > 0 ? ((Number(sp.current_price) - Number(activeProduct.current_price)) / Number(activeProduct.current_price) * 100).toFixed(1) : null
            return (
              <div key={sp.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,marginBottom:4,background:sp.is_active ? '#FFF9D0' : 'transparent',border:sp.is_active ? '2px solid #FFEB5A' : '1px solid #EEE'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  {sp.is_active && <span style={{fontSize:14}}>★</span>}
                  <span style={{fontWeight:900,fontSize:14}}>{spSup ? spSup.name : '?'}</span>
                  <span style={{fontSize:10,color:'#888'}}>{sp.name}</span>
                  {sp.is_active && <span style={{fontSize:10,fontWeight:900,color:'#8A6D00',background:'#FFEB5A',padding:'2px 8px',borderRadius:10}}>ACTIF</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                  <span style={{fontWeight:900,fontSize:14}}>{Number(sp.current_price).toFixed(2)} €/{sp.unit}</span>
                  {diff !== null && <span style={{fontSize:11,fontWeight:900,color:Number(diff) > 0 ? '#CC0066' : '#009D3A'}}>{Number(diff) > 0 ? '+' : ''}{diff}%</span>}
                  {!sp.is_active && <button onClick={function(){toggleActive(sp.id, articleId)}} style={{padding:'3px 10px',fontSize:10,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>ACTIVER</button>}
                </div>
              </div>
            )
          })}

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Utilisé dans</div>
          {prodRecipes.length > 0 ? prodRecipes.map(function(r) {
            return <span key={r.id} style={{display:'inline-block',padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:900,margin:3,background:'#FFEB5A',color:'#191923',border:'2px solid #191923',textTransform:'uppercase'}}>
              {r.full_name} <span style={{fontWeight:400,opacity:.7,marginLeft:3}}>· {r.qte}{r.unite}</span>
            </span>
          }) : <span style={{fontSize:13,color:'#888',fontWeight:700}}>Hors recettes</span>}

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Évolution du prix</div>
          {allPricesForArticle.length >= 2 ? renderPriceChart(allProductIds, prices, supplierMapForChart) : <div style={{fontSize:13,color:'#888'}}>Pas encore d&apos;historique. Importe une facture pour commencer le suivi.</div>}

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Historique factures</div>
          {allPricesForArticle.length > 0 ? allPricesForArticle.slice().reverse().map(function(ph) {
            var phSup = supplierMapForChart[ph.product_id] || '?'
            return (
              <div key={ph.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid #F5F5F5',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                <span style={{fontWeight:700,minWidth:80}}>{new Date(ph.invoice_date).toLocaleDateString('fr-FR')}</span>
                <span style={{fontSize:11,color:'#888'}}>{phSup}</span>
                <span style={{fontWeight:900}}>{Number(ph.master_unit_price).toFixed(2)} €/{prod.unit}</span>
                {ph.invoice_filename && <span style={{fontSize:10,color:'#888'}}>{ph.invoice_filename}</span>}
              </div>
            )
          }) : <div style={{fontSize:13,color:'#888'}}>Aucune facture importée pour ce produit.</div>}
        </div>
      </div>
    )
  }

  // =========================================================================
  // VUE PRINCIPALE — sections par fournisseur + comparateur + orphans
  // =========================================================================
  return (
    <div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:13,opacity:.6}}>
          Catalogue dynamique — {products.length} produits · {activeSuppliers.length} fournisseurs · {recipes.length} recettes actives
        </div>
      </div>

      {/* Filtres catégorie + recherche */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:14}}>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontFamily:'Yellowtail',fontSize:13,color:'#191923'}}>Filtrer :</span>
          {[
            {v:'all',l:'TOUS'},
            {v:'ingredient',l:'INGRÉDIENTS'},
            {v:'boisson',l:'BOISSONS'},
            {v:'packaging',l:'PACKAGING'},
            {v:'consommable',l:'CONSOMMABLES'}
          ].map(function(c) {
            return <button key={c.v} onClick={function(){setCatFilter(c.v)}} style={{
              padding:'5px 14px',fontSize:11,fontWeight:900,borderRadius:20,
              border:'2px solid #191923',
              background:catFilter===c.v?'#FFEB5A':'transparent',
              color:'#191923',cursor:'pointer',textTransform:'uppercase',
              fontFamily:'Arial Narrow, Arial, sans-serif'
            }}>{c.l}</button>
          })}
        </div>
        <input
          type="text"
          placeholder="🔍 Rechercher…"
          value={searchQ}
          onChange={function(e){setSearchQ(e.target.value)}}
          style={{padding:'6px 12px',fontSize:12,border:'2px solid #191923',borderRadius:20,background:'#fff',minWidth:200,fontWeight:700}}
        />
      </div>

      {/* COMPARATEUR PRIX FOURNISSEURS */}
      {comparisons.length > 0 && showCompare && (
        <div style={{background:'#fff',border:'2px solid #FF82D7',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#191923'}}>💰 Comparateur prix fournisseurs</div>
            <button onClick={function(){setShowCompare(false)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:18,opacity:.4}}>✕</button>
          </div>
          <div style={{fontSize:11,color:'#888',marginBottom:8}}>{comparisons.length} ingrédient{comparisons.length>1?'s':''} disponible{comparisons.length>1?'s':''} chez plusieurs fournisseurs · triés par économie potentielle</div>
          {comparisons.slice(0, 10).map(function(c, i) {
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #F0F0F0',fontSize:13,gap:8,flexWrap:'wrap'}}>
                <span style={{fontWeight:900,minWidth:120}}>{c.article}</span>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  {c.products.map(function(p, pi) {
                    return <span key={pi} style={{fontSize:12,fontWeight:p.is_active?900:400,color:pi===0?'#009D3A':'#191923'}}>
                      {p.supplier}: {p.price.toFixed(2)}€/{p.unit}{p.is_active ? ' ★' : ''}
                    </span>
                  })}
                  {c.sameUnit ? (
                    <span style={{fontSize:11,fontWeight:900,color:'#009D3A',background:'#E8FFE8',padding:'2px 8px',borderRadius:10}}>-{c.saving}%</span>
                  ) : (
                    <span style={{fontSize:10,fontWeight:700,color:'#A05A00',background:'#FFF6E5',padding:'2px 8px',borderRadius:10}}>⚠️ unités ≠</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      {!showCompare && comparisons.length > 0 && (
        <button onClick={function(){setShowCompare(true)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #FF82D7',background:'#fff',color:'#FF82D7',cursor:'pointer',marginBottom:10}}>💰 Afficher le comparateur ({comparisons.length})</button>
      )}

      {/* PRODUITS SANS RECETTE */}
      {orphanProducts.length > 0 && showOrphans && (
        <div style={{background:'#fff',border:'2px solid #CC0066',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#CC0066'}}>🚫 Produits sans recette ({orphanProducts.length})</div>
            <button onClick={function(){setShowOrphans(false)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:16,opacity:.4}}>✕</button>
          </div>
          <div style={{fontSize:12,color:'#888',marginBottom:8}}>Cliquez pour voir le détail · les produits historiques (témoins d&apos;achats passés) restent affichés ici</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {orphanProducts.map(function(op) {
              var sup = suppliers.filter(function(s) { return s.id === op.supplier_id })[0]
              return <span key={op.id} onClick={function(){setSelectedProduct(op)}} style={{display:'inline-block',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:900,background:'#FFE0E0',color:'#CC0066',border:'1px solid #CC0066',cursor:'pointer'}}>{op.name} <span style={{fontWeight:400,opacity:.7}}>({sup ? sup.name : '?'} · {Number(op.current_price).toFixed(2)}€/{op.unit})</span></span>
            })}
          </div>
        </div>
      )}
      {!showOrphans && orphanProducts.length > 0 && (
        <button onClick={function(){setShowOrphans(true)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #CC0066',background:'#fff',color:'#CC0066',cursor:'pointer',marginBottom:10}}>🚫 Afficher les orphelins ({orphanProducts.length})</button>
      )}

      {/* LIGNES TEXTE LIBRE NON LIÉES */}
      {freeTextArr.length > 0 && showFreeText && (
        <div style={{background:'#fff',border:'2px solid #FFEB5A',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#8A6D00'}}>🔗 À reconnecter au catalogue ({freeTextArr.length})</div>
            <button onClick={function(){setShowFreeText(false)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:16,opacity:.4}}>✕</button>
          </div>
          <div style={{fontSize:12,color:'#888',marginBottom:8}}>Ces lignes recettes utilisent un texte libre sans lien catalogue. Liez-les pour propagation auto des prix lors du prochain import facture.</div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            {freeTextArr.slice(0, 20).map(function(ft, i) {
              return (
                <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 8px',background:'#FFF9D0',borderRadius:6,fontSize:12,gap:6,flexWrap:'wrap'}}>
                  <span><strong>{ft.article}</strong> <span style={{opacity:.6,marginLeft:6,fontSize:10}}>({ft.fournisseur} · {ft.unite})</span></span>
                  <span style={{fontWeight:900}}>{ft.prix_avg.toFixed(2)} €/{ft.unite} <span style={{opacity:.6,fontWeight:400,fontSize:10,marginLeft:4}}>· {ft.nb_recettes} recette{ft.nb_recettes>1?'s':''}</span></span>
                </div>
              )
            })}
            {freeTextArr.length > 20 && <div style={{fontSize:10,opacity:.6,marginTop:6,textAlign:'center'}}>+ {freeTextArr.length - 20} autres lignes…</div>}
          </div>
        </div>
      )}
      {!showFreeText && freeTextArr.length > 0 && (
        <button onClick={function(){setShowFreeText(true)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #8A6D00',background:'#fff',color:'#8A6D00',cursor:'pointer',marginBottom:10}}>🔗 Afficher les non liés ({freeTextArr.length})</button>
      )}

      {/* SECTIONS PAR FOURNISSEUR */}
      {filteredSuppliers.map(function(s) {
        var supProducts = products.filter(function(p) { return p.supplier_id === s.id && productMatchesSearch(p) })
        if (supProducts.length === 0 && searchQ) return null
        var catBadge = s.category === 'ingredient'
          ? {bg:'#FFEB5A',color:'#191923',label:'Ingrédients'}
          : s.category === 'boisson'
            ? {bg:'#E0F0FF',color:'#005FFF',label:'Boissons'}
            : s.category === 'packaging'
              ? {bg:'#FF82D7',color:'#FFF',label:'Packaging'}
              : {bg:'#E8E8E8',color:'#555',label:'Consommable'}
        return (
          <div key={s.id} style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:10,borderBottom:'2px solid #FFEB5A',marginBottom:8,flexWrap:'wrap',gap:6}}>
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <span style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{s.name}</span>
                <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900,background:catBadge.bg,color:catBadge.color,textTransform:'uppercase'}}>{catBadge.label}</span>
              </div>
              <span style={{fontFamily:'Yellowtail',fontSize:12,color:'#888'}}>{supProducts.length} produit{supProducts.length>1?'s':''}</span>
            </div>
            {supProducts.length === 0 && <div style={{fontSize:13,color:'#888',padding:'8px 0'}}>Aucun produit — importez une facture pour alimenter</div>}
            {supProducts.map(function(p) {
              var prodRecipes = getRecipesForProduct(p.id)
              var sibCount = p.article_id ? products.filter(function(pp) { return pp.article_id === p.article_id }).length : 1
              return (
                <div key={p.id} onClick={function(){setSelectedProduct(p)}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 8px',borderBottom:'1px solid #F0F0F0',cursor:'pointer',borderRadius:6,gap:8,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontWeight:900,fontSize:14}}>{p.name}</span>
                      {p.is_active && sibCount > 1 && <span style={{fontSize:9,fontWeight:900,color:'#8A6D00',background:'#FFEB5A',padding:'1px 6px',borderRadius:8}}>★ ACTIF</span>}
                      {sibCount > 1 && <span style={{fontSize:9,color:'#888'}}>{sibCount} fourn.</span>}
                    </div>
                    <div style={{marginTop:3}}>
                      {prodRecipes.length > 0 ? prodRecipes.slice(0, 6).map(function(r) {
                        return <span key={r.id} style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,margin:2,background:'#FFF3B0',color:'#8A6D00',border:'1px solid #EED980',textTransform:'uppercase'}}>{r.full_name}</span>
                      }) : p.category === 'boisson' ? (
                        <span style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:'#E0F0FF',color:'#005FFF',border:'1px solid #B0D0FF',textTransform:'uppercase'}}>Boisson revente</span>
                      ) : p.category === 'packaging' ? (
                        <span style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:'#FFE0F0',color:'#CC0066',border:'1px solid #FFB0D7',textTransform:'uppercase'}}>Packaging</span>
                      ) : (
                        <span style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:'#E8E8E8',color:'#555',border:'1px solid #CCC',textTransform:'uppercase'}}>Hors recettes</span>
                      )}
                      {prodRecipes.length > 6 && <span style={{fontSize:9,color:'#888',marginLeft:4}}>+{prodRecipes.length-6}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <span style={{fontSize:16,fontWeight:900}}>{Number(p.current_price).toFixed(2)} €</span>
                    <span style={{fontSize:11,color:'#888',marginLeft:2}}>/{p.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {filteredSuppliers.length === 0 && (
        <div style={{padding:32,textAlign:'center',opacity:.5,fontSize:13}}>
          Aucun fournisseur dans cette catégorie.
        </div>
      )}
    </div>
  )
}
