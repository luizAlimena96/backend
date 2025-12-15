import { Injectable } from '@nestjs/common';

@Injectable()
export class AutomationProcessor {
    async process(job: any): Promise<void> {
        console.log('[Automation Processor] Processing job:', job.id);

        const { automationId, leadId, actionType } = job.data;

        console.log(`Executing automation ${automationId} for lead ${leadId}: ${actionType}`);
    }
}
