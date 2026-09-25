// src/app/events/page.tsx
// Meshuga Events — page publique de commande des box de minis
// Servie sur events.meshuga.fr (middleware) et sur /events

import type { Metadata } from 'next'
import { ALL_MESHUGA_FONTFACES } from '@/lib/fonts'
import EventsClient from './EventsClient'
import { EVENTS_CSS } from './eventsStyles'

var SITE_URL = 'https://events.meshuga.fr'
var TITLE = 'Traiteur mini sandwiches Paris | Box cocktail Meshuga Events'
var DESCRIPTION = 'Box de 40 mini sandwiches new-yorkais (lobster, reuben, lox…) livrées dans Paris pour vos cocktails. Commande en ligne 48 h à l\'avance, dès 135 € HT.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: SITE_URL,
    siteName: 'Meshuga Events',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/stamp-pink.png', width: 512, height: 512, alt: 'Meshuga' }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/stamp-pink.png'],
  },
  robots: { index: true, follow: true },
}

// Données structurées (Google) : traiteur rattaché au restaurant Meshuga
var JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FoodEstablishment',
  '@id': SITE_URL + '/#traiteur',
  name: 'Meshuga Events',
  description: DESCRIPTION,
  url: SITE_URL,
  image: SITE_URL + '/stamp-pink.png',
  servesCuisine: ['Deli new-yorkais', 'Sandwiches', 'Traiteur cocktail'],
  priceRange: '€€',
  email: 'events@meshuga.fr',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '3 rue Vavin',
    postalCode: '75006',
    addressLocality: 'Paris',
    addressCountry: 'FR',
  },
  areaServed: { '@type': 'City', name: 'Paris' },
  parentOrganization: { '@type': 'Restaurant', name: 'Meshuga', url: 'https://www.meshuga.fr' },
  makesOffer: {
    '@type': 'AggregateOffer',
    priceCurrency: 'EUR',
    lowPrice: '148.50',
    highPrice: '280.50',
    offerCount: '16',
    description: 'Box de 40 mini sandwiches, prix TTC hors livraison',
  },
}

export default function EventsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ALL_MESHUGA_FONTFACES + EVENTS_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <EventsClient />
    </>
  )
}
