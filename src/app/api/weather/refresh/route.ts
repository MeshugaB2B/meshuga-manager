// app/api/weather/refresh/route.ts
// Rafraîchit la prévision météo 7j Paris 6e (Open-Meteo, gratuit, sans clé)
// Stocke dans la table weather_forecast (upsert)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=48.8456&longitude=2.3329' +
      '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,sunshine_duration,weather_code' +
      '&timezone=Europe/Paris&forecast_days=7'

    var r = await fetch(url, { cache: 'no-store' })
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: 'Open-Meteo HTTP ' + r.status }, { status: 502 })
    }
    var data = await r.json()
    var d = data.daily

    var rows = []
    for (var i = 0; i < d.time.length; i++) {
      rows.push({
        date: d.time[i],
        t_max: d.temperature_2m_max[i],
        t_min: d.temperature_2m_min[i],
        precipitation_mm: d.precipitation_sum[i] || 0,
        precipitation_hours: d.precipitation_hours[i] || 0,
        sunshine_hours: Math.round(((d.sunshine_duration[i] || 0) / 3600) * 10) / 10,
        weather_code: d.weather_code[i],
        updated_at: new Date().toISOString()
      })
    }

    var supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    var result = await supabase.from('weather_forecast').upsert(rows, { onConflict: 'date' })
    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: rows.length, refreshed_at: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
