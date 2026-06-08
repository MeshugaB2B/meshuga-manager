import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
const SEARCH_QUERY = 'Meshuga 3 rue Vavin 75006 Paris'

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ ok: false, error: 'Clé API manquante', mock: true, ...MOCK_DATA })
  }

  try {
    // 1) Trouver le placeId (Places API New)
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount',
      },
      body: JSON.stringify({ textQuery: SEARCH_QUERY, languageCode: 'fr' }),
    })
    const searchData = await searchRes.json()
    if (!searchRes.ok || !searchData.places || !searchData.places.length) {
      console.error('GMB search error:', JSON.stringify(searchData).slice(0, 200))
      return NextResponse.json({ ok: false, error: 'Lieu non trouvé', mock: true, ...MOCK_DATA })
    }

    const place = searchData.places[0]
    const placeId = place.id
    let name = (place.displayName && place.displayName.text) || 'Meshuga'
    let rating = place.rating || 0
    let totalRatings = place.userRatingCount || 0
    let reviews: any[] = []

    // 2a) Avis LES PLUS RÉCENTS via l'API legacy (reviews_sort=newest)
    try {
      const legacyRes = await fetch(
        'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + encodeURIComponent(placeId) +
        '&fields=name,rating,user_ratings_total,reviews&reviews_sort=newest&language=fr&key=' + API_KEY
      )
      const legacy = await legacyRes.json()
      if (legacy.status === 'OK' && legacy.result) {
        if (legacy.result.rating) rating = legacy.result.rating
        if (legacy.result.user_ratings_total) totalRatings = legacy.result.user_ratings_total
        if (legacy.result.name) name = legacy.result.name
        reviews = (legacy.result.reviews || []).map(function (r: any) {
          return {
            author: r.author_name || 'Anonyme',
            rating: r.rating || 5,
            text: r.text || '',
            time: r.time ? new Date(r.time * 1000).toISOString() : new Date().toISOString(),
            photo: r.profile_photo_url || null,
          }
        })
      }
    } catch (e) { /* fallback ci-dessous */ }

    // 2b) Fallback : API New (avis "les plus pertinents") si legacy indisponible
    if (!reviews.length) {
      const detailRes = await fetch('https://places.googleapis.com/v1/places/' + placeId, {
        headers: { 'X-Goog-Api-Key': API_KEY, 'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews' },
      })
      const detailData = await detailRes.json()
      if (detailRes.ok) {
        if (detailData.rating) rating = detailData.rating
        if (detailData.userRatingCount) totalRatings = detailData.userRatingCount
        if (detailData.displayName && detailData.displayName.text) name = detailData.displayName.text
        reviews = (detailData.reviews || []).map(function (r: any) {
          return {
            author: (r.authorAttribution && r.authorAttribution.displayName) || 'Anonyme',
            rating: r.rating || 5,
            text: (r.text && r.text.text) || '',
            time: r.publishTime || new Date().toISOString(),
            photo: (r.authorAttribution && r.authorAttribution.photoUri) || null,
          }
        })
      }
    }

    // Tri du plus récent au plus ancien
    reviews.sort(function (a: any, b: any) { return new Date(b.time).getTime() - new Date(a.time).getTime() })

    return NextResponse.json({
      ok: true,
      mock: false,
      name,
      rating,
      totalRatings,
      reviews,
      placeId,
      reviewsUrl: 'https://search.google.com/local/reviews?placeid=' + placeId,
      manageUrl: 'https://business.google.com/reviews',
      fetchedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('GMB fetch error:', e)
    return NextResponse.json({ ok: false, error: e.message, mock: true, ...MOCK_DATA })
  }
}

const MOCK_DATA = {
  name: 'Meshuga',
  rating: 4.7,
  totalRatings: 312,
  reviews: [
    { author: 'Marie L.', rating: 5, text: 'Meilleur pastrami de Paris, sans hésitation. Le pain est incroyable !', time: '2026-03-15T12:00:00Z', photo: null },
    { author: 'Thomas B.', rating: 5, text: 'Ambiance New-York au coeur du 6e. Le lobster roll est une tuerie.', time: '2026-03-10T14:30:00Z', photo: null },
    { author: 'Sophie M.', rating: 4, text: 'Très bon mais un peu d\u2019attente le midi. Le grilled cheese vaut le détour !', time: '2026-03-05T13:00:00Z', photo: null },
  ],
}
