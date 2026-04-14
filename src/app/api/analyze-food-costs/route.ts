import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { ingredients } = body
    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: 'Aucun ingrédient' }, { status: 400 })
    }

    var prompt = `Tu es un expert en achats pour la restauration à Paris. Utilise la recherche web pour trouver les prix ACTUELS de ces ingrédients chez des grossistes français livrables à Paris (Metro, Promocash, Brake France, Sysco France, Episaveurs/Pomona, PassionFroid, TerreAzur, ou directement sur leurs sites).

RÈGLES :
- Pour les produits courants (épicerie sèche, condiments, légumes, produits laitiers, boissons, huiles) : cherche des prix réels sur le web
- Pour les viandes et poissons (pastrami, saumon, homard, poulet, anchois) : statut = "non_applicable", ne cherche pas
- Donne un prix_cible réaliste basé sur ce que tu trouves (pas une réduction arbitraire)
- Dans "conseil" : nomme le fournisseur ET le prix trouvé (ex: "Metro : cheddar tranché à 7.20€/kg, Promocash : 6.85€/kg")
- Dans "source" : le site ou fournisseur consulté

Ingrédients :
${JSON.stringify(ingredients.map((i: any) => ({article: i.article, fournisseur: i.fournisseur, prix_actuel: i.prixActuel, unite: i.unite})))}

Retourne UNIQUEMENT ce JSON valide (sans markdown) :
{
  "analyses": [
    {
      "article": "nom exact",
      "prix_marche": 0.00,
      "prix_cible": 0.00,
      "unite": "kg ou U ou L",
      "statut": "eleve | normal | bas | non_applicable",
      "ecart_pct": 0,
      "source": "Metro / Promocash / Brake / etc.",
      "conseil": "Fournisseur X à Y€/kg, Fournisseur Z à W€/kg"
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }]
      })
    })

    var data = await res.json()
    var text = ''
    for (var block of (data.content || [])) {
      if (block.type === 'text') text = block.text
    }
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    var jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) text = jsonMatch[0]

    var parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (e: any) {
    console.error('analyze-food-costs error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
