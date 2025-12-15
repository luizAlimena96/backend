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
exports.CRMService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let CRMService = class CRMService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllConfigs(organizationId) {
        return this.prisma.cRMConfig.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
        });
    }
    async createConfig(data) {
        return this.prisma.cRMConfig.create({ data });
    }
    async updateConfig(id, data) {
        return this.prisma.cRMConfig.update({ where: { id }, data });
    }
    async deleteConfig(id) {
        await this.prisma.cRMConfig.delete({ where: { id } });
        return { success: true };
    }
    async findAllStages(agentId) {
        return this.prisma.cRMStage.findMany({
            where: { agentId },
            orderBy: { order: "asc" },
        });
    }
    async createStage(data) {
        return this.prisma.cRMStage.create({ data });
    }
    async updateStage(id, data) {
        return this.prisma.cRMStage.update({ where: { id }, data });
    }
    async deleteStage(id) {
        await this.prisma.cRMStage.delete({ where: { id } });
        return { success: true };
    }
    async reorderStages(agentId, stageIds) {
        const updates = stageIds.map((id, index) => this.prisma.cRMStage.update({
            where: { id },
            data: { order: index },
        }));
        await this.prisma.$transaction(updates);
        return { success: true };
    }
    async findAllAutomations(crmConfigId) {
        return this.prisma.cRMAutomation.findMany({
            where: { crmConfigId },
            orderBy: { createdAt: "desc" },
        });
    }
    async createAutomation(data) {
        return this.prisma.cRMAutomation.create({ data });
    }
    async updateAutomation(id, data) {
        return this.prisma.cRMAutomation.update({ where: { id }, data });
    }
    async deleteAutomation(id) {
        await this.prisma.cRMAutomation.delete({ where: { id } });
        return { success: true };
    }
};
exports.CRMService = CRMService;
exports.CRMService = CRMService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CRMService);
//# sourceMappingURL=crm.service.js.map