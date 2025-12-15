"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAIService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let TestAIService = class TestAIService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async processMessage(data, userId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }
        const { message, organizationId, agentId, conversationHistory, file, customPrompts } = data;
        if ((!message && !file) || !organizationId || !agentId) {
            throw new common_1.ForbiddenException('Message (or File), organizationId, and agentId are required');
        }
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
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
            throw new common_1.NotFoundException('Agent not found');
        }
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
        const mockResponse = {
            response: 'Mock AI response - AI service integration pending',
            audioBase64: null,
            thinking: 'Mock thinking process',
            state: agent.states?.[0]?.name || 'INICIO',
            sentMessages: [],
        };
        return mockResponse;
    }
    async getHistory(organizationId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
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
    async resetConversation(organizationId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
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
    async triggerFollowup(organizationId, agentId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }
        return {
            success: true,
            message: 'Follow-up simulation not yet implemented',
        };
    }
};
exports.TestAIService = TestAIService;
exports.TestAIService = TestAIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TestAIService);
//# sourceMappingURL=test-ai.service.js.map