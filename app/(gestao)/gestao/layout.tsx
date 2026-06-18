'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gestao } from '@/lib/gestao'
import Link from 'next/link'
import { Users, LifeBuoy, Key, LogOut, Shield, Menu, X, BarChart2, DollarSign, LayoutDashboard } from 'lucide-react'

const navItems = [
  { href: '/gestao/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/gestao/faturamento', icon: DollarSign,      label: 'Faturamento' },
  { href: '/gestao/usuarios',    icon: Users,            label: 'Usuários' },
  { href: '/gestao/suporte',     icon: LifeBuoy,         label: 'Suporte' },
  { href: '/gestao/tokens',      icon: Key,              label: 'Tokens' },
]

function Sidebar({ onLogout, onClose }: { onLogout: () => void; onClose?: () => void }) {
  const path = usePathname()
  return (
    <div className="flex flex-col h-full bg-slate-900 w-64">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Shield size={17} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">MeuPet<span className="text-blue-400">+</span></div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Gestão</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon
          const active = path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}>
              <Icon size={17} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all w-full">
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  )
}

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const path = usePathname()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (path === '/gestao/login') { setChecking(false); return }

    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/gestao/login'); return }

      // Usar sessionStorage para não chamar a Edge Function a cada navegação
      const cached = sessionStorage.getItem('gestao_uid')
      if (cached === session.user.id) { setChecking(false); return }

      try {
        const result = await gestao('check_admin')
        if (result.ok) {
          sessionStorage.setItem('gestao_uid', session.user.id)
          setChecking(false)
        } else {
          router.push('/gestao/login')
        }
      } catch {
        router.push('/gestao/login')
      }
    }
    check()
  }, [path])

  async function logout() {
    sessionStorage.removeItem('gestao_uid')
    await supabase.auth.signOut()
    router.push('/gestao/login')
  }

  if (path === '/gestao/login') return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Shield size={32} className="text-blue-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-400 text-sm">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen fixed top-0 left-0 z-40">
        <Sidebar onLogout={logout} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-400" />
          <span className="font-bold text-white text-sm">Gestão</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-400 hover:text-white">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <Sidebar onLogout={logout} onClose={() => setMobileOpen(false)} />
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0 text-slate-100">
        {children}
      </main>
    </div>
  )
}
