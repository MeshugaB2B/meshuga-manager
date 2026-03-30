import { NextResponse } from 'next/server'
const BASE = 'https://api.zelty.fr/2.10'
const KEY = process.env.ZELTY_API_KEY || ''

async function fetchAllOrders(from: string, to: string): Promise<any[]> {
  const all: any[] = []
  let offset = 0
  const limit = 100
  while (true) {
    const r = await fetch(
      BASE + '/orders?from=' + from + '&to=' + to + '&limit=' + limit + '&offset=' + offset + '&status=closed',
      { headers: { Authorization: 'Bearer ' + KEY }, cache: 'no-store' }
    )
    if (!r.ok) break
    const d = await r.json()
    const orders = d.orders || d.data || (Array.isArray(d) ? d : [])
    if (!orders.length) break
    all.push(...orders)
    if (orders.length < limit) break
    offset += limit
    if (all.length > 2000) break // safety
  }
  return all
}

function fmt(d: Date) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function computeStats(orders: any[]) {
  let ca = 0, count = 0
  const channels: Record<string,number> = {deliveroo:0,ubereats:0,kiosk:0,pos:0}
  const hours: Record<number,number> = {}
  for (let h = 9; h <= 22; h++) hours[h] = 0

  for (const o of orders) {
    const price = o.price || {}
    const amount = (price.final_amount_inc_tax || 0) / 100
    ca += amount
    count++
    const src = (o.source || o.origin_name || '').toLowerCase()
    if (src.includes('deliveroo')) channels.deliveroo += amount
    else if (src.includes('uber')) channels.ubereats += amount
    else if (src.includes('kiosk') || src.includes('borne')) channels.kiosk += amount
    else channels.pos += amount

    const dt = o.closed_at || o.created_at || ''
    if (dt) {
      const h = new Date(dt).getHours()
      if (h >= 9 && h <= 22) hours[h] = (hours[h] || 0) + 1
    }
  }
  const avg = count > 0 ? ca / count : 0
  return { ca: Math.round(ca * 100) / 100, count, avg: Math.round(avg * 100) / 100, channels }
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

    const [dayOrders, weekOrders, monthOrders, yearOrders] = await Promise.all([
      fetchAllOrders(today, today),
      fetchAllOrders(fmt(weekStart), today),
      fetchAllOrders(monthStart, today),
      fetchAllOrders(yearStart, today),
    ])

    const stats = {
      day: computeStats(dayOrders),
      week: computeStats(weekOrders),
      month: computeStats(monthOrders),
      year: computeStats(yearOrders),
    }

    // Evolution mois
    const prevMonthStart = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    const prevMonthEnd = fmt(new Date(now.getFullYear(), now.getMonth(), 0))
    const prevOrders = await fetchAllOrders(prevMonthStart, prevMonthEnd)
    const prevStats = computeStats(prevOrders)
    const evolution = prevStats.ca > 0 ? Math.round((stats.month.ca - prevStats.ca) / prevStats.ca * 100) : null

    // Peak hours (today)
    const peakHours: {hour:number,count:number}[] = []
    const hmap: Record<number,number> = {}
    for (let h = 9; h <= 22; h++) hmap[h] = 0
    for (const o of dayOrders) {
      const dt = o.closed_at || o.created_at || ''
      if (dt) { const h = new Date(dt).getHours(); if (h >= 9 && h <= 22) hmap[h]++ }
    }
    for (const [h, c] of Object.entries(hmap)) peakHours.push({ hour: parseInt(h), count: c })

    return NextResponse.json({
      ok: true,
      stats: {
        day: { ca: stats.day.ca, tickets: stats.day.count, avg: stats.day.avg, channels: stats.day.channels },
        week: { ca: stats.week.ca, tickets: stats.week.count, avg: stats.week.avg, channels: stats.week.channels },
        month: { ca: stats.month.ca, tickets: stats.month.count, avg: stats.month.avg, channels: stats.month.channels },
        year: { ca: stats.year.ca, tickets: stats.year.count, avg: stats.year.avg, channels: stats.year.channels },
      },
      evolution: { month: evolution },
      topProducts: [],
      peakHours,
      lastUpdated: new Date().toISOString(),
    })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
