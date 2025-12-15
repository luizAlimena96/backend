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
exports.DecisionValidatorService = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("../../services/openai.service");
let DecisionValidatorService = class DecisionValidatorService {
    openaiService;
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async validateDecision(input, apiKey, model = 'gpt-4o-mini', customPrompt) {
        const startTime = Date.now();
        try {
            const prompt = this.buildValidatorPrompt(input, customPrompt);
            const response = await this.openaiService.createChatCompletion(apiKey, model, [
                {
                    role: 'system',
                    content: 'Você é um validador de decisões. Retorne APENAS JSON válido, sem markdown ou texto adicional.',
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
                console.error('[Decision Validator] JSON parse error:', parseError);
                console.error('[Decision Validator] Malformed JSON:', response.substring(0, 500));
                throw new Error('JSON mal formatado retornado pela IA');
            }
            if (typeof parsed.approved !== 'boolean' ||
                typeof parsed.confidence !== 'number' ||
                !parsed.justificativa ||
                !Array.isArray(parsed.alertas) ||
                typeof parsed.retryable !== 'boolean') {
                throw new Error('Formato de resposta inválido da IA');
            }
            const result = {
                approved: parsed.approved,
                confidence: Math.max(0, Math.min(1, parsed.confidence)),
                justificativa: parsed.justificativa,
                alertas: parsed.alertas,
                retryable: parsed.retryable,
                suggestedState: parsed.suggestedState,
            };
            console.log(`[Decision Validator] Completed in ${Date.now() - startTime}ms`, {
                approved: result.approved,
                confidence: result.confidence,
                alertasCount: result.alertas.length,
                retryable: result.retryable,
            });
            return result;
        }
        catch (error) {
            console.error('[Decision Validator] Error:', error);
            return {
                approved: true,
                confidence: 0.3,
                justificativa: `Erro ao validar decisão: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Aprovando por padrão com baixa confiança.`,
                alertas: ['Erro no validador - validação comprometida'],
                retryable: false,
            };
        }
    }
    detectStateLoop(currentState, proposedNextState, conversationHistory) {
        if (currentState === proposedNextState) {
            return {
                hasLoop: true,
                loopCount: 1,
                description: `Permanecendo no mesmo estado: ${currentState}`,
            };
        }
        return {
            hasLoop: false,
            loopCount: 0,
            description: 'Nenhum loop detectado',
        };
    }
    isValidTransition(currentState, nextState, availableRoutes) {
        const allStates = [
            ...availableRoutes.rota_de_sucesso.map(r => r.estado),
            ...availableRoutes.rota_de_persistencia.map(r => r.estado),
            ...availableRoutes.rota_de_escape.map(r => r.estado),
        ];
        return allStates.includes(nextState) || nextState === 'ERRO';
    }
    buildValidatorPrompt(input, customPrompt) {
        if (!customPrompt) {
            throw new Error('Validator prompt not configured for this agent. Please configure fsmValidatorPrompt in agent settings.');
        }
        const conversationText = input.conversationHistory
            .slice(-10)
            .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
            .join('\n');
        return `${customPrompt}

# CONTEXTO DO AGENTE

**Nome do Agente**: ${input.agentContext?.name || 'N/A'}
${input.agentContext?.personality ? `**Personalidade**: ${input.agentContext.personality}` : ''}
${input.agentContext?.tone ? `**Tom de Voz**: ${input.agentContext.tone}` : ''}
${input.agentContext?.prohibitions ? `**PROIBIÇÕES GLOBAIS DO AGENTE**: ${input.agentContext.prohibitions}` : ''}

# EVIDÊNCIAS DO CASO (CONTEXTO REAL)

## 1. O CENÁRIO
**Estado Atual**: ${input.currentState}
**Estado Proposto pelo Réu**: ${input.proposedNextState}
**Missão do Estado**: ${input.stateInfo?.missionPrompt || 'N/A'}
**Data Key**: ${input.stateInfo?.dataKey || 'vazio'}
**Proibições do Estado**: ${input.stateInfo?.prohibitions || 'Nenhuma'}

## 2. A DECISÃO DO RÉU
**Veredito**: ${input.decision.veredito || 'N/A'}
**Rota Escolhida**: ${input.decision.rota_escolhida || 'N/A'}
**Confiança**: ${input.decision.confianca || 'N/A'}
**Raciocínio**: 
${Array.isArray(input.decision.pensamento) ? input.decision.pensamento.join('\n') : input.decision.pensamento}

## 3. AS PROVAS (DADOS E HISTÓRICO)
**Dados Extraídos**:
\`\`\`json
${JSON.stringify(input.extractedData, null, 2)}
\`\`\`

**Histórico da Conversa**:
${conversationText}

## 4. AS LEIS LOCAIS (ROTAS VÁLIDAS)
\`\`\`json
${JSON.stringify(input.stateInfo?.availableRoutes || {}, null, 2)}
\`\`\`

EXECUTE O JULGAMENTO AGORA. RETORNE APENAS O JSON.`;
    }
};
exports.DecisionValidatorService = DecisionValidatorService;
exports.DecisionValidatorService = DecisionValidatorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService])
], DecisionValidatorService);
//# sourceMappingURL=decision-validator.service.js.map