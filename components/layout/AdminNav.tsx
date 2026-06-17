'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/ThemeProvider'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, CreditCard, LifeBuoy, ArrowLeft, Shield, LogOut, Menu, X, Sun, Moon } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/usuarios',  icon: Users,           label: 'Usuários' },
  { href: '/admin/vendas',    icon: CreditCard,      label: 'Vendas' },
  { href: '/admin/suporte',   icon: LifeBuoy,        label: 'Suporte' },
]

function NavLinks({ path, onClick }: { path: string; onClick?: () => void }) {
  return (
    <>
      {navItems.map(item => {
        const Icon = item.icon
        const active = path.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} onClick={onClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all',
              active
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}>
            <Icon size={18} className={active ? 'text-blue-400' : 'text-slate-500'} />
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

export function AdminNav() {
  const path = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-slate-900 fixed top-0 left-0 z-40">
        {/* Logo admin */}
        <div className="px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-none">MeuPet<span className="text-blue-400">+</span></div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-widest">Admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          <NavLinks path={path} />
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1">
          {/* Toggle claro/escuro */}
          <button onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all w-full">
            {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-blue-400" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <ArrowLeft size={16} /> Voltar ao app
          </Link>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all w-full">
            <LogOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-white/10 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-400" />
          <span className="font-bold text-white text-sm">Admin Panel</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-slate-400 hover:text-white">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-slate-900 flex flex-col min-h-screen pt-16">
            <nav className="flex-1 px-3 py-4">
              <NavLinks path={path} onClick={() => setMobileOpen(false)} />
            </nav>
            <div className="p-4 border-t border-white/10 space-y-1">
              <button onClick={toggleTheme}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white w-full">
                {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-blue-400" />}
                {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              </button>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white">
                <ArrowLeft size={16} /> Voltar ao app
              </Link>
              <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 w-full">
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  )
}
