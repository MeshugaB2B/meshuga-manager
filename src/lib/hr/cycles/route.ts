// src/app/api/hr/cycles/route.ts
// CRUD sur hr_employment_cycles.
//   POST   { employee_id, date_entree, notes? }                  → créer un cycle
//   PATCH  { cycle_id, date_sortie?, motif_sortie?, notes? }     → clôturer / mettre à jour
//   GET    ?employee_id=xxx                                       → lister cycles + contrats

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { employee_id, date_entree, notes } = body

    if (!employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    if (!date_entree) return NextResponse.json({ error: 'date_entree requise' }, { status: 400 })

    var admin = createAdminClient()

    // Vérifier que l'employé existe
    var { data: emp, error: empErr } = await admin
      .from('hr_employees')
      .select('id, prenom, nom')
      .eq('id', employee_id)
      .single()
    if (empErr || !emp) return NextResponse.json({ error: 'employé introuvable' }, { status: 404 })

    // Vérifier qu'il n'y a pas déjà un cycle ouvert pour cet employé
    var { data: openCycles } = await admin
      .from('hr_employment_cycles')
      .select('id, date_entree')
      .eq('employee_id', employee_id)
      .is('date_sortie', null)

    if (openCycles && openCycles.length > 0) {
      return NextResponse.json(
        {
          error: 'cycle déjà ouvert pour cet employé',
          existing_cycle: openCycles[0],
          hint: "Cloturez le cycle existant avant d'en ouvrir un nouveau (ré-embauche).",
        },
        { status: 409 }
      )
    }

    var { data: created, error: insErr } = await admin
      .from('hr_employment_cycles')
      .insert({
        employee_id,
        date_entree,
        notes: notes || null,
      })
      .select('*')
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ cycle: created })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/cycles error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    var body = await req.json()
    var { cycle_id, date_sortie, motif_sortie, notes } = body

    if (!cycle_id) return NextResponse.json({ error: 'cycle_id requis' }, { status: 400 })

    var admin = createAdminClient()

    var update: any = {}
    if (date_sortie !== undefined) update.date_sortie = date_sortie || null
    if (motif_sortie !== undefined) update.motif_sortie = motif_sortie || null
    if (notes !== undefined) update.notes = notes

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'aucun champ à mettre à jour' }, { status: 400 })
    }

    var { data: updated, error: updErr } = await admin
      .from('hr_employment_cycles')
      .update(update)
      .eq('id', cycle_id)
      .select('*')
      .single()

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Si on clôture le cycle, on peut aussi fermer effective_to du contrat courant
    if (date_sortie && updated) {
      await admin
        .from('hr_contracts')
        .update({ effective_to: date_sortie })
        .eq('cycle_id', cycle_id)
        .eq('is_current', true)
        .is('effective_to', null)
    }

    return NextResponse.json({ cycle: updated })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('PATCH /api/hr/cycles error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    var url = new URL(req.url)
    var employee_id = url.searchParams.get('employee_id')

    if (!employee_id) return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })

    var admin = createAdminClient()

    var { data: cycles, error: cyclesErr } = await admin
      .from('hr_employment_cycles')
      .select('*')
      .eq('employee_id', employee_id)
      .order('date_entree', { ascending: true })

    if (cyclesErr) return NextResponse.json({ error: cyclesErr.message }, { status: 500 })

    var cyclesArr = cycles || []
    var cycleIds = cyclesArr.map((c: any) => c.id)

    // Récupérer tous les contrats de ces cycles
    var contractsByCycle: Record<string, any[]> = {}
    if (cycleIds.length > 0) {
      var { data: contracts } = await admin
        .from('hr_contracts')
        .select('*')
        .in('cycle_id', cycleIds)
        .order('date_debut', { ascending: true })

      var contractsArr = contracts || []
      for (var i = 0; i < contractsArr.length; i++) {
        var c = contractsArr[i]
        if (!contractsByCycle[c.cycle_id]) contractsByCycle[c.cycle_id] = []
        contractsByCycle[c.cycle_id].push(c)
      }
    }

    // Enrichir les cycles avec leurs contrats
    var enriched = cyclesArr.map((cy: any) => ({
      ...cy,
      contracts: contractsByCycle[cy.id] || [],
    }))

    return NextResponse.json({ cycles: enriched })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('GET /api/hr/cycles error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
