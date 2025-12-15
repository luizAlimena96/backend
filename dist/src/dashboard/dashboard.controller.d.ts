import { DashboardService } from "./dashboard.service";
export declare class DashboardController {
    private dashboardService;
    constructor(dashboardService: DashboardService);
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
}
