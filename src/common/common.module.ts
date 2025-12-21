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
import { IntegrationsModule } from '../integrations/integrations.module';
import { StorageService } from './services/storage.service';
import { PdfService } from './services/pdf.service';
import { MediaProcessorService } from './services/media-processor.service';
import { ConversationSummaryService } from './services/conversation-summary.service';

import { ToolsModule } from '../ai/tools/tools.module';

@Global()
@Module({
    imports: [HttpModule, AIModule, IntegrationsModule, ToolsModule],
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
        StorageService,
        PdfService,
        MediaProcessorService,
        ConversationSummaryService,
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
        StorageService,
        PdfService,
        MediaProcessorService,
        ConversationSummaryService,
    ],
})
export class CommonModule { }
