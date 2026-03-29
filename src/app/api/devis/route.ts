import { NextResponse } from 'next/server'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export async function POST(request) {
  const data = await request.json()

  const tmpDir = tmpdir()
  const dataFile = join(tmpDir, 'devis_' + Date.now() + '.json')
  const pdfFile = join(tmpDir, 'devis_' + Date.now() + '.pdf')

  writeFileSync(dataFile, JSON.stringify(data))

  const script = `
import json, sys
sys.path.insert(0, '/usr/lib/python3/dist-packages')

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors
except ImportError:
    import subprocess
    subprocess.run([sys.executable, '-m', 'pip', 'install', 'reportlab', '--break-system-packages', '-q'])
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.pdfgen import canvas
    from reportlab.lib import colors

with open('${dataFile}') as f:
    d = json.load(f)

w, h = A4
cv = canvas.Canvas('${pdfFile}', pagesize=A4)

YELLOW = colors.HexColor('#FFEB5A')
PINK = colors.HexColor('#FF82D7')
BLACK = colors.HexColor('#191923')
WHITE = colors.white
GRAY = colors.HexColor('#F8F8F8')
LIGHTGRAY = colors.HexColor('#DEDEDE')
DARKGRAY = colors.HexColor('#666666')

# Header noir
cv.setFillColor(BLACK)
cv.rect(0, h-90, w, 90, fill=1, stroke=0)
cv.setFillColor(YELLOW)
cv.rect(0, h-90, 6, 90, fill=1, stroke=0)

cv.setFillColor(YELLOW)
cv.setFont('Helvetica-Bold', 26)
cv.drawString(1.5*cm, h-48, 'MESHUGA')
cv.setFont('Helvetica', 9)
cv.setFillColor(colors.HexColor('#AAAAAA'))
cv.drawString(1.5*cm, h-62, 'CRAZY DELI')
cv.drawString(1.5*cm, h-75, '3 rue Vavin, 75006 Paris')

cv.setFillColor(WHITE)
cv.setFont('Helvetica-Bold', 24)
cv.drawRightString(w-1.5*cm, h-44, 'DEVIS')
cv.setFont('Helvetica', 9)
cv.setFillColor(colors.HexColor('#AAAAAA'))
cv.drawRightString(w-1.5*cm, h-58, 'No ' + str(d.get('numero', '')))
cv.drawRightString(w-1.5*cm, h-72, 'Date : ' + str(d.get('date', '')))

# Client box
y = h - 110
cv.setFillColor(GRAY)
cv.roundRect(1.5*cm, y-65, 8.5*cm, 70, 4, fill=1, stroke=0)
cv.setStrokeColor(LIGHTGRAY)
cv.roundRect(1.5*cm, y-65, 8.5*cm, 70, 4, fill=0, stroke=1)
cv.setFillColor(PINK)
cv.roundRect(1.5*cm, y-65, 8.5*cm, 14, 4, fill=1, stroke=0)
cv.rect(1.5*cm, y-58, 8.5*cm, 7, fill=1, stroke=0)
cv.setFillColor(BLACK)
cv.setFont('Helvetica-Bold', 7)
cv.drawString(1.8*cm, y-57, 'CLIENT')
cv.setFont('Helvetica-Bold', 12)
cv.drawString(1.8*cm, y-72, str(d.get('client_nom', '')))
cv.setFont('Helvetica', 9)
cv.setFillColor(DARKGRAY)
cv.drawString(1.8*cm, y-84, str(d.get('client_contact', '')))
cv.drawString(1.8*cm, y-96, str(d.get('client_email', '')))

# Event box
cv.setFillColor(GRAY)
cv.roundRect(11*cm, y-65, 8.5*cm, 70, 4, fill=1, stroke=0)
cv.setStrokeColor(LIGHTGRAY)
cv.roundRect(11*cm, y-65, 8.5*cm, 70, 4, fill=0, stroke=1)
cv.setFillColor(BLACK)
cv.roundRect(11*cm, y-65, 8.5*cm, 14, 4, fill=1, stroke=0)
cv.rect(11*cm, y-58, 8.5*cm, 7, fill=1, stroke=0)
cv.setFillColor(WHITE)
cv.setFont('Helvetica-Bold', 7)
cv.drawString(11.3*cm, y-57, 'EVENEMENT')
cv.setFillColor(DARKGRAY)
cv.setFont('Helvetica', 9)
cv.drawString(11.3*cm, y-72, 'Date : ' + str(d.get('event_date', '')))
cv.drawString(11.3*cm, y-84, 'Lieu : ' + str(d.get('event_lieu', '')))
cv.drawString(11.3*cm, y-96, str(d.get('nb_personnes', 0)) + ' pers. - ' + str(d.get('format', '')))

# Table
y2 = y - 90
cv.setFillColor(BLACK)
cv.rect(1.5*cm, y2-16, w-3*cm, 18, fill=1, stroke=0)
cv.setFillColor(WHITE)
cv.setFont('Helvetica-Bold', 8)
cv.drawString(1.8*cm, y2-11, 'DESIGNATION')
cv.drawRightString(10.5*cm, y2-11, 'QTE')
cv.drawRightString(14*cm, y2-11, 'PU HT')
cv.drawRightString(w-1.8*cm, y2-11, 'TOTAL HT')

y3 = y2 - 18
items = d.get('items', [])
for i, item in enumerate(items):
    bg = colors.HexColor('#F8F8F8') if i % 2 == 0 else WHITE
    cv.setFillColor(bg)
    cv.rect(1.5*cm, y3-14, w-3*cm, 16, fill=1, stroke=0)
    cv.setFillColor(BLACK)
    cv.setFont('Helvetica', 8)
    cv.drawString(1.8*cm, y3-9, str(item.get('nom', '')))
    cv.drawRightString(10.5*cm, y3-9, str(item.get('qte', '')))
    cv.drawRightString(14*cm, y3-9, '{:.2f} EUR'.format(item.get('pu_ht', 0)))
    cv.setFont('Helvetica-Bold', 8)
    cv.drawRightString(w-1.8*cm, y3-9, '{:.2f} EUR'.format(item.get('total_ht', 0)))
    y3 -= 16

# Ligne separatrice
cv.setStrokeColor(LIGHTGRAY)
cv.line(1.5*cm, y3-3, w-1.5*cm, y3-3)
y3 -= 16

# Mise en place
mep = d.get('mise_en_place', 0)
if mep > 0:
    cv.setFillColor(GRAY)
    cv.rect(1.5*cm, y3-14, w-3*cm, 16, fill=1, stroke=0)
    cv.setFillColor(DARKGRAY)
    cv.setFont('Helvetica', 8)
    cv.drawString(1.8*cm, y3-9, 'Frais de mise en place / Show cooking')
    cv.drawRightString(w-1.8*cm, y3-9, '{:.2f} EUR'.format(mep))
    y3 -= 16

# Remise
remise_pct = d.get('remise_pct', 0)
remise_montant = d.get('remise_montant', 0)
if remise_montant > 0:
    cv.setFillColor(colors.HexColor('#FFF0F5'))
    cv.rect(1.5*cm, y3-14, w-3*cm, 16, fill=1, stroke=0)
    cv.setFillColor(colors.HexColor('#CC0066'))
    cv.setFont('Helvetica-Bold', 8)
    label = 'Remise commerciale ({:.0f}%)'.format(remise_pct) if remise_pct > 0 else 'Remise commerciale'
    cv.drawString(1.8*cm, y3-9, label)
    cv.drawRightString(w-1.8*cm, y3-9, '-{:.2f} EUR'.format(remise_montant))
    y3 -= 16

# Totaux
y3 -= 10
box_y = y3 - 65
cv.setFillColor(GRAY)
cv.roundRect(11.5*cm, box_y, 7.5*cm, 70, 4, fill=1, stroke=0)

total_ht = d.get('total_ht', 0)
tva = d.get('tva', 0)
total_ttc = d.get('total_ttc', 0)

cv.setFillColor(DARKGRAY)
cv.setFont('Helvetica', 9)
cv.drawString(11.8*cm, box_y+54, 'Total HT')
cv.drawRightString(w-1.8*cm, box_y+54, '{:.2f} EUR'.format(total_ht))
cv.drawString(11.8*cm, box_y+39, 'TVA 5,5%')
cv.drawRightString(w-1.8*cm, box_y+39, '{:.2f} EUR'.format(tva))

cv.setStrokeColor(LIGHTGRAY)
cv.line(11.8*cm, box_y+33, w-1.8*cm, box_y+33)

cv.setFillColor(BLACK)
cv.roundRect(11.5*cm, box_y, 7.5*cm, 30, 4, fill=1, stroke=0)
cv.setFillColor(YELLOW)
cv.setFont('Helvetica-Bold', 12)
cv.drawString(11.8*cm, box_y+11, 'TOTAL TTC')
cv.drawRightString(w-1.8*cm, box_y+11, '{:.2f} EUR'.format(total_ttc))

# Notes
notes = d.get('notes', '')
if notes:
    y_notes = box_y - 25
    cv.setFillColor(GRAY)
    cv.roundRect(1.5*cm, y_notes-35, w-3*cm, 40, 4, fill=1, stroke=0)
    cv.setFillColor(BLACK)
    cv.setFont('Helvetica-Bold', 7)
    cv.drawString(1.8*cm, y_notes-10, 'NOTES ET CONDITIONS')
    cv.setFont('Helvetica', 7)
    cv.setFillColor(DARKGRAY)
    cv.drawString(1.8*cm, y_notes-22, notes[:120])
    if len(notes) > 120:
        cv.drawString(1.8*cm, y_notes-32, notes[120:240])

# Footer
cv.setFillColor(BLACK)
cv.rect(0, 0, w, 22, fill=1, stroke=0)
cv.setFillColor(colors.HexColor('#888888'))
cv.setFont('Helvetica', 6.5)
cv.drawCentredString(w/2, 7, 'Meshuga Crazy Deli | 3 rue Vavin, 75006 Paris | edward@meshuga.fr | Devis valable 30 jours')

cv.save()
print('PDF_OK')
`

  try {
    const result = execSync(`python3 -c "${script.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
      timeout: 30000,
      encoding: 'utf8',
      shell: '/bin/bash'
    })

    const pdfBuffer = readFileSync(pdfFile)
    try { unlinkSync(dataFile) } catch(e) {}
    try { unlinkSync(pdfFile) } catch(e) {}

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="devis-meshuga-${data.numero || 'XXX'}.pdf"`
      }
    })
  } catch(e) {
    try { unlinkSync(dataFile) } catch(err) {}
    try { unlinkSync(pdfFile) } catch(err) {}
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
