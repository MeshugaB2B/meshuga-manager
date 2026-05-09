// src/app/api/hr/extract-payslips/route.ts
// Reçoit 1+ fiches de paie d'un même salarié et extrait les infos consolidées :
//  - identité du salarié (préférer la fiche la plus récente, fallback ancienne)
//  - date d'embauche reconstituée (cherche dans toutes les fiches, prend la
//    date_entree la plus précoce trouvée explicitement)
//  - conditions contractuelles actuelles (depuis la fiche la plus récente)
//
// Multipart : employee_id + files (file_0, file_1, ...).
// Chaque "fichier" peut être un PDF mono-fiche, ou des images dans l'ordre.
// Pour différencier plusieurs fiches dans le même upload, on les sépare par
// le préfixe : file_PAYSLIP_NUM_PAGE_NUM (ex: file_001_001, file_001_002).
// Plus simple : on accepte UN PDF par fiche (1 PDF = 1 fiche), ou alors
// images groupées par fiche (file_001 = page unique de fiche 1, etc.)
//
// Pour la V1 : on accepte simple — chaque fichier (image ou PDF) = 1 fiche.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  HR_BUCKET,
  uploadToHrBucket,
  deleteFromHrBucket,
  extFromMime,
  slugify,
} from '@/lib/hr/storage'
import { extractPayslipFromImages, type PayslipExtraction } from '@/lib/hr/ocr-payslip'

export var runtime = 'nodejs'
export var maxDuration = 300

// Comparer 2 dates ISO et retourner la plus ancienne (ou null si les 2 null)
function earliestIso(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
}

// Consolide N extractions en un récap unique
function consolidateExtractions(items: Array<{
  extraction: PayslipExtraction
  index: number
  filename: string
}>): any {
  if (items.length === 0) return null

  // Trier par period_start ASC pour avoir la plus ancienne en premier
  var sorted = items.slice().sort(function (a: any, b: any) {
    var pa = a.extraction.period_start || '9999-12-31'
    var pb = b.extraction.period_start || '9999-12-31'
    return pa.localeCompare(pb)
  })
  var oldest = sorted[0]
  var newest = sorted[sorted.length - 1]

  // Date d'embauche : on prend la plus ancienne date_entree explicite trouvée
  // dans n'importe quelle fiche. Si aucune fiche ne donne date_entree, on
  // utilise le 1er du mois de la fiche la plus ancienne (estimation de fallback).
  var earliestEntree: string | null = null
  for (var i = 0; i < items.length; i++) {
    var de = items[i].extraction?.contract?.date_entree
    if (de) earliestEntree = earliestIso(earliestEntree, de)
  }
  var dateEmbauche = earliestEntree || oldest.extraction.period_start || null
  var dateEmbaucheSource = earliestEntree
    ? 'extraite explicitement de la fiche'
    : 'estimée depuis le début du mois de la fiche la plus ancienne (à vérifier)'

  // Identité : préférer les valeurs présentes les plus récentes (la fiche la plus
  // récente reflète l'adresse actuelle, le nom marital, etc.)
  function pickLatest(field: string): any {
    for (var i = sorted.length - 1; i >= 0; i--) {
      var v = (sorted[i].extraction.employee as any)?.[field]
      if (v) return v
    }
    return null
  }
  var employee = {
    civilite: pickLatest('civilite'),
    prenom: pickLatest('prenom'),
    nom: pickLatest('nom'),
    date_naissance: pickLatest('date_naissance'),
    lieu_naissance: pickLatest('lieu_naissance'),
    nationalite: pickLatest('nationalite'),
    adresse: pickLatest('adresse'),
    code_postal: pickLatest('code_postal'),
    ville: pickLatest('ville'),
    num_secu: pickLatest('num_secu'),
  }

  // Conditions contractuelles : prendre les valeurs les plus récentes
  function pickLatestContract(field: string): any {
    for (var i = sorted.length - 1; i >= 0; i--) {
      var v = (sorted[i].extraction.contract as any)?.[field]
      if (v !== null && v !== undefined && v !== '') return v
    }
    return null
  }
  var contract = {
    fonction: pickLatestContract('fonction'),
    statut_cadre: pickLatestContract('statut_cadre'),
    type_brut: pickLatestContract('type_brut'),
    niveau_ccn: pickLatestContract('niveau_ccn'),
    echelon_ccn: pickLatestContract('echelon_ccn'),
    classification: pickLatestContract('classification'),
    coefficient_ccn: pickLatestContract('coefficient_ccn'),
    salaire_brut_mensuel: pickLatestContract('salaire_brut_mensuel'),
    taux_horaire_brut: pickLatestContract('taux_horaire_brut'),
    heures_mensuelles: pickLatestContract('heures_mensuelles'),
    heures_hebdo: pickLatestContract('heures_hebdo'),
  }

  // Notes consolidées (quelles fiches ont été utilisées + warnings)
  var noteLines: string[] = []
  noteLines.push(items.length + ' fiche' + (items.length > 1 ? 's' : '') + ' analysée' + (items.length > 1 ? 's' : ''))
  noteLines.push('Plus ancienne : ' + (oldest.extraction.period_label || 'période inconnue'))
  noteLines.push('Plus récente : ' + (newest.extraction.period_label || 'période inconnue'))
  noteLines.push('Date d\'embauche : ' + (dateEmbauche || '?') + ' (' + dateEmbaucheSource + ')')

  var lowConfidenceCount = items.filter(function (i) { return i.extraction.meta?.confidence === 'low' }).length
  if (lowConfidenceCount > 0) {
    noteLines.push('⚠ ' + lowConfidenceCount + ' fiche' + (lowConfidenceCount > 1 ? 's' : '') + ' à faible confiance — vérifier les valeurs')
  }

  return {
    date_embauche: dateEmbauche,
    date_embauche_source: dateEmbaucheSource,
    date_embauche_extracted_explicitly: !!earliestEntree,
    employee: employee,
    contract: contract,
    payslips_count: items.length,
    period_oldest: oldest.extraction.period_start,
    period_newest: newest.extraction.period_end || newest.extraction.period_start,
    notes: noteLines,
    raw_items: sorted.map(function (s) {
      return {
        filename: s.filename,
        period_label: s.extraction.period_label,
        period_start: s.extraction.period_start,
        confidence: s.extraction.meta?.confidence,
        date_entree_found: s.extraction.contract?.date_entree,
      }
    }),
  }
}

export async function POST(req: Request) {
  var uploadedPaths: string[] = []
  try {
    var formData = await req.formData()
    var employee_id = String(formData.get('employee_id') || '')
    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    }

    // Récupérer les fichiers — chacun est UNE fiche de paie
    var files: File[] = []
    var entries = Array.from(formData.entries())
    entries.sort(function (a, b) { return a[0].localeCompare(b[0]) })
    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0]
      var value = entries[i][1]
      if (key.indexOf('file_') === 0 && value instanceof File) {
        files.push(value as File)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'au moins un fichier requis' }, { status: 400 })
    }

    var admin = createAdminClient()
    var slug = slugify('payslips-' + new Date().toISOString().slice(0, 10))

    // Pour chaque fiche : upload + extraction
    var items: Array<{ extraction: PayslipExtraction; index: number; filename: string; storage_path: string }> = []

    for (var fi = 0; fi < files.length; fi++) {
      var file = files[fi]
      var buffer = Buffer.from(await file.arrayBuffer())
      var mime = file.type || 'application/octet-stream'
      var ext = extFromMime(mime, file.name)
      var pad = String(fi + 1).padStart(2, '0')
      var path = `${employee_id}/payslips/${slug}_${pad}.${ext}`
      await uploadToHrBucket(admin, path, buffer, mime)
      uploadedPaths.push(path)

      // Extraction OCR
      var extracted = await extractPayslipFromImages([{ buffer: buffer, mimeType: mime }])
      items.push({
        extraction: extracted.extraction,
        index: fi,
        filename: file.name,
        storage_path: path,
      })

      // Insertion DB hr_contract_documents (rattaché à employee, pas contract)
      // En fait on ne peut pas, hr_contract_documents requiert contract_id.
      // On va plutôt stocker en meta dans la réponse, et au moment de la
      // génération du contrat de régularisation on rattachera.
    }

    var consolidated = consolidateExtractions(items)

    return NextResponse.json({
      consolidated: consolidated,
      items: items.map(function (it) {
        return {
          filename: it.filename,
          storage_path: it.storage_path,
          extraction: it.extraction,
        }
      }),
    })
  } catch (e: any) {
    if (uploadedPaths.length > 0) {
      try {
        var adminRollback = createAdminClient()
        await deleteFromHrBucket(adminRollback, uploadedPaths)
      } catch { /* silent */ }
    }
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/extract-payslips error:', e)
    return NextResponse.json({ error: e.message || 'erreur extraction' }, { status: 500 })
  }
}
