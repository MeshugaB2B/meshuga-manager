// src/lib/imageCompress.ts
// Helper de compression d'images côté navigateur (Canvas API native).
// But : réduire la taille des photos avant upload pour passer sous la limite
// Vercel de 4.5 MB sur le body des serverless functions.
//
// 2 niveaux de compression progressifs :
//   - Niveau 1 (par défaut) : max 2000px / JPEG 85%
//   - Niveau 2 (si total > 4 MB) : max 1500px / JPEG 75%
//
// SWC-safe : var, function, pas de generics.

// Cible totale en MB après compression. Si dépasse, on recompresse plus fort.
var TARGET_TOTAL_MB = 4.0
// Limite de taille au-delà de laquelle on compresse
var COMPRESS_THRESHOLD_MB = 1.0

// Niveau 1 (par défaut)
var L1_MAX_WIDTH = 2000
var L1_QUALITY = 0.85

// Niveau 2 (plus aggressive si L1 ne suffit pas)
var L2_MAX_WIDTH = 1500
var L2_QUALITY = 0.75

// Niveau 3 (dernière chance si L2 ne suffit pas — pour gros volumes)
var L3_MAX_WIDTH = 1200
var L3_QUALITY = 0.65

// Types qu'on accepte de compresser (PDF jamais touché, HEIC laissé au serveur)
var COMPRESSIBLE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export function shouldCompress(file: any): boolean {
  if (!file) return false
  var mime = (file.type || "").toLowerCase()
  if (COMPRESSIBLE_MIMES.indexOf(mime) < 0) return false
  var sizeMb = file.size / (1024 * 1024)
  return sizeMb > COMPRESS_THRESHOLD_MB
}

// Compresser un fichier image avec des paramètres donnés.
// Retourne un nouveau File (ou l'original si compression inutile/impossible).
export async function compressImageFile(file: any, maxWidth: number, quality: number): Promise<any> {
  var mime = (file?.type || "").toLowerCase()
  if (COMPRESSIBLE_MIMES.indexOf(mime) < 0) return file

  return new Promise(function (resolve, reject) {
    try {
      var url = URL.createObjectURL(file)
      var img = new Image()

      img.onload = function () {
        try {
          var origW = img.naturalWidth || img.width
          var origH = img.naturalHeight || img.height

          // Si déjà assez petit, on revient sans compresser
          if (origW <= maxWidth) {
            URL.revokeObjectURL(url)
            // On peut quand même tenter la ré-encode JPEG si la qualité veut le réduire
            // mais souvent c'est inutile ; on garde l'original
            resolve(file)
            return
          }

          var ratio = maxWidth / origW
          var newW = maxWidth
          var newH = Math.round(origH * ratio)

          var canvas = document.createElement("canvas")
          canvas.width = newW
          canvas.height = newH
          var ctx = canvas.getContext("2d")
          if (!ctx) {
            URL.revokeObjectURL(url)
            resolve(file)
            return
          }

          // Fond blanc pour les PNG transparents (évite l'effet "transparent->noir" en JPEG)
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, newW, newH)
          ctx.drawImage(img, 0, 0, newW, newH)

          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url)
            if (!blob) {
              resolve(file)
              return
            }
            // Si la "compression" donne plus gros que l'original, on garde l'original
            if (blob.size >= file.size) {
              resolve(file)
              return
            }
            var newName = file.name
            var lastDot = newName.lastIndexOf(".")
            if (lastDot > 0) newName = newName.slice(0, lastDot) + ".jpg"
            else newName = newName + ".jpg"
            var compressed = new File([blob], newName, {
              type: "image/jpeg",
              lastModified: file.lastModified || Date.now(),
            })
            resolve(compressed)
          }, "image/jpeg", quality)
        } catch (e) {
          URL.revokeObjectURL(url)
          resolve(file)
        }
      }

      img.onerror = function () {
        URL.revokeObjectURL(url)
        resolve(file)
      }

      img.src = url
    } catch (e) {
      resolve(file)
    }
  })
}

// Compresser une liste de fichiers en série avec un niveau donné.
// onProgress(cur, total, levelName)
async function compressListAtLevel(
  files: any[],
  maxWidth: number,
  quality: number,
  levelName: string,
  onProgress: any
): Promise<any[]> {
  var results = []
  for (var i = 0; i < files.length; i++) {
    if (onProgress) onProgress(i, files.length, levelName)
    var compressed = await compressImageFile(files[i], maxWidth, quality)
    results.push(compressed)
  }
  return results
}

// Calculer la taille totale en MB d'un tableau de Files
export function totalSizeMb(files: any[]): number {
  var total = 0
  for (var i = 0; i < files.length; i++) {
    total += (files[i].size || 0)
  }
  return total / (1024 * 1024)
}

// Compresser une liste de fichiers progressivement jusqu'à passer sous TARGET_TOTAL_MB.
// Tente niveau 1, puis niveau 2, puis niveau 3 si nécessaire.
// onProgress(cur, total, levelName)
export async function compressFileList(
  files: any[],
  onProgress: any
): Promise<any[]> {
  // Niveau 1
  var result = await compressListAtLevel(files, L1_MAX_WIDTH, L1_QUALITY, "L1", onProgress)
  var size = totalSizeMb(result)
  if (size <= TARGET_TOTAL_MB) {
    if (onProgress) onProgress(files.length, files.length, "L1")
    return result
  }

  // Niveau 2 — on compresse depuis les ORIGINAUX (pas depuis L1, sinon double perte)
  result = await compressListAtLevel(files, L2_MAX_WIDTH, L2_QUALITY, "L2", onProgress)
  size = totalSizeMb(result)
  if (size <= TARGET_TOTAL_MB) {
    if (onProgress) onProgress(files.length, files.length, "L2")
    return result
  }

  // Niveau 3 — dernière chance avant échec
  result = await compressListAtLevel(files, L3_MAX_WIDTH, L3_QUALITY, "L3", onProgress)
  if (onProgress) onProgress(files.length, files.length, "L3")
  return result
}
