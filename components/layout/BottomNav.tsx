'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Heart, BookOpen, Sparkles, Settings } from 'lucide-react'

const items = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Home' },
  { href: '/pets',          icon: Heart,           label: 'Pets' },
  { href: '/diario',        icon: BookOpen,        label: 'Diário' },
  { href: '/nutricao',      icon: Sparkles,        label: 'IA' },
  { href: '/configuracoes', icon: Settings,        label: 'Config' },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 safe-bottom transition-colors">
      <div className="grid grid-cols-5 h-16">
        {items.map(item => {
          const Icon = item.icon
          const active = path.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
