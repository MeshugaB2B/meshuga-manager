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
// ShoppingListTab — Liste de courses / Comparateur fournisseurs
// Vue par ARTICLE : tableau comparatif clair, le moins cher en vert
// Écarts en € HT et en % bien visibles
// =============================================================================

export default function ShoppingListTab(props) {
  var toast = props.toast || function(m){ console.log(m) }

  var [suppliers, setSuppliers] = useState([])
  var [products, setProducts] = useState([])
  var [articles, setArticles] = useState([])
  var [loading, setLoading] = useState(true)
  var [filter, setFilter] = useState('savings')
  var [searchQ, setSearchQ] = useState('')
  var [groupBy, setGroupBy] = useState('article')

  useEffect(function(){
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    var c = sb()
    Promise.all([
      c.from('suppliers').select('*'),
      c.from('products').select('*').eq('is_active', true),
      c.from('articles').select('*')
    ]).then(function(results){
      setSuppliers(results[0].data || [])
      setProducts(results[1].data || [])
      setArticles(results[2].data || [])
      setLoading(false)
    })
  }

  function supName(supplierId) {
    var s = suppliers.filter(function(x){ return x.id === supplierId })[0]
    return s ? s.name : '?'
  }

  function supLocked(supplierId) {
    var s = suppliers.filter(function(x){ return x.id === supplierId })[0]
    return s && s.price_lock
  }

  function getProductsForArticle(articleId) {
    return products.filter(function(p){
      return p.article_id === articleId
    }).sort(function(a, b){
      return Number(a.current_price) - Number(b.current_price)
    })
  }

  function shouldShowArticle(article) {
    if (article.cost_imputation_mode === 'monthly_overhead' || article.cost_imputation_mode === 'fees_taxes') return false
    var prods = getProductsForArticle(article.id)
    if (prods.length === 0) return false
    if (filter === 'savings') {
      if (prods.length < 2) return false
      var byUnit = {}
      prods.forEach(function(p){ byUnit[p.unit] = (byUnit[p.unit] || 0) + 1 })
      var hasComparable = Object.keys(byUnit).some(function(u){ return byUnit[u] >= 2 })
      if (!hasComparable) return false
      var primaryUnit = prods[0].unit
      var sameUnitArr = prods.filter(function(p){ return p.unit === primaryUnit })
      if (sameUnitArr.length < 2) return false
      var prices = sameUnitArr.map(function(p){ return Number(p.current_price) })
      var min = Math.min.apply(null, prices)
      var max = Math.max.apply(null, prices)
      if (min >= max) return false
    }
    if (filter === 'no_alt') {
      if (prods.length > 1) return false
    }
    if (searchQ) {
      var q = searchQ.toLowerCase()
      var matchArticle = (article.name || '').toLowerCase().indexOf(q) > -1
      var matchProd = prods.some(function(p){
        return (p.name || '').toLowerCase().indexOf(q) > -1
      })
      if (!matchArticle && !matchProd) return false
    }
    return true
  }

  function articleSaving(article) {
    var prods = getProductsForArticle(article.id)
    if (prods.length < 2) return 0
    var byUnit = {}
    prods.forEach(function(p){
      if (!byUnit[p.unit]) byUnit[p.unit] = []
      byUnit[p.unit].push(Number(p.current_price))
    })
    var maxSaving = 0
    Object.keys(byUnit).forEach(function(unit){
      var arr = byUnit[unit]
      if (arr.length < 2) return
      var min = Math.min.apply(null, arr)
      var max = Math.max.apply(null, arr)
      var diff = max - min
      if (diff > maxSaving) maxSaving = diff
    })
    return Math.round(maxSaving * 100) / 100
  }

  function countSavings() {
    return articles.filter(function(a){
      if (a.cost_imputation_mode === 'monthly_overhead' || a.cost_imputation_mode === 'fees_taxes') return false
      return articleSaving(a) > 0
    }).length
  }

  function totalSavingsAmount() {
    var total = 0
    articles.forEach(function(a){
      if (a.cost_imputation_mode === 'monthly_overhead' || a.cost_imputation_mode === 'fees_taxes') return
      total += articleSaving(a)
    })
    return Math.round(total * 100) / 100
  }

  function getDisplayedArticles() {
    return articles.filter(shouldShowArticle).sort(function(a, b){
      if (filter === 'savings') {
        return articleSaving(b) - articleSaving(a)
      }
      return (a.name || '').localeCompare(b.name || '')
    })
  }

  function copyListForSupplier(supplierId) {
    var sup = suppliers.filter(function(s){ return s.id === supplierId })[0]
    if (!sup) return
    var supProds = products.filter(function(p){ return p.supplier_id === supplierId })
    supProds = supProds.filter(function(p){
      if (!p.article_id) return true
      var a = articles.filter(function(x){ return x.id === p.article_id })[0]
      if (!a) return true
      return a.cost_imputation_mode !== 'monthly_overhead' && a.cost_imputation_mode !== 'fees_taxes'
    })
    var lines = ['Commande Meshuga - ' + sup.name, '']
    supProds.sort(function(a,b){ return (a.name||'').localeCompare(b.name||'') })
    supProds.forEach(function(p){
      lines.push('- ' + p.name + ' : ___ ' + p.unit + ' (' + Number(p.current_price).toFixed(2) + 'EUR/' + p.unit + ')')
    })
    lines.push('', 'Merci !')
    var text = lines.join('\n')
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function(){
        toast('Liste ' + sup.name + ' copiee (' + supProds.length + ' articles)')
      })
    } else {
      alert(text)
    }
  }

  if (loading) {
    return (
      <div style={{padding: 40, textAlign: 'center', opacity: 0.6}}>
        <div style={{fontSize: 32, marginBottom: 8}}>⏳</div>
        Chargement du catalogue...
      </div>
    )
  }

  var savingsCount = countSavings()
  var totalSavings = totalSavingsAmount()
  var displayed = getDisplayedArticles()
  var totalIngredients = articles.filter(function(a){
    return a.cost_imputation_mode !== 'monthly_overhead' && a.cost_imputation_mode !== 'fees_taxes' && getProductsForArticle(a.id).length > 0
  }).length
  var activeSupCount = suppliers.filter(function(s){return !s.archived}).length

  return (
    <div>
      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #FFEB5A 0%, #FFD93D 100%)',
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        border: '2px solid #191923'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12}}>
          <div>
            <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 28, color: '#191923', lineHeight: 1}}>
              💰 Comparateur d&apos;achats
            </div>
            <div style={{fontSize: 13, color: '#191923', marginTop: 6, fontWeight: 700}}>
              {totalIngredients} ingrédients · {activeSupCount} fournisseurs
            </div>
          </div>
          {savingsCount > 0 && (
            <div style={{
              background: '#191923',
              color: '#FFEB5A',
              padding: '10px 16px',
              borderRadius: 10,
              textAlign: 'right',
              fontFamily: 'Arial Narrow, Arial, sans-serif'
            }}>
              <div style={{fontSize: 11, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 0.5}}>Économies possibles</div>
              <div style={{fontSize: 22, fontWeight: 900, marginTop: 2}}>{savingsCount} articles · {totalSavings.toFixed(2)}€</div>
              <div style={{fontSize: 10, opacity: 0.7, marginTop: 2}}>cumul des écarts max par unité</div>
            </div>
          )}
        </div>
      </div>

      {/* FILTRES */}
      <div style={{display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center'}}>
        <button type="button" onClick={function(){setFilter('savings')}} style={pillBtn(filter === 'savings')}>
          💰 Économies possibles {savingsCount > 0 && <span style={{opacity: 0.8, marginLeft: 4}}>({savingsCount})</span>}
        </button>
        <button type="button" onClick={function(){setFilter('all')}} style={pillBtn(filter === 'all')}>
          📋 Tout le catalogue
        </button>
        <button type="button" onClick={function(){setFilter('no_alt')}} style={pillBtn(filter === 'no_alt')}>
          🔒 Sans alternative
        </button>
        <div style={{width: 1, height: 28, background: '#DDD', margin: '0 4px'}}></div>
        <button type="button" onClick={function(){setGroupBy(groupBy === 'article' ? 'supplier' : 'article')}} style={Object.assign({}, pillBtn(false), {background: '#fff', borderColor: '#888'})}>
          {groupBy === 'article' ? '🔄 Vue par fournisseur' : '🔄 Vue par ingrédient'}
        </button>
        <div style={{flex: 1, minWidth: 200, marginLeft: 'auto'}}>
          <input type="text" value={searchQ} onChange={function(e){setSearchQ(e.target.value)}} placeholder="🔍 Rechercher un ingrédient..." style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 13,
            border: '2px solid #EBEBEB',
            borderRadius: 20,
            outline: 'none',
            boxSizing: 'border-box'
          }} />
        </div>
      </div>

      {/* VUE PAR ARTICLE */}
      {groupBy === 'article' && displayed.map(function(article){
        return <ArticleCard key={article.id} article={article} products={getProductsForArticle(article.id)} supName={supName} supLocked={supLocked} saving={articleSaving(article)} />
      })}

      {/* VUE PAR FOURNISSEUR */}
      {groupBy === 'supplier' && (
        <SupplierGrouped 
          suppliers={suppliers.filter(function(s){return !s.archived})}
          articles={articles}
          products={products}
          searchQ={searchQ}
          supName={supName}
          onCopyList={copyListForSupplier}
        />
      )}

      {/* Empty state */}
      {groupBy === 'article' && displayed.length === 0 && (
        <div style={{padding: 50, textAlign: 'center', background: '#fff', borderRadius: 12, border: '2px dashed #DDD'}}>
          <div style={{fontSize: 40, marginBottom: 10}}>
            {filter === 'savings' ? '🎉' : searchQ ? '🔍' : '📭'}
          </div>
          <div style={{fontSize: 14, fontWeight: 700, color: '#191923', marginBottom: 4}}>
            {filter === 'savings' ? 'Aucune économie possible !' :
             searchQ ? 'Aucun résultat' :
             'Aucun ingrédient'}
          </div>
          <div style={{fontSize: 12, color: '#888'}}>
            {filter === 'savings' ? 'Tous tes choix de fournisseurs sont déjà optimaux 💪' :
             searchQ ? 'Essaie un autre terme de recherche' :
             ''}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// ARTICLE CARD — tableau comparatif clair
// =============================================================================
function ArticleCard(props) {
  var article = props.article
  var products = props.products
  var supName = props.supName
  var supLocked = props.supLocked
  var saving = props.saving

  var primaryUnit = products[0] ? products[0].unit : 'kg'
  var sameUnitProducts = products.filter(function(p){ return p.unit === primaryUnit })
  var otherUnitProducts = products.filter(function(p){ return p.unit !== primaryUnit })
  var cheapestPrice = sameUnitProducts.length > 0 ? Number(sameUnitProducts[0].current_price) : 0
  var hasMultiple = sameUnitProducts.length > 1
  var showEconomy = hasMultiple && saving > 0

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      marginBottom: 12,
      overflow: 'hidden',
      border: showEconomy ? '2px solid #009D3A' : '2px solid #EBEBEB',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      {/* Header de l'article */}
      <div style={{
        padding: '12px 16px',
        background: showEconomy ? 'linear-gradient(90deg, #E8F5E9 0%, #fff 60%)' : '#FAFAFA',
        borderBottom: '1px solid #EEE',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8
      }}>
        <div>
          <div style={{fontSize: 17, fontWeight: 900, color: '#191923', fontFamily: 'Arial Narrow, Arial, sans-serif', textTransform: 'uppercase', letterSpacing: 0.3}}>
            {article.name}
          </div>
          <div style={{fontSize: 11, color: '#888', marginTop: 2}}>
            {products.length} fournisseur{products.length > 1 ? 's' : ''} · prix par {primaryUnit}
          </div>
        </div>
        {showEconomy && (
          <div style={{
            background: '#009D3A',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 900,
            fontFamily: 'Arial Narrow, Arial, sans-serif',
            letterSpacing: 0.3,
            whiteSpace: 'nowrap'
          }}>
            💰 ÉCONOMIE {saving.toFixed(2)}€/{primaryUnit}
          </div>
        )}
      </div>

      {/* En-tête du tableau */}
      {hasMultiple && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 110px 90px 80px',
          gap: 8,
          padding: '8px 16px',
          background: '#F9F9F9',
          borderBottom: '1px solid #EEE',
          fontSize: 10,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: '#888'
        }}>
          <div>Fournisseur</div>
          <div style={{textAlign: 'right'}}>Prix HT</div>
          <div style={{textAlign: 'right'}}>Écart €</div>
          <div style={{textAlign: 'right'}}>Écart %</div>
        </div>
      )}

      {/* Lignes products même unité */}
      {sameUnitProducts.map(function(p, idx){
        var isCheapest = idx === 0 && hasMultiple
        var price = Number(p.current_price)
        var diffEur = price - cheapestPrice
        var diffPct = cheapestPrice > 0 ? (diffEur / cheapestPrice * 100) : 0
        var locked = supLocked(p.supplier_id)
        return (
          <div key={p.id} style={{
            display: 'grid',
            gridTemplateColumns: hasMultiple ? '1fr 110px 90px 80px' : '1fr auto',
            gap: 8,
            padding: '12px 16px',
            borderBottom: idx === sameUnitProducts.length - 1 && otherUnitProducts.length === 0 ? 'none' : '1px solid #F5F5F5',
            alignItems: 'center',
            background: isCheapest ? '#F1F8F4' : '#fff'
          }}>
            {/* Fournisseur */}
            <div style={{display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap'}}>
              {isCheapest && (
                <span style={{
                  background: '#009D3A',
                  color: '#fff',
                  padding: '2px 7px',
                  borderRadius: 4,
                  fontSize: 9,
                  fontWeight: 900,
                  letterSpacing: 0.5,
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}>✓ MOINS CHER</span>
              )}
              <span style={{fontWeight: isCheapest ? 900 : 700, fontSize: 14, color: '#191923'}}>
                {supName(p.supplier_id)}
              </span>
              {locked && (
                <span style={{fontSize: 9, padding: '1px 6px', background: '#FFEB5A', color: '#191923', borderRadius: 8, fontWeight: 900, flexShrink: 0}}>🔒 bloqué</span>
              )}
            </div>
            {/* Prix HT */}
            <div style={{textAlign: 'right', fontWeight: 900, fontSize: 16, color: isCheapest ? '#009D3A' : '#191923', fontVariantNumeric: 'tabular-nums'}}>
              {price.toFixed(2)}€<span style={{fontSize: 11, opacity: 0.6, fontWeight: 400}}>/{p.unit}</span>
            </div>
            {/* Écart € */}
            {hasMultiple && (
              <div style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>
                {isCheapest ? (
                  <span style={{fontSize: 12, color: '#009D3A', fontWeight: 900}}>—</span>
                ) : (
                  <span style={{fontSize: 13, color: '#CC0066', fontWeight: 900}}>+{diffEur.toFixed(2)}€</span>
                )}
              </div>
            )}
            {/* Écart % */}
            {hasMultiple && (
              <div style={{textAlign: 'right', fontVariantNumeric: 'tabular-nums'}}>
                {isCheapest ? (
                  <span style={{fontSize: 12, color: '#009D3A', fontWeight: 900}}>—</span>
                ) : (
                  <span style={{
                    fontSize: 12,
                    color: '#CC0066',
                    fontWeight: 900,
                    background: '#FFE5EE',
                    padding: '3px 8px',
                    borderRadius: 10,
                    display: 'inline-block'
                  }}>+{diffPct.toFixed(1)}%</span>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Products avec unité différente */}
      {otherUnitProducts.length > 0 && (
        <div style={{padding: '8px 16px', background: '#FFFAE5', borderTop: '1px dashed #FFEB5A', fontSize: 11, color: '#191923'}}>
          <div style={{fontWeight: 900, marginBottom: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5}}>⚠️ Autres conditionnements (non comparables directement)</div>
          {otherUnitProducts.map(function(p){
            return (
              <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid #FFEB5A'}}>
                <span style={{fontWeight: 700}}>{supName(p.supplier_id)}</span>
                <span style={{fontWeight: 900, fontVariantNumeric: 'tabular-nums'}}>{Number(p.current_price).toFixed(2)}€/{p.unit}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// VUE PAR FOURNISSEUR
// =============================================================================
function SupplierGrouped(props) {
  var suppliers = props.suppliers
  var articles = props.articles
  var products = props.products
  var searchQ = props.searchQ
  var onCopyList = props.onCopyList
  var supName = props.supName

  function getProductsForSup(supId) {
    return products.filter(function(p){
      if (p.supplier_id !== supId) return false
      if (!p.article_id) return true
      var a = articles.filter(function(x){ return x.id === p.article_id })[0]
      if (!a) return true
      if (a.cost_imputation_mode === 'monthly_overhead' || a.cost_imputation_mode === 'fees_taxes') return false
      if (searchQ) {
        var q = searchQ.toLowerCase()
        if ((p.name || '').toLowerCase().indexOf(q) === -1 && (a.name || '').toLowerCase().indexOf(q) === -1) return false
      }
      return true
    }).sort(function(a, b){ return (a.name || '').localeCompare(b.name || '') })
  }

  function getCheaperAlt(prod) {
    if (!prod.article_id) return null
    var alts = products.filter(function(p){
      return p.article_id === prod.article_id && p.id !== prod.id && p.unit === prod.unit
    })
    if (alts.length === 0) return null
    var cheapest = alts.reduce(function(b, a){
      return Number(a.current_price) < Number(b.current_price) ? a : b
    }, alts[0])
    if (Number(cheapest.current_price) >= Number(prod.current_price)) return null
    return cheapest
  }

  return (
    <div>
      {suppliers.map(function(sup){
        var supProds = getProductsForSup(sup.id)
        if (supProds.length === 0) return null
        return (
          <div key={sup.id} style={{
            background: '#fff',
            borderRadius: 12,
            border: '2px solid #FF82D7',
            marginBottom: 14,
            overflow: 'hidden'
          }}>
            <div style={{
              background: '#FF82D7',
              color: '#fff',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, lineHeight: 1.1}}>📞 {sup.name}</div>
                <div style={{fontSize: 11, opacity: 0.9, marginTop: 3, fontWeight: 700}}>
                  {supProds.length} article{supProds.length > 1 ? 's' : ''}
                  {sup.price_lock && <span style={{marginLeft: 8, padding: '1px 8px', background: '#191923', color: '#FFEB5A', borderRadius: 10, fontSize: 10}}>🔒 PRIX BLOQUÉS</span>}
                </div>
              </div>
              <button type="button" onClick={function(){onCopyList(sup.id)}} style={{
                padding: '8px 14px',
                background: '#fff',
                color: '#FF82D7',
                border: 'none',
                borderRadius: 6,
                fontWeight: 900,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'Arial Narrow, Arial, sans-serif',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'rgba(0,0,0,0.1)'
              }}>📋 Copier la liste</button>
            </div>
            <div>
              {supProds.map(function(p, idx){
                var cheaperAlt = getCheaperAlt(p)
                var diffEur = cheaperAlt ? Number(p.current_price) - Number(cheaperAlt.current_price) : 0
                var diffPct = cheaperAlt && Number(cheaperAlt.current_price) > 0 ? diffEur / Number(cheaperAlt.current_price) * 100 : 0
                return (
                  <div key={p.id} style={{
                    padding: '10px 16px',
                    borderTop: idx === 0 ? 'none' : '1px solid #F5F5F5',
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: 12,
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{fontWeight: 900, fontSize: 14}}>{p.name}</div>
                      {cheaperAlt && (
                        <div style={{
                          marginTop: 4,
                          padding: '4px 10px',
                          background: '#FFFBE5',
                          border: '1px dashed #FFD93D',
                          borderRadius: 6,
                          fontSize: 11,
                          display: 'inline-block'
                        }}>
                          💡 <strong>−{diffEur.toFixed(2)}€/{p.unit}</strong> chez <strong>{supName(cheaperAlt.supplier_id)}</strong> ({diffPct.toFixed(1)}% moins cher)
                        </div>
                      )}
                    </div>
                    <div style={{textAlign: 'right', fontWeight: 900, fontSize: 16, fontVariantNumeric: 'tabular-nums'}}>
                      {Number(p.current_price).toFixed(2)}€<span style={{fontSize: 11, opacity: 0.6, fontWeight: 400}}>/{p.unit}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
function pillBtn(active) {
  return {
    padding: '9px 16px',
    fontSize: 12,
    fontWeight: 900,
    fontFamily: 'Arial Narrow, Arial, sans-serif',
    border: '2px solid ' + (active ? '#191923' : '#DDD'),
    background: active ? '#191923' : '#fff',
    color: active ? '#FFEB5A' : '#555',
    borderRadius: 20,
    cursor: 'pointer',
    letterSpacing: 0.3,
    touchAction: 'manipulation' as const,
    WebkitTapHighlightColor: 'rgba(0,0,0,0.1)'
  }
}
