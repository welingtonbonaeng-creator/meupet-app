'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { formatDate, formatCurrency, speciesEmoji } from '@/lib/utils'
import { EXPENSE_LABELS, type ExpenseCategory, type Expense } from '@/types'
import { Plus, Trash2, TrendingUp, Wallet } from 'lucide-react'

const EXPENSE_ICONS: Record<ExpenseCategory, string> = {
  food:'🍖', vet:'🏥', medicine:'💊', grooming:'✂️',
  accessory:'🎀', vaccine:'💉', exam:'🔬', other:'💳'
}

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  vet:       'bg-red-400',
  medicine:  'bg-purple-400',
  vaccine:   'bg-green-400',
  food:      'bg-orange-400',
  grooming:  'bg-pink-400',
  exam:      'bg-blue-400',
  accessory: 'bg-yellow-400',
  other:     'bg-slate-400',
}

const CATEGORIES = Object.keys(EXPENSE_LABELS) as ExpenseCategory[]

type EnrichedExpense = Expense & { pet_name: string; pet_photo: string | null; pet_species: string }

function groupByMonth(list: EnrichedExpense[]): { label: string; key: string; items: EnrichedExpense[]; total: number }[] {
  const map = new Map<string, EnrichedExpense[]>()
  list.forEach(e => {
    const d = new Date(e.expense_date + 'T12:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  })
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const [year, month] = key.split('-')
      const label = new Date(+year, +month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1), items, total: items.reduce((s, e) => s + e.amount_brl, 0) }
    })
}

export default function GastosPage() {
  const supabase = createClient()
  const { pets } = usePets()
  const [expenses, setExpenses]   = useState<EnrichedExpense[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [filterPet, setFilterPet] = useState('')
  const [form, setForm] = useState({
    pet_id: '', category: 'vet' as ExpenseCategory,
    title: '', amount_brl: '', expense_date: new Date().toISOString().slice(0, 10), notes: ''
  })

  async function load() {
    if (!pets.length) return
    const { data } = await supabase.from('pet_expenses').select('*')
      .in('pet_id', pets.map(p => p.id)).order('expense_date', { ascending: false })
    const enriched: EnrichedExpense[] = (data || []).map(e => {
      const pet = pets.find(p => p.id === e.pet_id)
      return { ...e, pet_name: pet?.name || '', pet_photo: pet?.photo_url || null, pet_species: pet?.species || 'other' }
    })
    setExpenses(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [pets])

  // Pre-fill pet_id when only one pet
  useEffect(() => {
    if (pets.length === 1 && !form.pet_id) setForm(p => ({ ...p, pet_id: pets[0].id }))
  }, [pets])

  async function save() {
    if (!form.pet_id || !form.amount_brl || !form.title) return
    setSaving(true)
    const { data } = await supabase.from('pet_expenses').insert({
      pet_id: form.pet_id, category: form.category, title: form.title,
      amount_brl: parseFloat(form.amount_brl), expense_date: form.expense_date, notes: form.notes || undefined
    }).select().single()
    if (data) {
      const pet = pets.find(p => p.id === data.pet_id)
      setExpenses(p => [{ ...data, pet_name: pet?.name || '', pet_photo: pet?.photo_url || null, pet_species: pet?.species || 'other' }, ...p])
    }
    setSaving(false)
    setModal(false)
    setForm({ pet_id: pets.length === 1 ? pets[0].id : '', category: 'vet', title: '', amount_brl: '', expense_date: new Date().toISOString().slice(0, 10), notes: '' })
  }

  async function del(id: string) {
    await supabase.from('pet_expenses').delete().eq('id', id)
    setExpenses(p => p.filter(e => e.id !== id))
  }

  const filtered   = filterPet ? expenses.filter(e => e.pet_id === filterPet) : expenses
  const now        = new Date()
  const thisMonth  = filtered.filter(e => {
    const d = new Date(e.expense_date + 'T12:00')
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalMonth = thisMonth.reduce((s, e) => s + e.amount_brl, 0)
  const totalAll   = filtered.reduce((s, e) => s + e.amount_brl, 0)
  const byCategory = CATEGORIES.map(cat => ({
    cat, total: filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount_brl, 0)
  })).filter(x => x.total > 0).sort((a, b) => b.total - a.total)
  const grouped = groupByMonth(filtered)

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Gastos" subtitle="Controle financeiro dos seus pets" />

      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-24">

        {/* Strip de avatares (filtro de pet) */}
        {pets.length > 1 && (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
            <button onClick={() => setFilterPet('')}
              className="flex flex-col items-center gap-1.5 shrink-0 transition-opacity"
              style={{ opacity: filterPet === '' ? 1 : 0.45 }}>
              <div className={`w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center ring-2 transition-all ${filterPet === '' ? 'ring-blue-500' : 'ring-slate-200 dark:ring-slate-600'}`}>
                <Wallet size={22} className="text-slate-500" />
              </div>
              <span className={`text-xs font-semibold ${filterPet === '' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>Todos</span>
            </button>
            {pets.map(p => (
              <button key={p.id} onClick={() => setFilterPet(p.id)}
                className="flex flex-col items-center gap-1.5 shrink-0 transition-opacity"
                style={{ opacity: filterPet === p.id ? 1 : 0.45 }}>
                <div className={`w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl ring-2 transition-all ${filterPet === p.id ? 'ring-blue-500' : 'ring-slate-200 dark:ring-slate-600'}`}>
                  {p.photo_url
                    ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    : speciesEmoji(p.species)
                  }
                </div>
                <span className={`text-xs font-semibold ${filterPet === p.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Mês atual</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalMonth)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total geral</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalAll)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Por categoria */}
        {byCategory.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" /> Por categoria
              </p>
              <div className="space-y-2.5">
                {byCategory.map(({ cat, total }) => {
                  const pct = totalAll > 0 ? (total / totalAll * 100) : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 dark:text-slate-300">{EXPENSE_ICONS[cat]} {EXPENSE_LABELS[cat]}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(total)}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${CATEGORY_COLORS[cat]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botão novo gasto */}
        <Button className="w-full gap-2" onClick={() => setModal(true)}>
          <Plus size={16} /> Novo gasto
        </Button>

        {/* Lista agrupada por mês */}
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-3">💳</div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Nenhum gasto registrado</p>
              <p className="text-xs text-slate-400 mt-1">Registre consultas, rações e outros gastos dos seus pets</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-5">
            {grouped.map(({ key, label, items, total }) => (
              <div key={key}>
                {/* Cabeçalho do mês */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</p>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(total)}</p>
                </div>
                <div className="space-y-2">
                  {items.map(e => (
                    <div key={e.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                      <div className="flex items-center gap-3 p-3.5">
                        {/* Foto do pet */}
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-base flex-shrink-0 ring-2 ring-slate-100 dark:ring-slate-600">
                          {e.pet_photo
                            ? <img src={e.pet_photo} alt={e.pet_name} className="w-full h-full object-cover" />
                            : speciesEmoji(e.pet_species)
                          }
                        </div>
                        {/* Ícone da categoria */}
                        <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-base flex-shrink-0">
                          {EXPENSE_ICONS[e.category]}
                        </div>
                        {/* Textos */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{e.title}</p>
                          <p className="text-xs mt-0.5">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{e.pet_name}</span>
                            <span className="text-slate-400"> · {EXPENSE_LABELS[e.category]} · {formatDate(e.expense_date)}</span>
                          </p>
                        </div>
                        {/* Valor + delete */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{formatCurrency(e.amount_brl)}</span>
                          <button onClick={() => del(e.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {e.notes && (
                        <p className="text-xs text-slate-400 px-3.5 pb-3">{e.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo gasto">
        <div className="p-5 space-y-3">
          {pets.length > 1 && (
            <Select label="Pet *" value={form.pet_id} onChange={e => setForm(p => ({ ...p, pet_id: e.target.value }))}
              options={[{ value: '', label: 'Selecione o pet' }, ...pets.map(p => ({ value: p.id, label: p.name }))]} />
          )}
          <Select label="Categoria *" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as ExpenseCategory }))}
            options={CATEGORIES.map(c => ({ value: c, label: `${EXPENSE_ICONS[c]} ${EXPENSE_LABELS[c]}` }))} />
          <Input label="Descrição *" placeholder="Ex: Consulta clínica geral" value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valor (R$) *" type="number" step="0.01" placeholder="0,00" value={form.amount_brl}
              onChange={e => setForm(p => ({ ...p, amount_brl: e.target.value }))} />
            <Input label="Data" type="date" value={form.expense_date}
              onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} />
          </div>
          <Input label="Observações" placeholder="Detalhes adicionais..." value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={save} disabled={!form.pet_id || !form.amount_brl || !form.title}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
