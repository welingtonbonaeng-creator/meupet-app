'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Camera, Loader2 } from 'lucide-react'

interface PetPhotoUploadProps {
  petId: string
  userId: string
  currentUrl?: string | null
  petName: string
  size?: 'sm' | 'lg'
  onUploaded: (url: string) => void
}

export function PetPhotoUpload({ petId, userId, currentUrl, petName, size = 'lg', onUploaded }: PetPhotoUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null)

  const dim = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14'
  const iconSize = size === 'lg' ? 20 : 16
  const initial = petName[0]?.toUpperCase() ?? '?'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview imediato
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${petId}.${ext}`

      const { error } = await supabase.storage
        .from('pet-photos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw error

      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?t=${Date.now()}` // cache-busting

      // Salvar URL no banco
      await supabase.from('pets').update({ photo_url: publicUrl }).eq('id', petId)
      onUploaded(publicUrl)
    } catch (err) {
      console.error('Erro upload:', err)
      setPreview(currentUrl ?? null)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`${dim} rounded-2xl overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center relative group focus:outline-none`}
        title="Clique para trocar a foto"
      >
        {preview ? (
          <img src={preview} alt={petName} className="w-full h-full object-cover" />
        ) : (
          <span className={`font-bold text-blue-400 dark:text-blue-500 ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>{initial}</span>
        )}

        {/* Overlay ao hover */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
          {uploading
            ? <Loader2 size={iconSize} className="text-white animate-spin" />
            : <Camera size={iconSize} className="text-white" />
          }
        </div>
      </button>

      {/* Badge câmera no canto */}
      {!uploading && (
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md pointer-events-none">
          <Camera size={12} className="text-white" />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}
