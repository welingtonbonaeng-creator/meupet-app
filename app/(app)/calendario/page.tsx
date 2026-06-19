'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate, speciesEmoji } from '@/lib/utils'
import { DIARY_TYPE_LABELS, DIARY_TYPE_ICONS, type DiaryEntry, type DiaryType } from '@/types'
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'

const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTHS   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ALL_TYPES: DiaryType[] = ['appointment','vaccine','deworming','exam','medication','bath','grooming','surgery','note','other']

const EVENT_DOT: Record<DiaryType, string> = {
  vaccine:     'bg-green-500',
  appointment: 'bg-red-400',
  deworming:   'bg-orange-400',
  exam:        'bg-blue-400',
  medication:  'bg-purple-400',
  bath:        'bg-cyan-400',
  grooming:    'bg-pink-400',
  surgery:     'bg-red-600',
  weight:      'bg-amber-400',
  note:        'bg-slate-400',
  other:       'bg-slate-400',
}

type EnrichedEntry = DiaryEntry & { pet_name: string; pet_photo: string | null; pet_species: string }

export default function CalendarioPage() {
  const supabase = createClient()
  const { pets } = usePets()
  const [today]  = useState(new Date())
  const [cursor, setCursor]           = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents]           = useState<EnrichedEntry[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [adding, setAdding]           = useState(false)
  const [addForm, setAddForm] = useState({
    pet_id: '', type: 'appointment' as DiaryType,
    title: '', next_date: '', notes: '',
  })

  useEffect(() => {
    if (!pets.length) return
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString().slice(0,10)
    const end   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).toISOString().slice(0,10)
    supabase.from('pet_diary').select('*')
      .in('pet_id', pets.map(p => p.id))
      .not('next_date', 'is', null)
      .gte('next_date', start).lte('next_date', end)
      .then(({ data }) => setEvents((data || []).map(e => {
        const pet = pets.find(p => p.id === e.pet_id)
        return { ...e, pet_name: pet?.name || '', pet_photo: pet?.photo_url || null, pet_species: pet?.species || 'other' }
      })))
  }, [pets, cursor])

  function openAdd(date: string) {
    setAddForm({ pet_id: pets[0]?.id || '', type: 'appointment', title: '', next_date: date, notes: '' })
    setShowAdd(true)
  }

  async function saveEvent() {
    if (!addForm.pet_id || !addForm.title.trim() || !addForm.next_date) return
    setAdding(true)
    const { data } = await supabase.from('pet_diary').insert({
      pet_id:      addForm.pet_id,
      type:        addForm.type,
      title:       addForm.title.trim(),
      occurred_at: addForm.next_date,
      next_date:   addForm.next_date,
      description: addForm.notes.trim() || undefined,
    }).select().single()
    if (data) {
      const pet = pets.find(p => p.id === addForm.pet_id)
      setEvents(prev => [...prev, { ...data, pet_name: pet?.name || '', pet_photo: pet?.photo_url || null, pet_species: pet?.species || 'other' }])
      setSelectedDay(addForm.next_date)
    }
    setAdding(false)
    setShowAdd(false)
  }

  const year        = cursor.getFullYear()
  const month       = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = new Date(year, month, 1).getDay()
  const cells       = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const eventsByDay: Record<string, EnrichedEntry[]> = {}
  events.forEach(e => {
    const d = e.next_date!.slice(0,10)
    if (!eventsByDay[d]) eventsByDay[d] = []
    eventsByDay[d].push(e)
  })

  const todayStr       = today.toISOString().slice(0,10)
  const dateStr        = (d: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isToday        = (d: number) => dateStr(d) === todayStr
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : []
  const upcomingAll    = events.filter(e => e.next_date! >= todayStr).sort((a,b) => a.next_date!.localeCompare(b.next_date!))

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Calendário" subtitle="Toque em uma data para ver ou adicionar eventos" />

      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-24">

        {/* Grade do calendário */}
        <Card>
          <CardContent className="p-4">
            {/* Navegação mês */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null) }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-slate-800 dark:text-slate-100">{MONTHS[month]} {year}</span>
              <button onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null) }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Cabeçalho dias da semana */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
              ))}
            </div>

            {/* Células */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const ds      = dateStr(day)
                const evts    = eventsByDay[ds] || []
                const hasEvts = evts.length > 0
                const isSel   = selectedDay === ds

                // dots únicos por tipo (máx 3)
                const uniqueTypes = [...new Set(evts.map(e => e.type))].slice(0, 3)

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => hasEvts ? setSelectedDay(isSel ? null : ds) : openAdd(ds)}
                    title={hasEvts ? `${evts.length} evento(s)` : 'Adicionar evento'}
                    className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all min-h-[52px] justify-start pt-1.5
                      ${isSel
                        ? 'bg-blue-600 shadow-md'
                        : hasEvts
                          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }
                      ${isToday(day) && !isSel ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <span className={`text-sm font-semibold leading-none
                      ${isSel ? 'text-white' : isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {day}
                    </span>

                    {/* Dots coloridos por tipo de evento */}
                    {hasEvts && (
                      <div className="flex items-center justify-center gap-[3px] mt-1">
                        {uniqueTypes.map((type, j) => (
                          <span key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white/80' : EVENT_DOT[type]}`} />
                        ))}
                        {evts.length > 3 && (
                          <span className={`text-[8px] font-bold leading-none ${isSel ? 'text-white/70' : 'text-slate-400'}`}>+</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Legenda com foto do pet */}
            {pets.length > 1 && (
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                {pets.map(p => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] flex-shrink-0">
                      {p.photo_url
                        ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                        : speciesEmoji(p.species)
                      }
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos do dia selecionado */}
        {selectedDay && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => openAdd(selectedDay)}
                className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">
                <Plus size={13} /> Novo evento
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-slate-400 text-sm mb-3">Nenhum evento neste dia</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => openAdd(selectedDay)}>
                    <Plus size={14} /> Adicionar evento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {selectedEvents.map(e => (
                    <div key={e.id} className="flex items-center gap-3 p-3.5">
                      {/* Foto do pet */}
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-base flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-600">
                        {e.pet_photo
                          ? <img src={e.pet_photo} alt={e.pet_name} className="w-full h-full object-cover" />
                          : speciesEmoji(e.pet_species)
                        }
                      </div>
                      {/* Ícone do tipo */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${EVENT_DOT[e.type].replace('bg-', 'bg-').replace('-500','-50').replace('-400','-50').replace('-600','-50')} bg-slate-50 dark:bg-slate-700`}>
                        {DIARY_TYPE_ICONS[e.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{e.title}</p>
                        <p className="text-xs mt-0.5">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{e.pet_name}</span>
                          <span className="text-slate-400"> · {DIARY_TYPE_LABELS[e.type]}</span>
                        </p>
                        {e.description && <p className="text-xs text-slate-400 mt-0.5">{e.description}</p>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Próximos eventos */}
        {!selectedDay && upcomingAll.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Próximos eventos</h3>
            <Card>
              <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-700/50">
                {upcomingAll.map(e => {
                  const d = Math.ceil((new Date(e.next_date! + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000)
                  return (
                    <div key={e.id} className="flex items-center gap-3 p-3.5">
                      {/* Foto do pet */}
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-base flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-600">
                        {e.pet_photo
                          ? <img src={e.pet_photo} alt={e.pet_name} className="w-full h-full object-cover" />
                          : speciesEmoji(e.pet_species)
                        }
                      </div>
                      {/* Dot colorido do tipo */}
                      <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-base flex-shrink-0">
                        {DIARY_TYPE_ICONS[e.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{e.title}</p>
                        <p className="text-xs mt-0.5">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{e.pet_name}</span>
                          <span className="text-slate-400"> · {formatDate(e.next_date!)}</span>
                        </p>
                      </div>
                      <Badge variant={d === 0 ? 'danger' : d === 1 ? 'warning' : d <= 7 ? 'info' : 'default'} className="text-[10px] flex-shrink-0">
                        {d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `em ${d}d`}
                      </Badge>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty state */}
        {!selectedDay && upcomingAll.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar size={40} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm font-medium mb-1">Nenhum evento agendado</p>
              <p className="text-slate-400 text-xs">Toque em qualquer data para criar um evento</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* FAB — novo evento */}
      <button
        onClick={() => openAdd(todayStr)}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-colors z-20"
        title="Novo evento"
      >
        <Plus size={24} />
      </button>

      {/* Modal criar evento */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo evento">
        <div className="p-5 space-y-3">
          {pets.length > 1 ? (
            <Select label="Pet *" value={addForm.pet_id}
              onChange={e => setAddForm(f => ({ ...f, pet_id: e.target.value }))}
              options={[{ value: '', label: 'Selecione o pet' }, ...pets.map(p => ({ value: p.id, label: `${speciesEmoji(p.species)} ${p.name}` }))]}
            />
          ) : pets.length === 1 && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center text-xs">
                {pets[0].photo_url
                  ? <img src={pets[0].photo_url} alt={pets[0].name} className="w-full h-full object-cover" />
                  : speciesEmoji(pets[0].species)
                }
              </div>
              <span className="font-medium">{pets[0].name}</span>
            </div>
          )}
          <Select label="Tipo *" value={addForm.type}
            onChange={e => setAddForm(f => ({ ...f, type: e.target.value as DiaryType }))}
            options={ALL_TYPES.map(t => ({ value: t, label: `${DIARY_TYPE_ICONS[t]} ${DIARY_TYPE_LABELS[t]}` }))}
          />
          <Input label="Título *" placeholder="Ex: Consulta anual, Vacina V10..."
            value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Data *" type="date" value={addForm.next_date}
            onChange={e => setAddForm(f => ({ ...f, next_date: e.target.value }))} />
          <Input label="Observações (opcional)" placeholder="Detalhes adicionais..."
            value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button className="flex-1" loading={adding}
              disabled={!addForm.title.trim() || !addForm.next_date || (!addForm.pet_id && pets.length > 1)}
              onClick={saveEvent}>
              Salvar evento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
