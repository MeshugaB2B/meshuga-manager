import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { ingredients } = body

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'Aucun ingrédient' }, { status: 400 })
    }

    var prompt = `Tu es un expert en achats pour la restauration à Paris. Voici des ingrédients d'un restaurant (Meshuga Crazy Deli, Paris 6e) avec leurs prix d'achat actuels. Pour chacun, donne :
1. Le prix du marché actuel en France (grossiste/Rungis) en 2024-2025
2. Un prix cible de négociation réaliste (-10 à -20% selon le marché)
3. Si le prix actuel est anormalement élevé ou dans la norme

Ingrédients :
${JSON.stringify(ingredients.map((i: any) => ({article: i.article, fournisseur: i.fournisseur, prix_actuel: i.prixActuel, unite: i.unite})))}

Retourne UNIQUEMENT ce JSON (sans markdown) :
{
  "analyses": [
    {
      "article": "nom exact",
      "prix_marche": 0.00,
      "prix_cible": 0.00,
      "unite": "kg ou U ou L",
      "statut": "eleve | normal | bas",
      "ecart_pct": 0,
      "conseil": "1 phrase courte sur comment négocier ou où trouver moins cher"
    }
  ]
}`

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    var data = await res.json()
    // Get last text block (after potential web searches)
    var text = ''
    for (var block of (data.content || [])) {
      if (block.type === 'text') text = block.text
    }
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    // Extract JSON from text
    var jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) text = jsonMatch[0]

    var parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (e: any) {
    console.error('analyze-food-costs error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
