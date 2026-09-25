// src/app/events/cgv/page.tsx
// Meshuga Events — Conditions générales de vente des commandes en ligne
// Reprises des CGV catering (factures/devis), adaptées au paiement en ligne.

import type { Metadata } from 'next'
import { ALL_MESHUGA_FONTFACES } from '@/lib/fonts'
import { EVENTS_CSS } from '../eventsStyles'

export const metadata: Metadata = {
  title: 'Conditions générales de vente — Meshuga Events',
}

var ARTICLES = [
  ['1. Champ d\'application', 'Les présentes conditions générales de vente (CGV) régissent les commandes de box de mini sandwiches passées en ligne sur events.meshuga.fr auprès de la SAS AEGIA FOOD, exerçant sous l\'enseigne MESHUGA, par des clients professionnels ou particuliers. Toute commande emporte adhésion sans réserve aux présentes CGV.'],
  ['2. Commande', 'La commande est ferme et définitive dès la validation du paiement en ligne. Elle doit être passée au moins 48 heures ouvrées (hors samedis, dimanches et jours fériés) avant la date de livraison souhaitée. Pour tout délai plus court, toute livraison hors Paris intra-muros ou toute prestation sur mesure (live cooking, gros volumes), le client contacte MESHUGA par téléphone ou à events@meshuga.fr.'],
  ['3. Prix', 'Les prix sont indiqués en euros, hors taxes (HT) et toutes taxes comprises (TTC). La TVA applicable est de 10 % sur les denrées alimentaires et sur la livraison qui leur est rattachée. Les frais de livraison dans Paris intra-muros sont indiqués avant le paiement. Les prix applicables sont ceux affichés au moment de la commande.'],
  ['4. Paiement', 'Le paiement de l\'intégralité du montant TTC s\'effectue en ligne au moment de la commande, par carte bancaire, Apple Pay ou Google Pay, via la plateforme sécurisée SumUp. MESHUGA n\'a jamais accès aux données de carte bancaire. Une confirmation de commande est adressée par courriel après validation du paiement.'],
  ['5. Annulation par le client', 'Toute annulation doit être notifiée par écrit à events@meshuga.fr. Les conditions financières appliquées sont les suivantes : plus de 30 jours avant la livraison, remboursement intégral hors frais déjà engagés ; entre 30 et 15 jours, 50 % du montant TTC reste dû ; entre 14 et 8 jours, 75 % du montant TTC reste dû ; 7 jours ou moins, 100 % du montant TTC reste dû.'],
  ['6. Annulation ou report par AEGIA FOOD', 'Si AEGIA FOOD se trouve dans l\'impossibilité d\'exécuter la commande pour une cause qui lui est exclusivement imputable, elle rembourse l\'intégralité des sommes versées par le client, à l\'exclusion de toute autre indemnité. AEGIA FOOD peut également proposer un report à une date convenue d\'un commun accord, sans frais.'],
  ['7. Absence de droit de rétractation', 'Conformément à l\'article L221-28 du Code de la consommation, le droit de rétractation ne s\'applique pas aux denrées alimentaires susceptibles de se détériorer rapidement ni aux prestations de restauration fournies à une date déterminée. Les conditions d\'annulation de l\'article 5 s\'appliquent.'],
  ['8. Hygiène, allergènes et régimes alimentaires', 'AEGIA FOOD respecte la réglementation HACCP et la déclaration des 14 allergènes majeurs (règlement UE 1169/2011). Les allergènes de chaque box sont indiqués sur la page de commande. Nos produits sont préparés dans une cuisine qui manipule l\'ensemble des allergènes majeurs : des traces sont possibles. Le client s\'engage à informer ses convives et à signaler toute allergie ou intolérance avant de commander. La responsabilité d\'AEGIA FOOD ne saurait être engagée en cas de réaction consécutive à une information non communiquée ou erronée.'],
  ['9. Livraison', 'La livraison est effectuée à l\'adresse indiquée par le client, dans Paris intra-muros, à la date et à l\'heure choisies lors de la commande. En cas d\'impossibilité de livraison du fait du client (absence, accès impossible, adresse erronée), les denrées restent facturées. Une nouvelle livraison est sous réserve de disponibilité et facturée en supplément.'],
  ['10. Chaîne du froid et conservation', 'Les denrées livrées doivent être consommées dans les 4 heures suivant la livraison, à une température ambiante n\'excédant pas 22 °C. Au-delà, ou en cas de rupture de la chaîne du froid imputable au client, la responsabilité d\'AEGIA FOOD ne peut être engagée.'],
  ['11. Réclamations', 'Toute réclamation relative à la conformité ou à la qualité des produits doit être formulée par écrit à events@meshuga.fr dans un délai de 48 heures suivant la livraison, accompagnée des justificatifs utiles (photos notamment). Passé ce délai, les produits sont réputés acceptés sans réserve.'],
  ['12. Limitation de responsabilité', 'La responsabilité d\'AEGIA FOOD est limitée aux dommages directs et prévisibles et ne saurait excéder le montant TTC de la commande concernée. AEGIA FOOD ne saurait être tenue des dommages indirects, notamment perte d\'exploitation ou préjudice commercial. Ces limitations ne s\'appliquent pas en cas de faute lourde ou dolosive, ni en cas de dommage corporel, ni lorsqu\'elles sont écartées par les dispositions impératives applicables aux consommateurs.'],
  ['13. Force majeure', 'Les obligations des parties sont suspendues en cas de force majeure au sens de l\'article 1218 du Code civil (intempéries exceptionnelles, grève générale, pandémie, mesure administrative). Les parties s\'efforcent de bonne foi de reporter la livraison. À défaut, les sommes versées sont remboursées, déduction faite des frais déjà engagés.'],
  ['14. Données personnelles', 'Les données collectées lors de la commande sont utilisées uniquement pour traiter et livrer la commande et émettre la facture, conformément au RGPD et à la loi Informatique et Libertés. Le paiement est traité par SumUp. Le client dispose d\'un droit d\'accès, de rectification, d\'effacement, de portabilité et d\'opposition, exerçable par courriel à events@meshuga.fr.'],
  ['15. Litiges et droit applicable', 'Les présentes CGV sont soumises au droit français. À défaut de règlement amiable, tout litige avec un client professionnel relève de la compétence exclusive du Tribunal de commerce de Paris. Le client consommateur peut recourir gratuitement à un médiateur de la consommation, dont les coordonnées lui sont communiquées sur simple demande à events@meshuga.fr, ou saisir la juridiction compétente selon les règles de droit commun.'],
]

export default function CgvPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: ALL_MESHUGA_FONTFACES + EVENTS_CSS +
        '.mev-cgv h1{font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:clamp(34px,6vw,60px);line-height:.9;margin:20px 0 6px}' +
        '.mev-cgv .intro{font-size:16px;margin:0 0 20px}' +
        '.mev-cgv article{padding:14px 0;border-bottom:1px dashed rgba(25,25,35,.3)}' +
        '.mev-cgv h2{font-family:var(--bild);font-weight:900;text-transform:uppercase;font-size:22px;margin:0 0 6px}' +
        '.mev-cgv p{font-size:16px;line-height:1.5;margin:0;max-width:72ch}' }} />
      <main className="mev">
        <div className="mev-wrap" style={{ maxWidth: 820 }}>
          <header className="mev-head">
            <a href="/events"><img className="mev-logo" src="/logotype-pink.png" alt="Meshuga" /></a>
            <a className="mev-call" href="/events">Retour à la carte</a>
          </header>
          <section className="mev-board mev-cgv" style={{ padding: '10px 26px 24px' }}>
            <h1>Conditions générales de vente</h1>
            <p className="intro">Commandes en ligne Meshuga Events — en vigueur au 25 septembre 2026.</p>
            {ARTICLES.map(function (a) {
              return (
                <article key={a[0]}>
                  <h2>{a[0]}</h2>
                  <p>{a[1]}</p>
                </article>
              )
            })}
          </section>
          <footer className="mev-foot">
            SAS AEGIA FOOD (enseigne MESHUGA), SAS au capital de 1 000 €, RCS Paris 904 639 531, SIRET 904 639 531 00014, APE 56.10C,
            TVA intracommunautaire FR31904639531, 3 rue Vavin 75006 Paris · events@meshuga.fr
          </footer>
        </div>
      </main>
    </>
  )
}
