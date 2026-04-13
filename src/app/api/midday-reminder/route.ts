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

  // Prospects à relancer aujourd'hui
  const { data: prospects } = await supabase
    .from('prospects')
    .select('name, next_contact_date, temperature')
    .lte('next_contact_date', today)
    .eq('status', 'actif')
    .order('next_contact_date', { ascending: true })
    .limit(5)

  const emyLines: string[] = []
  const edwardLines: string[] = []

  if (prospects && prospects.length > 0) {
    const urgents = prospects.filter((p: any) => p.temperature === 'hot' || p.temperature === 'warm')
    const others = prospects.filter((p: any) => p.temperature !== 'hot' && p.temperature !== 'warm')

    if (urgents.length > 0) {
      emyLines.push('🔥 Urgents : ' + urgents.map((p: any) => p.name).join(', '))
    }
    if (others.length > 0) {
      emyLines.push('📞 À appeler : ' + others.map((p: any) => p.name).join(', '))
    }
    edwardLines.push(`${prospects.length} prospect${prospects.length > 1 ? 's' : ''} à relancer aujourd'hui`)
  } else {
    emyLines.push('Toutes les relances du jour sont faites 👏')
    return NextResponse.json({ ok: true, message: 'Pas de relances' })
  }

  await Promise.all([
    sendPush('📞 Rappel relances — Midi', emyLines.join(' · '), 'emy'),
    sendPush('📊 Suivi terrain midi', edwardLines.join(' · '), 'edward')
  ])

  return NextResponse.json({ ok: true, prospects: prospects?.length })
}
