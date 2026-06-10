import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()

  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: 'Clé API manquante', suggestions: [] })
  }
  if (q.length < 3) {
    return NextResponse.json({ ok: true, suggestions: [] })
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        input: q,
        languageCode: 'fr',
        includedRegionCodes: ['fr'],
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('Places autocomplete error:', JSON.stringify(data).slice(0, 200))
      return NextResponse.json({ ok: false, error: 'Service indisponible', suggestions: [] })
    }
    const suggestions = (data.suggestions || [])
      .map(function (s: any) {
        const p = s.placePrediction
        if (!p) return null
        const text = (p.text && p.text.text) || ''
        return { text: text, placeId: p.placeId || '' }
      })
      .filter(function (x: any) { return x && x.text })
      .slice(0, 6)
    return NextResponse.json({ ok: true, suggestions: suggestions })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: (e && e.message) || 'Erreur', suggestions: [] })
  }
}
