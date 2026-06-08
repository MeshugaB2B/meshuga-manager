import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'

// Brouillon de réponse DM généré par IA (Edward valide/édite avant envoi).
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  const fallback = 'Bonjour, merci pour votre message ! On revient vers vous très vite. \u00C0 bientôt, l\u2019équipe Meshuga.'
  try {
    const body = await req.json()
    const username = String(body.username || 'le client')
    const lastMessage = String(body.lastMessage || '')
    const thread = Array.isArray(body.thread) ? body.thread : []
    if (!apiKey) return NextResponse.json({ ok: true, draft: fallback })

    const histo = thread.slice(-8).map(function (m: any) {
      return (m.fromMe ? 'Meshuga' : '@' + username) + ' : ' + (m.text || '')
    }).join('\n')

    const prompt = 'Tu g\u00E8res les messages Instagram du restaurant street-food Meshuga (Paris 6e, 3 rue Vavin), qui fait aussi du traiteur B2B sous le nom "Meshuga Events". '
      + 'R\u00E9dige UNE r\u00E9ponse courte (2-4 phrases), chaleureuse, professionnelle et naturelle, en fran\u00E7ais, au dernier message de ce client Instagram. '
      + 'Pas de flatterie excessive, pas de hashtags, pas d\u2019emoji \u00E0 outrance (un seul max). Si le client demande un devis traiteur / une commande pour un groupe, invite-le \u00E0 pr\u00E9ciser date, nombre de personnes et lieu, et propose de lui pr\u00E9parer une offre.\n\n'
      + (histo ? ('Conversation r\u00E9cente :\n' + histo + '\n\n') : '')
      + 'Dernier message du client : ' + lastMessage + '\n\n'
      + 'R\u00E9ponds UNIQUEMENT avec le texte de la r\u00E9ponse, sans guillemets ni pr\u00E9ambule.'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: 'user', content: prompt }] })
    })
    const data = await res.json()
    let txt = ''
    if (data && data.content) data.content.forEach(function (b: any) { if (b.type === 'text') txt += b.text })
    txt = txt.trim().replace(/^["']|["']$/g, '')
    return NextResponse.json({ ok: true, draft: txt || fallback })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, draft: fallback })
  }
}
