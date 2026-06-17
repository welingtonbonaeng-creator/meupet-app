'use client'
import { useEffect, useState } from 'react'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Pet } from '@/types'
import { Sparkles, Trophy, Clock, AlertCircle } from 'lucide-react'

type Semana = { semana: number; foco: string; exercicios: string[]; duracao_min: number; sessoes_semana: number }
type TrainingPlan = {
  diagnostico: string
  nivel: string
  semanas: Semana[]
  comandos_basicos: string[]
  dicas_reforco: string[]
  erros_comuns: string[]
  tempo_estimado_semanas: number
}

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

const NIVEL_COLOR: Record<string, string> = {
  'iniciante': 'bg-green-100 text-green-700',
  'intermediário': 'bg-yellow-100 text-yellow-700',
  'avançado': 'bg-red-100 text-red-700',
}

export default function AdestamentoPage() {
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [problemasSel, setProblemasSel] = useState<string[]>([])
  const [plan, setPlan] = useState<TrainingPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [semanaAberta, setSemanaAberta] = useState(0)

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined

  useEffect(() => { if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id) }, [pets])

  function toggleProblema(p: string) {
    setProblemasSel(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally { setLoading(false) }
  }

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
              <span className="font-semibold text-slate-800">Plano de Adestramento Personalizado</span>
            </div>
            <p className="text-sm text-slate-500">Plano semanal com exercícios adaptados ao perfil do seu pet.</p>

            {petsLoading ? <div className="h-10 bg-slate-100 rounded-xl animate-pulse" /> : (
              <Select label="Escolha o pet" options={petOptions} value={selectedPetId}
                onChange={e => { setSelectedPetId(e.target.value); setPlan(null) }} />
            )}

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Problemas de comportamento (opcional):</p>
              <div className="flex flex-wrap gap-2">
                {PROBLEMAS_OPTIONS.map(p => (
                  <button key={p} onClick={() => toggleProblema(p)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      problemasSel.includes(p) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                    }`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={gerar} loading={loading} disabled={!selectedPetId || loading} className="w-full">
              {loading ? 'Criando plano...' : '🐾 Gerar Plano com IA'}
            </Button>
          </CardContent>
        </Card>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        {/* Resultado */}
        {plan && selectedPet && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-lg">{selectedPet.name}</div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20`}>
                  {plan.nivel}
                </span>
              </div>
              <p className="text-sm text-orange-50">{plan.diagnostico}</p>
              <div className="flex items-center gap-2 mt-3">
                <Clock size={14} />
                <span className="text-sm">{plan.tempo_estimado_semanas} semanas de programa</span>
              </div>
            </div>

            {/* Comandos básicos */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={16} className="text-amber-500" />
                  <span className="font-semibold text-slate-800">Comandos a dominar</span>
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
              <p className="text-sm font-semibold text-slate-700 mb-2">Programa semana a semana:</p>
              <div className="space-y-2">
                {plan.semanas.map((s, i) => (
                  <Card key={i}>
                    <button onClick={() => setSemanaAberta(semanaAberta === i ? -1 : i)} className="w-full text-left">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-orange-600 uppercase">Semana {s.semana}</span>
                            <p className="text-sm font-semibold text-slate-800">{s.foco}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">{s.duracao_min} min · {s.sessoes_semana}x/sem</div>
                            <div className="text-slate-400 mt-1">{semanaAberta === i ? '▲' : '▼'}</div>
                          </div>
                        </div>
                        {semanaAberta === i && (
                          <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                            {s.exercicios.map((ex, j) => (
                              <li key={j} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                                {ex}
                              </li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </button>
                  </Card>
                ))}
              </div>
            </div>

            {/* Erros comuns */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="font-semibold text-slate-800">Erros a evitar</span>
                </div>
                <ul className="space-y-1">
                  {plan.erros_comuns.map((e, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      {e}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Dicas de reforço */}
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold text-slate-800 mb-3">💡 Reforço positivo</div>
                <ul className="space-y-2">
                  {plan.dicas_reforco.map((d, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-slate-400 pb-2">
              Gerado por IA · Consistência é a chave do adestramento
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
