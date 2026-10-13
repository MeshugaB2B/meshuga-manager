'use client'

// =============================================================================
// ProspectCrmPanel — le « vrai CRM » de chaque fiche prospect
//
//  1. Bandeau : 1er contact · dernier contact · délivrabilité · réponse
//  2. Alertes : adresse rejetée (bounce Resend), spam, « ne plus contacter »
//  3. Prochaine relance : date, canal, expéditeur, mode Manuel / Auto,
//     « Relancer maintenant », « Le prospect a répondu »
//  4. Historique : chaque mail (statut Resend en temps réel), LinkedIn, appels
//  5. LinkedIn : message IA (invitation / InMail / message) → copier → ouvrir
//     le profil → « Marquer comme envoyé » (historisé + relance planifiée)
//  6. Commentaires d'équipe (Edward / Emy)
//
// Props : kind ('crm' | 'chasse'), refId, altRefs? [{kind, ref}], prospect,
//         toast, onRelance(emailType), onChanged?()
// Lecture : Supabase direct (RLS authentifié). Écritures « métier » : /api/prospect-crm.
// =============================================================================

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

var _sb: any = null
function sb() {
  if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  return _sb
}

var ROSE = '#FF82D7'
var JAUNE = '#FFEB5A'
var NOIR = '#191923'
var BLEU = '#005FFF'
var VERT = '#009D3A'
var ROUGE = '#CC0066'
var ORANGE = '#FF6B2B'
var GRIS = '#7A7A85'

var STATUS_UI = {
  sent: { l: 'Envoyé', c: GRIS, i: '📤', t: 'Parti de chez nous, pas encore de confirmation du serveur du destinataire' },
  delivery_delayed: { l: 'Retardé', c: ORANGE, i: '⏳', t: 'Le serveur du destinataire diffère la réception, Resend réessaie' },
  delivered: { l: 'Reçu', c: BLEU, i: '✅', t: 'Accepté par le serveur du destinataire (arrivé dans sa boîte, pas forcément lu)' },
  opened: { l: 'Ouvert', c: VERT, i: '👀', t: 'Ouverture détectée (indicatif : certaines messageries ouvrent automatiquement)' },
  clicked: { l: 'Cliqué', c: VERT, i: '🔗', t: 'Un lien du mail a été cliqué' },
  bounced: { l: 'Rejeté', c: ROUGE, i: '❌', t: 'Adresse refusée par le serveur du destinataire' },
  complained: { l: 'Spam', c: ROUGE, i: '🚫', t: 'Le destinataire a signalé le mail comme spam' },
  failed: { l: 'Échec', c: ROUGE, i: '⚠️', t: 'Le mail n’a pas pu être envoyé' },
  logged: { l: 'Noté', c: GRIS, i: '📝', t: 'Action enregistrée à la main' }
}
var TYPE_LABELS = {
  first: 'Premier contact', relance: 'Relance', devis_relance: 'Suivi devis', import: 'Mail',
  linkedin_invite: 'Invitation LinkedIn', linkedin_inmail: 'InMail LinkedIn', linkedin_message: 'Message LinkedIn', call: 'Appel'
}
var CHANNEL_ICONS = { email: '✉️', linkedin: '💼', phone: '📞' }
var LI_LIMITS = { linkedin_invite: 300, linkedin_inmail: 1900, linkedin_message: 1900 }

function ymd(d) { return d.toISOString().slice(0, 10) }
function todayYmd() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
function addBusinessDays(fromYmd, n) {
  var p = String(fromYmd).split('-')
  var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])))
  var added = 0
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1)
    var wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) added++
  }
  return ymd(d)
}
function fmtDay(s) {
  if (!s) return '—'
  var d = new Date(String(s).length === 10 ? s + 'T12:00:00' : s)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}
function fmtDateTime(s) {
  if (!s) return ''
  var d = new Date(s)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
function daysFromToday(s) {
  if (!s) return null
  var a = new Date(todayYmd() + 'T12:00:00').getTime()
  var b = new Date(String(s).slice(0, 10) + 'T12:00:00').getTime()
  return Math.round((b - a) / 86400000)
}
function whoLabel(k) { return k === 'emy' ? 'Emy' : (k === 'edward' ? 'Edward' : (k === 'auto' ? 'Auto' : (k || ''))) }
function cleanVal(v) { return v && v !== '—' ? String(v) : '' }

export default function ProspectCrmPanel(props) {
  var kind = props.kind === 'chasse' ? 'chasse' : 'crm'
  var refId = String(props.refId || '')
  var altRefs = props.altRefs || []
  var prospect = props.prospect || {}
  var toast = props.toast || function () {}
  var onRelance = props.onRelance || function () {}
  var onChanged = props.onChanged || function () {}
  var pName = prospect.name || ''

  var [loading, setLoading] = useState(true)
  var [missingTables, setMissingTables] = useState(false)
  var [me, setMe] = useState('edward')
  var [outreach, setOutreach] = useState([] as any)
  var [followup, setFollowup] = useState(null as any)
  var [crm, setCrm] = useState({} as any)
  var [comments, setComments] = useState([] as any)
  var [busy, setBusy] = useState('')
  var [openRow, setOpenRow] = useState('')

  // Formulaire relance
  var [fDate, setFDate] = useState('')
  var [fChannel, setFChannel] = useState('email')
  var [fType, setFType] = useState('relance')
  var [fSender, setFSender] = useState('')
  var [fDirty, setFDirty] = useState(false)

  // LinkedIn
  var [liUrl, setLiUrl] = useState('')
  var [liKind, setLiKind] = useState('linkedin_invite')
  var [liSubject, setLiSubject] = useState('')
  var [liBody, setLiBody] = useState('')
  var [liLoading, setLiLoading] = useState(false)

  // Commentaires
  var [newComment, setNewComment] = useState('')

  var refsFilter = [{ kind: kind, ref: refId }].concat(altRefs.filter(function (r) { return r && r.ref }))
  var orExpr = refsFilter.map(function (r) { return 'and(prospect_kind.eq.' + r.kind + ',prospect_ref.eq.' + String(r.ref) + ')' }).join(',')

  var load = function () {
    if (!refId) return
    Promise.all([
      sb().from('prospect_outreach').select('*').or(orExpr).order('sent_at', { ascending: false }),
      sb().from('prospect_followups').select('*').eq('prospect_kind', kind).eq('prospect_ref', refId).eq('status', 'scheduled').maybeSingle(),
      sb().from('prospect_crm').select('*').eq('prospect_kind', kind).eq('prospect_ref', refId).maybeSingle(),
      sb().from('prospect_comments').select('*').or(orExpr).order('created_at', { ascending: false })
    ]).then(function (res) {
      var err = res[0].error || res[1].error || res[2].error || res[3].error
      if (err && /relation|does not exist|schema cache/i.test(String(err.message))) { setMissingTables(true); setLoading(false); return }
      setOutreach(res[0].data || [])
      var f = res[1].data || null
      setFollowup(f)
      setCrm(res[2].data || {})
      setComments(res[3].data || [])
      setLiUrl((res[2].data && res[2].data.linkedin_url) || '')
      if (f) { setFDate(f.due_date); setFChannel(f.channel); setFType(f.email_type); setFSender(f.sender_key || '') }
      else { setFDate(addBusinessDays(todayYmd(), 5)); setFChannel('email'); setFType('relance'); setFSender('') }
      setFDirty(false)
      setLoading(false)
    })
  }

  useEffect(function () {
    sb().auth.getSession().then(function (r) {
      var u = r && r.data && r.data.session ? r.data.session.user : null
      if (!u) return
      sb().from('profiles').select('role').eq('id', u.id).maybeSingle().then(function (r2) {
        if (r2.data && r2.data.role) setMe(r2.data.role === 'emy' ? 'emy' : 'edward')
        else setMe(String(u.email || '').indexOf('emy') >= 0 ? 'emy' : 'edward')
      })
    })
    load()
  }, [refId])

  var api = function (action, payload, label) {
    setBusy(action)
    return sb().auth.getSession().then(function (r) {
      var token = r && r.data && r.data.session ? r.data.session.access_token : ''
      return fetch('/api/prospect-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(Object.assign({ action: action, kind: kind, ref: refId, name: pName }, payload || {}))
      }).then(function (x) { return x.json() })
    }).then(function (d) {
      setBusy('')
      if (!d || !d.ok) { toast('Erreur : ' + ((d && d.error) || 'inconnue')); return null }
      if (label) toast(label)
      load()
      onChanged(d)
      return d
    }).catch(function (e) { setBusy(''); toast('Erreur : ' + String((e && e.message) || e)); return null })
  }

  // ---------- Dérivés ----------
  var emails = outreach.filter(function (o) { return o.channel === 'email' })
  var chrono = outreach.slice().sort(function (a, b) { return a.sent_at < b.sent_at ? -1 : 1 })
  var firstContact = chrono[0] || null
  var lastContact = outreach[0] || null
  var lastEmail = emails[0] || null
  var lastUi = lastEmail ? (STATUS_UI[lastEmail.status] || STATUS_UI.sent) : null
  var openedCount = emails.filter(function (e) { return e.status === 'opened' || e.status === 'clicked' }).length
  var dueIn = followup ? daysFromToday(followup.due_date) : null
  var autoOn = !!crm.auto_followup
  var canAuto = fChannel === 'email' && fType === 'relance' && !crm.email_invalid && !crm.do_not_contact
  var contactEmail = cleanVal(prospect.contactEmail) || cleanVal(prospect.contact_email) || cleanVal(prospect.email)
  var contactPhone = cleanVal(prospect.contactPhone) || cleanVal(prospect.contact_phone) || cleanVal(prospect.phone)
  var fullName = [cleanVal(prospect.contactFirstName), cleanVal(prospect.contactLastName)].filter(Boolean).join(' ') || cleanVal(prospect.contact_name)
  var liSearch = 'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent([fullName, pName].filter(Boolean).join(' '))
  var liLimit = LI_LIMITS[liKind] || 1900

  // ---------- Actions ----------
  var saveFollowup = function (overrideDate) {
    var d = overrideDate || fDate
    if (!d) { toast('Choisis une date'); return }
    api('followup', { due_date: d, mode: autoOn && canAuto ? 'auto' : 'manual', channel: fChannel, email_type: fType, sender_key: fSender || me }, 'Relance planifiée ✓')
  }
  var quickDate = function (n) { var d = addBusinessDays(todayYmd(), n); setFDate(d); setFDirty(true) }
  var toggleAuto = function () {
    if (!autoOn && !window.confirm('Activer les relances AUTOMATIQUES pour ' + (pName || 'ce prospect') + ' ?\n\nÀ la date prévue (9h, jours ouvrés), l’IA rédige la relance et l’envoie dans le même fil, depuis ' + whoLabel(fSender || me) + '.\nMax 2 relances, puis une tâche « appeler ».\nTout s’arrête dès que tu cliques « Le prospect a répondu », s’il passe En négo / Gagné / Perdu, ou si l’adresse est rejetée.')) return
    api('auto', { enabled: !autoOn }, !autoOn ? 'Relances auto activées ✓' : 'Relances auto désactivées')
  }
  var markReplied = function () {
    var note = window.prompt('Le prospect a répondu 🎉\nUn mot sur sa réponse ? (optionnel — sera ajouté aux commentaires)', '')
    if (note === null) return
    api('replied', { note: note }, 'Noté : a répondu ✓ — relances stoppées')
  }
  var relanceNow = function () {
    if (fChannel === 'email') { onRelance(fType === 'devis_relance' ? 'devis_relance' : (emails.length ? 'relance' : 'first')); return }
    if (fChannel === 'linkedin') { setLiKind('linkedin_message'); toast('Génère le message LinkedIn ci-dessous ↓'); return }
    if (contactPhone) window.location.href = 'tel:' + contactPhone.replace(/\s+/g, '')
  }
  var logCall = function () {
    var note = window.prompt('📞 Appel passé — résumé ?', '')
    if (note === null) return
    api('log', { channel: 'phone', emailType: 'call', body: note }, 'Appel noté ✓')
  }
  var saveLiUrl = function () {
    if ((crm.linkedin_url || '') === liUrl.trim()) return
    api('state', { linkedin_url: liUrl.trim() }, 'Profil LinkedIn enregistré ✓')
  }
  var genLinkedin = function (k) {
    setLiKind(k)
    setLiLoading(true)
    var p = Object.assign({}, prospect, { cat: prospect.cat === 'crm' ? '' : prospect.cat, type: prospect.type || prospect.category })
    fetch('/api/generate-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prospect: p, emailType: k, senderKey: me })
    }).then(function (r) { return r.json() }).then(function (d) {
      setLiLoading(false)
      if (!d || d.error) { toast('Erreur IA : ' + ((d && d.error) || '')); return }
      setLiSubject(d.subject || '')
      setLiBody(d.body || '')
    }).catch(function (e) { setLiLoading(false); toast('Erreur : ' + String((e && e.message) || e)) })
  }
  var copyLinkedin = function () {
    var txt = (liKind === 'linkedin_inmail' && liSubject ? liSubject + '\n\n' : '') + liBody
    navigator.clipboard.writeText(txt).then(function () {
      toast('Copié ✓ — colle-le dans LinkedIn')
      var target = liUrl.trim() ? (liUrl.trim().indexOf('http') === 0 ? liUrl.trim() : 'https://' + liUrl.trim()) : liSearch
      window.open(target, '_blank', 'noopener')
    })
  }
  var logLinkedin = function () {
    if (!liBody.trim()) { toast('Génère ou écris le message d’abord'); return }
    api('log', { channel: 'linkedin', emailType: liKind, subject: liSubject, body: liBody }, 'LinkedIn noté ✓ — relance planifiée').then(function (d) {
      if (d) { setLiBody(''); setLiSubject('') }
    })
  }
  var addComment = function () {
    var t = newComment.trim()
    if (!t) return
    setBusy('comment')
    sb().from('prospect_comments').insert({ prospect_kind: kind, prospect_ref: refId, author: me, body: t }).then(function (r) {
      setBusy('')
      if (r.error) { toast('Erreur : ' + r.error.message); return }
      setNewComment('')
      load()
    })
  }
  var delComment = function (c) {
    if (!window.confirm('Supprimer ce commentaire ?')) return
    sb().from('prospect_comments').delete().eq('id', c.id).then(function () { load() })
  }
  var syncResend = function () { api('sync', {}, null).then(function (d) { if (d && d.stats) toast('Resend : ' + d.stats.updated + ' statut(s) mis à jour, ' + d.stats.imported + ' ancien(s) mail(s) importé(s)') }) }

  // ---------- Rendu ----------
  if (!refId) return null
  if (missingTables) {
    return (
      <div style={{ border: '2px dashed ' + ROUGE, borderRadius: 8, padding: 12, fontSize: 12, fontWeight: 700, color: ROUGE }}>
        Le suivi CRM n&apos;est pas encore activé : la migration Supabase « prospect_crm » doit être exécutée.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: 'Arial Narrow, Arial, sans-serif' }}>

      {/* ===== 1. BANDEAU ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 6 }}>
        <Kpi label="1er contact" value={firstContact ? fmtDay(firstContact.sent_at) : 'Jamais'} sub={firstContact ? (TYPE_LABELS[firstContact.email_type] || '') + ' · ' + whoLabel(firstContact.sender_key) : 'Aucun envoi tracé'} />
        <Kpi label="Dernier contact" value={lastContact ? fmtDay(lastContact.sent_at) : '—'} sub={outreach.length + ' prise' + (outreach.length > 1 ? 's' : '') + ' de contact'} />
        <Kpi label="Dernier mail" value={lastUi ? lastUi.i + ' ' + lastUi.l : '—'} color={lastUi ? lastUi.c : null} sub={emails.length ? openedCount + '/' + emails.length + ' ouvert' + (openedCount > 1 ? 's' : '') : 'Pas de mail'} title={lastUi ? lastUi.t : ''} />
        <Kpi label="Réponse" value={crm.replied_at ? '↩️ Oui' : 'Pas encore'} color={crm.replied_at ? VERT : null} sub={crm.replied_at ? fmtDay(crm.replied_at) : ''} />
      </div>

      {loading && <div style={{ fontSize: 11, opacity: 0.5, fontWeight: 700 }}>⏳ Chargement du suivi…</div>}

      {/* ===== 2. ALERTES ===== */}
      {crm.email_invalid && (
        <Alert color={ROUGE} icon="❌" title="Adresse email rejetée" text={(crm.email_invalid_reason || '') + ' — trouve une autre adresse (appel, LinkedIn, site), corrige-la dans la fiche puis clique « Adresse corrigée ».'}
          action="Adresse corrigée" onAction={function () { api('state', { email_invalid: false }, 'OK, on repart sur la nouvelle adresse') }} />
      )}
      {crm.do_not_contact && (
        <Alert color={ROUGE} icon="🚫" title="Ne plus contacter" text={crm.email_invalid_reason || 'Ce prospect ne doit plus recevoir de prospection.'}
          action="Lever le blocage" onAction={function () { if (window.confirm('Lever le blocage « ne plus contacter » ?')) api('state', { do_not_contact: false }, 'Blocage levé') }} />
      )}

      {/* ===== 3. PROCHAINE RELANCE ===== */}
      <Section title="📅 Prochaine relance" right={
        crm.replied_at
          ? <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={function () { api('unreplied', {}, 'Réponse annulée') }}>Annuler « a répondu »</button>
          : <button className="btn btn-sm btn-g" style={{ fontSize: 10, fontWeight: 900 }} disabled={!!busy} onClick={markReplied}>↩️ Le prospect a répondu</button>
      }>
        {crm.replied_at && (
          <div style={{ fontSize: 12, fontWeight: 700, color: VERT, marginBottom: 8 }}>
            🎉 A répondu le {fmtDay(crm.replied_at)}{crm.reply_note ? ' — « ' + crm.reply_note + ' »' : ''}. Les relances sont stoppées.
          </div>
        )}

        {followup ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10, padding: '8px 10px', borderRadius: 6, background: dueIn !== null && dueIn <= 0 ? '#FFF0F7' : '#F7F7F9', border: '2px solid ' + (dueIn !== null && dueIn <= 0 ? ROSE : '#E3E3E8') }}>
            <span style={{ fontSize: 18 }}>{CHANNEL_ICONS[followup.channel] || '📅'}</span>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 900, fontSize: 13 }}>
                {fmtDay(followup.due_date)} · {TYPE_LABELS[followup.email_type] || 'Relance'}{followup.step && followup.channel === 'email' && followup.email_type === 'relance' ? ' n°' + followup.step : ''}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                {dueIn === 0 || dueIn === null ? 'Aujourd’hui' : (dueIn < 0 ? 'En retard de ' + (-dueIn) + ' j' : 'Dans ' + dueIn + ' j')} · par {whoLabel(followup.sender_key)}
                {followup.status_detail ? ' · ' + followup.status_detail : ''}
              </div>
            </div>
            <ModeBadge auto={followup.mode === 'auto'} />
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 700, marginBottom: 10 }}>{crm.replied_at ? 'Aucune relance (le prospect a répondu).' : 'Aucune relance prévue.'}</div>
        )}

        {!crm.replied_at && !crm.do_not_contact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="date" className="inp" value={fDate} onChange={function (e) { setFDate(e.target.value); setFDirty(true) }} style={{ width: 150, fontSize: 12, padding: '5px 8px' }} />
              <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={function () { quickDate(3) }}>+3 j</button>
              <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={function () { quickDate(5) }}>+5 j</button>
              <button className="btn btn-sm" style={{ fontSize: 10 }} onClick={function () { quickDate(10) }}>+10 j</button>
              <span style={{ fontSize: 9, opacity: 0.5 }}>(jours ouvrés)</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <select className="inp" value={fChannel} onChange={function (e) { var c = e.target.value; setFChannel(c); setFType(c === 'email' ? 'relance' : (c === 'phone' ? 'call' : 'linkedin_message')); setFDirty(true) }} style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}>
                <option value="email">✉️ Email</option>
                <option value="linkedin">💼 LinkedIn</option>
                <option value="phone">📞 Appel</option>
              </select>
              {fChannel === 'email' && (
                <select className="inp" value={fType} onChange={function (e) { setFType(e.target.value); setFDirty(true) }} style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}>
                  <option value="relance">Relance</option>
                  <option value="devis_relance">Suivi devis</option>
                </select>
              )}
              <select className="inp" value={fSender || me} onChange={function (e) { setFSender(e.target.value); setFDirty(true) }} style={{ fontSize: 12, padding: '5px 8px', width: 'auto' }}>
                <option value="edward">par Edward</option>
                <option value="emy">par Emy</option>
              </select>
              <button className="btn btn-sm btn-y" style={{ fontSize: 10, fontWeight: 900, opacity: busy ? 0.5 : 1 }} disabled={!!busy} onClick={function () { saveFollowup('') }}>{followup ? (fDirty ? '💾 Enregistrer' : '💾 Replanifier') : '+ Planifier'}</button>
              {followup && <button className="btn btn-sm" style={{ fontSize: 10 }} disabled={!!busy} onClick={function () { if (window.confirm('Annuler la relance prévue ?')) api('cancel_followup', {}, 'Relance annulée') }}>Annuler</button>}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-sm btn-p" style={{ fontSize: 10, fontWeight: 900 }} onClick={relanceNow}>
                {fChannel === 'email' ? '✉️ Relancer maintenant' : (fChannel === 'linkedin' ? '💼 Message LinkedIn' : '📞 Appeler')}
              </button>
              <button className="btn btn-sm" style={{ fontSize: 10 }} disabled={!!busy} onClick={logCall}>📞 Noter un appel</button>
              <label title={canAuto ? '' : 'Possible uniquement pour une relance email (pas un suivi de devis), avec une adresse valide'} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: canAuto || autoOn ? 'pointer' : 'not-allowed', opacity: canAuto || autoOn ? 1 : 0.45, fontSize: 11, fontWeight: 900 }}>
                <span onClick={canAuto || autoOn ? toggleAuto : undefined} style={{ width: 34, height: 18, borderRadius: 10, border: '2px solid ' + NOIR, background: autoOn ? VERT : '#FFFFFF', position: 'relative', display: 'inline-block' }}>
                  <span style={{ position: 'absolute', top: 1, left: autoOn ? 17 : 1, width: 12, height: 12, borderRadius: '50%', background: autoOn ? '#FFFFFF' : NOIR }} />
                </span>
                <span onClick={canAuto || autoOn ? toggleAuto : undefined}>Relances auto {autoOn ? 'ON' : 'OFF'}</span>
              </label>
            </div>
            <div style={{ fontSize: 10, opacity: 0.55, lineHeight: 1.4 }}>
              {autoOn
                ? '🤖 Auto : à la date prévue (9h, jours ouvrés) l’IA rédige et envoie la relance dans le même fil. 2 relances max (J+5 puis J+7 ouvrés), puis une tâche « appeler ». Stop automatique si réponse, négo/gagné/perdu ou adresse rejetée.'
                : '✋ Manuel : la relance remonte dans les priorités du jour à la date prévue ; tu l’envoies en 1 clic (« Relancer maintenant »). Après chaque envoi, la relance suivante est proposée automatiquement.'}
            </div>
          </div>
        )}
      </Section>

      {/* ===== 4. HISTORIQUE ===== */}
      <Section title={'🗂️ Historique (' + outreach.length + ')'} right={<button className="btn btn-sm" style={{ fontSize: 10, opacity: busy === 'sync' ? 0.5 : 1 }} disabled={!!busy} onClick={syncResend}>{busy === 'sync' ? '⏳' : '🔄'} Synchroniser Resend</button>}>
        {outreach.length === 0 && <div style={{ fontSize: 12, opacity: 0.55 }}>Aucune prise de contact tracée{contactEmail ? '' : ' — et pas encore d’email pour ce prospect'}.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {outreach.map(function (o) {
            var ui = STATUS_UI[o.status] || STATUS_UI.sent
            var isOpen = openRow === o.id
            return (
              <div key={o.id} style={{ border: '1.5px solid ' + (o.status === 'bounced' || o.status === 'complained' || o.status === 'failed' ? ROUGE : '#E3E3E8'), borderRadius: 6, padding: '7px 9px', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: o.body || o.status_detail ? 'pointer' : 'default' }} onClick={function () { setOpenRow(isOpen ? '' : o.id) }}>
                  <span style={{ fontSize: 15 }}>{CHANNEL_ICONS[o.channel] || '✉️'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {TYPE_LABELS[o.email_type] || 'Contact'}{o.subject ? ' — ' + o.subject : ''}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>
                      {fmtDateTime(o.sent_at)} · {whoLabel(o.sender_key)}{o.sent_mode === 'auto' ? ' · 🤖 auto' : (o.sent_mode === 'import' ? ' · importé' : '')}{o.to_email ? ' · ' + o.to_email : ''}
                      {o.opened_at ? ' · ouvert ' + fmtDateTime(o.opened_at) + (o.open_count > 1 ? ' (×' + o.open_count + ')' : '') : ''}
                    </div>
                  </div>
                  <span title={ui.t} style={{ fontSize: 10, fontWeight: 900, color: ui.c, border: '1.5px solid ' + ui.c, borderRadius: 10, padding: '2px 7px', whiteSpace: 'nowrap' }}>{ui.i} {ui.l}</span>
                </div>
                {isOpen && (o.status_detail || o.body) && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed #DDD', fontSize: 11, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                    {o.status_detail && <div style={{ color: ROUGE, fontWeight: 700, marginBottom: 4 }}>{o.status_detail}</div>}
                    {o.body}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* ===== 5. LINKEDIN ===== */}
      <Section title="💼 LinkedIn">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <input className="inp" value={liUrl} onChange={function (e) { setLiUrl(e.target.value) }} onBlur={saveLiUrl} placeholder="URL du profil LinkedIn du décideur" style={{ flex: '1 1 220px', fontSize: 12, padding: '5px 8px' }} />
          <a href={liUrl.trim() ? (liUrl.trim().indexOf('http') === 0 ? liUrl.trim() : 'https://' + liUrl.trim()) : liSearch} target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ fontSize: 10, textDecoration: 'none' }}>{liUrl.trim() ? 'Ouvrir le profil ↗' : '🔍 Chercher ' + (fullName || pName) + ' ↗'}</a>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          <button className="btn btn-sm" style={{ fontSize: 10, fontWeight: 900, background: liKind === 'linkedin_invite' ? ROSE : '#FFFFFF', color: liKind === 'linkedin_invite' ? '#FFFFFF' : NOIR }} disabled={liLoading} onClick={function () { genLinkedin('linkedin_invite') }}>✨ Invitation (300 car.)</button>
          <button className="btn btn-sm" style={{ fontSize: 10, fontWeight: 900, background: liKind === 'linkedin_inmail' ? ROSE : '#FFFFFF', color: liKind === 'linkedin_inmail' ? '#FFFFFF' : NOIR }} disabled={liLoading} onClick={function () { genLinkedin('linkedin_inmail') }}>✨ InMail</button>
          <button className="btn btn-sm" style={{ fontSize: 10, fontWeight: 900, background: liKind === 'linkedin_message' ? ROSE : '#FFFFFF', color: liKind === 'linkedin_message' ? '#FFFFFF' : NOIR }} disabled={liLoading} onClick={function () { genLinkedin('linkedin_message') }}>✨ Message (relation)</button>
          {liLoading && <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, alignSelf: 'center' }}>⏳ L’IA écrit…</span>}
        </div>
        {(liBody || liSubject) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {liKind === 'linkedin_inmail' && <input className="inp" value={liSubject} onChange={function (e) { setLiSubject(e.target.value) }} placeholder="Objet de l’InMail" style={{ fontSize: 12, fontWeight: 700 }} />}
            <textarea className="inp" rows={liKind === 'linkedin_invite' ? 4 : 8} value={liBody} onChange={function (e) { setLiBody(e.target.value) }} style={{ fontSize: 12, lineHeight: 1.45 }} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: liBody.length > liLimit ? ROUGE : GRIS }}>{liBody.length}/{liLimit} car.</span>
              <button className="btn btn-sm btn-y" style={{ fontSize: 10, fontWeight: 900, marginLeft: 'auto' }} onClick={copyLinkedin}>📋 Copier + ouvrir LinkedIn</button>
              <button className="btn btn-sm btn-g" style={{ fontSize: 10, fontWeight: 900 }} disabled={!!busy} onClick={logLinkedin}>✓ Marquer comme envoyé</button>
            </div>
          </div>
        )}
      </Section>

      {/* ===== 6. COMMENTAIRES ===== */}
      <Section title={'💬 Commentaires (' + comments.length + ')'}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8 }}>
          <textarea className="inp" rows={2} value={newComment} onChange={function (e) { setNewComment(e.target.value) }} placeholder={'Note pour l’équipe (' + whoLabel(me) + ')… ex : rappeler après le salon, préfère les lunch boxes'} style={{ flex: 1, fontSize: 12 }}
            onKeyDown={function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addComment() }} />
          <button className="btn btn-sm btn-p" style={{ fontSize: 10, fontWeight: 900 }} disabled={busy === 'comment' || !newComment.trim()} onClick={addComment}>Ajouter</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {comments.map(function (c) {
            var col = c.author === 'emy' ? ROSE : JAUNE
            return (
              <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: '50%', border: '2px solid ' + NOIR, background: col, fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.author === 'emy' ? 'Em' : 'Ed'}</span>
                <div style={{ flex: 1, background: '#F7F7F9', borderRadius: 6, padding: '6px 9px' }}>
                  <div style={{ fontSize: 10, opacity: 0.55, fontWeight: 700 }}>{whoLabel(c.author)} · {fmtDateTime(c.created_at)}
                    {c.author === me && <span onClick={function () { delComment(c) }} style={{ marginLeft: 8, cursor: 'pointer', color: ROUGE }}>supprimer</span>}
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

// =============================================================================
// Sous-composants
// =============================================================================

function Section(props) {
  return (
    <div style={{ border: '2px solid ' + NOIR, borderRadius: 8, padding: '10px 12px', background: '#FFFFFF', boxShadow: '2px 2px 0 ' + NOIR }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>{props.title}</div>
        {props.right || null}
      </div>
      {props.children}
    </div>
  )
}

function Kpi(props) {
  return (
    <div title={props.title || ''} style={{ border: '2px solid ' + NOIR, borderRadius: 7, padding: '6px 8px', background: '#FFF7FC' }}>
      <div style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', opacity: 0.55, letterSpacing: 0.3 }}>{props.label}</div>
      <div style={{ fontSize: 14, fontWeight: 900, color: props.color || NOIR, lineHeight: 1.2 }}>{props.value}</div>
      {props.sub ? <div style={{ fontSize: 10, opacity: 0.6 }}>{props.sub}</div> : null}
    </div>
  )
}

function Alert(props) {
  return (
    <div style={{ border: '2px solid ' + props.color, background: '#FFF0F5', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16 }}>{props.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 900, fontSize: 12, color: props.color }}>{props.title}</div>
        <div style={{ fontSize: 11, lineHeight: 1.4 }}>{props.text}</div>
      </div>
      {props.action ? <button className="btn btn-sm" style={{ fontSize: 10, flexShrink: 0 }} onClick={props.onAction}>{props.action}</button> : null}
    </div>
  )
}

function ModeBadge(props) {
  return (
    <span style={{ fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 10, border: '2px solid ' + NOIR, background: props.auto ? VERT : JAUNE, color: props.auto ? '#FFFFFF' : NOIR, whiteSpace: 'nowrap' }}>
      {props.auto ? '🤖 Auto' : '✋ Manuel'}
    </span>
  )
}
