'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, PawPrint, DollarSign, LifeBuoy, TrendingUp, UserPlus, Crown, Heart } from 'lucide-react'

const PLAN_PRICE: Record<string, number> = { premium: 49.90, family: 29.90, free: 0 }
const PLAN_LABEL: Record<string, string> = { premium: 'Premium', family: 'Família', free: 'Grátis' }
const PLAN_COLOR: Record<string, string> = { premium: 'warning', family: 'purple', free: 'default' }

type PlanCounts = { free: number; family: number; premium: number }
type RecentUser = { id: string; name: string; email: string | null; plan: string; created_at: string }
type Metrics = {
  totalUsers: number; newThisMonth: number
  planCounts: PlanCounts; mrr: number
  totalPets: number; openTickets: number
  recentUsers: RecentUser[]
}

function MetricCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={20} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const startOfMonth = new Date()
      startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

      const [
        { count: totalUsers },
        { count: newThisMonth },
        { data: allProfiles },
        { count: totalPets },
        { count: openTickets },
        { data: recentUsers },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
        supabase.from('profiles').select('plan'),
        supabase.from('pets').select('*', { count: 'exact', head: true }),
        supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open').then(r => r.error ? { count: 0 } : r),
        supabase.from('profiles').select('id, name, email, plan, created_at').order('created_at', { ascending: false }).limit(5),
      ])

      const planCounts: PlanCounts = { free: 0, family: 0, premium: 0 }
      allProfiles?.forEach(p => { if (p.plan in planCounts) planCounts[p.plan as keyof PlanCounts]++ })

      const mrr = planCounts.premium * PLAN_PRICE.premium + planCounts.family * PLAN_PRICE.family

      setMetrics({
        totalUsers: totalUsers ?? 0,
        newThisMonth: newThisMonth ?? 0,
        planCounts,
        mrr,
        totalPets: totalPets ?? 0,
        openTickets: openTickets ?? 0,
        recentUsers: (recentUsers as RecentUser[]) ?? [],
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-2xl animate-pulse" />)}
    </div>
  )
  if (!metrics) return null

  const conversionRate = metrics.totalUsers > 0
    ? Math.round(((metrics.planCounts.premium + metrics.planCounts.family) / metrics.totalUsers) * 100)
    : 0

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-0.5">Visão geral da plataforma MeuPet+</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard icon={Users}      label="Total usuários"  value={String(metrics.totalUsers)}  sub={`+${metrics.newThisMonth} este mês`} color="bg-blue-900/40 text-blue-400" />
        <MetricCard icon={DollarSign} label="MRR estimado"    value={formatCurrency(metrics.mrr)} sub={`${conversionRate}% pagantes`}       color="bg-green-900/40 text-green-400" />
        <MetricCard icon={PawPrint}   label="Pets cadastrados" value={String(metrics.totalPets)}  sub="na plataforma"                        color="bg-orange-900/40 text-orange-400" />
        <MetricCard icon={Crown}      label="Premium"         value={String(metrics.planCounts.premium)}  sub="R$49,90/mês"                 color="bg-amber-900/40 text-amber-400" />
        <MetricCard icon={Heart}      label="Família"         value={String(metrics.planCounts.family)}   sub="R$29,90/mês"                 color="bg-purple-900/40 text-purple-400" />
        <MetricCard icon={LifeBuoy}   label="Tickets abertos" value={String(metrics.openTickets)} sub="aguardando resposta"                  color="bg-red-900/40 text-red-400" />
      </div>

      {/* Distribuição de planos */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" /> Distribuição de planos
          </h2>
          <div className="space-y-3">
            {(['premium', 'family', 'free'] as const).map(plan => {
              const count = metrics.planCounts[plan]
              const pct = metrics.totalUsers > 0 ? Math.round((count / metrics.totalUsers) * 100) : 0
              return (
                <div key={plan}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-300 font-medium">{PLAN_LABEL[plan]}</span>
                    <span className="text-slate-400">{count} usuários · {pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${plan === 'premium' ? 'bg-amber-400' : plan === 'family' ? 'bg-purple-400' : 'bg-slate-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between text-sm">
            <span className="text-slate-400">Receita mensal estimada</span>
            <span className="font-bold text-green-400">{formatCurrency(metrics.mrr)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Últimos usuários */}
      <Card>
        <CardContent className="p-5">
          <h2 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <UserPlus size={16} className="text-blue-400" /> Últimos cadastros
          </h2>
          <div className="space-y-3">
            {metrics.recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center shrink-0 text-xs font-bold text-blue-400">
                    {u.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{u.name}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={PLAN_COLOR[u.plan] as 'warning' | 'purple' | 'default'}>
                    {PLAN_LABEL[u.plan]}
                  </Badge>
                  <span className="text-xs text-slate-500">{formatDate(u.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
