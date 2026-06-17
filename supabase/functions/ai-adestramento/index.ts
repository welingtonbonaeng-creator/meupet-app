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

    const prompt = `Você é um adestrador profissional. Crie um plano de adestramento PRÁTICO e DETALHADO para:

Nome: ${pet.name}
Espécie: ${pet.species}
Raça: ${pet.breed || 'Sem raça definida'}
Idade: ${pet.age_months ? Math.floor(pet.age_months / 12) + ' anos e ' + (pet.age_months % 12) + ' meses' : 'Não informada'}
Castrado(a): ${pet.neutered ? 'Sim' : 'Não'}
Problemas de comportamento: ${problemas || 'Nenhum específico'}

IMPORTANTE: Para cada exercício, explique EXATAMENTE como executar — passo a passo, com o que dizer, como usar o petisco, quanto tempo durar. O tutor deve conseguir fazer o exercício sozinho sem saber nada de adestramento.

Responda SOMENTE em JSON com esta estrutura:
{
  "diagnostico": "análise em 2 frases do comportamento atual",
  "nivel": "iniciante",
  "semanas": [
    {
      "semana": 1,
      "foco": "tema da semana",
      "duracao_min": 10,
      "sessoes_semana": 3,
      "exercicios": [
        {
          "nome": "nome do exercício",
          "objetivo": "o que o pet vai aprender",
          "passos": [
            "Passo 1: descrição detalhada do que fazer",
            "Passo 2: descrição detalhada",
            "Passo 3: descrição detalhada"
          ],
          "dica": "dica importante ou erro comum a evitar",
          "sinal_sucesso": "como saber que o pet aprendeu"
        }
      ]
    }
  ],
  "comandos_basicos": ["sentar", "deitar", "fico", "vem", "não"],
  "dicas_reforco": ["dica 1 sobre reforço positivo", "dica 2", "dica 3"],
  "erros_comuns": ["erro 1 com explicação", "erro 2 com explicação"],
  "tempo_estimado_semanas": 8
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
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
