'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { User, Mail, Lock, Phone } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm]     = useState({ name: '', email: '', password: '', phone: '', city: '', state: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return }
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name, phone: form.phone, city: form.city, state: form.state } }
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
  }

  return (
    <>
      <h2 className="text-xl font-bold text-slate-800 mb-1">Crie sua conta grátis</h2>
      <p className="text-sm text-slate-500 mb-6">14 dias de Premium sem cartão de crédito 🎉</p>

      {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Nome completo" placeholder="João Silva" icon={<User size={16} />} value={form.name} onChange={set('name')} required />
        <Input label="E-mail" type="email" placeholder="joao@email.com" icon={<Mail size={16} />} value={form.email} onChange={set('email')} required />
        <Input label="Senha" type="password" placeholder="mínimo 6 caracteres" icon={<Lock size={16} />} value={form.password} onChange={set('password')} required />
        <Input label="Telefone (opcional)" type="tel" placeholder="(11) 99999-0000" icon={<Phone size={16} />} value={form.phone} onChange={set('phone')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Cidade" placeholder="São Paulo" value={form.city} onChange={set('city')} />
          <Input label="Estado" placeholder="SP" maxLength={2} value={form.state} onChange={set('state')} />
        </div>
        <Button type="submit" loading={loading} className="w-full h-12 text-base mt-2">Criar conta grátis</Button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-4">
        Ao criar a conta você concorda com os{' '}
        <a href="#" className="text-blue-600 hover:underline">Termos de Uso</a>
      </p>
      <p className="text-center text-sm text-slate-500 mt-3">
        Já tem conta? <Link href="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
      </p>
    </>
  )
}
