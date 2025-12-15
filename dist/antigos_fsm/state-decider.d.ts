import { DecisionInputForAI, DecisionResult } from './types';
export declare function decideStateTransition(input: DecisionInputForAI, openaiApiKey: string, model?: string, customPrompt?: string | null): Promise<DecisionResult>;
export declare function validateDecisionRules(decision: DecisionResult, input: DecisionInputForAI): {
    valid: boolean;
    errors: string[];
};
export declare function shouldSkipState(stateName: string, stateDataKey: string | null, extractedData: Record<string, any>): boolean;
export declare function findNextStateWithMissingData(proposedState: string, allStates: Array<{
    name: string;
    dataKey: string | null;
    availableRoutes: any;
}>, extractedData: Record<string, any>, maxDepth?: number): Promise<{
    nextState: string;
    skippedStates: string[];
}>;
