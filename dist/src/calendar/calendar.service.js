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
exports.CalendarService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const google_calendar_service_1 = require("../integrations/google/google-calendar.service");
let CalendarService = class CalendarService {
    prisma;
    googleCalendarService;
    constructor(prisma, googleCalendarService) {
        this.prisma = prisma;
        this.googleCalendarService = googleCalendarService;
    }
    async getGoogleEvents(agentId) {
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            select: {
                googleCalendarId: true,
                googleAccessToken: true,
                googleRefreshToken: true,
            },
        });
        if (!agent?.googleAccessToken || !agent?.googleCalendarId) {
            return [];
        }
        try {
            const timeMin = new Date();
            const timeMax = new Date();
            timeMax.setDate(timeMax.getDate() + 30);
            const events = await this.googleCalendarService.listEvents(agent.googleAccessToken, agent.googleCalendarId, timeMin, timeMax);
            return events.map((event) => ({
                id: event.id,
                summary: event.summary,
                description: event.description,
                location: event.location,
                startTime: event.start?.dateTime || event.start?.date,
                endTime: event.end?.dateTime || event.end?.date,
            }));
        }
        catch (error) {
            console.error('Error fetching Google Calendar events:', error);
            return [];
        }
    }
    async getBlockedSlots(organizationId) {
        return this.prisma.blockedSlot.findMany({
            where: { organizationId },
            orderBy: { startTime: 'asc' },
        });
    }
    async createBlockedSlot(data) {
        return this.prisma.blockedSlot.create({
            data: {
                organizationId: data.organizationId,
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime),
                title: data.title || 'Horário Bloqueado',
                allDay: data.allDay || false,
            },
        });
    }
    async deleteBlockedSlot(id) {
        return this.prisma.blockedSlot.delete({
            where: { id },
        });
    }
    async getWorkingHours(organizationId) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { workingHours: true },
        });
        return organization?.workingHours || this.getDefaultWorkingHours();
    }
    async updateWorkingHours(organizationId, workingHours) {
        return this.prisma.organization.update({
            where: { id: organizationId },
            data: { workingHours },
        });
    }
    getDefaultWorkingHours() {
        const defaultShift = [{ start: '09:00', end: '18:00' }];
        return {
            MON: { enabled: true, shifts: defaultShift },
            TUE: { enabled: true, shifts: defaultShift },
            WED: { enabled: true, shifts: defaultShift },
            THU: { enabled: true, shifts: defaultShift },
            FRI: { enabled: true, shifts: defaultShift },
            SAT: { enabled: false, shifts: [] },
            SUN: { enabled: false, shifts: [] },
        };
    }
};
exports.CalendarService = CalendarService;
exports.CalendarService = CalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        google_calendar_service_1.GoogleCalendarService])
], CalendarService);
//# sourceMappingURL=calendar.service.js.map