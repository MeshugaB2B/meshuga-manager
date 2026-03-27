// FICHIER : src/app/api/generate-email/route.ts
// Créer ce chemin exact dans ton projet GitHub

import { NextRequest, NextResponse } from 'next/server'

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

    const systemPrompt = `Tu es Emy, B2B Manager de Meshuga Crazy Deli (3 rue Vavin, Paris 6e). Restaurant new-yorkais premium : pastrami maison, lobster rolls, sandwichs gastronomiques. Spécialisés dans les plateaux déjeuner B2B livrés sur tout Paris et le catering événementiel haut de gamme. 

Tes emails sont concis (max 8 lignes de corps), personnalisés, et donnent envie de répondre. Tu t'appuies toujours sur un argument spécifique à l'entreprise.`

    const userPrompt = `Écris un email de "${context}" pour ce prospect :
- Entreprise : ${prospect.name}
- Contact : ${contactName}${prospect.contacts?.[0]?.role ? ` (${prospect.contacts[0].role})` : ''}
- Secteur : ${prospect.cat || prospect.category || 'entreprise'}
- Ce qu'on propose : ${prospect.type || prospect.category || 'plateaux déjeuner et catering'}
- Angle spécifique : ${prospect.pitch || prospect.notes || 'service premium, livraison Paris'}
- Ton : ${tone}

Format OBLIGATOIRE — commence directement par :
Objet : [objet accrocheur]

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
        max_tokens: 600,
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
