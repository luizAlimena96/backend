"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMWebhookService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let CRMWebhookService = class CRMWebhookService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async processEvent(event, organizationId, data) {
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
        }
        catch (error) {
            console.error('CRM webhook processing error:', error);
        }
    }
    async triggerWebhook(webhook, data) {
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
        }
        catch (error) {
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
    buildPayload(template, data) {
        return { ...template, ...data };
    }
};
exports.CRMWebhookService = CRMWebhookService;
exports.CRMWebhookService = CRMWebhookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CRMWebhookService);
//# sourceMappingURL=crm-webhook.service.js.map