'use client'

// =============================================================================
// Widget Dashboard : 📊 Z du jour
// 
// Affiche le dernier Z de caisse Zelty avec :
// - CA TTC + ticket moyen + nb tickets
// - Répartition par canaux (sur place / emporter / livraison)
// - Répartition par modes de paiement
// - Comparaison vs J-7 (même jour semaine précédente)
// =============================================================================

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

type Props = {
  toast?: (msg: string) => void
  onGoToZHistory?: () => void
}

type ZReport = {
  id: string
  z_date: string
  ca_ttc: number | null
  ca_ht: number | null
  tva_montant: number | null
  nb_tickets: number | null
  nb_couverts: number | null
  ticket_moyen: number | null
  canaux: Record<string, number>
  canaux_nb_tickets: Record<string, number>
  paiements: Record<string, number>
  has_anomaly: boolean
  anomaly_reasons: string[]
  created_at: string
}

function ZdeCaisseWidget({ toast, onGoToZHistory }: Props) {
  var [zToday, setZToday] = useState<ZReport | null>(null)
  var [zJ7, setZJ7] = useState<ZReport | null>(null)
  var [loading, setLoading] = useState(true)

  useEffect(function () {
    loadData()
  }, [])

  async function loadData() {
    try {
      var supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      )

      // Le dernier Z reçu (par date du Z)
      var { data: latest } = await supabase
        .from('daily_z_reports')
        .select('*')
        .order('z_date', { ascending: false })
        .limit(1)

      if (latest && latest.length > 0) {
        var lastZ = latest[0] as ZReport
        setZToday(lastZ)

        // Le Z d'il y a 7 jours par rapport à ce dernier
        var d = new Date(lastZ.z_date)
        d.setDate(d.getDate() - 7)
        var dateJ7 = d.toISOString().split('T')[0]
        var { data: j7 } = await supabase
          .from('daily_z_reports')
          .select('*')
          .eq('z_date', dateJ7)
          .limit(1)
        if (j7 && j7.length > 0) setZJ7(j7[0] as ZReport)
      }
    } catch (e: any) {
      console.error('Erreur chargement Z:', e)
      if (toast) toast('Erreur chargement Z de caisse')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ background: '#FFFFFF', border: '2px solid #191923', borderLeft: '6px solid #005FFF', borderRadius: 8, padding: '12px 14px', marginBottom: 12, boxShadow: '2px 2px 0 #191923' }}>
        <div style={{ fontWeight: 900, fontSize: 13, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          📊 Z de caisse — chargement…
        </div>
      </div>
    )
  }

  if (!zToday) {
    return (
      <div style={{ background: '#FFFFFF', border: '2px solid #191923', borderLeft: '6px solid #999', borderRadius: 8, padding: '12px 14px', marginBottom: 12, boxShadow: '2px 2px 0 #191923' }}>
        <div style={{ fontWeight: 900, fontSize: 13, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          📊 Z de caisse
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>
          Aucun Z reçu pour le moment. Configure le forward depuis Zelty → Zapier → /api/zelty-z-import.
        </div>
      </div>
    )
  }

  // Formatage date FR
  var zDate = new Date(zToday.z_date)
  var dateStr = zDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Variation vs J-7
  var variationCa: number | null = null
  var variationTickets: number | null = null
  if (zJ7 && zJ7.ca_ttc && zToday.ca_ttc) {
    variationCa = ((zToday.ca_ttc - zJ7.ca_ttc) / zJ7.ca_ttc) * 100
  }
  if (zJ7 && zJ7.nb_tickets && zToday.nb_tickets) {
    variationTickets = ((zToday.nb_tickets - zJ7.nb_tickets) / zJ7.nb_tickets) * 100
  }

  function variationColor(v: number | null): string {
    if (v === null) return '#999'
    if (v >= 0) return '#009D3A'
    return '#FF3B30'
  }

  function variationLabel(v: number | null): string {
    if (v === null) return ''
    var sign = v >= 0 ? '+' : ''
    return sign + v.toFixed(1) + '%'
  }

  // Tri canaux et paiements par montant décroissant (uniquement ceux > 0)
  var canauxEntries = Object.entries(zToday.canaux || {}).filter(function (e) { return (e[1] as number) > 0 }).sort(function (a, b) { return (b[1] as number) - (a[1] as number) })
  var paiementsEntries = Object.entries(zToday.paiements || {}).filter(function (e) { return (e[1] as number) > 0 }).sort(function (a, b) { return (b[1] as number) - (a[1] as number) })

  // Labels canaux/paiements lisibles
  function labelCanal(k: string): string {
    var map: Record<string, string> = {
      'sur_place': '🍽️ Sur place',
      'emporter': '🥡 Emporté',
      'livraison': '🛵 Livraison',
      'click_collect': '📦 Click & Collect',
      'uber_eats': '🚗 UberEats',
      'deliveroo': '🦘 Deliveroo'
    }
    return map[k] || k
  }

  function labelPaiement(k: string): string {
    var map: Record<string, string> = {
      'cb': '💳 CB',
      'especes': '💵 Espèces',
      'tickets_resto': '🎫 Tickets resto',
      'cheque': '📃 Chèque',
      'edenred': '🟠 Edenred',
      'swile': '🟢 Swile',
      'uber_eats': '🚗 UberEats',
      'deliveroo': '🦘 Deliveroo',
      'tabesto': '🤖 Tabesto',
      'autre': '❓ Autre'
    }
    return map[k] || k
  }

  return (
    <div style={{ background: '#FFFFFF', border: '2px solid #191923', borderLeft: '6px solid #005FFF', borderRadius: 8, padding: '12px 14px', marginBottom: 12, boxShadow: '2px 2px 0 #191923' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 13, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            📊 Z de caisse — {dateStr}
          </div>
          {zToday.has_anomaly && (
            <div style={{ fontSize: 11, color: '#FF3B30', marginTop: 2 }}>
              ⚠️ {zToday.anomaly_reasons.length} anomalie(s) détectée(s)
            </div>
          )}
        </div>
        {onGoToZHistory && (
          <button
            onClick={onGoToZHistory}
            style={{ background: '#191923', color: '#FFEB5A', border: 'none', borderRadius: 6, padding: '4px 10px', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
          >
            Historique →
          </button>
        )}
      </div>

      {/* BLOC 1 : KPIs principaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 12 }}>
        
        {/* CA TTC */}
        <div style={{ background: '#FFEB5A', border: '2px solid #191923', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5 }}>CA TTC</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#191923', marginTop: 2 }}>
            {(zToday.ca_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          {variationCa !== null && (
            <div style={{ fontSize: 11, fontWeight: 700, color: variationColor(variationCa), marginTop: 2 }}>
              {variationLabel(variationCa)} vs J-7
            </div>
          )}
        </div>

        {/* Nb tickets */}
        <div style={{ background: '#FFFFFF', border: '2px solid #191923', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tickets</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#191923', marginTop: 2 }}>
            {zToday.nb_tickets || 0}
          </div>
          {variationTickets !== null && (
            <div style={{ fontSize: 11, fontWeight: 700, color: variationColor(variationTickets), marginTop: 2 }}>
              {variationLabel(variationTickets)} vs J-7
            </div>
          )}
        </div>

        {/* Ticket moyen */}
        <div style={{ background: '#FFFFFF', border: '2px solid #191923', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5 }}>Ticket moyen</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#191923', marginTop: 2 }}>
            {(zToday.ticket_moyen || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>

        {/* CA HT */}
        <div style={{ background: '#FFFFFF', border: '2px solid #191923', borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5 }}>CA HT</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#191923', marginTop: 2 }}>
            {(zToday.ca_ht || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
      </div>

      {/* BLOC 2 : Répartition canaux */}
      {canauxEntries.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            🎯 Par canal de vente
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {canauxEntries.map(function (entry) {
              var k = entry[0]
              var v = entry[1] as number
              var nb = (zToday.canaux_nb_tickets && zToday.canaux_nb_tickets[k]) || 0
              var pct = zToday.ca_ttc ? ((v / zToday.ca_ttc) * 100).toFixed(0) : '0'
              return (
                <div key={k} style={{ background: '#F5F5F5', border: '1px solid #191923', borderRadius: 6, padding: '6px 10px', flex: '1 1 140px', minWidth: 140 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#191923' }}>{labelCanal(k)}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#191923', marginTop: 2 }}>
                    {v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                  <div style={{ fontSize: 10, color: '#666', marginTop: 1 }}>
                    {nb} ticket{nb > 1 ? 's' : ''} · {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* BLOC 3 : Répartition paiements */}
      {paiementsEntries.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#191923', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            💰 Par mode de paiement
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {paiementsEntries.map(function (entry) {
              var k = entry[0]
              var v = entry[1] as number
              var pct = zToday.ca_ttc ? ((v / zToday.ca_ttc) * 100).toFixed(0) : '0'
              return (
                <div key={k} style={{ background: '#191923', color: '#FFEB5A', borderRadius: 6, padding: '6px 10px', flex: '1 1 140px', minWidth: 140 }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{labelPaiement(k)}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>
                    {v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>
                    {pct}% du CA
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

export default ZdeCaisseWidget
