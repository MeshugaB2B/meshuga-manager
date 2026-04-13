import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_FN_URL = 'https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push'

async function sendPush(title, body, target) {
  try {
    await fetch(SUPABASE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, target: target || 'all' })
    })
  } catch (e) {
    console.error('Push error:', e)
  }
}

export async function GET(req) {
  // Sécurité : vérifier le header Vercel Cron
  var authHeader = req.headers.get('authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  var supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  var today = new Date().toISOString().split('T')[0]
  var todayFr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Récupérer les événements du calendrier pour aujourd'hui
  var calRes = await supabase
    .from('cal_events')
    .select('*')
    .eq('start_date', today)
    .neq('source', 'ai_suggestion')
    .order('time', { ascending: true })

  var calEvents = calRes.data || []

  // Récupérer les devis en attente de réponse
  var devisRes = await supabase
    .from('devis')
    .select('*')
    .in('statut', ['envoye', 'a_modifier'])
    .order('created_at', { ascending: false })

  var devisAttente = devisRes.data || []

  // Construire le message pour Emy
  var emyLines = []
  var emyEvents = calEvents.filter(function(e) { return e.assignee === 'emy' || e.assignee === 'all' })
  var edwardEvents = calEvents.filter(function(e) { return e.assignee === 'edward' || e.assignee === 'all' })

  if (emyEvents.length > 0) {
    emyEvents.forEach(function(e) {
      var time = e.time ? e.time.slice(0, 5) + ' — ' : ''
      emyLines.push(time + e.title + (e.location ? ' 📍' + e.location : ''))
    })
  } else {
    emyLines.push('Pas d\'événement planifié aujourd\'hui')
  }

  // Devis urgents
  if (devisAttente.length > 0) {
    emyLines.push(devisAttente.length + ' devis en attente de réponse client')
  }

  var emyBody = emyLines.join(' · ')

  // Construire le message pour Edward
  var edwardLines = []

  if (edwardEvents.length > 0) {
    edwardEvents.forEach(function(e) {
      var time = e.time ? e.time.slice(0, 5) + ' — ' : ''
      edwardLines.push(time + e.title)
    })
  } else {
    edwardLines.push('Pas d\'événement planifié aujourd\'hui')
  }

  if (devisAttente.length > 0) {
    var totalHT = devisAttente.reduce(function(s, d) { return s + (parseFloat(d.total_ht) || 0) }, 0)
    edwardLines.push(devisAttente.length + ' devis en attente — ' + totalHT.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' € HT en jeu')
  }

  var edwardBody = edwardLines.join(' · ')

  // Envoyer les notifs
  var dayTitle = '☀️ Bonjour — ' + todayFr.charAt(0).toUpperCase() + todayFr.slice(1)

  if (emyLines.length > 0) {
    await sendPush(dayTitle, emyBody, 'emy')
  }

  if (edwardLines.length > 0) {
    await sendPush(dayTitle, edwardBody, 'edward')
  }

  return NextResponse.json({
    ok: true,
    date: today,
    emy: emyBody,
    edward: edwardBody
  })
}

// Permettre aussi un appel manuel POST depuis l'app
export async function POST() {
  var supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )

  var today = new Date().toISOString().split('T')[0]
  var todayFr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  var calRes = await supabase
    .from('cal_events')
    .select('*')
    .eq('start_date', today)
    .neq('source', 'ai_suggestion')
    .order('time', { ascending: true })

  var calEvents = calRes.data || []

  var devisRes = await supabase
    .from('devis')
    .select('*')
    .in('statut', ['envoye', 'a_modifier'])

  var devisAttente = devisRes.data || []

  var emyEvents = calEvents.filter(function(e) { return e.assignee === 'emy' || e.assignee === 'all' })
  var edwardEvents = calEvents.filter(function(e) { return e.assignee === 'edward' || e.assignee === 'all' })

  var emyLines = emyEvents.length > 0
    ? emyEvents.map(function(e) { return (e.time ? e.time.slice(0, 5) + ' — ' : '') + e.title })
    : ['Pas d\'événement planifié aujourd\'hui']

  var edwardLines = edwardEvents.length > 0
    ? edwardEvents.map(function(e) { return (e.time ? e.time.slice(0, 5) + ' — ' : '') + e.title })
    : ['Pas d\'événement planifié aujourd\'hui']

  if (devisAttente.length > 0) {
    var totalHT = devisAttente.reduce(function(s, d) { return s + (parseFloat(d.total_ht) || 0) }, 0)
    edwardLines.push(devisAttente.length + ' devis en attente — ' + totalHT.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' € HT')
    emyLines.push(devisAttente.length + ' devis en attente de réponse')
  }

  var dayTitle = '☀️ Briefing — ' + (todayFr.charAt(0).toUpperCase() + todayFr.slice(1))

  await sendPush(dayTitle, emyLines.join(' · '), 'emy')
  await sendPush(dayTitle, edwardLines.join(' · '), 'edward')

  return NextResponse.json({ ok: true, emy: emyLines, edward: edwardLines })
}
