import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { prompt, systemPrompt } = await request.json()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquante' }, { status: 500 })
  }

  try {
    const body: any = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }

    if (systemPrompt) {
      body.system = systemPrompt
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error?.message || 'Erreur Anthropic' }, { status: 500 })
    }

    const text = data.content?.[0]?.text || ''
    return NextResponse.json({ text })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
