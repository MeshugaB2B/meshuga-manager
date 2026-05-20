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
  var [assignModal, setAssignModal] = useState(null)
  var [assignForm, setAssignForm] = useState({recipe_id:'', qte:'', unite:'kg'})
  var [assignSaving, setAssignSaving] = useState(false)
  var [editingPriceId, setEditingPriceId] = useState(null)
  var [editingPriceVal, setEditingPriceVal] = useState('')
  var [savingPrice, setSavingPrice] = useState(false)
  // 🔥 Modal de visualisation facture
  var [pdfViewer, setPdfViewer] = useState(null) // { filename, fournisseur, date, productName }
  // 🔥 Modal de comparaison côte-à-côte des factures
  var [compareModal, setCompareModal] = useState(null) // { article, products: [{filename, date, ...}, ...] }

  useEffect(function() { loadData() }, [])

  // 🔥 Fermeture modals avec ESC
  useEffect(function() {
    function handleEsc(e) {
      if (e.key === 'Escape') {
        if (pdfViewer) setPdfViewer(null)
        else if (compareModal) setCompareModal(null)
      }
    }
    if (pdfViewer || compareModal) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return function() {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [pdfViewer, compareModal])

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

  // Ouvrir le modal d'affectation pour un product
  function openAssignModal(product) {
    setAssignModal(product)
    setAssignForm({recipe_id: '', qte: '', unite: product.unit || 'kg'})
  }

  // Affecter un product à une recette (insère une ligne dans recipe_ingredients)
  function assignToRecipe() {
    if (!assignModal) return
    if (!assignForm.recipe_id) { alert('Choisis une recette'); return }
    var qte = parseFloat(assignForm.qte)
    if (!qte || qte <= 0) { alert('Quantité invalide'); return }
    var prod = assignModal
    var sup = suppliers.filter(function(s) { return s.id === prod.supplier_id })[0]
    var payload = {
      recipe_id: assignForm.recipe_id,
      article: prod.name,
      fournisseur: sup ? sup.name : '',
      product_id: prod.id,
      qte: qte,
      unite: assignForm.unite,
      prix_achat: Number(prod.current_price) || 0,
      cout: qte * (Number(prod.current_price) || 0)
    }
    setAssignSaving(true)
    sb().from('recipe_ingredients').insert(payload).then(function(r) {
      setAssignSaving(false)
      if (r.error) { alert('Erreur: ' + r.error.message); return }
      // Recalculer food cost de la recette
      var allRiForRecipe = recipeIngs.filter(function(ri) { return ri.recipe_id === assignForm.recipe_id }).concat([payload])
      var newFc = 0
      allRiForRecipe.forEach(function(ri) { newFc += Number(ri.qte || 0) * Number(ri.prix_achat || 0) })
      var rec = recipes.filter(function(r2) { return r2.id === assignForm.recipe_id })[0]
      if (rec) {
        // Récupérer prix_vente_ht depuis la DB pour cohérence
        sb().from('recipes').select('prix_vente_ht').eq('id', rec.id).single().then(function(rr) {
          var pvht = rr.data ? Number(rr.data.prix_vente_ht) : 0
          sb().from('recipes').update({
            food_cost_eur: Math.round(newFc * 10000) / 10000,
            food_cost_pct: pvht > 0 ? Math.round(100 * newFc / pvht * 100) / 100 : 0,
            marge_ht: Math.round((pvht - newFc) * 10000) / 10000,
            updated_at: new Date().toISOString()
          }).eq('id', rec.id).then(function() {
            toast('✅ Affecté à ' + rec.name)
            setAssignModal(null)
            setAssignForm({recipe_id:'', qte:'', unite:'kg'})
            loadData()
          })
        })
      } else {
        setAssignModal(null)
        loadData()
      }
    })
  }

  // Sauvegarder un nouveau prix pour un product et recalculer les food costs des recettes impactées
  function savePrice(productId, newPrice) {
    var p = parseFloat(newPrice)
    if (!p || p <= 0) { alert('Prix invalide'); return }
    setSavingPrice(true)
    var prod = products.filter(function(pp){ return pp.id === productId })[0]
    if (!prod) { setSavingPrice(false); return }
    var oldPrice = Number(prod.current_price)
    // 1) Mettre à jour le product
    sb().from('products').update({ current_price: p }).eq('id', productId).then(function(r){
      if (r.error) { alert('Erreur: ' + r.error.message); setSavingPrice(false); return }
      // 2) Mettre à jour toutes les recipe_ingredients qui utilisent ce product
      sb().from('recipe_ingredients').update({ prix_achat: p }).eq('product_id', productId).then(function(r2){
        if (r2.error) { alert('Erreur recipe_ingredients: ' + r2.error.message); setSavingPrice(false); return }
        // 3) Recalculer le cout des lignes recipe_ingredients impactées via SQL côté serveur (RPC) ou côté client
        // On charge les recipe_ingredients concernées pour trouver les recipe_id impactées
        sb().from('recipe_ingredients').select('id,recipe_id,qte').eq('product_id', productId).then(function(r3){
          if (r3.error) { alert('Erreur lecture ingrédients: ' + r3.error.message); setSavingPrice(false); return }
          var impactedLines = r3.data || []
          var impactedRecipes = []
          var seen = {}
          // Mettre à jour le cout de chaque ligne
          var updates = impactedLines.map(function(line){
            if (!seen[line.recipe_id]) { seen[line.recipe_id] = 1; impactedRecipes.push(line.recipe_id) }
            return sb().from('recipe_ingredients').update({ cout: Number(line.qte) * p }).eq('id', line.id)
          })
          Promise.all(updates).then(function(){
            // 4) Pour chaque recette impactée : recalculer food_cost_eur, food_cost_pct, marge_ht
            var recipeRecalcs = impactedRecipes.map(function(rid){
              return sb().from('recipe_ingredients').select('qte,prix_achat').eq('recipe_id', rid).then(function(rr){
                if (rr.error || !rr.data) return null
                var newFc = 0
                rr.data.forEach(function(li){ newFc += Number(li.qte || 0) * Number(li.prix_achat || 0) })
                return sb().from('recipes').select('prix_vente_ht').eq('id', rid).single().then(function(recR){
                  var pvht = recR.data ? Number(recR.data.prix_vente_ht) : 0
                  return sb().from('recipes').update({
                    food_cost_eur: Math.round(newFc * 10000) / 10000,
                    food_cost_pct: pvht > 0 ? Math.round(100 * newFc / pvht * 100) / 100 : 0,
                    marge_ht: Math.round((pvht - newFc) * 10000) / 10000,
                    updated_at: new Date().toISOString()
                  }).eq('id', rid)
                })
              })
            })
            Promise.all(recipeRecalcs).then(function(){
              setSavingPrice(false)
              setEditingPriceId(null)
              setEditingPriceVal('')
              var delta = ((p - oldPrice) / oldPrice * 100).toFixed(1)
              toast('✅ Prix mis à jour : ' + oldPrice.toFixed(2) + '€ → ' + p.toFixed(2) + '€ (' + (delta > 0 ? '+' : '') + delta + '%) · ' + impactedRecipes.length + ' recette(s) recalculée(s)')
              loadData()
            })
          })
        })
      })
    })
  }

  // ---------------------------------------------------------------------------
  // Graphe SVG d'évolution prix multi-fournisseurs - VERSION AMÉLIORÉE
  // - Plus grand (full width responsive, hauteur 280)
  // - Grille horizontale subtile
  // - Axes Y (prix) et X (dates) étiquetés
  // - Points plus gros avec halo
  // - Légende propre
  // - Couleurs charté Meshuga
  // ---------------------------------------------------------------------------
  function renderPriceChart(productIds, allPrices, supplierMap) {
    var seriesMap = {}
    productIds.forEach(function(pid) {
      var pp = allPrices.filter(function(p) { return p.product_id === pid }).sort(function(a,b){ return String(a.invoice_date).localeCompare(String(b.invoice_date)) })
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
    var rawMin = Math.min.apply(null, allVals)
    var rawMax = Math.max.apply(null, allVals)
    var minV = Math.max(0, rawMin - (rawMax - rawMin) * 0.15)
    var maxV = rawMax + (rawMax - rawMin) * 0.15
    if (minV === maxV) { minV = rawMin * 0.9; maxV = rawMax * 1.1 }
    var range = maxV - minV || 1

    var w = 800, h = 320, padL = 60, padR = 30, padT = 30, padB = 60
    var chartW = w - padL - padR, chartH = h - padT - padB

    // Palette Meshuga
    var colors = ['#FF82D7', '#191923', '#009D3A', '#005FFF', '#FF9500', '#8A6D00']
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
        var x = padL + (allDates.length > 1 ? (di / (allDates.length - 1)) * chartW : chartW / 2)
        var y = padT + chartH - ((Number(p.master_unit_price) - minV) / range) * chartH
        return {x: x, y: y, price: Number(p.master_unit_price), date: p.invoice_date, pack_label: p.pack_label}
      })
      svgParts.push({points: pts, color: color, supplier: supName})
      ci++
    })

    // Y-axis labels : 5 graduations
    var ySteps = 5
    var yLabels = []
    for (var yi = 0; yi <= ySteps; yi++) {
      var val = minV + (range / ySteps) * yi
      var yPos = padT + chartH - (yi / ySteps) * chartH
      yLabels.push({y: yPos, val: val, label: val >= 1 ? val.toFixed(2) : val.toFixed(3)})
    }

    // X-axis labels : maximum 8 dates
    var xStep = allDates.length <= 8 ? 1 : Math.ceil(allDates.length / 8)
    var xLabels = []
    for (var xi = 0; xi < allDates.length; xi += xStep) {
      var x = padL + (allDates.length > 1 ? (xi / (allDates.length - 1)) * chartW : chartW / 2)
      var dt = new Date(allDates[xi])
      xLabels.push({x: x, label: dt.toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'})})
    }

    return (
      <div style={{background:'#fff',border:'1.5px solid #EEE',borderRadius:10,padding:'12px 14px'}}>
        {/* Légende */}
        <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap',paddingBottom:10,borderBottom:'1px dashed #EEE'}}>
          {legends.map(function(l, i) {
            return <span key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11}}>
              <span style={{width:14,height:14,borderRadius:3,background:l.color,border:'1.5px solid #191923'}}></span>
              <span style={{fontWeight:900}}>{l.name}</span>
            </span>
          })}
        </div>
        <svg viewBox={"0 0 " + w + " " + h} style={{width:'100%',height:'auto',display:'block'}}>
          {/* Grille horizontale */}
          {yLabels.map(function(yl, i) {
            return (
              <g key={'grid-' + i}>
                <line x1={padL} y1={yl.y} x2={padL + chartW} y2={yl.y} stroke={i === 0 ? '#191923' : '#F0F0F0'} strokeWidth={i === 0 ? 1.5 : 1} />
                <text x={padL - 8} y={yl.y + 4} textAnchor="end" style={{fontSize:11,fill:'#888',fontFamily:'Arial, sans-serif',fontWeight:600}}>{yl.label}€</text>
              </g>
            )
          })}

          {/* Axe X */}
          <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#191923" strokeWidth={1.5} />

          {/* Lignes verticales discrètes pour les dates */}
          {xLabels.map(function(xl, i) {
            return <line key={'xgrid-' + i} x1={xl.x} y1={padT} x2={xl.x} y2={padT + chartH} stroke="#F8F8F8" strokeWidth={1} />
          })}

          {/* Séries (lignes + points) */}
          {svgParts.map(function(s, si) {
            var polyStr = s.points.map(function(p) { return p.x + ',' + p.y }).join(' ')
            return (
              <g key={'series-' + si}>
                {/* Ligne avec ombre */}
                <polyline points={polyStr} fill="none" stroke={s.color} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
                {/* Points avec halo */}
                {s.points.map(function(p, pi) {
                  return (
                    <g key={'pt-' + pi}>
                      <title>{p.date} · {s.supplier} · {p.price.toFixed(2)} €{p.pack_label ? ' (' + p.pack_label + ')' : ''}</title>
                      <circle cx={p.x} cy={p.y} r={9} fill={s.color} fillOpacity={0.2} />
                      <circle cx={p.x} cy={p.y} r={5.5} fill="#fff" stroke={s.color} strokeWidth={2.5} />
                      <text x={p.x} y={p.y - 14} textAnchor="middle" style={{fontSize:11,fontWeight:900,fill:'#191923',fontFamily:'Arial, sans-serif'}}>{p.price.toFixed(2)}</text>
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Labels axe X */}
          {xLabels.map(function(xl, i) {
            return <text key={'xl-' + i} x={xl.x} y={h - 30} textAnchor="middle" style={{fontSize:11,fill:'#555',fontFamily:'Arial, sans-serif',fontWeight:700}}>{xl.label}</text>
          })}

          {/* Légende axes */}
          <text x={padL - 50} y={padT - 10} style={{fontSize:10,fill:'#888',fontFamily:'Arial, sans-serif',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Prix unitaire</text>
          <text x={w - padR} y={h - 10} textAnchor="end" style={{fontSize:10,fill:'#888',fontFamily:'Arial, sans-serif',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Date d&apos;achat</text>
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

  // Ouvrir une facture stockée dans le bucket supplier-invoices via URL signée
  function openInvoice(invoicePath) {
    if (!invoicePath) return
    sb().storage.from('supplier-invoices').createSignedUrl(invoicePath, 3600).then(function(res){
      if (res.data && res.data.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
      } else {
        alert('Facture non disponible : ' + (res.error ? res.error.message : 'erreur inconnue'))
      }
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

  // Comparateur : articles qui ont 2+ products (uniquement actifs)
  // 🔥 Pour chaque product, récupérer la dernière facture (date + filename)
  var lastInvoiceByProduct = {}
  prices.forEach(function(pp) {
    if (!pp.product_id) return
    var existing = lastInvoiceByProduct[pp.product_id]
    if (!existing || (pp.invoice_date && pp.invoice_date > existing.date)) {
      lastInvoiceByProduct[pp.product_id] = {
        date: pp.invoice_date,
        filename: pp.invoice_filename || null
      }
    }
  })
  var comparisons = []
  articles.forEach(function(art) {
    var artProducts = products.filter(function(p) { return p.article_id === art.id && p.is_active !== false })
    if (artProducts.length < 2) return
    var withSupplier = artProducts.map(function(p) {
      var sup = suppliers.filter(function(s) { return s.id === p.supplier_id })[0]
      var lastInv = lastInvoiceByProduct[p.id] || { date: null, filename: null }
      return { 
        name: p.name, 
        price: Number(p.current_price), 
        supplier: sup ? sup.name : '?', 
        is_active: p.is_active, 
        unit: p.unit, 
        id: p.id,
        last_invoice_date: lastInv.date,
        last_invoice_filename: lastInv.filename
      }
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

  // Orphans — VERSION CORRIGÉE
  // Un product est orphelin SEULEMENT SI aucun product de son article n'est utilisé en recette
  // ET que son article n'est pas en monthly_overhead ou fees_taxes
  var usedProductIds = {}
  var usedArticleIds = {}
  recipeIngs.forEach(function(ri){
    if (!ri.product_id) return
    usedProductIds[ri.product_id] = 1
    var prod = products.filter(function(p) { return p.id === ri.product_id })[0]
    if (prod && prod.article_id) usedArticleIds[prod.article_id] = 1
  })
  var orphanProducts = products.filter(function(p) {
    // 🔥 Exclure les produits archivés (is_active = false)
    if (p.is_active === false) return false
    // Catégories qui ne devraient jamais apparaître comme orphelins (overhead naturel)
    if (p.category === 'boisson' || p.category === 'drink') return false
    if (p.category === 'packaging') return false
    if (p.category === 'consommable') return false
    var sup = suppliers.filter(function(s) { return s.id === p.supplier_id })[0]
    if (sup && sup.archived) return false
    // Si le product a un article master, vérifier si AU MOINS UN product de cet article est utilisé
    if (p.article_id) {
      if (usedArticleIds[p.article_id]) return false
      // Vérifier cost_imputation_mode de l'article : si overhead/fees, on l'exclut
      var art = articles.filter(function(a) { return a.id === p.article_id })[0]
      if (art && (art.cost_imputation_mode === 'monthly_overhead' || art.cost_imputation_mode === 'fees_taxes')) return false
    } else {
      // Sans article master : on regarde juste l'usage direct
      if (usedProductIds[p.id]) return false
    }
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
              {editingPriceId === activeProduct.id ? (
                <div style={{display:'flex',alignItems:'center',gap:6,justifyContent:'flex-end'}}>
                  <input type="text" inputMode="decimal" autoFocus value={editingPriceVal} onChange={function(e){setEditingPriceVal(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter'){savePrice(activeProduct.id, editingPriceVal)}if(e.key==='Escape'){setEditingPriceId(null);setEditingPriceVal('')}}} style={{width:90,padding:'6px 8px',fontSize:18,fontWeight:900,border:'2px solid #FF82D7',borderRadius:6,textAlign:'right'}} />
                  <span style={{fontSize:14,color:'#888'}}>€/{prod.unit}</span>
                  <button onClick={function(){savePrice(activeProduct.id, editingPriceVal)}} disabled={savingPrice} style={{padding:'6px 12px',background:savingPrice?'#CCC':'#009D3A',color:'#fff',border:'none',borderRadius:6,cursor:savingPrice?'wait':'pointer',fontSize:12,fontWeight:900}}>{savingPrice?'⏳':'✓'}</button>
                  <button onClick={function(){setEditingPriceId(null);setEditingPriceVal('')}} disabled={savingPrice} style={{padding:'6px 10px',background:'#fff',color:'#888',border:'1px solid #DDD',borderRadius:6,cursor:'pointer',fontSize:12}}>✕</button>
                </div>
              ) : (
                <div onClick={function(){setEditingPriceId(activeProduct.id);setEditingPriceVal(Number(activeProduct.current_price).toFixed(2))}} style={{cursor:'pointer'}} title="Cliquer pour modifier le prix">
                  <div style={{fontSize:28,fontWeight:900,color:'#191923'}}>{Number(activeProduct.current_price).toFixed(2)} €<span style={{fontSize:14,color:'#888',fontWeight:400}}>/{prod.unit}</span> <span style={{fontSize:12,color:'#FF82D7',marginLeft:6}}>✏️</span></div>
                  {siblingProducts.length > 1 && <div style={{fontSize:11,color:'#FF82D7',fontWeight:700}}>prix actif · cliquer pour modifier</div>}
                  {siblingProducts.length <= 1 && <div style={{fontSize:11,color:'#888',fontWeight:700}}>cliquer pour modifier</div>}
                </div>
              )}
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
                  {editingPriceId === sp.id ? (
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <input type="text" inputMode="decimal" autoFocus value={editingPriceVal} onChange={function(e){setEditingPriceVal(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter'){savePrice(sp.id, editingPriceVal)}if(e.key==='Escape'){setEditingPriceId(null);setEditingPriceVal('')}}} style={{width:70,padding:'4px 6px',fontSize:13,fontWeight:900,border:'2px solid #FF82D7',borderRadius:4,textAlign:'right'}} />
                      <span style={{fontSize:11,color:'#888'}}>€/{sp.unit}</span>
                      <button onClick={function(){savePrice(sp.id, editingPriceVal)}} disabled={savingPrice} style={{padding:'3px 8px',background:savingPrice?'#CCC':'#009D3A',color:'#fff',border:'none',borderRadius:4,cursor:savingPrice?'wait':'pointer',fontSize:10,fontWeight:900}}>{savingPrice?'⏳':'✓'}</button>
                      <button onClick={function(){setEditingPriceId(null);setEditingPriceVal('')}} style={{padding:'3px 6px',background:'#fff',color:'#888',border:'1px solid #DDD',borderRadius:4,cursor:'pointer',fontSize:10}}>✕</button>
                    </div>
                  ) : (
                    <span onClick={function(){setEditingPriceId(sp.id);setEditingPriceVal(Number(sp.current_price).toFixed(2))}} style={{fontWeight:900,fontSize:14,cursor:'pointer',padding:'2px 6px',borderRadius:4}} title="Cliquer pour modifier">{Number(sp.current_price).toFixed(2)} €/{sp.unit} <span style={{fontSize:10,opacity:.5}}>✏️</span></span>
                  )}
                  {diff !== null && editingPriceId !== sp.id && <span style={{fontSize:11,fontWeight:900,color:Number(diff) > 0 ? '#CC0066' : '#009D3A'}}>{Number(diff) > 0 ? '+' : ''}{diff}%</span>}
                  {!sp.is_active && editingPriceId !== sp.id && <button onClick={function(){toggleActive(sp.id, articleId)}} style={{padding:'3px 10px',fontSize:10,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>ACTIVER</button>}
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
          <div style={{marginTop:12}}>
            <button type="button" onClick={function(){openAssignModal(prod)}} style={{display:'block',width:'100%',padding:'12px 16px',fontSize:14,fontWeight:900,borderRadius:8,border:'2px solid #FF82D7',background:'#FF82D7',color:'#fff',cursor:'pointer',fontFamily:'Arial Narrow, Arial, sans-serif',WebkitTapHighlightColor:'rgba(0,0,0,0.1)',touchAction:'manipulation'}}>+ Affecter à une recette</button>
          </div>

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Évolution du prix</div>
          {allPricesForArticle.length >= 2 ? renderPriceChart(allProductIds, prices, supplierMapForChart) : <div style={{fontSize:13,color:'#888'}}>Pas encore d&apos;historique. Importe une facture pour commencer le suivi.</div>}

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Historique factures</div>
          {allPricesForArticle.length > 0 ? allPricesForArticle.slice().reverse().map(function(ph) {
            var phSup = supplierMapForChart[ph.product_id] || '?'
            var hasInvoice = !!ph.invoice_path
            return (
              <div
                key={ph.id}
                onClick={hasInvoice ? function(){ openInvoice(ph.invoice_path) } : undefined}
                style={{
                  display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 8px',
                  borderBottom:'1px solid #F5F5F5',alignItems:'center',gap:6,flexWrap:'wrap',
                  cursor:hasInvoice?'pointer':'default',
                  borderRadius:4,
                  transition:'background .12s'
                }}
                onMouseOver={hasInvoice ? function(e){ e.currentTarget.style.background = '#FFF5FB' } : undefined}
                onMouseOut={hasInvoice ? function(e){ e.currentTarget.style.background = 'transparent' } : undefined}
                title={hasInvoice ? 'Cliquer pour ouvrir la facture' : ''}
              >
                <span style={{fontWeight:700,minWidth:80}}>{new Date(ph.invoice_date).toLocaleDateString('fr-FR')}</span>
                <span style={{fontSize:11,color:'#888'}}>{phSup}</span>
                {ph.pack_label && <span style={{fontSize:10,color:'#666'}}>{ph.pack_label}</span>}
                <span style={{fontWeight:900}}>{Number(ph.master_unit_price).toFixed(2)} €/{prod.unit}</span>
                {ph.invoice_filename && (
                  <span style={{fontSize:10,color:hasInvoice?'#FF82D7':'#888',fontWeight:hasInvoice?900:400}}>
                    {hasInvoice ? '📄 ' : ''}{ph.invoice_filename}
                  </span>
                )}
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
            // Compter combien de produits ont une facture cliquable
            var withFile = c.products.filter(function(p){ return p.last_invoice_filename })
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #F0F0F0',fontSize:13,gap:8,flexWrap:'wrap'}}>
                <span style={{fontWeight:900,minWidth:120}}>{c.article}</span>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  {c.products.map(function(p, pi) {
                    var dateLabel = p.last_invoice_date ? new Date(p.last_invoice_date).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'2-digit'}) : 'Jamais facturé'
                    var hasFile = !!p.last_invoice_filename
                    return (
                      <span 
                        key={pi}
                        title={'Dernière facture : ' + dateLabel + (hasFile ? ' · Cliquer pour ouvrir' : '')}
                        onClick={function(){
                          if (hasFile) {
                            setPdfViewer({
                              filename: p.last_invoice_filename,
                              fournisseur: p.supplier,
                              date: p.last_invoice_date,
                              productName: c.article,
                              price: p.price,
                              unit: p.unit
                            })
                          }
                        }}
                        style={{
                          fontSize:12,
                          fontWeight:p.is_active?900:400,
                          color:pi===0?'#009D3A':'#191923',
                          cursor: hasFile ? 'pointer' : 'help',
                          textDecoration: hasFile ? 'underline dotted' : 'none',
                          textDecorationColor: '#bbb'
                        }}>
                        {p.supplier}: {p.price.toFixed(2)}€/{p.unit}{p.is_active ? ' ★' : ''}
                      </span>
                    )
                  })}
                  {c.sameUnit ? (
                    <span style={{fontSize:11,fontWeight:900,color:'#009D3A',background:'#E8FFE8',padding:'2px 8px',borderRadius:10}}>-{c.saving}%</span>
                  ) : (
                    <span style={{fontSize:10,fontWeight:700,color:'#A05A00',background:'#FFF6E5',padding:'2px 8px',borderRadius:10}}>⚠️ unités ≠</span>
                  )}
                  {/* 🔥 Bouton "Comparer les factures" si au moins 2 products ont un filename */}
                  {withFile.length >= 2 && (
                    <button 
                      onClick={function(){ setCompareModal({ article: c.article, products: c.products.filter(function(p){return p.last_invoice_filename}) }) }}
                      title="Comparer les factures côte-à-côte"
                      style={{
                        background:'#FFEB5A',
                        border:'1.5px solid #191923',
                        color:'#191923',
                        padding:'2px 8px',
                        borderRadius:10,
                        fontSize:10,
                        fontWeight:900,
                        cursor:'pointer'
                      }}>
                      📑 Comparer
                    </button>
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

      {/* INGRÉDIENTS NON UTILISÉS EN RECETTE */}
      {orphanProducts.length > 0 && showOrphans && (
        <div style={{background:'#fff',border:'2px solid #CC0066',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#CC0066'}}>🚫 Ingrédients non utilisés en recette ({orphanProducts.length})</div>
            <button onClick={function(){setShowOrphans(false)}} style={{background:'transparent',border:'none',cursor:'pointer',fontSize:16,opacity:.4}}>✕</button>
          </div>
          <div style={{fontSize:12,color:'#888',marginBottom:8}}>Ces ingrédients ont été achetés mais n&apos;apparaissent dans aucune recette. Pour les alternatives multi-fournisseurs (ex: Cheddar HPS vs Foodflow), seuls les ingrédients dont AUCUN fournisseur n&apos;est utilisé apparaissent ici. Cliquez pour voir le détail.</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {orphanProducts.map(function(op) {
              var sup = suppliers.filter(function(s) { return s.id === op.supplier_id })[0]
              return <span key={op.id} onClick={function(){setSelectedProduct(op)}} style={{display:'inline-block',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:900,background:'#FFE0E0',color:'#CC0066',border:'1px solid #CC0066',cursor:'pointer'}}>{op.name} <span style={{fontWeight:400,opacity:.7}}>({sup ? sup.name : '?'} · {Number(op.current_price).toFixed(2)}€/{op.unit})</span></span>
            })}
          </div>
        </div>
      )}
      {!showOrphans && orphanProducts.length > 0 && (
        <button onClick={function(){setShowOrphans(true)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #CC0066',background:'#fff',color:'#CC0066',cursor:'pointer',marginBottom:10}}>🚫 Afficher les ingrédients non utilisés ({orphanProducts.length})</button>
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

      {/* ============ MODAL AFFECTATION À UNE RECETTE ============ */}
      {assignModal && (
        <div onClick={function(){setAssignModal(null)}} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'flex-start',justifyContent:'center',zIndex:9999,padding:12,paddingTop:40,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
          <div onClick={function(e){e.stopPropagation()}} style={{background:'#fff',borderRadius:12,padding:20,maxWidth:500,width:'100%',marginBottom:40,boxShadow:'0 10px 40px rgba(0,0,0,.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16,gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923',lineHeight:1.1}}>Affecter à une recette</div>
                <div style={{fontSize:13,color:'#888',marginTop:6}}>
                  <strong>{assignModal.name}</strong> · {Number(assignModal.current_price).toFixed(2)}€/{assignModal.unit}
                </div>
              </div>
              <button type="button" onClick={function(){setAssignModal(null)}} style={{background:'#F5F5F5',border:'none',fontSize:18,cursor:'pointer',color:'#666',width:36,height:36,borderRadius:18,lineHeight:1,flexShrink:0,touchAction:'manipulation',WebkitTapHighlightColor:'rgba(0,0,0,0.1)'}}>✕</button>
            </div>

            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:11,fontWeight:900,textTransform:'uppercase',color:'#888',marginBottom:4}}>Recette</label>
              <select value={assignForm.recipe_id} onChange={function(e){setAssignForm(Object.assign({}, assignForm, {recipe_id: e.target.value}))}} style={{width:'100%',padding:'10px 12px',border:'2px solid #EBEBEB',borderRadius:6,fontSize:14,background:'#fff',WebkitAppearance:'none',appearance:'none'}}>
                <option value="">-- Choisir une recette --</option>
                {recipes.slice().sort(function(a,b){
                  var ca = a.categorie || 'zzz'
                  var cb = b.categorie || 'zzz'
                  if (ca !== cb) return ca.localeCompare(cb)
                  return (a.name || '').localeCompare(b.name || '')
                }).map(function(r){
                  var label = (r.variant_label ? r.variant_label + ' ' : '') + r.name
                  return <option key={r.id} value={r.id}>[{r.categorie || '?'}] {label}</option>
                })}
              </select>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8,marginBottom:12}}>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:900,textTransform:'uppercase',color:'#888',marginBottom:4}}>Quantité</label>
                <input type="text" inputMode="decimal" value={assignForm.qte} onChange={function(e){setAssignForm(Object.assign({}, assignForm, {qte: e.target.value}))}} placeholder="ex: 0.005" style={{width:'100%',padding:'10px 12px',border:'2px solid #EBEBEB',borderRadius:6,fontSize:14,boxSizing:'border-box'}} />
              </div>
              <div>
                <label style={{display:'block',fontSize:11,fontWeight:900,textTransform:'uppercase',color:'#888',marginBottom:4}}>Unité</label>
                <select value={assignForm.unite} onChange={function(e){setAssignForm(Object.assign({}, assignForm, {unite: e.target.value}))}} style={{width:'100%',padding:'10px 12px',border:'2px solid #EBEBEB',borderRadius:6,fontSize:14,background:'#fff',WebkitAppearance:'none',appearance:'none'}}>
                  <option value="kg">kg</option>
                  <option value="L">L</option>
                  <option value="U">U</option>
                </select>
              </div>
            </div>

            {assignForm.qte && parseFloat(assignForm.qte) > 0 && (
              <div style={{background:'#FFF9E5',border:'1px solid #FFEB5A',borderRadius:6,padding:'10px 12px',marginBottom:12,fontSize:13}}>
                💰 Coût ajouté : <strong>{(parseFloat(assignForm.qte) * Number(assignModal.current_price)).toFixed(3)}€</strong>
              </div>
            )}

            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button type="button" onClick={function(){setAssignModal(null)}} style={{flex:1,padding:'12px 16px',background:'#fff',border:'1px solid #DDD',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:700,color:'#666',touchAction:'manipulation',WebkitTapHighlightColor:'rgba(0,0,0,0.1)'}}>Annuler</button>
              <button type="button" onClick={assignToRecipe} disabled={assignSaving || !assignForm.recipe_id || !assignForm.qte} style={{flex:2,padding:'12px 20px',background:assignSaving||!assignForm.recipe_id||!assignForm.qte?'#CCC':'#FF82D7',color:'#fff',border:'none',borderRadius:8,cursor:assignSaving||!assignForm.recipe_id||!assignForm.qte?'not-allowed':'pointer',fontSize:14,fontWeight:900,touchAction:'manipulation',WebkitTapHighlightColor:'rgba(0,0,0,0.1)'}}>
                {assignSaving ? '⏳ ...' : '✓ Affecter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 MODAL PDF VIEWER (clic sur un prix) */}
      {pdfViewer && (
        <div 
          onClick={function(e){ if(e.target === e.currentTarget) setPdfViewer(null) }}
          style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.85)',zIndex:9999,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',background:'#191923',color:'white',borderBottom:'3px solid #FFEB5A'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:900,fontSize:14}}>📄 {pdfViewer.productName} — {pdfViewer.fournisseur}</div>
              <div style={{fontSize:11,opacity:0.7,display:'flex',gap:8}}>
                <span>{pdfViewer.date ? new Date(pdfViewer.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}) : 'Date inconnue'}</span>
                <span style={{fontWeight:900}}>{pdfViewer.price.toFixed(3)}€/{pdfViewer.unit}</span>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <a 
                href={'/api/invoice-pdf?filename=' + encodeURIComponent(pdfViewer.filename)}
                download={pdfViewer.filename}
                style={{background:'transparent',color:'white',border:'1.5px solid #fff',padding:'6px 12px',borderRadius:6,fontSize:11,fontWeight:900,textDecoration:'none'}}>
                ⬇ Télécharger
              </a>
              <button 
                onClick={function(){setPdfViewer(null)}}
                title="Fermer (Échap)"
                style={{background:'#CC0066',color:'white',border:'none',width:44,height:44,borderRadius:8,fontSize:24,fontWeight:900,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.4)',lineHeight:1}}>
                ✕
              </button>
            </div>
          </div>
          <iframe 
            src={'/api/invoice-pdf?filename=' + encodeURIComponent(pdfViewer.filename)}
            style={{flex:1,border:'none',background:'white'}}
            title="Aperçu facture" />
          <div style={{padding:'8px 20px',background:'#191923',color:'#888',fontSize:10,textAlign:'center'}}>
            Échap ou ✕ pour fermer · Cliquer hors du PDF aussi
          </div>
        </div>
      )}

      {/* 🔥 MODAL COMPARAISON FACTURES CÔTE-À-CÔTE (clic sur 📑 Comparer) */}
      {compareModal && (
        <div 
          onClick={function(e){ if(e.target === e.currentTarget) setCompareModal(null) }}
          style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.9)',zIndex:9999,display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 20px',background:'#191923',color:'white',borderBottom:'3px solid #FF82D7'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:900,fontSize:15}}>📑 Comparaison factures : <span style={{color:'#FFEB5A'}}>{compareModal.article}</span></div>
              <div style={{fontSize:11,opacity:0.7}}>
                {compareModal.products.length} fournisseur{compareModal.products.length>1?'s':''} comparé{compareModal.products.length>1?'s':''}
              </div>
            </div>
            <button 
              onClick={function(){setCompareModal(null)}}
              title="Fermer (Échap)"
              style={{background:'#CC0066',color:'white',border:'none',width:44,height:44,borderRadius:8,fontSize:24,fontWeight:900,cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.4)',lineHeight:1}}>
              ✕
            </button>
          </div>
          <div style={{flex:1,display:'flex',background:'#222',overflow:'hidden'}}>
            {compareModal.products.map(function(p, idx) {
              return (
                <div key={p.id} style={{flex:1,display:'flex',flexDirection:'column',borderRight: idx < compareModal.products.length-1 ? '2px solid #FFEB5A' : 'none'}}>
                  <div style={{padding:'8px 12px',background:'#2a2a2a',color:'white',fontSize:12,borderBottom:'1px solid #444'}}>
                    <div style={{fontWeight:900}}>{p.supplier}</div>
                    <div style={{display:'flex',gap:8,fontSize:10,opacity:0.8,marginTop:2}}>
                      <span>{p.last_invoice_date ? new Date(p.last_invoice_date).toLocaleDateString('fr-FR') : '—'}</span>
                      <span style={{color:idx===0?'#5FE89F':'#FFEB5A',fontWeight:900}}>{p.price.toFixed(3)}€/{p.unit}</span>
                      {idx===0 && <span style={{background:'#009D3A',color:'white',padding:'1px 6px',borderRadius:6,fontSize:9,fontWeight:900}}>★ MEILLEUR PRIX</span>}
                    </div>
                  </div>
                  <iframe 
                    src={'/api/invoice-pdf?filename=' + encodeURIComponent(p.last_invoice_filename)}
                    style={{flex:1,border:'none',background:'white'}}
                    title={'Facture ' + p.supplier} />
                </div>
              )
            })}
          </div>
          <div style={{padding:'8px 20px',background:'#191923',color:'#888',fontSize:10,textAlign:'center'}}>
            Comparez les conditionnements (poche, colis, sachet) pour valider l'écart de prix · Échap pour fermer
          </div>
        </div>
      )}
    </div>
  )
}
