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

  var doneRes = await supabase.from('activity_log').select('id').gte('created_at', startOfDay).eq('type', 'tache_terminee')
  var nbDone = (doneRes.data || []).length

  var todoRes = await supabase.from('tasks').select('id').neq('status', 'done')
  var nbTodo = (todoRes.data || []).length

  var alertsRes = await supabase.from('price_history').select('id').eq('acknowledged', false).gt('change_pct', 0)
  var nbAlerts = (alertsRes.data || []).length

  var parts = []
  parts.push('\u2705 ' + nbDone + ' faite' + (nbDone > 1 ? 's' : '') + ' aujourd\'hui')
  parts.push('\uD83D\uDCCB ' + nbTodo + ' restante' + (nbTodo > 1 ? 's' : ''))
  if (nbAlerts > 0) parts.push('\uD83E\uDD69 ' + nbAlerts + ' alerte' + (nbAlerts > 1 ? 's' : '') + ' FC')
  var body = parts.join(' · ')

  await Promise.all([
    sendPush('\uD83C\uDF1F Bilan du jour, Edward', body, 'edward'),
    sendPush('\uD83C\uDF1F Bilan du jour, Emy', body, 'emy')
  ])
  return NextResponse.json({ ok: true, body: body })
}
