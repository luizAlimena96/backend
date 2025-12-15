import { CalendarService } from './calendar.service';
export declare class CalendarController {
    private calendarService;
    constructor(calendarService: CalendarService);
    getGoogleEvents(agentId: string): Promise<{
        id: any;
        summary: any;
        description: any;
        location: any;
        startTime: any;
        endTime: any;
    }[]>;
}
