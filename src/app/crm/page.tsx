'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Prospect, ProspectFilters, ProspectStatus, Profile } from '@/types'
import toast from 'react-hot-toast'
import {
  Plus, Search, Filter, Phone, Mail, Calendar,
  ChevronRight, Star, Clock, X, MessageSquare
} from 'lucide-react'

const STATUS_LABELS: Record<ProspectStatus, string> = {
  to_contact: 'À contacter', contacted: 'Contacté',
  meeting_scheduled: 'RDV planifié', proposal_sent: 'Devis envoyé',
  negotiation: 'Négociation', won: 'Gagné', lost: 'Perdu', on_hold: 'En pause'
}

const STATUS_COLORS: Record<ProspectStatus, string> = {
  to_contact: '#888', contacted: '#B8860B', meeting_scheduled: '#2563EB',
  proposal_sent: '#7C3AED', negotiation: '#EA580C', won: '#16A34A',
  lost: '#E8412C', on_hold: '#6B7280'
}

const SECTORS = ['evenementiel', 'corporate', 'startup', 'institution', 'immobilier', 'mode', 'media', 'autre']
const ARRONDISSEMENTS = ['1er', '2e', '3e', '4e', '5e', '6e', '7e', '8e', '9e', '10e', '11e', '12e', 'Autre']

export default function CRMPage() {
  const supabase = createClient()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Prospect | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState<ProspectFilters>({ search: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
    setCurrentUser(profile)

    const { data: prospectsData } = await supabase
      .from('prospects')
      .select('*, assigned_profile:profiles!assigned_to(*)')
      .order('updated_at', { ascending: false })

    const { data: profilesData } = await supabase.from('profiles').select('*')

    setProspects(prospectsData || [])
    setProfiles(profilesData || [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    return prospects.filter(p => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!p.company_name.toLowerCase().includes(q) &&
            !p.contact_name?.toLowerCase().includes(q) &&
            !p.email?.toLowerCase().includes(q)) return false
      }
      if (filters.status?.length && !filters.status.includes(p.status)) return false
      if (filters.priority?.length && !filters.priority.includes(p.priority)) return false
      if (filters.sector?.length && !filters.sector.includes(p.sector || '')) return false
      if (filters.arrondissement?.length && !filters.arrondissement.includes(p.arrondissement || '')) return false
      if (filters.overdue && p.next_action_date) {
        const today = new Date().toISOString().split('T')[0]
        if (p.next_action_date >= today) return false
      }
      return true
    })
  }, [prospects, filters])

  // Stats
  const stats = useMemo(() => ({
    total: prospects.length,
    active: prospects.filter(p => !['won','lost'].includes(p.status)).length,
    won: prospects.filter(p => p.status === 'won').length,
    overdue: prospects.filter(p => {
      if (!p.next_action_date) return false
      return p.next_action_date < new Date().toISOString().split('T')[0]
    }).length
  }), [prospects])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main list */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="strip" />
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="page-title">CRM Prospects</h1>
              <p className="text-dark-light text-sm mt-1">{filtered.length} prospect{filtered.length > 1 ? 's' : ''} · {stats.won} gagné{stats.won > 1 ? 's' : ''}</p>
            </div>
            <button className="btn-primary" onClick={() => { setSelected(null); setShowForm(true) }}>
              <Plus size={16} /> Nouveau prospect
            </button>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total', value: stats.total, color: 'text-dark' },
              { label: 'Pipeline actif', value: stats.active, color: 'text-blue-600' },
              { label: 'Gagnés', value: stats.won, color: 'text-green-600' },
              { label: 'En retard', value: stats.overdue, color: 'text-red' },
            ].map(s => (
              <div key={s.label} className="card py-3 text-center">
                <div className={`font-display text-3xl ${s.color}`}>{s.value}</div>
                <div className="label mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-light" />
              <input
                className="input pl-9"
                placeholder="Rechercher entreprise, contact, email…"
                value={filters.search || ''}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            <button
              className={`btn-secondary gap-2 ${showFilters ? 'border-red text-red' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={14} /> Filtres
              {Object.keys(filters).filter(k => k !== 'search' && (filters as any)[k]?.length).length > 0 && (
                <span className="bg-red text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {Object.keys(filters).filter(k => k !== 'search' && (filters as any)[k]?.length).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="card mb-4 animate-in">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label block mb-2">Statut</label>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(STATUS_LABELS) as ProspectStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => setFilters(f => ({
                          ...f,
                          status: f.status?.includes(s)
                            ? f.status.filter(x => x !== s)
                            : [...(f.status || []), s]
                        }))}
                        className={`badge cursor-pointer transition-all ${
                          filters.status?.includes(s)
                            ? 'text-white'
                            : 'bg-cream text-dark-light hover:bg-cream-dark'
                        }`}
                        style={filters.status?.includes(s) ? { background: STATUS_COLORS[s] } : {}}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label block mb-2">Priorité</label>
                  <div className="flex gap-1">
                    {[['high','Haute'], ['medium','Moyenne'], ['low','Basse']].map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => setFilters(f => ({
                          ...f,
                          priority: (f.priority as any)?.includes(v)
                            ? (f.priority as any).filter((x: string) => x !== v)
                            : [...(f.priority || []), v as any]
                        }))}
                        className={`badge cursor-pointer ${(filters.priority as any)?.includes(v) ? 'bg-dark text-white' : 'bg-cream text-dark-light'}`}
                      >{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label block mb-2">Options</label>
                  <button
                    onClick={() => setFilters(f => ({ ...f, overdue: !f.overdue }))}
                    className={`badge cursor-pointer ${filters.overdue ? 'bg-red text-white' : 'bg-cream text-dark-light'}`}
                  >
                    ⚠️ En retard uniquement
                  </button>
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button className="btn-ghost btn-sm" onClick={() => setFilters({ search: '' })}>
                  <X size={12} /> Réinitialiser
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-cream/50">
                <tr>
                  <th className="table-header text-left">Entreprise</th>
                  <th className="table-header text-left">Contact</th>
                  <th className="table-header text-left">Statut</th>
                  <th className="table-header text-left">Priorité</th>
                  <th className="table-header text-left">Prochaine action</th>
                  <th className="table-header text-left">Assigné</th>
                  <th className="table-header text-left"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="table-cell text-center text-dark-light py-12">Chargement…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7} className="table-cell text-center text-dark-light py-12">Aucun prospect trouvé</td></tr>
                )}
                {filtered.map(p => {
                  const isOverdue = p.next_action_date && p.next_action_date < new Date().toISOString().split('T')[0]
                  return (
                    <tr
                      key={p.id}
                      className="table-row cursor-pointer"
                      onClick={() => setSelected(p)}
                    >
                      <td className="table-cell">
                        <div className="font-semibold">{p.company_name}</div>
                        {p.arrondissement && <div className="text-xs text-dark-light">{p.arrondissement}</div>}
                      </td>
                      <td className="table-cell">
                        <div>{p.contact_name}</div>
                        {p.contact_title && <div className="text-xs text-dark-light">{p.contact_title}</div>}
                      </td>
                      <td className="table-cell">
                        <span
                          className="badge"
                          style={{
                            background: STATUS_COLORS[p.status] + '22',
                            color: STATUS_COLORS[p.status]
                          }}
                        >
                          {STATUS_LABELS[p.status]}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`font-semibold priority-${p.priority}`}>
                          {p.priority === 'high' ? '▲' : p.priority === 'medium' ? '●' : '▼'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {p.next_action && (
                          <div>
                            <div className="text-xs">{p.next_action}</div>
                            {p.next_action_date && (
                              <div className={`text-xs ${isOverdue ? 'text-red font-semibold' : 'text-dark-light'}`}>
                                {isOverdue ? '⚠️ ' : ''}{new Date(p.next_action_date).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        {(p as any).assigned_profile && (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                            ${(p as any).assigned_profile.role === 'edward' ? 'bg-yellow text-dark' : 'bg-red/20 text-red'}`}>
                            {(p as any).assigned_profile.full_name?.[0]}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <ChevronRight size={14} className="text-dark-light" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <ProspectDetail
          prospect={selected}
          profiles={profiles}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onUpdate={loadData}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <ProspectForm
          profiles={profiles}
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onSave={loadData}
        />
      )}
    </div>
  )
}

// ─── PROSPECT DETAIL PANEL ───────────────────────────────────────────────────
function ProspectDetail({ prospect, profiles, currentUser, onClose, onUpdate }: any) {
  const supabase = createClient()
  const [interactions, setInteractions] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...prospect })

  useEffect(() => {
    loadInteractions()
    loadReminders()
  }, [prospect.id])

  async function loadInteractions() {
    const { data } = await supabase
      .from('prospect_interactions')
      .select('*, author:profiles!created_by(full_name, role)')
      .eq('prospect_id', prospect.id)
      .order('created_at', { ascending: false })
    setInteractions(data || [])
  }

  async function loadReminders() {
    const { data } = await supabase
      .from('reminders')
      .select('*')
      .eq('prospect_id', prospect.id)
      .eq('status', 'pending')
      .order('remind_at', { ascending: true })
    setReminders(data || [])
  }

  async function addNote() {
    if (!newNote.trim()) return
    await supabase.from('prospect_interactions').insert({
      prospect_id: prospect.id,
      type: 'note',
      summary: newNote,
      created_by: currentUser?.id
    })
    await supabase.from('prospects').update({ last_contacted_at: new Date().toISOString() }).eq('id', prospect.id)
    setNewNote('')
    loadInteractions()
    onUpdate()
    toast.success('Note ajoutée')
  }

  async function updateStatus(status: string) {
    await supabase.from('prospects').update({ status, updated_at: new Date().toISOString() }).eq('id', prospect.id)
    onUpdate()
    toast.success('Statut mis à jour')
  }

  async function saveEdit() {
    await supabase.from('prospects').update({ ...form, updated_at: new Date().toISOString() }).eq('id', prospect.id)
    setEditing(false)
    onUpdate()
    toast.success('Prospect mis à jour')
  }

  const STATUS_LABELS: Record<string, string> = {
    to_contact: 'À contacter', contacted: 'Contacté', meeting_scheduled: 'RDV planifié',
    proposal_sent: 'Devis envoyé', negotiation: 'Négociation', won: 'Gagné', lost: 'Perdu', on_hold: 'En pause'
  }

  const INTERACTION_ICONS: Record<string, string> = {
    call: '📞', email: '📧', meeting: '🤝', whatsapp: '💬', visit: '🏃', note: '📝'
  }

  return (
    <div className="w-96 border-l border-border bg-white flex flex-col overflow-hidden animate-in">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold text-lg">{prospect.company_name}</h2>
            <p className="text-dark-light text-sm">{prospect.contact_name} {prospect.contact_title ? `· ${prospect.contact_title}` : ''}</p>
          </div>
          <button className="btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {Object.keys(STATUS_LABELS).map(s => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              className="badge cursor-pointer transition-all text-[10px]"
              style={{
                background: prospect.status === s ? '#E8412C' : '#F5F0E8',
                color: prospect.status === s ? 'white' : '#8C7B6E'
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Contact info */}
        <div className="space-y-2">
          {prospect.phone && (
            <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-sm text-dark hover:text-red transition-colors">
              <Phone size={13} className="text-dark-light" /> {prospect.phone}
            </a>
          )}
          {prospect.email && (
            <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-sm text-dark hover:text-red transition-colors">
              <Mail size={13} className="text-dark-light" /> {prospect.email}
            </a>
          )}
          {prospect.next_action && (
            <div className="flex items-center gap-2 text-sm">
              <Clock size={13} className="text-dark-light" />
              <span className="text-dark">{prospect.next_action}</span>
              {prospect.next_action_date && (
                <span className="text-dark-light">· {new Date(prospect.next_action_date).toLocaleDateString('fr-FR')}</span>
              )}
            </div>
          )}
        </div>

        {/* Reminders */}
        {reminders.length > 0 && (
          <div>
            <div className="label mb-2">Rappels actifs</div>
            {reminders.map(r => (
              <div key={r.id} className="flex items-center gap-2 text-sm bg-yellow/10 rounded-xl px-3 py-2 mb-1">
                <span>⏰</span>
                <span className="flex-1">{r.title}</span>
                <span className="text-xs text-dark-light">{new Date(r.remind_at).toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Add reminder */}
        {!showReminderForm ? (
          <button className="btn-secondary w-full btn-sm justify-center" onClick={() => setShowReminderForm(true)}>
            <Calendar size={13} /> Ajouter un rappel
          </button>
        ) : (
          <ReminderForm
            prospectId={prospect.id}
            currentUser={currentUser}
            onSave={() => { setShowReminderForm(false); loadReminders() }}
            onCancel={() => setShowReminderForm(false)}
          />
        )}

        {/* Notes */}
        {prospect.notes && (
          <div>
            <div className="label mb-1">Notes</div>
            <p className="text-sm text-dark-mid bg-cream rounded-xl p-3">{prospect.notes}</p>
          </div>
        )}

        {/* Add interaction */}
        <div>
          <div className="label mb-2">Ajouter une note / interaction</div>
          <div className="flex gap-2">
            <textarea
              className="input textarea min-h-[60px] flex-1"
              placeholder="Résumé de l'échange, prochaine étape…"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
          </div>
          <button className="btn-primary btn-sm mt-2 w-full justify-center" onClick={addNote}>
            <MessageSquare size={13} /> Ajouter
          </button>
        </div>

        {/* Interactions history */}
        {interactions.length > 0 && (
          <div>
            <div className="label mb-2">Historique ({interactions.length})</div>
            <div className="space-y-2">
              {interactions.map(i => (
                <div key={i.id} className="bg-cream rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{INTERACTION_ICONS[i.type]}</span>
                    <span className="text-xs font-semibold text-dark-mid capitalize">{i.type}</span>
                    <span className="text-xs text-dark-light ml-auto">
                      {new Date(i.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-sm text-dark">{i.summary}</p>
                  {i.next_step && <p className="text-xs text-dark-light mt-1">→ {i.next_step}</p>}
                  <p className="text-xs text-dark-light mt-1">{i.author?.full_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── REMINDER FORM ────────────────────────────────────────────────────────────
function ReminderForm({ prospectId, currentUser, onSave, onCancel }: any) {
  const supabase = createClient()
  const [form, setForm] = useState({
    title: '', remind_at: '', channels: ['app', 'email'] as string[], message: ''
  })

  async function save() {
    if (!form.title || !form.remind_at) return toast.error('Titre et date requis')
    await supabase.from('reminders').insert({
      ...form,
      prospect_id: prospectId,
      created_by: currentUser?.id,
      assigned_to: currentUser?.id,
    })
    toast.success('Rappel créé !')
    onSave()
  }

  function toggleChannel(ch: string) {
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch]
    }))
  }

  return (
    <div className="card bg-cream border-border space-y-3">
      <div className="label">Nouveau rappel</div>
      <input className="input text-sm" placeholder="Objet du rappel" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <input type="datetime-local" className="input text-sm" value={form.remind_at} onChange={e => setForm(f => ({ ...f, remind_at: e.target.value }))} />
      <div>
        <div className="label mb-1">Canaux</div>
        <div className="flex gap-2">
          {[['app','In-app'], ['email','Email'], ['whatsapp','WhatsApp'], ['sms','SMS']].map(([v, l]) => (
            <button key={v} onClick={() => toggleChannel(v)}
              className={`badge cursor-pointer text-[10px] ${form.channels.includes(v) ? 'bg-red text-white' : 'bg-white text-dark-light border border-border'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-ghost btn-sm flex-1 justify-center" onClick={onCancel}>Annuler</button>
        <button className="btn-primary btn-sm flex-1 justify-center" onClick={save}>Créer</button>
      </div>
    </div>
  )
}

// ─── PROSPECT FORM ────────────────────────────────────────────────────────────
function ProspectForm({ profiles, currentUser, onClose, onSave }: any) {
  const supabase = createClient()
  const [form, setForm] = useState({
    company_name: '', contact_name: '', contact_title: '', email: '', phone: '', whatsapp: '',
    arrondissement: '', sector: '', status: 'to_contact', priority: 'medium',
    potential_value: '', estimated_monthly_revenue: '', source: '', notes: '',
    next_action: '', next_action_date: '',
    assigned_to: currentUser?.id || ''
  })

  async function save() {
    if (!form.company_name) return toast.error('Nom entreprise requis')
    const { error } = await supabase.from('prospects').insert({
      ...form,
      estimated_monthly_revenue: form.estimated_monthly_revenue ? Number(form.estimated_monthly_revenue) : null,
      created_by: currentUser?.id
    })
    if (error) { toast.error('Erreur lors de la création'); return }
    toast.success('Prospect créé !')
    onSave()
    onClose()
  }

  const F = ({ label, children }: any) => (
    <div className="form-field">
      <label className="label block mb-1">{label}</label>
      {children}
    </div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="section-title">Nouveau prospect</h2>
        </div>
        <div className="modal-body space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label="Entreprise *"><input className="input" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></F>
            <F label="Arrondissement">
              <select className="input select" value={form.arrondissement} onChange={e => setForm(f => ({ ...f, arrondissement: e.target.value }))}>
                <option value="">—</option>
                {ARRONDISSEMENTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </F>
            <F label="Contact"><input className="input" value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></F>
            <F label="Titre du contact"><input className="input" value={form.contact_title} onChange={e => setForm(f => ({ ...f, contact_title: e.target.value }))} /></F>
            <F label="Email"><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></F>
            <F label="Téléphone"><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></F>
            <F label="Secteur">
              <select className="input select" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))}>
                <option value="">—</option>
                {SECTORS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </F>
            <F label="Source">
              <select className="input select" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                <option value="">—</option>
                <option value="prospection">Prospection</option>
                <option value="referral">Recommandation</option>
                <option value="inbound">Entrant</option>
                <option value="networking">Networking</option>
              </select>
            </F>
            <F label="Priorité">
              <select className="input select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </F>
            <F label="CA mensuel estimé (€)">
              <input type="number" className="input" value={form.estimated_monthly_revenue} onChange={e => setForm(f => ({ ...f, estimated_monthly_revenue: e.target.value }))} />
            </F>
            <F label="Prochaine action"><input className="input" value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))} /></F>
            <F label="Date prochaine action"><input type="date" className="input" value={form.next_action_date} onChange={e => setForm(f => ({ ...f, next_action_date: e.target.value }))} /></F>
            <F label="Assigné à">
              <select className="input select" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}>
                {profiles.map((p: Profile) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </F>
          </div>
          <F label="Notes">
            <textarea className="input textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Contexte, infos importantes…" />
          </F>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Créer le prospect</button>
        </div>
      </div>
    </div>
  )
}
