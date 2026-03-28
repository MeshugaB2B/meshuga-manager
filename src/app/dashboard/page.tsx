'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const sb = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const G = `
@import url('https://fonts.googleapis.com/css2?family=Yellowtail&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Arial Narrow',Arial,sans-serif;background:#FFEB5A;color:#191923;height:100vh;overflow:hidden}
.yt{font-family:'Yellowtail',cursive}
.shell{display:flex;height:100vh;overflow:hidden}
.topbar{display:none;background:#191923;padding:10px 16px;align-items:center;justify-content:space-between;border-bottom:3px solid #FFEB5A;flex-shrink:0}
.hamburger{background:none;border:2px solid rgba(255,255,255,.3);border-radius:4px;padding:4px 8px;cursor:pointer;color:#FFEB5A;font-size:16px}
.sidebar{width:210px;background:#FFFFFF;border-right:4px solid #191923;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.sb-logo{padding:14px;border-bottom:3px solid #191923;display:flex;align-items:center;gap:10px}
.sb-stamp{width:42px;height:42px;border-radius:50%;border:2px solid #191923;background:#FFEB5A;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.sb-nav{padding:8px;flex:1}
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:rgba(25,25,35,.35);border:2px solid transparent;transition:all .1s;margin-bottom:1px}
.ni:hover{background:#FFEB5A;color:#191923;border-color:#191923}
.ni.active{background:#FF82D7;color:#191923;border-color:#191923}
.nb{background:#191923;color:#FFEB5A;font-size:9px;padding:1px 5px;border-radius:2px;margin-left:auto}
.main{flex:1;overflow-y:auto;padding:16px 20px;background:#FFEB5A}
.strip{height:4px;background:#191923;border-radius:2px;margin-bottom:14px}
.pt{font-weight:900;font-size:clamp(22px,3.5vw,34px);text-transform:uppercase;letter-spacing:-1px;line-height:1}
.ps{font-family:'Yellowtail',cursive;font-size:14px;opacity:.5;margin-top:2px;margin-bottom:12px}
.ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:10px;flex-wrap:wrap}
.card{background:#FFFFFF;border-radius:7px;border:2px solid #191923;padding:14px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
.card-y{background:#FFEB5A;border-radius:7px;border:2px solid #191923;padding:14px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
.card-p{background:#FF82D7;border-radius:7px;border:2px solid #191923;padding:14px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
.ct{font-family:'Yellowtail',cursive;font-size:16px;margin-bottom:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}
.kc{border-radius:7px;border:2px solid #191923;padding:12px;position:relative;overflow:hidden;box-shadow:3px 3px 0 #191923;cursor:pointer}
.kl{font-family:'Yellowtail',cursive;font-size:12px}
.kv{font-weight:900;font-size:28px;line-height:1.1}
.ki{position:absolute;right:8px;top:8px;font-size:18px;opacity:.15}
.row{display:grid;align-items:center;padding:8px 0;border-bottom:2px solid #EBEBEB}
.row:last-child{border-bottom:none}
.badge{display:inline-flex;align-items:center;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:1.5px solid currentColor;white-space:nowrap}
.btn{padding:7px 12px;border-radius:4px;border:2px solid #191923;cursor:pointer;font-family:'Arial Narrow',Arial;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-flex;align-items:center;gap:5px;box-shadow:2px 2px 0 #191923;background:#FFFFFF;color:#191923;transition:all .1s;white-space:nowrap}
.btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #191923}
.btn-y{background:#FFEB5A}.btn-p{background:#FF82D7}.btn-n{background:#191923;color:#FFEB5A}.btn-g{background:#009D3A;color:#FFFFFF}.btn-b{background:#005FFF;color:#FFFFFF}.btn-red{background:#CC0066;color:#FFFFFF}
.btn-sm{padding:4px 8px;font-size:9px;box-shadow:1px 1px 0 #191923}
.inp{width:100%;padding:7px 10px;border-radius:4px;border:2px solid #191923;font-family:'Arial Narrow',Arial;font-size:12px;background:#FFFFFF;color:#191923;outline:none;box-shadow:2px 2px 0 #191923}
textarea.inp{min-height:70px;resize:vertical}
.lbl{font-family:'Yellowtail',cursive;font-size:13px;display:block;margin-bottom:4px}
.fg{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.overlay{position:fixed;inset:0;background:rgba(25,25,35,.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:12px}
.modal{background:#FFFFFF;border-radius:8px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border:3px solid #191923;box-shadow:8px 8px 0 #191923}
.modal-lg{max-width:700px}.modal-xl{max-width:860px}
.mh{padding:14px 18px;border-bottom:2px solid #191923;background:#FF82D7;position:sticky;top:0;z-index:1}
.mt{font-weight:900;font-size:17px;text-transform:uppercase}
.mb{padding:14px 18px}
.mf{padding:10px 18px;border-top:2px solid #EBEBEB;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;position:sticky;bottom:0;background:#FFFFFF}
.pbar{width:4px;border-radius:2px;min-height:30px;flex-shrink:0}
.prog-wrap{height:10px;background:#EBEBEB;border-radius:3px;border:1.5px solid #191923;overflow:hidden;margin-top:4px}
.prog-fill{height:100%;background:#191923;border-radius:2px;transition:width .4s}
.tag{font-size:9px;font-weight:900;padding:3px 8px;border:1.5px solid #191923;border-radius:3px;cursor:pointer;text-transform:uppercase;background:#FFFFFF;display:inline-block;margin:2px}
.tag.on{background:#191923;color:#FFEB5A}
.toast{position:fixed;bottom:20px;right:20px;background:#191923;color:#FFEB5A;padding:10px 18px;border-radius:6px;font-weight:900;font-size:12px;text-transform:uppercase;border:2px solid #FFEB5A;box-shadow:4px 4px 0 #FFEB5A;z-index:999;opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:49}
.chasse-card{background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:12px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
@media(max-width:768px){.shell{flex-direction:column}.topbar{display:flex}.sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(-100%);width:240px}.sidebar.open{transform:translateX(0)}.sidebar-overlay.open{display:block}.main{padding:12px 14px}.g2,.g4{grid-template-columns:1fr 1fr}.fg2{grid-template-columns:1fr}}
`

const CATS_MAP = {all:{label:'Tous',emoji:'\u2630'},evenementiel:{label:'\u00c9v\u00e9nementiel',emoji:'\ud83c\udf89'},avocats:{label:'Avocats',emoji:'\u2696\ufe0f'},startup:{label:'Startups',emoji:'\ud83d\ude80'},agence_pub:{label:'Agences cr\u00e9a',emoji:'\ud83c\udfa8'},hotel:{label:'H\u00f4tels',emoji:'\ud83c\udfe8'},immo:{label:'Immobilier',emoji:'\ud83c\udfe2'},medical:{label:'M\u00e9dical',emoji:'\ud83c\udfe5'},production:{label:'Tournages',emoji:'\ud83c\udfac'},ecole:{label:'\u00c9coles',emoji:'\ud83c\udf93'},institution:{label:'Institutions',emoji:'\ud83c\udfdb\ufe0f'},luxe:{label:'Luxe & Mode',emoji:'\ud83d\udc5c'},tech:{label:'Tech',emoji:'\ud83d\udcbb'},conseil:{label:'Conseil',emoji:'\ud83d\udcca'},medias:{label:'M\u00e9dias',emoji:'\ud83d\udcf0'},coworking:{label:'Coworking',emoji:'\ud83c\udfd7\ufe0f'},banque:{label:'Banques',emoji:'\ud83c\udfe6'}}
const STATUS_P = {to_contact:'\u00c0 contacter',contacted:'Contact\u00e9',nego:'N\u00e9go',won:'Gagn\u00e9 \u2713',lost:'Perdu'}
const STATUS_PC = {to_contact:'#888',contacted:'#B8920A',nego:'#005FFF',won:'#009D3A',lost:'#CC0066'}
const TASK_S = {todo:'\u00c0 faire',in_progress:'En cours',done:'Termin\u00e9 \u2713'}
const CAT_ANN = {food:'\ud83e\udd69 Fournisseur',banque:'\ud83c\udfe6 Banque',presse:'\ud83d\udcf0 Presse',prestataire:'\ud83d\udd27 Prestataire',partenaire:'\ud83e\udd1d Partenaire',livraison:'\ud83d\udeb2 Livraison',fournisseur:'\ud83d\udce6 Fournisseur',it:'\ud83d\udcbb IT',juridique:'\u2696\ufe0f Juridique'}

const INIT_TASKS = [{id:1,title:'Cr\u00e9er le kit B2B',assignee:'emy',deadline:'2026-03-28',status:'in_progress',priority:'high',checklist:['S\u00e9lectionner les sandwichs','Faire les photos','R\u00e9diger les tarifs'],files:[]},{id:2,title:'RDV Wagram Events',assignee:'emy',deadline:'2026-03-28',status:'todo',priority:'high',checklist:['R\u00e9viser le pitch'],files:[]},{id:3,title:'Valider le menu B2B',assignee:'edward',deadline:'2026-03-30',status:'todo',priority:'high',checklist:[],files:[]},{id:4,title:'Appeler 5 prospects',assignee:'emy',deadline:'2026-03-31',status:'todo',priority:'medium',checklist:[],files:[]}]
const INIT_PROSPECTS = [{id:1,name:'Agence Wagram Events',email:'contact@wagram.fr',phone:'01 40 xx xx xx',size:'10-50',category:'\u00c9v\u00e9nementiel',status:'contacted',nextAction:'Envoyer devis',nextDate:'2026-03-25',notes:'Int\u00e9ress\u00e9e plateaux.',ca:0,score:8,files:[]},{id:2,name:'Station F',email:'office@stationf.co',phone:'06 98 76 54 32',size:'200-1000',category:'Startup',status:'nego',nextAction:'Envoyer devis URGENT',nextDate:'2026-03-25',notes:'Commandes r\u00e9guli\u00e8res.',ca:0,score:9,files:[]}]
const INIT_CONTACTS = [{id:1,cat:'food',name:'Maison V\u00e9rot',contact:'\u2014',phone:'01 45 44 01 66',email:'contact@maisonverot.fr',notes:'Livraison lun-ven',vip:false},{id:2,cat:'banque',name:'BNP Paribas Vavin',contact:'Marie Dupont',phone:'01 56 xx xx xx',email:'m.dupont@bnp.fr',notes:'Gestionnaire pro',vip:false}]
const INIT_VAULT = [{id:1,title:'Supabase',url:'https://supabase.com',user:'edward@meshuga.fr',pw:''},{id:2,title:'Vercel',url:'https://vercel.com',user:'edward@meshuga.fr',pw:''}]

export default function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('dash')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tasks, setTasks] = useState(INIT_TASKS)
  const [prospects, setProspects] = useState(INIT_PROSPECTS)
  const [contacts, setContacts] = useState(INIT_CONTACTS)
  const [vault, setVault] = useState(INIT_VAULT)
  const [reports, setReports] = useState([])
  const [toastMsg, setToastMsg] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState({})
  const [pwVisible, setPwVisible] = useState({})
  const [contactedToday, setContactedToday] = useState(0)
  const [activityLog, setActivityLog] = useState([])
  const [journalFilter, setJournalFilter] = useState('all')
  const [planningWeek, setPlanningWeek] = useState(0)
  const [chasseCat, setChasseChasse] = useState('all')
  const [chasseSearch, setChasseSearch] = useState('')
  const [chasseSort, setChasseSort] = useState('score')
  const [chasseTaille, setChasseTable] = useState('all')
  const [chasseStatus, setChasseStatus2] = useState('all')
  const [chasse, setChasse] = useState([])
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState('')

  useEffect(() => {
    async function load() {
      const res = await sb().auth.getUser()
      const user = res.data.user
      if (!user) return
      const r2 = await sb().from('profiles').select('*').eq('id', user.id).single()
      const prof = r2.data
      if (prof && prof.role) {
        setProfile(prof)
      } else {
        const role = user.email && user.email.includes('emy') ? 'emy' : 'edward'
        setProfile({ role: role, full_name: role === 'emy' ? 'Emy' : 'Edward', email: user.email })
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!profile) return
    sb().from('activity_log').select('*').order('created_at', {ascending: false}).limit(200).then(function(r) {
      if (r.data) setActivityLog(r.data)
    })
    sb().from('activity_log').insert({user_role: profile.role, user_name: profile.full_name || profile.role, type: 'session_start', description: 'Connexion', prospect_name: null, email_content: null})
  }, [profile])

  const toast = function(msg) { setToastMsg(msg); setTimeout(function() { setToastMsg('') }, 2800) }
  const openModal = function(id, data) { setForm(data || {}); setModal(id) }
  const closeModal = function() { setModal(''); setForm({}) }
  const nav = function(p) { setPage(p); setSidebarOpen(false) }

  const today = new Date().toISOString().split('T')[0]
  const isEmy = profile && profile.role === 'emy'

  function logActivity(type, description, prospectName, emailContent) {
    const entry = {user_role: (profile && profile.role) || 'unknown', user_name: (profile && profile.full_name) || '?', type: type, description: description, prospect_name: prospectName || null, email_content: emailContent || null}
    sb().from('activity_log').insert(entry)
    setActivityLog(function(prev) { return [{id: Date.now(), created_at: new Date().toISOString(), ...entry}].concat(prev.slice(0, 199)) })
  }

  function saveTask() {
    if (!form.title) { toast('Titre requis !'); return }
    const t = Object.assign({}, form, {checklist: form.checklist || [], files: form.files || []})
    if (form.id) { setTasks(function(prev) { return prev.map(function(x) { return x.id === form.id ? t : x }) }) }
    else { setTasks(function(prev) { return prev.concat([Object.assign({}, t, {id: Date.now(), status: 'todo'})]) }) }
    closeModal()
  }

  function saveProspect() {
    if (!form.name) { toast('Nom requis !'); return }
    const p = Object.assign({}, form, {files: form.files || []})
    if (form.id) { setProspects(function(prev) { return prev.map(function(x) { return x.id === form.id ? p : x }) }) }
    else { setProspects(function(prev) { return prev.concat([Object.assign({}, p, {id: Date.now(), status: 'to_contact', ca: 0})]) }) }
    closeModal()
  }

  function saveContact() {
    if (!form.name) { toast('Nom requis !'); return }
    if (form.id) { setContacts(function(prev) { return prev.map(function(x) { return x.id === form.id ? Object.assign({}, form) : x }) }) }
    else { setContacts(function(prev) { return prev.concat([Object.assign({}, form, {id: Date.now()})]) }) }
    closeModal()
  }

  function saveVault() {
    if (!form.title) { toast('Titre requis !'); return }
    if (form.id) { setVault(function(prev) { return prev.map(function(x) { return x.id === form.id ? Object.assign({}, form) : x }) }) }
    else { setVault(function(prev) { return prev.concat([Object.assign({}, form, {id: Date.now()})]) }) }
    closeModal()
  }

  function submitCR() {
    if (!form.week) { toast('Semaine requise !'); return }
    const cr = Object.assign({}, form, {id: Date.now(), status: 'submitted', date: new Date().toLocaleDateString('fr-FR')})
    setReports(function(prev) { return [cr].concat(prev) })
    closeModal()
  }

  const NAV = [
    {id: 'dash', label: 'Dashboard', icon: '\u26a1'},
    {id: 'chasse', label: 'Tableau de chasse', icon: '\ud83c\udfaf'},
    {id: 'crm', label: 'CRM Prospects', icon: '\u25ce'},
    {id: 'annuaire', label: 'Annuaire', icon: '\ud83d\udcd2'},
    {id: 'tasks', label: 'Taches', icon: '\u2713'},
    {id: 'reporting', label: 'Reporting', icon: '\ud83d\udccb'},
    {id: 'vault', label: 'Coffre-fort', icon: '\ud83d\udd10'},
    {id: 'gmb', label: 'Google My Biz.', icon: '\u2b50'},
    {id: 'journal', label: 'Journal Emy', icon: '\ud83d\udcd3'},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <style>{G}</style>

      {!profile && (
        <div style={{position:'fixed',inset:0,background:'#FFEB5A',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,flexDirection:'column',gap:16}}>
          <div style={{fontSize:48}}>\ud83d\ude2c</div>
          <div style={{fontWeight:900,fontSize:14,textTransform:'uppercase',letterSpacing:3}}>Chargement...</div>
        </div>
      )}

      <div className="topbar">
        <button className="hamburger" onClick={function() { setSidebarOpen(!sidebarOpen) }}>\u2630</button>
        <span style={{fontWeight:900,fontSize:18,textTransform:'uppercase',letterSpacing:2,color:'#FFEB5A'}}>meshuga</span>
        <span className="yt" style={{fontSize:13,color:'#FF82D7'}}>{isEmy ? 'Emy' : 'Edward'}</span>
      </div>

      <div className="shell">
        <div className={sidebarOpen ? 'sidebar-overlay open' : 'sidebar-overlay'} onClick={function() { setSidebarOpen(false) }} />
        <div className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
          <div className="sb-logo">
            <div className="sb-stamp">\ud83d\ude2c</div>
            <div>
              <div style={{fontWeight:900,fontSize:18,textTransform:'uppercase',letterSpacing:2,lineHeight:1}}>meshuga</div>
              <div className="yt" style={{fontSize:12,opacity:.45}}>B2B Manager</div>
            </div>
          </div>
          <nav className="sb-nav">
            {NAV.map(function(n) {
              return (
                <div key={n.id} className={page === n.id ? 'ni active' : 'ni'} onClick={function() { nav(n.id) }}>
                  <span style={{fontSize:14}}>{n.icon}</span>{n.label}
                </div>
              )
            })}
          </nav>
          <div style={{padding:'10px 12px 14px',borderTop:'3px solid #191923'}}>
            <div style={{fontWeight:900,fontSize:11,textTransform:'uppercase',marginBottom:4}}>{profile && (profile.full_name || (profile.email && profile.email.split('@')[0]))}</div>
            <div className="yt" style={{fontSize:11,opacity:.4,marginBottom:8}}>{isEmy ? 'B2B Manager' : 'The Big Boss'}</div>
            <button className="btn btn-sm" style={{width:'100%',justifyContent:'center',opacity:.6}} onClick={function() { sb().auth.signOut().then(function() { window.location.href = '/login' }) }}>
              \u21a9 D\u00e9connexion
            </button>
          </div>
        </div>

        <div className="main">
          <div className="strip" />

          {page === 'dash' && (
            <div>
              <div className="ph">
                <div>
                  <div className="pt">{isEmy ? 'Bonjour Emy \ud83c\udf38' : 'Bonjour Edward \ud83d\udc4b'}</div>
                  <div className="ps">{new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long'})}</div>
                </div>
                {isEmy && <button className="btn btn-n btn-sm" onClick={function() { openModal('cr', {}) }}>+ Nouveau CR</button>}
              </div>

              <div className="g4">
                <div className="kc" style={{background:'#FFEB5A'}} onClick={function() { nav('crm') }}>
                  <div className="kl">Pipeline B2B</div>
                  <div className="kv">{prospects.filter(function(p) { return !['won','lost'].includes(p.status) }).length}</div>
                  <div className="ki">\u25ce</div>
                </div>
                <div className="kc" style={{background:'#FF82D7'}} onClick={function() { nav('tasks') }}>
                  <div className="kl">T\u00e2ches actives</div>
                  <div className="kv">{tasks.filter(function(t) { return t.status !== 'done' }).length}</div>
                  <div className="ki">\u2713</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={function() { nav('reporting') }}>
                  <div className="kl">CRs soumis</div>
                  <div className="kv">{reports.length}</div>
                  <div className="ki">\ud83d\udccb</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={function() { nav('annuaire') }}>
                  <div className="kl">Contacts</div>
                  <div className="kv">{contacts.length}</div>
                  <div className="ki">\ud83d\udcd2</div>
                </div>
              </div>

              <div className="g2">
                <div className="card">
                  <div className="ct">{isEmy ? 'Mes t\u00e2ches' : 'T\u00e2ches \u00e9quipe'}</div>
                  {tasks.filter(function(t) { return t.status !== 'done' }).slice(0,4).map(function(t) {
                    return (
                      <div key={t.id} className="row" style={{gridTemplateColumns:'4px 1fr auto',gap:10}}>
                        <div className="pbar" style={{background:t.priority==='high'?'#FF82D7':'#005FFF'}} />
                        <div><div style={{fontSize:12,fontWeight:900}}>{t.title}</div><div style={{fontSize:10,opacity:.5}}>{t.deadline} \u00b7 {t.assignee}</div></div>
                        <span className="badge" style={{color:'#888',borderColor:'#ccc'}}>{TASK_S[t.status]}</span>
                      </div>
                    )
                  })}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={function() { nav('tasks') }}>Voir toutes \u2192</button>
                </div>
                <div className="card">
                  <div className="ct">{isEmy ? 'Mon pipeline' : 'Prospects chauds'}</div>
                  {prospects.filter(function(p) { return !['won','lost'].includes(p.status) }).slice(0,4).map(function(p) {
                    return (
                      <div key={p.id} className="row" style={{gridTemplateColumns:'1fr auto',gap:8}}>
                        <div><div style={{fontSize:12,fontWeight:900}}>{p.name}</div><div style={{fontSize:10,opacity:.5}}>{p.nextAction}</div></div>
                        <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                      </div>
                    )
                  })}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={function() { nav('crm') }}>Voir le CRM \u2192</button>
                </div>
              </div>

              <div className="card" style={{padding:0,overflow:'hidden'}}>
                <div style={{background:'#191923',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div className="yt" style={{color:'#FFEB5A',fontSize:16}}>\ud83d\udcc5 Planning {isEmy ? 'de ma semaine' : "d'Emy"}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={function() { setPlanningWeek(function(w) { return w-1 }) }}>\u2190</button>
                    <span style={{color:'#FFEB5A',fontSize:11,fontWeight:900,minWidth:100,textAlign:'center'}}>{planningWeek===0 ? 'Cette semaine' : planningWeek < 0 ? 'Sem. -'+Math.abs(planningWeek) : 'Sem. +'+planningWeek}</span>
                    <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={function() { setPlanningWeek(function(w) { return w+1 }) }}>\u2192</button>
                    {planningWeek !== 0 && <button className="btn btn-y btn-sm" onClick={function() { setPlanningWeek(0) }}>Auj.</button>}
                  </div>
                </div>
                <div style={{padding:'10px 14px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5}}>
                  {['Lun','Mar','Mer','Jeu','Ven'].map(function(day, di) {
                    const ws = new Date()
                    const dow = ws.getDay() === 0 ? 6 : ws.getDay()-1
                    ws.setDate(ws.getDate()-dow+(planningWeek*7))
                    const dd = new Date(ws)
                    dd.setDate(ws.getDate()+di)
                    const ds = dd.toISOString().split('T')[0]
                    const isToday = ds === new Date().toISOString().split('T')[0]
                    const dt = tasks.filter(function(t) { return t.deadline === ds && t.assignee === 'emy' })
                    return (
                      <div key={day} style={{borderRadius:5,border:'2px solid '+(isToday?'#005FFF':'#EBEBEB'),background:isToday?'#E3F0FF':'#FAFAFA',padding:'6px',minHeight:60}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <div className="yt" style={{fontSize:11,color:isToday?'#005FFF':'#191923'}}>{day}</div>
                          <div style={{fontSize:9,opacity:.4}}>{dd.getDate()}/{dd.getMonth()+1}</div>
                        </div>
                        {dt.length === 0 ? <div style={{fontSize:9,opacity:.25,textAlign:'center'}}>-</div> : dt.map(function(t) {
                          return <div key={t.id} onClick={function() { nav('tasks') }} style={{cursor:'pointer',background:'rgba(0,95,255,.1)',borderLeft:'3px solid #005FFF',padding:'2px 4px',marginBottom:2,fontSize:9,fontWeight:900,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {page === 'tasks' && (
            <div>
              <div className="ph">
                <div><div className="pt">T\u00e2ches</div><div className="ps">{tasks.filter(function(t) { return t.status!=='done' }).length} actives</div></div>
                <button className="btn btn-y btn-sm" onClick={function() { openModal('task', {assignee:'emy',priority:'medium',status:'todo',checklist:[],files:[]}) }}>+ Nouvelle</button>
              </div>
              {tasks.map(function(t) {
                return (
                  <div key={t.id} className="card" style={{padding:0,overflow:'hidden',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'stretch'}}>
                      <div style={{width:6,background:t.priority==='high'?'#FF82D7':t.priority==='medium'?'#005FFF':'#009D3A',flexShrink:0}} />
                      <div style={{padding:'12px 14px',flex:1}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:13,fontWeight:900}}>{t.title}</div>
                            <div style={{fontSize:10,opacity:.5,marginTop:2}}>{t.deadline} \u00b7 {t.assignee}</div>
                          </div>
                          <div style={{display:'flex',gap:4}}>
                            <span className="badge" style={{color:t.status==='done'?'#009D3A':'#888',borderColor:t.status==='done'?'#009D3A':'#ccc'}}>{TASK_S[t.status]}</span>
                            <button className="btn btn-y btn-sm" onClick={function() {
                              const o = ['todo','in_progress','done']
                              setTasks(function(prev) { return prev.map(function(x) { return x.id !== t.id ? x : Object.assign({}, x, {status: o[Math.min(o.indexOf(x.status)+1,2)]}) }) })
                            }}>\u2192</button>
                            <button className="btn btn-sm" onClick={function() { openModal('task', Object.assign({}, t)) }}>\u270f\ufe0f</button>
                            <button className="btn btn-sm btn-red" onClick={function() { setTasks(function(prev) { return prev.filter(function(x) { return x.id !== t.id }) }) }}>\u2715</button>
                          </div>
                        </div>
                        {t.checklist && t.checklist.filter(function(c) { return c }).length > 0 && (
                          <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid #EBEBEB'}}>
                            {t.checklist.filter(function(c) { return c }).map(function(item, ci) {
                              return (
                                <div key={ci} style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                                  <input type="checkbox" checked={item.startsWith('\u2713 ')} style={{width:13,height:13,cursor:'pointer'}}
                                    onChange={function(e) {
                                      const nl = t.checklist.slice()
                                      nl[ci] = e.target.checked ? '\u2713 '+item.replace('\u2713 ','') : item.replace('\u2713 ','')
                                      setTasks(function(prev) { return prev.map(function(x) { return x.id===t.id ? Object.assign({},x,{checklist:nl}) : x }) })
                                    }} />
                                  <span style={{fontSize:11,textDecoration:item.startsWith('\u2713 ')?'line-through':'none',opacity:item.startsWith('\u2713 ')?.4:1}}>{item.replace('\u2713 ','')}</span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {page === 'crm' && (
            <div>
              <div className="ph">
                <div><div className="pt">CRM Prospects</div><div className="ps">{prospects.length} prospects</div></div>
                <button className="btn btn-y btn-sm" onClick={function() { openModal('prospect', {status:'to_contact',ca:0,files:[]}) }}>+ Nouveau</button>
              </div>
              {prospects.map(function(p) {
                return (
                  <div key={p.id} className="card" style={{cursor:'pointer',marginBottom:8}} onClick={function() { openModal('prospect', Object.assign({}, p)) }}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:6}}>
                      <div>
                        <div style={{fontWeight:900,fontSize:14}}>{p.name}</div>
                        <div style={{fontSize:11,opacity:.5}}>{p.category} \u00b7 {p.email}</div>
                      </div>
                      <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                    </div>
                    {p.nextDate && <div style={{fontSize:11,opacity:.6}}>{p.nextAction}</div>}
                    {p.files && p.files.filter(function(f) { return f && f.trim() }).length > 0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                        {p.files.filter(function(f) { return f && f.trim() }).map(function(f, i) {
                          return <span key={i} style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px',fontSize:9,fontWeight:900}}>\ud83d\udce6 {f.slice(0,25)}</span>
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {page === 'annuaire' && (
            <div>
              <div className="ph">
                <div><div className="pt">Annuaire</div><div className="ps">{contacts.length} contacts</div></div>
                <button className="btn btn-y btn-sm" onClick={function() { openModal('contact', {cat:'food',vip:false}) }}>+ Ajouter</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12}}>
                {contacts.map(function(c) {
                  return (
                    <div key={c.id} className="card" style={{cursor:'pointer'}} onClick={function() { openModal('contact', Object.assign({}, c)) }}>
                      <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,display:'inline-block',marginBottom:7,background:'#FFEB5A'}}>{CAT_ANN[c.cat]||c.cat}</div>
                      <div style={{fontWeight:900,fontSize:14}}>{c.name}</div>
                      {c.phone && c.phone !== '\u2014' && <div style={{fontSize:11,marginTop:4}}>\ud83d\udcde {c.phone}</div>}
                      {c.email && <div style={{fontSize:11,marginTop:2}}>\u2709\ufe0f {c.email}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {page === 'reporting' && (
            <div>
              <div className="ph">
                <div><div className="pt">Reporting</div><div className="ps">Compte-rendus hebdo</div></div>
                {isEmy && <button className="btn btn-n btn-sm" onClick={function() { openModal('cr', {}) }}>+ Nouveau CR</button>}
              </div>
              {!isEmy && (
                <div className="card-y" style={{marginBottom:12}}>
                  <div className="ct">\ud83d\udcdd Formulaire CR Emy</div>
                  <div style={{fontSize:12,opacity:.7}}>Semaine \u00b7 Prospects contact\u00e9s \u00b7 RDV \u00b7 Commandes \u00b7 Victoires \u00b7 Challenges \u00b7 Priorit\u00e9s S+1 \u00b7 Note pour Edward</div>
                </div>
              )}
              {reports.length === 0 && (
                <div className="card" style={{textAlign:'center',padding:40}}>
                  <div style={{fontSize:40,marginBottom:10}}>\ud83d\udccb</div>
                  <div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun CR pour l'instant</div>
                  {isEmy && <button className="btn btn-y" style={{marginTop:14}} onClick={function() { openModal('cr', {}) }}>Cr\u00e9er le premier CR</button>}
                </div>
              )}
              {reports.map(function(r, i) {
                return (
                  <div key={r.id} className="card-y" style={{border:'2px solid #191923',borderRadius:7,boxShadow:'3px 3px 0 #191923',marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{r.week}</div>
                      <span className="badge" style={{color:'#005FFF',borderColor:'#005FFF'}}>{r.date}</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                      {[['Prospects',r.prospects],['RDV',r.rdv],['Commandes',r.cmds]].map(function(pair) {
                        return (
                          <div key={pair[0]} style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}>
                            <div style={{fontWeight:900,fontSize:20}}>{pair[1]}</div>
                            <div className="yt" style={{fontSize:11,opacity:.5}}>{pair[0]}</div>
                          </div>
                        )
                      })}
                    </div>
                    {r.wins && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>\u2705 Victoires</div><div style={{fontSize:12}}>{r.wins}</div></div>}
                    {r.challenges && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>\u26a1 Challenges</div><div style={{fontSize:12}}>{r.challenges}</div></div>}
                    {r.next && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>\ud83c\udfaf Priorit\u00e9s S+1</div><div style={{fontSize:12}}>{r.next}</div></div>}
                    {r.notes && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>\ud83d\udcac Note d'Emy</div><div style={{fontSize:12}}>{r.notes}</div></div>}
                    {r.feedback && <div style={{background:'#FF82D7',border:'2px solid #191923',borderRadius:5,padding:10}}><div className="yt" style={{fontSize:14,marginBottom:4}}>Retour d'Edward</div><div style={{fontSize:12}}>{r.feedback}</div></div>}
                    {!isEmy && !r.feedback && (
                      <div style={{marginTop:10}}>
                        <div className="lbl">Ton retour \u00e0 Emy</div>
                        <textarea className="inp" placeholder="Bravo, recadrages..." id={'fb-'+r.id} style={{minHeight:60}} />
                        <button className="btn btn-y btn-sm" style={{marginTop:6}} onClick={function() {
                          const el = document.getElementById('fb-'+r.id)
                          const v = el ? el.value : ''
                          if (v) { setReports(function(prev) { return prev.map(function(x, j) { return j===i ? Object.assign({},x,{feedback:v,status:'read'}) : x }) }); toast('Retour envoy\u00e9 \u2713') }
                        }}>Envoyer</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {page === 'vault' && (
            <div>
              <div className="ph">
                <div><div className="pt">Coffre-fort \ud83d\udd10</div><div className="ps">Acc\u00e8s s\u00e9curis\u00e9s</div></div>
                <button className="btn btn-y btn-sm" onClick={function() { openModal('vault', {}) }}>+ Ajouter</button>
              </div>
              {vault.map(function(v, i) {
                return (
                  <div key={v.id} className="card" style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
                      <div style={{fontWeight:900,fontSize:13}}>{v.title}</div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#005FFF',textDecoration:'none'}} onClick={function(e) { e.stopPropagation() }}>{v.url}</a>
                      <div style={{fontSize:11}}>{v.user}</div>
                      <div style={{fontFamily:'monospace',fontSize:11,cursor:'pointer'}} onClick={function() { setPwVisible(function(prev) { const n = Object.assign({}, prev); n[i] = !n[i]; return n }) }}>{pwVisible[i] ? (v.pw || '(vide)') : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}</div>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-sm" onClick={function() { openModal('vault', Object.assign({}, v)) }}>\u270f\ufe0f</button>
                        <button className="btn btn-sm btn-red" onClick={function() { setVault(function(prev) { return prev.filter(function(x) { return x.id !== v.id }) }); toast('Supprim\u00e9') }}>\u2715</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {page === 'gmb' && (
            <div>
              <div className="ph"><div><div className="pt">Google My Business</div><div className="ps">Avis \u00b7 Visibilit\u00e9</div></div></div>
              <div className="card-y">
                <div className="ct">\ud83d\udd17 Connexion requise</div>
                <p style={{fontSize:13,marginBottom:14}}>Configure Google My Business pour voir tes avis.</p>
                <button className="btn btn-n" onClick={function() { window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?client_id='+process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID+'&redirect_uri='+window.location.origin+'/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent' }}>Se connecter avec Google \u2192</button>
              </div>
            </div>
          )}

          {page === 'journal' && (
            <div>
              <div className="ph"><div><div className="pt">Journal d'Emy \ud83d\udcd3</div><div className="ps">Sessions \u00b7 Contacts \u00b7 Emails</div></div></div>
              <div className="card" style={{marginBottom:12,padding:'12px 14px',background:'#191923',borderRadius:7}}>
                <div className="yt" style={{fontSize:13,marginBottom:8,color:'#FF82D7'}}>\ud83d\udd50 Sessions de connexion</div>
                {activityLog.filter(function(a) { return a.type === 'session_start' }).slice(0,10).map(function(a, i) {
                  return (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
                      <div style={{fontSize:12,fontWeight:900,color:'#FFEB5A'}}>{a.user_name}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{new Date(a.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  )
                })}
                {activityLog.filter(function(a) { return a.type === 'session_start' }).length === 0 && <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Aucune session</div>}
              </div>
              <div style={{display:'flex',gap:6,marginBottom:10}}>
                {[['all','Tout'],['email_copie','\u2709\ufe0f Emails'],['prospect_contacte','\ud83d\udcde Contacts']].map(function(pair) {
                  return <div key={pair[0]} className={journalFilter===pair[0]?'tag on':'tag'} onClick={function() { setJournalFilter(pair[0]) }}>{pair[1]}</div>
                })}
              </div>
              {activityLog.filter(function(a) { return a.type !== 'session_start' && (journalFilter === 'all' || a.type === journalFilter) }).length === 0 ? (
                <div className="card" style={{textAlign:'center',padding:40,opacity:.4}}>
                  <div style={{fontSize:32,marginBottom:8}}>\ud83d\udcd3</div>
                  <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase'}}>Aucune activit\u00e9</div>
                </div>
              ) : activityLog.filter(function(a) { return a.type !== 'session_start' && (journalFilter === 'all' || a.type === journalFilter) }).map(function(a) {
                return (
                  <div key={a.id || a.created_at} className="card" style={{padding:'12px 14px',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                      <div>
                        <div style={{fontWeight:900,fontSize:13}}>{a.description}</div>
                        {a.prospect_name && <div style={{fontSize:11,opacity:.5}}>\ud83c\udfaf {a.prospect_name}</div>}
                        {a.email_content && (
                          <details style={{marginTop:6}}>
                            <summary style={{cursor:'pointer',fontSize:11,fontWeight:900,opacity:.6}}>Voir l'email</summary>
                            <div style={{background:'#F8F8F8',border:'1.5px solid #DEDEDE',borderRadius:5,padding:10,marginTop:6,fontSize:12,whiteSpace:'pre-wrap'}}>{a.email_content}</div>
                          </details>
                        )}
                      </div>
                      <div style={{fontSize:10,opacity:.4}}>{new Date(a.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {modal === 'task' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={function(e) { e.stopPropagation() }}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouvelle t\u00e2che'}</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={function(e) { setForm(Object.assign({},form,{title:e.target.value})) }} /></div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Assign\u00e9e \u00e0</label><select className="inp" value={form.assignee||'emy'} onChange={function(e) { setForm(Object.assign({},form,{assignee:e.target.value})) }}><option value="emy">Emy</option><option value="edward">Edward</option></select></div>
                <div className="fg"><label className="lbl">Deadline</label><input type="date" className="inp" value={form.deadline||''} onChange={function(e) { setForm(Object.assign({},form,{deadline:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Priorit\u00e9</label><select className="inp" value={form.priority||'medium'} onChange={function(e) { setForm(Object.assign({},form,{priority:e.target.value})) }}><option value="high">\ud83d\udd34 Haute</option><option value="medium">\ud83d\udfe1 Moyenne</option><option value="low">\ud83d\udfe2 Basse</option></select></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp" value={form.status||'todo'} onChange={function(e) { setForm(Object.assign({},form,{status:e.target.value})) }}><option value="todo">\u00c0 faire</option><option value="in_progress">En cours</option><option value="done">Termin\u00e9</option></select></div>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div className="lbl" style={{margin:0}}>Sous-t\u00e2ches</div>
                  <button className="btn btn-y btn-sm" onClick={function() { setForm(Object.assign({},form,{checklist:(form.checklist||[]).concat([''])})) }}>+ Ajouter</button>
                </div>
                {(form.checklist||[]).map(function(item, i) {
                  return (
                    <div key={i} style={{display:'flex',gap:6,marginBottom:5}}>
                      <input className="inp" value={item} onChange={function(e) { const c = (form.checklist||[]).slice(); c[i] = e.target.value; setForm(Object.assign({},form,{checklist:c})) }} placeholder={'Sous-t\u00e2che '+(i+1)} style={{fontSize:12,padding:'5px 8px'}} />
                      <button className="btn btn-sm btn-red" onClick={function() { setForm(Object.assign({},form,{checklist:(form.checklist||[]).filter(function(_,j) { return j!==i })})) }}>\u2715</button>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={function() { setTasks(function(prev) { return prev.filter(function(x) { return x.id!==form.id }) }); closeModal() }}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveTask}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'prospect' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-xl" onClick={function(e) { e.stopPropagation() }}>
            <div className="mh"><div className="mt">{form.id ? form.name : 'Nouveau prospect'}</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={function(e) { setForm(Object.assign({},form,{name:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={function(e) { setForm(Object.assign({},form,{email:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">T\u00e9l\u00e9phone</label><input className="inp" value={form.phone||''} onChange={function(e) { setForm(Object.assign({},form,{phone:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp" value={form.status||'to_contact'} onChange={function(e) { setForm(Object.assign({},form,{status:e.target.value})) }}><option value="to_contact">\u00c0 contacter</option><option value="contacted">Contact\u00e9</option><option value="nego">N\u00e9go</option><option value="won">Gagn\u00e9</option><option value="lost">Perdu</option></select></div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label className="lbl">Prochaine relance</label>
                  <div style={{display:'flex',gap:6}}>
                    <input type="date" className="inp" style={{flex:1}} value={form.nextDate||''} onChange={function(e) { setForm(Object.assign({},form,{nextDate:e.target.value})) }} />
                    <button className="btn btn-sm" onClick={function() { const d=new Date();d.setDate(d.getDate()+7);setForm(Object.assign({},form,{nextDate:d.toISOString().split('T')[0]})) }}>+7j</button>
                  </div>
                  <input className="inp" style={{marginTop:6}} value={form.nextAction||''} onChange={function(e) { setForm(Object.assign({},form,{nextAction:e.target.value})) }} placeholder="Action pr\u00e9vue\u2026" />
                </div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e) { setForm(Object.assign({},form,{notes:e.target.value})) }} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label className="lbl">Documents joints</label>
                  <textarea className="inp" style={{minHeight:55}} value={(form.files||[]).join('\n')} onChange={function(e) { setForm(Object.assign({},form,{files:e.target.value.split('\n')})) }} placeholder="Devis_2026.pdf" />
                </div>
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={function() { setProspects(function(prev) { return prev.filter(function(x) { return x.id!==form.id }) }); closeModal() }}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveProspect}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'contact' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e) { e.stopPropagation() }}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouveau contact'}</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg"><label className="lbl">Cat\u00e9gorie</label><select className="inp" value={form.cat||'food'} onChange={function(e) { setForm(Object.assign({},form,{cat:e.target.value})) }}><option value="food">Fournisseur food</option><option value="banque">Banque</option><option value="presse">Presse</option><option value="prestataire">Prestataire</option><option value="partenaire">Partenaire</option><option value="livraison">Livraison</option><option value="fournisseur">Fournisseur</option><option value="it">IT</option><option value="juridique">Juridique</option></select></div>
                <div className="fg" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" checked={!!form.vip} onChange={function(e) { setForm(Object.assign({},form,{vip:e.target.checked})) }} style={{width:16,height:16}} /><span style={{fontSize:12}}>VIP \u2b50</span></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Nom *</label><input className="inp" value={form.name||''} onChange={function(e) { setForm(Object.assign({},form,{name:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">T\u00e9l\u00e9phone</label><input className="inp" value={form.phone||''} onChange={function(e) { setForm(Object.assign({},form,{phone:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={function(e) { setForm(Object.assign({},form,{email:e.target.value})) }} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e) { setForm(Object.assign({},form,{notes:e.target.value})) }} /></div>
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={function() { setContacts(function(prev) { return prev.filter(function(x) { return x.id!==form.id }) }); closeModal() }}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveContact}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'vault' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e) { e.stopPropagation() }}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouvel acc\u00e8s'} \ud83d\udd10</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.title||''} onChange={function(e) { setForm(Object.assign({},form,{title:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">URL</label><input className="inp" value={form.url||''} onChange={function(e) { setForm(Object.assign({},form,{url:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Identifiant</label><input className="inp" value={form.user||''} onChange={function(e) { setForm(Object.assign({},form,{user:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Mot de passe</label><input type="password" className="inp" value={form.pw||''} onChange={function(e) { setForm(Object.assign({},form,{pw:e.target.value})) }} /></div>
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={function() { setVault(function(prev) { return prev.filter(function(x) { return x.id!==form.id }) }); closeModal() }}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveVault}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'cr' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e) { e.stopPropagation() }}>
            <div className="mh"><div className="mt">Compte-rendu hebdomadaire</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Semaine du *</label><input className="inp" value={form.week||''} onChange={function(e) { setForm(Object.assign({},form,{week:e.target.value})) }} placeholder="ex: 25 mars 2026" /></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                <div className="fg"><label className="lbl">Prospects</label><input type="number" className="inp" value={form.prospects||0} onChange={function(e) { setForm(Object.assign({},form,{prospects:parseInt(e.target.value)||0})) }} /></div>
                <div className="fg"><label className="lbl">RDV</label><input type="number" className="inp" value={form.rdv||0} onChange={function(e) { setForm(Object.assign({},form,{rdv:parseInt(e.target.value)||0})) }} /></div>
                <div className="fg"><label className="lbl">Commandes</label><input type="number" className="inp" value={form.cmds||0} onChange={function(e) { setForm(Object.assign({},form,{cmds:parseInt(e.target.value)||0})) }} /></div>
              </div>
              <div className="fg"><label className="lbl">\u2705 Victoires</label><textarea className="inp" value={form.wins||''} onChange={function(e) { setForm(Object.assign({},form,{wins:e.target.value})) }} /></div>
              <div className="fg"><label className="lbl">\u26a1 Challenges</label><textarea className="inp" value={form.challenges||''} onChange={function(e) { setForm(Object.assign({},form,{challenges:e.target.value})) }} /></div>
              <div className="fg"><label className="lbl">\ud83c\udfaf Priorit\u00e9s S+1</label><textarea className="inp" value={form.next||''} onChange={function(e) { setForm(Object.assign({},form,{next:e.target.value})) }} /></div>
              <div className="fg"><label className="lbl">\ud83d\udcac Note pour Edward</label><textarea className="inp" value={form.notes||''} onChange={function(e) { setForm(Object.assign({},form,{notes:e.target.value})) }} /></div>
            </div>
            <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={submitCR}>Soumettre \u00e0 Edward</button></div>
          </div>
        </div>
      )}

      <div className={toastMsg ? 'toast show' : 'toast'}>{toastMsg}</div>
    </div>
  )
}
