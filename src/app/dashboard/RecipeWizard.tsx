'use client'

// ============================================================
// RecipeWizard — Création de recette en 4 étapes (Sprint 3)
// ============================================================

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

function tvaToRatio(t: any) {
  var n = Number(t || 0)
  if (n > 1) return n / 100
  return n
}

function fmt(n: any) {
  return (Math.round(Number(n || 0) * 100) / 100).toFixed(2)
}

var CATS = [
  { id: 'classique', label: 'Sandwich', emoji: '🥪' },
  { id: 'salade', label: 'Salade', emoji: '🥗' },
  { id: 'accompagnement', label: 'Accompagnement', emoji: '🍟' },
  { id: 'mini', label: 'Mini', emoji: '🥖' },
  { id: 'dessert', label: 'Dessert', emoji: '🍪' },
  { id: 'boisson', label: 'Boisson', emoji: '🥤' },
  { id: 'sous_recette', label: 'Sous-recette', emoji: '⚙️' },
  { id: 'sauce', label: 'Sauce', emoji: '🥫' }
]

export default function RecipeWizard(props: any) {
  var onClose = props.onClose || function(){}
  var onCreated = props.onCreated || function(){}
  var toast = props.toast || function(){}
  var products = props.products || []
  var suppliers = props.suppliers || []

  // Étape courante (1 à 4)
  var [step, setStep] = useState(1)
  var [saving, setSaving] = useState(false)

  // === ÉTAPE 1 — Identité ===
  var [name, setName] = useState('')
  var [categorie, setCategorie] = useState('classique')
  var [tva, setTva] = useState(5.5)

  // === ÉTAPE 2 — Composition (ingrédients) ===
  // ings = [{product_id, name, supplier, unit, prix_achat, qte}]
  var [ings, setIngs] = useState([])
  var [searchOpen, setSearchOpen] = useState(false)
  var [searchTerm, setSearchTerm] = useState('')
  var [createProductMode, setCreateProductMode] = useState(false)
  var [newProductDraft, setNewProductDraft] = useState(null)
  var [savingProduct, setSavingProduct] = useState(false)

  // === ÉTAPE 3 — Tarification ===
  var [coeff, setCoeff] = useState(4.5)

  // Food cost en € (calcul à partir des ings)
  var foodCost = 0
  for (var ii = 0; ii < ings.length; ii++) {
    foodCost += Number(ings[ii].prix_achat || 0) * Number(ings[ii].qte || 0)
  }
  var tvaRatio = tvaToRatio(tva)
  if (tvaRatio === 0) tvaRatio = 0.055

  // Prix calculé à partir du coefficient
  var prixHT = foodCost * coeff
  var prixTTC = prixHT * (1 + tvaRatio)
  var margeHT = prixHT - foodCost
  var fcPct = prixHT > 0 ? (foodCost / prixHT * 100) : 0

  // Couleur coefficient
  var coeffOk = coeff >= 4
  var coeffColor = coeffOk ? '#009D3A' : 'var(--p)'

  // === Validation pas-à-pas ===
  function canGoNext() {
    if (step === 1) return name.trim().length > 0
    if (step === 2) return ings.length > 0
    if (step === 3) return prixTTC > 0
    return true
  }

  // === Actions composition ===
  function addProductAsIng(p: any) {
    var sup = ''
    for (var si = 0; si < suppliers.length; si++) {
      if (suppliers[si].id === p.supplier_id) { sup = suppliers[si].name; break }
    }
    var newIng = {
      product_id: p.id,
      name: p.name,
      supplier: sup || p.supplier_name || '',
      unit: p.unit,
      prix_achat: Number(p.current_price || 0),
      qte: 0
    }
    setIngs(function(prev: any) { return prev.concat([newIng]) })
    setSearchOpen(false)
    setSearchTerm('')
  }

  function removeIng(idx: number) {
    setIngs(function(prev: any) { return prev.filter(function(_x: any, i: number) { return i !== idx }) })
  }

  function updateIngQte(idx: number, val: number) {
    setIngs(function(prev: any) { return prev.map(function(x: any, i: number) { return i === idx ? Object.assign({}, x, { qte: val }) : x }) })
  }

  function openCreateNewProduct() {
    setCreateProductMode(true)
    setNewProductDraft({
      name: searchTerm || '',
      supplier_mode: 'existing',
      supplier_id: '',
      new_supplier_name: '',
      current_price: 0,
      unit: 'kg',
      category: 'ingredient'
    })
  }

  function cancelCreateProduct() {
    setCreateProductMode(false)
    setNewProductDraft(null)
  }

  function saveNewProduct() {
    var d: any = newProductDraft
    if (!d || !d.name) { toast('Nom requis'); return }
    if (!d.current_price || d.current_price <= 0) { toast('Prix requis'); return }
    if (d.supplier_mode === 'existing' && !d.supplier_id) { toast('Fournisseur requis'); return }
    if (d.supplier_mode === 'new' && !d.new_supplier_name) { toast('Nom fournisseur requis'); return }
    setSavingProduct(true)
    function insertProduct(supplier_id: any) {
      var payload = {
        name: d.name,
        supplier_id: supplier_id,
        current_price: Number(d.current_price),
        unit: d.unit,
        category: d.category,
        is_active: true
      }
      sb().from('products').insert(payload).select().single().then(function(r: any) {
        setSavingProduct(false)
        if (r.error) { toast('Erreur: ' + r.error.message); return }
        addProductAsIng(r.data)
        setCreateProductMode(false)
        setNewProductDraft(null)
        toast('✅ Produit créé')
      })
    }
    if (d.supplier_mode === 'new') {
      sb().from('suppliers').insert({ name: d.new_supplier_name }).select().single().then(function(r: any) {
        if (r.error) { toast('Erreur fournisseur: ' + r.error.message); setSavingProduct(false); return }
        insertProduct(r.data.id)
      })
    } else {
      insertProduct(d.supplier_id)
    }
  }

  // === Création finale ===
  function createRecipeFinal() {
    if (!name.trim()) { toast('Nom obligatoire'); return }
    if (ings.length === 0) { toast('Au moins un ingrédient'); return }
    setSaving(true)
    var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    var newId = slug + '_' + Date.now().toString(36)
    var recipePayload = {
      id: newId,
      name: name,
      categorie: categorie,
      prix_vente_ttc: Math.round(prixTTC * 100) / 100,
      tva: Number(tva),
      parent_slug: slug,
      variant_key: 'standard',
      variant_label: 'Standard',
      is_active: true
    }
    sb().from('recipes').insert(recipePayload).then(function(r: any) {
      if (r.error) { setSaving(false); toast('Erreur recette: ' + r.error.message); return }
      // Insertion des ingrédients liés
      var ingredientsPayload = ings.map(function(ing: any) {
        return {
          recipe_id: newId,
          article: ing.name,
          fournisseur: ing.supplier,
          unite: ing.unit,
          prix_achat: Number(ing.prix_achat),
          qte: Number(ing.qte),
          product_id: ing.product_id
        }
      })
      sb().from('recipe_ingredients').insert(ingredientsPayload).then(function(r2: any) {
        setSaving(false)
        if (r2.error) { toast('Erreur ingrédients: ' + r2.error.message); return }
        toast('✅ Recette créée avec ' + ings.length + ' ingrédients')
        onCreated(slug)
      })
    })
  }

  // === Rendu helpers ===
  var STEPS = [
    { id: 1, label: 'Identité' },
    { id: 2, label: 'Composition' },
    { id: 3, label: 'Tarification' },
    { id: 4, label: 'Validation' }
  ]

  function categoryEmoji(cat: string) {
    for (var ci = 0; ci < CATS.length; ci++) { if (CATS[ci].id === cat) return CATS[ci].emoji }
    return '🍴'
  }

  // Filtrage produits dans la recherche
  var filteredProducts = []
  if (searchTerm.length >= 2) {
    var term = searchTerm.toLowerCase()
    for (var pi = 0; pi < products.length; pi++) {
      if ((products[pi].name || '').toLowerCase().indexOf(term) > -1) {
        filteredProducts.push(products[pi])
        if (filteredProducts.length >= 10) break
      }
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(25,25,35,.65)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:14}} onClick={onClose}>
      <div style={{background:'#FFFFFF',borderRadius:18,width:'100%',maxWidth:640,maxHeight:'92vh',display:'flex',flexDirection:'column',border:'2px solid #191923',boxShadow:'5px 5px 0 #191923',overflow:'hidden'}} onClick={function(e){e.stopPropagation()}}>

        {/* HEADER : titre + bouton fermer */}
        <div style={{padding:'14px 18px 0',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
          <div>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:32,color:'var(--p)',lineHeight:1}}>Nouvelle recette</div>
            <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2}}>Étape {step} sur 4 — {STEPS[step-1].label}</div>
          </div>
          <button onClick={onClose} title="Fermer" style={{width:34,height:34,borderRadius:'50%',border:'2px solid #191923',background:'#FFFFFF',cursor:'pointer',fontSize:16,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}>✕</button>
        </div>

        {/* Barre de progression — 4 étapes */}
        <div style={{padding:'14px 18px 0',display:'flex',gap:6}}>
          {STEPS.map(function(s) {
            var done = s.id < step
            var active = s.id === step
            return (
              <div key={s.id} style={{flex:1,height:6,borderRadius:3,background:active?'var(--p)':(done?'#009D3A':'#EBEBEB'),transition:'background .2s'}} />
            )
          })}
        </div>

        {/* BODY scrollable */}
        <div style={{flex:1,overflowY:'auto',padding:'18px'}}>

          {/* ============= ÉTAPE 1 — Identité ============= */}
          {step === 1 && (
            <div>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'var(--p)',lineHeight:1,marginBottom:14}}>Quel est ton plat ?</div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,opacity:.55,marginBottom:4,textTransform:'uppercase',fontWeight:900,letterSpacing:.5}}>Nom de la recette *</div>
                <input value={name} onChange={function(e){setName(e.target.value)}} placeholder="Ex : Reuben Sandwich, Caesar Veggie…" autoFocus style={{width:'100%',padding:'10px 12px',fontSize:16,fontWeight:700,border:'2px solid #191923',borderRadius:10,boxShadow:'2px 2px 0 #191923'}} />
              </div>

              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,opacity:.55,marginBottom:6,textTransform:'uppercase',fontWeight:900,letterSpacing:.5}}>Catégorie</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:6}}>
                  {CATS.map(function(c) {
                    var active = categorie === c.id
                    return (
                      <button key={c.id} onClick={function(){setCategorie(c.id)}} style={{padding:'10px 12px',background:active?'var(--p)':'#FFFFFF',color:active?'#FFFFFF':'#191923',border:'2px solid #191923',borderRadius:12,fontWeight:900,fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',gap:6,boxShadow:active?'2px 2px 0 #191923':'none'}}>
                        <span style={{fontSize:16}}>{c.emoji}</span>
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <div style={{fontSize:10,opacity:.55,marginBottom:6,textTransform:'uppercase',fontWeight:900,letterSpacing:.5}}>TVA applicable</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {[{v:5.5,l:'5,5% — à emporter'},{v:10,l:'10% — sur place'},{v:20,l:'20% — alcool'}].map(function(opt) {
                    var active = tva === opt.v
                    return (
                      <button key={opt.v} onClick={function(){setTva(opt.v)}} style={{flex:1,minWidth:100,padding:'9px 10px',background:active?'var(--p)':'#FFFFFF',color:active?'#FFFFFF':'#191923',border:'2px solid #191923',borderRadius:12,fontWeight:900,fontSize:11,cursor:'pointer'}}>
                        {opt.l}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ============= ÉTAPE 2 — Composition ============= */}
          {step === 2 && (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,gap:8,flexWrap:'wrap'}}>
                <div>
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'var(--p)',lineHeight:1}}>Composition</div>
                  <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2}}>{ings.length} ingrédient{ings.length>1?'s':''} · Food cost : {fmt(foodCost)}€</div>
                </div>
                <button onClick={function(){setSearchOpen(true);setSearchTerm('');setCreateProductMode(false)}} style={{padding:'8px 16px',background:'var(--p)',color:'#FFFFFF',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:11,cursor:'pointer',boxShadow:'2px 2px 0 #191923'}}>
                  + Ajouter
                </button>
              </div>

              {/* Panneau recherche / création produit */}
              {searchOpen && !createProductMode && (
                <div style={{background:'#FFFFFF',borderRadius:12,padding:12,marginBottom:12,border:'2px solid var(--y)',boxShadow:'3px 3px 0 #191923'}}>
                  <input value={searchTerm} onChange={function(e){setSearchTerm(e.target.value)}} placeholder="🔍 Chercher un produit (pain, saumon…)" autoFocus style={{width:'100%',padding:'9px 11px',fontSize:13,fontWeight:600,border:'2px solid #191923',borderRadius:10,marginBottom:8}} />
                  {searchTerm.length >= 2 && (
                    <div style={{maxHeight:200,overflowY:'auto',background:'#FAFAFA',borderRadius:8,border:'1px solid #EEE',marginBottom:8}}>
                      {filteredProducts.map(function(p: any) {
                        var sup = ''
                        for (var si = 0; si < suppliers.length; si++) { if (suppliers[si].id === p.supplier_id) { sup = suppliers[si].name; break } }
                        return (
                          <div key={p.id} onClick={function(){addProductAsIng(p)}} style={{padding:'10px 12px',borderBottom:'1px solid #F0F0F0',cursor:'pointer',fontSize:12,background:'#FFFFFF'}}>
                            <div style={{fontWeight:900}}>{p.name}</div>
                            <div style={{fontSize:10,opacity:.55,fontWeight:700,marginTop:2}}>{sup} · {p.current_price}€/{p.unit}</div>
                          </div>
                        )
                      })}
                      {filteredProducts.length === 0 && (
                        <div style={{padding:14,fontSize:11,opacity:.55,textAlign:'center',fontWeight:700}}>Aucun produit trouvé — crée-le ci-dessous ↓</div>
                      )}
                    </div>
                  )}
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={function(){setSearchOpen(false);setSearchTerm('')}} style={{padding:'8px 12px',background:'#FFFFFF',color:'#191923',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:11,cursor:'pointer'}}>Annuler</button>
                    <button onClick={openCreateNewProduct} style={{flex:1,padding:'8px 12px',background:'var(--p)',color:'#FFFFFF',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:11,cursor:'pointer'}}>
                      + Créer un nouveau produit{searchTerm ? ' « ' + searchTerm + ' »' : ''}
                    </button>
                  </div>
                </div>
              )}

              {/* Création produit en cours */}
              {searchOpen && createProductMode && newProductDraft && (
                <div style={{background:'#FFFFFF',borderRadius:12,padding:14,marginBottom:12,border:'2px solid var(--p)',boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,color:'var(--p)',lineHeight:1}}>+ Nouveau produit</div>
                    <button onClick={cancelCreateProduct} disabled={savingProduct} style={{background:'none',border:'none',fontSize:18,cursor:'pointer',color:'#888'}}>✕</button>
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:10,opacity:.55,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Nom *</div>
                    <input value={(newProductDraft as any).name} onChange={function(e){var val = e.target.value;setNewProductDraft(function(p: any){return Object.assign({}, p, {name: val})})}} placeholder="Ex : Saumon fumé, Pain Rye…" autoFocus style={{width:'100%',padding:'8px 10px',fontSize:13,fontWeight:600,border:'2px solid #191923',borderRadius:8}} />
                  </div>
                  <div style={{marginBottom:8}}>
                    <div style={{fontSize:10,opacity:.55,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Fournisseur *</div>
                    <div style={{display:'flex',gap:4,marginBottom:6}}>
                      <button onClick={function(){setNewProductDraft(function(p: any){return Object.assign({}, p, {supplier_mode: 'existing'})})}} style={{flex:1,padding:'6px 10px',fontSize:11,border:'2px solid #191923',borderRadius:8,background:(newProductDraft as any).supplier_mode==='existing'?'var(--p)':'#FFFFFF',color:(newProductDraft as any).supplier_mode==='existing'?'#FFFFFF':'#191923',fontWeight:900,cursor:'pointer'}}>Existant</button>
                      <button onClick={function(){setNewProductDraft(function(p: any){return Object.assign({}, p, {supplier_mode: 'new'})})}} style={{flex:1,padding:'6px 10px',fontSize:11,border:'2px solid #191923',borderRadius:8,background:(newProductDraft as any).supplier_mode==='new'?'var(--p)':'#FFFFFF',color:(newProductDraft as any).supplier_mode==='new'?'#FFFFFF':'#191923',fontWeight:900,cursor:'pointer'}}>+ Nouveau</button>
                    </div>
                    {(newProductDraft as any).supplier_mode === 'existing' && (
                      <select value={(newProductDraft as any).supplier_id} onChange={function(e){var val = e.target.value;setNewProductDraft(function(p: any){return Object.assign({}, p, {supplier_id: val})})}} style={{width:'100%',padding:'8px 10px',fontSize:13,border:'2px solid #191923',borderRadius:8,background:'#FFFFFF',fontWeight:600}}>
                        <option value="">— Sélectionner —</option>
                        {suppliers.map(function(s: any) { return <option key={s.id} value={s.id}>{s.name}</option> })}
                      </select>
                    )}
                    {(newProductDraft as any).supplier_mode === 'new' && (
                      <input value={(newProductDraft as any).new_supplier_name} onChange={function(e){var val = e.target.value;setNewProductDraft(function(p: any){return Object.assign({}, p, {new_supplier_name: val})})}} placeholder="Nom (Norbert, Foodflow…)" style={{width:'100%',padding:'8px 10px',fontSize:13,fontWeight:600,border:'2px solid #191923',borderRadius:8}} />
                    )}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8,marginBottom:8}}>
                    <div>
                      <div style={{fontSize:10,opacity:.55,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Prix HT *</div>
                      <input type="number" step="0.01" value={(newProductDraft as any).current_price || ''} onChange={function(e){var val = parseFloat(e.target.value) || 0;setNewProductDraft(function(p: any){return Object.assign({}, p, {current_price: val})})}} placeholder="0.00" style={{width:'100%',padding:'8px 10px',fontSize:13,fontWeight:700,border:'2px solid #191923',borderRadius:8}} />
                    </div>
                    <div>
                      <div style={{fontSize:10,opacity:.55,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>par</div>
                      <select value={(newProductDraft as any).unit} onChange={function(e){var val = e.target.value;setNewProductDraft(function(p: any){return Object.assign({}, p, {unit: val})})}} style={{width:'100%',padding:'8px 10px',fontSize:13,border:'2px solid #191923',borderRadius:8,background:'#FFFFFF',fontWeight:600}}>
                        <option value="kg">kg</option><option value="L">L</option><option value="U">unité</option>
                      </select>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,justifyContent:'flex-end',marginTop:6}}>
                    <button onClick={cancelCreateProduct} disabled={savingProduct} style={{padding:'8px 12px',background:'#FFFFFF',color:'#191923',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:11,cursor:'pointer'}}>Annuler</button>
                    <button onClick={saveNewProduct} disabled={savingProduct} style={{padding:'8px 14px',background:'var(--y)',color:'#191923',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:11,cursor:'pointer'}}>{savingProduct ? '…' : '✓ Créer et ajouter'}</button>
                  </div>
                </div>
              )}

              {/* Liste des ingrédients ajoutés */}
              {ings.length === 0 && !searchOpen && (
                <div style={{padding:30,textAlign:'center',opacity:.5,fontSize:12,background:'#FAFAFA',borderRadius:12,border:'2px dashed #DDD',fontWeight:700}}>
                  Aucun ingrédient. Clique sur « + Ajouter » pour commencer.
                </div>
              )}
              {ings.map(function(ing: any, idx: number) {
                var isKg = ing.unit === 'kg'
                var isL = ing.unit === 'L'
                var displayQte = ing.qte
                var displayUnit = ing.unit
                if (isKg) { displayQte = ing.qte * 1000; displayUnit = 'g' }
                else if (isL) { displayQte = ing.qte * 1000; displayUnit = 'ml' }
                var cost = ing.prix_achat * ing.qte
                return (
                  <div key={idx} style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:12,padding:'10px 12px',marginBottom:8,boxShadow:'2px 2px 0 #191923'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:900}}>{ing.name}</div>
                        <div style={{fontSize:10,opacity:.55,fontWeight:700,marginTop:2}}>{ing.supplier} · {fmt(ing.prix_achat)}€/{ing.unit}</div>
                      </div>
                      <button onClick={function(){removeIng(idx)}} title="Retirer" style={{width:28,height:28,borderRadius:'50%',border:'2px solid var(--p)',background:'#FFFFFF',color:'var(--p)',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}>✕</button>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1}}>
                        <div style={{fontSize:9,opacity:.55,marginBottom:3,fontWeight:900,textTransform:'uppercase'}}>Quantité ({displayUnit})</div>
                        <input type="number" step={isKg||isL?'1':'0.01'} value={displayQte || ''} onChange={function(e){var raw = parseFloat(e.target.value)||0;var val = (isKg||isL) ? raw/1000 : raw;updateIngQte(idx, val)}} placeholder="0" style={{width:'100%',padding:'7px 9px',fontSize:14,fontWeight:700,border:'2px solid #191923',borderRadius:8}} />
                      </div>
                      <div style={{textAlign:'right',minWidth:80}}>
                        <div style={{fontSize:9,opacity:.55,fontWeight:900,textTransform:'uppercase'}}>Coût</div>
                        <div style={{fontSize:18,fontWeight:900,color:'#191923',lineHeight:1.1}}>{fmt(cost)}€</div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Total food cost en pied */}
              {ings.length > 0 && (
                <div style={{marginTop:12,padding:'12px 14px',background:'var(--y)',border:'2px solid #191923',borderRadius:12,boxShadow:'2px 2px 0 #191923',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5}}>Coût matières total</div>
                  <div style={{fontSize:22,fontWeight:900,lineHeight:1}}>{fmt(foodCost)}€</div>
                </div>
              )}
            </div>
          )}

          {/* ============= ÉTAPE 3 — Tarification ============= */}
          {step === 3 && (
            <div>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'var(--p)',lineHeight:1,marginBottom:6}}>Trouve le bon prix</div>
              <div style={{fontSize:11,fontWeight:700,opacity:.55,marginBottom:14}}>Coût matières : <strong style={{color:'#191923'}}>{fmt(foodCost)}€ HT</strong> · Joue avec le coefficient pour trouver le prix juste.</div>

              {/* Coefficient — barres de raccourci */}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,opacity:.55,marginBottom:6,textTransform:'uppercase',fontWeight:900,letterSpacing:.5}}>Coefficient cible</div>
                <div style={{display:'flex',gap:6,marginBottom:8}}>
                  {[3.5, 4, 4.5, 5, 5.5].map(function(c) {
                    var active = Math.abs(coeff - c) < 0.05
                    return (
                      <button key={c} onClick={function(){setCoeff(c)}} style={{flex:1,padding:'9px 6px',background:active?'var(--p)':'#FFFFFF',color:active?'#FFFFFF':'#191923',border:'2px solid #191923',borderRadius:10,fontWeight:900,fontSize:13,cursor:'pointer',boxShadow:active?'2px 2px 0 #191923':'none'}}>
                        ×{c}
                      </button>
                    )
                  })}
                </div>
                {/* Slider fin */}
                <input type="range" min="3" max="6" step="0.1" value={coeff} onChange={function(e){setCoeff(parseFloat(e.target.value))}} style={{width:'100%',accentColor:'#FF82D7'}} />
                <div style={{display:'flex',justifyContent:'space-between',fontSize:9,fontWeight:700,opacity:.5,marginTop:2}}>
                  <span>×3</span><span>×4 (mini)</span><span>×5</span><span>×6</span>
                </div>
              </div>

              {/* Résultats en temps réel — 4 tuiles */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:14}}>
                <div style={{background:'#FFFFFF',borderRadius:12,padding:'12px 14px',border:'2px solid #191923',boxShadow:'2px 2px 0 #191923'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{width:9,height:9,borderRadius:'50%',background:coeffColor,flexShrink:0}}></span>
                    <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Coefficient</div>
                  </div>
                  <div style={{fontSize:30,fontWeight:900,color:coeffColor,lineHeight:1,marginTop:4}}>×{coeff.toFixed(1)}</div>
                </div>
                <div style={{background:'#FFFFFF',borderRadius:12,padding:'12px 14px',border:'2px solid #191923',boxShadow:'2px 2px 0 #191923'}}>
                  <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Food cost</div>
                  <div style={{fontSize:24,fontWeight:900,lineHeight:1,marginTop:4}}>{fcPct.toFixed(1)}<span style={{fontSize:14}}>%</span></div>
                </div>
                <div style={{background:'var(--y)',borderRadius:12,padding:'12px 14px',border:'2px solid #191923',boxShadow:'2px 2px 0 #191923'}}>
                  <div style={{fontSize:9,fontWeight:900,opacity:.7,textTransform:'uppercase',letterSpacing:.5}}>Prix vente TTC</div>
                  <div style={{fontSize:24,fontWeight:900,lineHeight:1,marginTop:4}}>{fmt(prixTTC)}<span style={{fontSize:14}}>€</span></div>
                  <div style={{fontSize:9,opacity:.6,marginTop:2,fontWeight:700}}>HT {fmt(prixHT)}€</div>
                </div>
                <div style={{background:'#FFFFFF',borderRadius:12,padding:'12px 14px',border:'2px solid #191923',boxShadow:'2px 2px 0 #191923'}}>
                  <div style={{fontSize:9,fontWeight:900,opacity:.55,textTransform:'uppercase',letterSpacing:.5}}>Marge HT</div>
                  <div style={{fontSize:24,fontWeight:900,color:'#009D3A',lineHeight:1,marginTop:4}}>{fmt(margeHT)}<span style={{fontSize:14}}>€</span></div>
                  <div style={{fontSize:9,opacity:.55,marginTop:2,fontWeight:700}}>par unité</div>
                </div>
              </div>

              {/* Astuce */}
              <div style={{padding:'10px 12px',background:'#FAFAFA',borderRadius:10,border:'1.5px solid #EEE',fontSize:11,fontWeight:700,opacity:.7}}>
                💡 <strong>×4 minimum</strong> pour rester rentable, <strong>×4,5 équilibré</strong>, <strong>×5+ confortable</strong>. Tu pourras réajuster le prix après création.
              </div>
            </div>
          )}

          {/* ============= ÉTAPE 4 — Validation ============= */}
          {step === 4 && (
            <div>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:24,color:'var(--p)',lineHeight:1,marginBottom:14}}>Ton récapitulatif</div>

              {/* Carte aperçu */}
              <div style={{background:'#FFFFFF',borderRadius:14,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',overflow:'hidden',marginBottom:14}}>
                <div style={{height:90,background:'linear-gradient(135deg, var(--y) 0%, #FFF5C2 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:48,borderBottom:'2px solid #191923'}}>
                  {categoryEmoji(categorie)}
                </div>
                <div style={{padding:'12px 14px'}}>
                  <div style={{fontSize:16,fontWeight:900,marginBottom:2}}>{name || 'Sans nom'}</div>
                  <div style={{fontSize:10,opacity:.55,fontWeight:700,textTransform:'capitalize',marginBottom:10}}>{categoryEmoji(categorie)} {categorie.replace('_',' ')}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    <div>
                      <div style={{fontSize:9,opacity:.55,fontWeight:900,textTransform:'uppercase'}}>Food cost</div>
                      <div style={{fontSize:16,fontWeight:900,color:fcPct>25?'var(--p)':'#009D3A'}}>{fcPct.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{fontSize:9,opacity:.55,fontWeight:900,textTransform:'uppercase'}}>Coeff.</div>
                      <div style={{fontSize:16,fontWeight:900,color:coeffColor}}>×{coeff.toFixed(1)}</div>
                    </div>
                    <div>
                      <div style={{fontSize:9,opacity:.55,fontWeight:900,textTransform:'uppercase'}}>Marge</div>
                      <div style={{fontSize:16,fontWeight:900,color:'#009D3A'}}>{fmt(margeHT)}€</div>
                    </div>
                  </div>
                  <div style={{marginTop:10,padding:'8px 10px',background:'var(--y)',borderRadius:8,border:'1.5px solid #191923',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:10,fontWeight:900,textTransform:'uppercase'}}>Prix de vente TTC</span>
                    <span style={{fontSize:18,fontWeight:900}}>{fmt(prixTTC)}€</span>
                  </div>
                </div>
              </div>

              {/* Liste ingrédients récap */}
              <div style={{background:'#FFFFFF',borderRadius:12,border:'2px solid #191923',padding:'10px 14px',marginBottom:12}}>
                <div style={{fontSize:10,opacity:.55,fontWeight:900,textTransform:'uppercase',marginBottom:8}}>Composition ({ings.length} ingrédient{ings.length>1?'s':''})</div>
                {ings.map(function(ing: any, idx: number) {
                  var isKg = ing.unit === 'kg'
                  var isL = ing.unit === 'L'
                  var displayQte = ing.qte
                  var displayUnit = ing.unit
                  if (isKg) { displayQte = ing.qte * 1000; displayUnit = 'g' }
                  else if (isL) { displayQte = ing.qte * 1000; displayUnit = 'ml' }
                  return (
                    <div key={idx} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:idx<ings.length-1?'1px solid #F0F0F0':'none',fontSize:12}}>
                      <span style={{fontWeight:700}}>{ing.name}</span>
                      <span style={{fontWeight:900,opacity:.7}}>{displayQte} {displayUnit}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER NAV : précédent / suivant ou créer */}
        <div style={{padding:'14px 18px',borderTop:'2px solid #EBEBEB',display:'flex',justifyContent:'space-between',gap:8,background:'#FAFAFA'}}>
          <button onClick={function(){ if (step > 1) setStep(step - 1); else onClose() }} style={{padding:'10px 16px',background:'#FFFFFF',color:'#191923',border:'2px solid #191923',borderRadius:20,fontWeight:900,fontSize:12,cursor:'pointer'}}>
            {step > 1 ? '← Précédent' : 'Annuler'}
          </button>
          {step < 4 && (
            <button disabled={!canGoNext()} onClick={function(){if(canGoNext())setStep(step+1)}} style={{padding:'10px 20px',background:canGoNext()?'var(--p)':'#DDD',color:'#FFFFFF',border:'2px solid '+(canGoNext()?'#191923':'#BBB'),borderRadius:20,fontWeight:900,fontSize:12,cursor:canGoNext()?'pointer':'not-allowed',boxShadow:canGoNext()?'2px 2px 0 #191923':'none'}}>
              Suivant →
            </button>
          )}
          {step === 4 && (
            <button disabled={saving} onClick={createRecipeFinal} style={{padding:'10px 22px',background:'var(--y)',color:'#191923',border:'2px solid #191923',borderRadius:20,fontWeight:900,fontSize:13,cursor:saving?'default':'pointer',boxShadow:'2px 2px 0 #191923',opacity:saving?0.6:1}}>
              {saving ? '⏳ Création…' : '💾 Créer la recette'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
