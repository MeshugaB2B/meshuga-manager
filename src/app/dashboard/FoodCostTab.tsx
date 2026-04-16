'use client'
import { useState } from 'react'
import { FC_CATALOG } from './data'

export default function FoodCostTab(props) {
  var fcRecipes = props.fcRecipes
  var setFcRecipes = props.setFcRecipes
  var fcSeuil = props.fcSeuil
  var setFcSeuil = props.setFcSeuil
  var fcAlertCat = props.fcAlertCat
  var setFcAlertCat = props.setFcAlertCat
  var fcPriceAnalysis = props.fcPriceAnalysis
  var setFcPriceAnalysis = props.setFcPriceAnalysis
  var fcPriceLoading = props.fcPriceLoading
  var setFcPriceLoading = props.setFcPriceLoading
  var toast = props.toast

  var [fcView, setFcView] = useState('recettes')
  var [fcSelected, setFcSelected] = useState(null)
  var [fcPrices, setFcPrices] = useState({})
  var [fcPrixTTC, setFcPrixTTC] = useState(function(){
    try {
      var saved = localStorage.getItem('meshuga_fc_prix_ttc')
      if (saved) return JSON.parse(saved)
    } catch(e) {}
    return {}
  })
  var [fcCatFilter, setFcCatFilter] = useState('tous')
  var [fcInvoiceModal, setFcInvoiceModal] = useState(false)
  var [fcInvoiceLoading, setFcInvoiceLoading] = useState(false)
  var [fcInvoiceResult, setFcInvoiceResult] = useState(null)
  var [fcInvoiceMatches, setFcInvoiceMatches] = useState([])
  var [fcEditForm, setFcEditForm] = useState(null)

  return (
    <div>
      <div className="ph">
        <div><div className="pt">Food Cost 🥩</div><div className="ps">{fcRecipes.length} recettes · Seuil alerte : {fcSeuil}%</div></div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          <button className="btn btn-y btn-sm" style={{background:fcView==='recettes'?'#191923':'transparent',color:fcView==='recettes'?'#FFEB5A':'#191923'}} onClick={function(){setFcView('recettes');setFcSelected(null)}}>Recettes</button>
          <button className="btn btn-y btn-sm" style={{background:fcView==='fournisseurs'?'#191923':'transparent',color:fcView==='fournisseurs'?'#FFEB5A':'#191923'}} onClick={function(){setFcView('fournisseurs');setFcSelected(null)}}>Fournisseurs</button>
          <button className="btn btn-sm" style={{background:'#009D3A',color:'#fff'}} onClick={function(){setFcInvoiceModal(true)}}>📄 Facture</button>
          <button className="btn btn-y btn-sm" onClick={function(){
            setFcEditForm({id:'new_'+Date.now(),name:'',categorie:'classique',prixTTC:0,prixHT:0,foodCost:0,marge:0,foodCostPct:0,ingredients:[]})
            setFcSelected(null)
            setFcView('edit')
          }}>+ Nouveau</button>
        </div>
      </div>

      {/* SEUIL CONFIG */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 0 12px',flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,opacity:.5}}>Seuil alerte food cost :</span>
        {[20,25,30,35].map(function(s){return(
          <button key={s} className="btn btn-sm" style={{fontSize:10,background:fcSeuil===s?'#CC0066':'#F5F5F5',color:fcSeuil===s?'#fff':'#555',border:'1.5px solid '+(fcSeuil===s?'#CC0066':'#DDD')}} onClick={function(){setFcSeuil(s)}}>{s}%</button>
        )})}
      </div>
      {fcView === 'recettes' && (
        <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>
          {[{id:'tous',label:'Tous'},{id:'classique',label:'🥪 Classiques'},{id:'mini',label:'🥨 Mini'},{id:'salade',label:'🥗 Salades'},{id:'accompagnement',label:'🍟 Accompagnements'},{id:'boisson',label:'🥤 Boissons'}].map(function(cat){
            var count = cat.id==='tous' ? fcRecipes.length : fcRecipes.filter(function(r){return (r.categorie||'classique')===cat.id}).length
            return <button key={cat.id} className="btn btn-sm" style={{fontSize:10,background:fcCatFilter===cat.id?'#191923':'#F5F5F5',color:fcCatFilter===cat.id?'#FFEB5A':'#555',border:'1.5px solid '+(fcCatFilter===cat.id?'#191923':'#DDD')}} onClick={function(){setFcCatFilter(cat.id);setFcSelected(null)}}>{cat.label} <span style={{opacity:.5}}>({count})</span></button>
          })}
        </div>
      )}

      {/* VUE RECETTES */}
      {fcView === 'recettes' && !fcSelected && (
        <div>
          {(function(){
            var avg = fcRecipes.reduce(function(s,r){return s+r.foodCostPct},0)/fcRecipes.length
            var alerts = fcRecipes.filter(function(r){return r.foodCostPct > fcSeuil})
            var best = fcRecipes.slice().sort(function(a,b){return a.foodCostPct-b.foodCostPct})[0]
            var worst = fcRecipes.slice().sort(function(a,b){return b.foodCostPct-a.foodCostPct})[0]
            return (
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:12}}>
                <div style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1.5px solid #EBEBEB'}}>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:4}}>Food cost moyen</div>
                  <div style={{fontSize:24,fontWeight:900,color:avg>fcSeuil?'#CC0066':'#009D3A'}}>{avg.toFixed(1)}%</div>
                </div>
                <div style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1.5px solid '+(alerts.length>0?'#CC0066':'#EBEBEB')}}>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:4}}>⚠️ Au-dessus du seuil</div>
                  <div style={{fontSize:24,fontWeight:900,color:alerts.length>0?'#CC0066':'#009D3A'}}>{alerts.length}</div>
                  <div style={{fontSize:10,opacity:.5}}>{alerts.length>0?alerts.map(function(r){return r.name}).join(', '):'Tout est OK ✅'}</div>
                </div>
                <div style={{background:'#FFEB5A',borderRadius:10,padding:'12px 14px',border:'1.5px solid rgba(0,0,0,.1)'}}>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.7,marginBottom:4}}>🏆 Meilleure marge</div>
                  <div style={{fontSize:14,fontWeight:900}}>{best.name}</div>
                  <div style={{fontSize:12,opacity:.7}}>{best.foodCostPct}% food cost</div>
                </div>
                <div style={{background:'#fff',borderRadius:10,padding:'12px 14px',border:'1.5px solid #EBEBEB'}}>
                  <div style={{fontSize:10,fontWeight:900,textTransform:'uppercase',opacity:.5,marginBottom:4}}>📊 Plus chargé</div>
                  <div style={{fontSize:14,fontWeight:900}}>{worst.name}</div>
                  <div style={{fontSize:12,color:worst.foodCostPct>fcSeuil?'#CC0066':'#555'}}>{worst.foodCostPct}% food cost</div>
                </div>
              </div>
            )
          })()}

          {/* LISTE RECETTES */}
          {fcRecipes.filter(function(r){
            return fcCatFilter==='tous' || (r.categorie||'classique')===fcCatFilter
          }).sort(function(a,b){return b.foodCostPct-a.foodCostPct}).map(function(r){
            var alert = r.foodCostPct > fcSeuil
            var barColor = r.foodCostPct > fcSeuil ? '#CC0066' : '#009D3A'
            return (
              <div key={r.id} className="card" style={{marginBottom:8,borderLeft:'4px solid '+(alert?'#CC0066':'#009D3A')}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <div style={{flex:1,cursor:'pointer',minHeight:44,display:'flex',flexDirection:'column',justifyContent:'center'}} onClick={function(){setFcSelected(r)}}>
                    <div style={{fontWeight:900,fontSize:14}}>{r.name}</div>
                    <div style={{fontSize:11,opacity:.6}}>{r.ingredients.reduce(function(acc,i){ return acc.includes(i.fournisseur)?acc:acc.concat([i.fournisseur]) },[]).slice(0,2).join(', ')} · PV HT : {(r.prixHT||0).toFixed(2)}€ · Marge HT : {(r.marge||0).toFixed(2)}€</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0,marginLeft:8}}>
                    <div style={{textAlign:'right',cursor:'pointer',padding:'4px 8px'}} onClick={function(){setFcSelected(r)}}>
                      <div style={{fontSize:20,fontWeight:900,color:barColor}}>{r.foodCostPct}%</div>
                      <div style={{fontSize:10,opacity:.5}}>food cost</div>
                    </div>
                    <button style={{background:'#FFEB5A',border:'2px solid #191923',borderRadius:8,fontSize:16,cursor:'pointer',padding:'8px 12px',minWidth:44,minHeight:44,fontWeight:900,flexShrink:0,WebkitTapHighlightColor:'transparent'}} onClick={function(){
                      try {
                        var copy2=JSON.parse(JSON.stringify(r));
                        setFcEditForm(copy2);
                        setFcSelected(r);
                        setFcView('edit');
                      } catch(err2) {
                        toast('ERR crayon: '+String(err2).substring(0,80));
                      }
                    }}>✏️</button>
                  </div>
                </div>
                <div style={{background:'#F0F0F0',borderRadius:20,height:6,overflow:'hidden'}}>
                  <div style={{width:Math.min(r.foodCostPct,60)/60*100+'%',background:barColor,height:'100%',borderRadius:20}} />
                </div>
                {alert && <div style={{fontSize:10,color:'#CC0066',fontWeight:900,marginTop:4}}>⚠️ Au-dessus du seuil de {fcSeuil}%</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* DETAIL RECETTE */}
      {fcView === 'recettes' && fcSelected && (function(){
        var TVA = 0.055
        var prixTTCEdite = fcPrixTTC[fcSelected.id] || fcSelected.prixTTC
        var prixHTEdite = prixTTCEdite / (1 + TVA)
        var foodCostEdite = Math.round((fcSelected.foodCost / prixHTEdite * 100) * 100) / 100
        var margeEditee = prixHTEdite - fcSelected.foodCost
        var conseilX4TTC = Math.round((fcSelected.foodCost * 4 * (1 + TVA) * 100) / 100)
        var conseilX5TTC = Math.round((fcSelected.foodCost * 5 * (1 + TVA) * 100) / 100)
        var conseilHTx4 = Math.round((fcSelected.foodCost * 4) * 100) / 100
        var conseilFCPct = Math.round((fcSelected.foodCost / (conseilX4TTC / (1+TVA) * 100) / 100) * 100)
        return (
        <div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <button className="btn btn-sm" onClick={function(){setFcSelected(null)}}>← Retour</button>
            <button className="btn btn-y btn-sm" style={{fontWeight:900}} onClick={function(){
              try {
                var copy=JSON.parse(JSON.stringify(fcSelected));
                setFcEditForm(copy);
                setFcSelected(null);
                setFcView('edit');
              } catch(err) {
                toast('ERREUR: '+String(err).substring(0,100));
                console.error('Modifier error:', err);
              }
            }}>✏️ Modifier cette recette</button>
          </div>

          {/* CONSEIL PRIX */}
          <div style={{background:'#FF82D7',borderRadius:12,padding:16,marginBottom:12,border:'2px solid #fff'}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:18,color:'#191923',marginBottom:8}}>💡 Prix conseillé</div>
            <div style={{fontSize:12,color:'#191923',opacity:.7,marginBottom:12}}>Pour respecter le ratio x4 minimum (25% food cost) en restauration :</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
              <div style={{background:'#FFEB5A',borderRadius:8,padding:'10px 12px',border:'none'}}>
                <div style={{fontSize:10,color:'#191923',fontWeight:900,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>x4 — minimum</div>
                <div style={{fontSize:22,fontWeight:900,color:'#191923'}}>{conseilX4TTC}€ TTC</div>
                <div style={{fontSize:11,color:'#191923',opacity:.6,marginTop:2}}>{conseilHTx4.toFixed(2)}€ HT · FC {conseilFCPct}%</div>
              </div>
              <div style={{background:'#fff',borderRadius:8,padding:'10px 12px',border:'2px solid #fff'}}>
                <div style={{fontSize:10,color:'#CC0066',fontWeight:900,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>x5 — confortable</div>
                <div style={{fontSize:22,fontWeight:900,color:'#CC0066'}}>{conseilX5TTC}€ TTC</div>
                <div style={{fontSize:11,color:'#191923',opacity:.6,marginTop:2}}>{Math.round(fcSelected.foodCost * 5 * 100) / 100}€ HT · FC {Math.round(fcSelected.foodCost/(fcSelected.foodCost*5)*1000)/10}%</div>
              </div>
            </div>
            <div style={{fontSize:11,color:'#191923',opacity:.5}}>Food cost actuel : {fcSelected.foodCost.toFixed(3)}€ · TVA 5,5%</div>
          </div>

          {/* MODIFIER PRIX DE VENTE */}
          <div style={{background:'#fff',borderRadius:12,padding:16,border:'1.5px solid #EBEBEB',marginBottom:12}}>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:20,marginBottom:12}}>{fcSelected.name}</div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
              <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 12px',border:'1.5px solid #DDEEFF'}}>
                <div style={{fontSize:10,opacity:.5,textTransform:'uppercase',marginBottom:3}}>Prix de vente TTC actuel</div>
                <div style={{fontWeight:900,fontSize:20}}>{(fcPrixTTC[fcSelected.id]||fcSelected.prixTTC).toFixed(2)}€</div>
                <div style={{fontSize:10,opacity:.4,marginTop:2}}>HT : {((fcPrixTTC[fcSelected.id]||fcSelected.prixTTC)/(1+TVA)).toFixed(2)}€</div>
              </div>
              <div style={{background:'#FFEB5A',borderRadius:8,padding:'10px 12px'}}>
                <div style={{fontSize:10,opacity:.6,textTransform:'uppercase',marginBottom:3}}>Coeff actuel</div>
                <div style={{fontWeight:900,fontSize:20}}>x{fcSelected.foodCost>0?Math.round((fcPrixTTC[fcSelected.id]||fcSelected.prixTTC)/(1+TVA)/fcSelected.foodCost*100)/100:0}</div>
                <div style={{fontSize:10,opacity:.6,marginTop:2}}>{fcSelected.foodCost>0?Math.round(fcSelected.foodCost/((fcPrixTTC[fcSelected.id]||fcSelected.prixTTC)/(1+TVA))*1000)/10:0}% food cost</div>
              </div>
            </div>

            <div style={{background:'#F8F9FF',borderRadius:8,padding:12,marginBottom:12,border:'1.5px solid #DDEEFF'}}>
              <div style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,color:'#005FFF',marginBottom:8}}>Modifier le prix de vente</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Prix TTC (modifiable)</div>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <input
                      type="number"
                      step="0.5"
                      style={{width:'100%',fontSize:20,fontWeight:900,padding:'6px 10px',border:'2px solid #005FFF',borderRadius:6,color:'#191923'}}
                      value={prixTTCEdite}
                      onChange={function(e){
                        var v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) {
                          setFcPrixTTC(function(prev){ return Object.assign({},prev,{[fcSelected.id]:v}) })
                        }
                      }}
                    />
                    <span style={{fontSize:18,fontWeight:900,color:'#005FFF'}}>€</span>
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                <div style={{textAlign:'center',padding:'8px',background:'#fff',borderRadius:6,border:'1px solid #EEE'}}>
                  <div style={{fontSize:9,opacity:.5,textTransform:'uppercase',marginBottom:2}}>HT calculé</div>
                  <div style={{fontWeight:900,fontSize:15}}>{prixHTEdite.toFixed(2)}€</div>
                </div>
                <div style={{textAlign:'center',padding:'8px',background:foodCostEdite>fcSeuil?'#FFE5E5':'#F0FFF4',borderRadius:6,border:'1px solid #EEE'}}>
                  <div style={{fontSize:9,opacity:.6,textTransform:'uppercase',marginBottom:2}}>Food cost</div>
                  <div style={{fontWeight:900,fontSize:15,color:foodCostEdite>fcSeuil?'#CC0066':'#009D3A'}}>{foodCostEdite}%</div>
                </div>
                <div style={{textAlign:'center',padding:'8px',background:'#F0FFF4',borderRadius:6,border:'1px solid #EEE'}}>
                  <div style={{fontSize:9,opacity:.5,textTransform:'uppercase',marginBottom:2}}>Marge HT</div>
                  <div style={{fontWeight:900,fontSize:15,color:'#009D3A'}}>{margeEditee.toFixed(2)}€</div>
                </div>
              </div>
              <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                <button className="btn btn-y btn-sm" style={{flex:1,fontWeight:900}} onClick={function(){
                  var TVA2 = 0.055
                  var newPrixTTC = fcPrixTTC[fcSelected.id] || fcSelected.prixTTC
                  var newPrixHT = Math.round(newPrixTTC / (1+TVA2) * 100) / 100
                  var newFC = fcSelected.foodCost > 0 ? Math.round(fcSelected.foodCost / newPrixHT * 1000) / 10 : 0
                  var newMarge = Math.round((newPrixHT - fcSelected.foodCost) * 100) / 100
                  var updated = fcRecipes.map(function(r){
                    return r.id === fcSelected.id ? Object.assign({},r,{prixTTC:newPrixTTC,prixHT:newPrixHT,foodCostPct:newFC,marge:newMarge}) : r
                  })
                  setFcRecipes(updated)
                  try { localStorage.setItem('meshuga_fc_recipes', JSON.stringify(updated)) } catch(e) {}
                  setFcSelected(Object.assign({},fcSelected,{prixTTC:newPrixTTC,prixHT:newPrixHT,foodCostPct:newFC,marge:newMarge}))
                  setFcPrixTTC(function(prev){ var n=Object.assign({},prev); delete n[fcSelected.id]; return n })
                  toast('💾 Prix enregistré !')
                }}>💾 Enregistrer ce prix</button>
                {fcPrixTTC[fcSelected.id] && fcPrixTTC[fcSelected.id] !== fcSelected.prixTTC && (
                  <button className="btn btn-sm" style={{fontSize:10,opacity:.6}} onClick={function(){
                    setFcPrixTTC(function(prev){ var n=Object.assign({},prev); delete n[fcSelected.id]; return n })
                  }}>↩ Original ({fcSelected.prixTTC}€)</button>
                )}
              </div>
            </div>

            {/* INGREDIENTS */}
            <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,opacity:.5}}>Détail des ingrédients</div>
            {(fcSelected.ingredients||[]).map(function(ing,idx){
              var realPrice = (fcPrices[fcSelected.id+'_'+(ing.article||'')] || ing.prix_achat) || 0
              var realCout = realPrice * ing.qte
              var diff = realCout - ing.cout
              return (
                <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid #F0F0F0'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700}}>{ing.article}</div>
                    <div style={{fontSize:10,opacity:.5}}>{ing.fournisseur} · {ing.qte} {ing.unite}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <input type="number" step="0.01" style={{width:65,fontSize:11,padding:'2px 5px',border:'1px solid #DDD',borderRadius:4,textAlign:'right'}}
                        defaultValue={realPrice}
                        onBlur={function(e){
                          var v = parseFloat(e.target.value)
                          if (!isNaN(v) && v > 0) {
                            setFcPrices(function(prev){ return Object.assign({},prev,{[fcSelected.id+'_'+(ing.article||'')]:v}) })
                          }
                        }}
                      />
                      <span style={{fontSize:10,opacity:.4}}>€/{ing.unite}</span>
                    </div>
                    <div style={{fontSize:12,fontWeight:900,color:diff>0.01?'#CC0066':diff<-0.01?'#009D3A':'#191923',marginTop:2}}>{realCout.toFixed(3)}€</div>
                    {diff > 0.01 && <div style={{fontSize:9,color:'#CC0066'}}>+{diff.toFixed(3)}€ vs théo.</div>}
                    {diff < -0.01 && <div style={{fontSize:9,color:'#009D3A'}}>{diff.toFixed(3)}€ vs théo.</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        )
      })()}

      {/* VUE FOURNISSEURS */}
      {fcView === 'fournisseurs' && (function(){
        var fourn = {}
        fcRecipes.forEach(function(r){
          r.ingredients.forEach(function(ing){
            var f = ing.fournisseur
            if (!fourn[f]) fourn[f] = {name:f, articles:[], totalCout:0, recettes:[]}
            if (!fourn[f].articles.find(function(a){return a.article===ing.article})) {
              fourn[f].articles.push({article:ing.article, prix:ing.prix_achat, unite:ing.unite})
            }
            fourn[f].totalCout += ing.cout
            if (!fourn[f].recettes.includes(r.name)) fourn[f].recettes.push(r.name)
          })
        })
        return (
          <div>
            {Object.values(fourn).sort(function(a,b){return b.totalCout-a.totalCout}).map(function(f){
              return (
                <div key={f.name} className="card" style={{marginBottom:8}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:15}}>{f.name}</div>
                      <div style={{fontSize:11,opacity:.5}}>{f.articles.length} articles · {f.recettes.length} recettes</div>
                    </div>
                    <div style={{fontWeight:900,fontSize:16,color:'#005FFF'}}>{f.totalCout.toFixed(2)}€</div>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                    {f.articles.map(function(a,idx){return(
                      <span key={idx} style={{fontSize:10,background:'#F5F5F5',border:'1px solid #EEE',borderRadius:4,padding:'2px 6px'}}>{a.article} · {a.prix}€/{a.unite}</span>
                    )})}
                  </div>
                  <div style={{fontSize:10,opacity:.4,marginTop:6}}>Utilisé dans : {f.recettes.join(', ')}</div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* VUE EDITION RECETTE */}
      {fcView === 'edit' && fcEditForm && (
        <div style={{paddingBottom:40}}>
          <div style={{display:'flex',gap:8,marginBottom:16,alignItems:'center'}}>
            <button className="btn btn-sm" onClick={function(){setFcView('recettes');setFcEditForm(null)}}>← Annuler</button>
            <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923',flex:1}}>{fcEditForm && (String(fcEditForm.id||'').indexOf('new_')===0) ? 'Nouvelle recette' : 'Modifier ' + (fcEditForm?fcEditForm.name:'')}</div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
            <div>
              <label className="lbl">Nom *</label>
              <input className="inp" value={fcEditForm.name||''} onChange={function(e){setFcEditForm(function(prev){return Object.assign({},prev,{name:e.target.value})})}} placeholder="Ex: Pastrami Deluxe" />
            </div>
            <div>
              <label className="lbl">Catégorie</label>
              <select className="inp" value={fcEditForm.categorie||'classique'} onChange={function(e){setFcEditForm(function(prev){return Object.assign({},prev,{categorie:e.target.value})})}}>
                <option value="classique">Classique</option>
                <option value="mini">Mini</option>
                <option value="salade">Salade</option>
                <option value="accompagnement">Accompagnement</option>
                <option value="boisson">Boisson</option>
              </select>
            </div>
          </div>

          <div style={{marginBottom:12}}>
            <label className="lbl">Prix de vente TTC (€) *</label>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input type="number" step="0.5" className="inp" style={{fontSize:20,fontWeight:900,flex:1}} value={fcEditForm.prixTTC||''} onChange={function(e){
                var ttc = parseFloat(e.target.value)||0
                var ht = Math.round(ttc/1.055*100)/100
                var total = (fcEditForm.ingredients||[]).reduce(function(s,i){return s+(i.prix_achat||0)*(i.qte||0)},0)
                var fc = ht>0?Math.round(total/ht*1000)/10:0
                var marge2 = Math.round((ht-total)*100)/100
                setFcEditForm(function(prev){return Object.assign({},prev,{prixTTC:ttc,prixHT:ht,foodCost:Math.round(total*1000)/1000,foodCostPct:fc,marge:marge2})})
              }} placeholder="0.00" />
              {(fcEditForm.prixTTC||0) > 0 && (
                <div style={{fontSize:12,color:'#888',flexShrink:0}}>
                  <div>HT : <strong>{Math.round(fcEditForm.prixTTC/1.055*100)/100}€</strong></div>
                  <div style={{color:fcEditForm.foodCostPct>fcSeuil?'#CC0066':'#009D3A',fontWeight:900}}>FC : {fcEditForm.foodCostPct||0}%</div>
                </div>
              )}
            </div>
          </div>

          <div style={{background:'#F8F9FF',borderRadius:8,padding:'10px 14px',marginBottom:16,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase'}}>Food Cost</div>
              <div style={{fontWeight:900,fontSize:16,color:fcEditForm.foodCostPct>fcSeuil?'#CC0066':'#009D3A'}}>{fcEditForm.foodCostPct||0}%</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase'}}>Marge HT</div>
              <div style={{fontWeight:900,fontSize:16}}>{fcEditForm.marge||0}€</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:10,opacity:.5,textTransform:'uppercase'}}>Coût mat.</div>
              <div style={{fontWeight:900,fontSize:16}}>{fcEditForm.foodCost||0}€</div>
            </div>
          </div>

          {/* INGREDIENTS */}
          <div style={{marginBottom:12}}>
            <div style={{fontWeight:900,fontSize:12,textTransform:'uppercase',letterSpacing:.5,marginBottom:8,opacity:.5}}>Ingrédients ({(fcEditForm.ingredients||[]).length})</div>
            {(fcEditForm&&fcEditForm.ingredients||[]).map(function(ing,idx){
              var isKg = ing.unite === 'kg' || ing.unite === 'l'
              var displayQte = isKg ? Math.round((ing.qte||0)*1000) : (ing.qte||0)
              var displayUnit = isKg ? 'g' : (ing.unite||'U')
              var prixRevient = Math.round((ing.prix_achat||0)*(ing.qte||0)*100)/100
              return (
                <div key={idx} style={{marginBottom:8,background:'#FAFAFA',borderRadius:8,padding:'10px 12px',border:'1px solid #EBEBEB'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:900}}>{ing.article}</div>
                      <div style={{fontSize:10,opacity:.5}}>{ing.fournisseur} · {ing.prix_achat}€/{ing.unite}</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:15,fontWeight:900,color:'#005FFF'}}>{prixRevient}€</div>
                        <div style={{fontSize:9,opacity:.5}}>coût</div>
                      </div>
                      <button style={{background:'#FFE5E5',border:'none',color:'#CC0066',fontSize:14,cursor:'pointer',borderRadius:6,padding:'6px 10px',minWidth:36,minHeight:36}} onClick={function(){
                        setFcEditForm(function(prev){
                          var ings = prev.ingredients.filter(function(_,i){return i!==idx})
                          var total2 = ings.reduce(function(s,x){return s+(x.prix_achat||0)*(x.qte||0)},0)
                          var ht2 = (prev.prixTTC||0)/1.055
                          return Object.assign({},prev,{ingredients:ings,foodCost:Math.round(total2*1000)/1000,foodCostPct:ht2>0?Math.round(total2/ht2*1000)/10:0,marge:Math.round((ht2-total2)*100)/100})
                        })
                      }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div>
                      <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Prix (€/{ing.unite||'kg'})</div>
                      <input type="number" step="0.01" className="inp" style={{padding:'6px 8px',fontSize:14,fontWeight:700}} value={ing.prix_achat||''} onChange={function(e){
                        var v = parseFloat(e.target.value)||0
                        setFcEditForm(function(prev){
                          var ings = prev.ingredients.map(function(x,i){return i===idx?Object.assign({},x,{prix_achat:v,cout:v*(x.qte||0)}):x})
                          var total2 = ings.reduce(function(s,x){return s+(x.prix_achat||0)*(x.qte||0)},0)
                          var ht2 = (prev.prixTTC||0)/1.055
                          return Object.assign({},prev,{ingredients:ings,foodCost:Math.round(total2*1000)/1000,foodCostPct:ht2>0?Math.round(total2/ht2*1000)/10:0,marge:Math.round((ht2-total2)*100)/100})
                        })
                      }} placeholder="0.00" />
                    </div>
                    <div>
                      <div style={{fontSize:10,opacity:.5,marginBottom:3}}>Quantité ({displayUnit})</div>
                      <input type="number" step={isKg?'1':'0.1'} className="inp" style={{padding:'6px 8px',fontSize:14,fontWeight:700}} value={displayQte||''} onChange={function(e){
                        var raw = parseFloat(e.target.value)||0
                        var v = isKg ? raw/1000 : raw
                        setFcEditForm(function(prev){
                          var ings = prev.ingredients.map(function(x,i){return i===idx?Object.assign({},x,{qte:v,cout:(x.prix_achat||0)*v}):x})
                          var total2 = ings.reduce(function(s,x){return s+(x.prix_achat||0)*(x.qte||0)},0)
                          var ht2 = (prev.prixTTC||0)/1.055
                          return Object.assign({},prev,{ingredients:ings,foodCost:Math.round(total2*1000)/1000,foodCostPct:ht2>0?Math.round(total2/ht2*1000)/10:0,marge:Math.round((ht2-total2)*100)/100})
                        })
                      }} placeholder={isKg?'0 g':'0'} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* AJOUTER INGREDIENT */}
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:900,fontSize:11,textTransform:'uppercase',opacity:.5,marginBottom:8}}>+ Ajouter un ingrédient</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {FC_CATALOG.filter(function(ing){
                return !(fcEditForm.ingredients||[]).find(function(x){return (x.article||'').toLowerCase()===(ing.article||'').toLowerCase()})
              }).slice(0,15).map(function(ing){
                return (
                  <button key={ing.article} className="btn btn-sm" style={{fontSize:10,padding:'4px 10px',background:'#F5F5F5'}} onClick={function(){
                    setFcEditForm(function(prev){
                      var newIng = {article:ing.article,fournisseur:ing.fournisseur,unite:ing.unite,prix_achat:ing.prix_achat,qte:0.1,cout:ing.prix_achat*0.1}
                      var ings = prev.ingredients.concat([newIng])
                      var total2 = ings.reduce(function(s,x){return s+(x.prix_achat||0)*(x.qte||0)},0)
                      var ht2 = (prev.prixTTC||0)/1.055
                      return Object.assign({},prev,{ingredients:ings,foodCost:Math.round(total2*1000)/1000,foodCostPct:ht2>0?Math.round(total2/ht2*1000)/10:0,marge:Math.round((ht2-total2)*100)/100})
                    })
                  }}>+ {ing.article}</button>
                )
              })}
            </div>
          </div>

          {/* BOUTONS ACTIONS */}
          <div style={{display:'flex',gap:8,paddingTop:16,borderTop:'1px solid #EBEBEB'}}>
            <button className="btn" style={{flex:1}} onClick={function(){setFcView('recettes');setFcEditForm(null)}}>Annuler</button>
            {fcSelected && fcEditForm && String(fcEditForm.id||'').indexOf('new_')!==0 && (
              <button className="btn btn-sm" style={{background:'#CC0066',color:'#fff'}} onClick={function(){
                setFcRecipes(function(prev){
                  var updated = prev.filter(function(r){return r.id!==fcEditForm.id})
                  try{localStorage.setItem('meshuga_fc_recipes',JSON.stringify(updated))}catch(e){}
                  return updated
                })
                setFcSelected(null)
                setFcView('recettes')
                setFcEditForm(null)
                toast('Recette supprimée')
              }}>Supprimer</button>
            )}
            <button className="btn btn-y" style={{flex:2,fontWeight:900,fontSize:16}} onClick={function(){
              if (!fcEditForm.name) { toast('Nom obligatoire'); return }
              if (!fcEditForm.prixTTC) { toast('Prix de vente obligatoire'); return }
              var ht3 = Math.round(fcEditForm.prixTTC/1.055*100)/100
              var saved3 = Object.assign({},fcEditForm,{prixHT:ht3})
              var isNew3 = String(fcEditForm&&fcEditForm.id||'').indexOf('new_')===0
              setFcRecipes(function(prev){
                var updated = isNew3 ? prev.concat([saved3]) : prev.map(function(r){return r.id===saved3.id?saved3:r})
                try{localStorage.setItem('meshuga_fc_recipes',JSON.stringify(updated))}catch(e){}
                return updated
              })
              setFcSelected(isNew3?null:saved3)
              setFcView('recettes')
              setFcEditForm(null)
              toast(isNew3?'Recette créée !':'Recette modifiée !')
            }}>💾 Enregistrer</button>
          </div>
        </div>
      )}

      {/* MODAL FACTURE */}
      {fcInvoiceModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center'}} onClick={function(){if(!fcInvoiceLoading){setFcInvoiceModal(false);setFcInvoiceResult(null);setFcInvoiceMatches([])}}}>
          <div style={{background:'#fff',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}} onClick={function(e){e.stopPropagation()}}>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontFamily:"'Yellowtail',cursive",fontSize:22,color:'#191923'}}>📄 Importer une facture</div>
              {!fcInvoiceLoading && <button style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}} onClick={function(){setFcInvoiceModal(false);setFcInvoiceResult(null);setFcInvoiceMatches([])}}>✕</button>}
            </div>

            {!fcInvoiceResult && !fcInvoiceLoading && (
              <div>
                <div style={{fontSize:13,color:'#555',marginBottom:16}}>Upload un PDF ou une photo de ta facture fournisseur — Claude extrait les prix automatiquement.</div>
                <label style={{display:'block',background:'#F8F9FF',border:'2px dashed #DDEEFF',borderRadius:10,padding:'30px 20px',textAlign:'center',cursor:'pointer'}}>
                  <div style={{fontSize:32,marginBottom:8}}>📂</div>
                  <div style={{fontWeight:900,fontSize:14,color:'#005FFF'}}>Choisir un PDF ou une photo</div>
                  <div style={{fontSize:11,color:'#888',marginTop:4}}>La Crémerie, HPS, Foodflow, Marina, Episaveurs...</div>
                  <input type="file" accept=".pdf,image/*" style={{display:'none'}} onChange={function(e){
                    var file = e.target && e.target.files && e.target.files[0]
                    if (!file) return
                    setFcInvoiceLoading(true)
                    var reader = new FileReader()
                    reader.onload = function(ev) {
                      var base64 = ev.target ? String(ev.target.result).split(',')[1] : ''
                      fetch('/api/import-invoice', {
                        method: 'POST',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({pdfBase64: base64, fileName: file.name, mediaType: file.type})
                      })
                      .then(function(r){return r.json()})
                      .then(function(data){
                        if (data.error) { toast('Erreur: '+data.error); setFcInvoiceLoading(false); return }
                        var matches = (data.lignes||[]).map(function(ligne) {
                          var articleLow = (ligne.article||'').toLowerCase()
                          var allIngrs = []
                          fcRecipes.forEach(function(r){
                            r.ingredients.forEach(function(ing){
                              var existing = allIngrs.find(function(x){return x.article.toLowerCase()===ing.article.toLowerCase()})
                              if (!existing) allIngrs.push({article:ing.article, prix_actuel:ing.prix_achat, unite:ing.unite, recettes:[]})
                              var found2 = allIngrs.find(function(x){return x.article.toLowerCase()===ing.article.toLowerCase()})
                              if (found2 && !found2.recettes.includes(r.name)) found2.recettes.push(r.name)
                            })
                          })
                          var matched = allIngrs.find(function(ing){
                            var ingLow = ing.article.toLowerCase()
                            return ingLow.includes(articleLow) || articleLow.includes(ingLow) ||
                              articleLow.split(' ').some(function(w){ return w.length > 3 && ingLow.includes(w) })
                          })
                          return {
                            ligne: ligne,
                            matched: matched || null,
                            selected: matched ? true : false,
                            articleMatch: matched ? matched.article : ''
                          }
                        })
                        setFcInvoiceResult(data)
                        setFcInvoiceMatches(matches)
                        setFcInvoiceLoading(false)
                      })
                      .catch(function(e){toast('Erreur: '+e.message);setFcInvoiceLoading(false)})
                    }
                    reader.readAsDataURL(file)
                  }} />
                </label>
              </div>
            )}

            {fcInvoiceLoading && (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:40,marginBottom:12}}>🧠</div>
                <div style={{fontWeight:900,fontSize:15,marginBottom:6}}>Claude lit la facture...</div>
                <div style={{fontSize:12,color:'#888'}}>Extraction des articles et prix en cours</div>
              </div>
            )}

            {fcInvoiceResult && !fcInvoiceLoading && (
              <div>
                <div style={{background:'#F0FFF4',borderRadius:8,padding:'10px 14px',marginBottom:14,border:'1.5px solid #009D3A'}}>
                  <div style={{fontWeight:900,fontSize:13,color:'#009D3A'}}>{fcInvoiceResult.fournisseur} · {fcInvoiceResult.date}</div>
                  <div style={{fontSize:11,color:'#555',marginTop:2}}>{(fcInvoiceResult.lignes||[]).length} articles · Total HT : {fcInvoiceResult.total_ht}€</div>
                </div>
                <div style={{fontSize:11,fontWeight:900,textTransform:'uppercase',letterSpacing:.5,opacity:.5,marginBottom:8}}>
                  Correspondances trouvées — sélectionne les prix à mettre à jour
                </div>
                {fcInvoiceMatches.map(function(m, idx){
                  var prixActuel = m.matched ? m.matched.prix_actuel : null
                  var diff = prixActuel ? Math.round((m.ligne.prix_unitaire_ht - prixActuel) * 100) / 100 : null
                  var hausse = diff !== null && diff > 0
                  var baisse = diff !== null && diff < 0
                  return (
                    <div key={idx} style={{background:m.selected?'#F0FFF4':'#FAFAFA',borderRadius:8,padding:'10px 12px',marginBottom:6,border:'1.5px solid '+(m.selected?'#009D3A':'#EEE')}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <input type="checkbox" checked={m.selected} onChange={function(){
                          setFcInvoiceMatches(function(prev){
                            return prev.map(function(x,i){return i===idx?Object.assign({},x,{selected:!x.selected}):x})
                          })
                        }} style={{width:16,height:16,flexShrink:0}} />
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:700}}>{m.ligne.article_original}</div>
                          <div style={{fontSize:10,color:'#888'}}>
                            {m.ligne.prix_unitaire_ht}€/{m.ligne.unite}
                            {m.ligne.conditionnement && <span style={{marginLeft:4,opacity:.5}}>({m.ligne.conditionnement})</span>}
                            {m.matched && <span style={{marginLeft:8,color:'#005FFF'}}>→ {m.matched.article}</span>}
                            {!m.matched && <span style={{marginLeft:8,color:'#CC0066'}}>⚠️ Pas de correspondance</span>}
                          </div>
                        </div>
                        {diff !== null && (
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontSize:12,fontWeight:900,color:hausse?'#CC0066':baisse?'#009D3A':'#555'}}>
                              {hausse?'+':''}{diff}€
                            </div>
                            <div style={{fontSize:9,opacity:.5}}>vs {prixActuel}€</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div style={{display:'flex',gap:8,marginTop:16}}>
                  <button className="btn" onClick={function(){setFcInvoiceResult(null);setFcInvoiceMatches([])}}>← Retour</button>
                  <button className="btn btn-y" style={{flex:1,fontWeight:900}} onClick={function(){
                    var updated = fcRecipes.map(function(recipe){
                      var newIngredients = recipe.ingredients.map(function(ing){
                        var match = fcInvoiceMatches.find(function(m){
                          return m.selected && m.matched && m.matched.article.toLowerCase()===ing.article.toLowerCase()
                        })
                        if (match) return Object.assign({},ing,{prix_achat:match.ligne.prix_unitaire_ht, cout:match.ligne.prix_unitaire_ht*ing.qte})
                        return ing
                      })
                      var newFoodCost = newIngredients.reduce(function(s,i){return s+(i.prix_achat*i.qte)},0)
                      var newFC = recipe.prixHT>0?Math.round(newFoodCost/recipe.prixHT*1000)/10:0
                      var newMarge = Math.round((recipe.prixHT-newFoodCost)*100)/100
                      return Object.assign({},recipe,{ingredients:newIngredients,foodCost:Math.round(newFoodCost*1000)/1000,foodCostPct:newFC,marge:newMarge})
                    })
                    setFcRecipes(updated)
                    try{localStorage.setItem('meshuga_fc_recipes',JSON.stringify(updated))}catch(e){}
                    var nb = fcInvoiceMatches.filter(function(m){return m.selected&&m.matched}).length
                    toast('✅ '+nb+' prix mis à jour !')
                    setFcInvoiceModal(false)
                    setFcInvoiceResult(null)
                    setFcInvoiceMatches([])
                  }}>
                    ✅ Mettre à jour {fcInvoiceMatches.filter(function(m){return m.selected&&m.matched}).length} prix
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
