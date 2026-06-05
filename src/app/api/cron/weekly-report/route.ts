import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lastCompletedWeek, runWeeklyReport } from '@/lib/weeklyReport'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// Cron Vercel (lundi matin) — bilan de la dernière semaine pleine, envoyé auto.
// Si CRON_SECRET est défini, Vercel envoie l'en-tête Authorization: Bearer <secret>.
export async function GET(req) {
  try {
    var secret = process.env.CRON_SECRET || ''
    if (secret) {
      var auth = req.headers.get('authorization') || ''
      if (auth !== 'Bearer ' + secret) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
      }
    }
    var week = lastCompletedWeek()
    var sb = getSupabase()
    var result = await runWeeklyReport(sb, week, true)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[cron/weekly-report]', e)
    return NextResponse.json({ ok: false, error: String((e && e.message) || e) }, { status: 500 })
  }
}
