'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { usePets, useDiary, useWeightHistory } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { PetPhotoUpload } from '@/components/PetPhotoUpload'
import { formatDate, petAge, weightStatus, speciesEmoji, getInitials } from '@/lib/utils'
import { DIARY_TYPE_LABELS, DIARY_TYPE_ICONS, SPECIES_LABELS, type DiaryType, type PetSex } from '@/types'
import {
  Plus, ChevronRight, ArrowLeft, Edit2, Trash2, Scale,
  Calendar, AlertTriangle, Stethoscope, Phone,
} from 'lucide-react'

const DIARY_TYPES: DiaryType[] = ['vaccine','appointment','deworming','exam','medication','bath','grooming','surgery','weight','note','other']

const SPECIES_GRADIENT: Record<string, string> = {
  dog:     'from-amber-400 to-orange-500',
  cat:     'from-violet-400 to-purple-500',
  bird:    'from-sky-400 to-cyan-500',
  rabbit:  'from-pink-400 to-rose-500',
  fish:    'from-teal-400 to-cyan-600',
  hamster: 'from-orange-300 to-amber-500',
  other:   'from-slate-400 to-slate-600',
}

const QUICK_LINKS = [
  { icon: '📖', label: 'Diário',        href: '/diario' },
  { icon: '📊', label: 'Relatório',     href: '/relatorios' },
  { icon: '✨', label: 'Personalidade', href: '/personalidade' },
  { icon: '🍽️', label: 'Nutrição',      href: '/nutricao' },
]

// ── PetDetail ────────────────────────────────────────────────────────────────

function PetDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const supabase = createClient()
  const { pets, updatePet, deletePet } = usePets()
  const { entries, addEntry, deleteEntry } = useDiary(id)
  const { history, addWeight } = useWeightHistory(id)
  const pet = pets.find(p => p.id === id)

  const [userId, setUserId]     = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [tab, setTab]           = useState<'diary'|'weight'>('diary')
  const [saving, setSaving]     = useState(false)

  // Modais
  const [modalDiary,  setModalDiary]  = useState(false)
  const [modalWeight, setModalWeight] = useState(false)
  const [modalDelete, setModalDelete] = useState(false)
  const [modalEdit,   setModalEdit]   = useState(false)

  // Formulário — novo registro diário
  const [diaryForm, setDiaryForm] = useState({
    type: 'appointment' as DiaryType, title: '', description: '',
    occurred_at: new Date().toISOString().slice(0,10),
    next_date: '', vet_name: '', product_name: '',
  })

  // Formulário — novo peso
  const [weightForm, setWeightForm] = useState({
    weight_kg: '', notes: '', measured_at: new Date().toISOString().slice(0,10)
  })

  // Formulário — edição do pet
  const [editForm, setEditForm] = useState({
    name: '', breed: '', sex: '' as PetSex | '',
    birth_date: '', neutered: false,
    weight_kg: '', ideal_weight: '',
    color: '', vet_name: '', vet_phone: '',
    microchip: '', notes: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (pet) setPhotoUrl(pet.photo_url ?? null)
  }, [pet?.photo_url])

  useEffect(() => {
    if (pet) setEditForm({
      name:         pet.name,
      breed:        pet.breed        ?? '',
      sex:          pet.sex          ?? '',
      birth_date:   pet.birth_date   ?? '',
      neutered:     pet.neutered,
      weight_kg:    pet.weight_kg    != null ? String(pet.weight_kg)    : '',
      ideal_weight: pet.ideal_weight != null ? String(pet.ideal_weight) : '',
      color:        pet.color        ?? '',
      vet_name:     pet.vet_name     ?? '',
      vet_phone:    pet.vet_phone    ?? '',
      microchip:    pet.microchip    ?? '',
      notes:        pet.notes        ?? '',
    })
  }, [pet?.id])

  if (!pet && pets.length > 0) { onBack(); return null }
  if (!pet) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )

  const ws       = pet.weight_kg && pet.ideal_weight ? weightStatus(pet.weight_kg, pet.ideal_weight) : null
  const gradient = SPECIES_GRADIENT[pet.species] ?? SPECIES_GRADIENT.other

  const setEdit = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditForm(p => ({ ...p, [k]: e.target.value }))

  async function saveEdit() {
    if (!editForm.name.trim()) return
    setSaving(true)
    const newWeight = editForm.weight_kg ? parseFloat(editForm.weight_kg) : undefined
    await updatePet(id, {
      name:         editForm.name.trim(),
      breed:        editForm.breed        || undefined,
      sex:          (editForm.sex         || undefined) as PetSex | undefined,
      birth_date:   editForm.birth_date   || undefined,
      neutered:     editForm.neutered,
      weight_kg:    newWeight,
      ideal_weight: editForm.ideal_weight ? parseFloat(editForm.ideal_weight) : undefined,
      color:        editForm.color        || undefined,
      vet_name:     editForm.vet_name     || undefined,
      vet_phone:    editForm.vet_phone    || undefined,
      microchip:    editForm.microchip    || undefined,
      notes:        editForm.notes        || undefined,
    })
    if (newWeight && pet && newWeight !== pet.weight_kg) {
      await supabase.from('pet_weight_history').insert({
        pet_id: id, weight_kg: newWeight,
        measured_at: new Date().toISOString().split('T')[0],
        notes: 'Atualizado no perfil',
      })
    }
    setSaving(false)
    setModalEdit(false)
  }

  async function saveDiary() {
    if (!diaryForm.title.trim()) return
    setSaving(true)
    await addEntry({
      pet_id: id, type: diaryForm.type, title: diaryForm.title,
      description: diaryForm.description || undefined,
      occurred_at: diaryForm.occurred_at,
      next_date:    diaryForm.next_date    || undefined,
      vet_name:     diaryForm.vet_name     || undefined,
      product_name: diaryForm.product_name || undefined,
    })
    setSaving(false)
    setModalDiary(false)
    setDiaryForm({ type:'appointment', title:'', description:'', occurred_at: new Date().toISOString().slice(0,10), next_date:'', vet_name:'', product_name:'' })
  }

  async function saveWeight() {
    if (!weightForm.weight_kg) return
    setSaving(true)
    const kg = parseFloat(weightForm.weight_kg)
    await addWeight({ pet_id: id, weight_kg: kg, notes: weightForm.notes || undefined, measured_at: weightForm.measured_at })
    await updatePet(id, { weight_kg: kg })
    setSaving(false)
    setModalWeight(false)
    setWeightForm({ weight_kg:'', notes:'', measured_at: new Date().toISOString().slice(0,10) })
  }

  async function confirmDelete() {
    await deletePet(id); onBack()
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={pet.name}
        leftAction={
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
        }
      />

      <div className="flex-1 overflow-auto pb-24">

        {/* ── Hero ── */}
        <div className="relative">
          <div className={`h-36 bg-gradient-to-br ${gradient}`} />
          {/* Foto sobreposta na borda inferior do gradiente */}
          <div className="absolute inset-x-0 bottom-0 translate-y-1/2 flex justify-center">
            {userId ? (
              <PetPhotoUpload
                petId={id} userId={userId}
                currentUrl={photoUrl} petName={pet.name}
                size="lg"
                onUploaded={async url => {
                  setPhotoUrl(url)
                  await updatePet(id, { photo_url: url })
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center text-4xl">
                {photoUrl
                  ? <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover rounded-full" />
                  : speciesEmoji(pet.species)
                }
              </div>
            )}
          </div>
        </div>

        {/* ── Nome + badges + editar ── */}
        <div className="pt-20 pb-4 text-center px-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pet.name}</h2>
            <button
              onClick={() => setModalEdit(true)}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Editar pet"
            >
              <Edit2 size={15} className="text-slate-400" />
            </button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pet.breed || SPECIES_LABELS[pet.species]}
            {pet.birth_date ? ` · ${petAge(pet.birth_date)}` : ''}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2.5 flex-wrap">
            {pet.sex && (
              <Badge variant="info">
                {pet.sex === 'male' ? '♂ Macho' : '♀ Fêmea'}
              </Badge>
            )}
            {pet.neutered && <Badge variant="success">✂️ Castrado</Badge>}
            {pet.color && (
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                {pet.color}
              </span>
            )}
          </div>
        </div>

        {/* ── Stats chips ── */}
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
          {pet.weight_kg != null && (
            <div className="shrink-0 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 text-center shadow-sm border border-slate-100 dark:border-slate-700 min-w-[80px]">
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{pet.weight_kg}<span className="text-xs font-normal text-slate-400"> kg</span></p>
              <p className="text-[11px] text-slate-400 mt-0.5">Peso</p>
              {ws && <p className={`text-[10px] font-semibold mt-0.5 ${ws.color}`}>{ws.icon} {ws.label}</p>}
            </div>
          )}
          {pet.ideal_weight != null && (
            <div className="shrink-0 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 text-center shadow-sm border border-slate-100 dark:border-slate-700 min-w-[80px]">
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{pet.ideal_weight}<span className="text-xs font-normal text-slate-400"> kg</span></p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ideal</p>
            </div>
          )}
          <div className="shrink-0 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 text-center shadow-sm border border-slate-100 dark:border-slate-700 min-w-[80px]">
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{entries.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Registros</p>
          </div>
          {history.length > 0 && (
            <div className="shrink-0 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 text-center shadow-sm border border-slate-100 dark:border-slate-700 min-w-[80px]">
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{history.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Pesagens</p>
            </div>
          )}
          {pet.microchip && (
            <div className="shrink-0 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 text-center shadow-sm border border-slate-100 dark:border-slate-700 min-w-[100px]">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[88px]">{pet.microchip}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Microchip</p>
            </div>
          )}
        </div>

        {/* ── Atalhos rápidos ── */}
        <div className="grid grid-cols-4 gap-3 px-4 mt-4">
          {QUICK_LINKS.map(item => (
            <Link key={item.href} href={item.href}>
              <div className="flex flex-col items-center gap-1.5 bg-white dark:bg-slate-800 rounded-2xl py-3 px-1 shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-700 transition-colors cursor-pointer">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center leading-tight">{item.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Veterinário ── */}
        {(pet.vet_name || pet.vet_phone) && (
          <div className="mx-4 mt-4 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Veterinário</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <Stethoscope size={16} className="text-blue-500" />
              </div>
              <div className="min-w-0">
                {pet.vet_name  && <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{pet.vet_name}</p>}
                {pet.vet_phone && (
                  <a href={`tel:${pet.vet_phone}`} className="flex items-center gap-1 text-xs text-blue-500 mt-0.5">
                    <Phone size={10} /> {pet.vet_phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Observações ── */}
        {pet.notes && (
          <div className="mx-4 mt-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-700/40">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1.5">📌 Observações</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{pet.notes}</p>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex bg-slate-100 dark:bg-slate-700/60 rounded-xl p-1 mx-4 mt-4">
          {[['diary','📖 Histórico'],['weight','⚖️ Peso']].map(([t, label]) => (
            <button key={t} type="button" onClick={() => setTab(t as 'diary'|'weight')}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${tab === t ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Histórico de saúde ── */}
        {tab === 'diary' && (
          <div className="px-4 mt-3">
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-1" onClick={() => setModalDiary(true)}>
                <Plus size={14} /> Novo registro
              </Button>
            </div>
            {entries.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-3">🩺</div>
                <p className="text-sm font-medium">Nenhum registro ainda</p>
                <p className="text-xs mt-1">Registre vacinas, consultas, banhos e mais</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map(e => (
                  <div key={e.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-lg flex-shrink-0">
                        {DIARY_TYPE_ICONS[e.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{e.title}</span>
                          <button onClick={() => deleteEntry(e.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 flex-shrink-0 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {DIARY_TYPE_LABELS[e.type]} · {formatDate(e.occurred_at)}
                        </div>
                        {e.description && <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{e.description}</p>}
                        {e.next_date && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                            <Calendar size={10} /> Próximo: {formatDate(e.next_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Histórico de peso ── */}
        {tab === 'weight' && (
          <div className="px-4 mt-3">
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-1" onClick={() => setModalWeight(true)}>
                <Plus size={14} /> Registrar peso
              </Button>
            </div>
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <div className="text-4xl mb-3">⚖️</div>
                <p className="text-sm font-medium">Nenhuma pesagem ainda</p>
                <p className="text-xs mt-1">Acompanhe a evolução do peso ao longo do tempo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...history].reverse().map((h, i) => {
                  const prev = [...history].reverse()[i + 1]
                  const diff = prev ? h.weight_kg - prev.weight_kg : null
                  return (
                    <div key={h.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Scale size={16} className="text-blue-500 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-100">{h.weight_kg} kg</span>
                              {diff !== null && (
                                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  diff > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                                  diff < 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' :
                                  'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                }`}>
                                  {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} kg
                                </span>
                              )}
                            </div>
                            {h.notes && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{h.notes}</p>}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">{formatDate(h.measured_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: Editar pet ── */}
      <Modal open={modalEdit} onClose={() => setModalEdit(false)} title={`Editar ${pet.name}`}>
        <div className="p-5 space-y-3">
          <Input label="Nome *" value={editForm.name} onChange={setEdit('name')} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Raça" placeholder="Ex: Labrador, SRD..." value={editForm.breed} onChange={setEdit('breed')} />
            <Select label="Sexo" value={editForm.sex} onChange={setEdit('sex')}
              options={[
                { value: '',       label: 'Não informado' },
                { value: 'male',   label: '♂ Macho' },
                { value: 'female', label: '♀ Fêmea' },
              ]} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Nascimento" type="date" value={editForm.birth_date} onChange={setEdit('birth_date')} />
            <Input label="Cor / pelagem" placeholder="Ex: Caramelo" value={editForm.color} onChange={setEdit('color')} />
          </div>

          {/* Toggle castrado */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/60 rounded-xl px-4 py-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Castrado(a)</span>
            <button
              type="button"
              onClick={() => setEditForm(p => ({ ...p, neutered: !p.neutered }))}
              className={`w-12 h-6 rounded-full relative transition-colors ${editForm.neutered ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${editForm.neutered ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Peso atual (kg)" type="number" step="0.1" placeholder="Ex: 8.5" value={editForm.weight_kg} onChange={setEdit('weight_kg')} />
            <Input label="Peso ideal (kg)" type="number" step="0.1" placeholder="Ex: 8.0" value={editForm.ideal_weight} onChange={setEdit('ideal_weight')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Veterinário" placeholder="Nome do vet" value={editForm.vet_name} onChange={setEdit('vet_name')} />
            <Input label="Telefone vet" placeholder="(21) 99999-9999" value={editForm.vet_phone} onChange={setEdit('vet_phone')} />
          </div>

          <Input label="Microchip" placeholder="Número do chip" value={editForm.microchip} onChange={setEdit('microchip')} />

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">Observações</label>
            <textarea
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2} value={editForm.notes} onChange={setEdit('notes')}
              placeholder="Alergias, comportamento, histórico..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalEdit(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveEdit}>Salvar</Button>
          </div>

          {/* Excluir no rodapé do modal */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setModalEdit(false); setModalDelete(true) }}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 transition-colors"
            >
              <Trash2 size={13} /> Excluir {pet.name}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Novo registro diário ── */}
      <Modal open={modalDiary} onClose={() => setModalDiary(false)} title="Novo registro">
        <div className="p-5 space-y-3">
          <Select label="Tipo" value={diaryForm.type} onChange={e => setDiaryForm(p => ({ ...p, type: e.target.value as DiaryType }))}
            options={DIARY_TYPES.map(t => ({ value: t, label: `${DIARY_TYPE_ICONS[t]} ${DIARY_TYPE_LABELS[t]}` }))} />
          <Input label="Título *" placeholder="Ex: Vacina V10 aplicada" value={diaryForm.title}
            onChange={e => setDiaryForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="Data" type="date" value={diaryForm.occurred_at}
            onChange={e => setDiaryForm(p => ({ ...p, occurred_at: e.target.value }))} />
          <Input label="Próxima dose / consulta" type="date" value={diaryForm.next_date}
            onChange={e => setDiaryForm(p => ({ ...p, next_date: e.target.value }))} />
          {['vaccine','deworming','medication'].includes(diaryForm.type) && (
            <Input label="Produto / medicamento" value={diaryForm.product_name}
              onChange={e => setDiaryForm(p => ({ ...p, product_name: e.target.value }))} />
          )}
          {['appointment','exam','surgery'].includes(diaryForm.type) && (
            <Input label="Veterinário" value={diaryForm.vet_name}
              onChange={e => setDiaryForm(p => ({ ...p, vet_name: e.target.value }))} />
          )}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 block mb-1.5">Observações</label>
            <textarea className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2} value={diaryForm.description} onChange={e => setDiaryForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalDiary(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveDiary}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Registrar peso ── */}
      <Modal open={modalWeight} onClose={() => setModalWeight(false)} title="Registrar peso">
        <div className="p-5 space-y-3">
          <Input label="Peso (kg) *" type="number" step="0.1" value={weightForm.weight_kg}
            onChange={e => setWeightForm(p => ({ ...p, weight_kg: e.target.value }))} />
          <Input label="Data" type="date" value={weightForm.measured_at}
            onChange={e => setWeightForm(p => ({ ...p, measured_at: e.target.value }))} />
          <Input label="Observações" value={weightForm.notes}
            onChange={e => setWeightForm(p => ({ ...p, notes: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalWeight(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveWeight}>Salvar</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Confirmar exclusão ── */}
      <Modal open={modalDelete} onClose={() => setModalDelete(false)} title="Excluir pet">
        <div className="p-5 text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-3" />
          <p className="text-slate-700 dark:text-slate-200 mb-1">
            Tem certeza que quer excluir <strong>{pet.name}</strong>?
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalDelete(false)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Lista de pets ─────────────────────────────────────────────────────────────

export default function PetsPage() {
  const { pets, loading } = usePets()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('id')
    if (id) setSelectedId(id)
  }, [])

  if (selectedId) {
    return <PetDetail id={selectedId} onBack={() => {
      setSelectedId(null)
      window.history.replaceState({}, '', window.location.pathname)
    }} />
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Meus Pets"
        subtitle={`${pets.length} pet${pets.length !== 1 ? 's' : ''} cadastrado${pets.length !== 1 ? 's' : ''}`}
      />

      <div className="flex-1 overflow-auto p-4 max-w-lg mx-auto w-full pb-24">
        <div className="flex justify-end mb-4">
          <Link href="/pets/novo">
            <Button className="gap-2"><Plus size={16} /> Novo pet</Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : pets.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-6xl mb-4">🐾</div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg mb-2">Nenhum pet ainda</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Cadastre seu primeiro pet para acompanhar a saúde dele
            </p>
            <Link href="/pets/novo">
              <Button size="lg">Cadastrar primeiro pet</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pets.map(pet => {
              const ws = pet.weight_kg && pet.ideal_weight ? weightStatus(pet.weight_kg, pet.ideal_weight) : null
              const grad = SPECIES_GRADIENT[pet.species] ?? SPECIES_GRADIENT.other
              return (
                <button key={pet.id} onClick={() => {
                  setSelectedId(pet.id)
                  window.history.pushState({}, '', `?id=${pet.id}`)
                }} className="w-full text-left">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Barra de cor no topo do card */}
                    <div className={`h-1.5 bg-gradient-to-r ${grad}`} />
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-3xl flex-shrink-0 ring-2 ring-slate-200 dark:ring-slate-600">
                        {pet.photo_url
                          ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                          : speciesEmoji(pet.species)
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{pet.name}</span>
                          {pet.sex && (
                            <span className="text-xs text-slate-400">
                              {pet.sex === 'male' ? '♂' : '♀'}
                            </span>
                          )}
                          {pet.neutered && <span className="text-xs text-slate-400">✂️</span>}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          {pet.breed || SPECIES_LABELS[pet.species]}
                          {pet.birth_date ? ` · ${petAge(pet.birth_date)}` : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {pet.weight_kg && (
                            <span className="text-xs text-slate-400">{pet.weight_kg} kg</span>
                          )}
                          {ws && (
                            <span className={`text-xs font-medium ${ws.color}`}>{ws.icon} {ws.label}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
