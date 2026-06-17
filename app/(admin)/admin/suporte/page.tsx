'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { LifeBuoy, MessageSquare, CheckCircle, Clock, AlertCircle, Send } from 'lucide-react'

const STATUS_CONFIG = {
  open:        { label: 'Aberto',      color: 'danger' as const,  icon: AlertCircle },
  in_progress: { label: 'Em andamento', color: 'warning' as const, icon: Clock },
  resolved:    { label: 'Resolvido',   color: 'success' as const, icon: CheckCircle },
}

const PRIORITY_CONFIG = {
  low:    { label: 'Baixa',  color: 'default' as const },
  normal: { label: 'Normal', color: 'info' as const },
  high:   { label: 'Alta',   color: 'danger' as const },
}

type Ticket = {
  id: string
  user_id: string
  subject: string
  message: string
  status: 'open' | 'in_progress' | 'resolved'
  priority: 'low' | 'normal' | 'high'
  admin_reply: string | null
  replied_at: string | null
  created_at: string
  profiles: { name: string; email: string | null } | null
}

export default function AdminSuporte() {
  const supabase = createClient()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  async function load() {
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false })
    setTickets((data as Ticket[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = filterStatus ? tickets.filter(t => t.status === filterStatus) : tickets
  const counts = {
    open:        tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved:    tickets.filter(t => t.status === 'resolved').length,
  }

  async function reply(ticket: Ticket) {
    const text = replyTexts[ticket.id]?.trim()
    if (!text) return
    setSaving(ticket.id)
    const { error } = await supabase.from('support_tickets').update({
      admin_reply: text,
      status: 'resolved',
      replied_at: new Date().toISOString(),
    }).eq('id', ticket.id)
    if (!error) {
      setTickets(prev => prev.map(t => t.id === ticket.id
        ? { ...t, admin_reply: text, status: 'resolved', replied_at: new Date().toISOString() }
        : t))
      setReplyTexts(prev => { const n = { ...prev }; delete n[ticket.id]; return n })
      setExpandedId(null)
      setMsg('Resposta enviada!')
    } else {
      setMsg('Erro: ' + error.message)
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 3000)
  }

  async function changeStatus(ticketId: string, status: string) {
    await supabase.from('support_tickets').update({ status }).eq('id', ticketId)
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: status as Ticket['status'] } : t))
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Suporte</h1>
        <p className="text-sm text-slate-400 mt-0.5">Gerencie as solicitações dos usuários</p>
      </div>

      {msg && <div className="p-3 rounded-xl bg-blue-900/30 border border-blue-700 text-blue-300 text-sm">{msg}</div>}

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: '', label: 'Todos', count: tickets.length },
          { key: 'open', label: 'Abertos', count: counts.open },
          { key: 'in_progress', label: 'Em andamento', count: counts.in_progress },
          { key: 'resolved', label: 'Resolvidos', count: counts.resolved },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === tab.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}>
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filterStatus === tab.key ? 'bg-white/20' : 'bg-slate-700'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <LifeBuoy size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">Nenhum ticket {filterStatus ? STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label.toLowerCase() : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => {
            const status = STATUS_CONFIG[ticket.status]
            const priority = PRIORITY_CONFIG[ticket.priority]
            const StatusIcon = status.icon
            const isExpanded = expandedId === ticket.id
            const userName = ticket.profiles?.name ?? 'Usuário'
            const userEmail = ticket.profiles?.email

            return (
              <Card key={ticket.id} className={ticket.status === 'open' ? 'border-red-900/50' : ''}>
                <CardContent className="p-4">
                  {/* Header do ticket */}
                  <div className="flex items-start gap-3">
                    <StatusIcon size={18} className={`mt-0.5 shrink-0 ${ticket.status === 'open' ? 'text-red-400' : ticket.status === 'in_progress' ? 'text-amber-400' : 'text-green-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{ticket.subject}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{userName}{userEmail ? ` · ${userEmail}` : ''} · {formatDate(ticket.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={priority.color}>{priority.label}</Badge>
                          <Badge variant={status.color}>{status.label}</Badge>
                        </div>
                      </div>

                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{ticket.message}</p>

                      {ticket.admin_reply && (
                        <div className="mt-3 p-3 rounded-xl bg-blue-900/20 border border-blue-800">
                          <p className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-1">
                            <MessageSquare size={10} /> Resposta do suporte · {ticket.replied_at ? formatDate(ticket.replied_at) : ''}
                          </p>
                          <p className="text-sm text-slate-300">{ticket.admin_reply}</p>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {ticket.status !== 'resolved' && (
                          <button onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 text-xs font-medium transition-all">
                            <MessageSquare size={12} /> Responder
                          </button>
                        )}
                        {ticket.status === 'open' && (
                          <button onClick={() => changeStatus(ticket.id, 'in_progress')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 text-xs font-medium transition-all">
                            <Clock size={12} /> Em andamento
                          </button>
                        )}
                        {ticket.status !== 'resolved' && (
                          <button onClick={() => changeStatus(ticket.id, 'resolved')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 text-xs font-medium transition-all">
                            <CheckCircle size={12} /> Resolver
                          </button>
                        )}
                        {ticket.status === 'resolved' && (
                          <button onClick={() => changeStatus(ticket.id, 'open')}
                            className="text-xs text-slate-500 hover:text-slate-400 px-3 py-1.5">
                            Reabrir
                          </button>
                        )}
                      </div>

                      {/* Caixa de resposta */}
                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyTexts[ticket.id] ?? ''}
                            onChange={e => setReplyTexts(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                            placeholder="Digite sua resposta para o usuário..."
                            rows={3}
                            className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => reply(ticket)} loading={saving === ticket.id}
                              disabled={!replyTexts[ticket.id]?.trim()} className="gap-1.5">
                              <Send size={12} /> Enviar e resolver
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setExpandedId(null)}>Cancelar</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
