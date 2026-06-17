'use client'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'meupet_notif_last_check'
const ICON_MAP: Record<string, string> = {
  vaccine: '💉', appointment: '🏥', deworming: '💊',
  exam: '🔬', medication: '💊', bath: '🛁', grooming: '✂️',
  surgery: '⚕️', other: '📋',
}

function today(): string  { return new Date().toISOString().split('T')[0] }
function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// Só verifica 1x por hora para não spammar
function shouldCheck(): boolean {
  const last = localStorage.getItem(STORAGE_KEY)
  if (!last) return true
  return Date.now() - parseInt(last) > 60 * 60 * 1000
}

export function useNotifications() {
  const supabase = createClient()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return

    async function init() {
      // Pedir permissão se ainda não foi concedida
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      if (Notification.permission !== 'granted') return

      // Registrar service worker
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/meupet-app/sw.js')
        } catch { /* ignora */ }
      }

      if (!shouldCheck()) return
      localStorage.setItem(STORAGE_KEY, Date.now().toString())

      // Buscar usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar eventos de hoje e amanhã com next_date definido
      const td = today()
      const tm = tomorrow()

      const { data: events } = await supabase
        .from('pet_diary')
        .select('type, title, next_date, pets(name)')
        .in('next_date', [td, tm])
        .eq('pets.user_id' as never, user.id)

      if (!events || events.length === 0) return

      // Filtrar só os do usuário (join pode trazer null)
      const mine = events.filter(e => (e as { pets: { name: string } | null }).pets !== null)
      if (mine.length === 0) return

      const notifications = mine.map(e => {
        const pet = (e as { pets: { name: string } }).pets
        const icon = ICON_MAP[e.type] ?? '📋'
        const isToday = e.next_date === td
        return {
          title: isToday
            ? `${icon} Hoje: ${e.title}`
            : `${icon} Amanhã: ${e.title}`,
          body: isToday
            ? `${pet.name} tem ${e.title} marcado para hoje!`
            : `Lembrete: ${pet.name} tem ${e.title} amanhã. Não esqueça!`,
          tag: `meupet-${e.next_date}-${e.title}`,
        }
      })

      // Enviar via Service Worker (garante que aparece mesmo com aba em segundo plano)
      if ('serviceWorker' in navigator) {
        const sw = await navigator.serviceWorker.ready
        if (sw.active) {
          sw.active.postMessage({ type: 'SHOW_NOTIFICATIONS', notifications })
          return
        }
      }

      // Fallback: Notification API direta
      notifications.forEach(n => new Notification(n.title, { body: n.body, tag: n.tag, icon: '/meupet-app/icons/icon-192.png' }))
    }

    init()
  }, [])
}
