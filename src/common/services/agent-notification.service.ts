import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AgentNotificationService {
    constructor(private prisma: PrismaService) { }

    async checkAndTriggerNotifications(leadId: string, newState: string): Promise<void> {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: { agent: true },
        });

        if (!lead) return;

        // Check if state requires notification
        const state = await this.prisma.state.findFirst({
            where: {
                agentId: lead.agentId,
                name: newState,
            },
        });

        if (!state) return;

        // Create notification for important states
        const importantStates = ['QUALIFIED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT'];

        if (importantStates.includes(newState)) {
            await this.createNotification({
                leadId,
                type: 'STATE_CHANGE',
                message: `Lead ${lead.name} mudou para estado: ${newState}`,
                organizationId: lead.organizationId,
            });
        }
    }

    private async createNotification(data: {
        leadId: string;
        type: string;
        message: string;
        organizationId: string;
    }): Promise<void> {
        // Log notification (could be sent via email, push, etc.)
        console.log('[Notification]', data);

        // Could create a notification record in DB
        // await this.prisma.notification.create({ data });
    }
}
