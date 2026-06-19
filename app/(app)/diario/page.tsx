'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePets } from '@/hooks/usePets'
import { TopBar } from '@/components/layout/TopBar'
import { Modal } from '@/components/ui/modal'
import {
  Camera, ImagePlus, X,
  Heart, MessageCircle, MoreHorizontal, Trash2, Send, Download,
} from 'lucide-react'
import type { Pet } from '@/types'

interface PetPost {
  id: string
  pet_id: string
  caption: string | null
  media_url: string | null
  media_type: 'image' | 'video' | 'note'
  created_at: string
}

interface PostWithMeta extends PetPost {
  pet: Pet
  likes_count: number
  is_liked: boolean
  comments_count: number
}

interface Comment {
  id: string
  content: string
  created_at: string
}

const SPECIES_EMOJI: Record<string, string> = {
  dog: '🐶', cat: '🐱', bird: '🐦',
  rabbit: '🐰', fish: '🐟', hamster: '🐹', other: '🐾',
}

const NOTE_GRADIENTS: [string, string][] = [
  ['from-rose-400 via-pink-300 to-rose-300',      'text-white'],
  ['from-violet-500 via-purple-400 to-pink-400',  'text-white'],
  ['from-sky-400 via-blue-400 to-indigo-400',     'text-white'],
  ['from-amber-400 via-orange-300 to-yellow-300', 'text-amber-900'],
  ['from-emerald-400 via-teal-300 to-cyan-300',   'text-emerald-900'],
  ['from-pink-400 via-rose-300 to-orange-300',    'text-white'],
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

function noteGradientIdx(id: string): number {
  return parseInt(id.slice(-1), 16) % NOTE_GRADIENTS.length
}

function PetStory({
  pet, active, postCount, onClick,
}: { pet: Pet; active: boolean; postCount: number; onClick: () => void }) {
  const hasAny = postCount > 0
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-1.5 shrink-0">
      <div className={`p-[2px] rounded-full transition-all ${
        active  ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
        hasAny  ? 'bg-gradient-to-br from-pink-400 to-orange-400' :
                  'bg-slate-200 dark:bg-slate-700'
      }`}>
        <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-2xl">
          {SPECIES_EMOJI[pet.species] ?? '🐾'}
        </div>
      </div>
      {postCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow">
          {postCount > 99 ? '99+' : postCount}
        </span>
      )}
      <span className="text-[10px] text-slate-600 dark:text-slate-400 max-w-[56px] truncate font-medium">
        {pet.name}
      </span>
    </button>
  )
}

function PostCard({
  post, userId, onDelete,
}: { post: PostWithMeta; userId: string; onDelete: (id: string) => void }) {
  const supabase = createClient()

  const [liked, setLiked]           = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)

  const [showComments, setShowComments]     = useState(false)
  const [comments, setComments]             = useState<Comment[]>([])
  const [commentsCount, setCommentsCount]   = useState(post.comments_count)
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [newComment, setNewComment]         = useState('')
  const [sendingComment, setSendingComment] = useState(false)

  const [showMenu, setShowMenu]                 = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting]                 = useState(false)

  const [showLightbox, setShowLightbox]     = useState(false)
  const [showHeartBurst, setShowHeartBurst] = useState(false)

  const lastTapRef  = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [grad, textColor] = NOTE_GRADIENTS[noteGradientIdx(post.id)]

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    setLikesCount(c => next ? c + 1 : Math.max(0, c - 1))
    if (next) {
      await supabase.from('pet_post_likes').insert({ post_id: post.id, user_id: userId })
    } else {
      await supabase.from('pet_post_likes').delete().eq('post_id', post.id).eq('user_id', userId)
    }
  }

  async function openComments() {
    const next = !showComments
    setShowComments(next)
    if (next && !commentsLoaded) {
      const { data } = await supabase
        .from('pet_post_comments')
        .select('id, content, created_at')
        .eq('post_id', post.id)
        .order('created_at')
      setComments(data ?? [])
      setCommentsLoaded(true)
    }
  }

  async function submitComment() {
    if (!newComment.trim() || sendingComment) return
    setSendingComment(true)
    const { data, error } = await supabase
      .from('pet_post_comments')
      .insert({ post_id: post.id, user_id: userId, content: newComment.trim() })
      .select('id, content, created_at')
      .single()
    if (data && !error) {
      setComments(prev => [...prev, data])
      setCommentsCount(c => c + 1)
      setNewComment('')
    }
    setSendingComment(false)
  }

  async function downloadMedia() {
    if (!post.media_url) return
    setShowMenu(false)
    try {
      const res  = await fetch(post.media_url)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const ext  = blob.type.split('/')[1]?.split(';')[0] || (post.media_type === 'video' ? 'mp4' : 'jpg')
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${post.pet.name}_${new Date(post.created_at).toISOString().slice(0, 10)}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(post.media_url, '_blank')
    }
  }

  async function deletePost() {
    setDeleting(true)
    if (post.media_url) {
      const match = post.media_url.match(/\/pet-media\/(.+)$/)
      if (match) await supabase.storage.from('pet-media').remove([match[1]])
    }
    await supabase.from('pet_posts').delete().eq('id', post.id)
    onDelete(post.id)
  }

  function handleImageTap() {
    const now   = Date.now()
    const delta = now - lastTapRef.current
    lastTapRef.current = now

    if (delta < 300 && tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      if (!liked) {
        setLiked(true)
        setLikesCount(c => c + 1)
        supabase.from('pet_post_likes').insert({ post_id: post.id, user_id: userId }).then(() => {})
      }
      setShowHeartBurst(true)
      setTimeout(() => setShowHeartBurst(false), 800)
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null
        setShowLightbox(true)
      }, 260)
    }
  }

  return (
    <>
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

          {/* Three-dot menu */}
          <div className="relative">
            <button
              onClick={() => { setShowMenu(p => !p); setConfirmingDelete(false) }}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <MoreHorizontal size={17} className="text-slate-400" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-9 z-20 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden min-w-[168px]">
                {!confirmingDelete ? (
                  <>
                    {post.media_url && (
                      <button
                        onClick={downloadMedia}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      >
                        <Download size={14} />
                        Baixar mídia
                      </button>
                    )}
                    {post.media_url && (
                      <div className="h-px bg-slate-100 dark:bg-slate-700 mx-3" />
                    )}
                    <button
                      onClick={() => setConfirmingDelete(true)}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={14} />
                      Deletar post
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-3 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tem certeza?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setConfirmingDelete(false); setShowMenu(false) }}
                        className="flex-1 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Não
                      </button>
                      <button
                        onClick={deletePost}
                        disabled={deleting}
                        className="flex-1 py-1.5 rounded-xl bg-red-500 text-white text-xs font-semibold disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {deleting ? '...' : 'Sim'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Imagem com double-tap to like / single-tap to lightbox */}
        {post.media_url && post.media_type === 'image' && (
          <div
            className="aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden relative cursor-pointer select-none"
            onClick={handleImageTap}
          >
            <img
              src={post.media_url}
              alt={post.caption ?? post.pet.name}
              className="w-full h-full object-cover"
              loading="lazy"
              draggable={false}
            />
            {showHeartBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-7xl drop-shadow-xl">❤️</span>
              </div>
            )}
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
          <div className={`bg-gradient-to-br ${grad} px-6 py-8 min-h-[110px] flex items-center justify-center`}>
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
        <div className="flex items-center gap-4 px-4 py-3">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 group"
            aria-label={liked ? 'Descurtir' : 'Curtir'}
          >
            <Heart
              size={20}
              className={`transition-all active:scale-125 ${
                liked ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-400'
              }`}
            />
            {likesCount > 0 && (
              <span className={`text-xs font-semibold tabular-nums ${liked ? 'text-red-500' : 'text-slate-400'}`}>
                {likesCount}
              </span>
            )}
          </button>

          <button
            onClick={openComments}
            className="flex items-center gap-1.5 group"
            aria-label="Notas"
          >
            <MessageCircle
              size={20}
              className={`transition-colors ${
                showComments
                  ? 'text-blue-500 fill-blue-100 dark:fill-blue-900/40'
                  : 'text-slate-400 group-hover:text-blue-400'
              }`}
            />
            {commentsCount > 0 && (
              <span className={`text-xs font-semibold tabular-nums ${showComments ? 'text-blue-500' : 'text-slate-400'}`}>
                {commentsCount}
              </span>
            )}
          </button>

          <span className="text-[10px] text-slate-400 ml-auto">
            {new Date(post.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Painel de notas/comentários */}
        {showComments && (
          <div className="border-t border-slate-100 dark:border-slate-700/60 px-4 pt-3 pb-4 space-y-3">
            {!commentsLoaded && (
              <p className="text-xs text-slate-400 text-center py-1">Carregando...</p>
            )}
            {commentsLoaded && comments.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-1">Nenhuma nota ainda. Escreva a primeira! 🐾</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 flex items-center justify-center text-sm shrink-0">
                  {SPECIES_EMOJI[post.pet.species]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-slate-50 dark:bg-slate-700/60 rounded-2xl px-3 py-2">
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed break-words">{c.content}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 ml-2">{relativeTime(c.created_at)}</p>
                </div>
              </div>
            ))}

            <div className="flex gap-2 items-center pt-1">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Adicionar uma nota..."
                maxLength={300}
                className="flex-1 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || sendingComment}
                className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shrink-0"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </article>

      {/* Lightbox de imagem */}
      {showLightbox && post.media_url && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
            onClick={() => setShowLightbox(false)}
          >
            <X size={20} />
          </button>
          <img
            src={post.media_url}
            alt={post.caption ?? post.pet.name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
            draggable={false}
          />
          {post.caption && (
            <div className="absolute bottom-6 left-0 right-0 px-6 text-center">
              <p className="text-white/90 text-sm font-medium drop-shadow-lg">{post.caption}</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default function DiarioPage() {
  const supabase = createClient()
  const { pets } = usePets()

  const [userId, setUserId]               = useState('')
  const [selectedPetId, setSelectedPetId] = useState('')
  const [posts, setPosts]                 = useState<PostWithMeta[]>([])
  const [postCountByPet, setPostCountByPet] = useState<Record<string, number>>({})
  const [loading, setLoading]             = useState(true)

  const [showCompose, setShowCompose]   = useState(false)
  const [composePetId, setComposePetId] = useState('')
  const [caption, setCaption]           = useState('')
  const [mediaFile, setMediaFile]       = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType]       = useState<'image' | 'video'>('image')
  const [saving, setSaving]             = useState(false)
  const [uploadErr, setUploadErr]       = useState('')
  const [hasCamera, setHasCamera]       = useState(false)
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ''))
    // touch devices (phones/tablets) have cameras; desktops ignore `capture` attr
    setHasCamera('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  useEffect(() => {
    if (pets.length > 0 && !composePetId) setComposePetId(pets[0].id)
  }, [pets])

  const loadPosts = useCallback(async () => {
    if (!pets.length || !userId) return
    setLoading(true)

    const ids = selectedPetId ? [selectedPetId] : pets.map(p => p.id)
    const { data: rawPosts } = await supabase
      .from('pet_posts').select('*')
      .in('pet_id', ids)
      .order('created_at', { ascending: false })
      .limit(50)

    const enriched = (rawPosts ?? [])
      .map(p => ({ ...p, pet: pets.find(x => x.id === p.pet_id)! }))
      .filter(p => p.pet)

    if (enriched.length > 0) {
      const postIds = enriched.map(p => p.id)

      const [likesRes, userLikesRes, commentsRes] = await Promise.all([
        supabase.from('pet_post_likes').select('post_id').in('post_id', postIds),
        supabase.from('pet_post_likes').select('post_id').in('post_id', postIds).eq('user_id', userId),
        supabase.from('pet_post_comments').select('post_id').in('post_id', postIds),
      ])

      const likesByPost:    Record<string, number> = {}
      const likedSet  = new Set<string>()
      const commentsByPost: Record<string, number> = {}

      ;(likesRes.data ?? []).forEach((l: { post_id: string }) => {
        likesByPost[l.post_id] = (likesByPost[l.post_id] ?? 0) + 1
      })
      ;(userLikesRes.data ?? []).forEach((l: { post_id: string }) => likedSet.add(l.post_id))
      ;(commentsRes.data ?? []).forEach((c: { post_id: string }) => {
        commentsByPost[c.post_id] = (commentsByPost[c.post_id] ?? 0) + 1
      })

      const withMeta: PostWithMeta[] = enriched.map(p => ({
        ...p,
        likes_count:    likesByPost[p.id]    ?? 0,
        is_liked:       likedSet.has(p.id),
        comments_count: commentsByPost[p.id] ?? 0,
      }))

      setPosts(withMeta)

      if (!selectedPetId) {
        const counts: Record<string, number> = {}
        enriched.forEach(p => { counts[p.pet_id] = (counts[p.pet_id] ?? 0) + 1 })
        setPostCountByPet(counts)
      }
    } else {
      setPosts([])
      if (!selectedPetId) setPostCountByPet({})
    }

    setLoading(false)
  }, [pets, selectedPetId, userId])

  useEffect(() => { loadPosts() }, [loadPosts])

  function handleDeletePost(id: string) {
    setPosts(prev => {
      const post = prev.find(p => p.id === id)
      if (post) {
        setPostCountByPet(counts => ({
          ...counts,
          [post.pet_id]: Math.max(0, (counts[post.pet_id] ?? 1) - 1),
        }))
      }
      return prev.filter(p => p.id !== id)
    })
  }

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
    if (fileRef.current)   fileRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
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
      const ext  = mediaFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
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
    const newPost: PostWithMeta = { ...data, pet, likes_count: 0, is_liked: false, comments_count: 0 }
    setPosts(prev => [newPost, ...prev])
    setPostCountByPet(counts => ({ ...counts, [composePetId]: (counts[composePetId] ?? 0) + 1 }))
    setSaving(false)
    closeCompose()
  }

  const canPost = !!composePetId && (!!(caption.trim()) || !!mediaFile)

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Diário" />

      {/* Stories */}
      <div className="border-b border-slate-100 dark:border-slate-700/50 shrink-0">
      <div className="w-full max-w-[500px] mx-auto flex gap-4 px-4 py-3 overflow-x-auto scrollbar-hide">
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
            postCount={postCountByPet[pet.id] ?? 0}
            onClick={() => setSelectedPetId(prev => prev === pet.id ? '' : pet.id)}
          />
        ))}
      </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-auto pb-28">
        <div className="w-full max-w-[500px] mx-auto">
        {loading ? (
          <div className="space-y-4 p-4">
            {[1, 2].map(i => (
              <div key={i} className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 animate-pulse">
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-700" />
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
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                userId={userId}
                onDelete={handleDeletePost}
              />
            ))}
          </div>
        )}
        </div>
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
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
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

          {!mediaPreview ? (
            <div className="space-y-2.5">
              <div className={`grid gap-3 ${hasCamera ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {hasCamera && (
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 transition-colors"
                  >
                    <Camera size={24} />
                    <span className="text-xs font-semibold">Tirar foto</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 transition-colors"
                >
                  <ImagePlus size={24} />
                  <span className="text-xs font-semibold">Da galeria</span>
                </button>
              </div>
              <p className="text-[10px] text-center text-slate-400">JPG, PNG, MP4 · máx 50 MB</p>
            </div>
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
          <input
            ref={cameraRef} type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />

          {uploadErr && <p className="text-sm text-red-600 dark:text-red-400">{uploadErr}</p>}

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
