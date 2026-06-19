'use client'
import { useEffect, useState } from 'react'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Pet } from '@/types'
import { Sparkles, AlertTriangle, CheckCircle, XCircle, Zap, Utensils } from 'lucide-react'

type NutritionPlan = {
  resumo: string
  calorias_dia: number
  refeicoes_dia: number
  porcao_g: number | null
  alimentos_recomendados: string[]
  alimentos_proibidos: string[]
  dicas: string[]
  suplementos: string[]
  alerta: string | null
}

type Extras = {
  nivel_atividade: string
  tipo_dieta_atual: string
  condicoes_saude: string[]
}

const CONDICOES = [
  { id: 'sobrepeso',       label: '🔴 Sobrepeso' },
  { id: 'abaixo_peso',     label: '🟡 Abaixo do peso' },
  { id: 'diabetes',        label: '🩸 Diabetes' },
  { id: 'doenca_renal',    label: '🫘 Doença renal' },
  { id: 'alergia',         label: '🌿 Alergia alimentar' },
  { id: 'artrite',         label: '🦴 Artrite' },
  { id: 'cardiopatia',     label: '❤️ Cardiopatia' },
  { id: 'hepatica',        label: '🟤 Doença hepática' },
  { id: 'gestante',        label: '🤰 Gestante / lactante' },
]

function calcAgeMonths(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now   = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function NutricaoPage() {
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [plan, setPlan]   = useState<NutritionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [extras, setExtras] = useState<Extras>({
    nivel_atividade: 'moderado',
    tipo_dieta_atual: 'racao_seca',
    condicoes_saude: [],
  })

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined

  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id)
  }, [pets])

  function toggleCondicao(id: string) {
    setExtras(prev => ({
      ...prev,
      condicoes_saude: prev.condicoes_saude.includes(id)
        ? prev.condicoes_saude.filter(c => c !== id)
        : [...prev.condicoes_saude, id]
    }))
    setPlan(null)
  }

  async function gerar() {
    if (!selectedPet) return
    setLoading(true); setError(''); setPlan(null)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-nutricao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          pet: {
            name:        selectedPet.name,
            species:     selectedPet.species,
            breed:       selectedPet.breed,
            age_months:  calcAgeMonths(selectedPet.birth_date ?? null),
            weight_kg:   selectedPet.weight_kg,
            ideal_weight: selectedPet.ideal_weight,
            neutered:    selectedPet.neutered,
            notes:       selectedPet.notes,
          },
          extras,
        })
      })
      if (!res.ok) throw new Error('Erro ao gerar plano')
      const data: NutritionPlan = await res.json()
      setPlan(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const petOptions = pets.map(p => ({ value: p.id, label: `${p.name} (${p.species})` }))
  const speciesEmoji: Record<string, string> = { dog:'🐕', cat:'🐈', bird:'🦜', rabbit:'🐇', fish:'🐠', hamster:'🐹', other:'🐾' }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Nutrição IA" subtitle="Plano alimentar personalizado para seu pet" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24 max-w-2xl">

        {/* Formulário */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-purple-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">Plano de Nutrição Personalizado</span>
            </div>

            {/* Pet */}
            {petsLoading ? (
              <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ) : (
              <Select
                label="Pet"
                options={petOptions}
                value={selectedPetId}
                onChange={e => { setSelectedPetId(e.target.value); setPlan(null) }}
              />
            )}

            {/* Nível de atividade */}
            <Select
              label="Nível de atividade"
              value={extras.nivel_atividade}
              onChange={e => { setExtras(prev => ({ ...prev, nivel_atividade: e.target.value })); setPlan(null) }}
              options={[
                { value: 'sedentario',   label: '🛋️ Sedentário — dorme muito, quase não se exercita' },
                { value: 'moderado',     label: '🚶 Moderado — passeios diários, brincadeiras ocasionais' },
                { value: 'ativo',        label: '🏃 Ativo — exercício diário intenso' },
                { value: 'muito_ativo',  label: '⚡ Muito ativo — esporte, trabalho, agility' },
              ]}
            />

            {/* Tipo de dieta atual */}
            <Select
              label="Dieta atual"
              value={extras.tipo_dieta_atual}
              onChange={e => { setExtras(prev => ({ ...prev, tipo_dieta_atual: e.target.value })); setPlan(null) }}
              options={[
                { value: 'racao_seca',   label: '🥣 Ração seca (kibble)' },
                { value: 'racao_umida',  label: '🥫 Ração úmida (lata / sachê)' },
                { value: 'natural',      label: '🥩 Alimentação natural (BARF / caseira)' },
                { value: 'misto',        label: '🍽️ Misto (ração + natural)' },
                { value: 'nao_sei',      label: '❓ Não tenho padrão definido' },
              ]}
            />

            {/* Condições de saúde */}
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Condições de saúde <span className="text-slate-400 font-normal">(opcional)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {CONDICOES.map(c => {
                  const selected = extras.condicoes_saude.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCondicao(c.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${selected
                          ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-purple-300'
                        }`}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button onClick={gerar} loading={loading} disabled={!selectedPetId || loading} className="w-full gap-2">
              <Sparkles size={15} />
              {loading ? 'Analisando perfil...' : 'Gerar Plano com IA'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {/* Resultado */}
        {plan && selectedPet && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{speciesEmoji[selectedPet.species] ?? '🐾'}</span>
                <div>
                  <div className="font-bold text-lg">{selectedPet.name}</div>
                  <div className="text-green-100 text-sm">{selectedPet.breed}</div>
                </div>
              </div>
              <p className="text-sm text-green-50 leading-relaxed">{plan.resumo}</p>
            </div>

            {/* Alerta */}
            {plan.alerta && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">{plan.alerta}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold text-emerald-600">{plan.calorias_dia}</div>
                  <div className="text-[10px] text-slate-500">kcal / dia</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold text-blue-600">{plan.refeicoes_dia}x</div>
                  <div className="text-[10px] text-slate-500">refeições</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {plan.porcao_g ? `${plan.porcao_g}g` : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500">por refeição</div>
                </CardContent>
              </Card>
            </div>

            {/* Pode comer */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Pode comer</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.alimentos_recomendados.map((a, i) => (
                    <Badge key={i} variant="success" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Nunca dar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={16} className="text-red-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Nunca dar</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.alimentos_proibidos.map((a, i) => (
                    <Badge key={i} variant="danger" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Suplementos */}
            {plan.suplementos.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={16} className="text-purple-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">Suplementos</span>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.suplementos.map((s, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Dicas */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Utensils size={16} className="text-blue-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Dicas do veterinário</span>
                </div>
                <ul className="space-y-2">
                  {plan.dicas.map((d, i) => (
                    <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-slate-400 pb-2">
              Gerado por IA — consulte sempre um veterinário antes de mudar a dieta
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
