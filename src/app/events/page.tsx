// src/app/events/page.tsx
// Meshuga Events — page publique de commande des box de minis
// Accessible sur /events (puis sur events.meshuga.fr une fois le domaine branché)

import type { Metadata } from 'next'
import { ALL_MESHUGA_FONTFACES } from '@/lib/fonts'
import EventsClient from './EventsClient'
import { EVENTS_CSS } from './eventsStyles'

export const metadata: Metadata = {
  title: 'Meshuga Events — Box de mini sandwiches livrées dans Paris',
  description: 'Box de 40 mini sandwiches new-yorkais Meshuga, livrées dans Paris. Commande en ligne 48 h ouvrées à l\'avance.',
}

export default function EventsPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ALL_MESHUGA_FONTFACES + EVENTS_CSS }} />
      <EventsClient />
    </>
  )
}
