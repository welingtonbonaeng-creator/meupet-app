'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { gestao } from '@/lib/gestao'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Shield } from 'lucide-react'

export default function GestaoLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword(form)
    if (authError) { setLoading(false); setError('E-mail ou senha incorretos'); return }

    try {
      const result = await gestao('check_admin')
      if (result.ok) {
        router.push('/gestao/usuarios')
      } else {
        await supabase.auth.signOut()
        setError('Acesso negado. Esta conta não tem permissão de gestor.')
      }
    } catch {
      await supabase.auth.signOut()
      setError('Acesso negado. Esta conta não tem permissão de gestor.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel de Gestão</h1>
          <p className="text-slate-400 text-sm mt-1">MeuPet+ · Acesso restrito</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-700 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" required value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="gestor@email.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password" required value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-700 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mt-2">
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verificando...</> : 'Entrar no painel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
