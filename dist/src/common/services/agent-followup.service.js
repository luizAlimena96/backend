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
let AgentFollowupService = class AgentFollowupService {
    prisma;
    whatsappService;
    constructor(prisma, whatsappService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
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
                                console.log(`[Agent Followup] Outside working hours, skipping followup`);
                                continue;
                            }
                        }
                        await this.executeFollowupForConversation(conversation.id, followupRule.id, lead.id);
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
    async executeFollowupForConversation(conversationId, followupId, leadId) {
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
            if (followup.mediaType === 'text' || !followup.mediaType) {
                await this.whatsappService.sendMessage(instanceName, recipient, followup.message);
            }
            else if (followup.mediaType === 'media' && followup.mediaUrl) {
                await this.whatsappService.sendMedia(instanceName, recipient, followup.mediaUrl, followup.message);
            }
            if (leadId) {
                await this.prisma.followupLog.create({
                    data: {
                        leadId,
                        followupId,
                        message: followup.message,
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
        whatsapp_integration_service_1.WhatsAppIntegrationService])
], AgentFollowupService);
//# sourceMappingURL=agent-followup.service.js.map