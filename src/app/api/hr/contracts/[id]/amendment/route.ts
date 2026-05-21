// src/app/api/hr/contracts/[id]/amendment/route.ts

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildAvenant } from '@/app/dashboard/rh/amendmentBuilder'
import { loadEmployerSignature } from '@/app/dashboard/rh/employerSignature'
import { LOGO_PINK } from '@/app/dashboard/logos'

export var runtime = 'nodejs'

// 🔥 Calcule la date du lendemain au format YYYY-MM-DD
function getLendemain(dateStr: string): string {
  if (!dateStr) return ''
  var iso = String(dateStr).slice(0, 10)
  var d = new Date(iso + 'T12:00:00')
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + 1)
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1).padStart(2, '0')
  var day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

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
  else if (amendmentType === 'regularisation_welcome_pack') {
    // 🔥 Mise en conformité réglementaire : aucune modification de champ contractuel.
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
    regularisation_welcome_pack: 'regularisation',
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
    var motif = payload.motif || ''
    var preview = payload.preview === true
    
    // 🔥 Date de signature de l'avenant (distincte de contract.date_signature)
    var signatureDate = payload.signature_date || new Date().toISOString().slice(0, 10)
    
    // effectiveDate sera potentiellement écrasée plus bas pour Extra prolongation
    var effectiveDate = payload.effective_date || new Date().toISOString().slice(0, 10)
    
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
    
    // 🔥 Sprint C2B fix : résoudre employee_id via cycle_id si manquant
    var employeeIdForLookup = currentContract.employee_id
    if (!employeeIdForLookup && currentContract.cycle_id) {
      var cycleRes = await sb.from('hr_employment_cycles')
        .select('employee_id')
        .eq('id', currentContract.cycle_id)
        .single()
      if (cycleRes.data && cycleRes.data.employee_id) {
        employeeIdForLookup = cycleRes.data.employee_id
      }
    }
    if (!employeeIdForLookup) {
      return NextResponse.json({ error: 'Salarié introuvable (ni employee_id ni cycle_id valide sur le contrat)' }, { status: 404 })
    }
    
    var empRes = await sb.from('hr_employees').select('*').eq('id', employeeIdForLookup).single()
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
    
    // 🔥 3b) RÈGLES MÉTIER pour Extra prolongation :
    //    - effective_date FORCÉ au lendemain de la date_fin actuelle (continuité juridique)
    //    - new_date_fin recalculé automatiquement = date de la dernière vacation
    if (amendmentType === 'prolongation_duree' && currentContract.type === 'extra') {
      // Force effective_date = lendemain
      if (currentContract.date_fin) {
        effectiveDate = getLendemain(String(currentContract.date_fin).slice(0, 10))
      }
      // Recalcule new_date_fin depuis la dernière vacation
      if (vacsForRendering.length > 0) {
        var derniereVacation = vacsForRendering.reduce(function(maxD: string, v: any) {
          var d = String(v.date_vacation || '').slice(0, 10)
          return d > maxD ? d : maxD
        }, '')
        if (derniereVacation) {
          payload.new_date_fin = derniereVacation
        }
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
      signature_date: signatureDate,  // 🔥 date de signature de l'avenant (pas du contrat initial)
      motif: motif,
      created_at: new Date().toISOString()
    }
    // 🔥 Charger la signature pré-enregistrée d'Edward (mandat permanent)
    var employerSig = await loadEmployerSignature()
    var html = buildAvenant(amendmentSnapshot, futureContract, emp, vacsForRendering, LOGO_PINK, previousValues, employerSig)
    
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
      signature_date: signatureDate,
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

// =============================================================================
// 🔥 DELETE : supprime un avenant ET fait le rollback de la modification
// =============================================================================
// Query string: ?amendment_id=xxx
// Logique :
//  - Récupère l'avenant via amendment_id
//  - Vérifie qu'il appartient bien au contrat (sécurité)
//  - ROLLBACK les changes (date_fin/salaire/horaires/fonction)
//  - Si c'était une prolongation : supprime les vacations dont la date > ancienne date_fin
//  - Supprime la ligne dans hr_contract_amendments
// =============================================================================
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    var contractId = ctx.params.id
    var url = new URL(req.url)
    var amendmentId = url.searchParams.get('amendment_id')
    
    if (!contractId || !amendmentId) {
      return NextResponse.json({ error: 'contract_id et amendment_id requis' }, { status: 400 })
    }
    
    var sb = createAdminClient()
    
    // 1) Charger l'avenant
    var amRes = await sb.from('hr_contract_amendments').select('*').eq('id', amendmentId).single()
    if (amRes.error || !amRes.data) {
      return NextResponse.json({ error: 'Avenant introuvable' }, { status: 404 })
    }
    var amendment = amRes.data
    
    // Sécurité : doit appartenir au contrat
    if (amendment.contract_id !== contractId) {
      return NextResponse.json({ error: 'Avenant non rattaché à ce contrat' }, { status: 403 })
    }
    
    // 2) Charger le contrat
    var contractRes = await sb.from('hr_contracts').select('*').eq('id', contractId).single()
    if (contractRes.error || !contractRes.data) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }
    var currentContract = contractRes.data
    
    // 3) ROLLBACK : remettre les valeurs "before" du diff
    var rollbackUpdates: any = {}
    if (amendment.changes && typeof amendment.changes === 'object') {
      Object.keys(amendment.changes).forEach(function(field) {
        var ch = amendment.changes[field]
        if (ch && ch.before !== undefined) {
          rollbackUpdates[field] = ch.before
        }
      })
    }
    
    // Mémoriser l'ancienne date_fin (avant rollback) pour savoir quelles vacations supprimer
    var oldDateFin = null
    if (amendment.amendment_type === 'prolongation_duree' && rollbackUpdates.date_fin) {
      oldDateFin = rollbackUpdates.date_fin
    }
    
    if (Object.keys(rollbackUpdates).length > 0) {
      rollbackUpdates.updated_at = new Date().toISOString()
      var updRes = await sb.from('hr_contracts').update(rollbackUpdates).eq('id', contractId)
      if (updRes.error) {
        return NextResponse.json({ error: 'Erreur rollback contrat : ' + updRes.error.message }, { status: 500 })
      }
    }
    
    // 4) Si prolongation : supprimer les vacations qui sont au-delà de l'ancienne date_fin
    var nbVacationsDeleted = 0
    if (oldDateFin) {
      // Supprimer toutes les vacations avec date_vacation > oldDateFin
      var delVacsRes = await sb.from('hr_contract_vacations')
        .delete()
        .eq('contract_id', contractId)
        .gt('date_vacation', oldDateFin)
        .select('id')
      
      if (!delVacsRes.error && delVacsRes.data) {
        nbVacationsDeleted = delVacsRes.data.length
      }
    }
    
    // 5) Supprimer l'avenant lui-même
    var delAmRes = await sb.from('hr_contract_amendments').delete().eq('id', amendmentId)
    if (delAmRes.error) {
      return NextResponse.json({ error: 'Erreur suppression avenant : ' + delAmRes.error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      ok: true,
      rolled_back_fields: Object.keys(rollbackUpdates).filter(function(k) { return k !== 'updated_at' }),
      vacations_deleted: nbVacationsDeleted
    })
    
  } catch (err: any) {
    console.error('[avenant DELETE] error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}

// =============================================================================
// 🔥 GET : régénère le HTML d'un avenant existant (pour réimprimer le PDF)
// =============================================================================
// Query string: ?amendment_id=xxx
// =============================================================================
export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    var contractId = ctx.params.id
    var url = new URL(req.url)
    var amendmentId = url.searchParams.get('amendment_id')
    
    if (!contractId || !amendmentId) {
      return NextResponse.json({ error: 'contract_id et amendment_id requis' }, { status: 400 })
    }
    
    var sb = createAdminClient()
    
    var amRes = await sb.from('hr_contract_amendments').select('*').eq('id', amendmentId).single()
    if (amRes.error || !amRes.data) {
      return NextResponse.json({ error: 'Avenant introuvable' }, { status: 404 })
    }
    var amendment = amRes.data
    
    if (amendment.contract_id !== contractId) {
      return NextResponse.json({ error: 'Avenant non rattaché à ce contrat' }, { status: 403 })
    }
    
    var contractRes = await sb.from('hr_contracts').select('*').eq('id', contractId).single()
    if (contractRes.error || !contractRes.data) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }
    var contract = contractRes.data
    
    // 🔥 Sprint C2B fix : résoudre employee_id via cycle_id si manquant
    var employeeIdForLookup2 = contract.employee_id
    if (!employeeIdForLookup2 && contract.cycle_id) {
      var cycleRes2 = await sb.from('hr_employment_cycles')
        .select('employee_id')
        .eq('id', contract.cycle_id)
        .single()
      if (cycleRes2.data && cycleRes2.data.employee_id) {
        employeeIdForLookup2 = cycleRes2.data.employee_id
      }
    }
    if (!employeeIdForLookup2) {
      return NextResponse.json({ error: 'Salarié introuvable (ni employee_id ni cycle_id valide sur le contrat)' }, { status: 404 })
    }
    
    var empRes = await sb.from('hr_employees').select('*').eq('id', employeeIdForLookup2).single()
    if (empRes.error || !empRes.data) {
      return NextResponse.json({ error: 'Salarié introuvable' }, { status: 404 })
    }
    var emp = empRes.data
    
    var vacsRes = await sb.from('hr_contract_vacations')
      .select('*')
      .eq('contract_id', contractId)
      .order('ordre', { ascending: true })
    var vacs = vacsRes.data || []
    
    // Reconstituer previousValues depuis amendment.changes
    var previousValues: any = {}
    if (amendment.changes && typeof amendment.changes === 'object') {
      Object.keys(amendment.changes).forEach(function(field) {
        var ch = amendment.changes[field]
        if (ch && ch.before !== undefined) {
          previousValues[field] = ch.before
        }
      })
    }
    
    // 🔥 Charger la signature pré-enregistrée d'Edward (mandat permanent)
    var employerSig2 = await loadEmployerSignature()
    var html = buildAvenant(amendment, contract, emp, vacs, LOGO_PINK, previousValues, employerSig2)
    
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
    
  } catch (err: any) {
    console.error('[avenant GET] error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
