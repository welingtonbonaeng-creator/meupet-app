'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Pet } from '@/types'
import { FileText, Sparkles, Calendar, Scale, Syringe, Stethoscope, Wallet } from 'lucide-react'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

type ReportData = {
  pet: Pet
  totalDiary: number
  vaccines: number
  appointments: number
  lastWeight: number | null
  weightTrend: 'subindo' | 'descendo' | 'estável' | null
  totalExpenses: number
  expensesByCategory: { category: string; total: number }[]
  upcomingEvents: { title: string; date: string; type: string }[]
  aiSummary: string | null
}

const TYPE_LABELS: Record<string, string> = {
  vaccine: 'Vacina', appointment: 'Consulta', exam: 'Exame',
  bath: 'Banho', deworming: 'Vermífugo', note: 'Nota', weight: 'Peso',
  food: 'Alimentação', medicine: 'Medicamento', other: 'Outro',
}

const CATEGORY_LABELS: Record<string, string> = {
  food: 'Alimentação', vet: 'Veterinário', medicine: 'Medicamentos',
  grooming: 'Banho/Tosa', accessory: 'Acessórios', vaccine: 'Vacinas',
  exam: 'Exames', other: 'Outros',
}

function calcAgeMonths(birthDate: string | null): number | null {
  if (!birthDate) return null
  const b = new Date(birthDate)
  const n = new Date()
  return (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth())
}

export default function RelatoriosPage() {
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined

  useEffect(() => { if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id) }, [pets])

  async function gerarRelatorio() {
    if (!selectedPetId || !selectedPet) return
    setLoading(true); setReport(null); setAiSummary(null)

    const [diaryRes, weightRes, expensesRes] = await Promise.all([
      supabase.from('pet_diary').select('*').eq('pet_id', selectedPetId).order('occurred_at', { ascending: false }),
      supabase.from('pet_weight_history').select('*').eq('pet_id', selectedPetId).order('measured_at', { ascending: true }),
      supabase.from('pet_expenses').select('*').eq('pet_id', selectedPetId).order('expense_date', { ascending: false }),
    ])

    const diary    = diaryRes.data ?? []
    const weights  = weightRes.data ?? []
    const expenses = expensesRes.data ?? []

    const lastWeight = weights.length > 0 ? weights[weights.length - 1].weight_kg : null
    let weightTrend: ReportData['weightTrend'] = null
    if (weights.length >= 2) {
      const diff = weights[weights.length - 1].weight_kg - weights[weights.length - 2].weight_kg
      weightTrend = diff > 0.1 ? 'subindo' : diff < -0.1 ? 'descendo' : 'estável'
    }

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount_brl || 0), 0)
    const byCategory: Record<string, number> = {}
    expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + (e.amount_brl || 0) })
    const expensesByCategory = Object.entries(byCategory)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)

    const upcoming = diary
      .filter(d => d.next_date && new Date(d.next_date) >= new Date())
      .sort((a, b) => a.next_date.localeCompare(b.next_date))
      .slice(0, 5)
      .map(d => ({ title: d.title, date: d.next_date, type: d.type }))

    setReport({
      pet: selectedPet,
      totalDiary: diary.length,
      vaccines: diary.filter(d => d.type === 'vaccine').length,
      appointments: diary.filter(d => d.type === 'appointment').length,
      lastWeight, weightTrend, totalExpenses, expensesByCategory, upcomingEvents: upcoming, aiSummary: null,
    })
    setLoading(false)

    // IA: gerar resumo
    setLoadingAI(true)
    try {
      const prompt = `Faça um resumo de saúde em 3 parágrafos curtos para o pet:
Nome: ${selectedPet.name}, Espécie: ${selectedPet.species}, Raça: ${selectedPet.breed || 'SRD'}
Registros no diário: ${diary.length} (${diary.filter(d=>d.type==='vaccine').length} vacinas, ${diary.filter(d=>d.type==='appointment').length} consultas)
Peso atual: ${lastWeight ? lastWeight + ' kg' : 'não registrado'} (tendência: ${weightTrend ?? 'sem dados'})
Gastos totais: R$ ${totalExpenses.toFixed(2)}
Próximos eventos: ${upcoming.map(u=>u.title).join(', ') || 'nenhum'}
Responda em JSON: {"resumo": "texto do resumo completo", "status": "saudável|atenção|cuidado", "recomendacao": "1 recomendação principal"}`

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-nutricao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({ pet: { name: selectedPet.name, species: selectedPet.species, breed: selectedPet.breed, weight_kg: lastWeight, neutered: selectedPet.neutered, notes: selectedPet.notes }, _prompt_override: prompt })
      })
      // Usa função de nutrição apenas para o wrapper — mas na verdade chamamos endpoint genérico
      // Vamos usar um fetch direto para Groq via edge function reutilizando nutricao
      if (res.ok) {
        const d = await res.json()
        setAiSummary(d.resumo ?? null)
      }
    } catch { /* silent */ }
    setLoadingAI(false)
  }

  const petOptions = pets.map(p => ({ value: p.id, label: p.name }))
  const speciesEmoji: Record<string, string> = { dog:'🐕', cat:'🐈', bird:'🦜', rabbit:'🐇', fish:'🐠', hamster:'🐹', other:'🐾' }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Relatórios" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24">

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">Relatório de Saúde</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Resumo completo do histórico do seu pet com análise de IA.</p>
            {petsLoading ? <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" /> : (
              <Select label="Escolha o pet" options={petOptions} value={selectedPetId}
                onChange={e => { setSelectedPetId(e.target.value); setReport(null) }} />
            )}
            <Button onClick={gerarRelatorio} loading={loading} disabled={!selectedPetId || loading} className="w-full">
              {loading ? 'Gerando relatório...' : '📋 Gerar Relatório'}
            </Button>
          </CardContent>
        </Card>

        {report && (
          <div className="space-y-4">
            {/* Header do pet */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{speciesEmoji[report.pet.species] ?? '🐾'}</span>
                <div>
                  <div className="font-bold text-lg">{report.pet.name}</div>
                  <div className="text-blue-200 text-sm">{report.pet.breed || report.pet.species}</div>
                </div>
              </div>
              {report.pet.birth_date && (
                <div className="text-blue-100 text-xs mt-1">
                  {(() => { const m = calcAgeMonths(report.pet.birth_date ?? null); if (!m) return ''; const y = Math.floor(m/12); const mo = m%12; return y > 0 ? `${y} ${y===1?'ano':'anos'}${mo>0?` e ${mo} ${mo===1?'mês':'meses'}`:''}` : `${mo} ${mo===1?'mês':'meses'}` })()}
                </div>
              )}
            </div>

            {/* Resumo IA */}
            {(loadingAI || aiSummary) && (
              <Card className="border-purple-100 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-purple-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Análise IA</span>
                  </div>
                  {loadingAI
                    ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-3 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />)}</div>
                    : <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{aiSummary}</p>
                  }
                </CardContent>
              </Card>
            )}

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex justify-center mb-1"><FileText size={18} className="text-blue-500" /></div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{report.totalDiary}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Registros</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex justify-center mb-1"><Syringe size={18} className="text-green-500" /></div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{report.vaccines}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Vacinas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex justify-center mb-1"><Stethoscope size={18} className="text-purple-500" /></div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{report.appointments}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Consultas</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="flex justify-center mb-1"><Wallet size={18} className="text-amber-500" /></div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {report.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Gastos totais</div>
                </CardContent>
              </Card>
            </div>

            {/* Peso */}
            {report.lastWeight && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale size={16} className="text-blue-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Peso atual</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{report.lastWeight} kg</div>
                    {report.weightTrend && (
                      <Badge variant={report.weightTrend === 'estável' ? 'success' : 'warning'}>
                        {report.weightTrend === 'subindo' ? '↑' : report.weightTrend === 'descendo' ? '↓' : '→'} {report.weightTrend}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gastos por categoria */}
            {report.expensesByCategory.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Gastos por categoria</p>
                  <div className="space-y-2">
                    {report.expensesByCategory.map(({ category, total }) => {
                      const pct = report.totalExpenses > 0 ? (total / report.totalExpenses) * 100 : 0
                      return (
                        <div key={category}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[category] ?? category}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-50 dark:bg-blue-900/300 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Próximos eventos */}
            {report.upcomingEvents.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-orange-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Próximos eventos</span>
                  </div>
                  <div className="space-y-2">
                    {report.upcomingEvents.map((ev, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-200">{ev.title}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{TYPE_LABELS[ev.type] ?? ev.type}</Badge>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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
