'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Pet } from '@/types'
import { Scale, Plus, TrendingUp, TrendingDown, Minus, Sparkles, Trash2 } from 'lucide-react'
import { getIdealWeight } from '@/lib/idealWeight'
import { speciesEmoji } from '@/lib/utils'

type WeightEntry = { id: string; pet_id: string; weight_kg: number; measured_at: string; notes?: string }

function calcAgeMonths(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const now = new Date()
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
}

function formatAge(months: number | null): string {
  if (!months) return '—'
  const y = Math.floor(months / 12), m = months % 12
  if (y === 0) return `${m} ${m === 1 ? 'mês' : 'meses'}`
  if (m === 0) return `${y} ${y === 1 ? 'ano' : 'anos'}`
  return `${y}a ${m}m`
}

// ── Gráfico de linha SVG ─────────────────────────────────────────────────────
function WeightLineChart({ entries, idealWeight }: { entries: WeightEntry[], idealWeight?: number | null }) {
  if (entries.length < 2) return null
  const W = 300, H = 120
  const pad = { t: 14, r: 14, b: 26, l: 38 }
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b
  const weights = entries.map(e => e.weight_kg)
  const allVals = idealWeight ? [...weights, idealWeight] : weights
  const minV = Math.min(...allVals), maxV = Math.max(...allVals)
  const range = maxV - minV || 0.5
  const x = (i: number) => pad.l + (i / Math.max(entries.length - 1, 1)) * iW
  const y = (v: number) => pad.t + ((maxV - v) / range) * iH
  const pts = entries.map((e, i) => `${x(i)},${y(e.weight_kg)}`).join(' ')
  const fmtDate = (d: string) => new Date(d + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  const yTicks = [minV, (minV + maxV) / 2, maxV]
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-3">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Evolução do peso</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)} stroke="#e2e8f0" strokeWidth="0.8" strokeDasharray="3,3" />
            <text x={pad.l - 5} y={y(v) + 3.5} textAnchor="end" fontSize="8.5" fill="#94a3b8">{v.toFixed(1)}</text>
          </g>
        ))}
        {idealWeight != null && (
          <line x1={pad.l} y1={y(idealWeight)} x2={W - pad.r} y2={y(idealWeight)}
            stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.8" />
        )}
        <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {entries.map((e, i) => {
          const isLast = i === entries.length - 1
          return (
            <g key={e.id}>
              {isLast && <circle cx={x(i)} cy={y(e.weight_kg)} r={8} fill="#3b82f6" fillOpacity="0.12" />}
              <circle cx={x(i)} cy={y(e.weight_kg)} r={isLast ? 4.5 : 3.5}
                fill={isLast ? '#3b82f6' : '#fff'} stroke="#3b82f6" strokeWidth="2" />
            </g>
          )
        })}
        <text x={x(0)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">{fmtDate(entries[0].measured_at)}</text>
        <text x={x(entries.length - 1)} y={H - 4} textAnchor="middle" fontSize="8" fill="#94a3b8">{fmtDate(entries[entries.length - 1].measured_at)}</text>
      </svg>
      {idealWeight != null && (
        <div className="flex items-center gap-1.5 mt-1 px-1">
          <div className="w-5 border-t-2 border-dashed border-emerald-500" />
          <span className="text-[10px] text-slate-400">ideal: {idealWeight} kg</span>
        </div>
      )}
    </div>
  )
}

// ── Resumo 3 chips ───────────────────────────────────────────────────────────
function WeightSummary({ entries }: { entries: WeightEntry[] }) {
  if (entries.length < 2) return null
  const weights = entries.map(e => e.weight_kg)
  const diff = weights[weights.length - 1] - weights[0]
  const min = Math.min(...weights), max = Math.max(...weights)
  const diffColor = diff > 0 ? 'text-red-500' : diff < 0 ? 'text-emerald-600' : 'text-slate-400'
  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Variação', value: `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`, color: diffColor },
        { label: 'Mínimo',   value: `${min} kg`, color: 'text-slate-700 dark:text-slate-200' },
        { label: 'Máximo',   value: `${max} kg`, color: 'text-slate-700 dark:text-slate-200' },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-white dark:bg-slate-800 rounded-xl px-2 py-2.5 text-center border border-slate-100 dark:border-slate-700">
          <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
          <p className={`text-sm font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  )
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

  async function deleteEntry(id: string) {
    await supabase.from('pet_weight_history').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const latest = entries[entries.length - 1]
  const prev   = entries[entries.length - 2]
  const diff   = latest && prev ? (latest.weight_kg - prev.weight_kg) : null
  const fallbackWeight = !latest && selectedPet?.weight_kg ? selectedPet.weight_kg : null
  const currentWeight  = latest?.weight_kg ?? fallbackWeight ?? null
  const ageMonths      = calcAgeMonths(selectedPet?.birth_date ?? null)
  const storedIdeal    = selectedPet?.ideal_weight ?? null
  const calculatedIdeal = selectedPet ? getIdealWeight(selectedPet.species, selectedPet.breed, ageMonths) : null
  const ideal      = storedIdeal ?? calculatedIdeal?.ideal ?? null
  const idealRange = storedIdeal ? null : calculatedIdeal
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
      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-2xl mx-auto w-full pb-24">

        {/* Seletor de pet — strip de avatares */}
        {petsLoading ? (
          <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        ) : pets.length > 1 && (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
            {pets.map(p => (
              <button key={p.id} onClick={() => setSelectedPetId(p.id)}
                className="flex flex-col items-center gap-1.5 shrink-0 transition-opacity"
                style={{ opacity: selectedPetId === p.id ? 1 : 0.45 }}>
                <div className={`w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl ring-2 transition-all ${selectedPetId === p.id ? 'ring-blue-500' : 'ring-slate-200 dark:ring-slate-600'}`}>
                  {p.photo_url
                    ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                    : speciesEmoji(p.species)
                  }
                </div>
                <span className={`text-xs font-semibold ${selectedPetId === p.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {selectedPet && (
          <>
            {/* Card resumo atual */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-2xl flex-shrink-0">
                      {selectedPet.photo_url
                        ? <img src={selectedPet.photo_url} alt={selectedPet.name} className="w-full h-full object-cover" />
                        : speciesEmoji(selectedPet.species)
                      }
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-0.5">{selectedPet.name}</p>
                      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {currentWeight ? `${currentWeight} kg` : '—'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {latest
                          ? `Medido em ${new Date(latest.measured_at + 'T12:00:00').toLocaleDateString('pt-BR')}`
                          : fallbackWeight ? 'Peso informado no cadastro'
                          : 'Nenhum registro'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {status && statusBadge[status]}
                    {ideal && !idealRange && <div className="text-xs text-slate-500">Ideal: {ideal} kg</div>}
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
                    diff > 0 ? 'text-amber-600' : diff < 0 ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {diff > 0 ? <TrendingUp size={15} /> : diff < 0 ? <TrendingDown size={15} /> : <Minus size={15} />}
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg desde a medição anterior
                  </div>
                )}

                {(selectedPet.breed || ageMonths) && (
                  <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {selectedPet.breed && <span>Raça: <b className="text-slate-700 dark:text-slate-300">{selectedPet.breed}</b></span>}
                    {ageMonths   && <span>Idade: <b className="text-slate-700 dark:text-slate-300">{formatAge(ageMonths)}</b></span>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo + Gráfico */}
            <WeightSummary entries={entries} />
            <WeightLineChart entries={entries} idealWeight={ideal} />

            {/* Botão registrar */}
            <Button onClick={() => setShowModal(true)} className="w-full gap-2">
              <Plus size={16} /> Registrar Peso
            </Button>

            {/* Lista de registros */}
            {loading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Scale size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-slate-500 text-sm">Nenhum registro ainda</p>
                  <p className="text-slate-400 text-xs mt-1">Clique em "Registrar Peso" para começar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Todos os registros</p>
                {[...entries].reverse().map((e, i) => {
                  const eprev = [...entries].reverse()[i + 1]
                  const ediff = eprev ? e.weight_kg - eprev.weight_kg : null
                  return (
                    <div key={e.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Scale size={15} className="text-blue-500 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{e.weight_kg} kg</span>
                            {ediff !== null && (
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                                ediff > 0 ? 'bg-red-50 text-red-500' :
                                ediff < 0 ? 'bg-emerald-50 text-emerald-600' :
                                'bg-slate-100 text-slate-400'
                              }`}>
                                {ediff > 0 ? '+' : ''}{ediff.toFixed(1)} kg
                              </span>
                            )}
                            {i === 0 && <Badge variant="info" className="text-[10px]">Recente</Badge>}
                          </div>
                          {e.notes && <p className="text-xs text-slate-500 mt-0.5">{e.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {new Date(e.measured_at + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <button onClick={() => deleteEntry(e.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Apagar">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

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
