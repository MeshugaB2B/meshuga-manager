import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { pdfBase64, fileName } = body

    if (!pdfBase64) {
      return NextResponse.json({ error: 'PDF manquant' }, { status: 400 })
    }

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
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
            },
            {
              type: 'text',
              text: `Tu es un assistant pour un restaurant. Extrais toutes les lignes de produits alimentaires de cette facture fournisseur (ignore les produits d'entretien, emballages, gants, sacs poubelle, etc.).

IMPORTANT pour le prix unitaire :
- Ramène TOUJOURS le prix à l'unité de base (par kg, par L, ou par unité individuelle)
- Si c'est vendu en bidon de 5kg à 8.25€ → prix_unitaire_ht = 8.25/5 = 1.65, unite = "kg"
- Si c'est vendu en poche de 650g à 4€ → prix_unitaire_ht = 4/0.65 = 6.15, unite = "kg"
- Si c'est vendu en pot de 4.08kg à 34€ → prix_unitaire_ht = 34/4.08 = 8.33, unite = "kg"
- Si c'est une bouteille/canette unitaire → prix_unitaire_ht = prix brut, unite = "U"
- Si c'est au litre → prix_unitaire_ht = prix/nb litres, unite = "L"

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "fournisseur": "Nom du fournisseur",
  "date": "JJ/MM/AAAA",
  "total_ht": 0.00,
  "lignes": [
    {
      "article": "nom simplifié (ex: ketchup, oignons frits, thon, sweet relish, coca cola, evian)",
      "article_original": "description complète sur la facture",
      "quantite": 1.0,
      "unite": "kg ou U ou L",
      "prix_unitaire_ht": 0.00,
      "prix_brut_facture": 0.00,
      "conditionnement": "ex: BID 5kg, PCH 650g, BTE 33cl"
    }
  ]
}`
            }
          ]
        }]
      })
    })

    var data = await res.json()
    var text = data.content?.[0]?.text?.trim() || ''
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    var parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (e: any) {
    console.error('import-invoice error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
