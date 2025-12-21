import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { EvolutionAPIService } from '../../integrations/evolution/evolution-api.service';

@Injectable()
export class RemindersScheduler {
    constructor(
        private prisma: PrismaService,
        private evolutionService: EvolutionAPIService
    ) { }

    /**
     * Check for pending reminders every 5 minutes
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async processReminders() {
        console.log('[Reminders Scheduler] Processing pending reminders...');

        try {
            // 1. Get all pending reminders that are due
            const now = new Date();
            const pendingReminders = await this.prisma.appointmentReminder.findMany({
                where: {
                    status: 'PENDING',
                    scheduledFor: {
                        lte: now
                    }
                },
                include: {
                    appointment: {
                        include: {
                            lead: {
                                include: {
                                    organization: true
                                }
                            }
                        }
                    }
                },
                take: 50 // Process in batches
            });

            if (pendingReminders.length === 0) {
                console.log('[Reminders Scheduler] No pending reminders found.');
                return;
            }

            console.log(`[Reminders Scheduler] Found ${pendingReminders.length} reminders to process.`);

            for (const reminder of pendingReminders) {
                await this.processReminder(reminder);
            }

        } catch (error) {
            console.error('[Reminders Scheduler] Error processing reminders:', error);
        }
    }

    private async processReminder(reminder: any) {
        try {
            const { appointment } = reminder;

            // DEBUG: Log reminder processing details
            console.log('[Reminders Scheduler] 🔍 DEBUG - Processing reminder:');
            console.log('[Reminders Scheduler]   - reminderId:', reminder.id);
            console.log('[Reminders Scheduler]   - type:', reminder.type);
            console.log('[Reminders Scheduler]   - recipient:', reminder.recipient);
            console.log('[Reminders Scheduler]   - scheduledFor:', reminder.scheduledFor);
            console.log('[Reminders Scheduler]   - message preview:', reminder.message?.substring(0, 50) + '...');
            console.log('[Reminders Scheduler]   - appointmentId:', appointment?.id);
            console.log('[Reminders Scheduler]   - leadId:', appointment?.lead?.id);
            console.log('[Reminders Scheduler]   - leadName:', appointment?.lead?.name);

            if (!appointment || !appointment.lead || !appointment.lead.organization) {
                console.log('[Reminders Scheduler] ❌ Missing appointment, lead or organization');
                await this.updateStatus(reminder.id, 'FAILED', 'Appointment, Lead or Organization not found');
                return;
            }

            const organization = appointment.lead.organization;
            const instanceName = organization.evolutionInstanceName;

            console.log('[Reminders Scheduler]   - instanceName:', instanceName);

            if (!instanceName) {
                console.log('[Reminders Scheduler] ❌ No Evolution instance configured');
                await this.updateStatus(reminder.id, 'FAILED', 'Evolution Instance Name not configured for organization');
                return;
            }

            // 2. Check Sending Window
            const isWithin = await this.isWithinWindow(appointment.lead.agentId);
            console.log('[Reminders Scheduler]   - isWithinWindow:', isWithin);

            if (!isWithin) {
                // If it's "late night" (outside window), we skip sending NOW but keep it PENDING.
                // It will be picked up again when the window opens (and scheduledFor matches "lte now" rule).
                // "No primeiro momento libera tudo": Since scheduledFor < now, it will be sent immediately once window opens.
                console.log(`[Reminders Scheduler] ⏰ Reminder ${reminder.id} skipped - Outside sending window.`);
                return;
            }

            // 3. Send Message
            console.log(`[Reminders Scheduler] 📤 Sending reminder ${reminder.id} to ${reminder.recipient}...`);

            // Format phone (remove non-digits)
            const phone = reminder.recipient.replace(/\D/g, '');

            const sendResult = await this.evolutionService.sendMessage(
                instanceName,
                phone,
                reminder.message
            );

            console.log('[Reminders Scheduler] ✅ Message sent, result:', JSON.stringify(sendResult).substring(0, 200));

            // 4. Update Status
            await this.updateStatus(reminder.id, 'SENT');
            console.log('[Reminders Scheduler] ✅ Reminder status updated to SENT');

        } catch (error: any) {
            console.error(`[Reminders Scheduler] ❌ Failed to process reminder ${reminder.id}:`, error);
            console.error('[Reminders Scheduler]   - Error message:', error.message);
            console.error('[Reminders Scheduler]   - Error stack:', error.stack?.substring(0, 200));
            await this.updateStatus(reminder.id, 'FAILED', error.message);
        }
    }

    private async isWithinWindow(agentId: string): Promise<boolean> {
        // Find config for this agent (simplified lookup)
        // Ideally we would look up by appointment->lead->crmStageId, but for now looking for ANY active config for this agent serves as proxy
        // Or better: look up the specific config associated with the reminder if we tracked `reminderConfigId` better, 
        // but `autoSchedulingConfig` is per stage.

        // Let's rely on the Reminder -> Appointment -> Lead -> Agent
        // We need to find the AutoSchedulingConfig that applies.
        // For simplicity, we can fetch the window from ANY active config for this agent, OR default to 08:00-22:00.

        // Fetch config
        const config = await this.prisma.autoSchedulingConfig.findFirst({
            where: { agentId, isActive: true }
        });

        const start = config?.reminderWindowStart || '08:00';
        const end = config?.reminderWindowEnd || '22:00';

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [startHour, startMinute] = start.split(':').map(Number);
        const startTime = startHour * 60 + startMinute;

        const [endHour, endMinute] = end.split(':').map(Number);
        const endTime = endHour * 60 + endMinute;

        return currentTime >= startTime && currentTime <= endTime;
    }

    private async updateStatus(id: string, status: string, error?: string) {
        await this.prisma.appointmentReminder.update({
            where: { id },
            data: {
                status,
                sentAt: status === 'SENT' ? new Date() : undefined
            }
        });
    }
}
