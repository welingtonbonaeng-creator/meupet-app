'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { PetSpecies, PetSex } from '@/types'
import { getIdealWeight, DOG_BREED_NAMES, CAT_BREED_NAMES } from '@/lib/idealWeight'
import { Sparkles, CalendarDays, Clock } from 'lucide-react'

function BreedAutocomplete({
  species, value, onChange,
}: { species: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const list = species === 'dog' ? DOG_BREED_NAMES : species === 'cat' ? CAT_BREED_NAMES : []
  const filtered = value.length >= 1
    ? list.filter(b => b.toLowerCase().includes(value.toLowerCase()))
    : list.slice(0, 10)

  return (
    <div className="relative">
      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">
        Raça {list.length > 0 ? '(opcional)' : '(opcional)'}
      </label>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={species === 'dog' ? 'Ex: Labrador, Poodle, Shih Tzu...' : species === 'cat' ? 'Ex: Siamês, Persa, SRD...' : 'Ex: Anão, Holland Lop...'}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && list.length > 0 && filtered.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.map(breed => (
            <button
              key={breed} type="button"
              onMouseDown={() => { onChange(breed); setOpen(false) }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:bg-blue-900/30 dark:hover:bg-blue-900/30 transition-colors first:rounded-t-xl last:rounded-b-xl"
            >
              {breed}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const SPECIES: { value: PetSpecies; label: string; emoji: string }[] = [
  { value: 'dog',    label: 'Cachorro', emoji: '🐶' },
  { value: 'cat',    label: 'Gato',     emoji: '🐱' },
  { value: 'bird',   label: 'Pássaro',  emoji: '🐦' },
  { value: 'rabbit', label: 'Coelho',   emoji: '🐰' },
  { value: 'fish',   label: 'Peixe',    emoji: '🐟' },
  { value: 'hamster',label: 'Hamster',  emoji: '🐹' },
  { value: 'other',  label: 'Outro',    emoji: '🐾' },
]

function calcAgeMonths(birthDate: string): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now   = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function formatAge(months: number): string {
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`
  if (m === 0) return `${y} ${y === 1 ? 'ano' : 'anos'}`
  return `${y} ${y === 1 ? 'ano' : 'anos'} e ${m} ${m === 1 ? 'mês' : 'meses'}`
}

export default function NovoPetPage() {
  const router        = useRouter()
  const { createPet } = usePets()
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [idealSuggestion, setIdealSuggestion] = useState<{ label: string; value: number } | null>(null)
  const [userEditedIdeal, setUserEditedIdeal]  = useState(false)

  // Modo de entrada de data
  const [birthMode, setBirthMode] = useState<'date' | 'age'>('date')
  const [ageYears,  setAgeYears]  = useState('')
  const [ageMths,   setAgeMths]   = useState('')

  const [form, setForm] = useState({
    name: '', species: 'dog' as PetSpecies, breed: '', birth_date: '',
    sex: '' as PetSex | '', weight_kg: '', ideal_weight: '', color: '',
    microchip: '', notes: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }))
    if (k === 'ideal_weight') setUserEditedIdeal(true)
  }

  // Quando usuário informa a idade, calcula o ano de nascimento e preenche birth_date
  useEffect(() => {
    if (birthMode !== 'age') return
    const y = parseInt(ageYears) || 0
    const m = parseInt(ageMths)  || 0
    if (y === 0 && m === 0) { setForm(p => ({ ...p, birth_date: '' })); return }
    const d = new Date()
    d.setFullYear(d.getFullYear() - y)
    d.setMonth(d.getMonth() - m)
    // Preenche o ano calculado; dia e mês ficam como hoje (usuário pode ajustar no campo data abaixo)
    setForm(p => ({ ...p, birth_date: d.toISOString().split('T')[0] }))
  }, [ageYears, ageMths, birthMode])

  // Sugestão de peso ideal
  useEffect(() => {
    const months = calcAgeMonths(form.birth_date)
    const result = getIdealWeight(form.species, form.breed, months)
    if (result) {
      const label = result.source === 'breed'
        ? `${result.min}–${result.max} kg pela raça${!result.isAdult ? ' (filhote)' : ''}`
        : `${result.min}–${result.max} kg estimado`
      setIdealSuggestion({ label, value: result.ideal })
      if (!userEditedIdeal) setForm(p => ({ ...p, ideal_weight: String(result.ideal) }))
    } else {
      setIdealSuggestion(null)
    }
  }, [form.species, form.breed, form.birth_date])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setError(''); setLoading(true)
    const pet = await createPet({
      name:         form.name.trim(),
      species:      form.species,
      breed:        form.breed || undefined,
      birth_date:   form.birth_date || undefined,
      sex:          (form.sex || undefined) as PetSex | undefined,
      weight_kg:    form.weight_kg    ? parseFloat(form.weight_kg)    : undefined,
      ideal_weight: form.ideal_weight ? parseFloat(form.ideal_weight) : undefined,
      color:        form.color || undefined,
      microchip:    form.microchip || undefined,
      notes:        form.notes || undefined,
    })
    setLoading(false)
    if (pet) router.push(`/pets?id=${pet.id}`)
    else setError('Erro ao salvar. Tente novamente.')
  }

  const selectedSpecies = SPECIES.find(s => s.value === form.species)
  const ageMonthsCalc   = form.birth_date ? calcAgeMonths(form.birth_date) : null

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Novo Pet" subtitle="Preencha os dados do seu pet" />

      <div className="flex-1 overflow-auto p-4 pb-24 max-w-xl">
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Espécie */}
          <Card>
            <CardContent className="p-4">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-3">Tipo de pet</label>
              <div className="grid grid-cols-4 gap-2">
                {SPECIES.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => { setForm(p => ({ ...p, species: s.value })); setUserEditedIdeal(false) }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-sm font-medium
                      ${form.species === s.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700'
                        : 'border-slate-100 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-200'}`}>
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-[10px]">{s.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Dados básicos */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">Dados básicos</h3>
              <Input label={`Nome do ${selectedSpecies?.label || 'pet'}`} placeholder="Ex: Rex, Mimi..." value={form.name} onChange={set('name')} required />
              <BreedAutocomplete
                species={form.species}
                value={form.breed}
                onChange={v => { setForm(p => ({ ...p, breed: v })); setUserEditedIdeal(false) }}
              />

              {/* Toggle data / idade */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-2">Nascimento</label>
                <div className="flex gap-2 mb-3">
                  <button type="button"
                    onClick={() => setBirthMode('date')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all
                      ${birthMode === 'date' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <CalendarDays size={13} /> Data de nascimento
                  </button>
                  <button type="button"
                    onClick={() => setBirthMode('age')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all
                      ${birthMode === 'age' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                    <Clock size={13} /> Informar idade
                  </button>
                </div>

                {birthMode === 'date' ? (
                  <div>
                    <input
                      type="date"
                      value={form.birth_date}
                      onChange={set('birth_date')}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {ageMonthsCalc !== null && ageMonthsCalc >= 0 && (
                      <p className="text-xs text-slate-500 mt-1.5 pl-1">
                        Idade: <span className="font-semibold text-slate-700 dark:text-slate-200">{formatAge(ageMonthsCalc)}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-500 font-medium block mb-1">Anos</label>
                        <input
                          type="number" min="0" max="30" placeholder="0"
                          value={ageYears}
                          onChange={e => setAgeYears(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 font-medium block mb-1">Meses</label>
                        <input
                          type="number" min="0" max="11" placeholder="0"
                          value={ageMths}
                          onChange={e => setAgeMths(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {form.birth_date && (
                      <div className="bg-slate-50 dark:bg-slate-700 border border-slate-200 rounded-xl p-3 space-y-2">
                        <p className="text-xs text-slate-500">
                          Ano estimado: <span className="font-semibold text-slate-700 dark:text-slate-200">{form.birth_date.slice(0, 4)}</span>
                          <span className="text-slate-400"> · ajuste a data completa se souber:</span>
                        </p>
                        <input
                          type="date"
                          value={form.birth_date}
                          onChange={set('birth_date')}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Select label="Sexo" value={form.sex} onChange={set('sex')}
                  options={[
                    { value: '',       label: 'Não informado' },
                    { value: 'male',   label: '♂ Macho' },
                    { value: 'female', label: '♀ Fêmea' },
                  ]} />
              </div>
              <Input label="Cor / pelagem (opcional)" placeholder="Ex: Caramelo, Preto e branco" value={form.color} onChange={set('color')} />
            </CardContent>
          </Card>

          {/* Peso */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">Peso</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Peso atual (kg)" type="number" step="0.1" placeholder="Ex: 8.5" value={form.weight_kg} onChange={set('weight_kg')} />
                <Input label="Peso ideal (kg)" type="number" step="0.1" placeholder="Ex: 8.0" value={form.ideal_weight} onChange={set('ideal_weight')} />
              </div>
              {idealSuggestion && (
                <div className="flex items-center gap-2 text-xs bg-blue-50 dark:bg-blue-900/30 border border-blue-200 rounded-xl px-3 py-2">
                  <Sparkles size={12} className="text-blue-500 shrink-0" />
                  <span className="text-blue-700">{idealSuggestion.label}</span>
                  {userEditedIdeal && (
                    <button
                      type="button"
                      onClick={() => { setForm(p => ({ ...p, ideal_weight: String(idealSuggestion.value) })); setUserEditedIdeal(false) }}
                      className="ml-auto text-blue-600 font-semibold hover:underline whitespace-nowrap"
                    >
                      Usar sugestão
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extras */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">Informações extras</h3>
              <Input label="Microchip (opcional)" placeholder="Número do microchip" value={form.microchip} onChange={set('microchip')} />
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">Observações</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3} placeholder="Alergias, comportamento, histórico..." value={form.notes}
                  onChange={set('notes')} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
            <Button type="submit" loading={loading} className="flex-1">Salvar pet 🐾</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
