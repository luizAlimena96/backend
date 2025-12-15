import { PrismaService } from '../database/prisma.service';
import { FSMEngineService } from '../ai/fsm-engine/fsm-engine.service';
import { OpenAIService } from '../ai/services/openai.service';
import { ElevenLabsService } from '../integrations/elevenlabs/elevenlabs.service';
import { AgentFollowupService } from '../common/services/agent-followup.service';
export declare class TestAIService {
    private prisma;
    private fsmEngine;
    private openaiService;
    private elevenLabsService;
    private agentFollowup;
    constructor(prisma: PrismaService, fsmEngine: FSMEngineService, openaiService: OpenAIService, elevenLabsService: ElevenLabsService, agentFollowup: AgentFollowupService);
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
            conversationId: string | null;
            clientMessage: string;
            aiResponse: string;
            currentState: string | null;
            aiThinking: string | null;
            organizationId: string | null;
            agentId: string | null;
            leadId: string | null;
            createdAt: Date;
        }[];
        extractedData: import("@prisma/client/runtime/library").JsonValue | undefined;
    }>;
    resetConversation(organizationId: string, userRole: string): Promise<{
        success: boolean;
    }>;
    triggerFollowup(organizationId: string, agentId: string, userRole: string): Promise<{
        success: boolean;
        message: string;
        stats?: undefined;
    } | {
        success: boolean;
        message: string;
        stats: {
            totalSent: number;
            lastSentAt: Date | null;
            followupRules: number;
        };
    }>;
}
