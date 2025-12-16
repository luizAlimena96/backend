import { PrismaService } from '../database/prisma.service';
export interface Report {
    id: string;
    title: string;
    type: string;
    period: string;
    generatedAt: string;
    status: 'completed' | 'processing';
    downloads?: number;
}
export interface ReportMetrics {
    relatoriosGerados: number;
    totalDownloads: number;
    tempoMedioGeracao: string;
    trends: {
        gerados: number;
        downloads: number;
        tempo: number;
    };
}
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    getReports(organizationId?: string): Promise<Report[]>;
    getMetrics(organizationId?: string): Promise<ReportMetrics>;
    generateReport(data: {
        title: string;
        type: string;
        period: string;
        organizationId: string;
        startDate?: string;
        endDate?: string;
        includeGraphs?: boolean;
        includeDetails?: boolean;
        format?: string;
    }): Promise<{
        message: string;
        reportId?: string;
    }>;
    private simulateReportGeneration;
    downloadReport(id: string): Promise<Buffer>;
}
