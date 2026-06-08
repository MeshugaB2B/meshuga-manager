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
      ? 'Hello ' + author + ', merci pour le retour (même si on aurait préféré te régaler) 🙏 On veut comprendre ce qui a coincé pour rectifier le tir : écris-nous à hello@meshuga.fr. \u00C0 bientôt rue Vavin, l\u2019équipe Meshuga.'
      : 'Merci ' + author + ' ! \u00C7a nous met du pastrami plein le cœur 🥪🔥 Reviens vite te régaler rue Vavin (Paris 6e) — l\u2019équipe Meshuga.'

    if (!apiKey) return NextResponse.json({ ok: true, draft: fallback })

    const prompt = 'Tu réponds aux avis Google du restaurant street-food Meshuga (Paris 6e, 3 rue Vavin) \u2014 un deli new-yorkais déjanté : pastrami, lobster roll, hot-dog, grilled cheese, Pink Limonade.\n\n'
      + 'RÈGLES :\n'
      + '1. LANGUE : détecte la langue de l\u2019avis et réponds STRICTEMENT dans cette même langue (avis en anglais \u2192 réponse en anglais, en italien \u2192 en italien, en espagnol \u2192 en espagnol, etc.).\n'
      + '2. TON : léger, fun, un brin décalé, autodérision et énergie new-yorkaise \u2014 l\u2019esprit Meshuga. Jamais corporate ni guindé.\n'
      + '3. EMOJIS : mets-en 1 à 3, bien placés (pas plus, pas de spam).\n'
      + '4. SEO local : glisse NATURELLEMENT 1 ou 2 mots-clés utiles au référencement quand ça coule de source \u2014 le plat cité par le client, "Meshuga", "rue Vavin" ou "Paris 6e", ou une de nos spécialités. JAMAIS de bourrage de mots-clés ni de liste artificielle.\n'
      + '5. FORMAT : court, 2-3 phrases. Termine par une signature type "L\u2019équipe Meshuga" (adaptée à la langue de l\u2019avis).\n\n'
      + (negative
          ? 'CONTEXTE \u2014 avis NÉGATIF : baisse l\u2019humour d\u2019un cran, reste sincère, chaleureux et humain. Remercie pour le retour, ne te justifie pas agressivement, montre que tu prends en compte, et invite à recontacter à hello@meshuga.fr pour arranger les choses. Un seul emoji discret.'
          : 'CONTEXTE \u2014 avis POSITIF : éclate-toi, sois chaleureux et donne furieusement envie de revenir.')
      + '\n\nAvis de ' + author + ' (' + rating + '/5) : "' + text + '"\n\n'
      + 'Réponds UNIQUEMENT avec le texte de la réponse, dans la langue de l\u2019avis, sans guillemets ni préambule.'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 360, messages: [{ role: 'user', content: prompt }] })
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
