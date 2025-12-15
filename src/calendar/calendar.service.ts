import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GoogleCalendarService } from '../integrations/google/google-calendar.service';

@Injectable()
export class CalendarService {
    constructor(
        private prisma: PrismaService,
        private googleCalendarService: GoogleCalendarService,
    ) { }

    async getGoogleEvents(agentId: string) {
        // Get agent with Google Calendar credentials
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
            // Get events for the next 30 days
            const timeMin = new Date();
            const timeMax = new Date();
            timeMax.setDate(timeMax.getDate() + 30);

            const events = await this.googleCalendarService.listEvents(
                agent.googleAccessToken,
                agent.googleCalendarId,
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
}
