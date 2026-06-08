import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Envoi d'une réponse DM Instagram (fenêtre de 24h imposée par Meta).
export async function POST(req: Request) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN || ''
  if (!token) return NextResponse.json({ ok: false, error: 'Instagram non connecté' }, { status: 400 })
  try {
    const body = await req.json()
    const recipientId = body.recipientId
    const message = String(body.message || '').trim()
    if (!recipientId) return NextResponse.json({ ok: false, error: 'Destinataire inconnu' }, { status: 400 })
    if (!message) return NextResponse.json({ ok: false, error: 'Message vide' }, { status: 400 })

    const res = await fetch('https://graph.instagram.com/v23.0/me/messages?access_token=' + token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message } })
    })
    const data = await res.json()
    if (data.error) {
      let msg = data.error.message || 'Envoi refusé'
      // Hors fenêtre 24h : message Meta peu lisible -> on clarifie
      if (/24|window|outside|allowed/i.test(msg)) msg = 'Hors de la fenêtre de 24h : Instagram ne permet plus de répondre à ce message. Réponds directement dans l\u2019app.'
      return NextResponse.json({ ok: false, error: msg })
    }
    return NextResponse.json({ ok: true, messageId: data.message_id || null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
