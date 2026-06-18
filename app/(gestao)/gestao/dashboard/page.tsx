'use client'
import { useEffect, useState } from 'react'
import { gestao } from '@/lib/gestao'
import { Users, PawPrint, LifeBuoy, TrendingUp, DollarSign, UserPlus, Percent, RefreshCw } from 'lucide-react'

type DashData = {
  total_users: number; total_pets: number; open_tickets: number; in_progress_tickets: number
  mrr: string; arr: string; arpu: string; conversion_rate: string; new_this_month: number
  plans: { premium: number; family: number; free: number }
  monthly_growth: { month: string; total: number; paying: number }[]
  recent_users: { name: string; email: string; plan: string; created_at: string }[]
}

const PLAN_LABEL: Record<string, string> = { premium: 'Premium', family: 'Família', free: 'Grátis' }
const PLAN_COLOR: Record<string, string> = {
  premium: 'text-amber-400 bg-amber-900/30 border-amber-700/30',
  family:  'text-purple-400 bg-purple-900/30 border-purple-700/30',
  free:    'text-slate-400 bg-slate-700 border-slate-600',
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function brl(v: string | number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-900/30 text-blue-400 border-blue-700/20',
    green:  'bg-green-900/30 text-green-400 border-green-700/20',
    amber:  'bg-amber-900/30 text-amber-400 border-amber-700/20',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-700/20',
    red:    'bg-red-900/30 text-red-400 border-red-700/20',
    slate:  'bg-slate-700/50 text-slate-300 border-slate-600/20',
  }
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors[color]}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function GestaoDashboardPage() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setData(await gestao('get_dashboard')) } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const maxBar = data ? Math.max(...data.monthly_growth.map(m => m.total), 1) : 1

  if (loading) return (
    <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!data) return <div className="p-6 text-slate-400">Erro ao carregar dados.</div>

  const total = data.plans.premium + data.plans.family + data.plans.free

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Visão geral do MeuPet+</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign}  label="MRR"              value={brl(data.mrr)}             sub={`ARR: ${brl(data.arr)}`}         color="green" />
        <StatCard icon={Users}       label="Usuários"          value={data.total_users}           sub={`+${data.new_this_month} este mês`} color="blue" />
        <StatCard icon={TrendingUp}  label="Conversão"         value={`${data.conversion_rate}%`} sub={`${data.plans.premium + data.plans.family} pagantes`} color="amber" />
        <StatCard icon={DollarSign}  label="ARPU"              value={brl(data.arpu)}             sub="por usuário pagante"             color="purple" />
        <StatCard icon={PawPrint}    label="Pets cadastrados"  value={data.total_pets}            color="slate" />
        <StatCard icon={LifeBuoy}    label="Tickets abertos"   value={data.open_tickets}          sub={`${data.in_progress_tickets} em análise`} color={data.open_tickets > 0 ? 'red' : 'slate'} />
        <StatCard icon={UserPlus}    label="Novos este mês"    value={data.new_this_month}        color="blue" />
        <StatCard icon={Percent}     label="Plano Premium"     value={data.plans.premium}         sub={`${data.plans.family} Família · ${data.plans.free} Grátis`} color="amber" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Distribuição de planos */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="font-semibold text-slate-200 mb-4 text-sm">Distribuição de planos</h2>
          <div className="space-y-3">
            {[
              { key: 'premium', label: 'Premium', price: 'R$49,90/mês', count: data.plans.premium, bar: 'bg-amber-500' },
              { key: 'family',  label: 'Família',  price: 'R$29,90/mês', count: data.plans.family,  bar: 'bg-purple-500' },
              { key: 'free',    label: 'Grátis',   price: 'R$0',         count: data.plans.free,    bar: 'bg-slate-600' },
            ].map(p => (
              <div key={p.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{p.label} <span className="text-xs text-slate-500">{p.price}</span></span>
                  <span className="text-sm font-semibold text-slate-200">{p.count} <span className="text-xs text-slate-500">({total > 0 ? ((p.count / total) * 100).toFixed(0) : 0}%)</span></span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full ${p.bar} rounded-full transition-all`}
                    style={{ width: total > 0 ? `${(p.count / total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Crescimento mensal */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="font-semibold text-slate-200 mb-4 text-sm">Novos usuários — últimos 6 meses</h2>
          <div className="flex items-end gap-2 h-28">
            {data.monthly_growth.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500 font-semibold">{m.total > 0 ? m.total : ''}</span>
                <div className="w-full flex flex-col gap-0.5" style={{ height: 80 }}>
                  <div className="w-full bg-blue-500/70 rounded-sm mt-auto"
                    style={{ height: maxBar > 0 ? `${(m.total / maxBar) * 80}%` : '2px', minHeight: m.total > 0 ? 4 : 0 }} />
                </div>
                <span className="text-[9px] text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600 mt-2 text-center">Barras = total de novos cadastros por mês</p>
        </div>
      </div>

      {/* Últimos cadastros */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="font-semibold text-slate-200 mb-3 text-sm">Últimos cadastros</h2>
        {data.recent_users.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhum cadastro ainda</p>
        ) : (
          <div className="space-y-2">
            {data.recent_users.map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{u.name ?? '(sem nome)'}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${PLAN_COLOR[u.plan] ?? PLAN_COLOR.free}`}>
                    {PLAN_LABEL[u.plan] ?? u.plan}
                  </span>
                  <span className="text-xs text-slate-500">{fmt(u.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
