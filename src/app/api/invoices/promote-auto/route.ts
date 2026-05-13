import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// POST /api/invoices/promote-auto — body: { supplier_id, enabled }
export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { supplier_id, enabled } = body
    if (!supplier_id) return NextResponse.json({ error: 'supplier_id manquant' }, { status: 400 })

    var supabase = getSupabase()
    await supabase.from('suppliers').update({
      auto_commit_enabled: enabled === true,
      auto_commit_enabled_at: enabled === true ? new Date().toISOString() : null
    }).eq('id', supplier_id)

    return NextResponse.json({ ok: true, auto_commit_enabled: enabled === true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
