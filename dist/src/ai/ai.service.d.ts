import { PrismaService } from '../database/prisma.service';
import { OpenAIService } from './services/openai.service';
import { MediaAnalysisService } from './services/media-analysis.service';
import { MessageEventEmitter } from '../common/events/message-event.emitter';
interface ProcessMessageParams {
    message: string;
    conversationId: string;
    organizationId: string;
    media?: {
        type: string;
        base64: string;
        name?: string;
    };
}
export declare class AIService {
    private prisma;
    private openaiService;
    private mediaAnalysisService;
    private messageEventEmitter;
    constructor(prisma: PrismaService, openaiService: OpenAIService, mediaAnalysisService: MediaAnalysisService, messageEventEmitter: MessageEventEmitter);
    processMessage(params: ProcessMessageParams): Promise<{
        response: string;
    }>;
    private loadFullContext;
    private processMedia;
    private buildPrompt;
}
export {};
