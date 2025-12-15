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
exports.UsageController = void 0;
const common_1 = require("@nestjs/common");
const usage_service_1 = require("./usage.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let UsageController = class UsageController {
    usageService;
    constructor(usageService) {
        this.usageService = usageService;
    }
    async getOpenAICosts(organizationId, period = 'month') {
        return this.usageService.getOpenAICosts(organizationId, period);
    }
    async getElevenLabsCosts(organizationId, period = 'month') {
        return this.usageService.getElevenLabsCosts(organizationId, period);
    }
};
exports.UsageController = UsageController;
__decorate([
    (0, common_1.Get)('openai'),
    __param(0, (0, common_1.Query)('organizationId')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsageController.prototype, "getOpenAICosts", null);
__decorate([
    (0, common_1.Get)('elevenlabs'),
    __param(0, (0, common_1.Query)('organizationId')),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UsageController.prototype, "getElevenLabsCosts", null);
exports.UsageController = UsageController = __decorate([
    (0, common_1.Controller)('usage'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [usage_service_1.UsageService])
], UsageController);
//# sourceMappingURL=usage.controller.js.map