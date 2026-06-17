'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AdminNav } from '@/components/layout/AdminNav'
import { Shield } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)

  // Forçar dark mode enquanto no painel admin, restaurar ao sair
  useEffect(() => {
    const html = document.documentElement
    const hadDark = html.classList.contains('dark')
    html.classList.add('dark')
    return () => {
      if (!hadDark) html.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setChecking(false)
    }
    check()
  }, [])

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <Shield size={32} className="text-blue-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-400 text-sm">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminNav />
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
