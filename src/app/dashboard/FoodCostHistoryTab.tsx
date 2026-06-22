'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

function fmt(n) {
  return (Math.round(Number(n || 0) * 100) / 100).toFixed(2)
}

function fmtDate(s) {
  if (!s) return '—'
  var d = new Date(s)
  if (isNaN(d.getTime())) return s
  return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getFullYear()
}

// =============================================================================
// FoodCostHistoryTab
// Onglet "Imports" : 2 sous-vues (Factures avec re-match / Alias mémorisés).
// =============================================================================
export default function FoodCostHistoryTab(props) {
  var toast = props.toast || function(m){ console.log(m) }

  var [subView, setSubView] = useState('invoices') // 'invoices' | 'aliases'
  var [loading, setLoading] = useState(true)

  // Donnees factures
  var [priceLines, setPriceLines] = useState([])
  var [allArticles, setAllArticles] = useState([])
  var [allProducts, setAllProducts] = useState([])
  var [allSuppliers, setAllSuppliers] = useState([])
  var [aliases, setAliases] = useState([])

  // Expansion par facture (filename)
  var [expandedInvoices, setExpandedInvoices] = useState({})

  // Modal de re-match
  var [rematchLine, setRematchLine] = useState(null) // ligne product_prices a re-matcher
  var [rematchAction, setRematchAction] = useState('match_existing') // 'match_existing' | 'create_new' | 'fees_taxes'
  var [rematchSearch, setRematchSearch] = useState('')
  var [rematchTargetArticleId, setRematchTargetArticleId] = useState(null)
  var [rematchNewArticle, setRematchNewArticle] = useState({
    name: '',
    category: 'ingredient',
    master_unit: 'kg',
    cost_imputation_mode: 'recipe_ingredient'
  })
  var [rematchDeleteAlias, setRematchDeleteAlias] = useState(true)
  var [rematchSaving, setRematchSaving] = useState(false)

  // ============= STATES ANOMALIES =============
  var [editingAnomalyId, setEditingAnomalyId] = useState(null)
  var [anomalyDraft, setAnomalyDraft] = useState({ pack_label: '', pack_price: '', master_qty_per_pack: '' })
  var [anomalySaving, setAnomalySaving] = useState(false)

  // ============= LOAD DATA =============
  function loadData() {
    setLoading(true)
    Promise.all([
      sb().from('product_prices').select('id, product_id, master_unit_price, pack_price, pack_label, master_qty_per_pack, invoice_date, invoice_filename, article_original, created_at').order('created_at', { ascending: false }).limit(500),
      sb().from('articles').select('id, name, category, unit, cost_imputation_mode').order('name'),
      sb().from('products').select('id, name, supplier_id, article_id, current_price, unit').eq('is_active', true).order('name'),
      sb().from('suppliers').select('id, name, archived').order('name'),
      sb().from('product_aliases').select('id, alias, alias_normalized, article_id, product_id, supplier_id, source, confirmed_count, created_at').order('confirmed_count', { ascending: false })
    ]).then(function(results){
      setPriceLines(results[0].data || [])
      setAllArticles(results[1].data || [])
      setAllProducts(results[2].data || [])
      setAllSuppliers(results[3].data || [])
      setAliases(results[4].data || [])
      setLoading(false)
    }).catch(function(e){
      toast('Erreur chargement: ' + (e.message || String(e)))
      setLoading(false)
    })
  }

  useEffect(function(){ loadData() }, [])

  // ============= GROUP BY INVOICE_FILENAME =============
  function buildInvoices() {
    var map = {}
    var i
    for (i = 0; i < priceLines.length; i++) {
      var pl = priceLines[i]
      var key = pl.invoice_filename || ('NO_FILE_' + (pl.invoice_date || 'unknown'))
      if (!map[key]) {
        var prod = null
        var pi
        for (pi = 0; pi < allProducts.length; pi++) {
          if (allProducts[pi].id === pl.product_id) { prod = allProducts[pi]; break }
        }
        var supName = '—'
        if (prod) {
          var si
          for (si = 0; si < allSuppliers.length; si++) {
            if (allSuppliers[si].id === prod.supplier_id) { supName = allSuppliers[si].name; break }
          }
        }
        map[key] = {
          filename: pl.invoice_filename || '',
          invoice_date: pl.invoice_date,
          supplier_name: supName,
          created_at: pl.created_at,
          lines: [],
          total: 0
        }
      }
      map[key].lines.push(pl)
      map[key].total += Number(pl.pack_price || 0)
      // Garder la date la plus precise
      if (pl.invoice_date && (!map[key].invoice_date || pl.invoice_date < map[key].invoice_date)) {
        map[key].invoice_date = pl.invoice_date
      }
    }
    var arr = Object.values(map)
    arr.sort(function(a, b){
      var da = String(a.created_at || '')
      var db = String(b.created_at || '')
      return db.localeCompare(da)
    })
    return arr
  }

  // ============= REMATCH HANDLERS =============
  function openRematch(line) {
    setRematchLine(line)
    setRematchAction('match_existing')
    setRematchSearch('')
    setRematchTargetArticleId(null)
    setRematchNewArticle({
      name: line.article_original || '',
      category: 'ingredient',
      master_unit: 'kg',
      cost_imputation_mode: 'recipe_ingredient'
    })
    setRematchDeleteAlias(true)
  }

  function closeRematch() {
    setRematchLine(null)
    setRematchSearch('')
    setRematchTargetArticleId(null)
  }

  function getProdById(productId) {
    var i
    for (i = 0; i < allProducts.length; i++) {
      if (allProducts[i].id === productId) return allProducts[i]
    }
    return null
  }

  function getSupName(supplierId) {
    var i
    for (i = 0; i < allSuppliers.length; i++) {
      if (allSuppliers[i].id === supplierId) return allSuppliers[i].name
    }
    return '—'
  }

  function getArtById(articleId) {
    var i
    for (i = 0; i < allArticles.length; i++) {
      if (allArticles[i].id === articleId) return allArticles[i]
    }
    return null
  }

  function isRematchValid() {
    if (!rematchLine) return false
    if (rematchAction === 'fees_taxes') return true
    if (rematchAction === 'match_existing') return !!rematchTargetArticleId
    if (rematchAction === 'create_new') {
      return !!(rematchNewArticle.name && String(rematchNewArticle.name).trim().length >= 2)
    }
    return false
  }

  function doRematch() {
    if (!isRematchValid() || rematchSaving) return
    setRematchSaving(true)

    var payload: any = {
      price_id: rematchLine.id,
      action: rematchAction,
      target_article_id: rematchAction === 'match_existing' ? rematchTargetArticleId : null,
      new_article: rematchAction === 'create_new' ? rematchNewArticle : null,
      delete_alias: rematchDeleteAlias,
      alias_text: rematchLine.article_original || null
    }

    fetch('/api/import-invoice/rematch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){ return r.json() }).then(function(data){
      setRematchSaving(false)
      if (data.error) { toast('Erreur: ' + data.error); return }
      var msg = '✅ Ligne corrigée'
      if (data.alias_deleted) msg += ' · alias supprimé'
      toast(msg)
      closeRematch()
      loadData()
    }).catch(function(err){
      setRematchSaving(false)
      toast('Erreur réseau: ' + (err.message || String(err)))
    })
  }

  // ============= ALIAS HANDLERS =============
  function deleteAlias(aliasId, aliasText) {
    if (!confirm('Supprimer l\'alias « ' + aliasText + ' » ?\nLes prochaines factures ne le re-matcheront plus automatiquement.')) return
    sb().from('product_aliases').delete().eq('id', aliasId).then(function(res){
      if (res.error) { toast('Erreur: ' + res.error.message); return }
      toast('🗑️ Alias supprimé')
      loadData()
    })
  }

  // ============= COMPUTED =============
  var invoices = buildInvoices()

  // ============= ACTIONS ANOMALIES =============
  function openInvoiceFromPath(invoicePath) {
    if (!invoicePath) {
      props.toast && props.toast('Cette ligne n\'a pas de facture stockée (import antérieur au système Storage)')
      return
    }
    sb().storage.from('supplier-invoices').createSignedUrl(invoicePath, 3600).then(function(res){
      if (res.data && res.data.signedUrl) {
        window.open(res.data.signedUrl, '_blank')
      } else {
        props.toast && props.toast('Facture non disponible')
      }
    })
  }

  // Ouvre la facture d'origine : priorité au Storage (invoice_path), sinon
  // on récupère le PDF archivé dans pending_invoices via le nom de fichier.
  function openInvoiceSource(invoicePath, invoiceFilename) {
    if (invoicePath) { openInvoiceFromPath(invoicePath); return }
    if (invoiceFilename) {
      window.open('/api/invoices/pdf?filename=' + encodeURIComponent(invoiceFilename), '_blank')
      return
    }
    props.toast && props.toast('Aucune facture source liée à cette ligne')
  }

  function startEditAnomaly(anomaly) {
    setEditingAnomalyId(anomaly.id)
    setAnomalyDraft({
      pack_label: anomaly.pack_label || '',
      pack_price: anomaly.pack_price || '',
      master_qty_per_pack: anomaly.master_qty_per_pack || ''
    })
  }

  function cancelEditAnomaly() {
    setEditingAnomalyId(null)
  }

  function saveAnomaly(anomaly) {
    var pp = parseFloat(String(anomalyDraft.pack_price || '0').replace(',', '.'))
    var qpp = parseFloat(String(anomalyDraft.master_qty_per_pack || '0').replace(',', '.'))
    if (pp <= 0 || qpp <= 0) {
      props.toast && props.toast('Pack price et qty/pack doivent être > 0')
      return
    }
    var newMUP = pp / qpp
    setAnomalySaving(true)
    sb().from('product_prices').update({
      pack_label: anomalyDraft.pack_label || null,
      pack_price: pp,
      master_qty_per_pack: qpp,
      master_unit_price: newMUP
    }).eq('id', anomaly.id).then(function(res){
      if (res.error) {
        props.toast && props.toast('Erreur: ' + res.error.message)
        setAnomalySaving(false)
        return
      }
      // Recalculer current_price du product (médiane des prix restants)
      sb().from('product_prices').select('master_unit_price').eq('product_id', anomaly.product_id).then(function(r){
        if (r.data && r.data.length > 0) {
          var prices = r.data.map(function(x){ return Number(x.master_unit_price) }).filter(function(v){ return v > 0 }).sort(function(a,b){ return a - b })
          if (prices.length > 0) {
            var median = prices[Math.floor(prices.length / 2)]
            sb().from('products').update({ current_price: Math.round(median * 1000) / 1000 }).eq('id', anomaly.product_id).then(function(){
              setAnomalySaving(false)
              setEditingAnomalyId(null)
              loadData()
              props.toast && props.toast('✓ Anomalie corrigée et prix actuel recalculé')
            })
          } else {
            setAnomalySaving(false)
            setEditingAnomalyId(null)
            loadData()
          }
        } else {
          setAnomalySaving(false)
          setEditingAnomalyId(null)
          loadData()
        }
      })
    })
  }

  function deleteAnomaly(anomaly) {
    if (!confirm('Supprimer définitivement ce prix erroné ?\n\n' + anomaly.product_name + ' · ' + anomaly.invoice_date + ' · ' + anomaly.master_unit_price + '€')) return
    setAnomalySaving(true)
    sb().from('product_prices').delete().eq('id', anomaly.id).then(function(res){
      if (res.error) {
        props.toast && props.toast('Erreur: ' + res.error.message)
        setAnomalySaving(false)
        return
      }
      // Recalculer current_price
      sb().from('product_prices').select('master_unit_price').eq('product_id', anomaly.product_id).then(function(r){
        if (r.data && r.data.length > 0) {
          var prices = r.data.map(function(x){ return Number(x.master_unit_price) }).filter(function(v){ return v > 0 }).sort(function(a,b){ return a - b })
          if (prices.length > 0) {
            var median = prices[Math.floor(prices.length / 2)]
            sb().from('products').update({ current_price: Math.round(median * 1000) / 1000 }).eq('id', anomaly.product_id).then(function(){
              setAnomalySaving(false)
              loadData()
              props.toast && props.toast('✓ Anomalie supprimée')
            })
          } else {
            setAnomalySaving(false)
            loadData()
          }
        } else {
          setAnomalySaving(false)
          loadData()
        }
      })
    })
  }

  // ============= DÉTECTION OUTLIERS =============
  // Une ligne product_prices est outlier si :
  // - master_unit_price diffère de la médiane (de son product) de plus de ±50%
  // OU
  // - master_unit_price <= 0 (problème d'extraction)
  function buildOutliers() {
    if (priceLines.length === 0) return []

    // Grouper par product_id
    var byProduct = {}
    priceLines.forEach(function(pl){
      if (!pl.product_id) return
      if (!byProduct[pl.product_id]) byProduct[pl.product_id] = []
      byProduct[pl.product_id].push(pl)
    })

    var outliers = []
    Object.keys(byProduct).forEach(function(pid){
      var lines = byProduct[pid]
      // Calculer la médiane sur les prix > 0
      var sortedPrices = lines.map(function(l){ return Number(l.master_unit_price) }).filter(function(v){ return v > 0 }).sort(function(a,b){ return a - b })
      if (sortedPrices.length === 0) return
      var median = sortedPrices[Math.floor(sortedPrices.length / 2)]
      var prod = allProducts.filter(function(p){ return p.id === pid })[0]
      if (!prod) return
      var sup = allSuppliers.filter(function(s){ return s.id === prod.supplier_id })[0]

      lines.forEach(function(pl){
        var price = Number(pl.master_unit_price)
        var ratio = median > 0 ? price / median : 0
        var isOutlier = false
        var reason = ''

        if (price <= 0) {
          isOutlier = true
          reason = 'Prix nul ou négatif'
        } else if (sortedPrices.length >= 2 && (ratio > 1.5 || ratio < 0.5)) {
          // Au moins 2 prix pour avoir une référence solide
          isOutlier = true
          var pct = Math.round((ratio - 1) * 100)
          reason = (pct > 0 ? '+' : '') + pct + '% vs médiane'
        }

        if (isOutlier) {
          outliers.push({
            id: pl.id,
            product_id: pid,
            product_name: prod.name,
            supplier_name: sup ? sup.name : '—',
            unit: prod.unit,
            invoice_date: pl.invoice_date,
            invoice_filename: pl.invoice_filename,
            invoice_path: pl.invoice_path,
            pack_label: pl.pack_label,
            pack_price: pl.pack_price,
            master_qty_per_pack: pl.master_qty_per_pack,
            master_unit_price: price,
            median: median,
            ratio: ratio,
            reason: reason,
            article_original: pl.article_original
          })
        }
      })
    })

    // Trier par sévérité décroissante
    outliers.sort(function(a,b){
      var aSev = Math.abs(Math.log(a.ratio || 0.001))
      var bSev = Math.abs(Math.log(b.ratio || 0.001))
      return bSev - aSev
    })

    return outliers
  }

  var outliers = buildOutliers()

  // ============= RENDER =============
  if (loading) {
    return (
      <div style={{padding:40,textAlign:'center'}}>
        <div style={{fontSize:32,marginBottom:12}}>📄</div>
        <div style={{fontWeight:900}}>Chargement de l&apos;historique…</div>
      </div>
    )
  }

  var rematchSearchLow = (rematchSearch || '').toLowerCase()
  var rematchFilteredArticles = allArticles
  if (rematchSearchLow.length >= 1) {
    rematchFilteredArticles = allArticles.filter(function(a){ return String(a.name || '').toLowerCase().indexOf(rematchSearchLow) >= 0 })
  }
  rematchFilteredArticles = rematchFilteredArticles.slice(0, 8)

  return (
    <div>

      {/* Toggle sous-vue */}
      <div style={{display:'flex',gap:0,marginBottom:14,background:'#F5F5F5',borderRadius:10,padding:4}}>
        <button onClick={function(){setSubView('invoices')}} style={{flex:1,padding:'10px 14px',background:subView==='invoices'?'#FF82D7':'transparent',color:subView==='invoices'?'#fff':'#555',border:'none',borderRadius:8,fontWeight:900,fontSize:13,cursor:'pointer'}}>
          📄 Factures ({invoices.length})
        </button>
        <button onClick={function(){setSubView('aliases')}} style={{flex:1,padding:'10px 14px',background:subView==='aliases'?'#FF82D7':'transparent',color:subView==='aliases'?'#fff':'#555',border:'none',borderRadius:8,fontWeight:900,fontSize:13,cursor:'pointer'}}>
          🏷️ Alias mémorisés ({aliases.length})
        </button>
        <button onClick={function(){setSubView('anomalies')}} style={{flex:1,padding:'10px 14px',background:subView==='anomalies'?'#FF82D7':'transparent',color:subView==='anomalies'?'#fff':'#555',border:'none',borderRadius:8,fontWeight:900,fontSize:13,cursor:'pointer'}}>
          🚨 Anomalies ({outliers.length})
        </button>
      </div>

      {/* SOUS-VUE FACTURES */}
      {subView === 'invoices' && (
        <div>
          {invoices.length === 0 && (
            <div style={{padding:30,textAlign:'center',background:'#fff',borderRadius:10,border:'1px dashed #DDD',opacity:.6}}>
              <div style={{fontSize:28,marginBottom:8}}>📭</div>
              <div style={{fontSize:13,fontWeight:900}}>Aucun import facture pour l&apos;instant</div>
              <div style={{fontSize:11,opacity:.6,marginTop:4}}>Les factures que tu importes apparaîtront ici, avec la possibilité de corriger un matching erroné.</div>
            </div>
          )}

          {invoices.map(function(inv){
            var key = inv.filename || ('nodate_' + inv.created_at)
            var expanded = !!expandedInvoices[key]
            return (
              <div key={key} style={{background:'#fff',borderRadius:10,marginBottom:8,border:'1.5px solid #EEE',overflow:'hidden'}}>
                <div onClick={function(){
                  setExpandedInvoices(function(prev){
                    var next = Object.assign({}, prev)
                    next[key] = !prev[key]
                    return next
                  })
                }} style={{padding:'12px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:900,fontSize:13}}>{inv.supplier_name} · {fmtDate(inv.invoice_date)}</div>
                    <div style={{fontSize:11,opacity:.6}}>
                      {inv.lines.length} ligne{inv.lines.length > 1 ? 's' : ''}
                      {inv.filename && <span> · {inv.filename}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {inv.filename && (
                      <button onClick={function(e){e.stopPropagation();openInvoiceSource(inv.invoice_path, inv.filename)}} style={{padding:'5px 10px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid #191923',background:'#fff',cursor:'pointer',whiteSpace:'nowrap'}}>📄 Voir</button>
                    )}
                    <div style={{textAlign:'right'}}>
                      {inv.total > 0 && <div style={{fontSize:13,fontWeight:900,color:'#005FFF'}}>{fmt(inv.total)}€</div>}
                      <div style={{fontSize:11,opacity:.5}}>{expanded ? '▲' : '▼'}</div>
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div style={{borderTop:'1px solid #F0F0F0',padding:'8px 14px 12px'}}>
                    {inv.lines.map(function(line){
                      var prod = getProdById(line.product_id)
                      var prodName = prod ? prod.name : '— produit supprimé —'
                      var artId = prod ? prod.article_id : null
                      var art = artId ? getArtById(artId) : null
                      var hasMismatch = line.article_original && art && String(line.article_original).toLowerCase().trim() !== String(art.name).toLowerCase().trim()

                      return (
                        <div key={line.id} style={{padding:'8px 10px',marginBottom:4,background:'#FAFAFA',borderRadius:6,display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12,fontWeight:700}}>
                              {line.article_original || prodName}
                              {hasMismatch && <span style={{color:'#888',fontWeight:400}}> → <strong>{prodName}</strong></span>}
                            </div>
                            <div style={{fontSize:10,opacity:.6}}>
                              {line.pack_label && <span>{line.pack_label} · </span>}
                              <strong>{fmt(line.master_unit_price)}€</strong>
                              {prod && <span>/{prod.unit}</span>}
                              {line.pack_price && <span> · pack {fmt(line.pack_price)}€</span>}
                            </div>
                          </div>
                          <button onClick={function(){openRematch(line)}} style={{background:'#FFEB5A',border:'none',padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:900,cursor:'pointer',whiteSpace:'nowrap'}}>↻ Re-matcher</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* SOUS-VUE ALIASES */}
      {subView === 'aliases' && (
        <div>
          <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 12px',marginBottom:12,border:'1.5px solid #DDEEFF'}}>
            <div style={{fontSize:11,fontWeight:900,color:'#005FFF'}}>🏷️ Comment ça marche</div>
            <div style={{fontSize:11,marginTop:4,opacity:.8}}>Quand tu confirmes un matching dans le wizard facture (ex: « Coca Cola Sans Sucre » → Coca Zero), le couple est mémorisé ici. La prochaine facture qui contient ce libellé sera matchée automatiquement.</div>
          </div>

          {aliases.length === 0 && (
            <div style={{padding:30,textAlign:'center',background:'#fff',borderRadius:10,border:'1px dashed #DDD',opacity:.6}}>
              <div style={{fontSize:28,marginBottom:8}}>🏷️</div>
              <div style={{fontSize:13,fontWeight:900}}>Aucun alias mémorisé pour l&apos;instant</div>
              <div style={{fontSize:11,opacity:.6,marginTop:4}}>Les alias se créent automatiquement quand tu confirmes un matching dans le wizard facture (case « Mémoriser comme alias »).</div>
            </div>
          )}

          {aliases.map(function(a){
            var art = a.article_id ? getArtById(a.article_id) : null
            var prod = a.product_id ? getProdById(a.product_id) : null
            var sup = a.supplier_id ? getSupName(a.supplier_id) : null
            var targetName = (art && art.name) || (prod && prod.name) || '—'
            return (
              <div key={a.id} style={{background:'#fff',borderRadius:8,padding:'10px 14px',marginBottom:6,border:'1.5px solid #EEE',display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12}}>
                    <strong>« {a.alias} »</strong> <span style={{opacity:.5}}>→</span> <strong style={{color:'#009D3A'}}>{targetName}</strong>
                  </div>
                  <div style={{fontSize:10,opacity:.6,marginTop:2}}>
                    {sup && <span>Spécifique {sup} · </span>}
                    {!sup && <span>Universel · </span>}
                    confirmé {a.confirmed_count || 1}× · {a.source || 'manual'} · {fmtDate(a.created_at)}
                  </div>
                </div>
                <button onClick={function(){deleteAlias(a.id, a.alias)}} style={{background:'#FFE5E5',border:'none',color:'#CC0066',padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:900,cursor:'pointer'}}>🗑️</button>
              </div>
            )
          })}
        </div>
      )}

      {/* ========== MODAL RE-MATCH ========== */}
      {rematchLine && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={function(){if(!rematchSaving) closeRematch()}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923'}}>↻ Corriger cette ligne</div>
              {!rematchSaving && <button style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}} onClick={closeRematch}>✕</button>}
            </div>

            <div style={{background:'#FFF8E1',borderRadius:8,padding:'10px 12px',marginBottom:12,border:'1.5px solid #FFE099'}}>
              <div style={{fontSize:11,fontWeight:900,color:'#856B00',marginBottom:4}}>FACTURE ORIGINALE</div>
              <div style={{fontSize:13,fontWeight:700}}>{rematchLine.article_original || (function(){
                var p = getProdById(rematchLine.product_id)
                return p ? p.name : '—'
              })()}</div>
              <div style={{fontSize:11,opacity:.7,marginTop:2}}>
                {rematchLine.pack_label && <span>{rematchLine.pack_label} · </span>}
                {fmt(rematchLine.master_unit_price)}€{(function(){
                  var p = getProdById(rematchLine.product_id)
                  return p ? '/' + p.unit : ''
                })()}
                {' · '}{fmtDate(rematchLine.invoice_date)}
              </div>
              <div style={{fontSize:11,marginTop:6,padding:'4px 8px',background:'#fff',borderRadius:4,display:'inline-block'}}>
                Actuellement matché vers : <strong>{(function(){
                  var p = getProdById(rematchLine.product_id)
                  return p ? p.name : '— supprimé —'
                })()}</strong>
              </div>
            </div>

            {/* Boutons action */}
            <div style={{display:'flex',gap:4,marginBottom:12}}>
              <button onClick={function(){setRematchAction('match_existing')}} style={{flex:1,padding:'8px 10px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid '+(rematchAction==='match_existing'?'#009D3A':'#DDD'),background:rematchAction==='match_existing'?'#009D3A':'#fff',color:rematchAction==='match_existing'?'#fff':'#555',cursor:'pointer'}}>✓ Article existant</button>
              <button onClick={function(){setRematchAction('create_new')}} style={{flex:1,padding:'8px 10px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid '+(rematchAction==='create_new'?'#FF82D7':'#DDD'),background:rematchAction==='create_new'?'#FF82D7':'#fff',color:rematchAction==='create_new'?'#fff':'#555',cursor:'pointer'}}>+ Nouvel article</button>
              <button onClick={function(){setRematchAction('fees_taxes')}} style={{flex:1,padding:'8px 10px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid '+(rematchAction==='fees_taxes'?'#888':'#DDD'),background:rematchAction==='fees_taxes'?'#888':'#fff',color:rematchAction==='fees_taxes'?'#fff':'#555',cursor:'pointer'}}>— Frais/taxes</button>
            </div>

            {/* Sub-form match_existing */}
            {rematchAction === 'match_existing' && (
              <div>
                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Chercher dans le catalogue</div>
                <input value={rematchSearch} onChange={function(e){setRematchSearch(e.target.value)}} placeholder="Tapez un nom d'article..." style={{width:'100%',padding:'8px 10px',fontSize:12,border:'1.5px solid #DDD',borderRadius:6,marginBottom:6}} autoFocus />
                {rematchSearchLow.length >= 1 && rematchFilteredArticles.map(function(a){
                  var sel = rematchTargetArticleId === a.id
                  return (
                    <div key={a.id} onClick={function(){setRematchTargetArticleId(a.id)}} style={{padding:'7px 10px',fontSize:12,background:sel?'#E8F8EE':'#fff',borderRadius:5,cursor:'pointer',marginBottom:3,border:'1.5px solid '+(sel?'#009D3A':'#F0F0F0')}}>
                      {a.name} <span style={{opacity:.4,fontSize:10}}>· {a.unit} · {a.category}</span>
                      {sel && <span style={{float:'right',color:'#009D3A',fontWeight:900}}>✓</span>}
                    </div>
                  )
                })}
                {rematchSearchLow.length >= 1 && rematchFilteredArticles.length === 0 && (
                  <div style={{padding:10,fontSize:11,opacity:.5,textAlign:'center'}}>Aucun article trouvé. Crée un nouvel article si nécessaire.</div>
                )}
              </div>
            )}

            {/* Sub-form create_new */}
            {rematchAction === 'create_new' && (
              <div>
                <div style={{marginBottom:8}}>
                  <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Nom de l&apos;article *</div>
                  <input value={rematchNewArticle.name} onChange={function(e){
                    var v = e.target.value
                    setRematchNewArticle(function(prev){return Object.assign({}, prev, {name: v})})
                  }} style={{width:'100%',padding:'8px 10px',fontSize:13,fontWeight:700,border:'1.5px solid #DDD',borderRadius:6}} autoFocus />
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Catégorie</div>
                    <select value={rematchNewArticle.category} onChange={function(e){
                      var v = e.target.value
                      setRematchNewArticle(function(prev){return Object.assign({}, prev, {category: v})})
                    }} style={{width:'100%',padding:'7px 8px',fontSize:11,border:'1.5px solid #DDD',borderRadius:5}}>
                      <option value="ingredient">Ingrédient</option>
                      <option value="boisson">Boisson</option>
                      <option value="packaging">Packaging</option>
                      <option value="consommable">Consommable</option>
                    </select>
                  </div>
                  <div>
                    <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Unité master</div>
                    <select value={rematchNewArticle.master_unit} onChange={function(e){
                      var v = e.target.value
                      setRematchNewArticle(function(prev){return Object.assign({}, prev, {master_unit: v})})
                    }} style={{width:'100%',padding:'7px 8px',fontSize:11,border:'1.5px solid #DDD',borderRadius:5}}>
                      <option value="kg">kg</option>
                      <option value="L">L</option>
                      <option value="U">unité</option>
                    </select>
                  </div>
                </div>
                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Mode d&apos;imputation</div>
                <select value={rematchNewArticle.cost_imputation_mode} onChange={function(e){
                  var v = e.target.value
                  setRematchNewArticle(function(prev){return Object.assign({}, prev, {cost_imputation_mode: v})})
                }} style={{width:'100%',padding:'7px 8px',fontSize:11,border:'1.5px solid #DDD',borderRadius:5,marginBottom:8}}>
                  <option value="recipe_ingredient">Ingrédient classique d&apos;une recette</option>
                  <option value="recipe_overhead_per_unit">Forfait par recette (ex: beurre)</option>
                  <option value="monthly_overhead">Charge fixe mensuelle (ex: entretien)</option>
                </select>
              </div>
            )}

            {/* Sub-form fees_taxes */}
            {rematchAction === 'fees_taxes' && (
              <div style={{fontSize:12,padding:10,background:'#F8F8F8',borderRadius:6,marginBottom:8}}>
                Cette ligne sera <strong>supprimée de l&apos;historique des prix</strong> et n&apos;apparaîtra plus comme un produit. Le current_price du produit actuel sera recalculé automatiquement.
              </div>
            )}

            {/* Checkbox suppression alias */}
            {rematchLine.article_original && (
              <label style={{display:'flex',alignItems:'flex-start',gap:6,marginTop:10,padding:'8px 10px',background:'#FFEBE6',borderRadius:6,fontSize:11,cursor:'pointer',border:'1px solid #FF9500'}}>
                <input type="checkbox" checked={rematchDeleteAlias} onChange={function(){setRematchDeleteAlias(!rematchDeleteAlias)}} style={{marginTop:2}} />
                <span>Supprimer aussi l&apos;alias mémorisé <strong>« {rematchLine.article_original} »</strong> pour que les prochaines factures ne fassent plus la même erreur.</span>
              </label>
            )}

            {/* Footer actions */}
            <div style={{display:'flex',gap:6,justifyContent:'flex-end',marginTop:14}}>
              <button onClick={closeRematch} disabled={rematchSaving} style={{padding:'10px 14px',borderRadius:8,border:'1.5px solid #DDD',background:'#fff',fontWeight:900,fontSize:12,cursor:'pointer'}}>Annuler</button>
              <button onClick={doRematch} disabled={!isRematchValid() || rematchSaving} style={{padding:'10px 14px',borderRadius:8,border:'none',background:isRematchValid()?'#FF82D7':'#EEE',color:isRematchValid()?'#fff':'#888',fontWeight:900,fontSize:12,cursor:isRematchValid()?'pointer':'not-allowed'}}>{rematchSaving ? '…' : '✅ Confirmer la correction'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= SOUS-VUE ANOMALIES ============= */}
      {subView === 'anomalies' && (
        <div>
          {outliers.length === 0 ? (
            <div style={{padding:30,textAlign:'center',background:'#fff',borderRadius:10,border:'1px dashed #DDD'}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontSize:13,fontWeight:900,color:'#009D3A'}}>Aucune anomalie détectée</div>
              <div style={{fontSize:11,opacity:.6,marginTop:4}}>Tous les prix de l&apos;historique semblent cohérents (écart &lt; ±50% vs médiane par produit).</div>
            </div>
          ) : (
            <div>
              <div style={{padding:'10px 14px',background:'#FFE5F0',borderRadius:8,border:'1.5px solid #CC0066',marginBottom:14}}>
                <div style={{fontSize:13,fontWeight:900,color:'#CC0066'}}>🚨 {outliers.length} prix suspect{outliers.length > 1 ? 's' : ''} détecté{outliers.length > 1 ? 's' : ''}</div>
                <div style={{fontSize:11,opacity:.75,marginTop:2}}>Écart &gt; ±50% vs la médiane du même produit. Ouvre la facture, corrige le conditionnement ou supprime la ligne erronée.</div>
              </div>

              {outliers.map(function(a){
                var editing = editingAnomalyId === a.id
                var draftPP = parseFloat(String(anomalyDraft.pack_price || '0').replace(',', '.'))
                var draftQ = parseFloat(String(anomalyDraft.master_qty_per_pack || '0').replace(',', '.'))
                var draftMUP = (draftPP > 0 && draftQ > 0) ? draftPP / draftQ : 0

                return (
                  <div key={a.id} style={{background:'#fff',border:'1.5px solid '+(editing ? '#FF82D7' : '#FFB0D7'),borderRadius:10,padding:'12px 14px',marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:900,color:'#191923'}}>{a.product_name}</div>
                        <div style={{fontSize:11,color:'#666',marginTop:2}}>
                          {a.supplier_name} · {fmtDate(a.invoice_date)}
                          {a.pack_label && <span> · {a.pack_label}</span>}
                        </div>
                        {a.article_original && a.article_original !== a.product_name && (
                          <div style={{fontSize:10,opacity:.55,marginTop:2,fontStyle:'italic'}}>Sur la facture : « {a.article_original} »</div>
                        )}
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontSize:14,fontWeight:900,color:'#CC0066'}}>{fmt(a.master_unit_price)}€/{a.unit}</div>
                        <div style={{fontSize:10,color:'#888'}}>médiane : {fmt(a.median)}€/{a.unit}</div>
                        <div style={{padding:'2px 8px',background:'#CC0066',color:'#fff',borderRadius:10,fontSize:10,fontWeight:900,marginTop:3,display:'inline-block'}}>{a.reason}</div>
                      </div>
                    </div>

                    {!editing && (
                      <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                        {(a.invoice_path || a.invoice_filename) && (
                          <button onClick={function(){openInvoiceSource(a.invoice_path, a.invoice_filename)}} style={{padding:'6px 12px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid #191923',background:'#fff',cursor:'pointer'}}>📄 Voir la facture</button>
                        )}
                        <button onClick={function(){startEditAnomaly(a)}} style={{padding:'6px 12px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid #FF82D7',background:'#FF82D7',color:'#fff',cursor:'pointer'}}>✏️ Corriger</button>
                        <button onClick={function(){deleteAnomaly(a)}} disabled={anomalySaving} style={{padding:'6px 12px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid #CC0066',background:'#fff',color:'#CC0066',cursor:anomalySaving?'not-allowed':'pointer'}}>🗑 Supprimer cette ligne</button>
                      </div>
                    )}

                    {editing && (
                      <div onClick={function(e){e.stopPropagation()}} style={{marginTop:12,padding:12,background:'#FFF5FB',borderRadius:8,border:'1px solid #FFB0D7'}}>
                        <div style={{fontSize:11,fontWeight:900,color:'#CC0066',marginBottom:8}}>Corriger le conditionnement</div>
                        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:8,marginBottom:8}}>
                          <div>
                            <label style={{display:'block',fontSize:10,fontWeight:900,color:'#555',marginBottom:3,textTransform:'uppercase',letterSpacing:.3}}>Libellé pack</label>
                            <input type="text" value={anomalyDraft.pack_label} onChange={function(e){setAnomalyDraft(Object.assign({}, anomalyDraft, {pack_label: e.target.value}))}} placeholder="ex: Bidon 5L" style={{width:'100%',padding:'7px 10px',fontSize:12,border:'1.5px solid #DDD',borderRadius:6,boxSizing:'border-box'}} />
                          </div>
                          <div>
                            <label style={{display:'block',fontSize:10,fontWeight:900,color:'#555',marginBottom:3,textTransform:'uppercase',letterSpacing:.3}}>Prix pack (€)</label>
                            <input type="text" inputMode="decimal" value={anomalyDraft.pack_price} onChange={function(e){setAnomalyDraft(Object.assign({}, anomalyDraft, {pack_price: e.target.value}))}} placeholder="0.00" style={{width:'100%',padding:'7px 10px',fontSize:12,fontWeight:700,border:'1.5px solid #DDD',borderRadius:6,boxSizing:'border-box'}} />
                          </div>
                          <div>
                            <label style={{display:'block',fontSize:10,fontWeight:900,color:'#555',marginBottom:3,textTransform:'uppercase',letterSpacing:.3}}>Qté/pack ({a.unit})</label>
                            <input type="text" inputMode="decimal" value={anomalyDraft.master_qty_per_pack} onChange={function(e){setAnomalyDraft(Object.assign({}, anomalyDraft, {master_qty_per_pack: e.target.value}))}} placeholder="0" style={{width:'100%',padding:'7px 10px',fontSize:12,fontWeight:700,border:'1.5px solid #DDD',borderRadius:6,boxSizing:'border-box'}} />
                          </div>
                        </div>

                        {draftMUP > 0 && (
                          <div style={{padding:'6px 10px',background:'#E8F8EE',border:'1.5px solid #009D3A',borderRadius:6,marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                            <span style={{fontSize:11,fontWeight:700,color:'#005C24'}}>Nouveau prix calculé :</span>
                            <span style={{fontSize:14,fontWeight:900,color:'#005C24'}}>{draftMUP < 1 ? draftMUP.toFixed(3) : draftMUP.toFixed(2)} €/{a.unit}</span>
                          </div>
                        )}

                        <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                          <button onClick={cancelEditAnomaly} disabled={anomalySaving} style={{padding:'7px 12px',fontSize:11,fontWeight:900,borderRadius:6,border:'1.5px solid #DDD',background:'#fff',cursor:'pointer'}}>Annuler</button>
                          <button onClick={function(){saveAnomaly(a)}} disabled={anomalySaving || draftMUP <= 0} style={{padding:'7px 12px',fontSize:11,fontWeight:900,borderRadius:6,border:'none',background:draftMUP>0?'#009D3A':'#EEE',color:draftMUP>0?'#fff':'#888',cursor:(draftMUP>0&&!anomalySaving)?'pointer':'not-allowed'}}>{anomalySaving ? '…' : '✓ Enregistrer'}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
