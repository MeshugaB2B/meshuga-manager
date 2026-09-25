// src/app/events/eventsStyles.ts
// Styles de events.meshuga.fr — langage visuel de la carte « ciel de bar » 2026
// Jaune #FFEB5A (fond) · Rose #FF82D7 (accents) · Noir #191923 (texte, bandeaux)

export var EVENTS_CSS = `
.mev{--j:#FFEB5A;--r:#FF82D7;--n:#191923;--b:#FFFFFF;
  --bild:'BILD Condensed','Arial Narrow',Impact,sans-serif;
  --script:'Yellowtail',cursive;
  --narrow:'Arial Narrow','Helvetica Neue',Arial,sans-serif;
  min-height:100vh;background:var(--j);color:var(--n);font-family:var(--narrow);
  -webkit-font-smoothing:antialiased;padding-bottom:90px}
.mev *{box-sizing:border-box}
:where(.mev) :where(button,input,select,textarea){font-family:inherit;color:inherit}
.mev :focus-visible{outline:3px solid var(--n);outline-offset:2px}

.mev-wrap{max-width:1180px;margin:0 auto;padding:0 20px}

/* En-tête */
.mev-head{display:flex;align-items:center;justify-content:space-between;padding:22px 0 8px}
.mev-logo{height:46px;width:auto;display:block}
.mev-call{font-family:var(--narrow);font-weight:700;font-size:16px;color:var(--n);text-decoration:none;border-bottom:2px solid var(--n)}

.mev-hero{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:center;padding:26px 0 34px}
.mev-hero h1{font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:clamp(46px,8vw,104px);line-height:.86;margin:0;letter-spacing:-.5px}
.mev-hero p{font-size:20px;line-height:1.35;margin:18px 0 0;max-width:560px}
.mev-hero p b{background:var(--b);padding:0 4px}
.mev-stamp{width:170px;height:170px;transform:rotate(-12deg);animation:mev-stamp .9s cubic-bezier(.2,1.4,.4,1) both}
@keyframes mev-stamp{from{transform:rotate(-40deg) scale(.4);opacity:0}to{transform:rotate(-12deg) scale(1);opacity:1}}

/* Grille principale */
.mev-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:28px;align-items:start}

/* Le tableau (comme la carte) */
.mev-board{background:var(--b);border:3px solid var(--n);border-radius:22px;overflow:hidden}
.mev-band{background:var(--n);color:var(--b);display:flex;align-items:baseline;justify-content:space-between;padding:12px 22px 8px}
.mev-band h2{font-family:var(--script);font-weight:400;font-size:38px;margin:0;line-height:1}
.mev-band span{font-size:18px;letter-spacing:.5px}
.mev-list{list-style:none;margin:0;padding:8px 22px 18px}
.mev-item{padding:16px 0 14px;border-bottom:1px dashed rgba(25,25,35,.25)}
.mev-item:last-child{border-bottom:0}
.mev-row{display:flex;align-items:flex-end;gap:10px}
.mev-name{font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:clamp(26px,3.4vw,38px);line-height:.9;margin:0}
.mev-lead{flex:1;border-bottom:2px solid var(--n);margin-bottom:6px;min-width:20px}
.mev-price{font-size:30px;line-height:1;white-space:nowrap}
.mev-comp{font-size:14px;text-transform:uppercase;letter-spacing:.2px;margin:6px 0 0;line-height:1.3}
.mev-tag{font-family:var(--script);font-size:21px;margin:4px 0 0;line-height:1.2}
.mev-under{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}
.mev-ttc{font-size:14px;opacity:.7}

.mev-allerg{font-size:13px;margin:6px 0 0;opacity:.8}
.mev-allerg-note{margin:0 22px 20px;padding:12px 14px;border:2px solid var(--n);border-radius:10px;font-size:14px;line-height:1.4;background:var(--j)}
.mev-cgv-check{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.4;cursor:pointer}
.mev-cgv-check input{width:20px;height:20px;margin:1px 0 0;flex:none;accent-color:var(--n)}
.mev-cgv-check a{color:var(--n);font-weight:700}

/* Stepper quantité */
.mev-qty{display:flex;align-items:center;gap:10px}
.mev-qty button{width:38px;height:38px;border-radius:50%;border:2px solid var(--n);background:var(--b);font-size:22px;font-weight:700;line-height:1;cursor:pointer}
.mev-qty button.on{background:var(--n);color:var(--j)}
.mev-qty button:disabled{opacity:.3;cursor:default}
.mev-qty b{min-width:18px;text-align:center;font-size:20px}
.mev-add{border:2px solid var(--n);background:var(--j);border-radius:999px;padding:8px 18px;font-weight:700;font-size:16px;cursor:pointer}
.mev-add:hover{background:var(--r)}
.mev-item.in{background:linear-gradient(90deg,rgba(255,130,215,.14),transparent 70%)}

/* Ticket de commande */
.mev-ticket{position:sticky;top:18px;background:var(--b);border:3px solid var(--n);border-radius:6px;box-shadow:8px 8px 0 var(--r);padding:20px 20px 22px}
.mev-ticket h2{font-family:var(--script);font-weight:400;font-size:36px;margin:0 0 6px;line-height:1}
.mev-empty{font-size:16px;line-height:1.4;margin:8px 0 4px;opacity:.75}
.mev-lines{list-style:none;margin:10px 0 0;padding:0;border-top:2px solid var(--n)}
.mev-lines li{display:flex;justify-content:space-between;gap:10px;padding:7px 0;font-size:16px;border-bottom:1px dashed rgba(25,25,35,.3)}
.mev-lines li.tot{border-bottom:0;font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:26px;padding-top:10px}
.mev-lines li.sub{font-size:14px;opacity:.75}

.mev-form{display:grid;gap:10px;margin-top:18px}
.mev-form h3{font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:20px;margin:10px 0 0}
.mev-f2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.mev-field label{display:block;font-size:13px;font-weight:700;margin-bottom:3px}
.mev-field input,.mev-field select,.mev-field textarea{width:100%;border:2px solid var(--n);border-radius:6px;background:var(--b);padding:9px 10px;font-size:16px}
.mev-field textarea{min-height:64px;resize:vertical}
.mev-hint{font-size:13px;line-height:1.35;margin:2px 0 0}
.mev-hint a{color:var(--n);font-weight:700}
.mev-err{background:var(--n);color:var(--j);border-radius:6px;padding:10px 12px;font-size:15px;line-height:1.35}
.mev-pay{margin-top:6px;width:100%;border:3px solid var(--n);background:var(--r);border-radius:999px;padding:14px 18px;font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:24px;cursor:pointer;box-shadow:4px 4px 0 var(--n);transition:transform .08s,box-shadow .08s}
.mev-pay:active{transform:translate(3px,3px);box-shadow:1px 1px 0 var(--n)}
.mev-pay:disabled{opacity:.45;cursor:default;transform:none;box-shadow:4px 4px 0 var(--n)}
.mev-secure{font-size:13px;text-align:center;margin:8px 0 0;opacity:.75}

/* Bloc « Parlons-en » */
.mev-talk{margin:34px 0 0;background:var(--n);color:var(--b);border-radius:22px;padding:28px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}
.mev-talk h2{font-family:var(--script);font-weight:400;font-size:40px;margin:0;color:var(--j);line-height:1}
.mev-talk p{font-size:18px;line-height:1.4;margin:8px 0 0;max-width:620px}
.mev-talk a{display:inline-block;background:var(--j);color:var(--n);border-radius:999px;padding:14px 22px;font-family:var(--bild);font-weight:900;font-size:24px;text-decoration:none;white-space:nowrap}

.mev-foot{padding:28px 0 10px;font-size:13px;line-height:1.5;opacity:.75}

/* Barre panier mobile */
.mev-bar{display:none}

@media (max-width:900px){
  .mev-grid{grid-template-columns:1fr}
  .mev-ticket{position:static}
  .mev-stamp{width:110px;height:110px}
  .mev-talk{grid-template-columns:1fr}
  .mev-bar{display:flex;position:fixed;left:12px;right:12px;bottom:12px;z-index:20;align-items:center;justify-content:space-between;gap:10px;background:var(--n);color:var(--j);border-radius:999px;padding:12px 14px 12px 20px;font-weight:700;font-size:16px;border:0;cursor:pointer;box-shadow:0 6px 0 var(--r)}
  .mev-bar span:last-child{background:var(--r);color:var(--n);border-radius:999px;padding:6px 12px}
}
@media (max-width:560px){
  .mev-hero{grid-template-columns:1fr}
  .mev-stamp{display:none}
  .mev-f2{grid-template-columns:1fr}
  .mev-band h2{font-size:32px}
  .mev-price{font-size:24px}
}
@media (prefers-reduced-motion:reduce){.mev-stamp{animation:none}}
`
