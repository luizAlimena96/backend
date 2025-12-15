import { PrismaService } from '../../database/prisma.service';
import { WhatsAppIntegrationService } from '../../integrations/whatsapp/whatsapp-integration.service';
export declare class AgentFollowupService {
    private prisma;
    private whatsappService;
    constructor(prisma: PrismaService, whatsappService: WhatsAppIntegrationService);
    checkAndCreateFollowups(leadId: string): Promise<void>;
    executeFollowup(followupId: string): Promise<void>;
    private executeFollowupForConversation;
    private checkWorkingHours;
    private parseTime;
    getFollowupStats(leadId: string): Promise<{
        totalSent: number;
        lastSentAt: Date | null;
        followupRules: number;
    }>;
}
