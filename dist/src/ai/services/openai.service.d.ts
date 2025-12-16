export declare class OpenAIService {
    chat(apiKey: string, messages: any[], model?: string): Promise<string>;
    chatWithTools(apiKey: string, messages: any[], tools: any[], model?: string): Promise<any>;
    createChatCompletion(apiKey: string, model: string, messages: any[], options?: {
        temperature?: number;
        maxTokens?: number;
        responseFormat?: any;
    }): Promise<string>;
    transcribeAudio(apiKey: string, audioBase64: string): Promise<string>;
    createEmbedding(apiKey: string, text: string): Promise<number[]>;
    analyzeImage(apiKey: string, imageBuffer: Buffer, prompt: string): Promise<string>;
}
