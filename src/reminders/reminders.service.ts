import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { WhatsAppIntegrationService } from "../integrations/whatsapp/whatsapp-integration.service";

@Injectable()
export class RemindersService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppIntegrationService,
  ) { }

  async findAll(agentId: string) {
    return this.prisma.reminder.findMany({
      where: { agentId },
      orderBy: { scheduledFor: "asc" },
    });
  }

  async create(data: any) {
    return this.prisma.reminder.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.reminder.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.reminder.delete({ where: { id } });
    return { success: true };
  }

  async sendPendingReminders() {
    console.log('[Reminders Service] Checking for pending reminders...');

    try {
      // Query reminders that are due and active
      const now = new Date();
      const pendingReminders = await this.prisma.reminder.findMany({
        where: {
          scheduledFor: { lte: now },
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

      console.log(`[Reminders Service] Found ${pendingReminders.length} pending reminders`);

      let successCount = 0;
      let errorCount = 0;

      // Process each reminder
      for (const reminder of pendingReminders) {
        try {
          console.log(`[Reminders Service] Processing reminder: ${reminder.id}`);

          const instanceName = reminder.agent.instance;

          // Send to each recipient
          for (const recipient of reminder.recipients) {
            try {
              if (reminder.mediaType === 'text') {
                await this.whatsappService.sendMessage(instanceName, recipient, reminder.message);
              } else if (reminder.mediaType === 'media' && reminder.message) {
                await this.whatsappService.sendMedia(instanceName, recipient, reminder.message, reminder.title);
              }
              console.log(`[Reminders Service] ✅ Sent to ${recipient}`);
            } catch (sendError) {
              console.error(`[Reminders Service] ❌ Failed to send to ${recipient}:`, sendError);
            }
          }

          // Deactivate reminder after processing
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { isActive: false },
          });

          successCount++;
          console.log(`[Reminders Service] ✅ Processed reminder ${reminder.id}`);
        } catch (error) {
          errorCount++;
          console.error(`[Reminders Service] ❌ Error processing reminder ${reminder.id}:`, error);
        }
      }

      console.log(`[Reminders Service] Completed: ${successCount} success, ${errorCount} errors`);

      return {
        processed: pendingReminders.length,
        success: successCount,
        errors: errorCount,
      };
    } catch (error) {
      console.error('[Reminders Service] Error in sendPendingReminders:', error);
      throw error;
    }
  }
}
