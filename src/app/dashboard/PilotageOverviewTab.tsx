'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// PilotageOverviewTab — KPI essentiels + comparaisons N vs N-1
// =============================================================================

export default function PilotageOverviewTab(props) {
  var [loading, setLoading] = useState(true)
  var [overviews, setOverviews] = useState([])
  var [monthlySales, setMonthlySales] = useState([])
  var [selectedYear, setSelectedYear] = useState(null)
  var [products, setProducts] = useState([])
  var [menus, setMenus] = useState([])
  var [salesByMode, setSalesByMode] = useState([])
  var [salesBySource, setSalesBySource] = useState([])

  useEffect(function(){
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    var c = sb()
    Promise.all([
      c.from('sales_overview').select('*').order('year', { ascending: false }),
      c.from('v_sales_monthly').select('*').order('year_month', { ascending: true }),
      c.from('sales_products_period').select('*').order('ca_ttc', { ascending: false, nullsFirst: false }),
      c.from('v_sales_by_mode').select('*'),
      c.from('v_sales_by_source').select('*')
    ]).then(function(results){
      var overviewData = results[0].data || []
      setOverviews(overviewData)
      if (overviewData.length > 0 && !selectedYear) {
        setSelectedYear(overviewData[0].year)
      }
      setMonthlySales(results[1].data || [])
      var prod = (results[2].data || []).filter(function(p){ return p.product_type === 'produit' })
      var men = (results[2].data || []).filter(function(p){ return p.product_type === 'menu' })
      setProducts(prod)
      setMenus(men)
      setSalesByMode(results[3].data || [])
      setSalesBySource(results[4].data || [])
      setLoading(false)
    })
  }

  function fmtMoney(v) {
    if (v === null || v === undefined) return '—'
    return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
  }

  function fmtMoneyShort(v) {
    if (v === null || v === undefined) return '—'
    var n = Number(v)
    if (n >= 1000000) return (n / 1000000).toFixed(2) + ' M€'
    if (n >= 1000) return (n / 1000).toFixed(1) + ' k€'
    return n.toFixed(0) + ' €'
  }

  function fmtNumber(v) {
    if (v === null || v === undefined) return '—'
    return Number(v).toLocaleString('fr-FR')
  }

  function fmtPct(v, total) {
    if (!v || !total || total === 0) return '—'
    return ((Number(v) / Number(total)) * 100).toFixed(1) + '%'
  }

  function deltaVsPrev(current, prev) {
    if (!current || !prev || prev === 0) return null
    var pct = ((Number(current) - Number(prev)) / Number(prev)) * 100
    return pct
  }

  function fmtDelta(pct) {
    if (pct === null) return null
    var sign = pct > 0 ? '+' : ''
    return sign + pct.toFixed(1) + '%'
  }

  function getMonthName(m) {
    var names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    return names[m - 1] || '?'
  }

  if (loading) {
    return <div style={{padding: 40, textAlign: 'center', opacity: 0.6}}>⏳ Chargement des données...</div>
  }

  if (overviews.length === 0) {
    return (
      <div style={{padding: 50, textAlign: 'center', background: '#fff', borderRadius: 12, border: '2px dashed #DDD'}}>
        <div style={{fontSize: 48, marginBottom: 12}}>📊</div>
        <div style={{fontSize: 16, fontWeight: 900, color: '#191923', marginBottom: 6, fontFamily: 'Arial Narrow, Arial, sans-serif'}}>
          AUCUNE DONNÉE IMPORTÉE
        </div>
        <div style={{fontSize: 13, color: '#888'}}>
          Va dans l&apos;onglet « Imports » pour uploader tes CSV Zelty
        </div>
      </div>
    )
  }

  // Récup overview pour année sélectionnée + précédente
  var currentOverview = overviews.filter(function(o){ return o.year === selectedYear })[0]
  var prevOverview = overviews.filter(function(o){ return o.year === selectedYear - 1 })[0]
  var availableYears = overviews.map(function(o){ return o.year }).sort()
  
  // Filtrer products/menus pour l'année sélectionnée
  var currentProducts = products.filter(function(p){ return p.year === selectedYear })
  var currentMenus = menus.filter(function(p){ return p.year === selectedYear })
  
  // Monthly sales pour l'année sélectionnée
  var currentMonthly = monthlySales.filter(function(m){ return m.year === selectedYear })
  var prevMonthly = monthlySales.filter(function(m){ return m.year === selectedYear - 1 })
  
  // Top 5 produits par CA TTC
  var top5Products = currentProducts.slice(0, 5)
  // Top menu unique
  var topMenu = currentMenus[0]

  // Modes (depuis overview JSONB)
  var modesData = currentOverview && currentOverview.modes_breakdown ? currentOverview.modes_breakdown : {}
  var paymentsData = currentOverview && currentOverview.payments_breakdown ? currentOverview.payments_breakdown : {}

  // Calculs deltas
  var dCATtc = currentOverview && prevOverview ? deltaVsPrev(currentOverview.ca_ttc, prevOverview.ca_ttc) : null
  var dPanier = currentOverview && prevOverview ? deltaVsPrev(currentOverview.panier_moyen_ttc, prevOverview.panier_moyen_ttc) : null
  var dNbCom = currentOverview && prevOverview ? deltaVsPrev(currentOverview.nb_commandes, prevOverview.nb_commandes) : null
  var dArticles = currentOverview && prevOverview ? deltaVsPrev(currentOverview.nb_articles, prevOverview.nb_articles) : null

  // Max pour le graphe monthly
  var maxMonthlyCA = Math.max.apply(null, currentMonthly.map(function(m){ return Number(m.ca_ttc) || 0 }).concat([0]))
  if (maxMonthlyCA === 0) maxMonthlyCA = 1

  return (
    <div>
      {/* SÉLECTEUR D'ANNÉE */}
      <div style={{display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center'}}>
        <span style={{fontSize: 12, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5}}>Année :</span>
        {availableYears.map(function(y){
          return (
            <button key={y} type="button" onClick={function(){ setSelectedYear(y) }} style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 900,
              border: '2px solid ' + (y === selectedYear ? '#191923' : '#DDD'),
              background: y === selectedYear ? '#191923' : '#fff',
              color: y === selectedYear ? '#FFEB5A' : '#555',
              borderRadius: 20,
              cursor: 'pointer',
              fontFamily: 'Arial Narrow, Arial, sans-serif'
            }}>{y}</button>
          )
        })}
      </div>

      {currentOverview && (
        <>
          {/* GRANDE BANNIÈRE CA */}
          <div style={{
            background: 'linear-gradient(135deg, #FF82D7 0%, #FFB0D7 100%)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 14,
            border: '2px solid #191923',
            color: '#fff'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16}}>
              <div>
                <div style={{fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9}}>
                  Chiffre d&apos;affaires {selectedYear}
                </div>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 48, lineHeight: 1, marginTop: 4}}>
                  {fmtMoney(currentOverview.ca_ttc)} TTC
                </div>
                <div style={{fontSize: 14, marginTop: 4, opacity: 0.9}}>
                  {fmtMoney(currentOverview.ca_ht)} HT · {fmtNumber(currentOverview.nb_commandes)} commandes
                </div>
              </div>
              {dCATtc !== null && (
                <div style={{
                  background: '#191923',
                  padding: '12px 20px',
                  borderRadius: 10,
                  textAlign: 'right'
                }}>
                  <div style={{fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5}}>vs {selectedYear - 1}</div>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: dCATtc > 0 ? '#9DD3B0' : '#FFB3CD',
                    fontFamily: 'Arial Narrow, Arial, sans-serif',
                    lineHeight: 1
                  }}>
                    {fmtDelta(dCATtc)}
                  </div>
                  <div style={{fontSize: 11, opacity: 0.7, marginTop: 2}}>{fmtMoney(prevOverview.ca_ttc)}</div>
                </div>
              )}
            </div>
          </div>

          {/* GRID KPI 2x2 */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14}}>
            <KpiCard
              label="Panier moyen"
              value={fmtMoney(currentOverview.panier_moyen_ttc)}
              delta={fmtDelta(dPanier)}
              deltaColor={dPanier > 0 ? '#009D3A' : '#CC0066'}
              icon="🛒"
            />
            <KpiCard
              label="Commandes"
              value={fmtNumber(currentOverview.nb_commandes)}
              delta={fmtDelta(dNbCom)}
              deltaColor={dNbCom > 0 ? '#009D3A' : '#CC0066'}
              icon="📋"
            />
            <KpiCard
              label="Articles vendus"
              value={fmtNumber(currentOverview.nb_articles)}
              delta={fmtDelta(dArticles)}
              deltaColor={dArticles > 0 ? '#009D3A' : '#CC0066'}
              icon="🍔"
            />
            <KpiCard
              label="Temps moyen service"
              value={currentOverview.temps_moyen_sec ? Math.floor(currentOverview.temps_moyen_sec / 60) + 'min ' + (currentOverview.temps_moyen_sec % 60) + 's' : '—'}
              delta={null}
              icon="⏱️"
            />
          </div>

          {/* GRAPHE CA MENSUEL */}
          <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8}}>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923'}}>
                📈 CA mensuel {selectedYear}
              </div>
              <div style={{fontSize: 11, color: '#888'}}>
                Comparaison vs {selectedYear - 1}
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, alignItems: 'flex-end', height: 200, marginBottom: 8}}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(function(m){
                var cur = currentMonthly.filter(function(x){ return x.month === m })[0]
                var prev = prevMonthly.filter(function(x){ return x.month === m })[0]
                var curCA = cur ? Number(cur.ca_ttc) : 0
                var prevCA = prev ? Number(prev.ca_ttc) : 0
                var hCur = (curCA / maxMonthlyCA) * 180
                var hPrev = (prevCA / maxMonthlyCA) * 180
                return (
                  <div key={m} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 2}}>
                    <div style={{fontSize: 9, color: '#888', fontWeight: 900, marginBottom: 2}}>
                      {curCA > 0 ? fmtMoneyShort(curCA) : ''}
                    </div>
                    <div style={{display: 'flex', alignItems: 'flex-end', gap: 2, height: 180, width: '100%', justifyContent: 'center'}}>
                      {prevCA > 0 && (
                        <div title={selectedYear - 1 + ' : ' + fmtMoney(prevCA)} style={{
                          width: '40%',
                          height: hPrev + 'px',
                          background: '#FFB0D7',
                          borderRadius: '2px 2px 0 0',
                          minHeight: 1
                        }}></div>
                      )}
                      {curCA > 0 && (
                        <div title={selectedYear + ' : ' + fmtMoney(curCA)} style={{
                          width: '40%',
                          height: hCur + 'px',
                          background: '#FF82D7',
                          borderRadius: '2px 2px 0 0',
                          minHeight: 1
                        }}></div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, fontSize: 10, color: '#888', fontWeight: 900, textAlign: 'center'}}>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(function(m){
                return <div key={m}>{getMonthName(m)}</div>
              })}
            </div>
            <div style={{display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center', fontSize: 11}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                <span style={{width: 10, height: 10, background: '#FF82D7', borderRadius: 2, display: 'inline-block'}}></span> {selectedYear}
              </div>
              {prevOverview && (
                <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                  <span style={{width: 10, height: 10, background: '#FFB0D7', borderRadius: 2, display: 'inline-block'}}></span> {selectedYear - 1}
                </div>
              )}
            </div>
          </div>

          {/* MIX MODES */}
          {Object.keys(modesData).length > 0 && (
            <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', marginBottom: 12}}>
                🚪 Répartition des modes
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10}}>
                {Object.keys(modesData).map(function(mode){
                  var data = modesData[mode]
                  var pct = currentOverview.ca_ttc ? (Number(data.ttc) / Number(currentOverview.ca_ttc) * 100) : 0
                  return (
                    <div key={mode} style={{padding: 12, background: '#FAFAFA', borderRadius: 8, border: '1px solid #EBEBEB'}}>
                      <div style={{fontSize: 11, color: '#888', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5}}>
                        {mode.replace(/_/g, ' ')}
                      </div>
                      <div style={{fontSize: 22, fontWeight: 900, color: '#191923', marginTop: 4}}>
                        {pct.toFixed(1)}%
                      </div>
                      <div style={{fontSize: 11, color: '#555', marginTop: 2}}>
                        {fmtMoney(data.ttc)} · {fmtNumber(data.nb)} commandes
                      </div>
                      <div style={{marginTop: 6, height: 6, background: '#EBEBEB', borderRadius: 3, overflow: 'hidden'}}>
                        <div style={{height: '100%', width: pct + '%', background: '#FF82D7'}}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* MIX RÈGLEMENTS */}
          {Object.keys(paymentsData).length > 0 && (
            <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', marginBottom: 12}}>
                💳 Règlements
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10}}>
                {Object.keys(paymentsData).map(function(p){
                  var data = paymentsData[p]
                  var pct = currentOverview.ca_ttc ? (Number(data.ttc) / Number(currentOverview.ca_ttc) * 100) : 0
                  return (
                    <div key={p} style={{padding: 12, background: '#FFFBE5', borderRadius: 8, border: '1px solid #FFEB5A'}}>
                      <div style={{fontSize: 11, color: '#191923', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5}}>
                        {p.replace(/_/g, ' ')}
                      </div>
                      <div style={{fontSize: 18, fontWeight: 900, color: '#191923', marginTop: 4}}>
                        {fmtMoneyShort(data.ttc)}
                      </div>
                      <div style={{fontSize: 11, color: '#555', marginTop: 2}}>
                        {pct.toFixed(1)}% · {fmtNumber(data.nb)} trx
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TOP PRODUITS */}
          {top5Products.length > 0 && (
            <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8}}>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923'}}>
                  🏆 Top 5 produits
                </div>
                <div style={{fontSize: 11, color: '#888'}}>
                  par CA TTC {selectedYear}
                </div>
              </div>
              <div>
                {top5Products.map(function(p, idx){
                  var pct = currentOverview.ca_ttc ? (Number(p.ca_ttc) / Number(currentOverview.ca_ttc) * 100) : 0
                  return (
                    <div key={p.id} style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: 6,
                      background: idx === 0 ? '#FFEB5A' : '#FAFAFA',
                      display: 'grid',
                      gridTemplateColumns: '30px 1fr 90px 90px',
                      gap: 12,
                      alignItems: 'center'
                    }}>
                      <div style={{fontSize: 18, fontWeight: 900, color: idx === 0 ? '#191923' : '#888'}}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div style={{fontSize: 13, fontWeight: 900, color: '#191923'}}>{p.zelty_product_name}</div>
                        <div style={{fontSize: 10, color: '#555', marginTop: 2}}>
                          {fmtNumber(p.qte)} vendus · prix moyen {fmtMoney(p.prix_moyen)}
                        </div>
                      </div>
                      <div style={{textAlign: 'right', fontWeight: 900, fontSize: 14, fontVariantNumeric: 'tabular-nums'}}>
                        {fmtMoney(p.ca_ttc)}
                      </div>
                      <div style={{textAlign: 'right', fontSize: 12, fontWeight: 900, color: '#555', fontVariantNumeric: 'tabular-nums'}}>
                        {pct.toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TOP MENU */}
          {topMenu && (
            <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', marginBottom: 12}}>
                🍽️ Top menus
              </div>
              <div>
                {currentMenus.slice(0, 5).map(function(m, idx){
                  var pct = currentOverview.ca_ttc ? (Number(m.ca_ttc) / Number(currentOverview.ca_ttc) * 100) : 0
                  return (
                    <div key={m.id} style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      marginBottom: 6,
                      background: idx === 0 ? '#FFEB5A' : '#FAFAFA',
                      display: 'grid',
                      gridTemplateColumns: '30px 1fr 90px 90px',
                      gap: 12,
                      alignItems: 'center'
                    }}>
                      <div style={{fontSize: 18, fontWeight: 900, color: idx === 0 ? '#191923' : '#888'}}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div style={{fontSize: 13, fontWeight: 900, color: '#191923'}}>{m.zelty_product_name}</div>
                        <div style={{fontSize: 10, color: '#555', marginTop: 2}}>
                          {fmtNumber(m.qte)} vendus · prix moyen {fmtMoney(m.prix_moyen)}
                        </div>
                      </div>
                      <div style={{textAlign: 'right', fontWeight: 900, fontSize: 14, fontVariantNumeric: 'tabular-nums'}}>
                        {fmtMoney(m.ca_ttc)}
                      </div>
                      <div style={{textAlign: 'right', fontSize: 12, fontWeight: 900, color: '#555', fontVariantNumeric: 'tabular-nums'}}>
                        {pct.toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STATS DIVERSES */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14}}>
            {currentOverview.tickets_offerts_nb > 0 && (
              <KpiCard
                label="Tickets offerts"
                value={fmtNumber(currentOverview.tickets_offerts_nb)}
                delta={fmtMoney(currentOverview.tickets_offerts_montant)}
                deltaColor="#888"
                icon="🎁"
              />
            )}
            {currentOverview.remises_nb > 0 && (
              <KpiCard
                label="Remises"
                value={fmtNumber(currentOverview.remises_nb)}
                delta={fmtMoney(currentOverview.remises_montant)}
                deltaColor="#888"
                icon="💸"
              />
            )}
            {currentOverview.tickets_annules_nb > 0 && (
              <KpiCard
                label="Tickets annulés"
                value={fmtNumber(currentOverview.tickets_annules_nb)}
                delta={fmtMoney(currentOverview.tickets_annules_montant)}
                deltaColor="#CC0066"
                icon="❌"
              />
            )}
          </div>

          {/* TVA breakdown */}
          {currentOverview.tva_10_ttc && (
            <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 20, color: '#191923', marginBottom: 12}}>
                📊 Répartition TVA
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10}}>
                <div style={{padding: 12, background: '#FAFAFA', borderRadius: 8}}>
                  <div style={{fontSize: 11, color: '#888', fontWeight: 900}}>TVA 10% (alimentaire)</div>
                  <div style={{fontSize: 18, fontWeight: 900, marginTop: 4}}>{fmtMoney(currentOverview.tva_10_ttc)} TTC</div>
                  <div style={{fontSize: 11, color: '#555'}}>{fmtMoney(currentOverview.tva_10_ht)} HT</div>
                </div>
                {currentOverview.tva_20_ttc && (
                  <div style={{padding: 12, background: '#FAFAFA', borderRadius: 8}}>
                    <div style={{fontSize: 11, color: '#888', fontWeight: 900}}>TVA 20% (autres)</div>
                    <div style={{fontSize: 18, fontWeight: 900, marginTop: 4}}>{fmtMoney(currentOverview.tva_20_ttc)} TTC</div>
                    <div style={{fontSize: 11, color: '#555'}}>{fmtMoney(currentOverview.tva_20_ht)} HT</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KpiCard(props) {
  return (
    <div style={{padding: 14, background: '#fff', borderRadius: 8, border: '1px solid #EBEBEB'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6}}>
        <div style={{fontSize: 11, color: '#888', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5}}>
          {props.label}
        </div>
        {props.icon && <span style={{fontSize: 18}}>{props.icon}</span>}
      </div>
      <div style={{fontSize: 22, fontWeight: 900, color: '#191923', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1.1}}>
        {props.value}
      </div>
      {props.delta && (
        <div style={{fontSize: 11, fontWeight: 900, marginTop: 4, color: props.deltaColor || '#888'}}>
          {props.delta}
        </div>
      )}
    </div>
  )
}
