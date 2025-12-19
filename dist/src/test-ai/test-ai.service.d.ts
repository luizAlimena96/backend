import { PrismaService } from '../database/prisma.service';
import { OpenAIService } from '../ai/services/openai.service';
import { ElevenLabsService } from '../integrations/elevenlabs/elevenlabs.service';
import { FSMEngineService } from '../ai/fsm-engine/fsm-engine.service';
import { LeadsService } from '../leads/leads.service';
import { MediaAnalysisService } from '../ai/services/media-analysis.service';
import { PdfService } from '../common/services/pdf.service';
import { FollowupsService } from '../followups/followups.service';
export declare class TestAIService {
    private prisma;
    private openaiService;
    private elevenLabsService;
    private fsmEngineService;
    private leadsService;
    private mediaAnalysisService;
    private pdfService;
    private followupsService;
    constructor(prisma: PrismaService, openaiService: OpenAIService, elevenLabsService: ElevenLabsService, fsmEngineService: FSMEngineService, leadsService: LeadsService, mediaAnalysisService: MediaAnalysisService, pdfService: PdfService, followupsService: FollowupsService);
    processMessage(data: any, userId: string, userRole: string): Promise<{
        response: string;
        audioBase64: string | null;
        thinking: string;
        state: string;
        extractedData: Record<string, any>;
        newDebugLog: {
            id: string;
            clientMessage: any;
            aiResponse: string;
            currentState: string;
            aiThinking: string;
            createdAt: string;
            extractedData: Record<string, any>;
        };
        sentMessages: {
            id: any;
            content: any;
            timestamp: any;
            thought: string;
            type: string;
        }[];
    }>;
    getHistory(organizationId: string, userRole: string): Promise<{
        messages: {
            id: string;
            content: string;
            fromMe: boolean;
            timestamp: Date;
            thinking: string | null;
            state: string | null | undefined;
            type: import(".prisma/client").$Enums.MessageType;
        }[];
        debugLogs: {
            id: string;
            phone: string;
            createdAt: Date;
            agentId: string | null;
            currentState: string | null;
            organizationId: string | null;
            leadId: string | null;
            conversationId: string | null;
            clientMessage: string;
            aiResponse: string;
            aiThinking: string | null;
        }[];
        extractedData: import("@prisma/client/runtime/library").JsonValue | undefined;
    }>;
    resetConversation(organizationId: string, userRole: string): Promise<{
        success: boolean;
    }>;
    triggerFollowup(organizationId: string, agentId: string, userRole: string, forceIgnoreDelay?: boolean): Promise<{
        success: boolean;
        message: string;
        stats: {
            processed: number;
            rulesChecked: number;
        };
    } | {
        success: boolean;
        message: string;
        stats?: undefined;
    }>;
}
