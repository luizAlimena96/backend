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
exports.CrmConfigsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let CrmConfigsService = class CrmConfigsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        return this.prisma.cRMConfig.findMany({
            where: { organizationId },
            include: {
                automations: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, organizationId) {
        const config = await this.prisma.cRMConfig.findUnique({
            where: { id },
            include: {
                automations: true,
            },
        });
        if (!config) {
            throw new common_1.NotFoundException('CRM config not found');
        }
        if (config.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return config;
    }
    async create(data) {
        return this.prisma.cRMConfig.create({
            data: {
                name: data.name,
                crmType: data.crmType,
                baseUrl: data.baseUrl,
                authType: data.authType,
                apiKey: data.apiKey,
                organizationId: data.organizationId,
                isActive: data.isActive ?? true,
            },
            include: {
                automations: true,
            },
        });
    }
    async update(id, data, organizationId) {
        await this.findOne(id, organizationId);
        return this.prisma.cRMConfig.update({
            where: { id },
            data: {
                name: data.name,
                crmType: data.crmType,
                baseUrl: data.baseUrl,
                authType: data.authType,
                apiKey: data.apiKey,
                isActive: data.isActive,
            },
            include: {
                automations: true,
            },
        });
    }
    async delete(id, organizationId) {
        await this.findOne(id, organizationId);
        return this.prisma.cRMConfig.delete({
            where: { id },
        });
    }
};
exports.CrmConfigsService = CrmConfigsService;
exports.CrmConfigsService = CrmConfigsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmConfigsService);
//# sourceMappingURL=crm-configs.service.js.map