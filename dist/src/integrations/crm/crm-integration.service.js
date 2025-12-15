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
exports.CRMIntegrationService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let CRMIntegrationService = class CRMIntegrationService {
    httpService;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async syncLead(leadData, crmConfig) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(crmConfig.apiUrl, leadData, {
                headers: {
                    Authorization: `Bearer ${crmConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            console.error('CRM sync error:', error);
            throw error;
        }
    }
    async updateDeal(dealId, data, crmConfig) {
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.put(`${crmConfig.apiUrl}/deals/${dealId}`, data, {
                headers: {
                    Authorization: `Bearer ${crmConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
            }));
            return response.data;
        }
        catch (error) {
            console.error('CRM update error:', error);
            throw error;
        }
    }
};
exports.CRMIntegrationService = CRMIntegrationService;
exports.CRMIntegrationService = CRMIntegrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], CRMIntegrationService);
//# sourceMappingURL=crm-integration.service.js.map