'use client'

// ============================================================
// ProspectEmailModal — pitch IA prospect : génération, édition,
// aperçu fidèle (même builder que l'envoi) et envoi en 1 clic.
// Multi-destinataires : bouton « + » sous le À → chaque contact reçoit
// SON mail, salutation personnalisée (prénom, sinon civilité + nom).
// ============================================================

import { useState, useEffect } from 'react'
import { PRESS_LINKS, PRESS_TV, REFERENCES, EMAIL_TYPES, FROM_EMAIL, REPLY_TO_EMAIL, buildProspectEmailHtml, cleanEmail, isValidEmail, getSender, guessNameFromEmail, personalizeBody, personalizeText, buildGreeting } from '@/lib/prospectEmail'

export default function ProspectEmailModal(props) {
  var prospect = props.prospect || {}
  var onClose = props.onClose
  var toast = props.toast || function(){}
  var logActivity = props.logActivity || function(){}
  var setProspects = props.setProspects

  var initialTo = cleanEmail(prospect.contactEmail) || cleanEmail(prospect.contact_email) || cleanEmail(prospect.email)
  var isCrm = prospect.cat === 'crm' && prospect.id

  var [emailType, setEmailType] = useState(prospect.__emailType || 'first')
  var [senderKey, setSenderKey] = useState(prospect.__sender === 'emy' ? 'emy' : 'edward')
  var [loading, setLoading] = useState(true)
  var [err, setErr] = useState('')
  var [recipients, setRecipients] = useState([{
    email: initialTo,
    firstName: String(prospect.contactFirstName || '').trim(),
    lastName: String(prospect.contactLastName || '').trim(),
    civility: ''
  }] as any)
  var [previewIdx, setPreviewIdx] = useState(0)
  var [cc, setCc] = useState('')
  var [subject, setSubject] = useState('')
  var [body, setBody] = useState('')
  var [pressKeys, setPressKeys] = useState([] as any)
  var [showRefs, setShowRefs] = useState(true)
  var [showTv, setShowTv] = useState(true)
  var [attachPlaquette, setAttachPlaquette] = useState(true)
  var [view, setView] = useState('edit')
  var [sending, setSending] = useState(false)

  var generate = function(type, sKey) {
    setLoading(true)
    setErr('')
    fetch('/api/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect: prospect, emailType: type, senderKey: sKey, attachPlaquette: attachPlaquette })
    }).then(function(r) { return r.json().then(function(d) { return { ok: r.ok, d: d } }) })
      .then(function(res) {
        if (!res.ok || res.d.error) { setErr(res.d.error || 'Erreur de génération'); setLoading(false); return }
        setSubject(res.d.subject || '')
        setBody(res.d.body || '')
        setPressKeys(Array.isArray(res.d.pressKeys) ? res.d.pressKeys : [])
        setLoading(false)
        logActivity('email_genere', 'Email IA généré pour ' + (prospect.name || ''), prospect.name || '', null)
      })
      .catch(function(e) { setErr(String((e && e.message) || e)); setLoading(false) })
  }

  useEffect(function() {
    generate(prospect.__emailType || 'first', prospect.__sender === 'emy' ? 'emy' : 'edward')
  }, [])

  var togglePress = function(k) {
    setPressKeys(function(prev) {
      if (prev.indexOf(k) >= 0) return prev.filter(function(x) { return x !== k })
      if (prev.length >= 3) { toast('3 articles max'); return prev }
      return prev.concat([k])
    })
  }

  var updateRecipient = function(idx, patch) {
    setRecipients(function(prev) {
      return prev.map(function(r, i) { return i === idx ? Object.assign({}, r, patch) : r })
    })
  }
  var addRecipient = function() {
    setRecipients(function(prev) { return prev.concat([{ email: '', firstName: '', lastName: '', civility: '' }]) })
  }
  var removeRecipient = function(idx) {
    setRecipients(function(prev) { return prev.length <= 1 ? prev : prev.filter(function(r, i) { return i !== idx }) })
    setPreviewIdx(0)
  }
  // À la sortie du champ email : on devine prénom/nom si rien n'est saisi (marie.dupont@ → Marie Dupont)
  var onEmailBlur = function(idx) {
    var r = recipients[idx]
    if (!r || r.firstName || r.lastName) return
    var g = guessNameFromEmail(String(r.email || '').trim())
    if (g.firstName || g.lastName) updateRecipient(idx, { firstName: g.firstName, lastName: g.lastName })
  }

  var safeIdx = previewIdx < recipients.length ? previewIdx : 0
  var previewR = recipients[safeIdx] || {}
  var baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dashboard.meshuga.fr'
  var previewSubject = personalizeText(subject, previewR)
  var previewHtml = buildProspectEmailHtml({
    baseUrl: baseUrl, senderKey: senderKey, subject: previewSubject, body: personalizeBody(body, previewR),
    pressKeys: pressKeys, showReferences: showRefs, showTv: showTv, attachPlaquette: attachPlaquette
  })
  var filledRecipients = recipients.filter(function(r) { return String(r.email || '').trim() })

  var send = function() {
    var list = recipients.map(function(r) {
      return { email: String(r.email || '').trim(), firstName: String(r.firstName || '').trim(), lastName: String(r.lastName || '').trim(), civility: r.civility || '' }
    }).filter(function(r) { return r.email })
    if (!list.length) { toast('Ajoute au moins une adresse'); return }
    var bad = list.filter(function(r) { return !isValidEmail(r.email) })
    if (bad.length) { toast('Adresse invalide : ' + bad[0].email); return }
    var emails = list.map(function(r) { return r.email.toLowerCase() })
    var dup = emails.filter(function(e, i) { return emails.indexOf(e) !== i })
    if (dup.length) { toast('Adresse en double : ' + dup[0]); return }
    if (!subject.trim()) { toast('Objet manquant'); return }
    if (body.trim().length < 20) { toast('Le message est trop court'); return }
    var recap = list.map(function(r) { return '• ' + r.email + '  →  « ' + buildGreeting(r) + ' »' }).join('\n')
    var question = list.length > 1
      ? 'Envoyer ' + list.length + ' mails individuels ?\n\n' + recap + (cc.trim() ? '\n\nCc ' + cc.trim() + ' (sur le 1er mail uniquement)' : '')
      : 'Envoyer ce mail à ' + list[0].email + ' ?\n\n' + recap
    if (!window.confirm(question)) return
    setSending(true)
    fetch('/api/prospect-email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipients: list, cc: cc.trim(), subject: subject.trim(), body: body,
        senderKey: senderKey, pressKeys: pressKeys, showReferences: showRefs, showTv: showTv, attachPlaquette: attachPlaquette,
        prospectId: isCrm ? prospect.id : null, prospectName: prospect.name || ''
      })
    }).then(function(r) { return r.json() })
      .then(function(d) {
        setSending(false)
        if (!d || !d.ok) { toast('Échec envoi : ' + ((d && d.error) || 'erreur')); return }
        var sentEmails = Array.isArray(d.sent) ? d.sent.map(function(x) { return x.email }) : [list[0].email]
        var failed = Array.isArray(d.failed) ? d.failed : []
        logActivity('email_envoye', 'Email envoyé à ' + (prospect.name || sentEmails[0]) + ' (' + sentEmails.join(', ') + ')', prospect.name || '', subject)
        if (isCrm && setProspects) {
          setProspects(function(prev) {
            return prev.map(function(x) {
              if (String(x.id) !== String(prospect.id)) return x
              return Object.assign({}, x, { last_contacted_at: d.sentAt }, d.newStatus ? { status: d.newStatus } : {})
            })
          })
        }
        if (failed.length) {
          // On garde le modal ouvert avec uniquement les adresses en échec
          var failedEmails = failed.map(function(f) { return String(f.email || '').toLowerCase() })
          setRecipients(function(prev) {
            var keep = prev.filter(function(r) { return failedEmails.indexOf(String(r.email || '').trim().toLowerCase()) >= 0 })
            return keep.length ? keep : prev
          })
          setPreviewIdx(0)
          toast(sentEmails.length + ' envoyé(s) ✓ — ' + failed.length + ' échec(s) : ' + failed.map(function(f) { return f.email }).join(', '))
          return
        }
        toast(sentEmails.length > 1 ? sentEmails.length + ' emails envoyés ✓' : 'Email envoyé ✓')
        onClose()
      })
      .catch(function(e) { setSending(false); toast('Erreur : ' + String((e && e.message) || e)) })
  }

  var copy = function() {
    navigator.clipboard.writeText('Objet : ' + subject + '\n\n' + body).then(function() {
      logActivity('email_copie', 'Email copié pour ' + (prospect.name || ''), prospect.name || '', body)
      toast('Email copié !')
    })
  }

  var sender = getSender(senderKey)
  var chip = function(active) {
    return {
      padding: '4px 9px', borderRadius: 6, border: '2px solid #191923', cursor: 'pointer',
      fontSize: 11, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif',
      background: active ? '#FF82D7' : '#FFFFFF', color: active ? '#FFFFFF' : '#191923',
      boxShadow: active ? '2px 2px 0 #191923' : 'none'
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <style>{'.pem{max-width:1100px!important}.pem-grid{display:grid;grid-template-columns:1fr;gap:16px}.pem-prev iframe{width:100%;height:760px;border:2px solid #191923;border-radius:8px;background:#FFFDF5}.pem-tabs{display:flex;gap:6px;margin-bottom:10px}@media(min-width:1000px){.pem-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.pem-tabs{display:none}.pem-edit,.pem-prev{display:block!important}}'}</style>
      <div className="modal pem" onClick={function(e){ e.stopPropagation() }}>
        <div className="mh">
          <div className="mt">✉️ Pitch — {prospect.name || ''}</div>
        </div>
        <div className="mb">
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12}}>
            {EMAIL_TYPES.map(function(t) {
              return <button key={t.key} type="button" style={chip(emailType === t.key)} onClick={function(){ setEmailType(t.key) }}>{t.label}</button>
            })}
            <select className="inp" value={senderKey} onChange={function(e){ setSenderKey(e.target.value) }} style={{width:'auto',minHeight:0,padding:'4px 8px',fontSize:11}}>
              <option value="edward">De : Edward</option>
              <option value="emy">De : Emy</option>
            </select>
            <button type="button" className="btn btn-sm" disabled={loading} onClick={function(){ generate(emailType, senderKey) }}>{loading ? '⏳ Génération…' : '↻ Régénérer'}</button>
          </div>

          <div className="pem-tabs">
            <button type="button" style={chip(view === 'edit')} onClick={function(){ setView('edit') }}>Édition</button>
            <button type="button" style={chip(view === 'preview')} onClick={function(){ setView('preview') }}>Aperçu</button>
          </div>

          <div className="pem-grid">
            <div className="pem-edit" style={{display: view === 'edit' ? 'block' : 'none'}}>
              <div className="fg">
                <label className="lbl">À {recipients.length > 1 ? '(' + recipients.length + ' destinataires — 1 mail perso chacun)' : ''}</label>
                {recipients.map(function(r, idx) {
                  return (
                    <div key={idx} style={{border:'2px solid #191923',borderRadius:8,padding:6,marginBottom:6,background: recipients.length > 1 && idx === safeIdx ? '#FFF7FC' : '#FFFFFF'}}>
                      <div style={{display:'flex',gap:6,alignItems:'center'}}>
                        <input className="inp" style={{minHeight:0,flex:1,marginBottom:0}} value={r.email} onChange={function(e){ updateRecipient(idx, { email: e.target.value }) }} onBlur={function(){ onEmailBlur(idx) }} placeholder="contact@entreprise.fr" />
                        {recipients.length > 1 && (
                          <button type="button" title="Retirer" onClick={function(){ removeRecipient(idx) }} style={{width:28,height:28,flex:'0 0 28px',borderRadius:6,border:'2px solid #191923',background:'#FFFFFF',cursor:'pointer',fontWeight:900,fontSize:13,lineHeight:1}}>✕</button>
                        )}
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'74px minmax(0,1fr) minmax(0,1fr)',gap:6,marginTop:6}}>
                        <select className="inp" value={r.civility} onChange={function(e){ updateRecipient(idx, { civility: e.target.value }) }} style={{minHeight:0,padding:'4px 6px',fontSize:11,marginBottom:0}}>
                          <option value="">Civ.</option>
                          <option value="mme">Mme</option>
                          <option value="m">M.</option>
                        </select>
                        <input className="inp" style={{minHeight:0,fontSize:12,marginBottom:0}} value={r.firstName} onChange={function(e){ updateRecipient(idx, { firstName: e.target.value }) }} placeholder="Prénom" />
                        <input className="inp" style={{minHeight:0,fontSize:12,marginBottom:0}} value={r.lastName} onChange={function(e){ updateRecipient(idx, { lastName: e.target.value }) }} placeholder="Nom" />
                      </div>
                      <div style={{fontSize:10,color:'#8A8A92',marginTop:4}}>Salutation : <strong style={{color:'#191923'}}>{buildGreeting(r)}</strong></div>
                    </div>
                  )
                })}
                <button type="button" onClick={addRecipient} style={{padding:'4px 12px',borderRadius:6,border:'2px dashed #191923',background:'#FFEB5A',cursor:'pointer',fontWeight:900,fontSize:12,fontFamily:'Arial Narrow, Arial, sans-serif'}}>＋ Ajouter un destinataire</button>
              </div>
              {!filledRecipients.length && <div style={{fontSize:11,color:'#CC0066',fontWeight:900,margin:'-4px 0 8px'}}>Pas d&apos;email sur la fiche — saisis-le pour pouvoir envoyer.</div>}
              <div className="fg"><label className="lbl">Cc (optionnel{recipients.length > 1 ? ' — mis sur le 1er mail seulement' : ''})</label><input className="inp" style={{minHeight:0}} value={cc} onChange={function(e){ setCc(e.target.value) }} /></div>
              <div className="fg"><label className="lbl">Objet</label><input className="inp" style={{minHeight:0}} value={subject} onChange={function(e){ setSubject(e.target.value) }} disabled={loading} /></div>

              {loading && (
                <div style={{textAlign:'center',padding:40,opacity:.55,border:'2px dashed #DDD',borderRadius:8}}>
                  <div style={{fontSize:28,marginBottom:6}}>✉️</div>
                  <div style={{fontWeight:900,fontSize:12}}>Rédaction du pitch…</div>
                </div>
              )}
              {!loading && err && (
                <div style={{padding:12,border:'2px solid #CC0066',borderRadius:8,color:'#CC0066',fontWeight:900,fontSize:12,marginBottom:10}}>{err}</div>
              )}
              {!loading && (
                <div className="fg">
                  <label className="lbl">Message (la signature et les encarts sont ajoutés automatiquement)</label>
                  <div style={{fontSize:10,color:'#8A8A92',margin:'-2px 0 4px'}}>La 1re ligne « Bonjour … , » est réécrite pour chaque destinataire. Jetons possibles : {'{prenom}'} {'{nom}'} {'{civilite}'}</div>
                  <textarea className="inp" value={body} onChange={function(e){ setBody(e.target.value) }} rows={13} style={{width:'100%',fontSize:13,lineHeight:1.65,fontFamily:'Arial, sans-serif'}} />
                </div>
              )}

              <div className="fg">
                <label className="lbl">Encarts</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <button type="button" style={chip(showTv)} onClick={function(){ setShowTv(!showTv) }}>▶ {PRESS_TV.show} · {PRESS_TV.name}</button>
                  <button type="button" style={chip(showRefs)} onClick={function(){ setShowRefs(!showRefs) }}>Références ({REFERENCES.length})</button>
                  <button type="button" style={chip(attachPlaquette)} onClick={function(){ setAttachPlaquette(!attachPlaquette) }}>📎 Plaquette PDF</button>
                </div>
                {!attachPlaquette && /ci-joint|pi[èe]ce jointe|plaquette/i.test(body) && (
                  <div style={{fontSize:11,color:'#CC0066',fontWeight:900,marginTop:6}}>Le texte parle de la plaquette mais elle n&apos;est plus jointe — ajuste le texte ou régénère.</div>
                )}
              </div>
              <div className="fg">
                <label className="lbl">Articles presse (3 max)</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {PRESS_LINKS.map(function(p) {
                    return <button key={p.key} type="button" style={chip(pressKeys.indexOf(p.key) >= 0)} onClick={function(){ togglePress(p.key) }}>{p.name}</button>
                  })}
                </div>
              </div>
              <div style={{fontSize:11,color:'#8A8A92',marginTop:4}}>Envoyé depuis {FROM_EMAIL} au nom de {sender.firstName} — les réponses arrivent sur {REPLY_TO_EMAIL}.</div>
            </div>

            <div className="pem-prev" style={{display: view === 'preview' ? 'block' : 'none'}}>
              <div className="lbl" style={{marginBottom:6}}>Aperçu du mail envoyé{recipients.length > 1 ? ' — pour :' : ''}</div>
              {recipients.length > 1 && (
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                  {recipients.map(function(r, idx) {
                    var label = [r.firstName, r.lastName].filter(Boolean).join(' ') || r.email || ('Destinataire ' + (idx + 1))
                    return <button key={idx} type="button" style={chip(idx === safeIdx)} onClick={function(){ setPreviewIdx(idx) }}>{label}</button>
                  })}
                </div>
              )}
              {previewSubject && <div style={{fontSize:12,marginBottom:6}}><strong>Objet :</strong> {previewSubject}</div>}
              <iframe title="apercu-email" srcDoc={previewHtml} sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" />
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn" onClick={onClose}>Fermer</button>
          <button className="btn" disabled={loading || !body} onClick={copy}>📋 Copier</button>
          <button className="btn btn-p" disabled={loading || sending || !body} onClick={send}>{sending ? '⏳ Envoi…' : (filledRecipients.length > 1 ? '🚀 Envoyer (' + filledRecipients.length + ')' : '🚀 Envoyer')}</button>
        </div>
      </div>
    </div>
  )
}
