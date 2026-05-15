'use client'
import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

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
// DÉTAIL : fiche article avec graphique évolution prix
// =====================================================================
function ArticleDetail(props: any) {
  var [data, setData] = useState<any>(null)
  var [loading, setLoading] = useState(true)
  var [error, setError] = useState<string | null>(null)

  useEffect(function() {
    setLoading(true)
    setError(null)
    fetch('/api/articles-analytics?id=' + props.articleId)
      .then(function(r) { return r.json() })
      .then(function(d) {
        if (d.error) {
          setError(d.error)
        } else {
          setData(d)
        }
        setLoading(false)
      })
      .catch(function(e) {
        setError(e.message)
        setLoading(false)
      })
  }, [props.articleId])

  // ⚠️ IMPORTANT : tous les hooks DOIVENT être appelés avant tout return conditionnel
  // (Rules of Hooks). chartData est calculé ici, même si data est encore null.
  var chartData = useMemo(function() {
    if (!data) return []
    var pbs = data.pricesBySupplier || {}
    var allPoints: any[] = []
    Object.keys(pbs).forEach(function(s) {
      ;(pbs[s] || []).forEach(function(p: any) {
        allPoints.push({
          date: p.date,
          dateLabel: formatDateShort(p.date),
          supplier: s,
          [s]: p.price,
          fullPoint: p
        })
      })
    })
    allPoints.sort(function(a, b){ return new Date(a.date).getTime() - new Date(b.date).getTime() })
    return allPoints
  }, [data])

  if (loading) {
    return (
      <div style={{textAlign: 'center', padding: 60, opacity: 0.6}}>
        ⏳ Chargement de l'article...
      </div>
    )
  }

  if (error || !data) {
    return (
      <Tile bg="#FFE5E5">
        <div style={{padding: 20, color: '#C53030', fontWeight: 700}}>
          ❌ {error || 'Erreur de chargement'}
        </div>
      </Tile>
    )
  }

  var a = data.article
  var pricesBySupplier = data.pricesBySupplier || {}
  var suppliers = Object.keys(pricesBySupplier)

  // Custom tooltip pour afficher détail au hover
  function CustomTooltip(t: any) {
    if (!t.active || !t.payload || !t.payload.length) return null
    var point = t.payload[0].payload
    var fp = point.fullPoint
    return (
      <div style={{
        background: '#fff',
        border: '2px solid #191923',
        borderRadius: 10,
        padding: 12,
        boxShadow: '4px 4px 0 #191923',
        fontSize: 12,
        minWidth: 200
      }}>
        <div style={{fontWeight: 900, color: colorForSupplier(fp.supplier), marginBottom: 6}}>
          {fp.supplier}
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3}}>
          <span style={{opacity: 0.65}}>Date :</span>
          <strong>{formatDate(fp.date)}</strong>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3}}>
          <span style={{opacity: 0.65}}>Prix unit. :</span>
          <strong style={{color: '#005FFF'}}>{formatPrice(fp.price, a.article_unit)}</strong>
        </div>
        {fp.pack_price && (
          <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3}}>
            <span style={{opacity: 0.65}}>Pack :</span>
            <span>{fp.pack_price} € {fp.pack_label ? '(' + fp.pack_label + ')' : ''}</span>
          </div>
        )}
        {fp.invoice && (
          <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 5, paddingTop: 5, borderTop: '1px dashed #ddd'}}>
            <span style={{opacity: 0.65, fontSize: 10}}>📄</span>
            <span style={{fontSize: 10, textAlign: 'right'}}>{fp.invoice}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Bouton retour */}
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
          marginBottom: 16
        }}
      >
        ← Retour à la liste
      </button>

      {/* Header article */}
      <Tile bg="#FFE5F4" style={{marginBottom: 16}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12}}>
          <div>
            <h2 style={{
              fontFamily: "'Yellowtail', cursive",
              fontSize: 42,
              margin: 0,
              lineHeight: 1
            }}>
              {a.article_name}
            </h2>
            <div style={{marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap'}}>
              <span style={catPill(a.article_category)}>{a.article_category}</span>
              <span style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                background: '#191923',
                color: '#fff',
                fontWeight: 700
              }}>unité de réf : {a.article_unit}</span>
              <span style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                background: '#FFEB5A',
                border: '1px solid #191923',
                fontWeight: 700
              }}>{a.nb_prix_total} prix enregistrés</span>
              <span style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                background: '#fff',
                border: '1px solid #191923',
                fontWeight: 700
              }}>{a.nb_fournisseurs} fournisseur{a.nb_fournisseurs > 1 ? 's' : ''}</span>
              <span style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 6,
                background: '#005FFF',
                color: '#fff',
                fontWeight: 700
              }}>utilisé dans {a.nb_recettes} recette{a.nb_recettes > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </Tile>

      {/* Stats min/max/moy/dernier */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 16
      }}>
        {/* Prix min */}
        <Tile bg="#E5FFE5">
          <div style={{fontSize: 11, fontWeight: 900, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4}}>
            💚 Prix min
          </div>
          <div style={{fontSize: 26, fontWeight: 900, color: '#009D3A'}}>
            {formatPrice(a.prix_min, a.article_unit)}
          </div>
          <div style={{fontSize: 11, marginTop: 4, opacity: 0.7}}>
            {a.prix_min_supplier} · {formatDate(a.prix_min_date)}
          </div>
        </Tile>

        {/* Prix max */}
        <Tile bg="#FFE5E5">
          <div style={{fontSize: 11, fontWeight: 900, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4}}>
            🔴 Prix max
          </div>
          <div style={{fontSize: 26, fontWeight: 900, color: '#C53030'}}>
            {formatPrice(a.prix_max, a.article_unit)}
          </div>
          <div style={{fontSize: 11, marginTop: 4, opacity: 0.7}}>
            {a.prix_max_supplier} · {formatDate(a.prix_max_date)}
          </div>
        </Tile>

        {/* Prix moyen */}
        <Tile bg="#FFEB5A">
          <div style={{fontSize: 11, fontWeight: 900, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4}}>
            📊 Prix moyen
          </div>
          <div style={{fontSize: 26, fontWeight: 900, color: '#191923'}}>
            {formatPrice(a.prix_moyen, a.article_unit)}
          </div>
          <div style={{fontSize: 11, marginTop: 4, opacity: 0.7}}>
            sur {a.nb_prix_total} prix
          </div>
        </Tile>

        {/* Dernier prix */}
        <Tile bg="#FFE5F4">
          <div style={{fontSize: 11, fontWeight: 900, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4}}>
            🕐 Dernier prix
          </div>
          <div style={{fontSize: 26, fontWeight: 900, color: '#FF82D7'}}>
            {formatPrice(a.dernier_prix, a.article_unit)}
          </div>
          <div style={{fontSize: 11, marginTop: 4, opacity: 0.7}}>
            {a.dernier_prix_supplier} · {formatDate(a.dernier_prix_date)}
          </div>
        </Tile>
      </div>

      {/* Graphique évolution prix par fournisseur */}
      <Tile bg="#FFFFFF" style={{marginBottom: 16}}>
        <h3 style={{
          fontFamily: 'Arial Narrow, sans-serif',
          fontWeight: 900,
          fontSize: 16,
          margin: '0 0 12px 0',
          textTransform: 'uppercase'
        }}>
          📈 Évolution du prix dans le temps
        </h3>

        {chartData.length > 0 ? (
          <div style={{width: '100%', height: 380}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{top: 10, right: 30, left: 0, bottom: 30}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDateShort}
                  tick={{fontSize: 11, fill: '#555'}}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  tick={{fontSize: 11, fill: '#555'}}
                  tickFormatter={function(v: any){ return v.toFixed(2).replace('.', ',') + ' €' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: 12, paddingTop: 8}} iconType="circle" />
                {suppliers.map(function(s) {
                  return (
                    <Line
                      key={s}
                      type="monotone"
                      dataKey={s}
                      stroke={colorForSupplier(s)}
                      strokeWidth={2.5}
                      dot={{r: 4, strokeWidth: 2, fill: '#fff'}}
                      activeDot={{r: 7, strokeWidth: 3}}
                      connectNulls
                    />
                  )
                })}
                {a.prix_moyen && (
                  <ReferenceLine 
                    y={parseFloat(a.prix_moyen)} 
                    stroke="#191923" 
                    strokeDasharray="4 4" 
                    label={{value: 'Moyenne', position: 'right', fill: '#191923', fontSize: 11, fontWeight: 700}}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{padding: 40, textAlign: 'center', opacity: 0.5}}>
            Pas encore de données historiques pour cet article
          </div>
        )}

        <div style={{
          marginTop: 10,
          fontSize: 11,
          opacity: 0.6,
          fontStyle: 'italic'
        }}>
          💡 Passe ta souris sur un point pour voir le détail : date, prix, fournisseur, facture
        </div>
      </Tile>

      {/* Produits par fournisseur */}
      <Tile bg="#FFFFFF" style={{marginBottom: 16}}>
        <h3 style={{
          fontFamily: 'Arial Narrow, sans-serif',
          fontWeight: 900,
          fontSize: 16,
          margin: '0 0 12px 0',
          textTransform: 'uppercase'
        }}>
          🏪 Produits liés (par fournisseur)
        </h3>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12}}>
          {(data.products || []).map(function(p: any) {
            var sName = p.supplier?.name || 'Inconnu'
            return (
              <div key={p.id} style={{
                padding: 12,
                background: '#F5F5F5',
                borderRadius: 10,
                borderLeft: '5px solid ' + colorForSupplier(sName)
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8}}>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: 900, fontSize: 14}}>{p.name}</div>
                    <div style={{fontSize: 11, color: colorForSupplier(sName), fontWeight: 700, marginTop: 2}}>
                      {sName}
                    </div>
                  </div>
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: 16, fontWeight: 900, color: '#005FFF'}}>
                      {formatPrice(p.current_price, p.unit)}
                    </div>
                    {p.last_pack_price && (
                      <div style={{fontSize: 10, opacity: 0.6}}>
                        Pack : {parseFloat(p.last_pack_price).toFixed(2)}€
                      </div>
                    )}
                  </div>
                </div>
                {p.pack_label && (
                  <div style={{fontSize: 10, opacity: 0.6, marginTop: 4}}>
                    {p.pack_label}{p.master_qty_per_pack ? ' = ' + p.master_qty_per_pack + ' ' + p.unit : ''}
                  </div>
                )}
                {p.last_purchase_date && (
                  <div style={{fontSize: 10, opacity: 0.6, marginTop: 2}}>
                    Dernier achat : {formatDate(p.last_purchase_date)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Tile>

      {/* Recettes utilisant cet article */}
      {(data.recipes || []).length > 0 && (
        <Tile bg="#FFFFFF" style={{marginBottom: 16}}>
          <h3 style={{
            fontFamily: 'Arial Narrow, sans-serif',
            fontWeight: 900,
            fontSize: 16,
            margin: '0 0 12px 0',
            textTransform: 'uppercase'
          }}>
            🍔 Recettes utilisant cet article ({data.recipes.length})
          </h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8}}>
            {data.recipes.map(function(r: any) {
              return (
                <div key={r.id} style={{
                  padding: 10,
                  background: '#FFE5F4',
                  borderRadius: 8,
                  fontSize: 13
                }}>
                  <div style={{fontWeight: 900}}>{r.recipe?.name || 'Sans nom'}</div>
                  <div style={{fontSize: 11, marginTop: 3, opacity: 0.7}}>
                    {parseFloat(r.qte).toFixed(3)} {r.unite} · Coût : {formatPrice(r.cout)}
                  </div>
                </div>
              )
            })}
          </div>
        </Tile>
      )}
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
