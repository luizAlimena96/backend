import { TestAIService } from './test-ai.service';
export declare class TestAIController {
    private testAIService;
    constructor(testAIService: TestAIService);
    processMessage(data: any, req: any): Promise<{
        response: string;
        audioBase64: string | null;
        thinking: string;
        state: string;
        extractedData: any;
        newDebugLog: {
            id: string;
            clientMessage: any;
            aiResponse: string;
            currentState: string;
            aiThinking: string;
            createdAt: string;
            extractedData: any;
        };
        sentMessages: {
            id: string;
            content: string;
            timestamp: Date;
            thought: string;
            type: string;
        }[];
    }>;
    getHistory(organizationId: string, req: any): Promise<{
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
            createdAt: Date;
            organizationId: string | null;
            phone: string;
            agentId: string | null;
            currentState: string | null;
            leadId: string | null;
            conversationId: string | null;
            clientMessage: string;
            aiResponse: string;
            aiThinking: string | null;
        }[];
        extractedData: import("@prisma/client/runtime/library").JsonValue | undefined;
    }>;
    resetConversation(organizationId: string, req: any): Promise<{
        success: boolean;
    }>;
    triggerFollowup(data: any, req: any): Promise<{
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
