import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/ui/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  let notifCount = 0
  if (profile.role === 'edward') {
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
