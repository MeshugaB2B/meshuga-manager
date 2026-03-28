'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const sb = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const G = `
@import url('https://fonts.googleapis.com/css2?family=Yellowtail&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--y:#FFEB5A;--p:#FF82D7;--b:#005FFF;--g:#009D3A;--n:#191923;--w:#FFFFFF;--gr:#EBEBEB;--or:#FF6B2B}
body{font-family:'Arial Narrow',Arial,sans-serif;background:var(--y);color:var(--n);height:100vh;overflow:hidden}
.yt{font-family:'Yellowtail',cursive}
.shell{display:flex;height:100vh;overflow:hidden}
.topbar{display:none;background:var(--n);padding:10px 16px;align-items:center;justify-content:space-between;border-bottom:3px solid var(--y);flex-shrink:0}
.topbar-logo{font-weight:900;font-size:18px;text-transform:uppercase;letter-spacing:2px;color:var(--y)}
.hamburger{background:none;border:2px solid rgba(255,255,255,.3);border-radius:4px;padding:4px 8px;cursor:pointer;color:var(--y);font-size:16px}
.sidebar{width:210px;background:var(--w);border-right:4px solid var(--n);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;transition:transform .2s}
.sb-logo{padding:14px;border-bottom:3px solid var(--n);display:flex;align-items:center;gap:10px}
.sb-stamp{width:42px;height:42px;border-radius:50%;border:2px solid var(--n);background:var(--y);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.sb-nav{padding:8px;flex:1}
.sb-sec{font-family:'Yellowtail',cursive;font-size:12px;opacity:.4;padding:6px 10px 3px;margin-top:4px}
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:rgba(25,25,35,.35);border:2px solid transparent;transition:all .1s;margin-bottom:1px}
.ni:hover{background:var(--y);color:var(--n);border-color:var(--n)}
.ni.active{background:var(--p);color:var(--n);border-color:var(--n)}
.nb{background:var(--n);color:var(--y);font-size:9px;padding:1px 5px;border-radius:2px;margin-left:auto}
.main{flex:1;overflow-y:auto;padding:16px 20px;background:var(--y)}
.strip{height:4px;background:var(--n);border-radius:2px;margin-bottom:14px}
.pt{font-weight:900;font-size:clamp(22px,3.5vw,34px);text-transform:uppercase;letter-spacing:-1px;line-height:1}
.ps{font-family:'Yellowtail',cursive;font-size:14px;opacity:.5;margin-top:2px;margin-bottom:12px}
.ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:10px;flex-wrap:wrap}
.card{background:var(--w);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.card-y{background:var(--y);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.card-p{background:var(--p);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.ct{font-family:'Yellowtail',cursive;font-size:16px;margin-bottom:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}
.kc{border-radius:7px;border:2px solid var(--n);padding:12px;position:relative;overflow:hidden;box-shadow:3px 3px 0 var(--n);cursor:pointer}
.kl{font-family:'Yellowtail',cursive;font-size:12px}
.kv{font-weight:900;font-size:28px;line-height:1.1}
.ki{position:absolute;right:8px;top:8px;font-size:18px;opacity:.15}
.row{display:grid;align-items:center;padding:8px 0;border-bottom:2px solid var(--gr)}
.row:last-child{border-bottom:none}
.badge{display:inline-flex;align-items:center;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:1.5px solid currentColor;white-space:nowrap}
.btn{padding:7px 12px;border-radius:4px;border:2px solid var(--n);cursor:pointer;font-family:'Arial Narrow',Arial;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-flex;align-items:center;gap:5px;box-shadow:2px 2px 0 var(--n);background:var(--w);color:var(--n);transition:all .1s;white-space:nowrap}
.btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 var(--n)}
.btn-y{background:var(--y)}.btn-p{background:var(--p)}.btn-n{background:var(--n);color:var(--y)}.btn-g{background:var(--g);color:var(--w)}.btn-b{background:var(--b);color:var(--w)}.btn-or{background:var(--or);color:var(--w)}
.btn-sm{padding:4px 8px;font-size:9px;box-shadow:1px 1px 0 var(--n)}.btn-red{background:#CC0066;color:var(--w)}
.inp{width:100%;padding:7px 10px;border-radius:4px;border:2px solid var(--n);font-family:'Arial Narrow',Arial;font-size:12px;background:var(--w);color:var(--n);outline:none;box-shadow:2px 2px 0 var(--n)}
.inp:focus{border-color:var(--p);box-shadow:2px 2px 0 var(--p)}
.sel{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23191923' d='M5 7L0 2h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:22px}
textarea.inp{min-height:70px;resize:vertical}
.lbl{font-family:'Yellowtail',cursive;font-size:13px;display:block;margin-bottom:4px;color:var(--n)}
.fg{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.overlay{position:fixed;inset:0;background:rgba(25,25,35,.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:12px}
.modal{background:var(--w);border-radius:8px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border:3px solid var(--n);box-shadow:8px 8px 0 var(--n)}
.modal-lg{max-width:700px}.modal-xl{max-width:860px}
.mh{padding:14px 18px;border-bottom:2px solid var(--n);background:var(--p);position:sticky;top:0;z-index:1}
.mt{font-weight:900;font-size:17px;text-transform:uppercase}
.mb{padding:14px 18px}
.mf{padding:10px 18px;border-top:2px solid var(--gr);display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;position:sticky;bottom:0;background:var(--w)}
.pbar{width:4px;border-radius:2px;min-height:30px;flex-shrink:0}
.prog-wrap{height:10px;background:var(--gr);border-radius:3px;border:1.5px solid var(--n);overflow:hidden;margin-top:4px}
.prog-fill{height:100%;background:var(--n);border-radius:2px;transition:width .4s}
.al{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:5px;border:2px solid var(--n);background:var(--w);margin-bottom:7px;box-shadow:2px 2px 0 var(--n)}
.tag{font-size:9px;font-weight:900;padding:3px 8px;border:1.5px solid var(--n);border-radius:3px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;background:var(--w);display:inline-block;margin:2px;white-space:nowrap}
.tag.on{background:var(--n);color:var(--y)}
.toast{position:fixed;bottom:20px;right:20px;background:var(--n);color:var(--y);padding:10px 18px;border-radius:6px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:2px solid var(--y);box-shadow:4px 4px 0 var(--y);z-index:999;opacity:0;transition:opacity .3s;pointer-events:none;max-width:320px}
.toast.show{opacity:1}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:49}
.chasse-card{background:var(--w);border:2px solid var(--n);border-radius:7px;padding:12px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.search-bar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.contact-item{background:#F5F5F5;border:1.5px solid #DEDEDE;border-radius:5px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:8px}
@media(max-width:768px){
  .shell{flex-direction:column}
  .topbar{display:flex}
  .sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(-100%);width:240px}
  .sidebar.open{transform:translateX(0)}
  .sidebar-overlay.open{display:block}
  .main{padding:12px 14px}
  .g2,.g3,.g4{grid-template-columns:1fr 1fr}
  .modal{max-width:100%;margin:0}
  .fg2{grid-template-columns:1fr}
  .ph{flex-direction:column;gap:8px}
}
`

const CATS_MAP: any = {
  all:{label:'Tous',emoji:'☰'},
  evenementiel:{label:'Événementiel',emoji:'🎉'},
  avocats:{label:'Avocats',emoji:'⚖️'},
  startup:{label:'Startups',emoji:'🚀'},
  agence_pub:{label:'Agences créa',emoji:'🎨'},
  hotel:{label:'Hôtels',emoji:'🏨'},
  immo:{label:'Immobilier',emoji:'🏢'},
  medical:{label:'Médical',emoji:'🏥'},
  production:{label:'Tournages',emoji:'🎬'},
  ecole:{label:'Écoles',emoji:'🎓'},
  institution:{label:'Institutions',emoji:'🏛️'},
  luxe:{label:'Luxe & Mode',emoji:'👜'},
  tech:{label:'Tech',emoji:'💻'},
  conseil:{label:'Conseil',emoji:'📊'},
  medias:{label:'Médias',emoji:'📰'},
  coworking:{label:'Coworking',emoji:'🏗️'},
  banque:{label:'Banques',emoji:'🏦'},
}

const STATUS_P: any = {to_contact:'À contacter',contacted:'Contacté',nego:'Négo',won:'Gagné ✓',lost:'Perdu'}
const STATUS_PC: any = {to_contact:'#888',contacted:'#B8920A',nego:'#005FFF',won:'#009D3A',lost:'#CC0066'}
const TASK_S: any = {todo:'À faire',in_progress:'En cours',done:'Terminé ✓'}
const CAT_ANN: any = {food:'🥩 Fournisseur food',banque:'🏦 Banque',presse:'📰 Presse',prestataire:'🔧 Prestataire',partenaire:'🤝 Partenaire',livraison:'🚲 Livraison',fournisseur:'📦 Fournisseur',it:'💻 IT',juridique:'⚖️ Juridique'}

const INIT_TASKS = [
  {id:1,title:'Créer le kit B2B (menu plateaux, tarifs)',assignee:'emy',deadline:'2026-03-28',status:'in_progress',priority:'high',checklist:['Sélectionner les 5 meilleurs sandwichs','Faire les photos','Rédiger les tarifs'],files:[]},
  {id:2,title:'RDV Wagram Events — préparer la présentation',assignee:'emy',deadline:'2026-03-28',status:'todo',priority:'high',checklist:['Réviser le pitch Meshuga','Préparer les échantillons'],files:[]},
  {id:3,title:'Valider le menu B2B avec la cuisine',assignee:'edward',deadline:'2026-03-30',status:'todo',priority:'high',checklist:[],files:[]},
  {id:4,title:'Appeler 5 prospects cette semaine',assignee:'emy',deadline:'2026-03-31',status:'todo',priority:'medium',checklist:[],files:[]},
]
const INIT_PROSPECTS = [
  {id:1,name:'Agence Wagram Events',email:'contact@wagram.fr',phone:'01 40 xx xx xx',size:'10-50',category:'Événementiel',status:'contacted',nextAction:'Envoyer devis',nextDate:'2026-03-25',notes:'Intéressée plateaux. Budget ~800-1200€/event.',ca:0,score:8,files:[]},
  {id:2,name:'Station F',email:'office@stationf.co',phone:'06 98 76 54 32',size:'200-1000',category:'Startup',status:'nego',nextAction:'Envoyer devis URGENT',nextDate:'2026-03-25',notes:'Commandes régulières équipes. URGENT.',ca:0,score:9,files:[]},
]
const INIT_CONTACTS = [
  {id:1,cat:'food',name:'Maison Vérot',contact:'—',phone:'01 45 44 01 66',email:'contact@maisonverot.fr',notes:'Livraison lun-ven',vip:false},
  {id:2,cat:'banque',name:'BNP Paribas Vavin',contact:'Marie Dupont',phone:'01 56 xx xx xx',email:'m.dupont@bnp.fr',notes:'Gestionnaire pro',vip:false},
  {id:3,cat:'presse',name:'Le Fooding',contact:'—',phone:'—',email:'press@lefooding.com',notes:'',vip:true},
]
const INIT_VAULT = [
  {id:1,title:'Supabase',url:'https://supabase.com',user:'edward@meshuga.fr',pw:''},
  {id:2,title:'Vercel',url:'https://vercel.com',user:'edward@meshuga.fr',pw:''},
  {id:3,title:'Zelty',url:'https://app.zelty.fr',user:'edward@meshuga.fr',pw:''},
]

// Prospects data - simplified for compilation
const ALL_PROSPECTS = [
  {id:'ev01',cat:'evenementiel',name:'Moon Event',contact:'Direction commerciale',phone:'01 40 00 00 00',email:'contact@moon-event.fr',site:'moon-event.fr',linkedin:'',taille:'10-50',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:0,type:'Catering grands événements',pitch:'Référence nationale événementiel corporate. Organise +200 events/an. Entrer comme prestataire traiteur parisien premium.',status:'to_contact',score:10,contacted:false},
  {id:'ev02',cat:'evenementiel',name:'Hopscotch Groupe',contact:'Direction commerciale',phone:'01 58 65 00 72',email:'hopscotch@hopscotch.fr',site:'hopscotch.fr',linkedin:'',taille:'200+',arrondissement:'Paris 11e',valeur_event:5000,valeur_mois:0,type:'Catering congrès',pitch:'Groupe événementiel référence. Congrès nationaux et internationaux.',status:'to_contact',score:10,contacted:false},
  {id:'ev03',cat:'evenementiel',name:'GL Events Paris',contact:'Direction traiteur',phone:'01 46 08 19 19',email:'paris@gl-events.com',site:'gl-events.com',linkedin:'',taille:'500+',arrondissement:'Paris 15e',valeur_event:8000,valeur_mois:0,type:'Sous-traitance traiteur',pitch:'Géant mondial événementiel. Parcs des expositions Paris.',status:'to_contact',score:10,contacted:false},
  {id:'ev04',cat:'evenementiel',name:'Wato Wato',contact:'Production Manager',phone:'01 40 36 10 20',email:'bonjour@wato.fr',site:'wato.fr',linkedin:'',taille:'50-100',arrondissement:'Paris 11e',valeur_event:3000,valeur_mois:0,type:'Catering events créatifs',pitch:'Agence events créative premium pour Apple, Nike.',status:'to_contact',score:9,contacted:false},
  {id:'ev05',cat:'evenementiel',name:'Publicis Events',contact:'Direction production',phone:'01 44 43 70 00',email:'events@publicisgroupe.com',site:'publicisevents.fr',linkedin:'',taille:'100+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering events Publicis',pitch:'Branche events de Publicis. Lancements campagnes, soirées clients. Budget très élevé.',status:'to_contact',score:9,contacted:false},
  {id:'av01',cat:'avocats',name:'Gide Loyrette Nouel',contact:'Office Manager',phone:'01 40 75 60 00',email:'paris@gide.com',site:'gide.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux déjeuner hebdo',pitch:'Top 5 cabinets France. Déjeuners de travail quotidiens.',status:'to_contact',score:10,contacted:false},
  {id:'av02',cat:'avocats',name:'Jones Day Paris',contact:'Facilities',phone:'01 56 59 39 39',email:'paris@jonesday.com',site:'jonesday.com',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:750,type:'Plateaux déjeuner',pitch:'Cabinet US top tier. Culture américaine = sandwichs au bureau = Meshuga PARFAIT.',status:'to_contact',score:9,contacted:false},
  {id:'av03',cat:'avocats',name:'Freshfields Paris',contact:'Facilities Manager',phone:'01 44 56 44 56',email:'paris@freshfields.com',site:'freshfields.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux déjeuner',pitch:'Cabinet magic circle londonien. Culture du déjeuner au bureau très forte.',status:'to_contact',score:10,contacted:false},
  {id:'st01',cat:'startup',name:'Doctolib',contact:'Office Manager',phone:'—',email:'office@doctolib.fr',site:'doctolib.fr',linkedin:'',taille:'500+',arrondissement:'Paris 10e',valeur_event:3000,valeur_mois:2000,type:'Plateaux déjeuner hebdo',pitch:'Scale-up emblématique. Centaines d\'employés Paris. Culture déjeuner ensemble forte.',status:'to_contact',score:10,contacted:false},
  {id:'st02',cat:'startup',name:'Alan',contact:'Office Manager',phone:'—',email:'hello@alan.com',site:'alan.com',linkedin:'',taille:'300+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Licorne santé. Fort focus bien-être employés. Meshuga = qualité, frais, sain.',status:'to_contact',score:9,contacted:false},
  {id:'st03',cat:'startup',name:'Payfit',contact:'Workplace Manager',phone:'—',email:'contact@payfit.com',site:'payfit.com',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Scale-up RH en forte croissance. Bureau moderne.',status:'to_contact',score:9,contacted:false},
  {id:'st04',cat:'startup',name:'Pennylane',contact:'Office Manager',phone:'—',email:'hello@pennylane.com',site:'pennylane.com',linkedin:'',taille:'200+',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:900,type:'Plateaux déjeuner',pitch:'Startup compta SaaS. Tu les connais déjà ! Proposer les plateaux.',status:'to_contact',score:9,contacted:false},
  {id:'co01',cat:'conseil',name:'McKinsey Paris',contact:'Office Manager',phone:'01 40 69 16 00',email:'paris@mckinsey.com',site:'mckinsey.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Top cabinet conseil mondial. Déjeuners de travail quotidiens.',status:'to_contact',score:10,contacted:false},
  {id:'co02',cat:'conseil',name:'BCG Paris',contact:'Facilities',phone:'01 40 74 45 00',email:'paris@bcg.com',site:'bcg.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Top 3 cabinet conseil.',status:'to_contact',score:10,contacted:false},
  {id:'ht01',cat:'hotel',name:'Hôtel Lutetia',contact:'Directeur F&B',phone:'01 45 44 38 10',email:'lutetia@hotellutetia.com',site:'hotellutetia.com',linkedin:'',taille:'200+',arrondissement:'Paris 6e',valeur_event:3000,valeur_mois:0,type:'Catering events VIP',pitch:'Palace 5 étoiles dans TON arrondissement !',status:'to_contact',score:10,contacted:false},
  {id:'ht02',cat:'hotel',name:'Hôtel Bel Ami',contact:'Concierge chef',phone:'01 42 61 53 53',email:'reservation@hotel-bel-ami.com',site:'hotel-bel-ami.com',linkedin:'',taille:'50-100',arrondissement:'Paris 6e',valeur_event:1000,valeur_mois:400,type:'Recommandation clients',pitch:'Hôtel boutique chic Paris 6e. Clientèle business et créative.',status:'to_contact',score:9,contacted:false},
  {id:'in01',cat:'institution',name:'Mairie Paris 6e',contact:'Protocole',phone:'01 40 46 40 46',email:'mairie06@paris.fr',site:'mairie06.paris.fr',linkedin:'',taille:'100+',arrondissement:'Paris 6e',valeur_event:1000,valeur_mois:300,type:'Catering cérémonies',pitch:'Ta mairie ! Cérémonies officielles, vœux. Argument proximité et fierté locale.',status:'to_contact',score:10,contacted:false},
  {id:'in02',cat:'institution',name:'Sciences Po Paris',contact:'Direction événements',phone:'01 45 49 50 50',email:'events@sciencespo.fr',site:'sciencespo.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 7e',valeur_event:3000,valeur_mois:0,type:'Catering conférences',pitch:'2 minutes de Meshuga ! Conférences permanentes. Argument proximité fort.',status:'to_contact',score:10,contacted:false},
  {id:'tc01',cat:'tech',name:'Google France',contact:'Workplace Manager',phone:'01 42 68 53 00',email:'paris@google.com',site:'google.fr',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Catering + plateaux',pitch:'Culture food américaine très forte. Budget food et events très élevé.',status:'to_contact',score:9,contacted:false},
  {id:'tc02',cat:'tech',name:'Meta France',contact:'Office Experience',phone:'01 56 25 50 00',email:'paris@meta.com',site:'meta.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1500,type:'Catering + plateaux',pitch:'Culture américaine = sandwichs premium au bureau.',status:'to_contact',score:9,contacted:false},
  {id:'lx01',cat:'luxe',name:'Yves Saint Laurent',contact:'Events',phone:'01 42 36 22 22',email:'events@ysl.com',site:'ysl.com',linkedin:'',taille:'500+',arrondissement:'Paris 6e',valeur_event:4000,valeur_mois:0,type:'Catering events mode',pitch:'Dans TON arrondissement ! Events mode et internes réguliers.',status:'to_contact',score:9,contacted:false},
  {id:'cw01',cat:'coworking',name:'Station F',contact:'Community Manager',phone:'—',email:'business@stationf.co',site:'stationf.co',linkedin:'',taille:'1000+',arrondissement:'Paris 13e',valeur_event:2000,valeur_mois:1500,type:'Catering events',pitch:'Plus grand startup campus monde. Events quotidiens.',status:'to_contact',score:10,contacted:false},
  {id:'bk01',cat:'banque',name:'Rothschild & Co',contact:'Office Manager',phone:'01 40 74 40 74',email:'paris@rothschild.com',site:'rothschild.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Banque d\'affaires prestige. Réunions M&A permanentes.',status:'to_contact',score:10,contacted:false},
]

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [page, setPage] = useState('dash')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tasks, setTasks] = useState(INIT_TASKS)
  const [prospects, setProspects] = useState(INIT_PROSPECTS)
  const [contacts, setContacts] = useState(INIT_CONTACTS)
  const [vault, setVault] = useState(INIT_VAULT)
  const [reports, setReports] = useState<any[]>([])
  const [chasse, setChasse] = useState(ALL_PROSPECTS.map(p => ({...p})))
  const [toastMsg, setToastMsg] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState<any>({})
  const [pwVisible, setPwVisible] = useState<any>({})
  const [contactedToday, setContactedToday] = useState(0)
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [journalFilter, setJournalFilter] = useState('all')
  const [planningWeek, setPlanningWeek] = useState(0)
  const [chasseCat, setChasseChasse] = useState('all')
  const [chasseSearch, setChasseSearch] = useState('')
  const [chasseSort, setChasseSort] = useState('score')
  const [chasseTaille, setChasseTable] = useState('all')
  const [chasseStatus, setChasseStatus2] = useState('all')
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState('')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await sb().auth.getUser()
      if (!user) return
      const { data: prof } = await sb().from('profiles').select('*').eq('id', user.id).single()
      if (prof && prof.role) {
        setProfile(prof)
      } else {
        const role = user.email?.includes('emy') ? 'emy' : 'edward'
        setProfile({ role, full_name: role === 'emy' ? 'Emy' : 'Edward', email: user.email })
      }
    }
    loadProfile()
  }, [])

  useEffect(() => {
    if (!profile) return
    async function loadLog() {
      const { data } = await sb().from('activity_log').select('*').order('created_at', {ascending:false}).limit(200)
      if (data) setActivityLog(data)
    }
    loadLog()
    sb().from('activity_log').insert({
      user_role: profile.role,
      user_name: profile.full_name || profile.role,
      type: 'session_start',
      description: 'Connexion',
      prospect_name: null,
      email_content: null,
    }).then(() => {})
  }, [profile?.role])

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2800) }
  const openModal = (id: string, data?: any) => { setForm(data || {}); setModal(id) }
  const closeModal = () => { setModal(''); setForm({}) }
  const nav = (p: string) => { setPage(p); setSidebarOpen(false) }

  const today = new Date().toISOString().split('T')[0]
  const isEmy = profile?.role === 'emy'
  const todayRelances = prospects.filter(p => p.nextDate <= today && !['won','lost'].includes(p.status))

  let chasseFiltered = chasse.filter(p => chasseCat === 'all' || p.cat === chasseCat)
  if (chasseSearch) chasseFiltered = chasseFiltered.filter(p =>
    p.name.toLowerCase().includes(chasseSearch.toLowerCase()) ||
    (p.arrondissement||'').toLowerCase().includes(chasseSearch.toLowerCase())
  )
  if (chasseTaille !== 'all') chasseFiltered = chasseFiltered.filter(p => p.taille === chasseTaille)
  if (chasseStatus !== 'all') chasseFiltered = chasseFiltered.filter(p => p.status === chasseStatus)
  chasseFiltered = [...chasseFiltered].sort((a, b) => {
    if (chasseSort === 'score') return b.score - a.score
    if (chasseSort === 'valeur') return (b.valeur_event + b.valeur_mois*12) - (a.valeur_event + a.valeur_mois*12)
    if (chasseSort === 'name') return a.name.localeCompare(b.name)
    return 0
  })

  async function logActivity(type: string, description: string, prospectName?: string, emailContent?: string) {
    const entry = {
      user_role: profile?.role || 'unknown',
      user_name: profile?.full_name || '?',
      type, description,
      prospect_name: prospectName || null,
      email_content: emailContent || null,
    }
    await sb().from('activity_log').insert(entry)
    setActivityLog(prev => [{...entry, id: Date.now(), created_at: new Date().toISOString()}, ...prev.slice(0,199)])
  }

  function contactProspect(id: string) {
    const p = chasse.find(x => x.id === id)
    setChasse(prev => prev.map(x => x.id === id ? {...x, status:'contacted', contacted:true} : x))
    setContactedToday(c => c + 1)
    if (p) {
      setProspects(prev => [...prev, {id:Date.now(), name:p.name, email:p.email, phone:p.phone, size:p.taille, category:CATS_MAP[p.cat]?.label||p.cat, status:'contacted', nextAction:'Relancer', nextDate:'', notes:p.pitch, ca:0, score:p.score, files:[]}])
      logActivity('prospect_contacte', p.name + ' contacté et ajouté au CRM', p.name)
    }
    toast('✓ Prospect contacté ! Ajouté au CRM')
  }

  async function generateEmail(p: any) {
    setGeneratingEmail(true)
    setGeneratedEmail('')
    openModal('email', p)
    try {
      const senderName = isEmy ? 'Emy, B2B Manager' : 'Edward, patron'
      const signature = isEmy
        ? 'Emy | B2B Manager Meshuga | emy@meshuga.fr | +33 6 24 67 78 66'
        : 'Edward | Big Boss Meshuga | edward@meshuga.fr | +33 6 58 58 58 01'
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: 'Tu es ' + senderName + ' pour Meshuga Crazy Deli (Paris 6e, 3 rue Vavin). Restaurant new-yorkais premium : pastrami, lobster rolls, sandwichs gastronomiques. Spécialisés dans les plateaux déjeuner B2B et le catering événementiel sur tout Paris.\n\nÉcris un email de prise de contact pour ce prospect :\n- Entreprise : ' + p.name + '\n- Secteur : ' + (CATS_MAP[p.cat]?.label || p.cat) + '\n- Localisation : ' + p.arrondissement + '\n- Taille : ' + p.taille + ' employés\n- Ce qu\'on peut proposer : ' + p.type + '\n- Angle d\'approche : ' + p.pitch + '\n\nSois concis (6-8 lignes max), personnalisé. Commence par "Objet : " sur la première ligne.\nSignature : ' + signature + ' | 3 rue Vavin, Paris 6e'
          }]
        })
      })
      const data = await res.json()
      setGeneratedEmail(data.content?.[0]?.text || 'Erreur lors de la génération')
    } catch(e) {
      setGeneratedEmail('Erreur de connexion.')
    }
    setGeneratingEmail(false)
  }

  function saveTask() {
    if (!form.title) { toast('Titre requis !'); return }
    const t = {...form, checklist: form.checklist||[], files: form.files||[]}
    if (form.id) setTasks(prev => prev.map(x => x.id === form.id ? t : x))
    else setTasks(prev => [...prev, {...t, id:Date.now(), status:'todo'}])
    closeModal(); toast('Tâche sauvegardée ✓')
  }

  function saveProspect() {
    if (!form.name) { toast('Nom requis !'); return }
    const p = {...form, files: form.files||[]}
    if (form.id) setProspects(prev => prev.map(x => x.id === form.id ? p : x))
    else setProspects(prev => [...prev, {...p, id:Date.now(), status:'to_contact', ca:0}])
    closeModal(); toast('Prospect sauvegardé ✓')
  }

  function saveContact() {
    if (!form.name) { toast('Nom requis !'); return }
    if (form.id) setContacts(prev => prev.map(x => x.id === form.id ? {...form} : x))
    else setContacts(prev => [...prev, {...form, id:Date.now()}])
    closeModal(); toast('Contact sauvegardé ✓')
  }

  function saveVault() {
    if (!form.title) { toast('Nom requis !'); return }
    if (form.id) setVault(prev => prev.map(x => x.id === form.id ? {...form} : x))
    else setVault(prev => [...prev, {...form, id:Date.now()}])
    closeModal(); toast('Accès sauvegardé 🔐')
  }

  function submitCR() {
    if (!form.week) { toast('Semaine requise !'); return }
    setReports(prev => [{...form, id:Date.now(), status:'submitted', date:new Date().toLocaleDateString('fr-FR')}, ...prev])
    closeModal(); toast('CR soumis à Edward 📧')
  }

  const NAV = [
    {id:'dash', label:'Dashboard', icon:'⚡'},
    {id:'chasse', label:'Tableau de chasse', icon:'🎯', badge: contactedToday > 0 ? contactedToday+'/5' : undefined},
    {id:'crm', label:'CRM Prospects', icon:'◎'},
    {id:'annuaire', label:'Annuaire', icon:'📒'},
    {id:'tasks', label:'Tâches', icon:'✓'},
    {id:'reporting', label:'Reporting', icon:'📋', badge: !isEmy && reports.filter(r=>r.status==='submitted'&&!r.feedback).length > 0 ? reports.filter(r=>r.status==='submitted'&&!r.feedback).length : undefined},
    {id:'vault', label:'Coffre-fort', icon:'🔐'},
    {id:'gmb', label:'Google My Biz.', icon:'⭐'},
    {id:'journal', label:'Journal Emy', icon:'📓'},
  ]

  if (!profile) {
    return (
      <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'#FFEB5A',flexDirection:'column',gap:16}}>
        <style>{G}</style>
        <div style={{fontSize:48}}>😬</div>
        <div style={{fontWeight:900,fontSize:14,textTransform:'uppercase',letterSpacing:3}}>Chargement…</div>
        <a href="/login" style={{fontFamily:"'Yellowtail',cursive",fontSize:14,opacity:.4}}>← Se connecter</a>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <style>{G}</style>

      {/* MOBILE TOPBAR */}
      <div className="topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <span className="topbar-logo">meshuga</span>
        <span style={{fontFamily:"'Yellowtail',cursive",fontSize:13,color:'#FF82D7'}}>{isEmy ? 'Emy' : 'Edward'}</span>
      </div>

      <div className="shell">
        <div className={"sidebar-overlay" + (sidebarOpen ? ' open' : '')} onClick={() => setSidebarOpen(false)} />
        <div className={"sidebar" + (sidebarOpen ? ' open' : '')}>
          <div className="sb-logo">
            <div className="sb-stamp">😬</div>
            <div>
              <div style={{fontWeight:900,fontSize:18,textTransform:'uppercase',letterSpacing:2,lineHeight:1}}>meshuga</div>
              <div className="yt" style={{fontSize:12,opacity:.45}}>B2B Manager</div>
            </div>
          </div>
          <nav className="sb-nav">
            <div className="sb-sec">Navigation</div>
            {NAV.map(n => (
              <div key={n.id} className={"ni" + (page===n.id ? ' active' : '')} onClick={() => nav(n.id)}>
                <span style={{fontSize:14}}>{n.icon}</span>{n.label}
                {n.badge && <span className="nb">{n.badge}</span>}
              </div>
            ))}
          </nav>
          <div style={{padding:'10px 12px 14px',borderTop:'3px solid #191923'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:28,height:28,borderRadius:4,border:'2px solid #191923',background:isEmy?'#FF82D7':'#FFEB5A',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13}}>
                {profile.full_name?.[0]?.toUpperCase()||'?'}
              </div>
              <div>
                <div style={{fontWeight:900,fontSize:11,textTransform:'uppercase'}}>{profile.full_name||profile.email?.split('@')[0]}</div>
                <div className="yt" style={{fontSize:11,opacity:.4}}>{isEmy?'B2B Manager':'The Big Boss'}</div>
              </div>
            </div>
            <button className="btn btn-sm" style={{width:'100%',justifyContent:'center',opacity:.6}} onClick={async () => { await sb().auth.signOut(); window.location.href='/login' }}>
              ↩ Déconnexion
            </button>
          </div>
        </div>

        <div className="main">
          <div className="strip" />

          {/* ══ DASHBOARD ══ */}
          {page==='dash' && (
            <div>
              <div className="ph">
                <div>
                  <div className="pt">{isEmy ? 'Bonjour Emy 🌸' : 'Bonjour Edward 👋'}</div>
                  <div className="ps">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
                </div>
                {isEmy && <button className="btn btn-n btn-sm" onClick={() => openModal('cr', {})}>+ Nouveau CR</button>}
              </div>

              {isEmy && (
                <div className="card-p" style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div className="ct" style={{margin:0}}>🎯 Objectif prospection du jour</div>
                    <button className="btn btn-n btn-sm" onClick={() => nav('chasse')}>Tableau de chasse →</button>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontWeight:900,fontSize:13}}>Prospects contactés aujourd'hui</span>
                    <span style={{fontWeight:900,fontSize:18,color:contactedToday>=5?'#009D3A':'#191923'}}>{contactedToday} / 5</span>
                  </div>
                  <div className="prog-wrap"><div className="prog-fill" style={{width:Math.min(contactedToday/5*100,100)+'%',background:contactedToday>=5?'#009D3A':'#191923'}} /></div>
                  {contactedToday>=5 && <div style={{marginTop:8,fontWeight:900,fontSize:12,color:'#009D3A'}}>🎉 Objectif atteint !</div>}
                </div>
              )}

              {todayRelances.length > 0 && (
                <div className="card-p" style={{marginBottom:12}}>
                  <div className="ct">⏰ Relances urgentes</div>
                  {todayRelances.map(p => (
                    <div key={p.id} className="al" style={{cursor:'pointer'}} onClick={() => nav('crm')}>
                      <div style={{flex:1}}><div style={{fontWeight:900,fontSize:13}}>{p.name}</div><div style={{fontSize:10,opacity:.6}}>{p.nextAction}</div></div>
                      <span style={{fontSize:9,fontWeight:900,background:'#191923',color:'#FFEB5A',padding:'2px 7px',borderRadius:3}}>Urgent</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="g4">
                <div className="kc" style={{background:'#FFEB5A'}} onClick={() => nav('chasse')}>
                  <div className="kl">Tableau de chasse</div>
                  <div className="kv">{chasse.filter(p=>p.status==='to_contact').length}</div>
                  <div className="ki">🎯</div>
                </div>
                <div className="kc" style={{background:'#FF82D7'}} onClick={() => nav('crm')}>
                  <div className="kl">Pipeline B2B</div>
                  <div className="kv">{prospects.filter(p=>!['won','lost'].includes(p.status)).length}</div>
                  <div className="ki">◎</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={() => nav('tasks')}>
                  <div className="kl">Tâches actives</div>
                  <div className="kv">{tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).length}</div>
                  <div className="ki">✓</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={() => nav('reporting')}>
                  <div className="kl">CRs soumis</div>
                  <div className="kv">{reports.length}</div>
                  <div className="ki">📋</div>
                </div>
              </div>

              <div className="g2">
                <div className="card">
                  <div className="ct">{isEmy ? 'Mes tâches' : 'Tâches équipe'}</div>
                  {tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).slice(0,4).map(t => (
                    <div key={t.id} className="row" style={{gridTemplateColumns:'4px 1fr auto',gap:10}}>
                      <div className="pbar" style={{background:t.priority==='high'?'#FF82D7':'#005FFF'}} />
                      <div><div style={{fontSize:12,fontWeight:900}}>{t.title}</div><div style={{fontSize:10,opacity:.5}}>{t.deadline} · {t.assignee}</div></div>
                      <span className="badge" style={{color:t.status==='in_progress'?'#005FFF':'#888',borderColor:t.status==='in_progress'?'#005FFF':'#ccc'}}>{TASK_S[t.status]}</span>
                    </div>
                  ))}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={() => nav('tasks')}>Voir toutes →</button>
                </div>
                <div className="card">
                  <div className="ct">{isEmy ? 'Mon pipeline' : 'Prospects chauds'}</div>
                  {prospects.filter(p=>!['won','lost'].includes(p.status)).slice(0,4).map(p => (
                    <div key={p.id} className="row" style={{gridTemplateColumns:'1fr auto',gap:8}}>
                      <div><div style={{fontSize:12,fontWeight:900}}>{p.name}</div><div style={{fontSize:10,opacity:.5}}>{p.nextAction}</div></div>
                      <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                    </div>
                  ))}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={() => nav('crm')}>Voir le CRM →</button>
                </div>
              </div>

              {/* PLANNING SEMAINE */}
              <div className="card" style={{padding:0,overflow:'hidden',marginBottom:10}}>
                <div style={{background:'#191923',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <div className="yt" style={{color:'#FFEB5A',fontSize:16}}>📅 Planning {isEmy ? "de ma semaine" : "d'Emy"}</div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={() => setPlanningWeek(w => w-1)}>←</button>
                    <span style={{color:'#FFEB5A',fontSize:11,fontWeight:900,minWidth:110,textAlign:'center'}}>
                      {planningWeek===0 ? 'Cette semaine' : planningWeek<0 ? 'Il y a '+Math.abs(planningWeek)+' sem.' : 'Dans '+planningWeek+' sem.'}
                    </span>
                    <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={() => setPlanningWeek(w => w+1)}>→</button>
                    {planningWeek!==0 && <button className="btn btn-y btn-sm" onClick={() => setPlanningWeek(0)}>Auj.</button>}
                  </div>
                </div>
                <div style={{padding:'10px 14px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5}}>
                    {['Lun','Mar','Mer','Jeu','Ven'].map((day,di) => {
                      const ws = new Date()
                      const dow = ws.getDay()===0 ? 6 : ws.getDay()-1
                      ws.setDate(ws.getDate()-dow+(planningWeek*7))
                      const dd = new Date(ws)
                      dd.setDate(ws.getDate()+di)
                      const ds = dd.toISOString().split('T')[0]
                      const isToday = ds === new Date().toISOString().split('T')[0]
                      const isPast = dd < new Date(new Date().toDateString())
                      const dt = tasks.filter(t => t.deadline===ds && t.assignee==='emy')
                      const hasLate = isPast && dt.some(t => t.status!=='done')
                      const allDone = dt.length>0 && dt.every(t => t.status==='done')
                      return (
                        <div key={day} style={{borderRadius:5,border:'2px solid '+(isToday?'#005FFF':hasLate?'#CC0066':allDone?'#009D3A':'#EBEBEB'),background:isToday?'#E3F0FF':hasLate?'#FCE4EC':allDone?'#E8F5E9':'#FAFAFA',padding:'6px',minHeight:70}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                            <div className="yt" style={{fontSize:11,color:isToday?'#005FFF':hasLate?'#CC0066':'#191923'}}>{day}</div>
                            <div style={{fontSize:9,opacity:.4}}>{dd.getDate()}/{dd.getMonth()+1}</div>
                          </div>
                          {dt.length===0 ? <div style={{fontSize:9,opacity:.25,textAlign:'center',marginTop:6}}>—</div> : dt.map(t => (
                            <div key={t.id} onClick={() => nav('tasks')} style={{cursor:'pointer',background:t.status==='done'?'rgba(0,157,58,.1)':t.priority==='high'?'rgba(255,130,215,.2)':'rgba(0,95,255,.1)',borderLeft:'3px solid '+(t.status==='done'?'#009D3A':t.priority==='high'?'#FF82D7':'#005FFF'),borderRadius:'0 3px 3px 0',padding:'2px 4px',marginBottom:2,fontSize:9,fontWeight:900,textDecoration:t.status==='done'?'line-through':'none',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {!isEmy && reports.length > 0 && (
                <div className="card">
                  <div className="ct">📋 Dernier CR d'Emy</div>
                  <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:10}}>
                    <div className="yt" style={{fontSize:12,opacity:.5,marginBottom:4}}>{reports[0].week}</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                      {[['Prospects',reports[0].prospects],['RDV',reports[0].rdv],['Cmdes',reports[0].cmds]].map(([l,v]) => (
                        <div key={l} style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'6px',textAlign:'center'}}>
                          <div style={{fontWeight:900,fontSize:18}}>{v}</div>
                          <div className="yt" style={{fontSize:10,opacity:.5}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className="btn btn-y btn-sm" style={{marginTop:8}} onClick={() => nav('reporting')}>Voir et répondre →</button>
                </div>
              )}
            </div>
          )}

          {/* ══ TABLEAU DE CHASSE ══ */}
          {page==='chasse' && (
            <div>
              <div className="ph">
                <div>
                  <div className="pt">Tableau de Chasse 🎯</div>
                  <div className="ps">{chasse.filter(p=>p.status==='to_contact').length} à contacter · {chasse.length} total</div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {isEmy && <div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:11,marginBottom:3}}>{contactedToday}/5 auj.</div><div className="prog-wrap" style={{width:100}}><div className="prog-fill" style={{width:Math.min(contactedToday/5*100,100)+'%'}} /></div></div>}
                  <button className="btn btn-y btn-sm" onClick={() => openModal('chasse_add', {cat:'evenementiel',score:5})}>+ Ajouter</button>
                </div>
              </div>

              <div className="search-bar">
                <input className="inp" style={{flex:1,minWidth:140}} value={chasseSearch} onChange={e => setChasseSearch(e.target.value)} placeholder="🔍 Rechercher..." />
                <select className="inp sel" style={{width:140}} value={chasseSort} onChange={e => setChasseSort(e.target.value)}>
                  <option value="score">Score</option>
                  <option value="valeur">Valeur</option>
                  <option value="name">A-Z</option>
                </select>
                <select className="inp sel" style={{width:130}} value={chasseStatus} onChange={e => setChasseStatus2(e.target.value)}>
                  <option value="all">Tous statuts</option>
                  {(Object.entries(STATUS_P) as any[]).map(([k,v]) => <option key={k} value={k}>{String(v)}</option>)}
                </select>
              </div>

              <div className="filter-row">
                {(Object.entries(CATS_MAP) as any[]).map(([k,v]) => (
                  <div key={k} className={"tag"+(chasseCat===k?' on':'')} onClick={() => setChasseChasse(k)}>{v.emoji} {v.label}</div>
                ))}
              </div>

              {chasseFiltered.map(p => (
                <div key={p.id} className="chasse-card">
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
                        <span style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:'#FFEB5A',flexShrink:0}}>{CATS_MAP[p.cat]?.emoji} {CATS_MAP[p.cat]?.label||p.cat}</span>
                        <span style={{fontSize:9,fontWeight:900,background:p.score>=9?'#191923':'#EBEBEB',color:p.score>=9?'#FFEB5A':'#191923',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px',flexShrink:0}}>{'★'.repeat(Math.min(Math.ceil(p.score/3),3))} {p.score}/10</span>
                        {p.status!=='to_contact' && <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>}
                      </div>
                      <div style={{fontWeight:900,fontSize:15}}>{p.name}</div>
                      <div style={{fontSize:11,opacity:.5}}>{p.arrondissement} · {p.taille} emp.</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      {p.valeur_event>0 && <div style={{fontWeight:900,fontSize:14}}>~{p.valeur_event.toLocaleString()}€</div>}
                      {p.valeur_mois>0 && <div style={{fontWeight:900,fontSize:14}}>~{p.valeur_mois.toLocaleString()}€/mois</div>}
                    </div>
                  </div>

                  <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:5,padding:'8px 10px',marginBottom:8,fontSize:12}}>
                    <span style={{fontWeight:900}}>💡 </span>{p.pitch}
                  </div>

                  <div style={{display:'flex',gap:10,flexWrap:'wrap',fontSize:11,marginBottom:8,opacity:.7}}>
                    {p.email&&p.email!=='—'&&<span>✉️ {p.email}</span>}
                    {p.phone&&p.phone!=='—'&&<span>📞 {p.phone}</span>}
                    {p.contact&&p.contact!=='—'&&<span>👤 {p.contact}</span>}
                    {p.site&&p.site!=='—'&&<a href={"https://"+p.site} target="_blank" rel="noopener noreferrer" style={{color:'#005FFF',textDecoration:'none'}}>🌐 {p.site}</a>}
                    {p.linkedin&&p.linkedin!==''&&<a href={p.linkedin.startsWith('http')?p.linkedin:"https://"+p.linkedin} target="_blank" rel="noopener noreferrer" style={{color:'#0077B5',fontWeight:900,textDecoration:'none'}}>🔗 LinkedIn</a>}
                  </div>

                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="btn btn-p btn-sm" onClick={() => generateEmail(p)}>✉️ Email IA</button>
                    {p.status==='to_contact' && <button className="btn btn-g btn-sm" onClick={() => contactProspect(p.id)}>✓ Contacté</button>}
                    {p.status==='contacted' && <button className="btn btn-b btn-sm" onClick={() => { setChasse(prev=>prev.map(x=>x.id===p.id?{...x,status:'nego'}:x)); toast('Passé en négo') }}>→ Négo</button>}
                    {p.status==='nego' && <button className="btn btn-sm" style={{background:'#009D3A',color:'#fff'}} onClick={() => { setChasse(prev=>prev.map(x=>x.id===p.id?{...x,status:'won'}:x)); toast('🎉 Gagné !') }}>✓ Gagné</button>}
                    {!['won','lost'].includes(p.status) && <button className="btn btn-sm btn-red" onClick={() => { setChasse(prev=>prev.map(x=>x.id===p.id?{...x,status:'lost'}:x)); toast('Marqué perdu') }}>✗ Perdu</button>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ CRM ══ */}
          {page==='crm' && (
            <div>
              <div className="ph">
                <div><div className="pt">CRM Prospects</div><div className="ps">{prospects.length} prospects</div></div>
                <button className="btn btn-y btn-sm" onClick={() => openModal('prospect', {status:'to_contact',ca:0,files:[]})}>+ Nouveau</button>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
                {(Object.entries(STATUS_P) as any[]).map(([k,v]) => (
                  <div key={k} style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:'8px 12px',textAlign:'center',boxShadow:'2px 2px 0 #191923',flex:'1 1 80px'}}>
                    <div style={{fontWeight:900,fontSize:22}}>{prospects.filter(p=>p.status===k).length}</div>
                    <div className="yt" style={{fontSize:11,opacity:.6}}>{v}</div>
                  </div>
                ))}
              </div>
              {prospects.map(p => (
                <div key={p.id} className="card" style={{cursor:'pointer',marginBottom:8}} onClick={() => openModal('prospect', {...p})}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:6}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:14}}>{p.name}</div>
                      <div style={{fontSize:11,opacity:.5}}>{p.category} · {p.email}</div>
                    </div>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                      <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                      {p.ca>0 && <span className="badge" style={{color:'#009D3A',borderColor:'#009D3A'}}>{p.ca.toLocaleString()}€</span>}
                    </div>
                  </div>
                  {p.nextDate && <div style={{fontSize:11,opacity:.6,color:p.nextDate<=today?'#CC0066':'inherit',fontWeight:p.nextDate<=today?900:400}}>{p.nextDate<=today?'⚠️ ':''}{p.nextAction}</div>}
                  {(p.files||[]).filter(f=>f.trim()).length>0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:6}}>
                      {(p.files||[]).filter(f=>f.trim()).map((f,i) => (
                        <span key={i} style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px',fontSize:9,fontWeight:900}}>📦 {f.slice(0,30)}</span>
                      ))}
                    </div>
                  )}
                  <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                    <button className="btn btn-p btn-sm" onClick={e => {e.stopPropagation();generateEmail({...p,cat:'crm',arrondissement:'',taille:p.size,pitch:p.notes||'',type:p.category})}}>✉️ Email IA</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ ANNUAIRE ══ */}
          {page==='annuaire' && (
            <div>
              <div className="ph">
                <div><div className="pt">Annuaire</div><div className="ps">{contacts.length} contacts</div></div>
                <button className="btn btn-y btn-sm" onClick={() => openModal('contact', {cat:'food',vip:false})}>+ Ajouter</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
                {contacts.map(c => (
                  <div key={c.id} className="card" style={{cursor:'pointer'}} onClick={() => openModal('contact', {...c})}>
                    <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,display:'inline-block',marginBottom:7,background:['banque','presse'].includes(c.cat)?'#FF82D7':'#FFEB5A'}}>{CAT_ANN[c.cat]||c.cat}</div>
                    {c.vip && <span style={{float:'right',fontSize:10,fontWeight:900}}>⭐ VIP</span>}
                    <div style={{fontWeight:900,fontSize:14}}>{c.name}</div>
                    {c.contact&&c.contact!=='—'&&<div style={{fontSize:11,opacity:.6}}>{c.contact}</div>}
                    {c.phone&&c.phone!=='—'&&<div style={{fontSize:11,marginTop:4}}>📞 {c.phone}</div>}
                    {c.email&&<div style={{fontSize:11,marginTop:2}}>✉️ {c.email}</div>}
                    {c.notes&&<div style={{fontSize:10,fontWeight:900,opacity:.4,marginTop:6,textTransform:'uppercase'}}>{c.notes}</div>}
                  </div>
                ))}
                <div className="card" style={{border:'2px dashed #191923',boxShadow:'none',display:'flex',alignItems:'center',justifyContent:'center',minHeight:100,cursor:'pointer',opacity:.4}} onClick={() => openModal('contact', {cat:'food',vip:false})}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:24}}>+</div><div style={{fontSize:10,fontWeight:900,textTransform:'uppercase'}}>Ajouter</div></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TACHES ══ */}
          {page==='tasks' && (
            <div>
              <div className="ph">
                <div><div className="pt">Tâches</div><div className="ps">{tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).length} actives</div></div>
                <button className="btn btn-y btn-sm" onClick={() => openModal('task', {assignee:'emy',priority:'medium',status:'todo',checklist:[],files:[]})}>+ Nouvelle</button>
              </div>
              {(isEmy ? tasks.filter(t=>t.assignee==='emy') : tasks).map(t => (
                <div key={t.id} className="card" style={{padding:0,overflow:'hidden',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'stretch'}}>
                    <div style={{width:6,background:t.priority==='high'?'#FF82D7':t.priority==='medium'?'#005FFF':'#009D3A',flexShrink:0}} />
                    <div style={{padding:'12px 14px',flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:900,textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?.5:1}}>{t.title}</div>
                          <div style={{fontSize:10,opacity:.5,marginTop:2}}>{t.deadline} · {t.assignee} · {t.priority==='high'?'🔴 Haute':t.priority==='medium'?'🟡 Moyenne':'🟢 Basse'}</div>
                        </div>
                        <div style={{display:'flex',gap:4,flexShrink:0}}>
                          <span className="badge" style={{color:t.status==='in_progress'?'#005FFF':t.status==='done'?'#009D3A':'#888',borderColor:t.status==='in_progress'?'#005FFF':t.status==='done'?'#009D3A':'#ccc'}}>{TASK_S[t.status]}</span>
                          <button className="btn btn-y btn-sm" onClick={() => {const o=['todo','in_progress','done'];setTasks(prev=>prev.map(x=>x.id!==t.id?x:{...x,status:o[Math.min(o.indexOf(x.status)+1,2)]}));toast('Avancé ✓')}}>→</button>
                          <button className="btn btn-sm" onClick={() => openModal('task', {...t})}>✏️</button>
                          <button className="btn btn-sm btn-red" onClick={() => {setTasks(prev=>prev.filter(x=>x.id!==t.id));toast('Supprimé')}}>✕</button>
                        </div>
                      </div>
                      {t.checklist && t.checklist.filter(c=>c).length>0 && (
                        <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid #EBEBEB'}}>
                          {t.checklist.filter(c=>c).map((item,ci) => (
                            <div key={ci} style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                              <input type="checkbox" checked={item.startsWith('✓ ')} style={{width:13,height:13,flexShrink:0,cursor:'pointer',accentColor:'#009D3A'}}
                                onChange={e => {const nl=[...t.checklist];nl[ci]=e.target.checked?'✓ '+item.replace('✓ ',''):item.replace('✓ ','');setTasks(prev=>prev.map(x=>x.id===t.id?{...x,checklist:nl}:x))}} />
                              <span style={{fontSize:11,textDecoration:item.startsWith('✓ ')?'line-through':'none',opacity:item.startsWith('✓ ')?.4:1}}>{item.replace('✓ ','')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ REPORTING ══ */}
          {page==='reporting' && (
            <div>
              <div className="ph">
                <div><div className="pt">Reporting</div><div className="ps">Compte-rendus hebdo</div></div>
                {isEmy && <button className="btn btn-n btn-sm" onClick={() => openModal('cr', {})}>+ Nouveau CR</button>}
              </div>
              {!isEmy && (
                <div className="card-y" style={{marginBottom:12}}>
                  <div className="ct">📝 Formulaire CR d'Emy</div>
                  <div style={{fontSize:12,opacity:.7,marginBottom:8}}>Voici ce qu'Emy remplit chaque semaine :</div>
                  {[['Semaine du','ex: 25 mars 2026'],['Prospects contactés','nombre'],['RDV effectués','nombre'],['Commandes obtenues','nombre'],['Victoires','ce qu\'elle a accompli'],['Challenges','blocages rencontrés'],['Priorités S+1','ses 3 priorités'],['Note pour Edward','message libre']].map(([l,p]) => (
                    <div key={l} style={{display:'flex',gap:8,alignItems:'center',padding:'4px 0',borderBottom:'1px solid rgba(25,25,35,.08)'}}>
                      <div style={{fontSize:11,fontWeight:900,width:180,flexShrink:0}}>{l}</div>
                      <div style={{fontSize:11,opacity:.5,fontStyle:'italic'}}>{p}</div>
                    </div>
                  ))}
                </div>
              )}
              {reports.map((r,i) => (
                <div key={r.id} className="card-y" style={{border:'2px solid #191923',borderRadius:7,boxShadow:'3px 3px 0 #191923',marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
                    <div><div className="yt" style={{fontSize:12,opacity:.5}}>{r.date}</div><div style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{r.week}</div></div>
                    <span className="badge" style={{color:r.status==='submitted'?'#005FFF':'#009D3A',borderColor:r.status==='submitted'?'#005FFF':'#009D3A'}}>{r.status==='submitted'?'Soumis':'Lu ✓'}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                    {[['Prospects',r.prospects],['RDV',r.rdv],['Commandes',r.cmds]].map(([l,v]) => (
                      <div key={l} style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}>
                        <div style={{fontWeight:900,fontSize:20}}>{v}</div>
                        <div className="yt" style={{fontSize:11,opacity:.5}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {r.wins && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>✅ Victoires</div><div style={{fontSize:12}}>{r.wins}</div></div>}
                  {r.challenges && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>⚡ Challenges</div><div style={{fontSize:12}}>{r.challenges}</div></div>}
                  {r.next && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>🎯 Priorités S+1</div><div style={{fontSize:12}}>{r.next}</div></div>}
                  {r.notes && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>💬 Note d'Emy</div><div style={{fontSize:12}}>{r.notes}</div></div>}
                  {r.feedback && <div style={{background:'#FF82D7',border:'2px solid #191923',borderRadius:5,padding:10}}><div className="yt" style={{fontSize:14,marginBottom:4}}>💬 Retour d'Edward</div><div style={{fontSize:12}}>{r.feedback}</div></div>}
                  {!isEmy && !r.feedback && (
                    <div style={{marginTop:10}}>
                      <div className="lbl">💬 Ton retour à Emy</div>
                      <textarea className="inp" placeholder="Bravo, recadrages..." id={"fb-"+r.id} style={{minHeight:60}} />
                      <button className="btn btn-y btn-sm" style={{marginTop:6}} onClick={() => {const v=document.getElementById('fb-'+r.id)?.value;if(v){setReports(prev=>prev.map((x,j)=>j===i?{...x,feedback:v,status:'read'}:x));toast('Retour envoyé ✓')}}}>Envoyer le retour</button>
                    </div>
                  )}
                </div>
              ))}
              {reports.length===0 && (
                <div className="card" style={{textAlign:'center',padding:40}}>
                  <div style={{fontSize:40,marginBottom:10}}>📋</div>
                  <div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun CR pour l'instant</div>
                  {isEmy && <button className="btn btn-y" style={{marginTop:14}} onClick={() => openModal('cr', {})}>Créer le premier CR</button>}
                </div>
              )}
            </div>
          )}

          {/* ══ VAULT ══ */}
          {page==='vault' && (
            <div>
              <div className="ph">
                <div><div className="pt">Coffre-fort 🔐</div><div className="ps">Accès sécurisés</div></div>
                <button className="btn btn-y btn-sm" onClick={() => openModal('vault', {})}>+ Ajouter</button>
              </div>
              <div className="card-p" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',marginBottom:12}}>
                <span style={{fontSize:16}}>🔒</span>
                <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5}}>Données privées Meshuga</span>
              </div>
              {vault.map((v,i) => (
                <div key={v.id} className="card" style={{padding:0,overflow:'hidden',marginBottom:8}}>
                  <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'1fr 1.5fr 1.2fr 1.2fr 70px',gap:10,alignItems:'center'}}>
                    <div style={{fontWeight:900,fontSize:13}}>{v.title}</div>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#005FFF',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onClick={e=>e.stopPropagation()}>{v.url}</a>
                    <div style={{fontSize:11}}>{v.user}</div>
                    <div style={{fontFamily:'monospace',letterSpacing:pwVisible[i]?'normal':3,fontSize:11,cursor:'pointer'}} onClick={() => setPwVisible(prev=>({...prev,[i]:!prev[i]}))}>{pwVisible[i]?(v.pw||'(vide)'):'••••••••'} <span style={{fontSize:9,opacity:.4}}>{pwVisible[i]?'🙈':'👁'}</span></div>
                    <div style={{display:'flex',gap:3}}>
                      <button className="btn btn-sm" onClick={() => openModal('vault', {...v})}>✏️</button>
                      <button className="btn btn-sm btn-red" onClick={() => {setVault(prev=>prev.filter(x=>x.id!==v.id));toast('Supprimé')}}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ GMB ══ */}
          {page==='gmb' && (
            <div>
              <div className="ph"><div><div className="pt">Google My Business</div><div className="ps">Avis · Visibilité</div></div></div>
              <div className="card-y">
                <div className="ct">🔗 Connexion requise</div>
                <p style={{fontSize:13,marginBottom:14}}>Configure Google My Business pour voir tes avis et y répondre directement.</p>
                <button className="btn btn-n" onClick={() => { const url='https://accounts.google.com/o/oauth2/v2/auth?client_id='+process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID+'&redirect_uri='+window.location.origin+'/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent'; window.location.href=url }}>Se connecter avec Google →</button>
              </div>
            </div>
          )}

          {/* ══ JOURNAL EMY ══ */}
          {page==='journal' && (
            <div>
              <div className="ph"><div><div className="pt">Journal d'Emy 📓</div><div className="ps">Sessions · Contacts · Emails</div></div></div>

              <div className="card" style={{marginBottom:12,padding:'12px 14px',background:'#191923',borderRadius:7}}>
                <div className="yt" style={{fontSize:13,marginBottom:8,color:'#FF82D7'}}>🕐 Sessions de connexion</div>
                {activityLog.filter(a=>a.type==='session_start').slice(0,10).map((a,i) => (
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
                    <div style={{fontSize:12,fontWeight:900,color:'#FFEB5A'}}>{a.user_name} <span style={{fontSize:10,opacity:.4}}>({a.user_role})</span></div>
                    <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{new Date(a.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                ))}
                {activityLog.filter(a=>a.type==='session_start').length===0 && <div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Aucune session enregistrée</div>}
              </div>

              <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
                {[['all','Tout'],['email_copie','✉️ Emails'],['prospect_contacte','📞 Contacts']].map(([k,l]) => (
                  <div key={k} className={"tag"+(journalFilter===k?' on':'')} onClick={() => setJournalFilter(k)}>{l}</div>
                ))}
              </div>

              {activityLog.filter(a=>a.type!=='session_start'&&(journalFilter==='all'||a.type===journalFilter)).length===0 ? (
                <div className="card" style={{textAlign:'center',padding:40,opacity:.4}}>
                  <div style={{fontSize:32,marginBottom:8}}>📓</div>
                  <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase'}}>Aucune activité</div>
                </div>
              ) : activityLog.filter(a=>a.type!=='session_start'&&(journalFilter==='all'||a.type===journalFilter)).map(a => (
                <div key={a.id||a.created_at} className="card" style={{padding:'12px 14px',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                        <span style={{fontSize:16}}>{a.type==='email_copie'?'✉️':a.type==='prospect_contacte'?'📞':'🔄'}</span>
                        <span style={{fontWeight:900,fontSize:13}}>{a.description}</span>
                        <span style={{fontSize:9,fontWeight:900,padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:a.user_role==='emy'?'#FF82D7':'#FFEB5A'}}>{a.user_name}</span>
                      </div>
                      {a.prospect_name && <div style={{fontSize:11,opacity:.5,marginLeft:24}}>🎯 {a.prospect_name}</div>}
                      {a.email_content && (
                        <details style={{marginTop:8,marginLeft:24}}>
                          <summary style={{cursor:'pointer',fontSize:11,fontWeight:900,opacity:.6}}>Voir l'email envoyé</summary>
                          <div style={{background:'#F8F8F8',border:'1.5px solid #DEDEDE',borderRadius:5,padding:10,marginTop:6,fontSize:12,whiteSpace:'pre-wrap',lineHeight:1.6}}>{a.email_content}</div>
                        </details>
                      )}
                    </div>
                    <div style={{fontSize:10,opacity:.4,flexShrink:0}}>{new Date(a.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══ */}

      {/* EMAIL IA */}
      {modal==='email' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="mh"><div className="mt">✉️ Email IA — {form.name}</div></div>
            <div className="mb">
              {generatingEmail ? (
                <div style={{textAlign:'center',padding:30}}>
                  <div style={{fontSize:32,marginBottom:10}}>✨</div>
                  <div style={{fontWeight:900,fontSize:13,textTransform:'uppercase'}}>Génération en cours…</div>
                </div>
              ) : generatedEmail ? (
                <div>
                  <div className="lbl" style={{marginBottom:6}}>Email généré — modifie avant d'envoyer</div>
                  <textarea className="inp" style={{minHeight:280,fontFamily:'Arial,sans-serif',fontSize:13,lineHeight:1.6}} value={generatedEmail} onChange={e=>setGeneratedEmail(e.target.value)} />
                  <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:10,fontSize:12,marginTop:8}}>
                    Copie et envoie depuis <strong>{isEmy?'emy@meshuga.fr':'edward@meshuga.fr'}</strong>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Fermer</button>
              {generatedEmail && (
                <div>
                  <button className="btn btn-y" onClick={() => { navigator.clipboard.writeText(generatedEmail); toast('Email copié ! 📋'); logActivity('email_copie','Email copié pour '+form.name, form.name, generatedEmail) }}>📋 Copier</button>
                  {' '}
                  <button className="btn btn-p" onClick={() => generateEmail(form)}>🔄 Regénérer</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AJOUT CHASSE */}
      {modal==='chasse_add' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="mh"><div className="mt">Ajouter un prospect</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Catégorie</label>
                  <select className="inp sel" value={form.cat||'evenementiel'} onChange={e=>setForm({...form,cat:e.target.value})}>
                    {(Object.entries(CATS_MAP) as any[]).filter(([k])=>k!=='all').map(([k,v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="lbl">Score /10</label><input type="number" min="1" max="10" className="inp" value={form.score||5} onChange={e=>setForm({...form,score:parseInt(e.target.value)||5})} /></div>
                <div className="fg"><label className="lbl">Contact</label><input className="inp" value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Site web</label><input className="inp" value={form.site||''} onChange={e=>setForm({...form,site:e.target.value})} /></div>
                <div className="fg"><label className="lbl">🔗 LinkedIn</label><input className="inp" value={form.linkedin||''} onChange={e=>setForm({...form,linkedin:e.target.value})} placeholder="https://linkedin.com/in/..." /></div>
                <div className="fg"><label className="lbl">Taille</label>
                  <select className="inp sel" value={form.taille||'10-50'} onChange={e=>setForm({...form,taille:e.target.value})}>
                    {['1-10','5-20','10-50','50-100','100+','200+','500+','1000+'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="lbl">Arrondissement</label><input className="inp" value={form.arrondissement||''} onChange={e=>setForm({...form,arrondissement:e.target.value})} placeholder="Paris 6e" /></div>
                <div className="fg"><label className="lbl">Valeur event €</label><input type="number" className="inp" value={form.valeur_event||''} onChange={e=>setForm({...form,valeur_event:parseInt(e.target.value)||0})} /></div>
                <div className="fg"><label className="lbl">Valeur mensuelle €</label><input type="number" className="inp" value={form.valeur_mois||''} onChange={e=>setForm({...form,valeur_mois:parseInt(e.target.value)||0})} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Type de commande</label><input className="inp" value={form.type||''} onChange={e=>setForm({...form,type:e.target.value})} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">💡 Angle d'approche</label><textarea className="inp" value={form.pitch||''} onChange={e=>setForm({...form,pitch:e.target.value})} /></div>
              </div>
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={() => {
                if (!form.name) { toast('Nom requis !'); return }
                const newP = {id:'m_'+Date.now(),cat:form.cat||'evenementiel',name:form.name,contact:form.contact||'—',phone:form.phone||'—',email:form.email||'—',site:form.site||'—',linkedin:form.linkedin||'',taille:form.taille||'10-50',arrondissement:form.arrondissement||'Paris',valeur_event:parseInt(form.valeur_event)||0,valeur_mois:parseInt(form.valeur_mois)||0,type:form.type||'—',pitch:form.pitch||'',status:'to_contact',score:parseInt(form.score)||5,contacted:false}
                setChasse(prev=>[newP,...prev]); closeModal(); toast('Prospect ajouté ✓')
              }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {/* PROSPECT CRM */}
      {modal==='prospect' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-xl" onClick={e=>e.stopPropagation()}>
            <div className="mh"><div className="mt">{form.id ? form.name : 'Nouveau prospect CRM'}</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Taille</label><select className="inp sel" value={form.size||''} onChange={e=>setForm({...form,size:e.target.value})}><option value="">—</option><option>1-10</option><option>10-50</option><option>50-200</option><option>200+</option><option>1000+</option></select></div>
                <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}><option value="">—</option><option>Événementiel</option><option>Corporate</option><option>Startup</option><option>Avocats</option><option>Conseil</option><option>Hôtellerie</option><option>Tech</option><option>Institution</option><option>Autre</option></select></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'to_contact'} onChange={e=>setForm({...form,status:e.target.value})}>{(Object.entries(STATUS_P) as any[]).map(([=><option key={k} value={k}>{v}</option>)}</select></div>
                <div className="fg"><label className="lbl">CA gagné €</label><input type="number" className="inp" value={form.ca||0} onChange={e=>setForm({...form,ca:parseInt(e.target.value)||0})} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label className="lbl">📅 Prochaine relance</label>
                  <div style={{display:'flex',gap:6}}>
                    <input type="date" className="inp" style={{flex:1}} value={form.nextDate||''} onChange={e=>setForm({...form,nextDate:e.target.value})} />
                    <button className="btn btn-sm" onClick={() => {const d=new Date();d.setDate(d.getDate()+7);setForm({...form,nextDate:d.toISOString().split('T')[0]})}}>+7j</button>
                    <button className="btn btn-sm" onClick={() => {const d=new Date();d.setDate(d.getDate()+14);setForm({...form,nextDate:d.toISOString().split('T')[0]})}}>+14j</button>
                  </div>
                  <input className="inp" style={{marginTop:6}} value={form.nextAction||''} onChange={e=>setForm({...form,nextAction:e.target.value})} placeholder="Action prévue…" />
                </div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}>
                  <label className="lbl">📦 Documents joints</label>
                  <textarea className="inp" style={{minHeight:55}} value={(form.files||[]).join('\n')} onChange={e=>setForm({...form,files:e.target.value.split('\n')})} placeholder="Devis_2026.pdf&#10;https://drive.google.com/..." />
                  <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>
                    {(form.files||[]).filter(f=>f.trim()).map((f,i) => (
                      <span key={i} style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px',fontSize:9,fontWeight:900}}>📦 {f.slice(0,30)}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={() => {setProspects(prev=>prev.filter(x=>x.id!==form.id));closeModal();toast('Supprimé')}}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveProspect}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {/* TACHE */}
      {modal==='task' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
            <div className="mh" style={{background:form.priority==='high'?'#FF82D7':form.priority==='medium'?'#FFEB5A':'#EBEBEB'}}><div className="mt">{form.id ? 'Modifier la tâche' : 'Nouvelle tâche'}</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} /></div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Assignée à</label><select className="inp sel" value={form.assignee||'emy'} onChange={e=>setForm({...form,assignee:e.target.value})}><option value="emy">Emy</option><option value="edward">Edward</option></select></div>
                <div className="fg"><label className="lbl">Deadline</label><input type="date" className="inp" value={form.deadline||''} onChange={e=>setForm({...form,deadline:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Priorité</label><select className="inp sel" value={form.priority||'medium'} onChange={e=>setForm({...form,priority:e.target.value})}><option value="high">🔴 Haute</option><option value="medium">🟡 Moyenne</option><option value="low">🟢 Basse</option></select></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'todo'} onChange={e=>setForm({...form,status:e.target.value})}>{(Object.entries(TASK_S) as any[]).map(([=><option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div className="fg"><label className="lbl">Description</label><textarea className="inp" style={{minHeight:60}} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} /></div>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div className="lbl" style={{margin:0}}>☑ Sous-tâches</div>
                  <button className="btn btn-y btn-sm" onClick={() => setForm({...form,checklist:[...(form.checklist||[]),'']})}>+ Ajouter</button>
                </div>
                {(form.checklist||[]).map((item,i) => (
                  <div key={i} style={{display:'flex',gap:6,marginBottom:5,alignItems:'center'}}>
                    <input type="checkbox" style={{width:16,height:16,flexShrink:0}} />
                    <input className="inp" value={item} onChange={e=>{const c=[...(form.checklist||[])];c[i]=e.target.value;setForm({...form,checklist:c})}} placeholder={'Sous-tâche '+(i+1)} style={{fontSize:12,padding:'5px 8px'}} />
                    <button className="btn btn-sm btn-red" onClick={() => setForm({...form,checklist:(form.checklist||[]).filter((_,j)=>j!==i)})}>✕</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={() => {setTasks(prev=>prev.filter(x=>x.id!==form.id));closeModal();toast('Supprimé')}}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveTask}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT */}
      {modal==='contact' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouveau contact'}</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.cat||'food'} onChange={e=>setForm({...form,cat:e.target.value})}>{(Object.entries(CAT_ANN) as any[]).map(([=><option key={k} value={k}>{v}</option>)}</select></div>
                <div className="fg" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" checked={!!form.vip} onChange={e=>setForm({...form,vip:e.target.checked})} style={{width:16,height:16}} /><span style={{fontSize:12}}>VIP ⭐</span></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Nom *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Contact</label><input className="inp" value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={() => {setContacts(prev=>prev.filter(x=>x.id!==form.id));closeModal();toast('Supprimé')}}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveContact}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {/* VAULT EDIT */}
      {modal==='vault' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouvel accès'} 🔐</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} /></div>
                <div className="fg"><label className="lbl">URL</label><input className="inp" value={form.url||''} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://…" /></div>
                <div className="fg"><label className="lbl">Identifiant</label><input className="inp" value={form.user||''} onChange={e=>setForm({...form,user:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Mot de passe</label><input type="password" className="inp" value={form.pw||''} onChange={e=>setForm({...form,pw:e.target.value})} /></div>
              </div>
            </div>
            <div className="mf">
              {form.id && <button className="btn btn-red" onClick={() => {setVault(prev=>prev.filter(x=>x.id!==form.id));closeModal();toast('Supprimé')}}>Supprimer</button>}
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveVault}>Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {/* CR */}
      {modal==='cr' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="mh"><div className="mt">Compte-rendu hebdomadaire</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Semaine du *</label><input className="inp" value={form.week||''} onChange={e=>setForm({...form,week:e.target.value})} placeholder="ex: 25 mars 2026" /></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                {[['prospects','Prospects'],['rdv','RDV'],['cmds','Commandes']].map(([k,l]) => (
                  <div key={k} className="fg"><label className="lbl">{l}</label><input type="number" className="inp" value={form[k]||0} onChange={e=>setForm({...form,[k]:parseInt(e.target.value)||0})} /></div>
                ))}
              </div>
              <div className="fg"><label className="lbl">✅ Victoires</label><textarea className="inp" value={form.wins||''} onChange={e=>setForm({...form,wins:e.target.value})} placeholder="Ce que j'ai accompli…" /></div>
              <div className="fg"><label className="lbl">⚡ Challenges</label><textarea className="inp" value={form.challenges||''} onChange={e=>setForm({...form,challenges:e.target.value})} placeholder="Blocages rencontrés…" /></div>
              <div className="fg"><label className="lbl">🎯 Priorités S+1</label><textarea className="inp" value={form.next||''} onChange={e=>setForm({...form,next:e.target.value})} placeholder="Mes 3 priorités…" /></div>
              <div className="fg"><label className="lbl">💬 Note pour Edward</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            </div>
            <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={submitCR}>📤 Soumettre à Edward</button></div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={"toast"+(toastMsg?' show':'')}>{toastMsg}</div>
    </div>
  )
}
