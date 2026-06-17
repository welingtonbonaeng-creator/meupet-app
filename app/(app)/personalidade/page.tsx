'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { Pet } from '@/types'
import { Sparkles, Star, Heart, Lightbulb } from 'lucide-react'

type Traco = { nome: string; nivel: number; descricao: string }
type PersonalityPlan = {
  tipo_personalidade: string
  descricao: string
  tracos: Traco[]
  pontos_fortes: string[]
  desafios: string[]
  como_brincar: string
  tipo_tutor_ideal: string
  curiosidade: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function calcAgeMonths(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function NivelBar({ nivel }: { nivel: number }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`h-2 flex-1 rounded-full ${i <= nivel ? 'bg-purple-500' : 'bg-slate-200'}`} />
      ))}
    </div>
  )
}

const SPECIES_BG: Record<string, string> = {
  dog: 'from-amber-500 to-orange-500',
  cat: 'from-purple-500 to-violet-600',
  bird: 'from-sky-500 to-blue-600',
  rabbit: 'from-pink-400 to-rose-500',
  fish: 'from-teal-400 to-cyan-500',
  hamster: 'from-yellow-400 to-amber-500',
  other: 'from-slate-500 to-gray-600',
}

export default function PersonalidadePage() {
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [plan, setPlan] = useState<PersonalityPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cache, setCache] = useState<Record<string, PersonalityPlan>>({})

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined

  useEffect(() => { if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id) }, [pets])

  async function gerar() {
    if (!selectedPet) return
    if (cache[selectedPet.id]) { setPlan(cache[selectedPet.id]); return }
    setLoading(true); setError('')
    try {
      // Buscar entradas do diário para contexto
      const { data: diario } = await supabase
        .from('pet_diary')
        .select('type, title, description')
        .eq('pet_id', selectedPet.id)
        .order('occurred_at', { ascending: false })
        .limit(10)

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-personalidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          pet: {
            name: selectedPet.name, species: selectedPet.species, breed: selectedPet.breed,
            age_months: calcAgeMonths(selectedPet.birth_date ?? null),
            sex: selectedPet.sex, neutered: selectedPet.neutered, notes: selectedPet.notes,
          },
          diario: diario ?? []
        })
      })
      if (!res.ok) throw new Error('Erro ao analisar personalidade')
      const data: PersonalityPlan = await res.json()
      setPlan(data)
      setCache(prev => ({ ...prev, [selectedPet.id]: data }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally { setLoading(false) }
  }

  const petOptions = pets.map(p => ({ value: p.id, label: `${p.name} (${p.species})` }))
  const speciesEmoji: Record<string, string> = { dog:'🐕', cat:'🐈', bird:'🦜', rabbit:'🐇', fish:'🐠', hamster:'🐹', other:'🐾' }
  const bg = SPECIES_BG[selectedPet?.species ?? 'other'] ?? SPECIES_BG.other

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Personalidade IA" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24">

        {/* Config */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-500" />
              <span className="font-semibold text-slate-800">Análise de Personalidade</span>
            </div>
            <p className="text-sm text-slate-500">A IA analisa o perfil e histórico do seu pet para revelar sua personalidade única.</p>
            {petsLoading ? <div className="h-10 bg-slate-100 rounded-xl animate-pulse" /> : (
              <Select label="Escolha o pet" options={petOptions} value={selectedPetId}
                onChange={e => { setSelectedPetId(e.target.value); setPlan(null) }} />
            )}
            <Button onClick={gerar} loading={loading} disabled={!selectedPetId || loading}
              className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700">
              {loading ? 'Analisando...' : '🔮 Analisar Personalidade'}
            </Button>
          </CardContent>
        </Card>

        {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        {plan && selectedPet && (
          <div className="space-y-4">
            {/* Hero */}
            <div className={`bg-gradient-to-r ${bg} rounded-2xl p-5 text-white text-center`}>
              <div className="text-5xl mb-2">{speciesEmoji[selectedPet.species] ?? '🐾'}</div>
              <div className="text-xl font-bold">{selectedPet.name}</div>
              <div className="mt-2 inline-block bg-white/20 rounded-full px-4 py-1 text-sm font-semibold">
                {plan.tipo_personalidade}
              </div>
              <p className="mt-3 text-sm text-white/90 leading-relaxed">{plan.descricao}</p>
            </div>

            {/* Traços */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={16} className="text-purple-500" />
                  <span className="font-semibold text-slate-800">Traços de personalidade</span>
                </div>
                <div className="space-y-4">
                  {plan.tracos.map((t, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{t.nome}</span>
                        <span className="text-xs text-slate-400">{t.nivel}/5</span>
                      </div>
                      <NivelBar nivel={t.nivel} />
                      <p className="text-xs text-slate-500 mt-1">{t.descricao}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pontos fortes e desafios */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs font-bold text-green-600 mb-2">✅ Pontos fortes</div>
                  <ul className="space-y-1">
                    {plan.pontos_fortes.map((p, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                        <span className="mt-1 w-1 h-1 rounded-full bg-green-400 shrink-0" />{p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs font-bold text-amber-600 mb-2">⚡ Desafios</div>
                  <ul className="space-y-1">
                    {plan.desafios.map((d, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                        <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />{d}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Como brincar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={16} className="text-pink-500" />
                  <span className="font-semibold text-slate-800">Como estimular</span>
                </div>
                <p className="text-sm text-slate-600">{plan.como_brincar}</p>
              </CardContent>
            </Card>

            {/* Tutor ideal */}
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold text-slate-800 mb-2">👤 Tutor ideal</div>
                <p className="text-sm text-slate-600">{plan.tipo_tutor_ideal}</p>
              </CardContent>
            </Card>

            {/* Curiosidade */}
            <Card className="bg-purple-50 border-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-purple-500" />
                  <span className="font-semibold text-purple-800">Sabia que?</span>
                </div>
                <p className="text-sm text-purple-700">{plan.curiosidade}</p>
              </CardContent>
            </Card>

            <p className="text-xs text-center text-slate-400 pb-2">Análise gerada por IA com base no perfil e histórico</p>
          </div>
        )}
      </div>
    </div>
  )
}
