import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    var formData = await req.formData()
    var file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    var bytes = await file.arrayBuffer()
    var base64 = Buffer.from(bytes).toString('base64')
    var mediaType = file.type || 'application/pdf'

    var isImage = mediaType.startsWith('image/')
    var isPdf = mediaType === 'application/pdf'

    if (!isImage && !isPdf) {
      return NextResponse.json({ error: 'Format non supporté. Utilise PDF ou image.' }, { status: 400 })
    }

    var prompt = `Tu es un assistant qui extrait les données d'une facture fournisseur de restaurant.

Extrait depuis cette facture :
- Le nom du fournisseur (supplier)
- La date de la facture (format ISO YYYY-MM-DD)
- Tous les ingrédients / produits avec :
  * ingredient : nom concis en français sans accents (ex "Boeuf hache", "Saumon frais")
  * quantity_kg : quantité en kg (convertir g/pièces/litres en kg estimé si besoin, sinon null)
  * price_per_kg : prix unitaire HT par kg en € (arrondi à 2 décimales)
  * total_ht : prix total HT de la ligne en €

IMPORTANT :
- Ignore consignes, emballages, frais de livraison
- Garde seulement les ingrédients alimentaires
- Si TVA déjà HT, utilise directement. Si TTC, calcule HT (TVA aliments = 5.5%)

Réponds UNIQUEMENT avec ce JSON (aucun texte avant ou après) :
{
  "supplier": "nom",
  "date": "YYYY-MM-DD",
  "items": [
    { "ingredient": "nom", "quantity_kg": nombre_ou_null, "price_per_kg": nombre, "total_ht": nombre }
  ]
}`

    var source: any = {
      type: 'base64',
      media_type: mediaType,
      data: base64
    }

    var content: any = [
      isPdf
        ? { type: 'document', source: source }
        : { type: 'image', source: source },
      { type: 'text', text: prompt }
    ]

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: content }]
      })
    })

    var data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: 'Erreur IA', detail: data }, { status: 500 })
    }

    var textBlock = (data.content || []).find(function(b: any) { return b.type === 'text' })
    var rawText = (textBlock && textBlock.text) || ''
    var match = rawText.match(/\{[\s\S]*\}/)

    if (!match) {
      return NextResponse.json({ error: 'Réponse IA non parsable', raw: rawText }, { status: 500 })
    }

    var parsed = JSON.parse(match[0])
    return NextResponse.json(parsed)
  } catch (e: any) {
    console.error('parse-invoice error:', e)
    return NextResponse.json({ error: e.message || 'Erreur inconnue' }, { status: 500 })
  }
}
