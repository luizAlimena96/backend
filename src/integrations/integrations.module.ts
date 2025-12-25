import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { GoogleCalendarService } from './google/google-calendar.service';
import { ZapSignService } from './zapsign/zapsign.service';
import { EvolutionAPIService } from './evolution/evolution-api.service';
import { WhatsAppIntegrationService } from './whatsapp/whatsapp-integration.service';
import { MetaLeadsService } from './meta/meta-leads.service';
import { WhatsAppCloudService } from './whatsapp-cloud/whatsapp-cloud.service';
import { InstagramIntegrationService } from './instagram/instagram-integration.service';
import { MessageRouterService } from './common/message-router.service';
import { PrismaModule } from '../database/prisma.module';

@Module({
    imports: [HttpModule, PrismaModule],
    providers: [
        ElevenLabsService,
        GoogleCalendarService,
        ZapSignService,
        EvolutionAPIService,
        WhatsAppIntegrationService,
        MetaLeadsService,
        WhatsAppCloudService,
        InstagramIntegrationService,
        MessageRouterService,
    ],
    exports: [
        ElevenLabsService,
        GoogleCalendarService,
        ZapSignService,
        EvolutionAPIService,
        WhatsAppIntegrationService,
        MetaLeadsService,
        WhatsAppCloudService,
        InstagramIntegrationService,
        MessageRouterService,
    ],
})
export class IntegrationsModule { }

