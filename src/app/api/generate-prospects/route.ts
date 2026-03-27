// FICHIER : src/app/api/generate-prospects/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { cat, zone, count = 25 } = await req.json()

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 500 })

    const catLabels: any = {
      evenementiel: "Agences événementielles et organisateurs d'événements",
      avocats: 'Cabinets avocats et études notariales',
      startup: 'Startups et scale-ups tech',
      agence_pub: 'Agences publicité et communication',
      hotel: 'Hôtels et établissements hôteliers',
      immo: 'Agences et promoteurs immobiliers',
      medical: 'Cliniques et centres médicaux',
      production: 'Maisons de production audiovisuelle',
      ecole: 'Grandes écoles et universités',
      institution: 'Institutions publiques et culturelles',
      luxe: 'Maisons de luxe et de mode',
      tech: 'Entreprises technologiques',
      conseil: 'Cabinets de conseil et finance',
      medias: 'Médias et presse',
      coworking: 'Espaces de coworking',
      banque: 'Banques, assurances et fonds',
      sport: 'Clubs sportifs et fédérations',
      pharma: 'Laboratoires pharmaceutiques',
    }

    const prompt = `Tu es un expert en prospection B2B pour Meshuga Crazy Deli (3 rue Vavin, Paris 6e) — restaurant new-yorkais premium spécialisé en plateaux déjeuner B2B livrés et catering événementiel haut de gamme.

Génère exactement ${count} entreprises RÉELLES dans la catégorie "${catLabels[cat] || cat}", localisées dans la zone "${zone}".

RÈGLES ABSOLUES :
- Noms d'entreprises réels et vérifiables
- Adresses parisiennes réelles (numéro, rue, code postal)
- Emails au format standard du domaine
- Pitch personnalisé et spécifique à Meshuga
- Score 1-10 selon le budget food estimé (10 = très gros budget)

Réponds UNIQUEMENT avec du JSON valide, sans texte ni markdown avant ou après :
[{
  "name": "Nom exact de l'entreprise",
  "contact_name": "Prénom Nom ou titre générique",
  "contact_email": "email@domaine.fr",
  "contact_phone": "01 XX XX XX XX",
  "contact_role": "Poste du contact",
  "site": "domaine.fr",
  "taille": "10-50",
  "arr": "Paris Xe",
  "adresse": "12 rue exemple, 75001 Paris",
  "ve": 1500,
  "vm": 0,
  "type": "Plateaux déjeuner / Catering events",
  "pitch": "Argument spécifique pourquoi Meshuga leur convient",
  "score": 7
}]`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const aiData = await aiRes.json()
    const text = aiData.content?.[0]?.text || ''
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return NextResponse.json({ error: 'Format IA invalide' }, { status: 500 })

    const prospects = JSON.parse(jsonMatch[0])

    // Supabase avec service role key (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
