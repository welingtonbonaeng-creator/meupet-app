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
import type { Pet } from '@/types'
import { Scale, Plus, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react'
import { getIdealWeight } from '@/lib/idealWeight'

type WeightEntry = { id: string; pet_id: string; weight_kg: number; measured_at: string; notes?: string }

function calcAgeMonths(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function formatAge(months: number | null): string {
  if (!months) return '—'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`
  if (m === 0) return `${y} ${y === 1 ? 'ano' : 'anos'}`
  return `${y}a ${m}m`
}

export default function PesoPage() {
  const supabase = createClient()
  const { pets, loading: petsLoading } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [entries, setEntries] = useState<WeightEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ weight_kg: '', measured_at: new Date().toISOString().split('T')[0], notes: '' })
  const [saving, setSaving] = useState(false)

  const selectedPet = pets.find(p => p.id === selectedPetId) as Pet | undefined

  useEffect(() => { if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id) }, [pets])

  useEffect(() => {
    if (!selectedPetId) return
    setLoading(true)
    supabase.from('pet_weight_history').select('*').eq('pet_id', selectedPetId)
      .order('measured_at', { ascending: true })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false) })
  }, [selectedPetId])

  async function addWeight() {
    if (!selectedPetId || !form.weight_kg) return
    setSaving(true)
    const { data } = await supabase.from('pet_weight_history').insert({
      pet_id: selectedPetId,
      weight_kg: parseFloat(form.weight_kg),
      measured_at: form.measured_at,
      notes: form.notes || null,
    }).select().single()
    if (data) setEntries(prev => [...prev, data].sort((a, b) => a.measured_at.localeCompare(b.measured_at)))
    setSaving(false)
    setShowModal(false)
    setForm({ weight_kg: '', measured_at: new Date().toISOString().split('T')[0], notes: '' })
  }

  const latest = entries[entries.length - 1]
  const prev   = entries[entries.length - 2]
  const diff   = latest && prev ? (latest.weight_kg - prev.weight_kg) : null

  // Fallback: usa o peso salvo no cadastro quando ainda não há histórico
  const fallbackWeight = !latest && selectedPet?.weight_kg ? selectedPet.weight_kg : null
  const currentWeight  = latest?.weight_kg ?? fallbackWeight ?? null

  const petOptions = pets.map(p => ({ value: p.id, label: `${p.name}` }))
  const ageMonths  = calcAgeMonths(selectedPet?.birth_date ?? null)

  const storedIdeal = selectedPet?.ideal_weight ?? null
  const calculatedIdeal = selectedPet
    ? getIdealWeight(selectedPet.species, selectedPet.breed, ageMonths)
    : null
  const ideal       = storedIdeal ?? calculatedIdeal?.ideal ?? null
  const idealRange  = storedIdeal ? null : calculatedIdeal
  const status = currentWeight && ideal
    ? currentWeight > ideal * 1.1 ? 'acima' : currentWeight < ideal * 0.9 ? 'abaixo' : 'ideal'
    : null

  const statusBadge = {
    acima:  <Badge variant="warning">Acima do ideal</Badge>,
    abaixo: <Badge variant="danger">Abaixo do ideal</Badge>,
    ideal:  <Badge variant="success">Peso ideal ✓</Badge>,
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Histórico de Peso" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24">

        {/* Seletor */}
        {petsLoading ? <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" /> : (
          <Select label="Pet" options={petOptions} value={selectedPetId} onChange={e => setSelectedPetId(e.target.value)} />
        )}

        {selectedPet && (
          <>
            {/* Card de resumo */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Scale size={22} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {currentWeight ? `${currentWeight} kg` : '—'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {latest
                          ? `Medido em ${new Date(latest.measured_at + 'T12:00:00').toLocaleDateString('pt-BR')}`
                          : fallbackWeight
                          ? 'Peso informado no cadastro'
                          : 'Nenhum registro'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {status && statusBadge[status]}
                    {ideal && !idealRange && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">Ideal: {ideal} kg</div>
                    )}
                    {idealRange && (
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 justify-end">
                        <Sparkles size={10} />
                        <span>{idealRange.min}–{idealRange.max} kg</span>
                      </div>
                    )}
                  </div>
                </div>

                {diff !== null && (
                  <div className={`mt-3 flex items-center gap-1.5 text-sm font-medium ${
                    diff > 0 ? 'text-amber-600 dark:text-amber-400' : diff < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {diff > 0 ? <TrendingUp size={15} /> : diff < 0 ? <TrendingDown size={15} /> : <Minus size={15} />}
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg desde a medição anterior
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  {selectedPet.breed && (
                    <div className="text-slate-500 dark:text-slate-400">Raça: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedPet.breed}</span></div>
                  )}
                  {ageMonths && (
                    <div className="text-slate-500 dark:text-slate-400">Idade: <span className="font-medium text-slate-700 dark:text-slate-300">{formatAge(ageMonths)}</span></div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Gráfico simples de barras */}
            {entries.length > 1 && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Evolução do peso</p>
                  <div className="flex items-end gap-1.5 h-28">
                    {entries.map((e, i) => {
                      const max = Math.max(...entries.map(x => x.weight_kg))
                      const min = Math.min(...entries.map(x => x.weight_kg))
                      const range = max - min || 1
                      const pct = ((e.weight_kg - min) / range) * 70 + 20
                      const isLast = i === entries.length - 1
                      return (
                        <div key={e.id} className="flex-1 flex flex-col items-center gap-1">
                          <div className="text-[9px] text-slate-500 dark:text-slate-400 leading-none">{e.weight_kg}</div>
                          <div
                            className={`w-full rounded-t-md transition-all ${isLast ? 'bg-blue-500' : 'bg-blue-200 dark:bg-blue-800'}`}
                            style={{ height: `${pct}%` }}
                          />
                          <div className="text-[8px] text-slate-400 dark:text-slate-500 leading-none">
                            {new Date(e.measured_at + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {ideal && !idealRange && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">Peso ideal: {ideal} kg</p>
                  )}
                  {idealRange && (
                    <p className="text-xs text-blue-500 dark:text-blue-400 mt-2 text-center flex items-center justify-center gap-1">
                      <Sparkles size={10} /> Estimado pela raça: {idealRange.min}–{idealRange.max} kg
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Botão adicionar */}
            <Button onClick={() => setShowModal(true)} className="w-full gap-2">
              <Plus size={16} /> Registrar Peso
            </Button>

            {/* Histórico */}
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Scale size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum registro ainda</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Clique em "Registrar Peso" para começar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Todos os registros</p>
                {[...entries].reverse().map((e, i) => (
                  <Card key={e.id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{e.weight_kg} kg</div>
                        {e.notes && <div className="text-xs text-slate-500 dark:text-slate-400">{e.notes}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(e.measured_at + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        {i === 0 && <Badge variant="info" className="mt-1">Mais recente</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal adicionar */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Registrar Peso">
        <div className="p-5 space-y-4">
          <Input label="Peso (kg)" type="number" step="0.1" min="0" placeholder="Ex: 28.5"
            value={form.weight_kg} onChange={e => setForm(p => ({ ...p, weight_kg: e.target.value }))} />
          <Input label="Data da medição" type="date"
            value={form.measured_at} onChange={e => setForm(p => ({ ...p, measured_at: e.target.value }))} />
          <Input label="Observações (opcional)" placeholder="Ex: após consulta, em jejum..."
            value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={addWeight} disabled={!form.weight_kg}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
