import { Controller, Get, Post, Query, Body, UseGuards, Res, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { Response } from 'express';

@Controller('google')
export class GoogleController {
    constructor(
        @Inject(PrismaService) private prisma: PrismaService
    ) { }

    /**
     * Get Google OAuth URL for organization
     */
    @UseGuards(JwtAuthGuard)
    @Get('auth')
    async getAuthUrl(@Query('organizationId') organizationId: string, @Res() res: Response) {
        if (!organizationId) {
            return res.status(400).json({ error: 'organizationId is required' });
        }

        console.log('[Google] 🔍 Auth request for organizationId:', organizationId);

        try {
            // Check if Google Calendar is configured
            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const redirectUri = process.env.GOOGLE_REDIRECT_URI;

            if (!clientId || !clientSecret || !redirectUri) {
                console.log('[Google] ⚠️ Google OAuth not configured');
                return res.json({
                    configured: false,
                    connected: false,
                    message: 'Google Calendar não está configurado. Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.',
                });
            }

            // Check if organization already has Google tokens
            const organization = await this.prisma.organization.findUnique({
                where: { id: organizationId },
                select: {
                    id: true,
                    googleAccessToken: true,
                    googleRefreshToken: true,
                    googleCalendarId: true,
                    googleCalendarEnabled: true,
                    googleTokenExpiry: true,
                },
            });

            if (!organization) {
                return res.status(404).json({ error: 'Organization not found' });
            }

            // Check if already connected
            if (organization.googleAccessToken && organization.googleRefreshToken) {
                return res.json({
                    configured: true,
                    connected: true,
                    calendarId: organization.googleCalendarId,
                    enabled: organization.googleCalendarEnabled,
                    message: 'Google Calendar conectado',
                });
            }

            // Generate OAuth URL
            const scopes = encodeURIComponent([
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
            ].join(' '));

            const state = encodeURIComponent(JSON.stringify({ organizationId }));

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
                `client_id=${clientId}` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&response_type=code` +
                `&scope=${scopes}` +
                `&access_type=offline` +
                `&prompt=consent` +
                `&state=${state}`;

            return res.json({
                configured: true,
                connected: false,
                authUrl,
                message: 'Clique no link para conectar o Google Calendar',
            });

        } catch (error: any) {
            console.error('[Google] ❌ Auth error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * OAuth callback handler
     */
    @Get('callback')
    async handleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response
    ) {
        console.log('[Google] 📥 OAuth callback received');

        try {
            if (!code || !state) {
                return res.status(400).send('Missing code or state');
            }

            const { organizationId } = JSON.parse(decodeURIComponent(state));

            const clientId = process.env.GOOGLE_CLIENT_ID;
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            const redirectUri = process.env.GOOGLE_REDIRECT_URI;

            // Exchange code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId!,
                    client_secret: clientSecret!,
                    code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirectUri!,
                }),
            });

            const tokens = await tokenResponse.json();

            if (tokens.error) {
                console.error('[Google] ❌ Token exchange error:', tokens);
                return res.status(400).send(`OAuth error: ${tokens.error_description}`);
            }

            // Calculate token expiry
            const tokenExpiry = new Date(Date.now() + (tokens.expires_in * 1000));

            // Get user's primary calendar
            const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            });

            const calendar = await calendarResponse.json();
            const calendarId = calendar.id || 'primary';

            // Save tokens to organization
            await this.prisma.organization.update({
                where: { id: organizationId },
                data: {
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiry: tokenExpiry,
                    googleCalendarId: calendarId,
                    googleCalendarEnabled: true,
                },
            });

            console.log('[Google] ✅ Successfully connected Google Calendar for organization:', organizationId);

            // Redirect to frontend success page
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/perfil?success=calendar_connected&organizationId=${organizationId}`);

        } catch (error: any) {
            console.error('[Google] ❌ Callback error:', error);
            return res.status(500).send(`Error: ${error.message}`);
        }
    }

    /**
     * Disconnect Google Calendar
     */
    @UseGuards(JwtAuthGuard)
    @Post('disconnect')
    async disconnect(@Body() data: { organizationId: string }) {
        console.log('[Google] 🔌 Disconnecting Google Calendar for organization:', data.organizationId);

        try {
            const organization = await this.prisma.organization.update({
                where: { id: data.organizationId },
                data: {
                    googleAccessToken: null,
                    googleRefreshToken: null,
                    googleTokenExpiry: null,
                    googleCalendarId: null,
                    googleCalendarEnabled: false,
                },
            });

            return {
                success: true,
                message: 'Google Calendar desconectado com sucesso',
            };

        } catch (error: any) {
            console.error('[Google] ❌ Disconnect error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
