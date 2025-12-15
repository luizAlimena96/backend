import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SchedulingService {
    constructor(private prisma: PrismaService) { }

    async createAppointment(data: {
        leadId: string;
        title: string;
        scheduledAt: Date;
        duration?: number;
        type?: string;
        notes?: string;
        organizationId: string;
    }): Promise<any> {
        return this.prisma.appointment.create({
            data: {
                leadId: data.leadId,
                title: data.title,
                scheduledAt: data.scheduledAt,
                duration: data.duration || 60,
                type: data.type || 'MEETING',
                notes: data.notes,
                organizationId: data.organizationId,
                status: 'SCHEDULED',
            },
        });
    }

    async getAvailableSlots(organizationId: string, date: Date): Promise<Array<{ time: Date; available: boolean }>> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const appointments = await this.prisma.appointment.findMany({
            where: {
                organizationId,
                scheduledAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                status: { not: 'CANCELLED' },
            },
        });

        const slots: Array<{ time: Date; available: boolean }> = [];
        for (let hour = 9; hour < 18; hour++) {
            const slotTime = new Date(date);
            slotTime.setHours(hour, 0, 0, 0);

            const isBooked = appointments.some(apt =>
                apt.scheduledAt.getTime() === slotTime.getTime()
            );

            if (!isBooked) {
                slots.push({ time: slotTime, available: true });
            }
        }

        return slots;
    }

    async cancelAppointment(id: string): Promise<any> {
        return this.prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }

    async rescheduleAppointment(id: string, newDate: Date): Promise<any> {
        return this.prisma.appointment.update({
            where: { id },
            data: { scheduledAt: newDate },
        });
    }
}
