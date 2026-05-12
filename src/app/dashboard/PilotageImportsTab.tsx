'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// PilotageImportsTab — Upload multi-CSV Zelty avec auto-détection 5 types
// =============================================================================

export default function PilotageImportsTab(props) {
  var toast = props.toast || function(m){ console.log(m) }
  
  var [files, setFiles] = useState([])
  var [analyses, setAnalyses] = useState({})
  var [importing, setImporting] = useState(false)
  var [importLog, setImportLog] = useState([])
  var [imports, setImports] = useState([])
  var [unknownProducts, setUnknownProducts] = useState([])
  var [showMappingModal, setShowMappingModal] = useState(false)
  var [mapping, setMapping] = useState({})
  var [availableRecipes, setAvailableRecipes] = useState([])
  var fileInputRef = useRef(null)

  useEffect(function(){
    loadImports()
    loadRecipes()
  }, [])

  function loadImports() {
    sb().from('sales_imports_log').select('*').order('imported_at', { ascending: false }).limit(50).then(function(r){
      setImports(r.data || [])
    })
  }

  function loadRecipes() {
    sb().from('recipes').select('id, name, variant_key, categorie').eq('is_active', true).then(function(r){
      setAvailableRecipes(r.data || [])
    })
  }

  function onDragOver(e) { e.preventDefault(); e.stopPropagation() }
  function onDrop(e) {
    e.preventDefault(); e.stopPropagation()
    handleNewFiles(e.dataTransfer.files)
  }
  function onFilePick(e) { handleNewFiles(e.target.files) }

  function handleNewFiles(fileList) {
    var newFiles = []
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i]
      var ext = f.name.split('.').pop().toLowerCase()
      if (ext !== 'csv' && ext !== 'tsv') {
        toast('⚠️ ' + f.name + ' ignoré (extension ' + ext + ')')
        continue
      }
      newFiles.push(f)
    }
    setFiles(function(prev){ return prev.concat(newFiles) })
    newFiles.forEach(function(f){ analyzeFile(f) })
  }

  function removeFile(index) {
    setFiles(function(prev){
      var arr = prev.slice()
      var removed = arr.splice(index, 1)[0]
      if (removed) setAnalyses(function(a){
        var na = Object.assign({}, a); delete na[removed.name]; return na
      })
      return arr
    })
  }

  function analyzeFile(file) {
    setAnalyses(function(a){
      var na = Object.assign({}, a); na[file.name] = { status: 'analyzing' }; return na
    })
    // Lire en windows-1252 (encoding Zelty)
    var reader = new FileReader()
    reader.onload = function(e){
      processFileText(file, e.target.result, 'windows-1252')
    }
    reader.readAsText(file, 'windows-1252')
  }

  function processFileText(file, text, encoding) {
    try {
      var lines = text.split(/\r?\n/)
      if (lines[0] && lines[0].toLowerCase().indexOf('sep=') === 0) {
        lines = lines.slice(1)
      }
      if (lines.length < 2) {
        setAnalyses(function(a){
          var na = Object.assign({}, a)
          na[file.name] = { status: 'error', error: 'Fichier vide ou invalide' }
          return na
        })
        return
      }

      var firstLine = lines[0]
      var sepComma = (firstLine.match(/,/g) || []).length
      var sepSemi = (firstLine.match(/;/g) || []).length
      var separator = sepSemi > sepComma ? ';' : ','
      
      // Détecter le type via le nom de fichier d'abord (plus fiable)
      var nameLower = file.name.toLowerCase()
      var fileType = null
      
      if (nameLower.indexOf('tickets') > -1) fileType = 'tickets'
      else if (nameLower.indexOf('vue_d_ensemble') > -1 || nameLower.indexOf("vue-d-ensemble") > -1 || nameLower.indexOf("vue_ensemble") > -1) fileType = 'overview'
      else if (nameLower.indexOf('les-menus') > -1 || nameLower.indexOf('les_menus') > -1 || nameLower.indexOf('menus') > -1 && nameLower.indexOf('produits') < 0) fileType = 'menus'
      else if (nameLower.indexOf('ventes_cumule') > -1 || nameLower.indexOf('ventes-cumule') > -1) fileType = 'ventes_cumulees'
      else if (nameLower.indexOf('les-produits') > -1 || nameLower.indexOf('les_produits') > -1) fileType = 'produits'
      
      // Si pas détecté par nom, fallback via colonnes
      var headers = parseCSVLine(firstLine, separator)
      var headerSet = {}
      headers.forEach(function(h){ headerSet[h.toLowerCase().trim()] = true })
      
      if (!fileType) {
        if (headerSet['n°'] && headerSet['date'] && headerSet['ttc']) fileType = 'tickets'
        else if (headerSet['nom'] && headerSet['à la carte'] && headerSet['menu'] && headerSet['total']) fileType = 'ventes_cumulees'
        else if (headerSet['nom'] && headerSet['qte'] && headerSet['total ttc']) {
          // Pour produits vs menus, on ne peut pas trancher juste avec les colonnes (mêmes headers)
          // On choisit produits par défaut
          fileType = 'produits'
        }
        // Vue d'ensemble : format clé/valeur, pas de header standard
        else if (firstLine.trim().toLowerCase() === 'ca' || firstLine.split(separator).length === 1) {
          fileType = 'overview'
        }
      }
      
      if (!fileType) {
        setAnalyses(function(a){
          var na = Object.assign({}, a)
          na[file.name] = { 
            status: 'error', 
            error: 'Type non reconnu',
            headers: headers.slice(0, 5).join(', ')
          }
          return na
        })
        return
      }

      // Comptage lignes valides
      var nbLines = 0
      var firstDate = null, lastDate = null
      var sample = []
      
      // Pour overview, on prend toutes les lignes brutes
      var rawLines = lines
      
      for (var i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        nbLines++
        if (sample.length < 3) sample.push(lines[i].slice(0, 100))
        
        if (fileType === 'tickets') {
          var row = parseCSVLine(lines[i], separator)
          var dateField = row[1] // Date est en colonne 2 dans Zelty tickets
          if (dateField && /^\d{4}-\d{2}-\d{2}$/.test(dateField)) {
            var d = new Date(dateField)
            if (!firstDate || d < firstDate) firstDate = d
            if (!lastDate || d > lastDate) lastDate = d
          }
        }
      }

      // Détection période depuis nom de fichier (pour les fichiers annuels)
      if (!firstDate) {
        var periodFromName = detectPeriodFromFilename(file.name)
        if (periodFromName) {
          firstDate = periodFromName.start
          lastDate = periodFromName.end
        }
      }

      setAnalyses(function(a){
        var na = Object.assign({}, a)
        na[file.name] = { 
          status: 'ready',
          fileType: fileType,
          encoding: encoding,
          separator: separator,
          nbLines: nbLines,
          firstDate: firstDate, lastDate: lastDate,
          headers: headers,
          sample: sample,
          rawText: text,
          lines: lines,
          rawLines: rawLines
        }
        return na
      })
    } catch (err) {
      setAnalyses(function(a){
        var na = Object.assign({}, a)
        na[file.name] = { status: 'error', error: String(err) }
        return na
      })
    }
  }

  function parseCSVLine(line, separator) {
    var result = []
    var current = ''
    var inQuotes = false
    for (var i = 0; i < line.length; i++) {
      var c = line[i]
      if (c === '"') {
        if (inQuotes && line[i+1] === '"') { current += '"'; i++ }
        else { inQuotes = !inQuotes }
      } else if (c === separator && !inQuotes) {
        result.push(current); current = ''
      } else { current += c }
    }
    result.push(current)
    return result
  }

  function detectPeriodFromFilename(name) {
    var match = name.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      return {
        start: new Date(match[1] + '-' + match[2] + '-' + match[3]),
        end: new Date(match[4] + '-' + match[5] + '-' + match[6])
      }
    }
    var matchYear = name.match(/20(\d{2})/)
    if (matchYear) {
      var y = '20' + matchYear[1]
      return { start: new Date(y + '-01-01'), end: new Date(y + '-12-31') }
    }
    return null
  }

  function formatDate(d) {
    if (!d) return '—'
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  function startImport() {
    var readyFiles = files.filter(function(f){
      return analyses[f.name] && analyses[f.name].status === 'ready'
    })
    if (readyFiles.length === 0) { alert('Aucun fichier prêt'); return }
    
    // ORDRE D'IMPORT : tickets > overview > produits > menus > ventes_cumulees
    // (les ventes_cumulees doivent venir APRÈS produits car elles updatent les rows existants)
    var typeOrder = { tickets: 1, overview: 2, produits: 3, menus: 4, ventes_cumulees: 5 }
    readyFiles.sort(function(a, b){
      var aType = analyses[a.name].fileType
      var bType = analyses[b.name].fileType
      return (typeOrder[aType] || 99) - (typeOrder[bType] || 99)
    })
    
    setImporting(true)
    setImportLog([{ ts: new Date(), msg: '🚀 Import de ' + readyFiles.length + ' fichier(s)...' }])
    importNextFile(readyFiles, 0)
  }

  function importNextFile(filesArr, idx) {
    if (idx >= filesArr.length) {
      setImportLog(function(l){ return l.concat([{ ts: new Date(), msg: '🎉 Import terminé !' }]) })
      setImporting(false)
      loadImports()
      return
    }
    var f = filesArr[idx]
    var analysis = analyses[f.name]
    setImportLog(function(l){ return l.concat([{ ts: new Date(), msg: '📤 ' + f.name + ' (' + getTypeLabel(analysis.fileType) + ', ' + analysis.nbLines.toLocaleString('fr-FR') + ' lignes)...' }]) })

    var payload = {
      filename: f.name,
      fileType: analysis.fileType,
      separator: analysis.separator,
      headers: analysis.headers,
      lines: analysis.lines.slice(1).filter(function(l){ return l.trim() }),
      rawLines: analysis.rawLines,
      encoding: analysis.encoding
    }

    fetch('/api/zelty-import/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(r){ return r.json() }).then(function(res){
      if (res.error) {
        setImportLog(function(l){ return l.concat([{ ts: new Date(), msg: '❌ ' + f.name + ' : ' + res.error, level: 'error' }]) })
      } else {
        var msg = '✅ ' + f.name + ' : ' + (res.nb_inserted || 0) + ' lignes (' + (res.duration_ms || 0) + 'ms)'
        setImportLog(function(l){ return l.concat([{ ts: new Date(), msg: msg, level: 'success' }]) })
        if (res.unknown_products && res.unknown_products.length > 0) {
          setUnknownProducts(function(prev){
            var combined = prev.slice()
            res.unknown_products.forEach(function(p){
              if (combined.indexOf(p) < 0) combined.push(p)
            })
            return combined
          })
        }
      }
      setTimeout(function(){ importNextFile(filesArr, idx + 1) }, 200)
    }).catch(function(err){
      setImportLog(function(l){ return l.concat([{ ts: new Date(), msg: '❌ ' + f.name + ' : ' + String(err), level: 'error' }]) })
      setTimeout(function(){ importNextFile(filesArr, idx + 1) }, 200)
    })
  }

  function openMappingModal() { setShowMappingModal(true) }
  function saveMapping(zeltyName, recipeId) {
    setMapping(function(m){ var nm = Object.assign({}, m); nm[zeltyName] = recipeId; return nm })
  }
  function commitMapping() {
    var entries = Object.keys(mapping).filter(function(k){ return mapping[k] })
    if (entries.length === 0) { setShowMappingModal(false); return }
    var c = sb()
    var promises = entries.map(function(zeltyName){
      return c.from('sales_product_mapping').upsert({
        zelty_product_name: zeltyName,
        recipe_id: mapping[zeltyName]
      }, { onConflict: 'zelty_product_name' })
    })
    Promise.all(promises).then(function(){
      toast(entries.length + ' mapping(s) sauvegardé(s)')
      setShowMappingModal(false)
      setMapping({})
      setUnknownProducts(function(prev){
        return prev.filter(function(p){ return !mapping[p] })
      })
    })
  }

  var readyCount = files.filter(function(f){ return analyses[f.name] && analyses[f.name].status === 'ready' }).length
  var errorCount = files.filter(function(f){ return analyses[f.name] && analyses[f.name].status === 'error' }).length

  return (
    <div>
      <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #FFEB5A'}}>
        <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 24, color: '#191923', marginBottom: 6}}>
          📥 Import des données Zelty
        </div>
        <div style={{fontSize: 13, color: '#555'}}>
          Dépose les 5 CSV par année (Tickets / Vue d&apos;ensemble / Les-Produits / Les-Menus / Ventes cumulées). Auto-détection du type.
        </div>
      </div>

      <div 
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={function(){ if(fileInputRef.current) fileInputRef.current.click() }}
        style={{
          border: '3px dashed #FF82D7',
          borderRadius: 12,
          padding: '40px 20px',
          textAlign: 'center',
          background: '#FFF8FA',
          cursor: 'pointer',
          marginBottom: 14
        }}>
        <div style={{fontSize: 48, marginBottom: 8}}>📂</div>
        <div style={{fontSize: 18, fontWeight: 900, color: '#191923', fontFamily: 'Arial Narrow, Arial, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5}}>
          Dépose tes CSV ici
        </div>
        <div style={{fontSize: 13, color: '#888', marginTop: 6}}>
          Ou clique pour sélectionner — plusieurs fichiers acceptés
        </div>
        <input ref={fileInputRef} type="file" multiple accept=".csv,.tsv" onChange={onFilePick} style={{display: 'none'}} />
      </div>

      {files.length > 0 && (
        <div style={{background: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, border: '2px solid #EBEBEB'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8}}>
            <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 18, color: '#191923'}}>
              Fichiers sélectionnés ({files.length})
            </div>
            <div style={{display: 'flex', gap: 6, fontSize: 11, fontWeight: 900}}>
              {readyCount > 0 && <span style={{padding: '3px 9px', background: '#E8F5E9', color: '#009D3A', borderRadius: 12}}>✅ {readyCount} prêts</span>}
              {errorCount > 0 && <span style={{padding: '3px 9px', background: '#FFE5EE', color: '#CC0066', borderRadius: 12}}>❌ {errorCount} erreurs</span>}
            </div>
          </div>
          {files.map(function(f, idx){
            var a = analyses[f.name]
            return (
              <div key={idx} style={{
                padding: '10px 12px',
                borderRadius: 8,
                marginBottom: 6,
                background: a && a.status === 'ready' ? '#F1F8F4' : a && a.status === 'error' ? '#FFF5F8' : '#FAFAFA',
                border: '1px solid ' + (a && a.status === 'ready' ? '#9DD3B0' : a && a.status === 'error' ? '#FFB3CD' : '#EBEBEB'),
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap'
              }}>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{fontSize: 13, fontWeight: 900}}>
                    {a && a.status === 'ready' && getTypeIcon(a.fileType)}
                    {a && a.status === 'error' && '❌ '}
                    {a && a.status === 'analyzing' && '⏳ '}
                    {f.name}
                  </div>
                  {a && a.status === 'ready' && (
                    <div style={{fontSize: 11, color: '#555', marginTop: 3}}>
                      <strong>{getTypeLabel(a.fileType)}</strong>
                      {' · '}{a.nbLines.toLocaleString('fr-FR')} lignes
                      {a.firstDate && a.lastDate && (
                        <span> · 📅 {formatDate(a.firstDate)} → {formatDate(a.lastDate)}</span>
                      )}
                    </div>
                  )}
                  {a && a.status === 'error' && (
                    <div style={{fontSize: 11, color: '#CC0066', marginTop: 3}}>
                      {a.error}
                      {a.headers && <div style={{fontFamily: 'monospace', fontSize: 10, opacity: 0.7, marginTop: 2}}>Colonnes : {a.headers}</div>}
                    </div>
                  )}
                  {a && a.status === 'analyzing' && (
                    <div style={{fontSize: 11, color: '#888', marginTop: 3}}>Analyse en cours...</div>
                  )}
                </div>
                <button type="button" onClick={function(){ removeFile(idx) }} style={{
                  padding: '6px 10px',
                  background: 'transparent',
                  border: '1px solid #DDD',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 11,
                  color: '#888',
                  fontWeight: 700
                }}>Retirer</button>
              </div>
            )
          })}
          {readyCount > 0 && (
            <div style={{marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end'}}>
              <button type="button" onClick={startImport} disabled={importing} style={{
                padding: '12px 24px',
                background: importing ? '#CCC' : '#009D3A',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 900,
                cursor: importing ? 'wait' : 'pointer',
                fontFamily: 'Arial Narrow, Arial, sans-serif'
              }}>
                {importing ? '⏳ Import en cours...' : '🚀 Lancer l\'import de ' + readyCount + ' fichier(s)'}
              </button>
            </div>
          )}
        </div>
      )}

      {importLog.length > 0 && (
        <div style={{background: '#191923', color: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, fontFamily: 'monospace', fontSize: 12, maxHeight: 240, overflowY: 'auto'}}>
          <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 18, color: '#FFEB5A', marginBottom: 8}}>
            📡 Log d&apos;import
          </div>
          {importLog.map(function(l, idx){
            return (
              <div key={idx} style={{
                padding: '3px 0',
                color: l.level === 'error' ? '#FFB3CD' : l.level === 'success' ? '#9DD3B0' : '#fff'
              }}>
                <span style={{opacity: 0.5, marginRight: 8}}>{l.ts.toLocaleTimeString('fr-FR')}</span>
                {l.msg}
              </div>
            )
          })}
        </div>
      )}

      {unknownProducts.length > 0 && (
        <div style={{background: '#FFFBE5', borderRadius: 12, padding: 14, marginBottom: 14, border: '2px solid #FFEB5A'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8}}>
            <div>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 20, color: '#191923'}}>
                ⚠️ Produits Zelty inconnus
              </div>
              <div style={{fontSize: 12, color: '#555', marginTop: 3}}>
                {unknownProducts.length} produit(s) non mappés vers une recette
              </div>
            </div>
            <button type="button" onClick={openMappingModal} style={{
              padding: '10px 18px',
              background: '#191923',
              color: '#FFEB5A',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              fontFamily: 'Arial Narrow, Arial, sans-serif'
            }}>🔗 Mapper {unknownProducts.length}</button>
          </div>
        </div>
      )}

      <div style={{background: '#fff', borderRadius: 12, padding: 14, border: '2px solid #EBEBEB'}}>
        <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 20, color: '#191923', marginBottom: 10}}>
          📜 Historique des imports
        </div>
        {imports.length === 0 ? (
          <div style={{padding: '20px 0', textAlign: 'center', color: '#888', fontSize: 13}}>
            Aucun import effectué pour le moment
          </div>
        ) : (
          <div>
            {imports.map(function(imp){
              return (
                <div key={imp.id} style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  marginBottom: 4,
                  background: imp.status === 'success' ? '#F1F8F4' : '#FFF5F8',
                  fontSize: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div>
                    {imp.status === 'success' ? '✅' : '❌'} <strong>{imp.filename}</strong>
                    <span style={{marginLeft: 8, opacity: 0.6}}>{getTypeLabel(imp.file_type)}</span>
                    <span style={{marginLeft: 8, opacity: 0.6}}>{(imp.nb_lines_imported || 0).toLocaleString('fr-FR')} lignes</span>
                  </div>
                  <div style={{opacity: 0.6}}>{new Date(imp.imported_at).toLocaleString('fr-FR')}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showMappingModal && (
        <div onClick={function(){ setShowMappingModal(false) }} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,.6)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 9999, padding: 16, paddingTop: 40, overflowY: 'auto'
        }}>
          <div onClick={function(e){ e.stopPropagation() }} style={{
            background: '#fff', borderRadius: 12, padding: 20, maxWidth: 700, width: '100%', marginBottom: 40
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8}}>
              <div>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923'}}>
                  Mapper les produits Zelty
                </div>
                <div style={{fontSize: 12, color: '#888', marginTop: 4}}>
                  Pour chaque produit, choisis la recette correspondante (laisse vide pour ignorer)
                </div>
              </div>
              <button type="button" onClick={function(){ setShowMappingModal(false) }} style={{
                background: '#F5F5F5', border: 'none', fontSize: 18, cursor: 'pointer', color: '#666', width: 36, height: 36, borderRadius: 18, lineHeight: 1
              }}>✕</button>
            </div>
            
            <div style={{maxHeight: '60vh', overflowY: 'auto'}}>
              {unknownProducts.map(function(zeltyName){
                return (
                  <div key={zeltyName} style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #F5F5F5',
                    display: 'grid',
                    gridTemplateColumns: '1fr 280px',
                    gap: 10,
                    alignItems: 'center'
                  }}>
                    <div style={{fontSize: 13, fontWeight: 700}}>{zeltyName}</div>
                    <select value={mapping[zeltyName] || ''} onChange={function(e){ saveMapping(zeltyName, e.target.value) }} style={{
                      padding: '8px 10px', border: '2px solid #EBEBEB', borderRadius: 6, fontSize: 12, background: '#fff'
                    }}>
                      <option value="">-- Aucune (ignorer) --</option>
                      {availableRecipes.slice().sort(function(a,b){
                        return (a.name || '').localeCompare(b.name || '')
                      }).map(function(r){
                        var label = r.name + (r.variant_key === 'mini' ? ' Mini' : '')
                        return <option key={r.id} value={r.id}>[{r.categorie || '?'}] {label}</option>
                      })}
                    </select>
                  </div>
                )
              })}
            </div>
            
            <div style={{display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end'}}>
              <button type="button" onClick={function(){ setShowMappingModal(false) }} style={{
                padding: '10px 16px', background: '#fff', border: '1px solid #DDD', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700
              }}>Annuler</button>
              <button type="button" onClick={commitMapping} style={{
                padding: '10px 20px', background: '#009D3A', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 900
              }}>✓ Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getTypeIcon(t) {
  if (t === 'tickets') return '🎫 '
  if (t === 'overview') return '📊 '
  if (t === 'produits') return '🍔 '
  if (t === 'menus') return '🍽️ '
  if (t === 'ventes_cumulees') return '📦 '
  return '📄 '
}

function getTypeLabel(t) {
  if (t === 'tickets') return 'Tickets'
  if (t === 'overview') return 'Vue d\'ensemble'
  if (t === 'produits') return 'Les Produits'
  if (t === 'menus') return 'Les Menus'
  if (t === 'ventes_cumulees') return 'Ventes cumulées'
  return t
}
