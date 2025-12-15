import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DebugService {
    constructor(private prisma: PrismaService) { }

    async createDebugLog(data: {
        phone: string;
        conversationId?: string;
        clientMessage: string;
        aiResponse: string;
        currentState?: string;
        aiThinking?: string;
        organizationId?: string;
        agentId?: string;
        leadId?: string;
    }): Promise<void> {
        try {
            await this.prisma.debugLog.create({
                data: {
                    phone: data.phone,
                    conversationId: data.conversationId,
                    clientMessage: data.clientMessage,
                    aiResponse: data.aiResponse,
                    currentState: data.currentState,
                    aiThinking: data.aiThinking,
                    organizationId: data.organizationId,
                    agentId: data.agentId,
                    leadId: data.leadId,
                },
            });
        } catch (error) {
            console.error('Failed to create debug log:', error);
        }
    }

    async getDebugLogs(organizationId: string, limit: number = 100): Promise<any[]> {
        return this.prisma.debugLog.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
}
