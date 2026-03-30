import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/dashboard?gmb=error&reason=' + (error || 'no_code'), request.url))
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID || ''
    const clientSecret = process.env.GOOGLE_GMB_CLIENT_SECRET || ''
    const redirectUri = request.nextUrl.origin + '/api/auth/google/callback'

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokenRes.ok || !tokens.access_token) {
      return NextResponse.redirect(new URL('/dashboard?gmb=error&reason=token_failed', request.url))
    }

    // Stocker le token dans un cookie httpOnly
    const response = NextResponse.redirect(new URL('/dashboard?gmb=connected&page=gmb', request.url))
    response.cookies.set('gmb_access_token', tokens.access_token, {
      httpOnly: true,
      secure: true,
      maxAge: tokens.expires_in || 3600,
      path: '/',
    })
    if (tokens.refresh_token) {
      response.cookies.set('gmb_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    }
    return response
  } catch (e: any) {
    return NextResponse.redirect(new URL('/dashboard?gmb=error&reason=' + encodeURIComponent(e.message), request.url))
  }
}
