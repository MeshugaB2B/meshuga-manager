'use client' // build-fix
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
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:rgba(25,25,35,.7);border:2px solid transparent;transition:all .1s;margin-bottom:1px}
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
.btn-y{background:#FFEB5A}.btn-p{background:#FF82D7}.btn-n{background:#FF82D7;color:#191923}.btn-g{background:#009D3A;color:#FFFFFF}.btn-b{background:#005FFF;color:#FFFFFF}.btn-red{background:#CC0066;color:#FFFFFF}
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
  {id:'ev01',cat:'evenementiel',name:'Moon Event',contact:'Direction commerciale',phone:'01 40 00 00 00',email:'contact@moon-event.fr',site:'moon-event.fr',linkedin:'',taille:'10-50',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:0,type:'Catering corporate',pitch:'200 events/an. Reference nationale events.',status:'to_contact',score:10,contacted:false},
  {id:'ev02',cat:'evenementiel',name:'Hopscotch Groupe',contact:'Direction commerciale',phone:'01 58 65 00 72',email:'contact@hopscotch.fr',site:'hopscotch.fr',linkedin:'',taille:'200+',arrondissement:'Paris 11e',valeur_event:5000,valeur_mois:0,type:'Catering congres',pitch:'Groupe evenementiel majeur. Congres corporate.',status:'to_contact',score:10,contacted:false},
  {id:'ev03',cat:'evenementiel',name:'GL Events Paris',contact:'Direction traiteur',phone:'01 46 08 19 19',email:'paris@gl-events.com',site:'gl-events.com',linkedin:'',taille:'500+',arrondissement:'Paris 15e',valeur_event:8000,valeur_mois:0,type:'Sous-traitance traiteur',pitch:'Geant mondial. Gere Parc des Expos.',status:'to_contact',score:10,contacted:false},
  {id:'ev04',cat:'evenementiel',name:'Publicis Events',contact:'Head of Operations',phone:'01 44 43 70 00',email:'events@publicisevents.fr',site:'publicisevents.fr',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:6000,valeur_mois:0,type:'Catering seminaires',pitch:'Filiale Publicis. Events corporate premium.',status:'to_contact',score:10,contacted:false},
  {id:'ev05',cat:'evenementiel',name:'Havas Events',contact:'Direction production',phone:'01 58 47 90 00',email:'contact@havasevents.fr',site:'havasevents.fr',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering lancements',pitch:'Groupe Havas. 300+ events/an.',status:'to_contact',score:9,contacted:false},
  {id:'ev06',cat:'evenementiel',name:'Auditoire',contact:'Direction generale',phone:'01 40 13 50 00',email:'contact@auditoire.fr',site:'auditoire.fr',linkedin:'',taille:'100-200',arrondissement:'Paris 17e',valeur_event:4000,valeur_mois:0,type:'Catering conventions',pitch:'Reference conventions haut de gamme.',status:'to_contact',score:9,contacted:false},
  {id:'ev07',cat:'evenementiel',name:'Comexposium',contact:'Responsable F&B',phone:'01 76 77 11 11',email:'contact@comexposium.com',site:'comexposium.com',linkedin:'',taille:'500+',arrondissement:'Paris 17e',valeur_event:10000,valeur_mois:0,type:'Catering salons',pitch:'135 salons/an dont SIAL et FIAC.',status:'to_contact',score:10,contacted:false},
  {id:'ev08',cat:'evenementiel',name:'Reed Expositions',contact:'Directeur general',phone:'01 47 56 50 00',email:'contact@reedexpo.fr',site:'reedexpo.fr',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:8000,valeur_mois:0,type:'Catering congres',pitch:'Organisateur MIPIM, TFWA, NRF.',status:'to_contact',score:10,contacted:false},
  {id:'ev09',cat:'evenementiel',name:'Viparis',contact:'Direction F&B',phone:'01 40 68 22 22',email:'contact@viparis.com',site:'viparis.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:15000,valeur_mois:0,type:'Partenariat traiteur',pitch:'Exploitant Palais des Congres, Grand Palais.',status:'to_contact',score:10,contacted:false},
  {id:'ev10',cat:'evenementiel',name:'Wato',contact:'Directeur production',phone:'01 55 26 87 00',email:'contact@wato.fr',site:'wato.fr',linkedin:'',taille:'50-200',arrondissement:'Paris 10e',valeur_event:4000,valeur_mois:0,type:'Catering experientiels',pitch:'Agence pionniere events. Clients LVMH, Google.',status:'to_contact',score:9,contacted:false},
  {id:'ev11',cat:'evenementiel',name:'Babel Events',contact:'Direction artistique',phone:'01 53 32 26 20',email:'hello@babel.fr',site:'babel.fr',linkedin:'',taille:'50-100',arrondissement:'Paris 9e',valeur_event:3500,valeur_mois:0,type:'Catering culturels',pitch:'Agence creative. Events mode, culture, luxe.',status:'to_contact',score:9,contacted:false},
  {id:'ev12',cat:'evenementiel',name:'Leo Events',contact:'Chargee de production',phone:'01 42 33 00 00',email:'contact@leoevents.fr',site:'leoevents.fr',linkedin:'',taille:'10-50',arrondissement:'Paris 2e',valeur_event:2500,valeur_mois:0,type:'Catering galas',pitch:'Specialiste galas et soirees de prestige.',status:'to_contact',score:8,contacted:false},
  {id:'ev13',cat:'evenementiel',name:'MCI France',contact:'Direction F&B',phone:'01 53 85 82 00',email:'paris@mci-group.com',site:'mci-group.com',linkedin:'',taille:'200+',arrondissement:'Paris 9e',valeur_event:6000,valeur_mois:0,type:'Catering congres medicaux',pitch:'Leader congres medicaux. Gros budgets.',status:'to_contact',score:9,contacted:false},
  {id:'ev14',cat:'evenementiel',name:'BETC Events',contact:'Head of Production',phone:'01 49 10 60 00',email:'events@betc.fr',site:'betc.fr',linkedin:'',taille:'200+',arrondissement:'Paris 10e',valeur_event:5000,valeur_mois:0,type:'Catering conferences',pitch:'Filiale BETC. Events pour grands clients pub.',status:'to_contact',score:9,contacted:false},
  {id:'ev15',cat:'evenementiel',name:'Wanda Productions',contact:'Direction',phone:'01 43 59 13 13',email:'contact@wanda.fr',site:'wanda.fr',linkedin:'',taille:'50-100',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Catering spectacles',pitch:'Prod theatre et evenementiel.',status:'to_contact',score:7,contacted:false},
  {id:'av01',cat:'avocats',name:'Gide Loyrette Nouel',contact:'Office Manager',phone:'01 40 75 60 00',email:'paris@gide.com',site:'gide.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux dejeuner hebdo',pitch:'Top 5 France. Dejeuners travail quotidiens.',status:'to_contact',score:10,contacted:false},
  {id:'av02',cat:'avocats',name:'Jones Day Paris',contact:'Facilities',phone:'01 56 59 39 39',email:'paris@jonesday.com',site:'jonesday.com',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:750,type:'Plateaux dejeuner',pitch:'Cabinet US. Culture sandwich au bureau.',status:'to_contact',score:9,contacted:false},
  {id:'av03',cat:'avocats',name:'Freshfields Paris',contact:'Facilities Manager',phone:'01 44 56 44 56',email:'paris@freshfields.com',site:'freshfields.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux dejeuner',pitch:'Magic circle. Dejeuner bureau = norme.',status:'to_contact',score:10,contacted:false},
  {id:'av04',cat:'avocats',name:'Linklaters Paris',contact:'Office Manager',phone:'01 56 43 56 43',email:'paris@linklaters.com',site:'linklaters.com',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Plateaux dejeuner',pitch:'Magic circle. Forte culture dejeuner.',status:'to_contact',score:9,contacted:false},
  {id:'av05',cat:'avocats',name:'Clifford Chance Paris',contact:'Facilities',phone:'01 44 05 52 52',email:'paris@cliffordchance.com',site:'cliffordchance.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux dejeuner',pitch:'Magic circle. Repas de travail frequents.',status:'to_contact',score:9,contacted:false},
  {id:'av06',cat:'avocats',name:'Allen Overy Paris',contact:'Office Manager',phone:'01 40 06 54 00',email:'paris@allenovery.com',site:'allenovery.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Magic circle. Tres bon budget F&B.',status:'to_contact',score:9,contacted:false},
  {id:'av07',cat:'avocats',name:'White Case Paris',contact:'Facilities',phone:'01 55 04 58 00',email:'paris@whitecase.com',site:'whitecase.com',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Plateaux dejeuner',pitch:'Cabinet US elite. Culture working lunch.',status:'to_contact',score:9,contacted:false},
  {id:'av08',cat:'avocats',name:'Baker McKenzie Paris',contact:'Office Manager',phone:'01 44 17 53 00',email:'paris@bakermckenzie.com',site:'bakermckenzie.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Cabinet US n1 mondial. Paris hub Europe.',status:'to_contact',score:9,contacted:false},
  {id:'av09',cat:'avocats',name:'Bredin Prat',contact:'Office Manager',phone:'01 44 35 35 35',email:'contact@bredinprat.com',site:'bredinprat.com',linkedin:'',taille:'200+',arrondissement:'Paris 1er',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner et catering AG',pitch:'Top cabinet francais. M&A, prestige.',status:'to_contact',score:10,contacted:false},
  {id:'av10',cat:'avocats',name:'De Pardieu Brocas Maffei',contact:'Facilities',phone:'01 53 57 71 71',email:'contact@depardieu.fr',site:'depardieu.fr',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:700,type:'Plateaux dejeuner',pitch:'Cabinet affaires reference. Clientele CAC40.',status:'to_contact',score:9,contacted:false},
  {id:'av11',cat:'avocats',name:'Latham Watkins Paris',contact:'Facilities',phone:'01 40 62 20 00',email:'paris@lw.com',site:'lw.com',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Cabinet US top 5. Dejeuner bureau = culture.',status:'to_contact',score:9,contacted:false},
  {id:'av12',cat:'avocats',name:'Skadden Paris',contact:'Office Manager',phone:'01 40 75 44 44',email:'paris@skadden.com',site:'skadden.com',linkedin:'',taille:'100+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:700,type:'Plateaux dejeuner',pitch:'Elite US. M&A = repas de travail intenses.',status:'to_contact',score:9,contacted:false},
  {id:'av13',cat:'avocats',name:'Kirkland Ellis Paris',contact:'Office Manager',phone:'01 44 09 46 00',email:'paris@kirkland.com',site:'kirkland.com',linkedin:'',taille:'150+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Cabinet US n1 revenus. PE, M&A.',status:'to_contact',score:9,contacted:false},
  {id:'av14',cat:'avocats',name:'Cleary Gottlieb Paris',contact:'Facilities',phone:'01 40 74 68 00',email:'paris@cgsh.com',site:'cgsh.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Elite US. Tres grosse equipe Paris.',status:'to_contact',score:9,contacted:false},
  {id:'av15',cat:'avocats',name:'CMS Francis Lefebvre',contact:'Office Manager',phone:'01 47 38 55 00',email:'paris@cms-fl.com',site:'cms-fl.com',linkedin:'',taille:'500+',arrondissement:'Neuilly',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Top cabinet droit des affaires.',status:'to_contact',score:9,contacted:false},
  {id:'st01',cat:'startup',name:'Doctolib',contact:'Workplace Manager',phone:'',email:'workplace@doctolib.fr',site:'doctolib.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 10e',valeur_event:3000,valeur_mois:2000,type:'Plateaux dejeuner et catering',pitch:'Licorne francaise. Forte culture dejeuner.',status:'to_contact',score:10,contacted:false},
  {id:'st02',cat:'startup',name:'Alan',contact:'Office Manager',phone:'',email:'hello@alan.com',site:'alan.com',linkedin:'',taille:'300+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Licorne sante. Budget food premium.',status:'to_contact',score:9,contacted:false},
  {id:'st03',cat:'startup',name:'Payfit',contact:'Workplace Manager',phone:'',email:'contact@payfit.com',site:'payfit.com',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Scale-up RH. Recrute = events frequents.',status:'to_contact',score:9,contacted:false},
  {id:'st04',cat:'startup',name:'Qonto',contact:'Office Manager',phone:'',email:'hello@qonto.com',site:'qonto.com',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Licorne fintech. Culture startup premium.',status:'to_contact',score:9,contacted:false},
  {id:'st05',cat:'startup',name:'Contentsquare',contact:'Workplace Manager',phone:'',email:'contact@contentsquare.com',site:'contentsquare.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Licorne analytics. Grande equipe Paris.',status:'to_contact',score:9,contacted:false},
  {id:'st06',cat:'startup',name:'Back Market',contact:'Workplace Manager',phone:'',email:'contact@backmarket.com',site:'backmarket.com',linkedin:'',taille:'700+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Licorne reconditionne. Culture food forte.',status:'to_contact',score:9,contacted:false},
  {id:'st07',cat:'startup',name:'BlaBlaCar',contact:'Office Manager',phone:'',email:'contact@blablacar.com',site:'blablacar.com',linkedin:'',taille:'700+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Licorne historique. Tres grosse equipe.',status:'to_contact',score:9,contacted:false},
  {id:'st08',cat:'startup',name:'Brevo',contact:'Office Manager',phone:'',email:'contact@brevo.com',site:'brevo.com',linkedin:'',taille:'700+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Licorne email marketing. Grande equipe.',status:'to_contact',score:9,contacted:false},
  {id:'st09',cat:'startup',name:'Criteo',contact:'Office Manager',phone:'01 40 40 22 90',email:'contact@criteo.com',site:'criteo.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Cotee NASDAQ. Tres grande equipe Paris.',status:'to_contact',score:9,contacted:false},
  {id:'st10',cat:'startup',name:'Swile',contact:'Workplace Manager',phone:'',email:'hello@swile.co',site:'swile.co',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Specialiste avantages salaries. Connait la food.',status:'to_contact',score:9,contacted:false},
  {id:'st11',cat:'startup',name:'Dataiku',contact:'Workplace Manager',phone:'',email:'contact@dataiku.com',site:'dataiku.com',linkedin:'',taille:'700+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Licorne data. Culture franco-americaine.',status:'to_contact',score:9,contacted:false},
  {id:'st12',cat:'startup',name:'Ledger',contact:'Office Manager',phone:'',email:'contact@ledger.com',site:'ledger.com',linkedin:'',taille:'500+',arrondissement:'Paris 1er',valeur_event:2000,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Crypto tech. Forte levee. Culture premium.',status:'to_contact',score:8,contacted:false},
  {id:'st13',cat:'startup',name:'Station F',contact:'Community Manager',phone:'',email:'business@stationf.co',site:'stationf.co',linkedin:'',taille:'1000+',arrondissement:'Paris 13e',valeur_event:2500,valeur_mois:1500,type:'Catering events et plateaux',pitch:'Plus grand campus startup monde.',status:'to_contact',score:10,contacted:false},
  {id:'st14',cat:'startup',name:'Voodoo',contact:'Office Manager',phone:'',email:'contact@voodoo.io',site:'voodoo.io',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Licorne gaming. Tres bonne culture food.',status:'to_contact',score:9,contacted:false},
  {id:'st15',cat:'startup',name:'ManoMano',contact:'Workplace Manager',phone:'',email:'contact@manomano.com',site:'manomano.com',linkedin:'',taille:'700+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Licorne e-commerce. Grosse equipe.',status:'to_contact',score:8,contacted:false},
  {id:'co01',cat:'conseil',name:'McKinsey Paris',contact:'Office Manager',phone:'01 40 69 16 00',email:'paris@mckinsey.com',site:'mckinsey.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Top 3 mondial. Dejeuners travail = norme.',status:'to_contact',score:10,contacted:false},
  {id:'co02',cat:'conseil',name:'BCG Paris',contact:'Facilities',phone:'01 40 74 45 00',email:'paris@bcg.com',site:'bcg.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Top 3 mondial. Culture tres forte dejeuner.',status:'to_contact',score:10,contacted:false},
  {id:'co03',cat:'conseil',name:'Bain Paris',contact:'Office Manager',phone:'01 44 55 75 75',email:'paris@bain.com',site:'bain.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Top 3 mondial. Budget F&B eleve.',status:'to_contact',score:10,contacted:false},
  {id:'co04',cat:'conseil',name:'Oliver Wyman Paris',contact:'Facilities',phone:'01 45 02 30 00',email:'paris@oliverwyman.com',site:'oliverwyman.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux dejeuner',pitch:'Top strategie. Finance et assurance.',status:'to_contact',score:9,contacted:false},
  {id:'co05',cat:'conseil',name:'Roland Berger Paris',contact:'Office Manager',phone:'01 53 67 03 00',email:'paris@rolandberger.com',site:'rolandberger.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux dejeuner',pitch:'Top europeen. Culture dejeuner de travail.',status:'to_contact',score:9,contacted:false},
  {id:'co06',cat:'conseil',name:'Deloitte Paris',contact:'Office Manager',phone:'01 40 88 28 00',email:'contact@deloitte.fr',site:'deloitte.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Big 4. Tres grosse equipe. Budget important.',status:'to_contact',score:10,contacted:false},
  {id:'co07',cat:'conseil',name:'PwC France',contact:'Facilities',phone:'01 56 57 58 59',email:'contact@pwc.fr',site:'pwc.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Big 4. Tres grosse equipe. Budget eleve.',status:'to_contact',score:10,contacted:false},
  {id:'co08',cat:'conseil',name:'EY France',contact:'Office Manager',phone:'01 46 93 60 00',email:'contact@ey.com',site:'ey.com',linkedin:'',taille:'1000+',arrondissement:'La Defense',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Big 4. Grande equipe Paris.',status:'to_contact',score:9,contacted:false},
  {id:'co09',cat:'conseil',name:'KPMG France',contact:'Facilities',phone:'01 55 68 68 68',email:'contact@kpmg.fr',site:'kpmg.fr',linkedin:'',taille:'1000+',arrondissement:'La Defense',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Big 4. Budget food eleve.',status:'to_contact',score:9,contacted:false},
  {id:'co10',cat:'conseil',name:'Accenture Paris',contact:'Office Manager',phone:'01 53 23 32 50',email:'paris@accenture.com',site:'accenture.com',linkedin:'',taille:'1000+',arrondissement:'Paris 16e',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Top consulting IT. Tres grosse equipe.',status:'to_contact',score:9,contacted:false},
  {id:'co11',cat:'conseil',name:'Wavestone',contact:'Office Manager',phone:'01 78 91 87 00',email:'contact@wavestone.com',site:'wavestone.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Cabinet conseil digital.',status:'to_contact',score:8,contacted:false},
  {id:'co12',cat:'conseil',name:'Sia Partners',contact:'Facilities',phone:'01 40 90 94 46',email:'contact@sia-partners.com',site:'sia-partners.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Cabinet conseil en forte croissance.',status:'to_contact',score:8,contacted:false},
  {id:'co13',cat:'conseil',name:'AlixPartners Paris',contact:'Office Manager',phone:'01 44 21 65 00',email:'paris@alixpartners.com',site:'alixpartners.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Plateaux dejeuner',pitch:'Restructuring advisory. Culture US.',status:'to_contact',score:8,contacted:false},
  {id:'co14',cat:'conseil',name:'Onepoint',contact:'Office Manager',phone:'01 58 30 01 00',email:'contact@groupeonepoint.com',site:'groupeonepoint.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Conseil digital. Tres forte croissance.',status:'to_contact',score:9,contacted:false},
  {id:'co15',cat:'conseil',name:'Kearney Paris',contact:'Facilities',phone:'01 40 16 41 00',email:'paris@kearney.com',site:'kearney.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Plateaux dejeuner',pitch:'Top strategie international.',status:'to_contact',score:8,contacted:false},
  {id:'bk01',cat:'banque',name:'Rothschild Paris',contact:'Office Manager',phone:'01 40 74 40 74',email:'paris@rothschild.com',site:'rothschild.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Banque prestige. Reunions M&A permanentes.',status:'to_contact',score:10,contacted:false},
  {id:'bk02',cat:'banque',name:'Lazard Paris',contact:'Facilities',phone:'01 44 13 01 11',email:'paris@lazard.com',site:'lazard.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner premium',pitch:'Banque conseil M&A prestige.',status:'to_contact',score:10,contacted:false},
  {id:'bk03',cat:'banque',name:'JP Morgan Paris',contact:'Facilities',phone:'01 40 15 60 00',email:'paris@jpmorgan.com',site:'jpmorgan.com',linkedin:'',taille:'500+',arrondissement:'Paris 1er',valeur_event:3500,valeur_mois:1500,type:'Plateaux dejeuner premium',pitch:'Premiere banque monde. Culture US food.',status:'to_contact',score:10,contacted:false},
  {id:'bk04',cat:'banque',name:'Goldman Sachs Paris',contact:'Office Manager',phone:'01 42 25 72 00',email:'paris@gs.com',site:'goldmansachs.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3500,valeur_mois:1500,type:'Plateaux dejeuner premium',pitch:'Elite US. Culture working lunch.',status:'to_contact',score:10,contacted:false},
  {id:'bk05',cat:'banque',name:'BNP Paribas CIB',contact:'Office Manager',phone:'01 42 98 12 34',email:'contact@bnpparibas.com',site:'bnpparibas.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:5000,valeur_mois:2500,type:'Plateaux dejeuner',pitch:'Premiere banque France. Budget food.',status:'to_contact',score:10,contacted:false},
  {id:'bk06',cat:'banque',name:'Societe Generale CIB',contact:'Facilities',phone:'01 42 14 20 00',email:'contact@societegenerale.com',site:'societegenerale.com',linkedin:'',taille:'1000+',arrondissement:'La Defense',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Grande banque francaise.',status:'to_contact',score:9,contacted:false},
  {id:'bk07',cat:'banque',name:'Natixis CIB',contact:'Office Manager',phone:'01 58 55 00 00',email:'contact@natixis.com',site:'natixis.com',linkedin:'',taille:'1000+',arrondissement:'Paris 1er',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Grande banque. Budget food eleve.',status:'to_contact',score:9,contacted:false},
  {id:'bk08',cat:'banque',name:'Ardian',contact:'Office Manager',phone:'01 44 21 74 00',email:'contact@ardian.com',site:'ardian.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux dejeuner premium',pitch:'Top fonds PE europeen. Budget eleve.',status:'to_contact',score:9,contacted:false},
  {id:'bk09',cat:'banque',name:'PAI Partners',contact:'Facilities',phone:'01 43 23 39 00',email:'contact@paipartners.com',site:'paipartners.com',linkedin:'',taille:'100+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Fonds PE top tier. Reunions investisseurs.',status:'to_contact',score:9,contacted:false},
  {id:'bk10',cat:'banque',name:'Eurazeo',contact:'Office Manager',phone:'01 44 15 01 11',email:'contact@eurazeo.com',site:'eurazeo.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux dejeuner',pitch:'Fonds investissement. Grosse equipe Paris.',status:'to_contact',score:8,contacted:false},
  {id:'bk11',cat:'banque',name:'Amundi Asset Management',contact:'Facilities',phone:'01 76 33 30 30',email:'contact@amundi.com',site:'amundi.com',linkedin:'',taille:'1000+',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Premiere societe gestion Europe.',status:'to_contact',score:9,contacted:false},
  {id:'bk12',cat:'banque',name:'BpiFrance',contact:'Office Manager',phone:'01 42 18 60 00',email:'contact@bpifrance.fr',site:'bpifrance.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner et events',pitch:'Banque publique. Nombreux events startups.',status:'to_contact',score:9,contacted:false},
  {id:'bk13',cat:'banque',name:'Tikehau Capital',contact:'Facilities',phone:'01 40 06 39 30',email:'contact@tikehaucapital.com',site:'tikehaucapital.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:900,type:'Plateaux dejeuner',pitch:'Asset management alternatif. Prestige.',status:'to_contact',score:8,contacted:false},
  {id:'bk14',cat:'banque',name:'Morgan Stanley Paris',contact:'Facilities',phone:'01 42 98 09 26',email:'paris@morganstanley.com',site:'morganstanley.com',linkedin:'',taille:'500+',arrondissement:'Paris 1er',valeur_event:3500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Elite US. Budget food premium.',status:'to_contact',score:10,contacted:false},
  {id:'bk15',cat:'banque',name:'Edmond de Rothschild',contact:'Office Manager',phone:'01 40 17 25 25',email:'contact@edmond-de-rothschild.com',site:'edmond-de-rothschild.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux dejeuner premium',pitch:'Gestion privee prestige. Culture gastronomique.',status:'to_contact',score:9,contacted:false},
  {id:'ap01',cat:'agence_pub',name:'BETC',contact:'Direction des operations',phone:'01 49 10 60 00',email:'contact@betc.fr',site:'betc.fr',linkedin:'',taille:'500+',arrondissement:'Paris 10e',valeur_event:5000,valeur_mois:2000,type:'Catering pitchs et events',pitch:'Meilleure agence France. Culture food forte.',status:'to_contact',score:10,contacted:false},
  {id:'ap02',cat:'agence_pub',name:'Publicis Conseil',contact:'Office Manager',phone:'01 44 43 70 00',email:'contact@publicis.fr',site:'publicis.fr',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:1800,type:'Plateaux dejeuner et pitchs',pitch:'Numero 1 mondial. Events permanents.',status:'to_contact',score:10,contacted:false},
  {id:'ap03',cat:'agence_pub',name:'Ogilvy Paris',contact:'Facilities',phone:'01 44 77 70 00',email:'paris@ogilvy.com',site:'ogilvy.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Catering pitchs et seminaires',pitch:'Reference mondiale. Reunions clients.',status:'to_contact',score:9,contacted:false},
  {id:'ap04',cat:'agence_pub',name:'DDB Paris',contact:'Office Manager',phone:'01 56 70 12 00',email:'contact@ddb.fr',site:'ddb.fr',linkedin:'',taille:'300+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:1200,type:'Catering pitchs et events',pitch:'Reference creative. Budget food eleve.',status:'to_contact',score:9,contacted:false},
  {id:'ap05',cat:'agence_pub',name:'TBWA Paris',contact:'Facilities',phone:'01 49 03 60 00',email:'contact@tbwa.fr',site:'tbwa.fr',linkedin:'',taille:'300+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:1200,type:'Catering pitchs et lancements',pitch:'Top reseau mondial. Events frequents.',status:'to_contact',score:9,contacted:false},
  {id:'ap06',cat:'agence_pub',name:'Havas Village Paris',contact:'Office Manager',phone:'01 58 47 90 00',email:'village@havas.com',site:'havas.com',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:2500,type:'Catering events village',pitch:'Tout le groupe Havas reuni. Potentiel enorme.',status:'to_contact',score:10,contacted:false},
  {id:'ap07',cat:'agence_pub',name:'McCann Paris',contact:'Facilities',phone:'01 41 86 20 00',email:'contact@mccann.fr',site:'mccann.fr',linkedin:'',taille:'300+',arrondissement:'Paris 16e',valeur_event:3000,valeur_mois:1200,type:'Catering pitchs et events',pitch:'Top reseau mondial. Reunions clients.',status:'to_contact',score:8,contacted:false},
  {id:'ap08',cat:'agence_pub',name:'Marcel Paris',contact:'Office Manager',phone:'01 44 43 74 00',email:'contact@marcelww.fr',site:'marcelww.fr',linkedin:'',taille:'200+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1000,type:'Catering pitchs creatifs',pitch:'Filiale Publicis. Budget food.',status:'to_contact',score:8,contacted:false},
  {id:'ap09',cat:'agence_pub',name:'We Are Social Paris',contact:'Office Manager',phone:'01 44 77 90 40',email:'paris@wearesocial.com',site:'wearesocial.com',linkedin:'',taille:'200+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:800,type:'Catering pitchs social',pitch:'Leader social media. Culture startup.',status:'to_contact',score:8,contacted:false},
  {id:'ap10',cat:'agence_pub',name:'Buzzman',contact:'Facilities',phone:'01 56 64 02 00',email:'contact@buzzman.fr',site:'buzzman.fr',linkedin:'',taille:'50-100',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:700,type:'Catering pitchs creatifs',pitch:'Meilleure agence digitale France.',status:'to_contact',score:8,contacted:false},
  {id:'ht01',cat:'hotel',name:'Hotel Lutetia',contact:'Directeur F&B',phone:'01 45 44 38 10',email:'reservation@lutetia.com',site:'hotellutetia.com',linkedin:'',taille:'200+',arrondissement:'Paris 6e',valeur_event:4000,valeur_mois:0,type:'Catering events VIP',pitch:'Palace 5 etoiles dans TON arrondissement!',status:'to_contact',score:10,contacted:false},
  {id:'ht02',cat:'hotel',name:'Hotel Le Bristol',contact:'Directeur restauration',phone:'01 53 43 43 00',email:'contact@lebristolparis.com',site:'lebristolparis.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Partenariat traiteur',pitch:'Palace historique. Events VIP permanents.',status:'to_contact',score:9,contacted:false},
  {id:'ht03',cat:'hotel',name:'Four Seasons George V',contact:'Directeur F&B',phone:'01 49 52 70 00',email:'par.reservations@fourseasons.com',site:'fourseasons.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:6000,valeur_mois:0,type:'Catering dejeuners affaires',pitch:'Palace emblematique. Budget premium.',status:'to_contact',score:9,contacted:false},
  {id:'ht04',cat:'hotel',name:'Hotel de Crillon',contact:'Responsable F&B',phone:'01 44 71 15 00',email:'reservation@crillon.com',site:'rosewoodhotels.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering events',pitch:'Palace Rosewood. Events prestige.',status:'to_contact',score:9,contacted:false},
  {id:'ht05',cat:'hotel',name:'Ritz Paris',contact:'Directeur traiteur',phone:'01 43 16 30 30',email:'resa@ritzparis.com',site:'ritzparis.com',linkedin:'',taille:'200+',arrondissement:'Paris 1er',valeur_event:6000,valeur_mois:0,type:'Catering events prestige',pitch:'Palace mythique. Events tres haut de gamme.',status:'to_contact',score:9,contacted:false},
  {id:'ht06',cat:'hotel',name:'Hotel Plaza Athenee',contact:'Directeur F&B',phone:'01 53 67 66 65',email:'reservations@dorchestercollection.com',site:'dorchestercollection.com',linkedin:'',taille:'300+',arrondissement:'Paris 8e',valeur_event:6000,valeur_mois:0,type:'Catering events fashion',pitch:'Palace emblematique. Events mode.',status:'to_contact',score:9,contacted:false},
  {id:'ht07',cat:'hotel',name:'Cheval Blanc Paris',contact:'Directeur F&B',phone:'01 40 28 00 28',email:'paris@chevalblanc.com',site:'chevalblanc.com',linkedin:'',taille:'200+',arrondissement:'Paris 1er',valeur_event:5000,valeur_mois:0,type:'Catering events LVMH',pitch:'Palace LVMH. Events mode et luxe.',status:'to_contact',score:9,contacted:false},
  {id:'ht08',cat:'hotel',name:'Mandarin Oriental Paris',contact:'Responsable F&B',phone:'01 70 98 78 88',email:'mopar@mohg.com',site:'mandarinoriental.com',linkedin:'',taille:'200+',arrondissement:'Paris 1er',valeur_event:5000,valeur_mois:0,type:'Catering events',pitch:'Palace. Clientele internationale.',status:'to_contact',score:8,contacted:false},
  {id:'ht09',cat:'hotel',name:'Hotel Bel Ami',contact:'Responsable',phone:'01 42 61 53 53',email:'contact@hotel-bel-ami.com',site:'hotel-bel-ami.com',linkedin:'',taille:'50-100',arrondissement:'Paris 6e',valeur_event:2000,valeur_mois:0,type:'Partenariat dejeuner',pitch:'Hotel 5 etoiles dans TON arrondissement!',status:'to_contact',score:8,contacted:false},
  {id:'ht10',cat:'hotel',name:'Hoxton Paris',contact:'Direction F&B',phone:'01 85 65 75 00',email:'paris@thehoxton.com',site:'thehoxton.com',linkedin:'',taille:'100+',arrondissement:'Paris 2e',valeur_event:2000,valeur_mois:0,type:'Catering events communaute',pitch:'Hotel trendy. Events startup et creatifs.',status:'to_contact',score:8,contacted:false},
  {id:'in01',cat:'institution',name:'Mairie de Paris 6e',contact:'Responsable protocole',phone:'01 40 46 40 46',email:'mairie06@paris.fr',site:'mairie06.paris.fr',linkedin:'',taille:'100+',arrondissement:'Paris 6e',valeur_event:1500,valeur_mois:400,type:'Catering ceremonies et voeux',pitch:'TA MAIRIE! Proximite parfaite avec Meshuga.',status:'to_contact',score:10,contacted:false},
  {id:'in02',cat:'institution',name:'Sciences Po Paris',contact:'Direction evenements',phone:'01 45 49 50 50',email:'events@sciencespo.fr',site:'sciencespo.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 7e',valeur_event:3000,valeur_mois:0,type:'Catering conferences',pitch:'2 min de Meshuga. Conferences permanentes.',status:'to_contact',score:10,contacted:false},
  {id:'in03',cat:'institution',name:'Senat',contact:'Direction des services',phone:'01 42 34 20 00',email:'contact@senat.fr',site:'senat.fr',linkedin:'',taille:'500+',arrondissement:'Paris 6e',valeur_event:3000,valeur_mois:0,type:'Catering ceremonies',pitch:'A 5 min! Receptions officielles.',status:'to_contact',score:10,contacted:false},
  {id:'in04',cat:'institution',name:'INSEAD Paris',contact:'Direction evenements',phone:'01 60 72 40 00',email:'events@insead.edu',site:'insead.edu',linkedin:'',taille:'500+',arrondissement:'Paris 7e',valeur_event:3000,valeur_mois:0,type:'Catering events alumni',pitch:'Campus Paris INSEAD. Alumni events premium.',status:'to_contact',score:9,contacted:false},
  {id:'in05',cat:'institution',name:'Louvre',contact:'Direction accueil',phone:'01 40 20 50 50',email:'contact@louvre.fr',site:'louvre.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 1er',valeur_event:4000,valeur_mois:0,type:'Catering vernissages et events',pitch:'Musee n1 monde. Vernissages et events VIP.',status:'to_contact',score:9,contacted:false},
  {id:'in06',cat:'institution',name:'Fondation Louis Vuitton',contact:'Direction evenements',phone:'01 40 69 96 00',email:'contact@fondationlouisvuitton.fr',site:'fondationlouisvuitton.fr',linkedin:'',taille:'200+',arrondissement:'Paris 16e',valeur_event:4000,valeur_mois:0,type:'Catering vernissages et events',pitch:'Fondation LVMH. Events art contemporain.',status:'to_contact',score:9,contacted:false},
  {id:'in07',cat:'institution',name:'Centre Pompidou',contact:'Direction mecenat',phone:'01 44 78 12 33',email:'contact@centrepompidou.fr',site:'centrepompidou.fr',linkedin:'',taille:'500+',arrondissement:'Paris 4e',valeur_event:3000,valeur_mois:0,type:'Catering vernissages',pitch:'Musee art moderne. Vernissages frequents.',status:'to_contact',score:8,contacted:false},
  {id:'in08',cat:'institution',name:'Assemblee Nationale',contact:'Direction protocole',phone:'01 40 63 60 00',email:'contact@assemblee-nationale.fr',site:'assemblee-nationale.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 7e',valeur_event:4000,valeur_mois:0,type:'Catering ceremonies',pitch:'Institution majeure. Receptions officielles.',status:'to_contact',score:9,contacted:false},
  {id:'in09',cat:'institution',name:'BpiFrance Events',contact:'Direction',phone:'01 42 18 60 00',email:'events@bpifrance.fr',site:'bpifrance.fr',linkedin:'',taille:'500+',arrondissement:'Paris 15e',valeur_event:2500,valeur_mois:0,type:'Catering events startups',pitch:'BpiFrance. Nombreux events ecosysteme.',status:'to_contact',score:9,contacted:false},
  {id:'in10',cat:'institution',name:'Opera de Paris',contact:'Direction traiteur',phone:'08 92 89 90 90',email:'contact@operadeparis.fr',site:'operadeparis.fr',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:4000,valeur_mois:0,type:'Catering galas et evenements',pitch:'Opera. Galas de prestige.',status:'to_contact',score:9,contacted:false},
  {id:'lx01',cat:'luxe',name:'YSL Kering',contact:'Direction events',phone:'01 42 36 22 22',email:'events@ysl.com',site:'ysl.com',linkedin:'',taille:'500+',arrondissement:'Paris 6e',valeur_event:5000,valeur_mois:0,type:'Catering events mode',pitch:'YSL siege Paris 6e! Defiles et lancements.',status:'to_contact',score:10,contacted:false},
  {id:'lx02',cat:'luxe',name:'LVMH Siege',contact:'Direction F&B',phone:'01 44 13 22 22',email:'contact@lvmh.com',site:'lvmh.com',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:6000,valeur_mois:0,type:'Catering board et events',pitch:'Siege leader mondial luxe.',status:'to_contact',score:10,contacted:false},
  {id:'lx03',cat:'luxe',name:'Kering Siege',contact:'Direction F&B',phone:'01 45 64 61 00',email:'contact@kering.com',site:'kering.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Catering reunions groupe',pitch:'Siege Kering. Board et events groupe.',status:'to_contact',score:9,contacted:false},
  {id:'lx04',cat:'luxe',name:'Dior',contact:'Direction evenements',phone:'01 40 73 54 44',email:'contact@dior.com',site:'dior.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering defiles et events',pitch:'Maison Dior. Defiles haute couture.',status:'to_contact',score:9,contacted:false},
  {id:'lx05',cat:'luxe',name:'Hermes',contact:'Direction protocole',phone:'01 40 17 47 17',email:'contact@hermes.com',site:'hermes.com',linkedin:'',taille:'500+',arrondissement:'Paris 6e',valeur_event:5000,valeur_mois:0,type:'Catering events Paris 6e',pitch:'Hermes siege. Proches Meshuga!',status:'to_contact',score:9,contacted:false},
  {id:'lx06',cat:'luxe',name:'Chanel',contact:'Direction evenements',phone:'01 44 50 70 00',email:'contact@chanel.com',site:'chanel.com',linkedin:'',taille:'500+',arrondissement:'Paris 1er',valeur_event:5000,valeur_mois:0,type:'Catering defiles',pitch:'Chanel. Defiles haute couture.',status:'to_contact',score:9,contacted:false},
  {id:'lx07',cat:'luxe',name:'Louis Vuitton',contact:'Direction protocole',phone:'01 55 80 30 00',email:'contact@louisvuitton.com',site:'louisvuitton.com',linkedin:'',taille:'500+',arrondissement:'Paris 1er',valeur_event:5000,valeur_mois:0,type:'Catering events flagship',pitch:'LV. Events maison et boutique.',status:'to_contact',score:9,contacted:false},
  {id:'lx08',cat:'luxe',name:'L Oreal Siege',contact:'Direction F&B',phone:'01 47 56 70 00',email:'contact@loreal.com',site:'loreal.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:5000,valeur_mois:2000,type:'Catering reunions et events',pitch:'Siege L Oreal. Tres grosse equipe.',status:'to_contact',score:9,contacted:false},
  {id:'lx09',cat:'luxe',name:'Jacquemus',contact:'Direction events',phone:'',email:'contact@jacquemus.com',site:'jacquemus.com',linkedin:'',taille:'100+',arrondissement:'Paris 2e',valeur_event:3000,valeur_mois:0,type:'Catering events defiles iconiques',pitch:'Jacquemus. Events tres mediatises.',status:'to_contact',score:9,contacted:false},
  {id:'lx10',cat:'luxe',name:'Pernod Ricard Siege',contact:'Direction F&B',phone:'01 41 00 41 00',email:'contact@pernod-ricard.com',site:'pernod-ricard.com',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:2000,type:'Catering events et reunions',pitch:'Pernod Ricard. Culture food et drinks.',status:'to_contact',score:9,contacted:false},
  {id:'md01',cat:'medias',name:'Konbini',contact:'Direction events',phone:'',email:'contact@konbini.com',site:'konbini.com',linkedin:'',taille:'100+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:0,type:'Catering events culturels',pitch:'Konbini = presse Meshuga! Double interet fort.',status:'to_contact',score:10,contacted:false},
  {id:'md02',cat:'medias',name:'Telerama',contact:'Direction',phone:'01 57 28 20 00',email:'contact@telerama.fr',site:'telerama.fr',linkedin:'',taille:'200+',arrondissement:'Paris 13e',valeur_event:2000,valeur_mois:0,type:'Catering evenements culturels',pitch:'Telerama = presse Meshuga! Festivals.',status:'to_contact',score:9,contacted:false},
  {id:'md03',cat:'medias',name:'Grazia France',contact:'Direction',phone:'01 41 33 50 00',email:'contact@grazia.fr',site:'grazia.fr',linkedin:'',taille:'100+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Catering events mode',pitch:'Grazia = presse Meshuga! Events mode.',status:'to_contact',score:9,contacted:false},
  {id:'md04',cat:'medias',name:'Do It In Paris',contact:'Direction events',phone:'',email:'contact@doitinparis.com',site:'doitinparis.com',linkedin:'',taille:'50-100',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Partenariat contenu',pitch:'Do It In Paris = presse Meshuga!',status:'to_contact',score:10,contacted:false},
  {id:'md05',cat:'medias',name:'Magazine Acumen',contact:'Direction',phone:'',email:'contact@acumen-magazine.fr',site:'acumen-magazine.fr',linkedin:'',taille:'10-50',arrondissement:'Paris 9e',valeur_event:1000,valeur_mois:0,type:'Partenariat contenu',pitch:'Acumen = presse Meshuga! Partenaire naturel.',status:'to_contact',score:9,contacted:false},
  {id:'md06',cat:'medias',name:'Les Echos Events',contact:'Direction evenements',phone:'01 49 53 65 65',email:'events@lesechos.fr',site:'lesechos.fr',linkedin:'',taille:'500+',arrondissement:'Paris 1er',valeur_event:2500,valeur_mois:0,type:'Catering conferences',pitch:'Les Echos Events = 100+ conferences/an!',status:'to_contact',score:9,contacted:false},
  {id:'md07',cat:'medias',name:'Vogue France',contact:'Direction events',phone:'01 53 43 60 00',email:'contact@vogue.fr',site:'vogue.fr',linkedin:'',taille:'100+',arrondissement:'Paris 1er',valeur_event:3000,valeur_mois:0,type:'Catering events mode',pitch:'Vogue = prestige absolu. Dejeuners mode.',status:'to_contact',score:9,contacted:false},
  {id:'md08',cat:'medias',name:'Canal Plus',contact:'Direction F&B',phone:'01 44 25 10 00',email:'contact@canalplus.com',site:'canalplus.com',linkedin:'',taille:'1000+',arrondissement:'Paris 15e',valeur_event:4000,valeur_mois:0,type:'Catering tournages et events',pitch:'Canal+. Series et events premium.',status:'to_contact',score:9,contacted:false},
  {id:'md09',cat:'medias',name:'Le Monde Events',contact:'Direction evenements',phone:'01 57 28 20 00',email:'contact@lemonde.fr',site:'lemonde.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 13e',valeur_event:3000,valeur_mois:0,type:'Catering conferences',pitch:'Quotidien reference. Conferences Le Monde.',status:'to_contact',score:8,contacted:false},
  {id:'md10',cat:'medias',name:'Conde Nast France',contact:'Direction events',phone:'01 53 43 60 00',email:'contact@condenast.fr',site:'condenast.fr',linkedin:'',taille:'300+',arrondissement:'Paris 1er',valeur_event:3000,valeur_mois:0,type:'Catering events mode',pitch:'Conde Nast. Vogue, GQ. Events mode.',status:'to_contact',score:9,contacted:false},
  {id:'tc01',cat:'tech',name:'Google France',contact:'Workplace Manager',phone:'01 42 68 53 00',email:'paris@google.com',site:'google.fr',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Catering et plateaux dejeuner',pitch:'Culture food americaine tres forte.',status:'to_contact',score:10,contacted:false},
  {id:'tc02',cat:'tech',name:'Meta France',contact:'Office Manager',phone:'01 73 29 00 00',email:'paris@meta.com',site:'meta.com',linkedin:'',taille:'300+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Meta. Culture US. Gros budget food.',status:'to_contact',score:9,contacted:false},
  {id:'tc03',cat:'tech',name:'Microsoft France',contact:'Facilities',phone:'01 57 75 80 00',email:'paris@microsoft.com',site:'microsoft.com',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Microsoft. Tres grosse equipe.',status:'to_contact',score:9,contacted:false},
  {id:'tc04',cat:'tech',name:'Salesforce France',contact:'Workplace Manager',phone:'01 40 55 28 00',email:'paris@salesforce.com',site:'salesforce.com',linkedin:'',taille:'500+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner et events',pitch:'Salesforce. Events Dreamforce frequents.',status:'to_contact',score:9,contacted:false},
  {id:'tc05',cat:'tech',name:'Amazon France',contact:'Office Manager',phone:'01 53 63 00 00',email:'paris@amazon.com',site:'amazon.fr',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Amazon. Grosse equipe Paris.',status:'to_contact',score:9,contacted:false},
  {id:'tc06',cat:'tech',name:'Ubisoft',contact:'Workplace Manager',phone:'01 56 01 06 70',email:'contact@ubisoft.com',site:'ubisoft.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Plateaux dejeuner et events',pitch:'Ubisoft. Culture startup gaming.',status:'to_contact',score:9,contacted:false},
  {id:'tc07',cat:'tech',name:'Apple France',contact:'Office Manager',phone:'01 44 20 00 00',email:'paris@apple.com',site:'apple.com',linkedin:'',taille:'300+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Apple. Culture premium. Budget eleve.',status:'to_contact',score:8,contacted:false},
  {id:'tc08',cat:'tech',name:'IBM France',contact:'Facilities',phone:'01 49 05 70 00',email:'paris@ibm.com',site:'ibm.com',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'IBM. Grosse equipe. Budget food.',status:'to_contact',score:8,contacted:false},
  {id:'tc09',cat:'tech',name:'Murex',contact:'Workplace Manager',phone:'01 53 45 18 00',email:'contact@murex.com',site:'murex.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner',pitch:'Murex. Fintech B2B. Grosse equipe Paris.',status:'to_contact',score:8,contacted:false},
  {id:'tc10',cat:'tech',name:'Dassault Systemes',contact:'Office Manager',phone:'01 61 62 61 62',email:'contact@3ds.com',site:'3ds.com',linkedin:'',taille:'1000+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:1500,type:'Plateaux dejeuner et events',pitch:'Dassault Systemes. Innovation tech.',status:'to_contact',score:8,contacted:false},
  {id:'cw01',cat:'coworking',name:'WeWork Paris 9e',contact:'Community Manager',phone:'',email:'paris9@wework.com',site:'wework.com',linkedin:'',taille:'200+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1000,type:'Catering events membres',pitch:'WeWork. Tres nombreux events membres.',status:'to_contact',score:9,contacted:false},
  {id:'cw02',cat:'coworking',name:'WeWork Champs-Elysees',contact:'Community Manager',phone:'',email:'parisCE@wework.com',site:'wework.com',linkedin:'',taille:'200+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:1000,type:'Catering events premium',pitch:'WeWork premium. Clientele corporate.',status:'to_contact',score:9,contacted:false},
  {id:'cw03',cat:'coworking',name:'NUMA Paris',contact:'Direction',phone:'01 40 13 05 00',email:'contact@numa.co',site:'numa.co',linkedin:'',taille:'100+',arrondissement:'Paris 2e',valeur_event:1500,valeur_mois:700,type:'Catering events startup',pitch:'NUMA. Incubateur. Events startup.',status:'to_contact',score:8,contacted:false},
  {id:'cw04',cat:'coworking',name:'Kwerk',contact:'Community Manager',phone:'01 84 16 84 16',email:'contact@kwerk.fr',site:'kwerk.fr',linkedin:'',taille:'100+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Catering events',pitch:'Kwerk. Coworking haut de gamme.',status:'to_contact',score:8,contacted:false},
  {id:'cw05',cat:'coworking',name:'JLL France',contact:'Office Manager',phone:'01 40 55 15 15',email:'contact@jll.com',site:'jll.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Catering events immobiliers',pitch:'JLL. Reseau brokers. Events clients.',status:'to_contact',score:8,contacted:false},
  {id:'cw06',cat:'coworking',name:'CBRE France',contact:'Office Manager',phone:'01 53 64 36 36',email:'contact@cbre.fr',site:'cbre.fr',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Catering events immobiliers',pitch:'CBRE. Premier broker mondial.',status:'to_contact',score:8,contacted:false},
  {id:'cw07',cat:'coworking',name:'Paris Co',contact:'Direction',phone:'01 70 22 20 40',email:'contact@parisnco.fr',site:'parisnco.fr',linkedin:'',taille:'100+',arrondissement:'Paris 13e',valeur_event:1500,valeur_mois:700,type:'Catering events startup',pitch:'Paris Co. Incubateur public. Events.',status:'to_contact',score:7,contacted:false},
  {id:'cw08',cat:'coworking',name:'Morning Coworking',contact:'Direction',phone:'01 84 80 00 00',email:'contact@morning.fr',site:'morning.fr',linkedin:'',taille:'100+',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:700,type:'Catering events membres',pitch:'Morning. Reseau coworking parisien.',status:'to_contact',score:7,contacted:false},
  {id:'cw09',cat:'coworking',name:'Nextdoor Paris',contact:'Community Manager',phone:'',email:'contact@nextdoor.fr',site:'nextdoor.fr',linkedin:'',taille:'100+',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:700,type:'Catering events',pitch:'Nextdoor Bouygues. Coworking premium.',status:'to_contact',score:7,contacted:false},
  {id:'cw10',cat:'coworking',name:'Deskeo',contact:'Direction',phone:'01 84 25 00 00',email:'contact@deskeo.com',site:'deskeo.com',linkedin:'',taille:'100+',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:700,type:'Catering events',pitch:'Deskeo. Flex office en croissance.',status:'to_contact',score:7,contacted:false},
  {id:'me01',cat:'medical',name:'Sanofi Paris',contact:'Office Manager',phone:'01 53 77 40 00',email:'contact@sanofi.com',site:'sanofi.com',linkedin:'',taille:'1000+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:2000,type:'Plateaux dejeuner',pitch:'Sanofi. Siege Paris. Grosse equipe.',status:'to_contact',score:9,contacted:false},
  {id:'me02',cat:'medical',name:'Pfizer France',contact:'Office Manager',phone:'01 58 07 30 00',email:'paris@pfizer.com',site:'pfizer.com',linkedin:'',taille:'500+',arrondissement:'Paris 17e',valeur_event:2500,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Pfizer. Leader mondial. Budget eleve.',status:'to_contact',score:8,contacted:false},
  {id:'me03',cat:'medical',name:'Roche France',contact:'Office Manager',phone:'01 47 61 40 00',email:'paris@roche.com',site:'roche.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Roche. Biotech et pharma.',status:'to_contact',score:8,contacted:false},
  {id:'me04',cat:'medical',name:'Novartis France',contact:'Facilities',phone:'01 55 47 60 00',email:'paris@novartis.com',site:'novartis.com',linkedin:'',taille:'500+',arrondissement:'Paris 10e',valeur_event:2500,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Novartis. Grande equipe Paris.',status:'to_contact',score:8,contacted:false},
  {id:'me05',cat:'medical',name:'Servier',contact:'Office Manager',phone:'01 55 72 60 00',email:'contact@servier.com',site:'servier.com',linkedin:'',taille:'500+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1200,type:'Plateaux dejeuner',pitch:'Servier. Labos francais independant.',status:'to_contact',score:8,contacted:false},
  // AGENCES PUB
  {id:'pub01',cat:'agence_pub',name:'TBWA Paris',contact:'Office Manager',phone:'01 53 49 10 00',email:'contact@tbwa.com',site:'tbwa.fr',taille:'300',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Plateaux repas equipes & events clients',pitch:'Agence creative premium - equipes qui bossent tard, clients qui se regalent sur place. Meshuga = upgrade du plateau banal.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/tbwa-paris'},
  {id:'pub02',cat:'agence_pub',name:'Havas Paris',contact:'Facilities Manager',phone:'01 58 47 90 00',email:'contact@havas.com',site:'havas.com',taille:'400',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Plateaux repas & events Havas Village',pitch:'Havas Village = concentration d agences. Fort potentiel multi-equipes. Meshuga = option traiteur premium recurrente.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/havas'},
  {id:'pub03',cat:'agence_pub',name:'Publicis Conseil',contact:'Facilities Manager',phone:'01 44 43 70 00',email:'contact@publicis.com',site:'publicisgroupe.com',taille:'500',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Plateaux repas & events internes',pitch:'Publicis = hundreds of employees, client shows permanents. Meshuga = le traiteur qui impressionne les clients CAC40.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/publicis'},
  {id:'pub04',cat:'agence_pub',name:'Ogilvy Paris',contact:'Office Manager',phone:'01 53 96 20 00',email:'contact@ogilvy.com',site:'ogilvy.com',taille:'200',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners creatifs & client presentations',pitch:'Ogilvy = obsession du detail creatif. Nos sandwichs gastronomiques matchent parfaitement avec leur exigence qualite.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/ogilvy'},
  // HOTELS
  {id:'hot01',cat:'hotel',name:'Hotel Lutetia',contact:'F&B Manager',phone:'01 45 44 38 10',email:'fbmanager@lutetia.com',site:'hotellutetia.com',taille:'300',arrondissement:'Paris 6e',valeur_event:4000,valeur_mois:0,type:'Animations food & plateaux guests VIP',pitch:'Lutetia = voisin direct Paris 6e. Clientele internationale cherche authenticite locale. Meshuga = le deli NY a 5 minutes a pied.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/hotel-lutetia'},
  {id:'hot02',cat:'hotel',name:'Hotel Madison',contact:'Direction',phone:'01 40 51 60 00',email:'contact@hotel-madison.com',site:'hotel-madison.com',taille:'60',arrondissement:'Paris 6e',valeur_event:1200,valeur_mois:0,type:'Room service premium & events guests',pitch:'Hotel boutique Paris 6e - clientele CSP+++ internationale. Meshuga = experience food authentique a proposer aux guests.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot03',cat:'hotel',name:'Hotel Recamier',contact:'Direction',phone:'01 43 26 04 89',email:'contact@hotelrecamier.com',site:'hotelrecamier.com',taille:'30',arrondissement:'Paris 6e',valeur_event:800,valeur_mois:0,type:'Partenariat food & recommandations guests',pitch:'Place Saint-Sulpice - Paris 6e au coeur. Clientele internationale raffinee. Recommandation Meshuga = valeur ajoutee concierge.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // INSTITUTIONS
  {id:'ins01',cat:'institution',name:'Senat',contact:'Direction des services',phone:'01 42 34 20 00',email:'communication@senat.fr',site:'senat.fr',taille:'2000',arrondissement:'Paris 6e',valeur_event:5000,valeur_mois:0,type:'Cocktails dinatoires & events institutionnels',pitch:'Le Senat = voisin direct Paris 6e. Evenements institutionnels reguliers, receptions, visites officielles. Meshuga = le deli de reference du quartier.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins02',cat:'institution',name:'Sciences Po Paris',contact:'Events Manager',phone:'01 45 49 50 50',email:'events@sciencespo.fr',site:'sciencespo.fr',taille:'500',arrondissement:'Paris 7e',valeur_event:3000,valeur_mois:0,type:'Cocktails conferences & evenements direction',pitch:'Sciences Po = think tank permanent, conferences quotidiennes, receptions diplomatiques. Meshuga = upgrade du traiteur institutionnel.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/school/sciences-po'},
  {id:'ins03',cat:'institution',name:'Institut Pasteur',contact:'Direction communication',phone:'01 45 68 80 00',email:'communication@pasteur.fr',site:'pasteur.fr',taille:'2500',arrondissement:'Paris 15e',valeur_event:4000,valeur_mois:0,type:'Cocktails conferences scientifiques & remises prix',pitch:'Institut Pasteur = evenements scientifiques internationaux de prestige. Meshuga = traiteur premium qui sort des caterings basiques.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/institut-pasteur'},
  // BANQUES
  {id:'ban01',cat:'banque',name:'Goldman Sachs Paris',contact:'Facilities',phone:'01 53 57 24 24',email:'contact@gs.com',site:'goldmansachs.com',taille:'500',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Working lunches & client events',pitch:'Goldman Sachs = culture US transplantee. Nos pastrami et lobster rolls = parfaitement dans leur culture food newyorkaise.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/goldman-sachs'},
  {id:'ban02',cat:'banque',name:'JP Morgan Paris',contact:'Office Manager',phone:'01 40 15 55 00',email:'contact@jpmorgan.com',site:'jpmorgan.com',taille:'800',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Working lunches & events clients',pitch:'JP Morgan = culture NY forte. Meshuga = LE deli newyorkais de Paris, pitch ultra-evident pour leurs equipes americaines.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/jpmorgan'},
  {id:'ban03',cat:'banque',name:'Rothschild & Co',contact:'Office Manager',phone:'01 40 74 40 74',email:'contact@rothschildandco.com',site:'rothschildandco.com',taille:'500',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Dejeuners M&A & events clients VIP',pitch:'Rothschild = excellence absolue. Clients CAC40, deals a milliards. Meshuga = le seul traiteur a leur niveau d exigence.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/rothschild-and-co'},
  {id:'ban04',cat:'banque',name:'Lazard Paris',contact:'Office Manager',phone:'01 44 13 01 11',email:'contact@lazard.com',site:'lazard.com',taille:'300',arrondissement:'Paris 8e',valeur_event:3500,valeur_mois:0,type:'Dejeuners M&A & client presentations',pitch:'Lazard = boutique M&A d elite. Exigence maximale. Meshuga = traiteur qui correspond a leur image premium.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/lazard'},
  {id:'ban05',cat:'banque',name:'BNP Paribas CIB',contact:'Office Manager',phone:'01 40 14 45 46',email:'contact@bnpparibas.com',site:'cib.bnpparibas.com',taille:'3000',arrondissement:'Paris 16e',valeur_event:5000,valeur_mois:0,type:'Plateaux equipes trading & events clients',pitch:'CIB BNP = haute finance, equipes exigeantes. Meshuga = le traiteur premium qui sort du cliche.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/bnp-paribas'},
  // TECH
  {id:'tec01',cat:'tech',name:'Google France',contact:'Workplace Manager',phone:'01 42 68 53 00',email:'contact@google.com',site:'google.fr',taille:'1000',arrondissement:'Paris 9e',valeur_event:4000,valeur_mois:0,type:'Plateaux equipes & events Google',pitch:'Google Paris = culture food premium, equipes internationales, events reguliers. Meshuga = LE deli qui matche leur culture US.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/google'},
  {id:'tec02',cat:'tech',name:'Salesforce France',contact:'Workplace Manager',phone:'01 57 95 60 00',email:'contact@salesforce.com',site:'salesforce.com',taille:'600',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Ohana events & plateaux equipes',pitch:'Salesforce = culture Ohana, events permanents. Meshuga = le traiteur premium qui parle leur langue.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/salesforce'},
  {id:'tec03',cat:'tech',name:'Meta France',contact:'Workplace Manager',phone:'',email:'contact@meta.com',site:'meta.com',taille:'500',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events equipes & plateaux dejeuners',pitch:'Meta = culture Silicon Valley a Paris. Food premium. Meshuga = parfaitement aligne sur leurs valeurs.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/meta'},
  {id:'tec04',cat:'tech',name:'Aircall',contact:'Workplace Manager',phone:'',email:'hello@aircall.io',site:'aircall.io',taille:'400',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events equipes internationales',pitch:'Aircall = scale-up franco-americaine. Culture NY tres presente. Pastrami et lobster rolls = resonance immediate avec leurs equipes US.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/aircall'},
  {id:'tec05',cat:'tech',name:'Mirakl',contact:'Office Manager',phone:'',email:'contact@mirakl.com',site:'mirakl.com',taille:'500',arrondissement:'Paris 2e',valeur_event:1500,valeur_mois:0,type:'All-hands & evenements equipes',pitch:'Mirakl = licorne francaise B2B. Equipes internationales, culture US. Meshuga = le deli NY a Paris, fit culturel immediat.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/mirakl'},
  // LUXE
  {id:'lux01',cat:'luxe',name:'LVMH Paris',contact:'Direction evenements',phone:'01 44 13 22 22',email:'evenements@lvmh.com',site:'lvmh.com',taille:'3000',arrondissement:'Paris 8e',valeur_event:8000,valeur_mois:0,type:'Plateaux direction & events Maisons',pitch:'LVMH = events de prestige permanents, budgets illimites. Meshuga = le seul traiteur casual-chic a leur hauteur.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/lvmh'},
  {id:'lux02',cat:'luxe',name:'Kering',contact:'Events Manager',phone:'01 45 64 61 00',email:'events@kering.com',site:'kering.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:6000,valeur_mois:0,type:'Events Maisons (Gucci, YSL, Balenciaga...)',pitch:'Kering = groupe luxe, evenements Maisons permanents. Notre positionnement premium unique = partenariat naturel.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/kering'},
  {id:'lux03',cat:'luxe',name:'Chanel Paris',contact:'Direction protocole',phone:'01 40 07 14 00',email:'contact@chanel.com',site:'chanel.com',taille:'1500',arrondissement:'Paris 8e',valeur_event:10000,valeur_mois:0,type:'Events defile & receptions VIP',pitch:'Chanel = l absolu du luxe. Nos references presse (Telerama, Fooding, Paris Premiere) = credibilite immediate pour leurs equipes.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/chanel'},
  {id:'lux04',cat:'luxe',name:'Hermes Paris',contact:'Office Manager direction',phone:'01 40 17 47 17',email:'contact@hermes.com',site:'hermes.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:8000,valeur_mois:0,type:'Plateaux direction & events internes',pitch:'Hermes = artisanat, authenticite, excellence. Notre histoire artisanale (pastrami maison, lobster roll) = resonance directe.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/hermes-international'},
  // CONSEIL SUPPLEMENTAIRE
  // COWORKING SUPPLEMENTAIRE
  {id:'cw11',cat:'coworking',name:'Wework Champs-Elysees',contact:'Community Lead',phone:'',email:'paris-cw@wework.com',site:'wework.com',taille:'800',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events membres & plateaux',pitch:'WeWork = culture startup US, membres exigeants, events permanents. Meshuga = le traiteur qui parle leur langue newyorkaise.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/wework'},
  {id:'cw12',cat:'coworking',name:'Spaces Paris Opera',contact:'Community Manager',phone:'01 84 25 00 01',email:'paris.opera@spacesworks.com',site:'spacesworks.com',taille:'500',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Plateaux membres & events networking',pitch:'Spaces = coworking premium IWG. Membres CSP+, events business reguliers. Meshuga = le partenaire food naturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:'linkedin.com/company/spaces-inc'},

  // === AGENCES PUB ===
  {id:'pub05',cat:'agence_pub',name:'Leo Burnett Paris',contact:'Office Manager',phone:'01 53 32 32 32',email:'contact@leoburnett.com',site:'leoburnett.com',taille:'150',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Dejeuners equipes & events creatifs',pitch:'Leo Burnett = creativite & convivialite. Meshuga pour les briefs creatifs et client pitches.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pub06',cat:'agence_pub',name:'DDB Paris',contact:'Facilities',phone:'01 40 15 52 00',email:'contact@ddb.com',site:'ddb.com',taille:'180',arrondissement:'Paris 9e',valeur_event:1800,valeur_mois:0,type:'Plateaux equipes & client events',pitch:'DDB Paris - culture creative forte, attentes elevees food. Positionnement premium NY = pitch parfait.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pub07',cat:'agence_pub',name:'Wunderman Thompson',contact:'Office Manager',phone:'01 49 26 20 00',email:'contact@wundermanthompson.com',site:'wundermanthompson.com',taille:'250',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Plateaux equipes & pitches clients',pitch:'WPP group, equipes data+crea. Dejeuners working = forte demande. Meshuga = le choix premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pub08',cat:'agence_pub',name:'Grey Paris',contact:'Office Manager',phone:'01 49 55 60 00',email:'contact@grey.com',site:'grey.com',taille:'120',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Dejeuners equipes & pitches',pitch:'Grey Paris - agence internationale. Meshuga = traiteur qui reflète leur positionnement haut de gamme.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pub09',cat:'agence_pub',name:'McCann Paris',contact:'Facilities',phone:'01 41 34 20 00',email:'contact@mccann.com',site:'mccann.com',taille:'200',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'Plateaux equipes & events clients',pitch:'McCann = reseau mondial, culture creative. Events reguliers internes et clients. Meshuga = upgrade.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pub10',cat:'agence_pub',name:'JWT Paris',contact:'Office Manager',phone:'01 40 70 10 00',email:'contact@jwt.com',site:'jwt.com',taille:'150',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Plateaux equipes & presentations',pitch:'JWT Paris - agence historique. Culture de la qualite. Meshuga = le bon choix pour impressionner.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === HOTELS SUPPLEMENTAIRES ===
  {id:'hot04',cat:'hotel',name:'Hotel Victoria Palace',contact:'Direction F&B',phone:'01 45 49 70 00',email:'contact@victoria-palace-paris.com',site:'victoria-palace-paris.com',taille:'100',arrondissement:'Paris 6e',valeur_event:1200,valeur_mois:0,type:'Plateaux guests & partenariat food',pitch:'Hotel classique Paris 6e - clientele internationale premium. Meshuga = experience food authentique.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot05',cat:'hotel',name:'Hotel Luxembourg Parc',contact:'Direction',phone:'01 42 25 67 90',email:'contact@hotelluxembourgparc.com',site:'hotelluxembourgparc.com',taille:'40',arrondissement:'Paris 6e',valeur_event:800,valeur_mois:0,type:'Partenariat food & recommandations',pitch:'Face au jardin du Luxembourg - clientele literaire et internationale. Meshuga = voisin naturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot06',cat:'hotel',name:'Hotel Le Six',contact:'Concierge',phone:'01 42 22 00 75',email:'contact@hotel-le-six.com',site:'hotel-le-six.com',taille:'50',arrondissement:'Paris 6e',valeur_event:900,valeur_mois:0,type:'Room service premium & events guests',pitch:'Hotel boutique design Paris 6e. Clientele creatives, artistes, executives. Meshuga = fit culturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot07',cat:'hotel',name:'Villa Pantheon',contact:'Direction',phone:'01 53 10 95 95',email:'contact@villapantheon.com',site:'villapantheon.com',taille:'50',arrondissement:'Paris 5e',valeur_event:1000,valeur_mois:0,type:'Plateaux guests & events seminaires',pitch:'Paris 5e, clientele business & seminaires. Formules B2B adaptees a leur usage.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot08',cat:'hotel',name:'Hotel Grands Hommes',contact:'Direction',phone:'01 46 34 19 60',email:'contact@hoteldesgrandshommes.com',site:'hoteldesgrandshommes.com',taille:'40',arrondissement:'Paris 5e',valeur_event:800,valeur_mois:0,type:'Animations food pour clients',pitch:'Face au Pantheon - clientele internationale cultivee. Meshuga = surprise gastronomique NY.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot09',cat:'hotel',name:'Hotel Saints Peres',contact:'Direction',phone:'01 45 44 50 00',email:'contact@paris-hotel-saintsperes.com',site:'paris-hotel-saintsperes.com',taille:'40',arrondissement:'Paris 6e',valeur_event:700,valeur_mois:0,type:'Partenariat food & concierge',pitch:'Hotel charme Saint-Germain. Recommendation Meshuga = valeur ajoutee pour les guests.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot10',cat:'hotel',name:'Relais Christine',contact:'F&B Manager',phone:'01 40 51 60 80',email:'contact@relais-christine.com',site:'relais-christine.com',taille:'50',arrondissement:'Paris 6e',valeur_event:1500,valeur_mois:0,type:'Events prives & partenariat food premium',pitch:'Relais Christine = hotel de prestige Paris 6e. Clientele internationale exigeante. Meshuga = le partenaire naturel.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'hot11',cat:'hotel',name:'Hotel Sofitel Arc de Triomphe',contact:'F&B',phone:'01 53 05 05 05',email:'contact@sofitel.com',site:'sofitel.com',taille:'250',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Plateaux seminaires & events clients',pitch:'Sofitel Paris - seminaires corporate, clientele internationale. Fort volume plateaux dejeuners.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === INSTITUTIONS SUPPLEMENTAIRES ===
  {id:'ins04',cat:'institution',name:'Ecole des Mines ParisTech',contact:'Direction evenements',phone:'01 40 51 90 00',email:'events@minesparis.psl.eu',site:'minesparis.psl.eu',taille:'300',arrondissement:'Paris 6e',valeur_event:2000,valeur_mois:0,type:'Cocktails etudiants & events direction',pitch:'Grandes ecoles Paris 6e = fort tissu events. Meshuga = traiteur premium a 5min.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins05',cat:'institution',name:'Ecole Polytechnique Paris',contact:'Events Manager',phone:'01 69 33 30 00',email:'contact@polytechnique.edu',site:'polytechnique.edu',taille:'400',arrondissement:'Palaiseau',valeur_event:2500,valeur_mois:0,type:'Evenements promotions & conferences',pitch:'X = elite francaise. Remises diplomes, conferences. Meshuga = traiteur qui correspond au niveau.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins06',cat:'institution',name:'Banque de France',contact:'Direction protocole',phone:'01 42 92 42 92',email:'communication@banque-france.fr',site:'banque-france.fr',taille:'2000',arrondissement:'Paris 1er',valeur_event:6000,valeur_mois:0,type:'Receptions officielles & events direction',pitch:'Institution regalienne = receptions de prestige. Notre positionnement premium + presse = credibilite.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins07',cat:'institution',name:'Conseil Constitutionnel',contact:'Secretariat general',phone:'01 40 15 30 00',email:'contact@conseil-constitutionnel.fr',site:'conseil-constitutionnel.fr',taille:'200',arrondissement:'Paris 1er',valeur_event:3000,valeur_mois:0,type:'Receptions officielles & evenements',pitch:'Institution republicaine - receptions, colloques. Paris 6e proche. Meshuga = le traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins08',cat:'institution',name:'Ministere de la Culture',contact:'Direction protocole',phone:'01 40 15 80 00',email:'contact@culture.gouv.fr',site:'culture.gouv.fr',taille:'1500',arrondissement:'Paris 1er',valeur_event:4000,valeur_mois:0,type:'Evenements culturels & vernissages',pitch:'Ministere = vernissages, conferences, remises distinctions. Meshuga = traiteur qui colle a leur univers.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins09',cat:'institution',name:'HEC Paris',contact:'Events Manager',phone:'01 39 67 70 00',email:'events@hec.fr',site:'hec.fr',taille:'500',arrondissement:'Jouy-en-Josas',valeur_event:3000,valeur_mois:0,type:'Gala etudiants & conferences executive',pitch:'HEC = la grande ecole business. Evenements gala, forums entreprises. Budget premium.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins10',cat:'institution',name:'INSEAD Paris',contact:'Events Manager',phone:'01 60 72 40 00',email:'events@insead.edu',site:'insead.edu',taille:'400',arrondissement:'Fontainebleau',valeur_event:3500,valeur_mois:0,type:'Events MBA & executive education',pitch:'INSEAD = MBA international elite. Clientele executives monde entier. Culture food internationale.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === BANQUES & FINANCE SUPPLEMENTAIRES ===
  {id:'ban06',cat:'banque',name:'Morgan Stanley Paris',contact:'Facilities',phone:'01 56 68 40 00',email:'contact@morganstanley.com',site:'morganstanley.com',taille:'400',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Working lunches & events clients',pitch:'Morgan Stanley = culture US, equipes financieres exigeantes. Meshuga = LE deli NY de Paris.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban07',cat:'banque',name:'Credit Agricole CIB',contact:'Office Manager',phone:'01 41 89 00 00',email:'contact@ca-cib.com',site:'ca-cib.com',taille:'2000',arrondissement:'Paris 13e',valeur_event:3000,valeur_mois:0,type:'Plateaux equipes & events clients CIB',pitch:'CA-CIB = gros volumes plateau repas. Meshuga = traiteur premium alternatif a la cantine.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban08',cat:'banque',name:'Natixis CIB',contact:'Facilities',phone:'01 58 32 30 00',email:'contact@natixis.com',site:'natixis.com',taille:'1500',arrondissement:'Paris 13e',valeur_event:3000,valeur_mois:0,type:'Plateaux dejeuners & events clients',pitch:'Natixis = banque d investissement francaise. Equipes exigeantes. Meshuga = upgrade immediat.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban09',cat:'banque',name:'BNP Paribas Asset Management',contact:'Office Manager',phone:'01 55 77 64 00',email:'contact@bnpparibas-am.com',site:'bnpparibas-am.com',taille:'800',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Dejeuners equipes & events clients',pitch:'BNP AM = gestion actifs premium. Clients institutionnels, exigence qualite. Meshuga = le choix.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban10',cat:'banque',name:'Amundi Asset Management',contact:'Office Manager',phone:'01 76 33 30 00',email:'contact@amundi.com',site:'amundi.com',taille:'1000',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:0,type:'Plateaux equipes & events clients',pitch:'Amundi = 1er gestionnaire europeen. Culture qualite. Meshuga = traiteur premium pour leurs equipes.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban11',cat:'banque',name:'AXA Investment Managers',contact:'Facilities',phone:'01 44 45 85 00',email:'contact@axa-im.com',site:'axa-im.com',taille:'800',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Working lunches & presentations clients',pitch:'AXA IM = gestion financiere internationale. Events clients reguliers. Meshuga = le traiteur qui impressionne.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban12',cat:'banque',name:'Deutsche Bank Paris',contact:'Facilities',phone:'01 44 95 64 00',email:'contact@db.com',site:'db.com',taille:'400',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Working lunches & events clients',pitch:'Deutsche Bank Paris = culture germano-americaine, equipes exigeantes. Meshuga = NY deli = resonance.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === TECH SUPPLEMENTAIRES ===
  {id:'tec06',cat:'tech',name:'Spotify France',contact:'Office Manager',phone:'',email:'contact@spotify.com',site:'spotify.com',taille:'200',arrondissement:'Paris 2e',valeur_event:2000,valeur_mois:0,type:'Events creatifs & plateaux equipes',pitch:'Spotify = culture creative scandinave-US, equipes jeunes, food premium. Meshuga = le deli qui colle.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec07',cat:'tech',name:'LinkedIn France',contact:'Workplace Manager',phone:'',email:'contact@linkedin.com',site:'linkedin.com',taille:'200',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Events B2B & plateaux equipes',pitch:'LinkedIn = pro du networking. Meshuga = le traiteur qui illustre parfaitement leur positionnement.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec08',cat:'tech',name:'Microsoft France',contact:'Office Manager',phone:'01 57 75 00 00',email:'contact@microsoft.com',site:'microsoft.fr',taille:'2000',arrondissement:'Issy-les-Moulineaux',valeur_event:3000,valeur_mois:0,type:'Events equipes & plateaux',pitch:'Microsoft = gros volumes, culture US. Meshuga = le choix premium qui sort de la cantine.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec09',cat:'tech',name:'Amazon France',contact:'Workplace Manager',phone:'',email:'contact@amazon.fr',site:'amazon.fr',taille:'2000',arrondissement:'Clichy',valeur_event:3000,valeur_mois:0,type:'Events equipes & plateaux',pitch:'Amazon = culture US intense, Prime Now delivery, equipes qui mangent bien. Meshuga = evidence.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec10',cat:'tech',name:'Apple France',contact:'Workplace Manager',phone:'01 55 35 06 00',email:'contact@apple.com',site:'apple.com',taille:'500',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Events equipes & presentations',pitch:'Apple Paris = culture premium absolue. Meshuga = le seul traiteur qui matche leur standard.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec11',cat:'tech',name:'Adobe France',contact:'Office Manager',phone:'01 55 35 66 00',email:'contact@adobe.com',site:'adobe.com',taille:'300',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:0,type:'Evenements creatifs & plateaux equipes',pitch:'Adobe = creativite, design, culture. Events Photoshop / Creative Cloud. Meshuga = fit culturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec12',cat:'tech',name:'Uber France',contact:'Workplace Manager',phone:'',email:'contact@uber.com',site:'uber.com',taille:'400',arrondissement:'Paris 10e',valeur_event:2000,valeur_mois:0,type:'Events equipes & working lunches',pitch:'Uber = culture US startup, equipes internationales. Meshuga = le deli NY naturel pour leurs equipes.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec13',cat:'tech',name:'Airbnb France',contact:'Office Manager',phone:'',email:'contact@airbnb.com',site:'airbnb.com',taille:'200',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Events equipes & culture d entreprise',pitch:'Airbnb = culture hospitality, teams internationales. Meshuga = experience locale authentique.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec14',cat:'tech',name:'Stripe France',contact:'Workplace Manager',phone:'',email:'contact@stripe.com',site:'stripe.com',taille:'150',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Working lunches & events equipes',pitch:'Stripe = fintech premium US, culture engineering. Equipes tech exigeantes. Meshuga = le choix.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec15',cat:'tech',name:'Palantir France',contact:'Office Manager',phone:'',email:'contact@palantir.com',site:'palantir.com',taille:'100',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Working lunches & presentations clients',pitch:'Palantir = data intelligence, clients gouvernements et grands groupes. Premium absolu.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec16',cat:'tech',name:'Snowflake France',contact:'Workplace Manager',phone:'',email:'contact@snowflake.com',site:'snowflake.com',taille:'100',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events equipes & client meetings',pitch:'Snowflake = cloud data, hyper-croissance. Culture US premium. Meshuga = le traiteur naturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === MEDIAS ===
  {id:'med01',cat:'medias',name:'Le Monde Groupe',contact:'Direction evenements',phone:'01 57 28 39 00',email:'evenements@lemonde.fr',site:'lemonde.fr',taille:'1500',arrondissement:'Paris 2e',valeur_event:2500,valeur_mois:0,type:'Conferences redactionnelles & events lecteurs',pitch:'Le Monde = evenements premium, forums, conferences. Meshuga = traiteur a leur niveau editorial.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med02',cat:'medias',name:'Conde Nast France',contact:'Events Manager',phone:'01 53 43 60 00',email:'events@condenast.fr',site:'condenast.fr',taille:'200',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events Vogue, GQ, AD & shootings',pitch:'Conde Nast = luxe, mode, prestige. Leurs events sont des vitrines. Meshuga = le traiteur premium.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med03',cat:'medias',name:'Figaro Groupe',contact:'Direction events',phone:'01 57 08 50 00',email:'events@lefigaro.fr',site:'lefigaro.fr',taille:'1200',arrondissement:'Paris 16e',valeur_event:2000,valeur_mois:0,type:'Conferences & receptions institutionnelles',pitch:'Figaro = evenements institutionnels reguliers, partenaires medias. Meshuga = traiteur aligne.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med04',cat:'medias',name:'TF1 Groupe',contact:'Events Manager',phone:'01 41 41 12 34',email:'contact@tf1.fr',site:'tf1.fr',taille:'2000',arrondissement:'Boulogne-Billancourt',valeur_event:3000,valeur_mois:0,type:'Events TV & plateaux direction',pitch:'TF1 = leader TV, events internes et externes reguliers. Meshuga = traiteur premium reconnu.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med05',cat:'medias',name:'M6 Groupe',contact:'Facilities',phone:'01 41 92 66 66',email:'contact@m6.fr',site:'m6.fr',taille:'1500',arrondissement:'Neuilly-sur-Seine',valeur_event:2500,valeur_mois:0,type:'Events plateaux TV & soirees',pitch:'M6 = groupe media dynamique, events reguliers. Meshuga = traiteur qui sort du lot.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med06',cat:'medias',name:'RTL France',contact:'Events Manager',phone:'01 40 70 40 70',email:'contact@rtl.fr',site:'rtl.fr',taille:'500',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Evenements presse & soirees radio',pitch:'RTL = media historique premium. Soirees, rencontres presse. Meshuga = traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === LUXE SUPPLEMENTAIRE ===
  {id:'lux05',cat:'luxe',name:'Dior Paris',contact:'Direction evenements',phone:'01 40 73 73 73',email:'events@dior.com',site:'dior.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:8000,valeur_mois:0,type:'Events defile & receptions VIP',pitch:'Dior = l ultime du luxe parisien. Events showroom, presentations collection. Meshuga = le traiteur qui correspond.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux06',cat:'luxe',name:'Louis Vuitton',contact:'Events Manager',phone:'01 44 20 50 50',email:'contact@louisvuitton.com',site:'louisvuitton.com',taille:'3000',arrondissement:'Paris 8e',valeur_event:10000,valeur_mois:0,type:'Events defile & VIP lounges',pitch:'LV = icone du luxe mondial. Nos references presse = porte d entree naturelle.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux07',cat:'luxe',name:'Cartier',contact:'Direction protocole',phone:'01 58 18 23 00',email:'contact@cartier.com',site:'cartier.com',taille:'1500',arrondissement:'Paris 8e',valeur_event:8000,valeur_mois:0,type:'Receptions VIP & events collections',pitch:'Cartier = joaillier de prestige. Receptions collections, evenements clients ultra-premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux08',cat:'luxe',name:'Richemont France',contact:'Events Manager',phone:'01 58 18 20 00',email:'contact@richemont.com',site:'richemont.com',taille:'500',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Events Maisons Richemont',pitch:'Richemont = Cartier, IWC, Montblanc. Events Maisons permanents. Meshuga = partenariat naturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux09',cat:'luxe',name:'Chaumet',contact:'Direction',phone:'01 44 07 26 26',email:'contact@chaumet.com',site:'chaumet.com',taille:'300',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Receptions VIP & presentations',pitch:'Chaumet = joaillier place Vendome. Clientele ultra-premium. Nos refs presse = credibilite immediate.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux10',cat:'luxe',name:'Van Cleef Arpels',contact:'Events',phone:'01 53 45 46 47',email:'contact@vancleefarpels.com',site:'vancleefarpels.com',taille:'400',arrondissement:'Paris 1er',valeur_event:6000,valeur_mois:0,type:'Evenements collections & VIP',pitch:'Van Cleef = prestige absolu place Vendome. Events collections, clients internationaux elite.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux11',cat:'luxe',name:'LOreal Paris',contact:'Events Manager',phone:'01 47 56 70 00',email:'events@loreal.com',site:'loreal.com',taille:'5000',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Events internes & plateaux direction',pitch:'LOreal = parce que nous le valons. Gros volumes, culture food premium. Meshuga = le traiteur a leur hauteur.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === CONSEILS & AUDIT SUPPLEMENTAIRES ===
  {id:'co16',cat:'conseil',name:'Capgemini Invent',contact:'Office Manager',phone:'01 49 67 30 00',email:'contact@capgemini.com',site:'capgemini.com',taille:'3000',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events innovation & plateaux equipes',pitch:'Capgemini Invent = lab innovation. Culture creatif-tech. Meshuga = le traiteur qui sort de l ordinaire.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === COWORKING SUPPLEMENTAIRES ===
  {id:'cw13',cat:'coworking',name:'Wework Nation',contact:'Community Lead',phone:'',email:'nation@wework.com',site:'wework.com',taille:'600',arrondissement:'Paris 11e',valeur_event:1500,valeur_mois:0,type:'Events membres & dejeuners',pitch:'WeWork Nation = forte communaute startup. Appetite pour le food premium. Meshuga = fit parfait.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw14',cat:'coworking',name:'Regus Paris Madeleine',contact:'Centre Manager',phone:'01 44 71 64 00',email:'paris.madeleine@regus.com',site:'regus.com',taille:'400',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Plateaux membres & events business',pitch:'Regus Madeleine = coeur business Paris. Meshuga = option traiteur haut de gamme.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw15',cat:'coworking',name:'Kwerk Paris Opéra',contact:'Community Manager',phone:'01 84 25 20 00',email:'contact@kwerk.fr',site:'kwerk.fr',taille:'300',arrondissement:'Paris 9e',valeur_event:1200,valeur_mois:0,type:'Events membres & networking',pitch:'Kwerk = coworking premium francais. Membres exigeants, evenements reguliers. Meshuga = partenaire ideal.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw16',cat:'coworking',name:'La Ruche Paris',contact:'Direction',phone:'01 46 33 22 22',email:'contact@laruche-paris.com',site:'laruche-paris.com',taille:'200',arrondissement:'Paris 4e',valeur_event:1000,valeur_mois:0,type:'Events entrepreneurs & pitches',pitch:'La Ruche = coworking social impact. Communaute entrepreneurs engages. Meshuga = traiteur qui partage leurs valeurs.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw17',cat:'coworking',name:'Le Laptop Paris',contact:'Community',phone:'',email:'contact@lelaptop.com',site:'lelaptop.com',taille:'100',arrondissement:'Paris 2e',valeur_event:800,valeur_mois:0,type:'Events freelances & networking',pitch:'Le Laptop = coworking freelances creatifs. Communaute qualite. Meshuga = le snack premium de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === STARTUPS SUPPLEMENTAIRES ===
  {id:'st16',cat:'startup',name:'Pennylane',contact:'Workplace Manager',phone:'',email:'hello@pennylane.com',site:'pennylane.com',taille:'200',arrondissement:'Paris 9e',valeur_event:1000,valeur_mois:0,type:'Events equipes & all-hands',pitch:'Pennylane = fintech croissance. Equipes jeunes, exigeantes qualite. Meshuga = upgrade du plateau.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st17',cat:'startup',name:'Spendesk',contact:'Office Manager',phone:'',email:'hello@spendesk.com',site:'spendesk.com',taille:'250',arrondissement:'Paris 8e',valeur_event:1000,valeur_mois:0,type:'All-hands & events equipes',pitch:'Spendesk = fintech europeenne. Culture premium. Meshuga = traiteur qui correspond a leur image.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st18',cat:'startup',name:'Thales Digital Factory',contact:'Workplace Manager',phone:'',email:'contact@thalesdigital.io',site:'thalesdigital.io',taille:'300',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Events innovation & plateaux equipes',pitch:'Thales Digital = lab innovation grand groupe. Culture startup greffee. Meshuga = sort de l univers corporate.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st19',cat:'startup',name:'Deezer',contact:'Office Manager',phone:'',email:'contact@deezer.com',site:'deezer.com',taille:'300',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events equipes creatifs',pitch:'Deezer = tech musicale, culture creative. Equipes jeunes. Meshuga = le traiteur fun premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st20',cat:'startup',name:'OVHcloud',contact:'Office Manager',phone:'',email:'contact@ovhcloud.com',site:'ovhcloud.com',taille:'400',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events equipes tech & all-hands',pitch:'OVHcloud = leader cloud europeen. Equipes tech, culture startup scale. Meshuga = option premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st21',cat:'startup',name:'Veepee Groupe',contact:'Workplace Manager',phone:'',email:'contact@veepee.com',site:'veepee.com',taille:'1000',arrondissement:'Saint-Denis',valeur_event:2000,valeur_mois:0,type:'Events flash-sales & plateaux equipes',pitch:'Veepee = vente evenementielle premium. Equipes dynamiques. Meshuga = le traiteur de leurs events.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st22',cat:'startup',name:'ManoMano',contact:'Office Manager',phone:'',email:'contact@manomano.com',site:'manomano.com',taille:'500',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Events equipes & all-hands',pitch:'ManoMano = marketplace DIY. Equipes tech croissance. Meshuga = option premium qui sort du lot.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st23',cat:'startup',name:'Vestiaire Collective',contact:'Office Manager',phone:'',email:'contact@vestiairecollective.com',site:'vestiairecollective.com',taille:'300',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events mode & equipes',pitch:'Vestiaire = mode premium circulaire. Culture fashion-tech. Meshuga = traiteur qui colle a leur univers.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st24',cat:'startup',name:'Malt',contact:'Workplace Manager',phone:'',email:'contact@malt.com',site:'malt.com',taille:'200',arrondissement:'Paris 9e',valeur_event:1000,valeur_mois:0,type:'Events freelances & networking',pitch:'Malt = marketplace freelances. Communaute premium. Meshuga = food reference pour leurs events.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st25',cat:'startup',name:'Swile',contact:'Workplace Manager',phone:'',email:'hello@swile.co',site:'swile.co',taille:'400',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events equipes & all-hands',pitch:'Swile = fintech avantages salaries. Culture startup premium. Meshuga = le partenaire naturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st26',cat:'startup',name:'Ledger',contact:'Office Manager',phone:'',email:'contact@ledger.com',site:'ledger.com',taille:'600',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Events crypto & equipes tech',pitch:'Ledger = leader hardware wallet, crypto premium. Culture tech internationale. Meshuga = premium match.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st27',cat:'startup',name:'Voodoo',contact:'Office Manager',phone:'',email:'contact@voodoo.io',site:'voodoo.io',taille:'300',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events gaming & equipes',pitch:'Voodoo = publisher jeux mobile top mondial. Equipes jeunes, internationale. Meshuga = le choix creatif.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === EVENEMENTIEL SUPPLEMENTAIRES ===
  {id:'ev16',cat:'evenementiel',name:'Sthenos Agency',contact:'Direction',phone:'01 42 33 11 11',email:'contact@sthenos.fr',site:'sthenos.fr',taille:'30',arrondissement:'Paris 3e',valeur_event:1500,valeur_mois:0,type:'Events clients & plateaux',pitch:'Agence event boutique premium. Clients CAC40. Meshuga = le traiteur qu elles recommandent.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ev17',cat:'evenementiel',name:'Brut Production',contact:'Direction',phone:'01 42 60 11 00',email:'contact@brut.media',site:'brut.media',taille:'100',arrondissement:'Paris 2e',valeur_event:1500,valeur_mois:0,type:'Events media & productions',pitch:'Brut = media video viral. Events production, lancements. Meshuga = food qui fait le buzz.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ev18',cat:'evenementiel',name:'Ubi Bene',contact:'Direction artistique',phone:'01 43 38 10 10',email:'contact@ubibene.fr',site:'ubibene.fr',taille:'50',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Events clients & soirees',pitch:'Ubi Bene = agence events culturels premium. Galas, vernissages. Meshuga = traiteur de prestige.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ev19',cat:'evenementiel',name:'Quinze Octobre',contact:'Direction',phone:'01 42 74 20 00',email:'contact@quinzeoctobre.fr',site:'quinzeoctobre.fr',taille:'40',arrondissement:'Paris 4e',valeur_event:1800,valeur_mois:0,type:'Events clients & receptions',pitch:'Quinze Octobre = agence event culture. Vernissages, soirees presse. Meshuga = food premium culture.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ev20',cat:'evenementiel',name:'Havas Events Paris',contact:'Direction production',phone:'01 58 47 98 00',email:'contact@havasevents.com',site:'havasevents.com',taille:'80',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events corporates & lancements produits',pitch:'Havas Events = filiale events Havas. Budgets importants, clients CAC40. Meshuga = option recurrente.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},

  // === AVOCATS SUPPLEMENTAIRES ===
  {id:'av16',cat:'avocats',name:'Hogan Lovells Paris',contact:'Office Manager',phone:'01 53 67 47 47',email:'paris@hoganlovells.com',site:'hoganlovells.com',taille:'200',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners M&A & events clients',pitch:'Hogan Lovells = cabinet international premium. Dejeuners working quotidiens. Meshuga = upgrade immediat.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av17',cat:'avocats',name:'Fieldfisher Paris',contact:'Facilities',phone:'01 53 53 40 00',email:'paris@fieldfisher.com',site:'fieldfisher.com',taille:'150',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Plateaux equipes & client lunches',pitch:'Fieldfisher = cabinet affaires premium. Culture qualite. Meshuga = le traiteur a leur niveau.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av18',cat:'avocats',name:'Simmons Simmons',contact:'Office Manager',phone:'01 53 29 16 29',email:'paris@simmons-simmons.com',site:'simmons-simmons.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Dejeuners working & presentations clients',pitch:'Simmons Simmons = cabinet international. Exigence premium. Meshuga = le choix naturel.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av19',cat:'avocats',name:'Taylor Wessing Paris',contact:'Office Manager',phone:'01 72 74 03 33',email:'paris@taylorwessing.com',site:'taylorwessing.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Client lunches & working meetings',pitch:'Taylor Wessing = cabinet tech & innovation. Culture startup-legal. Meshuga = food premium naturel.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av20',cat:'avocats',name:'Gowling WLG Paris',contact:'Office Manager',phone:'01 40 75 60 00',email:'paris@gowlingwlg.com',site:'gowlingwlg.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Dejeuners equipes & clients',pitch:'Gowling WLG = cabinet international affaires. Meshuga = option traiteur premium evidente.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av21',cat:'avocats',name:'Stephenson Harwood',contact:'Office Manager',phone:'01 44 15 81 00',email:'paris@shlegal.com',site:'shlegal.com',taille:'60',arrondissement:'Paris 8e',valeur_event:1000,valeur_mois:0,type:'Working lunches & presentations',pitch:'Cabinet maritime & finance. Culture londonienne premium. Meshuga = le choix rafine.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av22',cat:'avocats',name:'Jeantet Associes',contact:'Office Manager',phone:'01 45 05 80 08',email:'contact@jeantet.fr',site:'jeantet.fr',taille:'100',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Dejeuners M&A & client events',pitch:'Jeantet = cabinet francais independant premium. Clients CAC40. Meshuga = traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av23',cat:'avocats',name:'Racine',contact:'Office Manager',phone:'01 44 82 43 00',email:'contact@racine.eu',site:'racine.eu',taille:'100',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Working lunches & presentations clients',pitch:'Racine = cabinet affaires premium. Dejeuners de travail frequents. Meshuga = upgrade immediat.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av24',cat:'avocats',name:'Fidal Paris',contact:'Office Manager',phone:'01 55 68 15 15',email:'contact@fidal.com',site:'fidal.com',taille:'500',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners equipes & client events',pitch:'Fidal = 1er cabinet droit des affaires francais. Gros volumes. Meshuga = traiteur premium recurrent.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av25',cat:'avocats',name:'Dechert Paris',contact:'Office Manager',phone:'01 57 57 80 00',email:'paris@dechert.com',site:'dechert.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'M&A lunches & client presentations',pitch:'Dechert = cabinet americain premium. Culture US, exigence qualite. Meshuga = NY deli = resonance.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === INSTITUTIONS PARIS & GRANDES ECOLES ===
  {id:'ins11',cat:'institution',name:'ESSEC Business School',contact:'Events Manager',phone:'01 34 43 30 00',email:'events@essec.edu',site:'essec.edu',taille:'400',arrondissement:'Cergy',valeur_event:3000,valeur_mois:0,type:'Gala etudiants & conferences corporate',pitch:'ESSEC = grande ecole business elite. Evenements gala, forums. Budget premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins12',cat:'institution',name:'EDHEC Paris',contact:'Events Manager',phone:'01 53 32 76 00',email:'events@edhec.edu',site:'edhec.edu',taille:'300',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Conferences & remises diplomes',pitch:'EDHEC = grande ecole business. Campus Paris 8e. Evenements reguliers, clientele premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins13',cat:'institution',name:'Paris-Dauphine',contact:'Events Manager',phone:'01 44 05 44 44',email:'events@dauphine.eu',site:'dauphine.eu',taille:'500',arrondissement:'Paris 16e',valeur_event:2500,valeur_mois:0,type:'Conferences & evenements executive',pitch:'Dauphine = universite management prestige. Executive education. Meshuga = traiteur qui match.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins14',cat:'institution',name:'ENS Paris',contact:'Direction protocole',phone:'01 44 32 30 00',email:'contact@ens.fr',site:'ens.fr',taille:'300',arrondissement:'Paris 5e',valeur_event:2000,valeur_mois:0,type:'Colloques scientifiques & receptions',pitch:'ENS = elite intellectuelle francaise. Colloques, conferences. Meshuga = excellence qui correspond.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins15',cat:'institution',name:'ENA - INSP Paris',contact:'Direction services',phone:'01 44 41 85 00',email:'contact@insp.gouv.fr',site:'insp.gouv.fr',taille:'200',arrondissement:'Paris 7e',valeur_event:2500,valeur_mois:0,type:'Receptions enarques & evenements',pitch:'INSP = formation hauts fonctionnaires. Receptions, remises diplomes. Meshuga = traiteur de reference.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins16',cat:'institution',name:'Assemblee Nationale',contact:'Direction protocole',phone:'01 40 63 60 00',email:'communication@assemblee-nationale.fr',site:'assemblee-nationale.fr',taille:'2000',arrondissement:'Paris 7e',valeur_event:8000,valeur_mois:0,type:'Receptions officielles & groupes politiques',pitch:'Assemblee Nationale = institution republicaine. Receptions, visites officielles. Meshuga = le traiteur institutionnel de ref.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins17',cat:'institution',name:'Conseil d Etat',contact:'Direction protocole',phone:'01 40 20 80 00',email:'contact@conseil-etat.fr',site:'conseil-etat.fr',taille:'500',arrondissement:'Paris 1er',valeur_event:3000,valeur_mois:0,type:'Receptions juridiques & colloques',pitch:'Conseil d Etat = juridiction supreme. Colloques, receptions. Meshuga = traiteur de prestige.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === IMMOBILIER & ASSET MANAGEMENT ===
  {id:'immo01',cat:'conseil',name:'Unibail-Rodamco',contact:'Events Manager',phone:'01 53 43 72 00',email:'contact@urw.com',site:'urw.com',taille:'1500',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events malls & receptions direction',pitch:'URW = 1er foncier europeen. Centres commerciaux premium, events retailer. Meshuga = food premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'immo02',cat:'conseil',name:'Gecina',contact:'Office Manager',phone:'01 40 40 52 52',email:'contact@gecina.fr',site:'gecina.fr',taille:'300',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events direction & seminaires',pitch:'Gecina = foncier tertiaire Paris. Seminaires, events AG. Meshuga = traiteur a leur standing.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'immo03',cat:'conseil',name:'Ivanhoé Cambridge',contact:'Office Manager',phone:'01 53 93 91 00',email:'contact@ivanhoe-cambridge.com',site:'ivanhoe-cambridge.com',taille:'100',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events investisseurs & receptions',pitch:'Ivanhoe Cambridge = investisseur immobilier international. Receptions clients premium. Meshuga = evidence.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'immo04',cat:'conseil',name:'AEW Europe',contact:'Office Manager',phone:'01 53 53 52 00',email:'contact@aew.com',site:'aew.com',taille:'200',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events direction & client presentations',pitch:'AEW = gestion actifs immobiliers. Clients institutionnels. Receptions premium. Meshuga = le choix.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'immo05',cat:'conseil',name:'Bouygues Immobilier',contact:'Events Manager',phone:'01 55 38 22 00',email:'contact@bouygues-immobilier.com',site:'bouygues-immobilier.com',taille:'500',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Receptions clients & evenements',pitch:'Bouygues Immo = promoteur premium. Events clients, remises cles. Meshuga = traiteur de prestige.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === AGRO-ALIMENTAIRE & FMCG ===
  {id:'fmcg01',cat:'conseil',name:'Danone France',contact:'Office Manager',phone:'01 41 37 20 00',email:'contact@danone.com',site:'danone.com',taille:'2000',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:0,type:'Events equipes & team building food',pitch:'Danone = acteur food majeur. Culture food premium. Meshuga = partenaire naturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'fmcg02',cat:'conseil',name:'Pernod Ricard',contact:'Events Manager',phone:'01 41 00 41 00',email:'events@pernod-ricard.com',site:'pernod-ricard.com',taille:'1500',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Events spirits & receptions internationales',pitch:'Pernod Ricard = leader mondial spirits. Events partenaires, presse, distributeurs. Meshuga = food premium pour leurs cocktails.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'fmcg03',cat:'conseil',name:'LVMH Moet Hennessy',contact:'Events Manager',phone:'01 44 13 22 22',email:'evenements@lvmh.com',site:'moethennessy.com',taille:'500',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Receptions champagne & events VIP',pitch:'Moet Hennessy = champagne et spirits premium. Degustations, events trade. Meshuga = food a leur hauteur.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'fmcg04',cat:'conseil',name:'Bonduelle',contact:'Office Manager',phone:'01 47 17 00 00',email:'contact@bonduelle.com',site:'bonduelle.com',taille:'300',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Events equipes & team days',pitch:'Bonduelle = leader legumes. Culture sante & responsabilite. Meshuga = food premium engage.',score:6,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === ASSURANCES & MUTUELLES ===
  {id:'ass01',cat:'banque',name:'Axa France',contact:'Events Manager',phone:'01 40 75 57 00',email:'events@axa.fr',site:'axa.fr',taille:'3000',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Evenements direction & events clients',pitch:'AXA = leader assurance. AG, evenements direction. Meshuga = traiteur premium de reference.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ass02',cat:'banque',name:'AG2R La Mondiale',contact:'Office Manager',phone:'01 76 60 70 00',email:'contact@ag2rlamondiale.fr',site:'ag2rlamondiale.fr',taille:'2000',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:0,type:'Events direction & assemblee',pitch:'AG2R = mutuelle premium. Assemblees, seminaires direction. Meshuga = traiteur qui correspond.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ass03',cat:'banque',name:'Malakoff Humanis',contact:'Events Manager',phone:'01 55 00 50 00',email:'contact@malakoffhumanis.fr',site:'malakoffhumanis.fr',taille:'2000',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:0,type:'Evenements RH & direction',pitch:'Malakoff Humanis = groupe protection sociale. Events RH reguliers. Meshuga = upgrade traiteur.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ass04',cat:'banque',name:'Allianz France',contact:'Office Manager',phone:'01 58 85 86 00',email:'contact@allianz.fr',site:'allianz.fr',taille:'2000',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events direction & clients premium',pitch:'Allianz = assureur premium. Receptions clients, AG. Meshuga = traiteur a leur standing.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ass05',cat:'banque',name:'BNP Paribas Cardif',contact:'Office Manager',phone:'01 41 42 83 00',email:'contact@bnpparibascardif.com',site:'bnpparibascardif.com',taille:'1000',arrondissement:'Paris 13e',valeur_event:2500,valeur_mois:0,type:'Events direction & partenaires',pitch:'BNP Cardif = assurance-vie. Events direction, partenaires distributeurs. Meshuga = option premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === TELECOMS & ENERGIE ===
  {id:'tel01',cat:'tech',name:'Orange Business',contact:'Workplace Manager',phone:'01 57 78 00 00',email:'contact@orange.com',site:'orange.com',taille:'3000',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:0,type:'Events equipes & client days',pitch:'Orange = operateur national. Grand Campus Paris. Events equipes reguliers. Meshuga = upgrade.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tel02',cat:'tech',name:'SFR Groupe',contact:'Workplace Manager',phone:'01 71 07 60 00',email:'contact@sfr.com',site:'sfr.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Events equipes & presentations',pitch:'SFR = telco premium. Culture innovation. Events equipes, client days. Meshuga = le bon choix.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tel03',cat:'tech',name:'TotalEnergies',contact:'Events Manager',phone:'01 47 44 45 46',email:'events@totalenergies.com',site:'totalenergies.com',taille:'5000',arrondissement:'Paris 8e',valeur_event:6000,valeur_mois:0,type:'Receptions investisseurs & events direction',pitch:'TotalEnergies = major energetique mondiale. Receptions AG, events direction. Meshuga = prestige.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tel04',cat:'tech',name:'EDF',contact:'Events Manager',phone:'01 40 42 22 22',email:'events@edf.fr',site:'edf.fr',taille:'3000',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Evenements direction & institutionnels',pitch:'EDF = service public premium. Receptions officielles, colloques. Meshuga = traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tel05',cat:'tech',name:'Engie France',contact:'Office Manager',phone:'01 44 22 22 00',email:'contact@engie.com',site:'engie.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events direction & client presentations',pitch:'Engie = energetique premium. Events direction, presentations investisseurs. Meshuga = choix premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === SANTÉ & PHARMA ===
  {id:'san01',cat:'medical',name:'Sanofi Headquarters',contact:'Events Manager',phone:'01 53 77 40 00',email:'events@sanofi.com',site:'sanofi.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Evenements direction & conferences medicales',pitch:'Sanofi = pharma mondiale. AG, conferences scientifiques. Meshuga = traiteur premium international.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san02',cat:'medical',name:'AstraZeneca France',contact:'Office Manager',phone:'01 41 29 40 00',email:'contact@astrazeneca.fr',site:'astrazeneca.fr',taille:'500',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Conferences medicales & events direction',pitch:'AstraZeneca = pharma internationale. Conferences HCPs, events direction. Meshuga = upgrade.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san03',cat:'medical',name:'Bayer France',contact:'Office Manager',phone:'01 49 06 54 54',email:'contact@bayer.fr',site:'bayer.fr',taille:'500',arrondissement:'Paris 12e',valeur_event:2000,valeur_mois:0,type:'Events equipes & conferences',pitch:'Bayer = pharma-chimie internationale. Events equipes reguliers. Meshuga = option premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san04',cat:'medical',name:'Johnson & Johnson France',contact:'Office Manager',phone:'01 55 00 30 00',email:'contact@jnj.com',site:'jnj.com',taille:'500',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events equipes & client presentations',pitch:'J&J = sante premium mondiale. Culture US, exigence qualite. Meshuga = NY deli = resonance naturelle.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san05',cat:'medical',name:'Abbott France',contact:'Office Manager',phone:'01 45 60 35 00',email:'contact@abbott.fr',site:'abbott.fr',taille:'400',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events equipes & conferences',pitch:'Abbott = dispositifs medicaux premium. Events direction, conferences. Meshuga = traiteur premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san06',cat:'medical',name:'Medtronic France',contact:'Office Manager',phone:'01 55 38 17 00',email:'contact@medtronic.fr',site:'medtronic.fr',taille:'400',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events equipes & formations medicales',pitch:'Medtronic = medtech mondiale premium. Culture US, qualite absolue. Meshuga = fit culturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  // === TRANSPORT & LOGISTIQUE ===
  {id:'tra01',cat:'conseil',name:'Air France',contact:'Events Manager',phone:'01 41 56 78 00',email:'events@airfrance.fr',site:'airfrance.fr',taille:'3000',arrondissement:'Roissy',valeur_event:4000,valeur_mois:0,type:'Receptions VIP & events direction',pitch:'Air France = compagnie premium. Salons VIP, events direction. Meshuga = food premium qui correspond.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tra02',cat:'conseil',name:'Eurostar Paris',contact:'Office Manager',phone:'01 55 31 55 31',email:'contact@eurostar.com',site:'eurostar.com',taille:'500',arrondissement:'Paris 10e',valeur_event:2000,valeur_mois:0,type:'Events partenaires & plateaux equipes',pitch:'Eurostar = voyage premium Paris-Londres. Culture franco-britannique. Meshuga = le deli qui voyage.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tra03',cat:'conseil',name:'SNCF Immobilier',contact:'Events Manager',phone:'01 82 34 52 00',email:'contact@sncf-immobilier.fr',site:'sncf-immobilier.fr',taille:'300',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events direction & presentations',pitch:'SNCF Immobilier = projets urbains prestige. Events direction, partenaires. Meshuga = premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},

  // === RESTAURANTS D ENTREPRISE & RHD ===
  {id:'rhe01',cat:'evenementiel',name:'Elior Services',contact:'Direction',phone:'01 71 06 70 00',email:'contact@elior.com',site:'elior.com',taille:'5000',arrondissement:'Paris 15e',valeur_event:5000,valeur_mois:0,type:'Partenariat traiteur premium B2B',pitch:'Elior = leader restauration entreprise. Partenariat distribution Meshuga aux entreprises clientes.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rhe02',cat:'evenementiel',name:'Sodexo France',contact:'Direction',phone:'01 49 88 00 88',email:'contact@sodexo.com',site:'sodexo.com',taille:'5000',arrondissement:'Paris 7e',valeur_event:5000,valeur_mois:0,type:'Partenariat distribution services premium',pitch:'Sodexo = leader services sur site. Meshuga = option premium complementaire pour leurs clients.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rhe03',cat:'evenementiel',name:'Compass Group France',contact:'Direction',phone:'01 53 98 90 00',email:'contact@compass-group.fr',site:'compass-group.fr',taille:'3000',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Partenariat traiteur events premium',pitch:'Compass Group = restauration collective premium. Meshuga = l option gastronomique pour leurs events.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'re01',cat:'conseil',name:'Icare Realty',contact:'Direction',phone:'01 56 03 28 00',email:'contact@icaregroup.com',site:'icaregroup.com',taille:'50',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Working lunches & client presentations',pitch:'Icare = conseil immobilier premium. Dejeuners clients investisseurs. Meshuga = traiteur qui classe.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'re02',cat:'conseil',name:'JLL France',contact:'Direction',phone:'01 40 55 15 15',email:'contact@jll.com',site:'jll.com',taille:'500',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Working lunches & events clients',pitch:'JLL = conseil immobilier international. Dejeuners equipes et clients reguliers. Meshuga = premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'re03',cat:'conseil',name:'CBRE France',contact:'Direction',phone:'01 53 64 36 36',email:'contact@cbre.fr',site:'cbre.fr',taille:'500',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Events clients & plateaux equipes',pitch:'CBRE = leader immobilier mondial. Culture US, clients premium. Meshuga = NY deli = resonance.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'re04',cat:'conseil',name:'Cushman Wakefield',contact:'Direction',phone:'01 53 76 92 00',email:'contact@cushmanwakefield.com',site:'cushmanwakefield.com',taille:'400',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Working lunches & pitches clients',pitch:'Cushman Wakefield = conseil immo premium. Clients investisseurs internationaux. Meshuga = le choix.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'re05',cat:'conseil',name:'Knight Frank Paris',contact:'Direction',phone:'01 56 02 25 25',email:'contact@knightfrank.fr',site:'knightfrank.fr',taille:'200',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Client presentations & working lunches',pitch:'Knight Frank = immo prestige international. Culture britannique premium. Meshuga = food premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rh01',cat:'conseil',name:'Spencer Stuart Paris',contact:'Direction',phone:'01 53 30 81 00',email:'contact@spencerstuart.com',site:'spencerstuart.com',taille:'100',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners candidats & client meetings',pitch:'Spencer Stuart = chasseur de tetes C-suite. Dejeuners premium quotidiens. Meshuga = le traiteur qui impressionne.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rh02',cat:'conseil',name:'Heidrick Struggles',contact:'Direction',phone:'01 53 43 80 00',email:'contact@heidrick.com',site:'heidrick.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'Working lunches & client meetings',pitch:'Heidrick = executive search premium. Culture US. Meshuga = NY deli = resonance immediate.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rh03',cat:'conseil',name:'Egon Zehnder Paris',contact:'Direction',phone:'01 47 23 24 25',email:'contact@egonzehnder.com',site:'egonzehnder.com',taille:'60',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners candidats & directions',pitch:'Egon Zehnder = chasseur de tetes elite. Clients CAC40 exclusivement. Meshuga = le traiteur de reference.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rh04',cat:'conseil',name:'Korn Ferry Paris',contact:'Direction',phone:'01 45 62 55 55',email:'contact@kornferry.com',site:'kornferry.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'Working lunches & presentations',pitch:'Korn Ferry = RH premium mondial. Culture US. Meshuga = le deli NY naturel pour leurs equipes.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pe01',cat:'banque',name:'Eurazeo',contact:'Direction',phone:'01 44 15 01 11',email:'contact@eurazeo.com',site:'eurazeo.com',taille:'200',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Working lunches & board presentations',pitch:'Eurazeo = private equity premium. Board meetings, dejeuners investisseurs. Meshuga = le traiteur qui classe.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pe02',cat:'banque',name:'Ardian',contact:'Direction',phone:'01 44 21 22 00',email:'contact@ardian.com',site:'ardian.com',taille:'200',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Dejeuners LP & management presentations',pitch:'Ardian = 1er PE francais. LP meetings, management presentations. Meshuga = premium absolu.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pe03',cat:'banque',name:'PAI Partners',contact:'Direction',phone:'01 43 12 50 12',email:'contact@paipartners.com',site:'paipartners.com',taille:'100',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Working lunches & deal presentations',pitch:'PAI = PE mid-market premium. Dejeuners deal teams. Meshuga = le traiteur des deals parisiens.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pe04',cat:'banque',name:'Apax Partners',contact:'Direction',phone:'01 53 65 01 00',email:'contact@apax.com',site:'apax.com',taille:'100',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Board meetings & management lunches',pitch:'Apax = PE international premium. Meetings direction, management. Meshuga = traiteur de reference.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'pe05',cat:'banque',name:'Tikehau Capital',contact:'Direction',phone:'01 53 59 05 00',email:'contact@tikehau.com',site:'tikehau.com',taille:'200',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'LP events & management presentations',pitch:'Tikehau = alternatif premium. Events LP, presentations strategies. Meshuga = food premium naturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'vc01',cat:'banque',name:'Partech Partners',contact:'Direction',phone:'01 42 21 24 81',email:'contact@partech.vc',site:'partech.vc',taille:'50',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Portfolio events & startup lunches',pitch:'Partech = VC top tier Paris. Events portfolio, dejeuners founders. Meshuga = food startup culture.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'vc02',cat:'banque',name:'Idinvest Partners',contact:'Direction',phone:'01 58 18 56 00',email:'contact@idinvest.com',site:'idinvest.com',taille:'80',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Deal lunches & investisseur events',pitch:'Idinvest = VC growth premium. Dejeuners equipes et entrepreneurs. Meshuga = culture startup premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'vc03',cat:'banque',name:'Serena Capital',contact:'Direction',phone:'',email:'contact@serena.vc',site:'serena.vc',taille:'20',arrondissement:'Paris 2e',valeur_event:1500,valeur_mois:0,type:'Portfolio events & investor dinners',pitch:'Serena = VC tech francais premium. Events portfolio founders. Meshuga = food startups de ref.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw18',cat:'coworking',name:'Bureaux a Partager',contact:'Direction',phone:'01 80 96 68 22',email:'contact@bureaux-a-partager.com',site:'bureaux-a-partager.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1000,valeur_mois:0,type:'Events membres & networking B2B',pitch:'BAP = marketplace coworking B2B. Membres professionnels, events networking. Meshuga = partenaire ideal.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw19',cat:'coworking',name:'Bureaux du Globe',contact:'Direction',phone:'01 55 65 10 00',email:'contact@bureauxduglobe.com',site:'bureauxduglobe.com',taille:'200',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Plateaux membres & events',pitch:'Bureaux du Globe = coworking premium Paris. Culture business premium. Meshuga = traiteur naturel.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw20',cat:'coworking',name:'Wojo Paris Nation',contact:'Direction',phone:'01 83 64 98 00',email:'contact@wojo.com',site:'wojo.com',taille:'300',arrondissement:'Paris 11e',valeur_event:1000,valeur_mois:0,type:'Events membres & networking',pitch:'Wojo = coworking BNP Paribas. Membres business premium. Meshuga = partenaire food premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rp01',cat:'agence_pub',name:'Hopscotch Communication',contact:'Direction',phone:'01 58 65 00 72',email:'contact@hopscotch.fr',site:'hopscotch.fr',taille:'300',arrondissement:'Paris 10e',valeur_event:2500,valeur_mois:0,type:'Events presse & lancements produits',pitch:'Hopscotch = agence RP & events premium. Lancements produits, soirees presse. Meshuga = food premium de ref.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rp02',cat:'agence_pub',name:'Wellcom',contact:'Direction',phone:'01 46 34 60 60',email:'contact@wellcom.fr',site:'wellcom.fr',taille:'100',arrondissement:'Paris 6e',valeur_event:1500,valeur_mois:0,type:'Dejeuners presse & events clients',pitch:'Wellcom = agence RP premium Paris. Dejeuners journalistes, events marques. Meshuga = voisin naturel Paris 6e.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rp03',cat:'agence_pub',name:'Agence Marie Madeleine',contact:'Direction',phone:'01 47 04 33 33',email:'contact@mariemadeleine.fr',site:'mariemadeleine.fr',taille:'50',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Events presse & partenaires',pitch:'Marie Madeleine = RP haut de gamme. Lancements luxe, mode, art de vivre. Meshuga = partenaire premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rp04',cat:'agence_pub',name:'Aromates',contact:'Direction',phone:'01 42 93 04 04',email:'contact@aromates.fr',site:'aromates.fr',taille:'50',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Evenements marques & dejeuners presse',pitch:'Aromates = RP & influence premium. Events marques premium. Meshuga = le food partenaire ideal.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'gam01',cat:'tech',name:'Ubisoft Paris',contact:'Direction',phone:'01 48 18 50 00',email:'contact@ubisoft.com',site:'ubisoft.com',taille:'2000',arrondissement:'Montreuil',valeur_event:3000,valeur_mois:0,type:'Events gaming & soirees lancement',pitch:'Ubisoft = editeur jeux mondial. Soirees lancement, events equipes. Meshuga = food premium gaming.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'gam02',cat:'tech',name:'Gameloft Paris',contact:'Direction',phone:'01 55 32 14 14',email:'contact@gameloft.com',site:'gameloft.com',taille:'500',arrondissement:'Paris 10e',valeur_event:2000,valeur_mois:0,type:'Events equipes & soirees prod',pitch:'Gameloft = jeux mobile premium. Equipes creatives internationales. Meshuga = le traiteur tendance.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'arc01',cat:'conseil',name:'Wilmotte Associes',contact:'Direction',phone:'01 53 63 44 00',email:'contact@wilmotte.com',site:'wilmotte.com',taille:'100',arrondissement:'Paris 12e',valeur_event:2000,valeur_mois:0,type:'Events architecture & presentations',pitch:'Wilmotte = cabinet architecture renomme. Presentations clients premium. Meshuga = design food premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'arc02',cat:'conseil',name:'Jean Nouvel Ateliers',contact:'Direction',phone:'01 49 23 83 83',email:'contact@jeannouvel.fr',site:'jeannouvel.fr',taille:'100',arrondissement:'Paris 10e',valeur_event:2000,valeur_mois:0,type:'Events architecture & vernissages',pitch:'Jean Nouvel = icone architecture mondiale. Vernissages, presentations. Meshuga = food iconic.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'mode01',cat:'luxe',name:'Galeries Lafayette',contact:'Direction',phone:'01 42 82 34 56',email:'contact@gl.com',site:'galerieslafayette.com',taille:'2000',arrondissement:'Paris 9e',valeur_event:4000,valeur_mois:0,type:'Events marques & showrooms',pitch:'GL = destination shopping premium Paris. Events marques, showrooms. Meshuga = food premium trend.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'mode02',cat:'luxe',name:'Printemps Paris',contact:'Direction',phone:'01 42 82 50 00',email:'contact@printemps.com',site:'printemps.com',taille:'1500',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:0,type:'Events marques & lancements',pitch:'Printemps = grand magasin premium. Events marques, fashion weeks. Meshuga = food premium fashion.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'mode03',cat:'luxe',name:'The Kooples',contact:'Direction',phone:'01 42 33 48 50',email:'contact@thekooples.com',site:'thekooples.com',taille:'300',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events equipes & showrooms',pitch:'The Kooples = mode premium franco-british. Culture fashion exigeante. Meshuga = le food partenaire.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'mode04',cat:'luxe',name:'Isabel Marant',contact:'Direction',phone:'01 49 29 71 55',email:'contact@isabelmarant.com',site:'isabelmarant.com',taille:'200',arrondissement:'Paris 11e',valeur_event:2000,valeur_mois:0,type:'Events showroom & equipes',pitch:'Isabel Marant = mode parisienne iconique. Events showroom, equipes creatifs. Meshuga = food artisan premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'food01',cat:'tech',name:'Too Good To Go France',contact:'Direction',phone:'',email:'contact@toogoodtogo.fr',site:'toogoodtogo.fr',taille:'200',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Partnership food & events equipes',pitch:'TGTG = foodtech impact. Valeurs partage anti-gaspi. Meshuga = partenaire food responsible premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'food02',cat:'tech',name:'La Belle Assiette',contact:'Direction',phone:'01 83 62 10 10',email:'contact@labelleass.fr',site:'labelleass.fr',taille:'100',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Partnership traiteur & events',pitch:'La Belle Assiette = marketplace traiteurs premium. Meshuga = le deli iconique de leur offre.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'sport01',cat:'conseil',name:'Paris Saint-Germain',contact:'Direction',phone:'01 47 43 71 71',email:'contact@psg.fr',site:'psg.fr',taille:'500',arrondissement:'Paris 16e',valeur_event:8000,valeur_mois:0,type:'Events VIP & loges premium',pitch:'PSG = club football premium mondial. Loges VIP, events partenaires. Meshuga = food premium matchday.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'sport02',cat:'conseil',name:'Roland Garros FFT',contact:'Direction',phone:'01 47 43 48 00',email:'events@fft.fr',site:'rolandgarros.com',taille:'1000',arrondissement:'Paris 16e',valeur_event:8000,valeur_mois:0,type:'Hospitality premium & events',pitch:'Roland Garros = evenement tennis mondial. Hospitality premium. Meshuga = food parisien premium.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'well01',cat:'conseil',name:'Nuxe',contact:'Direction',phone:'01 55 09 61 00',email:'contact@nuxe.com',site:'nuxe.com',taille:'300',arrondissement:'Paris 1er',valeur_event:1500,valeur_mois:0,type:'Events presse & partenaires',pitch:'Nuxe = cosmetique premium parisienne. Events presse, partenaires. Meshuga = food beaute premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'asso01',cat:'institution',name:'Institut Montaigne',contact:'Direction',phone:'01 53 89 05 60',email:'contact@institutmontaigne.org',site:'institutmontaigne.org',taille:'50',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Colloques & dinners de reflexion',pitch:'Institut Montaigne = think tank influence. Dinners experts, colloques. Meshuga = food premium intellectuel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'asso02',cat:'institution',name:'Fondation de France',contact:'Direction',phone:'01 44 21 31 00',email:'contact@fondationdefrance.org',site:'fondationdefrance.org',taille:'200',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Evenements philanthropiques & galas',pitch:'FDF = philanthropie premium. Galas collecte, events donateurs. Meshuga = traiteur de prestige.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'asso03',cat:'institution',name:'CCI Paris Ile-de-France',contact:'Direction',phone:'01 55 65 35 35',email:'contact@cci.fr',site:'cci-paris-idf.fr',taille:'500',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Evenements entreprises & networking',pitch:'CCI Paris = reseau entreprises. Events networking, remises prix. Meshuga = traiteur entreprises de ref.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'asso04',cat:'institution',name:'Medef Paris',contact:'Direction',phone:'01 53 59 19 19',email:'contact@medef.fr',site:'medef.fr',taille:'200',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Events patronaux & assemblee',pitch:'Medef = federation patronale. AG, dinners debats. Meshuga = food premium de reference.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},

  {id:'av26',cat:'avocats',name:'Gorrissen Federspiel',contact:'Direction',phone:'01 44 44 60 00',email:'paris@gorrissenfederspiel.com',site:'gorrissenfederspiel.com',taille:'60',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Client lunches & working',pitch:'Cabinet scandinave premium Paris. Dejeuners working quotidiens. Meshuga = upgrade immediat.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av27',cat:'avocats',name:'Lacourte Raquin Tatar',contact:'Direction',phone:'01 44 90 20 20',email:'contact@lrt-avocats.com',site:'lrt-avocats.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Dejeuners equipes & clients',pitch:'Cabinet mid-market premium. Culture qualite. Meshuga = le traiteur qui correspond.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av28',cat:'avocats',name:'Goodwin Paris',contact:'Direction',phone:'01 73 06 40 00',email:'paris@goodwinlaw.com',site:'goodwinlaw.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Working lunches & pitches VC',pitch:'Goodwin = cabinet tech & VC international. Clientele startups et VCs. Meshuga = food startup premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av29',cat:'avocats',name:'Orrick Paris',contact:'Direction',phone:'01 53 53 75 00',email:'paris@orrick.com',site:'orrick.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Working lunches & events clients',pitch:'Orrick = cabinet tech & finance US. Culture silicon valley. Meshuga = NY deli = resonance.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av30',cat:'avocats',name:'Willkie Farr Paris',contact:'Direction',phone:'01 53 43 45 00',email:'paris@willkie.com',site:'willkie.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'M&A lunches & client presentations',pitch:'Willkie = M&A premium international. Exigence maximale. Meshuga = traiteur a leur niveau.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st28',cat:'startup',name:'Doctolib',contact:'Direction',phone:'',email:'workplace@doctolib.fr',site:'doctolib.fr',taille:'1000',arrondissement:'Paris 19e',valeur_event:2500,valeur_mois:0,type:'All-hands & events equipes',pitch:'Doctolib = licorne sante. Culture startup premium. Meshuga = food premium pour leurs events.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st29',cat:'startup',name:'Alan',contact:'Direction',phone:'',email:'hello@alan.com',site:'alan.com',taille:'300',arrondissement:'Paris 10e',valeur_event:1500,valeur_mois:0,type:'All-hands & culture food',pitch:'Alan = assurance sante premium tech. Culture transparence et qualite. Meshuga = le choix premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st30',cat:'startup',name:'Payfit',contact:'Direction',phone:'',email:'contact@payfit.com',site:'payfit.com',taille:'500',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Events equipes & all-hands',pitch:'Payfit = SaaS RH croissance. Culture startup premium europeenne. Meshuga = food events de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st31',cat:'startup',name:'Qonto',contact:'Direction',phone:'',email:'hello@qonto.com',site:'qonto.com',taille:'700',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'All-hands & events culture',pitch:'Qonto = fintech europeenne premium. Culture fond premium. Meshuga = le traiteur qui match.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st32',cat:'startup',name:'Contentsquare',contact:'Direction',phone:'',email:'contact@contentsquare.com',site:'contentsquare.com',taille:'800',arrondissement:'Paris 2e',valeur_event:2000,valeur_mois:0,type:'Events equipes internationales',pitch:'Contentsquare = licorne analytics. Equipes monde entier. Culture US-French. Meshuga = food premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st33',cat:'startup',name:'Back Market',contact:'Direction',phone:'',email:'contact@backmarket.fr',site:'backmarket.fr',taille:'700',arrondissement:'Paris 11e',valeur_event:1500,valeur_mois:0,type:'Events impact & equipes',pitch:'Back Market = marketplace reconditionne premium. Culture impact positive. Meshuga = artisan premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st34',cat:'startup',name:'Exotec',contact:'Direction',phone:'',email:'contact@exotec.com',site:'exotec.com',taille:'400',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Events tech & equipes',pitch:'Exotec = robotique logistique scale-up. Culture ingenierie premium. Meshuga = food de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'st35',cat:'startup',name:'Ivalua',contact:'Direction',phone:'',email:'contact@ivalua.com',site:'ivalua.com',taille:'300',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Working lunches & events clients',pitch:'Ivalua = procurement SaaS. Clients grands groupes. Exigence premium. Meshuga = upgrade.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec17',cat:'tech',name:'SAP France',contact:'Direction',phone:'01 41 10 35 00',email:'contact@sap.com',site:'sap.com',taille:'1000',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events clients & equipes',pitch:'SAP = ERP mondial. Events clients grands comptes reguliers. Meshuga = traiteur premium tech.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec18',cat:'tech',name:'Oracle France',contact:'Direction',phone:'01 57 60 60 60',email:'contact@oracle.com',site:'oracle.com',taille:'800',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Working lunches & events clients',pitch:'Oracle = cloud & data premium. Clients enterprises. Meshuga = le choix premium evident.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec19',cat:'tech',name:'Cisco France',contact:'Direction',phone:'01 58 04 60 00',email:'contact@cisco.com',site:'cisco.fr',taille:'600',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Events tech & equipes',pitch:'Cisco = networking mondial. Events equipes reguliers. Meshuga = food premium US culture.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec20',cat:'tech',name:'IBM France',contact:'Direction',phone:'01 49 05 70 00',email:'contact@fr.ibm.com',site:'ibm.com',taille:'1500',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:0,type:'Events innovation & equipes',pitch:'IBM = tech historique, culture innovation. Events reguliers. Meshuga = traiteur premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec21',cat:'tech',name:'Capgemini Cloud',contact:'Direction',phone:'01 47 54 50 00',email:'contact@capgemini.com',site:'capgemini.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Events tech & culture',pitch:'Capgemini = services tech premium. Events cloud & innovation. Meshuga = le choix.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'co17',cat:'conseil',name:'Sia Partners',contact:'Direction',phone:'01 44 54 77 00',email:'contact@sia-partners.com',site:'sia-partners.com',taille:'500',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Working lunches & events clients',pitch:'Sia Partners = conseil management premium. Clients secteur public & prive. Meshuga = upgrade.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'co18',cat:'conseil',name:'Advancy',contact:'Direction',phone:'01 73 05 03 00',email:'contact@advancy.com',site:'advancy.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'Dejeuners strategy & client presentations',pitch:'Advancy = boutique conseil strategy. Clientele grands groupes. Exigence qualite. Meshuga = le choix.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'co19',cat:'conseil',name:'Square Management',contact:'Direction',phone:'01 55 33 55 00',email:'contact@squaremanagement.com',site:'squaremanagement.com',taille:'200',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Dejeuners equipes & client meetings',pitch:'Square = conseil management premium. Equipes exigeantes. Meshuga = traiteur qui correspond.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'co20',cat:'conseil',name:'Colombus Consulting',contact:'Direction',phone:'01 53 27 14 14',email:'contact@colombus-consulting.com',site:'colombus-consulting.com',taille:'200',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Working lunches & events',pitch:'Colombus = conseil digital & data. Culture innovation. Meshuga = food premium naturel.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med07',cat:'medias',name:'Les Echos Evenements',contact:'Direction',phone:'01 49 53 65 65',email:'events@lesechos.fr',site:'lesechos.fr',taille:'200',arrondissement:'Paris 10e',valeur_event:3000,valeur_mois:0,type:'Conferences premium & forums',pitch:'Les Echos Events = conferences B2B premium. Clients grands groupes. Meshuga = traiteur qui correspond.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med08',cat:'medias',name:'Forbes France',contact:'Direction',phone:'01 83 79 45 00',email:'contact@forbes.fr',site:'forbes.fr',taille:'50',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events Forbes & dejeuners',pitch:'Forbes France = media business premium. Dejeuners redaction, events abonnes. Meshuga = evidence.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med09',cat:'medias',name:'Challenges',contact:'Direction',phone:'01 44 88 34 34',email:'contact@challenges.fr',site:'challenges.fr',taille:'200',arrondissement:'Paris 15e',valeur_event:1500,valeur_mois:0,type:'Conferences & events redaction',pitch:'Challenges = hebdo economique premium. Conferences, rencontres dirigeants. Meshuga = food reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw21',cat:'coworking',name:'The Bureau Paris',contact:'Direction',phone:'01 84 80 29 00',email:'contact@thebureau.fr',site:'thebureau.fr',taille:'200',arrondissement:'Paris 9e',valeur_event:1200,valeur_mois:0,type:'Events membres & networking',pitch:'The Bureau = coworking concept store. Membres creatifs premium. Meshuga = le food partenaire ideal.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw22',cat:'coworking',name:'Mozaic Paris',contact:'Direction',phone:'01 53 20 15 15',email:'contact@mozaic.com',site:'mozaic.com',taille:'150',arrondissement:'Paris 9e',valeur_event:1000,valeur_mois:0,type:'Plateaux membres & events',pitch:'Mozaic = coworking premium Paris 9e. Communaute pro. Meshuga = traiteur naturel.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'cw23',cat:'coworking',name:'Lhôtel Coworking',contact:'Direction',phone:'01 40 21 22 00',email:'contact@lhotel.fr',site:'lhotel.fr',taille:'100',arrondissement:'Paris 6e',valeur_event:900,valeur_mois:0,type:'Events membres Paris 6e',pitch:'Coworking boutique Paris 6e. Membres premium, voisins de Meshuga. Partenariat naturel.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san07',cat:'medical',name:'Biomérieux France',contact:'Direction',phone:'04 78 87 20 00',email:'contact@biomerieux.fr',site:'biomerieux.fr',taille:'500',arrondissement:'Lyon / Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events scientifiques & direction',pitch:'Biomerieux = diagnostics medicaux. Conferences scientifiques Paris. Meshuga = traiteur premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san08',cat:'medical',name:'Ipsen France',contact:'Direction',phone:'01 58 33 50 00',email:'contact@ipsen.com',site:'ipsen.com',taille:'500',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Events direction & conferences',pitch:'Ipsen = pharma mid-cap premium. Conferences medicales Paris. Meshuga = upgrade traiteur.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ass06',cat:'banque',name:'CNP Assurances',contact:'Direction',phone:'01 42 18 88 88',email:'contact@cnp.fr',site:'cnp.fr',taille:'1000',arrondissement:'Paris 15e',valeur_event:2000,valeur_mois:0,type:'Events direction & AG',pitch:'CNP = 1er assureur vie France. AG, evenements direction. Meshuga = traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ass07',cat:'banque',name:'MMA Assurances',contact:'Direction',phone:'01 44 69 20 00',email:'contact@mma.fr',site:'mma.fr',taille:'500',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events equipes & direction',pitch:'MMA = assureur premium. Seminaires, events direction. Meshuga = upgrade immediat.',score:6,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tra04',cat:'conseil',name:'Renault Groupe',contact:'Direction',phone:'01 76 84 04 04',email:'contact@renault.com',site:'renault.com',taille:'3000',arrondissement:'Boulogne',valeur_event:3000,valeur_mois:0,type:'Events presse & direction',pitch:'Renault = constructeur iconique. Events presse, lancements. Meshuga = food premium reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tra05',cat:'conseil',name:'RATP Dev',contact:'Direction',phone:'01 58 77 40 40',email:'contact@ratp.fr',site:'ratp.fr',taille:'2000',arrondissement:'Paris 12e',valeur_event:2000,valeur_mois:0,type:'Events direction & corporates',pitch:'RATP = mobilite premium. Evenements direction, partenaires. Meshuga = traiteur qui correspond.',score:6,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rp05',cat:'agence_pub',name:'Edelman Paris',contact:'Direction',phone:'01 40 15 13 00',email:'contact@edelman.com',site:'edelman.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'Events presse & clients',pitch:'Edelman = agence RP mondiale. Clients marques premium. Events presse reguliers. Meshuga = ref.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rp06',cat:'agence_pub',name:'Brunswick Group',contact:'Direction',phone:'01 53 96 83 83',email:'contact@brunswickgroup.com',site:'brunswickgroup.com',taille:'60',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events presse & financiers',pitch:'Brunswick = RP financiere & corporate premium. Clients CAC40. Meshuga = traiteur a leur niveau.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'rp07',cat:'agence_pub',name:'Havas PR Paris',contact:'Direction',phone:'01 58 47 84 00',email:'contact@havaspr.com',site:'havaspr.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Events presse & partenaires',pitch:'Havas PR = RP premium. Dejeuners journalistes, events marques. Meshuga = food reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'sport03',cat:'conseil',name:'Accor Arena',contact:'Direction',phone:'01 72 60 36 36',email:'contact@accor-arena.com',site:'accor-arena.com',taille:'200',arrondissement:'Paris 12e',valeur_event:5000,valeur_mois:0,type:'Hospitalite VIP & events',pitch:'Accor Arena = salle concerts & events majeurs Paris. Loges VIP, catering premium. Meshuga = food iconic.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'sport04',cat:'conseil',name:'Racing 92',contact:'Direction',phone:'01 47 82 15 00',email:'contact@racing92.fr',site:'racing92.fr',taille:'100',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Loges VIP & events corporate',pitch:'Racing 92 = rugby premium. Loges Defcar, events partenaires. Meshuga = food premium matchday.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'aut01',cat:'conseil',name:'BPI France',contact:'Direction',phone:'01 41 79 80 00',email:'contact@bpifrance.fr',site:'bpifrance.fr',taille:'1000',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:0,type:'Events startups & innovation',pitch:'BPI = banque publique investissement. French Tech, events startups. Meshuga = food innovation.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'aut02',cat:'conseil',name:'Business France',contact:'Direction',phone:'01 40 73 30 00',email:'contact@businessfrance.fr',site:'businessfrance.fr',taille:'500',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events export & reception etrangers',pitch:'Business France = agence export. Receptions delegations etrangeres. Meshuga = vitrine gastronomie.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'aut03',cat:'conseil',name:'Choose Paris Region',contact:'Direction',phone:'01 42 68 13 26',email:'contact@chooseparisregion.fr',site:'chooseparisregion.fr',taille:'100',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events investisseurs etrangers',pitch:'Choose Paris = agence attration. Receptions investisseurs monde entier. Meshuga = ambassadeur food.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'aut04',cat:'conseil',name:'INRAE Paris',contact:'Direction',phone:'01 42 75 90 00',email:'contact@inrae.fr',site:'inrae.fr',taille:'300',arrondissement:'Paris 15e',valeur_event:1500,valeur_mois:0,type:'Colloques scientifiques & receptions',pitch:'INRAE = recherche agro premium. Colloques, seminaires. Meshuga = food artisan qui correspond.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'aut05',cat:'conseil',name:'CNRS Paris',contact:'Direction',phone:'01 44 96 40 00',email:'contact@cnrs.fr',site:'cnrs.fr',taille:'500',arrondissement:'Paris 16e',valeur_event:2000,valeur_mois:0,type:'Colloques & evenements scientifiques',pitch:'CNRS = recherche fondamentale. Colloques, remises prix. Meshuga = excellence gastronomique.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},

  {id:'av31',cat:'avocats',name:'Fieldfisher Paris',contact:'Direction',phone:'01 53 53 40 00',email:'paris@fieldfisher.com',site:'fieldfisher.com',taille:'150',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:0,type:'Plateaux equipes & client lunches',pitch:'Cabinet affaires premium. Culture qualite. Meshuga = le traiteur a leur niveau.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av32',cat:'avocats',name:'Taylor Wessing Paris',contact:'Direction',phone:'01 72 74 03 33',email:'paris@taylorwessing.com',site:'taylorwessing.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Client lunches & working meetings',pitch:'Cabinet tech & innovation. Culture startup-legal. Meshuga = food premium naturel.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av33',cat:'avocats',name:'Fidal Paris',contact:'Direction',phone:'01 55 68 15 15',email:'contact@fidal.com',site:'fidal.com',taille:'500',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners equipes & client events',pitch:'1er cabinet droit des affaires francais. Gros volumes. Meshuga = traiteur premium recurrent.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av34',cat:'avocats',name:'Dechert Paris',contact:'Direction',phone:'01 57 57 80 00',email:'paris@dechert.com',site:'dechert.com',taille:'100',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'M&A lunches & client presentations',pitch:'Cabinet americain premium. Culture US. Meshuga = NY deli = resonance.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'av35',cat:'avocats',name:'Jeantet',contact:'Direction',phone:'01 45 05 80 08',email:'contact@jeantet.fr',site:'jeantet.fr',taille:'100',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:0,type:'Dejeuners M&A & client events',pitch:'Cabinet francais independant premium. Clients CAC40. Meshuga = traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban13',cat:'banque',name:'Morgan Stanley Paris',contact:'Direction',phone:'01 56 68 40 00',email:'contact@morganstanley.com',site:'morganstanley.com',taille:'400',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Working lunches & events clients',pitch:'Culture US, equipes financieres. Meshuga = LE deli NY de Paris.',score:10,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban14',cat:'banque',name:'Deutsche Bank Paris',contact:'Direction',phone:'01 44 95 64 00',email:'contact@db.com',site:'db.com',taille:'400',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Working lunches & events clients',pitch:'Culture germano-americaine. Meshuga = NY deli = resonance.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban15',cat:'banque',name:'Eurazeo',contact:'Direction',phone:'01 44 15 01 11',email:'contact@eurazeo.com',site:'eurazeo.com',taille:'200',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Working lunches & board presentations',pitch:'Private equity premium. Board meetings. Meshuga = le traiteur qui classe.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban16',cat:'banque',name:'Ardian',contact:'Direction',phone:'01 44 21 22 00',email:'contact@ardian.com',site:'ardian.com',taille:'200',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Dejeuners LP & management presentations',pitch:'1er PE francais. LP meetings. Meshuga = premium absolu.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban17',cat:'banque',name:'PAI Partners',contact:'Direction',phone:'01 43 12 50 12',email:'contact@paipartners.com',site:'paipartners.com',taille:'100',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Working lunches & deal presentations',pitch:'PE mid-market premium. Dejeuners deal teams. Meshuga = le traiteur des deals.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ban18',cat:'banque',name:'Partech Partners',contact:'Direction',phone:'01 42 21 24 81',email:'contact@partech.vc',site:'partech.vc',taille:'50',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Portfolio events & startup lunches',pitch:'VC top tier Paris. Events portfolio. Meshuga = food startup culture.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec22',cat:'tech',name:'Deezer',contact:'Direction',phone:'',email:'contact@deezer.com',site:'deezer.com',taille:'300',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events equipes creatifs',pitch:'Tech musicale, culture creative. Meshuga = le traiteur fun premium.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec23',cat:'tech',name:'Voodoo',contact:'Direction',phone:'',email:'contact@voodoo.io',site:'voodoo.io',taille:'300',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:0,type:'Events gaming & equipes',pitch:'Publisher jeux mobile top mondial. Meshuga = le choix creatif.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tec24',cat:'tech',name:'Ubisoft Paris',contact:'Direction',phone:'01 48 18 50 00',email:'contact@ubisoft.com',site:'ubisoft.com',taille:'2000',arrondissement:'Montreuil',valeur_event:3000,valeur_mois:0,type:'Events gaming & soirees lancement',pitch:'Editeur jeux mondial. Soirees lancement. Meshuga = food premium gaming.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'med10',cat:'medias',name:'RTL France',contact:'Direction',phone:'01 40 70 40 70',email:'contact@rtl.fr',site:'rtl.fr',taille:'500',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Evenements presse & soirees radio',pitch:'Media historique premium. Meshuga = traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux12',cat:'luxe',name:'Dior Paris',contact:'Direction',phone:'01 40 73 73 73',email:'events@dior.com',site:'dior.com',taille:'2000',arrondissement:'Paris 8e',valeur_event:8000,valeur_mois:0,type:'Events defile & receptions VIP',pitch:'Ultime du luxe parisien. Meshuga = le traiteur qui correspond.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux13',cat:'luxe',name:'Louis Vuitton',contact:'Direction',phone:'01 44 20 50 50',email:'contact@louisvuitton.com',site:'louisvuitton.com',taille:'3000',arrondissement:'Paris 8e',valeur_event:10000,valeur_mois:0,type:'Events defile & VIP lounges',pitch:'Icone du luxe mondial. Refs presse = porte entree naturelle.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux14',cat:'luxe',name:'Cartier',contact:'Direction',phone:'01 58 18 23 00',email:'contact@cartier.com',site:'cartier.com',taille:'1500',arrondissement:'Paris 8e',valeur_event:8000,valeur_mois:0,type:'Receptions VIP & events collections',pitch:'Joaillier de prestige. Receptions ultra-premium.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux15',cat:'luxe',name:'Galeries Lafayette',contact:'Direction',phone:'01 42 82 34 56',email:'contact@gl.com',site:'galerieslafayette.com',taille:'2000',arrondissement:'Paris 9e',valeur_event:4000,valeur_mois:0,type:'Events marques & showrooms',pitch:'Destination shopping premium Paris. Meshuga = food premium trend.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'lux16',cat:'luxe',name:'Printemps Paris',contact:'Direction',phone:'01 42 82 50 00',email:'contact@printemps.com',site:'printemps.com',taille:'1500',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:0,type:'Events marques & lancements',pitch:'Grand magasin premium. Events fashion weeks. Meshuga = food premium fashion.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'co21',cat:'conseil',name:'Spencer Stuart Paris',contact:'Direction',phone:'01 53 30 81 00',email:'contact@spencerstuart.com',site:'spencerstuart.com',taille:'100',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners candidats C-suite & clients',pitch:'Chasseur tetes premium. Dejeuners premium quotidiens. Meshuga = impressionne.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'co22',cat:'conseil',name:'Heidrick Struggles',contact:'Direction',phone:'01 53 43 80 00',email:'contact@heidrick.com',site:'heidrick.com',taille:'80',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:0,type:'Working lunches & client meetings',pitch:'Executive search premium. Culture US. Meshuga = NY deli = resonance.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'co23',cat:'conseil',name:'Egon Zehnder Paris',contact:'Direction',phone:'01 47 23 24 25',email:'contact@egonzehnder.com',site:'egonzehnder.com',taille:'60',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Dejeuners candidats & directions',pitch:'Chasseur tetes elite. Clients CAC40. Meshuga = le traiteur de reference.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'san09',cat:'medical',name:'Medtronic France',contact:'Direction',phone:'01 55 38 17 00',email:'contact@medtronic.fr',site:'medtronic.fr',taille:'400',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Events equipes & formations medicales',pitch:'Medtech mondiale. Culture US. Meshuga = fit culturel.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tel06',cat:'tech',name:'TotalEnergies',contact:'Direction',phone:'01 47 44 45 46',email:'events@totalenergies.com',site:'totalenergies.com',taille:'5000',arrondissement:'Paris 8e',valeur_event:6000,valeur_mois:0,type:'Receptions investisseurs & events direction',pitch:'Major energetique mondiale. Receptions AG. Meshuga = prestige.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'tel07',cat:'tech',name:'EDF',contact:'Direction',phone:'01 40 42 22 22',email:'events@edf.fr',site:'edf.fr',taille:'3000',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Evenements direction & institutionnels',pitch:'Service public premium. Receptions officielles. Meshuga = traiteur de reference.',score:7,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins18',cat:'institution',name:'Assemblee Nationale',contact:'Direction',phone:'01 40 63 60 00',email:'communication@assemblee-nationale.fr',site:'assemblee-nationale.fr',taille:'2000',arrondissement:'Paris 7e',valeur_event:8000,valeur_mois:0,type:'Receptions officielles & groupes politiques',pitch:'Institution republicaine. Receptions, visites. Meshuga = traiteur institutionnel de ref.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins19',cat:'institution',name:'HEC Paris',contact:'Direction',phone:'01 39 67 70 00',email:'events@hec.fr',site:'hec.fr',taille:'500',arrondissement:'Jouy-en-Josas',valeur_event:3000,valeur_mois:0,type:'Gala etudiants & conferences executive',pitch:'Grande ecole business. Budget premium.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ins20',cat:'institution',name:'INSEAD Paris',contact:'Direction',phone:'01 60 72 40 00',email:'events@insead.edu',site:'insead.edu',taille:'400',arrondissement:'Fontainebleau',valeur_event:3500,valeur_mois:0,type:'Events MBA & executive education',pitch:'MBA international elite. Clientele executives monde entier.',score:9,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ev21',cat:'evenementiel',name:'Ubi Bene',contact:'Direction',phone:'01 43 38 10 10',email:'contact@ubibene.fr',site:'ubibene.fr',taille:'50',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:0,type:'Events clients & soirees',pitch:'Agence events culturels premium. Galas, vernissages. Meshuga = traiteur de prestige.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},
  {id:'ev22',cat:'evenementiel',name:'Havas Events Paris',contact:'Direction',phone:'01 58 47 98 00',email:'contact@havasevents.com',site:'havasevents.com',taille:'80',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:0,type:'Events corporates & lancements produits',pitch:'Filiale events Havas. Budgets importants. Meshuga = option recurrente.',score:8,status:'to_contact',contacted:false,contactedDate:'',lastAction:'',relanceDate:'',linkedin:''},

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
  const [journalUser, setJournalUser] = useState('all')
  const [journalDateFrom, setJournalDateFrom] = useState('')
  const [journalDateTo, setJournalDateTo] = useState('')
  const [planningWeek, setPlanningWeek] = useState(0)
  const [planningView, setPlanningView] = useState('auj')
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
  const [devisList, setDevisList] = useState([])
  const [devisView, setDevisView] = useState('list')
  const [currentDevisId, setCurrentDevisId] = useState(null)
  const [devisLivraison, setDevisLivraison] = useState(0)
  const [devisLivraisonOffert, setDevisLivraisonOffert] = useState(false)
  const [devisMepOffert, setDevisMepOffert] = useState(false)
  const [devisNbPersonnes, setDevisNbPersonnes] = useState(50)
  const [devisFormat, setDevisFormat] = useState('normal')
  const [devisItems, setDevisItems] = useState([])
  const [devisMiseEnPlace, setDevisMiseEnPlace] = useState(1500)
  const [devisMiseEnPlaceRemise, setDevisMiseEnPlacePct] = useState(0)
  const [devisRemiseTotal, setDevisRemiseTotal] = useState(0)
  const [devisClient, setDevisClient] = useState({nom:'',contact:'',email:'',phone:'',date:'',lieu:'',prospectId:null})
  const [devisNotes, setDevisNotes] = useState('')
  const [devisNumero, setDevisNumero] = useState('DEV-2026-001')
  const [crmFilter, setCrmFilter] = useState('all')
  const [crmPeriod, setCrmPeriod] = useState('all')
  const [crmSearch, setCrmSearch] = useState('')
  const [gmbData, setGmbData] = useState(null)
  const [gmbLoading, setGmbLoading] = useState(false)
  const [gmbFilter, setGmbFilter] = useState('all')
  const [instaData, setInstaData] = useState(null)
  const [instaLoading, setInstaLoading] = useState(false)
  const [instaTab, setInstaTab] = useState('comments')

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
    fetch('/api/zelty').then(function(r){return r.json()}).then(function(d){setZeltyData(d);setZeltyLoading(false)}).catch(function(){setZeltyLoading(false)})
    sb().from('devis').select('*').order('created_at',{ascending:false}).then(function(r){if(r.data)setDevisList(r.data)})
    sb().from('activity_log').select('*').order('created_at', {ascending: false}).limit(200).then(function(r) {
      if (r.data) setActivityLog(r.data)
    })
    sb().from('activity_log').insert({user_role: profile.role, user_name: profile.full_name || profile.role, type: 'session_start', description: 'Connexion au B2B Manager', prospect_name: null, email_content: null}).then(function(r) {
      if (r.error) { console.warn('[Journal] session_start insert error:', r.error.message) }
    })
  }, [profile])

  useEffect(function() {
    if (!profile) return
    var startTime = Date.now()
    var inactivityTimer = null
    var INACTIVITY_MS = 20 * 60 * 1000
    function closeSession() {
      var duration = Math.round((Date.now() - startTime) / 60000)
      if (duration < 1) duration = 1
      logActivity('session_end', 'Fin de session — durée : ' + duration + ' min', null, null)
    }
    function resetTimer() {
      if (inactivityTimer) clearTimeout(inactivityTimer)
      inactivityTimer = setTimeout(function() {
        closeSession()
        startTime = Date.now()
        logActivity('session_start', 'Reprise de session (inactivité)', null, null)
      }, INACTIVITY_MS)
    }
    var events = ['mousedown','keydown','scroll','touchstart']
    events.forEach(function(e) { window.addEventListener(e, resetTimer, true) })
    window.addEventListener('beforeunload', closeSession)
    resetTimer()
    return function() {
      events.forEach(function(e) { window.removeEventListener(e, resetTimer, true) })
      window.removeEventListener('beforeunload', closeSession)
      if (inactivityTimer) clearTimeout(inactivityTimer)
    }
  }, [profile])

  useEffect(function() {
    if (page !== 'gmb') return
    setGmbLoading(true)
    fetch('/api/gmb').then(function(r) { return r.json() }).then(function(d) {
      setGmbData(d)
      setGmbLoading(false)
    }).catch(function() {
      setGmbLoading(false)
      setGmbData({ok: false, error: 'Erreur de connexion GMB'})
    })
  }, [page])

  useEffect(function() {
    if (page !== 'instagram') return
    setInstaLoading(true)
    fetch('/api/instagram').then(function(r) { return r.json() }).then(function(d) {
      setInstaData(d)
      setInstaLoading(false)
    }).catch(function() {
      setInstaLoading(false)
    })
  }, [page])

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

  function loadDevis() {
    sb().from('devis').select('*').order('created_at',{ascending:false}).then(function(r){if(r.data)setDevisList(r.data)})
  }
  function saveDevisToSupabase(payload, cb) {
    var isNew=!payload.id
    if(isNew){
      sb().from('devis').insert(payload).select().then(function(r){if(r.data&&r.data[0]){loadDevis();if(cb)cb(r.data[0])}})
    } else {
      var id=payload.id; var p=Object.assign({},payload); delete p.id; delete p.created_at
      sb().from('devis').update(p).eq('id',id).then(function(){loadDevis();if(cb)cb(payload)})
    }
  }
  function updateDevisStatut(id,statut,note) {
    sb().from('devis').update({statut:statut}).eq('id',id).then(function(){
      sb().from('devis_historique').insert({devis_id:id,action:statut,note:note||'',user_name:(profile&&profile.name)||''}).then(function(){})
      loadDevis()
      toast('Statut : '+statut)
      var dv = devisList.find(function(d){return String(d.id)===String(id)})
      if(dv && dv.prospect_id) {
        var ts = new Date().toLocaleDateString('fr-FR')
        var devisNote = '['+ts+'] Devis '+dv.numero+' statut : '+statut+(statut==='accepte'?' ✅ SIGNÉ':statut==='facture'?' 🧾 Facturé':statut==='paye'?' 💰 Soldé':'')
        setProspects(function(prev){return prev.map(function(p){
          if(String(p.id)!==String(dv.prospect_id)) return p
          var newN = (p.notes ? p.notes+'\n' : '') + devisNote
          return Object.assign({},p,{notes:newN})
        })})
      }
    })
  }
  function generateAndPrintDoc(dv, isFacture) {
    var items=(dv.items||[]).map(function(x){return '<tr><td>'+x.nom+'</td><td style="text-align:center">'+x.qte+'</td><td style="text-align:right">'+parseFloat(x.prix||x.pu_ht||0).toFixed(2)+' EUR</td><td style="text-align:right;font-weight:900">'+parseFloat(x.total_ht||0).toFixed(2)+' EUR</td></tr>'}).join('')
    var mep=parseFloat(dv.mep||dv.mise_en_place||0)
    var mepOffert=dv.mep_offert||dv.mise_en_place_offert
    var liv=parseFloat(dv.liv||dv.livraison||0)
    var livOffert=dv.liv_offert||dv.livraison_offert
    var mepHT=mepOffert?mep:mep*(1-(parseFloat(dv.mep_remise||dv.remise_mep_pct||0)/100))
    var livHT=livOffert?liv:liv
    var remisePct=parseFloat(dv.remise_pct||dv.remise_total_pct||0)
    var remiseMontant=parseFloat(dv.remise_montant||0)
    var totalHT=parseFloat(dv.total_ht||0)
    var tva=parseFloat(dv.tva||0)
    var totalTTC=parseFloat(dv.total_ttc||0)
    var numero=isFacture?(dv.facture_numero||dv.numero):dv.numero
    var titre=isFacture?'FACTURE':'DEVIS'
    var mepRow=mep>0?'<tr><td>'+(mepOffert?'<span style="text-decoration:line-through;opacity:.4">Mise en place / Show cooking</span> <strong style="color:#009D3A">OFFERT</strong>':'Mise en place / Show cooking')+'</td><td style="text-align:center">1</td><td style="text-align:right">'+(mepOffert?'<span style="text-decoration:line-through;opacity:.4">'+mep.toFixed(2)+' EUR</span>':mepHT.toFixed(2)+' EUR')+'</td><td style="text-align:right;font-weight:900">'+(mepOffert?'<strong style="color:#009D3A">0,00 EUR</strong>':mepHT.toFixed(2)+' EUR')+'</td></tr>':''
    var livRow=liv>0?'<tr><td>'+(livOffert?'<span style="text-decoration:line-through;opacity:.4">Frais de livraison</span> <strong style="color:#009D3A">OFFERT</strong>':'Frais de livraison')+'</td><td style="text-align:center">1</td><td style="text-align:right">'+(livOffert?'<span style="text-decoration:line-through;opacity:.4">'+liv.toFixed(2)+' EUR</span>':livHT.toFixed(2)+' EUR')+'</td><td style="text-align:right;font-weight:900">'+(livOffert?'<strong style="color:#009D3A">0,00 EUR</strong>':livHT.toFixed(2)+' EUR')+'</td></tr>':''
    var remRow=remiseMontant>0?'<tr><td style="color:#CC0066;font-weight:900">Remise commerciale ('+remisePct+'%)</td><td></td><td></td><td style="text-align:right;color:#CC0066;font-weight:900">-'+remiseMontant.toFixed(2)+' EUR</td></tr>':''
    var logoSrc='data:image/jpeg;base64,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'
    var css=['* { margin:0; padding:0; box-sizing:border-box }','body { font-family: Arial, sans-serif; color: #191923; font-size: 11px; background: white }','@page { size: A4; margin: 0mm }','@media print { html { -webkit-print-color-adjust: exact; print-color-adjust: exact } .no-print { display:none !important } }','.page { width:210mm; min-height:297mm; padding:14mm 16mm 0 16mm; display:flex; flex-direction:column }','.content { flex:1 }','.yt { font-family: Yellowtail, cursive }','.header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:12px; border-bottom:3px solid #FF82D7; margin-bottom:16px }','.logo img { height:52px; width:auto }','.logo-sub { font-size:8px; color:#aaa; margin-top:3px }','.doc-type { font-family:Yellowtail,cursive; font-size:38px; color:#191923; text-align:right; line-height:1 }','.doc-num { font-size:10px; color:#888; text-align:right; margin-top:3px }','.parties { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px }','.party { background:#F8F8F8; border-radius:5px; padding:11px 13px; border-left:3px solid #FFEB5A }','.party.client { border-left-color:#FF82D7 }','.party-label { font-family:Yellowtail,cursive; font-size:14px; color:#888; margin-bottom:5px }','.party-name { font-size:13px; font-weight:900; margin-bottom:3px }','.party-detail { font-size:9px; color:#555; margin-top:1px; line-height:1.5 }','.badge { display:inline-block; background:#FFEB5A; border:1.5px solid #191923; border-radius:3px; padding:2px 8px; font-family:Yellowtail,cursive; font-size:13px; margin-top:6px }','table { width:100%; border-collapse:collapse; margin-bottom:14px }','thead th { padding:8px 10px; font-size:8px; text-transform:uppercase; letter-spacing:1px; font-weight:900; color:#191923; border-top:2px solid #191923; border-bottom:2px solid #191923 }','tbody td { padding:7px 10px; border-bottom:1px solid #EBEBEB; font-size:10.5px }','tr:nth-child(even) td { background:#FAFAFA }','.totals-wrap { display:flex; justify-content:flex-end; margin-bottom:14px }','.totals { width:260px }','.t-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #EBEBEB; font-size:11px }','.t-row.gray { color:#999; font-size:9.5px }','.t-final { display:flex; justify-content:space-between; align-items:center; padding:9px 12px; background:#FFEB5A; border:2px solid #191923; border-radius:4px; margin-top:6px }','.t-final .lbl { font-family:Yellowtail,cursive; font-size:22px; color:#191923 }','.t-final .amt { font-weight:900; font-size:15px; color:#191923 }','.per-person { text-align:right; font-size:9px; color:#aaa; margin-top:3px }','.rib { border:1.5px solid #191923; border-radius:5px; padding:12px 14px; margin-bottom:14px; background:#FAFAFA }','.rib-title { font-family:Yellowtail,cursive; font-size:17px; color:#FF82D7; margin-bottom:8px }','.rib-grid { display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:10px }','.rib-item label { display:block; font-size:7px; text-transform:uppercase; letter-spacing:1px; color:#aaa; margin-bottom:2px }','.rib-item span { font-size:10px; font-weight:900; font-family:monospace }','.cond-title { font-family:Yellowtail,cursive; font-size:14px; margin-bottom:2px }','.cond { font-size:9.5px; color:#555; margin-bottom:14px; line-height:1.6 }','.notes { background:#FFFDE7; border-left:3px solid #FFEB5A; padding:8px 12px; margin-bottom:12px; font-size:10px }','.footer { padding:12px 0 8px 0; border-top:1px solid #EBEBEB; margin-top:auto }','.legal { font-size:7px; color:#ccc; line-height:1.7; margin-bottom:8px }','.pink-bar { background:#FF82D7; padding:7px 14px; border-radius:4px; text-align:center; font-family:Yellowtail,cursive; font-size:16px; color:#191923 }'].join(' ')
    var html='<!DOCTYPE html><html><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet"><title>'+titre+' '+numero+'</title><style>'+css+'</style></head><body><div class="page"><div class="content"><div class="header"><div class="logo"><img src="'+logoSrc+'" alt="meshuga"><div class="logo-sub">Crazy Deli &nbsp;&middot;&nbsp; 3 rue Vavin, 75006 Paris</div></div><div><div class="doc-type">'+titre+'</div><div class="doc-num">N&deg; '+numero+'</div><div class="doc-num">'+new Date().toLocaleDateString('fr-FR')+'</div></div></div><div class="parties"><div class="party"><div class="party-label">Emetteur</div><div class="party-name">SAS AEGIA FOOD</div><div class="party-detail">Enseigne : Meshuga Crazy Deli</div><div class="party-detail">3 rue Vavin, 75006 Paris</div><div class="party-detail">SIRET : 904 639 531 00014</div><div class="party-detail">TVA : FR31904639531</div><div class="party-detail">hello@meshuga.fr</div></div><div class="party client"><div class="party-label">Client</div><div class="party-name">'+dv.client_nom+'</div>'+(dv.client_contact?'<div class="party-detail">'+dv.client_contact+'</div>':'')+(dv.client_email?'<div class="party-detail">'+dv.client_email+'</div>':'')+((dv.event_date||dv.event_lieu)?'<div class="party-detail" style="margin-top:5px"><strong>Evénement :</strong> '+(dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):'')+(dv.event_lieu?' &mdash; '+dv.event_lieu:'')+'</div>':'')+'<div class="badge">'+dv.nb_personnes+' personnes</div></div></div><table><thead><tr><th style="text-align:left;width:52%">Désignation</th><th style="text-align:center;width:10%">Qte</th><th style="text-align:right;width:19%">PU HT</th><th style="text-align:right;width:19%">Total HT</th></tr></thead><tbody>'+items+mepRow+livRow+remRow+'</tbody></table><div class="totals-wrap"><div class="totals"><div class="t-row"><span>Total HT</span><span style="font-weight:900">'+totalHT.toFixed(2)+' EUR</span></div><div class="t-row gray"><span>TVA 5,5%</span><span>'+tva.toFixed(2)+' EUR</span></div><div class="t-final"><span class="lbl">Total TTC</span><span class="amt">'+totalTTC.toFixed(2)+' EUR</span></div><div class="per-person">soit '+parseFloat(totalTTC/dv.nb_personnes).toFixed(2)+' EUR TTC / personne</div></div></div><div class="rib"><div class="rib-title">'+(isFacture?'Règlement par virement bancaire':'Coordonnées bancaires pour l&#39;acompte')+'</div><div class="rib-grid"><div class="rib-item"><label>Titulaire</label><span>SAS AEGIA FOOD</span></div><div class="rib-item"><label>Banque</label><span>Banque Populaire</span></div><div class="rib-item"><label>IBAN</label><span>FR76 1020 7000 8723 2175 3218 077</span></div><div class="rib-item"><label>BIC</label><span>CCBPFRPPMTG</span></div></div></div>'+(dv.notes?'<div class="notes"><strong>Notes :</strong> '+dv.notes+'</div>':'')+'<div class="cond-title">Conditions de règlement</div><div class="cond">'+(isFacture?'Virement bancaire &mdash; 30% à la commande, solde 72h avant l&#39;événement.':'30% à la commande, solde 72h avant l&#39;événement. Devis valable 30 jours.')+'</div></div><div class="footer"><div class="legal">SAS AEGIA FOOD (enseigne Meshuga) &mdash; SASU &mdash; Capital social : 1 000 EUR &mdash; RCS Paris &mdash; SIRET 904 639 531 00014 &mdash; Code APE : 56.10C &mdash; TVA intracommunautaire : FR31904639531 &mdash; 3 rue Vavin, 75006 Paris<br>'+(isFacture?'Conformément à la loi, tout retard de paiement entra&icirc;ne l&#39;exigibilité de pénalités d&#39;un taux égal à 3 fois le taux d&#39;intérêt légal, ainsi qu&#39;une indemnité forfaitaire de 40 EUR pour frais de recouvrement.':'TVA sur les produits alimentaires à taux réduit de 5,5%. Prix HT en euros. Tout commencement d&#39;exécution vaut acceptation du présent devis.')+'</div><div class="pink-bar">meshuga &mdash; crazy deli &mdash; 3 rue vavin, paris 6e &mdash; hello@meshuga.fr</div></div></div><div class="no-print" style="text-align:center;padding:20px;background:#F8F8F8;border-top:2px solid #EBEBEB"><p style="margin-bottom:10px;font-size:11px;color:#888">Dans la fenêtre d&#39;impression : décochez <strong>En-têtes et pieds de page</strong> puis <strong>Enregistrer en PDF</strong></p><button onclick="document.fonts.ready.then(function(){window.print()})" style="padding:11px 28px;background:#191923;color:#FFEB5A;border:none;border-radius:5px;font-size:13px;font-weight:900;cursor:pointer">&#128229; Imprimer / PDF</button></div></body></html>'
    var w=window.open('','_blank'); w.document.write(html); w.document.close(); w.focus()
  }

  function contactProspect(id) {
    var pros = chasse.find(function(x) { return x.id === id })
    var today = new Date().toISOString().split('T')[0]
    var relDate = new Date(); relDate.setDate(relDate.getDate() + 3)
    var relDateStr = relDate.toISOString().split('T')[0]
    setChasse(function(prev) { return prev.map(function(x) { return x.id === id ? Object.assign({}, x, {status: 'contacted', contacted: true, contactedDate: today, lastAction: 'Contact le ' + today, relanceDate: relDateStr, relanceStatut: 'en_attente'}) : x }) })
    setContactedToday(function(n) { return n + 1 })
    if (pros) {
      setTasks(function(prev) { return prev.concat([{id: 'rel-' + id + '-' + Date.now(), title: 'Relancer ' + pros.name, assignee: 'emy', priority: 'medium', status: 'todo', deadline: relDateStr, checklist: [], files: [], chasseId: id}]) })
      var alreadyInCrm = prospects.find(function(p) { return p.name === pros.name })
      if (!alreadyInCrm) {
        var newProspect = {
          id: 'crm-' + id + '-' + Date.now(),
          name: pros.name,
          email: pros.email || '',
          phone: pros.phone || '',
          size: pros.taille || '',
          category: (pros.cat && pros.cat.charAt(0).toUpperCase() + pros.cat.slice(1)) || 'Autre',
          status: 'contacted',
          temperature: 'tiede',
          nextDate: relDateStr,
          nextAction: 'Relance J+3',
          notes: pros.pitch || '',
          ca: 0,
          score: pros.score || 5,
          files: [],
          chasseId: id,
          contactedDate: today,
        }
        setProspects(function(prev) { return prev.concat([newProspect]) })
        toast('Contacté ! Ajouté au CRM — Relance dans 3 jours')
      } else {
        setProspects(function(prev) { return prev.map(function(p) { return p.name === pros.name ? Object.assign({}, p, {status: 'contacted', nextDate: relDateStr, nextAction: 'Relance J+3'}) : p }) })
        toast('Contacté ! Pipeline CRM mis à jour')
      }
    }
    logActivity('prospect_contacte', 'Prospect contacte : ' + (pros ? pros.name : id), pros ? pros.name : id, null)
  }

  function relanceProspect(id) {
    var pros = chasse.find(function(x) { return x.id === id })
    var today = new Date().toISOString().split('T')[0]
    var next = new Date(); next.setDate(next.getDate() + 7)
    var nextStr = next.toISOString().split('T')[0]
    setChasse(function(prev) { return prev.map(function(x) { return x.id === id ? Object.assign({}, x, {lastAction: 'Relance le ' + today, relanceDate: nextStr, relanceStatut: 'relance'}) : x }) })
    setTasks(function(prev) { return prev.filter(function(t) { return t.chasseId !== id }).concat([{id: 'rel2-' + id + '-' + Date.now(), title: 'Suivi ' + (pros ? pros.name : id) + ' - en attente reponse', assignee: 'emy', priority: 'high', status: 'todo', deadline: nextStr, checklist: [], files: [], chasseId: id}]) })
    logActivity('prospect_relance', 'Relance : ' + (pros ? pros.name : id), pros ? pros.name : id, null)
    toast('Relance! Suivi dans 7 jours')
  }

  function reponseProspect(id, rep) {
    var pros = chasse.find(function(x) { return x.id === id })
    var today = new Date().toISOString().split('T')[0]
    var newSt = rep === 'interesse' ? 'nego' : rep === 'lost' ? 'lost' : 'contacted'
    var action = rep === 'interesse' ? 'Interesse !' : rep === 'lost' ? 'Pas interesse' : 'A rappeler'
    setChasse(function(prev) { return prev.map(function(x) { return x.id === id ? Object.assign({}, x, {status: newSt, lastAction: action + ' - ' + today, relanceStatut: rep}) : x }) })
    setTasks(function(prev) { return prev.filter(function(t) { return t.chasseId !== id }) })
    if (rep === 'interesse' && pros) {
      setTasks(function(prev) { return prev.concat([{id: 'nego-' + id + '-' + Date.now(), title: 'NEGO - Envoyer devis a ' + pros.name, assignee: 'emy', priority: 'high', status: 'todo', deadline: today, checklist: ['Preparer devis', 'Envoyer via module Devis', 'Fixer RDV'], files: [], chasseId: id}]) })
      toast('Super ! En nego - devis a preparer !')
    } else if (rep === 'rappeler' && pros) {
      var next2 = new Date(); next2.setDate(next2.getDate() + 14)
      setTasks(function(prev) { return prev.concat([{id: 'rap-' + id + '-' + Date.now(), title: 'Rappeler ' + pros.name + ' dans 2 semaines', assignee: 'emy', priority: 'medium', status: 'todo', deadline: next2.toISOString().split('T')[0], checklist: [], files: [], chasseId: id}]) })
      toast('Rappel dans 2 semaines')
    } else if (rep === 'lost') {
      toast('OK, prospect archive.')
    }
  }
  async function generateEmail(p, emailType) {
    setEmailProspect(p)
    setGeneratingEmail(true)
    setGeneratedEmail('')
    openModal('email', p)
    const senderName = isEmy ? 'Emy, B2B Manager' : 'Edward, patron'
    const senderSig = isEmy ? 'Emy' : 'Edward'
    const isRelance = emailType === 'relance'
    const isDevisRelance = emailType === 'devis_relance'
    const pressLinks = [
      {name: 'Paris Première', url: 'https://www.facebook.com/watch/?v=648051137321383'},
      {name: 'Telerama', url: 'https://www.telerama.fr/restos-loisirs/meshuga-de-la-street-food-de-haut-niveau-pres-du-jardin-du-luxembourg_cri-7043251.php'},
      {name: 'Konbini', url: 'https://www.konbini.com/food/on-a-teste-meshuga-le-deli-aux-sandwiches-les-plus-confort-du-moment/'},
      {name: 'Les Echos', url: 'https://www.lesechos.fr/weekend/gastronomie-vins/ou-manger-les-meilleurs-grilled-cheese-1873791'},
      {name: 'Do It In Paris', url: 'https://www.doitinparis.com/fr/street-food-usa-paris-26393'},
      {name: 'Grazia', url: 'https://www.grazia.fr/cuisine/surprenantes-regressives-ou-rafraichissantes-les-meilleures-adresses-ou-deguster-de-bonnes-glaces-cet-ete-a-paris-773498.html'},
      {name: 'Magazine Acumen', url: 'https://magazine-acumen.com/gastronomie/meshuga-la-nouvelle-adresse-qui-fait-bouger-la-rive-gauche-parisienne/'}
    ]
    const pick3 = pressLinks.sort(function(){return Math.random()-0.5}).slice(0,3)
    const pressNames = pick3.map(function(l){return l.name}).join(', ')
    var baseContext = 'Tu es ' + senderName + ' de Meshuga Crazy Deli (3 rue Vavin Paris 6e). Deli new-yorkais premium, NY-style, Paris 6e, connu par '+pressNames+'.\n\n'
    var prospectInfo = 'Prospect : '+p.name+' ('+p.category+')'+( p.size?' — '+p.size+' personnes':'')+'\n'
    var relanceContext = ''
    if (isRelance) {
      relanceContext = 'TU ECRIS UN EMAIL DE RELANCE DOUX (2ème contact). Tu as déjà contacté ce prospect. Le ton doit être chaleureux, jamais insistant. Propose une des options suivantes selon le contexte : (1) demander si des questions ou des précisions sur votre offre, (2) proposer de venir déjeuner gratuitement pour découvrir, (3) proposer un appel de 10min pour adapter loffre. Réfère-toi subtilement au premier contact. Mentionne 1 lien presse parmi ceux fournis pour rappeler la crédibilité. Objet : court et engageant. Max 100 mots. Ton : humain, léger, bienveillant.\n' + 'Liens presse disponibles : '+pick3.map(function(l){return l.name+' ('+l.url+')'}).join(', ')+'\n'
    } else if (isDevisRelance) {
      relanceContext = 'TU ECRIS UN EMAIL DE SUIVI DEVIS (très doux). Tu as envoyé un devis. Demande si tout est clair, si besoin précisions. Propose un appel de 5min ou une visite déjeuner offerte pour en discuter. Mentionne 1 lien presse pour rappeler la qualité. Jamais pressant. Max 90 mots.\n' + 'Liens presse : '+pick3.map(function(l){return l.name+' ('+l.url+')'}).join(', ')+'\n'
    } else {
      relanceContext = 'TU ECRIS UN PREMIER EMAIL DE PROSPECTION. Ton : chaleureux, humain, jamais commercial. Montre que tu connais leur univers. Propose un déjeuner découverte offert ou un plateau pour leur équipe. Court (120 mots max). Intègre naturellement 1 lien presse parmi ceux fournis.\n' + 'Liens presse : '+pick3.map(function(l){return l.name+' ('+l.url+')'}).join(', ')+'\n'
    }
    const prompt = baseContext + prospectInfo + relanceContext + 'Signature : '+senderSig+'. Réponds UNIQUEMENT avec le corps de l\'email en français. Commence par l\'objet sur la 1ère ligne (format : "Objet : ...") puis le corps.'
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({prompt: prompt, type: emailType || 'first'})
      })
      if (!res.ok) {
        setGeneratedEmail('Erreur serveur (' + res.status + '). Réessaie.')
        setGeneratingEmail(false)
        return
      }
      const data = await res.json()
      const text = data.text || data.email || data.content || ''
      setGeneratedEmail(text || 'Réponse vide. Réessaie.')
      if (text) {
        logActivity('email_genere', 'Email IA généré pour ' + p.name + ' (par ' + (isEmy?'Emy':'Edward') + ')', p.name, null)
      }
    } catch(e) {
      setGeneratedEmail('Erreur : ' + String(e.message || e))
    }
    setGeneratingEmail(false)
  }

  function openModal(type, data) {
    setModal(type)
    setForm(data || {})
  }

  function closeModal() {
    setModal('')
    setForm({})
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
  var zeltyUpdated = zeltyData && zeltyData.lastUpdated ? new Date(zeltyData.lastUpdated).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}) : '--'
  var zeltyEvol = zeltyData && zeltyData.evolution && zeltyData.evolution[zeltyPeriod] !== null && zeltyData.evolution[zeltyPeriod] !== undefined ? (zeltyData.evolution[zeltyPeriod] >= 0 ? '+' : '') + zeltyData.evolution[zeltyPeriod] + '%' : '--'
  var zeltyEvolColor = zeltyData && zeltyData.evolution && zeltyData.evolution[zeltyPeriod] !== null && zeltyData.evolution[zeltyPeriod] !== undefined ? (zeltyData.evolution[zeltyPeriod] >= 0 ? '#009D3A' : '#CC0066') : '#888'
  const NAV = [
    {id: 'dash', label: 'Dashboard', icon: '⚡'},
    {id: 'chasse', label: 'Tableau de chasse', icon: '🎯'},
    {id: 'crm', label: 'CRM Prospects', icon: '◎'},
    {id: 'devis', label: 'Devis', icon: '📄'},
    {id: 'annuaire', label: 'Annuaire', icon: '📒'},
    {id: 'reporting', label: 'Reporting', icon: '📋'},
    {id: 'vault', label: 'Coffre-fort', icon: '🔐'},
    {id: 'gmb', label: 'Google My Biz.', icon: '⭐'},
    {id: 'instagram', label: 'Instagram', icon: '📸'},
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
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:36,lineHeight:1.1}}>{isEmy ? 'Bonjour Emy' : 'Bonjour Edward'}</div>
                  <div className="ps">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
                </div>
                {isEmy && <button className="btn btn-p btn-sm" onClick={function(){openModal('cr',{})}}>+ Nouveau CR</button>}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
                <div className="kc" style={{background:'#FFFFFF',cursor:'pointer'}} onClick={function(){nav('devis')}}>
                  <div className="kl" style={{fontSize:10,textTransform:"uppercase",letterSpacing:.5}}>Pipeline B2B 🎯</div>
                  <div style={{display:'flex',gap:12,alignItems:'flex-end',marginTop:6,flexWrap:'wrap'}}>
                    <div>
                      <div className="kv" style={{fontSize:30,lineHeight:1}}>{devisList.filter(function(d){return d.statut==='envoye'||d.statut==='a_modifier'}).length}</div>
                      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:11,color:'#005FFF',marginTop:2}}>devis en attente</div>
                    </div>
                    <div style={{fontWeight:900,fontSize:14,opacity:.2,paddingBottom:2}}>·</div>
                    <div>
                      <div className="kv" style={{fontSize:30,lineHeight:1,color:'#CC6600'}}>{devisList.filter(function(d){return d.statut==='envoye'||d.statut==='a_modifier'}).reduce(function(s,d){return s+(parseFloat(d.total_ht)||d.montantHT||0)},0).toLocaleString('fr-FR',{maximumFractionDigits:0})} <span style={{fontSize:12}}>€ HT</span></div>
                      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:11,color:'#CC6600',marginTop:2}}>CA potentiel</div>
                    </div>
                    <div style={{fontWeight:900,fontSize:14,opacity:.2,paddingBottom:2}}>·</div>
                    <div>
                      <div className="kv" style={{fontSize:30,lineHeight:1,color:'#FF82D7'}}>{prospects.filter(function(p){return p.status!=='won'&&p.status!=='lost'}).length}</div>
                      <div style={{fontFamily:"'Yellowtail',cursive",fontSize:11,color:'#FF82D7',marginTop:2}}>prospects actifs</div>
                    </div>
                  </div>
                  <div className="ki" style={{opacity:.05}}>🎯</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={function(){nav('devis')}}>
                  <div className="kl">CA B2B signé</div>
                  <div className="kv" style={{fontSize:30}}>{devisList.filter(function(d){return d.statut==='paye'||d.statut==='facture'||d.statut==='accepte'}).reduce(function(s,d){return s+(d.montantHT||0)},0).toLocaleString('fr-FR')} <span style={{fontSize:12,opacity:.4}}>€ HT</span></div>
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:13,marginTop:4,color:'#00AA44'}}>{devisList.filter(function(d){return d.statut==='paye'||d.statut==='facture'||d.statut==='accepte'}).length} contrats signés</div>
                  <div className="ki" style={{opacity:.1}}>📈</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF',cursor:'pointer'}} onClick={function(){nav('devis')}}>
                  <div className="kl">CA à closer 🎯</div>
                  <div className="kv" style={{fontSize:30}}>{devisList.filter(function(d){return d.statut==='envoye'||d.statut==='accepte'}).reduce(function(s,d){return s+(parseFloat(d.total_ttc)||0)},0).toLocaleString('fr-FR',{maximumFractionDigits:0})} <span style={{fontSize:10}}>€</span></div>
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:13,marginTop:4,opacity:.7}}>{devisList.filter(function(d){return d.statut==='envoye'||d.statut==='accepte'}).length} devis en attente</div>
                  <div className="ki" style={{opacity:.1}}>🎯</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={function(){nav('chasse')}}>
                  <div className="kl">Prospectés</div>
                  <div className="kv" style={{fontSize:30}}>{chasse.filter(function(p){return p.contacted}).length} <span style={{fontSize:16,fontWeight:400,opacity:.3}}>/ {chasse.length}</span></div>
                  <div style={{fontFamily:"'Yellowtail',cursive",fontSize:13,marginTop:4,color:'rgba(25,25,35,.35)'}}>{chasse.length>0?Math.round(chasse.filter(function(p){return p.contacted}).length/chasse.length*100):0}% contactés</div>
                  <div className="ki" style={{opacity:.1}}>🎯</div>
                </div>

              </div>



              {/* TACHES DU JOUR */}
              <div className="card" style={{marginBottom:10,borderLeft:'4px solid #FF82D7'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div className="yt" style={{fontSize:22}}>📋 Tâches</div>
                  <button className="btn btn-p btn-sm" style={{fontWeight:900}} onClick={function(){openModal('task',{assignee:isEmy?'emy':'edward',priority:'medium',status:'todo',checklist:[],files:[],deadline:new Date().toISOString().split('T')[0]})}}>+ Tâche</button>
                </div>
                {(function(){
                  var today=new Date().toISOString().split('T')[0]
                  var todayTasks=tasks.filter(function(t){return t.deadline===today&&t.status!=='done'})
                  var lateTasks=tasks.filter(function(t){return t.deadline&&t.deadline<today&&t.status!=='done'})
                  var upcoming=tasks.filter(function(t){var d=new Date(t.deadline||'9999');var n=new Date();n.setDate(n.getDate()+7);return t.deadline>today&&d<=n&&t.status!=='done'}).slice(0,3)
                  if(todayTasks.length===0&&lateTasks.length===0){
                    return <div style={{fontSize:15,opacity:.5,padding:'10px 0'}}>✅ Aucune tâche urgente aujourd'hui !</div>
                  }
                  return(
                    <div>
                      {lateTasks.slice(0,3).map(function(t){return(
                        <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',marginBottom:4,background:'#FFE5E5',borderRadius:5,border:'1px solid #CC0066'}}>
                          <input type="checkbox" onChange={function(){setTasks(function(prev){return prev.map(function(x){return x.id===t.id?Object.assign({},x,{status:'done'}):x})})}} style={{cursor:'pointer'}} />
                          <div style={{flex:1}}>
                            <div style={{fontSize:17,fontWeight:900,color:'#CC0066'}}>⚠️ {t.title}</div>
                            <div style={{fontSize:14,opacity:.7}}>{t.assignee} · Deadline dépassée : {t.deadline}</div>
                          </div>
                        </div>
                      )})}
                      {todayTasks.map(function(t){return(
                        <div key={t.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',marginBottom:4,background:'#FFF8E7',borderRadius:5,border:'1px solid #FFEB5A'}}>
                          <input type="checkbox" onChange={function(){setTasks(function(prev){return prev.map(function(x){return x.id===t.id?Object.assign({},x,{status:'done'}):x})})}} style={{cursor:'pointer'}} />
                          <div style={{flex:1}}>
                            <div style={{fontSize:12,fontWeight:900}}>{t.title}</div>
                            <div style={{fontSize:10,opacity:.6}}>{t.assignee} · Priorité : {t.priority}</div>
                          </div>
                        </div>
                      )})}
                      {upcoming.length>0&&<div style={{fontSize:10,opacity:.4,marginTop:4}}>+ {upcoming.length} tâche(s) cette semaine</div>}
                    </div>
                  )
                })()}
              </div>

              {/* PLANNING */}
              <div className="card" style={{padding:0,overflow:'hidden',marginBottom:10}}>
                <div style={{padding:'14px 16px',borderBottom:'1px solid #EBEBEB',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                  <div className="yt" style={{fontSize:22}}>Planning {isEmy?"de ma semaine":"d'Emy"}</div>
                  <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
                    <div style={{display:'flex',background:'#EBEBEB',borderRadius:5,overflow:'hidden'}}>
                      {['auj','3j','sem'].map(function(v){return(
                        <button key={v} style={{padding:'4px 10px',fontSize:10,fontWeight:900,background:planningView===v?'#191923':'transparent',color:planningView===v?'#FFEB5A':'#191923',border:'none',cursor:'pointer'}} onClick={function(){setPlanningView(v)}}>{v==='auj'?'Aujourd\'hui':v==='3j'?'3 jours':'Semaine'}</button>
                      )})}
                    </div>
                    <button className="btn btn-sm btn-y" onClick={function(){setPlanningWeek(function(w){return w-1})}}>&#8592;</button>
                    <span style={{fontSize:11,fontWeight:900,minWidth:100,textAlign:'center'}}>{planningWeek===0?'Cette semaine':planningWeek<0?'Sem. -'+Math.abs(planningWeek):'Sem. +'+planningWeek}</span>
                    <button className="btn btn-sm btn-y" onClick={function(){setPlanningWeek(function(w){return w+1})}}>&#8594;</button>
                    {planningWeek!==0&&<button className="btn btn-p btn-sm" onClick={function(){setPlanningWeek(0)}}>Auj.</button>}
                    <button className="btn btn-p btn-sm" style={{fontWeight:900}} onClick={function(){openModal('task',{assignee:'emy',priority:'medium',status:'todo',checklist:[],files:[],deadline:new Date().toISOString().split('T')[0]})}}>+ Tâche</button>
                  </div>
                </div>
                <div style={{padding:'12px 14px'}}>
                  <div style={{display:'grid',gridTemplateColumns:planningView==='auj'?'1fr':planningView==='3j'?'repeat(3,1fr)':'repeat(5,1fr)',gap:6}}>
                    {(planningView==='auj'?[['Lundi','Mardi','Mercredi','Jeudi','Vendredi'][new Date().getDay()===0?4:new Date().getDay()-1]]:planningView==='3j'?['Lundi','Mardi','Mercredi']:['Lun','Mar','Mer','Jeu','Ven']).map(function(day,di){
                      var ws=new Date()
                      var dow=ws.getDay()===0?6:ws.getDay()-1
                      ws.setDate(ws.getDate()-dow+(planningWeek*7))
                      var dd=new Date(ws)
                      dd.setDate(ws.getDate()+di)
                      var ds=dd.toISOString().split('T')[0]
                      var isToday=ds===new Date().toISOString().split('T')[0]
                      var isPast=dd<new Date(new Date().toDateString())
                      var isFriday=di===4
                      var isMonday=di===0
                      var isWednesday=di===2
                      var dayTasksEmy=tasks.filter(function(t){return t.deadline===ds&&t.assignee==='emy'})
                      var dayTasksEdward=tasks.filter(function(t){return t.deadline===ds&&t.assignee==='edward'})
                      var dayRelances=prospects.filter(function(p){return p.nextDate===ds&&p.status!=='won'&&p.status!=='lost'})
                      var hasLate=isPast&&dayTasksEmy.some(function(t){return t.status!=='done'})
                      var allDone=dayTasksEmy.length>0&&dayTasksEmy.every(function(t){return t.status==='done'})

                      var headerBg=isToday?'#FF82D7':hasLate?'#FFD0E0':allDone?'#D0F5E0':'#FFEB5A'
                      var headerColor=isToday?'#191923':hasLate?'#CC0066':allDone?'#006B2B':'#191923'
                      var borderColor=isToday?'#FF82D7':hasLate?'#CC0066':allDone?'#009D3A':'#EBEBEB'

                      var autoTodos=[]
                      autoTodos.push({key:'prospects',label:'Appeler 5 nouveaux prospects',done:isToday&&contactedToday>=5,urgent:false})
                      autoTodos.push({key:'emails',label:'Envoyer 3 emails B2B personnalisés',done:false,urgent:false})
                      if(dayRelances.length>0){
                        dayRelances.slice(0,2).forEach(function(p){
                          autoTodos.push({key:'relance-'+p.id,label:'Relancer : '+p.name,done:false,urgent:true})
                        })
                      }
                      if(isMonday){
                        autoTodos.push({key:'pipeline',label:'Revoir pipeline CRM complet',done:false,urgent:false})
                        autoTodos.push({key:'objectifs',label:'Fixer objectifs de la semaine',done:false,urgent:false})
                      }
                      if(isWednesday){
                        autoTodos.push({key:'devis',label:'Suivre devis en attente de réponse',done:false,urgent:false})
                        autoTodos.push({key:'gmb',label:'Vérifier avis Google My Business',done:false,urgent:false})
                      }
                      if(isFriday){
                        autoTodos.push({key:'cr',label:'Remplir CR hebdomadaire',done:reports.length>0,urgent:false})
                        autoTodos.push({key:'bilan',label:'Bilan semaine + prop. 1 nouveauté',done:false,urgent:false})
                      }

                      return(
                        <div key={day} style={{borderRadius:6,border:'2px solid '+borderColor,overflow:'hidden',display:'flex',flexDirection:'column'}}>
                          <div style={{background:headerBg,padding:'6px 8px',borderBottom:'1px solid '+borderColor}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                              <div className="yt" style={{fontSize:20,color:headerColor}}>{day}</div>
                              <div style={{fontSize:13,fontWeight:900,opacity:.7,color:headerColor}}>{dd.getDate()}/{dd.getMonth()+1}</div>
                            </div>
                          </div>
                          <div style={{padding:planningView==='auj'?'14px':'7px',flex:1,background:'#FFFFFF',minHeight:planningView==='auj'?280:200}}>
                            {autoTodos.map(function(todo){
                              return(
                                <div key={todo.key} style={{display:'flex',alignItems:'center',gap:planningView==='auj'?8:4,marginBottom:6}}>
                                  <input type="checkbox" checked={!!todo.done} readOnly style={{width:planningView==='auj'?16:11,height:planningView==='auj'?16:11,flexShrink:0,marginTop:1,flexShrink:0,accentColor:todo.urgent?'#CC0066':'#FF82D7'}}/>
                                  <span style={{fontSize:planningView==='auj'?16:13,fontWeight:todo.urgent?900:500,color:todo.urgent?'#CC0066':'#333',textDecoration:todo.done?'line-through':'none',opacity:todo.done?.4:1,lineHeight:1.4}}>{todo.label}</span>
                                </div>
                              )
                            })}
                            {dayTasksEmy.length>0&&(
                              <div style={{borderTop:'1px dashed #EBEBEB',marginTop:5,paddingTop:5}}>
                                {dayTasksEmy.map(function(t){
                                  return(
                                    <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:4,marginBottom:4,cursor:'pointer'}} onClick={function(){
                                      setTasks(function(prev){return prev.map(function(x){return x.id!==t.id?x:Object.assign({},x,{status:t.status==='done'?'todo':'done'})})})
                                    }}>
                                      <input type="checkbox" checked={t.status==='done'} readOnly style={{width:planningView==='auj'?16:11,height:planningView==='auj'?16:11,flexShrink:0,height:11,marginTop:1,flexShrink:0,accentColor:'#191923'}}/>
                                      <span style={{fontSize:planningView==='auj'?16:13,fontWeight:t.priority==='high'?900:600,textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?.4:1,color:t.priority==='high'?'#CC0066':'#191923',lineHeight:1.4}}>{t.title}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                            {dayTasksEdward.length>0&&(
                              <div style={{borderTop:'1px dashed #EBEBEB',marginTop:4,paddingTop:4}}>
                                {dayTasksEdward.map(function(t){
                                  return(
                                    <div key={t.id} style={{display:'flex',alignItems:'center',gap:planningView==='auj'?8:4,marginBottom:6}}>
                                      <input type="checkbox" checked={t.status==='done'} readOnly style={{width:planningView==='auj'?16:11,height:planningView==='auj'?16:11,flexShrink:0,accentColor:'#FFEB5A'}}/>
                                      <span style={{fontSize:planningView==='auj'?16:13,fontWeight:600,lineHeight:1.4,textDecoration:t.status==='done'?'line-through':'none'}}>&#128081; {t.title}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{display:'flex',gap:14,marginTop:8,fontSize:8.5,flexWrap:'wrap',opacity:.5}}>
                    <span style={{color:'#FF82D7',fontWeight:900}}>&#9679; Aujourd&#39;hui</span>
                    <span style={{color:'#CC0066',fontWeight:900}}>&#9679; En retard</span>
                    <span style={{color:'#009D3A',fontWeight:900}}>&#9679; Tout fait</span>
                    <span>&#9745; Cliquer pour cocher une tâche</span>
                  </div>
                </div>
              </div>

              {!isEmy&&reports.length>0&&(
                <div className="card">
                  <div className="ct">Dernier CR d&#39;Emy</div>
                  <div style={{fontWeight:900,fontSize:16,marginBottom:8}}>{reports[0].week}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                    <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{reports[0].prospects}</div><div className="yt" style={{fontSize:11,opacity:.6}}>Prospects</div></div>
                    <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{reports[0].rdv}</div><div className="yt" style={{fontSize:11,opacity:.6}}>RDV</div></div>
                    <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}><div style={{fontWeight:900,fontSize:20}}>{reports[0].cmds}</div><div className="yt" style={{fontSize:11,opacity:.6}}>Commandes</div></div>
                  </div>
                  <button className="btn btn-y btn-sm" style={{marginTop:8}} onClick={function(){nav('reporting')}}>Voir et répondre →</button>
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
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                      <button className="btn btn-p btn-sm" onClick={function() { generateEmail(p) }}>✉️ Email IA</button>
                      <button className="btn btn-sm" style={{fontSize:10,background:'#FFEB5A',border:'2px solid #191923'}} onClick={function() { openModal('editChasse', Object.assign({},p)) }}>✏️ Modifier</button>
                      {p.status === 'to_contact' && <button className="btn btn-g btn-sm" onClick={function() { contactProspect(p.id) }}>📞 Contacté</button>}
                      {p.status === 'contacted' && (
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                          {(!p.relanceStatut || p.relanceStatut === 'en_attente') && <button className="btn btn-sm" style={{background:'#005FFF',color:'#fff',fontSize:11}} onClick={function() { relanceProspect(p.id) }}>↩ Relancer</button>}
                          {p.relanceStatut === 'relance' && <span style={{fontSize:9,fontWeight:900,padding:'3px 7px',background:'#FF6B2B',color:'#fff',borderRadius:3}}>↩ Relancé</span>}
                          <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={function() { reponseProspect(p.id,'interesse') }}>✅ Intéressé</button>
                          <button className="btn btn-sm" style={{background:'#FF6B2B',color:'#fff',fontSize:10}} onClick={function() { reponseProspect(p.id,'rappeler') }}>📞 Rappeler</button>
                          <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function() { reponseProspect(p.id,'lost') }}>✗ Non</button>
                        </div>
                      )}
                      {p.status === 'nego' && <button className="btn btn-g btn-sm" onClick={function() { setChasse(function(prev) { return prev.map(function(x) { return x.id===p.id ? Object.assign({},x,{status:'won'}) : x }) }); toast('🎉 Gagné!') }}>🏆 Gagné!</button>}
                      {p.status === 'won' && <span style={{fontSize:9,fontWeight:900,padding:'3px 8px',background:'#009D3A',color:'#fff',borderRadius:3}}>🏆 Client</span>}
                    </div>
                    {p.lastAction && <div style={{fontSize:9,opacity:.45,marginTop:4,fontStyle:'italic'}}>{'→ '+p.lastAction+(p.relanceDate?' · relance '+p.relanceDate:'')}</div>}
                  </div>
                )
              })}
            </div>
          )}

          {page === 'crm' && (
            <div>
              <div className="ph">
                <div><div className="pt">CRM Prospects</div><div className="ps">{prospects.filter(function(p){return p.status!=='won'&&p.status!=='lost'}).length} actifs · {prospects.length} total</div></div>
                <button className="btn btn-y btn-sm" onClick={function() { openModal('prospect', {status:'contacted',temperature:'tiede',ca:0,files:[]}) }}>+ Nouveau</button>
              </div>

              {/* COMMISSION EMY */}
              {(function(){
                var now = new Date()
                var mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
                var yStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
                var filterFn = function(d) {
                  if (crmPeriod === 'month') return d.created_at && d.created_at >= mStart && (d.statut==='paye'||d.statut==='facture'||d.statut==='accepte')
                  if (crmPeriod === 'year') return d.created_at && d.created_at >= yStart && (d.statut==='paye'||d.statut==='facture'||d.statut==='accepte')
                  return d.statut==='paye'||d.statut==='facture'||d.statut==='accepte'
                }
                var caTotal = devisList.filter(filterFn).reduce(function(s,d){return s+(parseFloat(d.total_ht)||0)},0)
                var commission = caTotal * 0.10
                var periodLabel = crmPeriod==='month'?'Ce mois':crmPeriod==='year'?'Cette année':'Total'
                var pipeCA = devisList.filter(function(d){return d.statut==='envoye'}).reduce(function(s,d){return s+(parseFloat(d.total_ht)||0)},0)
                return (
                  <div style={{background:'#FFFFFF',borderRadius:10,padding:'18px 20px',marginBottom:12,border:'1.5px solid #EBEBEB',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10}}>
                      <div>
                        <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,color:'#191923',marginBottom:4}}>💰 Commission Emy</div>
                        <div style={{fontSize:11,color:'rgba(25,25,35,.7)',textTransform:'uppercase',letterSpacing:1}}>{periodLabel} · 10% du CA HT signé</div>
                      </div>
                      <div style={{display:'flex',gap:4}}>
                        {['month','year','all'].map(function(per){return(
                          <button key={per} className="btn btn-sm" style={{fontSize:9,padding:'3px 8px',background:crmPeriod===per?'#191923':'#F5F5F5',color:crmPeriod===per?'#FFEB5A':'#555',border:'1.5px solid '+(crmPeriod===per?'#191923':'#DDD')}} onClick={function(){setCrmPeriod(per)}}>{per==='month'?'Mois':per==='year'?'Année':'Total'}</button>
                        )})}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:14}}>
                      <div style={{background:'#F8F9FF',border:'1.5px solid #DDEEFF',borderRadius:7,padding:'12px 14px'}}>
                        <div style={{fontSize:12,color:'rgba(25,25,35,.7)',fontWeight:900,marginBottom:3,textTransform:'uppercase',letterSpacing:.5}}>CA B2B signé</div>
                        <div style={{fontWeight:900,fontSize:24,color:'#191923'}}>{caTotal.toLocaleString('fr-FR',{minimumFractionDigits:0})} <span style={{fontSize:12,opacity:.5}}>€ HT</span></div>
                        <div style={{fontSize:10,color:'#444',fontWeight:600,marginTop:2}}>{devisList.filter(filterFn).length} contrats</div>
                      </div>
                      <div style={{background:'#FFEB5A',borderRadius:7,padding:'12px 14px',border:'2px solid rgba(255,255,255,.3)'}}>
                        <div style={{fontSize:12,color:'rgba(25,25,35,.7)',fontWeight:900,marginBottom:3,textTransform:'uppercase',letterSpacing:.5}}>🎉 Commission</div>
                        <div style={{fontWeight:900,fontSize:24,color:'#191923'}}>{commission.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} <span style={{fontSize:12,opacity:.5}}>€</span></div>
                        <div style={{fontSize:10,color:'#333',fontWeight:700,marginTop:2}}>Bravo Emy 🚀</div>
                      </div>
                    </div>
                  {pipeCA>0&&(
                    <div style={{marginTop:10,padding:'8px 12px',background:'#EBF3FF',borderRadius:6,border:'1.5px solid #005FFF',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:900,color:'#005FFF',textTransform:'uppercase',letterSpacing:.5}}>🔄 Pipeline en attente</div>
                        <div style={{fontSize:11,color:'#555',marginTop:2}}>{devisList.filter(function(d){return d.statut==='envoye'}).length} devis non signés</div>
                      </div>
                      <div style={{fontWeight:900,fontSize:20,color:'#005FFF'}}>{pipeCA.toLocaleString('fr-FR',{maximumFractionDigits:0})} € <span style={{fontSize:10,opacity:.5}}>HT</span></div>
                    </div>
                  )}
                </div>
                )
              })()}

              {/* ACTIONS PRIORITAIRES */}
              <div style={{background:'#FFF9E5',borderRadius:7,padding:'12px 14px',marginBottom:10,border:'1.5px solid #FFEB5A'}}>
                <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:1,marginBottom:8,color:'#191923'}}>💡 Actions prioritaires</div>
                {(function(){
                  var acts=[];var tod=new Date().toISOString().split('T')[0];
                  var late=prospects.filter(function(p){return p.nextDate&&p.nextDate<=tod&&p.status!=='won'&&p.status!=='lost'})
                  var denv=devisList.filter(function(d){return d.statut==='envoye'})
                  var neg=prospects.filter(function(p){return p.status==='nego'})
                  var chaud=prospects.filter(function(p){return p.temperature==='chaud'&&p.status!=='won'&&p.status!=='lost'})
                  if(late.length>0)acts.push({e:'🔴',t:'URGENT — '+late.length+' relance(s) en retard : '+late.slice(0,2).map(function(p){return p.name}).join(', ')})
                  if(denv.length>0)acts.push({e:'💶',t:'Relancer '+denv.length+' devis — '+denv.reduce(function(s,d){return s+(parseFloat(d.total_ht)||0)},0).toLocaleString('fr-FR')+'€ HT'})
                  if(chaud.length>0)acts.push({e:'🔥',t:chaud.length+' prospects CHAUDS à travailler : '+chaud.slice(0,2).map(function(p){return p.name}).join(', ')})
                  if(neg.length>0)acts.push({e:'🤝',t:neg.length+' en négo — envoie le devis vite !'})
                  if(acts.length===0)acts.push({e:'✅',t:'Pipeline en bonne santé !'})
                  return acts.map(function(a,idx2){return(
                    <div key={idx2} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:4,paddingBottom:4,borderBottom:idx2<acts.length-1?'1px solid rgba(255,255,255,.08)':'none'}}>
                      <span style={{fontSize:14,flexShrink:0}}>{a.e}</span>
                      <span style={{fontSize:12,lineHeight:1.4,opacity:.85}}>{a.t}</span>
                    </div>
                  )})
                })()}
              </div>

              {/* FILTRES */}
              <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
                {['all','contacted','nego','chaud','froid','tiede'].map(function(f){
                  var labels={all:'Tous',contacted:'Contactés',nego:'En négo',chaud:'🔥 Chauds',froid:'🧊 Froids',tiede:'😐 Tièdes'}
                  var count = f==='all' ? prospects.filter(function(p){return p.status!=='won'&&p.status!=='lost'}).length : prospects.filter(function(p){return f==='contacted'||f==='nego'?p.status===f:p.temperature===f&&p.status!=='won'&&p.status!=='lost'}).length
                  return(
                    <button key={f} className={'btn btn-sm'+(crmFilter===f?' btn-p':'')} onClick={function(){setCrmFilter(f)}} style={{fontSize:10}}>
                      {labels[f]} <span style={{opacity:.5,fontSize:9}}>({count})</span>
                    </button>
                  )
                })}
              </div>

              {/* LISTE PROSPECTS ACTIFS */}
              {prospects.filter(function(p){
                if(p.status==='won'||p.status==='lost') return false
                if(crmFilter==='all') return true
                if(crmFilter==='contacted'||crmFilter==='nego') return p.status===crmFilter
                return p.temperature===crmFilter
              }).map(function(p) {
                var tempColors = {chaud:'#CC0066',tiede:'#FF6B2B',froid:'#005FFF'}
                var tempLabel = {chaud:'🔥 Chaud',tiede:'😐 Tiède',froid:'🧊 Froid'}
                var isLate = p.nextDate && p.nextDate <= new Date().toISOString().split('T')[0]
                return (
                  <div key={p.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(isLate?'#CC0066':tempColors[p.temperature]||'#EBEBEB')}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:6}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:3}}>
                          <div style={{fontWeight:900,fontSize:14,cursor:'pointer'}} onClick={function(){openModal('prospect',Object.assign({},p))}}>{p.name}</div>
                          <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                          {p.temperature && <span style={{fontSize:12,fontWeight:900,color:tempColors[p.temperature]||'#888'}}>{tempLabel[p.temperature]||''}</span>}
                        </div>
                        <div style={{fontSize:12,opacity:.8,fontWeight:500}}>{p.category} · {p.email}</div>
                      </div>
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){openModal('prospect',Object.assign({},p))}}>✏️</button>
                        <button className="btn btn-p btn-sm" style={{fontSize:10}} onClick={function(e){e.stopPropagation();generateEmail(Object.assign({},p,{cat:'crm',arrondissement:'',taille:p.size,pitch:p.notes||'',type:p.category}),p.status==='contacted'||p.status==='nego'?'relance':'first')}}>{p.status==='contacted'||p.status==='nego'?'✉️ Relance':'✉️ Email'}</button>
                      </div>
                    </div>

                    {/* TEMPÉRATURE */}
                    <div style={{display:'flex',gap:4,marginBottom:8}}>
                      <div style={{fontSize:10,fontWeight:900,marginRight:4,opacity:.5}}>Température :</div>
                      {['chaud','tiede','froid'].map(function(t){return(
                        <button key={t} className="btn btn-sm" style={{fontSize:9,padding:'2px 8px',background:p.temperature===t?tempColors[t]:'transparent',color:p.temperature===t?'#fff':'inherit',border:'1.5px solid '+(tempColors[t])}} onClick={function(){setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{temperature:t}):x})})}}>
                          {tempLabel[t]}
                        </button>
                      )})}
                    </div>

                    {/* STATUT ÉDITABLE */}
                    <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
                      <div style={{fontSize:10,fontWeight:900,opacity:.5,textTransform:'uppercase'}}>Statut :</div>
                      {['to_contact','contacted','nego','won','lost'].map(function(st){
                        var stLabels={to_contact:'À contacter',contacted:'Contacté',nego:'En négo',won:'🏆 Gagné',lost:'✗ Perdu'}
                        var stColors={to_contact:'#888',contacted:'#005FFF',nego:'#FF82D7',won:'#009D3A',lost:'#CC0066'}
                        return(
                          <button key={st} className="btn btn-sm" style={{fontSize:9,padding:'2px 7px',background:p.status===st?stColors[st]:'#F5F5F5',color:p.status===st?'#fff':'#555',border:'1px solid '+(p.status===st?stColors[st]:'#DDD'),fontWeight:p.status===st?900:400}} onClick={function(){setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{status:st}):x})})}}>
                            {stLabels[st]}
                          </button>
                        )
                      })}
                    </div>

                    {p.nextDate && <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:isLate?'#CC0066':'#555',fontWeight:isLate?900:400}}>{isLate?'⚠️ RETARD — ':''}{p.nextAction} — {p.nextDate}</div>}

                    {/* NOTES */}
                    {p.notes&&<div style={{fontSize:12,color:'#444',background:'#FAFAFA',border:'1px solid #EEE',borderRadius:5,padding:'6px 10px',marginBottom:6,lineHeight:1.5}}>{p.notes}</div>}
                    <div style={{display:'flex',gap:4,marginBottom:8}}>
                      <input className="inp" placeholder="Ajouter une note..." style={{flex:1,fontSize:11,padding:'5px 8px'}} id={'note-'+p.id} defaultValue="" />
                      <button className="btn btn-sm" style={{flexShrink:0}} onClick={function(){
                        var el = document.getElementById('note-'+p.id)
                        var note = el ? el.value.trim() : ''
                        if(!note) return
                        var ts = new Date().toLocaleDateString('fr-FR')
                        var newNote = (p.notes ? p.notes+'\n' : '') + '['+ts+'] '+note
                        setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{notes:newNote}):x})})
                        if(el) el.value = ''
                        toast('Note ajoutée ✓')
                      }}>+ Note</button>
                    </div>

                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      <button className="btn btn-y btn-sm" style={{fontSize:10}} onClick={function(){
                        setDevisView('edit');setCurrentDevisId(null);setDevisItems([])
                        setDevisNumero('DEV-'+new Date().getFullYear()+'-'+String(devisList.length+1).padStart(3,'0'))
                        setDevisClient({nom:p.name,email:p.email||'',phone:p.phone||'',contact:'',date:'',lieu:'',prospectId:p.id})
                        setDevisNbPersonnes(50);setDevisFormat('normal');setDevisMiseEnPlace(1500)
                        setDevisMiseEnPlacePct(0);setDevisRemiseTotal(0);setDevisNotes('');setDevisLivraison(0)
                        setDevisLivraisonOffert(false);setDevisMepOffert(false)
                        nav('devis')
                      }}>📄 Devis</button>
                      {p.status==='contacted' && <button className="btn btn-sm" style={{background:'#005FFF',color:'#fff',fontSize:11}} onClick={function(){
                        var rel=new Date();rel.setDate(rel.getDate()+7)
                        setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{nextDate:rel.toISOString().split('T')[0],nextAction:'2ème relance'}):x})})
                        toast('Relancé ✓')
                      }}>↩ Relancer</button>}
                      {p.status==='contacted' && <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={function(){setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{status:'nego',temperature:'chaud'}):x})});toast('🔥 En négo !')}}>✅ Intéressé → Négo</button>}
                      {p.status==='contacted' && <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{status:'lost',temperature:'froid'}):x})});toast('Archivé')}}>✗ Perdu</button>}
                      {p.status==='nego' && <button className="btn btn-y btn-sm" style={{fontSize:10}} onClick={function(){nav('devis')}}>📄 Créer devis</button>}
                      {p.status==='nego' && <button className="btn btn-g btn-sm" style={{fontSize:10}} onClick={function(){setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{status:'won'}):x})});toast('🏆 Gagné !')}}>🏆 Gagné</button>}
                      {p.status==='nego' && <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){setProspects(function(prev){return prev.map(function(x){return x.id===p.id?Object.assign({},x,{status:'lost'}):x})});toast('Perdu')}}>✗ Perdu</button>}
                    </div>
                  </div>
                )
              })}

              {/* GAGNÉS */}
              {prospects.filter(function(p){return p.status==='won'}).length > 0 && (
                <div style={{marginTop:16}}>
                  <div className="yt" style={{fontSize:16,marginBottom:8,color:'#009D3A'}}>🏆 Clients gagnés ({prospects.filter(function(p){return p.status==='won'}).length})</div>
                  {prospects.filter(function(p){return p.status==='won'}).map(function(p){return(
                    <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#F0FFF4',border:'1.5px solid #009D3A',borderRadius:5,marginBottom:4}}>
                      <span style={{fontWeight:900,fontSize:13}}>{p.name}</span>
                      <span style={{fontSize:11,color:'#009D3A',fontWeight:900}}>✅ Client</span>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {page === 'annuaire' && (
            <div>
              <div className="ph">
                <div><div className="pt">Annuaire</div><div className="ps">{contacts.length} contacts</div></div>
                <div style={{display:'flex',gap:6}}>
                  <button className="btn btn-y btn-sm" onClick={function() { openModal('contact', {cat:'food',vip:false}) }}>+ Ajouter</button>
                  <button className="btn btn-sm" style={{background:'#FFEB5A',border:'2px solid #191923'}} onClick={function(){document.getElementById('csv-imp').click()}}>📥 Import CSV</button>
                  <input id="csv-imp" type="file" accept=".csv" style={{display:'none'}} onChange={function(e){
                    var f=e.target&&e.target.files&&e.target.files[0]
                    if(!f)return
                    var r=new FileReader()
                    r.onload=function(ev){
                      var raw=ev.target?String(ev.target.result):''
                      var rows=raw.split('\n').filter(function(l){return l.trim()})
                      var added=rows.slice(1).map(function(row){
                        var c=row.split(',').map(function(x){return x.replace(/"/g,'').trim()})
                        return {id:Date.now()+Math.random(),cat:'prestataire',name:c[0]||'',phone:c[1]||'',email:c[2]||'',notes:c[3]||'',vip:false}
                      }).filter(function(c){return c.name})
                      if(added.length>0){setContacts(function(prev){return prev.concat(added)});toast(added.length+' contacts importés !')}
                    }
                    r.readAsText(f)
                    e.target.value=''
                  }} />
                </div>
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
              <div className='ph'>
                <div><div className='pt'>Google My Business</div><div className='ps'>{gmbData ? gmbData.rating + ' ★ · ' + gmbData.totalRatings + ' avis' : 'Chargement...'}</div></div>
                <div style={{display:'flex',gap:6}}>
                  {gmbData && gmbData.mock && <span style={{fontSize:10,background:'#FF6B2B',color:'#fff',padding:'2px 6px',borderRadius:3,fontWeight:900}}>DEMO</span>}
                  <button className='btn btn-sm btn-y' onClick={function(){navigator.clipboard.writeText('https://g.page/r/CUKxo2Ia8TH1EBM/review');toast('Lien avis copie ! 📋')}}>📋 Lien avis</button>
                  <a href='https://business.google.com' target='_blank' rel='noopener noreferrer' className='btn btn-sm'>Gerer →</a>
                </div>
              </div>
              {gmbLoading && <div style={{textAlign:'center',padding:60,opacity:.4}}><div style={{fontSize:36}}>⭐</div><div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',marginTop:8}}>Chargement des avis...</div></div>}
              {gmbData && (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                    <div className='kc' style={{background:'#191923',textAlign:'center'}}>
                      <div className='kl' style={{color:'rgba(255,235,90,.7)'}}>Note Google</div>
                      <div style={{fontSize:36,fontWeight:900,color:'#FFEB5A',fontFamily:'Arial Narrow,Arial,sans-serif'}}>{gmbData.rating}</div>
                      <div style={{color:'#FFEB5A',fontSize:16,letterSpacing:2}}>{'★'.repeat(Math.round(gmbData.rating))}</div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginTop:2}}>{gmbData.totalRatings} avis</div>
                    </div>
                    <div className='kc' style={{background:'#FFF',textAlign:'center',cursor:'pointer'}} onClick={function(){setGmbFilter(gmbFilter==='noreply'?'all':'noreply')}}>
                      <div className='kl'>Sans reponse</div>
                      <div className='kv' style={{fontSize:28,color:gmbData.withoutReply>0?'#CC0066':'#009D3A'}}>{gmbData.withoutReply}</div>
                      <div style={{fontSize:10,opacity:.4,marginTop:2}}>{gmbData.withoutReply>0?'⚠️ A traiter':'✅ RAS'}</div>
                    </div>
                    <div className='kc' style={{background:'#FFF',textAlign:'center'}}>
                      <div className='kl'>Ce mois</div>
                      <div className='kv' style={{fontSize:28}}>{gmbData.reviews.filter(function(r){var d=new Date(r.date);var now=new Date();return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()}).length}</div>
                      <div style={{fontSize:10,opacity:.4,marginTop:2}}>nouveaux avis</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,marginBottom:8}}>
                    {['all','5','4','3','noreply'].map(function(f){return(
                      <button key={f} className={'btn btn-sm'+(gmbFilter===f?' btn-n':'')} onClick={function(){setGmbFilter(f)}} style={{fontSize:10}}>
                        {f==='all'?'Tous':f==='noreply'?'Sans reponse':f+'★'}
                      </button>
                    )})}
                  </div>
                  {gmbData.reviews.slice().sort(function(a,b){return new Date(b.date).getTime()-new Date(a.date).getTime()}).filter(function(r){
                    if(gmbFilter==='noreply') return !r.replied
                    if(gmbFilter==='5') return r.rating===5
                    if(gmbFilter==='4') return r.rating===4
                    if(gmbFilter==='3') return r.rating<=3
                    return true
                  }).map(function(r,i){return(
                    <div key={i} className='card' style={{marginBottom:8,borderLeft:r.rating<=2?'4px solid #CC0066':r.rating===3?'4px solid #FF6B2B':r.rating===4?'4px solid #FFEB5A':'4px solid #009D3A'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                        <div>
                          <div style={{fontWeight:900,fontSize:13}}>{r.author}</div>
                          <div style={{fontSize:11,opacity:.5}}>{new Date(r.date).toLocaleDateString('fr-FR')}</div>
                        </div>
                        <div style={{display:'flex',gap:4,alignItems:'center'}}>
                          <span style={{color:'#FFEB5A',fontSize:13,letterSpacing:1}}>{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                          {!r.replied && <span style={{fontSize:9,background:'#CC0066',color:'#fff',padding:'1px 5px',borderRadius:3,fontWeight:900}}>SANS REPONSE</span>}
                        </div>
                      </div>
                      {r.text && <div style={{fontSize:12,lineHeight:1.5,color:'#444',marginBottom:r.replied||!r.text?0:8}}>{r.text}</div>}
                      {!r.replied && (
                        <button className='btn btn-sm btn-y' style={{fontSize:10,marginTop:6}} onClick={function(){window.open('https://business.google.com/reviews','_blank')}}>
                          ✍️ Repondre sur Google Business
                        </button>
                      )}
                      {r.replied && (
                        <div style={{marginTop:8,borderLeft:'3px solid #009D3A',paddingLeft:10,background:'#F0FFF4',borderRadius:'0 4px 4px 0',padding:'8px 10px'}}>
                          <div style={{fontSize:10,fontWeight:900,color:'#009D3A',marginBottom:3}}>✅ Réponse de Meshuga :</div>
                          {r.reply_text
                            ? <div style={{fontSize:12,lineHeight:1.5,color:'#333'}}>{r.reply_text}</div>
                            : <div style={{fontSize:11,color:'#009D3A',fontStyle:'italic'}}>Réponse envoyée sur Google Business</div>
                          }
                        </div>
                      )}
                    </div>
                  )})}
                  <div style={{textAlign:'center',padding:'12px 0',opacity:.4,fontSize:12}}>
                    Google Places API · {gmbData.mock?'Mode demonstration - Ajoutez GOOGLE_MAPS_SERVER_KEY dans Vercel pour les vrais avis':'Donnees en temps reel'}
                  </div>
                </div>
              )}
            </div>
          )}

          {page === 'devis' && (
            <div>
              <div className="ph">
                <div><div className="pt">Devis</div><div className="ps">{devisView==='list'?devisList.length+' devis':'Editeur'}</div></div>
                <div style={{display:'flex',gap:6}}>
                  {devisView==='edit'&&<button className="btn btn-p btn-sm" onClick={function(){setDevisView('list')}}>&#8592; Fermer l'éditeur</button>}
                  <button className="btn btn-y btn-sm" onClick={function(){
                    setDevisView('edit');setDevisItems([]);setCurrentDevisId(null)
                    setDevisClient({nom:'',contact:'',email:'',phone:'',date:'',lieu:'',prospectId:null})
                    setDevisNbPersonnes(50);setDevisFormat('normal');setDevisMiseEnPlace(1500)
                    setDevisMiseEnPlacePct(0);setDevisRemiseTotal(0);setDevisNotes('');setDevisLivraison(0)
                    setDevisLivraisonOffert(false);setDevisMepOffert(false)
                    setDevisNumero('DEV-'+new Date().getFullYear()+'-'+String(devisList.length+1).padStart(3,'0'))
                  }}>+ Nouveau devis</button>
                </div>
              </div>
              {devisView==='list'&&(
                <div>
                  {devisList.length===0?(
                    <div className="card" style={{textAlign:'center',padding:50,opacity:.4}}>
                      <div style={{fontSize:40,marginBottom:10}}>📄</div>
                      <div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun devis — crée le premier !</div>
                    </div>
                  ):(
                    <div>
                      {devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).length>0&&(
                        <div style={{marginBottom:16}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',background:'#EBF3FF',borderRadius:6,border:'1.5px solid #005FFF'}}>
                            <div className="yt" style={{fontSize:17,color:'#005FFF'}}>📤 En attente de réponse</div>
                            <div style={{fontWeight:900,fontSize:12,color:'#005FFF',marginLeft:'auto'}}>{devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).reduce(function(s,d){return s+(parseFloat(d.total_ttc)||0)},0).toLocaleString('fr-FR')} € TTC</div>
                            <span style={{fontSize:10,background:'#005FFF',color:'#fff',padding:'2px 7px',borderRadius:3,fontWeight:900}}>{devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).length}</span>
                          </div>
                          {devisList.filter(function(d2){return d2.statut==="envoye"||d2.statut==="a_modifier"}).map(function(dv){
                            var sc2={brouillon:'#888',envoye:'#005FFF',accepte:'#009D3A',refuse:'#CC0066',a_modifier:'#FF6B2B',facture:'#191923',paye:'#009D3A'}
                            var sl2={brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé',a_modifier:'À modifier',facture:'Facturé',paye:'Soldé'}
                            var col=sc2[dv.statut]||'#888'
                            return(
                              <div key={dv.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+col}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                                      <span style={{fontWeight:900,fontSize:14}}>{dv.numero}</span>
                                      <span className="badge" style={{color:col,borderColor:col}}>{sl2[dv.statut]||dv.statut}</span>
                                      {dv.facture_numero&&<span className="badge" style={{color:'#191923',borderColor:'#191923'}}>FACT {dv.facture_numero}</span>}
                                      {dv.acompte_recu&&<span style={{fontSize:9,background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'1px 5px',fontWeight:900}}>💰 Acompte OK</span>}
                                    </div>
                                    <div style={{fontWeight:900,fontSize:13}}>{dv.client_nom}</div>
                                    <div style={{fontSize:11,opacity:.5}}>{dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):''} {dv.event_lieu?'· '+dv.event_lieu:''} · {dv.nb_personnes} pers.</div>
                                  </div>
                                  <div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:18}}>{parseFloat(dv.total_ttc||0).toFixed(2)} €</div><div style={{fontSize:9,opacity:.4}}>TTC</div></div>
                                </div>
                                <div style={{display:'flex',gap:5,marginTop:10,flexWrap:'wrap'}}>
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){setDevisView('edit');setCurrentDevisId(dv.id);setDevisNumero(dv.numero);setDevisClient({nom:dv.client_nom,contact:dv.client_contact||'',email:dv.client_email||'',phone:dv.client_phone||'',date:dv.event_date||'',lieu:dv.event_lieu||'',prospectId:dv.prospect_id});setDevisNbPersonnes(dv.nb_personnes||50);setDevisFormat(dv.format||'normal');setDevisItems(dv.items||[]);setDevisMiseEnPlace(parseFloat(dv.mise_en_place||0));setDevisMiseEnPlacePct(parseFloat(dv.remise_mep_pct||0));setDevisRemiseTotal(parseFloat(dv.remise_total_pct||0));setDevisNotes(dv.notes||'');setDevisLivraison(parseFloat(dv.livraison||0));setDevisLivraisonOffert(!!dv.livraison_offert);setDevisMepOffert(!!dv.mise_en_place_offert)}}>✏️ Modifier</button>
                                  {dv.statut==='brouillon'&&<button className="btn btn-p btn-sm" style={{fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'envoye','')}}>📤 Envoyé</button>}
                                  {dv.statut==='envoye'&&<button className="btn btn-sm" style={{background:'#009D3A',color:'#fff',fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'accepte','')}}>✓ Accepté</button>}
                                  {dv.statut==='envoye'&&<button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'refuse','')}}>✗ Refusé</button>}
                                  {dv.statut==='envoye'&&<button className="btn btn-sm" style={{background:'#FF6B2B',color:'#fff',fontSize:10}} onClick={function(){updateDevisStatut(dv.id,'a_modifier','')}}>⚠️ À modifier</button>}
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,false)}}>📄 PDF</button>
                                  {dv.facture_numero&&<button className="btn btn-n btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,true)}}>🧾 PDF Fact.</button>}
                                  <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){if(window.confirm('Supprimer ce devis ?')){sb().from('devis').delete().eq('id',dv.id).then(function(){loadDevis();toast('Devis supprimé')})}}}>🗑️</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).length>0&&(
                        <div style={{marginBottom:16}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',background:'#F0FFF4',borderRadius:6,border:'1.5px solid #009D3A'}}>
                            <div className="yt" style={{fontSize:17,color:'#009D3A'}}>🎯 À facturer / Solder</div>
                            <div style={{fontWeight:900,fontSize:12,color:'#009D3A',marginLeft:'auto'}}>{devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).reduce(function(s,d){return s+(parseFloat(d.total_ttc)||0)},0).toLocaleString('fr-FR')} € TTC</div>
                            <span style={{fontSize:10,background:'#009D3A',color:'#fff',padding:'2px 7px',borderRadius:3,fontWeight:900}}>{devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).length}</span>
                          </div>
                          {devisList.filter(function(d2){return d2.statut==="accepte"||d2.statut==="facture"}).map(function(dv){
                            var sc2={brouillon:'#888',envoye:'#005FFF',accepte:'#009D3A',refuse:'#CC0066',a_modifier:'#FF6B2B',facture:'#191923',paye:'#009D3A'}
                            var sl2={brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé',a_modifier:'À modifier',facture:'Facturé',paye:'Soldé'}
                            var col=sc2[dv.statut]||'#888'
                            return(
                              <div key={dv.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+col}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                                      <span style={{fontWeight:900,fontSize:14}}>{dv.numero}</span>
                                      <span className="badge" style={{color:col,borderColor:col}}>{sl2[dv.statut]||dv.statut}</span>
                                      {dv.facture_numero&&<span className="badge" style={{color:'#191923',borderColor:'#191923'}}>FACT {dv.facture_numero}</span>}
                                      {dv.acompte_recu&&<span style={{fontSize:9,background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'1px 5px',fontWeight:900}}>💰 Acompte OK</span>}
                                    </div>
                                    <div style={{fontWeight:900,fontSize:13}}>{dv.client_nom}</div>
                                    <div style={{fontSize:11,opacity:.5}}>{dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):''} {dv.event_lieu?'· '+dv.event_lieu:''} · {dv.nb_personnes} pers.</div>
                                  </div>
                                  <div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:18}}>{parseFloat(dv.total_ttc||0).toFixed(2)} €</div><div style={{fontSize:9,opacity:.4}}>TTC</div></div>
                                </div>
                                <div style={{display:'flex',gap:5,marginTop:10,flexWrap:'wrap'}}>
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){setDevisView('edit');setCurrentDevisId(dv.id);setDevisNumero(dv.numero);setDevisClient({nom:dv.client_nom,contact:dv.client_contact||'',email:dv.client_email||'',phone:dv.client_phone||'',date:dv.event_date||'',lieu:dv.event_lieu||'',prospectId:dv.prospect_id});setDevisNbPersonnes(dv.nb_personnes||50);setDevisFormat(dv.format||'normal');setDevisItems(dv.items||[]);setDevisMiseEnPlace(parseFloat(dv.mise_en_place||0));setDevisMiseEnPlacePct(parseFloat(dv.remise_mep_pct||0));setDevisRemiseTotal(parseFloat(dv.remise_total_pct||0));setDevisNotes(dv.notes||'');setDevisLivraison(parseFloat(dv.livraison||0));setDevisLivraisonOffert(!!dv.livraison_offert);setDevisMepOffert(!!dv.mise_en_place_offert)}}>✏️ Modifier</button>
                                  {(dv.statut==='accepte'||dv.statut==='facture')&&!dv.acompte_recu&&<button className="btn btn-sm" style={{background:'#FFEB5A',color:'#191923',fontSize:10}} onClick={function(){sb().from('devis').update({acompte_recu:true,acompte_date:new Date().toISOString().split('T')[0]}).eq('id',dv.id).then(function(){loadDevis();toast('💰 Acompte reçu !')})}}>💰 Acompte reçu</button>}
                                  {dv.statut==='accepte'&&!dv.facture_numero&&<button className="btn btn-n btn-sm" style={{fontSize:10}} onClick={function(){var fn='FACT-'+new Date().getFullYear()+'-'+String(devisList.filter(function(x){return x.facture_numero}).length+1).padStart(3,'0');sb().from('devis').update({statut:'facture',facture_numero:fn,facture_date:new Date().toISOString().split('T')[0]}).eq('id',dv.id).then(function(){loadDevis();toast('🧾 Facture '+fn+' générée!')})}}>🧾 Facturer</button>}
                                  {dv.statut==='facture'&&dv.paiement_statut!=='paye'&&<button className="btn btn-sm" style={{background:'#009D3A',color:'#fff',fontSize:10}} onClick={function(){sb().from('devis').update({paiement_statut:'paye',statut:'paye',solde_recu:true,solde_date:new Date().toISOString().split('T')[0]}).eq('id',dv.id).then(function(){loadDevis();toast('✅ Soldé!')})}}>✅ Soldé</button>}
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,false)}}>📄 PDF</button>
                                  {dv.facture_numero&&<button className="btn btn-n btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,true)}}>🧾 PDF Fact.</button>}
                                  <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){if(window.confirm('Supprimer ce devis ?')){sb().from('devis').delete().eq('id',dv.id).then(function(){loadDevis();toast('Devis supprimé')})}}}>🗑️</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {devisList.filter(function(d2){return d2.statut==="paye"||d2.statut==="refuse"||d2.statut==="brouillon"}).length>0&&(
                        <div style={{marginBottom:16}}>
                          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,padding:'8px 12px',background:'#F8F8F8',borderRadius:6,border:'1.5px solid #DEDEDE'}}>
                            <div className="yt" style={{fontSize:17,color:'#888'}}>📁 Archives</div>
                            <span style={{fontSize:10,background:'#888',color:'#fff',padding:'2px 7px',borderRadius:3,fontWeight:900,marginLeft:'auto'}}>{devisList.filter(function(d2){return d2.statut==="paye"||d2.statut==="refuse"||d2.statut==="brouillon"}).length}</span>
                          </div>
                          {devisList.filter(function(d2){return d2.statut==="paye"||d2.statut==="refuse"||d2.statut==="brouillon"}).map(function(dv){
                            var sc2={brouillon:'#888',envoye:'#005FFF',accepte:'#009D3A',refuse:'#CC0066',a_modifier:'#FF6B2B',facture:'#191923',paye:'#009D3A'}
                            var sl2={brouillon:'Brouillon',envoye:'Envoyé',accepte:'Accepté',refuse:'Refusé',a_modifier:'À modifier',facture:'Facturé',paye:'Soldé'}
                            var col=sc2[dv.statut]||'#888'
                            return(
                              <div key={dv.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+col,opacity:.7}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,flexWrap:'wrap'}}>
                                  <div style={{flex:1}}>
                                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                                      <span style={{fontWeight:900,fontSize:14}}>{dv.numero}</span>
                                      <span className="badge" style={{color:col,borderColor:col}}>{sl2[dv.statut]||dv.statut}</span>
                                    </div>
                                    <div style={{fontWeight:900,fontSize:13}}>{dv.client_nom}</div>
                                    <div style={{fontSize:11,opacity:.5}}>{dv.event_date?new Date(dv.event_date).toLocaleDateString('fr-FR'):''} · {dv.nb_personnes} pers.</div>
                                  </div>
                                  <div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:16}}>{parseFloat(dv.total_ttc||0).toFixed(2)} €</div></div>
                                </div>
                                <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
                                  <button className="btn btn-sm" style={{fontSize:10}} onClick={function(){generateAndPrintDoc(dv,false)}}>📄 PDF</button>
                                  <button className="btn btn-red btn-sm" style={{fontSize:10}} onClick={function(){if(window.confirm('Supprimer ?')){sb().from('devis').delete().eq('id',dv.id).then(function(){loadDevis();toast('Supprimé')})}}}>🗑️</button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {devisView==='edit'&&(
                <div className="g2">
                  <div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Client</div>
                      <div className="fg"><label className="lbl">Prospect existant</label>
                        <select className="inp" value={devisClient.prospectId ? String(devisClient.prospectId) : ''} onChange={function(e){
                          var pid = e.target.value
                          if(!pid){setDevisClient(Object.assign({},devisClient,{prospectId:null,nom:'',email:'',phone:''}));return}
                          var allPs = prospects.concat(chasse.filter(function(c){return c.status!=='to_contact'}))
                          var p = allPs.find(function(x){return String(x.id)===pid})
                          if(p) setDevisClient(Object.assign({},devisClient,{nom:p.name||'',email:p.email||'',phone:p.phone||'',prospectId:p.id}))
                        }}>
                          <option value="">-- Nouveau client --</option>
                          <optgroup label="CRM Prospects">
                            {prospects.map(function(p){return <option key={'crm-'+p.id} value={String(p.id)}>{p.name}</option>})}
                          </optgroup>
                          <optgroup label="Tableau de chasse (contactés)">
                            {chasse.filter(function(c){return c.status!=='to_contact'}).map(function(p){return <option key={'ch-'+p.id} value={String(p.id)}>{p.name}</option>})}
                          </optgroup>
                        </select>
                      </div>
                      <div className="fg"><label className="lbl">Entreprise *</label><input className="inp" value={devisClient.nom} onChange={function(e){setDevisClient(Object.assign({},devisClient,{nom:e.target.value}))}} /></div>
                      <div className="fg2">
                        <div className="fg"><label className="lbl">Contact</label><input className="inp" value={devisClient.contact} onChange={function(e){setDevisClient(Object.assign({},devisClient,{contact:e.target.value}))}} /></div>
                        <div className="fg"><label className="lbl">Email</label><input className="inp" value={devisClient.email} onChange={function(e){setDevisClient(Object.assign({},devisClient,{email:e.target.value}))}} /></div>
                      </div>
                      <div className="fg2">
                        <div className="fg"><label className="lbl">Date événement</label><input type="date" className="inp" value={devisClient.date} onChange={function(e){setDevisClient(Object.assign({},devisClient,{date:e.target.value}))}} /></div>
                        <div className="fg"><label className="lbl">Lieu</label><input className="inp" value={devisClient.lieu} onChange={function(e){setDevisClient(Object.assign({},devisClient,{lieu:e.target.value}))}} /></div>
                      </div>
                      {!devisClient.prospectId&&devisClient.nom&&<button className="btn btn-y btn-sm" style={{marginTop:4}} onClick={function(){
                        var np={id:Date.now(),name:devisClient.nom,email:devisClient.email,phone:'',size:'',category:'Evénementiel',status:'contacted',nextAction:'Devis envoyé',nextDate:'',notes:'',ca:0,score:7,files:[]}
                        setProspects(function(prev){return prev.concat([np])})
                        setDevisClient(Object.assign({},devisClient,{prospectId:np.id}))
                        toast('Prospect ajouté au CRM !')
                      }}>+ Ajouter au CRM</button>}
                      <div className="fg" style={{marginTop:8}}><label className="lbl">N° Devis</label><input className="inp" value={devisNumero} onChange={function(e){setDevisNumero(e.target.value)}} /></div>
                    </div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Format</div>
                      <div className="fg"><label className="lbl">Nombre de personnes</label><input type="number" className="inp" value={devisNbPersonnes} min="1" onChange={function(e){setDevisNbPersonnes(parseInt(e.target.value)||1)}} /></div>
                      <div className="fg">
                        <label className="lbl">Format (indicatif)</label>
                        <div style={{display:'flex',gap:8}}>
                          <div onClick={function(){setDevisFormat('normal')}} style={{flex:1,padding:'10px',border:'2px solid '+(devisFormat==='normal'?'#191923':'#EBEBEB'),borderRadius:5,cursor:'pointer',background:devisFormat==='normal'?'#FFEB5A':'#FAFAFA',textAlign:'center'}}>
                            <div style={{fontWeight:900,fontSize:12}}>Normal</div><div style={{fontSize:10,opacity:.5}}>~1/pers.</div>
                          </div>
                          <div onClick={function(){setDevisFormat('mini')}} style={{flex:1,padding:'10px',border:'2px solid '+(devisFormat==='mini'?'#191923':'#EBEBEB'),borderRadius:5,cursor:'pointer',background:devisFormat==='mini'?'#FFEB5A':'#FAFAFA',textAlign:'center'}}>
                            <div style={{fontWeight:900,fontSize:12}}>Mini</div><div style={{fontSize:10,opacity:.5}}>~3/pers.</div>
                          </div>
                        </div>
                      </div>
                      <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:4,padding:'5px 8px',fontSize:10}}>Conseillé : {devisFormat==='normal'?devisNbPersonnes:(devisNbPersonnes*3)} pièces</div>
                    </div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Frais & Remises</div>
                      <div style={{padding:'10px',border:'1.5px solid #EBEBEB',borderRadius:5,marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <div style={{fontWeight:900,fontSize:12}}>Mise en place / Show cooking</div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={devisMepOffert} style={{width:14,height:14,accentColor:'#009D3A'}} onChange={function(e){setDevisMepOffert(e.target.checked)}} /><span style={{fontSize:11,fontWeight:900,color:devisMepOffert?'#009D3A':'#888'}}>Offert</span></div>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <input type="number" className="inp" style={{flex:1}} value={devisMiseEnPlace} onChange={function(e){setDevisMiseEnPlace(parseFloat(e.target.value)||0)}} disabled={devisMepOffert} />
                          <input type="number" className="inp" style={{width:60}} placeholder="%" value={devisMiseEnPlaceRemise} min="0" max="100" onChange={function(e){setDevisMiseEnPlacePct(parseFloat(e.target.value)||0)}} disabled={devisMepOffert} />
                        </div>
                      </div>
                      <div style={{padding:'10px',border:'1.5px solid #EBEBEB',borderRadius:5,marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                          <div style={{fontWeight:900,fontSize:12}}>Frais de livraison</div>
                          <div style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={devisLivraisonOffert} style={{width:14,height:14,accentColor:'#009D3A'}} onChange={function(e){setDevisLivraisonOffert(e.target.checked)}} /><span style={{fontSize:11,fontWeight:900,color:devisLivraisonOffert?'#009D3A':'#888'}}>Offert</span></div>
                        </div>
                        <input type="number" className="inp" value={devisLivraison} onChange={function(e){setDevisLivraison(parseFloat(e.target.value)||0)}} disabled={devisLivraisonOffert} />
                      </div>
                      <div className="fg"><label className="lbl">Remise sur le total (%)</label><input type="number" className="inp" value={devisRemiseTotal} min="0" max="100" onChange={function(e){setDevisRemiseTotal(parseFloat(e.target.value)||0)}} /></div>
                    </div>
                    <div className="card"><div className="ct">Notes</div><textarea className="inp" value={devisNotes} onChange={function(e){setDevisNotes(e.target.value)}} placeholder="Conditions spéciales..." style={{minHeight:70}} /></div>
                  </div>
                  <div>
                    <div className="card" style={{marginBottom:10}}>
                      <div className="ct">Sandwichs</div>
                      <div style={{fontSize:10,opacity:.4,marginBottom:8,padding:'4px 8px',background:'#F8F8F8',borderRadius:4}}>Conseillé : {devisFormat==='normal'?devisNbPersonnes:(devisNbPersonnes*3)} pièces</div>
                      {(devisFormat==='normal'?[{id:"hot_dog",nom:"Hot Dog",prix:7.56},{id:"grilled_cheese",nom:"Grilled Cheese",prix:7.56},{id:"egg_salad",nom:"Egg Salad",prix:8.51},{id:"chicken_caesar",nom:"Chicken Caesar",prix:11.34},{id:"tuna_melt",nom:"Tuna Melt",prix:11.34},{id:"pastrami",nom:"Pastrami",prix:14.18},{id:"smoked_salmon",nom:"Smoked Salmon",prix:13.23},{id:"lobster_roll",nom:"Lobster Roll",prix:20.79},{id:"pbn",nom:"PBN",prix:5.67}]:[{id:"hot_dog_m",nom:"Hot Dog Mini",prix:2.7},{id:"grilled_cheese_m",nom:"Grilled Cheese Mini",prix:2.87},{id:"egg_salad_m",nom:"Egg Salad Mini",prix:2.65},{id:"chicken_caesar_m",nom:"Chicken Caesar Mini",prix:3.35},{id:"tuna_melt_m",nom:"Tuna Melt Mini",prix:3.0},{id:"pastrami_m",nom:"Pastrami Mini",prix:3.8},{id:"smoked_salmon_m",nom:"Smoked Salmon Mini",prix:3.9},{id:"lobster_roll_m",nom:"Lobster Roll Mini",prix:7.5},{id:"pbn_m",nom:"PBN Mini",prix:2.7},{id:"mini_veggie",nom:"Salade Mini Veggie",prix:4.72}]).map(function(s){
                        var ex=devisItems.filter(function(x){return x.id===s.id})[0]
                        var qty=ex?ex.qte:0
                        var setQty = function(nq){
                          if(nq<=0)setDevisItems(devisItems.filter(function(x){return x.id!==s.id}))
                          else if(qty===0)setDevisItems(devisItems.concat([{id:s.id,nom:s.nom,prix:s.prix,qte:nq,total_ht:nq*s.prix}]))
                          else setDevisItems(devisItems.map(function(x){return x.id===s.id?Object.assign({},x,{qte:nq,total_ht:nq*s.prix}):x}))
                        }
                        return(
                          <div key={s.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #EBEBEB'}}>
                            <div style={{flex:1}}><div style={{fontSize:12,fontWeight:qty>0?900:400}}>{s.nom}</div><div style={{fontSize:9,opacity:.4}}>{s.prix.toFixed(2)} EUR HT</div></div>
                            <div style={{display:'flex',alignItems:'center',gap:5}}>
                              <button className="btn btn-sm" onClick={function(){setQty(qty-1)}}>-</button>
                              <input type="number" min="0" style={{width:46,textAlign:'center',border:'2px solid #191923',borderRadius:4,padding:'3px',fontSize:12,fontWeight:900}} value={qty} onChange={function(e){setQty(parseInt(e.target.value)||0)}} />
                              <button className="btn btn-y btn-sm" onClick={function(){setQty(qty+1)}}>+</button>
                            </div>
                          </div>
                        )
                      })}
                      <div style={{marginTop:8,padding:'6px 10px',background:'#FFEB5A',borderRadius:4,border:'1.5px solid #191923',display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:11,fontWeight:900}}>Total sélectionné</span>
                        <span style={{fontSize:13,fontWeight:900}}>{devisItems.reduce(function(s,x){return s+x.qte},0)} pièces</span>
                      </div>
                    </div>
                    {(function(){
                      var sandTotal=devisItems.reduce(function(s,x){return s+x.total_ht},0)
                      var mepHT=devisMepOffert?devisMiseEnPlace:devisMiseEnPlace*(1-devisMiseEnPlaceRemise/100)
                      var livHT=devisLivraisonOffert?devisLivraison:devisLivraison
                      var sousTotal=sandTotal+mepHT+livHT
                      var remiseMontant=sousTotal*devisRemiseTotal/100
                      var totalHT=sousTotal-remiseMontant
                      var tva=totalHT*0.055
                      var totalTTC=totalHT+tva
                      return(
                        <div className="card" style={{border:'3px solid #191923',boxShadow:'4px 4px 0 #191923'}}>
                          <div className="ct">Récapitulatif</div>
                          <div style={{borderRadius:5,overflow:'hidden',marginBottom:8}}>
                            {devisItems.map(function(item){return <div key={item.id} style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',borderBottom:'1px solid #EBEBEB',background:'#FAFAFA',fontSize:11}}><span>{item.nom} x{item.qte}</span><span style={{fontWeight:900}}>{item.total_ht.toFixed(2)} EUR</span></div>})}
                            {devisMiseEnPlace>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',borderBottom:'1px solid #EBEBEB',background:'#FAFAFA',fontSize:11}}>
                              <span style={{textDecoration:devisMepOffert?'line-through':'none',opacity:devisMepOffert?.5:1}}>Mise en place{devisMepOffert&&<span style={{color:'#009D3A',marginLeft:6,fontWeight:900}}>OFFERT</span>}</span>
                              <span style={{fontWeight:900,textDecoration:devisMepOffert?'line-through':'none',opacity:devisMepOffert?.5:1}}>{devisMiseEnPlace.toFixed(2)} EUR</span>
                            </div>}
                            {devisLivraison>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',borderBottom:'1px solid #EBEBEB',background:'#FAFAFA',fontSize:11}}>
                              <span style={{textDecoration:devisLivraisonOffert?'line-through':'none',opacity:devisLivraisonOffert?.5:1}}>Livraison{devisLivraisonOffert&&<span style={{color:'#009D3A',marginLeft:6,fontWeight:900}}>OFFERT</span>}</span>
                              <span style={{fontWeight:900,textDecoration:devisLivraisonOffert?'line-through':'none',opacity:devisLivraisonOffert?.5:1}}>{devisLivraison.toFixed(2)} EUR</span>
                            </div>}
                            {remiseMontant>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'5px 8px',background:'#FFF0F5',fontSize:11,color:'#CC0066'}}><span>Remise ({devisRemiseTotal}%)</span><span style={{fontWeight:900}}>-{remiseMontant.toFixed(2)} EUR</span></div>}
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #EBEBEB',fontSize:12}}><span>Total HT</span><span style={{fontWeight:900}}>{totalHT.toFixed(2)} EUR</span></div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid #EBEBEB',fontSize:11,opacity:.5}}><span>TVA 5,5%</span><span>{tva.toFixed(2)} EUR</span></div>
                          <div style={{display:'flex',justifyContent:'space-between',padding:'10px 8px',background:'#FFEB5A',borderRadius:5,marginTop:8,border:'2px solid #191923'}}><span className="yt" style={{fontSize:20}}>Total TTC</span><span style={{fontWeight:900,fontSize:18}}>{totalTTC.toFixed(2)} EUR</span></div>
                          <div style={{fontSize:10,opacity:.35,textAlign:'center',marginTop:4}}>{(totalTTC/devisNbPersonnes).toFixed(2)} EUR TTC / personne</div>
                          <div style={{display:'flex',gap:6,marginTop:12}}>
                            <button className="btn btn-y" style={{flex:1,justifyContent:'center',fontSize:11}} onClick={function(){
                              if(!devisClient.nom){toast('Nom du client requis !');return}
                              if(devisItems.length===0){toast('Sélectionnez au moins un sandwich !');return}
                              var payload={numero:devisNumero,statut:'brouillon',prospect_id:devisClient.prospectId?String(devisClient.prospectId):null,client_nom:devisClient.nom,client_contact:devisClient.contact,client_email:devisClient.email,client_phone:devisClient.phone||'',event_date:devisClient.date||null,event_lieu:devisClient.lieu,nb_personnes:devisNbPersonnes,format:devisFormat,items:devisItems,mise_en_place:devisMiseEnPlace,mise_en_place_offert:devisMepOffert,livraison:devisLivraison,livraison_offert:devisLivraisonOffert,remise_mep_pct:devisMiseEnPlaceRemise,remise_total_pct:devisRemiseTotal,remise_montant:remiseMontant,total_ht:totalHT,tva:tva,total_ttc:totalTTC,notes:devisNotes,date_validite:new Date(Date.now()+30*24*60*60*1000).toISOString().split('T')[0]}
                              if(currentDevisId)payload.id=currentDevisId
                              saveDevisToSupabase(payload,function(saved){toast('Devis sauvegardé !');setCurrentDevisId(saved.id)})
                            }}>&#128190; Sauvegarder</button>
                            <button className="btn btn-p" style={{flex:1,justifyContent:'center',fontSize:11}} onClick={function(){
                              if(!devisClient.nom){toast('Nom du client requis !');return}
                              generateAndPrintDoc({items:devisItems,mep:devisMiseEnPlace,mep_offert:devisMepOffert,mep_remise:devisMiseEnPlaceRemise,liv:devisLivraison,liv_offert:devisLivraisonOffert,remise_pct:devisRemiseTotal,remise_montant:remiseMontant,total_ht:totalHT,tva:tva,total_ttc:totalTTC,client_nom:devisClient.nom,client_contact:devisClient.contact,client_email:devisClient.email,event_date:devisClient.date,event_lieu:devisClient.lieu,nb_personnes:devisNbPersonnes,format:devisFormat,numero:devisNumero,notes:devisNotes},false)
                            }}>&#128196; PDF Devis</button>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {page === 'instagram' && (
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

          {page === 'journal' && !isEmy && (
            <div>
              <div className="ph">
                <div><div className="pt">Journal d'Emy 📓</div><div className="ps">Activité · Sessions · Actions</div></div>
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
          )}

        </div>
      </div>

      {modal === 'task' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e){e.stopPropagation()}}>
            <div className="mh"><div className="mt">{form.id?'Modifier la tâche':'Nouvelle tâche'}</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={function(e){setForm(Object.assign({},form,{title:e.target.value}))}} placeholder="Ex: Appeler Agence Wagram" /></div>
              <div className="fg"><label className="lbl">Description</label><textarea className="inp" value={form.description||''} onChange={function(e){setForm(Object.assign({},form,{description:e.target.value}))}} rows={2} /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="fg"><label className="lbl">Date limite</label><input type="date" className="inp" value={form.deadline||''} onChange={function(e){setForm(Object.assign({},form,{deadline:e.target.value}))}} /></div>
                <div className="fg"><label className="lbl">Assigné à</label>
                  <select className="inp" value={form.assignee||'emy'} onChange={function(e){setForm(Object.assign({},form,{assignee:e.target.value}))}}>
                    <option value="emy">Emy</option>
                    <option value="edward">Edward</option>
                  </select>
                </div>
              </div>
              <div className="fg"><label className="lbl">Priorité</label>
                <select className="inp" value={form.priority||'medium'} onChange={function(e){setForm(Object.assign({},form,{priority:e.target.value}))}}>
                  <option value="high">🔴 Haute</option>
                  <option value="medium">🟡 Moyenne</option>
                  <option value="low">🟢 Basse</option>
                </select>
              </div>
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveTask}>{form.id?'Modifier':'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'prospect' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e){e.stopPropagation()}}>
            <div className="mh"><div className="mt">{form.id?'Modifier le prospect':'Nouveau prospect'}</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Nom de l'entreprise *</label><input className="inp" value={form.name||''} onChange={function(e){setForm(Object.assign({},form,{name:e.target.value}))}} placeholder="Ex: Agence Wagram Events" /></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={function(e){setForm(Object.assign({},form,{email:e.target.value}))}} /></div>
                <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={function(e){setForm(Object.assign({},form,{phone:e.target.value}))}} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="fg"><label className="lbl">Catégorie</label>
                  <select className="inp" value={form.category||'Autre'} onChange={function(e){setForm(Object.assign({},form,{category:e.target.value}))}}>
                    <option value="Startup">Startup</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Agence">Agence</option>
                    <option value="RH">RH</option>
                    <option value="Luxe">Luxe</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="fg"><label className="lbl">Taille (personnes)</label><input type="number" className="inp" value={form.size||''} onChange={function(e){setForm(Object.assign({},form,{size:e.target.value}))}} /></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="fg"><label className="lbl">Statut</label>
                  <select className="inp" value={form.status||'to_contact'} onChange={function(e){setForm(Object.assign({},form,{status:e.target.value}))}}>
                    <option value="to_contact">À contacter</option>
                    <option value="contacted">Contacté</option>
                    <option value="nego">En négo</option>
                    <option value="won">Gagné</option>
                    <option value="lost">Perdu</option>
                  </select>
                </div>
                <div className="fg"><label className="lbl">Température</label>
                  <select className="inp" value={form.temperature||'tiede'} onChange={function(e){setForm(Object.assign({},form,{temperature:e.target.value}))}}>
                    <option value="chaud">🔥 Chaud</option>
                    <option value="tiede">😐 Tiède</option>
                    <option value="froid">🧊 Froid</option>
                  </select>
                </div>
              </div>
              <div className="fg"><label className="lbl">Prochaine action</label><input className="inp" value={form.nextAction||''} onChange={function(e){setForm(Object.assign({},form,{nextAction:e.target.value}))}} placeholder="Ex: Relancer par email" /></div>
              <div className="fg"><label className="lbl">Date de relance</label><input type="date" className="inp" value={form.nextDate||''} onChange={function(e){setForm(Object.assign({},form,{nextDate:e.target.value}))}} /></div>
              <div className="fg"><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}))}} rows={3} placeholder="Infos utiles, historique..." /></div>
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Annuler</button>
              {form.id&&<button className="btn btn-red" onClick={function(){setProspects(function(prev){return prev.filter(function(x){return x.id!==form.id})});closeModal()}}>Supprimer</button>}
              <button className="btn btn-y" onClick={saveProspect}>{form.id?'Modifier':'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'email' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" style={{maxWidth:640}} onClick={function(e){e.stopPropagation()}}>
            <div className="mh">
              <div className="mt">✉️ Email IA — {emailProspect&&emailProspect.name}</div>
            </div>
            <div className="mb">
              {generatingEmail&&(
                <div style={{textAlign:'center',padding:30,opacity:.5}}>
                  <div style={{fontSize:28,marginBottom:8}}>✉️</div>
                  <div style={{fontWeight:900,fontSize:12}}>Génération en cours...</div>
                </div>
              )}
              {!generatingEmail&&(
                <textarea className="inp" value={generatedEmail} onChange={function(e){setGeneratedEmail(e.target.value)}} rows={14} style={{width:'100%',fontSize:13,lineHeight:1.7,fontFamily:'Arial Narrow, Arial, sans-serif'}} />
              )}
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Fermer</button>
              {!generatingEmail&&generatedEmail&&(
                <button className="btn btn-y" onClick={function(){
                  navigator.clipboard.writeText(generatedEmail).then(function(){
                    logActivity('email_copie','Email copié pour '+((emailProspect&&emailProspect.name)||''), (emailProspect&&emailProspect.name)||'',generatedEmail)
                    toast('Email copié !')
                  })
                }}>📋 Copier</button>
              )}
            </div>
          </div>
        </div>
      )}

      {modal === 'contact' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e){e.stopPropagation()}}>
            <div className="mh"><div className="mt">{form.id?'Modifier le contact':'Nouveau contact'}</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.name||''} onChange={function(e){setForm(Object.assign({},form,{name:e.target.value}))}} /></div>
              <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={function(e){setForm(Object.assign({},form,{email:e.target.value}))}} /></div>
              <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={function(e){setForm(Object.assign({},form,{phone:e.target.value}))}} /></div>
              <div className="fg"><label className="lbl">Catégorie</label>
                <select className="inp" value={form.cat||'food'} onChange={function(e){setForm(Object.assign({},form,{cat:e.target.value}))}}>
                  <option value="food">Fournisseur alimentaire</option>
                  <option value="prestataire">Prestataire</option>
                  <option value="client">Client B2B</option>
                  <option value="presse">Presse</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="fg"><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}))}} rows={2} /></div>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input type="checkbox" checked={!!form.vip} onChange={function(e){setForm(Object.assign({},form,{vip:e.target.checked}))}} />
                <label>Contact VIP ⭐</label>
              </div>
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveContact}>{form.id?'Modifier':'Créer'}</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'vault' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={function(e){e.stopPropagation()}}>
            <div className="mh"><div className="mt">{form.id?'Modifier':'Nouveau secret'}</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={function(e){setForm(Object.assign({},form,{title:e.target.value}))}} /></div>
              <div className="fg"><label className="lbl">Identifiant / Login</label><input className="inp" value={form.login||''} onChange={function(e){setForm(Object.assign({},form,{login:e.target.value}))}} /></div>
              <div className="fg"><label className="lbl">Mot de passe</label><input type="password" className="inp" value={form.password||''} onChange={function(e){setForm(Object.assign({},form,{password:e.target.value}))}} /></div>
              <div className="fg"><label className="lbl">URL / Notes</label><textarea className="inp" value={form.notes||''} onChange={function(e){setForm(Object.assign({},form,{notes:e.target.value}))}} rows={2} /></div>
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={saveVault}>{form.id?'Modifier':'Ajouter'}</button>
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
