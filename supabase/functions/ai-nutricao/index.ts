import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ATIVIDADE_LABEL: Record<string, string> = {
  sedentario:  'Sedentário (dorme muito, quase não se exercita)',
  moderado:    'Moderado (passeios diários, brincadeiras ocasionais)',
  ativo:       'Ativo (exercício diário intenso)',
  muito_ativo: 'Muito ativo (esporte, trabalho, agility)',
}

const DIETA_LABEL: Record<string, string> = {
  racao_seca:  'Ração seca (kibble)',
  racao_umida: 'Ração úmida (lata / sachê)',
  natural:     'Alimentação natural (BARF / caseira)',
  misto:       'Misto (ração + natural)',
  nao_sei:     'Sem padrão definido',
}

const CONDICAO_LABEL: Record<string, string> = {
  sobrepeso:     'Sobrepeso / obesidade',
  abaixo_peso:   'Abaixo do peso ideal',
  diabetes:      'Diabetes mellitus',
  doenca_renal:  'Doença renal crônica (IRC)',
  alergia:       'Alergia ou intolerância alimentar',
  artrite:       'Artrite / problemas articulares',
  cardiopatia:   'Cardiopatia',
  hepatica:      'Doença hepática',
  gestante:      'Gestante ou lactante',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pet, extras } = await req.json()
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const ageStr = pet.age_months != null
      ? `${Math.floor(pet.age_months / 12)} anos e ${pet.age_months % 12} meses`
      : 'Não informada'

    const condicoes = (extras?.condicoes_saude ?? [])
      .map((c: string) => CONDICAO_LABEL[c] ?? c)

    const prompt = `Você é um veterinário nutricionista com 20 anos de experiência. Crie um plano de nutrição clínico, preciso e personalizado para o seguinte pet, levando em conta TODOS os dados fornecidos:

═══════════════════════════════
PERFIL DO PET
═══════════════════════════════
Nome:            ${pet.name}
Espécie:         ${pet.species === 'dog' ? 'Cão' : pet.species === 'cat' ? 'Gato' : pet.species}
Raça:            ${pet.breed || 'Sem raça definida'}
Idade:           ${ageStr}
Peso atual:      ${pet.weight_kg ? pet.weight_kg + ' kg' : 'Não informado'}
Peso ideal:      ${pet.ideal_weight ? pet.ideal_weight + ' kg' : 'Não informado'}
Castrado(a):     ${pet.neutered ? 'Sim' : 'Não'}
Observações:     ${pet.notes || 'Nenhuma'}

═══════════════════════════════
ESTILO DE VIDA
═══════════════════════════════
Nível de atividade: ${ATIVIDADE_LABEL[extras?.nivel_atividade ?? 'moderado'] ?? extras?.nivel_atividade}
Dieta atual:        ${DIETA_LABEL[extras?.tipo_dieta_atual ?? 'racao_seca'] ?? extras?.tipo_dieta_atual}

═══════════════════════════════
CONDIÇÕES DE SAÚDE
═══════════════════════════════
${condicoes.length > 0 ? condicoes.map((c: string) => `• ${c}`).join('\n') : '• Nenhuma condição especial informada'}

═══════════════════════════════
INSTRUÇÕES CLÍNICAS
═══════════════════════════════
1. Calcule as calorias diárias usando o método RER × fator de vida (neutered, atividade, condições).
2. Ajuste raça: raças gigantes têm metabolismo diferente de raças miniaturas.
3. Considere restrições específicas de cada condição de saúde informada (ex: IRC = baixo fósforo e proteína controlada; diabetes = baixo IG; cardiopatia = baixo sódio).
4. Indique a porção por refeição em gramas, baseada nas calorias diárias e frequência.
5. Alimentos proibidos devem ser específicos e relevantes para a espécie e condições.
6. Dicas devem ser práticas e baseadas na dieta atual informada.
7. Suplementos apenas se clinicamente relevantes para este perfil.

Responda SOMENTE com JSON válido, sem texto adicional, com esta estrutura:
{
  "resumo": "1-2 frases explicando a situação nutricional atual e o objetivo do plano",
  "calorias_dia": número (kcal/dia, inteiro),
  "refeicoes_dia": número (integer, 1-4),
  "porcao_g": número (gramas por refeição, inteiro) ou null se não aplicável,
  "alimentos_recomendados": ["alimento 1", "alimento 2", "alimento 3", "alimento 4", "alimento 5", "alimento 6"],
  "alimentos_proibidos": ["alimento 1", "alimento 2", "alimento 3", "alimento 4"],
  "dicas": ["dica prática 1", "dica prática 2", "dica prática 3", "dica prática 4"],
  "suplementos": ["suplemento + motivo"] ou [],
  "alerta": "alerta clínico importante se houver (ex: peso 40% acima do ideal — risco cardiovascular) ou null"
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.3,
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
