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
}
