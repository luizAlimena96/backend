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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMetrics(organizationId) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const [totalLeads, activeConversations, leadsToday, leadsThisWeek, leadsThisMonth, leadsByStatus, wonLeads, leadsByCrmStage, leadsByState, crmStages,] = await Promise.all([
            this.prisma.lead.count({ where: { organizationId } }),
            this.prisma.conversation.count({
                where: { organizationId, aiEnabled: true }
            }),
            this.prisma.lead.count({
                where: { organizationId, createdAt: { gte: today } }
            }),
            this.prisma.lead.count({
                where: { organizationId, createdAt: { gte: weekAgo } }
            }),
            this.prisma.lead.count({
                where: { organizationId, createdAt: { gte: monthAgo } }
            }),
            this.prisma.lead.groupBy({
                by: ['status'],
                where: { organizationId },
                _count: true,
            }),
            this.prisma.lead.count({
                where: { organizationId, status: 'WON' }
            }),
            this.prisma.lead.groupBy({
                by: ['crmStageId'],
                where: { organizationId },
                _count: true,
            }),
            this.prisma.lead.groupBy({
                by: ['currentState'],
                where: { organizationId },
                _count: true,
            }),
            this.prisma.cRMStage.findMany({
                where: { organizationId },
                orderBy: { order: 'asc' },
            }),
        ]);
        const statusCounts = {
            NEW: 0,
            CONTACTED: 0,
            QUALIFIED: 0,
            PROPOSAL_SENT: 0,
            WON: 0,
            LOST: 0,
        };
        leadsByStatus.forEach((item) => {
            if (item.status in statusCounts) {
                statusCounts[item.status] = item._count;
            }
        });
        const crmFunnel = crmStages.map(stage => {
            const match = leadsByCrmStage.find(l => l.crmStageId === stage.id);
            return {
                id: stage.id,
                name: stage.name,
                value: match ? match._count : 0,
                order: stage.order,
                color: stage.color || '#6366f1'
            };
        });
        const statesFunnel = leadsByState
            .filter((l) => l.currentState)
            .map((l) => ({
            name: l.currentState,
            value: l._count,
        }))
            .sort((a, b) => b.value - a.value);
        const conversionRate = totalLeads > 0
            ? Math.round((wonLeads / totalLeads) * 100)
            : 0;
        const avgResponseTime = '5min';
        return {
            totalLeads,
            activeConversations,
            conversionRate,
            avgResponseTime,
            leadsToday,
            leadsThisWeek,
            leadsThisMonth,
            leadsByStatus: statusCounts,
            crmFunnel,
            statesFunnel,
        };
    }
    async getPerformance(organizationId) {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const messages = await this.prisma.message.groupBy({
            by: ['timestamp'],
            where: {
                conversation: { organizationId },
                timestamp: { gte: sevenDaysAgo },
            },
            _count: true,
        });
        const messagesPerDay = new Array(7).fill(0);
        messages.forEach((msg) => {
            const daysDiff = Math.floor((now.getTime() - new Date(msg.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff >= 0 && daysDiff < 7) {
                messagesPerDay[6 - daysDiff] += msg._count;
            }
        });
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const conversions = await this.prisma.lead.findMany({
            where: {
                organizationId,
                status: 'WON',
                updatedAt: { gte: fourWeeksAgo },
            },
            select: { updatedAt: true },
        });
        const conversionsPerWeek = new Array(4).fill(0);
        conversions.forEach((lead) => {
            const weeksDiff = Math.floor((now.getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 7));
            if (weeksDiff >= 0 && weeksDiff < 4) {
                conversionsPerWeek[3 - weeksDiff]++;
            }
        });
        return {
            messagesPerDay,
            conversionsPerWeek,
            responseTimeAvg: 5,
        };
    }
    async getActivities(organizationId) {
        const recentLeads = await this.prisma.lead.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                name: true,
                phone: true,
                createdAt: true,
            },
        });
        const recentConversations = await this.prisma.conversation.findMany({
            where: { organizationId },
            orderBy: { updatedAt: 'desc' },
            take: 5,
            select: {
                id: true,
                lead: { select: { name: true, phone: true } },
                updatedAt: true,
            },
        });
        const recentMessages = await this.prisma.message.findMany({
            where: { conversation: { organizationId } },
            take: 5,
            orderBy: { timestamp: 'desc' },
            select: {
                id: true,
                content: true,
                timestamp: true,
                fromMe: true,
                conversation: {
                    select: {
                        lead: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        const activities = [
            ...recentLeads.map((lead) => ({
                id: lead.id,
                type: 'lead',
                title: 'Novo Lead',
                description: `${lead.name} (${lead.phone})`,
                time: this.formatTime(lead.createdAt),
            })),
            ...recentConversations.map((conv) => ({
                id: conv.id,
                type: 'conversation',
                title: 'Conversa Atualizada',
                description: `${conv.lead?.name || 'Lead'} - ${conv.lead?.phone || ''}`,
                time: this.formatTime(conv.updatedAt),
            })),
            ...recentMessages.map((msg) => ({
                id: msg.id,
                type: 'message',
                title: 'Nova Mensagem',
                description: `${msg.conversation?.lead?.name || 'Lead'}: ${msg.content.substring(0, 50)}...`,
                time: this.formatTime(msg.timestamp),
            })),
        ];
        return activities
            .sort((a, b) => {
            return 0;
        })
            .slice(0, 10);
    }
    formatTime(date) {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1)
            return 'Agora';
        if (minutes < 60)
            return `${minutes}min atrás`;
        if (hours < 24)
            return `${hours}h atrás`;
        return `${days}d atrás`;
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map