import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { prospect } = body

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect manquant' }, { status: 400 })
    }

    var prompt = `Tu es un expert commercial pour Meshuga Crazy Deli, un New York deli new-yorkais situé 3 rue Vavin, Paris 6e.
Emy est commerciale terrain B2B. Elle va appeler ce prospect pour proposer des plateaux repas, sandwichs, brunchs ou catering corporate.

PROSPECT :
- Nom : ${prospect.name}
- Secteur : ${prospect.category || 'Non précisé'}
- Taille : ${prospect.size || 'Non précisé'}
- Localisation : ${prospect.arrondissement || 'Paris'}
- Notes : ${prospect.notes || 'Aucune'}
- Température : ${prospect.temperature || 'tiède'}
- Statut : ${prospect.status || 'à contacter'}

Génère un script d'appel téléphonique structuré et naturel pour Emy. Format :

🎯 OBJECTIF DE L'APPEL
[1 phrase claire]

📞 ACCROCHE (10 secondes)
[Phrase d'ouverture percutante]

💬 PITCH (30 secondes)
[Argument principal adapté à leur secteur]

❓ QUESTION CLÉ
[1 question ouverte pour qualifier le besoin]

🛡️ OBJECTION PROBABLE + RÉPONSE
[L'objection la plus fréquente dans ce secteur + comment la contrer]

🎯 CALL TO ACTION
[Ce qu'Emy doit obtenir à la fin de l'appel]

📝 INFOS UTILES
- Prix moyen plateau : 18-35€ HT/pers
- Commande min : 10 personnes
- Livraison Paris 1er-20e incluse
- Meshuga = Certifié kasher, sans GLO, fait maison

Sois direct, humain, pas trop commercial. Emy est sympa et naturelle.`

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    var data = await res.json()
    var content = data.content?.[0]?.text || 'Erreur de génération'

    return NextResponse.json({ content })
  } catch (e: any) {
    console.error('generate-script error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
