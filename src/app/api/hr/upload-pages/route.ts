// src/app/api/hr/upload-pages/route.ts
// Upload multi-photos d'un document (contrat, avenant, fiche de paie, ...).
// Reçoit multipart/form-data :
//   - contract_id   : uuid (le contrat auquel rattacher le doc)
//   - doc_type      : ex 'contrat_signe' | 'avenant' | 'fiche_paie' | 'solde_tout_compte' ...
//   - label         : optionnel, libellé court
//   - period_month  : optionnel ('2024-03' pour fiche de paie)
//   - assemble_pdf  : '1' | '0' (default '1') — générer un PDF assemblé
//   - file_0, file_1, ... : les photos dans l'ordre
//
// Retourne :
//   { document: hr_contract_documents row, pages_paths: [...], assembled_pdf_path: string|null }

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  HR_BUCKET,
  buildPagePath,
  buildAssembledPath,
  uploadToHrBucket,
  deleteFromHrBucket,
  extFromMime,
  slugify,
} from '@/lib/hr/storage'
import { assemblePdfFromImages } from '@/lib/hr/pdf-assembler'

// Configuration Next.js : on traite du multipart, donc pas de body parser auto
export var runtime = 'nodejs'
export var maxDuration = 60 // secondes (Vercel Pro)

export async function POST(req: Request) {
  var uploadedPaths: string[] = []
  try {
    var formData = await req.formData()

    var contract_id = String(formData.get('contract_id') || '')
    var doc_type = String(formData.get('doc_type') || '')
    var label = formData.get('label') ? String(formData.get('label')) : null
    var period_month = formData.get('period_month') ? String(formData.get('period_month')) : null
    var assemble_pdf_flag = String(formData.get('assemble_pdf') || '1') === '1'

    if (!contract_id) return NextResponse.json({ error: 'contract_id requis' }, { status: 400 })
    if (!doc_type) return NextResponse.json({ error: 'doc_type requis' }, { status: 400 })

    // Récupérer toutes les entrées file_*
    var files: File[] = []
    var entries = Array.from(formData.entries())
    // Trier par clé pour respecter l'ordre file_0, file_1, ...
    entries.sort(function (a, b) {
      return a[0].localeCompare(b[0])
    })
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

    // Récupérer le contrat pour avoir cycle_id et employee_id
    var { data: contract, error: contractErr } = await admin
      .from('hr_contracts')
      .select('id, cycle_id, employee_id')
      .eq('id', contract_id)
      .single()

    if (contractErr || !contract) {
      return NextResponse.json({ error: 'contrat introuvable' }, { status: 404 })
    }
    if (!contract.cycle_id || !contract.employee_id) {
      return NextResponse.json(
        { error: 'contrat sans cycle_id/employee_id — état incohérent' },
        { status: 400 }
      )
    }

    var slug = slugify(label || doc_type)

    // 1. Upload chaque page individuellement
    var pages: Array<{ path: string; page_number: number; mime_type: string; size_bytes: number }> = []
    var pageBuffers: Array<{ buffer: Buffer; mimeType: string }> = []

    for (var p = 0; p < files.length; p++) {
      var file = files[p]
      var arrayBuf = await file.arrayBuffer()
      var buffer = Buffer.from(arrayBuf)
      var mime = file.type || 'application/octet-stream'
      var ext = extFromMime(mime, file.name)

      var path = buildPagePath({
        employeeId: contract.employee_id,
        cycleId: contract.cycle_id,
        contractId: contract_id,
        slug,
        pageNumber: p + 1,
        ext,
      })

      await uploadToHrBucket(admin, path, buffer, mime)
      uploadedPaths.push(path)

      pages.push({
        path,
        page_number: p + 1,
        mime_type: mime,
        size_bytes: buffer.length,
      })
      pageBuffers.push({ buffer, mimeType: mime })
    }

    // 2. Optionnel : assembler un PDF
    var assembledPdfPath: string | null = null
    var totalSize = pages.reduce(function (acc, pg) {
      return acc + pg.size_bytes
    }, 0)

    if (assemble_pdf_flag) {
      try {
        var pdfBytes = await assemblePdfFromImages(pageBuffers)
        var pdfBuf = Buffer.from(pdfBytes)
        assembledPdfPath = buildAssembledPath({
          employeeId: contract.employee_id,
          cycleId: contract.cycle_id,
          contractId: contract_id,
          docType: doc_type,
          slug,
        })
        await uploadToHrBucket(admin, assembledPdfPath, pdfBuf, 'application/pdf')
        uploadedPaths.push(assembledPdfPath)
      } catch (pdfErr: any) {
        // Non-fatal : on garde quand même les pages individuelles
        // eslint-disable-next-line no-console
        console.warn('PDF assembly failed (non-fatal):', pdfErr.message)
      }
    }

    // 3. Créer la row hr_contract_documents
    var { data: doc, error: docErr } = await admin
      .from('hr_contract_documents')
      .insert({
        contract_id,
        doc_type,
        label,
        period_month,
        // file_path = path principal (PDF assemblé si dispo, sinon 1ère page)
        file_path: assembledPdfPath || pages[0].path,
        mime_type: assembledPdfPath ? 'application/pdf' : pages[0].mime_type,
        size_bytes: assembledPdfPath ? null : totalSize,
        pages: pages,
        assembled_pdf_path: assembledPdfPath,
      })
      .select('*')
      .single()

    if (docErr) {
      // Rollback : supprimer les fichiers uploadés
      await deleteFromHrBucket(admin, uploadedPaths)
      return NextResponse.json({ error: docErr.message }, { status: 500 })
    }

    return NextResponse.json({
      document: doc,
      pages_paths: pages.map(function (pg) { return pg.path }),
      assembled_pdf_path: assembledPdfPath,
      bucket: HR_BUCKET,
    })
  } catch (e: any) {
    // Rollback storage en cas d'erreur partielle
    if (uploadedPaths.length > 0) {
      try {
        var adminRollback = createAdminClient()
        await deleteFromHrBucket(adminRollback, uploadedPaths)
      } catch {
        // silencieux
      }
    }
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/upload-pages error:', e)
    return NextResponse.json({ error: e.message || 'erreur upload' }, { status: 500 })
  }
}
