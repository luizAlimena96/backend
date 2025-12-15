import { ExtractionInput, DecisionInputForAI, ValidationInput } from './types';
export declare function buildDataExtractorPrompt(input: ExtractionInput, customPrompt?: string | null): string;
export declare function buildStateDeciderPrompt(input: DecisionInputForAI, customPrompt?: string | null): string;
export declare function buildDecisionValidatorPrompt(input: ValidationInput, customPrompt?: string | null): string;
