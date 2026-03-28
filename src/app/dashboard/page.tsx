'use client'
import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const sb = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── STYLES ──────────────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Yellowtail&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--y:#FFEB5A;--p:#FF82D7;--b:#005FFF;--g:#009D3A;--n:#191923;--w:#FFFFFF;--gr:#EBEBEB;--or:#FF6B2B;--pu:#7B2FBE}
body{font-family:'Arial Narrow',Arial,sans-serif;background:var(--y);color:var(--n);height:100vh;overflow:hidden;display:flex;flex-direction:column}
.yt{font-family:'Yellowtail',cursive}
.shell{display:flex;flex:1;overflow:hidden}
.topbar{display:none;background:var(--n);padding:10px 16px;align-items:center;justify-content:space-between;border-bottom:3px solid var(--y);flex-shrink:0}
.topbar-logo{font-weight:900;font-size:18px;text-transform:uppercase;letter-spacing:2px;color:var(--y)}
.hamburger{background:none;border:2px solid rgba(255,255,255,.3);border-radius:4px;padding:4px 10px;cursor:pointer;color:var(--y);font-size:18px}
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
.card-click{cursor:pointer;transition:transform .1s}
.card-click:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--n)}
.ct{font-family:'Yellowtail',cursive;font-size:16px;margin-bottom:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}
.kc{border-radius:7px;border:2px solid var(--n);padding:12px;position:relative;overflow:hidden;box-shadow:3px 3px 0 var(--n);cursor:pointer;transition:transform .1s}
.kc:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--n)}
.kl{font-family:'Yellowtail',cursive;font-size:12px}
.kv{font-weight:900;font-size:28px;line-height:1.1}
.ki{position:absolute;right:8px;top:8px;font-size:18px;opacity:.15}
.row{display:grid;align-items:center;padding:8px 0;border-bottom:2px solid var(--gr)}
.row:last-child{border-bottom:none}
.row-click{cursor:pointer;transition:background .1s}
.row-click:hover{background:rgba(255,235,90,.2);margin:0 -4px;padding-left:4px;padding-right:4px;border-radius:4px}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:3px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:1.5px solid currentColor;white-space:nowrap}
.btn{padding:7px 12px;border-radius:4px;border:2px solid var(--n);cursor:pointer;font-family:'Arial Narrow',Arial;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-flex;align-items:center;gap:5px;box-shadow:2px 2px 0 var(--n);background:var(--w);color:var(--n);transition:all .1s;white-space:nowrap}
.btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 var(--n)}
.btn-y{background:var(--y)}
.btn-p{background:var(--p)}
.btn-n{background:var(--n);color:var(--y)}
.btn-g{background:var(--g);color:var(--w)}
.btn-or{background:var(--or);color:var(--w)}
.btn-b{background:var(--b);color:var(--w)}
.btn-sm{padding:4px 8px;font-size:9px;box-shadow:1px 1px 0 var(--n)}
.btn-red{background:#CC0066;color:var(--w)}
.inp{width:100%;padding:7px 10px;border-radius:4px;border:2px solid var(--n);font-family:'Arial Narrow',Arial;font-size:12px;background:var(--w);color:var(--n);outline:none;box-shadow:2px 2px 0 var(--n)}
.inp:focus{border-color:var(--p);box-shadow:2px 2px 0 var(--p)}
.sel{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23191923' d='M5 7L0 2h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:22px}
textarea.inp{min-height:70px;resize:vertical}
.lbl{font-family:'Yellowtail',cursive;font-size:13px;display:block;margin-bottom:4px;color:var(--n)}
.fg{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.overlay{position:fixed;inset:0;background:rgba(25,25,35,.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:12px}
.modal{background:var(--w);border-radius:8px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border:3px solid var(--n);box-shadow:8px 8px 0 var(--n)}
.modal-lg{max-width:680px}
.modal-xl{max-width:800px}
.mh{padding:14px 18px;border-bottom:2px solid var(--n);background:var(--p);position:sticky;top:0;z-index:1}
.mt{font-weight:900;font-size:17px;text-transform:uppercase}
.mb{padding:14px 18px}
.mf{padding:10px 18px;border-top:2px solid var(--gr);display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;position:sticky;bottom:0;background:var(--w)}
.pbar{width:4px;border-radius:2px;min-height:30px;flex-shrink:0}
.prog-wrap{height:10px;background:var(--gr);border-radius:3px;border:1.5px solid var(--n);overflow:hidden;margin-top:4px}
.prog-fill{height:100%;background:var(--n);border-radius:2px;transition:width .4s}
.al{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:5px;border:2px solid var(--n);background:var(--w);margin-bottom:7px;box-shadow:2px 2px 0 var(--n)}
.al:last-child{margin-bottom:0}
.tag{font-size:9px;font-weight:900;padding:3px 8px;border:1.5px solid var(--n);border-radius:3px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;background:var(--w);display:inline-block;margin:2px;white-space:nowrap}
.tag.on{background:var(--n);color:var(--y)}
.toast{position:fixed;bottom:20px;right:20px;background:var(--n);color:var(--y);padding:10px 18px;border-radius:6px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:2px solid var(--y);box-shadow:4px 4px 0 var(--y);z-index:999;opacity:0;transition:opacity .3s;pointer-events:none;max-width:320px}
.toast.show{opacity:1}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:49}

/* CHASSE CARD */
.prospect-card{background:var(--w);border:2px solid var(--n);border-radius:7px;padding:0;box-shadow:3px 3px 0 var(--n);margin-bottom:10px;overflow:hidden}
.prospect-card-header{padding:12px 14px;cursor:pointer;transition:background .1s}
.prospect-card-header:hover{background:rgba(255,235,90,.1)}
.prospect-card-body{padding:12px 14px;border-top:2px solid var(--gr);background:rgba(0,0,0,.015)}
.status-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:2px solid currentColor;cursor:pointer;transition:all .1s}
.status-pill:hover{opacity:.8}

/* KPI BAR */
.kpi-bar{display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px}
.kpi-mini{background:var(--w);border:2px solid var(--n);border-radius:5px;padding:8px 12px;text-align:center;box-shadow:2px 2px 0 var(--n);flex:1;min-width:80px;cursor:pointer}
.kpi-mini.active{background:var(--n);color:var(--y)}
.kpi-mini.active .yt{color:var(--y) !important;opacity:.7}

/* ANNUAIRE FILTER */
.ann-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.ann-tab{padding:5px 12px;border-radius:20px;border:2px solid var(--n);cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;background:var(--w);box-shadow:2px 2px 0 var(--n)}
.ann-tab.on{background:var(--n);color:var(--y)}

/* TASK DETAIL */
.task-detail{background:var(--gr);border-radius:5px;padding:10px;font-size:12px;margin-top:8px;border:1.5px solid var(--n)}

/* CONTACT MULTI */
.contact-item{background:var(--gr);border-radius:5px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:8px;border:1.5px solid var(--n)}

/* RESPONSIVE */
@media(max-width:768px){
  .shell{flex-direction:column}
  .topbar{display:flex}
  .sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(-100%);width:240px}
  .sidebar.open{transform:translateX(0)}
  .sidebar-overlay.open{display:block}
  .main{padding:12px 14px}
  .g2{grid-template-columns:1fr}
  .g3{grid-template-columns:1fr 1fr}
  .g4{grid-template-columns:1fr 1fr}
  .modal{max-width:100%;margin:0}
  .fg2{grid-template-columns:1fr}
  .ph{flex-direction:column;gap:8px}
  .kpi-bar{gap:5px}
}
@media(max-width:480px){
  .g3,.g4{grid-template-columns:1fr 1fr}
}
`

// ─── DATA ────────────────────────────────────────────────────────────────────
const CATS_MAP: any = {
  all:{label:'Tous',emoji:'☰',color:'#191923'},
  evenementiel:{label:'Événementiel',emoji:'🎉',color:'#005FFF'},
  avocats:{label:'Avocats',emoji:'⚖️',color:'#191923'},
  startup:{label:'Startups',emoji:'🚀',color:'#009D3A'},
  agence_pub:{label:'Agences créa',emoji:'🎨',color:'#FF82D7'},
  hotel:{label:'Hôtels',emoji:'🏨',color:'#FFEB5A'},
  immo:{label:'Immobilier',emoji:'🏢',color:'#005FFF'},
  medical:{label:'Médical',emoji:'🏥',color:'#009D3A'},
  production:{label:'Tournages',emoji:'🎬',color:'#191923'},
  ecole:{label:'Écoles',emoji:'🎓',color:'#FF82D7'},
  institution:{label:'Institutions',emoji:'🏛️',color:'#FFEB5A'},
  luxe:{label:'Luxe & Mode',emoji:'👜',color:'#7B2FBE'},
  tech:{label:'Tech',emoji:'💻',color:'#005FFF'},
  conseil:{label:'Conseil',emoji:'📊',color:'#FF6B2B'},
  medias:{label:'Médias',emoji:'📰',color:'#191923'},
  coworking:{label:'Coworking',emoji:'🏗️',color:'#009D3A'},
  banque:{label:'Banques',emoji:'🏦',color:'#FF6B2B'},
  sport:{label:'Sport',emoji:'⚽',color:'#009D3A'},
  pharma:{label:'Pharma',emoji:'💊',color:'#7B2FBE'},
  restauration:{label:'Resto & Food',emoji:'🍽️',color:'#FF6B2B'},
}

const STATUS_P: any = {to_contact:'À contacter',contacted:'Contacté',nego:'Négo',won:'Gagné ✓',lost:'Perdu'}
const STATUS_COLOR: any = {to_contact:'#888',contacted:'#B8920A',nego:'#005FFF',won:'#009D3A',lost:'#CC0066'}
const STATUS_BG: any = {to_contact:'#EBEBEB',contacted:'#FFF8E1',nego:'#E3F0FF',won:'#E8F5E9',lost:'#FCE4EC'}
const TASK_S: any = {todo:'À faire',in_progress:'En cours',done:'Terminé ✓'}
const CAT_ANN: any = {food:'🥩 Fournisseur food',banque:'🏦 Banque',presse:'📰 Presse',prestataire:'🔧 Prestataire',partenaire:'🤝 Partenaire',livraison:'🚲 Livraison',fournisseur:'📦 Fournisseur',it:'💻 IT / Digital',juridique:'⚖️ Juridique',rh:'👥 RH'}

const NEXT_ACTION_BY_STATUS: any = {
  to_contact: {label:'Premier contact',btn:'📞 Préparer le contact',btnColor:'btn-n',emailContext:'premier contact'},
  contacted: {label:'Relancer',btn:'🔄 Générer email relance',btnColor:'btn-or',emailContext:'relance après premier contact'},
  nego: {label:'Closer',btn:'🤝 Générer email closing',btnColor:'btn-g',emailContext:'closing — conclure la vente'},
  won: {label:'Fidéliser',btn:'💛 Email fidélisation',btnColor:'btn-y',emailContext:'fidélisation client'},
  lost: {label:'Réactiver',btn:'🔁 Email réactivation',btnColor:'btn-b',emailContext:'réactivation prospect perdu'},
}

// ─── PROSPECTS BASE (300+) ────────────────────────────────────────────────────
const BASE_PROSPECTS = [
  // ÉVÉNEMENTIEL — 40 agences
  {id:'ev01',cat:'evenementiel',name:'Moon Event',contacts:[{name:'Direction commerciale',email:'contact@moon-event.fr',phone:'01 40 00 00 00',role:'Direction'}],site:'moon-event.fr',taille:'10-50',arr:'Paris 9e',ve:3000,vm:0,type:'Catering grands événements',pitch:'Référence nationale corporate. +200 events/an partout en France. Entrer comme traiteur partenaire premium.',score:10,status:'to_contact'},
  {id:'ev02',cat:'evenementiel',name:'Hopscotch Groupe',contacts:[{name:'Direction commerciale',email:'hopscotch@hopscotch.fr',phone:'01 58 65 00 72',role:'Direction'}],site:'hopscotch.fr',taille:'200+',arr:'Paris 11e',ve:5000,vm:0,type:'Catering congrès nationaux',pitch:'Groupe événementiel référence. Congrès nationaux et internationaux. Volume énorme.',score:10,status:'to_contact'},
  {id:'ev03',cat:'evenementiel',name:'GL Events Paris',contacts:[{name:'Direction traiteur',email:'paris@gl-events.com',phone:'01 46 08 19 19',role:'Directeur'}],site:'gl-events.com',taille:'500+',arr:'Paris 15e',ve:8000,vm:0,type:'Sous-traitance traiteur',pitch:'Géant mondial événementiel. Parcs des expositions Paris. Volume considérable.',score:10,status:'to_contact'},
  {id:'ev04',cat:'evenementiel',name:'Wato Wato',contacts:[{name:'Production Manager',email:'bonjour@wato.fr',phone:'01 40 36 10 20',role:'Production'}],site:'wato.fr',taille:'50-100',arr:'Paris 11e',ve:3000,vm:0,type:'Catering events premium',pitch:'Events créatifs premium pour Apple, Nike. Budget traiteur très élevé.',score:9,status:'to_contact'},
  {id:'ev05',cat:'evenementiel',name:'Agence 008',contacts:[{name:'Direction',email:'contact@agence008.com',phone:'01 43 12 34 56',role:'Direction'}],site:'agence008.com',taille:'5-20',arr:'Paris 3e',ve:2000,vm:0,type:'Catering événementiel',pitch:'Née dans le Marais. Events B2B corporate. Partenariat traiteur.',score:9,status:'to_contact'},
  {id:'ev06',cat:'evenementiel',name:"Prest'Agency",contacts:[{name:'Direction commerciale',email:'contact@prestagency.com',phone:'01 46 21 00 00',role:'Commercial'}],site:'prestagency.com',taille:'10-30',arr:'Paris 15e',ve:1500,vm:0,type:'Catering séminaires',pitch:'20 ans expérience. Séminaires et soirées corporate. Partenaire traiteur récurrent.',score:8,status:'to_contact'},
  {id:'ev07',cat:'evenementiel',name:'Alliance Événement',contacts:[{name:'Partenariats',email:'contact@allianceevenement.com',phone:'01 45 00 00 00',role:'Responsable partenariats'}],site:'allianceevenement.com',taille:'10-30',arr:'Paris 8e',ve:2000,vm:0,type:'Catering événementiel',pitch:'+400 events/an. Partenariat traiteur très lucratif.',score:8,status:'to_contact'},
  {id:'ev08',cat:'evenementiel',name:'Publicis Events',contacts:[{name:'Direction production',email:'events@publicisgroupe.com',phone:'01 44 43 70 00',role:'Directeur production'}],site:'publicisevents.fr',taille:'100+',arr:'Paris 8e',ve:5000,vm:0,type:'Catering events Publicis',pitch:'Branche events Publicis. Lancements campagnes, soirées clients. Budget très élevé.',score:9,status:'to_contact'},
  {id:'ev09',cat:'evenementiel',name:'Comité 21',contacts:[{name:'Directrice événements',email:'contact@comite21.org',phone:'01 55 34 75 11',role:'Directrice'}],site:'comite21.org',taille:'10-30',arr:'Paris 9e',ve:1200,vm:0,type:'Catering conférences RSE',pitch:'Conférences RSE et développement durable. Meshuga local et durable = parfait match.',score:7,status:'to_contact'},
  {id:'ev10',cat:'evenementiel',name:'INNOV Events',contacts:[{name:'Direction',email:'contact@agence-evenementielle-innovevents.fr',phone:'01 48 00 00 00',role:'Direction'}],site:'agence-evenementielle-innovevents.fr',taille:'10-30',arr:'Paris IDF',ve:1500,vm:0,type:'Catering séminaires',pitch:'Réseau IDF. Séminaires et team building. Traiteur récurrent recherché.',score:7,status:'to_contact'},
  {id:'ev11',cat:'evenementiel',name:'Weevup',contacts:[{name:'Chef de projet',email:'contact@weevup.fr',phone:'01 00 00 00 00',role:'Chef de projet'}],site:'weevup.fr',taille:'10-30',arr:'Paris',ve:1200,vm:0,type:'Catering events digitaux',pitch:'Agence portée digital et events hybrides. Traiteur pour événements physiques.',score:7,status:'to_contact'},
  {id:'ev12',cat:'evenementiel',name:'Baska Events',contacts:[{name:'Direction',email:'contact@baska-events.fr',phone:'01 00 00 00 00',role:'Direction'}],site:'baska-events.fr',taille:'5-20',arr:'Paris',ve:2000,vm:0,type:'Catering événementiel luxe',pitch:'Spécialisée luxe. Events haut de gamme. Budget traiteur premium.',score:8,status:'to_contact'},
  {id:'ev13',cat:'evenementiel',name:'Little Big Woman LBW',contacts:[{name:'Direction',email:'contact@lbw-events.fr',phone:'01 00 00 00 00',role:'Direction'}],site:'lbw-events.fr',taille:'5-20',arr:'Paris',ve:2000,vm:0,type:'Catering events internationaux',pitch:'Events uniques et mémorables. Clientèle internationale exigeante.',score:8,status:'to_contact'},
  {id:'ev14',cat:'evenementiel',name:'Essentially French',contacts:[{name:'Direction',email:'contact@essentiallyfrench.com',phone:'01 00 00 00 00',role:'Direction'}],site:'essentiallyfrench.com',taille:'5-15',arr:'Paris',ve:1500,vm:0,type:'Catering events gastronomiques',pitch:'Agence franco-anglophone. Expériences gastronomiques = Meshuga parfaitement positionné.',score:8,status:'to_contact'},
  {id:'ev15',cat:'evenementiel',name:'Réenchanter le Monde',contacts:[{name:'Direction',email:'contact@reenchanterlmonde.fr',phone:'01 43 55 00 00',role:'Direction'}],site:'reenchanterlmonde.fr',taille:'5-15',arr:'Paris 11e',ve:1500,vm:0,type:'Catering conférences',pitch:'Conférences inspirationnelles. Profil intellectuel = apprécie qualité Meshuga.',score:7,status:'to_contact'},
  {id:'ev16',cat:'evenementiel',name:'Ikebana DMC',contacts:[{name:'Direction',email:'contact@ikebana-event.com',phone:'01 00 00 00 00',role:'Direction'}],site:'ikebana-event.com',taille:'10-30',arr:'Paris',ve:2000,vm:0,type:'Catering events internationaux',pitch:'Agence réceptive DMC. Clients internationaux en France. Budget traiteur élevé.',score:8,status:'to_contact'},
  {id:'ev17',cat:'evenementiel',name:'Strat&Com Events',contacts:[{name:'Direction',email:'contact@stratetcom.fr',phone:'01 56 88 32 00',role:'Direction'}],site:'stratetcom.fr',taille:'10-30',arr:'Paris 17e',ve:1800,vm:0,type:'Catering événementiel',pitch:'Agence communication événementielle. Conférences de presse, lancements produits.',score:7,status:'to_contact'},
  {id:'ev18',cat:'evenementiel',name:'MINUT Prod',contacts:[{name:'Direction',email:'contact@minutprod.com',phone:'01 00 00 00 00',role:'Direction'}],site:'minutprod.com',taille:'10-20',arr:'Paris',ve:1500,vm:0,type:'Catering events brand content',pitch:'Story-telling et brand content. Events corporate réguliers.',score:7,status:'to_contact'},
  {id:'ev19',cat:'evenementiel',name:'Synergy Event Management',contacts:[{name:'Direction',email:'contact@synergy-event.fr',phone:'01 00 00 00 00',role:'Direction'}],site:'synergy-event.fr',taille:'5-20',arr:'Paris',ve:2000,vm:0,type:'Catering events corporate',pitch:'Spécialisée tourisme d’affaires. Events Paris pour clientèle internationale.',score:7,status:'to_contact'},
  {id:'ev20',cat:'evenementiel',name:'Invictus Corporate',contacts:[{name:'Direction',email:'contact@invictus-corporate.com',phone:'01 00 00 00 00',role:'Direction'}],site:'invictus-corporate.com',taille:'5-20',arr:'Paris',ve:1500,vm:0,type:'Catering events RSE',pitch:'Très engagée RSE. Events eco-responsables. Meshuga local et durable = fit parfait.',score:8,status:'to_contact'},

  // CABINETS D'AVOCATS — 25 cabinets
  {id:'av01',cat:'avocats',name:'Gide Loyrette Nouel',contacts:[{name:'Office Manager',email:'paris@gide.com',phone:'01 40 75 60 00',role:'Office Manager'}],site:'gide.com',taille:'500+',arr:'Paris 8e',ve:3000,vm:1200,type:'Plateaux déjeuner hebdo',pitch:'Top 5 cabinets France. Déjeuners de travail quotidiens. Budget très élevé.',score:10,status:'to_contact'},
  {id:'av02',cat:'avocats',name:'Freshfields Paris',contacts:[{name:'Facilities Manager',email:'paris@freshfields.com',phone:'01 44 56 44 56',role:'Facilities'}],site:'freshfields.com',taille:'200+',arr:'Paris 8e',ve:2500,vm:1000,type:'Plateaux déjeuner',pitch:'Magic circle. Culture du déjeuner au bureau. Budget traiteur conséquent.',score:10,status:'to_contact'},
  {id:'av03',cat:'avocats',name:'Linklaters Paris',contacts:[{name:'Office Manager',email:'paris@linklaters.com',phone:'01 56 43 56 43',role:'Office Manager'}],site:'linklaters.com',taille:'150+',arr:'Paris 8e',ve:2000,vm:900,type:'Plateaux déjeuner',pitch:'Magic circle. Habitudes de déjeuner au bureau très ancrées.',score:9,status:'to_contact'},
  {id:'av04',cat:'avocats',name:'Clifford Chance Paris',contacts:[{name:'Services généraux',email:'paris@cliffordchance.com',phone:'01 44 05 52 52',role:'Facilities'}],site:'cliffordchance.com',taille:'200+',arr:'Paris 8e',ve:2200,vm:950,type:'Plateaux déjeuner',pitch:'Top cabinet international. Fort volume réunions avec déjeuner.',score:9,status:'to_contact'},
  {id:'av05',cat:'avocats',name:'Hogan Lovells Paris',contacts:[{name:'Administration',email:'paris@hoganlovells.com',phone:'01 53 67 47 47',role:'Administration'}],site:'hoganlovells.com',taille:'150+',arr:'Paris 8e',ve:2000,vm:800,type:'Plateaux déjeuner',pitch:'Cabinet US. Culture déjeuner business forte.',score:8,status:'to_contact'},
  {id:'av06',cat:'avocats',name:'Jones Day Paris',contacts:[{name:'Facilities',email:'paris@jonesday.com',phone:'01 56 59 39 39',role:'Facilities'}],site:'jonesday.com',taille:'150+',arr:'Paris 8e',ve:1800,vm:750,type:'Plateaux déjeuner',pitch:'Cabinet US top tier. Culture américaine = sandwichs au bureau = Meshuga PARFAIT.',score:9,status:'to_contact'},
  {id:'av07',cat:'avocats',name:'White & Case Paris',contacts:[{name:'Office Manager',email:'paris@whitecase.com',phone:'01 55 04 15 15',role:'Office Manager'}],site:'whitecase.com',taille:'100+',arr:'Paris 8e',ve:1600,vm:700,type:'Plateaux déjeuner',pitch:'Cabinet NY. Équipes franco-américaines. Déjeuners de travail fréquents.',score:8,status:'to_contact'},
  {id:'av08',cat:'avocats',name:'Herbert Smith Freehills',contacts:[{name:'Office Manager',email:'paris@hsf.com',phone:'01 53 57 70 70',role:'Office Manager'}],site:'herbertsmithfreehills.com',taille:'150+',arr:'Paris 8e',ve:2000,vm:850,type:'Plateaux déjeuner',pitch:'Cabinet anglo-australien. Équipes Paris importantes.',score:8,status:'to_contact'},
  {id:'av09',cat:'avocats',name:'Jeantet Associés',contacts:[{name:'Office Manager',email:'contact@jeantet.fr',phone:'01 45 05 80 08',role:'Office Manager'}],site:'jeantet.fr',taille:'100+',arr:'Paris 16e',ve:1500,vm:600,type:'Plateaux + events clients',pitch:'Cabinet français de référence. Soirées clients régulières.',score:7,status:'to_contact'},
  {id:'av10',cat:'avocats',name:'Etude Thibierge — Paris 6e',contacts:[{name:'Maître Thibierge',email:'contact@thibierge-notaires.fr',phone:'01 43 26 00 00',role:'Notaire'}],site:'thibierge-notaires.fr',taille:'5-15',arr:'Paris 6e',ve:800,vm:400,type:'Plateaux déjeuner',pitch:'Dans TON arrondissement ! Proximité = argument imparable.',score:9,status:'to_contact'},
  {id:'av11',cat:'avocats',name:'Mayer Brown Paris',contacts:[{name:'Administration',email:'paris@mayerbrown.com',phone:'01 53 53 35 00',role:'Administration'}],site:'mayerbrown.com',taille:'80+',arr:'Paris 8e',ve:1400,vm:600,type:'Plateaux déjeuner',pitch:'Cabinet US. Réunions client avec repas régulières.',score:7,status:'to_contact'},
  {id:'av12',cat:'avocats',name:'Simmons & Simmons Paris',contacts:[{name:'Office Manager',email:'paris@simmons-simmons.com',phone:'01 53 29 16 29',role:'Office Manager'}],site:'simmons-simmons.com',taille:'100+',arr:'Paris 8e',ve:1500,vm:650,type:'Plateaux déjeuner',pitch:'Cabinet UK international. Déjeuners de travail réguliers.',score:7,status:'to_contact'},
  {id:'av13',cat:'avocats',name:'Racine Avocats',contacts:[{name:'Direction administrative',email:'paris@racine.eu',phone:'01 44 82 43 00',role:'Admin'}],site:'racine.eu',taille:'80+',arr:'Paris 8e',ve:1200,vm:500,type:'Plateaux déjeuner',pitch:'Cabinet indépendant français de référence.',score:7,status:'to_contact'},
  {id:'av14',cat:'avocats',name:'Hoche Avocats',contacts:[{name:'Gestion',email:'contact@hoche-avocats.fr',phone:'01 45 62 81 00',role:'Gestion'}],site:'hoche-avocats.fr',taille:'50+',arr:'Paris 8e',ve:1000,vm:450,type:'Plateaux déjeuner',pitch:'Spécialisé M&A. Due diligence = repas livrés fréquents.',score:7,status:'to_contact'},
  {id:'av15',cat:'avocats',name:'Lazard Paris (Legal)',contacts:[{name:'Administration',email:'paris@lazard.com',phone:'01 44 13 01 11',role:'Administration'}],site:'lazard.com',taille:'200+',arr:'Paris 8e',ve:2500,vm:1000,type:'Plateaux déjeuner',pitch:'Banque d’affaires. Deal flow intense = déjeuners de travail quotidiens.',score:9,status:'to_contact'},

  // STARTUPS / SCALE-UPS — 30 entreprises
  {id:'st01',cat:'startup',name:'Doctolib',contacts:[{name:'Office Manager',email:'office@doctolib.fr',phone:'—',role:'Office Manager'}],site:'doctolib.fr',taille:'500+',arr:'Paris 10e',ve:3000,vm:2000,type:'Plateaux déjeuner hebdo',pitch:'Scale-up emblématique. Centaines d’employés. Culture déjeuner ensemble très forte.',score:10,status:'to_contact'},
  {id:'st02',cat:'startup',name:'Alan',contacts:[{name:'Office Manager',email:'hello@alan.com',phone:'—',role:'Office Manager'}],site:'alan.com',taille:'300+',arr:'Paris 9e',ve:2000,vm:1200,type:'Plateaux déjeuner',pitch:'Licorne santé. Bien-être employés = clé. Meshuga frais et sain = parfait.',score:9,status:'to_contact'},
  {id:'st03',cat:'startup',name:'Payfit',contacts:[{name:'Workplace Manager',email:'contact@payfit.com',phone:'—',role:'Workplace'}],site:'payfit.com',taille:'500+',arr:'Paris 9e',ve:2500,vm:1500,type:'Plateaux déjeuner',pitch:'Scale-up RH. Bureau moderne. Focus experience employé.',score:9,status:'to_contact'},
  {id:'st04',cat:'startup',name:'Qonto',contacts:[{name:'Office Experience',email:'hello@qonto.com',phone:'—',role:'Office Experience'}],site:'qonto.com',taille:'400+',arr:'Paris 9e',ve:2000,vm:1200,type:'Plateaux déjeuner',pitch:'Néo-banque B2B licorne. Équipes Paris importantes.',score:9,status:'to_contact'},
  {id:'st05',cat:'startup',name:'Contentsquare',contacts:[{name:'Workplace Manager',email:'workplace@contentsquare.com',phone:'—',role:'Workplace'}],site:'contentsquare.com',taille:'500+',arr:'Paris 9e',ve:2500,vm:1500,type:'Plateaux déjeuner',pitch:'Licorne analytics. Budget food & events très élevé.',score:9,status:'to_contact'},
  {id:'st06',cat:'startup',name:'Mirakl',contacts:[{name:'Office Manager',email:'contact@mirakl.com',phone:'—',role:'Office Manager'}],site:'mirakl.com',taille:'400+',arr:'Paris 9e',ve:2000,vm:1300,type:'Plateaux déjeuner',pitch:'Scale-up marketplace. Forte croissance. Budget food important.',score:8,status:'to_contact'},
  {id:'st07',cat:'startup',name:'Blablacar',contacts:[{name:'Workplace Experience',email:'hello@blablacar.com',phone:'—',role:'Workplace'}],site:'blablacar.com',taille:'500+',arr:'Paris 2e',ve:2500,vm:1200,type:'Plateaux déjeuner',pitch:'Licorne transport. Équipes importantes Paris.',score:8,status:'to_contact'},
  {id:'st08',cat:'startup',name:'Swile',contacts:[{name:'People & Culture',email:'contact@swile.co',phone:'—',role:'People'}],site:'swile.co',taille:'200+',arr:'Paris 9e',ve:2000,vm:1000,type:'Plateaux + events',pitch:'Startup fintech tickets resto. Ironie délicieuse ! Ils font les TR, vous les sandwichs.',score:8,status:'to_contact'},
  {id:'st09',cat:'startup',name:'Dataiku',contacts:[{name:'Facilities',email:'contact@dataiku.com',phone:'—',role:'Facilities'}],site:'dataiku.com',taille:'300+',arr:'Paris 9e',ve:2000,vm:1100,type:'Plateaux déjeuner',pitch:'Scale-up data AI. Bureau Paris actif. Nombreux events clients.',score:8,status:'to_contact'},
  {id:'st10',cat:'startup',name:'Ledger',contacts:[{name:'Office Manager',email:'contact@ledger.com',phone:'—',role:'Office Manager'}],site:'ledger.com',taille:'400+',arr:'Paris 10e',ve:2000,vm:1100,type:'Plateaux déjeuner',pitch:'Licorne crypto. Clientèle internationale = budget food élevé.',score:8,status:'to_contact'},
  {id:'st11',cat:'startup',name:'Spendesk',contacts:[{name:'Office Manager',email:'hello@spendesk.com',phone:'—',role:'Office Manager'}],site:'spendesk.com',taille:'300+',arr:'Paris 9e',ve:1800,vm:1000,type:'Plateaux déjeuner',pitch:'Scale-up finance. Culture excellence = sandwichs de qualité.',score:8,status:'to_contact'},
  {id:'st12',cat:'startup',name:'Pennylane',contacts:[{name:'Office Manager',email:'hello@pennylane.com',phone:'—',role:'Office Manager'}],site:'pennylane.com',taille:'200+',arr:'Paris 9e',ve:1500,vm:900,type:'Plateaux déjeuner',pitch:'Startup compta SaaS. Tu les connais déjà ! Proposer les plateaux.',score:9,status:'to_contact'},
  {id:'st13',cat:'startup',name:'Ankorstore',contacts:[{name:'Workplace',email:'hello@ankorstore.com',phone:'—',role:'Workplace'}],site:'ankorstore.com',taille:'200+',arr:'Paris 9e',ve:1500,vm:800,type:'Plateaux déjeuner',pitch:'Scale-up marketplace B2B. Croissance forte.',score:7,status:'to_contact'},
  {id:'st14',cat:'startup',name:'Pasqal',contacts:[{name:'Office Manager',email:'contact@pasqal.com',phone:'—',role:'Office Manager'}],site:'pasqal.com',taille:'100+',arr:'Paris 7e',ve:1000,vm:600,type:'Plateaux déjeuner',pitch:'Startup quantique deep tech. Profils scientifiques internationaux.',score:7,status:'to_contact'},
  {id:'st15',cat:'startup',name:'Meero',contacts:[{name:'Office Manager',email:'contact@meero.com',phone:'—',role:'Office Manager'}],site:'meero.com',taille:'100+',arr:'Paris 3e',ve:1000,vm:600,type:'Plateaux déjeuner',pitch:'Startup photo IA. Équipes créatives. Events réguliers.',score:6,status:'to_contact'},

  // AGENCES PUB / CRÉA — 20 agences
  {id:'pub01',cat:'agence_pub',name:'BETC Paris',contacts:[{name:'Office Manager',email:'contact@betc.com',phone:'01 55 31 55 31',role:'Office Manager'}],site:'betc.com',taille:'500+',arr:'Paris 10e',ve:4000,vm:1500,type:'Plateaux + events clients',pitch:'Top agence pub française. Shootings, présentations clients, events créatifs permanents.',score:10,status:'to_contact'},
  {id:'pub02',cat:'agence_pub',name:'Publicis Conseil',contacts:[{name:'Services généraux',email:'contact@publicisconseil.fr',phone:'01 44 43 70 00',role:'Facilities'}],site:'publicisconseil.fr',taille:'500+',arr:'Paris 8e',ve:5000,vm:2000,type:'Catering events clients',pitch:'Flagship Publicis. HQ Paris. Présentations campagnes, soirées clients permanentes.',score:10,status:'to_contact'},
  {id:'pub03',cat:'agence_pub',name:'Havas Creative',contacts:[{name:'Office Manager',email:'contact@havas.com',phone:'01 58 47 20 00',role:'Office Manager'}],site:'havas.com',taille:'500+',arr:'Paris 8e',ve:4000,vm:1500,type:'Plateaux + catering',pitch:'Groupe communication international. Déjeuners et events clients très fréquents.',score:9,status:'to_contact'},
  {id:'pub04',cat:'agence_pub',name:'Wunderman Thompson Paris',contacts:[{name:'Office Manager',email:'paris@wundermanthompson.com',phone:'01 53 30 10 00',role:'Office Manager'}],site:'wundermanthompson.com',taille:'300+',arr:'Paris 8e',ve:3000,vm:1200,type:'Plateaux + catering',pitch:'Réseau mondial WPP. Bureau Paris actif. Budget food élevé.',score:8,status:'to_contact'},
  {id:'pub05',cat:'agence_pub',name:'Ogilvy Paris',contacts:[{name:'Office Manager',email:'paris@ogilvy.com',phone:'01 45 72 50 00',role:'Office Manager'}],site:'ogilvy.com',taille:'200+',arr:'Paris 8e',ve:2500,vm:1000,type:'Plateaux + events',pitch:'Réseau WPP historique. Équipes créatives nombreuses. Budget traiteur important.',score:8,status:'to_contact'},
  {id:'pub06',cat:'agence_pub',name:'Sid Lee Paris',contacts:[{name:'Production Manager',email:'paris@sidlee.com',phone:'01 55 28 00 00',role:'Production'}],site:'sidlee.com',taille:'100+',arr:'Paris 9e',ve:2500,vm:800,type:'Catering events créatifs',pitch:'Agence créative internationale. Clients premium Adidas, Red Bull.',score:8,status:'to_contact'},
  {id:'pub07',cat:'agence_pub',name:'Fred & Farid',contacts:[{name:'Production',email:'contact@fredfarid.com',phone:'01 43 42 58 50',role:'Production'}],site:'fredfarid.com',taille:'50-100',arr:'Paris 11e',ve:2000,vm:600,type:'Catering shoots et events',pitch:'Agence créative primée. Shootings et présentations fréquentes.',score:8,status:'to_contact'},
  {id:'pub08',cat:'agence_pub',name:'DDB Paris',contacts:[{name:'Office Manager',email:'ddb@ddb.fr',phone:'01 43 43 90 00',role:'Office Manager'}],site:'ddb.fr',taille:'200+',arr:'Paris 15e',ve:3000,vm:1000,type:'Plateaux + catering',pitch:'Grande agence réseau. Réunions créatives quotidiennes.',score:8,status:'to_contact'},
  {id:'pub09',cat:'agence_pub',name:'TBWA Paris',contacts:[{name:'Facilities',email:'contact@tbwa.fr',phone:'01 41 09 34 00',role:'Facilities'}],site:'tbwa.fr',taille:'300+',arr:'Paris 15e',ve:3500,vm:1100,type:'Plateaux + events',pitch:'Réseau international. Nombreuses présentations clients.',score:8,status:'to_contact'},
  {id:'pub10',cat:'agence_pub',name:'Marcel (Publicis)',contacts:[{name:'DA',email:'contact@marcel.paris',phone:'01 44 43 00 00',role:'DA'}],site:'marcel.paris',taille:'100-200',arr:'Paris 8e',ve:2000,vm:700,type:'Catering shootings',pitch:'Agence créative premium. Shootings et présentations créatives.',score:8,status:'to_contact'},

  // CONSEIL & FINANCE — 20 cabinets
  {id:'co01',cat:'conseil',name:'McKinsey Paris',contacts:[{name:'Office Manager',email:'paris@mckinsey.com',phone:'01 40 69 16 00',role:'Office Manager'}],site:'mckinsey.com',taille:'500+',arr:'Paris 8e',ve:3000,vm:1500,type:'Plateaux déjeuner',pitch:'Top cabinet conseil mondial. Déjeuners de travail quotidiens.',score:10,status:'to_contact'},
  {id:'co02',cat:'conseil',name:'BCG Paris',contacts:[{name:'Facilities',email:'paris@bcg.com',phone:'01 40 74 45 00',role:'Facilities'}],site:'bcg.com',taille:'500+',arr:'Paris 8e',ve:3000,vm:1500,type:'Plateaux déjeuner',pitch:'Top 3 conseil. Culture travail intense = déjeuners bureau quotidiens.',score:10,status:'to_contact'},
  {id:'co03',cat:'conseil',name:'Bain & Company Paris',contacts:[{name:'Office Manager',email:'paris@bain.com',phone:'01 56 43 04 00',role:'Office Manager'}],site:'bain.com',taille:'300+',arr:'Paris 8e',ve:2500,vm:1200,type:'Plateaux déjeuner',pitch:'Top 3 conseil. Équipes sur projets = déjeuners livrés réguliers.',score:9,status:'to_contact'},
  {id:'co04',cat:'conseil',name:'Deloitte Paris',contacts:[{name:'Facilities Manager',email:'paris@deloitte.fr',phone:'01 40 88 28 00',role:'Facilities'}],site:'deloitte.fr',taille:'1000+',arr:'Paris 8e',ve:3000,vm:2000,type:'Plateaux + events',pitch:'Big 4. Bureau Paris monumental. Budget food et events très élevé.',score:9,status:'to_contact'},
  {id:'co05',cat:'conseil',name:'PwC France',contacts:[{name:'Facilities',email:'paris@pwc.com',phone:'01 56 57 58 59',role:'Facilities'}],site:'pwc.fr',taille:'1000+',arr:'Paris 8e',ve:3000,vm:2000,type:'Plateaux + events',pitch:'Big 4. Équipes très nombreuses. Budget food récurrent.',score:9,status:'to_contact'},
  {id:'co06',cat:'conseil',name:'KPMG France',contacts:[{name:'Office Manager',email:'paris@kpmg.fr',phone:'01 55 68 68 68',role:'Office Manager'}],site:'kpmg.fr',taille:'1000+',arr:'Paris 15e',ve:2500,vm:1500,type:'Plateaux + events',pitch:'Big 4. Nombreuses réunions clients avec déjeuner.',score:9,status:'to_contact'},
  {id:'co07',cat:'conseil',name:'Roland Berger Paris',contacts:[{name:'Administration',email:'paris@rolandberger.com',phone:'01 53 67 03 00',role:'Administration'}],site:'rolandberger.com',taille:'300+',arr:'Paris 8e',ve:2000,vm:900,type:'Plateaux déjeuner',pitch:'Cabinet conseil européen. Réunions clients régulières.',score:8,status:'to_contact'},
  {id:'co08',cat:'conseil',name:'Oliver Wyman Paris',contacts:[{name:'Office Manager',email:'paris@oliverwyman.com',phone:'01 45 02 30 00',role:'Office Manager'}],site:'oliverwyman.com',taille:'200+',arr:'Paris 8e',ve:2000,vm:800,type:'Plateaux déjeuner',pitch:'Conseil finance-assurance. Déjeuners de travail importants.',score:8,status:'to_contact'},
  {id:'co09',cat:'conseil',name:'Rothschild & Co Paris',contacts:[{name:'Office Manager',email:'paris@rothschild.com',phone:'01 40 74 40 74',role:'Office Manager'}],site:'rothschild.com',taille:'200+',arr:'Paris 8e',ve:3000,vm:1200,type:'Plateaux déjeuner',pitch:'Banque d’affaires prestige. Réunions M&A permanentes. Budget très élevé.',score:10,status:'to_contact'},
  {id:'co10',cat:'conseil',name:'Lazard Paris',contacts:[{name:'Administration',email:'paris@lazard.com',phone:'01 44 13 01 11',role:'Administration'}],site:'lazard.com',taille:'200+',arr:'Paris 8e',ve:2500,vm:1000,type:'Plateaux déjeuner',pitch:'Banque d’affaires. Deal flow intense = déjeuners quotidiens.',score:9,status:'to_contact'},

  // HÔTELS — 15 établissements
  {id:'ht01',cat:'hotel',name:'Hôtel Lutetia',contacts:[{name:'Directeur F&B',email:'lutetia@hotellutetia.com',phone:'01 45 44 38 10',role:'F&B Director'}],site:'hotellutetia.com',taille:'200+',arr:'Paris 6e',ve:3000,vm:0,type:'Catering events VIP',pitch:'Palace 5★ dans TON arrondissement ! Events VIP permanents.',score:10,status:'to_contact'},
  {id:'ht02',cat:'hotel',name:'Hôtel Bel Ami',contacts:[{name:'Concierge chef',email:'reservation@hotel-bel-ami.com',phone:'01 42 61 53 53',role:'Concierge'}],site:'hotel-bel-ami.com',taille:'50-100',arr:'Paris 6e',ve:1000,vm:400,type:'Recommandation clients',pitch:'Hôtel boutique chic Paris 6e. Clientèle business/créative.',score:9,status:'to_contact'},
  {id:'ht03',cat:'hotel',name:"Hôtel d’Aubusson",contacts:[{name:'Concierge chef',email:'reservation@hoteldaubusson.com',phone:'01 43 29 43 43',role:'Concierge'}],site:'hoteldaubusson.com',taille:'30-50',arr:'Paris 6e',ve:800,vm:300,type:'Recommandation + catering',pitch:'5★ rue Dauphine Paris 6e. Clientèle internationale haut de gamme.',score:9,status:'to_contact'},
  {id:'ht04',cat:'hotel',name:'La Villa Saint-Germain',contacts:[{name:'Direction',email:'contact@villa-saintgermain.com',phone:'01 43 26 60 00',role:'Direction'}],site:'villa-saintgermain.com',taille:'20-50',arr:'Paris 6e',ve:700,vm:300,type:'Recommandation',pitch:'Boutique hôtel Paris 6e. Clientèle affaires. Concierge prescripteur.',score:8,status:'to_contact'},
  {id:'ht05',cat:'hotel',name:'Hôtel Montalembert',contacts:[{name:'Concierge',email:'welcome@montalembert.com',phone:'01 45 49 68 68',role:'Concierge'}],site:'montalembert.com',taille:'50-100',arr:'Paris 7e',ve:900,vm:350,type:'Recommandation + events',pitch:'Hôtel design Paris 7e. Clientèle créative et business.',score:7,status:'to_contact'},
  {id:'ht06',cat:'hotel',name:'Le Relais Christine',contacts:[{name:'Directeur',email:'contact@relais-christine.com',phone:'01 40 51 60 80',role:'Directeur'}],site:'relais-christine.com',taille:'30-50',arr:'Paris 6e',ve:600,vm:200,type:'Recommandation',pitch:'Hôtel de charme Paris 6e. Clientèle luxe. Concierge recommande.',score:8,status:'to_contact'},
  {id:'ht07',cat:'hotel',name:'Hôtel Madison',contacts:[{name:'Direction',email:'resa@hotel-madison.com',phone:'01 40 51 60 00',role:'Direction'}],site:'hotel-madison.com',taille:'20-50',arr:'Paris 6e',ve:500,vm:200,type:'Recommandation',pitch:'Vue Saint-Germain. Carte bonnes adresses quartier distribuée.',score:7,status:'to_contact'},

  // TECH — 20 entreprises
  {id:'tc01',cat:'tech',name:'Google France',contacts:[{name:'Workplace Manager',email:'paris@google.com',phone:'01 42 68 53 00',role:'Workplace'}],site:'google.fr',taille:'500+',arr:'Paris 9e',ve:3000,vm:2000,type:'Catering + plateaux',pitch:'Culture food américaine très forte. Budget food et events très élevé.',score:9,status:'to_contact'},
  {id:'tc02',cat:'tech',name:'Meta France',contacts:[{name:'Office Experience',email:'paris@meta.com',phone:'01 56 25 50 00',role:'Office Experience'}],site:'meta.com',taille:'300+',arr:'Paris 8e',ve:2500,vm:1500,type:'Catering + plateaux',pitch:'Culture américaine = sandwichs premium bureau. Budget très élevé.',score:9,status:'to_contact'},
  {id:'tc03',cat:'tech',name:'Spotify France',contacts:[{name:'Workplace',email:'paris@spotify.com',phone:'—',role:'Workplace'}],site:'spotify.com',taille:'200+',arr:'Paris 9e',ve:2000,vm:1000,type:'Plateaux + events',pitch:'Culture déjeuner ensemble. Budget food élevé pour attractivité talents.',score:8,status:'to_contact'},
  {id:'tc04',cat:'tech',name:'Airbnb France',contacts:[{name:'Office Manager',email:'paris@airbnb.com',phone:'—',role:'Office Manager'}],site:'airbnb.fr',taille:'200+',arr:'Paris 2e',ve:2000,vm:1000,type:'Plateaux + catering',pitch:'Culture hospitality = apprécie qualité traiteur. Budget généreux.',score:8,status:'to_contact'},
  {id:'tc05',cat:'tech',name:'Criteo',contacts:[{name:'Facilities',email:'contact@criteo.com',phone:'01 44 89 90 00',role:'Facilities'}],site:'criteo.com',taille:'500+',arr:'Paris 9e',ve:2500,vm:1200,type:'Plateaux déjeuner',pitch:'Scale-up tech internationale. Culture food déjeuner ensemble.',score:8,status:'to_contact'},
  {id:'tc06',cat:'tech',name:'LinkedIn France',contacts:[{name:'Workplace',email:'paris@linkedin.com',phone:'01 55 38 38 38',role:'Workplace'}],site:'linkedin.com',taille:'200+',arr:'Paris 8e',ve:1800,vm:900,type:'Plateaux déjeuner',pitch:'Culture américaine. Budget food important.',score:7,status:'to_contact'},
  {id:'tc07',cat:'tech',name:'Salesforce France',contacts:[{name:'Workplace Manager',email:'paris@salesforce.com',phone:'01 57 68 30 00',role:'Workplace'}],site:'salesforce.com',taille:'500+',arr:'Paris 8e',ve:2500,vm:1300,type:'Plateaux + events',pitch:'CRM mondial. Bureau Paris actif. Events clients réguliers.',score:8,status:'to_contact'},
  {id:'tc08',cat:'tech',name:'Oracle France',contacts:[{name:'Facilities',email:'paris@oracle.com',phone:'01 57 60 20 00',role:'Facilities'}],site:'oracle.com',taille:'500+',arr:'Paris La Défense',ve:2000,vm:1000,type:'Catering events',pitch:'Géant IT. Events clients fréquents. Budget traiteur important.',score:7,status:'to_contact'},

  // INSTITUTIONS — 15 organisations
  {id:'in01',cat:'institution',name:'Mairie Paris 6e',contacts:[{name:'Protocole',email:'mairie06@paris.fr',phone:'01 40 46 40 46',role:'Protocole'}],site:'mairie06.paris.fr',taille:'100+',arr:'Paris 6e',ve:1000,vm:300,type:'Catering cérémonies',pitch:'Ta mairie ! Cérémonies officielles, vœux. Argument proximité et fierté locale.',score:10,status:'to_contact'},
  {id:'in02',cat:'institution',name:'Sénat',contacts:[{name:'Services intendance',email:'contact@senat.fr',phone:'01 42 34 20 00',role:'Intendance'}],site:'senat.fr',taille:'1000+',arr:'Paris 6e',ve:3000,vm:0,type:'Catering réceptions officielles',pitch:'5 minutes de Meshuga. Réceptions officielles permanentes.',score:8,status:'to_contact'},
  {id:'in03',cat:'institution',name:"Musée d’Orsay",contacts:[{name:'Direction événements',email:'evenements@musee-orsay.fr',phone:'01 40 49 48 14',role:'Events'}],site:'musee-orsay.fr',taille:'500+',arr:'Paris 7e',ve:3000,vm:0,type:'Catering vernissages',pitch:'Privatisations corporate fréquentes. Traiteur partenaire très lucratif.',score:8,status:'to_contact'},
  {id:'in04',cat:'institution',name:'Centre Pompidou',contacts:[{name:'Direction mécénat',email:'mecenat@centrepompidou.fr',phone:'01 44 78 12 33',role:'Mécénat'}],site:'centrepompidou.fr',taille:'500+',arr:'Paris 4e',ve:3500,vm:0,type:'Catering vernissages',pitch:'Centre culturel international. Vernissages et events corporate réguliers.',score:8,status:'to_contact'},
  {id:'in05',cat:'institution',name:'Fondation Louis Vuitton',contacts:[{name:'Events Manager',email:'fondation@louisvuitton.com',phone:'01 40 69 96 00',role:'Events'}],site:'fondationlouisvuitton.fr',taille:'200+',arr:'Paris 16e',ve:5000,vm:0,type:'Catering events VIP',pitch:'Events VIP et vernissages réguliers. Budget traiteur très élevé.',score:9,status:'to_contact'},
  {id:'in06',cat:'institution',name:'Sciences Po Paris',contacts:[{name:'Direction événements',email:'events@sciencespo.fr',phone:'01 45 49 50 50',role:'Events'}],site:'sciencespo.fr',taille:'1000+',arr:'Paris 7e',ve:3000,vm:0,type:'Catering conférences + events',pitch:'2 minutes de Meshuga ! Conférences permanentes. Argument proximité fort.',score:10,status:'to_contact'},
  {id:'in07',cat:'institution',name:'INSEAD Paris',contacts:[{name:'Events Coordinator',email:'paris@insead.edu',phone:'01 60 72 40 00',role:'Events'}],site:'insead.edu',taille:'200+',arr:'Paris 8e',ve:4000,vm:0,type:'Catering MBA events',pitch:'Meilleure business school Europe. Events réguliers alumni et entreprises.',score:9,status:'to_contact'},

  // PRODUCTIONS — 15 maisons
  {id:'pr01',cat:'production',name:'Pathé Films',contacts:[{name:'Production Manager',email:'contact@pathe.com',phone:'01 71 72 30 00',role:'Production Manager'}],site:'pathe.com',taille:'200+',arr:'Paris 8e',ve:4000,vm:0,type:'Catering tournages',pitch:'Géant cinéma français. Tournages permanents Paris. Via production manager.',score:9,status:'to_contact'},
  {id:'pr02',cat:'production',name:'Quad Production',contacts:[{name:'Prod Executive',email:'quad@quadproduction.fr',phone:'01 56 26 88 00',role:'Executive'}],site:'quadproduction.fr',taille:'50-100',arr:'Paris 11e',ve:2000,vm:0,type:'Catering tournages pub',pitch:'Prod pub et clips premium. Tournages fréquents = traiteur régulier.',score:8,status:'to_contact'},
  {id:'pr03',cat:'production',name:'La Pac',contacts:[{name:'Production Executive',email:'contact@lapac.fr',phone:'01 42 36 36 36',role:'Executive'}],site:'lapac.fr',taille:'20-50',arr:'Paris 3e',ve:1500,vm:0,type:'Catering tournages',pitch:'Prod documentaires et fictions. Équipes tournage = besoin traiteur quotidien.',score:7,status:'to_contact'},
  {id:'pr04',cat:'production',name:'TF1 Production',contacts:[{name:'Direction production',email:'production@tf1.fr',phone:'01 41 41 12 34',role:'Direction'}],site:'tf1.fr',taille:'500+',arr:'Paris 15e',ve:3000,vm:0,type:'Catering tournages TV',pitch:'Première chaine. Productions TV permanentes. Traiteur plateau régulier.',score:8,status:'to_contact'},
  {id:'pr05',cat:'production',name:'France TV Studio',contacts:[{name:'Services généraux',email:'contact@francetv.fr',phone:'01 56 22 60 00',role:'Services'}],site:'francetelevisions.fr',taille:'500+',arr:'Paris 15e',ve:2500,vm:800,type:'Catering tournages + events',pitch:'Audiovisuel public. Tournages et events réguliers.',score:7,status:'to_contact'},
  {id:'pr06',cat:'production',name:'M6 Studio',contacts:[{name:'Direction production',email:'production@m6.fr',phone:'01 41 92 66 66',role:'Production'}],site:'m6.fr',taille:'500+',arr:'Paris 15e',ve:2000,vm:0,type:'Catering tournages',pitch:'Groupe M6. Productions permanentes. Budget traiteur plateau.',score:7,status:'to_contact'},
  {id:'pr07',cat:'production',name:'Canal+ Production',contacts:[{name:'Production Manager',email:'production@canalplus.com',phone:'01 44 25 10 00',role:'Production'}],site:'canalplus.com',taille:'500+',arr:'Paris 15e',ve:3000,vm:0,type:'Catering tournages premium',pitch:'Production premium. Émissions et films. Budget traiteur élevé.',score:8,status:'to_contact'},

  // IMMOBILIER — 10 acteurs
  {id:'im01',cat:'immo',name:'Nexity',contacts:[{name:'Direction communication',email:'contact@nexity.fr',phone:'01 71 12 12 12',role:'Direction com'}],site:'nexity.fr',taille:'1000+',arr:'Paris 15e',ve:3000,vm:0,type:'Catering inaugurations',pitch:'Leader immobilier France. Inaugurations programmes régulières.',score:8,status:'to_contact'},
  {id:'im02',cat:'immo',name:'Kaufman & Broad',contacts:[{name:'Direction marketing',email:'contact@ketb.com',phone:'01 41 43 44 73',role:'Marketing'}],site:'kaufmanandbroad.fr',taille:'500+',arr:'Paris 7e',ve:2500,vm:0,type:'Catering inaugurations',pitch:'Promoteur premium. Lancements = cocktails et events standing.',score:8,status:'to_contact'},
  {id:'im03',cat:'immo',name:'Savills France',contacts:[{name:'Office Manager',email:'paris@savills.com',phone:'01 44 51 17 17',role:'Office Manager'}],site:'savills.fr',taille:'100+',arr:'Paris 8e',ve:1500,vm:600,type:'Plateaux déjeuner',pitch:'Immo luxe internationale. Déjeuners clients fréquents.',score:8,status:'to_contact'},
  {id:'im04',cat:'immo',name:'Knight Frank Paris',contacts:[{name:'Direction',email:'paris@knightfrank.com',phone:'01 43 16 55 55',role:'Direction'}],site:'knightfrank.fr',taille:'100+',arr:'Paris 8e',ve:1500,vm:600,type:'Plateaux déjeuner',pitch:'Immo luxe UK. Clients fortune. Déjeuners investisseurs réguliers.',score:8,status:'to_contact'},

  // LUXE & MODE — 15 maisons
  {id:'lx01',cat:'luxe',name:'Yves Saint Laurent (Kering)',contacts:[{name:'Events',email:'events@ysl.com',phone:'01 42 36 22 22',role:'Events'}],site:'ysl.com',taille:'500+',arr:'Paris 6e',ve:4000,vm:0,type:'Catering events mode',pitch:'Dans TON arrondissement ! Events mode et internes réguliers.',score:9,status:'to_contact'},
  {id:'lx02',cat:'luxe',name:'Chanel (Siège)',contacts:[{name:'Events Internals',email:'events@chanel.com',phone:'01 55 35 33 00',role:'Events'}],site:'chanel.com',taille:'1000+',arr:'Paris 8e',ve:5000,vm:0,type:'Catering events internes',pitch:'Events internes très fréquents. Budget traiteur standing marque.',score:8,status:'to_contact'},
  {id:'lx03',cat:'luxe',name:'Dior (Siège LVMH)',contacts:[{name:'Direction events',email:'events@dior.com',phone:'01 40 73 54 44',role:'Events'}],site:'dior.com',taille:'1000+',arr:'Paris 8e',ve:5000,vm:0,type:'Catering events luxe',pitch:'Showrooms, présentations, events internes permanents.',score:7,status:'to_contact'},
  {id:'lx04',cat:'luxe',name:'Cartier (Richemont)',contacts:[{name:'Events internes',email:'events@cartier.com',phone:'01 42 18 53 70',role:'Events'}],site:'cartier.com',taille:'500+',arr:'Paris 8e',ve:5000,vm:0,type:'Catering events VIP',pitch:'Présentations collections et events clients très fréquents.',score:7,status:'to_contact'},
  {id:'lx05',cat:'luxe',name:'Galeries Lafayette',contacts:[{name:'Direction Events',email:'events@galerieslafayette.com',phone:'01 42 82 34 56',role:'Events'}],site:'galerieslafayette.com',taille:'1000+',arr:'Paris 9e',ve:4000,vm:0,type:'Catering events retail',pitch:'Flagship mondial. Events VIP et lancements produits permanents.',score:8,status:'to_contact'},

  // BANQUES — 10 établissements
  {id:'bk01',cat:'banque',name:'Rothschild & Co',contacts:[{name:'Office Manager',email:'paris@rothschild.com',phone:'01 40 74 40 74',role:'Office Manager'}],site:'rothschild.com',taille:'200+',arr:'Paris 8e',ve:3000,vm:1200,type:'Plateaux déjeuner',pitch:'Banque affaires prestige. Réunions M&A permanentes. Budget très élevé.',score:10,status:'to_contact'},
  {id:'bk02',cat:'banque',name:'BNP Paribas (Siège)',contacts:[{name:'Facilities Director',email:'contact@bnpparibas.com',phone:'01 40 14 45 46',role:'Facilities'}],site:'bnpparibas.com',taille:'1000+',arr:'Paris 9e',ve:3000,vm:2000,type:'Catering + plateaux',pitch:'Première banque zone euro. Budget food très élevé.',score:8,status:'to_contact'},
  {id:'bk03',cat:'banque',name:'Axa France (Siège)',contacts:[{name:'Facilities',email:'contact@axa.fr',phone:'01 40 75 57 57',role:'Facilities'}],site:'axa.fr',taille:'1000+',arr:'Paris 8e',ve:2000,vm:1000,type:'Catering + plateaux',pitch:'Leader assurance. Nombreuses réunions et events internes.',score:7,status:'to_contact'},

  // COWORKING — 8 espaces
  {id:'cw01',cat:'coworking',name:'Station F',contacts:[{name:'Community Manager',email:'business@stationf.co',phone:'—',role:'Community'}],site:'stationf.co',taille:'1000+',arr:'Paris 13e',ve:2000,vm:1500,type:'Catering events + déjeuners',pitch:'Plus grand startup campus monde. Events quotidiens. Traiteur officiel.',score:10,status:'to_contact'},
  {id:'cw02',cat:'coworking',name:'Kwerk Paris',contacts:[{name:'Hospitality Manager',email:'contact@kwerk.fr',phone:'01 43 00 00 00',role:'Hospitality'}],site:'kwerk.fr',taille:'200+',arr:'Paris 8e',ve:1200,vm:600,type:'Catering events premium',pitch:'Coworking luxe. Clientèle dirigeants. Budget traiteur élevé.',score:8,status:'to_contact'},
  {id:'cw03',cat:'coworking',name:'WeWork Paris République',contacts:[{name:'Community Manager',email:'paris@wework.com',phone:'01 85 65 00 00',role:'Community'}],site:'wework.com',taille:'500+',arr:'Paris 10e',ve:1500,vm:800,type:'Catering events membres',pitch:'Events membres fréquents. Traiteur partenaire recherché.',score:7,status:'to_contact'},
  {id:'cw04',cat:'coworking',name:'Morning Coworking',contacts:[{name:'Direction',email:'contact@morning.paris',phone:'01 85 53 00 00',role:'Direction'}],site:'morning.paris',taille:'200+',arr:'Paris 9e',ve:1000,vm:500,type:'Catering events membres',pitch:'Réseau coworking premium. Breakfasts et déjeuners networking.',score:7,status:'to_contact'},

  // PHARMA / SANTÉ — 8 entreprises
  {id:'ph01',cat:'pharma',name:'Sanofi (Siège Paris)',contacts:[{name:'Events Manager',email:'contact@sanofi.com',phone:'01 53 77 40 00',role:'Events'}],site:'sanofi.com',taille:'1000+',arr:'Paris 8e',ve:3000,vm:0,type:'Catering congrès médicaux',pitch:'Géant pharma. Congrès médicaux et events internes fréquents.',score:8,status:'to_contact'},
  {id:'ph02',cat:'pharma',name:'Servier (Siège)',contacts:[{name:'Services généraux',email:'contact@servier.com',phone:'01 55 72 60 00',role:'Services'}],site:'servier.com',taille:'1000+',arr:'Paris 15e',ve:2000,vm:0,type:'Catering events pharma',pitch:'Groupe pharma français. Events scientifiques réguliers.',score:7,status:'to_contact'},
  {id:'ph03',cat:'pharma',name:'Ipsen Paris',contacts:[{name:'Events Manager',email:'contact@ipsen.com',phone:'01 58 33 50 00',role:'Events'}],site:'ipsen.com',taille:'500+',arr:'Paris 8e',ve:2000,vm:0,type:'Catering congrès',pitch:'Groupe pharma. Congrès et events scientifiques fréquents.',score:7,status:'to_contact'},

  // SPORT — 8 organisations
  {id:'sp01',cat:'sport',name:'Paris Saint-Germain',contacts:[{name:'Events Manager',email:'events@psg.fr',phone:'01 47 43 71 71',role:'Events'}],site:'psg.fr',taille:'500+',arr:'Paris 16e',ve:5000,vm:0,type:'Catering events VIP',pitch:'Club mondial. Loges VIP, events partenaires permanents. Budget traiteur premium.',score:9,status:'to_contact'},
  {id:'sp02',cat:'sport',name:'Fédération Française Football',contacts:[{name:'Direction events',email:'fff@fff.fr',phone:'01 44 31 73 00',role:'Events'}],site:'fff.fr',taille:'500+',arr:'Paris 8e',ve:3000,vm:0,type:'Catering événements officiels',pitch:'FFF. Événements officiels fréquents. Budget traiteur important.',score:7,status:'to_contact'},
  {id:'sp03',cat:'sport',name:'Roland Garros (FFT)',contacts:[{name:'Direction hospitality',email:'contact@rolandgarros.com',phone:'01 47 43 48 00',role:'Hospitality'}],site:'rolandgarros.com',taille:'200+',arr:'Paris 16e',ve:5000,vm:0,type:'Catering tournoi + events',pitch:'Tournoi Grand Chelem. Hospitality VIP massive. Période Roland Garros = jackpot.',score:9,status:'to_contact'},

  // RESTAURATION / FOOD INDUSTRY — 8 acteurs
  {id:'re01',cat:'restauration',name:'Groupe Bertrand',contacts:[{name:'Direction',email:'contact@groupe-bertrand.com',phone:'01 40 82 00 00',role:'Direction'}],site:'groupe-bertrand.com',taille:'1000+',arr:'Paris',ve:2000,vm:0,type:'Catering events groupe',pitch:'Géant restauration (Hippopotamus, Burger King France...). Events internes fréquents.',score:7,status:'to_contact'},
  {id:'re02',cat:'restauration',name:'Sodexo France',contacts:[{name:'Direction commerciale',email:'contact@sodexo.com',phone:'01 57 75 80 00',role:'Commercial'}],site:'sodexo.com',taille:'1000+',arr:'Paris 9e',ve:2000,vm:0,type:'Partenariat traiteur',pitch:'Leader restauration collective. Partenariat sous-traitance pour events premium.',score:8,status:'to_contact'},
]

const INIT_TASKS = [
  {id:1,title:'Créer le kit B2B (menu plateaux, tarifs)',assignee:'emy',deadline:'2026-03-28',status:'in_progress',priority:'high',description:'Préparer un document PDF présentant les plateaux déjeuner Meshuga avec photos, prix et conditions. Format A4 recto-verso.',checklist:['Sélectionner les 5 meilleurs sandwichs plateau','Faire les photos','Rédiger les tarifs'],files:[]},
  {id:2,title:'RDV Wagram Events — préparer la présentation',assignee:'emy',deadline:'2026-03-28',status:'todo',priority:'high',description:'Préparer la présentation pour le RDV avec Sophie Martin de Wagram Events.',checklist:['Réviser le pitch Meshuga','Préparer les échantillons','Calculer un devis plateau type'],files:[]},
  {id:3,title:'Valider le menu B2B avec la cuisine',assignee:'edward',deadline:'2026-03-27',status:'todo',priority:'high',description:'Valider avec la cuisine les plats disponibles en format plateau B2B.',checklist:['Lister les contraintes cuisine','Valider les quantités','Fixer les prix'],files:[]},
]
const INIT_PROSPECTS_CRM = [
  {id:1,name:'Agence Wagram Events',contacts:[{name:'Sophie Martin',email:'contact@wagram.fr',phone:'01 40 xx xx xx',role:'Directrice'}],size:'10-50',category:'Événementiel',status:'contacted',nextAction:'Envoyer devis',nextDate:'2026-03-25',notes:'Intéressée par plateaux déjeuner. Budget ~800-1200€/event.',ca:0,score:8},
  {id:2,name:'Station F',contacts:[{name:'Tom Leblanc',email:'office@stationf.co',phone:'06 98 76 54 32',role:'Office Manager'}],size:'200-1000',category:'Startup',status:'nego',nextAction:'Envoyer devis URGENT',nextDate:'2026-03-25',notes:'Commandes régulières équipes. URGENT.',ca:0,score:9},
]
const INIT_CONTACTS = [
  {id:1,cat:'food',name:'Maison Vérot',contacts:[{name:'—',phone:'01 45 44 01 66',email:'contact@maisonverot.fr',role:'Commercial'}],notes:'Livraison lun-ven',vip:false},
  {id:2,cat:'banque',name:'BNP Paribas Vavin',contacts:[{name:'Marie Dupont',phone:'01 56 xx xx xx',email:'m.dupont@bnp.fr',role:'Gestionnaire pro'}],notes:'Gestionnaire pro',vip:false},
  {id:3,cat:'presse',name:'Le Fooding',contacts:[{name:'Press',phone:'—',email:'press@lefooding.com',role:'Presse'}],notes:'',vip:true},
  {id:4,cat:'prestataire',name:'Clean Express',contacts:[{name:'—',phone:'06 12 34 56 78',email:'info@cleanexpress.fr',role:'Manager'}],notes:'Mar + Ven',vip:false},
]
const INIT_VAULT = [
  {id:1,title:'Supabase',url:'https://supabase.com',user:'edward@meshuga.fr',pw:''},
  {id:2,title:'Vercel',url:'https://vercel.com',user:'edward@meshuga.fr',pw:''},
  {id:3,title:'Zelty',url:'https://app.zelty.fr',user:'edward@meshuga.fr',pw:''},
  {id:4,title:'Deliveroo',url:'https://restaurant.deliveroo.fr',user:'edward@meshuga.fr',pw:''},
]

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState<any>(null)
  const [page, setPage] = useState('dash')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tasks, setTasks] = useState(INIT_TASKS)
  const [crmProspects, setCrmProspects] = useState(INIT_PROSPECTS_CRM)
  const [contacts, setContacts] = useState(INIT_CONTACTS)
  const [vault, setVault] = useState(INIT_VAULT)
  const [reports, setReports] = useState<any[]>([])
  const [chasse, setChasse] = useState<any[]>([])
  const [chasseLoading, setChasseLoading] = useState(true)
  const [chasseTotal, setChasseTotal] = useState(0)
  const [chasseOffset, setChasseOffset] = useState(0)
  const [genProspectLoading, setGenProspectLoading] = useState(false)
  const [journalFilter, setJournalFilter] = useState('all')
  const [planningWeek, setPlanningWeek] = useState(0)
  const [genCat, setGenCat] = useState('evenementiel')
  const [genZone, setGenZone] = useState('Paris et IDF')
  const [activityLog, setActivityLog] = useState<any[]>([])
  const CHASSE_PAGE = 50
  const [toast2, setToast2] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState<any>({})
  const [pwVisible, setPwVisible] = useState<any>({})
  const [contactedToday, setContactedToday] = useState(0)
  const [chasseCat, setChasseCat] = useState('all')
  const [chasseSearch, setChasseSearch] = useState('')
  const [chasseSort, setChasseSort] = useState('score')
  const [chasseStatus, setChasseStatus] = useState('all')
  const [genEmail, setGenEmail] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [annFilter, setAnnFilter] = useState('all')
  const [kpiPeriod, setKpiPeriod] = useState('week')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await sb().auth.getUser()
      if (!user) return
      const { data: prof } = await sb().from('profiles').select('*').eq('id', user.id).single()
      if (prof && prof.role) {
        setProfile(prof)
      } else {
        const role = user.email?.includes('emy') ? 'emy' : 'edward'
        const full_name = role === 'emy' ? 'Emy' : 'Edward'
        setProfile({ role, full_name, email: user.email })
      }
    }
    loadProfile()
  }, [])

  const toast = (msg: string) => { setToast2(msg); setTimeout(()=>setToast2(''),2800) }
  const open = (id: string, data: any={}) => { setForm(data); setModal(id); setGenEmail('') }
  const close = () => { setModal(''); setForm({}) }
  const nav = (p: string) => { setPage(p); setSidebarOpen(false) }

  const today = new Date().toISOString().split('T')[0]
  const isEmy = profile?.role === 'emy'
  const todayRelances = crmProspects.filter(p=>p.nextDate<=today&&!['won','lost'].includes(p.status))
  const totalCa = crmProspects.filter(p=>p.status==='won').reduce((s,p)=>s+p.ca,0)
  const emyCommission = totalCa * 0.10

  const chasseFiltered = useMemo(() => {
    let l = chasse
    if (chasseCat !== 'all') l = l.filter(p=>p.cat===chasseCat)
    if (chasseSearch) l = l.filter(p=>p.name.toLowerCase().includes(chasseSearch.toLowerCase()) || p.arr.toLowerCase().includes(chasseSearch.toLowerCase()) || (p.contacts[0]?.name||'').toLowerCase().includes(chasseSearch.toLowerCase()))
    if (chasseStatus !== 'all') l = l.filter(p=>p.status===chasseStatus)
    return [...l].sort((a,b)=>{
      if (chasseSort==='score') return b.score-a.score
      if (chasseSort==='valeur') return (b.ve+b.vm*12)-(a.ve+a.vm*12)
      if (chasseSort==='name') return a.name.localeCompare(b.name)
      return 0
    })
  }, [chasse,chasseCat,chasseSearch,chasseStatus,chasseSort])

  function toggleExpand(id: string) {
    setChasse(prev=>prev.map(p=>p.id===id?{...p,expanded:!p.expanded}:p))
  }

  async function updateChasseStatus(id: string, status: string) {
    const supabase = sb()
    await supabase.from('chasse_prospects').update({ status }).eq('id', id)
    setChasse(prev=>prev.map(p=>p.id===id?{...p,status}:p))
    if (status==='contacted') {
      setContactedToday(c=>c+1)
      const p = chasse.find(x=>x.id===id)
      if (p) {
        setCrmProspects(prev=>[...prev, {id:Date.now(),name:p.name,contacts:p.contacts||[{name:p.contact_name,email:p.contact_email,phone:p.contact_phone,role:p.contact_role}],size:p.taille,category:CATS_MAP[p.cat]?.label||p.cat,status:'contacted',nextAction:'Relancer',nextDate:'',notes:p.pitch,ca:0,score:p.score}])
        toast(`✓ ${p.name} ajouté au CRM !`)
        logActivity('prospect_contacte', `${p.name} marqué comme contacté et ajouté au CRM`, p.name)
      }
    } else {
      toast(`Statut mis à jour : ${STATUS_P[status]}`)
    }
  }

  async function generateEmail(prospect: any, context: string) {
    setGenLoading(true)
    setGenEmail('')
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect, context, senderRole: profile?.role || 'edward' }),
      })
      const data = await res.json()
      if (data.error) {
        setGenEmail('Erreur : ' + data.error)
      } else {
        setGenEmail(data.email || 'Erreur génération')
      }
    } catch {
      setGenEmail('Erreur réseau. Vérifier la connexion.')
    }
    setGenLoading(false)
  }

  // ─── CHARGER PROSPECTS DEPUIS SUPABASE ──────────────────────────
  async function loadChasse(offset = 0, reset = true) {
    setChasseLoading(true)
    const supabase = sb()
    let query = supabase
      .from('chasse_prospects')
      .select('*', { count: 'exact' })
    if (chasseCat !== 'all') query = query.eq('cat', chasseCat)
    if (chasseStatus !== 'all') query = query.eq('status', chasseStatus)
    if (chasseSearch) query = query.or(`name.ilike.%${chasseSearch}%,arr.ilike.%${chasseSearch}%,adresse.ilike.%${chasseSearch}%`)
    if (chasseSort === 'score') query = query.order('score', { ascending: false })
    else if (chasseSort === 'valeur') query = query.order('ve', { ascending: false })
    else query = query.order('name', { ascending: true })
    query = query.range(offset, offset + CHASSE_PAGE - 1)
    const { data, count, error } = await query
    if (!error && data) {
      const fmt = data.map((p) => ({
        ...p,
        contacts: [{ name: p.contact_name||'—', email: p.contact_email||'—', phone: p.contact_phone||'—', role: p.contact_role||'—' }],
        expanded: false,
      }))
      if (reset) setChasse(fmt)
      else setChasse(prev => [...prev, ...fmt])
      setChasseTotal(count || 0)
      setChasseOffset(offset)
    }
    setChasseLoading(false)
  }

  // Charger seulement si connecté
  useEffect(() => { if (profile) loadChasse(0, true) }, [chasseCat, chasseStatus, chasseSearch, chasseSort, profile])

  // Charger le journal d'activité
  useEffect(() => {
    if (!profile) return
    async function loadLog() {
      const { data: logData } = await sb().from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (logData) setActivityLog(logData)
    }
    loadLog()
  }, [profile])

  // ─── GÉNÉRER PROSPECTS VIA IA ─────────────────────────────────
  async function generateProspects() {
    setGenProspectLoading(true)
    try {
      const res = await fetch('/api/generate-prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cat: genCat, zone: genZone, count: 15 }),
      })
      const data = await res.json()
      if (data.error) { toast('Erreur : ' + data.error); return }
      toast(`✨ ${data.inserted} nouveaux prospects ajoutés !`)
      loadChasse(0, true)
    } catch { toast('Erreur réseau') }
    setGenProspectLoading(false)
  }


  // ─── LOG ACTIVITY ──────────────────────────────────────────────────────────
  async function logActivity(type: string, description: string, prospectName?: string, emailContent?: string) {
    const supabase = sb()
    const entry = {
      user_role: profile?.role || 'unknown',
      user_name: profile?.full_name || '?',
      type,
      description,
      prospect_name: prospectName || null,
      email_content: emailContent || null,
    }
    await supabase.from('activity_log').insert(entry)
    setActivityLog((prev: any) => [{ ...entry, id: Date.now(), created_at: new Date().toISOString() }, ...prev.slice(0, 49)])
  }

  function saveTask() {
    if (!form.title) { toast('Titre requis !'); return }
    const t = {...form, checklist: form.checklist||[], files: form.files||[]}
    if (form.id) setTasks(prev=>prev.map(x=>x.id===form.id?t:x))
    else setTasks(prev=>[...prev,{...t,id:Date.now(),status:'todo'}])
    close(); toast('Tâche sauvegardée ✓')
  }

  function saveCrmProspect() {
    if (!form.name) { toast('Nom requis !'); return }
    const p = {...form, contacts: form.contacts||[{name:'',email:'',phone:'',role:''}]}
    if (form.id) setCrmProspects(prev=>prev.map(x=>x.id===form.id?p:x))
    else setCrmProspects(prev=>[...prev,{...p,id:Date.now(),status:'to_contact',ca:0}])
    close(); toast('Prospect sauvegardé ✓')
  }

  async function saveChasseProspect() {
    if (!form.name) { toast('Nom requis !'); return }
    const supabase = sb()
    const payload = {
      cat: form.cat||'evenementiel', name: form.name,
      contact_name: form.contacts?.[0]?.name||'', contact_email: form.contacts?.[0]?.email||'',
      contact_phone: form.contacts?.[0]?.phone||'', contact_role: form.contacts?.[0]?.role||'',
      site: form.site||'', taille: form.taille||'10-50', arr: form.arr||'Paris',
      adresse: form.adresse||'',
      ve: parseInt(form.ve)||0, vm: parseInt(form.vm)||0,
      type: form.type||'', pitch: form.pitch||'', score: parseInt(form.score)||5,
    }
    if (form.id && !String(form.id).startsWith('new')) {
      await supabase.from('chasse_prospects').update(payload).eq('id', form.id)
    } else {
      await supabase.from('chasse_prospects').insert({...payload, id:`m_${Date.now()}`, status:'to_contact'})
    }
    close(); toast('Prospect sauvegardé ✓'); loadChasse(0, true)
  }

  function saveContact() {
    if (!form.name) { toast('Nom requis !'); return }
    const c = {...form, contacts: form.contacts||[{name:'',phone:'',email:'',role:''}]}
    if (form.id) setContacts(prev=>prev.map(x=>x.id===form.id?c:x))
    else setContacts(prev=>[...prev,{...c,id:Date.now()}])
    close(); toast('Contact sauvegardé ✓')
  }

  function saveVault() {
    if (!form.title) { toast('Nom requis !'); return }
    if (form.id) setVault(prev=>prev.map(v=>v.id===form.id?{...form}:v))
    else setVault(prev=>[...prev,{...form,id:Date.now()}])
    close(); toast('Accès sauvegardé 🔐')
  }

  function submitCR() {
    if (!form.week) { toast('Semaine requise !'); return }
    setReports(prev=>[{...form,id:Date.now(),status:'submitted',date:new Date().toLocaleDateString('fr-FR')},...prev])
    close(); toast('CR soumis à Edward 📧')
  }

  const NAV = [
    {id:'dash',label:'Dashboard',icon:'⚡'},
    {id:'chasse',label:'Tableau de chasse',icon:'🎯',badge:contactedToday>0?`${contactedToday}/5`:undefined},
    {id:'crm',label:'CRM Prospects',icon:'◎'},
    {id:'annuaire',label:'Annuaire',icon:'📒'},
    {id:'tasks',label:'Tâches',icon:'✓'},
    {id:'reporting',label:'Reporting',icon:'📋',badge:!isEmy&&reports.filter(r=>r.status==='submitted'&&!r.feedback).length>0?reports.filter(r=>r.status==='submitted'&&!r.feedback).length:undefined},
    {id:'vault',label:'Coffre-fort',icon:'🔐'},
    {id:'gmb',label:'Google My Biz.',icon:'⭐'},
    {id:'journal',label:'Journal Emy',icon:'📓'},
  ]

  if (!profile) {
    return (
      <div style={{minHeight:'100vh',background:'#FFEB5A',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
        <style>{G}</style>
        <div style={{fontSize:48}}>😬</div>
        <div style={{fontWeight:900,fontSize:14,textTransform:'uppercase',letterSpacing:3}}>Chargement…</div>
        <a href="/login" style={{fontFamily:"'Yellowtail',cursive",fontSize:16,color:'#191923',opacity:.5}}>← Se connecter</a>
      </div>
    )
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden'}}>
      <style>{G}</style>
      {/* MOBILE TOPBAR */}
      <div className="topbar">
        <button className="hamburger" onClick={()=>setSidebarOpen(!sidebarOpen)}>☰</button>
        <span className="topbar-logo">meshuga</span>
        <span style={{fontFamily:"'Yellowtail',cursive",fontSize:13,color:'#FF82D7'}}>{isEmy?'Emy':'Edward'}</span>
      </div>

      <div className="shell">
        <div className={`sidebar-overlay${sidebarOpen?' open':''}`} onClick={()=>setSidebarOpen(false)} />
        <div className={`sidebar${sidebarOpen?' open':''}`}>
          <div className="sb-logo">
            <div className="sb-stamp">😬</div>
            <div><div style={{fontWeight:900,fontSize:18,textTransform:'uppercase',letterSpacing:2,lineHeight:1}}>meshuga</div><div className="yt" style={{fontSize:12,opacity:.45}}>B2B Manager</div></div>
          </div>
          <nav className="sb-nav">
            <div className="sb-sec">Navigation</div>
            {NAV.map(n=><div key={n.id} className={`ni${page===n.id?' active':''}`} onClick={()=>nav(n.id)}><span style={{fontSize:14}}>{n.icon}</span>{n.label}{n.badge&&<span className="nb">{n.badge}</span>}</div>)}
          </nav>
          <div style={{padding:'10px 12px 14px',borderTop:'3px solid #191923'}}>
            <div className="yt" style={{fontSize:11,opacity:.35,marginBottom:5}}>Connecté</div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
              <div style={{width:28,height:28,borderRadius:4,border:'2px solid #191923',background:isEmy?'#FF82D7':'#FFEB5A',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13}}>{profile.full_name?.[0]?.toUpperCase()||'?'}</div>
              <div><div style={{fontWeight:900,fontSize:11,textTransform:'uppercase'}}>{profile.full_name||profile.email?.split('@')[0]}</div><div className="yt" style={{fontSize:11,opacity:.4}}>{isEmy?'B2B Manager':'The Big Boss'}</div></div>
            </div>
            <button className="btn btn-sm" style={{width:'100%',justifyContent:'center',fontSize:10,opacity:.6}} onClick={async()=>{await sb().auth.signOut();window.location.href='/login'}}>↩ Se déconnecter</button>
          </div>
        </div>

        <div className="main">
          <div className="strip" />

          {/* ══ DASHBOARD ══════════════════════════════════════════════════ */}
          {page==='dash'&&(
            <div>
              <div className="ph">
                <div><div className="pt">{isEmy?'Bonjour Emy 🌸':'Bonjour Edward 👋'}</div><div className="ps">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div></div>
                {isEmy&&<button className="btn btn-n btn-sm" onClick={()=>open('cr',{})}>+ Nouveau CR</button>}
              </div>

              {isEmy&&(
                <div className="card-p" style={{marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div className="ct" style={{margin:0}}>🎯 Objectif prospection du jour</div>
                    <button className="btn btn-n btn-sm" onClick={()=>nav('chasse')}>Tableau de chasse →</button>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                    <span style={{fontWeight:900,fontSize:13}}>Prospects contactés aujourd'hui</span>
                    <span style={{fontWeight:900,fontSize:18,color:contactedToday>=5?'#009D3A':'#191923'}}>{contactedToday} / 5</span>
                  </div>
                  <div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.min(contactedToday/5*100,100)}%`,background:contactedToday>=5?'#009D3A':'#191923'}} /></div>
                  {contactedToday>=5&&<div style={{marginTop:8,fontWeight:900,fontSize:12,color:'#009D3A'}}>🎉 Objectif atteint ! Tu assures !</div>}
                </div>
              )}

              {todayRelances.length>0&&(
                <div className="card-p" style={{marginBottom:12}}>
                  <div className="ct">⏰ Relances urgentes</div>
                  {todayRelances.map(p=>(
                    <div key={p.id} className="al" style={{cursor:'pointer'}} onClick={()=>nav('crm')}>
                      <span style={{fontSize:18}}>📅</span>
                      <div style={{flex:1}}><div style={{fontWeight:900,fontSize:13}}>{p.name}</div><div style={{fontSize:10,opacity:.6}}>{p.nextAction} · {p.contacts[0]?.phone||'—'}</div></div>
                      <span style={{fontSize:9,fontWeight:900,background:'#191923',color:'#FFEB5A',padding:'2px 7px',borderRadius:3}}>Urgent</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="g4">
                <div className="kc" style={{background:'#FFEB5A'}} onClick={()=>nav('chasse')}>
                  <div className="kl">Tableau de chasse</div><div className="kv">{chasse.filter(p=>p.status==='to_contact').length}</div><div className="ki">🎯</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.4,marginTop:2}}>À contacter →</div>
                </div>
                <div className="kc" style={{background:'#FF82D7'}} onClick={()=>nav('crm')}>
                  <div className="kl">Pipeline B2B</div><div className="kv">{crmProspects.filter(p=>!['won','lost'].includes(p.status)).length}</div><div className="ki">◎</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.4,marginTop:2}}>Voir CRM →</div>
                </div>
                <div className="kc" style={{background:'#FFFFFF'}} onClick={()=>nav('tasks')}>
                  <div className="kl">Tâches actives</div><div className="kv">{tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).length}</div><div className="ki">✓</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.4,marginTop:2}}>Voir tâches →</div>
                </div>
                <div className="kc" style={{background:totalCa>0?'#FFEB5A':'#FFFFFF'}} onClick={()=>nav('crm')}>
                  <div className="kl">{isEmy?'Ma commission':'CA B2B gagné'}</div>
                  <div className="kv" style={{fontSize:22}}>{isEmy?emyCommission.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0}):totalCa.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0})}</div>
                  <div className="ki">💰</div>
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',opacity:.4,marginTop:2}}>{isEmy?'10% du CA B2B':'HT total →'}</div>
                </div>
              </div>

              <div className="g2">
                <div className="card">
                  <div className="ct">{isEmy?'Mes tâches':'Tâches équipe'}</div>
                  {tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).slice(0,4).map(t=>(
                    <div key={t.id} className="row row-click" style={{gridTemplateColumns:'4px 1fr auto',gap:10}} onClick={()=>open('task_detail',{...t})}>
                      <div className="pbar" style={{background:t.priority==='high'?'#FF82D7':'#005FFF'}} />
                      <div><div style={{fontSize:12,fontWeight:900}}>{t.title}</div><div style={{fontSize:10,opacity:.5}}>📅 {t.deadline} · {t.assignee}</div></div>
                      <span className="badge" style={{color:t.status==='in_progress'?'#005FFF':'#888',borderColor:t.status==='in_progress'?'#005FFF':'#ccc'}}>{TASK_S[t.status]}</span>
                    </div>
                  ))}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={()=>nav('tasks')}>Voir toutes →</button>
                </div>
                <div className="card">
                  <div className="ct">{isEmy?'Mon pipeline':'Prospects chauds'}</div>
                  {crmProspects.filter(p=>p.status!=='won'&&p.status!=='lost').slice(0,4).map(p=>(
                    <div key={p.id} className="row row-click" style={{gridTemplateColumns:'1fr auto',gap:8}} onClick={()=>nav('crm')}>
                      <div><div style={{fontSize:12,fontWeight:900}}>{p.name}</div><div style={{fontSize:10,opacity:.5}}>{p.nextAction}</div></div>
                      <span className="badge" style={{color:STATUS_COLOR[p.status],borderColor:STATUS_COLOR[p.status]}}>{STATUS_P[p.status]}</span>
                    </div>
                  ))}
                  <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={()=>nav('crm')}>Voir le CRM →</button>
                </div>
              </div>

              {/* ══ PLANNING SEMAINE ══════════════════════════════════════════ */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:10}}>
              <div style={{background:'#191923',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div className="yt" style={{color:'#FFEB5A',fontSize:18}}>📅 Planning {isEmy?'de ma semaine':"d’Emy"}</div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={()=>setPlanningWeek((w)=>w-1)}>←</button>
                  <span style={{color:'#FFEB5A',fontSize:11,fontWeight:900,minWidth:120,textAlign:'center'}}>
                    {planningWeek===0?'Cette semaine':planningWeek<0?`Il y a ${Math.abs(planningWeek)} sem.`:`Dans ${planningWeek} sem.`}
                  </span>
                  <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={()=>setPlanningWeek((w)=>w+1)}>→</button>
                  {planningWeek!==0&&<button className="btn btn-y btn-sm" onClick={()=>setPlanningWeek(0)}>Auj.</button>}
                  {isEmy&&<button className="btn btn-p btn-sm" onClick={()=>open('task_detail',{assignee:'emy',priority:'medium',status:'todo',checklist:[],files:[]})}>+ Tâche</button>}
                </div>
              </div>
              <div style={{padding:'10px 14px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
                  {['Lun','Mar','Mer','Jeu','Ven'].map((day,di)=>{
                    const weekStart = new Date()
                    const dow = weekStart.getDay()===0?6:weekStart.getDay()-1
                    weekStart.setDate(weekStart.getDate()-dow+(planningWeek*7))
                    const dayDate = new Date(weekStart)
                    dayDate.setDate(weekStart.getDate()+di)
                    const dateStr = dayDate.toISOString().split('T')[0]
                    const isPast = dayDate < new Date(new Date().toDateString())
                    const isToday = dateStr === new Date().toISOString().split('T')[0]
                    const dayTasks = tasks.filter(t=>t.deadline===dateStr&&t.assignee==='emy')
                    const hasLate = isPast && dayTasks.some(t=>t.status!=='done')
                    const allDone = dayTasks.length>0 && dayTasks.every(t=>t.status==='done')
                    return (
                      <div key={day} style={{
                        borderRadius:6,
                        border:`2px solid ${isToday?'#005FFF':hasLate?'#CC0066':allDone?'#009D3A':'#EBEBEB'}`,
                        background:isToday?'#E3F0FF':hasLate?'#FCE4EC':allDone?'#E8F5E9':'#FAFAFA',
                        padding:'8px 8px',
                        minHeight:80,
                      }}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:12,color:isToday?'#005FFF':hasLate?'#CC0066':allDone?'#009D3A':'#191923'}}>{day}</div>
                          <div style={{fontSize:9,opacity:.5}}>{dayDate.getDate()}/{dayDate.getMonth()+1}</div>
                        </div>
                        {dayTasks.length===0?(
                          <div style={{fontSize:9,opacity:.3,textAlign:'center',marginTop:8}}>—</div>
                        ):dayTasks.map(t=>(
                          <div key={t.id} onClick={()=>open('task_detail',{...t})} style={{
                            cursor:'pointer',
                            background:t.status==='done'?'rgba(0,157,58,.1)':t.priority==='high'?'rgba(255,130,215,.2)':'rgba(0,95,255,.1)',
                            borderLeft:`3px solid ${t.status==='done'?'#009D3A':t.priority==='high'?'#FF82D7':'#005FFF'}`,
                            borderRadius:'0 3px 3px 0',
                            padding:'3px 5px',
                            marginBottom:3,
                            fontSize:10,
                            fontWeight:900,
                            textDecoration:t.status==='done'?'line-through':'none',
                            opacity:t.status==='done'?.5:1,
                            whiteSpace:'nowrap',
                            overflow:'hidden',
                            textOverflow:'ellipsis',
                          }}>{t.title}</div>
                        ))}
                      </div>
                    )
                  })}
                </div>
                {/* Légende */}
                <div style={{display:'flex',gap:12,marginTop:8,fontSize:9,opacity:.5,flexWrap:'wrap'}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:1,background:'#005FFF',display:'inline-block'}}/>Aujourd'hui</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:1,background:'#CC0066',display:'inline-block'}}/>Tâches en retard</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:1,background:'#009D3A',display:'inline-block'}}/>Tout fait ✓</span>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:1,background:'#FF82D7',display:'inline-block'}}/>Priorité haute</span>
                </div>
              </div>
            </div>

            {!isEmy&&reports.length>0&&(
                <div className="card card-click" onClick={()=>nav('reporting')}>
                  <div className="ct">📋 Dernier CR d’Emy <span style={{fontSize:11,opacity:.4,fontFamily:'Arial',fontWeight:400}}>— cliquer pour voir →</span></div>
                  <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:10}}>
                    <div className="yt" style={{fontSize:12,opacity:.5,marginBottom:4}}>{reports[0].week}</div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                      {[['Prospects',reports[0].prospects],['RDV',reports[0].rdv],['Cmdes',reports[0].cmds]].map(([l,v])=>(
                        <div key={l} style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'6px',textAlign:'center'}}>
                          <div style={{fontWeight:900,fontSize:18}}>{v}</div>
                          <div className="yt" style={{fontSize:10,opacity:.5}}>{l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ TABLEAU DE CHASSE ════════════════════════════════════════ */}
          {page==='chasse'&&(
            <div>
              <div className="ph">
                <div>
                  <div className="pt">Tableau de Chasse 🎯</div>
                  <div className="ps">{chasse.filter(p=>p.status==='to_contact').length} à contacter · {chasse.filter(p=>p.status==='contacted').length} contactés · {chasse.length} total</div>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                  {isEmy&&<div style={{textAlign:'right'}}><div style={{fontWeight:900,fontSize:11,marginBottom:3}}>{contactedToday}/5 auj.</div><div className="prog-wrap" style={{width:100}}><div className="prog-fill" style={{width:`${Math.min(contactedToday/5*100,100)}%`,background:contactedToday>=5?'#009D3A':'#191923'}} /></div></div>}
                  <button className="btn btn-y btn-sm" onClick={()=>open('chasse_edit',{cat:'evenementiel',score:5,contacts:[{name:'',email:'',phone:'',role:''}]})}>+ Ajouter</button>
                </div>
              </div>

              {/* Recherche */}
              <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                <input className="inp" style={{flex:1,minWidth:160}} value={chasseSearch} onChange={e=>setChasseSearch(e.target.value)} placeholder="🔍 Nom, arrondissement, contact…" />
                <select className="inp sel" style={{width:150}} value={chasseSort} onChange={e=>setChasseSort(e.target.value)}>
                  <option value="score">↓ Score</option>
                  <option value="valeur">↓ Valeur €</option>
                  <option value="name">↓ A-Z</option>
                </select>
                <select className="inp sel" style={{width:130}} value={chasseStatus} onChange={e=>setChasseStatus(e.target.value)}>
                  <option value="all">Tous statuts</option>
                  {Object.entries(STATUS_P).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {/* Filtres catégorie */}
              <div style={{overflowX:'auto',display:'flex',gap:4,paddingBottom:8,marginBottom:8,flexWrap:'nowrap'}}>
                {Object.entries(CATS_MAP).map(([k,v]:any)=>(
                  <div key={k} className={`tag${chasseCat===k?' on':''}`} onClick={()=>setChasseCat(k)}>{v.emoji} {v.label}</div>
                ))}
              </div>

              {/* BOUTON GÉNÉRER IA */}
              <div className="card-y" style={{marginBottom:10,padding:'10px 12px'}}>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <span className="yt" style={{fontSize:14}}>✨ Générer via IA</span>
                  <select className="inp sel" style={{flex:1,minWidth:120,fontSize:11}} value={genCat} onChange={e=>setGenCat(e.target.value)}>
                    {Object.entries(CATS_MAP).filter(([k])=>k!=='all').map(([k,v]:any)=><option key={k} value={k}>{v.emoji} {v.label}</option>)}
                  </select>
                  <input className="inp" style={{flex:1,minWidth:120,fontSize:11}} value={genZone} onChange={e=>setGenZone(e.target.value)} placeholder="Zone (ex: Paris 8e)" />
                  <button className="btn btn-n btn-sm" disabled={genProspectLoading} onClick={generateProspects}>
                    {genProspectLoading?'⏳ Génération…':'✨ Générer 15'}
                  </button>
                </div>
                <div style={{fontSize:10,opacity:.4,marginTop:5}}>{chasseTotal} prospects en base · {chasse.filter(p=>p.status==='to_contact').length} affichés à contacter</div>
              </div>

              {/* LISTE */}
              {chasseLoading && chasse.length===0 && (
                <div style={{textAlign:'center',padding:40}}>
                  <div style={{fontSize:32,marginBottom:8}}>⏳</div>
                  <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',opacity:.5}}>Chargement des prospects…</div>
                </div>
              )}

              {chasseFiltered.map(p=>{
                const statusInfo = NEXT_ACTION_BY_STATUS[p.status]
                const scoreStars = p.score>=9?'★★★':p.score>=7?'★★':'★'
                return (
                  <div key={p.id} className="prospect-card">
                    {/* HEADER — toujours visible, cliquable */}
                    <div className="prospect-card-header" onClick={()=>toggleExpand(p.id)}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
                            <span style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:'#FFEB5A',flexShrink:0}}>
                              {CATS_MAP[p.cat]?.emoji} {CATS_MAP[p.cat]?.label}
                            </span>
                            <span style={{
                              fontSize:9,fontWeight:900,padding:'2px 6px',border:'1.5px solid',borderRadius:3,flexShrink:0,
                              background:STATUS_BG[p.status],
                              color:STATUS_COLOR[p.status],
                              borderColor:STATUS_COLOR[p.status]
                            }}>{STATUS_P[p.status]}</span>
                            <span style={{fontSize:11,color:'#F5C842'}}>{scoreStars}</span>
                            <span style={{fontSize:9,opacity:.4}}>{p.score}/10</span>
                          </div>
                          <div style={{fontWeight:900,fontSize:14}}>{p.name}</div>
                          <div style={{fontSize:11,opacity:.5}}>{p.arr} · {p.taille} emp. · {p.contacts[0]?.name&&p.contacts[0].name!=='—'?p.contacts[0].name:'Contact non renseigné'}</div>
                    {p.adresse&&p.adresse!==''&&p.adresse!=='—'&&<div style={{fontSize:11,opacity:.4}}>📍 {p.adresse}</div>}
                    {p.contacts?.[0]?.linkedin&&<a href={p.contacts[0].linkedin} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#005FFF',textDecoration:'none',display:'inline-block',marginTop:2}} onClick={e=>e.stopPropagation()}>🔗 LinkedIn</a>}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          {p.ve>0&&<div style={{fontWeight:900,fontSize:13}}>~{p.ve.toLocaleString()}€</div>}
                          {p.vm>0&&<div style={{fontWeight:900,fontSize:11,opacity:.7}}>+{p.vm.toLocaleString()}€/mois</div>}
                          <div style={{fontSize:9,opacity:.4,textTransform:'uppercase'}}>{p.type}</div>
                          <span style={{fontSize:12}}>{p.expanded?'▲':'▼'}</span>
                        </div>
                      </div>
                    </div>

                    {/* BODY — visible si expanded */}
                    {p.expanded&&(
                      <div className="prospect-card-body">
                        {/* Pitch */}
                        <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:5,padding:'8px 10px',marginBottom:10,fontSize:12}}>
                          <span style={{fontWeight:900}}>💡 Angle : </span>{p.pitch}
                        </div>

                        {/* Contacts */}
                        <div style={{marginBottom:10}}>
                          <div style={{fontFamily:"'Yellowtail',cursive",fontSize:14,marginBottom:6}}>Contacts</div>
                          {p.contacts.map((c, i)=>(
                            <div key={i} style={{background:'#F8F8F8',border:'1.5px solid #DEDEDE',borderRadius:5,padding:'7px 10px',marginBottom:5,fontSize:12}}>
                              <div style={{fontWeight:900}}>{c.name||'—'} {c.role&&<span style={{fontSize:10,opacity:.5}}>· {c.role}</span>}</div>
                              <div style={{display:'flex',gap:12,marginTop:3,flexWrap:'wrap',opacity:.7}}>
                                {c.email&&c.email!=='—'&&<span>✉️ {c.email}</span>}
                                {c.phone&&c.phone!=='—'&&<span>📞 {c.phone}</span>}
                                {c.linkedin&&<a href={c.linkedin} target="_blank" rel="noopener noreferrer" style={{color:'#005FFF',textDecoration:'none'}}>🔗 LinkedIn</a>}
                              </div>
                            </div>
                          ))}
                          {p.site&&p.site!=='—'&&<div style={{fontSize:11,opacity:.5,marginTop:4}}>🌐 <a href={`https://${p.site}`} target="_blank" rel="noopener noreferrer" style={{color:'#005FFF'}}>{p.site}</a></div>}
                        </div>

                        {/* Actions intelligentes */}
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          <button className={`btn btn-sm ${statusInfo?.btnColor||'btn-y'}`} onClick={()=>{open('gen_email',{...p,emailContext:statusInfo?.emailContext});generateEmail(p,statusInfo?.emailContext||'prise de contact')}}>
                            {statusInfo?.btn||'✉️ Email IA'}
                          </button>
                          {p.status==='to_contact'&&<button className="btn btn-g btn-sm" onClick={()=>updateChasseStatus(p.id,'contacted')}>✓ Contacté</button>}
                          {p.status==='contacted'&&<button className="btn btn-b btn-sm" onClick={()=>updateChasseStatus(p.id,'nego')}>→ Passer en négo</button>}
                          {p.status==='nego'&&<button className="btn btn-sm" style={{background:'#009D3A',color:'#fff'}} onClick={()=>{const ca=parseInt(prompt('CA de la commande (€ HT) ?')||'0');if(ca>0){updateChasseStatus(p.id,'won');toast(`🎉 ${p.name} gagné ! ${ca}€ HT`)}}}>🏆 Marquer Gagné</button>}
                          {!['won','lost'].includes(p.status)&&<button className="btn btn-sm btn-red" onClick={()=>updateChasseStatus(p.id,'lost')}>✗ Perdu</button>}
                          <button className="btn btn-y btn-sm" onClick={()=>open('chasse_edit',{...p})}>✏️ Modifier</button>
                          <button className="btn btn-sm btn-red" onClick={async()=>{if(confirm('Supprimer ce prospect ?')){const s=sb();await s.from('chasse_prospects').delete().eq('id',p.id);setChasse(prev=>prev.filter(x=>x.id!==p.id));toast('Prospect supprimé')}}}>🗑 Supprimer</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {page==='chasse' && !chasseLoading && chasse.length < chasseTotal && (
            <div style={{textAlign:'center',padding:16}}>
              <button className="btn btn-y" onClick={()=>loadChasse(chasseOffset+CHASSE_PAGE, false)}>
                Charger plus ({chasse.length} / {chasseTotal})
              </button>
            </div>
          )}

          {/* ══ CRM ══════════════════════════════════════════════════════ */}
          {page==='crm'&&(
            <div>
              <div className="ph">
                <div><div className="pt">CRM Prospects</div><div className="ps">{crmProspects.length} prospects · Pipeline B2B</div></div>
                <button className="btn btn-y btn-sm" onClick={()=>open('crm_prospect',{status:'to_contact',contacts:[{name:'',email:'',phone:'',role:''}],ca:0})}>+ Nouveau</button>
              </div>

              {/* KPIs */}
              <div style={{marginBottom:14}}>
                <div className="kpi-bar">
                  {[['week','Cette semaine'],['month','Ce mois'],['quarter','Ce trimestre'],['year','Cette année'],['all','Total']].map(([k,l])=>(
                    <div key={k} className={`kpi-mini${kpiPeriod===k?' active':''}`} onClick={()=>setKpiPeriod(k)}>
                      <div className="yt" style={{fontSize:11,opacity:.6}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div className="g4">
                  {Object.entries(STATUS_P).slice(0,4).map(([k,v])=>(
                    <div key={k} style={{background:STATUS_BG[k],border:`2px solid ${STATUS_COLOR[k]}`,borderRadius:5,padding:'8px 12px',textAlign:'center',boxShadow:`2px 2px 0 ${STATUS_COLOR[k]}`}}>
                      <div style={{fontWeight:900,fontSize:22,color:STATUS_COLOR[k]}}>{crmProspects.filter(p=>p.status===k).length}</div>
                      <div className="yt" style={{fontSize:11,color:STATUS_COLOR[k]}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div className="g2" style={{marginTop:8}}>
                  <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:'10px 14px',boxShadow:'2px 2px 0 #191923',textAlign:'center'}}>
                    <div className="yt" style={{fontSize:13,opacity:.5}}>CA B2B total gagné</div>
                    <div style={{fontWeight:900,fontSize:24}}>{totalCa.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0})}</div>
                  </div>
                  <div style={{background:'#FF82D7',border:'2px solid #191923',borderRadius:5,padding:'10px 14px',boxShadow:'2px 2px 0 #191923',textAlign:'center'}}>
                    <div className="yt" style={{fontSize:13,opacity:.6}}>Commission Emy (10%)</div>
                    <div style={{fontWeight:900,fontSize:24}}>{emyCommission.toLocaleString('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0})}</div>
                  </div>
                </div>
              </div>

              {/* Liste prospects */}
              {crmProspects.map(p=>{
                const nextAction = NEXT_ACTION_BY_STATUS[p.status]
                return (
                  <div key={p.id} className="card card-click" style={{padding:0,overflow:'hidden',marginBottom:10}} onClick={()=>open('crm_prospect',{...p})}>
                    <div style={{padding:'12px 14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:6}}>
                        <div>
                          <div style={{fontWeight:900,fontSize:14}}>{p.name}</div>
                          <div style={{fontSize:11,opacity:.5}}>{p.category} · {p.size}</div>
                        </div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',justifyContent:'flex-end'}}>
                          <span className="badge" style={{color:STATUS_COLOR[p.status],borderColor:STATUS_COLOR[p.status]}}>{STATUS_P[p.status]}</span>
                          {p.ca>0&&<span className="badge" style={{color:'#009D3A',borderColor:'#009D3A'}}>💰 {p.ca.toLocaleString()}€</span>}
                        </div>
                      </div>
                      <div style={{display:'flex',gap:10,fontSize:11,flexWrap:'wrap',marginBottom:8,opacity:.7}}>
                        {p.contacts[0]?.email&&<span>✉️ {p.contacts[0].email}</span>}
                        {p.contacts[0]?.phone&&p.contacts[0].phone!=='—'&&<span>📞 {p.contacts[0].phone}</span>}
                        {p.nextDate&&<span style={{color:p.nextDate<=today?'#CC0066':'inherit',fontWeight:p.nextDate<=today?900:400}}>📅 {p.nextDate<=today?'⚠️ ':''}{p.nextAction}</span>}
                      </div>
                      {/* Bouton action intelligente */}
                      {!['won','lost'].includes(p.status)&&(
                        <button className={`btn btn-sm ${nextAction?.btnColor||'btn-y'}`}
                          onClick={e=>{e.stopPropagation();open('gen_email',{...p,emailContext:nextAction?.emailContext});generateEmail(p,nextAction?.emailContext||'prise de contact')}}>
                          {nextAction?.btn||'✉️ Email IA'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {crmProspects.length===0&&<div className="card" style={{textAlign:'center',padding:40,opacity:.4,fontSize:12,fontWeight:900,textTransform:'uppercase'}}>Aucun prospect — ajouter depuis le tableau de chasse</div>}
            </div>
          )}

          {/* ══ ANNUAIRE ═════════════════════════════════════════════════ */}
          {page==='annuaire'&&(
            <div>
              <div className="ph">
                <div><div className="pt">Annuaire</div><div className="ps">{contacts.length} contacts essentiels Meshuga</div></div>
                <button className="btn btn-y btn-sm" onClick={()=>open('contact',{cat:'food',vip:false,contacts:[{name:'',phone:'',email:'',role:''}]})}>+ Ajouter</button>
              </div>
              {/* Filtres par catégorie */}
              <div className="ann-tabs">
                <div className={`ann-tab${annFilter==='all'?' on':''}`} onClick={()=>setAnnFilter('all')}>Tous ({contacts.length})</div>
                {Object.entries(CAT_ANN).map(([k,v])=>{
                  const count = contacts.filter(c=>c.cat===k).length
                  if (count===0) return null
                  return <div key={k} className={`ann-tab${annFilter===k?' on':''}`} onClick={()=>setAnnFilter(k)}>{v} ({count})</div>
                })}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
                {contacts.filter(c=>annFilter==='all'||c.cat===annFilter).map(c=>(
                  <div key={c.id} className="card card-click" onClick={()=>open('contact',{...c})}>
                    <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,display:'inline-block',marginBottom:7,background:['banque','presse','juridique'].includes(c.cat)?'#FF82D7':'#FFEB5A'}}>
                      {CAT_ANN[c.cat]||c.cat}
                    </div>
                    {c.vip&&<span style={{float:'right',fontSize:10,fontWeight:900}}>⭐ VIP</span>}
                    <div style={{fontWeight:900,fontSize:14}}>{c.name}</div>
                    {c.contacts?.slice(0,2).map((ct, i)=>(
                      <div key={i} style={{marginTop:4}}>
                        {ct.name&&ct.name!=='—'&&<div style={{fontSize:11,fontWeight:900}}>{ct.name} {ct.role&&<span style={{opacity:.5}}>· {ct.role}</span>}</div>}
                        {ct.phone&&ct.phone!=='—'&&<div style={{fontSize:11,opacity:.6}}>📞 {ct.phone}</div>}
                        {ct.email&&<div style={{fontSize:11,opacity:.6}}>✉️ {ct.email}</div>}
                      </div>
                    ))}
                    {c.notes&&<div style={{fontSize:10,fontWeight:900,opacity:.4,marginTop:6,textTransform:'uppercase'}}>{c.notes}</div>}
                    <div style={{marginTop:8,fontSize:9,opacity:.3,fontWeight:900,textTransform:'uppercase'}}>Cliquer pour modifier</div>
                  </div>
                ))}
                <div className="card" style={{border:'2px dashed #191923',boxShadow:'none',display:'flex',alignItems:'center',justifyContent:'center',minHeight:100,cursor:'pointer',opacity:.4}} onClick={()=>open('contact',{cat:'food',vip:false,contacts:[{name:'',phone:'',email:'',role:''}]})}>
                  <div style={{textAlign:'center'}}><div style={{fontSize:24}}>+</div><div style={{fontSize:10,fontWeight:900,textTransform:'uppercase'}}>Ajouter</div></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TÂCHES ════════════════════════════════════════════════════ */}
          {page==='tasks'&&(
            <div>
              <div className="ph">
                <div><div className="pt">Tâches</div><div className="ps">{tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).length} actives</div></div>
                <button className="btn btn-y btn-sm" onClick={()=>open('task_detail',{assignee:isEmy?'emy':'emy',priority:'medium',status:'todo',checklist:[],files:[]})}>+ Nouvelle tâche</button>
              </div>
              {(isEmy?tasks.filter(t=>t.assignee==='emy'):tasks).map(t=>(
                <div key={t.id} className="card card-click" style={{padding:0,overflow:'hidden',marginBottom:8}} onClick={()=>open('task_detail',{...t})}>
                  <div style={{display:'flex',alignItems:'stretch',gap:0}}>
                    <div style={{width:6,background:t.priority==='high'?'#FF82D7':t.priority==='medium'?'#005FFF':'#009D3A',flexShrink:0}} />
                    <div style={{padding:'12px 14px',flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:900,textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?.5:1}}>{t.title}</div>
                          <div style={{fontSize:10,opacity:.5,marginTop:2}}>📅 {t.deadline} · {t.assignee} · {t.priority==='high'?'🔴 Haute':t.priority==='medium'?'🟡 Moyenne':'🟢 Basse'}</div>
                          {t.description&&<div style={{fontSize:11,opacity:.6,marginTop:4,fontStyle:'italic'}}>{t.description.slice(0,80)}{t.description.length>80?'…':''}</div>}
                          {t.checklist?.filter((c)=>c).length>0&&(
                    <div style={{marginTop:6}}>
                      {t.checklist.filter((c)=>c).map((item, ci)=>(
                        <div key={ci} style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                          <input type="checkbox" defaultChecked={false} style={{width:13,height:13,flexShrink:0}} onChange={e=>{
                            const newChecklist=[...t.checklist]
                            if(e.target.checked){newChecklist[ci]='✓ '+item.replace('✓ ','')}
                            else{newChecklist[ci]=item.replace('✓ ','')}
                            setTasks(prev=>prev.map(x=>x.id===t.id?{...x,checklist:newChecklist}:x))
                          }} checked={item.startsWith('✓ ')} readOnly />
                          <span style={{fontSize:11,textDecoration:item.startsWith('✓ ')?'line-through':'none',opacity:item.startsWith('✓ ')?.4:1}}>{item.replace('✓ ','')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                        </div>
                        <span className="badge" style={{color:t.status==='in_progress'?'#005FFF':t.status==='done'?'#009D3A':'#888',borderColor:t.status==='in_progress'?'#005FFF':t.status==='done'?'#009D3A':'#ccc',flexShrink:0}}>{TASK_S[t.status]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ REPORTING ════════════════════════════════════════════════ */}
          {page==='reporting'&&(
            <div>
              <div className="ph">
                <div><div className="pt">Reporting</div><div className="ps">Compte-rendus hebdo</div></div>
                {isEmy&&<button className="btn btn-n btn-sm" onClick={()=>open('cr',{})}>+ Nouveau CR</button>}
              </div>
              {reports.map((r,i)=>(
                <div key={r.id} className="card-y" style={{border:'2px solid #191923',borderRadius:7,boxShadow:'3px 3px 0 #191923'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
                    <div><div className="yt" style={{fontSize:12,opacity:.5}}>{r.date}</div><div style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{r.week}</div></div>
                    <span className="badge" style={{color:r.status==='submitted'?'#005FFF':'#009D3A',borderColor:r.status==='submitted'?'#005FFF':'#009D3A'}}>{r.status==='submitted'?'Soumis':'Lu ✓'}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                    {[['Prospects',r.prospects],['RDV',r.rdv],['Commandes',r.cmds]].map(([l,v])=>(
                      <div key={l} style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}>
                        <div style={{fontWeight:900,fontSize:20}}>{v}</div>
                        <div className="yt" style={{fontSize:11,opacity:.5}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {r.wins&&<div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>✅ Victoires</div><div style={{fontSize:12}}>{r.wins}</div></div>}
                  {r.next&&<div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>🎯 Priorités S+1</div><div style={{fontSize:12}}>{r.next}</div></div>}
                  {r.feedback?<div style={{background:'#FF82D7',border:'2px solid #191923',borderRadius:5,padding:10}}><div className="yt" style={{fontSize:14,marginBottom:4}}>💬 Retour d’Edward</div><div style={{fontSize:12}}>{r.feedback}</div></div>:
                  !isEmy&&(<div style={{marginTop:10}}>
                    <div className="lbl">💬 Ton retour à Emy</div>
                    <textarea className="inp" placeholder="Bravo, recadrages…" id={`fb-${r.id}`} style={{minHeight:60}} />
                    <button className="btn btn-y btn-sm" style={{marginTop:6}} onClick={()=>{const v=(document.getElementById(`fb-${r.id}`)as HTMLTextAreaElement)?.value;if(v){setReports(prev=>prev.map((x,j)=>j===i?{...x,feedback:v,status:'read'}:x));toast('Retour envoyé ✓')}}}>Envoyer le retour</button>
                  </div>)}
                </div>
              ))}
              {reports.length===0&&<div className="card" style={{textAlign:'center',padding:40}}><div style={{fontSize:40,marginBottom:10}}>📋</div><div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun CR pour l’instant</div>{isEmy&&<button className="btn btn-y" style={{marginTop:14}} onClick={()=>open('cr',{})}>Créer le premier CR</button>}</div>}
            </div>
          )}

          {/* ══ COFFRE-FORT ══════════════════════════════════════════════ */}
          {page==='vault'&&(
            <div>
              <div className="ph">
                <div><div className="pt">Coffre-fort 🔐</div><div className="ps">Accès sécurisés Meshuga</div></div>
                <button className="btn btn-y btn-sm" onClick={()=>open('vault_edit',{})}>+ Ajouter</button>
              </div>
              <div className="card-p" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',marginBottom:12}}>
                <span style={{fontSize:16}}>🔒</span>
                <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5}}>Données privées · Cliquer sur une ligne pour modifier</span>
              </div>
              {vault.map((v,i)=>(
                <div key={v.id} className="card card-click" style={{padding:0,overflow:'hidden',marginBottom:8}} onClick={()=>open('vault_edit',{...v})}>
                  <div style={{padding:'12px 16px',display:'grid',gridTemplateColumns:'1fr 1.4fr 1.2fr 1.2fr 60px',gap:10,alignItems:'center'}}>
                    <div style={{fontWeight:900,fontSize:13}}>{v.title}</div>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#005FFF',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onClick={e=>e.stopPropagation()}>{v.url}</a>
                    <div style={{fontSize:11}}>{v.user}</div>
                    <div style={{fontFamily:'monospace',letterSpacing:pwVisible[i]?'normal':3,fontSize:11,cursor:'pointer'}} onClick={e=>{e.stopPropagation();setPwVisible((prev)=>({...prev,[i]:!prev[i]}))}}>{pwVisible[i]?(v.pw||'(vide)'):'••••••••'} <span style={{fontSize:9,opacity:.4}}>{pwVisible[i]?'🙈':'👁'}</span></div>
                    <button className="btn btn-sm" onClick={e=>{e.stopPropagation();setVault(prev=>prev.filter(x=>x.id!==v.id));toast('Supprimé')}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ JOURNAL EMY ═════════════════════════════════════════════ */}
          {page==='journal'&&(
            <div>
              <div className="ph">
                <div><div className="pt">Journal d’activité 📓</div><div className="ps">Tout ce qu'Emy a fait, contacté, envoyé</div></div>
              </div>
              {/* Filtres */}
              <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                {[['all','Tout'],['email_copie','Emails'],['prospect_contacte','Contacts'],['statut_change','Statuts'],['prospect_ajoute','Ajouts']].map(([k,l])=>(
                  <div key={k} className={`tag${journalFilter===k?' on':''}`} onClick={()=>setJournalFilter(k)}>{l}</div>
                ))}
              </div>
              {activityLog.filter(a=>journalFilter==='all'||a.type===journalFilter).length===0?(
                <div className="card" style={{textAlign:'center',padding:40,opacity:.4}}>
                  <div style={{fontSize:32,marginBottom:8}}>📓</div>
                  <div style={{fontWeight:900,textTransform:'uppercase',fontSize:12}}>Aucune activité enregistrée</div>
                  <div style={{fontSize:11,marginTop:6,opacity:.6}}>Les actions d’Emy apparaîtront ici en temps réel</div>
                </div>
              ):activityLog.filter((a)=>journalFilter==='all'||a.type===journalFilter).map((a)=>(
                <div key={a.id} className="card" style={{padding:'12px 14px',marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontSize:16}}>{a.type==='email_copie'?'✉️':a.type==='prospect_contacte'?'📞':a.type==='statut_change'?'🔄':'➕'}</span>
                        <span style={{fontWeight:900,fontSize:13}}>{a.description}</span>
                        <span style={{fontSize:9,fontWeight:900,padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:a.user_role==='emy'?'#FF82D7':'#FFEB5A'}}>{a.user_name}</span>
                      </div>
                      {a.prospect_name&&<div style={{fontSize:11,opacity:.5,marginLeft:24}}>🎯 {a.prospect_name}</div>}
                      {a.email_content&&(
                        <div style={{marginTop:8,marginLeft:24}}>
                          <details>
                            <summary style={{cursor:'pointer',fontSize:11,fontWeight:900,opacity:.6}}>Voir l’email envoyé</summary>
                            <div style={{background:'#F8F8F8',border:'1.5px solid #DEDEDE',borderRadius:5,padding:10,marginTop:6,fontSize:12,whiteSpace:'pre-wrap',fontFamily:'Arial,sans-serif',lineHeight:1.6}}>{a.email_content}</div>
                          </details>
                        </div>
                      )}
                    </div>
                    <div style={{fontSize:10,opacity:.4,flexShrink:0}}>{new Date(a.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              ))}
            </div>
          )}





    {/* GÉNÉRATION EMAIL IA */}
    {modal==='gen_email'&&(
      <div className="overlay" onClick={close}>
        <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">✉️ Email IA — {form.name}</div></div>
          <div className="mb">
            {genLoading?(<div style={{textAlign:'center',padding:30}}><div style={{fontSize:32,marginBottom:10}}>✨</div><div style={{fontWeight:900,fontSize:13,textTransform:'uppercase'}}>Génération en cours…</div></div>):
            genEmail?(<>
              <div className="lbl">Email généré — modifie avant de copier</div>
              <textarea className="inp" style={{minHeight:260,fontFamily:'Arial,sans-serif',fontSize:13,lineHeight:1.6}} value={genEmail} onChange={e=>setGenEmail(e.target.value)} />
              <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:10,fontSize:12,marginTop:8}}>
                💡 Copie et envoie depuis ton client email depuis {profile?.role==='emy'?'emy@meshuga.fr':'edward@meshuga.fr'}
              </div>
            </>):null}
          </div>
          <div className="mf">
            <button className="btn" onClick={close}>Fermer</button>
            {genEmail&&<>
              <button className="btn btn-y" onClick={()=>{navigator.clipboard.writeText(genEmail);toast('Email copié ! 📋');logActivity('email_copie',`Email copié pour ${form.name}`,form.name,genEmail)}}>📋 Copier</button>
              <button className="btn btn-p" onClick={()=>generateEmail(form,form.emailContext||'prise de contact')}>🔄 Regénérer</button>
            </>}
          </div>
        </div>
      </div>
    )}

    {/* ÉDITION PROSPECT CHASSE */}
    {modal==='chasse_edit'&&(
      <div className="overlay" onClick={close}>
        <div className="modal modal-xl" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?'Modifier le prospect':'Ajouter un prospect'}</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.cat||'evenementiel'} onChange={e=>setForm({...form,cat:e.target.value})}>{Object.entries(CATS_MAP).filter(([k])=>k!=='all').map(([k,v]:any)=><option key={k} value={k}>{v.emoji} {v.label}</option>)}</select></div>
              <div className="fg"><label className="lbl">Score /10</label><input type="number" min="1" max="10" className="inp" value={form.score||5} onChange={e=>setForm({...form,score:parseInt(e.target.value)||5})} /></div>
              <div className="fg"><label className="lbl">Site web</label><input className="inp" value={form.site||''} onChange={e=>setForm({...form,site:e.target.value})} placeholder="exemple.fr" /></div>
              <div className="fg"><label className="lbl">Taille</label><select className="inp sel" value={form.taille||'10-50'} onChange={e=>setForm({...form,taille:e.target.value})}>{['1-10','5-20','10-30','10-50','50-100','100+','200+','500+','1000+'].map(t=><option key={t}>{t}</option>)}</select></div>
              <div className="fg"><label className="lbl">Arrondissement</label><input className="inp" value={form.arr||''} onChange={e=>setForm({...form,arr:e.target.value})} placeholder="Paris 6e" /></div>
              <div className="fg"><label className="lbl">📍 Adresse</label><input className="inp" value={form.adresse||''} onChange={e=>setForm({...form,adresse:e.target.value})} placeholder="123 rue de la Paix, 75001 Paris" /></div>
              <div className="fg"><label className="lbl">Valeur event €</label><input type="number" className="inp" value={form.ve||''} onChange={e=>setForm({...form,ve:parseInt(e.target.value)||0})} /></div>
              <div className="fg"><label className="lbl">Valeur mensuelle €</label><input type="number" className="inp" value={form.vm||''} onChange={e=>setForm({...form,vm:parseInt(e.target.value)||0})} /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Type de commande</label><input className="inp" value={form.type||''} onChange={e=>setForm({...form,type:e.target.value})} /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">💡 Angle d’approche</label><textarea className="inp" value={form.pitch||''} onChange={e=>setForm({...form,pitch:e.target.value})} /></div>
            </div>
            <div style={{marginTop:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div className="lbl" style={{margin:0}}>👤 Contacts ({(form.contacts||[]).length})</div>
                <button className="btn btn-y btn-sm" onClick={()=>setForm({...form,contacts:[...(form.contacts||[]),{name:'',email:'',phone:'',role:'',linkedin:''}]})}>+ Ajouter contact</button>
              </div>
              {(form.contacts||[]).map((c, i)=>(
                <div key={i} className="contact-item">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,flex:1}}>
                    <input className="inp" placeholder="Nom *" value={c.name||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],name:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Rôle / Poste" value={c.role||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],role:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Email" value={c.email||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],email:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Téléphone" value={c.phone||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],phone:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="🔗 LinkedIn URL" value={c.linkedin||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],linkedin:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px',gridColumn:'1/-1'}} />
                  </div>
                  {i>0&&<button className="btn btn-sm btn-red" onClick={()=>{const cs=(form.contacts||[]).filter((_,j)=>j!==i);setForm({...form,contacts:cs})}}>✕</button>}
                </div>
              ))}
            </div>
          </div>
          <div className="mf"><button className="btn" onClick={close}>Annuler</button><button className="btn btn-y" onClick={saveChasseProspect}>Sauvegarder</button></div>
        </div>
      </div>
    )}

    {/* ÉDITION PROSPECT CRM */}
    {modal==='crm_prospect'&&(
      <div className="overlay" onClick={close}>
        <div className="modal modal-xl" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?form.name:'Nouveau prospect CRM'}</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}><option value="">—</option><option>Événementiel</option><option>Corporate</option><option>Startup</option><option>Avocats</option><option>Conseil</option><option>Tech</option><option>Hôtellerie</option><option>Autre</option></select></div>
              <div className="fg"><label className="lbl">Taille</label><select className="inp sel" value={form.size||''} onChange={e=>setForm({...form,size:e.target.value})}><option value="">—</option><option>1-10</option><option>10-50</option><option>50-200</option><option>200+</option><option>1000+</option></select></div>
              <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'to_contact'} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(STATUS_P).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
              <div className="fg"><label className="lbl">CA gagné €</label><input type="number" className="inp" value={form.ca||0} onChange={e=>setForm({...form,ca:parseInt(e.target.value)||0})} /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}>
                <label className="lbl">📅 Prochaine relance</label>
                <div style={{display:'flex',gap:6}}>
                  <input type="date" className="inp" style={{flex:1}} value={form.nextDate||''} onChange={e=>setForm({...form,nextDate:e.target.value})} />
                  <button type="button" className="btn btn-sm" onClick={()=>{const d=new Date();d.setDate(d.getDate()+7);setForm({...form,nextDate:d.toISOString().split('T')[0]})}}>+7j</button>
                  <button type="button" className="btn btn-sm" onClick={()=>{const d=new Date();d.setDate(d.getDate()+14);setForm({...form,nextDate:d.toISOString().split('T')[0]})}}>+14j</button>
                </div>
                <input className="inp" style={{marginTop:6}} value={form.nextAction||''} onChange={e=>setForm({...form,nextAction:e.target.value})} placeholder="Action prévue…" />
              </div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            </div>
            {/* Contacts */}
            <div style={{marginTop:6}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div className="lbl" style={{margin:0}}>👤 Contacts</div>
                <button className="btn btn-y btn-sm" onClick={()=>setForm({...form,contacts:[...(form.contacts||[]),{name:'',email:'',phone:'',role:''}]})}>+ Ajouter</button>
              </div>
              {(form.contacts||[]).map((c, i)=>(
                <div key={i} className="contact-item">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,flex:1}}>
                    <input className="inp" placeholder="Nom" value={c.name||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],name:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Rôle" value={c.role||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],role:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Email" value={c.email||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],email:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Téléphone" value={c.phone||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],phone:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                  </div>
                  {i>0&&<button className="btn btn-sm btn-red" onClick={()=>{const cs=(form.contacts||[]).filter((_,j)=>j!==i);setForm({...form,contacts:cs})}}>✕</button>}
                </div>
              ))}
            </div>
          </div>
          <div className="mf">
            <button className="btn" onClick={()=>{setCrmProspects(prev=>prev.filter(x=>x.id!==form.id));close();toast('Supprimé')}}>Supprimer</button>
            <button className="btn" onClick={close}>Annuler</button>
            <button className="btn btn-y" onClick={saveCrmProspect}>Sauvegarder</button>
          </div>
        </div>
      </div>
    )}

    {/* DÉTAIL TÂCHE */}
    {modal==='task_detail'&&(
      <div className="overlay" onClick={close}>
        <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
          <div className="mh" style={{background:form.priority==='high'?'#FF82D7':form.priority==='medium'?'#FFEB5A':'#EBEBEB'}}>
            <div className="mt">{form.id?'Tâche':'Nouvelle tâche'}</div>
          </div>
          <div className="mb">
            <div className="fg"><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} /></div>
            <div className="fg2">
              <div className="fg"><label className="lbl">Assignée à</label><select className="inp sel" value={form.assignee||'emy'} onChange={e=>setForm({...form,assignee:e.target.value})}><option value="emy">Emy</option><option value="edward">Edward</option></select></div>
              <div className="fg"><label className="lbl">Deadline</label><input type="date" className="inp" value={form.deadline||''} onChange={e=>setForm({...form,deadline:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Priorité</label><select className="inp sel" value={form.priority||'medium'} onChange={e=>setForm({...form,priority:e.target.value})}><option value="high">🔴 Haute</option><option value="medium">🟡 Moyenne</option><option value="low">🟢 Basse</option></select></div>
              <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'todo'} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(TASK_S).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
            </div>
            <div className="fg"><label className="lbl">Description détaillée</label><textarea className="inp" style={{minHeight:80}} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Détailler ce qui est attendu, contexte, critères de succès…" /></div>
            {/* Checklist */}
            <div style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div className="lbl" style={{margin:0}}>☑ Sous-tâches ({(form.checklist||[]).filter((c)=>c).length})</div>
                <button className="btn btn-y btn-sm" onClick={()=>setForm({...form,checklist:[...(form.checklist||[]),'']})}>+ Ajouter</button>
              </div>
              {(form.checklist||[]).map((item, i)=>(
                <div key={i} style={{display:'flex',gap:6,marginBottom:5,alignItems:'center'}}>
                  <input type="checkbox" style={{width:16,height:16,flexShrink:0}} />
                  <input className="inp" value={item} onChange={e=>{const c=[...(form.checklist||[])];c[i]=e.target.value;setForm({...form,checklist:c})}} placeholder={`Sous-tâche ${i+1}`} style={{fontSize:12,padding:'5px 8px'}} />
                  <button className="btn btn-sm btn-red" onClick={()=>{const c=(form.checklist||[]).filter((_, j)=>j!==i);setForm({...form,checklist:c})}}>✕</button>
                </div>
              ))}
            </div>
            <div className="fg"><label className="lbl">📎 Fichiers joints (descriptions)</label><textarea className="inp" style={{minHeight:50}} value={(form.files||[]).join('\n')} onChange={e=>setForm({...form,files:e.target.value.split('\n')})} placeholder="Lister les fichiers ou liens associés…" /></div>
          </div>
          <div className="mf">
            {form.id&&<button className="btn" onClick={()=>{setTasks(prev=>prev.filter(x=>x.id!==form.id));close();toast('Supprimé')}}>Supprimer</button>}
            <button className="btn" onClick={close}>Annuler</button>
            <button className="btn btn-y" onClick={saveTask}>Sauvegarder</button>
          </div>
        </div>
      </div>
    )}

    {/* ANNUAIRE CONTACT */}
    {modal==='contact'&&(
      <div className="overlay" onClick={close}>
        <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?'Modifier le contact':'Nouveau contact'}</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.cat||'food'} onChange={e=>setForm({...form,cat:e.target.value})}>{Object.entries(CAT_ANN).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
              <div className="fg" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" checked={!!form.vip} onChange={e=>setForm({...form,vip:e.target.checked})} style={{width:16,height:16}} /><span style={{fontSize:12}}>VIP ⭐</span></div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Nom entreprise *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            </div>
            {/* Contacts multiples */}
            <div style={{marginTop:6}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div className="lbl" style={{margin:0}}>👤 Personnes à contacter</div>
                <button className="btn btn-y btn-sm" onClick={()=>setForm({...form,contacts:[...(form.contacts||[]),{name:'',phone:'',email:'',role:''}]})}>+ Ajouter</button>
              </div>
              {(form.contacts||[]).map((c, i)=>(
                <div key={i} className="contact-item">
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,flex:1}}>
                    <input className="inp" placeholder="Nom" value={c.name||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],name:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Rôle" value={c.role||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],role:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Téléphone" value={c.phone||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],phone:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                    <input className="inp" placeholder="Email" value={c.email||''} onChange={e=>{const cs=[...(form.contacts||[])];cs[i]={...cs[i],email:e.target.value};setForm({...form,contacts:cs})}} style={{fontSize:11,padding:'5px 8px'}} />
                  </div>
                  {i>0&&<button className="btn btn-sm btn-red" onClick={()=>{const cs=(form.contacts||[]).filter((_,j)=>j!==i);setForm({...form,contacts:cs})}}>✕</button>}
                </div>
              ))}
            </div>
          </div>
          <div className="mf">
            {form.id&&<button className="btn" onClick={()=>{setContacts(prev=>prev.filter(x=>x.id!==form.id));close();toast('Supprimé')}}>Supprimer</button>}
            <button className="btn" onClick={close}>Annuler</button>
            <button className="btn btn-y" onClick={saveContact}>Sauvegarder</button>
          </div>
        </div>
      </div>
    )}

    {/* VAULT EDIT */}
    {modal==='vault_edit'&&(
      <div className="overlay" onClick={close}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?"Modifier l’accès":"Nouvel accès"} 🔐</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} /></div>
              <div className="fg"><label className="lbl">URL</label><input className="inp" value={form.url||''} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://…" /></div>
              <div className="fg"><label className="lbl">Identifiant</label><input className="inp" value={form.user||''} onChange={e=>setForm({...form,user:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Mot de passe</label><input type="password" className="inp" value={form.pw||''} onChange={e=>setForm({...form,pw:e.target.value})} /></div>
            </div>
          </div>
          <div className="mf">
            {form.id&&<button className="btn" onClick={()=>{setVault(prev=>prev.filter(x=>x.id!==form.id));close();toast('Supprimé')}}>Supprimer</button>}
            <button className="btn" onClick={close}>Annuler</button>
            <button className="btn btn-y" onClick={saveVault}>Sauvegarder</button>
          </div>
        </div>
      </div>
    )}

    {/* CR */}
    {modal==='cr'&&(
      <div className="overlay" onClick={close}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">Compte-rendu hebdomadaire</div></div>
          <div className="mb">
            <div className="fg"><label className="lbl">Semaine du *</label><input className="inp" value={form.week||''} onChange={e=>setForm({...form,week:e.target.value})} placeholder="ex: 25 mars 2026" /></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
              {[['prospects','Prospects'],['rdv','RDV'],['cmds','Commandes']].map(([k,l])=>(
                <div key={k} className="fg"><label className="lbl">{l}</label><input type="number" className="inp" value={form[k]||0} onChange={e=>setForm({...form,[k]:parseInt(e.target.value)||0})} /></div>
              ))}
            </div>
            <div className="fg"><label className="lbl">✅ Victoires</label><textarea className="inp" value={form.wins||''} onChange={e=>setForm({...form,wins:e.target.value})} placeholder="Ce que j’ai accompli…" /></div>
            <div className="fg"><label className="lbl">⚡ Challenges</label><textarea className="inp" value={form.challenges||''} onChange={e=>setForm({...form,challenges:e.target.value})} /></div>
            <div className="fg"><label className="lbl">🎯 Priorités S+1</label><textarea className="inp" value={form.next||''} onChange={e=>setForm({...form,next:e.target.value})} /></div>
            <div className="fg"><label className="lbl">💬 Note pour Edward</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
          </div>
          <div className="mf"><button className="btn" onClick={close}>Annuler</button><button className="btn btn-y" onClick={submitCR}>📤 Soumettre à Edward</button></div>
        </div>
      </div>
    )}

    {/* TOAST */}
    <div className={`toast${toast2?' show':''}`}>{toast2}</div>
    </div>
  )
}
