'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Search, Mail, CreditCard, PawPrint, Users, ChevronDown } from 'lucide-react'

const PLANS = [
  { value: 'free',    label: 'Grátis',  color: 'default' as const,  price: 0 },
  { value: 'family',  label: 'Família', color: 'purple' as const,   price: 29.90 },
  { value: 'premium', label: 'Premium', color: 'warning' as const,  price: 49.90 },
]

type UserRow = {
  id: string; name: string; email: string | null; plan: string
  role: string; created_at: string; pets: { count: number }[]
}

export default function AdminUsuarios() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email, plan, role, created_at, pets(count)')
      .order('created_at', { ascending: false })
    setUsers((data as UserRow[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
      const matchPlan   = !filterPlan || u.plan === filterPlan
      return matchSearch && matchPlan
    })
  }, [users, search, filterPlan])

  async function changePlan(userId: string, newPlan: string) {
    setChangingPlan(userId)
    const { error } = await supabase.from('profiles').update({ plan: newPlan }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: newPlan } : u))
      setMsg('Plano atualizado!')
    } else {
      setMsg('Erro ao atualizar plano: ' + error.message)
    }
    setChangingPlan(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function resetPassword(email: string, userId: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://welingtonbonaeng-creator.github.io/meupet-app/reset-password',
    })
    if (!error) {
      setResetSent(userId)
      setTimeout(() => setResetSent(null), 5000)
    } else {
      setMsg('Erro: ' + error.message)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const planBadge = (plan: string) => {
    const p = PLANS.find(x => x.value === plan)
    return <Badge variant={p?.color ?? 'default'}>{p?.label ?? plan}</Badge>
  }

  const petsCount = (u: UserRow) => u.pets?.[0]?.count ?? 0

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Usuários</h1>
        <p className="text-sm text-slate-400 mt-0.5">Gerencie todos os usuários da plataforma</p>
      </div>

      {msg && (
        <div className="p-3 rounded-xl bg-blue-900/30 border border-blue-700 text-blue-300 text-sm">{msg}</div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {['', ...PLANS.map(p => p.value)].map(v => (
              <button key={v} onClick={() => setFilterPlan(v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterPlan === v ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                {v === '' ? 'Todos' : PLANS.find(p => p.value === v)?.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats rápidas */}
      <div className="flex gap-3 text-sm text-slate-400">
        <span className="flex items-center gap-1.5"><Users size={14} /> {filtered.length} de {users.length} usuários</span>
        <span>·</span>
        <span className="text-green-400 font-medium">
          {formatCurrency(
            filtered.reduce((s, u) => s + (PLANS.find(p => p.value === u.plan)?.price ?? 0), 0)
          )}/mês (filtro atual)
        </span>
      </div>

      {/* Tabela de usuários */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <Card><CardContent className="p-8 text-center text-slate-500">Nenhum usuário encontrado</CardContent></Card>
          )}
          {filtered.map(u => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-900/40 flex items-center justify-center shrink-0 text-sm font-bold text-blue-400">
                    {u.name?.[0]?.toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200">{u.name}</span>
                      {u.role === 'admin' && <Badge variant="danger">Admin</Badge>}
                      {planBadge(u.plan)}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {u.email && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={10} />{u.email}
                        </span>
                      )}
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <PawPrint size={10} />{petsCount(u)} pets
                      </span>
                      <span className="text-xs text-slate-600">
                        Desde {formatDate(u.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Mudar plano */}
                    {u.role !== 'admin' && (
                      <div className="relative group">
                        <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-all">
                          <CreditCard size={12} /> Plano <ChevronDown size={10} />
                        </button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10">
                          {PLANS.map(p => (
                            <button key={p.value} onClick={() => changePlan(u.id, p.value)}
                              disabled={changingPlan === u.id || u.plan === p.value}
                              className={`w-full text-left px-3 py-2 text-xs transition-all first:rounded-t-xl last:rounded-b-xl ${u.plan === p.value ? 'text-blue-400 bg-blue-900/20 font-semibold' : 'text-slate-300 hover:bg-slate-700'}`}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reset senha */}
                    {u.email && u.role !== 'admin' && (
                      <button
                        onClick={() => resetPassword(u.email!, u.id)}
                        disabled={resetSent === u.id}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${resetSent === u.id ? 'bg-green-900/40 text-green-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        title="Enviar email de redefinição de senha"
                      >
                        <Mail size={12} />{resetSent === u.id ? 'Enviado!' : 'Reset senha'}
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
