// src/lib/hr/storage.ts
// Helpers pour le bucket Supabase Storage `hr-contract-docs`.
// Convention de path :
//   pages individuelles : {employeeId}/{cycleId}/{contractId}/pages/{slug}_p{N}.{ext}
//   PDF assemblé        : {employeeId}/{cycleId}/{contractId}/{docType}_{slug}.pdf

import type { SupabaseClient } from '@supabase/supabase-js'

export var HR_BUCKET = 'hr-contract-docs'
export var HR_BUCKET_EMPLOYEE = 'hr-employee-docs'

// Slugify FR-friendly : minuscules, accents enlevés, alphanum + tirets uniquement
export function slugify(input: string): string {
  if (!input) return 'doc'
  var s = input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return s || 'doc'
}

// Devine l'extension fichier depuis le mime ou le filename
export function extFromMime(mime: string, fallbackName?: string): string {
  if (!mime && fallbackName) {
    var dotIdx = fallbackName.lastIndexOf('.')
    if (dotIdx > 0) return fallbackName.slice(dotIdx + 1).toLowerCase()
  }
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/heic') return 'heic'
  if (mime === 'image/heif') return 'heif'
  if (mime === 'application/pdf') return 'pdf'
  return 'bin'
}

// Construire le path d'une page individuelle
export function buildPagePath(args: {
  employeeId: string
  cycleId: string
  contractId: string
  slug: string
  pageNumber: number
  ext: string
}): string {
  var pad = String(args.pageNumber).padStart(2, '0')
  return `${args.employeeId}/${args.cycleId}/${args.contractId}/pages/${args.slug}_p${pad}.${args.ext}`
}

// Construire le path du PDF assemblé
export function buildAssembledPath(args: {
  employeeId: string
  cycleId: string
  contractId: string
  docType: string
  slug: string
}): string {
  return `${args.employeeId}/${args.cycleId}/${args.contractId}/${args.docType}_${args.slug}.pdf`
}

// Upload générique vers le bucket hr-contract-docs avec admin client
export async function uploadToHrBucket(
  admin: SupabaseClient,
  path: string,
  body: Buffer | Uint8Array | ArrayBuffer | Blob,
  contentType: string
): Promise<{ path: string }> {
  var { error } = await admin.storage.from(HR_BUCKET).upload(path, body as any, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(`Storage upload failed (${path}): ${error.message}`)
  return { path }
}

// Télécharger un fichier en Buffer (utile pour OCR / PDF assembly)
export async function downloadFromHrBucket(
  admin: SupabaseClient,
  path: string
): Promise<{ buffer: Buffer; contentType: string }> {
  var { data, error } = await admin.storage.from(HR_BUCKET).download(path)
  if (error || !data) throw new Error(`Storage download failed (${path}): ${error?.message || 'no data'}`)
  var arrayBuffer = await data.arrayBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: data.type || 'application/octet-stream',
  }
}

// Créer une signed URL courte durée (lecture)
export async function getHrSignedUrl(
  admin: SupabaseClient,
  path: string,
  ttlSeconds: number = 3600
): Promise<string> {
  var { data, error } = await admin.storage.from(HR_BUCKET).createSignedUrl(path, ttlSeconds)
  if (error || !data?.signedUrl) throw new Error(`Signed URL failed (${path}): ${error?.message || 'no url'}`)
  return data.signedUrl
}

// Supprimer un ou plusieurs fichiers (utile pour rollback)
export async function deleteFromHrBucket(
  admin: SupabaseClient,
  paths: string[]
): Promise<void> {
  if (!paths.length) return
  var { error } = await admin.storage.from(HR_BUCKET).remove(paths)
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('Storage delete (non-fatal):', error.message)
  }
}
