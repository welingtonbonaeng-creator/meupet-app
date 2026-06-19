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
  Heart, Calendar, Syringe, Scale, Plus, ChevronRight,
  AlertCircle, TrendingUp, Star
} from 'lucide-react'

export default function DashboardPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [upcoming, setUpcoming]   = useState<(DiaryEntry & { pet_name: string })[]>([])
  const [totalExpenses, setTotal] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) setProfile(data) })
    })
  }, [])

  useEffect(() => {
    if (!pets.length) return
    const petIds = pets.map(p => p.id)
    const today  = new Date().toISOString().slice(0, 10)

    // Próximos eventos (vacinas, consultas, etc.)
    supabase.from('pet_diary').select('*').in('pet_id', petIds)
      .not('next_date', 'is', null).gte('next_date', today)
      .order('next_date').limit(5)
      .then(({ data }) => {
        const entries = (data || []).map(e => ({
          ...e,
          pet_name: pets.find(p => p.id === e.pet_id)?.name || ''
        }))
        setUpcoming(entries)
      })

    // Total de gastos no mês
    const firstOfMonth = new Date(); firstOfMonth.setDate(1)
    supabase.from('pet_expenses').select('amount_brl').in('pet_id', petIds)
      .gte('expense_date', firstOfMonth.toISOString().slice(0, 10))
      .then(({ data }) => setTotal((data || []).reduce((s, e) => s + e.amount_brl, 0)))
  }, [pets])

  const firstName = profile?.name?.split(' ')[0] || 'Tutor'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  const nextVaccine  = upcoming.find(e => e.type === 'vaccine')
  const nextAppoint  = upcoming.find(e => e.type === 'appointment')
  const nextDeworming = upcoming.find(e => e.type === 'deworming')

  return (
    <div className="flex flex-col h-full">
      <TopBar title={`${greeting}, ${firstName}! 👋`} subtitle="Aqui está o resumo dos seus pets" userName={profile?.name} />

      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-6 max-w-5xl pb-24">

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                  <Heart size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pets.length}</div>
                  <div className="text-xs text-slate-500">Pets cadastrados</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <Syringe size={20} className="text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {nextVaccine ? formatDate(nextVaccine.next_date!) : '—'}
                  </div>
                  <div className="text-xs text-slate-500">Próxima vacina</div>
                  {nextVaccine && <div className="text-[10px] text-green-600">{nextVaccine.pet_name}</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Calendar size={20} className="text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {nextAppoint ? formatDate(nextAppoint.next_date!) : '—'}
                  </div>
                  <div className="text-xs text-slate-500">Próxima consulta</div>
                  {nextAppoint && <div className="text-[10px] text-amber-600">{nextAppoint.pet_name}</div>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <TrendingUp size={20} className="text-purple-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalExpenses)}</div>
                  <div className="text-xs text-slate-500">Gastos no mês</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meus Pets */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Meus Pets</h2>
            <Link href="/pets/novo">
              <Button size="sm" className="gap-1"><Plus size={14} /> Novo pet</Button>
            </Link>
          </div>
          {petsLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {pets.map(pet => {
                const ws = pet.weight_kg && pet.ideal_weight ? weightStatus(pet.weight_kg, pet.ideal_weight) : null
                return (
                  <Link key={pet.id} href={`/pets?id=${pet.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-2xl flex-shrink-0">
                            {pet.photo_url
                              ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                              : speciesEmoji(pet.species)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100 truncate">{pet.name}</div>
                            <div className="text-xs text-slate-500 truncate">{pet.breed || pet.species}</div>
                            {pet.birth_date && (
                              <div className="text-xs text-slate-400">{petAge(pet.birth_date)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500">
                            {pet.weight_kg ? `${pet.weight_kg} kg` : 'Sem peso'}
                          </div>
                          {ws && <span className={`text-xs font-medium ${ws.color}`}>{ws.icon} {ws.label}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Próximos eventos */}
        {upcoming.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Próximos eventos</h2>
              <Link href="/calendario" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                Ver calendário <ChevronRight size={12} />
              </Link>
            </div>
            <Card>
              <CardContent className="p-0 divide-y divide-slate-50">
                {upcoming.map(entry => {
                  const daysLeft = Math.ceil((new Date(entry.next_date!).getTime() - Date.now()) / 86400000)
                  const urgent   = daysLeft <= 7
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${urgent ? 'bg-red-50' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                        {DIARY_TYPE_ICONS[entry.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{entry.title}</div>
                        <div className="text-xs text-slate-500">{entry.pet_name} · {DIARY_TYPE_LABELS[entry.type]}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{formatDate(entry.next_date!)}</div>
                        <Badge variant={urgent ? 'danger' : 'info'} className="text-[10px] mt-0.5">
                          {daysLeft === 0 ? 'Hoje' : daysLeft === 1 ? 'Amanhã' : `${daysLeft}d`}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Banner Premium */}
        {profile?.plan === 'free' && (
          <Card className="bg-gradient-to-r from-blue-600 to-blue-500 border-0 text-white overflow-hidden relative">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Star size={24} className="text-yellow-300 flex-shrink-0" />
                <div className="flex-1">
                  <div className="font-bold text-base">Upgrade para Premium</div>
                  <div className="text-blue-100 text-sm">IA de nutrição, adestramento, relatórios PDF e muito mais</div>
                </div>
                <Button variant="outline" size="sm" className="bg-white text-blue-700 border-white hover:bg-blue-50 dark:bg-blue-900/30 flex-shrink-0">
                  Ver planos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
