'use client'

import React, { useState, useEffect, useMemo } from 'react'

// ============================================================
// QuotesTab.tsx — Phase 2 du Dashboard B2B Catering Meshuga
// Liste des devis catering, stats, filtres, bouton "Nouveau devis"
// Architecture: src/app/dashboard/catering/QuotesTab.tsx
// Marges/coeffs internes uniquement (Edward + Emy)
// Mobile-first + desktop responsive
// ============================================================

// ---------- CONFIG (en dehors du composant pour SWC) ----------
var STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  signe: 'Signé',
  acompte: 'Acompte',
  facture: 'Facturé',
  acquitte: 'Acquitté',
  perdu: 'Perdu'
}

var STATUS_COLORS = {
  brouillon: { bg: '#EBEBEB', fg: '#191923' },
  envoye: { bg: '#FFEB5A', fg: '#191923' },
  signe: { bg: '#FF82D7', fg: '#191923' },
  acompte: { bg: '#005FFF', fg: '#FFFFFF' },
  facture: { bg: '#009D3A', fg: '#FFFFFF' },
  acquitte: { bg: '#191923', fg: '#FFEB5A' },
  perdu: { bg: '#CC0066', fg: '#FFFFFF' }
}

// ---------- HELPERS PURS (pas de JSX) ----------
var fmtEur = function(n) {
  var v = Number(n) || 0
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

var fmtDate = function(s) {
  if (!s) return '—'
  try {
    var d = new Date(s)
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
  } catch (e) {
    return '—'
  }
}

var pickStatus = function(d) {
  if (d.status) return d.status
  if (d.facture_url) return 'facture'
  if (d.signed_at) return 'signe'
  if (d.sent_at) return 'envoye'
  return 'brouillon'
}

var withinPeriod = function(d, period) {
  if (period === 'all') return true
  var ref = d.created_at || d.event_date
  if (!ref) return true
  var t = new Date(ref).getTime()
  var now = Date.now()
  if (period === '7j') return now - t < 7 * 86400000
  if (period === '30j') return now - t < 30 * 86400000
  if (period === '3m') return now - t < 90 * 86400000
  if (period === 'year') return new Date(ref).getFullYear() === new Date().getFullYear()
  return true
}

var countVariants = function(d) {
  if (!d.variants) return 0
  try {
    var v = typeof d.variants === 'string' ? JSON.parse(d.variants) : d.variants
    if (Array.isArray(v)) return v.length
  } catch (e) {
    return 0
  }
  return 0
}

// ---------- STYLES (scope qt-) ----------
var QT_CSS =
  '.qt-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px}' +
  '@media(min-width:720px){.qt-stats{grid-template-columns:repeat(4,1fr)}}' +
  '.qt-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;align-items:center}' +
  '.qt-chip{padding:6px 10px;border-radius:14px;border:2px solid #191923;background:#FFFFFF;font-family:Arial Narrow,Arial,sans-serif;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;cursor:pointer;color:#191923;white-space:nowrap;transition:all .1s}' +
  '.qt-chip:active{transform:translate(1px,1px)}' +
  '.qt-chip.on{background:#FF82D7}' +
  '.qt-search{flex:1;min-width:160px;padding:7px 10px;border-radius:4px;border:2px solid #191923;font-family:Arial Narrow,Arial,sans-serif;font-size:12px;background:#FFFFFF;outline:none;box-shadow:2px 2px 0 #191923}' +
  '.qt-list{display:flex;flex-direction:column;gap:10px}' +
  '.qt-card{background:#FFFFFF;border-radius:7px;border:2px solid #191923;padding:14px;box-shadow:3px 3px 0 #191923;cursor:pointer;transition:transform .1s}' +
  '.qt-card:active{transform:translate(1px,1px);box-shadow:2px 2px 0 #191923}' +
  '.qt-card-row1{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;flex-wrap:wrap}' +
  '.qt-card-num{font-family:Yellowtail,cursive;font-size:13px;opacity:.6;margin-bottom:2px}' +
  '.qt-card-name{font-weight:900;font-size:14px;line-height:1.2;text-transform:uppercase;letter-spacing:-.3px}' +
  '.qt-card-row2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}' +
  '@media(min-width:720px){.qt-card-row2{grid-template-columns:repeat(4,1fr)}}' +
  '.qt-cell-lbl{font-family:Yellowtail,cursive;font-size:12px;opacity:.6;line-height:1}' +
  '.qt-cell-val{font-weight:900;font-size:14px;line-height:1.2;margin-top:2px}' +
  '.qt-pill{display:inline-flex;align-items:center;padding:3px 8px;border-radius:10px;border:2px solid #191923;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}' +
  '.qt-resp{display:inline-flex;align-items:center;gap:5px;font-family:Arial Narrow,Arial,sans-serif;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;color:#191923;margin-top:2px}' +
  '.qt-av{width:18px;height:18px;border-radius:50%;border:2px solid #191923;display:inline-flex;align-items:center;justify-content:center;font-size:9px;background:#FFEB5A}' +
  '.qt-av.emy{background:#FF82D7}' +
  '.qt-multi{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:3px;background:#FFEB5A;border:1.5px solid #191923;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.3px;margin-left:6px;vertical-align:middle}' +
  '.qt-empty{background:#FFFFFF;border:2px dashed #191923;border-radius:7px;padding:30px 20px;text-align:center;color:#191923}' +
  '.qt-empty h3{font-family:Yellowtail,cursive;font-size:22px;margin-bottom:6px;font-weight:400}' +
  '.qt-empty p{font-size:13px;opacity:.7;margin-bottom:14px}' +
  '.qt-error{background:#FF82D7;border:2px solid #191923;border-radius:7px;padding:12px;font-size:12px;font-weight:900;margin-bottom:12px;box-shadow:3px 3px 0 #191923}' +
  '.qt-loading{padding:30px;text-align:center;font-family:Yellowtail,cursive;font-size:18px;opacity:.6}' +
  '.qt-period-lbl{font-family:Yellowtail,cursive;font-size:13px;margin-right:4px}'

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function QuotesTab(props) {
  var supabase = props && props.supabase ? props.supabase : null
  var profile = props && props.profile ? props.profile : null
  var onNew = props && props.onNew ? props.onNew : null
  var onOpen = props && props.onOpen ? props.onOpen : null

  var [loading, setLoading] = useState(true)
  var [devis, setDevis] = useState([])
  var [error, setError] = useState('')
  var [statusFilter, setStatusFilter] = useState('all')
  var [periodFilter, setPeriodFilter] = useState('all')
  var [search, setSearch] = useState('')

  useEffect(function() {
    var run = async function() {
      if (!supabase) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        // Top-level uniquement (parents). Les variants enfants seront chargés à l'ouverture du devis.
        var res = await supabase
          .from('devis')
          .select('*')
          .is('parent_devis_id', null)
          .order('created_at', { ascending: false })
          .limit(200)

        if (res.error) {
          // Fallback défensif si parent_devis_id n'existe pas encore
          var res2 = await supabase
            .from('devis')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
          if (res2.error) {
            setError(res2.error.message || 'Erreur de chargement')
            setDevis([])
          } else {
            setDevis(res2.data || [])
            setError('')
          }
        } else {
          setDevis(res.data || [])
          setError('')
        }
      } catch (e) {
        setError(e && e.message ? e.message : 'Erreur de chargement')
        setDevis([])
      }
      setLoading(false)
    }
    run()
  }, [supabase])

  var filtered = useMemo(
    function() {
      var list = devis.slice()
      if (statusFilter !== 'all') {
        list = list.filter(function(d) {
          return pickStatus(d) === statusFilter
        })
      }
      if (periodFilter !== 'all') {
        list = list.filter(function(d) {
          return withinPeriod(d, periodFilter)
        })
      }
      var s = search.trim().toLowerCase()
      if (s) {
        list = list.filter(function(d) {
          var name = ((d.client_name || d.prospect_name || '') + '').toLowerCase()
          var num = ((d.numero || d.id || '') + '').toLowerCase()
          return name.indexOf(s) > -1 || num.indexOf(s) > -1
        })
      }
      return list
    },
    [devis, statusFilter, periodFilter, search]
  )

  var stats = useMemo(
    function() {
      var enCours = 0
      var signesMois = 0
      var caMois = 0
      var totalEnvoyes = 0
      var totalSignes = 0
      var now = new Date()
      var curMonth = now.getMonth()
      var curYear = now.getFullYear()

      devis.forEach(function(d) {
        var st = pickStatus(d)
        if (st === 'brouillon' || st === 'envoye') enCours += 1
        if (
          st === 'envoye' ||
          st === 'signe' ||
          st === 'acompte' ||
          st === 'facture' ||
          st === 'acquitte'
        )
          totalEnvoyes += 1
        if (st === 'signe' || st === 'acompte' || st === 'facture' || st === 'acquitte')
          totalSignes += 1

        if (st === 'signe' || st === 'acompte' || st === 'facture' || st === 'acquitte') {
          var ref = d.signed_at || d.sent_at || d.created_at
          if (ref) {
            var rd = new Date(ref)
            if (rd.getMonth() === curMonth && rd.getFullYear() === curYear) {
              signesMois += 1
              caMois += Number(d.total_ht) || 0
            }
          }
        }
      })

      var taux = totalEnvoyes > 0 ? Math.round((100 * totalSignes) / totalEnvoyes) : 0
      return { enCours: enCours, signesMois: signesMois, caMois: caMois, taux: taux }
    },
    [devis]
  )

  var resetFilters = function() {
    setStatusFilter('all')
    setPeriodFilter('all')
    setSearch('')
  }

  var handleNew = function() {
    if (onNew) onNew()
  }

  var currentYear = new Date().getFullYear()

  return (
    <div>
      <style>{QT_CSS}</style>

      {/* Header */}
      <div className="ph">
        <div>
          <div className="pt">DEVIS CATERING</div>
          <div className="ps">
            {filtered.length} {filtered.length > 1 ? 'devis affichés' : 'devis affiché'}
          </div>
        </div>
        <button className="btn btn-p" onClick={handleNew}>
          + Nouveau devis
        </button>
      </div>
      <div className="strip"></div>

      {/* Stats KPIs */}
      <div className="qt-stats">
        <div className="kc" style={{ background: '#FFFFFF' }}>
          <div className="kl">En cours</div>
          <div className="kv">{stats.enCours}</div>
          <div className="ki">📝</div>
        </div>
        <div className="kc" style={{ background: '#FFEB5A' }}>
          <div className="kl">Signés (mois)</div>
          <div className="kv">{stats.signesMois}</div>
          <div className="ki">✓</div>
        </div>
        <div className="kc" style={{ background: '#FF82D7' }}>
          <div className="kl">CA signé (mois)</div>
          <div className="kv">{fmtEur(stats.caMois)}</div>
          <div className="ki">€</div>
        </div>
        <div className="kc" style={{ background: '#FFFFFF' }}>
          <div className="kl">Taux transfo</div>
          <div className="kv">{stats.taux}%</div>
          <div className="ki">📈</div>
        </div>
      </div>

      {/* Filtres status + recherche */}
      <div className="qt-filters">
        <input
          className="qt-search"
          placeholder="Rechercher client ou n°..."
          value={search}
          onChange={function(e) {
            setSearch(e.target.value)
          }}
        />
        <button
          className={'qt-chip' + (statusFilter === 'all' ? ' on' : '')}
          onClick={function() {
            setStatusFilter('all')
          }}
        >
          Tous
        </button>
        <button
          className={'qt-chip' + (statusFilter === 'brouillon' ? ' on' : '')}
          onClick={function() {
            setStatusFilter('brouillon')
          }}
        >
          Brouillon
        </button>
        <button
          className={'qt-chip' + (statusFilter === 'envoye' ? ' on' : '')}
          onClick={function() {
            setStatusFilter('envoye')
          }}
        >
          Envoyé
        </button>
        <button
          className={'qt-chip' + (statusFilter === 'signe' ? ' on' : '')}
          onClick={function() {
            setStatusFilter('signe')
          }}
        >
          Signé
        </button>
        <button
          className={'qt-chip' + (statusFilter === 'facture' ? ' on' : '')}
          onClick={function() {
            setStatusFilter('facture')
          }}
        >
          Facturé
        </button>
        <button
          className={'qt-chip' + (statusFilter === 'acquitte' ? ' on' : '')}
          onClick={function() {
            setStatusFilter('acquitte')
          }}
        >
          Acquitté
        </button>
        <button
          className={'qt-chip' + (statusFilter === 'perdu' ? ' on' : '')}
          onClick={function() {
            setStatusFilter('perdu')
          }}
        >
          Perdu
        </button>
      </div>

      {/* Filtres période */}
      <div className="qt-filters">
        <span className="qt-period-lbl">Période :</span>
        <button
          className={'qt-chip' + (periodFilter === 'all' ? ' on' : '')}
          onClick={function() {
            setPeriodFilter('all')
          }}
        >
          Tous
        </button>
        <button
          className={'qt-chip' + (periodFilter === '7j' ? ' on' : '')}
          onClick={function() {
            setPeriodFilter('7j')
          }}
        >
          7 jours
        </button>
        <button
          className={'qt-chip' + (periodFilter === '30j' ? ' on' : '')}
          onClick={function() {
            setPeriodFilter('30j')
          }}
        >
          30 jours
        </button>
        <button
          className={'qt-chip' + (periodFilter === '3m' ? ' on' : '')}
          onClick={function() {
            setPeriodFilter('3m')
          }}
        >
          3 mois
        </button>
        <button
          className={'qt-chip' + (periodFilter === 'year' ? ' on' : '')}
          onClick={function() {
            setPeriodFilter('year')
          }}
        >
          {currentYear}
        </button>
      </div>

      {/* Erreur */}
      {error ? <div className="qt-error">⚠ {error}</div> : null}

      {/* Loading */}
      {loading ? <div className="qt-loading">Chargement…</div> : null}

      {/* Empty global */}
      {!loading && devis.length === 0 ? (
        <div className="qt-empty">
          <h3>Aucun devis pour le moment</h3>
          <p>Crée ton premier devis catering pour le voir apparaître ici.</p>
          <button className="btn btn-p" onClick={handleNew}>
            + Créer un devis
          </button>
        </div>
      ) : null}

      {/* No results after filter */}
      {!loading && filtered.length === 0 && devis.length > 0 ? (
        <div className="qt-empty">
          <h3>Aucun résultat</h3>
          <p>Essaie d'ajuster tes filtres.</p>
          <button className="btn" onClick={resetFilters}>
            Réinitialiser
          </button>
        </div>
      ) : null}

      {/* Liste */}
      {!loading && filtered.length > 0 ? (
        <div className="qt-list">
          {filtered.map(function(d) {
            var st = pickStatus(d)
            var col = STATUS_COLORS[st] || STATUS_COLORS.brouillon
            var resp = (d.responsable_email || d.created_by || '') + ''
            var isEmy = resp && resp.toLowerCase().indexOf('emy') > -1
            var clientName = d.client_name || d.prospect_name || 'Client à renseigner'
            var idStr = (d.id || '') + ''
            var numero = d.numero || '#' + idStr.slice(0, 6).toUpperCase()
            var totalHt = Number(d.total_ht) || 0
            var margeHt = d.total_marge_ht
            var hasMarge = margeHt !== null && margeHt !== undefined && margeHt !== ''
            var nbVariants = countVariants(d)
            var eventDate = d.event_date || d.date_evenement
            var handleClick = function() {
              if (onOpen) onOpen(d)
            }

            return (
              <div key={d.id} className="qt-card" onClick={handleClick}>
                <div className="qt-card-row1">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="qt-card-num">{numero}</div>
                    <div className="qt-card-name">
                      {clientName}
                      {nbVariants > 1 ? (
                        <span className="qt-multi">⊞ {nbVariants} options</span>
                      ) : null}
                    </div>
                  </div>
                  <span className="qt-pill" style={{ background: col.bg, color: col.fg }}>
                    {STATUS_LABELS[st] || st}
                  </span>
                </div>
                <div className="qt-card-row2">
                  <div>
                    <div className="qt-cell-lbl">Total HT</div>
                    <div className="qt-cell-val">{fmtEur(totalHt)}</div>
                  </div>
                  <div>
                    <div className="qt-cell-lbl">Marge HT</div>
                    <div className="qt-cell-val">{hasMarge ? fmtEur(margeHt) : '—'}</div>
                  </div>
                  <div>
                    <div className="qt-cell-lbl">Événement</div>
                    <div className="qt-cell-val" style={{ fontSize: '12px' }}>
                      {fmtDate(eventDate)}
                    </div>
                  </div>
                  <div>
                    <div className="qt-cell-lbl">Responsable</div>
                    <div className="qt-resp">
                      <span className={'qt-av' + (isEmy ? ' emy' : '')}>{isEmy ? 'E' : 'Ed'}</span>
                      <span>{isEmy ? 'Emy' : 'Edward'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
