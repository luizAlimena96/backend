import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../services/openai.service';
import { Route, AvailableRoutes, AgentContext } from '../types/common.types';
import { STATE_DECIDER_SYSTEM_PROMPT } from '../prompts/system-prompts';

export type Veredito = 'SUCESSO' | 'FALHA' | 'PENDENTE' | 'ERRO';
export type TipoRota = 'rota_de_sucesso' | 'rota_de_persistencia' | 'rota_de_escape';

// Re-export for convenience
export { Route, AvailableRoutes, AgentContext };

export interface DecisionInputForAI {
    currentState: string;
    missionPrompt: string;
    dataKey: string | null;
    extractedData: Record<string, any>;
    lastMessage: string;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    availableRoutes: AvailableRoutes;
    prohibitions: string | null;
    agentContext?: AgentContext;
    knowledgeContext?: string;
}

export interface DecisionResult {
    pensamento: string[];
    estado_escolhido: string;
    veredito: Veredito;
    rota_escolhida: TipoRota;
    confianca: number;
}

@Injectable()
export class StateDeciderService {
    constructor(private openaiService: OpenAIService) { }

    async decideStateTransition(
        input: DecisionInputForAI,
        apiKey: string,
        model: string = 'gpt-4o-mini',
        customPrompt?: string | null
    ): Promise<DecisionResult> {
        // DEBUG: Log custom prompt status
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

            const response = await this.openaiService.createChatCompletion(
                apiKey,
                model,
                [
                    {
                        role: 'system',
                        content: 'Você é um autômato de execução lógica. Retorne APENAS JSON válido conforme as instruções.',
                    },
                    { role: 'user', content: prompt },
                ],
                { temperature: 0.0, responseFormat: { type: 'json_object' } }
            );

            const parsed = JSON.parse(response);

            // DEBUG: Log AI response
            console.log('[State Decider] DEBUG - AI Response:', {
                veredito: parsed.veredito,
                estado_escolhido: parsed.estado_escolhido,
                rota_escolhida: parsed.rota_escolhida,
                pensamentoPreview: parsed.pensamento?.[0]?.substring(0, 100) || 'N/A',
            });

            // Normalizar resposta com defaults
            if (!parsed.pensamento) parsed.pensamento = ['Resposta sem pensamento detalhado'];
            if (!Array.isArray(parsed.pensamento)) parsed.pensamento = [String(parsed.pensamento)];
            if (!parsed.estado_escolhido) parsed.estado_escolhido = input.currentState;
            if (!parsed.veredito) parsed.veredito = 'PENDENTE';
            if (!parsed.rota_escolhida) parsed.rota_escolhida = 'rota_de_persistencia';

            // Validar veredito
            const vereditosValidos: Veredito[] = ['SUCESSO', 'FALHA', 'PENDENTE', 'ERRO'];
            if (!vereditosValidos.includes(parsed.veredito as Veredito)) {
                parsed.veredito = 'PENDENTE';
            }

            // Validar rota
            const rotasValidas: TipoRota[] = ['rota_de_sucesso', 'rota_de_persistencia', 'rota_de_escape'];
            if (!rotasValidas.includes(parsed.rota_escolhida as TipoRota)) {
                parsed.rota_escolhida = 'rota_de_persistencia';
            }

            return {
                pensamento: parsed.pensamento,
                estado_escolhido: parsed.estado_escolhido,
                veredito: parsed.veredito as Veredito,
                rota_escolhida: parsed.rota_escolhida as TipoRota,
                confianca: parsed.confianca || 0.8,
            };
        } catch (error) {
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

    validateDecisionRules(decision: DecisionResult, input: DecisionInputForAI): {
        valid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Regra 1: Se veredito é SUCESSO, deve escolher rota_de_sucesso
        if (decision.veredito === 'SUCESSO' && decision.rota_escolhida !== 'rota_de_sucesso') {
            errors.push('Veredito SUCESSO deve escolher rota_de_sucesso');
        }

        // Regra 2: Se veredito é FALHA, NÃO pode escolher rota_de_sucesso
        if (decision.veredito === 'FALHA' && decision.rota_escolhida === 'rota_de_sucesso') {
            errors.push('Veredito FALHA não pode escolher rota_de_sucesso');
        }

        // Regra 3: Estado escolhido deve existir na rota escolhida
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

    private buildStateDeciderPrompt(input: DecisionInputForAI, customPrompt?: string | null): string {
        console.log('[State Decider] 🔍 DEBUG - buildPrompt called:', {
            hasCustomPrompt: !!customPrompt,
            customPromptType: typeof customPrompt,
            customPromptValue: customPrompt === null ? 'null' : customPrompt === undefined ? 'undefined' : 'string',
        });

        // Use custom prompt from agent database or default system prompt
        const basePrompt = (customPrompt && customPrompt.trim()) || STATE_DECIDER_SYSTEM_PROMPT;

        const conversationText = input.conversationHistory
            .slice(-10)
            .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
            .join('\n');

        const knowledgeSection = input.knowledgeContext
            ? `\n# BASE DE CONHECIMENTO RELEVANTE\n${input.knowledgeContext}`
            : '';

        // Build prompt exactly like frontend (prompts.ts line 62-99)
        return `${basePrompt}

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

    /**
     * Verifica se um estado deve ser pulado porque seu dataKey já foi coletado
     */
    shouldSkipState(
        stateName: string,
        stateDataKey: string | null,
        extractedData: Record<string, any>
    ): boolean {
        // Se o estado não tem dataKey, não pode ser pulado
        if (!stateDataKey || stateDataKey === 'vazio') {
            return false;
        }

        // Se o dataKey já existe em extractedData com valor válido, pular
        const value = extractedData[stateDataKey];

        // Verificar se o valor existe e não é null/undefined/empty
        if (value === null || value === undefined || value === '') {
            return false;
        }

        // Se chegou aqui, o dado foi coletado e o estado pode ser pulado
        console.log(`[State Decider] Estado '${stateName}' será pulado - dataKey '${stateDataKey}' já coletado:`, value);
        return true;
    }

    /**
     * Encontra o próximo estado que ainda precisa de dados
     * Pula estados cujos dataKeys já foram coletados
     */
    async findNextStateWithMissingData(
        proposedState: string,
        allStates: Array<{ name: string; dataKey: string | null; availableRoutes: any }>,
        extractedData: Record<string, any>,
        maxDepth: number = 10
    ): Promise<{ nextState: string; skippedStates: string[] }> {
        const skippedStates: string[] = [];
        let currentState = proposedState;
        let depth = 0;

        while (depth < maxDepth) {
            // Encontrar informações do estado atual
            const stateInfo = allStates.find(s => s.name === currentState);

            if (!stateInfo) {
                // Estado não encontrado, retornar como está
                break;
            }

            // Verificar se este estado deve ser pulado
            if (this.shouldSkipState(currentState, stateInfo.dataKey, extractedData)) {
                skippedStates.push(currentState);

                // Tentar encontrar próximo estado na rota de sucesso
                const routes = stateInfo.availableRoutes as any;
                const successRoute = routes?.rota_de_sucesso;

                if (successRoute && successRoute.length > 0) {
                    // Ir para o primeiro estado da rota de sucesso
                    currentState = successRoute[0].estado;
                    depth++;
                } else {
                    // Sem rota de sucesso, não pode pular
                    break;
                }
            } else {
                // Estado não deve ser pulado, este é o próximo estado válido
                break;
            }
        }

        if (skippedStates.length > 0) {
            console.log(`[State Decider] Pulados ${skippedStates.length} estados:`, skippedStates);
            console.log(`[State Decider] Próximo estado válido: ${currentState}`);
        }

        return {
            nextState: currentState,
            skippedStates,
        };
    }
}
