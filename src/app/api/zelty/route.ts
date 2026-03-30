import { NextResponse } from 'next/server'
const BASE = 'https://api.zelty.fr/2.10'
const KEY = process.env.ZELTY_API_KEY || ''

function fmt(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

async function fetchAllOrders(from: string, to: string): Promise<any[]> {
  const all: any[] = []
  let offset = 0
  const limit = 100
  while (all.length < 2000) {
    const url = BASE + '/orders?from=' + from + '&to=' + to + '&limit=' + limit + '&offset=' + offset + '&status=closed'
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + KEY }, cache: 'no-store' })
    if (!r.ok) break
    const d = await r.json()
    const orders: any[] = d.orders || d.data || (Array.isArray(d) ? d : [])
    if (!orders.length) break
    all.push(...orders)
    if (orders.length < limit) break
    offset += limit
  }
  return all
}

function computeStats(orders: any[]) {
  let ca = 0
  const channels: Record<string,number> = { deliveroo:0, ubereats:0, kiosk:0, pos:0 }
  for (const o of orders) {
    const amount = ((o.price?.final_amount_inc_tax) || 0) / 100
    ca += amount
    const src = (o.source || '').toLowerCase()
    if (src.includes('deliveroo')) channels.deliveroo += amount
    else if (src.includes('uber')) channels.ubereats += amount
    else if (src.includes('kiosk') || src.includes('borne')) channels.kiosk += amount
    else channels.pos += amount
  }
  const count = orders.length
  return {
    ca: Math.round(ca * 100) / 100,
    tickets: count,
    avg: count > 0 ? Math.round(ca / count * 100) / 100 : 0,
    channels
  }
}

function filterByDate(orders: any[], from: string, to: string) {
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
    const yearStart = fmt(new Date(now.getFullYear(), 0, 1))
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))

    // Un seul appel large : toute l'annee
    const yearOrders = await fetchAllOrders(yearStart, today)

    // Filtrer cote code pour chaque periode
    const dayOrders = filterByDate(yearOrders, today, today)
    const weekOrders = filterByDate(yearOrders, fmt(weekStart), today)
    const monthStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1))
    const monthOrders = filterByDate(yearOrders, monthStart, today)

    const stats = {
      day: computeStats(dayOrders),
      week: computeStats(weekOrders),
      month: computeStats(monthOrders),
      year: computeStats(yearOrders),
    }

    // Evolution vs mois precedent
    const prevMonthStart = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const prevMonthEnd = fmt(new Date(now.getFullYear(), now.getMonth(), 0))
    const prevMonth = computeStats(filterByDate(yearOrders, prevMonthStart, prevMonthEnd))
    const evolution = prevMonth.ca > 0 ? Math.round((stats.month.ca - prevMonth.ca) / prevMonth.ca * 100) : null

    // Heures de pointe (semaine)
    const hmap: Record<number,number> = {}
    for (let h = 9; h <= 22; h++) hmap[h] = 0
    for (const o of weekOrders) {
      const dt = o.closed_at || o.created_at || ''
      if (dt) { const h = new Date(dt).getHours(); if (h >= 9 && h <= 22) hmap[h]++ }
    }
    const peakHours = Object.entries(hmap).map(([h, c]) => ({ hour: parseInt(h), count: c }))

    return NextResponse.json({
      ok: true,
      stats,
      evolution: { month: evolution },
      topProducts: [],
      peakHours,
      debug: { totalYearOrders: yearOrders.length },
      lastUpdated: new Date().toISOString(),
    })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
