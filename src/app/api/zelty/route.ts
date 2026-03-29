import { NextResponse } from 'next/server'

const ZELTY_BASE = 'https://api.zelty.fr/2.10'
const ZELTY_KEY = process.env.ZELTY_API_KEY || ''

async function zeltyFetch(path) {
  const res = await fetch(ZELTY_BASE + path, {
    headers: {
      'Authorization': 'Bearer ' + ZELTY_KEY,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 } // cache 5 min
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error('Zelty ' + res.status + ': ' + err)
  }
  return res.json()
}

function getDateRange(period) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate())

  if (period === 'day') {
    return { from: fmt(now), to: fmt(now) }
  }
  if (period === 'week') {
    const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - dow)
    return { from: fmt(monday), to: fmt(now) }
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: fmt(first), to: fmt(now) }
  }
  if (period === 'year') {
    const first = new Date(now.getFullYear(), 0, 1)
    return { from: fmt(first), to: fmt(now) }
  }
  return { from: fmt(now), to: fmt(now) }
}

export async function GET(request) {
  if (!ZELTY_KEY) {
    return NextResponse.json({ error: 'ZELTY_API_KEY manquante dans les variables Vercel' }, { status: 500 })
  }

  try {
    // Récupère les tickets pour chaque période
    const periods = ['day', 'week', 'month', 'year']
    const statsPromises = periods.map(async function(period) {
      const range = getDateRange(period)
      try {
        const data = await zeltyFetch('/orders?from=' + range.from + '&to=' + range.to + '&limit=1000')
        const orders = data.orders || data.data || data || []
        const total = orders.reduce(function(sum, o) { return sum + (o.total || o.amount || 0) }, 0)
        const count = orders.length
        const avg = count > 0 ? total / count : 0
        return { period, total, count, avg, orders }
      } catch(e) {
        return { period, total: 0, count: 0, avg: 0, orders: [], error: e.message }
      }
    })

    const statsResults = await Promise.all(statsPromises)
    const stats = {}
    statsResults.forEach(function(s) { stats[s.period] = s })

    // Top produits du mois
    const monthOrders = stats.month.orders || []
    const productMap = {}
    monthOrders.forEach(function(order) {
      const items = order.items || order.products || order.lines || []
      items.forEach(function(item) {
        const name = item.name || item.product_name || item.label || 'Inconnu'
        const qty = item.quantity || item.qty || 1
        const price = item.unit_price || item.price || 0
        if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
        productMap[name].qty += qty
        productMap[name].revenue += qty * price
      })
    })
    const topProducts = Object.values(productMap)
      .sort(function(a, b) { return b.qty - a.qty })
      .slice(0, 8)

    // Heures de pointe (aujourd'hui + semaine)
    const todayOrders = stats.day.orders || []
    const hourMap = {}
    for (let h = 9; h <= 22; h++) hourMap[h] = 0
    todayOrders.forEach(function(order) {
      const dateStr = order.created_at || order.date || order.ordered_at || ''
      if (dateStr) {
        const hour = new Date(dateStr).getHours()
        if (hour >= 9 && hour <= 22) {
          hourMap[hour] = (hourMap[hour] || 0) + 1
        }
      }
    })
    const peakHours = Object.entries(hourMap)
      .map(function(e) { return { hour: parseInt(e[0]), count: e[1] } })
      .sort(function(a, b) { return b.count - a.count })

    return NextResponse.json({
      ok: true,
      stats: {
        day: { ca: stats.day.total, tickets: stats.day.count, avg: stats.day.avg },
        week: { ca: stats.week.total, tickets: stats.week.count, avg: stats.week.avg },
        month: { ca: stats.month.total, tickets: stats.month.count, avg: stats.month.avg },
        year: { ca: stats.year.total, tickets: stats.year.count, avg: stats.year.avg },
      },
      topProducts,
      peakHours,
      lastUpdated: new Date().toISOString(),
    })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
