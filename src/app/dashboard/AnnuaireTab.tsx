'use client'
import { useState } from 'react'

// =============================================================================
// AnnuaireTab — Carnet de contacts Meshuga (refonte UX/UI)
//
// Structure :
//   1. HEADER          — titre + compteur + actions (+ Contact / Import CSV)
//   2. TOOLBAR         — recherche live + filtres catégories color-codés
//   3. RESULTATS       — cartes lisibles regroupees par categorie (vue "Tous")
//                        ou grille simple (categorie filtree)
//
// Aucune logique metier modifiee : memes categories, memes couleurs, meme
// import CSV, meme ouverture de modal qu'avant. Donnees et state viennent du
// parent via `ctx` (contacts, annCat/setAnnCat, openModal, loadContacts,
// toast, sb). Seul le RENDU est refondu.
//
// Charte stricte : rose #FF82D7 / jaune #FFEB5A / noir #191923 (texte+bordures
// uniquement, jamais en fond). Yellowtail = titres deco only (.pt / .ct).
// Neo-brutalist : bordures epaisses + box-shadow (classes .card / .ann-tab).
// =============================================================================

var NOIR = '#191923'
var ROSE = '#FF82D7'
var JAUNE = '#FFEB5A'

// Categories + libelles + couleurs d'accent (identiques a l'ancien rendu inline)
var CATS = ['all', 'food', 'prestataire', 'photographe', 'comptabilite', 'client', 'presse', 'banque', 'team', 'autre']
var CAT_LABELS = {
  all: 'Tous',
  food: 'Fournisseurs',
  prestataire: 'Prestataires',
  photographe: 'Photographe',
  comptabilite: 'Comptabilite',
  client: 'Clients B2B',
  presse: 'Presse',
  banque: 'Banque',
  team: 'Team Meshuga',
  autre: 'Autre'
}
var CAT_ICONS = {
  food: '🥩',
  prestataire: '🔧',
  photographe: '📷',
  comptabilite: '🧮',
  client: '🤝',
  presse: '📰',
  banque: '🏦',
  team: '⭐',
  autre: '📌'
}
var CAT_COLORS = {
  food: '#009D3A',
  prestataire: '#005FFF',
  photographe: '#7B3FBE',
  comptabilite: '#2D7A5A',
  client: '#FF82D7',
  presse: '#FF6B2B',
  banque: '#1A1A6E',
  team: '#B8920A',
  autre: '#888'
}

// ---- Helpers donnees (plain JS, aucun JSX) ----
var catOf = function (c) { return c.category || c.cat || 'autre' }
var accentOf = function (cat) { return CAT_COLORS[cat] || NOIR }
var labelOf = function (cat) { return CAT_LABELS[cat] || cat }
var iconOf = function (cat) { return CAT_ICONS[cat] || '📌' }

var nameOf = function (c) {
  if (c.full_name) return c.full_name
  if (c.nom) return c.prenom ? (c.prenom + ' ' + c.nom) : c.nom
  return c.name || ''
}
var companyOf = function (c) { return c.company_name || c.societe || '' }
var personOf = function (c) {
  var p = c.contact || ''
  if (!p || p === '—') return ''
  return p
}
var isVip = function (c) { return !!(c.is_vip || c.vip) }

var sortKey = function (c) {
  if (c.nom) return c.nom
  var fn = nameOf(c) || ''
  return fn.split(' ').pop() || fn
}

var hayOf = function (c) {
  var bits = [nameOf(c), companyOf(c), personOf(c), c.phone, c.phone2, c.email, c.email2, c.website, c.notes, labelOf(catOf(c))]
  return bits.filter(function (x) { return !!x }).join(' ').toLowerCase()
}

// Texte lisible sur fond d'accent (les accents clairs passent en texte noir)
var onAccent = function (color) {
  if (color === JAUNE || color === '#B8920A') return NOIR
  return '#FFFFFF'
}

export default function AnnuaireTab(ctx) {
  var contacts = ctx.contacts || []
  var annCat = ctx.annCat
  var setAnnCat = ctx.setAnnCat
  var openModal = ctx.openModal
  var loadContacts = ctx.loadContacts
  var toast = ctx.toast
  var sb = ctx.sb

  var [query, setQuery] = useState('')

  var q = query.trim().toLowerCase()

  // Filtrage : categorie + recherche
  var filtered = contacts
    .filter(function (c) { return annCat === 'all' || catOf(c) === annCat })
    .filter(function (c) { return q === '' || hayOf(c).indexOf(q) !== -1 })
    .slice()
    .sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b), 'fr') })

  // Regroupement par categorie (uniquement en vue "Tous")
  var grouped = annCat === 'all'
  var groupOrder = CATS.filter(function (cat) { return cat !== 'all' })
  var groups = groupOrder
    .map(function (cat) {
      return { cat: cat, items: filtered.filter(function (c) { return catOf(c) === cat }) }
    })
    .filter(function (g) { return g.items.length > 0 })

  // ---- Import CSV (logique inchangee) ----
  var onCsv = function (e) {
    var f = e.target && e.target.files && e.target.files[0]
    if (!f) return
    var r = new FileReader()
    r.onload = function (ev) {
      var raw = ev.target ? String(ev.target.result) : ''
      var rows = raw.split('\n').filter(function (l) { return l.trim() })
      var added = rows.slice(1).map(function (row) {
        var cols = row.split(',').map(function (x) { return x.replace(/"/g, '').trim() })
        return { id: Date.now() + Math.random(), cat: 'prestataire', name: cols[0] || '', phone: cols[1] || '', email: cols[2] || '', notes: cols[3] || '', vip: false }
      }).filter(function (c) { return c.name })
      if (added.length > 0) {
        var inserts = added.map(function (c) { return { full_name: c.name || '', phone: c.phone || '', email: c.email || '', notes: c.notes || '', category: 'prestataire', is_vip: false } })
        sb().from('contacts').insert(inserts).then(function () { loadContacts(); toast(added.length + ' contacts importes !') })
      }
    }
    r.readAsText(f)
    e.target.value = ''
  }

  // ---- Rendu d'une carte contact (fonction-expression, appelee dans .map) ----
  var renderCard = function (c) {
    var cat = catOf(c)
    var accent = accentOf(cat)
    var nm = nameOf(c)
    var comp = companyOf(c)
    var person = personOf(c)
    var phone = c.phone && c.phone !== '—' ? c.phone : ''
    return (
      <div
        key={c.id}
        className="card card-click"
        style={{ borderTop: '5px solid ' + accent, marginBottom: 0, cursor: 'pointer' }}
        onClick={function () { openModal('contact', Object.assign({}, c)) }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <span className="badge" style={{ color: accent }}>{iconOf(cat)} {labelOf(cat)}</span>
          {isVip(c) ? <span style={{ fontSize: 11, fontWeight: 900, color: '#B8920A', whiteSpace: 'nowrap' }}>⭐ VIP</span> : null}
        </div>

        <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.15, color: NOIR }}>{nm || 'Sans nom'}</div>
        {comp ? <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', marginTop: 1 }}>{comp}</div> : null}
        {person ? <div style={{ fontSize: 11.5, color: '#444', marginTop: 4 }}>👤 {person}</div> : null}

        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {phone ? <a href={'tel:' + phone.replace(/\s/g, '')} style={{ fontSize: 12.5, color: NOIR, textDecoration: 'none', fontWeight: 700 }} onClick={function (e) { e.stopPropagation() }}>📞 {phone}</a> : null}
          {c.phone2 ? <a href={'tel:' + c.phone2.replace(/\s/g, '')} style={{ fontSize: 11.5, color: '#888', textDecoration: 'none' }} onClick={function (e) { e.stopPropagation() }}>📞 {c.phone2}</a> : null}
          {c.email ? <a href={'mailto:' + c.email} style={{ fontSize: 12.5, color: NOIR, textDecoration: 'none' }} onClick={function (e) { e.stopPropagation() }}>✉️ {c.email}</a> : null}
          {c.email2 ? <a href={'mailto:' + c.email2} style={{ fontSize: 11.5, color: '#888', textDecoration: 'none' }} onClick={function (e) { e.stopPropagation() }}>✉️ {c.email2}</a> : null}
          {c.website ? <a href={c.website.indexOf('http') === 0 ? c.website : 'https://' + c.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: '#005FFF', textDecoration: 'none', fontWeight: 700 }} onClick={function (e) { e.stopPropagation() }}>🌐 {c.website.replace(/^https?:\/\//, '')}</a> : null}
        </div>

        {c.notes ? <div style={{ fontSize: 10.5, color: '#666', marginTop: 8, lineHeight: 1.4, borderTop: '1.5px solid #EBEBEB', paddingTop: 6 }}>{c.notes}</div> : null}
      </div>
    )
  }

  return (
    <div>
      {/* HEADER */}
      <div className="ph">
        <div>
          <div className="pt">Annuaire</div>
          <div className="ps">{contacts.length} contacts &middot; {filtered.length} affiche{filtered.length > 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn-y btn-sm" onClick={function () { openModal('contact', { category: 'food', vip: false }) }}>+ Contact</button>
          <button className="btn btn-sm" onClick={function () { var el = document.getElementById('csv-imp'); if (el) el.click() }}>📥 Import CSV</button>
          <input id="csv-imp" type="file" accept=".csv" style={{ display: 'none' }} onChange={onCsv} />
        </div>
      </div>

      {/* TOOLBAR : recherche */}
      <div style={{ position: 'relative', marginBottom: 12, maxWidth: 420 }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
        <input
          className="inp"
          style={{ paddingLeft: 32, paddingRight: query ? 30 : 10 }}
          placeholder="Rechercher un nom, une societe, un email..."
          value={query}
          onChange={function (e) { setQuery(e.target.value) }}
        />
        {query ? (
          <button
            onClick={function () { setQuery('') }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 900, color: '#888', lineHeight: 1 }}
            aria-label="Effacer"
          >&times;</button>
        ) : null}
      </div>

      {/* TOOLBAR : filtres categories */}
      <div className="ann-tabs">
        {CATS.map(function (cat) {
          var active = annCat === cat
          var accent = cat === 'all' ? ROSE : accentOf(cat)
          var count = cat === 'all' ? contacts.length : contacts.filter(function (c) { return catOf(c) === cat }).length
          if (cat !== 'all' && count === 0) return null
          var st = active
            ? { background: accent, color: onAccent(accent), borderColor: NOIR }
            : { background: '#FFFFFF', color: NOIR, borderColor: NOIR }
          return (
            <button key={cat} className="ann-tab" style={st} onClick={function () { setAnnCat(cat) }}>
              {cat === 'all' ? '' : iconOf(cat) + ' '}{labelOf(cat)} <span style={{ opacity: active ? 0.75 : 0.45, fontWeight: 700 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* RESULTATS */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 30, marginBottom: 6 }}>🔭</div>
          <div style={{ fontWeight: 900, fontSize: 14, color: NOIR }}>Aucun contact trouve</div>
          <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>
            {q ? 'Essaie un autre terme de recherche' : 'Cette categorie est vide pour le moment'}
          </div>
          {(q || annCat !== 'all') ? (
            <button className="btn btn-sm" style={{ marginTop: 12 }} onClick={function () { setQuery(''); setAnnCat('all') }}>↺ Reinitialiser</button>
          ) : null}
        </div>
      ) : grouped ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {groups.map(function (g) {
            var accent = accentOf(g.cat)
            return (
              <div key={g.cat}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="ct" style={{ marginBottom: 0 }}>{iconOf(g.cat)} {labelOf(g.cat)}</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: onAccent(accent), background: accent, border: '2px solid ' + NOIR, borderRadius: 20, padding: '1px 9px' }}>{g.items.length}</span>
                  <span style={{ flex: 1, height: 3, background: accent, borderRadius: 3, opacity: 0.35 }}></span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(258px,1fr))', gap: 12 }}>
                  {g.items.map(function (c) { return renderCard(c) })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(258px,1fr))', gap: 12 }}>
          {filtered.map(function (c) { return renderCard(c) })}
        </div>
      )}
    </div>
  )
}
