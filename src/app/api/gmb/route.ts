import { NextResponse } from 'next/server'

const PLACE_ID = 'ChIJ4xaUA7tx5kc6qN/4P1O61Q'
const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: 'Clé API manquante', mock: true, ...MOCK_DATA })
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=rating,userRatingCount,reviews,displayName&key=${API_KEY}&languageCode=fr`
    const res = await fetch(url, {
      headers: { 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,displayName' }
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      console.error('GMB error:', data)
      return NextResponse.json({ ok: false, error: data.error?.message || 'Erreur API', mock: true, ...MOCK_DATA })
    }

    const reviews = (data.reviews || []).map((r: any) => ({
      author: r.authorAttribution?.displayName || 'Anonyme',
      rating: r.rating || 5,
      text: r.text?.text || '',
      time: r.publishTime || new Date().toISOString(),
      photo: r.authorAttribution?.photoUri || null,
    }))

    return NextResponse.json({
      ok: true,
      mock: false,
      name: data.displayName?.text || 'Meshuga',
      rating: data.rating || 0,
      totalRatings: data.userRatingCount || 0,
      reviews,
    })
  } catch (e: any) {
    console.error('GMB fetch error:', e)
    return NextResponse.json({ ok: false, error: e.message, mock: true, ...MOCK_DATA })
  }
}

const MOCK_DATA = {
  name: 'Meshuga Crazy Deli',
  rating: 4.7,
  totalRatings: 312,
  reviews: [
    { author: 'Marie L.', rating: 5, text: 'Meilleur pastrami de Paris, sans hésitation. Le pain est incroyable !', time: '2026-03-15T12:00:00Z', photo: null },
    { author: 'Thomas B.', rating: 5, text: 'Ambiance New-York au coeur du 6e. Le lobster roll est une tuerie.', time: '2026-03-10T14:30:00Z', photo: null },
    { author: 'Sophie M.', rating: 4, text: 'Très bon mais un peu d\'attente le midi. Le grilled cheese vaut le détour !', time: '2026-03-05T13:00:00Z', photo: null },
    { author: 'Lucas D.', rating: 5, text: 'Parfait pour un déjeuner rapide et gourmand. Je reviens chaque semaine.', time: '2026-02-28T12:30:00Z', photo: null },
    { author: 'Emma R.', rating: 5, text: 'Le hot dog est incroyable et le service est super sympa !', time: '2026-02-20T13:15:00Z', photo: null },
  ]
}
