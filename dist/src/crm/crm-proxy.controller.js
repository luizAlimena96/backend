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
exports.CRMProxyController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const proxy_request_dto_1 = require("./dto/proxy-request.dto");
let CRMProxyController = class CRMProxyController {
    httpService;
    constructor(httpService) {
        this.httpService = httpService;
    }
    async proxyRequest(data) {
        const allowedDomains = [
            process.env.CRM_API_DOMAIN,
            'calendar.google.com',
            'www.googleapis.com',
            'oauth2.googleapis.com',
        ].filter(Boolean);
        const url = new URL(data.url);
        if (!allowedDomains.some(domain => url.hostname.endsWith(domain))) {
            throw new common_1.BadRequestException(`Domain ${url.hostname} not allowed. Only whitelisted CRM and Google domains are permitted.`);
        }
        const startTime = Date.now();
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.request({
                url: data.url,
                method: data.method,
                headers: data.headers,
                data: data.body,
                timeout: 30000,
                signal: AbortSignal.timeout(30000),
            }));
            const responseTime = Date.now() - startTime;
            return {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                data: response.data,
                responseTime,
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            if (error.response) {
                return {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    error: error.message,
                    details: error.response.data,
                    responseTime,
                };
            }
            return {
                status: 0,
                statusText: 'Error',
                error: error.message,
                details: {
                    message: 'Erro ao fazer requisição para o CRM',
                    originalError: error.message,
                },
                responseTime,
            };
        }
    }
};
exports.CRMProxyController = CRMProxyController;
__decorate([
    (0, common_1.Post)('proxy'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [proxy_request_dto_1.ProxyRequestDto]),
    __metadata("design:returntype", Promise)
], CRMProxyController.prototype, "proxyRequest", null);
exports.CRMProxyController = CRMProxyController = __decorate([
    (0, common_1.Controller)('crm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [axios_1.HttpService])
], CRMProxyController);
//# sourceMappingURL=crm-proxy.controller.js.map