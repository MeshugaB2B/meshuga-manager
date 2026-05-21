import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// ============================================================
// API Route /api/settings/employer-signature
// Sprint Y1 — Signature électronique custom
// Gestion mandat permanent Edward (employeur)
//
// GET   : retourne la config signature actuelle
// POST  : { action: 'activate' | 'revoke', payload?: {...} }
// ============================================================

export var dynamic = 'force-dynamic';

function getSupabase() {
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  var key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function extractIp(req) {
  var forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    var first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  var realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  var vercelIp = req.headers.get('x-vercel-forwarded-for');
  if (vercelIp) return vercelIp.split(',')[0].trim();
  return 'unknown';
}

function extractUserAgent(req) {
  return req.headers.get('user-agent') || 'unknown';
}

function extractCountry(req) {
  return req.headers.get('x-vercel-ip-country') || req.headers.get('cf-ipcountry') || 'unknown';
}

function sha256(input) {
  var str = typeof input === 'string' ? input : JSON.stringify(input);
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

// ============================================================
// GET : lecture config
// ============================================================
export async function GET(req) {
  try {
    var supabase = getSupabase();
    var result = await supabase
      .from('app_settings')
      .select('value, updated_at, updated_by')
      .eq('key', 'employer_signature')
      .maybeSingle();

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
    }

    if (!result.data) {
      return NextResponse.json({ success: true, signature: null });
    }

    // Pour des raisons de sécurité, ne pas renvoyer le PNG (lourd) dans le GET
    var sig = result.data.value || {};
    var clientSafe = Object.assign({}, sig);
    if (clientSafe.stylized_png) {
      clientSafe.stylized_png = '[hidden]';
    }

    return NextResponse.json({
      success: true,
      signature: clientSafe,
      updated_at: result.data.updated_at,
      updated_by: result.data.updated_by,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur.' },
      { status: 500 }
    );
  }
}

// ============================================================
// POST : activate | revoke
// ============================================================
export async function POST(req) {
  try {
    var body = await req.json();
    var action = body && body.action;
    var supabase = getSupabase();
    var now = new Date().toISOString();
    var ip = extractIp(req);
    var ua = extractUserAgent(req);
    var country = extractCountry(req);

    // ---- ACTIVATE
    if (action === 'activate') {
      var payload = body.payload;
      if (!payload || !payload.full_name || payload.full_name.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: 'Nom complet manquant ou invalide.' },
          { status: 400 }
        );
      }

      var nameParts = payload.full_name.trim().split(/\s+/);
      if (nameParts.length < 2) {
        return NextResponse.json(
          { success: false, error: 'Prénom et nom requis.' },
          { status: 400 }
        );
      }

      var c = payload.consent_checkboxes;
      if (
        !c ||
        c.legal_value_consent !== true ||
        c.mandate_consent !== true ||
        c.quality_consent !== true ||
        c.integrity_consent !== true
      ) {
        return NextResponse.json(
          { success: false, error: 'Tous les consentements doivent être cochés.' },
          { status: 400 }
        );
      }

      var typedPhrase = payload.consent_texts && payload.consent_texts.handwritten_phrase_typed;
      var expectedPhrase = payload.consent_texts && payload.consent_texts.handwritten_phrase_expected;
      if (
        !typedPhrase ||
        !expectedPhrase ||
        typedPhrase.trim().toLowerCase() !== expectedPhrase.trim().toLowerCase()
      ) {
        return NextResponse.json(
          { success: false, error: 'Phrase de validation incorrecte.' },
          { status: 400 }
        );
      }

      // Récupérer l'history existante si présente
      var existing = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'employer_signature')
        .maybeSingle();

      var history = [];
      if (existing.data && existing.data.value && Array.isArray(existing.data.value.history)) {
        history = existing.data.value.history.slice();
      }

      // Événement audit pour cette activation
      var activationEvent = {
        event: 'mandate_activated',
        timestamp: now,
        ip: ip,
        country: country,
        user_agent: ua,
        client_user_agent: payload.client_user_agent || null,
        client_language: payload.client_language || null,
        client_timezone: payload.client_timezone || null,
        full_name: payload.full_name.trim(),
        legal_text_version: payload.legal_text_version || null,
      };
      history.push(activationEvent);

      // Bloc immuable hashé (preuve d'intégrité du mandat lui-même)
      var consentImmutableBlock = {
        full_name: payload.full_name.trim(),
        consent_texts: payload.consent_texts,
        consent_checkboxes: payload.consent_checkboxes,
        legal_references: payload.legal_references,
        legal_text_version: payload.legal_text_version,
        company: payload.company,
        signatory: payload.signatory,
        activated_at: now,
        ip: ip,
        user_agent: ua,
      };
      var consentBlockHash = sha256(consentImmutableBlock);

      var fullPayload = {
        full_name: payload.full_name.trim(),
        stylized_svg: payload.stylized_svg || null,
        stylized_png: payload.stylized_png || null,
        mandate_active: true,
        mandate_activated_at: now,
        mandate_ip: ip,
        mandate_country: country,
        mandate_user_agent: ua,
        mandate_revoked_at: null,
        legal_text_version: payload.legal_text_version || null,
        consent_checkboxes: payload.consent_checkboxes,
        consent_texts: payload.consent_texts,
        legal_references: payload.legal_references,
        company: payload.company,
        signatory: payload.signatory,
        consent_block_sha256: consentBlockHash,
        history: history,
      };

      var upsertResult = await supabase
        .from('app_settings')
        .upsert(
          {
            key: 'employer_signature',
            value: fullPayload,
            updated_at: now,
            updated_by: payload.full_name.trim(),
          },
          { onConflict: 'key' }
        );

      if (upsertResult.error) {
        return NextResponse.json(
          { success: false, error: upsertResult.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        activated_at: now,
        activated_ip: ip,
        consent_block_sha256: consentBlockHash,
        history_length: history.length,
      });
    }

    // ---- REVOKE
    if (action === 'revoke') {
      var existingRev = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'employer_signature')
        .maybeSingle();

      if (
        !existingRev.data ||
        !existingRev.data.value ||
        existingRev.data.value.mandate_active !== true
      ) {
        return NextResponse.json(
          { success: false, error: 'Aucun mandat actif à révoquer.' },
          { status: 400 }
        );
      }

      var prev = existingRev.data.value;
      var historyRev = Array.isArray(prev.history) ? prev.history.slice() : [];
      historyRev.push({
        event: 'mandate_revoked',
        timestamp: now,
        ip: ip,
        country: country,
        user_agent: ua,
      });

      var revokedPayload = Object.assign({}, prev, {
        mandate_active: false,
        mandate_revoked_at: now,
        mandate_revoked_ip: ip,
        mandate_revoked_user_agent: ua,
        history: historyRev,
      });

      var upsertRev = await supabase
        .from('app_settings')
        .upsert(
          {
            key: 'employer_signature',
            value: revokedPayload,
            updated_at: now,
            updated_by: prev.full_name || 'unknown',
          },
          { onConflict: 'key' }
        );

      if (upsertRev.error) {
        return NextResponse.json(
          { success: false, error: upsertRev.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        revoked_at: now,
        history_length: historyRev.length,
      });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erreur serveur.' },
      { status: 500 }
    );
  }
}
