// src/app/dashboard/BatchValidation.tsx
// Tableau récap des factures d'un batch d'import historique
// - Liste toutes les factures du batch
// - Filtres : fournisseur / type (facture/avoir) / anomalies
// - Validation en masse (1 clic = toutes les factures sans anomalie)
// - Validation individuelle ou par sélection
// - Modal détail pour les cas complexes (anomalies)

'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

type Invoice = {
  id: string
  file_name: string
  supplier_id: string | null
  fournisseur_extracted: string | null
  invoice_date: string | null
  invoice_number: string | null
  total_ht: number | null
  total_ttc: number | null
  nb_lines: number
  has_anomaly: boolean
  anomaly_reasons: string[]
  is_credit_note: boolean
  status: string
  created_at: string
}

type Batch = {
  id: string
  supplier_name: string | null
  total_files: number
  invoices_count: number
  credit_notes_count: number
  duplicates_count: number
  errors_count: number
  status: string
  date_range_start: string | null
  date_range_end: string | null
  created_at: string
}

type Props = {
  isOpen: boolean
  batchId: string | null
  onClose: () => void
  toast: (msg: string) => void
}

export default function BatchValidation(props: Props) {
  var [loading, setLoading] = useState(true)
  var [batch, setBatch] = useState<Batch | null>(null)
  var [invoices, setInvoices] = useState<Invoice[]>([])
  var [filterType, setFilterType] = useState<'all' | 'invoice' | 'credit_note' | 'anomalies'>('all')
  var [filterSupplier, setFilterSupplier] = useState<string>('all')
  var [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  var [processingAction, setProcessingAction] = useState(false)
  var [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null)

  useEffect(function() {
    if (!props.isOpen || !props.batchId) return
    loadBatch()
  }, [props.isOpen, props.batchId])

  function loadBatch() {
    if (!props.batchId) return
    setLoading(true)
    fetch('/api/import-invoice/batch/' + props.batchId).then(function(r) { return r.json() }).then(function(data) {
      if (data.error) {
        props.toast('Erreur : ' + data.error)
        setLoading(false)
        return
      }
      setBatch(data.batch)
      setInvoices(data.invoices || [])
      setLoading(false)
    }).catch(function(e) {
      props.toast('Erreur chargement batch : ' + e.message)
      setLoading(false)
    })
  }

  function toggleSelect(id: string) {
    setSelectedIds(function(prev) {
      var next = Object.assign({}, prev)
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  function selectAllVisible() {
    var visible = getFilteredInvoices()
    var pendingVisible = visible.filter(function(inv) { return inv.status === 'pending' })
    if (pendingVisible.length === 0) return
    var allSelected = pendingVisible.every(function(inv) { return selectedIds[inv.id] })
    if (allSelected) {
      // Tout désélectionner
      var next: Record<string, boolean> = {}
      Object.keys(selectedIds).forEach(function(k) {
        if (!pendingVisible.find(function(i) { return i.id === k })) next[k] = true
      })
      setSelectedIds(next)
    } else {
      // Tout sélectionner
      var next2 = Object.assign({}, selectedIds)
      pendingVisible.forEach(function(inv) { next2[inv.id] = true })
      setSelectedIds(next2)
    }
  }

  function getFilteredInvoices() {
    return invoices.filter(function(inv) {
      if (filterType === 'invoice' && inv.is_credit_note) return false
      if (filterType === 'credit_note' && !inv.is_credit_note) return false
      if (filterType === 'anomalies' && !inv.has_anomaly) return false
      if (filterSupplier !== 'all' && (inv.fournisseur_extracted || '') !== filterSupplier) return false
      return true
    })
  }

  async function validateAllClean() {
    if (!props.batchId) return
    if (!confirm('Valider toutes les factures du batch SANS anomalie ?')) return
    setProcessingAction(true)
    try {
      var response = await fetch('/api/import-invoice/batch/' + props.batchId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate_all_clean' })
      })
      var data = await response.json()
      if (data.error) {
        props.toast('Erreur : ' + data.error)
      } else {
        props.toast('✅ ' + data.validated_count + ' factures validées')
        loadBatch()
      }
    } catch (e: any) {
      props.toast('Erreur : ' + e.message)
    }
    setProcessingAction(false)
  }

  async function validateSelected() {
    if (!props.batchId) return
    var ids = Object.keys(selectedIds).filter(function(k) { return selectedIds[k] })
    if (ids.length === 0) { props.toast('Aucune sélection'); return }
    if (!confirm('Valider les ' + ids.length + ' factures sélectionnées ?')) return
    setProcessingAction(true)
    try {
      var response = await fetch('/api/import-invoice/batch/' + props.batchId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate_ids', invoice_ids: ids })
      })
      var data = await response.json()
      if (data.error) {
        props.toast('Erreur : ' + data.error)
      } else {
        props.toast('✅ ' + data.validated_count + ' factures validées')
        setSelectedIds({})
        loadBatch()
      }
    } catch (e: any) {
      props.toast('Erreur : ' + e.message)
    }
    setProcessingAction(false)
  }

  function fmt(n: number | null) {
    if (n === null || n === undefined) return '—'
    return (Math.round(Number(n) * 100) / 100).toFixed(2)
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    var parts = d.split('-')
    if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0]
    return d
  }

  if (!props.isOpen) return null

  var filtered = getFilteredInvoices()
  var suppliers = Array.from(new Set(invoices.map(function(i) { return i.fournisseur_extracted || 'Inconnu' }))).sort()
  
  var stats = {
    total: invoices.length,
    pending: invoices.filter(function(i) { return i.status === 'pending' }).length,
    validated: invoices.filter(function(i) { return i.status === 'validated' }).length,
    rejected: invoices.filter(function(i) { return i.status === 'rejected' }).length,
    anomalies: invoices.filter(function(i) { return i.has_anomaly && i.status === 'pending' }).length,
    clean: invoices.filter(function(i) { return !i.has_anomaly && i.status === 'pending' }).length
  }

  var selectedCount = Object.keys(selectedIds).filter(function(k) { return selectedIds[k] }).length

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12
    }} onClick={props.onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 0,
        width: '100%', maxWidth: 1100, maxHeight: '94vh',
        display: 'flex', flexDirection: 'column'
      }} onClick={function(e) { e.stopPropagation() }}>
        
        {/* HEADER */}
        <div style={{
          padding: '16px 20px', borderBottom: '2px solid #FFEB5A',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontFamily: "'Yellowtail',cursive", fontSize: 26, color: '#191923', lineHeight: 1 }}>
              👁️ Validation du batch
            </div>
            {batch && (
              <div style={{ fontSize: 11, opacity: .6, marginTop: 4 }}>
                {batch.supplier_name ? batch.supplier_name + ' · ' : ''}
                {batch.total_files} fichiers · 
                {batch.date_range_start && batch.date_range_end
                  ? ' du ' + fmtDate(batch.date_range_start) + ' au ' + fmtDate(batch.date_range_end)
                  : ''}
              </div>
            )}
          </div>
          <button style={{
            background: 'none', border: 'none', fontSize: 24,
            cursor: 'pointer', color: '#888'
          }} onClick={props.onClose}>✕</button>
        </div>

        {loading && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontWeight: 900 }}>Chargement du batch...</div>
          </div>
        )}

        {!loading && batch && (
          <>
            {/* STATS */}
            <div style={{
              padding: '12px 20px', background: '#FAFAFA',
              display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8
            }}>
              <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1.5px solid #EEE' }}>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 900 }}>Total</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{stats.total}</div>
              </div>
              <div style={{ background: '#FFFBE5', borderRadius: 8, padding: '8px 10px', border: '1.5px solid #FFEB5A' }}>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 900 }}>En attente</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{stats.pending}</div>
              </div>
              <div style={{ background: '#E8F8EC', borderRadius: 8, padding: '8px 10px', border: '1.5px solid #009D3A' }}>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 900, color: '#009D3A' }}>Sans anomalie</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#009D3A' }}>{stats.clean}</div>
              </div>
              <div style={{ background: '#FFE5E5', borderRadius: 8, padding: '8px 10px', border: '1.5px solid #CC0066' }}>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 900, color: '#CC0066' }}>Anomalies</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#CC0066' }}>{stats.anomalies}</div>
              </div>
              <div style={{ background: '#F3EBFA', borderRadius: 8, padding: '8px 10px', border: '1.5px solid #A06CD5' }}>
                <div style={{ fontSize: 9, opacity: .6, textTransform: 'uppercase', fontWeight: 900, color: '#A06CD5' }}>Validées</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#A06CD5' }}>{stats.validated}</div>
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{
              padding: '12px 20px', background: '#fff', borderBottom: '1px solid #EEE',
              display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'
            }}>
              <button
                className="btn btn-y"
                style={{ fontWeight: 900, fontSize: 12, opacity: stats.clean === 0 || processingAction ? .4 : 1 }}
                onClick={validateAllClean}
                disabled={stats.clean === 0 || processingAction}
              >
                ✅ Valider toutes sans anomalie ({stats.clean})
              </button>
              {selectedCount > 0 && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#FF82D7', color: '#fff', fontWeight: 900, fontSize: 12 }}
                  onClick={validateSelected}
                  disabled={processingAction}
                >
                  ✅ Valider la sélection ({selectedCount})
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm" style={{ fontSize: 11 }} onClick={loadBatch} disabled={processingAction}>
                🔄 Rafraîchir
              </button>
            </div>

            {/* FILTRES */}
            <div style={{
              padding: '8px 20px', background: '#FAFAFA',
              display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
              borderBottom: '1px solid #EEE'
            }}>
              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .5, marginRight: 4 }}>Type :</span>
              {[
                { id: 'all', label: 'Tous (' + invoices.length + ')' },
                { id: 'invoice', label: 'Factures (' + invoices.filter(function(i){return !i.is_credit_note}).length + ')' },
                { id: 'credit_note', label: 'Avoirs (' + invoices.filter(function(i){return i.is_credit_note}).length + ')' },
                { id: 'anomalies', label: '⚠️ Anomalies (' + invoices.filter(function(i){return i.has_anomaly}).length + ')' }
              ].map(function(t) {
                var active = filterType === t.id
                return (
                  <button
                    key={t.id}
                    className="btn btn-sm"
                    style={{
                      fontSize: 10,
                      background: active ? '#191923' : '#fff',
                      color: active ? '#FFEB5A' : '#555',
                      border: '1.5px solid ' + (active ? '#191923' : '#DDD')
                    }}
                    onClick={function() { setFilterType(t.id as any) }}
                  >{t.label}</button>
                )
              })}
              {suppliers.length > 1 && (
                <>
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .5, marginLeft: 12 }}>Fournisseur :</span>
                  <select
                    className="inp"
                    style={{ width: 160, fontSize: 11, padding: '4px 8px' }}
                    value={filterSupplier}
                    onChange={function(e) { setFilterSupplier(e.target.value) }}
                  >
                    <option value="all">Tous</option>
                    {suppliers.map(function(s) {
                      return <option key={s} value={s}>{s}</option>
                    })}
                  </select>
                </>
              )}
            </div>

            {/* TABLEAU */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 20px 20px' }}>
              {filtered.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', opacity: .5, fontSize: 12 }}>
                  Aucune facture pour ces filtres
                </div>
              )}
              {filtered.length > 0 && (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#FAFAFA', textAlign: 'left' }}>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE', width: 30 }}>
                        <input
                          type="checkbox"
                          checked={filtered.filter(function(i){return i.status==='pending'}).length > 0 && filtered.filter(function(i){return i.status==='pending'}).every(function(i){return selectedIds[i.id]})}
                          onChange={selectAllVisible}
                        />
                      </th>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .6 }}>Date</th>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .6 }}>Fournisseur</th>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .6 }}>N° facture</th>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .6, textAlign: 'right' }}>Total HT</th>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .6, textAlign: 'center' }}>Lignes</th>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', opacity: .6 }}>Statut</th>
                      <th style={{ padding: '8px 6px', borderBottom: '2px solid #EEE' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(function(inv) {
                      var isSelected = !!selectedIds[inv.id]
                      var isPending = inv.status === 'pending'
                      return (
                        <tr key={inv.id} style={{
                          borderBottom: '1px solid #F5F5F5',
                          background: isSelected ? '#FFFBE5' : (inv.has_anomaly && isPending ? '#FFF5F5' : '#fff')
                        }}>
                          <td style={{ padding: '6px' }}>
                            {isPending && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={function() { toggleSelect(inv.id) }}
                              />
                            )}
                          </td>
                          <td style={{ padding: '6px', fontVariantNumeric: 'tabular-nums' }}>
                            {fmtDate(inv.invoice_date)}
                          </td>
                          <td style={{ padding: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {inv.is_credit_note && (
                                <span style={{
                                  background: '#F3EBFA', color: '#A06CD5',
                                  padding: '1px 5px', borderRadius: 3,
                                  fontSize: 9, fontWeight: 900
                                }}>AVOIR</span>
                              )}
                              <span style={{ fontWeight: 700 }}>{inv.fournisseur_extracted || '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: 11 }}>
                            {inv.invoice_number || '—'}
                          </td>
                          <td style={{ padding: '6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                            {fmt(inv.total_ht)}€
                          </td>
                          <td style={{ padding: '6px', textAlign: 'center', opacity: .6 }}>
                            {inv.nb_lines}
                          </td>
                          <td style={{ padding: '6px' }}>
                            {inv.status === 'pending' && inv.has_anomaly && (
                              <span style={{
                                background: '#FFE5E5', color: '#CC0066',
                                padding: '2px 6px', borderRadius: 4,
                                fontSize: 9, fontWeight: 900
                              }}>⚠️ {inv.anomaly_reasons.length}</span>
                            )}
                            {inv.status === 'pending' && !inv.has_anomaly && (
                              <span style={{
                                background: '#E8F8EC', color: '#009D3A',
                                padding: '2px 6px', borderRadius: 4,
                                fontSize: 9, fontWeight: 900
                              }}>OK</span>
                            )}
                            {inv.status === 'validated' && (
                              <span style={{
                                background: '#E8F4FF', color: '#005FFF',
                                padding: '2px 6px', borderRadius: 4,
                                fontSize: 9, fontWeight: 900
                              }}>✅ Validée</span>
                            )}
                            {inv.status === 'rejected' && (
                              <span style={{
                                background: '#F5F5F5', color: '#888',
                                padding: '2px 6px', borderRadius: 4,
                                fontSize: 9, fontWeight: 900
                              }}>🗑️ Rejetée</span>
                            )}
                            {inv.status === 'committed' && (
                              <span style={{
                                background: '#E8F8EC', color: '#009D3A',
                                padding: '2px 6px', borderRadius: 4,
                                fontSize: 9, fontWeight: 900
                              }}>✅ Commit</span>
                            )}
                          </td>
                          <td style={{ padding: '6px' }}>
                            <button
                              className="btn btn-sm"
                              style={{ fontSize: 10, padding: '3px 8px' }}
                              onClick={function() { setDetailInvoice(inv) }}
                            >
                              👁️ Détail
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* MODAL DETAIL FACTURE */}
        {detailInvoice && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12
          }} onClick={function() { setDetailInvoice(null) }}>
            <div style={{
              background: '#fff', borderRadius: 12, padding: 20,
              width: '100%', maxWidth: 720, maxHeight: '88vh', overflowY: 'auto'
            }} onClick={function(e) { e.stopPropagation() }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: "'Yellowtail',cursive", fontSize: 22, color: '#191923' }}>
                    {detailInvoice.is_credit_note ? '💸 Avoir' : '📄 Facture'} {detailInvoice.invoice_number || '—'}
                  </div>
                  <div style={{ fontSize: 11, opacity: .6 }}>
                    {detailInvoice.fournisseur_extracted || '—'} · {fmtDate(detailInvoice.invoice_date)} · {fmt(detailInvoice.total_ht)}€ HT
                  </div>
                </div>
                <button style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }} onClick={function() { setDetailInvoice(null) }}>✕</button>
              </div>

              {detailInvoice.has_anomaly && detailInvoice.anomaly_reasons.length > 0 && (
                <div style={{
                  background: '#FFE5E5', border: '1px solid #CC0066',
                  borderRadius: 8, padding: 10, marginBottom: 12
                }}>
                  <div style={{ fontWeight: 900, color: '#CC0066', fontSize: 12, marginBottom: 4 }}>
                    ⚠️ Anomalies détectées
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11 }}>
                    {detailInvoice.anomaly_reasons.map(function(r, idx) {
                      return <li key={idx}>{r}</li>
                    })}
                  </ul>
                </div>
              )}

              <div style={{ fontSize: 11, opacity: .6, marginBottom: 4 }}>
                Fichier : <strong>{detailInvoice.file_name}</strong>
              </div>
              <div style={{ fontSize: 11, opacity: .6, marginBottom: 12 }}>
                Statut : <strong>{detailInvoice.status}</strong>
              </div>

              <div style={{
                background: '#F8F9FF', borderRadius: 6, padding: 10,
                fontSize: 10, fontFamily: 'monospace', maxHeight: 200, overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-all', border: '1px solid #DDEEFF'
              }}>
                {JSON.stringify({
                  total_ht: detailInvoice.total_ht,
                  total_ttc: detailInvoice.total_ttc,
                  nb_lines: detailInvoice.nb_lines
                }, null, 2)}
              </div>

              <div style={{ fontSize: 11, opacity: .5, marginTop: 12, padding: 10, background: '#FAFAFA', borderRadius: 6 }}>
                💡 Pour modifier les lignes en détail, utilise le wizard standard (onglet Achats → Imports) après validation.
              </div>

              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn btn-sm" onClick={function() { setDetailInvoice(null) }}>Fermer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
