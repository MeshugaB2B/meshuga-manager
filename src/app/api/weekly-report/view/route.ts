import { createClient } from '@supabase/supabase-js'
import { weekFromMonday, buildWeeklyMetrics, synthesizeWeek, buildReportPage, buildPlanHtml, ackUrl, verifyWeek } from '@/lib/weeklyReport'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

function htmlResponse(html, status) {
  return new Response(html, { status: status || 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

// Page publique du rapport (lien SMS), protégée par token HMAC.
export async function GET(req) {
  var url = new URL(req.url)
  var week = url.searchParams.get('week') || ''
  var t = url.searchParams.get('t') || ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !verifyWeek(week, t)) {
    return htmlResponse('<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body style="font-family:Arial,sans-serif;padding:48px;text-align:center;color:#191923;"><div style="font-size:40px;">🔒</div><div style="font-weight:900;font-size:18px;margin-top:8px;">Lien invalide ou expiré</div></body></html>', 403)
  }
  try {
    var w = weekFromMonday(week)
    var sb = getSupabase()
    var m = await buildWeeklyMetrics(sb, w)
    var synth = await synthesizeWeek(m)

    // Récupère le plan stocké + statut de lecture
    var planHtml = ''
    var readInfo = null
    try {
      var row = await sb.from('weekly_reports').select('plan_json, read_at, read_by').eq('week_start', week).order('created_at', { ascending: false }).limit(1).single()
      if (row && row.data) {
        readInfo = { read_at: row.data.read_at, read_by: row.data.read_by }
        var pj = row.data.plan_json
        if (pj && pj.plan) {
          planHtml = buildPlanHtml(pj.plan, pj.forecast, pj.school, pj.pubHols, pj.syncedTasks, pj.planLabel, ackUrl(week))
        }
      }
    } catch (e) { /* pas de plan stocké : on affiche le bilan seul */ }

    return htmlResponse(buildReportPage(m, synth, planHtml, readInfo))
  } catch (e) {
    return htmlResponse('<!DOCTYPE html><body style="font-family:sans-serif;padding:40px;">Erreur de génération du rapport.</body>', 500)
  }
}
