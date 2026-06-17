'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Profile } from '@/types'
import { User, Bell, LogOut, Save } from 'lucide-react'

export default function ConfiguracoesPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [form, setForm]       = useState({ name: '', phone: '', city: '', state: '' })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data)
          setForm({ name: data.name || '', phone: data.phone || '', city: data.city || '', state: data.state || '' })
        }
      })
    })
  }, [])

  async function save() {
    setSaving(true)
    await supabase.from('profiles').update({
      name: form.name, phone: form.phone, city: form.city, state: form.state
    }).eq('id', profile!.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div>
      <TopBar title="Configurações" subtitle="Gerencie sua conta" />

      <div className="p-4 lg:p-6 max-w-xl space-y-4">

        {/* Plano */}
        {profile && (
          <Card className={`${profile.plan !== 'free' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-xs font-bold mb-0.5 ${profile.plan !== 'free' ? 'text-blue-200' : 'text-slate-500'}`}>PLANO ATUAL</div>
                  <div className={`text-lg font-bold ${profile.plan !== 'free' ? 'text-white' : 'text-slate-800'}`}>
                    {profile.plan === 'free' ? 'Gratuito' : profile.plan === 'premium' ? 'Premium ⭐' : 'Família 👨‍👩‍👧‍👦'}
                  </div>
                  {profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date() && (
                    <div className={`text-xs mt-0.5 ${profile.plan !== 'free' ? 'text-blue-200' : 'text-blue-600'}`}>
                      Trial até {new Date(profile.trial_ends_at).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
                {profile.plan === 'free' && (
                  <Button size="sm">Fazer upgrade</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados pessoais */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <User size={16} className="text-blue-500" /> Dados pessoais
            </h3>
            <Input label="Nome completo" value={form.name} onChange={set('name')} placeholder="Seu nome" />
            <Input label="Telefone" type="tel" value={form.phone} onChange={set('phone')} placeholder="(11) 99999-0000" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cidade" value={form.city} onChange={set('city')} placeholder="São Paulo" />
              <Input label="Estado" value={form.state} onChange={set('state')} placeholder="SP" maxLength={2} />
            </div>
            <Button onClick={save} loading={saving} className="w-full gap-2">
              {saved ? '✓ Salvo!' : <><Save size={14} /> Salvar alterações</>}
            </Button>
          </CardContent>
        </Card>

        {/* Sair */}
        <Card>
          <CardContent className="p-4">
            <Button variant="outline" className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50" onClick={logout}>
              <LogOut size={16} /> Sair da conta
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-400 pb-4">
          MeuPet+ · versão 1.0.0
        </div>
      </div>
    </div>
  )
}
