// ============================================================
// /api/signatures/view/[token]/route.ts
// ============================================================
// Sert le HTML d'un document signé inline (rendu dans le navigateur)
// au lieu de forcer le téléchargement comme le fait Supabase Storage
// par défaut sur le HTML.
//
// Le token ici est un VIEW token court qu'on génère lors de l'envoi
// de la notif Edward. Format simple : {entityKind}_{id} encodé en base64.
//
// Lien type :
//   /api/signatures/view/eyJrIjoiYW1lbmRtZW50IiwiaSI6ImQwODI4ZWRiLi4uIn0
// ============================================================

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function getServerClient() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function GET(
  req: Request,
  ctx: { params: { token: string } }
) {
  // Décoder le token
  var entityKind = ""
  var entityId = ""
  var docKind = "main" // main ou welcomepack
  try {
    var decoded = Buffer.from(ctx.params.token, "base64url").toString("utf-8")
    var parsed = JSON.parse(decoded)
    entityKind = parsed.k || ""
    entityId = parsed.i || ""
    docKind = parsed.d || "main"
  } catch (e) {
    return new NextResponse("Token invalide", { status: 400 })
  }

  if (!entityKind || !entityId) {
    return new NextResponse("Token invalide", { status: 400 })
  }

  var supabase = getServerClient()
  if (!supabase) {
    return new NextResponse("Configuration serveur manquante", { status: 500 })
  }

  // Récupérer signed_pdf_path depuis DB
  var tableName = entityKind === "amendment" ? "hr_contract_amendments" : "hr_contracts"
  var resDoc = await supabase
    .from(tableName)
    .select("signed_pdf_path, signature_status")
    .eq("id", entityId)
    .maybeSingle()

  if (!resDoc.data || resDoc.data.signature_status !== "signed") {
    return new NextResponse("Document introuvable ou non signé", { status: 404 })
  }

  var mainPath = resDoc.data.signed_pdf_path
  if (!mainPath) {
    return new NextResponse("Chemin du document introuvable", { status: 404 })
  }

  // Si demande du welcomepack, transformer le path
  var targetPath = mainPath
  if (docKind === "welcomepack") {
    targetPath = mainPath.replace(/_avenant\.html$|_contrat\.html$/, "_welcomepack.html")
  }

  // Download depuis hr-signatures
  var resDownload = await supabase.storage
    .from("hr-signatures")
    .download(targetPath)

  if (resDownload.error || !resDownload.data) {
    return new NextResponse(
      "Document non trouvé : " + (resDownload.error ? resDownload.error.message : "inconnu"),
      { status: 404 }
    )
  }

  // Convertir blob en texte
  var htmlContent = await resDownload.data.text()

  // Wrapper avec bouton "Imprimer / PDF" en haut
  var wrapper =
    '<!DOCTYPE html>' +
    '<html lang="fr"><head>' +
    '<meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>' +
    '<title>Document signé Meshuga</title>' +
    '<style>' +
    '@media screen {' +
    '  body { margin: 0; padding: 0; background: #FAFAFA; font-family: Arial, sans-serif; }' +
    '  .meshuga-toolbar { position: sticky; top: 0; z-index: 9999; background: #FF82D7; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }' +
    '  .meshuga-toolbar h1 { margin: 0; font-size: 16px; font-weight: 700; }' +
    '  .meshuga-toolbar button { background: white; color: #FF82D7; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 14px; cursor: pointer; font-family: inherit; }' +
    '  .meshuga-toolbar button:hover { background: #FFEB5A; color: #191923; }' +
    '  .meshuga-doc { background: white; margin: 20px auto; max-width: 900px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }' +
    '}' +
    '@media print {' +
    '  .meshuga-toolbar { display: none !important; }' +
    '  .meshuga-doc { margin: 0 !important; max-width: none !important; box-shadow: none !important; }' +
    '}' +
    '</style>' +
    '</head><body>' +
    '<div class="meshuga-toolbar">' +
    '<h1>📄 Document signé Meshuga</h1>' +
    '<button onclick="window.print()">⬇ Télécharger en PDF</button>' +
    '</div>' +
    '<div class="meshuga-doc">' +
    htmlContent +
    '</div>' +
    '</body></html>'

  return new NextResponse(wrapper, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-cache",
    },
  })
}
