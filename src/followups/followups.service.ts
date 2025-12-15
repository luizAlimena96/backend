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
              organization: true,
            },
          },
        },
      });

      console.log(`[Followups Service] Found ${activeFollowups.length} active followup rules`);

      let processedCount = 0;

      // For each followup rule, check conversations that match conditions
      for (const followup of activeFollowups) {
        try {
          // Query conversations that might need follow-up
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

          // Check each conversation against followup conditions
          for (const conversation of conversations) {
            const lastMessage = conversation.messages[0];
            if (!lastMessage) continue;

            // Calculate time since last message
            const hoursSinceLastMessage =
              (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);

            // Check if followup is due
            if (hoursSinceLastMessage >= followup.delayHours) {
              console.log(`[Followups Service] Follow-up due for conversation ${conversation.id}`);

              try {
                const instanceName = followup.agent.instance;
                const recipient = conversation.whatsapp;

                // Send followup message
                if (followup.mediaType === 'text') {
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
                processedCount++;
              } catch (sendError) {
                console.error(`[Followups Service] ❌ Error sending follow-up:`, sendError);
              }
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
}
