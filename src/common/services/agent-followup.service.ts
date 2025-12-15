import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppIntegrationService } from '../../integrations/whatsapp/whatsapp-integration.service';

@Injectable()
export class AgentFollowupService {
    constructor(
        private prisma: PrismaService,
        private whatsappService: WhatsAppIntegrationService
    ) { }

    /**
     * Check if a lead needs followup and create followup tasks
     */
    async checkAndCreateFollowups(leadId: string): Promise<void> {
        console.log(`[Agent Followup] Checking followups for lead: ${leadId}`);

        try {
            // Get lead with conversation and agent
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

            // Check each conversation
            for (const conversation of lead.conversations) {
                const lastMessage = conversation.messages[0];
                if (!lastMessage) continue;

                const agent = conversation.agent;
                if (!agent || !agent.followups || agent.followups.length === 0) {
                    continue;
                }

                // Calculate time since last message
                const hoursSinceLastMessage =
                    (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);

                // Check each followup rule
                for (const followupRule of agent.followups) {
                    // Check if followup is due
                    if (hoursSinceLastMessage >= followupRule.delayHours) {
                        // Check if followup already sent recently
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

                        // Check working hours if needed
                        if (agent.organization?.workingHours) {
                            const isWithinWorkingHours = this.checkWorkingHours(
                                agent.organization.workingHours
                            );

                            if (!isWithinWorkingHours) {
                                console.log(`[Agent Followup] Outside working hours, skipping followup`);
                                continue;
                            }
                        }

                        // Execute followup
                        await this.executeFollowupForConversation(
                            conversation.id,
                            followupRule.id,
                            lead.id
                        );
                    }
                }
            }
        } catch (error) {
            console.error(`[Agent Followup] Error checking followups for lead ${leadId}:`, error);
        }
    }

    /**
     * Execute a specific followup
     */
    async executeFollowup(followupId: string): Promise<void> {
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

            // Find conversations that need this followup
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
                if (!lastMessage) continue;

                const hoursSinceLastMessage =
                    (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);

                if (hoursSinceLastMessage >= followup.delayHours) {
                    await this.executeFollowupForConversation(
                        conversation.id,
                        followupId,
                        conversation.leadId
                    );
                }
            }
        } catch (error) {
            console.error(`[Agent Followup] Error executing followup ${followupId}:`, error);
        }
    }

    /**
     * Execute followup for a specific conversation
     */
    private async executeFollowupForConversation(
        conversationId: string,
        followupId: string,
        leadId: string | null
    ): Promise<void> {
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

            // Send followup message
            if (followup.mediaType === 'text' || !followup.mediaType) {
                await this.whatsappService.sendMessage(instanceName, recipient, followup.message);
            } else if (followup.mediaType === 'media' && followup.mediaUrl) {
                await this.whatsappService.sendMedia(
                    instanceName,
                    recipient,
                    followup.mediaUrl,
                    followup.message
                );
            }

            // Log the followup
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
        } catch (error) {
            console.error(`[Agent Followup] Error sending followup:`, error);
            throw error;
        }
    }

    /**
     * Check if current time is within working hours
     */
    private checkWorkingHours(workingHours: any): boolean {
        if (!workingHours) return true;

        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        // Map day names
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[currentDay];

        // Check if day is enabled
        if (!workingHours[dayName]?.enabled) {
            return false;
        }

        // Parse start and end times
        const startTime = this.parseTime(workingHours[dayName].start);
        const endTime = this.parseTime(workingHours[dayName].end);

        // Check if current time is within range
        return currentTime >= startTime && currentTime <= endTime;
    }

    /**
     * Parse time string (HH:MM) to minutes
     */
    private parseTime(timeStr: string): number {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Get followup statistics for a lead
     */
    async getFollowupStats(leadId: string): Promise<{
        totalSent: number;
        lastSentAt: Date | null;
        followupRules: number;
    }> {
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
}
