'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import PhotoPicker from './PhotoPicker'

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
  var [achatsView, setAchatsView] = useState('pilotage')
  var [showInactiveProducts, setShowInactiveProducts] = useState(false)
  var [showOrphansToggle, setShowOrphansToggle] = useState(true)
  var [catalogSort, setCatalogSort] = useState('recent')
  var [selectedSupplier, setSelectedSupplier] = useState(null)
  var [photoPickerOpen, setPhotoPickerOpen] = useState(false)

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
        <button onClick={function(){setSelectedProduct(null)}} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'9px 16px',background:'#FFFFFF',color:'#191923',border:'2px solid #191923',borderRadius:20,fontWeight:900,fontSize:12,cursor:'pointer',marginBottom:14,boxShadow:'2px 2px 0 #191923'}} onMouseEnter={function(e){e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='3px 3px 0 #191923'}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='2px 2px 0 #191923'}}>
          <span style={{fontSize:16,lineHeight:1}}>←</span>
          <span>Retour au catalogue</span>
        </button>

        {/* PHOTO PRODUIT */}
        <div style={{marginBottom:14}}>
          {prod.photo_url ? (
            <div style={{position:'relative',borderRadius:14,overflow:'hidden',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',maxWidth:280}}>
              <img src={prod.photo_url} alt={prod.name} style={{width:'100%',aspectRatio:'1/1',objectFit:'cover',display:'block',background:'#F5F5F5'}} />
              <div style={{position:'absolute',top:8,right:8,display:'flex',gap:6}}>
                <button onClick={function(){setPhotoPickerOpen(true)}} title="Remplacer" style={{width:32,height:32,borderRadius:'50%',border:'2px solid #191923',background:'rgba(255,255,255,.95)',cursor:'pointer',fontSize:12,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>📷</button>
                <button title="Supprimer" onClick={function(){
                  if (!confirm('Supprimer la photo de ce produit ?')) return
                  sb().from('products').update({photo_url:null}).eq('id',prod.id).then(function(r){
                    if (r.error) { toast('Erreur : ' + r.error.message); return }
                    toast('✅ Photo supprimée')
                    loadData()
                    setSelectedProduct(Object.assign({}, prod, {photo_url:null}))
                  })
                }} style={{width:32,height:32,borderRadius:'50%',border:'2px solid var(--p)',background:'rgba(255,229,245,.95)',color:'var(--p)',cursor:'pointer',fontSize:12,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',padding:0}}>🗑️</button>
              </div>
            </div>
          ) : (
            <button onClick={function(){setPhotoPickerOpen(true)}} style={{padding:'18px 14px',background:'#FFFFFF',border:'2px dashed #191923',borderRadius:14,cursor:'pointer',width:'100%',maxWidth:280,display:'flex',alignItems:'center',gap:10,textAlign:'left'}}>
              <div style={{fontSize:28}}>📷</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:900}}>Ajouter une photo</div>
                <div style={{fontSize:10,opacity:.55,fontWeight:700}}>Upload ou Unsplash · détourage auto</div>
              </div>
            </button>
          )}
        </div>

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

          {siblingProducts.length > 1 && <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#FF82D7',marginTop:20,marginBottom:8}}>Fournisseurs</div>}
          {siblingProducts.length > 1 && siblingProducts.map(function(sp) {
            var spSup = suppliers.filter(function(ss) { return ss.id === sp.supplier_id })[0]
            var diff = activeProduct.id !== sp.id && Number(activeProduct.current_price) > 0 ? ((Number(sp.current_price) - Number(activeProduct.current_price)) / Number(activeProduct.current_price) * 100).toFixed(1) : null
            return (
              <div key={sp.id} style={{display:'grid',gridTemplateColumns:'1fr auto auto',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,marginBottom:6,background:sp.is_active?'#FFF9D0':'#FAFAFA',border:sp.is_active?'2px solid #FFEB5A':'1.5px solid #EEE'}}>
                {/* COL 1 : étoile + nom fournisseur + variante + ACTIF */}
                <div style={{display:'flex',alignItems:'center',gap:8,minWidth:0}}>
                  {sp.is_active && <span style={{fontSize:14,flexShrink:0}}>★</span>}
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:900,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{spSup?spSup.name:'?'}</div>
                    <div style={{fontSize:10,color:'#888',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{sp.name}</div>
                  </div>
                  {sp.is_active && <span style={{fontSize:9,fontWeight:900,color:'#8A6D00',background:'#FFEB5A',padding:'2px 7px',borderRadius:10,flexShrink:0}}>ACTIF</span>}
                </div>
                {/* COL 2 : prix + édition + variation */}
                <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0,justifyContent:'flex-end'}}>
                  {editingPriceId === sp.id ? (
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <input type="text" inputMode="decimal" autoFocus value={editingPriceVal} onChange={function(e){setEditingPriceVal(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter'){savePrice(sp.id, editingPriceVal)}if(e.key==='Escape'){setEditingPriceId(null);setEditingPriceVal('')}}} style={{width:70,padding:'4px 6px',fontSize:13,fontWeight:900,border:'2px solid #FF82D7',borderRadius:4,textAlign:'right'}} />
                      <span style={{fontSize:11,color:'#888'}}>€/{sp.unit}</span>
                      <button onClick={function(){savePrice(sp.id, editingPriceVal)}} disabled={savingPrice} style={{padding:'3px 8px',background:savingPrice?'#CCC':'#009D3A',color:'#fff',border:'none',borderRadius:4,cursor:savingPrice?'wait':'pointer',fontSize:10,fontWeight:900}}>{savingPrice?'⏳':'✓'}</button>
                      <button onClick={function(){setEditingPriceId(null);setEditingPriceVal('')}} style={{padding:'3px 6px',background:'#fff',color:'#888',border:'1px solid #DDD',borderRadius:4,cursor:'pointer',fontSize:10}}>✕</button>
                    </div>
                  ) : (
                    <span onClick={function(){setEditingPriceId(sp.id);setEditingPriceVal(Number(sp.current_price).toFixed(2))}} style={{fontWeight:900,fontSize:14,cursor:'pointer',whiteSpace:'nowrap'}} title="Cliquer pour modifier">{Number(sp.current_price).toFixed(2)}€/{sp.unit} <span style={{fontSize:10,opacity:.45}}>✏️</span></span>
                  )}
                  {diff !== null && editingPriceId !== sp.id && (
                    <span style={{fontSize:11,fontWeight:900,color:Number(diff)>0?'#CC0066':'#009D3A',background:Number(diff)>0?'#FFE5F0':'#E8FFE8',padding:'2px 7px',borderRadius:10,minWidth:42,textAlign:'center',whiteSpace:'nowrap'}}>{Number(diff)>0?'+':''}{diff}%</span>
                  )}
                </div>
                {/* COL 3 : bouton ACTIVER si inactif */}
                <div style={{flexShrink:0,minWidth:0}}>
                  {!sp.is_active && editingPriceId !== sp.id && <button onClick={function(){toggleActive(sp.id, articleId)}} style={{padding:'4px 10px',fontSize:10,fontWeight:900,borderRadius:14,border:'2px solid #191923',background:'#fff',cursor:'pointer',whiteSpace:'nowrap'}}>ACTIVER</button>}
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

          <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#FF82D7',marginTop:24,marginBottom:8}}>Historique factures</div>
          {allPricesForArticle.length > 0 ? (
            <div style={{border:'1.5px solid #EEE',borderRadius:10,overflow:'hidden'}}>
              {/* Header tableau */}
              <div style={{display:'grid',gridTemplateColumns:'90px 1fr 100px 110px 70px',gap:10,padding:'8px 12px',background:'#FAFAFA',borderBottom:'1.5px solid #EEE',fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,opacity:.55}}>
                <span>Date</span>
                <span>Fournisseur</span>
                <span style={{textAlign:'center'}}>Conditt</span>
                <span style={{textAlign:'right'}}>Prix unitaire</span>
                <span style={{textAlign:'center'}}>Facture</span>
              </div>
              {/* Lignes */}
              {allPricesForArticle.slice().reverse().map(function(ph) {
                var phSup = supplierMapForChart[ph.product_id] || '?'
                var hasInvoice = !!ph.invoice_path
                return (
                  <div key={ph.id} style={{display:'grid',gridTemplateColumns:'90px 1fr 100px 110px 70px',gap:10,padding:'9px 12px',borderBottom:'1px solid #F5F5F5',alignItems:'center',fontSize:12,background:'#FFFFFF'}}>
                    <span style={{fontWeight:700,whiteSpace:'nowrap'}}>{new Date(ph.invoice_date).toLocaleDateString('fr-FR')}</span>
                    <span style={{fontSize:12,color:'#191923',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{phSup}</span>
                    <span style={{fontSize:10,color:'#666',textAlign:'center',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ph.pack_label || '—'}</span>
                    <span style={{fontWeight:900,textAlign:'right',whiteSpace:'nowrap'}}>{Number(ph.master_unit_price).toFixed(2)}€/{prod.unit}</span>
                    <div style={{display:'flex',justifyContent:'center'}}>
                      {hasInvoice ? (
                        <button onClick={function(){openInvoice(ph.invoice_path)}} title={'Ouvrir '+(ph.invoice_filename||'facture')} style={{padding:'4px 10px',background:'var(--y)',color:'#191923',border:'1.5px solid #191923',borderRadius:14,fontSize:11,fontWeight:900,cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}} onMouseEnter={function(e){e.currentTarget.style.background='#FFD93D'}} onMouseLeave={function(e){e.currentTarget.style.background='var(--y)'}}>
                          📄 Voir
                        </button>
                      ) : (
                        <span style={{fontSize:10,opacity:.4}}>—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : <div style={{fontSize:13,color:'#888'}}>Aucune facture importée pour ce produit.</div>}
        </div>

        {/* ========== PHOTO PICKER MODAL (dans la vue détail) ========== */}
        {photoPickerOpen && (
          <PhotoPicker
            productId={prod.id}
            productName={prod.name}
            toast={toast}
            onClose={function(){setPhotoPickerOpen(false)}}
            onUploaded={function(url){
              setPhotoPickerOpen(false)
              loadData()
              setSelectedProduct(Object.assign({}, prod, {photo_url:url}))
            }}
          />
        )}
      </div>
    )
  }

  // =========================================================================
  // VUE PRINCIPALE — sections par fournisseur + comparateur + orphans
  // =========================================================================
  return (
    <div>
      {/* ============ HEADER PILOTAGE ============ */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:10,flexWrap:'wrap'}}>
        <div>
          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:32,color:'var(--p)',lineHeight:1}}>Achats</div>
          <div style={{fontSize:11,opacity:.55,fontWeight:700,marginTop:2}}>{products.filter(function(p){return p.is_active}).length} produits actifs · {activeSuppliers.length} fournisseurs</div>
        </div>
        <input type="text" placeholder="🔍 Chercher un produit, un fournisseur…" value={searchQ} onChange={function(e){setSearchQ(e.target.value)}} style={{flex:1,minWidth:220,maxWidth:380,padding:'10px 14px',fontSize:13,border:'2px solid #191923',borderRadius:20,background:'#fff',fontWeight:700,boxShadow:'2px 2px 0 #191923'}} />
      </div>

      {/* ============ ONGLETS PILOTAGE / CATALOGUE ============ */}
      <div style={{display:'flex',gap:6,marginBottom:18}}>
        {[{id:'pilotage',label:'Pilotage',emoji:'📊'},{id:'fournisseurs',label:'Fournisseurs',emoji:'🏢'},{id:'catalogue',label:'Catalogue',emoji:'📦'}].map(function(t){
          var active = achatsView === t.id
          return <button key={t.id} onClick={function(){setAchatsView(t.id)}} style={{padding:'8px 18px',background:active?'var(--p)':'#FFFFFF',color:active?'#FFFFFF':'#191923',border:'2px solid #191923',borderRadius:20,fontWeight:900,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:active?'2px 2px 0 #191923':'none'}}>
            <span style={{fontSize:14}}>{t.emoji}</span>{t.label}
          </button>
        })}
      </div>

      {/* ============ VUE PILOTAGE (Sprint 1) ============ */}
      {achatsView === 'pilotage' && (function(){
        // 1. Variations récentes (30 derniers jours, |%| >= 5)
        // On reconstruit depuis l'historique côté front
        var byProduct = {}
        prices.forEach(function(pr){
          if (!byProduct[pr.product_id]) byProduct[pr.product_id] = []
          byProduct[pr.product_id].push(pr)
        })
        var thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000
        var variations = []
        Object.keys(byProduct).forEach(function(pid){
          var arr = byProduct[pid].slice().sort(function(a,b){ return new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime() })
          if (arr.length < 2) return
          // Dernier prix vs précédent
          var last = arr[arr.length - 1]
          var prev = arr[arr.length - 2]
          var lastDate = new Date(last.invoice_date).getTime()
          if (lastDate < thirtyDaysAgo) return
          var lp = Number(last.unit_price_ht); var pp = Number(prev.unit_price_ht)
          if (!lp || !pp || pp === 0) return
          var pct = (lp - pp) / pp * 100
          if (Math.abs(pct) < 5) return
          var product = products.filter(function(x){ return x.id === pid })[0]
          if (!product) return
          var sup = suppliers.filter(function(s){ return s.id === product.supplier_id })[0]
          // Sparkline data : 6 derniers points
          var spark = arr.slice(-6).map(function(p){ return Number(p.unit_price_ht) })
          variations.push({
            product: product, supplier: sup, last: lp, prev: pp, pct: pct, lastDate: last.invoice_date,
            invoiceFile: last.invoice_filename, spark: spark
          })
        })
        // Hausses d'abord, par |%| décroissant
        var hausses = variations.filter(function(v){ return v.pct > 0 }).sort(function(a,b){ return b.pct - a.pct })
        var baisses = variations.filter(function(v){ return v.pct < 0 }).sort(function(a,b){ return a.pct - b.pct })

        // 2. Économies possibles : top 5 du comparateur (déjà calculé en `comparisons`)
        var topEconomies = comparisons.filter(function(c){ return c.sameUnit && Number(c.saving) >= 10 }).slice(0, 5)

        // 3. KPIs santé
        var nbProducts = products.filter(function(p){ return p.is_active }).length
        var nbHausses = hausses.length
        var nbBaisses = baisses.length
        var totalSavings = 0
        topEconomies.forEach(function(c){
          // Économie possible = différence prix * qté annuelle ? On n'a pas le volume.
          // À défaut, on affiche juste le % moyen.
          totalSavings += Number(c.saving)
        })
        var avgSavingPct = topEconomies.length > 0 ? (totalSavings / topEconomies.length).toFixed(0) : 0
        var nbAlertesActives = comparisons.filter(function(c){ return c.sameUnit && Number(c.saving) >= 10 }).length

        // Fournisseur le plus actif (par nb produits)
        var supplierCounts = {}
        products.forEach(function(p){
          if (!p.is_active) return
          supplierCounts[p.supplier_id] = (supplierCounts[p.supplier_id] || 0) + 1
        })
        var topSupId = null; var topSupCount = 0
        Object.keys(supplierCounts).forEach(function(sid){
          if (supplierCounts[sid] > topSupCount) { topSupId = sid; topSupCount = supplierCounts[sid] }
        })
        var topSup = suppliers.filter(function(s){ return s.id === topSupId })[0]

        // Mini sparkline component
        function Sparkline(p){
          var rawData = p.data || []
          var data = rawData.filter(function(v){ return typeof v === 'number' && !isNaN(v) && isFinite(v) })
          if (data.length < 2) return null
          var mn = Math.min.apply(null, data); var mx = Math.max.apply(null, data)
          var range = mx - mn || 1
          var w = 60; var h = 22
          var step = w / (data.length - 1)
          var pts = data.map(function(v, i){
            var x = i * step
            var y = range > 0 ? h - ((v - mn) / range) * h : h / 2
            if (!isFinite(x) || !isFinite(y)) return ''
            return x.toFixed(1) + ',' + y.toFixed(1)
          }).filter(function(s){ return s.length > 0 }).join(' ')
          if (!pts) return null
          var color = p.color || '#191923'
          var last = data[data.length - 1]; var first = data[0]
          var dotColor = last >= first ? '#CC0066' : '#009D3A'
          var lastX = (data.length - 1) * step
          var lastY = h - ((last - mn) / range) * h
          return <svg width={w} height={h} style={{flexShrink:0}}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="2.5" fill={dotColor} />
          </svg>
        }

        return (
          <div>
            {/* 4 TUILES KPI */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:10,marginBottom:18}}>
              <div style={{background:'#FFFFFF',borderRadius:14,padding:'14px 16px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Produits actifs</div>
                <div style={{fontSize:30,fontWeight:900,lineHeight:1.1,marginTop:4}}>{nbProducts}</div>
                <div style={{fontSize:9,opacity:.55,marginTop:2,fontWeight:700}}>chez {activeSuppliers.length} fournisseurs</div>
              </div>
              <div onClick={function(){if(hausses.length>0){var el=document.getElementById('block-hausses');if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}}} style={{background:'#FFFFFF',borderRadius:14,padding:'14px 16px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',cursor:hausses.length>0?'pointer':'default',transition:'transform .12s'}} onMouseEnter={function(e){if(hausses.length>0){e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='4px 4px 0 #191923'}}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 #191923'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{width:9,height:9,borderRadius:'50%',background:nbHausses>0?'var(--p)':'#009D3A',flexShrink:0}}></span>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.55,letterSpacing:.5}}>Hausses 30j</div>
                </div>
                <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                  <div style={{fontSize:30,fontWeight:900,color:nbHausses>0?'var(--p)':'#009D3A',lineHeight:1.1,marginTop:4}}>{nbHausses}</div>
                  {nbHausses>0 && <span style={{fontSize:10,color:'var(--p)',fontWeight:900}}>voir ↓</span>}
                </div>
                <div style={{fontSize:9,opacity:.55,marginTop:2,fontWeight:700}}>{nbHausses>0?'≥ 5% sur 30 jours':'Aucune hausse 🎉'}</div>
              </div>
              <div onClick={function(){if(topEconomies.length>0){var el=document.getElementById('block-economies');if(el)el.scrollIntoView({behavior:'smooth',block:'start'})}}} style={{background:'#FFFFFF',borderRadius:14,padding:'14px 16px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',cursor:topEconomies.length>0?'pointer':'default',transition:'transform .12s'}} onMouseEnter={function(e){if(topEconomies.length>0){e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='4px 4px 0 #191923'}}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 #191923'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11,lineHeight:1}}>💰</span>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.55,letterSpacing:.5}}>Économies possibles</div>
                </div>
                <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                  <div style={{fontSize:30,fontWeight:900,color:'#009D3A',lineHeight:1.1,marginTop:4}}>{topEconomies.length}</div>
                  {topEconomies.length>0 && <span style={{fontSize:10,color:'#009D3A',fontWeight:900}}>voir ↓</span>}
                </div>
                <div style={{fontSize:9,opacity:.55,marginTop:2,fontWeight:700}}>{topEconomies.length>0?'jusqu\'à -'+avgSavingPct+'% en moy.':'Tout est optimisé'}</div>
              </div>
              {topSup && (
                <div style={{background:'#FFFFFF',borderRadius:14,padding:'14px 16px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:11,lineHeight:1}}>🏆</span>
                    <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.55,letterSpacing:.5}}>Top fournisseur</div>
                  </div>
                  <div style={{fontSize:14,fontWeight:900,lineHeight:1.15,marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{topSup.name}</div>
                  <div style={{fontSize:11,marginTop:2,fontWeight:700,color:'#191923'}}>{topSupCount} produits actifs</div>
                </div>
              )}
            </div>

            {/* BLOC HAUSSES RÉCENTES */}
            {hausses.length > 0 && (
              <div id="block-hausses" style={{background:'#FFFFFF',borderRadius:14,padding:16,marginBottom:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:8,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'var(--p)',lineHeight:1}}>Hausses récentes</div>
                    <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2}}>{hausses.length} variation{hausses.length>1?'s':''} ≥ +5% sur les 30 derniers jours</div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {hausses.slice(0, 8).map(function(v, i){
                    var dateStr = new Date(v.lastDate).toLocaleDateString('fr-FR', {day:'2-digit',month:'short'})
                    return (
                      <div key={i} onClick={function(){setSelectedProduct(v.product)}} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',background:'#FFFFFF',border:'2px solid #191923',borderRadius:10,cursor:'pointer',boxShadow:'2px 2px 0 #191923',transition:'transform .12s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='3px 3px 0 #191923'}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='2px 2px 0 #191923'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.product.name}</div>
                          <div style={{fontSize:10,opacity:.55,fontWeight:700,marginTop:2}}>{v.supplier ? v.supplier.name : '?'} · {dateStr} · {v.prev.toFixed(2)}€ → {v.last.toFixed(2)}€/{v.product.unit}</div>
                        </div>
                        <Sparkline data={v.spark} color="#191923" />
                        <div style={{minWidth:60,textAlign:'right'}}>
                          <div style={{fontSize:18,fontWeight:900,color:'var(--p)',lineHeight:1}}>+{v.pct.toFixed(0)}%</div>
                        </div>
                        <div style={{fontSize:14,opacity:.55,fontWeight:900}}>›</div>
                      </div>
                    )
                  })}
                </div>
                {hausses.length > 8 && <div style={{fontSize:10,fontWeight:700,opacity:.5,marginTop:8,textAlign:'center'}}>+ {hausses.length - 8} autres dans le catalogue ↓</div>}
              </div>
            )}

            {/* BLOC ÉCONOMIES POSSIBLES */}
            {topEconomies.length > 0 && (
              <div id="block-economies" style={{background:'#FFFFFF',borderRadius:14,padding:16,marginBottom:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:8,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'var(--p)',lineHeight:1}}>💰 Économies possibles</div>
                    <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2}}>Mêmes articles disponibles ailleurs · {topEconomies.length} opportunités ≥ 10%</div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {topEconomies.map(function(c, i){
                    var cheapest = c.products[0]
                    var current = c.products.filter(function(p){return p.is_active})[0] || c.products[c.products.length-1]
                    return (
                      <div key={i} style={{padding:'10px 12px',background:'#FFFFFF',border:'2px solid #191923',borderRadius:10,boxShadow:'2px 2px 0 #191923'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:900}}>{c.article}</div>
                            <div style={{fontSize:10,opacity:.7,fontWeight:700,marginTop:3}}>
                              <span>Actuel : <strong>{current.supplier}</strong> {current.price.toFixed(2)}€/{current.unit}</span>
                              <span style={{margin:'0 6px',opacity:.4}}>→</span>
                              <span>Moins cher : <strong style={{color:'#009D3A'}}>{cheapest.supplier}</strong> {cheapest.price.toFixed(2)}€/{cheapest.unit}</span>
                            </div>
                          </div>
                          <div style={{background:'#E8F8EE',color:'#009D3A',padding:'4px 12px',borderRadius:14,fontSize:13,fontWeight:900,border:'1.5px solid #009D3A',flexShrink:0}}>
                            -{c.saving}%
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* BLOC BAISSES (bonus, plus discret) */}
            {baisses.length > 0 && (
              <div style={{background:'#FFFFFF',borderRadius:14,padding:16,marginBottom:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,gap:8,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#009D3A',lineHeight:1}}>🎉 Bonnes nouvelles</div>
                    <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2}}>{baisses.length} baisse{baisses.length>1?'s':''} de prix ce mois</div>
                  </div>
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {baisses.slice(0, 6).map(function(v, i){
                    return (
                      <div key={i} onClick={function(){setSelectedProduct(v.product)}} style={{padding:'6px 10px',background:'#E8F8EE',border:'1.5px solid #009D3A',borderRadius:10,cursor:'pointer',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
                        <span style={{color:'#191923'}}>{v.product.name}</span>
                        <span style={{color:'#009D3A',fontWeight:900}}>{v.pct.toFixed(0)}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {variations.length === 0 && topEconomies.length === 0 && (
              <div style={{padding:40,textAlign:'center',opacity:.5,fontSize:13,background:'#FFFFFF',borderRadius:14,border:'2px dashed #DDD',fontWeight:700}}>
                Aucune variation ni économie détectée. Tes prix sont stables et bien négociés. 👌
              </div>
            )}
          </div>
        )
      })()}

      {/* ============ VUE FOURNISSEURS V1 (Sprint 3) ============ */}
      {achatsView === 'fournisseurs' && (function(){
        // Calcul agrégé par fournisseur
        // 1. Total payé ce mois (calendaire) + nb factures + dernière date
        var now = new Date()
        var firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
        var firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
        var firstOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime()

        // Pour chaque fournisseur : agréger via products → product_prices
        var bySupplier = {}
        suppliers.forEach(function(s){
          if (s.archived) return
          bySupplier[s.id] = {
            supplier: s,
            nbProductsActive: 0,
            totalThisMonth: 0,
            totalPrevMonth: 0,
            nbInvoicesThisMonth: 0,
            lastInvoiceDate: null,
            monthly6: [0,0,0,0,0,0], // 6 derniers mois (du plus ancien au plus récent)
            products: []
          }
        })

        products.forEach(function(p){
          if (!bySupplier[p.supplier_id]) return
          var bucket = bySupplier[p.supplier_id]
          if (p.is_active) bucket.nbProductsActive++
          bucket.products.push(p)
        })

        // Invoice dates uniques par fournisseur pour le mois
        var invoicesSeenThisMonth = {} // {supId: {filename: true}}
        prices.forEach(function(pp){
          var product = products.filter(function(x){ return x.id === pp.product_id })[0]
          if (!product) return
          var bucket = bySupplier[product.supplier_id]
          if (!bucket) return
          var d = new Date(pp.invoice_date).getTime()
          var packTotal = Number(pp.pack_price || 0)
          // Mois en cours
          if (d >= firstOfMonth && d < firstOfNextMonth) {
            bucket.totalThisMonth += packTotal
            if (pp.invoice_filename) {
              if (!invoicesSeenThisMonth[product.supplier_id]) invoicesSeenThisMonth[product.supplier_id] = {}
              invoicesSeenThisMonth[product.supplier_id][pp.invoice_filename] = true
            }
          }
          // Mois précédent
          if (d >= firstOfPrevMonth && d < firstOfMonth) {
            bucket.totalPrevMonth += packTotal
          }
          // Dernière facture (toute date)
          var dateMs = new Date(pp.invoice_date).getTime()
          if (!bucket.lastInvoiceDate || dateMs > bucket.lastInvoiceDate) bucket.lastInvoiceDate = dateMs
          // Sparkline 6 derniers mois
          var deltaMonths = (now.getFullYear() - new Date(pp.invoice_date).getFullYear()) * 12 + (now.getMonth() - new Date(pp.invoice_date).getMonth())
          if (deltaMonths >= 0 && deltaMonths < 6) {
            bucket.monthly6[5 - deltaMonths] += packTotal
          }
        })
        // Compter nb factures du mois
        Object.keys(invoicesSeenThisMonth).forEach(function(supId){
          if (bySupplier[supId]) bySupplier[supId].nbInvoicesThisMonth = Object.keys(invoicesSeenThisMonth[supId]).length
        })

        var supplierCards = Object.values(bySupplier)
          .filter(function(b){ return b.nbProductsActive > 0 })
          .sort(function(a,b){ return b.totalThisMonth - a.totalThisMonth })

        // Catégorie : gradient + emoji
        function catGradient(cat){
          if (cat === 'boisson') return 'linear-gradient(135deg, #FFE5F5 0%, #FFE5E5 100%)'
          if (cat === 'packaging') return 'linear-gradient(135deg, #F0F4FF 0%, #DCE7FF 100%)'
          if (cat === 'consommable') return 'linear-gradient(135deg, #F0FFF4 0%, #DCF7E3 100%)'
          return 'linear-gradient(135deg, var(--y) 0%, #FFF5C2 100%)'
        }
        function catEmoji(cat){
          if (cat === 'boisson') return '🥤'
          if (cat === 'packaging') return '📦'
          if (cat === 'consommable') return '🧽'
          return '🥬'
        }
        function fmtEur(n){ return Math.round(Number(n || 0)).toLocaleString('fr-FR') + '€' }
        function fmtDate(ms){ if(!ms) return '—'; var d = new Date(ms); var dt = (now.getTime() - ms) / (24*3600*1000); if (dt < 1) return "aujourd'hui"; if (dt < 2) return 'hier'; if (dt < 30) return 'il y a ' + Math.floor(dt) + 'j'; return d.toLocaleDateString('fr-FR', {day:'2-digit', month:'short'}) }

        // Mini sparkline (réutilisable)
        function Sparkline(p){
          var rawData = p.data || []
          var data = rawData.filter(function(v){ return typeof v === 'number' && !isNaN(v) && isFinite(v) })
          if (data.length < 2) return null
          var mn = Math.min.apply(null, data); var mx = Math.max.apply(null, data)
          var range = mx - mn || 1
          var w = p.w || 60; var h = p.h || 22
          var step = w / (data.length - 1)
          var pts = data.map(function(v, i){
            var x = i * step
            var y = range > 0 ? h - ((v - mn) / range) * h : h / 2
            if (!isFinite(x) || !isFinite(y)) return ''
            return x.toFixed(1) + ',' + y.toFixed(1)
          }).filter(function(s){ return s.length > 0 }).join(' ')
          if (!pts) return null
          var color = p.color || '#191923'
          return <svg width={w} height={h} style={{flexShrink:0}}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }

        // =========== VUE DÉTAIL FOURNISSEUR ===========
        if (selectedSupplier) {
          var b = bySupplier[selectedSupplier.id]
          if (!b) { setSelectedSupplier(null); return null }
          var s = b.supplier

          // Variation panier mois vs mois précédent
          var diff = b.totalThisMonth - b.totalPrevMonth
          var diffPct = b.totalPrevMonth > 0 ? (diff / b.totalPrevMonth * 100) : 0
          var diffColor = diffPct > 5 ? 'var(--p)' : (diffPct < -5 ? '#009D3A' : '#191923')
          var diffArrow = diffPct > 5 ? '↗' : (diffPct < -5 ? '↘' : '→')

          // Produits triés par variation récente |%|
          var prodTrends = b.products.filter(function(p){ return p.is_active }).map(function(p){
            var arr = prices.filter(function(pp){ return pp.product_id === p.id }).slice().sort(function(a,b){ return new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime() })
            var pct = 0
            if (arr.length >= 2) {
              var last = Number(arr[arr.length-1].master_unit_price)
              var prev = Number(arr[arr.length-2].master_unit_price)
              if (prev > 0) pct = (last - prev) / prev * 100
            }
            return { product: p, pct: pct, lastDate: arr.length > 0 ? arr[arr.length-1].invoice_date : null }
          })
          prodTrends.sort(function(a,b){ return Math.abs(b.pct) - Math.abs(a.pct) })

          // Dernières factures
          var lastInvoices = []
          var seen = {}
          prices.slice().sort(function(a,b){ return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime() }).forEach(function(pp){
            var product = products.filter(function(x){ return x.id === pp.product_id })[0]
            if (!product || product.supplier_id !== s.id) return
            if (!pp.invoice_filename) return
            if (seen[pp.invoice_filename]) return
            seen[pp.invoice_filename] = true
            lastInvoices.push({ filename: pp.invoice_filename, date: pp.invoice_date, path: pp.invoice_path })
          })
          lastInvoices = lastInvoices.slice(0, 8)

          return (
            <div>
              {/* Header fournisseur */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                <button onClick={function(){setSelectedSupplier(null)}} style={{width:36,height:36,borderRadius:'50%',border:'2px solid #191923',background:'#FFFFFF',cursor:'pointer',fontSize:16,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,padding:0}}>←</button>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:32,color:'var(--p)',lineHeight:1}}>{s.name}</div>
                  <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2,textTransform:'capitalize'}}>{catEmoji(s.category)} {s.category || 'ingredient'} · {b.nbProductsActive} produits actifs</div>
                </div>
              </div>

              {/* 4 KPIs */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:18}}>
                <div style={{background:'#FFFFFF',borderRadius:14,padding:'12px 14px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Ce mois</div>
                  <div style={{fontSize:24,fontWeight:900,lineHeight:1.1,marginTop:4}}>{fmtEur(b.totalThisMonth)}</div>
                  <div style={{fontSize:9,opacity:.55,marginTop:2,fontWeight:700}}>{b.nbInvoicesThisMonth} facture{b.nbInvoicesThisMonth>1?'s':''}</div>
                </div>
                <div style={{background:'#FFFFFF',borderRadius:14,padding:'12px 14px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Mois précédent</div>
                  <div style={{fontSize:24,fontWeight:900,lineHeight:1.1,marginTop:4,opacity:.65}}>{fmtEur(b.totalPrevMonth)}</div>
                </div>
                <div style={{background:'#FFFFFF',borderRadius:14,padding:'12px 14px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:9,height:9,borderRadius:'50%',background:diffColor,flexShrink:0}}></span>
                    <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Variation</div>
                  </div>
                  <div style={{fontSize:22,fontWeight:900,color:diffColor,lineHeight:1.1,marginTop:4}}>{diffArrow} {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(0)}%</div>
                </div>
                <div style={{background:'#FFFFFF',borderRadius:14,padding:'12px 14px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Dernière facture</div>
                  <div style={{fontSize:16,fontWeight:900,lineHeight:1.15,marginTop:4}}>{fmtDate(b.lastInvoiceDate)}</div>
                </div>
              </div>

              {/* Graphe 6 mois */}
              <div style={{background:'#FFFFFF',borderRadius:14,padding:16,marginBottom:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'var(--p)',lineHeight:1,marginBottom:8}}>Évolution panier — 6 derniers mois</div>
                {(function(){
                  var maxVal = Math.max.apply(null, b.monthly6) || 1
                  return (
                    <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120,padding:'10px 0'}}>
                      {b.monthly6.map(function(v, i){
                        var d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
                        var label = d.toLocaleDateString('fr-FR', { month:'short' })
                        var pct = (v / maxVal) * 100
                        var isCurrent = i === 5
                        return (
                          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,minWidth:0}}>
                            <div style={{fontSize:11,fontWeight:900,color:isCurrent?'var(--p)':'#191923',whiteSpace:'nowrap'}}>{v >= 1 ? fmtEur(v) : '—'}</div>
                            <div style={{width:'100%',height:80,background:'#F5F5F5',borderRadius:6,position:'relative',overflow:'hidden'}}>
                              <div style={{position:'absolute',bottom:0,left:0,right:0,height:pct+'%',background:isCurrent?'var(--p)':'var(--y)',borderTop:'2px solid #191923',transition:'height .3s'}}></div>
                            </div>
                            <div style={{fontSize:10,fontWeight:700,opacity:.55,textTransform:'uppercase'}}>{label}</div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Produits triés par variation */}
              <div style={{background:'#FFFFFF',borderRadius:14,padding:16,marginBottom:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,gap:8,flexWrap:'wrap'}}>
                  <div>
                    <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'var(--p)',lineHeight:1}}>Produits</div>
                    <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2}}>{prodTrends.length} actifs · triés par variation récente</div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {prodTrends.slice(0, 12).map(function(pt){
                    var pct = pt.pct
                    var color = '#191923'
                    var arrow = '→'
                    if (pct >= 5) { color = 'var(--p)'; arrow = '↗' }
                    else if (pct <= -5) { color = '#009D3A'; arrow = '↘' }
                    return (
                      <div key={pt.product.id} onClick={function(){setSelectedProduct(pt.product);setSelectedSupplier(null)}} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',background:'#FFFFFF',border:'1.5px solid #EEE',borderRadius:10,cursor:'pointer'}} onMouseEnter={function(e){e.currentTarget.style.background='#FAFAFA'}} onMouseLeave={function(e){e.currentTarget.style.background='#FFFFFF'}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{pt.product.name}</div>
                          <div style={{fontSize:10,opacity:.55,fontWeight:700,marginTop:2}}>{Number(pt.product.current_price).toFixed(2)}€/{pt.product.unit}</div>
                        </div>
                        {pct !== 0 && (
                          <div style={{fontSize:13,fontWeight:900,color:color,whiteSpace:'nowrap'}}>{arrow} {pct >= 0 ? '+' : ''}{pct.toFixed(0)}%</div>
                        )}
                        <div style={{fontSize:14,opacity:.55,fontWeight:900}}>›</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Dernières factures */}
              {lastInvoices.length > 0 && (
                <div style={{background:'#FFFFFF',borderRadius:14,padding:16,marginBottom:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'var(--p)',lineHeight:1,marginBottom:10}}>Dernières factures</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {lastInvoices.map(function(inv, i){
                      var d = new Date(inv.date).toLocaleDateString('fr-FR', {day:'2-digit', month:'short', year:'2-digit'})
                      return (
                        <div key={i} onClick={function(){setPdfViewer({filename:inv.filename,fournisseur:s.name,date:inv.date,productName:'Facture',price:0,unit:''})}} style={{padding:'8px 12px',background:'var(--y)',border:'2px solid #191923',borderRadius:10,cursor:'pointer',fontSize:11,fontWeight:900,display:'flex',alignItems:'center',gap:6}}>
                          <span>📄</span>
                          <span>{d}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        }

        // =========== VUE LISTE FOURNISSEURS ===========
        return (
          <div>
            <div style={{fontSize:11,fontWeight:700,opacity:.55,marginBottom:14}}>{supplierCards.length} fournisseur{supplierCards.length>1?'s':''} actif{supplierCards.length>1?'s':''} · triés par € achats du mois</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:14}}>
              {supplierCards.map(function(b){
                var s = b.supplier
                var diff = b.totalThisMonth - b.totalPrevMonth
                var diffPct = b.totalPrevMonth > 0 ? (diff / b.totalPrevMonth * 100) : 0
                var diffColor = diffPct > 5 ? 'var(--p)' : (diffPct < -5 ? '#009D3A' : '#191923')
                var diffArrow = diffPct > 5 ? '↗' : (diffPct < -5 ? '↘' : '→')
                return (
                  <div key={s.id} onClick={function(){setSelectedSupplier(s)}} style={{background:'#FFFFFF',borderRadius:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',overflow:'hidden',cursor:'pointer',display:'flex',flexDirection:'column',transition:'transform .12s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='4px 4px 0 #191923'}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 #191923'}}>
                    {/* Header coloré par catégorie avec nom */}
                    <div style={{padding:'14px 14px 12px',background:catGradient(s.category),borderBottom:'2px solid #191923',position:'relative'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                        <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'#191923',lineHeight:1,flex:1,minWidth:0,wordBreak:'break-word'}}>{s.name}</div>
                        <span style={{fontSize:22,flexShrink:0}}>{catEmoji(s.category)}</span>
                      </div>
                      <div style={{fontSize:9,fontWeight:900,opacity:.7,textTransform:'uppercase',letterSpacing:.5,marginTop:4}}>{s.category || 'ingredient'}</div>
                    </div>
                    {/* Stats */}
                    <div style={{padding:'12px 14px',flex:1,display:'flex',flexDirection:'column',gap:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                        <div>
                          <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Ce mois</div>
                          <div style={{fontSize:22,fontWeight:900,lineHeight:1,marginTop:2}}>{fmtEur(b.totalThisMonth)}</div>
                        </div>
                        {b.totalPrevMonth > 0 && (
                          <div style={{fontSize:13,fontWeight:900,color:diffColor,whiteSpace:'nowrap'}}>
                            {diffArrow} {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(0)}%
                          </div>
                        )}
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,fontWeight:700,opacity:.7,paddingTop:6,borderTop:'1px solid #EEE'}}>
                        <span>{b.nbProductsActive} produits</span>
                        <span>📄 {fmtDate(b.lastInvoiceDate)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {supplierCards.length === 0 && (
              <div style={{padding:40,textAlign:'center',opacity:.5,fontSize:13,background:'#FFFFFF',borderRadius:14,border:'2px dashed #DDD',fontWeight:700}}>Aucun fournisseur actif</div>
            )}
          </div>
        )
      })()}
      {/* ============ VUE CATALOGUE V2 (Sprint 2) ============ */}
      {achatsView === 'catalogue' && (function(){
        // États de filtrage avancé via state (déjà déclarés en haut)
        // Calcul tendance prix sur 30j par produit (réutilise byProduct)
        var byProduct = {}
        prices.forEach(function(pr){
          if (!byProduct[pr.product_id]) byProduct[pr.product_id] = []
          byProduct[pr.product_id].push(pr)
        })
        // Pour chaque produit actif : last_price, prev_price, variation%, sparkline
        function getTrend(productId) {
          var arr = byProduct[productId] || []
          if (arr.length < 2) return { pct: 0, spark: [], last: null }
          arr = arr.slice().sort(function(a,b){ return new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime() })
          var last = Number(arr[arr.length-1].unit_price_ht)
          var prev = Number(arr[arr.length-2].unit_price_ht)
          var pct = prev > 0 ? (last - prev) / prev * 100 : 0
          var spark = arr.slice(-6).map(function(p){ return Number(p.unit_price_ht) })
          return { pct: pct, spark: spark, last: last }
        }

        // Article ID → nb de fournisseurs alternatifs disponibles
        var artFournisseursCount = {}
        products.forEach(function(p){
          if (!p.is_active || !p.article_id) return
          artFournisseursCount[p.article_id] = (artFournisseursCount[p.article_id] || 0) + 1
        })

        // Set des product_id utilisés en recettes
        var usedProductIds = {}; var usedArticleIds = {}
        recipeIngs.forEach(function(ri){
          if (!ri.product_id) return
          usedProductIds[ri.product_id] = 1
          var pr = products.filter(function(x){ return x.id === ri.product_id })[0]
          if (pr && pr.article_id) usedArticleIds[pr.article_id] = 1
        })

        // Filtrer + chercher (NOTE : on travaille toujours sur products, on groupera par article ENSUITE)
        var list = products.slice()
        // Toggle inactifs
        if (!showInactiveProducts) {
          list = list.filter(function(p){ return p.is_active })
        }
        // Catégorie
        if (catFilter !== 'all') {
          list = list.filter(function(p){
            var s = suppliers.filter(function(ss){ return ss.id === p.supplier_id })[0]
            return s && s.category === catFilter
          })
        }
        // Recherche texte (nom produit ou fournisseur)
        if (searchQ && searchQ.trim().length > 0) {
          var q = searchQ.toLowerCase().trim()
          list = list.filter(function(p){
            if ((p.name || '').toLowerCase().indexOf(q) > -1) return true
            var s = suppliers.filter(function(ss){ return ss.id === p.supplier_id })[0]
            if (s && (s.name || '').toLowerCase().indexOf(q) > -1) return true
            // Aussi chercher dans le nom de l'article parent
            var art = articles.filter(function(a){ return a.id === p.article_id })[0]
            if (art && (art.name || '').toLowerCase().indexOf(q) > -1) return true
            return false
          })
        }
        // Orphelins
        if (!showOrphansToggle) {
          list = list.filter(function(p){
            if (!p.article_id) return usedProductIds[p.id]
            return usedArticleIds[p.article_id]
          })
        }

        // === GROUPEMENT PAR ARTICLE ===
        // Pour chaque article on garde le product actif comme "représentant" (sinon le 1er)
        // Et on calcule : prix actif, fournisseur actif, nb alts, photo, tendance
        var byArt: any = {}
        var orphansNoArticle: any[] = []  // products sans article_id (rares) → restent isolés
        list.forEach(function(p) {
          if (!p.article_id) { orphansNoArticle.push(p); return }
          if (!byArt[p.article_id]) {
            byArt[p.article_id] = { products: [], representant: null }
          }
          byArt[p.article_id].products.push(p)
        })
        // Choisir le représentant par article
        // Priorité : le product actif (= ton fournisseur courant ★) — son prix sera affiché
        // Sa photo est utilisée, sinon on prend la photo d'un autre product du groupe
        Object.keys(byArt).forEach(function(aid) {
          var grp = byArt[aid]
          var actifs = grp.products.filter(function(p: any){ return p.is_active })
          var rep = actifs[0] || grp.products[0]
          // Si le représentant n'a pas de photo, hériter de la photo d'un autre product du même article
          if (!rep.photo_url) {
            var withPhoto = grp.products.filter(function(p: any){ return p.photo_url })[0]
            if (withPhoto) rep = Object.assign({}, rep, { photo_url: withPhoto.photo_url })
          }
          grp.representant = rep
        })

        // Construire la liste finale d'items (représentants articles + orphans sans article)
        var groupedList: any[] = Object.values(byArt).map(function(grp: any) {
          var rep = grp.representant
          var article = articles.filter(function(a: any){ return a.id === rep.article_id })[0]
          return { product: rep, article: article, group: grp.products, isGrouped: true }
        }).concat(orphansNoArticle.map(function(p: any) {
          return { product: p, article: null, group: [p], isGrouped: false }
        }))

        // Tri sur les items groupés
        var trends: any = {}
        groupedList.forEach(function(it: any){ trends[it.product.id] = getTrend(it.product.id) })
        if (catalogSort === 'name_asc') {
          groupedList.sort(function(a: any,b: any){
            var na = a.article ? a.article.name : a.product.name
            var nb = b.article ? b.article.name : b.product.name
            return (na||'').localeCompare(nb||'')
          })
        } else if (catalogSort === 'price_asc') {
          groupedList.sort(function(a: any,b: any){ return Number(a.product.current_price)-Number(b.product.current_price) })
        } else if (catalogSort === 'price_desc') {
          groupedList.sort(function(a: any,b: any){ return Number(b.product.current_price)-Number(a.product.current_price) })
        } else if (catalogSort === 'variation_desc') {
          groupedList.sort(function(a: any,b: any){ return Math.abs(trends[b.product.id].pct) - Math.abs(trends[a.product.id].pct) })
        } else if (catalogSort === 'recent') {
          groupedList.sort(function(a: any,b: any){
            var ta = byProduct[a.product.id] ? new Date(byProduct[a.product.id][byProduct[a.product.id].length-1].invoice_date).getTime() : 0
            var tb = byProduct[b.product.id] ? new Date(byProduct[b.product.id][byProduct[b.product.id].length-1].invoice_date).getTime() : 0
            return tb - ta
          })
        }


        // Couleurs catégorie (gradient placeholder)
        function catGradient(supplierCat){
          if (supplierCat === 'boisson') return 'linear-gradient(135deg, #FFE5F5 0%, #FFE5E5 100%)'
          if (supplierCat === 'packaging') return 'linear-gradient(135deg, #F0F4FF 0%, #DCE7FF 100%)'
          if (supplierCat === 'consommable') return 'linear-gradient(135deg, #F0FFF4 0%, #DCF7E3 100%)'
          return 'linear-gradient(135deg, var(--y) 0%, #FFF5C2 100%)' // ingrédient = jaune par défaut
        }
        function catEmoji(supplierCat){
          if (supplierCat === 'boisson') return '🥤'
          if (supplierCat === 'packaging') return '📦'
          if (supplierCat === 'consommable') return '🧽'
          return '🥬'
        }

        // Mini sparkline
        function Sparkline(p){
          var rawData = p.data || []
          var data = rawData.filter(function(v){ return typeof v === 'number' && !isNaN(v) && isFinite(v) })
          if (data.length < 2) return null
          var mn = Math.min.apply(null, data); var mx = Math.max.apply(null, data)
          var range = mx - mn || 1
          var w = 56; var h = 18
          var step = w / (data.length - 1)
          var pts = data.map(function(v, i){
            var x = i * step
            var y = range > 0 ? h - ((v - mn) / range) * h : h / 2
            if (!isFinite(x) || !isFinite(y)) return ''
            return x.toFixed(1) + ',' + y.toFixed(1)
          }).filter(function(s){ return s.length > 0 }).join(' ')
          if (!pts) return null
          var color = p.color || '#191923'
          return <svg width={w} height={h} style={{flexShrink:0,opacity:.7}}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        }

        // CATS pour les chips
        var CATS = [
          {id:'all', label:'Tous', emoji:'☰'},
          {id:'ingredient', label:'Ingrédients', emoji:'🥬'},
          {id:'boisson', label:'Boissons', emoji:'🥤'},
          {id:'packaging', label:'Packaging', emoji:'📦'},
          {id:'consommable', label:'Consommables', emoji:'🧽'}
        ]

        return (
          <div>
            {/* Chips catégories scrollables */}
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:14,scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
              {CATS.map(function(c){
                var active = catFilter === c.id
                return (
                  <button key={c.id} onClick={function(){setCatFilter(c.id)}} style={{flexShrink:0,padding:'8px 14px',background:active?'var(--p)':'#FFFFFF',color:active?'#FFFFFF':'#191923',border:'2px solid #191923',borderRadius:20,fontWeight:900,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:14}}>{c.emoji}</span>
                    {c.label}
                  </button>
                )
              })}
            </div>

            {/* Filtres avancés compacts */}
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center',fontSize:11,fontWeight:700,opacity:.85}}>
              <span style={{opacity:.6}}>Trier :</span>
              {[
                {v:'recent', l:'Récent'},
                {v:'name_asc', l:'Nom A-Z'},
                {v:'price_desc', l:'Prix ↓'},
                {v:'price_asc', l:'Prix ↑'},
                {v:'variation_desc', l:'Variation'}
              ].map(function(s){
                var active = catalogSort === s.v
                return (
                  <button key={s.v} onClick={function(){setCatalogSort(s.v)}} style={{padding:'4px 10px',fontSize:11,fontWeight:900,border:'1.5px solid '+(active?'var(--p)':'#DDD'),background:active?'#FFE5F5':'#FFF',color:active?'var(--p)':'#555',borderRadius:14,cursor:'pointer'}}>{s.l}</button>
                )
              })}
              <span style={{marginLeft:8,opacity:.4}}>·</span>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
                <input type="checkbox" checked={showInactiveProducts} onChange={function(e){setShowInactiveProducts(e.target.checked)}} /> Inactifs
              </label>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer'}}>
                <input type="checkbox" checked={showOrphansToggle} onChange={function(e){setShowOrphansToggle(e.target.checked)}} /> Orphelins
              </label>
              <span style={{marginLeft:'auto',opacity:.55,fontSize:11}}>{list.length} produit{list.length>1?'s':''}</span>
            </div>

            {/* Galerie de cartes */}
            {groupedList.length === 0 && (
              <div style={{padding:40,textAlign:'center',opacity:.5,fontWeight:700,fontSize:13,background:'#FFFFFF',borderRadius:14,border:'2px dashed #DDD'}}>Aucun produit ne correspond à la recherche</div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
              {groupedList.map(function(it: any){
                var p = it.product
                var article = it.article
                var group = it.group
                var displayName = article ? article.name : p.name
                var sup = suppliers.filter(function(ss: any){ return ss.id === p.supplier_id })[0]
                var supCat = sup ? sup.category : 'ingredient'
                var tr = trends[p.id] || { pct: 0, spark: [], last: null }
                // Nombre de fournisseurs actifs dans le groupe
                var actifs = group.filter(function(pp: any){ return pp.is_active })
                var nbFournisseursAlt = actifs.length
                // Prix min/max dans le groupe (parmi actifs)
                var prices_grp = actifs.map(function(pp: any){ return Number(pp.current_price) }).filter(function(v: number){ return v > 0 })
                var priceMin = prices_grp.length > 0 ? Math.min.apply(null, prices_grp) : Number(p.current_price)
                var priceMax = prices_grp.length > 0 ? Math.max.apply(null, prices_grp) : Number(p.current_price)
                var hasPriceRange = priceMin < priceMax * 0.99 // tolerance 1%
                var isOrphan = p.article_id ? !usedArticleIds[p.article_id] : !usedProductIds[p.id]
                var trendColor = '#191923'
                var trendArrow = '→'
                if (tr.pct >= 5) { trendColor = '#CC0066'; trendArrow = '↗' }
                else if (tr.pct <= -5) { trendColor = '#009D3A'; trendArrow = '↘' }
                return (
                  <div key={p.id} onClick={function(){setSelectedProduct(p)}} style={{background:'#FFFFFF',borderRadius:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',overflow:'hidden',cursor:'pointer',display:'flex',flexDirection:'column',transition:'transform .12s',opacity:p.is_active?1:0.6}} onMouseEnter={function(e: any){e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='4px 4px 0 #191923'}} onMouseLeave={function(e: any){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 #191923'}}>
                    {/* Photo / placeholder */}
                    <div style={{height:90,background:p.photo_url ? '#F5F5F5' : catGradient(supCat),display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,position:'relative',borderBottom:'2px solid #191923',overflow:'hidden'}}>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={displayName} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                      ) : catEmoji(supCat)}
                      {/* Badges droite : ALT / ORPHELIN / INACTIF */}
                      <div style={{position:'absolute',top:6,right:6,display:'flex',gap:4}}>
                        {nbFournisseursAlt > 1 && (
                          <div title={nbFournisseursAlt+' fournisseurs proposent cet article'} style={{background:'var(--p)',color:'#FFF',fontSize:9,fontWeight:900,padding:'3px 7px',borderRadius:6,letterSpacing:.3}}>×{nbFournisseursAlt} FOURN.</div>
                        )}
                        {isOrphan && p.is_active && (
                          <div title="Pas utilisé en recette" style={{background:'#DDD',color:'#555',fontSize:9,fontWeight:900,padding:'3px 7px',borderRadius:6,letterSpacing:.3}}>ORPHELIN</div>
                        )}
                        {!p.is_active && (
                          <div style={{background:'#888',color:'#FFF',fontSize:9,fontWeight:900,padding:'3px 7px',borderRadius:6,letterSpacing:.3}}>INACTIF</div>
                        )}
                      </div>
                    </div>
                    {/* Contenu */}
                    <div style={{padding:'10px 12px',flex:1,display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{fontWeight:900,fontSize:13,lineHeight:1.2}}>{displayName}</div>
                      {/* Fournisseur actif (sous le nom) */}
                      {sup && (
                        <div style={{fontSize:10,opacity:.55,fontWeight:700,marginTop:-3}}>{sup.name}{nbFournisseursAlt > 1 ? ' · meilleur prix' : ''}</div>
                      )}
                      {/* Prix actuel + tendance */}
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'auto',paddingTop:6,gap:6}}>
                        <div>
                          <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase'}}>{hasPriceRange ? 'Prix' : 'Prix actif'}</div>
                          {hasPriceRange ? (
                            <div style={{fontSize:16,fontWeight:900,color:'#191923',lineHeight:1}}>{priceMin.toFixed(2)}<span style={{fontSize:10,opacity:.5}}>→</span>{priceMax.toFixed(2)}<span style={{fontSize:11,opacity:.6}}>€/{p.unit}</span></div>
                          ) : (
                            <div style={{fontSize:20,fontWeight:900,color:'#191923',lineHeight:1}}>{Number(p.current_price).toFixed(2)}<span style={{fontSize:11,opacity:.6}}>€/{p.unit}</span></div>
                          )}
                        </div>
                        <div style={{textAlign:'right',display:'flex',alignItems:'center',gap:6}}>
                          {tr.spark.length > 1 && <Sparkline data={tr.spark} color={trendColor} />}
                          {tr.pct !== 0 && (
                            <div style={{fontSize:13,fontWeight:900,color:trendColor,whiteSpace:'nowrap'}}>
                              <span style={{fontSize:14}}>{trendArrow}</span> {tr.pct > 0 ? '+' : ''}{tr.pct.toFixed(0)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

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

      {/* ========== PHOTO PICKER MODAL ========== */}
      {photoPickerOpen && selectedProduct && (
        <PhotoPicker
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          toast={toast}
          onClose={function(){setPhotoPickerOpen(false)}}
          onUploaded={function(url){
            setPhotoPickerOpen(false)
            loadData()
            setSelectedProduct(Object.assign({}, selectedProduct, {photo_url:url}))
          }}
        />
      )}
    </div>
  )
}
