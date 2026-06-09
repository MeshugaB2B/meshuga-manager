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
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount,places.googleMapsUri',
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
    const reviewsUrl = 'https://search.google.com/local/reviews?placeid=' + placeId
    const placeMapsUri = place.googleMapsUri || reviewsUrl
    let name = (place.displayName && place.displayName.text) || 'Meshuga'
    let rating = place.rating || 0
    let totalRatings = place.userRatingCount || 0
    let reviews: any[] = []

    // 2) Détails + avis avec lien direct par avis (reviews.googleMapsUri)
    const detailRes = await fetch('https://places.googleapis.com/v1/places/' + placeId, {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews.rating,reviews.text,reviews.originalText,reviews.authorAttribution,reviews.publishTime,reviews.googleMapsUri',
      },
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
          text: (r.text && r.text.text) || (r.originalText && r.originalText.text) || '',
          time: r.publishTime || new Date().toISOString(),
          photo: (r.authorAttribution && r.authorAttribution.photoUri) || null,
          reviewUrl: r.googleMapsUri || placeMapsUri,
        }
      })
    } else {
      console.error('GMB details error:', JSON.stringify(detailData).slice(0, 200))
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
      reviewsUrl,
      mapsUrl: placeMapsUri,
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
    { author: 'Marie L.', rating: 5, text: 'Meilleur pastrami de Paris, sans hésitation. Le pain est incroyable !', time: '2026-03-15T12:00:00Z', photo: null, reviewUrl: 'https://www.google.com/maps' },
    { author: 'Thomas B.', rating: 5, text: 'Ambiance New-York au coeur du 6e. Le lobster roll est une tuerie.', time: '2026-03-10T14:30:00Z', photo: null, reviewUrl: 'https://www.google.com/maps' },
    { author: 'Sophie M.', rating: 4, text: 'Très bon mais un peu d\u2019attente le midi. Le grilled cheese vaut le détour !', time: '2026-03-05T13:00:00Z', photo: null, reviewUrl: 'https://www.google.com/maps' },
  ],
}
