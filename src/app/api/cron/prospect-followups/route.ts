// ============================================================
// /api/cron/prospect-followups/route.ts
// ============================================================
// Cron du lundi au vendredi (07:00 UTC = 9h Paris l'été, 8h l'hiver).
//  1. Synchronise les statuts avec Resend (filet de sécurité si un
//     webhook a été manqué : rejets, délivrés…).
//  2. Envoie les relances email en mode AUTO arrivées à échéance :
//     - uniquement si le prospect est toujours « Contacté », n'a pas
//       répondu, et que la dernière adresse utilisée n'a pas été rejetée ;
//     - texte généré par l'IA (relance n°1 ou dernière relance), envoyé
//       dans le même fil (« Re: <objet du 1er mail> ») par l'expéditeur
//       prévu, sans plaquette ;
//     - sinon la relance repasse en MANUEL avec la raison.
// Protégé par CRON_SECRET (Vercel l'injecte automatiquement).
// ============================================================

import { NextResponse } from 'next/server'
import { getServiceClient, syncFromResend, loadProspect, getCrmState, recordContact, sendProspectEmails, todayParis, linkedRefs, BAD_STATUSES } from '@/lib/prospectCrm'
import { generateProspectEmail } from '@/lib/prospectEmailAI'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

var MAX_PER_RUN = 15

function fr(iso: string) {
  var d = String(iso || '').slice(0, 10).split('-')
  return d.length === 3 ? d[2] + '/' + d[1] + '/' + d[0] : ''
}

async function toManual(sb: any, f: any, reason: string) {
  await sb.from('prospect_followups').update({ mode: 'manual', status_detail: reason }).eq('id', f.id)
}
async function cancel(sb: any, f: any, reason: string) {
  await sb.from('prospect_followups').update({ status: 'skipped', status_detail: reason, executed_at: new Date().toISOString() }).eq('id', f.id)
}
// Échec / blocage APRÈS réservation : on remet une relance manuelle pour aujourd'hui
async function backToManual(sb: any, f: any, reason: string) {
  await sb.from('prospect_followups').update({ status: 'failed', status_detail: reason, executed_at: new Date().toISOString() }).eq('id', f.id)
  await sb.from('prospect_followups').insert({
    prospect_kind: f.prospect_kind, prospect_ref: f.prospect_ref, prospect_name: f.prospect_name, due_date: todayParis(),
    mode: 'manual', channel: 'email', email_type: f.email_type || 'relance', step: f.step, sender_key: f.sender_key,
    status: 'scheduled', created_by: 'auto', status_detail: reason
  })
}

export async function GET(request: Request) {
  // Ce cron ENVOIE des mails : jamais sans CRON_SECRET
  var cronSecret = process.env.CRON_SECRET || ''
  var authHeader = request.headers.get('authorization') || ''
  if (!cronSecret || authHeader !== 'Bearer ' + cronSecret) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  var sb = getServiceClient()
  if (!sb) return NextResponse.json({ ok: false, error: 'Supabase non configuré' }, { status: 500 })

  var report: any = { sync: null, sent: [], manual: [], skipped: [], failed: [] }

  try { report.sync = await syncFromResend(sb, { sinceDays: 30, maxPages: 5 }) } catch (e: any) { report.sync = { error: e && e.message } }

  if (!process.env.RESEND_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(Object.assign({ ok: false, error: 'RESEND_API_KEY ou ANTHROPIC_API_KEY manquante' }, report), { status: 500 })
  }

  var due = await sb.from('prospect_followups').select('*')
    .eq('status', 'scheduled').eq('mode', 'auto').eq('channel', 'email').eq('email_type', 'relance')
    .lte('due_date', todayParis()).order('due_date', { ascending: true }).limit(MAX_PER_RUN)

  var origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://meshuga-manager.vercel.app').replace(/\/$/, '')
  var list = due.data || []
  var t0 = Date.now()
  for (var i = 0; i < list.length; i++) {
    if (Date.now() - t0 > 240000) { report.skipped.push('Temps max atteint — la suite partira au prochain passage'); break }
    var f = list[i]
    var tag = (f.prospect_name || f.prospect_ref)
    var mailSent = false
    try {
      var p = await loadProspect(sb, f.prospect_kind, f.prospect_ref)
      if (!p) { await cancel(sb, f, 'Prospect introuvable'); report.skipped.push(tag + ' : introuvable'); continue }
      var st = await getCrmState(sb, f.prospect_kind, f.prospect_ref)
      if (st.replied_at) { await cancel(sb, f, 'Le prospect a répondu'); report.skipped.push(tag + ' : a répondu'); continue }
      if (st.do_not_contact) { await cancel(sb, f, 'Ne plus contacter'); report.skipped.push(tag + ' : ne plus contacter'); continue }
      if (p.status === 'won' || p.status === 'lost' || p.status === 'nego') { await cancel(sb, f, 'Statut ' + p.status); report.skipped.push(tag + ' : statut ' + p.status); continue }

      // Fiche jumelle (lead Prospection passé au CRM) : mêmes garde-fous
      var links = await linkedRefs(sb, f.prospect_kind, f.prospect_ref)
      var blocker = ''
      for (var li = 0; li < links.length && !blocker; li++) {
        if (f.prospect_kind === 'chasse' && links[li].kind === 'crm') { blocker = 'Lead passé au CRM — suivi dans la fiche CRM'; break }
        var lst = await getCrmState(sb, links[li].kind, links[li].ref)
        if (lst.replied_at) blocker = 'Le prospect a répondu (fiche liée)'
        else if (lst.do_not_contact) blocker = 'Ne plus contacter (fiche liée)'
        else {
          var lp = await loadProspect(sb, links[li].kind, links[li].ref)
          if (lp && (lp.status === 'won' || lp.status === 'lost' || lp.status === 'nego')) blocker = 'Statut ' + lp.status + ' (fiche liée)'
        }
      }
      if (blocker) { await cancel(sb, f, blocker); report.skipped.push(tag + ' : ' + blocker); continue }

      var hist = await sb.from('prospect_outreach').select('*')
        .eq('prospect_kind', f.prospect_kind).eq('prospect_ref', f.prospect_ref).order('sent_at', { ascending: true })
      var rows = hist.data || []
      var emails = rows.filter(function (x: any) { return x.channel === 'email' })
      var lastOk = emails.filter(function (x: any) { return x.to_email && BAD_STATUSES.indexOf(x.status) < 0 }).pop()
      if (!lastOk || st.email_invalid) { await toManual(sb, f, 'Pas d’adresse valide — à traiter à la main'); report.manual.push(tag + ' : pas d’adresse valide'); continue }

      var firstMail = emails.filter(function (x: any) { return x.subject })[0]
      var history = rows.map(function (x: any) {
        return '- ' + fr(x.sent_at) + ' · ' + x.channel + ' · ' + (x.email_type || '') + ' · « ' + (x.subject || '') + ' » · ' + x.status + (x.body ? ' — ' + String(x.body).replace(/\s+/g, ' ').slice(0, 220) : '')
      }).join('\n')

      // Réservation atomique : si un autre passage l'a déjà prise, on n'envoie pas
      var claim = await sb.from('prospect_followups').update({ status: 'sent', executed_at: new Date().toISOString(), status_detail: 'Envoi auto en cours' })
        .eq('id', f.id).eq('status', 'scheduled').select('id')
      if (!claim.data || !claim.data.length) { report.skipped.push(tag + ' : déjà traitée'); continue }

      var gen = await generateProspectEmail({
        prospect: Object.assign({}, p, { __history: history, __step: f.step }),
        emailType: 'relance', senderKey: f.sender_key === 'emy' ? 'emy' : 'edward', attachPlaquette: false
      })
      var subject = firstMail ? 'Re: ' + String(firstMail.subject).replace(/^(re\s*:\s*)+/i, '') : gen.subject
      var r = { email: lastOk.to_email, firstName: lastOk.to_first_name || p.contactFirstName || '', lastName: lastOk.to_last_name || '', civility: lastOk.to_civility || '' }

      var res = await sendProspectEmails({
        origin: origin, recipients: [r], subject: subject, body: gen.body,
        senderKey: f.sender_key === 'emy' ? 'emy' : 'edward',
        pressKeys: [], showReferences: false, showTv: false, attachPlaquette: false
      })
      if (!res.sent.length) {
        var err = res.failed[0] ? res.failed[0].error : 'inconnue'
        await backToManual(sb, f, 'Échec envoi auto : ' + err)
        report.failed.push(tag + ' : ' + err)
        continue
      }
      var s = res.sent[0]
      mailSent = true
      var rec = await recordContact(sb, {
        kind: f.prospect_kind, ref: f.prospect_ref, name: p.name, channel: 'email', emailType: 'relance',
        senderKey: f.sender_key || 'edward', sentMode: 'auto', createdBy: 'auto',
        items: [{ resendId: s.id, to: s.email, firstName: r.firstName, lastName: r.lastName, civility: r.civility, subject: s.subject, body: s.body }]
      })
      await sb.from('prospect_followups').update({ status_detail: null, outreach_id: rec.outreachIds[0] || null }).eq('id', f.id)
      try {
        await sb.from('activity_log').insert({ user_role: 'system', user_name: 'Relance auto', type: 'email_envoye', description: 'Relance auto envoyée à ' + p.name + ' (' + s.email + ')', prospect_name: p.name, email_content: s.subject })
      } catch (e) { /* best effort */ }
      report.sent.push(tag + ' → ' + s.email)
      await new Promise(function (ok) { setTimeout(ok, 700) })
    } catch (e: any) {
      var msg = e && e.message ? String(e.message).slice(0, 200) : 'erreur'
      report.failed.push(tag + ' : ' + msg)
      // Si la relance était réservée mais pas envoyée → relance manuelle ; sinon on la repasse juste en manuel
      var cur = await sb.from('prospect_followups').select('status, status_detail').eq('id', f.id).maybeSingle()
      if (mailSent) await sb.from('prospect_followups').update({ status_detail: 'Envoyée, mais historique incomplet : ' + msg }).eq('id', f.id)
      else if (cur.data && cur.data.status === 'sent' && cur.data.status_detail === 'Envoi auto en cours') await backToManual(sb, f, 'Erreur relance auto : ' + msg)
      else if (cur.data && cur.data.status === 'scheduled') await sb.from('prospect_followups').update({ mode: 'manual', status_detail: 'Erreur relance auto : ' + msg }).eq('id', f.id)
    }
  }

  return NextResponse.json(Object.assign({ ok: true, due: list.length }, report))
}
