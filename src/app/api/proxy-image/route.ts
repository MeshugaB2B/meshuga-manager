// FICHIER : src/app/api/proxy-image/route.ts
// Proxy simple pour récupérer une image distante (Unsplash) côté serveur,
// puis la renvoyer au client. Contourne CORS pour le traitement Canvas.

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

export async function GET(req: NextRequest) {
  try {
    var url = req.nextUrl.searchParams.get('url')
    if (!url) return NextResponse.json({ error: 'url manquant' }, { status: 400 })

    // Sécurité : on ne proxifie que les domaines Unsplash
    if (!url.includes('images.unsplash.com') && !url.includes('plus.unsplash.com')) {
      return NextResponse.json({ error: 'Domaine non autorisé' }, { status: 403 })
    }

    var res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: 'Fetch failed: ' + res.status }, { status: 500 })

    var blob = await res.blob()
    var arrayBuffer = await blob.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
