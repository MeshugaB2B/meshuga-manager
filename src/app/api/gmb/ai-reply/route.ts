import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'

// Brouillon de réponse à un avis Google (Edward valide/édite puis colle sur Google).
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  try {
    const body = await req.json()
    const author = String(body.author || 'le client')
    const rating = Number(body.rating || 5)
    const text = String(body.text || '')
    const negative = rating <= 2

    const fallback = negative
      ? 'Bonjour ' + author + ', merci d\u2019avoir pris le temps de nous faire ce retour, et navrés que votre expérience n\u2019ait pas été à la hauteur. On aimerait comprendre ce qui s\u2019est passé pour s\u2019améliorer — n\u2019hésitez pas à nous écrire à hello@meshuga.fr. \u00C0 bientôt, l\u2019équipe Meshuga.'
      : 'Merci beaucoup ' + author + ' pour ce super retour ! Ravis que vous vous soyez régalés chez Meshuga. \u00C0 très vite rue Vavin ! L\u2019équipe Meshuga.'

    if (!apiKey) return NextResponse.json({ ok: true, draft: fallback })

    const prompt = 'Tu réponds aux avis Google du restaurant street-food Meshuga (Paris 6e, 3 rue Vavin, spécialités deli new-yorkais : pastrami, lobster roll, hot-dog, grilled cheese). '
      + 'Rédige UNE réponse courte (2-3 phrases), chaleureuse, sincère et professionnelle, en français, signée "L\u2019équipe Meshuga". '
      + 'Personnalise avec le prénom si possible. '
      + (negative
          ? 'C\u2019est un avis NÉGATIF : reste calme et empathique, remercie pour le retour, ne te justifie pas agressivement, montre que tu prends en compte, et invite à recontacter à hello@meshuga.fr pour arranger les choses. Ne promets rien d\u2019irréaliste.'
          : 'C\u2019est un avis POSITIF : remercie chaleureusement et donne envie de revenir, sans en faire trop, sans flatterie excessive, un seul emoji maximum.')
      + '\n\nAvis de ' + author + ' (' + rating + '/5) : "' + text + '"\n\n'
      + 'Réponds UNIQUEMENT avec le texte de la réponse, sans guillemets ni préambule.'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 320, messages: [{ role: 'user', content: prompt }] })
    })
    const data = await res.json()
    let txt = ''
    if (data && data.content) data.content.forEach(function (b: any) { if (b.type === 'text') txt += b.text })
    txt = txt.trim().replace(/^["']|["']$/g, '')
    return NextResponse.json({ ok: true, draft: txt || fallback })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
