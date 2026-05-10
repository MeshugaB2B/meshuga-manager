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
// FoodCostInvoiceWizard
// Wizard 4 etapes : Upload -> Fournisseur -> Lignes -> Recap
// Aucune ligne ne reste "inconnue" : chaque ligne a une disposition obligatoire.
// =============================================================================
export default function FoodCostInvoiceWizard(props) {
  var isOpen = props.isOpen
  var onClose = props.onClose || function(){}
  var onSuccess = props.onSuccess || function(){}
  var toast = props.toast || function(m){ console.log(m) }

  // ============= STATE =============
  var [step, setStep] = useState(1)
  var [file, setFile] = useState(null) // { name, type, base64 }
  var [extractLoading, setExtractLoading] = useState(false)
  var [extractData, setExtractData] = useState(null) // reponse complete de /extract

  var [supplierChoice, setSupplierChoice] = useState(null)
  // Format : { id: 'uuid' | null, name: '', siret: '', email_domain: '', category: 'ingredient' }

  var [lines, setLines] = useState([]) // copie editable des lignes enrichies
  var [allArticles, setAllArticles] = useState([])
  var [allProducts, setAllProducts] = useState([])
  var [allSuppliers, setAllSuppliers] = useState([])

  var [committing, setCommitting] = useState(false)
  var [commitResult, setCommitResult] = useState(null)

  var [searchByLine, setSearchByLine] = useState({}) // {line_index: searchText} pour le dropdown article

  // ============= LIFECYCLE =============
  useEffect(function(){
    if (isOpen) {
      // Reset complet a l'ouverture
      setStep(1)
      setFile(null)
      setExtractLoading(false)
      setExtractData(null)
      setSupplierChoice(null)
      setLines([])
      setCommitting(false)
      setCommitResult(null)
      setSearchByLine({})
      // Charger les referentiels pour les dropdowns
      Promise.all([
        sb().from('articles').select('id, name, category, unit, cost_imputation_mode').order('name'),
        sb().from('products').select('id, name, supplier_id, article_id, current_price, unit').eq('is_active', true).order('name'),
        sb().from('suppliers').select('id, name, category, archived').order('name')
      ]).then(function(results){
        setAllArticles(results[0].data || [])
        setAllProducts(results[1].data || [])
        setAllSuppliers(results[2].data || [])
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  // ============= STEP 1 : UPLOAD =============
  function handleFileChange(e) {
    var f = e.target && e.target.files && e.target.files[0]
    if (!f) return
    setExtractLoading(true)
    var reader = new FileReader()
    reader.onload = function(ev){
      var b64 = ev.target ? String(ev.target.result).split(',')[1] : ''
      setFile({ name: f.name, type: f.type, base64: b64 })
      // Appel de la nouvelle route extract
      fetch('/api/import-invoice/extract', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ pdfBase64: b64, fileName: f.name, mediaType: f.type })
      }).then(function(r){ return r.json() }).then(function(data){
        if (data.error) { toast('Erreur extraction : ' + data.error); setExtractLoading(false); return }
        setExtractData(data)
        // Initialiser le choix fournisseur depuis la guess
        var sg = data.supplier_guess || {}
        setSupplierChoice({
          id: sg.matched_supplier_id || null,
          name: sg.raw_name || '',
          siret: sg.raw_siret || '',
          email_domain: sg.raw_email_domain || '',
          category: 'ingredient'
        })
        // Initialiser les lignes editables avec leur disposition par defaut
        var initLines = (data.lignes || []).map(function(l){
          return Object.assign({}, l, {
            // disposition utilisateur (ecrasable)
            disposition: l.suggested_disposition,
            // pour create_new : pre-remplir new_article
            new_article: {
              name: l.article_canonical || l.article_original || '',
              category: l.categorie || 'ingredient',
              master_unit: l.master_unit || 'kg',
              cost_imputation_mode: 'recipe_ingredient'
            },
            // sauvegarder l'alias par defaut quand le libelle facture differe du nom canonique
            save_alias: !!(l.article_original && l.matched_name && String(l.article_original).toLowerCase().trim() !== String(l.matched_name).toLowerCase().trim()),
            // ui state
            ui_expanded: l.suggested_disposition !== 'auto_match' && l.suggested_disposition !== 'fees_taxes'
          })
        })
        setLines(initLines)
        setExtractLoading(false)
        setStep(2)
      }).catch(function(err){
        toast('Erreur reseau : ' + (err.message || String(err)))
        setExtractLoading(false)
      })
    }
    reader.readAsDataURL(f)
  }

  // ============= STEP HELPERS =============
  function updateLine(idx, patch) {
    setLines(function(prev){
      return prev.map(function(l, i){ return i === idx ? Object.assign({}, l, patch) : l })
    })
  }

  function setLineDisposition(idx, newDisp, extra) {
    var patch = Object.assign({ disposition: newDisp, ui_expanded: true }, extra || {})
    updateLine(idx, patch)
  }

  function changeArticleForLine(idx, articleId) {
    var art = null
    var i
    for (i = 0; i < allArticles.length; i++) {
      if (allArticles[i].id === articleId) { art = allArticles[i]; break }
    }
    if (!art) return
    // Chercher si on a deja un product pour (article, supplier)
    var prodMatch = null
    if (supplierChoice && supplierChoice.id) {
      for (i = 0; i < allProducts.length; i++) {
        if (allProducts[i].article_id === articleId && allProducts[i].supplier_id === supplierChoice.id) {
          prodMatch = allProducts[i]; break
        }
      }
    }
    updateLine(idx, {
      disposition: 'match_existing',
      matched_article_id: articleId,
      matched_product_id: prodMatch ? prodMatch.id : null,
      matched_name: art.name,
      ui_expanded: false
    })
  }

  // ============= LINE VALIDITY =============
  function isLineValid(l) {
    if (l.disposition === 'fees_taxes') return true
    if (l.disposition === 'match_existing') return !!(l.matched_article_id || l.matched_product_id)
    if (l.disposition === 'create_new') {
      return !!(l.new_article && l.new_article.name && String(l.new_article.name).trim().length > 0
        && l.new_article.master_unit
        && l.new_article.category)
    }
    return false // manual_review = pas valide
  }

  function allLinesValid() {
    if (lines.length === 0) return false
    if (!lines.every(isLineValid)) return false
    // Bloquer si outliers non confirmés
    var hasUnacknowledgedOutlier = lines.some(function(l){
      if (l.outlier_acknowledged) return false
      var oi = getOutlierInfo(l)
      return oi !== null
    })
    if (hasUnacknowledgedOutlier) return false
    // Bloquer si extraction_warning sur une ligne non éditée par l'utilisateur
    var hasUneditedWarning = lines.some(function(l){
      if (l.disposition === 'fees_taxes') return false
      if (l.user_edited) return false
      return l.extraction_warning === 'pack_unknown' || (Number(l.master_unit_price || 0) <= 0 && l.disposition !== 'fees_taxes')
    })
    if (hasUneditedWarning) return false
    return true
  }

  function isSupplierValid() {
    if (!supplierChoice) return false
    if (supplierChoice.id) return true
    return supplierChoice.name && String(supplierChoice.name).trim().length >= 2
  }

  // ============= OUTLIER DETECTION (seuil ±50%) =============
  // Pour chaque ligne match_existing : compare master_unit_price extrait au current_price actuel
  // Retourne null si pas d'outlier, sinon { ratio, currentPrice, newPrice, severity }
  function getOutlierInfo(l) {
    if (l.disposition !== 'match_existing') return null
    if (!l.matched_product_id) return null
    var prod = allProducts.filter(function(p){ return p.id === l.matched_product_id })[0]
    if (!prod) return null
    var current = Number(prod.current_price || 0)
    var extracted = Number(l.master_unit_price || 0)
    if (current <= 0 || extracted <= 0) return null
    var ratio = extracted / current
    if (ratio >= 0.5 && ratio <= 1.5) return null // dans la zone normale ±50%
    var severity = (ratio > 3 || ratio < 0.33) ? 'critical' : 'warning'
    return {
      ratio: ratio,
      currentPrice: current,
      newPrice: extracted,
      severity: severity,
      pctChange: Math.round((ratio - 1) * 100),
      productName: prod.name,
      productUnit: prod.unit
    }
  }

  // Recalcul automatique master_unit_price quand l'utilisateur édite pack_price ou master_qty_per_pack
  function updateLinePack(lineIndex, field, value) {
    setLines(function(prev){
      var next = prev.slice()
      var l = Object.assign({}, next[lineIndex])
      l[field] = value
      // Si on a pack_price ET qty > 0, recalculer master_unit_price
      var pp = Number(field === 'pack_price' ? value : l.pack_price)
      var qpp = Number(field === 'master_qty_per_pack' ? value : l.master_qty_per_pack)
      if (pp > 0 && qpp > 0) {
        l.master_unit_price = pp / qpp
        l.outlier_acknowledged = true // l'utilisateur a corrigé manuellement, on l'autorise à passer
      }
      // Marquer que la ligne a été éditée par l'utilisateur (extraction_warning sautée)
      l.user_edited = true
      next[lineIndex] = l
      return next
    })
  }

  function acknowledgeOutlier(lineIndex) {
    setLines(function(prev){
      var next = prev.slice()
      next[lineIndex] = Object.assign({}, next[lineIndex], { outlier_acknowledged: true })
      return next
    })
  }

  // ============= COMMIT =============
  function doCommit() {
    if (committing) return
    setCommitting(true)
    var payload = {
      invoice_date: extractData ? extractData.invoice_date : new Date().toISOString().split('T')[0],
      file_name: file ? file.name : null,
      file_base64: file ? file.base64 : null,
      file_type: file ? file.type : null,
      total_ht: extractData ? extractData.total_ht : 0,
      supplier: {
        id: supplierChoice.id || null,
        name: supplierChoice.name,
        siret: supplierChoice.siret || null,
        email_domain: supplierChoice.email_domain || null,
        category: supplierChoice.category || 'ingredient'
      },
      lignes: lines.map(function(l){
        return {
          article_original: l.article_original,
          article_canonical: l.article_canonical,
          categorie: l.categorie,
          quantity: l.quantity,
          pack_label: l.pack_label,
          pack_price: l.pack_price,
          master_unit: l.master_unit,
          master_qty_per_pack: l.master_qty_per_pack,
          master_unit_price: l.master_unit_price,
          disposition: l.disposition,
          matched_product_id: l.matched_product_id || null,
          matched_article_id: l.matched_article_id || null,
          new_article: l.disposition === 'create_new' ? l.new_article : null,
          alias_for_article_id: null,
          save_alias: !!l.save_alias
        }
      })
    }
    fetch('/api/import-invoice/commit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    }).then(function(r){ return r.json() }).then(function(data){
      setCommitResult(data)
      setCommitting(false)
      if (data.ok) {
        var s = data.summary || {}
        var msg = '✅ ' + (s.price_history_inserted || 0) + ' prix enregistr&eacute;s'
        if (s.created_new) msg += ', ' + s.created_new + ' nouveaux articles'
        if (s.aliased) msg += ', ' + s.aliased + ' alias mémoris&eacute;s'
        toast(msg)
        onSuccess()
      } else {
        toast('Erreur commit : ' + (data.error || 'inconnue'))
      }
    }).catch(function(err){
      toast('Erreur reseau commit : ' + (err.message || String(err)))
      setCommitting(false)
    })
  }

  // ============= COMPUTED =============
  var stats = {
    auto_match: lines.filter(function(l){ return l.disposition === 'match_existing' && (l.match_type === 'exact_product' || l.match_type === 'alias' || l.match_confidence >= 90) }).length,
    manual_review: lines.filter(function(l){ return l.disposition === 'manual_review' || (l.disposition === 'match_existing' && l.match_confidence < 90 && l.match_type !== 'exact_product' && l.match_type !== 'alias') }).length,
    create_new: lines.filter(function(l){ return l.disposition === 'create_new' }).length,
    fees_taxes: lines.filter(function(l){ return l.disposition === 'fees_taxes' }).length,
    invalid: lines.filter(function(l){ return !isLineValid(l) }).length
  }

  // ============= COULEURS PAR DISPOSITION =============
  function dispColor(disp) {
    if (disp === 'match_existing') return '#009D3A'
    if (disp === 'create_new') return '#FF82D7'
    if (disp === 'fees_taxes') return '#888'
    if (disp === 'manual_review') return '#FF9500'
    return '#555'
  }
  function dispLabel(disp) {
    if (disp === 'match_existing') return '✓ Existant'
    if (disp === 'create_new') return '+ Nouveau'
    if (disp === 'fees_taxes') return '— Frais/taxes'
    if (disp === 'manual_review') return '⚠ À valider'
    return disp
  }

  // ============= RENDER =============
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={function(){ if (!extractLoading && !committing) onClose() }}>
      <div style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:0,width:'100%',maxWidth:680,maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={function(e){e.stopPropagation()}}>

        {/* HEADER avec stepper */}
        <div style={{padding:'16px 20px 12px',borderBottom:'1.5px solid #F0F0F0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923'}}>📄 Importer une facture</div>
            <div style={{display:'flex',gap:6,marginTop:6,alignItems:'center'}}>
              {[1,2,3,4].map(function(n){
                var done = step > n
                var current = step === n
                return (
                  <span key={n} style={{display:'inline-flex',alignItems:'center'}}>
                    <span style={{width:22,height:22,borderRadius:11,background:done?'#009D3A':(current?'#FF82D7':'#EEE'),color:(done||current)?'#fff':'#888',fontWeight:900,fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>{done?'✓':n}</span>
                    {n < 4 && <span style={{width:14,height:2,background:done?'#009D3A':'#EEE',marginLeft:2,marginRight:2}} />}
                  </span>
                )
              })}
              <span style={{fontSize:11,opacity:.6,marginLeft:6}}>
                {step === 1 ? 'Upload' : step === 2 ? 'Fournisseur' : step === 3 ? 'Lignes' : 'Récap'}
              </span>
            </div>
          </div>
          {!extractLoading && !committing && (
            <button style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}} onClick={onClose}>✕</button>
          )}
        </div>

        {/* CORPS scrollable */}
        <div style={{flex:1,overflowY:'auto',padding:20}}>

          {/* ====================== STEP 1 : UPLOAD ====================== */}
          {step === 1 && !extractLoading && (
            <div>
              <div style={{fontSize:13,color:'#555',marginBottom:16}}>Upload un PDF ou une photo de ta facture fournisseur. Claude va extraire toutes les lignes et te proposer un classement.</div>
              <label style={{display:'block',background:'#F8F9FF',border:'2px dashed #DDEEFF',borderRadius:10,padding:'30px 20px',textAlign:'center',cursor:'pointer'}}>
                <div style={{fontSize:32,marginBottom:8}}>📂</div>
                <div style={{fontWeight:900,fontSize:14,color:'#005FFF'}}>Choisir un PDF ou une photo</div>
                <div style={{fontSize:10,opacity:.5,marginTop:4}}>PNG / JPG / PDF</div>
                <input type="file" accept=".pdf,image/*" style={{display:'none'}} onChange={handleFileChange} />
              </label>
            </div>
          )}

          {extractLoading && (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>🧠</div>
              <div style={{fontWeight:900,fontSize:15}}>Claude lit la facture...</div>
              <div style={{fontSize:11,opacity:.5,marginTop:6}}>Extraction des lignes, conditionnement, prix unitaires...</div>
            </div>
          )}

          {/* ====================== STEP 2 : FOURNISSEUR ====================== */}
          {step === 2 && supplierChoice && extractData && (
            <div>
              <div style={{background:'#F8F9FF',borderRadius:10,padding:'12px 14px',marginBottom:16,border:'1.5px solid #DDEEFF'}}>
                <div style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,color:'#005FFF',marginBottom:4}}>🤖 Identification automatique</div>
                <div style={{fontSize:13}}>
                  Claude a lu : <strong>« {extractData.supplier_guess.raw_name || '—'} »</strong>
                  {extractData.supplier_guess.raw_siret && <span style={{opacity:.6}}> · SIRET {extractData.supplier_guess.raw_siret}</span>}
                </div>
                {extractData.supplier_guess.matched_supplier_id && extractData.supplier_guess.confidence >= 80 && (
                  <div style={{fontSize:11,color:'#009D3A',marginTop:4}}>✓ Identifi&eacute; avec confiance {extractData.supplier_guess.confidence}%</div>
                )}
                {!extractData.supplier_guess.matched_supplier_id && (
                  <div style={{fontSize:11,color:'#FF9500',marginTop:4}}>⚠ Aucun fournisseur connu ne correspond — confirme ou cr&eacute;e.</div>
                )}
              </div>

              <div style={{marginBottom:12}}>
                <div style={{fontSize:10,opacity:.5,marginBottom:4,textTransform:'uppercase',fontWeight:900}}>Choisir / confirmer le fournisseur</div>
                <div style={{display:'flex',gap:6,marginBottom:8}}>
                  <button onClick={function(){ setSupplierChoice(Object.assign({}, supplierChoice, {id: supplierChoice.id || (extractData.supplier_guess.matched_supplier_id || (allSuppliers[0] ? allSuppliers[0].id : null))})) }} style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1.5px solid '+(supplierChoice.id?'#191923':'#EEE'),background:supplierChoice.id?'#191923':'#F5F5F5',color:supplierChoice.id?'#FFEB5A':'#555',fontWeight:900,fontSize:12,cursor:'pointer'}}>
                    Existant
                  </button>
                  <button onClick={function(){ setSupplierChoice(Object.assign({}, supplierChoice, {id: null})) }} style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1.5px solid '+(!supplierChoice.id?'#FF82D7':'#EEE'),background:!supplierChoice.id?'#FF82D7':'#F5F5F5',color:!supplierChoice.id?'#fff':'#555',fontWeight:900,fontSize:12,cursor:'pointer'}}>
                    + Nouveau
                  </button>
                </div>

                {supplierChoice.id && (
                  <select value={supplierChoice.id} onChange={function(e){ setSupplierChoice(Object.assign({}, supplierChoice, {id: e.target.value})) }} style={{width:'100%',padding:'10px 12px',fontSize:14,fontWeight:900,border:'1.5px solid #DDD',borderRadius:8}}>
                    {allSuppliers.filter(function(s){ return !s.archived }).map(function(s){
                      return <option key={s.id} value={s.id}>{s.name}</option>
                    })}
                  </select>
                )}

                {!supplierChoice.id && (
                  <div>
                    <input value={supplierChoice.name} onChange={function(e){ setSupplierChoice(Object.assign({}, supplierChoice, {name: e.target.value})) }} placeholder="Nom commercial du fournisseur" style={{width:'100%',padding:'10px 12px',fontSize:14,fontWeight:700,border:'1.5px solid #DDD',borderRadius:8,marginBottom:6}} />
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                      <input value={supplierChoice.siret} onChange={function(e){ setSupplierChoice(Object.assign({}, supplierChoice, {siret: e.target.value})) }} placeholder="SIRET (optionnel)" style={{padding:'8px 10px',fontSize:12,border:'1.5px solid #DDD',borderRadius:6}} />
                      <input value={supplierChoice.email_domain} onChange={function(e){ setSupplierChoice(Object.assign({}, supplierChoice, {email_domain: e.target.value})) }} placeholder="Domaine email (optionnel)" style={{padding:'8px 10px',fontSize:12,border:'1.5px solid #DDD',borderRadius:6}} />
                    </div>
                    <select value={supplierChoice.category} onChange={function(e){ setSupplierChoice(Object.assign({}, supplierChoice, {category: e.target.value})) }} style={{width:'100%',padding:'8px 10px',fontSize:12,border:'1.5px solid #DDD',borderRadius:6}}>
                      <option value="ingredient">Ingr&eacute;dient</option>
                      <option value="boisson">Boisson</option>
                      <option value="packaging">Packaging</option>
                      <option value="consommable">Consommable</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{background:'#FFF8E1',borderRadius:8,padding:'10px 12px',fontSize:11,color:'#856B00',marginTop:12}}>
                💡 Le SIRET ou le domaine email permettent une identification automatique fiable des prochaines factures du m&ecirc;me fournisseur.
              </div>
            </div>
          )}

          {/* ====================== STEP 3 : LIGNES ====================== */}
          {step === 3 && extractData && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:6,marginBottom:14}}>
                <div style={{background:'#E8F8EE',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#009D3A'}}>{stats.auto_match}</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',color:'#009D3A'}}>Auto match</div>
                </div>
                <div style={{background:'#FFF1E0',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#FF9500'}}>{stats.manual_review}</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',color:'#FF9500'}}>À valider</div>
                </div>
                <div style={{background:'#FFE5F4',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#FF82D7'}}>{stats.create_new}</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',color:'#FF82D7'}}>Nouveaux</div>
                </div>
                <div style={{background:'#F0F0F0',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#888'}}>{stats.fees_taxes}</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',color:'#888'}}>Frais</div>
                </div>
              </div>

              {stats.invalid > 0 && (
                <div style={{background:'#FFEBE6',borderRadius:8,padding:'10px 12px',marginBottom:12,border:'1.5px solid #FF9500'}}>
                  <div style={{fontSize:11,fontWeight:900,color:'#CC0066'}}>⚠ {stats.invalid} ligne{stats.invalid > 1 ? 's' : ''} non résolue{stats.invalid > 1 ? 's' : ''}</div>
                  <div style={{fontSize:11,opacity:.7,marginTop:2}}>Chaque ligne doit avoir une destination avant de continuer.</div>
                </div>
              )}

              {/* === ALERTE OUTLIERS PRIX (écart >50% vs prix actuel) === */}
              {(function(){
                var outliers = lines.map(function(l, idx){
                  var oi = getOutlierInfo(l)
                  if (!oi || l.outlier_acknowledged) return null
                  return { idx: idx, info: oi, line: l }
                }).filter(function(x){ return x !== null })
                if (outliers.length === 0) return null
                return (
                  <div style={{background:'#FFEBE6',borderRadius:10,padding:'12px 14px',marginBottom:14,border:'2px solid #CC0066'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#CC0066',marginBottom:4}}>
                      🚨 {outliers.length} prix suspect{outliers.length > 1 ? 's' : ''} d&eacute;tect&eacute;{outliers.length > 1 ? 's' : ''}
                    </div>
                    <div style={{fontSize:11,opacity:.75,marginBottom:8}}>
                      &Eacute;cart &gt; 50% vs prix actuel en base. V&eacute;rifie le conditionnement avant de valider.
                    </div>
                  </div>
                )
              })()}

              {/* === ALERTE EXTRACTION_WARNING (conditionnement inconnu côté IA) === */}
              {(function(){
                var warns = lines.map(function(l, idx){
                  if (l.disposition === 'fees_taxes') return null
                  if (l.user_edited) return null
                  if (l.extraction_warning === 'pack_unknown' || (Number(l.master_unit_price || 0) <= 0 && l.disposition !== 'fees_taxes')) {
                    return { idx: idx, line: l }
                  }
                  return null
                }).filter(function(x){ return x !== null })
                if (warns.length === 0) return null
                return (
                  <div style={{background:'#FFF8E1',borderRadius:10,padding:'12px 14px',marginBottom:14,border:'2px solid #FF9500'}}>
                    <div style={{fontSize:13,fontWeight:900,color:'#856B00',marginBottom:4}}>
                      📦 {warns.length} ligne{warns.length > 1 ? 's' : ''} avec conditionnement &agrave; pr&eacute;ciser
                    </div>
                    <div style={{fontSize:11,opacity:.75}}>
                      Claude n&apos;a pas pu d&eacute;duire le conditionnement avec certitude. Saisis le pack et la quantit&eacute; ci-dessous.
                    </div>
                  </div>
                )
              })()}

              {lines.map(function(l, idx){
                var disp = l.disposition
                var color = dispColor(disp)
                var valid = isLineValid(l)
                var oi = getOutlierInfo(l)
                var hasOutlier = oi !== null && !l.outlier_acknowledged
                var hasPackWarning = !l.user_edited && (l.extraction_warning === 'pack_unknown' || (Number(l.master_unit_price || 0) <= 0 && disp !== 'fees_taxes'))
                var bgColor = hasOutlier ? '#FFEBE6' : (hasPackWarning ? '#FFF8E1' : (!valid ? '#FFF8E1' : '#fff'))
                var borderColor = hasOutlier ? '#CC0066' : (hasPackWarning ? '#FF9500' : (valid ? '#EEE' : '#FF9500'))

                return (
                  <div key={idx} style={{background:bgColor,borderRadius:8,padding:10,marginBottom:6,border:'1.5px solid '+borderColor}}>
                    {/* Ligne header */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:900}}>{l.article_original || l.article_canonical}</div>
                        <div style={{fontSize:10,opacity:.6}}>
                          {l.pack_label && <span>{l.pack_label} · </span>}
                          {fmt(l.pack_price)}€ HT · <strong>{fmt(l.master_unit_price)}€/{l.master_unit}</strong>
                          {l.vision_confidence < 70 && <span style={{color:'#FF9500'}}> · ⚠ lecture incertaine</span>}
                        </div>
                      </div>
                      <button onClick={function(){ updateLine(idx, {ui_expanded: !l.ui_expanded}) }} style={{background:color,color:disp==='fees_taxes'?'#fff':(disp==='match_existing'?'#fff':'#fff'),border:'none',padding:'4px 8px',borderRadius:6,fontSize:11,fontWeight:900,cursor:'pointer',whiteSpace:'nowrap'}}>
                        {dispLabel(disp)} {l.ui_expanded ? '▲' : '▼'}
                      </button>
                    </div>

                    {/* Encart OUTLIER : prix suspect vs prix actuel */}
                    {hasOutlier && (
                      <div style={{marginTop:8,padding:'8px 10px',background:'#fff',border:'1.5px solid #CC0066',borderRadius:6}}>
                        <div style={{fontSize:11,fontWeight:900,color:'#CC0066',marginBottom:4}}>
                          🚨 Prix {oi.pctChange > 0 ? '+' : ''}{oi.pctChange}% vs prix actuel ({fmt(oi.currentPrice)}€/{oi.productUnit})
                        </div>
                        <div style={{fontSize:10,opacity:.75,marginBottom:6}}>
                          Probable erreur de conditionnement OCR. V&eacute;rifie ou corrige ci-dessous.
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:6}}>
                          <label style={{fontSize:10,fontWeight:700}}>Pack label :</label>
                          <input type="text" value={l.pack_label || ''} onChange={function(e){ updateLinePack(idx, 'pack_label', e.target.value) }} placeholder="ex: Bidon 5L" style={{padding:'4px 8px',fontSize:11,border:'1px solid #DDD',borderRadius:4,minWidth:120}} />
                          <label style={{fontSize:10,fontWeight:700}}>Pack price (€) :</label>
                          <input type="number" step="0.01" value={l.pack_price || 0} onChange={function(e){ updateLinePack(idx, 'pack_price', Number(e.target.value)) }} style={{padding:'4px 8px',fontSize:11,border:'1px solid #DDD',borderRadius:4,width:80}} />
                          <label style={{fontSize:10,fontWeight:700}}>Qté/pack ({l.master_unit}) :</label>
                          <input type="number" step="0.01" value={l.master_qty_per_pack || 0} onChange={function(e){ updateLinePack(idx, 'master_qty_per_pack', Number(e.target.value)) }} style={{padding:'4px 8px',fontSize:11,border:'1px solid #DDD',borderRadius:4,width:70}} />
                          <span style={{fontSize:11,fontWeight:900,color:'#191923'}}>= {fmt(l.master_unit_price)} €/{l.master_unit}</span>
                        </div>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          <button onClick={function(){ acknowledgeOutlier(idx) }} style={{padding:'4px 10px',fontSize:10,fontWeight:900,borderRadius:6,border:'1.5px solid #CC0066',background:'#fff',color:'#CC0066',cursor:'pointer'}}>✓ Confirmer ce prix tel quel</button>
                          <button onClick={function(){ setLineDisposition(idx, 'fees_taxes') }} style={{padding:'4px 10px',fontSize:10,fontWeight:900,borderRadius:6,border:'1.5px solid #888',background:'#fff',color:'#888',cursor:'pointer'}}>Ignorer cette ligne</button>
                        </div>
                      </div>
                    )}

                    {/* Encart PACK_UNKNOWN : conditionnement non détecté */}
                    {!hasOutlier && hasPackWarning && (
                      <div style={{marginTop:8,padding:'8px 10px',background:'#fff',border:'1.5px solid #FF9500',borderRadius:6}}>
                        <div style={{fontSize:11,fontWeight:900,color:'#856B00',marginBottom:4}}>
                          📦 Conditionnement &agrave; pr&eacute;ciser
                        </div>
                        <div style={{fontSize:10,opacity:.75,marginBottom:6}}>
                          Claude n&apos;a pas pu d&eacute;duire le pack. Saisis-le manuellement.
                        </div>
                        <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                          <label style={{fontSize:10,fontWeight:700}}>Pack label :</label>
                          <input type="text" value={l.pack_label || ''} onChange={function(e){ updateLinePack(idx, 'pack_label', e.target.value) }} placeholder="ex: Bidon 5L" style={{padding:'4px 8px',fontSize:11,border:'1px solid #DDD',borderRadius:4,minWidth:120}} />
                          <label style={{fontSize:10,fontWeight:700}}>Pack price (€) :</label>
                          <input type="number" step="0.01" value={l.pack_price || 0} onChange={function(e){ updateLinePack(idx, 'pack_price', Number(e.target.value)) }} style={{padding:'4px 8px',fontSize:11,border:'1px solid #DDD',borderRadius:4,width:80}} />
                          <label style={{fontSize:10,fontWeight:700}}>Qté/pack ({l.master_unit}) :</label>
                          <input type="number" step="0.01" value={l.master_qty_per_pack || 0} onChange={function(e){ updateLinePack(idx, 'master_qty_per_pack', Number(e.target.value)) }} style={{padding:'4px 8px',fontSize:11,border:'1px solid #DDD',borderRadius:4,width:70}} />
                          <span style={{fontSize:11,fontWeight:900,color:'#191923'}}>= {fmt(l.master_unit_price)} €/{l.master_unit}</span>
                        </div>
                      </div>
                    )}

                    {/* Quand match_existing déjà résolu (compact) */}
                    {!l.ui_expanded && disp === 'match_existing' && l.matched_name && (
                      <div style={{fontSize:11,marginTop:4,paddingTop:4,borderTop:'1px dashed #EEE',color:'#009D3A'}}>
                        → <strong>{l.matched_name}</strong>
                        {l.match_confidence < 90 && <span style={{color:'#FF9500'}}> · confiance {l.match_confidence}%</span>}
                      </div>
                    )}

                    {/* Panel expand : choix de disposition */}
                    {l.ui_expanded && (
                      <div style={{marginTop:8,paddingTop:8,borderTop:'1px dashed #EEE'}}>
                        {/* Boutons disposition */}
                        <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap'}}>
                          <button onClick={function(){ setLineDisposition(idx, 'match_existing') }} style={{padding:'4px 8px',fontSize:10,fontWeight:900,borderRadius:6,border:'1.5px solid '+(disp==='match_existing'?'#009D3A':'#DDD'),background:disp==='match_existing'?'#009D3A':'#fff',color:disp==='match_existing'?'#fff':'#555',cursor:'pointer'}}>✓ Article existant</button>
                          <button onClick={function(){ setLineDisposition(idx, 'create_new') }} style={{padding:'4px 8px',fontSize:10,fontWeight:900,borderRadius:6,border:'1.5px solid '+(disp==='create_new'?'#FF82D7':'#DDD'),background:disp==='create_new'?'#FF82D7':'#fff',color:disp==='create_new'?'#fff':'#555',cursor:'pointer'}}>+ Nouvel article</button>
                          <button onClick={function(){ setLineDisposition(idx, 'fees_taxes') }} style={{padding:'4px 8px',fontSize:10,fontWeight:900,borderRadius:6,border:'1.5px solid '+(disp==='fees_taxes'?'#888':'#DDD'),background:disp==='fees_taxes'?'#888':'#fff',color:disp==='fees_taxes'?'#fff':'#555',cursor:'pointer'}}>— Frais/taxes</button>
                        </div>

                        {/* Sub-form match_existing */}
                        {disp === 'match_existing' && (function(){
                          var search = (searchByLine[idx] || '').toLowerCase()
                          var filtered = allArticles
                          if (search.length >= 1) {
                            filtered = allArticles.filter(function(a){ return String(a.name || '').toLowerCase().indexOf(search) >= 0 })
                          }
                          filtered = filtered.slice(0, 8)
                          return (
                            <div>
                              {l.suggestions && l.suggestions.length > 0 && (
                                <div style={{marginBottom:6}}>
                                  <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Suggestions Claude</div>
                                  {l.suggestions.map(function(s, si){
                                    var aId = s.article_id
                                    var selected = l.matched_article_id === aId
                                    return (
                                      <div key={si} onClick={function(){ if (aId) changeArticleForLine(idx, aId) }} style={{padding:'6px 8px',background:selected?'#E8F8EE':'#FAFAFA',borderRadius:6,fontSize:11,marginBottom:3,cursor:'pointer',border:'1px solid '+(selected?'#009D3A':'#EEE'),display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                        <div>
                                          <strong>{s.matched_name}</strong>
                                          <span style={{opacity:.5,marginLeft:6}}>· {Math.round(Number(s.similarity_score) * 100)}%</span>
                                        </div>
                                        {selected && <span style={{color:'#009D3A',fontWeight:900}}>✓</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Ou chercher dans le catalogue</div>
                              <input value={searchByLine[idx] || ''} onChange={function(e){
                                var v = e.target.value
                                setSearchByLine(function(prev){ return Object.assign({}, prev, {[idx]: v}) })
                              }} placeholder="Tapez un nom d'article..." style={{width:'100%',padding:'6px 8px',fontSize:11,border:'1.5px solid #DDD',borderRadius:6,marginBottom:4}} />
                              {search.length >= 1 && filtered.map(function(a){
                                var sel = l.matched_article_id === a.id
                                return (
                                  <div key={a.id} onClick={function(){ changeArticleForLine(idx, a.id) }} style={{padding:'5px 8px',fontSize:11,background:sel?'#E8F8EE':'#fff',borderRadius:4,cursor:'pointer',marginBottom:2,border:'1px solid '+(sel?'#009D3A':'#F0F0F0')}}>
                                    {a.name} <span style={{opacity:.4,fontSize:10}}>· {a.unit} · {a.category}</span>
                                  </div>
                                )
                              })}
                              {l.matched_article_id && l.article_original && String(l.article_original).toLowerCase() !== String(l.matched_name || '').toLowerCase() && (
                                <label style={{display:'flex',alignItems:'center',gap:6,marginTop:8,fontSize:11,cursor:'pointer'}}>
                                  <input type="checkbox" checked={!!l.save_alias} onChange={function(){ updateLine(idx, {save_alias: !l.save_alias}) }} />
                                  <span>Mémoriser <strong>« {l.article_original} »</strong> comme alias de <strong>{l.matched_name}</strong></span>
                                </label>
                              )}
                            </div>
                          )
                        })()}

                        {/* Sub-form create_new */}
                        {disp === 'create_new' && l.new_article && (
                          <div>
                            <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Nom de l&apos;article *</div>
                            <input value={l.new_article.name} onChange={function(e){
                              var v = e.target.value
                              updateLine(idx, {new_article: Object.assign({}, l.new_article, {name: v})})
                            }} style={{width:'100%',padding:'6px 8px',fontSize:12,fontWeight:700,border:'1.5px solid #DDD',borderRadius:6,marginBottom:6}} />

                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:6}}>
                              <div>
                                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Catégorie</div>
                                <select value={l.new_article.category} onChange={function(e){
                                  var v = e.target.value
                                  updateLine(idx, {new_article: Object.assign({}, l.new_article, {category: v})})
                                }} style={{width:'100%',padding:'5px 6px',fontSize:11,border:'1.5px solid #DDD',borderRadius:5}}>
                                  <option value="ingredient">Ingr&eacute;dient</option>
                                  <option value="boisson">Boisson</option>
                                  <option value="packaging">Packaging</option>
                                  <option value="consommable">Consommable</option>
                                </select>
                              </div>
                              <div>
                                <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Unit&eacute; master</div>
                                <select value={l.new_article.master_unit} onChange={function(e){
                                  var v = e.target.value
                                  updateLine(idx, {new_article: Object.assign({}, l.new_article, {master_unit: v})})
                                }} style={{width:'100%',padding:'5px 6px',fontSize:11,border:'1.5px solid #DDD',borderRadius:5}}>
                                  <option value="kg">kg</option>
                                  <option value="L">L</option>
                                  <option value="U">unit&eacute;</option>
                                </select>
                              </div>
                            </div>

                            <div style={{fontSize:10,opacity:.5,marginBottom:3,textTransform:'uppercase',fontWeight:900}}>Mode d&apos;imputation</div>
                            <select value={l.new_article.cost_imputation_mode} onChange={function(e){
                              var v = e.target.value
                              updateLine(idx, {new_article: Object.assign({}, l.new_article, {cost_imputation_mode: v})})
                            }} style={{width:'100%',padding:'5px 6px',fontSize:11,border:'1.5px solid #DDD',borderRadius:5,marginBottom:6}}>
                              <option value="recipe_ingredient">Ingr&eacute;dient classique d&apos;une recette</option>
                              <option value="recipe_overhead_per_unit">Forfait par recette (ex : beurre)</option>
                              <option value="monthly_overhead">Charge fixe mensuelle (ex : entretien)</option>
                            </select>

                            <div style={{fontSize:10,background:'#F0F0F0',padding:6,borderRadius:4,opacity:.7}}>
                              💡 Cr&eacute;era l&apos;article + le product chez {supplierChoice && supplierChoice.id ? (allSuppliers.find(function(s){ return s.id === supplierChoice.id }) || {}).name : supplierChoice ? supplierChoice.name : '—'} avec son conditionnement et son prix.
                            </div>
                          </div>
                        )}

                        {/* Sub-form fees_taxes */}
                        {disp === 'fees_taxes' && (
                          <div style={{fontSize:11,opacity:.7,padding:6,background:'#F8F8F8',borderRadius:6}}>
                            Cette ligne est consid&eacute;r&eacute;e comme un frais (livraison, taxe, remise) et ne sera pas comptabilis&eacute;e comme un produit.
                          </div>
                        )}

                        {/* Sub-form manual_review (cas initial) */}
                        {disp === 'manual_review' && (
                          <div style={{fontSize:11,padding:6,background:'#FFF8E1',borderRadius:6,color:'#856B00'}}>
                            Choisis une destination ci-dessus pour cette ligne.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ====================== STEP 4 : RECAP ====================== */}
          {step === 4 && !committing && !commitResult && (
            <div>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,marginBottom:12,color:'#191923'}}>Pr&ecirc;t à enregistrer ?</div>
              <div style={{background:'#F8F9FF',borderRadius:10,padding:'12px 14px',marginBottom:12,border:'1.5px solid #DDEEFF'}}>
                <div style={{fontSize:11,fontWeight:900,textTransform:'uppercase',marginBottom:6,color:'#005FFF'}}>Fournisseur</div>
                <div style={{fontSize:14,fontWeight:900}}>
                  {supplierChoice && supplierChoice.id
                    ? (allSuppliers.find(function(s){ return s.id === supplierChoice.id }) || {}).name
                    : (supplierChoice ? '+ Nouveau : ' + supplierChoice.name : '—')}
                </div>
                {extractData && <div style={{fontSize:11,opacity:.6,marginTop:2}}>Date : {extractData.invoice_date} · Total HT : {fmt(extractData.total_ht)}€</div>}
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:12}}>
                <div style={{background:'#E8F8EE',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#009D3A'}}>{lines.filter(function(l){ return l.disposition === 'match_existing' }).length}</div>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',color:'#009D3A'}}>Articles existants → prix mis à jour</div>
                </div>
                <div style={{background:'#FFE5F4',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#FF82D7'}}>{lines.filter(function(l){ return l.disposition === 'create_new' }).length}</div>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',color:'#FF82D7'}}>Nouveaux articles cr&eacute;&eacute;s</div>
                </div>
                <div style={{background:'#FFF8E1',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#856B00'}}>{lines.filter(function(l){ return l.save_alias }).length}</div>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',color:'#856B00'}}>Alias mémoris&eacute;s</div>
                </div>
                <div style={{background:'#F0F0F0',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#888'}}>{lines.filter(function(l){ return l.disposition === 'fees_taxes' }).length}</div>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',color:'#888'}}>Frais ignor&eacute;s</div>
                </div>
              </div>

              <div style={{fontSize:11,opacity:.6,padding:'8px 10px',background:'#FAFAFA',borderRadius:6}}>
                💡 Apr&egrave;s validation : les prix seront mis à jour, les nouveaux articles cr&eacute;&eacute;s, les alias enregistr&eacute;s pour faciliter les prochaines factures, et des t&acirc;ches de ren&eacute;go cr&eacute;&eacute;es pour les hausses &gt; 5%.
              </div>
            </div>
          )}

          {committing && (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:40,marginBottom:12}}>💾</div>
              <div style={{fontWeight:900,fontSize:15}}>Enregistrement en cours...</div>
            </div>
          )}

          {commitResult && commitResult.ok && (
            <div>
              <div style={{textAlign:'center',padding:'20px 10px',background:'#E8F8EE',borderRadius:10,marginBottom:14,border:'1.5px solid #009D3A'}}>
                <div style={{fontSize:36,marginBottom:6}}>✅</div>
                <div style={{fontWeight:900,fontSize:15,color:'#009D3A'}}>Facture enregistr&eacute;e</div>
              </div>
              {commitResult.summary && (
                <div style={{fontSize:12,padding:10,background:'#FAFAFA',borderRadius:8,marginBottom:10}}>
                  <div>📦 {commitResult.summary.price_history_inserted || 0} prix enregistr&eacute;s dans l&apos;historique</div>
                  {commitResult.summary.matched_existing > 0 && <div>🔄 {commitResult.summary.matched_existing} articles existants mis à jour</div>}
                  {commitResult.summary.created_new > 0 && <div>+ {commitResult.summary.created_new} nouveaux articles cr&eacute;&eacute;s</div>}
                  {commitResult.summary.aliased > 0 && <div>🏷️ {commitResult.summary.aliased} alias mémoris&eacute;s</div>}
                  {commitResult.summary.fees_ignored > 0 && <div>— {commitResult.summary.fees_ignored} frais ignor&eacute;s</div>}
                  {commitResult.summary.tasks_created > 0 && <div style={{color:'#CC0066',fontWeight:900,marginTop:6}}>⚠ {commitResult.summary.tasks_created} t&acirc;ches de ren&eacute;go cr&eacute;&eacute;es</div>}
                </div>
              )}
              {commitResult.errors && commitResult.errors.length > 0 && (
                <div style={{fontSize:11,padding:10,background:'#FFEBE6',borderRadius:8,marginBottom:10,border:'1px solid #FF9500'}}>
                  <div style={{fontWeight:900,marginBottom:4}}>{commitResult.errors.length} erreur(s)</div>
                  {commitResult.errors.slice(0, 5).map(function(err, ei){
                    return <div key={ei} style={{fontSize:10,opacity:.8}}>Ligne {err.line + 1} : {err.error}</div>
                  })}
                </div>
              )}
            </div>
          )}

          {commitResult && !commitResult.ok && (
            <div style={{textAlign:'center',padding:'20px',background:'#FFEBE6',borderRadius:10,border:'1.5px solid #CC0066'}}>
              <div style={{fontSize:36,marginBottom:6}}>❌</div>
              <div style={{fontWeight:900,fontSize:14,color:'#CC0066'}}>Erreur</div>
              <div style={{fontSize:11,marginTop:6,opacity:.8}}>{commitResult.error || 'Erreur inconnue'}</div>
            </div>
          )}

        </div>

        {/* FOOTER navigation */}
        {!extractLoading && !committing && (
          <div style={{padding:'12px 20px',borderTop:'1.5px solid #F0F0F0',display:'flex',justifyContent:'space-between',gap:8}}>
            {step > 1 && step < 4 && !commitResult && (
              <button onClick={function(){ setStep(step - 1) }} style={{padding:'10px 16px',borderRadius:8,border:'1.5px solid #DDD',background:'#fff',fontWeight:900,fontSize:12,cursor:'pointer'}}>← Pr&eacute;c&eacute;dent</button>
            )}
            {step === 1 && <span />}
            {commitResult && <span />}

            {step === 2 && (
              <button onClick={function(){ if (isSupplierValid()) setStep(3) }} disabled={!isSupplierValid()} style={{padding:'10px 16px',borderRadius:8,border:'none',background:isSupplierValid()?'#FF82D7':'#EEE',color:isSupplierValid()?'#fff':'#888',fontWeight:900,fontSize:13,cursor:isSupplierValid()?'pointer':'not-allowed',marginLeft:'auto'}}>Continuer →</button>
            )}

            {step === 3 && (
              <button onClick={function(){ if (allLinesValid()) setStep(4) }} disabled={!allLinesValid()} style={{padding:'10px 16px',borderRadius:8,border:'none',background:allLinesValid()?'#FF82D7':'#EEE',color:allLinesValid()?'#fff':'#888',fontWeight:900,fontSize:13,cursor:allLinesValid()?'pointer':'not-allowed',marginLeft:'auto'}}>Continuer → ({stats.invalid > 0 ? stats.invalid + ' à r&eacute;soudre' : 'OK'})</button>
            )}

            {step === 4 && !commitResult && (
              <button onClick={doCommit} style={{padding:'10px 16px',borderRadius:8,border:'none',background:'#FF82D7',color:'#fff',fontWeight:900,fontSize:13,cursor:'pointer',marginLeft:'auto'}}>✅ Confirmer et enregistrer</button>
            )}

            {commitResult && (
              <button onClick={onClose} style={{padding:'10px 16px',borderRadius:8,border:'none',background:'#191923',color:'#FFEB5A',fontWeight:900,fontSize:13,cursor:'pointer',marginLeft:'auto'}}>Fermer</button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
