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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const prisma_service_1 = require("../database/prisma.service");
let AdminController = class AdminController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assumeOrganization(organizationId) {
        if (!organizationId) {
            return {
                organizationId: null,
                organizationName: null,
                message: 'Visualizando todas as organizações',
            };
        }
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new Error('Organização não encontrada');
        }
        return {
            organizationId: organization.id,
            organizationName: organization.name,
            message: `Agora trabalhando como: ${organization.name}`,
        };
    }
    async getData(orgId, type) {
        if (!orgId || !type) {
            return [];
        }
        switch (type) {
            case 'leads':
                return this.prisma.lead.findMany({
                    where: { organizationId: orgId },
                    orderBy: { createdAt: 'desc' },
                });
            case 'followups':
                return this.prisma.followup.findMany({
                    where: { organizationId: orgId },
                    orderBy: { createdAt: 'desc' },
                });
            case 'knowledge':
                return this.prisma.knowledge.findMany({
                    where: { organizationId: orgId },
                    orderBy: { createdAt: 'desc' },
                });
            case 'states':
                return this.prisma.state.findMany({
                    where: { organizationId: orgId },
                    orderBy: { order: 'asc' },
                });
            case 'appointments':
                return this.prisma.appointment.findMany({
                    where: { organizationId: orgId },
                    include: { lead: true },
                    orderBy: { scheduledAt: 'desc' },
                });
            case 'conversations':
                return this.prisma.conversation.findMany({
                    where: { organizationId: orgId },
                    include: {
                        lead: true,
                        _count: { select: { messages: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                });
            default:
                return [];
        }
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('assume-organization'),
    __param(0, (0, common_1.Body)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "assumeOrganization", null);
__decorate([
    (0, common_1.Get)('data'),
    __param(0, (0, common_1.Query)('orgId')),
    __param(1, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getData", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map