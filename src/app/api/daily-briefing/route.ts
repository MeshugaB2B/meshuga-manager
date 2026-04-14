import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_FN_URL = 'https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push'

async function sendPush(title: string, body: string, target: string) {
  try {
    await fetch(SUPABASE_FN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, target: target || 'all' })
    })
  } catch (e) { console.error('Push error:', e) }
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

async function getAiConseil(role: string, context: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Tu es un coach B2B pour Meshuga Crazy Deli, un deli new-yorkais à Paris. ${role === 'emy' ? 'Emy est commerciale terrain.' : 'Edward est le fondateur.'} Contexte du jour : ${context}. Donne UN conseil business très court et concret (1 phrase max, percutant, actionnable aujourd'hui). Commence directement par le conseil, sans intro.`
        }]
      })
    })
    const data = await res.json()
    return data.content?.[0]?.text?.trim() || ''
  } catch (e) {
    return ''
  }
}

async function buildBriefing(supabase: any, role: string) {
  const today = new Date().toISOString().split('T')[0]
  const todayFr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const prenom = role === 'emy' ? 'Emy' : 'Edward'

  // Événements du jour
  const { data: calEvents } = await supabase
    .from('cal_events')
    .select('*')
    .eq('start_date', today)
    .neq('source', 'ai_suggestion')
    .or(`assignee.eq.${role},assignee.eq.all`)
    .order('time', { ascending: true })

  // Tâches du jour (assigned_to = UUID du role)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', role)
    .single()
  var profileId = profileData?.id
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, priority')
    .eq('assigned_to', profileId || '')
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(5)

  // Devis en attente
  const { data: devisAttente } = await supabase
    .from('devis')
    .select('*')
    .in('statut', ['envoye', 'a_modifier'])

  // Prospects à contacter aujourd'hui (relances)
  const { data: prospects } = await supabase
    .from('prospects')
    .select('name, next_contact_date')
    .lte('next_contact_date', today)
    .eq('status', 'actif')
    .limit(3)

  const lines: string[] = []

  // Événements
  if (calEvents && calEvents.length > 0) {
    calEvents.forEach((e: any) => {
      const time = e.time ? e.time.slice(0, 5) + ' — ' : ''
      lines.push(time + e.title + (e.location ? ' 📍' + e.location : ''))
    })
  } else {
    lines.push('Aucun événement planifié')
  }

  // Tâches
  if (tasks && tasks.length > 0) {
    lines.push('📋 ' + tasks.map((t: any) => t.title).join(', '))
  }

  // Relances Emy
  if (role === 'emy' && prospects && prospects.length > 0) {
    lines.push('📞 Relances : ' + prospects.map((p: any) => p.name).join(', '))
  }

  // Devis Edward + tâches Emy visibles par Edward
  if (role === 'edward') {
    if (devisAttente && devisAttente.length > 0) {
      const totalHT = devisAttente.reduce((s: number, d: any) => s + (parseFloat(d.total_ht) || 0), 0)
      lines.push(`📄 ${devisAttente.length} devis en attente — ${totalHT.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € HT`)
    }
    // Tâches d'Emy aujourd'hui
    const { data: emyProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'emy')
      .single()
    const { data: emyTasks } = await supabase
      .from('tasks')
      .select('title, priority')
      .eq('assigned_to', emyProfile?.id || '')
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(5)
    if (emyTasks && emyTasks.length > 0) {
      lines.push("👩 Emy aujourd'hui : " + emyTasks.map((t: any) => t.title).join(', '))
    }
    // Prospects qu Emy doit relancer
    const { data: emyProspects } = await supabase
      .from('prospects')
      .select('name, temperature')
      .lte('next_contact_date', today)
      .neq('status', 'won')
      .neq('status', 'lost')
      .limit(5)
    if (emyProspects && emyProspects.length > 0) {
      const chauds = emyProspects.filter((p: any) => p.temperature === 'chaud')
      if (chauds.length > 0) lines.push('🔥 Relances urgentes Emy : ' + chauds.map((p: any) => p.name).join(', '))
      else lines.push('📞 Relances Emy : ' + emyProspects.map((p: any) => p.name).join(', '))
    }
  }

  // Top 3 priorités IA pour Emy
  if (role === 'emy' && prospects && prospects.length > 0) {
    try {
      var top3Res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 150,
          messages: [{ role: 'user', content: 'Commerciale B2B Meshuga Crazy Deli Paris. Prospects actifs : ' + JSON.stringify(prospects.slice(0,10).map(function(p: any){return {name:p.name,status:p.status,temp:p.temperature,nextDate:p.next_contact_date}})) + '. Donne les 3 prospects les plus prioritaires à contacter aujourd hui avec 1 raison courte chacun. Format: "1. NOM — raison · 2. NOM — raison · 3. NOM — raison". Sois direct.' }]
        })
      })
      var top3Data = await top3Res.json()
      var top3 = top3Data.content?.[0]?.text?.trim() || ''
      if (top3) lines.push('🎯 Top 3 : ' + top3)
    } catch(e) {}
  }

  const context = lines.join('. ')
  const conseil = await getAiConseil(role, context)
  if (conseil) lines.push('🧠 ' + conseil)

  const title = `🌭 Bonjour ${prenom} — ${todayFr.charAt(0).toUpperCase() + todayFr.slice(1)}`
  const body = lines.join('\n')
  return { title, body }
}

export async function GET(req: Request) {
  const supabase = getSupabase()
  const [edward, emy] = await Promise.all([
    buildBriefing(supabase, 'edward'),
    buildBriefing(supabase, 'emy')
  ])
  await Promise.all([
    sendPush(edward.title, edward.body, 'edward'),
    sendPush(emy.title, emy.body, 'emy')
  ])
  return NextResponse.json({ ok: true, edward, emy })
}

export async function POST() {
  const supabase = getSupabase()
  const [edward, emy] = await Promise.all([
    buildBriefing(supabase, 'edward'),
    buildBriefing(supabase, 'emy')
  ])
  await Promise.all([
    sendPush(edward.title, edward.body, 'edward'),
    sendPush(emy.title, emy.body, 'emy')
  ])
  return NextResponse.json({ ok: true, edward, emy })
}
