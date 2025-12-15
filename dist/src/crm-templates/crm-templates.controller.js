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
exports.CrmTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const crm_templates_service_1 = require("./crm-templates.service");
let CrmTemplatesController = class CrmTemplatesController {
    crmTemplatesService;
    constructor(crmTemplatesService) {
        this.crmTemplatesService = crmTemplatesService;
    }
    async findAll(req, organizationId) {
        return this.crmTemplatesService.findAll(organizationId || req.user.organizationId);
    }
    async create(data, req) {
        return this.crmTemplatesService.create({
            ...data,
            organizationId: data.organizationId || req.user.organizationId,
        });
    }
    async instantiate(id, data, req) {
        return this.crmTemplatesService.instantiate(id, {
            ...data,
            organizationId: data.organizationId || req.user.organizationId,
        });
    }
    async delete(id, req) {
        return this.crmTemplatesService.delete(id, req.user.organizationId);
    }
};
exports.CrmTemplatesController = CrmTemplatesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CrmTemplatesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CrmTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/instantiate'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], CrmTemplatesController.prototype, "instantiate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CrmTemplatesController.prototype, "delete", null);
exports.CrmTemplatesController = CrmTemplatesController = __decorate([
    (0, common_1.Controller)('crm/templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [crm_templates_service_1.CrmTemplatesService])
], CrmTemplatesController);
//# sourceMappingURL=crm-templates.controller.js.map