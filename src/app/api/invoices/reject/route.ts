import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// POST /api/invoices/reject — body: { pending_id, reason }
export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { pending_id, reason } = body
    if (!pending_id) return NextResponse.json({ error: 'pending_id manquant' }, { status: 400 })

    var supabase = getSupabase()
    await supabase.from('pending_invoices').update({
      status: 'rejected',
      validated_at: new Date().toISOString(),
      validated_by: 'edward',
      rejection_reason: reason || 'Rejeté manuellement'
    }).eq('id', pending_id)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
