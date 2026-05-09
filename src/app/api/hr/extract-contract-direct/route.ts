// src/app/api/hr/extract-contract-direct/route.ts
// Variante de extract-contract qui accepte FormData directement (multipart).
// Utilisée par le wizard de régularisation en mode "contrat originel" :
// l'utilisateur drop le PDF/photos directement, on upload tout et on extrait.
//
// L'endpoint extract-contract original attend { contract_doc_id } en JSON
// (pour réextraire un doc déjà uploadé). Cette variante gère le cas drop-and-extract.
//
// Multipart : employee_id + file_001, file_002, ... (1 fichier = 1 page,
// dans l'ordre. PDF mono-fichier supporté aussi.)

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  uploadToHrBucket,
  deleteFromHrBucket,
  extFromMime,
  slugify,
} from '@/lib/hr/storage'
import { extractContractFromImages } from '@/lib/hr/ocr'

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

    // Récupérer les fichiers — chacun est UNE page (ou un PDF mono)
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
    var stamp = Date.now()
    var slug = slugify('contrat-originel-' + new Date().toISOString().slice(0, 10) + '-' + stamp)

    // Détecter si le 1er fichier est un PDF (mode mono-PDF) sinon mode multi-images
    var isPdfMode = files.length === 1 && (files[0].type || '').toLowerCase() === 'application/pdf'

    // Upload tous les fichiers ET préparer les buffers pour OCR
    var imageBuffers: Array<{ buffer: Buffer; mimeType: string }> = []
    var primaryPath: string | null = null
    var primaryMime: string | null = null
    var totalSize = 0

    if (isPdfMode) {
      // Mode PDF : un seul fichier upload
      var f = files[0]
      var buf = Buffer.from(await f.arrayBuffer())
      var mime = f.type || 'application/pdf'
      var path = `${employee_id}/originel/${slug}.pdf`
      await uploadToHrBucket(admin, path, buf, mime)
      uploadedPaths.push(path)
      primaryPath = path
      primaryMime = mime
      totalSize = buf.length
      imageBuffers.push({ buffer: buf, mimeType: mime })
    } else {
      // Mode multi-images : upload chaque page
      for (var fi = 0; fi < files.length; fi++) {
        var file = files[fi]
        var buffer = Buffer.from(await file.arrayBuffer())
        var fileMime = file.type || 'application/octet-stream'
        var ext = extFromMime(fileMime, file.name)
        var pad = String(fi + 1).padStart(2, '0')
        var pgPath = `${employee_id}/originel/${slug}_p${pad}.${ext}`
        await uploadToHrBucket(admin, pgPath, buffer, fileMime)
        uploadedPaths.push(pgPath)
        if (fi === 0) {
          primaryPath = pgPath
          primaryMime = fileMime
        }
        totalSize += buffer.length
        imageBuffers.push({ buffer: buffer, mimeType: fileMime })
      }
    }

    // Lancer l'extraction OCR avec la lib existante
    var result = await extractContractFromImages(imageBuffers)

    return NextResponse.json({
      extraction: result.extraction,
      model: result.model,
      pages_analyzed: imageBuffers.length,
      // storage_path utilisé par le wizard pour insérer le row contrat_signe :
      storage_path: primaryPath,
      mime_type: primaryMime || 'application/pdf',
      file_size: totalSize,
      all_paths: uploadedPaths,
    })
  } catch (e: any) {
    // Rollback Storage si échec après upload
    if (uploadedPaths.length > 0) {
      try {
        var adminRollback = createAdminClient()
        await deleteFromHrBucket(adminRollback, uploadedPaths)
      } catch { /* silent */ }
    }
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/extract-contract-direct error:', e)
    return NextResponse.json({ error: e.message || 'erreur extraction' }, { status: 500 })
  }
}
