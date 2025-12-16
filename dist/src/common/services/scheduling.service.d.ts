import { PrismaService } from '../../database/prisma.service';
import { GoogleCalendarService } from '../../integrations/google/google-calendar.service';
export declare class SchedulingService {
    private prisma;
    private googleCalendarService;
    constructor(prisma: PrismaService, googleCalendarService: GoogleCalendarService);
    createAppointment(data: {
        leadId: string;
        title: string;
        scheduledAt: Date;
        duration?: number;
        type?: string;
        notes?: string;
        organizationId: string;
    }): Promise<any>;
    private replaceVariables;
    getAvailableSlots(organizationId: string, date: Date): Promise<Array<{
        time: Date;
        available: boolean;
    }>>;
    cancelAppointment(id: string): Promise<any>;
    rescheduleAppointment(id: string, newDate: Date): Promise<any>;
}
