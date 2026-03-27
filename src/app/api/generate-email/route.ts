// FICHIER : src/app/api/generate-email/route.ts

import { NextRequest, NextResponse } from 'next/server'

const PRESS = {
  corporate: {
    source: 'Challenges',
    quote: 'les nouvelles adresses de street food à découvrir à Paris',
    url: 'https://www.challenges.fr/lifestyle/les-nouvelles-adresses-de-street-food-a-decouvrir-cet-ete-a-paris_860036',
  },
  startup: {
    source: 'Konbini',
    quote: 'les sandwiches les plus confort du moment',
    url: 'https://www.konbini.com/food/on-a-teste-meshuga-le-deli-aux-sandwiches-les-plus-confort-du-moment/',
  },
  evenementiel: {
    source: 'Paris Première – Très Très Bon',
    quote: 'sélectionné par Paris Première',
    url: 'https://www.facebook.com/watch/?v=648051137321383',
  },
  luxe: {
    source: 'Télérama',
    quote: 'de la street food de haut niveau près du jardin du Luxembourg',
    url: 'https://www.telerama.fr/restos-loisirs/meshuga-de-la-street-food-de-haut-niveau-pres-du-jardin-du-luxembourg_cri-7043251.php',
  },
  default: {
    source: 'Télérama',
    quote: 'de la street food de haut niveau près du jardin du Luxembourg',
    url: 'https://www.telerama.fr/restos-loisirs/meshuga-de-la-street-food-de-haut-niveau-pres-du-jardin-du-luxembourg_cri-7043251.php',
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
    const { prospect, context } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })
    }

    const cat = prospect.cat || prospect.category || ''
    const press = getPress(cat)

    const tone =
      ['avocats', 'banque', 'conseil', 'immo'].includes(cat)
        ? 'professionnel et sérieux, vouvoiement impératif'
        : ['startup', 'tech', 'coworking'].includes(cat)
        ? 'décontracté et direct, tutoiement possible'
        : cat === 'luxe'
        ? 'raffiné et élégant, vouvoiement'
        : cat === 'evenementiel'
        ? 'enthousiaste et pro, vouvoiement'
        : 'chaleureux et professionnel, vouvoiement'

    const contactName =
      prospect.contacts?.[0]?.name ||
      prospect.contact_name ||
      'Madame, Monsieur'

    const pressInstruction =
      context.includes('premier contact') || context.includes('prise de contact') || context.includes('relance')
        ? `Dans l'email, inclus cette référence presse de façon naturelle avec le lien complet :
"${press.source} : ${press.quote}"
Lien : ${press.url}
→ Intègre le lien dans le corps du texte, pas en pièce jointe.`
        : `Pas besoin de citer la presse pour cet email — concentre-toi sur l'action : ${context}.`

    const systemPrompt = `Tu es Emy, B2B Manager de Meshuga Crazy Deli (3 rue Vavin, Paris 6e). Restaurant new-yorkais premium fondé par Edward et Amélie : pastrami maison, lobster rolls, sandwichs gastronomiques haut de gamme. Spécialisés dans les plateaux déjeuner B2B livrés sur tout Paris et le catering événementiel.

Tes emails sont courts (6-8 lignes), très personnalisés, et donnent envie de répondre immédiatement.`

    const userPrompt = `Écris un email de "${context}" pour ce prospect :
- Entreprise : ${prospect.name}
- Contact : ${contactName}${prospect.contacts?.[0]?.role ? ` (${prospect.contacts[0].role})` : ''}
- Secteur : ${cat}
- Ce qu'on propose : ${prospect.type || prospect.category || 'plateaux déjeuner et catering événementiel'}
- Argument clé : ${prospect.pitch || prospect.notes || 'service premium, livraison Paris'}
- Ton : ${tone}

${pressInstruction}

Format OBLIGATOIRE — commence directement par :
Objet : [objet accrocheur et personnalisé]

[corps de l'email, 6-8 lignes max, avec le lien presse si applicable]

Emy
B2B Manager — Meshuga Crazy Deli
3 rue Vavin, Paris 6e
emy@meshuga.fr | 06 XX XX XX XX`

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
    return NextResponse.json(
      { error: 'Erreur serveur : ' + String(error) },
      { status: 500 }
    )
  }
}
