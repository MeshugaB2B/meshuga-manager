'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

function fmt(n) {
  return (Math.round(Number(n || 0) * 100) / 100).toFixed(2)
}

// =============================================================================
// ProductRecipeAssignment
//
// Composant réutilisable pour affecter UN produit à N recettes,
// avec une quantité par recette et détection de doublons texte libre.
//
// Props :
//   - product : { id, name, unit, current_price, supplier_id, ... } (le product déjà en DB)
//   - preselectedRecipeIds : array<string> — recettes pré-cochées (ex: la recette courante)
//   - preselectedQuantities : { [recipe_id]: qty_in_master_unit } — qté pré-remplie
//   - onSaved : callback() appelé après sauvegarde réussie
//   - onCancel : callback() pour fermer le composant
//   - toast : function(msg)
//
// Logique de save :
// Pour chaque recette cochée :
//   1. Si une ligne recipe_ingredients existe avec product_id = product.id → UPDATE qté
//   2. Sinon, si une ligne existe en texte libre dont le nom matche product.name → UPDATE en y mettant product_id (reconnexion catalogue)
//   3. Sinon → INSERT nouvelle ligne avec product_id
// Pour les recettes décochées (qui avaient une ligne avant) → DELETE
// =============================================================================
export default function ProductRecipeAssignment(props) {
  var product = props.product
  var preselectedRecipeIds = props.preselectedRecipeIds || []
  var preselectedQuantities = props.preselectedQuantities || {}
  var onSaved = props.onSaved || function(){}
  var onCancel = props.onCancel || function(){}
  var toast = props.toast || function(m){ console.log(m) }

  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [recipes, setRecipes] = useState([])           // toutes les recettes (parents + variantes)
  var [existingIngs, setExistingIngs] = useState([]) // recipe_ingredients existants (pour détection doublons)
  var [catFilter, setCatFilter] = useState('tous')
  var [search, setSearch] = useState('')

  // Pour chaque recette : { selected: bool, qty_master: number, existing_id: uuid|null, is_text_free_match: bool, original_label: string|null }
  var [selections, setSelections] = useState({})

  // ============= LOAD =============
  useEffect(function(){
    if (!product || !product.id) { setLoading(false); return }
    Promise.all([
      sb().from('recipes').select('id, name, parent_slug, variant_key, variant_label, categorie, is_active').eq('is_active', true).order('parent_slug'),
      sb().from('recipe_ingredients').select('id, recipe_id, article, fournisseur, unite, qte, prix_achat, product_id')
    ]).then(function(results){
      var allRecipes = results[0].data || []
      var allIngs = results[1].data || []
      setRecipes(allRecipes)
      setExistingIngs(allIngs)

      // Initialiser les selections pour chaque recette
      var prodNameLow = String(product.name || '').toLowerCase().trim()
      var nextSel = {}
      var i
      for (i = 0; i < allRecipes.length; i++) {
        var r = allRecipes[i]
        // Chercher si une ligne recipe_ingredients existe pour ce product dans cette recette
        var existing = null
        var textFreeMatch = null
        var ii
        for (ii = 0; ii < allIngs.length; ii++) {
          var ing = allIngs[ii]
          if (ing.recipe_id !== r.id) continue
          if (ing.product_id === product.id) { existing = ing; break }
          // Sinon : matching texte libre par nom approximatif
          var ingName = String(ing.article || '').toLowerCase().trim()
          if (ingName && prodNameLow && (ingName === prodNameLow || ingName.indexOf(prodNameLow) >= 0 || prodNameLow.indexOf(ingName) >= 0)) {
            if (!textFreeMatch) textFreeMatch = ing
          }
        }

        var preselected = preselectedRecipeIds.indexOf(r.id) >= 0
        var preQty = preselectedQuantities[r.id]
        var initialSelected = !!existing || preselected
        var initialQty = 0
        if (existing) initialQty = Number(existing.qte || 0)
        else if (preQty !== undefined && preQty !== null) initialQty = Number(preQty)
        else if (textFreeMatch) initialQty = Number(textFreeMatch.qte || 0)

        nextSel[r.id] = {
          selected: initialSelected,
          qty_master: initialQty,
          existing_id: existing ? existing.id : null,
          is_text_free_match: !!(textFreeMatch && !existing),
          text_free_id: textFreeMatch && !existing ? textFreeMatch.id : null,
          original_label: textFreeMatch && !existing ? textFreeMatch.article : null
        }
      }
      setSelections(nextSel)
      setLoading(false)
    }).catch(function(e){
      toast('Erreur chargement: ' + (e.message || String(e)))
      setLoading(false)
    })
  }, [product && product.id])

  // ============= HELPERS =============
  function buildGrouped() {
    // Regrouper par parent_slug pour montrer Std + Mini ensemble
    var grouped = {}
    var i
    for (i = 0; i < recipes.length; i++) {
      var r = recipes[i]
      var key = r.parent_slug || r.id
      if (!grouped[key]) {
        grouped[key] = {
          parent_slug: key,
          parent_name: r.name,
          category: r.categorie,
          variants: []
        }
      }
      // Conserver le nom du standard comme nom du parent
      if (r.variant_key === 'standard') {
        grouped[key].parent_name = r.name
        grouped[key].category = r.categorie
      }
      grouped[key].variants.push(r)
    }
    // Trier les variantes : standard en premier
    Object.values(grouped).forEach(function(g){
      g.variants.sort(function(a, b){
        if (a.variant_key === 'standard') return -1
        if (b.variant_key === 'standard') return 1
        return 0
      })
    })
    return Object.values(grouped)
  }

  function isKgUnit(unit) {
    return unit === 'kg' || unit === 'l' || unit === 'L'
  }

  function displayUnit(unit) {
    if (unit === 'kg') return 'g'
    if (unit === 'l' || unit === 'L') return 'ml'
    return unit || 'U'
  }

  function masterToDisplay(qtyMaster, unit) {
    if (isKgUnit(unit)) return Math.round(Number(qtyMaster || 0) * 1000)
    return Number(qtyMaster || 0)
  }

  function displayToMaster(qtyDisplay, unit) {
    var v = parseFloat(qtyDisplay) || 0
    if (isKgUnit(unit)) return v / 1000
    return v
  }

  function toggleRecipe(recipeId) {
    setSelections(function(prev){
      var next = Object.assign({}, prev)
      var cur = prev[recipeId] || { selected: false, qty_master: 0, existing_id: null, is_text_free_match: false, text_free_id: null, original_label: null }
      next[recipeId] = Object.assign({}, cur, { selected: !cur.selected })
      return next
    })
  }

  function setQty(recipeId, qtyDisplay) {
    var unit = product && product.unit ? product.unit : 'kg'
    var qtyMaster = displayToMaster(qtyDisplay, unit)
    setSelections(function(prev){
      var next = Object.assign({}, prev)
      var cur = prev[recipeId] || { selected: true, qty_master: 0, existing_id: null, is_text_free_match: false, text_free_id: null, original_label: null }
      next[recipeId] = Object.assign({}, cur, { qty_master: qtyMaster, selected: true })
      return next
    })
  }

  function clearAll() {
    setSelections(function(prev){
      var next = {}
      var keys = Object.keys(prev)
      var i
      for (i = 0; i < keys.length; i++) {
        next[keys[i]] = Object.assign({}, prev[keys[i]], { selected: false })
      }
      return next
    })
  }

  // ============= SAVE =============
  function doSave() {
    if (saving) return
    if (!product || !product.id) { toast('Produit invalide'); return }

    // Construire la liste d'ops
    var keys = Object.keys(selections)
    var inserts = []
    var updates = []
    var deletes = []
    var conversions = 0  // nb de lignes texte libre converties en lien catalogue

    var supName = ''
    // Lookup nom du fournisseur du product (pour remplir recipe_ingredients.fournisseur)
    // On le récupère via une requête en chaîne, ou si le caller l'a fourni dans product.supplier_name on l'utilise
    if (product.supplier_name) supName = product.supplier_name

    var i
    for (i = 0; i < keys.length; i++) {
      var rid = keys[i]
      var sel = selections[rid]
      if (!sel) continue

      if (sel.selected) {
        if (Number(sel.qty_master || 0) <= 0) {
          toast('Renseigne une quantité pour chaque recette cochée')
          return
        }
        var qte = Number(sel.qty_master)
        var prix = Number(product.current_price || 0)
        var cout = qte * prix

        if (sel.existing_id) {
          // UPDATE de la ligne existante (déjà liée au product)
          updates.push({
            id: sel.existing_id,
            payload: { qte: qte, prix_achat: prix, cout: cout }
          })
        } else if (sel.is_text_free_match && sel.text_free_id) {
          // Conversion : ligne texte libre existante → on la lie au product
          updates.push({
            id: sel.text_free_id,
            payload: {
              product_id: product.id,
              article: product.name,
              fournisseur: supName || '',
              unite: product.unit || 'kg',
              qte: qte,
              prix_achat: prix,
              cout: cout
            }
          })
          conversions++
        } else {
          // INSERT nouvelle ligne
          inserts.push({
            recipe_id: rid,
            article: product.name,
            fournisseur: supName || '',
            unite: product.unit || 'kg',
            qte: qte,
            prix_achat: prix,
            cout: cout,
            product_id: product.id
          })
        }
      } else {
        // décoché : si une ligne existait pour ce product, la supprimer
        if (sel.existing_id) deletes.push(sel.existing_id)
      }
    }

    if (inserts.length === 0 && updates.length === 0 && deletes.length === 0) {
      toast('Rien à enregistrer')
      return
    }

    setSaving(true)
    var supabase = sb()

    // Récupérer le nom du fournisseur si pas fourni
    var supLookup = Promise.resolve(supName)
    if (!supName && product.supplier_id) {
      supLookup = supabase.from('suppliers').select('name').eq('id', product.supplier_id).single().then(function(r){
        return r.data ? r.data.name : ''
      })
    }

    supLookup.then(function(resolvedSupName){
      // Mettre à jour le fournisseur dans les payloads si on l'a récupéré tardivement
      if (resolvedSupName && !supName) {
        var ii
        for (ii = 0; ii < inserts.length; ii++) {
          if (!inserts[ii].fournisseur) inserts[ii].fournisseur = resolvedSupName
        }
        for (ii = 0; ii < updates.length; ii++) {
          if (updates[ii].payload && Object.prototype.hasOwnProperty.call(updates[ii].payload, 'fournisseur') && !updates[ii].payload.fournisseur) {
            updates[ii].payload.fournisseur = resolvedSupName
          }
        }
      }

      var opPromises = []
      // INSERTS
      if (inserts.length > 0) {
        opPromises.push(supabase.from('recipe_ingredients').insert(inserts))
      }
      // UPDATES (un par un car on ne peut pas batch-update avec des payloads différents)
      var uu
      for (uu = 0; uu < updates.length; uu++) {
        opPromises.push(supabase.from('recipe_ingredients').update(updates[uu].payload).eq('id', updates[uu].id))
      }
      // DELETES (on peut batch via .in)
      if (deletes.length > 0) {
        opPromises.push(supabase.from('recipe_ingredients').delete().in('id', deletes))
      }

      Promise.all(opPromises).then(function(results){
        var failed = results.filter(function(r){ return r && r.error })
        setSaving(false)
        if (failed.length > 0) {
          toast('Erreur partielle : ' + failed[0].error.message)
          return
        }
        var msg = '✅ '
        var parts = []
        if (inserts.length > 0) parts.push(inserts.length + ' affectation' + (inserts.length > 1 ? 's' : ''))
        if (updates.length > 0) parts.push(updates.length + ' mise' + (updates.length > 1 ? 's' : '') + ' à jour')
        if (deletes.length > 0) parts.push(deletes.length + ' retrait' + (deletes.length > 1 ? 's' : ''))
        if (conversions > 0) parts.push(conversions + ' lien' + (conversions > 1 ? 's' : '') + ' catalogue rétabli' + (conversions > 1 ? 's' : ''))
        msg += parts.join(' · ')
        toast(msg)
        onSaved()
      }).catch(function(err){
        setSaving(false)
        toast('Erreur réseau: ' + (err.message || String(err)))
      })
    }).catch(function(err){
      setSaving(false)
      toast('Erreur fournisseur: ' + (err.message || String(err)))
    })
  }

  // ============= COMPUTED =============
  var grouped = buildGrouped()
  var searchLow = (search || '').toLowerCase().trim()
  var filteredGrouped = grouped.filter(function(g){
    if (catFilter !== 'tous' && g.category !== catFilter) return false
    if (searchLow) {
      if (String(g.parent_name || '').toLowerCase().indexOf(searchLow) < 0) return false
    }
    return true
  })

  var nbSelected = Object.keys(selections).filter(function(k){ return selections[k] && selections[k].selected }).length
  var nbConversions = Object.keys(selections).filter(function(k){ return selections[k] && selections[k].selected && selections[k].is_text_free_match }).length

  var unit = product && product.unit ? product.unit : 'kg'
  var displayU = displayUnit(unit)

  // ============= RENDER =============
  if (loading) {
    return (
      <div style={{padding:30,textAlign:'center',background:'#fff',borderRadius:8,border:'1px solid #EEE'}}>
        <div style={{fontSize:24,marginBottom:8}}>🔗</div>
        <div style={{fontWeight:900,fontSize:13}}>Chargement des recettes…</div>
      </div>
    )
  }

  return (
    <div style={{background:'#fff',borderRadius:10,padding:14,border:'2px solid #FF82D7'}}>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div>
          <div style={{fontWeight:900,fontSize:13,textTransform:'uppercase',color:'#FF82D7'}}>🔗 Affecter à des recettes</div>
          <div style={{fontSize:11,opacity:.6,marginTop:2}}>{product ? product.name : '—'} · {fmt(product && product.current_price)}€/{unit}</div>
        </div>
        {nbSelected > 0 && (
          <button onClick={clearAll} disabled={saving} style={{background:'#F5F5F5',border:'1.5px solid #DDD',borderRadius:6,padding:'4px 10px',fontSize:10,fontWeight:900,cursor:'pointer'}}>Tout retirer</button>
        )}
      </div>

      {nbConversions > 0 && (
        <div style={{background:'#FFF8E1',borderRadius:6,padding:'8px 10px',marginBottom:10,border:'1px solid #FFE099',fontSize:11,color:'#856B00'}}>
          💡 {nbConversions} ligne{nbConversions > 1 ? 's' : ''} en texte libre va{nbConversions > 1 ? 'ont' : ''} être convertie{nbConversions > 1 ? 's' : ''} en lien catalogue → propagation auto des futures mises à jour de prix.
        </div>
      )}

      {/* Filtres */}
      <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
        {[
          {id:'tous', label:'Toutes'},
          {id:'classique', label:'🥪 Sandwichs'},
          {id:'salade', label:'🥗 Salades'},
          {id:'accompagnement', label:'🍟 Accomp.'},
          {id:'boisson', label:'🥤 Boissons'},
          {id:'mini', label:'🥨 Mini'}
        ].map(function(c){
          var active = catFilter === c.id
          return (
            <button key={c.id} onClick={function(){setCatFilter(c.id)}} style={{padding:'4px 8px',fontSize:10,fontWeight:900,borderRadius:5,border:'1.5px solid '+(active?'#191923':'#DDD'),background:active?'#191923':'#fff',color:active?'#FFEB5A':'#555',cursor:'pointer'}}>{c.label}</button>
          )
        })}
      </div>

      <input value={search} onChange={function(e){setSearch(e.target.value)}} placeholder="Rechercher une recette..." style={{width:'100%',padding:'7px 10px',fontSize:11,border:'1.5px solid #DDD',borderRadius:6,marginBottom:10}} />

      {/* Liste recettes groupées */}
      <div style={{maxHeight:380,overflowY:'auto',background:'#FAFAFA',borderRadius:6,padding:6,border:'1px solid #EEE'}}>
        {filteredGrouped.length === 0 && (
          <div style={{padding:16,textAlign:'center',fontSize:11,opacity:.5}}>Aucune recette ne correspond.</div>
        )}
        {filteredGrouped.map(function(g){
          return (
            <div key={g.parent_slug} style={{background:'#fff',borderRadius:6,marginBottom:4,padding:'6px 8px',border:'1px solid #F0F0F0'}}>
              <div style={{fontSize:11,fontWeight:900,marginBottom:4,opacity:.8}}>{g.parent_name}</div>
              {g.variants.map(function(r){
                var sel = selections[r.id] || { selected: false, qty_master: 0 }
                var qtyDisp = masterToDisplay(sel.qty_master, unit)
                return (
                  <div key={r.id} style={{display:'flex',alignItems:'center',gap:8,padding:'4px 0',borderTop:'1px dashed #F5F5F5'}}>
                    <label style={{display:'flex',alignItems:'center',gap:6,flex:1,cursor:'pointer',minWidth:0}}>
                      <input type="checkbox" checked={!!sel.selected} onChange={function(){toggleRecipe(r.id)}} style={{width:14,height:14,flexShrink:0}} />
                      <span style={{fontSize:11,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {r.variant_label || (r.variant_key === 'standard' ? 'Standard' : r.name)}
                        {sel.is_text_free_match && (
                          <span style={{fontSize:9,marginLeft:6,padding:'1px 5px',background:'#FFF8E1',color:'#856B00',borderRadius:3,fontWeight:900}}>↻ EXISTE</span>
                        )}
                        {sel.existing_id && !sel.is_text_free_match && (
                          <span style={{fontSize:9,marginLeft:6,padding:'1px 5px',background:'#E8F8EE',color:'#009D3A',borderRadius:3,fontWeight:900}}>✓ LIÉ</span>
                        )}
                      </span>
                    </label>
                    {sel.selected && (
                      <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                        <input type="number" step={isKgUnit(unit) ? '1' : '0.01'} value={qtyDisp || ''} onChange={function(e){setQty(r.id, e.target.value)}} placeholder="0" style={{width:54,padding:'3px 5px',fontSize:11,fontWeight:700,border:'1.5px solid #DDD',borderRadius:4,textAlign:'right'}} />
                        <span style={{fontSize:10,opacity:.6,minWidth:18}}>{displayU}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12,gap:8}}>
        <div style={{fontSize:11,opacity:.7}}>
          {nbSelected > 0 ? <strong>{nbSelected} recette{nbSelected > 1 ? 's' : ''} sélectionnée{nbSelected > 1 ? 's' : ''}</strong> : <span>Aucune sélection</span>}
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={onCancel} disabled={saving} style={{padding:'8px 12px',borderRadius:6,border:'1.5px solid #DDD',background:'#fff',fontWeight:900,fontSize:11,cursor:'pointer'}}>Annuler</button>
          <button onClick={doSave} disabled={saving || nbSelected === 0} style={{padding:'8px 14px',borderRadius:6,border:'none',background:nbSelected > 0 ? '#FF82D7' : '#EEE',color:nbSelected > 0 ? '#fff' : '#888',fontWeight:900,fontSize:11,cursor:nbSelected > 0 ? 'pointer' : 'not-allowed'}}>{saving ? '…' : '✅ Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}
