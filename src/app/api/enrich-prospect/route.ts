import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { name } = body
    if (!name) return NextResponse.json({ error: 'Nom manquant' }, { status: 400 })

    var prompt = `Tu es un expert en business development B2B parisien. On te donne le nom d'une entreprise. Analyse-la et retourne un JSON avec ces infos pour aider une commerciale de traiteur (Meshuga Crazy Deli, Paris 6e) à préparer son approche.

Entreprise : "${name}"

Retourne UNIQUEMENT ce JSON (sans markdown, sans backticks) :
{
  "category": "une de ces valeurs: Startup / Corporate / Agence / Événementiel / Luxe / Cabinet / Médias / Autre",
  "size": "estimation du nb d'employés en chiffre (ex: 50)",
  "email": "email contact probable format contact@domaine.fr ou '' si inconnu",
  "phone": "",
  "temperature": "chaud si gros potentiel catering, tiede sinon, froid si peu probable",
  "pitch": "2 phrases max : pourquoi Meshuga peut les intéresser, angle d'approche spécifique à ce type d'entreprise"
}

Sois précis et réaliste. Si tu ne connais pas l'entreprise, déduis depuis le nom.`

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    var data = await res.json()
    var text = data.content?.[0]?.text?.trim() || ''

    // Clean potential markdown
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    var parsed = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch (e: any) {
    console.error('enrich-prospect error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
