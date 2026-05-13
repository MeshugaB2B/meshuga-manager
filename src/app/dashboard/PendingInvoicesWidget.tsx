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
// PendingInvoicesWidget — file d'attente des factures Zapier à valider
// Affichage : badge compact en haut du dashboard + modal de validation rapide
// =============================================================================

export default function PendingInvoicesWidget(props) {
  var [pendingList, setPendingList] = useState([])
  var [loading, setLoading] = useState(true)
  var [modalOpen, setModalOpen] = useState(false)
  var [selectedInvoice, setSelectedInvoice] = useState(null)
  var [editingLines, setEditingLines] = useState([])
  var [validating, setValidating] = useState(false)
  var [promotionPrompt, setPromotionPrompt] = useState(null)

  useEffect(function(){
    loadPending()
    // Refresh toutes les 60 secondes
    var interval = setInterval(loadPending, 60000)
    return function(){ clearInterval(interval) }
  }, [])

  function loadPending() {
    var c = sb()
    c.from('v_pending_invoices_summary').select('*').then(function(res){
      setPendingList(res.data || [])
      setLoading(false)
    })
  }

  function openInvoice(inv) {
    var c = sb()
    c.from('pending_invoices').select('*').eq('id', inv.id).single().then(function(res){
      if (res.data) {
        setSelectedInvoice(res.data)
        // Préparer les lignes éditables depuis extracted_data.matched + suggestions
        var ed = res.data.extracted_data || {}
        var lines = []
        ;(ed.matched || []).forEach(function(m){
          lines.push({
            type: 'matched',
            article: m.article,
            article_original: m.article_original,
            matched_to: m.matched_to,
            matched_id: m.matched_id,
            score: m.score,
            old_price: m.old_price,
            new_price: m.new_price,
            change_pct: m.change_pct,
            quantite: m.quantite,
            unite: m.unite,
            include: true,
            modified: false
          })
        })
        ;(ed.suggestions || []).forEach(function(s){
          lines.push({
            type: 'suggestion',
            article: s.article,
            article_original: s.article_original,
            matched_to: s.suggested_match,
            matched_id: s.suggested_match_id,
            score: s.suggested_score,
            new_price: s.prix_unitaire_ht,
            include: false,
            modified: false
          })
        })
        ;(ed.unmatched || []).forEach(function(u){
          lines.push({
            type: 'unmatched',
            article: u.article,
            article_original: u.article_original,
            new_price: u.prix_unitaire_ht,
            include: false,
            modified: false
          })
        })
        setEditingLines(lines)
        setModalOpen(true)
      }
    })
  }

  function toggleInclude(idx) {
    var copy = editingLines.slice()
    copy[idx].include = !copy[idx].include
    copy[idx].modified = true
    setEditingLines(copy)
  }

  function updatePrice(idx, newPrice) {
    var copy = editingLines.slice()
    copy[idx].new_price = Number(newPrice) || 0
    copy[idx].modified = true
    setEditingLines(copy)
  }

  function quickValidate() {
    // Valide tel quel : prend seulement les "matched" qui sont include=true
    submitValidation(false)
  }

  function submitValidation(wasModified) {
    if (!selectedInvoice) return
    setValidating(true)
    var toCommit = editingLines.filter(function(l){ return l.include && l.matched_id }).map(function(l){
      return {
        matched_id: l.matched_id,
        matched_to: l.matched_to,
        new_price: l.new_price,
        change_pct: l.change_pct || 0
      }
    })
    var modCount = editingLines.filter(function(l){ return l.modified }).length
    fetch('/api/invoices/validate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        pending_id: selectedInvoice.id,
        matched_lines: toCommit,
        was_modified: wasModified || modCount > 0,
        modified_lines: modCount
      })
    }).then(function(r){ return r.json() }).then(function(res){
      setValidating(false)
      if (res.ok) {
        if (res.promotion_eligible) {
          setPromotionPrompt({
            supplier_id: selectedInvoice.supplier_id,
            supplier_name: res.supplier_name,
            consecutive_clean: res.consecutive_clean
          })
        } else {
          closeModal()
          loadPending()
        }
      } else {
        alert('Erreur validation : ' + (res.error || 'inconnue'))
      }
    })
  }

  function rejectInvoice() {
    if (!selectedInvoice) return
    if (!confirm('Rejeter cette facture ? Elle ne sera pas commit en base.')) return
    setValidating(true)
    fetch('/api/invoices/reject', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ pending_id: selectedInvoice.id, reason: 'Rejet manuel' })
    }).then(function(r){ return r.json() }).then(function(){
      setValidating(false)
      closeModal()
      loadPending()
    })
  }

  function activateAutoCommit(enabled) {
    if (!promotionPrompt) return
    fetch('/api/invoices/promote-auto', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ supplier_id: promotionPrompt.supplier_id, enabled: enabled })
    }).then(function(r){ return r.json() }).then(function(){
      setPromotionPrompt(null)
      closeModal()
      loadPending()
    })
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedInvoice(null)
    setEditingLines([])
    setPromotionPrompt(null)
  }

  function fmtMoney(v) {
    if (v === null || v === undefined) return '—'
    return Number(v).toFixed(2) + ' €'
  }

  function fmtDate(s) {
    if (!s) return '—'
    return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  }

  if (loading || pendingList.length === 0) {
    return null  // pas afficher si rien à valider
  }

  // Statistiques rapides
  var nbCritical = pendingList.filter(function(p){ return p.has_anomaly }).length
  var totalAmount = pendingList.reduce(function(s, p){ return s + (Number(p.total_ttc) || 0) }, 0)

  return (
    <>
      <div style={{
        background: nbCritical > 0 ? 'linear-gradient(135deg, #fff5f0 0%, #ffefe5 100%)' : 'linear-gradient(135deg, #fff 0%, #fffbf0 100%)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        border: '2px solid ' + (nbCritical > 0 ? '#d85a30' : '#FFEB5A')
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <span style={{fontSize: 24}}>📥</span>
            <div>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', lineHeight: 1}}>
                {pendingList.length} facture{pendingList.length > 1 ? 's' : ''} à valider
              </div>
              <div style={{fontSize: 11, color: '#555', marginTop: 2}}>
                {totalAmount > 0 ? fmtMoney(totalAmount) + ' TTC' : ''}
                {nbCritical > 0 ? (totalAmount > 0 ? ' · ' : '') + '⚠️ ' + nbCritical + ' avec anomalie' : ''}
              </div>
            </div>
          </div>
          <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
            {pendingList.slice(0, 3).map(function(p){
              return (
                <button key={p.id} type="button" onClick={function(){ openInvoice(p) }} style={{
                  padding: '6px 10px',
                  background: p.has_anomaly ? '#ffd6c4' : '#FFEB5A',
                  color: '#191923',
                  border: '1px solid #DDD',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontFamily: 'Arial Narrow, Arial, sans-serif'
                }}>
                  {p.supplier_name || p.fournisseur_extracted || 'Inconnu'} · {fmtMoney(p.total_ttc)}
                  {p.has_anomaly ? ' ⚠️' : ''}
                </button>
              )
            })}
            {pendingList.length > 3 && (
              <button type="button" onClick={function(){ openInvoice(pendingList[0]) }} style={{
                padding: '6px 10px', background: '#191923', color: '#FFEB5A',
                border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 900, cursor: 'pointer'
              }}>+ {pendingList.length - 3} autres</button>
            )}
          </div>
        </div>
      </div>

      {/* MODAL de validation */}
      {modalOpen && selectedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={closeModal}>
          <div style={{
            background: '#fff', borderRadius: 14, maxWidth: 900, width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: 18
          }} onClick={function(e){ e.stopPropagation() }}>
            {/* Header */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
              <div>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 28, color: '#191923', lineHeight: 1}}>
                  {selectedInvoice.fournisseur_extracted || 'Facture'}
                </div>
                <div style={{fontSize: 12, color: '#555', marginTop: 4}}>
                  📅 {fmtDate(selectedInvoice.invoice_date)} · 💰 {fmtMoney(selectedInvoice.total_ht)} HT · 📄 {selectedInvoice.nb_lines || 0} lignes · 📁 {selectedInvoice.file_name}
                </div>
              </div>
              <button type="button" onClick={closeModal} style={{
                width: 32, height: 32, border: 'none', background: '#EBEBEB', color: '#191923',
                borderRadius: 16, fontSize: 18, cursor: 'pointer'
              }}>×</button>
            </div>

            {/* Anomalies */}
            {selectedInvoice.has_anomaly && (
              <div style={{
                background: '#fff5f0', border: '1px solid #ffd6c4', borderRadius: 8,
                padding: 12, marginBottom: 14
              }}>
                <div style={{fontSize: 12, fontWeight: 900, color: '#d85a30', marginBottom: 4}}>⚠️ ANOMALIES DÉTECTÉES</div>
                {(selectedInvoice.anomaly_reasons || []).map(function(r, i){
                  return <div key={i} style={{fontSize: 12, color: '#d85a30', lineHeight: 1.5}}>• {r}</div>
                })}
              </div>
            )}

            {/* Promotion auto-commit prompt */}
            {promotionPrompt && (
              <div style={{
                background: 'linear-gradient(135deg, #FFEB5A 0%, #fff3a8 100%)',
                border: '2px solid #191923', borderRadius: 8, padding: 14, marginBottom: 14
              }}>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', lineHeight: 1, marginBottom: 8}}>
                  🎉 {promotionPrompt.supplier_name} mérite l&apos;auto-commit ?
                </div>
                <div style={{fontSize: 13, color: '#191923', marginBottom: 10, lineHeight: 1.5}}>
                  Tu as validé <b>{promotionPrompt.consecutive_clean} factures consécutives sans modification</b> de ce fournisseur.
                  Activer l&apos;auto-commit : les prochaines factures seront commitées <b>sans review</b> (sauf si anomalie détectée).
                </div>
                <div style={{display: 'flex', gap: 8}}>
                  <button type="button" onClick={function(){ activateAutoCommit(true) }} style={{
                    padding: '8px 14px', background: '#191923', color: '#FFEB5A', border: 'none',
                    borderRadius: 6, fontSize: 12, fontWeight: 900, cursor: 'pointer'
                  }}>✅ Activer auto-commit</button>
                  <button type="button" onClick={function(){ activateAutoCommit(false) }} style={{
                    padding: '8px 14px', background: '#fff', color: '#191923', border: '1px solid #DDD',
                    borderRadius: 6, fontSize: 12, fontWeight: 900, cursor: 'pointer'
                  }}>Plus tard</button>
                </div>
              </div>
            )}

            {/* Mode rapide button */}
            {!promotionPrompt && editingLines.filter(function(l){ return l.type === 'matched' }).length > 0 && (
              <div style={{
                background: '#e8f8e0', border: '1px solid #009D3A', borderRadius: 8,
                padding: 10, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
              }}>
                <div style={{fontSize: 12, color: '#1a6b1a', flex: 1, minWidth: 200}}>
                  ⚡ <b>Mode rapide :</b> valider toutes les lignes matchées telles quelles ({editingLines.filter(function(l){ return l.type === 'matched' && l.include }).length} lignes)
                </div>
                <button type="button" onClick={quickValidate} disabled={validating} style={{
                  padding: '8px 14px', background: '#009D3A', color: '#fff', border: 'none',
                  borderRadius: 6, fontSize: 12, fontWeight: 900, cursor: validating ? 'wait' : 'pointer'
                }}>{validating ? '⏳ ...' : '⚡ Valider tel quel'}</button>
              </div>
            )}

            {/* Lignes */}
            {!promotionPrompt && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 100px 80px 80px 80px',
                  gap: 6, padding: '6px 8px', fontSize: 9, fontWeight: 900,
                  textTransform: 'uppercase', color: '#888', letterSpacing: 0.5,
                  borderBottom: '1px solid #EBEBEB'
                }}>
                  <div>OK</div>
                  <div>Article facture / matché</div>
                  <div style={{textAlign: 'right'}}>Ancien</div>
                  <div style={{textAlign: 'right'}}>Nouveau</div>
                  <div style={{textAlign: 'right'}}>Δ%</div>
                  <div style={{textAlign: 'right'}}>Score</div>
                </div>
                {editingLines.map(function(l, idx){
                  var bg = l.type === 'matched' ? '#fafafa' : (l.type === 'suggestion' ? '#fffbe5' : '#fff5f0')
                  var border = l.type === 'matched' ? '#EBEBEB' : (l.type === 'suggestion' ? '#FFEB5A' : '#ffd6c4')
                  var chgPct = l.change_pct
                  return (
                    <div key={idx} style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 100px 80px 80px 80px',
                      gap: 6, padding: '8px', marginTop: 4, background: bg,
                      borderRadius: 6, border: '1px solid ' + border, alignItems: 'center',
                      fontSize: 11
                    }}>
                      <div>
                        <input type="checkbox" checked={l.include} onChange={function(){ toggleInclude(idx) }} style={{width: 18, height: 18}}/>
                      </div>
                      <div>
                        <div style={{fontWeight: 900, color: '#191923'}}>
                          {l.matched_to || <span style={{color: '#d85a30'}}>⚠️ {l.article} (non matché)</span>}
                        </div>
                        <div style={{fontSize: 10, color: '#888', marginTop: 2}}>{l.article_original || l.article}</div>
                      </div>
                      <div style={{textAlign: 'right', color: '#555'}}>{fmtMoney(l.old_price)}</div>
                      <div style={{textAlign: 'right'}}>
                        <input
                          type="number"
                          step="0.001"
                          value={l.new_price}
                          onChange={function(e){ updatePrice(idx, e.target.value) }}
                          style={{
                            width: 70, padding: '3px 6px', border: '1px solid #DDD',
                            borderRadius: 4, fontSize: 11, textAlign: 'right',
                            fontFamily: 'Arial Narrow, Arial, sans-serif', fontWeight: 900
                          }}
                        />
                      </div>
                      <div style={{textAlign: 'right', fontWeight: 900, color: chgPct > 3 ? '#d85a30' : (chgPct < -3 ? '#009D3A' : '#555')}}>
                        {chgPct !== undefined && chgPct !== null ? (chgPct > 0 ? '+' : '') + Number(chgPct).toFixed(1) + '%' : '—'}
                      </div>
                      <div style={{textAlign: 'right', fontSize: 10, color: '#888'}}>{l.score || '—'}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Actions footer */}
            {!promotionPrompt && (
              <div style={{
                marginTop: 14, display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap'
              }}>
                <button type="button" onClick={rejectInvoice} disabled={validating} style={{
                  padding: '10px 16px', background: '#fff', color: '#d85a30', border: '2px solid #d85a30',
                  borderRadius: 8, fontSize: 12, fontWeight: 900, cursor: validating ? 'wait' : 'pointer'
                }}>❌ Rejeter cette facture</button>
                <button type="button" onClick={function(){ submitValidation(true) }} disabled={validating} style={{
                  padding: '10px 24px', background: '#FF82D7', color: '#fff', border: 'none',
                  borderRadius: 8, fontSize: 14, fontWeight: 900, cursor: validating ? 'wait' : 'pointer',
                  fontFamily: 'Arial Narrow, Arial, sans-serif'
                }}>{validating ? '⏳ Validation...' : '✅ Valider ' + editingLines.filter(function(l){ return l.include }).length + ' lignes'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
