import { PrismaService } from '../../database/prisma.service';
import { ZapSignService } from '../../integrations/zapsign/zapsign.service';
import { SchedulingToolsService } from '../../ai/tools/scheduling-tools.service';
import { WhatsAppIntegrationService } from '../../integrations/whatsapp/whatsapp-integration.service';
import { OpenAIService } from '../../ai/services/openai.service';
export declare class CRMAutomationService {
    private prisma;
    private zapSignService;
    private schedulingToolsService;
    private whatsappService;
    private openaiService;
    constructor(prisma: PrismaService, zapSignService: ZapSignService, schedulingToolsService: SchedulingToolsService, whatsappService: WhatsAppIntegrationService, openaiService: OpenAIService);
    executeAutomationsForState(leadId: string, stageId: string): Promise<void>;
    private handleAutoScheduling;
    private handleZapSignTrigger;
    private resolveValue;
    createAutomation(data: any): Promise<any>;
}
