import { PrismaService } from '../../database/prisma.service';
export declare class CRMWebhookService {
    private prisma;
    constructor(prisma: PrismaService);
    processEvent(event: string, organizationId: string, data: any): Promise<void>;
    private triggerWebhook;
    private buildPayload;
}
