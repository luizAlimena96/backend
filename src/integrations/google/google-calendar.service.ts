import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';

interface TokenRefreshResult {
    accessToken: string;
    expiresAt: Date;
}

@Injectable()
export class GoogleCalendarService {
    constructor(
        private httpService: HttpService,
        private prisma: PrismaService,
    ) { }

    /**
     * Get a valid access token for the organization.
     * If the token is expired or about to expire, refresh it automatically.
     */
    async getValidAccessToken(organizationId: string): Promise<string | null> {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                googleAccessToken: true,
                googleRefreshToken: true,
                googleTokenExpiry: true,
            },
        });

        if (!organization?.googleAccessToken || !organization?.googleRefreshToken) {
            console.log('[GoogleCalendar] No tokens found for organization:', organizationId);
            return null;
        }

        // Check if token is expired or will expire in the next 5 minutes
        const now = new Date();
        const expiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
        const tokenExpiry = organization.googleTokenExpiry ? new Date(organization.googleTokenExpiry) : new Date(0);

        if (tokenExpiry.getTime() - expiryBuffer > now.getTime()) {
            // Token is still valid
            console.log('[GoogleCalendar] ✅ Access token is valid until:', tokenExpiry.toISOString());
            return organization.googleAccessToken;
        }

        // Token is expired or about to expire - refresh it
        console.log('[GoogleCalendar] 🔄 Token expired or expiring soon, refreshing...');

        try {
            const refreshResult = await this.refreshAccessToken(organization.googleRefreshToken);

            // Update the organization with new tokens
            await this.prisma.organization.update({
                where: { id: organizationId },
                data: {
                    googleAccessToken: refreshResult.accessToken,
                    googleTokenExpiry: refreshResult.expiresAt,
                },
            });

            console.log('[GoogleCalendar] ✅ Token refreshed successfully, new expiry:', refreshResult.expiresAt.toISOString());
            return refreshResult.accessToken;
        } catch (error) {
            console.error('[GoogleCalendar] ❌ Failed to refresh token:', error);
            return null;
        }
    }

    /**
     * Refresh the access token using the refresh token
     */
    private async refreshAccessToken(refreshToken: string): Promise<TokenRefreshResult> {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error('Google OAuth credentials not configured');
        }

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token',
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('[GoogleCalendar] Token refresh error:', data);
            throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
        }

        return {
            accessToken: data.access_token,
            expiresAt: new Date(Date.now() + (data.expires_in * 1000)),
        };
    }

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
