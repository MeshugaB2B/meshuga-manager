import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_FN_URL = 'https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push'

async function sendPush(title: string, body: string, target: string) {
  try {
    await fetch(SUPABASE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, target })
    })
  } catch (e) { console.error('Push error:', e) }
}

async function getEncouragement(context: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        messages: [{
          role: 'user',
          content: `Meshuga Crazy Deli, deli new-yorkais à Paris. Bilan du jour : ${context}. Donne une phrase d'encouragement courte et motivante pour l'équipe. Commence directement.`
        }]
      })
    })
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || ''
  } catch (e) {
    return ''
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  const today = new Date().toISOString().split('T')[0]
  const startOfDay = today + 'T00:00:00.000Z'

  // Activité du jour dans le journal
  const { data: activityToday } = await supabase
    .from('activity_log')
    .select('type, user_role, description')
    .gte('created_at', startOfDay)
    .neq('type', 'session_start')

  // Devis créés aujourd'hui
  const { data: devisToday } = await supabase
    .from('devis')
    .select('id, client_name, total_ht, statut')
    .gte('created_at', startOfDay)

  // Devis toujours en attente
  const { data: devisAttente } = await supabase
    .from('devis')
    .select('id, total_ht')
    .in('statut', ['envoye', 'a_modifier'])

  const contactsEmy = activityToday?.filter((a: any) => a.user_role === 'emy').length || 0
  const contactsEdward = activityToday?.filter((a: any) => a.user_role === 'edward').length || 0
  const newDevis = devisToday?.length || 0
  const totalAttente = devisAttente?.reduce((s: number, d: any) => s + (parseFloat(d.total_ht) || 0), 0) || 0

  const context = `${contactsEmy} actions Emy, ${contactsEdward} actions Edward, ${newDevis} devis créés, ${totalAttente.toFixed(0)}€ HT en attente`
  const encouragement = await getEncouragement(context)

  // Message Emy
  const emyLines = [`${contactsEmy} action${contactsEmy > 1 ? 's' : ''} aujourd'hui`]
  if (newDevis > 0) emyLines.push(`${newDevis} devis créé${newDevis > 1 ? 's' : ''}`)
  if (encouragement) emyLines.push('🧠 ' + encouragement)

  // Message Edward
  const edwardLines = [`Emy : ${contactsEmy} actions · Toi : ${contactsEdward} actions`]
  if (newDevis > 0) edwardLines.push(`${newDevis} nouveau${newDevis > 1 ? 'x' : ''} devis`)
  if (devisAttente && devisAttente.length > 0) {
    edwardLines.push(`${devisAttente.length} devis en attente — ${totalAttente.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € HT`)
  }
  if (encouragement) edwardLines.push('🧠 ' + encouragement)

  await Promise.all([
    sendPush('🥪 Bonne soirée Emy !', emyLines.join(' · '), 'emy'),
    sendPush('🌭 Bilan du jour, Edward', edwardLines.join(' · '), 'edward')
  ])

  return NextResponse.json({ ok: true, context })
}
