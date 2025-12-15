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
exports.FeedbackService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let FeedbackService = class FeedbackService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(organizationId) {
        const where = organizationId ? { organizationId } : {};
        const feedbacks = await this.prisma.feedback.findMany({
            where,
            include: {
                conversation: {
                    include: { lead: { select: { name: true, phone: true } } },
                },
                responses: true,
            },
            orderBy: { createdAt: "desc" },
        });
        return feedbacks.map(fb => ({
            ...fb,
            customerName: fb.customer,
            comment: fb.message,
            date: new Date(fb.createdAt).toLocaleDateString('pt-BR'),
        }));
    }
    async findOne(id) {
        return this.prisma.feedback.findUnique({
            where: { id },
            include: {
                conversation: { include: { lead: true, messages: true } },
                responses: { orderBy: { createdAt: "asc" } },
            },
        });
    }
    async create(data) {
        const feedbackData = {
            customer: data.customerName || data.customer,
            phone: data.phone,
            rating: data.rating || 3,
            message: data.comment || data.message,
            status: 'PENDING',
            severity: data.severity || 'MEDIUM',
        };
        if (data.conversationId) {
            feedbackData.conversationId = data.conversationId;
        }
        if (data.organizationId) {
            feedbackData.organizationId = data.organizationId;
        }
        return this.prisma.feedback.create({
            data: feedbackData,
            include: { conversation: true },
        });
    }
    async update(id, data) {
        return this.prisma.feedback.update({ where: { id }, data });
    }
    async resolve(id, response) {
        return this.prisma.feedback.update({
            where: { id },
            data: {
                status: "RESOLVED",
                response,
                resolvedAt: new Date(),
            },
        });
    }
    async reopen(id) {
        return this.prisma.feedback.update({
            where: { id },
            data: {
                status: "PENDING",
                resolvedAt: null,
            },
        });
    }
};
exports.FeedbackService = FeedbackService;
exports.FeedbackService = FeedbackService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeedbackService);
//# sourceMappingURL=feedback.service.js.map