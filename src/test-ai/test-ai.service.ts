import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TestAIService {
    constructor(private prisma: PrismaService) { }

    async processMessage(data: any, userId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }

        const { message, organizationId, agentId, conversationHistory, file, customPrompts } = data;

        if ((!message && !file) || !organizationId || !agentId) {
            throw new ForbiddenException('Message (or File), organizationId, and agentId are required');
        }

        // Get organization and agent
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
        }

        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                states: {
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!agent) {
            throw new NotFoundException('Agent not found');
        }

        // Create or find test lead
        const testPhone = `test_${organizationId}`;

        let lead = await this.prisma.lead.findFirst({
            where: {
                phone: testPhone,
                organizationId,
            },
        });

        if (!lead) {
            lead = await this.prisma.lead.create({
                data: {
                    phone: testPhone,
                    name: 'Test User (SUPER_ADMIN)',
                    status: 'NEW',
                    currentState: agent.states?.[0]?.name || 'INICIO',
                    agentId: agent.id,
                    organizationId,
                },
            });
        }

        // Create or find test conversation
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                whatsapp: testPhone,
                organizationId,
            },
        });

        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    whatsapp: testPhone,
                    leadId: lead.id,
                    agentId: agent.id,
                    organizationId,
                },
            });
        }

        // Save user message
        const userMsgContent = message || (file ? `[Arquivo Enviado]: ${file.name}` : '[Mensagem Vazia]');
        await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: userMsgContent,
                fromMe: false,
                type: file ? (file.type.startsWith('audio') ? 'AUDIO' : 'DOCUMENT') : 'TEXT',
                messageId: crypto.randomUUID(),
            },
        });

        // TODO: Process with AI service
        // For now, return mock response
        const mockResponse = {
            response: 'Mock AI response - AI service integration pending',
            audioBase64: null,
            thinking: 'Mock thinking process',
            state: agent.states?.[0]?.name || 'INICIO',
            sentMessages: [],
        };

        return mockResponse;
    }

    async getHistory(organizationId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }

        const testPhone = `test_${organizationId}`;

        const conversation = await this.prisma.conversation.findFirst({
            where: {
                whatsapp: testPhone,
                organizationId,
            },
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' },
                },
            },
        });

        if (!conversation) {
            return { messages: [], debugLogs: [], extractedData: null };
        }

        const lead = conversation.leadId
            ? await this.prisma.lead.findUnique({
                where: { id: conversation.leadId },
            })
            : null;

        const debugLogs = await this.prisma.debugLog.findMany({
            where: {
                conversationId: conversation.id,
            },
            orderBy: { createdAt: 'asc' },
        });

        const messagesWithThoughts = conversation.messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            fromMe: msg.fromMe,
            timestamp: msg.timestamp,
            thinking: msg.thought,
            state: msg.fromMe ? lead?.currentState : undefined,
        }));

        return {
            messages: messagesWithThoughts,
            debugLogs,
            extractedData: lead?.extractedData,
        };
    }

    async resetConversation(organizationId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }

        const testPhone = `test_${organizationId}`;

        const conversation = await this.prisma.conversation.findFirst({
            where: {
                whatsapp: testPhone,
                organizationId,
            },
        });

        if (conversation) {
            await this.prisma.conversation.delete({
                where: { id: conversation.id },
            });

            await this.prisma.debugLog.deleteMany({
                where: { conversationId: conversation.id },
            });
        }

        const lead = await this.prisma.lead.findFirst({
            where: {
                phone: testPhone,
                organizationId,
            },
        });

        if (lead) {
            await this.prisma.lead.delete({
                where: { id: lead.id },
            });
        }

        return { success: true };
    }

    async triggerFollowup(organizationId: string, agentId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }

        // TODO: Implement follow-up simulation
        return {
            success: true,
            message: 'Follow-up simulation not yet implemented',
        };
    }
}
