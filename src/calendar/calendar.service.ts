import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GoogleCalendarService } from '../integrations/google/google-calendar.service';

@Injectable()
export class CalendarService {
    constructor(
        private prisma: PrismaService,
        private googleCalendarService: GoogleCalendarService,
    ) { }

    async getGoogleEvents(organizationId: string) {
        // Get organization with Google Calendar credentials
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                googleCalendarId: true,
            },
        });

        if (!organization?.googleCalendarId) {
            return [];
        }

        // Get a valid (possibly refreshed) access token
        const validAccessToken = await this.googleCalendarService.getValidAccessToken(organizationId);

        if (!validAccessToken) {
            console.log('[CalendarService] Could not get valid Google access token');
            return [];
        }

        try {
            // Get events for the next 30 days
            const timeMin = new Date();
            const timeMax = new Date();
            timeMax.setDate(timeMax.getDate() + 30);

            const events = await this.googleCalendarService.listEvents(
                validAccessToken,
                organization.googleCalendarId,
                timeMin,
                timeMax,
            );

            return events.map((event) => ({
                id: event.id,
                summary: event.summary,
                description: event.description,
                location: event.location,
                startTime: event.start?.dateTime || event.start?.date,
                endTime: event.end?.dateTime || event.end?.date,
            }));
        } catch (error) {
            console.error('Error fetching Google Calendar events:', error);
            return [];
        }
    }

    // Blocked Slots Management
    async getBlockedSlots(organizationId: string) {
        return this.prisma.blockedSlot.findMany({
            where: { organizationId },
            orderBy: { startTime: 'asc' },
        });
    }

    async createBlockedSlot(data: {
        organizationId: string;
        startTime: string;
        endTime: string;
        title?: string;
        allDay?: boolean;
    }) {
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

    async deleteBlockedSlot(id: string) {
        return this.prisma.blockedSlot.delete({
            where: { id },
        });
    }

    // Working Hours Management
    async getWorkingHours(organizationId: string) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { workingHours: true },
        });

        return organization?.workingHours || this.getDefaultWorkingHours();
    }

    async updateWorkingHours(organizationId: string, workingHours: any) {
        return this.prisma.organization.update({
            where: { id: organizationId },
            data: { workingHours },
        });
    }

    private getDefaultWorkingHours() {
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
}
