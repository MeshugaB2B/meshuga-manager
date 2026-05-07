// src/app/api/hr/extract-contract/route.ts
// OCR Claude Vision sur les pages d'un hr_contract_documents.
// Reçoit JSON :
//   - contract_doc_id : uuid (de hr_contract_documents) — extraction sur ses pages
//
// Retourne :
//   { extraction: {...}, model: '...' }
// Et met à jour hr_contract_documents.ocr_extraction + extracted_at.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { downloadFromHrBucket } from '@/lib/hr/storage'
import { extractContractFromImages } from '@/lib/hr/ocr'

export var runtime = 'nodejs'
export var maxDuration = 60

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { contract_doc_id } = body

    if (!contract_doc_id) {
      return NextResponse.json({ error: 'contract_doc_id requis' }, { status: 400 })
    }

    var admin = createAdminClient()

    // Récupérer le doc et ses pages
    var { data: doc, error: docErr } = await admin
      .from('hr_contract_documents')
      .select('id, contract_id, doc_type, pages, file_path, mime_type')
      .eq('id', contract_doc_id)
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'document introuvable' }, { status: 404 })
    }

    // Construire la liste des pages à OCRiser
    // Si pages[] présent → on prend chaque page individuelle (cas multi-photos)
    // Sinon → on prend file_path comme page unique (PDF ou image seule)
    var pageList: Array<{ path: string; mime_type: string }> = []
    if (Array.isArray(doc.pages) && doc.pages.length > 0) {
      for (var i = 0; i < doc.pages.length; i++) {
        var pg = doc.pages[i]
        if (pg && pg.path) {
          pageList.push({ path: pg.path, mime_type: pg.mime_type || 'image/jpeg' })
        }
      }
    } else if (doc.file_path) {
      // Cas mono-PDF : pages[] est vide mais file_path pointe sur le PDF
      pageList.push({ path: doc.file_path, mime_type: doc.mime_type || 'application/pdf' })
    }

    if (pageList.length === 0) {
      return NextResponse.json({ error: 'aucune page à analyser' }, { status: 400 })
    }

    // Note : Anthropic API supporte les PDFs nativement via type:'document'.
    // Le wrapper extractContractFromImages gère les deux cas (images + PDF mono).

    // Télécharger chaque page depuis Storage
    var imageBuffers: Array<{ buffer: Buffer; mimeType: string }> = []
    for (var j = 0; j < pageList.length; j++) {
      var dl = await downloadFromHrBucket(admin, pageList[j].path)
      imageBuffers.push({
        buffer: dl.buffer,
        mimeType: pageList[j].mime_type || dl.contentType,
      })
    }

    // Lancer l'extraction OCR
    var result = await extractContractFromImages(imageBuffers)

    // Persister l'extraction sur le doc
    await admin
      .from('hr_contract_documents')
      .update({
        ocr_extraction: result.extraction,
        extracted_at: new Date().toISOString(),
      })
      .eq('id', contract_doc_id)

    return NextResponse.json({
      extraction: result.extraction,
      model: result.model,
      pages_analyzed: pageList.length,
    })
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error('POST /api/hr/extract-contract error:', e)
    return NextResponse.json({ error: e.message || 'erreur extraction' }, { status: 500 })
  }
}
