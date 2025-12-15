import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../database/prisma.service';
import { CRMSyncJob } from '../jobs/crm-sync.job';
export declare class CRMSyncProcessor extends WorkerHost {
    private readonly prisma;
    private readonly httpService;
    private readonly logger;
    constructor(prisma: PrismaService, httpService: HttpService);
    process(job: Job<CRMSyncJob>): Promise<void>;
    private syncCRMCalendar;
    private fetchCRMEvents;
    private normalizeCRMEvents;
    private calculateDuration;
    private addMinutes;
    private cleanupOldCRMEvents;
}
