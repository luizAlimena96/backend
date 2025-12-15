import { Module } from '@nestjs/common';
import { WhatsAppWebhookController } from './whatsapp/whatsapp-webhook.controller';
import { AIControlWebhookController } from './ai-control/ai-control-webhook.controller';
import { ZapSignWebhookController } from './zapsign/zapsign-webhook.controller';

@Module({
  controllers: [
    WhatsAppWebhookController,
    AIControlWebhookController,
    ZapSignWebhookController,
  ],
})
export class WebhooksModule { }
