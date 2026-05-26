// FILE PATH dans le repo (NOUVEAU FICHIER) :
//   src/lib/server-auth.ts
//
// Helper centralisé qui lit un Bearer token depuis Authorization header
// et renvoie l'email du user Supabase associé.
// Indépendant des cookies — fonctionne quel que soit le mode d'auth front
// (localStorage, cookie, etc.).

import { createClient } from "@supabase/supabase-js"

export async function getUserEmailFromBearer(req: Request): Promise<string | null> {
  try {
    var auth = req.headers.get("authorization") || req.headers.get("Authorization") || ""
    var match = auth.match(/^Bearer\s+(.+)$/i)
    if (!match) return null
    var token = match[1].trim()
    if (!token) return null

    var url = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    var anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    if (!url || !anon) return null

    var supa = createClient(url, anon)
    var r: any = await supa.auth.getUser(token)
    if (r.error) return null
    var email = r.data && r.data.user ? r.data.user.email : null
    return email ? email.toLowerCase() : null
  } catch (e) {
    return null
  }
}
