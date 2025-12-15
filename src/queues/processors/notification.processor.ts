import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationProcessor {
    async process(job: any): Promise<void> {
        console.log('[Notification Processor] Processing job:', job.id);

        const { type, recipient, message } = job.data;

        console.log(`Sending ${type} notification to ${recipient}: ${message}`);
    }
}
