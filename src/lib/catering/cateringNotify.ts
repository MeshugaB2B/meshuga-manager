// Builders pour les communications post-signature d'un devis catering :
//  - email d'acompte au client (Brevo)
//  - notification (SMS + email) à Edward quand un client signe
// Pur HTML/texte, aucune dépendance.

export interface AcompteEmailPayload {
  clientNom: string
  numero: string
  totalTTC: number
  acompte: number
  solde: number
  eventDateLabel?: string
  eventLieu?: string
  formatLabel?: string
  viewUrl: string
  iban?: string
  bic?: string
  bankName?: string
}

function escHtml(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function eur(n: number): string {
  var v = Math.round((Number(n) || 0) * 100) / 100
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// ============================================================
// Email d'acompte au client
// ============================================================
export function buildAcompteEmailHtml(p: AcompteEmailPayload): string {
  var hasRib = !!(p.iban && p.iban.trim())
  var ribBlock = hasRib
    ? '<table role="presentation" width="100%" style="border-collapse:collapse;background:#FFF7FB;border:1px solid #F0D7E8;border-radius:10px;margin:6px 0 0">' +
      '<tr><td style="padding:14px 16px;font-size:14px;color:#191923;line-height:1.7">' +
      '<strong>Coordonnées bancaires</strong><br>' +
      (p.bankName ? 'Banque : ' + escHtml(p.bankName) + '<br>' : '') +
      'Bénéficiaire : SAS AEGIA FOOD<br>' +
      'IBAN : <strong>' + escHtml(p.iban) + '</strong>' +
      (p.bic ? '<br>BIC : ' + escHtml(p.bic) : '') +
      '<br>Référence à indiquer : <strong>' + escHtml(p.numero) + '</strong>' +
      '</td></tr></table>'
    : '<p style="font-size:14px;color:#555;margin:6px 0 0">Notre équipe vous transmet sous peu les coordonnées de règlement de l&#39;acompte (référence ' + escHtml(p.numero) + ').</p>'

  var detailRows = ''
  if (p.formatLabel) detailRows += '<tr><td style="padding:4px 0;color:#666;font-size:14px">Prestation</td><td style="padding:4px 0;text-align:right;font-weight:700;font-size:14px">' + escHtml(p.formatLabel) + '</td></tr>'
  if (p.eventDateLabel) detailRows += '<tr><td style="padding:4px 0;color:#666;font-size:14px">Date</td><td style="padding:4px 0;text-align:right;font-weight:700;font-size:14px">' + escHtml(p.eventDateLabel) + '</td></tr>'
  if (p.eventLieu) detailRows += '<tr><td style="padding:4px 0;color:#666;font-size:14px">Lieu</td><td style="padding:4px 0;text-align:right;font-weight:700;font-size:14px">' + escHtml(p.eventLieu) + '</td></tr>'

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;background:#F4F4F6;font-family:Arial,Helvetica,sans-serif;color:#191923">' +
    '<table role="presentation" width="100%" style="border-collapse:collapse;background:#F4F4F6"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" style="max-width:560px;border-collapse:collapse;background:#fff;border:2px solid #191923;border-radius:16px;overflow:hidden">' +
    // Bandeau
    '<tr><td style="background:#FF82D7;padding:22px 24px;text-align:center;color:#fff;font-size:22px;font-weight:900;letter-spacing:1px">MESHUGA EVENTS</td></tr>' +
    // Corps
    '<tr><td style="padding:24px">' +
    '<p style="font-size:16px;margin:0 0 6px">Bonjour ' + escHtml(p.clientNom || '') + ',</p>' +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Merci ! Votre devis <strong>N&deg; ' + escHtml(p.numero) + '</strong> est signé et votre commande est confirmée. Voici le récapitulatif et les modalités de règlement de l&#39;acompte.</p>' +
    (detailRows ? '<table role="presentation" width="100%" style="border-collapse:collapse;border-top:1px solid #EEE;border-bottom:1px solid #EEE;margin:0 0 16px">' + detailRows + '</table>' : '') +
    // Acompte
    '<table role="presentation" width="100%" style="border-collapse:collapse;background:#FFEB5A;border:2px solid #191923;border-radius:12px;margin:0 0 16px">' +
    '<tr><td style="padding:14px 16px">' +
    '<div style="font-size:13px;color:#191923">Acompte à régler (30 % du total TTC)</div>' +
    '<div style="font-size:26px;font-weight:900;margin-top:2px">' + eur(p.acompte) + '</div>' +
    '<div style="font-size:12px;color:#555;margin-top:4px">Total TTC : ' + eur(p.totalTTC) + ' &middot; Solde : ' + eur(p.solde) + '</div>' +
    '</td></tr></table>' +
    ribBlock +
    '<p style="font-size:13px;color:#555;line-height:1.6;margin:16px 0 0">Le solde (' + eur(p.solde) + ') est à régler <strong>au plus tard 5 jours ouvrés avant l&#39;événement</strong>, sauf accord préalable écrit. La commande devient ferme à réception de l&#39;acompte.</p>' +
    // CTA
    '<table role="presentation" width="100%" style="border-collapse:collapse;margin:22px 0 6px"><tr><td align="center">' +
    '<a href="' + escHtml(p.viewUrl) + '" style="display:inline-block;background:#FF82D7;color:#fff;text-decoration:none;font-weight:900;font-size:15px;padding:13px 26px;border-radius:10px;border:2px solid #191923">Voir mon devis signé</a>' +
    '</td></tr></table>' +
    '<p style="font-size:13px;color:#888;line-height:1.6;margin:18px 0 0">Une question ? Écrivez-nous à <a href="mailto:events@meshuga.fr" style="color:#FF82D7">events@meshuga.fr</a>. À très vite !<br>L&#39;équipe Meshuga Events</p>' +
    '</td></tr>' +
    // Footer
    '<tr><td style="padding:14px 24px;background:#FAFAFA;border-top:1px solid #EEE;font-size:11px;color:#aaa;line-height:1.5">SAS AEGIA FOOD (enseigne MESHUGA) &middot; 3 rue Vavin 75006 Paris &middot; events@meshuga.fr<br>TVA FR31904639531 &middot; RCS Paris 904 639 531</td></tr>' +
    '</table></td></tr></table></body></html>'
}

export function buildAcompteEmailText(p: AcompteEmailPayload): string {
  var lines = [
    'Bonjour ' + (p.clientNom || '') + ',',
    '',
    'Votre devis N° ' + p.numero + ' est signé, votre commande est confirmée.',
    '',
    'Acompte à régler (30% du total TTC) : ' + eur(p.acompte),
    'Total TTC : ' + eur(p.totalTTC) + ' — Solde : ' + eur(p.solde),
    ''
  ]
  if (p.iban) {
    lines.push('Coordonnées bancaires :')
    if (p.bankName) lines.push('Banque : ' + p.bankName)
    lines.push('Bénéficiaire : SAS AEGIA FOOD')
    lines.push('IBAN : ' + p.iban)
    if (p.bic) lines.push('BIC : ' + p.bic)
    lines.push('Référence : ' + p.numero)
  } else {
    lines.push('Notre équipe vous transmet sous peu les coordonnées de règlement (référence ' + p.numero + ').')
  }
  lines.push('')
  lines.push('Le solde (' + eur(p.solde) + ') est à régler au plus tard 5 jours ouvrés avant l\u2019événement, sauf accord écrit.')
  lines.push('')
  lines.push('Voir votre devis : ' + p.viewUrl)
  lines.push('')
  lines.push('À très vite — L\u2019équipe Meshuga Events — events@meshuga.fr')
  return lines.join('\n')
}

// ============================================================
// Notification à Edward (signature reçue)
// ============================================================
export function buildSignerNotifSms(params: { signerName: string; numero: string; totalTTC: number }): string {
  var name = (params.signerName || 'Un client').trim()
  return 'Meshuga Events : ' + name + ' vient de signer le devis ' + (params.numero || '') +
    ' (' + eur(params.totalTTC) + ' TTC). Commande confirmee.'
}

export function buildSignerNotifEmailHtml(params: {
  signerName: string
  signerPhone: string
  numero: string
  totalTTC: number
  acompte: number
  clientNom: string
  managerUrl?: string
}): string {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
    '<body style="font-family:Arial,sans-serif;color:#191923;background:#F4F4F6;padding:20px">' +
    '<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;border-collapse:collapse;background:#fff;border:2px solid #191923;border-radius:14px;overflow:hidden">' +
    '<tr><td style="background:#FF82D7;padding:16px 20px;color:#fff;font-size:18px;font-weight:900">✍️ Devis signé</td></tr>' +
    '<tr><td style="padding:20px;font-size:15px;line-height:1.7">' +
    '<strong>' + escHtml(params.signerName) + '</strong> vient de signer le devis <strong>' + escHtml(params.numero) + '</strong>.' +
    '<table role="presentation" width="100%" style="border-collapse:collapse;margin:14px 0;border-top:1px solid #EEE">' +
    '<tr><td style="padding:5px 0;color:#666">Client</td><td style="padding:5px 0;text-align:right;font-weight:700">' + escHtml(params.clientNom || '—') + '</td></tr>' +
    '<tr><td style="padding:5px 0;color:#666">Signataire</td><td style="padding:5px 0;text-align:right;font-weight:700">' + escHtml(params.signerName) + '</td></tr>' +
    '<tr><td style="padding:5px 0;color:#666">Téléphone vérifié</td><td style="padding:5px 0;text-align:right;font-weight:700">' + escHtml(params.signerPhone || '—') + '</td></tr>' +
    '<tr><td style="padding:5px 0;color:#666">Total TTC</td><td style="padding:5px 0;text-align:right;font-weight:700">' + eur(params.totalTTC) + '</td></tr>' +
    '<tr><td style="padding:5px 0;color:#666">Acompte (30 %)</td><td style="padding:5px 0;text-align:right;font-weight:700">' + eur(params.acompte) + '</td></tr>' +
    '</table>' +
    (params.managerUrl ? '<a href="' + escHtml(params.managerUrl) + '" style="display:inline-block;background:#191923;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 18px;border-radius:8px">Ouvrir dans le manager</a>' : '') +
    '</td></tr></table></body></html>'
}
