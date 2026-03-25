'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Contact, ContactCategory } from '@/types'
import toast from 'react-hot-toast'
import { Plus, Search, Star, X, ChevronRight, Globe, Instagram, Phone, Mail } from 'lucide-react'

const CATEGORIES: { value: ContactCategory; label: string; emoji: string; color: string }[] = [
  { value: 'fournisseur', label: 'Fournisseurs', emoji: '🥩', color: '#E8412C' },
  { value: 'client_b2b', label: 'Clients B2B', emoji: '🏢', color: '#2563EB' },
  { value: 'partenaire', label: 'Partenaires', emoji: '🤝', color: '#7C3AED' },
  { value: 'presse', label: 'Presse & Influenceurs', emoji: '📰', color: '#EA580C' },
  { value: 'livreur', label: 'Livreurs & Prestataires', emoji: '🚲', color: '#16A34A' },
]

export default function AnnuairePage() {
  const supabase = createClient()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ContactCategory | 'all'>('all')
  const [selected, setSelected] = useState<Contact | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
    setCurrentUser(profile)
    const { data } = await supabase.from('contacts').select('*').order('full_name')
    setContacts(data || [])
    setLoading(false)
  }

  const filtered = useMemo(() => contacts.filter(c => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory
    const matchSearch = !search || [c.full_name, c.company_name, c.email, c.phone].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  }), [contacts, activeCategory, search])

  const countByCategory = (cat: ContactCategory) => contacts.filter(c => c.category === cat).length

  return (
    <div className="p-6">
      <div className="strip" />
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-title">Annuaire</h1>
          <p className="text-dark-light text-sm mt-1">{contacts.length} contacts dans l'écosystème Meshuga</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nouveau contact
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`btn btn-sm ${activeCategory === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Tous ({contacts.length})
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`btn btn-sm gap-1.5 ${activeCategory === cat.value ? 'text-white' : 'btn-secondary'}`}
            style={activeCategory === cat.value ? { background: cat.color, border: 'none' } : {}}
          >
            {cat.emoji} {cat.label} ({countByCategory(cat.value)})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-light" />
        <input className="input pl-9 max-w-md" placeholder="Rechercher un contact…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {loading && <div className="col-span-3 text-center text-dark-light py-12">Chargement…</div>}
        {!loading && filtered.length === 0 && (
          <div className="col-span-3 text-center text-dark-light py-12">Aucun contact trouvé</div>
        )}
        {filtered.map(c => {
          const cat = CATEGORIES.find(x => x.value === c.category)
          return (
            <div
              key={c.id}
              className="card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: (cat?.color || '#888') + '22' }}
                  >
                    {cat?.emoji}
                  </div>
                  <div>
                    <span className="badge text-[10px]" style={{ background: (cat?.color || '#888') + '15', color: cat?.color }}>
                      {cat?.label}
                    </span>
                    {c.is_vip && <span className="ml-1 text-yellow text-xs">★ VIP</span>}
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-dark">{c.full_name}</h3>
              {c.company_name && <p className="text-sm text-dark-light">{c.company_name}</p>}
              {c.title && <p className="text-xs text-dark-light italic">{c.title}</p>}
              <div className="mt-3 space-y-1">
                {c.phone && <div className="flex items-center gap-1.5 text-xs text-dark-mid"><Phone size={11} />{c.phone}</div>}
                {c.email && <div className="flex items-center gap-1.5 text-xs text-dark-mid"><Mail size={11} />{c.email}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <ContactDetail
          contact={selected}
          onClose={() => setSelected(null)}
          onUpdate={loadData}
          currentUser={currentUser}
        />
      )}

      {/* Form modal */}
      {showForm && (
        <ContactForm
          currentUser={currentUser}
          onClose={() => setShowForm(false)}
          onSave={loadData}
        />
      )}
    </div>
  )
}

function ContactDetail({ contact, onClose, onUpdate, currentUser }: any) {
  const supabase = createClient()
  const cat = CATEGORIES.find(x => x.value === contact.category)

  async function remove() {
    if (!confirm('Supprimer ce contact ?')) return
    await supabase.from('contacts').delete().eq('id', contact.id)
    toast.success('Contact supprimé')
    onUpdate()
    onClose()
  }

  async function toggleVip() {
    await supabase.from('contacts').update({ is_vip: !contact.is_vip }).eq('id', contact.id)
    onUpdate()
    toast.success(contact.is_vip ? 'VIP retiré' : 'Marqué VIP ⭐')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: (cat?.color || '#888') + '22' }}>
              {cat?.emoji}
            </div>
            <div>
              <h2 className="font-semibold text-xl">{contact.full_name}</h2>
              {contact.company_name && <p className="text-dark-light text-sm">{contact.company_name}</p>}
            </div>
          </div>
        </div>
        <div className="modal-body space-y-4">
          <div className="flex gap-2">
            <span className="badge" style={{ background: (cat?.color || '#888') + '15', color: cat?.color }}>{cat?.label}</span>
            {contact.title && <span className="badge bg-cream text-dark-light">{contact.title}</span>}
            {contact.is_vip && <span className="badge bg-yellow/20 text-yellow-700">★ VIP</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-dark hover:text-red"><Mail size={13} />{contact.email}</a>}
            {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-dark hover:text-red"><Phone size={13} />{contact.phone}</a>}
            {contact.website && <a href={contact.website} target="_blank" className="flex items-center gap-2 text-dark hover:text-red"><Globe size={13} />{contact.website}</a>}
            {contact.instagram && <a href={`https://instagram.com/${contact.instagram}`} target="_blank" className="flex items-center gap-2 text-dark hover:text-red"><Instagram size={13} />@{contact.instagram}</a>}
          </div>

          {contact.address && (
            <div><span className="label block mb-1">Adresse</span><p className="text-sm">{contact.address}</p></div>
          )}
          {contact.payment_terms && (
            <div><span className="label block mb-1">Conditions de paiement</span><p className="text-sm">{contact.payment_terms}</p></div>
          )}
          {contact.notes && (
            <div><span className="label block mb-1">Notes</span><p className="text-sm bg-cream rounded-xl p-3">{contact.notes}</p></div>
          )}
          {contact.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((t: string) => <span key={t} className="badge bg-cream text-dark-light text-[10px]">#{t}</span>)}
            </div>
          )}
        </div>
        <div className="modal-footer gap-2">
          <button className="btn-ghost btn-sm" onClick={toggleVip}>{contact.is_vip ? '★ Retirer VIP' : '☆ Marquer VIP'}</button>
          <button className="btn-danger btn-sm" onClick={remove}>Supprimer</button>
          <button className="btn-secondary" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

function ContactForm({ currentUser, onClose, onSave }: any) {
  const supabase = createClient()
  const [form, setForm] = useState({
    category: 'fournisseur' as ContactCategory,
    full_name: '', company_name: '', title: '', email: '', phone: '', whatsapp: '',
    address: '', website: '', instagram: '', notes: '', payment_terms: '',
    is_vip: false, tags: ''
  })

  async function save() {
    if (!form.full_name) return toast.error('Nom requis')
    const { error } = await supabase.from('contacts').insert({
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
      created_by: currentUser?.id
    })
    if (error) { toast.error('Erreur'); return }
    toast.success('Contact ajouté !')
    onSave()
    onClose()
  }

  const F = ({ label, children }: any) => (
    <div><label className="label block mb-1">{label}</label>{children}</div>
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h2 className="section-title">Nouveau contact</h2></div>
        <div className="modal-body space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <F label="Catégorie *">
              <select className="input select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ContactCategory }))}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </F>
            <F label="VIP ?">
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={form.is_vip} onChange={e => setForm(f => ({ ...f, is_vip: e.target.checked }))} className="w-4 h-4" />
                <span className="text-sm">Marquer comme VIP ★</span>
              </div>
            </F>
            <F label="Nom complet *"><input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></F>
            <F label="Entreprise"><input className="input" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></F>
            <F label="Titre / Poste"><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></F>
            <F label="Email"><input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></F>
            <F label="Téléphone"><input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></F>
            <F label="WhatsApp"><input className="input" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} /></F>
            <F label="Site web"><input className="input" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></F>
            <F label="Instagram"><input className="input" placeholder="@handle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} /></F>
          </div>
          {form.category === 'fournisseur' && (
            <F label="Conditions de paiement"><input className="input" placeholder="ex: 30 jours, comptant…" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></F>
          )}
          <F label="Tags (séparés par virgule)"><input className="input" placeholder="ex: viande, premium, paris6" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></F>
          <F label="Notes"><textarea className="input textarea" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></F>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={save}>Ajouter le contact</button>
        </div>
      </div>
    </div>
  )
}
