import { PrismaService } from '../../database/prisma.service';
export declare class CRMAutomationService {
    private prisma;
    constructor(prisma: PrismaService);
    executeAutomationsForState(leadId: string, stateName: string): Promise<void>;
    createAutomation(data: any): Promise<any>;
}
