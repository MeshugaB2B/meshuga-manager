'use client'
import { useState } from 'react'
import AchatsTab from './AchatsTab'
import FoodCostHistoryTab from './FoodCostHistoryTab'

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
        <ShoppingListPlaceholder />
      )}
    </div>
  )
}

// =============================================================================
// Placeholder de la liste de courses (à développer plus tard)
// =============================================================================
function ShoppingListPlaceholder() {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      background: '#fff',
      borderRadius: 12,
      border: '2px dashed #FFB0D7'
    }}>
      <div style={{fontSize: 48, marginBottom: 12}}>🛍️</div>
      <h3 style={{
        fontFamily: "'Yellowtail', cursive",
        fontSize: 26,
        color: '#191923',
        margin: '0 0 8px 0'
      }}>
        Liste de courses
      </h3>
      <p style={{fontSize: 13, opacity: 0.7, maxWidth: 520, margin: '0 auto 16px auto', lineHeight: 1.5}}>
        Bient&ocirc;t : g&eacute;n&eacute;ration automatique de la liste de courses bas&eacute;e sur le
        stock minimum, les recettes pr&eacute;vues et le meilleur prix par fournisseur.
      </p>
      <div style={{
        display: 'inline-block',
        padding: '6px 14px',
        background: '#FFEB5A',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 900,
        letterSpacing: 0.5
      }}>
        EN CONSTRUCTION
      </div>

      <div style={{
        marginTop: 28,
        padding: '16px 20px',
        background: '#FFF8E1',
        borderRadius: 8,
        textAlign: 'left',
        fontSize: 12,
        opacity: 0.75,
        maxWidth: 560,
        margin: '28px auto 0 auto'
      }}>
        <strong style={{display: 'block', marginBottom: 6}}>Fonctionnalit&eacute;s pr&eacute;vues :</strong>
        &bull; D&eacute;tection automatique des ingr&eacute;dients &agrave; commander selon le stock<br/>
        &bull; Regroupement par fournisseur (Norbert, Foodflow, Rouquette, Episaveurs...)<br/>
        &bull; Suggestion du meilleur prix entre fournisseurs disponibles<br/>
        &bull; Export PDF ou envoi direct par email/SMS aux fournisseurs<br/>
        &bull; Suivi des commandes en cours
      </div>
    </div>
  )
}
