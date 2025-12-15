import { PrismaService } from '../database/prisma.service';
import { GoogleCalendarService } from '../integrations/google/google-calendar.service';
export declare class CalendarService {
    private prisma;
    private googleCalendarService;
    constructor(prisma: PrismaService, googleCalendarService: GoogleCalendarService);
    getGoogleEvents(agentId: string): Promise<{
        id: any;
        summary: any;
        description: any;
        location: any;
        startTime: any;
        endTime: any;
    }[]>;
}
