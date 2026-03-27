// FICHIER : src/app/api/generate-prospects/route.ts
// Créer ce fichier sur GitHub dans : src/app/api/generate-prospects/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { cat, zone, count = 20 } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

    const catLabels: any = {
      evenementiel: 'Agences événementielles et organisateurs d\'événements',
      avocats: 'Cabinets d\'avocats et études notariales',
      startup: 'Startups et scale-ups tech',
      agence_pub: 'Agences de publicité et communication',
      hotel: 'Hôtels et établissements hôteliers',
      immo: 'Agences et promoteurs immobiliers',
      medical: 'Cliniques et centres médicaux',
      production: 'Maisons de production audiovisuelle et cinéma',
      ecole: 'Grandes écoles et universités',
      institution: 'Institutions publiques et culturelles',
      luxe: 'Maisons de luxe et de mode',
      tech: 'Entreprises technologiques',
      conseil: 'Cabinets de conseil et finance',
      medias: 'Médias et presse',
      coworking: 'Espaces de coworking et flex-office',
      banque: 'Banques, assurances et fonds d\'investissement',
      sport: 'Clubs sportifs et fédérations',
      pharma: 'Laboratoires pharmaceutiques et biotech',
      restauration: 'Groupes de restauration',
    }

    const prompt = `Tu es un expert en prospection B2B pour Meshuga Crazy Deli (3 rue Vavin, Paris 6e) — restaurant new-yorkais premium spécialisé en plateaux déjeuner B2B livrés et catering événementiel.

Génère exactement ${count} entreprises RÉELLES dans la catégorie "${catLabels[cat] || cat}", localisées dans la zone "${zone}".

RÈGLES :
- Noms d'entreprises réels et vérifiables
- Adresses parisiennes réelles (numéro, rue, code postal)
- Emails au format standard (contact@domaine.fr)
- Pitch personnalisé pour Meshuga (pourquoi cette entreprise a besoin de nos services)
- Score 1-10 selon le budget food estimé

Réponds UNIQUEMENT avec du JSON valide, sans texte ni markdown :
[{
  "name": "Nom exact",
  "contact_name": "Prénom Nom ou titre générique",
  "contact_email": "email@domaine.fr",
  "contact_phone": "01 XX XX XX XX",
  "contact_role": "Poste du contact",
  "site": "domaine.fr",
  "taille": "10-50",
  "arr": "Paris Xe",
  "adresse": "12 rue de la Paix, 75001 Paris",
  "ve": 1500,
  "vm": 0,
  "type": "Plateaux déjeuner / Catering events",
  "pitch": "Argument spécifique Meshuga",
  "score": 7
}]`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })

    const prospects = JSON.parse(jsonMatch[0])

    // Insert into Supabase with service role key (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [] } }
    )

    const toInsert = prospects.map((p: any, i: number) => ({
      id: `gen_${cat}_${Date.now()}_${i}`,
      cat,
      name: p.name || '—',
      contact_name: p.contact_name || '—',
      contact_email: p.contact_email || '—',
      contact_phone: p.contact_phone || '—',
      contact_role: p.contact_role || '—',
      site: p.site || '—',
      taille: p.taille || '10-50',
      arr: p.arr || 'Paris',
      adresse: p.adresse || '',
      ve: parseInt(p.ve) || 1000,
      vm: parseInt(p.vm) || 0,
      type: p.type || 'Plateaux déjeuner',
      pitch: p.pitch || '',
      score: Math.min(10, Math.max(1, parseInt(p.score) || 5)),
      status: 'to_contact',
    }))

    const { error } = await supabase.from('chasse_prospects').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ inserted: toInsert.length })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
