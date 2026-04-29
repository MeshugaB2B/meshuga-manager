// app/api/catering/view-devis/[id]/route.ts
// Phase 4V2.1 — Sert le HTML d'un devis archivé en mode inline (affichage navigateur).
// Le lien dans le mail "Voir le devis" pointe vers cet endpoint.
//
// URL : /api/catering/view-devis/{devisId}
// Réponse : HTML rendu directement par le navigateur (pas de téléchargement .txt)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 15

var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
var SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
var BUCKET = 'catering-quotes-pdfs'

function htmlError(msg: string, status: number) {
  var body = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Devis introuvable</title>' +
    '<style>body{font-family:Arial,sans-serif;background:#FFEB5A;color:#191923;padding:40px;text-align:center}' +
    'h1{font-family:cursive;font-size:36px;margin-bottom:10px}' +
    '.box{max-width:480px;margin:0 auto;background:white;border:2px solid #191923;padding:30px;border-radius:8px;box-shadow:5px 5px 0 #FF82D7}' +
    'a{color:#FF82D7;font-weight:900}</style></head><body>' +
    '<div class="box"><h1>Oups…</h1><p>' + msg + '</p>' +
    '<p style="margin-top:20px;font-size:13px;color:#666">Contactez-nous : <a href="mailto:events@meshuga.fr">events@meshuga.fr</a></p>' +
    '</div></body></html>'
  return new NextResponse(body, {
    status: status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  var devisId = context && context.params && context.params.id ? context.params.id : ''
  if (!devisId) return htmlError('Identifiant du devis manquant.', 400)

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return htmlError('Configuration serveur manquante.', 500)
  }

  var supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // 1. Récupérer le storage_path du devis
  var devisRes = await supabase
    .from('devis')
    .select('id, numero, pdf_storage_path')
    .eq('id', devisId)
    .single()

  if (devisRes.error || !devisRes.data) {
    return htmlError('Ce devis n\'existe pas ou a été supprimé.', 404)
  }

  var path = devisRes.data.pdf_storage_path
  if (!path) {
    return htmlError('Aucun PDF archivé pour ce devis.', 404)
  }

  // 2. Télécharger le HTML depuis Supabase Storage côté serveur
  var dl = await supabase.storage.from(BUCKET).download(path)
  if (dl.error || !dl.data) {
    return htmlError('Le devis archivé est inaccessible.', 500)
  }

  var arrayBuf = await dl.data.arrayBuffer()
  var html = Buffer.from(arrayBuf).toString('utf-8')

  // 3. Renvoyer en mode inline avec le bon Content-Type → le navigateur affiche le HTML
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=300', // 5 min cache
      'X-Robots-Tag': 'noindex, nofollow'
    }
  })
}
