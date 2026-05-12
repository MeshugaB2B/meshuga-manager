import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  )
}

function parseCSVLine(line: string, separator: string): string[] {
  var result: string[] = []
  var current = ''
  var inQuotes = false
  for (var i = 0; i < line.length; i++) {
    var c = line[i]
    if (c === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (c === separator && !inQuotes) {
      result.push(current); current = ''
    } else { current += c }
  }
  result.push(current)
  return result
}

function parseMoney(s: any): number | null {
  if (s === null || s === undefined || s === '') return null
  var str = String(s).replace(/€/g, '').replace(/\s/g, '').replace(/\xa0/g, '').replace(',', '.').trim()
  if (!str) return null
  var n = parseFloat(str)
  return isNaN(n) ? null : n
}

function parsePct(s: any): number | null {
  if (s === null || s === undefined || s === '') return null
  var str = String(s).replace('%', '').replace(',', '.').trim()
  if (!str) return null
  var n = parseFloat(str)
  return isNaN(n) ? null : n / 100.0
}

function parseIntSafe(s: any): number | null {
  if (s === null || s === undefined || s === '') return null
  var n = parseInt(String(s).trim(), 10)
  return isNaN(n) ? null : n
}

function durationToSec(s: any): number | null {
  if (!s) return null
  var str = String(s).trim()
  if (/^\d+$/.test(str)) return parseInt(str, 10) * 60
  var match = str.match(/(\d+)min\s*(\d+)?s?/)
  if (match) return parseInt(match[1]) * 60 + (match[2] ? parseInt(match[2]) : 0)
  return parseIntSafe(str)
}

function getCol(headers: string[], names: string[]): number {
  var lower = headers.map(function(h){ return h.toLowerCase().trim() })
  for (var i = 0; i < names.length; i++) {
    var idx = lower.indexOf(names[i].toLowerCase())
    if (idx > -1) return idx
  }
  return -1
}

function extractMode(modeBrut: string): string {
  if (!modeBrut) return 'Inconnu'
  if (modeBrut.indexOf('Sur place') === 0) return 'Sur place'
  if (modeBrut.indexOf('À emporter') === 0 || modeBrut.indexOf('A emporter') === 0) return 'À emporter'
  if (modeBrut.indexOf('Livraison') === 0) return 'Livraison'
  return modeBrut
}

function extractSource(modeBrut: string): string {
  if (!modeBrut) return 'Inconnu'
  if (modeBrut.indexOf('Borne') > -1) return 'Borne'
  if (modeBrut.indexOf('Deliveroo') > -1) return 'Deliveroo'
  if (modeBrut.indexOf('Uber') > -1) return 'Uber Eats'
  if (modeBrut.indexOf(' - ') < 0) return 'Caisse'
  return 'Inconnu'
}

function extractYearFromFilename(filename: string): number | null {
  var match = filename.match(/(\d{4})-\d{2}-\d{2}/)
  if (match) return parseInt(match[1])
  var match2 = filename.match(/20(\d{2})/)
  if (match2) return 2000 + parseInt(match2[1])
  return null
}

// ============== TICKETS ==============
async function importTickets(supabase: any, headers: string[], lines: string[], separator: string, filename: string) {
  var col = {
    no: getCol(headers, ['N°']),
    date: getCol(headers, ['Date']),
    heure: getCol(headers, ['Heure']),
    duree: getCol(headers, ['Durée']),
    serveur: getCol(headers, ['Serveur', 'Utilisateur']),
    mode: getCol(headers, ['Mode']),
    client: getCol(headers, ['Client']),
    tbl: getCol(headers, ['Tbl', 'Table']),
    couv: getCol(headers, ['Couv.', 'Couverts']),
    remise: getCol(headers, ['Remise', 'Montant remisé']),
    pct: getCol(headers, ['% CA']),
    ht: getCol(headers, ['HT']),
    ttc: getCol(headers, ['TTC']),
    statut: getCol(headers, ['Statut']),
    cp: getCol(headers, ['Code postal']),
    ville: getCol(headers, ['Ville']),
    note: getCol(headers, ['Note', 'Commentaire'])
  }
  if (col.no < 0 || col.date < 0 || col.ttc < 0) throw new Error('Colonnes obligatoires manquantes')
  
  var rows: any[] = []
  var skipped = 0
  var firstDate: string | null = null
  var lastDate: string | null = null
  
  for (var i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    var r = parseCSVLine(lines[i], separator)
    var dateISO = (r[col.date] || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) { skipped++; continue }
    if (!firstDate || dateISO < firstDate) firstDate = dateISO
    if (!lastDate || dateISO > lastDate) lastDate = dateISO
    var ttc = parseMoney(r[col.ttc])
    var ht = col.ht >= 0 ? parseMoney(r[col.ht]) : null
    if (ttc === null) { skipped++; continue }
    var modeBrut = col.mode >= 0 ? (r[col.mode] || '') : ''
    rows.push({
      ticket_no: parseIntSafe(r[col.no]),
      date_vente: dateISO,
      heure_vente: col.heure >= 0 ? (r[col.heure] || null) : null,
      statut: col.statut >= 0 ? (r[col.statut] || 'Fermée') : 'Fermée',
      mode_brut: modeBrut || null,
      mode: extractMode(modeBrut),
      source: extractSource(modeBrut),
      nb_couverts: col.couv >= 0 ? (parseIntSafe(r[col.couv]) || 0) : 0,
      table_num: col.tbl >= 0 ? (r[col.tbl] || null) : null,
      utilisateur: col.serveur >= 0 ? (r[col.serveur] || null) : null,
      client: col.client >= 0 ? (r[col.client] || null) : null,
      montant_remise: col.remise >= 0 ? (parseMoney(r[col.remise]) || 0) : 0,
      pct_ca: col.pct >= 0 ? parsePct(r[col.pct]) : null,
      ttc: ttc,
      ht: ht !== null ? ht : Math.round(ttc / 1.1 * 100) / 100,
      duree_sec: col.duree >= 0 ? durationToSec(r[col.duree]) : null,
      code_postal: col.cp >= 0 ? (r[col.cp] || null) : null,
      ville: col.ville >= 0 ? (r[col.ville] || null) : null,
      commentaire: col.note >= 0 ? (r[col.note] || null) : null
    })
  }
  
  var inserted = 0
  var batchSize = 500
  for (var bi = 0; bi < rows.length; bi += batchSize) {
    var batch = rows.slice(bi, bi + batchSize)
    var ins = await supabase.from('sales_tickets').upsert(batch, { onConflict: 'ticket_no,date_vente' })
    if (ins.error) throw new Error('Insertion batch tickets: ' + ins.error.message)
    inserted += batch.length
  }
  
  return { inserted: inserted, skipped: skipped, firstDate: firstDate, lastDate: lastDate, unknown_products: [] }
}

// ============== VUE D'ENSEMBLE ==============
async function importOverview(supabase: any, allLines: string[], separator: string, filename: string) {
  var year = extractYearFromFilename(filename)
  var sections: { [key: string]: any[] } = {}
  var currentSection: string | null = null
  
  for (var i = 0; i < allLines.length; i++) {
    var line = allLines[i].trim()
    if (!line) continue
    var parts = parseCSVLine(line, separator).map(function(p){ return p.trim() })
    var nonEmpty = parts.filter(function(p){ return p })
    if (nonEmpty.length === 1) {
      currentSection = nonEmpty[0]
      sections[currentSection] = []
    } else if (currentSection) {
      sections[currentSection].push(parts)
    }
  }
  
  var caTtc: number | null = null, caHt: number | null = null
  var tva10Ht: number | null = null, tva10Ttc: number | null = null
  var tva20Ht: number | null = null, tva20Ttc: number | null = null
  var nbCommandes = 0, panierMoyen: number | null = null, nbArticles = 0
  var nbCouverts = 0, couvertMoyen: number | null = null, tempsMoyenSec: number | null = null
  var ticketsOffertsNb = 0, ticketsOffertsMontant = 0
  var remisesNb = 0, remisesMontant = 0
  var ticketsAnnulesNb = 0, ticketsAnnulesMontant = 0
  var modesBreakdown: any = {}, paymentsBreakdown: any = {}, remisesBreakdown: any = {}
  var periodStart: string | null = null, periodEnd: string | null = null
  
  if (sections['CA']) {
    sections['CA'].forEach(function(row: any){
      if (row[0].indexOf('TTC') > -1) caTtc = parseMoney(row[1])
      if (row[0].indexOf('HT') > -1) caHt = parseMoney(row[1])
    })
  }
  if (sections['TVA']) {
    sections['TVA'].forEach(function(row: any){
      if (row[0] === '10') { tva10Ht = parseMoney(row[2]); tva10Ttc = parseMoney(row[3]) }
      if (row[0] === '20') { tva20Ht = parseMoney(row[2]); tva20Ttc = parseMoney(row[3]) }
    })
  }
  if (sections['CA par mode']) {
    sections['CA par mode'].forEach(function(row: any){
      var key = row[0].toLowerCase().replace(/à/g, 'a').replace(/é/g, 'e').replace(/è/g, 'e').replace(/\s/g, '_')
      modesBreakdown[key] = { nb: parseIntSafe(row[1]), ttc: parseMoney(row[2]) }
    })
  }
  if (sections['Statistiques']) {
    sections['Statistiques'].forEach(function(row: any){
      var label = row[0].toLowerCase()
      var val = row[1] || ''
      if (label.indexOf('date des commandes') > -1) {
        var dateMatch = val.match(/(\d+)\/(\d+)\/(\d+).*-(\d+)\/(\d+)\/(\d+)/)
        if (dateMatch) {
          var y1 = parseInt(dateMatch[3]); if (y1 < 100) y1 += 2000
          var y2 = parseInt(dateMatch[6]); if (y2 < 100) y2 += 2000
          periodStart = y1 + '-' + String(dateMatch[2]).padStart(2,'0') + '-' + String(dateMatch[1]).padStart(2,'0')
          periodEnd = y2 + '-' + String(dateMatch[5]).padStart(2,'0') + '-' + String(dateMatch[4]).padStart(2,'0')
          if (!year) year = y1
        }
      }
      if (label.indexOf('nombre de commandes') > -1) nbCommandes = parseIntSafe(val) || 0
      if (label.indexOf('commande moyenne') > -1) panierMoyen = parseMoney(val)
      if (label.indexOf("nombre d'articles") > -1) nbArticles = parseIntSafe(val) || 0
      if (label.indexOf('nombre de couverts') > -1) nbCouverts = parseIntSafe(val) || 0
      if (label.indexOf('couvert moyen') > -1) couvertMoyen = parseMoney(val)
      if (label.indexOf('temps moyen') > -1) {
        var tm = val.match(/(\d+)min\s*(\d+)?s?/)
        if (tm) tempsMoyenSec = parseInt(tm[1]) * 60 + (tm[2] ? parseInt(tm[2]) : 0)
      }
      if (label.indexOf('tickets offerts') > -1) {
        var to = val.match(/(\d+)\s*\(([^)]+)\)/)
        if (to) { ticketsOffertsNb = parseInt(to[1]); ticketsOffertsMontant = parseMoney(to[2]) || 0 }
      }
      if (label.indexOf('remises/offerts') > -1) {
        var rm = val.match(/(\d+)\s*\(([^)]+)\)/)
        if (rm) { remisesNb = parseInt(rm[1]); remisesMontant = parseMoney(rm[2]) || 0 }
      }
      if (label.indexOf('tickets annul') > -1) {
        var ta = val.match(/(\d+)\s*\(([^)]+)\)/)
        if (ta) { ticketsAnnulesNb = parseInt(ta[1]); ticketsAnnulesMontant = parseMoney(ta[2]) || 0 }
      }
    })
  }
  if (sections['Règlements']) {
    sections['Règlements'].forEach(function(row: any){
      var key = row[0].toLowerCase().replace(/é/g, 'e').replace(/è/g, 'e').replace(/à/g, 'a').replace(/\s/g, '_')
      if (paymentsBreakdown[key]) {
        paymentsBreakdown[key].nb += parseIntSafe(row[1]) || 0
        paymentsBreakdown[key].ttc += parseMoney(row[2]) || 0
      } else {
        paymentsBreakdown[key] = { nb: parseIntSafe(row[1]), ttc: parseMoney(row[2]) }
      }
    })
  }
  if (sections['Remises']) {
    sections['Remises'].forEach(function(row: any){
      remisesBreakdown[row[0]] = { nb: parseIntSafe(row[1]), ttc: parseMoney(row[2]) }
    })
  }
  
  if (!year) throw new Error('Année introuvable')
  
  var ins = await supabase.from('sales_overview').upsert({
    year: year,
    period_start: periodStart, period_end: periodEnd,
    ca_ttc: caTtc, ca_ht: caHt,
    tva_10_ht: tva10Ht, tva_10_ttc: tva10Ttc,
    tva_20_ht: tva20Ht, tva_20_ttc: tva20Ttc,
    nb_commandes: nbCommandes,
    panier_moyen_ttc: panierMoyen,
    nb_articles: nbArticles,
    nb_couverts: nbCouverts,
    couvert_moyen_ttc: couvertMoyen,
    temps_moyen_sec: tempsMoyenSec,
    tickets_offerts_nb: ticketsOffertsNb,
    tickets_offerts_montant: ticketsOffertsMontant,
    remises_nb: remisesNb,
    remises_montant: remisesMontant,
    tickets_annules_nb: ticketsAnnulesNb,
    tickets_annules_montant: ticketsAnnulesMontant,
    modes_breakdown: modesBreakdown,
    payments_breakdown: paymentsBreakdown,
    remises_breakdown: remisesBreakdown
  }, { onConflict: 'year' })
  if (ins.error) throw new Error('Insertion overview: ' + ins.error.message)
  
  return { inserted: 1, skipped: 0, firstDate: periodStart, lastDate: periodEnd, unknown_products: [] }
}

// ============== PRODUITS / MENUS ==============
async function importProductsOrMenus(supabase: any, headers: string[], lines: string[], separator: string, filename: string, productType: 'produit' | 'menu') {
  var col = {
    nom: getCol(headers, ['Nom']),
    qte: getCol(headers, ['Qte', 'Qté']),
    prix: getCol(headers, ['Prix moyen']),
    pct: getCol(headers, ['% du CA', '% CA']),
    tva: getCol(headers, ['Montant TVA']),
    ht: getCol(headers, ['Total HT']),
    ttc: getCol(headers, ['Total TTC']),
    cout: getCol(headers, ['Coût', 'Cout']),
    marge: getCol(headers, ['Marge brute'])
  }
  if (col.nom < 0 || col.qte < 0 || col.ttc < 0) throw new Error('Colonnes obligatoires manquantes')
  var year = extractYearFromFilename(filename)
  if (!year) throw new Error('Année introuvable')
  
  var mapRes = await supabase.from('sales_product_mapping').select('zelty_product_name, recipe_id')
  var existingMap: any = {}
  if (mapRes.data) mapRes.data.forEach(function(m: any){ existingMap[m.zelty_product_name] = m.recipe_id })
  
  var rows: any[] = []
  var unknownProducts: string[] = []
  var periodStart = year + '-01-01', periodEnd = year + '-12-31'
  
  for (var i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    var r = parseCSVLine(lines[i], separator)
    var nom = (r[col.nom] || '').trim()
    if (!nom) continue
    var qte = parseIntSafe(r[col.qte]) || 0
    if (qte === 0) continue
    rows.push({
      year: year,
      period_start: periodStart, period_end: periodEnd,
      zelty_product_name: nom,
      product_type: productType,
      qte: qte,
      prix_moyen: parseMoney(r[col.prix]),
      pct_ca: col.pct >= 0 ? parsePct(r[col.pct]) : null,
      ca_ht: parseMoney(r[col.ht]),
      ca_ttc: parseMoney(r[col.ttc]),
      cout_total: col.cout >= 0 ? parseMoney(r[col.cout]) : null,
      marge_brute: col.marge >= 0 ? parseMoney(r[col.marge]) : null,
      recipe_id: existingMap[nom] || null
    })
    if (productType === 'produit' && !(nom in existingMap) && unknownProducts.indexOf(nom) === -1) {
      unknownProducts.push(nom)
    }
  }
  
  var inserted = 0
  if (rows.length > 0) {
    var ins = await supabase.from('sales_products_period').upsert(rows, { onConflict: 'year,zelty_product_name,product_type' })
    if (ins.error) throw new Error('Insertion ' + productType + ': ' + ins.error.message)
    inserted = rows.length
  }
  
  return { inserted: inserted, skipped: 0, firstDate: periodStart, lastDate: periodEnd, unknown_products: unknownProducts }
}

// ============== VENTES CUMULÉES ==============
async function importVentesCumulees(supabase: any, headers: string[], lines: string[], separator: string, filename: string) {
  var col = {
    nom: getCol(headers, ['Nom']),
    carte: getCol(headers, ['À la carte', 'A la carte', 'Carte']),
    menu: getCol(headers, ['Menu']),
    total: getCol(headers, ['Total'])
  }
  if (col.nom < 0 || col.total < 0) throw new Error('Colonnes obligatoires manquantes')
  var year = extractYearFromFilename(filename)
  if (!year) throw new Error('Année introuvable')
  
  var mapRes = await supabase.from('sales_product_mapping').select('zelty_product_name, recipe_id')
  var existingMap: any = {}
  if (mapRes.data) mapRes.data.forEach(function(m: any){ existingMap[m.zelty_product_name] = m.recipe_id })
  
  var unknownProducts: string[] = []
  var inserted = 0
  
  for (var i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    var r = parseCSVLine(lines[i], separator)
    var nom = (r[col.nom] || '').trim()
    if (!nom) continue
    var qteCarte = col.carte >= 0 ? (parseIntSafe(r[col.carte]) || 0) : 0
    var qteMenu = col.menu >= 0 ? (parseIntSafe(r[col.menu]) || 0) : 0
    var qteTotal = parseIntSafe(r[col.total]) || (qteCarte + qteMenu)
    if (qteTotal === 0) continue
    
    // Update si existant, insert sinon
    var upd = await supabase.from('sales_products_period').update({
      qte_carte: qteCarte, qte_menu: qteMenu, qte_total: qteTotal
    }).eq('year', year).eq('zelty_product_name', nom).eq('product_type', 'produit').select()
    
    if (!upd.data || upd.data.length === 0) {
      await supabase.from('sales_products_period').upsert({
        year: year,
        period_start: year + '-01-01', period_end: year + '-12-31',
        zelty_product_name: nom,
        product_type: 'produit',
        qte: qteTotal,
        qte_carte: qteCarte, qte_menu: qteMenu, qte_total: qteTotal,
        recipe_id: existingMap[nom] || null
      }, { onConflict: 'year,zelty_product_name,product_type' })
    }
    inserted++
    if (!(nom in existingMap) && unknownProducts.indexOf(nom) === -1) unknownProducts.push(nom)
  }
  
  return { inserted: inserted, skipped: 0, firstDate: year + '-01-01', lastDate: year + '-12-31', unknown_products: unknownProducts }
}

export async function POST(request: Request) {
  try {
    var body = await request.json()
    var supabase = sb()
    var filename = body.filename || 'unknown.csv'
    var fileType = body.fileType
    var separator = body.separator || ','
    var headers = body.headers || []
    var lines = body.lines || []
    var rawLines = body.rawLines || []
    
    if (!fileType) return NextResponse.json({ error: 'fileType manquant' }, { status: 400 })
    
    var result: any
    var startTime = Date.now()
    
    if (fileType === 'tickets') result = await importTickets(supabase, headers, lines, separator, filename)
    else if (fileType === 'overview') result = await importOverview(supabase, rawLines, separator, filename)
    else if (fileType === 'produits') result = await importProductsOrMenus(supabase, headers, lines, separator, filename, 'produit')
    else if (fileType === 'menus') result = await importProductsOrMenus(supabase, headers, lines, separator, filename, 'menu')
    else if (fileType === 'ventes_cumulees') result = await importVentesCumulees(supabase, headers, lines, separator, filename)
    else return NextResponse.json({ error: 'Type non supporté: ' + fileType }, { status: 400 })
    
    await supabase.from('sales_imports_log').insert({
      filename: filename,
      file_type: fileType,
      period_start: result.firstDate || null,
      period_end: result.lastDate || null,
      nb_lines_imported: result.inserted,
      status: 'success'
    })
    
    return NextResponse.json({
      ok: true, filename: filename, file_type: fileType,
      nb_inserted: result.inserted, nb_skipped: result.skipped,
      duration_ms: Date.now() - startTime,
      first_date: result.firstDate, last_date: result.lastDate,
      unknown_products: result.unknown_products || []
    })
  } catch (e: any) {
    console.error('Zelty import error:', e)
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
