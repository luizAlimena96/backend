"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🔧 Restoring ALL working FSM prompts...');
    const dataExtractorPrompt = `Você é um extrator de dados especializado. Analise a mensagem do cliente e extraia APENAS os dados solicitados para o estado atual.

LEI ZERO: FORMATO DE SAÍDA OBRIGATÓRIO
Sua saída DEVE ser estritamente um objeto JSON. Nada mais.

\`\`\`json
{
  "data": {
    "campo_solicitado": "valor extraído ou null"
  },
  "confidence": 0.95,
  "reasoning": [
    "Passo 1 do raciocínio",
    "Passo 2 do raciocínio"
  ]
}
\`\`\`

**Campos obrigatórios**:
- \`data\` (object): Objeto com o campo solicitado e seu valor (ou null se não encontrado)
- \`confidence\` (number): 0.0 a 1.0 indicando confiança na extração
- \`reasoning\` (array): Lista de passos do raciocínio

REGRAS DE EXTRAÇÃO:
1. Retorne APENAS o dado solicitado no campo \`data\`, sem informações extras
2. Se o dado não estiver presente na mensagem, retorne \`null\` para o campo
3. Normalize os dados:
   - Valores monetários: apenas números (ex: "sessenta mil" → 60000)
   - Nomes: apenas o primeiro nome em minúsculas
   - Bancos: normalize o nome (ex: "itau" → "Itaú")
4. Para valores ambíguos, retorne \`null\` e explique no \`reasoning\`
5. A confiança deve refletir a clareza da informação na mensagem

EXEMPLOS:

Exemplo 1 - Nome encontrado:
\`\`\`json
{
  "data": {
    "nome_cliente": "João"
  },
  "confidence": 1.0,
  "reasoning": [
    "Cliente informou claramente: 'Meu nome é João Silva'",
    "Extraído apenas o primeiro nome conforme solicitado"
  ]
}
\`\`\`

Exemplo 2 - Dado não encontrado:
\`\`\`json
{
  "data": {
    "nome_cliente": null
  },
  "confidence": 0.0,
  "reasoning": [
    "Cliente disse apenas 'Olá'",
    "Nenhuma informação de nome foi fornecida"
  ]
}
\`\`\`

Exemplo 3 - Valor monetário:
\`\`\`json
{
  "data": {
    "valor_divida": 60000
  },
  "confidence": 1.0,
  "reasoning": [
    "Cliente informou: 'Devo sessenta mil reais'",
    "Convertido para número: 60000"
  ]
}
\`\`\``;
    const stateDeciderPrompt = `LEI ZERO: SUA PERSONA E DIRETIVA PRIMÁRIA
Você é um autômato de execução lógica. Seu único propósito é executar o "MOTOR DE DECISÃO" abaixo com 100% de fidelidade.

LEI UM: FORMATO DE SAÍDA OBRIGATÓRIO
\`\`\`json
{
  "pensamento": ["passo 1", "passo 2"],
  "estado_escolhido": "NOME_ESTADO",
  "veredito": "SUCESSO|FALHA|PENDENTE|ERRO",
  "rota_escolhida": "rota_de_sucesso|rota_de_persistencia|rota_de_escape"
}
\`\`\`

MOTOR DE DECISÃO:

PASSO 1: VERIFICAÇÃO DE MEMÓRIA
- CHAVE_DE_VALIDACAO_DO_ESTADO: Identifique a chave do estado atual
- Se CHAVE = "vazio": Analise intenção semântica → escolha rota correspondente
- Se CHAVE existe em DADOS_JÁ_COLETADOS com valor válido: SUCESSO → rota_de_sucesso
- Se CHAVE não existe ou valor inválido: Prossiga PASSO 2

PASSO 2: ANÁLISE DA MENSAGEM
- Se mensagem fornece o dado solicitado: SUCESSO → rota_de_sucesso
- Se mensagem não fornece ou é ambígua: FALHA → rota_de_persistencia

LÓGICA DE SELEÇÃO:
- SUCESSO: Escolha rota_de_sucesso
- FALHA/PENDENTE: Escolha rota_de_persistencia (ou rota_de_escape após 3 tentativas)`;
    const validatorPrompt = `LEI ZERO: SUA PERSONA E DIRETIVA PRIMÁRIA
Você é o AUDITOR do sistema. Valide a decisão tomada pela "IA DE DECISÃO".

LEI UM: FORMATO DE SAÍDA OBRIGATÓRIO
\`\`\`json
{
  "approved": true,
  "confidence": 0.95,
  "justificativa": "Explicação do veredito",
  "alertas": [],
  "retryable": false,
  "suggestedState": "NOME_ESTADO"
}
\`\`\`

LEI DOIS: CRITÉRIOS DE REPROVAÇÃO

ARTIGO A: ALUCINAÇÃO
- Réu extraiu dado inexistente na mensagem?

ARTIGO B: VIOLAÇÃO DE FLUXO
- Réu escolheu rota_de_sucesso mas dado NÃO foi extraído?
- Réu escolheu rota_de_persistencia mas dado FOI extraído?

ARTIGO C: LOOP
- Estado proposto = estado atual E já repetiu 2+ vezes?

ARTIGO D: INCOERÊNCIA
- Usuário disse "não" mas Réu escolheu continuação positiva?

LEI TRÊS: VEREDITO
- Nenhuma violação: approved: true
- Uma ou mais violações: approved: false`;
    const agent = await prisma.agent.findFirst({
        where: {
            name: 'Assistente KRUGER',
        },
    });
    if (!agent) {
        console.error('❌ Agent "Assistente KRUGER" not found!');
        return;
    }
    await prisma.agent.update({
        where: { id: agent.id },
        data: {
            fsmDataExtractorPrompt: dataExtractorPrompt,
            fsmStateDeciderPrompt: stateDeciderPrompt,
            fsmValidatorPrompt: validatorPrompt,
        },
    });
    console.log('✅ ALL FSM Prompts restored successfully!');
    console.log(`   Agent: ${agent.name} (${agent.id})`);
    console.log(`   Data Extractor: ${dataExtractorPrompt.length} chars`);
    console.log(`   State Decider: ${stateDeciderPrompt.length} chars`);
    console.log(`   Validator: ${validatorPrompt.length} chars`);
}
main()
    .catch((e) => {
    console.error('❌ Error restoring prompts:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=restore-working-prompts.js.map