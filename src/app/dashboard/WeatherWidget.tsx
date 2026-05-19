'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

function todayISO() {
  // Date du jour au format YYYY-MM-DD, dans la timezone Europe/Paris
  // pour rester cohérent même si le navigateur est en UTC
  var d = new Date()
  var paris = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Europe/Paris', 
    year: 'numeric', month: '2-digit', day: '2-digit' 
  })
  return paris.format(d) // format YYYY-MM-DD
}

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

// =============================================================================
// WeatherWidget — Prévision météo 7 jours Paris 6e
// Source : Open-Meteo (gratuit, sans clé). Refresh auto si données > 6h.
// Calcule le coefficient "force commerciale attendue" basé sur les corrélations
// 2025 : soleil +0,48 · T°max +0,40 · pluie −0,29
// =============================================================================

export default function WeatherWidget(props) {
  var [forecast, setForecast] = useState([])
  var [loading, setLoading] = useState(true)
  var [refreshing, setRefreshing] = useState(false)

  useEffect(function(){
    loadForecast()
  }, [])

  function loadForecast() {
    setLoading(true)
    var c = sb()
    c.from('weather_forecast').select('*').gte('date', todayISO()).order('date', { ascending: true }).then(function(res){
      var data = res.data || []
      setForecast(data)
      setLoading(false)
      // Si la donnée la plus récente est > 6h, rafraîchir en arrière-plan
      if (data.length > 0) {
        var updatedAt = new Date(data[0].updated_at).getTime()
        var ageH = (Date.now() - updatedAt) / (1000 * 60 * 60)
        if (ageH > 6) {
          refreshForecast()
        }
      } else {
        refreshForecast()
      }
    })
  }

  function refreshForecast() {
    setRefreshing(true)
    fetch('/api/weather/refresh', { method: 'POST' }).then(function(r){
      if (r.ok) {
        var c = sb()
        c.from('weather_forecast').select('*').gte('date', todayISO()).order('date', { ascending: true }).then(function(res){
          setForecast(res.data || [])
          setRefreshing(false)
        })
      } else {
        setRefreshing(false)
      }
    }).catch(function(){
      setRefreshing(false)
    })
  }

  function getDayLabel(dateStr) {
    var d = new Date(dateStr + 'T12:00:00')
    var today = new Date()
    today.setHours(0,0,0,0)
    var tomorrow = new Date(today.getTime() + 86400000)
    var dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    if (dOnly.getTime() === today.getTime()) return "Auj."
    if (dOnly.getTime() === tomorrow.getTime()) return "Dem."
    var jours = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam']
    return jours[d.getDay()]
  }

  function getDayNum(dateStr) {
    var d = new Date(dateStr + 'T12:00:00')
    return d.getDate()
  }

  // Code WMO simplifié → emoji + label
  function wmoToEmoji(code) {
    if (code === 0) return '☀️'
    if (code === 1 || code === 2) return '🌤️'
    if (code === 3) return '☁️'
    if (code >= 45 && code <= 48) return '🌫️'
    if (code >= 51 && code <= 67) return '🌧️'
    if (code >= 71 && code <= 77) return '❄️'
    if (code >= 80 && code <= 82) return '🌦️'
    if (code >= 95 && code <= 99) return '⛈️'
    return '☁️'
  }

  // Coefficient force commerciale (basé sur corrélations 2025)
  // CA boutique moyen 854€ pour T°moy 10-15°C, pluie modérée → c'est la "base"
  // Bonus : soleil +0.05/h au-dessus de 6h, T°max +0.03/°C au-dessus de 15°C
  // Malus : pluie −0.04/mm, −0.10 si pluie > 5mm
  function computeScore(day) {
    var score = 1.0
    var t = Number(day.t_max) || 0
    var p = Number(day.precipitation_mm) || 0
    var s = Number(day.sunshine_hours) || 0
    // Température : optimum 20-25°C
    if (t >= 20 && t <= 28) score += 0.30
    else if (t >= 15 && t < 20) score += 0.10
    else if (t < 10) score -= 0.20
    else if (t > 28) score += 0.15
    // Soleil
    if (s >= 10) score += 0.20
    else if (s >= 6) score += 0.10
    else if (s < 3) score -= 0.10
    // Pluie
    if (p >= 10) score -= 0.30
    else if (p >= 5) score -= 0.20
    else if (p >= 2) score -= 0.10
    return Math.max(0.4, Math.min(1.6, score))
  }

  function scoreToLabel(score) {
    if (score >= 1.35) return { label: 'TOP', color: '#009D3A', bg: '#E0F5E0', action: 'Mobiliser 2e cuisinier' }
    if (score >= 1.15) return { label: 'BON', color: '#009D3A', bg: '#F0F9E8', action: 'Stock pains + frites en hausse' }
    if (score >= 0.95) return { label: 'NORMAL', color: '#555', bg: '#F5F5F5', action: 'Journée standard' }
    if (score >= 0.80) return { label: 'BAS', color: '#BA7517', bg: '#FFF3E0', action: 'Stocks limités, équipe normale' }
    return { label: 'FAIBLE', color: '#CC0066', bg: '#FFE8EF', action: 'Réduire équipe, pousser livraison' }
  }

  if (loading) {
    return (
      <div style={{padding: 16, background: '#fff', borderRadius: 12, border: '2px solid #EBEBEB', textAlign: 'center', fontSize: 12, color: '#888'}}>
        ⏳ Chargement météo...
      </div>
    )
  }

  if (forecast.length === 0) {
    return (
      <div style={{padding: 16, background: '#fff', borderRadius: 12, border: '2px solid #EBEBEB', textAlign: 'center', fontSize: 12, color: '#888'}}>
        Aucune prévision météo disponible.
        <button type="button" onClick={refreshForecast} style={{marginLeft: 8, padding: '4px 10px', background: '#FF82D7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 900, cursor: 'pointer'}}>
          🔄 Récupérer
        </button>
      </div>
    )
  }

  // Pour l'affichage compact : 7 jours
  var days = forecast.slice(0, 7)

  return (
    <div style={{background: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, border: '2px solid #EBEBEB'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <span style={{fontFamily: "'Yellowtail', cursive", fontSize: 20, color: '#191923'}}>🌤️ Météo &amp; force commerciale</span>
          <span style={{fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 900}}>Paris 6e · 7 jours</span>
        </div>
        <button type="button" onClick={refreshForecast} disabled={refreshing} style={{
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 900,
          background: refreshing ? '#EBEBEB' : '#FFEB5A',
          color: '#191923',
          border: '1px solid #DDD',
          borderRadius: 6,
          cursor: refreshing ? 'wait' : 'pointer'
        }}>
          {refreshing ? '⏳ Maj...' : '🔄 Refresh'}
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 6
      }}>
        {days.map(function(day){
          var score = computeScore(day)
          var meta = scoreToLabel(score)
          return (
            <div key={day.date} style={{
              background: meta.bg,
              borderRadius: 8,
              padding: '8px 6px',
              textAlign: 'center',
              border: '1px solid ' + meta.color + '30'
            }}>
              <div style={{fontSize: 10, fontWeight: 900, color: '#888', textTransform: 'uppercase', letterSpacing: 0.3}}>
                {getDayLabel(day.date)}
              </div>
              <div style={{fontSize: 9, color: '#999', marginBottom: 2}}>
                {getDayNum(day.date)}
              </div>
              <div style={{fontSize: 22, lineHeight: 1, margin: '4px 0'}}>
                {wmoToEmoji(day.weather_code)}
              </div>
              <div style={{fontSize: 13, fontWeight: 900, color: '#191923', fontFamily: 'Arial Narrow, Arial, sans-serif'}}>
                {Math.round(Number(day.t_max))}°
              </div>
              <div style={{fontSize: 9, color: '#888'}}>
                {Math.round(Number(day.t_min))}°
              </div>
              {Number(day.precipitation_mm) > 0.5 && (
                <div style={{fontSize: 9, color: '#3580C2', marginTop: 2}}>
                  💧 {Number(day.precipitation_mm).toFixed(1)}mm
                </div>
              )}
              <div style={{
                marginTop: 6,
                fontSize: 9,
                fontWeight: 900,
                color: meta.color,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
                padding: '2px 4px',
                background: '#fff',
                borderRadius: 3
              }}>
                {meta.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommandation aujourd'hui + demain */}
      {days.length >= 2 && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: '#FFFBE5',
          borderLeft: '3px solid #FFEB5A',
          borderRadius: '0 6px 6px 0',
          fontSize: 11,
          color: '#191923',
          lineHeight: 1.6
        }}>
          <b>📌 Aujourd&apos;hui :</b> {scoreToLabel(computeScore(days[0])).action} ·
          <b style={{marginLeft: 6}}>Demain :</b> {scoreToLabel(computeScore(days[1])).action}
        </div>
      )}
    </div>
  )
}
