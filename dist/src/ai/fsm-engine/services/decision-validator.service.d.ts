import { OpenAIService } from '../../services/openai.service';
import { DecisionResult, AvailableRoutes } from './state-decider.service';
export interface ValidationInput {
    currentState: string;
    proposedNextState: string;
    decision: DecisionResult;
    extractedData: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
}
export interface ValidationResult {
    approved: boolean;
    confidence: number;
    justificativa: string;
    alertas: string[];
    retryable: boolean;
    suggestedState?: string;
}
export declare class DecisionValidatorService {
    private openaiService;
    constructor(openaiService: OpenAIService);
    validateDecision(input: ValidationInput, apiKey: string, model?: string, customPrompt?: string | null): Promise<ValidationResult>;
    detectStateLoop(currentState: string, proposedNextState: string, conversationHistory: Array<{
        role: string;
        content: string;
    }>): {
        hasLoop: boolean;
        loopCount: number;
        description: string;
    };
    isValidTransition(currentState: string, nextState: string, availableRoutes: AvailableRoutes): boolean;
    private buildValidatorPrompt;
}
