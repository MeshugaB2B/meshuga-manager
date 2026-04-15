// Meshuga B2B Manager — Dashboard CSS
export const G = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Arial Narrow',Arial,sans-serif;background:#FFEB5A;color:#191923;height:100vh;overflow:hidden}
.yt{font-family:'Yellowtail',cursive}
.shell{display:flex;height:100vh;overflow:hidden}
.topbar{display:none}
.sidebar-overlay{display:none}

/* SIDEBAR — desktop, fond blanc */
.sidebar{width:230px;background:#FFFFFF;border-right:2px solid #EBEBEB;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;overflow-x:hidden}
.sb-logo{padding:16px 14px 12px;border-bottom:2px solid #EBEBEB;display:flex;align-items:center;gap:10px;flex-shrink:0}
.sb-logo-img{height:26px;object-fit:contain;object-position:left;mix-blend-mode:multiply;flex-shrink:0}
.sb-nav{padding:10px 8px;flex:1}
.sb-section{font-size:7.5px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:rgba(25,25,35,.3);padding:10px 10px 4px}
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;color:rgba(25,25,35,.65);border:1.5px solid transparent;transition:all .1s;margin-bottom:2px}
.ni:hover{background:#FFF3FB;color:#191923}
.ni.active{background:#FF82D7;color:#191923;font-weight:900}
.nb{background:#191923;color:#FFEB5A;font-size:8px;padding:1px 4px;border-radius:2px;margin-left:auto;font-weight:900}
.sb-footer{padding:8px;border-top:2px solid #EBEBEB;flex-shrink:0}
.sb-user{padding:6px 10px 8px}
.sb-user-name{font-weight:900;font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#191923;margin-bottom:2px}
.sb-user-role{font-family:'Yellowtail',cursive;font-size:12px;color:#FF82D7}

/* MAIN CONTENT */
.main{flex:1;overflow-y:auto;padding:16px 20px;background:#FFEB5A}

/* MOBILE LOGO BAR — caché sur desktop */
.mob-logo-bar{display:none;justify-content:space-between;align-items:center;padding:10px 14px 6px;flex-shrink:0}

/* BOTTOM NAV — mobile uniquement, fond transparent sur jaune */
.bottomnav{display:none;position:fixed;bottom:0;left:0;right:0;height:72px;background:transparent;z-index:50;align-items:flex-end;justify-content:space-around;padding:0 8px 10px}
.bn-item{display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;padding:4px 6px;border:none;background:none;min-width:46px}
.bn-item-ic{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;transition:all .12s}
.bn-item-lbl{font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;color:rgba(25,25,35,.4)}
.bn-item.active .bn-item-ic{background:rgba(25,25,35,.1)}
.bn-item.active .bn-item-lbl{color:#191923;font-weight:900}
.bn-center{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:0;border:none;background:none;position:relative;bottom:6px}
.bn-center-pill{width:50px;height:50px;border-radius:14px;background:#FF82D7;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(255,130,215,.4),0 2px 6px rgba(0,0,0,.08);transition:all .12s}
.bn-center-lbl{font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;color:rgba(25,25,35,.5)}
.bn-center.active .bn-center-pill{box-shadow:0 4px 20px rgba(255,130,215,.65)}

/* MOBILE MENU DRAWER */
.mobile-menu-ov{display:none;position:fixed;inset:0;background:rgba(25,25,35,.55);z-index:60}
.mobile-menu-ov.open{display:block}
.mobile-menu{position:fixed;bottom:0;left:0;right:0;background:#FFFFFF;border-top:2px solid #EBEBEB;z-index:70;transform:translateY(100%);transition:transform .22s ease;border-radius:14px 14px 0 0;max-height:72vh;overflow-y:auto;padding-bottom:80px}
.mobile-menu.open{transform:translateY(0)}
.mobile-menu-head{padding:14px 16px 10px;border-bottom:1.5px solid #EBEBEB;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#FFFFFF;z-index:1}
.mobile-menu-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 12px}
.mobile-menu-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:11px 6px;border-radius:10px;border:1.5px solid #EBEBEB;cursor:pointer;background:#FFFFFF;transition:all .12s}
.mobile-menu-item:hover,.mobile-menu-item.active{background:#FFEB5A;border-color:rgba(25,25,35,.12)}
.mobile-menu-item-ic{font-size:20px}
.mobile-menu-item-lbl{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;color:#191923}
.mobile-menu-close{width:28px;height:28px;border-radius:50%;background:#F0F0F0;border:none;cursor:pointer;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center}

/* UTILITY CLASSES (inchangés) */
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
.kl{font-family:'Yellowtail',cursive;font-size:18px}
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
.chasse-card{background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:12px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}

@media(max-width:768px){
  .shell{flex-direction:column}
  .sidebar{display:none}
  .mob-logo-bar{display:flex}
  .main{padding:8px 14px;padding-bottom:82px}
  .g2,.g4{grid-template-columns:1fr 1fr}
  .fg2{grid-template-columns:1fr}
  .bottomnav{display:flex}
  .toast{bottom:82px}
}
`
