'use client'
import { Bell } from 'lucide-react'

interface TopBarProps { title: string; subtitle?: string; userName?: string; leftAction?: React.ReactNode }

export function TopBar({ title, subtitle, userName, leftAction }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700 transition-colors">
      <div className="flex items-center gap-2 px-4 lg:px-6 h-14">
        {leftAction}
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
          </button>
          {userName && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white text-xs font-bold">
              {userName[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
