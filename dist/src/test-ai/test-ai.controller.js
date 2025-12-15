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
exports.TestAIController = void 0;
const common_1 = require("@nestjs/common");
const test_ai_service_1 = require("./test-ai.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let TestAIController = class TestAIController {
    testAIService;
    constructor(testAIService) {
        this.testAIService = testAIService;
    }
    async processMessage(data, req) {
        const { id: userId, role } = req.user;
        return this.testAIService.processMessage(data, userId, role);
    }
    async getHistory(organizationId, req) {
        const { role } = req.user;
        return this.testAIService.getHistory(organizationId, role);
    }
    async resetConversation(organizationId, req) {
        const { role } = req.user;
        return this.testAIService.resetConversation(organizationId, role);
    }
    async triggerFollowup(data, req) {
        const { organizationId, agentId } = data;
        const { role } = req.user;
        return this.testAIService.triggerFollowup(organizationId, agentId, role);
    }
};
exports.TestAIController = TestAIController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TestAIController.prototype, "processMessage", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('organizationId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TestAIController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Query)('organizationId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TestAIController.prototype, "resetConversation", null);
__decorate([
    (0, common_1.Post)('trigger-followup'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TestAIController.prototype, "triggerFollowup", null);
exports.TestAIController = TestAIController = __decorate([
    (0, common_1.Controller)('test-ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [test_ai_service_1.TestAIService])
], TestAIController);
//# sourceMappingURL=test-ai.controller.js.map