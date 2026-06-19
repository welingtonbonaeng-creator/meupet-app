'use client'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface TopBarProps { title: string; subtitle?: string; userName?: string; leftAction?: React.ReactNode }

type NotifStatus = 'default' | 'granted' | 'denied' | 'unsupported'

export function TopBar({ title, subtitle, userName, leftAction }: TopBarProps) {
  const [status, setStatus]   = useState<NotifStatus>('unsupported')
  const [open, setOpen]       = useState(false)
  const [feedback, setFeedback] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setStatus(Notification.permission as NotifStatus)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function requestPermission() {
    if (status !== 'default') return
    const result = await Notification.requestPermission()
    setStatus(result as NotifStatus)
    if (result === 'granted') {
      setFeedback('Notificações ativadas!')
      new Notification('MeuPet+', { body: 'Você receberá lembretes dos eventos do seu pet.' })
      setTimeout(() => { setFeedback(''); setOpen(false) }, 2000)
    } else {
      setFeedback('Permissão negada.')
      setTimeout(() => setFeedback(''), 2000)
    }
  }

  const dotColor = status === 'granted' ? 'bg-green-500' : status === 'denied' ? 'bg-red-400' : 'bg-blue-600'
  const showDot  = status !== 'unsupported'

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700 transition-colors">
      <div className="flex items-center gap-2 px-4 lg:px-6 h-14">
        {leftAction}
        <div className="flex-1">
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setOpen(v => !v)}
              className="relative p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {status === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
              {showDot && <span className={`absolute top-1.5 right-1.5 w-2 h-2 ${dotColor} rounded-full`} />}
            </button>

            {open && (
              <div className="absolute right-0 top-11 w-72 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-4 z-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Notificações</span>
                  <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X size={16} />
                  </button>
                </div>

                {status === 'unsupported' && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Seu navegador não suporta notificações.
                  </p>
                )}

                {status === 'granted' && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check size={18} />
                    <span className="text-sm font-medium">Notificações ativas</span>
                  </div>
                )}

                {status === 'denied' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-500">
                      <BellOff size={18} />
                      <span className="text-sm font-medium">Notificações bloqueadas</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Para ativar, vá nas configurações do seu navegador e permita notificações para este site.
                    </p>
                  </div>
                )}

                {status === 'default' && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Receba lembretes de vacinas, consultas e eventos do seu pet.
                    </p>
                    {feedback
                      ? <p className="text-sm font-medium text-blue-600 dark:text-blue-400">{feedback}</p>
                      : (
                        <button
                          onClick={requestPermission}
                          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                        >
                          Ativar notificações
                        </button>
                      )
                    }
                  </div>
                )}
              </div>
            )}
          </div>

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
