'use client';

import React, { useState, useEffect, useRef } from 'react';

// ============================================================
// Page /dashboard/parametres/signature
// Sprint Y1 — Signature électronique custom
// Mandat permanent Edward (employeur)
// ============================================================

var COLORS = {
  pink: '#FF82D7',
  yellow: '#FFEB5A',
  black: '#191923',
  white: '#FFFFFF',
  paleGray: '#FAFAFA',
  borderGray: '#E0E0E0',
  textMute: '#666666',
  successGreen: '#10B981',
  successBg: '#ECFDF5',
  alertRed: '#EF4444',
  alertBg: '#FEE2E2',
  warnAmber: '#F59E0B',
  warnBg: '#FEF3C7',
  warnText: '#92400E',
  checkBg: '#FEF7FB',
};

var FONT_TITLE = "'Yellowtail', cursive";
var FONT_BODY = "'Arial Narrow', Arial, sans-serif";

// ---- Textes légaux (FIGÉS, ne JAMAIS modifier sans bump de version + nouveau mandat requis)
var LEGAL_TEXT_VERSION = '1.0.0';

var LEGAL_CONSENT_TEXT =
  "Je reconnais que ma signature électronique stylisée a la même valeur juridique qu'une signature manuscrite, conformément à l'article 1367 du Code civil. " +
  "J'ai conscience que ce procédé constitue une signature électronique simple au sens du règlement européen eIDAS n° 910/2014, " +
  "dont la valeur probatoire repose sur l'ensemble des éléments d'audit collectés (horodatage serveur, adresse IP, agent utilisateur, hash SHA-256 du document, double canal de notification email et SMS).";

var MANDATE_CONSENT_TEXT =
  "Je donne mandat permanent au système Meshuga Manager d'apposer ma signature électronique stylisée sur les contrats de travail, " +
  "avenants et documents associés générés en mon nom et au nom de SAS AEGIA FOOD (SIREN 904 639 531), " +
  "conformément à l'article 1367 du Code civil et au règlement européen eIDAS n° 910/2014. " +
  "Ce mandat est révocable à tout moment depuis cette même page de paramètres.";

var QUALITY_CONSENT_TEXT =
  "Je certifie agir en qualité de Président de SAS AEGIA FOOD (SIREN 904 639 531, siège social 3 rue Vavin 75006 Paris, APE 56.10C, TVA FR31904639531) " +
  "et disposer du pouvoir d'engager juridiquement la société par l'apposition de ma signature électronique " +
  "sur les contrats de travail et avenants ressources humaines associés.";

var INTEGRITY_CONSENT_TEXT =
  "Je reconnais que chaque contrat signé par ma signature pré-enregistrée fera l'objet d'un horodatage serveur, " +
  "d'une empreinte cryptographique SHA-256 et d'une journalisation complète garantissant son intégrité documentaire, " +
  "conformément à l'article 1366 du Code civil.";

var HANDWRITTEN_PHRASE = 'Bon pour mandat de signature électronique permanente';

// ============================================================

export default function SignatureSettingsPage() {
  var [fullName, setFullName] = useState('');
  var [loading, setLoading] = useState(true);
  var [saving, setSaving] = useState(false);
  var [mandateActive, setMandateActive] = useState(false);
  var [mandateActivatedAt, setMandateActivatedAt] = useState('');
  var [mandateActivatedIp, setMandateActivatedIp] = useState('');
  var [historyLength, setHistoryLength] = useState(0);
  var [check1, setCheck1] = useState(false);
  var [check2, setCheck2] = useState(false);
  var [check3, setCheck3] = useState(false);
  var [check4, setCheck4] = useState(false);
  var [handwrittenInput, setHandwrittenInput] = useState('');
  var [feedback, setFeedback] = useState(null);
  var [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  var svgPreviewRef = useRef(null);
  var canvasRef = useRef(null);

  // ---- Chargement initial
  useEffect(function () {
    var loadSignature = async function () {
      try {
        var res = await fetch('/api/settings/employer-signature', { method: 'GET' });
        var data = await res.json();
        if (data && data.success && data.signature) {
          var s = data.signature;
          if (s.full_name) setFullName(s.full_name);
          if (s.mandate_active === true) {
            setMandateActive(true);
            setMandateActivatedAt(s.mandate_activated_at || '');
            setMandateActivatedIp(s.mandate_ip || '');
          }
          if (Array.isArray(s.history)) setHistoryLength(s.history.length);
        }
      } catch (err) {
        console.error('Load signature error:', err);
        setFeedback({ type: 'error', message: 'Impossible de charger la signature existante.' });
      }
      setLoading(false);
    };
    loadSignature();
  }, []);

  // ---- Génération SVG (affichage)
  var buildSvg = function (name) {
    if (!name || name.trim().length === 0) return '';
    var safe = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" width="800" height="200">' +
      '<text x="20" y="135" font-family="Yellowtail, cursive" font-size="100" fill="#FF82D7">' +
      safe +
      '</text>' +
      '</svg>'
    );
  };

  // ---- Génération PNG via Canvas (pour embed PDF)
  var buildPng = async function (name) {
    if (!name || name.trim().length === 0) return null;
    if (typeof document === 'undefined') return null;
    try {
      await document.fonts.load('100px Yellowtail');
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font load warning:', e);
    }
    var canvas = canvasRef.current;
    if (!canvas) return null;
    canvas.width = 800;
    canvas.height = 200;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.clearRect(0, 0, 800, 200);
    ctx.fillStyle = COLORS.pink;
    ctx.font = '100px Yellowtail, cursive';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(name, 20, 135);
    return canvas.toDataURL('image/png');
  };

  // ---- Update SVG preview au changement du nom
  useEffect(function () {
    if (svgPreviewRef.current) {
      svgPreviewRef.current.innerHTML = buildSvg(fullName);
    }
  }, [fullName]);

  // ---- Validation états
  var allChecksValid = check1 && check2 && check3 && check4;
  var handwrittenValid = handwrittenInput.trim().toLowerCase() === HANDWRITTEN_PHRASE.toLowerCase();
  var nameValid = fullName.trim().length >= 3 && fullName.trim().split(/\s+/).length >= 2;
  var canActivate = allChecksValid && handwrittenValid && nameValid && !mandateActive && !saving;

  // ---- Activation mandat
  var handleActivate = async function () {
    if (!canActivate) return;
    setSaving(true);
    setFeedback(null);
    try {
      var svg = buildSvg(fullName);
      var png = await buildPng(fullName);

      var payload = {
        full_name: fullName.trim(),
        stylized_svg: svg,
        stylized_png: png,
        legal_text_version: LEGAL_TEXT_VERSION,
        consent_checkboxes: {
          legal_value_consent: check1,
          mandate_consent: check2,
          quality_consent: check3,
          integrity_consent: check4,
        },
        consent_texts: {
          legal_value: LEGAL_CONSENT_TEXT,
          mandate: MANDATE_CONSENT_TEXT,
          quality: QUALITY_CONSENT_TEXT,
          integrity: INTEGRITY_CONSENT_TEXT,
          handwritten_phrase_expected: HANDWRITTEN_PHRASE,
          handwritten_phrase_typed: handwrittenInput.trim(),
        },
        legal_references: [
          'Article 1366 du Code civil',
          'Article 1367 du Code civil',
          'Règlement (UE) n° 910/2014 (eIDAS)',
          'Article L1221-1 du Code du travail',
        ],
        company: {
          name: 'SAS AEGIA FOOD',
          legal_form: 'SASU',
          siren: '904 639 531',
          siret: '904 639 531 00014',
          address: '3 rue Vavin, 75006 Paris',
          ape: '56.10C',
          tva: 'FR31904639531',
          ccn: 'CCN Restauration Rapide IDCC 1501',
        },
        signatory: {
          full_name: fullName.trim(),
          quality: 'Président',
        },
        client_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        client_language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
        client_timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown',
      };

      var res = await fetch('/api/settings/employer-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', payload: payload }),
      });
      var result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Erreur lors de l'activation du mandat.");
      }

      setMandateActive(true);
      setMandateActivatedAt(result.activated_at || new Date().toISOString());
      setMandateActivatedIp(result.activated_ip || '');
      setHistoryLength((result.history_length != null ? result.history_length : 1));
      setCheck1(false);
      setCheck2(false);
      setCheck3(false);
      setCheck4(false);
      setHandwrittenInput('');
      setFeedback({
        type: 'success',
        message: 'Mandat permanent activé. Votre signature sera apposée automatiquement sur tous les contrats à venir.',
      });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Erreur inattendue.' });
    }
    setSaving(false);
  };

  // ---- Révocation mandat
  var handleRevoke = async function () {
    setSaving(true);
    setFeedback(null);
    try {
      var res = await fetch('/api/settings/employer-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      });
      var result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Erreur lors de la révocation.');
      }
      setMandateActive(false);
      setMandateActivatedAt('');
      setMandateActivatedIp('');
      setShowRevokeConfirm(false);
      setHistoryLength((result.history_length != null ? result.history_length : historyLength + 1));
      setFeedback({
        type: 'success',
        message: 'Mandat permanent révoqué. Aucune signature automatique ne sera apposée tant qu\'un nouveau mandat n\'aura pas été activé.',
      });
    } catch (err) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Erreur lors de la révocation.' });
    }
    setSaving(false);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      style={{
        fontFamily: FONT_BODY,
        color: COLORS.black,
        padding: '24px',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: FONT_TITLE, fontSize: 56, color: COLORS.pink, margin: 0, lineHeight: 1 }}>
          Ma signature
        </h1>
        <p style={{ fontSize: 14, color: COLORS.black, marginTop: 8, marginBottom: 0 }}>
          Pré-enregistrement de votre signature électronique stylisée pour apposition automatique sur les contrats
          de travail et avenants générés depuis Meshuga Manager.
        </p>
      </div>

      {loading && (
        <div style={{ padding: 24, textAlign: 'center', color: COLORS.textMute }}>Chargement...</div>
      )}

      {!loading && (
        <div>
          {/* Banner statut */}
          {mandateActive ? (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                backgroundColor: COLORS.successBg,
                border: '2px solid ' + COLORS.successGreen,
                marginBottom: 24,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 16, color: COLORS.successGreen, marginBottom: 6 }}>
                ✓ Mandat permanent ACTIF
              </div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                Activé le{' '}
                {mandateActivatedAt
                  ? new Date(mandateActivatedAt).toLocaleString('fr-FR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })
                  : '—'}
              </div>
              {mandateActivatedIp && (
                <div style={{ fontSize: 12, color: COLORS.textMute }}>
                  Adresse IP enregistrée : {mandateActivatedIp}
                </div>
              )}
              <div style={{ fontSize: 13, marginTop: 8 }}>
                Votre signature stylisée sera automatiquement apposée sur tous les contrats émis depuis votre
                dashboard. {historyLength > 0 ? historyLength + ' événement(s) d\'audit enregistré(s).' : ''}
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: 20,
                borderRadius: 12,
                backgroundColor: COLORS.warnBg,
                border: '2px solid ' + COLORS.warnAmber,
                marginBottom: 24,
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: 16, color: COLORS.warnText, marginBottom: 4 }}>
                ⚠ Aucun mandat permanent actif
              </div>
              <div style={{ fontSize: 13 }}>
                Activez votre mandat ci-dessous pour que vos contrats soient automatiquement pré-signés.
              </div>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                backgroundColor: feedback.type === 'success' ? COLORS.successBg : COLORS.alertBg,
                color: feedback.type === 'success' ? COLORS.successGreen : COLORS.alertRed,
                border:
                  '1px solid ' + (feedback.type === 'success' ? COLORS.successGreen : COLORS.alertRed),
                marginBottom: 24,
                fontSize: 14,
              }}
            >
              {feedback.message}
            </div>
          )}

          {/* Formulaire d'activation (uniquement si mandat inactif) */}
          {!mandateActive && (
            <div
              style={{
                backgroundColor: COLORS.white,
                borderRadius: 16,
                border: '1px solid ' + COLORS.borderGray,
                padding: 32,
                marginBottom: 24,
              }}
            >
              {/* Étape 1 : Nom */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', marginTop: 0, marginBottom: 4 }}>
                  1. Votre nom complet
                </h2>
                <p style={{ fontSize: 13, color: COLORS.textMute, marginTop: 0, marginBottom: 12 }}>
                  Tel qu&apos;il apparaîtra sur les contrats. Prénom + Nom obligatoires.
                </p>
                <input
                  type="text"
                  value={fullName}
                  onChange={function (e) {
                    setFullName(e.target.value);
                  }}
                  placeholder="Edward TOURET"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 16,
                    border: '2px solid ' + (nameValid ? COLORS.successGreen : COLORS.borderGray),
                    borderRadius: 8,
                    fontFamily: FONT_BODY,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />

                {nameValid && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: COLORS.textMute, marginBottom: 4 }}>
                      Aperçu de votre signature :
                    </div>
                    <div
                      style={{
                        padding: 24,
                        backgroundColor: COLORS.paleGray,
                        borderRadius: 8,
                        border: '1px dashed ' + COLORS.borderGray,
                        textAlign: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: FONT_TITLE,
                          fontSize: 72,
                          color: COLORS.pink,
                          lineHeight: 1.1,
                          wordBreak: 'break-word',
                        }}
                      >
                        {fullName}
                      </div>
                    </div>
                    <div ref={svgPreviewRef} style={{ display: 'none' }} />
                    <canvas ref={canvasRef} width={800} height={200} style={{ display: 'none' }} />
                  </div>
                )}
              </div>

              {/* Étape 2 : Cadre juridique */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', marginTop: 0, marginBottom: 8 }}>
                  2. Cadre juridique applicable
                </h2>
                <div
                  style={{
                    backgroundColor: COLORS.paleGray,
                    padding: 16,
                    borderRadius: 8,
                    border: '1px solid ' + COLORS.borderGray,
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>Article 1366 du Code civil :</strong> « L&apos;écrit électronique a la même force
                    probante que l&apos;écrit sur support papier, sous réserve que puisse être dûment identifiée
                    la personne dont il émane et qu&apos;il soit établi et conservé dans des conditions de nature
                    à en garantir l&apos;intégrité. »
                  </p>
                  <p style={{ margin: '0 0 10px 0' }}>
                    <strong>Article 1367 du Code civil :</strong> « La signature nécessaire à la perfection
                    d&apos;un acte juridique identifie son auteur. Elle manifeste son consentement aux
                    obligations qui découlent de cet acte. […] Lorsqu&apos;elle est électronique, elle consiste
                    en l&apos;usage d&apos;un procédé fiable d&apos;identification garantissant son lien avec
                    l&apos;acte auquel elle s&apos;attache. »
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Règlement (UE) n° 910/2014 (eIDAS) :</strong> régit l&apos;identification
                    électronique et les services de confiance pour les transactions électroniques au sein du
                    marché intérieur européen.
                  </p>
                </div>
              </div>

              {/* Étape 3 : Cases à cocher */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', marginTop: 0, marginBottom: 8 }}>
                  3. Consentements obligatoires
                </h2>

                <CheckboxBlock
                  checked={check1}
                  onChange={setCheck1}
                  label="Valeur juridique de la signature"
                  text={LEGAL_CONSENT_TEXT}
                />
                <CheckboxBlock
                  checked={check2}
                  onChange={setCheck2}
                  label="Mandat permanent de signature"
                  text={MANDATE_CONSENT_TEXT}
                />
                <CheckboxBlock
                  checked={check3}
                  onChange={setCheck3}
                  label="Qualité et pouvoir du signataire"
                  text={QUALITY_CONSENT_TEXT}
                />
                <CheckboxBlock
                  checked={check4}
                  onChange={setCheck4}
                  label="Intégrité documentaire"
                  text={INTEGRITY_CONSENT_TEXT}
                />
              </div>

              {/* Étape 4 : Phrase manuelle */}
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 20, fontWeight: 'bold', marginTop: 0, marginBottom: 4 }}>
                  4. Phrase de validation
                </h2>
                <p style={{ fontSize: 13, color: COLORS.textMute, marginTop: 0, marginBottom: 12 }}>
                  Recopiez exactement la phrase ci-dessous (insensible à la casse) :
                </p>
                <div
                  style={{
                    padding: 12,
                    backgroundColor: COLORS.yellow,
                    border: '2px solid ' + COLORS.black,
                    borderRadius: 8,
                    fontWeight: 'bold',
                    marginBottom: 8,
                    fontFamily: FONT_BODY,
                    fontSize: 15,
                    textAlign: 'center',
                  }}
                >
                  {HANDWRITTEN_PHRASE}
                </div>
                <input
                  type="text"
                  value={handwrittenInput}
                  onChange={function (e) {
                    setHandwrittenInput(e.target.value);
                  }}
                  placeholder="Recopiez la phrase ci-dessus"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: 16,
                    border: '2px solid ' + (handwrittenValid ? COLORS.successGreen : COLORS.borderGray),
                    borderRadius: 8,
                    fontFamily: FONT_BODY,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                {handwrittenInput.length > 0 && !handwrittenValid && (
                  <div style={{ fontSize: 12, color: COLORS.alertRed, marginTop: 4 }}>
                    La phrase ne correspond pas exactement.
                  </div>
                )}
              </div>

              {/* Bouton d'activation */}
              <button
                onClick={handleActivate}
                disabled={!canActivate}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: 18,
                  fontWeight: 'bold',
                  fontFamily: FONT_BODY,
                  backgroundColor: canActivate ? COLORS.pink : '#E5E5E5',
                  color: canActivate ? COLORS.white : '#999999',
                  border: 'none',
                  borderRadius: 12,
                  cursor: canActivate ? 'pointer' : 'not-allowed',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  boxShadow: canActivate ? '0 4px 12px rgba(255, 130, 215, 0.4)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {saving ? 'Activation en cours...' : '✍️ Activer le mandat permanent'}
              </button>

              {!canActivate && !saving && (
                <div style={{ fontSize: 12, color: COLORS.textMute, marginTop: 8, textAlign: 'center' }}>
                  Complétez tous les champs pour activer le mandat.
                </div>
              )}
            </div>
          )}

          {/* Section révocation (uniquement si actif) */}
          {mandateActive && (
            <div
              style={{
                backgroundColor: COLORS.white,
                borderRadius: 16,
                border: '1px solid ' + COLORS.borderGray,
                padding: 32,
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 'bold', marginTop: 0, marginBottom: 8, color: COLORS.alertRed }}>
                Révocation du mandat
              </h2>
              <p style={{ fontSize: 13, color: COLORS.textMute, marginTop: 0 }}>
                Vous pouvez révoquer ce mandat à tout moment. Une fois révoqué, aucune signature ne sera apposée
                automatiquement sur les contrats à venir. Vous devrez ré-activer un nouveau mandat pour reprendre
                l&apos;émission automatique. Tous les contrats déjà signés conservent leur valeur juridique.
              </p>

              {!showRevokeConfirm ? (
                <button
                  onClick={function () {
                    setShowRevokeConfirm(true);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: COLORS.white,
                    color: COLORS.alertRed,
                    border: '2px solid ' + COLORS.alertRed,
                    borderRadius: 8,
                    fontFamily: FONT_BODY,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Révoquer le mandat
                </button>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 14, color: COLORS.alertRed, marginBottom: 12 }}>
                    Êtes-vous certain ? Cette action est immédiate et journalisée dans l&apos;audit trail.
                  </div>
                  <button
                    onClick={handleRevoke}
                    disabled={saving}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: COLORS.alertRed,
                      color: COLORS.white,
                      border: 'none',
                      borderRadius: 8,
                      fontFamily: FONT_BODY,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      marginRight: 8,
                    }}
                  >
                    {saving ? 'Révocation...' : 'Confirmer la révocation'}
                  </button>
                  <button
                    onClick={function () {
                      setShowRevokeConfirm(false);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: COLORS.white,
                      color: COLORS.black,
                      border: '1px solid ' + COLORS.borderGray,
                      borderRadius: 8,
                      fontFamily: FONT_BODY,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Composant helper : bloc checkbox + texte légal
// (top-level, JAMAIS défini dans le JSX → SWC OK)
// ============================================================
function CheckboxBlock(props) {
  var checked = props.checked;
  var onChange = props.onChange;
  var label = props.label;
  var text = props.text;
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: 14,
        marginBottom: 10,
        backgroundColor: checked ? COLORS.checkBg : COLORS.paleGray,
        border: '1px solid ' + (checked ? COLORS.pink : COLORS.borderGray),
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={function (e) {
          onChange(e.target.checked);
        }}
        style={{
          marginTop: 4,
          marginRight: 12,
          width: 18,
          height: 18,
          accentColor: COLORS.pink,
          flexShrink: 0,
          cursor: 'pointer',
        }}
      />
      <div>
        <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#333333' }}>{text}</div>
      </div>
    </label>
  );
}
