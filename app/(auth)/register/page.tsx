'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { User, Mail, Lock, Phone, Key, Send, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SUPABASE_URL = 'https://wwoasqjidsrplkpwjsro.supabase.co'
const ANON_KEY     = 'sb_publishable_1ArtUvOrkSjOgXlDZln2EQ_5gOlLLfo'

type View = 'choose' | 'register' | 'request' | 'request_sent'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [view, setView] = useState<View>('choose')

  // Cadastro com token
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '', token: '', phone: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // Solicitação de acesso
  const [req, setReq]               = useState({ name: '', email: '', phone: '' })
  const [reqLoading, setReqLoading] = useState(false)
  const [reqError, setReqError]     = useState('')

  const set  = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))
  const setR = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setReq(p => ({ ...p, [k]: e.target.value }))

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return }
    if (form.password !== form.confirm) { setError('As senhas não coincidem'); return }
    if (!form.token.trim()) { setError('O token de acesso é obrigatório'); return }
    setError(''); setLoading(true)

    const res = await fetch(`${SUPABASE_URL}/functions/v1/register-with-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({
        token: form.token.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok || data.error) {
      setError(data.error ?? 'Erro ao criar conta.')
      return
    }

    router.push('/login?registered=1')
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setReqError(''); setReqLoading(true)

    const { error } = await supabase.from('token_requests').insert({
      name: req.name.trim(),
      email: req.email.trim().toLowerCase(),
      phone: req.phone.trim() || null,
    })

    setReqLoading(false)
    if (error) { setReqError('Erro ao enviar. Tente novamente.'); return }
    setView('request_sent')
  }

  // Tela de escolha inicial
  if (view === 'choose') {
    return (
      <>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Criar conta</h2>
        <p className="text-sm text-slate-500 mb-6">Como você quer prosseguir?</p>

        <div className="space-y-3">
          <button onClick={() => setView('register')}
            className="w-full p-4 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                <Key size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Já tenho um token</p>
                <p className="text-xs text-slate-500 mt-0.5">Recebi um token e quero criar minha conta</p>
              </div>
            </div>
          </button>

          <button onClick={() => setView('request')}
            className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
                <Send size={18} className="text-slate-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Solicitar acesso</p>
                <p className="text-xs text-slate-500 mt-0.5">Não tenho token — quero solicitar ao administrador</p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Já tem conta? <Link href="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
        </p>
      </>
    )
  }

  // Tela de cadastro com token
  if (view === 'register') {
    return (
      <>
        <button onClick={() => { setView('choose'); setError('') }} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
          ← Voltar
        </button>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Criar conta</h2>
        <p className="text-sm text-slate-500 mb-5">Insira seu token e os dados da conta</p>

        {error && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
            <label className="text-xs font-bold text-blue-700 block mb-1.5" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Key size={12} /> Token de acesso
            </label>
            <input
              value={form.token} onChange={set('token')} required
              placeholder="Cole aqui o token recebido"
              className="w-full bg-transparent text-sm font-mono text-blue-800 placeholder-blue-400 focus:outline-none"
            />
          </div>

          <Input label="Nome completo" placeholder="João Silva" icon={<User size={16} />} value={form.name} onChange={set('name')} required />
          <Input label="E-mail" type="email" placeholder="joao@email.com" icon={<Mail size={16} />} value={form.email} onChange={set('email')} required />
          <Input label="Telefone (opcional)" type="tel" placeholder="(21) 99999-0000" icon={<Phone size={16} />} value={form.phone} onChange={set('phone')} />
          <Input label="Senha" type="password" placeholder="mínimo 6 caracteres" icon={<Lock size={16} />} value={form.password} onChange={set('password')} required />
          <Input label="Confirmar senha" type="password" placeholder="repita a senha" icon={<Lock size={16} />} value={form.confirm} onChange={set('confirm')} required />

          <Button type="submit" loading={loading} className="w-full h-12 text-base mt-2">Criar conta</Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          Já tem conta? <Link href="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
        </p>
      </>
    )
  }

  // Tela de solicitação de acesso
  if (view === 'request') {
    return (
      <>
        <button onClick={() => { setView('choose'); setReqError('') }} className="text-sm text-slate-500 hover:text-slate-700 mb-4 flex items-center gap-1">
          ← Voltar
        </button>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Solicitar acesso</h2>
        <p className="text-sm text-slate-500 mb-5">
          Preencha seus dados e o administrador enviará seu token de acesso
        </p>

        {reqError && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{reqError}</div>}

        <form onSubmit={handleRequest} className="space-y-3">
          <Input label="Nome completo" placeholder="João Silva" icon={<User size={16} />} value={req.name} onChange={setR('name')} required />
          <Input label="E-mail" type="email" placeholder="joao@email.com" icon={<Mail size={16} />} value={req.email} onChange={setR('email')} required />
          <Input label="WhatsApp (opcional)" type="tel" placeholder="(21) 99999-0000" icon={<Phone size={16} />} value={req.phone} onChange={setR('phone')} />

          <Button type="submit" loading={reqLoading} className="w-full h-12 text-base mt-2">
            <Send size={16} className="mr-2" /> Enviar solicitação
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Após enviar, aguarde o contato com seu token via e-mail ou WhatsApp
        </p>
      </>
    )
  }

  // Solicitação enviada com sucesso
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle size={32} className="text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Solicitação enviada!</h2>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        Sua solicitação foi recebida. O administrador analisará e enviará seu token de acesso em breve.
      </p>
      <Link href="/login" className="text-blue-600 font-semibold hover:underline text-sm">
        Voltar para o login
      </Link>
    </div>
  )
}
