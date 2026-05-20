'use client'
import { useState, useEffect, useRef } from 'react'

type Props = {
  contract: any
  employee: any
  onClose: () => void
  onSaved: (msg: string) => void
}

var MESHUGA = {
  pink: '#FF82D7',
  yellow: '#FFEB5A',
  black: '#191923',
  pinkSoft: '#FFE5F4',
  yellowSoft: '#FFFBE0',
  pinkBorder: '#C7589C'
}

function getAvailableTypes(contractType: string) {
  if (contractType === 'extra') {
    return [
      { key: 'prolongation_duree', label: 'Prolongation de la durée', icon: '📅', desc: 'Reporter la date de fin + ajouter des vacations' },
      { key: 'modification_horaires', label: 'Modification des horaires', icon: '🕐', desc: 'Remplacer le planning des vacations' },
      { key: 'autre', label: 'Autre modification', icon: '📝', desc: 'Texte libre' }
    ]
  }
  return [
    { key: 'augmentation_salaire', label: 'Modification de la rémunération', icon: '💰', desc: 'Augmentation salaire / taux horaire' },
    { key: 'modification_horaires', label: 'Modification des horaires', icon: '🕐', desc: 'Hausse ou baisse de la durée du travail' },
    { key: 'changement_poste', label: 'Changement de poste', icon: '👔', desc: 'Nouvelle fonction, classification, missions' },
    { key: 'autre', label: 'Autre modification', icon: '📝', desc: 'Texte libre (mobilité, adresse, etc.)' }
  ]
}

function getPredefinedMotifs(amendmentType: string) {
  if (amendmentType === 'prolongation_duree') {
    return [
      "Prolongation pour finalisation de mission post-arrêt maladie",
      "Prolongation pour besoin opérationnel ponctuel",
      "Prolongation en attente de retour d'un salarié absent",
      "Prolongation pour surcroît temporaire d'activité (saisonnalité)",
      "Prolongation pour finalisation de formation interne",
      "Autre (texte libre)"
    ]
  }
  if (amendmentType === 'augmentation_salaire') {
    return [
      "Augmentation annuelle suite à entretien d'évaluation",
      "Augmentation pour évolution des responsabilités",
      "Augmentation suite à acquisition de compétences (formation, certification)",
      "Augmentation pour ancienneté",
      "Revalorisation conventionnelle (CCN 1501)",
      "Augmentation au mérite suite à performance exceptionnelle",
      "Autre (texte libre)"
    ]
  }
  if (amendmentType === 'modification_horaires') {
    return [
      "Passage à temps plein suite à demande du salarié",
      "Passage à temps partiel suite à demande du salarié",
      "Augmentation de la durée du travail pour besoins opérationnels",
      "Réduction de la durée du travail suite à réorganisation",
      "Modification du planning hebdomadaire",
      "Adaptation des horaires suite à évolution de l'activité",
      "Autre (texte libre)"
    ]
  }
  if (amendmentType === 'changement_poste') {
    return [
      "Évolution vers un poste de responsabilité (promotion)",
      "Élargissement des missions sur la salle",
      "Élargissement des missions en cuisine",
      "Passage à des fonctions polyvalentes (cuisine + salle)",
      "Changement de fonction suite à réorganisation",
      "Prise en charge du management d'équipe",
      "Autre (texte libre)"
    ]
  }
  return []
}

// 🔥 Nom de fichier propre côté client
function buildFilename(emp: any, amendmentNumber: number, amendmentType: string) {
  function slug(s: string) {
    return (s || '').toString()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }
  var typeLabels: any = {
    prolongation_duree: 'prolongation',
    augmentation_salaire: 'augmentation-salaire',
    modification_horaires: 'modification-horaires',
    changement_poste: 'changement-poste',
    autre: 'modification'
  }
  return 'Avenant-' + amendmentNumber + '-' + (typeLabels[amendmentType] || 'avenant') + '-' + slug((emp.prenom || '') + '-' + (emp.nom || ''))
}

export default function AmendmentModal(props: Props) {
  var c = props.contract
  var emp = props.employee
  var [step, setStep] = useState<'type' | 'form' | 'preview'>('type')
  var [amendmentType, setAmendmentType] = useState<string>('')
  var [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10))
  var [motifPreset, setMotifPreset] = useState<string>('')
  var [motifLibre, setMotifLibre] = useState<string>('')
  var [submitting, setSubmitting] = useState(false)
  
  var [newDateFin, setNewDateFin] = useState<string>(c.date_fin || '')
  var [newSalaireBrutMensuel, setNewSalaireBrutMensuel] = useState<string>(c.salaire_brut_mensuel ? String(c.salaire_brut_mensuel) : '')
  var [newTauxHoraire, setNewTauxHoraire] = useState<string>(c.taux_horaire_brut ? String(c.taux_horaire_brut) : '')
  var [newHeuresHebdo, setNewHeuresHebdo] = useState<string>(c.heures_hebdo ? String(c.heures_hebdo) : '')
  var [newHeuresMensuelles, setNewHeuresMensuelles] = useState<string>(c.heures_mensuelles ? String(c.heures_mensuelles) : '')
  var [newFonction, setNewFonction] = useState<string>(c.fonction || '')
  var [newClassification, setNewClassification] = useState<string>(c.classification || '')
  
  // 🔥 Vacations supplémentaires (Extra)
  var [newVacations, setNewVacations] = useState<any[]>([])
  var [addingVacation, setAddingVacation] = useState<{date: string, debut: string, fin: string}>({
    date: '', debut: '18:00', fin: '23:00'
  })
  
  // Preview + iframe
  var [previewHtml, setPreviewHtml] = useState<string>('')
  var [previewing, setPreviewing] = useState(false)
  var [savedAmendmentNum, setSavedAmendmentNum] = useState<number | null>(null)
  var iframeRef = useRef<HTMLIFrameElement>(null)
  
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
  
  useEffect(function() {
    setMotifPreset('')
    setMotifLibre('')
  }, [amendmentType])
  
  // 🔥 Injection HTML dans iframe (comme ContractPreviewModal)
  useEffect(function() {
    if (step !== 'preview' || !iframeRef.current || !previewHtml) return
    var doc = iframeRef.current.contentDocument
    if (!doc) return
    doc.open()
    doc.write(previewHtml)
    doc.close()
  }, [step, previewHtml])
  
  var types = getAvailableTypes(c.type || 'extra')
  var selectedTypeMeta = types.find(function(t) { return t.key === amendmentType })
  var predefinedMotifs = getPredefinedMotifs(amendmentType)
  var isLibreMode = (amendmentType === 'autre') || (motifPreset === 'Autre (texte libre)')
  var finalMotif = isLibreMode ? motifLibre : motifPreset
  var isExtra = c.type === 'extra'
  
  function addVacation() {
    if (!addingVacation.date || !addingVacation.debut || !addingVacation.fin) return
    setNewVacations(function(arr: any[]) {
      var next = arr.concat([{
        date_vacation: addingVacation.date,
        heure_debut: addingVacation.debut,
        heure_fin: addingVacation.fin
      }])
      next.sort(function(a: any, b: any) { return (a.date_vacation || '').localeCompare(b.date_vacation || '') })
      return next
    })
    setAddingVacation({ date: '', debut: '18:00', fin: '23:00' })
  }
  
  function removeVacation(idx: number) {
    setNewVacations(function(arr: any[]) {
      return arr.filter(function(_, i) { return i !== idx })
    })
  }
  
  function buildPayload(includePreview: boolean) {
    var payload: any = {
      amendment_type: amendmentType,
      effective_date: effectiveDate,
      motif: finalMotif
    }
    if (includePreview) payload.preview = true
    
    if (amendmentType === 'prolongation_duree') {
      payload.new_date_fin = newDateFin
      if (newVacations.length > 0) {
        payload.new_vacations = newVacations
        payload.replace_vacations = false  // AJOUT
      }
    } else if (amendmentType === 'augmentation_salaire') {
      if (newSalaireBrutMensuel) payload.new_salaire_brut_mensuel = parseFloat(newSalaireBrutMensuel)
      if (newTauxHoraire) payload.new_taux_horaire_brut = parseFloat(newTauxHoraire)
    } else if (amendmentType === 'modification_horaires') {
      if (newHeuresHebdo) payload.new_heures_hebdo = parseFloat(newHeuresHebdo)
      if (newHeuresMensuelles) payload.new_heures_mensuelles = parseFloat(newHeuresMensuelles)
      if (newVacations.length > 0) {
        payload.new_vacations = newVacations
        payload.replace_vacations = true  // REMPLACEMENT pour modif horaires
      }
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
      // 🔥 RAFRAÎCHIR le preview avec le HTML retourné (on reste sur le modal)
      if (data.html) {
        setPreviewHtml(data.html)
      }
      if (data.amendment && data.amendment.amendment_number) {
        setSavedAmendmentNum(data.amendment.amendment_number)
      }
      props.onSaved('Avenant n°' + (data.amendment && data.amendment.amendment_number) + ' créé ✓ — Imprime-le maintenant en PDF')
    } catch (err: any) {
      alert('Erreur création avenant : ' + (err.message || err))
    } finally {
      setSubmitting(false)
    }
  }
  
  // 🔥 Imprime via iframe (dialogue navigateur "Enregistrer en PDF")
  function doPrint() {
    if (!iframeRef.current) return
    iframeRef.current.contentWindow!.focus()
    iframeRef.current.contentWindow!.print()
  }
  
  // 🔥 Télécharge le HTML avec nom propre
  function doDownloadHtml() {
    if (!previewHtml) return
    var num = savedAmendmentNum || 1
    var filename = buildFilename(emp, num, amendmentType) + '.html'
    var blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  var canGoToForm = !!amendmentType
  var motifOK = !!finalMotif && finalMotif.trim().length >= (isLibreMode ? 10 : 1)
  var canPreview = false
  if (amendmentType === 'prolongation_duree') canPreview = !!newDateFin && motifOK
  else if (amendmentType === 'augmentation_salaire') canPreview = (!!newSalaireBrutMensuel || !!newTauxHoraire) && motifOK
  else if (amendmentType === 'modification_horaires') canPreview = (!!newHeuresHebdo || !!newHeuresMensuelles || newVacations.length > 0) && motifOK
  else if (amendmentType === 'changement_poste') canPreview = (!!newFonction || !!newClassification) && motifOK
  else if (amendmentType === 'autre') canPreview = motifOK
  
  return (
    <div 
      onClick={function(e){ if(e.target === e.currentTarget) props.onClose() }}
      style={{
        position:'fixed',top:0,left:0,right:0,bottom:0,
        background:'rgba(199, 88, 156, 0.35)',
        zIndex:9999,
        display:'flex',alignItems:'center',justifyContent:'center',
        padding:20
      }}>
      <div style={{
        background:'#fff',borderRadius:14,
        maxWidth: step === 'preview' ? 1100 : 900,
        width:'100%',
        maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',
        boxShadow:'0 10px 40px rgba(199, 88, 156, 0.4)',
        border: '3px solid ' + MESHUGA.pink
      }}>
        {/* HEADER ROSE */}
        <div style={{
          padding:'14px 20px',
          background: MESHUGA.pink,
          color: 'white',
          display:'flex',justifyContent:'space-between',alignItems:'center',
          borderBottom: '4px solid ' + MESHUGA.yellow
        }}>
          <div>
            <div style={{fontFamily:'Yellowtail',fontSize:24,lineHeight:1,color:'white',textShadow:'1px 1px 0 rgba(0,0,0,0.15)'}}>
              📝 Faire un avenant
            </div>
            <div style={{fontSize:11,opacity:0.95,marginTop:3,color:'white'}}>
              <strong>{emp.prenom} {emp.nom}</strong> · {c.type === 'extra' ? 'CDD Usage Extra' : (c.type || '').replace('cdi_', 'CDI ')}
              {c.date_debut && ' · du ' + new Date(c.date_debut).toLocaleDateString('fr-FR')}
              {c.date_fin && ' au ' + new Date(c.date_fin).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <button 
            onClick={props.onClose}
            title="Fermer (Échap)"
            style={{
              background:'white',color: MESHUGA.pink,border:'2px solid white',
              width:40,height:40,borderRadius:8,fontSize:20,fontWeight:900,
              cursor:'pointer',lineHeight:1,boxShadow:'2px 2px 0 rgba(0,0,0,0.15)'
            }}>✕</button>
        </div>
        
        {/* STEPPER */}
        <div style={{
          display:'flex',gap:8,padding:'10px 20px',
          background: MESHUGA.yellowSoft,
          borderBottom:'2px solid ' + MESHUGA.yellow,
          fontSize:11,fontWeight:900
        }}>
          <span style={{color: step==='type' ? MESHUGA.pink : '#888'}}>① Type</span>
          <span style={{color:'#ccc'}}>›</span>
          <span style={{color: step==='form' ? MESHUGA.pink : '#888'}}>② Détails</span>
          <span style={{color:'#ccc'}}>›</span>
          <span style={{color: step==='preview' ? MESHUGA.pink : '#888'}}>③ Aperçu & PDF</span>
        </div>
        
        <div style={{flex:1,overflow:'auto',padding:20, background: 'white'}}>
          {/* ÉTAPE 1 : TYPE */}
          {step === 'type' && (
            <div>
              <div style={{fontSize:14,fontWeight:900,marginBottom:14,color: MESHUGA.pink}}>
                Quel type d'avenant veux-tu créer ?
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {types.map(function(t) {
                  var sel = amendmentType === t.key
                  return (
                    <button 
                      key={t.key}
                      onClick={function(){ setAmendmentType(t.key) }}
                      style={{
                        textAlign:'left',padding:'14px',
                        border: sel ? ('2.5px solid ' + MESHUGA.pink) : '2px solid #DDD',
                        borderRadius:8,
                        background: sel ? MESHUGA.pinkSoft : '#fff',
                        cursor:'pointer',
                        boxShadow: sel ? ('3px 3px 0 ' + MESHUGA.pink) : 'none',
                        transition: 'all 0.15s'
                      }}>
                      <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
                      <div style={{fontSize:13,fontWeight:900,marginBottom:2, color: sel ? MESHUGA.pinkBorder : '#191923'}}>{t.label}</div>
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
              <div style={{
                display:'flex',alignItems:'center',gap:10,marginBottom:14,
                padding:12,
                background: MESHUGA.yellowSoft,
                border: '2px solid ' + MESHUGA.yellow,
                borderRadius:8
              }}>
                <span style={{fontSize:22}}>{selectedTypeMeta && selectedTypeMeta.icon}</span>
                <div>
                  <div style={{fontSize:14,fontWeight:900, color: MESHUGA.black}}>{selectedTypeMeta && selectedTypeMeta.label}</div>
                  <div style={{fontSize:11,color:'#666'}}>{selectedTypeMeta && selectedTypeMeta.desc}</div>
                </div>
              </div>
              
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>
                  Date d'effet de l'avenant *
                </label>
                <input type="date" value={effectiveDate}
                  onChange={function(e){ setEffectiveDate(e.target.value) }}
                  style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%',background:'white'}}/>
              </div>
              
              {amendmentType === 'prolongation_duree' && (
                <>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>
                      Nouvelle date de fin *
                    </label>
                    <div style={{fontSize:11,color:'#888',marginBottom:6}}>
                      Date de fin actuelle : <strong>{c.date_fin ? new Date(c.date_fin).toLocaleDateString('fr-FR') : '—'}</strong>
                    </div>
                    <input type="date" value={newDateFin}
                      onChange={function(e){ setNewDateFin(e.target.value) }}
                      min={c.date_fin || effectiveDate}
                      style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%'}}/>
                  </div>
                  
                  {/* 🔥 BLOC VACATIONS pour Extra */}
                  {isExtra && (
                    <div style={{marginBottom:14,padding:12,background: MESHUGA.pinkSoft,border: '2px dashed ' + MESHUGA.pink,borderRadius:8}}>
                      <div style={{fontSize:13,fontWeight:900,color: MESHUGA.pinkBorder, marginBottom:8}}>
                        📅 Vacations supplémentaires à ajouter
                      </div>
                      <div style={{fontSize:11,color:'#666',marginBottom:10}}>
                        Ajoute les nouvelles vacations (date + heure début + heure fin) qui correspondent à la prolongation. Elles seront ajoutées au planning existant et apparaîtront dans le PDF.
                      </div>
                      
                      {newVacations.length > 0 && (
                        <div style={{marginBottom:10}}>
                          {newVacations.map(function(v: any, idx: number) {
                            var d = new Date(v.date_vacation)
                            var lbl = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
                            return (
                              <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'white',border:'1px solid '+MESHUGA.pink,borderRadius:6,marginBottom:4,fontSize:12}}>
                                <span style={{fontWeight:900,minWidth:120}}>{lbl}</span>
                                <span>{v.heure_debut} → {v.heure_fin}</span>
                                <button onClick={function(){ removeVacation(idx) }}
                                  style={{marginLeft:'auto',background:'#CC0066',color:'white',border:'none',padding:'3px 9px',borderRadius:4,fontSize:10,fontWeight:900,cursor:'pointer'}}>Retirer</button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr auto',gap:6,alignItems:'end'}}>
                        <div>
                          <div style={{fontSize:10,fontWeight:900,marginBottom:2,color:'#666'}}>Date</div>
                          <input type="date" value={addingVacation.date}
                            min={c.date_fin || effectiveDate}
                            onChange={function(e){ setAddingVacation(Object.assign({}, addingVacation, { date: e.target.value })) }}
                            style={{padding:'6px 8px',fontSize:12,border:'1.5px solid '+MESHUGA.pink,borderRadius:5,width:'100%'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:10,fontWeight:900,marginBottom:2,color:'#666'}}>Début</div>
                          <input type="time" value={addingVacation.debut}
                            onChange={function(e){ setAddingVacation(Object.assign({}, addingVacation, { debut: e.target.value })) }}
                            style={{padding:'6px 8px',fontSize:12,border:'1.5px solid '+MESHUGA.pink,borderRadius:5,width:'100%'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:10,fontWeight:900,marginBottom:2,color:'#666'}}>Fin</div>
                          <input type="time" value={addingVacation.fin}
                            onChange={function(e){ setAddingVacation(Object.assign({}, addingVacation, { fin: e.target.value })) }}
                            style={{padding:'6px 8px',fontSize:12,border:'1.5px solid '+MESHUGA.pink,borderRadius:5,width:'100%'}}/>
                        </div>
                        <button onClick={addVacation}
                          disabled={!addingVacation.date || !addingVacation.debut || !addingVacation.fin}
                          style={{padding:'8px 12px',background: MESHUGA.yellow,border:'2px solid '+MESHUGA.black,borderRadius:5,fontSize:11,fontWeight:900,cursor:'pointer',color: MESHUGA.black,boxShadow: '1px 1px 0 '+MESHUGA.black}}>+ Ajouter</button>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {amendmentType === 'augmentation_salaire' && (
                <>
                  {c.salaire_brut_mensuel != null && (
                    <div style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>Nouveau salaire brut mensuel (€)</label>
                      <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.salaire_brut_mensuel} €</strong></div>
                      <input type="number" step="0.01" value={newSalaireBrutMensuel}
                        onChange={function(e){ setNewSalaireBrutMensuel(e.target.value) }}
                        style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%'}}/>
                    </div>
                  )}
                  {c.taux_horaire_brut != null && (
                    <div style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>Nouveau taux horaire brut (€)</label>
                      <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.taux_horaire_brut} €</strong></div>
                      <input type="number" step="0.01" value={newTauxHoraire}
                        onChange={function(e){ setNewTauxHoraire(e.target.value) }}
                        style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%'}}/>
                    </div>
                  )}
                </>
              )}
              
              {amendmentType === 'modification_horaires' && (
                <>
                  {!isExtra && (
                    <>
                      <div style={{marginBottom:14}}>
                        <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>Nouvelles heures hebdomadaires</label>
                        <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.heures_hebdo || '—'} h/semaine</strong></div>
                        <input type="number" step="0.5" value={newHeuresHebdo}
                          onChange={function(e){ setNewHeuresHebdo(e.target.value) }}
                          style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%'}}/>
                      </div>
                      {c.heures_mensuelles != null && (
                        <div style={{marginBottom:14}}>
                          <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>Nouvelles heures mensuelles</label>
                          <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuel : <strong>{c.heures_mensuelles} h/mois</strong></div>
                          <input type="number" step="0.5" value={newHeuresMensuelles}
                            onChange={function(e){ setNewHeuresMensuelles(e.target.value) }}
                            style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%'}}/>
                        </div>
                      )}
                    </>
                  )}
                  
                  {isExtra && (
                    <div style={{marginBottom:14,padding:12,background: MESHUGA.pinkSoft,border: '2px dashed ' + MESHUGA.pink,borderRadius:8}}>
                      <div style={{fontSize:13,fontWeight:900,color: MESHUGA.pinkBorder, marginBottom:8}}>
                        📅 Nouveau planning des vacations
                      </div>
                      <div style={{fontSize:11,color:'#666',marginBottom:10}}>
                        ⚠️ Saisis ici le NOUVEAU planning complet (il remplacera l'ancien). Pour juste AJOUTER des dates, utilise "Prolongation de la durée" à la place.
                      </div>
                      
                      {newVacations.length > 0 && (
                        <div style={{marginBottom:10}}>
                          {newVacations.map(function(v: any, idx: number) {
                            var d = new Date(v.date_vacation)
                            var lbl = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
                            return (
                              <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'white',border:'1px solid '+MESHUGA.pink,borderRadius:6,marginBottom:4,fontSize:12}}>
                                <span style={{fontWeight:900,minWidth:120}}>{lbl}</span>
                                <span>{v.heure_debut} → {v.heure_fin}</span>
                                <button onClick={function(){ removeVacation(idx) }}
                                  style={{marginLeft:'auto',background:'#CC0066',color:'white',border:'none',padding:'3px 9px',borderRadius:4,fontSize:10,fontWeight:900,cursor:'pointer'}}>Retirer</button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      
                      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr auto',gap:6,alignItems:'end'}}>
                        <div>
                          <div style={{fontSize:10,fontWeight:900,marginBottom:2,color:'#666'}}>Date</div>
                          <input type="date" value={addingVacation.date}
                            onChange={function(e){ setAddingVacation(Object.assign({}, addingVacation, { date: e.target.value })) }}
                            style={{padding:'6px 8px',fontSize:12,border:'1.5px solid '+MESHUGA.pink,borderRadius:5,width:'100%'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:10,fontWeight:900,marginBottom:2,color:'#666'}}>Début</div>
                          <input type="time" value={addingVacation.debut}
                            onChange={function(e){ setAddingVacation(Object.assign({}, addingVacation, { debut: e.target.value })) }}
                            style={{padding:'6px 8px',fontSize:12,border:'1.5px solid '+MESHUGA.pink,borderRadius:5,width:'100%'}}/>
                        </div>
                        <div>
                          <div style={{fontSize:10,fontWeight:900,marginBottom:2,color:'#666'}}>Fin</div>
                          <input type="time" value={addingVacation.fin}
                            onChange={function(e){ setAddingVacation(Object.assign({}, addingVacation, { fin: e.target.value })) }}
                            style={{padding:'6px 8px',fontSize:12,border:'1.5px solid '+MESHUGA.pink,borderRadius:5,width:'100%'}}/>
                        </div>
                        <button onClick={addVacation}
                          disabled={!addingVacation.date}
                          style={{padding:'8px 12px',background: MESHUGA.yellow,border:'2px solid '+MESHUGA.black,borderRadius:5,fontSize:11,fontWeight:900,cursor:'pointer',color: MESHUGA.black,boxShadow: '1px 1px 0 '+MESHUGA.black}}>+ Ajouter</button>
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {amendmentType === 'changement_poste' && (
                <>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>Nouvelle fonction</label>
                    <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuelle : <strong>{c.fonction || '—'}</strong></div>
                    <input type="text" value={newFonction}
                      onChange={function(e){ setNewFonction(e.target.value) }}
                      placeholder="ex: Responsable de salle"
                      style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%'}}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>Nouvelle classification (optionnel)</label>
                    <div style={{fontSize:11,color:'#888',marginBottom:6}}>Actuelle : <strong>{c.classification || '—'}</strong></div>
                    <input type="text" value={newClassification}
                      onChange={function(e){ setNewClassification(e.target.value) }}
                      placeholder="ex: Niveau III échelon B"
                      style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%'}}/>
                  </div>
                </>
              )}
              
              <div style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:12,fontWeight:900,marginBottom:4, color: MESHUGA.pinkBorder}}>
                  Motif de l'avenant *
                  <span style={{fontWeight:400,color:'#888'}}> (apparaît sur le PDF)</span>
                </label>
                
                {predefinedMotifs.length > 0 && (
                  <select value={motifPreset}
                    onChange={function(e){ setMotifPreset(e.target.value) }}
                    style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%',background:'white',fontFamily:'inherit',cursor:'pointer',marginBottom: isLibreMode ? 8 : 0}}>
                    <option value="">— Choisis un motif —</option>
                    {predefinedMotifs.map(function(m) {
                      return <option key={m} value={m}>{m}</option>
                    })}
                  </select>
                )}
                
                {isLibreMode && (
                  <textarea value={motifLibre}
                    onChange={function(e){ setMotifLibre(e.target.value) }}
                    rows={3}
                    placeholder="Décris précisément la modification ou le motif (10 caractères minimum)"
                    style={{padding:'9px 12px',fontSize:13,border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,width:'100%',fontFamily:'inherit',resize:'vertical',background:'white'}}/>
                )}
                
                {finalMotif && (
                  <div style={{marginTop:8,padding:'8px 10px',background: MESHUGA.yellowSoft,border: '1px dashed ' + MESHUGA.yellow,borderRadius:6,fontSize:11,color:'#666',fontStyle:'italic'}}>
                    💬 Motif final : "{finalMotif}"
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 🔥 ÉTAPE 3 : iframe avec injection du HTML */}
          {step === 'preview' && (
            <>
              {savedAmendmentNum && (
                <div style={{padding:'10px 12px',background:'#E8FFE8',border:'1.5px solid #009D3A',borderRadius:6,marginBottom:10,fontSize:12,color:'#006622',fontWeight:700}}>
                  ✅ Avenant n°{savedAmendmentNum} créé en base. Imprime-le maintenant en PDF avec le bouton ci-dessous, puis fais-le signer.
                </div>
              )}
              <iframe
                ref={iframeRef}
                style={{
                  width:'100%',
                  height: savedAmendmentNum ? 'calc(70vh - 50px)' : '70vh',
                  border: '2px solid ' + MESHUGA.pink,
                  borderRadius:6,
                  background:'white'
                }}
                title="Aperçu de l'avenant"
              />
            </>
          )}
        </div>
        
        {/* FOOTER */}
        <div style={{
          padding:'12px 20px',
          background: MESHUGA.yellowSoft,
          borderTop: '2px solid ' + MESHUGA.yellow,
          display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,
          flexWrap:'wrap'
        }}>
          <div>
            {step !== 'type' && !savedAmendmentNum && (
              <button onClick={function(){ 
                if (step === 'preview') setStep('form')
                else if (step === 'form') setStep('type')
              }}
                style={{padding:'8px 14px',background:'#fff',border:'1.5px solid ' + MESHUGA.pink,borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',color: MESHUGA.pinkBorder}}>← Retour</button>
            )}
          </div>
          
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button onClick={props.onClose}
              style={{padding:'8px 14px',background:'#fff',border:'1.5px solid #DDD',borderRadius:6,fontSize:12,fontWeight:700,cursor:'pointer',color:'#888'}}>
              {savedAmendmentNum ? 'Fermer' : 'Annuler'}
            </button>
            
            {step === 'type' && (
              <button onClick={function(){ setStep('form') }}
                disabled={!canGoToForm}
                style={{padding:'10px 22px',background: canGoToForm ? MESHUGA.yellow : '#EEE',border:'2px solid ' + (canGoToForm ? MESHUGA.black : '#CCC'),borderRadius:6,fontSize:13,fontWeight:900,cursor: canGoToForm ? 'pointer' : 'not-allowed',boxShadow: canGoToForm ? ('2px 2px 0 ' + MESHUGA.black) : 'none',color: MESHUGA.black}}>
                Suivant →
              </button>
            )}
            
            {step === 'form' && (
              <button onClick={doPreview}
                disabled={!canPreview || previewing}
                style={{padding:'10px 22px',background: canPreview ? MESHUGA.yellow : '#EEE',border:'2px solid ' + (canPreview ? MESHUGA.black : '#CCC'),borderRadius:6,fontSize:13,fontWeight:900,cursor: canPreview ? 'pointer' : 'not-allowed',boxShadow: canPreview ? ('2px 2px 0 ' + MESHUGA.black) : 'none',color: MESHUGA.black}}>
                {previewing ? '⏳ Génération...' : '📄 Aperçu'}
              </button>
            )}
            
            {step === 'preview' && (
              <>
                {!savedAmendmentNum && (
                  <button onClick={doSubmit}
                    disabled={submitting}
                    style={{padding:'10px 22px',background: MESHUGA.pink,color:'white',border:'2px solid ' + MESHUGA.black,borderRadius:6,fontSize:13,fontWeight:900,cursor: submitting ? 'not-allowed' : 'pointer',boxShadow: '2px 2px 0 ' + MESHUGA.black}}>
                    {submitting ? '⏳ Sauvegarde...' : '✓ Valider et créer l\'avenant'}
                  </button>
                )}
                
                <button onClick={doDownloadHtml}
                  style={{padding:'10px 18px',background:'white',color: MESHUGA.pinkBorder,border:'2px solid ' + MESHUGA.pink,borderRadius:6,fontSize:13,fontWeight:900,cursor:'pointer'}}>
                  ⬇ Télécharger HTML
                </button>
                
                <button onClick={doPrint}
                  style={{padding:'10px 22px',background: MESHUGA.yellow,color: MESHUGA.black,border:'2px solid ' + MESHUGA.black,borderRadius:6,fontSize:13,fontWeight:900,cursor:'pointer',boxShadow: '2px 2px 0 ' + MESHUGA.black}}>
                  🖨️ Imprimer / PDF
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
