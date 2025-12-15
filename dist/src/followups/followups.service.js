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
exports.FollowupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const whatsapp_integration_service_1 = require("../integrations/whatsapp/whatsapp-integration.service");
let FollowupsService = class FollowupsService {
    prisma;
    whatsappService;
    constructor(prisma, whatsappService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
    }
    async findAll(agentId) {
        return this.prisma.followup.findMany({
            where: { agentId },
            orderBy: { createdAt: "desc" },
        });
    }
    async findOne(id) {
        return this.prisma.followup.findUnique({
            where: { id },
            include: { logs: true },
        });
    }
    async create(data) {
        return this.prisma.followup.create({ data });
    }
    async update(id, data) {
        return this.prisma.followup.update({ where: { id }, data });
    }
    async delete(id) {
        await this.prisma.followup.delete({ where: { id } });
        return { success: true };
    }
    async checkAgentFollowUps() {
        console.log('[Followups Service] Checking for pending follow-ups...');
        try {
            const activeFollowups = await this.prisma.followup.findMany({
                where: {
                    isActive: true,
                },
                include: {
                    agent: {
                        include: {
                            organization: {
                                select: {
                                    workingHours: true,
                                },
                            },
                        },
                    },
                },
            });
            console.log(`[Followups Service] Found ${activeFollowups.length} active followup rules`);
            let processedCount = 0;
            for (const followup of activeFollowups) {
                try {
                    const eligibleConversations = await this.getFollowupEligibleConversations(followup);
                    console.log(`[Followups Service] Found ${eligibleConversations.length} eligible conversations for followup ${followup.id}`);
                    for (const conversation of eligibleConversations) {
                        try {
                            const shouldSend = await this.checkFollowupConditions(conversation, followup);
                            if (shouldSend) {
                                await this.sendFollowup(conversation, followup);
                                processedCount++;
                            }
                        }
                        catch (error) {
                            console.error(`[Followups Service] Error processing conversation ${conversation.id}:`, error);
                        }
                    }
                }
                catch (error) {
                    console.error(`[Followups Service] Error processing followup ${followup.id}:`, error);
                }
            }
            console.log(`[Followups Service] Processed ${processedCount} follow-ups`);
            return {
                processed: processedCount,
                rulesChecked: activeFollowups.length,
            };
        }
        catch (error) {
            console.error('[Followups Service] Error in checkAgentFollowUps:', error);
            throw error;
        }
    }
    async getFollowupEligibleConversations(followup) {
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
                lead: {
                    select: {
                        id: true,
                        status: true,
                        currentState: true,
                        extractedData: true,
                    },
                },
            },
        });
        return conversations.filter(conv => conv.messages.length > 0);
    }
    async checkFollowupConditions(conversation, followup) {
        const lastMessage = conversation.messages[0];
        if (!lastMessage)
            return false;
        const hoursSinceLastMessage = (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastMessage < followup.delayHours) {
            return false;
        }
        if (conversation.lead?.status === 'inactive' || conversation.lead?.status === 'converted') {
            console.log(`[Followups Service] Lead ${conversation.leadId} is ${conversation.lead.status}, skipping`);
            return false;
        }
        if (conversation.leadId) {
            const recentFollowup = await this.prisma.followupLog.findFirst({
                where: {
                    leadId: conversation.leadId,
                    followupId: followup.id,
                    sentAt: {
                        gte: new Date(Date.now() - followup.delayHours * 60 * 60 * 1000),
                    },
                },
            });
            if (recentFollowup) {
                console.log(`[Followups Service] Followup already sent recently to lead ${conversation.leadId}`);
                return false;
            }
            const followupCount = await this.prisma.followupLog.count({
                where: {
                    leadId: conversation.leadId,
                    followupId: followup.id,
                },
            });
            const maxFollowups = 3;
            if (followupCount >= maxFollowups) {
                console.log(`[Followups Service] Max followups (${maxFollowups}) reached for lead ${conversation.leadId}`);
                return false;
            }
        }
        if (followup.agent?.organization?.workingHours) {
            const isWithinWorkingHours = this.checkWorkingHours(followup.agent.organization.workingHours);
            if (!isWithinWorkingHours) {
                console.log(`[Followups Service] Outside working hours, skipping`);
                return false;
            }
        }
        return true;
    }
    async sendFollowup(conversation, followup) {
        try {
            const instanceName = followup.agent.instance;
            const recipient = conversation.whatsapp;
            if (followup.mediaType === 'text' || !followup.mediaType) {
                await this.whatsappService.sendMessage(instanceName, recipient, followup.message);
            }
            else if (followup.mediaType === 'media' && followup.mediaUrl) {
                await this.whatsappService.sendMedia(instanceName, recipient, followup.mediaUrl, followup.message);
            }
            if (conversation.leadId) {
                await this.prisma.followupLog.create({
                    data: {
                        leadId: conversation.leadId,
                        followupId: followup.id,
                        message: followup.message,
                    },
                });
            }
            console.log(`[Followups Service] ✅ Sent follow-up to ${recipient}`);
        }
        catch (error) {
            console.error(`[Followups Service] ❌ Error sending follow-up:`, error);
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
};
exports.FollowupsService = FollowupsService;
exports.FollowupsService = FollowupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_integration_service_1.WhatsAppIntegrationService])
], FollowupsService);
//# sourceMappingURL=followups.service.js.map