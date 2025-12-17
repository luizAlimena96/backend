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
exports.WhatsAppIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const evolution_api_service_1 = require("../evolution/evolution-api.service");
let WhatsAppIntegrationService = class WhatsAppIntegrationService {
    evolutionAPI;
    constructor(evolutionAPI) {
        this.evolutionAPI = evolutionAPI;
    }
    async sendMessage(instanceName, to, message) {
        return this.evolutionAPI.sendMessage(instanceName, to, message);
    }
    async sendMedia(instanceName, to, mediaUrl, caption) {
        return this.evolutionAPI.sendMedia(instanceName, to, mediaUrl, caption);
    }
    async getInstanceStatus(instanceName) {
        return this.evolutionAPI.getInstanceStatus(instanceName);
    }
    async createInstance(instanceName) {
        return this.evolutionAPI.createInstance(instanceName);
    }
    async getQRCode(instanceName) {
        return this.evolutionAPI.getQRCode(instanceName);
    }
    async sendImage(instanceName, to, imageUrl, caption) {
        return this.evolutionAPI.sendImage(instanceName, to, imageUrl, caption);
    }
    async sendVideo(instanceName, to, videoUrl, caption) {
        return this.evolutionAPI.sendVideo(instanceName, to, videoUrl, caption);
    }
    async sendDocument(instanceName, to, documentUrl, fileName, caption) {
        return this.evolutionAPI.sendDocument(instanceName, to, documentUrl, fileName, caption);
    }
    async sendAudio(instanceName, to, audioUrl) {
        return this.evolutionAPI.sendAudio(instanceName, to, audioUrl);
    }
};
exports.WhatsAppIntegrationService = WhatsAppIntegrationService;
exports.WhatsAppIntegrationService = WhatsAppIntegrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [evolution_api_service_1.EvolutionAPIService])
], WhatsAppIntegrationService);
//# sourceMappingURL=whatsapp-integration.service.js.map