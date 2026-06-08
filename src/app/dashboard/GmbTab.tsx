'use client'
import { useState, useEffect } from 'react'

export default function GmbTab() {
  var [data, setData] = useState(null as any)
  var [loading, setLoading] = useState(true)
  var [filter, setFilter] = useState('all')
  var [drafts, setDrafts] = useState({} as any)
  var [draftingIdx, setDraftingIdx] = useState(null as any)
  var [copiedIdx, setCopiedIdx] = useState(null as any)

  var load = function() {
    setLoading(true)
    fetch('/api/gmb').then(function(r){ return r.json() }).then(function(d){ setData(d); setLoading(false) }).catch(function(){ setData({ ok:false, error:'Erreur de connexion' }); setLoading(false) })
  }
  useEffect(function(){ load() }, [])

  var setDraft = function(idx, val) {
    var next = {}
    Object.keys(drafts).forEach(function(k){ next[k] = drafts[k] })
    next[idx] = val
    setDrafts(next)
  }

  var genDraft = async function(idx, rev) {
    if (draftingIdx !== null) return
    setDraftingIdx(idx)
    try {
      var r = await fetch('/api/gmb/ai-reply', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ author: rev.author, rating: rev.rating, text: rev.text }) })
      var d = await r.json()
      if (d && d.draft) setDraft(idx, d.draft)
    } catch (e) {}
    setDraftingIdx(null)
  }

  var copyDraft = function(idx) {
    var txt = drafts[idx] || ''
    try { navigator.clipboard.writeText(txt) } catch (e) {}
    setCopiedIdx(idx)
    setTimeout(function(){ setCopiedIdx(null) }, 1800)
  }

  var manageUrl = (data && data.manageUrl) || 'https://business.google.com/reviews'
  var reviewsUrl = (data && data.reviewsUrl) || 'https://www.google.com/maps'

  var allReviews = (data && data.reviews) || []
  var reviews = allReviews.filter(function(r){
    if (filter === 'all') return true
    if (filter === '5') return r.rating === 5
    if (filter === '4') return r.rating === 4
    if (filter === '3') return r.rating <= 3
    return true
  })

  return (
    <div>
      <div className="ph">
        <div>
          <div className="pt">Google My Business</div>
          <div className="ps">{data && data.ok !== false ? (data.rating + ' ★ · ' + data.totalRatings + ' avis') : 'Chargement...'}</div>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button className="btn btn-sm" onClick={function(){ load() }}>🔄 Actualiser</button>
          <a href={reviewsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-p">Voir tous les avis →</a>
        </div>
      </div>

      {loading && (
        <div style={{textAlign:'center',padding:60,opacity:.4}}>
          <div style={{fontSize:36}}>⭐</div>
          <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',marginTop:8}}>Chargement des avis...</div>
        </div>
      )}

      {!loading && data && data.ok === false && (
        <div className="card" style={{borderLeft:'4px solid #CC0066'}}>
          <div style={{fontWeight:900,marginBottom:4}}>Connexion Google indisponible</div>
          <div style={{fontSize:12,opacity:.7}}>Réessaie avec « Actualiser ». Si ça persiste, vérifie la clé GOOGLE_PLACES_API_KEY dans Vercel.</div>
        </div>
      )}

      {!loading && data && data.ok !== false && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:10}}>
            <div className="kc" style={{background:'#FFFFFF',textAlign:'center'}}>
              <div className="kl">Note moyenne</div>
              <div className="kv" style={{fontSize:24,color:'#FF82D7'}}>{data.rating || '--'} ★</div>
            </div>
            <div className="kc" style={{background:'#FFFFFF',textAlign:'center'}}>
              <div className="kl">Total avis</div>
              <div className="kv" style={{fontSize:24}}>{data.totalRatings || '--'}</div>
            </div>
          </div>

          <div style={{fontSize:11,opacity:.6,lineHeight:1.5,marginBottom:10,background:'#FFFEF2',border:'1.5px solid #FFEB5A',borderRadius:6,padding:'8px 10px'}}>
            ℹ️ Google n&apos;expose publiquement que les <strong>5 avis les plus récents</strong> via son API gratuite (la note et le total, eux, sont complets). Pour chaque avis, génère un <strong>brouillon de réponse IA</strong>, copie-le, puis colle-le sur Google en 1 clic.
          </div>

          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
            {[['all','Tous'],['5','5 ★'],['4','4 ★'],['3','≤ 3 ★']].map(function(f){return(
              <button key={f[0]} className={'btn btn-sm'+(filter===f[0]?' btn-p':'')} onClick={function(){ setFilter(f[0]) }}>{f[1]}</button>
            )})}
          </div>

          {reviews.length === 0 && <div style={{fontSize:12,opacity:.4,padding:20,textAlign:'center'}}>Aucun avis pour ce filtre.</div>}

          {reviews.map(function(r,i){
            var idx = (r.author || '') + '_' + (r.time || '') + '_' + i
            var neg = r.rating <= 2
            return (
              <div key={idx} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(neg?'#CC0066':(r.rating>=4?'#009D3A':'#FFEB5A'))}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,marginBottom:4}}>
                  <div style={{fontWeight:900,fontSize:13}}>{r.author}</div>
                  <div style={{fontSize:11,opacity:.5}}>{r.time ? new Date(r.time).toLocaleDateString('fr-FR') : ''}</div>
                </div>
                <div style={{color:'#FFB800',fontSize:13,letterSpacing:1,marginBottom:6}}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div>
                {r.text && <div style={{fontSize:12,lineHeight:1.5,marginBottom:8,color:'#333'}}>{r.text}</div>}

                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  <button className="btn btn-sm btn-y" disabled={draftingIdx===idx} onClick={function(){ genDraft(idx, r) }}>{draftingIdx===idx?'...':'✨ Brouillon IA'}</button>
                  <a href={manageUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-p">↗ Répondre sur Google</a>
                </div>

                {drafts[idx] != null && (
                  <div style={{marginTop:8}}>
                    <textarea className="inp" value={drafts[idx]} onChange={function(e){ setDraft(idx, e.target.value) }} style={{minHeight:70,fontSize:12}} />
                    <div style={{display:'flex',gap:6,marginTop:6,alignItems:'center'}}>
                      <button className="btn btn-sm btn-g" onClick={function(){ copyDraft(idx) }}>{copiedIdx===idx?'✅ Copié !':'📋 Copier'}</button>
                      <span style={{fontSize:10,opacity:.5}}>Colle la réponse dans Google après « Répondre ».</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
