// Builder du template HTML pour un avenant
// Réutilise les blocs partagés de contractBuilders.tsx (CSS, header, wrap)
// Signatures custom : utilise amendment.signature_date (pas contract.date_signature du contrat initial)
//
// 🔥 Sprint Y1 — Signature électronique custom :
//   buildAvenant accepte un paramètre optionnel `employerSig` (EmployerSignature | null)
//   - Si fourni → bloc signature Edward stylisé + cartouche audit
//   - Si null/absent → fallback bloc "cachet · SAS AEGIA" classique
//   → 100% rétro-compatible avec les appels existants

import { esc, buildSharedHeader, buildSharedCss, wrapHtml, getInitials, buildParaphFooter } from "./contractBuilders"
import { renderEmployerSignatureBlock, renderEmployeeSignatureBlockEmpty } from "./employerSignature"
import type { EmployerSignature } from "./employerSignature"

// Format date FR long ("vendredi 22 mai 2026")
function fmtDateFR(d: any) {
  if (!d) return "—"
  var dt = new Date(String(d).slice(0, 10) + 'T12:00:00')
  if (isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

// 🔥 Signatures spéciales pour l'avenant : utilise la date de signature de l'AVENANT
// (pas celle du contrat initial)
// Si signatureDate est vide/null/undefined → fallback sur la date du jour (jour d'impression)
// employerSig (optionnel) → injecte la signature pré-enregistrée d'Edward
function buildAvenantSignatures(contract: any, emp: any, signatureDate: string, salarieRole: string, employerSig?: EmployerSignature | null): string {
  var civilite = emp.civilite || "Madame"
  var feminin = (civilite === "Madame" || civilite === "Mademoiselle")
  
  // 🔥 Fallback : si pas de signature_date, utiliser la date du jour
  var effectiveSigDate = signatureDate || new Date().toISOString().slice(0, 10)
  var dateSig = new Date(String(effectiveSigDate).slice(0, 10) + 'T12:00:00').toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
  var ville = contract.ville_signature || "Paris"

  // 🔥 Bloc signature Employeur via helper (rétro-compatible)
  var employerBlock = renderEmployerSignatureBlock(employerSig || null)

  // Bloc signature Salarié : zone vide
  var employeeBlock = renderEmployeeSignatureBlockEmpty(emp.prenom || "", emp.nom || "", salarieRole, feminin)

  return ''
    + '<section class="sig-section">'
    + '<h2 class="yt">Signatures</h2>'
    + '<div class="rule"></div>'
    + '<div class="fait-banner">Fait à <strong>' + esc(ville) + '</strong>, en deux exemplaires originaux dont un remis à chacune des Parties, le <strong>' + esc(dateSig) + '</strong>.<span class="small">Chaque page doit être paraphée par les deux Parties.</span></div>'
    + '<div class="sig-grid">'
    + '<div class="sig-block">'
    + '<div class="sig-head">Pour l\'Employeur</div>'
    + employerBlock
    + '</div>'
    + '<div class="sig-block">'
    + employeeBlock
    + '</div>'
    + '</div></section>'
    + '</div></body></html>'
}

function fmtDateShortFR(d: any) {
  if (!d) return "—"
  var dt = new Date(d)
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function amountInWords(n: any) {
  if (n == null || isNaN(Number(n))) return "—"
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " euros bruts"
}

// 🔥 Table des vacations (planning) - identique au format de buildExtraContract
function buildPlanningTable(vacs: any[]) {
  if (!vacs || vacs.length === 0) return ""
  var totalMin = 0
  vacs.forEach(function (v: any) {
    // Calcul de la durée si pas déjà calculée (cas des nouvelles vacations du payload)
    var d = v.duree_minutes
    if (d == null && v.heure_debut && v.heure_fin) {
      var hd = v.heure_debut.split(':')
      var hf = v.heure_fin.split(':')
      var minDebut = parseInt(hd[0], 10) * 60 + parseInt(hd[1], 10)
      var minFin = parseInt(hf[0], 10) * 60 + parseInt(hf[1], 10)
      d = minFin >= minDebut ? (minFin - minDebut) : (minFin - minDebut + 1440)
    }
    totalMin += (d || 0)
  })
  var planningRows = vacs.map(function (v: any) {
    var d = v.duree_minutes
    if (d == null && v.heure_debut && v.heure_fin) {
      var hd = v.heure_debut.split(':')
      var hf = v.heure_fin.split(':')
      var minDebut = parseInt(hd[0], 10) * 60 + parseInt(hd[1], 10)
      var minFin = parseInt(hf[0], 10) * 60 + parseInt(hf[1], 10)
      d = minFin >= minDebut ? (minFin - minDebut) : (minFin - minDebut + 1440)
    }
    var dur = d || 0
    var h = Math.floor(dur / 60), m = dur % 60
    var dt = new Date(v.date_vacation)
    var dateStr = dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    return '<tr><td>' + esc(dateStr) + '</td><td style="text-align:center">' + esc((v.heure_debut || "").toString().slice(0, 5)) + '</td><td style="text-align:center">' + esc((v.heure_fin || "").toString().slice(0, 5)) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + h + ' h ' + (m < 10 ? "0" : "") + m + '</td></tr>'
  }).join("")
  var totalH = Math.floor(totalMin / 60), totalM = totalMin % 60
  return '<table class="planning" style="margin:14px 0;"><thead><tr><th>Date</th><th>Début</th><th>Fin</th><th>Durée</th></tr></thead><tbody>' + planningRows + '</tbody><tfoot><tr><td colspan="3" style="text-align:right;font-weight:900">Total :</td><td style="text-align:center;font-weight:900;color:#C2185B">' + totalH + ' h ' + (totalM < 10 ? "0" : "") + totalM + '</td></tr></tfoot></table>'
}

/**
 * Construit le HTML d'un avenant
 * 
 * @param amendment - { amendment_number, amendment_type, effective_date, motif, created_at }
 * @param contract  - hr_contracts row (avec valeurs APRÈS modification)
 * @param emp       - hr_employees row
 * @param vacs      - vacations (existantes + nouvelles selon le cas)
 * @param logoUri   - logo data URI
 * @param previousValues - valeurs AVANT modification (pour diff avant/après)
 * @param employerSig    - 🔥 Sprint Y1 : signature électronique pré-enregistrée d'Edward (optionnel)
 */
export function buildAvenant(amendment: any, contract: any, emp: any, vacs: any[], logoUri: string, previousValues: any, employerSig?: EmployerSignature | null) {
  var prev = previousValues || {}
  var safeVacs = vacs || []
  var amendmentNumStr = "N°" + (amendment.amendment_number || 1)
  
  var contractTypeLabel = "Contrat de travail"
  if (contract.type === "extra") contractTypeLabel = "Contrat de travail d'extra (CDD d'usage)"
  else if (contract.type === "cdi_cadre") contractTypeLabel = "Contrat de travail à durée indéterminée (Cadre)"
  else if (contract.type === "cdi_agent_maitrise") contractTypeLabel = "Contrat de travail à durée indéterminée (Agent de maîtrise)"
  else if (contract.type === "cdi_cuisinier") contractTypeLabel = "Contrat de travail à durée indéterminée (Cuisinier)"
  else if (contract.type === "cdi_caissier") contractTypeLabel = "Contrat de travail à durée indéterminée (Caissier/ère)"
  
  var contractDate = contract.date_signature || contract.date_debut
  var contractDateStr = fmtDateShortFR(contractDate)
  
  var titleByType: any = {
    prolongation_duree: "Prolongation de la durée du contrat",
    augmentation_salaire: "Modification de la rémunération",
    modification_horaires: "Modification de la durée du travail",
    changement_poste: "Modification des fonctions",
    regularisation_welcome_pack: "Mise en conformité réglementaire & dossier de bienvenue",
    autre: "Modification contractuelle"
  }
  var sousTitre = titleByType[amendment.amendment_type] || "Modification contractuelle"
  var isExtra = contract.type === "extra"
  
  var header = buildSharedHeader({
    emp: emp,
    titreCover: "AVENANT " + amendmentNumStr,
    sousTitreCover: sousTitre + " · " + contractTypeLabel,
    typeBandeau: "AVENANT " + amendmentNumStr,
    logoUri: logoUri
  })
  
  // ============================================================
  // PRÉAMBULE COMMUN
  // ============================================================
  var preambule = ''
    + '<div class="art"><span class="art-num">Préambule.</span><span class="art-title">Rappel du contrat initial</span></div>'
    + '<div class="body">'
    + '<p>Le présent avenant fait suite au <strong>' + esc(contractTypeLabel) + '</strong> conclu entre les soussignés en date du <strong>' + esc(contractDateStr) + '</strong>.</p>'
    + '<p>Il porte le numéro <strong>' + esc(amendmentNumStr) + '</strong> dans la séquence des avenants à ce contrat.</p>'
    + '</div>'
  
  // ============================================================
  // ARTICLES DYNAMIQUES selon le type
  // ============================================================
  var articles = ''
  var artCounter = 1
  
  if (amendment.amendment_type === "prolongation_duree") {
    var dateFinAvant = prev.date_fin ? fmtDateFR(prev.date_fin) : "—"
    var dateFinApres = contract.date_fin ? fmtDateFR(contract.date_fin) : "—"
    var dateDebut = contract.date_debut ? fmtDateFR(contract.date_debut) : "—"
    
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Objet de l\'avenant : prolongation de la durée du contrat</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent expressément, par le présent avenant, de <strong>prolonger la durée</strong> du contrat de travail.</p>'
      + '<p>La date de fin initialement prévue le <strong>' + esc(dateFinAvant) + '</strong> est <strong>reportée au ' + esc(dateFinApres) + '</strong>.</p>'
      + '<p>Le contrat se poursuit aux conditions précédemment fixées, sans interruption, du <strong>' + esc(dateDebut) + '</strong> au <strong>' + esc(dateFinApres) + '</strong>.</p>'
      + (amendment.motif ? ('<p style="background:#FFF9E5;padding:10px 14px;border-left:3px solid #FFEB5A;margin:10px 0;"><em><strong>Motif :</strong> ' + esc(amendment.motif) + '</em></p>') : '')
      + '</div>'
    artCounter++
    
    // 🔥 Pour Extra : planning complet à jour
    if (isExtra && safeVacs.length > 0) {
      articles += ''
        + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Planning complet des vacations</span></div>'
        + '<div class="body">'
        + '<p>Le planning des vacations sur l\'ensemble de la durée prolongée est le suivant :</p>'
        + buildPlanningTable(safeVacs)
        + '</div>'
      artCounter++
    }
  } 
  else if (amendment.amendment_type === "augmentation_salaire") {
    var salAvant = prev.salaire_brut_mensuel != null ? amountInWords(prev.salaire_brut_mensuel) : "—"
    var salApres = contract.salaire_brut_mensuel != null ? amountInWords(contract.salaire_brut_mensuel) : "—"
    var tauxAvant = prev.taux_horaire_brut != null ? Number(prev.taux_horaire_brut).toFixed(2) + " €" : null
    var tauxApres = contract.taux_horaire_brut != null ? Number(contract.taux_horaire_brut).toFixed(2) + " €" : null
    var effDate = fmtDateFR(amendment.effective_date)
    
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Objet de l\'avenant : modification de la rémunération</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent, par le présent avenant et à compter du <strong>' + esc(effDate) + '</strong>, de modifier la rémunération du/de la Salarié(e) comme suit :</p>'
      + '<table class="planning" style="margin:14px 0;">'
      + '<thead><tr><th>Élément</th><th>Avant</th><th>Après</th></tr></thead>'
      + '<tbody>'
      + (contract.salaire_brut_mensuel != null && (prev.salaire_brut_mensuel != null || contract.salaire_brut_mensuel != null)
          ? ('<tr><td>Salaire brut mensuel</td><td style="text-align:center">' + esc(salAvant) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(salApres) + '</td></tr>')
          : '')
      + (tauxApres
          ? ('<tr><td>Taux horaire brut</td><td style="text-align:center">' + esc(tauxAvant || "—") + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(tauxApres) + '</td></tr>')
          : '')
      + '</tbody></table>'
      + (amendment.motif ? ('<p style="background:#FFF9E5;padding:10px 14px;border-left:3px solid #FFEB5A;margin:10px 0;"><em><strong>Motif :</strong> ' + esc(amendment.motif) + '</em></p>') : '')
      + '</div>'
    artCounter++
  }
  else if (amendment.amendment_type === "modification_horaires") {
    var heuresAvant = prev.heures_hebdo != null ? Number(prev.heures_hebdo).toString() + " heures" : "—"
    var heuresApres = contract.heures_hebdo != null ? Number(contract.heures_hebdo).toString() + " heures" : "—"
    var mensAvant = prev.heures_mensuelles != null ? Number(prev.heures_mensuelles).toString() + " heures" : null
    var mensApres = contract.heures_mensuelles != null ? Number(contract.heures_mensuelles).toString() + " heures" : null
    var effDateH = fmtDateFR(amendment.effective_date)
    
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Objet de l\'avenant : modification de la durée du travail</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent, par le présent avenant et à compter du <strong>' + esc(effDateH) + '</strong>, de modifier la durée hebdomadaire de travail du/de la Salarié(e) comme suit :</p>'
      + (!isExtra ? (
          '<table class="planning" style="margin:14px 0;">'
          + '<thead><tr><th>Élément</th><th>Avant</th><th>Après</th></tr></thead>'
          + '<tbody>'
          + (contract.heures_hebdo != null
              ? ('<tr><td>Durée hebdomadaire</td><td style="text-align:center">' + esc(heuresAvant) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(heuresApres) + '</td></tr>')
              : '')
          + (mensApres
              ? ('<tr><td>Durée mensuelle</td><td style="text-align:center">' + esc(mensAvant || "—") + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(mensApres) + '</td></tr>')
              : '')
          + '</tbody></table>'
        ) : '')
      + (amendment.motif ? ('<p style="background:#FFF9E5;padding:10px 14px;border-left:3px solid #FFEB5A;margin:10px 0;"><em><strong>Motif :</strong> ' + esc(amendment.motif) + '</em></p>') : '')
      + (!isExtra ? '<p>La rémunération sera ajustée au prorata de cette nouvelle durée si applicable.</p>' : '')
      + '</div>'
    artCounter++
    
    // 🔥 Pour Extra : nouveau planning
    if (isExtra && safeVacs.length > 0) {
      articles += ''
        + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Nouveau planning des vacations</span></div>'
        + '<div class="body">'
        + buildPlanningTable(safeVacs)
        + '</div>'
      artCounter++
    }
  }
  else if (amendment.amendment_type === "changement_poste") {
    var fonctionAvant = prev.fonction || "—"
    var fonctionApres = contract.fonction || "—"
    var effDateP = fmtDateFR(amendment.effective_date)
    
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Objet de l\'avenant : modification des fonctions et missions</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent, par le présent avenant et à compter du <strong>' + esc(effDateP) + '</strong>, de modifier les fonctions et missions du/de la Salarié(e) comme suit :</p>'
      + '<table class="planning" style="margin:14px 0;">'
      + '<thead><tr><th>Élément</th><th>Avant</th><th>Après</th></tr></thead>'
      + '<tbody>'
      + '<tr><td>Fonction</td><td style="text-align:center">' + esc(fonctionAvant) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(fonctionApres) + '</td></tr>'
      + (prev.classification || contract.classification
          ? ('<tr><td>Classification</td><td style="text-align:center">' + esc(prev.classification || "—") + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(contract.classification || "—") + '</td></tr>')
          : '')
      + '</tbody></table>'
      + (amendment.motif ? ('<p style="background:#FFF9E5;padding:10px 14px;border-left:3px solid #FFEB5A;margin:10px 0;"><em><strong>Motif / précisions :</strong> ' + esc(amendment.motif) + '</em></p>') : '')
      + '</div>'
    artCounter++
  }
  else if (amendment.amendment_type === "regularisation_welcome_pack") {
    // ============================================================
    // 🆕 AVENANT DE RÉGULARISATION — MISE EN CONFORMITÉ
    // ============================================================
    // Type d'avenant créé pour mettre à jour les contrats des salariés
    // existants (Emy, Darell, Esther, Sivanathan, Partheepan) avec :
    //  - le Dossier de bienvenue Meshuga (annexé)
    //  - la règle anti-accumulation des congés payés
    //  - l'acceptation explicite vidéosurveillance + RGPD
    //  - la politique anti-harcèlement
    //  - la clause de confidentialité basique
    //  - la tenue de travail
    // Le contrat initial reste intégralement en vigueur — l'avenant
    // ne fait QU'AJOUTER des clauses, jamais modifier les existantes.
    // ============================================================
    var effDateR = fmtDateFR(amendment.effective_date)
    
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Objet de l\'avenant : mise en conformité réglementaire</span></div>'
      + '<div class="body">'
      + '<p>Le présent avenant a pour <strong>seul objet la mise en conformité du contrat de travail</strong> avec les évolutions réglementaires et les règles internes en vigueur chez Meshuga.</p>'
      + '<p>Il <strong>complète</strong> le contrat initial sans en modifier les clauses essentielles (rémunération, durée, fonction, lieu de travail), qui restent inchangées.</p>'
      + '<p>Il prend effet à compter du <strong>' + esc(effDateR) + '</strong>.</p>'
      + '</div>'
    artCounter++

    // ARTICLE 2 — DOSSIER DE BIENVENUE
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Reconnaissance du Dossier de bienvenue Meshuga</span></div>'
      + '<div class="body">'
      + '<p>Le/La Salarié(e) reconnaît avoir reçu, lu et compris le <strong>Dossier de bienvenue Meshuga</strong> annexé au présent avenant.</p>'
      + '<p>Ce dossier de bienvenue, comportant <strong>13 pages</strong>, présente l\'ensemble des règles applicables au sein de l\'entreprise : durée du travail, rémunération, congés payés, hygiène, sécurité, vidéosurveillance, RGPD, charte numérique, tenue, comportement et engagement.</p>'
      + '<p><strong>Le Dossier de bienvenue forme partie intégrante du présent avenant</strong> et fait foi en cas de litige sur les règles internes applicables.</p>'
      + '</div>'
    artCounter++

    // ARTICLE 3 — CONGÉS PAYÉS (LA GROSSE PIÈCE)
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Règles relatives aux congés payés</span></div>'
      + '<div class="body">'
      + '<p><strong>(a) Acquisition.</strong> Le/La Salarié(e) acquiert <strong>2,5 jours ouvrables de congés payés par mois de travail effectif</strong> (30 jours ouvrables / 5 semaines par an), conformément à l\'article L3141-3 du Code du travail.</p>'
      + '<p><strong>(b) Période de référence et de prise.</strong></p>'
      + '<ul style="margin: 6px 0 10px 20px; padding: 0;">'
      +   '<li>Période de référence (acquisition) : <strong>du 1er juin N au 31 mai N+1</strong>.</li>'
      +   '<li>Période de prise (utilisation) : <strong>du 1er juin N+1 au 31 mai N+2</strong>.</li>'
      + '</ul>'
      + '<p><strong>(c) Obligation de prise et étalement.</strong> Le/La Salarié(e) s\'engage à <strong>poser et prendre effectivement ses congés payés sur la période de prise</strong>, de manière <strong>étalée tout au long de l\'année</strong> et dans le respect des nécessités de service. Le cumul excessif de jours non posés est expressément <strong>contraire aux règles internes Meshuga</strong>.</p>'
      + '<p><strong>(d) Délai de prévenance.</strong> Toute demande de congé doit être adressée à l\'employeur <strong>au moins un (1) mois avant la date souhaitée</strong> (sauf urgence justifiée). L\'employeur répond sous 8 jours.</p>'
      + '<p><strong>(e) Validation employeur.</strong> L\'employeur conserve, dans l\'intérêt du service, le droit de refuser, déplacer ou modifier une demande, par décision motivée. L\'ordre des départs tient compte de l\'ancienneté, des charges de famille et des contraintes des conjoints, conformément à l\'article L3141-15 du Code du travail.</p>'
      + '<p><strong>(f) Conséquences en cas de non-prise au 31 mai.</strong> Les congés non posés à l\'issue de la période de prise sont, en principe, <strong>définitivement perdus</strong>. Cette perte n\'est pas opposable au/à la Salarié(e) dans les cas suivants&nbsp;: arrêt maladie, accident du travail, maladie professionnelle (loi DDADUE n° 2024-364 du 22 avril 2024), congé maternité, paternité, adoption, parental, ou impossibilité résultant du fait de l\'employeur.</p>'
      + '<p><strong>(g) Obligation d\'information de l\'employeur.</strong> Conformément à la jurisprudence de la Cour de cassation (Cass. Soc. 13 novembre 2025 n° 24-14084, Cass. Soc. 10 septembre 2025 n° 23-22732), l\'employeur s\'engage à informer le/la Salarié(e) :</p>'
      + '<ul style="margin: 6px 0 10px 20px; padding: 0;">'
      +   '<li>du solde de congés sur <strong>chaque bulletin de paie mensuel</strong>&nbsp;;</li>'
      +   '<li>par <strong>email avec accusé chaque 1er avril</strong> si son solde excède 5 jours, avec rappel de la date limite du 31 mai&nbsp;;</li>'
      +   '<li>en cas de retour d\'arrêt long, dans le mois suivant la reprise, de son solde et de la date limite de report.</li>'
      + '</ul>'
      + '<p><strong>(h) Indemnité compensatrice.</strong> En cas de rupture du contrat, une indemnité compensatrice est versée pour les congés acquis non pris, conformément à l\'article L3141-28 du Code du travail.</p>'
      + '</div>'
    artCounter++

    // ARTICLE 4 — VIDÉOSURVEILLANCE & RGPD
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Acceptation de la vidéosurveillance et information RGPD</span></div>'
      + '<div class="body">'
      + '<p>Le/La Salarié(e) reconnaît avoir été <strong>informé(e) préalablement et individuellement</strong>, par le Dossier de bienvenue annexé, de la mise en place du dispositif de vidéosurveillance dans l\'établissement Meshuga (3 rue Vavin, 75006 Paris), conformément aux articles L1121-1 et L1222-4 du Code du travail et à l\'article 13 du RGPD.</p>'
      + '<p>Le/La Salarié(e) reconnaît avoir pris connaissance des <strong>finalités déclarées</strong> du dispositif (sécurité des biens et personnes, lutte contre le vol, traçabilité HACCP), des <strong>caractéristiques techniques</strong> (2 caméras, conservation locale 30 jours maximum, pas de visionnage temps réel) et de ses <strong>droits RGPD</strong> (accès, rectification, effacement, opposition, réclamation CNIL).</p>'
      + '<p>Le/La Salarié(e) accepte ce dispositif et reconnaît qu\'il ne porte pas une atteinte disproportionnée à sa vie privée, eu égard aux finalités légitimes poursuivies et aux garanties mises en place.</p>'
      + '</div>'
    artCounter++

    // ARTICLE 5 — POLITIQUE ANTI-HARCÈLEMENT
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Politique anti-harcèlement et anti-discrimination</span></div>'
      + '<div class="body">'
      + '<p>Le/La Salarié(e) reconnaît avoir été informé(e) de la <strong>politique de tolérance zéro</strong> appliquée chez Meshuga en matière de harcèlement moral, harcèlement sexuel, agissements sexistes et discrimination, conformément aux articles L1152-1 et suivants, L1153-1 et suivants, et L1132-1 du Code du travail.</p>'
      + '<p><strong>Référent harcèlement Meshuga</strong>&nbsp;: <strong>Edward TOURET</strong>, Président SAS AEGIA FOOD — edward@meshuga.fr — 06 58 58 58 01.</p>'
      + '<p>Le/La Salarié(e) s\'engage à signaler tout fait dont il/elle serait témoin ou victime, dans l\'esprit de protection mutuelle des membres de l\'équipe. Il/Elle est informé(e) de la <strong>protection contre toute sanction</strong> en cas de signalement de bonne foi (article L1152-2 du Code du travail).</p>'
      + '</div>'
    artCounter++

    // ARTICLE 6 — TENUE DE TRAVAIL
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Tenue de travail et temps d\'habillage</span></div>'
      + '<div class="body">'
      + '<p>L\'employeur fournit gratuitement au/à la Salarié(e) l\'<strong>uniforme Meshuga complet</strong> (haut, bas, tablier, charlotte, chaussures de sécurité antidérapantes), conformément aux articles R4321-4 du Code du travail et au Règlement (CE) 852/2004 (paquet hygiène).</p>'
      + '<p>Le port intégral de l\'uniforme est <strong>obligatoire pendant tout le service</strong>. Tout équipement endommagé est remplacé gratuitement.</p>'
      + '<p>Le <strong>temps d\'habillage et de déshabillage</strong> en uniforme est compris dans le temps de travail effectif à hauteur de 5 minutes au début et 5 minutes à la fin de chaque service, conformément à l\'article L3121-3 du Code du travail.</p>'
      + '</div>'
    artCounter++

    // 🔥 NOUVEL ARTICLE — HYGIÈNE HACCP & RELEVÉS OBLIGATOIRES
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Respect des protocoles HACCP et relevés obligatoires</span></div>'
      + '<div class="body">'
      + '<p>Le/La Salarié(e) reconnaît avoir pris connaissance du <strong>Plan de Maîtrise Sanitaire (PMS) Meshuga</strong>, consultable dans le classeur récapitulatif présent au restaurant, et s\'engage à en respecter strictement chaque protocole.</p>'
      + '<p><strong>(a) Relevés obligatoires de températures (fiche F1).</strong> Le/La Salarié(e) effectue, <strong>deux fois par jour minimum (matin et soir)</strong>, le relevé des températures suivantes&nbsp;: <strong>armoire froide ≤ 4 °C</strong>, <strong>congélateur ≤ -18 °C</strong>, <strong>plats chauds en distribution ≥ 63 °C</strong>. Ces relevés sont datés, signés et archivés.</p>'
      + '<p><strong>(b) Autres fiches HACCP obligatoires.</strong> Le/La Salarié(e) renseigne également à chaque service&nbsp;:</p>'
      + '<ul style="margin: 6px 0 10px 20px; padding: 0;">'
      +   '<li><strong>Fiche F2 — Réception marchandises</strong> : à chaque livraison (fournisseur, date, température produit, conformité visuelle)&nbsp;;</li>'
      +   '<li><strong>Fiche F3 — Huiles de friture</strong> : contrôle visuel quotidien, vidange selon usage&nbsp;;</li>'
      +   '<li><strong>Fiche F6 — Nettoyage matériel</strong> : émargement après nettoyage plancha, friteuse, plan de travail, vaisselle&nbsp;;</li>'
      +   '<li><strong>Fiche F7 — Nettoyage locaux</strong> : sols, sanitaires, vitrines, 1× / jour minimum&nbsp;;</li>'
      +   '<li><strong>Fiche F8 — Traçabilité produits</strong> : étiquetage de tout produit ouvert avec date d\'ouverture et DLC secondaire.</li>'
      + '</ul>'
      + '<p><strong>(c) Règles d\'hygiène individuelle.</strong> Le/La Salarié(e) s\'engage à respecter en permanence les règles d\'hygiène applicables au secteur de la restauration&nbsp;: lavage des mains (arrivée, après pause, après toilettes, après contact cru/déchets), <strong>tenue complète</strong> (uniforme, charlotte, gants nitrile, chaussures de sécurité), pas de bijoux/ongles longs/vernis/téléphone sur le plan de travail, <strong>marche en avant</strong> (crus → préparation → cuisson → distribution).</p>'
      + '<p><strong>(d) Sanctions et conformité.</strong> Conformément aux <strong>Règlements (CE) 178/2002 et 852/2004</strong> dits « paquet hygiène » et à l\'<strong>arrêté du 21 décembre 2009</strong>, le non-renseignement systématique des fiches obligatoires expose l\'établissement à des sanctions DDPP pouvant aller jusqu\'à la <strong>fermeture administrative</strong>. Tout manquement individuel répété pourra faire l\'objet d\'une procédure disciplinaire en application des articles L1331-1 et L1332-1 à L1332-5 du Code du travail.</p>'
      + '<p><strong>(e) Formation HACCP.</strong> L\'employeur assure que l\'établissement compte en permanence au moins un membre du personnel ayant suivi la <strong>formation hygiène alimentaire HACCP</strong> conformément au décret n° 2011-731 du 24 juin 2011. La formation peut être proposée au/à la Salarié(e) selon les besoins du service.</p>'
      + '</div>'
    artCounter++

    // ARTICLE 7 — CONFIDENTIALITÉ
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Obligation de confidentialité et de loyauté</span></div>'
      + '<div class="body">'
      + '<p>Le/La Salarié(e) s\'engage, pendant la durée de son contrat et après sa rupture, à <strong>ne pas divulguer à des tiers ni utiliser à des fins personnelles ou concurrentielles</strong> les informations confidentielles dont il/elle aurait connaissance dans le cadre de son activité, notamment&nbsp;: <strong>recettes Meshuga, identité et conditions tarifaires des fournisseurs, chiffres d\'affaires, listes clients B2B, données salariés, plans stratégiques, processus internes</strong>.</p>'
      + '<p>Cette obligation découle de l\'<strong>obligation générale de loyauté du salarié</strong> (article L1222-1 du Code du travail) et constitue un <strong>élément essentiel du présent avenant</strong>. Toute violation pourra engager la responsabilité civile et, le cas échéant, pénale du/de la Salarié(e).</p>'
      + '<p>Cette clause de confidentialité ne constitue <strong>pas une clause de non-concurrence</strong> et n\'empêche pas le/la Salarié(e) d\'exercer une activité professionnelle similaire après la rupture du contrat.</p>'
      + '</div>'
    artCounter++

    // ARTICLE 8 — CHARTE NUMÉRIQUE
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Charte numérique et droit à la déconnexion</span></div>'
      + '<div class="body">'
      + '<p>Le/La Salarié(e) reconnaît avoir pris connaissance de la <strong>Charte numérique Meshuga</strong> figurant dans le Dossier de bienvenue annexé&nbsp;: règles d\'usage du téléphone personnel pendant le service (autorisé en pause uniquement), confidentialité des réseaux sociaux, sécurité des outils numériques.</p>'
      + '<p>Le/La Salarié(e) est informé(e) de son <strong>droit absolu à la déconnexion</strong> en dehors de ses heures de travail, conformément à l\'article L2242-17, 7° du Code du travail. Aucune sanction ne pourra être prise au motif que le/la Salarié(e) n\'aurait pas répondu à une sollicitation hors temps de travail.</p>'
      + '</div>'
    artCounter++
  }
  else {
    // autre
    var effDateA = fmtDateFR(amendment.effective_date)
    articles += ''
      + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Objet de l\'avenant</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent, par le présent avenant et à compter du <strong>' + esc(effDateA) + '</strong>, de la modification suivante du contrat de travail :</p>'
      + (amendment.motif ? ('<p style="background:#FFF9E5;padding:10px 14px;border-left:3px solid #FFEB5A;margin:10px 0;">' + esc(amendment.motif) + '</p>') : '<p>—</p>')
      + '</div>'
    artCounter++
  }
  
  // ============================================================
  // MAINTIEN DES AUTRES CLAUSES
  // ============================================================
  articles += ''
    + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Maintien des autres clauses</span></div>'
    + '<div class="body">'
    + '<p><strong>Toutes les autres clauses et conditions du contrat initial, non modifiées par le présent avenant, demeurent inchangées et conservent leur plein effet.</strong></p>'
    + '</div>'
  artCounter++
  
  // ============================================================
  // ENTRÉE EN VIGUEUR
  // ============================================================
  articles += ''
    + '<div class="art"><span class="art-num">Article ' + artCounter + '.</span><span class="art-title">Entrée en vigueur</span></div>'
    + '<div class="body">'
    + '<p>Le présent avenant prend effet à compter du <strong>' + esc(fmtDateFR(amendment.effective_date)) + '</strong>.</p>'
    + '<p>Il est établi en deux exemplaires originaux, un pour chacune des Parties.</p>'
    + '</div>'
  
  var body = preambule + articles
  
  // 🔥 Signatures custom : utilise la date de signature de L'AVENANT (pas du contrat initial)
  // amendment.signature_date est ajouté par le modal et l'API
  // employerSig (optionnel) injecte la signature pré-enregistrée d'Edward
  var signatures = buildAvenantSignatures(contract, emp, amendment.signature_date, contract.fonction || "", employerSig || null)
  
  // 🔥 Sprint C3 v2 : paraphes en bas à droite de chaque page imprimée.
  // Côté employeur : remplies si employerSig actif. Côté salarié : remplies au moment
  // de la signature électronique (le route /sign/[token]/submit fait un remplacement).
  var employerInitials = (employerSig && employerSig.full_name) ? getInitials(employerSig.full_name) : ""
  // Zone salarié laissée vide ici (placeholder "paraphe") — le submit la remplira par les vraies initiales
  var paraphFooter = buildParaphFooter(employerInitials, "")
  
  return wrapHtml({
    titre: "Avenant " + amendmentNumStr + " Meshuga — " + (emp ? (emp.prenom + " " + emp.nom) : "—"),
    css: buildSharedCss(logoUri),
    body: header + body + signatures + paraphFooter
  })
}
