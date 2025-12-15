import { OpenAIService } from '../../services/openai.service';
import { AgentContext } from '../types/common.types';
export interface ExtractionInput {
    message: string;
    dataKey: string | null;
    dataType: string | null;
    dataDescription: string | null;
    currentExtractedData: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    agentContext?: AgentContext;
}
export interface ExtractionResult {
    success: boolean;
    data: Record<string, any>;
    confidence: number;
    metadata: {
        extractedAt: Date;
        dataKey: string | null;
        dataType: string | null;
        extractedFields: string[];
    };
    reasoning: string[];
}
export interface GlobalExtractionInput {
    message: string;
    allDataKeys: Array<{
        key: string;
        description: string;
        type: string;
    }>;
    currentExtractedData: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    agentContext?: AgentContext;
}
export interface GlobalExtractionResult {
    success: boolean;
    extractedData: Record<string, any>;
    confidence: Record<string, number>;
    metadata: {
        extractedAt: Date;
        totalDataKeys: number;
        extractedCount: number;
        extractedFields: string[];
    };
    reasoning: string[];
}
export declare class DataExtractorService {
    private openaiService;
    constructor(openaiService: OpenAIService);
    extractDataFromMessage(input: ExtractionInput, apiKey: string, model?: string, customPrompt?: string | null): Promise<ExtractionResult>;
    extractAllDataFromMessage(input: GlobalExtractionInput, apiKey: string, model?: string, customPrompt?: string | null): Promise<GlobalExtractionResult>;
    private buildDataExtractorPrompt;
}
