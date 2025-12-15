import { PrismaService } from '../../database/prisma.service';
export declare class AgentFollowupService {
    private prisma;
    constructor(prisma: PrismaService);
    checkAndCreateFollowups(leadId: string): Promise<void>;
    executeFollowup(followupId: string): Promise<void>;
}
