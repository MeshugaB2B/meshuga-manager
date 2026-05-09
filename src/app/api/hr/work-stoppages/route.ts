// src/app/api/hr/work-stoppages/route.ts
// CRUD sur hr_work_stoppages.
//   POST    { employee_id, stoppage_type, date_debut, date_fin?, motif?, ... }
//   PATCH   { id, ...fields }
//   GET     ?employee_id=xxx | ?id=xxx
//   DELETE  ?id=xxx

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

var STOPPAGE_FIELDS = [
  'stoppage_type',
  'date_debut',
  'date_fin',
  'date_reprise_anticipee',
  'motif',
  'prescripteur',
  'is_prolongation',
  'parent_stoppage_id',
  'document_path',
  'document_pages',
  'ocr_extraction',
  'extracted_at',
  'validated_by_user',
  'notes',
]

function pickFields(payload: any): any {
  var out: any = {}
  for (var i = 0; i < STOPPAGE_FIELDS.length; i++) {
    var k = STOPPAGE_FIELDS[i]
    if (payload[k] !== undefined) out[k] = payload[k]
  }
  return out
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { employee_id, stoppage_type, date_debut } = body

    if (!employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    if (!stoppage_type) return NextResponse.json({ error: 'stoppage_type requis' }, { status: 400 })
    if (!date_debut) return NextResponse.json({ error: 'date_debut requise' }, { status: 400 })

    var admin = createAdminClient()

    // Vérifier que l'employé existe
    var { data: emp } = await admin
      .from('hr_employees')
      .select('id')
      .eq('id', employee_id)
      .single()
    if (!emp) return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })

    // Auto-rattacher au cycle ouvert (ou le plus récent si tous fermés)
    var resolvedCycleId: string | null = null
    if (body.cycle_id) {
      resolvedCycleId = body.cycle_id
    } else {
      var { data: openCyc } = await admin
        .from('hr_employment_cycles')
        .select('id')
        .eq('employee_id', employee_id)
        .is('date_sortie', null)
        .limit(1)
        .maybeSingle()
      if (openCyc) resolvedCycleId = openCyc.id
      else {
        var { data: lastCyc } = await admin
          .from('hr_employment_cycles')
          .select('id')
          .eq('employee_id', employee_id)
          .order('date_entree', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (lastCyc) resolvedCycleId = lastCyc.id
      }
    }

    var fields = pickFields(body)
    var insertPayload: any = {
      ...fields,
      employee_id,
      cycle_id: resolvedCycleId,
    }

    var { data: created, error: insErr } = await admin
      .from('hr_work_stoppages')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ stoppage: created })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/work-stoppages error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    var body = await req.json()
    var { id } = body

    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    var admin = createAdminClient()
    var fields = pickFields(body)

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'aucun champ à mettre à jour' }, { status: 400 })
    }

    var { data: updated, error: updErr } = await admin
      .from('hr_work_stoppages')
      .update(fields)
      .eq('id', id)
      .select('*')
      .single()

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ stoppage: updated })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('PATCH /api/hr/work-stoppages error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    var url = new URL(req.url)
    var employee_id = url.searchParams.get('employee_id')
    var id = url.searchParams.get('id')

    var admin = createAdminClient()

    if (id) {
      var { data: s, error: sErr } = await admin
        .from('hr_work_stoppages')
        .select('*')
        .eq('id', id)
        .single()
      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 404 })
      return NextResponse.json({ stoppage: s })
    }

    if (employee_id) {
      var { data: list, error: listErr } = await admin
        .from('hr_work_stoppages')
        .select('*')
        .eq('employee_id', employee_id)
        .order('date_debut', { ascending: false })
      if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
      return NextResponse.json({ stoppages: list || [] })
    }

    return NextResponse.json({ error: 'employee_id ou id requis' }, { status: 400 })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('GET /api/hr/work-stoppages error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    var url = new URL(req.url)
    var id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    var admin = createAdminClient()
    var { error: delErr } = await admin
      .from('hr_work_stoppages')
      .delete()
      .eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    return NextResponse.json({ deleted: true })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('DELETE /api/hr/work-stoppages error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
