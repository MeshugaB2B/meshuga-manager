-- =====================================================
-- MESHUGA MANAGER — SUPABASE SCHEMA
-- Coller dans l'éditeur SQL de Supabase
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS / PROFILES ─────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('edward', 'emy')) NOT NULL DEFAULT 'emy',
  avatar_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROSPECTS (CRM) ──────────────────────────────
CREATE TABLE prospects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_title TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  arrondissement TEXT,
  sector TEXT, -- 'evenementiel', 'corporate', 'startup', 'institution', 'autre'
  status TEXT CHECK (status IN ('to_contact', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiation', 'won', 'lost', 'on_hold')) DEFAULT 'to_contact',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  potential_value TEXT, -- 'plateaux_dejeuner', 'cocktail', 'repas_equipe', 'evenement', 'autre'
  estimated_monthly_revenue NUMERIC(10,2),
  source TEXT, -- 'prospection', 'referral', 'inbound', 'networking'
  notes TEXT,
  tags TEXT[], -- array of custom tags
  next_action TEXT,
  next_action_date DATE,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_contacted_at TIMESTAMPTZ
);

-- ─── PROSPECT INTERACTIONS ────────────────────────
CREATE TABLE prospect_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('call', 'email', 'meeting', 'whatsapp', 'visit', 'note')) NOT NULL,
  summary TEXT NOT NULL,
  outcome TEXT,
  next_step TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REMINDERS ────────────────────────────────────
CREATE TABLE reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  remind_at TIMESTAMPTZ NOT NULL,
  channels TEXT[] DEFAULT ARRAY['app'], -- 'app', 'email', 'whatsapp', 'sms'
  status TEXT CHECK (status IN ('pending', 'sent', 'dismissed')) DEFAULT 'pending',
  created_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONTACTS / ANNUAIRE ──────────────────────────
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT CHECK (category IN ('fournisseur', 'client_b2b', 'partenaire', 'presse', 'livreur', 'autre')) NOT NULL,
  company_name TEXT,
  full_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  website TEXT,
  instagram TEXT,
  notes TEXT,
  tags TEXT[],
  is_vip BOOLEAN DEFAULT FALSE,
  contract_start DATE,
  contract_end DATE,
  payment_terms TEXT, -- for fournisseurs
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TASKS ────────────────────────────────────────
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  category TEXT, -- 'b2b', 'operations', 'marketing', 'admin'
  deadline DATE,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  prospect_id UUID REFERENCES prospects(id),
  contact_id UUID REFERENCES contacts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ─── TASK COMMENTS ────────────────────────────────
CREATE TABLE task_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WEEKLY REPORTS ───────────────────────────────
CREATE TABLE weekly_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_label TEXT NOT NULL, -- ex: "Semaine du 17 mars 2026"
  week_start DATE NOT NULL,
  authored_by UUID REFERENCES profiles(id),

  -- KPIs semaine
  prospects_contacted INTEGER DEFAULT 0,
  meetings_held INTEGER DEFAULT 0,
  proposals_sent INTEGER DEFAULT 0,
  orders_received INTEGER DEFAULT 0,
  revenue_generated NUMERIC(10,2) DEFAULT 0,

  -- Contenu
  wins TEXT,
  challenges TEXT,
  next_week_priorities TEXT,
  free_notes TEXT,

  -- Status
  status TEXT CHECK (status IN ('draft', 'submitted', 'read')) DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  edward_feedback TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── KPI HISTORY ──────────────────────────────────
CREATE TABLE kpi_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  prospects_total INTEGER DEFAULT 0,
  prospects_won INTEGER DEFAULT 0,
  prospects_in_pipeline INTEGER DEFAULT 0,
  monthly_b2b_revenue NUMERIC(10,2) DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SYNC LOG ─────────────────────────────────────
CREATE TABLE sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sync_type TEXT, -- 'google_sheets', 'export'
  status TEXT CHECK (status IN ('success', 'error')),
  rows_synced INTEGER,
  error_message TEXT,
  triggered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT, -- 'reminder', 'report', 'task', 'prospect'
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Both users can read/write everything (team app)
CREATE POLICY "Team members can do everything" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON prospects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON prospect_interactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON reminders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON contacts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON task_comments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON weekly_reports FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON kpi_snapshots FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON notifications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Team members can do everything" ON sync_log FOR ALL USING (auth.role() = 'authenticated');

-- ─── AUTO-UPDATE TRIGGERS ─────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prospects_updated BEFORE UPDATE ON prospects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON weekly_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = current_setting('app.edward_email', true) THEN 'edward' ELSE 'emy' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── INDEXES ──────────────────────────────────────
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_priority ON prospects(priority);
CREATE INDEX idx_prospects_sector ON prospects(sector);
CREATE INDEX idx_prospects_next_action_date ON prospects(next_action_date);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at) WHERE status = 'pending';
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_notifications_user ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_contacts_category ON contacts(category);
