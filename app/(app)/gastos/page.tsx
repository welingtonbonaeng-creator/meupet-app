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
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import { EXPENSE_LABELS, type ExpenseCategory, type Expense } from '@/types'
import { Plus, Trash2, TrendingUp } from 'lucide-react'

const EXPENSE_ICONS: Record<ExpenseCategory, string> = {
  food:'🍖', vet:'🏥', medicine:'💊', grooming:'✂️',
  accessory:'🎀', vaccine:'💉', exam:'🔬', other:'💳'
}

const CATEGORIES = Object.keys(EXPENSE_LABELS) as ExpenseCategory[]

export default function GastosPage() {
  const supabase = createClient()
  const { pets } = usePets()
  const [expenses, setExpenses] = useState<(Expense & { pet_name: string })[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [filterPet, setFilterPet] = useState('')
  const [form, setForm] = useState({
    pet_id: '', category: 'vet' as ExpenseCategory,
    title: '', amount_brl: '', expense_date: new Date().toISOString().slice(0,10), notes: ''
  })

  async function load() {
    if (!pets.length) return
    const { data } = await supabase.from('pet_expenses').select('*')
      .in('pet_id', pets.map(p => p.id)).order('expense_date', { ascending: false })
    const enriched = (data || []).map(e => ({ ...e, pet_name: pets.find(p => p.id === e.pet_id)?.name || '' }))
    setExpenses(enriched); setLoading(false)
  }

  useEffect(() => { load() }, [pets])

  async function save() {
    if (!form.pet_id || !form.amount_brl || !form.title) return
    setSaving(true)
    const { data } = await supabase.from('pet_expenses').insert({
      pet_id: form.pet_id, category: form.category, title: form.title,
      amount_brl: parseFloat(form.amount_brl), expense_date: form.expense_date, notes: form.notes || undefined
    }).select().single()
    if (data) setExpenses(p => [{ ...data, pet_name: pets.find(x => x.id === data.pet_id)?.name || '' }, ...p])
    setSaving(false); setModal(false)
    setForm({ pet_id:'', category:'vet', title:'', amount_brl:'', expense_date: new Date().toISOString().slice(0,10), notes:'' })
  }

  async function del(id: string) {
    await supabase.from('pet_expenses').delete().eq('id', id)
    setExpenses(p => p.filter(e => e.id !== id))
  }

  const filtered = filterPet ? expenses.filter(e => e.pet_id === filterPet) : expenses

  const now = new Date()
  const thisMonth = filtered.filter(e => {
    const d = new Date(e.expense_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const totalMonth = thisMonth.reduce((s, e) => s + e.amount_brl, 0)
  const totalAll   = filtered.reduce((s, e) => s + e.amount_brl, 0)

  const byCategory = CATEGORIES.map(cat => ({
    cat, total: filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount_brl, 0)
  })).filter(x => x.total > 0).sort((a,b) => b.total - a.total)

  return (
    <div>
      <TopBar title="Gastos" subtitle="Controle financeiro dos seus pets" />

      <div className="p-4 lg:p-6 max-w-2xl space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 mb-1">Mês atual</div>
              <div className="text-xl font-bold text-slate-800">{formatCurrency(totalMonth)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 mb-1">Total geral</div>
              <div className="text-xl font-bold text-slate-800">{formatCurrency(totalAll)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Por categoria */}
        {byCategory.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" /> Por categoria
              </div>
              <div className="space-y-2">
                {byCategory.map(({ cat, total }) => {
                  const pct = totalAll > 0 ? (total / totalAll * 100) : 0
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{EXPENSE_ICONS[cat]} {EXPENSE_LABELS[cat]}</span>
                        <span className="font-semibold">{formatCurrency(total)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros + botão */}
        <div className="flex gap-2">
          <select className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterPet} onChange={e => setFilterPet(e.target.value)}>
            <option value="">Todos os pets</option>
            {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <Button className="gap-1 flex-shrink-0" onClick={() => setModal(true)}><Plus size={16} /> Novo gasto</Button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-400 text-sm">Nenhum gasto registrado ainda</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => (
              <Card key={e.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl flex-shrink-0">
                      {EXPENSE_ICONS[e.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 text-sm">{e.title}</div>
                      <div className="text-xs text-slate-500">
                        {e.pet_name} · {EXPENSE_LABELS[e.category]} · {formatDate(e.expense_date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-slate-800">{formatCurrency(e.amount_brl)}</span>
                      <button onClick={() => del(e.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo gasto">
        <div className="space-y-3">
          <Select label="Pet *" value={form.pet_id} onChange={e => setForm(p => ({ ...p, pet_id: e.target.value }))}
            options={[{ value:'', label:'Selecione o pet' }, ...pets.map(p => ({ value: p.id, label: p.name }))]} />
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
          <Input label="Observações" placeholder="Detalhes..." value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
