import { createClient } from '@supabase/supabase-js'
import { verifyWeek } from '@/lib/weeklyReport'
import { sendTwilioSms, normalizePhoneFR } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

function page(title, msg, ok) {
  var color = ok ? '#00A352' : '#C8166A'
  var ico = ok ? '✅' : '🔒'
  return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />'
    + '<title>' + title + '</title></head>'
    + '<body style="font-family:Arial,Helvetica,sans-serif;background:#FFFFFF;padding:48px 24px;text-align:center;color:#191923;">'
    + '<div style="max-width:420px;margin:0 auto;border:3px solid #191923;box-shadow:5px 5px 0 #191923;border-radius:10px;padding:28px;">'
    + '<div style="font-size:48px;">' + ico + '</div>'
    + '<div style="font-weight:900;font-size:20px;margin-top:8px;color:' + color + ';">' + title + '</div>'
    + '<div style="font-size:14px;margin-top:10px;line-height:1.5;color:#444;">' + msg + '</div>'
    + '</div></body></html>'
}

function htmlResponse(html, status) {
  return new Response(html, { status: status || 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
}

// Accusé de lecture du plan de la semaine (lien dans l'email/page).
export async function GET(req) {
  var url = new URL(req.url)
  var week = url.searchParams.get('week') || ''
  var t = url.searchParams.get('t') || ''
  var who = (url.searchParams.get('r') || 'emy').toLowerCase() === 'edward' ? 'Edward' : 'Emy'

  if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !verifyWeek(week, t)) {
    return htmlResponse(page('Lien invalide ou expiré', 'Ce lien de confirmation n\'est pas valide.', false), 403)
  }

  try {
    var sb = getSupabase()
    var row = await sb.from('weekly_reports').select('id, read_at').eq('week_start', week).order('created_at', { ascending: false }).limit(1).single()
    if (!row || !row.data) {
      return htmlResponse(page('Bilan introuvable', 'Impossible de retrouver le bilan de cette semaine.', false), 404)
    }

    var already = !!row.data.read_at
    if (!already) {
      await sb.from('weekly_reports').update({ read_at: new Date().toISOString(), read_by: who }).eq('id', row.data.id)
      // Notifie Edward par SMS
      try {
        var phone = normalizePhoneFR(process.env.EDWARD_NOTIFICATION_PHONE || '')
        if (phone) {
          await sendTwilioSms({ to: phone, body: 'Meshuga : ' + who + ' a confirmé avoir lu le plan de la semaine ✅' })
        }
      } catch (e) { /* notif best-effort */ }
    }

    var msg = already
      ? 'Cette lecture était déjà confirmée. Merci !'
      : 'Merci ' + who + ', ta lecture du plan de la semaine est bien enregistrée. Edward en est informé.'
    return htmlResponse(page('Lecture confirmée', msg, true))
  } catch (e) {
    return htmlResponse(page('Erreur', 'Une erreur est survenue, réessaie depuis le lien du mail.', false), 500)
  }
}
