// src/app/events/plaquette/page.tsx
// Meshuga Events — page de la plaquette catering B2B (lien à partager sur LinkedIn / par mail)
// Servie sur events.meshuga.fr/plaquette (middleware) et sur /events/plaquette
// Lien court à partager : https://www.meshuga.fr/plaquette (redirection 301 Webflow vers cette page)

import type { Metadata } from 'next'
import { ALL_MESHUGA_FONTFACES } from '@/lib/fonts'
import { EVENTS_CSS } from '../eventsStyles'

var SITE_URL = 'https://events.meshuga.fr'
var PAGE_URL = SITE_URL + '/plaquette'
var PDF_PATH = '/Plaquette_Meshuga.pdf'
var OG_PATH = '/plaquette-og.jpg'
var TITLE = 'Plaquette Meshuga Events — Traiteur new-yorkais B2B à Paris'
var DESCRIPTION = 'Box de 40 minis, lunch boxes, live cooking et stand événementiel : toute l\'offre traiteur Meshuga pour vos événements d\'entreprise à Paris, avec les tarifs.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: PAGE_URL,
    siteName: 'Meshuga Events',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_PATH, width: 1200, height: 630, alt: 'Plaquette Meshuga Events' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_PATH],
  },
  // Page de prospection : pas d'indexation (les tarifs évoluent, la page de commande reste la référence Google)
  robots: { index: false, follow: true },
}

var CSS = '' +
  '.mpl-hero{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:22px 0 26px}' +
  '.mpl-hero h1{font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:clamp(42px,7vw,92px);line-height:.86;margin:0;letter-spacing:-.5px}' +
  '.mpl-hero p{font-size:20px;line-height:1.35;margin:16px 0 0;max-width:600px}' +
  '.mpl-hero p b{background:#fff;padding:0 4px}' +
  '.mpl-ctas{display:flex;flex-wrap:wrap;gap:12px;margin:22px 0 0}' +
  '.mpl-btn{display:inline-flex;align-items:center;gap:8px;border:3px solid var(--n);border-radius:999px;padding:12px 22px;font-weight:700;font-size:17px;color:var(--n);text-decoration:none;background:#fff}' +
  '.mpl-btn.main{background:var(--n);color:var(--j)}' +
  '.mpl-btn.pink{background:var(--r)}' +
  '.mpl-btn:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 var(--n)}' +
  '.mpl-btn.main:hover{box-shadow:4px 4px 0 var(--r)}' +
  '.mpl-viewer{background:#fff;border:3px solid var(--n);border-radius:22px;overflow:hidden;box-shadow:8px 8px 0 var(--r)}' +
  '.mpl-viewer iframe{display:block;width:100%;height:82vh;min-height:620px;border:0}' +
  '.mpl-cover{display:none}' +
  '.mpl-cover img{display:block;width:100%;height:auto;border:3px solid var(--n);border-radius:16px;box-shadow:6px 6px 0 var(--r)}' +
  '.mpl-cover span{display:block;text-align:center;font-weight:700;margin-top:12px;text-decoration:underline}' +
  '.mpl-refs{margin:28px 0 0;font-size:16px;line-height:1.5}' +
  '.mpl-refs b{font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:20px;display:block;margin-bottom:4px}' +
  '@media (max-width:760px){' +
  '.mpl-hero{grid-template-columns:1fr}' +
  '.mpl-hero .mev-stamp{display:none}' +
  '.mpl-hero p{font-size:18px}' +
  '.mpl-btn{flex:1 1 100%;justify-content:center}' +
  '.mpl-viewer{display:none}' +
  '.mpl-cover{display:block}' +
  '}'

export default function PlaquettePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ALL_MESHUGA_FONTFACES + EVENTS_CSS + CSS }} />
      <main className="mev">
        <div className="mev-wrap">
          <header className="mev-head">
            <a href="/events"><img className="mev-logo" src="/logotype-pink.png" alt="Meshuga" /></a>
            <a className="mev-call" href="tel:+33624677866">06 24 67 78 66</a>
          </header>

          <section className="mpl-hero">
            <div>
              <h1>La plaquette<br />Meshuga Events</h1>
              <p>
                Le vrai deli new-yorkais pour vos événements pros à Paris : <b>box de 40 minis</b>, lunch boxes,
                live cooking et stand brandé. Tout est dedans, tarifs compris.
              </p>
              <div className="mpl-ctas">
                <a className="mpl-btn main" href={PDF_PATH} target="_blank" rel="noopener">Ouvrir la plaquette</a>
                <a className="mpl-btn" href={PDF_PATH} download="Plaquette_Meshuga_Events.pdf">Télécharger le PDF</a>
                <a className="mpl-btn pink" href="/events">Commander une box en ligne</a>
              </div>
            </div>
            <img className="mev-stamp" src="/stamp-pink.png" alt="" />
          </section>

          <a className="mpl-cover" href={PDF_PATH} target="_blank" rel="noopener">
            <img src={OG_PATH} alt="Aperçu de la plaquette Meshuga Events" />
            <span>Voir les 10 pages de la plaquette</span>
          </a>

          <div className="mpl-viewer">
            <iframe src={PDF_PATH + '#view=FitH'} title="Plaquette Meshuga Events" loading="lazy" />
          </div>

          <div className="mpl-refs">
            <b>Un devis sur mesure ?</b>
            Live cooking, gros volumes, livraison hors Paris : écrivez-nous à{' '}
            <a href="mailto:events@meshuga.fr?subject=Demande%20de%20devis%20Meshuga%20Events" style={{ color: 'inherit', fontWeight: 700 }}>events@meshuga.fr</a>
            {' '}ou appelez le{' '}
            <a href="tel:+33624677866" style={{ color: 'inherit', fontWeight: 700 }}>06 24 67 78 66</a>. Réponse sous 24 h.
          </div>

          <footer className="mev-foot">
            SAS AEGIA FOOD (enseigne MESHUGA), RCS Paris 904 639 531 · 3 rue Vavin 75006 Paris · events@meshuga.fr ·{' '}
            <a href="/events/cgv" style={{ color: 'inherit' }}>CGV</a>
          </footer>
        </div>
      </main>
    </>
  )
}
