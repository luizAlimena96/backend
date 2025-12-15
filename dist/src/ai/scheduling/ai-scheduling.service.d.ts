import { SchedulingService } from '../../common/services/scheduling.service';
export declare class AISchedulingService {
    private schedulingService;
    constructor(schedulingService: SchedulingService);
    scheduleFromAI(data: {
        leadId: string;
        title: string;
        date: string;
        time: string;
        organizationId: string;
    }): Promise<any>;
    private parseDateTime;
}
