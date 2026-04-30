'use client'

// ===========================================================
// QuoteWizard.tsx — Phase 4V3.1
//
// Wizard de création de devis catering Meshuga.
// Étape 1 : Edward saisit un brief (5-9 champs) + sélectionne ou crée un client
// Étape 2 : Appel /api/catering/generate-options → IA génère 3 options
// Étape 3 : Preview des 3 options + bouton "Ouvrir l'éditeur" (Phase 4V3.2)
//
// Props :
//   - profile : { full_name, role, email } (utilisateur connecté)
//   - supabase : client Supabase déjà initialisé
//   - onClose : callback fermeture wizard
//   - onOpenEditor : callback (devisId, options, brief, client) → ouvre QuoteEditor
//
// Architecture data : un devis multi-options stocke ses 3 options dans la colonne
// `variants` (jsonb) de la table `devis`. La colonne `lineDetails` reste vide tant
// que le client n'a pas choisi son option (Phase 4V3.3).
// ===========================================================

import { useState, useEffect, useRef } from 'react'

// ---------- Constantes (en dehors du composant pour SWC) ----------

var EVENT_TYPES = [
  { value: 'petit_dej', label: '🥐 Petit-déjeuner', sub: 'Egg, Lox, PBN, Lobster' },
  { value: 'business_lunch', label: '🥪 Business Lunch', sub: 'Lunch box + plateaux' },
  { value: 'cocktail', label: '🍸 Cocktail dînatoire', sub: 'Mini-pièces salées et sucrées' },
  { value: 'soiree', label: '🥂 Soirée', sub: 'Mini-pièces, ambiance festive' }
]

// Format des items selon le type
// Si pas dans la map : pas de toggle (forcé par défaut)
var FORMAT_OPTIONS_BY_TYPE = {
  petit_dej: [
    { value: 'standard', label: 'Standard', sub: '1 sandwich complet/pers' },
    { value: 'mini', label: 'Mini', sub: '2-3 minis/pers' }
  ],
  business_lunch: null, // Standard forcé (lunch box + plateaux)
  cocktail: null,        // Mini forcé
  soiree: null           // Mini forcé
}

// Logistique disponible selon le type
var LOGISTICS_BY_TYPE = {
  petit_dej: [
    { value: 'livraison', label: '📦 Livraison en boxes' },
    { value: 'live_cooking', label: '🔥 Live cooking', sub: 'Sandwich petit-déj fait sur place' }
  ],
  business_lunch: [
    { value: 'livraison', label: '📦 Livraison en boxes', sub: 'Mode unique' }
  ],
  cocktail: [
    { value: 'livraison', label: '📦 Livraison en boxes' },
    { value: 'live_cooking', label: '🔥 Live cooking', sub: 'Mise en place +1h30, prestation 2h30' }
  ],
  soiree: [
    { value: 'livraison', label: '📦 Livraison en boxes' },
    { value: 'live_cooking', label: '🔥 Live cooking', sub: 'Mise en place +1h30, prestation 2h30' }
  ]
}

// Couleurs Meshuga (charte verrouillée)
var COLORS = {
  jaune: '#FFEB5A',
  rose: '#FF82D7',
  noir: '#191923',
  noirSoft: '#3a3a45',
  gris: '#999',
  grisLight: '#eee',
  grisVeryLight: '#f5f5f5',
  white: '#fff'
}

// ---------- Helpers ----------

function fmtEur(n) {
  var v = Number(n) || 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function todayIso() {
  var d = new Date()
  var yyyy = d.getFullYear()
  var mm = String(d.getMonth() + 1).padStart(2, '0')
  var dd = String(d.getDate()).padStart(2, '0')
  return yyyy + '-' + mm + '-' + dd
}

// Génère un numéro de devis DEV-YYYY-XXXX (XXXX random 4 chiffres)
function generateNumero() {
  var year = new Date().getFullYear()
  var rand = Math.floor(1000 + Math.random() * 9000)
  return 'DEV-' + year + '-' + rand
}

// ---------- Composant principal ----------

export default function QuoteWizard(props) {
  var profile = props && props.profile ? props.profile : null
  var supabase = props && props.supabase ? props.supabase : null
  var onClose = props && props.onClose ? props.onClose : function() {}
  var onOpenEditor = props && props.onOpenEditor ? props.onOpenEditor : function() {}

  // ---- État wizard ----
  // Étape : 'brief' | 'generating' | 'preview'
  var [step, setStep] = useState('brief')

  // ---- État client ----
  var [clientSearch, setClientSearch] = useState('')
  var [clientResults, setClientResults] = useState([])
  var [clientSearchLoading, setClientSearchLoading] = useState(false)
  var [selectedProspect, setSelectedProspect] = useState(null) // { id, company_name, contact_name, email, phone, address }
  var [showNewClientModal, setShowNewClientModal] = useState(false)

  // ---- État brief ----
  var [eventFormat, setEventFormat] = useState('') // petit_dej | business_lunch | cocktail | soiree
  var [nbPersonnes, setNbPersonnes] = useState('')
  var [eventDate, setEventDate] = useState('')
  var [eventLieu, setEventLieu] = useState('')
  var [logisticsMode, setLogisticsMode] = useState('') // livraison | live_cooking
  var [eventHour, setEventHour] = useState('')
  var [itemFormat, setItemFormat] = useState('') // standard | mini (selon type)
  var [meshugaIsOnly, setMeshugaIsOnly] = useState('oui') // oui | non (cocktail/soirée only)
  var [budgetCible, setBudgetCible] = useState('')
  var [contextNotes, setContextNotes] = useState('')

  // ---- État génération ----
  var [generating, setGenerating] = useState(false)
  var [genError, setGenError] = useState('')
  var [generatedOptions, setGeneratedOptions] = useState([])

  // ---- Effects : adapter les options selon eventFormat ----
  useEffect(function() {
    if (!eventFormat) return
    // Format items
    var formatChoices = FORMAT_OPTIONS_BY_TYPE[eventFormat]
    if (!formatChoices) {
      // Pas de choix : forcer
      if (eventFormat === 'business_lunch') setItemFormat('standard')
      else setItemFormat('mini') // cocktail, soirée : mini-only
    } else {
      // Reset si la valeur actuelle n'est plus dans les choix
      var validValues = formatChoices.map(function(o) { return o.value })
      if (validValues.indexOf(itemFormat) === -1) {
        setItemFormat(formatChoices[0].value)
      }
    }
    // Logistique : forcer livraison si business_lunch
    if (eventFormat === 'business_lunch') {
      setLogisticsMode('livraison')
    } else {
      // Si rien sélectionné, défaut livraison
      if (!logisticsMode) setLogisticsMode('livraison')
    }
  }, [eventFormat])

  // ---- Recherche client autocomplete ----
  var searchTimeoutRef = useRef(null)
  useEffect(function() {
    if (!supabase || !clientSearch || clientSearch.length < 2) {
      setClientResults([])
      return
    }
    if (selectedProspect) return // un client est déjà sélectionné
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(function() {
      setClientSearchLoading(true)
      var q = clientSearch.trim()
      supabase
        .from('prospects')
        .select('id, company_name, contact_name, email, phone, address')
        .or('company_name.ilike.%' + q + '%,contact_name.ilike.%' + q + '%,email.ilike.%' + q + '%')
        .limit(8)
        .then(function(res) {
          setClientSearchLoading(false)
          if (res.error) { setClientResults([]); return }
          setClientResults(res.data || [])
        }, function() {
          setClientSearchLoading(false)
          setClientResults([])
        })
    }, 300)
    return function() {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [clientSearch, supabase, selectedProspect])

  function handleSelectProspect(prospect) {
    setSelectedProspect(prospect)
    setClientSearch('')
    setClientResults([])
  }

  function handleClearProspect() {
    setSelectedProspect(null)
    setClientSearch('')
    setClientResults([])
  }

  // ---- Validation brief ----
  function isBriefValid() {
    if (!selectedProspect) return false
    if (!eventFormat) return false
    if (!nbPersonnes || Number(nbPersonnes) < 1) return false
    if (!eventDate) return false
    if (!eventLieu || !eventLieu.trim()) return false
    if (!logisticsMode) return false
    if (!eventHour) return false
    if (!itemFormat) return false
    return true
  }

  // ---- Génération IA ----
  function handleGenerate() {
    if (!isBriefValid()) return
    setStep('generating')
    setGenerating(true)
    setGenError('')

    var body = {
      eventFormat: eventFormat,
      nbPersonnes: Number(nbPersonnes),
      eventDate: eventDate,
      eventLieu: eventLieu,
      eventHour: eventHour,
      logisticsMode: logisticsMode,
      itemFormat: itemFormat,
      meshugaIsOnly: (eventFormat === 'cocktail' || eventFormat === 'soiree') ? (meshugaIsOnly === 'oui') : true,
      budgetCibleHTPerPers: budgetCible ? Number(budgetCible) : undefined,
      contextNotes: contextNotes || undefined
    }

    fetch('/api/catering/generate-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function(r) { return r.json() })
      .then(function(data) {
        setGenerating(false)
        if (!data.ok) {
          setGenError(data.error || 'Erreur de génération')
          setStep('brief')
          return
        }
        setGeneratedOptions(data.options || [])
        setStep('preview')
      }, function(err) {
        setGenerating(false)
        setGenError('Erreur réseau : ' + (err && err.message ? err.message : 'unknown'))
        setStep('brief')
      })
  }

  function handleBackToBrief() {
    setStep('brief')
    setGenError('')
  }

  // ---- Validation finale : créer devis brouillon avec les 3 options + ouvrir éditeur ----
  function handleAcceptAndEdit() {
    if (!supabase || !selectedProspect) return
    var numero = generateNumero()
    var responsableEmail = (profile && profile.email) || ''
    var responsablePrenom = 'Edward'
    if (profile) {
      if (profile.full_name === 'Emy' || profile.role === 'emy') responsablePrenom = 'Emy'
    }

    var payload = {
      numero: numero,
      statut: 'brouillon',
      prospect_id: selectedProspect.id,
      client_nom: selectedProspect.company_name || '',
      client_contact: selectedProspect.contact_name || '',
      client_email: selectedProspect.email || '',
      client_phone: selectedProspect.phone || '',
      event_date: eventDate,
      event_lieu: eventLieu,
      event_hour: eventHour,
      nb_personnes: Number(nbPersonnes),
      event_format: eventFormat,
      logistics_mode: logisticsMode,
      item_format: itemFormat,
      meshuga_is_only: (eventFormat === 'cocktail' || eventFormat === 'soiree') ? (meshugaIsOnly === 'oui') : true,
      notes: contextNotes || '',
      variants: generatedOptions, // Phase 4V3.1 : on stocke les 3 options en jsonb
      responsable_email: responsableEmail,
      responsable_prenom: responsablePrenom
    }

    supabase
      .from('devis')
      .insert([payload])
      .select()
      .single()
      .then(function(res) {
        if (res.error) {
          setGenError('Erreur sauvegarde devis : ' + res.error.message)
          return
        }
        var newDevis = res.data
        // Ouvre l'éditeur avec le devis créé (Phase 4V3.2 prendra le relais)
        onOpenEditor(newDevis.id, newDevis)
      })
  }

  // ---- Rendu ----

  // Helper styles inline (gérés via objects pour pas avoir de issues SWC avec const)
  var s_overlay = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(25, 25, 35, 0.55)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  }
  var s_modal = {
    background: COLORS.white,
    width: '100%',
    maxWidth: '900px',
    maxHeight: '95vh',
    borderRadius: '12px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    margin: '20px'
  }
  var s_header = {
    padding: '18px 24px',
    borderBottom: '2px solid ' + COLORS.grisLight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: COLORS.white
  }
  var s_title = {
    fontFamily: 'Yellowtail, cursive',
    fontSize: '28px',
    color: COLORS.noir,
    margin: 0,
    lineHeight: 1
  }
  var s_btnClose = {
    background: 'transparent',
    border: 'none',
    fontSize: '22px',
    cursor: 'pointer',
    color: COLORS.gris,
    padding: '4px 8px',
    lineHeight: 1
  }
  var s_body = {
    padding: '20px 24px',
    overflowY: 'auto',
    flex: 1
  }
  var s_footer = {
    padding: '14px 24px',
    borderTop: '2px solid ' + COLORS.grisLight,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    background: COLORS.grisVeryLight
  }
  var s_btnPrimary = {
    background: COLORS.rose,
    color: COLORS.jaune,
    border: '2px solid ' + COLORS.noir,
    borderRadius: '6px',
    padding: '12px 22px',
    fontFamily: 'Arial Narrow, Arial, sans-serif',
    fontWeight: 900,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '3px 3px 0 ' + COLORS.noir
  }
  var s_btnPrimaryDisabled = Object.assign({}, s_btnPrimary, {
    background: COLORS.grisLight,
    color: COLORS.gris,
    cursor: 'not-allowed',
    boxShadow: 'none'
  })
  var s_btnSecondary = {
    background: COLORS.white,
    color: COLORS.noir,
    border: '2px solid ' + COLORS.noir,
    borderRadius: '6px',
    padding: '10px 18px',
    fontFamily: 'Arial Narrow, Arial, sans-serif',
    fontWeight: 700,
    fontSize: '14px',
    cursor: 'pointer'
  }
  var s_section = { marginBottom: '20px' }
  var s_label = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: COLORS.noir,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px'
  }
  var s_input = {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid ' + COLORS.grisLight,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    background: COLORS.white,
    boxSizing: 'border-box',
    color: COLORS.noir
  }
  var s_textarea = Object.assign({}, s_input, {
    minHeight: '70px',
    resize: 'vertical'
  })
  var s_grid2 = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px'
  }
  var s_radioRow = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  }

  // Bouton radio stylisé (card)
  function RadioCard(p) {
    var checked = p.checked
    var s_card = {
      flex: '1 1 calc(50% - 4px)',
      minWidth: '120px',
      padding: '10px 12px',
      border: checked ? ('2.5px solid ' + COLORS.rose) : ('1.5px solid ' + COLORS.grisLight),
      borderRadius: '8px',
      cursor: 'pointer',
      background: checked ? '#FFF5FA' : COLORS.white,
      transition: 'all 0.15s',
      display: 'flex',
      flexDirection: 'column',
      gap: '2px'
    }
    return (
      <div style={s_card} onClick={p.onClick}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: COLORS.noir }}>{p.label}</div>
        {p.sub ? <div style={{ fontSize: '11px', color: COLORS.gris }}>{p.sub}</div> : null}
      </div>
    )
  }

  // Selected prospect pill
  function ProspectPill() {
    if (!selectedProspect) return null
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        background: COLORS.jaune,
        border: '2px solid ' + COLORS.noir,
        borderRadius: '24px',
        fontSize: '13px',
        fontWeight: 700,
        color: COLORS.noir
      }}>
        <span>👤 {selectedProspect.company_name}</span>
        {selectedProspect.contact_name ? <span style={{ fontWeight: 400, opacity: 0.7 }}>· {selectedProspect.contact_name}</span> : null}
        <button onClick={handleClearProspect} style={{
          background: 'transparent',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
          padding: 0,
          marginLeft: '4px',
          color: COLORS.noir
        }}>✕</button>
      </div>
    )
  }

  // ---------- ÉTAPE 1 : BRIEF ----------
  function renderBriefStep() {
    var formatChoices = eventFormat ? FORMAT_OPTIONS_BY_TYPE[eventFormat] : null
    var logisticsChoices = eventFormat ? LOGISTICS_BY_TYPE[eventFormat] : null
    var showMeshugaOnlyToggle = (eventFormat === 'cocktail' || eventFormat === 'soiree')
    var hourLabel = logisticsMode === 'live_cooking' ? '🔥 Heure de début de réception' : '📦 Heure de livraison souhaitée'
    var hourHint = logisticsMode === 'live_cooking' ? 'Mise en place 1h30 avant + prestation 2h30 inclus' : ''

    return (
      <div>
        {/* Section Client */}
        <div style={s_section}>
          <label style={s_label}>👤 Client</label>
          {selectedProspect ? (
            <ProspectPill />
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={function(e) { setClientSearch(e.target.value) }}
                  placeholder="🔍 Rechercher entreprise, contact ou email…"
                  style={Object.assign({}, s_input, { flex: '1 1 250px' })}
                />
                <button
                  onClick={function() { setShowNewClientModal(true) }}
                  style={s_btnSecondary}
                >+ Nouveau client</button>
              </div>
              {clientSearchLoading ? <div style={{ marginTop: '8px', fontSize: '12px', color: COLORS.gris }}>Recherche…</div> : null}
              {clientResults.length > 0 ? (
                <div style={{
                  marginTop: '8px',
                  border: '1px solid ' + COLORS.grisLight,
                  borderRadius: '6px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  background: COLORS.white
                }}>
                  {clientResults.map(function(p) {
                    return (
                      <div
                        key={p.id}
                        onClick={function() { handleSelectProspect(p) }}
                        style={{
                          padding: '10px 12px',
                          borderBottom: '1px solid ' + COLORS.grisLight,
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: COLORS.noir }}>{p.company_name}</div>
                        {p.contact_name || p.email ? (
                          <div style={{ fontSize: '11px', color: COLORS.gris, marginTop: '2px' }}>
                            {p.contact_name || ''}{p.contact_name && p.email ? ' · ' : ''}{p.email || ''}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
              {clientSearch.length >= 2 && clientResults.length === 0 && !clientSearchLoading ? (
                <div style={{ marginTop: '8px', fontSize: '12px', color: COLORS.gris }}>
                  Aucun résultat. <button onClick={function() { setShowNewClientModal(true) }} style={{ background: 'transparent', border: 'none', color: COLORS.rose, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontWeight: 700 }}>Créer un nouveau client</button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Section Type de prestation */}
        <div style={s_section}>
          <label style={s_label}>📋 Type de prestation</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {EVENT_TYPES.map(function(t) {
              return (
                <RadioCard
                  key={t.value}
                  label={t.label}
                  sub={t.sub}
                  checked={eventFormat === t.value}
                  onClick={function() { setEventFormat(t.value) }}
                />
              )
            })}
          </div>
        </div>

        {eventFormat ? (
          <div>
            {/* Détails événement (col gauche / col droite) */}
            <div style={s_grid2}>
              {/* COL GAUCHE */}
              <div>
                <div style={s_section}>
                  <label style={s_label}>👥 Nombre de personnes</label>
                  <input
                    type="number"
                    min="1"
                    value={nbPersonnes}
                    onChange={function(e) { setNbPersonnes(e.target.value) }}
                    placeholder="50"
                    style={s_input}
                  />
                </div>

                <div style={s_section}>
                  <label style={s_label}>📅 Date de l'événement</label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={function(e) { setEventDate(e.target.value) }}
                    min={todayIso()}
                    style={s_input}
                  />
                </div>

                <div style={s_section}>
                  <label style={s_label}>📍 Lieu (adresse de livraison ou de réception)</label>
                  <input
                    type="text"
                    value={eventLieu}
                    onChange={function(e) { setEventLieu(e.target.value) }}
                    placeholder="12 rue de la Paix, 75002 Paris"
                    style={s_input}
                  />
                </div>
              </div>

              {/* COL DROITE */}
              <div>
                {/* Logistique */}
                {logisticsChoices ? (
                  <div style={s_section}>
                    <label style={s_label}>📦 Mode logistique</label>
                    <div style={s_radioRow}>
                      {logisticsChoices.map(function(opt) {
                        return (
                          <RadioCard
                            key={opt.value}
                            label={opt.label}
                            sub={opt.sub}
                            checked={logisticsMode === opt.value}
                            onClick={function() { setLogisticsMode(opt.value) }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Format items */}
                {formatChoices ? (
                  <div style={s_section}>
                    <label style={s_label}>🍽️ Format des items</label>
                    <div style={s_radioRow}>
                      {formatChoices.map(function(opt) {
                        return (
                          <RadioCard
                            key={opt.value}
                            label={opt.label}
                            sub={opt.sub}
                            checked={itemFormat === opt.value}
                            onClick={function() { setItemFormat(opt.value) }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Heure */}
                <div style={s_section}>
                  <label style={s_label}>⏰ {hourLabel}</label>
                  <input
                    type="time"
                    value={eventHour}
                    onChange={function(e) { setEventHour(e.target.value) }}
                    style={s_input}
                  />
                  {hourHint ? <div style={{ fontSize: '11px', color: COLORS.gris, marginTop: '6px', fontStyle: 'italic' }}>💡 {hourHint}</div> : null}
                </div>

                {/* Meshuga seul ? (cocktail/soirée only) */}
                {showMeshugaOnlyToggle ? (
                  <div style={s_section}>
                    <label style={s_label}>🍱 Meshuga = seul traiteur ?</label>
                    <div style={s_radioRow}>
                      <RadioCard
                        label="✅ Oui, on couvre tout"
                        sub="5-6 minis/pers"
                        checked={meshugaIsOnly === 'oui'}
                        onClick={function() { setMeshugaIsOnly('oui') }}
                      />
                      <RadioCard
                        label="🤝 Non, juste cocktail"
                        sub="2-3 minis/pers (mix avec autres traiteurs)"
                        checked={meshugaIsOnly === 'non'}
                        onClick={function() { setMeshugaIsOnly('non') }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Budget cible */}
            <div style={s_section}>
              <label style={s_label}>💰 Budget cible HT par personne (optionnel)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={budgetCible}
                onChange={function(e) { setBudgetCible(e.target.value) }}
                placeholder="25"
                style={Object.assign({}, s_input, { maxWidth: '200px' })}
              />
              <div style={{ fontSize: '11px', color: COLORS.gris, marginTop: '6px', fontStyle: 'italic' }}>
                Si renseigné, l'IA calibre Essentiel ~70%, Signature ~100%, Excellence ~130% de ce budget.
              </div>
            </div>

            {/* Notes */}
            <div style={s_section}>
              <label style={s_label}>📝 Notes / contexte (allergies, vibe, contraintes…)</label>
              <textarea
                value={contextNotes}
                onChange={function(e) { setContextNotes(e.target.value) }}
                placeholder="Ex : agence créa parisienne, équipe jeune, 2 vegan, allergie noisette…"
                style={s_textarea}
              />
            </div>

            {genError ? (
              <div style={{
                background: '#FEE',
                border: '1px solid #C33',
                color: '#C33',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '14px'
              }}>{genError}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  // ---------- ÉTAPE 2 : GENERATING ----------
  function renderGeneratingStep() {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>✨</div>
        <div style={{
          fontFamily: 'Yellowtail, cursive',
          fontSize: '32px',
          color: COLORS.noir,
          marginBottom: '12px'
        }}>Claude réfléchit…</div>
        <div style={{ fontSize: '14px', color: COLORS.gris, maxWidth: '400px', margin: '0 auto' }}>
          Génération des 3 options Essentiel / Signature / Excellence en cours.
          <br />Cela prend généralement 5 à 15 secondes.
        </div>
      </div>
    )
  }

  // ---------- ÉTAPE 3 : PREVIEW ----------
  function renderPreviewStep() {
    return (
      <div>
        <div style={{
          fontSize: '13px',
          color: COLORS.gris,
          marginBottom: '16px',
          padding: '10px 14px',
          background: '#F0FFF4',
          border: '1px solid #B0E0B0',
          borderRadius: '6px'
        }}>
          ✨ <strong>3 options générées par l'IA.</strong> Tu pourras les retoucher (ajouter, supprimer, modifier des items) dans l'éditeur après validation.
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '14px'
        }}>
          {generatedOptions.map(function(opt, idx) {
            var isSig = opt.key === 'signature'
            var s_card = {
              border: isSig ? ('3px solid ' + COLORS.rose) : ('2px solid ' + COLORS.grisLight),
              borderRadius: '10px',
              padding: '16px',
              background: isSig ? '#FFF5FA' : COLORS.white,
              position: 'relative'
            }
            return (
              <div key={idx} style={s_card}>
                {isSig ? (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '12px',
                    background: COLORS.rose,
                    color: COLORS.jaune,
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.5px'
                  }}>RECOMMANDÉ</div>
                ) : null}
                <div style={{
                  fontFamily: 'Yellowtail, cursive',
                  fontSize: '26px',
                  color: COLORS.noir,
                  marginBottom: '4px'
                }}>{opt.label}</div>
                {opt.description ? (
                  <div style={{ fontSize: '12px', color: COLORS.gris, marginBottom: '12px', fontStyle: 'italic', minHeight: '32px' }}>{opt.description}</div>
                ) : null}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: COLORS.noir }}>{fmtEur(opt.total_ttc)}</div>
                  <div style={{ fontSize: '11px', color: COLORS.gris }}>TTC · {fmtEur(opt.per_personne_ttc)} / pers</div>
                </div>
                <div style={{
                  borderTop: '1px solid ' + COLORS.grisLight,
                  paddingTop: '10px',
                  fontSize: '12px',
                  color: COLORS.noirSoft,
                  maxHeight: '180px',
                  overflowY: 'auto'
                }}>
                  {(opt.items || []).slice(0, 5).map(function(it, i) {
                    return (
                      <div key={i} style={{ marginBottom: '5px' }}>
                        <strong style={{ color: COLORS.rose }}>{it.qty}×</strong> {it.name}
                      </div>
                    )
                  })}
                  {(opt.items || []).length > 5 ? (
                    <div style={{ fontSize: '11px', color: COLORS.gris, fontStyle: 'italic', marginTop: '4px' }}>
                      + {(opt.items || []).length - 5} autres items…
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ---------- MODAL NOUVEAU CLIENT ----------
  function NewClientModal() {
    if (!showNewClientModal) return null
    return <NewClientModalInner onClose={function() { setShowNewClientModal(false) }} onCreated={function(p) {
      setSelectedProspect(p)
      setShowNewClientModal(false)
    }} supabase={supabase} />
  }

  // ---------- RENDU ----------

  return (
    <div style={s_overlay}>
      <div style={s_modal}>
        <div style={s_header}>
          <h2 style={s_title}>
            {step === 'preview' ? '✨ 3 options générées' : 'Nouveau devis catering'}
          </h2>
          <button style={s_btnClose} onClick={onClose}>✕</button>
        </div>

        <div style={s_body}>
          {step === 'brief' ? renderBriefStep() : null}
          {step === 'generating' ? renderGeneratingStep() : null}
          {step === 'preview' ? renderPreviewStep() : null}
        </div>

        <div style={s_footer}>
          {step === 'brief' ? (
            <span></span>
          ) : step === 'preview' ? (
            <button style={s_btnSecondary} onClick={handleBackToBrief}>← Modifier le brief</button>
          ) : (
            <span></span>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {step === 'brief' ? (
              <button
                style={isBriefValid() ? s_btnPrimary : s_btnPrimaryDisabled}
                onClick={handleGenerate}
                disabled={!isBriefValid()}
              >✨ Générer 3 options</button>
            ) : null}
            {step === 'preview' ? (
              <button style={s_btnPrimary} onClick={handleAcceptAndEdit}>
                ✓ Ouvrir l'éditeur
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <NewClientModal />
    </div>
  )
}

// ===========================================================
// MODAL CRÉATION NOUVEAU CLIENT
// ===========================================================
function NewClientModalInner(props) {
  var onClose = props.onClose
  var onCreated = props.onCreated
  var supabase = props.supabase

  var [companyName, setCompanyName] = useState('')
  var [contactName, setContactName] = useState('')
  var [email, setEmail] = useState('')
  var [phone, setPhone] = useState('')
  var [address, setAddress] = useState('')
  var [saving, setSaving] = useState(false)
  var [err, setErr] = useState('')

  function handleSave() {
    if (!supabase) return
    if (!companyName.trim()) { setErr('Nom entreprise requis'); return }
    setSaving(true)
    setErr('')
    supabase
      .from('prospects')
      .insert([{
        company_name: companyName.trim(),
        contact_name: contactName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        status: 'nouveau',
        source: 'wizard_devis'
      }])
      .select()
      .single()
      .then(function(res) {
        setSaving(false)
        if (res.error) { setErr('Erreur : ' + res.error.message); return }
        onCreated(res.data)
      }, function(e) {
        setSaving(false)
        setErr('Erreur : ' + (e && e.message ? e.message : 'unknown'))
      })
  }

  var s_innerOverlay = {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(25,25,35,0.7)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  }
  var s_innerModal = {
    background: '#fff',
    width: '100%',
    maxWidth: '540px',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
  }
  var s_innerLabel = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#191923',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px',
    marginTop: '12px'
  }
  var s_innerInput = {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #eee',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    background: '#fff',
    boxSizing: 'border-box',
    color: '#191923'
  }

  return (
    <div style={s_innerOverlay}>
      <div style={s_innerModal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontFamily: 'Yellowtail, cursive', fontSize: '24px', margin: 0, color: '#191923' }}>+ Nouveau client</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}>✕</button>
        </div>

        <label style={s_innerLabel}>Nom entreprise *</label>
        <input style={s_innerInput} value={companyName} onChange={function(e){ setCompanyName(e.target.value) }} placeholder="Acme Corp" autoFocus />

        <label style={s_innerLabel}>Contact (Prénom Nom)</label>
        <input style={s_innerInput} value={contactName} onChange={function(e){ setContactName(e.target.value) }} placeholder="Jean Dupont" />

        <label style={s_innerLabel}>Email</label>
        <input style={s_innerInput} type="email" value={email} onChange={function(e){ setEmail(e.target.value) }} placeholder="jean@acme.fr" />

        <label style={s_innerLabel}>Téléphone</label>
        <input style={s_innerInput} type="tel" value={phone} onChange={function(e){ setPhone(e.target.value) }} placeholder="+33 6 ..." />

        <label style={s_innerLabel}>Adresse</label>
        <input style={s_innerInput} value={address} onChange={function(e){ setAddress(e.target.value) }} placeholder="12 rue de la Paix, 75002 Paris" />

        {err ? <div style={{ marginTop: '12px', padding: '8px 10px', background: '#FEE', border: '1px solid #C33', color: '#C33', borderRadius: '4px', fontSize: '12px' }}>{err}</div> : null}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{ background: '#fff', color: '#191923', border: '2px solid #191923', borderRadius: '6px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
          >Annuler</button>
          <button
            onClick={handleSave}
            disabled={saving || !companyName.trim()}
            style={{
              background: companyName.trim() ? '#FF82D7' : '#eee',
              color: companyName.trim() ? '#FFEB5A' : '#999',
              border: '2px solid #191923',
              borderRadius: '6px',
              padding: '10px 18px',
              fontWeight: 900,
              fontSize: '13px',
              cursor: companyName.trim() ? 'pointer' : 'not-allowed',
              boxShadow: companyName.trim() ? '3px 3px 0 #191923' : 'none'
            }}
          >{saving ? 'Création…' : 'Créer le client'}</button>
        </div>
      </div>
    </div>
  )
}
