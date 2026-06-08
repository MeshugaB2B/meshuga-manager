import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Instagram Graph API (compte Business relié à une Page Facebook).
// Tant qu'aucun jeton n'est configuré, on renvoie connected:false SANS fausses données.
export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN || ''

  if (!token) {
    return NextResponse.json({ ok: true, connected: false, reason: 'no_token' })
  }

  try {
    // Profil
    const profileRes = await fetch(
      'https://graph.instagram.com/me?fields=id,username,followers_count,media_count&access_token=' + token
    )
    const profile = await profileRes.json()
    if (profile.error) {
      return NextResponse.json({ ok: true, connected: false, reason: 'token_invalid', error: profile.error.message || 'Jeton invalide ou expiré' })
    }

    // Médias récents (best-effort)
    let mediaData: any = { data: [] }
    try {
      const mediaRes = await fetch(
        'https://graph.instagram.com/me/media?fields=id,caption,permalink,timestamp,like_count,comments_count,media_type,thumbnail_url,media_url&limit=12&access_token=' + token
      )
      mediaData = await mediaRes.json()
      if (mediaData.error) mediaData = { data: [] }
    } catch (e) { mediaData = { data: [] } }

    const media = (mediaData.data || []).map(function (p: any) {
      return {
        permalink: p.permalink,
        caption: p.caption || '',
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        thumbnailUrl: p.thumbnail_url || p.media_url || null,
      }
    })

    // Commentaires des 3 derniers posts (best-effort, chaque appel isolé)
    const comments: any[] = []
    const recentMedia = (mediaData.data || []).slice(0, 3)
    for (const post of recentMedia) {
      try {
        const commRes = await fetch(
          'https://graph.instagram.com/' + post.id + '/comments?fields=id,text,username,timestamp,replies&limit=5&access_token=' + token
        )
        const commData = await commRes.json()
        for (const c of (commData.data || [])) {
          comments.push({
            username: c.username || 'utilisateur',
            text: c.text,
            date: c.timestamp ? new Date(c.timestamp).toLocaleDateString('fr-FR') : '',
            postCaption: post.caption ? post.caption.slice(0, 40) : 'Post Instagram',
            shortcode: post.id,
            replied: !!(c.replies && c.replies.data && c.replies.data.length > 0),
          })
        }
      } catch (e) { /* commentaires de ce post ignorés */ }
    }

    // Messages directs (best-effort : permission Meta souvent à valider séparément)
    const myId = String(profile.id || '')
    let messages: any[] = []
    let mdebug: string | null = null
    try {
      const inboxRes = await fetch(
        'https://graph.instagram.com/v23.0/me/conversations?platform=instagram&fields=id,updated_time,participants,messages{id,message,created_time,from}&access_token=' + token
      )
      const inboxData = await inboxRes.json()
      if (inboxData.error) {
        mdebug = 'conv_error: ' + String(inboxData.error.message || JSON.stringify(inboxData.error)).slice(0, 220)
      }
      if (!inboxData.error) {
        messages = (inboxData.data || []).slice(0, 20).map(function (conv: any) {
          const msgs = (conv.messages && conv.messages.data) || []
          const other = ((conv.participants && conv.participants.data) || []).find(function (p: any) { return String(p.id) !== myId })
          const last = msgs[0]
          // L'API renvoie les messages du plus récent au plus ancien -> on inverse pour l'affichage chronologique
          const thread = msgs.slice().reverse().map(function (m: any) {
            return {
              text: m.message || '',
              fromMe: !!(m.from && String(m.from.id) === myId),
              date: m.created_time ? new Date(m.created_time).toLocaleString('fr-FR') : '',
            }
          })
          return {
            conversationId: conv.id || null,
            recipientId: other ? other.id : (last && last.from ? last.from.id : null),
            username: other ? (other.username || other.name || 'utilisateur') : 'utilisateur',
            lastMessage: last ? (last.message || '') : '',
            date: last && last.created_time ? new Date(last.created_time).toLocaleDateString('fr-FR') : '',
            updatedTime: conv.updated_time || '',
            messages: thread,
          }
        })
      }
      if (!messages.length && !mdebug) mdebug = 'conv_ok_0_conversations'
    } catch (e: any) { messages = []; mdebug = 'exception: ' + String(e && e.message ? e.message : e).slice(0, 180) }

    // "À répondre" = fils dont le dernier message vient du client (pas de nous)
    const toReply = messages.filter(function (m: any) {
      return m.messages && m.messages.length && !m.messages[m.messages.length - 1].fromMe
    }).length

    return NextResponse.json({
      ok: true,
      connected: true,
      username: profile.username || '',
      followers: profile.followers_count || 0,
      mediaCount: profile.media_count || 0,
      unreadMessages: toReply,
      mdebug,
      comments,
      messages,
      media,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, connected: false, error: e.message })
  }
}
