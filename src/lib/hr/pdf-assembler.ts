// src/lib/hr/pdf-assembler.ts
// Assemble N images de pages individuelles en 1 PDF unique (A4 portrait).
// Utilise pdf-lib (pure JS, fonctionne en Node + Edge runtime).

import { PDFDocument, PageSizes } from 'pdf-lib'

// Convertit HEIC/HEIF en JPEG avant embed (pdf-lib ne supporte que JPEG/PNG)
async function ensureEmbeddable(
  buffer: Buffer,
  mimeType: string
): Promise<{ buffer: Buffer; mimeType: 'image/jpeg' | 'image/png' }> {
  var mime = (mimeType || '').toLowerCase()

  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    return { buffer, mimeType: 'image/jpeg' }
  }
  if (mime === 'image/png') {
    return { buffer, mimeType: 'image/png' }
  }
  if (mime === 'image/heic' || mime === 'image/heif') {
    var heicConvert: any = (await import('heic-convert')).default
    var jpegArrayBuffer = await heicConvert({
      buffer,
      format: 'JPEG',
      quality: 0.9,
    })
    return { buffer: Buffer.from(jpegArrayBuffer), mimeType: 'image/jpeg' }
  }
  // webp ou autre : pdf-lib ne supporte pas → tentative JPEG (l'image embed risque d'échouer)
  // À améliorer plus tard si besoin (ajouter sharp pour conversion).
  return { buffer, mimeType: 'image/jpeg' }
}

// Assemble les pages en PDF A4 portrait. Chaque image est centrée et redimensionnée
// pour rentrer dans la page tout en conservant le ratio.
export async function assemblePdfFromImages(
  pages: Array<{ buffer: Buffer; mimeType: string }>
): Promise<Uint8Array> {
  if (!pages.length) throw new Error('No pages to assemble')

  var pdfDoc = await PDFDocument.create()

  // A4 portrait : 595 x 842 points
  var [pageWidth, pageHeight] = PageSizes.A4
  var margin = 24 // marge de 24pt autour de l'image

  for (var i = 0; i < pages.length; i++) {
    var raw = pages[i]
    var ready = await ensureEmbeddable(raw.buffer, raw.mimeType)

    var embedded
    if (ready.mimeType === 'image/png') {
      embedded = await pdfDoc.embedPng(ready.buffer)
    } else {
      embedded = await pdfDoc.embedJpg(ready.buffer)
    }

    var imgW = embedded.width
    var imgH = embedded.height
    var maxW = pageWidth - margin * 2
    var maxH = pageHeight - margin * 2

    // Calcul du facteur d'échelle pour fit-to-page
    var scale = Math.min(maxW / imgW, maxH / imgH)
    var drawW = imgW * scale
    var drawH = imgH * scale
    var x = (pageWidth - drawW) / 2
    var y = (pageHeight - drawH) / 2

    var page = pdfDoc.addPage([pageWidth, pageHeight])
    page.drawImage(embedded, {
      x,
      y,
      width: drawW,
      height: drawH,
    })
  }

  // Métadonnées discrètes
  pdfDoc.setProducer('Meshuga B2B Manager — RH')
  pdfDoc.setCreator('Meshuga B2B Manager')
  pdfDoc.setCreationDate(new Date())

  return await pdfDoc.save()
}
