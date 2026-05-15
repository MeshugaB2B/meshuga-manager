'use client'
import { useState, useEffect, useMemo } from 'react'
import ArticleDetailView from './ArticleDetailView'

// =============================================================================
// ArticlesTab — Vue analytique multi-fournisseurs par article générique
// 
// Liste tous les articles (Échalote, Cheddar, etc.) avec stats agrégées,
// puis fiche détaillée au clic avec graphique évolution prix par fournisseur.
// =============================================================================

// ========== Palette couleurs par fournisseur (déterministe) ==========
var SUPPLIER_COLORS: any = {
  'Halles Paris Sud': '#FF82D7',       // rose Meshuga
  'Foodflow': '#005FFF',                // bleu Meshuga
  'La Crémerie Parisienne': '#009D3A',  // vert
  'Episaveurs': '#FF6B00',              // orange
  'DS Service': '#9C27B0',              // violet
  'Norbert': '#795548',                 // marron
  'Monarque': '#FFD600',                // jaune saturé
  'Marina Sea Food': '#00BCD4',         // cyan
  'Jacquier': '#E91E63',                // rose foncé
  'Maison': '#191923',                  // noir
  'Amazon': '#FF9800',                  // orange clair
  'China': '#FF5722'                    // orange-rouge
}

function colorForSupplier(name: string) {
  if (SUPPLIER_COLORS[name]) return SUPPLIER_COLORS[name]
  // fallback : hash simple
  var hash = 0
  for (var i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  var palette = ['#7C4DFF', '#00897B', '#D81B60', '#3949AB', '#F4511E', '#5E35B1']
  return palette[Math.abs(hash) % palette.length]
}

function formatPrice(n: any, unit?: string) {
  if (n === null || n === undefined || isNaN(parseFloat(n))) return '—'
  var v = parseFloat(n)
  if (v < 1) return v.toFixed(3).replace('.', ',') + ' €' + (unit ? ' / ' + unit : '')
  return v.toFixed(2).replace('.', ',') + ' €' + (unit ? ' / ' + unit : '')
}

function formatDate(d: any) {
  if (!d) return '—'
  var dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateShort(d: any) {
  if (!d) return ''
  var dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

// =====================================================================
// CARD : tile rose/blanc/jaune réutilisable (charte Meshuga)
// =====================================================================
function Tile(props: any) {
  var bg = props.bg || '#FFFFFF'
  return (
    <div style={{
      background: bg,
      borderRadius: 14,
      padding: props.padding || 16,
      border: '2px solid #191923',
      boxShadow: '4px 4px 0 #191923',
      ...(props.style || {})
    }}>
      {props.children}
    </div>
  )
}

// =====================================================================
// LISTE : tableau de tous les articles
// =====================================================================
function ArticlesList(props: any) {
  var [search, setSearch] = useState('')
  var [filterCat, setFilterCat] = useState('all')
  var [filterMulti, setFilterMulti] = useState(false)

  var filtered = useMemo(function() {
    return (props.articles || []).filter(function(a: any) {
      if (search && !a.article_name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCat !== 'all' && a.article_category !== filterCat) return false
      if (filterMulti && (a.nb_fournisseurs || 0) < 2) return false
      return true
    })
  }, [props.articles, search, filterCat, filterMulti])

  var categories = useMemo(function() {
    var s = new Set<string>()
    ;(props.articles || []).forEach(function(a: any) { 
      if (a.article_category) s.add(a.article_category) 
    })
    return Array.from(s).sort()
  }, [props.articles])

  return (
    <div>
      {/* Filtres */}
      <div style={{display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center'}}>
        <input
          type="text"
          placeholder="🔍 Rechercher un article..."
          value={search}
          onChange={function(e){ setSearch(e.target.value) }}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '2px solid #191923',
            fontSize: 14,
            flex: '1 1 200px',
            fontFamily: 'inherit',
            background: '#fff'
          }}
        />
        <select
          value={filterCat}
          onChange={function(e){ setFilterCat(e.target.value) }}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '2px solid #191923',
            fontSize: 14,
            background: '#fff',
            cursor: 'pointer'
          }}
        >
          <option value="all">Toutes catégories</option>
          {categories.map(function(c){ return <option key={c} value={c}>{c}</option> })}
        </select>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          background: filterMulti ? '#FFEB5A' : '#fff',
          border: '2px solid #191923',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700
        }}>
          <input
            type="checkbox"
            checked={filterMulti}
            onChange={function(e){ setFilterMulti(e.target.checked) }}
            style={{margin: 0}}
          />
          📊 Multi-fournisseurs uniquement
        </label>
        <div style={{
          padding: '10px 14px',
          background: '#FFE5F4',
          border: '2px solid #191923',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 900
        }}>
          {filtered.length} article{filtered.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Tableau */}
      <div style={{
        background: '#fff',
        border: '2px solid #191923',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '4px 4px 0 #191923'
      }}>
        <div style={{overflowX: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
            <thead>
              <tr style={{background: '#FFEB5A', borderBottom: '2px solid #191923'}}>
                <th style={thStyle}>Article</th>
                <th style={thStyle}>Cat.</th>
                <th style={thStyleRight}>Prix min</th>
                <th style={thStyleRight}>Prix max</th>
                <th style={thStyleRight}>Prix moyen</th>
                <th style={thStyleRight}>Variation</th>
                <th style={thStyleRight}>Nb prix</th>
                <th style={thStyle}>Fournisseurs</th>
                <th style={thStyleRight}>Recettes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(function(a: any) {
                var hasMulti = (a.nb_fournisseurs || 0) >= 2
                var variation = parseFloat(a.variation_max_pct || 0)
                return (
                  <tr 
                    key={a.article_id}
                    onClick={function(){ props.onSelectArticle(a.article_id) }}
                    style={{
                      cursor: 'pointer',
                      borderBottom: '1px solid #eee',
                      transition: 'background 0.1s'
                    }}
                    onMouseOver={function(e){ (e.currentTarget as any).style.background = '#FFE5F4' }}
                    onMouseOut={function(e){ (e.currentTarget as any).style.background = '' }}
                  >
                    <td style={tdStyle}>
                      <div style={{fontWeight: 800, fontSize: 14}}>{a.article_name}</div>
                      <div style={{fontSize: 11, opacity: 0.55}}>par {a.article_unit}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={catPill(a.article_category)}>{a.article_category}</span>
                    </td>
                    <td style={tdStyleRight}>
                      <div style={{fontWeight: 700}}>{formatPrice(a.prix_min)}</div>
                      {a.prix_min_supplier && (
                        <div style={{fontSize: 10, opacity: 0.6}}>{a.prix_min_supplier}</div>
                      )}
                    </td>
                    <td style={tdStyleRight}>
                      <div style={{fontWeight: 700}}>{formatPrice(a.prix_max)}</div>
                      {a.prix_max_supplier && (
                        <div style={{fontSize: 10, opacity: 0.6}}>{a.prix_max_supplier}</div>
                      )}
                    </td>
                    <td style={tdStyleRight}>
                      <div style={{fontWeight: 900, color: '#005FFF'}}>{formatPrice(a.prix_moyen)}</div>
                    </td>
                    <td style={tdStyleRight}>
                      {variation > 0 ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: variation > 100 ? '#FFE5E5' : variation > 30 ? '#FFEB5A' : '#E5FFE5',
                          fontWeight: 800,
                          fontSize: 11,
                          color: variation > 100 ? '#C53030' : '#191923'
                        }}>
                          {variation > 100 ? '⚠️ ' : ''}+{variation.toFixed(0)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td style={tdStyleRight}>
                      <span style={{fontWeight: 700}}>{a.nb_prix_total || 0}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
                        {(a.fournisseurs_list || '').split(', ').filter(Boolean).map(function(s: string, i: number) {
                          return (
                            <span key={i} style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: colorForSupplier(s),
                              color: '#fff',
                              fontWeight: 700
                            }}>{s}</span>
                          )
                        })}
                        {hasMulti && (
                          <span style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: '#FFEB5A',
                            border: '1px solid #191923',
                            fontWeight: 900
                          }}>×{a.nb_fournisseurs}</span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyleRight}>
                      <span style={{fontWeight: 700}}>{a.nb_recettes || 0}</span>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{padding: 40, textAlign: 'center', opacity: 0.5}}>
                    Aucun article ne correspond aux filtres
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// DÉTAIL : wrapper léger autour de ArticleDetailView (partagé avec modal)
// =====================================================================
function ArticleDetail(props: any) {
  return (
    <div>
      <button
        onClick={props.onBack}
        style={{
          padding: '8px 14px',
          borderRadius: 10,
          border: '2px solid #191923',
          background: '#FFEB5A',
          fontWeight: 900,
          fontSize: 13,
          cursor: 'pointer',
          marginBottom: 16,
          boxShadow: '3px 3px 0 #191923'
        }}
      >
        ← Retour à la liste
      </button>
      <ArticleDetailView articleId={props.articleId} compact={false} />
    </div>
  )
}

// =====================================================================
// MAIN : composant exporté
// =====================================================================
export default function ArticlesTab(props: any) {
  var [articles, setArticles] = useState<any[]>([])
  var [loading, setLoading] = useState(true)
  var [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(function() {
    fetch('/api/articles-analytics')
      .then(function(r) { return r.json() })
      .then(function(d) {
        setArticles(d.articles || [])
        setLoading(false)
      })
      .catch(function(e) {
        if (props.toast) props.toast('Erreur chargement articles : ' + e.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: 60, opacity: 0.6}}>
        ⏳ Chargement des articles...
      </div>
    )
  }

  if (selectedId) {
    return (
      <ArticleDetail 
        articleId={selectedId} 
        onBack={function(){ setSelectedId(null) }} 
      />
    )
  }

  return (
    <div>
      <div style={{
        background: '#FFEB5A',
        border: '2px solid #191923',
        borderRadius: 14,
        padding: 14,
        marginBottom: 16,
        boxShadow: '4px 4px 0 #191923'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8}}>
          <div>
            <div style={{fontWeight: 900, fontSize: 16}}>📊 Vue analytique par article</div>
            <div style={{fontSize: 12, opacity: 0.7, marginTop: 3}}>
              Suivi des prix dans le temps pour chaque ingrédient générique. 
              Pour les articles multi-fournisseurs, identifie d'un coup d'œil l'écart de prix.
            </div>
          </div>
          <div style={{display: 'flex', gap: 12}}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 22, fontWeight: 900}}>{articles.length}</div>
              <div style={{fontSize: 10, fontWeight: 700, textTransform: 'uppercase'}}>articles</div>
            </div>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 22, fontWeight: 900, color: '#FF82D7'}}>
                {articles.filter(function(a){ return (a.nb_fournisseurs || 0) >= 2 }).length}
              </div>
              <div style={{fontSize: 10, fontWeight: 700, textTransform: 'uppercase'}}>multi-fournisseurs</div>
            </div>
          </div>
        </div>
      </div>

      <ArticlesList 
        articles={articles}
        onSelectArticle={function(id: string){ setSelectedId(id) }}
      />
    </div>
  )
}

// ========== Styles partagés ==========
var thStyle: any = {
  padding: '12px 10px',
  textAlign: 'left',
  fontFamily: 'Arial Narrow, sans-serif',
  fontWeight: 900,
  fontSize: 11,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap'
}

var thStyleRight: any = Object.assign({}, thStyle, {textAlign: 'right'})

var tdStyle: any = {
  padding: '10px',
  fontSize: 13,
  verticalAlign: 'top'
}

var tdStyleRight: any = Object.assign({}, tdStyle, {textAlign: 'right'})

function catPill(cat: string) {
  var colors: any = {
    'ingredient': {bg: '#FFE5F4', color: '#191923'},
    'packaging': {bg: '#E5F4FF', color: '#191923'},
    'consommable': {bg: '#E5FFE5', color: '#191923'},
    'boisson': {bg: '#FFF5E5', color: '#191923'}
  }
  var c = colors[cat] || {bg: '#F5F5F5', color: '#191923'}
  return {
    fontSize: 10,
    padding: '3px 8px',
    borderRadius: 4,
    background: c.bg,
    color: c.color,
    fontWeight: 700,
    border: '1px solid #191923',
    display: 'inline-block'
  }
}
