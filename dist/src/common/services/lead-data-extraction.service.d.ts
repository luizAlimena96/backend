import { OpenAIService } from '../../ai/services/openai.service';
export declare class LeadDataExtractionService {
    private openaiService;
    constructor(openaiService: OpenAIService);
    extractLeadData(message: string, apiKey: string): Promise<any>;
}
