// src/app/api/hr/extract-stoppage/route.ts
// OCR Claude Vision sur un certificat d'arrêt de travail.
// Reçoit multipart/form-data avec les fichiers du certificat,
// les uploade dans Storage hr-contract-docs, lance l'OCR, retourne l'extraction.
//
// Champs :
//   - employee_id : uuid (pour le path Storage)
//   - file_0, file_1, ... : photos OU 1 PDF
//
// Retourne :
//   { extraction: {...}, document_path: "...", document_pages: [...] }

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  HR_BUCKET,
  uploadToHrBucket,
  deleteFromHrBucket,
  extFromMime,
  slugify,
} from '@/lib/hr/storage'
import { extractStoppageFromImages } from '@/lib/hr/ocr-stoppage'
import { assemblePdfFromImages } from '@/lib/hr/pdf-assembler'

export var runtime = 'nodejs'
export var maxDuration = 300

export async function POST(req: Request) {
  var uploadedPaths: string[] = []
  try {
    var formData = await req.formData()
    var employee_id = String(formData.get('employee_id') || '')
    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id requis' }, { status: 400 })
    }

    // Récupérer les fichiers
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

    // Détection mode mono-PDF
    var isPdfMode = false
    if (files.length === 1 && (files[0].type || '').toLowerCase() === 'application/pdf') {
      isPdfMode = true
    } else {
      // pas de mix PDF + images
      for (var fi = 0; fi < files.length; fi++) {
        if ((files[fi].type || '').toLowerCase() === 'application/pdf') {
          return NextResponse.json(
            { error: 'Mix PDF + images non supporté.' },
            { status: 400 }
          )
        }
      }
    }

    var slug = slugify('arret-' + new Date().toISOString().slice(0, 10))
    var pages: Array<{ path: string; page_number: number; mime_type: string; size_bytes: number }> = []
    var pageBuffers: Array<{ buffer: Buffer; mimeType: string }> = []
    var documentPath: string

    if (isPdfMode) {
      // Mode PDF mono : stocker direct
      var pdfBuf = Buffer.from(await files[0].arrayBuffer())
      documentPath = `${employee_id}/stoppages/${slug}.pdf`
      await uploadToHrBucket(admin, documentPath, pdfBuf, 'application/pdf')
      uploadedPaths.push(documentPath)
      pageBuffers.push({ buffer: pdfBuf, mimeType: 'application/pdf' })
    } else {
      // Mode photos : upload chaque page + assemblage PDF
      for (var p = 0; p < files.length; p++) {
        var file = files[p]
        var buffer = Buffer.from(await file.arrayBuffer())
        var mime = file.type || 'application/octet-stream'
        var ext = extFromMime(mime, file.name)
        var pad = String(p + 1).padStart(2, '0')
        var path = `${employee_id}/stoppages/${slug}_p${pad}.${ext}`
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

      // Assembler en PDF
      try {
        var pdfBytes = await assemblePdfFromImages(pageBuffers)
        var pdfBufFromImages = Buffer.from(pdfBytes)
        documentPath = `${employee_id}/stoppages/${slug}_assembled.pdf`
        await uploadToHrBucket(admin, documentPath, pdfBufFromImages, 'application/pdf')
        uploadedPaths.push(documentPath)
      } catch (pdfErr: any) {
        // Non-fatal : on garde la 1ère image comme document_path
        documentPath = pages[0].path
      }
    }

    // Lancer OCR
    var result = await extractStoppageFromImages(pageBuffers)

    return NextResponse.json({
      extraction: result.extraction,
      model: result.model,
      document_path: documentPath,
      document_pages: pages,
      bucket: HR_BUCKET,
    })
  } catch (e: any) {
    if (uploadedPaths.length > 0) {
      try {
        var adminRollback = createAdminClient()
        await deleteFromHrBucket(adminRollback, uploadedPaths)
      } catch { /* silent */ }
    }
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/extract-stoppage error:', e)
    return NextResponse.json({ error: e.message || 'erreur extraction' }, { status: 500 })
  }
}
