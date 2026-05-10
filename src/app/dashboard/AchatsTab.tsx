'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

function fmtPrice(n) {
  var v = Number(n || 0)
  if (v === 0) return '—'
  if (v < 1) return v.toFixed(3).replace(/\.?0+$/, '')
  return v.toFixed(2)
}

function fmtDate(s) {
  if (!s) return ''
  var d = new Date(s)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// =============================================================================
// Familles fonctionnelles (copie de ProductRecipeAssignment) pour grouper
// les ingrédients texte libre + products quand les noms diffèrent.
// =============================================================================
var INGREDIENT_FAMILIES = {
  saucisse:        ['saucisse', 'sausage', 'frankfurt', 'wurst', 'hot dog'],
  pain:            ['pain', 'bun', 'brioche', 'rye', 'bread', 'bagel'],
  fromage_jaune:   ['cheddar', 'american cheese', 'swiss', 'comté', 'gruyère', 'gruyere', 'emmental', 'gouda'],
  fromage_pate:    ['mozzarella', 'feta', 'parmesan', 'parmigiano', 'cream cheese', 'philadelphia'],
  homard_crustace: ['homard', 'crabe', 'crab', 'écrevisse', 'ecrevisse', 'crevette', 'crustacé'],
  saumon:          ['saumon', 'salmon', 'lox'],
  thon:            ['thon', 'tuna'],
  poulet:          ['poulet', 'chicken'],
  pastrami_viande: ['pastrami', 'corned beef', 'corned'],
  mayo:            ['mayo', 'mayonnaise', 'aioli'],
  moutarde:        ['moutarde', 'mustard', 'dijon'],
  ketchup:         ['ketchup'],
  oignon_marine:   ['pickles onion', 'pickled onion', 'oignon confit', 'pickle onions'],
  oignon_frit:     ['oignon frit', 'oignons frits', 'fried onion', 'crispy onion'],
  oignon_frais:    ['oignon', 'onion', 'shallot', 'echalote', 'échalote', 'cebette', 'ciboule'],
  ail:             ['ail', 'garlic', 'aïl'],
  cornichons:      ['cornichon', 'pickle', 'gherkin'],
  salade_feuilles: ['sucrine', 'romaine', 'mâche', 'mache', 'roquette', 'lettuce', 'feuille'],
  oeuf:            ['oeuf', 'œuf', 'egg', 'jaune', 'yolk'],
  beurre:          ['beurre', 'butter'],
  cacahuete:       ['cacahuète', 'cacahuete', 'peanut', 'pbn', 'whole earth'],
  banane:          ['banane', 'banana'],
  pomme_terre:     ['pomme de terre', 'pomme terre', 'patate', 'potato', 'agria'],
  vinaigre:        ['vinaigre', 'vinegar'],
  tomate:          ['tomate', 'tomato'],
  citron:          ['citron', 'lemon', 'lime'],
  capres:          ['câpre', 'capre', 'caper'],
  estragon:        ['estragon', 'tarragon'],
  croutons:        ['crouton', 'croûton'],
}

function getFamily(name) {
  var n = ' ' + String(name || '').toLowerCase().trim().replace(/[,;.\-_]/g, ' ').replace(/\s+/g, ' ') + ' '
  if (n.length <= 2) return null
  var keys = Object.keys(INGREDIENT_FAMILIES)
  var i, j
  for (i = 0; i < keys.length; i++) {
    var fam = keys[i]
    var words = INGREDIENT_FAMILIES[fam]
    for (j = 0; j < words.length; j++) {
      var kw = words[j]
      if (kw.length <= 4) {
        if (n.indexOf(' ' + kw + ' ') >= 0 || n.indexOf(' ' + kw + 's ') >= 0) return fam
      } else {
        if (n.indexOf(kw) >= 0) return fam
      }
    }
  }
  return null
}

// Normalisation pour grouper par nom (fallback quand pas de famille)
function normalizeName(name) {
  return String(name || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[,;.\-_'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Détecter la catégorie : ingredient / boisson / packaging / maison
function detectCategory(name, supplierName, productCategory) {
  if (productCategory === 'drink' || productCategory === 'boisson') return 'boisson'
  if (productCategory === 'packaging') return 'packaging'
  if (productCategory === 'maison') return 'maison'
  if (supplierName === 'Maison') return 'maison'
  if (supplierName === 'DS Service') return 'packaging'
  var n = normalizeName(name)
  var packKw = ['bol', 'bouteille', 'sac', 'couvercle', 'couvert', 'pot ', 'serviette', 'sticker', 'packaging', 'emballage']
  var drinkKw = ['coca', 'lipton', 'ice tea', 'eau', 'evian', 'perrier', 'sprite', 'fanta', 'limonade', 'jus de', 'soda']
  var i
  for (i = 0; i < packKw.length; i++) { if (n.indexOf(packKw[i]) >= 0) return 'packaging' }
  for (i = 0; i < drinkKw.length; i++) { if (n.indexOf(drinkKw[i]) >= 0) return 'boisson' }
  return 'ingredient'
}

// =============================================================================
// AchatsTab — Vue "où acheter quoi au meilleur prix" pour Emy
// =============================================================================
export default function AchatsTab(props) {
  var toast = props.toast || function(){}

  var [loading, setLoading] = useState(true)
  var [products, setProducts] = useState([])
  var [recipeIngs, setRecipeIngs] = useState([])
  var [productPrices, setProductPrices] = useState([])
  var [recipes, setRecipes] = useState([])
  var [suppliers, setSuppliers] = useState([])

  var [searchQ, setSearchQ] = useState('')
  var [activeCat, setActiveCat] = useState('all')
  var [sortBy, setSortBy] = useState('usage')
  var [expandedId, setExpandedId] = useState(null)

  useEffect(function(){
    var supa = sb()
    async function load() {
      setLoading(true)
      var pRes = await supa.from('products').select('id,name,supplier_id,current_price,unit,category,created_at').order('name')
      var riRes = await supa.from('recipe_ingredients').select('id,recipe_id,article,fournisseur,unite,qte,prix_achat,product_id,cout')
      var ppRes = await supa.from('product_prices').select('id,product_id,price,invoice_date,supplier_name').order('invoice_date', { ascending: false })
      var rRes = await supa.from('recipes').select('id,name,parent_slug,variant_key,variant_label,is_active').eq('is_active', true)
      var sRes = await supa.from('suppliers').select('id,name,category,archived').eq('archived', false)
      setProducts(pRes.data || [])
      setRecipeIngs(riRes.data || [])
      setProductPrices(ppRes.data || [])
      setRecipes(rRes.data || [])
      setSuppliers(sRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  // ---------------------------------------------------------------------------
  // GROUPEMENT : construire la liste des "ingredients" (cards) à afficher.
  // Chaque ingrédient = 1 ou N sources (products + lignes texte libre) regroupées.
  // ---------------------------------------------------------------------------
  function getGroupKey(name, isProduct) {
    var fam = getFamily(name)
    if (fam) return 'fam:' + fam
    return 'name:' + normalizeName(name)
  }

  function buildIngredients() {
    // Une map group_key → {name canonique, sources: [{type, supplier, price, unit, ...}]}
    var groups = {}
    var supById = {}
    suppliers.forEach(function(s){ supById[s.id] = s })

    // Source 1 : products du catalogue
    products.forEach(function(p){
      var sup = supById[p.supplier_id]
      var supName = sup ? sup.name : '—'
      var key = getGroupKey(p.name, true)
      if (!groups[key]) groups[key] = { key: key, name: p.name, family: getFamily(p.name), sources: [], usages: [] }
      // Si le nom du product est plus court que le canonical existant, le garder
      if (p.name.length < groups[key].name.length) groups[key].name = p.name
      groups[key].sources.push({
        type: 'product',
        product_id: p.id,
        supplier: supName,
        price: Number(p.current_price || 0),
        unit: p.unit || 'kg',
        category: p.category,
        original_name: p.name
      })
    })

    // Source 2 : lignes recipe_ingredients (avec ou sans product_id)
    // Groupées par fournisseur + article pour ne pas avoir N entrées identiques
    var riByKey = {}
    recipeIngs.forEach(function(ri){
      if (ri.product_id) {
        // déjà couvert par le product, on note juste l'usage
        var keyP = null
        // retrouver le product
        var prod = products.filter(function(p){ return p.id === ri.product_id })[0]
        if (prod) {
          keyP = getGroupKey(prod.name, true)
          if (groups[keyP]) groups[keyP].usages.push(ri)
        }
        return
      }
      // texte libre : ajouter comme source si pas déjà couvert par un product de même groupe
      var key = getGroupKey(ri.article, false)
      var sigKey = key + '::' + (ri.fournisseur || '') + '::' + (ri.unite || '')
      if (!riByKey[sigKey]) {
        riByKey[sigKey] = {
          key: key,
          article: ri.article,
          fournisseur: ri.fournisseur || '—',
          unit: ri.unite || 'kg',
          prices: [],
          usages: []
        }
      }
      riByKey[sigKey].prices.push(Number(ri.prix_achat || 0))
      riByKey[sigKey].usages.push(ri)
    })

    Object.keys(riByKey).forEach(function(sigKey){
      var rb = riByKey[sigKey]
      if (!groups[rb.key]) groups[rb.key] = { key: rb.key, name: rb.article, family: getFamily(rb.article), sources: [], usages: [] }
      // Si le nom texte libre est plus court, ou si pas de product déjà dedans
      var hasProduct = groups[rb.key].sources.some(function(s){ return s.type === 'product' })
      if (!hasProduct && rb.article.length < groups[rb.key].name.length) groups[rb.key].name = rb.article
      // Prix moyen des occurrences
      var avgPrice = rb.prices.reduce(function(a,b){return a+b}, 0) / (rb.prices.length || 1)
      groups[rb.key].sources.push({
        type: 'free',
        product_id: null,
        supplier: rb.fournisseur,
        price: avgPrice,
        unit: rb.unit,
        category: null,
        original_name: rb.article
      })
      rb.usages.forEach(function(u){ groups[rb.key].usages.push(u) })
    })

    // Convertir en array et enrichir
    var arr = Object.keys(groups).map(function(k){
      var g = groups[k]
      var category = 'ingredient'
      if (g.sources.length > 0) {
        category = detectCategory(g.name, g.sources[0].supplier, g.sources[0].category)
      }
      // Distinct recipes_count
      var recipeIds = {}
      g.usages.forEach(function(u){ recipeIds[u.recipe_id] = 1 })
      var nbRecipes = Object.keys(recipeIds).length

      // Identifier le meilleur prix (parmi sources de MÊME unité, sinon par unité séparément)
      var bestBySource = null
      var sortedByPrice = g.sources.slice().filter(function(s){ return s.price > 0 }).sort(function(a,b){ return a.price - b.price })
      if (sortedByPrice.length > 0) bestBySource = sortedByPrice[0]

      // Détection écart de prix entre fournisseurs (même unité)
      var hasUnitMix = false
      var unitsSeen = {}
      g.sources.forEach(function(s){ unitsSeen[s.unit] = 1 })
      if (Object.keys(unitsSeen).length > 1) hasUnitMix = true

      var savingsPct = 0
      if (sortedByPrice.length >= 2) {
        var u1 = sortedByPrice[0].unit
        var sameUnitPrices = sortedByPrice.filter(function(s){ return s.unit === u1 })
        if (sameUnitPrices.length >= 2) {
          var min = sameUnitPrices[0].price
          var max = sameUnitPrices[sameUnitPrices.length - 1].price
          savingsPct = max > 0 ? Math.round(100 * (max - min) / max) : 0
        }
      }

      return {
        key: g.key,
        name: g.name,
        family: g.family,
        category: category,
        sources: g.sources,
        nbRecipes: nbRecipes,
        nbSources: g.sources.length,
        bestPrice: bestBySource,
        hasUnitMix: hasUnitMix,
        savingsPct: savingsPct,
        usages: g.usages
      }
    })

    return arr
  }

  var allIngredients = buildIngredients()

  // Filtres + tri
  var ingredients = allIngredients.filter(function(ing){
    if (activeCat !== 'all' && ing.category !== activeCat) return false
    if (searchQ) {
      var q = searchQ.toLowerCase()
      if (ing.name.toLowerCase().indexOf(q) < 0) {
        // chercher aussi dans les sources
        var found = ing.sources.some(function(s){ return s.original_name.toLowerCase().indexOf(q) >= 0 || s.supplier.toLowerCase().indexOf(q) >= 0 })
        if (!found) return false
      }
    }
    return true
  })

  ingredients.sort(function(a,b){
    if (sortBy === 'usage') return b.nbRecipes - a.nbRecipes || a.name.localeCompare(b.name)
    if (sortBy === 'savings') return b.savingsPct - a.savingsPct || b.nbRecipes - a.nbRecipes
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    return 0
  })

  // Comptes par catégorie pour les onglets
  var counts = { all: allIngredients.length, ingredient: 0, boisson: 0, packaging: 0, maison: 0 }
  allIngredients.forEach(function(ing){ if (counts[ing.category] !== undefined) counts[ing.category]++ })

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  if (loading) {
    return <div style={{padding:24,textAlign:'center',opacity:.6}}>Chargement…</div>
  }

  var catTabs = [
    { key: 'all', label: 'Tous', emoji: '📋' },
    { key: 'ingredient', label: 'Ingrédients', emoji: '🥗' },
    { key: 'boisson', label: 'Boissons', emoji: '🥤' },
    { key: 'packaging', label: 'Packaging', emoji: '📦' },
    { key: 'maison', label: 'Maison', emoji: '🏠' }
  ]

  return (
    <div>
      {/* En-tête de la sous-vue */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:13,opacity:.6,marginBottom:6}}>
          Où acheter quoi au meilleur prix. {allIngredients.length} ingrédients suivis · {products.length} produits catalogue · {suppliers.length} fournisseurs actifs
        </div>
      </div>

      {/* Onglets catégorie */}
      <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
        {catTabs.map(function(t){
          var active = activeCat === t.key
          return (
            <button key={t.key} className="btn btn-sm" style={{
              background: active ? '#FF82D7' : '#fff',
              color: active ? '#fff' : '#191923',
              border: '1.5px solid '+(active ? '#FF82D7' : '#DDD'),
              fontWeight: 900,
              fontSize: 11
            }} onClick={function(){setActiveCat(t.key)}}>
              {t.emoji} {t.label} <span style={{opacity:.6,marginLeft:4}}>({counts[t.key] || 0})</span>
            </button>
          )
        })}
      </div>

      {/* Barre recherche + tri */}
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{flex:1,minWidth:200,position:'relative'}}>
          <input
            type="text"
            placeholder="🔍 Rechercher un ingrédient ou fournisseur…"
            value={searchQ}
            onChange={function(e){setSearchQ(e.target.value)}}
            style={{width:'100%',padding:'8px 12px',fontSize:12,border:'1.5px solid #DDD',borderRadius:6,background:'#fff'}}
          />
          {searchQ && (
            <button onClick={function(){setSearchQ('')}} style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:16,opacity:.4}}>✕</button>
          )}
        </div>
        <select value={sortBy} onChange={function(e){setSortBy(e.target.value)}} style={{padding:'8px 10px',fontSize:11,fontWeight:700,border:'1.5px solid #DDD',borderRadius:6,background:'#fff'}}>
          <option value="usage">Trier : par usage (recettes)</option>
          <option value="savings">Trier : économies possibles</option>
          <option value="name">Trier : alphabétique</option>
        </select>
      </div>

      {/* Liste */}
      {ingredients.length === 0 ? (
        <div style={{padding:32,textAlign:'center',opacity:.5,fontSize:12}}>
          Aucun ingrédient ne correspond à ces critères.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {ingredients.map(function(ing){
            return <IngredientCard
              key={ing.key}
              ing={ing}
              expanded={expandedId === ing.key}
              onToggle={function(){setExpandedId(expandedId === ing.key ? null : ing.key)}}
              recipes={recipes}
              productPrices={productPrices}
            />
          })}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// IngredientCard — une ligne de la vue Achats
// =============================================================================
function IngredientCard(props) {
  var ing = props.ing
  var expanded = props.expanded
  var recipes = props.recipes
  var productPrices = props.productPrices

  // Sources triées : meilleur prix d'abord (par unité)
  var sortedSources = ing.sources.slice().sort(function(a,b){
    if (a.unit !== b.unit) return a.unit.localeCompare(b.unit)
    return a.price - b.price
  })

  // Identifier le meilleur prix par unité (badge 🏆)
  var bestByUnit = {}
  ing.sources.forEach(function(s){
    if (s.price <= 0) return
    if (!bestByUnit[s.unit] || s.price < bestByUnit[s.unit]) bestByUnit[s.unit] = s.price
  })

  // Catégorie emoji
  var catEmoji = { ingredient: '🥗', boisson: '🥤', packaging: '📦', maison: '🏠' }[ing.category] || '•'

  return (
    <div style={{background:'#fff',border:'1.5px solid '+(expanded ? '#FF82D7' : '#EEE'),borderRadius:8,overflow:'hidden',transition:'border-color .15s'}}>
      {/* Ligne principale */}
      <div onClick={props.onToggle} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',cursor:'pointer',background:expanded ? '#FFF5FB' : '#fff'}}>
        <div style={{fontSize:14,flexShrink:0}}>{catEmoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:900,color:'#191923'}}>{ing.name}</div>
          <div style={{fontSize:10,opacity:.6,marginTop:2}}>
            {ing.nbRecipes > 0 ? (
              <span>Utilisé dans <strong>{ing.nbRecipes}</strong> recette{ing.nbRecipes > 1 ? 's' : ''}</span>
            ) : (
              <span style={{color:'#A05A00'}}>Non utilisé en recette</span>
            )}
            {ing.nbSources > 1 && <span> · {ing.nbSources} fournisseurs</span>}
            {ing.savingsPct >= 15 && <span style={{color:'#009D3A',fontWeight:900,marginLeft:6}}>💡 jusqu&apos;à {ing.savingsPct}% d&apos;économies</span>}
          </div>
        </div>
        {/* Aperçu prix le moins cher */}
        {ing.bestPrice && (
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{fontSize:12,fontWeight:900,color:'#009D3A'}}>{fmtPrice(ing.bestPrice.price)} €/{ing.bestPrice.unit}</div>
            <div style={{fontSize:9,opacity:.6,fontWeight:700}}>{ing.bestPrice.supplier}</div>
          </div>
        )}
        <div style={{fontSize:14,opacity:.4,flexShrink:0}}>{expanded ? '▼' : '▶'}</div>
      </div>

      {/* Détail expanded */}
      {expanded && (
        <div style={{padding:'10px 12px 12px',borderTop:'1px solid #F0F0F0',background:'#FAFAFA'}}>
          {/* Tableau des fournisseurs */}
          <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:6,letterSpacing:.5}}>Fournisseurs disponibles</div>
          <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:14}}>
            {sortedSources.map(function(src, idx){
              var isBest = src.price > 0 && bestByUnit[src.unit] === src.price
              var nbThatUnit = Object.keys(bestByUnit).length
              return (
                <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:isBest ? '#E8F8EE' : '#fff',border:'1px solid '+(isBest ? '#009D3A' : '#EEE'),borderRadius:5}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:900}}>
                      {src.supplier}
                      {src.type === 'free' && <span style={{fontSize:9,marginLeft:6,padding:'1px 5px',background:'#FFF8E1',color:'#856B00',borderRadius:3,fontWeight:900}}>🔗 NON LIÉ</span>}
                      {src.type === 'product' && <span style={{fontSize:9,marginLeft:6,padding:'1px 5px',background:'#E8F0FF',color:'#0066CC',borderRadius:3,fontWeight:900}}>📦 CATALOGUE</span>}
                    </div>
                    <div style={{fontSize:9,opacity:.55,marginTop:1}}>{src.original_name}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{fontSize:12,fontWeight:900,color:isBest ? '#009D3A' : '#191923'}}>
                      {src.price > 0 ? (
                        <span>{fmtPrice(src.price)} €/{src.unit}</span>
                      ) : (
                        <span style={{color:'#A05A00',fontSize:10}}>Prix manquant</span>
                      )}
                    </div>
                    {isBest && nbThatUnit > 0 && <div style={{fontSize:9,fontWeight:900,color:'#009D3A'}}>🏆 MEILLEUR</div>}
                  </div>
                </div>
              )
            })}
          </div>

          {ing.hasUnitMix && (
            <div style={{fontSize:10,padding:'6px 8px',background:'#FFF6E5',border:'1px solid #FFD699',borderRadius:4,marginBottom:12,color:'#A05A00'}}>
              ⚠️ Unités différentes selon les fournisseurs ({Object.keys(bestByUnit).join(', ')}) — comparaison de prix directe impossible.
            </div>
          )}

          {/* Recettes utilisatrices */}
          {ing.usages.length > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:6,letterSpacing:.5}}>Utilisé dans</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {(function(){
                  var seenRecipes = {}
                  var pills = []
                  ing.usages.forEach(function(u){
                    if (seenRecipes[u.recipe_id]) return
                    seenRecipes[u.recipe_id] = 1
                    var rec = recipes.filter(function(r){ return r.id === u.recipe_id })[0]
                    if (!rec) return
                    pills.push(
                      <div key={u.recipe_id} style={{fontSize:10,padding:'3px 8px',background:'#fff',border:'1px solid #DDD',borderRadius:12,fontWeight:700}}>
                        {rec.name} <span style={{opacity:.5,marginLeft:3}}>· {u.qte}{u.unite}</span>
                      </div>
                    )
                  })
                  return pills
                })()}
              </div>
            </div>
          )}

          {/* Historique prix (depuis product_prices) */}
          {(function(){
            var productIds = ing.sources.filter(function(s){ return s.product_id }).map(function(s){ return s.product_id })
            var hist = productPrices.filter(function(pp){ return productIds.indexOf(pp.product_id) >= 0 }).slice(0, 8)
            if (hist.length === 0) return null
            return (
              <div>
                <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:6,letterSpacing:.5}}>Historique d&apos;achats récents</div>
                <div style={{background:'#fff',border:'1px solid #EEE',borderRadius:5,overflow:'hidden'}}>
                  {hist.map(function(h, i){
                    return (
                      <div key={h.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 10px',fontSize:10,borderTop: i > 0 ? '1px solid #F5F5F5' : 'none'}}>
                        <div style={{flex:1,opacity:.7}}>{fmtDate(h.invoice_date)}</div>
                        <div style={{flex:1.5,fontWeight:700}}>{h.supplier_name || '—'}</div>
                        <div style={{fontWeight:900,color:'#191923'}}>{fmtPrice(h.price)} €</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Tip Emy */}
          {ing.bestPrice && ing.nbSources > 1 && !ing.hasUnitMix && (
            <div style={{marginTop:14,padding:'8px 10px',background:'#E8F8EE',border:'1px solid #009D3A',borderRadius:5,fontSize:11,color:'#005C24',fontWeight:700}}>
              💡 <strong>Conseil Emy :</strong> commander chez <strong>{ing.bestPrice.supplier}</strong> à {fmtPrice(ing.bestPrice.price)} €/{ing.bestPrice.unit}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
