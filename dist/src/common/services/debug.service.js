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
exports.DebugService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let DebugService = class DebugService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createDebugLog(data) {
        try {
            await this.prisma.debugLog.create({
                data: {
                    phone: data.phone,
                    conversationId: data.conversationId,
                    clientMessage: data.clientMessage,
                    aiResponse: data.aiResponse,
                    currentState: data.currentState,
                    aiThinking: data.aiThinking,
                    organizationId: data.organizationId,
                    agentId: data.agentId,
                    leadId: data.leadId,
                },
            });
        }
        catch (error) {
            console.error('Failed to create debug log:', error);
        }
    }
    async getDebugLogs(organizationId, limit = 100) {
        return this.prisma.debugLog.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.DebugService = DebugService;
exports.DebugService = DebugService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DebugService);
//# sourceMappingURL=debug.service.js.map