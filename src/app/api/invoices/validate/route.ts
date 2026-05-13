import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// POST /api/invoices/validate
// Body : {
//   pending_id: uuid,
//   matched_lines: [ { matched_id, new_price, change_pct, ... } ],
//   was_modified: boolean,
//   modified_lines: number
// }
// =============================================================================

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { pending_id, matched_lines, was_modified, modified_lines } = body
    if (!pending_id) return NextResponse.json({ error: 'pending_id manquant' }, { status: 400 })

    var supabase = getSupabase()

    // 1) Récupérer la facture pending
    var { data: pending, error: pendingErr } = await supabase
      .from('pending_invoices')
      .select('*')
      .eq('id', pending_id)
      .single()
    if (pendingErr || !pending) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (pending.status !== 'pending') return NextResponse.json({ error: 'Facture déjà traitée' }, { status: 400 })

    // 2) Commit dans product_prices pour chaque ligne matchée
    var insertedLines = 0
    var taskCount = 0
    var lines = matched_lines || []
    
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i]
      if (!m.matched_id || !m.new_price) continue
      
      await supabase.from('product_prices').insert({
        product_id: m.matched_id,
        price: m.new_price,
        invoice_date: pending.invoice_date,
        invoice_filename: pending.file_name
      })
      await supabase.from('products').update({ current_price: m.new_price }).eq('id', m.matched_id)
      insertedLines++
      
      // Créer une task si hausse > 3%
      if (m.change_pct > 3) {
        await supabase.from('tasks').insert({
          title: 'Renégocier ' + (m.matched_to || 'produit') + ' (+' + Number(m.change_pct).toFixed(0) + '%) — ' + (pending.fournisseur_extracted || ''),
          status: 'todo',
          priority: m.change_pct > 10 ? 'high' : 'medium',
          deadline: new Date().toISOString().split('T')[0]
        })
        taskCount++
      }
    }

    // 3) Marquer la pending invoice comme validated
    await supabase.from('pending_invoices').update({
      status: 'validated',
      validated_at: new Date().toISOString(),
      validated_by: 'edward',
      was_modified: was_modified || false,
      modified_lines: modified_lines || 0,
      committed_at: new Date().toISOString(),
      can_rollback_until: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
    }).eq('id', pending_id)

    // 4) Tracking auto-promotion sur le supplier
    if (pending.supplier_id) {
      var { data: supplier } = await supabase
        .from('suppliers')
        .select('id, name, consecutive_clean_validations, auto_commit_enabled')
        .eq('id', pending.supplier_id)
        .single()
      
      var promotionEligible = false
      if (supplier) {
        var newCount = supplier.consecutive_clean_validations || 0
        if (was_modified) {
          // Reset à 0 si modifié
          newCount = 0
        } else {
          newCount += 1
        }
        
        await supabase.from('suppliers').update({
          consecutive_clean_validations: newCount,
          last_validation_at: new Date().toISOString()
        }).eq('id', supplier.id)
        
        // Si 5 validations propres consécutives et pas encore en auto-commit → éligible
        if (newCount >= 5 && !supplier.auto_commit_enabled) {
          promotionEligible = true
        }
      }
      
      return NextResponse.json({
        ok: true,
        inserted_lines: insertedLines,
        tasks_created: taskCount,
        promotion_eligible: promotionEligible,
        supplier_name: supplier?.name,
        consecutive_clean: supplier ? (was_modified ? 0 : (supplier.consecutive_clean_validations || 0) + 1) : 0
      })
    }

    return NextResponse.json({
      ok: true,
      inserted_lines: insertedLines,
      tasks_created: taskCount,
      promotion_eligible: false
    })
  } catch (e: any) {
    console.error('validate-invoice error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
