import { HttpService } from '@nestjs/axios';
export declare class GoogleCalendarService {
    private httpService;
    constructor(httpService: HttpService);
    createEvent(accessToken: string, calendarId: string, event: any): Promise<any>;
    listEvents(accessToken: string, calendarId: string, timeMin: Date, timeMax: Date): Promise<any[]>;
    deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void>;
    updateEvent(accessToken: string, calendarId: string, eventId: string, event: any): Promise<any>;
}
