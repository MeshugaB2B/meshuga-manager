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

const CATS_MAP = {all:{label:'Tous',emoji:'☰'},evenementiel:{label:'Événementiel',emoji:'🎉'},avocats:{label:'Avocats',emoji:'⚖️'},startup:{label:'Startups',emoji:'🚀'},agence_pub:{label:'Agences créa',emoji:'🎨'},hotel:{label:'Hôtels',emoji:'🏨'},immo:{label:'Immobilier',emoji:'🏢'},medical:{label:'Médical',emoji:'🏥'},production:{label:'Tournages',emoji:'🎬'},ecole:{label:'Écoles',emoji:'🎓'},institution:{label:'Institutions',emoji:'🏛️'},luxe:{label:'Luxe & Mode',emoji:'👜'},tech:{label:'Tech',emoji:'💻'},conseil:{label:'Conseil',emoji:'📊'},medias:{label:'Médias',emoji:'📰'},coworking:{label:'Coworking',emoji:'🏗️'},banque:{label:'Banques',emoji:'🏦'}}
const STATUS_P = {to_contact:'À contacter',contacted:'Contacté',nego:'Négo',won:'Gagné ✓',lost:'Perdu'}
const STATUS_PC = {to_contact:'#888',contacted:'#B8920A',nego:'#005FFF',won:'#009D3A',lost:'#CC0066'}
const TASK_S = {todo:'À faire',in_progress:'En cours',done:'Terminé ✓'}
const CAT_ANN = {food:'🥩 Fournisseur',banque:'🏦 Banque',presse:'📰 Presse',prestataire:'🔧 Prestataire',partenaire:'🤝 Partenaire',livraison:'🚲 Livraison',fournisseur:'📦 Fournisseur',it:'💻 IT',juridique:'⚖️ Juridique'}

const INIT_TASKS = [{id:1,title:'Créer le kit B2B',assignee:'emy',deadline:'2026-03-28',status:'in_progress',priority:'high',checklist:['Sélectionner les sandwichs','Faire les photos','Rédiger les tarifs'],files:[]},{id:2,title:'RDV Wagram Events',assignee:'emy',deadline:'2026-03-28',status:'todo',priority:'high',checklist:['Réviser le pitch'],files:[]},{id:3,title:'Valider le menu B2B',assignee:'edward',deadline:'2026-03-30',status:'todo',priority:'high',checklist:[],files:[]},{id:4,title:'Appeler 5 prospects',assignee:'emy',deadline:'2026-03-31',status:'todo',priority:'medium',checklist:[],files:[]}]
const INIT_PROSPECTS = [{id:1,name:'Agence Wagram Events',email:'contact@wagram.fr',phone:'01 40 xx xx xx',size:'10-50',category:'Événementiel',status:'contacted',nextAction:'Envoyer devis',nextDate:'2026-03-25',notes:'Intéressée plateaux.',ca:0,score:8,files:[]},{id:2,name:'Station F',email:'office@stationf.co',phone:'06 98 76 54 32',size:'200-1000',category:'Startup',status:'nego',nextAction:'Envoyer devis URGENT',nextDate:'2026-03-25',notes:'Commandes régulières.',ca:0,score:9,files:[]}]
const INIT_CONTACTS = [{id:1,cat:'food',name:'Maison Vérot',contact:'—',phone:'01 45 44 01 66',email:'contact@maisonverot.fr',notes:'Livraison lun-ven',vip:false},{id:2,cat:'banque',name:'BNP Paribas Vavin',contact:'Marie Dupont',phone:'01 56 xx xx xx',email:'m.dupont@bnp.fr',notes:'Gestionnaire pro',vip:false}]
const INIT_VAULT = [{id:1,title:'Supabase',url:'https://supabase.com',user:'edward@meshuga.fr',pw:''},{id:2,title:'Vercel',url:'https://vercel.com',user:'edward@meshuga.fr',pw:''}]

const ALL_PROSPECTS = [
  {id:'ev01',cat:'evenementiel',name:'Moon Event',contact:'Direction commerciale',phone:'01 40 00 00 00',email:'contact@moon-event.fr',site:'moon-event.fr',linkedin:'',taille:'10-50',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:0,type:'Catering événements corporate',pitch:'Référence nationale événementiel. +200 events/an.',status:'to_contact',score:10,contacted:false},
  {id:'ev02',cat:'evenementiel',name:'Hopscotch Groupe',contact:'Direction commerciale',phone:'01 58 65 00 72',email:'hopscotch@hopscotch.fr',site:'hopscotch.fr',linkedin:'',taille:'200+',arrondissement:'Paris 11e',valeur_event:5000,valeur_mois:0,type:'Catering congrès',pitch:'Groupe événementiel référence. Congrès nationaux.',status:'to_contact',score:10,contacted:false},
  {id:'ev03',cat:'evenementiel',name:'GL Events Paris',contact:'Direction traiteur',phone:'01 46 08 19 19',email:'paris@gl-events.com',site:'gl-events.com',linkedin:'',taille:'500+',arrondissement:'Paris 15e',valeur_event:8000,valeur_mois:0,type:'Sous-traitance traiteur',pitch:'Géant mondial événementiel. Parcs des expos Paris.',status:'to_contact',score:10,contacted:false},
  {id:'av01',cat:'avocats',name:'Gide Loyrette Nouel',contact:'Office Manager',phone:'01 40 75 60 00',email:'paris@gide.com',site:'gide.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux déjeuner hebdo',pitch:'Top 5 cabinets France. Déjeuners de travail quotidiens.',status:'to_contact',score:10,contacted:false},
  {id:'av02',cat:'avocats',name:'Jones Day Paris',contact:'Facilities',phone:'01 56 59 39 39',email:'paris@jonesday.com',site:'jonesday.com',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:750,type:'Plateaux déjeuner',pitch:'Cabinet US. Culture américaine = sandwichs au bureau.',status:'to_contact',score:9,contacted:false},
  {id:'av03',cat:'avocats',name:'Freshfields Paris',contact:'Facilities Manager',phone:'01 44 56 44 56',email:'paris@freshfields.com',site:'freshfields.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux déjeuner',pitch:'Cabinet magic circle londonien. Déjeuner au bureau très fort.',status:'to_contact',score:10,contacted:false},
  {id:'st01',cat:'startup',name:'Doctolib',contact:'Office Manager',phone:'',email:'office@doctolib.fr',site:'doctolib.fr',linkedin:'',taille:'500+',arrondissement:'Paris 10e',valeur_event:3000,valeur_mois:2000,type:'Plateaux déjeuner hebdo',pitch:'Scale-up emblématique. Culture déjeuner ensemble forte.',status:'to_contact',score:10,contacted:false},
  {id:'st02',cat:'startup',name:'Alan',contact:'Office Manager',phone:'',email:'hello@alan.com',site:'alan.com',linkedin:'',taille:'300+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Licorne santé. Fort focus bien-être employés.',status:'to_contact',score:9,contacted:false},
  {id:'st03',cat:'startup',name:'Payfit',contact:'Workplace Manager',phone:'',email:'contact@payfit.com',site:'payfit.com',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Scale-up RH en forte croissance.',status:'to_contact',score:9,contacted:false},
  {id:'co01',cat:'conseil',name:'McKinsey Paris',contact:'Office Manager',phone:'01 40 69 16 00',email:'paris@mckinsey.com',site:'mckinsey.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Top cabinet conseil mondial. Déjeuners de travail quotidiens.',status:'to_contact',score:10,contacted:false},
  {id:'co02',cat:'conseil',name:'BCG Paris',contact:'Facilities',phone:'01 40 74 45 00',email:'paris@bcg.com',site:'bcg.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Top 3 cabinet conseil.',status:'to_contact',score:10,contacted:false},
  {id:'ht01',cat:'hotel',name:'Hôtel Lutetia',contact:'Directeur F&B',phone:'01 45 44 38 10',email:'lutetia@hotellutetia.com',site:'hotellutetia.com',linkedin:'',taille:'200+',arrondissement:'Paris 6e',valeur_event:3000,valeur_mois:0,type:'Catering events VIP',pitch:'Palace 5 étoiles dans TON arrondissement!',status:'to_contact',score:10,contacted:false},
  {id:'in01',cat:'institution',name:'Mairie Paris 6e',contact:'Protocole',phone:'01 40 46 40 46',email:'mairie06@paris.fr',site:'mairie06.paris.fr',linkedin:'',taille:'100+',arrondissement:'Paris 6e',valeur_event:1000,valeur_mois:300,type:'Catering cérémonies',pitch:'Ta mairie! Cérémonies officielles, vœux.',status:'to_contact',score:10,contacted:false},
  {id:'in02',cat:'institution',name:'Sciences Po Paris',contact:'Direction événements',phone:'01 45 49 50 50',email:'events@sciencespo.fr',site:'sciencespo.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 7e',valeur_event:3000,valeur_mois:0,type:'Catering conférences',pitch:'2 minutes de Meshuga! Conférences permanentes.',status:'to_contact',score:10,contacted:false},
  {id:'tc01',cat:'tech',name:'Google France',contact:'Workplace Manager',phone:'01 42 68 53 00',email:'paris@google.com',site:'google.fr',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Catering + plateaux',pitch:'Culture food américaine très forte.',status:'to_contact',score:9,contacted:false},
  {id:'lx01',cat:'luxe',name:'Yves Saint Laurent',contact:'Events',phone:'01 42 36 22 22',email:'events@ysl.com',site:'ysl.com',linkedin:'',taille:'500+',arrondissement:'Paris 6e',valeur_event:4000,valeur_mois:0,type:'Catering events mode',pitch:'Dans TON arrondissement! Events mode réguliers.',status:'to_contact',score:9,contacted:false},
  {id:'cw01',cat:'coworking',name:'Station F',contact:'Community Manager',phone:'',email:'business@stationf.co',site:'stationf.co',linkedin:'',taille:'1000+',arrondissement:'Paris 13e',valeur_event:2000,valeur_mois:1500,type:'Catering events',pitch:'Plus grand startup campus monde.',status:'to_contact',score:10,contacted:false},
  {id:'bk01',cat:'banque',name:'Rothschild & Co',contact:'Office Manager',phone:'01 40 74 40 74',email:'paris@rothschild.com',site:'rothschild.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Banque prestige. Réunions M&A permanentes.',status:'to_contact',score:10,contacted:false},
]

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
  const [chasseStatus, setChasseStatus2] = useState('all')
  const [chasse, setChasse] = useState(ALL_PROSPECTS.map(function(p) { return Object.assign({}, p) }))
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState('')
  const [emailProspect, setEmailProspect] = useState(null)
  const [zeltyData, setZeltyData] = useState(null)
  const [zeltyLoading, setZeltyLoading] = useState(false)
  const [zeltyPeriod, setZeltyPeriod] = useState('day')

  useEffect(function() {
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

  useEffect(function() {
    if (!profile) return
    setZeltyLoading(true)
    fetch('/api/zelty').then(function(r) { return r.json() }).then(function(d) { setZeltyData(d); setZeltyLoading(false) }).catch(function() { setZeltyLoading(false) })
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
  const senderSig = isEmy ? 'Emy | B2B Manager | emy@meshuga.fr | +33 6 24 67 78 66' : 'Edward | Big Boss | edward@meshuga.fr | +33 6 58 58 58 01'

  function logActivity(type, description, prospectName, emailContent) {
    const entry = {user_role: (profile && profile.role) || 'unknown', user_name: (profile && profile.full_name) || '?', type: type, description: description, prospect_name: prospectName || null, email_content: emailContent || null}
    sb().from('activity_log').insert(entry)
    setActivityLog(function(prev) { return [{id: Date.now(), created_at: new Date().toISOString(), user_role: entry.user_role, user_name: entry.user_name, type: type, description: description, prospect_name: prospectName || null, email_content: emailContent || null}].concat(prev.slice(0, 199)) })
  }

  function contactProspect(id) {
    const p = chasse.filter(function(x) { return x.id === id })[0]
    setChasse(function(prev) { return prev.map(function(x) { return x.id === id ? Object.assign({}, x, {status: 'contacted', contacted: true}) : x }) })
    setContactedToday(function(c) { return c + 1 })
    if (p) {
      setProspects(function(prev) { return prev.concat([{id: Date.now(), name: p.name, email: p.email, phone: p.phone, size: p.taille, category: CATS_MAP[p.cat] ? CATS_MAP[p.cat].label : p.cat, status: 'contacted', nextAction: 'Relancer', nextDate: '', notes: p.pitch, ca: 0, score: p.score, files: []}]) })
      logActivity('prospect_contacte', p.name + ' contacté et ajouté au CRM', p.name, null)
    }
    toast('✓ Prospect contacté!')
  }

  async function generateEmail(p) {
    setEmailProspect(p)
    setGeneratingEmail(true)
    setGeneratedEmail('')
    openModal('email', p)
    const senderName = isEmy ? 'Emy, B2B Manager' : 'Edward, patron'
    const prompt = 'Tu es ' + senderName + ' pour Meshuga Crazy Deli (Paris 6e, 3 rue Vavin). Restaurant new-yorkais premium : pastrami, lobster rolls, sandwichs gastronomiques. Spécialisés dans les plateaux déjeuner B2B et le catering événementiel sur tout Paris.\n\nÉcris un email de prise de contact pour ce prospect :\n- Entreprise : ' + p.name + '\n- Secteur : ' + (CATS_MAP[p.cat] ? CATS_MAP[p.cat].label : p.cat) + '\n- Localisation : ' + p.arrondissement + '\n- Taille : ' + p.taille + ' employés\n- Ce qu\'on peut proposer : ' + p.type + '\n- Angle : ' + p.pitch + '\n\nSois concis (6-8 lignes), personnalisé. Commence par "Objet : " sur la 1ère ligne.\nSignature : ' + senderSig + ' | 3 rue Vavin, Paris 6e'
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{role: 'user', content: prompt}]})})
      const data = await res.json()
      setGeneratedEmail(data.content && data.content[0] ? data.content[0].text : 'Erreur lors de la génération')
    } catch(e) {
      setGeneratedEmail('Erreur de connexion.')
    }
    setGeneratingEmail(false)
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

  var chasseFiltered = chasse.filter(function(p) { return chasseCat === 'all' || p.cat === chasseCat })
  if (chasseSearch) { chasseFiltered = chasseFiltered.filter(function(p) { return p.name.toLowerCase().indexOf(chasseSearch.toLowerCase()) >= 0 || (p.arrondissement && p.arrondissement.toLowerCase().indexOf(chasseSearch.toLowerCase()) >= 0) }) }
  if (chasseStatus !== 'all') { chasseFiltered = chasseFiltered.filter(function(p) { return p.status === chasseStatus }) }
  chasseFiltered = chasseFiltered.slice().sort(function(a, b) {
    if (chasseSort === 'score') return b.score - a.score
    if (chasseSort === 'valeur') return (b.valeur_event + b.valeur_mois*12) - (a.valeur_event + a.valeur_mois*12)
    return a.name.localeCompare(b.name)
  })

  var zeltyCA = zeltyData && zeltyData.stats ? (zeltyData.stats[zeltyPeriod].ca/100).toFixed(2) + ' €' : '--'
  var zeltyTickets = zeltyData && zeltyData.stats ? zeltyData.stats[zeltyPeriod].tickets : '--'
  var zeltyAvg = zeltyData && zeltyData.stats ? (zeltyData.stats[zeltyPeriod].avg/100).toFixed(2) + ' €' : '--'
  var zeltyUpdated = zeltyData && zeltyData.lastUpdated ? 'Mis à jour ' + new Date(zeltyData.lastUpdated).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : 'Données en temps réel'
  var zeltyEvol = zeltyData && zeltyData.evolution && zeltyData.evolution[zeltyPeriod] !== null && zeltyData.evolution[zeltyPeriod] !== undefined ? (zeltyData.evolution[zeltyPeriod] >= 0 ? '+' : '') + zeltyData.evolution[zeltyPeriod] + '%' : '--'
  var zeltyEvolColor = zeltyData && zeltyData.evolution && zeltyData.evolution[zeltyPeriod] !== null && zeltyData.evolution[zeltyPeriod] !== undefined ? (zeltyData.evolution[zeltyPeriod] >= 0 ? '#009D3A' : '#CC0066') : '#888'
  const NAV = [
    {id: 'dash', label: 'Dashboard', icon: '⚡'},
    {id: 'chasse', label: 'Tableau de chasse', icon: '🎯'},
    {id: 'crm', label: 'CRM Prospects', icon: '◎'},
    {id: 'annuaire', label: 'Annuaire', icon: '📒'},
    {id: 'tasks', label: 'Taches', icon: '✓'},
    {id: 'reporting', label: 'Reporting', icon: '📋'},
    {id: 'vault', label: 'Coffre-fort', icon: '🔐'},
    {id: 'gmb', label: 'Google My Biz.', icon: '⭐'},
    {id: 'journal', label: 'Journal Emy', icon: '📓', edwardOnly: true},
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <style>{G}</style>

      {!profile && (
        <div style={{position:'fixed',inset:0,background:'#FFEB5A',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999,flexDirection:'column',gap:16}}>
          <div style={{fontSize:48}}>😬</div>
          <div style={{fontWeight:900,fontSize:14,textTransform:'uppercase',letterSpacing:3}}>Chargement...</div>
        </div>
      )}

      <div className="topbar">
        <button className="hamburger" onClick={function() { setSidebarOpen(!sidebarOpen) }}>☰</button>
        <span style={{fontWeight:900,fontSize:18,textTransform:'uppercase',letterSpacing:2,color:'#FFEB5A'}}>meshuga</span>
        <span className="yt" style={{fontSize:13,color:'#FF82D7'}}>{isEmy ? 'Emy' : 'Edward'}</span>
      </div>

      <div className="shell">
        <div className={sidebarOpen ? 'sidebar-overlay open' : 'sidebar-overlay'} onClick={function() { setSidebarOpen(false) }} />
        <div className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
          <div className="sb-logo">
            <div className="sb-stamp">😬</div>
            <div>
              <div style={{fontWeight:900,fontSize:18,textTransform:'uppercase',letterSpacing:2,lineHeight:1}}>meshuga</div>
              <div className="yt" style={{fontSize:12,opacity:.45}}>B2B Manager</div>
            </div>
          </div>
          <nav className="sb-nav">
            {NAV.filter(function(n) { return !n.edwardOnly || !isEmy }).map(function(n) {
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
              ↩ Déconnexion
            </button>
          </div>
        </div>

        <div className="main">
          <div className="strip" />

          {page === 'dash' && (
            <div>
              <div className="ph">
                <div>
                  <div className="pt">{isEmy ? 'Bonjour Emy 🌸' : 'Bonjour Edward 👋'}</div>
                  <div className="ps">{new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'numeric',month:'long'})}</div>
                </div>
                {isEmy && <button className="btn btn-n btn-sm" onClick={function() { openModal('cr', {}) }}>+ Nouveau CR</button>}
              </div>
              {/* ZELTY WIDGET */}
              <div className="card" style={{padding:0,overflow:'hidden',marginBottom:12,border:'3px solid #191923',boxShadow:'4px 4px 0 #191923'}}>
                <div style={{background:'#FF82D7',padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,borderBottom:'2px solid #191923'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span style={{fontSize:22}}>🟡</span>
                    <div>
                      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,color:'#191923'}}>Zelty — Caisse</div>
                      <div style={{fontSize:10,color:'rgba(25,25,35,.5)',textTransform:'uppercase',letterSpacing:1}}>{zeltyUpdated}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    {['day','week','month','year'].map(function(p) {
                      var labels = {day:'Auj.', week:'Semaine', month:'Mois', year:'Année'}
                      return (
                        <div key={p} onClick={function() { setZeltyPeriod(p) }} style={{padding:'4px 10px',borderRadius:4,border:'2px solid #191923',background:zeltyPeriod===p?'#191923':'transparent',color:zeltyPeriod===p?'#FFEB5A':'#191923',fontSize:10,fontWeight:900,cursor:'pointer',textTransform:'uppercase'}}>
                          {labels[p]}
                        </div>
                      )
                    })}
                    <div onClick={function() { setZeltyLoading(true); fetch('/api/zelty').then(function(r){return r.json()}).then(function(d){setZeltyData(d);setZeltyLoading(false)}).catch(function(){setZeltyLoading(false)}) }} style={{padding:'4px 8px',borderRadius:4,border:'2px solid #191923',background:'#FFEB5A',fontSize:12,cursor:'pointer'}}>↻</div>
                  </div>
                </div>
                {zeltyLoading && <div style={{padding:'20px',textAlign:'center',opacity:.4,fontSize:12,fontWeight:900,textTransform:'uppercase'}}>Chargement...</div>}
                {!zeltyLoading && zeltyData && zeltyData.error && (
                  <div style={{padding:'12px 16px',background:'#FFEB5A',fontSize:11,fontWeight:900}}>
                    {zeltyData.error === 'ZELTY_API_KEY manquante dans les variables Vercel' ? '🔑 Ajoute ZELTY_API_KEY dans Vercel → Settings → Environment Variables' : '⚠️ ' + zeltyData.error}
                  </div>
                )}
                {!zeltyLoading && zeltyData && zeltyData.ok && (
                  <div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',borderBottom:'2px solid #191923'}}>
                      <div style={{padding:'14px 16px',borderRight:'2px solid #191923'}}>
                        <div style={{fontSize:20,marginBottom:4}}>💰</div>
                        <div style={{fontWeight:900,fontSize:22,lineHeight:1}}>{zeltyCA}</div>
                        <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginTop:4}}>CA</div>
                      </div>
                      <div style={{padding:'14px 16px',borderRight:'2px solid #191923'}}>
                        <div style={{fontSize:20,marginBottom:4}}>🧾</div>
                        <div style={{fontWeight:900,fontSize:22,lineHeight:1}}>{zeltyTickets}</div>
                        <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginTop:4}}>Tickets</div>
                      </div>
                      <div style={{padding:'14px 16px',borderRight:'2px solid #191923'}}>
                        <div style={{fontSize:20,marginBottom:4}}>🛒</div>
                        <div style={{fontWeight:900,fontSize:22,lineHeight:1}}>{zeltyAvg}</div>
                        <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginTop:4}}>Panier moyen</div>
                      </div>
                      <div style={{padding:'14px 16px'}}>
                        <div style={{fontSize:20,marginBottom:4}}>📈</div>
                        <div style={{fontWeight:900,fontSize:22,color:zeltyEvolColor,lineHeight:1}}>{zeltyEvol}</div>
                        <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginTop:4}}>vs période préc.</div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr'}}>
                      <div style={{padding:'14px 16px',borderRight:'2px solid #191923'}}>
                        <div style={{fontFamily:"'Yellowtail',cursive",fontSize:15,marginBottom:10}}>🏆 Top produits</div>
                        {zeltyData.topProducts && zeltyData.topProducts.length > 0 ? zeltyData.topProducts.slice(0,6).map(function(p, i) {
                          var maxQty = zeltyData.topProducts[0].qty || 1
                          return (
                            <div key={p.name} style={{marginBottom:8}}>
                              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                                <span style={{fontSize:11,fontWeight:i===0?900:400}}>{i+1}. {p.name}</span>
                                <span style={{fontSize:11,fontWeight:900,background:'#FFEB5A',padding:'1px 6px',borderRadius:3,border:'1px solid #191923'}}>{p.qty}x</span>
                              </div>
                              <div style={{height:4,background:'#EBEBEB',borderRadius:2}}>
                                <div style={{height:'100%',background:i===0?'#FF82D7':'#191923',borderRadius:2,width:Math.round(p.qty/maxQty*100)+'%',opacity:i===0?1:0.5}} />
                              </div>
                            </div>
                          )
                        }) : <div style={{fontSize:11,opacity:.4}}>Aucune donnée</div>}
                      </div>
                      <div style={{padding:'14px 16px'}}>
                        <div style={{fontFamily:"'Yellowtail',cursive",fontSize:15,marginBottom:10}}>⏰ Heures de pointe</div>
                        {zeltyData.peakHours && zeltyData.peakHours.filter(function(h){return h.count>0}).length > 0 ? zeltyData.peakHours.filter(function(h){return h.count>0}).slice(0,8).map(function(h, i) {
                          var maxCount = zeltyData.peakHours.filter(function(x){return x.count>0})[0].count || 1
                          return (
                            <div key={h.hour} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                              <span style={{fontSize:10,opacity:.5,width:32,flexShrink:0}}>{h.hour}h</span>
                              <div style={{flex:1,height:8,background:'#EBEBEB',borderRadius:2}}>
                                <div style={{height:'100%',background:i===0?'#FF82D7':'#191923',borderRadius:2,width:Math.round(h.count/maxCount*100)+'%',opacity:i===0?1:0.4}} />
                              </div>
                              <span style={{fontSize:10,fontWeight:900,width:20,textAlign:'right'}}>{h.count}</span>
                            </div>
                          )
                        }) : <div style={{fontSize:11,opacity:.4}}>Aucun ticket aujourd'hui</div>}
                      </div>
                    </div>
                  </div>
                )}
                {!zeltyLoading && !zeltyData && (
                  <div style={{padding:'16px',fontSize:11,opacity:.6}}>🔑 Ajoute <strong>ZELTY_API_KEY</strong> dans Vercel → Settings → Environment Variables.</div>
                )}
              </div>

              <div className="g4">
                <div className="kc" style={{background:'#FFEB5A'}} onClick={function() { nav('chasse') }}>
                  <div className="kl">A contacter</div>
                  <div className="kv">{chasse.filter(function(p) { return p.status === 'to_contact' }).length}</div>
                  <div className="ki">🎯</div>
                </div>
                <div className="kc" style={{background:'#FF82D7'}} onClick={function() { nav('crm') }}>
                  <div className="kl">Pipeline B2B</div>
                  <div className="kv">{prospects.filter(function(p) { return p.status !== 'won' && p.status !== 'lost' }).length}</div>
                  <div className="ki">◎</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={function() { nav('tasks') }}>
                  <div className="kl">Taches actives</div>
                  <div className="kv">{tasks.filter(function(t) { return t.status !== 'done' }).length}</div>
                  <div className="ki">✓</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={function() { nav('reporting') }}>
                  <div className="kl">CRs soumis</div>
                  <div className="kv">{reports.length}</div>
                  <div className="ki">📋</div>
                </div>
              </div>
              <div className="g2">
                <div className="card">
                  <div className="ct">{isEmy ? 'Mes taches' : 'Taches equipe'}</div>
                  {tasks.filter(function(t) { return t.status !== 'done' }).slice(0,4).map(function(t) {
                    return (
                      <div key={t.id} className="row" style={{gridTemplateColumns:'4px 1fr auto',gap:10}}>
                        <div className="pbar" style={{background:t.priority==='high'?'#FF82D7':'#005FFF'}} />
                        <div><div style={{fontSize:12,fontWeight:900}}>{t.title}</div><div style={{fontSize:10,opacity:.5}}>{t.deadline}</div></div>
                        <span className="badge" style={{color:'#888',borderColor:'#ccc'}}>{TASK_S[t.status]}</span>
                      </div>
                    )
                  })}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={function() { nav('tasks') }}>Voir toutes →</button>
                </div>
                <div className="card">
                  <div className="ct">{isEmy ? 'Mon pipeline' : 'Prospects chauds'}</div>
                  {prospects.filter(function(p) { return p.status !== 'won' && p.status !== 'lost' }).slice(0,4).map(function(p) {
                    return (
                      <div key={p.id} className="row" style={{gridTemplateColumns:'1fr auto',gap:8}}>
                        <div><div style={{fontSize:12,fontWeight:900}}>{p.name}</div><div style={{fontSize:10,opacity:.5}}>{p.nextAction}</div></div>
                        <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                      </div>
                    )
                  })}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={function() { nav('crm') }}>Voir le CRM →</button>
                </div>
              </div>

              {/* PLANNING SEMAINE */}
              <div style={{borderRadius:7,border:'2px solid #191923',boxShadow:'3px 3px 0 #191923',marginBottom:10,overflow:'hidden'}}>
                <div style={{background:'#FF82D7',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',borderBottom:'2px solid #191923',flexWrap:'wrap',gap:8}}>
                  <div className="yt" style={{fontSize:18,color:'#191923'}}>📅 Planning {isEmy ? 'de ma semaine' : "d'Emy"}</div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button className="btn btn-sm" style={{background:'#191923',color:'#FFEB5A',border:'2px solid #191923'}} onClick={function() { setPlanningWeek(function(w) { return w-1 }) }}>←</button>
                    <span style={{fontSize:11,fontWeight:900,minWidth:100,textAlign:'center'}}>{planningWeek===0 ? 'Cette semaine' : planningWeek < 0 ? 'Sem. -'+Math.abs(planningWeek) : 'Sem. +'+planningWeek}</span>
                    <button className="btn btn-sm" style={{background:'#191923',color:'#FFEB5A',border:'2px solid #191923'}} onClick={function() { setPlanningWeek(function(w) { return w+1 }) }}>→</button>
                    {planningWeek !== 0 && <button className="btn btn-y btn-sm" onClick={function() { setPlanningWeek(0) }}>Auj.</button>}
                  </div>
                </div>
                <div style={{padding:'10px 14px',background:'#FFFFFF'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
                    {['Lun','Mar','Mer','Jeu','Ven'].map(function(day, di) {
                      var ws = new Date()
                      var dow = ws.getDay() === 0 ? 6 : ws.getDay()-1
                      ws.setDate(ws.getDate()-dow+(planningWeek*7))
                      var dd = new Date(ws)
                      dd.setDate(ws.getDate()+di)
                      var ds = dd.toISOString().split('T')[0]
                      var isToday = ds === new Date().toISOString().split('T')[0]
                      var isPast = dd < new Date(new Date().toDateString())
                      var isFriday = di === 4
                      var dayTasksEmy = tasks.filter(function(t) { return t.deadline === ds && t.assignee === 'emy' })
                      var dayTasksEdward = tasks.filter(function(t) { return t.deadline === ds && t.assignee === 'edward' })
                      var dayRelances = prospects.filter(function(p) { return p.nextDate === ds && p.status !== 'won' && p.status !== 'lost' })
                      var hasLate = isPast && dayTasksEmy.some(function(t){return t.status!=='done'})
                      var allDone = dayTasksEmy.length > 0 && dayTasksEmy.every(function(t){return t.status==='done'})
                      var borderColor = isToday ? '#005FFF' : hasLate ? '#CC0066' : allDone ? '#009D3A' : '#191923'
                      var bgColor = isToday ? '#E8F0FF' : hasLate ? '#FFE8F0' : allDone ? '#E8F5E9' : '#FAFAFA'
                      return (
                        <div key={day} style={{borderRadius:5,border:'2px solid '+borderColor,background:bgColor,padding:'7px',minHeight:130}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5,paddingBottom:4,borderBottom:'1.5px solid '+borderColor}}>
                            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:13,color:borderColor}}>{day}</div>
                            <div style={{fontSize:9,fontWeight:900,opacity:.5}}>{dd.getDate()}/{dd.getMonth()+1}</div>
                          </div>
                          <div style={{marginBottom:3}}>
                            <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                              <input type="checkbox" checked={isToday ? contactedToday >= 5 : false} readOnly style={{width:11,height:11,accentColor:'#009D3A'}} />
                              <span style={{fontSize:9,color:'#005FFF',fontWeight:900,textDecoration:isToday&&contactedToday>=5?'line-through':'none',opacity:isToday&&contactedToday>=5?.5:1}}>📞 5 prospects</span>
                            </div>
                            {dayRelances.length > 0 && (
                              <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                                <input type="checkbox" readOnly style={{width:11,height:11,accentColor:'#CC0066'}} />
                                <span style={{fontSize:9,color:'#CC0066',fontWeight:900}}>🔄 {dayRelances.length} relance{dayRelances.length>1?'s':''}</span>
                              </div>
                            )}
                            {isFriday && (
                              <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:3}}>
                                <input type="checkbox" checked={reports.length > 0} readOnly style={{width:11,height:11,accentColor:'#009D3A'}} />
                                <span style={{fontSize:9,fontWeight:900,textDecoration:reports.length>0?'line-through':'none',opacity:reports.length>0?.5:1}}>📝 CR hebdo</span>
                              </div>
                            )}
                          </div>
                          {dayTasksEmy.map(function(t) {
                            return (
                              <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:4,marginBottom:4,cursor:'pointer'}} onClick={function() {
                                setTasks(function(prev) { return prev.map(function(x) { return x.id !== t.id ? x : Object.assign({}, x, {status: t.status === 'done' ? 'todo' : 'done'}) }) })
                              }}>
                                <input type="checkbox" checked={t.status === 'done'} readOnly style={{width:11,height:11,marginTop:1,flexShrink:0,accentColor:'#FF82D7'}} />
                                <span style={{fontSize:9,fontWeight:t.priority==='high'?900:400,textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?.4:1,color:t.priority==='high'?'#CC0066':'#191923',lineHeight:1.3}}>{t.title}</span>
                              </div>
                            )
                          })}
                          {dayTasksEdward.length > 0 && (
                            <div style={{borderTop:'1px dashed #DEDEDE',marginTop:4,paddingTop:4}}>
                              {dayTasksEdward.map(function(t) {
                                return (
                                  <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:4,marginBottom:3}}>
                                    <input type="checkbox" checked={t.status === 'done'} readOnly style={{width:11,height:11,marginTop:1,flexShrink:0,accentColor:'#FFEB5A'}} />
                                    <span style={{fontSize:9,textDecoration:t.status==='done'?'line-through':'none',opacity:.6,lineHeight:1.3}}>👑 {t.title}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          {dayTasksEmy.length === 0 && dayTasksEdward.length === 0 && !isFriday && dayRelances.length === 0 && (
                            <div style={{fontSize:9,opacity:.2,textAlign:'center',marginTop:8}}>—</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{display:'flex',gap:12,marginTop:8,fontSize:9,opacity:.4,flexWrap:'wrap'}}>
                    <span>🔵 Aujourd'hui</span><span>🔴 En retard</span><span>🟢 Tout fait</span><span>👑 Tâche Edward</span><span>☑ Cliquer pour cocher</span>
                  </div>
                </div>
              </div>

              {!isEmy && reports.length > 0 && (
                <div className="card">
                  <div className="ct">📋 Dernier CR d'Emy</div>
                  <div style={{fontWeight:900,fontSize:16}}>{reports[0].week}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginTop:8}}>
                    <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{reports[0].prospects}</div><div className="yt" style={{fontSize:11,opacity:.5}}>Prospects</div></div>
                    <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{reports[0].rdv}</div><div className="yt" style={{fontSize:11,opacity:.5}}>RDV</div></div>
                    <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{reports[0].cmds}</div><div className="yt" style={{fontSize:11,opacity:.5}}>Commandes</div></div>
                  </div>
                  <button className="btn btn-y btn-sm" style={{marginTop:8}} onClick={function() { nav('reporting') }}>Voir et repondre →</button>
                </div>
              )}
            </div>
          )}

          {page === 'chasse' && (
            <div>
              <div className="ph">
                <div>
                  <div className="pt">Tableau de Chasse 🎯</div>
                  <div className="ps">{chasse.filter(function(p) { return p.status === 'to_contact' }).length} a contacter · {chasse.length} total</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                  {isEmy && <span style={{fontWeight:900,fontSize:11}}>{contactedToday}/5 auj.</span>}
                </div>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                <input className="inp" style={{flex:1,minWidth:140}} value={chasseSearch} onChange={function(e) { setChasseSearch(e.target.value) }} placeholder="Rechercher..." />
                <select className="inp" style={{width:130}} value={chasseSort} onChange={function(e) { setChasseSort(e.target.value) }}>
                  <option value="score">Score</option>
                  <option value="valeur">Valeur</option>
                  <option value="name">A-Z</option>
                </select>
                <select className="inp" style={{width:130}} value={chasseStatus} onChange={function(e) { setChasseStatus2(e.target.value) }}>
                  <option value="all">Tous statuts</option>
                  <option value="to_contact">A contacter</option>
                  <option value="contacted">Contacte</option>
                  <option value="nego">Nego</option>
                  <option value="won">Gagne</option>
                  <option value="lost">Perdu</option>
                </select>
              </div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:10}}>
                {Object.keys(CATS_MAP).map(function(k) {
                  return (
                    <div key={k} className={chasseCat === k ? 'tag on' : 'tag'} onClick={function() { setChasseChasse(k) }}>
                      {CATS_MAP[k].emoji} {CATS_MAP[k].label}
                    </div>
                  )
                })}
              </div>
              {chasseFiltered.map(function(p) {
                return (
                  <div key={p.id} className="chasse-card">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:10}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
                          <span style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:'#FFEB5A'}}>{CATS_MAP[p.cat] ? CATS_MAP[p.cat].emoji+' '+CATS_MAP[p.cat].label : p.cat}</span>
                          <span style={{fontSize:9,fontWeight:900,background:p.score>=9?'#191923':'#EBEBEB',color:p.score>=9?'#FFEB5A':'#191923',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px'}}>{p.score}/10</span>
                          {p.status !== 'to_contact' && <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>}
                        </div>
                        <div style={{fontWeight:900,fontSize:15}}>{p.name}</div>
                        <div style={{fontSize:11,opacity:.5}}>{p.arrondissement} · {p.taille} emp.</div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        {p.valeur_event > 0 && <div style={{fontWeight:900,fontSize:13}}>~{p.valeur_event.toLocaleString()}€/event</div>}
                        {p.valeur_mois > 0 && <div style={{fontWeight:900,fontSize:13}}>~{p.valeur_mois.toLocaleString()}€/mois</div>}
                      </div>
                    </div>
                    <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:5,padding:'8px 10px',marginBottom:8,fontSize:12}}>
                      💡 {p.pitch}
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap',fontSize:11,marginBottom:8,opacity:.7}}>
                      {p.email && <span>✉️ {p.email}</span>}
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.site && <a href={'https://'+p.site} target="_blank" rel="noopener noreferrer" style={{color:'#005FFF',textDecoration:'none'}}>🌐 {p.site}</a>}
                      {p.linkedin && <a href={p.linkedin.indexOf('http') === 0 ? p.linkedin : 'https://'+p.linkedin} target="_blank" rel="noopener noreferrer" style={{color:'#0077B5',fontWeight:900,textDecoration:'none'}}>🔗 LinkedIn</a>}
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      <button className="btn btn-p btn-sm" onClick={function() { generateEmail(p) }}>✉️ Email IA</button>
                      {p.status === 'to_contact' && <button className="btn btn-g btn-sm" onClick={function() { contactProspect(p.id) }}>✓ Contacte</button>}
                      {p.status === 'contacted' && <button className="btn btn-b btn-sm" onClick={function() { setChasse(function(prev) { return prev.map(function(x) { return x.id===p.id ? Object.assign({},x,{status:'nego'}) : x }) }); toast('Passe en nego') }}>→ Nego</button>}
                      {p.status === 'nego' && <button className="btn btn-g btn-sm" onClick={function() { setChasse(function(prev) { return prev.map(function(x) { return x.id===p.id ? Object.assign({},x,{status:'won'}) : x }) }); toast('🎉 Gagne!') }}>✓ Gagne</button>}
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
                        <div style={{fontSize:11,opacity:.5}}>{p.category} · {p.email}</div>
                      </div>
                      <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                    </div>
                    {p.nextDate && <div style={{fontSize:11,opacity:.6,color:p.nextDate<=today?'#CC0066':'inherit'}}>{p.nextDate<=today?'⚠️ ':''}{p.nextAction}</div>}
                    {p.files && p.files.filter(function(f) { return f && f.trim() }).length > 0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                        {p.files.filter(function(f) { return f && f.trim() }).map(function(f, i) {
                          return <span key={i} style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px',fontSize:9,fontWeight:900}}>📦 {f.slice(0,25)}</span>
                        })}
                      </div>
                    )}
                    <div style={{marginTop:6}}>
                      <button className="btn btn-p btn-sm" onClick={function(e) { e.stopPropagation(); generateEmail(Object.assign({}, p, {cat:'crm',arrondissement:'',taille:p.size,pitch:p.notes||'',type:p.category})) }}>✉️ Email IA</button>
                    </div>
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
                      {c.vip && <span style={{float:'right',fontSize:10}}>⭐ VIP</span>}
                      <div style={{fontWeight:900,fontSize:14}}>{c.name}</div>
                      {c.phone && c.phone !== '—' && <div style={{fontSize:11,marginTop:4}}>📞 {c.phone}</div>}
                      {c.email && <div style={{fontSize:11,marginTop:2}}>✉️ {c.email}</div>}
                      {c.notes && <div style={{fontSize:10,opacity:.4,marginTop:6,textTransform:'uppercase'}}>{c.notes}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {page === 'tasks' && (
            <div>
              <div className="ph">
                <div><div className="pt">Taches</div><div className="ps">{tasks.filter(function(t) { return t.status!=='done' }).length} actives</div></div>
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
                            <div style={{fontSize:10,opacity:.5,marginTop:2}}>{t.deadline} · {t.assignee}</div>
                          </div>
                          <div style={{display:'flex',gap:4}}>
                            <span className="badge" style={{color:t.status==='done'?'#009D3A':'#888',borderColor:t.status==='done'?'#009D3A':'#ccc'}}>{TASK_S[t.status]}</span>
                            <button className="btn btn-y btn-sm" onClick={function() {
                              var o = ['todo','in_progress','done']
                              setTasks(function(prev) { return prev.map(function(x) { return x.id !== t.id ? x : Object.assign({}, x, {status: o[Math.min(o.indexOf(x.status)+1,2)]}) }) })
                            }}>→</button>
                            <button className="btn btn-sm" onClick={function() { openModal('task', Object.assign({}, t)) }}>✏️</button>
                            <button className="btn btn-sm btn-red" onClick={function() { setTasks(function(prev) { return prev.filter(function(x) { return x.id !== t.id }) }) }}>✕</button>
                          </div>
                        </div>
                        {t.checklist && t.checklist.filter(function(c) { return c }).length > 0 && (
                          <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid #EBEBEB'}}>
                            {t.checklist.filter(function(c) { return c }).map(function(item, ci) {
                              return (
                                <div key={ci} style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                                  <input type="checkbox" checked={item.indexOf('✓ ') === 0} style={{width:13,height:13,cursor:'pointer'}}
                                    onChange={function(e) {
                                      var nl = t.checklist.slice()
                                      nl[ci] = e.target.checked ? '✓ '+item.replace('✓ ','') : item.replace('✓ ','')
                                      setTasks(function(prev) { return prev.map(function(x) { return x.id===t.id ? Object.assign({},x,{checklist:nl}) : x }) })
                                    }} />
                                  <span style={{fontSize:11,textDecoration:item.indexOf('✓ ')===0?'line-through':'none',opacity:item.indexOf('✓ ')===0?.4:1}}>{item.replace('✓ ','')}</span>
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

          {page === 'reporting' && (
            <div>
              <div className="ph">
                <div><div className="pt">Reporting</div><div className="ps">Compte-rendus hebdo</div></div>
                {isEmy && <button className="btn btn-n btn-sm" onClick={function() { openModal('cr', {}) }}>+ Nouveau CR</button>}
              </div>
              {!isEmy && (
                <div className="card-y" style={{marginBottom:12}}>
                  <div className="ct">📝 Formulaire CR Emy</div>
                  <div style={{fontSize:12,opacity:.7,marginBottom:8}}>Ce qu'Emy remplit chaque semaine :</div>
                  <div style={{fontSize:11,opacity:.6,lineHeight:1.8}}>Semaine du · Prospects contactés · RDV effectués · Commandes · Victoires · Challenges · Priorités S+1 · Note pour Edward</div>
                </div>
              )}
              {reports.length === 0 && (
                <div className="card" style={{textAlign:'center',padding:40}}>
                  <div style={{fontSize:40,marginBottom:10}}>📋</div>
                  <div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun CR pour l'instant</div>
                  {isEmy && <button className="btn btn-y" style={{marginTop:14}} onClick={function() { openModal('cr', {}) }}>Creer le premier CR</button>}
                </div>
              )}
              {reports.map(function(r, i) {
                return (
                  <div key={r.id} className="card-y" style={{border:'2px solid #191923',borderRadius:7,boxShadow:'3px 3px 0 #191923',marginBottom:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                      <div style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{r.week}</div>
                      <span style={{fontSize:10,opacity:.5}}>{r.date}</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                      <div style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{r.prospects}</div><div className="yt" style={{fontSize:11,opacity:.5}}>Prospects</div></div>
                      <div style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{r.rdv}</div><div className="yt" style={{fontSize:11,opacity:.5}}>RDV</div></div>
                      <div style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{r.cmds}</div><div className="yt" style={{fontSize:11,opacity:.5}}>Commandes</div></div>
                    </div>
                    {r.wins && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>✅ Victoires</div><div style={{fontSize:12}}>{r.wins}</div></div>}
                    {r.challenges && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>⚡ Challenges</div><div style={{fontSize:12}}>{r.challenges}</div></div>}
                    {r.next && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>🎯 Priorites S+1</div><div style={{fontSize:12}}>{r.next}</div></div>}
                    {r.notes && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>💬 Note d'Emy</div><div style={{fontSize:12}}>{r.notes}</div></div>}
                    {r.feedback && <div style={{background:'#FF82D7',border:'2px solid #191923',borderRadius:5,padding:10}}><div className="yt" style={{fontSize:14,marginBottom:4}}>Retour d'Edward</div><div style={{fontSize:12}}>{r.feedback}</div></div>}
                    {!isEmy && !r.feedback && (
                      <div style={{marginTop:10}}>
                        <div className="lbl">Ton retour a Emy</div>
                        <textarea className="inp" placeholder="Bravo, recadrages..." id={'fb-'+r.id} style={{minHeight:60}} />
                        <button className="btn btn-y btn-sm" style={{marginTop:6}} onClick={function() {
                          var el = document.getElementById('fb-'+r.id)
                          var v = el ? el.value : ''
                          if (v) { setReports(function(prev) { return prev.map(function(x, j) { return j===i ? Object.assign({},x,{feedback:v,status:'read'}) : x }) }); toast('Retour envoye ✓') }
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
                <div><div className="pt">Coffre-fort 🔐</div><div className="ps">Acces securises</div></div>
                <button className="btn btn-y btn-sm" onClick={function() { openModal('vault', {}) }}>+ Ajouter</button>
              </div>
              {vault.map(function(v, i) {
                return (
                  <div key={v.id} className="card" style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                      <div style={{fontWeight:900,fontSize:13}}>{v.title}</div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#005FFF',textDecoration:'none'}} onClick={function(e) { e.stopPropagation() }}>{v.url}</a>
                      <div style={{fontSize:11}}>{v.user}</div>
                      <div style={{fontFamily:'monospace',fontSize:11,cursor:'pointer'}} onClick={function() { setPwVisible(function(prev) { var n = Object.assign({}, prev); n[i] = !n[i]; return n }) }}>{pwVisible[i] ? (v.pw || '(vide)') : '••••••••'}</div>
                      <div style={{display:'flex',gap:4}}>
                        <button className="btn btn-sm" onClick={function() { openModal('vault', Object.assign({}, v)) }}>✏️</button>
                        <button className="btn btn-sm btn-red" onClick={function() { setVault(function(prev) { return prev.filter(function(x) { return x.id !== v.id }) }); toast('Supprime') }}>✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {page === 'gmb' && (
            <div>
              <div className="ph"><div><div className="pt">Google My Business</div><div className="ps">Avis · Visibilite</div></div></div>
              <div className="card-y">
                <div className="ct">🔗 Connexion requise</div>
                <p style={{fontSize:13,marginBottom:14}}>Configure Google My Business pour voir tes avis.</p>
                <button className="btn btn-n" onClick={function() { window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?client_id='+process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID+'&redirect_uri='+window.location.origin+'/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent' }}>Se connecter avec Google →</button>
              </div>
            </div>
          )}

          {page === 'journal' && !isEmy && (
            <div>
              <div className="ph"><div><div className="pt">Journal d'Emy 📓</div><div className="ps">Sessions · Contacts · Emails</div></div></div>
              <div className="card" style={{marginBottom:12,padding:'12px 14px',background:'#191923',borderRadius:7}}>
                <div className="yt" style={{fontSize:13,marginBottom:8,color:'#FF82D7'}}>🕐 Sessions de connexion</div>
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
                <div className={journalFilter==='all'?'tag on':'tag'} onClick={function() { setJournalFilter('all') }}>Tout</div>
                <div className={journalFilter==='email_copie'?'tag on':'tag'} onClick={function() { setJournalFilter('email_copie') }}>✉️ Emails</div>
                <div className={journalFilter==='prospect_contacte'?'tag on':'tag'} onClick={function() { setJournalFilter('prospect_contacte') }}>📞 Contacts</div>
              </div>
              {activityLog.filter(function(a) { return a.type !== 'session_start' && (journalFilter === 'all' || a.type === journalFilter) }).length === 0 ? (
                <div className="card" style={{textAlign:'center',padding:40,opacity:.4}}>
                  <div style={{fontSize:32,marginBottom:8}}>📓</div>
                  <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase'}}>Aucune activite</div>
                </div>
              ) : activityLog.filter(function(a) { return a.type !== 'session_start' && (journalFilter === 'all' || a.type === journalFilter) }).map(function(a) {
                return (
                  <div key={a.id || a.created_at} className="card" style={{padding:'12px 14px',marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                      <div>
                        <div style={{fontWeight:900,fontSize:13,marginBottom:4}}>{a.description}</div>
                        <span style={{fontSize:9,fontWeight:900,padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:a.user_role==='emy'?'#FF82D7':'#FFEB5A'}}>{a.user_name}</span>
                        {a.prospect_name && <div style={{fontSize:11,opacity:.5,marginTop:4}}>🎯 {a.prospect_name}</div>}
                        {a.email_content && (
                          <details style={{marginTop:6}}>
                            <summary style={{cursor:'pointer',fontSize:11,fontWeight:900,opacity:.6}}>Voir l'email</summary>
                            <div style={{background:'#F8F8F8',border:'1.5px solid #DEDEDE',borderRadius:5,padding:10,marginTop:6,fontSize:12,whiteSpace:'pre-wrap'}}>{a.email_content}</div>
                          </details>
                        )}
                      </div>
                      <div style={{fontSize:10,opacity:.4,flexShrink:0}}>{new Date(a.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </div>
      </div>

      {modal === 'email' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={function(e) { e.stopPropagation() }}>
            <div className="mh"><div className="mt">✉️ Email IA — {form.name}</div></div>
            <div className="mb">
              {generatingEmail && (
                <div style={{textAlign:'center',padding:30}}>
                  <div style={{fontSize:32,marginBottom:10}}>✨</div>
                  <div style={{fontWeight:900,fontSize:13,textTransform:'uppercase'}}>Generation en cours...</div>
                </div>
              )}
              {!generatingEmail && generatedEmail && (
                <div>
                  <div className="lbl" style={{marginBottom:6}}>Email genere - modifie avant d'envoyer</div>
                  <textarea className="inp" style={{minHeight:280,fontFamily:'Arial,sans-serif',fontSize:13,lineHeight:1.6}} value={generatedEmail} onChange={function(e) { setGeneratedEmail(e.target.value) }} />
                  <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:10,fontSize:12,marginTop:8}}>
                    Copie et envoie depuis <strong>{isEmy ? 'emy@meshuga.fr' : 'edward@meshuga.fr'}</strong>
                  </div>
                </div>
              )}
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Fermer</button>
              {generatedEmail && (
                <button className="btn btn-y" onClick={function() {
                  navigator.clipboard.writeText(generatedEmail)
                  toast('Email copie ! 📋')
                  logActivity('email_copie', 'Email copie pour ' + form.name, form.name, generatedEmail)
                }}>📋 Copier</button>
              )}
              {generatedEmail && <button className="btn btn-p" onClick={function() { if (emailProspect) generateEmail(emailProspect) }}>🔄 Regenerer</button>}
            </div>
          </div>
        </div>
      )}

      {modal === 'task' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={function(e) { e.stopPropagation() }}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouvelle tache'}</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={function(e) { setForm(Object.assign({},form,{title:e.target.value})) }} /></div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Assignee a</label><select className="inp" value={form.assignee||'emy'} onChange={function(e) { setForm(Object.assign({},form,{assignee:e.target.value})) }}><option value="emy">Emy</option><option value="edward">Edward</option></select></div>
                <div className="fg"><label className="lbl">Deadline</label><input type="date" className="inp" value={form.deadline||''} onChange={function(e) { setForm(Object.assign({},form,{deadline:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Priorite</label><select className="inp" value={form.priority||'medium'} onChange={function(e) { setForm(Object.assign({},form,{priority:e.target.value})) }}><option value="high">🔴 Haute</option><option value="medium">🟡 Moyenne</option><option value="low">🟢 Basse</option></select></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp" value={form.status||'todo'} onChange={function(e) { setForm(Object.assign({},form,{status:e.target.value})) }}><option value="todo">A faire</option><option value="in_progress">En cours</option><option value="done">Termine</option></select></div>
              </div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div className="lbl" style={{margin:0}}>Sous-taches</div>
                  <button className="btn btn-y btn-sm" onClick={function() { setForm(Object.assign({},form,{checklist:(form.checklist||[]).concat([''])})) }}>+ Ajouter</button>
                </div>
                {(form.checklist||[]).map(function(item, i) {
                  return (
                    <div key={i} style={{display:'flex',gap:6,marginBottom:5}}>
                      <input className="inp" value={item} onChange={function(e) { var c = (form.checklist||[]).slice(); c[i] = e.target.value; setForm(Object.assign({},form,{checklist:c})) }} placeholder={'Sous-tache '+(i+1)} style={{fontSize:12,padding:'5px 8px'}} />
                      <button className="btn btn-sm btn-red" onClick={function() { setForm(Object.assign({},form,{checklist:(form.checklist||[]).filter(function(_,j) { return j!==i })})) }}>✕</button>
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
                <div className="fg"><label className="lbl">Telephone</label><input className="inp" value={form.phone||''} onChange={function(e) { setForm(Object.assign({},form,{phone:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Categorie</label><select className="inp" value={form.category||''} onChange={function(e) { setForm(Object.assign({},form,{category:e.target.value})) }}><option value="">-</option><option>Evenementiel</option><option>Corporate</option><option>Startup</option><option>Avocats</option><option>Conseil</option><option>Hotellerie</option><option>Tech</option><option>Institution</option><option>Autre</option></select></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp" value={form.status||'to_contact'} onChange={function(e) { setForm(Object.assign({},form,{status:e.target.value})) }}><option value="to_contact">A contacter</option><option value="contacted">Contacte</option><option value="nego">Nego</option><option value="won">Gagne</option><option value="lost">Perdu</option></select></div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label className="lbl">Prochaine relance</label>
                  <div style={{display:'flex',gap:6}}>
                    <input type="date" className="inp" style={{flex:1}} value={form.nextDate||''} onChange={function(e) { setForm(Object.assign({},form,{nextDate:e.target.value})) }} />
                    <button className="btn btn-sm" onClick={function() { var d=new Date();d.setDate(d.getDate()+7);setForm(Object.assign({},form,{nextDate:d.toISOString().split('T')[0]})) }}>+7j</button>
                    <button className="btn btn-sm" onClick={function() { var d=new Date();d.setDate(d.getDate()+14);setForm(Object.assign({},form,{nextDate:d.toISOString().split('T')[0]})) }}>+14j</button>
                  </div>
                  <input className="inp" style={{marginTop:6}} value={form.nextAction||''} onChange={function(e) { setForm(Object.assign({},form,{nextAction:e.target.value})) }} placeholder="Action prevue..." />
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
                <div className="fg"><label className="lbl">Categorie</label><select className="inp" value={form.cat||'food'} onChange={function(e) { setForm(Object.assign({},form,{cat:e.target.value})) }}><option value="food">Fournisseur food</option><option value="banque">Banque</option><option value="presse">Presse</option><option value="prestataire">Prestataire</option><option value="partenaire">Partenaire</option><option value="livraison">Livraison</option><option value="fournisseur">Fournisseur</option><option value="it">IT</option><option value="juridique">Juridique</option></select></div>
                <div className="fg" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" checked={!!form.vip} onChange={function(e) { setForm(Object.assign({},form,{vip:e.target.checked})) }} style={{width:16,height:16}} /><span style={{fontSize:12}}>VIP ⭐</span></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Nom *</label><input className="inp" value={form.name||''} onChange={function(e) { setForm(Object.assign({},form,{name:e.target.value})) }} /></div>
                <div className="fg"><label className="lbl">Telephone</label><input className="inp" value={form.phone||''} onChange={function(e) { setForm(Object.assign({},form,{phone:e.target.value})) }} /></div>
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
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouvel acces'} 🔐</div></div>
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
              <div className="fg"><label className="lbl">✅ Victoires</label><textarea className="inp" value={form.wins||''} onChange={function(e) { setForm(Object.assign({},form,{wins:e.target.value})) }} /></div>
              <div className="fg"><label className="lbl">⚡ Challenges</label><textarea className="inp" value={form.challenges||''} onChange={function(e) { setForm(Object.assign({},form,{challenges:e.target.value})) }} /></div>
              <div className="fg"><label className="lbl">🎯 Priorites S+1</label><textarea className="inp" value={form.next||''} onChange={function(e) { setForm(Object.assign({},form,{next:e.target.value})) }} /></div>
              <div className="fg"><label className="lbl">💬 Note pour Edward</label><textarea className="inp" value={form.notes||''} onChange={function(e) { setForm(Object.assign({},form,{notes:e.target.value})) }} /></div>
            </div>
            <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={submitCR}>Soumettre a Edward</button></div>
          </div>
        </div>
      )}

      <div className={toastMsg ? 'toast show' : 'toast'}>{toastMsg}</div>
    </div>
  )
}
