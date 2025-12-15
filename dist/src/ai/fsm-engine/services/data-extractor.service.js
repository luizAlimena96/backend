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

DADOS DISPONÍVEIS PARA EXTRAÇÃO:
${dataKeysDescription}

DADOS JÁ COLETADOS:
${JSON.stringify(input.currentExtractedData, null, 2)}

MENSAGEM DO USUÁRIO:
"${input.message}"

REGRAS:
1. Tente extrair TODOS os dados que encontrar na mensagem
2. Se um dado não estiver presente, não o inclua no resultado
3. Normalize os valores conforme o tipo esperado
4. Retorne apenas os dados que você tem ALTA confiança (>0.7)
5. NÃO extraia dados que já existem em DADOS JÁ COLETADOS com valores válidos

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
- **Tipo Esperado**: ${input.dataType || 'string'}
- **Descrição**: ${input.dataDescription || 'Não especificada'}

## DADOS JÁ COLETADOS
\`\`\`json
${JSON.stringify(input.currentExtractedData, null, 2)}
\`\`\`

## <conversa>
${conversationText}
## <conversa/>

## MENSAGEM MAIS RECENTE
"${input.message}"
`;
    }
};
exports.DataExtractorService = DataExtractorService;
exports.DataExtractorService = DataExtractorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService])
], DataExtractorService);
//# sourceMappingURL=data-extractor.service.js.map