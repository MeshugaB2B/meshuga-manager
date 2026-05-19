'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

// =============================================================================
// InvoicesReceivedWidget — "📥 Factures reçues" (compact + viewer PDF)
// 
// Par défaut : 5 dernières factures, header ultra-compact
// Bouton "Voir tout" : déploie filtres + 50 factures
// Click facture : expand inline avec bouton "👁️ Voir le PDF"
// Click "Voir le PDF" : modal plein écran avec X visible en haut à droite
// =============================================================================

function fmtDate(s) {
  if (!s) return '—'
  try {
    var d = new Date(s)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris'
    }).format(d)
  } catch (e) { return s }
}

function fmtDateOnly(s) {
  if (!s) return '—'
  try {
    var d = new Date(s)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', timeZone: 'Europe/Paris'
    }).format(d)
  } catch (e) { return s }
}

function fmtMontant(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€'
}

function fmtMontantPrecise(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function sourceLabel(src) {
  if (src === 'email_zapier' || src === 'zapier_email') return { label: '📧', color: '#005FFF', full: 'Email' }
  if (src === 'pennylane' || src === 'pennylane_api') return { label: '📊', color: '#9333EA', full: 'Pennylane' }
  if (src === 'manual_upload' || src === 'upload') return { label: '✋', color: '#FFA500', full: 'Manuel' }
  if (src === 'batch_historical') return { label: '📦', color: '#888', full: 'Historique' }
  return { label: '?', color: '#888', full: src || 'Inconnu' }
}

export default function InvoicesReceivedWidget() {
  var [invoices, setInvoices] = useState([])
  var [loading, setLoading] = useState(true)
  var [filterSource, setFilterSource] = useState('all')
  var [filterAnomalies, setFilterAnomalies] = useState(false)
  var [expanded, setExpanded] = useState(null)
  var [showAll, setShowAll] = useState(false)
  // 🔥 État pour le viewer PDF
  var [pdfViewing, setPdfViewing] = useState(null) // { filename, fournisseur, invoiceDate }

  useEffect(function() { loadInvoices() }, [])

  // Fermeture modal PDF avec touche ESC
  useEffect(function() {
    function handleEsc(e) {
      if (e.key === 'Escape' && pdfViewing) {
        setPdfViewing(null)
      }
    }
    if (pdfViewing) {
      window.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden' // empêche scroll background
    }
    return function() {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [pdfViewing])

  function loadInvoices() {
    setLoading(true)
    sb().from('pending_invoices')
      .select('id, source, file_name, fournisseur_extracted, invoice_number, invoice_date, total_ht, total_ttc, nb_lines, has_anomaly, anomaly_reasons, status, was_modified, is_credit_note, is_historical, created_at, committed_at, can_rollback_until, rollback_done')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(function(res) {
        var data = (res && res.data) || []
        setInvoices(data)
        setLoading(false)
      })
  }

  function openPdf(inv) {
    if (!inv.file_name) {
      alert('Pas de fichier PDF disponible pour cette facture.')
      return
    }
    setPdfViewing({
      filename: inv.file_name,
      fournisseur: inv.fournisseur_extracted || 'Inconnu',
      invoiceDate: inv.invoice_date,
      invoiceNumber: inv.invoice_number,
      totalTtc: inv.total_ttc
    })
  }

  // Filtres
  var filtered = invoices.filter(function(inv) {
    if (filterSource !== 'all' && inv.source !== filterSource) return false
    if (filterAnomalies && !inv.has_anomaly) return false
    return true
  })

  // KPIs derniers 7 jours
  var now = new Date()
  var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  var last7d = invoices.filter(function(i) { return i.created_at >= weekAgo })
  var nb7d = last7d.length
  var nbAnomalies = last7d.filter(function(i) { return i.has_anomaly }).length
  var totalTtc7d = last7d.reduce(function(s, i) { return s + (Number(i.total_ttc) || 0) }, 0)

  // Distinct sources pour les filtres
  var allSources = {}
  invoices.forEach(function(i) { if (i.source) allSources[i.source] = (allSources[i.source] || 0) + 1 })

  // 🎯 Nombre de factures affichées : 5 en compact, 50 en détaillé
  var displayLimit = showAll ? 50 : 5
  var displayedInvoices = filtered.slice(0, displayLimit)

  return (
    <>
      <div className="card" style={{marginBottom:10,borderLeft:'4px solid #005FFF'}}>
        {/* HEADER ULTRA-COMPACT - 1 LIGNE */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:showAll ? 8 : 4,flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <div style={{fontFamily:'Yellowtail',fontSize:20,color:'#191923',lineHeight:1}}>📥 Factures</div>
            <div style={{fontSize:11,color:'#666',display:'flex',alignItems:'center',gap:6}}>
              <span><b>{nb7d}</b> sur 7j</span>
              <span style={{color:'#ccc'}}>·</span>
              <span><b>{fmtMontant(totalTtc7d)}</b></span>
              {nbAnomalies > 0 && (
                <>
                  <span style={{color:'#ccc'}}>·</span>
                  <span style={{color:'#CC0066',fontWeight:900}}>⚠️ {nbAnomalies}</span>
                </>
              )}
            </div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            <button onClick={function(){setShowAll(!showAll)}} style={{background:showAll?'#191923':'#FFEB5A',color:showAll?'white':'#191923',border:'2px solid #191923',padding:'3px 10px',borderRadius:6,fontSize:10,fontWeight:900,cursor:'pointer'}}>
              {showAll ? '▲ Réduire' : '▼ Voir tout (' + invoices.length + ')'}
            </button>
            <button onClick={loadInvoices} title="Rafraîchir" style={{background:'transparent',border:'1.5px solid #ccc',padding:'3px 8px',borderRadius:6,fontSize:11,fontWeight:900,cursor:'pointer',color:'#666'}}>↻</button>
          </div>
        </div>

        {/* FILTRES - SEULEMENT EN MODE DÉTAILLÉ */}
        {showAll && (
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            <button onClick={function(){setFilterSource('all')}} style={{padding:'3px 9px',fontSize:10,fontWeight:900,borderRadius:12,border:'1.5px solid '+(filterSource==='all'?'#191923':'#ccc'),background:filterSource==='all'?'#FFEB5A':'white',cursor:'pointer'}}>Tous ({invoices.length})</button>
            {Object.keys(allSources).map(function(src) {
              var lbl = sourceLabel(src)
              var n = allSources[src]
              return (
                <button key={src} onClick={function(){setFilterSource(src)}} style={{padding:'3px 9px',fontSize:10,fontWeight:900,borderRadius:12,border:'1.5px solid '+(filterSource===src?'#191923':'#ccc'),background:filterSource===src?'#FFEB5A':'white',cursor:'pointer'}}>{lbl.label} {lbl.full} ({n})</button>
              )
            })}
            <button onClick={function(){setFilterAnomalies(!filterAnomalies)}} style={{padding:'3px 9px',fontSize:10,fontWeight:900,borderRadius:12,border:'1.5px solid '+(filterAnomalies?'#CC0066':'#ccc'),background:filterAnomalies?'#FFD6E8':'white',cursor:'pointer',color:filterAnomalies?'#CC0066':'#666'}}>⚠️ Anomalies</button>
          </div>
        )}

        {loading && <div style={{fontSize:11,opacity:.5,padding:8}}>Chargement…</div>}
        
        {!loading && displayedInvoices.length === 0 && (
          <div style={{fontSize:11,opacity:.5,padding:8,textAlign:'center'}}>Aucune facture {filterSource !== 'all' ? 'pour ce filtre' : 'reçue'}.</div>
        )}

        {/* LISTE COMPACTE DES FACTURES */}
        {!loading && displayedInvoices.map(function(inv) {
          var lbl = sourceLabel(inv.source)
          var isExpanded = expanded === inv.id
          return (
            <div key={inv.id}
              style={{
                border:'1px solid ' + (inv.has_anomaly ? '#CC0066' : '#eee'),
                borderRadius:6,
                padding:'6px 10px',
                marginBottom:4,
                background: inv.has_anomaly ? '#FFF5FA' : (inv.is_credit_note ? '#FFFDE8' : 'white'),
                transition:'background 0.15s',
                fontSize:12
              }}>
              {/* Ligne principale (clic = expand) */}
              <div 
                onClick={function(){setExpanded(isExpanded ? null : inv.id)}}
                style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,cursor:'pointer'}}>
                <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:6}}>
                  <span title={lbl.full} style={{fontSize:13,opacity:.7}}>{lbl.label}</span>
                  <span style={{fontWeight:900,color:'#191923',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.fournisseur_extracted || 'Inconnu'}</span>
                  {inv.is_credit_note && <span style={{padding:'1px 5px',background:'#FFA500',color:'white',borderRadius:8,fontSize:9,fontWeight:900}}>AVOIR</span>}
                  {inv.has_anomaly && <span title={(inv.anomaly_reasons||[]).join(' · ')} style={{padding:'1px 5px',background:'#CC0066',color:'white',borderRadius:8,fontSize:9,fontWeight:900}}>⚠️</span>}
                  {inv.rollback_done && <span style={{padding:'1px 5px',background:'#191923',color:'white',borderRadius:8,fontSize:9,fontWeight:900}}>RB</span>}
                  <span style={{color:'#888',fontSize:11,whiteSpace:'nowrap'}}>· {fmtDateOnly(inv.invoice_date)}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{fontWeight:900,fontSize:13,color:(Number(inv.total_ttc) < 0 ? '#FFA500' : '#191923'),whiteSpace:'nowrap'}}>{fmtMontant(inv.total_ttc)}</div>
                  <span style={{color:'#bbb',fontSize:10}}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Détail anomalie en aperçu si présent et non expandé */}
              {inv.has_anomaly && Array.isArray(inv.anomaly_reasons) && inv.anomaly_reasons.length > 0 && !isExpanded && (
                <div style={{marginTop:4,fontSize:10,color:'#CC0066',fontStyle:'italic'}}>
                  {inv.anomaly_reasons.slice(0,1).join(' · ')}
                  {inv.anomaly_reasons.length > 1 && ' · +' + (inv.anomaly_reasons.length - 1) + ' autre' + (inv.anomaly_reasons.length > 2 ? 's' : '')}
                </div>
              )}

              {/* Bloc déployé */}
              {isExpanded && (
                <div style={{marginTop:8,padding:10,background:'#F8F8F8',borderRadius:6,fontSize:11,color:'#444'}}>
                  {/* 🔥 BOUTON VOIR LE PDF EN PREMIER */}
                  {inv.file_name && (
                    <button 
                      onClick={function(e){ e.stopPropagation(); openPdf(inv) }}
                      style={{
                        background:'#191923',color:'white',border:'none',
                        padding:'8px 14px',borderRadius:6,fontSize:12,fontWeight:900,
                        cursor:'pointer',marginBottom:10,
                        display:'flex',alignItems:'center',gap:6
                      }}>
                      👁️ Voir le PDF
                    </button>
                  )}

                  {/* Détails */}
                  <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 12px'}}>
                    {inv.invoice_number && (<>
                      <span style={{color:'#888',fontWeight:700}}>N° facture :</span>
                      <span>{inv.invoice_number}</span>
                    </>)}
                    <span style={{color:'#888',fontWeight:700}}>Reçue le :</span>
                    <span>{fmtDate(inv.created_at)}</span>
                    <span style={{color:'#888',fontWeight:700}}>Source :</span>
                    <span>{lbl.label} {lbl.full}</span>
                    <span style={{color:'#888',fontWeight:700}}>Lignes :</span>
                    <span>{inv.nb_lines || 0}</span>
                    <span style={{color:'#888',fontWeight:700}}>Total HT :</span>
                    <span>{fmtMontantPrecise(inv.total_ht)}</span>
                    <span style={{color:'#888',fontWeight:700}}>Total TTC :</span>
                    <span>{fmtMontantPrecise(inv.total_ttc)}</span>
                    <span style={{color:'#888',fontWeight:700}}>Statut :</span>
                    <span style={{fontWeight:900,color: inv.status === 'committed' ? '#009D3A' : '#FFA500'}}>{inv.status}</span>
                    {inv.was_modified && (<>
                      <span style={{color:'#888',fontWeight:700}}>Modifié :</span>
                      <span>✓ Oui</span>
                    </>)}
                    {inv.is_historical && (<>
                      <span style={{color:'#888',fontWeight:700}}>Type :</span>
                      <span>📦 Rétroactif</span>
                    </>)}
                    {inv.file_name && (<>
                      <span style={{color:'#888',fontWeight:700}}>Fichier :</span>
                      <span style={{fontFamily:'monospace',fontSize:10,overflow:'hidden',textOverflow:'ellipsis'}}>{inv.file_name}</span>
                    </>)}
                  </div>

                  {/* Détail complet anomalies */}
                  {inv.has_anomaly && Array.isArray(inv.anomaly_reasons) && inv.anomaly_reasons.length > 0 && (
                    <div style={{marginTop:8,padding:8,background:'#FFE8F0',borderRadius:6,fontSize:11,color:'#CC0066'}}>
                      <div style={{fontWeight:900,marginBottom:4}}>⚠️ Anomalies détectées :</div>
                      {inv.anomaly_reasons.map(function(reason, idx) {
                        return <div key={idx} style={{marginBottom:idx < inv.anomaly_reasons.length - 1 ? 4 : 0}}>• {reason}</div>
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!loading && showAll && filtered.length > 50 && (
          <div style={{fontSize:11,color:'#888',padding:6,textAlign:'center'}}>+ {filtered.length - 50} factures plus anciennes…</div>
        )}
      </div>

      {/* 🔥 MODAL VIEWER PDF - PLEIN ÉCRAN AVEC X BIEN VISIBLE */}
      {pdfViewing && (
        <div 
          onClick={function(e){ if (e.target === e.currentTarget) setPdfViewing(null) }}
          style={{
            position:'fixed',
            top:0,left:0,right:0,bottom:0,
            background:'rgba(0,0,0,0.85)',
            zIndex:9999,
            display:'flex',
            flexDirection:'column',
            padding:0
          }}>
          {/* HEADER MODAL avec INFOS + BOUTON X TRÈS VISIBLE */}
          <div style={{
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center',
            padding:'12px 20px',
            background:'#191923',
            color:'white',
            borderBottom:'3px solid #FFEB5A'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:0}}>
              <span style={{fontSize:18}}>📄</span>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontWeight:900,fontSize:14,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pdfViewing.fournisseur}</div>
                <div style={{fontSize:11,opacity:0.7,display:'flex',gap:8,flexWrap:'wrap'}}>
                  {pdfViewing.invoiceNumber && <span>N° {pdfViewing.invoiceNumber}</span>}
                  <span>{fmtDateOnly(pdfViewing.invoiceDate)}</span>
                  <span style={{fontWeight:900}}>{fmtMontant(pdfViewing.totalTtc)}</span>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {/* Bouton télécharger */}
              <a 
                href={'/api/invoice-pdf?filename=' + encodeURIComponent(pdfViewing.filename)}
                download={pdfViewing.filename}
                style={{
                  background:'transparent',
                  color:'white',
                  border:'1.5px solid #fff',
                  padding:'6px 12px',
                  borderRadius:6,
                  fontSize:11,
                  fontWeight:900,
                  textDecoration:'none',
                  display:'flex',
                  alignItems:'center',
                  gap:4
                }}>
                ⬇ Télécharger
              </a>
              {/* 🔥 BOUTON FERMER ÉNORME ET ÉVIDENT */}
              <button 
                onClick={function(){ setPdfViewing(null) }}
                style={{
                  background:'#CC0066',
                  color:'white',
                  border:'none',
                  width:44,
                  height:44,
                  borderRadius:8,
                  fontSize:24,
                  fontWeight:900,
                  cursor:'pointer',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  lineHeight:1,
                  boxShadow:'0 2px 8px rgba(0,0,0,0.4)'
                }}
                title="Fermer (Échap)">
                ✕
              </button>
            </div>
          </div>

          {/* IFRAME PDF */}
          <div style={{flex:1,background:'#222',position:'relative'}}>
            <iframe
              src={'/api/invoice-pdf?filename=' + encodeURIComponent(pdfViewing.filename)}
              style={{
                width:'100%',
                height:'100%',
                border:'none',
                background:'white'
              }}
              title="Aperçu facture"
            />
          </div>

          {/* FOOTER avec rappel raccourci ESC */}
          <div style={{
            padding:'8px 20px',
            background:'#191923',
            color:'#888',
            fontSize:10,
            textAlign:'center'
          }}>
            Appuyez sur <kbd style={{background:'#444',padding:'2px 6px',borderRadius:4,color:'white'}}>Échap</kbd> ou cliquez sur ✕ pour fermer · Cliquez à l'extérieur du PDF pour fermer aussi
          </div>
        </div>
      )}
    </>
  )
}
