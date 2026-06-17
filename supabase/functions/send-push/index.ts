import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Codificação base64url
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=')
  const binary = atob(padded)
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)))
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function createVapidAuthHeader(endpoint: string, vapidPublic: string, vapidPrivate: string): Promise<string> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`

  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:app@meupet.com',
  }

  const encode = (obj: object) => uint8ArrayToBase64url(new TextEncoder().encode(JSON.stringify(obj)))
  const signingInput = `${encode(header)}.${encode(payload)}`

  const privateKeyBytes = base64urlToUint8Array(vapidPrivate)
  // Extrair chave privada raw (últimos 32 bytes do pkcs8)
  const rawPrivate = privateKeyBytes.slice(-32)

  const cryptoKey = await crypto.subtle.importKey(
    'raw', rawPrivate, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  ).catch(async () => {
    return crypto.subtle.importKey(
      'pkcs8', privateKeyBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    )
  }) as CryptoKey

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const jwt = `${signingInput}.${uint8ArrayToBase64url(new Uint8Array(sig))}`
  return `vapid t=${jwt},k=${vapidPublic}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!

    const db = createClient(supabaseUrl, serviceKey)

    // Buscar eventos de amanhã e hoje com next_date definido
    const today    = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    const { data: events } = await db
      .from('pet_diary')
      .select('pet_id, type, title, next_date, pets(name, user_id)')
      .in('next_date', [today, tomorrow])

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders })
    }

    let sent = 0
    for (const event of events) {
      const pet = (event as { pets: { name: string; user_id: string } | null }).pets
      if (!pet) continue

      const isToday    = event.next_date === today
      const isTomorrow = event.next_date === tomorrow

      const title = isToday ? `🐾 Hoje tem compromisso do ${pet.name}!` : `📅 Lembrete para amanhã`
      const body  = isToday
        ? `${event.title} está marcado para hoje. Não esqueça!`
        : `${event.title} está marcado para amanhã para ${pet.name}.`

      const { data: subs } = await db
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key')
        .eq('user_id', pet.user_id)

      for (const sub of subs ?? []) {
        try {
          const auth = await createVapidAuthHeader(sub.endpoint, vapidPublic, vapidPrivate)
          const notifPayload = JSON.stringify({
            title, body,
            tag: `pet-event-${event.pet_id}-${event.next_date}`,
            url: '/meupet-app/calendario/',
          })

          await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Authorization': auth,
              'Content-Type': 'application/octet-stream',
              'Content-Encoding': 'aes128gcm',
              'TTL': '86400',
            },
            body: notifPayload,
          })
          sent++
        } catch { /* continua para o próximo */ }
      }
    }

    return new Response(JSON.stringify({ sent, events: events.length }), { headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: corsHeaders,
    })
  }
})
