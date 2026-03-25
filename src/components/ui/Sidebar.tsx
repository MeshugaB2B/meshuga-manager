'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { LayoutDashboard, Target, BookOpen, CheckSquare, BarChart3, Bell, RefreshCw, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/crm', label: 'CRM Prospects', icon: Target },
  { href: '/annuaire', label: 'Annuaire', icon: BookOpen },
  { href: '/tasks', label: 'Tâches', icon: CheckSquare },
  { href: '/reporting', label: 'Reporting', icon: BarChart3 },
  { href: '/reminders', label: 'Rappels', icon: Bell },
]

type Props = { profile: Profile; notifCount?: number }

export function Sidebar({ profile, notifCount = 0 }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSync() {
    const toastId = toast.loading('Sync Google Drive…')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (data.success) toast.success(`✓ ${data.synced.prospects} prospects synchronisés`, { id: toastId })
      else toast.error('Erreur sync : ' + data.error, { id: toastId })
    } catch { toast.error('Erreur réseau', { id: toastId }) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{ width: 230, minHeight: '100vh', background: '#FFFFFF', borderRight: '4px solid #191923', display: 'flex', flexDirection: 'column', position: 'fixed', left: 0, top: 0, zIndex: 40 }}>

      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '3px solid #191923', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/meshuga-stamp.png" alt="Meshuga" width={52} height={52} style={{ borderRadius: '50%', border: '2px solid #191923', flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: "'Arial Narrow', Arial", fontWeight: 900, fontSize: 22, color: '#191923', textTransform: 'uppercase', letterSpacing: 2, lineHeight: 1 }}>
            meshuga
          </div>
          <div style={{ fontFamily: 'Yellowtail, cursive', fontSize: 13, color: '#191923', opacity: 0.5, marginTop: 1 }}>
            B2B Manager
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
        <div style={{ fontFamily: 'Yellowtail, cursive', fontSize: 14, color: '#191923', opacity: 0.4, padding: '8px 10px 4px', marginTop: 4 }}>
          Navigation
        </div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className={`sidebar-item${pathname.startsWith(href) ? ' active' : ''}`}>
              <Icon size={15} />
              <span>{label}</span>
              {href === '/reporting' && notifCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#FFEB5A', color: '#191923', fontSize: 10, fontWeight: 900, borderRadius: 3, padding: '1px 5px', border: '1.5px solid #191923' }}>
                  {notifCount}
                </span>
              )}
            </div>
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '12px 14px 20px', borderTop: '3px solid #191923' }}>
        {/* Sync */}
        <button onClick={handleSync} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 6, fontFamily: "'Arial Narrow', Arial", fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#191923', opacity: 0.5 }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          <RefreshCw size={13} /> Sync Google Drive
        </button>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, padding: '6px 8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 6, flexShrink: 0,
            background: profile.role === 'edward' ? '#FFEB5A' : '#FF82D7',
            border: '2px solid #191923', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Arial Narrow', Arial", fontWeight: 900, fontSize: 14, color: '#191923'
          }}>
            {profile.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Arial Narrow', Arial", fontWeight: 900, fontSize: 12, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.full_name}
            </div>
            <div style={{ fontFamily: 'Yellowtail, cursive', fontSize: 12, color: '#191923', opacity: 0.45, textTransform: 'capitalize' }}>
              {profile.role}
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#191923', opacity: 0.3, padding: 4 }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
