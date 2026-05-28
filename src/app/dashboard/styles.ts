// Meshuga B2B Manager — Dashboard CSS V2 Refonte
// Desktop: sidebar compacte 148px + logo horizontal
// Mobile: header rose + bottom bar intégré jaune + stamp center
export const G = `
@import url('https://fonts.googleapis.com/css2?family=Yellowtail&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{--y:#FFEB5A;--p:#FF82D7}
@supports (color:color(display-p3 1 1 1)){:root{--y:color(display-p3 1 0.925 0.38);--p:color(display-p3 1 0.515 0.855)}}
body{font-family:'Arial Narrow',Arial,sans-serif;background:var(--y);color:#191923;height:100vh;overflow:hidden}
.yt{font-family:'Yellowtail',cursive}

/* === SHELL === */
.shell{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.shell-inner{display:flex;flex:1;overflow:hidden}

/* === TOPBAR MOBILE === */
.topbar{display:none;background:transparent;padding:12px 14px 6px;align-items:center;justify-content:center;flex-shrink:0;position:relative;z-index:2}
.topbar-logo{height:34px}
.hamburger{background:none;border:2px solid rgba(25,25,35,.3);border-radius:4px;padding:4px 8px;cursor:pointer;color:#191923;font-size:16px}

/* === SIDEBAR DESKTOP === */
.sidebar{width:var(--sb-w,210px);min-width:168px;max-width:340px;background:#FFFFFF;box-shadow:4px 0 18px rgba(25,25,35,.08);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;position:relative;z-index:2}
.sb-resizer{position:absolute;top:0;right:0;bottom:0;width:6px;cursor:col-resize;z-index:5;background:transparent;transition:background .15s}
.sb-resizer:hover,.sb-resizer.dragging{background:var(--p)}
.sb-logo{padding:16px 10px 10px;display:flex;align-items:center}
.sb-logo-text{min-width:0;width:100%}
.sb-logo-type{width:180px;max-width:100%;display:block;margin:0 auto}
.sb-nav{padding:6px 7px;flex:1;overflow-y:auto}
.sb-sec{font-family:'Yellowtail',cursive;font-size:21px;line-height:1.15;color:var(--p);padding:9px 8px 3px;margin-top:5px}
.ni{display:flex;align-items:center;gap:9px;padding:6px 9px;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;letter-spacing:0;color:#52525C;border:1.5px solid transparent;transition:all .1s;margin-bottom:0}
.ni:hover{background:var(--y);color:#191923;border-color:#191923}
.ni.active{background:var(--p);color:#FFFFFF;border-color:#191923;font-weight:800}
.ni .ni-ico{font-size:15px;flex-shrink:0}
.nb{background:#191923;color:var(--y);font-size:10px;font-weight:900;padding:1px 6px;border-radius:9px;margin-left:auto;border:1.5px solid #191923}
.sb-user{padding:10px 9px;margin:6px;border-radius:10px;background:#FAFAFA;border:1px solid #EFEFEF;display:flex;align-items:center;gap:7px}
.sb-avatar{width:30px;height:30px;border-radius:50%;background:var(--y);border:2px solid #191923;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;flex-shrink:0}
.sb-uname{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.3px}
.sb-urole{font-size:11px;opacity:.7}

/* === BOTTOM BAR MOBILE === */
.bottom-bar{display:none;background:var(--y);align-items:flex-end;justify-content:space-around;padding:6px 4px 16px;border-top:2px solid #191923;flex-shrink:0}
.bb-btn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 8px;border-radius:8px;cursor:pointer;min-width:52px;border:1.5px solid transparent;transition:all .12s}
.bb-btn .bb-ico{font-size:19px;line-height:1}
.bb-btn .bb-lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.2px;color:#191923;opacity:.55}
.bb-btn.active{background:var(--p);border-color:#191923;box-shadow:2px 2px 0 #191923}
.bb-btn.active .bb-ico{transform:scale(1.05)}
.bb-btn.active .bb-lbl{opacity:1;color:#FFFFFF}
.bb-center{width:42px;height:42px;border-radius:50%;background:#FFFFFF;border:2.5px solid #191923;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-bottom:4px;box-shadow:2px 2px 0 #191923;overflow:hidden;transition:transform .1s;flex-shrink:0}
.bb-center:hover{transform:scale(1.05)}
.bb-center:active{transform:scale(0.95)}
.bb-center img{width:36px;height:36px}
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:49}

/* === MAIN CONTENT === */
.main{flex:1;overflow-y:auto;padding:16px 20px;background:var(--y)}
.strip{height:4px;background:#191923;border-radius:2px;margin-bottom:14px}
.pt{font-family:'Yellowtail',cursive;font-size:clamp(22px,3.5vw,30px);line-height:1}
.ps{font-family:'Yellowtail',cursive;font-size:13px;opacity:.4;margin-top:2px;margin-bottom:12px}
.ph{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:10px;flex-wrap:wrap}

/* === CARDS === */
.card{background:#FFFFFF;border-radius:7px;border:2px solid #191923;padding:14px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
.card-y{background:var(--y);border-radius:7px;border:2px solid #191923;padding:14px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
.card-p{background:var(--p);border-radius:7px;border:2px solid #191923;padding:14px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
.card-click{cursor:pointer;transition:transform .1s}
.card-click:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 #191923}
.ct{font-family:'Yellowtail',cursive;font-size:16px;margin-bottom:10px}

/* === GRIDS === */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px}

/* === KPI CARDS === */
.kc{border-radius:7px;border:2px solid #191923;padding:12px;position:relative;overflow:hidden;box-shadow:3px 3px 0 #191923;cursor:pointer;transition:transform .1s}
.kc:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 #191923}
.kl{font-family:'Yellowtail',cursive;font-size:12px}
.kv{font-weight:900;font-size:28px;line-height:1.1}
.ki{position:absolute;right:8px;top:8px;font-size:18px;opacity:.15}

/* === KPI BAR === */
.kpi-bar{display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px}
.kpi-mini{background:#FFFFFF;border:2px solid #191923;border-radius:5px;padding:8px 12px;text-align:center;box-shadow:2px 2px 0 #191923;flex:1;min-width:80px;cursor:pointer}
.kpi-mini.active{background:#191923;color:var(--y)}
.kpi-mini.active .yt{color:var(--y) !important;opacity:.7}

/* === TABLE ROWS === */
.row{display:grid;align-items:center;padding:8px 0;border-bottom:2px solid #EBEBEB}
.row:last-child{border-bottom:none}
.row-click{cursor:pointer;transition:background .1s}
.row-click:hover{background:rgba(255,235,90,.2);margin:0 -4px;padding-left:4px;padding-right:4px;border-radius:4px}

/* === BADGES & BUTTONS === */
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:3px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:1.5px solid currentColor;white-space:nowrap}
.btn{padding:7px 12px;border-radius:4px;border:2px solid #191923;cursor:pointer;font-family:'Arial Narrow',Arial;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;display:inline-flex;align-items:center;gap:5px;box-shadow:2px 2px 0 #191923;background:#FFFFFF;color:#191923;transition:all .1s;white-space:nowrap}
.btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #191923}
.btn-y{background:var(--y)}
.btn-p{background:var(--p)}
.btn-n{background:#191923;color:var(--y)}
.btn-g{background:#009D3A;color:#FFFFFF}
.btn-or{background:#FF6B2B;color:#FFFFFF}
.btn-b{background:#005FFF;color:#FFFFFF}
.btn-sm{padding:4px 8px;font-size:9px;box-shadow:1px 1px 0 #191923}
.btn-red{background:#CC0066;color:#FFFFFF}

/* === FORMS === */
.inp{width:100%;padding:7px 10px;border-radius:4px;border:2px solid #191923;font-family:'Arial Narrow',Arial;font-size:12px;background:#FFFFFF;color:#191923;outline:none;box-shadow:2px 2px 0 #191923}
.inp:focus{border-color:var(--p);box-shadow:2px 2px 0 var(--p)}
.sel{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23191923' d='M5 7L0 2h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:22px}
textarea.inp{min-height:70px;resize:vertical}
.lbl{font-family:'Yellowtail',cursive;font-size:13px;display:block;margin-bottom:4px;color:#191923}
.fg{display:flex;flex-direction:column;gap:3px;margin-bottom:10px}
.fg2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

/* === MODALS === */
.overlay{position:fixed;inset:0;background:rgba(25,25,35,.6);display:flex;align-items:center;justify-content:center;z-index:100;padding:12px}
.modal{background:#FFFFFF;border-radius:8px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;border:3px solid #191923;box-shadow:8px 8px 0 #191923}
.modal-lg{max-width:680px}
.modal-xl{max-width:800px}
.mh{padding:14px 18px;border-bottom:2px solid #191923;background:var(--p);position:sticky;top:0;z-index:1}
.mt{font-weight:900;font-size:17px;text-transform:uppercase}
.mb{padding:14px 18px}
.mf{padding:10px 18px;border-top:2px solid #EBEBEB;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;position:sticky;bottom:0;background:#FFFFFF}

/* === PROGRESS === */
.pbar{width:4px;border-radius:2px;min-height:30px;flex-shrink:0}
.prog-wrap{height:10px;background:#EBEBEB;border-radius:3px;border:1.5px solid #191923;overflow:hidden;margin-top:4px}
.prog-fill{height:100%;background:#191923;border-radius:2px;transition:width .4s}

/* === TAGS === */
.tag{font-size:9px;font-weight:900;padding:3px 8px;border:1.5px solid #191923;border-radius:3px;cursor:pointer;text-transform:uppercase;letter-spacing:.5px;background:#FFFFFF;display:inline-block;margin:2px;white-space:nowrap}
.tag.on{background:#191923;color:var(--y)}

/* === TOAST === */
.toast{position:fixed;bottom:80px;right:20px;background:#191923;color:var(--y);padding:10px 18px;border-radius:6px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:2px solid var(--y);box-shadow:4px 4px 0 var(--y);z-index:999;opacity:0;transition:opacity .3s;pointer-events:none;max-width:320px}
.toast.show{opacity:1}

/* === PROSPECT/CHASSE CARDS === */
.prospect-card{background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:0;box-shadow:3px 3px 0 #191923;margin-bottom:10px;overflow:hidden}
.prospect-card-header{padding:12px 14px;cursor:pointer;transition:background .1s}
.prospect-card-header:hover{background:rgba(255,235,90,.1)}
.prospect-card-body{padding:12px 14px;border-top:2px solid #EBEBEB;background:rgba(0,0,0,.015)}
.status-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;border:2px solid currentColor;cursor:pointer;transition:all .1s}
.status-pill:hover{opacity:.8}
.chasse-card{background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:12px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}

/* === ANNUAIRE === */
.ann-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.ann-tab{padding:5px 12px;border-radius:20px;border:2px solid #191923;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;background:#FFFFFF;box-shadow:2px 2px 0 #191923}
.ann-tab.on{background:#191923;color:var(--y)}

/* === ACTIVITY LOG === */
.al{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:5px;border:2px solid #191923;background:#FFFFFF;margin-bottom:7px;box-shadow:2px 2px 0 #191923}
.al:last-child{margin-bottom:0}

/* === TASK DETAIL === */
.task-detail{background:#EBEBEB;border-radius:5px;padding:10px;font-size:12px;margin-top:8px;border:1.5px solid #191923}
.contact-item{background:#EBEBEB;border-radius:5px;padding:8px 10px;margin-bottom:6px;display:flex;align-items:center;gap:8px;border:1.5px solid #191923}

/* === RESPONSIVE MOBILE === */
/* === BOTTOM BAR MENU BUTTON (replaces .bb-center) === */
.bb-menu{display:flex;flex-direction:column;align-items:center;padding:3px 4px;cursor:pointer;border-radius:5px;min-width:56px}
.bb-menu-circle{width:54px;height:54px;border-radius:50%;background:#FFFFFF;border:3px solid #191923;display:flex;align-items:center;justify-content:center;margin-bottom:3px;box-shadow:2px 2px 0 #191923;overflow:hidden;transition:transform .1s;flex-shrink:0}
.bb-menu-circle:hover{transform:scale(1.05)}
.bb-menu-circle:active{transform:scale(0.95)}
.bb-menu-circle img{width:46px;height:46px;object-fit:contain}
.bb-menu-lbl{font-family:'Arial Narrow',Arial,sans-serif;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;color:#191923}

/* === MOBILE MENU SHEET (bottom sheet overlay) === */
.mms-overlay{position:fixed;inset:0;background:rgba(25,25,35,0);pointer-events:none;z-index:60;transition:background .3s}
.mms-overlay.open{background:rgba(25,25,35,.55);pointer-events:auto}
.mms-sheet{position:fixed;left:0;right:0;bottom:0;z-index:61;background:var(--y);border-top:3px solid #191923;border-left:3px solid #191923;border-right:3px solid #191923;border-radius:24px 24px 0 0;padding:8px 18px 24px;max-height:88vh;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -8px 30px rgba(25,25,35,.25);display:none}
.mms-sheet.open{transform:translateY(0);display:block}
.mms-handle{width:44px;height:5px;background:#191923;border-radius:3px;margin:4px auto 10px;opacity:.35;cursor:pointer}
.mms-header{text-align:center;margin-bottom:14px;padding:0 4px}
.mms-title{font-family:'Yellowtail',cursive;font-size:32px;color:#191923;line-height:1}
.mms-subtitle{font-family:'Yellowtail',cursive;font-size:14px;color:var(--p);margin-top:2px}
.mms-sec{font-family:'Yellowtail',cursive;font-size:18px;color:var(--p);margin:16px 2px 8px;padding-left:2px}
.mms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.mms-tile{background:#FFFFFF;border:2px solid #191923;border-radius:11px;padding:14px 6px;text-align:center;cursor:pointer;box-shadow:2px 2px 0 #191923;transition:all .12s;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:76px}
.mms-tile:active{transform:translate(2px,2px);box-shadow:0 0 0 #191923}
.mms-tile.active{background:var(--p);border-color:#191923}
.mms-tile.active .mms-tile-lbl{color:#FFFFFF}
.mms-tile-ico{font-size:25px;line-height:1;margin-bottom:7px}
.mms-tile-lbl{font-family:'Arial Narrow',Arial,sans-serif;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;color:#191923;line-height:1.1}


@media(max-width:768px){
  .topbar{display:flex}
  .sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(-100%);width:250px;max-width:80vw}
  .sidebar.open{transform:translateX(0)}
  .sb-resizer{display:none}
  .sidebar-overlay.open{display:block}
  .bottom-bar{display:flex}
  .main{padding:10px 12px;padding-bottom:4px}
  .g2{grid-template-columns:1fr}
  .g3{grid-template-columns:1fr 1fr}
  .g4{grid-template-columns:1fr 1fr}
  .modal{max-width:100%;margin:0}
  .fg2{grid-template-columns:1fr}
  .ph{flex-direction:column;gap:8px}
  .kpi-bar{gap:5px}
  .toast{bottom:160px;right:12px;left:12px;max-width:none;text-align:center}
  /* Chat flottant remonté au-dessus de la bottom-bar (sinon chevauche Recettes) */
  .floating-chat-btn{bottom:94px !important;right:14px !important;width:52px !important;height:52px !important}
  .floating-chat-panel{bottom:94px !important;right:10px !important;left:10px !important;width:auto !important;max-width:none !important;height:70vh !important}
}
@media(max-width:480px){
  .g3,.g4{grid-template-columns:1fr 1fr}
}
`
