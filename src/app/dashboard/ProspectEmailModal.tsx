'use client'

// ============================================================
// ProspectEmailModal — pitch IA prospect : génération, édition,
// aperçu fidèle (même builder que l'envoi) et envoi en 1 clic.
// ============================================================

import { useState, useEffect } from 'react'
import { PRESS_LINKS, PRESS_TV, REFERENCES, EMAIL_TYPES, FROM_EMAIL, REPLY_TO_EMAIL, buildProspectEmailHtml, cleanEmail, isValidEmail, getSender } from '@/lib/prospectEmail'

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
  var [to, setTo] = useState(initialTo)
  var [cc, setCc] = useState('')
  var [subject, setSubject] = useState('')
  var [body, setBody] = useState('')
  var [pressKeys, setPressKeys] = useState([] as any)
  var [showRefs, setShowRefs] = useState(true)
  var [showTv, setShowTv] = useState(true)
  var [view, setView] = useState('edit')
  var [sending, setSending] = useState(false)

  var generate = function(type, sKey) {
    setLoading(true)
    setErr('')
    fetch('/api/generate-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect: prospect, emailType: type, senderKey: sKey })
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

  var baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://dashboard.meshuga.fr'
  var previewHtml = buildProspectEmailHtml({
    baseUrl: baseUrl, senderKey: senderKey, subject: subject, body: body,
    pressKeys: pressKeys, showReferences: showRefs, showTv: showTv
  })

  var send = function() {
    var dest = String(to || '').trim()
    if (!isValidEmail(dest)) { toast('Adresse email invalide'); return }
    if (!subject.trim()) { toast('Objet manquant'); return }
    if (body.trim().length < 20) { toast('Le message est trop court'); return }
    if (!window.confirm('Envoyer ce mail à ' + dest + ' ?')) return
    setSending(true)
    fetch('/api/prospect-email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: dest, cc: cc.trim(), subject: subject.trim(), body: body,
        senderKey: senderKey, pressKeys: pressKeys, showReferences: showRefs, showTv: showTv,
        prospectId: isCrm ? prospect.id : null, prospectName: prospect.name || ''
      })
    }).then(function(r) { return r.json() })
      .then(function(d) {
        setSending(false)
        if (!d || !d.ok) { toast('Échec envoi : ' + ((d && d.error) || 'erreur')); return }
        logActivity('email_envoye', 'Email envoyé à ' + (prospect.name || dest) + ' (' + dest + ')', prospect.name || '', subject)
        if (isCrm && setProspects) {
          setProspects(function(prev) {
            return prev.map(function(x) {
              if (String(x.id) !== String(prospect.id)) return x
              return Object.assign({}, x, { last_contacted_at: d.sentAt }, d.newStatus ? { status: d.newStatus } : {})
            })
          })
        }
        toast('Email envoyé ✓')
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div className="fg"><label className="lbl">À</label><input className="inp" style={{minHeight:0}} value={to} onChange={function(e){ setTo(e.target.value) }} placeholder="contact@entreprise.fr" /></div>
                <div className="fg"><label className="lbl">Cc (optionnel)</label><input className="inp" style={{minHeight:0}} value={cc} onChange={function(e){ setCc(e.target.value) }} /></div>
              </div>
              {!to && <div style={{fontSize:11,color:'#CC0066',fontWeight:900,margin:'-4px 0 8px'}}>Pas d&apos;email sur la fiche — saisis-le pour pouvoir envoyer.</div>}
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
                  <textarea className="inp" value={body} onChange={function(e){ setBody(e.target.value) }} rows={13} style={{width:'100%',fontSize:13,lineHeight:1.65,fontFamily:'Arial, sans-serif'}} />
                </div>
              )}

              <div className="fg">
                <label className="lbl">Encarts</label>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  <button type="button" style={chip(showTv)} onClick={function(){ setShowTv(!showTv) }}>▶ {PRESS_TV.show} · {PRESS_TV.name}</button>
                  <button type="button" style={chip(showRefs)} onClick={function(){ setShowRefs(!showRefs) }}>Références ({REFERENCES.length})</button>
                </div>
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
              <div className="lbl" style={{marginBottom:6}}>Aperçu du mail envoyé</div>
              <iframe title="apercu-email" srcDoc={previewHtml} sandbox="allow-popups allow-popups-to-escape-sandbox" />
            </div>
          </div>
        </div>
        <div className="mf">
          <button className="btn" onClick={onClose}>Fermer</button>
          <button className="btn" disabled={loading || !body} onClick={copy}>📋 Copier</button>
          <button className="btn btn-p" disabled={loading || sending || !body} onClick={send}>{sending ? '⏳ Envoi…' : '🚀 Envoyer'}</button>
        </div>
      </div>
    </div>
  )
}
