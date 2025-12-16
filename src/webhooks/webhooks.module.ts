import { Module } from '@nestjs/common';
import { WhatsAppWebhookController } from './whatsapp/whatsapp-webhook.controller';
import { AIControlWebhookController } from './ai-control/ai-control-webhook.controller';
import { ZapSignWebhookController } from './zapsign/zapsign-webhook.controller';
import { WhatsAppMessageService } from './whatsapp/whatsapp-message.service';
import { PrismaService } from '../database/prisma.service';
import { AIModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { LeadsModule } from '../leads/leads.module';
import { HttpModule } from '@nestjs/axios';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [AIModule, IntegrationsModule, LeadsModule, HttpModule, CommonModule],
  controllers: [
    WhatsAppWebhookController,
    AIControlWebhookController,
    ZapSignWebhookController,
  ],
  providers: [WhatsAppMessageService, PrismaService],
})
export class WebhooksModule { }
