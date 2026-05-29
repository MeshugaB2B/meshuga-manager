'use client'

// ============================================================
// PhotoPicker — Modale d'ajout de photo produit
//
// 2 modes :
//   1. Upload local (fichier depuis l'ordi/iPhone)
//   2. Recherche Unsplash (3 photos proposées, on en choisit une)
//
// Dans les deux cas : détourage automatique + composition sur fond jaune Meshuga
// (RGB 253, 200, 90) pour uniformité visuelle, puis upload sur bucket Supabase.
// ============================================================

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

var MESHUGA_YELLOW = { r: 253, g: 200, b: 90 }

// =========== DÉTOURAGE CÔTÉ CLIENT ===========
// Algo en 2 étapes :
//  1. Flood fill depuis les 4 bords pour identifier le fond (pixels peu saturés, atteignables depuis l'extérieur)
//  2. Tout ce qui n'est pas fond = sujet, on compose sur le jaune Meshuga
async function detourerEtComposer(imageBlobOrUrl: any, outputSize: number) {
  return new Promise(function(resolve, reject) {
    var img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = function() {
      try {
        // Canvas de travail (taille originale, max 1200px pour perf)
        var w = img.naturalWidth
        var h = img.naturalHeight
        var maxIn = 1200
        if (w > maxIn || h > maxIn) {
          if (w > h) { h = Math.round(h * maxIn / w); w = maxIn }
          else { w = Math.round(w * maxIn / h); h = maxIn }
        }
        var canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        var ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas ctx fail')); return }
        ctx.drawImage(img, 0, 0, w, h)
        var imageData = ctx.getImageData(0, 0, w, h)
        var data = imageData.data

        // === PHASE 1 : critère STRICT pour détecter le fond clair principal ===
        // (peu saturé ET clair, ou presque blanc pur)
        function isBgStrict(i: number): boolean {
          var r = data[i], g = data[i+1], b = data[i+2]
          var mx = Math.max(r, g, b)
          var mn = Math.min(r, g, b)
          var sat = mx - mn
          return (mx > 200 && sat < 30) || (r > 240 && g > 240 && b > 240)
        }

        // === PHASE 2 : critère RELAXED pour étendre aux ombres ===
        // Tout pixel peu saturé (gris/blanc/noir) mais pas pur noir (pour éviter d'avaler
        // des zones noires pures du sujet, comme un objet noir mat).
        // Combiné au flood depuis le fond, seules les ombres CONNECTÉES au fond seront capturées.
        function isBgRelaxed(i: number): boolean {
          var r = data[i], g = data[i+1], b = data[i+2]
          var mx = Math.max(r, g, b)
          var mn = Math.min(r, g, b)
          var sat = mx - mn
          return sat < 55 && mx > 50
        }

        // Flood fill BFS depuis tous les bords (4-connexité) — Phase 1 strict
        var visited = new Uint8Array(w * h)
        var fond = new Uint8Array(w * h)
        var queue: number[] = []
        function trySeed(px: number) {
          var i = px * 4
          if (visited[px]) return
          if (isBgStrict(i)) { queue.push(px); visited[px] = 1 }
        }
        for (var x = 0; x < w; x++) { trySeed(x); trySeed((h-1)*w + x) }
        for (var y = 0; y < h; y++) { trySeed(y*w); trySeed(y*w + (w-1)) }

        var head = 0
        while (head < queue.length) {
          var px = queue[head++]
          fond[px] = 1
          var py = Math.floor(px / w)
          var pxx = px % w
          var neighbors = [
            py > 0 ? px - w : -1,
            py < h-1 ? px + w : -1,
            pxx > 0 ? px - 1 : -1,
            pxx < w-1 ? px + 1 : -1
          ]
          for (var ni = 0; ni < 4; ni++) {
            var n = neighbors[ni]
            if (n < 0 || visited[n]) continue
            if (isBgStrict(n * 4)) {
              visited[n] = 1
              queue.push(n)
            }
          }
        }

        // === Phase 2 : extension du fond aux OMBRES connectées ===
        // On part des pixels déjà marqués fond, et on étend aux voisins peu saturés
        // (sat < 55). Comme c'est une extension depuis le fond, on ne capture
        // que les ombres en contact avec le fond, pas les zones sombres internes du sujet.
        var phase2Queue: number[] = []
        for (var pp = 0; pp < w*h; pp++) {
          if (fond[pp]) phase2Queue.push(pp)
        }
        var head2 = 0
        while (head2 < phase2Queue.length) {
          var px2 = phase2Queue[head2++]
          var py2 = Math.floor(px2 / w)
          var pxx2 = px2 % w
          var neighbors2 = [
            py2 > 0 ? px2 - w : -1,
            py2 < h-1 ? px2 + w : -1,
            pxx2 > 0 ? px2 - 1 : -1,
            pxx2 < w-1 ? px2 + 1 : -1
          ]
          for (var ni2 = 0; ni2 < 4; ni2++) {
            var n2 = neighbors2[ni2]
            if (n2 < 0 || fond[n2]) continue
            if (isBgRelaxed(n2 * 4)) {
              fond[n2] = 1
              phase2Queue.push(n2)
            }
          }
        }

        // Combien de pixels sont reconnus comme fond ?
        var fondCount = 0
        for (var p = 0; p < w*h; p++) if (fond[p]) fondCount++
        var fondRatio = fondCount / (w * h)

        // Si trop peu de fond détecté (<10%), c'est probablement une image complexe :
        // on bascule en mode "pas de détourage", on garde la photo telle quelle.
        var skipDetour = fondRatio < 0.10

        if (!skipDetour) {
          // === ANTI-ALIASING : masque alpha lissé pour transitions douces ===
          // Au lieu d'un masque binaire, on calcule un alpha 0-255 par pixel
          // en moyennant le masque sur un voisinage 3x3 (lissage 1 pass).
          var alpha = new Uint8Array(w * h)
          for (var pa = 0; pa < w*h; pa++) {
            alpha[pa] = fond[pa] ? 0 : 255  // 0 = fond pur, 255 = sujet pur
          }
          var alphaSmooth = new Uint8Array(w * h)
          for (var py3 = 0; py3 < h; py3++) {
            for (var pxx3 = 0; pxx3 < w; pxx3++) {
              var px3 = py3 * w + pxx3
              var sum = alpha[px3]
              var cnt = 1
              if (py3 > 0) { sum += alpha[px3 - w]; cnt++ }
              if (py3 < h-1) { sum += alpha[px3 + w]; cnt++ }
              if (pxx3 > 0) { sum += alpha[px3 - 1]; cnt++ }
              if (pxx3 < w-1) { sum += alpha[px3 + 1]; cnt++ }
              if (py3 > 0 && pxx3 > 0) { sum += alpha[px3 - w - 1]; cnt++ }
              if (py3 > 0 && pxx3 < w-1) { sum += alpha[px3 - w + 1]; cnt++ }
              if (py3 < h-1 && pxx3 > 0) { sum += alpha[px3 + w - 1]; cnt++ }
              if (py3 < h-1 && pxx3 < w-1) { sum += alpha[px3 + w + 1]; cnt++ }
              alphaSmooth[px3] = Math.round(sum / cnt)
            }
          }

          // Composer : blend chaque pixel avec le jaune Meshuga selon son alpha lissé
          // out = sujet * (alpha/255) + jaune * (1 - alpha/255)
          var ly = MESHUGA_YELLOW
          for (var p4 = 0; p4 < w*h; p4++) {
            var i4 = p4 * 4
            var a = alphaSmooth[p4] / 255
            data[i4]   = Math.round(data[i4]   * a + ly.r * (1 - a))
            data[i4+1] = Math.round(data[i4+1] * a + ly.g * (1 - a))
            data[i4+2] = Math.round(data[i4+2] * a + ly.b * (1 - a))
          }
          ctx.putImageData(imageData, 0, 0)
        }

        // Canvas final : carré avec fond jaune entier, photo centrée
        var finalCanvas = document.createElement('canvas')
        finalCanvas.width = outputSize; finalCanvas.height = outputSize
        var finalCtx = finalCanvas.getContext('2d')
        if (!finalCtx) { reject(new Error('Final canvas fail')); return }
        // Fond jaune full
        finalCtx.fillStyle = 'rgb(' + MESHUGA_YELLOW.r + ',' + MESHUGA_YELLOW.g + ',' + MESHUGA_YELLOW.b + ')'
        finalCtx.fillRect(0, 0, outputSize, outputSize)
        // Calcul cover : on fit la photo dans le carré en gardant les proportions
        var scale = Math.min(outputSize / w, outputSize / h)
        var newW = w * scale
        var newH = h * scale
        var dx = (outputSize - newW) / 2
        var dy = (outputSize - newH) / 2
        finalCtx.drawImage(canvas, dx, dy, newW, newH)

        finalCanvas.toBlob(function(blob) {
          if (!blob) { reject(new Error('toBlob fail')); return }
          resolve({ blob: blob, skipDetour: skipDetour, fondRatio: fondRatio })
        }, 'image/jpeg', 0.88)
      } catch (e) { reject(e) }
    }
    img.onerror = function() { reject(new Error('Image load failed')) }
    // Charger l'image
    if (typeof imageBlobOrUrl === 'string') {
      img.src = imageBlobOrUrl
    } else {
      img.src = URL.createObjectURL(imageBlobOrUrl)
    }
  })
}

export default function PhotoPicker(props: any) {
  var onClose = props.onClose || function() {}
  var onUploaded = props.onUploaded || function() {}
  var productId: string = props.productId
  var productName: string = props.productName || ''
  var toast = props.toast || function() {}

  var [mode, setMode] = useState('choose') // 'choose' | 'unsplash' | 'processing'
  var [searchTerm, setSearchTerm] = useState(productName)
  var [searching, setSearching] = useState(false)
  var [photos, setPhotos] = useState([])
  var [processing, setProcessing] = useState(false)
  var [previewUrl, setPreviewUrl] = useState(null)
  var [previewBlob, setPreviewBlob] = useState(null)
  var [skipDetour, setSkipDetour] = useState(false)

  function searchUnsplash() {
    if (!searchTerm.trim()) { toast('Tape un mot-clé'); return }
    setSearching(true)
    setPhotos([])
    fetch('/api/unsplash-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchTerm })
    }).then(function(r){ return r.json() }).then(function(d){
      setSearching(false)
      if (d.error) { toast('Erreur Unsplash : ' + d.error); return }
      setPhotos(d.photos || [])
    }).catch(function(e){
      setSearching(false)
      toast('Erreur : ' + (e.message || String(e)))
    })
  }

  function processFile(file: any) {
    setProcessing(true)
    detourerEtComposer(file, 600).then(function(res: any) {
      var url = URL.createObjectURL(res.blob)
      setPreviewUrl(url)
      setPreviewBlob(res.blob)
      setSkipDetour(res.skipDetour)
      setProcessing(false)
    }).catch(function(e: any) {
      setProcessing(false)
      toast('Erreur traitement : ' + (e.message || String(e)))
    })
  }

  function processUnsplash(photo: any) {
    setProcessing(true)
    // On utilise notre proxy pour récup l'image (contourne CORS)
    var proxyUrl = '/api/proxy-image?url=' + encodeURIComponent(photo.regular)
    detourerEtComposer(proxyUrl, 600).then(function(res: any) {
      var url = URL.createObjectURL(res.blob)
      setPreviewUrl(url)
      setPreviewBlob(res.blob)
      setSkipDetour(res.skipDetour)
      setProcessing(false)
    }).catch(function(e: any) {
      setProcessing(false)
      toast('Erreur traitement : ' + (e.message || String(e)))
    })
  }

  function uploadFinal() {
    if (!previewBlob) return
    setProcessing(true)
    var fname = 'product_' + productId + '_' + Date.now() + '.jpg'
    var path = 'products/' + fname
    sb().storage.from('recipe-photos').upload(path, previewBlob, { contentType: 'image/jpeg', upsert: true }).then(function(r: any) {
      if (r.error) { setProcessing(false); toast('Erreur upload : ' + r.error.message); return }
      var pub = sb().storage.from('recipe-photos').getPublicUrl(path)
      var publicUrl = pub.data.publicUrl + '?t=' + Date.now()
      sb().from('products').update({ photo_url: publicUrl }).eq('id', productId).then(function(r2: any) {
        setProcessing(false)
        if (r2.error) { toast('Erreur DB : ' + r2.error.message); return }
        toast('✅ Photo enregistrée')
        onUploaded(publicUrl)
      })
    })
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(25,25,35,.65)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:14}} onClick={onClose}>
      <div style={{background:'#FFFFFF',borderRadius:18,width:'100%',maxWidth:560,maxHeight:'92vh',display:'flex',flexDirection:'column',border:'2px solid #191923',boxShadow:'5px 5px 0 #191923',overflow:'hidden'}} onClick={function(e){e.stopPropagation()}}>

        {/* Header */}
        <div style={{padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,borderBottom:'2px solid #EBEBEB'}}>
          <div>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:28,color:'var(--p)',lineHeight:1}}>Ajouter une photo</div>
            <div style={{fontSize:10,fontWeight:700,opacity:.55,marginTop:2}}>Détourage auto + fond jaune Meshuga</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:'50%',border:'2px solid #191923',background:'#FFFFFF',cursor:'pointer',fontSize:14,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',padding:0,flexShrink:0}}>✕</button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'18px'}}>

          {/* PREVIEW (résultat traitement) */}
          {previewUrl && (
            <div>
              <div style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,opacity:.65}}>Aperçu</div>
              <div style={{width:'100%',aspectRatio:'1/1',background:'#F5F5F5',borderRadius:12,overflow:'hidden',border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',marginBottom:12}}>
                <img src={previewUrl} alt="Aperçu" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
              </div>
              {skipDetour && (
                <div style={{padding:'10px 12px',background:'#FFF6E5',border:'1.5px solid #FFB84D',borderRadius:8,fontSize:11,fontWeight:700,marginBottom:12,opacity:.8}}>
                  ⚠️ Photo trop complexe pour le détourage auto — affichée telle quelle. Tu peux quand même l'utiliser ou choisir une autre.
                </div>
              )}
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <button onClick={function(){setPreviewUrl(null);setPreviewBlob(null);setSkipDetour(false)}} disabled={processing} style={{padding:'9px 16px',background:'#FFFFFF',color:'#191923',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:12,cursor:'pointer'}}>← Changer</button>
                <button onClick={uploadFinal} disabled={processing} style={{padding:'9px 18px',background:'var(--y)',color:'#191923',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:13,cursor:processing?'default':'pointer',boxShadow:'2px 2px 0 #191923',opacity:processing?0.6:1}}>{processing ? '⏳ Upload…' : '💾 Utiliser cette photo'}</button>
              </div>
            </div>
          )}

          {/* MODE CHOOSE */}
          {!previewUrl && mode === 'choose' && (
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <label htmlFor="photo-upload-local" style={{cursor:'pointer'}}>
                  <div style={{padding:'24px 14px',background:'var(--y)',border:'2px solid #191923',borderRadius:14,textAlign:'center',boxShadow:'3px 3px 0 #191923'}}>
                    <div style={{fontSize:32,marginBottom:6}}>📷</div>
                    <div style={{fontSize:13,fontWeight:900}}>Mon ordi / iPhone</div>
                    <div style={{fontSize:10,opacity:.7,fontWeight:700,marginTop:3}}>Choisir un fichier</div>
                  </div>
                  <input id="photo-upload-local" type="file" accept="image/*" style={{display:'none'}} onChange={function(e){var f = e.target.files && e.target.files[0];if(f)processFile(f);e.target.value=''}} />
                </label>
                <button onClick={function(){setMode('unsplash');if(searchTerm)searchUnsplash()}} style={{padding:'24px 14px',background:'var(--p)',color:'#FFFFFF',border:'2px solid #191923',borderRadius:14,textAlign:'center',boxShadow:'3px 3px 0 #191923',cursor:'pointer'}}>
                  <div style={{fontSize:32,marginBottom:6}}>🔍</div>
                  <div style={{fontSize:13,fontWeight:900}}>Chercher sur Unsplash</div>
                  <div style={{fontSize:10,opacity:.85,fontWeight:700,marginTop:3}}>Photos libres de droits</div>
                </button>
              </div>
              <div style={{fontSize:10,opacity:.55,fontWeight:700,marginTop:14,padding:'10px 12px',background:'#FAFAFA',borderRadius:8,border:'1.5px solid #EEE'}}>
                💡 Toutes les photos sont automatiquement détourées et placées sur le fond jaune Meshuga pour un catalogue uniforme.
              </div>
            </div>
          )}

          {/* MODE UNSPLASH (recherche) */}
          {!previewUrl && mode === 'unsplash' && (
            <div>
              <div style={{display:'flex',gap:6,marginBottom:14}}>
                <input value={searchTerm} onChange={function(e){setSearchTerm(e.target.value)}} onKeyDown={function(e){if(e.key==='Enter')searchUnsplash()}} placeholder="Ex : tomato, lemon, bread…" style={{flex:1,padding:'9px 12px',fontSize:13,fontWeight:600,border:'2px solid #191923',borderRadius:18}} />
                <button onClick={searchUnsplash} disabled={searching} style={{padding:'9px 16px',background:'var(--p)',color:'#FFFFFF',border:'2px solid #191923',borderRadius:18,fontWeight:900,fontSize:12,cursor:searching?'default':'pointer',boxShadow:'2px 2px 0 #191923',opacity:searching?0.6:1}}>{searching ? '⏳' : 'Chercher'}</button>
              </div>
              <div style={{fontSize:10,opacity:.55,fontWeight:700,marginBottom:12,padding:'8px 10px',background:'#FAFAFA',borderRadius:8}}>
                💡 Astuce : <strong>tape en anglais</strong> pour de meilleurs résultats (ex : "fresh tomato" plutôt que "tomate fraîche")
              </div>
              {searching && <div style={{padding:30,textAlign:'center',opacity:.5,fontSize:13,fontWeight:700}}>⏳ Recherche en cours…</div>}
              {!searching && photos.length === 0 && searchTerm && (
                <div style={{padding:30,textAlign:'center',opacity:.5,fontSize:12,fontWeight:700,background:'#FAFAFA',borderRadius:10,border:'2px dashed #DDD'}}>Aucun résultat. Essaie d'autres mots-clés ?</div>
              )}
              {photos.length > 0 && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                  {photos.map(function(p: any, i: number) {
                    return (
                      <div key={i} onClick={function(){processUnsplash(p)}} style={{cursor:'pointer',position:'relative'}}>
                        <div style={{width:'100%',aspectRatio:'1/1',background:'#F5F5F5',borderRadius:10,overflow:'hidden',border:'2px solid #191923',boxShadow:'2px 2px 0 #191923'}}>
                          <img src={p.thumb} alt={p.description} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                        </div>
                        {p.author && (
                          <div style={{fontSize:9,opacity:.55,fontWeight:700,marginTop:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>📷 {p.author}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <div style={{marginTop:14,textAlign:'center'}}>
                <button onClick={function(){setMode('choose');setPhotos([])}} style={{padding:'7px 14px',background:'#FFFFFF',color:'#191923',border:'2px solid #191923',borderRadius:16,fontWeight:900,fontSize:11,cursor:'pointer'}}>← Retour</button>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {processing && !previewUrl && (
            <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,.85)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8,fontWeight:900}}>
              <div style={{fontSize:32}}>⏳</div>
              <div>Traitement en cours…</div>
              <div style={{fontSize:10,opacity:.55,fontWeight:700}}>Détourage + composition jaune Meshuga</div>
            </div>
          )}
        </div>

        {/* Footer : crédit Unsplash */}
        {mode === 'unsplash' && photos.length > 0 && (
          <div style={{padding:'8px 14px',background:'#FAFAFA',borderTop:'1px solid #EEE',fontSize:9,opacity:.55,fontWeight:700,textAlign:'center'}}>
            Photos par <a href="https://unsplash.com" target="_blank" rel="noopener" style={{color:'var(--p)',textDecoration:'none'}}>Unsplash</a>
          </div>
        )}
      </div>
    </div>
  )
}
