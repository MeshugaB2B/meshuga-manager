'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import BatchInvoiceImport from './BatchInvoiceImport'
import BatchValidation from './BatchValidation'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

// =============================================================================
// PendingInvoicesWidget — Widget dashboard pour les factures fournisseurs
//
// Affiche :
// - Nb factures en attente de validation (pending)
// - Nb factures avec anomalies
// - Total HT cumulé (du dernier mois)
// - Bouton raccourci "Import en masse" → ouvre directement le modal
// - Bouton "Voir détail" → bascule vers l'onglet Achats / Imports
// =============================================================================

export default function PendingInvoicesWidget(props: {
  toast: (m: string) => void
  onGoToImports?: () => void
}) {
  var toast = props.toast || function(m){ console.log(m) }
  var [loading, setLoading] = useState(true)
  var [stats, setStats] = useState({
    pending: 0,
    anomalies: 0,
    committed_this_month: 0,
    total_ht_this_month: 0,
    latest_batch_id: null as string | null,
    latest_batch_date: null as string | null
  })
  var [batchImportOpen, setBatchImportOpen] = useState(false)
  var [batchValidationOpen, setBatchValidationOpen] = useState(false)
  var [currentBatchId, setCurrentBatchId] = useState<string | null>(null)

  useEffect(function() {
    loadStats()
  }, [])

  function loadStats() {
    setLoading(true)
    var client = sb()
    var monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    var monthStartStr = monthStart.toISOString().split('T')[0]
    
    Promise.all([
      // Factures pending
      client.from('pending_invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      // Factures avec anomalies en pending
      client.from('pending_invoices').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('has_anomaly', true),
      // Factures commitées ce mois
      client.from('pending_invoices').select('total_ht, invoice_date').eq('status', 'committed').gte('invoice_date', monthStartStr),
      // Dernier batch
      client.from('historical_import_batches').select('id, completed_at').order('completed_at', { ascending: false, nullsFirst: false }).limit(1)
    ]).then(function(results) {
      var pendingCount = results[0].count || 0
      var anomaliesCount = results[1].count || 0
      var committedThisMonth = results[2].data || []
      var latestBatch = (results[3].data && results[3].data.length > 0) ? results[3].data[0] : null
      
      var totalHt = 0
      for (var i = 0; i < committedThisMonth.length; i++) {
        totalHt += Number(committedThisMonth[i].total_ht || 0)
      }
      
      setStats({
        pending: pendingCount,
        anomalies: anomaliesCount,
        committed_this_month: committedThisMonth.length,
        total_ht_this_month: totalHt,
        latest_batch_id: latestBatch ? latestBatch.id : null,
        latest_batch_date: latestBatch ? latestBatch.completed_at : null
      })
      setLoading(false)
    }).catch(function(e) {
      toast('Erreur widget : ' + e.message)
      setLoading(false)
    })
  }

  function fmt(n: number) {
    return (Math.round(n * 100) / 100).toFixed(2)
  }

  function fmtRelativeDate(iso: string | null) {
    if (!iso) return '—'
    var d = new Date(iso)
    var now = new Date()
    var diffMs = now.getTime() - d.getTime()
    var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return "aujourd'hui"
    if (diffDays === 1) return "hier"
    if (diffDays < 7) return 'il y a ' + diffDays + ' j'
    if (diffDays < 30) return 'il y a ' + Math.floor(diffDays / 7) + ' sem.'
    return 'il y a ' + Math.floor(diffDays / 30) + ' mois'
  }

  var hasAlert = stats.pending > 0 || stats.anomalies > 0

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 16,
      border: '2px solid ' + (hasAlert ? '#FFEB5A' : '#EBEBEB'),
      position: 'relative'
    }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{
            fontFamily: "'Yellowtail', cursive",
            fontSize: 22,
            color: '#191923',
            lineHeight: 1
          }}>
            📦 Factures fournisseurs
          </div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
            {stats.latest_batch_date
              ? 'Dernier import ' + fmtRelativeDate(stats.latest_batch_date)
              : 'Aucun import récent'}
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={{
            background: '#FFEB5A',
            color: '#191923',
            border: '2px solid #191923',
            fontWeight: 900,
            fontSize: 11,
            padding: '6px 10px'
          }}
          onClick={function(){ setBatchImportOpen(true) }}
        >
          📦 Importer
        </button>
      </div>

      {loading && (
        <div style={{ padding: 20, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>
          ⏳ Chargement...
        </div>
      )}

      {!loading && (
        <>
          {/* STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 }}>
            {/* En attente */}
            <div style={{
              background: stats.pending > 0 ? '#FFFBE5' : '#FAFAFA',
              borderRadius: 8,
              padding: '8px 10px',
              border: '1.5px solid ' + (stats.pending > 0 ? '#FFEB5A' : '#EEE')
            }}>
              <div style={{ fontSize: 9, opacity: 0.6, textTransform: 'uppercase', fontWeight: 900 }}>En attente</div>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                color: stats.pending > 0 ? '#B07B00' : '#888'
              }}>{stats.pending}</div>
            </div>

            {/* Anomalies */}
            <div style={{
              background: stats.anomalies > 0 ? '#FFE5E5' : '#FAFAFA',
              borderRadius: 8,
              padding: '8px 10px',
              border: '1.5px solid ' + (stats.anomalies > 0 ? '#CC0066' : '#EEE')
            }}>
              <div style={{ fontSize: 9, opacity: 0.6, textTransform: 'uppercase', fontWeight: 900 }}>⚠️ Anomalies</div>
              <div style={{
                fontSize: 22,
                fontWeight: 900,
                color: stats.anomalies > 0 ? '#CC0066' : '#888'
              }}>{stats.anomalies}</div>
            </div>

            {/* Commitées ce mois */}
            <div style={{
              background: '#E8F8EC',
              borderRadius: 8,
              padding: '8px 10px',
              border: '1.5px solid #009D3A'
            }}>
              <div style={{ fontSize: 9, opacity: 0.6, textTransform: 'uppercase', fontWeight: 900, color: '#009D3A' }}>Validées (mois)</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#009D3A' }}>{stats.committed_this_month}</div>
            </div>
          </div>

          {/* Total HT du mois */}
          {stats.total_ht_this_month > 0 && (
            <div style={{
              background: '#F8F9FF',
              borderRadius: 8,
              padding: '8px 10px',
              border: '1.5px solid #DDEEFF',
              marginBottom: 10
            }}>
              <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', fontWeight: 900 }}>
                Total achats validés ce mois
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#005FFF' }}>
                {fmt(stats.total_ht_this_month)}€ HT
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {stats.pending > 0 && stats.latest_batch_id && (
              <button
                className="btn btn-sm btn-y"
                style={{ fontSize: 11, fontWeight: 900, flex: 1 }}
                onClick={function() {
                  setCurrentBatchId(stats.latest_batch_id)
                  setBatchValidationOpen(true)
                }}
              >
                👁️ Valider en attente ({stats.pending})
              </button>
            )}
            {props.onGoToImports && (
              <button
                className="btn btn-sm"
                style={{ fontSize: 11, background: '#FF82D7', color: '#fff', fontWeight: 900, flex: 1 }}
                onClick={props.onGoToImports}
              >
                🛒 Aller à Achats
              </button>
            )}
          </div>

          {/* Message contextuel */}
          {stats.pending === 0 && stats.anomalies === 0 && (
            <div style={{ fontSize: 10, opacity: 0.5, textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
              ✅ Aucune facture en attente
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      <BatchInvoiceImport
        isOpen={batchImportOpen}
        onClose={function(){ setBatchImportOpen(false) }}
        onSuccess={function(batchId: string){
          setCurrentBatchId(batchId)
          setBatchImportOpen(false)
          setBatchValidationOpen(true)
        }}
        toast={toast}
      />

      <BatchValidation
        isOpen={batchValidationOpen}
        batchId={currentBatchId}
        onClose={function(){
          setBatchValidationOpen(false)
          setCurrentBatchId(null)
          loadStats()
        }}
        toast={toast}
      />
    </div>
  )
}
