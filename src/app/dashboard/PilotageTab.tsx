'use client'
import { useState } from 'react'
import PilotageImportsTab from './PilotageImportsTab'
import PilotageOverviewTab from './PilotageOverviewTab'

// =============================================================================
// PilotageTab — Conteneur racine avec sous-navigation
// =============================================================================

export default function PilotageTab(props) {
  var [subTab, setSubTab] = useState('overview')

  var subTabs = [
    { key: 'overview', label: '📊 Vue d\'ensemble', component: PilotageOverviewTab },
    { key: 'imports', label: '📥 Imports', component: PilotageImportsTab }
  ]

  var ActiveComponent = subTabs.filter(function(t){ return t.key === subTab })[0].component

  return (
    <div>
      {/* HEADER PILOTAGE */}
      <div style={{
        background: 'linear-gradient(135deg, #FF82D7 0%, #FFB0D7 100%)',
        borderRadius: 12,
        padding: 18,
        marginBottom: 14,
        color: '#fff',
        border: '2px solid #191923'
      }}>
        <div style={{fontFamily: "'Yellowtail', cursive", fontSize: 32, lineHeight: 1, color: '#fff'}}>
          📊 Pilotage Meshuga
        </div>
        <div style={{fontSize: 13, marginTop: 6, fontWeight: 700, opacity: 0.95}}>
          Toutes tes KPI essentielles que Zelty ne te montre pas
        </div>
      </div>

      {/* SOUS-NAVIGATION */}
      <div style={{display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap'}}>
        {subTabs.map(function(t){
          return (
            <button key={t.key} type="button" onClick={function(){ setSubTab(t.key) }} style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 900,
              border: '2px solid ' + (t.key === subTab ? '#191923' : '#DDD'),
              background: t.key === subTab ? '#191923' : '#fff',
              color: t.key === subTab ? '#FFEB5A' : '#555',
              borderRadius: 20,
              cursor: 'pointer',
              fontFamily: 'Arial Narrow, Arial, sans-serif',
              letterSpacing: 0.3,
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'rgba(0,0,0,0.1)'
            }}>{t.label}</button>
          )
        })}
      </div>

      {/* CONTENU DYNAMIQUE */}
      <ActiveComponent {...props} />
    </div>
  )
}
