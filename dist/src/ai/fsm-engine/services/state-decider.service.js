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
exports.StateDeciderService = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("../../services/openai.service");
let StateDeciderService = class StateDeciderService {
    openaiService;
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async decideStateTransition(input, apiKey, model = 'gpt-4o-mini', customPrompt) {
        console.log('[State Decider] DEBUG - Custom Prompt:', {
            hasPrompt: !!customPrompt,
            promptLength: customPrompt?.length || 0,
            promptType: typeof customPrompt,
        });
        console.log('[State Decider] 🔍 DEBUG - Received:', {
            hasCustomPrompt: !!customPrompt,
            customPromptLength: customPrompt?.length || 0,
            customPromptPreview: customPrompt?.substring(0, 100) || 'NULL',
        });
        try {
            const prompt = this.buildStateDeciderPrompt(input, customPrompt);
            const response = await this.openaiService.createChatCompletion(apiKey, model, [
                {
                    role: 'system',
                    content: 'Você é um autômato de execução lógica. Retorne APENAS JSON válido conforme as instruções.',
                },
                { role: 'user', content: prompt },
            ], { temperature: 0.0, responseFormat: { type: 'json_object' } });
            const parsed = JSON.parse(response);
            console.log('[State Decider] DEBUG - AI Response:', {
                veredito: parsed.veredito,
                estado_escolhido: parsed.estado_escolhido,
                rota_escolhida: parsed.rota_escolhida,
                pensamentoPreview: parsed.pensamento?.[0]?.substring(0, 100) || 'N/A',
            });
            if (!parsed.pensamento)
                parsed.pensamento = ['Resposta sem pensamento detalhado'];
            if (!Array.isArray(parsed.pensamento))
                parsed.pensamento = [String(parsed.pensamento)];
            if (!parsed.estado_escolhido)
                parsed.estado_escolhido = input.currentState;
            if (!parsed.veredito)
                parsed.veredito = 'PENDENTE';
            if (!parsed.rota_escolhida)
                parsed.rota_escolhida = 'rota_de_persistencia';
            const vereditosValidos = ['SUCESSO', 'FALHA', 'PENDENTE', 'ERRO'];
            if (!vereditosValidos.includes(parsed.veredito)) {
                parsed.veredito = 'PENDENTE';
            }
            const rotasValidas = ['rota_de_sucesso', 'rota_de_persistencia', 'rota_de_escape'];
            if (!rotasValidas.includes(parsed.rota_escolhida)) {
                parsed.rota_escolhida = 'rota_de_persistencia';
            }
            return {
                pensamento: parsed.pensamento,
                estado_escolhido: parsed.estado_escolhido,
                veredito: parsed.veredito,
                rota_escolhida: parsed.rota_escolhida,
                confianca: parsed.confianca || 0.8,
            };
        }
        catch (error) {
            console.error('[State Decider] Error:', error);
            return {
                pensamento: [
                    'Erro crítico no motor de decisão.',
                    error instanceof Error ? error.message : 'Erro desconhecido',
                    'Mantendo estado atual por segurança.',
                ],
                estado_escolhido: input.currentState,
                veredito: 'ERRO',
                rota_escolhida: 'rota_de_persistencia',
                confianca: 0.0,
            };
        }
    }
    validateDecisionRules(decision, input) {
        const errors = [];
        if (decision.veredito === 'SUCESSO' && decision.rota_escolhida !== 'rota_de_sucesso') {
            errors.push('Veredito SUCESSO deve escolher rota_de_sucesso');
        }
        if (decision.veredito === 'FALHA' && decision.rota_escolhida === 'rota_de_sucesso') {
            errors.push('Veredito FALHA não pode escolher rota_de_sucesso');
        }
        const rotaEscolhida = input.availableRoutes[decision.rota_escolhida];
        const estadoExiste = rotaEscolhida.some(r => r.estado === decision.estado_escolhido);
        if (!estadoExiste && decision.estado_escolhido !== 'ERRO') {
            errors.push(`Estado ${decision.estado_escolhido} não existe na ${decision.rota_escolhida}`);
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    buildStateDeciderPrompt(input, customPrompt) {
        console.log('[State Decider] 🔍 DEBUG - buildPrompt called:', {
            hasCustomPrompt: !!customPrompt,
            customPromptType: typeof customPrompt,
            customPromptValue: customPrompt === null ? 'null' : customPrompt === undefined ? 'undefined' : 'string',
        });
        if (!customPrompt) {
            throw new Error('State Decider prompt not configured for this agent. Please configure fsmStateDeciderPrompt in agent settings.');
        }
        const conversationText = input.conversationHistory
            .slice(-10)
            .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
            .join('\n');
        const knowledgeSection = input.knowledgeContext
            ? `\n# BASE DE CONHECIMENTO RELEVANTE\n${input.knowledgeContext}`
            : '';
        return `${customPrompt}

# CONTEXTO DO AGENTE

**Nome do Agente**: ${input.agentContext?.name || 'N/A'}
${input.agentContext?.personality ? `**Personalidade**: ${input.agentContext.personality}` : ''}
${input.agentContext?.tone ? `**Tom de Voz**: ${input.agentContext.tone}` : ''}
${input.agentContext?.systemPrompt ? `**System Prompt**: ${input.agentContext.systemPrompt}` : ''}
${input.agentContext?.instructions ? `**Instruções Específicas**: ${input.agentContext.instructions}` : ''}
${input.agentContext?.writingStyle ? `**Estilo de Escrita**: ${input.agentContext.writingStyle}` : ''}
${input.agentContext?.prohibitions ? `**PROIBIÇÕES GLOBAIS DO AGENTE**: ${input.agentContext.prohibitions}` : ''}
${knowledgeSection}

# CONTEXTO DA EXECUÇÃO ATUAL (PREENCHIMENTO AUTOMÁTICO)

**Estado Atual**: ${input.currentState}
**Missão do Estado**: ${input.missionPrompt}
**CHAVE_DE_VALIDACAO_DO_ESTADO**: "${input.dataKey}"

**DADOS_JÁ_COLETADOS**:
\`\`\`json
${JSON.stringify(input.extractedData, null, 2)}
\`\`\`

**ÚLTIMA MENSAGEM DO CLIENTE**: "${input.lastMessage}"

**HISTÓRICO DA CONVERSA**:
${conversationText}

**OPÇÕES DE ROTA DISPONÍVEIS**:
\`\`\`json
${JSON.stringify(input.availableRoutes, null, 2)}
\`\`\`

${input.prohibitions ? `**PROIBIÇÕES DO ESTADO ATUAL**:\n${input.prohibitions}\n` : ''}


## EXECUTE O MOTOR DE DECISÃO AGORA
Retorne APENAS o objeto JSON conforme LEI UM.`;
    }
};
exports.StateDeciderService = StateDeciderService;
exports.StateDeciderService = StateDeciderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService])
], StateDeciderService);
//# sourceMappingURL=state-decider.service.js.map