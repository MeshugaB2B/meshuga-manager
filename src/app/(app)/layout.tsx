import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'

async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  let notifCount = 0
  if (profile?.role === 'edward') {
    const { count } = await supabase
      .from('weekly_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'submitted')
    notifCount = count || 0
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar profile={profile} notifCount={notifCount} />
      <main className="ml-56 flex-1 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}

export default AppShell
