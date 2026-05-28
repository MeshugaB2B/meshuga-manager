'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import IngredientPopup from './IngredientPopup'
import FoodCostInvoiceWizard from './FoodCostInvoiceWizard'
import ProductRecipeAssignment from './ProductRecipeAssignment'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

// Convertit la TVA en ratio décimal (accepte 10, 0.10, 5.5, 0.055…)
function tvaToRatio(t) {
  var n = Number(t || 0)
  if (n > 1) return n / 100
  return n
}

export default function FoodCostTab(props) {
  var fcSeuil = props.fcSeuil || 25
  var setFcSeuil = props.setFcSeuil
  var toast = props.toast || function(m){ console.log(m) }

  // ============= STATE =============
  var [loading, setLoading] = useState(true)
  var [recipes, setRecipes] = useState([])
  var [ingredients, setIngredients] = useState([])
  var [drinks, setDrinks] = useState([])
  var [products, setProducts] = useState([])
  var [suppliers, setSuppliers] = useState([])

  var [fcView, setFcView] = useState('recettes')
  var [fcSelectedParent, setFcSelectedParent] = useState(null)
  var [fcSelectedVariant, setFcSelectedVariant] = useState('standard')
  var [ingPopup, setIngPopup] = useState(null)
  var [fcCatFilter, setFcCatFilter] = useState('tous')

  var [editingIngId, setEditingIngId] = useState(null)
  var [editingIngDraft, setEditingIngDraft] = useState(null)
  var [savingIng, setSavingIng] = useState(false)

  var [addIngOpen, setAddIngOpen] = useState(false)
  var [addIngSearch, setAddIngSearch] = useState('')
  var [creatingProduct, setCreatingProduct] = useState(false)
  var [newProductDraft, setNewProductDraft] = useState(null)
  var [creatingProductSaving, setCreatingProductSaving] = useState(false)

  var [pendingAssignment, setPendingAssignment] = useState(null)

  var [editingPrixTTC, setEditingPrixTTC] = useState(null)
  var [editingMeta, setEditingMeta] = useState(null)

  var [newRecipeModal, setNewRecipeModal] = useState(null)
  var [newDrinkModal, setNewDrinkModal] = useState(null)

  var [fcInvoiceModal, setFcInvoiceModal] = useState(false)

  var [drinkEdit, setDrinkEdit] = useState(null)

  // ============= LOAD DATA =============
  function loadData() {
    setLoading(true)
    Promise.all([
      sb().from('recipes').select('*').eq('is_active', true).order('parent_slug'),
      sb().from('recipe_ingredients').select('*'),
      sb().from('drinks_resale').select('*').eq('is_active', true).order('display_order'),
      sb().from('products').select('*').eq('is_active', true).order('name'),
      sb().from('suppliers').select('*').order('name')
    ]).then(function(results) {
      setRecipes(results[0].data || [])
      setIngredients(results[1].data || [])
      setDrinks(results[2].data || [])
      setProducts(results[3].data || [])
      setSuppliers(results[4].data || [])
      setLoading(false)
    }).catch(function(e){
      toast('Erreur chargement : ' + (e.message || String(e)))
      setLoading(false)
    })
  }

  useEffect(function(){
    loadData()
  }, [])

  // ============= COMPUTED: grouped recipes =============
  function buildGrouped() {
    var grouped = {}
    var i
    var parentCategories = {}
    for (i = 0; i < recipes.length; i++) {
      var rr = recipes[i]
      if (!rr.parent_slug) continue
      if (rr.variant_key === 'standard' || !parentCategories[rr.parent_slug]) {
        parentCategories[rr.parent_slug] = rr.categorie
      }
    }

    for (i = 0; i < recipes.length; i++) {
      var r = recipes[i]
      if (!r.parent_slug) continue
      if (!grouped[r.parent_slug]) {
        var parentName = r.name || ''
        if (r.variant_key !== 'standard') parentName = parentName.replace(/\s+Mini$/, '')
        grouped[r.parent_slug] = {
          parent_slug: r.parent_slug,
          name: parentName,
          category: parentCategories[r.parent_slug] || r.categorie,
          variants: {}
        }
      }
      if (r.variant_key === 'standard') {
        grouped[r.parent_slug].name = r.name
      }

      var rIngs = ingredients.filter(function(x){ return x.recipe_id === r.id })
      var totalCost = 0
      var k
      for (k = 0; k < rIngs.length; k++) {
        totalCost += Number(rIngs[k].prix_achat || 0) * Number(rIngs[k].qte || 0)
      }
      var tvaRatio = tvaToRatio(r.tva)
      if (tvaRatio === 0) tvaRatio = 0.055
      var prixTTC = Number(r.prix_vente_ttc || 0)
      var prixHT = prixTTC / (1 + tvaRatio)
      var fcPct = prixHT > 0 ? Math.round(totalCost / prixHT * 1000) / 10 : 0
      var marge = Math.round((prixHT - totalCost) * 100) / 100

      grouped[r.parent_slug].variants[r.variant_key || 'standard'] = {
        id: r.id,
        name: r.name,
        variant_key: r.variant_key || 'standard',
        variant_label: r.variant_label || 'Standard',
        categorie: r.categorie,
        prix_vente_ttc: prixTTC,
        prix_vente_ht: prixHT,
        tva_ratio: tvaRatio,
        ingredients: rIngs,
        food_cost_ht: totalCost,
        food_cost_pct: fcPct,
        marge_ht: marge
      }
    }
    return grouped
  }

  var grouped = buildGrouped()
  var groupedList = Object.values(grouped)

  var selectedParent = null
  if (fcSelectedParent) {
    var gi
    for (gi = 0; gi < groupedList.length; gi++) {
      if (groupedList[gi].parent_slug === fcSelectedParent) {
        selectedParent = groupedList[gi]
        break
      }
    }
  }

  // ============= HELPERS =============
  function pickVariant(parent, preferVariant) {
    if (!parent) return null
    if (parent.variants[preferVariant]) return parent.variants[preferVariant]
    if (parent.variants.standard) return parent.variants.standard
    var keys = Object.keys(parent.variants)
    return keys.length > 0 ? parent.variants[keys[0]] : null
  }

  function fmt(n) {
    return (Math.round(Number(n || 0) * 100) / 100).toFixed(2)
  }

  function fmtPrep(n) {
    var v = Number(n || 0)
    if (Math.abs(v) >= 0.10) return v.toFixed(2)
    if (Math.abs(v) >= 0.001) return v.toFixed(3)
    return v.toFixed(4)
  }

  function isPrepCat(cat) {
    return cat === 'sous_recette' || cat === 'sauce'
  }

  function computeKPIs() {
    var allVariants = []
    var gi
    for (gi = 0; gi < groupedList.length; gi++) {
      var vs = Object.values(groupedList[gi].variants)
      var vi
      for (vi = 0; vi < vs.length; vi++) {
        if (!isPrepCat(vs[vi].categorie)) allVariants.push(vs[vi])
      }
    }
    if (allVariants.length === 0) return { avg: 0, alerts: [], best: null, worst: null }
    var sum = 0
    var aa
    for (aa = 0; aa < allVariants.length; aa++) sum += allVariants[aa].food_cost_pct
    var avg = sum / allVariants.length
    var sorted = allVariants.slice().sort(function(a,b){return a.food_cost_pct - b.food_cost_pct})
    var alerts = allVariants.filter(function(v){ return v.food_cost_pct > fcSeuil })
    return { avg: avg, alerts: alerts, best: sorted[0], worst: sorted[sorted.length - 1] }
  }

  // ============= INLINE INGREDIENT EDIT =============
  function startEditIng(ing) {
    setEditingIngId(ing.id)
    setEditingIngDraft({
      id: ing.id,
      qte: Number(ing.qte || 0),
      prix_achat: Number(ing.prix_achat || 0)
    })
  }

  function cancelEditIng() {
    setEditingIngId(null)
    setEditingIngDraft(null)
  }

  function saveEditIng() {
    if (!editingIngDraft) return
    setSavingIng(true)
    var payload = {
      qte: editingIngDraft.qte,
      prix_achat: editingIngDraft.prix_achat,
      cout: editingIngDraft.qte * editingIngDraft.prix_achat
    }
    sb().from('recipe_ingredients').update(payload).eq('id', editingIngDraft.id).then(function(res){
      if (res.error) {
        toast('Erreur : ' + res.error.message)
        setSavingIng(false)
        return
      }
      toast('✅ Enregistré')
      setSavingIng(false)
      setEditingIngId(null)
      setEditingIngDraft(null)
      loadData()
    })
  }

  function removeIngredient(ing) {
    if (!ing.id) return
    sb().from('recipe_ingredients').delete().eq('id', ing.id).then(function(res){
      if (res.error) { toast('Erreur : ' + res.error.message); return }
      toast('🗑️ Ingrédient retiré')
      setEditingIngId(null)
      setEditingIngDraft(null)
      loadData()
    })
  }

  function addIngredientFromProduct(p, recipeId) {
    var supName = ''
    var si
    for (si = 0; si < suppliers.length; si++) {
      if (suppliers[si].id === p.supplier_id) { supName = suppliers[si].name; break }
    }
    sb().from('recipe_ingredients').insert({
      recipe_id: recipeId,
      article: p.name,
      fournisseur: supName,
      unite: p.unit || 'kg',
      prix_achat: Number(p.current_price || 0),
      qte: 0,
      cout: 0,
      product_id: p.id
    }).then(function(res){
      if (res.error) { toast('Erreur : ' + res.error.message); return }
      toast('+ Ingrédient ajouté (quantité à renseigner)')
      setAddIngOpen(false)
      setAddIngSearch('')
      loadData()
    })
  }

  // ============= CREATE PRODUCT INLINE =============
  function openCreateProduct(prefilledName) {
    setNewProductDraft({
      name: prefilledName || '',
      supplier_mode: 'existing',
      supplier_id: '',
      new_supplier_name: '',
      current_price: 0,
      unit: 'kg',
      category: 'ingredient'
    })
    setCreatingProduct(true)
  }

  function cancelCreateProduct() {
    setCreatingProduct(false)
    setNewProductDraft(null)
  }

  function createProductAndAddToRecipe(recipeId) {
    if (!newProductDraft) return
    var d = newProductDraft
    if (!d.name || d.name.trim().length < 2) { toast('Nom du produit obligatoire (min 2 caractères)'); return }
    if (d.supplier_mode === 'existing' && !d.supplier_id) { toast('Sélectionne un fournisseur'); return }
    if (d.supplier_mode === 'new' && (!d.new_supplier_name || d.new_supplier_name.trim().length < 2)) { toast('Nom du nouveau fournisseur obligatoire'); return }
    if (!Number(d.current_price) || Number(d.current_price) <= 0) { toast('Prix HT obligatoire (> 0)'); return }

    setCreatingProductSaving(true)

    var doInsertProduct = function(supplierId, supplierName) {
      var prodPayload = {
        name: d.name.trim(),
        supplier_id: supplierId,
        current_price: Number(d.current_price),
        unit: d.unit || 'kg',
        category: d.category || 'ingredient',
        is_active: true
      }
      sb().from('products').insert(prodPayload).select().single().then(function(res){
        if (res.error) {
          toast('Erreur produit : ' + res.error.message)
          setCreatingProductSaving(false)
          return
        }
        var p = res.data
        toast('✅ Produit créé. Sélectionne les recettes et saisis les quantités.')
        setCreatingProductSaving(false)
        setCreatingProduct(false)
        setNewProductDraft(null)
        setAddIngOpen(false)
        setAddIngSearch('')
        loadData()
        setPendingAssignment({
          product: Object.assign({}, p, { supplier_name: supplierName }),
          current_recipe_id: recipeId
        })
      })
    }

    if (d.supplier_mode === 'existing') {
      var supName = ''
      var si2
      for (si2 = 0; si2 < suppliers.length; si2++) {
        if (suppliers[si2].id === d.supplier_id) { supName = suppliers[si2].name; break }
      }
      doInsertProduct(d.supplier_id, supName)
    } else {
      var supCat = d.category === 'boisson' ? 'boisson' : (d.category || 'ingredient')
      sb().from('suppliers').insert({
        name: d.new_supplier_name.trim(),
        category: supCat
      }).select().single().then(function(supRes){
        if (supRes.error) {
          toast('Erreur fournisseur : ' + supRes.error.message)
          setCreatingProductSaving(false)
          return
        }
        doInsertProduct(supRes.data.id, supRes.data.name)
      })
    }
  }

  function saveRecipePriceTTC(recipeId, newPrix) {
    sb().from('recipes').update({ prix_vente_ttc: newPrix, updated_at: new Date().toISOString() })
      .eq('id', recipeId)
      .then(function(res){
        if (res.error) { toast('Erreur : ' + res.error.message); return }
        toast('✅ Prix mis à jour')
        setEditingPrixTTC(null)
        loadData()
      })
  }

  function saveDrinkPrice(drink, newPriceHT) {
    sb().from('drinks_resale').update({ purchase_price_ht: newPriceHT }).eq('id', drink.id).then(function(res){
      if (res.error) { toast('Erreur: ' + res.error.message); return }
      toast('✅ Prix mis à jour')
      setDrinkEdit(null)
      loadData()
    })
  }

  // ============= DELETE RECIPE =============
  function deleteRecipeParent(parentSlug, parentName) {
    if (!confirm('Supprimer définitivement la recette "' + parentName + '" (toutes variantes + ingrédients) ?\n\nCette action est irréversible.')) return
    var client = sb()
    var variantIds = []
    var i
    for (i = 0; i < recipes.length; i++) {
      if (recipes[i].parent_slug === parentSlug) variantIds.push(recipes[i].id)
    }
    if (variantIds.length === 0) return
    client.from('recipe_ingredients').delete().in('recipe_id', variantIds).then(function(r1){
      if (r1.error) { toast('Erreur: ' + r1.error.message); return }
      client.from('recipes').delete().in('id', variantIds).then(function(r2){
        if (r2.error) { toast('Erreur: ' + r2.error.message); return }
        toast('🗑️ ' + parentName + ' supprimée')
        setFcSelectedParent(null)
        loadData()
      })
    })
  }

  // ============= DELETE DRINK =============
  function deleteDrink(drink) {
    if (!confirm('Supprimer définitivement "' + drink.name + '" ?\n\nCette action est irréversible.')) return
    sb().from('drinks_resale').delete().eq('id', drink.id).then(function(res){
      if (res.error) { toast('Erreur: ' + res.error.message); return }
      toast('🗑️ ' + drink.name + ' supprimée')
      loadData()
    })
  }

  // ============= UPDATE META RECIPE =============
  function startEditMeta(v, parent) {
    setEditingMeta({
      recipe_id: v.id,
      name: v.name,
      categorie: parent.category,
      tva: v.tva_ratio * 100
    })
  }

  function saveEditMeta() {
    if (!editingMeta) return
    if (!editingMeta.name) { toast('Nom obligatoire'); return }
    var payload = {
      name: editingMeta.name,
      categorie: editingMeta.categorie,
      tva: editingMeta.tva,
      updated_at: new Date().toISOString()
    }
    sb().from('recipes').update(payload).eq('id', editingMeta.recipe_id).then(function(res){
      if (res.error) { toast('Erreur: ' + res.error.message); return }
      toast('✅ Recette mise à jour')
      setEditingMeta(null)
      loadData()
    })
  }

  // ============= CREATE RECIPE =============
  function createRecipe() {
    if (!newRecipeModal || !newRecipeModal.name) { toast('Nom obligatoire'); return }
    var slug = (newRecipeModal.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    var newId = slug + '_' + Date.now().toString(36)
    var payload = {
      id: newId,
      name: newRecipeModal.name,
      categorie: newRecipeModal.categorie || 'classique',
      prix_vente_ttc: Number(newRecipeModal.prix_vente_ttc || 0),
      tva: Number(newRecipeModal.tva || 5.5),
      parent_slug: slug,
      variant_key: 'standard',
      variant_label: 'Standard',
      is_active: true
    }
    sb().from('recipes').insert(payload).then(function(res){
      if (res.error) { toast('Erreur: ' + res.error.message); return }
      toast('✅ Recette "' + newRecipeModal.name + '" créée')
      setNewRecipeModal(null)
      loadData()
      setTimeout(function(){ setFcSelectedParent(slug) }, 400)
    })
  }

  // ============= CREATE DRINK =============
  function createDrink() {
    if (!newDrinkModal || !newDrinkModal.name) { toast('Nom obligatoire'); return }
    var slug = (newDrinkModal.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    var payload = {
      slug: slug + '_' + Date.now().toString(36),
      name: newDrinkModal.name,
      supplier_name: newDrinkModal.supplier_name || '',
      purchase_price_ht: Number(newDrinkModal.purchase_price_ht || 0),
      selling_price_ttc: Number(newDrinkModal.selling_price_ttc || 0),
      tva_rate: 0.20,
      is_active: true,
      display_order: drinks.length
    }
    sb().from('drinks_resale').insert(payload).then(function(res){
      if (res.error) { toast('Erreur: ' + res.error.message); return }
      toast('✅ Boisson "' + newDrinkModal.name + '" ajoutée')
      setNewDrinkModal(null)
      loadData()
    })
  }

  // ============= RENDER =============
  if (loading) {
    return (
      <div style={{padding:40,textAlign:'center'}}>
        <div style={{fontSize:32,marginBottom:12}}>🧠</div>
        <div style={{fontWeight:900}}>Chargement des recettes…</div>
      </div>
    )
  }

  var kpis = computeKPIs()

  return (
    <div>
      {/* ========== CATALOGUE V2 (Sprint 1) ========== */}
      {fcView === 'recettes' && !fcSelectedParent && (function(){
        var allCats = [
          {id:'tous', label:'Tout', emoji:'☰'},
          {id:'classique', label:'Sandwichs', emoji:'🥪'},
          {id:'mini', label:'Minis', emoji:'🥖'},
          {id:'salade', label:'Salades', emoji:'🥗'},
          {id:'accompagnement', label:'Accompagn.', emoji:'🍟'},
          {id:'boisson', label:'Boissons', emoji:'🥤'},
          {id:'dessert', label:'Desserts', emoji:'🍪'},
          {id:'merchandising', label:'Merch.', emoji:'🛍️'},
          {id:'sous_recette', label:'Sous-recettes', emoji:'⚙️'}
        ]
        function catMatches(catId, item){
          if (catId === 'tous') return !isPrepCat(item.categorie)
          if (catId === 'sous_recette') return item.categorie === 'sous_recette' || item.categorie === 'sauce'
          return item.categorie === catId
        }
        // Construire la liste à afficher : items = {type:'recipe'|'drink', parent?, variant?, drink?, name, fcPct, margeHt, prixTtc}
        var items = []
        groupedList.forEach(function(parent){
          var vStd = parent.variants.standard
          var vMini = parent.variants.mini
          var displayItems = []
          if (vStd) displayItems.push({variant:vStd, parent:parent})
          if (vMini && fcCatFilter==='mini') displayItems.push({variant:vMini, parent:parent})
          // Si le filtre est "mini", on n'affiche que les minis
          if (fcCatFilter==='mini') {
            if (vMini) items.push({type:'recipe', parent:parent, primary:vMini, secondary:null})
            return
          }
          // Sinon : on affiche la STD comme carte principale, et la mini en badge secondaire
          var primary = vStd || vMini
          var secondary = (vStd && vMini) ? vMini : null
          if (!primary) return
          if (!catMatches(fcCatFilter, primary)) return
          items.push({type:'recipe', parent:parent, primary:primary, secondary:secondary})
        })
        // Boissons revente
        if (fcCatFilter==='tous' || fcCatFilter==='boisson') {
          drinks.forEach(function(d){
            var tvaR = tvaToRatio(d.tva_rate); if (tvaR===0) tvaR = 0.20
            var prixHT = Number(d.selling_price_ttc) / (1+tvaR)
            var marge = Math.round((prixHT - Number(d.purchase_price_ht))*100)/100
            var pct = prixHT > 0 ? Math.round(Number(d.purchase_price_ht)/prixHT*1000)/10 : 0
            items.push({type:'drink', drink:d, name:d.name, fcPct:pct, margeHt:marge, prixTtc:Number(d.selling_price_ttc), supplier:d.supplier_name})
          })
        }
        // Couleur jauge food cost (vert/jaune/rouge selon seuil)
        function fcColor(pct){
          if (pct > fcSeuil) return '#CC0066'
          if (pct > fcSeuil - 5) return '#FFA500'
          return '#009D3A'
        }
        // Emoji par catégorie (pour placeholder photo)
        function catEmoji(cat){
          var m = {classique:'🥪', mini:'🥖', salade:'🥗', accompagnement:'🍟', boisson:'🥤', dessert:'🍪', merchandising:'🛍️', sous_recette:'⚙️', sauce:'🥫'}
          return m[cat] || '🍴'
        }

        var showKPIs = fcCatFilter !== 'preparations' && fcCatFilter !== 'sous_recette'

        return (
          <div>
            {/* Barre actions (titre + boutons) */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14,gap:10,flexWrap:'wrap'}}>
              <div>
                <div style={{fontFamily:"'Yellowtail',cursive",fontSize:32,color:'var(--p)',lineHeight:1}}>Recettes</div>
                <div style={{fontSize:11,opacity:.55,fontWeight:700,marginTop:2}}>{(function(){var n=0;groupedList.forEach(function(p){Object.values(p.variants).forEach(function(vv){if(!isPrepCat(vv.categorie))n++})});return n})()} recettes · {drinks.length} boissons revente</div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                <button className="btn btn-sm" style={{background:'var(--p)',color:'#fff',fontWeight:900,fontSize:11}} onClick={function(){setNewRecipeModal({name:'',categorie:'classique',prix_vente_ttc:0,tva:5.5})}}>+ Recette</button>
                <button className="btn btn-sm" style={{background:'var(--p)',color:'#fff',fontWeight:900,fontSize:11}} onClick={function(){setNewDrinkModal({name:'',supplier_name:'',purchase_price_ht:0,selling_price_ttc:0})}}>+ Boisson</button>
                <button className="btn btn-sm" style={{background:'#191923',color:'var(--y)',fontWeight:900,fontSize:11}} onClick={function(){setFcInvoiceModal(true)}}>📄 Facture</button>
              </div>
            </div>

            {/* Chips catégories scrollables */}
            <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:14,scrollbarWidth:'none',WebkitOverflowScrolling:'touch'}}>
              {allCats.map(function(cat){
                var active = fcCatFilter === cat.id
                return (
                  <button key={cat.id} onClick={function(){setFcCatFilter(cat.id)}} style={{flexShrink:0,padding:'8px 14px',background:active?'#191923':'#FFFFFF',color:active?'var(--y)':'#191923',border:'2px solid #191923',borderRadius:20,fontWeight:900,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:5}}>
                    <span style={{fontSize:14}}>{cat.emoji}</span>
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* KPI Tuiles : 4 cartes santé */}
            {showKPIs && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10,marginBottom:18}}>
                <div style={{background:'#FFFFFF',borderRadius:14,padding:'14px 16px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.55,letterSpacing:.5}}>Food cost moyen</div>
                  <div style={{fontSize:30,fontWeight:900,color:kpis.avg>fcSeuil?'#CC0066':'#009D3A',lineHeight:1.1,marginTop:4}}>{kpis.avg.toFixed(1)}<span style={{fontSize:16}}>%</span></div>
                </div>
                <div style={{background:kpis.alerts.length>0?'#FFE5E5':'#FFFFFF',borderRadius:14,padding:'14px 16px',border:'2px solid '+(kpis.alerts.length>0?'#CC0066':'#191923'),boxShadow:'3px 3px 0 '+(kpis.alerts.length>0?'#CC0066':'#191923')}}>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.55,letterSpacing:.5}}>⚠️ En alerte ({fcSeuil}%+)</div>
                  <div style={{fontSize:30,fontWeight:900,color:kpis.alerts.length>0?'#CC0066':'#009D3A',lineHeight:1.1,marginTop:4}}>{kpis.alerts.length}</div>
                  <div style={{fontSize:9,opacity:.55,marginTop:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{kpis.alerts.length>0?kpis.alerts.slice(0,2).map(function(v){return v.name}).join(' · '):'Tout est OK ✅'}</div>
                </div>
                {kpis.best && (
                  <div style={{background:'var(--y)',borderRadius:14,padding:'14px 16px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                    <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.7,letterSpacing:.5}}>🏆 Meilleure marge</div>
                    <div style={{fontSize:14,fontWeight:900,lineHeight:1.15,marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{kpis.best.name}</div>
                    <div style={{fontSize:11,opacity:.7,marginTop:2,fontWeight:700}}>{kpis.best.food_cost_pct}% FC · {fmt(kpis.best.marge_ht)}€</div>
                  </div>
                )}
                {kpis.worst && (
                  <div style={{background:'#FFFFFF',borderRadius:14,padding:'14px 16px',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923'}}>
                    <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.55,letterSpacing:.5}}>📊 Plus chargée</div>
                    <div style={{fontSize:14,fontWeight:900,lineHeight:1.15,marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{kpis.worst.name}</div>
                    <div style={{fontSize:11,marginTop:2,fontWeight:700,color:kpis.worst.food_cost_pct>fcSeuil?'#CC0066':'#555'}}>{kpis.worst.food_cost_pct}% FC</div>
                  </div>
                )}
              </div>
            )}

            {/* Seuil discret */}
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:14,fontSize:10,fontWeight:700,opacity:.6}}>
              <span>Seuil alerte :</span>
              {[20,25,30,35].map(function(s){return(
                <button key={s} onClick={function(){if(setFcSeuil)setFcSeuil(s)}} style={{padding:'3px 8px',fontSize:10,fontWeight:900,border:'1.5px solid '+(fcSeuil===s?'#CC0066':'#DDD'),background:fcSeuil===s?'#CC0066':'#FFF',color:fcSeuil===s?'#FFF':'#555',borderRadius:10,cursor:'pointer'}}>{s}%</button>
              )})}
            </div>

            {/* Galerie de cartes */}
            {items.length === 0 && (
              <div style={{textAlign:'center',padding:40,opacity:.5,fontWeight:700}}>Aucune recette dans cette catégorie</div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:14}}>
              {items.map(function(it, idx){
                if (it.type === 'drink') {
                  var d = it.drink
                  var dColor = fcColor(it.fcPct)
                  return (
                    <div key={'drk_'+d.id} style={{background:'#FFFFFF',borderRadius:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',overflow:'hidden',display:'flex',flexDirection:'column'}}>
                      <div style={{height:90,background:'linear-gradient(135deg, #FFE5F5 0%, #FFE5E5 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:42,position:'relative'}}>
                        🥤
                        <div style={{position:'absolute',top:6,right:6,background:'#191923',color:'#FFF',fontSize:9,fontWeight:900,padding:'2px 6px',borderRadius:6,letterSpacing:.5}}>REVENTE</div>
                      </div>
                      <div style={{padding:'10px 12px',flex:1,display:'flex',flexDirection:'column',gap:6}}>
                        <div style={{fontWeight:900,fontSize:13,lineHeight:1.2}}>{d.name}</div>
                        <div style={{fontSize:10,opacity:.55,fontWeight:700}}>{d.supplier_name}</div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'auto',paddingTop:8}}>
                          <div>
                            <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase'}}>Food cost</div>
                            <div style={{fontSize:22,fontWeight:900,color:dColor,lineHeight:1}}>{it.fcPct}<span style={{fontSize:12}}>%</span></div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase'}}>Marge</div>
                            <div style={{fontSize:14,fontWeight:900,color:'#009D3A',lineHeight:1.1}}>{fmt(it.margeHt)}€</div>
                          </div>
                        </div>
                        <div style={{height:5,background:'#F0F0F0',borderRadius:3,overflow:'hidden'}}>
                          <div style={{width:Math.min(it.fcPct,50)/50*100+'%',height:'100%',background:dColor}} />
                        </div>
                        <div style={{fontSize:10,opacity:.6,fontWeight:700}}>PV {fmt(d.selling_price_ttc)}€ TTC</div>
                      </div>
                    </div>
                  )
                }
                // Recette
                var p = it.primary
                var sec = it.secondary
                var parent = it.parent
                var c = fcColor(p.food_cost_pct)
                var isPrep = isPrepCat(p.categorie)
                return (
                  <div key={parent.parent_slug} onClick={function(){setFcSelectedParent(parent.parent_slug);setFcSelectedVariant(p.variant_key)}} style={{background:'#FFFFFF',borderRadius:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',overflow:'hidden',cursor:'pointer',display:'flex',flexDirection:'column',transition:'transform .12s'}} onMouseEnter={function(e){e.currentTarget.style.transform='translate(-1px,-1px)';e.currentTarget.style.boxShadow='4px 4px 0 #191923'}} onMouseLeave={function(e){e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='3px 3px 0 #191923'}}>
                    {/* Photo / placeholder */}
                    <div style={{height:110,background:'linear-gradient(135deg, var(--y) 0%, #FFF5C2 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:54,position:'relative',borderBottom:'2px solid #191923'}}>
                      {catEmoji(p.categorie)}
                      {sec && (
                        <div style={{position:'absolute',top:6,right:6,background:'#191923',color:'var(--y)',fontSize:9,fontWeight:900,padding:'3px 7px',borderRadius:6,letterSpacing:.5}}>STD + MINI</div>
                      )}
                      {isPrep && (
                        <div style={{position:'absolute',top:6,right:6,background:'var(--p)',color:'#FFF',fontSize:9,fontWeight:900,padding:'3px 7px',borderRadius:6,letterSpacing:.5}}>SOUS-RECETTE</div>
                      )}
                    </div>
                    <div style={{padding:'10px 12px',flex:1,display:'flex',flexDirection:'column',gap:6}}>
                      <div style={{fontWeight:900,fontSize:14,lineHeight:1.2}}>{parent.name}</div>
                      <div style={{fontSize:10,opacity:.55,fontWeight:700,textTransform:'capitalize'}}>{p.categorie.replace('_',' ')}</div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginTop:'auto',paddingTop:8}}>
                        <div>
                          <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase'}}>Food cost</div>
                          <div style={{fontSize:22,fontWeight:900,color:c,lineHeight:1}}>{p.food_cost_pct}<span style={{fontSize:12}}>%</span></div>
                        </div>
                        {!isPrep && (
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase'}}>Marge</div>
                            <div style={{fontSize:14,fontWeight:900,color:'#009D3A',lineHeight:1.1}}>{fmt(p.marge_ht)}€</div>
                          </div>
                        )}
                      </div>
                      {/* Barre proportion FC */}
                      <div style={{height:5,background:'#F0F0F0',borderRadius:3,overflow:'hidden'}}>
                        <div style={{width:Math.min(p.food_cost_pct,50)/50*100+'%',height:'100%',background:c}} />
                      </div>
                      {/* Prix de vente : STD et MINI si présents */}
                      <div style={{fontSize:10,opacity:.7,fontWeight:700,display:'flex',gap:8,flexWrap:'wrap'}}>
                        {!isPrep && <span>Std <span style={{fontWeight:900,color:'#191923'}}>{fmt(p.prix_vente_ttc)}€</span></span>}
                        {sec && <span>Mini <span style={{fontWeight:900,color:'#191923'}}>{fmt(sec.prix_vente_ttc)}€</span></span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ========== DETAIL RECETTE ========== */}
      {fcView === 'recettes' && selectedParent && (function(){
        var parent = selectedParent
        var v = pickVariant(parent, fcSelectedVariant)
        if (!v) return <div>Erreur variant</div>
        var isPrep = isPrepCat(v.categorie)
        var tvaRatio = v.tva_ratio
        var conseilX4TTC = Math.round(v.food_cost_ht * 4 * (1 + tvaRatio) * 100) / 100
        var conseilX5TTC = Math.round(v.food_cost_ht * 5 * (1 + tvaRatio) * 100) / 100
        var variantsList = Object.values(parent.variants)
        var coeffActuel = v.food_cost_ht > 0 ? Math.round(v.prix_vente_ht / v.food_cost_ht * 100) / 100 : 0

        return (
          <div>
            <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn btn-sm" onClick={function(){setFcSelectedParent(null);setAddIngOpen(false);setEditingIngId(null);setEditingPrixTTC(null);setEditingMeta(null);setCreatingProduct(false);setNewProductDraft(null)}}>← Retour</button>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923',flex:1,display:'flex',alignItems:'center',gap:8}}>
                {parent.name}
                {isPrep && <span style={{fontFamily:'Arial Narrow, Arial, sans-serif',fontSize:10,background:'#F3EBFA',color:'#A06CD5',padding:'3px 8px',borderRadius:4,fontWeight:900,textTransform:'uppercase'}}>🧪 Préparation maison</span>}
              </div>
              <button className="btn btn-sm" style={{background:'#FFEB5A',fontWeight:900}} onClick={function(){startEditMeta(v, parent)}}>✏️ Modifier</button>
              <button className="btn btn-sm" style={{background:'#FFE5E5',color:'#CC0066',fontWeight:900}} onClick={function(){deleteRecipeParent(parent.parent_slug, parent.name)}}>🗑️ Supprimer</button>
            </div>

            {editingMeta && editingMeta.recipe_id === v.id && (
              <div style={{background:'#F8F9FF',borderRadius:12,padding:16,marginBottom:12,border:'2px solid #005FFF'}}>
                <div style={{fontWeight:900,fontSize:13,textTransform:'uppercase',marginBottom:10,color:'#005FFF'}}>✏️ Modifier la recette</div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Nom</div>
                  <input className="inp" value={editingMeta.name} onChange={function(e){setEditingMeta(function(p){return Object.assign({},p,{name:e.target.value})})}} />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                  <div>
                    <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Catégorie</div>
                    <select className="inp" value={editingMeta.categorie} onChange={function(e){setEditingMeta(function(p){return Object.assign({},p,{categorie:e.target.value})})}}>
                      <option value="classique">🥪 Sandwich</option>
                      <option value="salade">🥗 Salade</option>
                      <option value="accompagnement">🍟 Accomp.</option>
                      <option value="boisson">🥤 Boisson</option>
                      <option value="mini">🥨 Mini</option>
                      <option value="sous_recette">🧪 Sous-recette maison</option>
                      <option value="sauce">🧪 Sauce maison</option>
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:10,opacity:.5,marginBottom:3}}>TVA (%)</div>
                    <select className="inp" value={editingMeta.tva} onChange={function(e){setEditingMeta(function(p){return Object.assign({},p,{tva:parseFloat(e.target.value)})})}}>
                      <option value="5.5">5,5% (restauration à emporter)</option>
                      <option value="10">10% (restauration sur place)</option>
                      <option value="20">20% (alcool, boissons)</option>
                    </select>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                  <button className="btn btn-sm" onClick={function(){setEditingMeta(null)}}>Annuler</button>
                  <button className="btn btn-sm btn-y" style={{fontWeight:900}} onClick={saveEditMeta}>💾 Enregistrer</button>
                </div>
              </div>
            )}

            {variantsList.length > 1 && (
              <div style={{display:'flex',gap:0,marginBottom:16,background:'#F5F5F5',borderRadius:10,padding:4}}>
                {variantsList.map(function(vv){
                  var active = vv.variant_key === fcSelectedVariant
                  return (
                    <button key={vv.variant_key} onClick={function(){setFcSelectedVariant(vv.variant_key);setEditingIngId(null);setAddIngOpen(false);setEditingPrixTTC(null);setCreatingProduct(false);setNewProductDraft(null)}} style={{flex:1,padding:'10px 14px',background:active?'#FF82D7':'transparent',color:active?'#fff':'#555',border:'none',borderRadius:8,fontWeight:900,fontSize:13,cursor:'pointer'}}>
                      {vv.variant_label} · {fmt(vv.prix_vente_ttc)}€
                    </button>
                  )
                })}
              </div>
            )}

            {!isPrep && (
              <div style={{background:'#FF82D7',borderRadius:12,padding:16,marginBottom:12,border:'2px solid #fff'}}>
                <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,color:'#191923',marginBottom:8}}>💡 Prix conseillé</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{background:'#FFEB5A',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:10,color:'#191923',fontWeight:900,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>x4 — minimum</div>
                    <div style={{fontSize:22,fontWeight:900,color:'#191923'}}>{fmt(conseilX4TTC)}€ TTC</div>
                  </div>
                  <div style={{background:'#fff',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:10,color:'#CC0066',fontWeight:900,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>x5 — confortable</div>
                    <div style={{fontSize:22,fontWeight:900,color:'#CC0066'}}>{fmt(conseilX5TTC)}€ TTC</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:'#191923',opacity:.6,marginTop:8}}>Food cost actuel : {fmt(v.food_cost_ht)}€ · TVA {(tvaRatio*100).toFixed(1)}%</div>
              </div>
            )}

            {isPrep ? (
              <div style={{background:'#fff',borderRadius:12,padding:16,border:'2px solid #A06CD5',marginBottom:12}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div style={{background:'#F3EBFA',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:10,opacity:.6,textTransform:'uppercase',marginBottom:3,color:'#A06CD5',fontWeight:900}}>Food cost total</div>
                    <div style={{fontWeight:900,fontSize:24,color:'#A06CD5'}}>{fmtPrep(v.food_cost_ht)}€</div>
                    <div style={{fontSize:10,opacity:.6,marginTop:2}}>{v.ingredients.length} ingrédient{v.ingredients.length > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 12px',border:'1.5px solid #DDEEFF'}}>
                    <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginBottom:3}}>Usage</div>
                    <div style={{fontWeight:900,fontSize:14,color:'#191923'}}>Préparation interne</div>
                    <div style={{fontSize:10,opacity:.6,marginTop:2}}>Utilisée dans d&apos;autres recettes</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{background:'#fff',borderRadius:12,padding:16,border:'1.5px solid #EBEBEB',marginBottom:12}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3, 1fr)',gap:8}}>
                  <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 12px',border:'1.5px solid #DDEEFF'}}>
                    <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginBottom:3}}>Prix de vente TTC</div>
                    {editingPrixTTC === null && (
                      <div>
                        <div style={{fontWeight:900,fontSize:18,cursor:'pointer'}} onClick={function(){setEditingPrixTTC(v.prix_vente_ttc)}}>{fmt(v.prix_vente_ttc)}€</div>
                        <div style={{fontSize:10,opacity:.4,marginTop:2}}>HT : {fmt(v.prix_vente_ht)}€</div>
                      </div>
                    )}
                    {editingPrixTTC !== null && (
                      <div style={{display:'flex',gap:4,alignItems:'center',marginTop:3,flexWrap:'wrap'}}>
                        <input type="number" step="0.1" value={editingPrixTTC} onChange={function(e){setEditingPrixTTC(parseFloat(e.target.value)||0)}} style={{width:64,padding:'4px 6px',fontSize:14,fontWeight:900,border:'2px solid #005FFF',borderRadius:4}} autoFocus />
                        <button className="btn btn-sm btn-y" style={{fontSize:10,padding:'4px 6px'}} onClick={function(){saveRecipePriceTTC(v.id, editingPrixTTC)}}>✓</button>
                        <button className="btn btn-sm" style={{fontSize:10,padding:'4px 6px'}} onClick={function(){setEditingPrixTTC(null)}}>✕</button>
                      </div>
                    )}
                  </div>
                  <div style={{background:'#FFF5FB',borderRadius:8,padding:'10px 12px',border:'1.5px solid #FFD3EE'}}>
                    <div style={{fontSize:10,opacity:.6,textTransform:'uppercase',marginBottom:3,color:'#CC0066'}}>Coût HT total</div>
                    <div style={{fontWeight:900,fontSize:18,color:'#CC0066'}}>{fmt(v.food_cost_ht)}€</div>
                    <div style={{fontSize:10,opacity:.6,marginTop:2}}>{v.ingredients.length} ingrédient{v.ingredients.length > 1 ? 's' : ''}</div>
                  </div>
                  <div style={{background:'#FFEB5A',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:10,opacity:.6,textTransform:'uppercase',marginBottom:3}}>Coeff actuel</div>
                    <div style={{fontWeight:900,fontSize:18}}>x{coeffActuel}</div>
                    <div style={{fontSize:10,opacity:.6,marginTop:2}}>{v.food_cost_pct}% · Marge {fmt(v.marge_ht)}€</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:.5,opacity:.5}}>Ingrédients ({v.ingredients.length})</div>
              <button className="btn btn-sm btn-y" style={{fontSize:10,fontWeight:900}} onClick={function(){
                if (addIngOpen) {
                  setAddIngOpen(false)
                  setAddIngSearch('')
                  setCreatingProduct(false)
                  setNewProductDraft(null)
                } else {
                  setAddIngOpen(true)
                  setAddIngSearch('')
                }
              }}>
                {addIngOpen ? '✕ Fermer' : '+ Ajouter'}
              </button>
            </div>

            {addIngOpen && !creatingProduct && (
              <div style={{background:'#fff',borderRadius:10,padding:12,marginBottom:10,border:'2px solid #FFEB5A'}}>
                <input className="inp" placeholder="Chercher un produit (pain, saumon, ketchup...)" value={addIngSearch} onChange={function(e){setAddIngSearch(e.target.value)}} style={{marginBottom:8}} autoFocus />
                {addIngSearch.length >= 2 && (
                  <div style={{maxHeight:220,overflowY:'auto',background:'#FAFAFA',borderRadius:6,border:'1px solid #EEE',marginBottom:8}}>
                    {products.filter(function(p){
                      return (p.name || '').toLowerCase().indexOf(addIngSearch.toLowerCase()) > -1
                    }).slice(0, 10).map(function(p){
                      var sup = ''
                      var si
                      for (si = 0; si < suppliers.length; si++) {
                        if (suppliers[si].id === p.supplier_id) { sup = suppliers[si].name; break }
                      }
                      return (
                        <div key={p.id} onClick={function(){addIngredientFromProduct(p, v.id)}} style={{padding:'8px 10px',borderBottom:'1px solid #F5F5F5',cursor:'pointer',fontSize:12,background:'#fff'}}>
                          <div style={{fontWeight:900}}>{p.name}</div>
                          <div style={{fontSize:10,opacity:.5}}>{sup} · {p.current_price}€/{p.unit}</div>
                        </div>
                      )
                    })}
                    {products.filter(function(p){return (p.name || '').toLowerCase().indexOf(addIngSearch.toLowerCase()) > -1}).length === 0 && (
                      <div style={{padding:12,fontSize:11,opacity:.5,textAlign:'center'}}>Aucun produit trouvé dans la base</div>
                    )}
                  </div>
                )}
                <button className="btn btn-sm" style={{width:'100%',background:'#FF82D7',color:'#fff',fontWeight:900,fontSize:12}} onClick={function(){openCreateProduct(addIngSearch)}}>
                  + Créer un nouveau produit{addIngSearch ? ' « ' + addIngSearch + ' »' : ''}
                </button>
              </div>
            )}

            {addIngOpen && creatingProduct && newProductDraft && (
              <div style={{background:'#fff',borderRadius:10,padding:14,marginBottom:10,border:'2px solid #FF82D7'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{fontWeight:900,fontSize:13,textTransform:'uppercase',color:'#FF82D7'}}>+ Nouveau produit</div>
                  <button style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#888'}} onClick={cancelCreateProduct} disabled={creatingProductSaving}>✕</button>
                </div>

                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Nom du produit *</div>
                  <input className="inp" value={newProductDraft.name} onChange={function(e){
                    var val = e.target.value
                    setNewProductDraft(function(prev){return Object.assign({}, prev, {name: val})})
                  }} placeholder="Ex : Saumon fumé, Pain Rye…" autoFocus />
                </div>

                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Fournisseur *</div>
                  <div style={{display:'flex',gap:4,marginBottom:6}}>
                    <button className="btn btn-sm" style={{flex:1,fontSize:11,background:newProductDraft.supplier_mode==='existing'?'#191923':'#F5F5F5',color:newProductDraft.supplier_mode==='existing'?'#FFEB5A':'#555',fontWeight:900}} onClick={function(){
                      setNewProductDraft(function(prev){return Object.assign({}, prev, {supplier_mode: 'existing'})})
                    }}>Existant</button>
                    <button className="btn btn-sm" style={{flex:1,fontSize:11,background:newProductDraft.supplier_mode==='new'?'#191923':'#F5F5F5',color:newProductDraft.supplier_mode==='new'?'#FFEB5A':'#555',fontWeight:900}} onClick={function(){
                      setNewProductDraft(function(prev){return Object.assign({}, prev, {supplier_mode: 'new'})})
                    }}>+ Nouveau</button>
                  </div>
                  {newProductDraft.supplier_mode === 'existing' && (
                    <select className="inp" value={newProductDraft.supplier_id} onChange={function(e){
                      var val = e.target.value
                      setNewProductDraft(function(prev){return Object.assign({}, prev, {supplier_id: val})})
                    }}>
                      <option value="">— Sélectionner —</option>
                      {suppliers.map(function(s){
                        return <option key={s.id} value={s.id}>{s.name}</option>
                      })}
                    </select>
                  )}
                  {newProductDraft.supplier_mode === 'new' && (
                    <input className="inp" value={newProductDraft.new_supplier_name} onChange={function(e){
                      var val = e.target.value
                      setNewProductDraft(function(prev){return Object.assign({}, prev, {new_supplier_name: val})})
                    }} placeholder="Nom du fournisseur (ex : Norbert, Foodflow…)" />
                  )}
                </div>

                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Prix HT *</div>
                    <input type="number" step="0.01" className="inp" value={newProductDraft.current_price || ''} onChange={function(e){
                      var val = parseFloat(e.target.value) || 0
                      setNewProductDraft(function(prev){return Object.assign({}, prev, {current_price: val})})
                    }} placeholder="0.00" />
                  </div>
                  <div>
                    <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>par</div>
                    <select className="inp" value={newProductDraft.unit} onChange={function(e){
                      var val = e.target.value
                      setNewProductDraft(function(prev){return Object.assign({}, prev, {unit: val})})
                    }}>
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="U">unité</option>
                    </select>
                  </div>
                </div>

                <div style={{marginBottom:12}}>
                  <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Catégorie</div>
                  <select className="inp" value={newProductDraft.category} onChange={function(e){
                    var val = e.target.value
                    setNewProductDraft(function(prev){return Object.assign({}, prev, {category: val})})
                  }}>
                    <option value="ingredient">Ingrédient</option>
                    <option value="packaging">Packaging</option>
                    <option value="consommable">Consommable</option>
                    <option value="boisson">Boisson</option>
                  </select>
                </div>

                <div style={{fontSize:10,opacity:.6,background:'#FAFAFA',padding:8,borderRadius:6,marginBottom:10}}>
                  💡 Le produit sera ajouté à la base puis directement à cette recette. La quantité utilisée se renseigne ensuite (clic sur l&apos;ingrédient).
                </div>

                <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                  <button className="btn btn-sm" onClick={cancelCreateProduct} disabled={creatingProductSaving}>Annuler</button>
                  <button className="btn btn-sm" style={{background:'#FF82D7',color:'#fff',fontWeight:900}} onClick={function(){createProductAndAddToRecipe(v.id)}} disabled={creatingProductSaving}>
                    {creatingProductSaving ? '…' : '✅ Créer + ajouter'}
                  </button>
                </div>
              </div>
            )}

            {v.ingredients.map(function(ing){
              var isEdit = editingIngId === ing.id
              var realCost = Number(ing.prix_achat || 0) * Number(ing.qte || 0)
              var isKg = ing.unite === 'kg' || ing.unite === 'l' || ing.unite === 'L'
              var displayQte, displayUnit
              if (isEdit && editingIngDraft) {
                displayQte = isKg ? Math.round(editingIngDraft.qte * 1000) : editingIngDraft.qte
                displayUnit = isKg ? (ing.unite === 'kg' ? 'g' : 'ml') : (ing.unite || 'U')
              } else {
                displayQte = isKg ? Math.round(Number(ing.qte || 0) * 1000) : Number(ing.qte || 0)
                displayUnit = isKg ? (ing.unite === 'kg' ? 'g' : 'ml') : (ing.unite || 'U')
              }

              return (
                <div key={ing.id} style={{background:'#fff',border:'1.5px solid '+(isEdit?'#005FFF':'#EBEBEB'),borderRadius:8,padding:'10px 12px',marginBottom:6}}>
                  {!isEdit && (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',cursor:'pointer'}} onClick={function(){startEditIng(ing)}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:900}}>{ing.article}</div>
                        <div style={{fontSize:10,opacity:.5}}>{ing.fournisseur} · {displayQte} {displayUnit} × {fmt(ing.prix_achat)}€/{ing.unite}</div>
                      </div>
                      <div style={{textAlign:'right',marginLeft:8}}>
                        <div style={{fontSize:14,fontWeight:900,color:'#005FFF'}}>{fmt(realCost)}€</div>
                        <div style={{fontSize:9,opacity:.5}}>clic pour modifier</div>
                      </div>
                    </div>
                  )}
                  {isEdit && editingIngDraft && (
                    <div>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <div style={{fontSize:13,fontWeight:900}}>{ing.article}</div>
                        <button style={{background:'#FFE5E5',border:'none',color:'#CC0066',fontSize:14,cursor:'pointer',borderRadius:6,padding:'4px 8px'}} onClick={function(){if(confirm('Retirer cet ingrédient de la recette ?')) removeIngredient(ing)}}>🗑️</button>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                        <div>
                          <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Prix (€/{ing.unite})</div>
                          <input type="number" step="0.01" className="inp" style={{padding:'6px 8px',fontSize:14,fontWeight:700}} value={editingIngDraft.prix_achat} onChange={function(e){
                            var val = parseFloat(e.target.value)||0
                            setEditingIngDraft(function(prev){return Object.assign({},prev,{prix_achat:val})})
                          }} />
                        </div>
                        <div>
                          <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Quantité ({displayUnit})</div>
                          <input type="number" step={isKg?'1':'0.01'} className="inp" style={{padding:'6px 8px',fontSize:14,fontWeight:700}} value={displayQte} onChange={function(e){
                            var raw = parseFloat(e.target.value)||0
                            var val = isKg ? raw/1000 : raw
                            setEditingIngDraft(function(prev){return Object.assign({},prev,{qte:val})})
                          }} />
                        </div>
                      </div>
                      <div style={{display:'flex',gap:6,justifyContent:'space-between',alignItems:'center'}}>
                        <div style={{fontSize:12,opacity:.6}}>
                          Coût : <strong>{fmt(editingIngDraft.prix_achat * editingIngDraft.qte)}€</strong>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button className="btn btn-sm" style={{fontSize:11}} onClick={cancelEditIng} disabled={savingIng}>Annuler</button>
                          <button className="btn btn-sm btn-y" style={{fontSize:11,fontWeight:900}} onClick={saveEditIng} disabled={savingIng}>{savingIng ? '…' : '💾 Enregistrer'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {v.ingredients.length === 0 && (
              <div style={{padding:20,textAlign:'center',opacity:.5,fontSize:12,background:'#fff',borderRadius:8,border:'1px dashed #DDD'}}>Aucun ingrédient. Clique sur &quot;+ Ajouter&quot; pour commencer.</div>
            )}
          </div>
        )
      })()}

      {/* ========== MODAL NOUVELLE RECETTE ========== */}
      {newRecipeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={function(){setNewRecipeModal(null)}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923'}}>+ Nouvelle recette</div>
              <button style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}} onClick={function(){setNewRecipeModal(null)}}>✕</button>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Nom *</div>
              <input className="inp" value={newRecipeModal.name} onChange={function(e){setNewRecipeModal(function(p){return Object.assign({},p,{name:e.target.value})})}} placeholder="Ex : Reuben sandwich" autoFocus />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <div>
                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Catégorie</div>
                <select className="inp" value={newRecipeModal.categorie} onChange={function(e){setNewRecipeModal(function(p){return Object.assign({},p,{categorie:e.target.value})})}}>
                  <option value="classique">🥪 Sandwich</option>
                  <option value="salade">🥗 Salade</option>
                  <option value="accompagnement">🍟 Accomp.</option>
                  <option value="boisson">🥤 Boisson</option>
                  <option value="mini">🥨 Mini</option>
                  <option value="sous_recette">🧪 Sous-recette maison</option>
                  <option value="sauce">🧪 Sauce maison</option>
                </select>
              </div>
              <div>
                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>TVA (%)</div>
                <select className="inp" value={newRecipeModal.tva} onChange={function(e){setNewRecipeModal(function(p){return Object.assign({},p,{tva:parseFloat(e.target.value)})})}}>
                  <option value="5.5">5,5% (à emporter)</option>
                  <option value="10">10% (sur place)</option>
                  <option value="20">20% (alcool, boissons)</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Prix de vente TTC (€)</div>
              <input type="number" step="0.1" className="inp" style={{fontSize:18,fontWeight:900}} value={newRecipeModal.prix_vente_ttc||''} onChange={function(e){setNewRecipeModal(function(p){return Object.assign({},p,{prix_vente_ttc:parseFloat(e.target.value)||0})})}} placeholder="0.00" />
            </div>
            <div style={{fontSize:11,opacity:.5,marginBottom:12,background:'#F8F9FF',padding:10,borderRadius:6,border:'1px solid #DDEEFF'}}>💡 Tu pourras ajouter les ingrédients juste après la création, sur la fiche de la recette.</div>
            <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
              <button className="btn btn-sm" onClick={function(){setNewRecipeModal(null)}}>Annuler</button>
              <button className="btn btn-y" style={{fontWeight:900}} onClick={createRecipe}>✅ Créer la recette</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL NOUVELLE BOISSON REVENTE ========== */}
      {newDrinkModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={function(){setNewDrinkModal(null)}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923'}}>+ Nouvelle boisson (revente)</div>
              <button style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}} onClick={function(){setNewDrinkModal(null)}}>✕</button>
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Nom *</div>
              <input className="inp" value={newDrinkModal.name} onChange={function(e){setNewDrinkModal(function(p){return Object.assign({},p,{name:e.target.value})})}} placeholder="Ex : San Pellegrino" autoFocus />
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Fournisseur</div>
              <input className="inp" value={newDrinkModal.supplier_name} onChange={function(e){setNewDrinkModal(function(p){return Object.assign({},p,{supplier_name:e.target.value})})}} placeholder="Ex : Rouquette, Episaveurs…" />
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
              <div>
                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Prix achat HT (€)</div>
                <input type="number" step="0.01" className="inp" value={newDrinkModal.purchase_price_ht||''} onChange={function(e){setNewDrinkModal(function(p){return Object.assign({},p,{purchase_price_ht:parseFloat(e.target.value)||0})})}} placeholder="0.00" />
              </div>
              <div>
                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Prix vente TTC (€)</div>
                <input type="number" step="0.1" className="inp" value={newDrinkModal.selling_price_ttc||''} onChange={function(e){setNewDrinkModal(function(p){return Object.assign({},p,{selling_price_ttc:parseFloat(e.target.value)||0})})}} placeholder="0.00" />
              </div>
            </div>
            <div style={{fontSize:11,opacity:.5,marginBottom:12,background:'#F8F9FF',padding:10,borderRadius:6,border:'1px solid #DDEEFF'}}>💡 TVA de 20% appliquée automatiquement (boissons revente).</div>
            <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
              <button className="btn btn-sm" onClick={function(){setNewDrinkModal(null)}}>Annuler</button>
              <button className="btn btn-y" style={{fontWeight:900}} onClick={createDrink}>✅ Créer la boisson</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== WIZARD FACTURE ========== */}
      <FoodCostInvoiceWizard
        isOpen={fcInvoiceModal}
        onClose={function(){ setFcInvoiceModal(false) }}
        onSuccess={loadData}
        toast={toast}
      />

      {/* ========== 2e ÉTAPE APRÈS CRÉATION PRODUIT ========== */}
      {pendingAssignment && pendingAssignment.product && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:12}} onClick={function(){
          setPendingAssignment(null)
        }}>
          <div style={{width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
            <ProductRecipeAssignment
              product={pendingAssignment.product}
              preselectedRecipeIds={pendingAssignment.current_recipe_id ? [pendingAssignment.current_recipe_id] : []}
              preselectedQuantities={{}}
              onSaved={function(){
                setPendingAssignment(null)
                loadData()
              }}
              onCancel={function(){
                setPendingAssignment(null)
              }}
              toast={toast}
            />
          </div>
        </div>
      )}

      {ingPopup && <IngredientPopup ing={ingPopup} onClose={function(){setIngPopup(null)}} />}

    </div>
  )
}
