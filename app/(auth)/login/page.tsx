'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [justRegistered, setJustRegistered] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('registered') === '1') setJustRegistered(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword(form)
    if (error) { setLoading(false); setError('E-mail ou senha incorretos'); return }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', data.user.id).single()

    setLoading(false)
    if (profile?.role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Bem-vindo de volta!</h2>
      <p className="text-sm text-slate-500 mb-6">Acesse sua conta para ver seus pets</p>

      {justRegistered && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} className="shrink-0" />
          Conta criada com sucesso! Faça login para continuar.
        </div>
      )}

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
        <Link href="/register" className="text-blue-600 font-semibold hover:underline">Solicitar acesso</Link>
      </p>
    </>
  )
}
