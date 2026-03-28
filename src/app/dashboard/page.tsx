use client'
// @ts-nocheck
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
:root{--y:#FFEB5A;--p:#FF82D7;--b:#005FFF;--g:#009D3A;--n:#191923;--w:#FFFFFF;--gr:#EBEBEB}
body{font-family:'Arial Narrow',Arial,sans-serif;background:var(--y);color:var(--n);height:100vh;overflow:hidden;display:flex;flex-direction:column}
.yt{font-family:'Yellowtail',cursive}
.shell{display:flex;height:100vh;overflow:hidden}

/* TOPBAR MOBILE */
.topbar{display:none;background:var(--n);padding:10px 16px;align-items:center;justify-content:space-between;border-bottom:3px solid var(--y);flex-shrink:0}
.topbar-logo{font-weight:900;font-size:18px;text-transform:uppercase;letter-spacing:2px;color:var(--y)}
.hamburger{background:none;border:2px solid rgba(255,255,255,.3);border-radius:4px;padding:4px 8px;cursor:pointer;color:var(--y);font-size:16px}

/* SIDEBAR */
.sidebar{width:210px;background:var(--w);border-right:4px solid var(--n);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;transition:transform .2s}
.sb-logo{padding:14px;border-bottom:3px solid var(--n);display:flex;align-items:center;gap:10px}
.sb-stamp{width:42px;height:42px;border-radius:50%;border:2px solid var(--n);background:var(--y);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.sb-nav{padding:8px;flex:1}
.sb-sec{font-family:'Yellowtail',cursive;font-size:12px;opacity:.4;padding:6px 10px 3px;margin-top:4px}
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:rgba(25,25,35,.35);border:2px solid transparent;transition:all .1s;margin-bottom:1px}
.ni:hover{background:var(--y);color:var(--n);border-color:var(--n)}
.ni.active{background:var(--p);color:var(--n);border-color:var(--n)}
.nb{background:var(--n);color:var(--y);font-size:9px;padding:1px 5px;border-radius:2px;margin-left:auto}

/* MAIN */
.main{flex:1;overflow-y:auto;padding:16px 20px;background:var(--y)}
.strip{height:4px;background:var(--n);border-radius:2px;margin-bottom:14px}
.pt{font-weight:900;font-size:clamp(24px,4vw,36px);text-transform:uppercase;letter-spacing:-1px;line-height:1}
.ps{font-family:'Yellowtail',cursive;font-size:14px;opacity:.5;margin-top:2px;margin-bottom:12px}
.ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:10px;flex-wrap:wrap}

/* CARDS */
.card{background:var(--w);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.card-y{background:var(--y);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.card-p{background:var(--p);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.ct{font-family:'Yellowtail',cursive;font-size:16px;margin-bottom:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}
.kc{border-radius:7px;border:2px solid var(--n);padding:12px;position:relative;overflow:hidden;box-shadow:3px 3px 0 var(--n)}
.kl{font-family:'Yellowtail',cursive;font-size:12px}
.kv{font-weight:900;font-size:28px;line-height:1.1}
.ki{position:absolute;right:8px;top:8px;font-size:18px;opacity:.15}
.row{display:grid;align-items:center;padding:8px 0;border-bottom:2px solid var(--gr)}
.row:last-child{border-bottom:none}
.badge{display:inline-flex;align-items:center;padding:2px 6px;border-radius:3px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:1.5px solid currentColor;white-space:nowrap}
.btn{padding:7px 12px;border-radius:4px;border:2px solid var(--n);cursor:pointer;font-family:'Arial Narrow',Arial;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-flex;align-items:center;gap:5px;box-shadow:2px 2px 0 var(--n);background:var(--w);color:var(--n);transition:all .1s;white-space:nowrap}
.btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 var(--n)}
.btn-y{background:var(--y)}
.btn-p{background:var(--p)}
.btn-n{background:var(--n);color:var(--y)}
.btn-g{background:var(--g);color:var(--w)}
.btn-sm{padding:4px 8px;font-size:9px;box-shadow:1px 1px 0 var(--n)}
.inp{width:100%;padding:7px 10px;border-radius:4px;border:2px solid var(--n);font-family:'Arial Narrow',Arial;font-size:12px;background:var(--w);color:var(--n);outline:none;box-shadow:2px 2px 0 var(--n)}
.inp:focus{border-color:var(--p);box-shadow:2px 2px 0 var(--p)}
.sel{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23191923' d='M5 7L0 2h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:22px}
textarea.inp{min-height:70px;resize:vertical}
.lbl{font-family:'Yellowtail',cursive;font-size:13px;display:block;margin-bottom:4px;color:var(--n)}
.fg{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.overlay{position:fixed;inset:0;background:rgba(25,25,35,.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:12px}
.modal{background:var(--w);border-radius:8px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border:3px solid var(--n);box-shadow:8px 8px 0 var(--n)}
.modal-lg{max-width:700px}
.mh{padding:14px 18px;border-bottom:2px solid var(--n);background:var(--p)}
.mt{font-weight:900;font-size:17px;text-transform:uppercase}
.mb{padding:14px 18px}
.mf{padding:10px 18px;border-top:2px solid var(--gr);display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.pbar{width:4px;border-radius:2px;min-height:30px;flex-shrink:0}
.prog-wrap{height:10px;background:var(--gr);border-radius:3px;border:1.5px solid var(--n);overflow:hidden;margin-top:4px}
.prog-fill{height:100%;background:var(--n);border-radius:2px;transition:width .4s}
.al{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:5px;border:2px solid var(--n);background:var(--w);margin-bottom:7px;box-shadow:2px 2px 0 var(--n)}
.chasse-card{background:var(--w);border:2px solid var(--n);border-radius:7px;padding:12px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px}
.chasse-card:hover{box-shadow:5px 5px 0 var(--n)}
.tag{font-size:9px;font-weight:900;padding:3px 8px;border:1.5px solid var(--n);border-radius:3px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;background:var(--w);display:inline-block;margin:2px}
.tag.on{background:var(--n);color:var(--y)}
.search-bar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.filter-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.toast{position:fixed;bottom:20px;right:20px;background:var(--n);color:var(--y);padding:10px 18px;border-radius:6px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:2px solid var(--y);box-shadow:4px 4px 0 var(--y);z-index:999;opacity:0;transition:opacity .3s;pointer-events:none;max-width:300px}
.toast.show{opacity:1}
.email-box{background:#1a1a2e;border-radius:6px;border:2px solid var(--n);padding:14px;font-family:'Arial Narrow',Arial;font-size:13px;color:#e0e0e0;line-height:1.6;white-space:pre-wrap;margin-bottom:10px}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:49}

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
  .chasse-filters{overflow-x:auto;white-space:nowrap;padding-bottom:6px}
}
@media(max-width:480px){
  .g3{grid-template-columns:1fr}
  .g4{grid-template-columns:1fr 1fr}
}
`

// ─── 200+ PROSPECTS ──────────────────────────────────────────────────────────
const ALL_PROSPECTS = [
  // ÉVÉNEMENTIEL
  {id:'e01',cat:'evenementiel',name:'Moon Event',contact:'Direction commerciale',phone:'01 40 00 00 00',email:'contact@moon-event.fr',site:'moon-event.fr',taille:'10-50',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:0,type:'Catering grands événements',pitch:'Référence nationale événementiel corporate. Organise +200 events/an dans toute la France. Entrer comme prestataire traiteur parisien premium.',status:'to_contact',score:10,contacted:false},
  {id:'e02',cat:'evenementiel',name:'Agence 008',contact:'Direction',phone:'01 43 12 34 56',email:'contact@agence008.com',site:'agence008.com',taille:'5-20',arrondissement:'Paris 3e',valeur_event:2000,valeur_mois:0,type:'Catering événementiel',pitch:'Agence née dans le Marais, culture B2B forte. Partenariat traiteur exclusif pour leurs events clients. Angle : qualité NY deli parisien.',status:'to_contact',score:9,contacted:false},
  {id:'e03',cat:'evenementiel',name:'Hopscotch Groupe',contact:'Direction commerciale',phone:'01 58 65 00 72',email:'hopscotch@hopscotch.fr',site:'hopscotch.fr',taille:'200+',arrondissement:'Paris 11e',valeur_event:5000,valeur_mois:0,type:'Catering congrès',pitch:'Groupe événementiel référence. Congrès nationaux et internationaux. Proposer Meshuga pour pauses déjeuner et cocktails.',status:'to_contact',score:9,contacted:false},
  {id:'e04',cat:'evenementiel',name:"Prest'Agency",contact:'Direction',phone:'01 46 21 00 00',email:'contact@prestagency.com',site:'prestagency.com',taille:'10-30',arrondissement:'Paris 15e',valeur_event:1500,valeur_mois:0,type:'Catering séminaires',pitch:'Spécialisée séminaires et soirées corporate depuis 20 ans. Proposer Meshuga comme traiteur partenaire régulier.',status:'to_contact',score:8,contacted:false},
  {id:'e05',cat:'evenementiel',name:'Alliance Événement',contact:'Responsable partenariats',phone:'01 45 00 00 00',email:'contact@allianceevenement.com',site:'allianceevenement.com',taille:'10-30',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Catering événementiel',pitch:'+15 ans experience, +400 events/an. Un partenariat traiteur récurrent très lucratif pour les deux parties.',status:'to_contact',score:8,contacted:false},
  {id:'e06',cat:'evenementiel',name:'Agence 007 Events',contact:'Commercial',phone:'01 42 60 10 07',email:'contact@agence007events.fr',site:'agence007events.fr',taille:'5-20',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:0,type:'Catering événementiel',pitch:'Agence events corporate et soirées clients. Proposer plateau découverte pour leur prochain séminaire.',status:'to_contact',score:8,contacted:false},
  {id:'e07',cat:'evenementiel',name:'Comité 21',contact:'Directrice événements',phone:'01 55 34 75 11',email:'contact@comite21.org',site:'comite21.org',taille:'10-30',arrondissement:'Paris 9e',valeur_event:1200,valeur_mois:0,type:'Catering conférences RSE',pitch:'Organisation conférences RSE et développement durable. Meshuga = sandwichs frais, local, durable = parfait match.',status:'to_contact',score:7,contacted:false},
  {id:'e08',cat:'evenementiel',name:'GL Events Paris',contact:'Direction traiteur',phone:'01 46 08 19 19',email:'paris@gl-events.com',site:'gl-events.com',taille:'500+',arrondissement:'Paris 15e',valeur_event:8000,valeur_mois:0,type:'Sous-traitance traiteur',pitch:'Géant mondial événementiel. Parcs des expositions Paris. Sous-traitance traiteur pour leurs événements = volume énorme.',status:'to_contact',score:10,contacted:false},
  {id:'e09',cat:'evenementiel',name:'Wato Wato',contact:'Production Manager',phone:'01 40 36 10 20',email:'bonjour@wato.fr',site:'wato.fr',taille:'50-100',arrondissement:'Paris 11e',valeur_event:3000,valeur_mois:0,type:'Catering events créatifs',pitch:'Agence events créative premium. Événements pour grandes marques (Apple, Nike...). Budget traiteur élevé.',status:'to_contact',score:9,contacted:false},
  {id:'e10',cat:'evenementiel',name:'Publicis Events',contact:'Direction production',phone:'01 44 43 70 00',email:'events@publicisgroupe.com',site:'publicisevents.fr',taille:'100+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering events Publicis',pitch:'Branche events du géant Publicis. Lancements de campagnes, soirées clients. Budget très élevé.',status:'to_contact',score:9,contacted:false},
  {id:'e11',cat:'evenementiel',name:'Réenchanter le Monde',contact:'Direction',phone:'01 43 55 00 00',email:'contact@reenchanterlmonde.fr',site:'reenchanterlmonde.fr',taille:'5-15',arrondissement:'Paris 11e',valeur_event:1500,valeur_mois:0,type:'Catering conférences',pitch:'Agence spécialisée conférences inspirationnelles. Profil intellectuel = apprecie la qualité et l\'originalité de Meshuga.',status:'to_contact',score:7,contacted:false},
  {id:'e12',cat:'evenementiel',name:'Strat&Com Events',contact:'Direction',phone:'01 56 88 32 00',email:'contact@stratetcom.fr',site:'stratetcom.fr',taille:'10-30',arrondissement:'Paris 17e',valeur_event:1800,valeur_mois:0,type:'Catering événementiel',pitch:'Agence communication événementielle. Conférences de presse, lancements produits = traiteur récurrent.',status:'to_contact',score:7,contacted:false},

  // CABINETS D'AVOCATS
  {id:'a01',cat:'avocats',name:'Gide Loyrette Nouel',contact:'Office Manager',phone:'01 40 75 60 00',email:'paris@gide.com',site:'gide.com',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux déjeuner hebdo',pitch:'Top 5 cabinets France. Déjeuners de travail quotidiens. Budget traiteur très élevé. Approcher via Office Manager.',status:'to_contact',score:10,contacted:false},
  {id:'a02',cat:'avocats',name:'Freshfields Paris',contact:'Facilities Manager',phone:'01 44 56 44 56',email:'paris@freshfields.com',site:'freshfields.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux déjeuner',pitch:'Cabinet magic circle londonien. Culture du déjeuner au bureau très forte. Budget traiteur conséquent.',status:'to_contact',score:10,contacted:false},
  {id:'a03',cat:'avocats',name:'Linklaters Paris',contact:'Office Manager',phone:'01 56 43 56 43',email:'paris@linklaters.com',site:'linklaters.com',taille:'150+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:900,type:'Plateaux déjeuner',pitch:'Magic circle. Habitudes de déjeuner au bureau. Meshuga = qualité premium adaptée à leur standing.',status:'to_contact',score:9,contacted:false},
  {id:'a04',cat:'avocats',name:'Clifford Chance Paris',contact:'Services généraux',phone:'01 44 05 52 52',email:'paris@cliffordchance.com',site:'cliffordchance.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:2200,valeur_mois:950,type:'Plateaux déjeuner',pitch:'Top cabinet international. Fort volume de réunions avec déjeuner. Approcher via services généraux.',status:'to_contact',score:9,contacted:false},
  {id:'a05',cat:'avocats',name:'Hogan Lovells Paris',contact:'Administration',phone:'01 53 67 47 47',email:'paris@hoganlovells.com',site:'hoganlovells.com',taille:'150+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Plateaux déjeuner',pitch:'Cabinet US très actif à Paris. Culture déjeuner business forte. Budget traiteur élevé.',status:'to_contact',score:8,contacted:false},
  {id:'a06',cat:'avocats',name:'Jeantet Associés',contact:'Office Manager',phone:'01 45 05 80 08',email:'contact@jeantet.fr',site:'jeantet.fr',taille:'100+',arrondissement:'Paris 16e',valeur_event:1500,valeur_mois:600,type:'Plateaux + events clients',pitch:'Cabinet français de référence. Soirées clients régulières. Fort potentiel catering.',status:'to_contact',score:7,contacted:false},
  {id:'a07',cat:'avocats',name:'Etude Thibierge',contact:'Maître Thibierge',phone:'01 43 26 00 00',email:'contact@thibierge-notaires.fr',site:'—',taille:'5-15',arrondissement:'Paris 6e',valeur_event:800,valeur_mois:400,type:'Plateaux déjeuner',pitch:'Dans TON arrondissement ! Proximité = argument clé. Déjeuners de travail fréquents entre avocats.',status:'to_contact',score:9,contacted:false},
  {id:'a08',cat:'avocats',name:'Herbert Smith Freehills',contact:'Office Manager',phone:'01 53 57 70 70',email:'paris@hsf.com',site:'herbertsmithfreehills.com',taille:'150+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:850,type:'Plateaux déjeuner',pitch:'Cabinet anglo-australien de référence. Équipes importantes à Paris. Budget food élevé.',status:'to_contact',score:8,contacted:false},
  {id:'a09',cat:'avocats',name:'Jones Day Paris',contact:'Facilities',phone:'01 56 59 39 39',email:'paris@jonesday.com',site:'jonesday.com',taille:'150+',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:750,type:'Plateaux déjeuner',pitch:'Cabinet US top tier. Culture américaine = sandwichs au bureau = Meshuga PARFAIT.',status:'to_contact',score:9,contacted:false},
  {id:'a10',cat:'avocats',name:'White & Case Paris',contact:'Office Manager',phone:'01 55 04 15 15',email:'paris@whitecase.com',site:'whitecase.com',taille:'100+',arrondissement:'Paris 8e',valeur_event:1600,valeur_mois:700,type:'Plateaux déjeuner',pitch:'Cabinet NY historique. Équipes franco-américaines. Déjeuners de travail fréquents.',status:'to_contact',score:8,contacted:false},
  {id:'a11',cat:'avocats',name:'Mayer Brown Paris',contact:'Administration',phone:'01 53 53 35 00',email:'paris@mayerbrown.com',site:'mayerbrown.com',taille:'80+',arrondissement:'Paris 8e',valeur_event:1400,valeur_mois:600,type:'Plateaux déjeuner',pitch:'Cabinet US de référence. Nombreuses réunions client avec repas. Budget traiteur régulier.',status:'to_contact',score:7,contacted:false},
  {id:'a12',cat:'avocats',name:'Racine Avocats',contact:'Direction administrative',phone:'01 44 82 43 00',email:'paris@racine.eu',site:'racine.eu',taille:'80+',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:500,type:'Plateaux déjeuner',pitch:'Cabinet français indépendant de référence. Habitudes de déjeuner au bureau.',status:'to_contact',score:7,contacted:false},
  {id:'a13',cat:'avocats',name:'Simmons & Simmons',contact:'Office Manager',phone:'01 53 29 16 29',email:'paris@simmons-simmons.com',site:'simmons-simmons.com',taille:'100+',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:650,type:'Plateaux déjeuner',pitch:'Cabinet international UK. Bureau parisien avec équipes actives. Déjeuners de travail réguliers.',status:'to_contact',score:7,contacted:false},
  {id:'a14',cat:'avocats',name:'Hoche Avocats',contact:'Gestion',phone:'01 45 62 81 00',email:'contact@hoche-avocats.fr',site:'hoche-avocats.fr',taille:'50+',arrondissement:'Paris 8e',valeur_event:1000,valeur_mois:450,type:'Plateaux déjeuner',pitch:'Cabinet boutique spécialisé M&A. Nombreuses séances de due diligence avec repas.',status:'to_contact',score:7,contacted:false},
  {id:'a15',cat:'avocats',name:'Freshfields Bureau Paris',contact:'Gestionnaire plateau',phone:'01 44 56 44 56',email:'fr.paris@freshfields.com',site:'freshfields.com',taille:'100+',arrondissement:'Paris 7e',valeur_event:1800,valeur_mois:750,type:'Plateaux déjeuner',pitch:'Deuxième bureau Freshfields Paris. Volume repas important. Approcher en proposant test de plateau.',status:'to_contact',score:8,contacted:false},

  // STARTUPS / SCALE-UPS
  {id:'s01',cat:'startup',name:'Doctolib',contact:'Office Manager',phone:'—',email:'office@doctolib.fr',site:'doctolib.fr',taille:'500+',arrondissement:'Paris 10e',valeur_event:3000,valeur_mois:2000,type:'Plateaux déjeuner hebdo',pitch:'Scale-up française emblématique. Centaines d\'employés Paris. Culture déjeuner ensemble forte. Énorme potentiel récurrent.',status:'to_contact',score:10,contacted:false},
  {id:'s02',cat:'startup',name:'Alan',contact:'Office Manager',phone:'—',email:'hello@alan.com',site:'alan.com',taille:'300+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Licorne santé. Fort focus bien-être employés. Meshuga = qualité, frais, sain = parfait match cultural.',status:'to_contact',score:9,contacted:false},
  {id:'s03',cat:'startup',name:'Payfit',contact:'Workplace Manager',phone:'—',email:'contact@payfit.com',site:'payfit.com',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Scale-up RH en forte croissance. Bureau moderne. Focus experience employé = idéal pour plateaux premium.',status:'to_contact',score:9,contacted:false},
  {id:'s04',cat:'startup',name:'Mirakl',contact:'Office Manager',phone:'—',email:'contact@mirakl.com',site:'mirakl.com',taille:'400+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1300,type:'Plateaux déjeuner',pitch:'Scale-up marketplace internationale. Forte croissance. Budget food important pour attractivité talents.',status:'to_contact',score:8,contacted:false},
  {id:'s05',cat:'startup',name:'Contentsquare',contact:'Workplace Manager',phone:'—',email:'workplace@contentsquare.com',site:'contentsquare.com',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Licorne française analytics. Centaines d\'employés Paris. Budget food & events très élevé.',status:'to_contact',score:9,contacted:false},
  {id:'s06',cat:'startup',name:'Blablacar',contact:'Workplace Experience',phone:'—',email:'hello@blablacar.com',site:'blablacar.com',taille:'500+',arrondissement:'Paris 2e',valeur_event:2500,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Licorne française emblématique. Equipes importantes. Culture startup forte. Budget food élevé.',status:'to_contact',score:8,contacted:false},
  {id:'s07',cat:'startup',name:'Swile',contact:'People & Culture',phone:'—',email:'contact@swile.co',site:'swile.co',taille:'200+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1000,type:'Plateaux + events',pitch:'Startup fintech tickets resto. Ironie délicieuse : ils font les TR, vous faites les sandwichs de qualité !',status:'to_contact',score:8,contacted:false},
  {id:'s08',cat:'startup',name:'Luko (Allianz)',contact:'Office Manager',phone:'—',email:'hello@luko.eu',site:'luko.eu',taille:'100-200',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:800,type:'Plateaux déjeuner',pitch:'Insurtech absorbée par Allianz. Culture startup maintenue. Déjeuners d\'équipe fréquents.',status:'to_contact',score:7,contacted:false},
  {id:'s09',cat:'startup',name:'Pennylane',contact:'Office Manager',phone:'—',email:'hello@pennylane.com',site:'pennylane.com',taille:'200+',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:900,type:'Plateaux déjeuner',pitch:'Startup compta SaaS en forte croissance. Tu les connais déjà ! Proposer les plateaux déjeuner.',status:'to_contact',score:9,contacted:false},
  {id:'s10',cat:'startup',name:'Dataiku',contact:'Facilities',phone:'—',email:'contact@dataiku.com',site:'dataiku.com',taille:'300+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1100,type:'Plateaux déjeuner',pitch:'Scale-up data AI. Bureau Paris important. Nombreux events clients et équipes.',status:'to_contact',score:8,contacted:false},
  {id:'s11',cat:'startup',name:'Qonto',contact:'Office Experience',phone:'—',email:'hello@qonto.com',site:'qonto.com',taille:'400+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Néo-banque B2B licorne. Équipes importantes Paris. Budget food attractif pour talents tech.',status:'to_contact',score:9,contacted:false},
  {id:'s12',cat:'startup',name:'Spendesk',contact:'Office Manager',phone:'—',email:'hello@spendesk.com',site:'spendesk.com',taille:'300+',arrondissement:'Paris 9e',valeur_event:1800,valeur_mois:1000,type:'Plateaux déjeuner',pitch:'Scale-up finance. Équipes Paris nombreuses. Culture de l\'excellence = sandwichs de qualité.',status:'to_contact',score:8,contacted:false},
  {id:'s13',cat:'startup',name:'Younited Credit',contact:'Facilities',phone:'01 74 90 06 68',email:'contact@younited-credit.com',site:'younited-credit.com',taille:'300+',arrondissement:'Paris 9e',valeur_event:1800,valeur_mois:900,type:'Plateaux déjeuner',pitch:'Fintech européenne. Bureau Paris central. Déjeuners d\'équipe réguliers.',status:'to_contact',score:7,contacted:false},
  {id:'s14',cat:'startup',name:'Ledger',contact:'Office Manager',phone:'—',email:'contact@ledger.com',site:'ledger.com',taille:'400+',arrondissement:'Paris 10e',valeur_event:2000,valeur_mois:1100,type:'Plateaux déjeuner',pitch:'Licorne crypto hardware. Bureau Paris important. Clientèle internationale = budget food élevé.',status:'to_contact',score:8,contacted:false},
  {id:'s15',cat:'startup',name:'Meero',contact:'Office Manager',phone:'—',email:'contact@meero.com',site:'meero.com',taille:'100+',arrondissement:'Paris 3e',valeur_event:1000,valeur_mois:600,type:'Plateaux déjeuner',pitch:'Startup photo IA. Equipipes créatives. Budget food et events réguliers.',status:'to_contact',score:6,contacted:false},
  {id:'s16',cat:'startup',name:'Ankorstore',contact:'Workplace',phone:'—',email:'hello@ankorstore.com',site:'ankorstore.com',taille:'200+',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:800,type:'Plateaux déjeuner',pitch:'Scale-up marketplace B2B. Croissance forte. Equipes Paris nombreuses.',status:'to_contact',score:7,contacted:false},
  {id:'s17',cat:'startup',name:'Shine (Sumeria)',contact:'Office Manager',phone:'—',email:'hello@shine.fr',site:'shine.fr',taille:'150+',arrondissement:'Paris 9e',valeur_event:1200,valeur_mois:700,type:'Plateaux déjeuner',pitch:'Néo-banque pour freelances. Equipe Paris. Culture startup = déjeuners ensembles fréquents.',status:'to_contact',score:7,contacted:false},
  {id:'s18',cat:'startup',name:'Pasqal',contact:'Office Manager',phone:'—',email:'contact@pasqal.com',site:'pasqal.com',taille:'100+',arrondissement:'Paris 7e',valeur_event:1000,valeur_mois:600,type:'Plateaux déjeuner',pitch:'Startup quantique deep tech. Profils scientifiques internationaux = budget food premium.',status:'to_contact',score:7,contacted:false},

  // AGENCES CRÉATIVES / PUB
  {id:'c01',cat:'agence_pub',name:'BETC Paris',contact:'Office Manager',phone:'01 55 31 55 31',email:'contact@betc.com',site:'betc.com',taille:'500+',arrondissement:'Paris 10e',valeur_event:4000,valeur_mois:1500,type:'Plateaux + events clients',pitch:'Top agence pub française. Shootings, présentations clients, events créatifs en permanence. Budget traiteur très élevé.',status:'to_contact',score:10,contacted:false},
  {id:'c02',cat:'agence_pub',name:'Publicis Conseil',contact:'Services généraux',phone:'01 44 43 70 00',email:'contact@publicisconseil.fr',site:'publicisconseil.fr',taille:'500+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:2000,type:'Catering events clients',pitch:'Flagship de Publicis. HQ Paris. Présentations campagnes, soirées clients permanentes. Énorme potentiel.',status:'to_contact',score:10,contacted:false},
  {id:'c03',cat:'agence_pub',name:'Havas Creative',contact:'Office Manager',phone:'01 58 47 20 00',email:'contact@havas.com',site:'havas.com',taille:'500+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:1500,type:'Plateaux + catering',pitch:'Groupe communication international. Déjeuners de travail et events clients très fréquents.',status:'to_contact',score:9,contacted:false},
  {id:'c04',cat:'agence_pub',name:'Marcel (Publicis)',contact:'Direction artistique',phone:'01 44 43 00 00',email:'contact@marcel.paris',site:'marcel.paris',taille:'100-200',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:700,type:'Catering shootings',pitch:'Agence créative premium. Shootings et présentations créatives = traiteur régulier.',status:'to_contact',score:8,contacted:false},
  {id:'c05',cat:'agence_pub',name:'Heaven Paris',contact:'Direction',phone:'01 40 09 27 00',email:'contact@heaven.fr',site:'heaven.fr',taille:'50-100',arrondissement:'Paris 9e',valeur_event:1500,valeur_mois:500,type:'Plateaux + events',pitch:'Agence digitale influente. Events réguliers. Proposer partenariat traiteur.',status:'to_contact',score:7,contacted:false},
  {id:'c06',cat:'agence_pub',name:'Sid Lee Paris',contact:'Production',phone:'01 55 28 00 00',email:'paris@sidlee.com',site:'sidlee.com',taille:'100+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:800,type:'Catering events créatifs',pitch:'Agence créative internationale. Clients premium (Adidas, Red Bull...). Events réguliers.',status:'to_contact',score:8,contacted:false},
  {id:'c07',cat:'agence_pub',name:'Fred & Farid',contact:'Production Manager',phone:'01 43 42 58 50',email:'contact@fredfarid.com',site:'fredfarid.com',taille:'50-100',arrondissement:'Paris 11e',valeur_event:2000,valeur_mois:600,type:'Catering shoots et events',pitch:'Agence créative indépendante primée. Shootings et présentations fréquentes. Clients luxe = budget traiteur élevé.',status:'to_contact',score:8,contacted:false},
  {id:'c08',cat:'agence_pub',name:'DDB Paris',contact:'Office Manager',phone:'01 43 43 90 00',email:'ddb@ddb.fr',site:'ddb.fr',taille:'200+',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:1000,type:'Plateaux + catering',pitch:'Grande agence réseau. Réunions clients et créatives quotidiennes. Budget traiteur conséquent.',status:'to_contact',score:8,contacted:false},
  {id:'c09',cat:'agence_pub',name:'TBWA Paris',contact:'Facilities',phone:'01 41 09 34 00',email:'contact@tbwa.fr',site:'tbwa.fr',taille:'300+',arrondissement:'Paris 15e',valeur_event:3500,valeur_mois:1100,type:'Plateaux + events',pitch:'Réseau international. Nombreuses présentations clients. Budget food important.',status:'to_contact',score:8,contacted:false},
  {id:'c10',cat:'agence_pub',name:'Leo Burnett Paris',contact:'Office Manager',phone:'01 43 19 20 00',email:'contact@leoburnett.fr',site:'leoburnett.fr',taille:'200+',arrondissement:'Paris 15e',valeur_event:2500,valeur_mois:900,type:'Plateaux + events clients',pitch:'Réseau Publicis. Events créatifs fréquents. Clients grands comptes = budget traiteur.',status:'to_contact',score:7,contacted:false},

  // HÔTELS
  {id:'h01',cat:'hotel',name:'Hôtel Lutetia',contact:'Directeur F&B',phone:'01 45 44 38 10',email:'lutetia@hotellutetia.com',site:'hotellutetia.com',taille:'200+',arrondissement:'Paris 6e',valeur_event:3000,valeur_mois:0,type:'Catering events VIP',pitch:'Palace 5 étoiles dans TON arrondissement ! Events VIP permanents. Proposer Meshuga pour déjeuners entre meetings au Lutetia.',status:'to_contact',score:10,contacted:false},
  {id:'h02',cat:'hotel',name:'Hôtel Bel Ami',contact:'Concierge chef',phone:'01 42 61 53 53',email:'reservation@hotel-bel-ami.com',site:'hotel-bel-ami.com',taille:'50-100',arrondissement:'Paris 6e',valeur_event:1000,valeur_mois:400,type:'Recommandation clients',pitch:'Hôtel boutique chic rue Saint-Benoît Paris 6e. Clientèle business/créative. Concierge peut recommander Meshuga.',status:'to_contact',score:9,contacted:false},
  {id:'h03',cat:'hotel',name:"Hôtel d'Aubusson",contact:'Concierge chef',phone:'01 43 29 43 43',email:'reservation@hoteldaubusson.com',site:'hoteldaubusson.com',taille:'30-50',arrondissement:'Paris 6e',valeur_event:800,valeur_mois:300,type:'Recommandation + catering',pitch:'Hôtel 5 étoiles rue Dauphine Paris 6e. Clientèle internationale. Partenariat concierge très intéressant.',status:'to_contact',score:9,contacted:false},
  {id:'h04',cat:'hotel',name:'La Villa Saint-Germain',contact:'Direction',phone:'01 43 26 60 00',email:'contact@villa-saintgermain.com',site:'villa-saintgermain.com',taille:'20-50',arrondissement:'Paris 6e',valeur_event:700,valeur_mois:300,type:'Recommandation',pitch:'Boutique hôtel Paris 6e. Clientèle affaires. Concierge = prescripteur clé.',status:'to_contact',score:8,contacted:false},
  {id:'h05',cat:'hotel',name:'Hôtel Montalembert',contact:'Concierge',phone:'01 45 49 68 68',email:'welcome@montalembert.com',site:'montalembert.com',taille:'50-100',arrondissement:'Paris 7e',valeur_event:900,valeur_mois:350,type:'Recommandation + events',pitch:'Hôtel design Paris 7e. Clientèle créative et business. Proposer Meshuga comme partenaire déjeuner.',status:'to_contact',score:7,contacted:false},
  {id:'h06',cat:'hotel',name:'Le Relais Christine',contact:'Directeur',phone:'01 40 51 60 80',email:'contact@relais-christine.com',site:'relais-christine.com',taille:'30-50',arrondissement:'Paris 6e',valeur_event:600,valeur_mois:200,type:'Recommandation',pitch:'Hôtel de charme Paris 6e. Clientèle luxe. Le concierge recommande les bonnes adresses du quartier.',status:'to_contact',score:8,contacted:false},
  {id:'h07',cat:'hotel',name:'Hôtel Madison',contact:'Direction',phone:'01 40 51 60 00',email:'resa@hotel-madison.com',site:'hotel-madison.com',taille:'20-50',arrondissement:'Paris 6e',valeur_event:500,valeur_mois:200,type:'Recommandation',pitch:'Hôtel vue Saint-Germain. Clients fidèles. Carte des bonnes adresses du quartier distribuée.',status:'to_contact',score:7,contacted:false},
  {id:'h08',cat:'hotel',name:'Hôtel de Fleurie',contact:'Propriétaire',phone:'01 53 73 70 00',email:'bonjour@hotel-de-fleurie.tm.fr',site:'hotel-de-fleurie.tm.fr',taille:'5-20',arrondissement:'Paris 6e',valeur_event:300,valeur_mois:100,type:'Recommandation',pitch:'Hôtel familial Paris 6e. Propriétaire très impliqué. Recommande les adresses locales à ses clients.',status:'to_contact',score:6,contacted:false},

  // IMMOBILIER
  {id:'i01',cat:'immo',name:'Nexity',contact:'Direction communication',phone:'01 71 12 12 12',email:'contact@nexity.fr',site:'nexity.fr',taille:'1000+',arrondissement:'Paris 15e',valeur_event:3000,valeur_mois:0,type:'Catering inaugurations',pitch:'Leader immobilier France. Inaugurations programmes régulières à Paris. Énorme cible catering standing.',status:'to_contact',score:8,contacted:false},
  {id:'i02',cat:'immo',name:'Kaufman & Broad',contact:'Direction marketing',phone:'01 41 43 44 73',email:'contact@ketb.com',site:'kaufmanandbroad.fr',taille:'500+',arrondissement:'Paris 7e',valeur_event:2500,valeur_mois:0,type:'Catering inaugurations',pitch:'Promoteur premium. Lancements programmes = cocktails et events standing. Fort potentiel catering luxe.',status:'to_contact',score:8,contacted:false},
  {id:'i03',cat:'immo',name:'BNP Paribas Real Estate',contact:'Facilities Manager',phone:'01 55 65 20 04',email:'contact@realestate.bnpparibas.com',site:'realestate.bnpparibas.com',taille:'500+',arrondissement:'Paris 15e',valeur_event:2000,valeur_mois:800,type:'Plateaux déjeuner + events',pitch:'Branche immo BNP. Nombreuses réunions négociation avec déjeuner. Plateaux réguliers.',status:'to_contact',score:7,contacted:false},
  {id:'i04',cat:'immo',name:'Savills France',contact:'Office Manager',phone:'01 44 51 17 17',email:'paris@savills.com',site:'savills.fr',taille:'100+',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:600,type:'Plateaux déjeuner',pitch:'Agence immobilier luxe internationale. Déjeuners clients fréquents. Standing élevé = Meshuga parfait.',status:'to_contact',score:8,contacted:false},
  {id:'i05',cat:'immo',name:'Knight Frank Paris',contact:'Direction',phone:'01 43 16 55 55',email:'paris@knightfrank.com',site:'knightfrank.fr',taille:'100+',arrondissement:'Paris 8e',valeur_event:1500,valeur_mois:600,type:'Plateaux déjeuner',pitch:'Agence immo luxe UK. Clients fortune. Déjeuners avec investisseurs réguliers.',status:'to_contact',score:8,contacted:false},
  {id:'i06',cat:'immo',name:'CBRE France',contact:'Facilities',phone:'01 53 64 36 36',email:'paris@cbre.com',site:'cbre.fr',taille:'500+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Plateaux + events',pitch:'Leader mondial conseil immobilier. Bureau Paris important. Budget food conséquent.',status:'to_contact',score:7,contacted:false},
  {id:'i07',cat:'immo',name:'Altarea Cogedim',contact:'Direction communication',phone:'01 56 26 10 10',email:'contact@altarea.fr',site:'altarea.fr',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:0,type:'Catering inaugurations',pitch:'Grand promoteur mixte. Inaugurations régulières programmes Paris. Budget catering important.',status:'to_contact',score:7,contacted:false},

  // MÉDICAL / SANTÉ
  {id:'m01',cat:'medical',name:'Institut Curie',contact:'Services hôteliers',phone:'01 56 24 55 55',email:'direction@curie.fr',site:'curie.fr',taille:'1000+',arrondissement:'Paris 5e',valeur_event:2000,valeur_mois:1000,type:'Plateaux + events scientifiques',pitch:'Institut recherche et soins de référence mondiale. Events scientifiques fréquents. Traiteur pour séminaires et symposiums.',status:'to_contact',score:7,contacted:false},
  {id:'m02',cat:'medical',name:'AP-HP Paris',contact:'Services logistiques',phone:'01 40 27 30 00',email:'direction.generale@aphp.fr',site:'aphp.fr',taille:'1000+',arrondissement:'Paris 6e',valeur_event:1500,valeur_mois:500,type:'Catering conférences médicales',pitch:'Premier hôpital européen. Conférences médicales régulières. Traiteur pour réunions de service et symposiums.',status:'to_contact',score:6,contacted:false},
  {id:'m03',cat:'medical',name:'Clinique Saint-Jean de Dieu',contact:'Direction administrative',phone:'01 44 39 40 00',email:'contact@sjdd.fr',site:'sjdd.fr',taille:'200+',arrondissement:'Paris 7e',valeur_event:1000,valeur_mois:600,type:'Plateaux déjeuner staff',pitch:'Clinique privée Paris 7e. Équipes médicales nombreuses. Livraison plateaux déjeuner pour le staff médical.',status:'to_contact',score:7,contacted:false},
  {id:'m04',cat:'medical',name:'Centre Médical Velpeau',contact:'Directeur médical',phone:'01 45 44 79 00',email:'contact@velpeau.fr',site:'—',taille:'10-30',arrondissement:'Paris 6e',valeur_event:400,valeur_mois:200,type:'Plateaux déjeuner',pitch:'Centre médical Paris 6e, ton arrondissement. Équipe médicale qui déjeune sur place. Livraison facile.',status:'to_contact',score:7,contacted:false},
  {id:'m05',cat:'medical',name:'Dentistes du Marais',contact:'Gestionnaire cabinet',phone:'01 48 87 65 43',email:'contact@dentistesdumarais.fr',site:'—',taille:'5-15',arrondissement:'Paris 3e',valeur_event:200,valeur_mois:150,type:'Plateaux déjeuner',pitch:'Cabinet dentaire multi-praticiens. Déjeuners rapides entre consultations. Commande régulière facile.',status:'to_contact',score:5,contacted:false},
  {id:'m06',cat:'medical',name:'Hôpital Laennec APHP',contact:'Restauration',phone:'01 44 39 60 00',email:'restauration.laennec@aphp.fr',site:'aphp.fr',taille:'500+',arrondissement:'Paris 7e',valeur_event:1000,valeur_mois:400,type:'Catering conférences',pitch:'Hôpital Paris 7e. Conférences médicales régulières. Proposer traiteur pour journées de formation staff.',status:'to_contact',score:6,contacted:false},

  // PRODUCTIONS / TOURNAGES
  {id:'p01',cat:'production',name:'Pathé Films',contact:'Production Manager',phone:'01 71 72 30 00',email:'contact@pathe.com',site:'pathe.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Catering tournages',pitch:'Géant cinéma français. Tournages permanents à Paris. Traiteur sur plateau = budget important. Via production manager.',status:'to_contact',score:9,contacted:false},
  {id:'p02',cat:'production',name:'Quad Production',contact:'Prod Executive',phone:'01 56 26 88 00',email:'quad@quadproduction.fr',site:'quadproduction.fr',taille:'50-100',arrondissement:'Paris 11e',valeur_event:2000,valeur_mois:0,type:'Catering tournages pub',pitch:'Maison production pub et clips premium. Tournages fréquents = traiteur régulier. Proposer partenaire.',status:'to_contact',score:8,contacted:false},
  {id:'p03',cat:'production',name:'La Pac',contact:'Production Executive',phone:'01 42 36 36 36',email:'contact@lapac.fr',site:'lapac.fr',taille:'20-50',arrondissement:'Paris 3e',valeur_event:1500,valeur_mois:0,type:'Catering tournages',pitch:'Prod documentaires et fictions. Équipes de tournage = besoin traiteur quotidien sur Paris.',status:'to_contact',score:7,contacted:false},
  {id:'p04',cat:'production',name:'Calt Production',contact:'Direction',phone:'01 40 00 00 00',email:'contact@calt.fr',site:'calt.fr',taille:'10-30',arrondissement:'Paris 11e',valeur_event:1200,valeur_mois:0,type:'Catering tournages',pitch:'Prod audiovisuelle. Tournages réguliers Paris. Traiteur plateau recherché en permanence.',status:'to_contact',score:7,contacted:false},
  {id:'p05',cat:'production',name:'Les Films du Poisson',contact:'Production',phone:'01 43 57 01 23',email:'contact@filmsdupoisson.com',site:'filmsdupoisson.com',taille:'5-20',arrondissement:'Paris 19e',valeur_event:800,valeur_mois:0,type:'Catering tournages',pitch:'Société prod cinéma auteur. Tournages réguliers. Traiteur plateau apprécié.',status:'to_contact',score:6,contacted:false},
  {id:'p06',cat:'production',name:'Troisième Oeil Productions',contact:'Direction',phone:'01 42 00 00 00',email:'contact@troisiemeoeil.fr',site:'troisiemeoeil.fr',taille:'10-20',arrondissement:'Paris 18e',valeur_event:800,valeur_mois:0,type:'Catering tournages',pitch:'Prod documentaires sociaux. Tournages fréquents. Traiteur récurrent recherché.',status:'to_contact',score:6,contacted:false},

  // GRANDES ÉCOLES / UNIVERSITÉS
  {id:'u01',cat:'ecole',name:'Sciences Po Paris',contact:'Direction événements',phone:'01 45 49 50 50',email:'events@sciencespo.fr',site:'sciencespo.fr',taille:'1000+',arrondissement:'Paris 7e',valeur_event:3000,valeur_mois:0,type:'Catering conférences + events',pitch:'2 minutes de Meshuga ! Conférences, inaugurations, events étudiants permanents. Argument proximité très fort.',status:'to_contact',score:10,contacted:false},
  {id:'u02',cat:'ecole',name:'INSEAD Paris',contact:'Events Coordinator',phone:'01 60 72 40 00',email:'paris@insead.edu',site:'insead.edu',taille:'200+',arrondissement:'Paris 8e',valeur_event:4000,valeur_mois:0,type:'Catering MBA events',pitch:'Meilleure business school Europe. Campus Paris. Events réguliers avec alumni et grandes entreprises. Budget élevé.',status:'to_contact',score:9,contacted:false},
  {id:'u03',cat:'ecole',name:'ESCP Business School',contact:'Events Manager',phone:'01 49 23 20 00',email:'events@escp.eu',site:'escp.eu',taille:'500+',arrondissement:'Paris 11e',valeur_event:2500,valeur_mois:0,type:'Catering events corporate',pitch:'Grande école de commerce. Nombreux events corporate et galas étudiants. Fort potentiel catering.',status:'to_contact',score:8,contacted:false},
  {id:'u04',cat:'ecole',name:'Paris Dauphine PSL',contact:'Service événements',phone:'01 44 05 44 05',email:'evenements@dauphine.fr',site:'dauphine.fr',taille:'1000+',arrondissement:'Paris 16e',valeur_event:2000,valeur_mois:0,type:'Catering conférences',pitch:'Université de référence gestion-économie. Colloques et events nombreux. Traiteur pour pauses déjeuner.',status:'to_contact',score:7,contacted:false},
  {id:'u05',cat:'ecole',name:'HEC Paris',contact:'Events Office',phone:'01 39 67 70 00',email:'evenements@hec.fr',site:'hec.fr',taille:'1000+',arrondissement:'Jouy-en-Josas',valeur_event:5000,valeur_mois:0,type:'Catering grands events',pitch:'Meilleure business school France. Cérémonies, galas, events alumni à Paris. Budget catering très élevé.',status:'to_contact',score:9,contacted:false},
  {id:'u06',cat:'ecole',name:'ESSEC Business School',contact:'Events',phone:'01 34 43 30 00',email:'events@essec.edu',site:'essec.edu',taille:'500+',arrondissement:'Cergy (Paris events)',valeur_event:3000,valeur_mois:0,type:'Catering events Paris',pitch:'Top école de commerce. Events à Paris réguliers. Budget traiteur élevé pour alumni et entreprises.',status:'to_contact',score:8,contacted:false},
  {id:'u07',cat:'ecole',name:'École Polytechnique Paris',contact:'Direction événements',phone:'01 69 33 30 00',email:'evenements@polytechnique.edu',site:'polytechnique.edu',taille:'1000+',arrondissement:'Paris events',valeur_event:3000,valeur_mois:0,type:'Catering cérémonies',pitch:'Grande école ingénieurs élite. Cérémonies et events Paris réguliers. Standing élevé.',status:'to_contact',score:8,contacted:false},
  {id:'u08',cat:'ecole',name:'SciencesPo exec ed',contact:'Direction executive',phone:'01 45 49 50 50',email:'execed@sciencespo.fr',site:'sciencespo.fr',taille:'500+',arrondissement:'Paris 7e',valeur_event:2500,valeur_mois:0,type:'Catering formations',pitch:'Executive education Sciences Po. Formations courtes cadres supérieurs. Traiteur déjeuner pour séminaires.',status:'to_contact',score:9,contacted:false},

  // INSTITUTIONS
  {id:'inst01',cat:'institution',name:'Mairie Paris 6e',contact:'Protocole',phone:'01 40 46 40 46',email:'mairie06@paris.fr',site:'mairie06.paris.fr',taille:'100+',arrondissement:'Paris 6e',valeur_event:1000,valeur_mois:300,type:'Catering cérémonies',pitch:'Ta mairie ! Cérémonies officielles, vœux, réceptions. Argument proximité et fierté locale très fort. Partenaire quartier.',status:'to_contact',score:10,contacted:false},
  {id:'inst02',cat:'institution',name:'Sénat',contact:'Services intendance',phone:'01 42 34 20 00',email:'contact@senat.fr',site:'senat.fr',taille:'1000+',arrondissement:'Paris 6e',valeur_event:3000,valeur_mois:0,type:'Catering réceptions officielles',pitch:'5 minutes de Meshuga. Réceptions officielles permanentes. Prestige et proximité = argument imparable.',status:'to_contact',score:8,contacted:false},
  {id:'inst03',cat:'institution',name:'Assemblée Nationale',contact:'Services généraux',phone:'01 40 63 60 00',email:'contact@assemblee-nationale.fr',site:'assemblee-nationale.fr',taille:'1000+',arrondissement:'Paris 7e',valeur_event:4000,valeur_mois:0,type:'Catering événements parlementaires',pitch:'Événements parlementaires réguliers. Proposer Meshuga pour déjeuners de travail et réceptions.',status:'to_contact',score:7,contacted:false},
  {id:'inst04',cat:'institution',name:'Ministère de la Culture',contact:'Services généraux',phone:'01 40 15 80 00',email:'contact@culture.gouv.fr',site:'culture.gouv.fr',taille:'1000+',arrondissement:'Paris 1er',valeur_event:2000,valeur_mois:0,type:'Catering événements culturels',pitch:'Nombreux vernissages et événements culturels organisés par le ministère. Budget traiteur récurrent.',status:'to_contact',score:6,contacted:false},
  {id:'inst05',cat:'institution',name:'Musée d\'Orsay',contact:'Direction événements',phone:'01 40 49 48 14',email:'evenements@musee-orsay.fr',site:'musee-orsay.fr',taille:'500+',arrondissement:'Paris 7e',valeur_event:3000,valeur_mois:0,type:'Catering vernissages et privatisations',pitch:'Musée iconique Paris. Privatisations pour events corporates fréquentes. Traiteur partenaire très lucratif.',status:'to_contact',score:8,contacted:false},
  {id:'inst06',cat:'institution',name:'Centre Pompidou',contact:'Direction mécénat',phone:'01 44 78 12 33',email:'mecenat@centrepompidou.fr',site:'centrepompidou.fr',taille:'500+',arrondissement:'Paris 4e',valeur_event:3500,valeur_mois:0,type:'Catering vernissages',pitch:'Centre culturel international. Vernissages et events corporate réguliers. Partenaire traiteur recherché.',status:'to_contact',score:8,contacted:false},
  {id:'inst07',cat:'institution',name:'Fondation Louis Vuitton',contact:'Events Manager',phone:'01 40 69 96 00',email:'fondation@louisvuitton.com',site:'fondationlouisvuitton.fr',taille:'200+',arrondissement:'Paris 16e',valeur_event:5000,valeur_mois:0,type:'Catering events VIP',pitch:'Fondation culturelle luxe. Events VIP et vernissages réguliers. Budget traiteur très élevé.',status:'to_contact',score:9,contacted:false},

  // LUXURY & LIFESTYLE
  {id:'l01',cat:'luxe',name:'Galeries Lafayette Haussmann',contact:'Direction Events',phone:'01 42 82 34 56',email:'events@galerieslafayette.com',site:'galerieslafayette.com',taille:'1000+',arrondissement:'Paris 9e',valeur_event:4000,valeur_mois:0,type:'Catering events retail',pitch:'Flagship mondial. Événements VIP et lancements produits permanents. Budget traiteur très important.',status:'to_contact',score:8,contacted:false},
  {id:'l02',cat:'luxe',name:'Chanel (Siege Paris)',contact:'Events Internals',phone:'01 55 35 33 00',email:'events@chanel.com',site:'chanel.com',taille:'1000+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering events internes',pitch:'Maison luxe iconique. Events internes très fréquents. Budget traiteur élevé pour standing de la marque.',status:'to_contact',score:8,contacted:false},
  {id:'l03',cat:'luxe',name:'Dior (Siege)',contact:'Direction events',phone:'01 40 73 54 44',email:'events@dior.com',site:'dior.com',taille:'1000+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering events luxe',pitch:'Maison haute couture. Showrooms, présentations, events internes permanents. Budget premium.',status:'to_contact',score:7,contacted:false},
  {id:'l04',cat:'luxe',name:'Yves Saint Laurent (Kering)',contact:'Events',phone:'01 42 36 22 22',email:'events@ysl.com',site:'ysl.com',taille:'500+',arrondissement:'Paris 6e',valeur_event:4000,valeur_mois:0,type:'Catering events mode',pitch:'Maison mode iconique dans TON arrondissement. Events mode et internes réguliers. Budget élevé.',status:'to_contact',score:9,contacted:false},
  {id:'l05',cat:'luxe',name:'Cartier (Richemont)',contact:'Events internes',phone:'01 42 18 53 70',email:'events@cartier.com',site:'cartier.com',taille:'500+',arrondissement:'Paris 8e',valeur_event:5000,valeur_mois:0,type:'Catering events VIP',pitch:'Joaillier de référence mondiale. Présentations collections et events clients très fréquents.',status:'to_contact',score:7,contacted:false},

  // TECH / MÉDIAS
  {id:'t01',cat:'tech',name:'Google France',contact:'Workplace Manager',phone:'01 42 68 53 00',email:'paris@google.com',site:'google.fr',taille:'500+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Catering + plateaux',pitch:'Bureau parisien Google. Culture food américaine très forte. Budget food et events très élevé.',status:'to_contact',score:9,contacted:false},
  {id:'t02',cat:'tech',name:'Meta France',contact:'Office Experience',phone:'01 56 25 50 00',email:'paris@meta.com',site:'meta.com',taille:'300+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1500,type:'Catering + plateaux',pitch:'Bureau Meta Paris. Culture américaine = sandwichs premium au bureau. Budget très élevé.',status:'to_contact',score:9,contacted:false},
  {id:'t03',cat:'tech',name:'Spotify France',contact:'Workplace',phone:'—',email:'paris@spotify.com',site:'spotify.com',taille:'200+',arrondissement:'Paris 9e',valeur_event:2000,valeur_mois:1000,type:'Plateaux + events',pitch:'Bureau parisien. Culture déjeuner ensemble forte. Budget food élevé pour attractivité talents.',status:'to_contact',score:8,contacted:false},
  {id:'t04',cat:'tech',name:'Airbnb France',contact:'Office Manager',phone:'—',email:'paris@airbnb.com',site:'airbnb.fr',taille:'200+',arrondissement:'Paris 2e',valeur_event:2000,valeur_mois:1000,type:'Plateaux + catering',pitch:'Bureau parisien Airbnb. Culture hospitality = apprécie qualité traiteur. Budget food généreux.',status:'to_contact',score:8,contacted:false},
  {id:'t05',cat:'tech',name:'LinkedIn France',contact:'Workplace',phone:'01 55 38 38 38',email:'paris@linkedin.com',site:'linkedin.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:1800,valeur_mois:900,type:'Plateaux déjeuner',pitch:'Bureau LinkedIn Paris. Culture américaine. Budget food important.',status:'to_contact',score:7,contacted:false},
  {id:'t06',cat:'tech',name:'Criteo',contact:'Facilities',phone:'01 44 89 90 00',email:'contact@criteo.com',site:'criteo.com',taille:'500+',arrondissement:'Paris 9e',valeur_event:2500,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Scale-up tech internationale. Bureau Paris très actif. Culture food déjeuner ensemble.',status:'to_contact',score:8,contacted:false},
  {id:'t07',cat:'tech',name:'Vente Privée (Veepee)',contact:'Office Manager',phone:'01 76 49 48 00',email:'contact@veepee.fr',site:'veepee.fr',taille:'1000+',arrondissement:'Saint-Denis',valeur_event:2000,valeur_mois:0,type:'Catering events internes',pitch:'Géant e-commerce. Events internes fréquents. Budget traiteur pour 1000+ employés.',status:'to_contact',score:7,contacted:false},
  {id:'t08',cat:'tech',name:'BlaBlaCar',contact:'Workplace',phone:'—',email:'hello@blablacar.com',site:'blablacar.com',taille:'500+',arrondissement:'Paris 2e',valeur_event:2500,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Licorne transport. Équipes importantes Paris. Culture startup = déjeuners ensemble récurrents.',status:'to_contact',score:8,contacted:false},

  // CONSEIL / FINANCE
  {id:'f01',cat:'conseil',name:'McKinsey Paris',contact:'Office Manager',phone:'01 40 69 16 00',email:'paris@mckinsey.com',site:'mckinsey.com',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Top cabinet conseil mondial. Déjeuners de travail quotidiens avec clients. Budget traiteur très élevé.',status:'to_contact',score:10,contacted:false},
  {id:'f02',cat:'conseil',name:'BCG Paris',contact:'Facilities',phone:'01 40 74 45 00',email:'paris@bcg.com',site:'bcg.com',taille:'500+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1500,type:'Plateaux déjeuner',pitch:'Top 3 cabinet conseil. Culture du travail intense = déjeuners au bureau quotidiens. Budget traiteur.',status:'to_contact',score:10,contacted:false},
  {id:'f03',cat:'conseil',name:'Bain & Company Paris',contact:'Office Manager',phone:'01 56 43 04 00',email:'paris@bain.com',site:'bain.com',taille:'300+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Top 3 conseil. Équipes sur projets = déjeuners livrés réguliers. Budget élevé.',status:'to_contact',score:9,contacted:false},
  {id:'f04',cat:'conseil',name:'Roland Berger Paris',contact:'Administration',phone:'01 53 67 03 00',email:'paris@rolandberger.com',site:'rolandberger.com',taille:'300+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:900,type:'Plateaux déjeuner',pitch:'Cabinet conseil européen de référence. Réunions clients et déjeuners de travail réguliers.',status:'to_contact',score:8,contacted:false},
  {id:'f05',cat:'conseil',name:'Oliver Wyman Paris',contact:'Office Manager',phone:'01 45 02 30 00',email:'paris@oliverwyman.com',site:'oliverwyman.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:800,type:'Plateaux déjeuner',pitch:'Cabinet spécialisé finance-assurance. Nombreux déjeuners de travail. Budget traiteur important.',status:'to_contact',score:8,contacted:false},
  {id:'f06',cat:'conseil',name:'Deloitte Paris',contact:'Facilities Manager',phone:'01 40 88 28 00',email:'paris@deloitte.fr',site:'deloitte.fr',taille:'1000+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:2000,type:'Plateaux + events',pitch:'Big 4. Bureau Paris monumental. Budget food et events très élevé. Volume immense.',status:'to_contact',score:9,contacted:false},
  {id:'f07',cat:'conseil',name:'PwC France',contact:'Facilities',phone:'01 56 57 58 59',email:'paris@pwc.com',site:'pwc.fr',taille:'1000+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:2000,type:'Plateaux + events',pitch:'Big 4. Équipes très nombreuses. Budget food récurrent important.',status:'to_contact',score:9,contacted:false},
  {id:'f08',cat:'conseil',name:'KPMG France',contact:'Office Manager',phone:'01 55 68 68 68',email:'paris@kpmg.fr',site:'kpmg.fr',taille:'1000+',arrondissement:'Paris 15e',valeur_event:2500,valeur_mois:1500,type:'Plateaux + events',pitch:'Big 4. Nombreuses réunions clients avec déjeuner. Budget traiteur conséquent.',status:'to_contact',score:9,contacted:false},

  // MÉDIAS / PRESSE
  {id:'med01',cat:'medias',name:'Le Monde (groupe)',contact:'Direction événements',phone:'01 57 28 20 00',email:'evenements@lemonde.fr',site:'lemonde.fr',taille:'500+',arrondissement:'Paris 13e',valeur_event:2000,valeur_mois:0,type:'Catering conférences',pitch:'Groupe médias référence. Conférences "Le Monde" régulières. Traiteur pour déjeuners-débats.',status:'to_contact',score:7,contacted:false},
  {id:'med02',cat:'medias',name:'Les Echos (LVMH)',contact:'Events',phone:'01 49 53 65 65',email:'events@lesechos.fr',site:'lesechos.fr',taille:'300+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:0,type:'Catering conférences business',pitch:'Journal référence business. Conférences sectorielles régulières. Budget traiteur pour speakers.',status:'to_contact',score:7,contacted:false},
  {id:'med03',cat:'medias',name:'France Télévisions',contact:'Services intendance',phone:'01 56 22 60 00',email:'siege@francetv.fr',site:'francetelevisions.fr',taille:'1000+',arrondissement:'Paris 15e',valeur_event:2000,valeur_mois:800,type:'Catering tournages + events',pitch:'Audiovisuel public. Tournages et events réguliers. Traiteur plateau récurrent.',status:'to_contact',score:7,contacted:false},

  // ESPACES DE COWORKING
  {id:'co01',cat:'coworking',name:'Station F',contact:'Community Manager',phone:'—',email:'business@stationf.co',site:'stationf.co',taille:'1000+',arrondissement:'Paris 13e',valeur_event:2000,valeur_mois:1500,type:'Catering events + déjeuners',pitch:'Plus grand startup campus monde. Centaines de startups, events quotidiens. Traiteur officiel très lucratif.',status:'to_contact',score:10,contacted:false},
  {id:'co02',cat:'coworking',name:'WeWork Paris République',contact:'Community Manager',phone:'01 85 65 00 00',email:'paris@wework.com',site:'wework.com',taille:'500+',arrondissement:'Paris 10e',valeur_event:1500,valeur_mois:800,type:'Catering events membres',pitch:'Coworking premium. Events membres fréquents. Traiteur partenaire pour after-works et déjeuners.',status:'to_contact',score:7,contacted:false},
  {id:'co03',cat:'coworking',name:'Morning Coworking Paris',contact:'Direction',phone:'01 85 53 00 00',email:'contact@morning.paris',site:'morning.paris',taille:'200+',arrondissement:'Paris 9e',valeur_event:1000,valeur_mois:500,type:'Catering events membres',pitch:'Réseau coworking parisien premium. Breakfasts et déjeuners networking réguliers.',status:'to_contact',score:7,contacted:false},
  {id:'co04',cat:'coworking',name:'Kwerk Paris',contact:'Hospitality Manager',phone:'01 43 00 00 00',email:'contact@kwerk.fr',site:'kwerk.fr',taille:'200+',arrondissement:'Paris 8e',valeur_event:1200,valeur_mois:600,type:'Catering events premium',pitch:'Coworking luxe Paris. Clientèle dirigeants et professions libérales. Budget traiteur élevé.',status:'to_contact',score:8,contacted:false},
  {id:'co05',cat:'coworking',name:'Wojo by Accor',contact:'Manager',phone:'01 77 40 00 00',email:'paris@wojo.com',site:'wojo.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:1000,valeur_mois:500,type:'Catering events',pitch:'Coworking groupe Accor. Réseau important. Events professionnels réguliers.',status:'to_contact',score:6,contacted:false},

  // BANQUES / ASSURANCES
  {id:'b01',cat:'banque',name:'BNP Paribas Siege',contact:'Facilities Director',phone:'01 40 14 45 46',email:'contact@bnpparibas.com',site:'bnpparibas.com',taille:'1000+',arrondissement:'Paris 9e',valeur_event:3000,valeur_mois:2000,type:'Catering + plateaux',pitch:'Première banque zone euro. Bureau Paris immense. Budget food et events très élevé. Via facilities.',status:'to_contact',score:8,contacted:false},
  {id:'b02',cat:'banque',name:'Société Générale',contact:'Facilities',phone:'01 42 14 20 00',email:'contact@socgen.com',site:'societegenerale.com',taille:'1000+',arrondissement:'Paris La Défense',valeur_event:3000,valeur_mois:0,type:'Catering events',pitch:'Grande banque française. Events corporate réguliers à Paris. Budget traiteur élevé.',status:'to_contact',score:7,contacted:false},
  {id:'b03',cat:'banque',name:'Rothschild & Co Paris',contact:'Office Manager',phone:'01 40 74 40 74',email:'paris@rothschild.com',site:'rothschild.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:3000,valeur_mois:1200,type:'Plateaux déjeuner',pitch:'Banque d\'affaires prestige. Réunions M&A et déjeuners clients permanents. Budget traiteur très élevé.',status:'to_contact',score:10,contacted:false},
  {id:'b04',cat:'banque',name:'Lazard Paris',contact:'Administration',phone:'01 44 13 01 11',email:'paris@lazard.com',site:'lazard.com',taille:'200+',arrondissement:'Paris 8e',valeur_event:2500,valeur_mois:1000,type:'Plateaux déjeuner',pitch:'Banque d\'affaires internationale. Deal flow intense = déjeuners de travail quotidiens.',status:'to_contact',score:9,contacted:false},
  {id:'b05',cat:'banque',name:'Axa France (Siege)',contact:'Facilities',phone:'01 40 75 57 57',email:'contact@axa.fr',site:'axa.fr',taille:'1000+',arrondissement:'Paris 8e',valeur_event:2000,valeur_mois:1000,type:'Catering events + plateaux',pitch:'Leader assurance. Nombreuses réunions et events internes. Budget traiteur conséquent.',status:'to_contact',score:7,contacted:false},
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const CATS_MAP:any = {
  all:{label:'Tous',emoji:'☰'},
  evenementiel:{label:'Événementiel',emoji:''},
  avocats:{label:'Avocats / Notaires',emoji:'⚖️'},
  startup:{label:'Startups',emoji:''},
  agence_pub:{label:'Agences créatives',emoji:''},
  hotel:{label:'Hôtels',emoji:''},
  immo:{label:'Immobilier',emoji:''},
  medical:{label:'Médical',emoji:''},
  production:{label:'Tournages',emoji:''},
  ecole:{label:'Écoles',emoji:''},
  institution:{label:'Institutions',emoji:'️'},
  luxe:{label:'Luxe & Mode',emoji:''},
  tech:{label:'Tech & Médias',emoji:''},
  conseil:{label:'Conseil & Finance',emoji:''},
  medias:{label:'Presse & Médias',emoji:''},
  coworking:{label:'Coworking',emoji:'️'},
  banque:{label:'Banques',emoji:''},
}
const STATUS_P:any = {to_contact:'À contacter',contacted:'Contacté',nego:'Négo',won:'Gagné ✓',lost:'Perdu'}
const STATUS_PC:any = {to_contact:'#888',contacted:'#B8920A',nego:'#005FFF',won:'#009D3A',lost:'#CC0066'}
const TASK_S:any = {todo:'À faire',in_progress:'En cours',done:'Terminé ✓'}
const CAT_ANN:any = {food:' Fournisseur food',banque:' Banque',presse:' Presse',prestataire:' Prestataire',partenaire:' Partenaire',livraison:' Livraison',fournisseur:' Fournisseur'}

const INIT_TASKS = [
  {id:1,title:'Créer le kit B2B (menu plateaux, tarifs)',assignee:'emy',deadline:'2026-03-28',status:'in_progress',priority:'high'},
  {id:2,title:'RDV Wagram Events — préparer la présentation',assignee:'emy',deadline:'2026-03-28',status:'todo',priority:'high'},
  {id:3,title:'Valider le menu B2B avec la cuisine',assignee:'edward',deadline:'2026-03-27',status:'todo',priority:'high'},
  {id:4,title:'Appeler 5 prospects aujourd\'hui',assignee:'emy',deadline:'2026-03-27',status:'todo',priority:'medium'},
]
const INIT_PROSPECTS = [
  {id:1,name:'Agence Wagram Events',email:'contact@wagram.fr',phone:'01 40 xx xx xx',size:'10-50',category:'Événementiel',status:'contacted',nextAction:'Envoyer devis',nextDate:'2026-03-25',notes:'Intéressée plateaux. Budget ~800-1200€/event.',score:8},
  {id:2,name:'Station F',email:'office@stationf.co',phone:'06 98 76 54 32',size:'200-1000',category:'Startup',status:'nego',nextAction:'Envoyer devis URGENT',nextDate:'2026-03-25',notes:'Commandes régulières équipes. URGENT.',score:9},
]
const INIT_CONTACTS = [
  {id:1,cat:'food',name:'Maison Vérot',contact:'—',phone:'01 45 44 01 66',email:'contact@maisonverot.fr',notes:'Livraison lun-ven',vip:false},
  {id:2,cat:'banque',name:'BNP Paribas Vavin',contact:'Marie Dupont',phone:'01 56 xx xx xx',email:'m.dupont@bnp.fr',notes:'Gestionnaire pro',vip:false},
  {id:3,cat:'presse',name:'Le Fooding',contact:'—',phone:'—',email:'press@lefooding.com',notes:'',vip:true},
  {id:4,cat:'prestataire',name:'Clean Express',contact:'—',phone:'06 12 34 56 78',email:'info@cleanexpress.fr',notes:'Mar + Ven',vip:false},
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

  // Chasse filters
  const [chasseCat, setChasseChasse] = useState('all')
  const [chasseSearch, setChasseSearch] = useState('')
  const [chasseSort, setChasseSort] = useState('score')
  const [chasseTaille, setChasseTable] = useState('all')
  const [chasseStatus, setChasseStatus2] = useState('all')
  const [showOnlyToContact, setShowOnlyToContact] = useState(false)

  // Email generation state
  const [generatingEmail, setGeneratingEmail] = useState(false)
  const [generatedEmail, setGeneratedEmail] = useState('')
  const [emailProspect, setEmailProspect] = useState<any>(null)

  useEffect(() => {
    const supabase = sb()
    async function loadProfile() {
      const { data: { user } } = await sb().auth.getUser()
      if (!user) return
      const { data: prof } = await sb().from('profiles').select('*').eq('id', user.id).single()
      if (prof && prof.role) { setProfile(prof) }
      else {
        const role = user.email?.includes('emy') ? 'emy' : 'edward'
        setProfile({ role, full_name: role==='emy'?'Emy':'Edward', email: user.email })
      }
    }
    loadProfile()
  }, [])

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2800) }
  const openModal = (id: string, data: any = {}) => { setForm(data); setModal(id) }
  const closeModal = () => { setModal(''); setForm({}) }
  const setPage2 = (p: string) => { setPage(p); setSidebarOpen(false) }

  const today = new Date().toISOString().split('T')[0]
  const isEmy = profile?.role === 'emy'
  const todayRelances = prospects.filter(p => p.nextDate <= today && !['won','lost'].includes(p.status))

  // Chasse filtered + sorted
  const chasseFiltered = useMemo(() => {
    let list = chasse
    if (chasseCat !== 'all') list = list.filter(p => p.cat === chasseCat)
    if (chasseSearch) list = list.filter(p => p.name.toLowerCase().includes(chasseSearch.toLowerCase()) || p.arrondissement.toLowerCase().includes(chasseSearch.toLowerCase()))
    if (chasseTaille !== 'all') list = list.filter(p => p.taille === chasseTaille)
    if (chasseStatus !== 'all') list = list.filter(p => p.status === chasseStatus)
    if (showOnlyToContact) list = list.filter(p => p.status === 'to_contact')
    list = [...list].sort((a,b) => {
      if (chasseSort === 'score') return b.score - a.score
      if (chasseSort === 'valeur') return (b.valeur_event + b.valeur_mois*12) - (a.valeur_event + a.valeur_mois*12)
      if (chasseSort === 'name') return a.name.localeCompare(b.name)
      return 0
    })
    return list
  }, [chasse, chasseCat, chasseSearch, chasseTaille, chasseStatus, showOnlyToContact, chasseSort])

  function contactProspect(id: string) {
    setChasse(prev => prev.map(p => p.id === id ? {...p, status:'contacted', contacted:true} : p))
    setContactedToday(c => c + 1)
    toast('✓ Prospect contacté ! Ajouté au CRM')
    const p = chasse.find(x => x.id === id)
    if (p) { logActivity('prospect_contacte',`${p.name} contacté et ajouté au CRM`,p.name) }
    const pIgnore = chasse.find(x => x.id === id)
    if (p) {
      setProspects(prev => [...prev, {id:Date.now(), name:p.name, email:p.email, phone:p.phone, size:p.taille, category:CATS_MAP[p.cat]?.label||p.cat, status:'contacted', nextAction:'Relancer', nextDate:'', notes:p.pitch, score:p.score}])
    }
  }

  async function generateEmail(p: any) {
    setEmailProspect(p)
    setGeneratingEmail(true)
    setGeneratedEmail('')
    openModal('email', p)
    try {
      const tone = p.cat === 'avocats' || p.cat === 'banque' || p.cat === 'conseil' ? 'professionnel et sérieux' :
                   p.cat === 'startup' || p.cat === 'tech' || p.cat === 'coworking' ? 'décontracté et direct' :
                   p.cat === 'luxe' ? 'raffiné et élégant' : 'chaleureux et professionnel'
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          messages:[{
            role:'user',
            content:`Tu es ${isEmy?'Emy, B2B Manager':'Edward, patron'} pour Meshuga Crazy Deli (Paris 6e, 3 rue Vavin). Restaurant new-yorkais premium : pastrami, lobster rolls, sandwichs gastronomiques. Spécialisés dans les plateaux déjeuner B2B et le catering événementiel sur tout Paris.

Écris un email de prise de contact pour ce prospect :
- Entreprise : ${p.name}
- Secteur : ${CATS_MAP[p.cat]?.label}
- Localisation : ${p.arrondissement}
- Taille : ${p.taille} employés
- Ce qu'on peut leur proposer : ${p.type}
- Angle d'approche : ${p.pitch}

Ton de l'email : ${tone}
Format : Objet sur la première ligne (prefixé par "Objet : "), puis le corps de l'email.
Sois concis (6-8 lignes max pour le corps), personnalisé, et termine par la signature d'Emy avec ses coordonnées.
Signature : ${isEmy?'Emy | B2B Manager | emy@meshuga.fr | +33 6 24 67 78 66':'Edward | Big Boss | edward@meshuga.fr | +33 6 58 58 58 01'} | 3 rue Vavin, Paris 6e`
          }]
        })
      })
      const data = await res.json()
      setGeneratedEmail(data.content?.[0]?.text || 'Erreur lors de la génération')
    } catch(e) {
      setGeneratedEmail('Erreur de connexion. Vérifie ta connexion internet.')
    }
    setGeneratingEmail(false)
  }

  useEffect(() => {
    if (!profile) return
    async function loadLog() {
      const { data } = await sb().from('activity_log').select('*').order('created_at',{ascending:false}).limit(200)
      if (data) setActivityLog(data)
    }
    loadLog()
    sb().from('activity_log').insert({user_role:profile.role,user_name:profile.full_name||profile.role,type:'session_start',description:'Connexion',prospect_name:null,email_content:null}).then(()=>{})
  }, [profile?.role])

  async function logActivity(type: string, description: string, prospectName?: string, emailContent?: string) {
    const entry = {user_role:profile?.role||'unknown',user_name:profile?.full_name||'?',type,description,prospect_name:prospectName||null,email_content:emailContent||null}
    await sb().from('activity_log').insert(entry)
    setActivityLog((prev:any[]) => [{...entry,id:Date.now(),created_at:new Date().toISOString()},...prev.slice(0,199)])
  }

  function saveTask() {
    if (!form.title) { toast('Titre requis !'); return }
    if (form.id) setTasks(prev => prev.map(t => t.id === form.id ? {...form} : t))
    else setTasks(prev => [...prev, {...form, id:Date.now(), status:'todo'}])
    closeModal(); toast('Tâche sauvegardée ✓')
  }

  function saveProspect() {
    if (!form.name) { toast('Nom requis !'); return }
    if (form.id) setProspects(prev => prev.map(p => p.id === form.id ? {...form} : p))
    else setProspects(prev => [...prev, {...form, id:Date.now(), status:'to_contact'}])
    closeModal(); toast('Prospect sauvegardé ✓')
  }

  function saveContact() {
    if (!form.name) { toast('Nom requis !'); return }
    if (form.id) setContacts(prev => prev.map(c => c.id === form.id ? {...form} : c))
    else setContacts(prev => [...prev, {...form, id:Date.now()}])
    closeModal(); toast('Contact sauvegardé ✓')
  }

  function saveVault() {
    if (!form.title) { toast('Nom requis !'); return }
    if (form.id) setVault(prev => prev.map(v => v.id === form.id ? {...form} : v))
    else setVault(prev => [...prev, {...form, id:Date.now()}])
    closeModal(); toast('Accès sauvegardé ')
  }

  function submitCR() {
    if (!form.week) { toast('Semaine requise !'); return }
    setReports(prev => [{...form, id:Date.now(), status:'submitted', date:new Date().toLocaleDateString('fr-FR')}, ...prev])
    closeModal(); toast('CR soumis à Edward ')
  }

  function addChasseManual() {
    if (!form.name) { toast('Nom requis !'); return }
    const newP = {
      id:`manual-${Date.now()}`,
      cat: form.cat || 'evenementiel',
      name: form.name,
      contact: form.contact || '—',
      phone: form.phone || '—',
      email: form.email || '—',
      site: form.site || '—',
      taille: form.taille || '—',
      arrondissement: form.arrondissement || 'Paris',
      valeur_event: parseInt(form.valeur_event)||0,
      valeur_mois: parseInt(form.valeur_mois)||0,
      linkedin: form.linkedin || '',
      type: form.type || '—',
      pitch: form.pitch || '',
      status: 'to_contact',
      score: parseInt(form.score)||5,
      contacted: false
    }
    setChasse(prev => [newP, ...prev])
    closeModal(); toast('Prospect ajouté au tableau de chasse ✓')
  }

  const NAV = [
    {id:'dash',label:'Dashboard',icon:'⚡'},
    {id:'chasse',label:'Tableau de chasse',icon:'', badge: contactedToday > 0 ? `${contactedToday}/5` : undefined},
    {id:'crm',label:'CRM Prospects',icon:'◎'},
    {id:'annuaire',label:'Annuaire',icon:''},
    {id:'tasks',label:'Tâches',icon:'✓'},
    {id:'reporting',label:'Reporting',icon:'', badge: !isEmy && reports.filter(r=>r.status==='submitted'&&!r.feedback).length > 0 ? reports.filter(r=>r.status==='submitted'&&!r.feedback).length : undefined},
    {id:'vault',label:'Coffre-fort',icon:''},
    {id:'gmb',label:'Google My Biz.',icon:'⭐'},
    {id:'journal',label:'Journal Emy',icon:'📓'},
  ]

  if (!profile) return (
    <><style>{G}</style>
    <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'#FFEB5A'}}>
      <div style={{textAlign:'center'}}><div style={{fontSize:48,marginBottom:12}}></div><div style={{fontWeight:900,fontSize:14,textTransform:'uppercase',letterSpacing:3}}>Chargement…</div></div>
    </div></>
  )

  return (
    <><style>{G}</style>
    <div className="shell">
      {/* MOBILE TOPBAR */}
      <div className="topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
        <span className="topbar-logo">meshuga</span>
        <span style={{fontFamily:"'Yellowtail',cursive",fontSize:13,color:'#FF82D7'}}>{isEmy ? 'Emy' : 'Edward'}</span>
      </div>

      {/* SIDEBAR OVERLAY MOBILE */}
      <div className={`sidebar-overlay${sidebarOpen?' open':''}`} onClick={() => setSidebarOpen(false)} />

      {/* SIDEBAR */}
      <div className={`sidebar${sidebarOpen?' open':''}`}>
        <div className="sb-logo">
          <div className="sb-stamp"></div>
          <div><div style={{fontWeight:900,fontSize:18,textTransform:'uppercase',letterSpacing:2,lineHeight:1}}>meshuga</div><div className="yt" style={{fontSize:12,opacity:.45}}>B2B Manager</div></div>
        </div>
        <nav className="sb-nav">
          <div className="sb-sec">Navigation</div>
          {NAV.map(n => (
            <div key={n.id} className={`ni${page===n.id?' active':''}`} onClick={() => setPage2(n.id)}>
              <span style={{fontSize:14}}>{n.icon}</span>{n.label}
              {n.badge && <span className="nb">{n.badge}</span>}
            </div>
          ))}
        </nav>
        <div style={{padding:'10px 12px 14px',borderTop:'3px solid #191923'}}>
          <div className="yt" style={{fontSize:11,opacity:.35,marginBottom:5}}>Connecté</div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:4,border:'2px solid #191923',background:isEmy?'#FF82D7':'#FFEB5A',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13}}>
              {profile.full_name?.[0]?.toUpperCase()||'?'}
            </div>
            <div>
              <div style={{fontWeight:900,fontSize:11,textTransform:'uppercase'}}>{profile.full_name||profile.email?.split('@')[0]}</div>
              <div className="yt" style={{fontSize:11,opacity:.4}}>{isEmy?'B2B Manager':'The Big Boss'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="strip" />

        {/* ══ DASHBOARD ══════════════════════════════════════════════════════ */}
        {page==='dash' && (
          <div>
            <div className="ph">
              <div><div className="pt">{isEmy ? 'Bonjour Emy ' : 'Bonjour Edward '}</div><div className="ps">{new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div></div>
              {isEmy && <button className="btn btn-n btn-sm" onClick={() => openModal('cr',{})}>+ Nouveau CR</button>}
            </div>

            {isEmy && (
              <div className="card-p" style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div className="ct" style={{margin:0}}> Objectif prospection du jour</div>
                  <button className="btn btn-n btn-sm" onClick={() => setPage2('chasse')}>Tableau de chasse →</button>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontWeight:900,fontSize:13}}>Prospects contactés aujourd'hui</span>
                  <span style={{fontWeight:900,fontSize:18,color:contactedToday>=5?'#009D3A':'#191923'}}>{contactedToday} / 5</span>
                </div>
                <div className="prog-wrap"><div className="prog-fill" style={{width:`${Math.min(contactedToday/5*100,100)}%`,background:contactedToday>=5?'#009D3A':'#191923'}} /></div>
                {contactedToday>=5 && <div style={{marginTop:8,fontWeight:900,fontSize:12,color:'#009D3A'}}> Objectif atteint ! Tu assures Emy !</div>}
              </div>
            )}

            {todayRelances.length > 0 && (
              <div className="card-p" style={{marginBottom:12}}>
                <div className="ct">⏰ Relances urgentes aujourd'hui</div>
                {todayRelances.map(p => (
                  <div key={p.id} className="al">
                    <span style={{fontSize:18}}></span>
                    <div style={{flex:1}}><div style={{fontWeight:900,fontSize:13}}>{p.name}</div><div style={{fontSize:10,opacity:.6}}>{p.nextAction}</div></div>
                    <span style={{fontSize:9,fontWeight:900,background:'#191923',color:'#FFEB5A',padding:'2px 7px',borderRadius:3}}>Urgent</span>
                  </div>
                ))}
              </div>
            )}

            <div className="g4">
              <div className="kc" style={{background:'#FFEB5A'}}><div className="kl">{isEmy ? 'Mes prospects' : 'Pipeline B2B'}</div><div className="kv">{prospects.filter(p=>!['won','lost'].includes(p.status)).length}</div><div className="ki"></div></div>
              <div className="kc" style={{background:'#FF82D7'}}><div className="kl">Chasse disponible</div><div className="kv">{chasse.filter(p=>p.status==='to_contact').length}</div><div className="ki"></div></div>
              <div className="kc" style={{background:'#FFFFFF'}}><div className="kl">Tâches actives</div><div className="kv">{tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).length}</div><div className="ki">✓</div></div>
              <div className="kc" style={{background:'#FFFFFF'}}><div className="kl">CRs soumis</div><div className="kv">{reports.length}</div><div className="ki"></div></div>
            </div>

            <div className="g2">
              <div className="card">
                <div className="ct">{isEmy ? 'Mes tâches' : 'Tâches équipe'}</div>
                {tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).slice(0,4).map(t => (
                  <div key={t.id} className="row" style={{gridTemplateColumns:'4px 1fr auto',gap:10}}>
                    <div className="pbar" style={{background:t.priority==='high'?'#FF82D7':'#005FFF'}} />
                    <div><div style={{fontSize:12,fontWeight:900}}>{t.title}</div><div style={{fontSize:10,opacity:.5}}> {t.deadline} · {t.assignee}</div></div>
                    <span className="badge" style={{color:t.status==='in_progress'?'#005FFF':'#888',borderColor:t.status==='in_progress'?'#005FFF':'#ccc'}}>{TASK_S[t.status]}</span>
                  </div>
                ))}
                <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={() => setPage2('tasks')}>Voir toutes →</button>
              </div>
              <div className="card">
                <div className="ct">{isEmy ? 'Mon pipeline' : 'Derniers prospects'}</div>
                {prospects.slice(0,4).map(p => (
                  <div key={p.id} className="row" style={{gridTemplateColumns:'1fr auto',gap:8}}>
                    <div><div style={{fontSize:12,fontWeight:900}}>{p.name}</div><div style={{fontSize:10,opacity:.5}}>{p.nextAction}</div></div>
                    <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                  </div>
                ))}
                <button className="btn btn-y btn-sm" style={{marginTop:10}} onClick={() => setPage2('crm')}>Voir le CRM →</button>
              </div>
            </div>

            {/* PLANNING SEMAINE */}
            <div className="card" style={{padding:0,overflow:'hidden',marginBottom:10}}>
              <div style={{background:'#191923',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
                <div className="yt" style={{color:'#FFEB5A',fontSize:16}}>📅 Planning {isEmy?"de ma semaine":"d'Emy"}</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={()=>setPlanningWeek(w=>w-1)}>←</button>
                  <span style={{color:'#FFEB5A',fontSize:11,fontWeight:900,minWidth:110,textAlign:'center'}}>{planningWeek===0?'Cette semaine':planningWeek<0?`Il y a ${Math.abs(planningWeek)} sem.`:`Dans ${planningWeek} sem.`}</span>
                  <button className="btn btn-sm" style={{background:'rgba(255,255,255,.1)',border:'1.5px solid rgba(255,255,255,.2)',color:'#fff'}} onClick={()=>setPlanningWeek(w=>w+1)}>→</button>
                  {planningWeek!==0&&<button className="btn btn-y btn-sm" onClick={()=>setPlanningWeek(0)}>Auj.</button>}
                </div>
              </div>
              <div style={{padding:'10px 14px'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5}}>
                  {['Lun','Mar','Mer','Jeu','Ven'].map((day,di)=>{
                    const ws=new Date();const dow=ws.getDay()===0?6:ws.getDay()-1;ws.setDate(ws.getDate()-dow+(planningWeek*7))
                    const dd=new Date(ws);dd.setDate(ws.getDate()+di)
                    const ds=dd.toISOString().split('T')[0]
                    const isToday=ds===new Date().toISOString().split('T')[0]
                    const isPast=dd<new Date(new Date().toDateString())
                    const dt=tasks.filter(t=>t.deadline===ds&&t.assignee==='emy')
                    const hasLate=isPast&&dt.some(t=>t.status!=='done')
                    const allDone=dt.length>0&&dt.every(t=>t.status==='done')
                    return (
                      <div key={day} style={{borderRadius:5,border:`2px solid ${isToday?'#005FFF':hasLate?'#CC0066':allDone?'#009D3A':'#EBEBEB'}`,background:isToday?'#E3F0FF':hasLate?'#FCE4EC':allDone?'#E8F5E9':'#FAFAFA',padding:'6px',minHeight:70}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <div className="yt" style={{fontSize:11,color:isToday?'#005FFF':hasLate?'#CC0066':'#191923'}}>{day}</div>
                          <div style={{fontSize:9,opacity:.4}}>{dd.getDate()}/{dd.getMonth()+1}</div>
                        </div>
                        {dt.length===0?<div style={{fontSize:9,opacity:.25,textAlign:'center',marginTop:6}}>—</div>:dt.map(t=>(
                          <div key={t.id} onClick={()=>setPage2('tasks')} style={{cursor:'pointer',background:t.status==='done'?'rgba(0,157,58,.1)':t.priority==='high'?'rgba(255,130,215,.2)':'rgba(0,95,255,.1)',borderLeft:`3px solid ${t.status==='done'?'#009D3A':t.priority==='high'?'#FF82D7':'#005FFF'}`,borderRadius:'0 3px 3px 0',padding:'2px 4px',marginBottom:2,fontSize:9,fontWeight:900,textDecoration:t.status==='done'?'line-through':'none',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {!isEmy && reports.length > 0 && (
              <div className="card">
                <div className="ct"> Dernier CR d'Emy</div>
                <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}>
                  <div className="yt" style={{fontSize:12,opacity:.5,marginBottom:4}}>{reports[0].week}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
                    {[['Prospects',reports[0].prospects],['RDV',reports[0].rdv],['Cmdes',reports[0].cmds]].map(([l,v]) => (
                      <div key={l as string} style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'6px',textAlign:'center'}}>
                        <div style={{fontWeight:900,fontSize:18}}>{v}</div>
                        <div className="yt" style={{fontSize:10,opacity:.5}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn btn-y btn-sm" onClick={() => setPage2('reporting')}>Voir et répondre →</button>
              </div>
            )}
          </div>
        )}

        {/* ══ TABLEAU DE CHASSE ════════════════════════════════════════════ */}
        {page==='chasse' && (
          <div>
            <div className="ph">
              <div>
                <div className="pt">Tableau de Chasse </div>
                <div className="ps">{chasse.filter(p=>p.status==='to_contact').length} à contacter · {chasse.filter(p=>p.status!=='to_contact').length} contactés · {chasse.length} total</div>
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {isEmy && (
                  <div style={{textAlign:'right'}}>
                    <div style={{fontWeight:900,fontSize:11,marginBottom:3}}>{contactedToday}/5 aujourd'hui</div>
                    <div className="prog-wrap" style={{width:120}}>
                      <div className="prog-fill" style={{width:`${Math.min(contactedToday/5*100,100)}%`,background:contactedToday>=5?'#009D3A':'#191923'}} />
                    </div>
                  </div>
                )}
                <button className="btn btn-y btn-sm" onClick={() => openModal('chasse_add',{cat:'evenementiel',score:5})}>+ Ajouter</button>
              </div>
            </div>

            {/* Recherche + filtres */}
            <div className="search-bar">
              <input className="inp" style={{flex:1,minWidth:140}} value={chasseSearch} onChange={e => setChasseSearch(e.target.value)} placeholder=" Rechercher une entreprise, un arrondissement…" />
              <select className="inp sel" style={{width:140}} value={chasseSort} onChange={e => setChasseSort(e.target.value)}>
                <option value="score">Trier : Score</option>
                <option value="valeur">Trier : Valeur €</option>
                <option value="name">Trier : A-Z</option>
              </select>
            </div>

            <div className="filter-row">
              <span style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.4,marginRight:4}}>Catégorie :</span>
              <div style={{overflowX:'auto',display:'flex',gap:4',flexWrap:'nowrap',paddingBottom:4}}>
                {Object.entries(CATS_MAP).map(([k,v]:any) => (
                  <div key={k} className={`tag${chasseCat===k?' on':''}`} onClick={() => setChasseChasse(k)}>{v.emoji} {v.label}</div>
                ))}
              </div>
            </div>

            <div className="filter-row" style={{gap:8,alignItems:'center'}}>
              <span style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.4}}>Taille :</span>
              {['all','1-10','5-15','5-20','10-30','10-50','50-100','100+','100-200','200+','500+','1000+'].filter((v,i,a)=>a.indexOf(v)===i).slice(0,6).map(t => (
                <div key={t} className={`tag${chasseTaille===t?' on':''}`} onClick={() => setChasseTable(t)}>{t==='all'?'Toutes':t}</div>
              ))}
              <span style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.4,marginLeft:8}}>Statut :</span>
              {[['all','Tous'],['to_contact','À contacter'],['contacted','Contacté'],['nego','Négo'],['won','Gagné']].map(([k,l]) => (
                <div key={k} className={`tag${chasseStatus===k?' on':''}`} onClick={() => setChasseStatus2(k)}>{l}</div>
              ))}
            </div>

            <div style={{fontSize:12,opacity:.5,marginBottom:10,fontWeight:900}}>
              {chasseFiltered.length} prospects affichés
            </div>

            {chasseFiltered.map(p => (
              <div key={p.id} className="chasse-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:4}}>
                      <span style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:'#FFEB5A',flexShrink:0}}>
                        {CATS_MAP[p.cat]?.emoji} {CATS_MAP[p.cat]?.label||p.cat}
                      </span>
                      <span style={{fontSize:9,fontWeight:900,background:p.score>=9?'#191923':p.score>=7?'#FF82D7':'#EBEBEB',color:p.score>=9?'#FFEB5A':'#191923',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px',flexShrink:0}}>
                        {'★'.repeat(Math.min(Math.ceil(p.score/3),3))} {p.score}/10
                      </span>
                      {p.status!=='to_contact' && <span className="badge" style={{color:STATUS_PC[p.status as keyof typeof STATUS_PC],borderColor:STATUS_PC[p.status as keyof typeof STATUS_PC]}}>{STATUS_P[p.status]}</span>}
                    </div>
                    <div style={{fontWeight:900,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</div>
                    <div style={{fontSize:11,opacity:.5}}>{p.arrondissement} · {p.taille} emp.</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    {p.valeur_event>0 && <div style={{fontWeight:900,fontSize:14}}>~{p.valeur_event.toLocaleString()}€</div>}
                    {p.valeur_mois>0 && <div style={{fontWeight:900,fontSize:14}}>~{p.valeur_mois.toLocaleString()}€/mois</div>}
                    <div style={{fontSize:9,opacity:.5,textTransform:'uppercase',letterSpacing:1}}>{p.type}</div>
                  </div>
                </div>

                <div style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:5,padding:'8px 10px',marginBottom:8,fontSize:12}}>
                  <span style={{fontWeight:900}}> </span>{p.pitch}
                </div>

                <div style={{display:'flex',gap:10,flexWrap:'wrap',fontSize:11,marginBottom:8,opacity:.7}}>
                  {p.email&&p.email!=='—'&&<span>✉️ {p.email}</span>}
                  {p.phone&&p.phone!=='—'&&<span> {p.phone}</span>}
                  {p.contact&&p.contact!=='—'&&<span> {p.contact}</span>}
                  {p.site&&p.site!=='—'&&<a href={`https://${p.site}`} target="_blank" rel="noopener noreferrer" style={{color:'#005FFF',textDecoration:'none'}}> {p.site}</a>}
                  {p.linkedin&&<a href={p.linkedin.startsWith('http')?p.linkedin:`https://${p.linkedin}`} target="_blank" rel="noopener noreferrer" style={{color:'#0077B5',fontWeight:900,textDecoration:'none'}}>🔗 LinkedIn</a>}
                </div>

                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button className="btn btn-p btn-sm" onClick={() => generateEmail(p)}>✉️ Générer email IA</button>
                  {p.status==='to_contact' && <button className="btn btn-g btn-sm" onClick={() => contactProspect(p.id)}>✓ Contacté</button>}
                  <button className="btn btn-y btn-sm" onClick={() => {
                    setChasse(prev => prev.map(x => x.id===p.id ? {...x, status:'nego'} : x))
                    toast('Statut mis à jour : Négo')
                  }}>→ Négo</button>
                  <button className="btn btn-sm" style={{background:'#009D3A',color:'#fff'}} onClick={() => {
                    setChasse(prev => prev.map(x => x.id===p.id ? {...x, status:'won'} : x))
                    toast(' Gagné !')
                  }}>✓ Gagné</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ CRM ══════════════════════════════════════════════════════════ */}
        {page==='crm' && (
          <div>
            <div className="ph">
              <div><div className="pt">CRM Prospects</div><div className="ps">{prospects.length} prospects · Pipeline B2B</div></div>
              <button className="btn btn-y btn-sm" onClick={() => openModal('prospect',{status:'to_contact',priority:'medium'})}>+ Nouveau</button>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
              {Object.entries(STATUS_P).map(([k,v]) => (
                <div key={k} style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:'8px 12px',textAlign:'center',boxShadow:'2px 2px 0 #191923',flex:'1 1 80px'}}>
                  <div style={{fontWeight:900,fontSize:22}}>{prospects.filter(p=>p.status===k).length}</div>
                  <div className="yt" style={{fontSize:11,opacity:.6}}>{v as string}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{padding:0,overflow:'hidden'}}>
              <div style={{padding:'9px 14px',background:'#FF82D7',borderBottom:'2px solid #191923',overflowX:'auto'}}>
                <div style={{display:'grid',gridTemplateColumns:'1.5fr .9fr .7fr 1fr 90px',gap:8,alignItems:'center',minWidth:500}}>
                  {['Entreprise','Contact','Statut','Prochaine relance',''].map(h => <span key={h} className="yt" style={{fontSize:12,opacity:.7}}>{h}</span>)}
                </div>
              </div>
              <div style={{padding:'0 14px',overflowX:'auto'}}>
                {prospects.map(p => (
                  <div key={p.id} style={{display:'grid',gridTemplateColumns:'1.5fr .9fr .7fr 1fr 90px',gap:8,alignItems:'center',padding:'10px 0',borderBottom:'2px solid #EBEBEB',minWidth:500}}>
                    <div><div style={{fontWeight:900,fontSize:12}}>{p.name}</div><div style={{fontSize:10,opacity:.5}}>{p.category}</div></div>
                    <div><div style={{fontSize:11}}>{p.email}</div><div style={{fontSize:10,opacity:.5}}>{p.phone}</div></div>
                    <span className="badge" style={{color:STATUS_PC[p.status],borderColor:STATUS_PC[p.status]}}>{STATUS_P[p.status]}</span>
                    <div><div style={{fontSize:11,fontWeight:900,color:p.nextDate<=today&&p.status!=='won'?'#CC0066':'#191923'}}>{p.nextDate<=today&&p.status!=='won'?'⚠️ ':''}{p.nextAction||'—'}</div><div style={{fontSize:10,opacity:.5}}>{p.nextDate}</div></div>
                    <div style={{display:'flex',gap:3}}>
                      <button className="btn btn-y btn-sm" onClick={() => openModal('prospect',{...p})}>✏️</button>
                      <button className="btn btn-p btn-sm" onClick={() => generateEmail({...p, cat:'crm', arrondissement:'', taille:p.size, pitch:p.notes||'', type:p.category})}>✉️</button>
                      <button className="btn btn-sm" onClick={() => {setProspects(prev=>prev.filter(x=>x.id!==p.id));toast('Supprimé')}}>✕</button>
                    </div>
                  </div>
                ))}
                {prospects.length===0 && <div style={{textAlign:'center',padding:40,opacity:.4,fontSize:12,fontWeight:900,textTransform:'uppercase'}}>Aucun prospect</div>}
              </div>
            </div>
          </div>
        )}

        {/* ══ ANNUAIRE ═════════════════════════════════════════════════════ */}
        {page==='annuaire' && (
          <div>
            <div className="ph">
              <div><div className="pt">Annuaire</div><div className="ps">{contacts.length} contacts essentiels</div></div>
              <button className="btn btn-y btn-sm" onClick={() => openModal('contact',{cat:'food',vip:false})}>+ Ajouter</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:12}}>
              {contacts.map(c => (
                <div key={c.id} className="card">
                  <div style={{fontSize:9,fontWeight:900,textTransform:'uppercase',padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,display:'inline-block',marginBottom:7,background:['banque','presse'].includes(c.cat)?'#FF82D7':'#FFEB5A'}}>
                    {CAT_ANN[c.cat]||c.cat}
                  </div>
                  {c.vip && <span style={{float:'right',fontSize:10,fontWeight:900}}>⭐ VIP</span>}
                  <div style={{fontWeight:900,fontSize:14}}>{c.name}</div>
                  {c.contact&&c.contact!=='—'&&<div style={{fontSize:11,opacity:.6}}>{c.contact}</div>}
                  {c.phone&&c.phone!=='—'&&<div style={{fontSize:11,marginTop:4}}> {c.phone}</div>}
                  {c.email&&<div style={{fontSize:11,marginTop:2}}>✉️ {c.email}</div>}
                  {c.notes&&<div style={{fontSize:10,fontWeight:900,opacity:.4,marginTop:6,textTransform:'uppercase'}}>{c.notes}</div>}
                  <div style={{display:'flex',gap:4,marginTop:8}}>
                    <button className="btn btn-y btn-sm" onClick={() => openModal('contact',{...c})}>✏️</button>
                    <button className="btn btn-sm" onClick={() => {setContacts(prev=>prev.filter(x=>x.id!==c.id));toast('Supprimé')}}>✕</button>
                  </div>
                </div>
              ))}
              <div className="card" style={{border:'2px dashed #191923',boxShadow:'none',display:'flex',alignItems:'center',justifyContent:'center',minHeight:100,cursor:'pointer',opacity:.4}} onClick={() => openModal('contact',{cat:'food',vip:false})}>
                <div style={{textAlign:'center'}}><div style={{fontSize:24}}>+</div><div style={{fontSize:10,fontWeight:900,textTransform:'uppercase'}}>Ajouter</div></div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TÂCHES ══════════════════════════════════════════════════════ */}
        {page==='tasks' && (
          <div>
            <div className="ph">
              <div><div className="pt">Tâches</div><div className="ps">{tasks.filter(t=>t.status!=='done'&&(isEmy?t.assignee==='emy':true)).length} actives</div></div>
              <button className="btn btn-y btn-sm" onClick={() => openModal('task',{assignee:isEmy?'emy':'emy',priority:'medium',status:'todo'})}>+ Nouvelle</button>
            </div>
            <div className="card">
              {(isEmy ? tasks.filter(t=>t.assignee==='emy') : tasks).map(t => (
                <div key={t.id} className="row" style={{gridTemplateColumns:'4px 1fr auto auto',gap:10}}>
                  <div className="pbar" style={{background:t.priority==='high'?'#FF82D7':t.priority==='medium'?'#005FFF':'#009D3A'}} />
                  <div style={{textDecoration:t.status==='done'?'line-through':'none',opacity:t.status==='done'?.4:1}}>
                    <div style={{fontSize:12,fontWeight:900}}>{t.title}</div>
                    <div style={{fontSize:10,opacity:.5}}> {t.deadline} · {t.assignee}</div>
                  </div>
                  <span className="badge" style={{color:t.status==='in_progress'?'#005FFF':t.status==='done'?'#009D3A':'#888',borderColor:t.status==='in_progress'?'#005FFF':t.status==='done'?'#009D3A':'#ccc'}}>{TASK_S[t.status]}</span>
                  <div style={{display:'flex',gap:3}}>
                    <button className="btn btn-y btn-sm" onClick={() => {
                      const order = ['todo','in_progress','done']
                      setTasks(prev => prev.map(x => x.id!==t.id ? x : {...x, status:order[Math.min(order.indexOf(x.status)+1,2)]}))
                      toast('Avancé ✓')
                    }}>→</button>
                    <button className="btn btn-sm" onClick={() => openModal('task',{...t})}>✏️</button>
                    <button className="btn btn-sm" onClick={() => {setTasks(prev=>prev.filter(x=>x.id!==t.id));toast('Supprimé')}}>✕</button>
                  </div>
                </div>
              ))}
              {tasks.filter(t=>isEmy?t.assignee==='emy':true).length===0 && <div style={{textAlign:'center',padding:40,opacity:.4,fontSize:12,fontWeight:900,textTransform:'uppercase'}}>Aucune tâche</div>}
            </div>
          </div>
        )}

        {/* ══ REPORTING ═══════════════════════════════════════════════════ */}
        {page==='reporting' && (
          <div>
            <div className="ph">
              <div><div className="pt">Reporting</div><div className="ps">Compte-rendus hebdo</div></div>
              {isEmy && <button className="btn btn-n btn-sm" onClick={() => openModal('cr',{})}>+ Nouveau CR</button>}
            </div>
                {t.checklist&&t.checklist.filter(c=>c).length>0&&(
                  <div style={{paddingLeft:18,paddingBottom:8,borderTop:'1px solid #EBEBEB',marginTop:2}}>
                    {t.checklist.filter(c=>c).map((item,ci)=>(
                      <div key={ci} style={{display:'flex',alignItems:'center',gap:6,marginTop:5}}>
                        <input type="checkbox" checked={item.startsWith('✓ ')} style={{width:13,height:13,flexShrink:0,cursor:'pointer',accentColor:'#009D3A'}}
                          onChange={e=>{const nl=[...t.checklist];nl[ci]=e.target.checked?'✓ '+item.replace('✓ ',''):item.replace('✓ ','');setTasks(prev=>prev.map(x=>x.id===t.id?{...x,checklist:nl}:x))}} />
                        <span style={{fontSize:11,textDecoration:item.startsWith('✓ ')?'line-through':'none',opacity:item.startsWith('✓ ')?.4:1}}>{item.replace('✓ ','')}</span>
                      </div>
                    ))}
                  </div>
                )}
            {reports.map((r,i) => (
              <div key={r.id} className="card-y" style={{border:'2px solid #191923',borderRadius:7,boxShadow:'3px 3px 0 #191923'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,flexWrap:'wrap',gap:8}}>
                  <div><div className="yt" style={{fontSize:12,opacity:.5}}>{r.date}</div><div style={{fontWeight:900,fontSize:16,textTransform:'uppercase'}}>{r.week}</div></div>
                  <span className="badge" style={{color:r.status==='submitted'?'#005FFF':'#009D3A',borderColor:r.status==='submitted'?'#005FFF':'#009D3A'}}>{r.status==='submitted'?'Soumis':'Lu ✓'}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                  {[['Prospects',r.prospects],['RDV',r.rdv],['Commandes',r.cmds]].map(([l,v]) => (
                    <div key={l as string} style={{background:'#fff',border:'1.5px solid #191923',borderRadius:4,padding:'8px',textAlign:'center'}}>
                      <div style={{fontWeight:900,fontSize:20}}>{v}</div>
                      <div className="yt" style={{fontSize:11,opacity:.5}}>{l}</div>
                    </div>
                  ))}
                </div>
                {r.wins && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>✅ Victoires</div><div style={{fontSize:12}}>{r.wins}</div></div>}
                {r.next && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}> Priorités S+1</div><div style={{fontSize:12}}>{r.next}</div></div>}
                {r.challenges && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>⚡ Challenges</div><div style={{fontSize:12}}>{r.challenges}</div></div>}
                {r.notes && <div style={{background:'#fff',border:'2px solid #191923',borderRadius:5,padding:10,marginBottom:8}}><div className="yt" style={{fontSize:14,color:'#FF82D7',marginBottom:4}}>💬 Note d’Emy</div><div style={{fontSize:12}}>{r.notes}</div></div>}
                {r.feedback && <div style={{background:'#FF82D7',border:'2px solid #191923',borderRadius:5,padding:10}}><div className="yt" style={{fontSize:14,marginBottom:4}}> Retour d'Edward</div><div style={{fontSize:12}}>{r.feedback}</div></div>}
                {!isEmy && !r.feedback && (
                  <div style={{marginTop:10}}>
                    <div className="lbl"> Ton retour à Emy</div>
                    <textarea className="inp" placeholder="Bravo, recadrages, directives…" id={`fb-${r.id}`} style={{minHeight:60}} />
                    <button className="btn btn-y btn-sm" style={{marginTop:6}} onClick={() => {
                      const val = (document.getElementById(`fb-${r.id}`) as HTMLTextAreaElement)?.value
                      if (val) {setReports(prev=>prev.map((x,j)=>j===i?{...x,feedback:val,status:'read'}:x));toast('Retour envoyé ✓')}
                    }}>Envoyer le retour</button>
                  </div>
                )}
              </div>
            ))}
            {reports.length===0 && (
              <div className="card" style={{textAlign:'center',padding:40}}>
                <div style={{fontSize:40,marginBottom:10}}></div>
                <div style={{fontWeight:900,textTransform:'uppercase'}}>Aucun CR pour l'instant</div>
                {isEmy && <button className="btn btn-y" style={{marginTop:14}} onClick={() => openModal('cr',{})}>Créer le premier CR</button>}
              </div>
            )}
          </div>
        )}

        {/* ══ VAULT ════════════════════════════════════════════════════════ */}
        {page==='vault' && (
          <div>
            <div className="ph">
              <div><div className="pt">Coffre-fort </div><div className="ps">Accès sécurisés</div></div>
              <button className="btn btn-y btn-sm" onClick={() => openModal('vault',{})}>+ Ajouter</button>
            </div>
            <div className="card-p" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',marginBottom:12}}>
              <span style={{fontSize:16}}></span>
              <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5}}>Données privées · Accès équipe Meshuga uniquement</span>
            </div>
            <div style={{overflowX:'auto'}}>
              <div className="card" style={{padding:0,overflow:'hidden',minWidth:500}}>
                <div style={{padding:'9px 16px',background:'#FF82D7',borderBottom:'2px solid #191923'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr 1.2fr 1.2fr 80px',gap:10}}>
                    {['Site','URL','Identifiant','Mot de passe',''].map(h => <span key={h} className="yt" style={{fontSize:12,opacity:.7}}>{h}</span>)}
                  </div>
                </div>
                <div style={{padding:'0 16px'}}>
                  {vault.map((v,i) => (
                    <div key={v.id} style={{display:'grid',gridTemplateColumns:'1fr 1.4fr 1.2fr 1.2fr 80px',gap:10,alignItems:'center',padding:'10px 0',borderBottom:'2px solid #EBEBEB'}}>
                      <div style={{fontWeight:900,fontSize:12}}>{v.title}</div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#005FFF',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.url}</a>
                      <div style={{fontSize:11}}>{v.user}</div>
                      <div style={{fontFamily:'monospace',letterSpacing:pwVisible[i]?'normal':3,fontSize:11}}>{pwVisible[i]?(v.pw||'(vide)'):'••••••••'}</div>
                      <div style={{display:'flex',gap:3}}>
                        <button className="btn btn-y btn-sm" onClick={() => setPwVisible((prev:any)=>({...prev,[i]:!prev[i]}))}>{pwVisible[i]?'':''}</button>
                        <button className="btn btn-sm" onClick={() => openModal('vault',{...v})}>✏️</button>
                        <button className="btn btn-sm" onClick={() => {setVault(prev=>prev.filter(x=>x.id!==v.id));toast('Supprimé')}}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ GMB ══════════════════════════════════════════════════════════ */}
        {page==='gmb' && (
          <div>
            <div className="ph">
              <div><div className="pt">Google My Business</div><div className="ps">Avis · Visibilité · Fiche</div></div>
            </div>
            <div className="card-y">
              <div className="ct"> Connexion requise</div>
              <p style={{fontSize:13,marginBottom:14}}>Configure Google My Business pour voir tes avis et y répondre directement depuis ici.</p>
              <button className="btn btn-n" onClick={() => {
                const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID}&redirect_uri=${window.location.origin}/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent`
                window.location.href = url
              }}>Se connecter avec Google →</button>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ══ MODALS ═══════════════════════════════════════════════════════════ */}

    {/* MODAL EMAIL IA */}
    {modal==='email' && (
      <div className="overlay" onClick={closeModal}>
        <div className="modal modal-lg" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">✉️ Email de prise de contact — {form.name}</div></div>
          <div className="mb">
            {generatingEmail ? (
              <div style={{textAlign:'center',padding:30}}>
                <div style={{fontSize:32,marginBottom:10}}>✨</div>
                <div style={{fontWeight:900,fontSize:13,textTransform:'uppercase',letterSpacing:1}}>Génération en cours…</div>
                <div className="yt" style={{fontSize:14,opacity:.5,marginTop:4}}>L'IA rédige ton email personnalisé</div>
              </div>
            ) : generatedEmail ? (
              <>
                <div className="lbl" style={{marginBottom:6}}>Email généré — personnalise avant d'envoyer</div>
                <textarea
                  className="inp"
                  style={{minHeight:280,fontFamily:'Arial,sans-serif',fontSize:13,lineHeight:1.6,background:'#FAFAFA'}}
                  value={generatedEmail}
                  onChange={e => setGeneratedEmail(e.target.value)}
                />
                <div style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:5,padding:10,fontSize:12,marginTop:8}}>
                  <strong> Comment envoyer :</strong> Copie le texte ci-dessus, ouvre ton client email (Gmail, Outlook…), colle et envoie depuis <strong>{isEmy?'emy@meshuga.fr':'edward@meshuga.fr'}</strong>. Une fois envoyé, clique "Contacté" dans le tableau de chasse.
                </div>
              </>
            ) : null}
          </div>
          <div className="mf">
            <button className="btn" onClick={closeModal}>Fermer</button>
            {generatedEmail && <>
              <button className="btn btn-y" onClick={() => {navigator.clipboard.writeText(generatedEmail);toast('Email copié ! ');logActivity('email_copie',`Email pour ${form.name}`,form.name,generatedEmail)}}> Copier</button>
              <button className="btn btn-p" onClick={() => generateEmail(form)}> Regénérer</button>
            </>}
          </div>
        </div>
      </div>
    )}

    {/* MODAL AJOUT CHASSE MANUEL */}
    {modal==='chasse_add' && (
      <div className="overlay" onClick={closeModal}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">Ajouter un prospect au tableau</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Catégorie</label>
                <select className="inp sel" value={form.cat||'evenementiel'} onChange={e=>setForm({...form,cat:e.target.value})}>
                  {Object.entries(CATS_MAP).filter(([k])=>k!=='all').map(([k,v]:any) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
                </select>
              </div>
              <div className="fg"><label className="lbl">Score /10</label><input type="number" min="1" max="10" className="inp" value={form.score||5} onChange={e=>setForm({...form,score:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Contact</label><input className="inp" value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Site web</label><input className="inp" value={form.site||''} onChange={e=>setForm({...form,site:e.target.value})} placeholder="exemple.fr" /></div>
              <div className="fg"><label className="lbl">Taille</label>
                <select className="inp sel" value={form.taille||'10-50'} onChange={e=>setForm({...form,taille:e.target.value})}>
                  {['1-10','5-20','10-50','50-100','100+','200+','500+','1000+'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="fg"><label className="lbl">Arrondissement</label><input className="inp" value={form.arrondissement||''} onChange={e=>setForm({...form,arrondissement:e.target.value})} placeholder="Paris 6e" /></div>
              <div className="fg"><label className="lbl">Valeur event estimée €</label><input type="number" className="inp" value={form.valeur_event||''} onChange={e=>setForm({...form,valeur_event:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Valeur mensuelle €</label><input type="number" className="inp" value={form.valeur_mois||''} onChange={e=>setForm({...form,valeur_mois:e.target.value})} /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Type de commande</label><input className="inp" value={form.type||''} onChange={e=>setForm({...form,type:e.target.value})} placeholder="Plateaux déjeuner, catering..." /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl"> Angle d'approche</label><textarea className="inp" value={form.pitch||''} onChange={e=>setForm({...form,pitch:e.target.value})} placeholder="Pourquoi ce prospect et comment l'aborder..." /></div>
            </div>
          </div>
          <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={addChasseManual}>Ajouter au tableau</button></div>
        </div>
      </div>
    )}

    {/* MODAL PROSPECT CRM */}
    {modal==='prospect' && (
      <div className="overlay" onClick={closeModal}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?'Modifier':'Nouveau prospect'}</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Email</label><input type="email" className="inp" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Taille</label><select className="inp sel" value={form.size||''} onChange={e=>setForm({...form,size:e.target.value})}><option value="">—</option><option>1-10</option><option>10-50</option><option>50-200</option><option>200-1000</option><option>1000+</option></select></div>
              <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}><option value="">—</option><option>Événementiel</option><option>Corporate</option><option>Startup</option><option>Avocats</option><option>Conseil</option><option>Hôtellerie</option><option>Immobilier</option><option>Tech</option><option>Institution</option><option>Autre</option></select></div>
              <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'to_contact'} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(STATUS_P).map(([k,v])=><option key={k} value={k}>{v as string}</option>)}</select></div>
              <div className="fg" style={{gridColumn:'1/-1'}}>
                <label className="lbl"> Prochaine relance</label>
                <div style={{display:'flex',gap:6}}>
                  <input type="date" className="inp" style={{flex:1}} value={form.nextDate||''} onChange={e=>setForm({...form,nextDate:e.target.value})} />
                  <button type="button" className="btn btn-sm" onClick={() => {const d=new Date();d.setDate(d.getDate()+7);setForm({...form,nextDate:d.toISOString().split('T')[0]})}}>+7j</button>
                  <button type="button" className="btn btn-sm" onClick={() => {const d=new Date();d.setDate(d.getDate()+14);setForm({...form,nextDate:d.toISOString().split('T')[0]})}}>+14j</button>
                </div>
                <input className="inp" style={{marginTop:6}} value={form.nextAction||''} onChange={e=>setForm({...form,nextAction:e.target.value})} placeholder="Action prévue…" />
              </div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}>
                <label className="lbl">📎 Documents joints (liens ou descriptions)</label>
                <textarea className="inp" style={{minHeight:55}} value={(form.files||[]).join('\n')} onChange={e=>setForm({...form,files:e.target.value.split('\n')})} placeholder="Devis_2026.pdf&#10;https://drive.google.com/..." />
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>{(form.files||[]).filter((f:string)=>f.trim()).map((f:string,i:number)=>(<span key={i} style={{background:'#FFEB5A',border:'1.5px solid #191923',borderRadius:3,padding:'2px 6px',fontSize:10,fontWeight:900}}>📎 {f}</span>))}</div>
              </div>
            </div>
          </div>
          <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveProspect}>Sauvegarder</button></div>
        </div>
      </div>
    )}

    {/* MODAL TÂCHE */}
    {modal==='task' && (
      <div className="overlay" onClick={closeModal}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?'Modifier la tâche':'Nouvelle tâche'}</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Assignée à</label><select className="inp sel" value={form.assignee||'emy'} onChange={e=>setForm({...form,assignee:e.target.value})}><option value="emy">Emy</option><option value="edward">Edward</option></select></div>
              <div className="fg"><label className="lbl">Deadline</label><input type="date" className="inp" value={form.deadline||''} onChange={e=>setForm({...form,deadline:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Priorité</label><select className="inp sel" value={form.priority||'medium'} onChange={e=>setForm({...form,priority:e.target.value})}><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select></div>
              <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'todo'} onChange={e=>setForm({...form,status:e.target.value})}>{Object.entries(TASK_S).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
            </div>
          </div>
          <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveTask}>Sauvegarder</button></div>
        </div>
      </div>
    )}

    {/* MODAL CONTACT */}
    {modal==='contact' && (
      <div className="overlay" onClick={closeModal}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?'Modifier':'Nouveau contact'}</div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.cat||'food'} onChange={e=>setForm({...form,cat:e.target.value})}>{Object.entries(CAT_ANN).map(([k,v])=><option key={k} value={k}>{v as string}</option>)}</select></div>
              <div className="fg" style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}><input type="checkbox" checked={!!form.vip} onChange={e=>setForm({...form,vip:e.target.checked})} style={{width:16,height:16}} /><span style={{fontSize:12}}>VIP ★</span></div>
              <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Contact</label><input className="inp" value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})} /></div>
              <div className="fg" style={{gridColumn:'1/-1'}}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            </div>
          </div>
          <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveContact}>Sauvegarder</button></div>
        </div>
      </div>
    )}

    {/* MODAL VAULT */}
    {modal==='vault' && (
      <div className="overlay" onClick={closeModal}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">{form.id?'Modifier':'Nouvel accès'} </div></div>
          <div className="mb">
            <div className="fg2">
              <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})} /></div>
              <div className="fg"><label className="lbl">URL</label><input className="inp" value={form.url||''} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https://…" /></div>
              <div className="fg"><label className="lbl">Identifiant</label><input className="inp" value={form.user||''} onChange={e=>setForm({...form,user:e.target.value})} /></div>
              <div className="fg"><label className="lbl">Mot de passe</label><input type="password" className="inp" value={form.pw||''} onChange={e=>setForm({...form,pw:e.target.value})} /></div>
            </div>
          </div>
          <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveVault}>Sauvegarder</button></div>
        </div>
      </div>
    )}

    {/* MODAL CR */}
    {modal==='cr' && (
      <div className="overlay" onClick={closeModal}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="mh"><div className="mt">Compte-rendu hebdomadaire</div></div>
          <div className="mb">
            <div className="fg"><label className="lbl">Semaine du *</label><input className="inp" value={form.week||''} onChange={e=>setForm({...form,week:e.target.value})} placeholder="ex: 25 mars 2026" /></div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
              {[['prospects','Prospects'],['rdv','RDV'],['cmds','Commandes']].map(([k,l])=>(
                <div key={k} className="fg"><label className="lbl">{l}</label><input type="number" className="inp" value={(form as any)[k]||0} onChange={e=>setForm({...form,[k]:parseInt(e.target.value)||0})} /></div>
              ))}
            </div>
            <div className="fg"><label className="lbl">✅ Victoires</label><textarea className="inp" value={form.wins||''} onChange={e=>setForm({...form,wins:e.target.value})} placeholder="Ce que j'ai accompli…" /></div>
            <div className="fg"><label className="lbl">⚡ Challenges</label><textarea className="inp" value={form.challenges||''} onChange={e=>setForm({...form,challenges:e.target.value})} placeholder="Blocages…" /></div>
            <div className="fg"><label className="lbl"> Priorités S+1</label><textarea className="inp" value={form.next||''} onChange={e=>setForm({...form,next:e.target.value})} placeholder="Mes 3 priorités…" /></div>
            <div className="fg"><label className="lbl"> Note pour Edward</label><textarea className="inp" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
          </div>
          <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={submitCR}> Soumettre à Edward</button></div>
        </div>
      </div>
    )}


        {page==='journal'&&(
          <div>
            <div className="ph"><div><div className="pt">Journal d’Emy 📓</div><div className="ps">Sessions · Contacts · Emails</div></div></div>
            <div className="card" style={{marginBottom:12,padding:'10px 14px',background:'#191923',borderRadius:7}}>
              <div className="yt" style={{fontSize:13,marginBottom:8,color:'#FF82D7'}}>🕐 Sessions de connexion</div>
              {activityLog.filter(a=>a.type==='session_start').slice(0,10).map((a,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid rgba(255,255,255,.1)'}}>
                  <div style={{fontSize:12,fontWeight:900,color:'#FFEB5A'}}>{a.user_name}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>{new Date(a.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                </div>
              ))}
              {activityLog.filter(a=>a.type==='session_start').length===0&&<div style={{fontSize:11,color:'rgba(255,255,255,.4)'}}>Aucune session enregistrée</div>}
            </div>
            <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap'}}>
              {[['all','Tout'],['email_copie','✉️ Emails'],['prospect_contacte','📞 Contacts']].map(([k,l])=>(
                <div key={k} className={"tag"+(journalFilter===k?' on':'')} onClick={()=>setJournalFilter(k)}>{l}</div>
              ))}
            </div>
            {activityLog.filter(a=>a.type!=='session_start'&&(journalFilter==='all'||a.type===journalFilter)).length===0?(
              <div className="card" style={{textAlign:'center',padding:40,opacity:.4}}><div style={{fontSize:32,marginBottom:8}}>📓</div><div style={{fontWeight:900,fontSize:12,textTransform:'uppercase'}}>Aucune activité</div></div>
            ):activityLog.filter(a=>a.type!=='session_start'&&(journalFilter==='all'||a.type===journalFilter)).map(a=>(
              <div key={a.id||a.created_at} className="card" style={{padding:'12px 14px',marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                      <span style={{fontSize:16}}>{a.type==='email_copie'?'✉️':a.type==='prospect_contacte'?'📞':'🔄'}</span>
                      <span style={{fontWeight:900,fontSize:13}}>{a.description}</span>
                      <span style={{fontSize:9,fontWeight:900,padding:'2px 6px',border:'1.5px solid #191923',borderRadius:3,background:a.user_role==='emy'?'#FF82D7':'#FFEB5A'}}>{a.user_name}</span>
                    </div>
                    {a.prospect_name&&<div style={{fontSize:11,opacity:.5,marginLeft:24}}>🎯 {a.prospect_name}</div>}
                    {a.email_content&&(
                      <details style={{marginTop:8,marginLeft:24}}>
                        <summary style={{cursor:'pointer',fontSize:11,fontWeight:900,opacity:.6}}>Voir l’email envoyé</summary>
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
    {/* TOAST */}
    <div className={`toast${toastMsg?' show':''}`}>{toastMsg}</div>
    </>
  )
}
