import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { prospects } = body
    if (!prospects || prospects.length === 0) {
      return NextResponse.json({ error: 'Aucun prospect' }, { status: 400 })
    }

    var prompt = `Tu es expert en sales B2B pour un traiteur parisien (Meshuga Crazy Deli). 
Analyse ces prospects et attribue un score de 1 à 10 à chacun selon leur potentiel commercial (taille entreprise, secteur, température, date dernier contact).

Prospects :
${JSON.stringify(prospects.map((p: any) => ({
  id: p.id,
  name: p.name,
  category: p.category || '',
  size: p.size || '',
  status: p.status,
  temperature: p.temperature,
  nextDate: p.nextDate || '',
  notes: p.notes ? p.notes.slice(0, 100) : ''
})))}

Retourne UNIQUEMENT ce JSON (sans markdown) :
{
  "scores": [
    { "id": "ID_PROSPECT", "score": 8, "reason": "Raison courte en 5 mots max" }
  ]
}

Critères : 10 = gros potentiel urgent, 1 = très peu probable. Sois réaliste.`

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    var data = await res.json()
    var text = data.content?.[0]?.text?.trim() || ''
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    var parsed = JSON.parse(text)

    return NextResponse.json(parsed)
  } catch (e: any) {
    console.error('score-prospects error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
