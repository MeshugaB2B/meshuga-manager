'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { LOGO_PINK, STAMP_YELLOW } from './logos'

// =============================================================================
// Sidebar — Navigation principale réorganisée (Sprint UX-2)
//
// Sections :
//   1. 🏠 Accueil           : Dashboard, Analytics (ex-Pilotage)
//   2. 💼 Commercial B2B    : CRM, Chasse, Devis, Reporting (Edward only)
//   3. 🍳 Cuisine & Achats  : Recettes, Achats, Annuaire
//   4. 👥 Équipe & Admin    : RH, Légal, Journal Emy (Edward only)
//   5. 📣 Marketing         : Instagram, Google My Business
//   6. 🗂️ Outils            : Calendrier, Notifications, Coffre-fort
//
// Features :
//   - Recherche temps réel (filtre les items + auto-ouvre les sections)
//   - Sections collapsibles avec persistance localStorage
//   - Badges live (CRM, Devis, RH, Notifs) rafraîchis toutes les 60s
//   - Footer user (avatar + nom + rôle + boutons notifs/déconnexion)
// =============================================================================

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

var NAV_SECTIONS = [
  {
    id: 'accueil',
    label: 'Accueil',
    items: [
      { id: 'dash', label: 'Dashboard', icon: '⚡' },
      { id: 'pilotage', label: 'Analytics', icon: '📈' },
      { id: 'tasks', label: 'Tâches', icon: '✅' },
    ]
  },
  {
    id: 'commercial',
    label: 'Commercial B2B',
    items: [
      { id: 'crm', label: 'CRM Prospects', icon: '◎', badgeKey: 'crm' },
      { id: 'chasse', label: 'Tableau de chasse', icon: '🎯' },
      { id: 'devis', label: 'Devis', icon: '📄', badgeKey: 'devis' },
      { id: 'reporting', label: 'Reporting CR', icon: '📋', edwardOnly: true },
    ]
  },
  {
    id: 'cuisine',
    label: 'Cuisine & Achats',
    items: [
      { id: 'recipes', label: 'Recettes', icon: '🥪' },
      { id: 'purchases', label: 'Achats', icon: '🛒' },
      { id: 'annuaire', label: 'Annuaire', icon: '📒' },
    ]
  },
  {
    id: 'equipe',
    label: 'Équipe & Admin',
    items: [
      { id: 'rh', label: 'Ressources Humaines', icon: '👥', badgeKey: 'rh' },
      { id: 'legal', label: 'Légal & Conformité', icon: '⚖️' },
      { id: 'journal', label: 'Journal Emy', icon: '📓', edwardOnly: true },
    ]
  },
  {
    id: 'marketing',
    label: 'Marketing',
    items: [
      { id: 'instagram', label: 'Instagram', icon: '📸' },
      { id: 'gmb', label: 'Google My Biz.', icon: '⭐' },
    ]
  },
  {
    id: 'outils',
    label: 'Outils',
    items: [
      { id: 'calendrier', label: 'Calendrier', icon: '📅' },
      { id: 'notifs', label: 'Notifications', icon: '🔔', badgeKey: 'notifs' },
      { id: 'vault', label: 'Coffre-fort', icon: '🔐' },
    ]
  },
]

export default function Sidebar(props) {
  var page = props.page
  var nav = props.nav || function(){}
  var isEmy = !!props.isEmy
  var profile = props.profile
  var sidebarOpen = !!props.sidebarOpen
  var setSidebarOpen = props.setSidebarOpen || function(){}
  var pushEnabled = !!props.pushEnabled
  var pushLoading = !!props.pushLoading
  var registerPush = props.registerPush || function(){}
  var unregisterPush = props.unregisterPush || function(){}
  var onLogout = props.onLogout || function(){}

  var [collapsed, setCollapsed] = useState({})
  var [search, setSearch] = useState('')
  var [counts, setCounts] = useState({})
  var [width, setWidth] = useState(210)
  var draggingRef = useRef(false)
  var widthRef = useRef(210)

  // Charger largeur sauvegardée + appliquer la variable CSS
  useEffect(function() {
    try {
      var savedW = localStorage.getItem('meshuga.sidebar.width')
      if (savedW) {
        var w = parseInt(savedW, 10)
        if (!isNaN(w) && w >= 168 && w <= 340) {
          setWidth(w)
          widthRef.current = w
          document.documentElement.style.setProperty('--sb-w', w + 'px')
        }
      }
    } catch (e) {}
  }, [])

  // Gestion du drag de redimensionnement
  function startResize(e) {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onResize)
    window.addEventListener('mouseup', stopResize)
  }
  function onResize(e) {
    if (!draggingRef.current) return
    var w = e.clientX
    if (w < 168) w = 168
    if (w > 340) w = 340
    document.documentElement.style.setProperty('--sb-w', w + 'px')
    widthRef.current = w
    setWidth(w)
  }
  function stopResize() {
    draggingRef.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    window.removeEventListener('mousemove', onResize)
    window.removeEventListener('mouseup', stopResize)
    try { localStorage.setItem('meshuga.sidebar.width', String(widthRef.current)) } catch (e) {}
  }

  // Charger l'état des sections repliées
  useEffect(function() {
    try {
      var saved = localStorage.getItem('meshuga.sidebar.collapsed')
      if (saved) setCollapsed(JSON.parse(saved))
    } catch (e) {}
  }, [])

  // Charger les compteurs live + refresh 60s
  useEffect(function() {
    loadCounts()
    var t = setInterval(loadCounts, 60000)
    return function() { clearInterval(t) }
  }, [])

  function loadCounts() {
    var c = sb()
    var next = {}

    // CRM : prospects à contacter
    c.from('prospects').select('id', { count: 'exact', head: true }).eq('status', 'to_contact').then(function(r) {
      if (!r.error) next.crm = r.count || 0
      mergeCounts(next)
    })

    // Devis à relancer ou envoyés
    c.from('devis').select('id', { count: 'exact', head: true }).in('statut', ['envoye', 'a_relancer']).is('parent_devis_id', null).then(function(r) {
      if (!r.error) next.devis = r.count || 0
      mergeCounts(next)
    })

    // RH signatures pending
    Promise.all([
      c.from('hr_contracts').select('id', { count: 'exact', head: true }).in('signature_status', ['sent', 'viewed']).is('signature_signed_at', null),
      c.from('hr_contract_amendments').select('id', { count: 'exact', head: true }).in('signature_status', ['sent', 'viewed']).is('signature_signed_at', null)
    ]).then(function(rs) {
      var n = (rs[0].count || 0) + (rs[1].count || 0)
      next.rh = n
      mergeCounts(next)
    })

    // Notifs non lues
    c.from('notifications').select('id', { count: 'exact', head: true }).is('read_at', null).then(function(r) {
      if (!r.error) next.notifs = r.count || 0
      mergeCounts(next)
    })
  }

  function mergeCounts(partial) {
    setCounts(function(prev) { return Object.assign({}, prev, partial) })
  }

  function toggleSection(id) {
    setCollapsed(function(prev) {
      var n = Object.assign({}, prev)
      n[id] = !prev[id]
      try { localStorage.setItem('meshuga.sidebar.collapsed', JSON.stringify(n)) } catch (e) {}
      return n
    })
  }

  function navAndClose(id) {
    nav(id)
    setSidebarOpen(false)
  }

  var searchLow = search.toLowerCase().trim()
  var searchActive = searchLow.length > 0
  function matchSearch(item) {
    if (!searchActive) return true
    return item.label.toLowerCase().indexOf(searchLow) > -1
  }

  var avatarLetter = '?'
  if (profile) {
    if (profile.full_name) avatarLetter = profile.full_name.charAt(0).toUpperCase()
    else if (profile.email) avatarLetter = profile.email.charAt(0).toUpperCase()
  }
  var roleLabel = isEmy ? 'B2B Manager' : 'The Big Boss'
  var userName = profile && (profile.full_name || (profile.email && profile.email.split('@')[0])) || '—'

  return (
    <div className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
      {/* Poignée de redimensionnement (desktop only, masquée en mobile via CSS) */}
      <div className="sb-resizer" onMouseDown={startResize} title="Glisser pour redimensionner" />

      {/* Logo */}
      <div className="sb-logo">
        <img src={STAMP_YELLOW} alt="stamp" className="sb-logo-stamp" />
        <div className="sb-logo-text">
          <img src={LOGO_PINK} alt="meshuga" className="sb-logo-type" />
          <div className="sb-logo-b2b">B2B Manager</div>
        </div>
      </div>

      {/* Search */}
      <div style={{padding:'7px 8px 4px',borderBottom:'1.5px solid #EBEBEB'}}>
        <input
          type="text"
          placeholder="🔍 Rechercher..."
          value={search}
          onChange={function(e) { setSearch(e.target.value) }}
          style={{
            width:'100%',
            padding:'5px 8px',
            fontSize:11,
            fontWeight:700,
            border:'1.5px solid #191923',
            borderRadius:5,
            background:'#FFFFFF',
            color:'#191923',
            outline:'none',
            fontFamily:"'Arial Narrow', Arial, sans-serif"
          }}
        />
      </div>

      {/* Nav sections */}
      <nav className="sb-nav">
        {NAV_SECTIONS.map(function(sec) {
          var visibleItems = sec.items.filter(function(it) {
            if (it.edwardOnly && isEmy) return false
            return matchSearch(it)
          })
          if (visibleItems.length === 0) return null
          var isCollapsed = !searchActive && !!collapsed[sec.id]

          return (
            <div key={sec.id}>
              <div
                className="sb-sec"
                onClick={function() { toggleSection(sec.id) }}
                style={{cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',userSelect:'none'}}>
                <span>{sec.label}</span>
                <span style={{fontSize:10,opacity:0.5,transition:'transform .15s',transform:isCollapsed?'rotate(-90deg)':'rotate(0deg)',display:'inline-block'}}>▾</span>
              </div>
              {!isCollapsed && visibleItems.map(function(item) {
                var isActive = page === item.id
                var badge = item.badgeKey ? (counts[item.badgeKey] || 0) : 0
                return (
                  <div
                    key={item.id}
                    className={isActive ? 'ni active' : 'ni'}
                    onClick={function() { navAndClose(item.id) }}>
                    <span className="ni-ico">{item.icon}</span>
                    <span style={{flex:1,minWidth:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>
                    {badge > 0 && <span className="nb" style={{background: isActive ? '#191923' : '#FF82D7', color: isActive ? '#FFEB5A' : '#FFFFFF'}}>{badge > 99 ? '99+' : badge}</span>}
                  </div>
                )
              })}
            </div>
          )
        })}
        {searchActive && NAV_SECTIONS.every(function(sec) {
          return sec.items.filter(function(it) { return (!it.edwardOnly || !isEmy) && matchSearch(it) }).length === 0
        }) && (
          <div style={{padding:'14px 8px',textAlign:'center',fontSize:10,opacity:0.5,fontWeight:700}}>
            Aucun résultat pour &laquo; {search} &raquo;
          </div>
        )}
      </nav>

      {/* Footer user */}
      <div className="sb-user" style={{flexDirection:'column',alignItems:'stretch',gap:6,padding:'8px 8px 12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <div className="sb-avatar">{avatarLetter}</div>
          <div style={{minWidth:0,flex:1}}>
            <div className="sb-uname" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{userName}</div>
            <div className="yt sb-urole" style={{color:'#FF82D7',opacity:0.8}}>{roleLabel}</div>
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={{width:'100%',justifyContent:'center',background:pushEnabled?'#009D3A':'#FFFFFF',color:pushEnabled?'#FFFFFF':'#191923',opacity:pushLoading?0.6:1}}
          onClick={pushEnabled?unregisterPush:registerPush}
          disabled={pushLoading}>
          {pushLoading ? '⏳' : (pushEnabled ? '🔔 Notifs ON' : '🔕 Notifs OFF')}
        </button>
        <button
          className="btn btn-sm"
          style={{width:'100%',justifyContent:'center',background:'#191923',color:'#FFEB5A',opacity:0.85}}
          onClick={onLogout}>
          ↩ Déconnexion
        </button>
      </div>
    </div>
  )
}
