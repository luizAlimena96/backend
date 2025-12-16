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
exports.AgentFollowupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const whatsapp_integration_service_1 = require("../../integrations/whatsapp/whatsapp-integration.service");
const openai_service_1 = require("../../ai/services/openai.service");
let AgentFollowupService = class AgentFollowupService {
    prisma;
    whatsappService;
    openaiService;
    constructor(prisma, whatsappService, openaiService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
        this.openaiService = openaiService;
    }
    async checkAndCreateFollowups(leadId) {
        console.log(`[Agent Followup] Checking followups for lead: ${leadId}`);
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    conversations: {
                        where: { aiEnabled: true },
                        include: {
                            messages: {
                                orderBy: { timestamp: 'desc' },
                                take: 1,
                            },
                            agent: {
                                include: {
                                    followups: {
                                        where: { isActive: true },
                                    },
                                    organization: {
                                        select: {
                                            workingHours: true,
                                            openaiApiKey: true,
                                            openaiModel: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            if (!lead || !lead.conversations || lead.conversations.length === 0) {
                console.log(`[Agent Followup] No active conversations found for lead ${leadId}`);
                return;
            }
            for (const conversation of lead.conversations) {
                const lastMessage = conversation.messages[0];
                if (!lastMessage)
                    continue;
                const agent = conversation.agent;
                if (!agent || !agent.followups || agent.followups.length === 0) {
                    continue;
                }
                const hoursSinceLastMessage = (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);
                for (const followupRule of agent.followups) {
                    if (followupRule.matrixStageId && lead.currentState !== followupRule.matrixStageId) {
                        continue;
                    }
                    if (hoursSinceLastMessage >= followupRule.delayHours) {
                        const recentFollowup = await this.prisma.followupLog.findFirst({
                            where: {
                                leadId: lead.id,
                                followupId: followupRule.id,
                                sentAt: {
                                    gte: new Date(Date.now() - followupRule.delayHours * 60 * 60 * 1000),
                                },
                            },
                        });
                        if (recentFollowup) {
                            console.log(`[Agent Followup] Followup already sent recently for lead ${leadId}`);
                            continue;
                        }
                        if (agent.organization?.workingHours) {
                            const isWithinWorkingHours = this.checkWorkingHours(agent.organization.workingHours);
                            if (!isWithinWorkingHours) {
                                console.log(`[Agent Followup] Outside working hours, skipping popup`);
                                continue;
                            }
                        }
                        let messageToSend = followupRule.message;
                        if (followupRule.aiDecisionEnabled && agent.organization.openaiApiKey) {
                            try {
                                const aiMessage = await this.generateAIResponse(lead, conversation, agent, followupRule, agent.organization.openaiApiKey, agent.organization.openaiModel || 'gpt-4o-mini');
                                if (aiMessage) {
                                    messageToSend = aiMessage;
                                }
                            }
                            catch (aiError) {
                                console.error('[Agent Followup] AI generation failed, falling back to static message:', aiError);
                            }
                        }
                        await this.executeFollowupForConversation(conversation.id, followupRule.id, lead.id, messageToSend);
                    }
                }
            }
        }
        catch (error) {
            console.error(`[Agent Followup] Error checking followups for lead ${leadId}:`, error);
        }
    }
    async executeFollowup(followupId) {
        console.log(`[Agent Followup] Executing followup: ${followupId}`);
        try {
            const followup = await this.prisma.followup.findUnique({
                where: { id: followupId },
                include: {
                    agent: true,
                },
            });
            if (!followup) {
                console.error(`[Agent Followup] Followup ${followupId} not found`);
                return;
            }
            const conversations = await this.prisma.conversation.findMany({
                where: {
                    agentId: followup.agentId,
                    aiEnabled: true,
                },
                include: {
                    messages: {
                        orderBy: { timestamp: 'desc' },
                        take: 1,
                    },
                    lead: true,
                },
            });
            for (const conversation of conversations) {
                const lastMessage = conversation.messages[0];
                if (!lastMessage)
                    continue;
                const hoursSinceLastMessage = (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);
                if (hoursSinceLastMessage >= followup.delayHours) {
                    await this.executeFollowupForConversation(conversation.id, followupId, conversation.leadId);
                }
            }
        }
        catch (error) {
            console.error(`[Agent Followup] Error executing followup ${followupId}:`, error);
        }
    }
    async executeFollowupForConversation(conversationId, followupId, leadId, customMessage) {
        try {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: {
                    agent: true,
                },
            });
            const followup = await this.prisma.followup.findUnique({
                where: { id: followupId },
            });
            if (!conversation || !followup) {
                return;
            }
            const instanceName = conversation.agent.instance;
            const recipient = conversation.whatsapp;
            const messageToSend = customMessage || followup.message;
            if (followup.mediaType === 'text' || !followup.mediaType) {
                await this.whatsappService.sendMessage(instanceName, recipient, messageToSend);
            }
            else if (followup.mediaType === 'media' && followup.mediaUrl) {
                await this.whatsappService.sendMedia(instanceName, recipient, followup.mediaUrl, messageToSend);
            }
            if (leadId) {
                await this.prisma.followupLog.create({
                    data: {
                        leadId,
                        followupId,
                        message: messageToSend,
                    },
                });
            }
            console.log(`[Agent Followup] ✅ Sent followup to ${recipient}`);
        }
        catch (error) {
            console.error(`[Agent Followup] Error sending followup:`, error);
            throw error;
        }
    }
    async generateAIResponse(lead, conversation, agent, followup, apiKey, model) {
        try {
            const history = conversation.messages.map((msg) => ({
                role: msg.fromMe ? 'assistant' : 'user',
                content: msg.content,
            })).reverse();
            const systemPrompt = `${agent.systemPrompt || 'Você é um assistente virtual.'}
            
CONTEXTO DO AGENTE:
Nome: ${agent.name}
Personalidade: ${agent.personality || 'Profissional'}

INSTRUÇÃO DE FOLLOW-UP (VITAL):
${followup.aiDecisionPrompt || 'O usuário não respondeu. Tente re-engajar cordialmente.'}

DADOS DO CLIENTE:
Nome: ${lead.name || 'Cliente'}
Estado Atual: ${lead.currentState || 'Desconhecido'}

Gere uma mensagem curta e direta para retomar a conversa.`;
            const response = await this.openaiService.createChatCompletion(apiKey, model, [
                { role: 'system', content: systemPrompt },
                ...history
            ], { maxTokens: 150 });
            return response?.trim() || null;
        }
        catch (error) {
            console.error('[Agent Followup] Error generating AI response:', error);
            return null;
        }
    }
    checkWorkingHours(workingHours) {
        if (!workingHours)
            return true;
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[currentDay];
        if (!workingHours[dayName]?.enabled) {
            return false;
        }
        const startTime = this.parseTime(workingHours[dayName].start);
        const endTime = this.parseTime(workingHours[dayName].end);
        return currentTime >= startTime && currentTime <= endTime;
    }
    parseTime(timeStr) {
        if (!timeStr)
            return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    async getFollowupStats(leadId) {
        const logs = await this.prisma.followupLog.findMany({
            where: { leadId },
            orderBy: { sentAt: 'desc' },
        });
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: {
                conversations: {
                    include: {
                        agent: {
                            include: {
                                followups: {
                                    where: { isActive: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        const followupRules = lead?.conversations[0]?.agent?.followups?.length || 0;
        return {
            totalSent: logs.length,
            lastSentAt: logs[0]?.sentAt || null,
            followupRules,
        };
    }
};
exports.AgentFollowupService = AgentFollowupService;
exports.AgentFollowupService = AgentFollowupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_integration_service_1.WhatsAppIntegrationService,
        openai_service_1.OpenAIService])
], AgentFollowupService);
//# sourceMappingURL=agent-followup.service.js.map