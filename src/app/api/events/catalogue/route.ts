// src/app/api/events/catalogue/route.ts
// Meshuga Events — catalogue public des box mini (events.meshuga.fr)
//
// GET /api/events/catalogue
// Source unique : catering_offerings (mêmes prix que les devis du dashboard).
// Tri par marge HT décroissante (règle commerciale), mais la marge et le food
// cost ne sont JAMAIS renvoyés : cette route est publique.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { EVENTS_CONFIG, earliestDeliveryDate, toIsoDate, htToTtc } from '@/lib/events/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  })

  var res = await supabase
    .from('catering_offerings')
    .select('id, subcategory, name, tagline, composition, pv_ht, tva_pct, size_pers, marge_ht, display_order')
    .eq('category', EVENTS_CONFIG.onlineCategory)
    .eq('is_active', true)

  if (res.error) {
    console.error('[events/catalogue]', res.error.message)
    return NextResponse.json({ error: 'Catalogue indisponible' }, { status: 500 })
  }

  var rows = (res.data || []).slice()
  rows.sort(function (a: any, b: any) {
    var ma = Number(a.marge_ht || 0)
    var mb = Number(b.marge_ht || 0)
    if (mb !== ma) return mb - ma
    return Number(a.display_order || 0) - Number(b.display_order || 0)
  })

  var boxes = rows.map(function (r: any) {
    var ht = Number(r.pv_ht || 0)
    var tva = Number(r.tva_pct || 10)
    return {
      id: r.id,
      family: r.subcategory,
      name: r.name,
      tagline: r.tagline,
      composition: r.composition,
      pieces: r.size_pers,
      priceHt: ht,
      tvaPct: tva,
      priceTtc: htToTtc(ht, tva),
    }
  })

  var body = {
    boxes: boxes,
    delivery: {
      feeHt: EVENTS_CONFIG.deliveryFeeHt,
      feeTtc: htToTtc(EVENTS_CONFIG.deliveryFeeHt, EVENTS_CONFIG.deliveryTvaPct),
      zone: EVENTS_CONFIG.deliveryZoneLabel,
    },
    earliestDate: toIsoDate(earliestDeliveryDate()),
    contact: {
      phone: EVENTS_CONFIG.phoneDisplay,
      phoneHref: EVENTS_CONFIG.phoneHref,
      email: EVENTS_CONFIG.email,
    },
  }

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
