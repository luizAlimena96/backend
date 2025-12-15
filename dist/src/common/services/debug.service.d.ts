import { PrismaService } from '../../database/prisma.service';
export declare class DebugService {
    private prisma;
    constructor(prisma: PrismaService);
    createDebugLog(data: {
        phone: string;
        conversationId?: string;
        clientMessage: string;
        aiResponse: string;
        currentState?: string;
        aiThinking?: string;
        organizationId?: string;
        agentId?: string;
        leadId?: string;
    }): Promise<void>;
    getDebugLogs(organizationId: string, limit?: number): Promise<any[]>;
}
