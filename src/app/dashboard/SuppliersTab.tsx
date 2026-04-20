'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RECIPES_DATA } from './data'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

export default function SuppliersTab() {
  var [suppliers, setSuppliers] = useState([])
  var [products, setProducts] = useState([])
  var [articles, setArticles] = useState([])
  var [prices, setPrices] = useState([])
  var [catFilter, setCatFilter] = useState('all')
  var [selectedProduct, setSelectedProduct] = useState(null)
  var [loading, setLoading] = useState(true)
  var [uploading, setUploading] = useState(false)
  var [uploadResult, setUploadResult] = useState(null)
  var [classifying, setClassifying] = useState(null)
  var [newSupName, setNewSupName] = useState('')
  var [newSupCat, setNewSupCat] = useState('ingredient')
  var [showNewSup, setShowNewSup] = useState(null)
  var [orphanAction, setOrphanAction] = useState(null)
  var [recipeLinks, setRecipeLinks] = useState([])
  var [assigningRecipe, setAssigningRecipe] = useState(null)

  var allRecipes = RECIPES_DATA.map(function(r) { return {id: r.id, name: r.name, categorie: r.categorie} }).concat([
    {id: 'sub_mayo', name: 'Mayonnaise maison (base)', categorie: 'sous-recette'},
    {id: 'sub_mayo_lobster', name: 'Mayo lobster (estragon)', categorie: 'sous-recette'},
    {id: 'sub_mayo_sriracha', name: 'Mayo sriracha (tuna)', categorie: 'sous-recette'},
    {id: 'sub_sauce_russe', name: 'Sauce russe', categorie: 'sous-recette'},
    {id: 'sub_pickles', name: 'Pickles oignons', categorie: 'sous-recette'},
    {id: 'sub_pink_lemonade', name: 'Pink Lemonade', categorie: 'sous-recette'},
    {id: 'sub_frites', name: 'Frites', categorie: 'sous-recette'}
  ]).concat([
    {id: 'sub_mayo', name: 'Mayonnaise maison (base)', categorie: 'sous-recette'},
    {id: 'sub_mayo_lobster', name: 'Mayo lobster (estragon)', categorie: 'sous-recette'},
    {id: 'sub_mayo_sriracha', name: 'Mayo sriracha (tuna)', categorie: 'sous-recette'},
    {id: 'sub_sauce_russe', name: 'Sauce russe', categorie: 'sous-recette'},
    {id: 'sub_pickles', name: 'Pickles oignons', categorie: 'sous-recette'},
    {id: 'sub_pink_lemonade', name: 'Pink Lemonade', categorie: 'sous-recette'},
    {id: 'sub_frites', name: 'Frites', categorie: 'sous-recette'}
  ])

  useEffect(function() { loadData() }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      sb().from('suppliers').select('*').order('name'),
      sb().from('products').select('*').order('name'),
      sb().from('articles').select('*').order('name'),
      sb().from('product_prices').select('*').order('invoice_date', {ascending: true}),
      sb().from('product_recipe_links').select('*')
    ]).then(function(results) {
      if (results[0].data) setSuppliers(results[0].data)
      if (results[1].data) setProducts(results[1].data)
      if (results[2].data) setArticles(results[2].data)
      if (results[3].data) setPrices(results[3].data)
      if (results[4].data) setRecipeLinks(results[4].data)
      setLoading(false)
    })
  }

  function assignToRecipe(productId, recipe) {
    sb().from('product_recipe_links').insert({
      product_id: productId, recipe_id: recipe.id, recipe_name: recipe.name
    }).then(function() { loadData() })
  }

  function assignToAllSandwiches(productId) {
    var sandwiches = allRecipes.filter(function(r) { return r.categorie === 'classique' || r.categorie === 'mini' })
    var inserts = sandwiches.map(function(r) { return {product_id: productId, recipe_id: r.id, recipe_name: r.name} })
    sb().from('product_recipe_links').insert(inserts).then(function() { loadData(); setAssigningRecipe(null) })
  }

  function removeRecipeLink(linkId) {
    sb().from('product_recipe_links').delete().eq('id', linkId).then(function() { loadData() })
  }

  function handleUpload(e) {
    var file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    var reader = new FileReader()
    reader.onload = function() {
      var base64 = reader.result.split(',')[1]
      fetch('/api/import-invoice', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pdfBase64: base64, fileName: file.name, mediaType: file.type})
      }).then(function(r) { return r.json() }).then(function(data) {
        setUploadResult(data)
        setUploading(false)
        if (data.matched && data.matched.length > 0) loadData()
      }).catch(function(err) { setUploading(false); alert('Erreur: ' + err.message) })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function confirmSuggestion(item) {
    setClassifying(item.article)
    sb().from('product_prices').insert({
      product_id: item.suggested_match_id, price: item.prix_unitaire_ht,
      invoice_date: uploadResult ? uploadResult.date : new Date().toISOString().split('T')[0]
    }).then(function() {
      sb().from('products').update({ current_price: item.prix_unitaire_ht }).eq('id', item.suggested_match_id).then(function() {
        setClassifying(null)
        setUploadResult(function(prev) {
          if (!prev) return prev
          return Object.assign({}, prev, {
            matched: prev.matched.concat([{article: item.article, matched_to: item.suggested_match, score: item.suggested_score, old_price: 0, new_price: item.prix_unitaire_ht, change_pct: 0}]),
            suggestions: prev.suggestions.filter(function(s) { return s.article !== item.article })
          })
        })
        loadData()
      })
    })
  }

  function rejectSuggestion(item) {
    setUploadResult(function(prev) {
      if (!prev) return prev
      return Object.assign({}, prev, {
        suggestions: prev.suggestions.filter(function(s) { return s.article !== item.article }),
        unmatched: prev.unmatched.concat([{article: item.article, article_original: item.article_original, categorie: item.categorie, unite: item.unite, prix_unitaire_ht: item.prix_unitaire_ht, conditionnement: item.conditionnement}])
      })
    })
  }

  function classifyProduct(item, supplierId, category) {
    setClassifying(item.article)
    sb().from('articles').upsert({name: item.article, unit: item.unite || 'kg', category: category || 'ingredient'}, {onConflict: 'name'}).select().then(function(artRes) {
      var articleId = artRes.data && artRes.data[0] ? artRes.data[0].id : null
      sb().from('products').insert({
        supplier_id: supplierId, name: item.article, unit: item.unite || 'kg',
        current_price: item.prix_unitaire_ht || 0, category: category || item.categorie || 'ingredient',
        article_id: articleId, is_active: true
      }).select().then(function(res) {
        if (res.data && res.data[0]) {
          sb().from('product_prices').insert({
            product_id: res.data[0].id, price: item.prix_unitaire_ht,
            invoice_date: uploadResult ? uploadResult.date : new Date().toISOString().split('T')[0]
          }).then(function() {
            setClassifying(null)
            setShowNewSup(null)
            setUploadResult(function(prev) {
              if (!prev) return prev
              return Object.assign({}, prev, {
                matched: prev.matched.concat([{article: item.article, matched_to: item.article, score: 100, old_price: 0, new_price: item.prix_unitaire_ht, change_pct: 0}]),
                unmatched: prev.unmatched.filter(function(u) { return u.article !== item.article })
              })
            })
            loadData()
          })
        } else { setClassifying(null) }
      })
    })
  }

  function createSupplierAndClassify(item) {
    if (!newSupName.trim()) return
    setClassifying(item.article)
    sb().from('suppliers').insert({name: newSupName.trim(), category: newSupCat}).select().then(function(supRes) {
      if (supRes.data && supRes.data[0]) {
        classifyProduct(item, supRes.data[0].id, item.categorie)
        setNewSupName('')
        setNewSupCat('ingredient')
      } else { setClassifying(null) }
    })
  }

  function toggleActive(productId, articleId) {
    sb().from('products').update({is_active: false}).eq('article_id', articleId).then(function() {
      sb().from('products').update({is_active: true}).eq('id', productId).then(function() { loadData() })
    })
  }

  function deleteProduct(productId) {
    if (!confirm('Supprimer ce produit ?')) return
    sb().from('product_prices').delete().eq('product_id', productId).then(function() {
      sb().from('products').delete().eq('id', productId).then(function() { loadData(); setOrphanAction(null) })
    })
  }

  function changeCategory(productId, newCat) {
    sb().from('products').update({category: newCat}).eq('id', productId).then(function() { loadData(); setOrphanAction(null) })
  }

  function getRecipesForProduct(productName, productId) {
    var found = []
    RECIPES_DATA.forEach(function(r) {
      if (!r.ingredients) return
      r.ingredients.forEach(function(ing) {
        var ingName = (ing.article || '').toLowerCase()
        var pName = productName.toLowerCase()
        if (ingName === pName || ingName.indexOf(pName) > -1 || pName.indexOf(ingName) > -1) {
          if (!found.find(function(f) { return f.name === r.name })) {
            found.push({name: r.name, foodCostPct: r.foodCostPct || 0})
          }
        }
      })
    })
    if (productId) {
      recipeLinks.filter(function(rl) { return rl.product_id === productId }).forEach(function(rl) {
        if (!found.find(function(f) { return f.name === rl.recipe_name })) {
          var rd = RECIPES_DATA.find(function(r) { return r.id === rl.recipe_id })
          found.push({name: rl.recipe_name, foodCostPct: rd ? rd.foodCostPct || 0 : 0, linkId: rl.id})
        }
      })
    }
    return found
  }

  function getProductPrices(productId) {
    return prices.filter(function(p) { return p.product_id === productId })
  }

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
    Object.values(seriesMap).forEach(function(pp) { pp.forEach(function(p) { allVals.push(Number(p.price)) }) })
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
        var x = pad + (di / (allDates.length - 1)) * chartW
        var y = pad + chartH - ((Number(p.price) - minV) / range) * chartH
        return {x: x, y: y, price: Number(p.price)}
      })
      svgParts.push({points: pts, color: color})
      ci++
    })
    var dateLabels = allDates.map(function(d, i) {
      var x = pad + (i / (allDates.length - 1)) * chartW
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

  var activeSuppliers = suppliers.filter(function(s) { return !s.archived })
  var filteredSuppliers = catFilter === 'all' ? activeSuppliers : activeSuppliers.filter(function(s) { return s.category === catFilter })

  var orphanProducts = products.filter(function(p) {
    if (p.category !== 'ingredient') return false
    var sup = suppliers.find(function(s) { return s.id === p.supplier_id })
    if (sup && sup.archived) return false
    var recipes = getRecipesForProduct(p.name, p.id)
    return recipes.length === 0
  })

  var comparisons = []
  articles.forEach(function(art) {
    var artProducts = products.filter(function(p) { return p.article_id === art.id })
    if (artProducts.length < 2) return
    var withSupplier = artProducts.map(function(p) {
      var sup = suppliers.find(function(s) { return s.id === p.supplier_id })
      return { name: p.name, price: Number(p.current_price), supplier: sup ? sup.name : '?', is_active: p.is_active, unit: p.unit }
    }).sort(function(a, b) { return a.price - b.price })
    var cheapest = withSupplier[0].price
    var mostExpensive = withSupplier[withSupplier.length - 1].price
    if (cheapest > 0 && mostExpensive > 0) {
      var savingPct = ((mostExpensive - cheapest) / mostExpensive * 100).toFixed(1)
      comparisons.push({ article: art.name, unit: art.unit, products: withSupplier, saving: savingPct })
    }
  })
  comparisons.sort(function(a, b) { return Number(b.saving) - Number(a.saving) })

  if (loading) return <div style={{padding:40,textAlign:'center',opacity:0.5}}>Chargement...</div>

  // PRODUCT DETAIL VIEW
  if (selectedProduct) {
    var prod = selectedProduct
    var sup = suppliers.find(function(s) { return s.id === prod.supplier_id })
    var articleId = prod.article_id
    var siblingProducts = articleId ? products.filter(function(p) { return p.article_id === articleId }) : [prod]
    var recipes = getRecipesForProduct(prod.name, prod.id)
    var activeProduct = siblingProducts.find(function(p) { return p.is_active }) || prod
    var supplierMapForChart = {}
    siblingProducts.forEach(function(sp) {
      var s = suppliers.find(function(ss) { return ss.id === sp.supplier_id })
      supplierMapForChart[sp.id] = s ? s.name : '?'
    })
    var allProductIds = siblingProducts.map(function(sp) { return sp.id })
    var allPricesForArticle = prices.filter(function(p) { return allProductIds.indexOf(p.product_id) > -1 })

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
            var spSup = suppliers.find(function(ss) { return ss.id === sp.supplier_id })
            var diff = activeProduct.id !== sp.id && Number(activeProduct.current_price) > 0 ? ((Number(sp.current_price) - Number(activeProduct.current_price)) / Number(activeProduct.current_price) * 100).toFixed(1) : null
            return (
              <div key={sp.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:8,marginBottom:4,background:sp.is_active ? '#FFF9D0' : 'transparent',border:sp.is_active ? '2px solid #FFEB5A' : '1px solid #EEE'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {sp.is_active && <span style={{fontSize:14}}>★</span>}
                  <span style={{fontWeight:900,fontSize:14}}>{spSup ? spSup.name : '?'}</span>
                  {sp.is_active && <span style={{fontSize:10,fontWeight:900,color:'#8A6D00',background:'#FFEB5A',padding:'2px 8px',borderRadius:10}}>ACTIF</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontWeight:900,fontSize:14}}>{Number(sp.current_price).toFixed(2)} €/{sp.unit}</span>
                  {diff !== null && <span style={{fontSize:11,fontWeight:900,color:diff > 0 ? '#CC0066' : '#009D3A'}}>{diff > 0 ? '+' : ''}{diff}%</span>}
                  {!sp.is_active && <button onClick={function(){toggleActive(sp.id, articleId)}} style={{padding:'3px 10px',fontSize:10,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>ACTIVER</button>}
                </div>
              </div>
            )
          })}

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Utilisé dans</div>
          {recipes.length > 0 ? recipes.map(function(r) {
            return <span key={r.name} style={{display:'inline-block',padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:900,margin:3,background:'#FFEB5A',color:'#191923',border:'2px solid #191923',textTransform:'uppercase'}}>{r.name}</span>
          }) : <span style={{fontSize:13,color:'#888',fontWeight:700}}>Hors recettes</span>}

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Évolution du prix</div>
          {allPricesForArticle.length >= 2 ? renderPriceChart(allProductIds, prices, supplierMapForChart) : <div style={{fontSize:13,color:'#888'}}>Pas encore d'historique</div>}

          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Historique factures</div>
          {allPricesForArticle.length > 0 ? allPricesForArticle.slice().reverse().map(function(ph, i) {
            var phSup = supplierMapForChart[ph.product_id] || '?'
            return (
              <div key={ph.id} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'6px 0',borderBottom:'1px solid #F5F5F5',alignItems:'center'}}>
                <span style={{fontWeight:700,minWidth:80}}>{new Date(ph.invoice_date).toLocaleDateString('fr-FR')}</span>
                <span style={{fontSize:11,color:'#888'}}>{phSup}</span>
                <span style={{fontWeight:900}}>{Number(ph.price).toFixed(2)} €/{prod.unit}</span>
                {ph.invoice_filename && <span style={{fontSize:10,color:'#888'}}>{ph.invoice_filename}</span>}
              </div>
            )
          }) : <div style={{fontSize:13,color:'#888'}}>Aucune facture</div>}
        </div>
      </div>
    )
  }

  // MAIN LIST VIEW
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:14}}>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontFamily:'Yellowtail',fontSize:13,color:'#191923'}}>Filtrer :</span>
          {[{v:'all',l:'TOUS'},{v:'ingredient',l:'INGRÉDIENTS'},{v:'boisson',l:'BOISSONS'},{v:'packaging',l:'PACKAGING'},{v:'consommable',l:'CONSOMMABLES'}].map(function(c) {
            return <button key={c.v} onClick={function(){setCatFilter(c.v)}} style={{padding:'5px 14px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:catFilter===c.v?'#FFEB5A':'transparent',color:'#191923',cursor:'pointer',textTransform:'uppercase',fontFamily:'Arial Narrow, Arial, sans-serif'}}>{c.l}</button>
          })}
        </div>
        <label style={{padding:'8px 18px',fontSize:12,fontWeight:900,borderRadius:20,border:'2px solid #FF82D7',background:'#FF82D7',color:'#fff',cursor:'pointer',textTransform:'uppercase',fontFamily:'Arial Narrow, Arial, sans-serif'}}>
          {uploading ? '⏳ ANALYSE...' : '📄 UPLOAD FACTURE'}
          <input type="file" accept=".pdf,image/*" onChange={handleUpload} style={{display:'none'}} disabled={uploading} />
        </label>
      </div>

      {comparisons.length > 0 && (
        <div style={{background:'#fff',border:'2px solid #FF82D7',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#191923',marginBottom:8}}>Comparateur prix fournisseurs</div>
          {comparisons.slice(0, 8).map(function(c, i) {
            return (
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #F0F0F0',fontSize:13}}>
                <span style={{fontWeight:900,minWidth:120}}>{c.article}</span>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  {c.products.map(function(p, pi) {
                    return <span key={pi} style={{fontSize:12,fontWeight:p.is_active?900:400,color:pi===0?'#009D3A':'#191923'}}>
                      {p.supplier}: {p.price.toFixed(2)}€/{p.unit}{p.is_active ? ' ★' : ''}
                    </span>
                  })}
                  <span style={{fontSize:11,fontWeight:900,color:'#009D3A',background:'#E8FFE8',padding:'2px 8px',borderRadius:10}}>-{c.saving}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {orphanProducts.length > 0 && (
        <div style={{background:'#fff',border:'2px solid #CC0066',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#CC0066',marginBottom:6}}>Produits sans recette</div>
          <div style={{fontSize:12,color:'#888',marginBottom:8}}>Cliquez pour affecter, recatégoriser ou supprimer</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {orphanProducts.map(function(op) {
              var sup = suppliers.find(function(s) { return s.id === op.supplier_id })
              return <span key={op.id} onClick={function(){setOrphanAction(orphanAction === op.id ? null : op.id)}} style={{display:'inline-block',padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:900,background:orphanAction === op.id ? '#CC0066' : '#FFE0E0',color:orphanAction === op.id ? '#FFF' : '#CC0066',border:'1px solid #CC0066',cursor:'pointer'}}>{op.name} ({sup ? sup.name : '?'} · {Number(op.current_price).toFixed(2)}€/{op.unit})</span>
            })}
          </div>
          {orphanAction && (function() {
            var op = orphanProducts.find(function(p) { return p.id === orphanAction })
            if (!op) return null
            var existingLinks = recipeLinks.filter(function(rl) { return rl.product_id === op.id })
            return (
              <div style={{background:'#FFF9D0',border:'2px solid #FFEB5A',borderRadius:8,padding:12,marginTop:10}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{fontWeight:900,fontSize:14}}>{op.name}</div>
                  <button onClick={function(){setOrphanAction(null)}} style={{background:'transparent',border:'none',fontSize:16,cursor:'pointer',color:'#888'}}>✕</button>
                </div>

                <div style={{fontSize:12,fontWeight:900,color:'#191923',marginBottom:6}}>Affecter aux recettes :</div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                  <button onClick={function(){assignToAllSandwiches(op.id)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #FFEB5A',background:'#FFEB5A',cursor:'pointer'}}>TOUS LES SANDWICHS</button>
                  {assigningRecipe === op.id ? (
                    <div style={{width:'100%',marginTop:6}}>
                      <div style={{fontSize:11,color:'#888',marginBottom:4}}>Choisir une recette :</div>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        {allRecipes.map(function(r) {
                          var alreadyLinked = existingLinks.find(function(el) { return el.recipe_id === r.id })
                          return <button key={r.id} disabled={!!alreadyLinked} onClick={function(){assignToRecipe(op.id, r)}} style={{padding:'3px 10px',fontSize:10,fontWeight:900,borderRadius:20,border:'1px solid ' + (alreadyLinked ? '#CCC' : '#191923'),background:alreadyLinked ? '#E8E8E8' : '#fff',color:alreadyLinked ? '#888' : '#191923',cursor:alreadyLinked ? 'default' : 'pointer',textTransform:'uppercase'}}>{r.name}{alreadyLinked ? ' ✓' : ''}</button>
                        })}
                      </div>
                    </div>
                  ) : (
                    <button onClick={function(){setAssigningRecipe(op.id)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>CHOISIR RECETTE(S)...</button>
                  )}
                </div>

                {existingLinks.length > 0 && (
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:11,color:'#009D3A',fontWeight:700,marginBottom:4}}>Déjà affecté à :</div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {existingLinks.map(function(el) {
                        return <span key={el.id} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900,background:'#E8FFE8',color:'#009D3A',border:'1px solid #009D3A'}}>
                          {el.recipe_name}
                          <span onClick={function(){removeRecipeLink(el.id)}} style={{cursor:'pointer',fontSize:12}}>✕</span>
                        </span>
                      })}
                    </div>
                  </div>
                )}

                <div style={{fontSize:12,fontWeight:900,color:'#191923',marginTop:8,marginBottom:6}}>Ou recatégoriser :</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <button onClick={function(){changeCategory(op.id, 'boisson')}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>🥤 Boisson</button>
                  <button onClick={function(){changeCategory(op.id, 'consommable')}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>🧹 Consommable</button>
                  <button onClick={function(){changeCategory(op.id, 'packaging')}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>📦 Packaging</button>
                  <button onClick={function(){deleteProduct(op.id)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #CC0066',background:'#FFE0E0',color:'#CC0066',cursor:'pointer'}}>🗑 Supprimer</button>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {uploadResult && (
        <div style={{background:'#fff',border:'2px solid #FFEB5A',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#191923'}}>Résultat import</div>
              <div style={{fontSize:13,fontWeight:700,color:'#191923'}}>{uploadResult.fournisseur}{uploadResult.fournisseur_matched ? ' → ' + uploadResult.fournisseur_matched : ''}{!uploadResult.supplier_id && <span style={{color:'#CC0066',marginLeft:6}}>⚠️ Fournisseur non reconnu</span>}</div>
            </div>
            <div style={{fontSize:12,color:'#888'}}>{uploadResult.date} · {uploadResult.total_ht ? Number(uploadResult.total_ht).toFixed(2) + ' € HT' : ''}</div>
          </div>

          {!uploadResult.supplier_id && (
            <div style={{background:'#FFE0F0',border:'2px solid #FF82D7',borderRadius:8,padding:12,marginTop:10}}>
              <div style={{fontSize:12,fontWeight:900,color:'#993560',marginBottom:6}}>Assigner à un fournisseur :</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {suppliers.filter(function(s){return !s.archived}).map(function(s) {
                  return <button key={s.id} onClick={function(){setUploadResult(function(prev){return Object.assign({}, prev, {supplier_id: s.id, fournisseur_matched: s.name})})}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #191923',background:'#fff',cursor:'pointer'}}>{s.name}</button>
                })}
                <button onClick={function(){setShowNewSup('invoice')}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #FF82D7',background:'#FF82D7',color:'#fff',cursor:'pointer'}}>+ NOUVEAU</button>
              </div>
              {showNewSup === 'invoice' && (
                <div style={{display:'flex',gap:6,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
                  <input value={newSupName} onChange={function(e){setNewSupName(e.target.value)}} placeholder="Nom fournisseur" style={{padding:'4px 10px',fontSize:12,border:'2px solid #191923',borderRadius:8,fontWeight:700}} />
                  <select value={newSupCat} onChange={function(e){setNewSupCat(e.target.value)}} style={{padding:'4px 8px',fontSize:11,border:'1px solid #191923',borderRadius:8}}>
                    <option value="ingredient">Ingrédient</option>
                    <option value="boisson">Boisson</option>
                    <option value="packaging">Packaging</option>
                    <option value="consommable">Consommable</option>
                  </select>
                  <button onClick={function(){if(!newSupName.trim())return;sb().from('suppliers').insert({name:newSupName.trim(),category:newSupCat}).select().then(function(r){if(r.data&&r.data[0]){setUploadResult(function(prev){return Object.assign({},prev,{supplier_id:r.data[0].id,fournisseur_matched:r.data[0].name})});setShowNewSup(null);setNewSupName('');loadData()}})}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#FFEB5A',cursor:'pointer'}}>CRÉER</button>
                </div>
              )}
            </div>
          )}

          {uploadResult.matched && uploadResult.matched.length > 0 && (
            <div style={{marginTop:10,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:900,color:'#009D3A',marginBottom:6}}>✅ {uploadResult.matched.length} produit{uploadResult.matched.length > 1 ? 's' : ''} — prix mis à jour</div>
              {uploadResult.matched.map(function(m, i) {
                return (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0',borderBottom:'1px solid #F0F0F0'}}>
                    <span style={{fontWeight:700}}>{m.article}{m.matched_to !== m.article ? ' → ' + m.matched_to : ''}</span>
                    <span style={{fontWeight:900,color:m.change_pct > 0 ? '#CC0066' : m.change_pct < 0 ? '#009D3A' : '#888'}}>{Number(m.old_price).toFixed(2)} → {Number(m.new_price).toFixed(2)} €{m.change_pct !== 0 ? ' (' + (m.change_pct > 0 ? '+' : '') + Number(m.change_pct).toFixed(1) + '%)' : ''}</span>
                  </div>
                )
              })}
            </div>
          )}

          {uploadResult.suggestions && uploadResult.suggestions.length > 0 && (
            <div style={{marginTop:10,marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:900,color:'#B8920A',marginBottom:6}}>🔍 {uploadResult.suggestions.length} suggestion{uploadResult.suggestions.length > 1 ? 's' : ''}</div>
              {uploadResult.suggestions.map(function(s, i) {
                return (
                  <div key={i} style={{background:'#FFF9D0',border:'2px solid #FFEB5A',borderRadius:8,padding:10,marginBottom:6}}>
                    <div style={{fontSize:13,fontWeight:900}}>"{s.article}" → {s.suggested_match} ?</div>
                    <div style={{fontSize:11,color:'#888'}}>{s.article_original} · {Number(s.prix_unitaire_ht).toFixed(2)} €/{s.unite}</div>
                    <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap',alignItems:'center'}}>
                      <button disabled={classifying===s.article} onClick={function(){confirmSuggestion(s)}} style={{padding:'4px 14px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #009D3A',background:'#fff',color:'#009D3A',cursor:'pointer'}}>{classifying===s.article ? '...' : '✅ ' + s.suggested_match}</button>
                      {s.other_matches && s.other_matches.map(function(om) {
                        return <button key={om.id} disabled={classifying===s.article} onClick={function(){confirmSuggestion(Object.assign({}, s, {suggested_match: om.name, suggested_match_id: om.id}))}} style={{padding:'4px 14px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #B8920A',background:'#fff',color:'#B8920A',cursor:'pointer'}}>{'→ ' + om.name}</button>
                      })}
                      <button onClick={function(){rejectSuggestion(s)}} style={{padding:'4px 14px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #CC0066',background:'#fff',color:'#CC0066',cursor:'pointer'}}>✗ AUCUN</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {uploadResult.unmatched && uploadResult.unmatched.length > 0 && (
            <div style={{marginTop:10}}>
              <div style={{fontSize:12,fontWeight:900,color:'#CC0066',marginBottom:6}}>⚠️ {uploadResult.unmatched.length} non reconnu{uploadResult.unmatched.length > 1 ? 's' : ''}</div>
              {uploadResult.unmatched.map(function(u, i) {
                return (
                  <div key={i} style={{background:'#FFF9D0',border:'2px solid #FFEB5A',borderRadius:8,padding:10,marginBottom:8}}>
                    <div style={{fontWeight:900,fontSize:13}}>📦 {u.article}</div>
                    <div style={{fontSize:11,color:'#888'}}>{u.article_original} · {u.prix_unitaire_ht ? Number(u.prix_unitaire_ht).toFixed(2) : '?'} €/{u.unite}</div>
                    <div style={{fontSize:11,fontWeight:700,color:'#191923',marginTop:6}}>Ajouter chez :</div>
                    <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                      {uploadResult.supplier_id && <button disabled={classifying===u.article} onClick={function(){classifyProduct(u, uploadResult.supplier_id, u.categorie)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#FFEB5A',cursor:'pointer'}}>
                        {classifying===u.article ? '...' : uploadResult.fournisseur_matched || 'Ce fournisseur'}
                      </button>}
                      {suppliers.filter(function(s){return !s.archived && s.id !== uploadResult.supplier_id}).map(function(s) {
                        return <button key={s.id} disabled={classifying===u.article} onClick={function(){classifyProduct(u, s.id, u.categorie)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #DDD',background:'#fff',cursor:'pointer'}}>{s.name}</button>
                      })}
                      <button onClick={function(){setShowNewSup(u.article)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #FF82D7',background:'#FF82D7',color:'#fff',cursor:'pointer'}}>+ NOUVEAU</button>
                    </div>
                    {showNewSup === u.article && (
                      <div style={{display:'flex',gap:6,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
                        <input value={newSupName} onChange={function(e){setNewSupName(e.target.value)}} placeholder="Nom fournisseur" style={{padding:'4px 10px',fontSize:12,border:'2px solid #191923',borderRadius:8,fontWeight:700}} />
                        <select value={newSupCat} onChange={function(e){setNewSupCat(e.target.value)}} style={{padding:'4px 8px',fontSize:11,border:'1px solid #191923',borderRadius:8}}>
                          <option value="ingredient">Ingrédient</option>
                          <option value="boisson">Boisson</option>
                          <option value="packaging">Packaging</option>
                          <option value="consommable">Consommable</option>
                        </select>
                        <button onClick={function(){createSupplierAndClassify(u)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#FFEB5A',cursor:'pointer'}}>CRÉER</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {(!uploadResult.unmatched || uploadResult.unmatched.length === 0) && (!uploadResult.suggestions || uploadResult.suggestions.length === 0) && <button onClick={function(){setUploadResult(null)}} style={{padding:'6px 16px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#FFEB5A',color:'#191923',cursor:'pointer',marginTop:10}}>OK, FERMER</button>}
        </div>
      )}

      {filteredSuppliers.map(function(s) {
        var supProducts = products.filter(function(p) { return p.supplier_id === s.id })
        var catBadge = s.category === 'ingredient' ? {bg:'#FFEB5A',color:'#191923',label:'Ingrédients'} : s.category === 'boisson' ? {bg:'#E0F0FF',color:'#005FFF',label:'Boissons'} : s.category === 'packaging' ? {bg:'#FF82D7',color:'#FFF',label:'Packaging'} : {bg:'#E8E8E8',color:'#555',label:'Consommable'}
        return (
          <div key={s.id} style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:10,borderBottom:'2px solid #FFEB5A',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{s.name}</span>
                <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900,background:catBadge.bg,color:catBadge.color,textTransform:'uppercase'}}>{catBadge.label}</span>
              </div>
              <span style={{fontFamily:'Yellowtail',fontSize:12,color:'#888'}}>{supProducts.length} produits</span>
            </div>
            {supProducts.length === 0 && <div style={{fontSize:13,color:'#888',padding:'8px 0'}}>Aucun produit — uploadez une facture pour alimenter</div>}
            {supProducts.map(function(p) {
              var recipes = getRecipesForProduct(p.name, p.id)
              var sibCount = p.article_id ? products.filter(function(pp) { return pp.article_id === p.article_id }).length : 1
              return (
                <div key={p.id} onClick={function(){setSelectedProduct(p)}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 8px',borderBottom:'1px solid #F0F0F0',cursor:'pointer',borderRadius:6}} onMouseOver={function(e){e.currentTarget.style.background='#FFEB5A'}} onMouseOut={function(e){e.currentTarget.style.background='transparent'}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <span style={{fontWeight:900,fontSize:14}}>{p.name}</span>
                      {p.is_active && sibCount > 1 && <span style={{fontSize:9,fontWeight:900,color:'#8A6D00',background:'#FFEB5A',padding:'1px 6px',borderRadius:8}}>★ ACTIF</span>}
                      {sibCount > 1 && <span style={{fontSize:9,color:'#888'}}>{sibCount} fourn.</span>}
                    </div>
                    <div style={{marginTop:3}}>
                      {recipes.length > 0 ? recipes.slice(0, 4).map(function(r) {
                        return <span key={r.name} style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,margin:2,background:'#FFF3B0',color:'#8A6D00',border:'1px solid #EED980',textTransform:'uppercase'}}>{r.name}</span>
                      }) : p.category === 'boisson' ? <span style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:'#E0F0FF',color:'#005FFF',border:'1px solid #B0D0FF',textTransform:'uppercase'}}>Boisson revente</span> : <span style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:'#E8E8E8',color:'#555',border:'1px solid #CCC',textTransform:'uppercase'}}>Hors recettes</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:16,fontWeight:900}}>{Number(p.current_price).toFixed(2)} €</span>
                    <span style={{fontSize:11,color:'#888',marginLeft:2}}>/{p.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
