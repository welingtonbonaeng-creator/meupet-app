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
import { DIARY_TYPE_LABELS, DIARY_TYPE_ICONS, type DiaryType } from '@/types'
import {
  Plus, ChevronRight, ArrowLeft, Edit2, Trash2, Scale,
  Calendar, AlertTriangle
} from 'lucide-react'

const DIARY_TYPES: DiaryType[] = ['vaccine','appointment','deworming','exam','medication','bath','grooming','surgery','weight','note','other']

// ── Detail view (quando ?id= está presente) ─────────────────────────────────

function PetDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const supabase = createClient()
  const { pets, updatePet, deletePet } = usePets()
  const { entries, addEntry, deleteEntry } = useDiary(id)
  const { history, addWeight } = useWeightHistory(id)
  const pet = pets.find(p => p.id === id)
  const [userId, setUserId] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  useEffect(() => {
    if (pet) setPhotoUrl(pet.photo_url ?? null)
  }, [pet?.photo_url])

  const [tab, setTab]           = useState<'diary'|'weight'>('diary')
  const [modalDiary, setModalDiary]   = useState(false)
  const [modalWeight, setModalWeight] = useState(false)
  const [modalDelete, setModalDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [diaryForm, setDiaryForm] = useState({
    type: 'appointment' as DiaryType, title: '', description: '',
    occurred_at: new Date().toISOString().slice(0,10),
    next_date: '', vet_name: '', product_name: '',
  })
  const [weightForm, setWeightForm] = useState({
    weight_kg: '', notes: '', measured_at: new Date().toISOString().slice(0,10)
  })

  if (!pet && pets.length > 0) { onBack(); return null }
  if (!pet) return <div className="p-8 text-center text-slate-400 animate-pulse">Carregando...</div>

  const ws = pet.weight_kg && pet.ideal_weight ? weightStatus(pet.weight_kg, pet.ideal_weight) : null

  async function saveDiary() {
    if (!diaryForm.title.trim()) return
    setSaving(true)
    await addEntry({ pet_id: id, type: diaryForm.type, title: diaryForm.title,
      description: diaryForm.description || undefined, occurred_at: diaryForm.occurred_at,
      next_date: diaryForm.next_date || undefined, vet_name: diaryForm.vet_name || undefined,
      product_name: diaryForm.product_name || undefined })
    setSaving(false); setModalDiary(false)
    setDiaryForm({ type:'appointment', title:'', description:'', occurred_at: new Date().toISOString().slice(0,10), next_date:'', vet_name:'', product_name:'' })
  }

  async function saveWeight() {
    if (!weightForm.weight_kg) return
    setSaving(true)
    const kg = parseFloat(weightForm.weight_kg)
    await addWeight({ pet_id: id, weight_kg: kg, notes: weightForm.notes || undefined, measured_at: weightForm.measured_at })
    await updatePet(id, { weight_kg: kg })
    setSaving(false); setModalWeight(false)
    setWeightForm({ weight_kg:'', notes:'', measured_at: new Date().toISOString().slice(0,10) })
  }

  async function confirmDelete() {
    await deletePet(id); onBack()
  }

  return (
    <div>
      <TopBar
        title={pet.name}
        subtitle={`${pet.breed || pet.species}${pet.birth_date ? ' · ' + petAge(pet.birth_date) : ''}`}
        leftAction={<button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100"><ArrowLeft size={20} /></button>}
      />

      <div className="p-4 lg:p-6 max-w-2xl space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              {userId ? (
                <PetPhotoUpload
                  petId={id}
                  userId={userId}
                  currentUrl={photoUrl}
                  petName={pet.name}
                  size="lg"
                  onUploaded={url => setPhotoUrl(url)}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center text-4xl flex-shrink-0">
                  {photoUrl ? <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover" /> : speciesEmoji(pet.species)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-xl font-bold text-slate-800">{pet.name}</h2>
                  {pet.sex && <Badge variant="info">{pet.sex === 'male' ? '♂ Macho' : '♀ Fêmea'}</Badge>}
                </div>
                {pet.color && <div className="text-sm text-slate-500">{pet.color}</div>}
                {pet.microchip && <div className="text-xs text-slate-400 mt-0.5">Chip: {pet.microchip}</div>}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 hover:bg-red-50" onClick={() => setModalDelete(true)}>
                    <Trash2 size={12} /> Excluir
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
              <div className="text-center">
                <div className="text-lg font-bold text-slate-800">{pet.weight_kg ? `${pet.weight_kg}kg` : '—'}</div>
                <div className="text-xs text-slate-500">Peso atual</div>
                {ws && <div className={`text-xs font-medium mt-0.5 ${ws.color}`}>{ws.icon} {ws.label}</div>}
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-slate-800">{pet.birth_date ? petAge(pet.birth_date) : '—'}</div>
                <div className="text-xs text-slate-500">Idade</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-slate-800">{entries.length}</div>
                <div className="text-xs text-slate-500">Registros</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {pet.notes && (
          <Card><CardContent className="p-4">
            <div className="text-xs font-semibold text-slate-500 mb-1">OBSERVAÇÕES</div>
            <p className="text-sm text-slate-700">{pet.notes}</p>
          </CardContent></Card>
        )}

        <div className="flex bg-slate-100 rounded-xl p-1">
          {[['diary','📖 Diário'],['weight','⚖️ Peso']].map(([t, label]) => (
            <button key={t} type="button" onClick={() => setTab(t as 'diary'|'weight')}
              className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'diary' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-1" onClick={() => setModalDiary(true)}><Plus size={14} /> Novo registro</Button>
            </div>
            {entries.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-400 text-sm">Nenhum registro ainda</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {entries.map(e => (
                  <Card key={e.id}><CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">
                        {DIARY_TYPE_ICONS[e.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-800 text-sm">{e.title}</span>
                          <button onClick={() => deleteEntry(e.id)} className="text-slate-300 hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{DIARY_TYPE_LABELS[e.type]} · {formatDate(e.occurred_at)}</div>
                        {e.description && <div className="text-xs text-slate-600 mt-1">{e.description}</div>}
                        {e.next_date && <div className="text-xs text-amber-600 mt-1 flex items-center gap-1"><Calendar size={10} /> Próximo: {formatDate(e.next_date)}</div>}
                      </div>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'weight' && (
          <div>
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-1" onClick={() => setModalWeight(true)}><Plus size={14} /> Registrar peso</Button>
            </div>
            {history.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-400 text-sm">Nenhum registro de peso ainda</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {[...history].reverse().map(h => (
                  <Card key={h.id}><CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Scale size={16} className="text-blue-500" />
                        <div>
                          <span className="font-bold text-slate-800">{h.weight_kg} kg</span>
                          {h.notes && <div className="text-xs text-slate-500">{h.notes}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400">{formatDate(h.measured_at)}</div>
                    </div>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal open={modalDiary} onClose={() => setModalDiary(false)} title="Novo registro">
        <div className="space-y-3">
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
            <label className="text-sm font-semibold text-slate-700 block mb-1.5">Observações</label>
            <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2} value={diaryForm.description} onChange={e => setDiaryForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalDiary(false)}>Cancelar</Button>
            <Button className="flex-1" loading={saving} onClick={saveDiary}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalWeight} onClose={() => setModalWeight(false)} title="Registrar peso">
        <div className="space-y-3">
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

      <Modal open={modalDelete} onClose={() => setModalDelete(false)} title="Excluir pet">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-3" />
          <p className="text-slate-700 mb-1">Tem certeza que quer excluir <strong>{pet.name}</strong>?</p>
          <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalDelete(false)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" onClick={confirmDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Lista de pets (view padrão) ──────────────────────────────────────────────

export default function PetsPage() {
  const { pets, loading } = usePets()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Ler ?id= da URL sem useSearchParams (evita Suspense wrapper no static export)
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
    <div>
      <TopBar title="Meus Pets" subtitle={`${pets.length} pet${pets.length !== 1 ? 's' : ''} cadastrado${pets.length !== 1 ? 's' : ''}`} />

      <div className="p-4 lg:p-6 max-w-2xl">
        <div className="flex justify-end mb-4">
          <Link href="/meupet-app/pets/novo/">
            <Button className="gap-2"><Plus size={16} /> Novo pet</Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
        ) : pets.length === 0 ? (
          <Card><CardContent className="p-12 text-center">
            <div className="text-5xl mb-4">🐾</div>
            <h3 className="font-bold text-slate-700 mb-2">Nenhum pet ainda</h3>
            <p className="text-slate-500 text-sm mb-6">Cadastre seu primeiro pet para acompanhar a saúde dele</p>
            <Link href="/meupet-app/pets/novo/"><Button size="lg">Cadastrar primeiro pet</Button></Link>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pets.map(pet => {
              const ws = pet.weight_kg && pet.ideal_weight ? weightStatus(pet.weight_kg, pet.ideal_weight) : null
              return (
                <button key={pet.id} onClick={() => {
                  setSelectedId(pet.id)
                  window.history.pushState({}, '', `?id=${pet.id}`)
                }} className="w-full text-left">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center text-3xl flex-shrink-0">
                          {pet.photo_url ? <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" /> : speciesEmoji(pet.species)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-base">{pet.name}</span>
                            {pet.sex && <Badge variant="info" className="text-xs">{pet.sex === 'male' ? '♂ Macho' : '♀ Fêmea'}</Badge>}
                          </div>
                          <div className="text-sm text-slate-500 mt-0.5">{pet.breed || pet.species}{pet.birth_date ? ` · ${petAge(pet.birth_date)}` : ''}</div>
                          {pet.weight_kg && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-400">{pet.weight_kg} kg</span>
                              {ws && <span className={`text-xs font-medium ${ws.color}`}>{ws.icon} {ws.label}</span>}
                            </div>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-slate-300 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
