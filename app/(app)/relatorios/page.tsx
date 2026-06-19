'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, petAge } from '@/lib/utils'
import type { Pet } from '@/types'
import { DIARY_TYPE_ICONS, DIARY_TYPE_LABELS, type DiaryType } from '@/types'
import { FileText, Sparkles, Calendar, Scale, Syringe, Stethoscope, Wallet, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react'

const diaryIcon  = (t: string) => DIARY_TYPE_ICONS[t as DiaryType]  ?? '📋'
const diaryLabel = (t: string) => DIARY_TYPE_LABELS[t as DiaryType] ?? t

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type WeightEntry = { weight_kg: number; measured_at: string; notes?: string }
type DiaryEntry  = { type: string; title: string; occurred_at: string; next_date?: string }
type Expense     = { category: string; amount_brl: number; expense_date: string; title: string }

type AiResult = {
  status: 'saudável' | 'atenção' | 'cuidado'
  status_emoji: string
  resumo: string
  insights: string[]
  recomendacoes: string[]
  alerta: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  food: '🍖 Alimentação', vet: '🏥 Veterinário', medicine: '💊 Medicamentos',
  grooming: '✂️ Banho/Tosa', accessory: '🎀 Acessórios', vaccine: '💉 Vacinas',
  exam: '🔬 Exames', other: '💳 Outros',
}

const STATUS_STYLE = {
  'saudável': { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', badge: 'success' as const },
  'atenção':  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', badge: 'warning' as const },
  'cuidado':  { bg: 'bg-red-50 dark:bg-red-900/20',    border: 'border-red-200 dark:border-red-800',    text: 'text-red-700 dark:text-red-300',    badge: 'danger' as const },
}

const PERIODO_OPTIONS = [
  { value: '30',  label: '📅 Últimos 30 dias' },
  { value: '90',  label: '📅 Últimos 3 meses' },
  { value: '180', label: '📅 Últimos 6 meses' },
  { value: '0',   label: '📅 Todo o histórico' },
]

export default function RelatoriosPage() {
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [periodo, setPeriodo]   = useState('90')
  const [loading, setLoading]   = useState(false)
  const [aiResult, setAiResult] = useState<AiResult | null>(null)

  // Dados brutos
  const [diary,   setDiary]   = useState<DiaryEntry[]>([])
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined

  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id)
  }, [pets])

  async function gerar() {
    if (!selectedPetId || !selectedPet) return
    setLoading(true); setAiResult(null); setDiary([]); setWeights([]); setExpenses([])

    const periodoNum = parseInt(periodo)
    const desde = periodoNum > 0
      ? new Date(Date.now() - periodoNum * 86400000).toISOString().slice(0, 10)
      : '2000-01-01'

    const [diaryRes, weightRes, expensesRes] = await Promise.all([
      supabase.from('pet_diary').select('type,title,occurred_at,next_date')
        .eq('pet_id', selectedPetId).gte('occurred_at', desde)
        .order('occurred_at', { ascending: false }),
      supabase.from('pet_weight_history').select('weight_kg,measured_at,notes')
        .eq('pet_id', selectedPetId).gte('measured_at', desde)
        .order('measured_at', { ascending: true }),
      supabase.from('pet_expenses').select('category,amount_brl,expense_date,title')
        .eq('pet_id', selectedPetId).gte('expense_date', desde)
        .order('expense_date', { ascending: false }),
    ])

    const d = diaryRes.data ?? []
    const w = weightRes.data ?? []
    const e = expensesRes.data ?? []
    setDiary(d); setWeights(w); setExpenses(e)

    // Montar stats para a IA
    const porTipo: Record<string, number> = {}
    d.forEach(x => { porTipo[x.type] = (porTipo[x.type] || 0) + 1 })

    const gastosTotal = e.reduce((s, x) => s + (x.amount_brl || 0), 0)
    const gastosCateg: Record<string, number> = {}
    e.forEach(x => { gastosCateg[x.category] = (gastosCateg[x.category] || 0) + (x.amount_brl || 0) })

    const hoje = new Date().toISOString().slice(0, 10)
    const proximos = d
      .filter(x => x.next_date && x.next_date >= hoje)
      .sort((a, b) => a.next_date!.localeCompare(b.next_date!))
      .slice(0, 5)
      .map(x => ({ type: x.type, title: x.title, date: x.next_date }))

    const ageStr = selectedPet.birth_date ? petAge(selectedPet.birth_date) : 'Não informada'

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-relatorio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          pet: {
            name: selectedPet.name, species: selectedPet.species, breed: selectedPet.breed,
            age_str: ageStr, sex: selectedPet.sex, neutered: selectedPet.neutered,
            weight_kg: selectedPet.weight_kg, ideal_weight: selectedPet.ideal_weight,
            notes: selectedPet.notes,
          },
          stats: {
            total_registros: d.length,
            por_tipo: Object.entries(porTipo).map(([tipo, count]) => ({ tipo, count })),
            ultimo_registro: d.length > 0 ? d[0].occurred_at : null,
            pesos: w,
            gastos_total: gastosTotal,
            gastos_categoria: Object.entries(gastosCateg).map(([category, total]) => ({ category, total })),
            proximos_eventos: proximos,
          },
          periodo_dias: periodoNum,
        })
      })
      if (res.ok) setAiResult(await res.json())
    } catch { /* IA falhou, continua sem ela */ }

    setLoading(false)
  }

  // Stats derivados
  const vaccines    = diary.filter(d => d.type === 'vaccine').length
  const appointments = diary.filter(d => d.type === 'appointment').length
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount_brl || 0), 0)
  const gastosCateg  = Object.entries(
    expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount_brl; return acc }, {} as Record<string,number>)
  ).map(([c, t]) => ({ category: c, total: t })).sort((a, b) => b.total - a.total)

  const hoje = new Date().toISOString().slice(0, 10)
  const upcomingEvents = diary
    .filter(d => d.next_date && d.next_date >= hoje)
    .sort((a, b) => a.next_date!.localeCompare(b.next_date!))
    .slice(0, 5)

  const lastWeight    = weights.length > 0 ? weights[weights.length - 1] : null
  const recentWeights = weights.slice(-5)

  const petOptions = pets.map(p => ({ value: p.id, label: p.name }))
  const speciesEmoji: Record<string, string> = { dog:'🐕', cat:'🐈', bird:'🦜', rabbit:'🐇', fish:'🐠', hamster:'🐹', other:'🐾' }

  const hasData = diary.length > 0 || weights.length > 0 || expenses.length > 0

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Relatórios" subtitle="Saúde e histórico completo do seu pet" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24 max-w-2xl">

        {/* Formulário */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">Relatório de Saúde com IA</span>
            </div>

            {petsLoading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />
            ) : (
              <Select label="Pet" options={petOptions} value={selectedPetId}
                onChange={e => { setSelectedPetId(e.target.value); setAiResult(null); setDiary([]); setWeights([]); setExpenses([]) }} />
            )}

            <Select label="Período" options={PERIODO_OPTIONS} value={periodo}
              onChange={e => setPeriodo(e.target.value)} />

            <Button onClick={gerar} loading={loading} disabled={!selectedPetId || loading} className="w-full gap-2">
              <FileText size={15} />
              {loading ? 'Gerando relatório...' : 'Gerar Relatório'}
            </Button>
          </CardContent>
        </Card>

        {hasData && selectedPet && (
          <div className="space-y-4">
            {/* Header do pet */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{speciesEmoji[selectedPet.species] ?? '🐾'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg">{selectedPet.name}</div>
                  <div className="text-blue-200 text-sm">{selectedPet.breed || selectedPet.species}</div>
                  {selectedPet.birth_date && (
                    <div className="text-blue-100 text-xs mt-0.5">{petAge(selectedPet.birth_date)}</div>
                  )}
                </div>
                {aiResult && (
                  <Badge variant={STATUS_STYLE[aiResult.status]?.badge ?? 'default'} className="text-sm px-3 py-1 flex-shrink-0">
                    {aiResult.status_emoji} {aiResult.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Alerta urgente */}
            {aiResult?.alerta && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700 dark:text-red-300">{aiResult.alerta}</p>
              </div>
            )}

            {/* Análise IA */}
            {aiResult && (
              <Card className={`border ${STATUS_STYLE[aiResult.status]?.border ?? ''}`}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Análise IA</span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{aiResult.resumo}</p>

                  {aiResult.insights.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Observações</p>
                      <ul className="space-y-1.5">
                        {aiResult.insights.map((ins, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{ins}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiResult.recomendacoes.length > 0 && (
                    <div className={`p-3 rounded-xl ${STATUS_STYLE[aiResult.status]?.bg ?? ''} ${STATUS_STYLE[aiResult.status]?.border ?? ''} border`}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2 text-slate-500 dark:text-slate-400">Recomendações</p>
                      <ul className="space-y-1.5">
                        {aiResult.recomendacoes.map((r, i) => (
                          <li key={i} className={`flex items-start gap-2 text-sm font-medium ${STATUS_STYLE[aiResult.status]?.text ?? ''}`}>
                            <CheckCircle size={14} className="shrink-0 mt-0.5" />{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stats rápidos */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <FileText size={18} className="text-blue-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{diary.length}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Registros</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Syringe size={18} className="text-green-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{vaccines}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Vacinas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Stethoscope size={18} className="text-purple-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{appointments}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Consultas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <Wallet size={18} className="text-amber-500 mx-auto mb-1" />
                  <div className="text-base font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalExpenses)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Gastos</div>
                </CardContent>
              </Card>
            </div>

            {/* Evolução de peso */}
            {recentWeights.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Scale size={16} className="text-blue-500" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">Evolução de peso</span>
                    </div>
                    {lastWeight && (
                      <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{lastWeight.weight_kg} kg</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {recentWeights.map((w, i) => {
                      const prev = recentWeights[i - 1]
                      const diff = prev ? +(w.weight_kg - prev.weight_kg).toFixed(1) : null
                      return (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {new Date(w.measured_at + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-2">
                            {diff !== null && (
                              <span className={`flex items-center gap-0.5 text-xs font-semibold ${diff > 0.05 ? 'text-amber-500' : diff < -0.05 ? 'text-blue-500' : 'text-green-500'}`}>
                                {diff > 0.05 ? <TrendingUp size={12} /> : diff < -0.05 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                {diff > 0 ? '+' : ''}{diff}kg
                              </span>
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{w.weight_kg} kg</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {selectedPet.ideal_weight && lastWeight && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Peso ideal: {selectedPet.ideal_weight} kg</span>
                      <Badge variant={
                        lastWeight.weight_kg > selectedPet.ideal_weight * 1.1 ? 'danger' :
                        lastWeight.weight_kg < selectedPet.ideal_weight * 0.9 ? 'warning' : 'success'
                      }>
                        {lastWeight.weight_kg > selectedPet.ideal_weight * 1.1 ? 'Acima' :
                         lastWeight.weight_kg < selectedPet.ideal_weight * 0.9 ? 'Abaixo' : 'Ideal'}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline de saúde */}
            {diary.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-indigo-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Histórico recente</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100 dark:bg-slate-700" />
                    <div className="space-y-3">
                      {diary.slice(0, 8).map((entry, i) => (
                        <div key={i} className="flex items-start gap-3 relative">
                          <div className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm shrink-0 z-10">
                            {diaryIcon(entry.type)}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{entry.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {diaryLabel(entry.type)} · {new Date(entry.occurred_at + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {diary.length > 8 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-3">+{diary.length - 8} registros mais antigos</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Gastos por categoria */}
            {gastosCateg.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet size={16} className="text-amber-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Gastos por categoria</span>
                  </div>
                  <div className="space-y-3">
                    {gastosCateg.map(({ category, total }) => {
                      const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
                      return (
                        <div key={category}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[category] ?? category}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(total)}</span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Próximos eventos */}
            {upcomingEvents.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-orange-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Próximos eventos</span>
                  </div>
                  <div className="space-y-2">
                    {upcomingEvents.map((ev, i) => {
                      const daysLeft = Math.ceil((new Date(ev.next_date! + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime()) / 86400000)
                      return (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{diaryIcon(ev.type)}</span>
                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate">{ev.title}</span>
                          </div>
                          <Badge variant={daysLeft === 0 ? 'danger' : daysLeft <= 7 ? 'warning' : 'info'} className="shrink-0 text-[10px]">
                            {daysLeft === 0 ? 'Hoje' : daysLeft === 1 ? 'Amanhã' : `${daysLeft}d`}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {!hasData && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText size={40} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Nenhum dado encontrado no período selecionado</p>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-center text-slate-400 dark:text-slate-500 pb-2">
              Relatório gerado em {new Date().toLocaleDateString('pt-BR')} · MeuPet+
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
