import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, name, email, password } = await req.json()

    if (!token || !name || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Validar token
    const { data: inviteToken, error: tokenError } = await adminClient
      .from('invite_tokens')
      .select('id, used_at, expires_at')
      .eq('token', token.trim())
      .single()

    if (tokenError || !inviteToken) {
      return new Response(
        JSON.stringify({ error: 'Token inválido. Solicite um novo token ao administrador.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (inviteToken.used_at) {
      return new Response(
        JSON.stringify({ error: 'Este token já foi utilizado. Cada token é de uso único.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(inviteToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Token expirado. Solicite um novo token ao administrador.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Criar usuário (email já confirmado — token é a verificação)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      user_metadata: { name: name.trim() },
      email_confirm: true,
    })

    if (authError || !authData.user) {
      const msg = authError?.message?.includes('already registered')
        ? 'Este e-mail já está cadastrado.'
        : (authError?.message ?? 'Erro ao criar conta. Tente novamente.')
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Marcar token como usado (operação atômica — evita reutilização)
    await adminClient.from('invite_tokens').update({
      used_by: authData.user.id,
      used_at: new Date().toISOString(),
    }).eq('id', inviteToken.id).is('used_at', null)

    // 4. Garantir plano Premium para usuários de teste (aguarda trigger criar o perfil)
    await new Promise(r => setTimeout(r, 500))
    await adminClient.from('profiles')
      .update({ plan: 'premium' })
      .eq('id', authData.user.id)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch {
    return new Response(
      JSON.stringify({ error: 'Erro interno. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
