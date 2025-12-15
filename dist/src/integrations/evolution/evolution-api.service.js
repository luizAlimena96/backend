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
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API send media error:', error);
            throw error;
        }
    }
    async getInstanceStatus(instanceName) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.getBaseUrl()}/instance/connectionState/${instanceName}`, {
                headers: {
                    apikey: this.getApiKey(),
                },
            }));
            return response.data;
        }
        catch (error) {
            console.error('Evolution API status error:', error);
            throw error;
        }
    }
};
exports.EvolutionAPIService = EvolutionAPIService;
exports.EvolutionAPIService = EvolutionAPIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], EvolutionAPIService);
//# sourceMappingURL=evolution-api.service.js.map