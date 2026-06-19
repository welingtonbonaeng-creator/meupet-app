import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COM_ESTRANHOS: Record<string, string> = {
  amigavel:    'Amigável e animado com qualquer pessoa nova',
  cauteloso:   'Curioso mas cauteloso, precisa de tempo para confiar',
  assustado:   'Assustado, se esconde ou foge de estranhos',
  agressivo:   'Late, bufa ou fica na defensiva com estranhos',
  indiferente: 'Indiferente, simplesmente ignora estranhos',
}

const SOZINHO: Record<string, string> = {
  tranquilo:  'Fica bem tranquilo quando sozinho',
  ansioso:    'Demonstra ansiedade quando fica sozinho',
  destrutivo: 'Destrói objetos quando fica sozinho',
  vocaliza:   'Late ou mia muito quando fica sozinho',
  variavel:   'Comportamento variável dependendo do dia',
}

const ENERGIA: Record<string, string> = {
  muito_calmo: 'Muito calmo, ama dormir e descansar',
  moderado:    'Nível moderado, equilibrado entre repouso e atividade',
  agitado:     'Agitado, está sempre em movimento',
  explosivo:   'Explosivo, tem energia praticamente sem fim',
}

const COM_ANIMAIS: Record<string, string> = {
  adora:      'Adora socializar com outros animais',
  tolera:     'Tolera outros animais mas prefere ficar sozinho',
  evita:      'Evita contato com outros animais',
  agressivo:  'Fica agressivo com outros animais',
  sem_contato: 'Nunca teve contato com outros animais',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { pet, comportamento, diario } = await req.json()
    const groqKey = Deno.env.get('GROQ_API_KEY')

    const ageStr = pet.age_months != null
      ? `${Math.floor(pet.age_months / 12)} anos e ${pet.age_months % 12} meses`
      : 'Não informada'

    const species = pet.species === 'dog' ? 'Cão' : pet.species === 'cat' ? 'Gato' : pet.species

    // Resumo do diário (contagem por tipo + recentes)
    const diarioItems = diario ?? []
    const tipoCount: Record<string, number> = {}
    diarioItems.forEach((d: { type: string }) => { tipoCount[d.type] = (tipoCount[d.type] || 0) + 1 })
    const diarioResumo = diarioItems.length > 0
      ? `${diarioItems.length} registros. Tipos: ${Object.entries(tipoCount).map(([k,v]) => `${k}(${v})`).join(', ')}. Recentes: ${diarioItems.slice(0,5).map((d: { type: string; title: string }) => `${d.type}: ${d.title}`).join(' | ')}`
      : 'Sem histórico de registros'

    // Comportamento observado pelo tutor
    const comp = comportamento ?? {}
    const comportamentoTexto = [
      comp.com_estranhos && `Com estranhos: ${COM_ESTRANHOS[comp.com_estranhos] ?? comp.com_estranhos}`,
      comp.sozinho       && `Quando sozinho: ${SOZINHO[comp.sozinho] ?? comp.sozinho}`,
      comp.energia       && `Nível de energia: ${ENERGIA[comp.energia] ?? comp.energia}`,
      comp.com_animais   && `Com outros animais: ${COM_ANIMAIS[comp.com_animais] ?? comp.com_animais}`,
    ].filter(Boolean).join('\n') || 'Tutor não respondeu o questionário comportamental'

    const pesoInfo = pet.weight_kg && pet.ideal_weight
      ? `Peso atual ${pet.weight_kg}kg (ideal: ${pet.ideal_weight}kg) — ${pet.weight_kg > pet.ideal_weight * 1.1 ? 'acima do peso' : pet.weight_kg < pet.ideal_weight * 0.9 ? 'abaixo do peso' : 'peso ideal'}`
      : pet.weight_kg ? `Peso: ${pet.weight_kg}kg` : 'Peso não informado'

    const prompt = `Você é um comportamentalista animal especializado em psicologia de pets, com expertise em etologia, vínculo humano-animal e bem-estar emocional. Faça uma análise profunda e PERSONALIZADA da personalidade deste pet.

═══════════════════════════════
PERFIL DO PET
═══════════════════════════════
Nome:        ${pet.name}
Espécie:     ${species}
Raça:        ${pet.breed || 'Sem raça definida'}
Idade:       ${ageStr}
Sexo:        ${pet.sex === 'male' ? 'Macho' : pet.sex === 'female' ? 'Fêmea' : 'Não informado'}
Castrado(a): ${pet.neutered ? 'Sim' : 'Não'}
${pesoInfo}
Observações do tutor: ${pet.notes || 'Nenhuma'}

═══════════════════════════════
COMPORTAMENTO OBSERVADO PELO TUTOR
═══════════════════════════════
${comportamentoTexto}

═══════════════════════════════
HISTÓRICO DE SAÚDE E CUIDADOS
═══════════════════════════════
${diarioResumo}

═══════════════════════════════
INSTRUÇÕES
═══════════════════════════════
1. Priorize os dados comportamentais do tutor acima do perfil de raça — este pet específico importa mais que a média da raça.
2. Se o tutor não respondeu ao questionário, baseie-se na raça, espécie, idade e observações.
3. "tipo_personalidade" deve ser um arquétipo criativo e memorável (ex: "O Guardião Gentil", "A Alma Livre", "O Filósofo Sonolento").
4. "emoji_personalidade" deve ser UM emoji que capture a essência do tipo (não necessariamente o animal).
5. Os traços devem refletir o comportamento REAL observado — não sejam genéricos de raça.
6. "linguagem_amor" descreve COMO este pet dá e recebe afeto (baseado no comportamento).
7. "rotina_ideal" descreve o dia perfeito para este pet (manhã/tarde/noite), adaptado ao nível de energia.
8. "gatilhos" são situações específicas que estressam ESTE pet (baseado no comportamento reportado).
9. "curiosidade" deve ser um fato surpreendente sobre a psicologia desta raça/espécie específica.

Responda SOMENTE com JSON válido:
{
  "tipo_personalidade": "arquétipo criativo (ex: O Explorador Impetuoso)",
  "emoji_personalidade": "🦊",
  "descricao": "3-4 frases descrevendo a personalidade única deste pet específico, mencionando os comportamentos observados",
  "tracos": [
    { "nome": "traço 1", "nivel": 4, "descricao": "explicação baseada no comportamento real observado" },
    { "nome": "traço 2", "nivel": 2, "descricao": "explicação baseada no comportamento real observado" },
    { "nome": "traço 3", "nivel": 5, "descricao": "explicação baseada no comportamento real observado" },
    { "nome": "traço 4", "nivel": 3, "descricao": "explicação baseada no comportamento real observado" },
    { "nome": "traço 5", "nivel": 1, "descricao": "explicação baseada no comportamento real observado" }
  ],
  "pontos_fortes": ["ponto forte concreto 1", "ponto forte 2", "ponto forte 3", "ponto forte 4"],
  "desafios": ["desafio específico baseado no comportamento 1", "desafio 2", "desafio 3"],
  "linguagem_amor": "como este pet específico dá e recebe afeto — seja concreto (ex: prefere ficar encostado ao dono a ser abraçado, demonstra amor trazendo brinquedos)",
  "como_brincar": "como estimular mentalmente e fisicamente este pet considerando seu nível de energia e perfil",
  "rotina_ideal": "descrição do dia perfeito para este pet: manhã, tarde e noite — adaptado ao nível de energia e necessidades",
  "gatilhos": ["situação estressante 1", "situação estressante 2", "situação estressante 3"],
  "tipo_tutor_ideal": "perfil do tutor ideal para este pet — seja específico sobre estilo de vida e personalidade compatível",
  "curiosidade": "fato surpreendente e específico sobre a psicologia desta raça ou espécie que o tutor provavelmente não sabe"
}`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1800,
        temperature: 0.5,
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
