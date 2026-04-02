import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN || ''

  if (!token) {
    // Mode démo
    return NextResponse.json({
      ok: true,
      mock: true,
      followers: 3842,
      mediaCount: 127,
      unreadMessages: 3,
      comments: [
        { username: 'marie_rive_gauche', text: 'Le Tuna Melt c\'est une addiction 😍 on revient chaque semaine !', date: '2026-04-01', postCaption: 'Tuna Melt du jour 🧀', shortcode: 'ABC123', replied: false },
        { username: 'paris_foodie', text: 'Vous livrez pour des events corporate ?', date: '2026-03-30', postCaption: 'Plateau B2B Meshuga', shortcode: 'DEF456', replied: true },
        { username: 'startup_lunch', text: 'On a commandé pour 45 personnes, service parfait 👌', date: '2026-03-29', postCaption: 'Commande B2B', shortcode: 'GHI789', replied: true },
        { username: 'lux_events_paris', text: 'Quel est votre délai minimum pour une commande corporate ?', date: '2026-03-27', postCaption: 'Hot Dog NY style', shortcode: 'JKL012', replied: false },
        { username: 'julien_b6e', text: 'Le Lobster Roll est 🔥🔥🔥 meilleur de Paris clairement', date: '2026-03-25', postCaption: 'Lobster Roll', shortcode: 'MNO345', replied: false },
      ],
      messages: [
        { username: 'agence_wagram', lastMessage: 'Bonjour, on organise un event pour 80 personnes le 15 mai, vous êtes disponibles ?', date: '2026-04-01', read: false },
        { username: 'rh_tech_startup', lastMessage: 'Merci pour le devis, on revient vers vous cette semaine', date: '2026-03-31', read: false },
        { username: 'hotel_lutetia_fb', lastMessage: 'Partenariat possible pour nos guests ? On aimerait vous recommander', date: '2026-03-29', read: false },
        { username: 'marine_officiel', lastMessage: 'Super service hier pour notre équipe ! On recommande', date: '2026-03-28', read: true },
        { username: 'event_corp_paris', lastMessage: 'Combien pour un plateau 50 personnes livré Paris 8e ?', date: '2026-03-26', read: true },
      ],
      media: [
        { permalink: 'https://www.instagram.com/p/ABC/', caption: 'Tuna Melt du jour 🧀🔥', likes: 312, comments: 28, thumbnailUrl: null },
        { permalink: 'https://www.instagram.com/p/DEF/', caption: 'Plateau B2B pour l\'équipe de @station_f 🥪', likes: 487, comments: 41, thumbnailUrl: null },
        { permalink: 'https://www.instagram.com/p/GHI/', caption: 'Lobster Roll 🦞 on n\'en revient toujours pas', likes: 623, comments: 67, thumbnailUrl: null },
        { permalink: 'https://www.instagram.com/p/JKL/', caption: 'Hot Dog New-York style, rive gauche 🗽', likes: 298, comments: 19, thumbnailUrl: null },
        { permalink: 'https://www.instagram.com/p/MNO/', caption: 'Pastrami maison comme à Manhattan 🥩', likes: 541, comments: 53, thumbnailUrl: null },
        { permalink: 'https://www.instagram.com/p/PQR/', caption: 'Smoked Salmon, le grand classique du deli', likes: 389, comments: 34, thumbnailUrl: null },
      ]
    })
  }

  try {
    // Récupère infos profil
    const profileRes = await fetch(
      'https://graph.instagram.com/me?fields=id,username,followers_count,media_count&access_token=' + token
    )
    const profile = await profileRes.json()
    if (profile.error) return NextResponse.json({ ok: false, error: profile.error.message })

    // Récupère les médias récents avec commentaires
    const mediaRes = await fetch(
      'https://graph.instagram.com/me/media?fields=id,caption,permalink,timestamp,like_count,comments_count,media_type,thumbnail_url&limit=12&access_token=' + token
    )
    const mediaData = await mediaRes.json()
    const media = (mediaData.data || []).map(function(p: any) {
      return {
        permalink: p.permalink,
        caption: p.caption || '',
        likes: p.like_count || 0,
        comments: p.comments_count || 0,
        thumbnailUrl: p.thumbnail_url || null,
      }
    })

    // Récupère les commentaires récents (sur les 3 derniers posts)
    const comments: any[] = []
    const recentMedia = (mediaData.data || []).slice(0, 3)
    for (const post of recentMedia) {
      const commRes = await fetch(
        'https://graph.instagram.com/' + post.id + '/comments?fields=id,text,username,timestamp,replies&limit=5&access_token=' + token
      )
      const commData = await commRes.json()
      for (const c of (commData.data || [])) {
        comments.push({
          username: c.username || 'utilisateur',
          text: c.text,
          date: new Date(c.timestamp).toLocaleDateString('fr-FR'),
          postCaption: post.caption ? post.caption.slice(0, 40) + '...' : 'Post Instagram',
          shortcode: post.id,
          replied: !!(c.replies && c.replies.data && c.replies.data.length > 0),
        })
      }
    }
    comments.sort(function(a: any, b: any) { return new Date(b.date).getTime() - new Date(a.date).getTime() })

    // Messages directs via Messenger API (Instagram DMs)
    const inboxRes = await fetch(
      'https://graph.facebook.com/v19.0/me/conversations?platform=instagram&fields=participants,messages{message,created_time,from}&access_token=' + token
    )
    const inboxData = await inboxRes.json()
    const messages = (inboxData.data || []).slice(0, 10).map(function(conv: any) {
      const lastMsg = conv.messages && conv.messages.data && conv.messages.data[0]
      const participant = (conv.participants && conv.participants.data || []).find(function(p: any) { return p.username !== 'meshuga.deli' })
      return {
        username: participant ? (participant.username || participant.name) : 'utilisateur',
        lastMessage: lastMsg ? lastMsg.message : '',
        date: lastMsg ? new Date(lastMsg.created_time).toLocaleDateString('fr-FR') : '',
        read: false,
      }
    })

    return NextResponse.json({
      ok: true,
      mock: false,
      followers: profile.followers_count || 0,
      mediaCount: profile.media_count || 0,
      unreadMessages: messages.length,
      comments,
      messages,
      media
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
