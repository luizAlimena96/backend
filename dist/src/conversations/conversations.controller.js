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
exports.ConversationsController = void 0;
const common_1 = require("@nestjs/common");
const conversations_service_1 = require("./conversations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let ConversationsController = class ConversationsController {
    conversationsService;
    constructor(conversationsService) {
        this.conversationsService = conversationsService;
    }
    async findAll(organizationId) {
        return this.conversationsService.findAll(organizationId);
    }
    async findOne(id) {
        return this.conversationsService.findOne(id);
    }
    async create(data) {
        return this.conversationsService.create(data);
    }
    async update(id, data) {
        return this.conversationsService.update(id, data);
    }
    async toggleAI(id, enabled) {
        return this.conversationsService.toggleAI(id, enabled);
    }
    async getMessages(id) {
        return this.conversationsService.getMessages(id);
    }
    async sendMessage(id, content, role) {
        const fromMe = role === 'assistant';
        return this.conversationsService.sendMessage(id, content, fromMe);
    }
    async addTag(id, tagId) {
        return this.conversationsService.addTag(id, tagId);
    }
    async removeTag(id, tagId) {
        return this.conversationsService.removeTag(id, tagId);
    }
};
exports.ConversationsController = ConversationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("organizationId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(":id/ai-toggle"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("enabled")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "toggleAI", null);
__decorate([
    (0, common_1.Get)(":id/messages"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)(":id/messages"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("content")),
    __param(2, (0, common_1.Body)("role")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)(":id/tags"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)("tagId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "addTag", null);
__decorate([
    (0, common_1.Delete)(":id/tags/:tagId"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Param)("tagId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ConversationsController.prototype, "removeTag", null);
exports.ConversationsController = ConversationsController = __decorate([
    (0, common_1.Controller)("conversations"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [conversations_service_1.ConversationsService])
], ConversationsController);
//# sourceMappingURL=conversations.controller.js.map