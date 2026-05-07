// ============================================================
// src/lib/fonts/arial-narrow.ts
// ============================================================
// Arial Narrow — font système disponible nativement sur Mac/Windows.
// Pas de blob à embarquer pour un usage navigateur : la font est résolue
// par le système d'exploitation côté client.
//
// Charte : sous-titres / infos complémentaires / body.
//
// ⚠️ Limite : Arial Narrow n'est PAS disponible sur Linux par défaut, donc
// le rendu PDF côté serveur (WeasyPrint sur Vercel) tombera en fallback
// sur Arial puis sans-serif système. Si la qualité visuelle l'exige plus
// tard, on pourra self-hoster une alternative équivalente
// (Roboto Condensed, Barlow Condensed, etc.) en .woff2 base64.
//
// Usage :
//   import {{ ARIAL_NARROW_STACK }} from "@/lib/fonts"
//   element.style.fontFamily = ARIAL_NARROW_STACK
// ============================================================

export const ARIAL_NARROW_STACK = "'Arial Narrow', Arial, sans-serif"

// Pas de @font-face pour Arial Narrow : la font est résolue par le système.
// Constante FONTFACE vide pour cohérence d'API avec les autres fonts.
export const ARIAL_NARROW_FONTFACE = ""
