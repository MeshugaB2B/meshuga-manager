export type Role = 'edward' | 'emy'

export type Profile = {
  id: string
  email: string
  full_name: string
  role: Role
  avatar_url?: string
  phone?: string
  whatsapp?: string
}

export type ProspectStatus =
  | 'to_contact' | 'contacted' | 'meeting_scheduled'
  | 'proposal_sent' | 'negotiation' | 'won' | 'lost' | 'on_hold'

export type ProspectPriority = 'high' | 'medium' | 'low'

export type Prospect = {
  id: string
  company_name: string
  contact_name?: string
  contact_title?: string
  email?: string
  phone?: string
  whatsapp?: string
  address?: string
  arrondissement?: string
  sector?: string
  status: ProspectStatus
  priority: ProspectPriority
  potential_value?: string
  estimated_monthly_revenue?: number
  source?: string
  notes?: string
  tags?: string[]
  next_action?: string
  next_action_date?: string
  assigned_to?: string
  created_by?: string
  created_at: string
  updated_at: string
  last_contacted_at?: string
  // joins
  assigned_profile?: Profile
  interactions?: ProspectInteraction[]
  reminders?: Reminder[]
}

export type InteractionType = 'call' | 'email' | 'meeting' | 'whatsapp' | 'visit' | 'note'

export type ProspectInteraction = {
  id: string
  prospect_id: string
  type: InteractionType
  summary: string
  outcome?: string
  next_step?: string
  created_by: string
  created_at: string
  author?: Profile
}

export type ReminderChannel = 'app' | 'email' | 'whatsapp' | 'sms'

export type Reminder = {
  id: string
  prospect_id?: string
  title: string
  message?: string
  remind_at: string
  channels: ReminderChannel[]
  status: 'pending' | 'sent' | 'dismissed'
  created_by: string
  assigned_to: string
  created_at: string
  prospect?: Prospect
}

export type ContactCategory =
  | 'fournisseur' | 'client_b2b' | 'partenaire' | 'presse' | 'livreur' | 'autre'

export type Contact = {
  id: string
  category: ContactCategory
  company_name?: string
  full_name: string
  title?: string
  email?: string
  phone?: string
  whatsapp?: string
  address?: string
  website?: string
  instagram?: string
  notes?: string
  tags?: string[]
  is_vip: boolean
  contract_start?: string
  contract_end?: string
  payment_terms?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

export type Task = {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: ProspectPriority
  category?: string
  deadline?: string
  assigned_to?: string
  created_by?: string
  prospect_id?: string
  contact_id?: string
  created_at: string
  updated_at: string
  completed_at?: string
  assignee?: Profile
  comments?: TaskComment[]
}

export type TaskComment = {
  id: string
  task_id: string
  content: string
  created_by: string
  created_at: string
  author?: Profile
}

export type WeeklyReport = {
  id: string
  week_label: string
  week_start: string
  authored_by: string
  prospects_contacted: number
  meetings_held: number
  proposals_sent: number
  orders_received: number
  revenue_generated: number
  wins?: string
  challenges?: string
  next_week_priorities?: string
  free_notes?: string
  status: 'draft' | 'submitted' | 'read'
  submitted_at?: string
  read_at?: string
  edward_feedback?: string
  created_at: string
  author?: Profile
}

export type Notification = {
  id: string
  user_id: string
  title: string
  message?: string
  type: string
  link?: string
  is_read: boolean
  created_at: string
}

// Filter types
export type ProspectFilters = {
  status?: ProspectStatus[]
  priority?: ProspectPriority[]
  sector?: string[]
  arrondissement?: string[]
  assigned_to?: string[]
  has_next_action?: boolean
  overdue?: boolean
  search?: string
  tags?: string[]
}

export type ContactFilters = {
  category?: ContactCategory[]
  is_vip?: boolean
  search?: string
  tags?: string[]
}
