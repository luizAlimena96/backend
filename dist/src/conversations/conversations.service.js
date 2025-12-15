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
exports.ConversationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let ConversationsService = class ConversationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        return this.prisma.conversation.findMany({
            where: { organizationId },
            include: {
                lead: { select: { id: true, name: true, phone: true } },
                messages: { orderBy: { timestamp: "desc" }, take: 1 },
                agent: { select: { id: true, name: true } },
                tags: true,
            },
            orderBy: { updatedAt: "desc" },
        });
    }
    async findOne(id) {
        return this.prisma.conversation.findUnique({
            where: { id },
            include: {
                lead: true,
                agent: true,
                messages: { orderBy: { timestamp: "asc" } },
                tags: true,
            },
        });
    }
    async create(data) {
        const existing = await this.prisma.conversation.findFirst({
            where: { whatsapp: data.whatsapp, organizationId: data.organizationId },
        });
        if (existing)
            return existing;
        return this.prisma.conversation.create({
            data,
            include: { lead: true, agent: true },
        });
    }
    async update(id, data) {
        return this.prisma.conversation.update({
            where: { id },
            data,
        });
    }
    async toggleAI(id, enabled) {
        return this.prisma.conversation.update({
            where: { id },
            data: { aiEnabled: enabled },
        });
    }
    async getMessages(conversationId) {
        return this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { timestamp: "asc" },
        });
    }
    async sendMessage(conversationId, content, fromMe = true) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                organization: {
                    select: {
                        evolutionApiUrl: true,
                        evolutionApiKey: true,
                        evolutionInstanceName: true,
                    },
                },
            },
        });
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId,
                content,
                fromMe,
                type: 'TEXT',
                messageId: crypto.randomUUID(),
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
        });
        if (fromMe && conversation.organization) {
            const { evolutionApiUrl, evolutionApiKey, evolutionInstanceName } = conversation.organization;
            if (evolutionApiUrl && evolutionApiKey && evolutionInstanceName) {
                try {
                    const response = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': evolutionApiKey,
                        },
                        body: JSON.stringify({
                            number: conversation.whatsapp,
                            text: content,
                        }),
                    });
                    if (!response.ok) {
                        console.error('Evolution API error:', await response.text());
                    }
                }
                catch (error) {
                    console.error('Error sending via Evolution API:', error);
                }
            }
        }
        return message;
    }
    async addTag(conversationId, tagId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { tags: true },
        });
        if (!conversation) {
            throw new Error('Conversation not found');
        }
        if (conversation.tags.some(t => t.id === tagId)) {
            return conversation;
        }
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                tags: {
                    connect: { id: tagId },
                },
            },
            include: { tags: true },
        });
    }
    async removeTag(conversationId, tagId) {
        return this.prisma.conversation.update({
            where: { id: conversationId },
            data: {
                tags: {
                    disconnect: { id: tagId },
                },
            },
            include: { tags: true },
        });
    }
};
exports.ConversationsService = ConversationsService;
exports.ConversationsService = ConversationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ConversationsService);
//# sourceMappingURL=conversations.service.js.map