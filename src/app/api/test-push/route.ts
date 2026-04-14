import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { target } = body

    var res = await fetch(
      'https://ldfxpizsebizzrexghqz.supabase.co/functions/v1/send-push',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🔔 Test de connexion',
          body: 'Connexion OK ! (' + new Date().toLocaleTimeString('fr-FR') + ')',
          target: target || 'edward'
        })
      }
    )

    var text = await res.text()
    var data: any = {}
    try { data = JSON.parse(text) } catch(e) { data = { raw: text, parseError: true } }

    return NextResponse.json({
      httpStatus: res.status,
      ok: res.ok,
      sent: data.sent ?? 0,
      failed: data.failed ?? 0,
      total: data.total ?? 0,
      errors: data.errors ?? [],
      raw: data.parseError ? text : undefined
    })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
