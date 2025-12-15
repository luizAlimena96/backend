import { PrismaService } from '../database/prisma.service';
export declare class TestAIService {
    private prisma;
    constructor(prisma: PrismaService);
    processMessage(data: any, userId: string, userRole: string): Promise<{
        response: string;
        audioBase64: null;
        thinking: string;
        state: string;
        sentMessages: never[];
    }>;
    getHistory(organizationId: string, userRole: string): Promise<{
        messages: {
            id: string;
            content: string;
            fromMe: boolean;
            timestamp: Date;
            thinking: string | null;
            state: string | null | undefined;
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
    }>;
}
