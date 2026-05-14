// src/app/dashboard/BatchInvoiceImport.tsx
// Composant d'import en masse de factures historiques
// - Drag & drop multi-PDF (jusqu'à 100 fichiers)
// - Sélecteur fournisseur (forçage optionnel)
// - Progress bar avec statut par fichier
// - Appel /api/import-invoice/batch
// - Affiche le rapport final avec lien vers la validation

'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
}

type FileEntry = {
  id: string
  file: File
  name: string
  size: number
  status: 'queued' | 'uploading' | 'ocr' | 'done' | 'error' | 'duplicate'
  base64?: string
  result?: any
}

type Supplier = { id: string, name: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: (batchId: string) => void
  toast: (msg: string) => void
}

export default function BatchInvoiceImport(props: Props) {
  var [files, setFiles] = useState<FileEntry[]>([])
  var [suppliers, setSuppliers] = useState<Supplier[]>([])
  var [forcedSupplierId, setForcedSupplierId] = useState<string>('')
  var [processing, setProcessing] = useState(false)
  var [progress, setProgress] = useState({ current: 0, total: 0 })
  var [dragActive, setDragActive] = useState(false)
  var [result, setResult] = useState<any>(null)
  var fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(function() {
    if (!props.isOpen) return
    sb().from('suppliers').select('id, name').order('name').then(function(res) {
      setSuppliers(res.data || [])
    })
    // Reset state à l'ouverture
    setFiles([])
    setForcedSupplierId('')
    setProcessing(false)
    setProgress({ current: 0, total: 0 })
    setResult(null)
  }, [props.isOpen])

  function addFiles(newFiles: FileList | File[]) {
    var entries: FileEntry[] = []
    for (var i = 0; i < (newFiles as any).length; i++) {
      var f = (newFiles as any)[i] as File
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        props.toast('⚠️ ' + f.name + ' ignoré (pas un PDF)')
        continue
      }
      entries.push({
        id: Math.random().toString(36).slice(2),
        file: f,
        name: f.name,
        size: f.size,
        status: 'queued'
      })
    }
    if (entries.length === 0) return
    setFiles(function(prev) { return prev.concat(entries) })
  }

  function removeFile(id: string) {
    setFiles(function(prev) { return prev.filter(function(f) { return f.id !== id }) })
  }

  function clearAll() {
    if (processing) return
    setFiles([])
    setResult(null)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = '' // reset pour pouvoir re-uploader le même fichier
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader()
      reader.onload = function() {
        var result = reader.result as string
        var base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function launchImport() {
    if (files.length === 0) { props.toast('Aucun fichier à importer'); return }
    if (files.length > 100) { props.toast('Maximum 100 fichiers par batch'); return }
    
    setProcessing(true)
    setProgress({ current: 0, total: files.length })
    setResult(null)
    
    // 1. Convertir tous les fichiers en base64
    var filesPayload: Array<{ name: string, base64: string }> = []
    for (var i = 0; i < files.length; i++) {
      var f = files[i]
      try {
        setFiles(function(prev) {
          return prev.map(function(x) { return x.id === f.id ? Object.assign({}, x, { status: 'uploading' as const }) : x })
        })
        var base64 = await fileToBase64(f.file)
        filesPayload.push({ name: f.name, base64: base64 })
        setFiles(function(prev) {
          return prev.map(function(x) { return x.id === f.id ? Object.assign({}, x, { status: 'ocr' as const, base64: base64 }) : x })
        })
      } catch (e: any) {
        setFiles(function(prev) {
          return prev.map(function(x) { return x.id === f.id ? Object.assign({}, x, { status: 'error' as const, result: { error: e.message } }) : x })
        })
      }
    }
    
    // 2. Appel API batch
    try {
      var response = await fetch('/api/import-invoice/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: filesPayload,
          supplier_id_forced: forcedSupplierId || null
        })
      })
      
      if (!response.ok) {
        var errText = await response.text()
        throw new Error('API error ' + response.status + ': ' + errText.substring(0, 200))
      }
      
      var data = await response.json()
      
      // 3. Mapper les résultats sur chaque fichier
      var resultsByFileName: Record<string, any> = {}
      if (data.results) {
        for (var k = 0; k < data.results.length; k++) {
          var r = data.results[k]
          var fileName = r.details?.file || filesPayload[k]?.name
          if (fileName) resultsByFileName[fileName] = r
        }
      }
      
      setFiles(function(prev) {
        return prev.map(function(x) {
          var r = resultsByFileName[x.name]
          if (!r) return x
          var newStatus: FileEntry['status'] = 'done'
          if (r.status === 'duplicate') newStatus = 'duplicate'
          else if (r.status === 'error') newStatus = 'error'
          return Object.assign({}, x, { status: newStatus, result: r })
        })
      })
      
      setResult(data)
      setProcessing(false)
      props.toast('✅ Batch terminé : ' + (data.summary?.invoices_imported || 0) + ' factures importées')
      
    } catch (e: any) {
      props.toast('❌ Erreur batch : ' + e.message)
      setProcessing(false)
      setFiles(function(prev) {
        return prev.map(function(x) {
          return x.status === 'ocr' ? Object.assign({}, x, { status: 'error' as const, result: { error: e.message } }) : x
        })
      })
    }
  }

  function fmtSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' Ko'
    return (bytes / (1024 * 1024)).toFixed(1) + ' Mo'
  }

  function statusBadge(status: FileEntry['status'], fileResult?: any) {
    var styles: Record<string, any> = {
      queued: { bg: '#F5F5F5', color: '#555', label: 'En attente' },
      uploading: { bg: '#FFF5CC', color: '#B07B00', label: '📤 Upload...' },
      ocr: { bg: '#E8F4FF', color: '#005FFF', label: '🧠 OCR...' },
      done: { bg: '#E8F8EC', color: '#009D3A', label: '✅ OK' },
      duplicate: { bg: '#FFF0E5', color: '#FF8800', label: '🔁 Doublon' },
      error: { bg: '#FFE5E5', color: '#CC0066', label: '❌ Erreur' }
    }
    var s = styles[status]
    if (status === 'done' && fileResult?.is_credit_note) {
      s = { bg: '#F3EBFA', color: '#A06CD5', label: '✅ Avoir' }
    }
    return (
      <span style={{
        background: s.bg, color: s.color,
        padding: '3px 8px', borderRadius: 4,
        fontSize: 10, fontWeight: 900,
        whiteSpace: 'nowrap'
      }}>{s.label}</span>
    )
  }

  if (!props.isOpen) return null

  var totalSize = files.reduce(function(acc, f) { return acc + f.size }, 0)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12
    }} onClick={function() { if (!processing) props.onClose() }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 0,
        width: '100%', maxWidth: 820, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column'
      }} onClick={function(e) { e.stopPropagation() }}>
        
        {/* HEADER */}
        <div style={{
          padding: '16px 20px', borderBottom: '2px solid #FFEB5A',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <div style={{ fontFamily: "'Yellowtail',cursive", fontSize: 26, color: '#191923', lineHeight: 1 }}>
              📦 Import en masse
            </div>
            <div style={{ fontSize: 11, opacity: .6, marginTop: 4 }}>
              Charge tes factures historiques (jusqu&apos;à 100 PDF par batch)
            </div>
          </div>
          <button style={{
            background: 'none', border: 'none', fontSize: 24,
            cursor: processing ? 'not-allowed' : 'pointer', color: '#888',
            opacity: processing ? .3 : 1
          }} onClick={function() { if (!processing) props.onClose() }} disabled={processing}>✕</button>
        </div>

        {/* BODY */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          
          {/* Sélecteur fournisseur */}
          {!result && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: .5, opacity: .6, marginBottom: 6 }}>
                Fournisseur (optionnel)
              </div>
              <select className="inp" value={forcedSupplierId} onChange={function(e) { setForcedSupplierId(e.target.value) }} disabled={processing} style={{ width: '100%' }}>
                <option value="">🔍 Auto-détection à partir de chaque PDF</option>
                {suppliers.map(function(s) {
                  return <option key={s.id} value={s.id}>{s.name}</option>
                })}
              </select>
              <div style={{ fontSize: 10, opacity: .5, marginTop: 4 }}>
                💡 Sélectionne un fournisseur si toutes les factures viennent du même (plus rapide et plus fiable)
              </div>
            </div>
          )}

          {/* Zone drag & drop */}
          {!result && (
            <div
              onDragEnter={function(e) { e.preventDefault(); setDragActive(true) }}
              onDragLeave={function(e) { e.preventDefault(); setDragActive(false) }}
              onDragOver={function(e) { e.preventDefault() }}
              onDrop={onDrop}
              onClick={function() { if (!processing && fileInputRef.current) fileInputRef.current.click() }}
              style={{
                border: '3px dashed ' + (dragActive ? '#FF82D7' : '#DDD'),
                borderRadius: 12, padding: '32px 16px', textAlign: 'center',
                background: dragActive ? '#FFF5FB' : '#FAFAFA',
                cursor: processing ? 'not-allowed' : 'pointer',
                transition: 'all .2s'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 4 }}>
                {dragActive ? 'Lâche ici !' : 'Glisse tes PDF ici ou clique pour sélectionner'}
              </div>
              <div style={{ fontSize: 11, opacity: .5 }}>
                PDF uniquement · max 100 fichiers par batch
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={onFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Liste des fichiers */}
          {files.length > 0 && !result && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 8, fontSize: 11, opacity: .6
              }}>
                <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: .5 }}>
                  {files.length} fichier{files.length > 1 ? 's' : ''} · {fmtSize(totalSize)}
                </span>
                {!processing && (
                  <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={clearAll}>
                    🗑️ Tout retirer
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #EEE', borderRadius: 8 }}>
                {files.map(function(f) {
                  return (
                    <div key={f.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderBottom: '1px solid #F5F5F5',
                      background: '#fff'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{f.name}</div>
                        <div style={{ fontSize: 10, opacity: .5 }}>
                          {fmtSize(f.size)}
                          {f.result?.reason && ' · ' + f.result.reason}
                        </div>
                      </div>
                      {statusBadge(f.status, f.result)}
                      {!processing && f.status === 'queued' && (
                        <button style={{
                          background: 'none', border: 'none', fontSize: 16,
                          cursor: 'pointer', color: '#888', padding: 0
                        }} onClick={function() { removeFile(f.id) }}>✕</button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Progress global */}
          {processing && progress.total > 0 && (
            <div style={{ marginTop: 14, padding: 12, background: '#FFFBE5', borderRadius: 8, border: '2px solid #FFEB5A' }}>
              <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 6 }}>
                ⏳ Traitement en cours... (OCR Claude Sonnet, ~5s/PDF)
              </div>
              <div style={{ background: '#F0F0F0', borderRadius: 20, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: ((progress.current / progress.total) * 100) + '%',
                  background: '#FF82D7', height: '100%', borderRadius: 20,
                  transition: 'width .3s'
                }} />
              </div>
            </div>
          )}

          {/* RAPPORT FINAL */}
          {result && (
            <div style={{ marginTop: 8 }}>
              <div style={{
                background: '#E8F8EC', border: '2px solid #009D3A',
                borderRadius: 12, padding: 16, marginBottom: 12
              }}>
                <div style={{ fontFamily: "'Yellowtail',cursive", fontSize: 22, color: '#191923', marginBottom: 8 }}>
                  ✅ Batch terminé !
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', fontWeight: 900 }}>Factures importées</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#009D3A' }}>{result.summary?.invoices_imported || 0}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', fontWeight: 900 }}>Avoirs détectés</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#A06CD5' }}>{result.summary?.credit_notes_imported || 0}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', fontWeight: 900 }}>Doublons skippés</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#FF8800' }}>{result.summary?.duplicates_skipped || 0}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '8px 12px', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, opacity: .6, textTransform: 'uppercase', fontWeight: 900 }}>Erreurs</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: result.summary?.errors_count > 0 ? '#CC0066' : '#888' }}>
                      {result.summary?.errors_count || 0}
                    </div>
                  </div>
                </div>
                {result.summary?.date_range && (
                  <div style={{ fontSize: 11, opacity: .6, marginTop: 8 }}>
                    📅 Plage : du {result.summary.date_range.start} au {result.summary.date_range.end}
                  </div>
                )}
              </div>
              
              {result.summary?.errors_count > 0 && (
                <div style={{
                  background: '#FFE5E5', border: '1px solid #CC0066',
                  borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11
                }}>
                  <div style={{ fontWeight: 900, color: '#CC0066', marginBottom: 4 }}>
                    ⚠️ {result.summary.errors_count} fichier(s) en erreur
                  </div>
                  <div style={{ opacity: .7 }}>
                    Consulte la liste ci-dessus pour voir les détails. Tu peux ré-uploader ces fichiers individuellement via le wizard standard.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-sm" onClick={function() {
                  setResult(null)
                  setFiles([])
                  setForcedSupplierId('')
                }}>📦 Nouveau batch</button>
                <button className="btn btn-y" style={{ fontWeight: 900 }} onClick={function() {
                  props.onSuccess(result.batch_id)
                  props.onClose()
                }}>
                  👁️ Voir la validation ({result.summary?.invoices_imported || 0})
                </button>
              </div>
            </div>
          )}
          
        </div>

        {/* FOOTER */}
        {!result && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #EEE',
            display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center',
            background: '#FAFAFA'
          }}>
            <div style={{ fontSize: 11, opacity: .6 }}>
              {files.length === 0
                ? 'Sélectionne des PDF pour démarrer'
                : files.length + ' fichier' + (files.length > 1 ? 's' : '') + ' prêt' + (files.length > 1 ? 's' : '')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-sm" onClick={function() { if (!processing) props.onClose() }} disabled={processing}>
                Annuler
              </button>
              <button
                className="btn btn-y"
                style={{ fontWeight: 900, opacity: (files.length === 0 || processing) ? .4 : 1 }}
                onClick={launchImport}
                disabled={files.length === 0 || processing}
              >
                {processing ? '⏳ Traitement...' : '🚀 Lancer l\'import (' + files.length + ')'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
