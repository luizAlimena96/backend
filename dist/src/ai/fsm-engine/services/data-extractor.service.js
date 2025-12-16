"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExtractorService = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("../../services/openai.service");
let DataExtractorService = class DataExtractorService {
    openaiService;
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async extractDataFromMessage(input, apiKey, model = 'gpt-4o-mini', customPrompt) {
        const startTime = Date.now();
        try {
            if (!input.dataKey || input.dataKey === 'vazio') {
                return {
                    success: true,
                    data: {},
                    confidence: 1.0,
                    metadata: {
                        extractedAt: new Date(),
                        dataKey: input.dataKey,
                        dataType: input.dataType,
                        extractedFields: [],
                    },
                    reasoning: ['Nenhum dado específico para extrair neste estado.'],
                };
            }
            const prompt = this.buildDataExtractorPrompt(input, customPrompt);
            const response = await this.openaiService.createChatCompletion(apiKey, model, [
                {
                    role: 'system',
                    content: 'Você é um extrator de dados especializado. Retorne APENAS JSON válido, sem markdown ou texto adicional.',
                },
                { role: 'user', content: prompt },
            ], { temperature: 0.1, responseFormat: { type: 'json_object' } });
            if (!response) {
                throw new Error('IA não retornou resposta');
            }
            let parsed;
            try {
                parsed = JSON.parse(response);
            }
            catch (parseError) {
                console.error('[Data Extractor] JSON parse error:', parseError);
                console.error('[Data Extractor] Malformed JSON:', response.substring(0, 500));
                throw new Error('JSON mal formatado retornado pela IA');
            }
            console.log('[Data Extractor] AI returned:', JSON.stringify(parsed, null, 2));
            let extractedData;
            let confidence;
            let reasoning;
            if (parsed.data !== undefined) {
                extractedData = parsed.data || {};
                confidence = parsed.confidence || 0.8;
                reasoning = Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.reasoning || 'Dados extraídos'];
            }
            else {
                extractedData = {};
                for (const [key, value] of Object.entries(parsed)) {
                    if (key !== 'confidence' && key !== 'reasoning') {
                        extractedData[key] = value;
                    }
                }
                confidence = parsed.confidence || 0.8;
                reasoning = Array.isArray(parsed.reasoning) ? parsed.reasoning : ['Dados extraídos diretamente'];
            }
            const mergedData = {
                ...input.currentExtractedData,
                ...extractedData,
            };
            const result = {
                success: true,
                data: mergedData,
                confidence,
                metadata: {
                    extractedAt: new Date(),
                    dataKey: input.dataKey,
                    dataType: input.dataType,
                    extractedFields: Object.keys(extractedData),
                },
                reasoning,
            };
            console.log(`[Data Extractor] Completed in ${Date.now() - startTime}ms`, {
                dataKey: input.dataKey,
                confidence: result.confidence,
                extractedFields: result.metadata.extractedFields,
            });
            return result;
        }
        catch (error) {
            console.error('[Data Extractor] Error:', error);
            return {
                success: false,
                data: input.currentExtractedData,
                confidence: 0.0,
                metadata: {
                    extractedAt: new Date(),
                    dataKey: input.dataKey,
                    dataType: input.dataType,
                    extractedFields: [],
                },
                reasoning: ['Erro ao extrair dados', error instanceof Error ? error.message : 'Erro desconhecido'],
            };
        }
    }
    async extractAllDataFromMessage(input, apiKey, model = 'gpt-4o-mini', customPrompt) {
        try {
            if (!input.allDataKeys || input.allDataKeys.length === 0) {
                return {
                    success: true,
                    extractedData: {},
                    confidence: {},
                    metadata: {
                        extractedAt: new Date(),
                        totalDataKeys: 0,
                        extractedCount: 0,
                        extractedFields: [],
                    },
                    reasoning: ['Nenhum dataKey disponível para extração.'],
                };
            }
            const dataKeysDescription = input.allDataKeys
                .map(dk => `- **${dk.key}**: ${dk.description} (tipo: ${dk.type})`)
                .join('\n');
            const prompt = `Você é um extrator de dados especializado. Analise a mensagem e extraia TODOS os dados possíveis.
            
DIRETRIZ SUPREMA (LEI ZERO):
NÃO EXTRAIA SAUDAÇÕES COMO DADOS.
Se a mensagem for apenas "Olá", "Oi", "Eai", "Tudo bem", "Bom dia", ou variações, RETORNE UM JSON VAZIO em 'extractedData'.
NUNCA invente um nome baseando-se em uma saudação (ex: "Eai" NÃO É UM NOME).

DADOS DISPONÍVEIS PARA EXTRAÇÃO:
${dataKeysDescription}

DADOS JÁ COLETADOS:
${JSON.stringify(input.currentExtractedData, null, 2)}

MENSAGEM DO USUÁRIO:
"${input.message}"

REGRAS:
1. LEI ZERO: Ignore saudações. "Eai" não é nome. "Oi" não é nome.
2. Tente extrair TODOS os dados que encontrar na mensagem (exceto saudações)
3. Se um dado não estiver presente, não o inclua no resultado
4. Normalize os valores conforme o tipo esperado
5. Retorne apenas os dados que você tem ALTA confiança (>0.7)
6. NÃO extraia dados que já existem em DADOS JÁ COLETADOS com valores válidos

FORMATO DE SAÍDA (JSON):
{
  "extractedData": {
    "nome_cliente": "João"
  },
  "confidence": {
    "nome_cliente": 1.0
  },
  "reasoning": [
    "Cliente mencionou nome: João"
  ]
}`;
            const response = await this.openaiService.createChatCompletion(apiKey, model, [
                {
                    role: 'system',
                    content: 'Você é um extrator de dados especializado. Retorne APENAS JSON válido.',
                },
                { role: 'user', content: prompt },
            ], { temperature: 0.1, responseFormat: { type: 'json_object' } });
            const parsed = JSON.parse(response);
            const extractedData = parsed.extractedData || {};
            const confidence = parsed.confidence || {};
            const reasoning = parsed.reasoning || [];
            const filteredData = {};
            const filteredConfidence = {};
            for (const [key, value] of Object.entries(extractedData)) {
                const conf = confidence[key] || 0;
                if (conf >= 0.7) {
                    filteredData[key] = value;
                    filteredConfidence[key] = conf;
                }
            }
            return {
                success: true,
                extractedData: filteredData,
                confidence: filteredConfidence,
                metadata: {
                    extractedAt: new Date(),
                    totalDataKeys: input.allDataKeys.length,
                    extractedCount: Object.keys(filteredData).length,
                    extractedFields: Object.keys(filteredData),
                },
                reasoning,
            };
        }
        catch (error) {
            console.error('[Global Data Extractor] Error:', error);
            return {
                success: false,
                extractedData: {},
                confidence: {},
                metadata: {
                    extractedAt: new Date(),
                    totalDataKeys: input.allDataKeys.length,
                    extractedCount: 0,
                    extractedFields: [],
                },
                reasoning: [`Erro na extração: ${error.message}`],
            };
        }
    }
    buildDataExtractorPrompt(input, customPrompt) {
        if (!customPrompt) {
            throw new Error('Data Extractor prompt not configured for this agent. Please configure fsmDataExtractorPrompt in agent settings.');
        }
        if (!input.dataKey || input.dataKey === 'vazio') {
            return customPrompt || `Você é um extrator de dados. O estado atual não requer extração (dataKey: "${input.dataKey || 'vazio'}"). Retorne JSON vazio.`;
        }
        const conversationText = input.conversationHistory
            .map(msg => `${msg.role === 'user' ? 'Cliente' : 'Atendente'}: ${msg.content}`)
            .join('\n');
        return `${customPrompt}

# DIRETRIZ SUPREMA (LEI ZERO) - INTELIGÊNCIA SEMÂNTICA
Você deve usar RACIOCÍNIO CONTEXTUAL para determinar se algo é um dado real ou não.

## REGRAS DE EXTRAÇÃO DE NOMES:
Um nome APENAS é válido se houver EVIDÊNCIA LINGUÍSTICA CLARA:

VÁLIDO (extrair):
- "Meu nome é João"
- "Me chamo Maria"
- "Sou o Pedro"
- "Pode me chamar de Ana"
- "Eu sou Carlos"
- "Meu nome: Rafael"

INVÁLIDO (NÃO extrair):
- Saudações isoladas: "Oi", "Olá", "Eai", "E aí", "Beleza", "Bom dia"
- Palavras aleatórias sem contexto: "Arvore", "Casa", "Carro", "Azul"
- Perguntas: "Como vai?", "Tudo bem?"
- Respostas genéricas: "Sim", "Não", "Talvez"
- Qualquer palavra SEM um verbo/frase que indique identidade

## PRINCÍPIO FUNDAMENTAL:
Se a mensagem NÃO contém uma estrutura linguística que EXPLICITAMENTE identifique algo como um dado pessoal, retorne JSON VAZIO.

Pergunte-se: "O cliente está DECLARANDO uma informação sobre si mesmo ou apenas conversando?"
- "Eai" → Apenas conversando → JSON VAZIO
- "Meu nome é Eai" → Declarando nome → Extrair "Eai"

## CONFIANÇA MÍNIMA:
- Apenas extraia dados com confiança ≥ 0.8
- Se houver QUALQUER dúvida, retorne JSON vazio

# CONTEXTO DO AGENTE

**Nome do Agente**: ${input.agentContext?.name || 'N/A'}
${input.agentContext?.personality ? `**Personalidade**: ${input.agentContext.personality}` : ''}
${input.agentContext?.tone ? `**Tom de Voz**: ${input.agentContext.tone}` : ''}
${input.agentContext?.systemPrompt ? `**System Prompt**: ${input.agentContext.systemPrompt}` : ''}
${input.agentContext?.instructions ? `**Instruções Específicas**: ${input.agentContext.instructions}` : ''}
${input.agentContext?.writingStyle ? `**Estilo de Escrita**: ${input.agentContext.writingStyle}` : ''}
${input.agentContext?.prohibitions ? `**PROIBIÇÕES GLOBAIS DO AGENTE**: ${input.agentContext.prohibitions}` : ''}

# CONTEXTO DINÂMICO DA EXECUÇÃO

## CAMPO A EXTRAIR
- **Chave**: ${input.dataKey}
- **Tipo Esperado**: ${input.dataType}
- **Descrição**: ${input.dataDescription}

## DADOS JÁ COLETADOS
\`\`\`json
${JSON.stringify(input.currentExtractedData, null, 2)}
\`\`\`

## <conversa>
${conversationText}
## <conversa/>

## MENSAGEM MAIS RECENTE
"${input.message}"

## CHECKLIST DE VALIDAÇÃO ANTES DE EXTRAIR:
1. ✓ A mensagem contém uma DECLARAÇÃO explícita? (ex: "meu nome é", "me chamo", "sou")
2. ✓ O dado faz sentido no contexto? (não é saudação, não é palavra aleatória)
3. ✓ Tenho confiança ≥ 0.8 de que isso é um dado real?
4. ✓ O cliente está FORNECENDO informação, não apenas conversando?

Se QUALQUER resposta for NÃO → Retorne JSON VAZIO.
`;
    }
};
exports.DataExtractorService = DataExtractorService;
exports.DataExtractorService = DataExtractorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService])
], DataExtractorService);
//# sourceMappingURL=data-extractor.service.js.map