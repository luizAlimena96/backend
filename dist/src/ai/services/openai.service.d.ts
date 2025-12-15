export declare class OpenAIService {
    createChatCompletion(apiKey: string, model: string, messages: Array<{
        role: string;
        content: string;
    }>, options?: {
        temperature?: number;
        maxTokens?: number;
        responseFormat?: {
            type: 'json_object' | 'text';
        };
    }): Promise<string>;
    transcribeAudio(apiKey: string, audioBase64: string): Promise<string>;
    createEmbedding(apiKey: string, text: string): Promise<number[]>;
}
