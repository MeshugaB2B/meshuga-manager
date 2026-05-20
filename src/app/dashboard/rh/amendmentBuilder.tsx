// Builder du template HTML pour un avenant
// Réutilise les blocs partagés de contractBuilders.tsx (CSS, header, signatures)

import { esc, buildSharedCss, buildSharedHeader, buildSharedSignatures, wrapHtml } from "./contractBuilders"

function safe(s) { return esc(s == null ? "—" : String(s)) }

function fmtDateFR(d) {
  if (!d) return "—"
  var dt = new Date(d)
  return dt.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function fmtDateShortFR(d) {
  if (!d) return "—"
  var dt = new Date(d)
  return dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function amountInWords(n) {
  // Simplification : on indique juste les chiffres formatés
  if (n == null || isNaN(Number(n))) return "—"
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " euros bruts"
}

/**
 * Construit le HTML d'un avenant
 * 
 * @param amendment {Object} - ligne hr_contract_amendments
 * @param contract {Object} - ligne hr_contracts (avec valeurs APRÈS modification)
 * @param emp {Object} - ligne hr_employees
 * @param logoUri {string} - logo data URI
 * @param previousValues {Object} - valeurs AVANT la modification (pour afficher les anciennes)
 */
export function buildAvenant(amendment, contract, emp, logoUri, previousValues) {
  var prev = previousValues || {}
  var amendmentDate = amendment.effective_date || amendment.created_at
  var amendmentNumStr = "N°" + (amendment.amendment_number || 1)
  
  // Détermine le type de contrat pour afficher le bon intitulé
  var contractTypeLabel = "Contrat de travail"
  if (contract.type === "extra") contractTypeLabel = "Contrat de travail d'extra (CDD d'usage)"
  else if (contract.type === "cdi_cadre") contractTypeLabel = "Contrat de travail à durée indéterminée (Cadre)"
  else if (contract.type === "cdi_cuisinier") contractTypeLabel = "Contrat de travail à durée indéterminée (Cuisinier)"
  else if (contract.type === "cdi_caissier") contractTypeLabel = "Contrat de travail à durée indéterminée (Caissier/ère)"
  
  var contractDate = contract.date_signature || contract.date_debut
  var contractDateStr = fmtDateShortFR(contractDate)
  
  // Titre selon le type d'avenant
  var titleByType = {
    prolongation_duree: "Prolongation de la durée du contrat",
    augmentation_salaire: "Modification de la rémunération",
    modification_horaires: "Modification de la durée du travail",
    changement_poste: "Modification des fonctions",
    autre: "Modification contractuelle"
  }
  var sousTitre = titleByType[amendment.amendment_type] || "Modification contractuelle"
  
  var header = buildSharedHeader({
    emp: emp,
    titreCover: "AVENANT " + amendmentNumStr,
    sousTitreCover: sousTitre + " · " + contractTypeLabel,
    typeBandeau: "AVENANT " + amendmentNumStr,
    logoUri: logoUri
  })
  
  // ============================================================
  // PRÉAMBULE COMMUN À TOUS LES AVENANTS
  // ============================================================
  var preambule = ''
    + '<div class="art"><span class="art-num">Préambule.</span><span class="art-title">Rappel du contrat initial</span></div>'
    + '<div class="body">'
    + '<p>Le présent avenant fait suite au <strong>' + esc(contractTypeLabel) + '</strong> conclu entre les soussignés en date du <strong>' + esc(contractDateStr) + '</strong>.</p>'
    + '<p>Il porte le numéro <strong>' + esc(amendmentNumStr) + '</strong> dans la séquence des avenants à ce contrat.</p>'
    + '</div>'
  
  // ============================================================
  // ARTICLE 1 : OBJET DE L'AVENANT (varie selon le type)
  // ============================================================
  var article1 = ''
  
  if (amendment.amendment_type === "prolongation_duree") {
    var dateFinAvant = prev.date_fin ? fmtDateFR(prev.date_fin) : "—"
    var dateFinApres = contract.date_fin ? fmtDateFR(contract.date_fin) : "—"
    article1 = ''
      + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet de l\'avenant : prolongation de la durée du contrat</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent expressément, par le présent avenant, de <strong>prolonger la durée</strong> du contrat de travail.</p>'
      + '<p>La date de fin initialement prévue le <strong>' + esc(dateFinAvant) + '</strong> est <strong>reportée au ' + esc(dateFinApres) + '</strong>.</p>'
      + (amendment.motif ? ('<p><em>Motif de la prolongation : ' + esc(amendment.motif) + '</em></p>') : '')
      + '<p>Le contrat se poursuit aux conditions précédemment fixées, sans interruption.</p>'
      + '</div>'
  } 
  else if (amendment.amendment_type === "augmentation_salaire") {
    var salAvant = prev.salaire_brut_mensuel != null ? amountInWords(prev.salaire_brut_mensuel) : "—"
    var salApres = contract.salaire_brut_mensuel != null ? amountInWords(contract.salaire_brut_mensuel) : "—"
    var tauxAvant = prev.taux_horaire_brut != null ? Number(prev.taux_horaire_brut).toFixed(2) + " €" : null
    var tauxApres = contract.taux_horaire_brut != null ? Number(contract.taux_horaire_brut).toFixed(2) + " €" : null
    var effDate = fmtDateFR(amendment.effective_date)
    
    article1 = ''
      + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet de l\'avenant : modification de la rémunération</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent, par le présent avenant et à compter du <strong>' + esc(effDate) + '</strong>, de modifier la rémunération du/de la Salarié(e) comme suit :</p>'
      + '<table class="planning" style="margin:14px 0;">'
      + '<thead><tr><th>Élément</th><th>Avant</th><th>Après</th></tr></thead>'
      + '<tbody>'
      + (contract.salaire_brut_mensuel != null 
          ? ('<tr><td>Salaire brut mensuel</td><td style="text-align:center">' + esc(salAvant) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(salApres) + '</td></tr>') 
          : '')
      + (tauxApres 
          ? ('<tr><td>Taux horaire brut</td><td style="text-align:center">' + esc(tauxAvant || "—") + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(tauxApres) + '</td></tr>') 
          : '')
      + '</tbody></table>'
      + (amendment.motif ? ('<p><em>Motif : ' + esc(amendment.motif) + '</em></p>') : '')
      + '</div>'
  }
  else if (amendment.amendment_type === "modification_horaires") {
    var heuresAvant = prev.heures_hebdo != null ? Number(prev.heures_hebdo).toString() + " heures" : "—"
    var heuresApres = contract.heures_hebdo != null ? Number(contract.heures_hebdo).toString() + " heures" : "—"
    var mensAvant = prev.heures_mensuelles != null ? Number(prev.heures_mensuelles).toString() + " heures" : null
    var mensApres = contract.heures_mensuelles != null ? Number(contract.heures_mensuelles).toString() + " heures" : null
    var effDateH = fmtDateFR(amendment.effective_date)
    
    article1 = ''
      + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet de l\'avenant : modification de la durée du travail</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent, par le présent avenant et à compter du <strong>' + esc(effDateH) + '</strong>, de modifier la durée hebdomadaire de travail du/de la Salarié(e) comme suit :</p>'
      + '<table class="planning" style="margin:14px 0;">'
      + '<thead><tr><th>Élément</th><th>Avant</th><th>Après</th></tr></thead>'
      + '<tbody>'
      + '<tr><td>Durée hebdomadaire</td><td style="text-align:center">' + esc(heuresAvant) + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(heuresApres) + '</td></tr>'
      + (mensApres 
          ? ('<tr><td>Durée mensuelle</td><td style="text-align:center">' + esc(mensAvant || "—") + '</td><td style="text-align:center;font-weight:900;color:#C2185B">' + esc(mensApres) + '</td></tr>') 
          : '')
      + '</tbody></table>'
      + (amendment.motif ? ('<p><em>Motif : ' + esc(amendment.motif) + '</em></p>') : '')
      + '<p>La rémunération sera ajustée au prorata de cette nouvelle durée si applicable.</p>'
      + '</div>'
  }
  else if (amendment.amendment_type === "changement_poste") {
    var fonctionAvant = prev.fonction || "—"
    var fonctionApres = contract.fonction || "—"
    var effDateP = fmtDateFR(amendment.effective_date)
    
    article1 = ''
      + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet de l\'avenant : modification des fonctions et missions</span></div>'
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
      + (amendment.motif ? ('<p><em>Détail des nouvelles missions / motif : ' + esc(amendment.motif) + '</em></p>') : '')
      + '</div>'
  }
  else {
    // Cas "autre" : motif libre, pas de diff
    var effDateA = fmtDateFR(amendment.effective_date)
    article1 = ''
      + '<div class="art"><span class="art-num">Article 1.</span><span class="art-title">Objet de l\'avenant</span></div>'
      + '<div class="body">'
      + '<p>Les Parties conviennent, par le présent avenant et à compter du <strong>' + esc(effDateA) + '</strong>, de la modification suivante du contrat de travail :</p>'
      + (amendment.motif ? ('<p style="background:#FFF9E5;padding:10px 14px;border-left:3px solid #FFEB5A;margin:10px 0;">' + esc(amendment.motif) + '</p>') : '<p>—</p>')
      + '</div>'
  }
  
  // ============================================================
  // ARTICLE 2 : MAINTIEN DES AUTRES CLAUSES (standard)
  // ============================================================
  var article2 = ''
    + '<div class="art"><span class="art-num">Article 2.</span><span class="art-title">Maintien des autres clauses</span></div>'
    + '<div class="body">'
    + '<p><strong>Toutes les autres clauses et conditions du contrat initial, non modifiées par le présent avenant, demeurent inchangées et conservent leur plein effet.</strong></p>'
    + '</div>'
  
  // ============================================================
  // ARTICLE 3 : ENTRÉE EN VIGUEUR
  // ============================================================
  var article3 = ''
    + '<div class="art"><span class="art-num">Article 3.</span><span class="art-title">Entrée en vigueur</span></div>'
    + '<div class="body">'
    + '<p>Le présent avenant prend effet à compter du <strong>' + esc(fmtDateFR(amendment.effective_date)) + '</strong>.</p>'
    + '<p>Il est établi en deux exemplaires originaux, un pour chacune des Parties.</p>'
    + '</div>'
  
  var body = preambule + article1 + article2 + article3
  
  // Signatures (réutilise le bloc partagé)
  var salarieRole = (contract.type === "extra") ? "extra" : (contract.type ? contract.type.replace("cdi_", "") : "salarié")
  var signatures = buildSharedSignatures(contract, emp, salarieRole)
  
  return wrapHtml({
    title: "Avenant " + amendmentNumStr + " - " + (emp ? (emp.prenom + " " + emp.nom) : "—"),
    logoUri: logoUri,
    header: header,
    body: body,
    signatures: signatures
  })
}
