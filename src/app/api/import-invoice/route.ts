import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

export async function POST(req: Request) {
  try {
    var body = await req.json()
    var { pdfBase64, fileName, mediaType } = body
    if (!pdfBase64) {
      return NextResponse.json({ error: 'PDF manquant' }, { status: 400 })
    }

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: [
            {
              type: (mediaType && mediaType.startsWith('image/')) ? 'image' : 'document',
              source: {
                type: 'base64',
                media_type: (mediaType && mediaType.startsWith('image/')) ? mediaType : 'application/pdf',
                data: pdfBase64
              }
            },
            {
              type: 'text',
              text: `Tu es un assistant pour Meshuga Crazy Deli, un restaurant à Paris.
Extrais TOUTES les lignes de cette facture fournisseur, y compris emballages, produits ménagers, boissons, etc.

Pour chaque produit, catégorise-le :
- "ingredient" = produit alimentaire utilisé dans les recettes (viande, fromage, légumes, condiments, pain, etc.)
- "packaging" = emballage (boites, sacs, serviettes, gobelets, films, etc.)
- "consommable" = produit ménager ou non-alimentaire (liquide vaisselle, essuie-tout, gants, sacs poubelle, huile friture, etc.)

IMPORTANT pour le prix unitaire :
- Ramène TOUJOURS le prix à l'unité de base (par kg, par L, ou par unité individuelle)
- Si vendu en bidon de 5kg à 8.25€ → prix_unitaire_ht = 1.65, unite = "kg"
- Si vendu en poche de 650g à 4€ → prix_unitaire_ht = 6.15, unite = "kg"
- Si vendu au pot de 4.08kg à 34€ → prix_unitaire_ht = 8.33, unite = "kg"
- Si unitaire (bouteille, canette) → unite = "U"
- Si au litre → unite = "L"

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "fournisseur": "Nom du fournisseur",
  "date": "AAAA-MM-JJ",
  "total_ht": 0.00,
  "lignes": [
    {
      "article": "nom simplifié court",
      "article_original": "description complète facture",
      "categorie": "ingredient ou packaging ou consommable",
      "quantite": 1.0,
      "unite": "kg ou U ou L",
      "prix_unitaire_ht": 0.00,
      "conditionnement": "ex: BID 5kg, PCH 650g"
    }
  ]
}`
            }
          ]
        }]
      })
    })

    var data = await res.json()
    var text = data.content?.[0]?.text?.trim() || ''
    text = text.replace(/\`\`\`json\n?/g, '').replace(/\`\`\`\n?/g, '').trim()
    var parsed = JSON.parse(text)

    // STEP 2: Match products and insert prices
    var supabase = getSupabase()
    var matched = []
    var unmatched = []

    // Get all suppliers
    var { data: suppliers } = await supabase.from('suppliers').select('id, name')
    var supplierMap = {}
    ;(suppliers || []).forEach(function(s) { supplierMap[s.name.toLowerCase()] = s.id })

    // Find supplier ID
    var fournisseurName = parsed.fournisseur || ''
    var supplierId = null
    Object.keys(supplierMap).forEach(function(key) {
      if (fournisseurName.toLowerCase().indexOf(key) > -1 || key.indexOf(fournisseurName.toLowerCase()) > -1) {
        supplierId = supplierMap[key]
      }
    })

    // Get all products for this supplier
    var productsQuery = supplierId
      ? supabase.from('products').select('id, name, unit, current_price, supplier_id').eq('supplier_id', supplierId)
      : supabase.from('products').select('id, name, unit, current_price, supplier_id')
    var { data: existingProducts } = await productsQuery

    var invoiceDate = parsed.date || new Date().toISOString().split('T')[0]

    for (var i = 0; i < (parsed.lignes || []).length; i++) {
      var ligne = parsed.lignes[i]
      var articleLower = (ligne.article || '').toLowerCase()

      // Fuzzy match
      var bestMatch = null
      var bestScore = 0
      ;(existingProducts || []).forEach(function(ep) {
        var epLower = ep.name.toLowerCase()
        if (epLower === articleLower) { bestMatch = ep; bestScore = 100 }
        else if (bestScore < 80 && (epLower.indexOf(articleLower) > -1 || articleLower.indexOf(epLower) > -1)) { bestMatch = ep; bestScore = 80 }
        else if (bestScore < 50) {
          var words = articleLower.split(' ')
          var matchWords = 0
          words.forEach(function(w) { if (w.length > 2 && epLower.indexOf(w) > -1) matchWords++ })
          var score = words.length > 0 ? (matchWords / words.length) * 60 : 0
          if (score > bestScore) { bestMatch = ep; bestScore = score }
        }
      })

      if (bestMatch && bestScore >= 50) {
        // Insert price history
        await supabase.from('product_prices').insert({
          product_id: bestMatch.id,
          price: ligne.prix_unitaire_ht,
          invoice_date: invoiceDate,
          invoice_filename: fileName || null
        })

        // Update current price
        await supabase.from('products').update({
          current_price: ligne.prix_unitaire_ht
        }).eq('id', bestMatch.id)

        matched.push({
          article: ligne.article,
          matched_to: bestMatch.name,
          score: bestScore,
          old_price: bestMatch.current_price,
          new_price: ligne.prix_unitaire_ht,
          change_pct: bestMatch.current_price > 0 ? ((ligne.prix_unitaire_ht - bestMatch.current_price) / bestMatch.current_price * 100) : 0
        })
      } else {
        unmatched.push({
          article: ligne.article,
          article_original: ligne.article_original,
          categorie: ligne.categorie || 'ingredient',
          unite: ligne.unite,
          prix_unitaire_ht: ligne.prix_unitaire_ht,
          conditionnement: ligne.conditionnement
        })
      }
    }

    return NextResponse.json({
      fournisseur: parsed.fournisseur,
      date: invoiceDate,
      total_ht: parsed.total_ht,
      supplier_id: supplierId,
      matched: matched,
      unmatched: unmatched,
      lignes: parsed.lignes
    })
  } catch (e: any) {
    console.error('import-invoice error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
