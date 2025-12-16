import { PrismaService } from '../../database/prisma.service';
import { ZapSignService } from '../../integrations/zapsign/zapsign.service';
export declare class CRMAutomationService {
    private prisma;
    private zapSignService;
    constructor(prisma: PrismaService, zapSignService: ZapSignService);
    executeAutomationsForState(leadId: string, stageId: string): Promise<void>;
    private handleZapSignTrigger;
    private resolveValue;
    createAutomation(data: any): Promise<any>;
}
