'use client'
import { useEffect, useState } from 'react'
import ArticleDetailView from './ArticleDetailView'
import { createClient } from '@supabase/supabase-js'

// =============================================================================
// ArticleDetailModal — popup full-screen / centré pour afficher un article
// 
// Utilisé depuis : Dashboard widgets (PriceAlerts, FoodCostAlerts) au clic
//                  sur un produit/article alerté.
// 
// Props :
//   - isOpen (bool) : ouvert/fermé
//   - onClose () : callback de fermeture
//   - articleId (string) : ID article direct (priorité 1)
//   - productId (string) : ID produit → on remonte à son article_id (priorité 2)
//   - productName (string) : nom produit → on cherche par fuzzy match (priorité 3)
// =============================================================================

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export default function ArticleDetailModal(props: any) {
  var [resolvedArticleId, setResolvedArticleId] = useState<string | null>(null)
  var [resolving, setResolving] = useState(false)
  var [resolveError, setResolveError] = useState<string | null>(null)

  // Résoudre l'articleId depuis articleId / productId / productName
  useEffect(function() {
    if (!props.isOpen) return

    setResolveError(null)

    // Cas 1 : articleId fourni direct
    if (props.articleId) {
      setResolvedArticleId(props.articleId)
      return
    }

    // Cas 2 : productId → chercher article_id
    if (props.productId) {
      setResolving(true)
      sb().from('products').select('article_id, name').eq('id', props.productId).single()
        .then(function(res: any) {
          if (res.data && res.data.article_id) {
            setResolvedArticleId(res.data.article_id)
          } else {
            setResolveError('Produit non lié à un article générique')
          }
          setResolving(false)
        })
      return
    }

    // Cas 3 : productName → fuzzy match sur article name
    if (props.productName) {
      setResolving(true)
      var name = String(props.productName).trim()
      // Essayer match exact d'abord, puis ilike
      sb().from('articles').select('id, name').ilike('name', name).limit(1)
        .then(function(res: any) {
          if (res.data && res.data.length > 0) {
            setResolvedArticleId(res.data[0].id)
            setResolving(false)
          } else {
            // Fallback : chercher via products
            sb().from('products').select('article_id, articles(id)').ilike('name', '%' + name + '%').not('article_id', 'is', null).limit(1)
              .then(function(res2: any) {
                if (res2.data && res2.data.length > 0 && res2.data[0].article_id) {
                  setResolvedArticleId(res2.data[0].article_id)
                } else {
                  setResolveError('Article "' + name + '" non trouvé')
                }
                setResolving(false)
              })
          }
        })
    }
  }, [props.isOpen, props.articleId, props.productId, props.productName])

  // Reset quand fermé
  useEffect(function() {
    if (!props.isOpen) {
      setResolvedArticleId(null)
      setResolveError(null)
    }
  }, [props.isOpen])

  // ESC pour fermer
  useEffect(function() {
    if (!props.isOpen) return
    function onKey(e: any) {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    // Bloquer scroll body
    var prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return function() {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [props.isOpen])

  if (!props.isOpen) return null

  return (
    <div
      onClick={props.onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(25, 25, 35, 0.55)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '20px 10px',
        overflowY: 'auto',
        backdropFilter: 'blur(2px)'
      }}
    >
      <div
        onClick={function(e){ e.stopPropagation() }}
        style={{
          background: '#FFFBEA',
          borderRadius: 16,
          border: '3px solid #191923',
          boxShadow: '8px 8px 0 #191923',
          padding: 16,
          width: '100%',
          maxWidth: 900,
          position: 'relative',
          marginBottom: 40
        }}
      >
        {/* Bouton fermer (sticky en haut à droite) */}
        <button
          onClick={props.onClose}
          aria-label="Fermer"
          style={{
            position: 'sticky',
            top: 0,
            float: 'right',
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid #191923',
            background: '#FFEB5A',
            cursor: 'pointer',
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1,
            boxShadow: '3px 3px 0 #191923',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: -40,
            marginLeft: 'auto'
          }}
        >
          ✕
        </button>

        {/* Contenu : soit erreur, soit chargement, soit la vue article */}
        {resolveError ? (
          <div style={{
            padding: 30,
            textAlign: 'center',
            background: '#FFE5E5',
            border: '2px solid #C53030',
            borderRadius: 12,
            color: '#C53030',
            fontWeight: 700,
            marginTop: 20
          }}>
            ❌ {resolveError}
          </div>
        ) : resolving || !resolvedArticleId ? (
          <div style={{textAlign: 'center', padding: 60, opacity: 0.6}}>
            ⏳ Recherche de l'article...
          </div>
        ) : (
          <div style={{paddingTop: 8}}>
            <ArticleDetailView articleId={resolvedArticleId} compact={false} />
          </div>
        )}
      </div>
    </div>
  )
}
