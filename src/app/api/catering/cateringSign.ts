// Générateur HTML de la page de signature client d'un devis (flux ISOLÉ du système RH).
// Pur HTML + JS inline (servi par un route handler, donc les <script> s'exécutent).

export interface SignItem {
  name: string
  qty: number
}

export interface DevisSignPayload {
  token: string
  numero: string
  clientNom: string
  eventDateLabel: string
  eventLieu: string
  formatLabel: string
  pax: number
  formuleLabel: string
  items: SignItem[]
  totalTTC: number
  perPersTTC: number
  logoUrl: string // logotype BLANC (sur bandeau rose)
}

function esc(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fmtEur(n: number): string {
  var v = Math.round((Number(n) || 0) * 100) / 100
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function sharedHead(title: string): string {
  return '<!DOCTYPE html><html lang="fr"><head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">' +
    '<title>' + esc(title) + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Yellowtail&display=swap" rel="stylesheet">' +
    '<style>' +
    '*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
    'body{margin:0;font-family:"Arial Narrow",Arial,Helvetica,sans-serif;color:#191923;background:#FFF7FB}' +
    '.wrap{max-width:640px;margin:0 auto;padding:0 0 60px}' +
    '.band{background:#FF82D7;padding:22px 20px 20px;text-align:center}' +
    '.band img{height:34px;width:auto;display:inline-block}' +
    '.band .tag{color:#fff;font-size:13px;letter-spacing:2px;margin-top:6px;text-transform:uppercase}' +
    '.card{background:#fff;border:2px solid #191923;border-radius:16px;box-shadow:4px 4px 0 #191923;margin:18px 16px;padding:18px}' +
    '.h{font-family:Yellowtail,cursive;font-size:28px;line-height:1;margin:0 0 4px}' +
    '.sub{color:#777;font-size:13px;margin:0 0 14px}' +
    '.row{display:flex;justify-content:space-between;gap:12px;font-size:14px;padding:5px 0;border-bottom:1px solid #F0E0EC}' +
    '.row:last-child{border-bottom:0}' +
    '.row .l{color:#555}.row .v{font-weight:700;text-align:right}' +
    '.items{margin:10px 0 0}' +
    '.it{display:flex;justify-content:space-between;gap:10px;font-size:14px;padding:6px 0;border-bottom:1px dashed #EEDDE8}' +
    '.it .q{font-weight:700;color:#FF82D7;white-space:nowrap}' +
    '.ttc{background:#FFEB5A;border:2px solid #191923;border-radius:12px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:14px}' +
    '.ttc .lab{font-family:Yellowtail,cursive;font-size:24px}' +
    '.ttc .val{font-size:22px;font-weight:900}' +
    '.ttc .pp{font-size:12px;color:#555;text-align:right;margin-top:2px}' +
    '.terms{font-size:13px;line-height:1.5;color:#333}' +
    '.chk{display:flex;align-items:flex-start;gap:10px;margin:12px 0;font-size:13.5px;line-height:1.45;cursor:pointer}' +
    '.chk input{width:22px;height:22px;flex:0 0 22px;margin-top:1px;accent-color:#FF82D7}' +
    '.lbl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#191923;margin:14px 0 6px}' +
    '.inp{width:100%;border:2px solid #191923;border-radius:10px;padding:11px 12px;font-size:15px;font-family:inherit;background:#fff}' +
    '.padwrap{border:2px solid #191923;border-radius:12px;background:#fff;position:relative;overflow:hidden}' +
    'canvas{display:block;width:100%;height:200px;touch-action:none;cursor:crosshair}' +
    '.padph{position:absolute;top:50%;left:0;right:0;transform:translateY(-50%);text-align:center;color:#CDB9C6;font-size:15px;pointer-events:none}' +
    '.clear{position:absolute;top:8px;right:10px;font-size:12px;color:#CC0066;background:#fff;border:1px solid #F2C9DF;border-radius:8px;padding:4px 10px;cursor:pointer}' +
    '.cta{width:100%;margin-top:18px;border:2px solid #191923;border-radius:12px;padding:15px;font-size:16px;font-weight:900;cursor:pointer;background:#FF82D7;color:#fff;box-shadow:3px 3px 0 #191923}' +
    '.cta:disabled{background:#EBEBEB;color:#999;box-shadow:none;cursor:not-allowed}' +
    '.hint{text-align:center;font-size:12px;color:#888;margin-top:8px}' +
    '.foot{text-align:center;font-size:11px;color:#aaa;margin:18px 16px 0;line-height:1.5}' +
    '.ov{position:fixed;inset:0;background:rgba(255,247,251,.92);display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;z-index:50}' +
    '.spin{width:42px;height:42px;border:4px solid #FFD6EE;border-top-color:#FF82D7;border-radius:50%;animation:sp 1s linear infinite}' +
    '@keyframes sp{to{transform:rotate(360deg)}}' +
    '.done-ico{font-size:54px;text-align:center;margin:6px 0}' +
    '</style></head>'
}

export function buildDevisSignHtml(p: DevisSignPayload): string {
  var logo = p.logoUrl
    ? '<img src="' + esc(p.logoUrl) + '" alt="meshuga">'
    : '<div style="font-family:Yellowtail,cursive;font-size:30px;color:#fff">meshuga</div>'

  var itemsHtml = ''
  for (var i = 0; i < p.items.length; i++) {
    itemsHtml += '<div class="it"><span>' + esc(p.items[i].name) + '</span><span class="q">x' + esc(p.items[i].qty) + '</span></div>'
  }

  return sharedHead('Signature de votre devis — MESHUGA') +
    '<body><div class="wrap">' +
    '<div class="band">' + logo + '<div class="tag">Events &middot; Paris</div></div>' +

    // Récap
    '<div class="card">' +
    '<div class="h">Votre devis</div>' +
    '<div class="sub">N&deg; ' + esc(p.numero) + ' &middot; Formule ' + esc(p.formuleLabel) + '</div>' +
    '<div class="row"><span class="l">Client</span><span class="v">' + esc(p.clientNom) + '</span></div>' +
    '<div class="row"><span class="l">Prestation</span><span class="v">' + esc(p.formatLabel) + ' &middot; ' + esc(p.pax) + ' pers.</span></div>' +
    (p.eventDateLabel ? '<div class="row"><span class="l">Date</span><span class="v">' + esc(p.eventDateLabel) + '</span></div>' : '') +
    (p.eventLieu ? '<div class="row"><span class="l">Lieu</span><span class="v">' + esc(p.eventLieu) + '</span></div>' : '') +
    '<div class="items">' + itemsHtml + '</div>' +
    '<div class="ttc"><span class="lab">Total TTC</span><span><div class="val">' + fmtEur(p.totalTTC) + '</div><div class="pp">soit ' + fmtEur(p.perPersTTC) + ' / personne</div></span></div>' +
    '</div>' +

    // Conditions + signature
    '<div class="card">' +
    '<div class="h">Bon pour accord</div>' +
    '<div class="sub">Validez votre commande en signant ci-dessous.</div>' +

    '<label class="chk"><input type="checkbox" id="ckTerms">' +
    '<span class="terms">Je reconnais avoir pris connaissance des conditions : un <strong>acompte de 30 %</strong> est dû à la commande, le <strong>solde 5 jours ouvrés avant l&#39;événement</strong> (sauf accord préalable écrit). À défaut, la prestation peut être annulée et l&#39;acompte conservé. J&#39;accepte les Conditions Générales de Vente jointes au devis.</span></label>' +

    '<label class="chk"><input type="checkbox" id="ckAccord">' +
    '<span class="terms">Bon pour accord : j&#39;accepte sans réserve les prestations, quantités et tarifs du présent devis, ce qui vaut commande ferme.</span></label>' +

    '<div class="lbl">Nom et fonction du signataire</div>' +
    '<input class="inp" id="signerName" placeholder="Prénom Nom — fonction" autocomplete="name">' +

    '<div class="lbl">Signature</div>' +
    '<div class="padwrap"><canvas id="pad"></canvas><div class="padph" id="padph">Signez ici avec le doigt ou la souris</div><span class="clear" id="clearBtn">Effacer</span></div>' +

    '<button class="cta" id="cta" disabled>Valider et signer</button>' +
    '<div class="hint" id="hint">Cochez les cases, indiquez votre nom et signez.</div>' +
    '</div>' +

    '<div class="foot">SAS AEGIA FOOD (enseigne MESHUGA) &middot; 3 rue Vavin 75006 Paris &middot; events@meshuga.fr<br>Signature électronique horodatée (eIDAS, art. 1366-1367 du Code civil).</div>' +
    '</div>' +

    '<div class="ov" id="ov"><div class="spin"></div><div style="font-weight:700">Enregistrement de votre signature…</div></div>' +

    '<script>' + buildSignScript(p.token) + '</script>' +
    '</body></html>'
}

function buildSignScript(token: string): string {
  return [
    '(function(){',
    'var TOKEN=' + JSON.stringify(token) + ';',
    'var canvas=document.getElementById("pad");var ctx=canvas.getContext("2d");',
    'var ph=document.getElementById("padph");var hasDrawn=false;var drawing=false;',
    'function resize(){var r=canvas.getBoundingClientRect();var dpr=window.devicePixelRatio||1;var data=hasDrawn?canvas.toDataURL():null;canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineWidth=2.2;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#191923";if(data){var img=new Image();img.onload=function(){ctx.drawImage(img,0,0,r.width,r.height);};img.src=data;}}',
    'window.addEventListener("resize",resize);resize();',
    'function pos(e){var r=canvas.getBoundingClientRect();var t=e.touches&&e.touches[0]?e.touches[0]:e;return {x:t.clientX-r.left,y:t.clientY-r.top};}',
    'function start(e){e.preventDefault();drawing=true;var pt=pos(e);ctx.beginPath();ctx.moveTo(pt.x,pt.y);}',
    'function move(e){if(!drawing)return;e.preventDefault();var pt=pos(e);ctx.lineTo(pt.x,pt.y);ctx.stroke();if(!hasDrawn){hasDrawn=true;ph.style.display="none";refresh();}}',
    'function end(){drawing=false;}',
    'canvas.addEventListener("mousedown",start);canvas.addEventListener("mousemove",move);window.addEventListener("mouseup",end);',
    'canvas.addEventListener("touchstart",start,{passive:false});canvas.addEventListener("touchmove",move,{passive:false});canvas.addEventListener("touchend",end);',
    'document.getElementById("clearBtn").addEventListener("click",function(){ctx.clearRect(0,0,canvas.width,canvas.height);hasDrawn=false;ph.style.display="block";refresh();});',
    'var ckT=document.getElementById("ckTerms");var ckA=document.getElementById("ckAccord");var nm=document.getElementById("signerName");var cta=document.getElementById("cta");var hint=document.getElementById("hint");',
    'function valid(){return ckT.checked&&ckA.checked&&nm.value.trim().length>1&&hasDrawn;}',
    'function refresh(){var ok=valid();cta.disabled=!ok;hint.textContent=ok?"Tout est prêt. Cliquez pour signer.":"Cochez les cases, indiquez votre nom et signez.";}',
    'ckT.addEventListener("change",refresh);ckA.addEventListener("change",refresh);nm.addEventListener("input",refresh);',
    'cta.addEventListener("click",function(){',
    ' if(!valid())return;cta.disabled=true;document.getElementById("ov").style.display="flex";',
    ' var meta={ua:navigator.userAgent,tz:(Intl&&Intl.DateTimeFormat?Intl.DateTimeFormat().resolvedOptions().timeZone:""),screen:(screen.width+"x"+screen.height),lang:navigator.language,clientTime:new Date().toISOString()};',
    ' var payload={signature:canvas.toDataURL("image/png"),signerName:nm.value.trim(),acceptedTerms:true,acceptedAccord:true,meta:meta};',
    ' fetch("/api/catering/sign/"+TOKEN+"/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})',
    '  .then(function(r){return r.json();}).then(function(d){',
    '    if(d&&d.ok){document.querySelector(".wrap").innerHTML=' + JSON.stringify(doneInner()) + ';document.getElementById("ov").style.display="none";window.scrollTo(0,0);}',
    '    else{document.getElementById("ov").style.display="none";cta.disabled=false;alert((d&&d.error)||"Une erreur est survenue. Merci de réessayer ou d\\u2019écrire à events@meshuga.fr");}',
    '  }).catch(function(){document.getElementById("ov").style.display="none";cta.disabled=false;alert("Connexion impossible, merci de réessayer.");});',
    '});',
    'refresh();',
    '})();'
  ].join('\n')
}

function doneInner(): string {
  return '<div class="band"><div style="font-family:Yellowtail,cursive;font-size:30px;color:#fff">meshuga</div><div class="tag">Events &middot; Paris</div></div>' +
    '<div class="card" style="text-align:center">' +
    '<div class="done-ico">🎉</div>' +
    '<div class="h">Merci, c&#39;est signé !</div>' +
    '<div class="sub" style="margin-bottom:0">Votre commande est confirmée. Vous allez recevoir un email récapitulatif avec les modalités de règlement de l&#39;acompte. Notre équipe revient vers vous très vite.</div>' +
    '</div>' +
    '<div class="foot">SAS AEGIA FOOD (enseigne MESHUGA) &middot; events@meshuga.fr</div>'
}

// État "déjà signé" ou "lien invalide"
export function buildSignStateHtml(kind: string, info?: { numero?: string; signedAtLabel?: string }): string {
  var i = info || {}
  var body = ''
  if (kind === 'done') {
    body = '<div class="card" style="text-align:center">' +
      '<div class="done-ico">✅</div>' +
      '<div class="h">Devis déjà signé</div>' +
      '<div class="sub" style="margin-bottom:0">Le devis ' + (i.numero ? 'N&deg; ' + esc(i.numero) + ' ' : '') + 'a bien été signé' + (i.signedAtLabel ? ' le ' + esc(i.signedAtLabel) : '') + '. Aucune action supplémentaire n&#39;est nécessaire.</div>' +
      '</div>'
  } else {
    body = '<div class="card" style="text-align:center">' +
      '<div class="done-ico">🔗</div>' +
      '<div class="h">Lien invalide</div>' +
      '<div class="sub" style="margin-bottom:0">Ce lien de signature n&#39;est plus valide ou a expiré. Merci de nous contacter à events@meshuga.fr.</div>' +
      '</div>'
  }
  return sharedHead('MESHUGA') +
    '<body><div class="wrap">' +
    '<div class="band"><div style="font-family:Yellowtail,cursive;font-size:30px;color:#fff">meshuga</div><div class="tag">Events &middot; Paris</div></div>' +
    body +
    '<div class="foot">SAS AEGIA FOOD (enseigne MESHUGA) &middot; events@meshuga.fr</div>' +
    '</div></body></html>'
}
