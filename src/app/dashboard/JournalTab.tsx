'use client'
import { useState } from 'react'

export default function JournalTab(props) {
  var activityLog = props.activityLog
  var isEmy = props.isEmy

  var [journalFilter, setJournalFilter] = useState('all')
  var [journalDateFrom, setJournalDateFrom] = useState('')
  var [journalDateTo, setJournalDateTo] = useState('')

  return (
<div>
  <div className="ph">
    <div><div className="pt">Journal d&apos;Emy 📓</div><div className="ps">Activité · Sessions · Actions</div></div>
    <div style={{display:'flex',gap:6}}>
      <button className="btn btn-sm" style={{background:'#009D3A',color:'#fff'}} onClick={function(){
        var rows = activityLog.filter(function(a){
          var ok1 = !journalDateFrom || (a.created_at||'') >= journalDateFrom
          var ok2 = !journalDateTo || (a.created_at||'') <= journalDateTo+'T23:59:59'
          return ok1 && ok2
        })
        var csv = 'Date,Heure,Utilisateur,Type,Detail\n' + rows.map(function(a){
          var dt = a.created_at ? new Date(a.created_at) : new Date()
          return [dt.toLocaleDateString('fr-FR'), dt.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}), a.user_name||'', a.type||'', (a.description||'').replace(/,/g,' ')].join(',')
        }).join('\n')
        var blob = new Blob([csv],{type:'text/csv'})
        var url = URL.createObjectURL(blob)
        var el = document.createElement('a')
        el.href=url;el.download='journal-'+new Date().toISOString().split('T')[0]+'.csv';el.click()
      }}>📥 Export CSV</button>
    </div>
  </div>

  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:12}}>
    <div className="kc" style={{background:'#fff',textAlign:'center'}}>
      <div className="kl">Sessions ce mois</div>
      <div className="kv" style={{fontSize:24}}>{activityLog.filter(function(a){return a.type==='session_start'&&(a.created_at||'').startsWith(new Date().toISOString().slice(0,7))}).length}</div>
    </div>
    <div className="kc" style={{background:'#fff',textAlign:'center'}}>
      <div className="kl">Actions ce mois</div>
      <div className="kv" style={{fontSize:24}}>{activityLog.filter(function(a){return a.type!=='session_start'&&a.type!=='session_end'&&(a.created_at||'').startsWith(new Date().toISOString().slice(0,7))}).length}</div>
    </div>
    <div className="kc" style={{background:'#fff',textAlign:'center'}}>
      <div className="kl">Prospects contactés</div>
      <div className="kv" style={{fontSize:24,color:'#009D3A'}}>{activityLog.filter(function(a){return a.type==='prospect_contacte'}).length}</div>
    </div>
    <div className="kc" style={{background:'#fff',textAlign:'center'}}>
      <div className="kl">Emails IA générés</div>
      <div className="kv" style={{fontSize:24,color:'#FF82D7'}}>{activityLog.filter(function(a){return a.type==='email_genere'||a.type==='email_copie'}).length}</div>
    </div>
  </div>

  <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
    <select className="inp" style={{width:'auto',padding:'5px 10px',fontSize:12}} value={journalFilter} onChange={function(e){setJournalFilter(e.target.value)}}>
      <option value="all">Toutes les actions</option>
      <option value="session_start">Sessions uniquement</option>
      <option value="prospect_contacte">Prospects contactés</option>
      <option value="email_copie">Emails copiés</option>
      <option value="email_genere">Emails IA</option>
    </select>
    <input type="date" className="inp" style={{width:145,fontSize:12,padding:'5px 8px'}} value={journalDateFrom} onChange={function(e){setJournalDateFrom(e.target.value)}} />
    <span style={{fontSize:13,opacity:.3}}>→</span>
    <input type="date" className="inp" style={{width:145,fontSize:12,padding:'5px 8px'}} value={journalDateTo} onChange={function(e){setJournalDateTo(e.target.value)}} />
    {(journalDateFrom||journalDateTo)&&<button className="btn btn-sm" onClick={function(){setJournalDateFrom('');setJournalDateTo('')}}>✕</button>}
  </div>

  {/* SIDE-BY-SIDE: Emy | Edward */}
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
    {['emy','edward'].map(function(who){
      var label = who==='emy'?'Emy':'Edward'
      var color = who==='emy'?'#FF82D7':'#005FFF'
      var filtered = activityLog.filter(function(a){
        var mUser = a.user_name&&a.user_name.toLowerCase().indexOf(who)>-1
        var mType = journalFilter==='all' || a.type===journalFilter
        var mFrom = !journalDateFrom || (a.created_at||'') >= journalDateFrom
        var mTo = !journalDateTo || (a.created_at||'') <= journalDateTo+'T23:59:59'
        return mUser && mType && mFrom && mTo
      })

      var byDay = {}
      filtered.forEach(function(a){
        var d = a.created_at ? a.created_at.split('T')[0] : 'inconnu'
        if(!byDay[d]) byDay[d] = []
        byDay[d].push(a)
      })

      return(
        <div key={who}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 12px',background:color,borderRadius:7}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,color:'#fff'}}>{label}</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.7)',marginLeft:'auto'}}>{filtered.length} actions</div>
          </div>

          {filtered.length===0&&<div style={{fontSize:13,opacity:.4,textAlign:'center',padding:20}}>Aucune activité</div>}

          {Object.keys(byDay).sort(function(a,b){return b.localeCompare(a)}).map(function(day){
            var dayLogs = byDay[day]
            var sessions = dayLogs.filter(function(a){return a.type==='session_start'})
            var ends = dayLogs.filter(function(a){return a.type==='session_end'})
            var actions = dayLogs.filter(function(a){return a.type!=='session_start'&&a.type!=='session_end'})
            var dayLabel = new Date(day+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})

            return(
              <div key={day} style={{marginBottom:12}}>
                <div style={{fontWeight:900,fontSize:12,color:'#888',textTransform:'uppercase',letterSpacing:.5,padding:'3px 0',borderBottom:'1px solid #F0F0F0',marginBottom:6}}>{dayLabel}</div>

                {sessions.map(function(s,si){
                  var endLog = ends[si]
                  var startT = s.created_at ? new Date(s.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : ''
                  var endT = endLog&&endLog.created_at ? new Date(endLog.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : null
                  var dur = endLog ? (endLog.description||'').replace('Fin de session — ','') : null
                  var sessionAge = s.created_at ? (Date.now() - new Date(s.created_at).getTime()) : 0
                  var isOpen = !endLog && sessionAge < 20 * 60 * 1000
                  return(
                    <div key={si} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'#EBF3FF',borderRadius:5,borderLeft:'3px solid #005FFF',marginBottom:4}}>
                      <span style={{fontSize:16}}>🔐</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:900}}>Connexion {startT}{endT?' → '+endT:(!isOpen&&!endT?' → ~'+new Date(new Date(s.created_at||'').getTime()+20*60000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'')} </div>
                        {dur&&<div style={{fontSize:11,color:'#005FFF',fontWeight:700}}>{dur}</div>}
                        {!endLog&&!isOpen&&<div style={{fontSize:10,color:'#888',fontStyle:'italic'}}>Fermée par inactivité (20min)</div>}
                      </div>
                      <span style={{fontSize:10,fontWeight:900,color:isOpen?'#FF6B2B':'#009D3A',background:isOpen?'#FFF3E0':'#D0F5E0',padding:'2px 6px',borderRadius:3}}>{isOpen?'En cours':'✅'}</span>
                    </div>
                  )
                })}

                {actions.map(function(a,ai){
                  var tl={email_copie:'📋 Copié',prospect_contacte:'📞 Contact',email_genere:'✉️ Email IA',prospect_relance:'↩ Relance',devis_cree:'📄 Devis'}
                  var tc={email_copie:'#FFE5F7',prospect_contacte:'#D0F5E0',email_genere:'#FFE5F7',prospect_relance:'#EBF3FF',devis_cree:'#FFEB5A'}
                  var badge = tl[a.type]||a.type
                  var bg = tc[a.type]||'#F0F0F0'
                  var time = a.created_at ? new Date(a.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : ''
                  var detail = a.description||''
                  var prospect = a.prospect_name||''
                  return(
                    <div key={ai} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'6px 8px',borderBottom:'1px solid #F8F8F8',background:ai%2===0?'#FAFAFA':'#fff',borderRadius:4,marginBottom:2}}>
                      <span style={{fontSize:9,background:bg,color:'#191923',padding:'3px 6px',borderRadius:3,fontWeight:900,whiteSpace:'nowrap',flexShrink:0}}>{badge}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{prospect||detail||a.type}</div>
                        {prospect&&detail&&<div style={{fontSize:10,opacity:.45,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{detail}</div>}
                      </div>
                      <span style={{fontSize:10,opacity:.4,flexShrink:0}}>{time}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )
    })}
  </div>
</div>
  )
}
