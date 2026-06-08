import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'

// Brouillon de réponse à un avis Google, dans le ton Meshuga (Edward valide/édite puis colle sur Google).
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY || ''
  try {
    const body = await req.json()
    const author = String(body.author || 'toi')
    const rating = Number(body.rating || 5)
    const text = String(body.text || '')
    const negative = rating <= 2

    const fallback = negative
      ? 'Hello ' + author + ', merci d\u2019avoir pris le temps de nous écrire \u2014 même si là, clairement, on n\u2019a pas assuré 😅. On prend tes remarques très au sérieux et on va tout mettre en œuvre pour que ça soit à la hauteur la prochaine fois. Écris-nous à hello@meshuga.fr, on adorerait te refaire goûter notre deli new-yorkais du 3 rue Vavin dans de meilleures conditions 🙏. \u00C0 très vite, Meshuga Team.'
      : 'Yes ' + author + ' !! 🤩 Ton message nous a fait plus sourire que notre Egg Salad un lundi matin. Trop heureux que tu te sois régalé chez Meshuga, notre petit deli street food du 3 rue Vavin (Paris 6) ! Reviens vite te jeter sur un Tuna Melt ultra fondant ou un hot dog bien généreux 🌭🔥. \u00C0 très bientôt pour une nouvelle dose de kiff street food ! Meshuga Team'

    if (!apiKey) return NextResponse.json({ ok: true, draft: fallback })

    const prompt = 'Tu rédiges les réponses aux avis Google de Meshuga \u2014 un deli street food new-yorkais déjanté à Paris 6 (3 rue Vavin, près du jardin du Luxembourg). Spécialités : pastrami, Tuna Melt, Reuben, lobster roll, grilled cheese, hot dog, frites maison, Pink Limonade.\n\n'
      + 'STYLE MAISON (très important, respecte-le à la lettre) :\n'
      + '- Tutoiement, toujours. Commence par le prénom ou le pseudo du client.\n'
      + '- Ton FUN, généreux, plein d\u2019énergie new-yorkaise, d\u2019autodérision et de second degré. Décalé, jamais corporate, jamais plat.\n'
      + '- Longueur : 4 à 6 phrases, ça doit respirer la bonne humeur (pas une réponse expédiée).\n'
      + '- Name-droppe des plats avec des adjectifs gourmands (ex : "Tuna Melt ultra fondant", "hot dog bien généreux", "grilled cheese qui fond", "pastrami de folie"). Reprends le plat cité par le client si possible.\n'
      + '- Emojis : 2 à 4, bien sentis.\n'
      + '- Glisse NATURELLEMENT des mots-clés SEO local : "Meshuga", "3 rue Vavin", "Paris 6", "deli", "street food new-yorkaise". Sans bourrage, ça doit rester fluide et drôle.\n'
      + '- Termine par une accroche type "\u00C0 très bientôt pour une nouvelle dose de kiff street food !" suivie de la signature "Meshuga Team" (adapte l\u2019accroche et la signature à la langue de l\u2019avis).\n'
      + '- LANGUE : détecte la langue de l\u2019avis et réponds STRICTEMENT dans cette langue (anglais \u2192 anglais, italien \u2192 italien, espagnol \u2192 espagnol, etc.), en gardant exactement le même esprit fun.\n\n'
      + (negative
          ? 'CAS PARTICULIER \u2014 avis NÉGATIF (' + rating + '/5) : garde la chaleur et un soupçon d\u2019humour léger, mais ajoute de la sincérité et de l\u2019humilité. Reconnais le souci sans te justifier agressivement ni rendre la pique, remercie pour le retour, et invite gentiment à recontacter à hello@meshuga.fr pour se rattraper. Reste classe et humain.'
          : 'CAS \u2014 avis POSITIF (' + rating + '/5) : lâche-toi, sois chaleureux, drôle et donne furieusement envie de revenir.')
      + '\n\nAvis de ' + author + ' (' + rating + '/5) : "' + text + '"\n\n'
      + 'Rédige UNIQUEMENT le texte de la réponse, dans la langue de l\u2019avis, sans guillemets ni préambule.'

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 600, messages: [{ role: 'user', content: prompt }] })
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
