import { Controller, Get, Post, Body, Query, HttpStatus, HttpCode, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppCloudService, WhatsAppCloudWebhookPayload } from '../../integrations/whatsapp-cloud/whatsapp-cloud.service';
import { WhatsAppCloudMessageService } from './whatsapp-cloud-message.service';

@Controller('webhooks/whatsapp-cloud')
export class WhatsAppCloudWebhookController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly whatsappCloudService: WhatsAppCloudService,
        private readonly messageService: WhatsAppCloudMessageService,
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
        console.log('[WhatsApp Cloud Webhook] Verification request received');

        // Find organization by verify token
        const organization = await this.prisma.organization.findFirst({
            where: {
                whatsappCloudVerifyToken: token,
                preferredChannel: 'cloud_api',
            },
        });

        if (!organization) {
            console.error('[WhatsApp Cloud Webhook] No organization found with this verify token');
            return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
        }

        const result = this.whatsappCloudService.verifyWebhook(
            mode,
            token,
            challenge,
            organization.whatsappCloudVerifyToken!,
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
    async handleWebhook(
        @Body() payload: WhatsAppCloudWebhookPayload,
        @Req() req: Request,
    ) {
        console.log('[WhatsApp Cloud Webhook] Received payload:', JSON.stringify(payload, null, 2));

        try {
            // Parse the webhook payload
            const parsed = this.whatsappCloudService.parseWebhookPayload(payload);

            if (!parsed) {
                console.log('[WhatsApp Cloud Webhook] No message in payload (might be status update)');
                return { status: 'ok' };
            }

            // Find organization by phone number ID
            const organization = await this.prisma.organization.findFirst({
                where: {
                    whatsappPhoneNumberId: parsed.phoneNumberId,
                    preferredChannel: 'cloud_api',
                },
            });

            if (!organization) {
                console.error('[WhatsApp Cloud Webhook] No organization found for phone number ID:', parsed.phoneNumberId);
                return { status: 'ok' };
            }

            // Process the message
            await this.messageService.processIncomingMessage(organization, parsed);

            return { status: 'ok' };
        } catch (error: any) {
            console.error('[WhatsApp Cloud Webhook] Error processing webhook:', error.message);
            return { status: 'error', message: error.message };
        }
    }
}
