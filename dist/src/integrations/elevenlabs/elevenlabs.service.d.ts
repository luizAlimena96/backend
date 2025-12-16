export declare class ElevenLabsService {
    private readonly baseUrl;
    textToSpeech(apiKey: string, text: string, voiceId?: string): Promise<Buffer>;
}
