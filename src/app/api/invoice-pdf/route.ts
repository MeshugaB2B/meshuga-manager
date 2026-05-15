// src/app/api/invoice-pdf/route.ts
// =============================================================================
// Sert le PDF d'une facture par nom de fichier
// 
// GET /api/invoice-pdf?filename=2026-05-12_Foodflow.pdf
//   → retourne le PDF binaire (Content-Type: application/pdf)
//   → ou redirige vers le PDF si stocké sur Storage
//
// Sources tentées dans l'ordre :
//   1. pending_invoices.pdf_base64 où file_name = ?
//   2. (fallback) 404 si pas trouvé
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function sb() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
}

export async function GET(req: NextRequest) {
  var filename = req.nextUrl.searchParams.get('filename')
  if (!filename) {
    return NextResponse.json({ error: 'filename requis' }, { status: 400 })
  }

  var client = sb()

  // Chercher par file_name exact d'abord
  var { data, error } = await client
    .from('pending_invoices')
    .select('pdf_base64, file_name')
    .eq('file_name', filename)
    .limit(1)
    .maybeSingle()

  // Si pas trouvé, essayer un match partiel (au cas où le nom diffère légèrement)
  if (!data) {
    var { data: data2 } = await client
      .from('pending_invoices')
      .select('pdf_base64, file_name')
      .ilike('file_name', '%' + filename + '%')
      .limit(1)
      .maybeSingle()
    data = data2
  }

  if (!data || !data.pdf_base64) {
    return NextResponse.json({ 
      error: 'PDF non trouvé pour cette facture', 
      filename: filename 
    }, { status: 404 })
  }

  // Décoder base64 -> binary
  try {
    var buffer = Buffer.from(data.pdf_base64, 'base64')
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="' + (data.file_name || filename) + '"',
        'Cache-Control': 'private, max-age=3600'
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Erreur décodage PDF: ' + e.message }, { status: 500 })
  }
}
