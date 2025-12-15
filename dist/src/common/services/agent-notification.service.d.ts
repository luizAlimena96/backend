import { PrismaService } from '../../database/prisma.service';
export declare class AgentNotificationService {
    private prisma;
    constructor(prisma: PrismaService);
    checkAndTriggerNotifications(leadId: string, newState: string): Promise<void>;
    private createNotification;
}
