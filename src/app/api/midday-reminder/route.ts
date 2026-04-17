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

  var todoRes = await supabase.from('tasks').select('id').neq('status', 'done')
  var nbTodo = (todoRes.data || []).length

  var emyActionsRes = await supabase.from('activity_log').select('id').gte('created_at', startOfDay).eq('user_role', 'emy')
  var nbEmyActions = (emyActionsRes.data || []).length

  var emyDoneRes = await supabase.from('activity_log').select('id').gte('created_at', startOfDay).eq('type', 'tache_terminee').eq('user_role', 'emy')
  var nbEmyDone = (emyDoneRes.data || []).length

  var allDoneRes = await supabase.from('activity_log').select('id').gte('created_at', startOfDay).eq('type', 'tache_terminee')
  var nbAllDone = (allDoneRes.data || []).length

  var edParts = []
  edParts.push('\uD83D\uDC69 Emy: ' + nbEmyActions + ' action' + (nbEmyActions > 1 ? 's' : '') + ', ' + nbEmyDone + ' tâche' + (nbEmyDone > 1 ? 's' : '') + ' faite' + (nbEmyDone > 1 ? 's' : ''))
  edParts.push('\uD83D\uDCCB ' + nbTodo + ' restante' + (nbTodo > 1 ? 's' : ''))
  var edBody = edParts.join(' \u00B7 ')

  var emyParts = []
  emyParts.push('\u2705 ' + nbAllDone + ' faite' + (nbAllDone > 1 ? 's' : '') + ' ce matin')
  emyParts.push('\uD83D\uDCCB ' + nbTodo + ' restante' + (nbTodo > 1 ? 's' : ''))
  var emyBody = emyParts.join(' \u00B7 ')

  await Promise.all([
    sendPush('\uD83E\uDD6A Rappel midi !', edBody, 'edward'),
    sendPush('\uD83E\uDD6A Rappel midi !', emyBody, 'emy')
  ])
  return NextResponse.json({ ok: true, edward: edBody, emy: emyBody })
}
