'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { WeeklyReport, Profile } from '@/types'
import toast from 'react-hot-toast'
import { Plus, Send, MessageSquare, Eye } from 'lucide-react'

export default function ReportingPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<WeeklyReport[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
    setCurrentUser(profile)

    const { data } = await supabase
      .from('weekly_reports')
      .select('*, author:profiles!authored_by(full_name, role)')
      .order('week_start', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  async function markRead(report: WeeklyReport) {
    if (currentUser?.role !== 'edward' || report.status === 'read') return
    await supabase.from('weekly_reports').update({ status: 'read', read_at: new Date().toISOString() }).eq('id', report.id)
    loadData()
  }

  const STATUS_STYLES = {
    draft: 'bg-gray-100 text-gray-600',
    submitted: 'bg-yellow/20 text-yellow-700',
    read: 'bg-green-100 text-green-700'
  }
  const STATUS_LABELS = { draft: 'Brouillon', submitted: 'Soumis', read: 'Lu ✓' }

  return (
    <div className="p-6 max-w-4xl">
      <div className="strip" />
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Reporting</h1>
          <p className="text-dark-light text-sm mt-1">Compte-rendus hebdomadaires Emy → Edward</p>
        </div>
        {currentUser?.role === 'emy' && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Nouveau CR
          </button>
        )}
      </div>

      {loading && <div className="text-dark-light text-sm">Chargement…</div>}

      <div className="space-y-4">
        {reports.map(r => (
          <div
            key={r.id}
            className={`card cursor-pointer hover:shadow-md transition-all ${r.status === 'submitted' && currentUser?.role === 'edward' ? 'border-yellow/60 bg-yellow/5' : ''}`}
            onClick={() => { setSelectedReport(r); markRead(r) }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold">{r.week_label}</h3>
                  <span className={`badge text-[10px] ${STATUS_STYLES[r.status]}`}>{STATUS_LABELS[r.status]}</span>
                  {r.status === 'submitted' && currentUser?.role === 'edward' && (
                    <span className="badge bg-red text-white text-[10px] animate-pulse">Nouveau !</span>
                  )}
                </div>
                <p className="text-dark-light text-xs">Par {(r as any).author?.full_name} · {r.submitted_at ? `Soumis le ${new Date(r.submitted_at).toLocaleDateString('fr-FR')}` : 'Non soumis'}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <div className="font-display text-2xl text-dark">{r.prospects_contacted}</div>
                  <div className="label text-[9px]">Prospects</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-2xl text-dark">{r.meetings_held}</div>
                  <div className="label text-[9px]">RDV</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-2xl text-dark">{r.orders_received}</div>
                  <div className="label text-[9px]">Cmdes</div>
                </div>
              </div>
            </div>

            {r.edward_feedback && (
              <div className="mt-3 bg-yellow/10 rounded-xl p-3 border border-yellow/30">
                <p className="text-xs font-semibold text-yellow-700 mb-1">💬 Retour d'Edward</p>
                <p className="text-sm">{r.edward_feedback}</p>
              </div>
            )}
          </div>
        ))}

        {!loading && reports.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-dark-light">Aucun compte-rendu pour l'instant.</p>
            {currentUser?.role === 'emy' && (
              <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>Créer le premier CR</button>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <ReportForm currentUser={currentUser} onClose={() => setShowForm(false)} onSave={loadData} />
      )}

      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          currentUser={currentUser}
          onClose={() => setSelectedReport(null)}
          onSave={loadData}
        />
      )}
    </div>
  )
}

function ReportForm({ currentUser, onClose, onSave }: any) {
  const supabase = createClient()
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - today.getDay() + 1)

  const [form, setForm] = useState({
    week_label: `Semaine du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    week_start: monday.toISOString().split('T')[0],
    prospects_contacted: 0, meetings_held: 0, proposals_sent: 0,
    orders_received: 0, revenue_generated: 0,
    wins: '', challenges: '', next_week_priorities: '', free_notes: '',
    status: 'draft' as const
  })

  async function save(submit = false) {
    const { data, error } = await supabase.from('weekly_reports').insert({
      ...form,
      status: submit ? 'submitted' : 'draft',
      authored_by: currentUser?.id,
      submitted_at: submit ? new Date().toISOString() : null
    }).select().single()

    if (error) { toast.error('Erreur'); return }

    if (submit) {
      await fetch('/api/reports/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: data.id })
      })
      toast.success('CR soumis ! Edward a été notifié 📧')
    } else {
      toast.success('Brouillon sauvegardé')
    }
    onSave()
    onClose()
  }

  const F = ({ label, children }: any) => (
    <div><label className="label block mb-1">{label}</label>{children}</div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="section-title">Nouveau compte-rendu</h2>
        </div>
        <div className="modal-body space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <F label="Semaine"><input className="input" value={form.week_label} onChange={e => setForm(f => ({ ...f, week_label: e.target.value }))} /></F>
            <F label="Date début"><input type="date" className="input" value={form.week_start} onChange={e => setForm(f => ({ ...f, week_start: e.target.value }))} /></F>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              ['prospects_contacted', 'Prospects contactés'],
              ['meetings_held', 'RDV tenus'],
              ['proposals_sent', 'Devis envoyés'],
              ['orders_received', 'Commandes'],
              ['revenue_generated', 'CA (€)'],
            ].map(([k, l]) => (
              <div key={k} className="bg-cream rounded-xl p-3 text-center">
                <label className="label text-[9px] block mb-1">{l}</label>
                <input type="number" className="w-full text-center font-display text-2xl bg-transparent border-none outline-none text-dark"
                  value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>

          <F label="✅ Victoires & avancées de la semaine">
            <textarea className="input textarea" placeholder="Quels prospects ai-je contactés ? Quelles actions concrètes ?" value={form.wins} onChange={e => setForm(f => ({ ...f, wins: e.target.value }))} />
          </F>
          <F label="⚡ Challenges / blocages">
            <textarea className="input textarea" placeholder="Quels obstacles ai-je rencontrés ? De quoi ai-je besoin ?" value={form.challenges} onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))} />
          </F>
          <F label="🎯 Priorités semaine prochaine">
            <textarea className="input textarea" placeholder="Mes 3 priorités S+1…" value={form.next_week_priorities} onChange={e => setForm(f => ({ ...f, next_week_priorities: e.target.value }))} />
          </F>
          <F label="💬 Notes libres pour Edward">
            <textarea className="input textarea" placeholder="Tout ce qui mérite d'être remonté…" value={form.free_notes} onChange={e => setForm(f => ({ ...f, free_notes: e.target.value }))} />
          </F>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-secondary" onClick={() => save(false)}>Sauvegarder brouillon</button>
          <button className="btn-primary" onClick={() => save(true)}>
            <Send size={14} /> Soumettre à Edward
          </button>
        </div>
      </div>
    </div>
  )
}

function ReportDetail({ report, currentUser, onClose, onSave }: any) {
  const supabase = createClient()
  const [feedback, setFeedback] = useState(report.edward_feedback || '')
  const [saving, setSaving] = useState(false)

  async function saveFeedback() {
    setSaving(true)
    await supabase.from('weekly_reports').update({ edward_feedback: feedback }).eq('id', report.id)
    setSaving(false)
    toast.success('Retour sauvegardé')
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="section-title">{report.week_label}</h2>
          <p className="text-dark-light text-sm mt-1">Par {report.author?.full_name}</p>
        </div>
        <div className="modal-body space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-2">
            {[
              [report.prospects_contacted, 'Prospects'],
              [report.meetings_held, 'RDV'],
              [report.proposals_sent, 'Devis'],
              [report.orders_received, 'Cmdes'],
              [report.revenue_generated + '€', 'CA'],
            ].map(([v, l]) => (
              <div key={l as string} className="bg-cream rounded-xl p-3 text-center">
                <div className="font-display text-3xl text-dark">{v}</div>
                <div className="label text-[9px]">{l}</div>
              </div>
            ))}
          </div>

          {report.wins && <div><div className="label text-green-700 mb-1">✅ Victoires</div><p className="text-sm bg-green-50 rounded-xl p-3 whitespace-pre-wrap">{report.wins}</p></div>}
          {report.challenges && <div><div className="label text-yellow-700 mb-1">⚡ Challenges</div><p className="text-sm bg-yellow/10 rounded-xl p-3 whitespace-pre-wrap">{report.challenges}</p></div>}
          {report.next_week_priorities && <div><div className="label text-red mb-1">🎯 Priorités S+1</div><p className="text-sm bg-red/5 rounded-xl p-3 whitespace-pre-wrap">{report.next_week_priorities}</p></div>}
          {report.free_notes && <div><div className="label mb-1">💬 Notes libres</div><p className="text-sm bg-cream rounded-xl p-3 whitespace-pre-wrap">{report.free_notes}</p></div>}

          {/* Edward feedback */}
          {currentUser?.role === 'edward' && (
            <div>
              <label className="label block mb-1">💬 Ton retour à Emy</label>
              <textarea className="input textarea" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Tes commentaires, directives, bravo ou recadrages…" />
              <button className="btn-primary btn-sm mt-2" onClick={saveFeedback} disabled={saving}>
                {saving ? 'Sauvegarde…' : 'Enregistrer le retour'}
              </button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
