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
import { formatDate } from '@/lib/utils'
import { DIARY_TYPE_LABELS, DIARY_TYPE_ICONS, type DiaryEntry, type DiaryType } from '@/types'
import { ChevronLeft, ChevronRight, Calendar, Plus } from 'lucide-react'

const WEEKDAYS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTHS    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const ALL_TYPES: DiaryType[] = ['appointment','vaccine','deworming','exam','medication','bath','grooming','surgery','note','other']

export default function CalendarioPage() {
  const supabase = createClient()
  const { pets } = usePets()
  const [today]  = useState(new Date())
  const [cursor, setCursor]           = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents]           = useState<(DiaryEntry & { pet_name: string })[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Adicionar evento
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding]   = useState(false)
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
      .then(({ data }) => setEvents((data || []).map(e => ({
        ...e, pet_name: pets.find(p => p.id === e.pet_id)?.name || ''
      }))))
  }, [pets, cursor])

  // Pré-preenche a data ao abrir o modal
  function openAdd() {
    setAddForm(f => ({ ...f, next_date: selectedDay || today.toISOString().slice(0,10), pet_id: pets[0]?.id || '' }))
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
      const pet_name = pets.find(p => p.id === addForm.pet_id)?.name || ''
      setEvents(prev => [...prev, { ...data, pet_name }])
      setSelectedDay(addForm.next_date)
    }
    setAdding(false)
    setShowAdd(false)
    setAddForm({ pet_id: '', type: 'appointment', title: '', next_date: '', notes: '' })
  }

  const year        = cursor.getFullYear()
  const month       = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow    = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({length: daysInMonth}, (_,i) => i+1)]

  const eventsByDay: Record<string, (DiaryEntry & { pet_name: string })[]> = {}
  events.forEach(e => {
    const d = e.next_date!.slice(0,10)
    if (!eventsByDay[d]) eventsByDay[d] = []
    eventsByDay[d].push(e)
  })

  const todayStr      = today.toISOString().slice(0,10)
  const dateStr       = (d: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const isToday       = (d: number) => dateStr(d) === todayStr
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : []

  const upcomingAll = events
    .filter(e => e.next_date! >= todayStr)
    .sort((a,b) => a.next_date!.localeCompare(b.next_date!))

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Calendário" subtitle="Próximos eventos e compromissos" />

      <div className="flex-1 overflow-auto p-4 lg:p-6 max-w-2xl space-y-4 pb-24">

        {/* Calendário */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCursor(new Date(year, month - 1, 1))}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <span className="font-bold text-slate-800 dark:text-slate-100">{MONTHS[month]} {year}</span>
              <button onClick={() => setCursor(new Date(year, month + 1, 1))}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const ds    = dateStr(day)
                const evts  = eventsByDay[ds] || []
                const isSel = selectedDay === ds
                return (
                  <button key={i} type="button"
                    onClick={() => setSelectedDay(isSel ? null : ds)}
                    className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all
                      ${isSel ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}
                      ${isToday(day) && !isSel ? 'ring-2 ring-blue-500' : ''}`}>
                    <span className={`text-sm font-semibold
                      ${isSel ? 'text-white' : isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {day}
                    </span>
                    {evts.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {evts.slice(0,3).map((_,j) => (
                          <div key={j} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-blue-200' : 'bg-blue-500'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Botão adicionar evento */}
        <Button className="w-full gap-2" onClick={openAdd}>
          <Plus size={16} /> Adicionar evento
        </Button>

        {/* Eventos do dia selecionado */}
        {selectedDay && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
              {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })}
            </h3>
            {selectedEvents.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-slate-400 text-sm mb-3">Nenhum evento neste dia</p>
                  <Button size="sm" variant="outline" className="gap-1" onClick={openAdd}>
                    <Plus size={14} /> Adicionar evento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {selectedEvents.map(e => (
                  <Card key={e.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-lg flex-shrink-0">
                          {DIARY_TYPE_ICONS[e.type]}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{e.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{e.pet_name} · {DIARY_TYPE_LABELS[e.type]}</div>
                          {e.description && <div className="text-xs text-slate-400 mt-0.5">{e.description}</div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Próximos eventos */}
        {!selectedDay && upcomingAll.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Próximos eventos</h3>
            <div className="space-y-2">
              {upcomingAll.map(e => {
                const d = Math.ceil((new Date(e.next_date! + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000)
                return (
                  <Card key={e.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-lg flex-shrink-0">
                          {DIARY_TYPE_ICONS[e.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{e.title}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{e.pet_name} · {formatDate(e.next_date!)}</div>
                        </div>
                        <Badge variant={d === 0 ? 'danger' : d === 1 ? 'warning' : d <= 7 ? 'info' : 'default'} className="text-[10px] flex-shrink-0">
                          {d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : `${d}d`}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {!selectedDay && upcomingAll.length === 0 && (
          <Card><CardContent className="p-8 text-center">
            <Calendar size={40} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Nenhum evento futuro agendado</p>
          </CardContent></Card>
        )}
      </div>

      {/* Modal adicionar evento */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Novo evento">
        <div className="p-5 space-y-3">
          {pets.length > 1 && (
            <Select label="Pet *"
              value={addForm.pet_id}
              onChange={e => setAddForm(f => ({ ...f, pet_id: e.target.value }))}
              options={[{ value:'', label:'Selecione o pet' }, ...pets.map(p => ({ value: p.id, label: p.name }))]}
            />
          )}
          <Select label="Tipo *"
            value={addForm.type}
            onChange={e => setAddForm(f => ({ ...f, type: e.target.value as DiaryType }))}
            options={ALL_TYPES.map(t => ({ value: t, label: `${DIARY_TYPE_ICONS[t]} ${DIARY_TYPE_LABELS[t]}` }))}
          />
          <Input label="Título *" placeholder="Ex: Consulta anual, Vacina V10..."
            value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} />
          <Input label="Data *" type="date"
            value={addForm.next_date} onChange={e => setAddForm(f => ({ ...f, next_date: e.target.value }))} />
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
