import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pet, stats, periodo_dias } = await req.json()
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const periodoLabel = periodo_dias === 0 ? 'todo o histórico'
      : periodo_dias === 30  ? 'últimos 30 dias'
      : periodo_dias === 90  ? 'últimos 3 meses'
      : 'últimos 6 meses'

    const weightStr = stats.pesos?.length > 0
      ? `${stats.pesos.length} registros. Mais recente: ${stats.pesos[stats.pesos.length-1].weight_kg}kg em ${stats.pesos[stats.pesos.length-1].measured_at}. ${
          stats.pesos.length >= 2
            ? `Variação: ${(stats.pesos[stats.pesos.length-1].weight_kg - stats.pesos[0].weight_kg).toFixed(1)}kg no período`
            : ''
        }`
      : 'Sem registros de peso'

    const expStr = stats.gastos_total > 0
      ? `Total: R$${stats.gastos_total.toFixed(2)}. Por categoria: ${stats.gastos_categoria.map((g: { category: string; total: number }) => `${g.category}=R$${g.total.toFixed(2)}`).join(', ')}`
      : 'Sem gastos registrados'

    const diarioStr = `${stats.total_registros} registros totais: ${stats.por_tipo.map((t: { tipo: string; count: number }) => `${t.tipo}(${t.count})`).join(', ')}. Último registro: ${stats.ultimo_registro ?? 'nunca'}`

    const proximosStr = stats.proximos_eventos?.length > 0
      ? stats.proximos_eventos.map((e: { title: string; type: string; date: string }) => `${e.type}: ${e.title} em ${e.date}`).join('; ')
      : 'Nenhum evento agendado'

    const pesoAtual    = stats.pesos?.length > 0 ? stats.pesos[stats.pesos.length-1].weight_kg : null
    const pesoIdeal    = pet.ideal_weight
    const statusPeso   = pesoAtual && pesoIdeal
      ? pesoAtual > pesoIdeal * 1.15 ? 'acima do peso (>15%)' : pesoAtual < pesoIdeal * 0.85 ? 'abaixo do peso (>15%)' : 'dentro do peso ideal'
      : 'sem dados de peso ideal'

    const prompt = `Você é um veterinário especialista em medicina preventiva e bem-estar animal. Analise o relatório de saúde deste pet e gere insights clínicos reais, úteis e acionáveis.

═══════════════════════════════
PERFIL DO PET
═══════════════════════════════
Nome:         ${pet.name}
Espécie:      ${pet.species === 'dog' ? 'Cão' : pet.species === 'cat' ? 'Gato' : pet.species}
Raça:         ${pet.breed || 'Sem raça definida'}
Idade:        ${pet.age_str || 'Não informada'}
Sexo:         ${pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Fêmea' : 'Não informado'}
Castrado(a):  ${pet.neutered ? 'Sim' : 'Não'}
Status peso:  ${statusPeso}
Notas:        ${pet.notes || 'Nenhuma'}

═══════════════════════════════
DADOS DO PERÍODO: ${periodoLabel.toUpperCase()}
═══════════════════════════════
Histórico de saúde: ${diarioStr}
Histórico de peso:  ${weightStr}
Gastos:             ${expStr}
Próximos eventos:   ${proximosStr}

═══════════════════════════════
INSTRUÇÕES DE ANÁLISE
═══════════════════════════════
1. "status" deve refletir a situação REAL: saudável = check-ups em dia, peso ideal, sem alertas; atenção = algo que merece monitoramento; cuidado = situação que exige ação.
2. "resumo" deve mencionar o período analisado e ser específico sobre os dados reais — não genérico.
3. "insights" devem ser observações clínicas baseadas nos dados (ex: "Apenas 1 consulta em 6 meses é abaixo do recomendado para a idade", "Peso subiu 2kg em 3 meses — atenção ao sedentarismo").
4. "recomendacoes" devem ser ações concretas e priorizadas (ex: "Agendar consulta de rotina — última foi há 8 meses").
5. "alerta" só se houver algo urgente (ex: vacina vencida, peso 20% acima do ideal, nenhum registro há 6 meses). Null se não houver.
6. Se não há dados suficientes no período, informe isso claramente no resumo.

Responda SOMENTE com JSON válido:
{
  "status": "saudável | atenção | cuidado",
  "status_emoji": "✅ | ⚠️ | 🚨",
  "resumo": "2-3 frases específicas sobre a saúde deste pet no período analisado",
  "insights": [
    "observação clínica concreta baseada nos dados 1",
    "observação clínica concreta 2",
    "observação clínica concreta 3"
  ],
  "recomendacoes": [
    "ação concreta e priorizada 1",
    "ação concreta 2"
  ],
  "alerta": "mensagem de alerta urgente se houver, ou null"
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    const data    = await res.json()
    const content = JSON.parse(data.choices[0].message.content)

    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
