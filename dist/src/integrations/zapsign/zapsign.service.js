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
exports.ZapSignService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let ZapSignService = class ZapSignService {
    httpService;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async createDocument(apiToken, templateId, data) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post('https://api.zapsign.com.br/api/v1/documents/', {
                template_id: templateId,
                ...data,
            }, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            console.error('ZapSign create document error:', error);
            throw new Error('Failed to create ZapSign document');
        }
    }
    async getDocumentStatus(apiToken, documentId) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`https://api.zapsign.com.br/api/v1/documents/${documentId}/`, {
                headers: {
                    Authorization: `Bearer ${apiToken}`,
                },
            }));
            return response.data;
        }
        catch (error) {
            console.error('ZapSign get document status error:', error);
            throw new Error('Failed to get document status');
        }
    }
};
exports.ZapSignService = ZapSignService;
exports.ZapSignService = ZapSignService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], ZapSignService);
//# sourceMappingURL=zapsign.service.js.map