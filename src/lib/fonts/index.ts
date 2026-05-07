// ============================================================
// src/lib/fonts/index.ts
// ============================================================
// Point d'entrée centralisé pour les fonts de la charte Meshuga.
//
// Fonts de la charte (cf. charte graphique V5) :
//   - BILD Condensed Black (Lineto, commerciale, self-hosted)
//       → titres / infos principales (gros, condensé, impactant)
//   - Arial Narrow (système Mac/Windows)
//       → sous-titres / body / infos complémentaires
//   - Yellowtail (Google Fonts OFL, self-hosted)
//       → textes décoratifs / branding / signatures
//
// Stratégie self-host :
//   Toutes les fonts (sauf Arial Narrow qui est système) sont embarquées
//   en base64 pour garantir :
//     - Rendu serveur (WeasyPrint sur Vercel) sans accès CDN
//     - Rendu instantané sans FOUT
//     - Indépendance des CDN externes
//
// Usage type — dans un composant ou builder HTML/PDF :
//
//   import {
//     BILD_CONDENSED_FONTFACE,
//     YELLOWTAIL_FONTFACE,
//     BILD_CONDENSED_STACK,
//     ARIAL_NARROW_STACK,
//     YELLOWTAIL_STACK,
//   } from "@/lib/fonts"
//
//   var styles =
//     BILD_CONDENSED_FONTFACE +
//     YELLOWTAIL_FONTFACE +
//     "h1 { font-family: " + YELLOWTAIL_STACK + "; }" +
//     "h2 { font-family: " + BILD_CONDENSED_STACK + "; }" +
//     "body { font-family: " + ARIAL_NARROW_STACK + "; }"
//
// Helper combiné : ALL_MESHUGA_FONTFACES injecte les 3 @font-face d'un coup.
// ============================================================

export {
  BILD_CONDENSED_BLACK_OTF_B64,
  BILD_CONDENSED_FONTFACE,
  BILD_CONDENSED_STACK,
} from "./bild"

export {
  YELLOWTAIL_WOFF2_B64,
  YELLOWTAIL_FONTFACE,
  YELLOWTAIL_STACK,
} from "./yellowtail"

export {
  ARIAL_NARROW_STACK,
  ARIAL_NARROW_FONTFACE,
} from "./arial-narrow"

import { BILD_CONDENSED_FONTFACE } from "./bild"
import { YELLOWTAIL_FONTFACE } from "./yellowtail"

// Helper : injecte les 3 @font-face Meshuga en une seule string CSS.
// À utiliser en première position de toute déclaration <style> pour garantir
// que les fonts sont chargées avant que les règles qui les référencent ne s'appliquent.
export const ALL_MESHUGA_FONTFACES = BILD_CONDENSED_FONTFACE + YELLOWTAIL_FONTFACE
