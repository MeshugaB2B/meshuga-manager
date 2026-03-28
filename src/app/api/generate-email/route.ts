// FICHIER : src/app/api/generate-email/route.ts

import { NextRequest, NextResponse } from 'next/server'

const PRESS: Record<string, {source: string, phrase: string, url: string}> = {
  corporate: {
    source: 'Challenges',
    phrase: 'sélectionné parmi les meilleures adresses street food parisiennes',
    url: 'https://challenges.fr/meshuga',
  },
  startup: {
    source: 'Konbini',
    phrase: 'les sandwiches les plus confort du moment',
    url: 'https://konbini.com/meshuga',
  },
  evenementiel: {
    source: 'Paris Première – Très Très Bon',
    phrase: 'sélectionné par l\'émission Très Très Bon',
    url: 'https://fb.watch/meshuga-trestresbon',
  },
  luxe: {
    source: 'Télérama',
    phrase: 'street food de haut niveau près du jardin du Luxembourg',
    url: 'https://telerama.fr/meshuga',
  },
  default: {
    source: 'Télérama',
    phrase: 'street food de haut niveau près du jardin du Luxembourg',
    url: 'https://telerama.fr/meshuga',
  },
}

function getPress(cat: string) {
  if (['avocats', 'banque', 'conseil', 'immo', 'institution'].includes(cat)) return PRESS.corporate
  if (['startup', 'tech', 'coworking'].includes(cat)) return PRESS.startup
  if (cat === 'evenementiel') return PRESS.evenementiel
  if (['luxe', 'hotel'].includes(cat)) return PRESS.luxe
  return PRESS.default
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prospect, context, senderRole } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

    const cat = prospect.cat || prospect.category || ''
    const press = getPress(cat)

    const isEmy = senderRole === 'emy'
    const senderName = isEmy ? 'Emy' : 'Edward'
    const senderTitle = isEmy ? 'Tiny Boss' : 'Big Boss'
    const senderPhone = isEmy ? '+33 (0)6 24 67 78 66' : '+33 (0)6 58 58 58 01'
    const senderEmail = isEmy ? 'emy@meshuga.fr' : 'edward@meshuga.fr'

    const tone =
      ['avocats', 'banque', 'conseil', 'immo'].includes(cat) ? 'professionnel et sérieux, vouvoiement impératif' :
      ['startup', 'tech', 'coworking'].includes(cat) ? 'décontracté et direct, tutoiement possible' :
      cat === 'luxe' ? 'raffiné et élégant, vouvoiement' :
      cat === 'evenementiel' ? 'enthousiaste et pro, vouvoiement' :
      'chaleureux et professionnel, vouvoiement'

    const contactName = prospect.contacts?.[0]?.name || prospect.contact_name || 'Madame, Monsieur'

    const pressInstruction = (context.includes('premier contact') || context.includes('prise de contact') || context.includes('relance'))
      ? `Inclus cette référence presse de façon naturelle. Écris-la EXACTEMENT comme ceci, en texte brut :

${press.source} parle de nous comme de la ${press.phrase} : ${press.url}

INTERDIT : format Markdown [texte](lien), crochets, parenthèses autour du lien. Le lien doit être brut, sur la même ligne que le texte.`
      : `Pas de référence presse pour cet email — concentre-toi sur l'action : ${context}.`

    const signature = `${senderName}
${senderTitle} — Meshuga Crazy Deli
3 rue Vavin, Paris 6e
${senderEmail} | ${senderPhone}`

    const systemPrompt = `Tu es ${senderName}, ${senderTitle} de Meshuga Crazy Deli (3 rue Vavin, Paris 6e). Restaurant new-yorkais premium : pastrami maison, lobster rolls, sandwichs gastronomiques haut de gamme. Spécialisés en plateaux déjeuner B2B livrés sur tout Paris et catering événementiel.

RÈGLES ABSOLUES DE FORMATAGE :
- N'utilise JAMAIS le format Markdown [texte](lien)
- Les liens s'écrivent toujours en texte brut, directement après le texte, sans crochets ni parenthèses
- Email court : 5-7 lignes de corps maximum
- Termine TOUJOURS par cette signature exacte :

${signature}`

    const userPrompt = `Écris un email de "${context}" pour :
- Entreprise : ${prospect.name}
- Contact : ${contactName}${prospect.contacts?.[0]?.role ? ` (${prospect.contacts[0].role})` : ''}
- Secteur : ${cat || prospect.category || 'entreprise'}
- Ce qu'on propose : ${prospect.type || prospect.category || 'plateaux déjeuner et catering'}
- Argument clé : ${prospect.pitch || prospect.notes || 'service premium livraison Paris'}
- Ton : ${tone}

${pressInstruction}

Format de l'email :
Objet : [objet accrocheur]

[corps 5-7 lignes]

${signature}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `API error: ${err}` }, { status: 500 })
    }

    const data = await response.json()
    const email = data.content?.[0]?.text || ''
    return NextResponse.json({ email })

  } catch (error) {
    return NextResponse.json({ error: 'Erreur serveur : ' + String(error) }, { status: 500 })
  }
}
