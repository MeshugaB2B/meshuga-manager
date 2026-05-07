// src/app/api/hr/contracts/route.ts
// CRUD sur hr_contracts (contrats versionnés dans un cycle).
//   POST   { cycle_id, ...fields, supersedes_contract_id? }   → créer contrat ou avenant
//   PATCH  { contract_id, ...fields }                          → corriger un contrat existant
//   GET    ?cycle_id=xxx | ?contract_id=xxx                    → lire

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Liste des champs hr_contracts qu'on accepte en payload (whitelist)
var CONTRACT_FIELDS = [
  'type',
  'motif',
  'date_debut',
  'date_fin',
  'date_embauche',
  'fonction',
  'classification',
  'taux_horaire_brut',
  'salaire_brut_mensuel',
  'salaire_lettres',
  'taux_horaire_lettres',
  'heures_hebdo',
  'heures_mensuelles',
  'heures_sup_structurelles',
  'periode_essai_mois',
  'periode_essai_renouvelable',
  'niveau_ccn',
  'echelon_ccn',
  'statut_cadre',
  'clause_mobilite',
  'clause_mobilite_zone',
  'interessement_active',
  'interessement_taux_pct',
  'interessement_assiette',
  'interessement_periodicite',
  'missions_blocks',
  'capital_aegia_food',
  'capital_sas_aegia',
  'rcs_sas_aegia',
  'adresse_sas_aegia',
  'service_sante_travail',
  'prevoyance_organisme',
  'prevoyance_adresse',
  'ville_signature',
  'date_signature',
  'status',
  'contract_label',
  'signed_pdf_url',
]

function pickFields(payload: any): any {
  var out: any = {}
  for (var i = 0; i < CONTRACT_FIELDS.length; i++) {
    var k = CONTRACT_FIELDS[i]
    if (payload[k] !== undefined) out[k] = payload[k]
  }
  return out
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { cycle_id, employee_id, supersedes_contract_id } = body

    if (!cycle_id) return NextResponse.json({ error: 'cycle_id requis' }, { status: 400 })

    var admin = createAdminClient()

    // Vérifier le cycle et récupérer l'employee_id si pas fourni
    var { data: cycle, error: cycleErr } = await admin
      .from('hr_employment_cycles')
      .select('id, employee_id, date_entree, date_sortie')
      .eq('id', cycle_id)
      .single()
    if (cycleErr || !cycle) return NextResponse.json({ error: 'cycle introuvable' }, { status: 404 })

    if (cycle.date_sortie) {
      return NextResponse.json(
        { error: 'cycle clôturé, impossible d\'ajouter un contrat. Ouvrez un nouveau cycle.' },
        { status: 409 }
      )
    }

    var resolvedEmployeeId = employee_id || cycle.employee_id

    // Vérif supersede : le contrat précédent doit appartenir au même cycle
    if (supersedes_contract_id) {
      var { data: prev } = await admin
        .from('hr_contracts')
        .select('id, cycle_id')
        .eq('id', supersedes_contract_id)
        .single()
      if (!prev || prev.cycle_id !== cycle_id) {
        return NextResponse.json(
          { error: 'supersedes_contract_id doit être un contrat du même cycle' },
          { status: 400 }
        )
      }
    }

    var fields = pickFields(body)

    // Insertion : le trigger SQL hr_contracts_maintain_is_current se chargera
    // de désactiver les autres is_current et de poser effective_to sur l'ancien.
    var insertPayload: any = {
      ...fields,
      cycle_id,
      employee_id: resolvedEmployeeId,
      supersedes_contract_id: supersedes_contract_id || null,
      is_current: true,
      // Pour les imports rétroactifs, on archive directement
      status: fields.status || 'archived',
    }

    var { data: created, error: insErr } = await admin
      .from('hr_contracts')
      .insert(insertPayload)
      .select('*')
      .single()

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ contract: created })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/contracts error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    var body = await req.json()
    var { contract_id } = body

    if (!contract_id) return NextResponse.json({ error: 'contract_id requis' }, { status: 400 })

    var admin = createAdminClient()
    var fields = pickFields(body)

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'aucun champ à mettre à jour' }, { status: 400 })
    }

    fields.updated_at = new Date().toISOString()

    var { data: updated, error: updErr } = await admin
      .from('hr_contracts')
      .update(fields)
      .eq('id', contract_id)
      .select('*')
      .single()

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    return NextResponse.json({ contract: updated })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('PATCH /api/hr/contracts error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    var url = new URL(req.url)
    var cycle_id = url.searchParams.get('cycle_id')
    var contract_id = url.searchParams.get('contract_id')

    var admin = createAdminClient()

    if (contract_id) {
      var { data: c, error: cErr } = await admin
        .from('hr_contracts')
        .select('*')
        .eq('id', contract_id)
        .single()
      if (cErr) return NextResponse.json({ error: cErr.message }, { status: 404 })
      return NextResponse.json({ contract: c })
    }

    if (cycle_id) {
      var { data: cs, error: csErr } = await admin
        .from('hr_contracts')
        .select('*')
        .eq('cycle_id', cycle_id)
        .order('date_debut', { ascending: true })
      if (csErr) return NextResponse.json({ error: csErr.message }, { status: 500 })
      return NextResponse.json({ contracts: cs || [] })
    }

    return NextResponse.json({ error: 'cycle_id ou contract_id requis' }, { status: 400 })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('GET /api/hr/contracts error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
