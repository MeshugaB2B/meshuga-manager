'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// FoodCostAlertWidget v2 — alertes recettes en dérive de coût
// SOURCE : vue v_recipe_real_food_cost (compare dernier prix vs moyenne 3 derniers)
// CLIC sur une ligne → modal historique du produit le plus impactant
// =============================================================================

export default function FoodCostAlertWidget(props) {
  var [alerts, setAlerts] = useState([])
  var [preparations, setPreparations] = useState([])
  var [stats, setStats] = useState({critique: 0, alerte: 0, surveillance: 0, baisse: 0, stable: 0})
  var [expanded, setExpanded] = useState(false)
  var [tabView, setTabView] = useState('alertes') // 'alertes' ou 'preparations'
  var [loading, setLoading] = useState(true)
  var [modalRecipe, setModalRecipe] = useState(null)
  var [modalIngredients, setModalIngredients] = useState([])
  var [modalProductHistory, setModalProductHistory] = useState(null)
  var threshold = props.threshold || 5

  useEffect(function(){
    loadAlerts()
  }, [])

  function loadAlerts() {
    setLoading(true)
    var c = sb()
    c.from('v_recipe_real_food_cost')
      .select('*')
      .gt('nb_ingredients', 0)
      .not('ecart_pct', 'is', null)
      .order('ecart_pct', { ascending: false })
      .then(function(res){
        var data = res.data || []
        // Séparer les recettes principales des préparations maison
        var prepCategories = ['sous_recette', 'sauce', 'accompagnement']
        var preps = data.filter(function(r){ return prepCategories.indexOf(r.categorie) !== -1 })
        var mains = data.filter(function(r){ return prepCategories.indexOf(r.categorie) === -1 })
        
        var s = {critique: 0, alerte: 0, surveillance: 0, baisse: 0, stable: 0}
        mains.forEach(function(r){
          var p = Number(r.ecart_pct)
          if (p > 15) s.critique++
          else if (p > 8) s.alerte++
          else if (p > 3) s.surveillance++
          else if (p < -5) s.baisse++
          else s.stable++
        })
        setStats(s)
        var filtered = mains.filter(function(r){ return Math.abs(Number(r.ecart_pct)) >= threshold })
        setAlerts(filtered)
        setPreparations(preps)
        setLoading(false)
      })
  }

  function openRecipeDetail(recipe) {
    setModalRecipe(recipe)
    setModalProductHistory(null)
    var c = sb()
    // Charger les ingrédients de la recette avec leurs prix actuels
    c.from('recipe_ingredients')
      .select('id, article, product_id, qte, unite, prix_achat, cout')
      .eq('recipe_id', recipe.recipe_id)
      .then(function(res){
        setModalIngredients(res.data || [])
      })
  }

  function openProductHistory(productId, productName) {
    var c = sb()
    Promise.all([
      c.from('v_product_price_history').select('*').eq('product_id', productId).single(),
      c.from('product_prices').select('*').eq('product_id', productId).order('invoice_date', { ascending: false }).limit(20)
    ]).then(function(results){
      var stats = results[0].data || {product_name: productName}
      var history = results[1].data || []
      setModalProductHistory({stats: stats, history: history})
    })
  }

  function closeModal() {
    setModalRecipe(null)
    setModalIngredients([])
    setModalProductHistory(null)
  }

  function fmtEur(v, dec) {
    if (v === null || v === undefined) return '—'
    return Number(v).toFixed(dec || 2) + ' €'
  }

  function fmtPct(v) {
    if (v === null || v === undefined) return '—'
    var n = Number(v)
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
  }

  function fmtDate(s) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function getLevel(pct) {
    var p = Number(pct)
    if (p > 15) return { label: 'CRITIQUE', color: '#CC0066', bg: '#FFE8EF', icon: '🔴' }
    if (p > 8) return { label: 'ALERTE', color: '#BA7517', bg: '#FFF3E0', icon: '🟡' }
    if (p > 3) return { label: 'SURVEILLER', color: '#A06CD5', bg: '#F5EBFF', icon: '🟠' }
    if (p < -5) return { label: 'BAISSE', color: '#009D3A', bg: '#E0F5E0', icon: '🟢' }
    return { label: 'STABLE', color: '#555', bg: '#F5F5F5', icon: '⚪' }
  }

  if (loading) {
    return (
      <div style={{padding: 14, background: '#fff', borderRadius: 12, border: '2px solid #EBEBEB', textAlign: 'center', fontSize: 12, color: '#888'}}>
        ⏳ Calcul food cost...
      </div>
    )
  }

  var totalAlerts = stats.critique + stats.alerte
  var hasAlerts = alerts.length > 0

  return (
    <>
      <div style={{background: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid ' + (totalAlerts > 0 ? '#FF82D7' : '#EBEBEB')}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{fontFamily: "'Yellowtail', cursive", fontSize: 20, color: '#191923'}}>🍔 Food cost — alertes</span>
            {totalAlerts > 0 && (
              <span style={{
                background: '#FF82D7', color: '#fff', borderRadius: 999,
                padding: '2px 8px', fontSize: 11, fontWeight: 900,
                fontFamily: 'Arial Narrow, Arial, sans-serif'
              }}>{totalAlerts}</span>
            )}
            <span style={{fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 900}}>
              Vs moyenne historique
            </span>
          </div>
          <button type="button" onClick={function(){ setExpanded(!expanded) }} style={{
            padding: '4px 10px', fontSize: 11, fontWeight: 900,
            background: '#FFEB5A', color: '#191923', border: '1px solid #DDD',
            borderRadius: 6, cursor: 'pointer'
          }}>{expanded ? '▲ Réduire' : '▼ Détails'}</button>
        </div>

        {/* Onglets : Alertes vs Préparations maison */}
        {expanded && (
          <div style={{display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #EBEBEB'}}>
            <button type="button" onClick={function(){ setTabView('alertes') }} style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 900,
              background: tabView === 'alertes' ? '#FF82D7' : 'transparent',
              color: tabView === 'alertes' ? '#fff' : '#191923',
              border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer'
            }}>🍔 Recettes ({alerts.length})</button>
            <button type="button" onClick={function(){ setTabView('preparations') }} style={{
              padding: '6px 12px', fontSize: 11, fontWeight: 900,
              background: tabView === 'preparations' ? '#FF82D7' : 'transparent',
              color: tabView === 'preparations' ? '#fff' : '#191923',
              border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer'
            }}>🧪 Préparations Maison ({preparations.length})</button>
          </div>
        )}

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, marginBottom: hasAlerts && expanded ? 10 : 0}}>
          {stats.critique > 0 && (
            <div style={{background: '#FFE8EF', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
              <div style={{fontSize: 9, fontWeight: 900, color: '#CC0066', textTransform: 'uppercase', letterSpacing: 0.5}}>🔴 Critique</div>
              <div style={{fontSize: 18, fontWeight: 900, color: '#CC0066', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.critique}</div>
              <div style={{fontSize: 9, color: '#CC0066'}}>{'>'}15%</div>
            </div>
          )}
          {stats.alerte > 0 && (
            <div style={{background: '#FFF3E0', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
              <div style={{fontSize: 9, fontWeight: 900, color: '#BA7517', textTransform: 'uppercase', letterSpacing: 0.5}}>🟡 Alerte</div>
              <div style={{fontSize: 18, fontWeight: 900, color: '#BA7517', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.alerte}</div>
              <div style={{fontSize: 9, color: '#BA7517'}}>8-15%</div>
            </div>
          )}
          {stats.surveillance > 0 && (
            <div style={{background: '#F5EBFF', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
              <div style={{fontSize: 9, fontWeight: 900, color: '#A06CD5', textTransform: 'uppercase', letterSpacing: 0.5}}>🟠 Surveille</div>
              <div style={{fontSize: 18, fontWeight: 900, color: '#A06CD5', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.surveillance}</div>
              <div style={{fontSize: 9, color: '#A06CD5'}}>3-8%</div>
            </div>
          )}
          <div style={{background: '#F5F5F5', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
            <div style={{fontSize: 9, fontWeight: 900, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5}}>⚪ Stable</div>
            <div style={{fontSize: 18, fontWeight: 900, color: '#555', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.stable}</div>
            <div style={{fontSize: 9, color: '#555'}}>±3%</div>
          </div>
          {stats.baisse > 0 && (
            <div style={{background: '#E0F5E0', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
              <div style={{fontSize: 9, fontWeight: 900, color: '#009D3A', textTransform: 'uppercase', letterSpacing: 0.5}}>🟢 Baisse</div>
              <div style={{fontSize: 18, fontWeight: 900, color: '#009D3A', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.baisse}</div>
              <div style={{fontSize: 9, color: '#009D3A'}}>{'<'}-5%</div>
            </div>
          )}
        </div>

        {!expanded && hasAlerts && (
          <div style={{
            marginTop: 8, padding: '8px 10px', background: '#FFFBE5',
            borderLeft: '3px solid #FFEB5A', borderRadius: '0 6px 6px 0',
            fontSize: 12, color: '#191923', lineHeight: 1.5
          }}>
            <b>📌 Top 3 :</b>
            {alerts.slice(0, 3).map(function(r, idx){
              return (
                <span key={r.recipe_id} style={{marginLeft: 6}}>
                  {idx > 0 ? ' · ' : ' '}
                  <b>{r.recipe_name}</b> ({fmtPct(r.ecart_pct)})
                </span>
              )
            })}
          </div>
        )}

        {!hasAlerts && !expanded && (
          <div style={{
            marginTop: 8, padding: '8px 10px', background: '#E0F5E0',
            borderRadius: 6, fontSize: 12, color: '#1a6b1a', textAlign: 'center'
          }}>
            ✅ Aucune recette en dérive {'>'}{threshold}%
          </div>
        )}

        {expanded && tabView === 'alertes' && hasAlerts && (
          <div style={{marginTop: 8}}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 90px',
              gap: 6, padding: '6px 8px', fontSize: 9, fontWeight: 900,
              textTransform: 'uppercase', color: '#888', letterSpacing: 0.5,
              borderBottom: '1px solid #EBEBEB'
            }}>
              <div>Recette (clic pour détails)</div>
              <div style={{textAlign: 'right'}}>Actuel</div>
              <div style={{textAlign: 'right'}}>Moyenne</div>
              <div style={{textAlign: 'right'}}>Écart</div>
              <div style={{textAlign: 'right'}}>Niveau</div>
            </div>
            {alerts.map(function(r){
              var meta = getLevel(r.ecart_pct)
              return (
                <div key={r.recipe_id} onClick={function(){ openRecipeDetail(r) }} style={{
                  display: 'grid', gridTemplateColumns: '1fr 90px 90px 80px 90px',
                  gap: 6, padding: '8px', marginTop: 3, background: meta.bg,
                  borderRadius: 6, alignItems: 'center', fontSize: 11,
                  fontVariantNumeric: 'tabular-nums', cursor: 'pointer'
                }}>
                  <div style={{fontWeight: 900, color: '#191923'}}>🔍 {r.recipe_name}</div>
                  <div style={{textAlign: 'right', color: '#191923', fontWeight: 900}}>{fmtEur(r.food_cost_actuel, 3)}</div>
                  <div style={{textAlign: 'right', color: '#555'}}>{fmtEur(r.food_cost_moyenne, 3)}</div>
                  <div style={{textAlign: 'right', fontWeight: 900, color: meta.color}}>{fmtPct(r.ecart_pct)}</div>
                  <div style={{textAlign: 'right'}}>
                    <span style={{fontSize: 9, fontWeight: 900, color: meta.color, background: '#fff', padding: '2px 6px', borderRadius: 4}}>{meta.label}</span>
                  </div>
                </div>
              )
            })}
            <div style={{
              marginTop: 8, padding: '8px 10px', background: '#FFFBE5',
              borderLeft: '3px solid #FFEB5A', borderRadius: '0 6px 6px 0',
              fontSize: 11, color: '#555', lineHeight: 1.5
            }}>
              <b>📌 Méthode :</b> &quot;Actuel&quot; = dernier prix facturé. &quot;Moyenne&quot; = moyenne des 3 prix précédents. Écart positif = ton coût a augmenté → marge en baisse. Clique sur une recette pour voir les ingrédients et leur historique de prix.
            </div>
          </div>
        )}

        {/* Onglet Préparations Maison */}
        {expanded && tabView === 'preparations' && preparations.length > 0 && (
          <div style={{marginTop: 8}}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px 80px',
              gap: 6, padding: '6px 8px', fontSize: 9, fontWeight: 900,
              textTransform: 'uppercase', color: '#888', letterSpacing: 0.5,
              borderBottom: '1px solid #EBEBEB'
            }}>
              <div>Préparation (clic pour détails)</div>
              <div style={{textAlign: 'right'}}>Catégorie</div>
              <div style={{textAlign: 'right'}}>Food cost</div>
              <div style={{textAlign: 'right'}}>Moyenne</div>
              <div style={{textAlign: 'right'}}>Écart</div>
            </div>
            {preparations.map(function(r){
              var meta = getLevel(r.ecart_pct)
              var catLabel = r.categorie === 'sous_recette' ? '🥫 Sauce' : (r.categorie === 'sauce' ? '🥫 Sauce' : '🥗 Accompagnement')
              return (
                <div key={r.recipe_id} onClick={function(){ openRecipeDetail(r) }} style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 90px 90px 80px',
                  gap: 6, padding: '8px', marginTop: 3, background: '#fafaff',
                  borderRadius: 6, alignItems: 'center', fontSize: 11,
                  fontVariantNumeric: 'tabular-nums', cursor: 'pointer',
                  border: '1px solid #EBEBEB'
                }}>
                  <div style={{fontWeight: 900, color: '#191923'}}>🔍 {r.recipe_name}</div>
                  <div style={{textAlign: 'right', fontSize: 10, color: '#666'}}>{catLabel}</div>
                  <div style={{textAlign: 'right', color: '#191923', fontWeight: 900}}>{fmtEur(r.food_cost_actuel, 3)}</div>
                  <div style={{textAlign: 'right', color: '#555'}}>{fmtEur(r.food_cost_moyenne, 3)}</div>
                  <div style={{textAlign: 'right', fontWeight: 900, color: meta.color}}>{fmtPct(r.ecart_pct)}</div>
                </div>
              )
            })}
            <div style={{
              marginTop: 8, padding: '8px 10px', background: '#F5EBFF',
              borderLeft: '3px solid #A06CD5', borderRadius: '0 6px 6px 0',
              fontSize: 11, color: '#555', lineHeight: 1.5
            }}>
              <b>📌 Préparations maison :</b> sauces, accompagnements et sous-recettes faites à Meshuga. Le food cost est calculé à partir des prix réels actualisés des ingrédients. Clique pour voir la composition détaillée.
            </div>
          </div>
        )}

        {expanded && tabView === 'preparations' && preparations.length === 0 && (
          <div style={{
            marginTop: 8, padding: '12px 16px', background: '#F5EBFF',
            borderRadius: 8, fontSize: 12, color: '#555', textAlign: 'center'
          }}>
            Aucune préparation maison enregistrée pour l&apos;instant.
          </div>
        )}
      </div>

      {/* MODAL DÉTAIL RECETTE */}
      {modalRecipe && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={closeModal}>
          <div style={{
            background: '#fff', borderRadius: 14, maxWidth: 900, width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: 18
          }} onClick={function(e){ e.stopPropagation() }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
              <div>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 28, color: '#191923', lineHeight: 1}}>{modalRecipe.recipe_name}</div>
                <div style={{fontSize: 12, color: '#555', marginTop: 4}}>
                  Food cost actuel : <b>{fmtEur(modalRecipe.food_cost_actuel, 3)}</b> ·
                  Moyenne : <b>{fmtEur(modalRecipe.food_cost_moyenne, 3)}</b> ·
                  Écart : <b style={{color: Number(modalRecipe.ecart_pct) > 0 ? '#CC0066' : '#009D3A'}}>{fmtPct(modalRecipe.ecart_pct)}</b>
                </div>
              </div>
              <button type="button" onClick={closeModal} style={{
                width: 32, height: 32, border: 'none', background: '#EBEBEB', color: '#191923',
                borderRadius: 16, fontSize: 18, cursor: 'pointer'
              }}>×</button>
            </div>

            {!modalProductHistory && (
              <>
                <div style={{fontSize: 12, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6}}>
                  INGRÉDIENTS (clic pour historique prix)
                </div>
                {modalIngredients.map(function(ing){
                  return (
                    <div key={ing.id} onClick={function(){ if (ing.product_id) openProductHistory(ing.product_id, ing.article) }} style={{
                      display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px',
                      gap: 6, padding: '8px 10px', marginTop: 4,
                      background: '#fafafa', borderRadius: 6, alignItems: 'center',
                      fontSize: 12, cursor: ing.product_id ? 'pointer' : 'default',
                      border: '1px solid #EBEBEB'
                    }}>
                      <div style={{fontWeight: 900, color: '#191923'}}>
                        {ing.product_id ? '🔍 ' : ''}{ing.article}
                      </div>
                      <div style={{textAlign: 'right', color: '#555'}}>{ing.qte} {ing.unite}</div>
                      <div style={{textAlign: 'right', color: '#555'}}>{fmtEur(ing.prix_achat, 3)}/{ing.unite}</div>
                      <div style={{textAlign: 'right', color: '#191923', fontWeight: 900}}>{fmtEur(ing.cout, 3)}</div>
                    </div>
                  )
                })}
              </>
            )}

            {modalProductHistory && (
              <div>
                <button type="button" onClick={function(){ setModalProductHistory(null) }} style={{
                  padding: '6px 12px', background: '#FFEB5A', color: '#191923',
                  border: '1px solid #DDD', borderRadius: 6, fontSize: 11, fontWeight: 900,
                  cursor: 'pointer', marginBottom: 12
                }}>← Retour aux ingrédients</button>

                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', marginBottom: 4}}>
                  {modalProductHistory.stats.product_name}
                </div>
                <div style={{fontSize: 11, color: '#888', marginBottom: 14}}>
                  {modalProductHistory.stats.supplier_name} · {modalProductHistory.stats.nb_prix} prix enregistrés
                </div>

                {/* 4 blocs stats */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 16}}>
                  <div style={{background: '#E0F5E0', padding: 10, borderRadius: 8, textAlign: 'center'}}>
                    <div style={{fontSize: 9, color: '#009D3A', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5}}>📉 Plus bas</div>
                    <div style={{fontSize: 22, fontWeight: 900, color: '#009D3A', fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{fmtEur(modalProductHistory.stats.prix_min, 3)}</div>
                    <div style={{fontSize: 10, color: '#1a6b1a'}}>{fmtDate(modalProductHistory.stats.prix_min_date)}</div>
                  </div>
                  <div style={{background: '#FFE8EF', padding: 10, borderRadius: 8, textAlign: 'center'}}>
                    <div style={{fontSize: 9, color: '#CC0066', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5}}>📈 Plus haut</div>
                    <div style={{fontSize: 22, fontWeight: 900, color: '#CC0066', fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{fmtEur(modalProductHistory.stats.prix_max, 3)}</div>
                    <div style={{fontSize: 10, color: '#CC0066'}}>{fmtDate(modalProductHistory.stats.prix_max_date)}</div>
                  </div>
                  <div style={{background: '#F5F5F5', padding: 10, borderRadius: 8, textAlign: 'center'}}>
                    <div style={{fontSize: 9, color: '#555', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5}}>📊 Prix moyen</div>
                    <div style={{fontSize: 22, fontWeight: 900, color: '#191923', fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{fmtEur(modalProductHistory.stats.prix_moyen, 3)}</div>
                    <div style={{fontSize: 10, color: '#555'}}>tous prix confondus</div>
                  </div>
                  <div style={{background: '#FFFBE5', padding: 10, borderRadius: 8, textAlign: 'center', border: '2px solid #FFEB5A'}}>
                    <div style={{fontSize: 9, color: '#B89200', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5}}>🆕 Dernier prix</div>
                    <div style={{fontSize: 22, fontWeight: 900, color: '#191923', fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{fmtEur(modalProductHistory.stats.dernier_prix, 3)}</div>
                    <div style={{fontSize: 10, color: '#555'}}>{fmtDate(modalProductHistory.stats.dernier_prix_date)}</div>
                    {modalProductHistory.stats.prix_moyen > 0 && (() => {
                      var ecart = Number(modalProductHistory.stats.dernier_prix) - Number(modalProductHistory.stats.prix_moyen)
                      var pct = (ecart / Number(modalProductHistory.stats.prix_moyen)) * 100
                      var col = pct > 5 ? '#CC0066' : (pct < -5 ? '#009D3A' : '#555')
                      return (
                        <div style={{fontSize: 11, color: col, marginTop: 4, fontWeight: 900}}>
                          {(ecart > 0 ? '+' : '') + ecart.toFixed(3)} € ({(pct > 0 ? '+' : '') + pct.toFixed(1)}%)
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Tableau historique */}
                <div style={{fontSize: 12, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6}}>
                  HISTORIQUE COMPLET ({modalProductHistory.history.length} dernières factures)
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '90px 90px 1fr 80px 80px',
                  gap: 6, padding: '6px 8px', fontSize: 9, fontWeight: 900,
                  textTransform: 'uppercase', color: '#888', letterSpacing: 0.5,
                  borderBottom: '1px solid #EBEBEB'
                }}>
                  <div>Date</div>
                  <div>Pack</div>
                  <div>Article</div>
                  <div style={{textAlign: 'right'}}>Pack €</div>
                  <div style={{textAlign: 'right'}}>Unitaire</div>
                </div>
                {modalProductHistory.history.map(function(h){
                  var color = '#191923'
                  if (modalProductHistory.stats.prix_moyen > 0) {
                    var diff = (Number(h.master_unit_price) - Number(modalProductHistory.stats.prix_moyen)) / Number(modalProductHistory.stats.prix_moyen) * 100
                    if (diff > 10) color = '#CC0066'
                    else if (diff < -10) color = '#009D3A'
                  }
                  return (
                    <div key={h.id} style={{
                      display: 'grid', gridTemplateColumns: '90px 90px 1fr 80px 80px',
                      gap: 6, padding: '6px 8px', marginTop: 2,
                      background: '#fafafa', borderRadius: 4, fontSize: 11,
                      fontVariantNumeric: 'tabular-nums', alignItems: 'center'
                    }}>
                      <div style={{color: '#555'}}>{fmtDate(h.invoice_date)}</div>
                      <div style={{fontSize: 10, color: '#888'}}>{h.pack_label || '—'}</div>
                      <div style={{fontSize: 10, color: '#666'}}>{h.article_original || '—'}</div>
                      <div style={{textAlign: 'right', color: '#555'}}>{fmtEur(h.pack_price, 2)}</div>
                      <div style={{textAlign: 'right', fontWeight: 900, color: color}}>{fmtEur(h.master_unit_price, 3)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
