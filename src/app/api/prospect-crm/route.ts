// ============================================================
// src/app/api/prospect-crm/route.ts
// ============================================================
// Actions CRM depuis la fiche prospect (ProspectCrmPanel).
// Authentifié : en-tête Authorization: Bearer <access_token Supabase>.
//
// POST { action, kind: 'crm'|'chasse', ref, name?, ... }
//   log       { channel: 'linkedin'|'phone', emailType, subject?, body?, senderKey? }
//             → historise un message LinkedIn / un appel + planifie la suite
//   replied   { note? }   → le prospect a répondu : stoppe les relances, statut « En négo »
//   unreplied             → annule le « a répondu »
//   followup  { due_date, mode, channel, email_type, sender_key } → (re)planifie la relance
//   cancel_followup       → supprime la relance prévue
//   auto      { enabled } → relances email automatiques on/off pour ce prospect
//   state     { linkedin_url?, email_invalid?, do_not_contact?, owner? }
//   sync                  → synchronise les statuts / l'historique avec Resend
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, recordContact, upsertCrmState, getCrmState, followupLabel, syncFromResend, loadProspect, todayParis, linkedRefs, cancelScheduled } from '@/lib/prospectCrm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function bad(msg: string, status?: number) {
  return NextResponse.json({ ok: false, error: msg }, { status: status || 400 })
}

async function currentUser(sb: any, req: NextRequest) {
  var h = req.headers.get('authorization') || ''
  var token = h.indexOf('Bearer ') === 0 ? h.slice(7) : ''
  if (!token) return null
  var u = await sb.auth.getUser(token)
  if (!u || !u.data || !u.data.user) return null
  var user = u.data.user
  var who = 'edward'
  try {
    var pr = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (pr.data && pr.data.role === 'emy') who = 'emy'
    else if (!pr.data && String(user.email || '').toLowerCase().indexOf('emy') >= 0) who = 'emy'
  } catch (e) { /* défaut edward */ }
  return { id: user.id, email: user.email, who: who }
}

// Ce qui a changé côté fiche (pour que l'onglet « Infos » ne réécrive pas d'anciennes valeurs)
function prospectPatch(f: any, status: any) {
  var p: any = f ? { nextAction: followupLabel(f), nextDate: f.due_date } : { nextDate: '' }
  if (status) p.status = status
  return p
}

async function setNextAction(sb: any, kind: string, ref: string, f: any) {
  var nowIso = new Date().toISOString()
  if (kind === 'crm') {
    await sb.from('prospects').update(f ? { next_action: followupLabel(f), next_action_date: f.due_date, updated_at: nowIso } : { next_action_date: null, updated_at: nowIso }).eq('id', ref)
  } else {
    await sb.from('chasse_prospects').update({ relance_date: f ? f.due_date : null, updated_at: nowIso }).eq('id', ref)
  }
}

export async function POST(req: NextRequest) {
  var sb = getServiceClient()
  if (!sb) return bad('Supabase non configuré', 500)
  var user = await currentUser(sb, req)
  if (!user) return bad('Non authentifié', 401)

  var b: any
  try { b = await req.json() } catch (e) { return bad('JSON invalide') }
  var action = String((b && b.action) || '')
  var kind = b && b.kind === 'chasse' ? 'chasse' : 'crm'
  var ref = String((b && b.ref) || '')
  var name = String((b && b.name) || '')
  if (action !== 'sync' && !ref) return bad('Prospect manquant')

  try {
    if (action === 'sync') {
      var stats = await syncFromResend(sb, { sinceDays: Number(b.sinceDays) || 90, maxPages: 10 })
      return NextResponse.json({ ok: true, stats: stats })
    }

    if (action === 'log') {
      var channel = b.channel === 'phone' ? 'phone' : 'linkedin'
      var types = ['linkedin_invite', 'linkedin_inmail', 'linkedin_message', 'call']
      var et = types.indexOf(String(b.emailType)) >= 0 ? String(b.emailType) : (channel === 'phone' ? 'call' : 'linkedin_message')
      var rec = await recordContact(sb, {
        kind: kind, ref: ref, name: name, channel: channel, emailType: et,
        senderKey: b.senderKey === 'emy' ? 'emy' : (b.senderKey === 'edward' ? 'edward' : user.who),
        sentMode: 'manual', createdBy: user.who,
        items: [{ subject: String(b.subject || '').slice(0, 300), body: String(b.body || '').slice(0, 4000), status: 'logged' }]
      })
      return NextResponse.json({ ok: true, next: rec.next, newStatus: rec.newStatus, prospectPatch: prospectPatch(rec.next, rec.newStatus) })
    }

    if (action === 'replied') {
      var nowIso = new Date().toISOString()
      await upsertCrmState(sb, kind, ref, { replied_at: nowIso, reply_note: String(b.note || '').slice(0, 1000) || null })
      await cancelScheduled(sb, kind, ref, 'Le prospect a répondu')
      var lk = await linkedRefs(sb, kind, ref)
      for (var i = 0; i < lk.length; i++) {
        await upsertCrmState(sb, lk[i].kind, lk[i].ref, { replied_at: nowIso })
        await cancelScheduled(sb, lk[i].kind, lk[i].ref, 'Le prospect a répondu')
      }
      var p = await loadProspect(sb, kind, ref)
      var promote = p && (p.status === 'to_contact' || p.status === 'contacted')
      if (kind === 'crm') {
        var patch: any = { next_action: 'Répondre / proposer une dégustation', next_action_date: todayParis(), last_contacted_at: nowIso, updated_at: nowIso }
        if (promote) patch.status = 'nego'
        await sb.from('prospects').update(patch).eq('id', ref)
      } else {
        var patch2: any = { last_action: 'A répondu le ' + todayParis().slice(8, 10) + '/' + todayParis().slice(5, 7), relance_date: null, updated_at: nowIso }
        if (promote) patch2.status = 'nego'
        await sb.from('chasse_prospects').update(patch2).eq('id', ref)
      }
      if (b.note) await sb.from('prospect_comments').insert({ prospect_kind: kind, prospect_ref: ref, author: user.who, body: '↩️ A répondu : ' + String(b.note).slice(0, 1000) })
      try { await sb.from('activity_log').insert({ user_role: user.who, user_name: user.who === 'emy' ? 'Emy' : 'Edward', type: 'prospect_reponse', description: '↩️ ' + (name || ref) + ' a répondu', prospect_name: name || null }) } catch (e) { /* */ }
      return NextResponse.json({ ok: true, newStatus: promote ? 'nego' : null, prospectPatch: { nextAction: 'Répondre / proposer une dégustation', nextDate: todayParis(), status: promote ? 'nego' : undefined } })
    }

    if (action === 'unreplied') {
      await upsertCrmState(sb, kind, ref, { replied_at: null, reply_note: null })
      return NextResponse.json({ ok: true })
    }

    if (action === 'followup') {
      var due = String(b.due_date || '').slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return bad('Date invalide')
      var ch = ['email', 'linkedin', 'phone'].indexOf(String(b.channel)) >= 0 ? String(b.channel) : 'email'
      var etype = String(b.email_type || (ch === 'email' ? 'relance' : (ch === 'phone' ? 'call' : 'linkedin_message')))
      var mode = b.mode === 'auto' && ch === 'email' && etype === 'relance' ? 'auto' : 'manual'
      var st = await getCrmState(sb, kind, ref)
      if (mode === 'auto' && (st.email_invalid || st.do_not_contact)) return bad('Relance auto impossible : adresse rejetée ou « ne plus contacter »')
      var cur = await sb.from('prospect_followups').select('*').eq('prospect_kind', kind).eq('prospect_ref', ref).eq('status', 'scheduled').maybeSingle()
      var row: any = {
        prospect_kind: kind, prospect_ref: ref, prospect_name: name || null, due_date: due, mode: mode, channel: ch,
        email_type: etype,
        sender_key: b.sender_key === 'emy' ? 'emy' : (b.sender_key === 'edward' ? 'edward' : user.who),
        step: cur.data ? cur.data.step : 1, status: 'scheduled', created_by: user.who, status_detail: null
      }
      var saved: any
      if (cur.data) saved = await sb.from('prospect_followups').update(row).eq('id', cur.data.id).select('*').single()
      else saved = await sb.from('prospect_followups').insert(row).select('*').single()
      if (saved.error) return bad(saved.error.message, 500)
      await setNextAction(sb, kind, ref, saved.data)
      return NextResponse.json({ ok: true, followup: saved.data, prospectPatch: prospectPatch(saved.data, null) })
    }

    if (action === 'cancel_followup') {
      await sb.from('prospect_followups').update({ status: 'cancelled', status_detail: 'Annulée par ' + user.who, executed_at: new Date().toISOString() })
        .eq('prospect_kind', kind).eq('prospect_ref', ref).eq('status', 'scheduled')
      await setNextAction(sb, kind, ref, null)
      return NextResponse.json({ ok: true, prospectPatch: prospectPatch(null, null) })
    }

    if (action === 'auto') {
      var enabled = !!b.enabled
      var st2 = await getCrmState(sb, kind, ref)
      if (enabled && (st2.email_invalid || st2.do_not_contact)) return bad('Relances auto impossibles : adresse rejetée ou « ne plus contacter »')
      await upsertCrmState(sb, kind, ref, { auto_followup: enabled })
      await sb.from('prospect_followups').update({ mode: enabled ? 'auto' : 'manual' })
        .eq('prospect_kind', kind).eq('prospect_ref', ref).eq('status', 'scheduled').eq('channel', 'email').eq('email_type', 'relance')
      var cf = await sb.from('prospect_followups').select('*').eq('prospect_kind', kind).eq('prospect_ref', ref).eq('status', 'scheduled').maybeSingle()
      if (cf.data) await setNextAction(sb, kind, ref, cf.data)
      return NextResponse.json({ ok: true, prospectPatch: cf.data ? prospectPatch(cf.data, null) : undefined })
    }

    if (action === 'state') {
      var allowed: any = {}
      if (b.linkedin_url !== undefined) allowed.linkedin_url = String(b.linkedin_url || '').trim().slice(0, 300) || null
      if (b.email_invalid !== undefined) { allowed.email_invalid = !!b.email_invalid; if (!b.email_invalid) allowed.email_invalid_reason = null }
      if (b.do_not_contact !== undefined) allowed.do_not_contact = !!b.do_not_contact
      if (b.owner !== undefined) allowed.owner = b.owner === 'emy' ? 'emy' : (b.owner === 'edward' ? 'edward' : null)
      await upsertCrmState(sb, kind, ref, allowed)
      if (allowed.do_not_contact) {
        await cancelScheduled(sb, kind, ref, 'Ne plus contacter')
        var lk2 = await linkedRefs(sb, kind, ref)
        for (var j = 0; j < lk2.length; j++) {
          await upsertCrmState(sb, lk2[j].kind, lk2[j].ref, { do_not_contact: true })
          await cancelScheduled(sb, lk2[j].kind, lk2[j].ref, 'Ne plus contacter')
        }
        await setNextAction(sb, kind, ref, null)
        return NextResponse.json({ ok: true, prospectPatch: prospectPatch(null, null) })
      }
      return NextResponse.json({ ok: true })
    }

    return bad('Action inconnue')
  } catch (e: any) {
    return bad(e && e.message ? e.message : 'Erreur', 500)
  }
}
