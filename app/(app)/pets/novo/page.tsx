'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { PetSpecies, PetSex } from '@/types'

const SPECIES: { value: PetSpecies; label: string; emoji: string }[] = [
  { value: 'dog',    label: 'Cachorro', emoji: '🐶' },
  { value: 'cat',    label: 'Gato',     emoji: '🐱' },
  { value: 'bird',   label: 'Pássaro',  emoji: '🐦' },
  { value: 'rabbit', label: 'Coelho',   emoji: '🐰' },
  { value: 'fish',   label: 'Peixe',    emoji: '🐟' },
  { value: 'hamster',label: 'Hamster',  emoji: '🐹' },
  { value: 'other',  label: 'Outro',    emoji: '🐾' },
]

export default function NovoPetPage() {
  const router       = useRouter()
  const { createPet } = usePets()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm] = useState({
    name: '', species: 'dog' as PetSpecies, breed: '', birth_date: '',
    sex: '' as PetSex | '', weight_kg: '', ideal_weight: '', color: '',
    microchip: '', notes: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

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
    if (pet) router.push(`/pets/${pet.id}`)
    else setError('Erro ao salvar. Tente novamente.')
  }

  const selectedSpecies = SPECIES.find(s => s.value === form.species)

  return (
    <div>
      <TopBar title="Novo Pet" subtitle="Preencha os dados do seu pet" />

      <div className="p-4 lg:p-6 max-w-xl">
        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Espécie selector */}
          <Card>
            <CardContent className="p-4">
              <label className="text-sm font-semibold text-slate-700 block mb-3">Tipo de pet</label>
              <div className="grid grid-cols-4 gap-2">
                {SPECIES.map(s => (
                  <button key={s.value} type="button"
                    onClick={() => setForm(p => ({ ...p, species: s.value }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-sm font-medium
                      ${form.species === s.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'}`}>
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
              <h3 className="font-semibold text-slate-700">Dados básicos</h3>
              <Input label={`Nome do ${selectedSpecies?.label || 'pet'}`} placeholder="Ex: Rex, Mimi..." value={form.name} onChange={set('name')} required />
              <Input label="Raça (opcional)" placeholder={`Ex: ${form.species === 'dog' ? 'Labrador' : 'Siamês'}`} value={form.breed} onChange={set('breed')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Data de nascimento" type="date" value={form.birth_date} onChange={set('birth_date')} />
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
              <h3 className="font-semibold text-slate-700">Peso</h3>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Peso atual (kg)" type="number" step="0.1" placeholder="Ex: 8.5" value={form.weight_kg} onChange={set('weight_kg')} />
                <Input label="Peso ideal (kg)" type="number" step="0.1" placeholder="Ex: 8.0" value={form.ideal_weight} onChange={set('ideal_weight')} />
              </div>
            </CardContent>
          </Card>

          {/* Extras */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-700">Informações extras</h3>
              <Input label="Microchip (opcional)" placeholder="Número do microchip" value={form.microchip} onChange={set('microchip')} />
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Observações</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
