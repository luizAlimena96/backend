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
exports.UsageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const config_1 = require("@nestjs/config");
let UsageService = class UsageService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async getOpenAICosts(organizationId, period) {
        const org = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { openaiProjectId: true },
        });
        const configured = !!org?.openaiProjectId;
        if (!configured) {
            return { configured: false };
        }
        const now = new Date();
        let startDate;
        switch (period) {
            case 'day':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
        }
        return {
            configured: true,
            totalCost: 0,
            startDate: startDate.toLocaleDateString('pt-BR'),
            endDate: now.toLocaleDateString('pt-BR'),
        };
    }
    async getElevenLabsCosts(organizationId, period) {
        const org = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { elevenLabsApiKey: true },
        });
        const configured = !!org?.elevenLabsApiKey;
        if (!configured) {
            return { configured: false };
        }
        return {
            configured: true,
            usage: {
                charactersPerOrg: 0,
                estimatedCostUSD: '0.00',
            },
        };
    }
};
exports.UsageService = UsageService;
exports.UsageService = UsageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], UsageService);
//# sourceMappingURL=usage.service.js.map