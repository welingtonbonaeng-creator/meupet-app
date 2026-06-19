'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Modal } from '@/components/ui/modal'
import { Camera, ImagePlus, X } from 'lucide-react'
import type { Pet } from '@/types'

interface PetPost {
  id: string
  pet_id: string
  caption: string | null
  media_url: string | null
  media_type: 'image' | 'video' | 'note'
  created_at: string
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦',
  rabbit: '🐰', fish: '🐟', hamster: '🐹', other: '🐾',
}

const NOTE_GRADIENTS: [string, string][] = [
  ['from-rose-400 via-pink-300 to-rose-300',     'text-white'],
  ['from-violet-500 via-purple-400 to-pink-400', 'text-white'],
  ['from-sky-400 via-blue-400 to-indigo-400',    'text-white'],
  ['from-amber-400 via-orange-300 to-yellow-300','text-amber-900'],
  ['from-emerald-400 via-teal-300 to-cyan-300',  'text-emerald-900'],
  ['from-pink-400 via-rose-300 to-orange-300',   'text-white'],
]

function relativeTime(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'agora'
  if (mins  < 60) return `${mins} min`
  if (hours < 24) return `${hours}h`
  if (days  < 7)  return `${days}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function PetStory({ pet, active, onClick }: { pet: Pet; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 shrink-0">
      <div className={`p-[2px] rounded-full transition-all ${active ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
        <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-2xl">
          {SPECIES_EMOJI[pet.species] ?? '🐾'}
        </div>
      </div>
      <span className="text-[10px] text-slate-600 dark:text-slate-400 max-w-[56px] truncate font-medium">{pet.name}</span>
    </button>
  )
}

function PostCard({ post, gradientIdx }: { post: PetPost & { pet: Pet }; gradientIdx: number }) {
  const [liked, setLiked] = useState(false)
  const [grad, textColor] = NOTE_GRADIENTS[gradientIdx % NOTE_GRADIENTS.length]

  return (
    <article className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700/60">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 flex items-center justify-center text-lg shrink-0">
          {SPECIES_EMOJI[post.pet.species]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-none">{post.pet.name}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{relativeTime(post.created_at)}</p>
        </div>
      </div>

      {/* Imagem */}
      {post.media_url && post.media_type === 'image' && (
        <div className="aspect-square bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <img
            src={post.media_url}
            alt={post.caption ?? post.pet.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Vídeo */}
      {post.media_url && post.media_type === 'video' && (
        <div className="aspect-video bg-black overflow-hidden">
          <video src={post.media_url} className="w-full h-full object-cover" controls playsInline />
        </div>
      )}

      {/* Nota sem mídia — cartão gradiente */}
      {!post.media_url && post.caption && (
        <div className={`bg-gradient-to-br ${grad} px-6 py-10 min-h-[160px] flex items-center justify-center`}>
          <p className={`${textColor} text-lg font-semibold text-center leading-relaxed drop-shadow-sm`}>
            &ldquo;{post.caption}&rdquo;
          </p>
        </div>
      )}

      {/* Legenda abaixo da mídia */}
      {post.media_url && post.caption && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
            <span className="font-bold">{post.pet.name}</span>{' '}{post.caption}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          onClick={() => setLiked(p => !p)}
          className={`text-xl transition-all active:scale-125 ${liked ? '' : 'grayscale opacity-50'}`}
          aria-label={liked ? 'Descurtir' : 'Curtir'}
        >
          ❤️
        </button>
        <span className="text-[10px] text-slate-400 ml-auto">
          {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </span>
      </div>
    </article>
  )
}

export default function DiarioPage() {
  const supabase = createClient()
  const { pets } = usePets()
  const [selectedPetId, setSelectedPetId] = useState('')
  const [posts, setPosts]                 = useState<(PetPost & { pet: Pet })[]>([])
  const [loading, setLoading]             = useState(true)
  const [showCompose, setShowCompose]     = useState(false)

  // Compose
  const [composePetId, setComposePetId] = useState('')
  const [caption, setCaption]           = useState('')
  const [mediaFile, setMediaFile]       = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType]       = useState<'image' | 'video'>('image')
  const [saving, setSaving]             = useState(false)
  const [uploadErr, setUploadErr]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (pets.length > 0 && !composePetId) setComposePetId(pets[0].id)
  }, [pets])

  const loadPosts = useCallback(async () => {
    if (!pets.length) return
    setLoading(true)
    const ids = selectedPetId ? [selectedPetId] : pets.map(p => p.id)
    const { data } = await supabase
      .from('pet_posts').select('*')
      .in('pet_id', ids)
      .order('created_at', { ascending: false })
    const enriched = (data ?? [])
      .map(p => ({ ...p, pet: pets.find(x => x.id === p.pet_id)! }))
      .filter(p => p.pet)
    setPosts(enriched)
    setLoading(false)
  }, [pets, selectedPetId])

  useEffect(() => { loadPosts() }, [loadPosts])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setUploadErr('Arquivo muito grande. Máximo 50 MB.'); return }
    setUploadErr('')
    setMediaFile(file)
    setMediaType(file.type.startsWith('video') ? 'video' : 'image')
    setMediaPreview(URL.createObjectURL(file))
  }

  function clearMedia() {
    setMediaFile(null)
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function closeCompose() {
    setShowCompose(false)
    setCaption('')
    clearMedia()
    setUploadErr('')
  }

  async function handlePost() {
    if (!composePetId || (!caption.trim() && !mediaFile)) return
    setSaving(true)
    setUploadErr('')

    let media_url: string | null = null
    let final_type: 'image' | 'video' | 'note' = 'note'

    if (mediaFile) {
      const { data: { user } } = await supabase.auth.getUser()
      const ext  = mediaFile.name.split('.').pop()
      const path = `${user!.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('pet-media').upload(path, mediaFile, { cacheControl: '3600' })
      if (upErr) { setUploadErr('Erro ao enviar mídia. Tente novamente.'); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('pet-media').getPublicUrl(path)
      media_url  = urlData.publicUrl
      final_type = mediaType
    }

    const { data, error } = await supabase.from('pet_posts').insert({
      pet_id:     composePetId,
      caption:    caption.trim() || null,
      media_url,
      media_type: final_type,
    }).select().single()

    if (error || !data) { setUploadErr('Erro ao publicar. Tente novamente.'); setSaving(false); return }

    const pet = pets.find(p => p.id === composePetId)!
    setPosts(prev => [{ ...data, pet }, ...prev])
    setSaving(false)
    closeCompose()
  }

  const canPost = !!composePetId && (!!(caption.trim()) || !!mediaFile)

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Diário" />

      {/* Stories */}
      <div className="flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-slate-100 dark:border-slate-700/50 shrink-0">
        {/* Todos */}
        <button onClick={() => setSelectedPetId('')} className="flex flex-col items-center gap-1.5 shrink-0">
          <div className={`p-[2px] rounded-full transition-all ${!selectedPetId ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
            <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-2xl">
              🐾
            </div>
          </div>
          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Todos</span>
        </button>

        {pets.map(pet => (
          <PetStory
            key={pet.id}
            pet={pet}
            active={selectedPetId === pet.id}
            onClick={() => setSelectedPetId(prev => prev === pet.id ? '' : pet.id)}
          />
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-auto pb-28">
        {loading ? (
          <div className="space-y-4 p-4">
            {[1, 2].map(i => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 animate-pulse">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="aspect-square bg-slate-100 dark:bg-slate-700" />
                <div className="p-4 h-10" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 flex items-center justify-center text-5xl shadow-inner">
              📸
            </div>
            <div>
              <p className="font-bold text-slate-700 dark:text-slate-200 text-lg">Nenhuma memória ainda</p>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed max-w-xs mx-auto">
                Toque no botão de câmera e registre o primeiro momento especial do seu pet!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {posts.map((post, i) => (
              <PostCard key={post.id} post={post} gradientIdx={i} />
            ))}
          </div>
        )}
      </div>

      {/* FAB câmera */}
      <button
        onClick={() => setShowCompose(true)}
        className="fixed bottom-20 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/40 flex items-center justify-center active:scale-95 transition-all"
      >
        <Camera size={22} />
      </button>

      {/* Modal compose */}
      <Modal open={showCompose} onClose={closeCompose} title="Nova memória">
        <div className="p-5 space-y-4">

          {/* Seletor de pet */}
          {pets.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Pet</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {pets.map(pet => (
                  <button
                    key={pet.id} type="button"
                    onClick={() => setComposePetId(pet.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-sm font-semibold shrink-0 transition-all ${
                      composePetId === pet.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>{SPECIES_EMOJI[pet.species]}</span>
                    <span>{pet.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload de mídia */}
          {!mediaPreview ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-44 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 flex flex-col items-center justify-center gap-2.5 text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <ImagePlus size={30} />
              <span className="text-sm font-semibold">Adicionar foto ou vídeo</span>
              <span className="text-xs text-slate-400">JPG, PNG, MP4 · máx 50 MB</span>
            </button>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700">
              {mediaType === 'video'
                ? <video src={mediaPreview} className="w-full max-h-72 object-cover" controls />
                : <img    src={mediaPreview} alt="preview" className="w-full max-h-72 object-cover" />
              }
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <input
            ref={fileRef} type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={handleFileSelect}
          />

          {uploadErr && <p className="text-sm text-red-600 dark:text-red-400">{uploadErr}</p>}

          {/* Legenda / anotação */}
          <div className="relative">
            <textarea
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder={mediaPreview ? 'Escreva uma legenda...' : 'O que está passando? 🐾'}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={500}
            />
            {caption.length > 400 && (
              <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">{caption.length}/500</span>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={closeCompose}
              className="flex-1 h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:border-slate-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button" onClick={handlePost}
              disabled={!canPost || saving}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-md shadow-blue-500/20"
            >
              {saving ? 'Publicando...' : 'Publicar ✨'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
