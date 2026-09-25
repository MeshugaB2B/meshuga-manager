'use client'
// src/app/events/merci/MerciClient.tsx
// Vérifie le statut du paiement (via /api/events/confirm) et affiche la confirmation.
// SumUp peut mettre quelques secondes à valider : on réessaie jusqu'à ~20 s.

import { useEffect, useState } from 'react'

var eur = function (n) {
  var v = Math.round(Number(n || 0) * 100) / 100
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

var frDate = function (iso) {
  if (!iso) return ''
  var p = String(iso).split('-')
  return p[2] + '/' + p[1] + '/' + p[0]
}

export default function MerciClient(props) {
  var reference = props.reference || ''
  var [state, setState] = useState({ status: 'LOADING' })

  useEffect(function () {
    if (!reference) { setState({ status: 'NOT_FOUND' }); return }
    var tries = 0
    var stopped = false
    var check = function () {
      tries++
      fetch('/api/events/confirm?ref=' + encodeURIComponent(reference))
        .then(function (r) { return r.json() })
        .then(function (j) {
          if (stopped) return
          if (j.status === 'PAID' || j.status === 'FAILED' || j.status === 'EXPIRED' || j.status === 'NOT_FOUND') {
            setState(j)
          } else if (tries < 10) {
            setState({ status: 'PENDING' })
            setTimeout(check, 2000)
          } else {
            setState({ status: 'PENDING_LONG' })
          }
        })
        .catch(function () {
          if (stopped) return
          if (tries < 10) setTimeout(check, 2000)
          else setState({ status: 'PENDING_LONG' })
        })
    }
    check()
    return function () { stopped = true }
  }, [reference])

  var s = state.status
  var title = 'Un instant…'
  var text = 'On vérifie votre paiement auprès de SumUp.'
  if (s === 'PAID') {
    title = 'C\'est dans la boîte !'
    text = 'Paiement reçu. Livraison le ' + frDate(state.date) + ' à ' + (state.hour || '') + '. La confirmation part à ' + (state.email || 'votre adresse email') + '.'
  } else if (s === 'FAILED' || s === 'EXPIRED') {
    title = 'Le paiement n\'est pas passé'
    text = 'Aucun montant n\'a été débité. Vous pouvez recommencer votre commande, ou nous appeler au 06 24 67 78 66.'
  } else if (s === 'NOT_FOUND') {
    title = 'Commande introuvable'
    text = 'Ce lien ne correspond à aucune commande. Appelez-nous au 06 24 67 78 66 si vous avez été débité.'
  } else if (s === 'PENDING_LONG') {
    title = 'Paiement en cours de validation'
    text = 'SumUp met plus de temps que prévu. Vous recevrez un email de confirmation dès que c\'est validé. Rien à refaire de votre côté.'
  }

  return (
    <main className="mev">
      <div className="mev-wrap" style={{ maxWidth: 640 }}>
        <header className="mev-head">
          <a href="/events"><img className="mev-logo" src="/logotype-pink.png" alt="Meshuga" /></a>
        </header>
        <section className="mev-ticket" style={{ position: 'static', marginTop: 30 }}>
          <h2>{title}</h2>
          <p style={{ fontSize: 18, lineHeight: 1.45, margin: '10px 0 0' }}>{text}</p>
          {s === 'PAID' ? (
            <ul className="mev-lines" style={{ marginTop: 18 }}>
              <li><span>Commande</span><span>{reference}</span></li>
              <li className="tot"><span>Payé</span><span>{eur(state.totalTtc)}</span></li>
            </ul>
          ) : null}
          {s === 'FAILED' || s === 'EXPIRED' || s === 'NOT_FOUND' ? (
            <a className="mev-pay" href="/events" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', color: '#191923', marginTop: 20 }}>
              Revenir à la carte
            </a>
          ) : null}
        </section>
      </div>
    </main>
  )
}
