-- ============================================================
-- CRM prospection : suivi des envois (email + LinkedIn), délivrabilité
-- Resend, relances planifiées (manuelles ou auto), commentaires d'équipe.
-- Un prospect est identifié par (prospect_kind, prospect_ref) :
--   kind = 'crm'    → prospects.id (uuid en texte)
--   kind = 'chasse' → chasse_prospects.id
-- ============================================================

-- 1. Historique des prises de contact (1 ligne = 1 message envoyé à 1 personne)
create table if not exists public.prospect_outreach (
  id uuid primary key default gen_random_uuid(),
  prospect_kind text not null check (prospect_kind in ('crm','chasse')),
  prospect_ref text not null,
  prospect_name text,
  channel text not null default 'email' check (channel in ('email','linkedin','phone')),
  email_type text,                      -- first | relance | devis_relance | linkedin_invite | linkedin_inmail | linkedin_message | call
  sender_key text,                      -- edward | emy
  sent_mode text not null default 'manual' check (sent_mode in ('manual','auto','import')),
  resend_id text unique,
  to_email text,
  to_first_name text,
  to_last_name text,
  to_civility text,
  subject text,
  body text,
  status text not null default 'sent',  -- sent | delivered | delivery_delayed | opened | clicked | bounced | complained | failed | logged
  status_detail text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  last_event_at timestamptz,
  open_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists prospect_outreach_prospect_idx on public.prospect_outreach (prospect_kind, prospect_ref, sent_at desc);
create index if not exists prospect_outreach_to_idx on public.prospect_outreach (lower(to_email));

-- 2. Relances planifiées
create table if not exists public.prospect_followups (
  id uuid primary key default gen_random_uuid(),
  prospect_kind text not null check (prospect_kind in ('crm','chasse')),
  prospect_ref text not null,
  prospect_name text,
  due_date date not null,
  mode text not null default 'manual' check (mode in ('manual','auto')),
  channel text not null default 'email' check (channel in ('email','linkedin','phone')),
  email_type text not null default 'relance',
  sender_key text,
  step integer not null default 1,
  status text not null default 'scheduled' check (status in ('scheduled','done','sent','cancelled','skipped','failed')),
  status_detail text,
  outreach_id uuid references public.prospect_outreach(id) on delete set null,
  created_by text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);
-- une seule relance « à venir » par prospect
create unique index if not exists prospect_followups_one_scheduled on public.prospect_followups (prospect_kind, prospect_ref) where status = 'scheduled';
create index if not exists prospect_followups_due_idx on public.prospect_followups (status, due_date);

-- 3. Commentaires d'équipe
create table if not exists public.prospect_comments (
  id uuid primary key default gen_random_uuid(),
  prospect_kind text not null check (prospect_kind in ('crm','chasse')),
  prospect_ref text not null,
  author text not null default 'edward',
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists prospect_comments_prospect_idx on public.prospect_comments (prospect_kind, prospect_ref, created_at desc);

-- 4. État CRM par prospect (réponse, adresse invalide, opt-out, LinkedIn, préférence auto)
create table if not exists public.prospect_crm (
  prospect_kind text not null check (prospect_kind in ('crm','chasse')),
  prospect_ref text not null,
  replied_at timestamptz,
  reply_note text,
  email_invalid boolean not null default false,
  email_invalid_reason text,
  do_not_contact boolean not null default false,
  auto_followup boolean not null default false,
  owner text,
  linkedin_url text,
  updated_at timestamptz not null default now(),
  primary key (prospect_kind, prospect_ref)
);

alter table public.prospect_outreach enable row level security;
alter table public.prospect_followups enable row level security;
alter table public.prospect_comments enable row level security;
alter table public.prospect_crm enable row level security;

drop policy if exists "team_all" on public.prospect_outreach;
drop policy if exists "team_all" on public.prospect_followups;
drop policy if exists "team_all" on public.prospect_comments;
drop policy if exists "team_all" on public.prospect_crm;
create policy "team_all" on public.prospect_outreach for all to authenticated using (true) with check (true);
create policy "team_all" on public.prospect_followups for all to authenticated using (true) with check (true);
create policy "team_all" on public.prospect_comments for all to authenticated using (true) with check (true);
create policy "team_all" on public.prospect_crm for all to authenticated using (true) with check (true);
