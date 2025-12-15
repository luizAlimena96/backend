import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
export declare class CRMSyncScheduler {
    private crmSyncQueue;
    private readonly prisma;
    private readonly logger;
    constructor(crmSyncQueue: Queue, prisma: PrismaService);
    handleCRMSync(): Promise<void>;
    handleCRMCleanup(): Promise<void>;
}
