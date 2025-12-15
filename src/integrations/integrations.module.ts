import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ElevenLabsService } from './elevenlabs/elevenlabs.service';
import { GoogleCalendarService } from './google/google-calendar.service';
import { ZapSignService } from './zapsign/zapsign.service';
import { EvolutionAPIService } from './evolution/evolution-api.service';
import { WhatsAppIntegrationService } from './whatsapp/whatsapp-integration.service';

@Module({
    imports: [HttpModule],
    providers: [
        ElevenLabsService,
        GoogleCalendarService,
        ZapSignService,
        EvolutionAPIService,
        WhatsAppIntegrationService,
    ],
    exports: [
        ElevenLabsService,
        GoogleCalendarService,
        ZapSignService,
        EvolutionAPIService,
        WhatsAppIntegrationService,
    ],
})
export class IntegrationsModule { }

