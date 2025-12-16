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
exports.StatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let StatesService = class StatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(agentId) {
        return this.prisma.state.findMany({
            where: { agentId },
            orderBy: { order: "asc" },
        });
    }
    async create(data) {
        return this.prisma.state.create({ data });
    }
    async update(id, data) {
        try {
            console.log(`[StatesService] Updating state ${id} with data:`, data);
            const { name, missionPrompt, availableRoutes, dataKey, dataDescription, dataType, mediaId, tools, prohibitions, responseType, crmStatus, order, crmStageId, mediaTiming, dataCollections } = data;
            return await this.prisma.state.update({
                where: { id },
                data: {
                    name, missionPrompt, availableRoutes, dataKey, dataDescription,
                    dataType, mediaId, tools, prohibitions, responseType, crmStatus, order: order ? parseInt(order.toString()) : undefined,
                    crmStageId, mediaTiming, dataCollections
                }
            });
        }
        catch (error) {
            console.error(`[StatesService] Error updating state ${id}:`, error);
            throw error;
        }
    }
    async delete(id) {
        await this.prisma.state.delete({ where: { id } });
        return { success: true };
    }
};
exports.StatesService = StatesService;
exports.StatesService = StatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatesService);
//# sourceMappingURL=states.service.js.map