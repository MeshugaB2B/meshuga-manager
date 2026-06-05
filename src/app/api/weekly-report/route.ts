import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { lastCompletedWeek, weekFromMonday, buildWeeklyMetrics, synthesizeWeek, runWeeklyReport } from '@/lib/weeklyReport'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}
function resolveWeek(weekParam) {
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) return weekFromMonday(weekParam)
  return lastCompletedWeek()
}

// GET — aperçu (calcul + synthèse IA), AUCUN envoi, AUCUNE écriture
export async function GET(req) {
  try {
    var url = new URL(req.url)
    var week = resolveWeek(url.searchParams.get('week'))
    var sb = getSupabase()
    var metrics = await buildWeeklyMetrics(sb, week)
    var synth = await synthesizeWeek(metrics)
    return NextResponse.json({ ok: true, week: week, metrics: metrics, synthesis: synth })
  } catch (e) {
    console.error('[weekly-report GET]', e)
    return NextResponse.json({ ok: false, error: String((e && e.message) || e) }, { status: 500 })
  }
}

// POST — calcul + IA + archivage + envoi email (Edward+Emy) + SMS (Edward)
export async function POST(req) {
  try {
    var body = {}
    try { body = await req.json() } catch (e) { body = {} }
    var week = resolveWeek(body.week)
    var doSend = body.send !== false
    var sb = getSupabase()
    var result = await runWeeklyReport(sb, week, doSend)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[weekly-report POST]', e)
    return NextResponse.json({ ok: false, error: String((e && e.message) || e) }, { status: 500 })
  }
}
