import { HttpService } from '@nestjs/axios';
export declare class ElevenLabsService {
    private httpService;
    constructor(httpService: HttpService);
    textToSpeech(text: string, voiceId: string, apiKey: string): Promise<Buffer>;
}
