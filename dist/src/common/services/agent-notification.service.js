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
exports.AgentNotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AgentNotificationService = class AgentNotificationService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkAndTriggerNotifications(leadId, newState) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            include: { agent: true },
        });
        if (!lead)
            return;
        const state = await this.prisma.state.findFirst({
            where: {
                agentId: lead.agentId,
                name: newState,
            },
        });
        if (!state)
            return;
        const importantStates = ['QUALIFIED', 'MEETING_SCHEDULED', 'PROPOSAL_SENT'];
        if (importantStates.includes(newState)) {
            await this.createNotification({
                leadId,
                type: 'STATE_CHANGE',
                message: `Lead ${lead.name} mudou para estado: ${newState}`,
                organizationId: lead.organizationId,
            });
        }
    }
    async createNotification(data) {
        console.log('[Notification]', data);
    }
};
exports.AgentNotificationService = AgentNotificationService;
exports.AgentNotificationService = AgentNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgentNotificationService);
//# sourceMappingURL=agent-notification.service.js.map