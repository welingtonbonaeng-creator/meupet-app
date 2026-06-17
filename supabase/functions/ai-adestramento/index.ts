import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pet, problemas } = await req.json()
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const prompt = `Você é um adestrador profissional de animais. Crie um plano de adestramento para:

Nome: ${pet.name}
Espécie: ${pet.species}
Raça: ${pet.breed || 'Sem raça definida'}
Idade: ${pet.age_months ? Math.floor(pet.age_months / 12) + ' anos e ' + (pet.age_months % 12) + ' meses' : 'Não informada'}
Castrado(a): ${pet.neutered ? 'Sim' : 'Não'}
Problemas de comportamento reportados: ${problemas || 'Nenhum especificado'}
Observações: ${pet.notes || 'Nenhuma'}

Responda em JSON com a seguinte estrutura:
{
  "diagnostico": "análise do comportamento atual em 2 frases",
  "nivel": "iniciante | intermediário | avançado",
  "semanas": [
    {
      "semana": 1,
      "foco": "tema da semana",
      "exercicios": ["exercício 1", "exercício 2", "exercício 3"],
      "duracao_min": número de minutos por sessão,
      "sessoes_semana": número de sessões
    }
  ],
  "comandos_basicos": ["sentar", "deitar", "fico", "vem", "não"],
  "dicas_reforco": ["dica 1", "dica 2", "dica 3"],
  "erros_comuns": ["erro 1", "erro 2"],
  "tempo_estimado_semanas": número total de semanas para resultado
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await res.json()
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
