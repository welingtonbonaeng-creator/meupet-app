'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar }   from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { useNotifications } from '@/hooks/useNotifications'
import type { Profile } from '@/types'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()
  useNotifications()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar onLogout={handleLogout} planLabel={profile?.plan === 'premium' ? 'Premium' : profile?.plan === 'family' ? 'Família' : 'Grátis'} />
      <main className="flex-1 lg:ml-64 pb-16 lg:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
