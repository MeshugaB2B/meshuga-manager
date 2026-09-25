// src/app/api/events/confirm/route.ts
// Meshuga Events — confirmation du paiement SumUp
//
// GET  /api/events/confirm?ref=WEB-2026-1234  -> appelé par la page « merci »
// POST /api/events/confirm                    -> webhook SumUp { id, event_type }
//
// Dans les deux cas on redemande le statut à SumUp avant de marquer la
// commande payée : on ne croit jamais un message entrant sur parole.

import { NextRequest, NextResponse } from 'next/server'
import { finalizeWebOrder, getSupabaseAdmin } from '@/lib/events/sumup'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function GET(req: NextRequest) {
  var ref = (req.nextUrl.searchParams.get('ref') || '').trim().slice(0, 30)
  if (!/^WEB-\d{4}-\d{4}$/.test(ref)) {
    return NextResponse.json({ status: 'NOT_FOUND' }, { status: 404 })
  }
  try {
    var r: any = await finalizeWebOrder(ref)
    var d = r.devis
    return NextResponse.json({
      status: r.status,
      numero: ref,
      date: d ? d.event_date : null,
      hour: d ? d.event_hour : null,
      totalTtc: d ? Number(d.total_ttc || 0) : null,
      email: d ? d.client_email : null,
    })
  } catch (e: any) {
    console.error('[events/confirm GET]', e && e.message)
    return NextResponse.json({ status: 'ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  var body: any = null
  try { body = await req.json() } catch (e) { body = null }
  var checkoutId = body && body.id ? String(body.id).slice(0, 80) : ''
  if (!checkoutId) return NextResponse.json({ ok: true })

  try {
    var supabase = getSupabaseAdmin()
    var q = await supabase
      .from('devis')
      .select('numero')
      .eq('send_mode', 'web')
      .eq('config_data->>sumup_checkout_id', checkoutId)
      .maybeSingle()
    if (q.data && q.data.numero) {
      await finalizeWebOrder(q.data.numero)
    }
  } catch (e: any) {
    console.error('[events/confirm POST]', e && e.message)
  }
  // SumUp attend un 2xx, sinon il renvoie le webhook en boucle
  return NextResponse.json({ ok: true })
}
