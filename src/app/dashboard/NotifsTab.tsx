'use client'
import { useState } from 'react'

export default function NotifsTab(props) {
  var toast = props.toast
  var isEmy = props.isEmy
  var pushEnabled = props.pushEnabled
  var setPushEnabled = props.setPushEnabled
  var pushLoading = props.pushLoading
  var setPushLoading = props.setPushLoading
  var registerPush = props.registerPush
  var unregisterPush = props.unregisterPush

  var [pushTestStatus, setPushTestStatus] = useState(null)
  var [pushTestLoading, setPushTestLoading] = useState(false)
  var [notifTitle, setNotifTitle] = useState('')
  var [notifBody, setNotifBody] = useState('')
  var [notifTarget, setNotifTarget] = useState('all')
  var [notifSending, setNotifSending] = useState(false)
  var [notifSent, setNotifSent] = useState(false)

  return (
<div>
  <div className="ph">
    <div><div className="pt">Notifications 🔔</div><div className="ps">Envoyer · Gérer les abonnements</div></div>
  </div>
  <div style={{padding:16,display:'flex',flexDirection:'column',gap:16,maxWidth:520}}>

    {/* Envoi manuel */}
    <div style={{background:'#fff',borderRadius:12,padding:20,border:'1.5px solid #FFEB5A'}}>
      <div style={{fontFamily:'Yellowtail,cursive',fontSize:20,color:'#191923',marginBottom:16}}>Envoyer une notification</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        <div>
          <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#666',display:'block',marginBottom:4}}>Titre</label>
          <input className="inp" value={notifTitle} onChange={function(e){setNotifTitle(e.target.value)}} placeholder="Ex: Nouvelle commande reçue !" style={{width:'100%'}} />
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#666',display:'block',marginBottom:4}}>Message</label>
          <textarea className="inp" value={notifBody} onChange={function(e){setNotifBody(e.target.value)}} placeholder="Votre message ici..." rows={3} style={{width:'100%',resize:'vertical'}} />
        </div>
        <div>
          <label style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,color:'#666',display:'block',marginBottom:4}}>Destinataire</label>
          <select className="inp" value={notifTarget} onChange={function(e){setNotifTarget(e.target.value)}} style={{width:'100%'}}>
            <option value="all">Tout le monde (Edward + Emy)</option>
            <option value="edward">Edward uniquement</option>
            <option value="emy">Emy uniquement</option>
          </select>
        </div>
        <button
          className="btn"
          style={{background:'#FFEB5A',color:'#191923',fontWeight:900,marginTop:4,opacity:notifSending||!notifTitle||!notifBody?0.5:1}}
          disabled={notifSending||!notifTitle||!notifBody}
          onClick={function(){
            setNotifSending(true)
            setNotifSent(false)
            fetch('https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({title:notifTitle,body:notifBody,target:notifTarget})
            }).then(function(){
              setNotifSent(true)
              setNotifTitle('')
              setNotifBody('')
              setTimeout(function(){setNotifSent(false)},3000)
            }).catch(function(e){toast('Erreur: '+e.message)})
            .finally(function(){setNotifSending(false)})
          }}
        >
          {notifSending ? '⏳ Envoi...' : notifSent ? '✅ Envoyée !' : '🔔 Envoyer'}
        </button>
      </div>
    </div>

    {/* Briefing du jour */}
    <div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee'}}>
      <div style={{fontFamily:'Yellowtail,cursive',fontSize:18,color:'#191923',marginBottom:12}}>Briefing du jour</div>
      <div style={{fontSize:12,color:'#666',marginBottom:12}}>Envoie à Edward et Emy leur programme du jour avec conseil IA.</div>
      <button
        className="btn"
        style={{background:'#191923',color:'#FFEB5A',fontWeight:900,width:'100%'}}
        onClick={function(){
          fetch('/api/daily-briefing',{method:'POST'})
            .then(function(){toast('🌭 Briefing envoyé !')})
            .catch(function(e){toast('Erreur: '+e.message)})
        }}
      >
        🌭 Envoyer le briefing maintenant
      </button>
    </div>

    {/* Abonnement push */}
    <div style={{background:'#fff',borderRadius:12,padding:20,border:'1px solid #eee'}}>
      <div style={{fontFamily:'Yellowtail,cursive',fontSize:18,color:'#191923',marginBottom:12}}>Mon abonnement</div>

      <button
        className="btn"
        style={{width:'100%',background:pushEnabled?'#009D3A':'#f5f5f5',color:pushEnabled?'#fff':'#191923',fontWeight:900,opacity:pushLoading?0.5:1,marginBottom:8}}
        disabled={pushLoading}
        onClick={pushEnabled?unregisterPush:registerPush}
      >
        {pushLoading?'⏳ ...':(pushEnabled?'🔔 Notifications activées — Désactiver':'🔕 Activer mes notifications')}
      </button>

      {pushEnabled && (
        <button
          className="btn btn-sm"
          style={{width:'100%',background:'#F0F0FF',color:'#005FFF',fontWeight:900,opacity:pushTestLoading?0.5:1}}
          disabled={pushTestLoading}
          onClick={function(){
            setPushTestLoading(true)
            setPushTestStatus(null)
            var role = isEmy ? 'emy' : 'edward'
            fetch('/api/test-push',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({target: role})
            })
            .then(function(r){return r.json()})
            .then(function(data){
              if (data.error) { setPushTestStatus('fail:server: '+data.error); return }
              if (data.sent > 0) {
                setPushTestStatus('ok')
              } else if (!data.total) {
                setPushTestStatus('nosub')
              } else {
                var errDetail = data.errors && data.errors.length > 0 ? data.errors[0] : 'http='+data.httpStatus+' sent=0/'+data.total+(data.raw?' | '+String(data.raw).substring(0,120):'')
                setPushTestStatus('fail:'+errDetail)
              }
            })
            .catch(function(e){setPushTestStatus('fail:fetch error: '+(e&&e.message||String(e)))})
            .finally(function(){setPushTestLoading(false)})
          }}
        >
          {pushTestLoading ? '⏳ Test en cours...' : '🧪 Tester ma connexion'}
        </button>
      )}

      {pushTestStatus === 'ok' && (
        <div style={{marginTop:8,background:'#F0FFF4',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#009D3A',fontWeight:700,textAlign:'center'}}>
          ✅ Connexion OK — tu devrais recevoir une notif dans quelques secondes
        </div>
      )}
      {pushTestStatus && pushTestStatus !== 'ok' && pushTestStatus !== 'nosub' && (
        <div style={{marginTop:8,background:'#FFF5F5',borderRadius:8,padding:'8px 12px'}}>
          <div style={{fontSize:12,color:'#CC0066',fontWeight:700,marginBottom:4}}>❌ Envoi échoué</div>
          <div style={{fontSize:10,color:'#555',wordBreak:'break-all',fontFamily:'monospace'}}>{pushTestStatus.replace('fail:','')}</div>
        </div>
      )}
      {pushTestStatus === 'nosub' && (
        <div style={{marginTop:8,background:'#FFF5F5',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#CC0066',fontWeight:700}}>
          ❌ Aucun abonnement trouvé — clique sur "Activer mes notifications"
        </div>
      )}

      <div style={{fontSize:11,color:'#aaa',marginTop:8,textAlign:'center'}}>
        Notifications automatiques : 8h briefing · 12h30 relances · 18h bilan
      </div>
    </div>

  </div>
</div>
  )
}
