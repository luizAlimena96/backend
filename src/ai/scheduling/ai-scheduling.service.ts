import { Injectable } from '@nestjs/common';
import { SchedulingService } from '../../common/services/scheduling.service';

@Injectable()
export class AISchedulingService {
    constructor(private schedulingService: SchedulingService) { }

    async scheduleFromAI(data: {
        leadId: string;
        title: string;
        date: string;
        time: string;
        organizationId: string;
    }): Promise<any> {
        // Parse date and time
        const scheduledAt = this.parseDateTime(data.date, data.time);

        return this.schedulingService.createAppointment({
            leadId: data.leadId,
            title: data.title,
            scheduledAt,
            organizationId: data.organizationId,
        });
    }

    private parseDateTime(date: string, time: string): Date {
        // Simple parsing - in production, use a proper date library
        const now = new Date();
        const [hours, minutes] = time.split(':');

        const scheduledDate = new Date(now);
        scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        return scheduledDate;
    }
}
