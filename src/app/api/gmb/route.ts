import { NextResponse } from 'next/server'

const PLACE_ID = 'ChIJ42mS4btvwkcROqjf-D9TutU'

export async function GET() {
  const mapsKey = process.env.GOOGLE_MAPS_SERVER_KEY || ''
  if (!mapsKey) {
    const mockReviews = [
      { author: 'Sophie M.', rating: 4, text: 'Tres bon, le Lobster Roll est exceptionnel. Un peu d\'attente aux heures de pointe mais ca vaut le coup.', date: '2026-03-31', replied: true, reply_text: 'Merci Sophie ! On travaille sur les temps d\'attente. A bientot !' },
      { author: 'Marine B.', rating: 5, text: 'Le meilleur Tuna Melt de Paris ! Commande pour notre team building 30 personnes, service impeccable et ponctuel.', date: '2026-03-28', replied: false },
      { author: 'Antoine L.', rating: 5, text: 'Incroyable. Le pastrami est une revelation, du vrai New York dans le 6e. On reviendra chaque semaine.', date: '2026-03-26', replied: true, reply_text: 'Merci Antoine, on vous attend avec plaisir !' },
      { author: 'Thomas R.', rating: 5, text: 'Pour notre reunion equipe, tout le monde a adore. Le pastrami maison est incroyable et la livraison a l\'heure.', date: '2026-03-25', replied: true, reply_text: 'Super content que vos equipes aient apprecie ! N\'hesitez pas pour vos prochains events.' },
      { author: 'Julie K.', rating: 5, text: 'Parfait pour dejeuner affaires. Le Grilled Cheese est une tuerie. Je recommande a tous mes collegues.', date: '2026-03-22', replied: false },
      { author: 'Pierre D.', rating: 5, text: 'On commande regulierement pour nos events corporate. Qualite constante, equipe reactive. Partenaire de confiance.', date: '2026-03-20', replied: true, reply_text: 'Merci Pierre, c\'est un plaisir de travailler avec vous !' },
      { author: 'Claire V.', rating: 4, text: 'Tres bonne adresse pour un plateau repas. Le Chicken Caesar est frais et equilibre. Prix un peu eleves mais justifies.', date: '2026-03-17', replied: false },
      { author: 'Maxime B.', rating: 5, text: 'Le Hot Dog new-yorkais est authentique, comme a Manhattan. Bravo pour la qualite des produits.', date: '2026-03-14', replied: false },
      { author: 'Isabelle T.', rating: 3, text: 'Bon produit mais temps d\'attente un peu long pour un service rapide. Peut mieux faire sur ce point.', date: '2026-03-10', replied: true, reply_text: 'Merci Isabelle pour votre retour honnete. On ameliore nos temps de service, a bientot !' },
      { author: 'Lucas M.', rating: 5, text: 'Le meilleur Smoked Salmon de la rive gauche. Frais, genereux, parfait. Ma nouvelle cantine.', date: '2026-03-08', replied: false },
    ]
    const sorted = mockReviews.sort(function(a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime() })
    return NextResponse.json({
      ok: true, mock: true, rating: 4.6, totalRatings: 234,
      withoutReply: sorted.filter(function(r) { return !r.replied }).length,
      reviews: sorted
    })
  }
  try {
    const url = 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + PLACE_ID + '&fields=name,rating,user_ratings_total,reviews&language=fr&key=' + mapsKey
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    if (data.status !== 'OK') return NextResponse.json({ ok: false, error: data.status })
    const place = data.result
    const reviews = (place.reviews || []).map(function(r: any) {
      return {
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        date: new Date(r.time * 1000).toISOString().split('T')[0],
        replied: !!(r.owner_reply && r.owner_reply.text),
        reply_text: r.owner_reply ? r.owner_reply.text : null,
        profilePhoto: r.profile_photo_url,
      }
    }).sort(function(a: any, b: any) { return new Date(b.date).getTime() - new Date(a.date).getTime() })
    return NextResponse.json({
      ok: true, mock: false,
      rating: place.rating,
      totalRatings: place.user_ratings_total,
      withoutReply: reviews.filter(function(r: any) { return !r.replied }).length,
      reviews
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
