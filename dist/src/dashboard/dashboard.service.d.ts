import { PrismaService } from "../database/prisma.service";
export declare class DashboardService {
    private prisma;
    constructor(prisma: PrismaService);
    getMetrics(organizationId: string): Promise<{
        totalLeads: number;
        activeConversations: number;
        conversionRate: number;
        avgResponseTime: string;
        leadsToday: number;
        leadsThisWeek: number;
        leadsThisMonth: number;
        leadsByStatus: {
            NEW: number;
            CONTACTED: number;
            QUALIFIED: number;
            PROPOSAL_SENT: number;
            WON: number;
            LOST: number;
        };
        crmFunnel: {
            id: string;
            name: string;
            value: number;
            order: number;
            color: string;
        }[];
        statesFunnel: {
            name: any;
            value: any;
        }[];
    }>;
    getPerformance(organizationId: string): Promise<{
        messagesPerDay: any[];
        conversionsPerWeek: any[];
        responseTimeAvg: number;
    }>;
    getActivities(organizationId: string): Promise<({
        id: string;
        type: "lead";
        title: string;
        description: string;
        time: string;
    } | {
        id: string;
        type: "conversation";
        title: string;
        description: string;
        time: string;
    } | {
        id: string;
        type: "message";
        title: string;
        description: string;
        time: string;
    })[]>;
    private formatTime;
}
