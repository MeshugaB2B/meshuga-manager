import { NextResponse } from 'next/server'
const BASE = 'https://api.zelty.fr/2.10'
const KEY = process.env.ZELTY_API_KEY || ''
async function z(path: string) {
  const r = await fetch(BASE + path, { headers: { Authorization: 'Bearer ' + KEY }, cache: 'no-store' })
  const text = await r.text()
  let data: any
  try { data = JSON.parse(text) } catch { data = text.substring(0, 300) }
  return { status: r.status, data }
}
export async function GET() {
  if (!KEY) return NextResponse.json({ error: 'no key' })
  const today = new Date().toISOString().split('T')[0]
  const mar1 = '2026-03-01'
  const [r1, r2, r3, r4, r5] = await Promise.all([
    z('/orders?from=' + mar1 + '&to=' + today + '&limit=3'),
    z('/orders?from=' + mar1 + '&to=' + today + '&limit=3&status=closed'),
    z('/analytics/sales?from=' + mar1 + '&to=' + today),
    z('/orders?from=2026-03-29&to=2026-03-29&limit=5'),
    z('/restaurants'),
  ])
  return NextResponse.json({
    no_filter: { st: r1.status, count: r1.data?.orders?.length, keys: r1.data?.orders?.[0] ? Object.keys(r1.data.orders[0]) : [], price0: r1.data?.orders?.[0]?.price },
    closed: { st: r2.status, count: r2.data?.orders?.length },
    analytics: { st: r3.status, d: r3.data },
    mar29: { st: r4.status, count: r4.data?.orders?.length, prices: r4.data?.orders?.slice(0,3).map((o:any)=>({p:o.price,src:o.source})) },
    restaurants: { st: r5.status, d: r5.data }
  })
}
