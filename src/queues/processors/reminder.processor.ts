import { Injectable } from '@nestjs/common';

@Injectable()
export class ReminderProcessor {
    async process(job: any): Promise<void> {
        console.log('[Reminder Processor] Processing job:', job.id);

        // Process reminder
        const { reminderId, leadId, message } = job.data;

        // Send reminder via WhatsApp or email
        console.log(`Sending reminder ${reminderId} to lead ${leadId}: ${message}`);
    }
}
