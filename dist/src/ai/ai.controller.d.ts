import { AIService } from './ai.service';
export declare class AIController {
    private aiService;
    constructor(aiService: AIService);
    processMessage(data: any): Promise<{
        response: string;
    }>;
}
