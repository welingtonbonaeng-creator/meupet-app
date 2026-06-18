'use client'
import { useEffect, useState } from 'react'
import { gestao } from '@/lib/gestao'
import { DollarSign, TrendingUp, Users, Percent, RefreshCw, Crown, Heart } from 'lucide-react'

type FatData = {
  mrr: string; arr: string; arpu: string; conversion_rate: string
  premium_count: number; premium_revenue: string
  family_count: number;  family_revenue: string
  monthly_revenue: { month: string; mrr: number; new_paying: number }[]
  paying_users: { name: string; email: string; plan: string; monthly_value: number; created_at: string }[]
}

function brl(v: string | number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function GestaoFaturamentoPage() {
  const [data, setData] = useState<FatData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setData(await gestao('get_faturamento')) } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const maxMRR = data ? Math.max(...data.monthly_revenue.map(m => m.mrr), 1) : 1

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!data) return <div className="p-6 text-slate-400">Erro ao carregar dados.</div>

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Faturamento</h1>
          <p className="text-slate-400 text-sm mt-0.5">Receita recorrente e assinantes</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">MRR</p>
            <div className="w-7 h-7 rounded-lg bg-green-900/30 border border-green-700/20 flex items-center justify-center">
              <DollarSign size={13} className="text-green-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">{brl(data.mrr)}</p>
          <p className="text-xs text-slate-500 mt-0.5">por mês</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ARR</p>
            <div className="w-7 h-7 rounded-lg bg-blue-900/30 border border-blue-700/20 flex items-center justify-center">
              <TrendingUp size={13} className="text-blue-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">{brl(data.arr)}</p>
          <p className="text-xs text-slate-500 mt-0.5">receita anual projetada</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ARPU</p>
            <div className="w-7 h-7 rounded-lg bg-amber-900/30 border border-amber-700/20 flex items-center justify-center">
              <Users size={13} className="text-amber-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">{brl(data.arpu)}</p>
          <p className="text-xs text-slate-500 mt-0.5">receita por pagante</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Conversão</p>
            <div className="w-7 h-7 rounded-lg bg-purple-900/30 border border-purple-700/20 flex items-center justify-center">
              <Percent size={13} className="text-purple-400" />
            </div>
          </div>
          <p className="text-xl font-bold text-white">{data.conversion_rate}%</p>
          <p className="text-xs text-slate-500 mt-0.5">usuários pagantes</p>
        </div>
      </div>

      {/* Breakdown por plano */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-amber-700/20">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={16} className="text-amber-400" />
            <h2 className="font-semibold text-amber-300 text-sm">Premium</h2>
          </div>
          <p className="text-2xl font-bold text-white">{brl(data.premium_revenue)}<span className="text-slate-400 text-sm font-normal">/mês</span></p>
          <p className="text-sm text-slate-400 mt-1">{data.premium_count} assinantes × R$49,90</p>
          <p className="text-xs text-slate-500 mt-1">{brl(Number(data.premium_revenue) * 12)}/ano projetado</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 border border-purple-700/20">
          <div className="flex items-center gap-2 mb-3">
            <Heart size={16} className="text-purple-400" />
            <h2 className="font-semibold text-purple-300 text-sm">Família</h2>
          </div>
          <p className="text-2xl font-bold text-white">{brl(data.family_revenue)}<span className="text-slate-400 text-sm font-normal">/mês</span></p>
          <p className="text-sm text-slate-400 mt-1">{data.family_count} assinantes × R$29,90</p>
          <p className="text-xs text-slate-500 mt-1">{brl(Number(data.family_revenue) * 12)}/ano projetado</p>
        </div>
      </div>

      {/* Gráfico receita mensal */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="font-semibold text-slate-200 mb-4 text-sm">Receita dos novos pagantes — últimos 6 meses</h2>
        <div className="flex items-end gap-2 h-32">
          {data.monthly_revenue.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              {m.mrr > 0 && <span className="text-[9px] text-slate-400 font-semibold">{brl(m.mrr)}</span>}
              <div className="w-full bg-slate-700 rounded-t-sm relative" style={{ height: 100 }}>
                <div className="absolute bottom-0 left-0 right-0 bg-green-500/80 rounded-t-sm transition-all"
                  style={{ height: maxMRR > 0 ? `${(m.mrr / maxMRR) * 100}%` : '0%', minHeight: m.mrr > 0 ? 4 : 0 }} />
              </div>
              <span className="text-[9px] text-slate-500">{m.month}</span>
              {m.new_paying > 0 && <span className="text-[9px] text-green-500">+{m.new_paying}</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-1 text-center">Receita gerada por novos assinantes no mês · +N = novos pagantes</p>
      </div>

      {/* Lista de pagantes */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="font-semibold text-slate-200 mb-3 text-sm">
          Assinantes ativos <span className="text-slate-500">({data.paying_users.length})</span>
        </h2>
        {data.paying_users.length === 0 ? (
          <p className="text-slate-500 text-sm py-4 text-center">Nenhum assinante pago ainda</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {data.paying_users.map((u, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold shrink-0">
                  {u.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{u.name ?? '(sem nome)'}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email} · desde {fmt(u.created_at)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-400">{brl(u.monthly_value)}</p>
                  <p className="text-[10px] text-slate-500">{u.plan === 'premium' ? 'Premium' : 'Família'}/mês</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {data.paying_users.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
            <span className="text-sm text-slate-400">Total mensal</span>
            <span className="text-base font-bold text-green-400">{brl(data.mrr)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
