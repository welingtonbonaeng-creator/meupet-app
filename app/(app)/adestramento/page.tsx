'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Pet } from '@/types'
import { Sparkles, Trophy, Clock, AlertCircle, ChevronDown, ChevronUp, CheckCircle, Circle, Calendar } from 'lucide-react'

type Exercicio = {
  nome: string
  objetivo: string
  passos: string[]
  dica: string
  sinal_sucesso: string
}

type Semana = {
  semana: number
  foco: string
  duracao_min: number
  sessoes_semana: number
  exercicios: Exercicio[]
}

type TrainingPlan = {
  diagnostico: string
  nivel: string
  semanas: Semana[]
  comandos_basicos: string[]
  dicas_reforco: string[]
  erros_comuns: string[]
  tempo_estimado_semanas: number
}

type CompletionKey = `${number}-${number}` // semana-exercicioIdx
type CompletionMap = Record<CompletionKey, string> // key → data de conclusão (YYYY-MM-DD)

const PROBLEMAS_OPTIONS = [
  'Latir excessivamente', 'Morder ou mastigar objetos', 'Pular nas pessoas',
  'Não atender quando chamado', 'Puxar a guia', 'Ansiedade de separação',
  'Brigar com outros animais', 'Medo de barulhos', 'Fazer necessidades no lugar errado',
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function calcAgeMonths(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function formatDateBR(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AdestamentoPage() {
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [problemasSel, setProblemasSel] = useState<string[]>([])
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [semanaAberta, setSemanaAberta] = useState<number>(0)
  const [exercicioAberto, setExercicioAberto] = useState<string | null>(null)
  const [completions, setCompletions] = useState<CompletionMap>({})
  const [toggling, setToggling] = useState<string | null>(null)

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => { if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id) }, [pets])

  // Carregar conclusões salvas para o pet selecionado
  const loadCompletions = useCallback(async (petId: string) => {
    const { data } = await supabase
      .from('training_completions')
      .select('semana, exercicio_idx, completed_at')
      .eq('pet_id', petId)
    const map: CompletionMap = {}
    data?.forEach(r => { map[`${r.semana}-${r.exercicio_idx}` as CompletionKey] = r.completed_at })
    setCompletions(map)
  }, [])

  useEffect(() => {
    if (selectedPetId) loadCompletions(selectedPetId)
  }, [selectedPetId])

  function toggleProblema(p: string) {
    setProblemasSel(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function toggleCompletion(semana: number, exIdx: number, exNome: string) {
    if (!userId || !selectedPetId) return
    const key: CompletionKey = `${semana}-${exIdx}`
    setToggling(key)

    if (completions[key]) {
      // Desmarcar
      await supabase.from('training_completions').delete()
        .eq('user_id', userId).eq('pet_id', selectedPetId).eq('semana', semana).eq('exercicio_idx', exIdx)
      setCompletions(prev => { const n = { ...prev }; delete n[key]; return n })
    } else {
      // Marcar como concluído
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('training_completions').upsert({
        user_id: userId, pet_id: selectedPetId,
        semana, exercicio_idx: exIdx, exercicio_nome: exNome, completed_at: today,
      }, { onConflict: 'user_id,pet_id,semana,exercicio_idx' })
      setCompletions(prev => ({ ...prev, [key]: today }))
    }
    setToggling(null)
  }

  async function gerar() {
    if (!selectedPet) return
    setLoading(true); setError(''); setPlan(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-adestramento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          pet: {
            name: selectedPet.name, species: selectedPet.species, breed: selectedPet.breed,
            age_months: calcAgeMonths(selectedPet.birth_date ?? null),
            neutered: selectedPet.neutered, notes: selectedPet.notes,
          },
          problemas: problemasSel.length > 0 ? problemasSel.join(', ') : 'Nenhum específico'
        })
      })
      if (!res.ok) throw new Error('Erro ao gerar plano')
      const data: TrainingPlan = await res.json()
      setPlan(data)
      setSemanaAberta(0)
      setExercicioAberto(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally { setLoading(false) }
  }

  // Calcular progresso por semana
  function semanaProgress(semanaNum: number, total: number) {
    const done = Array.from({ length: total }, (_, i) => completions[`${semanaNum}-${i}` as CompletionKey]).filter(Boolean).length
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
  }

  // Total de exercícios concluídos
  const totalFeitos = Object.keys(completions).length
  const totalExercicios = plan?.semanas.reduce((s, w) => s + w.exercicios.length, 0) ?? 0

  const petOptions = pets.map(p => ({ value: p.id, label: `${p.name} (${p.species})` }))

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Adestramento IA" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24">

        {/* Config */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-orange-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">Plano de Adestramento com Passo a Passo</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A IA cria exercícios práticos com instruções detalhadas. Marque cada exercício ao concluir.
            </p>

            {petsLoading ? <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" /> : (
              <Select label="Escolha o pet" options={petOptions} value={selectedPetId}
                onChange={e => { setSelectedPetId(e.target.value); setPlan(null) }} />
            )}

            <div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Problemas a trabalhar (opcional):</p>
              <div className="flex flex-wrap gap-2">
                {PROBLEMAS_OPTIONS.map(p => (
                  <button key={p} onClick={() => toggleProblema(p)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      problemasSel.includes(p)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-orange-300'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={gerar} loading={loading} disabled={!selectedPetId || loading} className="w-full">
              {loading ? 'Criando plano detalhado...' : '🐾 Gerar Plano com Passo a Passo'}
            </Button>
          </CardContent>
        </Card>

        {error && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</div>}

        {plan && selectedPet && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">{selectedPet.name}</div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 capitalize">{plan.nivel}</span>
              </div>
              <p className="text-sm text-orange-50">{plan.diagnostico}</p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <div className="flex items-center gap-1.5"><Clock size={14} /><span>{plan.tempo_estimado_semanas} semanas</span></div>
                <div className="flex items-center gap-1.5"><Trophy size={14} /><span>{plan.comandos_basicos.length} comandos</span></div>
              </div>
            </div>

            {/* Barra de progresso geral */}
            {totalExercicios > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Progresso geral</span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{totalFeitos}/{totalExercicios} exercícios</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${totalExercicios > 0 ? (totalFeitos / totalExercicios) * 100 : 0}%` }}
                    />
                  </div>
                  {totalFeitos === totalExercicios && totalExercicios > 0 && (
                    <p className="text-center text-sm font-semibold text-green-600 dark:text-green-400 mt-2">🎉 Plano concluído! Parabéns!</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comandos */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Comandos a dominar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.comandos_basicos.map((c, i) => (
                    <Badge key={i} variant="warning" className="text-xs font-mono">{c}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Semanas */}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Programa semana a semana:</p>
              <div className="space-y-2">
                {plan.semanas.map((s, i) => {
                  const prog = semanaProgress(s.semana, s.exercicios.length)
                  const semanaCompleta = prog.done === prog.total && prog.total > 0

                  return (
                    <Card key={i} className={semanaCompleta ? 'border-green-200 dark:border-green-800' : ''}>
                      <CardContent className="p-0">
                        {/* Header da semana */}
                        <button
                          onClick={() => setSemanaAberta(semanaAberta === i ? -1 : i)}
                          className="w-full text-left p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Indicador visual da semana */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                semanaCompleta
                                  ? 'bg-green-500 text-white'
                                  : prog.done > 0
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                {semanaCompleta ? '✓' : s.semana}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Semana {s.semana}</span>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">{s.foco}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-xs text-slate-500 dark:text-slate-400">{s.duracao_min} min · {s.sessoes_semana}x/sem</div>
                                <div className={`text-xs font-semibold mt-0.5 ${semanaCompleta ? 'text-green-600 dark:text-green-400' : prog.done > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'}`}>
                                  {prog.done}/{prog.total} feitos
                                </div>
                              </div>
                              {semanaAberta === i
                                ? <ChevronUp size={18} className="text-slate-400 shrink-0" />
                                : <ChevronDown size={18} className="text-slate-400 shrink-0" />
                              }
                            </div>
                          </div>

                          {/* Mini barra de progresso da semana */}
                          {prog.total > 0 && (
                            <div className="mt-2 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${semanaCompleta ? 'bg-green-500' : 'bg-orange-400'}`}
                                style={{ width: `${prog.pct}%` }}
                              />
                            </div>
                          )}
                        </button>

                        {/* Exercícios da semana */}
                        {semanaAberta === i && (
                          <div className="border-t border-slate-100 dark:border-slate-700">
                            {s.exercicios.map((ex, j) => {
                              const key = `${s.semana}-${j}` as CompletionKey
                              const doneDate = completions[key]
                              const isDone = !!doneDate
                              const exKey = `${i}-${j}`
                              const aberto = exercicioAberto === exKey
                              const isToggling = toggling === key

                              return (
                                <div key={j} className={`border-b border-slate-100 dark:border-slate-700 last:border-0 ${isDone ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                                  {/* Header do exercício */}
                                  <div className="flex items-start gap-2 px-4 py-3">
                                    {/* Checkbox de conclusão */}
                                    <button
                                      onClick={() => toggleCompletion(s.semana, j, ex.nome)}
                                      disabled={isToggling}
                                      className={`mt-0.5 shrink-0 transition-all ${isToggling ? 'opacity-50' : 'hover:scale-110'}`}
                                      title={isDone ? 'Marcar como não feito' : 'Marcar como concluído'}
                                    >
                                      {isDone
                                        ? <CheckCircle size={22} className="text-green-500" />
                                        : <Circle size={22} className="text-slate-300 dark:text-slate-600" />
                                      }
                                    </button>

                                    {/* Conteúdo do exercício */}
                                    <div className="flex-1 min-w-0">
                                      <button
                                        onClick={() => setExercicioAberto(aberto ? null : exKey)}
                                        className="w-full text-left"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <p className={`text-sm font-semibold ${isDone ? 'text-green-700 dark:text-green-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                                              {ex.nome}
                                            </p>
                                            {isDone ? (
                                              <div className="flex items-center gap-1 mt-0.5">
                                                <Calendar size={10} className="text-green-500" />
                                                <span className="text-xs text-green-600 dark:text-green-500">Feito em {formatDateBR(doneDate)}</span>
                                              </div>
                                            ) : (
                                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ex.objetivo}</p>
                                            )}
                                          </div>
                                          {!isDone && (
                                            aberto
                                              ? <ChevronUp size={16} className="text-slate-400 shrink-0 mt-1" />
                                              : <ChevronDown size={16} className="text-slate-400 shrink-0 mt-1" />
                                          )}
                                        </div>
                                      </button>

                                      {/* Detalhes (só se não concluído ou se explicitamente aberto) */}
                                      {aberto && !isDone && (
                                        <div className="mt-3 space-y-3">
                                          {/* Passo a passo */}
                                          <div>
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-2">Como fazer:</p>
                                            <ol className="space-y-2">
                                              {ex.passos.map((passo, k) => (
                                                <li key={k} className="flex items-start gap-2.5">
                                                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{k + 1}</div>
                                                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{passo.replace(/^Passo \d+:\s*/i, '')}</p>
                                                </li>
                                              ))}
                                            </ol>
                                          </div>
                                          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                                            <span className="text-amber-500 text-base shrink-0">💡</span>
                                            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{ex.dica}</p>
                                          </div>
                                          <div className="flex items-start gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                                            <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                                            <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">
                                              <span className="font-semibold">Sucesso quando:</span> {ex.sinal_sucesso}
                                            </p>
                                          </div>
                                          {/* Botão de concluir inline */}
                                          <Button
                                            size="sm"
                                            className="w-full bg-green-600 hover:bg-green-700 gap-2"
                                            loading={isToggling}
                                            onClick={() => toggleCompletion(s.semana, j, ex.nome)}
                                          >
                                            <CheckCircle size={14} /> Marcar como concluído
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Erros comuns */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Erros a evitar</span>
                </div>
                <ul className="space-y-2">
                  {plan.erros_comuns.map((e, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="font-semibold text-slate-800 dark:text-slate-100 mb-3">💚 Reforço positivo</div>
                <ul className="space-y-2">
                  {plan.dicas_reforco.map((d, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-slate-400 dark:text-slate-500 pb-2">
              Progresso salvo automaticamente · Consistência diária é a chave
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
