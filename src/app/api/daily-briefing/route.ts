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
  var todayFr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  var calRes = await supabase.from('cal_events').select('id').eq('start_date', today).neq('source', 'ai_suggestion')
  var nbEvents = (calRes.data || []).length

  var todoRes = await supabase.from('tasks').select('id').neq('status', 'done')
  var nbTodo = (todoRes.data || []).length

  var alertsRes = await supabase.from('price_history').select('id').eq('acknowledged', false).gt('change_pct', 0)
  var nbAlerts = (alertsRes.data || []).length

  var parts = []
  parts.push('\uD83D\uDCC5 ' + nbEvents + ' event' + (nbEvents > 1 ? 's' : ''))
  parts.push('\u2705 ' + nbTodo + ' tâche' + (nbTodo > 1 ? 's' : '') + ' à faire')
  if (nbAlerts > 0) parts.push('\uD83E\uDD69 ' + nbAlerts + ' alerte' + (nbAlerts > 1 ? 's' : '') + ' FC')
  var body = parts.join(' · ')

  var capDay = todayFr.charAt(0).toUpperCase() + todayFr.slice(1)
  await Promise.all([
    sendPush('\uD83C\uDF2D Bonjour Edward \u2014 ' + capDay, body, 'edward'),
    sendPush('\uD83C\uDF2D Bonjour Emy \u2014 ' + capDay, body, 'emy')
  ])
  return NextResponse.json({ ok: true, body: body })
}

export async function POST() {
  return GET()
}
