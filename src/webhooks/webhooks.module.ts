import { Module } from '@nestjs/common';
import { WhatsAppWebhookController } from './whatsapp/whatsapp-webhook.controller';
import { AIControlWebhookController } from './ai-control/ai-control-webhook.controller';
import { ZapSignWebhookController } from './zapsign/zapsign-webhook.controller';
import { MetaLeadsWebhookController } from './meta-leads/meta-leads-webhook.controller';
import { WhatsAppCloudWebhookController } from './whatsapp-cloud/whatsapp-cloud.controller';
import { InstagramWebhookController } from './instagram/instagram-webhook.controller';
import { WhatsAppMessageService } from './whatsapp/whatsapp-message.service';
import { WhatsAppCloudMessageService } from './whatsapp-cloud/whatsapp-cloud-message.service';
import { InstagramMessageService } from './instagram/instagram-message.service';
import { MetaLeadsProcessorService } from './meta-leads/meta-leads-processor.service';
import { PrismaService } from '../database/prisma.service';
import { AIModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { LeadsModule } from '../leads/leads.module';
import { HttpModule } from '@nestjs/axios';
import { CrmAutomationsModule } from '../crm-automations/crm-automations.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [AIModule, IntegrationsModule, LeadsModule, HttpModule, CommonModule, CrmAutomationsModule],
  controllers: [
    WhatsAppWebhookController,
    AIControlWebhookController,
    ZapSignWebhookController,
    MetaLeadsWebhookController,
    WhatsAppCloudWebhookController,
    InstagramWebhookController,
  ],
  providers: [
    WhatsAppMessageService,
    WhatsAppCloudMessageService,
    InstagramMessageService,
    MetaLeadsProcessorService,
    PrismaService,
  ],
})
export class WebhooksModule { }

