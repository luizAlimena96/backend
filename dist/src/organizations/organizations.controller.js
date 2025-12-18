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
exports.OrganizationsController = void 0;
const common_1 = require("@nestjs/common");
const organizations_service_1 = require("./organizations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const whatsapp_integration_service_1 = require("../integrations/whatsapp/whatsapp-integration.service");
let OrganizationsController = class OrganizationsController {
    organizationsService;
    whatsappService;
    constructor(organizationsService, whatsappService) {
        this.organizationsService = organizationsService;
        this.whatsappService = whatsappService;
    }
    async findAll(req) {
        const { id: userId, role, organizationId } = req.user;
        return this.organizationsService.findAll(userId, role, organizationId);
    }
    async findOne(id, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para acessar esta organização');
        }
        return this.organizationsService.findOne(id);
    }
    async create(data, req) {
        const { role } = req.user;
        if (role !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Apenas SUPER_ADMIN pode criar organizações');
        }
        return this.organizationsService.create(data);
    }
    async update(id, data, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para editar esta organização');
        }
        return this.organizationsService.update(id, data, role);
    }
    async remove(id, req) {
        const { role } = req.user;
        if (role !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Apenas SUPER_ADMIN pode deletar organizações');
        }
        return this.organizationsService.remove(id);
    }
    async connectWhatsApp(id, data, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para conectar WhatsApp desta organização');
        }
        try {
            const org = await this.organizationsService.findOne(id);
            let instanceName = org.evolutionInstanceName;
            if (!instanceName) {
                instanceName = `org_${id.replace(/-/g, '_').substring(0, 20)}`;
                try {
                    await this.whatsappService.createInstance(instanceName);
                }
                catch (createError) {
                    console.log('Instance creation result:', createError?.response?.data || createError.message);
                }
                await this.organizationsService.update(id, { evolutionInstanceName: instanceName }, role);
            }
            if (data.alertPhone1 || data.alertPhone2) {
                await this.organizationsService.update(id, {
                    alertPhone1: data.alertPhone1 || undefined,
                    alertPhone2: data.alertPhone2 || process.env.LEXA_PHONE || undefined,
                }, role);
            }
            const qrCode = await this.whatsappService.getQRCode(instanceName);
            return {
                success: true,
                qrCode,
                instanceName,
            };
        }
        catch (error) {
            console.error('WhatsApp connect error:', error);
            return {
                success: false,
                error: error?.response?.data?.message || error.message || 'Erro ao conectar WhatsApp',
            };
        }
    }
    async saveZapSignConfig(id, data, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para configurar esta organização');
        }
        return this.organizationsService.updateZapSignConfig(id, data);
    }
    async testZapSignConfig(id, data, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para testar conexão desta organização');
        }
        return this.organizationsService.testZapSignConnection(data.apiToken);
    }
    async listUsers(id, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para ver usuários desta organização');
        }
        return this.organizationsService.getUsers(id);
    }
    async createUser(id, data, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para criar usuários nesta organização');
        }
        return this.organizationsService.createUser(id, data);
    }
    async updateUser(id, userId, data, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para editar usuários desta organização');
        }
        return this.organizationsService.updateUser(userId, data);
    }
    async deleteUser(id, userId, req) {
        const { role, organizationId } = req.user;
        if (!this.organizationsService.canAccessOrganization(role, organizationId, id)) {
            throw new common_1.ForbiddenException('Sem permissão para remover usuários desta organização');
        }
        return this.organizationsService.deleteUser(userId);
    }
};
exports.OrganizationsController = OrganizationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/whatsapp'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "connectWhatsApp", null);
__decorate([
    (0, common_1.Post)(':id/zapsign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "saveZapSignConfig", null);
__decorate([
    (0, common_1.Post)(':id/zapsign/test'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "testZapSignConfig", null);
__decorate([
    (0, common_1.Get)(':id/users'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Post)(':id/users'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "createUser", null);
__decorate([
    (0, common_1.Put)(':id/users/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Delete)(':id/users/:userId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationsController.prototype, "deleteUser", null);
exports.OrganizationsController = OrganizationsController = __decorate([
    (0, common_1.Controller)('organizations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [organizations_service_1.OrganizationsService,
        whatsapp_integration_service_1.WhatsAppIntegrationService])
], OrganizationsController);
//# sourceMappingURL=organizations.controller.js.map