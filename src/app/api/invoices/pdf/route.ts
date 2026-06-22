import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// GET /api/invoices/pdf?filename=...  (ou ?id=<pending_invoices.id>)
// Renvoie le PDF (ou l'image) d'origine archivé dans pending_invoices.pdf_base64.
// Sert à afficher la facture source quand on inspecte une anomalie de food cost.
export async function GET(req: Request) {
  try {
    var url = new URL(req.url)
    var filename = url.searchParams.get('filename') || ''
    var id = url.searchParams.get('id') || ''
    if (!filename && !id) {
      return new NextResponse('Paramètre filename ou id requis', { status: 400 })
    }

    var sb = getSupabase()
    var query = sb
      .from('pending_invoices')
      .select('id, file_name, pdf_base64, created_at')
      .not('pdf_base64', 'is', null)
    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('file_name', filename)
    }
    var resp = await query.order('created_at', { ascending: false }).limit(1)
    var row = resp.data && resp.data[0]
    if (!row || !row.pdf_base64 || String(row.pdf_base64).length < 100) {
      return new NextResponse('Facture introuvable ou non archivée', { status: 404 })
    }

    // Nettoyage d'un éventuel préfixe data URL
    var b64 = String(row.pdf_base64)
    var marker = b64.indexOf('base64,')
    if (marker > -1) b64 = b64.slice(marker + 7)
    b64 = b64.replace(/\s/g, '')

    var buf = Buffer.from(b64, 'base64')

    // Détection du type réel (PDF vs image) à partir des premiers octets
    var contentType = 'application/pdf'
    if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
      contentType = 'application/pdf' // %PDF
    } else if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      contentType = 'image/jpeg'
    } else if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      contentType = 'image/png'
    }

    var safeName = String(row.file_name || 'facture').replace(/[^a-zA-Z0-9._-]/g, '_')

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline; filename="' + safeName + '"',
        'Cache-Control': 'private, no-store, max-age=0'
      }
    })
  } catch (e: any) {
    return new NextResponse('Erreur: ' + (e && e.message ? e.message : 'inconnue'), { status: 500 })
  }
}
