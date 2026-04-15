'use client'
import { useState } from 'react'

export default function InstaTab(props) {
  var toast = props.toast
  var fcRecipes = props.fcRecipes
  var fcSeuil = props.fcSeuil
  var fcAlertCat = props.fcAlertCat
  var setFcAlertCat = props.setFcAlertCat
  var fcPriceAnalysis = props.fcPriceAnalysis
  var setFcPriceAnalysis = props.setFcPriceAnalysis
  var fcPriceLoading = props.fcPriceLoading
  var setFcPriceLoading = props.setFcPriceLoading
  var messages = props.messages

  var [instaData, setInstaData] = useState(null)
  var [instaLoading, setInstaLoading] = useState(false)
  var [instaTab, setInstaTab] = useState('comments')

  return (
<div>
  <div className="ph">
    <div>
      <div className="pt">Instagram 📸</div>
      <div className="ps">Commentaires et messages</div>
    </div>
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      {instaData && instaData.mock && <span style={{fontSize:10,background:'#FF6B2B',color:'#fff',padding:'2px 6px',borderRadius:3,fontWeight:900}}>DEMO</span>}
      <a href="https://www.instagram.com/meshuga.deli/" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-p">Ouvrir Instagram →</a>
    </div>
  </div>

  {instaLoading && (
    <div style={{textAlign:'center',padding:60,opacity:.4}}>
      <div style={{fontSize:36}}>📸</div>
      <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',marginTop:8}}>Chargement...</div>
    </div>
  )}

  {!instaLoading && instaData && !instaData.ok && (
    <div className="card" style={{borderLeft:'4px solid #FF6B2B',padding:'16px 20px'}}>
      <div style={{fontWeight:900,marginBottom:6}}>⚙️ Configuration requise</div>
      <div style={{fontSize:12,opacity:.7,lineHeight:1.7}}>
        Pour connecter Instagram :<br/>
        1. Crée une app Meta sur <a href="https://developers.facebook.com" target="_blank" style={{color:'#005FFF'}}>developers.facebook.com</a><br/>
        2. Active <strong>Instagram Graph API</strong> + permissions <code>instagram_basic</code>, <code>instagram_manage_comments</code>, <code>pages_messaging</code><br/>
        3. Ajoute <strong>INSTAGRAM_ACCESS_TOKEN</strong> dans tes variables Vercel<br/>
        4. Redéploie
      </div>
    </div>
  )}

  {!instaLoading && instaData && instaData.ok && (
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
          <div className="kl">Messages non lus</div>
          <div className="kv" style={{fontSize:24,color:instaData.unreadMessages>0?'#CC0066':'#191923'}}>{instaData.unreadMessages || 0}</div>
        </div>
      </div>

      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {['comments','messages','media'].map(function(tab){return(
          <button key={tab} className={'btn btn-sm'+(instaTab===tab?' btn-p':'')} onClick={function(){setInstaTab(tab)}}>
            {tab==='comments'?'💬 Commentaires':tab==='messages'?'✉️ Messages':'📷 Posts'}
          </button>
        )})}
      </div>

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
              {c.replied
                ? <div style={{fontSize:11,color:'#009D3A',fontWeight:700}}>✅ Répondu</div>
                : <a href={'https://www.instagram.com/p/'+(c.shortcode||'')} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{fontSize:10,marginTop:4}}>↗ Répondre sur Instagram</a>
              }
            </div>
          )})}
        </div>
      )}

      {instaTab === 'messages' && (
        <div>
          <div className="yt" style={{fontSize:16,marginBottom:8}}>Messages directs</div>
          {(instaData.messages||[]).length === 0 && <div style={{fontSize:12,opacity:.4,padding:20,textAlign:'center'}}>Aucun message récent</div>}
          {(instaData.messages||[]).map(function(m,i){return(
            <div key={i} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(m.read?'#EBEBEB':'#FF82D7')}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    <div style={{fontWeight:900,fontSize:13}}>@{m.username}</div>
                    {!m.read && <span style={{fontSize:9,background:'#FF82D7',padding:'1px 5px',borderRadius:3,fontWeight:900,color:'#191923'}}>NOUVEAU</span>}
                  </div>
                  <div style={{fontSize:12,lineHeight:1.5,color:'#444'}}>{m.lastMessage}</div>
                </div>
                <div style={{fontSize:10,opacity:.4,flexShrink:0}}>{m.date}</div>
              </div>
              <a href="https://www.instagram.com/direct/inbox/" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-p" style={{fontSize:10,marginTop:8}}>↗ Répondre sur Instagram</a>
            </div>
          )})}
        </div>
      )}

      {instaTab === 'media' && (
        <div>
          <div className="yt" style={{fontSize:16,marginBottom:8}}>Posts récents</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            {(instaData.media||[]).map(function(p,i){return(
              <a key={i} href={p.permalink} target="_blank" rel="noopener noreferrer" style={{textDecoration:'none',color:'inherit'}}>
                <div className="card" style={{padding:10,cursor:'pointer'}}>
                  {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" style={{width:'100%',aspectRatio:'1',objectFit:'cover',borderRadius:4,marginBottom:6}} />}
                  {!p.thumbnailUrl && <div style={{width:'100%',aspectRatio:'1',background:'#FFEB5A',borderRadius:4,marginBottom:6,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>📷</div>}
                  <div style={{fontSize:11,display:'flex',justifyContent:'space-between'}}>
                    <span>❤️ {p.likes||0}</span>
                    <span>💬 {p.comments||0}</span>
                  </div>
                  <div style={{fontSize:10,opacity:.4,marginTop:3,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{p.caption||''}</div>
                </div>
              </a>
            )})}
          </div>
        </div>
      )}
    </div>
  )}
</div>
          )}

          {page === 'foodcost' && (
<FoodCostTab
  fcRecipes={fcRecipes}
  setFcRecipes={setFcRecipes}
  fcSeuil={fcSeuil}
  setFcSeuil={setFcSeuil}
  fcAlertCat={fcAlertCat}
  setFcAlertCat={setFcAlertCat}
  fcPriceAnalysis={fcPriceAnalysis}
  setFcPriceAnalysis={setFcPriceAnalysis}
  fcPriceLoading={fcPriceLoading}
  setFcPriceLoading={setFcPriceLoading}
  toast={toast}
/>
  )
}
