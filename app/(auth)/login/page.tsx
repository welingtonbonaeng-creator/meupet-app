'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Mail, Lock } from 'lucide-react'

const TEST_ACCOUNTS = [
  { label: 'Admin (premium)', email: 'admin@meupet.com',  password: 'MeuPet@2026' },
  { label: 'João (usuário)',  email: 'joao@meupet.com',   password: 'MeuPet@2026' },
  { label: 'Maria (usuário)', email: 'maria@meupet.com',  password: 'MeuPet@2026' },
]

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword(form)
    setLoading(false)
    if (error) { setError('E-mail ou senha incorretos'); return }
    router.push('/dashboard')
  }

  function fillAccount(acc: typeof TEST_ACCOUNTS[0]) {
    setForm({ email: acc.email, password: acc.password })
  }

  return (
    <>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Bem-vindo de volta!</h2>
      <p className="text-sm text-slate-500 mb-6">Acesse sua conta para ver seus pets</p>

      {/* === CREDENCIAIS DE TESTE — REMOVER ANTES DO LANÇAMENTO === */}
      <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <p className="text-xs font-semibold text-amber-800 mb-2">🧪 Contas de teste (clicar para preencher):</p>
        <div className="space-y-1">
          {TEST_ACCOUNTS.map(acc => (
            <button key={acc.email} type="button" onClick={() => fillAccount(acc)}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
              <span className="text-xs font-medium text-amber-900">{acc.label}</span>
              <span className="block text-xs text-amber-700 font-mono">{acc.email} · {acc.password}</span>
            </button>
          ))}
        </div>
      </div>
      {/* === FIM CREDENCIAIS DE TESTE === */}

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="E-mail" type="email" placeholder="voce@email.com" icon={<Mail size={16} />}
          value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
        <Input label="Senha" type="password" placeholder="••••••••" icon={<Lock size={16} />}
          value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">Esqueci minha senha</Link>
        </div>
        <Button type="submit" loading={loading} className="w-full h-12 text-base">Entrar</Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-6">
        Não tem conta?{' '}
        <Link href="/register" className="text-blue-600 font-semibold hover:underline">Cadastre-se grátis</Link>
      </p>
    </>
  )
}
