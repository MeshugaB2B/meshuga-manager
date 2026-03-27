'use client'
import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// ─── SUPABASE ────────────────────────────────────────────────────────────────
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
.app{display:flex;flex:1;overflow:hidden}
.sidebar{width:210px;background:var(--w);border-right:4px solid var(--n);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.sb-logo{padding:14px;border-bottom:3px solid var(--n);display:flex;align-items:center;gap:10px}
.sb-stamp{width:42px;height:42px;border-radius:50%;border:2px solid var(--n);background:var(--y);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.sb-nav{padding:8px;flex:1}
.sb-sec{font-family:'Yellowtail',cursive;font-size:13px;opacity:.4;padding:6px 10px 3px;margin-top:4px}
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:rgba(25,25,35,.35);border:2px solid transparent;transition:all .1s;margin-bottom:1px;position:relative}
.ni:hover{background:var(--y);color:var(--n);border-color:var(--n)}
.ni.active{background:var(--p);color:var(--n);border-color:var(--n)}
.nb{background:var(--n);color:var(--y);font-size:9px;padding:1px 5px;border-radius:2px;margin-left:auto}
.main{flex:1;overflow-y:auto;padding:20px 24px;background:var(--y)}
.strip{height:4px;background:var(--n);border-radius:2px;margin-bottom:16px}
.pt{font-weight:900;font-size:36px;text-transform:uppercase;letter-spacing:-1px;line-height:1}
.ps{font-family:'Yellowtail',cursive;font-size:15px;opacity:.5;margin-top:2px;margin-bottom:14px}
.ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}
.card{background:var(--w);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:12px}
.card-y{background:var(--y);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:12px}
.card-p{background:var(--p);border-radius:7px;border:2px solid var(--n);padding:14px;box-shadow:3px 3px 0 var(--n);margin-bottom:12px}
.ct{font-family:'Yellowtail',cursive;font-size:16px;margin-bottom:10px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:12px}
.kc{border-radius:7px;border:2px solid var(--n);padding:12px;position:relative;overflow:hidden;box-shadow:3px 3px 0 var(--n)}
.kl{font-family:'Yellowtail',cursive;font-size:13px}
.kv{font-weight:900;font-size:30px;line-height:1.1}
.ki{position:absolute;right:8px;top:8px;font-size:18px;opacity:.15}
.row{display:grid;align-items:center;padding:9px 0;border-bottom:2px solid var(--gr)}
.row:last-child{border-bottom:none}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:3px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:1.5px solid currentColor}
.btn{padding:7px 12px;border-radius:4px;border:2px solid var(--n);cursor:pointer;font-family:'Arial Narrow',Arial;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-flex;align-items:center;gap:5px;box-shadow:2px 2px 0 var(--n);background:var(--w);color:var(--n);transition:all .1s}
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
.overlay{position:fixed;inset:0;background:rgba(25,25,35,.6);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px}
.modal{background:var(--w);border-radius:8px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border:3px solid var(--n);box-shadow:8px 8px 0 var(--n)}
.mh{padding:14px 18px;border-bottom:2px solid var(--n);background:var(--p)}
.mt{font-weight:900;font-size:18px;text-transform:uppercase}
.mb{padding:14px 18px}
.mf{padding:10px 18px;border-top:2px solid var(--gr);display:flex;justify-content:flex-end;gap:8px}
.hidden{display:none!important}
.pbar{width:4px;border-radius:2px;min-height:30px;flex-shrink:0}
.prog-wrap{height:10px;background:var(--gr);border-radius:3px;border:1.5px solid var(--n);overflow:hidden;margin-top:4px}
.prog-fill{height:100%;background:var(--n);border-radius:2px;transition:width .4s}
.al{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:5px;border:2px solid var(--n);background:var(--w);margin-bottom:7px;box-shadow:2px 2px 0 var(--n)}
.al:last-child{margin-bottom:0}
.tag{font-size:9px;font-weight:900;padding:2px 7px;border:1.5px solid var(--n);border-radius:3px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;background:var(--w);display:inline-block}
.tag.on{background:var(--n);color:var(--y)}
.vault-row{display:grid;grid-template-columns:1fr 1.2fr 1.2fr 1fr 60px;gap:10px;align-items:center;padding:10px 0;border-bottom:2px solid var(--gr)}
.vault-row:last-child{border-bottom:none}
.chasse-card{background:var(--w);border:2px solid var(--n);border-radius:7px;padding:12px;box-shadow:3px 3px 0 var(--n);margin-bottom:10px;transition:transform .1s}
.chasse-card:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--n)}
.star{color:#F5C842;font-size:12px}
.toast{position:fixed;bottom:20px;right:20px;background:var(--n);color:var(--y);padding:10px 18px;border-radius:6px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:2px solid var(--y);box-shadow:4px 4px 0 var(--y);z-index:999;opacity:0;transition:opacity .3s;pointer-events:none}
.toast.show{opacity:1}
`

// ─── PROSPECTS DATA BASE ─────────────────────────────────────────────────────
const PROSPECTS_BASE = [
  // AGENCES ÉVÉNEMENTIELLES
  { id:'p1', cat:'evenementiel', name:'Agence 007 Events', contact:'Direction commerciale', phone:'01 42 60 10 07', email:'contact@agence007.fr', site:'agence007.fr', taille:'10-50', quartier:'Paris 8e', valeur_mois:800, valeur_event:2500, type:'Catering événementiel', pitch:'Agence événementielle corporate, organise +50 events/an. Proposer plateau découverte pour leur prochain séminaire.', status:'to_contact', score:9 },
  { id:'p2', cat:'evenementiel', name:'Moon Event', contact:'Direction', phone:'01 40 00 00 00', email:'contact@moon-event.fr', site:'moon-event.fr', taille:'10-50', quartier:'Paris 9e', valeur_mois:0, valeur_event:3000, type:'Catering grands événements', pitch:'Référence nationale événementiel corporate. Entrer en tant que prestataire traiteur parisien de qualité.', status:'to_contact', score:9 },
  { id:'p3', cat:'evenementiel', name:'Agence 008', contact:'Équipe commerciale', phone:'01 43 12 34 56', email:'contact@agence008.com', site:'agence008.com', taille:'5-20', quartier:'Le Marais', valeur_mois:0, valeur_event:2000, type:'Catering événementiel', pitch:'Agence née dans le Marais, ton quartier. Fort potentiel de proximité. Proposer partenariat traiteur exclusif.', status:'to_contact', score:8 },
  { id:'p4', cat:'evenementiel', name:'Prest\'Agency', contact:'Direction', phone:'01 46 21 00 00', email:'contact@prestagency.com', site:'prestagency.com', taille:'10-30', quartier:'Paris', valeur_mois:0, valeur_event:1500, type:'Catering séminaires', pitch:'Spécialisée séminaires et soirées d\'entreprise depuis 20 ans. Proposer Meshuga comme traiteur partenaire.', status:'to_contact', score:7 },
  { id:'p5', cat:'evenementiel', name:'Alliance Événement', contact:'Responsable partenariats', phone:'01 45 00 00 00', email:'contact@allianceevenement.com', site:'allianceevenement.com', taille:'10-30', quartier:'Paris', valeur_mois:0, valeur_event:2000, type:'Catering événementiel', pitch:'+15 ans d\'expérience, +400 events/an. Un partenariat récurrent très lucratif.', status:'to_contact', score:8 },
  { id:'p6', cat:'evenementiel', name:'Hopscotch Groupe', contact:'Direction commerciale', phone:'01 58 65 00 72', email:'hopscotch@hopscotch.fr', site:'hopscotch.fr', taille:'200+', quartier:'Paris 11e', valeur_mois:0, valeur_event:5000, type:'Catering grands congrès', pitch:'Groupe événementiel de référence. Congrès nationaux et internationaux. Traiteur pour les pauses déjeuner.', status:'to_contact', score:9 },

  // CABINETS D'AVOCATS / NOTAIRES
  { id:'p7', cat:'avocats', name:'Gide Loyrette Nouel', contact:'Office Manager', phone:'01 40 75 60 00', email:'paris@gide.com', site:'gide.com', taille:'500+', quartier:'Paris 8e', valeur_mois:1200, valeur_event:3000, type:'Plateaux déjeuner + events clients', pitch:'Cabinet d\'avocats international top 5 France. Déjeuners de travail fréquents. Proposer livraison plateaux premium.', status:'to_contact', score:10 },
  { id:'p8', cat:'avocats', name:'Freshfields Paris', contact:'Facilities Manager', phone:'01 44 56 44 56', email:'paris@freshfields.com', site:'freshfields.com', taille:'200+', quartier:'Paris 8e', valeur_mois:1000, valeur_event:2500, type:'Plateaux déjeuner hebdo', pitch:'Cabinet magic circle. Culture du déjeuner au bureau très forte. Budget traiteur conséquent.', status:'to_contact', score:10 },
  { id:'p9', cat:'avocats', name:'Linklaters Paris', contact:'Office Manager', phone:'01 56 43 56 43', email:'paris@linklaters.com', site:'linklaters.com', taille:'150+', quartier:'Paris 8e', valeur_mois:900, valeur_event:2000, type:'Plateaux déjeuner', pitch:'Cabinet international, habitudes de déjeuner au bureau. Meshuga = qualité premium adaptée à leur standing.', status:'to_contact', score:9 },
  { id:'p10', cat:'avocats', name:'Clifford Chance Paris', contact:'Services généraux', phone:'01 44 05 52 52', email:'paris@cliffordchance.com', site:'cliffordchance.com', taille:'200+', quartier:'Paris 8e', valeur_mois:950, valeur_event:2200, type:'Plateaux déjeuner', pitch:'Top cabinet international. Fort volume de réunions avec déjeuner. Approcher via office manager.', status:'to_contact', score:9 },
  { id:'p11', cat:'avocats', name:'Hogan Lovells Paris', contact:'Administration', phone:'01 53 67 47 47', email:'paris@hoganlovells.com', site:'hoganlovells.com', taille:'150+', quartier:'Paris 8e', valeur_mois:800, valeur_event:2000, type:'Plateaux déjeuner', pitch:'Cabinet US très actif à Paris. Forte culture déjeuner business. Budget traiteur élevé.', status:'to_contact', score:8 },
  { id:'p12', cat:'avocats', name:'Jeantet Associés', contact:'Office Manager', phone:'01 45 05 80 08', email:'contact@jeantet.fr', site:'jeantet.fr', taille:'100+', quartier:'Paris 16e', valeur_mois:600, valeur_event:1500, type:'Plateaux + events', pitch:'Cabinet français de référence. Soirées clients régulières. Fort potentiel catering.', status:'to_contact', score:7 },
  { id:'p13', cat:'avocats', name:'Etude Notariale Thibierge', contact:'Maître Thibierge', phone:'01 43 26 00 00', email:'contact@thibierge-notaires.fr', site:'thibierge-notaires.fr', taille:'10-30', quartier:'Paris 6e', valeur_mois:400, valeur_event:800, type:'Plateaux déjeuner', pitch:'Étude notariale dans ton arrondissement ! Proximité = argument fort. Déjeuner de travail fréquents.', status:'to_contact', score:8 },

  // STARTUPS / SCALE-UPS
  { id:'p14', cat:'startup', name:'Doctolib', contact:'Office Manager', phone:'—', email:'office@doctolib.fr', site:'doctolib.fr', taille:'500+', quartier:'Paris 10e', valeur_mois:2000, valeur_event:3000, type:'Plateaux déjeuner + events équipe', pitch:'Scale-up française référence. Centaines d\'employés, culture déjeuner ensemble forte. Énorme potentiel récurrent.', status:'to_contact', score:10 },
  { id:'p15', cat:'startup', name:'Contentsquare', contact:'Workplace Manager', phone:'—', email:'workplace@contentsquare.com', site:'contentsquare.com', taille:'500+', quartier:'Paris 9e', valeur_mois:1500, valeur_event:2500, type:'Plateaux déjeuner hebdo', pitch:'Licorne française. Bureaux parisiens avec équipes importantes. Budget food & events conséquent.', status:'to_contact', score:9 },
  { id:'p16', cat:'startup', name:'Luko', contact:'Office Manager', phone:'—', email:'hello@luko.eu', site:'luko.eu', taille:'100-200', quartier:'Paris 9e', valeur_mois:800, valeur_event:1500, type:'Plateaux déjeuner', pitch:'Startup insurtech en croissance. Culture startup = déjeuners d\'équipe fréquents.', status:'to_contact', score:7 },
  { id:'p17', cat:'startup', name:'Swile', contact:'People & Culture', phone:'—', email:'contact@swile.co', site:'swile.co', taille:'200+', quartier:'Paris 9e', valeur_mois:1000, valeur_event:2000, type:'Plateaux + catering events', pitch:'Startup fintech, ironie intéressante : ils font les tickets resto, vous faites les sandwichs !', status:'to_contact', score:8 },
  { id:'p18', cat:'startup', name:'Alan', contact:'Office Manager', phone:'—', email:'hello@alan.com', site:'alan.com', taille:'300+', quartier:'Paris 9e', valeur_mois:1200, valeur_event:2000, type:'Plateaux déjeuner', pitch:'Licorne santé. Fort focus bien-être employés. Meshuga = qualité, frais, sain = parfait match.', status:'to_contact', score:9 },
  { id:'p19', cat:'startup', name:'Payfit', contact:'Workplace Manager', phone:'—', email:'contact@payfit.com', site:'payfit.com', taille:'500+', quartier:'Paris 9e', valeur_mois:1500, valeur_event:2500, type:'Plateaux déjeuner hebdo', pitch:'Scale-up RH. Bureaux modernes avec focus expérience employé. Idéal pour plateaux premium.', status:'to_contact', score:9 },
  { id:'p20', cat:'startup', name:'Mirakl', contact:'Office Manager', phone:'—', email:'contact@mirakl.com', site:'mirakl.com', taille:'400+', quartier:'Paris 9e', valeur_mois:1300, valeur_event:2000, type:'Plateaux déjeuner', pitch:'Scale-up marketplace. Forte croissance, budget food important.', status:'to_contact', score:8 },

  // STUDIOS CRÉATIFS / AGENCES PUB
  { id:'p21', cat:'agence_pub', name:'BETC Paris', contact:'Office Manager', phone:'01 55 31 55 31', email:'contact@betc.com', site:'betc.com', taille:'500+', quartier:'Paris 10e', valeur_mois:1500, valeur_event:4000, type:'Plateaux + events clients', pitch:'Top agence pub française. Shootings, présentations clients, événements créatifs en permanence.', status:'to_contact', score:10 },
  { id:'p22', cat:'agence_pub', name:'Publicis Groupe', contact:'Services généraux', phone:'01 44 43 70 00', email:'contact@publicis.com', site:'publicis.com', taille:'1000+', quartier:'Paris 8e', valeur_mois:2000, valeur_event:5000, type:'Catering événementiel', pitch:'Géant mondial de la pub. Headquarters Paris. Events clients permanents. Énorme potentiel.', status:'to_contact', score:10 },
  { id:'p23', cat:'agence_pub', name:'Havas Paris', contact:'Office Manager', phone:'01 58 47 20 00', email:'contact@havas.com', site:'havas.com', taille:'500+', quartier:'Paris 8e', valeur_mois:1500, valeur_event:4000, type:'Plateaux + catering', pitch:'Groupe communication international. Déjeuners de travail et events clients très fréquents.', status:'to_contact', score:9 },
  { id:'p24', cat:'agence_pub', name:'Marcel (Publicis)', contact:'Direction artistique', phone:'01 44 43 00 00', email:'contact@marcel.paris', site:'marcel.paris', taille:'100-200', quartier:'Paris 8e', valeur_mois:700, valeur_event:2000, type:'Catering shootings + events', pitch:'Agence créative premium. Shootings et présentations créatives = beaucoup de traiteur.', status:'to_contact', score:8 },
  { id:'p25', cat:'agence_pub', name:'Heaven (agence digitale)', contact:'Direction', phone:'01 40 09 27 00', email:'contact@heaven.fr', site:'heaven.fr', taille:'50-100', quartier:'Paris 9e', valeur_mois:500, valeur_event:1500, type:'Plateaux déjeuner + events', pitch:'Agence digitale influente. Culture créative = events réguliers. Proposer partenariat traiteur.', status:'to_contact', score:7 },

  // HÔTELS & CONCIERGES
  { id:'p26', cat:'hotel', name:'Hôtel Lutetia', contact:'Directeur F&B', phone:'01 45 44 38 10', email:'lutetia@hotellutetia.com', site:'hotellutetia.com', taille:'200+', quartier:'Paris 6e', valeur_mois:0, valeur_event:3000, type:'Catering événements VIP', pitch:'Palace 5★ dans TON arrondissement. Événements VIP permanents. Proposer Meshuga pour déjeuners décontractés entre meetings.', status:'to_contact', score:10 },
  { id:'p27', cat:'hotel', name:'Hôtel Bel Ami', contact:'Concierge', phone:'01 42 61 53 53', email:'reservation@hotel-bel-ami.com', site:'hotel-bel-ami.com', taille:'50-100', quartier:'Paris 6e', valeur_mois:400, valeur_event:1000, type:'Recommandation clients', pitch:'Hôtel boutique chic rue St-Benoit, Paris 6e. Clientèle business/créative. Le concierge peut recommander Meshuga.', status:'to_contact', score:9 },
  { id:'p28', cat:'hotel', name:'Hôtel d\'Aubusson', contact:'Concierge chef', phone:'01 43 29 43 43', email:'reservation@hoteldaubusson.com', site:'hoteldaubusson.com', taille:'30-50', quartier:'Paris 6e', valeur_mois:300, valeur_event:800, type:'Recommandation + catering', pitch:'Hôtel 5★ rue Dauphine, Paris 6e. Clientèle internationale haut de gamme. Partenariat concierge très intéressant.', status:'to_contact', score:9 },
  { id:'p29', cat:'hotel', name:'La Villa Saint-Germain', contact:'Direction', phone:'01 43 26 60 00', email:'contact@villa-saintgermain.com', site:'villa-saintgermain.com', taille:'20-50', quartier:'Paris 6e', valeur_mois:300, valeur_event:700, type:'Recommandation clients', pitch:'Boutique hôtel Paris 6e. Clientèle voyage d\'affaires. Concierge = prescripteur clé.', status:'to_contact', score:8 },
  { id:'p30', cat:'hotel', name:'Hôtel Montalembert', contact:'Concierge', phone:'01 45 49 68 68', email:'welcome@montalembert.com', site:'montalembert.com', taille:'50-100', quartier:'Paris 7e', valeur_mois:350, valeur_event:900, type:'Recommandation + events', pitch:'Hôtel design Paris 7e, clientèle créative et business. Proposer Meshuga comme partenaire déjeuner.', status:'to_contact', score:7 },

  // IMMOBILIER / PROMOTEURS
  { id:'p31', cat:'immo', name:'Nexity', contact:'Direction communication', phone:'01 71 12 12 12', email:'contact@nexity.fr', site:'nexity.fr', taille:'1000+', quartier:'Paris 15e', valeur_mois:0, valeur_event:3000, type:'Catering inaugurations', pitch:'Leader immobilier France. Inaugurations de programmes, événements clients réguliers. Énorme cible catering.', status:'to_contact', score:8 },
  { id:'p32', cat:'immo', name:'Kaufman & Broad', contact:'Direction marketing', phone:'01 41 43 44 73', email:'contact@ketb.com', site:'kaufmanandbroad.fr', taille:'500+', quartier:'Paris 7e', valeur_mois:0, valeur_event:2500, type:'Catering inaugurations + events', pitch:'Promoteur premium. Lancements de programmes = cocktails et events. Fort potentiel catering haut de gamme.', status:'to_contact', score:8 },
  { id:'p33', cat:'immo', name:'BNP Paribas Real Estate', contact:'Facilities Manager', phone:'01 55 65 20 04', email:'contact@realestate.bnpparibas.com', site:'realestate.bnpparibas.com', taille:'500+', quartier:'Paris 15e', valeur_mois:800, valeur_event:2000, type:'Plateaux déjeuner + events', pitch:'Branche immo BNP. Nombreuses réunions client et négociations. Plateaux déjeuner réguliers.', status:'to_contact', score:7 },
  { id:'p34', cat:'immo', name:'Savills France', contact:'Office Manager', phone:'01 44 51 17 17', email:'paris@savills.com', site:'savills.fr', taille:'100+', quartier:'Paris 8e', valeur_mois:600, valeur_event:1500, type:'Plateaux déjeuner', pitch:'Agence immobilier luxe internationale. Déjeuners clients fréquents, standing élevé = Meshuga parfait.', status:'to_contact', score:8 },

  // CABINETS MÉDICAUX / CLINIQUES
  { id:'p35', cat:'medical', name:'Clinique Saint-Jean de Dieu', contact:'Direction administrative', phone:'01 44 39 40 00', email:'contact@sjdd.fr', site:'sjdd.fr', taille:'200+', quartier:'Paris 7e', valeur_mois:600, valeur_event:1000, type:'Plateaux déjeuner staff', pitch:'Clinique privée Paris 7e. Équipes médicales nombreuses. Proposer livraison plateaux déjeuner pour le staff.', status:'to_contact', score:7 },
  { id:'p36', cat:'medical', name:'Institut Curie', contact:'Services hôteliers', phone:'01 56 24 55 55', email:'direction@curie.fr', site:'curie.fr', taille:'1000+', quartier:'Paris 5e', valeur_mois:1000, valeur_event:2000, type:'Plateaux déjeuner + events', pitch:'Institut de recherche et soins de référence. Events scientifiques fréquents. Proposer traiteur pour séminaires médicaux.', status:'to_contact', score:7 },
  { id:'p37', cat:'medical', name:'Cabinet Médical Odéon', contact:'Office Manager', phone:'01 43 26 00 00', email:'—', site:'—', taille:'5-15', quartier:'Paris 6e', valeur_mois:200, valeur_event:400, type:'Plateaux déjeuner', pitch:'Cabinet médical dans ton arrondissement. Équipe médicale = déjeuners rapides et de qualité. Proximité Meshuga.', status:'to_contact', score:6 },

  // PRODUCTIONS / TOURNAGES
  { id:'p38', cat:'production', name:'Pathé Films', contact:'Production Manager', phone:'01 71 72 30 00', email:'contact@pathe.com', site:'pathe.com', taille:'200+', quartier:'Paris 8e', valeur_mois:0, valeur_event:4000, type:'Catering tournages', pitch:'Géant du cinéma français. Tournages permanents. Traiteur sur plateau = budget important. Approcher via production manager.', status:'to_contact', score:9 },
  { id:'p39', cat:'production', name:'Quad Production', contact:'Direction de production', phone:'01 56 26 88 00', email:'quad@quadproduction.fr', site:'quadproduction.fr', taille:'50-100', quartier:'Paris 11e', valeur_mois:0, valeur_event:2000, type:'Catering tournages pub/clip', pitch:'Maison de production pub et clips. Tournages fréquents = traiteur régulier. Proposer Meshuga comme partenaire.', status:'to_contact', score:8 },
  { id:'p40', cat:'production', name:'La Pac (prod)', contact:'Production Executive', phone:'01 42 36 36 36', email:'contact@lapac.fr', site:'lapac.fr', taille:'20-50', quartier:'Paris 3e', valeur_mois:0, valeur_event:1500, type:'Catering tournages', pitch:'Maison de prod documentaires et fictions. Équipes de tournage = besoin traiteur quotidien.', status:'to_contact', score:7 },

  // GRANDES ÉCOLES / UNIVERSITÉS
  { id:'p41', cat:'ecole', name:'Sciences Po Paris', contact:'Direction des événements', phone:'01 45 49 50 50', email:'events@sciencespo.fr', site:'sciencespo.fr', taille:'1000+', quartier:'Paris 7e', valeur_mois:0, valeur_event:3000, type:'Catering conférences + events', pitch:'Institution de référence, 2 min de Meshuga ! Conférences, inaugurations, events étudiants permanents.', status:'to_contact', score:10 },
  { id:'p42', cat:'ecole', name:'ESCP Business School', contact:'Events Manager', phone:'01 49 23 20 00', email:'events@escp.eu', site:'escp.eu', taille:'500+', quartier:'Paris 11e', valeur_mois:0, valeur_event:2500, type:'Catering events étudiants et corpo', pitch:'Grande école de commerce. Nombreux events corporate et gala étudiants. Fort potentiel catering.', status:'to_contact', score:8 },
  { id:'p43', cat:'ecole', name:'INSEAD (campus Paris)', contact:'Events Coordinator', phone:'01 60 72 40 00', email:'paris@insead.edu', site:'insead.edu', taille:'200+', quartier:'Paris 8e', valeur_mois:0, valeur_event:4000, type:'Catering événements MBA', pitch:'MBA référence mondial. Campus Paris, events réguliers avec alumni et entreprises. Budget élevé.', status:'to_contact', score:9 },
  { id:'p44', cat:'ecole', name:'Paris Dauphine PSL', contact:'Service événements', phone:'01 44 05 44 05', email:'evenements@dauphine.fr', site:'dauphine.fr', taille:'1000+', quartier:'Paris 16e', valeur_mois:0, valeur_event:2000, type:'Catering conférences', pitch:'Université de référence en gestion. Colloques et events nombreux. Fort potentiel catering académique.', status:'to_contact', score:7 },
  { id:'p45', cat:'ecole', name:'HEC Paris (campus Jouy)', contact:'Events Office', phone:'01 39 67 70 00', email:'evenements@hec.fr', site:'hec.fr', taille:'1000+', quartier:'Jouy-en-Josas', valeur_mois:0, valeur_event:5000, type:'Catering grands events', pitch:'Meilleure business school Europe. Cérémonies, galas, events alumni Paris. Budget catering très élevé.', status:'to_contact', score:9 },

  // INSTITUTIONS
  { id:'p46', cat:'institution', name:'Mairie du 6e arrondissement', contact:'Protocole', phone:'01 40 46 40 46', email:'mairie06@paris.fr', site:'mairie06.paris.fr', taille:'100+', quartier:'Paris 6e', valeur_mois:300, valeur_event:1000, type:'Catering cérémonies', pitch:'Ta mairie ! Cérémonies officielles, vœux, réceptions. Argument de proximité et fierté locale très fort.', status:'to_contact', score:9 },
  { id:'p47', cat:'institution', name:'Sénat', contact:'Services intendance', phone:'01 42 34 20 00', email:'contact@senat.fr', site:'senat.fr', taille:'1000+', quartier:'Paris 6e', valeur_mois:0, valeur_event:3000, type:'Catering réceptions officielles', pitch:'Le Sénat est à 5 minutes de Meshuga. Réceptions officielles permanentes. Prestige et proximité.', status:'to_contact', score:8 },
  { id:'p48', cat:'institution', name:'Assemblée Nationale', contact:'Services généraux', phone:'01 40 63 60 00', email:'contact@assemblee-nationale.fr', site:'assemblee-nationale.fr', taille:'1000+', quartier:'Paris 7e', valeur_mois:0, valeur_event:4000, type:'Catering événements officiels', pitch:'Événements parlementaires réguliers. Proposer Meshuga pour les déjeuners de travail et réceptions.', status:'to_contact', score:7 },

  // BONUS - SECTEURS VARIÉS PARIS
  { id:'p49', cat:'startup', name:'Blablacar', contact:'Workplace Manager', phone:'—', email:'hello@blablacar.com', site:'blablacar.com', taille:'500+', quartier:'Paris 2e', valeur_mois:1200, valeur_event:2500, type:'Plateaux déjeuner', pitch:'Licorne française emblématique. Équipes importantes, culture startup forte. Budget food conséquent.', status:'to_contact', score:8 },
  { id:'p50', cat:'startup', name:'Zenly (Snap)', contact:'Office Experience', phone:'—', email:'—', site:'snap.com', taille:'200+', quartier:'Paris 11e', valeur_mois:800, valeur_event:2000, type:'Plateaux + events', pitch:'Équipe Snap Paris. Culture tech américaine = budget food and events élevé.', status:'to_contact', score:7 },
]

const CATS = [
  { key:'all', label:'Tous', emoji:'☰', color:'#191923' },
  { key:'evenementiel', label:'Événementiel', emoji:'🎉', color:'#005FFF' },
  { key:'avocats', label:'Avocats / Notaires', emoji:'⚖️', color:'#191923' },
  { key:'startup', label:'Startups', emoji:'🚀', color:'#009D3A' },
  { key:'agence_pub', label:'Agences créatives', emoji:'🎨', color:'#FF82D7' },
  { key:'hotel', label:'Hôtels', emoji:'🏨', color:'#FFEB5A' },
  { key:'immo', label:'Immobilier', emoji:'🏢', color:'#005FFF' },
  { key:'medical', label:'Médical', emoji:'🏥', color:'#009D3A' },
  { key:'production', label:'Tournages', emoji:'🎬', color:'#191923' },
  { key:'ecole', label:'Écoles', emoji:'🎓', color:'#FF82D7' },
  { key:'institution', label:'Institutions', emoji:'🏛️', color:'#FFEB5A' },
]

const STATUS_P:any = { to_contact:'À contacter', contacted:'Contacté', nego:'Négo', won:'Gagné', lost:'Perdu' }
const STATUS_PC:any = { to_contact:'#888', contacted:'#B8920A', nego:'#005FFF', won:'#009D3A', lost:'#CC0066' }
const TASK_S:any = { todo:'À faire', in_progress:'En cours', done:'Terminé ✓' }

// ─── INITIAL STATE ────────────────────────────────────────────────────────────
const INIT_TASKS = [
  { id:1, title:'Créer le kit B2B (menu plateaux, tarifs, contact)', assignee:'emy', deadline:'2026-03-28', status:'in_progress', priority:'high' },
  { id:2, title:'RDV Wagram Events — préparer la présentation', assignee:'emy', deadline:'2026-03-28', status:'todo', priority:'high' },
  { id:3, title:'Démarcher 5 agences événementielles cette semaine', assignee:'emy', deadline:'2026-03-29', status:'todo', priority:'medium' },
  { id:4, title:'Valider le menu B2B avec la cuisine', assignee:'edward', deadline:'2026-03-27', status:'todo', priority:'high' },
]
const INIT_PROSPECTS = [
  { id:1, name:'Agence Wagram Events', email:'contact@wagram.fr', phone:'01 40 xx xx xx', size:'10-50', category:'Événementiel', status:'contacted', nextAction:'Envoyer devis', nextDate:'2026-03-25', notes:'Intéressée par plateaux déjeuner. Budget ~800-1200€/event.', score:8 },
  { id:2, name:'Station F', email:'office@stationf.co', phone:'06 98 76 54 32', size:'200-1000', category:'Startup', status:'nego', nextAction:'Envoyer devis', nextDate:'2026-03-25', notes:'Commandes régulières pour équipes. URGENT.', score:9 },
]
const INIT_CONTACTS = [
  { id:1, cat:'food', name:'Maison Vérot', contact:'—', phone:'01 45 44 01 66', email:'contact@maisonverot.fr', notes:'Livraison lun-ven · 30j', vip:false },
  { id:2, cat:'banque', name:'BNP Paribas Vavin', contact:'Marie Dupont', phone:'01 56 xx xx xx', email:'m.dupont@bnp.fr', notes:'Gestionnaire pro', vip:false },
  { id:3, cat:'presse', name:'Le Fooding', contact:'—', phone:'—', email:'press@lefooding.com', notes:'', vip:true },
  { id:4, cat:'prestataire', name:'Clean Express', contact:'—', phone:'06 12 34 56 78', email:'info@cleanexpress.fr', notes:'Mardi + Vendredi', vip:false },
]
const INIT_VAULT = [
  { id:1, title:'Supabase', url:'https://supabase.com', user:'edward@meshuga.fr', pw:'' },
  { id:2, title:'Vercel', url:'https://vercel.com', user:'edward@meshuga.fr', pw:'' },
  { id:3, title:'Zelty', url:'https://app.zelty.fr', user:'edward@meshuga.fr', pw:'' },
  { id:4, title:'Deliveroo', url:'https://restaurant.deliveroo.fr', user:'edward@meshuga.fr', pw:'' },
]
const CAT_ANNUAIRE:any = { food:'🥩 Fournisseur food', banque:'🏦 Banque', presse:'📰 Presse', prestataire:'🔧 Prestataire', partenaire:'🤝 Partenaire', livraison:'🚲 Livraison' }

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile] = useState<any>(null)
  const [page, setPage] = useState('dash')
  const [tasks, setTasks] = useState(INIT_TASKS)
  const [prospects, setProspects] = useState(INIT_PROSPECTS)
  const [contacts, setContacts] = useState(INIT_CONTACTS)
  const [vault, setVault] = useState(INIT_VAULT)
  const [reports, setReports] = useState<any[]>([])
  const [chasse, setChasse] = useState(PROSPECTS_BASE.map(p => ({ ...p })))
  const [toastMsg, setToastMsg] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState<any>({})
  const [pwVisible, setPwVisible] = useState<any>({})
  const [chasseFilter, setChasseFilter] = useState('all')
  const [contactedToday, setContactedToday] = useState(0)

  useEffect(() => {
    const supabase = sb()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
          if (data) setProfile(data)
          else setProfile({ role: 'edward', full_name: 'Edward', email: user.email })
        })
      }
    })
  }, [])

  function toast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500) }
  function openModal(id: string, data: any = {}) { setForm(data); setModal(id) }
  function closeModal() { setModal(''); setForm({}) }

  const isEmy = profile?.role === 'emy'
  const today = new Date().toISOString().split('T')[0]
  const todayRelances = prospects.filter(p => p.nextDate === today && !['won','lost'].includes(p.status))
  const myTasks = isEmy ? tasks.filter(t => t.assignee === 'emy') : tasks
  const overdueTasks = tasks.filter(t => t.deadline < today && t.status !== 'done')
  const chasseFiltered = chasseFilter === 'all' ? chasse : chasse.filter(p => p.cat === chasseFilter)
  const chasseToContact = chasse.filter(p => p.status === 'to_contact').length
  const chasseContacted = chasse.filter(p => p.status !== 'to_contact').length

  function contactProspect(id: string) {
    setChasse(prev => prev.map(p => p.id === id ? { ...p, status: 'contacted' } : p))
    setContactedToday(c => c + 1)
    toast('Prospect marqué contacté ! Ajouté au CRM 🎯')
  }

  function advanceTask(id: number) {
    const order = ['todo','in_progress','done']
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const i = order.indexOf(t.status)
      return { ...t, status: i < order.length-1 ? order[i+1] : t.status }
    }))
    toast('Tâche avancée ✓')
  }

  function saveTask() {
    if (!form.title) { toast('Titre requis !'); return }
    if (form.id) {
      setTasks(prev => prev.map(t => t.id === form.id ? { ...form } : t))
    } else {
      setTasks(prev => [...prev, { ...form, id: Date.now(), status: 'todo' }])
    }
    closeModal()
    toast('Tâche sauvegardée ✓')
  }

  function saveProspect() {
    if (!form.name) { toast('Nom requis !'); return }
    if (form.id) {
      setProspects(prev => prev.map(p => p.id === form.id ? { ...form } : p))
    } else {
      setProspects(prev => [...prev, { ...form, id: Date.now(), status: 'to_contact' }])
    }
    closeModal()
    toast('Prospect sauvegardé ✓')
  }

  function saveContact() {
    if (!form.name) { toast('Nom requis !'); return }
    if (form.id) {
      setContacts(prev => prev.map(c => c.id === form.id ? { ...form } : c))
    } else {
      setContacts(prev => [...prev, { ...form, id: Date.now() }])
    }
    closeModal()
    toast('Contact sauvegardé ✓')
  }

  function saveVault() {
    if (!form.title) { toast('Nom requis !'); return }
    if (form.id) {
      setVault(prev => prev.map(v => v.id === form.id ? { ...form } : v))
    } else {
      setVault(prev => [...prev, { ...form, id: Date.now() }])
    }
    closeModal()
    toast('Accès sauvegardé 🔐')
  }

  function submitCR() {
    if (!form.week) { toast('Semaine requise !'); return }
    setReports(prev => [{ ...form, id: Date.now(), status: 'submitted', date: new Date().toLocaleDateString('fr-FR') }, ...prev])
    closeModal()
    toast('CR soumis à Edward 📧')
  }

  const NAV_EDWARD = [
    { id:'dash', label:'Dashboard', icon:'⚡' },
    { id:'crm', label:'CRM Prospects', icon:'◎' },
    { id:'chasse', label:'Tableau de chasse', icon:'🎯' },
    { id:'annuaire', label:'Annuaire', icon:'📒' },
    { id:'tasks', label:'Tâches', icon:'✓' },
    { id:'reporting', label:'Reporting', icon:'📋', badge: reports.filter(r => r.status === 'submitted').length },
    { id:'vault', label:'Coffre-fort', icon:'🔐' },
    { id:'gmb', label:'Google My Biz.', icon:'⭐' },
  ]

  const NAV_EMY = [
    { id:'dash', label:'Mon Dashboard', icon:'⚡' },
    { id:'chasse', label:'Tableau de chasse', icon:'🎯' },
    { id:'crm', label:'Mes prospects', icon:'◎' },
    { id:'tasks', label:'Mes tâches', icon:'✓' },
    { id:'reporting', label:'Compte-rendu', icon:'📋' },
  ]

  const NAV = isEmy ? NAV_EMY : NAV_EDWARD

  if (!profile) return (
    <>
      <style>{G}</style>
      <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center', background:'#FFEB5A' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>😬</div>
          <div style={{ fontWeight:900, fontSize:14, textTransform:'uppercase', letterSpacing:3 }}>Chargement…</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{G}</style>
      <div className="app">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sb-logo">
            <div className="sb-stamp">😬</div>
            <div>
              <div style={{ fontWeight:900, fontSize:18, textTransform:'uppercase', letterSpacing:2, lineHeight:1 }}>meshuga</div>
              <div className="yt" style={{ fontSize:12, opacity:.45 }}>B2B Manager</div>
            </div>
          </div>
          <nav className="sb-nav">
            <div className="sb-sec">{isEmy ? 'Emy — Navigation' : 'Edward — Navigation'}</div>
            {NAV.map(n => (
              <div key={n.id} className={`ni${page === n.id ? ' active' : ''}`} onClick={() => setPage(n.id)}>
                <span style={{ fontSize:14 }}>{n.icon}</span>
                {n.label}
                {n.badge && n.badge > 0 ? <span className="nb">{n.badge}</span> : null}
              </div>
            ))}
          </nav>
          <div style={{ padding:'10px 12px 14px', borderTop:'3px solid #191923' }}>
            <div className="yt" style={{ fontSize:11, opacity:.35, marginBottom:5 }}>Connecté</div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:4, border:'2px solid #191923', background: isEmy ? '#FF82D7' : '#FFEB5A', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:13 }}>
                {profile.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontWeight:900, fontSize:11, textTransform:'uppercase' }}>{profile.full_name || profile.email}</div>
                <div className="yt" style={{ fontSize:11, opacity:.4 }}>{isEmy ? 'B2B Manager' : 'The Big Boss'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          <div className="strip" />

          {/* ══ DASHBOARD ══════════════════════════════════════════════════ */}
          {page === 'dash' && !isEmy && (
            <div>
              <div className="ph">
                <div><div className="pt">Bonjour Edward 👋</div><div className="ps">Vue patron · {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</div></div>
                <div style={{ fontSize:28 }}>😬</div>
              </div>

              {/* Alertes relances */}
              {todayRelances.length > 0 && (
                <div className="card-p">
                  <div className="ct">⏰ Relances du jour</div>
                  {todayRelances.map(p => (
                    <div key={p.id} className="al">
                      <span style={{ fontSize:18 }}>📅</span>
                      <div style={{ flex:1 }}><div style={{ fontWeight:900, fontSize:13 }}>{p.name}</div><div style={{ fontSize:10, opacity:.6 }}>{p.nextAction}</div></div>
                      <span style={{ fontSize:9, fontWeight:900, background:'#191923', color:'#FFEB5A', padding:'2px 7px', borderRadius:3 }}>Aujourd'hui</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="g4">
                <div className="kc" style={{ background:'#FFEB5A' }}><div className="kl">Pipeline B2B</div><div className="kv">{prospects.filter(p => !['won','lost'].includes(p.status)).length}</div><div className="ki">🎯</div></div>
                <div className="kc" style={{ background:'#FF82D7' }}><div className="kl">Prospects chasse</div><div className="kv">{chasseToContact}</div><div className="ki">🏹</div></div>
                <div className="kc" style={{ background:'#FFFFFF' }}><div className="kl">Tâches actives</div><div className="kv">{tasks.filter(t => t.status !== 'done').length}</div><div className="ki">✓</div></div>
                <div className="kc" style={{ background: overdueTasks.length > 0 ? '#FF82D7' : '#FFFFFF' }}><div className="kl">En retard</div><div className="kv" style={{ color: overdueTasks.length > 0 ? '#CC0066' : '#191923' }}>{overdueTasks.length}</div><div className="ki">⚠️</div></div>
              </div>

              <div className="g2">
                <div className="card">
                  <div className="ct">Tâches en cours</div>
                  {tasks.filter(t => t.status !== 'done').slice(0,4).map(t => (
                    <div key={t.id} className="row" style={{ gridTemplateColumns:'4px 1fr auto', gap:10 }}>
                      <div className="pbar" style={{ background: t.priority === 'high' ? '#FF82D7' : '#005FFF' }} />
                      <div><div style={{ fontSize:12, fontWeight:900 }}>{t.title}</div><div style={{ fontSize:10, opacity:.5 }}>📅 {t.deadline} · {t.assignee}</div></div>
                      <span className="badge" style={{ color: t.status === 'in_progress' ? '#005FFF' : '#888', borderColor: t.status === 'in_progress' ? '#005FFF' : '#ccc' }}>{TASK_S[t.status]}</span>
                    </div>
                  ))}
                  <button className="btn btn-y btn-sm" style={{ marginTop:10 }} onClick={() => setPage('tasks')}>Gérer les tâches →</button>
                </div>
                <div className="card">
                  <div className="ct">📋 Dernier CR d'Emy</div>
                  {reports.length > 0 ? (
                    <div>
                      <div style={{ background:'#FFEB5A', border:'2px solid #191923', borderRadius:5, padding:10, marginBottom:8 }}>
                        <div className="yt" style={{ fontSize:13, opacity:.5, marginBottom:4 }}>{reports[0].week}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6 }}>
                          {[['Prospects',reports[0].prospects],['RDV',reports[0].rdv],['Cmdes',reports[0].cmds]].map(([l,v]) => (
                            <div key={l as string} style={{ background:'#fff', border:'1.5px solid #191923', borderRadius:4, padding:'6px', textAlign:'center' }}>
                              <div style={{ fontWeight:900, fontSize:18 }}>{v}</div>
                              <div className="yt" style={{ fontSize:10, opacity:.5 }}>{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button className="btn btn-y btn-sm" onClick={() => setPage('reporting')}>Voir et répondre →</button>
                    </div>
                  ) : (
                    <div style={{ fontSize:12, opacity:.5, textAlign:'center', padding:20 }}>Aucun CR soumis pour l'instant</div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="ct">🎯 Tableau de chasse — aperçu</div>
                <div style={{ fontSize:12, marginBottom:10 }}>
                  <strong>{chasseToContact}</strong> prospects à contacter · <strong>{chasseContacted}</strong> contactés
                </div>
                {chasse.filter(p => p.score >= 9).slice(0,3).map(p => (
                  <div key={p.id} className="row" style={{ gridTemplateColumns:'1fr auto auto', gap:10 }}>
                    <div><div style={{ fontWeight:900, fontSize:13 }}>{p.name}</div><div style={{ fontSize:10, opacity:.5 }}>{p.type} · {p.quartier}</div></div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:11, fontWeight:900 }}>{p.valeur_event > 0 ? p.valeur_event+'€' : p.valeur_mois+'€/mois'}</div>
                      <div style={{ fontSize:10, opacity:.5 }}>estimé</div>
                    </div>
                    <span className="badge" style={{ color:'#009D3A', borderColor:'#009D3A' }}>Score {p.score}/10</span>
                  </div>
                ))}
                <button className="btn btn-y btn-sm" style={{ marginTop:10 }} onClick={() => setPage('chasse')}>Voir tout le tableau →</button>
              </div>
            </div>
          )}

          {/* ══ DASHBOARD EMY ══════════════════════════════════════════════ */}
          {page === 'dash' && isEmy && (
            <div>
              <div className="ph">
                <div><div className="pt">Bonjour Emy 🌸</div><div className="ps">Tes missions · {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</div></div>
                <button className="btn btn-n btn-sm" onClick={() => openModal('cr')}>+ Nouveau CR</button>
              </div>

              {/* CHASSE PROGRESS */}
              <div className="card-p" style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div className="ct" style={{ margin:0 }}>🎯 Objectif prospection du jour</div>
                  <button className="btn btn-n btn-sm" onClick={() => setPage('chasse')}>Voir le tableau →</button>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <span style={{ fontWeight:900, fontSize:13 }}>Prospects contactés aujourd'hui</span>
                  <span style={{ fontWeight:900, fontSize:18, color: contactedToday >= 5 ? '#009D3A' : '#191923' }}>{contactedToday} / 5</span>
                </div>
                <div className="prog-wrap">
                  <div className="prog-fill" style={{ width:`${Math.min(contactedToday/5*100, 100)}%`, background: contactedToday >= 5 ? '#009D3A' : '#191923' }} />
                </div>
                {contactedToday >= 5 && <div style={{ marginTop:8, fontWeight:900, fontSize:12, color:'#009D3A' }}>🎉 Objectif atteint ! Tu assures Emy !</div>}
              </div>

              {/* Relances urgentes */}
              {todayRelances.length > 0 && (
                <div className="card-p" style={{ marginBottom:12 }}>
                  <div className="ct">⚠️ Relances urgentes</div>
                  {todayRelances.map(p => (
                    <div key={p.id} className="al">
                      <span style={{ fontSize:18 }}>📅</span>
                      <div style={{ flex:1 }}><div style={{ fontWeight:900, fontSize:13 }}>{p.name}</div><div style={{ fontSize:10, opacity:.6 }}>{p.nextAction} · {p.phone}</div></div>
                      <span style={{ fontSize:9, fontWeight:900, background:'#191923', color:'#FFEB5A', padding:'2px 7px', borderRadius:3 }}>Urgent</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="g2">
                <div className="card">
                  <div className="ct">Mes tâches actives</div>
                  {tasks.filter(t => t.assignee === 'emy' && t.status !== 'done').slice(0,4).map(t => (
                    <div key={t.id} className="row" style={{ gridTemplateColumns:'4px 1fr auto', gap:10 }}>
                      <div className="pbar" style={{ background: t.priority === 'high' ? '#FF82D7' : '#005FFF' }} />
                      <div><div style={{ fontSize:12, fontWeight:900 }}>{t.title}</div><div style={{ fontSize:10, opacity:.5 }}>📅 {t.deadline}</div></div>
                      <button className="btn btn-sm btn-y" onClick={() => advanceTask(t.id)}>→</button>
                    </div>
                  ))}
                  {tasks.filter(t => t.assignee === 'emy' && t.status !== 'done').length === 0 && (
                    <div style={{ textAlign:'center', padding:20, fontSize:12, opacity:.5 }}>Toutes les tâches sont terminées ✓</div>
                  )}
                </div>
                <div className="card">
                  <div className="ct">Mon pipeline</div>
                  {prospects.map(p => (
                    <div key={p.id} className="row" style={{ gridTemplateColumns:'1fr auto', gap:8 }}>
                      <div><div style={{ fontSize:13, fontWeight:900 }}>{p.name}</div><div style={{ fontSize:10, opacity:.5 }}>{p.nextAction} · {p.nextDate}</div></div>
                      <span className="badge" style={{ color:STATUS_PC[p.status], borderColor:STATUS_PC[p.status] }}>{STATUS_P[p.status]}</span>
                    </div>
                  ))}
                  <button className="btn btn-y btn-sm" style={{ marginTop:10 }} onClick={() => setPage('crm')}>Tout le CRM →</button>
                </div>
              </div>

              {/* Retour Edward */}
              {reports.filter(r => r.feedback).length > 0 && (
                <div className="card-y">
                  <div className="ct">💬 Retour d'Edward</div>
                  <div style={{ background:'#fff', border:'2px solid #191923', borderRadius:5, padding:10, fontSize:12 }}>
                    <div className="yt" style={{ fontSize:14, marginBottom:4 }}>{reports.find(r => r.feedback)?.week}</div>
                    {reports.find(r => r.feedback)?.feedback}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ TABLEAU DE CHASSE ══════════════════════════════════════════ */}
          {page === 'chasse' && (
            <div>
              <div className="ph">
                <div>
                  <div className="pt">Tableau de Chasse 🎯</div>
                  <div className="ps">{chasseToContact} prospects à contacter · {chasseContacted} contactés · Paris et IDF</div>
                </div>
                {isEmy && (
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontWeight:900, fontSize:12, marginBottom:4 }}>Objectif : {contactedToday} / 5 aujourd'hui</div>
                    <div className="prog-wrap" style={{ width:160 }}>
                      <div className="prog-fill" style={{ width:`${Math.min(contactedToday/5*100, 100)}%`, background: contactedToday >= 5 ? '#009D3A' : '#191923' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Filtres catégories */}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {CATS.map(c => (
                  <div key={c.key} className={`tag${chasseFilter === c.key ? ' on' : ''}`} onClick={() => setChasseFilter(c.key)}
                    style={{ background: chasseFilter === c.key ? '#191923' : '#fff', color: chasseFilter === c.key ? '#FFEB5A' : '#191923' }}>
                    {c.emoji} {c.label}
                  </div>
                ))}
              </div>

              {/* Liste prospects */}
              {chasseFiltered.map(p => (
                <div key={p.id} className="chasse-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', padding:'2px 6px', border:'1.5px solid #191923', borderRadius:3, background: CATS.find(c => c.key === p.cat)?.color === '#FFEB5A' ? '#FFEB5A' : p.cat === 'avocats' ? '#191923' : p.cat === 'startup' ? 'rgba(0,157,58,.15)' : '#FF82D7', color: p.cat === 'avocats' ? '#FFEB5A' : '#191923' }}>
                          {CATS.find(c => c.key === p.cat)?.emoji} {CATS.find(c => c.key === p.cat)?.label}
                        </span>
                        <span style={{ fontSize:9, fontWeight:900, background: p.score >= 9 ? '#FFEB5A' : p.score >= 7 ? '#EBEBEB' : '#EBEBEB', border:'1.5px solid #191923', borderRadius:3, padding:'2px 6px' }}>
                          {'★'.repeat(p.score >= 9 ? 3 : p.score >= 7 ? 2 : 1)} Score {p.score}/10
                        </span>
                        {p.status !== 'to_contact' && (
                          <span className="badge" style={{ color:STATUS_PC[p.status], borderColor:STATUS_PC[p.status] }}>{STATUS_P[p.status]}</span>
                        )}
                      </div>
                      <div style={{ fontWeight:900, fontSize:15 }}>{p.name}</div>
                      <div style={{ fontSize:11, opacity:.5 }}>{p.quartier} · {p.taille} emp.</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                      {p.valeur_event > 0 && <div style={{ fontWeight:900, fontSize:14 }}>~{p.valeur_event}€</div>}
                      {p.valeur_mois > 0 && <div style={{ fontWeight:900, fontSize:14 }}>~{p.valeur_mois}€/mois</div>}
                      <div style={{ fontSize:9, opacity:.5, textTransform:'uppercase', letterSpacing:1 }}>{p.type}</div>
                    </div>
                  </div>

                  <div style={{ background:'#FFEB5A', border:'1.5px solid #191923', borderRadius:5, padding:'8px 10px', marginBottom:8, fontSize:12 }}>
                    <span style={{ fontWeight:900 }}>💡 Angle d'approche : </span>{p.pitch}
                  </div>

                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:11 }}>
                    {p.email && p.email !== '—' && <span>✉️ {p.email}</span>}
                    {p.phone && p.phone !== '—' && <span>📞 {p.phone}</span>}
                    {p.site && p.site !== '—' && <span>🌐 {p.site}</span>}
                  </div>

                  {p.status === 'to_contact' && (
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      <button className="btn btn-g btn-sm" onClick={() => contactProspect(p.id)}>✓ J'ai contacté</button>
                      <button className="btn btn-y btn-sm" onClick={() => {
                        setProspects(prev => [...prev, { id: Date.now(), name: p.name, email: p.email, phone: p.phone, size: p.taille, category: CATS.find(c => c.key === p.cat)?.label || '', status:'to_contact', nextAction:'Premier contact', nextDate:'', notes: p.pitch, score: p.score }])
                        toast('Ajouté au CRM !')
                      }}>+ Ajouter au CRM</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ══ CRM ══════════════════════════════════════════════════════════ */}
          {page === 'crm' && (
            <div>
              <div className="ph">
                <div><div className="pt">CRM Prospects</div><div className="ps">{prospects.length} prospects · Pipeline B2B</div></div>
                <button className="btn btn-y" onClick={() => openModal('prospect', { assignee:'emy', status:'to_contact', priority:'medium' })}>+ Nouveau prospect</button>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                {Object.entries(STATUS_P).map(([k,v]) => (
                  <div key={k} style={{ background:'#fff', border:'2px solid #191923', borderRadius:5, padding:'8px 14px', textAlign:'center', minWidth:80, boxShadow:'2px 2px 0 #191923' }}>
                    <div style={{ fontWeight:900, fontSize:24 }}>{prospects.filter(p => p.status === k).length}</div>
                    <div className="yt" style={{ fontSize:12, opacity:.6 }}>{v as string}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'9px 14px', background:'#FF82D7', borderBottom:'2px solid #191923' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1.1fr .8fr 1.2fr 80px', gap:8, alignItems:'center' }}>
                    {['Entreprise','Contact / Email','Statut','Prochaine relance',''].map(h => (
                      <span key={h} className="yt" style={{ fontSize:13, opacity:.7 }}>{h}</span>
                    ))}
                  </div>
                </div>
                <div style={{ padding:'0 14px' }}>
                  {prospects.map(p => (
                    <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1.8fr 1.1fr .8fr 1.2fr 80px', gap:8, alignItems:'center', padding:'10px 0', borderBottom:'2px solid #EBEBEB' }}>
                      <div><div style={{ fontWeight:900, fontSize:13 }}>{p.name}</div><div style={{ fontSize:10, opacity:.5 }}>{p.category} · {p.size}</div></div>
                      <div><div style={{ fontSize:12 }}>{p.email}</div><div style={{ fontSize:10, opacity:.5 }}>{p.phone}</div></div>
                      <span className="badge" style={{ color:STATUS_PC[p.status], borderColor:STATUS_PC[p.status] }}>{STATUS_P[p.status]}</span>
                      <div><div style={{ fontSize:12, fontWeight:900, color: p.nextDate <= today && p.status !== 'won' ? '#CC0066' : '#191923' }}>{p.nextDate <= today && p.status !== 'won' ? '⚠️ ' : '📅 '}{p.nextAction}</div><div style={{ fontSize:10, opacity:.5 }}>{p.nextDate}</div></div>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-y btn-sm" onClick={() => openModal('prospect', { ...p })}>✏️</button>
                        <button className="btn btn-sm" onClick={() => { setProspects(prev => prev.filter(x => x.id !== p.id)); toast('Supprimé') }}>✕</button>
                      </div>
                    </div>
                  ))}
                  {prospects.length === 0 && <div style={{ textAlign:'center', padding:40, opacity:.4, fontSize:12, fontWeight:900, textTransform:'uppercase' }}>Aucun prospect — allez Emy ! 🚀</div>}
                </div>
              </div>
            </div>
          )}

          {/* ══ ANNUAIRE ═══════════════════════════════════════════════════ */}
          {page === 'annuaire' && (
            <div>
              <div className="ph">
                <div><div className="pt">Annuaire</div><div className="ps">{contacts.length} contacts essentiels Meshuga</div></div>
                <button className="btn btn-y" onClick={() => openModal('contact', { cat:'food', vip:false })}>+ Ajouter</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                {contacts.map(c => (
                  <div key={c.id} className="card" style={{ cursor:'pointer' }}>
                    <div style={{ fontSize:9, fontWeight:900, textTransform:'uppercase', padding:'2px 6px', border:'1.5px solid #191923', borderRadius:3, display:'inline-block', marginBottom:7, background: ['banque','presse'].includes(c.cat) ? '#FF82D7' : '#FFEB5A' }}>
                      {CAT_ANNUAIRE[c.cat] || c.cat}
                    </div>
                    {c.vip && <span style={{ float:'right', fontSize:10, fontWeight:900 }}>⭐ VIP</span>}
                    <div style={{ fontWeight:900, fontSize:14 }}>{c.name}</div>
                    {c.contact && c.contact !== '—' && <div style={{ fontSize:11, opacity:.6 }}>{c.contact}</div>}
                    {c.phone && c.phone !== '—' && <div style={{ fontSize:11, marginTop:4 }}>📞 {c.phone}</div>}
                    {c.email && <div style={{ fontSize:11, marginTop:2 }}>✉️ {c.email}</div>}
                    {c.notes && <div style={{ fontSize:10, fontWeight:900, opacity:.4, marginTop:6, textTransform:'uppercase' }}>{c.notes}</div>}
                    <button className="btn btn-sm" style={{ marginTop:8, float:'right' }} onClick={() => openModal('contact', { ...c })}>✏️</button>
                  </div>
                ))}
                <div className="card" style={{ border:'2px dashed #191923', boxShadow:'none', display:'flex', alignItems:'center', justifyContent:'center', minHeight:100, cursor:'pointer', opacity:.4 }} onClick={() => openModal('contact', { cat:'food', vip:false })}>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:24 }}>+</div><div style={{ fontSize:10, fontWeight:900, textTransform:'uppercase' }}>Ajouter</div></div>
                </div>
              </div>
            </div>
          )}

          {/* ══ TÂCHES ══════════════════════════════════════════════════════ */}
          {page === 'tasks' && (
            <div>
              <div className="ph">
                <div><div className="pt">Tâches</div><div className="ps">{myTasks.filter(t => t.status !== 'done').length} actives · {myTasks.filter(t => t.status === 'done').length} terminées</div></div>
                <button className="btn btn-y" onClick={() => openModal('task', { assignee: isEmy ? 'emy' : 'emy', priority:'medium', status:'todo' })}>+ Nouvelle tâche</button>
              </div>
              <div className="card">
                {myTasks.map(t => (
                  <div key={t.id} className="row" style={{ gridTemplateColumns:'4px 1fr auto auto', gap:10 }}>
                    <div className="pbar" style={{ background: t.priority === 'high' ? '#FF82D7' : t.priority === 'medium' ? '#005FFF' : '#009D3A' }} />
                    <div style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', opacity: t.status === 'done' ? .4 : 1 }}>
                      <div style={{ fontSize:13, fontWeight:900 }}>{t.title}</div>
                      <div style={{ fontSize:10, opacity:.5 }}>📅 {t.deadline} · {t.assignee}</div>
                    </div>
                    <span className="badge" style={{ color: t.status === 'in_progress' ? '#005FFF' : t.status === 'done' ? '#009D3A' : '#888', borderColor: t.status === 'in_progress' ? '#005FFF' : t.status === 'done' ? '#009D3A' : '#ccc' }}>{TASK_S[t.status]}</span>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-y btn-sm" onClick={() => advanceTask(t.id)}>→</button>
                      {!isEmy && <button className="btn btn-sm" onClick={() => openModal('task', { ...t })}>✏️</button>}
                      {!isEmy && <button className="btn btn-sm" onClick={() => { setTasks(prev => prev.filter(x => x.id !== t.id)); toast('Supprimé') }}>✕</button>}
                    </div>
                  </div>
                ))}
                {myTasks.length === 0 && <div style={{ textAlign:'center', padding:40, opacity:.4, fontSize:12, fontWeight:900, textTransform:'uppercase' }}>Aucune tâche</div>}
              </div>
            </div>
          )}

          {/* ══ REPORTING ═══════════════════════════════════════════════════ */}
          {page === 'reporting' && (
            <div>
              <div className="ph">
                <div><div className="pt">Reporting</div><div className="ps">Compte-rendus hebdo Emy → Edward</div></div>
                {isEmy && <button className="btn btn-n" onClick={() => openModal('cr', {})}>+ Nouveau CR</button>}
              </div>
              {reports.map((r, i) => (
                <div key={r.id} className="card-y" style={{ border:'2px solid #191923', borderRadius:7, boxShadow:'3px 3px 0 #191923' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <div><div className="yt" style={{ fontSize:12, opacity:.5 }}>{r.date}</div><div style={{ fontWeight:900, fontSize:18, textTransform:'uppercase' }}>{r.week}</div></div>
                    <span className="badge" style={{ color: r.status === 'submitted' ? '#005FFF' : '#009D3A', borderColor: r.status === 'submitted' ? '#005FFF' : '#009D3A' }}>{r.status === 'submitted' ? 'Soumis' : 'Lu ✓'}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
                    {[['Prospects',r.prospects],['RDV',r.rdv],['Commandes',r.cmds]].map(([l,v]) => (
                      <div key={l as string} style={{ background:'#fff', border:'1.5px solid #191923', borderRadius:4, padding:'8px', textAlign:'center' }}>
                        <div style={{ fontWeight:900, fontSize:22 }}>{v}</div>
                        <div className="yt" style={{ fontSize:11, opacity:.5 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {r.wins && <div style={{ background:'#fff', border:'2px solid #191923', borderRadius:5, padding:10, marginBottom:8 }}><div className="yt" style={{ fontSize:14, color:'#FF82D7', marginBottom:4 }}>✅ Victoires</div><div style={{ fontSize:12 }}>{r.wins}</div></div>}
                  {r.next && <div style={{ background:'#fff', border:'2px solid #191923', borderRadius:5, padding:10, marginBottom:8 }}><div className="yt" style={{ fontSize:14, color:'#FF82D7', marginBottom:4 }}>🎯 Priorités S+1</div><div style={{ fontSize:12 }}>{r.next}</div></div>}
                  {r.feedback && <div style={{ background:'#FF82D7', border:'2px solid #191923', borderRadius:5, padding:10 }}><div className="yt" style={{ fontSize:14, marginBottom:4 }}>💬 Retour d'Edward</div><div style={{ fontSize:12 }}>{r.feedback}</div></div>}
                  {!isEmy && !r.feedback && (
                    <div style={{ marginTop:10 }}>
                      <div className="lbl">💬 Ton retour à Emy</div>
                      <textarea className="inp" placeholder="Bravo, recadrages, directives…" id={`fb-${r.id}`} style={{ minHeight:60 }} />
                      <button className="btn btn-y btn-sm" style={{ marginTop:6 }} onClick={() => {
                        const val = (document.getElementById(`fb-${r.id}`) as HTMLTextAreaElement)?.value
                        if (val) { setReports(prev => prev.map((x,j) => j === i ? { ...x, feedback: val, status:'read' } : x)); toast('Retour envoyé à Emy ✓') }
                      }}>Envoyer le retour</button>
                    </div>
                  )}
                </div>
              ))}
              {reports.length === 0 && (
                <div className="card" style={{ textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
                  <div style={{ fontWeight:900, textTransform:'uppercase' }}>Aucun CR pour l'instant</div>
                  {isEmy && <button className="btn btn-y" style={{ marginTop:14 }} onClick={() => openModal('cr', {})}>Créer le premier CR</button>}
                </div>
              )}
            </div>
          )}

          {/* ══ COFFRE-FORT ══════════════════════════════════════════════════ */}
          {page === 'vault' && !isEmy && (
            <div>
              <div className="ph">
                <div><div className="pt">Coffre-fort 🔐</div><div className="ps">Accès aux sites importants</div></div>
                <button className="btn btn-y" onClick={() => openModal('vault', {})}>+ Ajouter</button>
              </div>
              <div className="card-p" style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', marginBottom:12 }}>
                <span style={{ fontSize:16 }}>🔒</span>
                <span style={{ fontSize:11, fontWeight:900, textTransform:'uppercase', letterSpacing:.5 }}>Données privées · Visible uniquement par Edward</span>
              </div>
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'9px 16px', background:'#FF82D7', borderBottom:'2px solid #191923' }}>
                  <div className="vault-row" style={{ borderBottom:'none', padding:0 }}>
                    {['Site','URL','Identifiant','Mot de passe',''].map(h => <span key={h} className="yt" style={{ fontSize:13, opacity:.7 }}>{h}</span>)}
                  </div>
                </div>
                <div style={{ padding:'0 16px' }}>
                  {vault.map((v, i) => (
                    <div key={v.id} className="vault-row">
                      <div style={{ fontWeight:900, fontSize:13 }}>{v.title}</div>
                      <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'#005FFF', textDecoration:'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.url}</a>
                      <div style={{ fontSize:12 }}>{v.user}</div>
                      <div style={{ fontFamily:'monospace', letterSpacing: pwVisible[i] ? 'normal' : 3, fontSize:12 }}>{pwVisible[i] ? (v.pw || '(vide)') : '••••••••'}</div>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-y btn-sm" onClick={() => setPwVisible((prev:any) => ({ ...prev, [i]: !prev[i] }))}>{pwVisible[i] ? '🙈' : '👁'}</button>
                        <button className="btn btn-sm" onClick={() => openModal('vault', { ...v })}>✏️</button>
                        <button className="btn btn-sm" onClick={() => { setVault(prev => prev.filter(x => x.id !== v.id)); toast('Supprimé') }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ VAULT RESTRICTED ══════════════════════════════════════════ */}
          {page === 'vault' && isEmy && (
            <div>
              <div className="strip" />
              <div className="pt">Coffre-fort 🔐</div>
              <div className="ps">Accès restreint</div>
              <div className="card" style={{ textAlign:'center', padding:40, marginTop:14 }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
                <div style={{ fontWeight:900, fontSize:16, textTransform:'uppercase', marginBottom:8 }}>Accès réservé à Edward</div>
                <div style={{ fontSize:12, opacity:.5 }}>Les mots de passe sont privés et sécurisés.</div>
              </div>
            </div>
          )}

          {/* ══ GMB ══════════════════════════════════════════════════════════ */}
          {page === 'gmb' && (
            <div>
              <div className="ph">
                <div><div className="pt">Google My Business</div><div className="ps">Avis · Visibilité · Fiche établissement</div></div>
                <span className="badge" style={{ color:'#009D3A', borderColor:'#009D3A', fontSize:10, padding:'4px 10px' }}>● Connexion requise</span>
              </div>
              <div className="card-y">
                <div className="ct">🔗 Connecter Google My Business</div>
                <p style={{ fontSize:13, marginBottom:14 }}>Une fois connecté, tu verras tes avis, ta note globale et tu pourras répondre directement depuis ici.</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {['1. Aller sur console.cloud.google.com → projet meshuga-manager','2. APIs & Services → Credentials → Identifiants OAuth déjà créés','3. Ajouter NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID sur Vercel','4. Ajouter GOOGLE_GMB_CLIENT_SECRET sur Vercel','5. Redéployer puis cliquer "Se connecter" ci-dessous'].map((s, i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                      <div style={{ width:22, height:22, borderRadius:4, background:'#191923', color:'#FFEB5A', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0 }}>{i+1}</div>
                      <span style={{ fontSize:12 }}>{s.slice(3)}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-n" onClick={() => { const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID}&redirect_uri=${window.location.origin}/api/auth/google/callback&response_type=code&scope=https://www.googleapis.com/auth/business.manage&access_type=offline&prompt=consent`; window.location.href = url }}>
                  Se connecter avec Google →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ════════════════════════════════════════════════════════════ */}

      {/* MODAL PROSPECT */}
      {modal === 'prospect' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier le prospect' : 'Nouveau prospect'}</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg" style={{ gridColumn:'1/-1' }}><label className="lbl">Entreprise *</label><input className="inp" value={form.name||''} onChange={e => setForm({...form,name:e.target.value})} placeholder="Nom de l'entreprise…" /></div>
                <div className="fg"><label className="lbl">Email</label><input type="email" className="inp" value={form.email||''} onChange={e => setForm({...form,email:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e => setForm({...form,phone:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Taille</label><select className="inp sel" value={form.size||''} onChange={e => setForm({...form,size:e.target.value})}><option value="">—</option><option>1-10</option><option>10-50</option><option>50-200</option><option>200-1000</option><option>1000+</option></select></div>
                <div className="fg"><label className="lbl">Catégorie</label><select className="inp sel" value={form.category||''} onChange={e => setForm({...form,category:e.target.value})}><option value="">—</option><option>Événementiel</option><option>Corporate</option><option>Startup</option><option>Avocats</option><option>Hôtellerie</option><option>Immobilier</option><option>Production</option><option>Institution</option><option>Autre</option></select></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'to_contact'} onChange={e => setForm({...form,status:e.target.value})}>{Object.entries(STATUS_P).map(([k,v]) => <option key={k} value={k}>{v as string}</option>)}</select></div>
                <div className="fg"><label className="lbl">Priorité</label><select className="inp sel" value={form.priority||'medium'} onChange={e => setForm({...form,priority:e.target.value})}><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select></div>
                <div className="fg" style={{ gridColumn:'1/-1' }}>
                  <label className="lbl">📅 Prochaine relance</label>
                  <div style={{ display:'flex', gap:6 }}>
                    <input type="date" className="inp" style={{ flex:1 }} value={form.nextDate||''} onChange={e => setForm({...form,nextDate:e.target.value})} />
                    <button type="button" className="btn btn-sm" onClick={() => { const d=new Date(); d.setDate(d.getDate()+7); setForm({...form,nextDate:d.toISOString().split('T')[0]}) }}>+7j</button>
                    <button type="button" className="btn btn-sm" onClick={() => { const d=new Date(); d.setDate(d.getDate()+14); setForm({...form,nextDate:d.toISOString().split('T')[0]}) }}>+14j</button>
                  </div>
                  <input className="inp" style={{ marginTop:6 }} value={form.nextAction||''} onChange={e => setForm({...form,nextAction:e.target.value})} placeholder="Action prévue : appeler, envoyer devis…" />
                </div>
                <div className="fg" style={{ gridColumn:'1/-1' }}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} /></div>
              </div>
            </div>
            <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveProspect}>Sauvegarder</button></div>
          </div>
        </div>
      )}

      {/* MODAL TÂCHE */}
      {modal === 'task' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier la tâche' : 'Nouvelle tâche'}</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg" style={{ gridColumn:'1/-1' }}><label className="lbl">Titre *</label><input className="inp" value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Assignée à</label><select className="inp sel" value={form.assignee||'emy'} onChange={e => setForm({...form,assignee:e.target.value})}><option value="emy">Emy</option><option value="edward">Edward</option></select></div>
                <div className="fg"><label className="lbl">Deadline</label><input type="date" className="inp" value={form.deadline||''} onChange={e => setForm({...form,deadline:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Priorité</label><select className="inp sel" value={form.priority||'medium'} onChange={e => setForm({...form,priority:e.target.value})}><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select></div>
                <div className="fg"><label className="lbl">Statut</label><select className="inp sel" value={form.status||'todo'} onChange={e => setForm({...form,status:e.target.value})}>{Object.entries(TASK_S).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
            </div>
            <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveTask}>Sauvegarder</button></div>
          </div>
        </div>
      )}

      {/* MODAL CONTACT */}
      {modal === 'contact' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier le contact' : 'Nouveau contact'}</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg"><label className="lbl">Catégorie *</label><select className="inp sel" value={form.cat||'food'} onChange={e => setForm({...form,cat:e.target.value})}>{Object.entries(CAT_ANNUAIRE).map(([k,v]) => <option key={k} value={k}>{v as string}</option>)}</select></div>
                <div className="fg" style={{ display:'flex', alignItems:'center', gap:8, paddingTop:22 }}><input type="checkbox" checked={!!form.vip} onChange={e => setForm({...form,vip:e.target.checked})} style={{ width:16, height:16 }} /><span style={{ fontSize:12 }}>VIP ★</span></div>
                <div className="fg"><label className="lbl">Nom *</label><input className="inp" value={form.name||''} onChange={e => setForm({...form,name:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Contact</label><input className="inp" value={form.contact||''} onChange={e => setForm({...form,contact:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Téléphone</label><input className="inp" value={form.phone||''} onChange={e => setForm({...form,phone:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Email</label><input className="inp" value={form.email||''} onChange={e => setForm({...form,email:e.target.value})} /></div>
                <div className="fg" style={{ gridColumn:'1/-1' }}><label className="lbl">Notes</label><textarea className="inp" value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} /></div>
              </div>
            </div>
            <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveContact}>Sauvegarder</button></div>
          </div>
        </div>
      )}

      {/* MODAL VAULT */}
      {modal === 'vault' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh"><div className="mt">{form.id ? 'Modifier' : 'Nouvel accès'} 🔐</div></div>
            <div className="mb">
              <div className="fg2">
                <div className="fg"><label className="lbl">Nom du site *</label><input className="inp" value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} /></div>
                <div className="fg"><label className="lbl">URL</label><input className="inp" value={form.url||''} onChange={e => setForm({...form,url:e.target.value})} placeholder="https://…" /></div>
                <div className="fg"><label className="lbl">Identifiant *</label><input className="inp" value={form.user||''} onChange={e => setForm({...form,user:e.target.value})} /></div>
                <div className="fg"><label className="lbl">Mot de passe</label><input type="password" className="inp" value={form.pw||''} onChange={e => setForm({...form,pw:e.target.value})} /></div>
              </div>
            </div>
            <div className="mf"><button className="btn" onClick={closeModal}>Annuler</button><button className="btn btn-y" onClick={saveVault}>Sauvegarder</button></div>
          </div>
        </div>
      )}

      {/* MODAL CR */}
      {modal === 'cr' && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="mh"><div className="mt">Compte-rendu hebdomadaire</div></div>
            <div className="mb">
              <div className="fg"><label className="lbl">Semaine du *</label><input className="inp" value={form.week||''} onChange={e => setForm({...form,week:e.target.value})} placeholder="ex: 25 mars 2026" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:10 }}>
                <div className="fg"><label className="lbl">Prospects</label><input type="number" className="inp" value={form.prospects||0} onChange={e => setForm({...form,prospects:parseInt(e.target.value)||0})} /></div>
                <div className="fg"><label className="lbl">RDV</label><input type="number" className="inp" value={form.rdv||0} onChange={e => setForm({...form,rdv:parseInt(e.target.value)||0})} /></div>
                <div className="fg"><label className="lbl">Commandes</label><input type="number" className="inp" value={form.cmds||0} onChange={e => setForm({...form,cmds:parseInt(e.target.value)||0})} /></div>
              </div>
              <div className="fg"><label className="lbl">✅ Victoires</label><textarea className="inp" value={form.wins||''} onChange={e => setForm({...form,wins:e.target.value})} placeholder="Ce que j'ai accompli…" /></div>
              <div className="fg"><label className="lbl">⚡ Challenges</label><textarea className="inp" value={form.challenges||''} onChange={e => setForm({...form,challenges:e.target.value})} placeholder="Blocages…" /></div>
              <div className="fg"><label className="lbl">🎯 Priorités S+1</label><textarea className="inp" value={form.next||''} onChange={e => setForm({...form,next:e.target.value})} placeholder="Mes 3 priorités…" /></div>
              <div className="fg"><label className="lbl">💬 Note pour Edward</label><textarea className="inp" value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Tout ce qui mérite d'être remonté…" /></div>
            </div>
            <div className="mf">
              <button className="btn" onClick={closeModal}>Annuler</button>
              <button className="btn btn-y" onClick={submitCR}>📤 Soumettre à Edward</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast${toastMsg ? ' show' : ''}`}>{toastMsg}</div>
    </>
  )
}
