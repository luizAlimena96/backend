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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let LeadsService = class LeadsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId, agentId) {
        return this.prisma.lead.findMany({
            where: {
                organizationId,
                ...(agentId && { agentId }),
            },
            include: {
                agent: { select: { id: true, name: true } },
                appointments: true,
                _count: { select: { conversations: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async findOne(id) {
        return this.prisma.lead.findUnique({
            where: { id },
            include: {
                agent: true,
                appointments: true,
                conversations: { include: { messages: true } },
            },
        });
    }
    async create(data) {
        return this.prisma.lead.create({
            data,
            include: { agent: true },
        });
    }
    async update(id, data) {
        return this.prisma.lead.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        await this.prisma.lead.delete({ where: { id } });
        return { success: true };
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map