import { TestAIService } from './test-ai.service';
export declare class TestAIController {
    private testAIService;
    constructor(testAIService: TestAIService);
    processMessage(data: any, req: any): Promise<{
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
    resetConversation(organizationId: string, req: any): Promise<{
        success: boolean;
    }>;
    triggerFollowup(data: any, req: any): Promise<{
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
