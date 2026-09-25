// src/lib/events/allergens.ts
// Allergènes majeurs (règlement UE 1169/2011) des minis Meshuga.
// Établi à partir des fiches recettes du dashboard (sept. 2026).
// À METTRE À JOUR si une recette ou un fournisseur change.

// Présents dans tous les minis : pain brioché (gluten, œufs, lait) + beurre (lait)
export var ALLERGEN_BASE = ['Gluten', 'Œufs', 'Lait']

// Allergènes en plus de la base, par mini (clé = nom tel qu'écrit dans les compositions)
export var MINI_ALLERGENS = {
  'Mini Melt': [],
  'Mini Hot Dog': ['Moutarde'],
  'Mini Egg': ['Moutarde'],
  'Mini PBN': ['Arachides', 'Fruits à coque', 'Soja'],
  'Mini Caesar': ['Poisson', 'Moutarde'],
  'Mini Spicy Tuna': ['Poisson', 'Moutarde'],
  'Mini Reuben': ['Moutarde'],
  'Mini Lox': ['Poisson'],
  'Mini Tarama': ['Poisson'],
  'Mini Lobster': ['Crustacés', 'Moutarde'],
  'Mini Cheesecake': [],
}

var ORDER = ['Gluten', 'Crustacés', 'Œufs', 'Poisson', 'Arachides', 'Soja', 'Lait', 'Fruits à coque', 'Céleri', 'Moutarde', 'Sésame', 'Sulfites', 'Lupin', 'Mollusques']

// "20 Mini Lobster · 10 Mini Lox" -> ['Gluten','Crustacés','Œufs','Poisson','Lait','Moutarde']
// Renvoie null si un mini de la composition est inconnu (on affiche alors « nous consulter »).
export function boxAllergens(composition) {
  var parts = String(composition || '').split('·')
  var found = {}
  var unknown = false
  ALLERGEN_BASE.forEach(function (a) { found[a] = true })
  parts.forEach(function (raw) {
    var name = raw.trim().replace(/^\d+\s+/, '')
    if (!name) return
    var extra = MINI_ALLERGENS[name]
    if (!extra) { unknown = true; return }
    extra.forEach(function (a) { found[a] = true })
  })
  if (unknown) return null
  return ORDER.filter(function (a) { return found[a] })
}
