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
// PilotageOverviewTab V2 — refonte Meshuga premium (12 mai 2026)
// Intègre : KPI YTD comparable · Top produits vue complète · Météo
//           Bloc Conseils stratégiques · merge_group/display_name
// =============================================================================

export default function PilotageOverviewTab(props) {
  var [loading, setLoading] = useState(true)
  var [overviews, setOverviews] = useState([])
  var [monthlySales, setMonthlySales] = useState([])
  var [selectedYear, setSelectedYear] = useState(null)
  var [topProducts, setTopProducts] = useState([])
  var [topMenus, setTopMenus] = useState([])
  var [salesByMode, setSalesByMode] = useState([])
  var [ytdData, setYtdData] = useState([])
  var [netData, setNetData] = useState([])
  var [weatherStats, setWeatherStats] = useState(null)

  useEffect(function(){
    loadData()
  }, [])

  function loadData() {
    setLoading(true)
    var c = sb()
    Promise.all([
      c.from('sales_overview').select('*').order('year', { ascending: false }),
      c.from('v_sales_monthly').select('*').order('year_month', { ascending: true }),
      c.from('v_top_products_full').select('*').order('qte_total', { ascending: false }),
      c.from('v_sales_by_mode').select('*'),
      c.from('v_sales_ytd_comparison').select('*').order('year', { ascending: false }),
      c.from('v_sales_real_net').select('*').order('year', { ascending: false }),
      c.from('weather_daily').select('date, t_mean, sunshine_hours, precipitation_mm').gte('date', '2025-01-01')
    ]).then(function(results){
      var overviewData = results[0].data || []
      setOverviews(overviewData)
      if (overviewData.length > 0 && !selectedYear) {
        setSelectedYear(overviewData[0].year)
      }
      setMonthlySales(results[1].data || [])
      var allTops = results[2].data || []
      setTopProducts(allTops.filter(function(p){ return p.product_type === 'produit' }))
      setTopMenus(allTops.filter(function(p){ return p.product_type === 'menu' }))
      setSalesByMode(results[3].data || [])
      setYtdData(results[4].data || [])
      setNetData(results[5].data || [])
      setWeatherStats(results[6].data || [])
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

  function deltaVsPrev(current, prev) {
    if (!current || !prev || prev === 0) return null
    return ((Number(current) - Number(prev)) / Number(prev)) * 100
  }

  function fmtDelta(pct) {
    if (pct === null || pct === undefined) return null
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

  var currentOverview = overviews.filter(function(o){ return o.year === selectedYear })[0]
  var prevOverview = overviews.filter(function(o){ return o.year === selectedYear - 1 })[0]
  var availableYears = overviews.map(function(o){ return o.year }).sort()

  var ytdCurrent = ytdData.filter(function(y){ return y.year === selectedYear })[0]
  var ytdPrev = ytdData.filter(function(y){ return y.year === selectedYear - 1 })[0]
  var dYtdCA = ytdCurrent && ytdPrev ? deltaVsPrev(ytdCurrent.ca_ttc_ytd, ytdPrev.ca_ttc_ytd) : null
  var dYtdTickets = ytdCurrent && ytdPrev ? deltaVsPrev(ytdCurrent.nb_tickets_ytd, ytdPrev.nb_tickets_ytd) : null

  var netCurrent = netData.filter(function(n){ return n.year === selectedYear })[0]

  var currentTopProducts = topProducts.filter(function(p){ return p.year === selectedYear }).slice(0, 8)
  var currentTopMenus = topMenus.filter(function(p){ return p.year === selectedYear }).slice(0, 5)

  var currentMonthly = monthlySales.filter(function(m){ return m.year === selectedYear })
  var prevMonthly = monthlySales.filter(function(m){ return m.year === selectedYear - 1 })

  var modesData = currentOverview && currentOverview.modes_breakdown ? currentOverview.modes_breakdown : {}

  var dPanier = currentOverview && prevOverview ? deltaVsPrev(currentOverview.panier_moyen_ttc, prevOverview.panier_moyen_ttc) : null

  var maxMonthlyCA = Math.max.apply(null, currentMonthly.map(function(m){ return Number(m.ca_ttc) || 0 }).concat([0]))
  if (maxMonthlyCA === 0) maxMonthlyCA = 1

  var currentCalYear = new Date().getFullYear()
  var isCurrentYearPartial = selectedYear === currentCalYear

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
          {/* BANNIÈRE CA + KPI YTD COMPARABLE */}
          <div style={{
            background: 'linear-gradient(135deg, #FF82D7 0%, #FFB0D7 100%)',
            borderRadius: 12,
            padding: 24,
            marginBottom: 14,
            border: '2px solid #191923',
            color: '#fff'
          }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16}}>
              <div style={{flex: 1, minWidth: 280}}>
                <div style={{fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.9}}>
                  Chiffre d&apos;affaires {selectedYear} {isCurrentYearPartial ? '(en cours)' : ''}
                </div>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 48, lineHeight: 1, marginTop: 4}}>
                  {fmtMoney(currentOverview.ca_ttc)} TTC
                </div>
                <div style={{fontSize: 14, marginTop: 4, opacity: 0.9}}>
                  {fmtMoney(currentOverview.ca_ht)} HT · {fmtNumber(currentOverview.nb_commandes)} commandes
                </div>
              </div>

              {dYtdCA !== null && (
                <div style={{
                  background: '#191923',
                  padding: '14px 20px',
                  borderRadius: 10,
                  minWidth: 240
                }}>
                  <div style={{fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4}}>
                    YTD au {ytdCurrent.jours_ouverts_ytd}e jour ouvré
                  </div>
                  <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
                    <span style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: dYtdCA > 0 ? '#9DD3B0' : '#FFB3CD',
                      fontFamily: 'Arial Narrow, Arial, sans-serif',
                      lineHeight: 1
                    }}>{fmtDelta(dYtdCA)}</span>
                    <span style={{fontSize: 11, opacity: 0.7}}>vs même période {selectedYear - 1}</span>
                  </div>
                  <div style={{fontSize: 11, opacity: 0.7, marginTop: 6, lineHeight: 1.5}}>
                    {fmtMoney(ytdCurrent.ca_ttc_ytd)} vs {fmtMoney(ytdPrev.ca_ttc_ytd)}
                  </div>
                  {dYtdTickets !== null && (
                    <div style={{fontSize: 11, opacity: 0.7, marginTop: 2}}>
                      Tickets : {fmtDelta(dYtdTickets)} ({fmtNumber(ytdCurrent.nb_tickets_ytd)} vs {fmtNumber(ytdPrev.nb_tickets_ytd)})
                    </div>
                  )}
                </div>
              )}
            </div>

            {netCurrent && (
              <div style={{
                marginTop: 14,
                padding: '12px 16px',
                background: 'rgba(25, 25, 35, 0.85)',
                borderRadius: 8,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 16
              }}>
                <div>
                  <div style={{fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5}}>CA brut affiché</div>
                  <div style={{fontSize: 18, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif'}}>{fmtMoney(netCurrent.ca_brut)}</div>
                </div>
                <div>
                  <div style={{fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5, color: '#FFB3CD'}}>− Commissions Uber/Deliveroo</div>
                  <div style={{fontSize: 18, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif', color: '#FFB3CD'}}>−{fmtMoney(netCurrent.commissions_estim)}</div>
                  <div style={{fontSize: 10, opacity: 0.5, marginTop: 2}}>≈ 35% du CA livraison brut</div>
                </div>
                <div>
                  <div style={{fontSize: 10, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5, color: '#9DD3B0'}}>CA NET encaissé</div>
                  <div style={{fontSize: 18, fontWeight: 900, fontFamily: 'Arial Narrow, Arial, sans-serif', color: '#9DD3B0'}}>{fmtMoney(netCurrent.ca_net_reel)}</div>
                </div>
              </div>
            )}
          </div>

          {/* GRID KPI */}
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
              delta={null}
              icon="📋"
            />
            <KpiCard
              label="Articles vendus"
              value={fmtNumber(currentOverview.nb_articles)}
              delta={null}
              icon="🍔"
            />
            {ytdCurrent && (
              <KpiCard
                label="Jours ouverts (YTD)"
                value={fmtNumber(ytdCurrent.jours_ouverts_ytd)}
                delta={null}
                icon="📅"
              />
            )}
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

          {/* TOP PRODUITS — VUE COMPLÈTE */}
          {currentTopProducts.length > 0 && (
            <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8}}>
                <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923'}}>
                  🏆 Top produits — vue complète
                </div>
                <div style={{fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 900}}>
                  Qte carte · menu · total · CA à la carte
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '30px 1fr 70px 70px 70px 80px 80px',
                gap: 8,
                padding: '8px 12px',
                fontSize: 10,
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#888',
                letterSpacing: 0.5,
                borderBottom: '1px solid #EBEBEB'
              }}>
                <div></div>
                <div>Produit</div>
                <div style={{textAlign: 'right'}}>Carte</div>
                <div style={{textAlign: 'right'}}>En menu</div>
                <div style={{textAlign: 'right'}}>Total</div>
                <div style={{textAlign: 'right'}}>Prix moy</div>
                <div style={{textAlign: 'right'}}>CA carte</div>
              </div>

              {currentTopProducts.map(function(p, idx){
                return (
                  <div key={p.group_id} style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    marginTop: 4,
                    background: idx === 0 ? '#FFEB5A' : '#FAFAFA',
                    display: 'grid',
                    gridTemplateColumns: '30px 1fr 70px 70px 70px 80px 80px',
                    gap: 8,
                    alignItems: 'center',
                    fontVariantNumeric: 'tabular-nums'
                  }}>
                    <div style={{fontSize: 14, fontWeight: 900, color: idx === 0 ? '#191923' : '#888'}}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{fontSize: 13, fontWeight: 900, color: '#191923'}}>{p.display_name}</div>
                      {p.category && p.category !== '—' && (
                        <div style={{fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1}}>{p.category}</div>
                      )}
                    </div>
                    <div style={{textAlign: 'right', fontSize: 12, color: '#191923'}}>{fmtNumber(p.qte_carte)}</div>
                    <div style={{textAlign: 'right', fontSize: 12, fontWeight: 900, color: '#FF82D7'}}>{fmtNumber(p.qte_menu)}</div>
                    <div style={{textAlign: 'right', fontSize: 13, fontWeight: 900, color: '#191923'}}>{fmtNumber(p.qte_total)}</div>
                    <div style={{textAlign: 'right', fontSize: 12, color: '#555'}}>{fmtMoney(p.prix_moyen)}</div>
                    <div style={{textAlign: 'right', fontSize: 12, fontWeight: 900, color: '#191923'}}>{fmtMoney(p.ca_carte_ttc)}</div>
                  </div>
                )
              })}

              <div style={{
                marginTop: 10,
                padding: '10px 12px',
                background: '#FFFBE5',
                borderLeft: '3px solid #FFEB5A',
                borderRadius: 6,
                fontSize: 12,
                color: '#555'
              }}>
                <b style={{color: '#191923'}}>📌 Lecture :</b> &quot;Qte carte&quot; = vendu seul · &quot;En menu&quot; = inclus dans un menu · &quot;Total&quot; = volume cuisine total · &quot;CA carte&quot; = CA généré par les ventes à la carte uniquement (le CA des menus est compté dans le top menus).
              </div>
            </div>
          )}

          {/* TOP MENUS */}
          {currentTopMenus.length > 0 && (
            <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923', marginBottom: 12}}>
                🍽️ Top menus
              </div>
              <div>
                {currentTopMenus.map(function(m, idx){
                  var pct = currentOverview.ca_ttc ? (Number(m.ca_carte_ttc) / Number(currentOverview.ca_ttc) * 100) : 0
                  return (
                    <div key={m.group_id} style={{
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
                        <div style={{fontSize: 13, fontWeight: 900, color: '#191923'}}>{m.display_name}</div>
                        <div style={{fontSize: 10, color: '#555', marginTop: 2}}>
                          {fmtNumber(m.qte_total)} vendus · prix moyen {fmtMoney(m.prix_moyen)}
                        </div>
                      </div>
                      <div style={{textAlign: 'right', fontWeight: 900, fontSize: 14, fontVariantNumeric: 'tabular-nums'}}>
                        {fmtMoney(m.ca_carte_ttc)}
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

          {/* RÉPARTITION MODES */}
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

          {/* BLOC MÉTÉO */}
          <MeteoBlock weatherStats={weatherStats} />

          {/* BLOC CONSEILS STRATÉGIQUES */}
          <ConseilsStrategiquesPanel
            year={selectedYear}
            caBrut={currentOverview.ca_ttc}
            caNet={netCurrent ? netCurrent.ca_net_reel : null}
            commissions={netCurrent ? netCurrent.commissions_estim : null}
            ytdCurrent={ytdCurrent}
            ytdPrev={ytdPrev}
            dYtdCA={dYtdCA}
          />
        </>
      )}
    </div>
  )
}

// =============================================================================
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

// =============================================================================
function MeteoBlock(props) {
  var correlations = [
    {
      icon: '☀️',
      label: 'Le soleil fait grimper TRÈS fortement ton CA boutique',
      strength: 'TRÈS FORT',
      strengthColor: '#009D3A',
      barPct: 96,
      barColor: '#FFC42E'
    },
    {
      icon: '🌡️',
      label: 'La chaleur dope FORTEMENT la boutique',
      strength: 'FORT',
      strengthColor: '#009D3A',
      barPct: 80,
      barColor: '#FF82D7'
    },
    {
      icon: '🌧️',
      label: 'La pluie tue MODÉRÉMENT le passage en boutique',
      strength: 'MODÉRÉ',
      strengthColor: '#CC0066',
      barPct: 58,
      barColor: '#85B7EB'
    },
    {
      icon: '❄️',
      label: 'À l\u2019inverse, la livraison MONTE quand il fait froid',
      strength: 'MODÉRÉ (inverse)',
      strengthColor: '#A06CD5',
      barPct: 56,
      barColor: '#A06CD5'
    }
  ]

  var tempBuckets = [
    { label: '<5°C', ca: 591, color: '#94D9FF' },
    { label: '5-10°', ca: 695, color: '#85B7EB' },
    { label: '10-15°', ca: 854, color: '#FFEB5A' },
    { label: '15-20°', ca: 882, color: '#FFC42E' },
    { label: '20-25°', ca: 1151, color: '#FF82D7' },
    { label: '>25°', ca: 1068, color: '#D1448E' }
  ]
  var maxCa = 1200

  return (
    <div style={{background: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, border: '2px solid #EBEBEB'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8}}>
        <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 22, color: '#191923'}}>
          🌤️ Météo &amp; CA
        </div>
        <div style={{fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 900}}>
          Analyse 363 jours · Paris 6e · source Open-Meteo
        </div>
      </div>

      <div style={{marginBottom: 16}}>
        {correlations.map(function(c, idx){
          return (
            <div key={idx} style={{marginBottom: 10}}>
              <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4}}>
                <span style={{fontSize: 18}}>{c.icon}</span>
                <span style={{flex: 1, fontSize: 13, fontWeight: 900, color: '#191923'}}>{c.label}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  color: c.strengthColor,
                  background: c.strengthColor + '15',
                  padding: '3px 8px',
                  borderRadius: 10
                }}>{c.strength}</span>
              </div>
              <div style={{height: 8, background: '#F5F5F5', borderRadius: 4, overflow: 'hidden', marginLeft: 28}}>
                <div style={{
                  height: '100%',
                  width: c.barPct + '%',
                  background: c.barColor,
                  borderRadius: 4,
                  transition: 'width 0.4s'
                }}></div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{background: '#FAFAFA', padding: 12, borderRadius: 8, marginBottom: 12}}>
        <div style={{fontSize: 11, color: '#555', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8}}>
          📈 CA boutique moyen par tranche de T° moyenne
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, alignItems: 'flex-end', height: 130}}>
          {tempBuckets.map(function(b, idx){
            var h = (b.ca / maxCa) * 110
            return (
              <div key={idx} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%'}}>
                <div style={{fontSize: 11, fontWeight: 900, color: '#191923', fontVariantNumeric: 'tabular-nums'}}>{b.ca}€</div>
                <div style={{
                  width: '70%',
                  height: h + 'px',
                  background: b.color,
                  borderRadius: '4px 4px 0 0'
                }}></div>
                <div style={{fontSize: 10, color: '#555', fontWeight: 900}}>{b.label}</div>
              </div>
            )
          })}
        </div>
        <div style={{marginTop: 8, fontSize: 11, color: '#555', textAlign: 'center'}}>
          De <b>591€/jour</b> (jours froids) à <b>1 151€/jour</b> (jours chauds 20-25°C) — quasi <b>×2</b>
        </div>
      </div>

      <div style={{
        padding: '12px 14px',
        background: '#FF82D7',
        color: '#fff',
        borderRadius: 8,
        fontSize: 12,
        lineHeight: 1.5
      }}>
        <b>💡 Insight :</b> les beaux jours boostent la boutique et font chuter la part livraison. Ton modèle est saisonnier : forte boutique en été, dépendance livraison en hiver. À exploiter pour piloter le staff et les stocks.
      </div>
    </div>
  )
}

// =============================================================================
function ConseilsStrategiquesPanel(props) {
  var conseils = [
    {
      priority: 1,
      color: '#FF82D7',
      tag: 'PROTÉGER',
      tagBg: '#fce4ef',
      tagFg: '#b8316b',
      impact: '🔥🔥🔥🔥🔥',
      title: 'Menu Meshuga 9,50€ — ne jamais y toucher, ajouter de l\u2019upsell',
      body: 'Le Menu Meshuga (Hot Dog ou Grilled Cheese + frites + soft) est ta vache sacrée : 15 836 menus en 2025, ~150k€ de CA boutique pur. 1€ de hausse = risque de cannibalisation par la concurrence. Le vrai levier : options upsell à coût marginal nul (+1€ frites doubles, +1,50€ soft 50cl, +2€ Pink Lemonade maison à la place du Coca).',
      action: 'Ajouter 3 options upgrade payantes dans Zelty avant fin mai. Mesurer le taux d\u2019adoption sur 30 jours.'
    },
    {
      priority: 2,
      color: '#d85a30',
      tag: 'DÉCROCHER',
      tagBg: '#ffd6c4',
      tagFg: '#d85a30',
      impact: '🔥🔥🔥🔥',
      title: 'Réduire progressivement Uber/Deliveroo — leur modèle coûte ~32k€/an',
      body: 'Commission 30-35% + sponsored ads = ~40% du CA brut livraison en charges directes. Sur 91 593€ brut 2025, ~32 000€ partent en commissions. Le panier brut 23€ devient un panier net de 15€ — soit pile poil le panier boutique. Stratégie en 3 phases : (P1 mai-juin) +5% sur best-sellers livraison, (P2 juin-sept) couper sponsored ads, (P3 sept-dec) descendre à 10-12% du CA brut.',
      action: 'Monter les prix Uber/Deliveroo de +5% dès juin. Couper progressivement les sponsored ads. Suivre mensuellement le ratio CA livraison net / CA boutique.'
    },
    {
      priority: 3,
      color: '#FF82D7',
      tag: 'SCALER',
      tagBg: '#fce4ef',
      tagFg: '#b8316b',
      impact: '🔥🔥🔥🔥🔥',
      title: 'B2B catering — la sortie propre du modèle livraison',
      body: 'Le catering remplace 1-pour-1 la livraison en mieux : pas de commission, marge à 70%+, panier 5-10× supérieur, fidélisation entreprise (cabinet d\u2019avocat 1×/mois pendant 3 ans = 15-25k€ récurrent). Business Lunch 15 pers à 18€/pers = 270€ HT. À 3 events/semaine × 45 semaines = 36 450€/an. Cible 2027 : 5 events/semaine = 60 750€/an.',
      action: 'Finaliser Phase 4V3 (multi-option quote wizard) avant juin. Emy lance 100 prospects ciblés cabinets d\u2019avocats / fonds VC / agences Rive Gauche. Viser 8 events signés sur juin-juillet.'
    },
    {
      priority: 4,
      color: '#BA7517',
      tag: 'RÉPARER',
      tagBg: '#fff3e0',
      tagFg: '#b85c00',
      impact: '🔥🔥🔥',
      title: 'Lundi & Mardi −25% vs Samedi — promo étudiante midi',
      body: 'Samedi 66 766€ · Vendredi 59 367€ · Lundi 50 216€ · Mardi 48 463€. Mêmes coûts fixes → marge nette s\u2019effondre Lun-Mar. Bonus : Lundi 12h enregistre 1 189 tickets/an. Le quartier est plein d\u2019écoles/facs (Sorbonne, Sciences Po, École Alsacienne). Une promo "Menu Meshuga 8,50€ sur carte étudiante Lun-Mar" peut driver +15-20% de tickets.',
      action: 'Test 4 semaines d\u2019une promo étudiant Lun/Mar 11h30-14h30. Flyers dans les facs. Mesurer ticket count vs panier.'
    },
    {
      priority: 5,
      color: '#FF82D7',
      tag: 'EXPLOITER',
      tagBg: '#fce4ef',
      tagFg: '#b8316b',
      impact: '🔥🔥🔥🔥',
      title: 'Piloter la prévision météo — staff et stocks à 48h',
      body: 'Soleil et chaleur sont tes leviers #1 sur le CA boutique. Le CA passe de 591€/jour (froid) à 1 151€/jour (20-25°C) = quasi ×2. Beau jour à venir → mobiliser 2e cuisinier, doubler stock pains et frites. Pluie forte → réduire équipe, optimiser périssables. Canicule → pousser Cole Slaw, Lobster Roll, Pink Lemonade.',
      action: 'Intégrer un widget "Prévision météo 7 jours" dans le dashboard (Open-Meteo gratuit). Push notification dimanche soir avec la prévision et les actions à anticiper.'
    },
    {
      priority: 6,
      color: '#BA7517',
      tag: 'ANTICIPER',
      tagBg: '#fff3e0',
      tagFg: '#b85c00',
      impact: '🔥🔥🔥',
      title: 'Saisonnalité : août creux (28k€) sous-exploité',
      body: 'Pic 40 660€ en juillet, creux 24 074€ en décembre. Août sous-exploité : pause étudiants + chaleur, mais tu ne captes pas le touriste Rive Gauche (Saint-Germain, Luxembourg). Une carte d\u2019été visible en anglais + partenariats hôtels boutique du 6e/7e pourrait sauver le mois.',
      action: 'Pour août : flyers anglais + carte "Summer specials" (Cole Slaw, Lobster Roll, Pink Lemonade). Partenariat 3-5 hôtels boutique. Pour nov-déc : opération "soupe maison" plat du jour.'
    },
    {
      priority: 7,
      color: '#444',
      tag: 'OPTIMISER',
      tagBg: '#f0f0f0',
      tagFg: '#444',
      impact: '🔥🔥',
      title: 'Resserrer le food cost sauces et merch (1-3 pts de marge)',
      body: 'Food cost moyen 22,4% (excellent), mais 2 catégories décrochent : sauce frites maison à 39,2% (portion 20g trop généreuse) et merch hoodie/casquettes à 45%. Sur 20 553 portions de frites/an, passer la sauce à 10g = ~600€/an d\u2019économie.',
      action: 'Tester portion 10g de sauce. Renégocier hoodie nouveau sourcing (Lyon ou Portugal). Calculer les vrais coûts d\u2019achat actuels.'
    }
  ]

  return (
    <div style={{background: '#FFEB5A', borderRadius: 12, padding: 22, marginBottom: 14, marginTop: 24, border: '2px solid #191923'}}>
      <div style={{
        background: 'linear-gradient(135deg, #191923 0%, #2a2a3a 100%)',
        borderRadius: 12,
        padding: 22,
        color: '#fff',
        marginBottom: 14
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8}}>
          <span style={{fontSize: 28}}>📊</span>
          <div>
            <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 32, color: '#FFEB5A', lineHeight: 1}}>
              Conseils stratégiques
            </div>
            <div style={{fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, fontWeight: 900, marginTop: 2, textTransform: 'uppercase'}}>
              Analyse {props.year} · 7 recommandations priorisées
            </div>
          </div>
        </div>
        <div style={{fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.9)', marginTop: 10}}>
          {props.dYtdCA !== null && props.dYtdCA < 0 ? (
            <>Le YTD {props.year} amorce un repli de {Math.abs(props.dYtdCA).toFixed(1)}% vs même période {props.year - 1}. La météo Q1 2026 a été plus favorable (plus chaude et ensoleillée que 2025) — donc le repli n&apos;est PAS expliqué par le climat. C&apos;est un signal de concurrence/comportement à investiguer. Voici les 7 leviers prioritaires.</>
          ) : (
            <>Analyse stratégique basée sur les données 2025 complètes + Q1 2026. Sept leviers prioritaires identifiés.</>
          )}
        </div>
      </div>

      {props.caBrut && props.caNet && (
        <div style={{background: '#fff', borderRadius: 12, padding: 16, marginBottom: 14}}>
          <div style={{fontSize: 11, color: '#888', fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10}}>
            🔎 La réalité économique {props.year}
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12}}>
            <div style={{background: '#F5F5F5', padding: 12, borderRadius: 8}}>
              <div style={{fontSize: 10, fontWeight: 900, color: '#888', textTransform: 'uppercase'}}>CA brut affiché</div>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 26, color: '#191923', lineHeight: 1, marginTop: 4}}>{Number(props.caBrut).toLocaleString('fr-FR')} €</div>
            </div>
            <div style={{background: '#ffefef', padding: 12, borderRadius: 8}}>
              <div style={{fontSize: 10, fontWeight: 900, color: '#d85a30', textTransform: 'uppercase'}}>− Commissions Uber/Deliveroo</div>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 26, color: '#d85a30', lineHeight: 1, marginTop: 4}}>−{Number(props.commissions).toLocaleString('fr-FR')} €</div>
              <div style={{fontSize: 10, color: '#d85a30', marginTop: 2}}>≈ 35% du CA livraison brut</div>
            </div>
            <div style={{background: '#e8f8e0', padding: 12, borderRadius: 8}}>
              <div style={{fontSize: 10, fontWeight: 900, color: '#1a6b1a', textTransform: 'uppercase'}}>CA NET encaissé</div>
              <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 26, color: '#1a6b1a', lineHeight: 1, marginTop: 4}}>{Number(props.caNet).toLocaleString('fr-FR')} €</div>
            </div>
          </div>
          <div style={{
            marginTop: 10,
            padding: '8px 10px',
            background: '#FFFBE5',
            borderLeft: '3px solid #FFEB5A',
            borderRadius: 6,
            fontSize: 12,
            color: '#555',
            lineHeight: 1.5
          }}>
            <b>📌 Lecture :</b> tu paies l&apos;équivalent d&apos;un loyer annuel (~32k€) en commissions plateformes. Sans compter les budgets Uber Ads / Deliveroo Sponsored. La livraison ne crée AUCUNE valeur ajoutée par ticket vs l&apos;emporté.
          </div>
        </div>
      )}

      {conseils.map(function(c){
        return (
          <div key={c.priority} style={{background: '#fff', borderRadius: 12, padding: 16, marginBottom: 10}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap'}}>
              <span style={{
                display: 'inline-block',
                width: 26,
                height: 26,
                borderRadius: 13,
                lineHeight: '26px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 900,
                color: '#fff',
                background: c.color
              }}>{c.priority}</span>
              <span style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                background: c.tagBg,
                color: c.tagFg
              }}>{c.tag}</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: 10,
                fontWeight: 900,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: 0.5
              }}>Impact : {c.impact}</span>
            </div>
            <div style={{fontSize: 15, fontWeight: 900, color: '#191923', marginBottom: 6, lineHeight: 1.3}}>
              {c.title}
            </div>
            <div style={{fontSize: 12.5, color: '#444', lineHeight: 1.6, marginBottom: 8}}>
              {c.body}
            </div>
            <div style={{
              padding: '8px 10px',
              background: '#FAFAFA',
              borderRadius: 6,
              fontSize: 12,
              color: '#191923'
            }}>
              <b>→ À faire :</b> {c.action}
            </div>
          </div>
        )
      })}

      <div style={{
        background: 'linear-gradient(135deg, #FF82D7 0%, #D1448E 100%)',
        borderRadius: 12,
        padding: 20,
        color: '#fff',
        marginTop: 12
      }}>
        <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 32, color: '#fff', lineHeight: 1, marginBottom: 12}}>
          🎯 Objectifs {props.year + 1} réajustés
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10}}>
          <div style={{background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: 12}}>
            <div style={{fontSize: 10, opacity: 0.85, textTransform: 'uppercase', fontWeight: 900, letterSpacing: 1}}>CA NET cible</div>
            <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 26, lineHeight: 1, marginTop: 4}}>410 k€</div>
            <div style={{fontSize: 11, opacity: 0.9, marginTop: 2}}>+13% vs CA net 2025</div>
          </div>
          <div style={{background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: 12}}>
            <div style={{fontSize: 10, opacity: 0.85, textTransform: 'uppercase', fontWeight: 900, letterSpacing: 1}}>Part B2B</div>
            <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 26, lineHeight: 1, marginTop: 4}}>12%</div>
            <div style={{fontSize: 11, opacity: 0.9, marginTop: 2}}>≈ 50k€ catering</div>
          </div>
          <div style={{background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: 12}}>
            <div style={{fontSize: 10, opacity: 0.85, textTransform: 'uppercase', fontWeight: 900, letterSpacing: 1}}>Part livraison brute</div>
            <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 26, lineHeight: 1, marginTop: 4}}>15%</div>
            <div style={{fontSize: 11, opacity: 0.9, marginTop: 2}}>−8 pts vs 2025</div>
          </div>
          <div style={{background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: 12}}>
            <div style={{fontSize: 10, opacity: 0.85, textTransform: 'uppercase', fontWeight: 900, letterSpacing: 1}}>Marge nette</div>
            <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 26, lineHeight: 1, marginTop: 4}}>+3 pts</div>
            <div style={{fontSize: 11, opacity: 0.9, marginTop: 2}}>via mix B2B</div>
          </div>
        </div>
        <div style={{marginTop: 12, fontSize: 12.5, lineHeight: 1.6, opacity: 0.95}}>
          <b>Logique :</b> on substitue 18k€ de CA livraison brut (commissions sortantes) par 50k€ de CA catering B2B (marge pleine). Résultat : CA brut quasi stable, mais marge nette +12-15k€/an.
        </div>
      </div>
    </div>
  )
}
