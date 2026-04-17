import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_FN_URL = 'https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push'

async function sendPush(title, body, target) {
  try {
    await fetch(SUPABASE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, target })
    })
  } catch (e) { console.error('Push error:', e) }
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

async function buildBriefing(supabase, prenom) {
  var today = new Date().toISOString().split('T')[0]
  var todayFr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  var calRes = await supabase
    .from('cal_events').select('*').eq('start_date', today)
    .neq('source', 'ai_suggestion').order('time', { ascending: true })
  var calEvents = calRes.data || []

  var tasksRes = await supabase
    .from('tasks').select('title, status, deadline, priority')
    .neq('status', 'done').order('deadline', { ascending: true }).limit(10)
  var tasks = tasksRes.data || []

  var alertsRes = await supabase
    .from('price_history').select('ingredient_name, supplier, change_pct, price_per_kg')
    .eq('acknowledged', false).gt('change_pct', 0).order('change_pct', { ascending: false }).limit(5)
  var alerts = alertsRes.data || []

  var lines = []

  lines.push("Aujourd'hui :")
  if (calEvents.length > 0) {
    calEvents.forEach(function(e) {
      var time = e.time ? e.time.slice(0, 5) + ' ' : ''
      lines.push('- ' + time + e.title + (e.location ? ' @ ' + e.location : ''))
    })
  } else { lines.push('- Aucun événement') }

  lines.push('')
  lines.push('À Faire :')
  if (tasks.length > 0) {
    tasks.forEach(function(t) {
      var prio = t.priority === 'high' ? '\uD83D\uDD34 ' : t.priority === 'medium' ? '\uD83D\uDFE1 ' : ''
      lines.push('- ' + prio + t.title)
    })
  } else { lines.push('- Tout est fait ! \uD83C\uDF89') }

  lines.push('')
  lines.push('Alerte Food Cost :')
  if (alerts.length > 0) {
    alerts.forEach(function(a) {
      lines.push('- ' + a.ingredient_name + ' (' + a.supplier + ') : +' + a.change_pct.toFixed(0) + '%')
    })
  } else { lines.push('- RAS \u2705') }

  var title = '\uD83C\uDF2D Bonjour ' + prenom + ' \u2014 ' + todayFr.charAt(0).toUpperCase() + todayFr.slice(1)
  return { title: title, body: lines.join('\n') }
}

export async function GET() {
  var supabase = getSupabase()
  var edward = await buildBriefing(supabase, 'Edward')
  var emy = await buildBriefing(supabase, 'Emy')
  await Promise.all([
    sendPush(edward.title, edward.body, 'edward'),
    sendPush(emy.title, emy.body, 'emy')
  ])
  return NextResponse.json({ ok: true, edward: edward, emy: emy })
}

export async function POST() {
  var supabase = getSupabase()
  var edward = await buildBriefing(supabase, 'Edward')
  var emy = await buildBriefing(supabase, 'Emy')
  await Promise.all([
    sendPush(edward.title, edward.body, 'edward'),
    sendPush(emy.title, emy.body, 'emy')
  ])
  return NextResponse.json({ ok: true, edward: edward, emy: emy })
}
