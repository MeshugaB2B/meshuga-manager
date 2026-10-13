// ============================================================
// src/lib/prospectCrm.ts  (SERVEUR UNIQUEMENT — service role)
// ============================================================
// CRM prospection : envois Resend, historique, délivrabilité, relances.
//
// Un prospect = (kind, ref) :
//   kind 'crm'    → table prospects (ref = id uuid)
//   kind 'chasse' → table chasse_prospects (ref = id)
//
// Tables : prospect_outreach (1 ligne = 1 message à 1 personne),
//          prospect_followups (relances planifiées, 1 seule « scheduled »),
//          prospect_comments, prospect_crm (état : réponse, adresse KO…).
//
// Séquence par défaut (jours ouvrés) :
//   1er mail ──J+5──▶ relance 1 ──J+7──▶ relance 2 ──J+5──▶ appel (manuel)
//   suivi devis ──J+4──▶ appel (manuel)
//   invitation LinkedIn ──J+5──▶ message LinkedIn (manuel)
//   InMail ──J+7──▶ relance LinkedIn (manuel)
// Les relances email 1 et 2 partent en AUTO si l'interrupteur « Relances
// auto » est activé sur la fiche (prospect_crm.auto_followup), sinon elles
// sont proposées à la date prévue (manuel).
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { buildProspectEmailHtml, buildProspectEmailText, getSender, sanitizePressKeys, personalizeBody, personalizeText, FROM_EMAIL, REPLY_TO_EMAIL, PLAQUETTE } from '@/lib/prospectEmail'

export function getServiceClient(): any {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

// ---------- Dates ----------
export function todayParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function addBusinessDays(fromYmd: string, n: number): string {
  var parts = String(fromYmd || todayParis()).slice(0, 10).split('-')
  var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])))
  var added = 0
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1)
    var wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

function frDate(ymd: string): string {
  var p = String(ymd || '').slice(0, 10).split('-')
  return p.length === 3 ? p[2] + '/' + p[1] : ymd
}

// ---------- Mails de prospection ----------
// Les pitchs partent de « <Prénom> · Meshuga Events <events@…> » ; les devis /
// factures de « Meshuga Events <events@…> ». Le « · » permet de les distinguer.
export function isProspectionFrom(from: any): boolean {
  var f = String(from || '')
  return f.toLowerCase().indexOf(FROM_EMAIL) >= 0 && /·\s*Meshuga Events/i.test(f)
}

// Un lead « Prospection » envoyé au CRM existe deux fois (chasse_prospects + prospects.chasse_id).
export async function linkedRefs(sb: any, kind: string, ref: string): Promise<any[]> {
  var out: any[] = []
  if (kind === 'crm') {
    var r = await sb.from('prospects').select('chasse_id').eq('id', ref).maybeSingle()
    if (r.data && r.data.chasse_id) out.push({ kind: 'chasse', ref: String(r.data.chasse_id) })
  } else {
    var r2 = await sb.from('prospects').select('id').eq('chasse_id', ref)
    ;(r2.data || []).forEach(function (x: any) { out.push({ kind: 'crm', ref: String(x.id) }) })
  }
  return out
}

export async function cancelScheduled(sb: any, kind: string, ref: string, reason: string) {
  return sb.from('prospect_followups').update({ status: 'cancelled', status_detail: reason, executed_at: new Date().toISOString() })
    .eq('prospect_kind', kind).eq('prospect_ref', ref).eq('status', 'scheduled')
}

// ---------- Statuts de délivrabilité ----------
export var BAD_STATUSES = ['bounced', 'complained', 'failed']
var RANK: any = { logged: 0, sent: 1, delivery_delayed: 2, delivered: 3, opened: 4, clicked: 5 }

export function mergeStatus(cur: string, next: string): string {
  if (!next) return cur
  if (!cur) return next
  var curBad = BAD_STATUSES.indexOf(cur) >= 0
  var nextBad = BAD_STATUSES.indexOf(next) >= 0
  if (nextBad) return next
  if (curBad) return cur
  return (RANK[next] || 0) > (RANK[cur] || 0) ? next : cur
}

export function eventTypeToStatus(type: string): string {
  var t = String(type || '').replace(/^email\./, '')
  if (t === 'sent' || t === 'queued' || t === 'scheduled') return 'sent'
  if (t === 'delivered') return 'delivered'
  if (t === 'delivery_delayed') return 'delivery_delayed'
  if (t === 'opened') return 'opened'
  if (t === 'clicked') return 'clicked'
  if (t === 'bounced') return 'bounced'
  if (t === 'complained') return 'complained'
  if (t === 'failed' || t === 'canceled' || t === 'cancelled') return 'failed'
  return ''
}

// ---------- Plan de relance ----------
export function planNext(channel: string, emailType: string, step: number): any {
  if (channel === 'email' && emailType === 'first') return { days: 5, channel: 'email', email_type: 'relance', step: 1, autoEligible: true }
  if (channel === 'email' && emailType === 'relance' && step <= 1) return { days: 7, channel: 'email', email_type: 'relance', step: 2, autoEligible: true }
  if (channel === 'email' && emailType === 'relance') return { days: 5, channel: 'phone', email_type: 'call', step: step + 1, autoEligible: false }
  if (channel === 'email' && emailType === 'devis_relance') return { days: 4, channel: 'phone', email_type: 'call', step: 1, autoEligible: false }
  if (channel === 'linkedin' && emailType === 'linkedin_invite') return { days: 5, channel: 'linkedin', email_type: 'linkedin_message', step: 1, autoEligible: false }
  if (channel === 'linkedin' && emailType === 'linkedin_inmail') return { days: 7, channel: 'linkedin', email_type: 'linkedin_message', step: 1, autoEligible: false }
  return null
}

export function followupLabel(f: any): string {
  if (!f) return ''
  if (f.channel === 'phone') return 'Appeler (après relances email)'
  if (f.channel === 'linkedin') return 'Relance LinkedIn'
  if (f.email_type === 'devis_relance') return 'Relance devis'
  return (f.mode === 'auto' ? 'Relance email auto' : 'Relance email') + (f.step ? ' n°' + f.step : '')
}

// ---------- Prospects ----------
export async function loadProspect(sb: any, kind: string, ref: string): Promise<any> {
  if (kind === 'crm') {
    var r = await sb.from('prospects').select('*').eq('id', ref).maybeSingle()
    var x = r.data
    if (!x) return null
    return {
      kind: 'crm', id: x.id, name: x.company_name || '', status: x.status || 'to_contact',
      category: x.category || x.sector || '', size: x.company_size || '', city: x.city || '',
      arrondissement: x.arrondissement || '', contactFirstName: x.contact_first_name || '',
      contactLastName: x.contact_last_name || '', contactRole: x.contact_title || '',
      contactEmail: x.contact_email || '', email: x.email || '', notes: x.notes || '', chasseId: x.chasse_id || null
    }
  }
  var c = await sb.from('chasse_prospects').select('*').eq('id', ref).maybeSingle()
  var y = c.data
  if (!y) return null
  var nameParts = String(y.contact_name && y.contact_name !== '—' ? y.contact_name : '').trim().split(/\s+/)
  return {
    kind: 'chasse', id: y.id, name: y.name || '', status: y.status || 'to_contact',
    cat: y.cat || '', type: y.type || '', taille: y.taille || '', arr: y.arr || '',
    contact_name: y.contact_name || '', contact_role: y.contact_role || '',
    contactFirstName: nameParts[0] || '', contactLastName: nameParts.slice(1).join(' '),
    contactRole: y.contact_role && y.contact_role !== '—' ? y.contact_role : '',
    contactEmail: y.contact_email && y.contact_email !== '—' ? y.contact_email : '',
    notes: y.notes || '', pitch: y.pitch || '', contacted_at: y.contacted_at || null
  }
}

export async function getCrmState(sb: any, kind: string, ref: string): Promise<any> {
  var r = await sb.from('prospect_crm').select('*').eq('prospect_kind', kind).eq('prospect_ref', ref).maybeSingle()
  return r.data || { prospect_kind: kind, prospect_ref: ref, auto_followup: false, email_invalid: false, do_not_contact: false }
}

export async function upsertCrmState(sb: any, kind: string, ref: string, patch: any) {
  var row = Object.assign({ prospect_kind: kind, prospect_ref: ref, updated_at: new Date().toISOString() }, patch)
  return sb.from('prospect_crm').upsert(row, { onConflict: 'prospect_kind,prospect_ref' })
}

// Met à jour les champs « prochaine action » existants pour que les
// priorités du CRM et les cartes Prospection affichent la relance.
async function syncProspectNextAction(sb: any, kind: string, ref: string, f: any, extra: any) {
  var nowIso = new Date().toISOString()
  if (kind === 'crm') {
    var patch: any = Object.assign({ updated_at: nowIso }, extra || {})
    if (f) { patch.next_action = followupLabel(f); patch.next_action_date = f.due_date }
    await sb.from('prospects').update(patch).eq('id', ref)
  } else {
    var patch2: any = Object.assign({ updated_at: nowIso }, extra || {})
    if (f) patch2.relance_date = f.due_date
    await sb.from('chasse_prospects').update(patch2).eq('id', ref)
  }
}

// ---------- Envoi Resend ----------
export async function sendProspectEmails(opts: any): Promise<any> {
  var resend = new Resend(process.env.RESEND_API_KEY || '')
  var sender = getSender(opts.senderKey)
  var recipients = opts.recipients || []
  var cc = String(opts.cc || '').trim().toLowerCase()
  var common = {
    baseUrl: opts.origin,
    senderKey: opts.senderKey,
    pressKeys: sanitizePressKeys(opts.pressKeys),
    showReferences: opts.showReferences !== false,
    showTv: opts.showTv !== false,
    attachPlaquette: opts.attachPlaquette !== false
  }
  var fileBase = (process.env.NEXT_PUBLIC_APP_URL || 'https://meshuga-manager.vercel.app').replace(/\/$/, '')
  var sent: any[] = []
  var failed: any[] = []
  for (var k = 0; k < recipients.length; k++) {
    var r = recipients[k]
    var subj = personalizeText(opts.subject, r).trim() || opts.subject
    var bodyP = personalizeBody(opts.body, r)
    var o = Object.assign({}, common, { subject: subj, body: bodyP })
    var payload: any = {
      from: sender.firstName + ' · Meshuga Events <' + FROM_EMAIL + '>',
      to: [r.email],
      subject: subj,
      html: buildProspectEmailHtml(o),
      text: buildProspectEmailText(o),
      reply_to: REPLY_TO_EMAIL,
      tags: [{ name: 'source', value: 'prospection' }]
    }
    var withCc = k === 0 && cc && cc !== r.email
    if (withCc) payload.cc = [cc]
    if (o.attachPlaquette) payload.attachments = [{ filename: PLAQUETTE.filename, path: fileBase + PLAQUETTE.path }]
    if (r.email !== REPLY_TO_EMAIL && !(withCc && cc === REPLY_TO_EMAIL)) payload.bcc = [REPLY_TO_EMAIL]
    if (k > 0) await new Promise(function (res) { setTimeout(res, 600) })
    try {
      var res: any = await resend.emails.send(payload)
      if (res && res.error) failed.push({ email: r.email, error: res.error.message || JSON.stringify(res.error) })
      else sent.push({ email: r.email, id: res && res.data ? res.data.id : null, subject: subj, body: bodyP, recipient: r })
    } catch (e: any) {
      failed.push({ email: r.email, error: e && e.message ? e.message : 'inconnue' })
    }
  }
  return { sent: sent, failed: failed }
}

// ---------- Enregistrement d'une prise de contact ----------
// opts : { kind, ref, name, channel, emailType, senderKey, sentMode, createdBy,
//          items: [{ resendId?, to?, firstName?, lastName?, civility?, subject?, body?, status? }],
//          skipSchedule? }
export async function recordContact(sb: any, opts: any): Promise<any> {
  var kind = opts.kind
  var ref = String(opts.ref)
  var channel = opts.channel || 'email'
  var emailType = opts.emailType || 'first'
  var nowIso = new Date().toISOString()
  var rows = (opts.items || []).map(function (it: any) {
    return {
      prospect_kind: kind, prospect_ref: ref, prospect_name: opts.name || null,
      channel: channel, email_type: emailType, sender_key: opts.senderKey || null,
      sent_mode: opts.sentMode || 'manual', resend_id: it.resendId || null,
      to_email: it.to ? String(it.to).toLowerCase() : null,
      to_first_name: it.firstName || null, to_last_name: it.lastName || null, to_civility: it.civility || null,
      subject: it.subject || null, body: it.body || null,
      status: it.status || (channel === 'email' ? 'sent' : 'logged'),
      sent_at: nowIso, last_event_at: nowIso
    }
  })
  var ins = rows.length ? await sb.from('prospect_outreach').insert(rows).select('id') : { data: [] }
  if (ins.error) throw new Error('prospect_outreach : ' + ins.error.message)
  var firstId = ins.data && ins.data[0] ? ins.data[0].id : null

  // Étape de relance = nb de relances email déjà envoyées
  var step = 0
  if (channel === 'email' && emailType === 'relance') {
    var cnt = await sb.from('prospect_outreach').select('id', { count: 'exact', head: true })
      .eq('prospect_kind', kind).eq('prospect_ref', ref).eq('channel', 'email').eq('email_type', 'relance')
    step = cnt.count || 1
  }

  // Clôture de la relance prévue
  await sb.from('prospect_followups').update({
    status: opts.sentMode === 'auto' ? 'sent' : 'done', executed_at: nowIso, outreach_id: firstId
  }).eq('prospect_kind', kind).eq('prospect_ref', ref).eq('status', 'scheduled')

  // Le suivi d'un lead passé au CRM se fait dans la fiche CRM : on coupe les relances côté Prospection
  if (kind === 'crm') {
    var links = await linkedRefs(sb, kind, ref)
    for (var li = 0; li < links.length; li++) await cancelScheduled(sb, links[li].kind, links[li].ref, 'Suivi repris dans la fiche CRM')
  }

  // Prochaine relance
  var next: any = null
  var state = await getCrmState(sb, kind, ref)
  var plan = opts.skipSchedule ? null : planNext(channel, emailType, step)
  if (plan && !state.do_not_contact && !state.replied_at) {
    next = {
      prospect_kind: kind, prospect_ref: ref, prospect_name: opts.name || null,
      due_date: addBusinessDays(todayParis(), plan.days),
      mode: plan.autoEligible && state.auto_followup ? 'auto' : 'manual',
      channel: plan.channel, email_type: plan.email_type, step: plan.step,
      sender_key: opts.senderKey || null, created_by: opts.createdBy || 'system', status: 'scheduled'
    }
    var nf = await sb.from('prospect_followups').insert(next).select('*').single()
    if (nf.data) next = nf.data
  }

  // Statut prospect + champs « prochaine action »
  var p = await loadProspect(sb, kind, ref)
  var newStatus: any = null
  var extra: any = {}
  if (p && (!p.status || p.status === 'to_contact')) { extra.status = 'contacted'; newStatus = 'contacted' }
  var what = channel === 'linkedin' ? 'LinkedIn' : (emailType === 'relance' ? 'Relance' : (emailType === 'devis_relance' ? 'Suivi devis' : 'Email'))
  if (kind === 'crm') {
    extra.last_contacted_at = nowIso
  } else {
    extra.last_action = what + ' envoyé' + (opts.sentMode === 'auto' ? ' (auto)' : '') + ' le ' + frDate(todayParis())
    if (p && !p.contacted_at) extra.contacted_at = nowIso
  }
  await syncProspectNextAction(sb, kind, ref, next, extra)

  return { outreachIds: (ins.data || []).map(function (x: any) { return x.id }), next: next, newStatus: newStatus, sentAt: nowIso }
}

// ---------- Événements de délivrabilité ----------
// Applique un nouveau statut à une ligne prospect_outreach et gère les
// effets de bord (adresse invalide, relances annulées, alerte).
export async function applyStatus(sb: any, row: any, status: string, info: any): Promise<boolean> {
  if (!row || !status) return false
  var merged = mergeStatus(row.status, status)
  var at = (info && info.at) || new Date().toISOString()
  var patch: any = { last_event_at: at }
  if (merged !== row.status) patch.status = merged
  if (status === 'delivered' && !row.delivered_at) patch.delivered_at = at
  if ((status === 'opened' || status === 'clicked') && !row.opened_at) patch.opened_at = at
  if (status === 'clicked' && !row.clicked_at) patch.clicked_at = at
  if (info && info.countEvent && status === 'opened') patch.open_count = (row.open_count || 0) + 1
  if (info && info.countEvent && status === 'clicked') patch.click_count = (row.click_count || 0) + 1
  if (status === 'bounced' && !row.bounced_at) patch.bounced_at = at
  if (status === 'complained' && !row.complained_at) patch.complained_at = at
  if (info && info.detail && BAD_STATUSES.indexOf(status) >= 0) patch.status_detail = String(info.detail).slice(0, 500)
  await sb.from('prospect_outreach').update(patch).eq('id', row.id)

  var becameBad = BAD_STATUSES.indexOf(merged) >= 0 && BAD_STATUSES.indexOf(row.status) < 0
  var newComplaint = merged === 'complained' && row.status !== 'complained'
  if ((becameBad || newComplaint) && !(info && info.quiet)) await onBadDelivery(sb, row, merged, info || {})
  return merged !== row.status
}

export async function onBadDelivery(sb: any, row: any, status: string, info: any) {
  var kind = row.prospect_kind
  var ref = row.prospect_ref
  var today = todayParis()
  var transient = String(info.bounceType || '').toLowerCase() === 'transient'
  var label = status === 'complained' ? 'signalé comme spam' : (status === 'failed' ? 'non envoyé' : (transient ? 'rejet temporaire' : 'adresse rejetée'))
  var reason = (row.to_email || '') + ' — ' + label + (info.detail ? ' (' + String(info.detail).slice(0, 160) + ')' : '')

  if (status === 'complained') {
    await upsertCrmState(sb, kind, ref, { do_not_contact: true, email_invalid_reason: reason })
  } else if (!transient) {
    await upsertCrmState(sb, kind, ref, { email_invalid: true, email_invalid_reason: reason })
  }

  // Relances email prévues : annulées. Si pas un spam → tâche manuelle « trouver une autre adresse ».
  await sb.from('prospect_followups').update({ status: 'cancelled', status_detail: 'Email ' + label, executed_at: new Date().toISOString() })
    .eq('prospect_kind', kind).eq('prospect_ref', ref).eq('status', 'scheduled')
  var fix: any = null
  if (status !== 'complained') {
    var ins = await sb.from('prospect_followups').insert({
      prospect_kind: kind, prospect_ref: ref, prospect_name: row.prospect_name || null,
      due_date: today, mode: 'manual', channel: transient ? 'email' : 'phone',
      email_type: transient ? 'relance' : 'call', step: 0, status: 'scheduled', created_by: 'resend',
      status_detail: transient ? 'Réessayer l’envoi' : 'Trouver une autre adresse (appel / LinkedIn)'
    }).select('*').single()
    fix = ins.data
  }
  if (kind === 'crm') {
    var p1: any = { updated_at: new Date().toISOString() }
    if (fix) { p1.next_action = '⚠️ Email ' + label + ' — ' + (transient ? 'réessayer' : 'trouver une autre adresse'); p1.next_action_date = today }
    await sb.from('prospects').update(p1).eq('id', ref)
  } else {
    await sb.from('chasse_prospects').update({ last_action: '⚠️ Email ' + label + ' le ' + frDate(today), relance_date: fix ? today : null, updated_at: new Date().toISOString() }).eq('id', ref)
  }
  try {
    await sb.from('activity_log').insert({
      user_role: 'system', user_name: 'Resend', type: 'email_' + status,
      description: '⚠️ Email ' + label + ' : ' + (row.prospect_name || '') + ' (' + (row.to_email || '') + ')',
      prospect_name: row.prospect_name || null, email_content: info.detail ? String(info.detail).slice(0, 500) : null
    })
  } catch (e) { /* best effort */ }
}

// ---------- Synchronisation avec Resend (filet de sécurité + import) ----------
// Parcourt les mails envoyés par events@ sur Resend :
//  - met à jour le statut des mails déjà suivis
//  - importe les anciens mails (avant ce module) en les rattachant au
//    prospect via l'adresse du destinataire, et propose une relance.
export async function syncFromResend(sb: any, opts: any): Promise<any> {
  var key = process.env.RESEND_API_KEY || ''
  if (!key) throw new Error('RESEND_API_KEY manquante')
  var sinceDays = (opts && opts.sinceDays) || 90
  var maxPages = (opts && opts.maxPages) || 10
  var since = Date.now() - sinceDays * 86400000
  var stats = { scanned: 0, updated: 0, imported: 0, unmatched: 0, proposals: 0 }

  // Index des prospects par email
  var byEmail: any = {}
  var pr = await sb.from('prospects').select('id, company_name, email, contact_email, chasse_id')
  ;(pr.data || []).forEach(function (x: any) {
    ;[x.contact_email, x.email].forEach(function (e: any) {
      var k = String(e || '').trim().toLowerCase()
      if (k && k.indexOf('@') > 0 && !byEmail[k]) byEmail[k] = { kind: 'crm', ref: String(x.id), name: x.company_name }
    })
  })
  var ch = await sb.from('chasse_prospects').select('id, name, contact_email')
  ;(ch.data || []).forEach(function (x: any) {
    var k = String(x.contact_email || '').trim().toLowerCase()
    if (k && k.indexOf('@') > 0 && !byEmail[k]) byEmail[k] = { kind: 'chasse', ref: String(x.id), name: x.name }
  })

  var after = ''
  var touched: any = {}
  for (var page = 0; page < maxPages; page++) {
    var url = 'https://api.resend.com/emails?limit=100' + (after ? '&after=' + encodeURIComponent(after) : '')
    var res = await fetch(url, { headers: { Authorization: 'Bearer ' + key } })
    if (!res.ok) throw new Error('Resend list ' + res.status + ' : ' + (await res.text()).slice(0, 200))
    var json: any = await res.json()
    var list = (json && json.data) || []
    var stop = false
    for (var i = 0; i < list.length; i++) {
      var em = list[i]
      var created = Date.parse(String(em.created_at || '').replace(' ', 'T').replace(/\+00$/, 'Z'))
      if (created && created < since) { stop = true; break }
      if (!isProspectionFrom(em.from)) continue
      stats.scanned++
      var status = eventTypeToStatus(em.last_event)
      var ex = await sb.from('prospect_outreach').select('*').eq('resend_id', em.id).maybeSingle()
      if (ex.data) {
        if (status && mergeStatus(ex.data.status, status) !== ex.data.status) {
          await applyStatus(sb, ex.data, status, { at: new Date().toISOString(), detail: status === 'bounced' ? 'Rejet constaté via Resend' : '' })
          stats.updated++
        }
        continue
      }
      var to = String((em.to && em.to[0]) || '').toLowerCase()
      var match = byEmail[to]
      if (!match) { stats.unmatched++; continue }
      var sentIso = created ? new Date(created).toISOString() : new Date().toISOString()
      var subj = String(em.subject || '')
      var row: any = {
        prospect_kind: match.kind, prospect_ref: match.ref, prospect_name: match.name || null,
        channel: 'email', email_type: /^re\s*:/i.test(subj) ? 'relance' : 'first', sent_mode: 'import',
        resend_id: em.id, to_email: to, subject: subj || null, status: 'sent', sent_at: sentIso, last_event_at: sentIso
      }
      var ins = await sb.from('prospect_outreach').insert(row).select('*').single()
      if (ins.error || !ins.data) continue
      stats.imported++
      touched[match.kind + '|' + match.ref] = match
      // Historique : on pose le statut sans effets de bord (traités plus bas, une fois par prospect)
      if (status && status !== 'sent') await applyStatus(sb, ins.data, status, { at: sentIso, quiet: true, detail: status === 'bounced' ? 'Rejet constaté via Resend (historique)' : '' })
    }
    if (stop || !json.has_more || !list.length) break
    after = list[list.length - 1].id
  }

  // Prospects importés : si leur DERNIER mail a été rejeté → alerte « adresse rejetée » ;
  // sinon, s'ils n'ont jamais eu de relance → on en propose une (manuelle).
  var keys = Object.keys(touched)
  for (var j = 0; j < keys.length; j++) {
    var m = touched[keys[j]]
    var latest = await sb.from('prospect_outreach').select('*').eq('prospect_kind', m.kind).eq('prospect_ref', m.ref).eq('channel', 'email').order('sent_at', { ascending: false }).limit(1)
    var lt = latest.data && latest.data[0]
    if (lt && BAD_STATUSES.indexOf(lt.status) >= 0) {
      var st0 = await getCrmState(sb, m.kind, m.ref)
      if (!st0.email_invalid && !st0.do_not_contact) {
        await onBadDelivery(sb, lt, lt.status, { detail: lt.status_detail || 'Rejet constaté via Resend (historique)' })
        stats.updated++
      }
      continue
    }
    var has = await sb.from('prospect_followups').select('id', { count: 'exact', head: true }).eq('prospect_kind', m.kind).eq('prospect_ref', m.ref)
    if (has.count) continue
    var st = await getCrmState(sb, m.kind, m.ref)
    if (st.email_invalid || st.do_not_contact || st.replied_at) continue
    var last = await sb.from('prospect_outreach').select('*').eq('prospect_kind', m.kind).eq('prospect_ref', m.ref).eq('channel', 'email').order('sent_at', { ascending: false }).limit(1)
    var l = last.data && last.data[0]
    if (!l || BAD_STATUSES.indexOf(l.status) >= 0) continue
    var p = await loadProspect(sb, m.kind, m.ref)
    if (!p || p.status === 'won' || p.status === 'lost' || p.status === 'nego') continue
    var cntR = await sb.from('prospect_outreach').select('id', { count: 'exact', head: true }).eq('prospect_kind', m.kind).eq('prospect_ref', m.ref).eq('channel', 'email').eq('email_type', 'relance')
    var plan = planNext('email', (cntR.count || 0) > 0 ? 'relance' : 'first', cntR.count || 0)
    if (!plan) continue
    var due = addBusinessDays(String(l.sent_at).slice(0, 10), plan.days)
    if (due < todayParis()) due = todayParis()
    var f: any = { prospect_kind: m.kind, prospect_ref: m.ref, prospect_name: m.name || null, due_date: due, mode: 'manual', channel: plan.channel, email_type: plan.email_type, step: plan.step, status: 'scheduled', created_by: 'import' }
    var fi = await sb.from('prospect_followups').insert(f).select('*').single()
    if (fi.data) { stats.proposals++; await syncProspectNextAction(sb, m.kind, m.ref, fi.data, null) }
  }
  return stats
}
