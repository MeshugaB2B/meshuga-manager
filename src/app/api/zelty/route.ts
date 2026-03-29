import { NextResponse } from 'next/server'

const ZELTY_BASE = 'https://api.zelty.fr/2.10'
const ZELTY_KEY = process.env.ZELTY_API_KEY || ''

async function zeltyFetch(path) {
  const res = await fetch(ZELTY_BASE + path, {
    headers: { 'Authorization': 'Bearer ' + ZELTY_KEY, 'Content-Type': 'application/json' },
    next: { revalidate: 300 }
  })
  if (!res.ok) throw new Error('Zelty ' + res.status + ': ' + await res.text())
  return res.json()
}

function fmt(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate())
}

function getRange(period) {
  const now = new Date()
  if (period === 'day') return { from: fmt(now), to: fmt(now) }
  if (period === 'week') {
    const mon = new Date(now); mon.setDate(now.getDate() - (now.getDay()===0?6:now.getDay()-1))
    return { from: fmt(mon), to: fmt(now) }
  }
  if (period === 'month') {
    return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(now) }
  }
  if (period === 'year') {
    return { from: fmt(new Date(now.getFullYear(), 0, 1)), to: fmt(now) }
  }
  return { from: fmt(now), to: fmt(now) }
}

function getPrevRange(period) {
  const now = new Date()
  if (period === 'day') {
    const y = new Date(now); y.setDate(y.getDate()-1)
    return { from: fmt(y), to: fmt(y) }
  }
  if (period === 'week') {
    const mon = new Date(now); mon.setDate(now.getDate() - (now.getDay()===0?6:now.getDay()-1) - 7)
    const sun = new Date(mon); sun.setDate(mon.getDate()+6)
    return { from: fmt(mon), to: fmt(sun) }
  }
  if (period === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth()-1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { from: fmt(first), to: fmt(last) }
  }
  if (period === 'year') {
    return { from: fmt(new Date(now.getFullYear()-1, 0, 1)), to: fmt(new Date(now.getFullYear()-1, 11, 31)) }
  }
  return { from: fmt(now), to: fmt(now) }
}

async function fetchOrders(range) {
  try {
    const data = await zeltyFetch('/orders?from=' + range.from + '&to=' + range.to + '&limit=1000&status=closed')
    return data.orders || data.data || data || []
  } catch(e) { return [] }
}

function computeStats(orders) {
  const total = orders.reduce(function(s, o) { return s + (o.total || o.amount || o.total_price || 0) }, 0)
  const count = orders.length
  const avg = count > 0 ? total / count : 0

  // Payment methods
  const payments = {}
  orders.forEach(function(o) {
    var pms = o.payments || o.payment_methods || []
    pms.forEach(function(pm) {
      var name = pm.name || pm.type || pm.method || 'Autre'
      payments[name] = (payments[name] || 0) + (pm.amount || 0)
    })
  })

  // Channels
  const channels = {}
  orders.forEach(function(o) {
    var ch = o.channel || o.source || o.type || 'Sur place'
    channels[ch] = (channels[ch] || 0) + (o.total || o.amount || 0)
  })

  // Hour distribution
  const hours = {}
  for (var h = 9; h <= 22; h++) hours[h] = 0
  orders.forEach(function(o) {
    var dateStr = o.created_at || o.date || o.ordered_at || ''
    if (dateStr) {
      var hour = new Date(dateStr).getHours()
      if (hour >= 9 && hour <= 22) hours[hour] = (hours[hour] || 0) + 1
    }
  })

  // Top products
  const products = {}
  orders.forEach(function(o) {
    var items = o.items || o.products || o.lines || o.order_lines || []
    items.forEach(function(item) {
      var name = item.name || item.product_name || item.label || 'Inconnu'
      var qty = item.quantity || item.qty || 1
      var price = (item.unit_price || item.price || 0)
      if (!products[name]) products[name] = { name: name, qty: 0, revenue: 0 }
      products[name].qty += qty
      products[name].revenue += qty * price
    })
  })

  return { total, count, avg, payments, channels, hours, products }
}

export async function GET(request) {
  if (!ZELTY_KEY) {
    return NextResponse.json({ error: 'ZELTY_API_KEY manquante dans les variables Vercel' }, { status: 500 })
  }

  try {
    const periods = ['day', 'week', 'month', 'year']

    // Fetch all periods + previous periods in parallel
    const allFetches = []
    periods.forEach(function(p) { allFetches.push(fetchOrders(getRange(p))) })
    periods.forEach(function(p) { allFetches.push(fetchOrders(getPrevRange(p))) })

    const results = await Promise.all(allFetches)
    const currentOrders = { day: results[0], week: results[1], month: results[2], year: results[3] }
    const prevOrders = { day: results[4], week: results[5], month: results[6], year: results[7] }

    const stats = {}
    const prevStats = {}
    periods.forEach(function(p) {
      var s = computeStats(currentOrders[p])
      var ps = computeStats(prevOrders[p])
      stats[p] = { ca: s.total, tickets: s.count, avg: s.avg, payments: s.payments, channels: s.channels }
      prevStats[p] = { ca: ps.total, tickets: ps.count, avg: ps.avg }
    })

    // Compute evolution %
    const evolution = {}
    periods.forEach(function(p) {
      var prev = prevStats[p].ca
      var curr = stats[p].ca
      if (prev > 0) evolution[p] = Math.round((curr - prev) / prev * 100)
      else evolution[p] = null
    })

    // Top products (month)
    var monthStats = computeStats(currentOrders.month)
    var topProducts = Object.values(monthStats.products)
      .sort(function(a, b) { return b.qty - a.qty })
      .slice(0, 8)

    // Peak hours (today)
    var dayStats = computeStats(currentOrders.day)
    var peakHours = Object.entries(dayStats.hours)
      .map(function(e) { return { hour: parseInt(e[0]), count: e[1] } })
      .sort(function(a, b) { return b.count - a.count })

    return NextResponse.json({
      ok: true,
      stats,
      evolution,
      topProducts,
      peakHours,
      lastUpdated: new Date().toISOString(),
    })

  } catch(e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
