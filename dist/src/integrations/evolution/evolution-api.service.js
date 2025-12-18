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
exports.EvolutionAPIService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let EvolutionAPIService = class EvolutionAPIService {
    httpService;
    constructor(httpService) {
        this.httpService = httpService;
    }
    getBaseUrl() {
        return process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    }
    getApiKey() {
        return process.env.EVOLUTION_API_KEY || '';
    }
    async createInstance(instanceName) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/instance/create`, { instanceName }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API create instance error:', error);
            throw error;
        }
    }
    async getQRCode(instanceName) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.getBaseUrl()}/instance/connect/${instanceName}`, {
                headers: {
                    apikey: this.getApiKey(),
                },
                timeout: 30000,
            }));
            return response.data.qrcode?.base64 || '';
        }
        catch (error) {
            console.error('Evolution API QR code error:', error);
            throw error;
        }
    }
    async sendMessage(instanceName, to, message) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/message/sendText/${instanceName}`, {
                number: to,
                text: message,
            }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API send message error:', error);
            throw error;
        }
    }
    async sendMedia(instanceName, to, mediaUrl, caption) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/message/sendMedia/${instanceName}`, {
                number: to,
                mediaUrl,
                caption,
            }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API send media error:', error);
            throw error;
        }
    }
    async sendImage(instanceName, to, imageUrl, caption) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/message/sendMedia/${instanceName}`, {
                number: to,
                mediatype: 'image',
                media: imageUrl,
                caption,
            }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API send image error:', error);
            throw error;
        }
    }
    async sendVideo(instanceName, to, videoUrl, caption) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/message/sendMedia/${instanceName}`, {
                number: to,
                mediatype: 'video',
                media: videoUrl,
                caption,
            }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API send video error:', error);
            throw error;
        }
    }
    async sendDocument(instanceName, to, documentUrl, fileName, caption) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/message/sendMedia/${instanceName}`, {
                number: to,
                mediatype: 'document',
                media: documentUrl,
                fileName: fileName || 'document',
                caption,
            }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API send document error:', error);
            throw error;
        }
    }
    async sendAudio(instanceName, to, audioBase64) {
        try {
            console.log('[Evolution API] Sending audio via sendWhatsAppAudio endpoint...');
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/message/sendWhatsAppAudio/${instanceName}`, {
                number: to,
                audio: audioBase64,
                encoding: true,
            }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }));
            console.log('[Evolution API] Audio sent successfully');
            return response.data;
        }
        catch (error) {
            console.error('Evolution API send audio error:', error);
            throw error;
        }
    }
    async getInstanceStatus(instanceName) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.getBaseUrl()}/instance/connectionState/${instanceName}`, {
                headers: {
                    apikey: this.getApiKey(),
                },
                timeout: 30000,
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API status error:', error);
            throw error;
        }
    }
    async getBase64FromMediaMessage(instanceName, messageKeyId) {
        try {
            console.log('[Evolution API] Getting base64 from media message, keyId:', messageKeyId);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.getBaseUrl()}/chat/getBase64FromMediaMessage/${instanceName}`, {
                "message": {
                    "key": {
                        "id": messageKeyId
                    }
                },
                "convertToMp4": false,
            }, {
                headers: {
                    apikey: this.getApiKey(),
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            }));
            console.log('[Evolution API] Got base64 response:', {
                hasBase64: !!response.data?.base64,
                base64Length: response.data?.base64?.length || 0,
                mimetype: response.data?.mimetype,
            });
            return response.data;
        }
        catch (error) {
            console.error('Evolution API getBase64FromMediaMessage error:', error);
            return null;
        }
    }
};
exports.EvolutionAPIService = EvolutionAPIService;
exports.EvolutionAPIService = EvolutionAPIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], EvolutionAPIService);
//# sourceMappingURL=evolution-api.service.js.map