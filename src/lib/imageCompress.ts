// src/lib/imageCompress.ts
// Helper de compression d'images côté navigateur (Canvas API native).
// But : réduire la taille des photos avant upload pour passer sous la limite
// Vercel de 4.5 MB sur le body des serverless functions.
// Réduit à max 2000px de large (largement suffisant pour OCR Claude Vision)
// et qualité JPEG 85%.
// SWC-safe : var, function, pas de generics.

// Limite de taille au-delà de laquelle on compresse
var COMPRESS_THRESHOLD_MB = 1.5
// Largeur max après compression (suffisant pour lire un contrat A4)
var MAX_WIDTH = 2000
// Qualité JPEG (0-1)
var JPEG_QUALITY = 0.85

// Types qu'on accepte de compresser (PDF jamais touché, HEIC laissé au serveur)
var COMPRESSIBLE_MIMES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

export function shouldCompress(file: any): boolean {
  if (!file) return false
  var mime = (file.type || "").toLowerCase()
  if (COMPRESSIBLE_MIMES.indexOf(mime) < 0) return false
  var sizeMb = file.size / (1024 * 1024)
  return sizeMb > COMPRESS_THRESHOLD_MB
}

// Compresser un fichier image. Retourne un nouveau File (ou l'original si compression inutile).
export async function compressImageFile(file: any): Promise<any> {
  if (!shouldCompress(file)) return file

  return new Promise(function (resolve, reject) {
    try {
      var url = URL.createObjectURL(file)
      var img = new Image()

      img.onload = function () {
        try {
          var origW = img.naturalWidth || img.width
          var origH = img.naturalHeight || img.height

          // Si déjà petit, on revient sans compresser (sécurité)
          if (origW <= MAX_WIDTH) {
            URL.revokeObjectURL(url)
            resolve(file)
            return
          }

          var ratio = MAX_WIDTH / origW
          var newW = MAX_WIDTH
          var newH = Math.round(origH * ratio)

          var canvas = document.createElement("canvas")
          canvas.width = newW
          canvas.height = newH
          var ctx = canvas.getContext("2d")
          if (!ctx) {
            URL.revokeObjectURL(url)
            resolve(file) // fallback : on garde l'original
            return
          }

          // Fond blanc pour les PNG transparents (évite l'effet "transparent->noir" en JPEG)
          ctx.fillStyle = "#FFFFFF"
          ctx.fillRect(0, 0, newW, newH)
          ctx.drawImage(img, 0, 0, newW, newH)

          canvas.toBlob(function (blob) {
            URL.revokeObjectURL(url)
            if (!blob) {
              resolve(file) // fallback
              return
            }
            // Si la "compression" donne plus gros que l'original (rare), on garde l'original
            if (blob.size >= file.size) {
              resolve(file)
              return
            }
            // Construire un nouveau File en gardant le nom (avec extension .jpg si on convertit)
            var newName = file.name
            var lastDot = newName.lastIndexOf(".")
            if (lastDot > 0) newName = newName.slice(0, lastDot) + ".jpg"
            else newName = newName + ".jpg"
            var compressed = new File([blob], newName, {
              type: "image/jpeg",
              lastModified: file.lastModified || Date.now(),
            })
            resolve(compressed)
          }, "image/jpeg", JPEG_QUALITY)
        } catch (e) {
          URL.revokeObjectURL(url)
          resolve(file) // fallback en cas d'erreur Canvas
        }
      }

      img.onerror = function () {
        URL.revokeObjectURL(url)
        resolve(file) // fallback : impossible de charger, on garde l'original
      }

      img.src = url
    } catch (e) {
      resolve(file)
    }
  })
}

// Compresser une liste de fichiers en série (évite de saturer la RAM)
// Reporte la progression via le callback optionnel.
export async function compressFileList(
  files: any[],
  onProgress: any
): Promise<any[]> {
  var results = []
  for (var i = 0; i < files.length; i++) {
    if (onProgress) onProgress(i, files.length)
    var compressed = await compressImageFile(files[i])
    results.push(compressed)
  }
  if (onProgress) onProgress(files.length, files.length)
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
