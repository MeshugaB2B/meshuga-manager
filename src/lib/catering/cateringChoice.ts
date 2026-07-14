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
    remise_globale_pct?: number
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
var CONFIG_RUNTIME = `
var CFG=JSON.parse(document.getElementById("cfg").textContent);
var MAP={};CFG.catalogue.forEach(function(o){MAP[o.id]=o;});
var BOX_SIZE=40,BOX_MIN=35;
// Minis à l'unité pour la box sur mesure — chaque sandwich séparé, trié par prix croissant
var UNIT_IDS=["live_mini_hot_dog","live_mini_egg","live_mini_pbn","live_mini_melt","live_mini_tarama_sw","live_mini_spicy_tuna","live_mini_caesar","live_mini_reuben","live_mini_lox","live_mini_lobster"];
var UNIT=UNIT_IDS.filter(function(id){return MAP[id];}).map(function(id){return MAP[id];});
UNIT.sort(function(a,b){return (Number(a.pv_ht)||0)-(Number(b.pv_ht)||0);});
function isPretBox(c){return c==="box_mini";}
function tvaRatio(p){p=Number(p);if(!p||p<=0)return 0;return p>1?p/100:p;}
function r2(n){return Math.round((Number(n)||0)*100)/100;}
function eur(v){return (Number(v)||0).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";}
function pax(){var t=(document.getElementById("pax").textContent||"").replace(/[^0-9]/g,"");var n=parseInt(t,10);return n>0?n:1;}
function bumpPax(d){var el=document.getElementById("pax");el.textContent=String(Math.max(1,pax()+d));render();}
// --- panier "box prêtes" + autres (live, boissons) ---
var lines=CFG.startLines.map(function(l){return {id:l.offering_id,qty:Number(l.qty)||0};}).filter(function(l){return l.qty>0&&MAP[l.id];});
// On retire de "lines" les minis à l'unité (live_mini) -> ils basculent dans la box sur mesure
var custom={};
(function(){
  for(var i=lines.length-1;i>=0;i--){
    var o=MAP[lines[i].id];
    if(o&&o.category==="live_mini"){
      custom[lines[i].id]=(custom[lines[i].id]||0)+lines[i].qty;
      lines.splice(i,1);
    }
  }
})();
function findLine(id){for(var i=0;i<lines.length;i++){if(lines[i].id===id)return i;}return -1;}
// --- box sur mesure ---
function customPieces(){var m=0;for(var k in custom){if(custom.hasOwnProperty(k))m+=custom[k];}return m;}
function customBoxCount(){var p=customPieces();return p>0?Math.ceil(p/BOX_SIZE):0;}
function curBoxFill(){var p=customPieces();if(p<=0)return 0;var f=p%BOX_SIZE;return f===0?BOX_SIZE:f;}
function addUnit(id){custom[id]=(custom[id]||0)+1;render();}
function decUnit(id){if(!custom[id])return;custom[id]--;if(custom[id]<=0)delete custom[id];render();}
// Validation stricte : toute box entamée doit avoir BOX_MIN..BOX_SIZE pièces.
function customValid(){
  var p=customPieces();
  if(p===0)return true; // pas de box sur mesure = ok
  var full=Math.floor(p/BOX_SIZE);
  var rest=p-full*BOX_SIZE;
  if(rest===0)return true; // multiples pleins
  return rest>=BOX_MIN; // dernière box entamée doit avoir >=35
}
function customNeeded(){
  // combien de minis manquent (ou en trop) pour valider la box en cours
  var p=customPieces();if(p===0)return 0;
  var rest=p%BOX_SIZE;
  if(rest===0)return 0;
  if(rest<BOX_MIN)return BOX_MIN-rest; // manque pour atteindre 35
  return 0;
}
// --- pièces minis : box prêtes ---
function pretMinis(){var m=0;for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(o&&o.category==="box_mini")m+=lines[i].qty*(Number(o.size_pers)||0);}return m;}
function totalMinis(){return pretMinis()+customPieces();}
// --- compute prix ---
function compute(){
  var itemsHT=0,tvaItems=0;
  for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(!o)continue;var q=lines[i].qty;var pu=Number(o.pv_ht)||0;var ht=r2(pu*q);itemsHT+=ht;tvaItems+=r2(ht*tvaRatio(o.tva_pct));}
  for(var k in custom){if(!custom.hasOwnProperty(k))continue;var oc=MAP[k];if(!oc)continue;var hc=r2((Number(oc.pv_ht)||0)*custom[k]);itemsHT+=hc;tvaItems+=r2(hc*tvaRatio(oc.tva_pct));}
  var f=CFG.frais;
  var rg=Number(f.remise_globale_pct)||0;
  var remiseMontant=r2(itemsHT*rg/100);
  var itemsNetHT=r2(itemsHT-remiseMontant);
  var scale=itemsHT>0?itemsNetHT/itemsHT:1;
  var tvaItemsNet=tvaItems*scale;
  var liv=f.livraison_offert?0:(Number(f.livraison)||0);var mep=f.mise_en_place_offert?0:(Number(f.mise_en_place)||0);var fraisHT=liv+mep;var tvaFrais=fraisHT*0.20;
  var totalHT=itemsNetHT+fraisHT;var tva=tvaItemsNet+tvaFrais;var ttc=totalHT+tva;
  return {itemsHT:r2(itemsHT),remisePct:rg,remiseMontant:remiseMontant,itemsNetHT:itemsNetHT,fraisHT:r2(fraisHT),totalHT:r2(totalHT),tva:r2(tva),ttc:r2(ttc),minis:totalMinis()};
}
// --- récap minis (box prêtes + custom) ---
function aggMinis(){
  var acc={},order=[];
  function add(nm,n){if(acc[nm]==null){acc[nm]=0;order.push(nm);}acc[nm]+=n;}
  for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(!o)continue;var q=Number(lines[i].qty)||0;if(q<=0)continue;
    if(o.category==="box_mini"&&o.composition){var segs=String(o.composition).split(/\\s*·\\s*/);for(var j=0;j<segs.length;j++){var m=segs[j].match(/^(\\d+)\\s+(.+)$/);if(!m)continue;add(m[2].replace(/^\\s+|\\s+$/g,""),parseInt(m[1],10)*q);}}}
  for(var k in custom){if(!custom.hasOwnProperty(k))continue;var oc=MAP[k];if(!oc)continue;add(oc.name,custom[k]);}
  var out=[];for(var z=0;z<order.length;z++)out.push({name:order[z],count:acc[order[z]]});return out;
}
// --- rendus ---
function renderPret(){
  var items=CFG.catalogue.filter(function(o){return o.category==="box_mini";});
  var H="";for(var i=0;i<items.length;i++){var o=items[i];var li=findLine(o.id);var qn=li>-1?lines[li].qty:0;
    var comp=o.composition||"";
    H+='<div class="pbox"><div class="pbox-h"><div class="pbox-n">'+o.name+'</div><div class="pbox-p">'+eur(o.pv_ht)+'</div></div>'+
       (comp?'<div class="pbox-c">'+comp+'</div>':'')+
       '<div class="pbox-f"><span class="pbox-sz">'+(Number(o.size_pers)||0)+' pièces</span>'+
       (qn>0?'<span class="q"><b onclick="decPret(\\''+o.id+'\\')">−</b><span>'+qn+'</span><b onclick="addPret(\\''+o.id+'\\')">+</b></span>':'<button class="pbox-add" onclick="addPret(\\''+o.id+'\\')">Ajouter</button>')+
       '</div></div>';}
  document.getElementById("pretlist").innerHTML=H||'<div style="opacity:.5;font-size:12px;padding:8px">Aucune box disponible.</div>';
}
function addPret(id){var i=findLine(id);if(i>-1)lines[i].qty++;else lines.push({id:id,qty:1});render();}
function decPret(id){var i=findLine(id);if(i<0)return;lines[i].qty--;if(lines[i].qty<=0)lines.splice(i,1);render();}
function renderCustom(){
  // catalogue des minis individuels (+ tout mini hérité présent dans la sélection)
  var disp=UNIT.slice();
  for(var ck in custom){if(!custom.hasOwnProperty(ck))continue;if(UNIT_IDS.indexOf(ck)>-1)continue;var co=MAP[ck];if(co)disp.push(co);}
  var H="";for(var i=0;i<disp.length;i++){var o=disp[i];var qn=custom[o.id]||0;
    H+='<div class="urow"><div class="urow-l"><div class="urow-n">'+o.name+'</div>'+(o.tagline?'<div class="urow-s">'+o.tagline+'</div>':'')+'</div>'+
       '<div class="urow-r"><span class="urow-p">'+eur(o.pv_ht)+'</span><span class="q"><b onclick="decUnit(\\''+o.id+'\\')">−</b><span>'+qn+'</span><b onclick="addUnit(\\''+o.id+'\\')">+</b></span></div></div>';}
  document.getElementById("unitlist").innerHTML=H;
  // jauge multi-box
  var p=customPieces();var nb=customBoxCount();var fill=curBoxFill();
  var pct=Math.round(fill/BOX_SIZE*100);
  var g=document.getElementById("cmbar");if(g)g.style.width=pct+"%";
  var valid=customValid();var need=customNeeded();
  var lbl="";
  if(p===0){lbl='<span class="cm-empty">Ajoutez des minis pour composer votre première box (35 à 40 pièces).</span>';}
  else{
    var boxTxt='Box '+nb+' : '+fill+'/'+BOX_SIZE;
    if(valid){lbl='<span class="cm-ok">'+boxTxt+' · '+p+' minis au total ✓</span>';}
    else{lbl='<span class="cm-warn">'+boxTxt+' · il manque '+need+' mini'+(need>1?'s':'')+' pour finir cette box (min. '+BOX_MIN+')</span>';}
  }
  var lblEl=document.getElementById("cmlabel");if(lblEl)lblEl.innerHTML=lbl;
  var barWrap=document.getElementById("cmbarwrap");if(barWrap){barWrap.style.borderColor=valid?"#191923":"#CC0066";}
  var gbar=document.getElementById("cmbar");if(gbar)gbar.style.background=valid?"#FF82D7":"#CC0066";
}
function renderMiniRecap(){
  var a=aggMinis();var card=document.getElementById("recapcard");
  if(!a.length){card.style.display="none";return;}card.style.display="block";
  var H="";for(var i=0;i<a.length;i++){H+='<div class="mr-row"><span class="mr-n">'+a[i].name+'</span><span class="mr-c">'+a[i].count+'</span></div>';}
  var P=pax();var tot=totalMinis();
  H+='<div class="mr-tot"><span>'+tot+' minis au total</span><span>'+(P>0?(tot/P).toFixed(1).replace(".",","):"0")+' / pers</span></div>';
  document.getElementById("minirecap").innerHTML=H;
}
function renderLive(){
  var liveLine=null;for(var k=0;k<lines.length;k++){var oo=MAP[lines[k].id];if(oo&&oo.category==="live_forfait"){liveLine=oo;break;}}
  var lc=document.getElementById("livecard");
  // liste des forfaits live dispo
  var forfaits=CFG.catalogue.filter(function(o){return o.category==="live_forfait";});
  var H="";for(var i=0;i<forfaits.length;i++){var o=forfaits[i];var on=findLine(o.id)>-1;
    H+='<div class="lrow'+(on?" on":"")+'" onclick="toggleLive(\\''+o.id+'\\')"><div class="lrow-l"><div class="lrow-n">'+o.name+(on?' ✓':'')+'</div><div class="lrow-s">'+(o.composition||"")+'</div></div><div class="lrow-p">'+eur(o.pv_ht)+'</div></div>';}
  document.getElementById("livelist").innerHTML=H||'<div style="opacity:.5;font-size:12px;padding:8px">Aucune animation disponible.</div>';
  // bandeau "Formule Livraison" si aucun live choisi
  var hasLive=!!liveLine;
  var fl=document.getElementById("formlivr");
  if(fl)fl.style.display=hasLive?"none":"block";
}
function toggleLive(id){var i=findLine(id);if(i>-1){lines.splice(i,1);}else{
  // un seul forfait live à la fois
  for(var j=lines.length-1;j>=0;j--){var o=MAP[lines[j].id];if(o&&o.category==="live_forfait")lines.splice(j,1);}
  lines.push({id:id,qty:1});}render();}
function scrollToLive(){var el=document.getElementById("livecard");if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}
function renderDrinks(){
  var items=CFG.catalogue.filter(function(o){return o.subcategory==="beverage";});
  var H="";for(var i=0;i<items.length;i++){var o=items[i];var li=findLine(o.id);var qn=li>-1?lines[li].qty:0;
    H+='<div class="drow"><span class="drow-n">'+o.name+'</span><div class="drow-r"><span class="drow-p">'+eur(o.pv_ht)+'</span><span class="q"><b onclick="decPret(\\''+o.id+'\\')">−</b><span>'+qn+'</span><b onclick="addPret(\\''+o.id+'\\')">+</b></span></div></div>';}
  document.getElementById("drinklist").innerHTML=H||'<div style="opacity:.5;font-size:12px;padding:8px">—</div>';
}
function renderCart(){
  var L="";
  // box prêtes + autres lignes
  for(var i=0;i<lines.length;i++){var o=MAP[lines[i].id];if(!o)continue;var lt=(Number(o.pv_ht)||0)*lines[i].qty;
    var sub="";if(o.category==="box_mini"){sub=(o.composition||"")+" · "+(lines[i].qty*(Number(o.size_pers)||0))+" pièces";}else if(o.category==="live_forfait"){sub="Animation live";}
    L+='<div class="line"><div class="line-main"><span class="line-n">'+o.name+'</span><span class="q"><b onclick="decPret(\\''+o.id+'\\')">−</b><span>'+lines[i].qty+'</span><b onclick="addPret(\\''+o.id+'\\')">+</b></span><span class="line-t">'+eur(lt)+'</span></div>'+(sub?'<div class="line-sub">'+sub+'</div>':'')+'</div>';}
  // box sur mesure (groupée)
  var cp=customPieces();
  if(cp>0){var ctot=0;var detail=[];for(var u=0;u<UNIT.length;u++){var ou=UNIT[u];var q=custom[ou.id]||0;if(q>0){ctot+=q*(Number(ou.pv_ht)||0);detail.push(q+" "+ou.name);}}
    L+='<div class="line"><div class="line-main"><span class="line-n">🥪 Votre Box sur mesure ('+customBoxCount()+' box · '+cp+' minis)</span><span class="line-t">'+eur(ctot)+'</span></div><div class="line-sub">'+detail.join(" · ")+'</div></div>';}
  document.getElementById("lines").innerHTML=L||'<div style="padding:10px;text-align:center;opacity:.5;font-size:12px">Votre panier est vide.</div>';
}
function render(){
  renderPret();renderCustom();renderLive();renderDrinks();renderCart();renderMiniRecap();
  var t=compute();var P=pax();
  document.getElementById("tht").textContent=eur(t.itemsHT);
  var f3=CFG.frais;var fr="";
  if(t.remiseMontant>0)fr+='<div class="frow"><span>Remise (-'+t.remisePct+'\u00A0%)</span><span class="off">-'+eur(t.remiseMontant)+'</span></div>';
  if(f3.livraison_offert)fr+='<div class="frow"><span>Livraison</span><span class="off">Offerte ✓</span></div>';else if((Number(f3.livraison)||0)>0)fr+='<div class="frow"><span>Livraison</span><span>'+eur(f3.livraison)+'</span></div>';
  if(f3.mise_en_place_offert)fr+='<div class="frow"><span>Mise en place</span><span class="off">Offerte ✓</span></div>';else if((Number(f3.mise_en_place)||0)>0)fr+='<div class="frow"><span>Mise en place</span><span>'+eur(f3.mise_en_place)+'</span></div>';
  document.getElementById("fraisrows").innerHTML=fr;
  document.getElementById("ttva").textContent=eur(t.tva);
  document.getElementById("tttc").textContent=eur(t.ttc);
  document.getElementById("tpp").textContent="soit "+eur(P>0?t.ttc/P:0)+" / pers";
  // jauge couverture globale
  var reco=Math.round(P*(Number(CFG.perPersDefault)||3));var perGuest=P>0?(t.minis/P):0;
  var pct=reco>0?Math.min(100,Math.round(t.minis/reco*100)):100;
  document.getElementById("covbar").style.width=pct+"%";
  document.getElementById("covtxt").textContent=t.minis+" minis";
  document.getElementById("covhint").innerHTML='<span style="background:#FFEB5A;border:1.5px solid #191923;border-radius:10px;padding:2px 9px">'+perGuest.toFixed(1).replace(".",",")+' minis / invité</span>';
  // CTA + validation box sur mesure
  var cta=document.getElementById("cta");var ch=document.getElementById("ctahint");
  var cv=customValid();
  var hasItems=(lines.length>0||customPieces()>0)&&t.minis>0;
  if(hasItems){cta.disabled=false;cta.style.background="#FF82D7";cta.style.color="#fff";cta.style.cursor="pointer";cta.style.boxShadow="3px 3px 0 #191923";
    if(cv){ch.textContent="PDF final + signature électronique";}
    else{var need=customNeeded();ch.innerHTML='<span style="color:#B8860B;font-weight:900">Box sur mesure incomplète (il manque '+need+' mini'+(need>1?'s':'')+') — vous pouvez tout de même valider et signer.</span>';}}
  else{cta.disabled=true;cta.style.background="#EBEBEB";cta.style.color="#999";cta.style.cursor="not-allowed";cta.style.boxShadow="none";ch.textContent="Ajoutez au moins un article";}
}
function valider(){var t=compute();var P=pax();if((lines.length===0&&customPieces()===0)||t.minis<=0)return;
  // fusionner custom dans des lignes live_mini pour l'envoi
  var outLines=lines.slice();
  for(var k in custom){if(custom.hasOwnProperty(k)&&custom[k]>0)outLines.push({id:k,qty:custom[k]});}
  var btn=document.getElementById("cta");btn.disabled=true;document.getElementById("ov").style.display="flex";
  fetch("/api/catering/configure",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({devisId:CFG.devisId,variantKey:CFG.variantKey,pax:P,lines:outLines})})
  .then(function(r){return r.json();}).then(function(d){if(d&&d.ok&&d.signUrl){window.location.href=d.signUrl;}else{document.getElementById("ov").style.display="none";btn.disabled=false;alert((d&&d.error)||"Une erreur est survenue. Merci de réessayer ou de nous écrire à events@meshuga.fr");}})
  .catch(function(){document.getElementById("ov").style.display="none";btn.disabled=false;alert("Connexion impossible, merci de réessayer.");});
}
document.getElementById("pax").addEventListener("input",render);
render();
`

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
      mise_en_place_offert: !!frais.mise_en_place_offert,
      remise_globale_pct: Number(frais.remise_globale_pct) || 0
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
    // Box prêtes
    '.sec-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:3px}' +
    '.sec-t{font-family:Yellowtail,cursive;font-size:20px;line-height:1}' +
    '.sec-d{font-size:11.5px;color:#888;margin-bottom:10px;line-height:1.4}' +
    '.pbox{border:1.5px solid #191923;border-radius:8px;padding:10px 11px;margin-bottom:8px;background:#fff}' +
    '.pbox-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}' +
    '.pbox-n{font-size:13px;font-weight:900}' +
    '.pbox-p{font-size:13px;font-weight:900;color:#FF82D7;white-space:nowrap}' +
    '.pbox-c{font-size:11px;color:#8a8a92;line-height:1.4;margin:3px 0 8px}' +
    '.pbox-f{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
    '.pbox-sz{font-size:11px;font-weight:700;color:#999;background:#F3EFE2;border-radius:10px;padding:2px 9px}' +
    '.pbox-add{background:#FFEB5A;border:1.5px solid #191923;border-radius:7px;padding:5px 14px;font-size:12px;font-weight:900;cursor:pointer;box-shadow:2px 2px 0 #191923}' +
    // Box sur mesure
    '.cmbox{background:#FFF7FC;border:2px solid #FF82D7;border-radius:9px;padding:12px;margin-bottom:12px;box-shadow:3px 3px 0 #FF82D7}' +
    '.cm-gauge-wrap{margin:10px 0 8px}' +
    '.cmbarout{height:22px;background:#fff;border:2px solid #191923;border-radius:10px;overflow:hidden}' +
    '.cmbarin{height:100%;width:0;background:#FF82D7;transition:width .15s,background .15s}' +
    '.cmlabel{font-size:12.5px;font-weight:800;margin-top:7px;line-height:1.4}' +
    '.cm-ok{color:#1a8a4a}.cm-warn{color:#CC0066}.cm-empty{color:#888;font-weight:600}' +
    '.boxinfo{background:#FFF7C2;border:2px solid #191923;border-radius:9px;box-shadow:2px 2px 0 #191923;padding:8px 11px;font-size:12.5px;line-height:1.45;margin:2px 0 10px}' +
    '.urow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px dashed #EBD7E6}' +
    '.urow:last-child{border-bottom:0}' +
    '.urow-n{font-size:13px;font-weight:800}.urow-s{font-size:11px;color:#8a8a92;margin-top:2px;line-height:1.35}' +
    '.urow-r{display:flex;align-items:center;gap:10px;flex-shrink:0}' +
    '.urow-p{font-size:12.5px;font-weight:900;color:#FF82D7;white-space:nowrap}' +
    // Formule livraison (rappel sobre)
    '.formlivr{background:#fff;border:2px solid #191923;border-radius:9px;padding:12px 14px;margin-bottom:12px;box-shadow:3px 3px 0 #191923}' +
    '.fl-t{font-size:13px;font-weight:900;letter-spacing:.3px;margin-bottom:3px}' +
    '.fl-d{font-size:12px;color:#555;line-height:1.5;margin-bottom:9px}' +
    '.fl-btn{background:#191923;color:#FFEB5A;border:none;border-radius:7px;padding:8px 16px;font-size:12px;font-weight:900;cursor:pointer;letter-spacing:.3px}' +
    // Live cooking
    '.lrow{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:10px;border:1.5px solid #191923;border-radius:8px;margin-bottom:8px;cursor:pointer;background:#fff}' +
    '.lrow.on{background:#FFF7FC;border-color:#FF82D7;box-shadow:2px 2px 0 #FF82D7}' +
    '.lrow-n{font-size:13px;font-weight:900}.lrow-s{font-size:11px;color:#777;line-height:1.4;margin-top:3px}' +
    '.lrow-p{font-size:13px;font-weight:900;color:#FF82D7;white-space:nowrap}' +
    // Boissons
    '.drow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed #eee}' +
    '.drow:last-child{border-bottom:0}.drow-n{font-size:13px;font-weight:700}' +
    '.drow-r{display:flex;align-items:center;gap:10px}.drow-p{font-size:12px;font-weight:900;color:#FF82D7}' +
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
      '</div>' +
      '<div class="gridmain">' +
        '<div>' +
          '<div class="card"><div class="yt" style="font-size:17px;margin-bottom:4px">Votre panier</div><div id="lines"></div></div>' +

          // BLOC 1 — Votre Box sur mesure (remontée : c'est le cœur de la personnalisation)
          '<div class="cmbox">' +
            '<div class="sec-h"><span class="sec-t">Votre Box sur mesure</span></div>' +
            '<div class="sec-d">Composez votre propre box en mélangeant nos minis à l&#39;unité. Au-delà de 40 minis, une nouvelle box démarre automatiquement.</div>' +
            '<div class="boxinfo">💡 Nos box catering contiennent <b>40 minis</b>. Pour une présentation optimale, commandez de préférence par <b>multiples de 40</b> (40, 80, 120…).</div>' +
            '<div id="unitlist"></div>' +
            '<div class="cm-gauge-wrap">' +
              '<div class="cmbarout" id="cmbarwrap"><div class="cmbarin" id="cmbar"></div></div>' +
              '<div class="cmlabel" id="cmlabel"></div>' +
            '</div>' +
          '</div>' +

          // BLOC 2 — Nos box prêtes
          '<div class="card">' +
            '<div class="sec-h"><span class="sec-t">Nos box prêtes</span></div>' +
            '<div class="sec-d">Ou partez sur un de nos assortiments signature, prêts à dévorer. Chaque box = 40 minis dressés par nos soins.</div>' +
            '<div id="pretlist"></div>' +
          '</div>' +

          // Rappel "Formule Livraison" (si pas de live cooking)
          '<div class="formlivr" id="formlivr" style="display:none">' +
            '<div class="fl-t">Formule Livraison</div>' +
            '<div class="fl-d">Vos box arrivent prêtes à servir, dressées par nos soins et livrées sur place. Envie d&#39;un chef qui cuisine vos minis en direct devant vos invités ? Découvrez le Live Cooking.</div>' +
            '<button class="fl-btn" onclick="scrollToLive()">Ajouter le Live Cooking →</button>' +
          '</div>' +

          // BLOC 3 — Live cooking
          '<div class="card" id="livecard"><div class="sec-h"><span class="sec-t">🔥 Live cooking</span></div><div class="sec-d">Un chef Meshuga prépare vos minis en direct, devant vos invités. En option.</div><div id="livelist"></div></div>' +

          // BLOC 4 — Boissons
          '<div class="card"><div class="sec-h"><span class="sec-t">🥤 Boissons</span></div><div class="sec-d">À ajouter selon vos envies.</div><div id="drinklist"></div></div>' +

          // Récap minis
          '<div class="card" id="recapcard" style="display:none"><div class="yt" style="font-size:17px;margin-bottom:6px">Le détail de vos minis</div><div style="font-size:11px;color:#888;margin-bottom:8px">Le nombre total de chaque mini, toutes vos box réunies.</div><div id="minirecap"></div></div>' +
        '</div>' +
        '<div>' +
          '<div class="card" style="position:sticky;top:10px">' +
            '<div style="display:flex;justify-content:space-between;font-size:13px;padding:3px 0"><span style="color:#7a7a82">Sous-total HT</span><b id="tht"></b></div>' +
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
