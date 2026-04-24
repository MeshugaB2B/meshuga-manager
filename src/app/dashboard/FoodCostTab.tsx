'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import IngredientPopup from './IngredientPopup'

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

  var [editingPrixTTC, setEditingPrixTTC] = useState(null)

  var [fcInvoiceModal, setFcInvoiceModal] = useState(false)
  var [fcInvoiceLoading, setFcInvoiceLoading] = useState(false)
  var [fcInvoiceResult, setFcInvoiceResult] = useState(null)
  var [fcInvoiceMatches, setFcInvoiceMatches] = useState([])

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

  function computeKPIs() {
    var allVariants = []
    var gi
    for (gi = 0; gi < groupedList.length; gi++) {
      var vs = Object.values(groupedList[gi].variants)
      var vi
      for (vi = 0; vi < vs.length; vi++) allVariants.push(vs[vi])
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
      {/* HEADER */}
      <div className="ph">
        <div>
          <div className="pt">Food Cost 🥩</div>
          <div className="ps">{groupedList.length} recettes · {drinks.length} boissons · Seuil alerte : {fcSeuil}%</div>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button className="btn btn-y btn-sm" style={{background:fcView==='recettes'?'#191923':'transparent',color:fcView==='recettes'?'#FFEB5A':'#191923'}} onClick={function(){setFcView('recettes');setFcSelectedParent(null)}}>Recettes</button>
          <button className="btn btn-y btn-sm" style={{background:fcView==='boissons'?'#191923':'transparent',color:fcView==='boissons'?'#FFEB5A':'#191923'}} onClick={function(){setFcView('boissons');setFcSelectedParent(null)}}>Boissons</button>
          <button className="btn btn-y btn-sm" style={{background:fcView==='fournisseurs'?'#191923':'transparent',color:fcView==='fournisseurs'?'#FFEB5A':'#191923'}} onClick={function(){setFcView('fournisseurs');setFcSelectedParent(null)}}>Fournisseurs</button>
          <button className="btn btn-sm" style={{background:'#009D3A',color:'#fff'}} onClick={function(){setFcInvoiceModal(true)}}>📄 Facture</button>
        </div>
      </div>

      {/* SEUIL CONFIG */}
      {fcView === 'recettes' && !fcSelectedParent && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 0 12px',flexWrap:'wrap'}}>
          <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,opacity:.5}}>Seuil alerte food cost :</span>
          {[20,25,30,35].map(function(s){return(
            <button key={s} className="btn btn-sm" style={{fontSize:10,background:fcSeuil===s?'#CC0066':'#F5F5F5',color:fcSeuil===s?'#fff':'#555',border:'1.5px solid '+(fcSeuil===s?'#CC0066':'#DDD')}} onClick={function(){if(setFcSeuil)setFcSeuil(s)}}>{s}%</button>
          )})}
        </div>
      )}

      {/* CATEGORY FILTER - utilise les vraies catégories DB */}
      {fcView === 'recettes' && !fcSelectedParent && (
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {[
            {id:'tous',label:'Tous'},
            {id:'classique',label:'🥪 Sandwichs'},
            {id:'salade',label:'🥗 Salades'},
            {id:'accompagnement',label:'🍟 Accomp.'},
            {id:'boisson',label:'🥤 Boissons'}
          ].map(function(cat){
            var count = cat.id === 'tous' ? groupedList.length : groupedList.filter(function(p){return (p.category || '') === cat.id}).length
            return (
              <button key={cat.id} className="btn btn-sm" style={{fontSize:10,background:fcCatFilter===cat.id?'#191923':'#F5F5F5',color:fcCatFilter===cat.id?'#FFEB5A':'#555',border:'1.5px solid '+(fcCatFilter===cat.id?'#191923':'#DDD')}} onClick={function(){setFcCatFilter(cat.id)}}>
                {cat.label} <span style={{opacity:.5}}>({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ========== VUE RECETTES (liste) ========== */}
      {fcView === 'recettes' && !fcSelectedParent && (
        <div>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:12}}>
            <div style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1.5px solid #EBEBEB'}}>
              <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:4}}>Food cost moyen</div>
              <div style={{fontSize:24,fontWeight:900,color:kpis.avg>fcSeuil?'#CC0066':'#009D3A'}}>{kpis.avg.toFixed(1)}%</div>
            </div>
            <div style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1.5px solid '+(kpis.alerts.length>0?'#CC0066':'#EBEBEB')}}>
              <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:4}}>⚠️ Au-dessus du seuil</div>
              <div style={{fontSize:24,fontWeight:900,color:kpis.alerts.length>0?'#CC0066':'#009D3A'}}>{kpis.alerts.length}</div>
              <div style={{fontSize:10,opacity:.5}}>{kpis.alerts.length>0?kpis.alerts.slice(0,3).map(function(v){return v.name}).join(', '):'Tout est OK ✅'}</div>
            </div>
            {kpis.best && (
              <div style={{background:'#FFEB5A',borderRadius:10,padding:'12px 14px',border:'1.5px solid rgba(0,0,0,.1)'}}>
                <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.7,marginBottom:4}}>🏆 Meilleure marge</div>
                <div style={{fontSize:14,fontWeight:900}}>{kpis.best.name}</div>
                <div style={{fontSize:12,opacity:.7}}>{kpis.best.food_cost_pct}% food cost</div>
              </div>
            )}
            {kpis.worst && (
              <div style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1.5px solid #EBEBEB'}}>
                <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:4}}>📊 Plus chargé</div>
                <div style={{fontSize:14,fontWeight:900}}>{kpis.worst.name}</div>
                <div style={{fontSize:12,color:kpis.worst.food_cost_pct>fcSeuil?'#CC0066':'#555'}}>{kpis.worst.food_cost_pct}% food cost</div>
              </div>
            )}
          </div>

          {/* LISTE RECETTES groupées */}
          {groupedList.filter(function(p){
            return fcCatFilter === 'tous' || (p.category || '') === fcCatFilter
          }).sort(function(a, b){
            var va = pickVariant(a, 'standard') || pickVariant(a, 'mini')
            var vb = pickVariant(b, 'standard') || pickVariant(b, 'mini')
            return (vb ? vb.food_cost_pct : 0) - (va ? va.food_cost_pct : 0)
          }).map(function(parent){
            var v = pickVariant(parent, 'standard') || pickVariant(parent, 'mini')
            if (!v) return null
            var alert = v.food_cost_pct > fcSeuil
            var barColor = alert ? '#CC0066' : '#009D3A'
            var hasVariants = Object.keys(parent.variants).length > 1
            return (
              <div key={parent.parent_slug} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(alert?'#CC0066':'#009D3A'),cursor:'pointer'}} onClick={function(){setFcSelectedParent(parent.parent_slug);setFcSelectedVariant(v.variant_key)}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{flex:1,minHeight:44,display:'flex',flexDirection:'column',justifyContent:'center'}}>
                    <div style={{fontWeight:900,fontSize:14,display:'flex',alignItems:'center',gap:6}}>
                      {parent.name}
                      {hasVariants && <span style={{fontSize:9,background:'#FF82D7',color:'#fff',padding:'2px 6px',borderRadius:4,fontWeight:900}}>STD + MINI</span>}
                    </div>
                    <div style={{fontSize:11,opacity:.6}}>
                      {v.ingredients.reduce(function(acc, i){
                        return acc.indexOf(i.fournisseur) > -1 ? acc : acc.concat([i.fournisseur])
                      }, []).slice(0, 2).join(', ')}
                      {' · '}PV {fmt(v.prix_vente_ttc)}€ TTC · Marge HT {fmt(v.marge_ht)}€
                    </div>
                  </div>
                  <div style={{textAlign:'right',padding:'4px 8px'}}>
                    <div style={{fontSize:20,fontWeight:900,color:barColor}}>{v.food_cost_pct}%</div>
                    <div style={{fontSize:10,opacity:.5}}>food cost</div>
                  </div>
                </div>
                <div style={{background:'#F0F0F0',borderRadius:20,height:6,overflow:'hidden'}}>
                  <div style={{width:Math.min(v.food_cost_pct,60)/60*100+'%',background:barColor,height:'100%',borderRadius:20}} />
                </div>
                {alert && <div style={{fontSize:10,color:'#CC0066',fontWeight:900,marginTop:4}}>⚠️ Au-dessus du seuil de {fcSeuil}%</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* ========== DETAIL RECETTE ========== */}
      {fcView === 'recettes' && selectedParent && (function(){
        var parent = selectedParent
        var v = pickVariant(parent, fcSelectedVariant)
        if (!v) return <div>Erreur variant</div>
        var tvaRatio = v.tva_ratio
        var conseilX4TTC = Math.round(v.food_cost_ht * 4 * (1 + tvaRatio) * 100) / 100
        var conseilX5TTC = Math.round(v.food_cost_ht * 5 * (1 + tvaRatio) * 100) / 100
        var variantsList = Object.values(parent.variants)
        var coeffActuel = v.food_cost_ht > 0 ? Math.round(v.prix_vente_ht / v.food_cost_ht * 100) / 100 : 0

        return (
          <div>
            <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn btn-sm" onClick={function(){setFcSelectedParent(null);setAddIngOpen(false);setEditingIngId(null);setEditingPrixTTC(null)}}>← Retour</button>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923',flex:1}}>{parent.name}</div>
            </div>

            {/* Toggle variantes : ROSE quand actif */}
            {variantsList.length > 1 && (
              <div style={{display:'flex',gap:0,marginBottom:16,background:'#F5F5F5',borderRadius:10,padding:4}}>
                {variantsList.map(function(vv){
                  var active = vv.variant_key === fcSelectedVariant
                  return (
                    <button key={vv.variant_key} onClick={function(){setFcSelectedVariant(vv.variant_key);setEditingIngId(null);setAddIngOpen(false);setEditingPrixTTC(null)}} style={{flex:1,padding:'10px 14px',background:active?'#FF82D7':'transparent',color:active?'#fff':'#555',border:'none',borderRadius:8,fontWeight:900,fontSize:13,cursor:'pointer'}}>
                      {vv.variant_label} · {fmt(vv.prix_vente_ttc)}€
                    </button>
                  )
                })}
              </div>
            )}

            {/* PRIX CONSEILLE */}
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

            {/* RECAP prix actuel + édition prix TTC inline */}
            <div style={{background:'#fff',borderRadius:12,padding:16,border:'1.5px solid #EBEBEB',marginBottom:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 12px',border:'1.5px solid #DDEEFF'}}>
                  <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginBottom:3}}>Prix de vente TTC actuel</div>
                  {editingPrixTTC === null && (
                    <div>
                      <div style={{fontWeight:900,fontSize:20,cursor:'pointer'}} onClick={function(){setEditingPrixTTC(v.prix_vente_ttc)}}>{fmt(v.prix_vente_ttc)}€</div>
                      <div style={{fontSize:10,opacity:.4,marginTop:2}}>HT : {fmt(v.prix_vente_ht)}€ · clic pour modifier</div>
                    </div>
                  )}
                  {editingPrixTTC !== null && (
                    <div style={{display:'flex',gap:4,alignItems:'center',marginTop:3}}>
                      <input type="number" step="0.1" value={editingPrixTTC} onChange={function(e){setEditingPrixTTC(parseFloat(e.target.value)||0)}} style={{width:80,padding:'4px 6px',fontSize:16,fontWeight:900,border:'2px solid #005FFF',borderRadius:4}} autoFocus />
                      <button className="btn btn-sm btn-y" style={{fontSize:10,padding:'4px 8px'}} onClick={function(){saveRecipePriceTTC(v.id, editingPrixTTC)}}>✓</button>
                      <button className="btn btn-sm" style={{fontSize:10,padding:'4px 8px'}} onClick={function(){setEditingPrixTTC(null)}}>✕</button>
                    </div>
                  )}
                </div>
                <div style={{background:'#FFEB5A',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:10,opacity:.6,textTransform:'uppercase',marginBottom:3}}>Coeff actuel</div>
                  <div style={{fontWeight:900,fontSize:20}}>x{coeffActuel} <span style={{fontSize:13,opacity:.7}}>({v.food_cost_pct}%)</span></div>
                  <div style={{fontSize:10,opacity:.6,marginTop:2}}>Marge HT {fmt(v.marge_ht)}€</div>
                </div>
              </div>
            </div>

            {/* INGREDIENTS - bulles BLANCHES + édition inline au clic + ajout/suppr direct */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:.5,opacity:.5}}>Ingrédients ({v.ingredients.length})</div>
              <button className="btn btn-sm btn-y" style={{fontSize:10,fontWeight:900}} onClick={function(){setAddIngOpen(!addIngOpen);setAddIngSearch('')}}>
                {addIngOpen ? '✕ Fermer' : '+ Ajouter'}
              </button>
            </div>

            {addIngOpen && (
              <div style={{background:'#fff',borderRadius:10,padding:12,marginBottom:10,border:'2px solid #FFEB5A'}}>
                <input className="inp" placeholder="Chercher un produit (pain, saumon, ketchup...)" value={addIngSearch} onChange={function(e){setAddIngSearch(e.target.value)}} style={{marginBottom:8}} autoFocus />
                {addIngSearch.length >= 2 && (
                  <div style={{maxHeight:220,overflowY:'auto',background:'#FAFAFA',borderRadius:6,border:'1px solid #EEE'}}>
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
                      <div style={{padding:12,fontSize:11,opacity:.5,textAlign:'center'}}>Aucun produit trouvé</div>
                    )}
                  </div>
                )}
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
              <div style={{padding:20,textAlign:'center',opacity:.5,fontSize:12,background:'#fff',borderRadius:8,border:'1px dashed #DDD'}}>Aucun ingrédient. Clique sur "+ Ajouter" pour commencer.</div>
            )}
          </div>
        )
      })()}

      {/* ========== VUE BOISSONS REVENTE ========== */}
      {fcView === 'boissons' && (
        <div>
          <div style={{background:'#fff',borderRadius:12,padding:16,border:'1.5px solid #EBEBEB',marginBottom:12}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923',marginBottom:4}}>Boissons revente</div>
            <div style={{fontSize:12,opacity:.6}}>Achat HT, prix de vente TTC et marge par bouteille — TVA 20%.</div>
          </div>
          {drinks.map(function(d){
            var tvaR = tvaToRatio(d.tva_rate)
            if (tvaR === 0) tvaR = 0.20
            var prixHT = Number(d.selling_price_ttc) / (1 + tvaR)
            var marge = Math.round((prixHT - Number(d.purchase_price_ht)) * 100) / 100
            var pct = prixHT > 0 ? Math.round(Number(d.purchase_price_ht) / prixHT * 1000) / 10 : 0
            var isEdit = drinkEdit && drinkEdit.id === d.id
            return (
              <div key={d.id} className="card" style={{marginBottom:8,borderLeft:'4px solid #FF82D7'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{fontWeight:900,fontSize:14}}>{d.name}</div>
                    <div style={{fontSize:10,opacity:.5}}>{d.supplier_name} · TVA {(tvaR * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{display:'flex',gap:14,alignItems:'center'}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,opacity:.5,textTransform:'uppercase'}}>Achat HT</div>
                      {!isEdit && (
                        <div style={{fontWeight:900,fontSize:14,cursor:'pointer'}} onClick={function(){setDrinkEdit({id:d.id, price: Number(d.purchase_price_ht)})}}>{fmt(d.purchase_price_ht)}€</div>
                      )}
                      {isEdit && (
                        <div style={{display:'flex',gap:4,alignItems:'center'}}>
                          <input type="number" step="0.01" value={drinkEdit.price} onChange={function(e){setDrinkEdit({id:d.id,price:parseFloat(e.target.value)||0})}} style={{width:65,padding:'4px 6px',fontSize:13,fontWeight:700,border:'2px solid #005FFF',borderRadius:4,textAlign:'right'}} />
                          <button className="btn btn-sm btn-y" style={{fontSize:10,padding:'4px 8px'}} onClick={function(){saveDrinkPrice(d, drinkEdit.price)}}>✓</button>
                          <button className="btn btn-sm" style={{fontSize:10,padding:'4px 8px'}} onClick={function(){setDrinkEdit(null)}}>✕</button>
                        </div>
                      )}
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,opacity:.5,textTransform:'uppercase'}}>Vente TTC</div>
                      <div style={{fontWeight:900,fontSize:14}}>{fmt(d.selling_price_ttc)}€</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,opacity:.5,textTransform:'uppercase'}}>Marge HT</div>
                      <div style={{fontWeight:900,fontSize:14,color:'#009D3A'}}>{marge.toFixed(2)}€</div>
                      <div style={{fontSize:9,opacity:.5}}>({pct}% FC)</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ========== VUE FOURNISSEURS ========== */}
      {fcView === 'fournisseurs' && (function(){
        var fourn = {}
        var gi
        for (gi = 0; gi < groupedList.length; gi++) {
          var variants = Object.values(groupedList[gi].variants)
          var vi
          for (vi = 0; vi < variants.length; vi++) {
            var vv = variants[vi]
            var ingi
            for (ingi = 0; ingi < vv.ingredients.length; ingi++) {
              var ing = vv.ingredients[ingi]
              var f = ing.fournisseur || '—'
              if (!fourn[f]) fourn[f] = { name: f, articles: [], totalCout: 0, recettes: [] }
              if (!fourn[f].articles.find(function(a){return a.article === ing.article})) {
                fourn[f].articles.push({ article: ing.article, prix: ing.prix_achat, unite: ing.unite })
              }
              fourn[f].totalCout += Number(ing.prix_achat || 0) * Number(ing.qte || 0)
              if (fourn[f].recettes.indexOf(groupedList[gi].name) === -1) fourn[f].recettes.push(groupedList[gi].name)
            }
          }
        }
        var fournList = Object.values(fourn).sort(function(a, b){return b.totalCout - a.totalCout})
        return (
          <div>
            {fournList.map(function(f){
              return (
                <div key={f.name} className="card" style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:15}}>{f.name}</div>
                      <div style={{fontSize:11,opacity:.5}}>{f.articles.length} articles · {f.recettes.length} recettes</div>
                    </div>
                    <div style={{fontWeight:900,fontSize:16,color:'#005FFF'}}>{fmt(f.totalCout)}€</div>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {f.articles.map(function(a, idx){return(
                      <span key={idx} style={{fontSize:10,background:'#F5F5F5',border:'1px solid #EEE',borderRadius:4,padding:'2px 6px'}}>{a.article} · {a.prix}€/{a.unite}</span>
                    )})}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ========== MODAL FACTURE ========== */}
      {fcInvoiceModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={function(){if(!fcInvoiceLoading){setFcInvoiceModal(false);setFcInvoiceResult(null);setFcInvoiceMatches([])}}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923'}}>📄 Importer une facture</div>
              {!fcInvoiceLoading && <button style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}} onClick={function(){setFcInvoiceModal(false);setFcInvoiceResult(null);setFcInvoiceMatches([])}}>✕</button>}
            </div>

            {!fcInvoiceResult && !fcInvoiceLoading && (
              <div>
                <div style={{fontSize:13,color:'#555',marginBottom:16}}>Upload un PDF ou une photo de ta facture fournisseur.</div>
                <label style={{display:'block',background:'#F8F9FF',border:'2px dashed #DDEEFF',borderRadius:10,padding:'30px 20px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:32,marginBottom:8}}>📂</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#005FFF'}}>Choisir un PDF ou une photo</div>
                  <input type="file" accept=".pdf,image/*" style={{display:'none'}} onChange={function(e){
                    var file = e.target && e.target.files && e.target.files[0]
                    if (!file) return
                    setFcInvoiceLoading(true)
                    var reader = new FileReader()
                    reader.onload = function(ev){
                      var base64 = ev.target ? String(ev.target.result).split(',')[1] : ''
                      fetch('/api/import-invoice', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({pdfBase64: base64, fileName: file.name, mediaType: file.type})
                      }).then(function(r){return r.json()}).then(function(data){
                        if (data.error) { toast('Erreur: ' + data.error); setFcInvoiceLoading(false); return }
                        var allIngs = []
                        var gi
                        for (gi = 0; gi < groupedList.length; gi++) {
                          var vs = Object.values(groupedList[gi].variants)
                          var vi
                          for (vi = 0; vi < vs.length; vi++) {
                            var ii
                            for (ii = 0; ii < vs[vi].ingredients.length; ii++) {
                              var ing = vs[vi].ingredients[ii]
                              if (!allIngs.find(function(x){return x.article.toLowerCase() === (ing.article || '').toLowerCase()})) {
                                allIngs.push({ article: ing.article, prix_actuel: ing.prix_achat, unite: ing.unite })
                              }
                            }
                          }
                        }
                        var matches = (data.lignes || []).map(function(ligne){
                          var articleLow = (ligne.article || '').toLowerCase()
                          var matched = allIngs.find(function(x){
                            var xLow = x.article.toLowerCase()
                            return xLow.indexOf(articleLow) > -1 || articleLow.indexOf(xLow) > -1
                          })
                          return { ligne: ligne, matched: matched || null, selected: matched ? true : false }
                        })
                        setFcInvoiceResult(data)
                        setFcInvoiceMatches(matches)
                        setFcInvoiceLoading(false)
                      }).catch(function(err){ toast('Erreur: ' + err.message); setFcInvoiceLoading(false) })
                    }
                    reader.readAsDataURL(file)
                  }} />
                </label>
              </div>
            )}

            {fcInvoiceLoading && (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:40,marginBottom:12}}>🧠</div>
                <div style={{fontWeight:900,fontSize:15}}>Claude lit la facture...</div>
              </div>
            )}

            {fcInvoiceResult && !fcInvoiceLoading && (
              <div>
                <div style={{background:'#F0FFF4',borderRadius:8,padding:'10px 14px',marginBottom:14,border:'1.5px solid #009D3A'}}>
                  <div style={{fontWeight:900,fontSize:13,color:'#009D3A'}}>{fcInvoiceResult.fournisseur} · {fcInvoiceResult.date}</div>
                  <div style={{fontSize:11,color:'#555',marginTop:2}}>{(fcInvoiceResult.lignes || []).length} articles · Total HT : {fcInvoiceResult.total_ht}€</div>
                </div>
                {fcInvoiceMatches.map(function(m, idx){
                  var prixActuel = m.matched ? m.matched.prix_actuel : null
                  var diff = prixActuel ? Math.round((m.ligne.prix_unitaire_ht - prixActuel) * 100) / 100 : null
                  var hausse = diff !== null && diff > 0
                  return (
                    <div key={idx} style={{background:m.selected?'#F0FFF4':'#FAFAFA',borderRadius:8,padding:'10px 12px',marginBottom:6,border:'1.5px solid '+(m.selected?'#009D3A':'#EEE')}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <input type="checkbox" checked={m.selected} onChange={function(){
                          setFcInvoiceMatches(function(prev){ return prev.map(function(x, i){return i === idx ? Object.assign({}, x, {selected: !x.selected}) : x}) })
                        }} style={{width:16,height:16}} />
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700}}>{m.ligne.article_original || m.ligne.article}</div>
                          <div style={{fontSize:10,color:'#888'}}>
                            {m.ligne.prix_unitaire_ht}€/{m.ligne.unite}
                            {m.matched && <span style={{marginLeft:8,color:'#005FFF'}}>→ {m.matched.article}</span>}
                            {!m.matched && <span style={{marginLeft:8,color:'#CC0066'}}>⚠️ Sans correspondance</span>}
                          </div>
                        </div>
                        {diff !== null && (
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:12,fontWeight:900,color:hausse?'#CC0066':'#009D3A'}}>{hausse?'+':''}{diff}€</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div style={{display:'flex',gap:8,marginTop:16}}>
                  <button className="btn" onClick={function(){setFcInvoiceResult(null);setFcInvoiceMatches([])}}>← Retour</button>
                  <button className="btn btn-y" style={{flex:1,fontWeight:900}} onClick={function(){
                    var promises = []
                    var mi
                    for (mi = 0; mi < fcInvoiceMatches.length; mi++) {
                      var m = fcInvoiceMatches[mi]
                      if (!m.selected || !m.matched) continue
                      promises.push(
                        sb().from('recipe_ingredients')
                          .update({ prix_achat: m.ligne.prix_unitaire_ht })
                          .eq('article', m.matched.article)
                      )
                    }
                    Promise.all(promises).then(function(){
                      toast('✅ ' + promises.length + ' prix mis à jour')
                      setFcInvoiceModal(false)
                      setFcInvoiceResult(null)
                      setFcInvoiceMatches([])
                      loadData()
                    }).catch(function(e){ toast('Erreur: ' + e.message) })
                  }}>✅ Mettre à jour {fcInvoiceMatches.filter(function(m){return m.selected && m.matched}).length} prix</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {ingPopup && <IngredientPopup ing={ingPopup} onClose={function(){setIngPopup(null)}} />}
    </div>
  )
}
