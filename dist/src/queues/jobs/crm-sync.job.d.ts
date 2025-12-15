export interface CRMSyncJob {
    organizationId: string;
    type: 'sync' | 'cleanup';
}
export declare const CRM_SYNC_QUEUE = "crm-sync";
export declare const CRM_SYNC_JOBS: {
    SYNC: string;
    CLEANUP: string;
};
export declare class CRMSyncJobService {
    createSyncJob(organizationId: string): Promise<void>;
    createCleanupJob(organizationId: string): Promise<void>;
}
