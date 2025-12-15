import { OpenAIService } from './openai.service';
export declare class MediaAnalysisService {
    private openaiService;
    constructor(openaiService: OpenAIService);
    analyzeImage(base64Image: string, apiKey: string): Promise<{
        success: boolean;
        content: string;
    }>;
    analyzeDocument(base64PDF: string, fileName: string, mimeType: string, apiKey: string): Promise<{
        success: boolean;
        content: string;
    }>;
    processVideo(fileName?: string): {
        content: string;
    };
    getUnsupportedFormatMessage(): string;
}
