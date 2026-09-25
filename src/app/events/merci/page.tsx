// src/app/events/merci/page.tsx
// Meshuga Events — page de retour après paiement SumUp

import type { Metadata } from 'next'
import { ALL_MESHUGA_FONTFACES } from '@/lib/fonts'
import { EVENTS_CSS } from '../eventsStyles'
import MerciClient from './MerciClient'

export const metadata: Metadata = {
  title: 'Commande Meshuga Events',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function MerciPage(props: { searchParams: { ref?: string } }) {
  var ref = props && props.searchParams && props.searchParams.ref ? String(props.searchParams.ref).slice(0, 30) : ''
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ALL_MESHUGA_FONTFACES + EVENTS_CSS }} />
      <MerciClient reference={ref} />
    </>
  )
}
