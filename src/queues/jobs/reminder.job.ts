import { Injectable } from '@nestjs/common';

export interface ReminderJob {
    reminderId: string;
    leadId: string;
    message: string;
    scheduledFor: Date;
}

@Injectable()
export class ReminderJobService {
    async createReminderJob(data: ReminderJob): Promise<void> {
        console.log('[Reminder Job] Created:', data);
        // Queue implementation would go here
    }

    async processReminder(job: ReminderJob): Promise<void> {
        console.log('[Reminder Job] Processing:', job);
        // Send reminder logic
    }
}
