import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GoogleCalendarService } from '../../integrations/google/google-calendar.service';

// Brazil timezone offset: UTC-3 (3 hours behind UTC)
const BRAZIL_TIMEZONE_OFFSET_HOURS = -3;
const BRAZIL_TIMEZONE_OFFSET_MS = BRAZIL_TIMEZONE_OFFSET_HOURS * 60 * 60 * 1000;

/**
 * Convert a local Brazil time to UTC Date
 * Input: date string "YYYY-MM-DD" and time string "HH:MM" in Brazil time
 * Output: Date object in UTC
 */
function brazilTimeToUTC(dateStr: string, timeStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Create date as if it's UTC, then subtract Brazil offset to get actual UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    // Since Brazil is UTC-3, we ADD 3 hours to convert local -> UTC
    utcDate.setTime(utcDate.getTime() + (3 * 60 * 60 * 1000));
    return utcDate;
}

/**
 * Get current time in Brazil timezone
 */
function getNowInBrazil(): Date {
    const now = new Date();
    // Adjust for Brazil timezone
    return new Date(now.getTime() + BRAZIL_TIMEZONE_OFFSET_MS);
}

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
        // DEBUG: Log incoming appointment data
        console.log('[Scheduling] 🔍 DEBUG - Creating appointment:');
        console.log('[Scheduling]   - leadId:', data.leadId);
        console.log('[Scheduling]   - title:', data.title);
        console.log('[Scheduling]   - scheduledAt:', data.scheduledAt);
        console.log('[Scheduling]   - duration:', data.duration || 60);
        console.log('[Scheduling]   - type:', data.type || 'MEETING');
        console.log('[Scheduling]   - organizationId:', data.organizationId);

        // ==================== CONFLICT VERIFICATION ====================
        // Check if the slot is already occupied by another appointment
        const duration = data.duration || 60;
        const newAptStart = data.scheduledAt.getTime();
        const newAptEnd = newAptStart + (duration * 60000);

        // Find appointments that overlap with the new time slot
        const conflictingAppointments = await this.prisma.appointment.findMany({
            where: {
                organizationId: data.organizationId,
                status: { not: 'CANCELLED' },
                scheduledAt: {
                    // Appointments that START before our new appointment ENDS
                    lt: new Date(newAptEnd),
                },
            },
        });

        // Check for actual overlap (appointment end time overlaps with new start)
        const hasConflict = conflictingAppointments.some(apt => {
            const aptStart = apt.scheduledAt.getTime();
            const aptEnd = aptStart + (apt.duration * 60000);
            // Overlap if: existing end > new start AND existing start < new end
            const overlaps = aptEnd > newAptStart && aptStart < newAptEnd;
            if (overlaps) {
                console.log('[Scheduling] ⚠️ Conflict detected:', {
                    existingApt: { start: apt.scheduledAt, end: new Date(aptEnd) },
                    newApt: { start: data.scheduledAt, end: new Date(newAptEnd) }
                });
            }
            return overlaps;
        });

        if (hasConflict) {
            console.log('[Scheduling] ❌ Slot conflict - appointment not created');
            throw new Error('SLOT_OCCUPIED: O horário solicitado já está ocupado por outro agendamento.');
        }

        // ==================== CREATE APPOINTMENT ====================
        let appointment = await this.prisma.appointment.create({
            data: {
                leadId: data.leadId,
                title: data.title,
                scheduledAt: data.scheduledAt,
                duration: duration,
                type: data.type || 'MEETING',
                notes: data.notes,
                organizationId: data.organizationId,
                status: 'SCHEDULED',
            },
        });

        console.log('[Scheduling] ✅ Appointment created:', appointment.id);

        // 1. Google Calendar Sync - Now uses Organization credentials
        try {
            // Fetch Organization to get Google Calendar credentials
            const organization = await this.prisma.organization.findUnique({
                where: { id: data.organizationId },
                select: {
                    googleAccessToken: true,
                    googleCalendarId: true,
                    googleRefreshToken: true,
                    name: true,
                }
            });

            // Also get lead name for the event
            const lead = await this.prisma.lead.findUnique({
                where: { id: data.leadId },
                select: { name: true, phone: true }
            });

            if (organization?.googleAccessToken && organization?.googleCalendarId) {
                console.log(`[Scheduling] Syncing appointment ${appointment.id} to Google Calendar of organization ${organization.name}`);

                const startTime = new Date(data.scheduledAt);
                const endTime = new Date(startTime.getTime() + (appointment.duration * 60000));

                const eventPayload = {
                    summary: `${appointment.title} - ${lead?.name || 'Cliente'}`,
                    description: `Agendamento via LEXA.\nLead: ${lead?.name || 'N/A'} (${lead?.phone || 'N/A'})\nNotas: ${data.notes || ''}`,
                    start: { dateTime: startTime.toISOString() },
                    end: { dateTime: endTime.toISOString() },
                };

                const googleEvent = await this.googleCalendarService.createEvent(
                    organization.googleAccessToken,
                    organization.googleCalendarId,
                    eventPayload
                );

                if (googleEvent?.id) {
                    appointment = await this.prisma.appointment.update({
                        where: { id: appointment.id },
                        data: { googleEventId: googleEvent.id }
                    });
                    console.log(`[Scheduling] ✅ Google Event created: ${googleEvent.id}`);
                }
            } else {
                console.log(`[Scheduling] ⚠️ Google Calendar not configured for organization ${data.organizationId}`);
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
        msg = msg.replace(/{{appointment.date}}/g, appointment.scheduledAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
        msg = msg.replace(/{{appointment.time}}/g, appointment.scheduledAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }));
        return msg;
    }

    async getAvailableSlots(organizationId: string, date: Date, agentId?: string, slotDuration: number = 30): Promise<Array<{ time: Date; available: boolean }>> {
        console.log('[Scheduling] 📅 getAvailableSlots called:', { organizationId, agentId, date: date.toISOString(), slotDuration });

        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Get working hours - from Agent if agentId provided, otherwise from Organization
        let workingHours: any = null;

        if (agentId) {
            const agent = await this.prisma.agent.findUnique({
                where: { id: agentId },
                select: { workingHours: true },
            });
            workingHours = agent?.workingHours;
            console.log('[Scheduling] 📅 Agent workingHours:', { found: !!agent, hasWorkingHours: !!workingHours });
        }

        // Fallback to organization if agent has no workingHours
        if (!workingHours) {
            const organization = await this.prisma.organization.findUnique({
                where: { id: organizationId },
                select: { workingHours: true },
            });
            workingHours = organization?.workingHours;
            console.log('[Scheduling] 📅 Organization workingHours fallback:', { hasWorkingHours: !!workingHours });
        }

        if (!workingHours) {
            console.log('[Scheduling] ⚠️ No workingHours configured');
            return []; // No working hours configured
        }

        // 2. Get day of week - support both formats:
        // Format 1 (Agent): { "monday": [...shifts], "tuesday": [...shifts] }
        // Format 2 (Organization): { "MON": { enabled, shifts }, "TUE": { enabled, shifts } }
        const dayAbbrev = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
        const dayFullLowercase = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

        // Try lowercase full name first (Agent format), then abbreviation (Organization format)
        let dayConfig = workingHours[dayFullLowercase];
        let shifts: Array<{ start: string; end: string }> = [];

        if (Array.isArray(dayConfig)) {
            // Agent format: dayConfig is already the shifts array
            shifts = dayConfig;
            console.log('[Scheduling] 📅 Agent format detected:', { day: dayFullLowercase, shifts: shifts.length });
        } else if (dayConfig && dayConfig.enabled && Array.isArray(dayConfig.shifts)) {
            // Organization format: { enabled: true, shifts: [...] }
            shifts = dayConfig.shifts;
            console.log('[Scheduling] 📅 Organization format detected:', { day: dayAbbrev, enabled: dayConfig.enabled, shifts: shifts.length });
        } else {
            // Try abbreviation format as fallback
            dayConfig = workingHours[dayAbbrev];
            if (dayConfig && dayConfig.enabled && Array.isArray(dayConfig.shifts)) {
                shifts = dayConfig.shifts;
                console.log('[Scheduling] 📅 Organization format (fallback):', { day: dayAbbrev, shifts: shifts.length });
            }
        }

        if (shifts.length === 0) {
            console.log('[Scheduling] ⚠️ No shifts configured for day:', dayFullLowercase);
            return []; // No shifts configured for this day
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

        console.log('[Scheduling] 📅 Appointments found for this day:', {
            date: date.toISOString().split('T')[0],
            count: appointments.length,
            appointments: appointments.map(apt => ({
                id: apt.id,
                scheduledAt: apt.scheduledAt,
                duration: apt.duration,
                status: apt.status
            }))
        });

        // 5. Generate available slots based on working hours
        // IMPORTANT: Slots are generated in Brazil timezone (UTC-3) but stored as UTC
        const slots: Array<{ time: Date; available: boolean }> = [];

        for (const shift of shifts) {
            const [startHour, startMinute] = shift.start.split(':').map(Number);
            const [endHour, endMinute] = shift.end.split(':').map(Number);

            // Generate 30-minute slots in UTC (converting from Brazil time)
            // Brazil is UTC-3, so we add 3 hours to convert Brazil time to UTC
            const year = date.getUTCFullYear();
            const month = date.getUTCMonth();
            const day = date.getUTCDate();

            // Create slot times in UTC (Brazil time + 3 hours)
            let currentTime = new Date(Date.UTC(year, month, day, startHour + 3, startMinute, 0, 0));
            const shiftEnd = new Date(Date.UTC(year, month, day, endHour + 3, endMinute, 0, 0));

            while (currentTime < shiftEnd) {
                const slotTime = new Date(currentTime);

                // Check if slot is blocked
                const isBlocked = blockedSlots.some(block => {
                    if (block.allDay) return true;
                    const blockStart = new Date(block.startTime);
                    const blockEnd = new Date(block.endTime);
                    return slotTime >= blockStart && slotTime < blockEnd;
                });

                // Check if slot has an appointment (considering duration)
                const hasAppointment = appointments.some(apt => {
                    const aptStart = apt.scheduledAt.getTime();
                    const aptEnd = aptStart + (apt.duration * 60000); // duration in minutes -> ms
                    const slotMs = slotTime.getTime();
                    // Slot is occupied if it falls within [start, end) of any appointment
                    const isOccupied = slotMs >= aptStart && slotMs < aptEnd;
                    if (isOccupied) {
                        console.log('[Scheduling] 🚫 Slot blocked by appointment:', {
                            slotTime: slotTime.toISOString(),
                            aptStart: apt.scheduledAt.toISOString(),
                            aptEnd: new Date(aptEnd).toISOString(),
                            aptId: apt.id
                        });
                    }
                    return isOccupied;
                });

                // Skip slots that are in the past
                const now = new Date();
                const isPast = slotTime <= now;

                if (!isBlocked && !hasAppointment && !isPast) {
                    slots.push({ time: slotTime, available: true });
                }

                // Move to next slot based on duration
                currentTime.setTime(currentTime.getTime() + (slotDuration * 60000));
            }
        }

        return slots;
    }

    async cancelAppointment(id: string): Promise<any> {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            select: {
                id: true,
                googleEventId: true,
                organizationId: true,
            }
        });

        if (appointment?.googleEventId && appointment.organizationId) {
            const organization = await this.prisma.organization.findUnique({
                where: { id: appointment.organizationId },
                select: {
                    googleAccessToken: true,
                    googleCalendarId: true,
                }
            });

            if (organization?.googleAccessToken && organization?.googleCalendarId) {
                try {
                    console.log(`[Scheduling] Cancelling Google Event ${appointment.googleEventId}`);
                    await this.googleCalendarService.deleteEvent(
                        organization.googleAccessToken,
                        organization.googleCalendarId,
                        appointment.googleEventId
                    );
                    console.log(`[Scheduling] ✅ Google Event cancelled`);
                } catch (error) {
                    console.error('[Scheduling] Google Calendar Cancel Failed:', error);
                }
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
            select: {
                id: true,
                googleEventId: true,
                organizationId: true,
                duration: true,
            }
        });

        if (appointment?.googleEventId && appointment.organizationId) {
            const organization = await this.prisma.organization.findUnique({
                where: { id: appointment.organizationId },
                select: {
                    googleAccessToken: true,
                    googleCalendarId: true,
                }
            });

            if (organization?.googleAccessToken && organization?.googleCalendarId) {
                try {
                    console.log(`[Scheduling] Updating Google Event ${appointment.googleEventId} to ${newDate}`);
                    const startTime = new Date(newDate);
                    const endTime = new Date(startTime.getTime() + (appointment.duration * 60000));

                    await this.googleCalendarService.updateEvent(
                        organization.googleAccessToken,
                        organization.googleCalendarId,
                        appointment.googleEventId,
                        {
                            start: { dateTime: startTime.toISOString() },
                            end: { dateTime: endTime.toISOString() },
                        }
                    );
                    console.log(`[Scheduling] ✅ Google Event rescheduled`);
                } catch (error) {
                    console.error('[Scheduling] Google Calendar Update Failed:', error);
                }
            }
        }

        return this.prisma.appointment.update({
            where: { id },
            data: { scheduledAt: newDate },
        });
    }
}
