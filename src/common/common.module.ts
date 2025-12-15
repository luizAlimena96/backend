import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DebugService } from './services/debug.service';
import { CRMWebhookService } from './services/crm-webhook.service';
import { SchedulingService } from './services/scheduling.service';
import { AgentFollowupService } from './services/agent-followup.service';
import { AgentNotificationService } from './services/agent-notification.service';
import { MessageBufferService } from './services/message-buffer.service';
import { LeadDataExtractionService } from './services/lead-data-extraction.service';
import { EmailService } from './services/email.service';
import { CRMAutomationService } from './services/crm-automation.service';
import { AIModule } from '../ai/ai.module';

@Global()
@Module({
    imports: [HttpModule, AIModule],
    providers: [
        DebugService,
        CRMWebhookService,
        SchedulingService,
        AgentFollowupService,
        AgentNotificationService,
        MessageBufferService,
        LeadDataExtractionService,
        EmailService,
        CRMAutomationService,
    ],
    exports: [
        DebugService,
        CRMWebhookService,
        SchedulingService,
        AgentFollowupService,
        AgentNotificationService,
        MessageBufferService,
        LeadDataExtractionService,
        EmailService,
        CRMAutomationService,
    ],
})
export class CommonModule { }
