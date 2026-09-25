import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// events.meshuga.fr -> pages publiques /events (catalogue, merci, CGV)
// Tous les autres domaines (dashboard) : aucun changement.
var EVENTS_HOST = 'events.meshuga.fr'

export function middleware(request: NextRequest) {
  var host = (request.headers.get('host') || '').toLowerCase().split(':')[0]
  if (host !== EVENTS_HOST) return NextResponse.next()

  var path = request.nextUrl.pathname

  // Déjà sur les pages / API events : on laisse passer
  if (path === '/events' || path.indexOf('/events/') === 0 || path.indexOf('/api/events/') === 0) {
    return NextResponse.next()
  }

  // Adresses courtes : events.meshuga.fr/, /merci, /cgv
  if (path === '/' || path === '/merci' || path === '/cgv') {
    var url = request.nextUrl.clone()
    url.pathname = path === '/' ? '/events' : '/events' + path
    return NextResponse.rewrite(url)
  }

  // Tout le reste (dashboard, autres API) n'est pas accessible depuis ce domaine
  var home = request.nextUrl.clone()
  home.pathname = '/'
  home.search = ''
  return NextResponse.redirect(home)
}

export const config = {
  // Ignore les fichiers statiques (_next, images, polices, favicon…)
  matcher: ['/((?!_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)'],
}
