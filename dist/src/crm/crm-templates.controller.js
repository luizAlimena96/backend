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
exports.CRMTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const prisma_service_1 = require("../database/prisma.service");
let CRMTemplatesController = class CRMTemplatesController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        return this.prisma.cRMTemplate.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(data) {
        const crmConfig = await this.prisma.cRMConfig.findUnique({
            where: { id: data.crmConfigId },
            include: {
                automations: true,
            },
        });
        if (!crmConfig) {
            throw new Error('CRM Config not found');
        }
        return this.prisma.cRMTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                organizationId: data.organizationId,
                crmType: crmConfig.crmType,
                baseUrl: crmConfig.baseUrl,
                authType: crmConfig.authType,
                automations: crmConfig.automations || [],
                isPublic: false,
            },
        });
    }
    async instantiate(id, data) {
        const template = await this.prisma.cRMTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            throw new Error('Template not found');
        }
        const newConfig = await this.prisma.cRMConfig.create({
            data: {
                name: data.name,
                organizationId: data.organizationId,
                crmType: template.crmType,
                baseUrl: template.baseUrl,
                authType: template.authType,
                apiKey: data.apiKey,
                isActive: true,
            },
        });
        const automations = template.automations;
        if (automations && Array.isArray(automations)) {
            for (const automation of automations) {
                await this.prisma.cRMAutomation.create({
                    data: {
                        crmConfigId: newConfig.id,
                        name: automation.name,
                        triggerType: automation.triggerType || 'STATE_CHANGE',
                        actions: automation.actions,
                        isActive: automation.isActive ?? true,
                    },
                });
            }
        }
        return newConfig;
    }
    async delete(id) {
        return this.prisma.cRMTemplate.delete({
            where: { id },
        });
    }
};
exports.CRMTemplatesController = CRMTemplatesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMTemplatesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CRMTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/instantiate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CRMTemplatesController.prototype, "instantiate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMTemplatesController.prototype, "delete", null);
exports.CRMTemplatesController = CRMTemplatesController = __decorate([
    (0, common_1.Controller)('crm-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CRMTemplatesController);
//# sourceMappingURL=crm-templates.controller.js.map