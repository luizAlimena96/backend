import { ValidationInput, ValidationResult } from './types';
export declare function validateDecision(input: ValidationInput, openaiApiKey: string, model?: string, customPrompt?: string | null): Promise<ValidationResult>;
export declare function detectStateLoop(currentState: string, proposedNextState: string, conversationHistory: Array<{
    role: string;
    content: string;
}>): {
    hasLoop: boolean;
    loopCount: number;
    description: string;
};
export declare function isValidTransition(currentState: string, nextState: string, availableRoutes: {
    rota_de_sucesso: Array<{
        estado: string;
    }>;
    rota_de_persistencia: Array<{
        estado: string;
    }>;
    rota_de_escape: Array<{
        estado: string;
    }>;
}): boolean;
