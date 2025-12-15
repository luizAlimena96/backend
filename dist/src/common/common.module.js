"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const debug_service_1 = require("./services/debug.service");
const crm_webhook_service_1 = require("./services/crm-webhook.service");
const scheduling_service_1 = require("./services/scheduling.service");
const agent_followup_service_1 = require("./services/agent-followup.service");
const agent_notification_service_1 = require("./services/agent-notification.service");
const message_buffer_service_1 = require("./services/message-buffer.service");
const lead_data_extraction_service_1 = require("./services/lead-data-extraction.service");
const email_service_1 = require("./services/email.service");
const crm_automation_service_1 = require("./services/crm-automation.service");
const ai_module_1 = require("../ai/ai.module");
let CommonModule = class CommonModule {
};
exports.CommonModule = CommonModule;
exports.CommonModule = CommonModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, ai_module_1.AIModule],
        providers: [
            debug_service_1.DebugService,
            crm_webhook_service_1.CRMWebhookService,
            scheduling_service_1.SchedulingService,
            agent_followup_service_1.AgentFollowupService,
            agent_notification_service_1.AgentNotificationService,
            message_buffer_service_1.MessageBufferService,
            lead_data_extraction_service_1.LeadDataExtractionService,
            email_service_1.EmailService,
            crm_automation_service_1.CRMAutomationService,
        ],
        exports: [
            debug_service_1.DebugService,
            crm_webhook_service_1.CRMWebhookService,
            scheduling_service_1.SchedulingService,
            agent_followup_service_1.AgentFollowupService,
            agent_notification_service_1.AgentNotificationService,
            message_buffer_service_1.MessageBufferService,
            lead_data_extraction_service_1.LeadDataExtractionService,
            email_service_1.EmailService,
            crm_automation_service_1.CRMAutomationService,
        ],
    })
], CommonModule);
//# sourceMappingURL=common.module.js.map