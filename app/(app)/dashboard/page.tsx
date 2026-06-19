'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, petAge, weightStatus, speciesEmoji, formatCurrency } from '@/lib/utils'
import type { Profile, DiaryEntry } from '@/types'
import { DIARY_TYPE_LABELS, DIARY_TYPE_ICONS } from '@/types'
import {
  Heart, Calendar, Syringe, TrendingUp, Star, Bell, Plus, ChevronRight, BookOpen, Weight
} from 'lucide-react'

type UpcomingEntry = DiaryEntry & { pet_name: string; pet_photo: string | null; pet_species: string }

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [profile, setProfile]         = useState<Profile | null>(null)
  const [upcoming, setUpcoming]       = useState<UpcomingEntry[]>([])
  const [totalExpenses, setTotal]     = useState(0)
  const [notifPermission, setNotifPermission] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
    if ('Notification' in window) setNotifPermission(Notification.permission)
  }, [])

  useEffect(() => {
    if (!pets.length) return
    const petIds = pets.map(p => p.id)
    const today  = new Date().toISOString().slice(0, 10)

    supabase.from('pet_diary').select('*').in('pet_id', petIds)
      .not('next_date', 'is', null).gte('next_date', today)
      .order('next_date').limit(10)
      .then(({ data }) => {
        const entries: UpcomingEntry[] = (data || []).map(e => {
          const pet = pets.find(p => p.id === e.pet_id)
          return { ...e, pet_name: pet?.name || '', pet_photo: pet?.photo_url || null, pet_species: pet?.species || 'other' }
        })
        setUpcoming(entries)

        // Notificação do dia
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          const key = `meupet_notified_${today}`
          if (!localStorage.getItem(key)) {
            entries.filter(e => e.next_date?.slice(0,10) === today).forEach(e => {
              try { new Notification(`🐾 ${e.pet_name} — ${e.title}`, { body: `${DIARY_TYPE_LABELS[e.type]} agendado para hoje!`, icon: '/meupet-app/icons/icon-192.png' }) } catch {}
            })
            localStorage.setItem(key, '1')
          }
        }
      })

    const firstOfMonth = new Date(); firstOfMonth.setDate(1)
    supabase.from('pet_expenses').select('amount_brl').in('pet_id', petIds)
      .gte('expense_date', firstOfMonth.toISOString().slice(0, 10))
      .then(({ data }) => setTotal((data || []).reduce((s, e) => s + e.amount_brl, 0)))
  }, [pets])

  async function requestNotifPermission() {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifPermission(perm)
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const firstName = profile?.name?.split(' ')[0] || 'Tutor'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const nextVaccine = upcoming.find(e => e.type === 'vaccine')
  const nextAppoint = upcoming.find(e => e.type === 'appointment')

  return (
    <div className="flex flex-col h-full">
      <TopBar title={`${greeting}, ${firstName}! 👋`} subtitle="Resumo dos seus pets" userName={profile?.name} />

      <div className="flex-1 overflow-auto p-4 space-y-5 max-w-2xl mx-auto w-full pb-24">

        {/* Banner notificações */}
        {notifPermission === 'default' && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-blue-500 flex-shrink-0" />
              <span className="text-xs text-blue-700 dark:text-blue-300">Ative notificações para lembretes dos eventos</span>
            </div>
            <Button size="sm" onClick={requestNotifPermission} className="flex-shrink-0 text-xs">Ativar</Button>
          </div>
        )}

        {/* Ações rápidas */}
        {pets.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Plus,     label: 'Registro', href: '/pets',        color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' },
              { icon: Weight,   label: 'Peso',     href: '/peso',        color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' },
              { icon: BookOpen, label: 'Diário',   href: '/diario',      color: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600' },
              { icon: Calendar, label: 'Agenda',   href: '/calendario',  color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' },
            ].map(({ icon: Icon, label, href, color }) => (
              <Link key={label} href={href}>
                <div className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Próximos eventos */}
        {pets.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Próximos eventos</h2>
              <Link href="/calendario" className="text-xs text-blue-600 flex items-center gap-1">
                Ver todos <ChevronRight size={12} />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl">📅</div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum evento agendado</p>
                    <p className="text-xs text-slate-400 mt-0.5">Adicione vacinas, consultas e lembretes no perfil do pet</p>
                  </div>
                  <Link href="/pets">
                    <Button size="sm" variant="outline" className="gap-1"><Plus size={13} /> Agendar evento</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {upcoming.slice(0, 6).map(entry => {
                    const ds       = entry.next_date?.slice(0,10) || ''
                    const daysLeft = Math.ceil((new Date(ds + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000)
                    return (
                      <div key={entry.id} className="flex items-center gap-3 p-3.5">
                        {/* Foto do pet */}
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-600">
                          {entry.pet_photo
                            ? <img src={entry.pet_photo} alt={entry.pet_name} className="w-full h-full object-cover" />
                            : speciesEmoji(entry.pet_species)
                          }
                        </div>
                        {/* Tipo do evento */}
                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-base flex-shrink-0">
                          {DIARY_TYPE_ICONS[entry.type]}
                        </div>
                        {/* Textos */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{entry.title}</p>
                          <p className="text-xs mt-0.5">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{entry.pet_name}</span>
                            <span className="text-slate-400"> · {DIARY_TYPE_LABELS[entry.type]}</span>
                          </p>
                        </div>
                        {/* Badge urgência */}
                        <div className="flex-shrink-0 text-right">
                          <p className="text-[10px] text-slate-400 mb-0.5">{formatDate(entry.next_date!)}</p>
                          <Badge variant={daysLeft === 0 ? 'danger' : daysLeft === 1 ? 'warning' : 'info'} className="text-[10px]">
                            {daysLeft === 0 ? 'Hoje' : daysLeft === 1 ? 'Amanhã' : `em ${daysLeft}d`}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Meus Pets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Meus Pets</h2>
            <Link href="/pets/novo">
              <Button size="sm" className="gap-1"><Plus size={14} /> Novo pet</Button>
            </Link>
          </div>
          {petsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1,2].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 animate-pulse" />)}
            </div>
          ) : pets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">🐾</div>
                <p className="text-slate-500 text-sm mb-4">Nenhum pet cadastrado ainda</p>
                <Link href="/pets/novo"><Button>Cadastrar primeiro pet</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pets.map(pet => {
                const ws = pet.weight_kg && pet.ideal_weight ? weightStatus(pet.weight_kg, pet.ideal_weight) : null
                return (
                  <Link key={pet.id} href={`/pets?id=${pet.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center text-xl flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-700">
                            {pet.photo_url
                              ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                              : speciesEmoji(pet.species)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">{pet.name}</p>
                            <p className="text-xs text-slate-400 truncate">{pet.breed || pet.species}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-400">{pet.weight_kg ? `${pet.weight_kg} kg` : '—'}</span>
                          {ws && <span className={`text-[11px] font-semibold ${ws.color}`}>{ws.icon} {ws.label}</span>}
                          {!ws && pet.birth_date && <span className="text-xs text-slate-400">{petAge(pet.birth_date)}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Heart size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{pets.length}</p>
                <p className="text-xs text-slate-500 mt-0.5">Pets cadastrados</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{formatCurrency(totalExpenses)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Gastos no mês</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Syringe size={18} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {nextVaccine ? formatDate(nextVaccine.next_date!) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Próxima vacina</p>
                {nextVaccine && <p className="text-[10px] text-green-600 font-medium truncate">{nextVaccine.pet_name}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Calendar size={18} className="text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {nextAppoint ? formatDate(nextAppoint.next_date!) : '—'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Próxima consulta</p>
                {nextAppoint && <p className="text-[10px] text-amber-600 font-medium truncate">{nextAppoint.pet_name}</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Banner Premium */}
        {profile?.plan === 'free' && (
          <Card className="bg-gradient-to-r from-blue-600 to-blue-500 border-0 text-white">
            <CardContent className="p-4 flex items-center gap-3">
              <Star size={22} className="text-yellow-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Upgrade para Premium</p>
                <p className="text-blue-100 text-xs mt-0.5">IA de nutrição, relatórios PDF e muito mais</p>
              </div>
              <Button variant="outline" size="sm" className="bg-white text-blue-700 border-white hover:bg-blue-50 flex-shrink-0 text-xs">
                Ver planos
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
