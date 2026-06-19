import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const NIVEL_TUTOR: Record<string, string> = {
  iniciante:     'Iniciante absoluto — nunca treinou um animal',
  intermediario: 'Intermediário — já tentou algumas técnicas básicas',
  experiente:    'Experiente — tem familiaridade com treinos e comportamento animal',
}

const AMBIENTE: Record<string, string> = {
  apartamento_pequeno: 'Apartamento pequeno (área restrita, sem espaço externo)',
  apartamento_grande:  'Apartamento grande',
  casa_quintal:        'Casa com quintal (espaço externo disponível)',
  area_rural:          'Área rural / fazenda (muito espaço, possível contato com outros animais)',
}

const RECOMPENSA: Record<string, string> = {
  petisco:   'Petiscos / alimento',
  brinquedo: 'Brinquedo / brincadeira',
  elogio:    'Elogio verbal e afeto',
  misto:     'Combinação de petisco + elogio',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pet, problemas, extras } = await req.json()
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const ageStr = pet.age_months != null
      ? `${Math.floor(pet.age_months / 12)} anos e ${pet.age_months % 12} meses`
      : 'Não informada'

    const species     = pet.species === 'dog' ? 'Cão' : pet.species === 'cat' ? 'Gato' : pet.species
    const isCat       = pet.species === 'cat'
    const problemaStr = problemas?.length > 0 ? problemas.join(', ') : 'Sem comportamentos problemáticos específicos — treino geral'
    const dispMin     = extras?.disponibilidade ?? '10'
    const recompensaLabel = RECOMPENSA[extras?.recompensa ?? 'petisco'] ?? extras?.recompensa

    const catContext = isCat ? `
ATENÇÃO — TREINO FELINO:
Gatos não respondem ao modelo de obediência canina. Use:
• Condicionamento clicker / marcador verbal ("sim!")
• Sessões MUITO curtas (2-5 min) — gatos perdem interesse rápido
• Reforço positivo exclusivo — NUNCA punição
• Trabalhe comportamentos naturais (arranhador, caixa de areia, agility simples)
• "Comportamentos-alvo" para gatos = hábitos e redução de comportamentos indesejados
` : ''

    const prompt = `Você é um especialista em comportamento animal com 15 anos de experiência, certificado em treinamento baseado em ciência do comportamento. Crie um plano de treino PRÁTICO, DETALHADO e EXECUTÁVEL para o seguinte pet:

═══════════════════════════════
PERFIL DO PET
═══════════════════════════════
Nome:        ${pet.name}
Espécie:     ${species}
Raça:        ${pet.breed || 'Sem raça definida'}
Idade:       ${ageStr}
Castrado(a): ${pet.neutered ? 'Sim' : 'Não'}
Observações: ${pet.notes || 'Nenhuma'}

═══════════════════════════════
PERFIL DO TUTOR E AMBIENTE
═══════════════════════════════
Experiência do tutor:  ${NIVEL_TUTOR[extras?.nivel_tutor ?? 'iniciante'] ?? extras?.nivel_tutor}
Ambiente:              ${AMBIENTE[extras?.ambiente ?? 'apartamento_pequeno'] ?? extras?.ambiente}
Disponibilidade diária: ${dispMin} minutos por dia
Recompensa preferida:  ${recompensaLabel}

═══════════════════════════════
COMPORTAMENTOS A TRABALHAR
═══════════════════════════════
${problemaStr}
${catContext}
═══════════════════════════════
INSTRUÇÕES PARA O PLANO
═══════════════════════════════
1. Adapte a duração das sessões ao tempo disponível (${dispMin} min/dia).
2. Adapte os exercícios ao ambiente informado (${AMBIENTE[extras?.ambiente ?? 'apartamento_pequeno'] ?? extras?.ambiente}).
3. Use a recompensa informada (${recompensaLabel}) nos passos detalhados.
4. Para tutores iniciantes: use linguagem simples, explique CADA gesto e posição do corpo.
5. Para tutores experientes: inclua variações e progressões dos exercícios.
6. Cada exercício deve ter material necessário listado (petisco, brinquedo, coleira, etc.).
7. Passos devem ser EXECUTÁVEIS — diga exatamente o que fazer, o que falar, como segurar o petisco.
8. Não use termos técnicos sem explicação.
9. Respeite a faixa etária: filhotes têm atenção curta; idosos têm limitações físicas.
10. Priorize os comportamentos problemáticos informados nas primeiras semanas.

Responda SOMENTE com JSON válido, sem texto adicional:
{
  "diagnostico": "2 frases: análise do perfil atual + o que o plano vai alcançar",
  "nivel": "iniciante | intermediário | avançado",
  "semanas": [
    {
      "semana": 1,
      "foco": "tema central da semana",
      "duracao_min": ${Math.min(parseInt(dispMin), 15)},
      "sessoes_semana": 4,
      "exercicios": [
        {
          "nome": "nome claro do exercício",
          "objetivo": "o que o pet aprenderá com este exercício",
          "material": "o que o tutor precisa ter em mãos (ex: 5 petiscos pequenos, coleira)",
          "passos": [
            "descrição detalhada do passo 1 — o que fazer, o que falar, como segurar o petisco",
            "descrição detalhada do passo 2",
            "descrição detalhada do passo 3",
            "descrição detalhada do passo 4"
          ],
          "dica": "dica prática baseada na recompensa escolhida ou erro comum específico",
          "sinal_sucesso": "comportamento concreto que indica que o pet aprendeu"
        }
      ]
    }
  ],
  "comportamentos_alvo": ["objetivo 1", "objetivo 2", "objetivo 3", "objetivo 4", "objetivo 5"],
  "dicas_reforco": ["dica de reforço positivo 1", "dica 2", "dica 3", "dica 4"],
  "erros_comuns": ["erro comum 1 com explicação do porquê é problema", "erro 2", "erro 3"],
  "tempo_estimado_semanas": 6
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3500,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await res.json()
    const content = JSON.parse(data.choices[0].message.content)

    // Normaliza: suporta 'comandos_basicos' legado e novo 'comportamentos_alvo'
    if (!content.comportamentos_alvo && content.comandos_basicos) {
      content.comportamentos_alvo = content.comandos_basicos
    }

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
