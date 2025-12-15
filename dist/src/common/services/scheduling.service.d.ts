import { PrismaService } from '../../database/prisma.service';
export declare class SchedulingService {
    private prisma;
    constructor(prisma: PrismaService);
    createAppointment(data: {
        leadId: string;
        title: string;
        scheduledAt: Date;
        duration?: number;
        type?: string;
        notes?: string;
        organizationId: string;
    }): Promise<any>;
    getAvailableSlots(organizationId: string, date: Date): Promise<Array<{
        time: Date;
        available: boolean;
    }>>;
    cancelAppointment(id: string): Promise<any>;
    rescheduleAppointment(id: string, newDate: Date): Promise<any>;
}
