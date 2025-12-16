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
exports.GoogleCalendarService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let GoogleCalendarService = class GoogleCalendarService {
    httpService;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async createEvent(accessToken, calendarId, event) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, event, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            console.error('Google Calendar create event error:', error);
            throw new Error('Failed to create calendar event');
        }
    }
    async listEvents(accessToken, calendarId, timeMin, timeMax) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
                params: {
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime',
                },
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }));
            return response.data.items || [];
        }
        catch (error) {
            console.error('Google Calendar list events error:', error);
            throw new Error('Failed to list calendar events');
        }
    }
    async deleteEvent(accessToken, calendarId, eventId) {
        try {
            await (0, rxjs_1.firstValueFrom)(this.httpService.delete(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }));
        }
        catch (error) {
            console.error('Google Calendar delete event error:', error);
            if (error.response?.status !== 404 && error.response?.status !== 410) {
                throw new Error('Failed to delete calendar event');
            }
        }
    }
    async updateEvent(accessToken, calendarId, eventId, event) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.put(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`, event, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            console.error('Google Calendar update event error:', error);
            throw new Error('Failed to update calendar event');
        }
    }
};
exports.GoogleCalendarService = GoogleCalendarService;
exports.GoogleCalendarService = GoogleCalendarService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], GoogleCalendarService);
//# sourceMappingURL=google-calendar.service.js.map