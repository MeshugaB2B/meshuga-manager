// Générateur HTML de la page de signature client d'un devis (flux ISOLÉ du système RH).
// v2 : signature TAPÉE (rendu manuscrit, marche desktop + mobile) + vérification par code SMS (OTP).
// Pur HTML + JS inline (servi par un route handler, donc les <script> s'exécutent).
import { MESHUGA_LOGO_PINK_DATA_URI } from '@/lib/meshugaLogo'

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
  prefillPhone?: string
  prefillEmail?: string
  devisId?: number // pour le lien "voir le devis signé" sur la page de confirmation
  logoPinkUrl?: string // logotype ROSE (sur fond clair, page de confirmation)
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
    '.chk-sm{font-size:12px;margin:9px 0 0}.chk-sm input{width:18px;height:18px;flex:0 0 18px}' +
    '.chantabs{display:flex;gap:8px;margin:6px 0 4px}' +
    '.chantab{flex:1;border:2px solid #191923;border-radius:10px;background:#fff;padding:11px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;color:#191923}' +
    '.chantab.on{background:#FF82D7;color:#fff;box-shadow:2px 2px 0 #191923}' +
    '.lbl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#191923;margin:14px 0 6px}' +
    '.inp{width:100%;border:2px solid #191923;border-radius:10px;padding:11px 12px;font-size:15px;font-family:inherit;background:#fff}' +
    '.sigprev{margin-top:8px;border:2px dashed #E3C7DA;border-radius:10px;background:#FFFCFE;min-height:70px;display:flex;align-items:center;justify-content:center;font-family:Yellowtail,cursive;font-size:38px;color:#FF82D7;padding:8px 12px;line-height:1.05;word-break:break-word;text-align:center}' +
    '.sigprev.empty{color:#CDB9C6;font-size:15px;font-family:inherit}' +
    '.cta{width:100%;margin-top:18px;border:2px solid #191923;border-radius:12px;padding:15px;font-size:16px;font-weight:900;cursor:pointer;background:#FF82D7;color:#fff;box-shadow:3px 3px 0 #191923}' +
    '.cta-yt{font-family:Yellowtail,cursive;font-weight:400;font-size:26px;line-height:1;letter-spacing:.5px}' +
    '.cta:disabled{background:#EBEBEB;color:#999;box-shadow:none;cursor:not-allowed}' +
    '.hint{text-align:center;font-size:12px;color:#888;margin-top:8px}' +
    '.otpsec{display:none;margin-top:6px;border-top:1px solid #F0E0EC;padding-top:16px}' +
    '.otpmsg{font-size:13px;color:#333;margin-bottom:10px}' +
    '.otpinp{width:100%;border:2px solid #191923;border-radius:10px;padding:13px;font-size:24px;letter-spacing:8px;text-align:center;font-weight:800;font-family:inherit}' +
    '.resend{display:block;text-align:center;margin-top:10px;font-size:12px;color:#FF82D7;text-decoration:underline;cursor:pointer;background:none;border:0;width:100%}' +
    '.foot{text-align:center;font-size:11px;color:#aaa;margin:18px 16px 0;line-height:1.5}' +
    '.ov{position:fixed;inset:0;background:rgba(255,247,251,.92);display:none;align-items:center;justify-content:center;flex-direction:column;gap:14px;z-index:50}' +
    '.spin{width:42px;height:42px;border:4px solid #FFD6EE;border-top-color:#FF82D7;border-radius:50%;animation:sp 1s linear infinite}' +
    '@keyframes sp{to{transform:rotate(360deg)}}' +
    '.done-ico{font-size:54px;text-align:center;margin:6px 0}' +
    '</style></head>'
}

// Bandeau rose avec le logotype blanc (même origine que l'app, fiable).
function bandHeader(): string {
  return '<div class="band">' +
    '<img src="/MESHUGA_Logotype_white.png" alt="Meshuga">' +
    '<div class="tag">Events &middot; Paris</div>' +
    '</div>'
}

export function buildDevisSignHtml(p: DevisSignPayload): string {
  var logo = p.logoUrl
    ? '<img src="' + esc(p.logoUrl) + '" alt="Meshuga">'
    : '<img src="/MESHUGA_Logotype_white.png" alt="Meshuga">'

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

    '<div class="lbl">Signature — tapez votre prénom et nom</div>' +
    '<input class="inp" id="signerName" placeholder="Ex : Camille Roux" autocomplete="name">' +
    '<div class="sigprev empty" id="sigprev">Votre signature apparaîtra ici</div>' +

    '<div class="lbl">Comment souhaitez-vous recevoir votre code de vérification ?</div>' +
    '<div class="chantabs">' +
      '<button type="button" class="chantab on" id="tabSms">📱 Par SMS</button>' +
      '<button type="button" class="chantab" id="tabEmail">✉️ Par email</button>' +
    '</div>' +

    // Canal SMS
    '<div id="smsBlock">' +
      '<div class="lbl">Téléphone mobile (pour recevoir votre code)</div>' +
      '<input class="inp" id="signerPhone" type="tel" inputmode="tel" placeholder="06 12 34 56 78" autocomplete="tel" value="' + esc(p.prefillPhone || '') + '">' +
    '</div>' +

    // Canal Email
    '<div id="emailBlock" style="display:none">' +
      '<div class="lbl">Adresse email (pour recevoir votre code)</div>' +
      '<input class="inp" id="signerEmail" type="email" inputmode="email" placeholder="vous@entreprise.fr" autocomplete="email" value="' + esc(p.prefillEmail || '') + '">' +
      '<label class="chk chk-sm" id="updEmailWrap" style="display:none"><input type="checkbox" id="ckUpdEmail">' +
      '<span class="terms">Utiliser dorénavant cette adresse pour ce contact (met à jour votre fiche).</span></label>' +
    '</div>' +

    '<button class="cta" id="ctaSend" disabled>Recevoir mon code</button>' +
    '<div class="hint" id="hint">Cochez les cases, signez et indiquez vos coordonnées.</div>' +

    // Étape 2 : OTP
    '<div class="otpsec" id="otpsec">' +
    '<div class="otpmsg" id="otpmsg">Un code à 6 chiffres vient de vous être envoyé.</div>' +
    '<input class="otpinp" id="otpInput" type="text" inputmode="numeric" maxlength="6" placeholder="······" autocomplete="one-time-code">' +
    '<button class="cta cta-yt" id="ctaSign" disabled>Signer définitivement</button>' +
    '<button class="resend" id="resendBtn" type="button">Je n&#39;ai pas reçu le code — renvoyer</button>' +
    '</div>' +

    '</div>' +

    '<div class="foot">SAS AEGIA FOOD (enseigne MESHUGA) &middot; 3 rue Vavin 75006 Paris &middot; events@meshuga.fr<br>Signature électronique vérifiée par code et horodatée (eIDAS, art. 1366-1367 du Code civil).</div>' +
    '</div>' +

    '<div class="ov" id="ov"><div class="spin"></div><div style="font-weight:700" id="ovmsg">Traitement…</div></div>' +

    '<script>' + buildSignScript(p.token, p.prefillEmail || '', doneInner(p.numero, p.devisId ? '/api/catering/view-devis/' + p.devisId : '', p.logoPinkUrl || '')) + '</script>' +
    '</body></html>'
}

function buildSignScript(token: string, origEmail: string, doneHtml: string): string {
  return [
    '(function(){',
    'var TOKEN=' + JSON.stringify(token) + ';',
    'var ORIG_EMAIL=' + JSON.stringify(String(origEmail || '').toLowerCase()) + ';',
    'var channel="sms";',
    'var ckT=document.getElementById("ckTerms");var ckA=document.getElementById("ckAccord");',
    'var nm=document.getElementById("signerName");var ph=document.getElementById("signerPhone");',
    'var em=document.getElementById("signerEmail");',
    'var tabSms=document.getElementById("tabSms");var tabEmail=document.getElementById("tabEmail");',
    'var smsBlock=document.getElementById("smsBlock");var emailBlock=document.getElementById("emailBlock");',
    'var updWrap=document.getElementById("updEmailWrap");var ckUpd=document.getElementById("ckUpdEmail");',
    'var prev=document.getElementById("sigprev");var hint=document.getElementById("hint");',
    'var ctaSend=document.getElementById("ctaSend");var otpsec=document.getElementById("otpsec");',
    'var otpInput=document.getElementById("otpInput");var ctaSign=document.getElementById("ctaSign");',
    'var ov=document.getElementById("ov");var ovmsg=document.getElementById("ovmsg");',
    'nm.addEventListener("input",function(){var v=nm.value.trim();if(v){prev.textContent=v;prev.className="sigprev";}else{prev.textContent="Votre signature apparaîtra ici";prev.className="sigprev empty";}refresh1();});',
    'function phoneOk(v){return (v||"").replace(/[^0-9]/g,"").length>=9;}',
    'function emailOk(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test((v||"").trim());}',
    'function setChannel(c){channel=c;if(c==="sms"){tabSms.className="chantab on";tabEmail.className="chantab";smsBlock.style.display="";emailBlock.style.display="none";}else{tabEmail.className="chantab on";tabSms.className="chantab";smsBlock.style.display="none";emailBlock.style.display="";}refresh1();}',
    'tabSms.addEventListener("click",function(){setChannel("sms");});',
    'tabEmail.addEventListener("click",function(){setChannel("email");});',
    'function destOk(){return channel==="sms"?phoneOk(ph.value):emailOk(em.value);}',
    'function valid1(){return ckT.checked&&ckA.checked&&nm.value.trim().length>1&&destOk();}',
    'function refresh1(){var ok=valid1();ctaSend.disabled=!ok;ctaSend.textContent=channel==="sms"?"Recevoir mon code par SMS":"Recevoir mon code par email";hint.textContent=ok?"Prêt. Recevez votre code pour signer.":"Cochez les cases, signez et indiquez vos coordonnées.";if(channel==="email"){var changed=emailOk(em.value)&&em.value.trim().toLowerCase()!==ORIG_EMAIL&&ORIG_EMAIL!=="";updWrap.style.display=changed?"flex":"none";}}',
    'ckT.addEventListener("change",refresh1);ckA.addEventListener("change",refresh1);ph.addEventListener("input",refresh1);em.addEventListener("input",refresh1);',
    'otpInput.addEventListener("input",function(){otpInput.value=otpInput.value.replace(/[^0-9]/g,"").slice(0,6);ctaSign.disabled=otpInput.value.length!==6;});',
    'function sendCode(isResend){if(!valid1())return;ov.style.display="flex";ovmsg.textContent=isResend?"Renvoi du code…":"Envoi du code…";',
    ' var payload={channel:channel,signerName:nm.value.trim(),signatureTyped:nm.value.trim(),acceptedTerms:ckT.checked,acceptedAccord:ckA.checked};',
    ' if(channel==="sms"){payload.phone=ph.value.trim();}else{payload.email=em.value.trim();}',
    ' fetch("/api/catering/sign/"+TOKEN+"/otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)})',
    '  .then(function(r){return r.json();}).then(function(d){ov.style.display="none";',
    '   if(d&&d.ok){otpsec.style.display="block";ctaSend.style.display="none";tabSms.disabled=true;tabEmail.disabled=true;var via=(d.channel==="email"?"par email à ":"par SMS au ")+(d.destMasked||"");document.getElementById("otpmsg").textContent="Un code à 6 chiffres vient d\\u2019être envoyé "+via+".";otpInput.focus();}',
    '   else{ctaSend.disabled=false;alert((d&&d.error)||"Envoi impossible. Vérifiez vos coordonnées et réessayez.");}',
    '  }).catch(function(){ov.style.display="none";ctaSend.disabled=false;alert("Connexion impossible, merci de réessayer.");});',
    '}',
    'ctaSend.addEventListener("click",function(){ctaSend.disabled=true;sendCode(false);});',
    'document.getElementById("resendBtn").addEventListener("click",function(){sendCode(true);});',
    'ctaSign.addEventListener("click",function(){if(otpInput.value.length!==6)return;ctaSign.disabled=true;ov.style.display="flex";ovmsg.textContent="Enregistrement de votre signature…";',
    ' var meta={ua:navigator.userAgent,tz:(Intl&&Intl.DateTimeFormat?Intl.DateTimeFormat().resolvedOptions().timeZone:""),screen:(screen.width+"x"+screen.height),lang:navigator.language,clientTime:new Date().toISOString()};',
    ' var sp={signerName:nm.value.trim(),signatureTyped:nm.value.trim(),otp:otpInput.value,acceptedTerms:ckT.checked,acceptedAccord:ckA.checked,channel:channel,meta:meta};',
    ' if(channel==="sms"){sp.phone=ph.value.trim();}else{sp.email=em.value.trim();sp.updateContactEmail=(ckUpd&&ckUpd.checked)===true;}',
    ' fetch("/api/catering/sign/"+TOKEN+"/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(sp)})',
    '  .then(function(r){return r.json();}).then(function(d){',
    '    if(d&&d.ok){document.querySelector(".wrap").innerHTML=' + JSON.stringify(doneHtml) + ';ov.style.display="none";window.scrollTo(0,0);}',
    '    else{ov.style.display="none";ctaSign.disabled=false;alert((d&&d.error)||"Code incorrect ou expiré. Réessayez.");}',
    '  }).catch(function(){ov.style.display="none";ctaSign.disabled=false;alert("Connexion impossible, merci de réessayer.");});',
    '});',
    'refresh1();',
    '})();'
  ].join('\n')
}

function doneInner(numero: string, signedUrl: string, logoPinkUrl: string): string {
  var pink = logoPinkUrl || MESHUGA_LOGO_PINK_DATA_URI
  return '<div style="text-align:center;padding:26px 20px 6px"><img src="' + esc(pink) + '" alt="Meshuga" style="height:40px;width:auto;display:inline-block"></div>' +
    '<div class="card" style="text-align:center">' +
    '<div class="done-ico">🎉</div>' +
    '<div class="h">Merci, c&#39;est signé !</div>' +
    '<div class="sub">C&#39;est officiel : votre devis <strong>N&deg; ' + esc(numero) + '</strong> est signé. Pour que votre commande soit définitivement validée, il vous reste à régler l&#39;acompte — toutes les modalités vous arrivent par email dans la foulée.</div>' +
    (signedUrl ? '<a href="' + esc(signedUrl) + '" target="_blank" rel="noopener" class="cta cta-yt" style="display:inline-block;text-decoration:none;width:auto;padding:13px 30px;margin-top:6px">Voir mon devis signé</a>' : '') +
    '<div class="sub" style="margin:16px 0 0;font-size:13px;color:#888">Notre équipe revient vers vous très vite.</div>' +
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
    bandHeader() +
    body +
    '<div class="foot">SAS AEGIA FOOD (enseigne MESHUGA) &middot; events@meshuga.fr</div>' +
    '</div></body></html>'
}
