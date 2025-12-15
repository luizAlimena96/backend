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
exports.KnowledgeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let KnowledgeService = class KnowledgeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId, agentId) {
        return this.prisma.knowledge.findMany({
            where: {
                organizationId,
                ...(agentId && { agentId }),
            },
            include: {
                agent: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async create(data) {
        return this.prisma.knowledge.create({
            data: {
                ...data,
                type: data.type || "TEXT",
            },
        });
    }
    async update(id, data) {
        return this.prisma.knowledge.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        await this.prisma.knowledge.delete({ where: { id } });
        return { success: true };
    }
};
exports.KnowledgeService = KnowledgeService;
exports.KnowledgeService = KnowledgeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KnowledgeService);
//# sourceMappingURL=knowledge.service.js.map