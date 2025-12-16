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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppWebhookController = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_message_service_1 = require("./whatsapp-message.service");
let WhatsAppWebhookController = class WhatsAppWebhookController {
    messageService;
    constructor(messageService) {
        this.messageService = messageService;
    }
    async handleWebhook(body) {
        const event = body.event;
        if (event !== "messages.upsert") {
            return { success: true };
        }
        const data = body.data;
        if (data.key.fromMe) {
            return { success: true };
        }
        this.messageService.processIncomingMessage(body).catch(err => {
            console.error('[WhatsApp Webhook] Error processing message:', err);
        });
        return { success: true, message: "Processing" };
    }
};
exports.WhatsAppWebhookController = WhatsAppWebhookController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WhatsAppWebhookController.prototype, "handleWebhook", null);
exports.WhatsAppWebhookController = WhatsAppWebhookController = __decorate([
    (0, common_1.Controller)("webhooks/whatsapp"),
    __metadata("design:paramtypes", [whatsapp_message_service_1.WhatsAppMessageService])
], WhatsAppWebhookController);
//# sourceMappingURL=whatsapp-webhook.controller.js.map