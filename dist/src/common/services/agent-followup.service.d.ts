import { PrismaService } from '../../database/prisma.service';
import { WhatsAppIntegrationService } from '../../integrations/whatsapp/whatsapp-integration.service';
import { OpenAIService } from '../../ai/services/openai.service';
export declare class AgentFollowupService {
    private prisma;
    private whatsappService;
    private openaiService;
    constructor(prisma: PrismaService, whatsappService: WhatsAppIntegrationService, openaiService: OpenAIService);
    checkAndCreateFollowups(leadId: string): Promise<void>;
    executeFollowup(followupId: string): Promise<void>;
    private executeFollowupForConversation;
    private generateAIResponse;
    private checkWorkingHours;
    private parseTime;
    getFollowupStats(leadId: string): Promise<{
        totalSent: number;
        lastSentAt: Date | null;
        followupRules: number;
    }>;
}
