// Builder du template HTML pour un avenant
// Réutilise les blocs partagés de contractBuilders.tsx (CSS, header, signatures)

import { esc, buildSharedHeader, buildSharedSignatures, wrapHtml } from "./contractBuilders"

function fmtDateFR(d: any) {
  if (!d) return "—"
  var dt = new Date(d)
  return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
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
 */
export function buildAvenant(amendment: any, contract: any, emp: any, vacs: any[], logoUri: string, previousValues: any) {
  var prev = previousValues || {}
  var safeVacs = vacs || []
  var amendmentNumStr = "N°" + (amendment.amendment_number || 1)
  
  var contractTypeLabel = "Contrat de travail"
  if (contract.type === "extra") contractTypeLabel = "Contrat de travail d'extra (CDD d'usage)"
  else if (contract.type === "cdi_cadre") contractTypeLabel = "Contrat de travail à durée indéterminée (Cadre)"
  else if (contract.type === "cdi_cuisinier") contractTypeLabel = "Contrat de travail à durée indéterminée (Cuisinier)"
  else if (contract.type === "cdi_caissier") contractTypeLabel = "Contrat de travail à durée indéterminée (Caissier/ère)"
  
  var contractDate = contract.date_signature || contract.date_debut
  var contractDateStr = fmtDateShortFR(contractDate)
  
  var titleByType: any = {
    prolongation_duree: "Prolongation de la durée du contrat",
    augmentation_salaire: "Modification de la rémunération",
    modification_horaires: "Modification de la durée du travail",
    changement_poste: "Modification des fonctions",
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
  
  // Signatures (réutilise le bloc partagé du contrat extra)
  var salarieRole = isExtra ? "extra" : (contract.type ? contract.type.replace("cdi_", "") : "salarié")
  var signatures = buildSharedSignatures(contract, emp, salarieRole)
  
  return wrapHtml({
    title: "Avenant " + amendmentNumStr + " - " + (emp ? (emp.prenom + " " + emp.nom) : "—"),
    logoUri: logoUri,
    header: header,
    body: body,
    signatures: signatures
  })
}
