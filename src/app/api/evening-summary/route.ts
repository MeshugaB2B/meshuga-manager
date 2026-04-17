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

export async function GET() {
  var supabase = getSupabase()
  var today = new Date().toISOString().split('T')[0]
  var startOfDay = today + 'T00:00:00.000Z'

  var doneRes = await supabase
    .from('activity_log').select('description')
    .gte('created_at', startOfDay).eq('type', 'tache_terminee')
  var doneToday = (doneRes.data || []).map(function(a) { return a.description })

  var todoRes = await supabase
    .from('tasks').select('title, priority')
    .neq('status', 'done').order('deadline', { ascending: true }).limit(10)
  var todos = todoRes.data || []

  var alertsRes = await supabase
    .from('price_history').select('ingredient_name, supplier, change_pct')
    .eq('acknowledged', false).gt('change_pct', 0).order('change_pct', { ascending: false }).limit(5)
  var alerts = alertsRes.data || []

  var lines = []

  lines.push("Aujourd'hui :")
  if (doneToday.length > 0) {
    doneToday.forEach(function(d) { lines.push('- \u2705 ' + d) })
  } else { lines.push('- Aucune tâche terminée') }

  lines.push('')
  lines.push('À Faire :')
  if (todos.length > 0) {
    todos.forEach(function(t) {
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

  var body = lines.join('\n')
  await Promise.all([
    sendPush('\uD83C\uDF1F Bilan du jour, Edward', body, 'edward'),
    sendPush('\uD83C\uDF1F Bilan du jour, Emy', body, 'emy')
  ])
  return NextResponse.json({ ok: true, body: body })
}
