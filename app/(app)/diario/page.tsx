'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { DIARY_TYPE_LABELS, DIARY_TYPE_ICONS, type DiaryEntry } from '@/types'
import { Calendar, Filter } from 'lucide-react'

export default function DiarioPage() {
  const supabase = createClient()
  const { pets } = usePets()
  const [entries, setEntries] = useState<(DiaryEntry & { pet_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPet, setFilterPet]   = useState('')
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    if (!pets.length) return
    supabase.from('pet_diary').select('*')
      .in('pet_id', pets.map(p => p.id))
      .order('occurred_at', { ascending: false })
      .then(({ data }) => {
        setEntries((data || []).map(e => ({
          ...e, pet_name: pets.find(p => p.id === e.pet_id)?.name || ''
        })))
        setLoading(false)
      })
  }, [pets])

  const filtered = entries
    .filter(e => !filterPet  || e.pet_id === filterPet)
    .filter(e => !filterType || e.type   === filterType)

  // Agrupar por mês
  const grouped = filtered.reduce<Record<string, (DiaryEntry & { pet_name: string })[]>>((acc, e) => {
    const d   = new Date(e.occurred_at)
    const key = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(e)
    return acc
  }, {})

  return (
    <div>
      <TopBar title="Diário" subtitle="Histórico de saúde dos seus pets" />

      <div className="p-4 lg:p-6 max-w-2xl space-y-4">
        {/* Filtros */}
        <div className="flex gap-2">
          <select className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterPet} onChange={e => setFilterPet(e.target.value)}>
            <option value="">Todos os pets</option>
            {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(DIARY_TYPE_LABELS).map(([k,v]) => (
              <option key={k} value={k}>{DIARY_TYPE_ICONS[k as keyof typeof DIARY_TYPE_ICONS]} {v}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-slate-500 text-sm">Nenhum registro encontrado</p>
            <p className="text-xs text-slate-400 mt-1">Acesse o perfil de um pet para adicionar registros</p>
          </CardContent></Card>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 capitalize">{month}</h3>
              <div className="space-y-2">
                {items.map(e => (
                  <Card key={e.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                          {DIARY_TYPE_ICONS[e.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-800 text-sm">{e.title}</span>
                            <Badge variant="info" className="text-[10px]">{e.pet_name}</Badge>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {DIARY_TYPE_LABELS[e.type]} · {formatDate(e.occurred_at)}
                          </div>
                          {e.description && <div className="text-xs text-slate-600 mt-1">{e.description}</div>}
                          {e.next_date && (
                            <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <Calendar size={10} /> Próximo: {formatDate(e.next_date)}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
