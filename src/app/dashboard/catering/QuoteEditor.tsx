'use client'

import { useState, useEffect, useMemo } from 'react'
import { LOGO_PINK, STAMP_PINK } from '../logos'
import {
  buildOfferingMap,
  aiOptionToVariant,
  computeVariant,
  computeCoverage,
  normalizeStatus,
  statusLabel,
  statusColor,
  coeffColor,
  fmtEur
} from '@/lib/catering/cateringCore'
import { buildDevisHtml } from '@/lib/catering/cateringPdf'

// ============================================================
// QuoteEditor.tsx — Éditeur de devis Meshuga Events (multi-formules)
// Branché sur le moteur unique cateringCore + le générateur cateringPdf.
// Props : { supabase, profile, devisId, prospects, onClose, onSaved, toast }
// Gère 1 à 3 formules (variants). Un devis simple = 1 formule.
// ============================================================

var EVENT_FORMATS = [
  { id: 'cocktail', label: '🍸 Cocktail dînatoire' },
  { id: 'business_lunch', label: '🥪 Business lunch' },
  { id: 'soiree', label: '🥂 Soirée' },
  { id: 'petit_dej', label: '🥐 Petit-déjeuner' },
  { id: 'autre', label: 'Événement' }
]

var CATEGORY_TABS = [
  { id: 'box_mini', label: 'Box minis', emoji: '📦' },
  { id: 'platter', label: 'Plateaux', emoji: '🍽️' },
  { id: 'lunch_box', label: 'Lunch box', emoji: '🍱' },
  { id: 'live_forfait', label: 'Live cooking', emoji: '🔥' },
  { id: 'live_mini', label: 'Live minis', emoji: '🥗' },
  { id: 'addon', label: 'Add-ons', emoji: '➕' }
]

var SUBCAT_LABELS = {
  daily: 'Daily', classic: 'Classic', signature: 'Signature', premium_lobster: 'Premium Lobster',
  canapes_desserts: 'Canapés & desserts', lobster: 'Lobster', standard: 'Standard', volume: 'Volume (30+)',
  animation: 'Forfaits animation', premium: 'Premium', tarama: 'Tarama', verrine: 'Verrines',
  beverage: 'Boissons', food: 'Food', live_extra: 'Heures sup live', lunch: 'Upgrades lunch'
}

var DEFAULT_VARIANT_LABELS = { essentiel: 'Essentiel', signature: 'Signature', excellence: 'Excellence' }

// ---------- Helpers purs ----------

var todayIso = function() {
  var d = new Date()
  return d.toISOString().split('T')[0]
}

var addDaysIso = function(n) {
  var d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

var genNumero = function() {
  var y = new Date().getFullYear()
  var stamp = String(Date.now()).slice(-4)
  return 'DEV-' + y + '-' + stamp
}

// Normalise les lignes (offering_id, qty, remise_pct)
var normLines = function(arr) {
  if (!Array.isArray(arr)) return []
  return arr.map(function(l) {
    return {
      offering_id: l.offering_id,
      qty: Number(l.qty) || 0,
      remise_pct: Number(l.remise_pct) || 0
    }
  })
}

// Transforme la colonne `variants` (jsonb) en formules éditables
var parseVariants = function(d) {
  var vs = d.variants
  if (typeof vs === 'string') {
    try { vs = JSON.parse(vs) } catch (e) { vs = null }
  }
  if (Array.isArray(vs) && vs.length > 0) {
    return vs.map(function(v) {
      if (v && Array.isArray(v.lines)) {
        return { key: v.key || '', label: v.label || '', description: v.description || '', lines: normLines(v.lines) }
      }
      // Option générée par l'IA (champ items)
      var conv = aiOptionToVariant(v)
      return { key: conv.key, label: conv.label, description: conv.description, lines: normLines(conv.lines) }
    })
  }
  // Devis simple : une seule formule depuis items
  var items = Array.isArray(d.items) ? d.items : []
  if (items.length > 0) {
    return [{ key: 'formule', label: 'Formule', description: '', lines: normLines(items) }]
  }
  return [{ key: 'formule', label: 'Formule', description: '', lines: [] }]
}

// ---------- CSS ----------

var QE_CSS =
  '.qe-root{font-family:"Arial Narrow",Arial,sans-serif;color:#191923}' +
  '.qe-header{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:12px}' +
  '.qe-num{font-size:18px;font-weight:900;letter-spacing:.5px}' +
  '.qe-num-sub{font-size:11px;opacity:.6;margin-bottom:4px}' +
  '.qe-status-pill{display:inline-block;padding:3px 10px;border-radius:11px;border:2px solid #191923;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px}' +
  '.qe-actions{display:flex;gap:6px;flex-wrap:wrap}' +
  '.qe-btn{border:2px solid #191923;border-radius:6px;padding:8px 13px;font-family:inherit;font-size:12px;font-weight:900;cursor:pointer;background:#fff;box-shadow:2px 2px 0 #191923;text-transform:uppercase;letter-spacing:.4px}' +
  '.qe-btn:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #191923}' +
  '.qe-btn.y{background:#FFEB5A}.qe-btn.p{background:#FF82D7;color:#fff}.qe-btn.g{background:#7AFF82}.qe-btn.r{background:#fff;color:#CC0066}' +
  '.qe-btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}' +
  '.qe-error{background:#FF82D7;border:2px solid #191923;border-radius:7px;padding:10px;font-size:12px;font-weight:900;margin-bottom:10px;box-shadow:3px 3px 0 #191923}' +
  '.qe-card{background:#fff;border:2px solid #191923;border-radius:8px;box-shadow:3px 3px 0 #191923;padding:12px;margin-bottom:11px}' +
  '.qe-card-title{font-family:Yellowtail,cursive;font-size:18px;margin-bottom:8px;line-height:1}' +
  '.qe-ctx{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px}' +
  '.qe-ctx b{font-weight:900}' +
  '.qe-fg{margin-bottom:8px}' +
  '.qe-fg2{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
  '.qe-lbl{display:block;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#7a7a82;margin-bottom:3px}' +
  '.qe-inp{width:100%;padding:7px 9px;border:1.5px solid #191923;border-radius:6px;font-family:inherit;font-size:13px;font-weight:700;background:#fff}' +
  '.qe-textarea{min-height:60px;resize:vertical;font-weight:400}' +
  '.qe-tabs-f{display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;margin-bottom:11px}' +
  '.qe-tab-f{flex:1;min-width:120px;border:2px solid #191923;border-radius:8px;background:#fff;box-shadow:2px 2px 0 #191923;cursor:pointer;padding:8px 10px;text-align:center;position:relative}' +
  '.qe-tab-f:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #191923}' +
  '.qe-tab-f.on{background:#FF82D7;color:#fff}' +
  '.qe-tab-f .t{font-size:14px;font-weight:900}.qe-tab-f .s{font-size:11px;opacity:.8}' +
  '.qe-tab-reco{position:absolute;top:-9px;right:6px;background:#FFEB5A;color:#191923;font-size:8.5px;font-weight:900;padding:1px 6px;border-radius:4px;border:1.5px solid #191923}' +
  '.qe-tab-add{border:2px dashed #191923;border-radius:8px;background:#fff;cursor:pointer;padding:8px 12px;font-weight:900;font-size:12px}' +
  '.qe-grid{display:grid;grid-template-columns:1fr;gap:11px}' +
  '@media(min-width:880px){.qe-grid{grid-template-columns:1.4fr 1fr}}' +
  '.qe-cov-wrap{display:flex;align-items:center;gap:12px;flex-wrap:wrap}' +
  '.qe-cov-bar-out{flex:1;min-width:160px;height:14px;background:#f0f0f0;border:1.5px solid #191923;border-radius:8px;overflow:hidden}' +
  '.qe-cov-bar-in{height:100%;transition:width .15s}' +
  '.qe-cov-hint{font-size:11px;font-weight:900;margin-top:4px}' +
  '.qe-catchips{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:8px}' +
  '.qe-catchip{padding:5px 10px;border:1.5px solid #191923;border-radius:13px;background:#fff;font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer}' +
  '.qe-catchip.on{background:#FFEB5A}' +
  '.qe-subgroup-title{font-family:Yellowtail,cursive;font-size:15px;margin:6px 0 4px}' +
  '.qe-picks{display:grid;grid-template-columns:1fr 1fr;gap:6px}' +
  '.qe-pick{border:1.5px solid #191923;border-radius:6px;padding:7px 9px;display:flex;flex-direction:column;gap:3px;cursor:pointer;background:#fff}' +
  '.qe-pick-top{display:flex;justify-content:space-between;align-items:center;gap:8px}' +
  '.qe-pick-comp{font-size:10px;font-weight:600;color:#8a8a92;line-height:1.3}' +
  '.qe-pick:hover{background:#FFFCEB}' +
  '.qe-pick-name{font-size:12px;font-weight:700;line-height:1.2}' +
  '.qe-pick-pv{font-size:11px;font-weight:900;color:#FF82D7;white-space:nowrap;margin-left:8px}' +
  '.qe-line{display:flex;flex-direction:column;gap:4px;padding:7px 0;border-bottom:1px dashed #ddd}' +
  '.qe-line-top{display:flex;align-items:center;gap:8px}' +
  '.qe-line-comp{font-size:10.5px;font-weight:600;color:#8a8a92;line-height:1.3}' +
  '.qe-line-name{flex:1;font-size:12.5px;font-weight:700;min-width:0}' +
  '.qe-q{display:flex;align-items:center;border:1.5px solid #191923;border-radius:6px;overflow:hidden}' +
  '.qe-q b{padding:2px 9px;background:#FFEB5A;font-size:13px;font-weight:900;cursor:pointer;user-select:none}' +
  '.qe-q span{padding:2px 9px;font-size:13px;font-weight:900;min-width:34px;text-align:center}' +
  '.qe-line-tot{font-size:12.5px;font-weight:900;min-width:64px;text-align:right}' +
  '.qe-rm{border:none;background:none;color:#bbb;cursor:pointer;font-size:14px;padding:0 2px}' +
  '.qe-rrow{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}' +
  '.qe-rrow.gray span{color:#7a7a82}' +
  '.qe-final{display:flex;justify-content:space-between;align-items:center;background:#191923;color:#FFEB5A;border-radius:6px;padding:8px 11px;margin-top:6px}' +
  '.qe-final .l{font-size:12px;font-weight:900}.qe-final .a{font-size:17px;font-weight:900}' +
  '.qe-int{border:1.5px dashed #FF82D7;border-radius:6px;padding:8px 10px;margin-top:9px;background:#FFF5FB}' +
  '.qe-int-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#993556;margin-bottom:4px}' +
  '.qe-check{display:flex;align-items:center;gap:5px;font-size:12px;font-weight:700;margin-top:5px;cursor:pointer}' +
  '.qe-ov{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(25,25,35,.6);z-index:2000;display:flex;align-items:center;justify-content:center;padding:18px}' +
  '.qe-modal{background:#fff;border:3px solid #191923;border-radius:10px;box-shadow:6px 6px 0 #FF82D7;max-width:480px;width:100%;padding:20px;max-height:92vh;overflow-y:auto}' +
  '.qe-modal h3{font-family:Yellowtail,cursive;font-size:24px;font-weight:400;margin-bottom:8px}' +
  '.qe-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}' +
  '.qe-warn{background:#FFF1FA;border:2px solid #CC0066;border-radius:6px;padding:9px 11px;font-size:12px;font-weight:700;color:#CC0066;margin:8px 0}' +
  '.qe-recap{margin-top:10px;border-top:2px solid #191923;padding-top:9px}' +
  '.qe-recap-h{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#993556;margin-bottom:6px}' +
  '.qe-recap-list{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:9px}' +
  '.qe-recap-chip{background:#FFF5FB;border:1.5px solid #FF82D7;border-radius:13px;padding:3px 9px;font-size:11px;font-weight:600;color:#191923;white-space:nowrap}' +
  '.qe-recap-tot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;background:#FFEB5A;border:2px solid #191923;border-radius:7px;padding:8px 11px;font-size:13px;font-weight:700;box-shadow:2px 2px 0 #191923}' +
  '@media(max-width:640px){.qe-picks{grid-template-columns:1fr}.qe-recap-tot{font-size:12px}}'

// ============================================================
// COMPOSANT
// ============================================================

export default function QuoteEditor(props) {
  var supabase = props && props.supabase ? props.supabase : null
  var profile = props && props.profile ? props.profile : null
  var devisId = props && props.devisId ? props.devisId : null
  var prospects = props && props.prospects ? props.prospects : []
  var onClose = props && props.onClose ? props.onClose : function() {}
  var onSaved = props && props.onSaved ? props.onSaved : function() {}
  var toast = props && props.toast ? props.toast : function() {}

  var [loading, setLoading] = useState(true)
  var [saving, setSaving] = useState(false)
  var [error, setError] = useState('')
  var [offerings, setOfferings] = useState([])
  var [curId, setCurId] = useState(devisId || null)

  var [numero, setNumero] = useState('')
  var [statut, setStatut] = useState('brouillon')
  var [validite, setValidite] = useState('')

  var [clientSelector, setClientSelector] = useState('')
  var [clientNom, setClientNom] = useState('')
  var [clientContact, setClientContact] = useState('')
  var [clientEmail, setClientEmail] = useState('')
  var [clientPhone, setClientPhone] = useState('')

  var [eventDate, setEventDate] = useState('')
  var [eventLieu, setEventLieu] = useState('')
  var [nbPersonnes, setNbPersonnes] = useState(40)
  var [eventFormat, setEventFormat] = useState('cocktail')
  var [itemFormat, setItemFormat] = useState('mini')
  var [eventHour, setEventHour] = useState('')

  var [variants, setVariants] = useState([{ key: 'formule', label: 'Formule', description: '', lines: [] }])
  var [activeIdx, setActiveIdx] = useState(0)

  var [livraison, setLivraison] = useState(30)
  var [livraisonOffert, setLivraisonOffert] = useState(false)
  var [miseEnPlace, setMiseEnPlace] = useState(0)
  var [miseEnPlaceOffert, setMiseEnPlaceOffert] = useState(false)
  var [remiseGlobalePct, setRemiseGlobalePct] = useState(0)

  var [notes, setNotes] = useState('')
  var [notesInternes, setNotesInternes] = useState('')

  var [activeCategory, setActiveCategory] = useState('box_mini')
  var [showInternes, setShowInternes] = useState(true)
  var [ctxOpen, setCtxOpen] = useState(true)

  var [sendOpen, setSendOpen] = useState(false)
  var [sending, setSending] = useState(false)
  var [sendError, setSendError] = useState('')
  var [emailTo, setEmailTo] = useState('')
  var [emailCc, setEmailCc] = useState('')
  var [emailSubject, setEmailSubject] = useState('')
  var [emailMessage, setEmailMessage] = useState('')

  var [delOpen, setDelOpen] = useState(false)
  var [deleting, setDeleting] = useState(false)
  var [delError, setDelError] = useState('')

  // ---- Chargement du catalogue ----
  useEffect(function() {
    if (!supabase) { setLoading(false); return }
    var run = async function() {
      try {
        var res = await supabase
          .from('catering_offerings')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        if (res.error) setError(res.error.message || 'Erreur chargement catalogue')
        else setOfferings(res.data || [])
      } catch (e) {
        setError(e && e.message ? e.message : 'Erreur chargement catalogue')
      }
      setLoading(false)
    }
    run()
  }, [supabase])

  // ---- Chargement du devis ----
  useEffect(function() {
    if (!devisId) {
      setNumero(genNumero())
      setValidite(addDaysIso(30))
      return
    }
    if (!supabase) return
    var run = async function() {
      try {
        var res = await supabase.from('devis').select('*').eq('id', devisId).single()
        if (res.data) {
          var d = res.data
          setNumero(d.numero || genNumero())
          setStatut(normalizeStatus(d))
          setValidite(d.date_validite || addDaysIso(30))
          setClientSelector(d.prospect_id ? String(d.prospect_id) : '')
          setClientNom(d.client_nom || '')
          setClientContact(d.client_contact || '')
          setClientEmail(d.client_email || '')
          setClientPhone(d.client_phone || '')
          setEventDate(d.event_date || '')
          setEventLieu(d.event_lieu || '')
          setNbPersonnes(Number(d.nb_personnes) || 40)
          setEventFormat(d.event_format || d.format || 'cocktail')
          setItemFormat(d.item_format || 'mini')
          setEventHour(d.event_hour || '')
          setLivraison(d.livraison != null ? Number(d.livraison) : 30)
          setLivraisonOffert(!!d.livraison_offert)
          setMiseEnPlace(Number(d.mise_en_place) || 0)
          setMiseEnPlaceOffert(!!d.mise_en_place_offert)
          setRemiseGlobalePct(Number(d.remise_total_pct) || 0)
          setNotes(d.notes || '')
          setNotesInternes(d.notes_internes || '')
          setVariants(parseVariants(d))
          setActiveIdx(0)
        }
      } catch (e) {
        setError('Erreur de chargement du devis')
      }
    }
    run()
  }, [supabase, devisId])

  var offeringsById = useMemo(function() {
    return buildOfferingMap(offerings)
  }, [offerings])

  var activeVariant = variants[activeIdx] || { lines: [] }

  var totals = useMemo(function() {
    var fr = {
      livraison: livraison, livraison_offert: livraisonOffert,
      mise_en_place: miseEnPlace, mise_en_place_offert: miseEnPlaceOffert,
      remise_globale_pct: remiseGlobalePct
    }
    var v = variants[activeIdx] || { lines: [] }
    return computeVariant(v, offeringsById, fr, nbPersonnes)
  }, [variants, activeIdx, offeringsById, livraison, livraisonOffert, miseEnPlace, miseEnPlaceOffert, remiseGlobalePct, nbPersonnes])

  var coverage = useMemo(function() {
    return computeCoverage(totals.lines, nbPersonnes, eventFormat, itemFormat)
  }, [totals, nbPersonnes, eventFormat, itemFormat])

  var variantInfos = useMemo(function() {
    var fr = {
      livraison: livraison, livraison_offert: livraisonOffert,
      mise_en_place: miseEnPlace, mise_en_place_offert: miseEnPlaceOffert,
      remise_globale_pct: remiseGlobalePct
    }
    return variants.map(function(v) {
      var t = computeVariant(v, offeringsById, fr, nbPersonnes)
      return { ttc: t.total_ttc, pp: t.per_pers_ttc }
    })
  }, [variants, offeringsById, livraison, livraisonOffert, miseEnPlace, miseEnPlaceOffert, remiseGlobalePct, nbPersonnes])

  var grouped = useMemo(function() {
    var order = []
    var map = {}
    offerings.forEach(function(o) {
      if (o.category !== activeCategory) return
      var sub = o.subcategory || 'autre'
      if (!map[sub]) { map[sub] = []; order.push(sub) }
      map[sub].push(o)
    })
    return { order: order, map: map }
  }, [offerings, activeCategory])

  // ---- Mutations formules ----
  var setActiveLines = function(newLines) {
    setVariants(function(prev) {
      var c = prev.slice()
      c[activeIdx] = Object.assign({}, c[activeIdx], { lines: newLines })
      return c
    })
  }

  var addItem = function(offeringId) {
    var lines = (activeVariant.lines || []).slice()
    var found = -1
    var i
    for (i = 0; i < lines.length; i++) {
      if (lines[i].offering_id === offeringId) { found = i; break }
    }
    if (found > -1) {
      lines[found] = Object.assign({}, lines[found], { qty: (Number(lines[found].qty) || 0) + 1 })
    } else {
      lines.push({ offering_id: offeringId, qty: 1, remise_pct: 0 })
    }
    setActiveLines(lines)
  }

  var updateQty = function(idx, q) {
    var lines = (activeVariant.lines || []).slice()
    if (!lines[idx]) return
    var nq = Number(q)
    if (isNaN(nq) || nq < 0) nq = 0
    lines[idx] = Object.assign({}, lines[idx], { qty: nq })
    setActiveLines(lines)
  }

  var stepQty = function(idx, delta) {
    var lines = activeVariant.lines || []
    if (!lines[idx]) return
    updateQty(idx, (Number(lines[idx].qty) || 0) + delta)
  }

  var removeLine = function(idx) {
    var lines = (activeVariant.lines || []).slice()
    lines.splice(idx, 1)
    setActiveLines(lines)
  }

  var addVariant = function() {
    setVariants(function(prev) {
      var c = prev.slice()
      c.push({ key: 'formule_' + (c.length + 1), label: 'Formule ' + (c.length + 1), description: '', lines: [] })
      return c
    })
    setActiveIdx(variants.length)
  }

  var removeVariant = function(i) {
    if (variants.length <= 1) return
    setVariants(function(prev) {
      var c = prev.slice()
      c.splice(i, 1)
      return c
    })
    setActiveIdx(0)
  }

  var pickProspect = function(id) {
    setClientSelector(id)
    if (!id) return
    var p = null
    var k
    for (k = 0; k < prospects.length; k++) {
      if (String(prospects[k].id) === String(id)) { p = prospects[k]; break }
    }
    if (!p) return
    setClientNom(p.name || p.company_name || '')
    setClientContact(p.contact_name || p.contact || '')
    setClientEmail(p.email || '')
    setClientPhone(p.phone || '')
  }

  // ---- Construction du payload PDF pour une formule ----
  var makePayload = function(idx) {
    var fr = {
      livraison: livraison, livraison_offert: livraisonOffert,
      mise_en_place: miseEnPlace, mise_en_place_offert: miseEnPlaceOffert,
      remise_globale_pct: remiseGlobalePct
    }
    var v = variants[idx] || { lines: [] }
    var t = computeVariant(v, offeringsById, fr, nbPersonnes)
    var cov = computeCoverage(t.lines, nbPersonnes, eventFormat, itemFormat)
    return {
      numero: numero,
      validite: validite,
      client: { nom: clientNom, contact: clientContact, email: clientEmail, phone: clientPhone },
      event: { date: eventDate, lieu: eventLieu, format: eventFormat, nbPersonnes: nbPersonnes },
      lines: t.lines,
      totals: t,
      coverage: cov,
      formuleLabel: variantLabel(v, idx),
      frais: {
        livraison: livraison, livraison_offert: livraisonOffert,
        mise_en_place: miseEnPlace, mise_en_place_offert: miseEnPlaceOffert
      },
      offeringMap: offeringsById,
      notes: notes
    }
  }

  var variantLabel = function(v, i) {
    if (v && v.label) return v.label
    if (v && v.key && DEFAULT_VARIANT_LABELS[v.key]) return DEFAULT_VARIANT_LABELS[v.key]
    return 'Formule ' + (i + 1)
  }

  var recommendedIdx = function() {
    var i
    for (i = 0; i < variants.length; i++) {
      if (variants[i] && variants[i].key === 'signature') return i
    }
    return activeIdx
  }

  // ---- Aperçu PDF ----
  var handlePreview = function() {
    var html = buildDevisHtml(makePayload(activeIdx), { stampUrl: STAMP_PINK, logotypeUrl: LOGO_PINK })
    var w = window.open('', '_blank')
    if (w) { w.document.open(); w.document.write(html); w.document.close() }
  }

  // ---- Aperçu client : la vraie page de choix (3 formules) que verra le client ----
  var handlePreviewClient = function() {
    if (!clientNom.trim()) { setError('Renseigne le nom du client avant l\'aperçu.'); return }
    var w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write('<!doctype html><meta charset="utf-8"><title>Aperçu client…</title><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#191923;font-weight:700">Préparation de l\'aperçu client…</body>')
      w.document.close()
    }
    persist(function(saved) {
      var id = (saved && saved.id) ? saved.id : curId
      if (!id) { if (w) w.close(); return }
      var url = '/api/catering/choose/' + id
      if (w) { w.location.href = url } else { window.open(url, '_blank') }
    })
  }

  // ---- Sauvegarde ----
  var buildSavePayload = function() {
    var fr = {
      livraison: livraison, livraison_offert: livraisonOffert,
      mise_en_place: miseEnPlace, mise_en_place_offert: miseEnPlaceOffert,
      remise_globale_pct: remiseGlobalePct
    }
    var recIdx = recommendedIdx()
    var recTotals = computeVariant(variants[recIdx] || { lines: [] }, offeringsById, fr, nbPersonnes)
    var variantsStore = variants.map(function(v, i) {
      var t = computeVariant(v, offeringsById, fr, nbPersonnes)
      return {
        key: v.key || ('formule_' + (i + 1)),
        label: variantLabel(v, i),
        description: v.description || '',
        lines: v.lines || [],
        totals: {
          total_ht: t.total_ht, total_tva: t.tva, total_ttc: t.total_ttc,
          per_personne_ht: t.per_pers_ht, per_personne_ttc: t.per_pers_ttc,
          marge_ht: t.marge_ht, fc_total: t.fc_total, coeff: t.coeff
        }
      }
    })
    var responsablePrenom = 'Edward'
    if (profile && (profile.full_name === 'Emy' || profile.role === 'emy')) responsablePrenom = 'Emy'
    return {
      numero: numero,
      statut: statut,
      date_validite: validite || null,
      prospect_id: clientSelector || null,
      client_nom: clientNom || '',
      client_contact: clientContact || '',
      client_email: clientEmail || '',
      client_phone: clientPhone || '',
      event_date: eventDate || null,
      event_lieu: eventLieu || '',
      nb_personnes: Number(nbPersonnes) || 0,
      format: eventFormat,
      event_format: eventFormat,
      item_format: itemFormat,
      event_hour: eventHour || '',
      items: (variants[recIdx] && variants[recIdx].lines) || [],
      variants: variantsStore,
      livraison: Number(livraison) || 0,
      livraison_offert: !!livraisonOffert,
      mise_en_place: Number(miseEnPlace) || 0,
      mise_en_place_offert: !!miseEnPlaceOffert,
      remise_total_pct: Number(remiseGlobalePct) || 0,
      total_ht: recTotals.total_ht,
      tva: recTotals.tva,
      total_ttc: recTotals.total_ttc,
      total_marge_ht: recTotals.marge_ht,
      total_fc_ht: recTotals.fc_total,
      notes: notes || '',
      notes_internes: notesInternes || '',
      responsable_email: (profile && profile.email) || '',
      responsable_prenom: responsablePrenom
    }
  }

  // Persiste sans fermer l'éditeur. cb(savedRow)
  var persist = function(cb) {
    if (!supabase) { if (cb) cb(null); return }
    if (!clientNom.trim()) { setError('Renseigne le nom du client avant de sauvegarder.'); if (cb) cb(null); return }
    setSaving(true)
    setError('')
    var payload = buildSavePayload()
    var run = async function() {
      try {
        var res
        if (curId) {
          res = await supabase.from('devis').update(payload).eq('id', curId).select().single()
        } else {
          res = await supabase.from('devis').insert([payload]).select().single()
        }
        setSaving(false)
        if (res.error) { setError('Sauvegarde : ' + res.error.message); if (cb) cb(null); return }
        if (res.data && res.data.id) setCurId(res.data.id)
        if (cb) cb(res.data)
      } catch (e) {
        setSaving(false)
        setError(e && e.message ? e.message : 'Erreur de sauvegarde')
        if (cb) cb(null)
      }
    }
    run()
  }

  var handleSave = function() {
    persist(function(saved) {
      if (saved) toast('Devis enregistré ✓')
    })
  }

  // ---- Envoi ----
  var handleOpenSend = function() {
    persist(function(saved) {
      if (!saved) return
      setEmailTo(clientEmail || '')
      setEmailCc('')
      setEmailSubject('Votre devis Meshuga Events — ' + numero)
      var contactFirst = (clientContact || '').split(' ')[0]
      var hello = contactFirst ? ('Bonjour ' + contactFirst + ',') : 'Bonjour,'
      setEmailMessage(
        hello + '\n\n' +
        'Suite à notre échange, voici votre devis pour ' + (nbPersonnes) + ' personnes.\n' +
        'Vous pouvez le consulter et l\'enregistrer via le lien ci-dessous.\n\n' +
        'À très vite,\nL\'équipe Meshuga Events'
      )
      setSendError('')
      setSendOpen(true)
    })
  }

  var handleSend = function() {
    if (!curId) { setSendError('Sauvegarde le devis avant l\'envoi.'); return }
    setSending(true)
    setSendError('')
    var pdfHtml = buildDevisHtml(makePayload(activeIdx), { stampUrl: STAMP_PINK, logotypeUrl: LOGO_PINK })
    var body = {
      devisId: String(curId),
      to: emailTo,
      cc: emailCc,
      subject: emailSubject,
      message: emailMessage,
      pdfHtml: pdfHtml
    }
    fetch('/api/catering/send-devis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function(r) { return r.json() })
      .then(function(data) {
        setSending(false)
        if (!data.ok) { setSendError(data.error || 'Erreur d\'envoi'); return }
        setStatut('envoye')
        setSendOpen(false)
        toast('Devis envoyé ✓')
      }, function(err) {
        setSending(false)
        setSendError('Réseau : ' + (err && err.message ? err.message : 'inconnu'))
      })
  }

  // ---- Suppression ----
  var confirmDelete = function() {
    if (!curId) { onClose(); return }
    setDeleting(true)
    setDelError('')
    var run = async function() {
      try {
        await supabase.from('devis_historique').delete().eq('devis_id', curId)
        await supabase.from('devis_documents').delete().eq('devis_id', curId)
        await supabase.from('devis').delete().eq('parent_devis_id', curId)
        var res = await supabase.from('devis').delete().eq('id', curId)
        if (res && res.error) { setDelError(res.error.message || 'Suppression impossible'); setDeleting(false); return }
        setDeleting(false)
        setDelOpen(false)
        toast('Devis supprimé')
        onSaved()
      } catch (e) {
        setDelError(e && e.message ? e.message : 'Suppression impossible')
        setDeleting(false)
      }
    }
    run()
  }

  // ---- Rendu ----
  var statutColors = statusColor(statut)
  var covPct = coverage.recommended > 0 ? Math.min(100, Math.round((coverage.current / coverage.recommended) * 100)) : 0
  var covColor = coverage.covered ? '#1D9E75' : '#EF9F27'
  var canSend = (activeVariant.lines && activeVariant.lines.length > 0) && !!clientNom.trim()

  // Agrégat des minis par recette (récap clair pour le client)
  var aggregateMinis = function(lines) {
    var acc = {}
    var order = []
    ;(lines || []).forEach(function(l) {
      var o = offeringsById[l.offering_id]
      if (!o) return
      var qy = Number(l.qty) || 0
      if (qy <= 0) return
      if (o.category === 'box_mini' && o.composition) {
        var segs = String(o.composition).split(/\s*·\s*/)
        segs.forEach(function(seg) {
          var m = seg.match(/^(\d+)\s+(.+)$/)
          if (!m) return
          var nm = m[2].trim()
          if (acc[nm] == null) { acc[nm] = 0; order.push(nm) }
          acc[nm] += parseInt(m[1], 10) * qy
        })
      } else if (o.category === 'live_mini') {
        var nm2 = o.name
        if (acc[nm2] == null) { acc[nm2] = 0; order.push(nm2) }
        acc[nm2] += qy
      }
    })
    return order.map(function(nm) { return { name: nm, count: acc[nm] } })
  }
  var miniAgg = aggregateMinis(activeVariant.lines || [])
  var minisPerPers = nbPersonnes > 0 ? (coverage.current / nbPersonnes) : 0

  // Ordre d'affichage des formules : prix/pers croissant (Essentiel → Signature → Excellence)
  var tabOrder = variants.map(function(v, i) { return i })
  tabOrder.sort(function(a, b) {
    var pa = variantInfos[a] ? variantInfos[a].pp : 0
    var pb = variantInfos[b] ? variantInfos[b].pp : 0
    return pa - pb
  })

  return (
    <div className="qe-root">
      <style>{QE_CSS}</style>

      <div className="qe-header">
        <div>
          <div className="qe-num">{numero || 'Nouveau devis'}</div>
          <div className="qe-num-sub">{curId ? 'Édition' : 'Création'}</div>
          <span className="qe-status-pill" style={{ background: statutColors.bg, color: statutColors.fg }}>
            {statusLabel(statut)}
          </span>
        </div>
        <div className="qe-actions">
          <button className="qe-btn" onClick={onClose}>← Retour</button>
          <button className="qe-btn y" onClick={handleSave} disabled={saving}>
            {saving ? '⏳…' : '💾 Sauver'}
          </button>
          {curId ? (
            <button className="qe-btn r" onClick={function() { setDelError(''); setDelOpen(true) }}>🗑 Supprimer</button>
          ) : null}
        </div>
      </div>

      {error ? <div className="qe-error">⚠ {error}</div> : null}

      {/* Contexte client + événement (repliable) */}
      <div className="qe-card">
        <div className="qe-ctx">
          <div style={{ flex: 1, minWidth: 0 }}>
            {ctxOpen ? (
              <span style={{ fontFamily: 'Yellowtail,cursive', fontSize: 18 }}>Client &amp; événement</span>
            ) : (
              <span>
                <b>{clientNom || 'Client à renseigner'}</b> · {nbPersonnes} pers · {eventDate || 'date ?'}
                {eventLieu ? ' · ' + eventLieu : ''}
              </span>
            )}
          </div>
          <button className="qe-btn" onClick={function() { setCtxOpen(!ctxOpen) }}>
            {ctxOpen ? 'Replier' : 'Modifier'}
          </button>
        </div>

        {ctxOpen ? (
          <div style={{ marginTop: 10 }}>
            <div className="qe-fg">
              <label className="qe-lbl">Prospect existant (optionnel)</label>
              <select className="qe-inp" value={clientSelector} onChange={function(e) { pickProspect(e.target.value) }}>
                <option value="">— Nouveau client —</option>
                {prospects.map(function(p) {
                  return <option key={p.id} value={String(p.id)}>{p.name || p.company_name || p.id}</option>
                })}
              </select>
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Entreprise / Client *</label>
              <input className="qe-inp" value={clientNom} onChange={function(e) { setClientNom(e.target.value) }} placeholder="Nom du client" />
            </div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Contact</label>
                <input className="qe-inp" value={clientContact} onChange={function(e) { setClientContact(e.target.value) }} placeholder="Prénom Nom" />
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Email</label>
                <input className="qe-inp" value={clientEmail} onChange={function(e) { setClientEmail(e.target.value) }} placeholder="contact@..." />
              </div>
            </div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Téléphone</label>
                <input className="qe-inp" value={clientPhone} onChange={function(e) { setClientPhone(e.target.value) }} placeholder="06 ..." />
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Lieu</label>
                <input className="qe-inp" value={eventLieu} onChange={function(e) { setEventLieu(e.target.value) }} placeholder="Adresse" />
              </div>
            </div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Date</label>
                <input type="date" className="qe-inp" value={eventDate} onChange={function(e) { setEventDate(e.target.value) }} />
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Validité du devis</label>
                <input type="date" className="qe-inp" value={validite} onChange={function(e) { setValidite(e.target.value) }} />
              </div>
            </div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Format</label>
                <select className="qe-inp" value={eventFormat} onChange={function(e) { setEventFormat(e.target.value) }}>
                  {EVENT_FORMATS.map(function(f) {
                    return <option key={f.id} value={f.id}>{f.label}</option>
                  })}
                </select>
              </div>
              {eventFormat === 'petit_dej' ? (
                <div className="qe-fg">
                  <label className="qe-lbl">Format items</label>
                  <select className="qe-inp" value={itemFormat} onChange={function(e) { setItemFormat(e.target.value) }}>
                    <option value="standard">Standard (1 sandwich/pers)</option>
                    <option value="mini">Mini (2-3 minis/pers)</option>
                  </select>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Participants + couverture */}
      <div className="qe-card">
        <div className="qe-cov-wrap">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="qe-lbl" style={{ margin: 0 }}>Participants</span>
            <input
              type="number"
              min="1"
              className="qe-inp"
              style={{ width: 70 }}
              value={nbPersonnes}
              onChange={function(e) { setNbPersonnes(parseInt(e.target.value, 10) || 1) }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span className="qe-lbl" style={{ margin: 0 }}>Couverture</span>
              <span style={{ fontSize: 12, fontWeight: 900 }}>{coverage.current} / {coverage.recommended}</span>
            </div>
            <div className="qe-cov-bar-out">
              <div className="qe-cov-bar-in" style={{ width: covPct + '%', background: covColor }}></div>
            </div>
            <div className="qe-cov-hint" style={{ color: covColor }}>{coverage.label}</div>
          </div>
        </div>
      </div>

      {/* Onglets de formules */}
      <div className="qe-tabs-f">
        {tabOrder.map(function(i) {
          var v = variants[i]
          var info = variantInfos[i] || { pp: 0 }
          var isReco = v.key === 'signature'
          return (
            <div
              key={i}
              className={'qe-tab-f' + (i === activeIdx ? ' on' : '')}
              onClick={function() { setActiveIdx(i) }}
            >
              {isReco ? <span className="qe-tab-reco">RECO</span> : null}
              <div className="t">{variantLabel(v, i)}</div>
              <div className="s">{fmtEur(info.pp)} / pers</div>
              {variants.length > 1 ? (
                <span
                  style={{ position: 'absolute', top: 4, left: 6, fontSize: 11, color: i === activeIdx ? '#fff' : '#bbb', cursor: 'pointer' }}
                  onClick={function(e) { e.stopPropagation(); removeVariant(i) }}
                  title="Retirer cette formule"
                >
                  ✕
                </span>
              ) : null}
            </div>
          )
        })}
        {variants.length < 3 ? (
          <button className="qe-tab-add" onClick={addVariant}>+ Formule</button>
        ) : null}
      </div>

      <div className="qe-grid">
        {/* COLONNE GAUCHE — composition */}
        <div>
          <div className="qe-card">
            <div className="qe-card-title">Catalogue</div>
            <div className="qe-catchips">
              {CATEGORY_TABS.map(function(t) {
                var count = offerings.filter(function(o) { return o.category === t.id }).length
                return (
                  <button
                    key={t.id}
                    className={'qe-catchip' + (activeCategory === t.id ? ' on' : '')}
                    onClick={function() { setActiveCategory(t.id) }}
                  >
                    {t.emoji} {t.label} ({count})
                  </button>
                )
              })}
            </div>
            {grouped.order.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', opacity: 0.4, fontSize: 12 }}>Aucun item dans cette catégorie.</div>
            ) : null}
            {grouped.order.map(function(sub) {
              return (
                <div key={sub}>
                  <div className="qe-subgroup-title">{SUBCAT_LABELS[sub] || sub}</div>
                  <div className="qe-picks">
                    {grouped.map[sub].map(function(o) {
                      return (
                        <div key={o.id} className="qe-pick" onClick={function() { addItem(o.id) }}>
                          <div className="qe-pick-top">
                            <span className="qe-pick-name">{o.name}</span>
                            <span className="qe-pick-pv">{fmtEur(Number(o.pv_ht) || 0)}</span>
                          </div>
                          {o.composition ? <div className="qe-pick-comp">{o.composition}</div> : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="qe-card">
            <div className="qe-card-title">Composition · {variantLabel(activeVariant, activeIdx)}</div>
            {(!activeVariant.lines || activeVariant.lines.length === 0) ? (
              <div style={{ padding: 12, textAlign: 'center', opacity: 0.5, fontSize: 12 }}>
                Clique un item du catalogue pour l&apos;ajouter à cette formule.
              </div>
            ) : null}
            {(activeVariant.lines || []).map(function(l, idx) {
              var o = offeringsById[l.offering_id]
              var name = o ? o.name : l.offering_id
              var pv = o ? (Number(o.pv_ht) || 0) : 0
              var lineTot = pv * (Number(l.qty) || 0) * (1 - (Number(l.remise_pct) || 0) / 100)
              return (
                <div key={idx} className="qe-line">
                  <div className="qe-line-top">
                    <span className="qe-line-name">{name}</span>
                    <span className="qe-q">
                      <b onClick={function() { stepQty(idx, -1) }}>−</b>
                      <span>{l.qty}</span>
                      <b onClick={function() { stepQty(idx, 1) }}>+</b>
                    </span>
                    <span className="qe-line-tot">{fmtEur(lineTot)}</span>
                    <button className="qe-rm" title="Retirer" onClick={function() { removeLine(idx) }}>✕</button>
                  </div>
                  {o && o.composition ? <div className="qe-line-comp">{o.composition}</div> : null}
                </div>
              )
            })}
            {(activeVariant.lines && activeVariant.lines.length > 0) ? (
              <div className="qe-recap">
                {miniAgg.length > 0 ? (
                  <div className="qe-recap-minis">
                    <div className="qe-recap-h">Total des minis · ce que reçoit le client</div>
                    <div className="qe-recap-list">
                      {miniAgg.map(function(mi, k) {
                        return <span key={k} className="qe-recap-chip"><b>{mi.count}</b> {mi.name}</span>
                      })}
                    </div>
                  </div>
                ) : null}
                <div className="qe-recap-tot">
                  <span><b>{coverage.current}</b> minis · <b>{minisPerPers.toFixed(1).replace('.', ',')}</b> / pers</span>
                  <span><b>{fmtEur(totals.per_pers_ttc)}</b> TTC / pers</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="qe-card">
            <div className="qe-card-title">Frais &amp; remise</div>
            <div className="qe-fg2">
              <div className="qe-fg">
                <label className="qe-lbl">Livraison HT</label>
                <input
                  type="number" min="0" className="qe-inp" value={livraison} disabled={livraisonOffert}
                  onChange={function(e) { setLivraison(parseFloat(e.target.value) || 0) }}
                />
                <label className="qe-check">
                  <input type="checkbox" checked={livraisonOffert} onChange={function(e) { setLivraisonOffert(e.target.checked) }} /> Offrir
                </label>
              </div>
              <div className="qe-fg">
                <label className="qe-lbl">Mise en place HT</label>
                <input
                  type="number" min="0" className="qe-inp" value={miseEnPlace} disabled={miseEnPlaceOffert}
                  onChange={function(e) { setMiseEnPlace(parseFloat(e.target.value) || 0) }}
                />
                <label className="qe-check">
                  <input type="checkbox" checked={miseEnPlaceOffert} onChange={function(e) { setMiseEnPlaceOffert(e.target.checked) }} /> Offrir
                </label>
              </div>
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Réduction globale (%)</label>
              <input
                type="number" min="0" max="100" step="0.5" className="qe-inp" style={{ width: 110 }}
                value={remiseGlobalePct}
                onChange={function(e) { setRemiseGlobalePct(parseFloat(e.target.value) || 0) }}
              />
            </div>
          </div>

          <div className="qe-card">
            <div className="qe-card-title">Notes</div>
            <div className="qe-fg">
              <label className="qe-lbl">Notes client (sur le devis)</label>
              <textarea className="qe-inp qe-textarea" value={notes} onChange={function(e) { setNotes(e.target.value) }} placeholder="Conditions spéciales, remarques..." />
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Notes internes (Edward + Emy)</label>
              <textarea className="qe-inp qe-textarea" style={{ background: '#FFFDE7' }} value={notesInternes} onChange={function(e) { setNotesInternes(e.target.value) }} placeholder="Pense-bête, briefing équipe..." />
            </div>
          </div>
        </div>

        {/* COLONNE DROITE — récap */}
        <div>
          <div className="qe-card">
            <div className="qe-card-title">Récapitulatif · {variantLabel(activeVariant, activeIdx)}</div>
            <div className="qe-rrow"><span>Sous-total items HT</span><strong>{fmtEur(totals.sous_total_items_ht)}</strong></div>
            {totals.remise_globale_montant > 0 ? (
              <div className="qe-rrow" style={{ color: '#CC0066' }}>
                <span>Remise ({totals.remise_globale_pct}%)</span><strong>−{fmtEur(totals.remise_globale_montant)}</strong>
              </div>
            ) : null}
            <div className="qe-rrow gray"><span>{livraisonOffert ? '↪ Livraison offerte' : 'Livraison HT'}</span><span>{fmtEur(totals.livraison_eff)}</span></div>
            {(miseEnPlace > 0 || miseEnPlaceOffert) ? (
              <div className="qe-rrow gray"><span>{miseEnPlaceOffert ? '↪ Mise en place offerte' : 'Mise en place HT'}</span><span>{fmtEur(totals.mise_en_place_eff)}</span></div>
            ) : null}
            <div className="qe-rrow" style={{ borderTop: '1px solid #eee', marginTop: 2, paddingTop: 5 }}><span><strong>Total HT</strong></span><strong>{fmtEur(totals.total_ht)}</strong></div>
            <div className="qe-rrow gray"><span>TVA (10/20%)</span><span>{fmtEur(totals.tva)}</span></div>
            <div className="qe-final">
              <div>
                <div className="l">TOTAL TTC</div>
                {nbPersonnes > 0 ? <div style={{ fontSize: 10, opacity: 0.8 }}>soit {fmtEur(totals.per_pers_ttc)} / pers</div> : null}
              </div>
              <span className="a">{fmtEur(totals.total_ttc)}</span>
            </div>

            {showInternes ? (
              <div className="qe-int">
                <div className="qe-int-title">🔒 Interne (toi seul)</div>
                <div className="qe-rrow"><span style={{ color: '#7a7a82' }}>Food cost HT</span><strong>{fmtEur(totals.fc_total)}</strong></div>
                <div className="qe-rrow"><span style={{ color: '#7a7a82' }}>Marge HT</span><strong>{fmtEur(totals.marge_ht)}</strong></div>
                <div className="qe-rrow"><span style={{ color: '#7a7a82' }}>Coefficient</span><strong style={{ color: coeffColor(totals.coeff) }}>{totals.coeff.toFixed(2).replace('.', ',')}</strong></div>
                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 5 }}>Cible : 4,2+ (vert) · 3,5–4,2 (ambre) · &lt; 3,5 (rose)</div>
                <button className="qe-btn" style={{ marginTop: 7, fontSize: 10, padding: '5px 9px', boxShadow: 'none' }} onClick={function() { setShowInternes(false) }}>Masquer</button>
              </div>
            ) : (
              <button className="qe-btn" style={{ width: '100%', marginTop: 10 }} onClick={function() { setShowInternes(true) }}>🔒 Afficher les internes</button>
            )}

            <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <button className="qe-btn y" style={{ flex: '1 1 100%', justifyContent: 'center' }} onClick={handleSave} disabled={saving}>
                {saving ? '⏳ Enregistrement…' : '💾 Sauvegarder'}
              </button>
              <button className="qe-btn p" style={{ flex: '1 1 100%', justifyContent: 'center' }} onClick={handlePreviewClient} disabled={!canSend} title={!canSend ? 'Ajoute des items + nom du client' : 'Voir la page client (les 3 formules)'}>👁 Aperçu client (3 formules)</button>
              <button className="qe-btn" style={{ flex: 1 }} onClick={handlePreview} disabled={!canSend} title={!canSend ? 'Ajoute des items + nom du client' : 'Aperçu PDF de la formule active'}>📄 PDF</button>
              <button className="qe-btn g" style={{ flex: 1 }} onClick={handleOpenSend} disabled={!canSend} title={!canSend ? 'Ajoute des items + nom du client' : 'Envoyer'}>📤 Envoyer</button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal envoi */}
      {sendOpen ? (
        <div className="qe-ov" onClick={function() { if (!sending) setSendOpen(false) }}>
          <div className="qe-modal" onClick={function(e) { e.stopPropagation() }}>
            <h3>Envoyer le devis</h3>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
              {numero} → {clientNom || 'Client'} · formule {variantLabel(activeVariant, activeIdx)}.<br />
              events@meshuga.fr est mis en copie cachée pour archive.
            </div>
            {sendError ? <div className="qe-warn">⚠ {sendError}</div> : null}
            <div className="qe-fg">
              <label className="qe-lbl">Destinataire *</label>
              <input type="email" className="qe-inp" value={emailTo} onChange={function(e) { setEmailTo(e.target.value) }} placeholder="client@exemple.fr" disabled={sending} />
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Copie (CC)</label>
              <input type="email" className="qe-inp" value={emailCc} onChange={function(e) { setEmailCc(e.target.value) }} placeholder="optionnel" disabled={sending} />
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Sujet *</label>
              <input type="text" className="qe-inp" value={emailSubject} onChange={function(e) { setEmailSubject(e.target.value) }} disabled={sending} />
            </div>
            <div className="qe-fg">
              <label className="qe-lbl">Message</label>
              <textarea className="qe-inp qe-textarea" style={{ minHeight: 130 }} value={emailMessage} onChange={function(e) { setEmailMessage(e.target.value) }} disabled={sending} />
            </div>
            <div className="qe-modal-actions">
              <button className="qe-btn" onClick={function() { if (!sending) setSendOpen(false) }} disabled={sending}>Annuler</button>
              <button className="qe-btn g" onClick={handleSend} disabled={sending || !emailTo.trim() || !emailSubject.trim()}>
                {sending ? '⏳ Envoi…' : '📤 Envoyer maintenant'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal suppression */}
      {delOpen ? (
        <div className="qe-ov" onClick={function() { if (!deleting) setDelOpen(false) }}>
          <div className="qe-modal" onClick={function(e) { e.stopPropagation() }}>
            <h3>Supprimer ce devis ?</h3>
            <p style={{ fontSize: 13, lineHeight: 1.5 }}>
              Suppression définitive de <strong>{numero}</strong>
              {clientNom ? ' — ' + clientNom : ''}. Cette action est irréversible.
            </p>
            {statut === 'facture' || statut === 'solde' ? (
              <div className="qe-warn">⚠ Ce devis est facturé : conservation conseillée pour la comptabilité.</div>
            ) : null}
            {delError ? <div className="qe-warn">⚠ {delError}</div> : null}
            <div className="qe-modal-actions">
              <button className="qe-btn" onClick={function() { if (!deleting) setDelOpen(false) }} disabled={deleting}>Annuler</button>
              <button className="qe-btn r" style={{ background: '#CC0066', color: '#fff' }} onClick={confirmDelete} disabled={deleting}>
                {deleting ? '⏳ Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? <div style={{ padding: 20, textAlign: 'center', opacity: 0.5 }}>Chargement…</div> : null}
    </div>
  )
}
