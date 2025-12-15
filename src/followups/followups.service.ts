import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { WhatsAppIntegrationService } from "../integrations/whatsapp/whatsapp-integration.service";

@Injectable()
export class FollowupsService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppIntegrationService,
  ) { }

  async findAll(agentId: string) {
    return this.prisma.followup.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.followup.findUnique({
      where: { id },
      include: { logs: true },
    });
  }

  async create(data: any) {
    return this.prisma.followup.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.followup.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.followup.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Check and send followups for all active rules
   */
  async checkAgentFollowUps() {
    console.log('[Followups Service] Checking for pending follow-ups...');

    try {
      // Query active followups
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

      // For each followup rule, check conversations that match conditions
      for (const followup of activeFollowups) {
        try {
          const eligibleConversations = await this.getFollowupEligibleConversations(followup);

          console.log(`[Followups Service] Found ${eligibleConversations.length} eligible conversations for followup ${followup.id}`);

          // Send followup to each eligible conversation
          for (const conversation of eligibleConversations) {
            try {
              const shouldSend = await this.checkFollowupConditions(conversation, followup);

              if (shouldSend) {
                await this.sendFollowup(conversation, followup);
                processedCount++;
              }
            } catch (error) {
              console.error(`[Followups Service] Error processing conversation ${conversation.id}:`, error);
            }
          }
        } catch (error) {
          console.error(`[Followups Service] Error processing followup ${followup.id}:`, error);
        }
      }

      console.log(`[Followups Service] Processed ${processedCount} follow-ups`);

      return {
        processed: processedCount,
        rulesChecked: activeFollowups.length,
      };
    } catch (error) {
      console.error('[Followups Service] Error in checkAgentFollowUps:', error);
      throw error;
    }
  }

  /**
   * Get conversations eligible for a specific followup rule
   */
  private async getFollowupEligibleConversations(followup: any) {
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

    // Filter conversations that have messages
    return conversations.filter(conv => conv.messages.length > 0);
  }

  /**
   * Check if followup should be sent for a conversation
   */
  private async checkFollowupConditions(
    conversation: any,
    followup: any
  ): Promise<boolean> {
    const lastMessage = conversation.messages[0];
    if (!lastMessage) return false;

    // 1. Check time delay
    const hoursSinceLastMessage =
      (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastMessage < followup.delayHours) {
      return false;
    }

    // 2. Check if lead is active
    if (conversation.lead?.status === 'inactive' || conversation.lead?.status === 'converted') {
      console.log(`[Followups Service] Lead ${conversation.leadId} is ${conversation.lead.status}, skipping`);
      return false;
    }

    // 3. Check if followup already sent recently
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

      // 4. Check max followups per lead (prevent spam)
      const followupCount = await this.prisma.followupLog.count({
        where: {
          leadId: conversation.leadId,
          followupId: followup.id,
        },
      });

      const maxFollowups = 3; // TODO: Make this configurable
      if (followupCount >= maxFollowups) {
        console.log(`[Followups Service] Max followups (${maxFollowups}) reached for lead ${conversation.leadId}`);
        return false;
      }
    }

    // 5. Check working hours
    if (followup.agent?.organization?.workingHours) {
      const isWithinWorkingHours = this.checkWorkingHours(
        followup.agent.organization.workingHours
      );

      if (!isWithinWorkingHours) {
        console.log(`[Followups Service] Outside working hours, skipping`);
        return false;
      }
    }

    return true;
  }

  /**
   * Send followup message
   */
  private async sendFollowup(conversation: any, followup: any): Promise<void> {
    try {
      const instanceName = followup.agent.instance;
      const recipient = conversation.whatsapp;

      // Send message
      if (followup.mediaType === 'text' || !followup.mediaType) {
        await this.whatsappService.sendMessage(instanceName, recipient, followup.message);
      } else if (followup.mediaType === 'media' && followup.mediaUrl) {
        await this.whatsappService.sendMedia(instanceName, recipient, followup.mediaUrl, followup.message);
      }

      // Log the followup
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
    } catch (error) {
      console.error(`[Followups Service] ❌ Error sending follow-up:`, error);
      throw error;
    }
  }

  /**
   * Check if current time is within working hours
   */
  private checkWorkingHours(workingHours: any): boolean {
    if (!workingHours) return true;

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

  /**
   * Parse time string to minutes
   */
  private parseTime(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
