import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// POST /api/push-subscribe — enregistrer un abonnement push
export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { subscription, userRole, userName } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Subscription invalide' }, { status: 400 })
    }

    var keys = subscription.keys || {}
    var supabase = getSupabase()

    // Upsert : si l'endpoint existe déjà, on le met à jour
    var { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh || '',
        auth: keys.auth || '',
        user_role: userRole || 'edward',
        user_name: userName || '',
        active: true
      }, { onConflict: 'endpoint' })

    if (error) {
      console.error('push-subscribe insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('push-subscribe error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE /api/push-subscribe — supprimer un abonnement
export async function DELETE(req: Request) {
  try {
    var body = await req.json()
    var { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint manquant' }, { status: 400 })
    }

    var supabase = getSupabase()
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
