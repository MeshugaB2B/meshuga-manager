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

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_GMB_CLIENT_SECRET || ''
  const redirectUri = 'https://meshuga-manager.vercel.app/api/auth/google/callback'

  // Debug: verifier les valeurs
  console.log('CLIENT_ID prefix:', clientId.substring(0, 20))
  console.log('CLIENT_SECRET prefix:', clientSecret.substring(0, 10))
  console.log('REDIRECT_URI:', redirectUri)
  console.log('CODE length:', code.length)

  try {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    console.log('Posting to token endpoint...')
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    const tokenText = await tokenRes.text()
    console.log('Token response status:', tokenRes.status)
    console.log('Token response:', tokenText.substring(0, 200))

    let tokens: any
    try { tokens = JSON.parse(tokenText) } catch { tokens = { error: tokenText } }

    if (!tokenRes.ok || !tokens.access_token) {
      const reason = tokens.error_description || tokens.error || 'token_failed_' + tokenRes.status
      return NextResponse.redirect(new URL('/dashboard?page=gmb&gmb=error&reason=' + encodeURIComponent(reason), request.url))
    }

    await sb.from('gmb_tokens').upsert({
      id: 1,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.redirect(new URL('/dashboard?page=gmb&gmb=connected', request.url))
  } catch (e: any) {
    console.log('Exception:', e.message)
    return NextResponse.redirect(new URL('/dashboard?page=gmb&gmb=error&reason=' + encodeURIComponent(e.message), request.url))
  }
}
