import { Injectable } from '@nestjs/common';

export interface CRMSyncJob {
    organizationId: string;
    type: 'sync' | 'cleanup';
}

export const CRM_SYNC_QUEUE = 'crm-sync';

export const CRM_SYNC_JOBS = {
    SYNC: 'crm-sync',
    CLEANUP: 'crm-cleanup',
};

@Injectable()
export class CRMSyncJobService {
    async createSyncJob(organizationId: string): Promise<void> {
        console.log('[CRM Sync Job] Created sync job for org:', organizationId);
    }

    async createCleanupJob(organizationId: string): Promise<void> {
        console.log('[CRM Sync Job] Created cleanup job for org:', organizationId);
    }
}
