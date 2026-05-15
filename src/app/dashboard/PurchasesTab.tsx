'use client'
import { useState } from 'react'
import AchatsTab from './AchatsTab'
import ArticlesTab from './ArticlesTab'
import FoodCostHistoryTab from './FoodCostHistoryTab'
import ShoppingListTab from './ShoppingListTab'
import FoodCostInvoiceWizard from './FoodCostInvoiceWizard'
import BatchInvoiceImport from './BatchInvoiceImport'
import BatchValidation from './BatchValidation'
import PendingInvoicesWidget from './PendingInvoicesWidget'

// =============================================================================
// PurchasesTab — onglet top "Achats 🛒"
//
// Wrapper qui regroupe tout ce qui concerne les achats fournisseurs :
// - Catalogue (= AchatsTab) : fournisseurs, comparateur, vue détail produit
// - Articles (= ArticlesTab) : vue analytique générique multi-fournisseurs avec graphique évolution
// - Imports : historique des factures + alias mémorisés + anomalies
// - Liste de courses : placeholder pour proposition Emy (à venir)
//
// Les 2 boutons d'import facture (unitaire et en masse) sont placés dans
// l'en-tête pour être accessibles depuis n'importe quel sous-onglet.
// =============================================================================

export default function PurchasesTab(props) {
  var toast = props.toast || function(m){ console.log(m) }
  var [subView, setSubView] = useState('catalogue') // 'catalogue' | 'articles' | 'imports' | 'shopping'

  // États pour les modals d'import
  var [invoiceWizardOpen, setInvoiceWizardOpen] = useState(false)
  var [batchImportOpen, setBatchImportOpen] = useState(false)
  var [batchValidationOpen, setBatchValidationOpen] = useState(false)
  var [currentBatchId, setCurrentBatchId] = useState(null)

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
      {/* En-tête de section avec boutons d'import à droite */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div>
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
            Fournisseurs · Catalogue produits · Articles génériques · Historique factures · Liste de courses
          </div>
        </div>

        {/* Boutons d'import — visibles depuis tous les sous-onglets */}
        <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
          <button
            className="btn btn-sm"
            style={{
              background: '#009D3A',
              color: '#fff',
              fontWeight: 900,
              fontSize: 12,
              padding: '10px 14px'
            }}
            onClick={function(){ setInvoiceWizardOpen(true) }}
          >
            📄 Importer une facture
          </button>
          <button
            className="btn btn-sm"
            style={{
              background: '#FFEB5A',
              color: '#191923',
              border: '2px solid #191923',
              fontWeight: 900,
              fontSize: 12,
              padding: '10px 14px'
            }}
            onClick={function(){ setBatchImportOpen(true) }}
          >
            📦 Import en masse
          </button>
        </div>
      </div>

      {/* Widget Factures fournisseurs en attente */}
      <PendingInvoicesWidget toast={props.toast} onGoToImports={function(){ setSubView('imports') }} />

      {/* Sous-navigation */}
      <div style={subNavWrap}>
        <button onClick={function(){setSubView('catalogue')}} style={pillStyle(subView === 'catalogue')}>
          📦 Catalogue
        </button>
        <button onClick={function(){setSubView('articles')}} style={pillStyle(subView === 'articles')}>
          📊 Articles
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
      {subView === 'articles' && (
        <ArticlesTab toast={toast} />
      )}
      {subView === 'imports' && (
        <FoodCostHistoryTab toast={toast} />
      )}
      {subView === 'shopping' && (
        <ShoppingListTab toast={toast} />
      )}

      {/* ========== MODAL : Import facture unique (wizard) ========== */}
      <FoodCostInvoiceWizard
        isOpen={invoiceWizardOpen}
        onClose={function(){ setInvoiceWizardOpen(false) }}
        onSuccess={function(){
          setInvoiceWizardOpen(false)
          // Si on est sur l'onglet imports, on rafraîchit visuellement
          if (subView === 'imports') {
            // Force re-render léger en switchant brièvement
            setSubView('imports')
          }
        }}
        toast={toast}
      />

      {/* ========== MODAL : Import en masse ========== */}
      <BatchInvoiceImport
        isOpen={batchImportOpen}
        onClose={function(){ setBatchImportOpen(false) }}
        onSuccess={function(batchId){
          setCurrentBatchId(batchId)
          setBatchImportOpen(false)
          setBatchValidationOpen(true)
        }}
        toast={toast}
      />

      <BatchValidation
        isOpen={batchValidationOpen}
        batchId={currentBatchId}
        onClose={function(){
          setBatchValidationOpen(false)
          setCurrentBatchId(null)
          // Rafraîchir l'onglet imports si on y est
          if (subView === 'imports') {
            setSubView('imports')
          }
        }}
        toast={toast}
      />
    </div>
  )
}
