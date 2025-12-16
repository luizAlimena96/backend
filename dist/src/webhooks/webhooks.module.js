"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksModule = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_webhook_controller_1 = require("./whatsapp/whatsapp-webhook.controller");
const ai_control_webhook_controller_1 = require("./ai-control/ai-control-webhook.controller");
const zapsign_webhook_controller_1 = require("./zapsign/zapsign-webhook.controller");
const whatsapp_message_service_1 = require("./whatsapp/whatsapp-message.service");
const prisma_service_1 = require("../database/prisma.service");
const ai_module_1 = require("../ai/ai.module");
const integrations_module_1 = require("../integrations/integrations.module");
const leads_module_1 = require("../leads/leads.module");
const axios_1 = require("@nestjs/axios");
const common_module_1 = require("../common/common.module");
let WebhooksModule = class WebhooksModule {
};
exports.WebhooksModule = WebhooksModule;
exports.WebhooksModule = WebhooksModule = __decorate([
    (0, common_1.Module)({
        imports: [ai_module_1.AIModule, integrations_module_1.IntegrationsModule, leads_module_1.LeadsModule, axios_1.HttpModule, common_module_1.CommonModule],
        controllers: [
            whatsapp_webhook_controller_1.WhatsAppWebhookController,
            ai_control_webhook_controller_1.AIControlWebhookController,
            zapsign_webhook_controller_1.ZapSignWebhookController,
        ],
        providers: [whatsapp_message_service_1.WhatsAppMessageService, prisma_service_1.PrismaService],
    })
], WebhooksModule);
//# sourceMappingURL=webhooks.module.js.map