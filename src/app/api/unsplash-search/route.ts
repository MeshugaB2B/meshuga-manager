// FICHIER : src/app/api/unsplash-search/route.ts
// Recherche 3 photos sur Unsplash, filtrées pour favoriser les fonds clairs / isolés.

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    var body = await req.json()
    var query: string = (body.query || '').trim()
    if (!query) return NextResponse.json({ error: 'query manquant' }, { status: 400 })

    var apiKey = process.env.UNSPLASH_ACCESS_KEY
    if (!apiKey) return NextResponse.json({ error: 'UNSPLASH_ACCESS_KEY non configurée' }, { status: 500 })

    // Enrichir la query pour favoriser les photos studio fond clair (meilleur taux de détourage)
    // On garde la query brute du user + on biaise vers "isolated white background"
    var enrichedQuery = query + ' isolated white background'

    var url = 'https://api.unsplash.com/search/photos?per_page=12&orientation=squarish&query=' + encodeURIComponent(enrichedQuery)

    var res = await fetch(url, {
      headers: { 'Authorization': 'Client-ID ' + apiKey, 'Accept-Version': 'v1' }
    })

    if (!res.ok) {
      var txt = await res.text()
      return NextResponse.json({ error: 'Unsplash API erreur ' + res.status + ' : ' + txt.slice(0, 200) }, { status: 500 })
    }

    var data: any = await res.json()
    var results: any[] = data.results || []

    // Mapper en format simple : on garde les 6 premiers, le user choisira parmi 3 que le front affichera
    var photos = results.slice(0, 6).map(function(p: any) {
      return {
        id: p.id,
        thumb: p.urls && p.urls.small,
        regular: p.urls && p.urls.regular,
        full: p.urls && p.urls.full,
        author: p.user && p.user.name,
        author_url: p.user && p.user.links && p.user.links.html,
        description: p.description || p.alt_description || ''
      }
    })

    return NextResponse.json({ photos: photos })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
