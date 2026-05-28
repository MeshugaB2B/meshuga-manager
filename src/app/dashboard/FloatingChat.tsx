'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// =============================================================================
// FloatingChat — Widget chat Edward ↔ Emy flottant en bas à droite
//
// Comportement :
//   - Bouton replié : cercle rose 56×56 fixed bottom-right + badge unread
//   - Click bouton : panel 360×500 slide-up avec header, messages, textarea
//   - Disponible sur toutes les pages du dashboard
//   - Raccourcis : Esc ferme, Enter envoie, Shift+Enter retour ligne
//   - Polling 15s pour les nouveaux messages
//   - Auto-scroll vers le bas à l'ouverture et à l'envoi
//   - Marque les messages comme lus à l'ouverture
//
// Table : messages (sender, content, created_at, read_at)
// =============================================================================

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export default function FloatingChat(props) {
  var profile = props.profile
  var isEmy = !!props.isEmy

  var [open, setOpen] = useState(false)
  var [messages, setMessages] = useState([])
  var [text, setText] = useState('')
  var [unread, setUnread] = useState(0)
  var [loading, setLoading] = useState(true)
  var [sending, setSending] = useState(false)

  var listRef = useRef(null)
  var openRef = useRef(false)
  openRef.current = open

  var myRole = isEmy ? 'emy' : 'edward'
  var otherRole = isEmy ? 'edward' : 'emy'

  function scrollToBottom() {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }

  function loadMessages() {
    sb().from('messages').select('*').order('created_at', { ascending: true }).limit(200).then(function(res) {
      var data = res.data || []
      setMessages(data)
      var u = data.filter(function(m) { return m.sender === otherRole && !m.read_at }).length
      setUnread(u)
      setLoading(false)
      if (openRef.current) {
        setTimeout(scrollToBottom, 50)
      }
    })
  }

  function markAsRead() {
    var unreadIds = messages.filter(function(m) { return m.sender === otherRole && !m.read_at }).map(function(m) { return m.id })
    if (unreadIds.length === 0) return
    sb().from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds).then(function() {
      setUnread(0)
      setMessages(function(prev) {
        return prev.map(function(m) {
          if (unreadIds.indexOf(m.id) > -1) return Object.assign({}, m, { read_at: new Date().toISOString() })
          return m
        })
      })
    })
  }

  function sendMessage() {
    var content = text.trim()
    if (!content || sending) return
    setSending(true)
    var payload = { sender: myRole, content: content }
    sb().from('messages').insert(payload).select().single().then(function(res) {
      setSending(false)
      if (res.data) {
        setMessages(function(prev) { return prev.concat([res.data]) })
        setText('')
        setTimeout(scrollToBottom, 50)
      }
    })
  }

  // Initial fetch + polling
  useEffect(function() {
    loadMessages()
    var t = setInterval(loadMessages, 15000)
    return function() { clearInterval(t) }
  }, [])

  // Au open : mark read + scroll
  useEffect(function() {
    if (open) {
      setTimeout(scrollToBottom, 80)
      setTimeout(markAsRead, 500)
    }
  }, [open])

  // ESC pour fermer
  useEffect(function() {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return function() { window.removeEventListener('keydown', onKey) }
  }, [open])

  if (!profile) return null

  // === REPLIÉ : bouton flottant ===
  if (!open) {
    return (
      <button
        onClick={function() { setOpen(true) }}
        aria-label="Ouvrir la messagerie"
        style={{
          position:'fixed', bottom:24, right:24,
          width:60, height:60, borderRadius:'50%',
          background:'#FF82D7', border:'3px solid #191923',
          boxShadow:'4px 4px 0 #191923', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:55, fontSize:26, color:'#FFFFFF', padding:0,
          transition:'transform .1s'
        }}
        onMouseEnter={function(e){ e.currentTarget.style.transform='translate(-2px,-2px)'; e.currentTarget.style.boxShadow='6px 6px 0 #191923' }}
        onMouseLeave={function(e){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='4px 4px 0 #191923' }}>
        <span>💬</span>
        {unread > 0 && (
          <span style={{
            position:'absolute', top:-6, right:-6,
            background:'#CC0066', color:'#FFFFFF',
            border:'2.5px solid #191923', borderRadius:14,
            minWidth:26, height:26, padding:'0 7px',
            fontSize:12, fontWeight:900,
            display:'flex', alignItems:'center', justifyContent:'center',
            lineHeight:1, boxShadow:'2px 2px 0 #191923'
          }}>
            {unread > 9 ? '9+' : String(unread)}
          </span>
        )}
      </button>
    )
  }

  // === OUVERT : panel chat ===
  return (
    <div style={{
      position:'fixed', bottom:24, right:24,
      width:360, height:520,
      background:'#FFFFFF', border:'3px solid #191923', borderRadius:12,
      boxShadow:'5px 5px 0 #191923', zIndex:55,
      display:'flex', flexDirection:'column',
      maxWidth:'calc(100vw - 32px)', maxHeight:'calc(100vh - 100px)',
      overflow:'hidden'
    }}>
      {/* Header */}
      <div style={{
        background:'#FF82D7', padding:'12px 14px',
        borderBottom:'3px solid #191923',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:8
      }}>
        <div style={{minWidth:0}}>
          <div style={{fontWeight:900, fontSize:14, textTransform:'uppercase', letterSpacing:0.5, color:'#FFFFFF', lineHeight:1}}>
            💬 Edward ↔ Emy
          </div>
          <div style={{fontSize:10, opacity:0.9, marginTop:3, color:'#FFFFFF', fontWeight:700}}>
            {messages.length} message{messages.length > 1 ? 's' : ''}{unread > 0 ? ' · ' + unread + ' non lu' + (unread > 1 ? 's' : '') : ''}
          </div>
        </div>
        <button
          onClick={function() { setOpen(false) }}
          aria-label="Fermer"
          style={{
            background:'#FFFFFF', color:'#191923',
            border:'2px solid #191923', borderRadius:'50%',
            width:32, height:32, cursor:'pointer',
            fontWeight:900, fontSize:14, padding:0,
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'2px 2px 0 #191923', flexShrink:0
          }}>✕</button>
      </div>

      {/* Body messages */}
      <div
        ref={listRef}
        style={{
          flex:1, overflowY:'auto', padding:'12px 12px 14px',
          display:'flex', flexDirection:'column', gap:8,
          background:'#FFFFFF'
        }}>
        {loading && (
          <div style={{textAlign:'center', opacity:0.5, padding:20, fontSize:11, fontWeight:700}}>⏳ Chargement...</div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{textAlign:'center', opacity:0.5, padding:30, fontSize:12, fontWeight:700}}>
            Aucun message.<br/>Commence la conversation 👇
          </div>
        )}
        {messages.map(function(m, idx) {
          var isMe = m.sender === myRole
          var dt = new Date(m.created_at)
          var timeStr = dt.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})
          var dateStr = dt.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'})
          var senderName = m.sender === 'edward' ? 'Edward' : 'Emy'

          // Séparateur date si jour différent du précédent
          var showDateSep = false
          if (idx === 0) showDateSep = true
          else {
            var prevDt = new Date(messages[idx-1].created_at)
            if (prevDt.toDateString() !== dt.toDateString()) showDateSep = true
          }

          return (
            <div key={m.id}>
              {showDateSep && (
                <div style={{textAlign:'center', margin:'6px 0', fontSize:9, fontWeight:900, opacity:0.55, textTransform:'uppercase', letterSpacing:0.5}}>
                  ── {dateStr} ──
                </div>
              )}
              <div style={{display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                <div style={{
                  maxWidth:'82%',
                  background: isMe ? '#191923' : '#FF82D7',
                  color: isMe ? '#FFEB5A' : '#FFFFFF',
                  border:'2px solid #191923',
                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  padding:'8px 12px',
                  fontSize:13,
                  lineHeight:1.4,
                  fontWeight:600,
                  whiteSpace:'pre-wrap',
                  wordBreak:'break-word',
                  boxShadow:'2px 2px 0 #191923'
                }}>{m.content}</div>
                <div style={{fontSize:9, opacity:0.55, marginTop:3, marginLeft:8, marginRight:8, fontWeight:700}}>
                  {senderName} · {timeStr}{isMe ? (m.read_at ? ' · ✓✓ lu' : ' · ✓ envoyé') : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer input */}
      <div style={{
        padding:'10px 12px',
        borderTop:'3px solid #191923',
        background:'#FFFFFF',
        display:'flex', gap:8, alignItems:'flex-end'
      }}>
        <textarea
          style={{
            flex:1, resize:'none', minHeight:40, maxHeight:100,
            fontSize:13, padding:'8px 10px', borderRadius:8,
            lineHeight:1.3, border:'2px solid #191923',
            fontFamily:"'Arial Narrow', Arial, sans-serif",
            fontWeight:600, outline:'none',
            boxShadow:'2px 2px 0 #191923'
          }}
          placeholder="Écrire un message... (Entrée pour envoyer)"
          value={text}
          onChange={function(e) { setText(e.target.value) }}
          onKeyDown={function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending}
          className="btn btn-p"
          style={{height:42, padding:'0 14px', fontSize:14, opacity:(!text.trim() || sending) ? 0.4 : 1}}>
          {sending ? '...' : '➤'}
        </button>
      </div>
    </div>
  )
}
