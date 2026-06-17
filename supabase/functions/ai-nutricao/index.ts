import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pet } = await req.json()
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const prompt = `Você é um veterinário nutricionista especialista. Crie um plano de nutrição detalhado para o seguinte pet:

Nome: ${pet.name}
Espécie: ${pet.species}
Raça: ${pet.breed || 'Sem raça definida'}
Idade: ${pet.age_months ? Math.floor(pet.age_months / 12) + ' anos e ' + (pet.age_months % 12) + ' meses' : 'Não informada'}
Peso atual: ${pet.weight_kg ? pet.weight_kg + ' kg' : 'Não informado'}
Peso ideal: ${pet.ideal_weight ? pet.ideal_weight + ' kg' : 'Não informado'}
Castrado(a): ${pet.neutered ? 'Sim' : 'Não'}
Observações: ${pet.notes || 'Nenhuma'}

Responda em JSON com a seguinte estrutura:
{
  "resumo": "parágrafo curto sobre a situação nutricional do pet",
  "calorias_dia": número estimado de kcal/dia,
  "refeicoes_dia": número de refeições recomendadas,
  "alimentos_recomendados": ["alimento 1", "alimento 2", "alimento 3", "alimento 4", "alimento 5"],
  "alimentos_proibidos": ["alimento 1", "alimento 2", "alimento 3"],
  "dicas": ["dica 1", "dica 2", "dica 3"],
  "suplementos": ["suplemento 1"] ou [],
  "alerta": "mensagem de alerta se houver (ex: sobrepeso) ou null"
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
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
