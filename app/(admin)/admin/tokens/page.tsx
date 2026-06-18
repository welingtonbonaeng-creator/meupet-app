'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Key, Plus, Copy, Check, Clock, UserCheck, Ban, RefreshCw, MessageSquare } from 'lucide-react'

type InviteToken = {
  id: string; token: string; notes: string | null
  used_at: string | null; expires_at: string; created_at: string
  used_by: string | null
}
type TokenRequest = {
  id: string; name: string; email: string; phone: string | null
  status: string; token_id: string | null; created_at: string
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function TokenModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Key size={18} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">Token gerado!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Copie e envie ao cliente</p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 font-mono text-sm text-center text-slate-700 dark:text-slate-200 break-all mb-4 select-all">
          {token}
        </div>

        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4">
          ⚠️ Válido por 7 dias · uso único — guarde antes de fechar
        </p>

        <div className="flex gap-2">
          <button onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
            {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar token</>}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TokensPage() {
  const supabase = createClient()
  const [tokens, setTokens] = useState<InviteToken[]>([])
  const [requests, setRequests] = useState<TokenRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState<string | false>(false)
  const [modal, setModal] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [{ data: t }, { data: r }] = await Promise.all([
      supabase.from('invite_tokens').select('*').order('created_at', { ascending: false }),
      supabase.from('token_requests').select('*').order('created_at', { ascending: false }),
    ])
    setTokens((t as InviteToken[]) ?? [])
    setRequests((r as TokenRequest[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
    load()
  }, [])

  async function generateToken(requestId?: string, reqNotes?: string) {
    setGenerating(requestId ?? 'new')
    const { data, error } = await supabase
      .from('invite_tokens')
      .insert({ notes: (reqNotes ?? notes.trim()) || null, created_by: userId })
      .select('id, token')
      .single()

    if (error || !data) { setGenerating(false); return }

    if (requestId) {
      await supabase.from('token_requests').update({
        status: 'token_sent', token_id: data.id
      }).eq('id', requestId)
    }

    setNotes('')
    setGenerating(false)
    setModal(data.token)
    load()
  }

  async function rejectRequest(id: string) {
    await supabase.from('token_requests').update({ status: 'rejected' }).eq('id', id)
    load()
  }

  const pending = requests.filter(r => r.status === 'pending')
  const now = new Date()

  function tokenStatus(t: InviteToken) {
    if (t.used_at) return 'used'
    if (new Date(t.expires_at) < now) return 'expired'
    return 'active'
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {modal && <TokenModal token={modal} onClose={() => setModal(null)} />}

      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Tokens de Acesso</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gere tokens de uso único para liberar novos cadastros
        </p>
      </div>

      {/* Gerar token avulso */}
      <Card>
        <CardContent className="p-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Plus size={16} className="text-blue-500" /> Gerar token avulso
          </h2>
          <div className="flex gap-2">
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observação (opcional: para quem é este token)"
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button onClick={() => generateToken()} loading={generating === 'new'} className="whitespace-nowrap">
              <Key size={14} className="mr-1.5" /> Gerar token
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Solicitações pendentes */}
      {pending.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-amber-500" />
            Solicitações pendentes
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-bold">{pending.length}</span>
          </h2>
          <div className="space-y-3">
            {pending.map(r => (
              <Card key={r.id} className="border-amber-200 dark:border-amber-800">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{r.name}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{r.email}</p>
                      {r.phone && <p className="text-sm text-slate-500 dark:text-slate-400">{r.phone}</p>}
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{fmt(r.created_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => generateToken(r.id, `Para: ${r.name} (${r.email})`)}
                        loading={generating === r.id}>
                        <Key size={12} className="mr-1" /> Gerar e enviar
                      </Button>
                      <button onClick={() => rejectRequest(r.id)}
                        className="p-2 rounded-xl text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors">
                        <Ban size={16} />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lista de todos os tokens */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Key size={16} className="text-slate-500" /> Tokens gerados
          </h2>
          <button onClick={load} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : tokens.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Key size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum token gerado ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tokens.map(t => {
              const status = tokenStatus(t)
              return (
                <Card key={t.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        status === 'used'    ? 'bg-green-100 dark:bg-green-900/30' :
                        status === 'expired' ? 'bg-slate-100 dark:bg-slate-700'   :
                        'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        {status === 'used'    ? <UserCheck size={14} className="text-green-600 dark:text-green-400" /> :
                         status === 'expired' ? <Clock size={14} className="text-slate-500 dark:text-slate-400" />     :
                         <Key size={14} className="text-blue-600 dark:text-blue-400" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <code className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded-lg truncate max-w-[200px]">
                            {t.token}
                          </code>
                          <Badge variant={status === 'used' ? 'success' : status === 'expired' ? 'default' : 'warning'}>
                            {status === 'used' ? 'Usado' : status === 'expired' ? 'Expirado' : 'Disponível'}
                          </Badge>
                        </div>
                        {t.notes && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.notes}</p>}
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Gerado {fmt(t.created_at)} · Expira {fmt(t.expires_at)}
                          {t.used_at && ` · Usado em ${fmt(t.used_at)}`}
                        </p>
                      </div>

                      {status === 'active' && (
                        <button onClick={() => setModal(t.token)}
                          className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0">
                          <Copy size={14} />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Histórico de solicitações */}
      {requests.filter(r => r.status !== 'pending').length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3 text-sm text-slate-500 dark:text-slate-400">
            Histórico de solicitações
          </h2>
          <div className="space-y-2">
            {requests.filter(r => r.status !== 'pending').map(r => (
              <Card key={r.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.name} — {r.email}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{fmt(r.created_at)}</p>
                    </div>
                    <Badge variant={r.status === 'token_sent' ? 'success' : 'danger'}>
                      {r.status === 'token_sent' ? 'Token enviado' : 'Rejeitado'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
