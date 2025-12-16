import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GoogleCalendarService {
    constructor(private httpService: HttpService) { }

    async createEvent(accessToken: string, calendarId: string, event: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
                    event,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Google Calendar create event error:', error);
            throw new Error('Failed to create calendar event');
        }
    }

    async listEvents(accessToken: string, calendarId: string, timeMin: Date, timeMax: Date): Promise<any[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
                    {
                        params: {
                            timeMin: timeMin.toISOString(),
                            timeMax: timeMax.toISOString(),
                            singleEvents: true,
                            orderBy: 'startTime',
                        },
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                )
            );

            return response.data.items || [];
        } catch (error) {
            console.error('Google Calendar list events error:', error);
            throw new Error('Failed to list calendar events');
        }
    }
    async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
        try {
            await firstValueFrom(
                this.httpService.delete(
                    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                        },
                    }
                )
            );
        } catch (error) {
            console.error('Google Calendar delete event error:', error);
            // Don't throw if already deleted or not found (404/410)
            if (error.response?.status !== 404 && error.response?.status !== 410) {
                throw new Error('Failed to delete calendar event');
            }
        }
    }

    async updateEvent(accessToken: string, calendarId: string, eventId: string, event: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.put(
                    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
                    event,
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Google Calendar update event error:', error);
            throw new Error('Failed to update calendar event');
        }
    }
}
