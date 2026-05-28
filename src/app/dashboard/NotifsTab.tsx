'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

function fmtPrice(n) {
  var v = Number(n || 0)
  if (v < 1) return v.toFixed(3).replace(/\.?0+$/, '')
  return v.toFixed(2)
}

function fmtDate(s) {
  if (!s) return ''
  var d = new Date(s)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

// =============================================================================
// NotifsTab — Notifications réelles basées sur l'historique des achats
//
// PRINCIPE CRITIQUE : les hausses/baisses sont calculées UNIQUEMENT à partir
// de product_prices chronologique d'un même product_id. On ne compare JAMAIS
// recipe_ingredients.prix_achat avec products.current_price (logique précédente
// qui montrait des fausses hausses dues aux changements de fournisseur).
//
// Une "hausse" = j'ai payé plus cher chez le MÊME fournisseur que la fois d'avant.
// =============================================================================
export default function NotifsTab(props) {
  var toast = props.toast || function(){}
  var fcSeuil = Number(props.fcSeuil || 30) // seuil food cost % depuis DashboardContent
  var pushEnabled = !!props.pushEnabled
  var pushLoading = !!props.pushLoading
  var registerPush = props.registerPush || function(){}
  var unregisterPush = props.unregisterPush || function(){}

  var [loading, setLoading] = useState(true)
  var [variations, setVariations] = useState([])  // hausses + baisses fusionnées
  var [recipesHigh, setRecipesHigh] = useState([])
  var [recipeIngs, setRecipeIngs] = useState([])
  var [recipes, setRecipes] = useState([])
  var [thresholdPct, setThresholdPct] = useState(5)

  useEffect(function(){ loadData() }, [thresholdPct])

  function loadData() {
    setLoading(true)
    Promise.all([
      // Tous les product_prices, joinés avec product + supplier
      sb().from('product_prices').select('id, product_id, master_unit_price, pack_label, invoice_date, invoice_filename, invoice_path').order('invoice_date', { ascending: false }),
      sb().from('products').select('id, name, supplier_id, article_id, current_price, unit, category'),
      sb().from('suppliers').select('id, name'),
      sb().from('recipes').select('id, name, parent_slug, variant_key, variant_label, food_cost_pct, prix_vente_ttc, is_active').eq('is_active', true),
      sb().from('recipe_ingredients').select('recipe_id, product_id'),
      sb().from('articles').select('id, name')
    ]).then(function(res){
      var pp = res[0].data || []
      var prods = res[1].data || []
      var sups = res[2].data || []
      var recs = res[3].data || []
      var ris = res[4].data || []
      var arts = res[5].data || []

      // Index supplier par id, article par id, product par id
      var supById = {}
      sups.forEach(function(s){ supById[s.id] = s })
      var artById = {}
      arts.forEach(function(a){ artById[a.id] = a })
      var prodById = {}
      prods.forEach(function(p){ prodById[p.id] = p })

      // Grouper product_prices par CLÉ DE COMPARAISON :
      // - article_id si disponible (= comparer entre fournisseurs du même ingrédient)
      // - sinon product_id (fallback pour les products sans article_id)
      var pricesByKey = {}
      pp.forEach(function(p){
        if (Number(p.master_unit_price || 0) <= 0) return
        var prod = prodById[p.product_id]
        if (!prod) return
        var key = prod.article_id ? 'a:' + prod.article_id : 'p:' + p.product_id
        if (!pricesByKey[key]) pricesByKey[key] = []
        pricesByKey[key].push(p)
      })

      // Calculer les variations : pour chaque clé, comparer le dernier prix avec le précédent
      var allVariations = []
      Object.keys(pricesByKey).forEach(function(key){
        var hist = pricesByKey[key]
        if (hist.length < 2) return
        var curr = hist[0]
        var prev = hist[1]
        var currP = Number(curr.master_unit_price)
        var prevP = Number(prev.master_unit_price)
        if (prevP <= 0) return
        var pct = ((currP - prevP) / prevP) * 100
        if (Math.abs(pct) < thresholdPct) return

        var currProd = prodById[curr.product_id]
        var prevProd = prodById[prev.product_id]
        if (!currProd) return
        var currSup = supById[currProd.supplier_id]
        var prevSup = prevProd ? supById[prevProd.supplier_id] : null

        // Détecter changement de fournisseur
        var supplierChanged = currProd.supplier_id !== (prevProd ? prevProd.supplier_id : null)
        var article = currProd.article_id ? artById[currProd.article_id] : null

        // Vérifier que les unités sont compatibles (sinon comparaison hasardeuse)
        if (prevProd && currProd.unit !== prevProd.unit) return

        // Recettes utilisatrices (tous les products du même article)
        var usingRecipeIds = {}
        var productIdsForArticle = currProd.article_id
          ? prods.filter(function(p){ return p.article_id === currProd.article_id }).map(function(p){ return p.id })
          : [currProd.id]
        ris.forEach(function(r){
          if (productIdsForArticle.indexOf(r.product_id) >= 0) usingRecipeIds[r.recipe_id] = 1
        })
        var usingRecipes = recs.filter(function(r){ return usingRecipeIds[r.id] }).map(function(r){
          return { id: r.id, name: r.name, food_cost_pct: r.food_cost_pct }
        })

        allVariations.push({
          comparison_key: key,
          product_id: curr.product_id,
          product_name: currProd.name,
          article_name: article ? article.name : currProd.name,
          supplier: currSup ? currSup.name : '—',
          prev_supplier: prevSup ? prevSup.name : (currSup ? currSup.name : '—'),
          supplier_changed: supplierChanged,
          unit: currProd.unit,
          pack_label: curr.pack_label,
          prev_pack_label: prev.pack_label,
          new_price: currP,
          old_price: prevP,
          new_date: curr.invoice_date,
          old_date: prev.invoice_date,
          pct: pct,
          invoice_path: curr.invoice_path,
          using_recipes: usingRecipes
        })
      })

      // Tri par |pct| décroissant
      allVariations.sort(function(a,b){ return Math.abs(b.pct) - Math.abs(a.pct) })

      // Recettes au-dessus du seuil food cost
      var highFC = recs.filter(function(r){
        return Number(r.food_cost_pct || 0) > fcSeuil
      }).sort(function(a,b){ return Number(b.food_cost_pct||0) - Number(a.food_cost_pct||0) })

      setVariations(allVariations)
      setRecipesHigh(highFC)
      setRecipeIngs(ris)
      setRecipes(recs)
      setLoading(false)
    })
  }

  function openInvoice(invoicePath) {
    if (!invoicePath) return
    sb().storage.from('supplier-invoices').createSignedUrl(invoicePath, 3600).then(function(res){
      if (res.data && res.data.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
      } else {
        toast('Facture non disponible')
      }
    })
  }

  if (loading) return <div style={{padding:40,textAlign:'center',opacity:0.5,fontFamily:'Yellowtail',fontSize:18}}>Chargement…</div>

  var hausses = variations.filter(function(v){ return v.pct > 0 })
  var baisses = variations.filter(function(v){ return v.pct < 0 })

  return (
    <div>
      {/* ENCART PUSH — activation notifications visible et accessible (desktop + iPhone) */}
      <div style={{
        background: pushEnabled ? '#E6F7E9' : '#FFFFFF',
        border: '3px solid ' + (pushEnabled ? '#009D3A' : '#FF82D7'),
        borderRadius: 8, padding: '14px 16px', marginBottom: 14,
        boxShadow: '4px 4px 0 #191923',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap'
      }}>
        <span style={{fontSize: 32, lineHeight: 1}}>{pushEnabled ? '🔔' : '🔕'}</span>
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontWeight: 900, fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5, color: pushEnabled ? '#009D3A' : '#FF82D7'}}>
            {pushEnabled ? 'Notifications activées' : 'Notifications désactivées'}
          </div>
          <div style={{fontSize: 12, opacity: 0.7, marginTop: 3, fontWeight: 700}}>
            {pushEnabled
              ? 'Tu reçois les alertes tâches, devis et prix sur cet appareil.'
              : 'Active pour recevoir les alertes sur cet appareil (à faire sur chaque appareil).'}
          </div>
        </div>
        <button
          onClick={pushEnabled ? unregisterPush : registerPush}
          disabled={pushLoading}
          className={pushEnabled ? 'btn btn-sm' : 'btn btn-p btn-sm'}
          style={{
            flexShrink: 0,
            background: pushEnabled ? '#FFFFFF' : '#FF82D7',
            color: pushEnabled ? '#191923' : '#FFFFFF',
            opacity: pushLoading ? 0.6 : 1,
            fontSize: 12, padding: '8px 16px'
          }}>
          {pushLoading ? '⏳ ...' : (pushEnabled ? '🔕 Désactiver' : '🔔 Activer')}
        </button>
      </div>

      {/* Header */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:13,opacity:.6,marginBottom:8}}>
          Variations de prix entre achats successifs chez le même fournisseur. Aucun changement de fournisseur n&apos;est compté ici.
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,opacity:.5}}>Seuil de variation :</span>
          {[5, 10, 15, 20].map(function(t){
            var active = thresholdPct === t
            return (
              <button key={t} onClick={function(){setThresholdPct(t)}} style={{
                padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,
                border:'1.5px solid '+(active?'#191923':'#DDD'),
                background:active?'#FFEB5A':'#fff',
                color:'#191923',cursor:'pointer'
              }}>±{t}%</button>
            )
          })}
        </div>
      </div>

      {/* HAUSSES */}
      {hausses.length > 0 && (
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#CC0066',marginBottom:8}}>▲ Hausses ({hausses.length})</div>
          {hausses.map(function(v){
            var severity = Math.abs(v.pct) >= 20 ? 'high' : (Math.abs(v.pct) >= 10 ? 'mid' : 'low')
            var borderColor = severity === 'high' ? '#CC0066' : (severity === 'mid' ? '#FF82D7' : '#FFB0D7')
            var badgeColor = severity === 'high' ? '#CC0066' : (severity === 'mid' ? '#CC0066' : '#FF82D7')
            return (
              <div key={v.comparison_key} style={{background:'#FFE5F0',border:'1.5px solid '+borderColor,borderRadius:10,padding:'10px 12px',marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#191923',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      {v.article_name}
                      {v.supplier_changed && (
                        <span style={{padding:'2px 8px',background:'#191923',color:'#FFEB5A',borderRadius:10,fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:.3}}>🔄 Changement fournisseur</span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:'#666',marginTop:2}}>
                      {v.supplier_changed ? (
                        <span><strong>{v.prev_supplier}</strong> → <strong>{v.supplier}</strong></span>
                      ) : (
                        <span>{v.supplier}</span>
                      )}
                      {v.pack_label && <span> · {v.pack_label}</span>}
                    </div>
                    <div style={{fontSize:11,marginTop:4,color:'#191923'}}>
                      <span style={{opacity:.6}}>{fmtDate(v.old_date)}</span> {fmtPrice(v.old_price)}€ → <span style={{opacity:.6}}>{fmtDate(v.new_date)}</span> <strong>{fmtPrice(v.new_price)}€/{v.unit}</strong>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
                    <div style={{padding:'3px 10px',background:badgeColor,color:'#fff',borderRadius:14,fontSize:13,fontWeight:900}}>+{v.pct.toFixed(1)}%</div>
                    {v.invoice_path && (
                      <button onClick={function(){openInvoice(v.invoice_path)}} style={{padding:'2px 8px',fontSize:10,fontWeight:900,borderRadius:10,border:'1px solid '+badgeColor,background:'#fff',color:badgeColor,cursor:'pointer'}}>📄 Facture</button>
                    )}
                  </div>
                </div>
                {v.using_recipes.length > 0 && (
                  <div style={{marginTop:6,paddingTop:6,borderTop:'1px dashed #FFB0D7',display:'flex',flexWrap:'wrap',gap:4}}>
                    {v.using_recipes.slice(0, 8).map(function(r){
                      var rFCColor = Number(r.food_cost_pct || 0) > fcSeuil ? '#CC0066' : '#8A6D00'
                      var rFCBg = Number(r.food_cost_pct || 0) > fcSeuil ? '#FFE0E0' : '#FFF3B0'
                      return <span key={r.id} style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:rFCBg,color:rFCColor,border:'1px solid '+rFCColor,textTransform:'uppercase'}}>{r.name} {r.food_cost_pct ? '(' + Number(r.food_cost_pct).toFixed(1) + '%)' : ''}</span>
                    })}
                    {v.using_recipes.length > 8 && <span style={{fontSize:9,opacity:.6}}>+{v.using_recipes.length - 8} autres</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* BAISSES */}
      {baisses.length > 0 && (
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#009D3A',marginBottom:8}}>▼ Baisses ({baisses.length})</div>
          {baisses.map(function(v){
            return (
              <div key={v.comparison_key} style={{background:'#E8FFE8',border:'1.5px solid #009D3A',borderRadius:10,padding:'10px 12px',marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#191923',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      {v.article_name}
                      {v.supplier_changed && (
                        <span style={{padding:'2px 8px',background:'#191923',color:'#FFEB5A',borderRadius:10,fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:.3}}>🔄 Changement fournisseur</span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:'#666',marginTop:2}}>
                      {v.supplier_changed ? (
                        <span><strong>{v.prev_supplier}</strong> → <strong>{v.supplier}</strong></span>
                      ) : (
                        <span>{v.supplier}</span>
                      )}
                      {v.pack_label && <span> · {v.pack_label}</span>}
                    </div>
                    <div style={{fontSize:11,marginTop:4,color:'#191923'}}>
                      <span style={{opacity:.6}}>{fmtDate(v.old_date)}</span> {fmtPrice(v.old_price)}€ → <span style={{opacity:.6}}>{fmtDate(v.new_date)}</span> <strong>{fmtPrice(v.new_price)}€/{v.unit}</strong>
                    </div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
                    <div style={{padding:'3px 10px',background:'#009D3A',color:'#fff',borderRadius:14,fontSize:13,fontWeight:900}}>{v.pct.toFixed(1)}%</div>
                    {v.invoice_path && (
                      <button onClick={function(){openInvoice(v.invoice_path)}} style={{padding:'2px 8px',fontSize:10,fontWeight:900,borderRadius:10,border:'1px solid #009D3A',background:'#fff',color:'#009D3A',cursor:'pointer'}}>📄 Facture</button>
                    )}
                  </div>
                </div>
                {v.using_recipes.length > 0 && (
                  <div style={{marginTop:6,paddingTop:6,borderTop:'1px dashed #A0E0A0',display:'flex',flexWrap:'wrap',gap:4}}>
                    {v.using_recipes.slice(0, 8).map(function(r){
                      return <span key={r.id} style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:'#FFF3B0',color:'#8A6D00',border:'1px solid #EED980',textTransform:'uppercase'}}>{r.name}</span>
                    })}
                    {v.using_recipes.length > 8 && <span style={{fontSize:9,opacity:.6}}>+{v.using_recipes.length - 8} autres</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* FOOD COST DÉPASSÉ */}
      {recipesHigh.length > 0 && (
        <div style={{marginBottom:18}}>
          <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#856B00',marginBottom:8}}>⚠ Food cost &gt; {fcSeuil}% ({recipesHigh.length})</div>
          {recipesHigh.map(function(r){
            return (
              <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',marginBottom:6,background:'#FFF3B0',border:'1.5px solid #EED980',borderRadius:8,gap:8,flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:900,color:'#191923'}}>{r.name}</div>
                  <div style={{fontSize:10,color:'#666',marginTop:2}}>Prix vente : {Number(r.prix_vente_ttc || 0).toFixed(2)}€ TTC</div>
                </div>
                <div style={{padding:'3px 10px',background:'#CC0066',color:'#fff',borderRadius:14,fontSize:13,fontWeight:900}}>{Number(r.food_cost_pct || 0).toFixed(1)}%</div>
              </div>
            )
          })}
        </div>
      )}

      {/* État vide */}
      {hausses.length === 0 && baisses.length === 0 && recipesHigh.length === 0 && (
        <div style={{padding:32,textAlign:'center',background:'#fff',borderRadius:10,border:'1.5px solid #E8F8EE'}}>
          <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#009D3A'}}>Tout va bien !</div>
          <div style={{fontSize:12,color:'#888',marginTop:4}}>Aucune variation &ge; ±{thresholdPct}% sur les derniers achats · Food cost ok sur toutes les recettes</div>
        </div>
      )}
    </div>
  )
}
