import { Injectable } from '@nestjs/common';

@Injectable()
export class FollowupProcessor {
    async process(job: any): Promise<void> {
        console.log('[Followup Processor] Processing job:', job.id);

        const { followupId, leadId, message } = job.data;

        console.log(`Sending followup ${followupId} to lead ${leadId}: ${message}`);
    }
}
