'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { Pet } from '@/types'
import { Sparkles, Star, Heart, Lightbulb, Zap, AlertTriangle, Clock } from 'lucide-react'

type Traco = { nome: string; nivel: number; descricao: string }
type PersonalityResult = {
  tipo_personalidade: string
  emoji_personalidade: string
  descricao: string
  tracos: Traco[]
  pontos_fortes: string[]
  desafios: string[]
  linguagem_amor: string
  como_brincar: string
  rotina_ideal: string
  gatilhos: string[]
  tipo_tutor_ideal: string
  curiosidade: string
}

type Comportamento = {
  com_estranhos: string
  sozinho: string
  energia: string
  com_animais: string
}

const QUIZ: {
  key: keyof Comportamento
  label: string
  opcoes: { value: string; label: string }[]
}[] = [
  {
    key: 'com_estranhos',
    label: '🧑‍🤝‍🧑 Com estranhos, meu pet é...',
    opcoes: [
      { value: 'amigavel',   label: '🥰 Super amigável e animado' },
      { value: 'cauteloso',  label: '👀 Curioso mas cauteloso' },
      { value: 'assustado',  label: '😨 Assustado / se esconde' },
      { value: 'agressivo',  label: '😤 Late/bufa / fica na defensiva' },
      { value: 'indiferente', label: '😌 Indiferente / ignora' },
    ],
  },
  {
    key: 'sozinho',
    label: '🏠 Sozinho em casa, meu pet...',
    opcoes: [
      { value: 'tranquilo',   label: '😴 Fica bem tranquilo' },
      { value: 'ansioso',     label: '😟 Fica ansioso' },
      { value: 'destrutivo',  label: '🪑 Destrói coisas' },
      { value: 'vocaliza',    label: '🔊 Late / mia muito' },
      { value: 'variavel',    label: '🎲 Depende do dia' },
    ],
  },
  {
    key: 'energia',
    label: '⚡ Nível de energia geral...',
    opcoes: [
      { value: 'muito_calmo', label: '🛋️ Muito calmo — ama dormir' },
      { value: 'moderado',    label: '🚶 Moderado — equilibrado' },
      { value: 'agitado',     label: '🏃 Agitado — sempre em movimento' },
      { value: 'explosivo',   label: '🚀 Explosivo — energia sem fim' },
    ],
  },
  {
    key: 'com_animais',
    label: '🐾 Com outros animais...',
    opcoes: [
      { value: 'adora',      label: '🤝 Adora socializar' },
      { value: 'tolera',     label: '😐 Tolera mas prefere sozinho' },
      { value: 'evita',      label: '🚶 Evita contato' },
      { value: 'agressivo',  label: '⚔️ Fica agressivo' },
      { value: 'sem_contato', label: '❓ Nunca teve contato' },
    ],
  },
]

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function calcAgeMonths(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now   = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function NivelBar({ nivel, color = 'purple' }: { nivel: number; color?: string }) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500', orange: 'bg-orange-400', pink: 'bg-pink-500', blue: 'bg-blue-500',
  }
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i <= nivel ? colors[color] : 'bg-slate-200 dark:bg-slate-700'}`} />
      ))}
    </div>
  )
}

const SPECIES_BG: Record<string, string> = {
  dog:     'from-amber-500 to-orange-500',
  cat:     'from-purple-500 to-violet-600',
  bird:    'from-sky-500 to-blue-600',
  rabbit:  'from-pink-400 to-rose-500',
  fish:    'from-teal-400 to-cyan-500',
  hamster: 'from-yellow-400 to-amber-500',
  other:   'from-slate-500 to-gray-600',
}

const SPECIES_EMOJI: Record<string, string> = {
  dog:'🐕', cat:'🐈', bird:'🦜', rabbit:'🐇', fish:'🐠', hamster:'🐹', other:'🐾',
}

export default function PersonalidadePage() {
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [result, setResult]   = useState<PersonalityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [comportamento, setComportamento] = useState<Comportamento>({
    com_estranhos: '',
    sozinho:       '',
    energia:       '',
    com_animais:   '',
  })

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined
  const bg = SPECIES_BG[selectedPet?.species ?? 'other'] ?? SPECIES_BG.other

  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id)
  }, [pets])

  useEffect(() => {
    setResult(null)
    setComportamento({ com_estranhos: '', sozinho: '', energia: '', com_animais: '' })
  }, [selectedPetId])

  function setComp(key: keyof Comportamento, value: string) {
    setComportamento(prev => ({ ...prev, [key]: value }))
  }

  async function gerar() {
    if (!selectedPet) return
    setLoading(true); setError(''); setResult(null)
    try {
      const { data: diario } = await supabase
        .from('pet_diary')
        .select('type, title, description, occurred_at')
        .eq('pet_id', selectedPet.id)
        .order('occurred_at', { ascending: false })
        .limit(20)

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-personalidade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
        body: JSON.stringify({
          pet: {
            name:        selectedPet.name,
            species:     selectedPet.species,
            breed:       selectedPet.breed,
            age_months:  calcAgeMonths(selectedPet.birth_date ?? null),
            sex:         selectedPet.sex,
            neutered:    selectedPet.neutered,
            weight_kg:   selectedPet.weight_kg,
            ideal_weight: selectedPet.ideal_weight,
            notes:       selectedPet.notes,
          },
          comportamento,
          diario: diario ?? [],
        })
      })
      if (!res.ok) throw new Error('Erro ao analisar personalidade')
      const data: PersonalityResult = await res.json()
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally { setLoading(false) }
  }

  const answeredCount = Object.values(comportamento).filter(Boolean).length
  const petOptions    = pets.map(p => ({ value: p.id, label: `${p.name} (${p.species})` }))

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Personalidade IA" subtitle="Descubra quem é o seu pet de verdade" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24 max-w-2xl">

        {/* Formulário */}
        <Card>
          <CardContent className="p-4 space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-violet-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-100">Análise de Personalidade</span>
            </div>

            {petsLoading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <Select label="Pet" options={petOptions} value={selectedPetId}
                onChange={e => setSelectedPetId(e.target.value)} />
            )}

            {/* Quiz comportamental */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Conte um pouco sobre o comportamento
                </p>
                <span className="text-xs text-slate-400">{answeredCount}/4 respondidas</span>
              </div>

              {QUIZ.map(q => (
                <div key={q.key}>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{q.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {q.opcoes.map(o => {
                      const sel = comportamento[q.key] === o.value
                      return (
                        <button key={o.value} type="button"
                          onClick={() => setComp(q.key, sel ? '' : o.value)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            sel
                              ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-violet-300'
                          }`}>
                          {o.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {answeredCount < 4 && (
              <p className="text-xs text-slate-400 text-center">
                Quanto mais perguntas responder, mais precisa fica a análise
              </p>
            )}

            <Button onClick={gerar} loading={loading} disabled={!selectedPetId || loading}
              className="w-full gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700">
              <Sparkles size={15} />
              {loading ? 'Analisando personalidade...' : 'Analisar Personalidade'}
            </Button>
          </CardContent>
        </Card>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">{error}</div>
        )}

        {result && selectedPet && (
          <div className="space-y-4">
            {/* Hero */}
            <div className={`bg-gradient-to-br ${bg} rounded-2xl p-5 text-white text-center relative overflow-hidden`}>
              <div className="text-5xl mb-2">{result.emoji_personalidade || SPECIES_EMOJI[selectedPet.species] || '🐾'}</div>
              <div className="text-xl font-bold">{selectedPet.name}</div>
              <div className="mt-2 inline-block bg-white/20 backdrop-blur-sm rounded-full px-4 py-1 text-sm font-semibold">
                {result.tipo_personalidade}
              </div>
              <p className="mt-3 text-sm text-white/90 leading-relaxed">{result.descricao}</p>
            </div>

            {/* Traços */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={16} className="text-purple-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Traços de personalidade</span>
                </div>
                <div className="space-y-4">
                  {result.tracos.map((t, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.nome}</span>
                        <span className="text-xs text-slate-400 font-semibold">{t.nivel}/5</span>
                      </div>
                      <NivelBar nivel={t.nivel} />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{t.descricao}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pontos fortes e desafios */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs font-bold text-green-600 dark:text-green-400 mb-2">✅ Pontos fortes</div>
                  <ul className="space-y-1.5">
                    {result.pontos_fortes.map((p, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="mt-1 w-1 h-1 rounded-full bg-green-400 shrink-0" />{p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">⚡ Desafios</div>
                  <ul className="space-y-1.5">
                    {result.desafios.map((d, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 shrink-0" />{d}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Linguagem do amor */}
            <Card className="border-pink-100 dark:border-pink-900/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart size={16} className="text-pink-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Linguagem do amor</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{result.linguagem_amor}</p>
              </CardContent>
            </Card>

            {/* Como estimular */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-blue-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Como estimular</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{result.como_brincar}</p>
              </CardContent>
            </Card>

            {/* Rotina ideal */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-emerald-500" />
                  <span className="font-semibold text-slate-800 dark:text-slate-100">Rotina ideal</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{result.rotina_ideal}</p>
              </CardContent>
            </Card>

            {/* Gatilhos de estresse */}
            {result.gatilhos?.length > 0 && (
              <Card className="border-red-100 dark:border-red-900/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">O que estresa este pet</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.gatilhos.map((g, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800">
                        {g}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tutor ideal */}
            <Card>
              <CardContent className="p-4">
                <div className="font-semibold text-slate-800 dark:text-slate-100 mb-2">👤 Tutor ideal</div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{result.tipo_tutor_ideal}</p>
              </CardContent>
            </Card>

            {/* Curiosidade */}
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} className="text-purple-500" />
                  <span className="font-semibold text-purple-800 dark:text-purple-300">Sabia que?</span>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">{result.curiosidade}</p>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full gap-2" onClick={() => { setResult(null); window.scrollTo(0,0) }}>
              🔄 Refazer análise
            </Button>

            <p className="text-xs text-center text-slate-400 dark:text-slate-500 pb-2">
              Análise gerada por IA com base no perfil e comportamento informado
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
