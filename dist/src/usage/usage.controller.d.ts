import { UsageService } from './usage.service';
export declare class UsageController {
    private usageService;
    constructor(usageService: UsageService);
    getOpenAICosts(organizationId: string, period?: 'day' | 'week' | 'month'): Promise<{
        configured: boolean;
        totalCost?: undefined;
        startDate?: undefined;
        endDate?: undefined;
    } | {
        configured: boolean;
        totalCost: number;
        startDate: string;
        endDate: string;
    }>;
    getElevenLabsCosts(organizationId: string, period?: 'day' | 'week' | 'month'): Promise<{
        configured: boolean;
        usage?: undefined;
    } | {
        configured: boolean;
        usage: {
            charactersPerOrg: number;
            estimatedCostUSD: string;
        };
    }>;
}
