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
exports.CrmTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let CrmTemplatesService = class CrmTemplatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        return this.prisma.cRMTemplate.findMany({
            where: {
                OR: [
                    { organizationId },
                    { isPublic: true },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(data) {
        const crmConfig = await this.prisma.cRMConfig.findUnique({
            where: { id: data.crmConfigId },
            include: { automations: true },
        });
        if (!crmConfig) {
            throw new common_1.NotFoundException('CRM config not found');
        }
        return this.prisma.cRMTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                crmType: crmConfig.crmType,
                baseUrl: crmConfig.baseUrl,
                authType: crmConfig.authType,
                automations: crmConfig.automations,
                organizationId: data.organizationId,
                isPublic: data.isPublic ?? false,
            },
        });
    }
    async instantiate(templateId, data) {
        const template = await this.prisma.cRMTemplate.findUnique({
            where: { id: templateId },
        });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        const newConfig = await this.prisma.cRMConfig.create({
            data: {
                name: data.name,
                crmType: template.crmType,
                baseUrl: template.baseUrl,
                authType: template.authType,
                apiKey: data.apiKey,
                organizationId: data.organizationId,
                isActive: true,
            },
        });
        if (template.automations && Array.isArray(template.automations)) {
            for (const automation of template.automations) {
                await this.prisma.cRMAutomation.create({
                    data: {
                        name: automation.name,
                        crmConfigId: newConfig.id,
                        crmStageId: automation.crmStageId,
                        actions: automation.actions,
                        isActive: true,
                        triggerType: automation.triggerType || 'STATE_CHANGE',
                    },
                });
            }
        }
        return newConfig;
    }
    async delete(id, organizationId) {
        const template = await this.prisma.cRMTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            throw new common_1.NotFoundException('Template not found');
        }
        if (template.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return this.prisma.cRMTemplate.delete({
            where: { id },
        });
    }
};
exports.CrmTemplatesService = CrmTemplatesService;
exports.CrmTemplatesService = CrmTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmTemplatesService);
//# sourceMappingURL=crm-templates.service.js.map