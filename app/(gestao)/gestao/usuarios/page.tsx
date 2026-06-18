'use client'
import { useEffect, useState } from 'react'
import { gestao } from '@/lib/gestao'
import { Search, RefreshCw, ChevronDown, Mail, Lock, Trash2, CheckCircle, X } from 'lucide-react'

type User = {
  id: string; name: string; email: string; plan: string
  role: string; pets_count: number; created_at: string
}

const PLANS = ['free', 'premium', 'family']

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR')
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    premium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    family:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
    free:    'bg-slate-700 text-slate-300 border-slate-600',
  }
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colors[plan] ?? colors.free}`}>
      {plan === 'premium' ? 'Premium' : plan === 'family' ? 'Família' : 'Grátis'}
    </span>
  )
}

export default function GestaoUsuariosPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('todos')
  const [selected, setSelected] = useState<User | null>(null)
  const [modal, setModal] = useState<'plan' | 'email' | 'password' | 'delete' | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  async function load() {
    setLoading(true)
    try { setUsers(await gestao('get_users')) } catch { /* erro */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openModal(user: User, type: typeof modal) {
    setSelected(user)
    setInputVal(type === 'email' ? user.email : type === 'plan' ? user.plan : '')
    setModal(type)
  }

  function closeModal() { setModal(null); setSelected(null); setInputVal('') }

  async function save() {
    if (!selected || !modal) return
    setSaving(true)
    try {
      if (modal === 'plan') {
        await gestao('update_plan', { user_id: selected.id, plan: inputVal })
        showToast('Plano atualizado')
      } else if (modal === 'email') {
        await gestao('update_email', { user_id: selected.id, email: inputVal })
        showToast('E-mail atualizado')
      } else if (modal === 'password') {
        if (inputVal.length < 6) { setSaving(false); return }
        await gestao('reset_password', { user_id: selected.id, new_password: inputVal })
        showToast('Senha atualizada')
      } else if (modal === 'delete') {
        await gestao('delete_user', { user_id: selected.id })
        showToast('Usuário excluído')
      }
      closeModal()
      load()
    } catch (err) {
      showToast('Erro: ' + String(err))
    }
    setSaving(false)
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchPlan = filterPlan === 'todos' || u.plan === filterPlan
    return matchSearch && matchPlan
  })

  const stats = {
    total: users.length,
    premium: users.filter(u => u.plan === 'premium').length,
    family: users.filter(u => u.plan === 'family').length,
    free: users.filter(u => u.plan === 'free').length,
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-white">Usuários</h1>
        <p className="text-slate-400 text-sm mt-0.5">{stats.total} cadastrados · {stats.premium} Premium · {stats.family} Família · {stats.free} Grátis</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="todos">Todos os planos</option>
          <option value="free">Grátis</option>
          <option value="premium">Premium</option>
          <option value="family">Família</option>
        </select>
        <button onClick={load} className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhum usuário encontrado</div>
        ) : filtered.map(user => (
          <div key={user.id} className="bg-slate-800 rounded-xl p-3.5 border border-slate-700 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
              {user.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-100 text-sm">{user.name ?? '(sem nome)'}</span>
                <PlanBadge plan={user.plan} />
                {user.role === 'admin' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-700/30">GESTOR</span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">{user.email} · {user.pets_count} pet(s) · desde {fmt(user.created_at)}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              {/* Botão trocar plano */}
              <button onClick={() => openModal(user, 'plan')} title="Trocar plano"
                className="p-2 rounded-lg text-slate-400 hover:bg-amber-900/30 hover:text-amber-400 transition-colors">
                <ChevronDown size={14} />
              </button>
              {/* Trocar e-mail */}
              <button onClick={() => openModal(user, 'email')} title="Alterar e-mail"
                className="p-2 rounded-lg text-slate-400 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
                <Mail size={14} />
              </button>
              {/* Resetar senha */}
              <button onClick={() => openModal(user, 'password')} title="Nova senha"
                className="p-2 rounded-lg text-slate-400 hover:bg-green-900/30 hover:text-green-400 transition-colors">
                <Lock size={14} />
              </button>
              {/* Excluir */}
              {user.role !== 'admin' && (
                <button onClick={() => openModal(user, 'delete')} title="Excluir usuário"
                  className="p-2 rounded-lg text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-slate-800 rounded-2xl p-5 w-full max-w-sm border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">
                {modal === 'plan' ? 'Trocar plano' :
                 modal === 'email' ? 'Alterar e-mail' :
                 modal === 'password' ? 'Nova senha' : 'Excluir usuário'}
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>

            <p className="text-sm text-slate-400 mb-4">{selected.name} · {selected.email}</p>

            {modal === 'plan' && (
              <select value={inputVal} onChange={e => setInputVal(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-4">
                {PLANS.map(p => <option key={p} value={p}>{p === 'premium' ? 'Premium — R$49,90/mês' : p === 'family' ? 'Família — R$29,90/mês' : 'Grátis'}</option>)}
              </select>
            )}

            {(modal === 'email' || modal === 'password') && (
              <input value={inputVal} onChange={e => setInputVal(e.target.value)}
                type={modal === 'password' ? 'password' : 'email'}
                placeholder={modal === 'password' ? 'Nova senha (mín. 6 caracteres)' : 'novo@email.com'}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mb-4"
              />
            )}

            {modal === 'delete' && (
              <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm mb-4">
                Esta ação é irreversível. Todos os dados do usuário serão excluídos.
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  modal === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-60`}>
                {saving ? 'Salvando...' : modal === 'delete' ? 'Confirmar exclusão' : 'Salvar'}
              </button>
              <button onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
