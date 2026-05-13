// Fichier : src/app/dashboard/PreparationsMaisonTab.tsx
// Nouvel onglet — Préparations Maison (sauces, sous-recettes, accompagnements)

'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

function fmtPrice(v: any) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—'
  var n = Number(v)
  if (Math.abs(n) >= 0.10) return n.toFixed(2)
  if (Math.abs(n) >= 0.001) return n.toFixed(3)
  return n.toFixed(4)
}

export default function PreparationsMaisonTab() {
  var [preps, setPreps] = useState<any[]>([])
  var [ingredientsByRecipe, setIngredientsByRecipe] = useState<any>({})
  var [products, setProducts] = useState<any[]>([])
  var [loading, setLoading] = useState(true)
  var [filterCat, setFilterCat] = useState('all')
  var [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)
  var [editingIng, setEditingIng] = useState<string | null>(null)
  var [editQte, setEditQte] = useState('')
  var [editPrix, setEditPrix] = useState('')

  useEffect(function(){ loadAll() }, [])

  function loadAll() {
    setLoading(true)
    Promise.all([
      sb().from('recipes').select('*').in('categorie', ['sous_recette', 'sauce', 'accompagnement']).order('name'),
      sb().from('recipe_ingredients').select('*'),
      sb().from('products').select('id, name, current_price, unit')
    ]).then(function(results) {
      var recipes = results[0].data || []
      var allIngs = results[1].data || []
      var allProds = results[2].data || []
      
      var ingsMap: any = {}
      allIngs.forEach(function(ing: any) {
        if (!ingsMap[ing.recipe_id]) ingsMap[ing.recipe_id] = []
        ingsMap[ing.recipe_id].push(ing)
      })
      
      // Trier les ingrédients de chaque recette par cout décroissant
      Object.keys(ingsMap).forEach(function(k) {
        ingsMap[k].sort(function(a: any, b: any) { return Number(b.cout) - Number(a.cout) })
      })
      
      // Calculer le food_cost de chaque préparation
      recipes.forEach(function(r: any) {
        var ings = ingsMap[r.id] || []
        var total = ings.reduce(function(sum: number, i: any) { return sum + Number(i.cout || 0) }, 0)
        r._food_cost = Math.round(total * 10000) / 10000
        r._nb_ingredients = ings.length
      })
      
      setPreps(recipes)
      setIngredientsByRecipe(ingsMap)
      setProducts(allProds)
      setLoading(false)
    })
  }

  function getCategoryLabel(cat: string) {
    if (cat === 'sous_recette') return '🥫 Sauce/Sous-recette'
    if (cat === 'sauce') return '🥫 Sauce portion'
    if (cat === 'accompagnement') return '🥗 Accompagnement'
    return cat
  }

  function getCategoryColor(cat: string) {
    if (cat === 'sous_recette') return '#A06CD5'
    if (cat === 'sauce') return '#FF82D7'
    if (cat === 'accompagnement') return '#009D3A'
    return '#888'
  }

  function startEditIngredient(ing: any) {
    setEditingIng(ing.id)
    setEditQte(String(ing.qte))
    setEditPrix(String(ing.prix_achat))
  }

  function cancelEdit() {
    setEditingIng(null)
    setEditQte('')
    setEditPrix('')
  }

  function saveIngredient(ing: any) {
    var qte = Number(editQte)
    var prix = Number(editPrix)
    if (isNaN(qte) || isNaN(prix) || qte < 0 || prix < 0) {
      alert('Valeurs invalides')
      return
    }
    var cout = qte * prix
    sb().from('recipe_ingredients').update({
      qte: qte, prix_achat: prix, cout: cout
    }).eq('id', ing.id).then(function() {
      cancelEdit()
      loadAll()
    })
  }

  function deleteIngredient(ingId: string) {
    if (!confirm('Supprimer cet ingrédient ?')) return
    sb().from('recipe_ingredients').delete().eq('id', ingId).then(function() {
      loadAll()
    })
  }

  function fmtQte(q: any, u: string) {
    var n = Number(q)
    if (u === 'kg' && n < 1) return (n * 1000).toFixed(0) + ' g'
    if (u === 'L' && n < 1) return (n * 1000).toFixed(0) + ' ml'
    return n + ' ' + (u || '')
  }

  if (loading) {
    return <div style={{padding: 20, textAlign: 'center', color: '#888'}}>⏳ Chargement des préparations maison...</div>
  }

  var filteredPreps = filterCat === 'all' ? preps : preps.filter(function(p: any) { return p.categorie === filterCat })

  var totals = {
    nb: preps.length,
    sous_recette: preps.filter(function(p:any) { return p.categorie === 'sous_recette' }).length,
    sauce: preps.filter(function(p:any) { return p.categorie === 'sauce' }).length,
    accompagnement: preps.filter(function(p:any) { return p.categorie === 'accompagnement' }).length
  }

  return (
    <div style={{padding: 16}}>
      {/* Header */}
      <div style={{marginBottom: 16}}>
        <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 32, color: '#191923', lineHeight: 1}}>Préparations maison</div>
        <div style={{fontSize: 12, color: '#666', marginTop: 4}}>
          {totals.nb} préparations · {totals.sous_recette} sous-recettes · {totals.sauce} sauces portion · {totals.accompagnement} accompagnements
        </div>
      </div>

      {/* Filtres */}
      <div style={{display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap'}}>
        {[
          {key: 'all', label: 'Toutes (' + totals.nb + ')', color: '#191923'},
          {key: 'sous_recette', label: '🥫 Sous-recettes (' + totals.sous_recette + ')', color: '#A06CD5'},
          {key: 'sauce', label: '🥫 Sauces portion (' + totals.sauce + ')', color: '#FF82D7'},
          {key: 'accompagnement', label: '🥗 Accompagnements (' + totals.accompagnement + ')', color: '#009D3A'}
        ].map(function(opt) {
          var active = filterCat === opt.key
          return (
            <button key={opt.key} type="button" onClick={function(){ setFilterCat(opt.key) }} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 900,
              background: active ? opt.color : '#fff',
              color: active ? '#fff' : opt.color,
              border: '2px solid ' + opt.color,
              borderRadius: 999, cursor: 'pointer',
              fontFamily: 'Arial Narrow, Arial, sans-serif'
            }}>{opt.label}</button>
          )
        })}
      </div>

      {/* Liste préparations */}
      <div style={{display: 'grid', gap: 10}}>
        {filteredPreps.map(function(prep: any) {
          var ings = ingredientsByRecipe[prep.id] || []
          var expanded = expandedRecipe === prep.id
          var catColor = getCategoryColor(prep.categorie)
          
          return (
            <div key={prep.id} style={{
              background: '#fff', border: '2px solid #EBEBEB',
              borderRadius: 12, overflow: 'hidden'
            }}>
              {/* En-tête recette */}
              <div onClick={function(){ setExpandedRecipe(expanded ? null : prep.id) }} style={{
                padding: '12px 14px', cursor: 'pointer',
                display: 'grid', gridTemplateColumns: '1fr 130px 130px 60px',
                gap: 10, alignItems: 'center',
                background: expanded ? '#FAFAFA' : '#fff'
              }}>
                <div>
                  <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', lineHeight: 1}}>{prep.name}</div>
                  <div style={{fontSize: 10, color: catColor, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 3}}>
                    {getCategoryLabel(prep.categorie)} · {prep._nb_ingredients} ingrédients
                  </div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 900, letterSpacing: 0.5}}>Food cost</div>
                  <div style={{fontSize: 18, fontWeight: 900, color: '#191923', fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{fmtPrice(prep._food_cost)} €</div>
                </div>
                <div style={{textAlign: 'right'}}>
                  <div style={{fontSize: 9, color: '#888', textTransform: 'uppercase', fontWeight: 900, letterSpacing: 0.5}}>TVA</div>
                  <div style={{fontSize: 14, color: '#555', fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{prep.tva || 10}%</div>
                </div>
                <div style={{textAlign: 'center', fontSize: 14, color: '#888'}}>{expanded ? '▲' : '▼'}</div>
              </div>

              {/* Détail ingrédients (déplié) */}
              {expanded && (
                <div style={{padding: 14, background: '#FAFAFA', borderTop: '1px solid #EBEBEB'}}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 100px 100px 100px 100px 80px',
                    gap: 6, padding: '6px 8px', fontSize: 9, fontWeight: 900,
                    color: '#888', textTransform: 'uppercase', letterSpacing: 0.5,
                    borderBottom: '1px solid #EBEBEB', marginBottom: 4
                  }}>
                    <div>Ingrédient</div>
                    <div style={{textAlign: 'right'}}>Quantité</div>
                    <div style={{textAlign: 'right'}}>Unité</div>
                    <div style={{textAlign: 'right'}}>Prix achat</div>
                    <div style={{textAlign: 'right'}}>Coût</div>
                    <div style={{textAlign: 'right'}}>Actions</div>
                  </div>
                  {ings.map(function(ing: any) {
                    var isEditing = editingIng === ing.id
                    return (
                      <div key={ing.id} style={{
                        display: 'grid', gridTemplateColumns: '2fr 100px 100px 100px 100px 80px',
                        gap: 6, padding: '8px', marginTop: 3,
                        background: '#fff', borderRadius: 6, alignItems: 'center',
                        fontSize: 12, fontVariantNumeric: 'tabular-nums',
                        border: isEditing ? '2px solid #FFEB5A' : '1px solid #EBEBEB'
                      }}>
                        <div style={{fontWeight: 700, color: '#191923'}}>{ing.article}</div>
                        {isEditing ? (
                          <>
                            <input type="number" step="0.001" value={editQte} onChange={function(e:any){setEditQte(e.target.value)}} style={{width:'100%', padding:'4px 6px', textAlign:'right', border:'1px solid #DDD', borderRadius:4, fontSize:12, background:'#fff'}}/>
                            <div style={{textAlign: 'right', color: '#888', fontSize: 10}}>{ing.unite}</div>
                            <input type="number" step="0.001" value={editPrix} onChange={function(e:any){setEditPrix(e.target.value)}} style={{width:'100%', padding:'4px 6px', textAlign:'right', border:'1px solid #DDD', borderRadius:4, fontSize:12, background:'#fff'}}/>
                            <div style={{textAlign: 'right', color: '#191923', fontWeight: 900}}>{fmtPrice(Number(editQte) * Number(editPrix))} €</div>
                            <div style={{display: 'flex', gap: 4, justifyContent: 'flex-end'}}>
                              <button type="button" onClick={function(){saveIngredient(ing)}} style={{padding:'2px 8px', background:'#009D3A', color:'#fff', border:'none', borderRadius:4, fontSize:11, fontWeight:900, cursor:'pointer'}}>✓</button>
                              <button type="button" onClick={cancelEdit} style={{padding:'2px 8px', background:'#888', color:'#fff', border:'none', borderRadius:4, fontSize:11, fontWeight:900, cursor:'pointer'}}>✕</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{textAlign: 'right', color: '#555'}}>{fmtQte(ing.qte, ing.unite)}</div>
                            <div style={{textAlign: 'right', color: '#888', fontSize: 10}}>{ing.unite}</div>
                            <div style={{textAlign: 'right', color: '#555'}}>{fmtPrice(ing.prix_achat)} €/{ing.unite}</div>
                            <div style={{textAlign: 'right', color: '#191923', fontWeight: 900}}>{fmtPrice(ing.cout)} €</div>
                            <div style={{display: 'flex', gap: 4, justifyContent: 'flex-end'}}>
                              <button type="button" onClick={function(){startEditIngredient(ing)}} style={{padding:'2px 6px', background:'#FFEB5A', color:'#191923', border:'none', borderRadius:4, fontSize:10, cursor:'pointer'}}>✏️</button>
                              <button type="button" onClick={function(){deleteIngredient(ing.id)}} style={{padding:'2px 6px', background:'#FFE0E0', color:'#CC0066', border:'none', borderRadius:4, fontSize:10, cursor:'pointer'}}>🗑</button>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                  {/* Total */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 100px 100px 100px 100px 80px',
                    gap: 6, padding: '8px', marginTop: 6,
                    background: '#FFFBE5', borderRadius: 6, alignItems: 'center',
                    border: '2px solid #FFEB5A'
                  }}>
                    <div style={{fontWeight: 900, color: '#191923'}}>TOTAL FOOD COST</div>
                    <div></div><div></div><div></div>
                    <div style={{textAlign: 'right', color: '#191923', fontWeight: 900, fontSize: 14, fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{fmtPrice(prep._food_cost)} €</div>
                    <div></div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredPreps.length === 0 && (
        <div style={{padding: 30, textAlign: 'center', color: '#888', background: '#FAFAFA', borderRadius: 12}}>
          Aucune préparation dans cette catégorie
        </div>
      )}
    </div>
  )
}
