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
exports.AgentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let AgentsService = class AgentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        return this.prisma.agent.findMany({
            where: organizationId ? { organizationId } : {},
            include: {
                organization: { select: { id: true, name: true, slug: true } },
                user: { select: { id: true, name: true, email: true } },
                _count: {
                    select: {
                        leads: true,
                        conversations: true,
                        knowledge: true,
                        states: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async findOne(id, include) {
        const includeOptions = {
            _count: {
                select: {
                    leads: true,
                    conversations: true,
                    knowledge: true,
                    followups: true,
                    reminders: true,
                },
            },
        };
        if (include) {
            const relations = include.split(",");
            if (relations.includes("states"))
                includeOptions.states = true;
            if (relations.includes("crmStages"))
                includeOptions.crmStages = true;
            if (relations.includes("followups"))
                includeOptions.followUps = true;
        }
        const agent = await this.prisma.agent.findUnique({
            where: { id },
            include: includeOptions,
        });
        if (!agent) {
            throw new common_1.NotFoundException("Agent not found");
        }
        return agent;
    }
    async create(data, userId, organizationId) {
        const existing = await this.prisma.agent.findUnique({
            where: { instance: data.instance },
        });
        if (existing) {
            throw new Error("Agente com esta instance já existe");
        }
        return this.prisma.agent.create({
            data: {
                ...data,
                userId,
                organizationId,
                tone: data.tone || "FRIENDLY",
                language: data.language || "pt-BR",
                isActive: true,
            },
            include: {
                organization: true,
                user: { select: { id: true, name: true, email: true } },
            },
        });
    }
    async update(id, data) {
        const { id: _id, createdAt, updatedAt, organizationId, userId, _count, organization, user, ...updateData } = data;
        if (updateData.tone && typeof updateData.tone === "string") {
            updateData.tone = updateData.tone.toUpperCase();
        }
        return this.prisma.agent.update({
            where: { id },
            data: updateData,
        });
    }
    async delete(id) {
        await this.prisma.agent.delete({ where: { id } });
        return { success: true };
    }
};
exports.AgentsService = AgentsService;
exports.AgentsService = AgentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgentsService);
//# sourceMappingURL=agents.service.js.map