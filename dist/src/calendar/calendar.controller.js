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
exports.CalendarController = void 0;
const common_1 = require("@nestjs/common");
const calendar_service_1 = require("./calendar.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let CalendarController = class CalendarController {
    calendarService;
    constructor(calendarService) {
        this.calendarService = calendarService;
    }
    async getGoogleEvents(agentId) {
        if (!agentId) {
            return [];
        }
        return this.calendarService.getGoogleEvents(agentId);
    }
    async getBlockedSlots(organizationId) {
        return this.calendarService.getBlockedSlots(organizationId);
    }
    async createBlockedSlot(data) {
        return this.calendarService.createBlockedSlot(data);
    }
    async deleteBlockedSlot(id) {
        return this.calendarService.deleteBlockedSlot(id);
    }
    async getWorkingHours(organizationId) {
        return this.calendarService.getWorkingHours(organizationId);
    }
    async updateWorkingHours(data) {
        return this.calendarService.updateWorkingHours(data.organizationId, data.workingHours);
    }
};
exports.CalendarController = CalendarController;
__decorate([
    (0, common_1.Get)('google-events'),
    __param(0, (0, common_1.Query)('agentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getGoogleEvents", null);
__decorate([
    (0, common_1.Get)('blocked-slots'),
    __param(0, (0, common_1.Query)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getBlockedSlots", null);
__decorate([
    (0, common_1.Post)('blocked-slots'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "createBlockedSlot", null);
__decorate([
    (0, common_1.Delete)('blocked-slots/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "deleteBlockedSlot", null);
__decorate([
    (0, common_1.Get)('working-hours'),
    __param(0, (0, common_1.Query)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "getWorkingHours", null);
__decorate([
    (0, common_1.Put)('working-hours'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CalendarController.prototype, "updateWorkingHours", null);
exports.CalendarController = CalendarController = __decorate([
    (0, common_1.Controller)('calendar'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [calendar_service_1.CalendarService])
], CalendarController);
//# sourceMappingURL=calendar.controller.js.map