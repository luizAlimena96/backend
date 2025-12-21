import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../services/openai.service';
import { DecisionResult, AvailableRoutes } from './state-decider.service';
import { VALIDATOR_SYSTEM_PROMPT } from '../prompts/system-prompts';

export interface ValidationInput {
    currentState: string;
    proposedNextState: string;
    decision: DecisionResult;
    extractedData: Record<string, any>;
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ValidationResult {
    approved: boolean;
    confidence: number;
    justificativa: string;
    alertas: string[];
    retryable: boolean;
    suggestedState?: string;
}

@Injectable()
export class DecisionValidatorService {
    constructor(private openaiService: OpenAIService) { }

    async validateDecision(
        input: ValidationInput,
        apiKey: string,
        model: string = 'gpt-4o-mini',
        customPrompt?: string | null
    ): Promise<ValidationResult> {
        const startTime = Date.now(); // FIX 1: Add performance tracking

        try {
            const prompt = this.buildValidatorPrompt(input, customPrompt);

            const response = await this.openaiService.createChatCompletion(
                apiKey,
                model,
                [
                    {
                        role: 'system',
                        content: 'Você é um validador de decisões. Retorne APENAS JSON válido, sem markdown ou texto adicional.', // FIX 4: Complete message
                    },
                    { role: 'user', content: prompt },
                ],
                { temperature: 0.1, responseFormat: { type: 'json_object' } }
            );

            // FIX 2: Validate response exists (matching frontend)
            if (!response) {
                throw new Error('IA não retornou resposta');
            }

            // FIX 3: Add try-catch for JSON parse (matching frontend)
            let parsed;
            try {
                parsed = JSON.parse(response);
            } catch (parseError) {
                console.error('[Decision Validator] JSON parse error:', parseError);
                console.error('[Decision Validator] Malformed JSON:', response.substring(0, 500));
                throw new Error('JSON mal formatado retornado pela IA');
            }

            // Validar estrutura
            if (
                typeof parsed.approved !== 'boolean' ||
                typeof parsed.confidence !== 'number' ||
                !parsed.justificativa ||
                !Array.isArray(parsed.alertas) ||
                typeof parsed.retryable !== 'boolean'
            ) {
                throw new Error('Formato de resposta inválido da IA');
            }

            const result: ValidationResult = {
                approved: parsed.approved,
                confidence: Math.max(0, Math.min(1, parsed.confidence)),
                justificativa: parsed.justificativa,
                alertas: parsed.alertas,
                retryable: parsed.retryable,
                suggestedState: parsed.suggestedState,
            };

            // FIX 5: Add performance log (matching frontend)
            console.log(`[Decision Validator] Completed in ${Date.now() - startTime}ms`, {
                approved: result.approved,
                confidence: result.confidence,
                alertasCount: result.alertas.length,
                retryable: result.retryable,
            });

            return result;
        } catch (error) {
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

    detectStateLoop(
        currentState: string,
        proposedNextState: string,
        conversationHistory: Array<{ role: string; content: string }>
    ): {
        hasLoop: boolean;
        loopCount: number;
        description: string;
    } {
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

    isValidTransition(
        currentState: string,
        nextState: string,
        availableRoutes: AvailableRoutes
    ): boolean {
        const allStates = [
            ...availableRoutes.rota_de_sucesso.map(r => r.estado),
            ...availableRoutes.rota_de_persistencia.map(r => r.estado),
            ...availableRoutes.rota_de_escape.map(r => r.estado),
        ];

        return allStates.includes(nextState) || nextState === 'ERRO';
    }

    private buildValidatorPrompt(input: any, customPrompt?: string | null): string {
        // Use custom prompt from agent database or default system prompt
        const basePrompt = (customPrompt && customPrompt.trim()) || VALIDATOR_SYSTEM_PROMPT;

        const conversationText = input.conversationHistory
            .slice(-10)
            .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
            .join('\n');

        // Build prompt exactly like frontend (prompts.ts line 112-151)
        return `${basePrompt}

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
}
