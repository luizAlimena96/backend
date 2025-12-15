import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CRMWebhookService {
    constructor(private prisma: PrismaService) { }

    async processEvent(event: string, organizationId: string, data: any): Promise<void> {
        try {
            const webhooks = await this.prisma.crmWebhook.findMany({
                where: {
                    organizationId,
                    event,
                    isActive: true,
                },
            });

            for (const webhook of webhooks) {
                await this.triggerWebhook(webhook, data);
            }
        } catch (error) {
            console.error('CRM webhook processing error:', error);
        }
    }

    private async triggerWebhook(webhook: any, data: any): Promise<void> {
        try {
            const payload = this.buildPayload(webhook.bodyTemplate, data);

            await this.prisma.crmWebhookLog.create({
                data: {
                    webhookId: webhook.id,
                    event: webhook.event,
                    payload,
                    success: true,
                    statusCode: 200,
                },
            });
        } catch (error) {
            console.error('Webhook trigger error:', error);

            await this.prisma.crmWebhookLog.create({
                data: {
                    webhookId: webhook.id,
                    event: webhook.event,
                    payload: data,
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                },
            });
        }
    }

    private buildPayload(template: any, data: any): any {
        return { ...template, ...data };
    }
}
