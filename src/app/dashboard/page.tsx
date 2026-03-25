'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const supabase = createClient()
  const [data, setData] = useState<any>({})
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
    setProfile(prof)

    const [{ data: prospects }, { data: tasks }, { data: reports }, { data: reminders }, { data: contacts }] = await Promise.all([
      supabase.from('prospects').select('status, priority, next_action_date, estimated_monthly_revenue'),
      supabase.from('tasks').select('status, deadline, assigned_to').eq('assigned_to', user?.id),
      supabase.from('weekly_reports').select('status, week_label, submitted_at').order('created_at', { ascending: false }).limit(3),
      supabase.from('reminders').select('*').eq('status', 'pending').eq('assigned_to', user?.id).order('remind_at').limit(5),
      supabase.from('contacts').select('category'),
    ])

    const today = new Date().toISOString().split('T')[0]
    setData({
      prospects: {
        total: prospects?.length || 0,
        won: prospects?.filter(p => p.status === 'won').length || 0,
        pipeline: prospects?.filter(p => !['won','lost'].includes(p.status)).length || 0,
        overdue: prospects?.filter(p => p.next_action_date && p.next_action_date < today).length || 0,
        revenue: prospects?.filter(p => p.status === 'won').reduce((s, p) => s + (p.estimated_monthly_revenue || 0), 0) || 0,
      },
      tasks: {
        total: tasks?.length || 0,
        todo: tasks?.filter(t => t.status === 'todo').length || 0,
        overdue: tasks?.filter(t => t.deadline && t.deadline < today && t.status !== 'done').length || 0,
      },
      reports,
      reminders,
      contacts: contacts?.length || 0,
    })
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const result = await res.json()
      if (result.success) toast.success(`✅ Google Sheets mis à jour — ${result.synced.prospects} prospects synchro`)
      else toast.error('Erreur de sync : ' + result.error)
    } catch { toast.error('Erreur réseau') }
    setSyncing(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonsoir' : 'Bonsoir'

  if (loading) return <div className="p-6 text-dark-light">Chargement…</div>

  return (
    <div className="p-6 max-w-5xl">
      <div className="strip" />

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="page-title">{greeting}, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="text-dark-light text-sm mt-1">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn-secondary gap-2">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Sync en cours…' : 'Sync Google Drive'}
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Prospects pipeline', value: data.prospects.pipeline, icon: '🎯', color: 'text-blue-600' },
          { label: 'Clients gagnés', value: data.prospects.won, icon: '🏆', color: 'text-green-600' },
          { label: 'CA B2B mensuel', value: `${data.prospects.revenue.toLocaleString()} €`, icon: '💰', color: 'text-dark' },
          { label: 'Contacts annuaire', value: data.contacts, icon: '📒', color: 'text-dark' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div className="stat-label">{k.label}</div>
            <div className={`stat-value ${k.color}`}>{k.value}</div>
            <div className="absolute right-4 top-4 text-3xl opacity-15">{k.icon}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Alerts */}
        <div className="card">
          <h2 className="section-title mb-4">Alertes</h2>
          {data.prospects.overdue === 0 && data.tasks.overdue === 0 ? (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={16} /> Tout est à jour, bravo !
            </div>
          ) : (
            <div className="space-y-2">
              {data.prospects.overdue > 0 && (
                <div className="flex items-center gap-3 bg-red/8 rounded-xl p-3">
                  <AlertCircle size={16} className="text-red flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red">{data.prospects.overdue} prospect{data.prospects.overdue > 1 ? 's' : ''} en retard</p>
                    <p className="text-xs text-dark-light">Action prévue dépassée</p>
                  </div>
                </div>
              )}
              {data.tasks.overdue > 0 && (
                <div className="flex items-center gap-3 bg-yellow/10 rounded-xl p-3">
                  <AlertCircle size={16} className="text-yellow-700 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-700">{data.tasks.overdue} tâche{data.tasks.overdue > 1 ? 's' : ''} en retard</p>
                    <p className="text-xs text-dark-light">Deadline dépassée</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reminders */}
        <div className="card">
          <h2 className="section-title mb-4">Prochains rappels</h2>
          {!data.reminders?.length ? (
            <p className="text-dark-light text-sm">Aucun rappel programmé</p>
          ) : (
            <div className="space-y-2">
              {data.reminders.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <span className="text-lg">⏰</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-dark-light">{new Date(r.remind_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="flex gap-1">
                    {r.channels.map((ch: string) => (
                      <span key={ch} className="text-xs">{ch === 'email' ? '📧' : ch === 'whatsapp' ? '💬' : ch === 'sms' ? '📱' : '🔔'}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent reports */}
        <div className="card">
          <h2 className="section-title mb-4">Derniers compte-rendus</h2>
          {!data.reports?.length ? (
            <p className="text-dark-light text-sm">Aucun CR pour l'instant</p>
          ) : (
            <div className="space-y-2">
              {data.reports.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <p className="text-sm font-medium">{r.week_label}</p>
                  <span className={`badge text-[10px] ${r.status === 'read' ? 'bg-green-100 text-green-700' : r.status === 'submitted' ? 'bg-yellow/20 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {r.status === 'read' ? 'Lu ✓' : r.status === 'submitted' ? 'À lire 👁' : 'Brouillon'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks summary */}
        <div className="card">
          <h2 className="section-title mb-4">Mes tâches</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cream rounded-xl p-3 text-center">
              <div className="font-display text-3xl text-dark">{data.tasks.todo}</div>
              <div className="label text-[9px]">À faire</div>
            </div>
            <div className="bg-cream rounded-xl p-3 text-center">
              <div className={`font-display text-3xl ${data.tasks.overdue > 0 ? 'text-red' : 'text-dark'}`}>{data.tasks.overdue}</div>
              <div className="label text-[9px]">En retard</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
