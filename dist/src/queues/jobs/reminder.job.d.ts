export interface ReminderJob {
    reminderId: string;
    leadId: string;
    message: string;
    scheduledFor: Date;
}
export declare class ReminderJobService {
    createReminderJob(data: ReminderJob): Promise<void>;
    processReminder(job: ReminderJob): Promise<void>;
}
