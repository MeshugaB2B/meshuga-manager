import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = file.type || 'application/pdf'

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Decide content type based on media type
    const isImage = mediaType.startsWith('image/')
    const isPdf = mediaType === 'application/pdf'

    if (!isImage && !isPdf) {
      return Response.json({ error: 'Unsupported file type. Use PDF or image.' }, { status: 400 })
    }

    const prompt = `Tu es un assistant qui extrait les données d'une facture fournisseur de restaurant.

Extrait depuis cette facture :
- Le nom du fournisseur (supplier)
- La date de la facture (format ISO YYYY-MM-DD)
- Tous les ingrédients / produits avec :
  * nom de l'ingrédient (en français, sans accents, concis, ex "Boeuf hache", "Saumon frais")
  * quantité en kg (convertir grammes→kg si nécessaire)
  * prix unitaire HT par kg en € (si la facture montre le prix TTC, indique-le mais calcule le HT à TVA 5.5% pour les aliments)
  * prix total HT de la ligne en €

IMPORTANT :
- Ignore les consignes, emballages, services de livraison
- Ne garde que les ingrédients alimentaires
- Si unité différente (pièce, litre, boîte), convertis en kg estimé ou marque quantity_kg=null
- Arrondis prix_per_kg à 2 décimales

Réponds UNIQUEMENT avec ce JSON (aucun texte avant ou après) :
{
  "supplier": "nom du fournisseur",
  "date": "YYYY-MM-DD",
  "items": [
    { "ingredient": "nom", "quantity_kg": nombre, "price_per_kg": nombre, "total_ht": nombre }
  ]
}`

    const source: any = isPdf
      ? { type: 'base64', media_type: 'application/pdf', data: base64 }
      : { type: 'base64', media_type: mediaType, data: base64 }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [
          { type: isPdf ? 'document' : 'image', source } as any,
          { type: 'text', text: prompt }
        ]
      }]
    })

    const textBlock = response.content.find((b: any) => b.type === 'text') as any
    const rawText = textBlock?.text || ''
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) {
      return Response.json({ error: 'AI response not parseable', raw: rawText }, { status: 500 })
    }

    const parsed = JSON.parse(match[0])
    return Response.json(parsed)
  } catch (err: any) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
