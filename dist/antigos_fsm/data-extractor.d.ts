import { ExtractionInput, ExtractionResult } from './types';
export declare function extractDataFromMessage(input: ExtractionInput, openaiApiKey: string, model?: string, customPrompt?: string | null): Promise<ExtractionResult>;
export declare function validateDataType(value: any, expectedType: string | null): boolean;
export declare function extractAllDataFromMessage(input: import('./types').GlobalExtractionInput, openaiApiKey: string, model?: string): Promise<import('./types').GlobalExtractionResult>;
