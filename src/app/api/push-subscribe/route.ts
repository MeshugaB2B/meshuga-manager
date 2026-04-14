import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { subscription, userRole, userName } = body
    if (!subscription?.endpoint) return NextResponse.json({ error: 'No subscription' }, { status: 400 })

    // UPSERT — handles duplicate endpoints gracefully
    var { error } = await sb()
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
          user_role: userRole || 'edward',
          user_name: userName || '',
          active: true
        },
        { onConflict: 'endpoint' }
      )

    if (error) {
      console.error('push-subscribe upsert error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    var body = await req.json()
    var { endpoint } = body
    if (!endpoint) return NextResponse.json({ error: 'No endpoint' }, { status: 400 })

    await sb().from('push_subscriptions').delete().eq('endpoint', endpoint)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
