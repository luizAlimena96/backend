import { Injectable } from '@nestjs/common';

export interface FollowupJob {
    followupId: string;
    leadId: string;
    message: string;
}

@Injectable()
export class FollowupJobService {
    async createFollowupJob(data: FollowupJob): Promise<void> {
        console.log('[Followup Job] Created:', data);
    }

    async processFollowup(job: FollowupJob): Promise<void> {
        console.log('[Followup Job] Processing:', job);
    }
}
