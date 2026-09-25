// src/lib/events/minis.ts
// Description de chaque mini (reprise de la carte 2026) pour détailler le contenu des box.
// Clé = nom tel qu'écrit dans les compositions de catering_offerings.

export var MINI_DESCRIPTIONS = {
  'Mini Melt': 'Gouda, cheddar, american cheese, cébette, pickles d\'oignons rouges maison',
  'Mini Hot Dog': 'Saucisse, ketchup, yellow mustard, sweet relish, crispy onions',
  'Mini Egg': 'Œufs, secret mayo, sucrine',
  'Mini PBN': 'Beurre de cacahuète crunchy, Nutella',
  'Mini Caesar': 'Poulet grillé, sauce César maison, sucrine',
  'Mini Spicy Tuna': 'Thon, mayo épicée maison, american cheese, pickles d\'oignons rouges maison',
  'Mini Reuben': 'Pastrami, american cheese, cornichons, sauce russe maison',
  'Mini Lox': 'Saumon fumé, cream cheese maison, sucrine, pickles d\'oignons rouges maison',
  'Mini Tarama': 'Tarama, œufs de saumon',
  'Mini Lobster': 'Homard, mayo estragon maison, citron jaune',
  'Mini Cheesecake': 'Cheesecake new-yorkais en format bouchée',
}

// "20 Mini Lobster · 10 Mini Lox" -> [{ qty: 20, name: 'Mini Lobster', desc: '...' }, ...]
export function boxLines(composition) {
  return String(composition || '')
    .split('·')
    .map(function (raw) {
      var s = raw.trim()
      var m = s.match(/^(\d+)\s+(.+)$/)
      if (!m) return null
      var name = m[2].trim()
      return { qty: parseInt(m[1], 10), name: name, desc: MINI_DESCRIPTIONS[name] || '' }
    })
    .filter(function (x) { return x !== null })
}
