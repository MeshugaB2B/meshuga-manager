'use client'
import { useState, useEffect } from 'react'

// =============================================================================
// AmendmentModal — Modal pour créer un avenant à un contrat existant
// 
// 2 étapes :
//   1) Sélection du type d'avenant (selon contract.type)
//   2) Formulaire dynamique adapté au type
// Puis : preview HTML dans iframe + bouton Valider
// =============================================================================

type Props = {
  contract: any  // Contrat sur lequel on fait l'avenant
  employee: any  // Salarié
  onClose: () => void
  onSaved: (msg: string) => void
}

// Liste des types d'avenant disponibles selon le type de contrat
function getAvailableTypes(contractType: string) {
  if (contractType === 'extra') {
    return [
      { key: 'prolongation_duree', label: 'Prolongation de la durée', icon: '📅', desc: 'Reporter la date de fin' },
      { key: 'modification_horaires', label: 'Modification des horaires', icon: '🕐', desc: 'Changer la durée hebdo / planning' },
      { key: 'autre', label: 'Autre modification', icon: '📝', desc: 'Texte libre' }
    ]
  }
  // CDI (tous types)
  return [
    { key: 'augmentation_salaire', label: 'Modification de la rémunération', icon: '💰', desc: 'Augmentation ou changement salaire / taux horaire' },
    { key: 'modification_horaires', label: 'Modification des horaires', icon: '🕐', desc: 'Hausse ou baisse de la durée du travail' },
    { key: 'changement_poste', label: 'Changement de poste', icon: '👔', desc: 'Nouvelle fonction, classification, missions' },
    { key: 'autre', label: 'Autre modification', icon: '📝', desc: 'Texte libre (changement adresse, prévoyance, etc.)' }
  ]
}

export default function AmendmentModal(props: Props) {
  var c = props.contract
  var emp = props.employee
  var [step, setStep] = useState<'type' | 'form' | 'preview'>('type')
  var [amendmentType, setAmendmentType] = useState<string>('')
  var [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10))
  var [motif, setMotif] = useState<string>('')
  var [submitting, setSubmitting] = useState(false)
  
  // Champs spécifiques selon le type
  var [newDateFin, setNewDateFin] = useState<string>(c.date_fin || '')
  var [newSalaireBrutMensuel, setNewSalaireBrutMensuel] = useState<string>(c.salaire_brut_mensuel ? String(c.salaire_brut_mensuel) : '')
  var [newTauxHoraire, setNewTauxHoraire] = useState<string>(c.taux_horaire_brut ? String(c.taux_horaire_brut) : '')
  var [newHeuresHebdo, setNewHeuresHebdo] = useState<string>(c.heures_hebdo ? String(c.heures_hebdo) : '')
  var [newHeuresMensuelles, setNewHeuresMensuelles] = useState<string>(c.heures_mensuelles ? String(c.heures_mensuelles) : '')
  var [newFonction, setNewFonction] = useState<string>(c.fonction || '')
  var [newClassification, setNewClassification] = useState<string>(c.classification || '')
  
  // Preview HTML
  var [previewHtml, setPreviewHtml] = useState<string>('')
  var [previewing, setPreviewing] = useState(false)
  
  // Fermeture avec Échap
  useEffect(function() {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return function() {
      window.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [])
  
  var types = getAvailableTypes(c.type || 'extra')
  var selectedTypeMeta = types.find(function(t) { return t.key === amendmentType })
  
  function buildPayload(includePreview: boolean) {
    var payload: any = {
      amendment_type: amendmentType,
      effective_date: effectiveDate,
      motif: motif
    }
    if (includePreview) payload.preview = true
    
    if (amendmentType === 'prolongation_duree') {
      payload.new_date_fin = newDateFin
    } else if (amendmentType === 'augmentation_salaire') {
      if (newSalaireBrutMensuel) payload.new_salaire_brut_mensuel = parseFloat(newSalaireBrutMensuel)
      if (newTauxHoraire) payload.new_taux_horaire_brut = parseFloat(newTauxHoraire)
    } else if (amendmentType === 'modification_horaires') {
      if (newHeuresHebdo) payload.new_heures_hebdo = parseFloat(newHeuresHebdo)
      if (newHeuresMensuelles) payload.new_heures_mensuelles = parseFloat(newHeuresMensuelles)
    } else if (amendmentType === 'changement_poste') {
      if (newFonction) payload.new_fonction = newFonction
      if (newClassification) payload.new_classification = newClassification
    }
    
    return payload
  }
  
  async function doPreview() {
    setPreviewing(true)
    try {
      var res = await fetch('/api/hr/contracts/' + c.id + '/amendment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(true))
      })
      if (!res.ok) {
        var errData = null
        try { errData = await res.json() } catch (e) {}
        throw new Error((errData && errData.error) || 'Erreur HTTP ' + res.status)
      }
      var html = await res.text()
      setPreviewHtml(html)
      setStep('preview')
    } catch (err: any) {
      alert('Erreur preview : ' + (err.message || err))
    } finally {
      setPreviewing(false)
    }
  }
  
  async function doSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      var res = await fetch('/api/hr/contracts/' + c.id + '/amendment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(false))
      })
      if (!res.ok) {
        var errData = null
        try { errData = await res.json() } catch (e) {}
        throw new Error((errData && errData.error) || 'Erreur HTTP ' + res.status)
      }
      var data = await res.json()
      // Ouvrir le PDF généré dans un nouvel onglet
      if (data.html) {
        var blob = new Blob([data.html], { type: 'text/html;charset=utf-8' })
        var url = URL.createObjectURL(blob)
        window.open(url, '_blank')
      }
      props.onSaved('Avenant n°' + (data.amendment && data.amendment.amendment_number) + ' créé ✓')
      props.onClose()
    } catch (err: any) {
      alert('Erreur création avenant : ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }
  
  // Validation des étapes
  var canGoToForm = !!amendmentType
  var canPreview = false
  if (amendmentType === 'prolongation_duree') canPreview = !!newDateFin && !!motif
  else if (amendmentType === 'augmentation_salaire') canPreview = (!!newSalaireBrutMensuel || !!newTauxHoraire) && !!motif
  else if (amendmentType === 'modification_horaires') canPreview = (!!newHeuresHebdo || !!newHeuresMensuelles) && !!motif
  else if (amendmentType === 'changement_poste') canPreview = (!!newFonction || !!newClassification) && !!motif
  else if (amendmentType === 'autre') canPreview = !!motif && motif.length > 10
  
  return (
    <div 
      onClick={function(e){ if(e.target === e.currentTarget) props.onClose() }}
      style={{
        position:'fixed',top:0,left:0,right:0,bottom:0,
        background:'rgba(0,0,0,0.7)',zIndex:9999,
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:20
      }}>
      <div style={{
        background:'#fff',borderRadius:12,maxWidth:900,width:'100%',
        maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',
        boxShadow:'0 10px 40px rgba(0,0,0,0.3)'
      }}>
        {/* HEADER */}
        <div style={{
          padding:'14px 20px',background:'#191923',color:'white',
          display:'flex',justifyContent:'space-between',alignItems:'center',
          borderBottom:'3px solid #FFEB5A'
        }}>
          <div>
            <div style={{fontFamily:'Yellowtail',fontSize:22,lineHeight:1}}>📝 Faire un avenant</div>
            <div style={{fontSize:11,opacity:0.7,marginTop:2}}>
              {emp.prenom} {emp.nom} · {c.type === 'extra' ? 'CDD Usage Extra' : (c.type || '').replace('cdi_', 'CDI ')}
              {c.date_debut && ' · du ' + new Date(c.date_debut).toLocaleDateString('fr-FR')}
              {c.date_fin && ' au ' + new Date(c.date_fin).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <button 
            onClick={props.onClose}
            title="Fermer (Échap)"
            style={{
              background:'#CC0066',color:'white',border:'none',
              width:40,height:40,borderRadius:8,fontSize:22,fontWeight:900,
              cursor:'pointer',lineHeight:1
            }}>✕</button>
        </div>
        
        {/* STEPPER */}
        <div style={{display:'flex',gap:8,padding:'10px 20px',background:'#FAFAFA',borderBottom:'1px solid #EEE',fontSize:11,fontWeight:900}}>
          <span style={{color:step==='type'?'#191923':'#999'}}>① Type</span>
          <span style={{color:'#ccc'}}>›</span>
          <span style={{color:step==='form'?'#191923':'#999'}}>② Détails</span>
          <span style={{color:'#ccc'}}>›</span>
          <span style={{color:step==='preview'?'#191923':'#999'}}>③ Aperçu</span>
        </div>
        
        {/* CONTENU SCROLLABLE */}
        <div style={{flex:1,overflow:'auto',padding:20}}>
          {/* ÉTAPE 1 : TYPE */}
          {step === 'type' && (
            <div>
              <div style={{fontSize:14,fontWeight:900,marginBottom:14}}>Quel type d'avenant veux-tu créer ?</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {types.map(function(t) {
                  var sel = amendmentType === t.key
                  return (
                    <button 
                      key={t.key}
                      onClick={function(){ setAmendmentType(t.key) }}
                      style={{
                        textAlign:'left',padding:'14px',
                        border: sel ? '2.5px solid #191923' : '2px solid #DDD',
                        borderRadius:8,
                        background: sel ? '#FFEB5A' : '#fff',
                        cursor:'pointer',
                        boxShadow: sel ? '3px 3px 0 #191923' : 'none'
                      }}>
                      <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
                      <div style={{fontSize:13,fontWeight:900,marginBottom:2}}>{t.label}</div>
                      <div style={{fontSize:11,color:'#666'}}>{t.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* ÉTAPE 2 : FORMULAIRE */}
          {step === 'form' && (
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14,padding:10,background:'#FFF9E5',borderRadius:6}}>
                <span style={{fontSize:20}}>{selectedTypeMeta?.icon}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:900}}>{selectedTypeMeta?.label}</div>
                  <div style={{fontSize:11,color:'#666'}}>{selectedTypeMeta?.desc}</div>
                </div>
              </div>
              
              {/* Date d'effet (commun à tous) */}
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Date d'effet de l'avenant *</label>
                <input 
                  type="date" 
                  value={effectiveDate}
                  onChange={function(e){ setEffectiveDate(e.target.value) }}
                  style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
              </div>
              
              {/* Champs spécifiques selon le type */}
              {amendmentType === 'prolongation_duree' && (
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Nouvelle date de fin *</label>
                  <div style={{fontSize:11,color:'#888',marginBottom:6}}>Date de fin actuelle : <strong>{c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : '—'}</strong></div>
                  <input 
                    type="date" 
                    value={newDateFin}
                    onChange={function(e){ setNewDateFin(e.target.value) }}
                    min={c.date_fin || effectiveDate}
                    style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
                </div>
              )}
              
              {amendmentType === 'augmentation_salaire' && (
                <>
                  {c.salaire_brut_mensuel != null && (
                    <div style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Nouveau salaire brut mensuel (€)</label>
                      <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.salaire_brut_mensuel} €</strong></div>
                      <input 
                        type="number" step="0.01"
                        value={newSalaireBrutMensuel}
                        onChange={function(e){ setNewSalaireBrutMensuel(e.target.value) }}
                        style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
                    </div>
                  )}
                  {c.taux_horaire_brut != null && c.type === 'extra' && (
                    <div style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Nouveau taux horaire brut (€)</label>
                      <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.taux_horaire_brut} €</strong></div>
                      <input 
                        type="number" step="0.01"
                        value={newTauxHoraire}
                        onChange={function(e){ setNewTauxHoraire(e.target.value) }}
                        style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
                    </div>
                  )}
                </>
              )}
              
              {amendmentType === 'modification_horaires' && (
                <>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Nouvelles heures hebdomadaires</label>
                    <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.heures_hebdo || '—'} h/semaine</strong></div>
                    <input 
                      type="number" step="0.5"
                      value={newHeuresHebdo}
                      onChange={function(e){ setNewHeuresHebdo(e.target.value) }}
                      style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
                  </div>
                  {c.heures_mensuelles != null && (
                    <div style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Nouvelles heures mensuelles</label>
                      <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.heures_mensuelles} h/mois</strong></div>
                      <input 
                        type="number" step="0.5"
                        value={newHeuresMensuelles}
                        onChange={function(e){ setNewHeuresMensuelles(e.target.value) }}
                        style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
                    </div>
                  )}
                </>
              )}
              
              {amendmentType === 'changement_poste' && (
                <>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Nouvelle fonction</label>
                    <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuelle : <strong>{c.fonction || '—'}</strong></div>
                    <input 
                      type="text"
                      value={newFonction}
                      onChange={function(e){ setNewFonction(e.target.value) }}
                      placeholder="ex: Responsable de salle"
                      style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>Nouvelle classification (optionnel)</label>
                    <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuelle : <strong>{c.classification || '—'}</strong></div>
                    <input 
                      type="text"
                      value={newClassification}
                      onChange={function(e){ setNewClassification(e.target.value) }}
                      placeholder="ex: Niveau III échelon B"
                      style={{padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',borderRadius:6,width:'100%'}}/>
                  </div>
                </>
              )}
              
              {/* Motif (commun à tous) */}
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4}}>
                  Motif de l'avenant *
                  <span style={{fontWeight:400,color:'#888'}}> (apparaît sur le PDF)</span>
                </label>
                <textarea
                  value={motif}
                  onChange={function(e){ setMotif(e.target.value) }}
                  rows={3}
                  placeholder={amendmentType === 'prolongation_duree' 
                    ? "ex: Prolongation pour finalisation de mission post-arrêt maladie"
                    : amendmentType === 'augmentation_salaire'
                    ? "ex: Augmentation annuelle / promotion suite à évaluation"
                    : amendmentType === 'modification_horaires'
                    ? "ex: Passage à temps plein suite à demande du salarié"
                    : amendmentType === 'changement_poste'
                    ? "ex: Évolution de poste, prise de nouvelles responsabilités sur la salle"
                    : "Décris précisément la modification apportée au contrat"}
                  style={{
                    padding:'8px 12px',fontSize:13,border:'1.5px solid #DDD',
                    borderRadius:6,width:'100%',fontFamily:'inherit',resize:'vertical'
                  }}/>
              </div>
            </div>
          )}
          
          {/* ÉTAPE 3 : PREVIEW */}
          {step === 'preview' && previewHtml && (
            <iframe
              srcDoc={previewHtml}
              style={{width:'100%',height:'60vh',border:'1px solid #DDD',borderRadius:6,background:'white'}}
              title="Aperçu de l'avenant"
            />
          )}
        </div>
        
        {/* FOOTER avec boutons d'action */}
        <div style={{
          padding:'12px 20px',background:'#FAFAFA',borderTop:'1px solid #EEE',
          display:'flex',justifyContent:'space-between',alignItems:'center',gap:8
        }}>
          <div>
            {step !== 'type' && (
              <button 
                onClick={function(){ 
                  if (step === 'preview') setStep('form')
                  else if (step === 'form') setStep('type')
                }}
                style={{
                  padding:'8px 14px',background:'#fff',
                  border:'1.5px solid #DDD',borderRadius:6,
                  fontSize:12,fontWeight:700,cursor:'pointer'
                }}>← Retour</button>
            )}
          </div>
          
          <div style={{display:'flex',gap:8}}>
            <button 
              onClick={props.onClose}
              style={{
                padding:'8px 14px',background:'#fff',
                border:'1.5px solid #DDD',borderRadius:6,
                fontSize:12,fontWeight:700,cursor:'pointer',color:'#666'
              }}>Annuler</button>
            
            {step === 'type' && (
              <button 
                onClick={function(){ setStep('form') }}
                disabled={!canGoToForm}
                style={{
                  padding:'8px 18px',
                  background: canGoToForm ? '#FFEB5A' : '#EEE',
                  border:'2px solid '+(canGoToForm ? '#191923' : '#CCC'),
                  borderRadius:6,fontSize:12,fontWeight:900,
                  cursor: canGoToForm ? 'pointer' : 'not-allowed'
                }}>Suivant →</button>
            )}
            
            {step === 'form' && (
              <button 
                onClick={doPreview}
                disabled={!canPreview || previewing}
                style={{
                  padding:'8px 18px',
                  background: canPreview ? '#FFEB5A' : '#EEE',
                  border:'2px solid '+(canPreview ? '#191923' : '#CCC'),
                  borderRadius:6,fontSize:12,fontWeight:900,
                  cursor: canPreview ? 'pointer' : 'not-allowed'
                }}>{previewing ? '⏳ Génération...' : '📄 Aperçu PDF'}</button>
            )}
            
            {step === 'preview' && (
              <button 
                onClick={doSubmit}
                disabled={submitting}
                style={{
                  padding:'8px 18px',
                  background:'#FF82D7',color:'white',
                  border:'2px solid #191923',
                  borderRadius:6,fontSize:12,fontWeight:900,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}>{submitting ? '⏳ Sauvegarde...' : '✓ Valider et créer l\'avenant'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
