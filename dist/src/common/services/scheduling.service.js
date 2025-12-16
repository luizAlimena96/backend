"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const google_calendar_service_1 = require("../../integrations/google/google-calendar.service");
let SchedulingService = class SchedulingService {
    prisma;
    googleCalendarService;
    constructor(prisma, googleCalendarService) {
        this.prisma = prisma;
        this.googleCalendarService = googleCalendarService;
    }
    async createAppointment(data) {
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
        try {
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
                const googleEvent = await this.googleCalendarService.createEvent(lead.agent.googleAccessToken, lead.agent.googleCalendarId, eventPayload);
                if (googleEvent?.id) {
                    appointment = await this.prisma.appointment.update({
                        where: { id: appointment.id },
                        data: { googleEventId: googleEvent.id }
                    });
                    console.log(`[Scheduling] Google Event created: ${googleEvent.id}`);
                }
            }
        }
        catch (error) {
            console.error('[Scheduling] Google Calendar Sync Failed:', error);
        }
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: data.leadId },
                include: { agent: true }
            });
            if (lead?.agent?.id && lead.crmStageId) {
                const config = await this.prisma.autoSchedulingConfig.findFirst({
                    where: {
                        agentId: lead.agent.id,
                        crmStageId: lead.crmStageId,
                        isActive: true
                    },
                    include: { reminders: true }
                });
                if (config && config.reminders) {
                    const scheduledAt = new Date(data.scheduledAt);
                    for (const reminderConfig of config.reminders) {
                        if (!reminderConfig.isActive)
                            continue;
                        const remindAt = new Date(scheduledAt.getTime() - (reminderConfig.minutesBefore * 60000));
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
        }
        catch (error) {
            console.error('Error creating reminders:', error);
        }
        return appointment;
    }
    replaceVariables(template, lead, appointment) {
        let msg = template;
        msg = msg.replace(/{{lead.name}}/g, lead.name || 'Cliente');
        msg = msg.replace(/{{lead.phone}}/g, lead.phone || '');
        msg = msg.replace(/{{appointment.date}}/g, appointment.scheduledAt.toLocaleDateString('pt-BR'));
        msg = msg.replace(/{{appointment.time}}/g, appointment.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        return msg;
    }
    async getAvailableSlots(organizationId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { workingHours: true },
        });
        const workingHours = organization?.workingHours;
        if (!workingHours) {
            return [];
        }
        const dayOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][date.getDay()];
        const dayConfig = workingHours[dayOfWeek];
        if (!dayConfig || !dayConfig.enabled) {
            return [];
        }
        const blockedSlots = await this.prisma.blockedSlot.findMany({
            where: {
                organizationId,
                OR: [
                    {
                        allDay: true,
                        startTime: { lte: endOfDay },
                        endTime: { gte: startOfDay },
                    },
                    {
                        allDay: false,
                        startTime: { gte: startOfDay, lte: endOfDay },
                    },
                ],
            },
        });
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
        const slots = [];
        for (const shift of dayConfig.shifts || []) {
            const [startHour, startMinute] = shift.start.split(':').map(Number);
            const [endHour, endMinute] = shift.end.split(':').map(Number);
            let currentTime = new Date(date);
            currentTime.setHours(startHour, startMinute, 0, 0);
            const shiftEnd = new Date(date);
            shiftEnd.setHours(endHour, endMinute, 0, 0);
            while (currentTime < shiftEnd) {
                const slotTime = new Date(currentTime);
                const isBlocked = blockedSlots.some(block => {
                    if (block.allDay)
                        return true;
                    const blockStart = new Date(block.startTime);
                    const blockEnd = new Date(block.endTime);
                    return slotTime >= blockStart && slotTime < blockEnd;
                });
                const hasAppointment = appointments.some(apt => Math.abs(apt.scheduledAt.getTime() - slotTime.getTime()) < 60000);
                if (!isBlocked && !hasAppointment) {
                    slots.push({ time: slotTime, available: true });
                }
                currentTime.setMinutes(currentTime.getMinutes() + 30);
            }
        }
        return slots;
    }
    async cancelAppointment(id) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: { lead: { include: { agent: true } } }
        });
        if (appointment && appointment.googleEventId && appointment.lead?.agent?.googleAccessToken && appointment.lead?.agent?.googleCalendarId) {
            try {
                console.log(`[Scheduling] Cancelling Google Event ${appointment.googleEventId}`);
                await this.googleCalendarService.deleteEvent(appointment.lead.agent.googleAccessToken, appointment.lead.agent.googleCalendarId, appointment.googleEventId);
            }
            catch (error) {
                console.error('[Scheduling] Google Calendar Cancel Failed:', error);
            }
        }
        return this.prisma.appointment.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
    }
    async rescheduleAppointment(id, newDate) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id },
            include: { lead: { include: { agent: true } } }
        });
        if (appointment && appointment.googleEventId && appointment.lead?.agent?.googleAccessToken && appointment.lead?.agent?.googleCalendarId) {
            try {
                console.log(`[Scheduling] Updating Google Event ${appointment.googleEventId} to ${newDate}`);
                const startTime = new Date(newDate);
                const endTime = new Date(startTime.getTime() + (appointment.duration * 60000));
                await this.googleCalendarService.updateEvent(appointment.lead.agent.googleAccessToken, appointment.lead.agent.googleCalendarId, appointment.googleEventId, {
                    start: { dateTime: startTime.toISOString() },
                    end: { dateTime: endTime.toISOString() },
                });
            }
            catch (error) {
                console.error('[Scheduling] Google Calendar Update Failed:', error);
            }
        }
        return this.prisma.appointment.update({
            where: { id },
            data: { scheduledAt: newDate },
        });
    }
};
exports.SchedulingService = SchedulingService;
exports.SchedulingService = SchedulingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        google_calendar_service_1.GoogleCalendarService])
], SchedulingService);
//# sourceMappingURL=scheduling.service.js.map