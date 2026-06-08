'use client'
import { useState } from 'react'

export default function InstaTab(props) {
  var toast = props.toast
  var instaData = props.instaData || null
  var instaLoading = props.instaLoading || false

  var [instaTab, setInstaTab] = useState('media')
  var [selMsg, setSelMsg] = useState(null as any)
  var [replyText, setReplyText] = useState('')
  var [sending, setSending] = useState(false)
  var [drafting, setDrafting] = useState(false)
  var [appended, setAppended] = useState({} as any)

  var threadsArr = (instaData && instaData.messages) || []
  var selThread = (selMsg !== null && threadsArr[selMsg]) ? threadsArr[selMsg] : null
  var selKey = selThread ? (selThread.conversationId || selThread.username) : ''
  var threadMsgs = selThread ? ((selThread.messages || []).concat(appended[selKey] || [])) : []

  var aiDraft = async function(thread) {
    if (drafting || !thread) return
    setDrafting(true)
    try {
      var r = await fetch('/api/instagram/ai-draft', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ username: thread.username, lastMessage: thread.lastMessage, thread: thread.messages || [] }) })
      var d = await r.json()
      if (d && d.draft) setReplyText(d.draft)
      else if (toast) toast('Brouillon IA indisponible')
    } catch (e) { if (toast) toast('Erreur brouillon IA') }
    setDrafting(false)
  }

  var sendReply = async function(thread) {
    var txt = (replyText || '').trim()
    if (!txt || sending || !thread) return
    if (!thread.recipientId) { if (toast) toast('Destinataire inconnu'); return }
    setSending(true)
    try {
      var r = await fetch('/api/instagram/reply', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ recipientId: thread.recipientId, message: txt }) })
      var d = await r.json()
      if (d && d.ok) {
        var key = thread.conversationId || thread.username
        var next = {}
        Object.keys(appended).forEach(function(k){ next[k] = appended[k] })
        next[key] = (appended[key] || []).concat([{ text: txt, fromMe: true, date: 'maintenant' }])
        setAppended(next)
        setReplyText('')
        if (toast) toast('Message envoyé')
      } else {
        if (toast) toast(((d && d.error) ? d.error : 'Envoi refusé').slice(0, 90))
      }
    } catch (e) { if (toast) toast('Erreur envoi') }
    setSending(false)
  }

  return (
    <div>
      <div className="ph">
        <div>
          <div className="pt">Instagram 📸</div>
          <div className="ps">Posts, commentaires et messages</div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <a href="https://www.instagram.com/meshuga.deli/" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-p">Ouvrir Instagram →</a>
        </div>
      </div>

      {instaLoading && (
        <div style={{textAlign:'center',padding:60,opacity:.4}}>
          <div style={{fontSize:36}}>📸</div>
          <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',marginTop:8}}>Chargement...</div>
        </div>
      )}

      {!instaLoading && instaData && (!instaData.ok || !instaData.connected) && (
        <div className="card" style={{borderLeft:'4px solid #FF6B2B',padding:'16px 20px'}}>
          <div style={{fontWeight:900,marginBottom:6}}>📸 Instagram non connecté</div>
          {instaData && instaData.reason === 'token_invalid' && (
            <div style={{fontSize:12,color:'#C8166A',fontWeight:700,marginBottom:8}}>⚠️ Jeton invalide ou expiré — régénère un jeton longue durée et mets à jour INSTAGRAM_ACCESS_TOKEN dans Vercel.</div>
          )}
          <div style={{fontSize:12,opacity:.75,lineHeight:1.8}}>
            Aucune donnée fictive ici : la tab affichera tes vraies stats dès que le compte sera relié.<br/><br/>
            Pour connecter Instagram :<br/>
            1. Passe le compte <strong>@meshuga.deli</strong> en mode <strong>Professionnel / Business</strong> et relie-le à une <strong>Page Facebook</strong>.<br/>
            2. Crée une app sur <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" style={{color:'#005FFF'}}>developers.facebook.com</a> et active <strong>Instagram Graph API</strong> (permissions <code>instagram_basic</code>, <code>instagram_manage_comments</code> ; <code>instagram_manage_messages</code> pour les DM, soumise à validation Meta).<br/>
            3. Génère un <strong>jeton longue durée</strong> et ajoute-le dans Vercel sous <strong>INSTAGRAM_ACCESS_TOKEN</strong>.<br/>
            4. Redéploie — la tab basculera automatiquement sur tes vraies données.
          </div>
        </div>
      )}

      {!instaLoading && instaData && instaData.ok && instaData.connected && (
        <div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
            <div className="kc" style={{background:'#FFFFFF',textAlign:'center'}}>
              <div className="kl">Abonnés</div>
              <div className="kv" style={{fontSize:24,color:'#FF82D7'}}>{instaData.followers ? instaData.followers.toLocaleString('fr-FR') : '--'}</div>
            </div>
            <div className="kc" style={{background:'#FFFFFF',textAlign:'center'}}>
              <div className="kl">Posts</div>
              <div className="kv" style={{fontSize:24}}>{instaData.mediaCount || '--'}</div>
            </div>
            <div className="kc" style={{background:'#FFFFFF',textAlign:'center'}}>
              <div className="kl">À répondre</div>
              <div className="kv" style={{fontSize:24,color:instaData.unreadMessages>0?'#CC0066':'#191923'}}>{instaData.unreadMessages || 0}</div>
            </div>
          </div>

          <div style={{display:'flex',gap:6,marginBottom:10}}>
            {['media','comments','messages'].map(function(tab){return(
              <button key={tab} className={'btn btn-sm'+(instaTab===tab?' btn-p':'')} onClick={function(){setInstaTab(tab); setSelMsg(null)}}>
                {tab==='media'?'📷 Posts':tab==='comments'?'💬 Commentaires':'✉️ Messages'}
              </button>
            )})}
          </div>

          {instaTab === 'media' && (
            <div>
              <div className="yt" style={{fontSize:16,marginBottom:8}}>Posts récents</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10}}>
                {(instaData.media||[]).map(function(p,i){return(
                  <a key={i} href={p.permalink} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',color:'inherit',minWidth:0}}>
                    <div className="card" style={{padding:10,cursor:'pointer'}}>
                      {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:4,marginBottom:6,display:'block'}} />}
                      {!p.thumbnailUrl && <div style={{width:'100%',aspectRatio:'1',background:'#FFEB5A',borderRadius:4,marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>📷</div>}
                      <div style={{fontSize:12,display:'flex',justifyContent:'space-between',fontWeight:700}}>
                        <span>❤️ {p.likes||0}</span>
                        <span>💬 {p.comments||0}</span>
                      </div>
                      <div style={{fontSize:11,opacity:.5,marginTop:4,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.caption||''}</div>
                    </div>
                  </a>
                )})}
              </div>
            </div>
          )}

          {instaTab === 'comments' && (
            <div>
              <div className="yt" style={{fontSize:16,marginBottom:8}}>Commentaires récents</div>
              {(instaData.comments||[]).length === 0 && <div style={{fontSize:12,opacity:.4,padding:20,textAlign:'center'}}>Aucun commentaire récent</div>}
              {(instaData.comments||[]).map(function(c,i){return(
                <div key={i} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(c.replied?'#009D3A':'#FFEB5A')}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                    <div style={{fontWeight:900,fontSize:13}}>@{c.username}</div>
                    <div style={{fontSize:10,opacity:.4}}>{c.date}</div>
                  </div>
                  <div style={{fontSize:12,marginBottom:6,lineHeight:1.5}}>{c.text}</div>
                  <div style={{fontSize:10,opacity:.5,marginBottom:c.replied?6:0}}>📸 {c.postCaption || 'Post Instagram'}</div>
                  {c.replied ? <div style={{fontSize:11,color:'#009D3A',fontWeight:700}}>✅ Répondu</div> : <a href={'https://www.instagram.com/p/'+(c.shortcode||'')} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{fontSize:10,marginTop:4}}>↗ Répondre sur Instagram</a>}
                </div>
              )})}
            </div>
          )}

          {instaTab === 'messages' && (
            <div>
              <div className="yt" style={{fontSize:16,marginBottom:6}}>Messages directs</div>
              <div style={{fontSize:11,opacity:.55,marginBottom:10,lineHeight:1.5}}>Tu peux répondre dans les 24h suivant le dernier message du client (règle Instagram). Au-delà, réponds depuis l&apos;app.</div>

              {selThread === null && threadsArr.length === 0 && (
                <div style={{fontSize:12,opacity:.4,padding:20,textAlign:'center'}}>Aucun message récent</div>
              )}

              {selThread === null && threadsArr.map(function(m,i){
                var needReply = m.messages && m.messages.length && !m.messages[m.messages.length-1].fromMe
                return (
                  <div key={i} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(needReply?'#FF82D7':'#EBEBEB'),cursor:'pointer'}} onClick={function(){ setSelMsg(i); setReplyText('') }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                      <div style={{fontWeight:900,fontSize:13}}>@{m.username}{needReply ? <span style={{fontSize:9,background:'#FF82D7',padding:'1px 5px',borderRadius:3,fontWeight:900,color:'#191923',marginLeft:6}}>À RÉPONDRE</span> : null}</div>
                      <div style={{fontSize:10,opacity:.4,flexShrink:0}}>{m.date}</div>
                    </div>
                    <div style={{fontSize:12,lineHeight:1.5,color:'#444',marginTop:4,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{m.lastMessage}</div>
                  </div>
                )
              })}

              {selThread !== null && (
                <div>
                  <button className="btn btn-sm" style={{marginBottom:10}} onClick={function(){ setSelMsg(null); setReplyText('') }}>← Retour</button>
                  <div style={{fontWeight:900,fontSize:14,marginBottom:8}}>@{selThread.username}</div>
                  <div style={{background:'#FFFFFF',border:'2px solid #191923',borderRadius:7,padding:12,maxHeight:320,overflowY:'auto',marginBottom:10}}>
                    {threadMsgs.length === 0 && <div style={{fontSize:12,opacity:.4}}>Pas de messages à afficher.</div>}
                    {threadMsgs.map(function(mm,j){return(
                      <div key={j} style={{display:'flex',justifyContent: mm.fromMe?'flex-end':'flex-start',marginBottom:6}}>
                        <div style={{maxWidth:'78%',background: mm.fromMe?'#FF82D7':'#F0F0F0',color:'#191923',padding:'7px 10px',borderRadius:10,fontSize:12,lineHeight:1.45}}>
                          {mm.text}
                          <div style={{fontSize:9,opacity:.5,marginTop:3}}>{mm.date}</div>
                        </div>
                      </div>
                    )})}
                  </div>
                  <textarea className="inp" placeholder="Ta réponse..." value={replyText} onChange={function(e){ setReplyText(e.target.value) }} style={{minHeight:70}} />
                  <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap',alignItems:'center'}}>
                    <button className="btn btn-sm btn-y" disabled={drafting} onClick={function(){ aiDraft(selThread) }}>{drafting?'...':'✨ Brouillon IA'}</button>
                    <button className="btn btn-sm btn-p" disabled={sending} onClick={function(){ sendReply(selThread) }}>{sending?'Envoi...':'Envoyer'}</button>
                    <a href="https://www.instagram.com/direct/inbox/" target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{marginLeft:'auto'}}>↗ Ouvrir l&apos;app</a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
