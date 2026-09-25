'use client'
// src/app/events/EventsClient.tsx
// Meshuga Events — catalogue des box, panier et commande (paiement SumUp)

import { useEffect, useState } from 'react'

var eur = function (n) {
  var v = Math.round(Number(n || 0) * 100) / 100
  return v.toLocaleString('fr-FR', { minimumFractionDigits: v % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 }) + ' €'
}

var HOURS = (function () {
  var list = []
  for (var h = 7; h <= 20; h++) {
    list.push((h < 10 ? '0' : '') + h + ':00')
    if (h < 20) list.push((h < 10 ? '0' : '') + h + ':30')
  }
  return list
})()

var MAX_QTY = 20

export default function EventsClient() {
  var [data, setData] = useState(null)
  var [loadError, setLoadError] = useState('')
  var [cart, setCart] = useState({})
  var [form, setForm] = useState({ date: '', hour: '12:00', company: '', name: '', email: '', phone: '', street: '', cp: '', notes: '' })
  var [error, setError] = useState('')
  var [paying, setPaying] = useState(false)

  useEffect(function () {
    fetch('/api/events/catalogue')
      .then(function (r) { return r.json() })
      .then(function (j) {
        if (j && j.boxes) {
          setData(j)
          setForm(function (f) { return Object.assign({}, f, { date: j.earliestDate }) })
        } else {
          setLoadError('Le catalogue ne répond pas.')
        }
      })
      .catch(function () { setLoadError('Le catalogue ne répond pas.') })
  }, [])

  var setQty = function (id, qty) {
    setCart(function (c) {
      var next = Object.assign({}, c)
      if (qty <= 0) delete next[id]
      else next[id] = Math.min(qty, MAX_QTY)
      return next
    })
    setError('')
  }

  var setField = function (key, value) {
    setForm(function (f) {
      var next = Object.assign({}, f)
      next[key] = value
      return next
    })
    setError('')
  }

  var boxes = data && data.boxes ? data.boxes : []
  var lines = boxes.filter(function (b) { return cart[b.id] > 0 })
  var nbBox = lines.reduce(function (s, b) { return s + cart[b.id] }, 0)
  var subHt = lines.reduce(function (s, b) { return s + b.priceHt * cart[b.id] }, 0)
  var subTva = lines.reduce(function (s, b) { return s + b.priceHt * cart[b.id] * b.tvaPct / 100 }, 0)
  var feeHt = data ? data.delivery.feeHt : 0
  var feeTtc = data ? data.delivery.feeTtc : 0
  var totalHt = nbBox > 0 ? subHt + feeHt : 0
  var totalTtc = nbBox > 0 ? Math.round((subHt + subTva + feeTtc) * 100) / 100 : 0
  var tvaTotal = Math.round((totalTtc - totalHt) * 100) / 100
  var contact = data ? data.contact : { phone: '', phoneHref: '', email: '' }
  var tooEarly = data && form.date && form.date < data.earliestDate

  var scrollToTicket = function () {
    var el = document.getElementById('mev-ticket')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  var pay = function () {
    if (paying) return
    if (nbBox === 0) { setError('Ajoutez au moins une box.'); return }
    if (tooEarly) { setError('Cette date est trop proche pour une commande en ligne : appelez-nous au ' + contact.phone + '.'); return }
    if (!form.name || !form.email || !form.phone || !form.street || !form.cp) {
      setError('Il manque une information de livraison ou de contact.')
      return
    }
    setPaying(true)
    setError('')
    fetch('/api/events/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: lines.map(function (b) { return { id: b.id, qty: cart[b.id] } }),
        date: form.date,
        hour: form.hour,
        client: { company: form.company, name: form.name, email: form.email, phone: form.phone },
        address: { street: form.street, cp: form.cp, city: 'Paris' },
        notes: form.notes,
      }),
    })
      .then(function (r) { return r.json() })
      .then(function (j) {
        if (j && j.url) {
          window.location.href = j.url
        } else {
          setError(j && j.error ? j.error : 'Le paiement n\'a pas pu démarrer.')
          setPaying(false)
        }
      })
      .catch(function () {
        setError('Connexion impossible. Réessayez dans un instant.')
        setPaying(false)
      })
  }

  return (
    <main className="mev">
      <div className="mev-wrap">
        <header className="mev-head">
          <img className="mev-logo" src="/logotype-pink.png" alt="Meshuga" />
          {contact.phone ? (
            <a className="mev-call" href={contact.phoneHref}>{contact.phone}</a>
          ) : null}
        </header>

        <section className="mev-hero">
          <div>
            <h1>40 minis par box.<br />Livrées dans Paris.</h1>
            <p>
              Des mini sandwiches new-yorkais pour vos cocktails, lancements et réunions.
              Commandez <b>48 h ouvrées à l&apos;avance</b>, on livre à l&apos;heure dite.
            </p>
          </div>
          <img className="mev-stamp" src="/stamp-pink.png" alt="" aria-hidden="true" />
        </section>

        <div className="mev-grid">
          <section className="mev-board" aria-label="Les box">
            <div className="mev-band">
              <h2>Les Box</h2>
              <span>PRIX HT</span>
            </div>
            {loadError ? (
              <p className="mev-empty" style={{ padding: '18px 22px' }}>
                {loadError} Appelez-nous au 06 24 67 78 66.
              </p>
            ) : null}
            {!data && !loadError ? (
              <p className="mev-empty" style={{ padding: '18px 22px' }}>Chargement de la carte…</p>
            ) : null}
            <ul className="mev-list">
              {boxes.map(function (b) {
                var q = cart[b.id] || 0
                return (
                  <li key={b.id} className={q > 0 ? 'mev-item in' : 'mev-item'}>
                    <div className="mev-row">
                      <h3 className="mev-name">{b.name}</h3>
                      <span className="mev-lead" aria-hidden="true"></span>
                      <span className="mev-price">{b.priceHt}.</span>
                    </div>
                    <p className="mev-comp">{b.composition}</p>
                    {b.tagline ? <p className="mev-tag">{b.tagline}</p> : null}
                    <div className="mev-under">
                      <span className="mev-ttc">{eur(b.priceTtc)} TTC · {b.pieces} pièces</span>
                      {q === 0 ? (
                        <button type="button" className="mev-add" onClick={function () { setQty(b.id, 1) }}>
                          Ajouter
                        </button>
                      ) : (
                        <div className="mev-qty">
                          <button type="button" aria-label={'Retirer une ' + b.name} onClick={function () { setQty(b.id, q - 1) }}>−</button>
                          <b aria-live="polite">{q}</b>
                          <button type="button" className="on" aria-label={'Ajouter une ' + b.name} disabled={q >= MAX_QTY} onClick={function () { setQty(b.id, q + 1) }}>+</button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <aside className="mev-ticket" id="mev-ticket" aria-label="Votre commande">
            <h2>Votre commande</h2>
            {nbBox === 0 ? (
              <p className="mev-empty">Choisissez vos box dans la carte. Chaque box contient 40 minis, comptez 3 à 4 pièces par personne.</p>
            ) : (
              <ul className="mev-lines">
                {lines.map(function (b) {
                  return (
                    <li key={b.id}>
                      <span>{cart[b.id]} × {b.name}</span>
                      <span>{eur(b.priceHt * cart[b.id])}</span>
                    </li>
                  )
                })}
                <li>
                  <span>Livraison {data ? data.delivery.zone : ''}</span>
                  <span>{eur(feeHt)}</span>
                </li>
                <li className="sub">
                  <span>Total HT</span>
                  <span>{eur(totalHt)}</span>
                </li>
                <li className="sub">
                  <span>TVA</span>
                  <span>{eur(tvaTotal)}</span>
                </li>
                <li className="tot">
                  <span>À payer</span>
                  <span>{eur(totalTtc)}</span>
                </li>
              </ul>
            )}

            <div className="mev-form">
              <h3>Livraison</h3>
              <div className="mev-f2">
                <div className="mev-field">
                  <label htmlFor="mev-date">Date</label>
                  <input id="mev-date" type="date" min={data ? data.earliestDate : undefined} value={form.date}
                    onChange={function (e) { setField('date', e.target.value) }} />
                </div>
                <div className="mev-field">
                  <label htmlFor="mev-hour">Heure</label>
                  <select id="mev-hour" value={form.hour} onChange={function (e) { setField('hour', e.target.value) }}>
                    {HOURS.map(function (h) { return <option key={h} value={h}>{h}</option> })}
                  </select>
                </div>
              </div>
              <p className="mev-hint">
                Plus tôt que le {data ? data.earliestDate.split('-').reverse().join('/') : '…'} ?{' '}
                <a href={contact.phoneHref}>Appelez-nous au {contact.phone}</a>, on fait le maximum.
              </p>
              <div className="mev-field">
                <label htmlFor="mev-street">Adresse</label>
                <input id="mev-street" autoComplete="street-address" value={form.street}
                  onChange={function (e) { setField('street', e.target.value) }} placeholder="3 rue Vavin" />
              </div>
              <div className="mev-field">
                <label htmlFor="mev-cp">Code postal (Paris uniquement)</label>
                <input id="mev-cp" inputMode="numeric" autoComplete="postal-code" maxLength={5} value={form.cp}
                  onChange={function (e) { setField('cp', e.target.value) }} placeholder="75006" />
              </div>

              <h3>Contact</h3>
              <div className="mev-field">
                <label htmlFor="mev-company">Société (facultatif)</label>
                <input id="mev-company" autoComplete="organization" value={form.company}
                  onChange={function (e) { setField('company', e.target.value) }} />
              </div>
              <div className="mev-field">
                <label htmlFor="mev-name">Nom et prénom</label>
                <input id="mev-name" autoComplete="name" value={form.name}
                  onChange={function (e) { setField('name', e.target.value) }} />
              </div>
              <div className="mev-f2">
                <div className="mev-field">
                  <label htmlFor="mev-email">Email</label>
                  <input id="mev-email" type="email" autoComplete="email" value={form.email}
                    onChange={function (e) { setField('email', e.target.value) }} />
                </div>
                <div className="mev-field">
                  <label htmlFor="mev-phone">Téléphone</label>
                  <input id="mev-phone" type="tel" autoComplete="tel" value={form.phone}
                    onChange={function (e) { setField('phone', e.target.value) }} />
                </div>
              </div>
              <div className="mev-field">
                <label htmlFor="mev-notes">Précisions pour la livraison (facultatif)</label>
                <textarea id="mev-notes" value={form.notes} placeholder="Digicode, étage, contact sur place…"
                  onChange={function (e) { setField('notes', e.target.value) }} />
              </div>

              {error ? <div className="mev-err" role="alert">{error}</div> : null}

              <button type="button" className="mev-pay" disabled={paying || nbBox === 0} onClick={pay}>
                {paying ? 'Ouverture du paiement…' : (nbBox === 0 ? 'Choisissez une box' : 'Payer ' + eur(totalTtc))}
              </button>
              <p className="mev-secure">Paiement par carte, Apple Pay ou Google Pay, sécurisé par SumUp. Facture envoyée par email.</p>
            </div>
          </aside>
        </div>

        <section className="mev-talk">
          <div>
            <h2>Live cooking, gros volumes, hors Paris ?</h2>
            <p>Stand avec cuisiniers sur place, événement de 50 à 300 personnes ou livraison hors Paris : on vous fait une proposition sur mesure.</p>
          </div>
          <a href={contact.phoneHref || 'tel:+33624677866'}>{contact.phone || '06 24 67 78 66'}</a>
        </section>

        <footer className="mev-foot">
          Meshuga · 3 rue Vavin, 75006 Paris · {contact.email || 'events@meshuga.fr'}<br />
          SAS AEGIA FOOD, SIREN 904 639 531. Produits frais préparés pour une date donnée : pas de droit de rétractation (art. L221-28 du Code de la consommation).
        </footer>
      </div>

      {nbBox > 0 ? (
        <button type="button" className="mev-bar" onClick={scrollToTicket}>
          <span>{nbBox} box · {eur(totalHt)} HT</span>
          <span>Commander</span>
        </button>
      ) : null}
    </main>
  )
}
