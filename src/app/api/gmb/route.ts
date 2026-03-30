import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getValidToken(): Promise<string | null> {
  const { data } = await sb.from('gmb_tokens').select('*').eq('id', 1).single()
  if (!data) return null

  // Token encore valide ?
  if (new Date(data.expires_at) > new Date(Date.now() + 60000)) {
    return data.access_token
  }

  // Rafraichir avec le refresh_token
  if (!data.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_GMB_CLIENT_ID!,
      client_secret: process.env.GOOGLE_GMB_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const tokens = await res.json()
  if (!res.ok || !tokens.access_token) return null

  await sb.from('gmb_tokens').update({
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', 1)

  return tokens.access_token
}

export async function GET(request: NextRequest) {
  const token = await getValidToken()

  if (!token) {
    return NextResponse.json({ connected: false })
  }

  try {
    // Recuperer les comptes GMB
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: 'Bearer ' + token }
    })
    if (!accountsRes.ok) {
      return NextResponse.json({ connected: false, error: 'accounts_failed' })
    }
    const accountsData = await accountsRes.json()
    const account = accountsData.accounts?.[0]
    if (!account) return NextResponse.json({ connected: true, reviews: [], stats: null })

    const accountName = account.name

    // Recuperer les etablissements
    const locRes = await fetch(
      'https://mybusinessbusinessinformation.googleapis.com/v1/' + accountName + '/locations?readMask=name,title,storefrontAddress',
      { headers: { Authorization: 'Bearer ' + token } }
    )
    const locData = locRes.ok ? await locRes.json() : {}
    const location = locData.locations?.[0]
    if (!location) return NextResponse.json({ connected: true, reviews: [], stats: null, accountName })

    const locationName = location.name

    // Recuperer les avis
    const reviewsRes = await fetch(
      'https://mybusiness.googleapis.com/v4/' + locationName + '/reviews?pageSize=50',
      { headers: { Authorization: 'Bearer ' + token } }
    )
    const reviewsData = reviewsRes.ok ? await reviewsRes.json() : {}
    const reviews = reviewsData.reviews || []

    // Stats
    const totalRating = reviews.reduce((s: number, r: any) => {
      const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }
      return s + (map[r.starRating] || 0)
    }, 0)
    const avgRating = reviews.length > 0 ? Math.round(totalRating / reviews.length * 10) / 10 : 0
    const withReply = reviews.filter((r: any) => r.reviewReply).length

    return NextResponse.json({
      connected: true,
      locationName,
      avgRating,
      totalReviews: reviews.length,
      withoutReply: reviews.length - withReply,
      reviews: reviews.slice(0, 20).map((r: any) => ({
        id: r.reviewId,
        author: r.reviewer?.displayName || 'Anonyme',
        rating: { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }[r.starRating] || 0,
        text: r.comment || '',
        date: r.createTime,
        hasReply: !!r.reviewReply,
        reply: r.reviewReply?.comment || '',
      }))
    })
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message })
  }
}
