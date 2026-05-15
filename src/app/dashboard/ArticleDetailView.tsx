'use client'
import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

// =============================================================================
// ArticleDetailView — Vue détail article réutilisable (page ou modal)
// 
// Affiche : header + 4 tiles (min/max/moy/dernier) + graphique évolution multi-fournisseurs
// + cartes produits par fournisseur + recettes utilisant l'article
// 
// Utilisé par :
//   - ArticlesTab (page Articles dans Achats)
//   - ArticleDetailModal (popup depuis Dashboard)
// 
// Props : articleId (uuid) - obligatoire
//         compact (boolean) - si true, masque les sections produits/recettes (mobile modal)
// =============================================================================

// ========== Palette couleurs par fournisseur (déterministe) ==========
var SUPPLIER_COLORS: any = {
  'Halles Paris Sud': '#FF82D7',
  'Foodflow': '#005FFF',
  'La Crémerie Parisienne': '#009D3A',
  'Episaveurs': '#FF6B00',
  'DS Service': '#9C27B0',
  'Norbert': '#795548',
  'Monarque': '#FFD600',
  'Marina Sea Food': '#00BCD4',
  'Jacquier': '#E91E63',
  'Maison': '#191923',
  'Amazon': '#FF9800',
  'China': '#FF5722'
}

export function colorForSupplier(name: string) {
  if (SUPPLIER_COLORS[name]) return SUPPLIER_COLORS[name]
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
// Ouverture d'une facture dans un nouvel onglet
// =====================================================================
function openInvoice(filename: string) {
  if (!filename) return
  window.open('/api/invoice-pdf?filename=' + encodeURIComponent(filename), '_blank', 'noopener')
}

// =====================================================================
// Détecter mobile (largeur viewport)
// =====================================================================
function useIsMobile() {
  var [isMobile, setIsMobile] = useState(false)
  useEffect(function() {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return function(){ window.removeEventListener('resize', check) }
  }, [])
  return isMobile
}

// =====================================================================
// Vue détail principale
// =====================================================================
export default function ArticleDetailView(props: any) {
  var [data, setData] = useState<any>(null)
  var [loading, setLoading] = useState(true)
  var [error, setError] = useState<string | null>(null)
  var isMobile = useIsMobile()
  var compact = props.compact || false

  useEffect(function() {
    if (!props.articleId) return
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

  // ⚠️ TOUS les hooks doivent être appelés avant tout return conditionnel (Rules of Hooks)
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

  // Tooltip custom : affiche détail + bouton "Voir facture"
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
        minWidth: 220,
        maxWidth: 280
      }}>
        <div style={{fontWeight: 900, color: colorForSupplier(fp.supplier), marginBottom: 6, fontSize: 13}}>
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
            <span>{Number(fp.pack_price).toFixed(2)} € {fp.pack_label ? '(' + fp.pack_label + ')' : ''}</span>
          </div>
        )}
        {fp.invoice && (
          <div style={{marginTop: 8, paddingTop: 6, borderTop: '1px dashed #ddd'}}>
            <div style={{fontSize: 10, opacity: 0.6, marginBottom: 4, wordBreak: 'break-all'}}>
              📄 {fp.invoice}
            </div>
            <div style={{fontSize: 10, fontWeight: 700, color: '#005FFF', fontStyle: 'italic'}}>
              💡 Clique sur le point pour voir la facture
            </div>
          </div>
        )}
      </div>
    )
  }

  // Au clic sur un point du graphique : ouvrir la facture
  function handleChartClick(state: any) {
    if (!state || !state.activePayload || !state.activePayload[0]) return
    var fp = state.activePayload[0].payload.fullPoint
    if (fp && fp.invoice) {
      openInvoice(fp.invoice)
    }
  }

  // Layout responsive : empilé sur mobile
  var statsGridCols = isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(200px, 1fr))'
  var statsGap = isMobile ? 8 : 12
  var chartHeight = isMobile ? 280 : 380
  var headerFontSize = isMobile ? 32 : 42

  return (
    <div>
      {/* Header article */}
      <Tile bg="#FFE5F4" style={{marginBottom: isMobile ? 10 : 16}}>
        <h2 style={{
          fontFamily: "'Yellowtail', cursive",
          fontSize: headerFontSize,
          margin: 0,
          lineHeight: 1
        }}>
          {a.article_name}
        </h2>
        <div style={{marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap'}}>
          <span style={catPill(a.article_category)}>{a.article_category}</span>
          <span style={badgeStyle('#191923', '#fff')}>unité : {a.article_unit}</span>
          <span style={badgeStyle('#FFEB5A', '#191923')}>{a.nb_prix_total} prix</span>
          <span style={badgeStyle('#fff', '#191923', true)}>{a.nb_fournisseurs} fourn.</span>
          {a.nb_recettes > 0 && (
            <span style={badgeStyle('#005FFF', '#fff')}>{a.nb_recettes} recette{a.nb_recettes > 1 ? 's' : ''}</span>
          )}
        </div>
      </Tile>

      {/* Stats min/max/moy/dernier */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: statsGridCols,
        gap: statsGap,
        marginBottom: isMobile ? 10 : 16
      }}>
        <Tile bg="#E5FFE5" padding={isMobile ? 10 : 16}>
          <div style={tinyLabelStyle}>💚 Prix min</div>
          <div style={{fontSize: isMobile ? 18 : 26, fontWeight: 900, color: '#009D3A'}}>
            {formatPrice(a.prix_min, a.article_unit)}
          </div>
          <div style={{fontSize: 10, marginTop: 3, opacity: 0.7}}>
            {a.prix_min_supplier} · {formatDate(a.prix_min_date)}
          </div>
        </Tile>

        <Tile bg="#FFE5E5" padding={isMobile ? 10 : 16}>
          <div style={tinyLabelStyle}>🔴 Prix max</div>
          <div style={{fontSize: isMobile ? 18 : 26, fontWeight: 900, color: '#C53030'}}>
            {formatPrice(a.prix_max, a.article_unit)}
          </div>
          <div style={{fontSize: 10, marginTop: 3, opacity: 0.7}}>
            {a.prix_max_supplier} · {formatDate(a.prix_max_date)}
          </div>
        </Tile>

        <Tile bg="#FFEB5A" padding={isMobile ? 10 : 16}>
          <div style={tinyLabelStyle}>📊 Prix moyen</div>
          <div style={{fontSize: isMobile ? 18 : 26, fontWeight: 900, color: '#191923'}}>
            {formatPrice(a.prix_moyen, a.article_unit)}
          </div>
          <div style={{fontSize: 10, marginTop: 3, opacity: 0.7}}>
            sur {a.nb_prix_total} prix
          </div>
        </Tile>

        <Tile bg="#FFE5F4" padding={isMobile ? 10 : 16}>
          <div style={tinyLabelStyle}>🕐 Dernier prix</div>
          <div style={{fontSize: isMobile ? 18 : 26, fontWeight: 900, color: '#FF82D7'}}>
            {formatPrice(a.dernier_prix, a.article_unit)}
          </div>
          <div style={{fontSize: 10, marginTop: 3, opacity: 0.7}}>
            {a.dernier_prix_supplier} · {formatDate(a.dernier_prix_date)}
          </div>
        </Tile>
      </div>

      {/* Graphique évolution prix par fournisseur */}
      <Tile bg="#FFFFFF" style={{marginBottom: isMobile ? 10 : 16}} padding={isMobile ? 10 : 16}>
        <h3 style={{
          fontFamily: 'Arial Narrow, sans-serif',
          fontWeight: 900,
          fontSize: isMobile ? 13 : 16,
          margin: '0 0 10px 0',
          textTransform: 'uppercase'
        }}>
          📈 Évolution du prix dans le temps
        </h3>

        {chartData.length > 0 ? (
          <div style={{width: '100%', height: chartHeight}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData} 
                margin={{top: 10, right: isMobile ? 10 : 30, left: 0, bottom: 30}}
                onClick={handleChartClick}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDateShort}
                  tick={{fontSize: 10, fill: '#555'}}
                  angle={-30}
                  textAnchor="end"
                  height={50}
                />
                <YAxis 
                  tick={{fontSize: 10, fill: '#555'}}
                  tickFormatter={function(v: any){ return v.toFixed(2).replace('.', ',') + ' €' }}
                  width={isMobile ? 50 : 60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: 11, paddingTop: 8}} iconType="circle" />
                {suppliers.map(function(s) {
                  return (
                    <Line
                      key={s}
                      type="monotone"
                      dataKey={s}
                      stroke={colorForSupplier(s)}
                      strokeWidth={2.5}
                      dot={{r: isMobile ? 3 : 4, strokeWidth: 2, fill: '#fff', cursor: 'pointer'}}
                      activeDot={{r: isMobile ? 6 : 7, strokeWidth: 3, cursor: 'pointer'}}
                      connectNulls
                    />
                  )
                })}
                {a.prix_moyen && (
                  <ReferenceLine 
                    y={parseFloat(a.prix_moyen)} 
                    stroke="#191923" 
                    strokeDasharray="4 4" 
                    label={isMobile ? undefined : {value: 'Moyenne', position: 'right', fill: '#191923', fontSize: 10, fontWeight: 700}}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{padding: 40, textAlign: 'center', opacity: 0.5}}>
            Pas encore de données historiques
          </div>
        )}

        <div style={{
          marginTop: 8,
          fontSize: 11,
          opacity: 0.65,
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          {isMobile ? '👆 Touche un point pour voir la facture' : '💡 Survole un point pour le détail · Clique pour ouvrir la facture'}
        </div>
      </Tile>

      {/* Sections produits + recettes : masquées en mode compact (mobile modal) */}
      {!compact && (
        <>
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
            <div style={{
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', 
              gap: 10
            }}>
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
                      <div style={{flex: 1, minWidth: 0}}>
                        <div style={{fontWeight: 900, fontSize: 13, wordBreak: 'break-word'}}>{p.name}</div>
                        <div style={{fontSize: 11, color: colorForSupplier(sName), fontWeight: 700, marginTop: 2}}>
                          {sName}
                        </div>
                      </div>
                      <div style={{textAlign: 'right'}}>
                        <div style={{fontSize: 15, fontWeight: 900, color: '#005FFF'}}>
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
              <div style={{
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: 8
              }}>
                {data.recipes.map(function(r: any) {
                  return (
                    <div key={r.id} style={{
                      padding: 10,
                      background: '#FFE5F4',
                      borderRadius: 8,
                      fontSize: 12
                    }}>
                      <div style={{fontWeight: 900, fontSize: 13}}>{r.recipe?.name || 'Sans nom'}</div>
                      <div style={{fontSize: 10, marginTop: 3, opacity: 0.7}}>
                        {parseFloat(r.qte).toFixed(3)} {r.unite} · Coût : {formatPrice(r.cout)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Tile>
          )}
        </>
      )}
    </div>
  )
}

// ========== Styles partagés ==========
var tinyLabelStyle: any = {
  fontSize: 10,
  fontWeight: 900,
  textTransform: 'uppercase',
  opacity: 0.6,
  marginBottom: 4,
  letterSpacing: 0.3
}

function badgeStyle(bg: string, color: string, border?: boolean): any {
  return {
    fontSize: 10,
    padding: '3px 8px',
    borderRadius: 5,
    background: bg,
    color: color,
    fontWeight: 700,
    border: border ? '1px solid #191923' : 'none',
    display: 'inline-block'
  }
}
