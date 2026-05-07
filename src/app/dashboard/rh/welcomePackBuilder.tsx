// ============================================================
// welcomePackBuilder.tsx
// ============================================================
// Génère le HTML complet (4 pages A4) du Dossier de bienvenue Meshuga.
// Reproduction fidèle du PDF Python livré côté Storage.
//
// Pages :
//   1. Couverture (logo, titre Yellowtail, ronds décoratifs)
//   2. Fiche salarié pré-remplie + infos professionnelles + HACCP
//   3. Règles d'hygiène (article L4122-1)
//   4. Engagement de lecture (article L1331-1) + signature "Lu et approuvé"
//
// Charte Meshuga (NON-NÉGOCIABLE) :
//   Rose #FF82D7 / Jaune #FFEB5A / Noir #191923
//   Fonts : Yellowtail (titres) + Barlow Condensed (uppercase) + Barlow (body)
//   Pas de fond sombre dans les zones de saisie
//
// Le HTML retourné est autonome (DOCTYPE + style + body), prêt à injecter
// dans une iframe via document.write(). window.print() = export PDF.
// ============================================================

export function buildWelcomePack(emp, contract, logoUri) {
  emp = emp || {}
  contract = contract || {}

  // ===== Helpers internes =====
  function esc(s) {
    if (s === null || s === undefined) return ""
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }
  function fmtDate(d) {
    if (!d) return ""
    var dt = new Date(d)
    if (isNaN(dt.getTime())) return d
    var dd = String(dt.getDate())
    if (dd.length < 2) dd = "0" + dd
    var mm = String(dt.getMonth() + 1)
    if (mm.length < 2) mm = "0" + mm
    return dd + "/" + mm + "/" + dt.getFullYear()
  }
  function todayFr() {
    var d = new Date()
    var months = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear()
  }
  function checked(cond) {
    return cond ? "checked" : "unchecked"
  }
  function capit(s) {
    if (!s) return ""
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  // ===== Données dérivées =====
  var nomComplet = (emp.prenom || "") + " " + (emp.nom || "").toUpperCase()
  nomComplet = nomComplet.trim() || "—"

  var addressLine = (emp.adresse || "") + (emp.adresse && (emp.code_postal || emp.ville) ? " — " : "")
    + (emp.code_postal || "") + " " + (emp.ville || "")
  addressLine = addressLine.trim() || "—"

  // Type de contrat
  var typeLabels = {
    "extra": "CDD d'usage (Extra)",
    "cdi_cadre": "CDI Cadre",
    "cdi_cuisinier": "CDI Cuisinier(ère)",
    "cdi_caissier": "CDI Caissier(ère)"
  }
  var typeLabel = typeLabels[contract.type] || "—"

  // Date d'embauche / début
  var dateEmbauche = contract.date_embauche || contract.date_debut || ""
  var dateEmbaucheFmt = fmtDate(dateEmbauche)

  // Salaire
  var salaireLine = ""
  if (contract.type && contract.type !== "extra") {
    if (contract.salaire_brut_mensuel) salaireLine = contract.salaire_brut_mensuel + " € brut / mois"
  } else if (contract.taux_horaire_brut) {
    salaireLine = contract.taux_horaire_brut + " € brut / heure"
  }

  // Niveau CCN combiné
  var niveauCcn = ""
  if (contract.niveau_ccn) {
    niveauCcn = "Niveau " + contract.niveau_ccn
    if (contract.echelon_ccn) niveauCcn += " — Échelon " + contract.echelon_ccn
  }

  // Heures hebdo (CDI)
  var heuresLine = ""
  if (contract.type && contract.type !== "extra" && contract.heures_hebdo) {
    heuresLine = contract.heures_hebdo + " h / semaine"
  }

  // Situation familiale
  var ms = (emp.marital_status || "").toLowerCase()
  var msCheck = {
    celibataire: ms === "celibataire",
    marie: ms === "marie" || ms === "marié" || ms === "mariée",
    pacs: ms === "pacs" || ms === "pacsé" || ms === "pacsée",
    divorce: ms === "divorce" || ms === "divorcé" || ms === "divorcée",
    veuf: ms === "veuf" || ms === "veuve"
  }

  // HACCP
  var haccpDoneText = ""
  var haccpTodoText = ""
  if (emp.haccp_done) {
    haccpDoneText = emp.haccp_date
      ? "Formation HACCP suivie le " + fmtDate(emp.haccp_date)
      : "Formation HACCP suivie"
  } else {
    haccpTodoText = "Formation HACCP à planifier auprès de CNFSE"
  }

  // Logo
  var logoTag = ""
  if (logoUri) {
    logoTag = '<img src="' + esc(logoUri) + '" alt="Meshuga" style="max-width: 220px; max-height: 90px; object-fit: contain;" />'
  } else {
    logoTag = '<div style="font-family: Yellowtail, cursive; font-size: 56px; color: #FF82D7;">Meshuga</div>'
  }

  // ===== STYLES =====
  var styles =
    "@import url('https://fonts.googleapis.com/css2?family=Yellowtail&family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600;700&display=swap');" +
    "* { box-sizing: border-box; margin: 0; padding: 0; }" +
    "@page { size: A4; margin: 0; }" +
    "html, body { background: #EDEDED; }" +
    "body { font-family: 'Barlow', sans-serif; color: #191923; font-size: 11pt; line-height: 1.5; }" +
    ".page {" +
    "  width: 210mm; min-height: 297mm; max-height: 297mm; height: 297mm;" +
    "  padding: 18mm 18mm 18mm 18mm;" +
    "  margin: 0 auto 8mm auto;" +
    "  background: #FFFFFF;" +
    "  position: relative;" +
    "  overflow: hidden;" +
    "  page-break-after: always;" +
    "}" +
    ".page:last-of-type { page-break-after: auto; margin-bottom: 0; }" +
    ".bg-circle { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }" +
    ".content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; }" +
    "h1.yt { font-family: 'Yellowtail', cursive; color: #FF82D7; font-weight: 400; font-size: 64pt; line-height: 1.05; }" +
    "h2.yt { font-family: 'Yellowtail', cursive; color: #FF82D7; font-weight: 400; font-size: 36pt; line-height: 1.1; }" +
    "h3.bc { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 16pt; text-transform: uppercase; letter-spacing: 1.5px; color: #191923; }" +
    "h3.bc.pink { color: #FF82D7; }" +
    ".rule { height: 3px; background: #FF82D7; width: 64px; margin: 6mm 0; border-radius: 2px; }" +
    ".rule-y { height: 3px; background: #FFEB5A; width: 64px; margin: 6mm 0; border-radius: 2px; }" +
    ".pill { display: inline-block; background: #FFEB5A; color: #191923; padding: 4px 10px; border: 2px solid #191923; border-radius: 999px; font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; }" +
    ".pill.pink { background: #FF82D7; color: #FFFFFF; border-color: #FF82D7; }" +
    "p { margin-bottom: 8px; }" +
    "p.lead { font-size: 12pt; line-height: 1.6; }" +
    "ul.tidy { list-style: none; padding: 0; margin: 4mm 0; }" +
    "ul.tidy li { padding: 4px 0 4px 22px; position: relative; font-size: 10.5pt; line-height: 1.55; }" +
    "ul.tidy li::before { content: '—'; position: absolute; left: 0; color: #FF82D7; font-weight: 700; }" +
    ".grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }" +
    ".field { display: flex; flex-direction: column; padding: 6px 0; border-bottom: 1px solid #EEEEEE; }" +
    ".field .lab { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1px; color: #191923; opacity: 0.65; }" +
    ".field .val { font-size: 11pt; font-weight: 500; color: #191923; min-height: 14pt; padding-top: 2px; }" +
    ".field .val.empty { color: #BBBBBB; font-style: italic; font-weight: 400; }" +
    ".cb { display: inline-flex; align-items: center; gap: 6px; margin-right: 14px; font-size: 10.5pt; }" +
    ".cb .box { width: 14px; height: 14px; border: 2px solid #191923; display: inline-block; position: relative; flex-shrink: 0; background: #FFFFFF; }" +
    ".cb .box.checked { background: #FFEB5A; }" +
    ".cb .box.checked::after { content: '✓'; position: absolute; top: -3px; left: 1px; font-weight: 900; color: #191923; font-size: 13pt; }" +
    ".legal-box { background: #FFFEF5; border-left: 4px solid #FF82D7; padding: 10px 14px; margin: 4mm 0; font-size: 10pt; line-height: 1.55; }" +
    ".legal-box .ref { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #FF82D7; margin-bottom: 4px; }" +
    ".sig-box { margin-top: 8mm; border: 2px solid #191923; padding: 8mm; background: #FFFFFF; }" +
    ".sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 6mm; }" +
    ".sig-line { border-bottom: 1px solid #191923; min-height: 18mm; padding-bottom: 4px; }" +
    ".sig-cap { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1px; opacity: 0.6; margin-top: 4px; }" +
    ".footer { position: absolute; bottom: 8mm; left: 18mm; right: 18mm; font-family: 'Barlow Condensed', sans-serif; font-size: 8pt; color: #999; text-align: center; letter-spacing: 1px; text-transform: uppercase; }" +
    "@media print {" +
    "  html, body { background: #FFFFFF !important; }" +
    "  .page { margin: 0 !important; box-shadow: none !important; page-break-after: always; }" +
    "  .page:last-of-type { page-break-after: auto; }" +
    "}"

  // ===== PAGE 1 — COUVERTURE =====
  var page1 =
    '<div class="page" style="background: #FFFFFF;">' +
      '<div class="bg-circle" style="width: 280mm; height: 280mm; background: #FF82D7; opacity: 0.10; top: -120mm; left: -90mm;"></div>' +
      '<div class="bg-circle" style="width: 110mm; height: 110mm; background: #FFEB5A; opacity: 0.55; top: -30mm; right: -30mm;"></div>' +
      '<div class="bg-circle" style="width: 70mm; height: 70mm; background: #FF82D7; opacity: 0.18; bottom: 20mm; right: 30mm;"></div>' +
      '<div class="bg-circle" style="width: 36mm; height: 36mm; background: #FFEB5A; opacity: 0.85; bottom: 50mm; left: 18mm;"></div>' +
      '<div class="content" style="justify-content: space-between;">' +
        '<div style="display: flex; justify-content: flex-start; align-items: flex-start;">' +
          logoTag +
        '</div>' +
        '<div style="margin-top: 30mm;">' +
          '<div class="pill pink" style="margin-bottom: 10mm;">SAS AEGIA FOOD · CCN 1501</div>' +
          '<h1 class="yt" style="margin-bottom: 8mm;">Bienvenue<br/>chez Meshuga !</h1>' +
          '<div class="rule-y" style="width: 100mm; height: 5px; margin-bottom: 8mm;"></div>' +
          '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; font-size: 14pt; letter-spacing: 2px; color: #191923;">Dossier de bienvenue</div>' +
          '<div style="font-size: 22pt; font-weight: 600; margin-top: 6mm; color: #191923;">' + esc(nomComplet) + '</div>' +
          '<div style="font-size: 11pt; opacity: 0.7; margin-top: 2mm;">' + esc(typeLabel) + (contract.fonction ? ' · ' + esc(contract.fonction) : '') + '</div>' +
        '</div>' +
        '<div style="margin-bottom: 0;">' +
          '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; font-size: 10pt; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.7;">Édité le ' + esc(todayFr()) + '</div>' +
          '<div style="font-size: 10pt; margin-top: 4mm; line-height: 1.5;">' +
            '<b>SAS AEGIA FOOD</b><br/>' +
            '3 rue Vavin — 75006 Paris<br/>' +
            'RCS Paris 904 639 531' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'

  // ===== PAGE 2 — FICHE SALARIÉ =====
  function fld(label, value) {
    var v = value && String(value).trim()
    return '<div class="field">' +
      '<div class="lab">' + esc(label) + '</div>' +
      '<div class="val' + (v ? '' : ' empty') + '">' + (v ? esc(v) : 'À compléter') + '</div>' +
    '</div>'
  }

  var emergencyLine = ""
  if (emp.emergency_contact_name || emp.emergency_contact_phone) {
    emergencyLine = (emp.emergency_contact_name || "")
    if (emp.emergency_contact_relation) emergencyLine += " (" + emp.emergency_contact_relation + ")"
    if (emp.emergency_contact_phone) {
      emergencyLine += (emergencyLine ? " — " : "") + emp.emergency_contact_phone
    }
  }

  var page2 =
    '<div class="page">' +
      '<div class="bg-circle" style="width: 80mm; height: 80mm; background: #FFEB5A; opacity: 0.20; top: -30mm; right: -25mm;"></div>' +
      '<div class="bg-circle" style="width: 50mm; height: 50mm; background: #FF82D7; opacity: 0.10; bottom: 30mm; left: -20mm;"></div>' +
      '<div class="content">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Fiche du salarié</h2>' +
          '<div class="pill">Page 1 / 3 administratif</div>' +
        '</div>' +
        '<div class="rule"></div>' +
        '<p style="font-size: 10.5pt; opacity: 0.8; margin-bottom: 6mm;">' +
          'Ces informations seront utilisées pour ta DPAE, ton bulletin de paie et l\'envoi de tes documents administratifs. Vérifie que tout est exact, complète ce qui manque, puis signe la dernière page.' +
        '</p>' +

        '<h3 class="bc pink">Identité</h3>' +
        '<div class="grid2" style="margin-top: 4mm;">' +
          fld("Civilité", emp.civilite) +
          fld("Nationalité", emp.nationalite ? capit(emp.nationalite) : "") +
          fld("Prénom", emp.prenom) +
          fld("Nom de famille", (emp.nom || "").toUpperCase()) +
          fld("Date de naissance", fmtDate(emp.date_naissance)) +
          fld("Lieu de naissance", emp.lieu_naissance) +
          '<div class="field" style="grid-column: 1 / span 2;">' +
            '<div class="lab">Adresse postale</div>' +
            '<div class="val' + (emp.adresse ? '' : ' empty') + '">' + esc(addressLine) + '</div>' +
          '</div>' +
          fld("N° de Sécurité sociale", emp.num_secu) +
          fld("Téléphone", emp.telephone) +
          '<div class="field" style="grid-column: 1 / span 2;">' +
            '<div class="lab">Email</div>' +
            '<div class="val' + (emp.email ? '' : ' empty') + '">' + esc(emp.email || "À compléter") + '</div>' +
          '</div>' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 6mm;">Situation familiale <span style="font-weight: 400; font-size: 8.5pt; text-transform: none; letter-spacing: 0; opacity: 0.6; font-family: Barlow, sans-serif; margin-left: 6px;">(non obligatoire — bonne pratique RH)</span></h3>' +
        '<div style="margin-top: 4mm;">' +
          '<span class="cb"><span class="box ' + checked(msCheck.celibataire) + '"></span>Célibataire</span>' +
          '<span class="cb"><span class="box ' + checked(msCheck.marie) + '"></span>Marié(e)</span>' +
          '<span class="cb"><span class="box ' + checked(msCheck.pacs) + '"></span>Pacsé(e)</span>' +
          '<span class="cb"><span class="box ' + checked(msCheck.divorce) + '"></span>Divorcé(e)</span>' +
          '<span class="cb"><span class="box ' + checked(msCheck.veuf) + '"></span>Veuf(ve)</span>' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 6mm;">Personne à prévenir en cas d\'urgence <span style="font-weight: 400; font-size: 8.5pt; text-transform: none; letter-spacing: 0; opacity: 0.6; font-family: Barlow, sans-serif; margin-left: 6px;">(non obligatoire — fortement recommandé)</span></h3>' +
        '<div class="field" style="margin-top: 4mm;">' +
          '<div class="lab">Contact d\'urgence</div>' +
          '<div class="val' + (emergencyLine ? '' : ' empty') + '">' + esc(emergencyLine || "À compléter") + '</div>' +
        '</div>' +

      '</div>' +
      '<div class="footer">SAS AEGIA FOOD — Dossier de bienvenue Meshuga — ' + esc(nomComplet) + '</div>' +
    '</div>'

  // ===== PAGE 3 — INFOS PROFESSIONNELLES + RÈGLES D'HYGIÈNE =====
  var haccpHtml =
    '<div style="margin-top: 4mm;">' +
      '<span class="cb"><span class="box ' + checked(emp.haccp_done) + '"></span>' + esc(haccpDoneText || "Formation HACCP suivie") + '</span>' +
      '<span class="cb" style="margin-left: 14px;"><span class="box ' + checked(!emp.haccp_done) + '"></span>' + esc(haccpTodoText || "À planifier auprès de CNFSE") + '</span>' +
    '</div>'

  var page3 =
    '<div class="page">' +
      '<div class="bg-circle" style="width: 70mm; height: 70mm; background: #FF82D7; opacity: 0.10; top: -20mm; left: -25mm;"></div>' +
      '<div class="bg-circle" style="width: 90mm; height: 90mm; background: #FFEB5A; opacity: 0.20; bottom: -30mm; right: -30mm;"></div>' +
      '<div class="content">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Ton poste & l\'hygiène</h2>' +
          '<div class="pill">Page 2 / 3 administratif</div>' +
        '</div>' +
        '<div class="rule"></div>' +

        '<h3 class="bc pink">Tes informations professionnelles</h3>' +
        '<div class="grid2" style="margin-top: 4mm;">' +
          fld("Type de contrat", typeLabel) +
          fld("Date d\'embauche / début", dateEmbaucheFmt) +
          fld("Fonction", contract.fonction) +
          fld("Niveau CCN 1501", niveauCcn) +
          fld("Rémunération brute", salaireLine) +
          fld("Temps de travail", heuresLine || (contract.type === "extra" ? "Vacations selon planning" : "")) +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 5mm;">Formation hygiène alimentaire</h3>' +
        haccpHtml +
        '<p style="font-size: 9.5pt; opacity: 0.7; margin-top: 3mm; font-style: italic;">' +
          'La formation HACCP (Hazard Analysis Critical Control Point) est obligatoire pour au moins une personne par établissement de restauration commerciale (décret du 24 juin 2011).' +
        '</p>' +

        '<h3 class="bc pink" style="margin-top: 6mm;">Règles d\'hygiène à respecter en cuisine</h3>' +
        '<div class="legal-box">' +
          '<div class="ref">Article L4122-1 du Code du travail</div>' +
          'Conformément aux instructions qui te sont données, il t\'incombe de prendre soin, en fonction de ta formation et selon tes possibilités, de ta santé et de ta sécurité ainsi que de celles des autres personnes concernées par tes actes ou tes omissions au travail.' +
        '</div>' +
        '<ul class="tidy">' +
          '<li><b>Lavage des mains</b> systématique à l\'arrivée, après chaque pause, après passage aux toilettes, après manipulation de produit cru ou de déchets — eau chaude + savon pro + essuie-mains à usage unique.</li>' +
          '<li><b>Tenue complète</b> obligatoire en zone de production : uniforme propre, charlotte, gants nitrile pour la manipulation, chaussures de sécurité antidérapantes.</li>' +
          '<li><b>Pas de bijoux</b> (bagues, montres, bracelets), pas d\'ongles longs ou vernis, pas de téléphone portable sur le plan de travail.</li>' +
          '<li><b>Marche en avant</b> respectée : produits crus → préparation → cuisson → refroidissement → distribution. Aucun croisement entre flux propre et flux sale.</li>' +
          '<li><b>Températures</b> contrôlées 2× par jour : froid positif ≤ 4 °C, congélateur ≤ −18 °C, plats chauds ≥ 63 °C. Relevés sur la fiche F1.</li>' +
          '<li><b>Nettoyage et désinfection</b> selon le plan affiché en cuisine (vinaigre blanc plancha + friteuse 2×/j, Assainythol plan de travail 2×/j, Aspec vaisselle, Daily Klean\'Vitres). Relevés sur la fiche F6.</li>' +
          '<li><b>Maladie ou blessure</b> à signaler immédiatement à l\'employeur — pansement bleu détectable obligatoire pour toute coupure.</li>' +
          '<li><b>DLC / DLUO</b> à vérifier à chaque utilisation. Tout produit douteux est jeté et signalé.</li>' +
        '</ul>' +

      '</div>' +
      '<div class="footer">SAS AEGIA FOOD — Dossier de bienvenue Meshuga — ' + esc(nomComplet) + '</div>' +
    '</div>'

  // ===== PAGE 4 — ENGAGEMENT DE LECTURE & SIGNATURE =====
  var page4 =
    '<div class="page">' +
      '<div class="bg-circle" style="width: 130mm; height: 130mm; background: #FF82D7; opacity: 0.08; top: -50mm; right: -40mm;"></div>' +
      '<div class="bg-circle" style="width: 60mm; height: 60mm; background: #FFEB5A; opacity: 0.55; bottom: 60mm; left: -20mm;"></div>' +
      '<div class="content">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Engagement de lecture</h2>' +
          '<div class="pill">Page 3 / 3 administratif</div>' +
        '</div>' +
        '<div class="rule"></div>' +

        '<p class="lead" style="margin-top: 4mm;">' +
          'En tant que nouveau membre de l\'équipe Meshuga, tu reconnais avoir reçu et lu attentivement le présent dossier de bienvenue, comprenant tes informations administratives, les règles d\'hygiène alimentaire et les obligations de sécurité au travail.' +
        '</p>' +

        '<div class="legal-box" style="margin-top: 5mm;">' +
          '<div class="ref">Article L1331-1 du Code du travail</div>' +
          'Constitue une sanction toute mesure, autre que les observations verbales, prise par l\'employeur à la suite d\'un agissement du salarié considéré par lui comme fautif, que cette mesure soit de nature à affecter immédiatement ou non la présence du salarié dans l\'entreprise, sa fonction, sa carrière ou sa rémunération. La connaissance préalable des règles internes par le salarié conditionne leur opposabilité.' +
        '</div>' +

        '<div class="legal-box">' +
          '<div class="ref">Article L4122-1 du Code du travail</div>' +
          'Conformément aux instructions qui lui sont données par l\'employeur, il incombe à chaque travailleur de prendre soin, en fonction de sa formation et selon ses possibilités, de sa santé et de sa sécurité ainsi que de celles des autres personnes concernées par ses actes ou ses omissions au travail.' +
        '</div>' +

        '<p style="margin-top: 5mm; font-size: 10.5pt;">' +
          '<b>Je soussigné(e) ' + esc(nomComplet) + '</b>, reconnais&nbsp;:' +
        '</p>' +
        '<ul class="tidy" style="margin-top: 2mm;">' +
          '<li>avoir reçu en main propre le présent dossier de bienvenue Meshuga (3 pages administratives + cette page d\'engagement)&nbsp;;</li>' +
          '<li>avoir lu et compris les règles d\'hygiène alimentaire et les consignes de sécurité au travail qui y figurent&nbsp;;</li>' +
          '<li>m\'engager à les respecter dans l\'exercice de mes fonctions, et à signaler immédiatement à l\'employeur tout manquement ou risque que je viendrais à constater.</li>' +
        '</ul>' +

        '<div class="sig-box">' +
          '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; font-size: 10pt;">' +
            'Mention manuscrite obligatoire avant signature : <span style="color: #FF82D7;">«&nbsp;Lu et approuvé&nbsp;»</span>' +
          '</div>' +
          '<div class="sig-grid">' +
            '<div>' +
              '<div class="sig-line"></div>' +
              '<div class="sig-cap">Le salarié — date + « Lu et approuvé » + signature</div>' +
            '</div>' +
            '<div>' +
              '<div class="sig-line"></div>' +
              '<div class="sig-cap">L\'employeur — Edward TOURET, Président SAS AEGIA</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<p style="margin-top: 6mm; font-size: 9.5pt; opacity: 0.6; font-style: italic;">' +
          'Document conservé dans le dossier RH du salarié pendant toute la durée du contrat et 5 ans après sa sortie effective (article D.1221-24 du Code du travail).' +
        '</p>' +

      '</div>' +
      '<div class="footer">SAS AEGIA FOOD — 3 rue Vavin 75006 Paris — RCS Paris 904 639 531</div>' +
    '</div>'

  // ===== ASSEMBLAGE FINAL =====
  var html =
    '<!DOCTYPE html>' +
    '<html lang="fr">' +
    '<head>' +
      '<meta charset="utf-8" />' +
      '<title>Dossier de bienvenue Meshuga — ' + esc(nomComplet) + '</title>' +
      '<style>' + styles + '</style>' +
    '</head>' +
    '<body>' +
      page1 +
      page2 +
      page3 +
      page4 +
    '</body>' +
    '</html>'

  return html
}
