import { Controller, Get, Post, Query, Body, UseGuards, Res, Inject } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';
import { Response } from 'express';

@Controller('google')
@UseGuards(JwtAuthGuard)
export class GoogleController {
    constructor(
        @Inject(PrismaService) private prisma: PrismaService
    ) { }

    /**
     * Get Google OAuth URL for agent
     */
    @Get('auth')
    async getAuthUrl(@Query('agentId') agentId: string, @Res() res: Response) {
        if (!agentId) {
            return res.status(400).json({ error: 'agentId is required' });
        }

        console.log('[Google] 🔍 Auth request for agentId:', agentId);

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

            // Check if agent already has Google tokens
            const agent = await this.prisma.agent.findUnique({
                where: { id: agentId },
                select: {
                    id: true,
                    googleAccessToken: true,
                    googleRefreshToken: true,
                    googleCalendarId: true,
                    googleCalendarEnabled: true,
                    googleTokenExpiry: true,
                },
            });

            if (!agent) {
                return res.status(404).json({ error: 'Agent not found' });
            }

            // Check if already connected
            if (agent.googleAccessToken && agent.googleRefreshToken) {
                return res.json({
                    configured: true,
                    connected: true,
                    calendarId: agent.googleCalendarId,
                    enabled: agent.googleCalendarEnabled,
                    message: 'Google Calendar conectado',
                });
            }

            // Generate OAuth URL
            const scopes = encodeURIComponent([
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
            ].join(' '));

            const state = encodeURIComponent(JSON.stringify({ agentId }));

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

            const { agentId } = JSON.parse(decodeURIComponent(state));

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

            // Save tokens to agent
            await this.prisma.agent.update({
                where: { id: agentId },
                data: {
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiry: tokenExpiry,
                    googleCalendarId: calendarId,
                    googleCalendarEnabled: true,
                },
            });

            console.log('[Google] ✅ Successfully connected Google Calendar for agent:', agentId);

            // Redirect to frontend success page
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/agentes?googleConnected=true`);

        } catch (error: any) {
            console.error('[Google] ❌ Callback error:', error);
            return res.status(500).send(`Error: ${error.message}`);
        }
    }

    /**
     * Disconnect Google Calendar
     */
    @Post('disconnect')
    async disconnect(@Body() data: { agentId: string }) {
        console.log('[Google] 🔌 Disconnecting Google Calendar for agent:', data.agentId);

        try {
            const agent = await this.prisma.agent.update({
                where: { id: data.agentId },
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
