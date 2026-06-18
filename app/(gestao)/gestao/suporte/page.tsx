'use client'
import { useEffect, useState } from 'react'
import { gestao } from '@/lib/gestao'
import { MessageSquare, CheckCircle, Clock, AlertCircle, RefreshCw, Send, ChevronDown } from 'lucide-react'

type Ticket = {
  id: string; subject: string; message: string; status: string
  admin_reply: string | null; replied_at: string | null; created_at: string
  user: { name: string; email: string }
}

const STATUS = {
  open:        { label: 'Aguardando',  icon: AlertCircle, color: 'text-red-400',   bg: 'bg-red-900/20 border-red-700/30' },
  in_progress: { label: 'Em análise', icon: Clock,        color: 'text-amber-400', bg: 'bg-amber-900/20 border-amber-700/30' },
  resolved:    { label: 'Resolvido',  icon: CheckCircle,  color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function GestaoSuportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setTickets(await gestao('get_tickets')) } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function reply(ticket: Ticket) {
    const text = replyText[ticket.id]?.trim()
    if (!text) return
    setSaving(ticket.id)
    try {
      await gestao('reply_ticket', { ticket_id: ticket.id, reply: text, status: 'resolved' })
      setReplyText(p => ({ ...p, [ticket.id]: '' }))
      load()
    } catch { /* */ }
    setSaving(null)
  }

  async function changeStatus(ticketId: string, status: string) {
    await gestao('update_ticket_status', { ticket_id: ticketId, status })
    load()
  }

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)
  const counts = {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-white">Suporte</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {counts.open} aguardando · {counts.in_progress} em análise · {counts.resolved} resolvidos
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        {[
          { val: 'all', label: 'Todos' },
          { val: 'open', label: 'Aguardando' },
          { val: 'in_progress', label: 'Em análise' },
          { val: 'resolved', label: 'Resolvidos' },
        ].map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.val ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}>
            {f.label}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhum ticket encontrado</div>
        ) : filtered.map(ticket => {
          const st = STATUS[ticket.status as keyof typeof STATUS] ?? STATUS.open
          const Icon = st.icon
          const isOpen = expanded === ticket.id

          return (
            <div key={ticket.id} className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden`}>
              <button onClick={() => setExpanded(isOpen ? null : ticket.id)}
                className="w-full p-4 text-left flex items-start gap-3">
                <Icon size={16} className={`${st.color} mt-0.5 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100 text-sm">{ticket.subject}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{ticket.user.name} · {ticket.user.email}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{fmt(ticket.created_at)}</p>
                </div>
                <ChevronDown size={16} className={`text-slate-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-700 pt-3">
                  {/* Mensagem do usuário */}
                  <div className="bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs font-semibold text-slate-400 mb-1">Mensagem do usuário</p>
                    <p className="text-sm text-slate-200 leading-relaxed">{ticket.message}</p>
                  </div>

                  {/* Resposta anterior */}
                  {ticket.admin_reply && (
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-3">
                      <p className="text-xs font-semibold text-blue-400 mb-1">Sua resposta · {ticket.replied_at ? fmt(ticket.replied_at) : ''}</p>
                      <p className="text-sm text-slate-200">{ticket.admin_reply}</p>
                    </div>
                  )}

                  {/* Campo de resposta */}
                  <div className="space-y-2">
                    <textarea
                      value={replyText[ticket.id] ?? ''}
                      onChange={e => setReplyText(p => ({ ...p, [ticket.id]: e.target.value }))}
                      placeholder="Digite sua resposta..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-700 border border-slate-600 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => reply(ticket)} disabled={saving === ticket.id || !replyText[ticket.id]?.trim()}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors">
                        <Send size={12} />
                        {saving === ticket.id ? 'Enviando...' : 'Responder e resolver'}
                      </button>
                      {ticket.status !== 'in_progress' && (
                        <button onClick={() => changeStatus(ticket.id, 'in_progress')}
                          className="px-3 py-2 rounded-lg bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 text-xs font-semibold transition-colors border border-amber-700/30">
                          Em análise
                        </button>
                      )}
                      {ticket.status !== 'open' && (
                        <button onClick={() => changeStatus(ticket.id, 'open')}
                          className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold transition-colors">
                          Reabrir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
