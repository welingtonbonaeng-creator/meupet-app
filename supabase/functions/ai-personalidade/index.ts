import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pet, diario } = await req.json()
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const diarioTexto = diario && diario.length > 0
      ? diario.map((d: { type: string; title: string; description?: string }) => `- [${d.type}] ${d.title}: ${d.description || ''}`).join('\n')
      : 'Sem registros de diário disponíveis'

    const prompt = `Você é um comportamentalista animal. Analise a personalidade deste pet com base nos dados e histórico:

Nome: ${pet.name}
Espécie: ${pet.species}
Raça: ${pet.breed || 'Sem raça definida'}
Idade: ${pet.age_months ? Math.floor(pet.age_months / 12) + ' anos e ' + (pet.age_months % 12) + ' meses' : 'Não informada'}
Sexo: ${pet.sex === 'male' ? 'Macho' : 'Fêmea'}
Castrado(a): ${pet.neutered ? 'Sim' : 'Não'}
Observações do tutor: ${pet.notes || 'Nenhuma'}

Histórico do diário:
${diarioTexto}

Responda em JSON com a seguinte estrutura:
{
  "tipo_personalidade": "nome criativo do tipo (ex: O Explorador Curioso)",
  "descricao": "parágrafo descrevendo a personalidade em 3-4 frases",
  "tracos": [
    { "nome": "traço 1", "nivel": número de 1 a 5, "descricao": "explicação curta" },
    { "nome": "traço 2", "nivel": número de 1 a 5, "descricao": "explicação curta" },
    { "nome": "traço 3", "nivel": número de 1 a 5, "descricao": "explicação curta" },
    { "nome": "traço 4", "nivel": número de 1 a 5, "descricao": "explicação curta" }
  ],
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "desafios": ["desafio 1", "desafio 2"],
  "como_brincar": "como estimular mentalmente e fisicamente este pet",
  "tipo_tutor_ideal": "perfil do tutor que combina melhor com este pet",
  "curiosidade": "fato curioso sobre a personalidade desta raça/espécie"
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.8,
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
