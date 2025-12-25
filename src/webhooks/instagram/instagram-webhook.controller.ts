import { Controller, Get, Post, Body, Query, HttpStatus, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { InstagramIntegrationService, InstagramWebhookPayload } from '../../integrations/instagram/instagram-integration.service';
import { InstagramMessageService } from './instagram-message.service';

@Controller('webhooks/instagram')
export class InstagramWebhookController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly instagramService: InstagramIntegrationService,
        private readonly messageService: InstagramMessageService,
    ) { }

    /**
     * Webhook verification (GET)
     */
    @Get()
    async verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        console.log('[Instagram Webhook] Verification request received');

        // Find organization by verify token (using Meta verify token)
        const organization = await this.prisma.organization.findFirst({
            where: {
                metaVerifyToken: token,
                instagramMessagesEnabled: true,
            },
        });

        if (!organization) {
            console.error('[Instagram Webhook] No organization found with this verify token');
            return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
        }

        const result = this.instagramService.verifyWebhook(
            mode,
            token,
            challenge,
            organization.metaVerifyToken!,
        );

        if (result) {
            return res.status(HttpStatus.OK).send(result);
        }

        return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }

    /**
     * Webhook handler (POST)
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(@Body() payload: InstagramWebhookPayload) {
        console.log('[Instagram Webhook] Received payload:', JSON.stringify(payload, null, 2));

        // Verify it's an Instagram webhook
        if (payload.object !== 'instagram') {
            console.log('[Instagram Webhook] Not an Instagram webhook, ignoring');
            return { status: 'ok' };
        }

        try {
            // Parse the webhook payload
            const parsed = this.instagramService.parseWebhookPayload(payload);

            if (!parsed) {
                console.log('[Instagram Webhook] No message in payload');
                return { status: 'ok' };
            }

            // Find organization by Instagram account ID
            const organization = await this.prisma.organization.findFirst({
                where: {
                    instagramAccountId: parsed.accountId,
                    instagramMessagesEnabled: true,
                },
            });

            if (!organization) {
                console.error('[Instagram Webhook] No organization found for account ID:', parsed.accountId);
                return { status: 'ok' };
            }

            // Process the message
            await this.messageService.processIncomingMessage(organization, parsed);

            return { status: 'ok' };
        } catch (error: any) {
            console.error('[Instagram Webhook] Error processing webhook:', error.message);
            return { status: 'error', message: error.message };
        }
    }
}
