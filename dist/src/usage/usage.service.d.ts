import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class UsageService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    getOpenAICosts(organizationId: string, period: 'day' | 'week' | 'month'): Promise<{
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
    getElevenLabsCosts(organizationId: string, period: 'day' | 'week' | 'month'): Promise<{
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
