'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RECIPES_DATA } from './data'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export default function SuppliersTab() {
  var [suppliers, setSuppliers] = useState([])
  var [products, setProducts] = useState([])
  var [prices, setPrices] = useState([])
  var [catFilter, setCatFilter] = useState('all')
  var [selectedSupplier, setSelectedSupplier] = useState(null)
  var [selectedProduct, setSelectedProduct] = useState(null)
  var [loading, setLoading] = useState(true)
  var [uploading, setUploading] = useState(false)
  var [uploadResult, setUploadResult] = useState(null)
  var [classifying, setClassifying] = useState(null)

  useEffect(function() {
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    Promise.all([
      sb().from('suppliers').select('*').order('name'),
      sb().from('products').select('*').order('name'),
      sb().from('product_prices').select('*').order('invoice_date', {ascending: true})
    ]).then(function(results) {
      if (results[0].data) setSuppliers(results[0].data)
      if (results[1].data) setProducts(results[1].data)
      if (results[2].data) setPrices(results[2].data)
      setLoading(false)
    })
  }

  function handleUpload(e) {
    var file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    var reader = new FileReader()
    reader.onload = function() {
      var base64 = reader.result.split(',')[1]
      fetch('/api/import-invoice', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({pdfBase64: base64, fileName: file.name, mediaType: file.type})
      })
      .then(function(r) { return r.json() })
      .then(function(data) {
        setUploadResult(data)
        setUploading(false)
        if (data.matched && data.matched.length > 0) loadData()
      })
      .catch(function(err) {
        setUploading(false)
        alert('Erreur: ' + err.message)
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function classifyProduct(item, supplierId, category) {
    setClassifying(item.article)
    sb().from('products').insert({
      supplier_id: supplierId,
      name: item.article,
      unit: item.unite || 'kg',
      current_price: item.prix_unitaire_ht || 0,
      category: category || item.categorie || 'ingredient'
    }).select().then(function(res) {
      if (res.data && res.data[0]) {
        sb().from('product_prices').insert({
          product_id: res.data[0].id,
          price: item.prix_unitaire_ht,
          invoice_date: uploadResult ? uploadResult.date : new Date().toISOString().split('T')[0],
          invoice_filename: null
        }).then(function() {
          setClassifying(null)
          setUploadResult(function(prev) {
            if (!prev) return prev
            var newUnmatched = prev.unmatched.filter(function(u) { return u.article !== item.article })
            var newMatched = prev.matched.concat([{article: item.article, matched_to: item.article, score: 100, old_price: 0, new_price: item.prix_unitaire_ht, change_pct: 0}])
            return {fournisseur: prev.fournisseur, date: prev.date, total_ht: prev.total_ht, matched: newMatched, unmatched: newUnmatched, lignes: prev.lignes}
          })
          loadData()
        })
      } else {
        setClassifying(null)
        alert('Erreur insertion')
      }
    })
  }

  function getRecipesForProduct(productName) {
    var found = []
    RECIPES_DATA.forEach(function(r) {
      if (!r.ingredients) return
      r.ingredients.forEach(function(ing) {
        var ingName = (ing.article || '').toLowerCase()
        var pName = productName.toLowerCase()
        if (ingName === pName || ingName.indexOf(pName) > -1 || pName.indexOf(ingName) > -1) {
          if (found.indexOf(r.name) === -1) found.push(r.name)
        }
      })
    })
    return found
  }

  function getProductPrices(productId) {
    return prices.filter(function(p) { return p.product_id === productId })
  }

  function renderPriceChart(priceHistory, unit) {
    if (!priceHistory || priceHistory.length < 2) return null
    var vals = priceHistory.map(function(p) { return p.price })
    var minV = Math.min.apply(null, vals) * 0.95
    var maxV = Math.max.apply(null, vals) * 1.05
    var range = maxV - minV || 1
    var w = 280
    var h = 120
    var pad = 30
    var chartW = w - pad * 2
    var chartH = h - pad * 2
    var points = priceHistory.map(function(p, i) {
      var x = pad + (i / (priceHistory.length - 1)) * chartW
      var y = pad + chartH - ((p.price - minV) / range) * chartH
      return x + ',' + y
    })
    var areaPoints = points.join(' ') + ' ' + (pad + chartW) + ',' + (pad + chartH) + ' ' + pad + ',' + (pad + chartH)
    var labels = priceHistory.map(function(p, i) {
      var x = pad + (i / (priceHistory.length - 1)) * chartW
      var d = new Date(p.invoice_date)
      var label = d.toLocaleDateString('fr-FR', {month: 'short', year: '2-digit'})
      return {x: x, label: label, price: p.price}
    })
    return (
      <svg viewBox={"0 0 " + w + " " + h} style={{width:'100%',maxWidth:300,height:'auto'}}>
        <polygon points={areaPoints} fill="#FF82D7" opacity="0.15" />
        <polyline points={points.join(' ')} fill="none" stroke="#FF82D7" strokeWidth="2.5" />
        {labels.map(function(l, i) {
          return (
            <g key={i}>
              <circle cx={l.x} cy={pad + chartH - ((l.price - minV) / range) * chartH} r="4" fill="#FFEB5A" stroke="#191923" strokeWidth="2" />
              <text x={l.x} y={h - 4} textAnchor="middle" style={{fontSize:8,fill:'#888',fontFamily:'Arial Narrow'}}>{l.label}</text>
              <text x={l.x} y={pad + chartH - ((l.price - minV) / range) * chartH - 8} textAnchor="middle" style={{fontSize:8,fontWeight:900,fill:'#191923',fontFamily:'Arial Narrow'}}>{l.price.toFixed(2)}</text>
            </g>
          )
        })}
      </svg>
    )
  }

  var filteredSuppliers = catFilter === 'all' ? suppliers : suppliers.filter(function(s) { return s.category === catFilter })

  if (loading) return <div style={{padding:40,textAlign:'center',opacity:0.5}}>Chargement...</div>

  // PRODUCT DETAIL VIEW
  if (selectedProduct) {
    var prod = selectedProduct
    var sup = suppliers.find(function(s) { return s.id === prod.supplier_id })
    var priceHist = getProductPrices(prod.id)
    var recipes = getRecipesForProduct(prod.name)
    var lastPrice = priceHist.length > 0 ? priceHist[priceHist.length - 1].price : prod.current_price
    var firstPrice = priceHist.length > 0 ? priceHist[0].price : prod.current_price
    var totalPct = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice * 100).toFixed(1) : '0'
    return (
      <div>
        <div onClick={function(){setSelectedProduct(null)}} style={{cursor:'pointer',fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginBottom:12}}>← Retour {sup ? sup.name : ''}</div>
        <div style={{background:'#fff',border:'2px solid #FF82D7',borderRadius:12,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontFamily:'Yellowtail',fontSize:24,color:'#191923'}}>{prod.name}</div>
              <div style={{fontSize:12,color:'#FF82D7',fontWeight:700,marginTop:2}}>{sup ? sup.name : ''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:28,fontWeight:900,color:'#191923'}}>{Number(prod.current_price).toFixed(2)} €<span style={{fontSize:14,color:'#888',fontWeight:400}}>/{prod.unit}</span></div>
              {priceHist.length > 1 && <div style={{fontSize:12,fontWeight:900,color:totalPct > 0 ? '#CC0066' : '#009D3A'}}>{totalPct > 0 ? '+' : ''}{totalPct}%</div>}
            </div>
          </div>
          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Utilisé dans</div>
          {recipes.length > 0 ? recipes.map(function(r) {
            return <span key={r} style={{display:'inline-block',padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:900,margin:3,background:'#FFEB5A',color:'#191923',border:'2px solid #191923',textTransform:'uppercase'}}>{r}</span>
          }) : <span style={{fontSize:13,color:'#888',fontWeight:700}}>Hors recettes</span>}
          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Évolution du prix</div>
          {priceHist.length >= 2 ? renderPriceChart(priceHist, prod.unit) : <div style={{fontSize:13,color:'#888'}}>Pas encore d'historique</div>}
          <div style={{fontFamily:'Yellowtail',fontSize:16,color:'#FF82D7',marginTop:20,marginBottom:8}}>Historique factures</div>
          {priceHist.length > 0 ? priceHist.slice().reverse().map(function(ph, i) {
            var prev = i < priceHist.length - 1 ? priceHist[priceHist.length - 2 - i] : null
            var diff = prev ? ((ph.price - prev.price) / prev.price * 100) : 0
            return (
              <div key={ph.id} style={{display:'flex',justifyContent:'space-between',fontSize:13,padding:'8px 0',borderBottom:'1px solid #F5F5F5',alignItems:'center'}}>
                <span style={{fontWeight:700,minWidth:80}}>{new Date(ph.invoice_date).toLocaleDateString('fr-FR')}</span>
                <span style={{fontWeight:900}}>{Number(ph.price).toFixed(2)} €/{prod.unit}</span>
                {prev ? <span style={{fontWeight:900,color:diff > 0 ? '#CC0066' : diff < 0 ? '#009D3A' : '#888'}}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}%</span> : <span style={{color:'#888'}}>—</span>}
                {ph.invoice_filename && <span style={{fontSize:11,color:'#888'}}>{ph.invoice_filename}</span>}
              </div>
            )
          }) : <div style={{fontSize:13,color:'#888'}}>Aucune facture</div>}
        </div>
      </div>
    )
  }

  // MAIN LIST VIEW
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,marginBottom:14}}>
        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontFamily:'Yellowtail',fontSize:13,color:'#191923'}}>Filtrer :</span>
          {[{v:'all',l:'TOUS'},{v:'ingredient',l:'INGRÉDIENTS'},{v:'packaging',l:'PACKAGING'},{v:'consommable',l:'CONSOMMABLES'}].map(function(c) {
            return <button key={c.v} onClick={function(){setCatFilter(c.v)}} style={{padding:'5px 14px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:catFilter===c.v?'#FFEB5A':'transparent',color:'#191923',cursor:'pointer',textTransform:'uppercase',fontFamily:'Arial Narrow, Arial, sans-serif'}}>{c.l}</button>
          })}
        </div>
        <label style={{padding:'8px 18px',fontSize:12,fontWeight:900,borderRadius:20,border:'2px solid #FF82D7',background:'#FF82D7',color:'#fff',cursor:'pointer',textTransform:'uppercase',fontFamily:'Arial Narrow, Arial, sans-serif'}}>
          {uploading ? '⏳ ANALYSE...' : '📄 UPLOAD FACTURE'}
          <input type="file" accept=".pdf,image/*" onChange={handleUpload} style={{display:'none'}} disabled={uploading} />
        </label>
      </div>

      {uploadResult && (
        <div style={{background:'#fff',border:'2px solid #FFEB5A',borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{fontFamily:'Yellowtail',fontSize:18,color:'#191923',marginBottom:8}}>Résultat import — {uploadResult.fournisseur}</div>
          <div style={{fontSize:12,color:'#888',marginBottom:10}}>{uploadResult.date} · {uploadResult.total_ht ? uploadResult.total_ht.toFixed(2) + ' € HT' : ''}</div>

          {uploadResult.matched && uploadResult.matched.length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:900,color:'#009D3A',marginBottom:6}}>✅ {uploadResult.matched.length} produit{uploadResult.matched.length > 1 ? 's' : ''} reconnu{uploadResult.matched.length > 1 ? 's' : ''} — prix mis à jour</div>
              {uploadResult.matched.map(function(m, i) {
                return (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'4px 0',borderBottom:'1px solid #F0F0F0'}}>
                    <span style={{fontWeight:700}}>{m.article} → {m.matched_to}</span>
                    <span style={{fontWeight:900,color:m.change_pct > 0 ? '#CC0066' : m.change_pct < 0 ? '#009D3A' : '#888'}}>{Number(m.old_price).toFixed(2)} → {Number(m.new_price).toFixed(2)} €{m.change_pct !== 0 ? ' (' + (m.change_pct > 0 ? '+' : '') + m.change_pct.toFixed(1) + '%)' : ''}</span>
                  </div>
                )
              })}
            </div>
          )}

          {uploadResult.unmatched && uploadResult.unmatched.length > 0 && (
            <div>
              <div style={{fontSize:12,fontWeight:900,color:'#CC0066',marginBottom:6}}>⚠️ {uploadResult.unmatched.length} produit{uploadResult.unmatched.length > 1 ? 's' : ''} non reconnu{uploadResult.unmatched.length > 1 ? 's' : ''}</div>
              {uploadResult.unmatched.map(function(u, i) {
                return (
                  <div key={i} style={{background:'#FFF9D0',border:'2px solid #FFEB5A',borderRadius:8,padding:10,marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontWeight:900,fontSize:13}}>📦 {u.article}</div>
                        <div style={{fontSize:11,color:'#888'}}>{u.article_original} · {u.prix_unitaire_ht ? u.prix_unitaire_ht.toFixed(2) : '?'} €/{u.unite}</div>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                      {uploadResult.supplier_id && <button disabled={classifying===u.article} onClick={function(){classifyProduct(u, uploadResult.supplier_id, u.categorie)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#fff',cursor:'pointer'}}>
                        {classifying===u.article ? '...' : '✅ Ajouter (' + (u.categorie || 'ingredient') + ')'}
                      </button>}
                      {suppliers.filter(function(s){return s.id !== uploadResult.supplier_id}).slice(0, 3).map(function(s) {
                        return <button key={s.id} disabled={classifying===u.article} onClick={function(){classifyProduct(u, s.id, u.categorie)}} style={{padding:'4px 12px',fontSize:11,fontWeight:900,borderRadius:20,border:'1px solid #DDD',background:'#fff',cursor:'pointer'}}>
                          {s.name}
                        </button>
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {uploadResult.matched && uploadResult.matched.length > 0 && (!uploadResult.unmatched || uploadResult.unmatched.length === 0) && (
            <button onClick={function(){setUploadResult(null)}} style={{padding:'6px 16px',fontSize:11,fontWeight:900,borderRadius:20,border:'2px solid #191923',background:'#FFEB5A',color:'#191923',cursor:'pointer',marginTop:8}}>OK, FERMER</button>
          )}
        </div>
      )}

      {filteredSuppliers.map(function(s) {
        var supProducts = products.filter(function(p) { return p.supplier_id === s.id })
        var catBadge = s.category === 'ingredient' ? {bg:'#FFEB5A',color:'#191923',label:'Ingrédients'} : s.category === 'packaging' ? {bg:'#FF82D7',color:'#FFF',label:'Packaging'} : {bg:'#E8E8E8',color:'#555',label:'Consommable'}
        return (
          <div key={s.id} style={{background:'#fff',border:'2px solid #191923',borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingBottom:10,borderBottom:'2px solid #FFEB5A',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontWeight:900,fontSize:16,textTransform:'uppercase',letterSpacing:0.5}}>{s.name}</span>
                <span style={{display:'inline-block',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900,background:catBadge.bg,color:catBadge.color,textTransform:'uppercase'}}>{catBadge.label}</span>
              </div>
              <span style={{fontFamily:'Yellowtail',fontSize:12,color:'#888'}}>{supProducts.length} produits</span>
            </div>
            {supProducts.map(function(p) {
              var recipes = getRecipesForProduct(p.name)
              return (
                <div key={p.id} onClick={function(){setSelectedProduct(p)}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 8px',borderBottom:'1px solid #F0F0F0',cursor:'pointer',borderRadius:6}} onMouseOver={function(e){e.currentTarget.style.background='#FFEB5A'}} onMouseOut={function(e){e.currentTarget.style.background='transparent'}}>
                  <div>
                    <div style={{fontWeight:900,fontSize:14}}>{p.name}</div>
                    <div style={{marginTop:3}}>
                      {recipes.length > 0 ? recipes.slice(0, 4).map(function(r) {
                        return <span key={r} style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,margin:2,background:'#FFF3B0',color:'#8A6D00',border:'1px solid #EED980',textTransform:'uppercase'}}>{r}</span>
                      }) : <span style={{display:'inline-block',padding:'2px 8px',borderRadius:10,fontSize:9,fontWeight:900,background:'#E8E8E8',color:'#555',border:'1px solid #CCC',textTransform:'uppercase'}}>Hors recettes</span>}
                      {recipes.length > 4 && <span style={{fontSize:10,color:'#888',marginLeft:4}}>+{recipes.length - 4}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:16,fontWeight:900,color:'#191923'}}>{Number(p.current_price).toFixed(2)} €</span>
                    <span style={{fontSize:11,color:'#888',marginLeft:2}}>/{p.unit}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
