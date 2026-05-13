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
// FoodCostAlertWidget — alertes recettes en dérive de coût
// Source : vue v_recipe_real_food_cost (food cost actualisé vs prix Excel)
// Affiche les recettes dont le coût a dérivé de plus de X% (seuil ajustable)
// =============================================================================

export default function FoodCostAlertWidget(props) {
  var [alerts, setAlerts] = useState([])
  var [stats, setStats] = useState({critique: 0, alerte: 0, surveillance: 0, baisse: 0, stable: 0})
  var [expanded, setExpanded] = useState(false)
  var [loading, setLoading] = useState(true)
  var threshold = props.threshold || 10 // seuil par défaut : alertes > 10%

  useEffect(function(){
    loadAlerts()
  }, [])

  function loadAlerts() {
    setLoading(true)
    var c = sb()
    c.from('v_recipe_real_food_cost')
      .select('*')
      .gt('nb_ingredients', 0)
      .not('ecart_pct', 'is', null)
      .order('ecart_pct', { ascending: false })
      .then(function(res){
        var data = res.data || []
        // Compter par niveau
        var s = {critique: 0, alerte: 0, surveillance: 0, baisse: 0, stable: 0}
        data.forEach(function(r){
          var p = Number(r.ecart_pct)
          if (p > 20) s.critique++
          else if (p > 10) s.alerte++
          else if (p > 5) s.surveillance++
          else if (p < -5) s.baisse++
          else s.stable++
        })
        setStats(s)
        // Filtrer pour le tableau : seuil
        var filtered = data.filter(function(r){ return Math.abs(Number(r.ecart_pct)) >= threshold })
        setAlerts(filtered)
        setLoading(false)
      })
  }

  function fmtEur(v) {
    if (v === null || v === undefined) return '—'
    return Number(v).toFixed(2) + ' €'
  }

  function fmtPct(v) {
    if (v === null || v === undefined) return '—'
    var n = Number(v)
    return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
  }

  function getLevel(pct) {
    var p = Number(pct)
    if (p > 20) return { label: 'CRITIQUE', color: '#CC0066', bg: '#FFE8EF', icon: '🔴' }
    if (p > 10) return { label: 'ALERTE', color: '#BA7517', bg: '#FFF3E0', icon: '🟡' }
    if (p > 5) return { label: 'SURVEILLER', color: '#A06CD5', bg: '#F5EBFF', icon: '🟠' }
    if (p < -5) return { label: 'BAISSE', color: '#009D3A', bg: '#E0F5E0', icon: '🟢' }
    return { label: 'STABLE', color: '#555', bg: '#F5F5F5', icon: '⚪' }
  }

  if (loading) {
    return (
      <div style={{padding: 14, background: '#fff', borderRadius: 12, border: '2px solid #EBEBEB', textAlign: 'center', fontSize: 12, color: '#888'}}>
        ⏳ Calcul food cost réel...
      </div>
    )
  }

  var totalAlerts = stats.critique + stats.alerte
  var hasAlerts = alerts.length > 0

  return (
    <div style={{background: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid ' + (totalAlerts > 0 ? '#FF82D7' : '#EBEBEB')}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span style={{fontFamily: "'Yellowtail', cursive", fontSize: 20, color: '#191923'}}>🍔 Food cost — alertes</span>
          {totalAlerts > 0 && (
            <span style={{
              background: '#FF82D7',
              color: '#fff',
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 900,
              fontFamily: 'Arial Narrow, Arial, sans-serif'
            }}>{totalAlerts}</span>
          )}
        </div>
        <button type="button" onClick={function(){ setExpanded(!expanded) }} style={{
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 900,
          background: '#FFEB5A',
          color: '#191923',
          border: '1px solid #DDD',
          borderRadius: 6,
          cursor: 'pointer'
        }}>{expanded ? '▲ Réduire' : '▼ Détails'}</button>
      </div>

      {/* Compteurs synthèse */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6, marginBottom: hasAlerts && expanded ? 10 : 0}}>
        {stats.critique > 0 && (
          <div style={{background: '#FFE8EF', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
            <div style={{fontSize: 9, fontWeight: 900, color: '#CC0066', textTransform: 'uppercase', letterSpacing: 0.5}}>🔴 Critique</div>
            <div style={{fontSize: 18, fontWeight: 900, color: '#CC0066', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.critique}</div>
            <div style={{fontSize: 9, color: '#CC0066'}}>{'>'}20%</div>
          </div>
        )}
        {stats.alerte > 0 && (
          <div style={{background: '#FFF3E0', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
            <div style={{fontSize: 9, fontWeight: 900, color: '#BA7517', textTransform: 'uppercase', letterSpacing: 0.5}}>🟡 Alerte</div>
            <div style={{fontSize: 18, fontWeight: 900, color: '#BA7517', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.alerte}</div>
            <div style={{fontSize: 9, color: '#BA7517'}}>10-20%</div>
          </div>
        )}
        {stats.surveillance > 0 && (
          <div style={{background: '#F5EBFF', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
            <div style={{fontSize: 9, fontWeight: 900, color: '#A06CD5', textTransform: 'uppercase', letterSpacing: 0.5}}>🟠 Surveille</div>
            <div style={{fontSize: 18, fontWeight: 900, color: '#A06CD5', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.surveillance}</div>
            <div style={{fontSize: 9, color: '#A06CD5'}}>5-10%</div>
          </div>
        )}
        <div style={{background: '#F5F5F5', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
          <div style={{fontSize: 9, fontWeight: 900, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5}}>⚪ Stable</div>
          <div style={{fontSize: 18, fontWeight: 900, color: '#555', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.stable}</div>
          <div style={{fontSize: 9, color: '#555'}}>±5%</div>
        </div>
        {stats.baisse > 0 && (
          <div style={{background: '#E0F5E0', padding: '6px 8px', borderRadius: 6, textAlign: 'center'}}>
            <div style={{fontSize: 9, fontWeight: 900, color: '#009D3A', textTransform: 'uppercase', letterSpacing: 0.5}}>🟢 Baisse</div>
            <div style={{fontSize: 18, fontWeight: 900, color: '#009D3A', fontFamily: 'Arial Narrow, Arial, sans-serif', lineHeight: 1}}>{stats.baisse}</div>
            <div style={{fontSize: 9, color: '#009D3A'}}>{'<'}-5%</div>
          </div>
        )}
      </div>

      {/* Synthèse compacte si pas étendu */}
      {!expanded && hasAlerts && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          background: '#FFFBE5',
          borderLeft: '3px solid #FFEB5A',
          borderRadius: '0 6px 6px 0',
          fontSize: 12,
          color: '#191923',
          lineHeight: 1.5
        }}>
          <b>📌 Top 3 recettes en dérive :</b>
          {alerts.slice(0, 3).map(function(r, idx){
            return (
              <span key={r.recipe_id} style={{marginLeft: 6}}>
                {idx > 0 ? ' · ' : ' '}
                <b>{r.recipe_name}</b> ({fmtPct(r.ecart_pct)})
              </span>
            )
          })}
        </div>
      )}

      {/* Pas d'alerte : message calme */}
      {!hasAlerts && !expanded && (
        <div style={{
          marginTop: 8,
          padding: '8px 10px',
          background: '#E0F5E0',
          borderRadius: 6,
          fontSize: 12,
          color: '#1a6b1a',
          textAlign: 'center'
        }}>
          ✅ Aucune recette en dérive {'>'}{threshold}% — tes coûts sont sous contrôle
        </div>
      )}

      {/* Tableau détaillé étendu */}
      {expanded && hasAlerts && (
        <div style={{marginTop: 8}}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 70px 80px 80px 80px',
            gap: 6,
            padding: '6px 8px',
            fontSize: 9,
            fontWeight: 900,
            textTransform: 'uppercase',
            color: '#888',
            letterSpacing: 0.5,
            borderBottom: '1px solid #EBEBEB'
          }}>
            <div>Recette</div>
            <div style={{textAlign: 'right'}}>Origine</div>
            <div style={{textAlign: 'right'}}>Actuel</div>
            <div style={{textAlign: 'right'}}>Écart</div>
            <div style={{textAlign: 'right'}}>Niveau</div>
          </div>
          {alerts.map(function(r){
            var meta = getLevel(r.ecart_pct)
            return (
              <div key={r.recipe_id} style={{
                display: 'grid',
                gridTemplateColumns: '1fr 70px 80px 80px 80px',
                gap: 6,
                padding: '8px',
                marginTop: 3,
                background: meta.bg,
                borderRadius: 6,
                alignItems: 'center',
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums'
              }}>
                <div style={{fontWeight: 900, color: '#191923'}}>{r.recipe_name}</div>
                <div style={{textAlign: 'right', color: '#555'}}>{fmtEur(r.food_cost_excel)}</div>
                <div style={{textAlign: 'right', color: '#191923', fontWeight: 900}}>{fmtEur(r.food_cost_actualise)}</div>
                <div style={{textAlign: 'right', fontWeight: 900, color: meta.color}}>{fmtPct(r.ecart_pct)}</div>
                <div style={{textAlign: 'right'}}>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 900,
                    color: meta.color,
                    background: '#fff',
                    padding: '2px 6px',
                    borderRadius: 4
                  }}>{meta.label}</span>
                </div>
              </div>
            )
          })}
          <div style={{
            marginTop: 8,
            padding: '8px 10px',
            background: '#FFFBE5',
            borderLeft: '3px solid #FFEB5A',
            borderRadius: '0 6px 6px 0',
            fontSize: 11,
            color: '#555',
            lineHeight: 1.5
          }}>
            <b>📌 Lecture :</b> &quot;Origine&quot; = food cost du fichier Excel d&apos;origine. &quot;Actuel&quot; = recalcul avec le dernier prix facturé de chaque ingrédient. Écart positif = ton coût a augmenté → marge en baisse.
          </div>
        </div>
      )}
    </div>
  )
}
