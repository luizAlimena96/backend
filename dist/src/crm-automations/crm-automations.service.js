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
exports.CrmAutomationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let CrmAutomationsService = class CrmAutomationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        const configs = await this.prisma.cRMConfig.findMany({
            where: { organizationId },
            select: { id: true },
        });
        const configIds = configs.map(c => c.id);
        return this.prisma.cRMAutomation.findMany({
            where: {
                crmConfigId: { in: configIds },
            },
            include: {
                crmConfig: true,
                crmStage: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, organizationId) {
        const automation = await this.prisma.cRMAutomation.findUnique({
            where: { id },
            include: {
                crmConfig: true,
                crmStage: true,
            },
        });
        if (!automation) {
            throw new common_1.NotFoundException('Automation not found');
        }
        if (automation.crmConfig.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return automation;
    }
    async create(data, organizationId) {
        const crmConfig = await this.prisma.cRMConfig.findUnique({
            where: { id: data.crmConfigId },
        });
        if (!crmConfig || crmConfig.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return this.prisma.cRMAutomation.create({
            data: {
                name: data.name,
                crmConfigId: data.crmConfigId,
                crmStageId: data.crmStageId,
                agentStateId: data.agentStateId,
                actions: data.actions,
                isActive: data.isActive ?? true,
                description: data.description,
                triggerType: data.triggerType || 'STATE_CHANGE',
                delayMinutes: data.delayMinutes,
                order: data.order ?? 0,
            },
            include: {
                crmConfig: true,
                crmStage: true,
            },
        });
    }
    async update(id, data, organizationId) {
        await this.findOne(id, organizationId);
        return this.prisma.cRMAutomation.update({
            where: { id },
            data: {
                name: data.name,
                crmStageId: data.crmStageId,
                agentStateId: data.agentStateId,
                actions: data.actions,
                isActive: data.isActive,
                description: data.description,
                triggerType: data.triggerType,
                delayMinutes: data.delayMinutes,
                order: data.order,
            },
            include: {
                crmConfig: true,
                crmStage: true,
            },
        });
    }
    async delete(id, organizationId) {
        await this.findOne(id, organizationId);
        return this.prisma.cRMAutomation.delete({
            where: { id },
        });
    }
};
exports.CrmAutomationsService = CrmAutomationsService;
exports.CrmAutomationsService = CrmAutomationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmAutomationsService);
//# sourceMappingURL=crm-automations.service.js.map