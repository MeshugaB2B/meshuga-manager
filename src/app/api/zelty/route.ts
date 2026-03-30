import { NextResponse } from 'next/server'
const BASE = 'https://api.zelty.fr/2.10'
const KEY = process.env.ZELTY_API_KEY || ''

function fmt(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

async function fetchOrders(from: string, to: string): Promise<any[]> {
  const all: any[] = []
  let offset = 0
  while (all.length < 5000) {
    const r = await fetch(
      BASE + '/orders?from=' + from + '&to=' + to + '&limit=100&offset=' + offset + '&status=closed',
      { headers: { Authorization: 'Bearer ' + KEY }, cache: 'no-store' }
    )
    if (!r.ok) break
    const d = await r.json()
    const batch: any[] = d.orders || d.data || (Array.isArray(d) ? d : [])
    if (!batch.length) break
    all.push(...batch)
    if (batch.length < 100) break
    offset += 100
  }
  return all
}

// Chunker par semaines pour eviter la limite API sur longues periodes
async function fetchByWeeks(from: string, to: string): Promise<any[]> {
  const all: any[] = []
  let cur = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T23:59:59')
  while (cur <= end) {
    const chunkEnd = new Date(cur)
    chunkEnd.setDate(cur.getDate() + 6)
    if (chunkEnd > end) chunkEnd.setTime(end.getTime())
    const batch = await fetchOrders(fmt(cur), fmt(chunkEnd))
    all.push(...batch)
    cur.setDate(cur.getDate() + 7)
  }
  return all
}

function computeStats(orders: any[]) {
  let ca = 0
  const ch: Record<string,number> = { deliveroo:0, ubereats:0, kiosk:0, pos:0 }
  for (const o of orders) {
    const amt = ((o.price?.final_amount_inc_tax) || 0) / 100
    ca += amt
    const src = (o.source || '').toLowerCase()
    if (src.includes('deliveroo')) ch.deliveroo += amt
    else if (src.includes('uber')) ch.ubereats += amt
    else if (src.includes('kiosk') || src.includes('borne')) ch.kiosk += amt
    else ch.pos += amt
  }
  const n = orders.length
  return { ca: Math.round(ca*100)/100, tickets: n, avg: n>0?Math.round(ca/n*100)/100:0, channels: ch }
}

function filterDate(orders: any[], from: string, to: string) {
  return orders.filter(o => {
    const d = (o.closed_at || o.created_at || '').substring(0, 10)
    return d >= from && d <= to
  })
}

export async function GET() {
  if (!KEY) return NextResponse.json({ error: 'ZELTY_API_KEY manquante' }, { status: 500 })
  try {
    const now = new Date()
    const today = fmt(now)
    const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1))
    const yearStart = fmt(new Date(now.getFullYear(), 0, 1))
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))

    // Fetch month (fonctionne bien selon tests precedents)
    const monthOrders = await fetchOrders(monthStart, today)

    // Fetch reste annee par chunks de 7 jours
    let yearOrders = [...monthOrders]
    if (monthStart > yearStart) {
      const prevYearOrders = await fetchByWeeks(yearStart, fmt(new Date(now.getFullYear(), now.getMonth(), 0)))
      yearOrders = [...prevYearOrders, ...monthOrders]
    }

    const dayOrders = filterDate(monthOrders, today, today)
    const weekOrders = filterDate(monthOrders, fmt(weekStart), today)

    const stats = {
      day: computeStats(dayOrders),
      week: computeStats(weekOrders),
      month: computeStats(monthOrders),
      year: computeStats(yearOrders),
    }

    // Evolution mois precedent
    const prevStart = fmt(new Date(now.getFullYear(), now.getMonth()-1, 1))
    const prevEnd = fmt(new Date(now.getFullYear(), now.getMonth(), 0))
    const prevOrders = filterDate(yearOrders, prevStart, prevEnd)
    const prevStats = computeStats(prevOrders)
    const evolution = prevStats.ca > 0 ? Math.round((stats.month.ca - prevStats.ca) / prevStats.ca * 100) : null

    // Peak hours semaine
    const hmap: Record<number,number> = {}
    for (let h=9; h<=22; h++) hmap[h]=0
    for (const o of weekOrders) {
      const h = new Date(o.closed_at || o.created_at || '').getHours()
      if (h>=9 && h<=22) hmap[h]++
    }
    const peakHours = Object.entries(hmap).map(([h,c])=>({hour:parseInt(h),count:c}))

    return NextResponse.json({
      ok: true, stats,
      evolution: { month: evolution },
      topProducts: [],
      peakHours,
      debug: { monthOrders: monthOrders.length, yearOrders: yearOrders.length, weekOrders: weekOrders.length, dayOrders: dayOrders.length },
      lastUpdated: new Date().toISOString()
    })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
