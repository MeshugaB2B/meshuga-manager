// =============================================================================
// weeklyReport.ts — Moteur du Bilan hebdo Meshuga (auto-généré)
//
// Source de vérité fiable = daily_z_reports (CA caisse, propre et riche).
// La prospection n'étant pas encore tracée finement, la section commerciale
// affiche UNIQUEMENT des signaux honnêtes (devis créés, RDV planifiés,
// nouveaux leads) — jamais de chiffre inventé.
//
// Exporte :
//   - lastCompletedWeek()            → bornes de la dernière semaine pleine
//   - weekFromMonday(mondayStr)      → bornes d'une semaine donnée
//   - buildWeeklyMetrics(sb, week)   → objet métriques complet
//   - synthesizeWeek(metrics)        → { analyse, priorites[] } via Claude
//   - buildEmailHtml(metrics, synth) → HTML email (charte Meshuga)
//   - buildSmsBody(metrics)          → texte SMS court
//   - resolveRecipients(sb)          → { emails[], edwardPhone }
//
// Côté serveur uniquement (utilise SUPABASE_SERVICE_ROLE_KEY / ANTHROPIC_API_KEY).
// =============================================================================

import { MESHUGA_LOGO_PINK_DATA_URI } from '@/lib/meshugaLogo'
import { Resend } from 'resend'
import { sendTwilioSms, normalizePhoneFR } from '@/lib/twilio'

var CLAUDE_MODEL = process.env.HR_OCR_MODEL || 'claude-haiku-4-5-20251001'

var JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
var MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

var CHANNEL_LABELS = {
  emporter: 'À emporter',
  livraison: 'Livraison',
  sur_place: 'Sur place',
  deliveroo: 'Deliveroo',
  uber_eats: 'Uber Eats'
}
var PAYMENT_LABELS = {
  cb: 'Carte bancaire',
  especes: 'Espèces',
  tabesto: 'Borne (Tabesto)',
  deliveroo: 'Deliveroo',
  uber_eats: 'Uber Eats',
  tickets_resto: 'Titres-resto',
  edenred: 'Edenred',
  swile: 'Swile',
  cheque: 'Chèque',
  autre: 'Autre'
}

// ---- Helpers dates ----------------------------------------------------------
function pad2(n) { return n < 10 ? '0' + n : '' + n }
function ymd(d) { return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) }
function parseYmd(s) { var p = String(s).split('-'); return new Date(Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10))) }
function addDays(d, n) { var x = new Date(d.getTime()); x.setUTCDate(x.getUTCDate() + n); return x }

function mondayOf(d) {
  var x = new Date(d.getTime())
  var wd = x.getUTCDay() // 0=dim..6=sam
  var diff = (wd === 0 ? -6 : 1 - wd)
  return addDays(x, diff)
}

function frDate(d) { return d.getUTCDate() + ' ' + MOIS_FR[d.getUTCMonth()] }

function buildWeekObj(monday) {
  var start = mondayOf(monday)
  var end = addDays(start, 6)
  var label = 'Semaine du ' + frDate(start) + ' au ' + frDate(end)
  var prevStart = addDays(start, -7)
  var prevEnd = addDays(start, -1)
  return { startStr: ymd(start), endStr: ymd(end), prevStartStr: ymd(prevStart), prevEndStr: ymd(prevEnd), label: label }
}

export function lastCompletedWeek() {
  var now = new Date()
  var todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  var thisMonday = mondayOf(todayUtc)
  return buildWeekObj(addDays(thisMonday, -7))
}

export function weekFromMonday(mondayStr) { return buildWeekObj(parseYmd(mondayStr)) }

// ---- Formatage --------------------------------------------------------------
export function euro(n) {
  var v = Math.round((Number(n) || 0) * 100) / 100
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}
export function euro2(n) {
  var v = Math.round((Number(n) || 0) * 100) / 100
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}
export function pct(n) {
  var v = Math.round((Number(n) || 0) * 10) / 10
  return (v > 0 ? '+' : '') + v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'
}
function deltaPct(cur, prev) {
  if (!prev || prev === 0) return null
  return ((cur - prev) / prev) * 100
}
function sumObj(target, src) {
  if (!src) return
  Object.keys(src).forEach(function (k) {
    var v = Number(src[k]) || 0
    if (v === 0) return
    target[k] = (target[k] || 0) + v
  })
}

// ---- Compute métriques ------------------------------------------------------
export async function buildWeeklyMetrics(sb, week) {
  var zRes = await sb.from('daily_z_reports').select('*').gte('z_date', week.startStr).lte('z_date', week.endStr).order('z_date', { ascending: true })
  var zPrevRes = await sb.from('daily_z_reports').select('ca_ttc,nb_tickets').gte('z_date', week.prevStartStr).lte('z_date', week.prevEndStr)
  var rows = zRes.data || []
  var prevRows = zPrevRes.data || []

  var caTtc = 0, caHt = 0, tickets = 0
  var channels = {}, payments = {}
  var anomalies = []
  var byDay = []
  rows.forEach(function (r) {
    var ca = Number(r.ca_ttc) || 0
    caTtc += ca
    caHt += Number(r.ca_ht) || 0
    tickets += Number(r.nb_tickets) || 0
    sumObj(channels, r.canaux)
    sumObj(payments, r.paiements)
    var dd = parseYmd(r.z_date)
    if (r.has_anomaly) anomalies.push({ date: r.z_date, jour: JOURS_FR[dd.getUTCDay()], reasons: r.anomaly_reasons || [] })
    byDay.push({ date: r.z_date, jour: JOURS_FR[dd.getUTCDay()], jourCourt: JOURS_FR[dd.getUTCDay()].slice(0, 3), ca: ca, tickets: Number(r.nb_tickets) || 0, moy: Number(r.ticket_moyen) || (r.nb_tickets ? ca / r.nb_tickets : 0), anomaly: !!r.has_anomaly })
  })

  var prevCa = 0, prevTickets = 0
  prevRows.forEach(function (r) { prevCa += Number(r.ca_ttc) || 0; prevTickets += Number(r.nb_tickets) || 0 })

  var ticketMoyen = tickets > 0 ? caTtc / tickets : 0

  var best = null, worst = null
  byDay.forEach(function (d) {
    if (!best || d.ca > best.ca) best = d
    if (!worst || d.ca < worst.ca) worst = d
  })

  // Section commerciale — signaux honnêtes uniquement
  var devisRes = await sb.from('devis').select('id').gte('created_at', week.startStr + 'T00:00:00').lte('created_at', week.endStr + 'T23:59:59')
  var rdvRes = await sb.from('cal_events').select('id').gte('start_date', week.startStr).lte('start_date', week.endStr).eq('type', 'rdv')
  var eventsRes = await sb.from('cal_events').select('id,title,type,start_date').gte('start_date', week.startStr).lte('start_date', week.endStr).neq('source', 'ai_suggestion')

  // Tâches : accomplies la semaine écoulée + prévues la semaine suivante
  var nextStart = ymd(addDays(parseYmd(week.endStr), 1))
  var nextEnd = ymd(addDays(parseYmd(week.endStr), 7))
  var soonEnd = ymd(addDays(parseYmd(week.endStr), 21))
  var doneRes = await sb.from('tasks').select('title,updated_at').eq('status', 'done').gte('updated_at', week.startStr + 'T00:00:00').lte('updated_at', week.endStr + 'T23:59:59')
  var plannedRes = await sb.from('tasks').select('title,deadline,priority').neq('status', 'done').gte('deadline', nextStart).lte('deadline', nextEnd)
  var backlogRes = await sb.from('tasks').select('title,deadline,priority').neq('status', 'done').order('deadline', { ascending: true, nullsFirst: false })
  // Agenda à venir (RDV / events internes des 3 prochaines semaines)
  var upcomingRes = await sb.from('cal_events').select('title,type,start_date').gt('start_date', week.endStr).lte('start_date', soonEnd).neq('source', 'ai_suggestion').order('start_date', { ascending: true })

  var doneTasks = (doneRes.data || []).map(function (t) { return t.title }).filter(function (x) { return !!x })
  var plannedTasks = (plannedRes.data || []).map(function (t) { return { title: t.title, deadline: t.deadline, priority: t.priority } })
  var backlogTasks = (backlogRes.data || []).map(function (t) { return { title: t.title, deadline: t.deadline, priority: t.priority } })
  var upcomingEvents = (upcomingRes.data || []).slice(0, 8).map(function (e) { return { title: e.title, type: e.type, date: e.start_date } })

  return {
    weekLabel: week.label,
    weekStart: week.startStr,
    weekEnd: week.endStr,
    daysWithZ: rows.length,
    hasData: rows.length > 0,
    ca: { ttc: caTtc, ht: caHt, prev: prevCa, deltaPct: deltaPct(caTtc, prevCa) },
    tickets: { total: tickets, prev: prevTickets, deltaPct: deltaPct(tickets, prevTickets) },
    ticketMoyen: ticketMoyen,
    byDay: byDay,
    bestDay: best,
    worstDay: worst,
    channels: channels,
    payments: payments,
    anomalies: anomalies,
    commercial: {
      devisCreated: (devisRes.data || []).length,
      rdvPlanned: (rdvRes.data || []).length,
      events: (eventsRes.data || []).length
    },
    tasks: {
      done: doneTasks,
      planned: plannedTasks,
      backlog: backlogTasks,
      openTotal: backlogTasks.length
    },
    upcomingEvents: upcomingEvents
  }
}

// ---- Synthèse IA ------------------------------------------------------------
function topEntries(obj, n) {
  return Object.keys(obj).map(function (k) { return { k: k, v: obj[k] } }).sort(function (a, b) { return b.v - a.v }).slice(0, n || 99)
}

export async function synthesizeWeek(m) {
  var apiKey = process.env.ANTHROPIC_API_KEY || ''
  var fallback = {
    analyse: 'CA de ' + euro(m.ca.ttc) + ' sur la semaine' + (m.ca.deltaPct != null ? ' (' + pct(m.ca.deltaPct) + ' vs semaine précédente)' : '') + ', ' + m.tickets.total + ' tickets, panier moyen ' + euro2(m.ticketMoyen) + '.',
    priorites: ['Analyser le canal le plus faible de la semaine', 'Préparer les achats selon les jours forts identifiés', 'Relancer 3 prospects B2B']
  }
  if (!apiKey) return fallback

  var chTop = topEntries(m.channels, 5).map(function (e) { return (CHANNEL_LABELS[e.k] || e.k) + ' ' + euro(e.v) }).join(', ')
  var payTop = topEntries(m.payments, 5).map(function (e) { return (PAYMENT_LABELS[e.k] || e.k) + ' ' + euro(e.v) }).join(', ')
  var daysTxt = m.byDay.map(function (d) { return d.jour + ' ' + euro(d.ca) + ' (' + d.tickets + ' tk)' }).join(' | ')
  var t = m.tasks || { done: [], planned: [], backlog: [], openTotal: 0 }
  var doneTxt = t.done.length ? t.done.join(' ; ') : 'aucune tâche marquée terminée'
  var plannedTxt = t.planned.length ? t.planned.map(function (x) { return x.title + (x.deadline ? ' (échéance ' + x.deadline + ')' : '') }).join(' ; ') : 'aucune tâche planifiée'
  var backlogTxt = (t.backlog && t.backlog.length) ? t.backlog.slice(0, 5).map(function (x) { return x.title }).join(' ; ') : 'backlog vide'
  var evTxt = (m.upcomingEvents && m.upcomingEvents.length) ? m.upcomingEvents.map(function (e) { return e.title + ' (' + (e.type || 'event') + ', ' + e.date + ')' }).join(' ; ') : 'aucun événement à l\'agenda'

  var prompt = 'Tu es l\'analyste de gestion du restaurant street-food Meshuga (Paris 6e, 3 rue Vavin). '
    + 'Voici les données réelles de la ' + m.weekLabel + ' :\n'
    + '- CA TTC : ' + euro2(m.ca.ttc) + (m.ca.deltaPct != null ? ' (' + pct(m.ca.deltaPct) + ' vs S-1: ' + euro2(m.ca.prev) + ')' : '') + '\n'
    + '- Tickets : ' + m.tickets.total + (m.tickets.deltaPct != null ? ' (' + pct(m.tickets.deltaPct) + ' vs S-1)' : '') + ', panier moyen ' + euro2(m.ticketMoyen) + '\n'
    + '- CA par jour : ' + daysTxt + '\n'
    + '- Par canal : ' + chTop + '\n'
    + '- Par paiement : ' + payTop + '\n'
    + '- Meilleur jour : ' + (m.bestDay ? m.bestDay.jour + ' (' + euro(m.bestDay.ca) + ')' : 'n/a') + ', plus faible : ' + (m.worstDay ? m.worstDay.jour + ' (' + euro(m.worstDay.ca) + ')' : 'n/a') + '\n'
    + '- Anomalies Z signalées : ' + (m.anomalies.length || 'aucune') + '\n'
    + '- Activité B2B de la semaine : ' + m.commercial.devisCreated + ' devis créés, ' + m.commercial.rdvPlanned + ' RDV planifiés.\n'
    + '- Tâches terminées cette semaine : ' + doneTxt + '\n'
    + '- Tâches déjà planifiées la semaine prochaine : ' + plannedTxt + '\n'
    + '- Backlog en cours (' + t.openTotal + ') : ' + backlogTxt + '\n'
    + '- Agenda des 3 prochaines semaines : ' + evTxt + '\n\n'
    + 'Consignes pour les priorités :\n'
    + '1) Si des événements sont à l\'agenda, transforme-les en actions concrètes (préparer, confirmer, relancer).\n'
    + '2) Reprends les tâches déjà planifiées la semaine prochaine si pertinentes.\n'
    + '3) S\'il n\'y a NI tâche planifiée NI événement, PROPOSE 3 actions concrètes et utiles pour un street-food à Paris 6e (ex : pousser le canal le plus faible de la semaine, action B2B vers les bureaux/écoles du quartier, optimisation food cost, animation réseaux). Reste réaliste et actionnable.\n\n'
    + 'Réponds UNIQUEMENT en JSON valide, sans markdown ni backticks, au format : '
    + '{"analyse":"2 à 3 phrases d\'analyse concrète basées sur les chiffres réels (tendance CA, canaux, jours forts/faibles, et un mot sur les tâches accomplies s\'il y en a)","priorites":["priorité 1 concrète","priorité 2","priorité 3"]}. '
    + 'Sois direct, factuel, sans flatterie. En français.'

  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
    })
    var data = await res.json()
    var txt = ''
    if (data && data.content) {
      data.content.forEach(function (b) { if (b.type === 'text') txt += b.text })
    }
    txt = txt.replace(/```json/g, '').replace(/```/g, '').trim()
    var parsed = JSON.parse(txt)
    if (!parsed.analyse) parsed.analyse = fallback.analyse
    if (!parsed.priorites || !parsed.priorites.length) parsed.priorites = fallback.priorites
    return parsed
  } catch (e) {
    console.error('[weeklyReport] synthèse IA échouée, fallback:', e)
    return fallback
  }
}

// ---- Rendu email (charte Meshuga) ------------------------------------------
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

function channelBars(obj, total) {
  var entries = topEntries(obj, 8).filter(function (e) { return e.v > 0 })
  if (!entries.length) return '<div style="font-size:13px;color:#777;">Aucune donnée.</div>'
  return entries.map(function (e) {
    var p = total > 0 ? Math.round((e.v / total) * 100) : 0
    var lbl = CHANNEL_LABELS[e.k] || PAYMENT_LABELS[e.k] || e.k
    return '<div style="margin-bottom:7px;">'
      + '<div style="display:flex;justify-content:space-between;font-size:12px;color:#191923;margin-bottom:2px;"><span style="font-weight:700;">' + esc(lbl) + '</span><span>' + esc(euro(e.v)) + ' &middot; ' + p + '%</span></div>'
      + '<div style="height:9px;background:#EBEBEB;border:1.5px solid #191923;border-radius:3px;overflow:hidden;"><div style="height:100%;width:' + p + '%;background:#FF82D7;"></div></div>'
      + '</div>'
  }).join('')
}

export function buildEmailHtml(m, synth) {
  var deltaBadge = m.ca.deltaPct == null
    ? ''
    : '<span style="display:inline-block;font-size:13px;font-weight:900;padding:2px 10px;border:2px solid #191923;border-radius:20px;background:' + (m.ca.deltaPct >= 0 ? '#FFEB5A' : '#FF82D7') + ';color:#191923;">' + esc(pct(m.ca.deltaPct)) + ' vs S-1</span>'

  var kpiTile = function (val, lbl) {
    return '<td style="width:33%;background:#FFFFFF;border:2px solid #191923;border-radius:7px;padding:12px;text-align:center;box-shadow:3px 3px 0 #191923;">'
      + '<div style="font-size:22px;font-weight:900;color:#191923;line-height:1.1;">' + esc(val) + '</div>'
      + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#777;margin-top:3px;">' + esc(lbl) + '</div></td>'
  }

  var daysRows = m.byDay.map(function (d) {
    return '<tr>'
      + '<td style="padding:6px 8px;border-bottom:1px solid #EBEBEB;font-weight:700;color:#191923;">' + esc(d.jour) + (d.anomaly ? ' ⚠️' : '') + '</td>'
      + '<td style="padding:6px 8px;border-bottom:1px solid #EBEBEB;text-align:right;color:#191923;">' + esc(euro(d.ca)) + '</td>'
      + '<td style="padding:6px 8px;border-bottom:1px solid #EBEBEB;text-align:right;color:#777;">' + d.tickets + ' tk</td>'
      + '</tr>'
  }).join('')

  var prioItems = (synth.priorites || []).map(function (p) {
    return '<li style="margin-bottom:6px;font-size:14px;color:#191923;line-height:1.5;">' + esc(p) + '</li>'
  }).join('')

  var anomaliesBlock = m.anomalies.length
    ? '<div style="background:#FFFFFF;border:2px solid #191923;border-left:6px solid #FF82D7;border-radius:6px;padding:12px;margin-bottom:18px;"><div style="font-weight:900;font-size:13px;color:#191923;margin-bottom:4px;">⚠️ Anomalies Z (' + m.anomalies.length + ')</div><div style="font-size:12px;color:#555;">' + m.anomalies.map(function (a) { return esc(a.jour) }).join(', ') + '</div></div>'
    : ''

  var commercialLine = 'Activité B2B : ' + m.commercial.devisCreated + ' devis créé' + (m.commercial.devisCreated > 1 ? 's' : '') + ' &middot; ' + m.commercial.rdvPlanned + ' RDV planifié' + (m.commercial.rdvPlanned > 1 ? 's' : '')

  var liList = function (arr) { return arr.map(function (x) { return '<li style="margin-bottom:3px;">' + esc(x) + '</li>' }).join('') }
  var tk = m.tasks || { done: [], planned: [] }
  var doneBlock = (tk.done && tk.done.length) ? '<div style="margin-bottom:10px;"><div style="font-size:12px;font-weight:900;color:#191923;">✅ Tâches accomplies</div><ul style="margin:4px 0 0;padding-left:18px;font-size:13px;color:#191923;">' + liList(tk.done) + '</ul></div>' : ''
  var plannedBlock = (tk.planned && tk.planned.length) ? '<div style="margin-bottom:10px;"><div style="font-size:12px;font-weight:900;color:#191923;">🗒️ Prévues la semaine prochaine</div><ul style="margin:4px 0 0;padding-left:18px;font-size:13px;color:#191923;">' + liList(tk.planned.map(function (x) { return x.title + (x.deadline ? ' — ' + x.deadline : '') })) + '</ul></div>' : ''
  var evBlock = (m.upcomingEvents && m.upcomingEvents.length) ? '<div><div style="font-size:12px;font-weight:900;color:#191923;">📅 Agenda à venir</div><ul style="margin:4px 0 0;padding-left:18px;font-size:13px;color:#191923;">' + liList(m.upcomingEvents.map(function (e) { return e.title + ' (' + e.date + ')' })) + '</ul></div>' : ''
  var tasksAgendaBlock = (doneBlock || plannedBlock || evBlock)
    ? '<div style="background:#FFFFFF;border:2px solid #191923;border-radius:8px;padding:16px;box-shadow:3px 3px 0 #191923;margin-bottom:18px;"><div style="font-weight:900;font-size:15px;color:#191923;margin-bottom:8px;">📋 Tâches &amp; agenda</div>' + doneBlock + plannedBlock + evBlock + '</div>'
    : '<div style="background:#FFFFFF;border:2px dashed #191923;border-radius:8px;padding:14px;margin-bottom:18px;font-size:13px;color:#555;">Aucune tâche ni événement enregistré — vois les priorités proposées ci-dessus.</div>'

  return '' +
'<div style="background:#FFFFFF;padding:0;margin:0;font-family:Arial,Helvetica,sans-serif;color:#191923;">' +
'<div style="max-width:640px;margin:0 auto;padding:24px;">' +
  '<div style="text-align:center;margin-bottom:18px;">' +
    '<img src="' + MESHUGA_LOGO_PINK_DATA_URI + '" alt="Meshuga" style="height:42px;width:auto;" />' +
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:3px;color:#777;margin-top:6px;">Bilan hebdomadaire</div>' +
  '</div>' +

  '<div style="background:#FF82D7;border:2px solid #191923;border-radius:8px;padding:18px;text-align:center;box-shadow:4px 4px 0 #191923;margin-bottom:8px;">' +
    '<div style="font-size:13px;color:#191923;font-weight:700;margin-bottom:4px;">' + esc(m.weekLabel) + '</div>' +
    '<div style="font-size:40px;font-weight:900;color:#191923;line-height:1;">' + esc(euro(m.ca.ttc)) + '</div>' +
    '<div style="font-size:11px;color:#191923;opacity:.7;margin:4px 0 8px;">CA TTC encaissé</div>' +
    deltaBadge +
  '</div>' +

  '<table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:14px 0;"><tr>' +
    kpiTile(m.tickets.total + '', 'Tickets') +
    kpiTile(euro2(m.ticketMoyen), 'Panier moyen') +
    kpiTile(m.daysWithZ + '/7', 'Jours encaissés') +
  '</tr></table>' +

  '<div style="background:#FFEB5A;border:2px solid #191923;border-radius:8px;padding:16px;box-shadow:3px 3px 0 #191923;margin-bottom:18px;">' +
    '<div style="font-weight:900;font-size:15px;color:#191923;margin-bottom:6px;">🧠 Analyse de la semaine</div>' +
    '<div style="font-size:14px;line-height:1.6;color:#191923;">' + esc(synth.analyse) + '</div>' +
  '</div>' +

  '<div style="display:block;margin-bottom:18px;">' +
    '<div style="font-weight:900;font-size:14px;color:#191923;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">CA par jour</div>' +
    '<table style="width:100%;border-collapse:collapse;border:2px solid #191923;border-radius:6px;overflow:hidden;font-size:13px;">' + daysRows + '</table>' +
    (m.bestDay ? '<div style="font-size:12px;color:#777;margin-top:6px;">🏆 Meilleur jour : <b style="color:#191923;">' + esc(m.bestDay.jour) + '</b> (' + esc(euro(m.bestDay.ca)) + ')</div>' : '') +
  '</div>' +

  '<div style="margin-bottom:18px;">' +
    '<div style="font-weight:900;font-size:14px;color:#191923;margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px;">Répartition par canal</div>' +
    channelBars(m.channels, m.ca.ttc) +
  '</div>' +

  anomaliesBlock +

  '<div style="background:#FFFFFF;border:2px solid #191923;border-radius:8px;padding:16px;box-shadow:3px 3px 0 #191923;margin-bottom:18px;">' +
    '<div style="font-weight:900;font-size:15px;color:#191923;margin-bottom:8px;">🎯 Priorités semaine prochaine</div>' +
    '<ol style="margin:0;padding-left:20px;">' + prioItems + '</ol>' +
  '</div>' +

  tasksAgendaBlock +

  '<div style="font-size:12px;color:#777;border-top:1.5px solid #EBEBEB;padding-top:12px;">' + commercialLine + '</div>' +
  '<div style="font-size:11px;color:#AAA;margin-top:14px;text-align:center;">Bilan généré automatiquement par Meshuga Manager.</div>' +
'</div></div>'
}

// ---- Rendu SMS --------------------------------------------------------------
export function buildSmsBody(m) {
  var d = m.ca.deltaPct == null ? '' : ' (' + pct(m.ca.deltaPct) + ' vs S-1)'
  var best = m.bestDay ? ' Meilleur jour ' + m.bestDay.jourCourt + ' ' + euro(m.bestDay.ca) + '.' : ''
  return 'Meshuga - ' + m.weekLabel + ' : CA ' + euro(m.ca.ttc) + d + ', ' + m.tickets.total + ' tickets, panier ' + euro2(m.ticketMoyen) + '.' + best + ' Detail par email.'
}

// ---- Destinataires ----------------------------------------------------------
export async function resolveRecipients(sb) {
  var emails = []
  try {
    var res = await sb.from('profiles').select('email,role').not('email', 'is', null)
    ;(res.data || []).forEach(function (p) { if (p.email && emails.indexOf(p.email) === -1) emails.push(p.email) })
  } catch (e) { console.error('[weeklyReport] profiles introuvables:', e) }
  if (process.env.EDWARD_NOTIFICATION_EMAIL && emails.indexOf(process.env.EDWARD_NOTIFICATION_EMAIL) === -1) emails.push(process.env.EDWARD_NOTIFICATION_EMAIL)
  if (emails.indexOf('emy@meshuga.fr') === -1) emails.push('emy@meshuga.fr')
  return { emails: emails, edwardPhone: process.env.EDWARD_NOTIFICATION_PHONE || '' }
}

// ---- Orchestration : calcul + IA + archivage + envoi -----------------------
// Réutilisé par la route POST (envoi manuel) et le cron hebdo (auto).
export async function runWeeklyReport(sb, week, doSend) {
  var metrics = await buildWeeklyMetrics(sb, week)
  var synth = await synthesizeWeek(metrics)

  var snapshot = {
    week_label: metrics.weekLabel,
    week_start: metrics.weekStart,
    authored_by: null,
    prospects_contacted: 0,
    meetings_held: metrics.commercial.rdvPlanned,
    proposals_sent: metrics.commercial.devisCreated,
    orders_received: 0,
    revenue_generated: Math.round(metrics.ca.ttc * 100) / 100,
    wins: synth.analyse || '',
    challenges: metrics.anomalies.length ? (metrics.anomalies.length + ' anomalie(s) Z signalee(s)') : '',
    next_week_priorities: (synth.priorites || []).join('\n'),
    free_notes: 'Tickets ' + metrics.tickets.total + ' | Panier ' + (Math.round(metrics.ticketMoyen * 100) / 100) + ' | Jours Z ' + metrics.daysWithZ + '/7',
    status: 'auto',
    submitted_at: new Date().toISOString()
  }
  var savedId = null
  try {
    var ins = await sb.from('weekly_reports').insert(snapshot).select('id').single()
    if (ins.data) savedId = ins.data.id
    if (ins.error) console.error('[weeklyReport] insert:', ins.error.message)
  } catch (e) { console.error('[weeklyReport] insert exception:', e) }

  var result = { ok: true, week: week, metrics: metrics, synthesis: synth, savedId: savedId, emailSent: false, smsSent: false, recipients: [], errors: [] }
  if (!metrics.hasData) { result.note = 'Aucune donnee de caisse sur la periode — rien envoye.'; return result }
  if (!doSend) return result

  var rcpt = await resolveRecipients(sb)
  result.recipients = rcpt.emails

  try {
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && rcpt.emails.length) {
      var resend = new Resend(process.env.RESEND_API_KEY)
      var er = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to: rcpt.emails,
        subject: '\uD83D\uDCCA Bilan Meshuga — ' + metrics.weekLabel,
        html: buildEmailHtml(metrics, synth)
      })
      if (er && er.error) { result.errors.push('email: ' + JSON.stringify(er.error)) } else { result.emailSent = true }
    } else { result.errors.push('email: config Resend ou destinataires manquants') }
  } catch (e) { result.errors.push('email: ' + String((e && e.message) || e)) }

  try {
    var phone = normalizePhoneFR(rcpt.edwardPhone)
    if (phone) {
      var sr = await sendTwilioSms({ to: phone, body: buildSmsBody(metrics) })
      if (sr && sr.ok) { result.smsSent = true } else { result.errors.push('sms: ' + ((sr && sr.error) || 'echec')) }
    } else { result.errors.push('sms: EDWARD_NOTIFICATION_PHONE manquant ou invalide') }
  } catch (e) { result.errors.push('sms: ' + String((e && e.message) || e)) }

  return result
}
