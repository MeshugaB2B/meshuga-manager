// ============================================================
// src/lib/prospectEmail.ts
// ============================================================
// Pitch emails prospects B2B — données partagées + builder HTML.
// Utilisé côté client (aperçu live dans ProspectEmailModal) ET côté
// serveur (/api/prospect-email/send) → l'aperçu = exactement le mail envoyé.
//
// Pour modifier une référence, un lien presse ou une signature :
// c'est ICI, et uniquement ici.
// ============================================================

// ---------- Presse ----------
// "tv" = mise en avant vidéo (bloc dédié), les autres = pastilles cliquables.
export var PRESS_TV = {
  key: 'paris_premiere',
  name: 'Paris Première',
  show: 'Très Très Bon',
  label: 'Le reportage de Très Très Bon sur Paris Première',
  url: 'https://www.facebook.com/TresTresBon/videos/street-food-meshuga/648051137321383/'
}

export var PRESS_LINKS = [
  { key: 'telerama', name: 'Télérama', label: 'De la street food de haut niveau près du Luxembourg', url: 'https://www.telerama.fr/restos-loisirs/meshuga-de-la-street-food-de-haut-niveau-pres-du-jardin-du-luxembourg_cri-7043251.php', fit: 'corporate' },
  { key: 'lesechos', name: 'Les Echos', label: 'Parmi les meilleurs grilled cheese de Paris', url: 'https://www.lesechos.fr/weekend/gastronomie-vins/ou-manger-les-meilleurs-grilled-cheese-1873791', fit: 'corporate' },
  { key: 'konbini', name: 'Konbini', label: 'Le deli aux sandwichs les plus réconfortants du moment', url: 'https://www.konbini.com/food/on-a-teste-meshuga-le-deli-aux-sandwiches-les-plus-confort-du-moment/', fit: 'creative' },
  { key: 'doitinparis', name: 'Do It In Paris', label: 'La street food US à Paris', url: 'https://www.doitinparis.com/fr/street-food-usa-paris-26393', fit: 'creative' },
  { key: 'grazia', name: 'Grazia', label: 'Nos sundaes dans la sélection de l’été', url: 'https://www.grazia.fr/cuisine/surprenantes-regressives-ou-rafraichissantes-les-meilleures-adresses-ou-deguster-de-bonnes-glaces-cet-ete-a-paris-773498.html', fit: 'luxury' },
  { key: 'acumen', name: 'Magazine Acumen', label: 'La nouvelle adresse qui fait bouger la Rive Gauche', url: 'https://magazine-acumen.com/gastronomie/meshuga-la-nouvelle-adresse-qui-fait-bouger-la-rive-gauche-parisienne/', fit: 'local' }
]

// ---------- Références pros ----------
export var REFERENCES = [
  { key: 'mk2', title: 'mk2 Cinéma Paradiso Louvre', detail: 'Festival de cinéma en plein air dans la Cour Carrée du Louvre' },
  { key: 'labels', title: 'Soirées de lancement de labels musicaux', detail: 'Food NY-style pour artistes, équipes et invités' },
  { key: 'fromfuture', title: 'From Future', detail: 'Événements privés sur mesure' }
]

// ---------- Offre (contexte IA) ----------
export var OFFER_SUMMARY =
  'Meshuga Events = le traiteur de Meshuga, deli new-yorkais du 3 rue Vavin (Paris 6e). ' +
  'Pour les pros : boxes de mini-sandwichs NY-style (lobster roll, Reuben, grilled cheese…) et mini cheesecakes pour réunions et déjeuners d’équipe, ' +
  'cocktails, lancements de produits ou de labels, soirées privées, show cooking / mise en place sur site, livraison Paris & Île-de-France.'

// ---------- Adresses d'envoi / réponse ----------
// Tous les pitchs partent de FROM_EMAIL ; toutes les réponses arrivent sur REPLY_TO_EMAIL.
export var FROM_EMAIL = 'events@meshuga.fr'
export var REPLY_TO_EMAIL = 'hello@meshuga.fr'

// ---------- Expéditeurs ----------
export var SENDERS = {
  edward: { key: 'edward', name: 'Edward Touret', firstName: 'Edward', role: 'Fondateur', email: 'edward@meshuga.fr', phone: '06 58 58 58 01' },
  emy: { key: 'emy', name: 'Emy Soulabaille', firstName: 'Emy', role: 'Responsable B2B & événements', email: 'emy@meshuga.fr', phone: '' }
}

export var EMAIL_TYPES = [
  { key: 'first', label: 'Premier contact' },
  { key: 'relance', label: 'Relance' },
  { key: 'devis_relance', label: 'Suivi devis' }
]

// ---------- Helpers ----------
export function getSender(key: any) {
  return key === 'emy' ? SENDERS.emy : SENDERS.edward
}

export function cleanEmail(s: any): string {
  if (!s || typeof s !== 'string') return ''
  var t = s.trim()
  if (t === '—' || t === '-') return ''
  return t
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s || '')
}

// Choix par défaut des pastilles presse selon la catégorie du prospect.
export function defaultPressKeys(category: any): string[] {
  var c = String(category || '').toLowerCase()
  if (/luxe|mode|fashion|beaut|cosm|joaill|hôtel|hotel|lifestyle/.test(c)) return ['grazia', 'telerama']
  if (/agence|créa|crea|startup|start-up|tech|média|media|music|musique|label|studio|prod|event|évén/.test(c)) return ['konbini', 'doitinparis']
  if (/avocat|cabinet|banque|finance|conseil|assur|corporate|rh|immobil|notaire|audit/.test(c)) return ['lesechos', 'telerama']
  if (/école|ecole|université|universite|galerie|librairie|6e|rive gauche/.test(c)) return ['acumen', 'telerama']
  return ['telerama', 'konbini']
}

export function sanitizePressKeys(keys: any): string[] {
  var valid = PRESS_LINKS.map(function (p) { return p.key })
  var out: string[] = []
  if (Array.isArray(keys)) {
    for (var i = 0; i < keys.length; i++) {
      var k = String(keys[i] || '')
      if (valid.indexOf(k) >= 0 && out.indexOf(k) < 0) out.push(k)
    }
  }
  return out.slice(0, 3)
}

function esc(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Texte → HTML : paragraphes, **gras**, URLs cliquables, lignes "- " en puces.
function textToHtml(text: string): string {
  var blocks = String(text || '').replace(/\r/g, '').split(/\n{2,}/)
  var html: string[] = []
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i].trim()
    if (!b) continue
    var lines = b.split('\n')
    var rendered: string[] = []
    for (var j = 0; j < lines.length; j++) {
      var line = esc(lines[j])
      line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      line = line.replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" style="color:#191923;text-decoration:underline;text-decoration-color:#FF82D7">$1</a>')
      if (/^[-•▸]\s+/.test(lines[j].trim())) {
        rendered.push('<div style="padding-left:14px;text-indent:-14px">▸&nbsp;' + line.replace(/^\s*[-•▸]\s+/, '') + '</div>')
      } else {
        rendered.push(line)
      }
    }
    html.push('<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#191923">' + rendered.join('<br>') + '</p>')
  }
  return html.join('')
}

// Version texte brut (multipart) — meilleure délivrabilité.
export function buildProspectEmailText(opts: any): string {
  var sender = getSender(opts.senderKey)
  var keys = sanitizePressKeys(opts.pressKeys)
  var out: string[] = []
  out.push(String(opts.body || '').trim())
  out.push('')
  out.push(sender.name + ' — ' + sender.role + ', Meshuga Events')
  out.push(REPLY_TO_EMAIL + (sender.phone ? ' · ' + sender.phone : ''))
  out.push('')
  if (opts.showTv !== false) {
    out.push('Vu à la télé — ' + PRESS_TV.label + ' : ' + PRESS_TV.url)
  }
  if (opts.showReferences !== false) {
    out.push('Ils nous ont fait confiance : ' + REFERENCES.map(function (r) { return r.title }).join(' · '))
  }
  if (keys.length) {
    out.push('Ils parlent de nous :')
    PRESS_LINKS.forEach(function (p) { if (keys.indexOf(p.key) >= 0) out.push('- ' + p.name + ' : ' + p.url) })
  }
  out.push('')
  out.push('Meshuga — 3 rue Vavin, 75006 Paris — meshuga.fr')
  return out.join('\n')
}

// Email HTML complet (tables + styles inline, compatible Gmail / Outlook / Apple Mail).
export function buildProspectEmailHtml(opts: any): string {
  var base = String(opts.baseUrl || 'https://dashboard.meshuga.fr').replace(/\/$/, '')
  var sender = getSender(opts.senderKey)
  var keys = sanitizePressKeys(opts.pressKeys)
  var showRefs = opts.showReferences !== false
  var showTv = opts.showTv !== false

  var logo = base + '/MESHUGA_Logotypepink.jpg'
  var tvTitle = base + '/api/og/yellowtail?text=' + encodeURIComponent('Vu à la télé !') + '&size=34&color=191923'

  var refsHtml = ''
  if (showRefs) {
    var rows = REFERENCES.map(function (r) {
      return (
        '<tr><td style="padding:9px 0;border-bottom:1px dashed #E3E3E3;font-size:14px;line-height:1.45;color:#191923">' +
          '<span style="color:#FF82D7;font-weight:900">&#9679;</span>&nbsp; <strong>' + esc(r.title) + '</strong>' +
          '<br><span style="color:#6B6B73;font-size:13px;padding-left:18px;display:inline-block">' + esc(r.detail) + '</span>' +
        '</td></tr>'
      )
    }).join('')
    refsHtml =
      '<tr><td class="px" style="padding:20px 36px 4px">' +
        '<div style="font-size:12px;font-weight:900;letter-spacing:1.5px;color:#191923;margin:0 0 4px">ILS NOUS ONT FAIT CONFIANCE</div>' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows + '</table>' +
      '</td></tr>'
  }

  var tvHtml = ''
  if (showTv) {
    tvHtml =
      '<tr><td class="px" style="padding:18px 30px 6px">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFEB5A" class="yellowbg" style="background:#FFEB5A;border:2px solid #191923;border-radius:12px;box-shadow:4px 4px 0 #191923">' +
          '<tr><td style="padding:18px 20px;text-align:center">' +
            '<img src="' + tvTitle + '" alt="Vu à la télé !" height="34" style="height:34px;width:auto;display:inline-block;border:0" />' +
            '<div class="ink" style="font-size:14px;line-height:1.5;color:#191923;margin:6px 0 14px">L’équipe de <strong>Très Très Bon</strong> est passée chez nous — le reportage diffusé sur <strong>Paris Première</strong>.</div>' +
            '<a href="' + esc(PRESS_TV.url) + '" style="display:inline-block;background:#191923;color:#FFEB5A;text-decoration:none;font-weight:900;font-size:14px;letter-spacing:.5px;padding:11px 22px;border-radius:9px">&#9654;&nbsp; Regarder le reportage</a>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>'
  }

  var pressHtml = ''
  if (keys.length) {
    var items = PRESS_LINKS.filter(function (p) { return keys.indexOf(p.key) >= 0 }).map(function (p) {
      return (
        '<tr><td style="padding:6px 0">' +
          '<a href="' + esc(p.url) + '" style="text-decoration:none;color:#191923;font-size:14px;line-height:1.4">' +
            '<span style="display:inline-block;background:#FF82D7;color:#FFFFFF;font-weight:900;font-size:12px;padding:3px 9px;border-radius:6px;border:1.5px solid #191923;margin-right:8px">' + esc(p.name) + '</span>' +
            '<span style="text-decoration:underline;text-decoration-color:#FF82D7">' + esc(p.label) + ' &rarr;</span>' +
          '</a>' +
        '</td></tr>'
      )
    }).join('')
    pressHtml =
      '<tr><td class="px" style="padding:16px 36px 4px">' +
        '<div style="font-size:12px;font-weight:900;letter-spacing:1.5px;color:#191923;margin:0 0 4px">ILS PARLENT DE NOUS</div>' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + items + '</table>' +
      '</td></tr>'
  }

  var signature =
    '<tr><td class="px" style="padding:0 36px 8px">' +
      '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
        '<td style="border-left:4px solid #FF82D7;padding:2px 0 2px 12px;font-size:14px;line-height:1.5;color:#191923">' +
          '<strong>' + esc(sender.name) + '</strong><br>' +
          '<span style="color:#6B6B73">' + esc(sender.role) + ' · Meshuga Events</span><br>' +
          '<a href="mailto:' + REPLY_TO_EMAIL + '" style="color:#191923;text-decoration:none">' + REPLY_TO_EMAIL + '</a>' +
          (sender.phone ? ' · <a href="tel:' + esc(sender.phone.replace(/\s/g, '')) + '" style="color:#191923;text-decoration:none">' + esc(sender.phone) + '</a>' : '') +
        '</td>' +
      '</tr></table>' +
    '</td></tr>'

  var cta =
    '<tr><td align="center" style="padding:22px 30px 26px">' +
      '<a href="mailto:' + REPLY_TO_EMAIL + '?subject=' + encodeURIComponent('Re: ' + (opts.subject || 'Meshuga Events')) + '" class="rosebg" style="display:inline-block;background:#FF82D7;color:#FFFFFF;text-decoration:none;font-weight:900;font-size:15px;padding:13px 28px;border-radius:11px;border:2.5px solid #191923;box-shadow:4px 4px 0 #191923">Organiser une dégustation</a>' +
      '<div style="font-size:12px;color:#8A8A92;margin-top:12px">Ou répondez simplement à ce mail.</div>' +
    '</td></tr>'

  return (
    '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
    '<title>' + esc(opts.subject || 'Meshuga Events') + '</title>' +
    '<style>' +
      ':root{color-scheme:light only}' +
      '@media (max-width:620px){.cardw{width:100%!important}.px{padding-left:20px!important;padding-right:20px!important}}' +
      '[data-ochsdarkmode] .cardw{background:#FFFFFF!important}[data-ochsdarkmode] .yellowbg{background:#FFEB5A!important}' +
      '[data-ochsdarkmode] .rosebg{background:#FF82D7!important}[data-ochsdarkmode] .ink{color:#191923!important}' +
    '</style></head>' +
    '<body bgcolor="#FFFDF5" style="margin:0;padding:0;background:#FFFDF5;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#FFFDF5" style="background:#FFFDF5"><tr><td align="center" style="padding:24px 10px">' +
      '<table role="presentation" class="cardw" width="600" cellpadding="0" cellspacing="0" bgcolor="#FFFFFF" style="width:600px;max-width:600px;background:#FFFFFF;border:3px solid #191923;border-radius:16px;box-shadow:7px 7px 0 #FF82D7">' +
        '<tr><td style="padding:26px 30px 8px;text-align:center"><img src="' + logo + '" alt="Meshuga" height="44" style="height:44px;width:auto;display:inline-block;max-width:70%;border:0" /></td></tr>' +
        '<tr><td class="px" style="padding:16px 36px 4px">' + textToHtml(opts.body || '') + '</td></tr>' +
        signature +
        tvHtml +
        refsHtml +
        pressHtml +
        cta +
        '<tr><td bgcolor="#FFFDF5" style="background:#FFFDF5;border-top:1px solid #EEE;border-radius:0 0 13px 13px;padding:16px 30px;text-align:center;font-size:11px;color:#8A8A92;line-height:1.7">' +
          '<strong style="color:#191923">Meshuga Events</strong> · 3 rue Vavin, 75006 Paris · <a href="https://meshuga.fr" style="color:#FF82D7;text-decoration:none">meshuga.fr</a><br>' +
          'SAS AEGIA FOOD — Vous ne souhaitez plus recevoir nos messages ? Répondez « stop », on vous retire aussitôt.' +
        '</td></tr>' +
      '</table>' +
    '</td></tr></table></body></html>'
  )
}
