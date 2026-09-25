// src/lib/events/config.ts
// Meshuga Events — configuration partagée du site events.meshuga.fr
// (catalogue, panier, checkout SumUp). Modifier ici, nulle part ailleurs.

export var EVENTS_CONFIG = {
  // Livraison Paris intra-muros, forfait fixe
  deliveryFeeHt: 30,
  deliveryTvaPct: 10,
  deliveryZoneLabel: 'Paris intra-muros',
  deliveryCpPrefix: '750', // 75001 à 75020 (+ 75116)

  // Délai minimum de commande en jours ouvrés (hors samedi, dimanche, fériés)
  leadBusinessDays: 2,

  // Contact affiché quand la date est trop proche ou pour le live cooking
  // Portable d'Emy en attendant le numéro Meshuga (Twilio, redirection portables)
  phoneDisplay: '06 24 67 78 66',
  phoneHref: 'tel:+33624677866',
  email: 'events@meshuga.fr',

  // Catégorie de catering_offerings vendue en ligne
  onlineCategory: 'box_mini',
}

function pad2(n: number) {
  return n < 10 ? '0' + n : '' + n
}

export function toIsoDate(d: Date) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

// Dimanche de Pâques (algorithme de Meeus/Jones/Butcher)
function easterSunday(year: number) {
  var a = year % 19
  var b = Math.floor(year / 100)
  var c = year % 100
  var d = Math.floor(b / 4)
  var e = b % 4
  var f = Math.floor((b + 8) / 25)
  var g = Math.floor((b - f + 1) / 3)
  var h = (19 * a + b - d - g + 15) % 30
  var i = Math.floor(c / 4)
  var k = c % 4
  var l = (32 + 2 * e + 2 * i - h - k) % 7
  var m = Math.floor((a + 11 * h + 22 * l) / 451)
  var month = Math.floor((h + l - 7 * m + 114) / 31)
  var day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(d: Date, n: number) {
  var r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  r.setDate(r.getDate() + n)
  return r
}

// Jours fériés France métropolitaine
export function frenchHolidays(year: number) {
  var easter = easterSunday(year)
  var list = [
    year + '-01-01',
    toIsoDate(addDays(easter, 1)),  // lundi de Pâques
    year + '-05-01',
    year + '-05-08',
    toIsoDate(addDays(easter, 39)), // Ascension
    toIsoDate(addDays(easter, 50)), // lundi de Pentecôte
    year + '-07-14',
    year + '-08-15',
    year + '-11-01',
    year + '-11-11',
    year + '-12-25',
  ]
  return list
}

export function isBusinessDay(d: Date) {
  var dow = d.getDay()
  if (dow === 0 || dow === 6) return false
  var iso = toIsoDate(d)
  return frenchHolidays(d.getFullYear()).indexOf(iso) === -1
}

// Date du jour à Paris (les serveurs Vercel tournent en UTC)
export function parisToday() {
  var iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  var p = iso.split('-')
  return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10))
}

// Première date de livraison possible : aujourd'hui + N jours ouvrés pleins.
// Commande passée lundi -> livrable au plus tôt mercredi.
export function earliestDeliveryDate(now?: Date) {
  var ref = now ? now : parisToday()
  var d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  var count = 0
  while (count < EVENTS_CONFIG.leadBusinessDays) {
    d = addDays(d, 1)
    if (isBusinessDay(d)) count++
  }
  return d
}

// Vérifie qu'une date ISO (YYYY-MM-DD) respecte le délai
export function isDeliveryDateAllowed(isoDate: string, now?: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false
  var parts = isoDate.split('-')
  var d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  var min = earliestDeliveryDate(now)
  return d.getTime() >= min.getTime()
}

export function isParisPostcode(cp: string) {
  var clean = (cp || '').replace(/\s/g, '')
  if (clean === '75116') return true
  if (!/^750\d{2}$/.test(clean)) return false
  var arr = parseInt(clean.slice(3), 10)
  return arr >= 1 && arr <= 20
}

export function htToTtc(ht: number, tvaPct: number) {
  return Math.round(ht * (1 + tvaPct / 100) * 100) / 100
}
