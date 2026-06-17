'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, TrendingUp, Crown, Heart, Users, BarChart2 } from 'lucide-react'

const PLAN_CONFIG = {
  premium: { label: 'Premium', price: 49.90, color: 'warning' as const, icon: Crown },
  family:  { label: 'Família', price: 29.90, color: 'purple' as const,  icon: Heart },
  free:    { label: 'Grátis',  price: 0,     color: 'default' as const, icon: Users },
}

type PlanKey = keyof typeof PLAN_CONFIG
type UserRevenue = { id: string; name: string; email: string | null; plan: PlanKey; created_at: string }

export default function AdminVendas() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserRevenue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('profiles')
      .select('id, name, email, plan, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setUsers((data as UserRevenue[]) ?? []); setLoading(false) })
  }, [])

  const counts = { free: 0, family: 0, premium: 0 }
  users.forEach(u => { if (u.plan in counts) counts[u.plan as PlanKey]++ })

  const mrr = counts.premium * 49.90 + counts.family * 29.90
  const arr = mrr * 12
  const payingUsers = counts.premium + counts.family
  const convRate = users.length > 0 ? Math.round((payingUsers / users.length) * 100) : 0
  const arpu = payingUsers > 0 ? mrr / payingUsers : 0

  // Crescimento por mês (últimos 6 meses)
  const monthlyData = (() => {
    const months: Record<string, { month: string; users: number; revenue: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      months[key] = { month: label, users: 0, revenue: 0 }
    }
    users.forEach(u => {
      const d = new Date(u.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in months) {
        months[key].users++
        months[key].revenue += PLAN_CONFIG[u.plan as PlanKey]?.price ?? 0
      }
    })
    return Object.values(months)
  })()

  const maxUsers = Math.max(...monthlyData.map(m => m.users), 1)

  const paying = users.filter(u => u.plan !== 'free')

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Vendas & Receita</h1>
        <p className="text-sm text-slate-400 mt-0.5">Métricas financeiras da plataforma</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">MRR</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(mrr)}</p>
            <p className="text-xs text-slate-500 mt-1">por mês</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">ARR</p>
            <p className="text-2xl font-bold text-green-300 mt-1">{formatCurrency(arr)}</p>
            <p className="text-xs text-slate-500 mt-1">projeção anual</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">ARPU</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(arpu)}</p>
            <p className="text-xs text-slate-500 mt-1">por usuário pagante</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Conversão</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{convRate}%</p>
            <p className="text-xs text-slate-500 mt-1">{payingUsers} de {users.length} pagantes</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição de planos */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-400" /> Receita por plano
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {(['premium', 'family', 'free'] as PlanKey[]).map(plan => {
              const config = PLAN_CONFIG[plan]
              const count = counts[plan]
              const revenue = count * config.price
              const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0
              const Icon = config.icon
              return (
                <div key={plan} className="text-center p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <Icon size={20} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase">{config.label}</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">{count}</p>
                  <p className="text-xs text-slate-500">{pct}% dos usuários</p>
                  {config.price > 0 && (
                    <p className="text-sm font-semibold text-green-400 mt-2">{formatCurrency(revenue)}/mês</p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Crescimento mensal */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" /> Novos usuários por mês
          </h2>
          <div className="flex items-end gap-2 h-24">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-slate-400 font-medium">{m.users}</span>
                <div className="w-full rounded-t-lg bg-blue-600 transition-all" style={{ height: `${Math.max(4, (m.users / maxUsers) * 64)}px` }} />
                <span className="text-[10px] text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usuários pagantes */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green-400" /> Usuários pagantes ({payingUsers})
          </h2>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />)}</div>
          ) : paying.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Nenhum usuário pagante ainda</p>
          ) : (
            <div className="space-y-2">
              {paying.map(u => {
                const config = PLAN_CONFIG[u.plan as PlanKey]
                return (
                  <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-800 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {u.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{u.name}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email ?? '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={config.color}>{config.label}</Badge>
                      <span className="text-sm font-semibold text-green-400">{formatCurrency(config.price)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
