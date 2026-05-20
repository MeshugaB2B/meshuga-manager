// src/app/api/hr/contracts/[id]/amendment/route.ts

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildAvenant } from '@/app/dashboard/rh/amendmentBuilder'
import { LOGO_PINK } from '@/app/dashboard/logos'

export var runtime = 'nodejs'

function applyChangesToContract(amendmentType: string, payload: any, currentContract: any) {
  var updates: any = {}
  var changes: any = {}
  
  if (amendmentType === 'prolongation_duree') {
    if (!payload.new_date_fin) throw new Error('new_date_fin requis pour prolongation_duree')
    updates.date_fin = payload.new_date_fin
    changes.date_fin = { before: currentContract.date_fin, after: payload.new_date_fin }
  }
  else if (amendmentType === 'augmentation_salaire') {
    if (payload.new_salaire_brut_mensuel != null) {
      updates.salaire_brut_mensuel = Number(payload.new_salaire_brut_mensuel)
      changes.salaire_brut_mensuel = { before: currentContract.salaire_brut_mensuel, after: Number(payload.new_salaire_brut_mensuel) }
    }
    if (payload.new_taux_horaire_brut != null) {
      updates.taux_horaire_brut = Number(payload.new_taux_horaire_brut)
      changes.taux_horaire_brut = { before: currentContract.taux_horaire_brut, after: Number(payload.new_taux_horaire_brut) }
    }
    if (Object.keys(changes).length === 0) {
      throw new Error('Aucun champ de rémunération fourni pour augmentation_salaire')
    }
  }
  else if (amendmentType === 'modification_horaires') {
    if (payload.new_heures_hebdo != null) {
      updates.heures_hebdo = Number(payload.new_heures_hebdo)
      changes.heures_hebdo = { before: currentContract.heures_hebdo, after: Number(payload.new_heures_hebdo) }
    }
    if (payload.new_heures_mensuelles != null) {
      updates.heures_mensuelles = Number(payload.new_heures_mensuelles)
      changes.heures_mensuelles = { before: currentContract.heures_mensuelles, after: Number(payload.new_heures_mensuelles) }
    }
    // Pour Extra : si on a juste un nouveau planning sans modifier heures_hebdo, OK aussi
    if (Object.keys(changes).length === 0 && currentContract.type !== 'extra') {
      throw new Error('Aucune nouvelle durée fournie pour modification_horaires')
    }
  }
  else if (amendmentType === 'changement_poste') {
    if (payload.new_fonction) {
      updates.fonction = payload.new_fonction
      changes.fonction = { before: currentContract.fonction, after: payload.new_fonction }
    }
    if (payload.new_classification) {
      updates.classification = payload.new_classification
      changes.classification = { before: currentContract.classification, after: payload.new_classification }
    }
    if (Object.keys(changes).length === 0) {
      throw new Error('Aucune modification fournie pour changement_poste')
    }
  }
  else if (amendmentType === 'autre') {
    // Pas de modification automatique
  }
  else {
    throw new Error('amendment_type inconnu : ' + amendmentType)
  }
  
  return { updates: updates, changes: changes }
}

// 🔥 Nom de fichier logique pour le téléchargement
function buildFilename(emp: any, amendment: any): string {
  function slug(s: string) {
    return (s || '').toString()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  }
  var name = slug((emp.prenom || '') + '-' + (emp.nom || ''))
  var typeLabels: any = {
    prolongation_duree: 'prolongation',
    augmentation_salaire: 'augmentation-salaire',
    modification_horaires: 'modification-horaires',
    changement_poste: 'changement-poste',
    autre: 'modification'
  }
  var typeStr = typeLabels[amendment.amendment_type] || 'avenant'
  return 'Avenant-' + amendment.amendment_number + '-' + typeStr + '-' + name
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    var contractId = ctx.params.id
    if (!contractId) {
      return NextResponse.json({ error: 'contract_id manquant' }, { status: 400 })
    }
    
    var payload = await req.json()
    var amendmentType = payload.amendment_type
    var effectiveDate = payload.effective_date || new Date().toISOString().slice(0, 10)
    var motif = payload.motif || ''
    var preview = payload.preview === true
    
    if (!amendmentType) {
      return NextResponse.json({ error: 'amendment_type requis' }, { status: 400 })
    }
    
    var sb = createAdminClient()
    
    // 1) Charger contrat + employé
    var contractRes = await sb.from('hr_contracts').select('*').eq('id', contractId).single()
    if (contractRes.error || !contractRes.data) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }
    var currentContract = contractRes.data
    
    var empRes = await sb.from('hr_employees').select('*').eq('id', currentContract.employee_id).single()
    if (empRes.error || !empRes.data) {
      return NextResponse.json({ error: 'Salarié introuvable' }, { status: 404 })
    }
    var emp = empRes.data
    
    // 🔥 2) Charger les vacations EXISTANTES
    var vacsRes = await sb.from('hr_contract_vacations')
      .select('*')
      .eq('contract_id', contractId)
      .order('ordre', { ascending: true })
    var existingVacs = vacsRes.data || []
    
    // 🔥 3) Construire la liste finale de vacations pour le PDF
    var vacsForRendering = existingVacs
    if (Array.isArray(payload.new_vacations) && payload.new_vacations.length > 0) {
      if (payload.replace_vacations === true) {
        vacsForRendering = payload.new_vacations
      } else {
        // Ajout aux existantes + tri chronologique
        vacsForRendering = existingVacs.concat(payload.new_vacations)
        vacsForRendering.sort(function(a: any, b: any) {
          return (a.date_vacation || '').localeCompare(b.date_vacation || '')
        })
      }
    }
    
    // 4) Calculer les modifications
    var modResult
    try {
      modResult = applyChangesToContract(amendmentType, payload, currentContract)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    var updates = modResult.updates
    var changes = modResult.changes
    
    // 5) Numéro séquentiel
    var nbRes = await sb.from('hr_contract_amendments').select('amendment_number')
      .eq('contract_id', contractId)
      .order('amendment_number', { ascending: false }).limit(1)
    var nextNum = 1
    if (nbRes.data && nbRes.data.length > 0 && nbRes.data[0].amendment_number) {
      nextNum = nbRes.data[0].amendment_number + 1
    }
    
    // 6) Contrat futur (avec changes appliqués)
    var futureContract: any = Object.assign({}, currentContract, updates)
    var previousValues: any = {}
    Object.keys(changes).forEach(function(k) {
      previousValues[k] = changes[k].before
    })
    
    // 7) Générer HTML avec vacations
    var amendmentSnapshot = {
      amendment_number: nextNum,
      amendment_type: amendmentType,
      effective_date: effectiveDate,
      motif: motif,
      created_at: new Date().toISOString()
    }
    var html = buildAvenant(amendmentSnapshot, futureContract, emp, vacsForRendering, LOGO_PINK, previousValues)
    
    // 8) PREVIEW : retourne juste le HTML
    if (preview) {
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
    
    // 9) SAUVEGARDE
    
    // 9a) Update hr_contracts
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      var updRes = await sb.from('hr_contracts').update(updates).eq('id', contractId)
      if (updRes.error) {
        return NextResponse.json({ error: 'Erreur update contrat : ' + updRes.error.message }, { status: 500 })
      }
    }
    
    // 9b) Si nouvelles vacations, les insérer
    if (Array.isArray(payload.new_vacations) && payload.new_vacations.length > 0) {
      if (payload.replace_vacations === true) {
        await sb.from('hr_contract_vacations').delete().eq('contract_id', contractId)
      }
      var maxOrdre = 0
      if (payload.replace_vacations !== true && existingVacs.length > 0) {
        existingVacs.forEach(function(v: any) {
          if ((v.ordre || 0) > maxOrdre) maxOrdre = v.ordre
        })
      }
      var rowsToInsert = payload.new_vacations.map(function(v: any, idx: number) {
        return {
          contract_id: contractId,
          date_vacation: v.date_vacation,
          heure_debut: v.heure_debut,
          heure_fin: v.heure_fin,
          ordre: (maxOrdre + idx + 1)
        }
      })
      var insVacsRes = await sb.from('hr_contract_vacations').insert(rowsToInsert)
      if (insVacsRes.error) {
        console.error('[avenant] erreur insert vacations:', insVacsRes.error)
      }
    }
    
    // 9c) Insert hr_contract_amendments
    var insRes = await sb.from('hr_contract_amendments').insert({
      contract_id: contractId,
      amendment_number: nextNum,
      amendment_type: amendmentType,
      effective_date: effectiveDate,
      motif: motif,
      changes: changes,
      status: 'draft'
    }).select().single()
    
    if (insRes.error || !insRes.data) {
      return NextResponse.json({ error: 'Erreur sauvegarde avenant : ' + (insRes.error?.message || '') }, { status: 500 })
    }
    
    return NextResponse.json({
      ok: true,
      amendment: insRes.data,
      html: html,
      filename_suggestion: buildFilename(emp, amendmentSnapshot)
    })
    
  } catch (err: any) {
    console.error('[avenant API] error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
