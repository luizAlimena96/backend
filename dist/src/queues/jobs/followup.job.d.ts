export interface FollowupJob {
    followupId: string;
    leadId: string;
    message: string;
}
export declare class FollowupJobService {
    createFollowupJob(data: FollowupJob): Promise<void>;
    processFollowup(job: FollowupJob): Promise<void>;
}
