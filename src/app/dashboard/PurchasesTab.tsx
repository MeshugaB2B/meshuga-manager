'use client'
import { useState } from 'react'
import AchatsTab from './AchatsTab'
import FoodCostHistoryTab from './FoodCostHistoryTab'
import ShoppingListTab from './ShoppingListTab'

// =============================================================================
// PurchasesTab — onglet top "Achats 🛒"
//
// Wrapper qui regroupe tout ce qui concerne les achats fournisseurs :
//  - Catalogue (= AchatsTab) : fournisseurs, comparateur, vue détail produit
//  - Imports : historique des factures + alias mémorisés + anomalies
//  - Liste de courses : placeholder pour proposition Emy (à venir)
//
// Cohérence visuelle : nav en pills rose Meshuga + Yellowtail pour le titre.
// =============================================================================

export default function PurchasesTab(props) {
  var toast = props.toast || function(m){ console.log(m) }

  var [subView, setSubView] = useState('catalogue') // 'catalogue' | 'imports' | 'shopping'

  // -------- Styles communs (charté Meshuga) --------
  var subNavWrap = {
    display: 'flex',
    gap: 0,
    marginBottom: 18,
    background: '#F5F5F5',
    borderRadius: 12,
    padding: 5,
    flexWrap: 'wrap' as const
  }

  function pillStyle(active) {
    return {
      flex: 1,
      minWidth: 130,
      padding: '11px 16px',
      background: active ? '#FF82D7' : 'transparent',
      color: active ? '#fff' : '#555',
      border: 'none',
      borderRadius: 8,
      fontFamily: 'Arial Narrow, Arial, sans-serif',
      fontWeight: 900,
      fontSize: 13,
      letterSpacing: 0.3,
      textTransform: 'uppercase' as const,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    }
  }

  return (
    <div>
      {/* En-tête de section */}
      <div style={{marginBottom: 18}}>
        <h2 style={{
          fontFamily: "'Yellowtail', cursive",
          fontSize: 38,
          color: '#191923',
          margin: 0,
          lineHeight: 1.1
        }}>
          🛒 Achats
        </h2>
        <div style={{fontSize: 13, opacity: 0.65, marginTop: 4}}>
          Fournisseurs · Catalogue produits · Historique des factures · Liste de courses
        </div>
      </div>

      {/* Sous-navigation */}
      <div style={subNavWrap}>
        <button onClick={function(){setSubView('catalogue')}} style={pillStyle(subView === 'catalogue')}>
          📦 Catalogue
        </button>
        <button onClick={function(){setSubView('imports')}} style={pillStyle(subView === 'imports')}>
          📄 Imports
        </button>
        <button onClick={function(){setSubView('shopping')}} style={pillStyle(subView === 'shopping')}>
          🛍️ Liste de courses
        </button>
      </div>

      {/* Contenu */}
      {subView === 'catalogue' && (
        <AchatsTab toast={toast} />
      )}

      {subView === 'imports' && (
        <FoodCostHistoryTab toast={toast} />
      )}

      {subView === 'shopping' && (
        <ShoppingListTab toast={toast} />
      )}
    </div>
  )
}
