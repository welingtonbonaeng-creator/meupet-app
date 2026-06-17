'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopBar } from '@/components/layout/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { LifeBuoy, Plus, MessageSquare, CheckCircle, Clock, AlertCircle, X } from 'lucide-react'

const SUBJECTS = [
  'Problema com meu pet', 'Erro no aplicativo', 'Dúvida sobre planos',
  'Cancelamento de assinatura', 'Problema com pagamento', 'Sugestão de melhoria', 'Outro',
]

const STATUS_CONFIG = {
  open:        { label: 'Aguardando',  color: 'danger' as const,  icon: AlertCircle },
  in_progress: { label: 'Em análise', color: 'warning' as const, icon: Clock },
  resolved:    { label: 'Resolvido',  color: 'success' as const, icon: CheckCircle },
}

type Ticket = { id: string; subject: string; message: string; status: string; admin_reply: string | null; replied_at: string | null; created_at: string }

export default function SuportePage() {
  const supabase = createClient()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: SUBJECTS[0], message: '' })
  const [sending, setSending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
      if (data.user) {
        supabase.from('support_tickets')
          .select('id, subject, message, status, admin_reply, replied_at, created_at')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })
          .then(({ data: t }) => { setTickets((t as Ticket[]) ?? []); setLoading(false) })
      } else { setLoading(false) }
    })
  }, [])

  async function send() {
    if (!userId || !form.message.trim()) return
    setSending(true)
    const { data, error } = await supabase.from('support_tickets').insert({
      user_id: userId, subject: form.subject, message: form.message.trim()
    }).select('id, subject, message, status, admin_reply, replied_at, created_at').single()
    if (!error && data) {
      setTickets(prev => [data as Ticket, ...prev])
      setForm({ subject: SUBJECTS[0], message: '' })
      setShowForm(false)
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Suporte" subtitle="Fale com a gente" />
      <div className="flex-1 overflow-auto p-4 space-y-4 pb-24">

        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tickets.length > 0 ? `${tickets.length} solicitação(ões)` : 'Nenhuma solicitação ainda'}
          </p>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nova solicitação</>}
          </Button>
        </div>

        {/* Formulário */}
        {showForm && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Nova solicitação</h3>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Assunto</label>
                <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Mensagem</label>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Descreva sua dúvida ou problema em detalhes..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <Button onClick={send} loading={sending} disabled={!form.message.trim()} className="w-full">
                Enviar solicitação
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Lista de tickets */}
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />)}</div>
        ) : tickets.length === 0 && !showForm ? (
          <Card>
            <CardContent className="p-10 text-center">
              <LifeBuoy size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma solicitação</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Clique em "Nova solicitação" para falar com nosso suporte</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => {
              const status = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open
              const StatusIcon = status.icon
              return (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon size={15} className={ticket.status === 'resolved' ? 'text-green-500' : ticket.status === 'in_progress' ? 'text-amber-500' : 'text-red-500'} />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ticket.subject}</span>
                      </div>
                      <Badge variant={status.color}>{status.label}</Badge>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{ticket.message}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{formatDate(ticket.created_at)}</p>

                    {ticket.admin_reply && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                          <MessageSquare size={10} /> Resposta do suporte · {ticket.replied_at ? formatDate(ticket.replied_at) : ''}
                        </p>
                        <p className="text-sm text-slate-700 dark:text-slate-200">{ticket.admin_reply}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
