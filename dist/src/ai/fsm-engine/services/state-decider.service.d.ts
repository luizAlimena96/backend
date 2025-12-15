import { OpenAIService } from '../../services/openai.service';
import { Route, AvailableRoutes, AgentContext } from '../types/common.types';
export type Veredito = 'SUCESSO' | 'FALHA' | 'PENDENTE' | 'ERRO';
export type TipoRota = 'rota_de_sucesso' | 'rota_de_persistencia' | 'rota_de_escape';
export { Route, AvailableRoutes, AgentContext };
export interface DecisionInputForAI {
    currentState: string;
    missionPrompt: string;
    dataKey: string | null;
    extractedData: Record<string, any>;
    lastMessage: string;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
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
export declare class StateDeciderService {
    private openaiService;
    constructor(openaiService: OpenAIService);
    decideStateTransition(input: DecisionInputForAI, apiKey: string, model?: string, customPrompt?: string | null): Promise<DecisionResult>;
    validateDecisionRules(decision: DecisionResult, input: DecisionInputForAI): {
        valid: boolean;
        errors: string[];
    };
    private buildStateDeciderPrompt;
}
