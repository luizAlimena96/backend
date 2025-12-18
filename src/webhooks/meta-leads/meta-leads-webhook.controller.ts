import { Controller, Get, Post, Body, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MetaLeadsProcessorService } from './meta-leads-processor.service';
import { PrismaService } from '../../database/prisma.service';

@Controller('webhooks/meta-leads')
export class MetaLeadsWebhookController {
    constructor(
        private processorService: MetaLeadsProcessorService,
        private prisma: PrismaService,
    ) { }

    /**
     * GET - Webhook verification endpoint (Facebook challenge)
     */
    @Get()
    async verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response,
    ) {
        console.log('[Meta Webhook] Verification request received');
        console.log(`  - Mode: ${mode}`);
        console.log(`  - Token: ${token}`);

        const organization = await this.prisma.organization.findFirst({
            where: {
                metaIntegrationEnabled: true,
            } as any,
        }) as any;

        if (!organization?.metaVerifyToken) {
            console.error('[Meta Webhook] No organization has Meta integration configured');
            return res.status(HttpStatus.FORBIDDEN).send('Configuration not found');
        }

        if (mode === 'subscribe' && token === organization.metaVerifyToken) {
            console.log('[Meta Webhook] Verification successful');
            return res.status(HttpStatus.OK).send(challenge);
        }

        console.error('[Meta Webhook] Verification failed - token mismatch');
        return res.status(HttpStatus.FORBIDDEN).send('Verification failed');
    }

    /**
     * POST - Receive lead notifications from Meta
     */
    @Post()
    async handleLeadNotification(@Body() body: any) {
        console.log('[Meta Webhook] Received notification');
        console.log('[Meta Webhook] Body:', JSON.stringify(body, null, 2));

        try {
            // Meta sends notifications in this format
            const entries = body.entry || [];

            for (const entry of entries) {
                const changes = entry.changes || [];
                const pageId = entry.id;

                for (const change of changes) {
                    if (change.field === 'leadgen') {
                        const leadgenId = change.value?.leadgen_id;
                        const formId = change.value?.form_id;
                        const adId = change.value?.ad_id;

                        if (leadgenId) {
                            console.log(`[Meta Webhook] Processing lead ${leadgenId}`);
                            console.log(`  - Page ID: ${pageId}`);
                            console.log(`  - Form ID: ${formId}`);
                            console.log(`  - Ad ID: ${adId}`);

                            // Process in background (non-blocking)
                            this.processorService.processLead(leadgenId, pageId, formId, adId).catch(err => {
                                console.error('[Meta Webhook] Error processing lead:', err);
                            });
                        }
                    }
                }
            }

            return { success: true, message: 'Processing' };
        } catch (error) {
            console.error('[Meta Webhook] Error handling notification:', error);
            return { success: false, error: 'Internal error' };
        }
    }
}
