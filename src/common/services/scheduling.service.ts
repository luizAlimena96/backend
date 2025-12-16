import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoogleCalendarService } from '../../integrations/google/google-calendar.service';

@Injectable()
export class SchedulingService {
    constructor(
        private prisma: PrismaService,
        private googleCalendarService: GoogleCalendarService
    ) { }

    async createAppointment(data: {
        leadId: string;
        title: string;
        scheduledAt: Date;
        duration?: number;
        type?: string;
        notes?: string;
        organizationId: string;
    }): Promise<any> {
        let appointment = await this.prisma.appointment.create({
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

        // 1. Google Calendar Sync
        try {
            // Fetch Lead + Agent to get Google Credentials
            const lead = await this.prisma.lead.findUnique({
                where: { id: data.leadId },
                include: { agent: true }
            });

            if (lead?.agent?.googleAccessToken && lead?.agent?.googleCalendarId) {
                console.log(`[Scheduling] Syncing appointment ${appointment.id} to Google Calendar of agent ${lead.agent.name}`);

                const startTime = new Date(data.scheduledAt);
                const endTime = new Date(startTime.getTime() + (appointment.duration * 60000));

                const eventPayload = {
                    summary: `${appointment.title} - ${lead.name}`,
                    description: `Agendamento via LEXA.\nLead: ${lead.name} (${lead.phone})\nNotas: ${data.notes || ''}`,
                    start: { dateTime: startTime.toISOString() },
                    end: { dateTime: endTime.toISOString() },
                };

                const googleEvent = await this.googleCalendarService.createEvent(
                    lead.agent.googleAccessToken,
                    lead.agent.googleCalendarId,
                    eventPayload
                );

                if (googleEvent?.id) {
                    appointment = await this.prisma.appointment.update({
                        where: { id: appointment.id },
                        data: { googleEventId: googleEvent.id }
                    });
                    console.log(`[Scheduling] Google Event created: ${googleEvent.id}`);
                }
            }
        } catch (error) {
            console.error('[Scheduling] Google Calendar Sync Failed:', error);
            // Don't fail the creation, just log
        }

        // 2. Generate Reminders
        try {
            // Re-fetch lead if needed, or use the one from sync block
            const lead = await this.prisma.lead.findUnique({
                where: { id: data.leadId },
                include: { agent: true }
            });

            if (lead?.agent?.id && lead.crmStageId) {
                const config = await this.prisma.autoSchedulingConfig.findFirst({
                    where: {
                        agentId: lead.agent.id,
                        crmStageId: lead.crmStageId, // If stage is not null
                        isActive: true
                    },
                    include: { reminders: true }
                });
                // ... rest of reminder logic handles below ...


                if (config && config.reminders) {
                    const scheduledAt = new Date(data.scheduledAt);

                    for (const reminderConfig of config.reminders) {
                        if (!reminderConfig.isActive) continue;

                        const remindAt = new Date(scheduledAt.getTime() - (reminderConfig.minutesBefore * 60000));

                        // Create reminder for Lead
                        if (reminderConfig.sendToLead) {
                            await this.prisma.appointmentReminder.create({
                                data: {
                                    appointmentId: appointment.id,
                                    scheduledFor: remindAt,
                                    type: 'LEAD',
                                    recipient: lead.phone,
                                    message: this.replaceVariables(reminderConfig.leadMessageTemplate, lead, appointment),
                                    status: 'PENDING'
                                }
                            });
                        }

                        // Create reminder for Team
                        if (reminderConfig.sendToTeam && config.teamPhones) {
                            for (const phone of config.teamPhones) {
                                await this.prisma.appointmentReminder.create({
                                    data: {
                                        appointmentId: appointment.id,
                                        scheduledFor: remindAt,
                                        type: 'TEAM',
                                        recipient: phone,
                                        message: this.replaceVariables(reminderConfig.teamMessageTemplate || 'Lembrete de reunião', lead, appointment),
                                        status: 'PENDING'
                                    }
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error creating reminders:', error);
            // Don't fail the appointment creation
        }

        return appointment;
    }

    private replaceVariables(template: string, lead: any, appointment: any): string {
        let msg = template;
        msg = msg.replace(/{{lead.name}}/g, lead.name || 'Cliente');
        msg = msg.replace(/{{lead.phone}}/g, lead.phone || '');
        msg = msg.replace(/{{appointment.date}}/g, appointment.scheduledAt.toLocaleDateString('pt-BR'));
        msg = msg.replace(/{{appointment.time}}/g, appointment.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        return msg;
    }

    async getAvailableSlots(organizationId: string, date: Date): Promise<Array<{ time: Date; available: boolean }>> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Get organization working hours
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { workingHours: true },
        });

        const workingHours = organization?.workingHours as any;
        if (!workingHours) {
            return []; // No working hours configured
        }

        // 2. Get day of week (MON, TUE, etc.)
        const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
        const dayConfig = workingHours[dayOfWeek];

        if (!dayConfig || !dayConfig.enabled) {
            return []; // Day is not enabled for appointments
        }

        // 3. Get blocked slots for this day
        const blockedSlots = await this.prisma.blockedSlot.findMany({
            where: {
                organizationId,
                OR: [
                    // All day blocks
                    {
                        allDay: true,
                        startTime: { lte: endOfDay },
                        endTime: { gte: startOfDay },
                    },
                    // Specific time blocks
                    {
                        allDay: false,
                        startTime: { gte: startOfDay, lte: endOfDay },
                    },
                ],
            },
        });

        // 4. Get appointments for this day
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

        // 5. Generate available slots based on working hours
        const slots: Array<{ time: Date; available: boolean }> = [];

        for (const shift of dayConfig.shifts || []) {
            const [startHour, startMinute] = shift.start.split(':').map(Number);
            const [endHour, endMinute] = shift.end.split(':').map(Number);

            // Generate 30-minute slots
            let currentTime = new Date(date);
            currentTime.setHours(startHour, startMinute, 0, 0);

            const shiftEnd = new Date(date);
            shiftEnd.setHours(endHour, endMinute, 0, 0);

            while (currentTime < shiftEnd) {
                const slotTime = new Date(currentTime);

                // Check if slot is blocked
                const isBlocked = blockedSlots.some(block => {
                    if (block.allDay) return true;
                    const blockStart = new Date(block.startTime);
                    const blockEnd = new Date(block.endTime);
                    return slotTime >= blockStart && slotTime < blockEnd;
                });

                // Check if slot has an appointment
                const hasAppointment = appointments.some(apt =>
                    Math.abs(apt.scheduledAt.getTime() - slotTime.getTime()) < 60000 // Within 1 minute
                );

                if (!isBlocked && !hasAppointment) {
                    slots.push({ time: slotTime, available: true });
                }

                // Move to next 30-minute slot
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }
        }

        return slots;
    }

    async cancelAppointment(id: string): Promise<any> {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: { lead: { include: { agent: true } } }
        });

        if (appointment && appointment.googleEventId && appointment.lead?.agent?.googleAccessToken && appointment.lead?.agent?.googleCalendarId) {
            try {
                console.log(`[Scheduling] Cancelling Google Event ${appointment.googleEventId}`);
                await this.googleCalendarService.deleteEvent(
                    appointment.lead.agent.googleAccessToken,
                    appointment.lead.agent.googleCalendarId,
                    appointment.googleEventId
                );
            } catch (error) {
                console.error('[Scheduling] Google Calendar Cancel Failed:', error);
            }
        }

        return this.prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }

    async rescheduleAppointment(id: string, newDate: Date): Promise<any> {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: { lead: { include: { agent: true } } }
        });

        if (appointment && appointment.googleEventId && appointment.lead?.agent?.googleAccessToken && appointment.lead?.agent?.googleCalendarId) {
            try {
                console.log(`[Scheduling] Updating Google Event ${appointment.googleEventId} to ${newDate}`);
                const startTime = new Date(newDate);
                const endTime = new Date(startTime.getTime() + (appointment.duration * 60000));

                await this.googleCalendarService.updateEvent(
                    appointment.lead.agent.googleAccessToken,
                    appointment.lead.agent.googleCalendarId,
                    appointment.googleEventId,
                    {
                        start: { dateTime: startTime.toISOString() },
                        end: { dateTime: endTime.toISOString() },
                    }
                );
            } catch (error) {
                console.error('[Scheduling] Google Calendar Update Failed:', error);
            }
        }

        return this.prisma.appointment.update({
            where: { id },
            data: { scheduledAt: newDate },
        });
    }
}
