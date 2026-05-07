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

// ============================================================
// Assets visuels Meshuga (PNG détourés, fond transparent)
// Logos officiels jaune sur transparent — chunks 72 chars
// pour compatibilité GitHub web editor (pas de truncation).
// ============================================================
var LOGOTYPE_YELLOW = "data:image/png;base64," +
  "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" +
  "iJ/42f8A8GbV2Ytb4Z4AAAAASUVORK5CYII="

var STAMP_YELLOW = "data:image/png;base64," +
  "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"

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
  // Renvoie le markup complet d'une case à cocher (vide ou cochée avec ✓ SVG)
  function checkBox(cond) {
    var svg = '<svg width="10" height="10" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" stroke="#191923" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>'
    return '<span class="box ' + (cond ? 'checked' : 'unchecked') + '">' + (cond ? svg : '') + '</span>'
  }
  function capit(s) {
    if (!s) return ""
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  // Genre détecté à partir de la civilité (Mme/Mlle = féminin, M./Mr/Monsieur = masculin)
  // Renvoie 'f' pour féminin, 'm' pour masculin (défaut si inconnu)
  function detectGenre(e) {
    var c = (e.civilite || "").toString().trim().toLowerCase().replace(/\./g, "")
    if (c === "mme" || c === "madame" || c === "mlle" || c === "mademoiselle") return "f"
    if (c === "m" || c === "mr" || c === "monsieur") return "m"
    // Fallback : si pas de civilité, on essaie via le champ sexe si présent
    var s = (e.sexe || e.gender || "").toString().trim().toLowerCase()
    if (s === "f" || s === "femme" || s === "female") return "f"
    if (s === "m" || s === "homme" || s === "male") return "m"
    return "m"
  }
  var GENRE = detectGenre(emp)
  // g(m, f) → renvoie f si féminin, m sinon. Helper d'accord.
  function g(m, f) {
    return GENRE === "f" ? f : m
  }

  // ===== Données dérivées =====
  var nomComplet = (emp.prenom || "") + " " + (emp.nom || "").toUpperCase()
  nomComplet = nomComplet.trim() || "—"

  var addressLine = (emp.adresse || "") + (emp.adresse && (emp.code_postal || emp.ville) ? " — " : "")
    + (emp.code_postal || "") + " " + (emp.ville || "")
  addressLine = addressLine.trim() || "—"

  // Type de contrat (accordé au genre)
  // Note : `type` est l'identifiant interne (cdi_cadre, cdi_caissier, cdi_cuisinier, extra).
  // La vérité sur le statut cadre/non-cadre est dans `statut_cadre`.
  var statutCadre = (contract.statut_cadre || "").toLowerCase().trim()
  var isCadreReel = statutCadre === "cadre"
  var typeLabels = {
    "extra": "CDD d'usage (Extra)",
    "cdi_cadre": isCadreReel ? "CDI Cadre" : "CDI " + g("Agent de maîtrise", "Agent de maîtrise"),
    "cdi_cuisinier": "CDI " + g("Cuisinier", "Cuisinière"),
    "cdi_caissier": "CDI " + g("Caissier", "Caissière")
  }
  var typeLabel = typeLabels[contract.type] || "—"

  // Date d'embauche / début
  var dateEmbauche = contract.date_embauche || contract.date_debut || ""
  var dateEmbaucheFmt = fmtDate(dateEmbauche)

  // Helper format décimal FR : "39.00" -> "39" / "39.50" -> "39,5" / "3006.00" -> "3006"
  var fmtNum = function(v) {
    if (v === null || v === undefined || v === "") return ""
    var n = parseFloat(String(v).replace(",", "."))
    if (isNaN(n)) return String(v)
    if (n % 1 === 0) return String(n)
    return String(n).replace(".", ",")
  }

  // Salaire
  var salaireLine = ""
  if (contract.type && contract.type !== "extra") {
    if (contract.salaire_brut_mensuel) salaireLine = fmtNum(contract.salaire_brut_mensuel) + " € brut / mois"
  } else if (contract.taux_horaire_brut) {
    salaireLine = fmtNum(contract.taux_horaire_brut) + " € brut / heure"
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
    heuresLine = fmtNum(contract.heures_hebdo) + " h / semaine"
  }

  // Période d'essai — RECOPIE FIDÈLE du contrat (champs Supabase) :
  //   * periode_essai_mois         : durée initiale (integer)
  //   * periode_essai_renouvelable : si TRUE, renouvelable une fois pour la même durée
  //   * statut_cadre               : "cadre" ou "non-cadre"
  // Référentiel juridique cité : CCN 1501 art. 9 + L1221-19, L1221-21, L1221-25, L1221-26
  var periodeEssaiLine = ""
  if (contract.type === "extra") {
    periodeEssaiLine = "Sans objet pour CDD d'usage de courte durée — relation contractuelle à durée déterminée encadrée par les articles L1242-1 et suivants du Code du travail."
  } else {
    var dureeMois = contract.periode_essai_mois
    if (!dureeMois || dureeMois <= 0) {
      // fallback si la base n'a rien : on ne fait pas de zèle, on prend la valeur min CCN 1501 selon niveau
      var niv = (contract.niveau_ccn || "").toString().toUpperCase().trim()
      if (isCadreReel) dureeMois = 4
      else if (niv === "IV") dureeMois = 3
      else if (niv === "III") dureeMois = 2
      else dureeMois = 1
    }
    var renouv = contract.periode_essai_renouvelable === true
    if (renouv) {
      var dureeTotale = dureeMois * 2
      periodeEssaiLine = dureeMois + " mois, renouvelable une fois pour " + dureeMois + " mois supplémentaires (durée maximale totale : " + dureeTotale + " mois), sous réserve d'un accord écrit " + g('du salarié', 'de la salariée') + " intervenant avant le terme de la période initiale. Références : CCN 1501 art. 9 · articles L1221-19, L1221-21 et L1221-25 (délais de prévenance) du Code du travail."
    } else {
      periodeEssaiLine = dureeMois + " mois, non renouvelable. Références : CCN 1501 art. 9 · articles L1221-19 et L1221-25 (délais de prévenance) du Code du travail."
    }
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
    // @page natif Chrome : marges A4 + footer @bottom-center auto sur chaque page physique.
    // Plus aucun footer manuel à gérer, plus aucun découpage en .page rigide.
    "@page { size: A4; margin: 18mm 16mm 20mm 16mm; @bottom-center { content: 'SAS AEGIA FOOD - Dossier de bienvenue Meshuga'; font-family: 'Barlow Condensed', sans-serif; font-size: 8pt; color: #999999; letter-spacing: 1px; text-transform: uppercase; } }" +
    "@page :first { margin: 0; @bottom-center { content: ''; } }" +  // couverture sans marges/footer
    "html, body { background: #FFFFFF; }" +
    "body { font-family: 'Barlow', sans-serif; color: #191923; font-size: 11pt; line-height: 1.55; }" +
    // Couverture pleine page rose, sans marges, page-break après pour démarrer le contenu sur page 2
    ".cover { width: 210mm; height: 297mm; background: #FF82D7; padding: 22mm; position: relative; overflow: hidden; page-break-after: always; break-after: page; display: flex; flex-direction: column; justify-content: space-between; }" +
    ".cover .bg-circle { position: absolute; border-radius: 50%; pointer-events: none; }" +
    // Conteneur de contenu (post-couverture) : flux naturel, Chrome paginera tout seul
    ".flow { width: 100%; }" +
    // Chapitre = un h2 Yellowtail + son contenu. break-before:page démarre chaque chapitre sur une nouvelle page.
    ".chapter { break-before: page; page-break-before: always; }" +
    ".chapter:first-of-type { break-before: avoid; page-break-before: avoid; }" +
    "h2.yt { font-family: 'Yellowtail', cursive; color: #FF82D7; font-weight: 400; font-size: 36pt; line-height: 1.2; padding-bottom: 3mm; margin-bottom: 5mm; border-bottom: 3px solid #FF82D7; break-after: avoid; page-break-after: avoid; }" +
    "h3.bc { font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 13pt; text-transform: uppercase; letter-spacing: 1px; color: #FF82D7; margin-top: 5mm; margin-bottom: 2mm; break-after: avoid; page-break-after: avoid; }" +
    "h3.bc.pink { color: #FF82D7; }" +
    ".section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 3mm; }" +
    ".legal-box { background: #FFFEF5; border-left: 4px solid #FF82D7; padding: 10px 14px; margin: 3mm 0; font-size: 11pt; line-height: 1.55; break-inside: avoid; page-break-inside: avoid; }" +
    ".legal-box .ref { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #FF82D7; margin-bottom: 4px; display: block; }" +
    ".sig-block { break-inside: avoid; page-break-inside: avoid; }" +
    "p { margin-bottom: 6px; }" +
    "p.lead { font-size: 12pt; line-height: 1.55; margin-bottom: 6mm; opacity: 0.85; }" +
    "ul.tidy { list-style: none; padding: 0; margin: 3mm 0; }" +
    "ul.tidy li { padding: 4px 0 4px 22px; position: relative; font-size: 11pt; line-height: 1.55; break-inside: avoid; page-break-inside: avoid; }" +
    "ul.tidy li::before { content: '•'; position: absolute; left: 0; color: #FF82D7; font-weight: 700; font-size: 14pt; line-height: 0.8; }" +
    ".grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }" +
    ".field { display: flex; flex-direction: column; padding: 5px 0; border-bottom: 1px solid #EEEEEE; break-inside: avoid; }" +
    ".field .lab { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 9pt; text-transform: uppercase; letter-spacing: 1px; color: #191923; opacity: 0.65; }" +
    ".field .val { font-size: 11pt; font-weight: 500; color: #191923; min-height: 14pt; padding-top: 1px; }" +
    ".field .val.empty { color: #BBBBBB; font-style: italic; font-weight: 400; }" +
    ".cb { display: inline-flex; align-items: center; gap: 8px; margin-right: 14px; font-size: 11pt; vertical-align: middle; }" +
    ".cb .box { width: 14px; height: 14px; border: 2px solid #191923; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; background: #FFFFFF; box-sizing: border-box; line-height: 0; vertical-align: middle; }" +
    ".cb .box.checked { background: #FFEB5A; }" +
    ".cb .box.checked svg { display: block; }" +
    "* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }" +
    "@media screen {" +
    "  body { background: #EDEDED; padding: 0; margin: 0; }" +
    "  .cover { margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }" +
    "  .flow { max-width: 210mm; margin: 0 auto; background: #FFFFFF; padding: 18mm 16mm 20mm 16mm; min-height: 297mm; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }" +
    "}" +
    "@media screen and (max-width: 820px) {" +
    "  body { font-size: 14px; }" +
    "  .cover { width: 100% !important; height: auto !important; min-height: 80vh !important; padding: 8vw 6vw !important; box-shadow: none !important; }" +
    "  .flow { max-width: 100% !important; padding: 6vw 5vw !important; box-shadow: none !important; min-height: 0 !important; }" +
    "  h1[style*='80pt'] { font-size: 44pt !important; }" +
    "  h2.yt { font-size: 28pt !important; }" +
    "  .grid2 { grid-template-columns: 1fr !important; gap: 1mm 0 !important; }" +
    "  div[style*='grid-template-columns: 1fr 1fr'] { grid-template-columns: 1fr !important; gap: 4mm !important; }" +
    "  div[style*='grid-template-columns: auto 1fr'] { grid-template-columns: 1fr !important; }" +
    "  .cover .bg-circle { display: none !important; }" +
    "}"

  // ===== PAGE 1 — COUVERTURE (style Affiches cuisine : fond rose plein) =====
  // Logotype officiel + stamp officiel Meshuga (PNG détourés, fond transparent)
  var page1 =
    '<div class="cover">' +
      // Cercles décoratifs jaune translucide en arrière-plan
      '<div class="bg-circle" style="width: 180mm; height: 180mm; background: #FFEB5A; opacity: 0.18; top: -60mm; right: -50mm;"></div>' +
      '<div class="bg-circle" style="width: 110mm; height: 110mm; background: #FFEB5A; opacity: 0.10; bottom: -30mm; left: -30mm;"></div>' +
      '<div class="content" style="justify-content: space-between; padding: 0;">' +
        // Bloc haut : Logotype officiel "meshuga" jaune en haut à gauche
        '<div>' +
          '<img src="' + LOGOTYPE_YELLOW + '" alt="Meshuga" style="display: block; width: 90mm; height: auto; max-width: 100%;" />' +
          '<div style="margin-top: 10mm; font-family: \'Barlow Condensed\', sans-serif; color: #FFEB5A; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 3px;">' +
            'PAGE RH · DOSSIER DE BIENVENUE · ' + esc(typeLabel.toUpperCase()) +
          '</div>' +
        '</div>' +
        // Bloc milieu : Titre Yellowtail jaune + description
        '<div>' +
          '<h1 style="font-family: Yellowtail, cursive; color: #FFEB5A; font-weight: 400; font-size: 80pt; line-height: 1; margin-bottom: 6mm;">Dossier de<br/>bienvenue</h1>' +
          '<div style="font-family: \'Barlow Condensed\', sans-serif; color: #FFEB5A; font-size: 12pt; font-weight: 600; text-transform: uppercase; letter-spacing: 2.5px; line-height: 1.6;">' +
            'Identité · Poste · Sécurité · Cadre social · Engagement signé' +
          '</div>' +
          '<div style="margin-top: 14mm; padding: 6mm 8mm; background: rgba(255,235,90,0.18); border-left: 4px solid #FFEB5A;">' +
            '<div style="font-family: \'Barlow Condensed\', sans-serif; color: #FFEB5A; font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 3mm;">' + g('Salarié', 'Salariée') + '</div>' +
            '<div style="color: #FFEB5A; font-size: 22pt; font-weight: 700; line-height: 1.1;">' + esc(nomComplet) + '</div>' +
            (contract.fonction ? '<div style="color: #FFEB5A; font-size: 11pt; opacity: 0.85; margin-top: 2mm; font-weight: 500;">' + esc(contract.fonction) + (dateEmbaucheFmt ? ' · embauche ' + esc(dateEmbaucheFmt) : '') + '</div>' : '') +
          '</div>' +
        '</div>' +
        // Bloc bas : à gauche infos AEGIA en jaune, à droite stamp officiel jaune
        '<div style="display: flex; justify-content: space-between; align-items: flex-end;">' +
          '<div style="color: #FFEB5A; font-size: 9pt; line-height: 1.7; font-family: \'Barlow Condensed\', sans-serif; font-weight: 500;">' +
            '<div style="font-weight: 800; text-transform: uppercase; letter-spacing: 2px; font-size: 9pt; margin-bottom: 2mm;">Édité le ' + esc(todayFr()) + '</div>' +
            '<div style="font-weight: 700; font-size: 11pt;">SAS AEGIA FOOD</div>' +
            '<div>3 rue Vavin — 75006 Paris</div>' +
            '<div>RCS Paris 904 639 531 — TVA FR31904639531</div>' +
            '<div>CCN Restauration Rapide IDCC 1501</div>' +
          '</div>' +
          '<img src="' + STAMP_YELLOW + '" alt="Meshuga Crazy Deli" style="display: block; width: 48mm; height: 48mm; flex-shrink: 0; object-fit: contain;" />' +
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
    '<section class="chapter">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">' + g("Fiche du salarié", "Fiche de la salariée") + '</h2>' +
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
          '<span class="cb">' + checkBox(msCheck.celibataire) + 'Célibataire</span>' +
          '<span class="cb">' + checkBox(msCheck.marie) + g("Marié", "Mariée") + '</span>' +
          '<span class="cb">' + checkBox(msCheck.pacs) + g("Pacsé", "Pacsée") + '</span>' +
          '<span class="cb">' + checkBox(msCheck.divorce) + g("Divorcé", "Divorcée") + '</span>' +
          '<span class="cb">' + checkBox(msCheck.veuf) + g("Veuf", "Veuve") + '</span>' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 6mm;">Personne à prévenir en cas d\'urgence <span style="font-weight: 400; font-size: 8.5pt; text-transform: none; letter-spacing: 0; opacity: 0.6; font-family: Barlow, sans-serif; margin-left: 6px;">(non obligatoire — fortement recommandé)</span></h3>' +
        '<div class="field" style="margin-top: 4mm;">' +
          '<div class="lab">Contact d\'urgence</div>' +
          '<div class="val' + (emergencyLine ? '' : ' empty') + '">' + esc(emergencyLine || "À compléter") + '</div>' +
        '</div>' +

      '</div>' +
    '</section>'

  // ===== PAGE 3 — INFOS PROFESSIONNELLES + RÈGLES D'HYGIÈNE =====
  var haccpHtml =
    '<div style="margin-top: 4mm;">' +
      '<span class="cb">' + checkBox(emp.haccp_done) + esc(haccpDoneText || "Formation HACCP suivie") + '</span>' +
      '<span class="cb" style="margin-left: 14px;">' + checkBox(!emp.haccp_done) + esc(haccpTodoText || "À planifier auprès de CNFSE") + '</span>' +
    '</section>'

  var page3 =
    '<section class="chapter">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Ton poste & l\'hygiène</h2>' +
        '</div>' +
        '<div class="rule" style="margin: 3mm 0;"></div>' +

        '<h3 class="bc pink" style="font-size: 12pt;">Tes informations professionnelles</h3>' +
        '<div class="grid2" style="margin-top: 1mm; gap: 0 8mm;">' +
          fld("Type de contrat", typeLabel) +
          fld("Date d\'embauche / début", dateEmbaucheFmt) +
          fld("Fonction", contract.fonction) +
          fld("Niveau CCN 1501", niveauCcn) +
          fld("Rémunération brute", salaireLine) +
          fld("Temps de travail", heuresLine || (contract.type === "extra" ? "Vacations selon planning" : "")) +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 3mm; font-size: 12pt;">Période d\'essai</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 9pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles L1221-19 à L1221-26 du Code du travail · CCN 1501 art. 9</div>' +
          esc(periodeEssaiLine) +
        '</div>' +

        // Clause de mobilité (si activée dans le contrat)
        (contract.clause_mobilite === true ? (
          '<h3 class="bc pink" style="margin-top: 3mm; font-size: 12pt;">Clause de mobilité</h3>' +
          '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 9pt;">' +
            '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Article L1222-6 du Code du travail · jurisprudence Cass. Soc. (zone géographique précise)</div>' +
            'Conformément à ton contrat de travail, tu acceptes que ton lieu de travail puisse être modifié à l\'intérieur de la zone suivante&nbsp;: <b>' + esc(contract.clause_mobilite_zone || "—") + '</b>. Toute mutation dans cette zone constitue une simple modification des conditions de travail (et non du contrat) et ne nécessite pas d\'avenant. Hors de cette zone, ton accord écrit reste requis.' +
          '</div>'
        ) : "") +
        '<h3 class="bc pink" style="margin-top: 3mm; font-size: 12pt;">Formation hygiène alimentaire (HACCP)</h3>' +
        haccpHtml +
        '<p style="font-size: 8pt; opacity: 0.7; margin-top: 1mm; font-style: italic; line-height: 1.4;">' +
          'Décret n° 2011-731 du 24 juin 2011 — au moins une personne formée HACCP par établissement de restauration commerciale.' +
        '</p>' +

        '<h3 class="bc pink" style="margin-top: 3mm; font-size: 12pt;">Allergènes alimentaires (14 obligatoires)</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Règlement (UE) n° 1169/2011 (INCO), annexe II · Décret n° 2015-447</div>' +
          '<b>1.</b> Céréales avec gluten · <b>2.</b> Crustacés · <b>3.</b> Œufs · <b>4.</b> Poissons · <b>5.</b> Arachides · <b>6.</b> Soja · <b>7.</b> Lait/lactose · <b>8.</b> Fruits à coque · <b>9.</b> Céleri · <b>10.</b> Moutarde · <b>11.</b> Sésame · <b>12.</b> Sulfites (>10 mg/kg) · <b>13.</b> Lupin · <b>14.</b> Mollusques.' +
        '</div>' +
        '<p style="font-size: 8.5pt; margin-top: 1mm; line-height: 1.4;">' +
          '<b>' + g('Tu es tenu', 'Tu es tenue') + ' de connaître la composition de chaque produit servi</b> et de répondre précisément à toute question client sur les allergènes. La fiche allergènes complète est affichée en cuisine et consultable dans le classeur récapitulatif.' +
        '</p>' +

      '</div>' +
    '</section>'

  // ===== PAGE 4 — SÉCURITÉ AU TRAVAIL =====
  var page4 =
    '<section class="chapter">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Sécurité au travail</h2>' +
        '</div>' +
        '<div class="rule" style="margin: 3mm 0;"></div>' +

        '<h3 class="bc pink" style="font-size: 12pt;">Équipements de protection individuelle (EPI)</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles R4321-4 et R4323-95 du Code du travail</div>' +
          'L\'employeur fournit gratuitement les EPI nécessaires et veille à leur utilisation effective. ' + g('Le salarié', 'La salariée') + ' est ' + g('tenu', 'tenue') + ' d\'utiliser correctement ces équipements et de les maintenir en bon état.' +
        '</div>' +
        '<p style="font-size: 9pt; margin: 1mm 0 0 0;"><b>Liste des EPI remis ' + g('au salarié', 'à la salariée') + ' à l\'embauche</b> (à cocher en présence de l\'employeur)&nbsp;:</p>' +
        '<div style="margin-top: 2mm; display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; font-size: 9pt;">' +
          '<span class="cb">' + checkBox(false) + 'Uniforme Meshuga (haut + bas)</span>' +
          '<span class="cb">' + checkBox(false) + 'Charlotte / coiffe</span>' +
          '<span class="cb">' + checkBox(false) + 'Gants nitrile (jetables)</span>' +
          '<span class="cb">' + checkBox(false) + 'Chaussures de sécurité antidérapantes</span>' +
          '<span class="cb">' + checkBox(false) + 'Tablier de service' + '</span>' +
          '<span class="cb">' + checkBox(false) + 'Information / formation au port' + '</span>' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 4mm; font-size: 12pt;">Sécurité incendie & numéros d\'urgence</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles R4227-37 à R4227-41 et R4141-2 du Code du travail</div>' +
          'L\'employeur informe ' + g('le salarié', 'la salariée') + ' des consignes de sécurité incendie et des dispositifs de premiers secours dès l\'embauche. Les issues de secours, extincteurs et plans d\'évacuation sont affichés en cuisine et en salle.' +
        '</div>' +
        '<div style="margin-top: 2mm; display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 6mm; font-size: 9pt;">' +
          '<div><b>Pompiers</b>&nbsp;: 18</div>' +
          '<div><b>SAMU</b>&nbsp;: 15</div>' +
          '<div><b>Police</b>&nbsp;: 17</div>' +
          '<div><b>Urgences UE</b>&nbsp;: 112</div>' +
          '<div><b>Sourds / muets (SMS)</b>&nbsp;: 114</div>' +
          '<div><b>Centre antipoison</b>&nbsp;: 01 40 05 48 48</div>' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 4mm; font-size: 12pt;">Document Unique d\'Évaluation des Risques Professionnels (DUERP)</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles R4121-1 à R4121-4 du Code du travail</div>' +
          'L\'employeur tient à jour un DUERP listant les risques professionnels identifiés et les mesures de prévention mises en œuvre. Mise à jour annuelle obligatoire. <b>Le DUERP de Meshuga est consultable à tout moment dans le classeur récapitulatif présent au restaurant, sur simple demande.</b>' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 4mm; font-size: 12pt;">Droit d\'alerte et droit de retrait</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles L4131-1 à L4131-3 du Code du travail</div>' +
          'En cas de <b>danger grave et imminent</b> pour ta vie ou ta santé, tu as le droit&nbsp;: <b>(1)</b> d\'alerter immédiatement l\'employeur (oralement puis par écrit), <b>(2)</b> de te retirer de la situation dangereuse. <b>Aucune sanction ni retenue de salaire ne peut être prise contre ' + g('un salarié', 'une salariée') + ' ayant exercé ce droit de bonne foi.</b> L\'employeur ne peut imposer la reprise du travail tant que la situation de danger persiste.' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 4mm; font-size: 12pt;">Règles d\'hygiène à respecter en cuisine</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Article L4122-1 du Code du travail</div>' +
          'Il t\'incombe de prendre soin, selon ta formation et tes possibilités, de ta santé, de ta sécurité et de celles des personnes concernées par tes actes ou omissions.' +
        '</div>' +
        '<ul class="tidy" style="margin: 1mm 0; font-size: 8.5pt;">' +
          '<li><b>Lavage des mains</b> : arrivée, après chaque pause, après toilettes, après cru/déchets — eau chaude + savon pro + essuie-mains UU.</li>' +
          '<li><b>Tenue complète</b> : uniforme, charlotte, gants nitrile, chaussures de sécurité antidérapantes. Pas de bijoux, pas d\'ongles longs/vernis, pas de téléphone sur le plan de travail.</li>' +
          '<li><b>Marche en avant</b> : crus → préparation → cuisson → refroidissement → distribution. Aucun croisement flux propre / flux sale.</li>' +
          '<li><b>Températures</b> 2× / jour : froid ≤ 4 °C, congélateur ≤ −18 °C, plats chauds ≥ 63 °C — relevés fiche F1.</li>' +
          '<li><b>Nettoyage</b> selon plan affiché : vinaigre blanc plancha+friteuse 2×/j, Assainythol plan travail 2×/j, Aspec vaisselle — relevés fiche F6.</li>' +
          '<li><b>Maladie / blessure</b> signalée immédiatement — pansement bleu détectable obligatoire pour toute coupure.</li>' +
          '<li><b>DLC / DLUO</b> vérifiées à chaque utilisation. Tout produit douteux est jeté et signalé.</li>' +
        '</ul>' +

      '</div>' +
    '</section>'

  // ===== PAGE 5 — CADRE SOCIAL & OBLIGATIONS LÉGALES =====
  var page5 =
    '<section class="chapter">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Cadre social & légal</h2>' +
        '</div>' +
        '<div class="rule" style="margin: 3mm 0;"></div>' +

        '<h3 class="bc pink" style="font-size: 12pt;">Harcèlement moral et sexuel · Référent</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles L1152-1 à L1152-6 (moral) · L1153-1 à L1153-6 (sexuel) · L1153-5-1 (information) du Code du travail · 222-33-2 du Code pénal</div>' +
          'Aucun salarié ne doit subir d\'agissements répétés de harcèlement moral ni de propos ou comportements à connotation sexuelle. <b>Sanctions civiles et pénales</b>&nbsp;: jusqu\'à 2 ans (moral) ou 3 ans (sexuel) de prison + 30 000 € à 45 000 € d\'amende. ' + g('Le salarié', 'La salariée') + ' qui dénonce, témoigne ou refuse de subir un harcèlement bénéficie d\'une <b>protection contre le licenciement</b>.' +
        '</div>' +
        '<p style="font-size: 9pt; margin: 1mm 0; line-height: 1.4;">' +
          '<b>Référent harcèlement Meshuga</b>&nbsp;: Edward TOURET, Président SAS AEGIA FOOD — edward@meshuga.fr — 06 58 58 58 01.<br/>' +
          '<b>Autres canaux d\'alerte</b>&nbsp;: Inspection du travail (DREETS Île-de-France) · Médecin du travail (EFFICIENCE Vaugirard) · Défenseur des droits (defenseurdesdroits.fr) · Procureur de la République.' +
        '</p>' +

        '<h3 class="bc pink" style="margin-top: 3mm; font-size: 12pt;">Égalité et non-discrimination</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles L1132-1 (25 critères prohibés) et L1142-1 (égalité H/F) du Code du travail · 225-1 Code pénal</div>' +
          'Aucune décision (embauche, rémunération, sanction, licenciement…) ne peut être fondée sur l\'origine, le sexe, les mœurs, l\'orientation sexuelle, l\'identité de genre, l\'âge, la situation de famille, la grossesse, l\'état de santé, le handicap, l\'apparence physique, le nom, le lieu de résidence, les opinions politiques ou religieuses, l\'activité syndicale ou tout autre critère prohibé. <b>Sanctions</b>&nbsp;: 3 ans de prison + 45 000 € d\'amende.' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 3mm; font-size: 12pt;">Convention Collective applicable</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Article R2262-1 du Code du travail</div>' +
          '<b>CCN nationale de la Restauration Rapide — IDCC 1501.</b> Texte intégral consultable à tout moment dans le classeur récapitulatif au restaurant et sur Légifrance (legifrance.gouv.fr). Tout salarié peut en demander une copie à l\'employeur.' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 3mm; font-size: 12pt;">Médecine du travail · Mutuelle · Prévoyance</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles R4624-10 (VIP) du Code du travail · L911-8 du Code de la Sécurité sociale (notice mutuelle)</div>' +
          '<b>Médecine du travail</b>&nbsp;: EFFICIENCE — Centre Vaugirard, 64 rue de Vaugirard, 75006 Paris. <b>Visite d\'Information et de Prévention (VIP)</b> dans les 3 mois suivant l\'embauche, RDV pris par l\'employeur.<br/>' +
          '<b>Prévoyance</b>&nbsp;: Gan Eurocourtage Vie. Notice d\'information à venir sous 30 jours, l\'employeur s\'engage à la remettre dès réception (récépissé en page 6).' +
        '</div>' +

      '</div>' +
    '</section>'

  // ===== PAGE 5b — VIDÉOSURVEILLANCE & RGPD =====
  var page5b =
    '<section class="chapter">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Vidéosurveillance & RGPD</h2>' +
        '</div>' +
        '<div class="rule" style="margin: 3mm 0;"></div>' +

        '<p style="font-size: 8.5pt; margin: 1mm 0 2mm 0; line-height: 1.4;">' +
          '<b>Cette page constitue ton information préalable individuelle</b> sur les traitements de données personnelles te concernant, conformément à l\'<b>article 13 du RGPD</b> et à l\'<b>article L1222-4 du Code du travail</b>. Elle est essentielle pour rendre opposables les images de vidéosurveillance et les traitements RH en cas de procédure.' +
        '</p>' +

        '<h3 class="bc pink" style="font-size: 12pt;">Vidéosurveillance de l\'établissement</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8.5pt;">' +
          '<div class="ref" style="font-size: 8pt; margin-bottom: 1px;">Articles L1121-1, L1222-4 du Code du travail · RGPD art. 5, 6, 13, 30 · articles 226-1 et R625-10 du Code pénal · règlements (CE) 178/2002 et 852/2004 · recommandations CNIL · Cass. Soc. 23 juin 2010 n° 09-66.355</div>' +
          '<b>L\'établissement Meshuga (3 rue Vavin, 75006 Paris) est placé sous vidéosurveillance.</b> Tu en es ' + g('informé', 'informée') + ' personnellement et préalablement à ta prise de poste, conformément à l\'obligation d\'information individuelle de l\'employeur (L1222-4) et au principe de loyauté (L1121-1).' +
        '</div>' +

        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5mm 6mm; font-size: 8.5pt; margin-top: 1.5mm;">' +
          '<div><b>Caméras installées</b>&nbsp;: 2 (marque REOSU)</div>' +
          '<div><b>Durée de conservation</b>&nbsp;: 30 jours maximum</div>' +
          '<div style="grid-column: 1 / 3;"><b>Emplacement</b>&nbsp;: <b>(1)</b> comptoir / caisse · <b>(2)</b> au-dessus du poste de cuisson (axée sur l\'équipement, friteuse + plancha)</div>' +
          '<div style="grid-column: 1 / 3;"><b>Stockage</b>&nbsp;: enregistreur (NVR) avec disque dur dédié, <b>strictement local sur site</b>, accès physique sécurisé. <b>Aucun transfert vers un service cloud externe</b>, aucun envoi de données hors UE.</div>' +
          '<div style="grid-column: 1 / 3;"><b>Mode d\'exploitation</b>&nbsp;: pas de visionnage en temps réel — <b>consultation a posteriori uniquement</b>, en cas d\'incident avéré, de contrôle DDPP, ou de réquisition judiciaire.</div>' +
          '<div style="grid-column: 1 / 3;"><b>Accès aux images</b>&nbsp;: réservé à Edward TOURET, Président, seul. Aucune diffusion ni transmission à des tiers en dehors des cas légaux (force publique, judiciaire).</div>' +
        '</div>' +

        '<p style="font-size: 8.5pt; margin-top: 1.5mm;">' +
          '<b>Finalités déclarées</b> (RGPD art. 6.1.f — intérêt légitime, test de proportionnalité L1121-1)&nbsp;: <b>(1)</b> Sécurité des biens et des personnes (caméra comptoir/caisse) · <b>(2)</b> Lutte contre le vol et les cambriolages · <b>(3)</b> Sécurité incendie & traçabilité HACCP (caméra cuisson — justification renforcée ci-dessous).' +
        '</p>' +

        // Encart spécifique caméra cuisson — bordage juridique
        '<div style="margin-top: 2mm; padding: 5px 9px; background: rgba(255,235,90,0.18); border-left: 3px solid #FFEB5A; font-size: 8pt; line-height: 1.4;">' +
          '<div style="font-family: \'Barlow Condensed\', sans-serif; font-weight: 700; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 1px; color: #191923; margin-bottom: 1px;">⚖ Justification proportionnée de la caméra du poste de cuisson</div>' +
          'La caméra installée au-dessus du poste de cuisson <b>n\'a pas pour objet la surveillance continue ' + g('du salarié', 'de la salariée') + '</b>. Elle est positionnée en plafond, axée sur <b>l\'équipement à risque</b> (friteuse, plancha, source de feu et d\'huile chaude) et répond à <b>trois finalités cumulatives proportionnées</b>&nbsp;:' +
          '<br/><b>(a) Sécurité incendie</b> — surveillance d\'un point chaud à risque élevé d\'incendie, conformément à l\'obligation générale de sécurité de l\'employeur (L4121-1) et aux articles R4227-37 à R4227-41 du Code du travail.' +
          '<br/><b>(b) Traçabilité HACCP</b> — preuve documentée du respect des protocoles d\'hygiène et des températures de cuisson en cas de contrôle DDPP, conformément aux <b>règlements (CE) 178/2002 et 852/2004</b> dits « paquet hygiène » qui imposent la traçabilité des points critiques.' +
          '<br/><b>(c) Sécurité des personnes</b> — détection rapide de brûlures, malaises, chutes ou accidents pour intervention immédiate.' +
          '<br/><b>Garanties spécifiques</b>&nbsp;: visionnage strictement <b>a posteriori</b> (jamais en direct), accès limité au seul Président, conservation 30 jours maximum, suppression automatique au-delà, pas d\'audio, pas de captation des conversations privées (recommandation CNIL).' +
          '<br/><b>Référence jurisprudentielle</b>&nbsp;: la Cour de cassation (Cass. Soc. 23 juin 2010 n° 09-66.355) admet la licéité de la vidéosurveillance d\'un poste de travail dès lors que ' + g('le salarié', 'la salariée') + ' est ' + g('informé', 'informée') + ' préalablement et que la finalité est légitime et proportionnée — ce qui est le cas ici.' +
        '</div>' +

        '<p style="font-size: 8.5pt; margin-top: 2mm;">' +
          '<b>Zones strictement non filmées</b>&nbsp;: sanitaires, vestiaire, espace de pause, voie publique. <b>Aucune caméra ne filme ' + g('un salarié', 'une salariée') + ' sur un poste de travail en surveillance continue à des fins de contrôle d\'activité.</b>' +
        '</p>' +

        '<p style="font-size: 8.5pt; margin-top: 1.5mm; line-height: 1.4;">' +
          '<b>Tes droits</b> (RGPD art. 15 à 22)&nbsp;: <b>accès</b> aux images te concernant, <b>rectification</b>, <b>effacement</b>, <b>limitation</b>, <b>opposition</b>. Demande motivée à edward@meshuga.fr — réponse sous 1 mois maximum (RGPD art. 12). <b>Réclamation</b>&nbsp;: <b>CNIL</b>, cnil.fr, 3 place de Fontenoy, 75007 Paris. <b>Affichage</b>&nbsp;: pictogramme caméra + mention informative à l\'entrée et en cuisine.' +
        '</p>' +

        '<h3 class="bc pink" style="margin-top: 2mm; font-size: 12pt;">Autres traitements de données personnelles</h3>' +
        '<div class="legal-box" style="padding: 5px 10px; margin: 1mm 0; font-size: 8pt;">' +
          '<div class="ref" style="font-size: 7.5pt; margin-bottom: 1px;">RGPD UE 2016/679 art. 13 · Code du travail D.1221-24</div>' +
          '<b>Responsable</b>&nbsp;: SAS AEGIA FOOD, représentée par Edward TOURET, Président — edward@meshuga.fr. <b>Finalités</b>&nbsp;: contrat de travail, paie, DPAE, déclarations URSSAF, suivi RH, médecine du travail, prévoyance. <b>Base légale</b>&nbsp;: contrat (art. 6.1.b RGPD) + obligations légales (art. 6.1.c). <b>Destinataires</b>&nbsp;: URSSAF, EFFICIENCE, Gan, expert-comptable. <b>Durée</b>&nbsp;: contrat + 5 ans après sortie (D.1221-24). <b>Tes droits</b>&nbsp;: accès, rectification, effacement, limitation, portabilité, opposition — edward@meshuga.fr · Réclamation CNIL.' +
        '</div>' +

      '</div>' +
    '</section>'

  // ===== PAGE 6 — ENGAGEMENT DE LECTURE & SIGNATURE =====
  var page6 =
    '<section class="chapter">' +
        '<div style="display: flex; align-items: baseline; justify-content: space-between;">' +
          '<h2 class="yt">Engagement & signatures</h2>' +
        '</div>' +
        '<div class="rule" style="margin: 2mm 0;"></div>' +

        '<h3 class="bc pink" style="font-size: 11pt;">Récépissé de remise des documents</h3>' +
        '<p style="font-size: 8.5pt; margin: 1mm 0;">' +
          'Je ' + g("soussigné", "soussignée") + ' <b>' + esc(nomComplet) + '</b> reconnais avoir reçu en main propre, à la date de signature ci-dessous&nbsp;:' +
        '</p>' +
        '<div style="margin-top: 1mm; font-size: 8.5pt; line-height: 1.5;">' +
          '<div><span class="cb">' + checkBox(false) + '</span>Le présent <b>dossier de bienvenue Meshuga</b> (6 pages dont engagement signé)</div>' +
          '<div><span class="cb">' + checkBox(false) + '</span>Mon <b>contrat de travail</b> signé en double exemplaire</div>' +
          '<div><span class="cb">' + checkBox(false) + '</span>Information sur la <b>convention collective</b> CCN 1501 et son lieu de consultation</div>' +
          '<div><span class="cb">' + checkBox(false) + '</span>Information sur la <b>vidéosurveillance</b> et mes droits RGPD</div>' +
          '<div><span class="cb">' + checkBox(false) + '</span>Information sur la <b>médecine du travail</b> (EFFICIENCE Vaugirard) et la VIP à venir</div>' +
          '<div style="opacity: 0.75;"><span class="cb">' + checkBox(false) + '</span><i>Notice <b>mutuelle / prévoyance Gan</b> — à remettre sous 30 jours, l\'employeur s\'y engage</i></div>' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 2mm; font-size: 11pt;">Sanctions disciplinaires</h3>' +
        '<div class="legal-box" style="padding: 4px 10px; margin: 1mm 0; font-size: 8pt;">' +
          '<div class="ref" style="font-size: 7.5pt; margin-bottom: 1px;">L1331-1, L1332-1 à L1332-5 et R4741-1 du Code du travail</div>' +
          'Tout manquement constitue une <b>faute</b> disciplinaire (entretien préalable + lettre motivée, prescription 2 mois). Selon la gravité&nbsp;: <b>avertissement</b>, <b>blâme</b>, <b>mise à pied</b>, <b>mutation/rétrogradation</b>, jusqu\'au <b>licenciement pour faute simple, grave ou lourde</b>.' +
        '</div>' +

        '<h3 class="bc pink" style="margin-top: 2mm; font-size: 11pt;">Engagement de lecture</h3>' +
        '<p style="font-size: 8.5pt; margin: 0;">' +
          'Je ' + g("soussigné", "soussignée") + ' <b>' + esc(nomComplet) + '</b>, en signant ce document, reconnais&nbsp;:' +
        '</p>' +
        '<ol style="margin: 1mm 0 1mm 16px; padding: 0; font-size: 8pt; line-height: 1.4;">' +
          '<li><b>avoir lu attentivement</b> le présent dossier dans son intégralité&nbsp;;</li>' +
          '<li><b>avoir compris</b> les règles d\'hygiène (HACCP, allergènes, marche en avant), les consignes de sécurité (EPI, incendie, droit de retrait), le cadre social (CCN 1501, harcèlement, non-discrimination, vidéosurveillance, RGPD) et le régime disciplinaire&nbsp;;</li>' +
          '<li>avoir été ' + g("informé", "informée") + ' des canaux d\'alerte (référent harcèlement, inspection, médecine, défenseur des droits) et de mes <b>droits</b> (DUERP, CCN, CNIL, retrait, RGPD)&nbsp;;</li>' +
          '<li><b>m\'engager</b> à respecter rigoureusement ces règles et à signaler immédiatement à l\'employeur tout manquement, danger ou situation problématique&nbsp;;</li>' +
          '<li>accepter sans réserve la <b>mise sous vidéosurveillance</b> de l\'établissement aux finalités déclarées (sécurité, lutte contre le vol, traçabilité HACCP) et reconnaître avoir été ' + g("informé", "informée") + ' préalablement (L1222-4 Code du travail · art. 13 RGPD).</li>' +
        '</ol>' +

        // ===== 2 BEAUX BLOCS SIGNATURES =====
        '<div class="sig-block" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 10mm;">' +
          // Bloc gauche : Le/La salarié·e (rose Meshuga)
          '<div style="border: 2.5px solid #FF82D7; border-radius: 6px; padding: 4mm; background: rgba(255,130,215,0.04); position: relative;">' +
            '<div style="position: absolute; top: -3mm; left: 4mm; background: #FFFFFF; padding: 0 5px; font-family: Yellowtail, cursive; color: #FF82D7; font-size: 16pt; line-height: 1;">' + g("Le salarié", "La salariée") + '</div>' +
            '<div style="display: grid; grid-template-columns: auto 1fr; gap: 1mm 4mm; font-size: 8pt; margin-top: 1mm;">' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm;">Date</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 4mm;"></div>' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm;">Lieu</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 4mm;">Paris</div>' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm; grid-column: 1 / 3; font-size: 7.5pt;">Mention manuscrite&nbsp;: «&nbsp;<span style="color: #FF82D7;">' + 'Lu et approuvé' + '</span>&nbsp;»</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 5mm; grid-column: 1 / 3;"></div>' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm; grid-column: 1 / 3;">Signature ' + g('du salarié', 'de la salariée') + '</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 14mm; grid-column: 1 / 3;"></div>' +
            '</div>' +
            '<div style="margin-top: 2mm; font-family: Barlow Condensed, sans-serif; font-weight: 700; font-size: 8.5pt; text-align: center;">' + esc(nomComplet) + '</div>' +
          '</div>' +
          // Bloc droit : L'employeur (noir charbon)
          '<div style="border: 2.5px solid #191923; border-radius: 6px; padding: 4mm; background: rgba(25,25,35,0.025); position: relative;">' +
            '<div style="position: absolute; top: -3mm; left: 4mm; background: #FFFFFF; padding: 0 5px; font-family: Yellowtail, cursive; color: #191923; font-size: 16pt; line-height: 1;">L\'employeur</div>' +
            '<div style="display: grid; grid-template-columns: auto 1fr; gap: 1mm 4mm; font-size: 8pt; margin-top: 1mm;">' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm;">Date</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 4mm;">' + '</div>' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm;">Lieu</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 4mm;">Paris</div>' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm; grid-column: 1 / 3; font-size: 7.5pt;">Mention manuscrite&nbsp;: «&nbsp;<span style="color: #191923;">Lu et approuvé</span>&nbsp;»</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 5mm; grid-column: 1 / 3;"></div>' +
              '<div style="font-family: Barlow Condensed, sans-serif; font-weight: 700; text-transform: uppercase; opacity: 0.65; letter-spacing: 1px; padding-top: 0.5mm; grid-column: 1 / 3;">Signature & cachet</div>' +
              '<div style="border-bottom: 1px solid #191923; min-height: 14mm; grid-column: 1 / 3;"></div>' +
            '</div>' +
            '<div style="margin-top: 2mm; font-family: Barlow Condensed, sans-serif; font-weight: 700; font-size: 8.5pt; text-align: center;">Edward TOURET</div>' +
            '<div style="font-family: Barlow Condensed, sans-serif; font-size: 7pt; text-align: center; opacity: 0.7; letter-spacing: 0.5px;">Président · SAS AEGIA FOOD</div>' +
          '</div>' +
        '</div>' +

        '<p style="margin-top: 2mm; font-size: 7pt; opacity: 0.55; font-style: italic; line-height: 1.3; text-align: center;">' +
          'Document signé en double exemplaire, dont un remis ' + g("au salarié", "à la salariée") + '. Conservé dans le dossier RH pendant toute la durée du contrat et 5 ans après sortie effective (article D.1221-24 du Code du travail).' +
        '</p>' +

      '</div>' +
      '</section>'

  // ===== ASSEMBLAGE FINAL =====
  var html =
    '<!DOCTYPE html>' +
    '<html lang="fr">' +
    '<head>' +
      '<meta charset="utf-8" />' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />' +
      '<title>Dossier de bienvenue Meshuga — ' + esc(nomComplet) + '</title>' +
      '<style>' + styles + '</style>' +
    '</head>' +
    '<body>' +
      page1 +
      '<main class=\"flow\">' +
        page2 +
        page3 +
        page4 +
        page5 +
        page5b +
        page6 +
      '</main>' +
    '</body>' +
    '</html>'

  return html
}
