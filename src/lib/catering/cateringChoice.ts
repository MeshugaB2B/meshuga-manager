// ============================================================
// cateringChoice.ts — Pages publiques client (Meshuga Events)
// Emplacement cible : src/lib/catering/cateringChoice.ts
//
// Deux générateurs HTML purs (aucun JSX) :
//   1. buildDevisChoiceHtml(payload)  → page « choisissez votre formule » (1-3 cartes)
//      Chaque carte mène à l'écran de configuration (?formule=KEY).
//   2. buildDevisConfigHtml(payload)  → écran de configuration interactif :
//      panier éditable, mini-catalogue à onglets, live cooking, pax modifiable,
//      jauge de couverture (blocage dur), total live, bouton « Valider et signer ».
//
// Le calcul affiché au client est STRICTEMENT identique à cateringCore :
//   - TVA par ligne via tva_pct du catalogue (tvaToRatio)
//   - prestations (livraison + mise en place) à 20 %
//   - couverture = nb de minis (catégories box_mini / live_mini) vs cible/pers
// ============================================================

import { fmtEur } from './cateringCore'
import { MESHUGA_LOGO_PINK_DATA_URI } from '../meshugaLogo'

// ---------- Types ----------

export interface ChoiceVariant {
  key: string
  label: string
  description?: string
  total_ttc: number
  per_personne_ttc: number
  minis_per_pers?: number
  items: { name: string; qty: number; composition?: string }[]
}

export interface ChoicePayload {
  devisId: string | number
  numero: string
  validite?: string
  client: { nom: string; contact?: string }
  event: { format?: string; nbPersonnes: number; date?: string; lieu?: string }
  variants: ChoiceVariant[]
  recommendedKey?: string
}

export interface ConfigCatalogueItem {
  id: string
  category: string
  subcategory?: string | null
  name: string
  pv_ht: number
  tva_pct: number
  composition?: string | null
  tagline?: string | null
  size_pers?: number | null
}

export interface ConfigPayload {
  devisId: string | number
  numero: string
  variantKey: string
  variantLabel: string
  client: { nom: string; contact?: string }
  event: { format?: string; nbPersonnes: number; date?: string; lieu?: string }
  startLines: { offering_id: string; qty: number }[]
  catalogue: ConfigCatalogueItem[]
  perPersOptions?: number[]
  perPersDefault?: number
  frais?: {
    livraison?: number
    livraison_offert?: boolean
    mise_en_place?: number
    mise_en_place_offert?: boolean
  }
}

var EVENT_LABELS: { [k: string]: string } = {
  cocktail: 'Cocktail dînatoire',
  business_lunch: 'Business lunch',
  soiree: 'Soirée',
  petit_dej: 'Petit-déjeuner',
  autre: 'Événement'
}

function esc(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function frDate(iso?: string): string {
  if (!iso) return ''
  var d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('fr-FR')
}

// JSON sûr à injecter dans une balise <script type="application/json">
function jsonForScript(obj: any): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

function sharedHead(numero: string, title: string): string {
  return '<!DOCTYPE html><html lang="fr"><head>' +
    '<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow">' +
    '<title>' + esc(title) + ' ' + esc(numero) + ' — Meshuga Events</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">'
}

// ============================================================
// 1) PAGE DE CHOIX
// ============================================================

export function buildDevisChoiceHtml(payload: ChoicePayload): string {
  var ev = payload.event
  var fmtLbl = EVENT_LABELS[ev.format || 'autre'] || 'Événement'
  var dateStr = frDate(ev.date)

  var cards = ''
  payload.variants.forEach(function (v) {
    var isReco = payload.recommendedKey && v.key === payload.recommendedKey
    var itemsTop = (v.items || []).slice(0, 6)
    var itemsHtml = ''
    itemsTop.forEach(function (it) {
      itemsHtml += '<div class="ci"><div class="ci-box">' + it.qty + ' &times; box ' + esc(it.name) + '</div>' + (it.composition ? '<div class="ci-comp">' + esc(it.composition) + '</div>' : '') + '</div>'
    })
    var more = (v.items || []).length - itemsTop.length
    if (more > 0) itemsHtml += '<div class="ci-more">+ ' + more + ' autres</div>'

    cards +=
      '<div class="card' + (isReco ? ' reco' : '') + '">' +
        (isReco ? '<div class="badge">Recommandé</div>' : '') +
        '<div class="card-label">' + esc(v.label) + '</div>' +
        (v.description ? '<div class="card-desc">' + esc(v.description) + '</div>' : '<div class="card-desc"></div>') +
        '<div class="card-price">' + fmtEur(v.total_ttc) + '</div>' +
        '<div class="card-pp">TTC &middot; <b>' + fmtEur(v.per_personne_ttc) + ' / personne</b></div>' +
        (v.minis_per_pers != null ? '<div class="card-minis">\u2248 ' + (Math.round((v.minis_per_pers || 0) * 10) / 10).toString().replace('.', ',') + ' minis / personne</div>' : '') +
        '<div class="card-items">' + itemsHtml + '</div>' +
        '<button class="btn-choose" onclick="choisir(\'' + esc(v.key) + '\')">Choisir &amp; personnaliser</button>' +
      '</div>'
  })

  var css =
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;background:#FFFDF5;padding:0 0 40px}' +
    '.wrap{max-width:1000px;margin:0 auto;padding:0 16px}' +
    '.top{background:#FF82D7;border-bottom:3px solid #191923;padding:16px 0;margin-bottom:22px}' +
    '.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}' +
    '.wm{height:32px;display:block}.wmf{font-family:Yellowtail,cursive;font-size:28px;color:#FFEB5A;line-height:1;display:none}' +
    '.sub{font-size:9px;color:#fff;letter-spacing:1.6px;text-transform:uppercase;font-weight:900;margin-top:3px}' +
    '.top .meta{text-align:right;color:#fff;font-size:12px;font-weight:700}' +
    '.head-info{margin-bottom:18px}' +
    '.head-info h1{font-family:Yellowtail,cursive;font-size:30px;font-weight:400;line-height:1;margin-bottom:6px}' +
    '.head-info p{font-size:13px;color:#444;line-height:1.5}' +
    '.intro{background:#FFEB5A;border:2px solid #191923;border-radius:8px;padding:12px 16px;font-size:14px;font-weight:700;margin-bottom:22px;box-shadow:3px 3px 0 #191923}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}' +
    '.card{background:#fff;border:2px solid #191923;border-radius:10px;box-shadow:4px 4px 0 #191923;padding:18px;position:relative;display:flex;flex-direction:column}' +
    '.card.reco{border-color:#FF82D7;box-shadow:4px 4px 0 #FF82D7}' +
    '.badge{position:absolute;top:-12px;right:14px;background:#FF82D7;color:#fff;font-size:10px;font-weight:900;padding:3px 10px;border-radius:5px;border:2px solid #191923;text-transform:uppercase;letter-spacing:.5px}' +
    '.card-label{font-family:Yellowtail,cursive;font-size:28px;line-height:1;margin-bottom:4px}' +
    '.card-desc{font-size:12px;color:#888;font-style:italic;margin-bottom:12px;min-height:32px;line-height:1.4}' +
    '.card-price{font-size:26px;font-weight:900;line-height:1}' +
    '.card-pp{font-size:12px;color:#666;margin-bottom:6px}.card-pp b{color:#191923;font-weight:900}' +
    '.card-minis{display:inline-block;background:#FFEB5A;border:1.5px solid #191923;border-radius:20px;padding:2px 11px;font-size:11px;font-weight:800;margin-bottom:14px;box-shadow:2px 2px 0 #191923}' +
    '.card-items{border-top:1px solid #EBEBEB;padding-top:11px;margin-bottom:16px;flex:1}' +
    '.ci{font-size:12.5px;color:#191923;margin-bottom:9px;line-height:1.3}.ci-box{font-weight:900}.ci-comp{font-size:11px;color:#8a8a92;font-weight:400;margin-top:2px;line-height:1.35}' +
    '.ci-more{font-size:11px;color:#aaa;font-style:italic;margin-top:4px}' +
    '.btn-choose{width:100%;background:#FF82D7;color:#fff;border:2px solid #191923;border-radius:9px;padding:9px 12px 11px;font-family:Yellowtail,cursive;font-size:22px;font-weight:400;line-height:1.1;cursor:pointer;letter-spacing:.3px;box-shadow:3px 3px 0 #191923}' +
    '.btn-choose:hover{background:#191923;color:#FFEB5A}' +
    '.btn-choose:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #191923}' +
    '.foot{margin-top:34px;padding-top:16px;border-top:1px solid #EBEBEB;text-align:center;font-size:11px;color:#888;line-height:1.7}.foot-logo{display:block;height:30px;margin:0 auto 8px}'

  var script =
    '<script>function choisir(k){var u=new URL(window.location.href);u.searchParams.set("formule",k);window.location.href=u.toString();}</script>'

  return sharedHead(payload.numero, 'Votre devis') +
    '<style>' + css + '</style></head><body>' +
    '<div class="top"><div class="wrap">' +
      '<div><img class="wm" src="/MESHUGA_Logotype_white.png" alt="Meshuga" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><div class="wmf">meshuga</div><div class="sub">Events · Paris</div></div>' +
      '<div class="meta">Devis ' + esc(payload.numero) + (payload.validite ? '<br>Valable jusqu&#39;au ' + frDate(payload.validite) : '') + '</div>' +
    '</div></div>' +
    '<div class="wrap">' +
      '<div class="head-info">' +
        '<h1>' + (payload.client.contact ? 'Bonjour ' + esc(payload.client.contact.split(' ')[0]) : 'Votre proposition') + '</h1>' +
        '<p>' + esc(payload.client.nom) + ' &middot; <strong>' + fmtLbl + '</strong> &middot; ' + ev.nbPersonnes + ' personnes' +
        (dateStr ? ' &middot; ' + dateStr : '') + (ev.lieu ? ' &middot; ' + esc(ev.lieu) : '') + '</p>' +
      '</div>' +
      '<div class="intro">Choisissez la formule qui vous convient — vous pourrez ensuite la personnaliser librement avant de valider.</div>' +
      '<div class="grid">' + cards + '</div>' +
      '<div class="foot"><img class="foot-logo" src="' + MESHUGA_LOGO_PINK_DATA_URI + '" alt="Meshuga">SAS AEGIA FOOD (enseigne MESHUGA) &middot; 3 rue Vavin, 75006 Paris &middot; events@meshuga.fr</div>' +
    '</div>' + script + '</body></html>'
}

// ============================================================
// 2) PAGE DE CONFIGURATION
// ============================================================

// Script client (string) — réplique EXACTEMENT cateringCore.
var CONFIG_RUNTIME = [
  'var CFG=JSON.parse(document.getElementById("cfg").textContent);',
  'var CAT_META={box_mini:{l:"Minis",e:"📦"},live_mini:{l:"Live minis",e:"🥗"},platter:{l:"Plateaux",e:"🍽️"},lunch_box:{l:"Lunch box",e:"🍱"},live_forfait:{l:"Live cooking",e:"🔥"},addon:{l:"Extras",e:"➕"}};',
  'var CAT_ORDER=["box_mini","live_mini","platter","lunch_box","live_forfait","addon"];',
  'var TARGETS={cocktail:3,soiree:3.5,petit_dej:2.5,business_lunch:0,autre:3};',
  'var MAP={};CFG.catalogue.forEach(function(o){MAP[o.id]=o;});',
  'function isMini(c){return c==="box_mini"||c==="live_mini";}',
  'function tvaRatio(p){p=Number(p);if(!p||p<=0)return 0;return p>1?p/100:p;}',
  'function r2(n){return Math.round((Number(n)||0)*100)/100;}',
  'function eur(v){return (Number(v)||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";}',
  'var lines=CFG.startLines.map(function(l){return {id:l.offering_id,qty:Number(l.qty)||0};}).filter(function(l){return l.qty>0&&MAP[l.id];});',
  'var addGroup=null;',
  'var GROUPS=[',
  ' {k:"minis",l:"Minis",e:"📦",f:function(o){return o.category==="box_mini";}},',
  ' {k:"livemini",l:"Live minis",e:"🥗",f:function(o){return o.category==="live_mini";}},',
  ' {k:"platter",l:"Plateaux",e:"🍽️",f:function(o){return o.category==="platter";}},',
  ' {k:"lunch",l:"Lunch box",e:"🍱",f:function(o){return o.category==="lunch_box"||(o.category==="addon"&&o.subcategory==="lunch");}},',
  ' {k:"live",l:"Live cooking",e:"🔥",f:function(o){return o.category==="live_forfait";}},',
  ' {k:"drinks",l:"Boissons",e:"🥤",f:function(o){return o.subcategory==="beverage";}},',
  ' {k:"desserts",l:"Desserts",e:"🍪",f:function(o){return o.subcategory==="food"||/sugar|cookie|nutella|dessert|sucr/i.test((o.name||"")+" "+(o.composition||""));}}',
  '];',
  'function descOf(o){if(!o)return "";var c=o.composition||"";var g=(c===""||c==="À la pièce"||c==="Par heure"||c==="Bonbonne 5L"||c.charAt(0)==="+");if(g)return (o.tagline||c||"");return c;}',
  'var PP_OPTS=(CFG.perPersOptions&&CFG.perPersOptions.length)?CFG.perPersOptions:[2,3,4];',
  'var PERPERS=Number(CFG.perPersDefault)||3;',
  'function pax(){var t=(document.getElementById("pax").textContent||"").replace(/[^0-9]/g,"");var n=parseInt(t,10);return n>0?n:1;}',
  'function bumpPax(d){var el=document.getElementById("pax");el.textContent=String(Math.max(1,pax()+d));rescaleMinis();render();}',
  'function findLine(id){for(var i=0;i<lines.length;i++){if(lines[i].id===id)return i;}return -1;}',
  'function miniPiecesOf(o,q){if(o.category==="box_mini")return q*(Number(o.size_pers)||0);if(o.category==="live_mini")return q;return 0;}',
  'function curMinis(){var m=0;for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(o)m+=miniPiecesOf(o,lines[i].qty);}return m;}',
  'function rescaleMinis(){var target=pax()*PERPERS;var cur=curMinis();if(cur<=0||target<=0)return;var scale=target/cur;var bigId=null,bigSize=0;for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(!o||!isMini(o.category))continue;var sz=o.category==="box_mini"?(Number(o.size_pers)||1):1;if(sz>bigSize){bigSize=sz;bigId=lines[i].id;}lines[i].qty=Math.max(0,Math.round(lines[i].qty*scale));}for(var j=lines.length-1;j>=0;j--){var oo=MAP[lines[j].id];if(oo&&isMini(oo.category)&&lines[j].qty===0)lines.splice(j,1);}if(curMinis()===0&&bigId){var k=findLine(bigId);if(k>-1)lines[k].qty=1;else lines.push({id:bigId,qty:1});}}',
  'function setPerPers(n){PERPERS=n;rescaleMinis();render();}',
  'function renderPerPers(){var P=pax();var ach=P>0?(curMinis()/P):0;var C="";for(var i=0;i<PP_OPTS.length;i++){var n=PP_OPTS[i];C+=\'<button class="ppc\'+(n===PERPERS?" on":"")+\'" onclick="setPerPers(\'+n+\')">\'+n+\'</button>\';}document.getElementById("ppchips").innerHTML=C;document.getElementById("ppnote").textContent="\\u2248 "+ach.toFixed(1).replace(".",",")+" / pers r\\u00e9el";}',
  'function addItem(id){var i=findLine(id);if(i>-1)lines[i].qty++;else lines.push({id:id,qty:1});render();}',
  'function stepLine(i,d){lines[i].qty=Math.max(0,lines[i].qty+d);if(lines[i].qty===0)lines.splice(i,1);render();}',
  'function rmLine(i){lines.splice(i,1);render();}',
  'function compute(){var itemsHT=0,tvaItems=0,minis=0;for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(!o)continue;var q=lines[i].qty;var pu=Number(o.pv_ht)||0;var ht=r2(pu*q);itemsHT+=ht;tvaItems+=ht*tvaRatio(o.tva_pct);if(o.category==="box_mini")minis+=q*(Number(o.size_pers)||0);else if(o.category==="live_mini")minis+=q;}',
  'var f=CFG.frais;var liv=f.livraison_offert?0:(Number(f.livraison)||0);var mep=f.mise_en_place_offert?0:(Number(f.mise_en_place)||0);var fraisHT=liv+mep;var tvaFrais=fraisHT*0.20;',
  'var totalHT=itemsHT+fraisHT;var tva=tvaItems+tvaFrais;var ttc=totalHT+tva;',
  'return {itemsHT:r2(itemsHT),fraisHT:r2(fraisHT),totalHT:r2(totalHT),tva:r2(tva),ttc:r2(ttc),minis:minis};}',
  'function aggMinis(){var acc={};var order=[];for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(!o)continue;var q=Number(lines[i].qty)||0;if(q<=0)continue;if(o.category==="box_mini"&&o.composition){var segs=String(o.composition).split(/\\s*·\\s*/);for(var j=0;j<segs.length;j++){var m=segs[j].match(/^(\\d+)\\s+(.+)$/);if(!m)continue;var nm=m[2].replace(/^\\s+|\\s+$/g,"");if(acc[nm]==null){acc[nm]=0;order.push(nm);}acc[nm]+=parseInt(m[1],10)*q;}}else if(o.category==="live_mini"){var n2=o.name;if(acc[n2]==null){acc[n2]=0;order.push(n2);}acc[n2]+=q;}}var out=[];for(var k=0;k<order.length;k++)out.push({name:order[k],count:acc[order[k]]});return out;}',
  'function renderMiniRecap(){var a=aggMinis();var card=document.getElementById("recapcard");if(!a.length){card.style.display="none";return;}card.style.display="block";var H="";for(var i=0;i<a.length;i++){H+=\'<div class="mr-row"><span class="mr-n">\'+a[i].name+\'</span><span class="mr-c">\'+a[i].count+\'</span></div>\';}var P=pax();var tot=curMinis();H+=\'<div class="mr-tot"><span>\'+tot+\' minis au total</span><span>\'+(P>0?(tot/P).toFixed(1).replace(".",","):"0")+\' / pers</span></div>\';document.getElementById("minirecap").innerHTML=H;}',
  'function render(){',
  ' var L="";for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(!o){continue;}var lt=(Number(o.pv_ht)||0)*lines[i].qty;',
  '  var sub=descOf(o);var pcs="";if(o.category==="box_mini")pcs=(lines[i].qty*(Number(o.size_pers)||0))+" pièces";else if(o.category==="live_mini")pcs=lines[i].qty+" pièces";if(pcs)sub=sub?(sub+" · "+pcs):pcs;',
  '  L+=\'<div class="line"><div class="line-main"><span class="line-n">\'+o.name+\'</span><span class="q"><b onclick="stepLine(\'+i+\',-1)">−</b><span>\'+lines[i].qty+\'</span><b onclick="stepLine(\'+i+\',1)">+</b></span><span class="line-t">\'+eur(lt)+\'</span><button class="rm" onclick="rmLine(\'+i+\')">✕</button></div>\'+(sub?\'<div class="line-sub">\'+sub+\'</div>\':\'\')+\'</div>\';}',
  ' document.getElementById("lines").innerHTML=L||\'<div style="padding:10px;text-align:center;opacity:.5;font-size:12px">Votre panier est vide.</div>\';',
  ' var groups=GROUPS.filter(function(g){return CFG.catalogue.some(function(o){return g.f(o);});});',
  ' if(!addGroup||!groups.some(function(g){return g.k===addGroup;}))addGroup=groups.length?groups[0].k:null;',
  ' var C="";for(var c=0;c<groups.length;c++){var g=groups[c];C+=\'<button class="chip\'+(g.k===addGroup?" on":"")+\'" onclick="setCat(\\\'\'+g.k+\'\\\')">\'+g.e+" "+g.l+\'</button>\';}',
  ' document.getElementById("addcats").innerHTML=C;',
  ' var curG=null;for(var gi=0;gi<groups.length;gi++){if(groups[gi].k===addGroup)curG=groups[gi];}',
  ' var items=curG?CFG.catalogue.filter(function(o){return curG.f(o);}):[];var A="";for(var j=0;j<items.length;j++){var it=items[j];var dd=descOf(it);A+=\'<div class="addrow" onclick="addItem(\\\'\'+it.id+\'\\\')"><div class="addrow-top"><span style="font-size:12.5px;font-weight:700">\'+it.name+\'</span><span style="font-size:12px;font-weight:900;color:#FF82D7;white-space:nowrap">+ \'+eur(it.pv_ht)+\'</span></div>\'+(dd?\'<div class="addrow-sub">\'+dd+\'</div>\':\'\')+\'</div>\';}',
  ' document.getElementById("addlist").innerHTML=A||\'<div style="opacity:.5;font-size:12px;padding:8px">Aucun article.</div>\';',
  ' var liveLine=null;for(var k=0;k<lines.length;k++){var oo=MAP[lines[k].id];if(oo&&oo.category==="live_forfait"){liveLine=oo;break;}}',
  ' var lc=document.getElementById("livecard");',
  ' if(liveLine){lc.style.display="block";var inc=liveLine.composition||"Installation, prestation et chef Meshuga sur place · matériel et dressage minute inclus.";if(liveLine.tagline)inc+=" · "+liveLine.tagline;document.getElementById("liveincl").textContent=inc;',
  '  var sfx=String(liveLine.id).replace("live_","");var extras=CFG.catalogue.filter(function(o){return o.subcategory==="live_extra"&&String(o.id).indexOf(sfx)>-1;});var X="";for(var e=0;e<extras.length;e++){var ex=extras[e];var li=findLine(ex.id);var qn=li>-1?lines[li].qty:0;X+=\'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px"><span style="font-size:12px;font-weight:700">\'+ex.name+\' <span style=\\\'color:#888\\\'>(+\'+eur(ex.pv_ht)+\' / h)</span></span><span class="q"><b onclick="decId(\\\'\'+ex.id+\'\\\')">−</b><span>\'+qn+\'</span><b onclick="addItem(\\\'\'+ex.id+\'\\\')">+</b></span></div>\';}',
  '  document.getElementById("livextra").innerHTML=X;}else{lc.style.display="none";}',
  ' var t=compute();var P=pax();',
  ' document.getElementById("tht").textContent=eur(t.totalHT);',
  ' var f3=CFG.frais;var fr="";',
  ' if(f3.livraison_offert)fr+=\'<div class="frow"><span>Livraison</span><span class="off">Offerte ✓</span></div>\';else if((Number(f3.livraison)||0)>0)fr+=\'<div class="frow"><span>Livraison</span><span>\'+eur(f3.livraison)+\'</span></div>\';',
  ' if(f3.mise_en_place_offert)fr+=\'<div class="frow"><span>Mise en place</span><span class="off">Offerte ✓</span></div>\';else if((Number(f3.mise_en_place)||0)>0)fr+=\'<div class="frow"><span>Mise en place</span><span>\'+eur(f3.mise_en_place)+\'</span></div>\';',
  ' document.getElementById("fraisrows").innerHTML=fr;',
  ' document.getElementById("ttva").textContent=eur(t.tva);',
  ' document.getElementById("tttc").textContent=eur(t.ttc);',
  ' document.getElementById("tpp").textContent="soit "+eur(P>0?t.ttc/P:0)+" / pers";',
  ' var reco=Math.round(P*PERPERS);var perGuest=P>0?(t.minis/P):0;',
  ' var pct=reco>0?Math.min(100,Math.round(t.minis/reco*100)):100;',
  ' document.getElementById("covbar").style.width=pct+"%";',
  ' document.getElementById("covtxt").textContent=t.minis+" minis";',
  ' var hint=document.getElementById("covhint");hint.style.color="#191923";',
  ' hint.innerHTML=\'<span style="background:#FFEB5A;border:1.5px solid #191923;border-radius:10px;padding:2px 9px">\'+perGuest.toFixed(1).replace(".",",")+\' minis / invité</span>\';',
  ' renderPerPers();',
  ' renderMiniRecap();',
  ' var cta=document.getElementById("cta");var ch=document.getElementById("ctahint");',
  ' if(lines.length>0&&t.minis>0){cta.disabled=false;cta.style.background="#FF82D7";cta.style.color="#fff";cta.style.cursor="pointer";cta.style.boxShadow="3px 3px 0 #191923";ch.textContent="PDF final + signature électronique";}',
  ' else{cta.disabled=true;cta.style.background="#EBEBEB";cta.style.color="#999";cta.style.cursor="not-allowed";cta.style.boxShadow="none";ch.textContent="Ajoutez au moins un article";}',
  '}',
  'function setCat(c){addGroup=c;render();}',
  'function decId(id){var i=findLine(id);if(i>-1)stepLine(i,-1);}',
  'function valider(){var t=compute();var P=pax();if(lines.length===0||t.minis<=0)return;',
  ' var btn=document.getElementById("cta");btn.disabled=true;document.getElementById("ov").style.display="flex";',
  ' fetch("/api/catering/configure",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({devisId:CFG.devisId,variantKey:CFG.variantKey,pax:P,lines:lines})})',
  ' .then(function(r){return r.json();}).then(function(d){if(d&&d.ok&&d.signUrl){window.location.href=d.signUrl;}else{document.getElementById("ov").style.display="none";btn.disabled=false;alert((d&&d.error)||"Une erreur est survenue. Merci de réessayer ou de nous écrire à events@meshuga.fr");}})',
  ' .catch(function(){document.getElementById("ov").style.display="none";btn.disabled=false;alert("Connexion impossible, merci de réessayer.");});',
  '}',
  'document.getElementById("pax").addEventListener("input",render);',
  'var _ap=pax()>0?Math.round(curMinis()/pax()):PERPERS;if(PP_OPTS.indexOf(_ap)>-1)PERPERS=_ap;render();'
].join('\n')

export function buildDevisConfigHtml(payload: ConfigPayload): string {
  var ev = payload.event
  var fmtLbl = EVENT_LABELS[ev.format || 'autre'] || 'Événement'
  var frais = payload.frais || {}

  var cfg = {
    devisId: String(payload.devisId),
    variantKey: payload.variantKey,
    format: ev.format || 'autre',
    paxInit: Number(ev.nbPersonnes) || 1,
    perPersOptions: (payload.perPersOptions && payload.perPersOptions.length ? payload.perPersOptions : [2, 3, 4]),
    perPersDefault: Number(payload.perPersDefault) || 3,
    startLines: payload.startLines || [],
    catalogue: payload.catalogue || [],
    frais: {
      livraison: Number(frais.livraison) || 0,
      livraison_offert: !!frais.livraison_offert,
      mise_en_place: Number(frais.mise_en_place) || 0,
      mise_en_place_offert: !!frais.mise_en_place_offert
    }
  }

  var css =
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:"Arial Narrow",Arial,sans-serif;color:#191923;background:#FFFDF5;padding:0 0 40px}' +
    '.wrap{max-width:1000px;margin:0 auto;padding:0 16px}' +
    '.top{background:#FF82D7;border-bottom:3px solid #191923;padding:14px 0}' +
    '.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}' +
    '.wm{height:30px;display:block}.wmf{font-family:Yellowtail,cursive;font-size:26px;color:#FFEB5A;line-height:1;display:none}' +
    '.sub{font-size:9px;color:#fff;letter-spacing:1.6px;text-transform:uppercase;font-weight:900;margin-top:3px}' +
    '.top .meta{text-align:right;color:#fff;font-size:12px;font-weight:700}' +
    'h1{font-family:Yellowtail,cursive;font-size:26px;font-weight:400;line-height:1;margin:18px 0 3px}' +
    '.lead{font-size:12.5px;color:#444;margin-bottom:14px}' +
    '.card{background:#fff;border:2px solid #191923;border-radius:9px;box-shadow:3px 3px 0 #191923;padding:13px;margin-bottom:12px}' +
    '.yt{font-family:Yellowtail,cursive;font-weight:400}' +
    '.paxnum{font-size:20px;font-weight:900;line-height:1;min-width:1ch;outline:none;border-bottom:2px dotted #FF82D7;padding:0 1px}' +
    '.paxarr{display:flex;flex-direction:column}' +
    '.paxarr b{width:18px;height:13px;display:flex;align-items:center;justify-content:center;background:#FFEB5A;border:1.5px solid #191923;font-size:7px;cursor:pointer;user-select:none;line-height:1;border-radius:3px}' +
    '.paxarr b:last-child{margin-top:2px}' +
    '.q{display:inline-flex;align-items:center;border:1.5px solid #191923;border-radius:6px;overflow:hidden}' +
    '.q b{padding:1px 8px;background:#FFEB5A;font-size:13px;font-weight:900;cursor:pointer;user-select:none}' +
    '.q span{padding:1px 8px;font-size:13px;font-weight:900;min-width:30px;text-align:center}' +
    '.line{padding:8px 0;border-bottom:1px dashed #ddd}' +
    '.line-main{display:flex;align-items:center;gap:8px}' +
    '.line-n{flex:1;font-size:12.5px;font-weight:700;min-width:0}' +
    '.line-t{font-size:12.5px;font-weight:900;min-width:60px;text-align:right}' +
    '.line-sub{font-size:11px;color:#8a8a92;line-height:1.35;margin-top:3px}' +
    '.frow{display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:#555}.frow .off{color:#1a8a4a;font-weight:900}' +
    '.rm{border:none;background:none;color:#bbb;cursor:pointer;font-size:14px;padding:0 2px}' +
    '.chip{padding:5px 11px;border:1.5px solid #191923;border-radius:14px;background:#fff;font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer}.chip.on{background:#FFEB5A}' +
    '.ppc{width:36px;height:36px;border:2px solid #191923;border-radius:9px;background:#fff;font-size:16px;font-weight:900;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1}.ppc.on{background:#FF82D7;color:#fff;box-shadow:2px 2px 0 #191923}' +
    '.addrow{padding:8px 10px;border:1.5px solid #191923;border-radius:7px;background:#fff;cursor:pointer;margin-bottom:6px}.addrow:hover{background:#FFFCEB}' +
    '.addrow-top{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    '.addrow-sub{font-size:11px;color:#8a8a92;line-height:1.35;margin-top:3px}' +
    '.gridmain{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.gridmain>div{min-width:0}@media(min-width:820px){.gridmain{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)}}' +
    '.cta{width:100%;margin-top:12px;border:2px solid #191923;border-radius:8px;padding:14px;font-family:inherit;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;box-shadow:3px 3px 0 #191923}' +
    '.ttc-box{display:flex;justify-content:space-between;align-items:center;background:#FFEB5A;border:2px solid #191923;border-radius:7px;padding:9px 12px;margin-top:7px;box-shadow:3px 3px 0 #191923}' +
    '.mr-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px dashed #e3e3e3;font-size:13px}' +
    '.mr-n{font-weight:700}' +
    '.mr-c{font-weight:900;color:#FF82D7;font-variant-numeric:tabular-nums;white-space:nowrap;padding-left:10px}' +
    '.mr-tot{display:flex;justify-content:space-between;align-items:center;margin-top:8px;background:#FFEB5A;border:2px solid #191923;border-radius:7px;padding:7px 11px;font-weight:900;font-size:13px;box-shadow:2px 2px 0 #191923}' +
    '.boxhint{background:#FFF5FB;border:1.5px solid #FF82D7;border-radius:8px;padding:8px 11px;font-size:12px;font-weight:600;color:#191923;line-height:1.5;margin-bottom:10px}' +
    '.overlay{position:fixed;inset:0;background:rgba(255,253,245,.9);display:none;align-items:center;justify-content:center;font-size:18px;font-weight:900;z-index:99}' +
    '.foot{margin-top:30px;padding-top:14px;border-top:1px solid #EBEBEB;text-align:center;font-size:11px;color:#888;line-height:1.7}'

  return sharedHead(payload.numero, 'Configurez votre devis') +
    '<style>' + css + '</style></head><body>' +
    '<div class="overlay" id="ov">Préparation de votre devis…</div>' +
    '<div class="top"><div class="wrap">' +
      '<div><img class="wm" src="/MESHUGA_Logotype_white.png" alt="Meshuga" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'block\'"><div class="wmf">meshuga</div><div class="sub">Events · Paris</div></div>' +
      '<div class="meta">' + esc(payload.numero) + ' · ' + esc(payload.client.nom) + '</div>' +
    '</div></div>' +
    '<div class="wrap">' +
      '<h1>Composez votre formule</h1>' +
      '<div class="lead">Vous êtes parti de la formule <b>' + esc(payload.variantLabel) + '</b> — ' + fmtLbl + ' · ' + ev.nbPersonnes + ' personnes. Ajustez librement.</div>' +
      '<div class="card">' +
        '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
          '<div style="display:flex;align-items:center;gap:7px;flex-shrink:0">' +
            '<span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#7a7a82">Invités</span>' +
            '<span id="pax" class="paxnum" contenteditable="true" inputmode="numeric">' + (Number(ev.nbPersonnes) || 1) + '</span>' +
            '<div class="paxarr"><b onclick="bumpPax(1)">▲</b><b onclick="bumpPax(-1)">▼</b></div>' +
          '</div>' +
          '<div style="flex:1;min-width:170px">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px"><span style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.5px">Couverture</span><span id="covtxt" style="font-size:15px;font-weight:900"></span></div>' +
            '<div style="height:20px;background:#F3EFE2;border:2px solid #191923;border-radius:9px;overflow:hidden"><div id="covbar" style="height:100%;width:0;background:#FF82D7;transition:width .15s"></div></div>' +
          '</div>' +
        '</div>' +
        '<div id="covhint" style="font-size:13px;font-weight:900;margin-top:8px"></div>' +
        '<div id="perpers" style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:12px;padding-top:11px;border-top:1px dashed #E6E0CF">' +
          '<span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#7a7a82">Pièces / personne</span>' +
          '<span id="ppchips" style="display:flex;gap:7px"></span>' +
          '<span id="ppnote" style="font-size:11px;color:#888;font-weight:700"></span>' +
        '</div>' +
      '</div>' +
      '<div class="gridmain">' +
        '<div>' +
          '<div class="card"><div class="yt" style="font-size:17px;margin-bottom:4px">Votre panier</div><div id="lines"></div></div>' +
          '<div class="card" id="recapcard" style="display:none"><div class="yt" style="font-size:17px;margin-bottom:6px">Le détail de vos minis</div><div style="font-size:11px;color:#888;margin-bottom:8px">Le nombre total de chaque mini, toutes vos box réunies.</div><div id="minirecap"></div></div>' +
          '<div class="card" id="livecard" style="display:none;background:#FFF7FC;border-color:#FF82D7"><div style="font-size:13px;font-weight:900;margin-bottom:4px">🔥 Live cooking — ce qui est inclus</div><div id="liveincl" style="font-size:11.5px;color:#555;line-height:1.6;margin-bottom:8px"></div><div id="livextra"></div></div>' +
          '<div class="card"><div class="yt" style="font-size:17px;margin-bottom:8px">Ajouter à votre formule</div><div class="boxhint">🥪 Vous pouvez composer votre box sur mesure ! Mélangez les minis comme vous voulez — gardez simplement entre <b>35 et 40 minis par box</b> pour un dressage au top.</div><div id="addcats" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px"></div><div id="addlist" style="max-height:220px;overflow-y:auto"></div></div>' +
        '</div>' +
        '<div>' +
          '<div class="card" style="position:sticky;top:10px">' +
            '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span style="color:#7a7a82">Total HT</span><b id="tht"></b></div>' +
            '<div id="fraisrows"></div>' +
            '<div style="display:flex;justify-content:space-between;font-size:12px;padding:3px 0;color:#888"><span>TVA</span><span id="ttva"></span></div>' +
            '<div class="ttc-box"><div><div class="yt" style="font-size:18px;line-height:1">Total TTC</div><div id="tpp" style="font-size:10px;color:#191923;opacity:.7"></div></div><span id="tttc" style="font-size:17px;font-weight:900"></span></div>' +
            '<button id="cta" class="cta" onclick="valider()">Valider et signer</button>' +
            '<div id="ctahint" style="font-size:10px;text-align:center;margin-top:6px;color:#888"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="foot">Prix TTC. Le devis ne sera ferme qu&#39;après signature et réception de l&#39;acompte. · events@meshuga.fr</div>' +
    '</div>' +
    '<script id="cfg" type="application/json">' + jsonForScript(cfg) + '</script>' +
    '<script>' + CONFIG_RUNTIME + '</script>' +
    '</body></html>'
}
