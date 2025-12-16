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
exports.AgentsController = void 0;
const common_1 = require("@nestjs/common");
const agents_service_1 = require("./agents.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const prisma_service_1 = require("../database/prisma.service");
let AgentsController = class AgentsController {
    agentsService;
    prisma;
    constructor(agentsService, prisma) {
        this.agentsService = agentsService;
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        return this.agentsService.findAll(organizationId);
    }
    async findOne(id, include) {
        return this.agentsService.findOne(id, include);
    }
    async create(data, req) {
        return this.agentsService.create(data, req.user.id, req.user.organizationId);
    }
    async update(id, data) {
        return this.agentsService.update(id, data);
    }
    async delete(id) {
        return this.agentsService.delete(id);
    }
    async getZapSignConfig(id) {
        const agent = await this.agentsService.findOne(id);
        return {
            zapSignFieldMapping: agent.zapSignFieldMapping,
            zapSignTriggerCrmStageId: agent.zapSignTriggerCrmStageId,
        };
    }
    async saveZapSignConfig(id, data) {
        return this.agentsService.update(id, {
            zapSignFieldMapping: data.fieldMapping,
            zapSignTriggerCrmStageId: data.triggerCrmStageId,
        });
    }
    async getFsmPrompts(id) {
        const agent = await this.agentsService.findOne(id);
        return {
            dataExtractor: agent.fsmDataExtractorPrompt,
            stateDecider: agent.fsmStateDeciderPrompt,
            validator: agent.fsmValidatorPrompt,
        };
    }
    async updateFsmPrompts(id, data) {
        return this.agentsService.update(id, {
            fsmDataExtractorPrompt: data.dataExtractor,
            fsmStateDeciderPrompt: data.stateDecider,
            fsmValidatorPrompt: data.validator,
        });
    }
    async getCrmStages(id) {
        return this.prisma.cRMStage.findMany({
            where: { agentId: id },
            include: {
                states: {
                    select: { id: true, name: true, order: true },
                    orderBy: { order: "asc" },
                },
            },
            orderBy: { order: "asc" },
        });
    }
    async createCrmStage(id, data, req) {
        const agent = await this.agentsService.findOne(id);
        return this.prisma.cRMStage.create({
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
                order: data.order,
                agentId: id,
                organizationId: agent.organizationId,
            },
        });
    }
    async updateCrmStage(agentId, stageId, data) {
        const stage = await this.prisma.cRMStage.update({
            where: { id: stageId },
            data: {
                name: data.name,
                description: data.description,
                color: data.color,
            },
        });
        if (data.stateIds) {
            await this.prisma.state.updateMany({
                where: { crmStageId: stageId },
                data: { crmStageId: null },
            });
            await this.prisma.state.updateMany({
                where: { id: { in: data.stateIds } },
                data: { crmStageId: stageId },
            });
        }
        return stage;
    }
    async deleteCrmStage(agentId, stageId) {
        return this.prisma.cRMStage.delete({
            where: { id: stageId },
        });
    }
    async reorderCrmStages(id, data) {
        await Promise.all(data.stages.map((stage) => this.prisma.cRMStage.update({
            where: { id: stage.id },
            data: { order: stage.order },
        })));
        return { success: true };
    }
    async getAutoSchedulingConfigs(id) {
        return this.prisma.autoSchedulingConfig.findMany({
            where: { agentId: id },
            include: {
                crmStage: { select: { id: true, name: true, color: true } },
                moveToStage: { select: { id: true, name: true, color: true } },
                reminders: { orderBy: { minutesBefore: "desc" } },
            },
        });
    }
    async createAutoSchedulingConfig(id, data) {
        return this.prisma.autoSchedulingConfig.create({
            data: {
                agentId: id,
                crmStageId: data.crmStageId,
                duration: data.duration,
                minAdvanceHours: data.minAdvanceHours,
                preferredTime: data.preferredTime,
                daysOfWeek: data.daysOfWeek,
                messageTemplate: data.messageTemplate,
                autoConfirm: data.autoConfirm,
                moveToStageId: data.moveToStageId,
                sendConfirmation: data.sendConfirmation,
                confirmationTemplate: data.confirmationTemplate,
                notifyTeam: data.notifyTeam,
                teamPhones: data.teamPhones,
                cancellationTemplate: data.cancellationTemplate,
                reschedulingTemplate: data.reschedulingTemplate,
                isActive: data.isActive,
                reminderWindowStart: data.reminderWindowStart,
                reminderWindowEnd: data.reminderWindowEnd,
                reminders: {
                    create: data.reminders?.map((r) => ({
                        minutesBefore: r.minutesBefore,
                        sendToLead: r.sendToLead,
                        sendToTeam: r.sendToTeam,
                        additionalPhones: r.additionalPhones,
                        leadMessageTemplate: r.leadMessageTemplate,
                        teamMessageTemplate: r.teamMessageTemplate,
                        isActive: r.isActive
                    }))
                }
            },
        });
    }
    async updateAutoSchedulingConfig(agentId, configId, data) {
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.autoSchedulingConfig.update({
                where: { id: configId },
                data: {
                    duration: data.duration,
                    minAdvanceHours: data.minAdvanceHours,
                    preferredTime: data.preferredTime,
                    daysOfWeek: data.daysOfWeek,
                    messageTemplate: data.messageTemplate,
                    autoConfirm: data.autoConfirm,
                    moveToStageId: data.moveToStageId,
                    sendConfirmation: data.sendConfirmation,
                    confirmationTemplate: data.confirmationTemplate,
                    notifyTeam: data.notifyTeam,
                    teamPhones: data.teamPhones,
                    cancellationTemplate: data.cancellationTemplate,
                    reschedulingTemplate: data.reschedulingTemplate,
                    isActive: data.isActive,
                    reminderWindowStart: data.reminderWindowStart,
                    reminderWindowEnd: data.reminderWindowEnd,
                },
            });
            if (data.reminders) {
                await tx.appointmentReminderConfig.deleteMany({
                    where: { autoSchedulingConfigId: configId }
                });
                if (data.reminders.length > 0) {
                    await tx.appointmentReminderConfig.createMany({
                        data: data.reminders.map((r) => ({
                            autoSchedulingConfigId: configId,
                            minutesBefore: r.minutesBefore,
                            sendToLead: r.sendToLead,
                            sendToTeam: r.sendToTeam,
                            additionalPhones: r.additionalPhones || [],
                            leadMessageTemplate: r.leadMessageTemplate,
                            teamMessageTemplate: r.teamMessageTemplate,
                            isActive: r.isActive
                        }))
                    });
                }
            }
            return updated;
        });
    }
    async deleteAutoSchedulingConfig(agentId, configId) {
        return this.prisma.autoSchedulingConfig.delete({
            where: { id: configId },
        });
    }
    async testAvailableSlots(id, data) {
        return {
            slots: [
                { start: "09:00", end: "10:00", available: true },
                { start: "10:00", end: "11:00", available: true },
                { start: "11:00", end: "12:00", available: false },
                { start: "14:00", end: "15:00", available: true },
                { start: "15:00", end: "16:00", available: true },
            ],
        };
    }
    async getReminders(agentId, configId) {
        return this.prisma.appointmentReminderConfig.findMany({
            where: { autoSchedulingConfigId: configId },
            orderBy: { minutesBefore: "desc" },
        });
    }
    async createReminder(agentId, configId, data) {
        return this.prisma.appointmentReminderConfig.create({
            data: {
                autoSchedulingConfigId: configId,
                minutesBefore: data.minutesBefore,
                sendToLead: data.sendToLead,
                sendToTeam: data.sendToTeam,
                leadMessageTemplate: data.leadMessageTemplate,
                teamMessageTemplate: data.teamMessageTemplate,
                isActive: data.isActive,
            },
        });
    }
    async updateReminder(agentId, configId, reminderId, data) {
        return this.prisma.appointmentReminderConfig.update({
            where: { id: reminderId },
            data: {
                minutesBefore: data.minutesBefore,
                sendToLead: data.sendToLead,
                sendToTeam: data.sendToTeam,
                leadMessageTemplate: data.leadMessageTemplate,
                teamMessageTemplate: data.teamMessageTemplate,
                isActive: data.isActive,
            },
        });
    }
    async deleteReminder(agentId, configId, reminderId) {
        return this.prisma.appointmentReminderConfig.delete({
            where: { id: reminderId },
        });
    }
};
exports.AgentsController = AgentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("organizationId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Query)("include")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(":id/zapsign-config"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getZapSignConfig", null);
__decorate([
    (0, common_1.Post)(":id/zapsign-config"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "saveZapSignConfig", null);
__decorate([
    (0, common_1.Get)(":id/fsm-prompts"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getFsmPrompts", null);
__decorate([
    (0, common_1.Put)(":id/fsm-prompts"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "updateFsmPrompts", null);
__decorate([
    (0, common_1.Get)(":id/crm-stages"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getCrmStages", null);
__decorate([
    (0, common_1.Post)(":id/crm-stages"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "createCrmStage", null);
__decorate([
    (0, common_1.Put)(":agentId/crm-stages/:stageId"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("stageId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "updateCrmStage", null);
__decorate([
    (0, common_1.Delete)(":agentId/crm-stages/:stageId"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("stageId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "deleteCrmStage", null);
__decorate([
    (0, common_1.Post)(":id/crm-stages/reorder"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "reorderCrmStages", null);
__decorate([
    (0, common_1.Get)(":id/auto-scheduling"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getAutoSchedulingConfigs", null);
__decorate([
    (0, common_1.Post)(":id/auto-scheduling"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "createAutoSchedulingConfig", null);
__decorate([
    (0, common_1.Put)(":agentId/auto-scheduling/:configId"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("configId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "updateAutoSchedulingConfig", null);
__decorate([
    (0, common_1.Delete)(":agentId/auto-scheduling/:configId"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("configId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "deleteAutoSchedulingConfig", null);
__decorate([
    (0, common_1.Post)(":id/auto-scheduling/test-slots"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "testAvailableSlots", null);
__decorate([
    (0, common_1.Get)(":agentId/auto-scheduling/:configId/reminders"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("configId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "getReminders", null);
__decorate([
    (0, common_1.Post)(":agentId/auto-scheduling/:configId/reminders"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("configId")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "createReminder", null);
__decorate([
    (0, common_1.Put)(":agentId/auto-scheduling/:configId/reminders/:reminderId"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("configId")),
    __param(2, (0, common_1.Param)("reminderId")),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "updateReminder", null);
__decorate([
    (0, common_1.Delete)(":agentId/auto-scheduling/:configId/reminders/:reminderId"),
    __param(0, (0, common_1.Param)("agentId")),
    __param(1, (0, common_1.Param)("configId")),
    __param(2, (0, common_1.Param)("reminderId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AgentsController.prototype, "deleteReminder", null);
exports.AgentsController = AgentsController = __decorate([
    (0, common_1.Controller)("agents"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(1, (0, common_1.Inject)(prisma_service_1.PrismaService)),
    __metadata("design:paramtypes", [agents_service_1.AgentsService,
        prisma_service_1.PrismaService])
], AgentsController);
//# sourceMappingURL=agents.controller.js.map