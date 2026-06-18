import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!

  // Verificar sessão do usuário
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autorizado' }, 401)

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ error: 'Sessão inválida' }, 401)

  // Verificar se é admin usando service role (bypassa RLS)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await admin.from('profiles').select('role, name').eq('id', user.id).single()
  if (profile?.role !== 'admin') return json({ error: 'Acesso negado. Somente gestores.' }, 403)

  let body: { action: string; payload?: Record<string, unknown> } = { action: 'check_admin' }
  try { body = await req.json() } catch { /* sem body = check_admin */ }
  const { action, payload } = body

  try {
    switch (action) {

      case 'check_admin':
        return json({ ok: true, name: profile.name ?? user.email })

      // ── USUÁRIOS ───────────────────────────────────────────────────
      case 'get_users': {
        const { data: users } = await admin
          .from('profiles')
          .select('id, name, email, plan, role, created_at')
          .order('created_at', { ascending: false })

        const { data: pets } = await admin.from('pets').select('id, owner_id')
        const petsMap: Record<string, number> = {}
        pets?.forEach(p => { petsMap[p.owner_id] = (petsMap[p.owner_id] || 0) + 1 })

        return json(users?.map(u => ({ ...u, pets_count: petsMap[u.id] || 0 })) ?? [])
      }

      case 'update_plan': {
        const { user_id, plan } = payload as { user_id: string; plan: string }
        await admin.from('profiles').update({ plan }).eq('id', user_id)
        return json({ ok: true })
      }

      case 'update_email': {
        const { user_id, email } = payload as { user_id: string; email: string }
        await admin.auth.admin.updateUserById(user_id, { email })
        await admin.from('profiles').update({ email }).eq('id', user_id)
        return json({ ok: true })
      }

      case 'reset_password': {
        const { user_id, new_password } = payload as { user_id: string; new_password: string }
        await admin.auth.admin.updateUserById(user_id, { password: new_password })
        return json({ ok: true })
      }

      case 'delete_user': {
        const { user_id } = payload as { user_id: string }
        await admin.from('profiles').delete().eq('id', user_id)
        await admin.auth.admin.deleteUser(user_id)
        return json({ ok: true })
      }

      // ── DASHBOARD ─────────────────────────────────────────────────
      case 'get_dashboard': {
        const [{ data: users }, { data: pets }, { data: tickets }] = await Promise.all([
          admin.from('profiles').select('id, name, email, plan, created_at').order('created_at', { ascending: false }),
          admin.from('pets').select('id'),
          admin.from('support_tickets').select('id, status'),
        ])

        const plans = { premium: 0, family: 0, free: 0 } as Record<string, number>
        users?.forEach(u => { if (plans[u.plan] !== undefined) plans[u.plan]++ })

        const now = new Date()
        const thisMonth = users?.filter(u => {
          const d = new Date(u.created_at)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length ?? 0

        // Crescimento mensal — últimos 6 meses
        const monthly: { month: string; total: number; paying: number }[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
          const total = users?.filter(u => {
            const ud = new Date(u.created_at)
            return ud.getMonth() === d.getMonth() && ud.getFullYear() === d.getFullYear()
          }).length ?? 0
          const paying = users?.filter(u => {
            const ud = new Date(u.created_at)
            return ud.getMonth() === d.getMonth() && ud.getFullYear() === d.getFullYear()
              && (u.plan === 'premium' || u.plan === 'family')
          }).length ?? 0
          monthly.push({ month: label, total, paying })
        }

        const mrr = (plans.premium * 49.90) + (plans.family * 29.90)
        const total = users?.length ?? 0
        const paying = plans.premium + plans.family

        return json({
          total_users: total,
          total_pets: pets?.length ?? 0,
          open_tickets: tickets?.filter(t => t.status === 'open').length ?? 0,
          in_progress_tickets: tickets?.filter(t => t.status === 'in_progress').length ?? 0,
          mrr: mrr.toFixed(2),
          arr: (mrr * 12).toFixed(2),
          arpu: paying > 0 ? (mrr / paying).toFixed(2) : '0.00',
          conversion_rate: total > 0 ? ((paying / total) * 100).toFixed(1) : '0',
          new_this_month: thisMonth,
          plans,
          monthly_growth: monthly,
          recent_users: users?.slice(0, 6).map(u => ({ name: u.name, email: u.email, plan: u.plan, created_at: u.created_at })) ?? [],
        })
      }

      // ── FATURAMENTO ────────────────────────────────────────────────
      case 'get_faturamento': {
        const { data: users } = await admin
          .from('profiles')
          .select('id, name, email, plan, created_at')
          .in('plan', ['premium', 'family'])
          .order('created_at', { ascending: false })

        const { data: allUsers } = await admin.from('profiles').select('id, plan')

        const plans = { premium: 0, family: 0, free: 0 } as Record<string, number>
        allUsers?.forEach(u => { if (plans[u.plan] !== undefined) plans[u.plan]++ })

        const premiumRev = plans.premium * 49.90
        const familyRev  = plans.family  * 29.90
        const mrr = premiumRev + familyRev
        const paying = plans.premium + plans.family
        const total = (allUsers?.length ?? 0)

        // Receita mensal últimos 6 meses (baseado em data de cadastro pagantes)
        const now = new Date()
        const monthly_revenue: { month: string; mrr: number; new_paying: number }[] = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
          const newPaying = users?.filter(u => {
            const ud = new Date(u.created_at)
            return ud.getMonth() === d.getMonth() && ud.getFullYear() === d.getFullYear()
          }) ?? []
          const monthMRR = newPaying.reduce((acc, u) => acc + (u.plan === 'premium' ? 49.90 : 29.90), 0)
          monthly_revenue.push({ month: label, mrr: monthMRR, new_paying: newPaying.length })
        }

        return json({
          mrr: mrr.toFixed(2),
          arr: (mrr * 12).toFixed(2),
          arpu: paying > 0 ? (mrr / paying).toFixed(2) : '0.00',
          conversion_rate: total > 0 ? ((paying / total) * 100).toFixed(1) : '0',
          premium_count: plans.premium,
          premium_revenue: premiumRev.toFixed(2),
          family_count: plans.family,
          family_revenue: familyRev.toFixed(2),
          monthly_revenue,
          paying_users: users?.map(u => ({
            name: u.name, email: u.email, plan: u.plan, created_at: u.created_at,
            monthly_value: u.plan === 'premium' ? 49.90 : 29.90,
          })) ?? [],
        })
      }

      // ── MÉTRICAS (legado) ──────────────────────────────────────────
      case 'get_stats': {
        const [{ data: users }, { data: pets }, { data: tickets }] = await Promise.all([
          admin.from('profiles').select('id, plan, created_at'),
          admin.from('pets').select('id'),
          admin.from('support_tickets').select('id, status'),
        ])
        const plans = { premium: 0, family: 0, free: 0 } as Record<string, number>
        users?.forEach(u => { if (plans[u.plan] !== undefined) plans[u.plan]++ })

        const now = new Date()
        const thisMonth = users?.filter(u => {
          const d = new Date(u.created_at)
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length ?? 0

        return json({
          total_users: users?.length ?? 0,
          total_pets: pets?.length ?? 0,
          open_tickets: tickets?.filter(t => t.status === 'open').length ?? 0,
          mrr: ((plans.premium * 49.90) + (plans.family * 29.90)).toFixed(2),
          new_this_month: thisMonth,
          plans,
        })
      }

      // ── SUPORTE ────────────────────────────────────────────────────
      case 'get_tickets': {
        const { data } = await admin
          .from('support_tickets')
          .select('id, subject, message, status, admin_reply, replied_at, created_at, user_id')
          .order('created_at', { ascending: false })

        // Buscar nomes dos usuários
        const ids = [...new Set(data?.map(t => t.user_id) ?? [])]
        const { data: profiles } = await admin.from('profiles').select('id, name, email').in('id', ids)
        const pmap: Record<string, { name: string; email: string }> = {}
        profiles?.forEach(p => { pmap[p.id] = { name: p.name, email: p.email } })

        return json(data?.map(t => ({ ...t, user: pmap[t.user_id] ?? { name: '?', email: '?' } })) ?? [])
      }

      case 'reply_ticket': {
        const { ticket_id, reply, status } = payload as { ticket_id: string; reply: string; status: string }
        await admin.from('support_tickets').update({
          admin_reply: reply,
          status: status ?? 'resolved',
          replied_at: new Date().toISOString(),
        }).eq('id', ticket_id)
        return json({ ok: true })
      }

      case 'update_ticket_status': {
        const { ticket_id, status } = payload as { ticket_id: string; status: string }
        await admin.from('support_tickets').update({ status }).eq('id', ticket_id)
        return json({ ok: true })
      }

      // ── TOKENS ─────────────────────────────────────────────────────
      case 'get_tokens': {
        const [{ data: tokens }, { data: requests }] = await Promise.all([
          admin.from('invite_tokens').select('*').order('created_at', { ascending: false }),
          admin.from('token_requests').select('*').order('created_at', { ascending: false }),
        ])
        return json({ tokens: tokens ?? [], requests: requests ?? [] })
      }

      case 'create_token': {
        const { notes } = payload as { notes?: string }
        const { data } = await admin.from('invite_tokens')
          .insert({ notes: notes || null, created_by: user.id })
          .select('id, token').single()
        return json(data)
      }

      case 'handle_token_request': {
        const { request_id, action: reqAction } = payload as { request_id: string; action: string }
        if (reqAction === 'reject') {
          await admin.from('token_requests').update({ status: 'rejected' }).eq('id', request_id)
          return json({ ok: true })
        }
        const { data: r } = await admin.from('token_requests').select('name, email').eq('id', request_id).single()
        const { data: tok } = await admin.from('invite_tokens')
          .insert({ notes: `Para: ${r?.name} (${r?.email})`, created_by: user.id })
          .select('id, token').single()
        await admin.from('token_requests').update({ status: 'token_sent', token_id: tok?.id }).eq('id', request_id)
        return json({ token: tok?.token })
      }

      default:
        return json({ error: 'Ação desconhecida' }, 400)
    }
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})
