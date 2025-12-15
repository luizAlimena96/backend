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
exports.CRMController = void 0;
const common_1 = require("@nestjs/common");
const crm_service_1 = require("./crm.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let CRMController = class CRMController {
    crmService;
    constructor(crmService) {
        this.crmService = crmService;
    }
    async findAllConfigs(organizationId) {
        return this.crmService.findAllConfigs(organizationId);
    }
    async createConfig(data) {
        return this.crmService.createConfig(data);
    }
    async updateConfig(id, data) {
        return this.crmService.updateConfig(id, data);
    }
    async deleteConfig(id) {
        return this.crmService.deleteConfig(id);
    }
    async findAllStages(agentId) {
        return this.crmService.findAllStages(agentId);
    }
    async createStage(data) {
        return this.crmService.createStage(data);
    }
    async updateStage(id, data) {
        return this.crmService.updateStage(id, data);
    }
    async deleteStage(id) {
        return this.crmService.deleteStage(id);
    }
    async reorderStages(agentId, stageIds) {
        return this.crmService.reorderStages(agentId, stageIds);
    }
    async findAllAutomations(crmConfigId) {
        return this.crmService.findAllAutomations(crmConfigId);
    }
    async createAutomation(data) {
        return this.crmService.createAutomation(data);
    }
    async updateAutomation(id, data) {
        return this.crmService.updateAutomation(id, data);
    }
    async deleteAutomation(id) {
        return this.crmService.deleteAutomation(id);
    }
};
exports.CRMController = CRMController;
__decorate([
    (0, common_1.Get)("configs"),
    __param(0, (0, common_1.Query)("organizationId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "findAllConfigs", null);
__decorate([
    (0, common_1.Post)("configs"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "createConfig", null);
__decorate([
    (0, common_1.Put)("configs/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Delete)("configs/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "deleteConfig", null);
__decorate([
    (0, common_1.Get)("stages"),
    __param(0, (0, common_1.Query)("agentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "findAllStages", null);
__decorate([
    (0, common_1.Post)("stages"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "createStage", null);
__decorate([
    (0, common_1.Put)("stages/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "updateStage", null);
__decorate([
    (0, common_1.Delete)("stages/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "deleteStage", null);
__decorate([
    (0, common_1.Patch)("stages/reorder"),
    __param(0, (0, common_1.Body)("agentId")),
    __param(1, (0, common_1.Body)("stageIds")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "reorderStages", null);
__decorate([
    (0, common_1.Get)("automations"),
    __param(0, (0, common_1.Query)("crmConfigId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "findAllAutomations", null);
__decorate([
    (0, common_1.Post)("automations"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "createAutomation", null);
__decorate([
    (0, common_1.Put)("automations/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "updateAutomation", null);
__decorate([
    (0, common_1.Delete)("automations/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CRMController.prototype, "deleteAutomation", null);
exports.CRMController = CRMController = __decorate([
    (0, common_1.Controller)("crm"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [crm_service_1.CRMService])
], CRMController);
//# sourceMappingURL=crm.controller.js.map