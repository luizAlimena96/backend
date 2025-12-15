import { TestAIService } from './test-ai.service';
export declare class TestAIController {
    private testAIService;
    constructor(testAIService: TestAIService);
    processMessage(data: any, req: any): Promise<{
        response: string;
        audioBase64: null;
        thinking: string;
        state: string;
        sentMessages: never[];
    }>;
    getHistory(organizationId: string, req: any): Promise<{
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
    resetConversation(organizationId: string, req: any): Promise<{
        success: boolean;
    }>;
    triggerFollowup(data: any, req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
