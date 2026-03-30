import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard?page=gmb&gmb=error&reason=' + (error || 'no_code'), request.url))
  }

  try {
    const redirectUri = request.nextUrl.origin + '/api/auth/google/callback'
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID!,
        client_secret: process.env.GOOGLE_GMB_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()
    if (!tokenRes.ok || !tokens.access_token) {
      return NextResponse.redirect(new URL('/dashboard?page=gmb&gmb=error&reason=token_failed', request.url))
    }

    // Stocker dans Supabase (upsert sur id=1)
    await sb.from('gmb_tokens').upsert({
      id: 1,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.redirect(new URL('/dashboard?page=gmb&gmb=connected', request.url))
  } catch (e: any) {
    return NextResponse.redirect(new URL('/dashboard?page=gmb&gmb=error&reason=' + encodeURIComponent(e.message), request.url))
  }
}
