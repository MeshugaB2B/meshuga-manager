import { NextResponse } from 'next/server'

const PLACE_ID = 'ChIJ42mS4btvwkcROqjf-D9TutU'

export async function GET() {
  const mapsKey = process.env.GOOGLE_MAPS_SERVER_KEY || ''
  if (!mapsKey) {
    return NextResponse.json({
      ok: true, mock: true, rating: 4.6, totalRatings: 234, withoutReply: 3,
      reviews: [
        { author: 'Marine B.', rating: 5, text: 'Le meilleur Tuna Melt de Paris ! Commande pour notre team building 30 personnes, service impeccable.', date: '2026-03-28', replied: false },
        { author: 'Thomas R.', rating: 5, text: 'Pour notre reunion equipe, tout le monde a adore. Le pastrami maison est incroyable.', date: '2026-03-25', replied: true },
        { author: 'Sophie M.', rating: 4, text: 'Tres bon, le Lobster Roll est exceptionnel. Un peu attente aux heures de pointe.', date: '2026-03-22', replied: false },
        { author: 'Pierre D.', rating: 5, text: 'On commande regulierement pour nos events corporate. Qualite constante, equipe reactive.', date: '2026-03-20', replied: true },
        { author: 'Julie K.', rating: 5, text: 'Parfait pour dejeuner affaires. Le Grilled Cheese est une tuerie. Recommande !', date: '2026-03-18', replied: false },
      ]
    })
  }
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + PLACE_ID + '&fields=name,rating,user_ratings_total,reviews&language=fr&key=' + mapsKey
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    if (data.status !== 'OK') return NextResponse.json({ ok: false, error: data.status })
    const place = data.result
    const reviews = (place.reviews || []).map((r: any) => ({
      author: r.author_name, rating: r.rating, text: r.text,
      date: new Date(r.time * 1000).toISOString().split('T')[0],
      replied: false, profilePhoto: r.profile_photo_url,
    }))
    return NextResponse.json({ ok: true, mock: false, rating: place.rating, totalRatings: place.user_ratings_total, withoutReply: reviews.filter((r: any) => !r.replied).length, reviews })
  } catch (e: any) { return NextResponse.json({ ok: false, error: e.message }) }
}
