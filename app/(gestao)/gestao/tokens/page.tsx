'use client'
import { useEffect, useState } from 'react'
import { gestao } from '@/lib/gestao'
import { Key, Plus, Copy, Check, Clock, UserCheck, Ban, RefreshCw, MessageSquare } from 'lucide-react'

type Token = { id: string; token: string; notes: string | null; used_at: string | null; expires_at: string; created_at: string }
type Request = { id: string; name: string; email: string; phone: string | null; status: string; created_at: string }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function TokenModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-900/30 border border-green-700/30 flex items-center justify-center">
            <Key size={18} className="text-green-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Token gerado!</h3>
            <p className="text-xs text-slate-400">Copie e envie ao cliente</p>
          </div>
        </div>
        <div className="bg-slate-900 rounded-xl p-3 font-mono text-sm text-center text-green-300 break-all mb-4 select-all border border-slate-700">
          {token}
        </div>
        <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-xl p-3 mb-4">
          ⚠️ Válido por 7 dias · uso único — copie antes de fechar
        </p>
        <div className="flex gap-2">
          <button onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
            {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GestaoTokensPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState<string | false>(false)
  const [modal, setModal] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const d = await gestao('get_tokens')
      setTokens(d.tokens ?? [])
      setRequests(d.requests ?? [])
    } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function generate(requestId?: string, reqNotes?: string) {
    setGenerating(requestId ?? 'new')
    try {
      if (requestId) {
        const d = await gestao('handle_token_request', { request_id: requestId, action: 'approve' })
        setModal(d.token)
      } else {
        const d = await gestao('create_token', { notes: (reqNotes ?? notes.trim()) || null })
        setModal(d.token)
        setNotes('')
      }
      load()
    } catch { /* */ }
    setGenerating(false)
  }

  async function reject(id: string) {
    await gestao('handle_token_request', { request_id: id, action: 'reject' })
    load()
  }

  const now = new Date()
  function tokenStatus(t: Token) {
    if (t.used_at) return 'used'
    if (new Date(t.expires_at) < now) return 'expired'
    return 'active'
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
      {modal && <TokenModal token={modal} onClose={() => setModal(null)} />}

      <div>
        <h1 className="text-xl font-bold text-white">Tokens de Acesso</h1>
        <p className="text-slate-400 text-sm mt-0.5">Gere tokens de uso único para liberar novos cadastros</p>
      </div>

      {/* Gerar token avulso */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
          <Plus size={15} className="text-blue-400" /> Gerar token avulso
        </h2>
        <div className="flex gap-2">
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Observação (opcional: para quem é este token)"
            className="flex-1 px-3 py-2 text-sm rounded-xl bg-slate-700 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={() => generate()} disabled={generating === 'new'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors whitespace-nowrap">
            <Key size={14} /> {generating === 'new' ? 'Gerando...' : 'Gerar'}
          </button>
        </div>
      </div>

      {/* Solicitações pendentes */}
      {pending.length > 0 && (
        <div>
          <h2 className="font-semibold text-slate-200 mb-3 flex items-center gap-2 text-sm">
            <MessageSquare size={15} className="text-amber-400" />
            Solicitações pendentes
            <span className="px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/30 text-xs font-bold">{pending.length}</span>
          </h2>
          <div className="space-y-2">
            {pending.map(r => (
              <div key={r.id} className="bg-slate-800 rounded-xl p-4 border border-amber-700/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-100">{r.name}</p>
                    <p className="text-sm text-slate-400">{r.email}</p>
                    {r.phone && <p className="text-sm text-slate-500">{r.phone}</p>}
                    <p className="text-xs text-slate-500 mt-1">{fmt(r.created_at)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => generate(r.id)} disabled={generating === r.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors">
                      <Key size={12} /> {generating === r.id ? '...' : 'Gerar token'}
                    </button>
                    <button onClick={() => reject(r.id)}
                      className="p-2 rounded-xl text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors">
                      <Ban size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tokens gerados */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
            <Key size={15} className="text-slate-400" /> Tokens gerados
          </h2>
          <button onClick={load} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />)}</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">Nenhum token gerado ainda</div>
        ) : (
          <div className="space-y-2">
            {tokens.map(t => {
              const st = tokenStatus(t)
              return (
                <div key={t.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    st === 'used' ? 'bg-green-900/30' : st === 'expired' ? 'bg-slate-700' : 'bg-blue-900/30'
                  }`}>
                    {st === 'used'    ? <UserCheck size={14} className="text-green-400" /> :
                     st === 'expired' ? <Clock size={14} className="text-slate-500" />     :
                     <Key size={14} className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded truncate max-w-[180px]">{t.token}</code>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                        st === 'used' ? 'bg-green-900/30 text-green-400 border-green-700/30' :
                        st === 'expired' ? 'bg-slate-700 text-slate-400 border-slate-600' :
                        'bg-blue-900/30 text-blue-400 border-blue-700/30'
                      }`}>
                        {st === 'used' ? 'Usado' : st === 'expired' ? 'Expirado' : 'Disponível'}
                      </span>
                    </div>
                    {t.notes && <p className="text-xs text-slate-500 mt-0.5 truncate">{t.notes}</p>}
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {fmt(t.created_at)} · expira {fmt(t.expires_at)}
                      {t.used_at ? ` · usado ${fmt(t.used_at)}` : ''}
                    </p>
                  </div>
                  {st === 'active' && (
                    <button onClick={() => setModal(t.token)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-700 hover:text-white transition-colors shrink-0">
                      <Copy size={13} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
