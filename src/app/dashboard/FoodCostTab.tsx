'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import IngredientPopup from './IngredientPopup'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
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

  var [fcEditForm, setFcEditForm] = useState(null)
  var [saving, setSaving] = useState(false)
  var [addIngSearch, setAddIngSearch] = useState('')

  var [fcInvoiceModal, setFcInvoiceModal] = useState(false)
  var [fcInvoiceLoading, setFcInvoiceLoading] = useState(false)
  var [fcInvoiceResult, setFcInvoiceResult] = useState(null)
  var [fcInvoiceMatches, setFcInvoiceMatches] = useState([])

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
  // Construit { parent_slug: { name, category, variants: { standard: {...recipe, ingredients, foodCost, fcPct, marge}, mini: {...} } } }
  function buildGrouped() {
    var grouped = {}
    var i
    for (i = 0; i < recipes.length; i++) {
      var r = recipes[i]
      if (!r.parent_slug) continue
      if (!grouped[r.parent_slug]) {
        grouped[r.parent_slug] = {
          parent_slug: r.parent_slug,
          name: (r.variant_key === 'standard') ? r.name : (r.name || '').replace(/\s+Mini$/,''),
          category: r.categorie,
          variants: {}
        }
      }
      // compute ingredients + food cost
      var rIngs = ingredients.filter(function(x){ return x.recipe_id === r.id })
      var totalCost = 0
      var k
      for (k = 0; k < rIngs.length; k++) {
        totalCost += (rIngs[k].prix_achat || 0) * (rIngs[k].qte || 0)
      }
      var prixHT = (r.prix_vente_ttc || 0) / 1.055
      var fcPct = prixHT > 0 ? Math.round(totalCost / prixHT * 1000) / 10 : 0
      var marge = Math.round((prixHT - totalCost) * 100) / 100

      grouped[r.parent_slug].variants[r.variant_key || 'standard'] = {
        id: r.id,
        name: r.name,
        variant_key: r.variant_key || 'standard',
        variant_label: r.variant_label || 'Standard',
        prix_vente_ttc: Number(r.prix_vente_ttc || 0),
        prix_vente_ht: prixHT,
        tva: Number(r.tva || 0.055),
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

  // ============= HELPERS =============
  function pickVariant(parent, preferVariant) {
    if (!parent) return null
    if (parent.variants[preferVariant]) return parent.variants[preferVariant]
    if (parent.variants.standard) return parent.variants.standard
    var keys = Object.keys(parent.variants)
    return keys.length > 0 ? parent.variants[keys[0]] : null
  }

  function categoryLabel(cat) {
    if (cat === 'classique' || cat === 'sandwich') return '🥪 Sandwich'
    if (cat === 'mini') return '🥨 Mini'
    if (cat === 'salade') return '🥗 Salade'
    if (cat === 'accompagnement') return '🍟 Accomp.'
    if (cat === 'boisson' || cat === 'boisson_maison') return '🥤 Boisson'
    return cat || '—'
  }

  // ============= FILTER KPIs =============
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

  // ============= EDIT =============
  function openEdit(parent, variantKey) {
    var v = parent.variants[variantKey]
    if (!v) return
    setFcEditForm({
      recipe_id: v.id,
      parent_slug: parent.parent_slug,
      name: v.name,
      variant_label: v.variant_label,
      prix_vente_ttc: v.prix_vente_ttc,
      tva: v.tva,
      ingredients: v.ingredients.map(function(i){
        return {
          id: i.id,
          article: i.article,
          fournisseur: i.fournisseur,
          unite: i.unite,
          prix_achat: Number(i.prix_achat || 0),
          qte: Number(i.qte || 0),
          product_id: i.product_id,
          _isNew: false,
          _toDelete: false
        }
      })
    })
    setFcView('edit')
    setAddIngSearch('')
  }

  function openEditNew() {
    setFcEditForm({
      recipe_id: null,
      parent_slug: null,
      name: '',
      variant_label: 'Standard',
      prix_vente_ttc: 0,
      tva: 0.055,
      ingredients: []
    })
    setFcView('edit')
    setAddIngSearch('')
  }

  function editFormComputed() {
    if (!fcEditForm) return { totalCost: 0, prixHT: 0, fcPct: 0, marge: 0 }
    var ings = (fcEditForm.ingredients || []).filter(function(i){return !i._toDelete})
    var total = 0
    var k
    for (k = 0; k < ings.length; k++) total += (ings[k].prix_achat || 0) * (ings[k].qte || 0)
    var ht = (fcEditForm.prix_vente_ttc || 0) / (1 + (fcEditForm.tva || 0.055))
    var pct = ht > 0 ? Math.round(total / ht * 1000) / 10 : 0
    var marge = Math.round((ht - total) * 100) / 100
    return { totalCost: Math.round(total * 1000) / 1000, prixHT: Math.round(ht * 100) / 100, fcPct: pct, marge: marge }
  }

  function updateIng(idx, field, value) {
    setFcEditForm(function(prev){
      var newIngs = (prev.ingredients || []).map(function(i, k){
        if (k !== idx) return i
        var n = Object.assign({}, i)
        n[field] = value
        return n
      })
      return Object.assign({}, prev, { ingredients: newIngs })
    })
  }

  function removeIng(idx) {
    setFcEditForm(function(prev){
      var newIngs = (prev.ingredients || []).map(function(i, k){
        if (k !== idx) return i
        // Si c'est un nouvel ing non sauvegardé, on le retire carrément
        if (i._isNew) return null
        // Sinon on le flag pour delete
        return Object.assign({}, i, { _toDelete: true })
      }).filter(function(x){ return x !== null })
      return Object.assign({}, prev, { ingredients: newIngs })
    })
  }

  function addIngFromProduct(p) {
    var supName = ''
    var si
    for (si = 0; si < suppliers.length; si++) {
      if (suppliers[si].id === p.supplier_id) { supName = suppliers[si].name; break }
    }
    setFcEditForm(function(prev){
      var newIng = {
        article: p.name,
        fournisseur: supName,
        unite: p.unit || 'kg',
        prix_achat: Number(p.current_price || 0),
        qte: 0,
        product_id: p.id,
        _isNew: true,
        _toDelete: false
      }
      return Object.assign({}, prev, { ingredients: (prev.ingredients || []).concat([newIng]) })
    })
    setAddIngSearch('')
  }

  function saveEdit() {
    if (!fcEditForm) return
    if (!fcEditForm.name) { toast('Nom obligatoire'); return }
    if (!fcEditForm.recipe_id) { toast('Création nouvelle recette bientôt dispo — pour l\'instant éditer une existante'); return }

    setSaving(true)
    var client = sb()

    // 1. UPDATE recipe (prix vente, nom si changé)
    var updatePromise = client.from('recipes').update({
      name: fcEditForm.name,
      prix_vente_ttc: fcEditForm.prix_vente_ttc,
      tva: fcEditForm.tva,
      updated_at: new Date().toISOString()
    }).eq('id', fcEditForm.recipe_id)

    updatePromise.then(function(res){
      if (res.error) throw res.error

      // 2. Boucler sur les ingrédients
      var promises = []
      var ings = fcEditForm.ingredients || []
      var ii
      for (ii = 0; ii < ings.length; ii++) {
        var ing = ings[ii]
        if (ing._toDelete && ing.id) {
          promises.push(client.from('recipe_ingredients').delete().eq('id', ing.id))
        } else if (ing._isNew) {
          promises.push(client.from('recipe_ingredients').insert({
            recipe_id: fcEditForm.recipe_id,
            article: ing.article,
            fournisseur: ing.fournisseur,
            unite: ing.unite,
            prix_achat: ing.prix_achat,
            qte: ing.qte,
            cout: (ing.prix_achat || 0) * (ing.qte || 0),
            product_id: ing.product_id || null
          }))
        } else if (ing.id) {
          promises.push(client.from('recipe_ingredients').update({
            qte: ing.qte,
            prix_achat: ing.prix_achat,
            cout: (ing.prix_achat || 0) * (ing.qte || 0),
            product_id: ing.product_id || null
          }).eq('id', ing.id))
        }
      }

      return Promise.all(promises)
    }).then(function(){
      toast('✅ Recette enregistrée')
      setSaving(false)
      setFcView('recettes')
      setFcEditForm(null)
      loadData()
    }).catch(function(e){
      toast('Erreur : ' + (e.message || String(e)))
      setSaving(false)
    })
  }

  // ============= DRINK EDIT =============
  var [drinkEdit, setDrinkEdit] = useState(null)
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
  var editCalc = editFormComputed()

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
      {fcView === 'recettes' && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 0 12px',flexWrap:'wrap'}}>
          <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,opacity:.5}}>Seuil alerte food cost :</span>
          {[20,25,30,35].map(function(s){return(
            <button key={s} className="btn btn-sm" style={{fontSize:10,background:fcSeuil===s?'#CC0066':'#F5F5F5',color:fcSeuil===s?'#fff':'#555',border:'1.5px solid '+(fcSeuil===s?'#CC0066':'#DDD')}} onClick={function(){if(setFcSeuil)setFcSeuil(s)}}>{s}%</button>
          )})}
        </div>
      )}

      {/* CATEGORY FILTER */}
      {fcView === 'recettes' && !fcSelectedParent && (
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {[
            {id:'tous',label:'Tous'},
            {id:'sandwich',label:'🥪 Sandwichs'},
            {id:'salade',label:'🥗 Salades'},
            {id:'accompagnement',label:'🍟 Accomp.'},
            {id:'boisson_maison',label:'🥤 Pink Lemonade'}
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
              <div key={parent.parent_slug} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(alert?'#CC0066':'#009D3A')}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{flex:1,cursor:'pointer',minHeight:44,display:'flex',flexDirection:'column',justifyContent:'center'}} onClick={function(){setFcSelectedParent(parent);setFcSelectedVariant(v.variant_key)}}>
                    <div style={{fontWeight:900,fontSize:14,display:'flex',alignItems:'center',gap:6}}>
                      {parent.name}
                      {hasVariants && <span style={{fontSize:9,background:'#FF82D7',color:'#fff',padding:'2px 6px',borderRadius:4,fontWeight:900}}>STD + MINI</span>}
                    </div>
                    <div style={{fontSize:11,opacity:.6}}>
                      {v.ingredients.reduce(function(acc, i){
                        return acc.indexOf(i.fournisseur) > -1 ? acc : acc.concat([i.fournisseur])
                      }, []).slice(0, 2).join(', ')}
                      {' · '}PV {v.prix_vente_ttc}€ TTC · Marge HT {v.marge_ht}€
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0,marginLeft:8}}>
                    <div style={{textAlign:'right',cursor:'pointer',padding:'4px 8px'}} onClick={function(){setFcSelectedParent(parent);setFcSelectedVariant(v.variant_key)}}>
                      <div style={{fontSize:20,fontWeight:900,color:barColor}}>{v.food_cost_pct}%</div>
                      <div style={{fontSize:10,opacity:.5}}>food cost</div>
                    </div>
                    <button style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:8,fontSize:16,cursor:'pointer',padding:'8px 12px',minWidth:44,minHeight:44,fontWeight:900,flexShrink:0,WebkitTapHighlightColor:'transparent'}} onClick={function(){openEdit(parent, v.variant_key)}}>✏️</button>
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
      {fcView === 'recettes' && fcSelectedParent && (function(){
        var parent = fcSelectedParent
        var v = pickVariant(parent, fcSelectedVariant)
        if (!v) return <div>Erreur variant</div>
        var TVA = v.tva
        var conseilX4TTC = Math.round(v.food_cost_ht * 4 * (1 + TVA) * 100) / 100
        var conseilX5TTC = Math.round(v.food_cost_ht * 5 * (1 + TVA) * 100) / 100
        var variantsList = Object.values(parent.variants)
        var coeffActuel = v.food_cost_ht > 0 ? Math.round(v.prix_vente_ht / v.food_cost_ht * 100) / 100 : 0

        return (
          <div>
            <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn btn-sm" onClick={function(){setFcSelectedParent(null)}}>← Retour</button>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923',flex:1}}>{parent.name}</div>
              <button className="btn btn-y btn-sm" style={{fontWeight:900}} onClick={function(){openEdit(parent, fcSelectedVariant)}}>✏️ Modifier</button>
            </div>

            {/* Toggle variantes */}
            {variantsList.length > 1 && (
              <div style={{display:'flex',gap:0,marginBottom:16,background:'#F5F5F5',borderRadius:10,padding:4}}>
                {variantsList.map(function(vv){
                  var active = vv.variant_key === fcSelectedVariant
                  return (
                    <button key={vv.variant_key} onClick={function(){setFcSelectedVariant(vv.variant_key)}} style={{flex:1,padding:'10px 14px',background:active?'#191923':'transparent',color:active?'#FFEB5A':'#555',border:'none',borderRadius:8,fontWeight:900,fontSize:13,cursor:'pointer'}}>
                      {vv.variant_label} · {vv.prix_vente_ttc}€
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
                  <div style={{fontSize:22,fontWeight:900,color:'#191923'}}>{conseilX4TTC}€ TTC</div>
                </div>
                <div style={{background:'#fff',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'#CC0066',fontWeight:900,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>x5 — confortable</div>
                  <div style={{fontSize:22,fontWeight:900,color:'#CC0066'}}>{conseilX5TTC}€ TTC</div>
                </div>
              </div>
              <div style={{fontSize:11,color:'#191923',opacity:.5,marginTop:8}}>Food cost actuel : {v.food_cost_ht.toFixed(3)}€ · TVA {(TVA*100).toFixed(1)}%</div>
            </div>

            {/* RECAP prix actuel */}
            <div style={{background:'#fff',borderRadius:12,padding:16,border:'1.5px solid #EBEBEB',marginBottom:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 12px',border:'1.5px solid #DDEEFF'}}>
                  <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginBottom:3}}>Prix de vente TTC actuel</div>
                  <div style={{fontWeight:900,fontSize:20}}>{v.prix_vente_ttc.toFixed(2)}€</div>
                  <div style={{fontSize:10,opacity:.4,marginTop:2}}>HT : {v.prix_vente_ht.toFixed(2)}€</div>
                </div>
                <div style={{background:'#FFEB5A',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:10,opacity:.6,textTransform:'uppercase',marginBottom:3}}>Coeff actuel</div>
                  <div style={{fontWeight:900,fontSize:20}}>x{coeffActuel} <span style={{fontSize:13,opacity:.7}}>({v.food_cost_pct}%)</span></div>
                  <div style={{fontSize:10,opacity:.6,marginTop:2}}>Marge HT {v.marge_ht}€</div>
                </div>
              </div>
            </div>

            {/* INGREDIENTS */}
            <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,opacity:.5}}>Ingrédients</div>
            {v.ingredients.map(function(ing, idx){
              var realCost = (ing.prix_achat || 0) * (ing.qte || 0)
              return (
                <div key={ing.id || idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #F0F0F0'}}>
                  <div style={{flex:1}}>
                    <div onClick={function(){setIngPopup(ing)}} style={{fontSize:13,fontWeight:700,cursor:'pointer',textDecoration:'underline',textDecorationColor:'#FF82D7'}}>{ing.article}</div>
                    <div style={{fontSize:10,opacity:.5}}>{ing.fournisseur} · {ing.qte} {ing.unite} × {ing.prix_achat}€/{ing.unite}</div>
                  </div>
                  <div style={{fontSize:12,fontWeight:900}}>{realCost.toFixed(3)}€</div>
                </div>
              )
            })}
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
            var prixHT = d.selling_price_ttc / (1 + (d.tva_rate || 0.20))
            var marge = Math.round((prixHT - d.purchase_price_ht) * 100) / 100
            var pct = d.selling_price_ttc > 0 ? Math.round(d.purchase_price_ht / prixHT * 1000) / 10 : 0
            var isEdit = drinkEdit && drinkEdit.id === d.id
            return (
              <div key={d.id} className="card" style={{marginBottom:8,borderLeft:'4px solid #FF82D7'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <div style={{flex:1,minWidth:150}}>
                    <div style={{fontWeight:900,fontSize:14}}>{d.name}</div>
                    <div style={{fontSize:10,opacity:.5}}>{d.supplier_name} · TVA {((d.tva_rate || 0.20) * 100).toFixed(0)}%</div>
                  </div>
                  <div style={{display:'flex',gap:14,alignItems:'center'}}>
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,opacity:.5,textTransform:'uppercase'}}>Achat HT</div>
                      {!isEdit && (
                        <div style={{fontWeight:900,fontSize:14,cursor:'pointer'}} onClick={function(){setDrinkEdit({id:d.id, price: Number(d.purchase_price_ht)})}}>{Number(d.purchase_price_ht).toFixed(3)}€</div>
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
                      <div style={{fontWeight:900,fontSize:14}}>{Number(d.selling_price_ttc).toFixed(2)}€</div>
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
              fourn[f].totalCout += (ing.prix_achat || 0) * (ing.qte || 0)
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
                    <div style={{fontWeight:900,fontSize:16,color:'#005FFF'}}>{f.totalCout.toFixed(2)}€</div>
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

      {/* ========== VUE EDIT ========== */}
      {fcView === 'edit' && fcEditForm && (
        <div style={{paddingBottom:40}}>
          <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
            <button className="btn btn-sm" onClick={function(){setFcView('recettes');setFcEditForm(null)}}>← Annuler</button>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923',flex:1}}>
              {fcEditForm.recipe_id ? ('Modifier ' + fcEditForm.name) : 'Nouvelle recette'}
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <label className="lbl">Nom *</label>
            <input className="inp" value={fcEditForm.name || ''} onChange={function(e){setFcEditForm(function(prev){return Object.assign({},prev,{name:e.target.value})})}} placeholder="Ex: Pastrami" />
          </div>

          <div style={{marginBottom:12}}>
            <label className="lbl">Prix de vente TTC (€) *</label>
            <input type="number" step="0.5" className="inp" style={{fontSize:20,fontWeight:900}} value={fcEditForm.prix_vente_ttc || ''} onChange={function(e){setFcEditForm(function(prev){return Object.assign({},prev,{prix_vente_ttc: parseFloat(e.target.value) || 0})})}} placeholder="0.00" />
          </div>

          {/* KPIs en live */}
          <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,border:'1.5px solid #DDEEFF'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase'}}>PV HT</div>
              <div style={{fontWeight:900,fontSize:14}}>{editCalc.prixHT}€</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase'}}>Food Cost</div>
              <div style={{fontWeight:900,fontSize:14,color:editCalc.fcPct>fcSeuil?'#CC0066':'#009D3A'}}>{editCalc.fcPct}%</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase'}}>Marge HT</div>
              <div style={{fontWeight:900,fontSize:14}}>{editCalc.marge}€</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase'}}>Coût mat.</div>
              <div style={{fontWeight:900,fontSize:14}}>{editCalc.totalCost}€</div>
            </div>
          </div>

          {/* Ingrédients existants */}
          <div style={{marginBottom:12}}>
            <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,opacity:.5}}>
              Ingrédients ({(fcEditForm.ingredients || []).filter(function(i){return !i._toDelete}).length})
            </div>
            {(fcEditForm.ingredients || []).map(function(ing, idx){
              if (ing._toDelete) return null
              var isKg = ing.unite === 'kg' || ing.unite === 'l' || ing.unite === 'L'
              var displayQte = isKg ? Math.round((ing.qte || 0) * 1000) : (ing.qte || 0)
              var displayUnit = isKg ? (ing.unite === 'l' || ing.unite === 'L' ? 'ml' : 'g') : (ing.unite || 'U')
              var prixRevient = Math.round((ing.prix_achat || 0) * (ing.qte || 0) * 100) / 100
              return (
                <div key={idx} style={{marginBottom:8,background:'#FAFAFA',borderRadius:8,padding:'10px 12px',border:'1px solid #EBEBEB'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:900}}>{ing.article} {ing._isNew && <span style={{fontSize:9,background:'#009D3A',color:'#fff',padding:'1px 5px',borderRadius:3}}>NEW</span>}</div>
                      <div style={{fontSize:10,opacity:.5}}>{ing.fournisseur}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:15,fontWeight:900,color:'#005FFF'}}>{prixRevient}€</div>
                      </div>
                      <button style={{background:'#FFE5E5',border:'none',color:'#CC0066',fontSize:14,cursor:'pointer',borderRadius:6,padding:'6px 10px',minWidth:36,minHeight:36}} onClick={function(){removeIng(idx)}}>🗑️</button>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Prix (€/{ing.unite || 'kg'})</div>
                      <input type="number" step="0.01" className="inp" style={{padding:'6px 8px',fontSize:14,fontWeight:700}} value={ing.prix_achat || ''} onChange={function(e){updateIng(idx, 'prix_achat', parseFloat(e.target.value) || 0)}} placeholder="0.00" />
                    </div>
                    <div>
                      <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Quantité ({displayUnit})</div>
                      <input type="number" step={isKg ? '1' : '0.1'} className="inp" style={{padding:'6px 8px',fontSize:14,fontWeight:700}} value={displayQte || ''} onChange={function(e){
                        var raw = parseFloat(e.target.value) || 0
                        var v = isKg ? raw / 1000 : raw
                        updateIng(idx, 'qte', v)
                      }} placeholder={isKg ? '0 g' : '0'} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* AJOUTER INGREDIENT depuis products Supabase */}
          <div style={{marginBottom:20,background:'#FFF9E0',borderRadius:10,padding:12,border:'1.5px solid #FFEB5A'}}>
            <div style={{fontWeight:900,fontSize:11,textTransform:'uppercase',marginBottom:8}}>+ Ajouter un ingrédient du catalogue</div>
            <input className="inp" placeholder="Chercher un produit (ex: poulet, saumon...)" value={addIngSearch} onChange={function(e){setAddIngSearch(e.target.value)}} style={{marginBottom:8}} />
            {addIngSearch.length >= 2 && (
              <div style={{maxHeight:200,overflowY:'auto',background:'#fff',borderRadius:6,border:'1px solid #EEE'}}>
                {products.filter(function(p){
                  return (p.name || '').toLowerCase().indexOf(addIngSearch.toLowerCase()) > -1
                }).slice(0, 10).map(function(p){
                  var sup = ''
                  var si
                  for (si = 0; si < suppliers.length; si++) {
                    if (suppliers[si].id === p.supplier_id) { sup = suppliers[si].name; break }
                  }
                  return (
                    <div key={p.id} onClick={function(){addIngFromProduct(p)}} style={{padding:'8px 10px',borderBottom:'1px solid #F5F5F5',cursor:'pointer',fontSize:12}}>
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

          {/* BOUTONS */}
          <div style={{display:'flex',gap:8,paddingTop:16,borderTop:'1px solid #EBEBEB'}}>
            <button className="btn" style={{flex:1}} onClick={function(){setFcView('recettes');setFcEditForm(null)}} disabled={saving}>Annuler</button>
            <button className="btn btn-y" style={{flex:2,fontWeight:900,fontSize:16}} onClick={saveEdit} disabled={saving}>
              {saving ? '💾 Enregistrement…' : '💾 Enregistrer'}
            </button>
          </div>
        </div>
      )}

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
                        // Construire matches en comparant aux ingredients actuels
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
                    // Mise à jour des prix via Supabase
                    var promises = []
                    var mi
                    for (mi = 0; mi < fcInvoiceMatches.length; mi++) {
                      var m = fcInvoiceMatches[mi]
                      if (!m.selected || !m.matched) continue
                      // Update recipe_ingredients where article = m.matched.article
                      promises.push(
                        sb().from('recipe_ingredients')
                          .update({ prix_achat: m.ligne.prix_unitaire_ht, cout: m.ligne.prix_unitaire_ht })
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
