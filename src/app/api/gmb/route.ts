import { NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: 'Clé API manquante', mock: true, ...MOCK_DATA })
  }

  try {
    // Step 1: Find Place ID via text search
    const searchRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount',
        },
        body: JSON.stringify({
          textQuery: 'Meshuga Crazy Deli 3 rue Vavin Paris',
          languageCode: 'fr',
        }),
      }
    )

    const searchData = await searchRes.json()
    
    if (!searchRes.ok || !searchData.places || searchData.places.length === 0) {
      console.error('GMB search error:', JSON.stringify(searchData))
      return NextResponse.json({ ok: false, error: 'Lieu non trouvé: ' + JSON.stringify(searchData).slice(0,200), mock: true, ...MOCK_DATA })
    }

    const place = searchData.places[0]
    const placeId = place.id

    // Step 2: Get reviews for this place
    const detailRes = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews',
        },
      }
    )

    const detailData = await detailRes.json()

    if (!detailRes.ok) {
      console.error('GMB detail error:', JSON.stringify(detailData))
      return NextResponse.json({
        ok: true,
        mock: false,
        name: place.displayName?.text || 'Meshuga',
        rating: place.rating || 0,
        totalRatings: place.userRatingCount || 0,
        reviews: [],
        placeId,
      })
    }

    const reviews = (detailData.reviews || []).map((r: any) => ({
      author: r.authorAttribution?.displayName || 'Anonyme',
      rating: r.rating || 5,
      text: r.text?.text || '',
      time: r.publishTime || new Date().toISOString(),
      photo: r.authorAttribution?.photoUri || null,
    }))

    return NextResponse.json({
      ok: true,
      mock: false,
      name: detailData.displayName?.text || 'Meshuga',
      rating: detailData.rating || 0,
      totalRatings: detailData.userRatingCount || 0,
      reviews,
      placeId,
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
