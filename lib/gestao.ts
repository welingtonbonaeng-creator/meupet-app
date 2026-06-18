import { createClient } from '@/lib/supabase/client'

const FN_URL = 'https://wwoasqjidsrplkpwjsro.supabase.co/functions/v1/gestao-api'

export async function gestao(action: string, payload?: Record<string, unknown>) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sem sessão')

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, payload }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erro na requisição')
  return data
}
