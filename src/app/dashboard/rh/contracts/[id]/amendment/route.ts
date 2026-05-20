// src/app/api/hr/contracts/[id]/amendment/route.ts
// Création d'un avenant à un contrat existant.
// Modifie le champ concerné dans hr_contracts, enregistre la trace dans 
// hr_contract_amendments avec le diff avant/après, génère le PDF HTML.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildAvenant } from '@/app/dashboard/rh/amendmentBuilder'
import { LOGO_PINK } from '@/app/dashboard/logos'

export var runtime = 'nodejs'

// Mapping type d'avenant → champs à modifier dans hr_contracts
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
      changes.salaire_brut_mensuel = { 
        before: currentContract.salaire_brut_mensuel, 
        after: Number(payload.new_salaire_brut_mensuel) 
      }
    }
    if (payload.new_taux_horaire_brut != null) {
      updates.taux_horaire_brut = Number(payload.new_taux_horaire_brut)
      changes.taux_horaire_brut = { 
        before: currentContract.taux_horaire_brut, 
        after: Number(payload.new_taux_horaire_brut) 
      }
    }
    if (payload.new_salaire_lettres) {
      updates.salaire_lettres = payload.new_salaire_lettres
    }
    if (Object.keys(changes).length === 0) {
      throw new Error('Aucun champ de rémunération fourni pour augmentation_salaire')
    }
  }
  else if (amendmentType === 'modification_horaires') {
    if (payload.new_heures_hebdo != null) {
      updates.heures_hebdo = Number(payload.new_heures_hebdo)
      changes.heures_hebdo = { 
        before: currentContract.heures_hebdo, 
        after: Number(payload.new_heures_hebdo) 
      }
    }
    if (payload.new_heures_mensuelles != null) {
      updates.heures_mensuelles = Number(payload.new_heures_mensuelles)
      changes.heures_mensuelles = { 
        before: currentContract.heures_mensuelles, 
        after: Number(payload.new_heures_mensuelles) 
      }
    }
    if (Object.keys(changes).length === 0) {
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
    if (payload.new_missions_blocks) {
      updates.missions_blocks = payload.new_missions_blocks
      changes.missions_blocks = { 
        before: currentContract.missions_blocks, 
        after: payload.new_missions_blocks 
      }
    }
    if (Object.keys(changes).length === 0) {
      throw new Error('Aucune modification fournie pour changement_poste')
    }
  }
  else if (amendmentType === 'autre') {
    // Pas de modification automatique des champs, juste un document texte libre
    // Le motif décrit la modification
  }
  else {
    throw new Error('amendment_type inconnu : ' + amendmentType)
  }
  
  return { updates: updates, changes: changes }
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
    var preview = payload.preview === true  // si true, on ne sauve pas, on génère juste le HTML
    
    if (!amendmentType) {
      return NextResponse.json({ error: 'amendment_type requis' }, { status: 400 })
    }
    
    var sb = createAdminClient()
    
    // 1) Charger le contrat actuel + employé
    var contractRes = await sb.from('hr_contracts').select('*').eq('id', contractId).single()
    if (contractRes.error || !contractRes.data) {
      return NextResponse.json({ error: 'Contrat introuvable : ' + (contractRes.error?.message || '') }, { status: 404 })
    }
    var currentContract = contractRes.data
    
    var empRes = await sb.from('hr_employees').select('*').eq('id', currentContract.employee_id).single()
    if (empRes.error || !empRes.data) {
      return NextResponse.json({ error: 'Salarié introuvable' }, { status: 404 })
    }
    var emp = empRes.data
    
    // 2) Calculer les modifications + le diff (avant / après)
    var modResult
    try {
      modResult = applyChangesToContract(amendmentType, payload, currentContract)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }
    var updates = modResult.updates
    var changes = modResult.changes
    
    // 3) Numéro séquentiel de l'avenant
    var nbRes = await sb.from('hr_contract_amendments').select('amendment_number')
      .eq('contract_id', contractId)
      .order('amendment_number', { ascending: false }).limit(1)
    var nextNum = 1
    if (nbRes.data && nbRes.data.length > 0 && nbRes.data[0].amendment_number) {
      nextNum = nbRes.data[0].amendment_number + 1
    }
    
    // 4) Construire le contrat "future" (avec les changements) pour le rendu PDF
    var futureContract: any = Object.assign({}, currentContract, updates)
    
    // Valeurs "avant" pour le builder (utiles pour afficher le diff dans le PDF)
    var previousValues: any = {}
    Object.keys(changes).forEach(function(k) {
      previousValues[k] = changes[k].before
    })
    
    // 5) Générer le HTML
    var amendmentSnapshot = {
      amendment_number: nextNum,
      amendment_type: amendmentType,
      effective_date: effectiveDate,
      motif: motif,
      created_at: new Date().toISOString()
    }
    var html = buildAvenant(amendmentSnapshot, futureContract, emp, LOGO_PINK, previousValues)
    
    // 6) Si preview → on retourne juste le HTML, pas de sauvegarde
    if (preview) {
      return new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      })
    }
    
    // 7) Sauvegarde : 
    //    - Update hr_contracts avec les nouvelles valeurs
    //    - Insert dans hr_contract_amendments
    
    // 7a) Update hr_contracts
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      var updRes = await sb.from('hr_contracts').update(updates).eq('id', contractId)
      if (updRes.error) {
        return NextResponse.json({ error: 'Erreur update contrat : ' + updRes.error.message }, { status: 500 })
      }
    }
    
    // 7b) Insert hr_contract_amendments
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
      html: html
    })
    
  } catch (err: any) {
    console.error('[avenant API] error:', err)
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
