'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Heart, BookOpen, Calendar, Scale,
  Wallet, Brain, Dumbbell, Star, FileText, Settings, LogOut, LifeBuoy
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/pets',          icon: Heart,           label: 'Meus Pets' },
  { href: '/diario',        icon: BookOpen,        label: 'Diário' },
  { href: '/calendario',    icon: Calendar,        label: 'Calendário' },
  { href: '/peso',          icon: Scale,           label: 'Peso' },
  { href: '/gastos',        icon: Wallet,          label: 'Gastos' },
  { href: '/nutricao',      icon: Brain,           label: 'Nutrição IA', premium: true },
  { href: '/adestramento',  icon: Dumbbell,        label: 'Adestramento IA', premium: true },
  { href: '/personalidade', icon: Star,            label: 'Personalidade IA', premium: true },
  { href: '/relatorios',    icon: FileText,        label: 'Relatórios', premium: true },
  { href: '/suporte',       icon: LifeBuoy,        label: 'Suporte' },
  { href: '/configuracoes', icon: Settings,        label: 'Configurações' },
]

interface SidebarProps { onLogout: () => void; planLabel?: string }

export function Sidebar({ onLogout, planLabel = 'Grátis' }: SidebarProps) {
  const path = usePathname()
  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-700 fixed top-0 left-0 z-40 transition-colors">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-sm">
            <span className="text-white text-lg">🐾</span>
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-100 text-base leading-none">MeuPet<span className="text-blue-600">+</span></div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium uppercase tracking-wide">{planLabel}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon
          const active = path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all',
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              <Icon size={18} className={active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'} />
              <span className="flex-1">{item.label}</span>
              {item.premium && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">PRO</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-700">
        <button onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full">
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  )
}
