'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

// =============================================================================
// InvoicesReceivedWidget — "📥 Factures reçues récemment"
// Affiche les dernières factures fournisseurs qui sont arrivées dans le système
// (via Zapier email, API Pennylane, ou upload manuel)
// 
// Sources possibles :
//   - 'email_zapier'      : forward email Outlook → Zapier → /api/import-invoice
//   - 'pennylane'         : sync API Pennylane (Marina, HPS, Norbert, DS Services)
//   - 'manual_upload'     : drag & drop dans le dashboard
//   - 'batch_historical'  : import en masse rétroactif
// =============================================================================

function fmtDate(s) {
  if (!s) return '—'
  try {
    var d = new Date(s)
    var paris = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris'
    })
    return paris.format(d)
  } catch (e) { return s }
}

function fmtDateOnly(s) {
  if (!s) return '—'
  try {
    var d = new Date(s)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
      timeZone: 'Europe/Paris'
    }).format(d)
  } catch (e) { return s }
}

function fmtMontant(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return '—'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function sourceLabel(src) {
  if (src === 'email_zapier' || src === 'zapier_email') return { label: '📧 Email', color: '#005FFF' }
  if (src === 'pennylane' || src === 'pennylane_api') return { label: '📊 Pennylane', color: '#9333EA' }
  if (src === 'manual_upload' || src === 'upload') return { label: '✋ Manuel', color: '#FFA500' }
  if (src === 'batch_historical') return { label: '📦 Historique', color: '#888' }
  return { label: src || '?', color: '#888' }
}

export default function InvoicesReceivedWidget() {
  var [invoices, setInvoices] = useState([])
  var [loading, setLoading] = useState(true)
  var [filterSource, setFilterSource] = useState('all')
  var [filterAnomalies, setFilterAnomalies] = useState(false)
  var [expanded, setExpanded] = useState(null)

  useEffect(function() { loadInvoices() }, [])

  function loadInvoices() {
    setLoading(true)
    sb().from('pending_invoices')
      .select('id, source, file_name, fournisseur_extracted, invoice_number, invoice_date, total_ht, total_ttc, nb_lines, has_anomaly, anomaly_reasons, status, was_modified, is_credit_note, is_historical, created_at, committed_at, can_rollback_until, rollback_done')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(function(res) {
        var data = (res && res.data) || []
        setInvoices(data)
        setLoading(false)
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

  return (
    <div className="card" style={{marginBottom:10,borderLeft:'4px solid #005FFF'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6,flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{fontFamily:'Yellowtail',fontSize:22,color:'#191923'}}>📥 Factures reçues</div>
          <div style={{fontSize:11,color:'#888'}}>{nb7d} factures · {fmtMontant(totalTtc7d)} · 7 derniers jours{nbAnomalies > 0 ? ' · ' : ''}{nbAnomalies > 0 ? <span style={{color:'#CC0066',fontWeight:900}}>{nbAnomalies} anomalie{nbAnomalies > 1 ? 's' : ''}</span> : null}</div>
        </div>
        <button onClick={loadInvoices} style={{background:'#FFEB5A',border:'2px solid #191923',padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:900,cursor:'pointer'}}>↻ Rafraîchir</button>
      </div>

      {/* Filtres */}
      <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
        <button onClick={function(){setFilterSource('all')}} style={{padding:'3px 9px',fontSize:10,fontWeight:900,borderRadius:12,border:'1.5px solid '+(filterSource==='all'?'#191923':'#ccc'),background:filterSource==='all'?'#FFEB5A':'white',cursor:'pointer'}}>Tous ({invoices.length})</button>
        {Object.keys(allSources).map(function(src) {
          var lbl = sourceLabel(src)
          var n = allSources[src]
          return (
            <button key={src} onClick={function(){setFilterSource(src)}} style={{padding:'3px 9px',fontSize:10,fontWeight:900,borderRadius:12,border:'1.5px solid '+(filterSource===src?'#191923':'#ccc'),background:filterSource===src?'#FFEB5A':'white',cursor:'pointer'}}>{lbl.label} ({n})</button>
          )
        })}
        <button onClick={function(){setFilterAnomalies(!filterAnomalies)}} style={{padding:'3px 9px',fontSize:10,fontWeight:900,borderRadius:12,border:'1.5px solid '+(filterAnomalies?'#CC0066':'#ccc'),background:filterAnomalies?'#FFD6E8':'white',cursor:'pointer',color:filterAnomalies?'#CC0066':'#666'}}>⚠️ Anomalies uniquement</button>
      </div>

      {loading && <div style={{fontSize:12,opacity:.5,padding:8}}>Chargement…</div>}
      
      {!loading && filtered.length === 0 && (
        <div style={{fontSize:12,opacity:.5,padding:12,textAlign:'center'}}>Aucune facture {filterSource !== 'all' ? 'pour ce filtre' : 'reçue récemment'}.</div>
      )}

      {!loading && filtered.slice(0, 20).map(function(inv) {
        var lbl = sourceLabel(inv.source)
        var isExpanded = expanded === inv.id
        return (
          <div key={inv.id} 
            onClick={function(){setExpanded(isExpanded ? null : inv.id)}}
            style={{
              border:'1.5px solid ' + (inv.has_anomaly ? '#CC0066' : '#e8e8e8'),
              borderRadius:8,
              padding:10,
              marginBottom:6,
              cursor:'pointer',
              background: inv.has_anomaly ? '#FFF5FA' : (inv.is_credit_note ? '#FFFDE8' : 'white'),
              transition:'background 0.15s'
            }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:3,flexWrap:'wrap'}}>
                  <span style={{padding:'2px 7px',background:lbl.color,color:'white',borderRadius:10,fontSize:9,fontWeight:900}}>{lbl.label}</span>
                  {inv.is_credit_note && <span style={{padding:'2px 7px',background:'#FFA500',color:'white',borderRadius:10,fontSize:9,fontWeight:900}}>AVOIR</span>}
                  {inv.is_historical && <span style={{padding:'2px 7px',background:'#888',color:'white',borderRadius:10,fontSize:9,fontWeight:900}}>RÉTRO</span>}
                  {inv.was_modified && <span style={{padding:'2px 7px',background:'#FF82D7',color:'#191923',borderRadius:10,fontSize:9,fontWeight:900}}>MODIFIÉE</span>}
                  {inv.has_anomaly && <span style={{padding:'2px 7px',background:'#CC0066',color:'white',borderRadius:10,fontSize:9,fontWeight:900}}>⚠️ ANOMALIE</span>}
                  {inv.rollback_done && <span style={{padding:'2px 7px',background:'#191923',color:'white',borderRadius:10,fontSize:9,fontWeight:900}}>ROLLBACK</span>}
                </div>
                <div style={{fontWeight:900,fontSize:14,color:'#191923',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{inv.fournisseur_extracted || 'Fournisseur inconnu'}</div>
                <div style={{fontSize:11,color:'#666',marginTop:2}}>
                  {inv.invoice_number ? 'N° ' + inv.invoice_number + ' · ' : ''}
                  {fmtDateOnly(inv.invoice_date)} · {inv.nb_lines || 0} ligne{(inv.nb_lines || 0) > 1 ? 's' : ''}
                </div>
              </div>
              <div style={{textAlign:'right',whiteSpace:'nowrap'}}>
                <div style={{fontWeight:900,fontSize:14,color: (Number(inv.total_ttc) < 0 ? '#FFA500' : '#191923')}}>{fmtMontant(inv.total_ttc)}</div>
                <div style={{fontSize:10,color:'#999',marginTop:2}}>{fmtDate(inv.created_at)}</div>
              </div>
            </div>

            {/* Détail anomalies si présent */}
            {inv.has_anomaly && Array.isArray(inv.anomaly_reasons) && inv.anomaly_reasons.length > 0 && (
              <div style={{marginTop:8,padding:8,background:'#FFE8F0',borderRadius:6,fontSize:11,color:'#CC0066'}}>
                {inv.anomaly_reasons.map(function(reason, idx) {
                  return <div key={idx} style={{marginBottom:idx < inv.anomaly_reasons.length - 1 ? 4 : 0}}>• {reason}</div>
                })}
              </div>
            )}

            {/* Bloc déployé : infos additionnelles */}
            {isExpanded && (
              <div style={{marginTop:8,padding:8,background:'#F8F8F8',borderRadius:6,fontSize:11,color:'#444'}}>
                <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:'4px 12px'}}>
                  <span style={{color:'#888',fontWeight:700}}>Fichier :</span>
                  <span style={{fontFamily:'monospace',fontSize:10}}>{inv.file_name || '—'}</span>
                  <span style={{color:'#888',fontWeight:700}}>Total HT :</span>
                  <span>{fmtMontant(inv.total_ht)}</span>
                  <span style={{color:'#888',fontWeight:700}}>Statut :</span>
                  <span style={{fontWeight:900,color: inv.status === 'committed' ? '#009D3A' : '#FFA500'}}>{inv.status}</span>
                  {inv.committed_at && <>
                    <span style={{color:'#888',fontWeight:700}}>Validée :</span>
                    <span>{fmtDate(inv.committed_at)}</span>
                  </>}
                  {inv.can_rollback_until && !inv.rollback_done && (
                    <>
                      <span style={{color:'#888',fontWeight:700}}>Rollback :</span>
                      <span>Possible jusqu'au {fmtDate(inv.can_rollback_until)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!loading && filtered.length > 20 && (
        <div style={{fontSize:11,color:'#888',padding:6,textAlign:'center'}}>+ {filtered.length - 20} factures plus anciennes…</div>
      )}
    </div>
  )
}
