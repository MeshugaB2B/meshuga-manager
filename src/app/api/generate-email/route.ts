// FICHIER : src/app/api/generate-email/route.ts

import { NextRequest, NextResponse } from 'next/server'

const PRESS_REFERENCES = `
RÉFÉRENCES PRESSE MESHUGA (à utiliser comme arguments de crédibilité) :
- Paris Première / Très Très Bon : https://www.facebook.com/watch/?v=648051137321383
- Télérama : "de la street food de haut niveau près du jardin du Luxembourg" — https://www.telerama.fr/restos-loisirs/meshuga-de-la-street-food-de-haut-niveau-pres-du-jardin-du-luxembourg_cri-7043251.php
- Konbini : "les sandwiches les plus confort du moment" — https://www.konbini.com/food/on-a-teste-meshuga-le-deli-aux-sandwiches-les-plus-confort-du-moment/
- Acumen Magazine : "la nouvelle adresse qui fait bouger la rive gauche parisienne" — https://magazine-acumen.com/gastronomie/meshuga-la-nouvelle-adresse-qui-fait-bouger-la-rive-gauche-parisienne/
- Biba Magazine : adresse street food gourmandise — https://www.bibamagazine.fr/lifestyle/cuisine/meshuga-adresse-street-food-gourmandise-265359.html
- Challenges : "les nouvelles adresses de street food à découvrir à Paris" — https://www.challenges.fr/lifestyle/les-nouvelles-adresses-de-street-food-a-decouvrir-cet-ete-a-paris_860036
- Snacking.fr : "Meshuga le Crazy Deli parisien" — https://www.snacking.fr/actualites/6349-Meshuga-le-Crazy-Deli-parisien-d-Amelie-Weill-et-Edward-Touret/
`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prospect, context } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })
    }

    const tone =
      ['avocats', 'banque', 'conseil', 'immo'].includes(prospect.cat || '')
        ? 'professionnel et sérieux, vouvoiement impératif'
        : ['startup', 'tech', 'coworking'].includes(prospect.cat || '')
        ? 'décontracté et direct, tutoiement possible'
        : prospect.cat === 'luxe'
        ? 'raffiné et élégant, vouvoiement'
        : prospect.cat === 'evenementiel'
        ? 'enthousiaste et pro, vouvoiement'
        : 'chaleureux et professionnel, vouvoiement'

    const contactName =
      prospect.contacts?.[0]?.name ||
      prospect.contact_name ||
      'Madame, Monsieur'

    const pressUsage =
      context.includes('premier contact') || context.includes('prise de contact')
        ? `Tu peux citer 1 référence presse pour asseoir la crédibilité de Meshuga, de façon naturelle. Choisis la plus pertinente selon le profil du prospect (Télérama ou Challenges pour un profil corporate, Konbini pour une startup, Paris Première pour le luxe et l'événementiel).`
        : context.includes('relance')
        ? `Si pertinent, rappelle brièvement une référence presse pour renforcer l'argumentaire.`
        : `Concentre-toi sur l'action : ${context}. Pas besoin de citer la presse.`

    const systemPrompt = `Tu es Emy, B2B Manager de Meshuga Crazy Deli (3 rue Vavin, Paris 6e). Restaurant new-yorkais premium fondé par Edward et Amélie : pastrami maison, lobster rolls, sandwichs gastronomiques. Spécialisés dans les plateaux déjeuner B2B livrés sur tout Paris et le catering événementiel haut de gamme.

${PRESS_REFERENCES}

Tes emails sont concis (6-8 lignes max), très personnalisés selon le secteur du prospect, et donnent envie de répondre immédiatement.`

    const userPrompt = `Écris un email de "${context}" pour ce prospect :
- Entreprise : ${prospect.name}
- Contact : ${contactName}${prospect.contacts?.[0]?.role ? ` (${prospect.contacts[0].role})` : ''}
- Secteur : ${prospect.cat || prospect.category || 'entreprise'}
- Ce qu'on propose : ${prospect.type || prospect.category || 'plateaux déjeuner et catering'}
- Argument clé : ${prospect.pitch || prospect.notes || 'service premium, livraison Paris'}
- Ton : ${tone}

${pressUsage}

Format OBLIGATOIRE — commence directement par :
Objet : [objet accrocheur et personnalisé]

[corps de l'email, 6-8 lignes max]

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
