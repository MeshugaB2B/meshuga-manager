// Meshuga B2B Manager — Dashboard CSS
// Extrait de DashboardContent.tsx pour alléger le fichier principal

export const G = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Arial Narrow',Arial,sans-serif;background:#FFEB5A;color:#191923;height:100vh;overflow:hidden}
.yt{font-family:'Yellowtail',cursive}
.shell{display:flex;height:100vh;overflow:hidden}
.topbar{display:none;background:#191923;padding:10px 16px;align-items:center;justify-content:space-between;border-bottom:3px solid #FFEB5A;flex-shrink:0}
.hamburger{background:none;border:2px solid rgba(255,255,255,.3);border-radius:4px;padding:4px 8px;cursor:pointer;color:#FFEB5A;font-size:16px}
.sidebar{width:210px;background:#FFFFFF;border-right:4px solid #191923;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.sb-logo{padding:14px;border-bottom:3px solid #191923;display:flex;align-items:center;gap:10px}
.sb-stamp{width:42px;height:42px;border-radius:50%;border:2px solid #191923;background:#FFEB5A;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.sb-nav{padding:8px;flex:1}
.ni{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:5px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:rgba(25,25,35,.7);border:2px solid transparent;transition:all .1s;margin-bottom:1px}
.ni:hover{background:#FFEB5A;color:#191923;border-color:#191923}
.ni.active{background:#FF82D7;color:#191923;border-color:#191923}
.nb{background:#191923;color:#FFEB5A;font-size:9px;padding:1px 5px;border-radius:2px;margin-left:auto}
.main{flex:1;overflow-y:auto;padding:16px 20px;background:#FFEB5A}
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
.sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:49}
.chasse-card{background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:12px;box-shadow:3px 3px 0 #191923;margin-bottom:10px}
@media(max-width:768px){.shell{flex-direction:column}.topbar{display:flex}.sidebar{position:fixed;left:0;top:0;bottom:0;z-index:50;transform:translateX(-100%);width:240px}.sidebar.open{transform:translateX(0)}.sidebar-overlay.open{display:block}.main{padding:12px 14px}.g2,.g4{grid-template-columns:1fr 1fr}.fg2{grid-template-columns:1fr}}
`
