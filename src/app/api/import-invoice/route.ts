import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { pdfBase64, fileName } = body

    if (!pdfBase64) {
      return NextResponse.json({ error: 'PDF manquant' }, { status: 400 })
    }

    // Call Claude to extract invoice lines from PDF
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: `Extrais toutes les lignes de cette facture fournisseur pour un restaurant. 
Retourne UNIQUEMENT un JSON valide (sans markdown) avec ce format exact :
{
  "fournisseur": "Nom du fournisseur",
  "date": "JJ/MM/AAAA",
  "total_ht": 0.00,
  "lignes": [
    {
      "article": "Nom simplifié de l'article",
      "article_original": "Description complète sur la facture",
      "quantite": 1.0,
      "unite": "kg ou U ou L",
      "prix_unitaire_ht": 0.00
    }
  ]
}
Pour l'unité : utilise "kg" pour les poids, "U" pour les unités/pièces/boîtes, "L" pour les litres.
Pour le prix unitaire : c'est le prix par kg ou par unité de conditionnement HT.
Simplifie le nom de l'article au maximum (ex: "Cheddar Tranché 1KG" → "cheddar", "Sucrine Cœur Bqt" → "sucrine").`
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
